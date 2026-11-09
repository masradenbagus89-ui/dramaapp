# 2026-11-09 — Trailer montase per episode di kotak poster halaman detail drama

## 1. Apa yang berubah + kenapa
Kotak poster kiri-bawah di halaman `/drama/[id]` sebelumnya cuma gambar diam. Sekarang, ±1,2 detik
sesudah halaman terbuka, kotak itu memutar **trailer montase tanpa suara**: potongan 6 detik dari
Ep 1 → Ep 2 → … sampai Ep 8 (atau sebanyak episodenya kalau lebih sedikit), diulang 2 putaran, lalu
kembali ke poster diam. Label kecil "▶ Cuplikan Ep N" menunjukkan episode yang sedang diputar;
lencana rating/EPS/tahun/durasi tetap terlihat di atas video.

Tidak ada berkas trailer baru — potongannya diambil dari berkas episode yang sudah ada lewat
`/api/teaser` (redirect 307 ke PC backup, jadi **tidak** menambah transfer Vercel). Detik 0-5 tiap
episode dilewati supaya intro/logo yang sama tidak terulang. Gagal-aman: episode rusak dilompati,
terlalu banyak gagal berturut-turut → kembali ke poster. Video dijeda saat kotak tergulung keluar
layar, dan tidak diputar sama sekali bagi pengguna yang mengaktifkan "kurangi animasi".

Paywall: saat `PAYWALL_ENABLED` menyala, drama premium hanya menggilir episode gratis
(`FREE_EPISODES` = 3). Episode terkunci ditolak `/api/teaser` (montase akan macet), dan memutarnya
di trailer sama dengan membocorkan isi berbayar. Saat ini paywall mati → semua drama digilir s/d Ep 8.

Branch `feat/trailer-poster-detail` dibuat dari `main` c21f354 (2026-11-09) — tidak perlu rebase.

## 2. Berkas yang disentuh
- `app/components/DramaTrailer.tsx` (BARU — pemutar montase)
- `app/components/Poster.tsx` (prop opsional `media`, digambar di bawah lapisan lencana. Dipakai
  semua kartu situs: beranda, cari, kategori, riwayat, my-list — tanpa prop itu perilakunya **tidak
  berubah**)
- `lib/hero-teaser.ts` (konstanta + fungsi giliran: `nextTrailerEpisode`, `trailerTotalClips`, `trailerClipDone`)
- `app/drama/[id]/page.tsx` (`HeroDrama`: Poster → DramaTrailer)
- `tests/hero-teaser.test.ts` (5 tes baru)

## 3. Butuh SQL migrasi?
Tidak.

## 4. Butuh env baru di Vercel?
Tidak.

## 5. Bukti yang sudah dijalankan
`npm run build` sukses (lokal dengan `ALLOW_FILE_MODE=1`, tanpa database) · `npx tsc --noEmit`
0 error (sesudah build) · `npm test` 153 berkas / 2186 tes lulus.
❓ Pemutaran video BELUM dilihat langsung: dari komputer rekan alamat sumber video lama di
`.env.local` sudah mati, dan alamat aktif + kunci tanda tangan URL hanya ada di produksi. Kalau video
gagal, kotak kembali ke poster diam (gagal-aman). Perlu dicek owner di situs sungguhan / preview.

## 6. Cara owner mencoba sendiri
1. Buka halaman detail drama berseri, mis. "Diremehkan Istana, Bangkit Sebagai Dewa Abadi".
2. Tunggu ±2 detik tanpa klik apa pun.
3. Kotak poster kiri-bawah harus memutar video bisu dengan label "▶ Cuplikan Ep 1", lalu tiap ±6
   detik berganti ke Ep 2, Ep 3, …; sesudah 2 putaran kembali ke poster diam.
