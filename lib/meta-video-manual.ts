// -------------------------------------------------------------------------
// TAHUN & DURASI ketikan admin untuk video Playly.
//
// KENAPA ADA (owner 2026-11-09: "kalau yang tidak ada gimana cara isi
// manualnya"): tahun dan durasi selama ini HANYA bisa datang dari IMDb atau
// dari Playly. Kalau film tidak ada di IMDb — film lokal, rilisan sangat baru,
// atau judul yang tidak ketemu — kedua pojok poster itu kosong permanen dan
// tak ada satu pun cara mengisinya. Empat kolom lain (kategori, kualitas,
// jenis, rating) sudah punya isian manual; dua ini tertinggal.
//
// ⚠️ ANGKA INI DILIHAT PENONTON — ia tergambar di pojok poster lewat
// KartuVideo & PlaylyVideoGrid. Jadi nilainya disaring DI SINI dan DI SERVER,
// bukan cuma dibatasi kotak isian di layar: siapa pun bisa mengirim body apa
// saja ke endpoint admin, dan UI bukan pagar.
//
// Fungsi MURNI (tanpa DOM/jaringan) supaya aturannya bisa diuji di
// tests/meta-video-manual.test.ts.
// -------------------------------------------------------------------------
import { detikDariDurasiEpisode, menitDariRuntime } from "./format";

/**
 * Batas tahun yang masuk akal.
 *
 * Bawah 1888: film tertua yang tercatat (Roundhay Garden Scene). Atas
 * sengaja longgar — katalog memuat film yang baru akan rilis, dan menolak
 * tahun depan berarti admin tidak bisa menyiapkan judulnya lebih awal.
 */
export const TAHUN_MIN = 1888;
export const TAHUN_MAKS = 2100;

/**
 * Terjemahkan ketikan admin jadi tahun yang sah, atau `null`.
 *
 * `null` berarti "HAPUS tahun manual untuk video ini" — bukan error. Itu aksi
 * yang sah dan justru keadaan bawaannya: begitu dihapus, video kembali memakai
 * tahun dari IMDb kalau ada.
 */
export function parseTahunManual(nilai: unknown): string | null {
  if (nilai === null || nilai === undefined) return null;

  const teks = String(nilai).trim();
  if (!teks) return null;

  // Hanya 4 angka, tidak lebih: "2024abc" ditolak, bukan dipotong jadi "2024".
  // Memotong berarti menebak maksud orang, dan tahun yang salah tergambar di
  // poster tanpa satu pun error.
  if (!/^\d{4}$/.test(teks)) return null;

  const n = Number(teks);
  return n >= TAHUN_MIN && n <= TAHUN_MAKS ? teks : null;
}

/**
 * Terjemahkan ketikan durasi admin jadi DETIK, atau `null`.
 *
 * Menerima DUA bentuk, dan keduanya disengaja:
 *   "2.25" / "2:25"  -> menit.detik  (aturan yang SAMA dengan kolom Durasi
 *                       drama, lib/format.ts — owner memilihnya supaya tidak
 *                       ada dua cara yang harus diingat)
 *   "95 min" / "95 menit" / "2 jam 15 menit" -> bentuk bersatuan dari OMDb
 *
 * Bentuk bersatuan ikut diterima karena admin sering menyalin angka dari
 * halaman IMDb yang menulisnya begitu; menolaknya berarti ia harus menghitung
 * ulang di kepala.
 */
export function parseDurasiManual(nilai: unknown): number | null {
  if (nilai === null || nilai === undefined) return null;

  const teks = String(nilai).trim();
  if (!teks) return null;

  // Menit:detik dulu — "2.25" juga cocok dengan pola angka-polos di
  // `menitDariRuntime`, dan di sana ia akan terbaca 2 MENIT, bukan 2:25.
  const detik = detikDariDurasiEpisode(teks);
  if (detik !== null) return detik;

  const menit = menitDariRuntime(teks);
  return menit === null ? null : menit * 60;
}
