// -------------------------------------------------------------------------
// "COCOKKAN SEMUA" link unduhan: baca folder Google Drive + Mega SEKALI, lalu
// pasangkan ke seluruh video (aturan pencocokan: lib/playly-unduhan-cocok.ts).
//
// HANYA MEMBACA. Hasilnya mengisi tabel admin; penyimpanan tetap lewat tombol
// "Simpan semua" (POST /api/admin/playly/unduhan, validasi domain di server).
//
// Telegram tidak ada di sini: Bot API Telegram tak bisa membaca riwayat
// channel, jadi tak ada "folder" yang bisa dicocokkan.
//
// Server-only (lewat modul Drive/Mega yang membaca env berisi kunci).
// -------------------------------------------------------------------------
import type { KualitasUnduhan, ProviderUnduhan } from "./playly-unduhan";
import { ambilFileDrive, urlFileDrive } from "./playly-unduhan-drive";
import { ambilFileMega } from "./playly-unduhan-mega";
import { cocokkanSemuaVideo, type FileSumber, type VideoCocok } from "./playly-unduhan-cocok";

type HasilAmbil = { ok: true; files: FileSumber[] } | { ok: false; alasan: string; belumDiatur?: true };

export type StatusSumber =
  | { provider: ProviderUnduhan; status: "ok"; jumlahFile: number }
  | { provider: ProviderUnduhan; status: "belum-diatur" | "gagal"; alasan: string };

export type SaranVideo = {
  saran: { provider: ProviderUnduhan; quality: KualitasUnduhan; url: string }[];
  ganda: { provider: ProviderUnduhan; quality: KualitasUnduhan; nama: string[] }[];
};

export type HasilCocokkanSemua = {
  hasil: Record<string, SaranVideo>;
  sumber: StatusSumber[];
};

/** Pembaca tiap sumber; disuntikkan di tes supaya tak menyentuh Google/Mega. */
export type SumberOtomatis = { provider: ProviderUnduhan; ambil: () => Promise<HasilAmbil> };

export const SUMBER_BAWAAN: SumberOtomatis[] = [
  {
    provider: "google",
    ambil: async () => {
      const h = await ambilFileDrive();
      return h.ok ? { ok: true, files: h.files.map((f) => ({ name: f.name, url: urlFileDrive(f.id) })) } : h;
    },
  },
  { provider: "mega", ambil: () => ambilFileMega() },
];

export async function cocokkanSemuaSumber(
  videos: VideoCocok[],
  sumberList: SumberOtomatis[] = SUMBER_BAWAAN,
): Promise<HasilCocokkanSemua> {
  // Serentak: total waktu = sumber paling lambat, bukan jumlah semuanya.
  const dibaca = await Promise.all(sumberList.map(async (s) => ({ s, h: await s.ambil() })));

  const hasil: Record<string, SaranVideo> = {};
  const sumber: StatusSumber[] = [];
  for (const { s, h } of dibaca) {
    if (!h.ok) {
      sumber.push({ provider: s.provider, status: h.belumDiatur ? "belum-diatur" : "gagal", alasan: h.alasan });
      continue;
    }
    sumber.push({ provider: s.provider, status: "ok", jumlahFile: h.files.length });
    for (const [id, cocok] of Object.entries(cocokkanSemuaVideo(videos, h.files))) {
      const v = (hasil[id] ??= { saran: [], ganda: [] });
      v.saran.push(...cocok.saran.map((x) => ({ provider: s.provider, ...x })));
      v.ganda.push(...cocok.ganda.map((x) => ({ provider: s.provider, ...x })));
    }
  }
  return { hasil, sumber };
}
