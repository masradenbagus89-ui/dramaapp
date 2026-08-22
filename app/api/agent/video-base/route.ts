// -------------------------------------------------------------------------
// Endpoint lapor-alamat dari PC backup. TITIK-RISIKO.
//
// Yang dilakukan: PC backup memberi tahu alamat tunnel barunya, lalu seluruh
// situs langsung memakai alamat itu TANPA redeploy. Ini yang menghentikan
// siklus "video mati tiap PC restart sampai owner menempel alamat manual".
//
// KENAPA DIPAGARI KETAT — ini sebenarnya jalur SSRF-tersimpan (stored SSRF):
// alamat yang disimpan di sini nanti di-fetch oleh SERVER kita sendiri
// (app/api/teaser/route.ts:31, subtitle, download) DAN dikirim ke browser semua
// penonton. Satu POST yang berhasil bisa:
//   - mengarahkan seluruh pengunjung ke server milik penyerang, atau
//   - menyuruh server kita menembak alamat internal / metadata cloud.
// Tiga lapis penjaga, semuanya wajib:
//   1. pembatas laju 2 kunci (per-IP + global) — lihat catatan XFF di bawah
//   2. banding rahasia yang tidak bocor lewat selisih waktu maupun panjang
//   3. allowlist host — inilah yang memblokir localhost/169.254.169.254/IP internal
// Menghapus salah satunya membuka lubang yang tak terlihat di layar mana pun.
// -------------------------------------------------------------------------
import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { isAdminRequest } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import {
  isAllowedVideoBase,
  normalizeVideoBase,
  parseAllowedSuffixes,
} from "@/lib/video-base";
import { getVideoBaseRecord, setVideoBaseRecord } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Longgar untuk retry PC backup, ketat untuk penebakan. */
const LIMIT_IP = 20;
/**
 * Plafon GLOBAL. Ada karena `x-forwarded-for` bisa dipalsukan penyerang, jadi
 * kunci per-IP saja bisa diputar tanpa batas dengan mengganti-ganti header
 * (skills/owasp/SKILL.md §1: jangan percaya X-Forwarded-For buta untuk
 * rate-limit). Angkanya di atas kebutuhan wajar PC backup (beberapa kali
 * sehari), tapi jauh di bawah yang dibutuhkan untuk menebak rahasia.
 */
const LIMIT_GLOBAL = 60;
const WINDOW_MS = 60_000;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  // Rantai "klien, proxy1, proxy2" — yang pertama klien asli menurut Vercel.
  // Tetap dianggap usaha-terbaik saja, bukan identitas tepercaya.
  return fwd?.split(",")[0]?.trim() || "tanpa-ip";
}

/**
 * Banding rahasia anti-tebak-waktu. Kedua sisi di-hash SHA-256 dulu supaya
 * panjangnya selalu sama — kalau langsung membandingkan panjang buffer mentah
 * (pola lama di lib/session.ts:78), penyerang bisa menyimpulkan panjang rahasia
 * dari respons yang berbeda.
 */
function secretCocok(dikirim: string, asli: string): boolean {
  const a = createHash("sha256").update(dikirim).digest();
  const b = createHash("sha256").update(asli).digest();
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const perIp = rateLimit(`video-base:ip:${clientIp(req)}`, LIMIT_IP, WINDOW_MS);
  const global = rateLimit("video-base:global", LIMIT_GLOBAL, WINDOW_MS);
  if (!perIp.allowed || !global.allowed) {
    const retry = Math.max(perIp.retryAfterSec, global.retryAfterSec);
    return NextResponse.json(
      { error: "Terlalu sering. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  const asli = process.env.HARDLINK_AGENT_SECRET;
  if (!asli) {
    // Sengaja eksplisit + gagal-TUTUP: kalau senyap, PC backup mengira laporannya
    // sukses padahal alamat tak pernah tersimpan (kerusakan senyap, AGENTS.md 3.7).
    return NextResponse.json(
      {
        error:
          "HARDLINK_AGENT_SECRET belum di-set di env Vercel. Set token yang sama dengan yang dipakai agent di PC backup.",
      },
      { status: 500 },
    );
  }

  const dikirim = req.headers.get("x-agent-secret") ?? "";
  if (!secretCocok(dikirim, asli)) {
    // 401 = belum terbukti siapa (bukan 403 "sudah dikenal tapi tak berhak").
    return NextResponse.json(
      { error: "Unauthorized: x-agent-secret tidak cocok." },
      { status: 401 },
    );
  }

  let body: { baseUrl?: unknown };
  try {
    body = (await req.json()) as { baseUrl?: unknown };
  } catch {
    return NextResponse.json({ error: "Body harus JSON." }, { status: 400 });
  }

  // Hanya field yang dibutuhkan yang dibaca — bukan spread body mentah
  // (cegah mass assignment).
  const raw = typeof body.baseUrl === "string" ? body.baseUrl.trim() : "";
  if (!raw) {
    return NextResponse.json({ error: "baseUrl wajib diisi." }, { status: 400 });
  }

  const suffixes = parseAllowedSuffixes(process.env.VIDEO_BASE_ALLOWED_SUFFIXES);
  if (!isAllowedVideoBase(raw, suffixes)) {
    return NextResponse.json(
      {
        error:
          "baseUrl ditolak. Wajib https, tanpa path/port/kredensial, dan host-nya harus ada di daftar yang diizinkan.",
        diizinkan: suffixes,
      },
      { status: 400 },
    );
  }

  const url = normalizeVideoBase(raw);
  const updatedAt = new Date().toISOString();
  try {
    await setVideoBaseRecord({ url, updatedAt, source: "agent" });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Gagal menyimpan alamat ke database: ${m}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, url, updatedAt });
}

/** Lihat alamat yang sedang berlaku + kapan terakhir berubah. Khusus admin. */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rec = await getVideoBaseRecord();
  const fallbackEnv = normalizeVideoBase(
    process.env.NEXT_PUBLIC_VIDEO_BASE_URL ?? "",
  );
  return NextResponse.json({
    tersimpan: rec,
    fallbackEnv,
    dipakai: rec?.url ? normalizeVideoBase(rec.url) : fallbackEnv,
  });
}
