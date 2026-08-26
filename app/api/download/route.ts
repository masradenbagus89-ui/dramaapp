import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getVideoBaseUrl } from "@/lib/video-base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Unduh episode: PENUNJUK ARAH ke tunnel (produksi) atau baca berkas lokal (dev).
//
// KENAPA diubah dari proxy jadi redirect (2026-08-26): versi lama menyalurkan
// isi episode lewat server (`new NextResponse(upstream.body)`) — satu unduhan
// 300 MB = 3% jatah bulanan Vercel terbakar sekaligus. Route ini memang jarang
// terpakai (lib/video.ts:21 sudah mengarahkan tombol Unduh LANGSUNG ke tunnel
// selama alamatnya ada), tapi justru itu bahayanya: ia jalur cadangan yang
// menyala persis saat keadaan sedang kacau — dan waktu itu tak ada yang
// mengawasi kuota. Dibereskan sekarang selagi murah.
//
// KENAPA paksa-unduh tetap jalan sesudah redirect: `?dl=1` ditangani Caddy di
// PC backup dengan `header Content-Disposition "attachment"`
// (pc-backup-agent/Caddyfile:22-26), jadi HP tetap MENGUNDUH sampai tuntas —
// bukan sekadar membuka video di tab. Itu juga alasan batas 60 detik fungsi
// Vercel tak lagi relevan untuk jalur produksi: berkasnya tak lewat sini.
//
// KEAMANAN (rak owasp — open redirect): tujuan redirect tidak berasal dari
// klien. `baseUrl` sudah lolos allowlist host di lib/video-base.ts, `id`/`ep`
// divalidasi di bawah.
const ID_RE = /^[a-z0-9-]+$/i;

// Sama pendeknya dengan /api/teaser dan untuk alasan yang sama: alamat tunnel
// berganti tiap PC backup restart, jadi redirect JANGAN disimpan lama.
const REDIRECT_CACHE = "public, max-age=0, s-maxage=60";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim() ?? "";
  const ep = Number(searchParams.get("ep"));
  if (!ID_RE.test(id) || !Number.isInteger(ep) || ep < 1 || ep > 999) {
    return new NextResponse("Parameter tidak valid", { status: 400 });
  }

  const fileName = `${ep}.mp4`;
  const baseUrl = await getVideoBaseUrl();

  if (baseUrl) {
    const target = `${baseUrl}/${encodeURIComponent(id)}/${encodeURIComponent(fileName)}?dl=1`;
    return new NextResponse(null, {
      status: 307,
      headers: { Location: target, "Cache-Control": REDIRECT_CACHE },
    });
  }

  // Tanpa tunnel = mode lokal/dev: baca dari public/videos. Jalur ini TIDAK
  // pernah aktif di Vercel (filesystem-nya read-only dan folder itu tak berisi
  // video), jadi tak ada byte besar yang bisa lewat sini di produksi.
  try {
    const p = join(process.cwd(), "public", "videos", id, fileName);
    const buf = await readFile(p);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `attachment; filename="${id}-ep${ep}.mp4"`,
      },
    });
  } catch {
    // Gagal-AMAN (rak owasp A10): sumber tak terjangkau = 502 apa adanya,
    // jangan menebak alamat lain.
    return new NextResponse(
      "Video tidak ditemukan atau sumber (PC backup) sedang mati.",
      { status: 502 },
    );
  }
}
