// @vitest-environment jsdom
//
// Penjaga KESERAGAMAN tombol "Kembali" (owner 2026-11-07: "kamu seragamkan lah
// kembali nya juga").
//
// Aturannya: setiap halaman yang dibuka DARI MENU AKUN wajib punya tombol
// Kembali di pojok kanan atas. Halaman katalog utama (Beranda, Film, Katalog)
// sengaja TIDAK ikut — itu tujuan utama di navbar, bukan sub-halaman; tombol
// "kembali" di sana tidak punya makna yang jelas.
//
// 🪤 KENAPA DAFTARNYA DITURUNKAN DARI `TUJUAN_AKUN`, BUKAN DITULIS TANGAN:
// kalau suatu saat ada menu akun BARU, daftar tulis-tangan akan tetap hijau
// sementara halaman barunya lahir tanpa tombol Kembali — persis bentuk
// "seragam" yang diam-diam berhenti seragam. Dengan diturunkan, menu baru
// membuat tes ini MERAH sampai seseorang memutuskan: pasang tombolnya, atau
// kecualikan dengan alasan tertulis.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: () => {}, push: () => {}, replace: () => {}, refresh: () => {} }),
}));

import { TUJUAN_AKUN } from "../app/components/MenuAkun";
import ProfilePage from "../app/profile/page";
import HistoryPage from "../app/history/page";
import MyListPage from "../app/my-list/page";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Peta alamat menu akun -> komponen halamannya.
 *
 * `/admin` sengaja dikecualikan: panel admin punya jalan pulangnya sendiri
 * ("← Kembali ke web" di sidebar, AdminSidebar.tsx), jadi memasang tombol
 * kedua di sana justru dua jalan untuk hal yang sama.
 */
const HALAMAN_AKUN: Record<string, () => React.ReactNode> = {
  "/profile": ProfilePage,
  "/history": HistoryPage,
  "/my-list": MyListPage,
};
const DIKECUALIKAN = ["/admin"];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  window.localStorage.clear();

  // jsdom tidak punya ResizeObserver; komponen Radix di /profile memakainya.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => [] })),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

const tombolKembali = () =>
  Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Kembali"),
  );

describe("tombol Kembali seragam di halaman menu akun", () => {
  it("tiap tujuan menu akun punya halaman yang diperiksa di sini", () => {
    // Inilah yang membuat penjaga ini tidak bisa ketinggalan zaman diam-diam.
    const perluDicek = TUJUAN_AKUN.map((t) => t.href).filter(
      (href) => !DIKECUALIKAN.includes(href),
    );
    for (const href of perluDicek) {
      expect(
        Object.keys(HALAMAN_AKUN),
        `menu akun "${href}" belum terdaftar di HALAMAN_AKUN — pasang tombol ` +
          `Kembali di halamannya, atau kecualikan dengan alasan tertulis`,
      ).toContain(href);
    }
  });

  for (const [alamat, Halaman] of Object.entries(HALAMAN_AKUN)) {
    it(`${alamat} punya tombol Kembali`, async () => {
      await act(async () => {
        root.render(h(Halaman));
      });
      expect(
        tombolKembali(),
        `${alamat} kehilangan tombol Kembali — ketiga halaman menu akun ` +
          `harus seragam, kalau tidak penonton menebak-nebak halaman mana ` +
          `yang punya jalan pulang`,
      ).toBeTruthy();
    });
  }

  it("/profile memberi tombol Kembali juga kepada TAMU", async () => {
    // Tamu justru yang paling butuh: ia tidak punya pengaturan untuk dilihat,
    // jadi tanpa tombol ini satu-satunya jalannya tombol back browser.
    await act(async () => {
      root.render(h(ProfilePage));
    });
    expect(tombolKembali()).toBeTruthy();
  });
});
