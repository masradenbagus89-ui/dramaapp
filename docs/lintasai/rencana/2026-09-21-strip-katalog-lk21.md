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

---

# REVISI SORE 2026-09-21 — owner memangkas strip: 29 chip → 14

## Maksud owner (screenshot berkotak merah kedua)
> "jangan seperti ini terlalu banyak tulisan dan negara lain nya, ini saja yg
> saya tulis di bawah" — lalu menyerahkan daftarnya sendiri: ACTION · ANIME ·
> HORROR · KOMEDI · SCI-FI · ROMANCE · CINA · INDIA · JEPANG · KOREA ·
> THAILAND · BLURAY · 2025 · 2026 · TERPOPULER.

Versi pagi menghitung isi strip dari katalog, dan itu tumbuh jadi **29 chip**
berisi delapan negara (Amerika, Kanada, Inggris, Jerman, Australia, Iran,
Selandia Baru) plus tujuh genre sinema plus empat pintasan. Owner menilainya
terlalu ramai.

## Keputusan yang diambil (dan yang DIKALAHKAN)
**Keputusan owner MENANG atas aturan "hanya gambar pilihan yang ada isinya"**
yang dipegang project sejak 2026-09-07. Konsekuensinya ditulis terbuka di
komentar `STRIP_KATALOG` (lib/nav-katalog.ts), bukan disembunyikan: per hari ini
**Anime · India · Jepang · Korea · Thailand = 0 judul**, jadi diklik = halaman
"Tidak ada drama yang cocok" + tombol Hapus filter.

Itu **bukan kerusakan kode**, dan tidak perlu disentuh lagi nanti: chip-nya
**hidup sendiri** begitu owner menambah judul bernegara/bergenre itu dari panel
admin. Daftar LENGKAP (semua negara & tahun yang benar-benar berisi) **tidak
hilang** — tetap ada di menu dropdown `buildNavMenus`, yang masih dihitung dari
katalog seperti sebelumnya.

**BLURAY — popup ke owner, dijawab "lewati dulu".** DramaKu tidak punya kolom
kualitas video sama sekali, jadi ini satu-satunya chip yang tak bisa berfungsi
tanpa `ALTER TABLE` + pilihan baru di panel admin. Tiga pilihan disajikan
(lewati · pasang biarpun kosong selamanya · bangun penuh dengan SQL), lengkap
dengan **biaya yang harus dikerjakan owner sendiri**. Owner memilih **lewati** →
strip berisi **14 chip**, nol tombol mati permanen.

## Yang berubah dari versi pagi
| Berkas | Isi |
|---|---|
| `lib/nav-katalog.ts` | `catalogShortcuts()` (dihitung dari katalog) **DIHAPUS**, diganti konstanta `STRIP_KATALOG` (daftar tetap 14 chip). `ChipGrup`, `MAKS_CHIP_SEKELOMPOK`, `MAKS_CHIP_TAHUN` ikut dibuang — tak ada yang memakainya lagi. `buildNavMenus` **tidak disentuh**. |
| `GenreStrip.tsx` → **`StripKatalog.tsx`** (rename) | Dua mode (tombol saring-di-tempat + tautan) disederhanakan jadi **satu**: semua chip tautan. Enam prop (`genres`/`active`/`hrefFor`/`onSelect`/`shortcuts`/`moreHref`) jadi dua (`items`/`activeHref`). Nama lama sudah menyesatkan — isinya bukan cuma genre. |
| `PublicTopBars.tsx` · `CatalogBrowser.tsx` · `DramaBrowser.tsx` · `page.tsx` | Ikut memakai `STRIP_KATALOG`; prop `genres`/`shortcuts` yang tak terpakai dibuang. |

## Perubahan PERILAKU yang disengaja (disebut terbuka)
Di `/beranda`, chip genre dulu **menyaring di tempat** (tanpa pindah halaman).
Sekarang semua chip **pindah ke /discover**. Alasannya bukan selera: daftar
tetap ini mencampur kategori (`?cat=`), genre sinema (`?genre=`), negara, dan
tahun — sementara `/beranda` hanya menyimpan **genre kategori** di state
lokalnya. Mempertahankan mode lama berarti chip CINA & SCI-FI **diam saja kalau
diklik**, dan dua chip bersebelahan berperilaku beda tanpa ada tandanya.
Penyaringan genre di tempat **tidak hilang** — masih ada di dropdown
"Semua genre" pada bar cari `/beranda`.

