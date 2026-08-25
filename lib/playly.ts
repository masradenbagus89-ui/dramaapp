// -------------------------------------------------------------------------
// Integrasi PLAYLY — kita di sini berperan sebagai "Mitra" yang memegang
// API key (kunci akses) milik Playly untuk menampilkan video mereka.
//
// Tiga tanggung jawab berkas ini:
//   1. MENYIMPAN kunci dengan aman  -> dienkripsi AES-256-GCM sebelum masuk
//      database, jadi orang yang bisa mengintip isi database TETAP tidak
//      mendapat kunci aslinya (dia cuma dapat teks acak).
//   2. MENYAMARKAN kunci saat ditampilkan -> "plyk_••••••••json". Kunci ASLI
//      tidak pernah dikirim ke browser, sekali pun ke browser admin.
//   3. MEMANGGIL API Playly DARI SERVER  -> GET <PLAYLY_API_URL>/api/videos
//      dengan header "X-Playly-Key: <kunci>".
//
// KENAPA panggilannya harus dari server, bukan dari browser:
//   - Kalau browser yang memanggil, kunci harus ikut dikirim ke browser dulu.
//     Siapa pun bisa membukanya lewat tab Network di DevTools, lalu memakai
//     kunci kita atas nama kita. Dari server, kunci tidak pernah keluar.
//   - CORS (aturan "domain mana yang boleh memanggil API ini") tidak ikut main
//     pada panggilan server-ke-server, jadi Playly tak perlu setelan khusus.
//
// Berkas ini SERVER-ONLY. Jangan pernah di-import dari komponen "use client".
// -------------------------------------------------------------------------
import crypto from "node:crypto";
import {
  getPlaylyKeyRecord,
  setPlaylyKeyRecord,
  clearPlaylyKeyRecord,
  type PlaylyKeyRecord,
} from "./store";

/** Awalan wajib kunci Playly. Kunci contoh: plyk_a1b2c3d4e5f6json */
export const PLAYLY_KEY_PREFIX = "plyk_";

/** Alamat dasar Playly kalau env tidak diisi (partner yang sudah disepakati). */
export const DEFAULT_PLAYLY_API_URL = "https://playly-dashboard.vercel.app";

/** Nama header yang DIPERIKSA Playly. Playly mengabaikan "Authorization: Bearer". */
export const PLAYLY_KEY_HEADER = "X-Playly-Key";

/** Domain player yang boleh dipasang di <iframe> tanpa perlu setelan tambahan. */
export const DEFAULT_PLAYLY_EMBED_HOSTS = ["playly-dashboard.vercel.app"];

/** Pola alamat pemutar Playly. Terverifikasi dari katalog asli 2026-08-25. */
export const DEFAULT_PLAYLY_EMBED_PATH = "/id/{id}/embed";

/** Katalog PUBLIK Playly (tanpa kunci) — dipakai halaman /nonton milik Playly. */
export const PLAYLY_CATALOG_PATH = "/api/catalog";

/** Spasi, tab, baris baru, dan karakter kontrol — tidak boleh ada di dalam kunci. */
function adaSpasiAtauKontrol(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const kode = s.charCodeAt(i);
    // 0x20 = spasi; di bawahnya = tab/baris baru/karakter kontrol; 0x7f = DEL.
    if (kode <= 0x20 || kode === 0x7f) return true;
  }
  return false;
}

// =====================  1. FORMAT & PENYAMARAN KUNCI  =====================

/**
 * Cek bentuk kunci sebelum disimpan — menangkap salah tempel (mis. yang
 * ter-copy malah alamat URL, atau kunci terpotong separuh).
 *
 * Sengaja LONGGAR soal isi: yang dipastikan hanya awalan "plyk_", panjang
 * masuk akal, dan tidak ada spasi/baris baru. Kalau aturannya terlalu ketat,
 * kunci sah dari Playly bisa ikut ditolak hanya karena memakai karakter yang
 * tidak kita duga.
 */
export function isValidPlaylyKey(raw: string): boolean {
  return playlyKeyError(raw) === null;
}

