import type { Drama } from "./types";

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
