// @vitest-environment jsdom
//
// Penjaga RENDER menu akun: avatarnya benar-benar tergambar untuk penonton yang
// sudah login, dan DIAM untuk yang belum.
//
// Kenapa dua arah, bukan cuma "diam saat belum login": tes berbentuk "X tidak
// muncul" TIDAK bisa dibedakan dari "X tak pernah ada" — pelajaran 2026-09-23,
// yang di repo ini sudah kambuh tiga kali di berkas berbeda. Tanpa pasangan
// pembandingnya, menghapus seluruh isi MenuAkun akan lulus hijau.
//
// Isi dropdown-nya sendiri sengaja TIDAK diuji di sini: Radix baru merendernya
// saat menu dibuka lewat pointer event yang tak dipunyai jsdom. Alamat & aturan
// perannya dijaga dari daftarnya di tests/menu-akun.test.ts.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";

// Tanpa ini `useRouter()` melempar "invariant expected app router to be
// mounted" — komponen Next yang dirender di luar aplikasi tidak punya router.
// Yang gagal adalah perkakas tesnya, bukan kode yang sedang diuji.
vi.mock("next/navigation", () => ({
  usePathname: () => "/drama/contoh",
  useRouter: () => ({ push: () => {}, replace: () => {} }),
}));

const { default: MenuAkun } = await import("../app/components/MenuAkun");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  // `usePenonton` memanggil /api/admins lewat fetch untuk mengecek apakah akun
  // ini sudah diangkat jadi admin. Dibalas "bukan admin" supaya yang diuji
  // komponennya, bukan jaringan tesnya.
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ admins: [] }) }),
    ),
  );
  window.localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const masuk = (nama: string, role: "admin" | "viewer" = "viewer") =>
  window.localStorage.setItem(
    "dramaku:user",
    JSON.stringify({ name: nama, email: `${nama}@contoh.id`, role }),
  );

describe("MenuAkun", () => {
  it("DIAM untuk pengunjung yang belum login", () => {
    act(() => root.render(h(MenuAkun)));
    expect(
      container.innerHTML,
      "avatar tergambar untuk pengunjung yang belum punya akun — " +
        "jalan Masuk/Daftar sudah disediakan kepala situsnya masing-masing",
    ).toBe("");
  });

  it("menggambar avatar + nama untuk penonton yang sudah login", () => {
    masuk("yuli22");
    act(() => root.render(h(MenuAkun)));

    const tombol = container.querySelector('[aria-label="Menu akun"]');
    expect(
      tombol,
      "tombol menu akun tidak tergambar padahal penonton sudah login — " +
        "di layar komputer inilah satu-satunya jalan ke halaman Profil",
    ).not.toBeNull();
    expect(container.textContent).toContain("yuli22");
    // Huruf pertama nama jadi isi avatar; tanpa ini lingkarannya kosong dan
    // terbaca seperti gambar yang gagal dimuat.
    expect(container.textContent).toContain("Y");
  });

  it("nama akun apa pun ikut tergambar, bukan teks tetap", () => {
    // Pagar anti "kebetulan lulus": kalau nama dipatok di kode, tes di atas
    // tetap hijau sementara semua penonton melihat nama orang lain.
    masuk("budi");
    act(() => root.render(h(MenuAkun)));
    expect(container.textContent).toContain("budi");
    expect(container.textContent).not.toContain("yuli22");
  });
});

// ===========================================================================
// Bentuk RINGKAS — owner 2026-11-25: *"saya ingin sembunyikan tampilan profil
// yang berada di pojok kanan"*.
//
// Yang dijaga di sini BUKAN selera tampilan, melainkan dua hal yang bisa rusak
// diam-diam: (1) identitas owner bocor lagi ke bar merah /beranda tanpa ada
// yang sadar, dan (2) tombolnya ikut hilang sama sekali — padahal ia
// satu-satunya jalan ke Admin & Keluar dari halaman itu, jadi hilangnya tidak
// memunculkan error apa pun, cuma panel admin yang tak bisa dibuka.
// ===========================================================================
describe("MenuAkun bentuk ringkas (bar merah /beranda & /discover)", () => {
  it("tidak menampilkan inisial maupun nama akun", () => {
    masuk("Mas radenbagus89", "admin");
    act(() => root.render(h(MenuAkun, { pemicu: "ringkas" })));

    expect(
      container.textContent,
      "nama akun tergambar lagi di pojok kanan — justru itu yang diminta " +
        "owner disembunyikan",
    ).not.toContain("Mas radenbagus89");
    // Inisial "M" di lingkaran avatar. Diperiksa sebagai SELURUH isi teks yang
    // kosong, bukan sekadar "tidak mengandung M": huruf M bisa saja muncul dari
    // kata lain, sedangkan tombol ringkas memang tidak boleh punya teks apa pun.
    expect(
      container.textContent?.trim(),
      "tombol ringkas masih memuat teks — seharusnya ikon saja",
    ).toBe("");
  });

  it("tombolnya TETAP ada dan tetap bisa dibuka", () => {
    // Pasangan pembanding untuk tes di atas: tanpa ini, MenuAkun yang mati
    // total (tidak merender apa-apa) akan lulus hijau — dan panel admin jadi
    // tak terjangkau dari /beranda.
    masuk("Mas radenbagus89", "admin");
    act(() => root.render(h(MenuAkun, { pemicu: "ringkas" })));

    const tombol = container.querySelector('[aria-label="Menu pengelola"]');
    expect(
      tombol,
      "tombol kotak-kotak hilang — di /beranda & /discover inilah satu-satunya " +
        "jalan ke panel Admin dan tombol Keluar",
    ).not.toBeNull();
    // Pembaca layar hanya punya `aria-label` ini sebagai penanda; ikonnya
    // sendiri gambar tanpa teks.
    const ikon = tombol?.querySelector("svg");
    expect(
      ikon,
      "ikon kotak-kotak tidak tergambar — tombolnya jadi kotak kosong",
    ).not.toBeNull();

    // PEJAL, bukan bergaris. Bawaan lucide `fill="none"` menggambar kotak
    // berongga — owner menolaknya 2026-11-25 (*"terlalu tipis"*) dan memilih
    // kotak pejal dari 4 contoh. Tanpa pagar ini, siapa pun yang menyalin ikon
    // lucide lain ke sini mengembalikan bentuk yang sudah ditolak, dan tak ada
    // error yang memberi tahu.
    expect(
      ikon?.getAttribute("fill"),
      "kotak-kotaknya kembali berongga — owner memilih yang PEJAL",
    ).toBe("currentColor");
  });

  it("bentuk bawaan TETAP avatar, bukan ikut jadi ringkas", () => {
    // Kalau nilai bawaannya tergeser, navbar hitam di /profile · /admin ikut
    // kehilangan avatarnya padahal owner memilih cakupan "cuma bar merah".
    masuk("yuli22");
    act(() => root.render(h(MenuAkun)));
    expect(container.querySelector('[aria-label="Menu akun"]')).not.toBeNull();
    expect(container.textContent).toContain("yuli22");
  });
});
