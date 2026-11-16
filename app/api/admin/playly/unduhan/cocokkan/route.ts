import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { cocokkanSemuaSumber } from "@/lib/playly-unduhan-otomatis";
import type { VideoCocok } from "@/lib/playly-unduhan-cocok";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Membaca dua layanan luar (Drive 15 dtk + Mega 20 dtk batas masing-masing, serentak). */
export const maxDuration = 60;

/** Sama dengan batas id video di lib/playly-unduhan.ts. */
const VIDEO_ID_MAKS = 200;
const JUDUL_MAKS = 500;
/** Jauh di atas jumlah video akun kita; lebih dari ini = kiriman keliru. */
const VIDEO_MAKS = 5000;

/**
 * "Cocokkan semua" link unduhan (2026-11-16): baca folder Google Drive + Mega
 * sekali, pasangkan file ke seluruh video lewat ID atau judul di nama file.
 *
 * HANYA MEMBACA: hasilnya mengisi tabel admin, lalu admin menekan "Simpan
 * semua" (POST /api/admin/playly/unduhan, validasi domain di sana).
 * POST, bukan GET, hanya karena daftar video dikirim di body. Tetap lewat
 * guardMutation: tiap klik memakai kuota Google/Mega milik kita.
 *
 * Kontrak:
 *   POST { videos: [{ id, title }] }
 *     -> 200 { ok: true, hasil: { [videoId]: { saran[], ganda[] } }, sumber: StatusSumber[] }
 *     -> 400 { error }   daftar video salah bentuk
 *     -> 401 { error }   bukan admin
 *     -> 502 { error, sumber }   tak satu pun sumber bisa dibaca (alasan bahasa awam)
 */
export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, { bucket: "playly:unduhan-cocokkan", limit: 10, windowMs: 60_000 });
  if (blocked) return blocked;
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { videos?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Isi permintaan tidak bisa dibaca." }, { status: 400 });
  }
  if (!Array.isArray(body.videos) || body.videos.length === 0 || body.videos.length > VIDEO_MAKS) {
    return NextResponse.json({ error: "Daftar video kosong atau terlalu banyak." }, { status: 400 });
  }
  // Hanya id & title yang dipungut (anti mass assignment); yang rusak dibuang.
  const videos: VideoCocok[] = [];
  for (const item of body.videos) {
    const r = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const id = typeof r.id === "string" ? r.id.trim() : "";
    const title = typeof r.title === "string" ? r.title.trim() : "";
    if (id && id.length <= VIDEO_ID_MAKS && title.length <= JUDUL_MAKS) videos.push({ id, title });
  }

  const { hasil, sumber } = await cocokkanSemuaSumber(videos);
  if (!sumber.some((s) => s.status === "ok")) {
    const alasan = sumber.map((s) => ("alasan" in s ? s.alasan : "")).filter(Boolean).join(" ");
    return NextResponse.json({ error: alasan || "Tidak ada sumber yang bisa dibaca.", sumber }, { status: 502 });
  }
  return NextResponse.json({ ok: true, hasil, sumber });
}
