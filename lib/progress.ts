// Menyimpan posisi "terakhir nonton" per drama di localStorage.
// Pola sama dengan lib/myList.ts & lib/myLikes.ts.
// Format baru: { episode, lastWatchedAt, positionSec, durationSec, byEpisode }.
// Format lama (angka episode, atau objek tanpa detik) tetap dibaca.
import { fmtTime } from "./format";

const KEY = "dramaku:progress";
/** Di bawah ini dianggap "baru mulai" — jangan resume. */
const RESUME_MIN_SEC = 5;
/** Kalau sudah hampir habis, mulai dari 0 (atau episode berikutnya). */
const RESUME_SKIP_END = 0.95;
/** Episode dianggap selesai ditonton. */
const WATCHED_RATIO = 0.9;

export type EpisodeProgress = {
  positionSec: number;
  durationSec: number;
};

export type ProgressEntry = {
  episode: number;
  lastWatchedAt: string | null;
  positionSec: number;
  durationSec: number;
  byEpisode: Record<string, EpisodeProgress>;
};

export type HistoryItem = {
  dramaId: string;
  episode: number;
  lastWatchedAt: string | null;
  positionSec: number;
  durationSec: number;
};

export type ProgressPatch = {
  positionSec?: number;
  durationSec?: number;
  completed?: boolean;
};

export type HistoryBucket = "today" | "yesterday" | "thisWeek" | "older";

export const HISTORY_BUCKETS: { id: HistoryBucket; label: string }[] = [
  { id: "today", label: "Hari ini" },
  { id: "yesterday", label: "Kemarin" },
  { id: "thisWeek", label: "Minggu ini" },
  { id: "older", label: "Lebih lama" },
];

type ProgressMap = Record<string, ProgressEntry>;

function numOr0(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function parseByEpisode(value: unknown): Record<string, EpisodeProgress> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, EpisodeProgress> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as { positionSec?: unknown; durationSec?: unknown };
    out[key] = {
      positionSec: numOr0(row.positionSec),
      durationSec: numOr0(row.durationSec),
    };
  }
  return out;
}

function emptyEntry(episode: number): ProgressEntry {
  return {
    episode,
    lastWatchedAt: null,
    positionSec: 0,
    durationSec: 0,
    byEpisode: {},
  };
}

function parseEntry(value: unknown): ProgressEntry | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 1) {
    return emptyEntry(Math.floor(value));
  }
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const ep = obj.episode;
  if (typeof ep !== "number" || !Number.isFinite(ep) || ep < 1) return null;
  const episode = Math.floor(ep);
  const positionSec = numOr0(obj.positionSec);
  const durationSec = numOr0(obj.durationSec);
  const byEpisode = parseByEpisode(obj.byEpisode);
  const key = String(episode);
  if (!byEpisode[key] && (positionSec > 0 || durationSec > 0)) {
    byEpisode[key] = { positionSec, durationSec };
  }
  const at = obj.lastWatchedAt;
  return {
    episode,
    lastWatchedAt: typeof at === "string" && at.length > 0 ? at : null,
    positionSec,
    durationSec,
    byEpisode,
  };
}

function toHistoryItem(dramaId: string, entry: ProgressEntry): HistoryItem {
  return {
    dramaId,
    episode: entry.episode,
    lastWatchedAt: entry.lastWatchedAt,
    positionSec: entry.positionSec,
    durationSec: entry.durationSec,
  };
}

function read(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    const map: ProgressMap = {};
    for (const [id, value] of Object.entries(obj as Record<string, unknown>)) {
      const entry = parseEntry(value);
      if (entry) map[id] = entry;
    }
    return map;
  } catch {
    return {};
  }
}

function persist(map: ProgressMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
    window.dispatchEvent(new Event("dramaku:progress-changed"));
  } catch {
    // storage penuh / disabled — abaikan
  }
}

export function getProgress(dramaId: string): number {
  const ep = read()[dramaId]?.episode;
  return typeof ep === "number" && ep >= 1 ? ep : 1;
}

export function getProgressEntry(dramaId: string): ProgressEntry | null {
  return read()[dramaId] ?? null;
}

