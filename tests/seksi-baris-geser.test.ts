// Penjaga bentuk SEKSI HALAMAN DEPAN (owner 2026-10-10 sore): satu baris
// poster yang bisa digeser, panah di kedua ujungnya, tombol "Semua" di bawah.
//
// ⚠️ KENAPA DITES, bukan cukup dilihat: ketiganya kerusakan SENYAP. Panah yang
// hilang, tombol yang balik ke kanan judul, atau tulisan yang berganti lagi
// TIDAK memunculkan error apa pun — halamannya tetap tampil, cuma kembali ke
// bentuk yang sudah ditolak owner. Bentuk seksi ini sudah berganti TIGA kali
// dalam dua hari; tes inilah yang menahannya supaya tidak berputar lagi.
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

describe("seksi halaman depan — baris geser + panah + tombol Semua", () => {
  it("punya panah geser di KEDUA ujung", () => {
    const html = render(20);

    expect(html).toContain('aria-label="Geser ke kiri"');
    expect(html).toContain('aria-label="Geser ke kanan"');
  });

  it("panahnya SELALU terlihat, bukan cuma saat kursor lewat", () => {
    // `opacity-0` = panah tersembunyi sampai di-hover. Di seksi yang padat
    // poster itu sama saja dengan tidak ada petunjuk bisa digeser.
    const html = render(20);

    expect(html).toContain("opacity-90");
    // Pola panah-tersembunyi milik baris unggulan. Dicek pola spesifiknya,
    // bukan "opacity-0" mentah: kartu poster punya lapisan hover sendiri yang
    // memang memakai opacity-0, dan itu bukan panah.
    expect(html).not.toContain("group-hover/geser:opacity-100");
  });

  it("barisnya memang bisa digeser, bukan dipotong", () => {
    const html = render(20);

    expect(html).toContain("overflow-x-auto");
    // Pemotong baris lama (`grid-baris-penuh`) sudah dibuang — dengan baris
    // geser tak ada lagi poster yang disembunyikan dari tombol Tab.
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
