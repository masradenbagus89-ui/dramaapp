import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/session";
import { cariLinkDrive } from "@/lib/playly-unduhan-drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sama dengan batas id video di lib/playly-unduhan.ts. */
const VIDEO_ID_MAKS = 200;

/**
 * Saran link Google Drive untuk satu video Playly (isi otomatis, owner 2026-10-08).
 *
 * HANYA MEMBACA: tidak menulis link apa pun. Hasilnya mengisi kotak di panel
 * admin, lalu admin menekan Simpan lewat POST /api/admin/playly/unduhan —
 * jadi validasi https + domain tetap lewat gerbang yang sama.
 *
 * Dijaga sesi admin di DALAM route (skills/owasp/SKILL.md §1): endpoint ini
 * memakai kuota API key milik kita, tak boleh dipanggil siapa saja.
 *
 * Kontrak:
 *   GET ?videoId=<id>
 *     -> 200 { ok: true, saran: [{ quality, url }], ganda: [{ quality, nama[] }] }
 *     -> 400 { error }   videoId kosong/terlalu panjang
 *     -> 401 { error }   bukan admin
 *     -> 502 { error }   env belum diatur / Google gagal (alasan bahasa awam)
 */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const videoId = req.nextUrl.searchParams.get("videoId")?.trim() ?? "";
  if (!videoId || videoId.length > VIDEO_ID_MAKS) {
    return NextResponse.json({ error: "Video belum dipilih." }, { status: 400 });
  }

  const hasil = await cariLinkDrive(videoId);
  if (!hasil.ok) return NextResponse.json({ error: hasil.alasan }, { status: 502 });
  return NextResponse.json({ ok: true, saran: hasil.saran, ganda: hasil.ganda });
}
