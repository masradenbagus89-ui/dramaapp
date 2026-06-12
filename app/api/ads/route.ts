import { NextResponse } from "next/server";
import { getAds } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/ads — daftar iklan sponsor untuk ditampilkan di modal "nonton iklan".
export async function GET() {
  const ads = await getAds();
  return NextResponse.json({ ads });
}
