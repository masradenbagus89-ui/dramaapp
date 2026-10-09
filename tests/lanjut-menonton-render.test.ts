// @vitest-environment jsdom
//
// Penjaga bar "Lanjutkan Menonton" — pintu akun TUNGGAL di halaman depan
// (owner 2026-10-09, mencontoh situs katalog pembanding).
//
// Kenapa perlu dijaga mesin, bukan cukup dilihat sekali: yang dijanjikan ke
// owner adalah PERILAKU "tertutup dulu, terbuka saat diklik". Perilaku itu
// hidup di state React, jadi screenshot maupun `next build` TIDAK bisa
// membuktikannya — keduanya tetap hijau walau tombolnya mati total.
//
// Diuji DUA ARAH dengan sengaja (pelajaran yang sudah kambuh tiga kali di repo
// ini, lihat tests/menu-akun-render.test.ts): tes "tautan login tidak muncul"
// sendirian TIDAK bisa dibedakan dari "komponennya kosong melompong". Pasangan
// sebelum/sesudah klik-lah yang membuat penghapusan isi langsung MERAH.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";

const { default: LanjutMenonton } = await import(
  "../app/components/beranda/LanjutMenonton"
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const tautanAkun = () =>
  Array.from(container.querySelectorAll("a"))
    .map((a) => a.getAttribute("href"))
    .filter((href): href is string => href === "/login" || href === "/daftar");

const tombolPembuka = () => {
  const el = container.querySelector("button");
  if (!el) throw new Error("tombol 'Lanjutkan Menonton' tidak tergambar");
  return el;
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(h(LanjutMenonton)));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("bar Lanjutkan Menonton", () => {
  it("menggambar tombolnya, tapi MENUTUP tautan akun sebelum diklik", () => {
    expect(tombolPembuka().textContent).toContain("Lanjutkan Menonton");
    expect(tombolPembuka().getAttribute("aria-expanded")).toBe("false");
    expect(tautanAkun()).toEqual([]);
  });

  it("memunculkan Masuk + Daftar sesudah diklik", () => {
    act(() => tombolPembuka().click());

    expect(tombolPembuka().getAttribute("aria-expanded")).toBe("true");
    // Urutan tidak diikat — yang dijanjikan ke owner adalah KEDUA pintu ada.
    expect(tautanAkun().sort()).toEqual(["/daftar", "/login"]);
  });

  it("menutup lagi saat diklik kedua kali", () => {
    act(() => tombolPembuka().click());
    act(() => tombolPembuka().click());

    expect(tombolPembuka().getAttribute("aria-expanded")).toBe("false");
    expect(tautanAkun()).toEqual([]);
  });
});
