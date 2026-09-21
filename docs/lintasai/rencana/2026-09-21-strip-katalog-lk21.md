# Rencana — Strip katalog & menu pencarian bergaya Layarkaca21 (lanjutan)

Tanggal: 2026-09-21 · Bobot: **BERAT** (menyentuh fungsi bersama `filterAndSortDramas`
+ `CatalogFilter` · 3 halaman · penyaring BARU `?genre=`)

## Maksud owner (2026-09-21, dua screenshot berkotak merah)
1. Baris menu di bar cari **sejajar** seperti LK21 (Genre · Series · Populer ·
   Negara · Tahun · +More) dan **berfungsi saat diklik**.
2. Strip di bawah kotak cari diisi seperti LK21: `ACTION ANIME HORROR KOMEDI
   SCI-FI ROMANCE CINA INDIA JEPANG KOREA THAILAND BLURAY 2025 2026 TERPOPULER`,
   **semua berfungsi saat diklik**.

## Laporan kondisi nyata (terverifikasi 2026-09-21)
Katalog dibaca lewat `GET https://dramaapp.vercel.app/api/dramas` → HTTP 200,
**41 judul** (bukan `data/dramas.json`, yang cuma cadangan — `AGENTS.local.md` butir 4).

- ✅ **Menu 6 dropdown SUDAH ADA dan sudah tayang.** HTML produksi `/` memuat
  `aria-label="Menu katalog"` berisi **Genre · Jenis · Populer · Negara · Tahun ·
  Lainnya** (`app/components/beranda/NavMenus.tsx` + `lib/nav-katalog.ts`).
  Jadi permintaan (1) sebagian besar sudah terpenuhi sejak 2026-09-10.
- ✅ **Strip kuning produksi baru berisi 12 chip**: `Semua · Action · Romance ·
  Tycoon · Comedy · Harem · Time Travel | Terbaru · Terpopuler · Film · Gratis |
  Jelajah`. **Belum ada** negara, tahun, maupun genre sinema.
- ❌ **BUG NYATA**: `/discover` menggambar strip dari daftar TETAP `CATEGORIES`
  (`app/components/DramaBrowser.tsx:219`), bukan dari katalog. `Fantasy` ada di
  daftar itu tapi **0 judul** di katalog → chip `Fantasy` diklik = halaman hampa.
  `/beranda` & `/` sudah benar (`availableGenres`).
- ✅ Kolom `genre` OMDb (`lib/types.ts:79`) terisi & berbeda dari `category`:
  Action 5 · Adventure 4 · Sci-Fi 4 · Drama 2 · Comedy 1 · **Horror 1** ·
  Thriller 1 · Mystery 1 · Romance 1 · Crime 1. **Belum ada penyaringnya sama
  sekali** — jadi HORROR & SCI-FI yang diminta owner memang belum bisa diklik.
- ✅ `country`: United States 6 · Canada 4 · United Kingdom 3 · Germany 2 ·
  **China 1** · Australia 1 · New Zealand 1 · Iran 1.
- ✅ `year`: 2026 (3) · 2025 (1) · 2017 · 2008 · 2006.
- ❌ **TIDAK ADA datanya sama sekali**: ANIME (0 judul) · INDIA · JEPANG · KOREA ·
  THAILAND (0 judul) · **BLURAY** (DramaKu tak punya kolom kualitas video —
  lanjutan pelajaran `2026-09-07-beranda-lk21.md`).
- ✅ `status` masih **0 terisi** → menu Tamat/Masih Tayang tetap tak digambar.

## PRE-MORTEM (wajib)
Anggap semuanya sudah jadi tapi NOL guna bagi owner. Tiga penyebab paling mungkin:

1. **Chip baru tergambar tapi diklik memulangkan halaman hampa** — karena
   `?genre=` ditambahkan ke penyusun chip tapi `/discover` tak ikut membacanya,
   atau karena label Indonesia ("Cina") ikut terkirim ke alamat padahal
   `cocokNegara` mencocokkan nilai asli OMDb ("China"). Kerusakan SENYAP.
   → **Masuk rencana**: `genre` ditambahkan ke `bacaFilter`/`tulisFilter`/
   `filterOptions`/`cocokGenre` **berpasangan** dalam satu berkas; label dan
   nilai alamat DIPISAH tegas (`NavItem.label` vs `NavItem.href`); penjaga
   "tiap pilihan wajib memulangkan ≥1 judul" di `tests/nav-katalog.test.ts`
   diperluas ke chip strip.
