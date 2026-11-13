// Konstanta bersama halaman admin:
//  - CATEGORY_OPTIONS : daftar kategori untuk dropdown form Tambah/Update Drama.
//  - CATEGORY_COLORS  : warna tiap kategori (dipakai dashboard + daftar drama).
// Dipisah agar dipakai ulang oleh page.tsx maupun komponen admin tanpa
// definisi kembar.
import { KATEGORI_ISI } from "@/lib/types";

/**
 * DITURUNKAN dari `KATEGORI_ISI`, tidak lagi diketik ulang (2026-11-13).
 *
 * KENAPA diubah: sampai hari ini berkas ini menyimpan SALINAN ketikan tangan
 * berisi 7 kategori. Begitu owner menambah kategori di lib/types.ts, dropdown
 * "Tambah Drama" tetap memajang 7 yang lama — tanpa satu pun error, karena
 * dua daftar yang kebetulan sama-sama sah memang tidak bertabrakan. Itulah
 * sebab keluhan "pilihan genrenya sedikit": daftarnya bertambah di satu
 * tempat, dropdownnya membaca tempat yang lain.
 */
export const CATEGORY_OPTIONS = KATEGORI_ISI;

/**
 * Warna lencana tiap kategori.
 *
 * Tujuh yang pertama SENGAJA tidak diubah warnanya — sudah dilihat penonton
 * sejak lama, dan menggesernya berarti mengubah tampilan yang tidak diminta.
 * Yang baru dipilih agar hue-nya berjauhan: lencana yang mirip-mirip membuat
 * dashboard jadi tebak-tebakan.
 *
 * 🪤 Kelas DITULIS UTUH, jangan pernah dirakit jadi `bg-${warna}-500`.
 * Tailwind v4 (terpasang 4.2.4) memindai kode sebagai TEKS; kelas yang baru
 * terbentuk saat program jalan tidak pernah ikut dibangun, jadi lencananya
 * kehilangan warna tanpa satu pun pesan error.
 */
/**
 * Palet lencana untuk kategori yang tak punya warna manual di bawah.
 *
 * Alasannya sama dengan PALET di lib/genre-accent.ts: sejak katalog jadi 67
 * kategori (owner 2026-11-13), mendata warna satu per satu cuma menciptakan
 * peluang salah ketik — dan kategori yang salah ketik kehilangan lencananya
 * tanpa pesan error. Warna yang sudah tayang tetap dikunci manual.
 *
 * 🪤 Kelas ditulis UTUH; Tailwind v4 tidak membangun nama kelas yang baru
 * terbentuk saat program jalan.
 */
const PALET_LENCANA = [
  "bg-rose-400",
  "bg-orange-400",
  "bg-amber-400",
  "bg-yellow-400",
  "bg-lime-400",
  "bg-green-400",
  "bg-emerald-400",
  "bg-teal-400",
  "bg-cyan-400",
  "bg-sky-400",
  "bg-blue-400",
  "bg-indigo-400",
  "bg-violet-400",
  "bg-purple-400",
  "bg-fuchsia-400",
  "bg-pink-400",
  "bg-red-400",
  "bg-slate-400",
];

/**
 * Warna lencana sebuah kategori. Manual dulu, baru palet.
 *
 * Hash-nya sengaja sama persis dengan `indeksPalet` di lib/genre-accent.ts
 * supaya kategori yang sama cenderung memakai hue yang sama di panel admin
 * dan di halaman penonton.
 */
export function warnaKategori(nama: string): string {
  const manual = CATEGORY_COLORS[nama];
  if (manual) return manual;
  let h = 0;
  for (let i = 0; i < nama.length; i++) h = (h * 31 + nama.charCodeAt(i)) >>> 0;
  return PALET_LENCANA[h % PALET_LENCANA.length];
}

export const CATEGORY_COLORS: Record<string, string> = {
  // --- Kurasi DramaKu (warna lama, jangan diubah) ---
  Romance: "bg-rose-500",
  Tycoon: "bg-amber-500",
  Harem: "bg-pink-500",
  "Time Travel": "bg-violet-500",
  Action: "bg-orange-500",
  Comedy: "bg-yellow-500",
  Fantasy: "bg-emerald-500",
  // --- Genre film & serial (2026-11-13) ---
  Adventure: "bg-teal-500",
  Drama: "bg-sky-500",
  "Sci-Fi": "bg-indigo-500",
  Horror: "bg-red-600",
  Thriller: "bg-purple-600",
  Mystery: "bg-slate-500",
  Crime: "bg-zinc-600",
  War: "bg-stone-600",
  Western: "bg-amber-700",
  Animation: "bg-lime-500",
  Anime: "bg-fuchsia-500",
  Family: "bg-green-500",
  History: "bg-yellow-800",
  Biography: "bg-cyan-600",
  Documentary: "bg-blue-600",
  Musical: "bg-pink-700",
  Sport: "bg-lime-700",
  // --- Enam genre IMDb terakhir (2026-11-13) ---
  // Hue Tailwind (22) sudah habis di 24 kategori sebelumnya, jadi keenam ini
  // memakai ulang hue dengan SHADE yang jelas berbeda. Film-Noir sengaja
  // paling gelap — kebetulan itu juga arti namanya.
  Music: "bg-pink-400",
  "Film-Noir": "bg-stone-800",
  Short: "bg-teal-700",
  "Reality-TV": "bg-sky-700",
  "Game-Show": "bg-orange-700",
  "Talk-Show": "bg-blue-800",
};
