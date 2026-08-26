// Tes pengunci untuk jalur PUBLIK video Playly.
//
// Dua bug nyata yang sudah pernah lolos ke produksi dijaga di sini, supaya
// kalau kambuh tesnya MERAH lebih dulu — bukan owner yang menemukannya:
//
//   1. Kunci mitra yang SAH tidak terbaca karena tersimpan di env bernama
//      DASHBOARD_API_KEY, sedangkan kode hanya mencari PLAYLY_API_KEY.
//      Akibatnya halaman admin menulis "kunci belum dipasang" dan daftar video
//      selalu kosong, padahal kuncinya benar.
//   2. Video yang disembunyikan admin tetap ikut tampil ke penonton — kesalahan
//      yang tak terlihat dari sisi admin, jadi bisa berlarut-larut.
import { describe, it, expect } from "vitest";
import { filterVideoMilikKreator, readPlaylyKeyFromEnv } from "../lib/playly";
import { rakitVideoPublik } from "../lib/playly-publik";
import type { PlaylyVideo } from "../lib/playly";

function video(id: string, judul = `Video ${id}`, creator = "coklat"): PlaylyVideo {
  return {
    id,
    title: judul,
    durationSeconds: 140,
    durationLabel: "2:20",
    creator,
    embedUrl: `https://playly-dashboard.vercel.app/id/${id}/embed`,
    thumbnail: null,
  };
}

describe("readPlaylyKeyFromEnv — kunci boleh datang dari dua nama env", () => {
  it("membaca PLAYLY_API_KEY kalau ada", () => {
    expect(readPlaylyKeyFromEnv({ PLAYLY_API_KEY: "plyk_abcdef123456" })).toBe(
      "plyk_abcdef123456",
    );
  });

  it("BUG YANG PERNAH LOLOS: kunci di DASHBOARD_API_KEY tetap terbaca", () => {
    expect(readPlaylyKeyFromEnv({ DASHBOARD_API_KEY: "plyk_abcdef123456" })).toBe(
      "plyk_abcdef123456",
    );
  });

  it("PLAYLY_API_KEY didahulukan kalau keduanya diisi", () => {
    expect(
      readPlaylyKeyFromEnv({
        PLAYLY_API_KEY: "plyk_benar123456",
        DASHBOARD_API_KEY: "plyk_lama123456",
      }),
    ).toBe("plyk_benar123456");
  });

  it("mengabaikan nilai yang jelas bukan kunci Playly", () => {
    // DASHBOARD_API_KEY bisa saja diisi kunci layanan LAIN; mengirimnya ke
    // Playly hanya menghasilkan 401 dan menyesatkan saat mencari penyebabnya.
    expect(readPlaylyKeyFromEnv({ DASHBOARD_API_KEY: "sk_live_rahasia" })).toBeNull();
  });

  it("spasi/baris baru di ujung tidak membuat kunci ditolak", () => {
    expect(readPlaylyKeyFromEnv({ PLAYLY_API_KEY: "  plyk_abcdef123456\n" })).toBe(
      "plyk_abcdef123456",
    );
  });

  it("env kosong -> null (bukan string kosong yang lolos sebagai 'ada kunci')", () => {
    expect(readPlaylyKeyFromEnv({})).toBeNull();
    expect(readPlaylyKeyFromEnv({ PLAYLY_API_KEY: "   " })).toBeNull();
  });
});

