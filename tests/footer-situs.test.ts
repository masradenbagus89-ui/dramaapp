// Penjaga KAKI SITUS halaman depan (owner 2026-10-10): empat kolom — tentang,
// jelajahi, genre populer, disclaimer.
//
// Yang dijaga di sini bukan "ada footer"-nya, melainkan dua hal yang kalau
// salah merusak DIAM-DIAM:
//   - genre diambil dari katalog NYATA. Daftar genre tetap akan memajang
//     kategori kosong; penonton mengkliknya lalu mendapat halaman hampa dan
//     menyimpulkan situsnya rusak.
//   - katalog kosong -> kolom genre TIDAK digambar, bukan digambar kosong.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FooterSitus from "../app/components/beranda/FooterSitus";

const render = (genres: string[]) =>
  renderToStaticMarkup(createElement(FooterSitus, { genres }));

describe("kaki situs halaman depan", () => {
  it("memuat keempat kolom yang diminta owner", () => {
    const html = render(["Action", "Romance"]);

    expect(html).toContain("Tentang DramaKu");
    expect(html).toContain("Jelajahi");
    expect(html).toContain("Genre Populer");
    expect(html).toContain("Disclaimer");
  });

  it("kolom Jelajahi menunjuk halaman yang memang ada", () => {
    const html = render(["Action"]);

    expect(html).toContain('href="/film"');
    expect(html).toContain('href="/katalog?tab=update"');
    expect(html).toContain('href="/katalog?tab=terpopuler"');
    expect(html).toContain('href="/katalog?tab=rekomendasi"');
    expect(html).toContain('href="/discover"');
  });

  it("genre diambil dari katalog nyata & jadi tautan penyaring", () => {
    const html = render(["Action", "Romance"]);

    expect(html).toContain('href="/discover?cat=Action"');
    expect(html).toContain('href="/discover?cat=Romance"');
  });

  it("genre dengan spasi/karakter khusus tetap jadi alamat yang sah", () => {
    const html = render(["Sci-Fi & Fantasy"]);

    expect(html).toContain("cat=Sci-Fi%20%26%20Fantasy");
  });

  it("memajang maksimal 6 genre — sisanya tidak menenggelamkan kolom lain", () => {
    const banyak = Array.from({ length: 12 }, (_, i) => `Genre${i}`);
    const html = render(banyak);

    expect(html).toContain("Genre0");
    expect(html).toContain("Genre5");
    expect(html).not.toContain("Genre6");
  });

  it("katalog kosong: kolom genre hilang, tiga kolom lain tetap utuh", () => {
    const html = render([]);

    expect(html).not.toContain("Genre Populer");
    expect(html).toContain("Tentang DramaKu");
    expect(html).toContain("Disclaimer");
  });

  it('tidak lagi menyebut situs ini "Prototype"', () => {
    // Label lama dari kaki situs sebelumnya. Situs sudah tayang & dipakai
    // penonton sungguhan, jadi kata itu menyesatkan.
    expect(render(["Action"])).not.toContain("Prototype");
  });
});
