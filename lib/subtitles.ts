// Helper subtitle/multi-bahasa untuk sisi klien.
// Subtitle di-proxy lewat /api/subtitle supaya SAME-ORIGIN dengan web —
// jadi <track> tidak kena blokir CORS dan elemen <video> tidak perlu
// crossOrigin (yang bisa bikin playback video existing gagal).

export const OFF = "off";

const KEY = "dramaku:subtitle";

/** Bahasa subtitle pilihan user (kode bahasa atau "off"). Default: "id". */
export function readSubtitlePref(): string {
  if (typeof window === "undefined") return "id";
  try {
    return window.localStorage.getItem(KEY) || "id";
  } catch {
    return "id";
  }
}

export function writeSubtitlePref(code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, code);
  } catch {
    /* abaikan */
  }
}

/**
 * Pilih bahasa awal: hormati preferensi user kalau tersedia di drama ini,
 * kalau tidak pakai bahasa pertama yang ada, kalau drama tak punya subtitle → off.
 */
export function initialSubtitle(available: string[]): string {
  const pref = readSubtitlePref();
  if (pref === OFF) return OFF;
  if (available.includes(pref)) return pref;
  return available[0] ?? OFF;
}

/** URL subtitle yang di-proxy app (same-origin). */
export function subtitleUrl(dramaId: string, ep: number, code: string): string {
  const qs = new URLSearchParams({ id: dramaId, ep: String(ep), lang: code });
  return `/api/subtitle?${qs.toString()}`;
}

/**
 * Set track mana yang tampil pada sebuah elemen <video>.
 * Cocokkan berdasarkan language (srcLang). "off" → semua dimatikan.
 */
export function applySubtitle(video: HTMLVideoElement | null, code: string): void {
  if (!video) return;
  const tracks = video.textTracks;
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    t.mode = code !== OFF && t.language === code ? "showing" : "hidden";
  }
}
