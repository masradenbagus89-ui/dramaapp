import { NextRequest, NextResponse } from "next/server";
import { fetchPlaylyUnduhLangsung } from "@/lib/playly";
import { getPlaylyVideosGabungan } from "@/lib/playly-gabungan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Apakah SATU video Playly boleh diunduh, dan di resolusi apa saja.
//
// KONTRAK:
//   Masuk  : query `id` = id video Playly (wajib). Data TAK-TEPERCAYA, divalidasi
//            di bawah lalu dicocokkan ke daftar video yang memang boleh tampil.
//   Keluar : 200 { ok: true, unduh: {url, resolusi[]} | null, alasan }
//            400 id tak terbaca · 404 video bukan bagian katalog kita ·
//            502 Playly tak terjawab. Bentuk gagal selalu { ok: false, error }.
//
// KENAPA ADA: popup "Pilih provider download" (ModalProviderPlayly) menampilkan
// link provider pihak luar yang diisi admin. Baris "Playly" berbeda — datanya
// milik Playly (field `unduh` di /api/public-video), berubah kapan pun pengunggah
// menyalakan/mematikan izin unduh, dan TIDAK ada di /api/videos yang dipakai
// membangun daftar. Jadi ia ditanyakan saat popupnya DIBUKA: 1 panggilan per klik
// penonton, bukan 1 panggilan per video tiap halaman dibangun.
//
// KENAPA LEWAT SERVER, bukan browser penonton langsung ke Playly (seperti contoh
// kode yang diserahkan owner — CORS Playly memang `*`, jadi itu mungkin):
//   1. Alamat dari balasan Playly berakhir di atribut `href`. Penyaringnya
//      (https + wajib domain Playly) butuh daftar domain dari env server
//      (PLAYLY_EMBED_HOSTS) — kalau penyaringan dikerjakan di browser, daftarnya
//      harus ikut dikirim ke browser dan bisa diubah di sana.
//   2. Alamat dasar Playly bisa dipindah lewat env tanpa menyentuh kode
//      (terbukti perlu 2026-09-29 saat Playly pindah Vercel -> Railway).
//   3. Satu pola untuk satu urusan: pemutar sudah menanyakan alamat videonya
//      lewat /api/playly/video. Menambah jalur kedua yang bicara langsung ke
//      Playly dari browser berarti dua tempat berbeda untuk aturan yang sama.
//
// KENAPA cuma alamat yang keluar dari sini, BUKAN byte videonya: situs ini pernah
// MATI TOTAL karena /api/teaser menyalurkan video lewat server (29,71 GB dari
// jatah 10 GB, docs/lintasai/rencana/2026-08-26-vercel-paused-teaser-proxy.md).

/** Id video Playly berupa angka panjang; pola longgar tapi tetap menutup path & query. */
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id")?.trim() ?? "";
  if (!ID_RE.test(id)) {
    return gagal(400, "Id video tidak valid.");
  }

  // GERBANG (rak owasp — IDOR, Top 10 #1): id datang dari browser, jadi tidak
  // boleh dipakai langsung untuk menanyakan apa pun ke Playly. Aturan "boleh
  // tampil" dibaca dari sumber yang SAMA dengan halaman penonton (katalog mitra
  // + video webhook, minus yang disembunyikan admin) — bukan disalin ulang di
  // sini, supaya keduanya tak bisa bergeser sendiri. Tanpa gerbang ini endpoint
  // kita jadi pintu belakang untuk menanyakan status unduhan video kreator mana
  // pun di Playly.
  const { videos } = await getPlaylyVideosGabungan();
  if (!videos.some((v) => v.id === id)) {
    return gagal(404, "Video tidak tersedia.");
  }

  const hasil = await fetchPlaylyUnduhLangsung(id);

  // Playly tak terjawab = kegagalan layanan hulu, jadi 502 — BUKAN 200 berisi
  // "tidak ada unduhan". Keduanya menghasilkan tampilan yang sama bagi penonton
  // (baris Playly tidak digambar), tapi hanya pembedaan ini yang membuat "Playly
  // sedang mati" bisa dibedakan dari "pengunggah tidak mengizinkan" saat ada
  // yang memeriksa nanti.
  if (hasil.alasan === "playly-tak-terjawab") {
    return gagal(502, "Status unduhan sedang tidak bisa diambil dari Playly.", hasil.alasan);
  }

  return NextResponse.json(
    { ok: true, unduh: hasil.unduh, alasan: hasil.alasan },
    {
      // JANGAN disimpan CDN: izin unduh bisa dicabut pengunggah kapan pun, dan
      // balasan tersimpan akan terbaca "masih boleh" sesudah dicabut. Panggilan
      // ke Playly sendiri sudah ditahan di sisi server lewat `revalidate`, jadi
      // ini tidak berarti tiap penonton menambah satu panggilan ke mereka.
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

/** Balasan gagal seragam, sebentuk dengan /api/playly/video. */
function gagal(status: number, pesan: string, alasan?: string) {
  return NextResponse.json(
    alasan ? { ok: false, error: pesan, alasan } : { ok: false, error: pesan },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}
