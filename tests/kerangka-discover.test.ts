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
  action?: string;
  namaKolom?: string;
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

// Nilai kedua konstanta ini WAJIB ditulis tangan di sini (modulnya di-mock),
// jadi keduanya dipatok di tests/kepala-situs.test.ts supaya tiruan ini tak
// bisa diam-diam berbeda dari aslinya.
vi.mock("../app/components/beranda/SearchBar", () => ({
  default: (props: unknown) => {
    tertangkap.props = props;
    return null;
  },
  TEKS_KOTAK_CARI: "Cari film di DramaKu",
  KELAS_MENEMPEL_KEPALA: "sticky top-0",
}));

const { default: KerangkaKepalaKatalog } = await import(
  "../app/components/beranda/KerangkaKepalaKatalog"
);
const { KELAS_MENEMPEL_KEPALA } = await import(
  "../app/components/beranda/SearchBar"
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

  it("memakai posisi menempel dari KONSTANTA bersama, bukan teks sendiri", () => {
    // ⚠️ Versi pertama tes ini mengadu `className` dengan string tulis-tangan
    // "sticky top-0" — jadi ia lulus walau kepala aslinya memakai nilai lain,
    // dan namanya ("SAMA dengan kepala aslinya") berbohong. Sekarang yang
    // diadu adalah nilai konstantanya, DAN berkas pemakainya diperiksa di
    // tests/kepala-situs.test.ts ("posisi menempel punya SATU sumber").
    expect(render().className).toBe(KELAS_MENEMPEL_KEPALA);
  });

  it("memakai susunan kepala bersama, bukan susunan sendiri", () => {
    // chromeKatalog() memasang logo + menu garis-tiga + tombol akun.
    const chrome = render().chrome;
    expect(chrome).toBeTruthy();
    expect(chrome?.brand).toBeTruthy();
    expect(chrome?.menus).toBeTruthy();
  });
});

// ===========================================================================
// PENJAGA 2026-09-22 (putaran kedua) — kotak cari kerangka BERFUNGSI TANPA
// JavaScript. Ini yang paling penting, dan versi pertama komponen ini SALAH.
//
// Kerangka ini HANYA terlihat di jendela sebelum JavaScript aktif. Di jendela
// itu React belum memasang satu pun penangan, jadi `onSubmit` DIAM — dan tanpa
// `action` di form + `name` di kotaknya, menekan Enter menjalankan pengiriman
// form bawaan browser yang cuma memuat ulang halaman dan MENGHILANGKAN ketikan
// penonton. Komentar versi pertama mengaku kotaknya "sengaja dibuat berfungsi"
// padahal justru mati tepat di jendela ia dipakai.
// ===========================================================================
describe("kotak cari kerangka berfungsi tanpa JavaScript", () => {
  it("form membawa action ke halaman hasil pencarian", () => {
    expect(
      render().action,
      "tanpa action, Enter sebelum JavaScript aktif cuma memuat ulang " +
        "halaman dan ketikan penonton hilang tanpa jejak",
    ).toBe("/discover");
  });

  it("kotaknya membawa name, tanpa itu ketikan tidak ikut terkirim", () => {
    // Form boleh punya action, tapi kalau kotaknya tak bernama, browser tidak
    // menyertakan isinya — hasilnya /discover TANPA kata kunci: terlihat
    // "jalan" padahal pencariannya hilang. Justru lebih menyesatkan.
    expect(render().namaKolom).toBe("q");
  });

  it("nama kolomnya sama dengan yang dibaca halaman hasil", () => {
    // `alamatCari()` menulis `?q=`, jadi kolomnya WAJIB bernama `q` — kalau
    // beda, jalur tanpa-JavaScript dan jalur ber-JavaScript mendarat berbeda.
    const { namaKolom, action } = render();
    expect(`${action}?${namaKolom}=naga`).toBe("/discover?q=naga");
  });
});
