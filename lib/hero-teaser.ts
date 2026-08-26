import type { Drama } from "./types";
import { parseViews } from "./format";

/** Berapa kali file teaser boleh dicoba ulang sebelum benar-benar dianggap gagal. */
export const VIDEO_RETRY_LIMIT = 2;

/** Geser jari minimal (px) supaya dihitung swipe, bukan ketukan. */
export const SWIPE_MIN_PX = 48;

/** Jeda ganti-slide saat trailer sedang mutar (lebih lama dari foto diam). */
export const PLAYING_ROTATE_MS = 20_000;

/**
 * Jeda sebelum teaser hero MULAI diunduh (ms). Poster diam tampil lebih dulu.
 *
 * KENAPA ADA: pengunjung yang langsung menutup halaman - dan bot perayap yang
 * menjalankan JavaScript - jadi tidak ikut menarik video sama sekali. Sebelum
 * ini hero memakai preload="auto" + autoplay seketika, jadi SETIAP kunjungan
 * (sekejap pun) menarik puluhan MB lewat Vercel.
 */
export const HERO_TEASER_DELAY_MS = 1200;

/**
 * Panjang cuplikan hover di kartu drama (detik) sebelum diulang dari awal.
 *
 * KENAPA ADA: pengganti TEASER_BYTES di app/api/teaser/route.ts yang dulu
 * dideklarasikan tapi TIDAK PERNAH dipakai, sehingga satu hover berkepanjangan
 * bisa menarik SELURUH file episode. Sesudah teaser jadi redirect, server tak
 * lagi bisa memotong byte - batasnya pindah ke browser: mengulang di detik
 * ke-10 membuat browser berhenti menambah buffer (potongan yang sama diputar
 * ulang dari cache, bukan diunduh lagi).
 */
export const CARD_PREVIEW_SEC = 10;

export type TeaserStatus = "loading" | "playing" | "failed";

export function shouldGiveUpVideo(errorCount: number): boolean {
  return errorCount > VIDEO_RETRY_LIMIT;
}

/** Ulang potongan teaser (lewati intro) — jangan putar sampai habis. */
export function teaserShouldLoop(
  currentTime: number,
  duration: number,
  startAt: number,
  windowSec: number,
): boolean {
  return (
    Number.isFinite(duration) &&
    duration > startAt + windowSec &&
    currentTime > startAt + windowSec
  );
}

/**
 * Arah swipe horizontal. 1 = berikutnya, -1 = sebelumnya, 0 = bukan swipe
 * (ketukan atau geser atas-bawah).
 */
export function swipeDirection(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): -1 | 1 | 0 {
  const dx = endX - startX;
  const dy = endY - startY;
  if (Math.abs(dx) < SWIPE_MIN_PX) return 0;
  if (Math.abs(dx) < Math.abs(dy) * 1.2) return 0;
  return dx < 0 ? 1 : -1;
}

/**
 * Alamat teaser same-origin. Browser memutar lewat /api/teaser (bukan tunnel
 * langsung) supaya Range & error cepat, dan poster hidup tetap kelihatan
 * kalau file/tunnel gagal.
 */
export function teaserSrc(dramaId: string, ep = 1): string {
  return `/api/teaser?id=${encodeURIComponent(dramaId)}&ep=${ep}`;
}

/** Pilih 5 judul unggulan. Utamakan drama berseri (punya episode), bukan film IMDb 1 bagian. */
export function featuredHeroSlides(dramas: Drama[], max = 5): Drama[] {
  const withArt = dramas.filter((d) => d.heroImage || d.posterImage);
  const pool = withArt.length > 0 ? withArt : dramas;
  const series = pool.filter((d) => d.episodes >= 5);
  const ranked = [...(series.length > 0 ? series : pool)].sort(
    (a, b) => parseViews(b.views) - parseViews(a.views),
  );
  return ranked.slice(0, Math.max(1, Math.min(max, ranked.length)));
}

/**
 * Pecah judul hero menjadi beberapa baris untuk tampilan cinematic.
 * Prioritaskan pemisah koma (contoh: "A, B" -> ["A", "B"]).
 * Kalau tidak ada koma, kembalikan judul utuh dan biarkan CSS line-clamp
 * yang membatasi jumlah baris.
 */
export function splitHeroTitle(title: string, maxLines = 3): string[] {
  const trimmed = title.trim();
  if (!trimmed) return [];

  if (trimmed.includes(",")) {
    const parts = trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2 && parts.length <= maxLines) {
      return parts;
    }
  }

  return [trimmed];
}
