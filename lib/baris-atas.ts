// Baris poster paling atas halaman depan.
//
// Owner 2026-11-17: baris hitam CUMA film, yang paling baru, dan ikut
// berubah sendiri begitu ada film lebih baru ("selalu update"). Drama
// dan series tinggal di seksi di bawah. Daftar film SUDAH terurut tahun
// di lib/playly-gabungan.ts — berkas ini tidak mengurut ulang.

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
  const sudahDiAtas = new Set(
    barisAtas.filter((b) => b.jenis === "film").map((b) => b.item.id),
  );
  return film.filter((v) => !sudahDiAtas.has(v.id)).slice(0, batas);
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
  F extends { id: string; thumbnail?: string | null },
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
  seriesSisa: S[];
  dramaSisa: D[];
} {
  const jumlahBaris = Number.isFinite(sumber.jumlahBaris)
    ? Math.max(0, Math.floor(sumber.jumlahBaris))
    : 0;
  const filmBergambar = sumber.film.filter((v) => adaTeks(v.thumbnail));
  const barisAtas = filmBergambar
    .slice(0, jumlahBaris)
    .map((item) => ({ jenis: "film" as const, item }));
  return {
    barisAtas,
    filmDiDepan: filmDiLuarBarisAtas(filmBergambar, barisAtas, sumber.jumlahFilm),
    seriesSisa: sumber.series.filter((v) => adaTeks(v.thumbnail)),
    dramaSisa: sumber.drama,
  };
}
