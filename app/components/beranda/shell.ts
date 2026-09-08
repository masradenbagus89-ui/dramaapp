/**
 * Pembatas lebar isi + padding tepi, dipakai bersama oleh bar cari, strip genre,
 * baris unggulan, dan grid katalog.
 *
 * KENAPA satu tempat: `shell-wide` (1440px, didefinisikan di app/globals.css)
 * juga dipakai navbar. Kalau angkanya ditulis ulang di tiap berkas, salah satu
 * pasti tertinggal saat diubah dan tepi kiri antar-baris tidak lagi sejajar —
 * putus TANPA error, jadi tak ada yang melapor.
 */
export const SHELL = "shell-wide mx-auto px-4 md:px-6";
