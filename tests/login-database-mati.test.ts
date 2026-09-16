// Penjaga permanen untuk kejadian 2026-09-16: Supabase berhenti menjawab, dan
// halaman login mencetak halaman error Cloudflare ("522: Connection timed out")
// MENTAH-MENTAH di kotak merah — ribuan karakter HTML yang tak bisa dibaca
// penonton, sekaligus membocorkan host & jalur internal ke browser siapa pun.
//
// Yang dikunci di sini:
//   1. Badan error internal TIDAK PERNAH sampai ke browser.
//   2. Penonton diberi tahu bahwa ini gangguan server, BUKAN password salah.
//      Tanpa itu ia mengira salah ketik lalu mencoba puluhan kali sia-sia.
//   3. Gagal-TUTUP (OWASP A10:2025): error database tak pernah menerbitkan
//      sesi. Login gagal harus berarti gagal, bukan "diloloskan karena bingung".
import { describe, it, expect, vi } from "vitest";

process.env.AUTH_SECRET = "rahasia-sesi-khusus-tes-cukup-panjang";
process.env.ADMIN_PASSWORD = "password-admin-khusus-tes";

// Persis bentuk error yang dilempar lib/supabase saat Supabase tak menjawab.
const ERROR_SUPABASE = new Error(
  'Supabase select 522: server membalas halaman error HTML: "supabase.co | 522: Connection timed out"',
);

vi.mock("@/lib/store", () => ({
  isAdminEmail: async () => {
    throw ERROR_SUPABASE;
  },
  getTwoFA: async () => ({ enabled: false }),
  getAdminPassword: async () => null,
  getViewerAccount: async () => null,
}));

const { POST } = await import("../app/api/auth/login/route");

function login(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );
}

describe("POST /api/auth/login saat database mati", () => {
  it("balas 503 (layanan tak tersedia), bukan 500 'kode kami rusak'", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await login({ email: "orang@contoh.com", password: "apa saja" });
    expect(res.status).toBe(503);
  });

  it("pesannya menjelaskan sebab & menegaskan password TIDAK salah", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { error } = (await (
      await login({ email: "orang@contoh.com", password: "apa saja" })
    ).json()) as { error: string };

    expect(error).toMatch(/database/i);
    expect(error).toMatch(/bukan/i);
  });

  it("TIDAK membocorkan isi error internal ke browser", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { error } = (await (
      await login({ email: "orang@contoh.com", password: "apa saja" })
    ).json()) as { error: string };

    expect(error).not.toContain("Supabase");
    expect(error).not.toContain("522");
    expect(error).not.toContain("<");
    expect(error).not.toContain("supabase.co");
  });

  it("gagal-TUTUP: tak ada cookie sesi yang diterbitkan saat error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await login({ email: "orang@contoh.com", password: "apa saja" });
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toBe("");
  });
});
