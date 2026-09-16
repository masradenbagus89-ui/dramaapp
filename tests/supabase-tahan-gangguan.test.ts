// Penjaga permanen untuk kejadian 2026-09-16: server Supabase berhenti
// menjawab, lalu SELURUH route /api yang menyentuh database balas 500 kosong
// setelah tepat 20 detik — dan halaman login mencetak halaman error Cloudflare
// ("522: Connection timed out", ribuan karakter HTML) mentah-mentah di kotak
// merah. Penonton tak punya cara menebak artinya selain "password saya salah".
//
// Tiga hal yang dikunci di sini, ketiganya sudah pernah gagal di produksi:
//   1. Badan balasan HTML TIDAK boleh ikut ke pesan error (bocor + tak terbaca).
//   2. Gangguan jalur yang sekejap harus DICOBA ULANG — tapi cuma untuk BACA.
//      Mengulang tulis bisa menambah koin dua kali.
//   3. Permintaan yang memang salah (400) TIDAK boleh diulang — buang waktu.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Env diisi SEBELUM modul diimpor: lib/supabase membaca env sekali saat dimuat,
// dan tanpa ini `useSupabase` mati sehingga sbSelect tak pernah menembak fetch.
process.env.SUPABASE_URL = "https://contoh-tes.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.kunci-palsu-khusus-tes";
process.env.AUTH_SECRET = "rahasia-sesi-khusus-tes-cukup-panjang";

const { sbSelect, ringkasBalasan } = await import("../lib/supabase");

// Potongan asli yang dikirim Cloudflare saat Supabase tak menjawab.
const HTML_522 = `<!DOCTYPE html>
<html class="no-js" lang="en-US">
<head><title>supabase.co | 522: Connection timed out</title>
<meta charset="UTF-8" /></head>
<body><div id="cf-wrapper"><div id="cf-error-details">${"x".repeat(3000)}</div></div></body>
</html>`;

function balasan(status: number, body: string): Response {
  return new Response(body, { status });
}

describe("ringkasBalasan — badan error tidak boleh bocor utuh", () => {
  it("halaman HTML Cloudflare diringkas jadi satu baris, tanpa tag", () => {
    const hasil = ringkasBalasan(HTML_522);
    expect(hasil).not.toContain("<");
    expect(hasil.length).toBeLessThan(120);
    // Judulnya tetap dibawa — itu yang menyebut sebab sebenarnya.
    expect(hasil).toContain("522");
  });

  it("pesan JSON pendek dari PostgREST dibiarkan apa adanya", () => {
    const pesan = '{"message":"relation \\"dramas\\" does not exist"}';
    expect(ringkasBalasan(pesan)).toBe(pesan);
  });

  it("teks panjang dipotong, bukan diteruskan bulat-bulat", () => {
    expect(ringkasBalasan("y".repeat(5000)).length).toBeLessThanOrEqual(201);
  });

  it("balasan kosong tetap punya keterangan, bukan string hampa", () => {
    expect(ringkasBalasan("   ")).toBe("(balasan kosong)");
  });
});

describe("sbSelect — tahan gangguan sekejap, tapi tidak boros", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("522 sekali lalu pulih: dicoba ulang, hasilnya tetap terkirim", async () => {
    const palsu = vi
      .fn()
      .mockResolvedValueOnce(balasan(522, HTML_522))
      .mockResolvedValueOnce(balasan(200, '[{"id":"drama-1"}]'));
    vi.stubGlobal("fetch", palsu);

    await expect(sbSelect("dramas?select=id")).resolves.toEqual([
      { id: "drama-1" },
    ]);
    expect(palsu).toHaveBeenCalledTimes(2);
  });

  it("gagal terus: pesannya menyebut sebab, TANPA memuat HTML mentah", async () => {
    // mockImplementation, bukan mockResolvedValue: tiap percobaan harus dapat
    // Response BARU — body hanya boleh dibaca sekali (seperti di dunia nyata).
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(balasan(522, HTML_522))));

    await expect(sbSelect("dramas?select=id")).rejects.toThrow(/Supabase/);
    const pesan = await sbSelect("dramas?select=id").catch(
      (e: Error) => e.message,
    );
    expect(pesan).not.toContain("<!DOCTYPE");
    expect(pesan).not.toContain("cf-wrapper");
    expect(pesan.length).toBeLessThan(400);
  });

  it("400 (permintaan memang salah) TIDAK diulang — jatah waktu tak dibuang", async () => {
    const palsu = vi
      .fn()
      .mockImplementation(() => Promise.resolve(balasan(400, JSON.stringify({ message: "kolom tidak dikenal" }))));
    vi.stubGlobal("fetch", palsu);

    await expect(sbSelect("dramas?select=ngaco")).rejects.toThrow(/400/);
    expect(palsu).toHaveBeenCalledTimes(1);
  });

  it("tiap percobaan dibatasi waktu — signal selalu ikut dikirim", async () => {
    const palsu = vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(balasan(200, "[]")),
    );
    vi.stubGlobal("fetch", palsu);

    await sbSelect("dramas?select=id");
    const init = palsu.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
