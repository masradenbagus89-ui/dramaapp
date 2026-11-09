import type { ProgressEntry } from "./progress";

/**
 * Ke mana tombol "nonton" mengarah, dan apa tulisannya.
 *
 * KENAPA DIPISAH (2026-11-09): aturan ini tadinya hanya hidup di dalam
 * `app/components/WatchCta.tsx`. Begitu tempat KEDUA ingin "langsung nonton"
 * (gambar besar hero), satu-satunya cara adalah menyalin aturannya — dan
 * salinan itulah yang diam-diam menua saat aturan aslinya berubah, sehingga
 * tombol kuning dan gambar besar di halaman yang SAMA bisa mengarah ke
 * episode berbeda. Kerusakan seperti itu tidak memunculkan error apa pun.
 *
 * Fungsi MURNI: `localStorage` dibaca oleh pemanggil lewat `getProgressEntry`,
 * bukan di sini — supaya bisa diuji tanpa browser (§3.7: membaca ≠ mengubah).
 */
export function tujuanNonton(
  dramaId: string,
  entry: ProgressEntry | null,
): { href: string; label: string } {
  // Belum pernah ditonton → mulai dari episode 1 secara eksplisit.
  if (!entry) return { href: `/feed/${dramaId}?ep=1`, label: "Mulai Nonton" };
  // Sudah pernah → tanpa `?ep=`, halaman feed sendiri yang memulihkan posisi
  // terakhir (lib/progress.ts:227 resumePosition).
  return { href: `/feed/${dramaId}`, label: "Lanjut Nonton" };
}
