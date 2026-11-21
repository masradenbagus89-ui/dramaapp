# Filter "hari ini siapa upload & berapa film" di panel IMDb

> 2026-11-21 · owner: "di admin/IMDB ada list film film yang ada keterangan siapa yang upload
> dari playly bisa kamu buat filternya agar ketahuan hari ini siapa saja yang upload dan berapa
> banyak film" · ⏳ **belum di-push** (perlu `npm run gerbang` + izin rilis owner)

## Laporan kondisi nyata (diverifikasi langsung ke API Playly, 2026-11-21)

| Fakta | Bukti |
|---|---|
| Playly **mengirim** tanggal upload tiap video | `createdAt` ada di **668 dari 668** video mitra, nol kosong |
| Kode kita **tidak pernah membacanya** | `PlaylyVideo` (lib/playly.ts) tak punya field tanggal; parser membuangnya |
| Bentuknya **beda antar endpoint** | `/api/videos` = epoch milidetik `1793955382874` · `/api/catalog` = ISO `"2026-11-21T05:42:19.43+00:00"` |
| Nama pengunggah sudah terbaca | `creator` — lib/playly.ts, `CREATOR_KEYS` |
| Isi katalog saat itu | ayy 281 · tbchairulm 254 · coklat 132 · cantika 1 |
| 8 hari terakhir | 18 Nov=5 · 17 Nov=20 · 16 Nov=8 · 14 Nov=9 · 13 Nov=7 · 12 Nov=39 · 11 Nov=12 · 10 Nov=12 |
| **Hari ini (21 Nov) = 0 upload** | upload terakhir 3 hari sebelumnya |

Fakta terakhir yang membentuk rancangannya: tombol "hari ini" saja akan sering
menampilkan layar kosong, dan layar kosong tanpa penjelasan terbaca seperti
fitur rusak. Karena itu ada tombol Kemarin & 7 hari, **dan** kalimat "Upload
terakhir: 18 Nov 2026" saat rentangnya nol.

## Keputusan owner (popup 2026-11-21)

1. **Rentang:** Hari ini · Kemarin · 7 hari terakhir · Semua tanggal (bukan "hari ini saja",
   bukan + kalender bebas).
2. **Video yang upload-nya putus** (berkasnya tak sampai di Playly) **tetap dihitung**, dengan
   catatan kecil "x di antaranya belum siap". Alasan owner: jumlah kerjanya jujur apa adanya.

## Yang dibangun

| Berkas | Peran |
|---|---|
| `lib/playly.ts` | `UPLOADED_KEYS` + `parseWaktuUpload()` + field `uploadedAt?: string \| null` di `PlaylyVideo`, diisi di parser |
| `lib/upload-harian.ts` (BARU) | Seluruh aturan hitung — murni, nol impor |
| `app/components/admin/DropdownSaringan.tsx` (BARU) | Satu bentuk dropdown dipakai KETIGA saringan di baris itu |
| `app/components/admin/UploadHarianPlayly.tsx` (BARU) | `KontrolUploadPlayly` (2 dropdown) + `RingkasUploadPlayly` (baris keterangan) |
| `app/components/admin/PlaylyVisibilityManager.tsx` | Memasang keduanya; saringan upload jadi **lapis paling luar**; empat tombol IMDb diringkas jadi dropdown; tanggal upload ikut di baris tiap video |
| `tests/upload-harian.test.ts` (BARU) | 60 tes, termasuk tes render |
| `tests/daftar-perlu-cek.test.ts` · `tests/paginasi.test.ts` | Disesuaikan ke bentuk dropdown — penjagaannya TIDAK dikurangi |

## Bentuk akhir baris saringan

```
📋[Semua (500) ▾] │ [Isi manual] 📅[Hari ini (0) ▾] 👤[Semua orang (0) ▾] [🔍 Cari judul video…] 500 total
└─ keterangan tipis di bawahnya, hanya saat ada yang disaring
```

### Riwayat bentuk — EMPAT putaran dalam satu hari, jangan diputar balik

