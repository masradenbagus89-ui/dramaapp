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

/**
 * Grid poster: jumlah kolom MENYESUAIKAN SENDIRI — sebanyak mungkin kolom
 * selebar minimal 110px.
 *
 * KENAPA bukan `sm:grid-cols-4 md:grid-cols-6 …`: patokan ukuran layar terbesar
 * Tailwind berhenti di 1536px. Di layar yang lebih lebar jumlah kolomnya TIDAK
 * bertambah — yang terjadi tiap poster justru MELAR jadi raksasa. `auto-fill`
 * menambah kolom sendiri berapa pun lebar layarnya.
 */
export const GRID_CLASS =
  "grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-x-1.5 gap-y-4 pt-4";

/** Bentuk seragam untuk dropdown penyaring yang dititipkan ke bar cari. */
export const TRIGGER_CLASS =
  "h-9 w-full rounded-sm border-black/20 bg-black/25 text-xs font-semibold text-white focus:ring-0 md:w-auto [&>span]:text-white";
