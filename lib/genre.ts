// -------------------------------------------------------------------------
// NAMA GENRE: nilai data (Inggris) -> label yang dibaca penonton (Indonesia).
//
// Kembaran persis lib/negara.ts, dan untuk alasan yang sama. Katalog menyimpan
// genre dalam bahasa Inggris dari DUA sumber: kategori kurasi DramaKu
// (`drama.category`, daftarnya `CATEGORIES` di lib/types.ts) dan genre sinema
// OMDb (`drama.genre`, teks bebas dipisah koma). Keduanya ikut jadi nilai
// penyaring di alamat URL — `?cat=Action` dan `?genre=Horror`.
//
// Yang boleh diterjemahkan HANYA labelnya. Nilai yang masuk ke alamat, ke
// pencocokan "drama terkait", dan ke pencarian warna di lib/genre-accent.ts
// WAJIB tetap asli. Kalau keduanya tertukar, chip "Aksi" tergambar rapi lalu
// memulangkan halaman hampa — rusak SENYAP, tanpa satu pun pesan error.
//
// Daftarnya sengaja melebihi isi katalog hari ini: tujuh kategori kurasi
// (semuanya) + genre OMDb yang wajar menyusul. Nama di luar daftar dipakai APA
// ADANYA (bukan dibuang), jadi katalog yang tumbuh tidak pernah kehilangan chip
// hanya karena namanya belum sempat didaftarkan di sini.
//
// Sebagian nama SENGAJA tidak diterjemahkan ("Thriller", "Anime"):
// kata Inggrisnya sudah jadi istilah sehari-hari penonton Indonesia, dan
// memaksakan padanan justru membuat genre-nya tak dikenali.
// -------------------------------------------------------------------------

const NAMA_INDONESIA: Record<string, string> = {
  // --- Kategori kurasi DramaKu (CATEGORIES di lib/types.ts) ---
  Semua: "Semua",
  Romance: "Romantis",
  // Owner 2026-10-30 menolak "Taipan" dan memilih sendiri kata ini. "CEO"
  // memang singkatan Inggris, tapi sudah jadi istilah sehari-hari penonton
  // drama di sini — keputusan owner, jangan "diperbaiki" jadi kata Indonesia.
  Tycoon: "CEO",
  // Owner 2026-10-30: "harem jadikan kerajaan". Pagi ini "Harem" sempat
  // sengaja dibiarkan Inggris; owner mengoreksinya langsung. Nilai di database
  // TETAP "Harem" — yang berubah cuma yang dibaca penonton.
  Harem: "Kerajaan",
  "Time Travel": "Lintas Waktu",
  Action: "Aksi",
  Comedy: "Komedi",
  Fantasy: "Fantasi",

  // --- Genre sinema OMDb yang sudah ada di katalog ---
  Adventure: "Petualangan",
  Horror: "Horor",

  // --- Genre OMDb lain yang wajar menyusul ---
  Drama: "Drama",
  Thriller: "Thriller",
  Crime: "Kriminal",
  Mystery: "Misteri",
  "Sci-Fi": "Fiksi Ilmiah",
  Animation: "Animasi",
  Anime: "Anime",
  Family: "Keluarga",
  History: "Sejarah",
  Biography: "Biografi",
  Documentary: "Dokumenter",
  Musical: "Musikal",
  Music: "Musik",
  Sport: "Olahraga",
  War: "Perang",
  Western: "Koboi",
  Short: "Film Pendek",
  News: "Berita",
  Adult: "Dewasa",
  "Film-Noir": "Film Noir",
  "Game-Show": "Kuis",
  "Talk-Show": "Talk Show",
  "Reality-TV": "Reality TV",
};

/**
 * Label genre untuk ditampilkan. Nama yang belum terdaftar dipulangkan apa
 * adanya — lebih baik penonton membaca "Steampunk" daripada chip-nya hilang.
 */
export function labelGenre(nama: string): string {
  return NAMA_INDONESIA[nama] ?? nama;
}

/**
 * Versi untuk kolom `drama.genre` milik OMDb, yang isinya beberapa genre
 * dipisah koma ("Action, Adventure, Horror"). Dipisah, diterjemahkan satu per
 * satu, lalu dirangkai lagi.
 *
 * KENAPA fungsi sendiri, bukan dipanggil `labelGenre` langsung: teks gabungan
 * tidak akan pernah cocok dengan kunci mana pun di daftar atas, jadi tanpa ini
 * seluruh barisnya lolos tanpa diterjemahkan — gagal DIAM-DIAM, tepat jenis
 * kegagalan yang tak pernah dilaporkan siapa pun.
 *
 * Nilai kosong/null dipulangkan jadi string kosong supaya pemanggil tetap bisa
 * memakai pola `[genre, negara].filter(Boolean)` yang sudah dipakai di
 * beberapa tempat.
 */
export function labelGenreGabungan(teks: string | null | undefined): string {
  if (!teks) return "";
  return teks
    .split(",")
    .map((g) => labelGenre(g.trim()))
    .filter(Boolean)
    .join(", ");
}
