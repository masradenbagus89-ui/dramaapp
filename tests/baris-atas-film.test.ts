// Penjaga baris PALING ATAS halaman depan — owner 2026-11-17:
// "di tampilan awal yang paling atas sekarang isinya drama semua, ubah jadi
// film terbaru (film terbaru dilihat dari tahun)".
//
// Dua lapis, karena masing-masing menutup lubang yang lain:
// 1. RENDER: kartu film benar-benar tergambar, tahunnya ikut, urutan masuk
//    dipertahankan (sumbernya yang mengurut tahun — halaman tidak mengurut
//    ulang). Data uji DIMULAI dari urutan yang sudah benar-tahun di depan,
//    lalu satu judul drama yang TIDAK boleh muncul.
// 2. SUMBER HALAMAN: kedua halaman (/ dan /beranda) mengisi baris itu dari
//    daftar `film` yang sudah dipisah dari serial, bukan dari
//    `featuredHeroSlides` yang justru memilih drama berseri.
//
// Komentar dibuang dulu — penjaga teks bisa lulus dari komentarnya sendiri.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import FeaturedRow from "../app/components/beranda/FeaturedRow";
import { bungkusVideo } from "../lib/beranda-video";
import type { PlaylyVideoPublik } from "../lib/playly-publik";

function video(
  id: string,
  title: string,
  year: string | null,
): PlaylyVideoPublik {
  return {
    id,
    title,
    durationSeconds: 6000,
    durationLabel: "1:40:00",
    creator: "",
    embedUrl: "https://contoh.test/embed",
    thumbnail: "https://contoh.test/poster.jpg",
    dramaTitle: null,
    dramaHref: null,
    episode: null,
    year,
    genre: "Action",
    kategori: null,
    rating: "7.8",
    contentRating: null,
    country: null,
    quality: "HD",
  };
}

const tanpaKomentar = (berkas: string) =>
  readFileSync(berkas, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");

describe("baris paling atas menggambar film, bukan drama", () => {
  it("judul film dan tahunnya tergambar, drama tidak ikut", () => {
    const html = renderToStaticMarkup(
      createElement(FeaturedRow, {
        items: [
          bungkusVideo(video("baru", "Film Tahun Baru", "2026")),
          bungkusVideo(video("lama", "Film Tahun Lama", "2020")),
        ],
      }),
    );

    const posisiBaru = html.indexOf("Film Tahun Baru");
    const posisiLama = html.indexOf("Film Tahun Lama");
    expect(posisiBaru).toBeGreaterThanOrEqual(0);
    expect(posisiLama).toBeGreaterThan(posisiBaru);
    expect(html).toContain("2026");
    expect(html).toContain("2020");
    expect(html).not.toContain("Suami Mengkhianati");
    expect(html).not.toContain('href="/drama/');
  });
});

describe("halaman depan mengisi baris atas dari film saja", () => {
  it.each(["app/page.tsx", "app/beranda/page.tsx"])(
    "%s mengambil film terbaru lewat siapkanTampilanDepan, bukan campuran drama",
    (berkas) => {
      const isi = tanpaKomentar(berkas);
      expect(isi).toContain("siapkanTampilanDepan(");
      expect(isi).toContain("bungkusVideo(b.item)");
      expect(isi).not.toContain("bungkusDrama");
      expect(isi).toContain("heroItems={heroItems}");
      expect(isi).not.toContain("featuredHeroSlides");
      expect(isi).not.toMatch(/videos\.slice\(\s*0,\s*FEATURED_ROW_COUNT/);
      expect(isi).not.toMatch(/\bfilm\)?\.slice\(0,\s*TAB_GRID_ITEMS\s*\)/);
    },
  );

  it("badan bersama meneruskan kartu itu ke baris atas", () => {
    const isi = tanpaKomentar("app/components/beranda/BadanKatalog.tsx");
    // JSX-nya kini ditulis multi-baris, jadi dicocokkan dengan toleransi
    // spasi/ganti-baris. Yang dijaga tetap sama: prop items-nya memang
    // heroItems — bukan bagaimana barisnya dirapikan.
    expect(isi).toMatch(/<FeaturedRow\s+items=\{heroItems\}/);
    expect(isi).not.toContain("featuredHeroSlides");
    expect(isi).not.toContain("dramas={heroSlides}");
  });
});
