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
