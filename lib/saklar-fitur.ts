// SAKLAR FITUR — satu-satunya tempat menyalakan/mematikan koin & iklan.
//
// Dibuat 2026-10-28 atas permintaan owner: "koin kita pending saja, semua fitur
// yang berhubungan dengan koin & iklan dihapus, simpan filenya biar sewaktu-waktu
// bisa diaktifkan kembali." Dipilih saklar (feature flag), BUKAN memindahkan
// berkas: menyalakan kembali = mengubah satu `false` jadi `true` di sini, bukan
// merakit ulang puluhan berkas yang saling memanggil.
//
// ⭐ CARA MENYALAKAN KEMBALI
//   1. Ubah `false` → `true` di bawah (boleh salah satu saja — keduanya berdiri
//      sendiri: koin tanpa iklan, atau iklan tanpa koin).
//   2. Perbarui tripwire di `tests/jeda-koin-iklan.test.ts` (tes pertama) supaya
//      cocok dengan keadaan baru. Tes itu SENGAJA merah saat saklar dinyalakan —
//      begitulah ia memaksa penyalaan jadi tindakan sadar, bukan tersenggol.
//      Tes-tes paywall & iklan lainnya TIDAK perlu diubah: mereka sudah memaku
//      saklarnya menyala lewat `vi.mock`, jadi jalur "menyala" tetap terbukti
//      hijau selama dijeda.
//   3. Gerbang rilis: `rm -rf .next` → `npm run build` → `npx tsc --noEmit` →
//      `npm test`. (Urutan build-sebelum-tsc itu WAJIB — lihat AGENTS.local.md §6.)
//   4. Push ke `origin` DAN `dramaku`.
// Tidak ada langkah lain: nol migration SQL, nol env baru, nol berkas yang harus
// dikembalikan. Saldo & episode yang sudah dibeli penonton tetap utuh di database,
// jadi begitu dinyalakan haknya langsung berlaku lagi.
//
// Daftar lengkap apa yang dimatikan tiap saklar + alasan tiap pengecualian:
// docs/lintasai/rencana/2026-10-28-jeda-koin-dan-iklan.md
//
// KENAPA berkas ini nol dependency: ia diimpor dari komponen browser (CoinChip,
// AdBanner) MAUPUN dari route server. Menambah import `next/server` di sini akan
// menarik kode server ke dalam bundle browser.

/**
 * Ekonomi koin + paywall episode: dompet, chip saldo, toko koin, layar "episode
 * terkunci", gerbang `lib/paywall-guard.ts`, dan 6 route `/api/coins/*`.
 *
 * ⚠️ `false` berarti TIDAK ADA cara membuka episode berbayar — jadi paywall ikut
 * dilepas dan episode 4 ke atas drama premium menjadi gratis untuk semua orang.
 * Itu disengaja: membiarkan paywall menyala tanpa koin berarti penonton menabrak
 * dinding mati. Tanda `premium` pada drama TIDAK dicabut, jadi saat dinyalakan
 * lagi daftar drama berbayar tetap seperti sekarang.
 *
 * Dibaca ulang lewat `lib/coins.ts` (re-export) supaya 10+ berkas pemanggil lama
 * tidak perlu diubah dan definisinya tetap SATU.
 */
export const PAYWALL_ENABLED = false;

/**
 * Seluruh iklan: banner sponsor di `/drama/[id]` & `/profile`, modal "nonton
 * iklan dapat koin", route `/api/ads` + `/api/ads/event`, serta panel pengatur
 * iklan di halaman admin.
 *
 * Berdiri sendiri dari `PAYWALL_ENABLED` DENGAN SENGAJA: banner sponsor adalah
 * penghasilan yang tidak lewat koin, jadi suatu saat mungkin ingin dinyalakan
 * lagi lebih dulu/terpisah. Owner 2026-10-28 memilih mematikan keduanya.
 */
export const ADS_ENABLED = false;

/**
 * AKUN PENONTON — tombol Masuk & Daftar, halaman profil, favorit, riwayat, dan
 * ajakan "Masuk untuk melanjutkan" di beranda.
 *
 * Dibuat 2026-10-29 atas arahan Kang Dedi lewat owner: "hapus fitur login /
 * daftar, karena orang lain tidak perlu login, mereka tinggal nonton gratis
 * saja." Dipilih saklar — bukan menghapus berkas — mengikuti keputusan owner
 * 2026-10-28 untuk koin & iklan: menyalakan kembali = satu `false` jadi `true`.
 *
 * ⚠️ YANG SENGAJA TIDAK IKUT MATI, dan kenapa:
 *
 * 1. Route `/login` TETAP HIDUP. Ia satu-satunya pintu ADMIN, dan admin masih
 *    harus mengelola katalog. Yang hilang cuma TAUTAN menuju ke sana dari
 *    tampilan penonton; admin membukanya dengan mengetik alamat, dan
 *    `AdminAccessDenied` tetap menunjuk ke sana.
 * 2. Route `/daftar` juga tetap hidup supaya tautan lama & bookmark tidak mati
 *    (404 mendadak terbaca seperti situs rusak), hanya tak ada lagi jalan ke
 *    sana dari dalam situs.
 * 3. Komentar & rating JUSTRU TETAP MENYALA, dan itu permintaan owner
 *    2026-10-29 yang eksplisit: "viewer masih bisa kasih rating komen".
 *    Karena keduanya dulu mensyaratkan sesi login, identitas penggantinya
 *    lahir di `lib/tamu.ts` — lihat BATAS JUJUR di berkas itu sebelum
 *    mengandalkan angkanya.
 */
export const AKUN_PENONTON_ENABLED = false;
