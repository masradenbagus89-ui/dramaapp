import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/session";
import { PlaylyError, fetchPlaylyVideos } from "@/lib/playly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — daftar video dari Playly, untuk halaman /admin/videos/playly.
 *
 * Panggilan ke Playly terjadi DI SINI (server), memakai kunci yang tersimpan
 * terenkripsi di database. Browser admin cuma menerima hasilnya: judul,
 * durasi, kreator, dan alamat player. Kuncinya tidak pernah ikut.
 *
 * Balasan: { ok: true, count, videos: [...], skipped: n, source, note }
 *
 * "source" + "note" menyebutkan daftar ini datang dari jalur mitra (pakai kunci)
 * atau dari katalog publik Playly — supaya admin tidak mengira kuncinya sudah
 * jalan padahal belum.
 */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { videos, rejected, source, note } = await fetchPlaylyVideos();

    if (rejected.length > 0) {
      // Dicatat ringkas supaya kalau daftarnya kosong, sebabnya bisa dilacak.
      console.warn(
        `[playly] ${rejected.length} video dilewati:`,
        rejected.slice(0, 5),
      );
    }

    return NextResponse.json({
      ok: true,
      count: videos.length,
      videos,
      skipped: rejected.length,
      skippedReasons: rejected.slice(0, 5),
      source,
      note,
    });
  } catch (err) {
    if (err instanceof PlaylyError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Gagal mengambil daftar video.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
