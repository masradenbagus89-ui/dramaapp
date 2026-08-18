/**
 * Identitas situs untuk SEO — SATU sumber, jangan hardcode URL di tempat lain.
 * Dipakai metadataBase, canonical, sitemap, robots, dan preview share (OG).
 *
 * Pindah domain cukup set NEXT_PUBLIC_SITE_URL di Vercel — tanpa ubah kode.
 */

const DEFAULT_SITE_URL = "https://dramaapp.vercel.app";

/** Alamat resmi situs, tanpa garis miring di ujung supaya penggabungan URL konsisten. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL
).replace(/\/+$/, "");

export const SITE_NAME = "DramaKu";

/** Batas meta description yang dipakai mesin pencari; lebih dari ini dipotong "...". */
const MAX_DESCRIPTION = 160;

/**
 * Rapikan sinopsis jadi meta description: satu baris, dipotong di batas kata
 * supaya tidak terputus di tengah kata.
 */
export function toMetaDescription(text: string, fallback: string): string {
  const clean = text?.replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  if (clean.length <= MAX_DESCRIPTION) return clean;
  const cut = clean.slice(0, MAX_DESCRIPTION);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : cut.length).trimEnd()}…`;
}

/** Ubah path relatif jadi URL absolut — OG image wajib absolut, relatif diabaikan pemindai. */
export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
