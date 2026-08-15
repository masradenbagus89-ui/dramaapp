import { NextResponse } from "next/server";
import { DashboardError, fetchVideoDetail } from "@/lib/dashboard-videos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/videos/:id — detail 1 video dari dashboard.
 *
 * Catatan Next.js 15/16: `params` sekarang berupa Promise, jadi WAJIB di-await.
 * Balasan: { ok: true, video: {...} } atau 404 kalau tidak ada.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Batasi bentuk id sebelum diteruskan ke dashboard — jangan kirim mentah.
    if (!id || !/^[\w.:@-]{1,200}$/.test(id)) {
      return NextResponse.json(
        { error: "Format id video tidak valid." },
        { status: 400 },
      );
    }

    const video = await fetchVideoDetail(id);
    if (!video) {
      return NextResponse.json(
        { error: "Video tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, video });
  } catch (err) {
    if (err instanceof DashboardError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Gagal mengambil detail video.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
