import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { isAdminEmail } from "@/lib/store";
import {
  signAdminSession,
  adminAuthConfigured,
  adminCookieOptions,
  ADMIN_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/session";

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
  try {
    const { email, password } = (await req.json()) as {
      email?: string;
      password?: string;
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
      const expected = process.env.ADMIN_PASSWORD ?? "";
      if (!password || !safeEqual(password, expected)) {
        return NextResponse.json({ error: "Password admin salah." }, { status: 401 });
      }
      const res = NextResponse.json({ ok: true, role: "admin", email: e, name });
      res.cookies.set(
        ADMIN_COOKIE,
        signAdminSession(e),
        adminCookieOptions(SESSION_MAX_AGE),
      );
      return res;
    }

    // Viewer: tidak ada password tersimpan (akun ringan). Pastikan tidak ada
    // cookie admin yang menempel.
    const res = NextResponse.json({ ok: true, role: "viewer", email: e, name });
    res.cookies.set(ADMIN_COOKIE, "", adminCookieOptions(0));
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
