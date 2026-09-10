# Rencana — Header DramaKu bergaya Layarkaca21 (menu dropdown + strip pintasan)

Tanggal: 2026-09-10 · Bobot: BERAT (fitur navigasi BARU · menyentuh 3 halaman · mengubah fungsi bersama `filterAndSortDramas`)

## Maksud owner
Screenshot pembanding: kotak merah Layarkaca21 = (1) satu baris berisi logo +
kotak cari + deretan menu dropdown (Genre/Series/Populer/Negara/Tahun/+More),
(2) baris kategori kuning yang padat. Syarat owner: **"semuanya berfungsi kalau
diklik"**. Batas: "jangan sentuh yang lain".

## Laporan kondisi nyata (terverifikasi)
- ✅ Bar cari = `app/components/beranda/SearchBar.tsx`; strip kuning =
  `app/components/beranda/GenreStrip.tsx`. Keduanya **dipakai bersama 3 halaman**:
  `app/page.tsx:69` (lewat `PublicTopBars.tsx`), `app/beranda/page.tsx` (lewat
  `CatalogBrowser.tsx:206,216`), `app/discover/page.tsx` (lewat
  `DramaBrowser.tsx:206,212`).
- ✅ **/discover MEMBACA filter dari URL** (`DramaBrowser.tsx:40-63`, ada
  `useEffect` yang menyinkronkan state tiap `searchParams` berubah).
- ✅ **/beranda TIDAK membaca URL** — `CatalogBrowser.tsx:70-75` menyimpan filter
  di `useState` murni. Tautan `?sort=populer` ke /beranda akan **diabaikan diam-diam**.
- ✅ Penyaring bersama = `filterAndSortDramas` di `lib/discover.ts:48`; mengerti
  `query · category · year · minRating · sortBy` saja. Belum mengerti jenis
  tayangan, status, koin, atau subtitle. Penjaganya `tests/discover-filter.test.ts`.
- ✅ `Drama` (lib/types.ts:36) punya field: `kind` (series/movie), `status`
  (Ongoing/Completed), `premium`, `subtitles`, `episodes`, `views`.
- ✅ Komponen dropdown sudah terpasang: `components/ui/dropdown-menu.tsx`
  (radix-ui), dipakai lewat `DropdownMenu/Trigger/Content/Item`.
