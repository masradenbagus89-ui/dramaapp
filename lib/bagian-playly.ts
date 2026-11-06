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
export type BagianPlayly = "imdb" | "unduhan" | "daftar";

/**
 * Daftar bagian yang SAH. Ditulis sekali di sini dan dipakai ulang oleh
 * penyaring di bawah — menduplikasinya di sidebar berarti dua daftar yang bisa
 * menyimpang, dan yang menyimpang menghasilkan menu yang diklik lalu diam.
 */
export const BAGIAN_PLAYLY_SAH: readonly BagianPlayly[] = [
  "imdb",
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
 * sedang berada di panel mana. Ejaannya sengaja SAMA dengan label menu di
 * sidebar; judul yang berbeda dari menu yang baru diklik terbaca seperti salah
 * halaman.
 */
export const JUDUL_BAGIAN_PLAYLY: Record<BagianPlayly, string> = {
  imdb: "IMDb",
  unduhan: "Link download",
  daftar: "Daftar video Playly",
};

/**
 * Keterangan sebaris di bawah judul. Sengaja menyebut AKIBAT yang admin
 * rasakan, bukan nama teknis komponennya.
 */
export const KETERANGAN_BAGIAN_PLAYLY: Record<BagianPlayly, string> = {
  imdb: "Atur video mana yang tampil ke penonton, lalu lengkapi poster & sinopsisnya dari IMDb.",
  unduhan: "Isi link download tiap video — 5 provider × 2 kualitas.",
  daftar: "Kaitkan video Playly ke drama di katalog DramaKu (opsional).",
};

/** Alamat menu untuk sebuah bagian. Satu tempat, supaya sidebar dan isi
 *  halaman mustahil memakai ejaan yang berbeda. */
export function alamatBagianPlayly(bagian: BagianPlayly): string {
  return `${RUTE_PLAYLY}#${bagian}`;
}
