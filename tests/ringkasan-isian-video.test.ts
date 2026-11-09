// Penjaga ringkasan pengisian kualitas & rating (lib/ringkasan-isian-video.ts).
//
// Angka-angka ini yang dibaca admin untuk memutuskan apa yang masih perlu
// dikerjakan. Kalau salah hitung, kerusakannya senyap: panel melaporkan
// "semua beres" sementara puluhan video tetap tanpa label di poster.
import { describe, it, expect } from "vitest";
import {
  asalKualitas,
  asalRating,
  kelompokkanUnduhan,
  ringkasIsian,
} from "../lib/ringkasan-isian-video";

const link = (videoId: string, quality: string) => ({
  videoId,
  provider: "gdrive",
  quality,
  url: "https://contoh.test/" + videoId,
});

describe("kelompokkanUnduhan", () => {
  it("mengelompokkan daftar datar per video", () => {
    const peta = kelompokkanUnduhan([
      link("a", "1080p"),
      link("a", "480p"),
      link("b", "480p"),
    ]);
    expect(peta["a"]).toHaveLength(2);
    expect(peta["b"]).toHaveLength(1);
    expect(peta["c"]).toBeUndefined();
  });

  it("daftar kosong tidak melempar error", () => {
    expect(kelompokkanUnduhan([])).toEqual({});
  });
});

describe("asalKualitas — dari mana label kualitas datang", () => {
  const unduhan = kelompokkanUnduhan([link("hd", "1080p"), link("sd", "480p")]);

  it("pilihan admin MENANG atas turunan", () => {
    // Urutan menang yang sama dengan lib/kualitas-video.ts: manusia > mesin.
    // Kalau dibalik, koreksi admin atas film CAM yang berkasnya kebetulan
    // 1080p akan terhapus tiap kali panel dibuka.
    expect(asalKualitas("hd", { hd: "CAM" }, unduhan)).toEqual({
      jenis: "manual",
      nilai: "CAM",
    });
  });

  it("ada 1080p -> HD, hanya 480p -> SD", () => {
    expect(asalKualitas("hd", {}, unduhan)).toEqual({ jenis: "turunan", nilai: "HD" });
    expect(asalKualitas("sd", {}, unduhan)).toEqual({ jenis: "turunan", nilai: "SD" });
  });

  it("tanpa link unduhan = KOSONG, bukan SD", () => {
    // Belum punya link bukan berarti videonya beresolusi rendah. Menyamakan
    // keduanya berarti memajang mutu rendah pada film yang belum tentu begitu.
    expect(asalKualitas("entah", {}, unduhan)).toEqual({ jenis: "kosong" });
  });

  it("nilai manual berisi spasi dianggap kosong", () => {
    expect(asalKualitas("entah", { entah: "   " }, unduhan).jenis).toBe("kosong");
  });
});

describe("asalRating — dari mana angka rating datang", () => {
  it("rating admin MENANG atas IMDb", () => {
    expect(asalRating("a", { a: "8.1" }, { a: { rating: "6.0" } })).toEqual({
      jenis: "manual",
      nilai: "8.1",
    });
  });

  it("tanpa rating admin, pakai IMDb", () => {
    expect(asalRating("a", {}, { a: { rating: "6.0" } })).toEqual({
      jenis: "imdb",
      nilai: "6.0",
    });
  });

  it("IMDb tercocokkan tapi TANPA nilai rating = kosong", () => {
    // Keadaan nyata: film baru / jarang ditonton punya halaman IMDb tapi
    // belum punya rating. Tombol "Cocokkan semua" tidak akan menolong di sini.
    expect(asalRating("a", {}, { a: {} })).toEqual({ jenis: "kosong" });
    expect(asalRating("a", {}, { a: { rating: "  " } })).toEqual({ jenis: "kosong" });
  });
});

describe("ringkasIsian — angka yang dibaca admin", () => {
  const videos = [
    { id: "1" }, // kualitas turunan HD, rating IMDb
    { id: "2" }, // kualitas manual, rating manual
    { id: "3" }, // kualitas kosong, rating kosong + BELUM dicocokkan IMDb
    { id: "4" }, // kualitas kosong, rating kosong tapi SUDAH dicocokkan
  ];
  const unduhan = kelompokkanUnduhan([link("1", "1080p")]);
  const imdb = { "1": { rating: "7.0" }, "4": {} };

  it("menghitung tiap asal dengan benar", () => {
    const r = ringkasIsian(videos, { "2": "CAM" }, { "2": "9.0" }, imdb, unduhan);
    expect(r.total).toBe(4);
    expect(r.kualitas).toEqual({ manual: 1, turunan: 1, kosong: 2 });
    expect(r.rating).toEqual({ manual: 1, imdb: 1, kosong: 2 });
  });

  it("MEMISAHKAN rating yang masih bisa ditolong 'Cocokkan semua'", () => {
    // Inti angka ini: video 3 belum pernah dicocokkan (masih bisa ditolong),
    // video 4 sudah dicocokkan tapi IMDb-nya memang tak punya rating (buntu).
    // Menggabungkan keduanya membuat admin mengklik "Cocokkan semua" berulang
    // kali untuk video yang hasilnya tidak akan pernah berubah.
    // Rating manual video 2 tetap diisi supaya yang tersisa kosong HANYA
    // video 3 & 4 — dua keadaan yang justru sedang dibedakan di sini.
    const r = ringkasIsian(videos, {}, { "2": "9.0" }, imdb, unduhan);
    expect(r.rating.kosong).toBe(2);
    expect(r.ratingBisaDitolongImdb).toBe(1);
  });

  it("tiap video terhitung TEPAT sekali di masing-masing kategori", () => {
    // Penjaga aritmatika: angka yang tidak berjumlah total akan terbaca
    // seperti ada video yang hilang.
    const r = ringkasIsian(videos, { "2": "CAM" }, { "2": "9.0" }, imdb, unduhan);
    const jumlahKualitas = r.kualitas.manual + r.kualitas.turunan + r.kualitas.kosong;
    const jumlahRating = r.rating.manual + r.rating.imdb + r.rating.kosong;
    expect(jumlahKualitas).toBe(r.total);
    expect(jumlahRating).toBe(r.total);
  });

  it("katalog kosong tidak melempar error", () => {
    const r = ringkasIsian([], {}, {}, {}, {});
    expect(r.total).toBe(0);
    expect(r.kualitas.kosong).toBe(0);
  });
});
