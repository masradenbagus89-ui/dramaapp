// Penyimpanan Laporan Video — KHUSUS SERVER. Satu dokumen app_data per laporan
// (`laporan-video:<uuid>`, lihat lib/kumpulan-dokumen.ts). Aturan & tipe ada di
// lib/laporan-video.ts.
import { randomUUID } from "node:crypto";
import { ambilDokumen, daftarDokumen, simpanDokumen } from "./kumpulan-dokumen";
import {
  idLaporanSah,
  type LaporanMasuk,
  type LaporanVideo,
  type StatusLaporan,
} from "./laporan-video";

const AWALAN = "laporan-video:";
/** Batas baca daftar admin. Lihat utang teknis di lib/kumpulan-dokumen.ts. */
const MAKS_DAFTAR = 500;

export async function buatLaporan(
  isian: LaporanMasuk & Pick<LaporanVideo, "judul" | "email" | "namaMember">,
  sekarang: Date = new Date(),
): Promise<LaporanVideo> {
  const waktu = sekarang.toISOString();
  const laporan: LaporanVideo = {
    ...isian,
    id: randomUUID(),
    status: "pending",
    dibuatPada: waktu,
    diperbaruiPada: waktu,
  };
  await simpanDokumen(AWALAN + laporan.id, laporan);
  return laporan;
}

/** Laporan terbaru dulu, maksimal MAKS_DAFTAR. */
export async function daftarLaporan(): Promise<LaporanVideo[]> {
  return daftarDokumen<LaporanVideo>(AWALAN, {
    urutTurunBerdasar: "dibuatPada",
    batas: MAKS_DAFTAR,
  });
}

/** Ubah status. Mengembalikan laporan sesudah diubah, atau null kalau tak ada. */
export async function ubahStatusLaporan(
  id: string,
  status: StatusLaporan,
  adminEmail: string,
  sekarang: Date = new Date(),
): Promise<LaporanVideo | null> {
  if (!idLaporanSah(id)) return null;
  const lama = await ambilDokumen<LaporanVideo>(AWALAN + id);
  if (!lama) return null;
  const baru: LaporanVideo = {
    ...lama,
    status,
    ditanganiOleh: adminEmail,
    diperbaruiPada: sekarang.toISOString(),
  };
  await simpanDokumen(AWALAN + id, baru);
  return baru;
}
