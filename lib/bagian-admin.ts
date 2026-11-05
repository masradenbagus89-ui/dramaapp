// -------------------------------------------------------------------------
// BAGIAN panel admin — menentukan satu bagian mana yang sedang ditampilkan.
//
// KENAPA ADA (owner 2026-11-05): "ketika klik dashboard, tambah drama, daftar
// drama, admin, 2FA semua kalau di scroll scroll sudah jadi satu hanya awalnya
// saja yang beda". Keluhannya tepat — sampai hari ini `/admin` adalah SATU
// halaman berisi enam bagian bertumpuk (dashboard, form tambah ~30 isian,
// daftar drama, kelola admin, password, 2FA), dan menu sidebar cuma MELONCAT
// ke posisi, bukan berpindah halaman. Begitu digulung, semuanya menyatu.
//
// Owner memilih: satu menu = satu tampilan. Bagian lain disembunyikan.
//
// KENAPA DISIMPAN DI HASH (`/admin#tambah`), bukan state biasa:
//   - menu sidebar SUDAH memakai alamat itu sejak lama, jadi tautan lama tetap
//     bekerja — tidak ada yang putus;
//   - tombol Kembali browser ikut berfungsi, dan halamannya bisa di-bookmark;
//   - halaman `/admin` adalah client component; membaca `searchParams` di sana
//     akan menyeret syarat <Suspense> tanpa menambah apa pun yang berguna.
//
// Semua fungsi di sini MURNI (tanpa DOM/jaringan) supaya aturannya bisa diuji
// di tests/bagian-admin.test.ts — kalau salah, akibatnya bagian yang diklik
// tidak pernah muncul, dan itu tidak memunculkan error apa pun.
// -------------------------------------------------------------------------

/** Bagian yang bisa ditampilkan di panel admin. */
export type BagianAdmin =
  | "dashboard"
  | "tambah"
  | "daftar"
  | "kelola-admin"
  | "keamanan"
  | "iklan";

/**
 * Daftar bagian yang SAH. Ditulis sekali di sini dan dipakai ulang oleh
 * penyaring di bawah — menduplikasinya di sidebar berarti dua daftar yang bisa
 * menyimpang, dan yang menyimpang itu menghasilkan menu yang diklik lalu tidak
 * menampilkan apa-apa.
 */
export const BAGIAN_SAH: readonly BagianAdmin[] = [
  "dashboard",
  "tambah",
  "daftar",
  "kelola-admin",
  "keamanan",
  "iklan",
] as const;

/** Bagian yang dibuka saat alamatnya belum menyebut apa pun. */
export const BAGIAN_BAWAAN: BagianAdmin = "dashboard";

/**
 * Terjemahkan potongan alamat (`#tambah`, `tambah`, `/admin#tambah`) jadi
 * bagian yang sah.
 *
 * ALLOWLIST, bukan pembersihan teks: nilai asing jatuh ke BAGIAN_BAWAAN,
 * sehingga alamat yang salah ketik tetap membuka panel yang berisi — bukan
 * layar kosong yang terbaca seperti panel rusak.
 */
export function parseBagianAdmin(
  hash: string | null | undefined,
): BagianAdmin {
  const teks = (hash ?? "")
    .trim()
    .toLowerCase()
    .replace(/^.*#/, "") // buang "/admin#" maupun "#"
    .trim();
  return BAGIAN_SAH.find((b) => b === teks) ?? BAGIAN_BAWAAN;
}

/**
 * Judul tiap bagian — dipakai sebagai kepala halaman supaya admin selalu tahu
 * sedang berada di mana. Sebelum ini, enam bagian bertumpuk tanpa penanda
 * posisi sama sekali.
 */
export const JUDUL_BAGIAN: Record<BagianAdmin, string> = {
  dashboard: "Dashboard",
  tambah: "Tambah Drama",
  daftar: "Daftar Drama",
  "kelola-admin": "Kelola Admin",
  keamanan: "Keamanan",
  iklan: "Iklan Sponsor",
};

/**
 * Keterangan sebaris di bawah judul. Sengaja menyebut AKIBAT yang admin
 * rasakan, bukan nama teknis komponennya.
 */
export const KETERANGAN_BAGIAN: Record<BagianAdmin, string> = {
  dashboard: "Ringkasan katalog, status Playly, dan sebaran kategori.",
  tambah: "Isi data drama baru, atau ubah drama yang dipilih dari Daftar Drama.",
  daftar: "Semua drama di katalog — bisa diubah atau dihapus dari sini.",
  "kelola-admin": "Siapa saja yang boleh membuka panel ini.",
  keamanan: "Password admin dan verifikasi dua langkah (2FA).",
  iklan: "Iklan sponsor yang tampil di halaman penonton.",
};

/** Alamat menu untuk sebuah bagian. Satu tempat, supaya sidebar dan isi
 *  halaman mustahil memakai ejaan yang berbeda. */
export function alamatBagian(bagian: BagianAdmin): string {
  return `/admin#${bagian}`;
}