/** Pesan kenapa kunci ditolak — dipakai apa adanya sebagai pesan ke admin. */
export function playlyKeyError(raw: string): string | null {
  const key = raw.trim();
  if (!key) return "Kunci API belum diisi.";
  if (adaSpasiAtauKontrol(key)) {
    return "Kunci tidak boleh mengandung spasi atau baris baru — tempel ulang tanpa teks lain.";
  }
  if (!key.startsWith(PLAYLY_KEY_PREFIX)) {
    return `Kunci Playly selalu diawali "${PLAYLY_KEY_PREFIX}". Cek lagi yang kamu tempel.`;
  }
  if (key.length < PLAYLY_KEY_PREFIX.length + 8) {
    return "Kunci terlalu pendek — sepertinya ter-copy separuh.";
  }
  if (key.length > 200) {
    return "Kunci terlalu panjang — sepertinya ada teks lain ikut ter-copy.";
  }
  return null;
}

/**
 * Bentuk aman untuk DITAMPILKAN: "plyk_••••••••json".
 * Hanya 4 karakter terakhir yang diperlihatkan — cukup untuk membedakan
 * "kunci yang mana", tapi tidak cukup untuk dipakai orang lain.
 */
export function maskPlaylyKey(raw: string): string {
  const key = raw.trim();
  if (!key) return "";
  const prefix = key.startsWith(PLAYLY_KEY_PREFIX) ? PLAYLY_KEY_PREFIX : "";
  const body = key.slice(prefix.length);
  // Kunci sangat pendek: jangan bocorkan apa pun, samarkan seluruhnya.
  const tail = body.length >= 8 ? body.slice(-4) : "";
  return `${prefix}${"•".repeat(8)}${tail}`;
}

// =====================  2. ENKRIPSI (AES-256-GCM)  ========================
// GCM dipilih karena selain MENGACAK isi, ia juga menempelkan "segel" (auth
// tag): kalau teks acak di database diubah orang, proses buka-kunci GAGAL,
// bukan diam-diam menghasilkan kunci ngawur.

const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // ukuran baku untuk GCM
const BLOB_VERSION = "v1"; // ditulis di depan supaya format bisa diganti nanti

export class PlaylyError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "PlaylyError";
    this.status = status;
  }
}

/**
 * Ambil kunci enkripsi dari env PLAYLY_ENCRYPTION_KEY.
 * Diterima: 64 karakter hex ATAU base64 yang panjangnya pas 32 byte.
 * Kembalikan null kalau belum di-set (bukan error — supaya halaman setelan
 * bisa menampilkan panduan, bukan layar rusak).
 */
export function readEncryptionKey(
  env: Record<string, string | undefined> = process.env,
): Buffer | null {
  const raw = (env.PLAYLY_ENCRYPTION_KEY ?? "").trim();
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const b64 = Buffer.from(raw, "base64");
  return b64.length === 32 ? b64 : null;
}

/** True kalau kunci enkripsi sudah dipasang dengan benar (panjangnya pas). */
export function encryptionConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return readEncryptionKey(env) !== null;
}

function requireEncryptionKey(): Buffer {
  const key = readEncryptionKey();
  if (!key) {
    throw new PlaylyError(
      "PLAYLY_ENCRYPTION_KEY belum di-set (atau panjangnya bukan 32 byte). " +
        "Buat dengan: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\" " +
        "lalu isikan di .env.local (lokal) atau Environment Variables (Vercel).",
      503,
    );
  }
  return key;
}

