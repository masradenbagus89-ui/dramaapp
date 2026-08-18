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
/**
 * Cookie sesi PENONTON — sengaja terpisah dari cookie admin supaya jalur admin
 * yang sudah aman tidak ikut tersentuh, dan sesi penonton tak mungkin terbaca
 * sebagai sesi admin.
 */
export const VIEWER_COOKIE = "dramaku_viewer";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari (detik)

type SessionRole = "admin" | "viewer";
type Payload = { email: string; role: SessionRole; exp: number };

function secret(): string {
  return process.env.AUTH_SECRET ?? "";
}

/**
 * True kalau AUTH_SECRET ada. Tanpa ini tanda tangan sesi tak bisa dipercaya,
 * jadi pembuatan sesi HARUS ditolak (gagal-mengunci, bukan gagal-membuka).
 */
export function sessionSecretConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET);
}

/** True kalau konfigurasi auth admin lengkap (password + secret di-set). */
export function adminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.AUTH_SECRET);
}

function hmac(body: string, s: string): string {
  return crypto.createHmac("sha256", s).update(body).digest("base64url");
}

function signSession(email: string, role: SessionRole): string {
  const payload: Payload = {
    email: email.trim().toLowerCase(),
    role,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body, secret())}`;
}

/** Buat token sesi admin untuk email tertentu. */
export function signAdminSession(email: string): string {
  return signSession(email, "admin");
}

/** Buat token sesi PENONTON untuk email tertentu. */
export function signViewerSession(email: string): string {
  return signSession(email, "viewer");
}

/**
 * Verifikasi tanda tangan + masa berlaku + role. `expectedRole` WAJIB cocok:
 * token penonton tak boleh lolos sebagai admin walau tanda tangannya sah.
 */
function verifyToken(token: string, expectedRole: SessionRole): Payload | null {
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
    if (payload.role !== expectedRole) return null;
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
  return verifyAdminSessionToken(
    readCookie(req.headers.get("cookie"), ADMIN_COOKIE),
  );
}

/**
 * Versi yang menerima ISI COOKIE apa adanya (bukan objek Request).
 *
 * Dipakai Server Component: di sana cookie dibaca lewat `cookies()` dari
 * next/headers dan tidak ada objek Request untuk dioper ke getAdminEmail().
 * Pemeriksaannya persis sama — tanda tangan, masa berlaku, role, dan email
 * masih terdaftar sebagai admin.
 */
export async function verifyAdminSessionToken(
  token: string | null | undefined,
): Promise<string | null> {
  if (!token) return null;
  const payload = verifyToken(token, "admin");
  if (!payload) return null;
  return (await isAdminEmail(payload.email)) ? payload.email : null;
}

/** True kalau request membawa sesi admin yang valid. */
export async function isAdminRequest(req: Request): Promise<boolean> {
  return (await getAdminEmail(req)) !== null;
}

/** Email penonton dari cookie sesi terverifikasi, atau null. */
export function getViewerEmail(req: Request): string | null {
  const token = readCookie(req.headers.get("cookie"), VIEWER_COOKIE);
  if (!token) return null;
  return verifyToken(token, "viewer")?.email ?? null;
}

/**
 * Identitas user untuk fitur koin, rating, dan komentar.
 *
 * 🔒 Identitas diambil HANYA dari cookie sesi bertanda tangan.
 *
 * Sebelum Tahap 6 fungsi ini menerima email dari body/URL sebagai cadangan —
 * akibatnya siapa pun bisa membaca saldo dan membelanjakan koin orang lain
 * (IDOR). Parameter itu DIHAPUS, bukan sekadar diabaikan, supaya pemanggil
 * yang masih mengirim email dari klien GAGAL saat build — bukan diam-diam
 * tetap jalan.
 *
 * Catatan: sesi tidak dicek ulang ke database tiap request (cukup tanda tangan
 * + masa berlaku 7 hari). Kalau nanti ada fitur HAPUS akun penonton, tambahkan
 * pengecekan keberadaan akun di sini supaya sesi ikut mati saat akun dihapus.
 */
export async function resolveUserEmail(
  req: Request,
): Promise<{ email: string; isAdmin: boolean } | null> {
  const adminEmail = await getAdminEmail(req);
  if (adminEmail) return { email: adminEmail, isAdmin: true };
  const viewerEmail = getViewerEmail(req);
  if (viewerEmail) return { email: viewerEmail, isAdmin: false };
  return null;
}

/**
 * Opsi cookie untuk Set-Cookie (NextResponse.cookies.set). Dipakai cookie admin
 * MAUPUN penonton — httpOnly supaya tak terbaca JavaScript, sameSite lax supaya
 * tak ikut terkirim pada request lintas-situs (anti-CSRF).
 */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** Nama lama; jalur admin masih memakainya. Sama persis dengan sessionCookieOptions. */
export const adminCookieOptions = sessionCookieOptions;
