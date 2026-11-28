// Penjaga pembagian isi TIGA seksi film beranda (owner 2026-11-24: *"nonton
// bareng, rekomendasi kamu isi dengan film saja jangan drama lagi"*).
//
// ⚠️ KENAPA TES INI WAJIB ADA, bukan cukup dilihat di layar: film datang dari
// penyedia video LUAR yang butuh kunci API, dan kunci itu hanya ada di server
// produksi — di komputer mana pun daftarnya SELALU kosong. Jadi ketiga seksi
// ini mustahil dibuktikan lewat localhost maupun screenshot.
//
// DUA KERUSAKAN YANG DIKUNCI DI SINI — keduanya sudah betul-betul terjadi dan
// TERUKUR di build 2026-11-24, sebelum lib/film-seksi.ts ada:
//   • 11 dari 20 kartu "Nonton Bareng" tanpa sampul (kotak hitam berjejer),
//     karena seksi itu menarik dari daftar film MENTAH.
//   • 9 dari 20 judulnya sama dengan baris poster paling atas.
// Keduanya nol error, nol tes merah — cuma beranda yang terbaca rusak. Itulah
// sebabnya dikunci sebagai tes, bukan sebagai catatan.
import { describe, it, expect } from "vitest";
import { filmSeksiTopBulanIni, filmSeksiRekomendasi } from "../lib/film-seksi";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TabKatalogTampilan from "../app/components/beranda/TabKatalogTampilan";
import { siapkanTampilanDepan } from "../lib/baris-atas";
import { KUNCI_BARIS_VIDEO } from "../lib/beranda-video";
import { SEKSI_BERISI_FILM, TAB_BAWAAN, TAB_GRID_ITEMS } from "../lib/tab-katalog";
import type { Drama } from "../lib/types";
import type { PlaylyVideoPublik } from "../lib/playly-publik";

type FilmUji = { id: string; rating: string | null; thumbnail?: string | null };

const kolam = (jumlah: number): FilmUji[] =>
  Array.from({ length: jumlah }, (_, i) => ({
    id: `f${i}`,
    // Rating menurun seiring urutan supaya "urut tahun" dan "urut rating"
    // kebetulan TIDAK bisa tertukar tanpa terlihat.
    rating: (9 - i * 0.1).toFixed(1),
    thumbnail: `https://contoh/${i}.jpg`,
  }));

describe("filmSeksiTopBulanIni — jendela KEDUA, bukan yang pertama", () => {
  it("mengambil 20 film SESUDAH 20 pertama", () => {
    const hasil = filmSeksiTopBulanIni(kolam(60), 20);
    expect(hasil).toHaveLength(20);
    expect(hasil[0]!.id).toBe("f20");
    expect(hasil[19]!.id).toBe("f39");
  });

  it("NOL judul yang sama dengan seksi Film Terbaru (jendela pertama)", () => {
    const semua = kolam(60);
    const filmTerbaru = new Set(semua.slice(0, 20).map((v) => v.id));
    const bareng = filmSeksiTopBulanIni(semua, 20);
    expect(bareng.filter((v) => filmTerbaru.has(v.id))).toEqual([]);
  });

  it("kolam PENDEK (penyedia sepi) → jatuh ke jendela pertama, bukan kosong", () => {
    // Lubang kosong di seksi paling atas beranda lebih buruk daripada judul
    // yang terulang satu baris.
    const hasil = filmSeksiTopBulanIni(kolam(8), 20);
    expect(hasil.map((v) => v.id)).toEqual(kolam(8).map((v) => v.id));
  });

  it("jendela kedua yang ADA tapi pendek dibiarkan pendek apa adanya", () => {
    const hasil = filmSeksiTopBulanIni(kolam(25), 20);
    expect(hasil.map((v) => v.id)).toEqual(["f20", "f21", "f22", "f23", "f24"]);
  });

  it("jumlah tak wajar (0, negatif, NaN) → daftar kosong, bukan error", () => {
    expect(filmSeksiTopBulanIni(kolam(60), 0)).toEqual([]);
    expect(filmSeksiTopBulanIni(kolam(60), -5)).toEqual([]);
    expect(filmSeksiTopBulanIni(kolam(60), Number.NaN)).toEqual([]);
  });
});

