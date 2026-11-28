// Penjaga URUTAN SEKSI HALAMAN DEPAN — owner 2026-11-28.
//
// ⚠️ KENAPA INI PERLU ADA. Sampai hari ini urutan seksi beranda NOL dijaga:
// `URUTAN_SEKSI_BERANDA` diubah total (seksi pertama ditukar, dua seksi
// bertukar tempat) dan seluruh 2.953 tes tetap hijau. Artinya siapa pun bisa
// menyusun ulang beranda tanpa satu pun error — yang berubah cuma halaman
// depan yang tidak lagi sesuai permintaan owner, dan itu baru ketahuan kalau
// ada manusia yang kebetulan membukanya.
//
// Owner sudah DUA KALI menentukan urutan ini secara eksplisit (2026-11-24 dan
// 2026-11-28), jadi ia keputusan yang dipegang, bukan selera sesaat.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TabKatalogTampilan from "../app/components/beranda/TabKatalogTampilan";
import {
  SEKSI_FILM,
  TAB_BAWAAN,
  URUTAN_SEKSI_BERANDA,
} from "../lib/tab-katalog";
import type { Drama } from "../lib/types";
import type { PlaylyVideoPublik } from "../lib/playly-publik";

/**
 * Urutan yang diminta owner 2026-11-28, ditulis sebagai yang DILIHAT penonton.
 *
 * EMPAT seksi sejak owner mencabut "Top Bulan Ini" sore itu juga
 * (*"TOP BULAN INI kamu hilangkan saja"*) — seksi itu sempat ada beberapa jam.
 */
const URUTAN_DIMINTA = [
  "Film Terbaru",
  "Drama Asia",
  "Terpopuler",
  "Rekomendasi",
] as const;

const KATALOG: Drama[] = Array.from({ length: 40 }, (_, i) => ({
  id: `d${i}`,
  title: `Drama ${i}`,
  category: "Action",
  episodes: 10,
  views: `${i}K`,
  synopsis: "",
  gradient: "from-zinc-800 to-black",
  year: i % 2 ? "2026" : "2025",
  imdbRating: "8.0",
}));

const film = (i: number): PlaylyVideoPublik => ({
  id: `v${i}`,
  title: `Film ${i}`,
  durationSeconds: 7200,
  durationLabel: "2:00:00",
  creator: "",
  embedUrl: "https://contoh.test/embed",
  thumbnail: "https://contoh.test/sampul.jpg",
  dramaTitle: null,
  dramaHref: null,
  episode: null,
  year: "2026",
  genre: null,
  kategori: null,
  rating: "8.0",
  contentRating: null,
  country: null,
  quality: null,
});

// Kolam sengaja LEBIH dari dua jendela (20 kartu per seksi): seksi "Top Bulan
// Ini" mengambil jendela KEDUA, jadi kolam pendek membuatnya jatuh ke jendela
// pertama dan penjaga ini menguji keadaan yang bukan keadaan sebenarnya.
const KOLAM = Array.from({ length: 60 }, (_, i) => film(i));

const html = renderToStaticMarkup(
  createElement(TabKatalogTampilan, {
    dramas: KATALOG,
    tab: TAB_BAWAAN,
    semua: false,
    seksiLengkap: true,
    videos: KOLAM.slice(0, 20),
    filmSeksi: KOLAM,
  }),
);

describe("urutan seksi halaman depan (owner 2026-11-28)", () => {
  it("kelima judul tergambar", () => {
    for (const judul of URUTAN_DIMINTA) {
      expect(html, `seksi "${judul}" hilang dari beranda`).toContain(
        `>${judul}<`,
      );
    }
  });

  it("urutannya persis seperti yang diminta owner", () => {
    // Diuji dari POSISI di HTML, bukan dari konstanta: konstanta yang benar
    // tetap bisa digambar dengan urutan lain kalau komponennya menyusun
    // ulang sendiri (ia memang punya aturan "tab aktif naik ke atas").
    const posisi = URUTAN_DIMINTA.map((judul) => ({
      judul,
      di: html.indexOf(`>${judul}<`),
    }));
    for (const p of posisi) {
      expect(p.di, `seksi "${p.judul}" tidak tergambar`).toBeGreaterThan(-1);
    }
    const terurut = [...posisi].sort((a, b) => a.di - b.di).map((p) => p.judul);
    expect(
      terurut,
      "urutan seksi beranda menyimpang dari permintaan owner",
    ).toEqual([...URUTAN_DIMINTA]);
  });

  it("daftar sumbernya juga terkunci, dan tetap empat seksi", () => {
    // Pagar kedua: kalau daftar ini berubah, yang di atas ikut berubah arti.
    // Keduanya sengaja diperiksa — satu menjaga niat, satu menjaga hasil.
    expect(URUTAN_SEKSI_BERANDA).toEqual([
      SEKSI_FILM,
      "update",
      "terpopuler",
      "rekomendasi",
    ]);
    expect(
      URUTAN_SEKSI_BERANDA,
      "owner meminta beranda tepat empat seksi sejak Top Bulan Ini dicabut",
    ).toHaveLength(4);
  });

  it("tab yang DIPILIH penonton tetap naik ke atas", () => {
    // Perilaku lama (owner 2026-10-09) yang sengaja DIPERTAHANKAN saat urutan
    // dibetulkan 2026-11-28 — yang dikecualikan cuma tab BAWAAN, sebab itu
    // keadaan awal halaman dan bukan sebuah klik. Tanpa penjaga ini, membetulkan
    // urutan beranda gampang sekali ikut mematikan umpan balik kliknya.
    const dipilih = renderToStaticMarkup(
      createElement(TabKatalogTampilan, {
        dramas: KATALOG,
        tab: "terpopuler",
        semua: false,
        seksiLengkap: true,
        videos: KOLAM.slice(0, 20),
        filmSeksi: KOLAM,
      }),
    );
    const iTerpopuler = dipilih.indexOf(">Terpopuler<");
    const iFilmTerbaru = dipilih.indexOf(">Film Terbaru<");
    expect(iTerpopuler, "seksi Terpopuler tidak tergambar").toBeGreaterThan(-1);
    expect(
      iTerpopuler,
      "tab yang diklik tidak lagi naik ke atas — kliknya jadi tak terasa",
    ).toBeLessThan(iFilmTerbaru);
  });

  it('seksi "Top Bulan Ini" tidak digambar lagi di beranda', () => {
    // Owner mencabutnya 2026-11-28 sesudah melihatnya di layar. Tabnya TETAP
    // hidup (`/katalog?tab=terbaru` masih mendarat benar) — yang dicabut cuma
    // seksinya dari halaman depan, jadi yang diperiksa di sini HTML beranda.
    expect(
      html,
      'seksi "Top Bulan Ini" muncul lagi di beranda',
    ).not.toContain(">Top Bulan Ini<");
  });

  it('nama seksi "Nonton Bareng" tidak dipakai lagi sebagai judul seksi', () => {
    // Nama itu kini HANYA milik fitur room tonton-bersama. Dua hal berbeda
    // dengan nama sama di satu halaman sudah pernah membuat owner sendiri
    // tertukar, dan itulah alasan ia diganti.
    expect(
      html,
      'judul seksi "Nonton Bareng" muncul lagi di beranda',
    ).not.toContain(">Nonton Bareng<");
  });
});
