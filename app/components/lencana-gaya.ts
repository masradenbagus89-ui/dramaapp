// -------------------------------------------------------------------------
// GAYA CHIP LENCANA POSTER — dipakai bersama kartu DRAMA (Poster.tsx) dan
// kartu FILM (beranda/KartuVideo.tsx).
//
// KENAPA BERKAS SENDIRI (2026-10-31): sampai hari ini kelas-kelas ini tinggal
// di dalam Poster.tsx, dan kartu film tidak menggambar lencana sama sekali.
// Begitu kartu film ikut memajang rating & kualitas, menyalin kelasnya ke sana
// berarti dua gaya chip yang harus diubah bersamaan setiap kali owner mengganti
// seleranya — dan yang satu pasti tertinggal, TANPA error (§3.3).
//
// Aturan ISI lencana (kapan digambar, nilainya dari mana) TIDAK tinggal di
// sini — itu milik lib/lencana-kartu.ts untuk drama dan lib/playly-publik.ts
// untuk film. Berkas ini murni soal RUPA.
// -------------------------------------------------------------------------

/** Bentuk dasar semua chip lencana: ukuran, jarak, sudut, bayangan. */
export const CHIP =
  "pointer-events-none flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[10px] font-bold leading-tight shadow md:text-[11px]";

/** Chip netral berlatar gelap — dipakai lencana rating. */
export const CHIP_GELAP =
  "bg-black/75 text-white ring-1 ring-white/15 backdrop-blur-[2px]";

/**
 * Warna chip kualitas — dua warna saja, sesuai contoh yang diberikan owner
 * 2026-09-22 sore (dua poster pembanding: CAM merah, HD hijau).
 *
 * MERAH = CAM/HDCAM, rekaman bioskop (buram, sering miring). Warnanya bukan
 * hiasan: itu peringatan yang dicari penonton SEBELUM memutuskan menonton.
 * HIJAU = sisanya (HD, WEB-DL, BluRay, 4K) = sumber bersih, aman ditonton.
 *
 * Sengaja cuma dua warna, bukan satu warna per nilai: penonton perlu menjawab
 * satu pertanyaan saja ("jernih atau tidak?"), dan lima warna berbeda di pojok
 * poster justru memperlambat jawabannya.
 *
 * Menerima `string`, bukan `DramaQuality`, sejak dipakai bersama kartu film:
 * `quality` milik video bertipe string bebas (lib/playly-publik.ts) karena
 * sumbernya katalog kita, bukan daftar tertutup. Nilai di luar dugaan jatuh ke
 * HIJAU — sama dengan perilaku sebelumnya untuk nilai non-CAM.
 */
export function warnaKualitas(q: string): string {
  const atas = q.toUpperCase();
  return atas === "CAM" || atas === "HDCAM"
    ? "bg-red-600 text-white ring-1 ring-red-300/40"
    : "bg-green-600 text-white ring-1 ring-green-300/40";
}
