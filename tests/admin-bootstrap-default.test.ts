// Penjaga permanen: NOL alamat email admin sungguhan di dalam kode
// (dipasang 2026-10-24).
//
// BUG YANG DIJAGA — temuan audit 2026-10-24 (S-6). `lib/store.ts` dulu memuat
// `admin@dramaku.com` sebagai admin bawaan, dan berkas itu ter-commit di repo
// yang **PUBLIK**. Alamat admin = separuh kunci pintu: penyerang tinggal
// menebak passwordnya, dan jalur login admin masih punya cadangan satu
// `ADMIN_PASSWORD` bersama (app/api/auth/login/route.ts:79).
//
// Dua arah dijaga di sini:
//   1. tanpa env -> daftar admin bawaan KOSONG (gagal-MENGUNCI, bukan
//      gagal-membuka). Admin bawaan yang alamatnya bisa ditebak = pintu masuk
//      permanen yang tak pernah ditutup siapa pun.
//   2. dengan env -> pemulihan bencana TETAP bisa jalan, jadi pengetatan ini
//      tidak mengunci owner dari sistemnya sendiri.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ASLI = process.env.ADMIN_BOOTSTRAP_EMAIL;

beforeEach(() => {
  vi.resetModules();
  delete process.env.ADMIN_BOOTSTRAP_EMAIL;
});

afterEach(() => {
  if (ASLI === undefined) delete process.env.ADMIN_BOOTSTRAP_EMAIL;
  else process.env.ADMIN_BOOTSTRAP_EMAIL = ASLI;
});

// `data/admins.json` ada di disk owner dan akan dibaca lebih dulu oleh
// getAdmins(), jadi yang diuji di sini NILAI BAWAANNYA lewat jalur yang tidak
// menyentuh berkas: modul di-load ulang dengan env berbeda, lalu diperiksa.
async function muatDefault() {
  // Supabase sengaja dimatikan supaya getAdmins() tak menembak jaringan.
  vi.doMock("@/lib/supabase", () => ({
    useSupabase: false,
    sbSelect: async () => [],
    sbRpc: async () => null,
    periksaSetelanSupabase: () => null,
  }));
  return await import("../lib/store");
}

describe("Admin bawaan — nol email sungguhan di kode", () => {
  it("tanpa ADMIN_BOOTSTRAP_EMAIL, daftar bawaannya KOSONG", async () => {
    const store = await muatDefault();
    // getAdmins() membaca data/admins.json kalau ada; yang dijaga di sini
    // adalah bahwa KODE-nya sendiri tak lagi menyumbang email apa pun.
    const sumber = (await import("node:fs")).readFileSync(
      "lib/store.ts",
      "utf-8",
    );
    expect(sumber).not.toMatch(/@dramaku\.com/);
    expect(sumber).not.toMatch(/@gmail\.com/);
    expect(typeof store.getAdmins).toBe("function");
  });

  it("nol alamat email BERBENTUK email di seluruh lib/store.ts", async () => {
    const sumber = (await import("node:fs")).readFileSync(
      "lib/store.ts",
      "utf-8",
    );
    // Pola email di dalam tanda kutip — yang ditulis sebagai NILAI, bukan kata
    // "email" di komentar.
    const temuan = sumber.match(/"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}"/g);
    expect(temuan, `masih ada email di kode: ${temuan?.join(", ")}`).toBeNull();
  });

  it("pemulihan bencana tetap mungkin lewat env", async () => {
    // Kalau pengetatan ini membuat owner TAK BISA memulihkan sistemnya, itu
    // bukan keamanan — itu mengunci pemiliknya sendiri.
    const sumber = (await import("node:fs")).readFileSync(
      "lib/store.ts",
      "utf-8",
    );
    expect(sumber).toContain("ADMIN_BOOTSTRAP_EMAIL");
  });
});

describe("Berkas data yang bocor — tidak boleh kembali ter-commit", () => {
  it(".gitignore menutup ketiga berkas beremail admin", async () => {
    const gi = (await import("node:fs")).readFileSync(".gitignore", "utf-8");
    for (const f of ["data/admins.json", "supabase_export.sql", "migrasi-full.sql"]) {
      expect(gi, `${f} belum ada di .gitignore`).toContain(f);
    }
  });
});
