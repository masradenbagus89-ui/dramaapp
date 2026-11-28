// Baris poster paling atas halaman depan.
//
// Owner 2026-11-17: baris hitam CUMA film, yang paling baru, dan ikut
// berubah sendiri begitu ada film lebih baru ("selalu update"). Drama
// dan series tinggal di seksi di bawah. Daftar film SUDAH terurut tahun
// di lib/playly-gabungan.ts — berkas ini tidak mengurut ulang.

import { parseRating } from "./format";

/**
 * Ambang rating IMDb untuk masuk BARIS POSTER PALING ATAS.
 *
 * Owner 2026-11-28, sesudah melihat barisnya di produksi: *"film yang muncul
 * paling atas film-film terbaru/box office"*. Dua kata itu menunjuk hal
 * berbeda, dan owner sudah diberi tahu bedanya sebelum memilih: kita TIDAK
 * punya data pendapatan box office, yang ada cuma rating IMDb. Yang dipilih
 * owner: tetap film terbaru, tapi yang ratingnya rendah disingkirkan.
 *
 * Kenapa 6.0 dan bukan angka lain — DIUKUR di beranda produksi 2026-11-28,
 * bukan ditebak: dari 60 kartu film yang ratingnya terbaca, mediannya 6.4 dan
 * **41** lolos ambang 6.0, sementara baris atas cuma butuh 14. Jadi ambang ini
 * menyaring tanpa membuat barisnya bolong. (Ambang 7.0 menyisakan 25 — masih
 * cukup, tapi mulai membuang film baru yang wajar.) Sebelum ambang ini
 * dipasang, baris atas memuat rating 3.7 · 4.5 · 4.7 · 4.8 · 4.9 — itulah yang
 * dikeluhkan owner.
 *
 * ⚠️ Film TANPA rating ikut tersaring keluar (`parseRating` memulangkan 0).
 * Itu disengaja: tanpa rating kita tidak punya dasar apa pun untuk menyebutnya
 * layak tampil paling atas. Mereka tidak hilang dari situs — tetap muncul di
 * seksi "Film Terbaru" di bawahnya.
 */
export const AMBANG_RATING_BARIS_ATAS = 6.0;

export type ButirBarisAtas<F, S, D> =
  | { jenis: "film"; item: F }
  | { jenis: "series"; item: S }
  | { jenis: "drama"; item: D };

/**
 * Film untuk seksi "Film Terbaru" di bawah baris hitam.
 *
 * Melewati film yang SUDAH duduk di baris atas. Tanpa saringan ini seksi
 * putih menampilkan judul yang sama dengan deretan hitam (keluhan owner
 * 2026-11-17). Urutan daftar film tidak diubah — pemanggil yang sudah
 * mengurut tahun tidak boleh diurut ulang di sini.
 */
export function filmDiLuarBarisAtas<F extends { id: string }>(
  film: F[],
  barisAtas: ButirBarisAtas<F, { id: string }, { id: string }>[],
  jumlah: number,
): F[] {
  const batas = Number.isFinite(jumlah) ? Math.max(0, Math.floor(jumlah)) : 0;
  if (batas === 0) return [];
  return filmLuarBarisAtasLengkap(film, barisAtas).slice(0, batas);
}

/**
 * Sama dengan di atas, TANPA dipotong — kolam bersama untuk seluruh seksi film
 * beranda (lib/film-seksi.ts).
 *
 * Perlu versi tak-terpotong sejak owner 2026-11-24 meminta seksi tab-bawaan dan
 * "Rekomendasi" diisi film juga: tiga seksi butuh potongan yang BERBEDA dari
 * satu daftar, jadi yang membagi potongannya harus melihat daftar utuhnya.
 * Memakai `filmDiLuarBarisAtas` dengan jumlah besar bukan pengganti — ia
 * mengembalikan [] untuk `Infinity` (`Number.isFinite`), kesalahan yang tak
 * memunculkan error, cuma seksi yang hilang.
 *
 * Saringan "sudah di baris atas" tetap SATU-SATUNYA di sini supaya seksi baru
 * tak bisa lupa memakainya.
 */
