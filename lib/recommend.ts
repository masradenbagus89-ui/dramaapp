import type { Drama } from "./types";
import { parseRating, parseViews } from "./format";

/** Genre yang paling sering muncul di riwayat + favorit perangkat ini. */
export function favoriteGenre(
  dramas: Drama[],
  historyIds: string[],
  savedIds: string[],
): string | null {
  const byId = new Map(dramas.map((d) => [d.id, d]));
  const counts = new Map<string, number>();
  for (const id of [...historyIds, ...savedIds]) {
    const d = byId.get(id);
    if (!d) continue;
    counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
  }
  let best: string | null = null;
  let n = 0;
  for (const [genre, count] of counts) {
    if (count > n) {
      n = count;
      best = genre;
    }
  }
  return n >= 1 ? best : null;
}

/**
 * Rekomendasi sederhana: drama genre favorit yang belum ditonton/disimpan.
 * Kalau pool genre kosong → judul lain yang belum disentuh.
 */
export function recommendDramas(
  dramas: Drama[],
  historyIds: string[],
  savedIds: string[],
  limit = 12,
): { genre: string | null; items: Drama[] } {
  const seen = new Set([...historyIds, ...savedIds]);
  const genre = favoriteGenre(dramas, historyIds, savedIds);
  const inGenre = genre
    ? dramas.filter((d) => d.category === genre && !seen.has(d.id))
    : [];
  const items =
    inGenre.length > 0
      ? inGenre.slice(0, limit)
      : dramas.filter((d) => !seen.has(d.id)).slice(0, limit);
  return { genre: inGenre.length > 0 ? genre : null, items };
}

/**
 * Skor kesamaan dua drama: kategori sama + tahun dekat + rating selevel.
 * Semakin tinggi, semakin mirip. 0 = tidak mirip.
 */
export function similarityScore(a: Drama, b: Drama): number {
  let score = 0;
  if (a.category === b.category) score += 4;

  const yearA = Number(a.year) || 0;
  const yearB = Number(b.year) || 0;
  if (yearA && yearB) {
    const diff = Math.abs(yearA - yearB);
    if (diff === 0) score += 3;
    else if (diff <= 1) score += 2;
    else if (diff <= 2) score += 1;
  }

  const ratingA = parseRating(a.imdbRating);
  const ratingB = parseRating(b.imdbRating);
  if (ratingA > 0 && ratingB > 0) {
    const diff = Math.abs(ratingA - ratingB);
    if (diff <= 0.5) score += 2;
    else if (diff <= 1.0) score += 1;
  }

  // Sedikit boost kalau sama-sama populer.
  if (parseViews(a.views) > 0 && parseViews(b.views) > 0) score += 1;

  return score;
}

/**
 * Rekomendasi berdasarkan drama terakhir yang ditonton/disimpan.
 * Menghasilkan "Karena kamu menonton X" dengan daftar yang benar-benar mirip.
 */
export function similarToDrama(
  dramaId: string,
  dramas: Drama[],
  historyIds: string[],
  savedIds: string[],
  limit = 12,
): { base: Drama | null; items: Drama[] } {
  const byId = new Map(dramas.map((d) => [d.id, d]));
  const base = byId.get(dramaId) ?? null;
  if (!base) return { base: null, items: [] };

  const seen = new Set([...historyIds, ...savedIds]);
  seen.add(dramaId);

  const scored = dramas
    .filter((d) => d.id !== dramaId && !seen.has(d.id))
    .map((d) => ({ drama: d, score: similarityScore(base, d) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || parseViews(b.drama.views) - parseViews(a.drama.views));

  return {
    base,
    items: scored.slice(0, limit).map((x) => x.drama),
  };
}

/** Drama paling banyak ditonton di sebuah genre. */
export function trendingInGenre(
  genre: string | null,
  dramas: Drama[],
  limit = 12,
): Drama[] {
  if (!genre) return [];
  return dramas
    .filter((d) => d.category === genre)
    .sort((a, b) => parseViews(b.views) - parseViews(a.views))
    .slice(0, limit);
}

/** Drama terakhir yang punya progress (untuk dasar "Karena kamu menonton X"). */
export function latestHistoryDrama(
  dramas: Drama[],
  historyIds: string[],
): Drama | null {
  if (historyIds.length === 0) return null;
  const byId = new Map(dramas.map((d) => [d.id, d]));
  return byId.get(historyIds[0]) ?? null;
}
