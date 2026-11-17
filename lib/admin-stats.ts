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

/**
 * Lengkapi hitungan kategori supaya SEMUA nama di daftar resmi ikut tampil.
 *
 * `computeAdminStats` hanya menghitung kategori yang kebetulan dipakai drama.
 * Akibatnya grafik dashboard menyembunyikan kategori yang masih nol, seolah
 * daftar resminya cuma yang sedang terisi. Fungsi ini tidak mengubah hitungan
 * itu — ia hanya menyusun tampilan: yang terisi di atas (terbanyak dulu),
 * sisanya mengikuti urutan daftar, angka nol. Nama yang ada di data tapi tidak
 * ada di daftar tetap ikut, supaya tidak ada drama yang hilang dari grafik.
 */
export function lengkapiDistribusiKategori(
  hitung: readonly (readonly [string, number])[],
  daftar: readonly string[],
): [string, number][] {
  const jumlah = new Map(hitung);
  const ekstra: string[] = [];
  const dikenal = new Set(daftar);
  for (const [kategori] of hitung) {
    if (!dikenal.has(kategori)) ekstra.push(kategori);
  }
  return [...daftar, ...ekstra]
    .map((kategori, urut) => ({
      kategori,
      jumlah: jumlah.get(kategori) ?? 0,
      urut,
    }))
    .sort((a, b) => b.jumlah - a.jumlah || a.urut - b.urut)
    .map(({ kategori, jumlah: n }) => [kategori, n]);
}

/**
 * Ubah jumlah jadi persen bulat yang jumlahnya pas 100.
 *
 * Pembulatan biasa bisa menyisakan 99 atau 101, jadi batang gabungan tidak
 * penuh atau kepanjangan. Sisa persen diberikan ke pecahan terbesar dulu.
 * Urutan masuk tidak diubah. Total 0 menghasilkan nol semua.
 */
export function persenDariJumlah(jumlah: readonly number[]): number[] {
  const total = jumlah.reduce((a, n) => a + n, 0);
  if (total <= 0) return jumlah.map(() => 0);
  const tepat = jumlah.map((n) => (n / total) * 100);
  const bulat = tepat.map((n) => Math.floor(n));
  let sisa = 100 - bulat.reduce((a, n) => a + n, 0);
  const urut = tepat
    .map((n, i) => ({ i, pecahan: n - Math.floor(n) }))
    .sort((a, b) => b.pecahan - a.pecahan || a.i - b.i);
  for (const { i } of urut) {
    if (sisa <= 0) break;
    bulat[i] += 1;
    sisa -= 1;
  }
  return bulat;
}