2. **Chip yang diminta owner tersembunyi di geseran** — strip lama
   `overflow-x-auto`; dengan ~29 chip, CINA/2025/TERPOPULER jatuh di luar layar
   dan owner menyimpulkan tak dikerjakan. → **Masuk rencana**: strip
   **membungkus** (`flex-wrap`) di layar md+ sehingga semua chip terlihat, dan
   tetap digeser di HP (kalau membungkus di HP stripnya jadi 5 baris).
3. **Owner mengira permintaan (1) diabaikan** karena menunya memang sudah ada
   sejak dulu. → **Masuk laporan**: disebut terus terang, bukan diklaim baru.

## Yang dibangun
| Berkas | Isi |
|---|---|
| `lib/negara.ts` (BARU) | Peta nama negara OMDb (Inggris) → label Indonesia. Nama tak dikenal dipakai apa adanya, **tidak** dibuang. |
| `lib/discover.ts` (ubah, ADITIF) | Penyaring BARU `genre` (kolom `genre` OMDb) + `genreDari` + `getGenreOptions`. Default `"all"` → pemanggil lama tak berubah. |
| `lib/nav-katalog.ts` (ubah) | Menu Genre memuat genre sinema OMDb yang belum terwakili kategori; menu Negara memakai label Indonesia; `catalogShortcuts` diperluas jadi chip bergrup: genre sinema · negara · tahun · urutan. |
| `app/components/beranda/GenreStrip.tsx` (ubah) | Membungkus di md+, pemisah antar-grup, warna beda untuk grup "urutan". |
| `app/components/DramaBrowser.tsx` (ubah) | Strip memakai `availableGenres` (menutup bug `Fantasy`); keterangan filter menyebut genre + nama negara Indonesia. |
| `tests/nav-katalog.test.ts` (ubah) | Kasus baru: genre sinema, label negara, chip tahun, tiap chip ≥1 judul. |
| `tests/discover-filter.test.ts` (ubah) | Kasus baru: penyaring `genre`, `genreDari`, `getGenreOptions`. |

## Yang TIDAK dibangun (sengaja — datanya memang tidak ada)
- **ANIME · INDIA · JEPANG · KOREA · THAILAND** — 0 judul di katalog. Chip-nya
  akan **muncul sendiri** begitu owner menambah judul bernegara/bergenre itu.
- **BLURAY** — DramaKu tidak menyimpan kualitas video sama sekali. Memasangnya =
  berbohong ke penonton (aturan yang sudah dipegang sejak 2026-09-07).
- Label menu **"Series"** & **"+ More"** — tetap **"Jenis"** & **"Lainnya"**:
  menu itu memilih antara *Serial* dan *Film*, jadi "Series" akan salah untuk
  isinya sendiri; dan §1.1 kernel mewajibkan bahasa Indonesia.
- Logika filter `/beranda` (state lokal) — tidak disentuh.

## Yang ikut tersenggol
- **Halaman depan `/`** — strip bertambah chip. Penjaga: `tests/nav-katalog.test.ts`.
- **Beranda `/beranda`** — strip bertambah chip (tautan ke /discover, perilaku lama).
  Penjaga: `tests/beranda-catalog.test.ts` + `tests/beranda-bentuk-halaman.test.ts`.
- **Jelajah `/discover`** — penyaring bertambah 1 (`genre`), chip `Fantasy` yang
  mati **hilang**. Penjaga: `tests/discover-filter.test.ts`.
- **Tidak tersenggol**: koin, login, pemutar video, admin, Playly, Shorts.

## Bukti yang harus dikumpulkan (§4.6)
1. `rm -rf .next` → `npm run build` exit 0 → `npx tsc --noEmit` exit 0 → `npm test` hijau.
   (⚠️ urutan build-dulu WAJIB — `AGENTS.local.md` butir 6.)
2. Keluaran build ditulis ke berkas lalu `$?` dibaca, **jangan dipipa ke `tail`**
   (pelajaran 2026-09-19: exit code yang terbaca jadi milik `tail`).
