import { NextResponse } from "next/server";
import { getPlaylyVideosGabunganCached } from "@/lib/playly-gabungan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/thumb/:id — ALAMAT TETAP untuk gambar sampul sebuah video.
//
// KENAPA ADA (ditemukan 2026-09-26, sesudah rilis `47b307a`). Alamat sampul
// yang dikirim penyedia BERTANDA TANGAN dan mati setelah 6 jam — diukur
// langsung dari produksi: parameter `X-Amz-Expires=21600`. Untuk penonton
// biasa itu tidak terasa (halaman disegarkan tiap 60-300 detik, jauh di bawah
// 6 jam), tapi DUA pemakai menyimpan alamatnya jauh lebih lama:
//
//   - GOOGLE, yang mencatat alamat saat memeriksa halaman lalu memakainya
//     berhari-hari kemudian. Gambar yang sudah mati membuat penanda video
//     dinilai bermasalah — kebalikan dari maksud memasangnya.
//   - PREVIEW SHARE (WhatsApp dsb), yang mengambil gambar saat tautan dibuka
//     penerima. Tautan yang dikirim pagi lalu dibuka malam = pratinjau kosong.
//
// Route ini memberi mereka alamat yang TIDAK PERNAH berubah; alamat bertanda
// tangan yang segar dicarikan di sini, tiap kali diminta.
//
// ⚠️ MENGALIHKAN, BUKAN MENYALURKAN — dan ini bukan pilihan gaya. Situs ini
// pernah MATI TOTAL karena `/api/teaser` menyalurkan byte video lewat server:
// 29,71 GB dari jatah 10 GB, dan Vercel mem-pause seluruh project (lihat
// docs/lintasai/rencana/2026-08-26-vercel-paused-teaser-proxy.md). Di sini yang
// keluar dari server kita cuma penunjuk arah (~300 byte); byte gambarnya
// mengalir langsung dari penyimpanan penyedia ke pemintanya.
//
// Berbeda dari `/api/playly/video` yang sengaja memakai JSON alih-alih
// pengalihan: video memicu banyak permintaan potongan (Range request) saat
// penonton menggeser waktu, sehingga tiap potongan akan menyentuh server kita.
// Gambar tidak begitu — satu permintaan, satu pengalihan, selesai.

/** Bentuk id video Playly; pola longgar tapi tetap menutup path & query. */
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Berapa lama pengalihan ini boleh disimpan CDN.
 *
 * WAJIB jauh di bawah umur tanda tangan tujuannya (6 jam), kalau tidak CDN
 * akan menyajikan penunjuk arah ke alamat yang sudah mati — persis masalah
 * yang sedang diperbaiki, cuma berpindah satu lapis. 5 menit dipilih supaya
 * sama dengan siklus penyegaran katalog (PLAYLY_PUBLIK_TTL_SECONDS).
 */
const CACHE_DETIK = 300;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || !ID_RE.test(id)) {
    return NextResponse.json({ error: "Id video tidak valid." }, { status: 400 });
  }

  // GERBANG (rak owasp §1 — broken access/IDOR): id datang dari luar, jadi
  // tidak boleh dipakai untuk menunjuk berkas apa pun tanpa diperiksa. Daftar
  // yang dipakai SAMA dengan halaman penonton, bukan pencarian bebas ke
  // penyedia — jadi sampul video yang disembunyikan admin atau milik kreator
  // lain tidak bisa diambil lewat sini.
  //
  // Sengaja versi BER-CACHE, berbeda dari gerbang pemutar yang memakai daftar
  // segar. Alasannya jujur: daftar segar berarti tiap permintaan GAMBAR
  // menembak penyedia puluhan kali (satu panggilan detail per video), dan itu
  // mahal untuk taruhan yang jauh lebih rendah — yang bocor paling lama 5
  // menit di sini hanya GAMBAR SAMPUL, bukan videonya. Gerbang pemutar
  // (app/api/playly/video/route.ts) TIDAK ikut dilonggarkan.
  const { videos } = await getPlaylyVideosGabunganCached();
  const video = videos.find((v) => v.id === id);

  // "Tidak ada" dan "tidak boleh dilihat" dibalas SAMA — supaya balasan ini
  // tidak bisa dipakai menebak id mana yang ada di katalog kita.
  if (!video?.thumbnail) {
    return NextResponse.json({ error: "Sampul tidak tersedia." }, { status: 404 });
  }

  return NextResponse.redirect(video.thumbnail, {
    status: 307,
    headers: { "Cache-Control": `public, max-age=0, s-maxage=${CACHE_DETIK}` },
  });
}
