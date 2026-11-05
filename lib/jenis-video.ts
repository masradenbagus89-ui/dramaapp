// -------------------------------------------------------------------------
// JENIS tayangan sebuah video Playly: film layar lebar, atau episode SERIAL.
//
// KENAPA ADA (owner 2026-11-05): rekan meng-upload drama berseri lewat Playly
// dan judulnya mendarat di seksi "Film Terbaru". Itu bukan salah logika —
// sampai hari ini SELURUH video Playly memang dilempar ke baris film tanpa
// kecuali, sebab tak ada satu pun data yang bisa membedakannya. Playly tidak
// mengirim penanda jenis (lihat `PlaylyWebhookVideo` di lib/store.ts), dan
// jalur lama "kaitkan video -> drama" tidak pernah dipakai: diukur di produksi
// hari itu, 489 dari 489 video `dramaTitle`-nya null.
//
// KENAPA PENANDA MANUSIA, BUKAN TEBAKAN OTOMATIS (keputusan owner, dan angkanya
// diukur lebih dulu di 489 video produksi — bukan dikira-kira):
//   - pola judul ("Chapter N", "Ep N", "S07E15") cuma cocok di 18 video, dan
//     DUA di antaranya justru film: "John Wick Chapter 4", "Kantara A Legend
//     Chapter 1". Tebakan itu akan memindahkan film ke baris serial.
//   - judul yang dikeluhkan owner — "Pemuda Miskin Mata Tembus Pandang Jadi
//     Miliarder" — TIDAK punya angka episode sama sekali, jadi tebakan judul
//     gagal persis di kasus yang diminta.
//   - durasi tak bisa menolong: 282 dari 489 video (58%) durasinya null karena
//     Playly memang tidak mengirimnya.
// Dua arah meleset sekaligus, dan melesetnya SENYAP — tak ada error, cuma judul
// yang duduk di baris yang salah. Karena itu jenis ditentukan manusia.
//
// Semuanya fungsi MURNI (tanpa jaringan/DOM) supaya aturannya bisa diuji di
// tests/jenis-video.test.ts.
// -------------------------------------------------------------------------

/** Dua kemungkinan jenis tayangan. Sengaja bukan boolean `isSeries`: nama
 *  jenisnya ikut tersimpan di database dan dibaca manusia di panel admin. */
export type JenisVideo = "film" | "series";

/**
 * Jenis yang dipakai saat video BELUM ditandai admin.
 *
 * "film" dipilih dengan sengaja, dan ini pagar yang penting: hari fitur ini
 * dipasang, nol dari 489 video punya penanda. Kalau bawaannya "series",
 * seluruh katalog film akan pindah baris sekaligus tanpa seorang pun memintanya.
 * Dengan bawaan "film", perubahan ini NOL efek sampai owner menandai video
 * pertamanya — persis perilaku sebelum fitur ini ada.
 */
export const JENIS_BAWAAN: JenisVideo = "film";

/** Label yang dibaca manusia di panel admin. Satu tempat, supaya layar admin
 *  dan pesan konfirmasinya mustahil menyebut nama yang berbeda. */
export const LABEL_JENIS: Record<JenisVideo, string> = {
  film: "Film",
  series: "Series",
};

/**
 * Saring nilai dari luar (body permintaan HTTP) jadi jenis yang sah.
 *
 * ALLOWLIST, bukan pembersihan teks: apa pun yang tidak persis "film"/"series"
 * memulangkan null = "kembalikan ke bawaan". Nilai ngawur tidak pernah
 * tersimpan, jadi tak ada jalan bagi teks kiriman orang untuk mendarat di
 * database lalu tergambar di halaman penonton (rak owasp §4 mass assignment).
 */
export function parseJenisVideo(value: unknown): JenisVideo | null {
  const teks = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (teks === "film" || teks === "series") return teks;
  return null;
}

/**
 * Jenis satu video menurut peta pilihan admin.
 *
 * Peta yang tidak terbaca / video yang belum ditandai = JENIS_BAWAAN. Itu
 * gagal-aman: kegagalan membaca penanda mengembalikan video ke tempat lamanya
 * (baris film), bukan melemparkannya ke tempat yang belum pernah diminta.
 */
export function jenisVideo(
  videoId: string,
  peta: Record<string, string> = {},
): JenisVideo {
  return parseJenisVideo(peta[videoId]) ?? JENIS_BAWAAN;
}

/**
 * Tempelkan jenis ke tiap video dari peta pilihan admin.
 *
 * Dipanggil SEKALI di titik gabung kedua sumber (lib/playly-gabungan.ts),
 * bukan di masing-masing perakit — pola yang sama dengan `tempelUnduhanPlayly`
 * dan `lengkapiKualitasVideo` di sana. Alasannya: video dari KATALOG dan video
 * dari WEBHOOK harus memakai aturan yang sama persis, dan menempelkannya di dua
 * tempat berarti dua aturan yang bisa berbeda diam-diam.
 *
 * Memulangkan array BARU berisi objek baru — daftar milik pemanggil tidak
 * diubah di tempat (§3.7: fungsi tak boleh punya efek samping tersembunyi).
 */
export function tempelJenisVideo<T extends { id: string }>(
  videos: T[],
  peta: Record<string, string> = {},
): (T & { jenis: JenisVideo })[] {
  return videos.map((v) => ({ ...v, jenis: jenisVideo(v.id, peta) }));
}

/**
 * Belah satu daftar video jadi dua: film dan serial.
 *
 * Generik atas `{ jenis?: JenisVideo }` supaya bisa dipakai bentuk kartu mana
 * pun tanpa berkas ini perlu tahu isi lengkap `PlaylyVideoPublik` — dan supaya
 * tesnya bisa memakai data contoh seadanya.
 *
 * URUTAN ASLI DIPERTAHANKAN di kedua hasil. Daftar masuknya sudah terurut
 * terbaru-dulu oleh lib/playly-gabungan.ts; mengurut ulang di sini akan
 * diam-diam membatalkan urutan itu, dan akibatnya cuma terlihat sebagai
 * "video baru kok tidak muncul di depan".
 *
 * Video tanpa field `jenis` dihitung FILM — alasannya di JENIS_BAWAAN.
 */
export function pisahFilmSeries<T extends { jenis?: JenisVideo }>(
  videos: T[],
): { film: T[]; series: T[] } {
  const film: T[] = [];
  const series: T[] = [];
  for (const v of videos) {
    if (v.jenis === "series") series.push(v);
    else film.push(v);
  }
  return { film, series };
}

/**
 * Berapa banyak video serial Playly yang boleh ikut nebeng di seksi
 * "Series Terbaru" bersama drama katalog.
 *
 * DIBATASI dengan sengaja (pre-mortem rencana 2026-11-05): satu drama pendek
 * bisa berisi puluhan episode, dan tiap episode hari ini = satu kartu sendiri.
 * Tanpa batas, rekan yang meng-upload 30 episode akan memenuhi seluruh seksi
 * dengan 30 kartu berjudul hampir sama dan MENDORONG KELUAR drama katalog yang
 * sudah ada di sana — kerusakan yang tak memunculkan error apa pun, cuma seksi
 * yang terbaca berantakan.
 *
 * 6 dipilih supaya serial baru pasti terlihat (satu baris penuh di HP) tanpa
 * pernah menguasai seksinya: seksi memuat 20 kartu, jadi minimal 14 tempat
 * selalu tersisa untuk drama katalog. Sisa episodenya tetap terjangkau lewat
 * halaman katalog — tidak ada yang hilang.
 */
export const MAKS_SERIES_PLAYLY_DI_SEKSI = 6;
