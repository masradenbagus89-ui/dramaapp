import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, getAdminEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { getPlaylyHiddenIds, setPlaylyVideoHidden } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daftar video Playly yang DISEMBUNYIKAN dari halaman penonton.
 *
 * Semua video mitra tampil otomatis; endpoint ini mengurus daftar PENGECUALIAN.
 * Isinya bukan data rahasia dan bukan milik per-pengguna, tapi tetap dijaga sesi
 * admin karena ia MENGUBAH apa yang dilihat seluruh pengunjung situs.
 *
 * Kontrak:
 *   GET  -> { ok: true, hidden: string[] }
 *   POST { videoId: string, hidden: boolean } -> { ok: true, hidden: string[] }
 *
 * POST sengaja mengembalikan daftar TERBARU supaya browser admin tidak perlu
 * memanggil GET lagi sesudahnya, dan tidak ada jendela waktu di mana layar
 * menampilkan keadaan yang sudah usang.
 */

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const hidden = await getPlaylyHiddenIds();
    return NextResponse.json({ ok: true, hidden });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal membaca daftar video tersembunyi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "playly:hidden",
    limit: 60,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  // Identitas diambil dari cookie sesi yang ditandatangani server, BUKAN dari
  // body — supaya pemanggil tidak bisa mengaku jadi admin dengan mengarang isi.
  const email = await getAdminEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { videoId?: unknown; hidden?: unknown };
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
  // Sengaja HARUS boolean asli: menerima "false" (teks) lalu menganggapnya benar
  // akan menyembunyikan video yang justru ingin ditampilkan lagi.
  if (typeof body.hidden !== "boolean") {
    return NextResponse.json(
      { error: "Nilai 'hidden' harus true atau false." },
      { status: 400 },
    );
  }

  try {
    const hidden = await setPlaylyVideoHidden(videoId, body.hidden);
    return NextResponse.json({ ok: true, hidden });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menyimpan perubahan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
