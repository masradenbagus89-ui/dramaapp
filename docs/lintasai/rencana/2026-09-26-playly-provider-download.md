# Pilihan provider DOWNLOAD di video Playly — 2026-09-26

Bobot: **BERAT** (fitur baru · 3 subsistem · alamat dari data tak-tepercaya masuk `href`).

## Masalah

Tombol DOWNLOAD di kotak bawah pemutar Playly (`app/components/player/InfoVideoPlayly.tsx:193`)
cuma memunculkan `alert("...belum tersedia")`. Halaman detail DRAMA sudah punya pilihan provider
(`DownloadModal`), video Playly belum.

## Keputusan struktur (✅ terverifikasi dari kode)

- ✅ Tipe `DownloadProvider` + penyaring `parseDownloadProviders` sudah ada (`lib/types.ts:102,158`)
  dan sudah memblok skema `javascript:`/`data:` (`isHttpUrl`, `lib/types.ts:135`). DIPAKAI ULANG,
  tidak bikin tipe kedua.
- ✅ Dokumen Playly memakai pola `app_data` key->jsonb (`lib/store.ts:800-802`) + cadangan mode
  lokal di `data/playly.json`. Dokumen BARU: `playly:unduhan` -> `{ videoId: DownloadProvider[] }`.
  Mengikuti pola tetangganya, bukan pola baru.
- ✅ Titik gabung tunggal kedua sumber video (katalog + webhook) = `rakitGabungan`
  (`lib/playly-gabungan.ts:172`). Provider ditempel DI SITU supaya video dari webhook ikut kebagian,
  bukan cuma katalog.
- ✅ `quality` sekarang WAJIB di penyaring (`lib/types.ts:166` membuang entri tanpa quality).
  Spesifikasi minta label "Download" saat kualitas belum diketahui -> penyaring diberi opsi
  `kualitasOpsional`, default `false` supaya perilaku jalur DRAMA tidak berubah sedikit pun.

## PRE-MORTEM

Hasil kerja ini nol guna kalau **owner tidak punya cara mengisi linknya**. Akses DDL/dashboard
database tertutup sejak 2026-09-22 (`lib/unduhan.ts:13-17`), jadi satu-satunya jalur tulis yang
hidup adalah PostgREST lewat panel admin. => Panel admin + route API MASUK lingkup, bukan menyusul.

Risiko kedua: rekan tak bisa menguji di localhost (tanpa Supabase). => mode lokal `data/playly.json`
ikut didukung, sama seperti `playly:hidden`.

## Yang TIDAK dibangun

- Upload otomatis ke provider (di luar lingkup, disebut eksplisit di permintaan).
- Link contoh di data produksi — DILARANG. Data terkirim kosong; owner yang mengisi.
- Kolom database sungguhan (`download_providers`) — butuh DDL yang aksesnya masih tertutup.

## Yang ikut tersenggol

- **Tombol DOWNLOAD halaman detail drama** (`DownloadModal`): memakai tipe & penyaring yang sama.
  Dijaga dengan default `kualitasOpsional: false` + tes lama `tests/unduhan.test.ts`,
  `tests/download-modal-render.test.ts` harus tetap hijau.
- **Kartu video Playly** di /beranda, /discover, /playly: menerima satu field opsional baru; yang
  tidak mengisinya tidak berubah.
