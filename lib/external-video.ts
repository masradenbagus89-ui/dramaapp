// -------------------------------------------------------------------------
// Jalur "terima data dari API pihak lain" untuk video yang PLAYER-nya
// di-hosting di server orang lain (embed / iframe).
//
// Alur singkatnya:
//   API mereka (JSON, bentuknya bisa macam-macam)
//     -> normalizeExternalVideos()  = penerjemah ke bentuk standar kita
//     -> hanya alamat yang LOLOS pagar domain yang diteruskan ke browser
//     -> komponen EmbedPlayer merender <iframe src=...> -> video jalan.
//
// KENAPA ADA PAGAR DOMAIN: alamat (URL) yang datang dari luar tidak boleh
// dipercaya mentah-mentah. Kalau embed bisa diisi alamat sembarangan, orang
// bisa menitipkan halaman palsu (phishing = halaman tiruan pencuri data) di
// dalam situs kita, dan pengunjung mengira itu punya kita. Karena itu
// aturannya "default deny" (tolak dulu semua): hanya domain yang ditulis di
// env EXTERNAL_VIDEO_EMBED_HOSTS yang boleh tampil.
//
// File ini SENGAJA tidak menyentuh pemutar lama (lib/video.ts). Video dari
// PC backup tetap jalan seperti biasa; ini jalur tambahan, bukan pengganti.
// -------------------------------------------------------------------------

/** Bentuk standar kita — apa pun bentuk JSON dari penyedia, ujungnya jadi ini. */
export type ExternalVideo = {
  /** Pengenal unik untuk key React & tombol pilih episode. */
  id: string;
  title: string;
  /** Alamat player siap tempel; SUDAH lolos cek https + daftar domain. */
  embedUrl: string;
  poster: string | null;
  episode: number | null;
  /** Nama domain penyedia, mis. "player.contoh.com" — buat ditampilkan/log. */
  provider: string;
};

/** Item yang dibuang + alasannya, supaya kalau kosong kita tahu SEBABNYA. */
export type RejectedVideo = { reason: string; value: string };

export type NormalizeResult = {
  videos: ExternalVideo[];
  rejected: RejectedVideo[];
};

// --- Nama-nama field yang lazim dipakai penyedia embed --------------------
// Daftar ini CONTOH yang umum, bukan daftar tertutup. Kalau nanti API Kang
// Dedi memakai nama lain, cukup tambahkan namanya di baris yang sesuai.
const LIST_KEYS = ["data", "items", "results", "videos", "list", "rows", "episodes"];
const EMBED_KEYS = [
  "embedUrl", "embed_url", "embed", "playerUrl", "player_url", "player",
  "iframe", "frame", "url", "link", "src", "file", "stream",
];
const TITLE_KEYS = ["title", "name", "judul", "label", "episodeTitle", "episode_title"];
const POSTER_KEYS = ["poster", "posterUrl", "poster_url", "thumbnail", "thumb", "image", "cover", "preview"];
const ID_KEYS = ["id", "videoId", "video_id", "slug", "code", "key", "hash"];
const EPISODE_KEYS = ["episode", "ep", "episodeNumber", "episode_number", "eps", "nomor"];

/** Ambil src dari kode tempel <iframe ...>. Banyak API mengirim HTML, bukan URL. */
const IFRAME_SRC_RE = /<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i;