export function setProgress(
  dramaId: string,
  ep: number,
  patch: ProgressPatch = {},
): void {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(ep) || ep < 1) return;
  const episode = Math.floor(ep);
  const map = read();
  const prev = map[dramaId] ?? emptyEntry(episode);
  const key = String(episode);
  const prevMeta = prev.byEpisode[key];
  let positionSec =
    patch.positionSec !== undefined
      ? Math.max(0, patch.positionSec)
      : (prevMeta?.positionSec ?? 0);
  let durationSec =
    patch.durationSec !== undefined
      ? Math.max(0, patch.durationSec)
      : (prevMeta?.durationSec ?? 0);
  if (patch.completed && durationSec > 0) {
    positionSec = durationSec;
  }
  map[dramaId] = {
    episode,
    lastWatchedAt: new Date().toISOString(),
    positionSec,
    durationSec,
    byEpisode: {
      ...prev.byEpisode,
      [key]: { positionSec, durationSec },
    },
  };
  persist(map);
}

export function readHistory(): HistoryItem[] {
  const items: HistoryItem[] = Object.entries(read()).map(([dramaId, entry]) =>
    toHistoryItem(dramaId, entry),
  );
  items.sort((a, b) => {
    const ta = a.lastWatchedAt ? Date.parse(a.lastWatchedAt) : 0;
    const tb = b.lastWatchedAt ? Date.parse(b.lastWatchedAt) : 0;
    const na = Number.isFinite(ta) ? ta : 0;
    const nb = Number.isFinite(tb) ? tb : 0;
    return nb - na;
  });
  return items;
}

export function episodeMap(
  items: HistoryItem[] = readHistory(),
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) map[item.dramaId] = item.episode;
  return map;
}

export function removeProgress(dramaId: string): void {
  if (typeof window === "undefined") return;
  const map = read();
  if (!(dramaId in map)) return;
  delete map[dramaId];
  persist(map);
}

export function clearProgress(): void {
  if (typeof window === "undefined") return;
  persist({});
}

export function resumePosition(entry: ProgressEntry | null, ep: number): number {
  if (!entry) return 0;
  const meta =
    entry.byEpisode[String(ep)] ??
    (entry.episode === ep
      ? { positionSec: entry.positionSec, durationSec: entry.durationSec }
      : null);
  if (!meta || meta.positionSec < RESUME_MIN_SEC) return 0;
  if (meta.durationSec > 0 && meta.positionSec / meta.durationSec >= RESUME_SKIP_END) {
    return 0;
  }
  return meta.positionSec;
}

export function isEpisodeWatched(entry: ProgressEntry | null, ep: number): boolean {
  if (!entry) return false;
  if (entry.episode > ep) return true;
  const meta = entry.byEpisode[String(ep)];
  if (!meta || meta.durationSec <= 0) return false;
  return meta.positionSec / meta.durationSec >= WATCHED_RATIO;
}

export function episodeDurationSec(
  entry: ProgressEntry | null,
  ep: number,
): number {
  if (!entry) return 0;
  return entry.byEpisode[String(ep)]?.durationSec ?? 0;
}

export function continueLabel(item: {
  episode: number;
  positionSec: number;
}): string {
  if (item.positionSec >= 1) {
    return `Lanjut Menonton Episode ${item.episode} dari ${fmtTime(item.positionSec)}`;
  }
  return `Lanjut Menonton Episode ${item.episode}`;
}

export function watchPercent(
  item: { episode: number; positionSec: number; durationSec: number },
  totalEpisodes: number,
): number {
  if (item.durationSec > 0) {
    return Math.min(100, Math.round((item.positionSec / item.durationSec) * 100));
  }
  const total = Math.max(totalEpisodes, 1);
  return Math.min(100, Math.round((item.episode / total) * 100));
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function historyBucket(
  lastWatchedAt: string | null,
  now: Date = new Date(),
): HistoryBucket {
  if (!lastWatchedAt) return "older";
  const watched = new Date(lastWatchedAt);
  if (Number.isNaN(watched.getTime())) return "older";
  const diffDays = Math.round(
    (startOfLocalDay(now).getTime() - startOfLocalDay(watched).getTime()) /
      MS_PER_DAY,
  );
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return "thisWeek";
  return "older";
}

export function groupHistoryByBucket(
  items: HistoryItem[],
  now: Date = new Date(),
): { id: HistoryBucket; label: string; items: HistoryItem[] }[] {
  const grouped = new Map<HistoryBucket, HistoryItem[]>();
  for (const item of items) {
    const bucket = historyBucket(item.lastWatchedAt, now);
    const arr = grouped.get(bucket);
    if (arr) arr.push(item);
    else grouped.set(bucket, [item]);
  }
  return HISTORY_BUCKETS.filter((b) => (grouped.get(b.id)?.length ?? 0) > 0).map(
    (b) => ({ ...b, items: grouped.get(b.id)! }),
  );
}
