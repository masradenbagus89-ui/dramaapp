import type { Drama } from "./types";
import type { HistoryItem } from "./progress";

export function getFavoriteDramas(
  ids: string[],
  dramas: Drama[],
  maxItems = 6,
): Drama[] {
  const byId = new Map(dramas.map((d) => [d.id, d]));
  return ids
    .map((id) => byId.get(id))
    .filter((d): d is Drama => Boolean(d))
    .slice(0, maxItems);
}

export function getContinueWatching(
  entries: HistoryItem[],
  dramas: Drama[],
  maxItems = 6,
): HistoryItem[] {
  const byId = new Map(dramas.map((d) => [d.id, d]));
  return entries.filter((h) => byId.has(h.dramaId)).slice(0, maxItems);
}
