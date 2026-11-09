// -------------------------------------------------------------------------
// RINGKASAN pengisian kualitas & rating video Playly.
//
// KENAPA ADA (owner 2026-11-09): "sekarang buat juga kualitas dan rating agar
// bisa otomatis seperti kategori". Setelah diukur, ternyata KEDUANYA sudah
// otomatis — rating dari IMDb (lib/rating-video.ts `ratingTampil`), kualitas
// dari link unduhan (lib/kualitas-video.ts `kualitasDariUnduhan`) — dan
// hasilnya sudah tampil ke penonton: beranda produksi memajang 16 label "HD"
// dan 4 "CAM" saat diperiksa.
//
// Yang BELUM ada: cara melihatnya. Dropdown kualitas cuma menulis "Otomatis"
// tanpa memberi tahu otomatisnya jadi apa, jadi admin mustahil membedakan
// "sudah HD" dari "tidak ada sumbernya" tanpa membuka video satu per satu —
// persis yang owner minta dihindari.
//
// Modul ini menghitung ANGKAnya saja. Fungsi MURNI, nol jaringan, supaya bisa
// diuji di tests/ringkasan-isian-video.test.ts.
// -------------------------------------------------------------------------
import { kualitasDariUnduhan, type KualitasTurunan } from "./kualitas-video";
import type { LinkUnduhanPublik } from "./playly-unduhan";

/** Link unduhan dikelompokkan per video — bentuk yang dipakai penurunan kualitas. */
export type PetaUnduhan = Record<string, LinkUnduhanPublik[] | undefined>;

/**
 * Kelompokkan daftar link unduhan (bentuk simpanannya datar) per videoId.
 *
 * Dipisah jadi fungsi sendiri supaya pengelompokan ini TIDAK diulang di tiap
 * baris tabel: 489 video × 761 link berarti 372 ribu perbandingan kalau
 * daftarnya disaring ulang per baris — cukup untuk membuat panel tersendat
 * tiap kali satu dropdown disentuh.
 */
export function kelompokkanUnduhan(
  links: readonly { videoId: string; provider: string; quality: string; url: string }[],
): PetaUnduhan {
  const peta: PetaUnduhan = {};
  for (const l of links) {
    (peta[l.videoId] ??= []).push(l as LinkUnduhanPublik);
  }
  return peta;
}

/**
 * Asal nilai kualitas sebuah video — inilah yang dipajang di sebelah dropdown.
 *
 * `null` pada `turunan` BUKAN "kualitas rendah", melainkan "tidak ada
 * sumbernya": video itu belum punya link unduhan sama sekali. Membedakan
 * keduanya penting karena tindakannya beda — yang satu sudah beres, yang lain
 * perlu link unduhan diisi lebih dulu.
 */
export type AsalKualitas =
  | { jenis: "manual"; nilai: string }
  | { jenis: "turunan"; nilai: KualitasTurunan }
  | { jenis: "kosong" };

export function asalKualitas(
  videoId: string,
  kualitasManual: Readonly<Record<string, string | undefined>>,
  unduhan: PetaUnduhan,
): AsalKualitas {
  const manual = (kualitasManual[videoId] ?? "").trim();
  if (manual) return { jenis: "manual", nilai: manual };

  const turunan = kualitasDariUnduhan(unduhan[videoId]);
  return turunan ? { jenis: "turunan", nilai: turunan } : { jenis: "kosong" };
}

/** Asal nilai rating sebuah video. */
export type AsalRating =
  | { jenis: "manual"; nilai: string }
  | { jenis: "imdb"; nilai: string }
  | { jenis: "kosong" };

export function asalRating(
  videoId: string,
  ratingManual: Readonly<Record<string, string | undefined>>,
  imdb: Readonly<Record<string, { rating?: string } | undefined>>,
): AsalRating {
  const manual = (ratingManual[videoId] ?? "").trim();
  if (manual) return { jenis: "manual", nilai: manual };

  const dariImdb = (imdb[videoId]?.rating ?? "").trim();
  return dariImdb ? { jenis: "imdb", nilai: dariImdb } : { jenis: "kosong" };
}

export type RingkasanIsian = {
  total: number;
  kualitas: { manual: number; turunan: number; kosong: number };
  rating: { manual: number; imdb: number; kosong: number };
  /**
   * Video yang ratingnya kosong DAN belum pernah dicocokkan ke IMDb.
   *
   * Dipisah dari `rating.kosong` karena tindakannya berbeda, dan itulah satu
   * satunya angka yang bisa ditindaklanjuti: yang BELUM dicocokkan masih bisa
   * ditolong tombol "Cocokkan semua", sedangkan yang sudah dicocokkan tapi
   * IMDb-nya memang tak punya nilai (film baru/jarang ditonton) buntu — tidak
   * ada gunanya menyuruh admin mencocokkannya berulang kali.
   */
  ratingBisaDitolongImdb: number;
};

export function ringkasIsian(
  videos: readonly { id: string }[],
  kualitasManual: Readonly<Record<string, string | undefined>>,
  ratingManual: Readonly<Record<string, string | undefined>>,
  imdb: Readonly<Record<string, { rating?: string } | undefined>>,
  unduhan: PetaUnduhan,
): RingkasanIsian {
  const hasil: RingkasanIsian = {
    total: videos.length,
    kualitas: { manual: 0, turunan: 0, kosong: 0 },
    rating: { manual: 0, imdb: 0, kosong: 0 },
    ratingBisaDitolongImdb: 0,
  };

  for (const v of videos) {
    const id = String(v.id);

    const k = asalKualitas(id, kualitasManual, unduhan);
    hasil.kualitas[k.jenis === "manual" ? "manual" : k.jenis === "turunan" ? "turunan" : "kosong"]++;

    const r = asalRating(id, ratingManual, imdb);
    hasil.rating[r.jenis === "manual" ? "manual" : r.jenis === "imdb" ? "imdb" : "kosong"]++;
    if (r.jenis === "kosong" && !imdb[id]) hasil.ratingBisaDitolongImdb++;
  }

  return hasil;
}
