# 2026-11-07 — Pemutar episode drama: Play di tengah, bawah hanya timer, klik 2x maju/mundur 10 detik

## 1. Apa yang berubah + kenapa
Permintaan: tampilan nonton drama per episode (`/feed/<id>`) dibuat lebih bersih.
- **Tombol Putar/Jeda bulat di TENGAH persis video.** Dulu lingkaran Putar sengaja di 58% tinggi
  (permintaan owner) karena panel bawah tinggi; panel bawah sekarang jauh lebih pendek, jadi
  tengah tidak menimpa judul. Saat video berjalan, tombol Jeda di tengah muncul bersama kontrol.
- **Panel bawah hanya judul + Eps x/y + subtitle + bar posisi + timer `0:12 / 1:30`.** Tombol
  sebelumnya/putar/berikutnya, volume, dan tombol Episode di panel bawah dihapus.
- **Gerigi pengaturan pindah ke kanan atas** (menu membuka ke bawah) — subtitle, resolusi,
  kecepatan, unduh, layar penuh tetap bisa dipakai.
- **Klik/ketuk 2x ala YouTube**: separuh kanan = maju 10 detik (tanda "+10 detik" di kanan),
  separuh kiri = mundur 10 detik (tanda "-10 detik" di kiri). Tidak bisa lewat awal/akhir video. Dulu klik 2x = like; like sekarang hanya
  lewat tombol hati di rail kanan (keputusan user di sesi ini).

## 2. Berkas yang disentuh
- app/components/FeedPlayer.tsx — dipakai halaman `/feed/[id]` (dan `/watch/[id]/[ep]` yang redirect ke sana)
- app/components/player/PlayerControls.tsx — hanya dipakai FeedPlayer
- app/components/player/PlayerSettings.tsx — hanya dipakai FeedPlayer (menu kini membuka ke bawah)
- tests/pemutar-panggung.test.ts — penanda tombol putar disesuaikan (`aria-label` kini Putar/Jeda)

Yang hilang (sadar, bukan lupa): slider volume desktop (pakai volume perangkat), tombol
prev/next desktop (ganti episode tetap lewat geser/scroll & daftar Eps), like via klik 2x.

## 3. Butuh SQL migrasi?
Tidak.

## 4. Butuh env baru di Vercel?
Tidak.

## 5. Bukti yang sudah dijalankan
- `npx tsc --noEmit` 0 error
- `npx vitest run` 91 berkas, 1356 tes lulus
- `npx next build` sukses
- Uji lokal: `next start -p 3150` dengan video uji 3 menit (jam di layar) yang disajikan server
  kecil di luar repo (`NEXT_PUBLIC_VIDEO_BASE_URL=http://localhost:3201`, hanya untuk proses itu,
  `.env.local` tidak diubah). Halaman `/feed/<id>` terbukti memuat video uji.

## 6. Cara owner mencoba sendiri
1. Buka satu drama → putar episode mana saja → ketuk video sekali: lingkaran Jeda muncul di
   tengah, gerigi di kanan atas, bawah hanya bar + timer.
2. Ketuk 2x cepat di separuh KANAN → "+10 detik", timer maju 10 detik; ketuk 2x di separuh
   KIRI → "-10 detik", timer mundur 10 detik.
3. Ketuk lingkaran di tengah → video jeda, lingkaran berubah jadi Putar; ketuk lagi → jalan.
