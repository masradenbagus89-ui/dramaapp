// -------------------------------------------------------------------------
// RATING video pilihan admin — angka yang DIKETIK orang, bukan dari IMDb.
//
// KENAPA ADA (owner 2026-11-06): "kalau yang belum ada ratingnya bisa kita
// edit kan?". Rating selama ini HANYA ikut terbawa saat sebuah video
// dicocokkan ke IMDb (app/api/admin/playly/imdb/route.ts). Dua keadaan tidak
// terlayani: video yang belum dicocokkan sama sekali, dan film yang memang
// tidak punya nilai di IMDb (biasanya rilisan baru atau yang sangat jarang
// ditonton) — di keduanya kolom rating tinggal tanda pisah dan tak ada cara
// mengisinya.
//
// ⚠️ ANGKA INI DILIHAT PENONTON. Ia tampil di kartu video di beranda lewat
// lib/playly-publik.ts, jadi nilai ngawur bukan cuma mengotori panel admin —
// ia ikut tayang. Karena itu nilainya disaring di sini DAN di server, bukan
// cuma dibatasi oleh kotak isian di layar: siapa pun bisa mengirim body apa
// saja ke endpoint admin, dan UI bukan pagar.
//
// Fungsi di sini MURNI (tanpa DOM/jaringan) supaya aturannya bisa diuji di
// tests/rating-video.test.ts.
// -------------------------------------------------------------------------

/** Batas nilai yang masuk akal untuk rating gaya IMDb. */
export const RATING_MIN = 0;
export const RATING_MAKS = 10;

/**
 * Terjemahkan ketikan orang jadi nilai rating yang sah, atau `null`.
 *
 * `null` berarti "HAPUS rating manual untuk video ini" — bukan error. Itu aksi
 * yang sah dan justru keadaan bawaannya: begitu dihapus, video kembali memakai
 * rating dari IMDb kalau ada.
 *
 * KOMA DITERIMA sebagai pemisah desimal ("7,4"): yang mengetik orang
 * Indonesia, dan menolak koma berarti angka yang sah terbaca sebagai ngawur
 * lalu diam-diam terhapus.
 *
 * Dibulatkan ke SATU desimal supaya sama bentuknya dengan rating IMDb —
 * "7.44" dan "7.4" yang tampil berdampingan di kolom yang sama terbaca seperti
 * salah satunya rusak.
 */
export function parseRatingManual(nilai: unknown): string | null {
  if (nilai === null || nilai === undefined) return null;

  const teks = String(nilai).trim().replace(",", ".");
  if (!teks) return null;

  // Angka saja (boleh desimal). Ditolak di sini: "7.4/10", "tujuh", "1e3",
  // dan spasi di tengah — semuanya pernah jadi cara angka ngawur lolos.
  if (!/^\d{1,2}(\.\d+)?$/.test(teks)) return null;

  const angka = Number(teks);
  if (!Number.isFinite(angka)) return null;
  if (angka < RATING_MIN || angka > RATING_MAKS) return null;

  // toFixed(1) memulangkan "7.0" untuk 7 — sengaja: rating IMDb pun ditulis
  // begitu, jadi kolomnya rata dan tidak ada yang terbaca setengah terisi.
  return angka.toFixed(1);
}

/**
 * Rating yang BENAR-BENAR ditampilkan untuk sebuah video.
 *
 * Urutannya disengaja: koreksi manusia MENANG atas angka IMDb, pola yang sama
 * dengan kualitas video (lib/kualitas-video.ts). Kalau dibalik, angka yang
 * baru saja diketik admin akan tertutup lagi oleh IMDb tanpa ada yang
 * memberi tahu — dan admin akan mengetiknya berkali-kali mengira gagal
 * tersimpan.
 */
export function ratingTampil(
  ratingManual: string | undefined | null,
  ratingImdb: string | undefined | null,
): string | null {
  return (ratingManual || "").trim() || (ratingImdb || "").trim() || null;
}
