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
