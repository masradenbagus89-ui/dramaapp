// Menyimpan posisi "terakhir nonton" per drama (episode ke berapa) di localStorage.
// Pola sama dengan lib/myList.ts & lib/myLikes.ts.
const KEY = "dramaku:progress";

type ProgressMap = Record<string, number>; // dramaId -> episode terakhir (1-based)

function read(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? (obj as ProgressMap) : {};
  } catch {
    return {};
  }
}

export function getProgress(dramaId: string): number {
  const ep = read()[dramaId];
  return typeof ep === "number" && ep >= 1 ? ep : 1;
}

export function setProgress(dramaId: string, ep: number): void {
  if (typeof window === "undefined") return;
  const map = read();
  if (map[dramaId] === ep) return;
  map[dramaId] = ep;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
    window.dispatchEvent(new Event("dramaku:progress-changed"));
  } catch {
    // storage penuh / disabled — abaikan
  }
}
