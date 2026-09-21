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
import {
  FILTER_KOSONG,
  bacaFilter,
  filterDariUrl,
  type CatalogFilter,
} from "../lib/discover";
import { STRIP_KATALOG, buildNavMenus } from "../lib/nav-katalog";
import type { Drama } from "../lib/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/discover",
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
        createElement(PublicTopBars, { menus: buildNavMenus(KATALOG) }),
      ),
    ],
  ];

  for (const [nama, html] of halaman) {
    it(`${nama}: menggambar seluruh chip strip milik owner`, () => {
      const alamat = new Set(alamatDiHtml(html));
      for (const chip of STRIP_KATALOG) {
        expect(
          alamat.has(chip.href),
          `chip ${chip.label} (${chip.href}) tidak tergambar di ${nama}`,
        ).toBe(true);
      }
    });

    it(`${nama}: tiap alamat yang digambar benar-benar MENYARING`, () => {
      // Aturan yang dijaga di sini BUKAN "harus berisi" — sebagian chip
      // memang belum ada judulnya (keputusan owner 2026-09-21). Yang dijaga:
      // alamatnya harus dikenali `bacaFilter`. Nama parameter yang salah tulis
      // diabaikan DIAM-DIAM, dan chip-nya lalu menampilkan SELURUH katalog
      // seolah penyaringnya bekerja — jauh lebih menyesatkan daripada kosong.
      const alamat = alamatDiHtml(html);
      // Pagar terhadap tes yang lulus karena tak menemukan apa-apa.
      expect(alamat.length).toBeGreaterThanOrEqual(STRIP_KATALOG.length);
      for (const href of alamat) {
        const f = bacaFilter(new URLSearchParams(href.split("?")[1] ?? ""));
        const berubah = (Object.keys(FILTER_KOSONG) as (keyof CatalogFilter)[])
          .filter((k) => f[k] !== FILTER_KOSONG[k]);
        expect(
          berubah.length,
          `${href} tidak mengubah penyaring apa pun — nama parameternya ` +
            `kemungkinan salah tulis`,
        ).toBeGreaterThan(0);
      }
    });
  }

  it("bar cari sudah TIDAK memuat dropdown penyaring", () => {
    // Keluhan owner 2026-09-21: bar cari terlalu ramai. Keempat dropdown
    // (genre · urutan · tahun · rating) dilepas; penggantinya menu dropdown di
    // bar yang sama + strip kuning, yang semuanya melempar ke /discover.
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    for (const hilang of [
      "Semua genre",
      "Semua tahun",
      "Semua rating",
      "Terbaru ditambah",
    ]) {
      expect(html, `dropdown "${hilang}" seharusnya sudah dilepas`).not.toContain(
        hilang,
      );
    }
  });

  it("bar cari memasang tombol menu halaman pengganti navbar", () => {
    // Navbar hitam disembunyikan di halaman ini, jadi tombol inilah satu-satunya
    // jalan ke Discover/Playly/Admin/Keluar di layar komputer.
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    expect(html).toContain('aria-label="Menu halaman"');
    expect(html).toContain('alt="DramaKu"');
  });

  it("kotak cari memanjang, tidak lagi dipatok 28rem", () => {
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    expect(html).toContain("md:flex-1");
    expect(html).not.toContain("md:max-w-md");
  });

  it("kotak cari memakai tulisan pendek yang diminta owner", () => {
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    expect(html).toContain('placeholder="Cari film di DramaKu"');
    // Kotak carinya tetap kotak cari sungguhan, bukan hiasan.
    expect(html).toContain('role="search"');
    expect(html).toContain('type="search"');
  });

  it("menggambar keenam tombol menu dengan tulisan yang ditentukan owner", () => {
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    // Hanya TOMBOL-nya yang ada di HTML — isi dropdown Radix baru dirender
    // saat menunya dibuka, jadi isinya dijaga di tests/nav-katalog.test.ts.
    for (const label of ["Genre", "Series", "Populer", "Negara", "Tahun", "+ More"]) {
      expect(html, `tombol menu "${label}" tidak tergambar`).toContain(
        `>${label}<`,
      );
    }
    expect(html).not.toContain(">Jenis<");
    expect(html).not.toContain(">Lainnya<");
  });

  it("strip TIDAK lagi memajang negara & pintasan yang tak diminta owner", () => {
    // Keluhan owner 2026-09-21: "terlalu banyak tulisan dan negara lainnya".
    // Sebelumnya strip dihitung dari katalog dan tumbuh jadi 29 chip.
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    for (const hilang of [
      ">Amerika<",
      ">Kanada<",
      ">Inggris<",
      ">Jerman<",
      ">Selandia Baru<",
      ">Adventure<",
      ">Thriller<",
      ">Jelajah<",
      ">Gratis<",
    ]) {
      expect(html, `${hilang} seharusnya sudah tidak ada di strip`).not.toContain(
        hilang,
      );
    }
    // Pagar supaya tes di atas tidak lulus hanya karena stripnya kosong.
    expect(html).toContain(">Cina<");
    expect(html).toContain(">Terpopuler<");
  });

  it("chip yang katalognya berisi memulangkan judul, yang kosong memulangkan NOL", () => {
    // Bedanya "belum ada isinya" (jujur) dengan "penyaring diabaikan"
    // (menyesatkan): yang kedua memulangkan seluruh katalog.
    expect(jumlahHasil("/discover?cat=Action")).toBeGreaterThan(0);
    expect(jumlahHasil("/discover?genre=Horror")).toBeGreaterThan(0);
    expect(jumlahHasil("/discover?negara=China")).toBeGreaterThan(0);
    expect(jumlahHasil("/discover?negara=Japan")).toBe(0);
    expect(jumlahHasil("/discover?genre=Animation")).toBe(0);
  });

  it("strip memajang label Indonesia tapi alamatnya ejaan OMDb", () => {
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    expect(html).toContain(">Cina<");
    expect(html).toContain(">Jepang<");
    expect(html).toContain(">Komedi<");
    expect(html).toContain("/discover?negara=China");
    expect(html).toContain("/discover?negara=Japan");
    // Label TIDAK boleh ikut masuk ke alamat.
    expect(html).not.toContain("negara=Cina");
    expect(html).not.toContain("negara=Jepang");
    expect(html).not.toContain("cat=Komedi");
  });
});
