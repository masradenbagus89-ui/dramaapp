import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail, getViewerAccount, setViewerAccount } from "@/lib/store";
import { hashPassword } from "@/lib/admin-password";
import { generateRecoveryCode, hashRecoveryCode } from "@/lib/recovery-code";
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
 * Daftar akun PENONTON.
 *
 * Sebelum Tahap 6, "daftar" hanya menulis ke localStorage browser dan password
 * yang diketik dibuang — akun penonton tak pernah ada di server. Endpoint ini
 * yang membuatnya nyata: password disimpan sebagai hash scrypt + salt acak,
 * lalu sesi diberikan lewat cookie bertanda tangan.
 */
export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "auth:register",
    limit: 5,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  // Tanpa AUTH_SECRET, tanda tangan sesi tak bisa dipercaya → tolak, jangan
  // buat akun yang sesinya tak pernah bisa diverifikasi (gagal-mengunci).
  if (!sessionSecretConfigured()) {
    return NextResponse.json(
      { error: "Pendaftaran belum aktif (AUTH_SECRET belum di-set di server)." },
      { status: 500 },
    );
  }

  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Nama, email, dan password wajib diisi." },
      { status: 400 },
    );
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
  }
  if (password.length < MIN_VIEWER_PASSWORD_LEN) {
    return NextResponse.json(
      { error: `Password minimal ${MIN_VIEWER_PASSWORD_LEN} karakter.` },
      { status: 400 },
    );
  }

  // Pendaftaran publik hanya untuk penonton; admin punya jalur login sendiri.
  if (await isAdminEmail(email)) {
    return NextResponse.json(
      { error: "Email ini terdaftar sebagai admin. Silakan login lewat halaman masuk." },
      { status: 409 },
    );
  }

  if (await getViewerAccount(email)) {
    return NextResponse.json(
      { error: "Email ini sudah terdaftar. Silakan login." },
      { status: 409 },
    );
  }

  const rec = hashPassword(password);

  // Kode pemulihan: satu-satunya jalan pulih kalau lupa password (project belum
  // bisa kirim email). Yang disimpan hanya hash-nya; kode aslinya dikembalikan
  // SEKALI di response ini dan tak bisa dilihat lagi.
  const recoveryCode = generateRecoveryCode();
  const recovery = hashRecoveryCode(recoveryCode);

  await setViewerAccount(email, {
    hash: rec.hash,
    salt: rec.salt,
    name,
    createdAt: new Date().toISOString(),
    recovery: { hash: recovery.hash, salt: recovery.salt },
  });

  const res = NextResponse.json({
    ok: true,
    role: "viewer",
    email,
    name,
    recoveryCode,
  });
  res.cookies.set(VIEWER_COOKIE, signViewerSession(email), sessionCookieOptions(SESSION_MAX_AGE));
  // Pastikan tak ada sisa cookie admin yang menempel di browser yang sama.
  res.cookies.set(ADMIN_COOKIE, "", sessionCookieOptions(0));
  return res;
}
