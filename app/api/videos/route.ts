import { NextResponse } from "next/server";
import {
  DashboardError,
  fetchVideos,
  type RejectedVideo,
} from "@/lib/dashboard-videos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hitung video yang dilewati PER ALASAN, mis. `{ "tidak ada alamat video": 20 }`.
 *
 * KENAPA ADA (2026-10-01): sebelumnya balasan ini cuma memulangkan `skipped: 20`
 * — sebuah angka tanpa sebab. Akibatnya kartu admin menebak, dan tebakannya
 * dipatok mati ke satu kalimat: "alamatnya tidak memenuhi syarat keamanan".
 * Padahal ada EMPAT alasan berbeda sebuah video ditolak (lib/dashboard-videos.ts
 * baris 135/140/145/148), dan tiga di antaranya sama sekali bukan soal keamanan.
 * Owner jadi diberi tahu masalah yang salah. Terukur di produksi hari itu:
 * `count:0, skipped:20` — seluruh daftar ditolak, dan tak seorang pun bisa tahu
 * kenapa, sebab satu-satunya catatan sebabnya ada di log Vercel yang tak bisa
 * diakses siapa pun di tim ini.
 *
 * ⚠️ Yang dipulangkan HANYA teks alasan + jumlahnya. Field `value` milik
 * RejectedVideo SENGAJA tidak ikut: isinya data mentah dari pihak luar —
 * potongan alamat video yang bisa membawa tanda tangan, atau nama host. Alasan
 * itu sendiri kalimat tetap yang kita tulis sendiri, jadi aman ditampilkan.
 */
function ringkasAlasan(rejected: RejectedVideo[]): Record<string, number> {
  const hitung: Record<string, number> = {};
  for (const r of rejected) {
    const kunci = typeof r?.reason === "string" && r.reason ? r.reason : "sebab tidak diketahui";
    hitung[kunci] = (hitung[kunci] ?? 0) + 1;
  }
  return hitung;
}

/**
 * GET /api/videos — daftar video yang di-upload lewat dashboard.
 *
 * Ini jalur milik WebMovie sendiri: browser memanggil sini, lalu SERVER kita
 * yang meneruskan ke API dashboard. Dengan begitu CORS (izin domain lain
 * memanggil API) tidak ikut main, dan alamat dashboard tidak terlihat pengunjung.
 *
 * Balasan: { ok: true, count, videos: [...], skipped: n }
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
      alasanDilewati: ringkasAlasan(rejected),
    });
  } catch (err) {
    if (err instanceof DashboardError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Gagal mengambil daftar video.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
