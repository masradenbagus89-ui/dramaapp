// -------------------------------------------------------------------------
// Session admin ber-tanda-tangan (HMAC-SHA256), tanpa dependency tambahan.
//
// Token = base64url(payload).base64url(HMAC). Disimpan di cookie HttpOnly.
// Route admin memverifikasi tanda tangan cookie ini (BUKAN header yang mudah
// dipalsukan), lalu memastikan email-nya masih terdaftar sebagai admin.
// -------------------------------------------------------------------------
import crypto from "node:crypto";
import { isAdminEmail } from "@/lib/store";

export const ADMIN_COOKIE = "dramaku_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari (detik)

type Payload = { email: string; role: "admin"; exp: number };

function secret(): string {
  return process.env.AUTH_SECRET ?? "";
}

/** True kalau konfigurasi auth admin lengkap (password + secret di-set). */
export function adminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.AUTH_SECRET);
}

function hmac(body: string, s: string): string {
  return crypto.createHmac("sha256", s).update(body).digest("base64url");
}

/** Buat token sesi admin untuk email tertentu. */
export function signAdminSession(email: string): string {
  const payload: Payload = {
    email: email.trim().toLowerCase(),
    role: "admin",
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body, secret())}`;
}

function verifyToken(token: string): Payload | null {
  const s = secret();
  if (!s) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(body, s);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf-8"),
    ) as Payload;
    if (payload.role !== "admin") return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

/**
 * Email admin terverifikasi dari cookie sesi, atau null.
 * Memvalidasi: tanda tangan HMAC, belum kedaluwarsa, role=admin, DAN email
 * masih ada di daftar admin (mencabut admin = langsung kehilangan akses).
 */
export async function getAdminEmail(req: Request): Promise<string | null> {
  const token = readCookie(req.headers.get("cookie"), ADMIN_COOKIE);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return (await isAdminEmail(payload.email)) ? payload.email : null;
}

/** True kalau request membawa sesi admin yang valid. */
export async function isAdminRequest(req: Request): Promise<boolean> {
  return (await getAdminEmail(req)) !== null;
}

/** Opsi cookie untuk Set-Cookie (NextResponse.cookies.set). */
export function adminCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
