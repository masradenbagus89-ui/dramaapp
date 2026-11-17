// Daftar video untuk halaman admin IMDb — ingatannya di proses ini, bukan cache Next.
//
// KENAPA BUKAN `next: { revalidate }` (pelajaran 2026-11-11, docs/lintasai/INDEX.md):
// halaman admin memakai `dynamic = "force-dynamic"`, dan Next memaksa SETIAP
// fetch di halaman itu jadi `no-store`. Angka revalidate berapa pun tidak
// bekerja, tanpa error. Mengulang seluruh katalog (beberapa halaman berurutan,
// tiap halaman batas tunggu 10 detik) membuat layar "Memuat…" bertahan lama
// tiap admin datang dari beranda.
//
// Yang dilakukan di sini: salinan SUKSES terakhir dikembalikan seketika.
// Kalau umurnya sudah lewat UMUR_DAFTAR_ADMIN_MS, salinan itu TETAP yang
// dikembalikan (layar tidak menunggu), dan pengambilan baru jalan di latar
// untuk bukaan berikutnya. Video yang baru di-upload jadi kelihatan saat
// halaman dibuka lagi, bukan di bukaan yang sedang berjalan.
//
// BATAS (§3.2): ingatan hilang saat proses baru (deploy / restart). Bukaan
// pertama sesudah itu tetap menunggu Playly — tapi halaman sudah menggambar
// menu dan judulnya lebih dulu (app/admin/videos/playly/page.tsx), jadi yang
// menunggu hanya daftarnya, bukan seluruh layar.

import {
  fetchPlaylyVideosKita,
  type PlaylyConfig,
  type PlaylyMitraResult,
} from "@/lib/playly";

/** Satu menit: cukup agar klik beranda → IMDb yang berulang tidak mengunduh ulang. */
export const UMUR_DAFTAR_ADMIN_MS = 60_000;

type Salinan = { hasil: PlaylyMitraResult; pada: number };

let salinan: Salinan | null = null;
let penerbangan: Promise<PlaylyMitraResult> | null = null;

/** Untuk tes. Produksi tidak memanggil ini. */
export function lupakanDaftarPlaylyAdmin(): void {
  salinan = null;
  penerbangan = null;
}

async function ambilDariPlayly(konfigurasi: PlaylyConfig): Promise<PlaylyMitraResult> {
  if (penerbangan) return penerbangan;
  penerbangan = fetchPlaylyVideosKita(konfigurasi, 0)
    .then((hasil) => {
      // Gagal atau kosong-karena-error tidak boleh menimpa salinan yang bagus.
      // Daftar kosong TANPA error adalah keadaan sah (akun baru) dan disimpan.
      if (!hasil.error) salinan = { hasil, pada: Date.now() };
      return hasil;
    })
    .finally(() => {
      penerbangan = null;
    });
  return penerbangan;
}

/**
 * Daftar untuk panel admin. Salinan yang ada dikembalikan tanpa menunggu
 * Playly. Hanya bukaan tanpa salinan sama sekali yang menunggu.
 */
export async function ambilDaftarPlaylyAdmin(
  konfigurasi: PlaylyConfig,
): Promise<PlaylyMitraResult> {
  const ada = salinan;
  if (ada && !ada.hasil.error) {
    if (Date.now() - ada.pada >= UMUR_DAFTAR_ADMIN_MS) {
      void ambilDariPlayly(konfigurasi);
    }
    return ada.hasil;
  }
  return ambilDariPlayly(konfigurasi);
}
