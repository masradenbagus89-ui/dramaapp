import { NextRequest, NextResponse } from "next/server";
import { getVideoBaseUrl } from "@/lib/video-base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Teaser hero: potongan awal file episode, same-origin + dukung Range.
// Hanya fetch ke VIDEO_BASE_URL yang sudah di-set (bukan URL dari klien) → bukan SSRF terbuka.
const ID_RE = /^[a-z0-9-]+$/i;
const TEASER_BYTES = 8 * 1024 * 1024; // ~8 MB cukup untuk cuplikan awal

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim() ?? "";
  const ep = Number(searchParams.get("ep") ?? "1");
  if (!ID_RE.test(id) || !Number.isInteger(ep) || ep < 1 || ep > 999) {
    return new NextResponse("Parameter tidak valid", { status: 400 });
  }

  const baseUrl = await getVideoBaseUrl();
  if (!baseUrl) {
    return new NextResponse("Sumber video belum di-set", { status: 404 });
  }

  const fileName = `${ep}.mp4`;
  const url = `${baseUrl}/${encodeURIComponent(id)}/${encodeURIComponent(fileName)}`;
  const clientRange = req.headers.get("range");
  const upstreamHeaders: HeadersInit = clientRange ? { Range: clientRange } : {};

  try {
    const upstream = await fetch(url, {
      headers: upstreamHeaders,
      cache: "no-store",
      // JANGAN ikuti redirect: allowlist host hanya memeriksa alamat AWAL, jadi
      // upstream yang membalas 302 ke http://169.254.169.254 (metadata cloud) atau
      // IP internal akan menembus pagar itu. Penyaji video sah (Caddy file server)
      // tidak pernah butuh redirect, jadi 3xx = tolak.
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse("Teaser tidak ada", { status: 404 });
    }
    if (!upstream.body) {
      return new NextResponse("Teaser kosong", { status: 502 });
    }

    const headers = new Headers();
    // Content-Type DIPAKSA, tidak disalin dari upstream: jalur ini same-origin,
    // jadi kalau upstream mengaku "text/html" browser akan merendernya sebagai
    // halaman DI DOMAIN KITA (jalan masuk XSS). Yang boleh keluar dari sini cuma
    // video. Kalau sumbernya ternyata bukan video, <video> gagal memutar — itu
    // kegagalan yang aman dan terlihat.
    headers.set("Content-Type", "video/mp4");
    headers.set("X-Content-Type-Options", "nosniff");
    const len = upstream.headers.get("Content-Length");
    if (len) headers.set("Content-Length", len);
    const cr = upstream.headers.get("Content-Range");
    if (cr) headers.set("Content-Range", cr);
    const ar = upstream.headers.get("Accept-Ranges");
    headers.set("Accept-Ranges", ar || "bytes");
    headers.set("Cache-Control", "public, max-age=60");
    headers.set("Content-Disposition", "inline");

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return new NextResponse("Sumber video sedang mati", { status: 502 });
  }
}
