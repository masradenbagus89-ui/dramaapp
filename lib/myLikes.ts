const KEY = "dramaku:liked";

export function readLikedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function isLiked(dramaId: string): boolean {
  return readLikedIds().includes(dramaId);
}

function writeLikedIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("dramaku:liked-changed"));
}

export function setLiked(dramaId: string, liked: boolean): void {
  const list = readLikedIds();
  const idx = list.indexOf(dramaId);
  if (liked && idx === -1) {
    list.push(dramaId);
    writeLikedIds(list);
  } else if (!liked && idx >= 0) {
    list.splice(idx, 1);
    writeLikedIds(list);
  }
}
