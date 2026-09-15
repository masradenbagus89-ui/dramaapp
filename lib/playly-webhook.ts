// -------------------------------------------------------------------------
// WEBHOOK PLAYLY — pintu masuk notifikasi "ada video baru / video ditarik".
//
// Bedanya dengan lib/playly.ts: di SANA kita yang memanggil Playly (menarik
// data). Di SINI Playly yang memanggil kita (mendorong data). Arah panggilan
// terbalik, jadi ancamannya ikut terbalik: alamat endpoint ini PUBLIK — siapa
// pun di internet bisa mengetuknya sambil mengaku-ngaku Playly. Nyaris seluruh
// isi berkas ini ada untuk satu hal: membuktikan yang mengetuk memang Playly,
// SEBELUM sebaris pun datanya dipakai.
//
// DUA CARA PEMBUKTIAN DITERIMA (keputusan owner 2026-09-14), karena sampai
// hari ini belum ada kepastian mana yang didukung Playly:
//
//   A. x-playly-secret     — Playly menempelkan kunci rahasia apa adanya di
//                            header. Sederhana; ini yang paling umum didukung
//                            layanan kecil. Pola yang sama sudah dipakai
//                            project ini di /api/agent/video-base.
//   B. X-Playly-Signature  — Playly menghitung HMAC-SHA256 dari badan pesan
//                            memakai kunci itu. LEBIH KUAT: kuncinya tak pernah
//                            lewat kabel, dan ISI pesannya ikut terkunci
//                            (diubah sedikit -> tanda-tangannya gugur).
//
// Keduanya memakai PLAYLY_WEBHOOK_SECRET yang sama. Menerima dua-duanya berarti
// kekuatan nyatanya setara yang TERLEMAH (A) — itu disadari dan diterima: yang
// dijaga di sini daftar video, bukan uang. Kalau suatu hari Playly memastikan
// dukungan HMAC, tutup jalur A dengan menghapus cabang verifySharedSecret di
// verifyWebhookRequest; tak ada bagian lain yang perlu berubah.
//
// Fungsi di sini sengaja MURNI (tanpa jaringan, tanpa database) supaya bisa
// diuji langsung tanpa menyalakan server — route tinggal merangkainya.
//
// BATAS JUJUR — anti-replay BELUM tertutup. skills/pembayaran/SKILL.md §2
// butir 4c meminta dedup lewat event_id unik + tolak event kadaluarsa; payload
// yang disepakati tidak memuat event_id maupun timestamp, jadi permintaan SAH
// yang pernah terekam bisa dikirim ulang orang lain apa adanya dan tetap lolos
// verifikasi (mis. menghidupkan lagi video yang sudah ditarik). Yang sudah
// tertutup: pemalsuan isi (jalur B) dan penggandaan data (idempoten by videoId).
// Cara menutupnya: minta Playly menyertakan `event_id` unik + `sent_at`, lalu
// tolak event yang id-nya sudah pernah masuk atau yang usianya lewat beberapa
// menit. Lihat skills/pembayaran/SKILL.md §2 butir 4c.
//
// SERVER-ONLY. Jangan pernah di-import dari komponen "use client":
// PLAYLY_WEBHOOK_SECRET tidak boleh ikut terkirim ke browser.
// -------------------------------------------------------------------------
import crypto from "node:crypto";
import {
  CREATOR_KEYS,
  DURATION_KEYS,
  EMBED_KEYS,
  ID_KEYS,
  THUMB_KEYS,
  TITLE_KEYS,
  extractEmbedUrl,
  isAllowedPlaylyEmbedUrl,
  normalizeThumbnail,
  parseDurationSeconds,
  pickString,
  readPlaylyConfig,
  type PlaylyConfig,
} from "./playly";

/**
 * Header tempat Playly menitipkan kunci rahasia apa adanya (jalur A).
 *
 * Ditulis huruf kecil karena itulah bentuk yang disebutkan ke pihak Playly;
 * pembacaannya sendiri tidak peka huruf besar-kecil (Headers di web API sudah
 * menormalkannya), jadi "X-Playly-Secret" pun tetap terbaca.
 */
export const PLAYLY_SECRET_HEADER = "x-playly-secret";

