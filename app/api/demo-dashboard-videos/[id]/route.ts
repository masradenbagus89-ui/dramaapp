import { NextResponse } from "next/server";
import { DEMO_VIDEOS } from "../data";

export const dynamic = "force-dynamic";

/**
 * API TIRUAN — berlagak jadi endpoint GET /api/videos/:id milik dashboard.
 * Balasannya dibungkus { data: {...} }, bentuk yang lazim di Supabase.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const video = DEMO_VIDEOS.find((v) => v.id === id);

  if (!video) {
    return NextResponse.json({ error: "Video tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: video });
}
