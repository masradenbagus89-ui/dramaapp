import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/session";
import { cariLinkMega } from "@/lib/playly-unduhan-mega";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sama dengan batas id video di lib/playly-unduhan.ts. */
const VIDEO_ID_MAKS = 200;

/**
 * Saran link Mega untuk satu video Playly (isi otomatis, 2026-11-14).
 * Cermin GET /api/admin/playly/unduhan/drive — kontrak balasannya sama persis.
 *
 * HANYA MEMBACA: tidak menulis link apa pun. Hasilnya mengisi kotak di panel
 * admin, lalu admin menekan Simpan lewat POST /api/admin/playly/unduhan —
 * jadi validasi https + domain tetap lewat gerbang yang sama.
 *
 * Dijaga sesi admin di DALAM route (skills/owasp/SKILL.md §1): balasannya
 * memuat link folder lengkap dengan kunci, tak boleh dibaca siapa saja.
 *
 * Kontrak:
 *   GET ?videoId=<id>
 *     -> 200 { ok: true, saran: [{ quality, url }], ganda: [{ quality, nama[] }] }
 *     -> 400 { error }   videoId kosong/terlalu panjang
 *     -> 401 { error }   bukan admin
 *     -> 502 { error }   env belum diatur / Mega gagal (alasan bahasa awam)
 */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const videoId = req.nextUrl.searchParams.get("videoId")?.trim() ?? "";
  if (!videoId || videoId.length > VIDEO_ID_MAKS) {
    return NextResponse.json({ error: "Video belum dipilih." }, { status: 400 });
  }

  const hasil = await cariLinkMega(videoId);
  if (!hasil.ok) return NextResponse.json({ error: hasil.alasan }, { status: 502 });
  return NextResponse.json({ ok: true, saran: hasil.saran, ganda: hasil.ganda });
}
