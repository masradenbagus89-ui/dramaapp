// Tampilan tabel pilihan unduhan — SATU sumber untuk kedua tempat yang
// memakainya: DownloadModal (halaman drama + ikon Unduh di pemutar) dan
// ModalProviderPlayly (video Playly).
//
// KENAPA BERKAS SENDIRI: sampai 2026-09-30 `KELAS_WARNA` ditulis DUA KALI,
// identik, di kedua komponen itu — dan warna kepala tabelnya dua kali lagi.
// Empat tempat untuk satu keputusan tampilan berarti mengubah warna = empat
// suntingan, dan yang terlewat tidak memunculkan error apa pun: tombolnya
// cuma berbeda warna di satu halaman. Owner memilih warna kepala #e50b4b
// untuk KEDUA tempat (2026-09-30), jadi menyatukannya sekarang lebih murah
// daripada menyalinnya sekali lagi.
//
// Ini berkas .ts berisi kelas CSS, BUKAN logika — sengaja diletakkan di
// app/components/ (berdekatan dengan yang memakainya), bukan di lib/ yang
// isinya logika data.
import type { DownloadButtonColor } from "@/lib/types";

/**
 * Kepala tabel PROVIDER | DOWNLOAD.
 *
 * Hex ditulis langsung (`bg-[#e50b4b]`), bukan lewat token di globals.css:
 * nilainya hidup di SATU baris ini saja, jadi lapisan token tidak menambah
 * apa pun selain satu tempat lagi untuk dicari. #e50b4b dipilih owner
 * menggantikan `bg-pink-600` (#db2777) yang lebih condong ke ungu.
 */
export const KELAS_KEPALA_TABEL = "bg-[#e50b4b] text-white";

/**
 * Warna tombol per baris provider.
 *
 * DITULIS UTUH, sengaja tidak dirakit (`bg-` + warna + `-600`): Tailwind
 * memindai kode sumber untuk memutuskan kelas mana yang ikut dibundel, jadi
 * kelas yang baru terbentuk saat program berjalan tidak akan ada di CSS hasil
 * build — tombolnya tergambar tanpa warna sama sekali. Kegagalannya SENYAP:
 * tak ada error, cuma tombol pucat.
 *
 * Gradasi dipilih owner 2026-09-30 untuk kedua tempat. `inset` putih tipis di
 * tepi atas yang membuat tombol terbaca menonjol; tanpa itu gradasi gelap-ke-
 * terang saja terlihat seperti tombol rata yang kotor.
 */
export const KELAS_WARNA_TOMBOL: Record<DownloadButtonColor, string> = {
  blue:
    "bg-gradient-to-b from-blue-500 to-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] hover:from-blue-400 hover:to-blue-600",
  orange:
    "bg-gradient-to-b from-orange-400 to-orange-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] hover:from-orange-300 hover:to-orange-500",
};

/**
 * Tulisan di tombol tiap baris.
 *
 * Kualitas yang kosong TIDAK ditambal tebakan "1080p": resolusi yang tidak
 * pernah disebutkan pengunggahnya memang tidak kita ketahui, dan menuliskannya
 * = menjanjikan ketajaman yang belum diperiksa siapa pun (aturan yang sama
 * dengan lencana poster, lib/types.ts). Dipisah jadi fungsi bernama supaya
 * aturan kecil ini punya satu tempat yang bisa diuji langsung.
 */
export function labelTombolProvider(quality: string | undefined): string {
  return quality ? `DOWNLOAD ${quality}` : "DOWNLOAD";
}
