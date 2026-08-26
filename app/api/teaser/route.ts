import { NextRequest, NextResponse } from "next/server";
import { getVideoBaseUrl } from "@/lib/video-base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Teaser hero & kartu: PENUNJUK ARAH ke file episode di PC backup — bukan
// penyalur isinya.
//
// KENAPA diubah dari proxy jadi redirect (2026-08-26): versi lama menyalurkan
// byte video lewat server (`new NextResponse(upstream.body)`), jadi setiap byte
// cuplikan dihitung Vercel sebagai "Fast Origin Transfer". Hero yang autoplay +
// hover kartu membakar 29,71 GB dari jatah 10 GB dalam ~11 hari → SELURUH
// project di-pause Vercel dan situs mati total (bukan cuma halaman video).
// Dengan 307, yang keluar dari Vercel cuma header alamat (~200 byte); byte
// videonya mengalir langsung dari PC backup ke penonton — persis seperti
// pemutaran episode yang memang sudah begitu (lib/video.ts:12).
//
// KENAPA tetap lewat route ini, bukan alamat tunnel langsung di komponen:
// alamat tunnel berganti tiap PC backup restart, dan komponen client tak bisa
// membaca alamat terbaru karena env NEXT_PUBLIC_* dibakar saat build
// (lib/video-base.ts:60). Route ini membacanya saat REQUEST, jadi cuplikan ikut
// pindah alamat tanpa perlu redeploy.
//
// KEAMANAN (rak owasp — open redirect): tujuan redirect TIDAK berasal dari
// klien. `baseUrl` datang dari getVideoBaseUrl() yang sudah lolos allowlist host
// (isAllowedVideoBase: wajib https, tanpa path/port/kredensial, host di bawah
// suffix yang diizinkan), dan `id`/`ep` divalidasi di bawah. Pemaksaan
// Content-Type yang dulu dilakukan di sini tidak lagi diperlukan: sesudah
// redirect, berkas disajikan oleh origin tunnel — HTML nyasar di sana tak bisa
// jadi XSS di domain kita karena beda origin.
const ID_RE = /^[a-z0-9-]+$/i;

// Cache SENGAJA pendek — JANGAN dipanjangkan. Alamat tunnel berganti tiap PC
// backup restart (sudah 5 kali kambuh, lihat HANDOFF.md), jadi redirect yang
// disimpan lama = teaser menunjuk alamat mati sampai cache kedaluwarsa. 60 detik
// cukup meredam pemanggilan berulang (hemat kuota Fluid Active CPU) tanpa
// membuat alamat basi terasa lama oleh penonton.
const REDIRECT_CACHE = "public, max-age=0, s-maxage=60";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim() ?? "";
  const ep = Number(searchParams.get("ep") ?? "1");
  if (!ID_RE.test(id) || !Number.isInteger(ep) || ep < 1 || ep > 999) {
    return new NextResponse("Parameter tidak valid", { status: 400 });
  }

  const baseUrl = await getVideoBaseUrl();
  // Gagal-AMAN (rak owasp A10): alamat belum ada = 404, JANGAN redirect ke
  // tebakan apa pun. <video> memicu onError → poster hero tetap tampil, jadi
  // kegagalannya terlihat & tidak merusak halaman.
  if (!baseUrl) {
    return new NextResponse("Sumber video belum di-set", { status: 404 });
  }

  const fileName = `${ep}.mp4`;
  const target = `${baseUrl}/${encodeURIComponent(id)}/${encodeURIComponent(fileName)}`;

  // 307, bukan 302: 307 mewajibkan klien mengulang permintaan APA ADANYA —
  // termasuk header `Range` yang dipakai <video> untuk seek & buffering
  // bertahap. Dengan 302 sebagian klien boleh mengubahnya jadi GET polos.
  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: target,
      "Cache-Control": REDIRECT_CACHE,
    },
  });
}
