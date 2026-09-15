// Penjaga BENTUK halaman /beranda: baris kategori (saat menjelajah) vs grid
// ber-paginasi (saat mencari / katalog terlalu sepi).
//
// Komponennya benar-benar DIRENDER, bukan cuma logikanya yang dites: percabangan
// hidup di JSX, dan JSX yang salah tidak menghasilkan error apa pun — cuma
// halaman yang bentuknya keliru. Tanpa tes ini kerusakannya SENYAP.
//
// Dipakai `createElement`, bukan JSX, supaya berkas tetap .ts dan ikut pola
// `tests/**/*.test.ts` yang sudah dipakai project (vitest.config.ts).
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CatalogBrowser from "../app/components/beranda/CatalogBrowser";
import { ROW_MIN_ITEMS } from "../lib/beranda-catalog";
import type { Drama } from "../lib/types";

/**
 * Drama seadanya. SENGAJA tanpa `posterImage`: dengan gambar, `Poster` memakai
 * `next/image` yang butuh runtime Next.js dan tidak bisa dirender di sini.
 */
function stub(i: number): Drama {
  return {
    id: `d${i}`,
    title: `Judul ${i}`,
    category: "Action",
    episodes: 10,
    views: "0",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
  };
}

const katalog = (n: number) => Array.from({ length: n }, (_, i) => stub(i));

describe("bentuk halaman /beranda", () => {
  it("katalog normal = BARIS KATEGORI, grid & nomor halaman tidak digambar", () => {
    const html = renderToStaticMarkup(
      createElement(CatalogBrowser, { dramas: katalog(12) }),
    );

    expect(html).toContain("Drama Terbaru");
    expect(html).toContain("Paling Banyak Ditonton");
    // Inilah yang diminta owner 2026-09-15: daftar panjang tidak lagi memenuhi
    // layar sebelum penonton mencari apa pun.
    expect(html).not.toContain("Halaman 1 dari");
  });

  it("katalog terlalu sepi untuk baris = tetap GRID, bukan halaman kosong", () => {
    // Jaring pengaman. Di bawah ROW_MIN_ITEMS tak satu pun baris kategori layak
    // digambar; tanpa cadangan grid, tengah halaman jadi kosong melompong tanpa
    // error dan terbaca seperti situs rusak.
    const html = renderToStaticMarkup(
      createElement(CatalogBrowser, { dramas: katalog(ROW_MIN_ITEMS - 1) }),
    );

    expect(html).toContain("Halaman 1 dari");
    expect(html).toContain("Judul 0");
    expect(html).not.toContain("Drama Terbaru");
  });

  it("katalog kosong tidak membuat halaman meledak", () => {
    const html = renderToStaticMarkup(
      createElement(CatalogBrowser, { dramas: [] }),
    );

    expect(html).toContain("Tidak ada judul yang cocok");
  });
});
