import { revalidatePath } from "next/cache";

/**
 * Buang cache SELURUH halaman publik, supaya perubahan admin langsung tampil.
 *
 * KENAPA ADA (2026-11-14): halaman publik disimpan & dipakai ulang
 * (`revalidate = 60` di beranda/katalog/detail, 300 di /film). Tanpa ini,
 * judul yang baru diubah admin — atau video yang DITARIK Playly lewat webhook —
 * tetap tampil versi lama sampai batas waktu itu habis.
 *
 * KENAPA SELURUH SITUS, bukan per halaman: satu drama tampil di banyak tempat
 * (beranda, katalog, discover, shorts, detail, sitemap). Daftar halaman yang
 * "harus ikut dibuang" pasti tertinggal satu cepat atau lambat. `"/", "layout"`
 * mencakup semua halaman di bawah layout akar beserta data fetch-nya.
 * Ongkosnya kecil: halaman hanya dibangun ulang saat ada pengunjung berikutnya.
 *
 * ⚠️ HANYA untuk perubahan KATALOG oleh admin/webhook. Jangan dipanggil dari
 * jalur penonton (like, komentar, koin): itu akan membuang cache tiap ada klik
 * dan membuat cache tak berguna sama sekali.
 *
 * GAGAL-TERBUKA: data sudah tersimpan saat fungsi ini dipanggil. Kalau
 * pembuangan gagal, penyimpanan JANGAN ikut dianggap gagal — paling lambat
 * batas `revalidate` di atas yang menyegarkannya. Di luar server Next.js
 * (mis. tes yang memanggil handler langsung) `revalidatePath` memang melempar.
 *
 * @returns true kalau cache berhasil ditandai basi.
 */
export function segarkanCachePublik(): boolean {
  try {
    revalidatePath("/", "layout");
    return true;
  } catch (err) {
    console.warn(
      "[cache] gagal membuang cache halaman publik:",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}
