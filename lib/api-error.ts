// Balasan error API yang AMAN — pesan mentah tak pernah sampai ke browser.
//
// KENAPA ADA (audit keamanan, temuan R-4): 24 berkas route meneruskan
// `err.message` apa adanya ke browser. Isinya bisa memuat nama tabel, bentuk
// query, bahkan — ini pernah terjadi sungguhan pada 2026-09-16 — SELURUH
// halaman HTML "522 Connection timed out" milik Cloudflare tercetak di kotak
// merah halaman login. Tak terbaca pengguna, sekaligus membocorkan detail
// internal.
//
// Jalur login sudah dibereskan waktu itu (app/api/auth/login/route.ts:143-168).
// Berkas ini mengangkat pola yang SAMA menjadi satu tempat, supaya route lain
// tak perlu menyalinnya — dan supaya perbaikannya tidak berbeda-beda per route
// (pesan yang beda-beda membuat bug sulit dikenali dari log).

import { NextResponse } from "next/server";

/**
 * Apakah error ini karena database sedang tidak merespons?
 *
 * `lib/supabase.ts` melempar Error yang pesannya SELALU diawali "Supabase "
 * (lihat `Supabase ${what} ${res.status}` di :183 dan pesan timeout di :219),
 * jadi awalan itu dipakai sebagai penandanya. Sengaja bukan `instanceof` kelas
 * khusus: lib/supabase.ts memakai Error biasa, dan mengubahnya berarti
 * menyentuh jalur yang dipakai hampir seluruh aplikasi.
 */
export function gangguanDatabase(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith("Supabase ");
}

/**
 * Balasan gagal yang aman dikirim ke browser.
 *
 * - Error ASLI dicatat ke log server (terbaca di panel Railway), jadi
 *   kemampuan mendiagnosa TIDAK berkurang — yang hilang cuma kebocorannya.
 * - Gangguan database dibalas **503**, bukan 500. Bedanya nyata bagi
 *   pemanggil: 503 = "layanannya sedang tidak tersedia, coba lagi", 500 =
 *   "ada yang rusak di kode kami". Monitoring memakai beda itu untuk memilah
 *   alarm, dan pengguna tidak salah menyimpulkan bahwa dirinya yang keliru.
 *
 * @param konteks penanda di log, mis. "api/comments POST"
 * @param err     error aslinya (dicatat, TIDAK dikirim)
 * @param pesanUmum kalimat untuk manusia; wajib tanpa detail teknis
 */
export function balasanGagal(
  konteks: string,
  err: unknown,
  pesanUmum: string,
): NextResponse {
  console.error(`[${konteks}] gagal diproses:`, err);

  if (gangguanDatabase(err)) {
    return NextResponse.json(
      {
        error:
          "Server database sedang tidak merespons. Ini bukan karena kesalahanmu — coba lagi beberapa menit lagi.",
      },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }

  return NextResponse.json({ error: pesanUmum }, { status: 500 });
}