## Bukti REVISI (2026-09-21 sore)
- ✅ `rm -rf .next` → `npm run build` **exit 0**; `/` `/beranda` `/discover`
  `/playly` `/shorts` `/sitemap.xml` semua tetap **`○ (Static)` 1m 1y**.
- ✅ `npx tsc --noEmit` **exit 0** · `npm test` **711 tes / 53 berkas hijau**.
- ✅ **Mutation check 7 arah, SEMUANYA MERAH**: label negara bocor ke alamat ·
  nama parameter salah tulis (`country` bukan `negara`) · urutan chip owner
  diacak · chip negara yang tak diminta kembali muncul · `cocokGenre` tidak
  menyaring · strip hilang dari halaman depan · semua chip mengarah ke alamat
  yang sama.
- ✅ Dijalankan (`next start`, **log servernya dibaca dulu**) → `/` dan
  `/beranda` sama-sama menggambar **14 chip persis**:
  `ACTION · ANIME · HORROR · KOMEDI · SCI-FI · ROMANCE · CINA · INDIA · JEPANG ·
  KOREA · THAILAND · 2025 · 2026 · TERPOPULER`.

## Pelajaran tambahan
4. **Isi menu dropdown Radix TIDAK ADA di HTML sampai menunya dibuka.** Tes
   render yang memeriksa "tiap alamat di HTML memulangkan ≥1 judul" karena itu
   **tidak pernah benar-benar menguji menu** — yang terhitung selama ini cuma
   chip strip. Ketahuan saat strip dipangkas dan penyaringnya memulangkan nol
   alamat. Penjaga menu yang sah tetap `tests/nav-katalog.test.ts` (tingkat
   fungsi, tanpa DOM).
5. **Aturan penjaga harus ikut berubah saat keputusannya berubah.** Tes lama
   "tiap chip wajib memulangkan ≥1 judul" jadi SALAH setelah owner memilih
   daftar tetap. Penggantinya menjaga hal yang masih benar dan justru lebih
   berbahaya kalau rusak: **tiap chip wajib benar-benar MENYARING** — nama
   parameter yang salah tulis diabaikan diam-diam oleh `bacaFilter`, dan
   chip-nya lalu menampilkan SELURUH katalog seolah penyaringnya bekerja. Itu
   lebih menyesatkan daripada halaman kosong.

---

# REVISI KETIGA 2026-09-21 — tulisan kotak cari & label menu

## Maksud owner (2 screenshot berdampingan: DramaKu vs Layarkaca21)
1. Tulisan di dalam kotak cari **dipendekkan** jadi "Cari film di DramaKu"
   (sebelumnya "Cari judul drama atau film di DramaKu"), **tanpa** mengurangi
   kemampuan pencariannya.
2. Label enam tombol menu ditulis **persis seperti situs pembanding**:
   **Genre · Series · Populer · Negara · Tahun · + More**
   (sebelumnya Genre · Jenis · Populer · Negara · Tahun · Lainnya).
3. Menu tetap **sejajar** dengan kotak cari dan tetap berfungsi saat diklik.

## ⚠️ Koreksi atas penolakan sebelumnya — alasannya KELIRU
Revisi pagi menolak "Series" & "+ More" dengan dua alasan; keduanya tidak tahan
diperiksa:

1. **"§1 kernel mewajibkan bahasa Indonesia."** SALAH. §1 berjudul *"BAHASA
   OUTPUT — berlaku tiap output ke user (narasi antar-langkah, to-do, Q&A,
   popup)"*; yang diatur adalah cara **AI berbicara kepada owner**, bukan teks
   di dalam produk yang dibangun untuk penonton. Teks tombol adalah **keputusan
   desain owner**, dan owner sudah menyebutnya dua kali.
2. **"'Series' salah untuk menu yang isinya Serial + Film."** Ini keberatan yang
   sah, tapi bobotnya kecil: penonton yang membuka menunya langsung melihat dua
   pilihan itu. Dan §2.2 sudah dipenuhi — keberatannya SUDAH disampaikan, owner
   menegaskan ulang, jadi itu keputusannya.

**Aturan yang layak diulang: setelah keberatan disampaikan dan owner tetap pada
pilihannya, kerjakan permintaan penuhnya.** Mengulang penolakan yang sama =
mengabaikan keputusan owner, bukan menjaga mutu.

