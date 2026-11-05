// -------------------------------------------------------------------------
// SARINGAN daftar video di panel admin — "mana yang sudah ada IMDb, mana yang
// belum" (owner 2026-11-05: "biar mudah").
//
// KENAPA ADA: daftar video di panel admin berisi 489 judul, dan 370 di
// antaranya sudah dicocokkan ke IMDb. Mencari 119 sisanya berarti menggulung
// seluruh daftar sambil memeriksa satu per satu apakah lencana judulnya sudah
// terisi — pekerjaan yang membuat orang berhenti di tengah lalu melewatkan
// beberapa.
//
// Fungsi MURNI (tanpa DOM/jaringan) supaya aturannya bisa diuji di
// tests/saring-video-admin.test.ts. Kalau saringannya salah, akibatnya video
// yang sebenarnya belum dicocokkan tidak pernah muncul di daftar "Belum" —
// admin menyangka pekerjaannya sudah habis padahal belum, dan tak ada error
// apa pun yang memberi tahu.
// -------------------------------------------------------------------------

/** Pilihan saringan yang tersedia di atas daftar video. */
export type SaringImdb = "semua" | "sudah" | "belum";

/** Pilihan yang berlaku saat panel baru dibuka. */
export const SARING_BAWAAN: SaringImdb = "semua";

/** Label tombol saringan. Satu tempat supaya tombol dan keterangannya di layar
 *  mustahil menyebut nama yang berbeda. */
export const LABEL_SARING: Record<SaringImdb, string> = {
  semua: "Semua",
  sudah: "Sudah ada IMDb",
  belum: "Belum ada IMDb",
};

/**
 * Apakah sebuah video SUDAH punya data IMDb.
 *
 * Dicek dari keberadaan entri di peta, bukan dari isi field tertentu: peta ini
 * hanya terisi lewat pencocokan admin, jadi "ada entrinya" sudah berarti
 * "pernah dicocokkan". Memeriksa satu field tertentu (mis. poster) akan
 * menyalahkan film yang memang tidak punya field itu di OMDb — ia akan terus
 * muncul di daftar "Belum" walau sudah dikerjakan.
 */
export function sudahAdaImdb(
  videoId: string,
  imdb: Record<string, unknown> = {},
): boolean {
  return Boolean(imdb[videoId]);
}

/**
 * Saring daftar video menurut pilihan.
 *
 * SELALU memulangkan array baru — menyaring di tempat akan mengubah daftar
 * milik pemanggil, dan daftar itu juga dipakai untuk menghitung angka di
 * tombol saringan (angkanya ikut salah tanpa gejala).
 */
export function saringVideoImdb<T extends { id: string }>(
  videos: T[],
  imdb: Record<string, unknown> = {},
  saring: SaringImdb = SARING_BAWAAN,
): T[] {
  if (saring === "semua") return [...videos];
  const mau = saring === "sudah";
  return videos.filter((v) => sudahAdaImdb(v.id, imdb) === mau);
}

/**
 * Jumlah video per pilihan — dipakai sebagai angka di tiap tombol saringan.
 *
 * Dihitung dari daftar yang sama dengan yang disaring, bukan dari ukuran peta
 * IMDb: peta bisa memuat entri milik video yang sudah tidak ada lagi di Playly,
 * dan angka yang lebih besar dari isi daftar terbaca seperti ada video
 * tersembunyi yang tak bisa ditemukan.
 */
export function hitungImdb<T extends { id: string }>(
  videos: T[],
  imdb: Record<string, unknown> = {},
): Record<SaringImdb, number> {
  const sudah = videos.filter((v) => sudahAdaImdb(v.id, imdb)).length;
  return { semua: videos.length, sudah, belum: videos.length - sudah };
}
