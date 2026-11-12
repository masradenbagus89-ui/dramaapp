// -------------------------------------------------------------------------
// BAGIAN halaman Video Playly — menentukan satu panel mana yang ditampilkan.
//
// KENAPA ADA (owner 2026-11-06): "sidebar kiri video playly terlalu panjang
// kamu jadikan divider — IMDB / Link download / Daftar video Playly".
// Keluhannya tepat: sampai hari ini `/admin/videos/playly` adalah SATU halaman
// berisi tiga panel besar bertumpuk (pengaturan tampil+IMDb, link download,
// daftar video untuk dikaitkan ke drama). Digulung ke bawah, ketiganya menyatu
// jadi satu dinding panjang tanpa penanda posisi.
//
// Owner memilih: satu menu = satu panel.
//
// KENAPA DISIMPAN DI HASH (`/admin/videos/playly#unduhan`), bukan state biasa
// atau tiga halaman terpisah:
//   - halaman ini memanggil Playly belasan kali saat dibuka (termasuk cek
//     "video belum siap" yang menembak satu permintaan per video). Memecahnya
//     jadi tiga alamat berarti seluruh pemanggilan itu DIULANG tiap pindah
//     menu — berpindah panel jadi lambat tanpa menambah apa pun;
//   - pola yang sama sudah dipakai panel admin utama (lib/bagian-admin.ts),
//     jadi ini bukan mekanisme baru yang harus dirawat sendiri;
//   - tombol Kembali browser ikut berfungsi dan alamatnya bisa di-bookmark.
//
// Semua fungsi di sini MURNI (tanpa DOM/jaringan) supaya aturannya bisa diuji
// di tests/bagian-playly.test.ts — kalau salah, akibatnya menu yang diklik
// tidak menampilkan apa-apa, dan itu TIDAK memunculkan error apa pun.
// -------------------------------------------------------------------------

/** Panel yang bisa ditampilkan di halaman Video Playly. */
export type BagianPlayly =
  | "imdb"
  | "isi-cepat"
  | "unduhan"
  | "daftar";

/**
 * Daftar bagian yang SAH. Ditulis sekali di sini dan dipakai ulang oleh
 * penyaring di bawah — menduplikasinya di sidebar berarti dua daftar yang bisa
 * menyimpang, dan yang menyimpang menghasilkan menu yang diklik lalu diam.
 */
export const BAGIAN_PLAYLY_SAH: readonly BagianPlayly[] = [
  "imdb",
  "isi-cepat",
  "unduhan",
  "daftar",
] as const;

/**
 * Bagian yang dibuka saat alamatnya belum menyebut apa pun.
 *
 * Dipilih "imdb" karena panel itulah yang menentukan video TAMPIL atau tidak
 * ke penonton — pertanyaan pertama yang dibawa admin saat membuka halaman ini.
 */
export const BAGIAN_PLAYLY_BAWAAN: BagianPlayly = "imdb";

/** Alamat halaman Video Playly. Satu tempat, supaya sidebar dan halaman
 *  mustahil memakai ejaan yang berbeda. */
export const RUTE_PLAYLY = "/admin/videos/playly";

/**
 * Terjemahkan potongan alamat (`#unduhan`, `unduhan`, alamat penuh) jadi
 * bagian yang sah.
 *
 * ALLOWLIST, bukan pembersihan teks: nilai asing jatuh ke bagian bawaan,
 * sehingga alamat yang salah ketik tetap membuka panel yang berisi — bukan
 * layar kosong yang terbaca seperti halaman rusak.
 */