export function filmLuarBarisAtasLengkap<F extends { id: string }>(
  film: F[],
  barisAtas: ButirBarisAtas<F, { id: string }, { id: string }>[],
): F[] {
  const sudahDiAtas = new Set(
    barisAtas.filter((b) => b.jenis === "film").map((b) => b.item.id),
  );
  return film.filter((v) => !sudahDiAtas.has(v.id));
}

const adaTeks = (nilai: string | null | undefined) => Boolean(nilai?.trim());

/**
 * Susunan halaman depan: baris hitam film saja, lalu sisa untuk seksi bawah.
 *
 * Baris hitam hanya film yang punya sampul, diambil dari depan daftar
 * (tahun terbaru sudah di depan). Film tanpa sampul jadi kotak hitam dan
 * tidak dimasukkan. Judul yang sudah di atas tidak diulang di Film Terbaru.
 * Drama tidak dipotong: semuanya tetap untuk seksi Series.
 */
export function siapkanTampilanDepan<
  F extends { id: string; thumbnail?: string | null; rating?: string | null },
  S extends { id: string; thumbnail?: string | null },
  D extends { id: string },
>(sumber: {
  film: F[];
  series: S[];
  drama: D[];
  jumlahBaris: number;
  jumlahFilm: number;
}): {
  barisAtas: { jenis: "film"; item: F }[];
  filmDiDepan: F[];
  /**
   * Kolam film untuk SEMUA seksi film beranda: bersampul, bukan judul baris
   * atas, urutan tahun terbaru di depan, TIDAK dipotong. Pembagi potongannya
   * di lib/film-seksi.ts.
   */
  filmSeksi: F[];
  seriesSisa: S[];
  dramaSisa: D[];
} {
  const jumlahBaris = Number.isFinite(sumber.jumlahBaris)
    ? Math.max(0, Math.floor(sumber.jumlahBaris))
    : 0;
  const filmBergambar = sumber.film.filter((v) => adaTeks(v.thumbnail));

  // Hanya film ber-rating layak yang boleh berdiri paling atas (owner
  // 2026-11-28) — lihat AMBANG_RATING_BARIS_ATAS. Urutan TIDAK diubah: daftar
  // sudah terurut tahun terbaru dari lib/playly-gabungan.ts, jadi yang terjadi
  // cuma membuang yang tak layak, bukan mengurut ulang jadi "rating tertinggi".
  const filmLayakAtas = filmBergambar.filter(
    (v) => parseRating(v.rating ?? undefined) >= AMBANG_RATING_BARIS_ATAS,
  );

  // JARING PENGAMAN: kalau ambangnya menyapu habis (penyedia sedang sepi, atau
  // kolom rating belum terisi sama sekali), baris atas jatuh ke perilaku lama
  // alih-alih menghilang. Baris paling atas yang kosong membuat halaman depan
  // terbaca RUSAK, dan itu jauh lebih buruk daripada satu-dua judul ber-rating
  // rendah. Sengaja dipicu hanya saat hasilnya NOL, bukan saat kurang dari 14:
  // barisnya memang boleh lebih pendek, owner sudah diberi tahu.
  const sumberBarisAtas =
    filmLayakAtas.length > 0 ? filmLayakAtas : filmBergambar;

  const barisAtas = sumberBarisAtas
    .slice(0, jumlahBaris)
    .map((item) => ({ jenis: "film" as const, item }));
  return {
    barisAtas,
    filmDiDepan: filmDiLuarBarisAtas(filmBergambar, barisAtas, sumber.jumlahFilm),
    filmSeksi: filmLuarBarisAtasLengkap(filmBergambar, barisAtas),
    seriesSisa: sumber.series.filter((v) => adaTeks(v.thumbnail)),
    dramaSisa: sumber.drama,
  };
}
