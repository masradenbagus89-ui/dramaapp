import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/session";
import { setAdminPassword, clearAdminPassword } from "@/lib/store";
import { hashPassword, MIN_ADMIN_PASSWORD_LEN } from "@/lib/admin-password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_LEN = MIN_ADMIN_PASSWORD_LEN;

// POST: admin yang SEDANG LOGIN memasang password pribadinya sendiri.
// Identitas diambil dari cookie sesi bertanda-tangan (getAdminEmail) — BUKAN dari
// body yang bisa dipalsukan. Password di-hash (scrypt) sebelum disimpan.
export async function POST(req: NextRequest) {
  try {
    const email = await getAdminEmail(req);
    if (!email) {
      return NextResponse.json(
        { error: "Harus login sebagai admin untuk mengubah password." },
        { status: 403 },
      );
    }
    const { newPassword } = (await req.json()) as { newPassword?: string };
    const pw = String(newPassword ?? "");
    if (pw.length < MIN_LEN) {
      return NextResponse.json(
        { error: `Password minimal ${MIN_LEN} karakter.` },
        { status: 400 },
      );
    }
    await setAdminPassword(email, hashPassword(pw));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: hapus password pribadi -> kembali memakai password admin bersama.
export async function DELETE(req: NextRequest) {
  try {
    const email = await getAdminEmail(req);
    if (!email) {
      return NextResponse.json(
        { error: "Harus login sebagai admin." },
        { status: 403 },
      );
    }
    await clearAdminPassword(email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menghapus password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
