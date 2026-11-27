// Helper alamat (URL) video. Fungsi MURNI — dipisah dari komponen FeedPlayer
// agar bisa dites & dipakai ulang. Aturan nama berkas video di PC backup:
//   <ep>.mp4         -> resolusi asli
//   <ep>.<res>.mp4   -> varian resolusi (mis. 1.720p.mp4)
// Kalau baseUrl kosong (mode lokal/dev) -> pakai folder publik /videos/<dramaId>.
export function videoSrc(
  baseUrl: string,
  dramaId: string,
  ep: number,
  resolution: string,
): string {
  const dir = baseUrl ? `${baseUrl}/${dramaId}` : `/videos/${dramaId}`;
  return resolution ? `${dir}/${ep}.${resolution}.mp4` : `${dir}/${ep}.mp4`;
}

// 🪦 `downloadUrl(baseUrl, dramaId, ep)` DIBUANG 2026-10-27 — JANGAN dihidupkan lagi.
//
// Fungsi itu menempelkan alamat tunnel LANGSUNG ke halaman, jadi alamat unduh
// episode berbayar terbaca siapa pun dari View Source — jalur kedua dari
// kebocoran paywall yang diukur hari itu (tunnel membalas 206 ke permintaan
// tanpa login). Penggantinya `/api/download?id=..&ep=..`: gerbang paywall yang
// sama ditegakkan dulu, baru 307 ke `...?dl=1`, dan Caddy PC backup yang
// mengirim `Content-Disposition: attachment` (pc-backup-agent/Caddyfile:20-25).
// Unduhan tetap langsung dari tunnel — nol byte lewat server kita.
//
// Alasan lama "hindari batas 60 detik fungsi Vercel" sudah TIDAK berlaku: situs
// pindah ke Railway yang menjalankan server Node biasa. Lagi pula `/api/download`
// hanya MENUNJUK, tak pernah menyalurkan — batas itu tak pernah tersentuh.

// Keputusan saat elemen <video> melempar error. Dipisah dari FeedPlayer sebagai
// fungsi MURNI supaya bisa dites tanpa merender komponen (project ini belum
// punya @testing-library/react).
//
// KENAPA ADA: dulu jalur gagal berakhir di `v.src = "/sample.mp4"` — berkas yang
// tidak pernah ada di public/ dan malah diblokir .gitignore. Akibatnya saat
// sumber video mati penonton cuma melihat kotak hitam tanpa keterangan apa pun.
export type VideoErrorAction =
  // Varian resolusi (mis. 720p) tidak ada di server → turun ke resolusi Asli.
  | "turun-ke-asli"
  // Sumber memang tidak bisa diputar → tampilkan pesan + tombol Coba lagi.
  | "menyerah"
  // Sudah menyerah sebelumnya → jangan lakukan apa pun (cegah loop error).
  | "abaikan";

export function decideVideoError(input: {
  /** Resolusi yang sedang dipakai; string kosong = "Asli". */
  resolution: string;
  /** Resolusi yang SUDAH pernah gagal untuk elemen ini (penanda anti-ulang). */
  resolutionTried: string;
  /** Elemen ini sudah pernah dinyatakan gagal total. */
  alreadyFailed: boolean;
}): VideoErrorAction {
  if (input.alreadyFailed) return "abaikan";
  // Hanya sekali per resolusi: kalau varian yang sama sudah dicoba dan tetap
  // gagal, itu tandanya bukan soal resolusi — sumbernya yang mati.
  if (input.resolution && input.resolutionTried !== input.resolution) {
    return "turun-ke-asli";
  }
  return "menyerah";
}

// ---------------------------------------------------------------------------
// MACET TANPA ERROR — lubang yang ditemukan 2026-11-27 dari laporan owner.
//
// GEJALANYA: layar hitam, `0:00 / 0:00`, tombol play, dan TIDAK ADA pesan apa
// pun. Panel "Video sedang tidak bisa diputar + Coba lagi" di FeedPlayer hanya
// digambar kalau elemen <video> melempar event `error` (lihat decideVideoError
// di atas). Saat sumbernya cuma LAMBAT atau alamat tunnelnya baru berganti,
// error itu TIDAK PERNAH dilempar — videonya menunggu selamanya, dan penonton
// tidak diberi tahu apa-apa. Diam adalah kerusakan yang paling buruk: penonton
// mengira situsnya rusak, dan tidak ada tombol yang bisa ia tekan.
//
// YANG DIUKUR hari itu (bukan dugaan): terowongan `morgan-gorgeous-bent-ashley`
// turun ke 21-85 KB/detik padahal satu episode 2 menit butuh 231 KB/detik, lalu
// MATI TOTAL; agent PC backup baru melaporkan alamat penggantinya 13 menit
// kemudian. Di sepanjang jeda itu seluruh drama diam tanpa keterangan.
//
// KENAPA "ambil alamat baru" jadi langkah PERTAMA, bukan langsung menyerah:
// alamat quick tunnel berganti acak tiap PC backup restart (lib/video-base.ts),
// jadi penyebab paling mungkin sebuah halaman yang sudah lama terbuka berhenti
// memutar adalah alamat di tangannya SUDAH BASI. Meminta alamat baru menyembuhkan
// kasus itu tanpa penonton menyentuh apa pun.
//
// BATAS YANG DISENGAJA: hanya menangani "metadata tak pernah datang"
// (readyState 0). Video yang sudah mulai lalu tersendat di tengah TIDAK
// disentuh — di situ pemutar sudah punya durasi & tombolnya sendiri, dan
// ikut campur di sana berisiko memotong tontonan yang sebenarnya masih jalan.
export type VideoStuckAction =
  // Masih wajar / bukan urusan kita → jangan ganggu.
  | "tunggu"
  // Minta alamat segar ke server; tunnel mungkin sudah berganti alamat.
  | "ambil-alamat-baru"
  // Sudah dicoba dan tetap tak ada tanda hidup → tampilkan panel + Coba lagi.
  | "menyerah";