/**
 * Header tempat Playly menitipkan tanda-tangan HMAC (jalur B).
 *
 * BELUM TERVERIFIKASI ke Playly (2026-09-14): nama ini berasal dari spesifikasi
 * yang diberikan owner, bukan dari dokumentasi Playly — sampai hari ini tidak
 * ada satu pun jejak fitur webhook di sisi mereka. Kalau ternyata namanya lain,
 * CUKUP ganti di sini; sisa kode tidak perlu disentuh.
 */
export const PLAYLY_SIGNATURE_HEADER = "X-Playly-Signature";

/**
 * Nama field untuk KODE TEMPEL (HTML <iframe>, bukan alamat polos). Hanya
 * dikenal di jalur webhook, jadi sengaja TIDAK ikut di EMBED_KEYS milik
 * lib/playly.ts yang menggambarkan balasan katalog. Dicoba PALING AKHIR: kalau
 * Playly sudah mengirim alamat langsung, alamat itu yang dipakai.
 */
const EMBED_CODE_KEYS = ["embed_code", "embedCode"];

/**
 * Ringkasan/sinopsis. Katalog Playly tidak punya konsep ini sama sekali (lihat
 * tipe PlaylyVideo di lib/playly.ts), jadi daftarnya memang baru di sini.
 */
const DESCRIPTION_KEYS = [
  "description", "deskripsi", "summary", "sinopsis", "overview", "caption",
];

/** Dua kejadian yang kita tangani. Selain ini diakui tapi tidak diproses. */
export type PlaylyWebhookEvent = "video.published" | "video.unpublished";

/** Bentuk siap-pakai hasil pembacaan payload — sudah bersih & tervalidasi. */
export type PlaylyWebhookPayload = {
  event: PlaylyWebhookEvent;
  videoId: string;
  title: string;
  /** Sinopsis apa adanya dari Playly (teks polos); null kalau tidak dikirim. */
  description: string | null;
  year: number | null;
  genre: string | null;
  /** Nama pengunggah di sisi Playly; null kalau tidak dikirim. */
  creator: string | null;
  /** Durasi dalam detik; null kalau tidak dikirim atau tak terbaca. */
  durationSeconds: number | null;
  /**
   * Alamat player yang SUDAH lolos https + daftar domain Playly.
   * null hanya untuk event unpublish (video mau ditarik — alamatnya tak perlu).
   */
  embedUrl: string | null;
  /** Sampul yang SUDAH lolos https / data-URI gambar; null kalau tak ada. */
  thumbnailUrl: string | null;
};

export type PlaylyWebhookParse =
  | { ok: true; payload: PlaylyWebhookPayload }
  /** `abaikan` = bukan salah Playly, cuma kejadian yang tak kita tangani. */
  | { ok: false; abaikan?: true; error: string };

/** Cara pengirim membuktikan diri — dicatat di log server untuk menelusuri masalah. */
export type CaraVerifikasi = "signature" | "shared-secret";

export type PlaylyWebhookVerifikasi =
  | { ok: true; cara: CaraVerifikasi }
  | { ok: false };

/** Kunci rahasia webhook dari env. null = belum dipasang. */
export function readWebhookSecret(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const s = env.PLAYLY_WEBHOOK_SECRET?.trim();
  return s ? s : null;
}

/**
 * Rapikan isi header tanda-tangan jadi 64 huruf hex kecil, atau null kalau
 * bentuknya bukan HMAC-SHA256 sama sekali.
 *
 * Tiga hal dikerjakan di sini, semuanya punya alasan:
 *   - Awalan "sha256=" dibuang. Banyak layanan (GitHub, Stripe) menulis
 *     tanda-tangan begitu. Karena format Playly belum terverifikasi, menerima
 *     kedua bentuk mencegah kegagalan yang membingungkan — dan TIDAK
 *     melemahkan apa pun: nilai HMAC-nya tetap diperiksa utuh.
 *   - Huruf disamakan jadi kecil, supaya hex huruf besar tidak ditolak padahal
 *     nilainya benar.
 *   - Bentuknya dipastikan 64 hex. Ini sekaligus menjaga crypto.timingSafeEqual
 *     di bawah: fungsi itu MELEMPAR ERROR kalau panjang dua buffer beda, dan
 *     error tak tertangkap akan terbaca sebagai 500, bukan 401.
 */
function normalizeSignature(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/^sha256=/i, "").toLowerCase();
  return /^[0-9a-f]{64}$/.test(s) ? s : null;
}