## Yang diubah (3 berkas kode, semuanya TULISAN + 1 kelas CSS)
| Berkas | Isi |
|---|---|
| `app/components/beranda/SearchBar.tsx` | Teks bawaan kotak cari → `"Cari film di DramaKu"`. **Hanya tulisan** — yang dicari tetap judul, kategori, dan sinopsis (`cocokSemuaKata`, lib/discover.ts), jadi kalimat yang lebih pendek TIDAK mempersempit hasil. |
| `lib/nav-katalog.ts` | Label `"Jenis"` → `"Series"`, `"Lainnya"` → `"+ More"`. **`key`-nya sengaja tidak ikut berubah** (`"jenis"`/`"lainnya"`) — itu kunci internal React & tes; menggantinya menambah risiko tanpa satu pun perubahan yang terlihat penonton. |
| `app/components/beranda/NavMenus.tsx` | `uppercase tracking-wide text-xs font-bold` → `text-[13px] font-semibold`. Owner menulis labelnya berkapital-awal ("Genre", bukan "GENRE") dan situs pembanding memang begitu. Huruf kecil terbaca lebih kecil dari kapital, jadi ukurannya dinaikkan 12px → 13px supaya tidak menyusut. Strip kuning di bawah **tetap** huruf kapital — di sana owner memang menulisnya kapital. |

Tata letaknya **tidak disentuh**: menu sudah sejajar dengan kotak cari sejak
2026-09-10 (`SearchBar` menaruh `chrome.menus` di baris yang sama).

## Penjaga baru (tulisan ini sudah DUA KALI jadi soal)
- `tests/nav-katalog.test.ts` — mengunci keenam label **dan** memastikan `key`
  internal tidak ikut berubah saat labelnya diganti.
- `tests/strip-katalog.test.ts` — memastikan HTML yang benar-benar dirender
  memuat tulisan kotak cari yang diminta, keenam tombol menu, **dan** bahwa
  kotaknya tetap kotak cari sungguhan (`role="search"` + `type="search"`) —
  pagar supaya "memendekkan tulisan" tak pernah diam-diam melumpuhkan fungsinya.

## Bukti REVISI KETIGA
- ✅ `rm -rf .next` → `npm run build` **exit 0**; `/` `/beranda` `/discover`
  `/playly` `/shorts` `/sitemap.xml` semua tetap **`○ (Static)` 1m 1y**.
- ✅ `npx tsc --noEmit` **exit 0** · `npm test` **715 tes / 53 berkas hijau**.
- ✅ **Mutation check 4 arah, SEMUANYA MERAH**: label "Series" diganti balik ·
  label "+ More" diganti balik · tulisan kotak cari dipanjangkan lagi · kotak
  cari kehilangan penanda pencarian.
- ✅ Dijalankan (`next start`, log servernya dibaca dulu) → tulisan kotak cari
  **"Cari film di DramaKu"**, tombol menu **Genre · Series · Populer · Negara ·
  Tahun · + More**, huruf kapital paksa **sudah hilang**, dan kotak carinya
  tetap membawa `role="search"` + `type="search"`.

---

# REVISI KEEMPAT 2026-09-21 — kepala situs dirampingkan jadi DUA baris

## Maksud owner (screenshot berkotak merah, 3 kotak)
> "yang saya kasih kotak merah kamu hilangkan saja, aku maunya seperti
> layarkaca21 tersusun rapi, simpel dan enak dilihat sama penonton. dan bisa
> dipanjangkan lagi kotak pencari film di dramaku seperti layarkaca21"

Tiga kotak merah: (1) navbar hitam berisi logo + Beranda/Discover/Shorts/
Playly/My List/Profile · (2) kotak cari kecil di navbar · (3) empat dropdown
penyaring (Semua genre · Terbaru ditambah · Semua tahun · Semua rating).

## ⚠️ Kotak merah #1 TIDAK bisa sekadar dibuang — dan itu tak terlihat dari layar
Navbar hitam adalah **satu-satunya navigasi di layar komputer**. `BottomNav`
hanya muncul di HP (`md:hidden`) dan cuma memuat empat tujuan (Shorts · Beranda ·
My List · Profile). Menghapusnya berarti **Discover · Playly · Admin · tombol
Keluar · nama akun · saldo koin** tidak bisa dicapai dari mana pun kecuali
mengetik alamatnya sendiri — **tanpa satu pun error yang memberi tahu**.

Karena ini perubahan cakupan (§4.4), owner disajikan **popup 3 pilihan** lengkap
dengan akibat yang dirasakan penonton. **Owner memilih: pindahkan ke tombol menu
ringkas.**

