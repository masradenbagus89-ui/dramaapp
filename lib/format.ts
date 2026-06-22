// Helper format angka tampilan (views) — dipakai bersama oleh halaman admin,
// beranda, dan komponen BerandaRows. Fungsi murni (tanpa DOM/server), jadi aman
// dipakai di server component maupun client component.

/** Ubah teks views ("1.2M", "850K", "1.5B", "1200") jadi angka. */
export function parseViews(s: string): number {
  const m = s.trim().match(/^([0-9.]+)\s*([kKmMbB]?)$/);
  if (!m) return Number(s) || 0;
  const num = parseFloat(m[1]);
  const u = m[2].toLowerCase();
  const mult = u === "b" ? 1_000_000_000 : u === "m" ? 1_000_000 : u === "k" ? 1_000 : 1;
  return num * mult;
}

/** Ubah angka jadi teks ringkas ("1.2M", "850.0K", ...). */
export function formatViews(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

/** Ubah judul jadi slug URL-aman ("Drama Keren!" -> "drama-keren"). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Ubah detik jadi waktu tampilan "m:ss" (mis. 83 -> "1:23"). Negatif/NaN -> "0:00". */
export function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
