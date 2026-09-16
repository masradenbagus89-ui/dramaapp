// Tes pengunci untuk periksaSetelanSupabase() di lib/supabase.ts.
//
// Kenapa ini dijaga: saklar `useSupabase` cuma melihat env TERISI atau tidak,
// bukan MASUK AKAL atau tidak. Akibatnya placeholder `.env.example` yang lupa
// diganti menyalakan mode Supabase lalu menembak host yang tak ada — gejalanya
// cuma "fetch failed" tanpa menyebut sebabnya (terjadi 2026-09-15 saat menguji
// webhook Playly). Yang lebih mahal: kalau di produksi baru SATU dari dua env
// yang terisi, app diam-diam jatuh ke file JSON di data/ yang read-only di
// Vercel — situs kelihatan hidup, tapi tiap tulisan (komentar, koin) menguap
// tanpa error yang terlihat siapa pun.
//
// Tiga hal yang dikunci di sini:
//   1. KOSONG PENUH tetap sah — mode file lokal adalah pilihan sadar untuk dev.
//   2. SETENGAH TERISI = salah setelan, bukan "Supabase mati".
//   3. Placeholder, bukan-URL, dan http polos ditolak dengan pesan yang
//      menyebut variabel mana yang salah.
import { describe, it, expect } from "vitest";
import { periksaSetelanSupabase } from "../lib/supabase";

const URL_SAH = "https://nvblmpkwyzbpdbshyvzw.supabase.co";
const KEY_SAH = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.contoh-bukan-kunci-asli";

describe("periksaSetelanSupabase", () => {
  it("kedua env kosong = sah (mode file lokal yang disengaja)", () => {
    expect(periksaSetelanSupabase("", "")).toBeNull();
  });

  it("setelan lengkap & benar = sah", () => {
    expect(periksaSetelanSupabase(URL_SAH, KEY_SAH)).toBeNull();
  });

  it("baru URL yang diisi: ditolak sambil menyebut env yang kurang", () => {
    const pesan = periksaSetelanSupabase(URL_SAH, "");
    expect(pesan).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("baru KEY yang diisi: ditolak sambil menyebut env yang kurang", () => {
    const pesan = periksaSetelanSupabase("", KEY_SAH);
    expect(pesan).toContain("SUPABASE_URL");
  });

  it("URL masih placeholder .env.example: ditolak", () => {
    const pesan = periksaSetelanSupabase("https://xxxxxxxxxxxx.supabase.co", KEY_SAH);
    expect(pesan).toContain("placeholder");
  });

  it("KEY masih placeholder .env.example: ditolak", () => {
    const pesan = periksaSetelanSupabase(URL_SAH, "eyJhbGciOi...");
    expect(pesan).toContain("placeholder");
  });

  it("URL bukan alamat sah: ditolak", () => {
    expect(periksaSetelanSupabase("nvblmpkwyzbpdbshyvzw.supabase.co", KEY_SAH)).toContain(
      "bukan alamat yang sah",
    );
  });

  it("http polos ke host publik: ditolak — service_role key tak boleh tanpa enkripsi", () => {
    const pesan = periksaSetelanSupabase("http://nvblmpkwyzbpdbshyvzw.supabase.co", KEY_SAH);
    expect(pesan).toContain("https://");
  });

  it("http ke localhost: sah — Supabase yang dijalankan di komputer sendiri", () => {
    expect(periksaSetelanSupabase("http://localhost:54321", KEY_SAH)).toBeNull();
  });
});
