// @vitest-environment jsdom
//
// Penjaga untuk halaman Favorit (/my-list) + TombolKembali, dipasang
// 2026-11-07 atas dua permintaan owner:
//   1. "ketika klik pavorit yang kluar daftar saya, kamu sinkronkan agar sama"
//   2. "tambahkan juga kembali di kanan atas"
//
// Dua hal yang dijaga di sini, keduanya rusak SENYAP kalau dilanggar:
//
//   A. NAMA. Menu akun berbunyi "Favorit", tombol di tiap kartu drama berbunyi
//      "Tambah Favorit"/"Dalam Favorit", tapi judul halamannya dulu berbunyi
//      "Daftar Saya". Nol error — yang terjadi penonton mengklik "Favorit"
//      lalu mendarat di halaman bernama lain dan mengira salah halaman.
//
//   B. TOMBOL KEMBALI. `router.back()` polos membawa penonton KELUAR dari situs
//      kalau ia mendarat langsung (hasil Google / alamat diketik / tautan
//      dibagikan) — riwayat browsernya tidak berisi halaman kita. Tombol
//      bernama "Kembali" yang melempar orang ke Google terbaca seperti situs
//      rusak, dan yang kena justru pengunjung BARU: orang yang paling tidak
//      akan melaporkannya.
//
// JSX sengaja tidak dipakai (createElement langsung) supaya berkas ini tetap
// .ts dan cocok dengan `include` di vitest.config.ts.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";

const mundur = vi.fn();
const dorong = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mundur, push: dorong, replace: () => {}, refresh: () => {} }),
}));

import MyListPage from "../app/my-list/page";
import TombolKembali from "../app/components/TombolKembali";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

/** `document.referrer` hanya bisa dibaca; di tes ia ditimpa lewat defineProperty. */
function setAsal(nilai: string) {
  Object.defineProperty(document, "referrer", {
    configurable: true,
    get: () => nilai,
  });
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  mundur.mockClear();
  dorong.mockClear();
  setAsal("");
  window.localStorage.clear();

  // Halaman ini menjemput katalog saat dipasang; balasan kosong yang SAH sudah
  // cukup karena yang diuji kepala halamannya, bukan isi daftarnya.
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

async function render(el: React.ReactElement) {
  await act(async () => {
    root.render(el);
  });
}

const teks = () => container.textContent ?? "";

const tombolKembali = () =>
  Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Kembali"),
  );

function klik(el: Element | null | undefined) {
  if (!el) throw new Error("Tombol Kembali tidak ditemukan.");
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("halaman Favorit — nama harus SAMA dengan menunya", () => {
  it('judulnya "Favorit", BUKAN "Daftar Saya"', async () => {
    // Satu konsep = satu nama (AGENTS.md §3.3). Nama lama dijaga secara
    // eksplisit supaya tidak "dikembalikan" oleh siapa pun yang mengira
    // "Daftar Saya" lebih enak dibaca — enak dibaca tapi tidak cocok dengan
    // menu yang baru saja diklik penonton.
    await render(h(MyListPage));

    expect(teks()).toContain("Favorit");
    expect(teks()).not.toContain("Daftar Saya");
  });

  it("keadaan kosong ikut memakai kata yang sama", async () => {
    // "Daftar Anda masih kosong" di halaman bernama Favorit = konsep ketiga
    // muncul lagi lewat pintu belakang.
    await render(h(MyListPage));

    expect(teks()).toContain("Belum ada drama favorit");
  });

  it("punya tombol Kembali di kepala halaman", async () => {
    await render(h(MyListPage));
    expect(tombolKembali()).toBeTruthy();
  });
});

describe("TombolKembali — tidak boleh melempar orang KELUAR situs", () => {
  it("mundur satu langkah kalau datang dari halaman situs ini", async () => {
    setAsal(`${window.location.origin}/beranda`);
    await render(h(TombolKembali));

    klik(tombolKembali());

    expect(mundur).toHaveBeenCalledTimes(1);
    expect(dorong).not.toHaveBeenCalled();
  });

  it("PULANG ke beranda kalau penonton mendarat langsung (riwayat kosong)", async () => {
    // Inilah kerusakan senyapnya: dengan router.back() polos, penonton yang
    // datang dari hasil Google akan dilempar KEMBALI ke Google.
    setAsal("");
    await render(h(TombolKembali));

    klik(tombolKembali());

    expect(mundur).not.toHaveBeenCalled();
    expect(dorong).toHaveBeenCalledWith("/beranda");
  });

  it("PULANG ke beranda kalau datang dari situs LAIN", async () => {
    setAsal("https://www.google.com/search?q=dramaku");
    await render(h(TombolKembali));

    klik(tombolKembali());

    expect(mundur).not.toHaveBeenCalled();
    expect(dorong).toHaveBeenCalledWith("/beranda");
  });

  it("referrer yang tak bisa diurai diperlakukan seperti dari luar (gagal-aman)", async () => {
    setAsal("bukan-url-sama-sekali");
    await render(h(TombolKembali));

    klik(tombolKembali());

    expect(mundur).not.toHaveBeenCalled();
    expect(dorong).toHaveBeenCalledWith("/beranda");
  });

  it("tujuan cadangan bisa diganti pemanggil", async () => {
    setAsal("");
    await render(h(TombolKembali, { tujuanCadangan: "/film" }));

    klik(tombolKembali());

    expect(dorong).toHaveBeenCalledWith("/film");
  });
});
