import { NextResponse } from "next/server";
import { getAds } from "@/lib/store";
import { ADS_ENABLED } from "@/lib/saklar-fitur";
import { guardFitur } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/ads — daftar iklan sponsor untuk ditampilkan di modal "nonton iklan".
export async function GET() {
  // Fitur ini sedang DIJEDA lewat saklar di lib/saklar-fitur.ts. Digerbang di
  // route juga — bukan cuma disembunyikan di layar — karena alamat API tetap
  // bisa dipanggil langsung oleh siapa pun yang tahu namanya.
  const mati = guardFitur(ADS_ENABLED, "iklan");
  if (mati) return mati;
  const ads = await getAds();
  return NextResponse.json({ ads });
}
