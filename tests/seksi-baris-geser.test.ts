// Penjaga bentuk SEKSI HALAMAN DEPAN (owner 2026-11-17): SATU baris poster
// yang digeser, panah di kanan (dan kiri untuk kembali). Bukan dua baris.
//
// ⚠️ KENAPA DITES, bukan cukup dilihat: balik ke dua baris, panah yang hilang,
// atau tombol "Semua" yang jatuh ke bawah barisan TIDAK memunculkan error
// apa pun — halamannya tetap tampil, cuma kembali ke bentuk yang sudah
// ditolak. Tes inilah yang menahannya.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SeksiKatalog from "../app/components/beranda/SeksiKatalog";
import type { KartuKatalog } from "../lib/beranda-video";
import type { Drama } from "../lib/types";

const drama = (i: number): Drama => ({
  id: `d${i}`,
  title: `Drama Serial ${i}`,
  category: "Action",
  episodes: 10,
  views: `${i}K`,
  synopsis: "",
  gradient: "from-zinc-800 to-black",
  year: "2025",
  imdbRating: "8.0",
});

const kartu = (jumlah: number): KartuKatalog[] =>
  Array.from({ length: jumlah }, (_, i) => ({ jenis: "drama", drama: drama(i) }));

const render = (jumlah: number) =>
  renderToStaticMarkup(
    createElement(SeksiKatalog, {
      idSeksi: "seksi-uji",
      judul: "Series Terbaru",
      keterangan: "Judul yang paling baru masuk katalog.",
      kartu: kartu(jumlah),
      hrefSemua: "/katalog",
    }),
  );

describe("seksi halaman depan — satu baris + panah kanan", () => {
  it("satu baris yang bisa digeser, bukan dua baris poster", () => {
    const html = render(20);

    expect(html).toContain("overflow-x-auto");
    expect(html).toContain('aria-label="Geser ke kanan"');
    expect(html).toContain('aria-label="Geser ke kiri"');
    expect(html).toContain("opacity-90");
    expect(html).not.toContain("grid-cols-2");
    expect(html).not.toContain("xl:grid-cols-10");
    expect(html).not.toContain("grid-baris-penuh");
  });

  it("SELURUH kartu tergambar — tidak ada yang hilang saat dipotong", () => {
    const html = render(20);

    expect(html).toContain("Drama Serial 0");
    expect(html).toContain("Drama Serial 19");
  });

  it('tombolnya bertuliskan "Semua" dan SEJAJAR judul, bukan di bawah barisan', () => {
    const html = render(20);
    const posisiJudul = html.indexOf(">Series Terbaru<");
    const posisiTombol = html.indexOf(">Semua<");
    const posisiBaris = html.indexOf("overflow-x-auto");

    // Urutannya judul -> tombol -> barisan poster. Kalau tombol jatuh SESUDAH
    // barisan, ia terseret jauh dari judulnya begitu posternya banyak — itu
    // bentuk yang sudah ditolak owner 2026-10-10 sore.
    expect(posisiTombol).toBeGreaterThan(posisiJudul);
    expect(posisiTombol).toBeLessThan(posisiBaris);
    expect(html).toContain('href="/katalog"');
    // Tulisan sementara 2026-10-10 pagi; owner mengembalikannya ke "Semua".
    expect(html).not.toContain("Lainnya");
  });

  it("seksi kosong tidak digambar sama sekali — termasuk panah & tombolnya", () => {
    const html = render(0);

    expect(html).toBe("");
  });
});
