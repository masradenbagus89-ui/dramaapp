// Ingatan singkat "video Playly mana yang BERKASNYA belum ada".
//
// KENAPA ADA (owner 2026-11-11, lanjutan perbaikan halaman admin Video Playly):
// memeriksanya = SATU permintaan ke Playly PER VIDEO. Dengan 489 video dan
// batas 4 panggilan bersamaan, itu ~123 giliran berurutan × ≥0,386 detik =
// lantai ≥47 detik. Tanpa ingatan, ongkos itu dibayar ULANG tiap kali halaman
// admin dibuka — termasuk saat admin mengklik menunya dua kali karena terasa
// lambat, yang justru melipatgandakan beban ke Playly.
//
// ⚠️ KENAPA BUKAN cache bawaan Next (`next: { revalidate }`), padahal itu alat
// standar ekosistemnya. Dua perilaku Next yang TERDOKUMENTASI mematikannya
// tepat di dua tempat kita memakainya, dan keduanya DIAM-DIAM (nol error,
// cache-nya sekadar tidak bekerja):
//   1. Halaman admin memakai `dynamic = "force-dynamic"`, yang setara dengan
//      memaksa SETIAP `fetch` di dalamnya jadi `{ cache: 'no-store' }`
//      (node_modules/next/dist/docs/01-app/02-guides/
//       caching-without-cache-components.md:97-99).
//   2. Di route handler, setelan bawaan `fetchCache: 'auto'` TIDAK men-cache
//      `fetch` yang dipanggil SESUDAH Request-time API — sedangkan cek sesi
//      admin (membaca cookie) WAJIB lebih dulu (dokumen yang sama, :126).
// Ingatan sederhana di berkas ini bisa diuji mesin (tests/playly-berkas-siap),
// sedangkan "apakah Data Cache Next benar-benar aktif di produksi" tidak bisa
// dibuktikan dari luar tanpa menanam alat ukur sendiri.
//
// BATASNYA, disebut terang-terangan (§3.2):
//   (a) Hidup di MEMORI proses → hilang tiap aplikasi di-deploy ulang. Tidak
//       apa-apa: isinya penghematan, bukan data. Yang hilang cuma kecepatan.
//   (b) Kalau aplikasi kelak dijalankan >1 instance, tiap instance punya
//       ingatannya sendiri. Akibat terburuknya pekerjaan terulang per instance
//       — BUKAN hasil yang salah. Kalau itu jadi masalah, naikkan ke tabel
//       Supabase berkolom kedaluwarsa, bukan ke cache Next.
import {
  fetchPlaylyDetailPublik,
  petaBerbatasPlayly,
  readPlaylyConfig,
  type PlaylyConfig,
} from "@/lib/playly";
import { bolehTampilKePenonton } from "@/lib/playly-publik";

/**
 * Umur ingatan. 5 menit dipilih supaya admin yang baru meng-upload ulang video
 * di dashboard Playly melihat penandanya hilang dalam satu kali seduh kopi —
 * tanpa membuat halaman memeriksa ulang 489 video tiap kali dibuka.
 */
export const UMUR_INGATAN_MS = 5 * 60 * 1000;

type Entri = { belumSiap: boolean; kedaluwarsa: number };

const ingatan = new Map<string, Entri>();

/**
 * Pemeriksaan yang SEDANG berjalan, PER VIDEO.
 *
 * KENAPA: tanpa ini, dua permintaan yang datang berdekatan sama-sama melihat
 * ingatan kosong lalu sama-sama menembaki Playly — 978 permintaan, bukan 489.
 * Justru itu yang paling mungkin terjadi: keluhan aslinya "lama", dan admin
 * yang tak sabar akan mengklik lagi.
 *
 * Dikunci per VIDEO, bukan satu kunci untuk seluruh pemeriksaan. Kunci tunggal
 * punya lubang: permintaan kedua yang daftarnya BERBEDA ikut menunggu, lalu
 * pulang dengan sebagian id-nya belum terperiksa — tanpa ada yang tahu.
 */
const berjalan = new Map<string, Promise<void>>();

export type HasilBelumSiap = {
  /** Video yang berkasnya TIDAK ada di Playly. */
  ids: string[];
  /** Berapa video yang benar-benar ditanyakan ke Playly kali ini (0 = semua dari ingatan). */
  diperiksa: number;
};

/**
 * Periksa daftar video, pakai ingatan untuk yang masih segar.
 *
 * `sekarangMs` disuntikkan hanya untuk tes — kode produksi tidak mengisinya.
 */
export async function idVideoBelumSiap(
  videoIds: readonly string[],
  konfigurasi: PlaylyConfig = readPlaylyConfig(),
  sekarangMs: number = Date.now(),
): Promise<HasilBelumSiap> {
  const perluDicek = videoIds.filter((id) => {
    const entri = ingatan.get(id);
    return !entri || entri.kedaluwarsa <= sekarangMs;
  });

  if (perluDicek.length > 0) {
    // Dibatasi petaBerbatasPlayly, BUKAN Promise.all: melepas ratusan panggilan
    // sekaligus membuat Playly timeout dan SELURUH sampul di halaman PENONTON
    // ikut kosong (terukur 2026-10-06). Batas yang sama, server yang sama.
    await petaBerbatasPlayly(perluDicek, (id) =>
      periksaSatuSekali(id, konfigurasi, sekarangMs),
    );
  }

  return {
    ids: videoIds.filter((id) => ingatan.get(id)?.belumSiap === true),
    diperiksa: perluDicek.length,
  };
}

/** Satu video diperiksa paling banyak sekali pada satu waktu (lihat `berjalan`). */
function periksaSatuSekali(
  id: string,
  konfigurasi: PlaylyConfig,
  sekarangMs: number,
): Promise<void> {
  const sudahJalan = berjalan.get(id);
  if (sudahJalan) return sudahJalan;

  const tugas = periksaSatu(id, konfigurasi, sekarangMs).finally(() => {
    berjalan.delete(id);
  });
  berjalan.set(id, tugas);
  return tugas;
}

/**
 * Video yang TIDAK bisa dipastikan sengaja tidak disimpan ke ingatan.
 *
 * KENAPA: `punyaFile === null` berarti "tidak tahu" (Playly tak terjawab atau
 * balasannya tak dikenali). Menyimpannya sebagai "aman" akan menyembunyikan
 * video rusak selama 5 menit penuh — kerusakan senyap. Lebih baik diperiksa
 * ulang pada permintaan berikutnya.
 */
async function periksaSatu(
  id: string,
  konfigurasi: PlaylyConfig,
  sekarangMs: number,
): Promise<void> {
  const detail = await fetchPlaylyDetailPublik(id, konfigurasi, 0);
  if (detail.punyaFile === null) return;
  ingatan.set(id, {
    belumSiap: !bolehTampilKePenonton(detail),
    kedaluwarsa: sekarangMs + UMUR_INGATAN_MS,
  });
}

/** Kosongkan ingatan. HANYA untuk tes — produksi tidak pernah memanggilnya. */
export function lupakanIngatanBerkasSiap(): void {
  ingatan.clear();
  berjalan.clear();
}

/** Isi ingatan saat ini, untuk tes. Jumlah entri yang tersimpan. */
export function jumlahIngatanBerkasSiap(): number {
  return ingatan.size;
}
