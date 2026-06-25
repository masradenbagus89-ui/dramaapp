// Hitung posisi waktu (detik) tujuan saat seek bar digeser. Fungsi MURNI —
// dipisah dari FeedPlayer agar bisa dites & dipakai ulang.
//
// Rumus: rasio jarak jari dari tepi kiri bar, dijepit ke rentang 0..1, lalu
// dikali durasi video. Jadi geser ke ujung kiri = detik 0, ujung kanan = akhir.
//
//   clientX   : posisi X jari/kursor (px, koordinat layar)
//   rectLeft  : tepi kiri seek bar (px) — dari getBoundingClientRect().left
//   rectWidth : lebar seek bar (px)     — dari getBoundingClientRect().width
//   duration  : durasi video (detik)
//
// Penjaga: lebar/durasi <= 0 → kembalikan 0 (cegah bagi-nol → NaN).
export function seekTime(
  clientX: number,
  rectLeft: number,
  rectWidth: number,
  duration: number,
): number {
  if (rectWidth <= 0 || duration <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, (clientX - rectLeft) / rectWidth));
  return ratio * duration;
}
