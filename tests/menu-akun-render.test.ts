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
