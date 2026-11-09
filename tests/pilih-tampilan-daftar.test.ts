// Penjaga saklar "petak / baris" (owner 2026-11-09: "bisa tidak ini ada
// pilihan mau kita lihat sebagai list saja atau seperti yang sekarang").
//
// Yang dikunci di sini adalah hal-hal yang gagal SENYAP: tombol yang tergambar
// tapi tidak menandai mana yang aktif, dan pilihan yang tidak bisa dibaca
// pembaca layar. Keduanya tidak menghasilkan error apa pun.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { default: PilihTampilanDaftar } = await import(
  "../app/components/admin/PilihTampilanDaftar"
);

function render(nilai: "petak" | "baris"): string {
  return renderToStaticMarkup(
    createElement(PilihTampilanDaftar, { nilai, onNilai: () => {} }),
  );
}

describe("PilihTampilanDaftar — saklar bentuk tampilan", () => {
  it("menggambar DUA pilihan, bukan satu tombol yang berganti ikon", () => {
    // Satu tombol bergantian ("klik untuk ubah") menyembunyikan pilihan yang
    // tersedia — admin harus menebak apa yang terjadi sebelum mengklik.
    const html = render("petak");
    expect((html.match(/<button/g) ?? []).length).toBe(2);
  });

  it("menandai pilihan yang sedang aktif lewat aria-pressed", () => {
    // Warna saja tidak terbaca pembaca layar, dan tanpa penanda ini saklarnya
    // tidak punya keadaan sama sekali — cuma dua tombol yang terlihat sama.
    const petak = render("petak");
    expect(petak).toContain('aria-pressed="true"');
    expect((petak.match(/aria-pressed="true"/g) ?? []).length).toBe(1);

    const baris = render("baris");
    expect((baris.match(/aria-pressed="true"/g) ?? []).length).toBe(1);
    // Dua bentuk harus menghasilkan HTML BERBEDA — kalau sama, saklarnya
    // tergambar tapi tidak berfungsi.
    expect(baris).not.toBe(petak);
  });

  it("tiap tombol punya nama yang bisa dibaca, bukan ikon telanjang", () => {
    const html = render("petak");
    expect(html).toContain("Tampilan petak");
    expect(html).toContain("Tampilan baris");
  });

  it("seluruh grup diberi nama", () => {
    expect(render("petak")).toContain("Bentuk tampilan daftar");
  });
});
