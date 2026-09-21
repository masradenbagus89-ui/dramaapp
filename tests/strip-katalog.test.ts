// Penjaga syarat owner: "semua chip & menu BERFUNGSI kalau diklik"
// (permintaan 2026-09-10, ditegaskan lagi 2026-09-21).
//
// Bedanya dengan tests/nav-katalog.test.ts: di sana yang diuji fungsi penyusun
// daftarnya; DI SINI komponennya benar-benar DIRENDER lalu alamat yang
// SUNGGUHAN tertulis di HTML itu dijalankan lewat penyaring halaman. Tanpa
// lapisan ini, daftar yang benar masih bisa gagal sampai ke layar — mis.
// halaman memakai daftar tetap alih-alih daftar yang dihitung dari katalog,
// dan chip mati tergambar tanpa satu pun pesan error.
//
// `next/navigation` di-mock karena DramaBrowser memakai useRouter/useSearchParams
// yang cuma hidup di dalam runtime Next.
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { filterDariUrl } from "../lib/discover";
import { buildNavMenus, catalogShortcuts } from "../lib/nav-katalog";
import type { Drama } from "../lib/types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));

const { default: DramaBrowser } = await import("../app/components/DramaBrowser");
const { default: PublicTopBars } = await import(
  "../app/components/beranda/PublicTopBars"
);

function stub(partial: Partial<Drama> & Pick<Drama, "id" | "title">): Drama {
  return {
    category: "Action",
    episodes: 10,
    views: "1.0K",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

/**
 * Katalog uji dibuat semirip mungkin dengan katalog produksi (dibaca
 * 2026-09-21): kategori kurasi & genre sinema OMDb yang BERBEDA, negara
 * gabungan, sebagian judul tanpa tahun, campuran film/serial dan gratis/koin.
 * SENGAJA tanpa `posterImage` — dengan gambar, `Poster` memakai `next/image`
 * yang butuh runtime Next dan tidak bisa dirender di sini.
 */
const KATALOG: Drama[] = [
  stub({
    id: "a",
    title: "Alpha",
    category: "Romance",
    genre: "Horror, Sci-Fi",
    country: "China, United States",
    year: "2026",
    subtitles: ["id"],
    imdbRating: "8.1",
  }),
  stub({
    id: "b",
    title: "Beta",
    category: "Action",
    genre: "Action, Thriller",
    country: "Canada",
    year: "2025",
    premium: true,
  }),
  stub({ id: "c", title: "Gamma", category: "Comedy", kind: "movie", episodes: 1 }),
  stub({ id: "d", title: "Delta", category: "Romance", year: "2017" }),
];

/** Semua alamat /discover yang tertulis di HTML, sudah dibersihkan dari escape. */
function alamatDiHtml(html: string): string[] {
  const hrefs = [...html.matchAll(/href="(\/discover[^"]*)"/g)].map((m) =>
    m[1].replace(/&amp;/g, "&"),
  );
  return [...new Set(hrefs)];
}

function jumlahHasil(href: string): number {
  return filterDariUrl(KATALOG, new URLSearchParams(href.split("?")[1] ?? ""))
    .length;
}

describe("chip strip & menu yang SUNGGUHAN digambar halaman", () => {
  const halaman: [string, string][] = [
    [
      "/discover",
      renderToStaticMarkup(createElement(DramaBrowser, { dramas: KATALOG })),
    ],
    [
      "/ (halaman depan)",
      renderToStaticMarkup(
        createElement(PublicTopBars, {
          genres: ["Action", "Romance", "Comedy"],
          menus: buildNavMenus(KATALOG),
          shortcuts: catalogShortcuts(KATALOG),
        }),
      ),
    ],
  ];

  for (const [nama, html] of halaman) {
    it(`${nama}: tiap alamat yang digambar memulangkan minimal satu judul`, () => {
      const alamat = alamatDiHtml(html);
      // Pagar terhadap tes yang lulus karena tak menemukan apa-apa.
      expect(alamat.length).toBeGreaterThan(10);
      for (const href of alamat) {
        expect(jumlahHasil(href), `${href} memulangkan nol judul`).toBeGreaterThan(
          0,
        );
      }
    });
  }

  it("/discover TIDAK menggambar kategori yang nol judul", () => {
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    // "Fantasy" & "Harem" ada di daftar tetap CATEGORIES tapi nol judul di
    // katalog ini. Sampai 2026-09-21 halaman ini memajang keduanya, dan diklik
    // = halaman hampa.
    expect(html).not.toContain(">Fantasy<");
    expect(html).not.toContain(">Harem<");
    // Yang berisi tetap digambar — pagar supaya tes di atas tidak lulus hanya
    // karena stripnya kosong.
    expect(html).toContain(">Action<");
    expect(html).toContain(">Romance<");
  });

  it("strip memajang negara berbahasa Indonesia, tahun, dan Terpopuler", () => {
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    // Inilah bentuk yang diminta owner dari situs katalog pembanding.
    expect(html).toContain(">Cina<");
    expect(html).toContain(">Amerika<");
    expect(html).toContain(">2026<");
    expect(html).toContain(">2025<");
    expect(html).toContain(">Terpopuler<");
    // Genre sinema OMDb yang belum jadi kategori kurasi.
    expect(html).toContain(">Horror<");
    expect(html).toContain(">Sci-Fi<");
    // Alamatnya memakai nilai ASLI katalog, bukan labelnya.
    expect(html).toContain("/discover?negara=China");
    expect(html).not.toContain("negara=Cina");
  });
});