describe("rakitVideoPublik — video mana yang boleh dilihat penonton", () => {
  const dramas = [{ id: "drama-a", title: "Drama A" }];

  it("tanpa daftar sembunyi, SEMUA video mitra tampil (otomatis)", () => {
    const { tampil } = rakitVideoPublik([video("1"), video("2")], [], [], dramas);
    expect(tampil.map((v) => v.id)).toEqual(["1", "2"]);
  });

  it("video yang disembunyikan admin TIDAK ikut tampil", () => {
    const { tampil } = rakitVideoPublik(
      [video("1"), video("2"), video("3")],
      ["2"],
      [],
      dramas,
    );
    expect(tampil.map((v) => v.id)).toEqual(["1", "3"]);
  });

  it("menyembunyikan semua -> daftar kosong, bukan error", () => {
    const { tampil } = rakitVideoPublik([video("1")], ["1"], [], dramas);
    expect(tampil).toEqual([]);
  });

  it("id yang disembunyikan tapi videonya sudah tidak ada = diabaikan diam-diam", () => {
    const { tampil } = rakitVideoPublik([video("1")], ["sudah-dihapus"], [], dramas);
    expect(tampil.map((v) => v.id)).toEqual(["1"]);
  });

  it("video tanpa kaitan drama tetap tampil, labelnya kosong", () => {
    // Inti perbaikan 2026-08-26: dulu video WAJIB dikaitkan ke drama dulu,
    // sehingga trailer film yang tak punya drama padanan tak pernah bisa masuk.
    const { tampil, labelUntuk } = rakitVideoPublik([video("1")], [], [], dramas);
    expect(tampil).toHaveLength(1);
    expect(labelUntuk("1")).toEqual({
      dramaTitle: null,
      dramaHref: null,
      episode: null,
    });
  });

  it("video yang dikaitkan mendapat label judul drama + episode", () => {
    const { labelUntuk } = rakitVideoPublik(
      [video("1")],
      [],
      [{ videoId: "1", dramaId: "drama-a", episode: 3 }],
      dramas,
    );
    expect(labelUntuk("1")).toEqual({
      dramaTitle: "Drama A",
      dramaHref: "/drama/drama-a",
      episode: 3,
    });
  });

  it("kaitan ke drama yang sudah DIHAPUS tidak menghasilkan tautan menggantung", () => {
    const { tampil, labelUntuk } = rakitVideoPublik(
      [video("1")],
      [],
      [{ videoId: "1", dramaId: "drama-sudah-dihapus", episode: 1 }],
      dramas,
    );
    // Videonya tetap tampil — yang gugur hanya labelnya.
    expect(tampil).toHaveLength(1);
    expect(labelUntuk("1").dramaHref).toBeNull();
  });
});

describe("filterVideoMilikKreator — katalog publik disaring ke akun kita", () => {
  // Latar: kunci mitra terbukti bisa dicabut sewaktu-waktu (2026-08-26 kunci
  // yang sama dibalas ok:true lalu invalid_key 20 menit kemudian). Saat itu
  // terjadi, daftar diambil dari katalog publik Playly yang isinya bercampur
  // video kreator lain — penyaring inilah satu-satunya yang menahan mereka.
  const katalogCampur = [
    video("1", "Punya kita", "coklat"),
    video("2", "Punya orang lain", "viozahra"),
    video("3", "Punya kita juga", "coklat"),
    video("4", "Punya orang lain lagi", "cantika"),
  ];

  it("hanya video milik kreator kita yang lolos", () => {
    const hasil = filterVideoMilikKreator(katalogCampur, "coklat");
    expect(hasil.map((v) => v.id)).toEqual(["1", "3"]);
  });

  it("video kreator lain TIDAK pernah lolos", () => {
    const hasil = filterVideoMilikKreator(katalogCampur, "coklat");
    expect(hasil.some((v) => v.creator !== "coklat")).toBe(false);
  });

  it("beda besar-kecil huruf & spasi tidak membuat video kita hilang", () => {
    expect(filterVideoMilikKreator(katalogCampur, "  CoKlAt ").map((v) => v.id)).toEqual([
      "1",
      "3",
    ]);
  });

  it("nama kreator kosong -> TIDAK menampilkan apa pun (gagal-aman)", () => {
    // Kalau nama pembandingnya hilang, menampilkan seluruh katalog berarti video
    // orang lain terbit di situs kita. Lebih baik kosong daripada salah tayang.
    expect(filterVideoMilikKreator(katalogCampur, "")).toEqual([]);
    expect(filterVideoMilikKreator(katalogCampur, "   ")).toEqual([]);
  });

  it("nama kreator yang tidak ada di katalog -> kosong, bukan error", () => {
    expect(filterVideoMilikKreator(katalogCampur, "tidak-ada")).toEqual([]);
  });
});
