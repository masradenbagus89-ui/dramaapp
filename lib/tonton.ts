// -------------------------------------------------------------------------
// ALAMAT halaman tonton satu video — perakit + pembacanya, sepasang.
//
// Kenapa berkas sendiri: kedua fungsi di bawah harus selalu COCOK. Perakit
// membuat alamat, pembaca mengembalikannya jadi video; kalau salah satu
// bergeser sendiri, tautan yang sudah tersebar di WhatsApp dan terindeks
// Google berubah jadi 404 tanpa satu pun error di sisi kita. Dipisah ke modul
// murni (tanpa jaringan/DOM) supaya kecocokan itu bisa diuji langsung —
// lihat tests/tonton-alamat.test.ts.
//
// BENTUK ALAMAT: /tonton/<judul-diringkas>-<id video>
//
// Kenapa judulnya ikut: alamat yang cuma berisi angka tidak memberi tahu apa
// pun saat ditempel di percakapan, dan Google memakai kata di alamat sebagai
// salah satu petunjuk isi halaman.
//
// Kenapa id-nya TETAP ikut, tidak diganti judul saja: dua video boleh berjudul
// sama persis (dan di katalog Playly kita memang ada judul berseri), jadi
// alamat berbasis judul bisa saling rebut. Id video adalah satu-satunya
// penanda yang dijamin unik.
// -------------------------------------------------------------------------

/**
 * Sepanjang apa bagian judul di alamat boleh tumbuh.
 *
 * 60 huruf cukup memuat judul yang bisa dikenali sambil menjaga alamat tetap
 * muat dibaca di satu baris percakapan. Judul Playly bisa sepanjang 100+ huruf
 * ("Mereka membangunkan seekor ular piton raksasa yang telah tertidur..."),
 * dan alamat sepanjang itu terpotong di tengah oleh aplikasi chat.
 */
const MAKS_SLUG = 60;

/**
 * Ubah judul jadi potongan alamat yang aman: huruf kecil, hanya a-z 0-9 dan
 * tanda hubung.
 *
 * Emoji dan huruf non-latin DIBUANG, bukan diterjemahkan. Katalog kita memuat
 * judul ber-emoji ("🔥 KONG VS EVERY TITAN") dan ber-huruf Spanyol; memaksakan
 * keduanya masuk alamat menghasilkan persen-kode panjang yang justru tak
 * terbaca. Judul yang habis tersaring memulangkan string kosong — itu keadaan
 * SAH, dan `alamatTonton` menanganinya dengan memakai id saja.
 */
export function slugJudul(judul: string): string {
  return judul
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAKS_SLUG)
    // Dipangkas LAGI sesudah dipotong: pemotongan di tengah kata bisa
    // menyisakan tanda hubung menggantung di ujung.
    .replace(/-+$/g, "");
}

/** Alamat halaman tonton untuk satu video. */
export function alamatTonton(video: { id: string; title: string }): string {
  const slug = slugJudul(video.title);
  return slug ? `/tonton/${slug}-${video.id}` : `/tonton/${video.id}`;
}

/**
 * Kebalikan `alamatTonton`: dari potongan alamat, video yang mana?
 *
 * Dicocokkan sebagai AKHIRAN, bukan dengan memotong di tanda hubung terakhir.
 * Sebabnya id video Playly sendiri boleh memuat tanda hubung
 * (`app/api/playly/video/route.ts:29` mengizinkan `-` dan `_`), jadi memotong
 * di tanda hubung terakhir akan memisahkan id-nya di tempat yang salah dan
 * videonya "hilang" walau alamatnya benar.
 *
 * Cara ini aman justru karena daftarnya TERTUTUP: yang dicocokkan hanya video
 * yang memang boleh ditonton, bukan pola bebas. Kalau ada dua id yang satu
 * merupakan akhiran yang lain ("123" dan "9123"), yang TERPANJANG menang —
 * itulah yang benar-benar dirakit `alamatTonton`.
 *
 * Memulangkan `null`, bukan melempar: pemanggil (halaman tonton) mengubahnya
 * jadi 404 yang punya jalan pulang, bukan layar error.
 */
export function cariVideoDariSegmen<T extends { id: string }>(
  videos: T[],
  segmen: string,
): T | null {
  const bersih = segmen.trim();
  if (!bersih) return null;

  let terbaik: T | null = null;
  for (const v of videos) {
    const cocok = bersih === v.id || bersih.endsWith(`-${v.id}`);
    if (!cocok) continue;
    if (!terbaik || v.id.length > terbaik.id.length) terbaik = v;
  }
  return terbaik;
}
