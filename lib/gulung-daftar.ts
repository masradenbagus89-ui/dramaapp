/**
 * Hitung posisi gulung sebuah kotak daftar supaya satu baris tujuan terlihat.
 *
 * Dipisah dari komponennya (app/components/EpisodeList.tsx) karena inilah
 * satu-satunya aritmatika di fitur ini, dan di dalam komponen ia tak bisa
 * dibuktikan: alat tes project ini tidak merender React, dan jsdom pun tidak
 * menghitung tata letak — `scrollHeight` di sana selalu 0, jadi semua cabang
 * di bawah akan terlihat "lolos" tanpa pernah benar-benar dijalankan.
 */

/** Hasil `null` = jangan sentuh gulungannya sama sekali. */
export function posisiGulungKeTujuan({
  atasTujuan,
  jarakKonteks,
  scrollHeight,
  clientHeight,
}: {
  /** Jarak baris tujuan dari puncak ISI daftar, dalam piksel. */
  atasTujuan: number;
  /** Ruang yang tetap diperlihatkan di atas baris tujuan. */
  jarakKonteks: number;
  /** Tinggi seluruh isi daftar. */
  scrollHeight: number;
  /** Tinggi kotak yang terlihat. */
  clientHeight: number;
}): number | null {
  // Isinya muat seluruhnya = kotak ini memang tidak bisa digulung. Terjadi di
  // tata letak HP, tempat daftarnya mengalir mengikuti halaman. Memaksakan
  // gulungan di sana tak ada efeknya pada daftar, tapi mengundang percobaan
  // berikutnya memakai scrollIntoView — dan ITU akan melompatkan halamannya.
  if (scrollHeight <= clientHeight) return null;

  // Tujuan yang sudah berada di layar pertama tak perlu digulung; menariknya
  // ke `atasTujuan - jarakKonteks` justru menggeser daftar ke posisi negatif
  // yang lalu dijepit jadi 0 — gerakan yang tak menghasilkan apa-apa.
  if (atasTujuan <= jarakKonteks) return null;

  return atasTujuan - jarakKonteks;
}
