import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  isAdminEmail,
  getAdminPassword,
  getViewerAccount,
} from "@/lib/store";
import { verifyPassword } from "@/lib/admin-password";
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
import {
  nextAman,
  tujuanSetelahMasuk,
  type KodeGalatLogin,
} from "@/lib/tujuan-login";

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

function modeJson(req: NextRequest): boolean {
  return (req.headers.get("content-type") ?? "").includes("application/json");
}

function teksForm(nilai: FormDataEntryValue | null): string {
  return typeof nilai === "string" ? nilai : "";
}

/**
 * Dasar alamat balasan.
 *
 * Next di komputer ini menulis `req.url` sebagai localhost walau browser
 * membuka 127.0.0.1. Cookie login nempel di host yang MEMBALAS, lalu browser
 * mengikuti Location ke host lain dan cookie tidak ikut — panel tetap
 * "Akses ditolak". Untuk loopback, pakai Host yang benar-benar dikirim browser.
 * Host lain tidak dipercaya (cegah diarahkan ke situs luar).
 */
function basis(req: NextRequest): string {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  if (
    host === "127.0.0.1:3010" ||
    host === "localhost:3010" ||
    host === "127.0.0.1:3000" ||
    host === "localhost:3000"
  ) {
    return `http://${host}`;
  }
  return new URL(req.url).origin;
}

/** Alamat /login di host yang sama. Kode galat saja — bukan kalimat, bukan password. */
function urlLogin(
  req: NextRequest,
  galat: KodeGalatLogin | null,
  next: string | null,
): URL {
  const url = new URL("/login", `${basis(req)}/`);
  if (galat) url.searchParams.set("galat", galat);
  if (next) url.searchParams.set("next", next);
  return url;
}

function urlTujuan(req: NextRequest, path: string): URL {
  return new URL(path, `${basis(req)}/`);
}

function gagal(
  req: NextRequest,
  json: boolean,
  status: number,
  error: string,
  galat: KodeGalatLogin,
  next: string | null,
) {
  if (json) return NextResponse.json({ error }, { status });
  return NextResponse.redirect(urlLogin(req, galat, next), 303);
}

function pasangSesi(
  res: NextResponse,
  role: "admin" | "viewer",
  email: string,
) {
  if (role === "admin") {
    res.cookies.set(
      ADMIN_COOKIE,
      signAdminSession(email),
      sessionCookieOptions(SESSION_MAX_AGE),
    );
    res.cookies.set(VIEWER_COOKIE, "", sessionCookieOptions(0));
    return;
  }
  res.cookies.set(
    VIEWER_COOKIE,
    signViewerSession(email),
    sessionCookieOptions(SESSION_MAX_AGE),
  );
  res.cookies.set(ADMIN_COOKIE, "", sessionCookieOptions(0));
}

