// -------------------------------------------------------------------------
// Jembatan ke dashboard upload (playly-dashboard): ambil daftar video yang
// sudah di-upload, lalu tampilkan di WebMovie ini.
//
// Alur: browser -> /api/videos (server WebMovie) -> API dashboard -> Supabase.
//
// KENAPA LEWAT SERVER, BUKAN BROWSER LANGSUNG:
//   1. CORS (aturan situs domain mana yang boleh memanggil API) tidak ikut
//      main pada panggilan server-ke-server, jadi dashboard tidak perlu
//      dikonfigurasi khusus untuk domain kita.
//   2. Kunci API (kalau nanti dipakai) tidak pernah sampai ke browser.
//   3. Hasilnya bisa disimpan sebentar (cache) supaya dashboard tidak dihujani
//      permintaan tiap ada pengunjung.
//
// Penerjemahnya sengaja lentur: nama kolom di dashboard belum pasti, jadi
// beberapa nama yang lazim dicoba satu per satu. Kalau nanti berbeda, cukup
// tambahkan namanya di daftar konstanta di bawah.
// -------------------------------------------------------------------------

/** Bentuk standar yang dipakai WebMovie, apa pun bentuk JSON dashboard. */
export type DashboardVideo = {
  id: string;
  title: string;
  description: string;
  /** Alamat berkas video (Supabase Storage). Wajib https. */
  videoUrl: string;
  thumbnail: string | null;
  createdAt: string | null;
};

export type RejectedVideo = { reason: string; value: string };

export type VideoResult = {
  videos: DashboardVideo[];
  rejected: RejectedVideo[];
};

const LIST_KEYS = ["data", "items", "results", "videos", "rows", "list"];
const VIDEO_URL_KEYS = [
  "videoUrl", "video_url", "url", "fileUrl", "file_url",
  "playbackUrl", "playback_url", "src", "video", "publicUrl", "public_url",
];
const TITLE_KEYS = ["title", "judul", "name", "nama"];
const DESC_KEYS = ["description", "deskripsi", "synopsis", "sinopsis", "desc", "caption"];
const THUMB_KEYS = [
  "thumbnail", "thumbnailUrl", "thumbnail_url", "thumb", "poster",
  "posterUrl", "poster_url", "cover", "image", "preview",
];
const ID_KEYS = ["id", "videoId", "video_id", "uuid", "slug"];
const DATE_KEYS = ["createdAt", "created_at", "insertedAt", "inserted_at", "uploadedAt", "uploaded_at"];

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
 * Wajib https. Situs kita https, dan berkas http akan diblokir browser
 * (mixed content = konten campur aman/tidak aman) sehingga video jadi blank.
 */
