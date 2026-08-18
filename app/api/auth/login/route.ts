import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  isAdminEmail,
  getTwoFA,
  getAdminPassword,
  getViewerAccount,
} from "@/lib/store";
import { verifyPassword } from "@/lib/admin-password";
import { verifyTotp } from "@/lib/totp";
import {
  signAdminSession,
  signViewerSession,
  adminAuthConfigured,
  sessionSecretConfigured,
  sessionCookieOptions,
  ADMIN_COOKIE,
  VIEWER_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function displayName(email: string): string {
  const part = email.split("@")[0].replace(/[._-]/g, " ");
  return part.charAt(0).toUpperCase() + part.slice(1);
}

export async function POST(req: NextRequest) {
  // Login kini benar-benar memeriksa password, jadi wajib dibatasi lajunya —
  // tanpa ini penyerang bisa menebak password berkali-kali (brute-force).
  const blocked = guardMutation(req, {
    bucket: "auth:login",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  try {
    const { email, password, token } = (await req.json()) as {
      email?: string;
      password?: string;
      token?: string;
    };
    const e = String(email ?? "").trim();
    if (!e.includes("@")) {
      return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
    }

    const name = displayName(e);
    const admin = await isAdminEmail(e);

    if (admin) {
      // Login admin: WAJIB password yang benar + konfigurasi lengkap.
      if (!adminAuthConfigured()) {
        return NextResponse.json(
          {
            error:
              "Login admin belum dikonfigurasi (ADMIN_PASSWORD / AUTH_SECRET belum di-set di server).",
          },
          { status: 500 },
        );
      }
      // Password: pakai password PER-AKUN kalau admin ini sudah memasangnya;
      // kalau belum, jatuh ke ADMIN_PASSWORD bersama (jaring pengaman — tak ada
      // admin yang terkunci saat fitur ini baru dipasang).
      const perAccount = await getAdminPassword(e);
      const passOk = perAccount
        ? verifyPassword(password ?? "", perAccount)
        : Boolean(password) && safeEqual(password as string, process.env.ADMIN_PASSWORD ?? "");
      if (!passOk) {
        return NextResponse.json({ error: "Password admin salah." }, { status: 401 });
      }

      // Lapis kedua: kalau admin ini sudah mengaktifkan 2FA, wajib kode TOTP.
      const tf = await getTwoFA(e);
      if (tf.enabled && tf.secret) {
        const t = String(token ?? "").trim();
        if (!t) {
          // Password benar, tapi butuh kode 2FA → minta klien menampilkan input.
          return NextResponse.json({ ok: false, need2fa: true });
        }
        if (!verifyTotp(tf.secret, t)) {
          return NextResponse.json(
            { error: "Kode 2FA salah atau kedaluwarsa.", need2fa: true },
            { status: 401 },
          );
        }
      }

      const res = NextResponse.json({ ok: true, role: "admin", email: e, name });
      res.cookies.set(
        ADMIN_COOKIE,
        signAdminSession(e),
        sessionCookieOptions(SESSION_MAX_AGE),
      );
      // Jangan sisakan sesi penonton di browser yang sama.
      res.cookies.set(VIEWER_COOKIE, "", sessionCookieOptions(0));
      return res;
    }

    // Viewer: WAJIB punya akun terdaftar dengan password yang cocok.
    // (Sebelum Tahap 6 blok ini meloloskan email APA PUN tanpa password.)
    if (!sessionSecretConfigured()) {
      return NextResponse.json(
        { error: "Login belum aktif (AUTH_SECRET belum di-set di server)." },
        { status: 500 },
      );
    }

    const account = await getViewerAccount(e);
    // Pesan sengaja SAMA untuk "akun tak ada" dan "password salah", supaya form
    // ini tak bisa dipakai menebak email mana yang terdaftar (user enumeration).
    if (!account || !verifyPassword(password ?? "", account)) {
      return NextResponse.json(
        { error: "Email atau password salah." },
        { status: 401 },
      );
    }

    const res = NextResponse.json({
      ok: true,
      role: "viewer",
      email: e,
      name: account.name || name,
    });
    res.cookies.set(
      VIEWER_COOKIE,
      signViewerSession(e),
      sessionCookieOptions(SESSION_MAX_AGE),
    );
    res.cookies.set(ADMIN_COOKIE, "", sessionCookieOptions(0));
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
