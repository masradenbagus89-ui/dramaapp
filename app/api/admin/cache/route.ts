import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { segarkanCachePublik } from "@/lib/cache-publik";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tombol "Segarkan cache" di Dashboard admin.
 *
 * Penyimpanan lewat panel admin & webhook Playly SUDAH membuang cache sendiri
 * (lib/cache-publik.ts). Endpoint ini untuk perubahan yang tidak lewat jalur
 * itu — mis. data diubah langsung di Supabase, atau Playly mengubah video
 * tanpa mengirim webhook.
 *
 * Kontrak:
 *   POST (tanpa body) -> 200 { ok: true }
 *                        401 { error } bukan admin
 *                        403/429 dari guardMutation (asal tak dikenal / terlalu sering)
 *                        500 { error } cache gagal ditandai basi
 *
 * Dijaga sesi admin walau tak ada data yang dibuka: tiap panggilan memaksa
 * seluruh halaman dibangun ulang, jadi membiarkannya terbuka = siapa pun bisa
 * menghapus manfaat cache dan membebani database.
 */

/** Cukup untuk klik berulang yang wajar; menahan skrip yang menyerbu. */
const MAKS_PER_MENIT = 10;

export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "admin:cache",
    limit: MAKS_PER_MENIT,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  if (!(await getAdminEmail(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!segarkanCachePublik()) {
    return NextResponse.json(
      { error: "Cache gagal disegarkan. Coba lagi, atau tunggu 1-5 menit." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