describe("filmSeksiRekomendasi — rating tertinggi lebih dulu", () => {
  it("mengurut dari rating TERBESAR dan memotong sesuai jumlah", () => {
    const acak: FilmUji[] = [
      { id: "sedang", rating: "7.0" },
      { id: "tinggi", rating: "9.1" },
      { id: "rendah", rating: "4.2" },
    ];
    expect(filmSeksiRekomendasi(acak, 2).map((v) => v.id)).toEqual(["tinggi", "sedang"]);
  });

  it("rating kosong jatuh ke EKOR, tidak hilang dari daftar", () => {
    // Video yang belum dikaitkan admin ke drama memang ber-rating null; ia
    // tetap film yang bisa ditonton, jadi tak boleh dibuang.
    const campur: FilmUji[] = [
      { id: "tanpa", rating: null },
      { id: "ada", rating: "6.0" },
    ];
    expect(filmSeksiRekomendasi(campur, 5).map((v) => v.id)).toEqual(["ada", "tanpa"]);
  });

  it("rating SAMA → urutan asli (tahun rilis) jadi pemutus", () => {
    const seri: FilmUji[] = [
      { id: "baru", rating: "8.0" },
      { id: "lama", rating: "8.0" },
    ];
    expect(filmSeksiRekomendasi(seri, 5).map((v) => v.id)).toEqual(["baru", "lama"]);
  });

  it("TIDAK mengubah urutan kolam aslinya", () => {
    // Kolam yang sama dipakai dua seksi lain yang bergantung pada urutan tahun;
    // `sort` tanpa salinan akan mengacaukan keduanya tanpa satu pun error.
    const asli = kolam(5);
    const sebelum = asli.map((v) => v.id);
    filmSeksiRekomendasi(asli, 5);
    expect(asli.map((v) => v.id)).toEqual(sebelum);
  });
});

describe("kolam `filmSeksi` — sudah bersih sebelum dibagi", () => {
  const dapatkan = (film: FilmUji[]) =>
    siapkanTampilanDepan({
      film,
      series: [],
      drama: [],
      jumlahBaris: 2,
      jumlahFilm: 3,
    });

  it("membuang film yang SUDAH duduk di baris poster atas", () => {
    const { barisAtas, filmSeksi } = dapatkan(kolam(6));
    const diAtas = barisAtas.map((b) => b.item.id);
    expect(diAtas).toEqual(["f0", "f1"]);
    expect(filmSeksi.map((v) => v.id)).toEqual(["f2", "f3", "f4", "f5"]);
  });

  it("membuang film TANPA sampul — sumber kotak hitam berjejer", () => {
    const campur: FilmUji[] = [
      { id: "bergambar1", rating: "8.0", thumbnail: "https://contoh/a.jpg" },
      { id: "kosong", rating: "8.0", thumbnail: "" },
      { id: "null", rating: "8.0", thumbnail: null },
      { id: "bergambar2", rating: "8.0", thumbnail: "https://contoh/b.jpg" },
      { id: "bergambar3", rating: "8.0", thumbnail: "https://contoh/c.jpg" },
    ];
    const { filmSeksi } = dapatkan(campur);
    expect(filmSeksi.map((v) => v.id)).toEqual(["bergambar3"]);
    expect(filmSeksi.every((v) => Boolean(v.thumbnail?.trim()))).toBe(true);
  });

  it("TIDAK dipotong — pembagi jendela butuh melihat kolam utuhnya", () => {
    // `filmDiDepan` dipotong 3 (jumlahFilm), `filmSeksi` tidak. Kalau keduanya
    // ikut terpotong, seksi "Nonton Bareng" kehabisan bahan untuk jendela
    // keduanya dan diam-diam jatuh ke isi yang sama dengan "Film Terbaru".
    const { filmDiDepan, filmSeksi } = dapatkan(kolam(10));
    expect(filmDiDepan).toHaveLength(3);
    expect(filmSeksi).toHaveLength(8);
  });
});

