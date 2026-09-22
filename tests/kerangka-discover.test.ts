// Penjaga: kotak cari di KERANGKA kepala /discover benar-benar TERSAMBUNG.
//
// Kenapa berkas terpisah: satu-satunya cara membuktikan sebuah penangan
// (handler) benar-benar dipasang adalah MENANGKAP props yang diterima
// `SearchBar`, dan itu menuntut `SearchBar` di-mock. Di
// tests/strip-katalog.test.ts komponen itu harus tetap ASLI (di sana yang
// diuji HTML yang sungguhan tergambar), jadi kedua kebutuhan itu tak bisa
// tinggal di satu berkas.
//
// Kenapa dijaga sama sekali: kerangka ini menggambar kotak cari sebelum
// halaman aktif. Kotak yang TERGAMBAR TAPI DIAM lebih membingungkan penonton
// daripada tulisan "Memuat..." yang jujur — ketikan hilang tanpa satu pun
// tanda. Pelajaran langsung dari sesi 2026-09-22: penjaga versi pertama cuma
// memeriksa ada `<form>` di HTML, dan itu LOLOS saat penanganya dilepas,
// sebab `SearchBar` menggambar `<form>` tanpa peduli tersambung atau tidak.
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Bentuk props yang diperiksa. Ditulis eksplisit — bukan disimpulkan otomatis
 * — karena tipe hasil `vi.hoisted` menyempit jadi `null` dan membuat setiap
 * pembacaan field di bawah gagal `tsc` (TS2339) walau tesnya sendiri hijau.
 */
type PropsSearchBar = {
  value?: string;
  onValueChange?: (nilai: string) => void;
  onSubmit?: () => void;
  className?: string;
  chrome?: { brand?: unknown; menus?: unknown; trailing?: unknown };
};

const alamatDidorong = vi.hoisted(() => ({ daftar: [] as string[] }));
const tertangkap = vi.hoisted(() => ({ props: null as unknown }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/discover",
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({
    push: (alamat: string) => {
      alamatDidorong.daftar.push(alamat);
    },
    replace: () => {},
  }),
}));

vi.mock("../app/components/beranda/SearchBar", () => ({
  default: (props: unknown) => {
    tertangkap.props = props;
    return null;
  },
  TEKS_KOTAK_CARI: "Cari film di DramaKu",
}));

const { default: KerangkaKepalaKatalog } = await import(
  "../app/components/beranda/KerangkaKepalaKatalog"
);

/** Render kerangkanya lalu pulangkan props yang benar-benar diterima SearchBar. */
function render(): PropsSearchBar {
  tertangkap.props = null;
  alamatDidorong.daftar = [];
  renderToStaticMarkup(createElement(KerangkaKepalaKatalog, { menus: [] }));
  if (!tertangkap.props) throw new Error("SearchBar tidak dirender kerangka");
  return tertangkap.props as PropsSearchBar;
}

describe("kotak cari kerangka /discover", () => {
  it("menerima penangan ketikan, bukan nilai mati", () => {
    expect(typeof render().onValueChange).toBe("function");
  });

  it("menerima penangan kirim (tombol cari / Enter)", () => {
    // Inilah yang LOLOS dari penjaga versi pertama.
    expect(typeof render().onSubmit).toBe("function");
  });

  it("penangan kirimnya SUNGGUH melempar ke /discover", () => {
    // Bukan cuma "ada fungsinya" — fungsinya dijalankan dan hasilnya diperiksa.
    const props = render();
    props.onSubmit?.();
    expect(alamatDidorong.daftar).toEqual(["/discover"]);
  });

  it("memakai posisi menempel yang SAMA dengan kepala aslinya", () => {
    // Beda posisi menempel = bar bergeser saat isi halaman masuk.
    expect(render().className).toBe("sticky top-0");
  });

  it("memakai susunan kepala bersama, bukan susunan sendiri", () => {
    // chromeKatalog() memasang logo + menu garis-tiga + tombol akun.
    const chrome = render().chrome;
    expect(chrome).toBeTruthy();
    expect(chrome?.brand).toBeTruthy();
    expect(chrome?.menus).toBeTruthy();
  });
});
