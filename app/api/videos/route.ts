import { NextResponse } from "next/server";
import {
  DashboardError,
  contohNamaDilewati,
  fetchVideos,
  ringkasAlasanDilewati,
} from "@/lib/dashboard-videos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/videos — daftar video yang di-upload lewat dashboard.
 *
 * Ini jalur milik WebMovie sendiri: browser memanggil sini, lalu SERVER kita
 * yang meneruskan ke API dashboard. Dengan begitu CORS (izin domain lain
 * memanggil API) tidak ikut main, dan alamat dashboard tidak terlihat pengunjung.
 *
 * Balasan: { ok, count, videos, skipped, alasanDilewati, contohDilewati }
 *
 * Dua field terakhir ditambahkan 2026-10-01. Sebelumnya balasan ini hanya
 * memulangkan `skipped: 20` — angka tanpa sebab dan tanpa identitas — sehingga
 * ketika SELURUH daftar ditolak, tak seorang pun bisa tahu kenapa maupun video
 * mana. Satu-satunya catatan sebabnya ada di log Vercel, yang tak bisa diakses
 * siapa pun di tim ini. Perinciannya dibuat di lib/dashboard-videos.ts supaya
 * bisa diuji tanpa menyalakan server — termasuk pagar bahwa alamat berkas tidak
 * pernah ikut keluar.
 */
export async function GET() {
  try {
    const { videos, rejected } = await fetchVideos();

    if (rejected.length > 0) {
      console.warn(
        `[videos] ${rejected.length} video dilewati:`,
        rejected.slice(0, 5),
      );
    }

    return NextResponse.json({
      ok: true,
      count: videos.length,
      videos,
      skipped: rejected.length,
      alasanDilewati: ringkasAlasanDilewati(rejected),
      contohDilewati: contohNamaDilewati(rejected),
    });
  } catch (err) {
    if (err instanceof DashboardError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Gagal mengambil daftar video.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
