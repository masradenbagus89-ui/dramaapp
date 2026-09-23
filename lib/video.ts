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

// Alamat (URL) untuk MENGUNDUH episode (beda dari videoSrc yang untuk diputar).
// Kalau ada tunnel (baseUrl) -> unduh LANGSUNG dari tunnel dengan ?dl=1, supaya
// server tunnel kirim header "attachment" → HP mengunduh sampai TUNTAS (tanpa
// batas waktu 60 detik fungsi Vercel yang dulu memutus unduhan file besar).
// Tanpa tunnel (mode lokal/dev) -> lewat proxy /api/download.
export function downloadUrl(
  baseUrl: string,
  dramaId: string,
  ep: number,
): string {
  return baseUrl
    ? `${baseUrl.replace(/\/$/, "")}/${dramaId}/${ep}.mp4?dl=1`
    : `/api/download?id=${encodeURIComponent(dramaId)}&ep=${ep}`;
}

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
