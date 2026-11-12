# 2026-11-12 — Volume + Layar penuh pindah ke atas timer, rail kanan dirapikan

## 1. Apa yang berubah + kenapa
Di pemutar drama (`/feed/[id]`):
- Tombol **Volume** keluar dari deretan ikon kanan. Deretan itu jadi lebih pendek sehingga
  poster drama tidak lagi mepet dengan tombol gerigi di kanan atas. Jarak antar ikon dibuat
  seragam, dan poster diberi sedikit jarak lebih sebagai "kepala" deretan.
- Di atas bar posisi/timer, rata kanan, sekarang ada dua tombol berdampingan:
  **Volume** (kiri) dan **Layar penuh** (kanan). Ketuk Volume untuk membuka garis pengatur di
  atas tombol, lengkap dengan angka persen. Layar penuh sebelumnya hanya ada di menu gerigi,
  dan di menu itu tetap ada.
- Revisi ke-2 (masukan owner hari yang sama):
  - Gerigi diturunkan sedikit (`top-3` → `top-6`).
  - Deretan ikon kanan sekarang di TENGAH tinggi video (`top-1/2 -translate-y-1/2`). Revisi
    ke-3: digantung dari atas ternyata terlalu naik. Di layar pendek (tinggi < 720px) deretan
    itu diukur dari bawah (`bottom-40`) supaya tidak menabrak tombol Volume.
  - Garis volume muncul SEJAJAR di kiri tombol speaker, satu baris dengan tombol layar
    penuh. Ikon speaker kedua di dalam garis dihapus, jadi bisu = geser ke 0.

Batasan lama tetap berlaku: Safari iPhone tidak mengizinkan situs mengatur besar-kecil suara,
dan tidak mendukung layar penuh untuk elemen selain video. Perilaku ini sama dengan tombol
layar penuh di menu gerigi.

## 2. Berkas yang disentuh
- app/components/ActionRail.tsx: prop `sound` dihapus, jarak & posisi rail dirapikan
- app/components/player/VolumeControl.tsx: gaya ringkas untuk panel bawah, garis muncul sejajar di kiri tombol
- app/components/player/PlayerControls.tsx: prop baru `sound`, `isFullscreen`, `onToggleFullscreen`
- app/components/FeedPlayer.tsx: meneruskan volume + layar penuh ke PlayerControls; gerigi `top-6`
- tests/action-rail-tampil.test.ts: tes volume dipindah ke PlayerControls (+ tes urutan tombol)
- tests/unduhan-pemasangan.test.ts: penanda className rail `bottom-32` → `right-2 top-1/2`

## 3. Butuh SQL migrasi?
Tidak.

## 4. Butuh env baru di Vercel?
Tidak.

## 5. Bukti
npx tsc --noEmit -> exit 0
npm test (vitest run) -> 93 berkas, 1373 tes lulus
Dicek di localhost lewat Chrome headless dengan layar tiruan 390x844 dan 375x667: rail dekat
gerigi, garis volume sejajar, dan tidak ada tumpukan. Video sendiri tidak jalan di localhost
(wajar, lihat docs/panduan-lokal-rekan.md). `npm run build` belum dijalankan.

## 6. Cara owner mencoba
1. Buka satu drama, tekan Tonton sampai masuk pemutar /feed/<id>.
2. Ikon kanan (poster, Suka, Komen, Simpan, Bagikan) harus berjarak rata dan tidak menempel
   ke gerigi. Tidak ada lagi ikon Volume di deretan itu.
3. Di kanan, persis di atas timer, harus ada ikon speaker dan ikon layar penuh berdampingan.
   Ketuk speaker: garis volume muncul sejajar di kirinya. Ketuk ikon layar penuh: pemutar memenuhi layar.
