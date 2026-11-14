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
//   (a) ✅ DIPERBAIKI 2026-11-14 (owner: "biar tidak loading lama lagi").
//       Catatan lama di sini berbunyi "hilang tiap aplikasi di-deploy ulang.
//       Tidak apa-apa" — ternyata TIDAK tidak-apa-apa: tiap rilis membuat buka
//       PERTAMA halaman admin membayar lagi lantai ≥47 detik itu, dan rilis di
//       project ini sering. Ingatannya kini punya salinan di tabel `app_data`
//       (dokumen `playly:berkas-siap`), persis jalur naik-kelas yang disarankan
//       butir (b) di bawah. Memorinya TETAP jalur cepatnya; database hanya
//       dibaca sekali per proses.
//   (b) Kalau aplikasi kelak dijalankan >1 instance, tiap instance punya
//       ingatannya sendiri. Akibat terburuknya pekerjaan terulang per instance
//       — BUKAN hasil yang salah. Salinan di (a) ikut meringankannya: instance
//       baru mewarisi jawaban instance lain lewat dokumen yang sama.
//   (c) Baris WARISAN (dari proses sebelumnya) dipakai walau sudah lewat 5
//       menit, lalu disegarkan DI LATAR. Janji "penanda hilang dalam 5 menit"
//       TIDAK dilonggarkan untuk baris yang lahir di proses ini — lihat
//       `UMUR_WARISAN_MS`.
import {
  fetchPlaylyDetailPublik,
  petaBerbatasPlayly,
  readPlaylyConfig,
  type PlaylyConfig,
} from "@/lib/playly";
import { bolehTampilKePenonton } from "@/lib/playly-publik";
import {
  getIngatanBerkasSiap,
  setIngatanBerkasSiap,
  type IngatanBerkasSiap,
} from "@/lib/store";

/**
 * Umur ingatan. 5 menit dipilih supaya admin yang baru meng-upload ulang video
 * di dashboard Playly melihat penandanya hilang dalam satu kali seduh kopi —
 * tanpa membuat halaman memeriksa ulang 489 video tiap kali dibuka.
 */
export const UMUR_INGATAN_MS = 5 * 60 * 1000;

type Entri = {
  belumSiap: boolean;
  kedaluwarsa: number;
  /**
   * Baris ini WARISAN dari proses sebelumnya (dimuat dari database), bukan
   * hasil pemeriksaan proses ini. Lihat `muatWarisanSekali()`.
   */
  warisan?: true;
};

const ingatan = new Map<string, Entri>();

/**
 * Berapa lama baris WARISAN masih boleh dipakai sesudah kedaluwarsa.
 *
 * Bukan perpanjangan umur ingatan — baris yang lahir di proses ini TETAP
 * diperiksa ulang begitu lewat 5 menit, persis seperti sebelumnya. Batas ini
 * hanya berlaku sekali, untuk baris yang dimuat dari database saat proses
 * baru menyala: dipakai agar layar langsung terisi, lalu DISEGARKAN DI LATAR.
 *
 * 24 jam dipilih karena di atas itu tebakannya terlalu tua untuk berguna —
 * lebih baik diperiksa sungguhan (dan admin menunggu) daripada menampilkan
 * penanda yang mungkin sudah salah seharian.
 */
export const UMUR_WARISAN_MS = 24 * 60 * 60 * 1000;

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
  /**
   * Berapa video yang jawabannya dipulangkan dari ingatan WARISAN (proses
   * sebelumnya) sambil disegarkan di latar. Nol di jalur normal; hanya
   * terisi pada pembukaan pertama sesudah aplikasi di-restart.
   */
  disegarkanDiLatar: number;
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
  await muatWarisanSekali(sekarangMs);

  /** Harus ditunggu: belum pernah diperiksa, atau warisannya sudah terlalu tua. */
  const perluDicek: string[] = [];
  /** Sudah ada jawaban warisan yang layak pakai — segarkan di LATAR, jangan ditunggu. */
  const perluLatar: string[] = [];

  for (const id of videoIds) {
    const entri = ingatan.get(id);
    if (!entri) {
      perluDicek.push(id);
    } else if (entri.kedaluwarsa > sekarangMs) {
      // masih segar — tak ada yang perlu dikerjakan
    } else if (entri.warisan && entri.kedaluwarsa + UMUR_WARISAN_MS > sekarangMs) {
      perluLatar.push(id);
    } else {
      perluDicek.push(id);
    }
  }

  if (perluDicek.length > 0) {
    // Dibatasi petaBerbatasPlayly, BUKAN Promise.all: melepas ratusan panggilan
    // sekaligus membuat Playly timeout dan SELURUH sampul di halaman PENONTON
    // ikut kosong (terukur 2026-10-06). Batas yang sama, server yang sama.
    await petaBerbatasPlayly(perluDicek, (id) =>
      periksaSatuSekali(id, konfigurasi, sekarangMs),
    );
  }

  // SENGAJA tidak di-`await`: inilah yang membuat buka pertama sesudah deploy
  // terasa cepat. Jawaban warisannya sudah dipulangkan di bawah; pembaruannya
  // menyusul untuk permintaan berikutnya. Galat ditelan — ini cache, gagal
  // menyegarkan berarti jawaban lamanya dipakai sekali lagi, bukan error.
  if (perluLatar.length > 0) {
    void segarkanDiLatar(perluLatar, konfigurasi);
  }

  if (perluDicek.length > 0) simpanIngatanNanti();

  return {
    ids: videoIds.filter((id) => ingatan.get(id)?.belumSiap === true),
    diperiksa: perluDicek.length,
    disegarkanDiLatar: perluLatar.length,
  };
}