/** Acak teks rahasia jadi "v1.iv.ciphertext.tag" (aman disimpan di database). */
export function encryptSecret(
  plain: string,
  key: Buffer = requireEncryptionKey(),
): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf-8"), cipher.final()]);
  return [
    BLOB_VERSION,
    iv.toString("base64url"),
    enc.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

/** Kebalikan encryptSecret. Gagal (segel tidak cocok) -> lempar PlaylyError. */
export function decryptSecret(
  blob: string,
  key: Buffer = requireEncryptionKey(),
): string {
  const bagian = blob.split(".");
  if (bagian.length !== 4 || bagian[0] !== BLOB_VERSION) {
    throw new PlaylyError("Data kunci tersimpan rusak atau formatnya tidak dikenali.", 500);
  }
  try {
    const decipher = crypto.createDecipheriv(
      ALGO,
      key,
      Buffer.from(bagian[1], "base64url"),
    );
    decipher.setAuthTag(Buffer.from(bagian[3], "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(bagian[2], "base64url")),
      decipher.final(),
    ]).toString("utf-8");
  } catch {
    // Penyebab paling sering: PLAYLY_ENCRYPTION_KEY diganti setelah kunci disimpan.
    throw new PlaylyError(
      "Kunci tersimpan tidak bisa dibuka. Biasanya karena PLAYLY_ENCRYPTION_KEY " +
        "berbeda dengan yang dipakai saat menyimpan. Masukkan ulang kunci Playly di halaman setelan.",
      500,
    );
  }
}

// =====================  3. SIMPAN / AMBIL KUNCI  ==========================

export type PlaylyKeyStatus = {
  /** Ada kunci yang bisa dipakai (dari database atau env). */
  configured: boolean;
  /** Bentuk tersamar untuk ditampilkan; null kalau belum ada kunci. */
  masked: string | null;
  /** Dari mana kunci yang dipakai berasal. */
  source: "database" | "env" | null;
  updatedAt: string | null;
  updatedBy: string | null;
  /** False = PLAYLY_ENCRYPTION_KEY belum siap, jadi kunci belum bisa disimpan. */
  encryptionReady: boolean;
};

/**
 * Status kunci untuk DITAMPILKAN ke admin.
 * Sengaja tidak pernah memuat kunci asli — hanya bentuk tersamarnya.
 */
export async function getPlaylyKeyStatus(): Promise<PlaylyKeyStatus> {
  const encryptionReady = encryptionConfigured();
  const rec = await getPlaylyKeyRecord();

  if (rec) {
    return {
      configured: true,
      masked: rec.masked || null,
      source: "database",
      updatedAt: rec.updatedAt || null,
      updatedBy: rec.updatedBy || null,
      encryptionReady,
    };
  }

  // Jaring pengaman: kunci boleh juga ditaruh di env (mis. saat migrasi atau
  // kalau database belum siap). Env tetap server-side, jadi sama amannya.
  const dariEnv = (process.env.PLAYLY_API_KEY ?? "").trim();
  if (dariEnv) {
    return {
      configured: true,
      masked: maskPlaylyKey(dariEnv),
      source: "env",
      updatedAt: null,
      updatedBy: null,
      encryptionReady,
    };
  }

  return {
    configured: false,
    masked: null,
    source: null,
    updatedAt: null,
    updatedBy: null,
    encryptionReady,
  };
}

/**
 * Kunci ASLI untuk dipakai memanggil Playly. HANYA boleh dipanggil di server
 * (route handler / server component) dan hasilnya TIDAK BOLEH ikut ke respons
 * yang dikirim ke browser.
 */
export async function getPlaylyKey(): Promise<string | null> {
  const rec = await getPlaylyKeyRecord();
  if (rec) return decryptSecret(rec.secret);
  const dariEnv = (process.env.PLAYLY_API_KEY ?? "").trim();
  return dariEnv || null;
}

/** Simpan/ganti kunci (dienkripsi dulu). `adminEmail` dicatat sebagai jejak audit. */
export async function savePlaylyKey(
  rawKey: string,
  adminEmail: string,
): Promise<PlaylyKeyRecord> {
  const key = rawKey.trim();
  const salah = playlyKeyError(key);
  if (salah) throw new PlaylyError(salah, 400);

  const rec: PlaylyKeyRecord = {
    secret: encryptSecret(key),
    masked: maskPlaylyKey(key),
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail,
  };
  await setPlaylyKeyRecord(rec);
  return rec;
}

/** Cabut kunci dari database (mis. kunci bocor / diganti Playly). */
export async function deletePlaylyKey(): Promise<void> {
  await clearPlaylyKeyRecord();
}

// =====================  4. PENERJEMAH DAFTAR VIDEO  =======================
// Bentuk JSON Playly belum dipastikan dari dokumentasi resmi, jadi beberapa
// nama field yang lazim dicoba satu per satu (pola yang sama dipakai
// lib/dashboard-videos.ts). Kalau nanti ternyata beda, cukup tambahkan
// namanya di daftar konstanta di bawah — tak perlu mengubah logika.

const LIST_KEYS = ["data", "items", "results", "videos", "rows", "list"];
const ID_KEYS = ["id", "videoId", "video_id", "uuid", "slug"];
const TITLE_KEYS = ["title", "judul", "name", "nama"];
const EMBED_KEYS = [
  // "embedUrlFull" DIDAHULUKAN: Playly mengirim alamat LENGKAP di field itu,
  // sedangkan "embedUrl" miliknya berbentuk relatif ("/id/123/embed").
  // Terverifikasi 2026-08-25 dari balasan /api/public-video Playly.
  "embedUrlFull", "embed_url_full",
  "embedUrl", "embed_url", "embed", "playerUrl", "player_url", "iframe",
];
const CREATOR_KEYS = [
  "creator", "creatorName", "creator_name", "author", "owner",
  "uploader", "channel", "kreator", "pembuat",
];
const DURATION_KEYS = [
  "duration", "durationSeconds", "duration_seconds", "length", "durasi",
];
const THUMB_KEYS = [
  "thumbnail", "thumbnailUrl", "thumbnail_url", "thumb", "poster", "cover", "image",
];

/** Satu video Playly dalam bentuk standar yang dipakai UI kita. */
export type PlaylyVideo = {
  id: string;
  title: string;
  /** Durasi dalam detik; null kalau Playly tidak mengirimkannya. */
  durationSeconds: number | null;
  /** Durasi siap tampil ("12:34"), atau "-" kalau tidak diketahui. */
  durationLabel: string;
  /** Nama kreator; string kosong kalau tidak dikirim. */
  creator: string;
  /** Alamat player siap tempel — sudah lolos https + daftar domain. */
  embedUrl: string;
  thumbnail: string | null;
};

export type RejectedVideo = { reason: string; value: string };
export type PlaylyVideoResult = { videos: PlaylyVideo[]; rejected: RejectedVideo[] };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(rec: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

/**
 * Durasi bisa datang sebagai angka detik (125), teks angka ("125"), atau teks
 * jam ("2:05" / "1:02:05"). Semuanya diubah jadi detik.
 */
export function parseDurationSeconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.floor(Number(s));
  if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(s)) {
    return s.split(":").reduce((total, bagian) => total * 60 + Number(bagian), 0);
  }
  return null;
}