- ⚠️ **KOREKSI di tengah pengerjaan.** Dugaan awal ("katalog tak punya
  year/country") ternyata SALAH. `data/dramas.json` (21 judul) memang kosong,
  tapi itu cuma cadangan lokal — katalog sungguhan ada di Supabase, **42 judul**.
  Kekeliruannya: query pertama memakai schema `public` sehingga dijawab PGRST205
  "tabel tidak ada", padahal aplikasi memakai schema **`dramaapp`**
  (`lib/supabase.ts:24`, dikirim lewat header `Accept-Profile`). **Pelajaran:
  memeriksa isi katalog WAJIB lewat schema `dramaapp` — atau lebih aman lewat
  endpoint aplikasi sendiri `GET /api/dramas`, yang sudah memetakan kolomnya.**
- ✅ Katalog NYATA (42 judul, dibaca 2026-09-10): `year` 8 terisi (2006 · 2008 ·
  2017 · 2025 · 2026) · `country` 8 terisi · `imdb_rating` 7 · `kind` movie 8 /
  serial 34 · `premium` 13 koin / 29 gratis · `subtitles` id 25 ·
  **`status` 0 terisi**.
- ✅ Kolom `country` datang dari OMDb sebagai DAFTAR GABUNGAN dipisah koma
  ("United States, Canada, United Kingdom, Germany"), bukan satu negara — harus
  dipecah dulu, kalau tidak menunya memajang baris panjang yang cuma cocok
  untuk satu judul.

## Keputusan owner (popup 2026-09-10) + penyesuaian setelah koreksi data
Popup dijawab owner: (1) ganti menu yang datanya kosong dengan yang ada,
(2) baris kuning = genre + pintasan, (3) dipasang di ketiga halaman.

Setelah koreksi data di atas, poin (1) **berubah hasilnya** — dan justru jadi
LEBIH dekat ke permintaan asli owner: karena `year` & `country` ternyata ADA,
menu **Negara & Tahun jadi DIBANGUN** (tiap pilihannya terbukti berisi).
Sebaliknya `status` yang tadinya diandalkan ternyata 0 terisi, jadi menu Status
tidak muncul. Semangat jawaban owner tetap dipatuhi: **tidak ada pilihan yang
diklik lalu kosong**. Hasil akhir 6 menu, sejajar dengan situs pembanding:
**Genre · Jenis · Populer · Negara · Tahun · Lainnya**.

## PRE-MORTEM (wajib)
Anggap semuanya sudah jadi tapi NOL guna bagi owner. Penyebab paling mungkin:
**menunya tergambar rapi tapi diklik tidak mengubah apa pun** — karena /beranda
memakai state lokal dan mengabaikan query URL, sehingga separuh tautan mati
tanpa pesan error. Persis melanggar syarat owner "semuanya berfungsi kalau diklik".

Masuk ke rencana:
- Seluruh menu & pintasan menunjuk **satu tujuan: `/discover?…`** — satu-satunya
  halaman yang terbukti membaca filter dari URL. Ini juga perilaku LK21 asli
  (klik Genre > Action = pindah halaman daftar). `CatalogBrowser` TIDAK disentuh
  logikanya, jadi tak ada risiko filter beranda ikut rusak.
- Penyebab kedua: filter baru ditambah di `lib/discover.ts` tapi `DramaBrowser`
  tidak ikut membacanya → alamat berubah, grid diam. Karena itu kedua berkas
  diubah **berpasangan**, dan tesnya menguji `filterAndSortDramas` langsung.

## Yang dibangun
| Berkas | Isi |
|---|---|
| `lib/discover.ts` (ubah, ADITIF) | +filter `kind`/`status`/`akses`/`sub`, +urutan `populer` & `episodes`. Semua default `"all"`/lama → pemanggil lama tak berubah perilakunya. |
| `lib/nav-katalog.ts` (BARU) | Fungsi MURNI penyusun isi menu & pintasan dari katalog nyata. Item yang hitungannya 0 dibuang; menu bersisa <2 item tidak digambar. |
| `tests/nav-katalog.test.ts` (BARU) | Penjaga aturan "tidak menggambar menu kosong". |
| `tests/discover-filter.test.ts` (ubah) | +kasus untuk filter & urutan baru. |
| `app/components/beranda/NavMenus.tsx` (BARU) | Deretan tombol dropdown di bar merah. |
| `app/components/beranda/SearchBar.tsx` (ubah, ADITIF) | +prop opsional `brand` & `menus`. Tanpa prop = tampilan lama persis. |
| `app/components/beranda/GenreStrip.tsx` (ubah, ADITIF) | +prop opsional `shortcuts` (pintasan ber-tautan di ujung strip). |
| `app/components/beranda/PublicTopBars.tsx` (ubah) | Merakit logo + menu + pintasan untuk halaman depan. |
| `app/components/CatalogBrowser.tsx` & `DramaBrowser.tsx` (ubah) | Ikut memasang menu + pintasan; DramaBrowser juga membaca 4 param baru. |
| `app/page.tsx` (ubah) | Baris header hitam (logo + Masuk/Daftar) DILEBUR ke bar merah — satu baris, seperti LK21. |

## Yang TIDAK dibangun (sengaja)
- Badge kualitas video HD/CAM — DramaKu tidak menyimpan datanya sama sekali
  (lanjutan pelajaran `2026-09-07-beranda-lk21.md`).
- Menu **Status** (Tamat/Masih Tayang) — kodenya ADA di `lib/nav-katalog.ts`
  tapi 0 judul punya kolom `status`, jadi ia tidak digambar. Akan muncul sendiri
  di menu "Lainnya" begitu owner mengisinya dari panel admin.
- Logo/aset milik Layarkaca21 — yang ditiru hanya POLA TATA LETAK.
- Logika filter `/beranda` (`CatalogBrowser` state lokal) — tidak disentuh.

## Yang ikut tersenggol
- **Halaman Jelajah (/discover)** — penyaringnya bertambah 4 jenis. Penjaga:
  `tests/discover-filter.test.ts` (sudah ada, ditambah kasus baru).
- **Beranda setelah login (/beranda)** — hanya kebagian tampilan menu; filter
  lamanya (state lokal) tidak diubah. Penjaga: `tests/beranda-catalog.test.ts`.
- **Halaman depan (/)** — barisan header dirapatkan jadi satu. Tombol Masuk &
  Daftar TETAP ada, pindah ke ujung kanan bar merah.
- **Tidak tersenggol**: koin, login, pemutar video, admin, Playly, Shorts.

## Bukti yang harus dikumpulkan (§4.6)
1. `npm test` hijau (termasuk tes baru).
2. `npx tsc --noEmit` bersih.
3. `npm run build` sukses.
4. Langkah klik untuk owner mencoba sendiri.

## Bukti yang TERKUMPUL (2026-09-10)
- ✅ `npm test` — **465 tes hijau, 38 berkas** (termasuk `tests/nav-katalog.test.ts`
  baru + 14 kasus baru di `tests/discover-filter.test.ts`).
- ✅ `npx tsc --noEmit` bersih.
- ✅ `npm run build` sukses (63 halaman).
- ✅ Dijalankan (`next start`) lalu HTML-nya dibaca: header ketiga halaman
  menggambar **Genre · Jenis · Populer · Negara · Tahun · Lainnya**, strip kuning
  menggambar genre + **Terbaru · Terpopuler · Film · Gratis**.
- ✅ Dijalankan terhadap **katalog nyata 42 judul**: **34 pilihan menu + 4
  pintasan, SEMUANYA memulangkan ≥1 judul** (nol yang kosong).
- ✅ 10 alamat menu (`?cat=` `?kind=` `?negara=` `?year=` `?akses=` `?sub=`
  `?sort=` `?status=`) dijawab server HTTP 200.

## JEBAKAN VERIFIKASI yang sempat menipu (jangan terulang)
1. **`.next` cache membuat build "berhasil" tapi halaman lama.** Sesudah
   mengubah `lib/nav-katalog.ts`, `npm run build` + `next start` MASIH
   menyajikan menu versi lama. Halaman statis tidak dibuat ulang. Obat:
   `rm -rf .next` sebelum build saat memverifikasi perubahan tampilan.
2. **`pkill` tidak berlaku di Windows.** Server lama tetap hidup, server baru
   gagal `listen` (EADDRINUSE errno -4091) dan yang menjawab curl adalah server
   LAMA — jadi hasil pemeriksaan terlihat "gagal" padahal kodenya sudah benar.
   Obat: `netstat -ano | grep LISTENING | grep :PORT` lalu `taskkill //PID x //F`,
   atau langsung pakai port lain DAN cek log server benar-benar "Ready".
3. **Tes yang menyalin ulang pemetaan URL tidak membuktikan apa-apa.** Versi
   pertama `tests/nav-katalog.test.ts` menulis sendiri terjemahan
   query -> filter, sehingga salah nama parameter (menu mengirim `?negara=`,
   halaman membaca nama lain) akan LOLOS hijau. Obat: pemetaannya dipindah jadi
   `bacaFilter`/`filterOptions`/`filterDariUrl` di `lib/discover.ts`, dipakai
   BERSAMA oleh `DramaBrowser` dan tes.