3. Dijalankan (`next start`) lalu HTML-nya dibaca: chip strip & menu tergambar.
4. Tiap chip diuji terhadap **katalog produksi nyata** → wajib ≥1 judul.
5. Langkah klik untuk owner mencoba sendiri.

## Bukti yang TERKUMPUL (2026-09-21)
- ✅ `rm -rf .next` → `npm run build` **exit 0**. Nol kemunduran status halaman:
  `/` `/beranda` `/discover` `/playly` `/shorts` `sitemap.xml` semua tetap
  `○ (Static)` 1m 1y; `/drama/[id]` tetap `●`.
- ✅ `npx tsc --noEmit` **exit 0** (dijalankan SESUDAH build — urutan
  `AGENTS.local.md` butir 6).
- ✅ `npm test` **712 tes hijau / 53 berkas** (naik dari 693/52: +19 tes,
  +`tests/strip-katalog.test.ts`).
- ✅ **Mutation check 6 arah, SEMUANYA MERAH** — jadi penjaganya benar-benar
  menangkap, bukan sekadar ikut hijau:
  | Kerusakan yang disuntikkan | Hasil |
  |---|---|
  | label negara ("Cina") bocor ke alamat URL | MERAH |
  | genre sinema tidak disaring dari duplikat kategori | MERAH |
  | `cocokGenre` tidak menyaring apa pun | MERAH |
  | batas jumlah chip tahun dilepas | MERAH |
  | alamat `?genre=` tidak dibaca halaman | MERAH |
  | chip genre kosong ("Fantasy") kembali digambar di /discover | MERAH |
- ✅ **Diuji terhadap katalog PRODUKSI nyata (41 judul, `GET /api/dramas`):
  58 tautan menu + chip, NOL yang memulangkan halaman hampa.**
- ✅ Dijalankan (`next start`) lalu HTML-nya dibaca — halaman depan `/` dan
  `/beranda` sama-sama menggambar **29 chip dalam 5 kelompok**:
  `Semua · Action · Romance · Tycoon · Comedy · Harem · Time Travel |
  Adventure · Sci-Fi · Drama · Crime · Horror · Mystery · Thriller |
  Amerika · Kanada · Inggris · Jerman · Australia · Cina · Iran · Selandia Baru |
  2026 · 2025 | Terpopuler · Terbaru · Film · Gratis | Jelajah`,
  dengan **4 garis pemisah kelompok** dan kelas pembungkus
  `flex-nowrap overflow-x-auto md:flex-wrap md:overflow-x-visible`.
  Menu bar tetap **Genre · Jenis · Populer · Negara · Tahun · Lainnya**.

## Pelajaran sesi ini
1. **`next start` yang GAGAL tetap membalas HTTP 200 — dari server lain.**
   Percobaan pertama memakai port 3077 yang ternyata sudah dipakai proses lain;
   `next start` mati dengan `EADDRINUSE` di log, tapi `curl` tetap balas 200 +
   HTML utuh, dan HTML itu berisi **kode LAMA** (kelas `overflow-x-auto` tanpa
   `md:flex-wrap`). Nyaris jadi kesimpulan "perubahan tidak masuk". **Aturan:
   sesudah menjalankan server uji, baca dulu log server-nya — HTTP 200 tidak
   membuktikan permintaanmu sampai ke server yang baru kamu jalankan.**
2. **`/discover` TIDAK merender apa pun di server** — `app/discover/page.tsx`
   membungkus `DramaBrowser` dalam `<Suspense>` (karena `useSearchParams`),
   sehingga HTML servernya cuma berisi "Memuat...". Memeriksa chip halaman itu
   lewat `curl` selalu memulangkan "tidak ada" dan itu BUKAN bug. Penjaganya
   harus merender komponennya langsung — itulah yang dilakukan
   `tests/strip-katalog.test.ts` (mock `next/navigation`).
3. **Daftar tetap menyelinap masuk lagi.** Aturan "jangan gambar pilihan kosong"
   sudah dipegang sejak 2026-09-07, tapi `/discover` diam-diam tetap memakai
   `CATEGORIES` selama 11 hari sehingga chip `Fantasy` (0 judul) tergambar di
   halaman katalog utama. Penjaga barunya sekarang merender halaman itu sungguhan.
