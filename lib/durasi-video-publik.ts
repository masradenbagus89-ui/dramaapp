// -------------------------------------------------------------------------
// DURASI kartu video — isi yang kosong dari runtime IMDb.
//
// MASALAHNYA (diukur 2026-11-09 setelah owner bertanya "kenapa ada film yang
// belum lengkap"): Playly mengirim `durationSeconds: null` untuk **298 dari
// 489** video, jadi pojok durasi kartunya kosong. Sementara itu data IMDb yang
// SUDAH dicocokkan admin punya `runtime` ("91 min") pada **443 dari 473**
// entri — dan **252** di antaranya milik video yang durasinya kosong.
//
// Jadi datanya ada, cuma di laci sebelah. Pola yang sama persis dengan tahun,
// rating, dan kualitas sebelumnya.
//
// ⚠️ BATAS YANG HARUS JUJUR DIAKUI: runtime IMDb adalah panjang FILMNYA
// menurut IMDb, bukan panjang BERKAS yang kita simpan. Keduanya biasanya
// berdekatan tapi tidak identik (kredit penutup, potongan sensor, versi
// director's cut). Karena itu:
//   • durasi dari Playly SELALU menang — itu berkas kita sendiri;
//   • runtime IMDb hanya mengisi yang KOSONG, tidak pernah menimpa.
// Aturan yang sama dengan kualitas turunan di lib/kualitas-video.ts.
//
// Fungsi MURNI (tanpa jaringan/DOM) supaya bisa diuji di
// tests/durasi-video-publik.test.ts.
// -------------------------------------------------------------------------
import { menitDariRuntime } from "./format";
import { formatDuration } from "./format";

/**
 * Durasi dalam DETIK untuk satu video. `null` = tidak ada sumber mana pun.
 *
 * @param dariPlayly `durationSeconds` kiriman Playly — panjang berkas kita
 * @param runtimeImdb teks runtime dari OMDb ("91 min"), dipakai HANYA kalau
 *   yang pertama kosong
 */
export function detikTayangan(
  dariPlayly: number | null | undefined,
  runtimeImdb: string | null | undefined,
): number | null {
  if (typeof dariPlayly === "number" && dariPlayly > 0) return dariPlayly;

  const menit = menitDariRuntime(runtimeImdb);
  return menit === null ? null : menit * 60;
}

/**
 * Isi `durationLabel` yang masih "-" dengan turunan dari runtime IMDb.
 *
 * Bentuknya meniru `lengkapiKualitasVideo` (lib/kualitas-video.ts) dan
 * dipasang di tempat yang sama — SESUDAH penggabungan katalog + webhook, jadi
 * kedua sumber video memakai aturan yang persis sama dan tak ada yang
 * diam-diam tertinggal tanpa durasi.
 *
 * `durationSeconds` SENGAJA ikut diperbarui, bukan cuma labelnya: dua bentuk
 * dari satu data yang saling berbeda adalah sumber bug yang paling sulit
 * dilihat — pemutar membaca detiknya, kartu membaca labelnya.
 */
export function lengkapiDurasiVideo<
  T extends {
    id: string;
    durationSeconds: number | null;
    durationLabel: string;
    year: string | null;
  },
>(
  videos: T[],
  imdb: Readonly<Record<string, { runtime?: string } | undefined>>,
  /**
   * Tahun & durasi KETIKAN ADMIN. Menang atas semua sumber otomatis — itu
   * satu-satunya jalan mengisi film yang tidak ada di IMDb sama sekali
   * (owner 2026-11-09).
   */
  metaManual: Readonly<
    Record<string, { tahun?: string; durasiDetik?: number } | undefined>
  > = {},
): T[] {
  return videos.map((v) => {
    const manual = metaManual[v.id];
    let hasil = v;

    // --- TAHUN: ketikan admin menang atas IMDb.
    if (manual?.tahun) {
      hasil = { ...hasil, year: manual.tahun };
    }

    // --- DURASI: ketikan admin menang, lalu Playly, lalu runtime IMDb.
    // Urutannya bukan selera: yang diketik admin adalah koreksi SADAR atas
    // dua sumber lain, jadi ia tak boleh kalah oleh keduanya.
    const detik = manual?.durasiDetik
      ? manual.durasiDetik
      : detikTayangan(v.durationSeconds, imdb[v.id]?.runtime);

    if (detik !== null && detik !== v.durationSeconds) {
      hasil = {
        ...hasil,
        durationSeconds: detik,
        durationLabel: formatDuration(detik),
      };
    }

    return hasil;
  });
}
