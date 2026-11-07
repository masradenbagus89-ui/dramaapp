// @vitest-environment jsdom
//
// Penjaga untuk /profile sesudah dijadikan halaman AKUN (keputusan owner
// 2026-11-07).
//
// KENAPA BERKAS INI ADA: sampai hari ini tidak ada satu pun tes yang me-render
// halaman /profile. Itu celah yang sama persis dengan yang memakan korban di
// pemutar Playly kemarin — seluruh isi halaman bisa berubah tanpa satu tes pun
// merah. Halaman ini sekarang memuat form KEAMANAN (ubah password + 2FA), jadi
// celahnya lebih mahal daripada sekadar tata letak.
//
// Yang dijaga dua arah sekaligus: yang harus ADA, dan yang sengaja TIDAK ada.
//
// Tata letak, warna, dan urutan seksi SENGAJA tidak diuji — itu berubah sah
// tiap owner minta perapian tampilan.
//
// JSX sengaja tidak dipakai (createElement langsung) supaya berkas ini tetap
// .ts dan cocok dengan `include` di vitest.config.ts — alasan yang sama dengan
// tests/pemutar-playly-kontrol.test.ts.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";

// useRouter hanya dipakai saat logout; di tes ini cukup tiruan yang diam.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
}));

import ProfilePage from "../app/profile/page";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  window.localStorage.clear();

  // jsdom tidak menyediakan ResizeObserver, sementara komponen Radix
  // (Checkbox di form password, Avatar) memanggilnya saat dipasang. Ini
  // batasan LINGKUNGAN TES, bukan masalah kode produksi: di browser sungguhan
  // ResizeObserver selalu ada.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );

  // Beberapa anak komponen (2FA, dompet koin, kode pemulihan) menembak API
  // saat dipasang. Balasan kosong yang SAH sudah cukup: yang diuji di sini
  // susunan halamannya, bukan isi tiap panel.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    })),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

/** Tulis user ke localStorage persis seperti lib/auth menyimpannya. */
function masuk(role: "admin" | "viewer") {
  window.localStorage.setItem(
    "dramaku:user",
    JSON.stringify({ name: "Budi", email: "budi@contoh.id", role }),
  );
}

async function render() {
  await act(async () => {
    root.render(h(ProfilePage));
  });
}

const teks = () => container.textContent ?? "";

describe("/profile — halaman akun", () => {
  it("TIDAK lagi menampilkan baris konten yang dipindahkan owner", async () => {
    // Keputusan owner 2026-11-07: "Lanjut Menonton" & "Riwayat Terbaru"
    // rumahnya /history, "Favorit" rumahnya /my-list. Memasangnya kembali di
    // sini terasa seperti "melengkapi dasbor" bagi siapa pun yang tak tahu
    // sejarahnya — sekarang itu merah.
    //
    // 🪤 Kedua baris lama memanggil getContinueWatching() dengan argumen yang
    // sama, jadi isinya nyaris identik: dua judul untuk daftar yang sama.
    masuk("admin");
    await render();

    expect(teks()).not.toContain("Lanjut Menonton");
    expect(teks()).not.toContain("Riwayat Terbaru");
    expect(teks()).not.toContain("Favorit Saya");
  });

  it("TIDAK mengunduh katalog drama lagi", async () => {
    // Dulu halaman ini memanggil /api/dramas hanya untuk menggambar tiga baris
    // kartu. Sesudah ketiganya hilang, panggilan itu jadi beban tanpa guna —
    // dan beban semacam ini tidak menimbulkan error apa pun kalau kembali
    // diam-diam, cuma halaman yang pelan.
    masuk("admin");
    await render();

    const dipanggil = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const alamat = dipanggil.map((c) => String(c[0]));
    expect(alamat.some((u) => u.includes("/api/dramas"))).toBe(false);
  });

  it("menampilkan form Akun berisi nama yang tersimpan", async () => {
    masuk("admin");
    await render();

    const input = container.querySelector<HTMLInputElement>("#profile-name");
    expect(input).toBeTruthy();
    // Form sekarang SELALU tampil (tidak lagi di balik tombol "Edit"), jadi
    // kotak yang kosong akan terbaca seperti nama yang hilang.
    expect(input?.value).toBe("Budi");
    expect(teks()).toContain("Akun");
  });

  it("ADMIN melihat seksi Keamanan berisi ubah password & 2FA", async () => {
    masuk("admin");
    await render();

    expect(teks()).toContain("Keamanan");
    // Dicari dari isian passwordnya, bukan dari judulnya: judul gampang
    // berubah saat perapian tampilan, sementara hilangnya kotak password
    // berarti fiturnya benar-benar lenyap.
    const kotakPassword = container.querySelectorAll('input[type="password"]');
    expect(kotakPassword.length).toBeGreaterThanOrEqual(2); // password + konfirmasi
  });

  it("NON-ADMIN tidak diberi form ubah password admin", async () => {
    // Endpoint-nya memang sudah menolak sesi non-admin dengan 403, jadi ini
    // bukan pagar keamanannya — pagarnya di server. Ini mencegah "hiasan
    // berbahaya": form yang bisa diisi lalu SELALU gagal, yang membuat orang
    // mengira akunnya rusak.
    masuk("viewer");
    await render();

    const kotakPassword = container.querySelectorAll('input[type="password"]');
    expect(kotakPassword.length).toBe(0);
  });

  it("TAMU tidak diberi form apa pun, tapi diberi tahu alasannya", async () => {
    // Form yang lenyap tanpa penjelasan terbaca seperti halaman rusak.
    await render();

    expect(teks()).toContain("Tamu");
    expect(container.querySelector("#profile-name")).toBeFalsy();
    expect(teks()).toContain("baru bisa diubah setelah masuk");
  });

  it("TAMU tidak diberi tombol Daftar selama pendaftaran penonton dimatikan", async () => {
    // AKUN_PENONTON_ENABLED = false di lib/saklar-fitur.ts. Tombol menuju
    // halaman yang dimatikan lebih buruk daripada tidak ada tombol: penonton
    // mengiranya rusak, dan kita kehilangan kesempatan menjelaskan keadaannya.
    await render();

    const tautan = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(tautan).not.toContain("/daftar");
  });

  it("jalan ke Riwayat dan Favorit TIDAK ikut hilang", async () => {
    // Inti keputusan owner: barisnya dipindahkan, BUKAN dimatikan. Kalau
    // menunya ikut lepas, fiturnya benar-benar hilang dari situs — dan
    // /my-list sudah tidak ada di navbar maupun bar bawah HP, jadi /profile
    // jalan terakhirnya (lihat tests/kepala-situs.test.ts).
    masuk("admin");
    await render();

    const tautan = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(tautan).toContain("/history");
    expect(tautan).toContain("/my-list");
  });
});