function toHttpsUrl(raw: string): URL | null {
  let s = raw.trim();
  if (s.startsWith("//")) s = `https:${s}`;
  try {
    const url = new URL(s);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Daftar domain video yang diizinkan (opsional, dari env).
 *
 * Beda dengan jalur embed/iframe yang WAJIB pakai daftar izin: di sini video
 * diputar dengan tag <video>, yang hanya memutar berkas dan TIDAK menjalankan
 * kode apa pun dari server sumber. Jadi daftar ini bersifat pengetat tambahan:
 * kosong = semua alamat https diterima; diisi = hanya domain itu yang lolos.
 */
export function parseAllowedHosts(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => s.replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter(Boolean);
}

function hostAllowed(host: string, allowedHosts: string[]): boolean {
  if (allowedHosts.length === 0) return true; // tidak dibatasi
  const h = host.toLowerCase();
  return allowedHosts.some((a) => h === a || h.endsWith(`.${a}`));
}

/** Cari array daftar video di dalam JSON, di mana pun dashboard menaruhnya. */
function findList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const rec = asRecord(raw);
  if (!rec) return [];
  for (const k of LIST_KEYS) {
    if (Array.isArray(rec[k])) return rec[k] as unknown[];
  }
  if (pickString(rec, VIDEO_URL_KEYS)) return [rec]; // satu video di akar
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

/** Ubah satu baris JSON dashboard jadi bentuk standar kita. */
function normalizeOne(
  item: unknown,
  index: number,
  allowedHosts: string[],
): { video: DashboardVideo } | { rejected: RejectedVideo } {
  const rec = asRecord(item);
  if (!rec) {
    return { rejected: { reason: "bentuk data tidak dikenali", value: `item ke-${index + 1}` } };
  }

  const rawUrl = pickString(rec, VIDEO_URL_KEYS);
  if (!rawUrl) {
    return { rejected: { reason: "tidak ada alamat video", value: `item ke-${index + 1}` } };
  }

  const url = toHttpsUrl(rawUrl);
  if (!url) {
    return { rejected: { reason: "alamat video harus https", value: rawUrl.slice(0, 120) } };
  }
  if (!hostAllowed(url.hostname, allowedHosts)) {
    return { rejected: { reason: "domain video belum diizinkan", value: url.hostname } };
  }

  const thumbRaw = pickString(rec, THUMB_KEYS);
  const thumbUrl = thumbRaw ? toHttpsUrl(thumbRaw) : null;

  return {
    video: {
      id: pickString(rec, ID_KEYS) ?? url.toString(),
      title: pickString(rec, TITLE_KEYS) ?? `Video ${index + 1}`,
      description: pickString(rec, DESC_KEYS) ?? "",
      videoUrl: url.toString(),
      thumbnail: thumbUrl ? thumbUrl.toString() : null,
      createdAt: pickString(rec, DATE_KEYS),
    },
  };
}

/** PENERJEMAH daftar: JSON dashboard (bentuk apa pun) -> daftar standar. */
export function normalizeVideos(raw: unknown, allowedHosts: string[] = []): VideoResult {
  const videos: DashboardVideo[] = [];
  const rejected: RejectedVideo[] = [];

  findList(raw).forEach((item, index) => {
    const hasil = normalizeOne(item, index, allowedHosts);
    if ("video" in hasil) videos.push(hasil.video);
    else rejected.push(hasil.rejected);
  });

  return { videos, rejected };
}

/** PENERJEMAH detail: balasan 1 video (kadang dibungkus { data: {...} }). */
export function normalizeVideoDetail(
  raw: unknown,
  allowedHosts: string[] = [],
): DashboardVideo | null {
  const rec = asRecord(raw);
  // Kalau dibungkus { data: {...} } atau { video: {...} }, buka bungkusnya dulu.
  const inti =
    rec && !pickString(rec, VIDEO_URL_KEYS)
      ? (asRecord(rec.data) ?? asRecord(rec.video) ?? asRecord(rec.result) ?? rec)
      : rec;

  const { videos } = normalizeVideos(inti ? [inti] : raw, allowedHosts);
  return videos[0] ?? null;
}

// --- Bagian yang menyentuh jaringan --------------------------------------

export class DashboardError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "DashboardError";
    this.status = status;
  }
}

export type DashboardConfig = {
  apiUrl: string;
  apiKey: string;
  allowedHosts: string[];
};

/** Setelan dari env — TANPA NEXT_PUBLIC_, jadi hanya hidup di server. */
export function readDashboardConfig(
  env: Record<string, string | undefined> = process.env,
): DashboardConfig {
  return {
    apiUrl: (env.DASHBOARD_API_URL ?? "").trim().replace(/\/+$/, ""),
    apiKey: (env.DASHBOARD_API_KEY ?? "").trim(),
    allowedHosts: parseAllowedHosts(env.DASHBOARD_VIDEO_HOSTS),
  };
}

async function ambilJson(
  url: string,
  config: DashboardConfig,
  detikCache: number,
): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers,
      // Batas tunggu: kalau dashboard ngadat, halaman kita jangan ikut menggantung.
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: detikCache },
    });
  } catch (err) {
    const alasan =
      err instanceof Error && err.name === "TimeoutError"
        ? "dashboard tidak menjawab dalam 10 detik"
        : "dashboard tidak bisa dihubungi";
    throw new DashboardError(`Gagal mengambil data video: ${alasan}.`, 502);
  }

  if (res.status === 404) {
    throw new DashboardError("Video tidak ditemukan di dashboard.", 404);
  }
  if (!res.ok) {
    throw new DashboardError(`Dashboard membalas error (HTTP ${res.status}).`, 502);
  }

  try {
    return await res.json();
  } catch {
    throw new DashboardError(
      "Balasan dashboard bukan JSON — cek lagi alamat DASHBOARD_API_URL.",
      502,
    );
  }
}

function wajibAdaConfig(config: DashboardConfig): void {
  if (!config.apiUrl) {
    throw new DashboardError(
      "DASHBOARD_API_URL belum di-set. Isi di .env.local (lokal) atau Environment Variables (Vercel).",
      503,
    );
  }
}

/** Ambil daftar video dari dashboard. */
export async function fetchVideos(
  config: DashboardConfig = readDashboardConfig(),
): Promise<VideoResult> {
  wajibAdaConfig(config);
  const data = await ambilJson(config.apiUrl, config, 60);
  return normalizeVideos(data, config.allowedHosts);
}

/** Ambil detail 1 video dari dashboard. */
export async function fetchVideoDetail(
  id: string,
  config: DashboardConfig = readDashboardConfig(),
): Promise<DashboardVideo | null> {
  wajibAdaConfig(config);
  const data = await ambilJson(
    `${config.apiUrl}/${encodeURIComponent(id)}`,
    config,
    60,
  );
  return normalizeVideoDetail(data, config.allowedHosts);
}
