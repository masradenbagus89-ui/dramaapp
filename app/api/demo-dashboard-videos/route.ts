import { NextResponse } from "next/server";
import { DEMO_VIDEOS } from "./data";

export const dynamic = "force-dynamic";

/**
 * API TIRUAN — berlagak jadi endpoint GET /api/videos milik dashboard.
 * Bentuk balasannya meniru Supabase: snake_case, dibungkus { data: [...] }.
 *
 * Gunanya untuk MENCOBA sambungan tanpa menunggu dashboard asli.
 * AMAN dihapus begitu DASHBOARD_API_URL sudah diarahkan ke dashboard sungguhan.
 */
export async function GET() {
  return NextResponse.json({ data: DEMO_VIDEOS });
}