export async function POST(req: NextRequest) {
  // Login kini benar-benar memeriksa password, jadi wajib dibatasi lajunya —
  // tanpa ini penyerang bisa menebak password berkali-kali (brute-force).
  const json = modeJson(req);
  const blocked = guardMutation(req, {
    bucket: "auth:login",
    limit: 10,
    windowMs: 60_000,
  });
  if (blocked) {
    if (json) return blocked;
    const galat: KodeGalatLogin = blocked.status === 429 ? "limit" : "asal";
    return NextResponse.redirect(urlLogin(req, galat, null), 303);
  }

  let next: string | null = null;
  try {
    let email = "";
    let password = "";
    if (json) {
      const body = (await req.json()) as {
        email?: string;
        password?: string;
        next?: string;
      };
      email = String(body.email ?? "").trim();
      password = String(body.password ?? "");
      next = nextAman(body.next);
    } else {
      // Form biasa: tombol Masuk tetap jalan walau JavaScript halaman belum
      // menempel. Tanpa cabang ini browser cuma memuat ulang /login? dan
      // password tidak pernah sampai ke pemeriksaan.
      const form = await req.formData();
      email = teksForm(form.get("email")).trim();
      password = teksForm(form.get("password"));
      next = nextAman(teksForm(form.get("next")));
    }

    if (!email || !password) {
      return gagal(req, json, 400, "Email dan password wajib diisi.", "kosong", next);
    }
    if (!email.includes("@")) {
      return gagal(req, json, 400, "Format email tidak valid.", "format", next);
    }

    const name = displayName(email);
    const admin = await isAdminEmail(email);

    if (admin) {
      // Login admin: WAJIB password yang benar + konfigurasi lengkap.
      if (!adminAuthConfigured()) {
        return gagal(
          req,
          json,
          500,
          "Login admin belum dikonfigurasi (ADMIN_PASSWORD / AUTH_SECRET belum di-set di server).",
          "config",
          next,
        );
      }
      // Password: pakai password PER-AKUN kalau admin ini sudah memasangnya;
      // kalau belum, jatuh ke ADMIN_PASSWORD bersama (jaring pengaman — tak ada
      // admin yang terkunci saat fitur ini baru dipasang).
      const perAccount = await getAdminPassword(email);
      const passOk = perAccount
        ? verifyPassword(password, perAccount)
        : Boolean(password) && safeEqual(password, process.env.ADMIN_PASSWORD ?? "");
      if (!passOk) {
        return gagal(req, json, 401, "Password admin salah.", "admin", next);
      }

      // Lapis kedua (2FA/TOTP) DIHAPUS 2026-11-13 atas permintaan owner.
      // Password yang benar kini satu-satunya syarat masuk panel admin.
      // Pagar yang TETAP berdiri di jalur ini: rate-limit 10 percobaan/menit
      // (guardMutation di atas), perbandingan password tahan-waktu, dan
      // gagal-TUTUP di blok catch — ketiganya sengaja tidak ikut dilepas.
      const res = json
        ? NextResponse.json({ ok: true, role: "admin", email, name })
        : NextResponse.redirect(
            urlTujuan(req, tujuanSetelahMasuk("admin", next)),
            303,
          );
      pasangSesi(res, "admin", email);
      return res;
    }

    // Viewer: WAJIB punya akun terdaftar dengan password yang cocok.
    // (Sebelum Tahap 6 blok ini meloloskan email APA PUN tanpa password.)
    if (!sessionSecretConfigured()) {
      return gagal(
        req,
        json,
        500,
        "Login belum aktif (AUTH_SECRET belum di-set di server).",
        "sesi",
        next,
      );
    }

    const account = await getViewerAccount(email);
    // Pesan sengaja SAMA untuk "akun tak ada" dan "password salah", supaya form
    // ini tak bisa dipakai menebak email mana yang terdaftar (user enumeration).
    if (!account || !verifyPassword(password, account)) {
      return gagal(req, json, 401, "Email atau password salah.", "akun", next);
    }

    const res = json
      ? NextResponse.json({
          ok: true,
          role: "viewer",
          email,
          name: account.name || name,
        })
      : NextResponse.redirect(
          urlTujuan(req, tujuanSetelahMasuk("viewer", next)),
          303,
        );
    pasangSesi(res, "viewer", email);
    return res;
  } catch (err) {
    // Pesan mentah TIDAK boleh diteruskan ke browser. Saat Supabase mati,
    // isinya halaman error Cloudflare ribuan karakter — tak terbaca penonton,
    // sekaligus membocorkan detail internal (host, jalur, versi). Terjadi
    // nyata 2026-09-16: seluruh HTML "522 Connection timed out" tercetak di
    // kotak merah halaman login. Cukup dicatat di log server.
    console.error("[auth/login] gagal diproses:", err);

    // Bedakan "database sedang mati" dari error lain. Ini penting bagi
    // penonton: tanpa pembeda, satu-satunya tebakan yang masuk akal baginya
    // adalah "password saya salah" — lalu ia mencoba berulang kali sia-sia.
    const gangguanDatabase =
      err instanceof Error && err.message.startsWith("Supabase ");

    // Gagal-TUTUP (OWASP A10:2025): apa pun sebabnya, TIDAK ada sesi yang
    // diterbitkan di jalur ini — error tak boleh jadi pintu masuk.
    return gagal(
      req,
      json,
      gangguanDatabase ? 503 : 500,
      gangguanDatabase
        ? "Server database sedang tidak merespons, jadi login belum bisa diproses. Ini BUKAN karena email atau password kamu salah — coba lagi beberapa menit lagi."
        : "Login gagal diproses karena gangguan di server. Coba lagi beberapa saat lagi.",
      gangguanDatabase ? "database" : "server",
      next,
    );
  }
}