/**
 * Kembalikan entitas HTML dasar ke karakter aslinya, mis. "&amp;" -> "&".
 * Dipakai untuk TEKS TAMPILAN (judul), bukan untuk alamat.
 *
 * Aman dari XSS karena hasilnya dirender React sebagai teks biasa — React
 * otomatis meng-escape lagi saat menampilkan, dan kita TIDAK pernah memakai
 * dangerouslySetInnerHTML di jalur ini.
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&"); // paling akhir, supaya "&amp;lt;" tidak salah urai
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Ambil teks pertama yang tidak kosong dari beberapa kemungkinan nama field. */
function pickString(rec: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

/** Ambil angka (mis. nomor episode) — "12" maupun 12 sama-sama diterima. */
function pickNumber(rec: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number.parseInt(v.trim(), 10);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/**
 * Ubah daftar domain dari env jadi array rapi.
 * Terima pemisah koma/spasi/baris baru, dan tahan kalau ditulis lengkap
 * dengan "https://" atau garis miring di ujung.
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

/** Domain cocok kalau sama persis ATAU subdomainnya (cdn.contoh.com ⊂ contoh.com). */
function hostAllowed(host: string, allowedHosts: string[]): boolean {
  const h = host.toLowerCase();
  return allowedHosts.some((a) => h === a || h.endsWith(`.${a}`));
}

/**
 * Rapikan calon alamat embed jadi URL yang sah.
 * - "&amp;" dikembalikan jadi "&" (sering terbawa kalau sumbernya HTML).
 * - "//host/path" (protocol-relative) dilengkapi jadi https.
 * - WAJIB https: situs kita https, isi http akan diblokir browser
 *   (mixed content = konten campur aman/tidak aman) → videonya blank.
 */
function toHttpsUrl(raw: string): URL | null {
  let s = raw.trim().replace(/&amp;/g, "&");
  if (s.startsWith("//")) s = `https:${s}`;
  try {
    const url = new URL(s);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** Dari nilai mentah (URL polos ATAU kode tempel <iframe>) → alamat player. */
export function extractEmbedUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  const fromIframe = s.match(IFRAME_SRC_RE);
  if (fromIframe) return fromIframe[1].trim();
  if (/^(https?:)?\/\//i.test(s)) return s;
  return null;
}

/** Pagar utama: alamat ini boleh dipasang di iframe atau tidak. */
export function isAllowedEmbedUrl(raw: string, allowedHosts: string[]): boolean {
  if (allowedHosts.length === 0) return false; // daftar kosong = tolak semua
  const url = toHttpsUrl(raw);
  return url !== null && hostAllowed(url.hostname, allowedHosts);
}

/** Cari array daftar video di dalam JSON, di mana pun ia diletakkan penyedia. */
function findList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const rec = asRecord(raw);
  if (!rec) return [];
  for (const k of LIST_KEYS) {
    if (Array.isArray(rec[k])) return rec[k] as unknown[];
  }
  // Beberapa API mengirim SATU video langsung di akar (bukan daftar).
  if (pickString(rec, EMBED_KEYS)) return [rec];
  // Kadang daftarnya bersarang satu lapis lagi, mis. { result: { data: [...] } }
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

/**
 * PENERJEMAH: JSON bentuk apa pun → daftar ExternalVideo yang sudah aman.
 * Fungsi MURNI (tanpa jaringan/env) supaya gampang dites.
 */
export function normalizeExternalVideos(
  raw: unknown,
  allowedHosts: string[],
): NormalizeResult {
  const videos: ExternalVideo[] = [];
  const rejected: RejectedVideo[] = [];

  findList(raw).forEach((item, index) => {
    // Item bisa berupa objek, bisa juga cuma string URL/kode iframe.
    const rec = asRecord(item);
    const rawEmbed =
      typeof item === "string" ? item : rec ? pickString(rec, EMBED_KEYS) : null;

    if (!rawEmbed) {
      rejected.push({ reason: "tidak ada alamat embed", value: `item ke-${index + 1}` });
      return;
    }

    const candidate = extractEmbedUrl(rawEmbed);
    if (!candidate) {
      rejected.push({ reason: "bukan alamat yang bisa dibaca", value: rawEmbed.slice(0, 120) });
      return;
    }

    const url = toHttpsUrl(candidate);
    if (!url) {
      rejected.push({ reason: "alamat harus https", value: candidate.slice(0, 120) });
      return;
    }
    if (allowedHosts.length === 0) {
      rejected.push({
        reason: "daftar domain yang diizinkan masih kosong (isi EXTERNAL_VIDEO_EMBED_HOSTS)",
        value: url.hostname,
      });
      return;
    }
    if (!hostAllowed(url.hostname, allowedHosts)) {
      rejected.push({ reason: "domain belum diizinkan", value: url.hostname });
      return;
    }

    const embedUrl = url.toString();
    const judulMentah = rec ? pickString(rec, TITLE_KEYS) : null;
    const title = judulMentah ? decodeEntities(judulMentah) : `Video ${index + 1}`;
    const episode = rec ? pickNumber(rec, EPISODE_KEYS) : null;
    const posterRaw = rec ? pickString(rec, POSTER_KEYS) : null;
    const poster = posterRaw ? (toHttpsUrl(posterRaw)?.toString() ?? null) : null;

    videos.push({
      id: (rec && pickString(rec, ID_KEYS)) ?? embedUrl,
      title,
      embedUrl,
      poster,
      episode,
      provider: url.hostname,
    });
  });

  return { videos, rejected };
}

// --- Bagian yang menyentuh jaringan --------------------------------------

/** Error dengan kode status, supaya route bisa membalas status yang BENAR. */
export class ExternalVideoError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ExternalVideoError";
    this.status = status;
  }
}

export type ExternalVideoConfig = {
  apiUrl: string;
  apiKey: string;
  /** Nama header untuk kunci, mis. "X-API-Key". Kosong = pakai Authorization: Bearer. */
  keyHeader: string;
  /** Kalau penyedia minta kunci lewat query, mis. "api_key". */
  keyParam: string;
  allowedHosts: string[];
};

/**
 * Baca setelan dari env. TANPA prefix NEXT_PUBLIC_ = hanya hidup di server,
 * jadi kunci API tidak ikut terkirim ke browser pengunjung.
 */
export function readExternalVideoConfig(
  env: Record<string, string | undefined> = process.env,
): ExternalVideoConfig {
  return {
    apiUrl: env.EXTERNAL_VIDEO_API_URL?.trim() ?? "",
    apiKey: env.EXTERNAL_VIDEO_API_KEY?.trim() ?? "",
    keyHeader: env.EXTERNAL_VIDEO_API_KEY_HEADER?.trim() ?? "",
    keyParam: env.EXTERNAL_VIDEO_API_KEY_PARAM?.trim() ?? "",
    allowedHosts: parseAllowedHosts(env.EXTERNAL_VIDEO_EMBED_HOSTS),
  };
}

/** Parameter pencarian yang BOLEH diteruskan ke API penyedia (sengaja dibatasi). */
export type ExternalVideoQuery = {
  q?: string | null;
  page?: string | null;
  id?: string | null;
};

/**
 * Jemput data ke API penyedia lalu terjemahkan ke bentuk standar kita.
 *
 * Alamat dasarnya HANYA dari env — tidak pernah dari input pengunjung. Ini
 * mencegah SSRF (server dipaksa menembak alamat internal yang tidak boleh
 * diakses publik).
 */
export async function fetchExternalVideos(
  query: ExternalVideoQuery = {},
  config: ExternalVideoConfig = readExternalVideoConfig(),
): Promise<NormalizeResult> {
  if (!config.apiUrl) {
    throw new ExternalVideoError(
      "EXTERNAL_VIDEO_API_URL belum di-set. Isi dulu di .env.local (lokal) atau Environment Variables (Vercel).",
      503,
    );
  }

  let url: URL;
  try {
    url = new URL(config.apiUrl);
  } catch {
    throw new ExternalVideoError(
      `EXTERNAL_VIDEO_API_URL bukan alamat yang sah: "${config.apiUrl}"`,
      503,
    );
  }

  if (query.q) url.searchParams.set("q", query.q);
  if (query.page) url.searchParams.set("page", query.page);
  if (query.id) url.searchParams.set("id", query.id);
  if (config.apiKey && config.keyParam) {
    url.searchParams.set(config.keyParam, config.apiKey);
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.apiKey && !config.keyParam) {
    if (config.keyHeader) headers[config.keyHeader] = config.apiKey;
    else headers.Authorization = `Bearer ${config.apiKey}`;
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers,
      // Batas tunggu 10 detik: kalau server mereka ngadat, halaman kita
      // jangan ikut menggantung tanpa ujung.
      signal: AbortSignal.timeout(10_000),
      // Simpan sebentar (60 detik) supaya tidak menghujani API mereka.
      next: { revalidate: 60 },
    });
  } catch (err) {
    const alasan = err instanceof Error && err.name === "TimeoutError"
      ? "server penyedia tidak menjawab dalam 10 detik"
      : "server penyedia tidak bisa dihubungi";
    throw new ExternalVideoError(`Gagal menghubungi API video: ${alasan}.`, 502);
  }

  if (!res.ok) {
    throw new ExternalVideoError(
      `API video membalas error (HTTP ${res.status}).`,
      502,
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ExternalVideoError(
      "Balasan API video bukan JSON — cek lagi alamat endpoint-nya.",
      502,
    );
  }

  return normalizeExternalVideos(data, config.allowedHosts);
}