/** Detik -> teks tampilan: "12:34" atau "1:02:34" kalau lebih dari sejam. */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "-";
  const jam = Math.floor(seconds / 3600);
  const menit = Math.floor((seconds % 3600) / 60);
  const detik = Math.floor(seconds % 60);
  const dd = String(detik).padStart(2, "0");
  return jam > 0 ? `${jam}:${String(menit).padStart(2, "0")}:${dd}` : `${menit}:${dd}`;
}

/** Ubah daftar domain dari env jadi array rapi (tahan "https://" & garis miring). */
export function parseAllowedHosts(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => s.replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter(Boolean);
}

/** Domain cocok kalau sama persis ATAU subdomainnya (cdn.playly.app ⊂ playly.app). */
function hostAllowed(host: string, allowedHosts: string[]): boolean {
  const h = host.toLowerCase();
  return allowedHosts.some((a) => h === a || h.endsWith(`.${a}`));
}

/**
 * WAJIB https. Situs kita https; isi http akan diblokir browser
 * (mixed content = konten campur aman/tidak aman) sehingga video jadi blank.
 */
function toHttpsUrl(raw: string, baseUrl?: string): URL | null {
  let s = raw.trim().replace(/&amp;/g, "&");
  if (s.startsWith("//")) s = `https:${s}`;
  try {
    // Alamat RELATIF ("/id/123/embed") dilengkapi memakai alamat dasar Playly.
    // Tanpa ini SEMUA video Playly terbuang: bentuk itulah yang mereka kirim.
    // baseUrl berasal dari env kita sendiri (bukan data luar), jadi melengkapi
    // di sini tidak membuka jalan ke domain asing — hasilnya tetap diperiksa
    // ulang terhadap daftar domain oleh pemanggil.
    const url = s.startsWith("/") && baseUrl ? new URL(s, baseUrl) : new URL(s);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** Ambil src dari kode tempel <iframe ...> — sebagian API mengirim HTML, bukan URL. */
const IFRAME_SRC_RE = /<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i;

function extractEmbedUrl(value: string): string | null {
  const s = value.trim();
  if (!s) return null;
  const dariIframe = s.match(IFRAME_SRC_RE);
  if (dariIframe) return dariIframe[1].trim();
  // Bentuk relatif dari Playly ("/id/123/embed") — dilengkapi oleh toHttpsUrl.
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  if (/^(https?:)?\/\//i.test(s)) return s;
  return null;
}

/**
 * Pagar terakhir sebelum sebuah alamat boleh masuk <iframe>.
 * Dipakai ulang oleh route penyimpan kaitan, supaya alamat yang dikirim dari
 * browser admin pun tetap diperiksa ULANG di server (isi browser bisa diubah
 * orang, jadi tak boleh dipercaya begitu saja).
 */
export function isAllowedPlaylyEmbedUrl(raw: string, allowedHosts: string[]): boolean {
  if (allowedHosts.length === 0) return false; // daftar kosong = tolak semua
  const url = toHttpsUrl(raw);
  return url !== null && hostAllowed(url.hostname, allowedHosts);
}

/** Cari array daftar video di dalam JSON, di mana pun Playly menaruhnya. */
function findList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const rec = asRecord(raw);
  if (!rec) return [];
  for (const k of LIST_KEYS) {
    if (Array.isArray(rec[k])) return rec[k] as unknown[];
  }
  for (const v of Object.values(rec)) {
    const inner = asRecord(v);
    if (inner) {
      for (const k of LIST_KEYS) {
        if (Array.isArray(inner[k])) return inner[k] as unknown[];
      }
    }
  }
  return [];
}

export type PlaylyEmbedPattern = {
  /** Alamat dasar Playly, mis. "https://playly-dashboard.vercel.app". */
  baseUrl: string;
  /** Pola alamat player; "{id}" diganti id video. */
  pattern: string;
};

/**
 * Bangun alamat player kalau Playly TIDAK mengirim embedUrl di JSON-nya.
 *
 * ✅ Pola "/id/<id>/embed" TERVERIFIKASI 2026-08-25 dari katalog Playly asli
 * (dulu ditebak "/embed/<id>" dan selalu meleset). Kalau Playly mengubahnya,
 * cukup ganti lewat env PLAYLY_EMBED_PATH tanpa menyentuh kode.
 * Kalau Playly memang mengirim embedUrl, nilai dari MEREKA yang dipakai.
 */
function buildEmbedUrl(id: string, pola: PlaylyEmbedPattern): string {
  const path = pola.pattern.replace("{id}", encodeURIComponent(id));
  return `${pola.baseUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Gambar sampul boleh berupa alamat https, alamat RELATIF Playly, atau data URI
 * gambar (Playly menyisipkan sebagian sampul langsung sebagai "data:image/...").
 *
 * data URI sengaja dibatasi ke gambar raster. "data:image/svg+xml" DITOLAK
 * karena SVG bisa memuat <script>: di dalam <img> memang tidak dieksekusi, tapi
 * alamat yang sama bisa saja nanti dibuka di tab baru, dan di situ skripnya hidup.
 */
const DATA_URI_GAMBAR_RE =
  /^data:image\/(jpeg|jpg|png|webp|gif|avif);base64,[a-z0-9+/=\s]+$/i;

export function normalizeThumbnail(raw: string, baseUrl?: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.startsWith("data:")) return DATA_URI_GAMBAR_RE.test(s) ? s : null;
  const url = toHttpsUrl(s, baseUrl);
  return url ? url.toString() : null;
}

/**
 * PENERJEMAH: JSON Playly (bentuk apa pun) -> daftar video standar kita.
 * Fungsi MURNI (tanpa jaringan/env) supaya gampang dites.
 */
export function normalizePlaylyVideos(
  raw: unknown,
  allowedHosts: string[],
  pola: PlaylyEmbedPattern,
): PlaylyVideoResult {
  const videos: PlaylyVideo[] = [];
  const rejected: RejectedVideo[] = [];

  findList(raw).forEach((item, index) => {
    const rec = asRecord(item);
    if (!rec) {
      rejected.push({ reason: "bentuk data tidak dikenali", value: `item ke-${index + 1}` });
      return;
    }

    const id = pickString(rec, ID_KEYS);
    const embedMentah = pickString(rec, EMBED_KEYS);

    // Butuh salah satu: alamat embed langsung, atau id untuk dirakit jadi alamat.
    if (!embedMentah && !id) {
      rejected.push({
        reason: "tidak ada alamat embed maupun id video",
        value: `item ke-${index + 1}`,
      });
      return;
    }

    const calon = embedMentah ? extractEmbedUrl(embedMentah) : buildEmbedUrl(id!, pola);
    if (!calon) {
      rejected.push({
        reason: "alamat embed tidak bisa dibaca",
        value: (embedMentah ?? "").slice(0, 120),
      });
      return;
    }

    const url = toHttpsUrl(calon, pola.baseUrl);
    if (!url) {
      rejected.push({ reason: "alamat embed harus https", value: calon.slice(0, 120) });
      return;
    }
    if (!hostAllowed(url.hostname, allowedHosts)) {
      rejected.push({ reason: "domain player belum diizinkan", value: url.hostname });
      return;
    }

    const durationSeconds = parseDurationSeconds(
      DURATION_KEYS.map((k) => rec[k]).find((v) => v !== undefined && v !== null),
    );
    const thumbMentah = pickString(rec, THUMB_KEYS);
    const thumbnail = thumbMentah ? normalizeThumbnail(thumbMentah, pola.baseUrl) : null;

    videos.push({
      id: id ?? url.toString(),
      title: pickString(rec, TITLE_KEYS) ?? `Video ${index + 1}`,
      durationSeconds,
      durationLabel: formatDuration(durationSeconds),
      creator: pickString(rec, CREATOR_KEYS) ?? "",
      embedUrl: url.toString(),
      thumbnail,
    });
  });

  return { videos, rejected };
}

// =====================  5. PANGGILAN KE API PLAYLY  =======================

export type PlaylyConfig = {
  /** Alamat dasar Playly (tanpa garis miring di ujung). */
  baseUrl: string;
  /** Alamat lengkap endpoint daftar video milik mitra (butuh kunci). */
  videosUrl: string;
  /** Alamat katalog PUBLIK Playly — tanpa kunci; jaring pengaman kalau kunci belum siap. */
  catalogUrl: string;
  allowedHosts: string[];
  embedPattern: PlaylyEmbedPattern;
};

/** Setelan dari env — TANPA NEXT_PUBLIC_, jadi hanya hidup di server. */
export function readPlaylyConfig(
  env: Record<string, string | undefined> = process.env,
): PlaylyConfig {
  const baseUrl = (env.PLAYLY_API_URL?.trim() || DEFAULT_PLAYLY_API_URL).replace(/\/+$/, "");
  const dariEnv = parseAllowedHosts(env.PLAYLY_EMBED_HOSTS);
  // Domain Playly resmi selalu ikut diizinkan; env hanya MENAMBAH (mis. kalau
  // Playly memakai domain CDN lain untuk playernya).
  const allowedHosts = Array.from(new Set([...DEFAULT_PLAYLY_EMBED_HOSTS, ...dariEnv]));

  return {
    baseUrl,
    videosUrl: `${baseUrl}/api/videos`,
    catalogUrl: `${baseUrl}${PLAYLY_CATALOG_PATH}`,
    allowedHosts,
    embedPattern: {
      baseUrl,
      pattern: env.PLAYLY_EMBED_PATH?.trim() || DEFAULT_PLAYLY_EMBED_PATH,
    },
  };
}

/**
 * Susun header panggilan. Kunci dititipkan di "X-Playly-Key" karena itulah
 * header yang DIBACA Playly (dibuktikan 2026-08-16 dan dicatat di
 * lib/dashboard-videos.ts: memanggil /api/videos dengan "Authorization:
 * Bearer" dibalas {"ok":false,"error":"missing_key"}, sedangkan dengan
 * X-Playly-Key berisi nilai ngawur balasannya berubah jadi "invalid_key" —
 * artinya headernya terbaca, hanya nilainya yang salah).
 *
 * Nilai kuncinya TIDAK PERNAH dicatat ke log: kalau bocor ke log, siapa pun
 * yang bisa membaca log server ikut memegang kunci itu.
 */
export function buildPlaylyHeaders(apiKey: string): Record<string, string> {
  return { Accept: "application/json", [PLAYLY_KEY_HEADER]: apiKey };
}

/** Dari mana daftar video yang sedang ditampilkan berasal. */
export type PlaylySumber = "mitra" | "katalog-publik";

export type PlaylyFetchResult = PlaylyVideoResult & {
  source: PlaylySumber;
  /** Penjelasan untuk admin kalau jalur utama tidak terpakai; null kalau normal. */
  note: string | null;
};

/**
 * Ambil JSON dari satu alamat Playly. Semua kegagalan diterjemahkan jadi pesan
 * yang bisa DITINDAKLANJUTI admin, bukan sekadar "HTTP 401".
 *
 * `pesan401` dititipkan pemanggil karena arti "ditolak" berbeda per jalur:
 * di jalur mitra artinya kuncinya bermasalah, di katalog publik tidak ada kunci
 * sama sekali yang bisa disalahkan.
 */
async function ambilJsonPlayly(
  url: string,
  headers: Record<string, string>,
  pesan401: string,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers,
      // Batas tunggu: kalau Playly ngadat, halaman admin jangan ikut menggantung.
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (err) {
    const alasan =
      err instanceof Error && err.name === "TimeoutError"
        ? "Playly tidak menjawab dalam 10 detik"
        : "Playly tidak bisa dihubungi (cek koneksi internet server / alamat PLAYLY_API_URL)";
    throw new PlaylyError(`Gagal mengambil daftar video: ${alasan}.`, 502);
  }

  if (res.status === 401 || res.status === 403) {
    throw new PlaylyError(pesan401, 401);
  }
  if (res.status === 429) {
    throw new PlaylyError(
      "Playly membatasi jumlah permintaan (terlalu sering). Tunggu sebentar lalu coba lagi.",
      429,
    );
  }
  if (res.status === 404) {
    throw new PlaylyError(
      `Endpoint daftar video tidak ditemukan di ${url}. Cek lagi PLAYLY_API_URL.`,
      502,
    );
  }
  if (!res.ok) {
    throw new PlaylyError(`Playly membalas error (HTTP ${res.status}).`, 502);
  }

  try {
    return await res.json();
  } catch {
    throw new PlaylyError(
      "Balasan Playly bukan JSON — kemungkinan alamatnya salah dan yang terbuka halaman biasa.",
      502,
    );
  }
}

/** Sebagian API membungkus kegagalan di dalam badan 200: { ok: false, error }. */
function lemparKalauBadanGagal(data: unknown): void {
  const rec = asRecord(data);
  if (!rec || rec.ok !== false) return;
  const kode = typeof rec.error === "string" ? rec.error : "tidak diketahui";
  const ramah =
    kode === "missing_key"
      ? "Playly tidak menerima kunci kita (header tidak terbaca)."
      : kode === "invalid_key"
        ? "Kunci ditolak Playly. Perbarui kuncinya di Setelan → Playly."
        : `Playly menolak permintaan (${kode}).`;
  throw new PlaylyError(ramah, 401);
}

/** Jalur MITRA: /api/videos + header kunci. Isinya video milik akun kunci itu. */
async function fetchVideoMitra(
  apiKey: string,
  config: PlaylyConfig,
): Promise<PlaylyVideoResult> {
  const data = await ambilJsonPlayly(
    config.videosUrl,
    buildPlaylyHeaders(apiKey),
    "Playly menolak kunci kita (kunci salah, sudah dicabut, atau kedaluwarsa). " +
      "Minta kunci baru ke Playly, lalu perbarui di Setelan → Playly.",
  );
  lemparKalauBadanGagal(data);
  return normalizePlaylyVideos(data, config.allowedHosts, config.embedPattern);
}

/**
 * Jalur KATALOG PUBLIK: /api/catalog, TANPA kunci — persis yang dipakai halaman
 * /nonton milik Playly sendiri.
 *
 * KENAPA ADA: kunci mitra diterbitkan pengelola Playly. Selama kunci itu belum
 * ada atau ditolak, halaman admin kita buntu total — nol video yang bisa dipilih,
 * padahal videonya sudah ter-upload. Katalog ini hanya memuat video yang memang
 * SUDAH dibuka Playly untuk umum, jadi memakainya tidak menembus pembatas apa pun.
 * Bedanya dengan jalur mitra: isinya seluruh video publik Playly, bukan hanya
 * milik satu akun — karena itu sumbernya selalu diberitahukan ke admin.
 */
async function fetchVideoKatalogPublik(
  config: PlaylyConfig,
): Promise<PlaylyVideoResult> {
  const data = await ambilJsonPlayly(
    config.catalogUrl,
    { Accept: "application/json" },
    "Katalog publik Playly menolak permintaan kita.",
  );
  lemparKalauBadanGagal(data);
  return normalizePlaylyVideos(data, config.allowedHosts, config.embedPattern);
}

/**
 * Ambil daftar video Playly untuk halaman admin.
 *
 * Urutan: kunci mitra dulu kalau ada -> kalau kuncinya DITOLAK atau memang belum
 * dipasang, turun ke katalog publik supaya admin tetap bisa memilih video.
 * `source` + `note` ikut dikembalikan supaya halaman admin bisa mengatakan apa
 * adanya daftar ini datang dari mana — jangan sampai admin mengira kunci mitranya
 * sudah jalan padahal belum.
 */
export async function fetchPlaylyVideos(
  config: PlaylyConfig = readPlaylyConfig(),
): Promise<PlaylyFetchResult> {
  const apiKey = await getPlaylyKey();

  if (apiKey) {
    try {
      const hasil = await fetchVideoMitra(apiKey, config);
      return { ...hasil, source: "mitra", note: null };
    } catch (err) {
      // Kunci ditolak (401) bukan alasan untuk buntu — katalog publik masih ada.
      // Kegagalan LAIN (Playly mati, timeout, 404) tetap dilempar apa adanya:
      // menyembunyikannya akan membuat gangguan jaringan terlihat seperti sukses.
      if (!(err instanceof PlaylyError) || err.status !== 401) throw err;
      const hasil = await fetchVideoKatalogPublik(config);
      return {
        ...hasil,
        source: "katalog-publik",
        note: `${err.message} Sementara ini daftar diambil dari katalog publik Playly.`,
      };
    }
  }

  const hasil = await fetchVideoKatalogPublik(config);
  return {
    ...hasil,
    source: "katalog-publik",
    note:
      "Kunci API Playly belum dipasang, jadi daftar ini diambil dari katalog publik Playly. " +
      "Pasang kunci di Setelan → Playly kalau ingin dibatasi ke video akun mitra saja.",
  };
}
