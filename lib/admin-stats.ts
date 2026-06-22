// Hitungan ringkasan untuk Dashboard admin. Fungsi MURNI (tanpa DOM/server),
// dipisah dari app/admin/page.tsx supaya bisa dites tersendiri & komponen
// halaman jadi lebih kecil. Perilaku dipertahankan sama persis seperti dulu.
import type { Drama } from "./types";
import { parseViews } from "./format";

export type AdminStats = {
  /** Jumlah seluruh episode dari semua drama. */
  totalEpisode: number;
  /** Jumlah seluruh views (angka teks "1.2M" diubah dulu jadi angka). */
  totalViews: number;
  /** Berapa drama yang sudah punya gambar poster. */
  withPoster: number;
  /** Pasangan [kategori, jumlah drama], diurut dari terbanyak. */
  byCategory: [string, number][];
};

/** Hitung ringkasan dashboard admin dari daftar drama. */
export function computeAdminStats(dramas: Drama[]): AdminStats {
  const totalEpisode = dramas.reduce((a, d) => a + d.episodes, 0);
  const totalViews = dramas.reduce((a, d) => a + parseViews(d.views), 0);
  const withPoster = dramas.filter((d) => d.posterImage).length;
  const counts = new Map<string, number>();
  for (const d of dramas) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
  const byCategory = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return { totalEpisode, totalViews, withPoster, byCategory };
}