describe("beranda menggambar Nonton Bareng & Rekomendasi sebagai seksi FILM", () => {
  // Tingkat RENDER, bukan cuma fungsi murni di atas: aturan pemilihan yang
  // benar tapi tak pernah dipanggil komponennya akan tetap hijau di tes
  // fungsi, sementara layarnya tetap menampilkan drama.
  const katalog: Drama[] = Array.from({ length: 25 }, (_, i) => ({
    id: `d${i}`,
    title: `Drama Katalog ${i}`,
    category: "Action",
    episodes: 10,
    views: `${i}K`,
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    year: "2025",
    imdbRating: "8.0",
  }));

  const filmPlayly = (i: number): PlaylyVideoPublik => ({
    id: `v${i}`,
    title: `Film Layar Lebar ${i}`,
    durationSeconds: 7200,
    durationLabel: "2:00:00",
    creator: "",
    embedUrl: "https://contoh.test/embed",
    thumbnail: `https://contoh.test/${i}.jpg`,
    dramaTitle: null,
    dramaHref: null,
    episode: null,
    year: "2026",
    genre: null,
    kategori: null,
    rating: (9 - i * 0.1).toFixed(1),
    contentRating: null,
    country: null,
    quality: null,
  });

  const kolamFilm = Array.from({ length: 45 }, (_, i) => filmPlayly(i));
  const html = renderToStaticMarkup(
    createElement(TabKatalogTampilan, {
      dramas: katalog,
      tab: TAB_BAWAAN,
      semua: false,
      seksiLengkap: true,
      filmSeksi: kolamFilm,
      // Meniru halaman sungguhan: `videos` = `filmDiDepan`, yaitu 20 teratas
      // kolam yang SAMA (lib/baris-atas.ts). Tanpa ini seksi "Film Terbaru"
      // tidak tergambar dan perbandingan judul di bawah tak ada artinya.
      videos: kolamFilm.slice(0, TAB_GRID_ITEMS),
    }),
  );

  const blok = (kunci: string) => {
    const mulai = html.indexOf(`id="seksi-${kunci}"`);
    expect(mulai, `seksi ${kunci} tidak tergambar`).toBeGreaterThanOrEqual(0);
    const berikut = html.indexOf('id="seksi-', mulai + 1);
    return html.slice(mulai, berikut < 0 ? undefined : berikut);
  };

  for (const kunci of [...SEKSI_BERISI_FILM]) {
    it(`seksi "${kunci}" berisi film, NOL drama katalog`, () => {
      const isi = blok(kunci);
      expect(isi).toContain("Film Layar Lebar");
      // Inilah permintaan owner 2026-11-24 yang dikunci: *"isi dengan film
      // saja jangan drama lagi"*.
      expect(isi).not.toContain("Drama Katalog");
    });
  }

  it("Nonton Bareng & Film Terbaru tidak menampilkan judul yang sama", () => {
    // Kolamnya satu; tanpa pembagi jendela, kedua seksi ini kembar di satu
    // layar. Judul dibandingkan dari HTML yang sudah tergambar, bukan dari
    // hasil fungsi — supaya yang diuji adalah apa yang dilihat penonton.
    const judul = (isi: string) =>
      new Set([...isi.matchAll(/Film Layar Lebar (\d+)/g)].map((m) => m[1]));
    const bareng = judul(blok(TAB_BAWAAN));
    const terbaru = judul(blok(KUNCI_BARIS_VIDEO));

    expect(bareng.size).toBeGreaterThan(0);
    expect(terbaru.size).toBeGreaterThan(0);
    expect([...bareng].filter((id) => terbaru.has(id))).toEqual([]);
  });

  it("Rekomendasi diurutkan dari rating tertinggi", () => {
    const urut = [...blok("rekomendasi").matchAll(/Film Layar Lebar (\d+)/g)].map((m) =>
      Number(m[1]),
    );
    expect(urut.length).toBeGreaterThan(1);
    // Rating film buatan menurun seiring nomornya, jadi nomor terkecil =
    // rating tertinggi dan harus tampil lebih dulu.
    expect(urut[0]).toBe(0);
    expect([...urut].sort((a, b) => a - b)).toEqual(urut);
  });
});
