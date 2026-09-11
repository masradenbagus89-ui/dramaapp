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
 * selebar minimal sekian piksel.
 *
 * KENAPA bukan `sm:grid-cols-4 md:grid-cols-6 …`: patokan ukuran layar terbesar
 * Tailwind berhenti di 1536px. Di layar yang lebih lebar jumlah kolomnya TIDAK
 * bertambah — yang terjadi tiap poster justru MELAR jadi raksasa. `auto-fill`
 * menambah kolom sendiri berapa pun lebar layarnya.
 *
 * KENAPA angka minimalnya BERTINGKAT (owner 2026-09-11: "cover/katalog agak
 * kecil, mau seperti LK21"): satu angka untuk semua layar tak bisa dipakai.
 * 104px yang pas di HP (3 kolom) berubah jadi belasan poster mungil di layar
 * 1920; sebaliknya 172px yang enak dilihat di desktop memaksa HP turun ke 2
 * kolom raksasa. Jadi patokannya naik mengikuti lebar layar.
 */
export const GRID_CLASS =
  "grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-x-2 gap-y-5 pt-4 " +
  "sm:grid-cols-[repeat(auto-fill,minmax(124px,1fr))] " +
  "md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] " +
  "lg:grid-cols-[repeat(auto-fill,minmax(172px,1fr))]";

/**
 * Lebar SATU kartu di baris geser (FeaturedRow).
 *
 * Sengaja disimpan bersebelahan dengan GRID_CLASS: di /beranda kedua bentuk itu
 * tampil di halaman yang SAMA (baris geser di atas, grid di bawah). Kalau
 * ukurannya diubah sendiri-sendiri, poster baris atas dan poster grid bawah jadi
 * beda besar — terbaca seperti halaman yang belum selesai dirapikan, dan tak ada
 * error yang memberi tahu. Angkanya sengaja dibuat sejajar dengan tangga
 * GRID_CLASS di atas.
 */
export const ROW_CARD_CLASS =
  "w-[116px] shrink-0 sm:w-[132px] md:w-[150px] lg:w-[172px]";

/** Bentuk seragam untuk dropdown penyaring yang dititipkan ke bar cari. */
export const TRIGGER_CLASS =
  "h-9 w-full rounded-sm border-black/20 bg-black/25 text-xs font-semibold text-white focus:ring-0 md:w-auto [&>span]:text-white";
