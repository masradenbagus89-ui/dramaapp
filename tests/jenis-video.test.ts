// Penjaga pemisahan FILM vs SERIAL untuk video Playly — owner 2026-11-05:
// "rekan saya upload drama dari playly tapi masuknya ke film terbaru, harusnya
// masuk ke series terbaru".
//
// ⚠️ KENAPA TES INI WAJIB ADA, bukan cukup dilihat di layar: video datang dari
// penyedia LUAR yang butuh kunci API, dan kunci itu hanya ada di server
// produksi. Di komputer mana pun daftarnya SELALU kosong, jadi perpindahan
// antar-seksi MUSTAHIL dibuktikan lewat localhost maupun screenshot.
//
// Diuji DUA ARAH dengan sengaja: "serial muncul di Series Terbaru" saja tidak
// membuktikan apa-apa kalau ia TETAP juga muncul di Film Terbaru — justru itu
// bug yang dilaporkan owner.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import TabKatalogTampilan from "../app/components/beranda/TabKatalogTampilan";
import { JUDUL_BARIS_VIDEO, KUNCI_BARIS_VIDEO } from "../lib/beranda-video";
import { TAB_BAWAAN, TAB_GRID_ITEMS } from "../lib/tab-katalog";
import {
  JENIS_BAWAAN,
  MAKS_SERIES_PLAYLY_DI_SEKSI,
  jenisVideo,
  parseJenisVideo,
  pisahFilmSeries,
  tempelJenisVideo,
} from "../lib/jenis-video";
import type { Drama } from "../lib/types";
import type { PlaylyVideoPublik } from "../lib/playly-publik";