Semuanya keputusan owner setelah melihat di layar sendiri. Ditulis lengkap supaya sesi berikutnya
tidak "memperbaiki" kembali ke bentuk yang sudah ditolak:

1. **Kotak tersendiri** berisi tombol rentang + tombol nama → ditolak: *"letakan sejejer dengan isi
   manual agar layar tidak penuh"*. Kotak itu mendorong tabel makin jauh ke bawah.
2. **Dua dropdown di baris saringan** → kotak cari turun sendirian ke baris berikutnya. Sebabnya:
   barisnya `flex-wrap`, tiap anak membungkus sendiri-sendiri. Owner: *"jadikan satu agar searchnya
   bisa sejajar"* → ketiganya dibungkus satu wadah.
3. **SATU dropdown kombinasi** (waktu × nama, `<optgroup>` per orang) → ditolak dua sebab sekaligus:
   teksnya menimpa kotak cari, dan *"ketika di klik terlalu panjang"* (5 nama × 4 rentang = 20 baris).
4. **BENTUK AKHIR** — owner memilih dari tiga opsi bergambar: empat tombol IMDb (Semua / Sudah ada
   IMDb / Belum ada IMDb / Perlu dicek) diringkas jadi **satu dropdown**, dan saringan upload kembali
   jadi **dua dropdown pendek**.

🪤 **ANGKA YANG MENENTUKAN, dan inilah yang hilang di tiga putaran pertama:** isi baris itu butuh
**±990px** sedangkan panelnya **±750px**. Selama selisih itu tidak ditutup, bentuk apa pun akan
terpotong — memindah-mindahkan kontrol tidak pernah bisa menyelesaikannya. Empat tombol memakan
±470px; satu dropdown ±130px. **Penghematan 350px itulah yang membuat semuanya muat**, bukan
penggabungan dropdown upload (yang justru merusak kecepatan pakainya).
⭐ **ATURAN: untuk keluhan "layar penuh / tidak muat", UKUR dulu lebar yang dibutuhkan vs yang
tersedia, baru pilih apa yang dipangkas.** Tanpa angka itu, tiap putaran cuma memindahkan masalah.

## Keputusan rancangan yang mudah salah kalau diubah nanti

- 🪤 **`uploadedAt` SENGAJA opsional, bukan wajib.** Objek `PlaylyVideo` lahir dari tiga tempat
  dan hanya satu yang punya tanggal: parser (punya), baris webhook, dan **salinan cadangan di
  database** (`lib/store.ts`, `playly:cadangan`) yang ditulis sebelum field ini ada. Menandainya
  wajib memaksa ketiganya menyetor nilai, dan satu-satunya yang bisa dikarang di sana adalah
  tanggal palsu. Video tanpa tanggal dihitung **terpisah** dan ditampilkan apa adanya
  ("x video tidak punya tanggal upload dari Playly").
- 🪤 **Baris webhook SENGAJA tidak diberi tanggal dari `receivedAt`.** `receivedAt` artinya
  "kapan notifikasi tiba pada kita", bukan "kapan videonya diunggah" — penolakan yang sama sudah
  tertulis di `lib/playly-gabungan.ts` saat memutuskan urutan daftar. Menyamakannya akan
  melaporkan orang mengunggah di hari yang tak pernah terjadi.
- 🪤 **Zona waktu DIPAKU ke `Asia/Jakarta`, bukan zona mesin.** Panelnya dirender di server
  (Railway = UTC) dan di browser owner (WIB). Dengan zona mesin, upload pukul 06.00 WIB terbaca
  "sehari sebelumnya" di sisi server — angka yang sama tampil berbeda sebelum & sesudah halaman
  hidup, plus hydration mismatch.
- 🪤 **"7 hari terakhir" mundur 6 hari, bukan 7** — hari ini ikut dihitung sebagai satu hari.
  Mundur 7 memberi delapan hari dan angkanya tak pernah cocok dengan hitungan manual.
- 🪤 **Epoch detik vs milidetik dipisah lewat ambang `Date.UTC(2020,0,1)`.** Nilai dalam detik
  yang dibaca sebagai milidetik jatuh di Januari 1970 — video baru masuk kelompok "lebih dari
  7 hari lalu", tanpa satu pun error.
