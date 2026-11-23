// Pembuang komentar untuk penjaga yang memeriksa KODE SEBAGAI TEKS.
//
// ⚠️ KENAPA WAJIB ADA: penjaga seperti `expect(sumber).toContain("…")` tidak
// bisa membedakan kode dari komentar. Begitu penjelasan di komentar menyebut
// contoh yang dilarang — dan penjelasan yang baik HAMPIR SELALU menyebutnya —
// penjaganya lolos/merah karena komentar itu, bukan karena kodenya. Kerusakan
// paling buruknya adalah arah "lolos": tes hijau di atas kode yang rusak.
//
// Terjadi berkali-kali di repo ini, terakhir 2026-11-23 pada DUA penjaga
// sekaligus dalam satu jam: patokan "panel lama sudah tidak dipakai" merah
// karena komentar riwayat menyebut panel lama, dan patokan "nilai sort sah"
// merah karena komentar perbaikan mengutip nilai yang salah.
//
// ⚠️ UTANG TEKNIS YANG DISENGAJA (2026-11-23): fungsi ini masih DISALIN di 8
// berkas tes lain (admin-csrf-gate, baris-atas-film, discover-tanpa-dashboard,
// film-terkait, koin-kunci-baris, menu-katalog-hp, nav-menu-lengkap,
// tahun-film). Belum dipindahkan ke sini karena sebagian berkas itu sedang
// dikerjakan sesi lain di folder yang sama, dan menyentuhnya sekarang membuat
// bentrok git. Cara menuntaskan: ganti definisi lokal di tiap berkas dengan
// `import { tanpaKomentar } from "./bantu/tanpa-komentar"`, jalankan
// `npx vitest run`, lalu hapus definisi lamanya.
//
// Batasnya jujur: ini pembuang TEKSTUAL, bukan pengurai TypeScript. Teks
// "//" di dalam string (mis. "https://contoh.com") ikut terpotong. Cukup
// untuk memeriksa ada/tidaknya potongan kode, TIDAK cukup kalau penjaganya
// memeriksa URL. Di kasus begitu, periksa hasil render — bukan sumbernya.
export function tanpaKomentar(ts: string): string {
  return ts.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}
