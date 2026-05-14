const KEY = "dramaku:my-list";

export function readMyList(): string[] {
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

export function writeMyList(ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("dramaku:my-list-changed"));
}

export function isSaved(id: string): boolean {
  return readMyList().includes(id);
}

export function toggleSaved(id: string): boolean {
  const list = readMyList();
  const i = list.indexOf(id);
  if (i >= 0) {
    list.splice(i, 1);
    writeMyList(list);
    return false;
  }
  list.unshift(id);
  writeMyList(list);
  return true;
}
