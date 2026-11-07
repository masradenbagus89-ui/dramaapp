# 2026-11-07 — Pemutar episode drama: Play di tengah, bawah hanya timer, klik 2x maju/mundur 10 detik

Branch: `feat/pemutar-play-tengah` (dibuat dari `origin/main` 9d3aef2 — tidak tertinggal).

## 1. Apa yang berubah + kenapa
Permintaan: tampilan nonton drama per episode (`/feed/<id>`) dibuat lebih bersih.
- **Tombol Putar/Jeda bulat di TENGAH persis video** (64px). Dulu lingkaran Putar sengaja di 58%
  tinggi karena panel bawah tinggi; panel bawah sekarang jauh lebih pendek, jadi tengah tidak
  menimpa judul. Saat video berjalan, tombol Jeda di tengah muncul bersama kontrol.
- **Panel bawah hanya judul + Eps x/y + subtitle + garis geser + timer `0:12 / 1:30`.** Tombol
  sebelumnya/putar/berikutnya, volume, tombol Episode, dan gerigi di panel bawah dihapus.
- **Gerigi pengaturan pindah ke kanan atas** (menu membuka ke bawah) — subtitle, resolusi,
  kecepatan, unduh, layar penuh tetap bisa dipakai. Ikut memudar bersama kontrol.
- **Klik/ketuk 2x ala YouTube**: separuh kanan = maju 10 detik (tanda "+10 detik" di kanan),
  separuh kiri = mundur 10 detik (tanda "-10 detik" di kiri). Tidak bisa lewat awal/akhir video
  (memakai `posisiSesudahLoncat` yang sudah dites di PlaylyPlayer). Dulu klik 2x = like; like
  sekarang hanya lewat tombol hati di rail kanan (keputusan user di sesi ini).

**Keputusan owner di main yang SENGAJA dipertahankan** (panel bawah dirakit ulang di atas versi
main, bukan ditimpa): judul memudar demi hardsub, tombol Eps ikut mati saat tak terlihat, posisi &
`inline-block` subtitle, timer di samping garis geser dengan `seekBarRef` tetap di garis gesernya,
jarak `pb-6` / `mb-2 sm:mb-3`. Juga alamat video lewat `/api/video-url` (perbaikan keamanan) dan
saklar `PAYWALL_ENABLED` — tidak tersentuh.

Yang hilang (sadar, bukan lupa): slider volume desktop (pakai volume perangkat), tombol
prev/next desktop (ganti episode tetap lewat geser/scroll & daftar Eps), like via klik 2x.

## 2. Berkas yang disentuh
- app/components/FeedPlayer.tsx — dipakai halaman `/feed/[id]` (dan `/watch/[id]/[ep]` yang redirect ke sana)
- app/components/player/PlayerControls.tsx — hanya dipakai FeedPlayer
- app/components/player/PlayerSettings.tsx — hanya dipakai FeedPlayer (menu kini membuka ke bawah)
- tests/pemutar-panggung.test.ts — penanda tombol putar disesuaikan (`aria-label` kini Putar/Jeda)
- tests/posisi-teks-pemutar.test.ts — penjaga "tombol play >= 40px" IKUT PINDAH ke tombol tengah
  di FeedPlayer (maksud & batasnya sama; ditambah: panel bawah tak boleh punya tombol play kedua).
  Penjaga lain di berkas itu tidak diubah dan hijau.

## 3. Butuh SQL migrasi?
Tidak.

## 4. Butuh env baru di Vercel?
Tidak.

## 5. Bukti yang sudah dijalankan (di worktree bersih dari `origin/main` + perubahan ini)
- `npx tsc --noEmit` 0 error
- `npx vitest run`: 2104 lulus, 1 gagal — `tests/episode-naik-ke-sidebar.test.ts` ("judul Sinopsis
  tidak ketemu"). **Gagal juga di `origin/main` tanpa perubahan ini** (dicek dengan `git stash`);
  kemungkinan akibat `core.autocrlf=true` di komputer rekan. Tidak berhubungan dengan pemutar.
- `next build`: kompilasi sukses, tetapi pengumpulan halaman gagal di komputer rekan karena tak
  ada env Supabase; dengan `ALLOW_FILE_MODE=1` gagal di prerender `/beranda`
  (`Cannot read properties of undefined (reading 'toLowerCase')`). **Gagal identik di `origin/main`
  bersih** — jadi bukan dari perubahan ini, tapi owner perlu build dengan env asli di gerbang
  pra-rilis.
- Demo rekaman (video uji di localhost, klik 2x kanan 8→20→32 detik, kiri 32→23,7 detik) dibuat
  SEBELUM perubahan ini dirakit ulang di atas main terbaru. Logika ketuk & tampilan tidak berubah
  saat dirakit ulang, tetapi alur alamat video di main kini lewat `/api/video-url`, jadi **cek
  ulang di preview Vercel tetap wajib**.

## 6. Cara owner mencoba sendiri
1. Buka satu drama → putar episode mana saja → ketuk video sekali: lingkaran Jeda muncul di
   tengah, gerigi di kanan atas, bawah hanya garis geser + timer.
2. Ketuk 2x cepat di separuh KANAN → "+10 detik", timer maju 10 detik; ketuk 2x di separuh
   KIRI → "-10 detik", timer mundur 10 detik.
3. Ketuk lingkaran di tengah → video jeda, lingkaran berubah jadi Putar; ketuk lagi → jalan.
