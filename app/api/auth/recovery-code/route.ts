import { NextRequest, NextResponse } from "next/server";
import { getViewerAccount, setViewerAccount } from "@/lib/store";
import { verifyPassword } from "@/lib/admin-password";
import { generateRecoveryCode, hashRecoveryCode } from "@/lib/recovery-code";
import { resolveUserEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Buat kode pemulihan BARU untuk penonton yang sedang login.
 *
 * Dipakai dua keadaan: (a) akun yang dibuat sebelum fitur ini ada (Tahap 6)
 * dan belum punya kode sama sekali, (b) kode lama hilang tapi pemiliknya masih
 * bisa masuk.
 *
 * Password diminta ULANG walaupun sudah login: membuat kode baru MENGHANGUSKAN
 * kode lama, jadi kalau cukup bermodal sesi, orang yang membajak sesi bisa
 * mengunci pemilik aslinya.
 */
export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "auth:recovery-code",
    limit: 5,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  const id = await resolveUserEmail(req);
  if (!id) {
    return NextResponse.json({ error: "Masuk dulu." }, { status: 401 });
  }
  if (id.isAdmin) {
    return NextResponse.json(
      { error: "Kode pemulihan hanya untuk akun penonton." },
      { status: 403 },
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const account = await getViewerAccount(id.email);
  if (!account) {
    return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  }
  if (!verifyPassword(String(body.password ?? ""), account)) {
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }

  const code = generateRecoveryCode();
  const rec = hashRecoveryCode(code);
  await setViewerAccount(id.email, {
    ...account,
    recovery: { hash: rec.hash, salt: rec.salt },
  });

  // Kode dikembalikan SEKALI. Tak ada endpoint untuk melihatnya lagi.
  return NextResponse.json({ ok: true, recoveryCode: code });
}
