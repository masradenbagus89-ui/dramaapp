import { NextRequest, NextResponse } from "next/server";
import { getVideoBaseUrl } from "@/lib/video-base";
import { videoSrc } from "@/lib/video";
import { tandaTanganiUrlVideo } from "@/lib/video-signature";
import {
  balasanAksesDitolak,
  periksaAksesEpisode,
} from "@/lib/paywall-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PENERBIT alamat video ber-tanda-tangan — bukan penyalur, bukan pengalih.
//
// KENAPA ADA (temuan 2026-10-27, diukur di produksi): sampai hari ini pemutar
// MERAKIT SENDIRI alamat video di browser (`srcFor`, FeedPlayer.tsx:114 lewat
// `videoSrc`), sehingga alamat episode BERBAYAR ikut tercetak ke HTML dan
// terbaca siapa pun dari View Source — lalu tunnel melayaninya tanpa syarat
// (diuji: 206, `video/mp4`, isi diawali `ftypmp42`). Gerbang 24 Oktober
// (`lib/paywall-guard.ts`) hanya menjaga jalur API; batas itu ditulis terus
// terang di berkas tersebut baris 11-19. Route ini menutup jalur keduanya:
// alamat hanya LAHIR setelah gerbang yang sama dilewati.
//
// ⚠️ KENAPA JSON — BUKAN menyalurkan byte, DAN BUKAN 307. Jangan "disederhanakan"
// jadi redirect:
//   * menyalurkan byte = persis yang membuat situs MATI TOTAL 2026-08-26
//     (29,71 GB dari jatah 10 GB, Vercel mem-pause seluruh project — lihat
//     docs/lintasai/rencana/2026-08-26-vercel-paused-teaser-proxy.md);
//   * 307 di SINI berbeda bahaya dari 307 di /api/teaser. Memutar video memicu
//     banyak permintaan potongan (Range request) saat penonton menggeser waktu,
//     dan tiap potongan akan menyentuh server kita — sementara /api/teaser
//     dipanggil sekali per pemutaran. Alasan yang sama membuat
//     app/api/playly/video/route.ts:24-27 memilih JSON. Ikuti pola itu.
// Yang keluar dari sini cuma alamat (~300 byte); byte videonya mengalir
// langsung dari PC backup ke penonton.
//
// KEAMANAN (rak owasp — open redirect/IDOR): tujuan TIDAK berasal dari klien.
// `baseUrl` datang dari getVideoBaseUrl() yang sudah lolos allowlist host, dan
// `id`/`ep`/`res` divalidasi di bawah sebelum menyentuh apa pun.

/** Sama dengan /api/teaser & /api/download — id slug aman. */
const ID_RE = /^[a-z0-9-]+$/i;

/**
 * Kode resolusi. Sengaja memvalidasi BENTUK (`360p`, `720p`, ...), bukan
 * menyalin daftar dari app/components/player/PlayerSettings.tsx:13-18 —
 * daftar yang disalin akan melenceng diam-diam begitu UI menambah pilihan
 * baru, dan yang rusak adalah pemutaran, tanpa pesan error (§3.3).
 */
const RES_RE = /^(\d{3,4}p)?$/;

/**
 * Jawaban ini BERGANTUNG PADA SIAPA yang bertanya dan memuat tanda tangan
 * berumur pendek. `private, no-store` wajib: satu saja disimpan CDN, alamat
 * milik penonton yang sudah bayar akan disajikan ulang ke orang lain — itu
 * membatalkan pagarnya. Alasan & kata-kata yang sama dengan
 * app/api/teaser/route.ts:46-54.
 */
const CACHE_PER_ORANG = "private, no-store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim() ?? "";
  const epRaw = searchParams.get("ep")?.trim() ?? "";
  const res = searchParams.get("res")?.trim() ?? "";
  const ep = Number(epRaw);

  if (
    !ID_RE.test(id) ||
    !RES_RE.test(res) ||
    !Number.isInteger(ep) ||
    ep < 1 ||
    ep > 999
  ) {
    return NextResponse.json(
      { error: "Parameter tidak valid." },
      { status: 400, headers: { "Cache-Control": CACHE_PER_ORANG } },
    );
  }

  // GERBANG PAYWALL — sebelum alamat dicari sama sekali, supaya pemanggil yang
  // tak berhak tidak ikut diberi tahu alamat sumber videonya. Aturannya SAMA
  // dengan /api/teaser & UI karena ketiganya memakai ulang fungsi yang sama.
  const akses = await periksaAksesEpisode(req, id, ep);
  if (akses !== "boleh") {
    const { pesan, status } = balasanAksesDitolak(akses);
    return NextResponse.json(
      { error: pesan },
      { status, headers: { "Cache-Control": CACHE_PER_ORANG } },
    );
  }

  const baseUrl = await getVideoBaseUrl();

  // Mode lokal/dev (tanpa tunnel): videoSrc memulangkan alamat RELATIF
  // `/videos/...` yang tak bisa ditandatangani — dan memang tak perlu, karena
  // di situ tidak ada Caddy yang memeriksa. Dikembalikan apa adanya supaya
  // pengembangan lokal tetap jalan.
  if (!baseUrl) {
    return NextResponse.json(
      { url: videoSrc("", id, ep, res) },
      { headers: { "Cache-Control": CACHE_PER_ORANG } },
    );
  }

  const url = tandaTanganiUrlVideo(
    videoSrc(baseUrl, id, ep, res),
    Math.floor(Date.now() / 1000),
  );

  return NextResponse.json(
    { url },
    { headers: { "Cache-Control": CACHE_PER_ORANG } },
  );
}