/**
 * Muat ingatan proses SEBELUMNYA dari database — sekali saja per proses.
 *
 * Gagal-terbuka: database tak terjangkau = jalan seperti sebelum ada fitur ini
 * (semua diperiksa dari nol). Yang hilang kecepatan, bukan kebenaran.
 */
let pemuatan: Promise<void> | null = null;
function muatWarisanSekali(sekarangMs: number): Promise<void> {
  pemuatan ??= (async () => {
    try {
      const tersimpan = await getIngatanBerkasSiap();
      for (const [id, baris] of Object.entries(tersimpan)) {
        // Terlalu tua untuk dipercaya, DAN sudah lewat masa pakai warisan.
        if (baris.kedaluwarsa + UMUR_WARISAN_MS <= sekarangMs) continue;
        // Baris yang sudah ada di memori proses ini selalu menang: ia hasil
        // pemeriksaan sungguhan hari ini, bukan tebakan kemarin.
        if (ingatan.has(id)) continue;
        ingatan.set(id, { ...baris, warisan: true });
      }
    } catch (err) {
      console.warn(
        "[playly] gagal memuat ingatan berkas-siap:",
        err instanceof Error ? err.message : String(err),
      );
    }
  })();
  return pemuatan;
}

/** Segarkan baris warisan di latar, lalu simpan hasilnya. */
async function segarkanDiLatar(
  ids: string[],
  konfigurasi: PlaylyConfig,
): Promise<void> {
  try {
    await petaBerbatasPlayly(ids, (id) =>
      periksaSatuSekali(id, konfigurasi, Date.now()),
    );
    simpanIngatanNanti();
  } catch {
    // Sengaja diam: lihat alasan di pemanggilnya.
  }
}

/**
 * Tulis ingatan ke database, digabung agar satu permintaan = satu tulisan.
 *
 * KENAPA DITUNDA: satu halaman admin memeriksa ratusan video, dan tiap video
 * selesai pada waktunya sendiri. Menulis per video = ratusan tulisan untuk
 * satu kali buka halaman.
 */
let penundaan: ReturnType<typeof setTimeout> | null = null;
function simpanIngatanNanti(): void {
  if (penundaan) return;
  penundaan = setTimeout(() => {
    penundaan = null;
    void simpanIngatanSekarang();
  }, JEDA_SIMPAN_MS);
  // Jangan tahan proses tetap hidup hanya demi menunggu penyimpanan cache.
  penundaan.unref?.();
}

/** Jeda penggabungan tulisan. Cukup panjang untuk menampung satu kali buka halaman. */
const JEDA_SIMPAN_MS = 3_000;

async function simpanIngatanSekarang(): Promise<void> {
  try {
    const peta: IngatanBerkasSiap = {};
    for (const [id, e] of ingatan) {
      peta[id] = { belumSiap: e.belumSiap, kedaluwarsa: e.kedaluwarsa };
    }
    await setIngatanBerkasSiap(peta);
  } catch (err) {
    console.warn(
      "[playly] gagal menyimpan ingatan berkas-siap:",
      err instanceof Error ? err.message : String(err),
    );
  }
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
  // Ikut direset: tanpa ini tes kedua memakai hasil pemuatan tes pertama,
  // dan kegagalannya tampak acak (urutan tes menentukan hasilnya).
  pemuatan = null;
  if (penundaan) {
    clearTimeout(penundaan);
    penundaan = null;
  }
}

/** Isi ingatan saat ini, untuk tes. Jumlah entri yang tersimpan. */
export function jumlahIngatanBerkasSiap(): number {
  return ingatan.size;
}