/**
 * Keputusan saat episode AKTIF tak kunjung memuat apa pun.
 *
 * Fungsi MURNI, alasannya sama dengan `decideVideoError`: aturan yang menentukan
 * penonton melihat pesan atau layar hitam harus bisa diuji tanpa merender
 * komponen (project ini belum punya @testing-library/react).
 */
export function decideVideoStuck(input: {
  /** Episode terkunci paywall — panel koin yang bicara, bukan panel gagal. */
  locked: boolean;
  /**
   * `readyState` elemen <video>. 0 = HAVE_NOTHING: durasi pun belum terbaca,
   * persis keadaan `0:00 / 0:00` di layar. >= 1 berarti metadata sudah sampai.
   */
  readyState: number;
  /** Alamat untuk episode ini sudah pernah diminta ulang. */
  alreadyRefreshed: boolean;
  /** Episode ini sudah dinyatakan gagal → panelnya sudah tampil. */
  alreadyFailed: boolean;
}): VideoStuckAction {
  // Panel paywall & panel gagal sudah bicara; dua pesan sekaligus membingungkan.
  if (input.locked || input.alreadyFailed) return "tunggu";
  // Metadata sudah sampai = sumbernya menjawab. Biarkan pemutar bekerja.
  if (input.readyState >= 1) return "tunggu";
  if (!input.alreadyRefreshed) return "ambil-alamat-baru";
  return "menyerah";
}

/**
 * Berapa lama menunggu sebelum menyimpulkan "tidak ada yang datang".
 *
 * 12 detik dipilih dari angka yang diukur, bukan selera: bagian metadata berkas
 * drama (`moov`) berukuran ~137 KB, jadi pada sumber sehat (400-560 KB/detik)
 * ia tiba di bawah 1 detik, dan bahkan pada sumber sekarat 21 KB/detik masih
 * tiba dalam ~7 detik. Lewat 12 detik tanpa satu byte metadata berarti memang
 * ada yang salah — bukan sekadar penonton dengan internet pelan.
 */
export const BATAS_MACET_MS = 12_000;

/** Episode yang ditawarkan tombol Unduh di halaman DETAIL drama. */
export const DETAIL_DOWNLOAD_EP = 1;

// Alamat unduh untuk tombol di halaman DETAIL drama (/drama/[id]).
//
// KENAPA SELALU lewat /api/download, tidak pernah menempel alamat tunnel
// seperti `downloadUrl()` yang dulu ada di atas: halaman detail di-cache (`revalidate = 60` +
// generateStaticParams), jadi alamat tunnel yang ikut dibakar ke HTML bisa
// jauh lebih basi daripada umur tunnel itu sendiri — dan alamatnya berganti
// tiap PC backup restart. Route /api/download `force-dynamic`, jadi ia selalu
// menanyakan alamat terbaru, lalu membalas 307 (menunjuk, bukan menyalurkan)
// sehingga tak ada byte video yang lewat server kita.
//
// KENAPA ep 1 dan bukan pilihan penonton: ep 1..FREE_EPISODES gratis untuk
// semua orang (lib/coins.ts:17), jadi tombol ini TIDAK bisa dipakai melewati
// paywall koin. Menaikkannya ke episode berbayar = membuka bypass — dijaga
// tes di tests/download-button.test.ts.
export function detailDownloadUrl(
  dramaId: string,
  ep: number = DETAIL_DOWNLOAD_EP,
): string {
  return `/api/download?id=${encodeURIComponent(dramaId)}&ep=${ep}`;
}

/** Nama berkas yang disodorkan ke browser. Seragam dengan tombol unduh di player. */
export function downloadFileName(dramaId: string, ep: number): string {
  return `${dramaId}-ep${ep}.mp4`;
}
