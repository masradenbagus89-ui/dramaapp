import { NextRequest, NextResponse } from "next/server";
import {
  parseWebhookPayload,
  readWebhookSecret,
  verifyWebhookRequest,
} from "@/lib/playly-webhook";
import {
  setPlaylyWebhookVideoStatus,
  upsertPlaylyWebhookVideo,
  type PlaylyWebhookVideo,
} from "@/lib/store";

// runtime "nodejs" WAJIB: verifikasi memakai node:crypto, yang tidak tersedia
// di Edge runtime. Tanpa baris ini route bisa gagal di produksi walau lolos di
// komputer sendiri.
export const runtime = "nodejs";
// Webhook tidak boleh disimpan/di-cache — tiap panggilan adalah kejadian baru.
export const dynamic = "force-dynamic";

/** Balasan webhook TIDAK PERNAH boleh di-cache — tiap ketukan kejadian baru. */
const TANPA_CACHE = { "Cache-Control": "no-store" } as const;

function balas(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: TANPA_CACHE });
}

/**
 * Catat kegagalan tak terduga ke log server — JANGAN pernah ikut menyertakan
 * badan permintaan atau isi header di sini: keduanya membawa kunci rahasia, dan
 * apa pun yang masuk log ikut terbaca siapa pun yang bisa membuka log Vercel.
 */
function catatError(tahap: string, err: unknown): void {
  const pesan = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  console.error(`[playly-webhook] gagal di tahap ${tahap}: ${pesan}`);
}

// POST /api/webhooks/playly — dipanggil OLEH Playly saat ada video baru atau
// video yang ditarik. Daftarkan alamat ini di sisi Playly:
//   https://<domain>/api/webhooks/playly
//
// Urutan di bawah tidak boleh ditukar — tiap langkah menutup lubang langkah
// sebelumnya (pola yang sama dipakai /api/coins/webhook untuk Midtrans, dan
// diminta skills/pembayaran/SKILL.md §2 butir 4):
//   1. baca badan MENTAH   -> supaya tanda-tangan bisa dihitung dari byte asli
//   2. verifikasi pengirim -> tolak 401 SEBELUM menyentuh penyimpanan
//   3. baru parse + simpan
//   4. balas 200 singkat   -> supaya Playly berhenti mengirim ulang
export async function POST(req: NextRequest) {
  const secret = readWebhookSecret();
  if (!secret) {
    // 503, bukan 401: ini salah SETELAN DI SISI KITA, bukan pengirim yang
    // mencurigakan. Bedanya penting untuk Playly — 503 berarti "coba lagi
    // nanti", jadi notifikasi yang tertahan tetap masuk begitu secret dipasang,
    // sedangkan 401 akan mereka baca sebagai "ditolak permanen".
    return balas(
      { ok: false, error: "PLAYLY_WEBHOOK_SECRET belum di-set di server." },
      503,
    );
  }

  // (1) BADAN MENTAH. Jangan pernah ganti dengan req.json() di sini: begitu
  // JSON-nya di-parse, byte aslinya hilang dan tanda-tangan yang SAH pun tidak
  // akan pernah cocok lagi.
  //
  // Dibungkus try: koneksi yang putus di tengah pengiriman membuat req.text()
  // MELEMPAR, dan error yang tak tertangkap di sini akan keluar sebagai
  // halaman error 500 Next.js — bukan JSON yang bisa dibaca Playly.
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    catatError("membaca badan permintaan", err);
    return balas({ ok: false, error: "Badan permintaan tidak terbaca." }, 400);
  }

  // (2) Gerbangnya. Di bawah baris ini barulah isi payload boleh dipercaya.
  const verifikasi = verifyWebhookRequest(rawBody, req.headers, secret);
  if (!verifikasi.ok) {
    // Pesannya sengaja tidak merinci apa yang salah (header hilang? bentuknya
    // keliru? nilainya beda?) — keterangan itu cuma menolong orang yang sedang
    // menebak-nebak kuncinya.
    return balas({ ok: false, error: "Tidak terverifikasi sebagai Playly." }, 401);
  }

  // (3) Isi payload baru diperiksa di sini. Pesan error boleh terperinci:
  // yang membacanya dipastikan Playly, karena hanya mereka yang bisa melewati
  // gerbang di atas — dan keterangan jelas mempercepat perbaikan integrasi.
  //
  // parseWebhookPayload sudah menangkap JSON rusak sendiri (mengembalikan
  // ok:false, bukan melempar); try di sini menjaring sisanya — mis. env
  // PLAYLY_EMBED_HOSTS yang isinya bikin readPlaylyConfig gagal.
  let hasil: ReturnType<typeof parseWebhookPayload>;
  try {
    hasil = parseWebhookPayload(rawBody);
  } catch (err) {
    catatError("membaca isi payload", err);
    return balas({ ok: false, error: "Isi notifikasi tidak bisa diproses." }, 400);
  }

  if (!hasil.ok) {
    if (hasil.abaikan) {
      // Kejadian yang belum kita tangani. Balas 200 supaya Playly menganggapnya
      // terkirim; kalau dibalas error, mereka akan mengulanginya terus.
      return balas({ ok: true, ignored: hasil.error });
    }
    return balas({ ok: false, error: hasil.error }, 400);
  }

  const { payload } = hasil;
  const receivedAt = new Date().toISOString();

  // Penyimpanan dibungkus try sendiri: Supabase bisa time-out atau menolak, dan
  // kalau itu terjadi Playly HARUS menerima 500 (= "gagal, kirim ulang nanti"),
  // bukan 200 yang membuat mereka menganggap video sudah masuk padahal tidak.
  // Kegagalan senyap di sini berarti video hilang tanpa ada yang tahu.
  try {
    if (payload.event === "video.unpublished") {
      const ketemu = await setPlaylyWebhookVideoStatus(
        payload.videoId,
        "unpublished",
        receivedAt,
      );
      // Tidak ketemu pun tetap 200: tak ada yang perlu disembunyikan berarti
      // keadaannya SUDAH seperti yang Playly minta. Membalas 404 malah membuat
      // mereka mengirim ulang selamanya untuk sesuatu yang sudah beres.
      return balas({
        ok: true,
        event: payload.event,
        videoId: payload.videoId,
        hidden: ketemu,
      });
    }

    // video.published — parseWebhookPayload menjamin embedUrl sudah terisi dan
    // lolos daftar domain, jadi tidak ada baris tanpa alamat player yang masuk.
    const video: PlaylyWebhookVideo = {
      videoId: payload.videoId,
      title: payload.title,
      description: payload.description,
      year: payload.year,
      genre: payload.genre,
      creator: payload.creator,
      durationSeconds: payload.durationSeconds,
      embedUrl: payload.embedUrl!,
      thumbnailUrl: payload.thumbnailUrl,
      status: "published",
      receivedAt,
    };
    const aksi = await upsertPlaylyWebhookVideo(video);

    // (4) Balasan pendek. Playly cuma perlu tahu "diterima"; isi panjang di sini
    // memperlambat balasan, dan balasan lambat membuat gateway mana pun
    // menganggap webhook gagal lalu mengirimnya lagi.
    return balas({
      ok: true,
      event: payload.event,
      videoId: video.videoId,
      aksi,
    });
  } catch (err) {
    catatError("menyimpan video", err);
    // Pesan untuk Playly sengaja umum; rinciannya ada di log server, bukan di
    // balasan yang bisa dibaca siapa pun yang berhasil menebak kuncinya.
    return balas(
      { ok: false, error: "Gagal menyimpan video. Silakan kirim ulang." },
      500,
    );
  }
}
