// Penjaga permanen: pesan error mentah TIDAK boleh sampai ke browser
// (dipasang 2026-10-26, temuan audit R-4).
//
// BUG YANG DIJAGA — pernah terjadi sungguhan. 2026-09-16: saat Supabase mati,
// SELURUH halaman HTML "522 Connection timed out" milik Cloudflare tercetak di
// kotak merah halaman login. Tak terbaca pengguna, sekaligus membocorkan
// detail internal. Jalur login dibereskan waktu itu, tapi 24 berkas route lain
// masih meneruskan `err.message` apa adanya.
//
// Dua arah dijaga:
//   1. pesan mentah tak pernah ikut ke badan respons
//   2. kemampuan mendiagnosa TIDAK hilang — error aslinya tetap dicatat ke log
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { balasanGagal, gangguanDatabase } from "../lib/api-error";

afterEach(() => vi.restoreAllMocks());

const RAHASIA =
  'relation "dramaapp.wallets" does not exist — host aws-1-ap-southeast-1.pooler.supabase.com';

describe("balasanGagal — bocoran ditutup, diagnosa tetap bisa", () => {
  it("pesan mentah TIDAK ikut ke badan respons", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = balasanGagal("uji", new Error(RAHASIA), "Gagal. Coba lagi.");
    const teks = await res.text();
    expect(teks).not.toContain("dramaapp.wallets");
    expect(teks).not.toContain("pooler.supabase.com");
    expect(teks).toContain("Gagal. Coba lagi.");
  });

  it("error ASLI tetap dicatat ke log server — diagnosa tidak hilang", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error(RAHASIA);
    balasanGagal("api/uji POST", err, "Gagal.");
    expect(log).toHaveBeenCalled();
    // Yang dicatat harus error ASLINYA, bukan ringkasannya.
    expect(log.mock.calls[0]).toContain(err);
    expect(String(log.mock.calls[0][0])).toContain("api/uji POST");
  });

  it("gangguan database dibalas 503 + Retry-After, bukan 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = balasanGagal("uji", new Error("Supabase select 522: ..."), "x");
    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    // Penting bagi pengguna: ia harus tahu ini BUKAN salahnya.
    expect(await res.text()).toContain("bukan karena kesalahanmu");
  });

  it("error biasa tetap 500", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(balasanGagal("uji", new Error("apa saja"), "x").status).toBe(500);
  });

  it("nilai yang dilempar bukan Error pun tidak membocorkan isinya", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = balasanGagal("uji", { token: "rahasia-sekali" }, "Gagal.");
    expect(await res.text()).not.toContain("rahasia-sekali");
  });
});

describe("gangguanDatabase — pembeda 503 vs 500", () => {
  it("mengenali error dari lib/supabase (selalu diawali 'Supabase ')", () => {
    expect(gangguanDatabase(new Error("Supabase select 500: ..."))).toBe(true);
  });
  it("tidak salah menuduh error lain sebagai gangguan database", () => {
    expect(gangguanDatabase(new Error("Gagal parse JSON"))).toBe(false);
    expect(gangguanDatabase("bukan error")).toBe(false);
    expect(gangguanDatabase(null)).toBe(false);
  });
});

describe("Route yang dilihat PENONTON — nol pola bocor", () => {
  // Pemeriksaan statis atas isi berkas. Kalau suatu hari pola lama
  // (`err instanceof Error ? err.message : ...` lalu dikirim sebagai `error`)
  // kembali masuk ke route publik, tes ini yang menangkapnya — bukan penonton
  // yang melihat nama tabel kita di layar.
  const PUBLIK = [
    "app/api/comments/route.ts",
    "app/api/ratings/route.ts",
    "app/api/likes/route.ts",
    "app/api/videos/route.ts",
    "app/api/videos/[id]/route.ts",
    "app/api/external-videos/route.ts",
    "app/api/coins/topup/route.ts",
  ];

  it.each(PUBLIK)("%s tidak mengirim err.message ke browser", (berkas) => {
    const isi = readFileSync(berkas, "utf-8");
    // Pola bocor: `const message = err instanceof Error ? err.message`
    expect(isi).not.toMatch(/const\s+message\s*=\s*\n?\s*err instanceof Error \? err\.message/);
    // `err.message` yang masih ada hanya boleh di DALAM cabang kelas error
    // terkendali (punya .status sendiri) atau di console.*, bukan dikirim polos.
    const barisBocor = isi
      .split("\n")
      .filter((b) => /error:\s*err\.message/.test(b) && !/status:\s*err\.status/.test(b));
    expect(barisBocor, `baris bocor: ${barisBocor.join(" | ")}`).toHaveLength(0);
  });
});
