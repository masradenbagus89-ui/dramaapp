import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, getAdminEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { getPlaylyKualitas, setPlaylyVideoKualitas } from "@/lib/store";
import { parseDramaQuality } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * KUALITAS video untuk lencana poster (owner 2026-10-31).
 *
 * Kenapa endpoint ini ada: poster film tampil tanpa keterangan HD/CAM. Playly
 * tidak pernah mengirim mutu berkas (lib/playly.ts `PlaylyVideo`), jadi situs
 * MENURUNKANNYA dari link unduhan — 1080p → "HD", hanya 480p → "SD"
 * (lib/kualitas-video.ts). Turunan itu bisa meleset: berkas 1080p hasil
 * rekaman bioskop tetap CAM. Endpoint inilah jalan admin mengoreksinya, dan
 * nilai yang masuk lewat sini SELALU menang atas turunan otomatis.
 *
 * Isinya bukan data rahasia, tapi tetap dijaga sesi admin karena ia MENGUBAH
 * apa yang dilihat seluruh pengunjung — pagarnya sengaja disalin dari
 * /api/admin/playly/genre supaya dua pintu ke data Playly tidak berbeda
 * kekuatannya.
 *
 * Catatan rak owasp (skills/owasp/SKILL.md) + backend (skills/backend/SKILL.md):
 *   §1 broken access — otorisasi dicek DI DALAM route handler, bukan
 *     mengandalkan middleware saja (CVE-2025-29927: header
 *     `x-middleware-subrequest` bisa melewati cek yang cuma ada di sana).
 *   §1 A10 gagal-aman — blok `catch` membalas error dan TIDAK menyimpan apa
 *     pun; tak ada jalan yang meloloskan perubahan saat penyimpanan gagal.
 *   §3 mass assignment — yang dibaca dari body hanya dua field, dan nilainya
 *     lewat allowlist `parseDramaQuality` (lib/types.ts), bukan disimpan apa
 *     adanya. Label ngawur di pojok poster lebih merugikan penonton daripada
 *     poster tanpa label sama sekali.
 *   backend §1 status code — 401 belum login · 400 body tak terbaca ATAU video
 *     belum dipilih · 429 lewat `guardMutation` · 500 kegagalan simpan dengan
 *     pesan apa adanya dari lapisan penyimpanan, tanpa detail internal lain.
 *
 * Kontrak:
 *   GET  -> { ok: true, kualitas: Record<videoId, label> }
 *   POST { videoId: string, kualitas: string | null } -> { ok: true, kualitas }
 *
 * POST mengembalikan peta TERBARU supaya layar admin tidak perlu memanggil GET
 * lagi, dan tidak ada jendela waktu di mana layar menampilkan keadaan usang.
 */

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const kualitas = await getPlaylyKualitas();
    return NextResponse.json({ ok: true, kualitas });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal membaca daftar kualitas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "playly:kualitas",
    limit: 60,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  // Identitas dari cookie sesi yang ditandatangani server, BUKAN dari body —
  // supaya pemanggil tidak bisa mengaku jadi admin dengan mengarang isi.
  const email = await getAdminEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { videoId?: unknown; kualitas?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Isi permintaan tidak bisa dibaca." },
      { status: 400 },
    );
  }

  const videoId = String(body.videoId ?? "").trim();
  if (!videoId) {
    return NextResponse.json({ error: "Video belum dipilih." }, { status: 400 });
  }

  // null / "" / label asing semuanya berarti KEMBALIKAN KE OTOMATIS. Sengaja
  // tidak ditolak 400: "ikuti turunan otomatis lagi" adalah aksi yang sah dan
  // justru keadaan bawaannya. Yang penting label ngawur tak pernah tersimpan.
  const label = parseDramaQuality(body.kualitas) ?? null;

  try {
    const kualitas = await setPlaylyVideoKualitas(videoId, label);
    return NextResponse.json({ ok: true, kualitas });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menyimpan perubahan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
