# 2026-11-11 — Rail ikon kanan pemutar drama ikut sembunyi + tombol Volume

## 1. Apa yang berubah + kenapa
Di pemutar drama (`/feed/[id]`), deretan ikon di kanan layar (poster, Suka, Komen, Simpan,
Bagikan, Unduh) dulu tampil terus, sehingga menutupi film. Sekarang deretan itu memudar
bersama kontrol lain saat video berputar (sekitar 3,5 detik setelah layar terakhir disentuh),
lalu muncul lagi saat layar diketuk. Saat video dijeda atau ada panel yang terbuka, deretan itu
tetap tampil. Saat memudar, ikon juga tidak bisa tertekan tanpa sengaja.

Ditambah tombol **Volume** di deretan itu. Ketuk ikon speaker untuk membuka garis pengatur di
sebelah kiri ikon, yang berisi tombol bisu dan geseran 0–100%. Volume yang dipilih tetap
berlaku saat penonton geser ke episode berikutnya.
Batasan: Safari di iPhone tidak mengizinkan situs mengatur besar-kecil suara (hanya tombol
fisik HP). Di sana yang berfungsi cuma bisu/tidak (geser ke 0 = bisu).

## 2. Berkas yang disentuh
- app/components/ActionRail.tsx: prop opsional baru `visible` dan `sound`. Nilai default-nya
  membuat tampilan pemanggil lama tidak berubah.
- app/components/player/VolumeControl.tsx: komponen baru
- app/components/FeedPlayer.tsx: state volume, diterapkan ke semua `<video>`, dan
  meneruskan `controlsVisible` ke rail
- tests/action-rail-tampil.test.ts: 3 tes baru
- tests/unduhan-pemasangan.test.ts: penanda pencarian div rail disesuaikan ke className
  baru. Yang dijaga tetap sama: modal berada di luar div rail.
ActionRail hanya dipakai oleh FeedPlayer (halaman /feed/[id]).

## 3. Butuh SQL migrasi?
Tidak.

## 4. Butuh env baru di Vercel?
Tidak.

## 5. Bukti
rm -rf .next && npm run build -> sukses
npx tsc --noEmit -> 0 error (exit 0)
npm test -> 93 berkas, 1372 tes lulus

## 6. Cara owner mencoba
1. Buka satu drama, lalu tekan Tonton sampai masuk pemutar /feed/<id>, dan putar videonya.
2. Diamkan sekitar 4 detik: ikon di kanan (Suka/Komen/Simpan/Bagikan/Volume) harus memudar
   bersama tombol lain. Ketuk layar sekali: ikon harus muncul lagi.
3. Ketuk ikon speaker, lalu geser garisnya: suara harus mengecil/membesar. Geser ke 0: ikon
   berubah jadi speaker dicoret dengan tulisan "Bisu".