const KATALOG: Drama[] = Array.from({ length: 12 }, (_, i) => ({
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

const video = (
  nama: string,
  extra: Partial<PlaylyVideoPublik> = {},
): PlaylyVideoPublik => ({
  id: nama,
  title: nama,
  durationSeconds: 7200,
  durationLabel: "2:00:00",
  creator: "",
  embedUrl: "https://contoh.test/embed",
  thumbnail: null,
  dramaTitle: null,
  dramaHref: null,
  episode: null,
  year: "2026",
  genre: null,
  kategori: null,
  rating: null,
  contentRating: null,
  country: null,
  quality: null,
  ...extra,
});

const render = (
  videos: PlaylyVideoPublik[],
  videoSeries: PlaylyVideoPublik[] = [],
) =>
  renderToStaticMarkup(
    createElement(TabKatalogTampilan, {
      dramas: KATALOG,
      tab: TAB_BAWAAN,
      semua: false,
      seksiLengkap: true,
      videos,
      videoSeries,
    }),
  );

describe("aturan jenis video (fungsi murni)", () => {
  it("hanya menerima 'film' dan 'series' — nilai lain dianggap belum ditandai", () => {
    expect(parseJenisVideo("film")).toBe("film");
    expect(parseJenisVideo("series")).toBe("series");
    expect(parseJenisVideo("SERIES")).toBe("series");
    expect(parseJenisVideo(" film ")).toBe("film");

    // Apa pun selain dua nilai itu TIDAK boleh tersimpan — termasuk teks yang
    // kelihatan masuk akal. Ini pagar mass assignment: isinya datang dari body
    // permintaan HTTP lalu dibaca halaman penonton.
    for (const ngawur of ["drama", "movie", "", null, undefined, 7, {}, []]) {
      expect(parseJenisVideo(ngawur)).toBeNull();
    }
  });

  it("video yang belum ditandai dihitung FILM, bukan serial", () => {
    // Pagar paling penting di berkas ini: hari fitur dipasang, NOL dari 489
    // video produksi punya penanda. Kalau bawaannya berubah jadi "series",
    // seluruh katalog film pindah baris sekaligus tanpa diminta siapa pun.
    expect(JENIS_BAWAAN).toBe("film");
    expect(jenisVideo("v1", {})).toBe("film");
    expect(jenisVideo("v1", { v2: "series" })).toBe("film");
    expect(jenisVideo("v1", { v1: "ngawur" })).toBe("film");
    expect(jenisVideo("v1", { v1: "series" })).toBe("series");
  });

  it("memisahkan film & serial TANPA mengubah urutan aslinya", () => {
    const daftar = [
      video("a"),
      video("b", { jenis: "series" }),
      video("c"),
      video("d", { jenis: "series" }),
    ];
    const { film, series } = pisahFilmSeries(daftar);

    expect(film.map((v) => v.id)).toEqual(["a", "c"]);
    expect(series.map((v) => v.id)).toEqual(["b", "d"]);
  });

  it("menempelkan jenis tanpa mengubah daftar milik pemanggil", () => {
    const asli = [video("a"), video("b")];
    const hasil = tempelJenisVideo(asli, { b: "series" });

    expect(hasil.map((v) => v.jenis)).toEqual(["film", "series"]);
    // §3.7: fungsi tidak boleh punya efek samping tersembunyi. Kalau daftar
    // asli ikut berubah, pemanggil lain yang memegang daftar yang sama akan
    // melihat jenis berubah sendiri — kerusakan yang senyap.
    expect(asli.every((v) => v.jenis === undefined)).toBe(true);
  });
});

describe("seksi beranda memisahkan film dari serial", () => {
  it("serial TIDAK ikut tergambar di seksi Film Terbaru", () => {
    // Inilah bug yang dilaporkan owner. Arah ini yang paling penting dijaga:
    // serial boleh muncul di mana pun, asal TIDAK di baris film.
    const html = render([video("Film Layar Lebar")], [video("Drama Berseri")]);

    const mulaiFilm = html.indexOf(`id="seksi-${KUNCI_BARIS_VIDEO}"`);
    const mulaiSeries = html.indexOf(`id="seksi-${TAB_BAWAAN}"`);
    expect(mulaiFilm).toBeGreaterThanOrEqual(0);
    expect(mulaiSeries).toBeGreaterThan(mulaiFilm);

    const blokFilm = html.slice(mulaiFilm, mulaiSeries);
    expect(blokFilm).toContain("Film Layar Lebar");
    expect(blokFilm).not.toContain("Drama Berseri");
  });

  it("serial tergambar di seksi Series Terbaru, DI DEPAN drama katalog", () => {
    const html = render([], [video("Drama Berseri")]);

    const blokSeries = html.slice(html.indexOf(`id="seksi-${TAB_BAWAAN}"`));
    expect(blokSeries).toContain("Drama Berseri");
    // Di DEPAN, bukan di ekor: seksi memuat 20 kartu dan yang di ekor praktis
    // tak pernah terlihat tanpa menggeser jauh — owner yang baru menandai video
    // akan menyimpulkan fiturnya tidak jalan.
    expect(blokSeries.indexOf("Drama Berseri")).toBeLessThan(
      blokSeries.indexOf("Drama Katalog 0"),
    );
  });

  it("serial tidak pernah MENGGUSUR habis drama katalog dari seksinya", () => {
    // Pre-mortem rencana 2026-11-05: satu drama pendek bisa berisi puluhan
    // episode, dan tiap episode hari ini = satu kartu. Tanpa batas, 30 episode
    // memenuhi seluruh seksi dan drama katalog owner terdorong keluar layar.
    const banyak = Array.from({ length: 30 }, (_, i) => video(`Episode ${i}`));
    const html = render([], banyak.slice(0, MAKS_SERIES_PLAYLY_DI_SEKSI));

    const blokSeries = html.slice(html.indexOf(`id="seksi-${TAB_BAWAAN}"`));
    expect(blokSeries).toContain("Drama Katalog 0");
    expect(MAKS_SERIES_PLAYLY_DI_SEKSI).toBeLessThan(TAB_GRID_ITEMS);
  });

  it("seksi Film Terbaru hilang saat tidak ada satu pun film", () => {
    // Diuji dua arah: tanpa ini, "serial tak muncul di baris film" tidak bisa
    // dibedakan dari "baris filmnya memang tak pernah digambar".
    const html = render([], [video("Drama Berseri")]);
    expect(html).not.toContain(`id="seksi-${KUNCI_BARIS_VIDEO}"`);
    expect(html).toContain("Drama Berseri");

    const adaFilm = render([video("Film Layar Lebar")], []);
    expect(adaFilm).toContain(`id="seksi-${KUNCI_BARIS_VIDEO}"`);
    expect(adaFilm).toContain(JUDUL_BARIS_VIDEO);
  });

  it("nol penanda = perilaku lama persis: semua video tetap di Film Terbaru", () => {
    // Pagar "fitur ini tidak mengubah apa pun sampai owner menandai".
    const { film, series } = pisahFilmSeries(
      tempelJenisVideo([video("a"), video("b"), video("c")], {}),
    );
    expect(film).toHaveLength(3);
    expect(series).toHaveLength(0);
  });
});

describe("halaman memisahkan SEBELUM memotong", () => {
  // Jebakan yang ditemukan saat membaca kode, sebelum sempat tayang: kedua
  // halaman memotong daftar video ke TAB_GRID_ITEMS. Kalau potongan terjadi
  // LEBIH DULU, tiap serial yang kebetulan ada di 20 teratas mengurangi isi
  // seksi Film (20 kartu jadi 19) — dan karena video terbaru selalu di depan,
  // justru upload terbaru yang paling sering memicunya. Tak ada error, cuma
  // baris yang menyusut sendiri.
  for (const halaman of ["app/page.tsx", "app/beranda/page.tsx"]) {
    it(`${halaman} memanggil pisahFilmSeries sebelum slice`, () => {
      const isi = readFileSync(halaman, "utf8");
      const posPisah = isi.indexOf("pisahFilmSeries(videos)");
      const posSlice = isi.indexOf(".slice(0, TAB_GRID_ITEMS)");

      expect(posPisah).toBeGreaterThan(0);
      expect(posSlice).toBeGreaterThan(posPisah);
      // Yang dipotong WAJIB hasil pemisahan, bukan daftar gabungan.
      expect(isi).toContain("film.slice(0, TAB_GRID_ITEMS)");
      expect(isi).not.toContain("videos.slice(0, TAB_GRID_ITEMS)");
    });
  }
});
