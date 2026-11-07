# 2026-11-06 — Isi menu titik tiga pemutar Playly disusun ulang

## 1. Apa yang berubah + kenapa
Permintaan: isi menu titik tiga di pemutar film Playly diganti jadi Subtitle (+ gaya
subtitle), Kecepatan pemutar, Penguat suara, Pencahayaan sinematik, Kualitas video.

Susunan menu sekarang (5 baris, urut):
1. **Subtitle** → halaman berisi pilihan bahasa + **Gaya subtitle** (ukuran teks & latar teks)
2. **Kecepatan pemutar** → 0,5× · Normal · 1,25× · 1,5× · 2× (berfungsi)
3. **Penguat suara** (tidak diubah, tetap tersambung ke mesin `88d3429`)
4. **Pencahayaan sinematik** (tidak diubah)
5. **Kualitas video** (nama baris dari "Kualitas" jadi "Kualitas video")

**Volume Stabil DIKELUARKAN dari menu** (keputusan rekan 2026-11-07, sesudah diberi tahu bahwa
mesinnya baru dibangun owner 2026-11-03 di `88d3429`). Yang dihapus HANYA baris menu + state
sakelarnya di `PlaylyPlayer.tsx`; pemutar sekarang mengirim `volumeStabil: false` tetap ke
`useOlahSuara`. Mesin suaranya (`useOlahSuara.ts`, `lib/olah-suara.ts`, `tests/olah-suara.test.ts`)
SENGAJA tidak disentuh — Penguat suara memakai rantai yang sama. Owner bisa memunculkan
Volume Stabil lagi cukup dengan mengembalikan state + baris menunya.

**Tombol langsung Subtitle & Kecepatan di baris kontrol bawah DIHAPUS** (keduanya pindah ke
menu), supaya tiap pengaturan tetap punya satu jalan saja. Ini membalik keputusan owner
2026-09-28 yang dulu menaikkan keduanya jadi tombol langsung; rekan menyetujui pembalikan ini
2026-11-06. PiP & layar penuh tetap tombol langsung.

**Subtitle & gaya subtitle tampil TERKUNCI di video Playly**, dengan alasan tertulis:
Playly tidak mengirim berkas subtitle (kosong di 9 dari 9 video, dicek 2026-09-09). Tidak
dibuat tombol palsu yang diklik tapi tidak terjadi apa-apa. Komponen menunya sudah mendukung
gaya subtitle yang aktif (teruji), tinggal disambungkan bila suatu hari ada berkas subtitle.

## 2. Berkas yang disentuh
- `app/components/player/PlayerMenu.tsx` — susunan baru + halaman Subtitle, Gaya subtitle,
  Kecepatan; popup dilebarkan `w-60` → `w-72` agar label tidak terpotong
- `app/components/player/PlaylyPlayer.tsx` — tombol langsung subtitle & kecepatan dihapus
  (beserta `siklusKecepatan`), nilainya dikirim ke menu; state `volumeStabil` dihapus,
  `useOlahSuara` menerima `volumeStabil: false` tetap
- `tests/player-menu.test.ts` — penjaga lama "Kecepatan tidak boleh di menu" dibalik;
  + tes urutan 5 baris (Volume Stabil tidak boleh muncul), kecepatan, subtitle terkunci, gaya subtitle

Hanya dipakai pemutar Playly: halaman `/film` (grid Playly) dan `/tonton/[id]`. Pemutar
episode drama memakai menu lain (`PlayerSettings.tsx`) — tidak disentuh.

## 3. Butuh SQL migrasi?
Tidak.

## 4. Butuh env baru di Vercel?
Tidak.

## 5. Bukti
Dijalankan di branch ini (basis `origin/main` 1938849):
- `rm -rf .next` → `npm run build` → exit 0 (dengan `ALLOW_FILE_MODE=1` karena komputer
  rekan tidak punya kunci Supabase; tahap kompilasi sukses)
- `npx tsc --noEmit` → exit 0 (dijalankan SESUDAH build, sesuai urutan gerbang)
- `npm test` → 1972 lulus, **1 gagal**: `tests/episode-naik-ke-sidebar.test.ts` ("episode
  ditulis SEBELUM sinopsis, terkait SESUDAHNYA"). ⚠️ Tes ini **sudah gagal di `origin/main`
  murni** tanpa perubahan ini (dibuktikan dengan `git stash` lalu menjalankan tes itu:
  1 gagal, 11 lulus). Bukan akibat menu ini, tapi perlu dibereskan owner sebelum rilis
  berikutnya karena gerbang pra-rilis mensyaratkan `npm test` hijau.
- `tests/player-menu.test.ts` → semua lulus
- Dicek di layar (`next start` lokal, Chromium): menu tampil urut (foto 2026-11-06, masih 6 baris sebelum Volume Stabil dikeluarkan); memilih 1,5×
  langsung tampil "1,5×" di menu; halaman Subtitle menampilkan alasan + Gaya subtitle terkunci.
  Foto ulang 2026-11-07 (sesudah Volume Stabil dikeluarkan) TIDAK bisa diambil: API Playly
  membalas HTTP 500 sehingga pemutar tidak mendapat alamat video. Susunan 5 baris dibuktikan
  lewat tes `tests/player-menu.test.ts` (11/11 lulus) — owner tolong cek di layar sebelum rilis.

## 6. Cara owner mencoba
1. Buka `/film` → klik salah satu film Playly sampai pemutarnya muncul.
2. Klik titik tiga di kanan bawah → harus muncul 5 baris urut seperti di bagian 1. Baris
   bawah pemutar tidak lagi punya tombol CC & speedometer.
3. Klik **Kecepatan pemutar** → pilih **1,5×** → video lebih cepat dan baris menu menampilkan
   "1,5×". Klik **Subtitle** → tertulis alasan tidak ada subtitle, **Gaya subtitle** abu-abu.