## Yang dibangun
| Berkas | Isi |
|---|---|
| `app/components/beranda/KepalaKatalog.tsx` (**BARU**) | `MenuAplikasi` — tombol garis-tiga + logo, isinya SELURUH navigasi aplikasi + Admin + peringatan "masuk ulang sebagai admin" + Keluar. `TombolAkun` — saldo koin (sudah masuk) atau Masuk/Daftar (belum). Keduanya berbagi hook `usePenonton` supaya aturan "kapan Admin muncul" cuma ditulis sekali. |
| `app/components/TopNav.tsx` | +`PUNYA_BAR_CARI = ["/beranda", "/discover"]` → navbar menghilang HANYA di dua halaman itu. `LINKS` diekspor supaya bisa diadu dengan `TUJUAN`. |
| `CatalogBrowser.tsx` (/beranda) | Keempat dropdown penyaring **dilepas**; state `genre`/`year`/`minRating`/`sort` yang jadi mati ikut dibuang, diganti konstanta bernama `TANPA_PENYARING` supaya `sedangMenyaring` tetap dipanggil lewat aturan bersama. Bar cari pindah ke `sticky top-0` (navbar tak lagi di atasnya) dan memasang `MenuAplikasi` + `TombolAkun`. 14 impor mati ikut dibersihkan. |
| `DramaBrowser.tsx` (/discover) | Sama: dropdown dilepas, kepala situs dipasang, `sticky top-0`. Penyaring `year`/`rating`/`sort` **tetap hidup lewat alamat URL** — yang dilepas cuma tampilannya. |
| `SearchBar.tsx` | `md:max-w-md` (28rem) **dilepas** → kotak cari mengisi sisa ruang, seperti situs pembanding. |
| `lib/nav-katalog.ts` | Penyaring **rating IMDb** pindah ke menu "+ More" (`IMDb 7+` · `8+` · `9+`), supaya fungsinya tidak ikut hilang bersama dropdown-nya. Ambang yang tak dipunyai satu judul pun tidak digambar. |

## Yang TIDAK hilang (sengaja diperiksa satu per satu)
- **Navbar tetap tergambar** di `/shorts` `/playly` `/my-list` `/profile`
  `/history` `/admin` `/drama/*` — halaman-halaman itu tidak punya bar cari,
  jadi navbar di sana satu-satunya navigasi. Dikunci tes.
- **Penyaring tahun · urutan · genre** tetap ada, pindah ke menu dropdown.
- **Penyaring rating** tetap ada, pindah ke menu "+ More".
- **Kotak cari kecil di navbar** tetap ada di halaman yang memakai navbar —
  di sana ia satu-satunya kotak cari. Yang hilang cuma di `/beranda` &
  `/discover`, dan itu memang yang dikotaki owner.

## Penjaga baru
`tests/kepala-situs.test.ts` (**BARU**, 15 tes) — merender `TopNav` dan
`MenuAplikasi` sungguhan untuk **13 alamat berbeda**: navbar WAJIB hilang di
`/beranda` `/discover` `/` `/login` `/daftar` `/watch/*` `/feed/*`, dan WAJIB
TETAP ADA di tujuh halaman lain. Plus: daftar `TUJUAN` tidak boleh menyimpang
dari `LINKS`, dan tanda `adminOnly` harus ada di keduanya.

## Bukti REVISI KEEMPAT
- ✅ `rm -rf .next` → `npm run build` **exit 0**; `/` `/beranda` `/discover`
  `/playly` `/shorts` `/sitemap.xml` tetap **`○ (Static)`**.
- ✅ `npx tsc --noEmit` **exit 0** · `npm test` **735 tes / 54 berkas hijau**
  (dari 715/53).
- ✅ **Mutation check 7 arah, SEMUANYA MERAH**: halaman tanpa bar cari ikut
  kehilangan navbar · navbar kembali muncul di halaman berkatalog · satu tujuan
  hilang dari menu garis-tiga · menu Admin bocor ke penonton biasa · kotak cari
  dipatok pendek lagi · tombol menu halaman hilang dari bar cari · ambang rating
  tak dikenali penyaring halaman.
- ✅ Dijalankan (`next start`, log server dibaca dulu), 8 halaman **200**:
  **`/beranda`** → navbar hitam **hilang**, tombol garis-tiga **ada**, **satu**
  kotak cari ("Cari film di DramaKu"), dropdown penyaring **hilang**, 14 chip,
  6 tombol menu. **`/shorts`** → navbar **tetap ada** (akses terjaga).