export function parseBagianPlayly(
  hash: string | null | undefined,
): BagianPlayly {
  const teks = (hash ?? "")
    .trim()
    .toLowerCase()
    .replace(/^.*#/, "") // buang alamat penuh maupun "#"
    .trim();
  return BAGIAN_PLAYLY_SAH.find((b) => b === teks) ?? BAGIAN_PLAYLY_BAWAAN;
}

/**
 * Judul tiap bagian — dipakai sebagai kepala halaman supaya admin selalu tahu
 * sedang berada di panel mana. Ejaannya sengaja SAMA dengan label pintu
 * masuknya; judul yang berbeda dari menu yang baru diklik terbaca seperti
 * salah halaman.
 *
 * "isi-cepat" DINAMAI "Isi manual" (owner 2026-11-11). Nama lamanya menjanjikan
 * yang tidak ditepati — mengisi puluhan film tetap butuh mengetik. Yang
 * sebenarnya membedakan panel ini dari IMDb adalah JALURNYA manual, dan nama
 * itu menjelaskan dirinya sendiri saat berdiri di sebelah saringan
 * "Belum ada IMDb". Nama bagian (hash `#isi-cepat`) SENGAJA tidak ikut diubah:
 * ia sudah tertanam di alamat yang bisa di-bookmark dan di kunci localStorage
 * `dramaku:isi-cepat:draft` yang menyimpan isian belum tersimpan — mengubahnya
 * membuang draft admin tanpa satu pun peringatan.
 */
export const JUDUL_BAGIAN_PLAYLY: Record<BagianPlayly, string> = {
  imdb: "IMDb",
  "isi-cepat": "Isi manual",
  unduhan: "Link download",
  daftar: "Daftar video Playly",
};

/**
 * Keterangan sebaris di bawah judul. Sengaja menyebut AKIBAT yang admin
 * rasakan, bukan nama teknis komponennya.
 */
export const KETERANGAN_BAGIAN_PLAYLY: Record<BagianPlayly, string> = {
  imdb: "Atur video mana yang tampil ke penonton, lalu lengkapi poster & sinopsisnya dari IMDb.",
  "isi-cepat":
    "Lengkapi kualitas, rating, tahun & durasi BANYAK film sekaligus — untuk film yang tidak ada di IMDb.",
  unduhan: "Isi link download tiap video — 5 provider × 2 kualitas.",
  daftar: "Kaitkan video Playly ke drama di katalog DramaKu (opsional).",
};

/** Alamat menu untuk sebuah bagian. Satu tempat, supaya sidebar dan isi
 *  halaman mustahil memakai ejaan yang berbeda. */
export function alamatBagianPlayly(bagian: BagianPlayly): string {
  return `${RUTE_PLAYLY}#${bagian}`;
}

/**
 * Bagian yang pintunya TIDAK di sidebar melainkan DI DALAM panel lain,
 * dipetakan ke bagian induknya.
 *
 * KENAPA ADA (owner 2026-11-11): sejak "Isi manual" pindah ke baris saringan
 * panel IMDb, ia tak punya baris menu sendiri lagi. Tanpa peta ini, membukanya
 * membuat SELURUH menu sidebar padam sekaligus — tidak ada yang menyala, dan
 * admin kehilangan penanda "saya sedang di mana". Itu kerusakan SENYAP: tak
 * ada error, cuma sidebar yang terbaca seperti salah halaman.
 *
 * Menyalakan IMDb juga jujur, bukan akal-akalan: pintu "Isi manual" memang
 * berada di dalam panel IMDb, jadi admin memang sedang berada di area itu.
 */
const INDUK_BAGIAN_PLAYLY: Partial<Record<BagianPlayly, BagianPlayly>> = {
  "isi-cepat": "imdb",
};

/**
 * Bagian mana yang mewakili `bagian` di sidebar — dirinya sendiri, atau
 * induknya kalau ia tak punya baris menu sendiri.
 *
 * Menerima `string` (bukan `BagianPlayly`) karena pemanggilnya di sidebar
 * bekerja dengan peta lintas-halaman yang bertipe longgar; nilai asing
 * dipulangkan apa adanya sehingga tak ada yang menyala — sama persis dengan
 * perilaku sebelum peta ini ada.
 */
export function menuBagianPlayly(bagian: string): string {
  return INDUK_BAGIAN_PLAYLY[bagian as BagianPlayly] ?? bagian;
}
