import { NextRequest, NextResponse } from "next/server";
import { fetchPlaylyVideoUrl } from "@/lib/playly";
import { getPlaylyVideosPublik } from "@/lib/playly-publik";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Penunjuk arah ke berkas video Playly -- BUKAN penyalur isinya.
//
// KENAPA ADA: sejak 2026-09-09 halaman /playly memutar video dengan pemutar
// DramaKu sendiri (bukan lagi <iframe> Playly), supaya menu titik tiga di
// pemutar bisa kita isi sendiri. Pemutar butuh alamat berkas mp4-nya, dan
// alamat itu hanya boleh dirakit di server: ia bertanda tangan, berumur pendek,
// dan diambil memakai setelan PLAYLY_API_URL yang tidak dikirim ke browser.
//
// KENAPA JSON, bukan menyalurkan videonya: situs ini pernah MATI TOTAL karena
// /api/teaser menyalurkan byte video lewat server -- 29,71 GB dari jatah 10 GB
// dan Vercel mem-pause seluruh project (lihat
// docs/lintasai/rencana/2026-08-26-vercel-paused-teaser-proxy.md). Di sini yang
// keluar dari Vercel cuma alamatnya (~300 byte); byte videonya mengalir
// langsung dari penyimpanan Playly ke penonton.
//
// KENAPA JSON, bukan 307 redirect seperti teaser: memutar video memicu banyak
// permintaan potongan (Range request) untuk seek. Dengan redirect setiap
// potongan menyentuh server kita; dengan JSON server disentuh SEKALI per video
// yang diklik, sisanya penonton bicara langsung ke penyimpanan Playly.

/** Id video Playly berupa angka panjang; pola longgar tapi tetap menutup path & query. */
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id")?.trim() ?? "";
  if (!ID_RE.test(id)) {
    return gagal(400, "Id video tidak valid.");
  }

  // GERBANG (rak owasp -- IDOR): id datang dari browser, jadi tidak boleh
  // dipakai langsung untuk menanyakan berkas apa pun ke Playly. Video yang
  // disembunyikan admin atau milik kreator lain HARUS ditolak di sini; tanpa
  // gerbang ini endpoint kita berubah jadi pintu belakang ke seluruh katalog
  // Playly. Aturan "boleh tampil" sengaja dibaca dari sumber yang sama dengan
  // halaman penonton, bukan disalin ulang.
  const { videos } = await getPlaylyVideosPublik();
  if (!videos.some((v) => v.id === id)) {
    return gagal(404, "Video tidak tersedia.");
  }

  const videoUrl = await fetchPlaylyVideoUrl(id);
  if (!videoUrl) {
    return gagal(502, "Alamat video sedang tidak bisa diambil dari Playly.");
  }

  return NextResponse.json(
    { ok: true, videoUrl },
    {
      // JANGAN disimpan CDN: alamatnya bertanda tangan & berumur ~6 jam.
      // Menyimpannya berarti suatu saat penonton menerima alamat yang sudah
      // kedaluwarsa dan videonya gagal diputar tanpa sebab yang terlihat.
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

/** Balasan gagal seragam; pesannya untuk ditampilkan apa adanya di pemutar. */
function gagal(status: number, pesan: string) {
  return NextResponse.json({ ok: false, error: pesan }, { status });
}
