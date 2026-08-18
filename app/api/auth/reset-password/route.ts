import { NextRequest, NextResponse } from "next/server";
import { getViewerAccount, setViewerAccount } from "@/lib/store";
import { hashPassword } from "@/lib/admin-password";
import {
  generateRecoveryCode,
  hashRecoveryCode,
  verifyRecoveryCode,
} from "@/lib/recovery-code";
import {
  signViewerSession,
  sessionCookieOptions,
  sessionSecretConfigured,
  VIEWER_COOKIE,
  ADMIN_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { MIN_VIEWER_PASSWORD_LEN } from "@/lib/viewer-password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pulihkan password penonton memakai kode pemulihan.
 *
 * Kode bersifat SEKALI PAKAI: setelah berhasil, kode lama hangus dan penonton
 * menerima kode BARU. Kalau tidak, satu kode yang bocor bisa dipakai berkali-kali
 * untuk merebut akun.
 */
export async function POST(req: NextRequest) {
  // Batas laju ketat: endpoint ini menerima tebakan kode, jadi paling rawan
  // dibanjiri percobaan.
  const blocked = guardMutation(req, {
    bucket: "auth:reset",
    limit: 5,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  if (!sessionSecretConfigured()) {
    return NextResponse.json(
      { error: "Pemulihan belum aktif (AUTH_SECRET belum di-set di server)." },
      { status: 500 },
    );
  }

  let body: { email?: string; code?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const code = String(body.code ?? "");
  const newPassword = String(body.newPassword ?? "");

  if (!email || !code || !newPassword) {
    return NextResponse.json(
      { error: "Email, kode pemulihan, dan password baru wajib diisi." },
      { status: 400 },
    );
  }
  if (newPassword.length < MIN_VIEWER_PASSWORD_LEN) {
    return NextResponse.json(
      { error: `Password minimal ${MIN_VIEWER_PASSWORD_LEN} karakter.` },
      { status: 400 },
    );
  }

  const account = await getViewerAccount(email);
  // Satu pesan untuk SEMUA kegagalan (akun tak ada / belum punya kode / kode
  // salah) supaya endpoint ini tak bisa dipakai menebak email yang terdaftar.
  const gagal = NextResponse.json(
    { error: "Email atau kode pemulihan salah." },
    { status: 401 },
  );
  if (!account?.recovery) return gagal;
  if (!verifyRecoveryCode(code, account.recovery)) return gagal;

  const pass = hashPassword(newPassword);
  const nextCode = generateRecoveryCode();
  const nextRecovery = hashRecoveryCode(nextCode);

  await setViewerAccount(email, {
    ...account,
    hash: pass.hash,
    salt: pass.salt,
    recovery: { hash: nextRecovery.hash, salt: nextRecovery.salt },
  });

  // Kode yang benar sudah membuktikan kepemilikan akun, jadi langsung diberi
  // sesi — penonton tak perlu login ulang setelah mengganti password.
  const res = NextResponse.json({
    ok: true,
    email,
    name: account.name,
    recoveryCode: nextCode,
  });
  res.cookies.set(VIEWER_COOKIE, signViewerSession(email), sessionCookieOptions(SESSION_MAX_AGE));
  res.cookies.set(ADMIN_COOKIE, "", sessionCookieOptions(0));
  return res;
}
