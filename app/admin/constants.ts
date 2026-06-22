// Konstanta bersama halaman admin:
//  - CATEGORY_OPTIONS : daftar kategori untuk dropdown form Tambah/Update Drama.
//  - CATEGORY_COLORS  : warna tiap kategori (dipakai dashboard + daftar drama).
// Dipisah agar dipakai ulang oleh page.tsx maupun komponen admin tanpa
// definisi kembar.
export const CATEGORY_OPTIONS = [
  "Romance",
  "Tycoon",
  "Harem",
  "Time Travel",
  "Action",
  "Comedy",
  "Fantasy",
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Romance: "bg-rose-500",
  Tycoon: "bg-amber-500",
  Harem: "bg-pink-500",
  "Time Travel": "bg-violet-500",
  Action: "bg-orange-500",
  Comedy: "bg-yellow-500",
  Fantasy: "bg-emerald-500",
};