/**
 * JALUR A — Playly menempelkan kunci rahasia apa adanya di header.
 *
 * Kedua sisi di-hash SHA-256 lebih dulu, BUKAN diadu mentah. Alasannya bukan
 * menyembunyikan isinya melainkan menyamakan PANJANG: crypto.timingSafeEqual
 * MELEMPAR ERROR kalau panjang dua buffer beda (yang akan terbaca sebagai 500,
 * bukan 401), sedangkan memeriksa panjangnya lebih dulu justru membocorkan
 * berapa huruf rahasia kita. Hash selalu 32 byte, apa pun isinya. Pola yang
 * sama dipakai app/api/agent/video-base/route.ts:69.
 *
 * `===` DILARANG di sini: ia berhenti di huruf pertama yang beda, jadi cepat
 * atau lambatnya perbandingan membocorkan berapa huruf depan yang sudah benar —
 * penyerang bisa menebak rahasianya huruf demi huruf dari selisih waktu itu.
 */
export function verifySharedSecret(
  headerValue: string | null | undefined,
  secret: string,
): boolean {
  // Secret kosong = fitur belum dipasang. Tanpa baris ini, header kosong akan
  // diadu dengan secret kosong dan COCOK — alias pintu terbuka lebar.
  if (!secret) return false;

  const dikirim = headerValue?.trim();
  if (!dikirim) return false;

  const a = crypto.createHash("sha256").update(dikirim, "utf8").digest();
  const b = crypto.createHash("sha256").update(secret, "utf8").digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * JALUR B — benarkah badan permintaan ini ditandatangani pemegang secret kita?
 *
 * Rumusnya: HMAC-SHA256(secret, raw_body). HMAC = "sidik jari" isi pesan yang
 * hanya bisa dibuat oleh pihak yang memegang secret yang sama. Kita hitung
 * ulang sidik jari itu dari badan permintaan, lalu bandingkan dengan yang
 * dikirim. Cocok = pengirimnya memegang secret kita.
 *
 * Dua aturan yang WAJIB dipatuhi pemanggil; kalau dilanggar, pengamanannya
 * cuma jadi pajangan:
 *   1. `rawBody` harus BADAN MENTAH (`await req.text()`), bukan hasil
 *      JSON.parse yang di-stringify ulang. Sidik jari dihitung dari byte
 *      persis; begitu urutan kunci atau spasi bergeser sedikit, hasilnya beda
 *      total dan tanda-tangan yang SAH pun ikut tertolak.
 *   2. Perbandingannya memakai crypto.timingSafeEqual, BUKAN `===`. `===`
 *      berhenti di huruf pertama yang beda, jadi lama-tidaknya perbandingan
 *      membocorkan "berapa huruf depan yang sudah benar" — penyerang bisa
 *      menebak tanda-tangan huruf demi huruf dari selisih waktu itu.
 *      timingSafeEqual selalu memakan waktu sama.
 */
export function verifyWebhookSignature(
  rawBody: string,
  headerValue: string | null | undefined,
  secret: string,
): boolean {
  // Secret kosong = fitur belum dipasang. Tanpa baris ini kita akan menghitung
  // HMAC ber-secret "" — yang bisa ditiru siapa saja, alias pintu terbuka.
  if (!secret) return false;

  const dikirim = normalizeSignature(headerValue);
  if (!dikirim) return false;

  // update(..., "utf8"): JSON dari req.text() sudah berupa teks UTF-8, dan
  // mengubahnya balik jadi byte UTF-8 menghasilkan byte yang persis sama.
  const dihitung = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  const a = Buffer.from(dikirim, "hex");
  const b = Buffer.from(dihitung, "hex");
  // Panjang sudah dijamin sama oleh normalizeSignature, tapi tetap dicek:
  // kalau suatu saat pola hex-nya diubah, yang terjadi penolakan — bukan
  // pengecualian yang menyamar jadi error server.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * GERBANG TUNGGAL yang dipakai route: lolos kalau SALAH SATU jalur terbukti.
 *
 * Tanda-tangan (B) diperiksa DULU supaya jalur yang lebih kuat itu yang
 * tercatat di log ketika Playly mengirim kedua header. Tanda-tangan yang
 * meleset TIDAK langsung menggugurkan permintaan — pengirim masih boleh
 * membuktikan diri lewat jalur A (mis. Playly memakai format tanda-tangan lain
 * yang tak kita kenali, tapi kunci rahasianya benar).
 *
 * Ini TIDAK melonggarkan pengamanan: kedua jalur sama-sama menuntut pemegang
 * PLAYLY_WEBHOOK_SECRET, dan yang tak memegangnya tetap gagal di dua-duanya.
 */
export function verifyWebhookRequest(
  rawBody: string,
  headers: Headers,
  secret: string,
): PlaylyWebhookVerifikasi {
  if (!secret) return { ok: false };

  if (verifyWebhookSignature(rawBody, headers.get(PLAYLY_SIGNATURE_HEADER), secret)) {
    return { ok: true, cara: "signature" };
  }
  if (verifySharedSecret(headers.get(PLAYLY_SECRET_HEADER), secret)) {
    return { ok: true, cara: "shared-secret" };
  }
  return { ok: false };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function bacaTeks(rec: Record<string, unknown>, key: string): string | null {
  const v = rec[key];
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

/**
 * Tahun rilis. Angka maupun teks angka diterima ("2024" dari JSON yang longgar),
 * tapi nilai di luar akal (tahun 5 / 90210) dibuang jadi null — lebih baik
 * kosong daripada memajang tahun ngawur di kartu video.
 */
function bacaTahun(value: unknown): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value.trim())
        : NaN;
  if (!Number.isFinite(n)) return null;
  const tahun = Math.floor(n);
  return tahun >= 1900 && tahun <= 2200 ? tahun : null;
}

/**
 * Ubah `embed_code` (bisa berupa kode tempel <iframe ...> ATAU alamat polos)
 * jadi SATU alamat https yang sudah lolos daftar domain Playly.
 *
 * Kenapa yang disimpan alamatnya, BUKAN kode iframe mentahnya: `embed_code`
 * datang dari luar dan isinya HTML. Menyimpannya mentah lalu menempelkannya ke
 * halaman berarti mengizinkan pengirimnya menaruh HTML/JavaScript apa pun di
 * situs kita (XSS — penyerang menitipkan skrip yang ikut jalan di browser
 * pengunjung, bisa mencuri sesi login mereka). Dengan hanya menyimpan src-nya
 * lalu memeriksanya terhadap daftar domain, yang bisa masuk <iframe> cuma
 * alamat player Playly; apa pun yang dikirim di sekelilingnya dibuang.
 */
export function embedUrlDariKode(
  embedCode: string,
  config: PlaylyConfig,
): string | null {
  const mentah = extractEmbedUrl(embedCode);
  if (!mentah) return null;

  // Playly mengirim sebagian alamat dalam bentuk relatif ("/id/123/embed").
  // baseUrl berasal dari env KITA (bukan dari payload), jadi melengkapinya di
  // sini tidak membuka jalan ke domain asing — hasilnya tetap diperiksa ulang
  // terhadap daftar domain tepat di bawah.
  let absolut = mentah;
  if (mentah.startsWith("/") && !mentah.startsWith("//")) {
    try {
      absolut = new URL(mentah, config.baseUrl).toString();
    } catch {
      return null;
    }
  }

  return isAllowedPlaylyEmbedUrl(absolut, config.allowedHosts) ? absolut : null;
}

/**
 * Ambil bagian yang berisi DATA VIDEO dari badan permintaan.
 *
 * DUA bentuk payload diterima, karena bentuk asli Playly belum terverifikasi:
 *   - BERSARANG : { event, video: { id, title, embed_code, ... } }
 *   - PIPIH     : { id, title, description, embedUrl, thumbnailUrl, ... }
 * Bentuk pipih tidak punya pembungkus, jadi badan permintaannya SENDIRI yang
 * berperan sebagai data video. Yang membedakan: ada-tidaknya kunci "video".
 */
function ambilRecordVideo(
  rec: Record<string, unknown>,
): { ok: true; video: Record<string, unknown> } | { ok: false; error: string } {
  if (!("video" in rec)) return { ok: true, video: rec };

  const bersarang = asRecord(rec.video);
  return bersarang
    ? { ok: true, video: bersarang }
    : { ok: false, error: "Field 'video' wajib berupa objek." };
}

/**
 * Baca badan permintaan yang SUDAH terbukti asli jadi bentuk siap-simpan.
 *
 * Dipanggil HANYA setelah verifyWebhookRequest lolos. Pembuktian yang sah
 * menunjukkan PENGIRIMNYA Playly — ia TIDAK membuktikan isinya masuk akal,
 * jadi bentuk datanya tetap diperiksa di sini.
 */
export function parseWebhookPayload(
  rawBody: string,
  config: PlaylyConfig = readPlaylyConfig(),
): PlaylyWebhookParse {
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return { ok: false, error: "Badan permintaan bukan JSON yang sah." };
  }

  const rec = asRecord(json);
  if (!rec) return { ok: false, error: "Badan permintaan bukan objek JSON." };

  // Payload PIPIH tidak membawa 'event' sama sekali — bentuk itu memang
  // notifikasi "ada video baru terbit", jadi diperlakukan sebagai publish.
  // Yang tidak boleh diam-diam lolos adalah event yang DISEBUT tapi asing.
  const event = bacaTeks(rec, "event") ?? "video.published";
  if (event !== "video.published" && event !== "video.unpublished") {
    // Playly boleh menambah jenis kejadian baru kapan saja. Itu BUKAN error di
    // sisi kita: route membalas 200 supaya Playly berhenti mengirim ulang.
    return { ok: false, abaikan: true, error: `Event '${event}' tidak ditangani.` };
  }

  const dariRecord = ambilRecordVideo(rec);
  if (!dariRecord.ok) return { ok: false, error: dariRecord.error };
  const video = dariRecord.video;

  const videoId = pickString(video, ID_KEYS);
  if (!videoId) return { ok: false, error: "Field 'video.id' wajib ada." };

  // Unpublish hanya butuh id — video yang mau ditarik tidak perlu alamat player
  // maupun judul. Memaksakan keduanya ada justru membuat penarikan gagal saat
  // Playly mengirim payload ringkas, dan video yang seharusnya hilang tetap tampil.
  if (event === "video.unpublished") {
    return {
      ok: true,
      payload: {
        event,
        videoId,
        title: "",
        description: null,
        year: null,
        genre: null,
        creator: null,
        durationSeconds: null,
        embedUrl: null,
        thumbnailUrl: null,
      },
    };
  }

  // Alamat polos (EMBED_KEYS) DIDAHULUKAN dari kode tempel: kalau Playly sudah
  // mengirim alamatnya, tak ada gunanya mengupas HTML lebih dulu.
  const embedMentah = pickString(video, [...EMBED_KEYS, ...EMBED_CODE_KEYS]);
  if (!embedMentah) {
    return { ok: false, error: "Field 'video.embed_code' (atau 'embedUrl') wajib ada." };
  }

  const embedUrl = embedUrlDariKode(embedMentah, config);
  if (!embedUrl) {
    // Disimpan tanpa alamat sah = baris yang tak bisa diputar, dan tak ada yang
    // tahu sampai ada penonton mengkliknya. Lebih baik ditolak terang-terangan.
    return {
      ok: false,
      error:
        "embed_code tidak berisi alamat player dari domain Playly yang diizinkan. " +
        "Kalau Playly memakai domain baru, tambahkan di setelan PLAYLY_EMBED_HOSTS.",
    };
  }

  // Sampul dilewatkan normalizeThumbnail yang SAMA dengan jalur katalog (https
  // atau data-URI gambar raster saja; SVG ditolak karena bisa memuat <script>).
  // Sampul yang tak lolos jadi null — SENGAJA tidak menggugurkan seluruh video:
  // video yang bisa diputar tetap berguna walau gambarnya hilang.
  const thumbMentah = pickString(video, THUMB_KEYS);
  const thumbnailUrl = thumbMentah
    ? normalizeThumbnail(thumbMentah, config.baseUrl)
    : null;

  return {
    ok: true,
    payload: {
      event,
      videoId,
      title: pickString(video, TITLE_KEYS) ?? "(tanpa judul)",
      description: pickString(video, DESCRIPTION_KEYS),
      year: bacaTahun(video.year),
      genre: bacaTeks(video, "genre"),
      creator: pickString(video, CREATOR_KEYS),
      durationSeconds: parseDurationSeconds(
        DURATION_KEYS.map((k) => video[k]).find((v) => v !== undefined && v !== null),
      ),
      embedUrl,
      thumbnailUrl,
    },
  };
}