- **Saringan upload = lapis PALING LUAR**, di atas pemisahan "belum siap" dan saringan IMDb.
  Begitu owner memilih "Upload hari ini", semua angka di bawahnya menjawab pertanyaan yang sama.
  Kalau dipasang di lapis dalam, tombol IMDb memajang angka seluruh katalog sementara tabelnya
  cuma berisi hari ini — dua angka sama-sama benar di layar yang sama, tak ada yang memberi tahu
  mana yang sedang dibaca.
- Rentang bawaan **"Semua tanggal"** — panel yang baru dibuka harus berperilaku persis seperti
  sebelum fitur ini ada.

## Bukti (dijalankan, bukan dibaca)

- `npx vitest run tests/upload-harian.test.ts` → **60 lulus, exit 0**
- `npm test` → **2730 lulus / 12 gagal**. **Ke-12 kegagalan itu SUDAH ADA sebelum perubahan ini**,
  dibuktikan dengan menjalankan tes yang sama di worktree `HEAD` (ed8be85): **6 tes gagal identik**
  di lima berkas tracked, 6 sisanya dari empat berkas tes yang **belum dikenal git** (pekerjaan
  sesi lain: `admin-csrf-gate`, `cookie-cacat`, `segel-gcm`, `dashboard-host-bawaan`).
  🪤 Satu putaran sempat 13 gagal — `tests/paginasi.test.ts` mencari teks `setSaring(pilihan)`
  yang nama argumennya berubah saat tombol jadi dropdown, jadi `indexOf` memulangkan -1 dan
  tesnya merah karena ALASAN YANG SALAH. Polanya dilonggarkan jadi `setSaring(`; yang dijaga
  (setSaring wajib diikuti `setHalaman(HALAMAN_PERTAMA)`) tidak dikurangi.
- `npm run build` → **`✓ Compiled successfully`**, lalu **`Failed to type check`** — ketiga error
  typecheck-nya milik dua berkas tes sesi lain di atas. Dibuktikan terpisah dengan `tsc -p` memakai
  tsconfig yang mengecualikan HANYA dua berkas itu → **exit 0, nol error**.
  ⚠️ **GERBANG PRA-RILIS AKAN GAGAL** sampai kedua berkas itu diselesaikan/dihapus — memblokir
  rilis apa pun, bukan cuma fitur ini.
- **Uji-balik** (jumlah berkas & jumlah tes TETAP, sesuai pelajaran 2026-11-14 ke-5):
  mundur 7 hari alih-alih 6 → **3 tes merah**; zona `Asia/Jakarta` → `UTC` → **2 tes merah**.
  Dikembalikan, hijau lagi.
- Preview nyata di `localhost:3100` dari folder kerja → halaman admin **HTTP 200**.

🪤 **PELAJARAN ONGKOS: JANGAN membuat salinan folder proyek untuk build/preview.** Untuk menghindari
bentrok dengan `next dev` yang sedang hidup, sesi ini membuat **tiga** worktree yang masing-masing
di-`npm ci` (±1 GB). Drive C penuh **sampai 0 byte**, dan begitu penuh SEMUA berhenti: perintah tak
bisa dijalankan, berkas tak bisa ditulis, bahkan perintah pembersihnya sendiri tak bisa jalan —
dan server preview owner ikut menggantung (`ENOSPC` berulang di lognya, terbaca di layar sebagai
"loading terus"). Pemulihannya butuh owner mengklik skrip `.bat` karena AI-nya terkunci total.
⭐ **ATURAN: matikan dev server lebih dulu lalu build DI FOLDER KERJA.** Junction `node_modules`
bukan jalan pintas — Turbopack menolak berkas di luar workspace root.

## Batas yang jujur

- Angka dihitung dari daftar yang **sampai di panel**. Kalau Playly sedang bermasalah dan panel
  jatuh ke salinan cadangan, video di salinan itu tidak punya tanggal → masuk kelompok "tanpa
  tanggal", bukan dikarang.
- Panel menghitung video **milik akun mitra kita**, bukan seluruh Playly.
