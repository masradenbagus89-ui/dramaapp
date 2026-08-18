import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, getAdminEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import {
  PlaylyError,
  getPlaylyKeyStatus,
  savePlaylyKey,
  deletePlaylyKey,
} from "@/lib/playly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kelola kunci API Playly. SEMUA jalur di sini wajib sesi admin.
 *
 * Yang keluar dari endpoint ini HANYA bentuk tersamar ("plyk_••••••••json").
 * Kunci aslinya tidak pernah ikut dalam respons — sekali pun ke browser admin
 * yang sah, karena begitu sampai di browser ia bisa dibaca siapa saja yang
 * membuka DevTools atau lewat ekstensi browser.
 */

/** GET — status kunci (tersamar) untuk ditampilkan di halaman setelan. */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, status: await getPlaylyKeyStatus() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membaca status kunci.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST — simpan/ganti kunci. Body: { key: "plyk_..." } */
export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "playly:key",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  const email = await getAdminEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { key } = (await req.json()) as { key?: string };
    await savePlaylyKey(String(key ?? ""), email);
    // Sengaja balas ulang STATUS (tersamar), bukan kunci yang barusan dikirim.
    return NextResponse.json({ ok: true, status: await getPlaylyKeyStatus() });
  } catch (err) {
    if (err instanceof PlaylyError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Gagal menyimpan kunci.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE — cabut kunci dari database (kaitan video yang sudah ada tetap utuh). */
export async function DELETE(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "playly:key",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deletePlaylyKey();
    return NextResponse.json({ ok: true, status: await getPlaylyKeyStatus() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mencabut kunci.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
