// -------------------------------------------------------------------------
// TAHUN & DURASI ketikan admin untuk video Playly.
//
// KENAPA ADA (owner 2026-11-09: "kalau yang tidak ada gimana cara isi
// manualnya"): tahun dan durasi selama ini HANYA bisa datang dari IMDb atau
// dari Playly. Kalau film tidak ada di IMDb — film lokal, rilisan sangat baru,
// atau judul yang tidak ketemu — kedua pojok poster itu kosong permanen dan
// tak ada satu pun cara mengisinya. Empat kolom lain (kategori, kualitas,
// jenis, rating) sudah punya isian manual; dua ini tertinggal.
//
// ⚠️ ANGKA INI DILIHAT PENONTON — ia tergambar di pojok poster lewat
// KartuVideo & PlaylyVideoGrid. Jadi nilainya disaring DI SINI dan DI SERVER,
// bukan cuma dibatasi kotak isian di layar: siapa pun bisa mengirim body apa
// saja ke endpoint admin, dan UI bukan pagar.
//
// Fungsi MURNI (tanpa DOM/jaringan) supaya aturannya bisa diuji di
// tests/meta-video-manual.test.ts.
// -------------------------------------------------------------------------
import { detikDariDurasiEpisode, menitDariRuntime } from "./format";

/**
 * Batas tahun yang masuk akal.
 *
 * Bawah 1888: film tertua yang tercatat (Roundhay Garden Scene). Atas
 * sengaja longgar — katalog memuat film yang baru akan rilis, dan menolak
 * tahun depan berarti admin tidak bisa menyiapkan judulnya lebih awal.
 */
export const TAHUN_MIN = 1888;
export const TAHUN_MAKS = 2100;

/**
 * Terjemahkan ketikan admin jadi tahun yang sah, atau `null`.
 *
 * `null` berarti "HAPUS tahun manual untuk video ini" — bukan error. Itu aksi
 * yang sah dan justru keadaan bawaannya: begitu dihapus, video kembali memakai
 * tahun dari IMDb kalau ada.
 */
export function parseTahunManual(nilai: unknown): string | null {
  if (nilai === null || nilai === undefined) return null;

  const teks = String(nilai).trim();
  if (!teks) return null;

  // Hanya 4 angka, tidak lebih: "2024abc" ditolak, bukan dipotong jadi "2024".
  // Memotong berarti menebak maksud orang, dan tahun yang salah tergambar di
  // poster tanpa satu pun error.
  if (!/^\d{4}$/.test(teks)) return null;

  const n = Number(teks);
  return n >= TAHUN_MIN && n <= TAHUN_MAKS ? teks : null;
}

/**
 * Terjemahkan ketikan durasi admin jadi DETIK, atau `null`.
 *
 * ATURANNYA = TULIS PERSIS SEPERTI YANG TERGAMBAR DI KARTU (owner 2026-11-09:
 * "durasi kamu seragamkan dengan cara penulisan film lainnya"). Kartu memakai
 * `formatDuration` yang menulis `j:mm:dd` untuk yang ≥1 jam dan `m:dd` untuk
 * yang di bawahnya, jadi aturan ketiknya dibuat BERCERMIN ke situ:
 *
 *   "1:47:00"                 -> 1 jam 47 menit  (seperti kartu film)
 *   "2:25" / "2.25"           -> 2 menit 25 detik (seperti kartu video pendek)
 *   "95 min" / "2 jam 15 menit" -> bentuk bersatuan, untuk menyalin dari IMDb
 *   "145"                     -> 145 menit (angka polos = menit, seperti OMDb)
 *
 * 🪤 BENTUK TIGA-BAGIAN DULU TIDAK ADA, DAN ITU BUG DIAM — terukur 2026-11-09
 * sebelum diperbaiki: `parseDurasiManual("1:47:00")` memulangkan **60 detik**.
 * Sebabnya tak satu pun pola lama cocok, sehingga jatuh ke `menitDariRuntime`
 * yang mengambil angka PERTAMA ("1") dan membacanya 1 menit. Nol error, nol
 * peringatan — film 1 jam 47 menit tayang berlabel "1:00" ke penonton.
 *
 * Yang membuatnya berbahaya: `1:47:00` justru bentuk yang PALING MUNGKIN
 * diketik, karena persis itu yang admin lihat di kartu dan salin. Jalur paling
 * alami adalah jalur yang paling salah.
 *
 * Bentuk-bentuk lama TIDAK berubah artinya — pola tiga-bagian ini murni
 * tambahan, dan dicek PALING DULU supaya tak lagi jatuh ke tebakan angka polos.
 */
export function parseDurasiManual(nilai: unknown): number | null {
  if (nilai === null || nilai === undefined) return null;

  const teks = String(nilai).trim();
  if (!teks) return null;

  // JAM:MENIT:DETIK — bentuk yang tergambar di kartu film.
  //
  // Ditangani TERTUTUP: begitu teksnya berbentuk tiga-bagian, hanya pola ketat
  // di dalam yang boleh lolos — selebihnya `null`, TIDAK diteruskan ke pola di
  // bawah. Tanpa penutupan ini "1:70:00" jatuh ke `menitDariRuntime`, terambil
  // angka pertamanya, dan terbaca 1 menit: bug yang sama persis dengan yang
  // sedang diperbaiki, cuma lewat pintu lain. (Terukur: tes "menit & detik di
  // atas 59 ditolak" MERAH pada percobaan pertama justru karena lubang ini.)
  //
  // Menit & detik dibatasi 0-59 karena angka yang mustahil berarti admin salah
  // ketik, dan menebak maksudnya berarti memajang durasi karangan ke penonton.
  if (/^\d{1,2}[.:]\d{1,2}[.:]\d{1,2}$/.test(teks)) {
    const ketat = teks.match(/^(\d{1,2})[.:]([0-5]?\d)[.:]([0-5]\d)$/);
    if (!ketat) return null;
    const total =
      Number(ketat[1]) * 3600 + Number(ketat[2]) * 60 + Number(ketat[3]);
    return total > 0 ? total : null;
  }

  // Menit:detik — "2.25" juga cocok dengan pola angka-polos di
  // `menitDariRuntime`, dan di sana ia akan terbaca 2 MENIT, bukan 2:25.
  const detik = detikDariDurasiEpisode(teks);
  if (detik !== null) return detik;

  const menit = menitDariRuntime(teks);
  return menit === null ? null : menit * 60;
}

/**
 * Ketikan durasi -> kalimat awam ("1 jam 47 menit"), atau `null` kalau tak
 * terbaca. Dipakai PRATINJAU di panel admin.
 *
 * KENAPA ADA: "1:45" berarti 1 menit 45 detik, "1:45:00" berarti 1 jam 45
 * menit — dua ketikan yang mirip dengan arti yang jauh berbeda, dan salah pilih
 * TIDAK memunculkan error apa pun. Satu-satunya cara menutup kelas kesalahan
 * ini untuk selamanya adalah memperlihatkan hasil bacaannya sebelum disimpan,
 * bukan menambah satu kalimat petunjuk lagi yang tetap bisa terlewat.
 */
export function jelaskanDurasiManual(nilai: unknown): string | null {
  const total = parseDurasiManual(nilai);
  if (total === null) return null;

  const jam = Math.floor(total / 3600);
  const menit = Math.floor((total % 3600) / 60);
  const detik = total % 60;

  const bagian: string[] = [];
  if (jam > 0) bagian.push(`${jam} jam`);
  if (menit > 0) bagian.push(`${menit} menit`);
  if (detik > 0) bagian.push(`${detik} detik`);
  return bagian.join(" ");
}