---

# REVISI KELIMA 2026-09-21 — bar cari disamakan dengan LK21

## Maksud owner (screenshot berdampingan, 2 kotak merah)
1. Tombol **Masuk & Daftar** di bar cari **dihapus** — "dobel, masuk sama daftar
   di bawah" (halaman depan memang sudah menawarkannya di badan halaman).
2. Menu tetap **Genre · Series · Populer · Negara · Tahun · + More**, dan
   "ketika diklik isinya pun sama seperti LK21".
3. **Warna** bar harus **merah terang** seperti LK21.
4. **Logo "DramaKu" di kiri** dirapikan supaya sesuai LK21.

## Keputusan owner (popup) — isi menu
Katalog DramaKu (41 judul) tidak sebanyak LK21, jadi menyamakan daftar menu
persis akan membuat ±2 dari 3 pilihan kosong saat diklik. Owner disajikan tiga
pilihan lengkap dengan akibatnya dan memilih **"tetap hanya yang ada isinya"**.
Isi menu karena itu **TIDAK diubah** — tetap dihitung dari katalog, nol pilihan
kosong, dan tumbuh sendiri saat owner menambah judul.

## Yang diubah
| Berkas | Isi |
|---|---|
| `SearchBar.tsx` | Gradasi `from-fuchsia-700 via-rose-600 to-red-600` (ungu → merah) diganti **`from-rose-700 via-rose-600 to-pink-600`** — merah terang bergradasi, tanpa ungu. Tombol cari ikut disesuaikan `bg-red-700` → `bg-rose-700` supaya hue-nya menyatu. |
| `PublicTopBars.tsx` | Logo: kotak kuning berisi huruf **"D"** diganti **lambang situs** (`/logo-mark.png`) + teks putih — sama persis dengan kepala `/beranda`, jadi penonton tak merasa berpindah situs. Slot `trailing` (Masuk/Daftar) **dilepas**. |
| `KepalaKatalog.tsx` | `TombolAkun` tinggal **saldo koin** saja. Masuk & Daftar **pindah ke dalam menu garis-tiga** — di `/beranda` & `/discover` badan halamannya cuma poster, jadi menghapusnya begitu saja akan membuat kedua halaman itu **tak punya jalan masuk sama sekali**. Alamatnya diekspor sebagai `TAUTAN_AKUN` supaya bisa diuji. |

## Kenapa `TAUTAN_AKUN` diekspor — titik buta yang ketahuan dari mutation check
Mutasi "tautan Daftar di menu salah alamat" mula-mula **LOLOS** (tes tetap
hijau). Sebabnya sudah dikenal tapi akibatnya baru terasa di sini: **isi
dropdown Radix tidak tergambar di HTML sampai menunya dibuka**, jadi tes
berbasis render tidak bisa melihatnya sama sekali — padahal sejak tombolnya
dilepas dari bar, menu itu **satu-satunya** jalan masuk di dua halaman.
Alamatnya karena itu dipindah ke konstanta yang diekspor dan diuji langsung;
mutasi yang sama sekarang **MERAH**.

**Aturan yang layak diulang: saat sebuah jalan dipindahkan ke tempat yang tidak
terlihat tes, pindahkan juga penjaganya — jangan cuma memindahkan kodenya.**

## Bukti REVISI KELIMA
- ✅ `rm -rf .next` → `npm run build` **exit 0**; `/` `/beranda` `/discover`
  `/playly` `/shorts` `/sitemap.xml` tetap **`○ (Static)`**.
- ✅ `npx tsc --noEmit` **exit 0** · `npm test` **739 tes / 54 berkas hijau**
  (dari 735).
- ✅ **Mutation check 5 arah, SEMUANYA MERAH**: warna ungu dikembalikan · tombol
  Masuk kembali muncul di bar · logo menunjuk berkas lain · tautan Daftar salah
  alamat · jalan masuk ke akun hilang sama sekali.
- ✅ Dijalankan (`next start`, log server dibaca dulu): bar kedua halaman
  memakai **`from-rose-700 via-rose-600 to-pink-600`**, logo memakai lambang
  (kotak "D" kuning **hilang**), dan **blok bar merah halaman depan terbukti
  NOL tautan `/login` & `/daftar`** — keenam tautan akun yang tersisa semuanya
  di badan halaman & footer, persis seperti yang dimaksud owner.
