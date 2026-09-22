# Rencana: lencana kartu poster gaya Layarkaca21 (rating · kualitas · tahun · durasi/EPS)

- **Tanggal:** 2026-09-22
- **Diminta client:** "Saya ingin mengubah tampilan kartu poster film di DramaKu agar mirip tampilan Layarkaca21. … Badge rating di pojok kiri atas … Badge kualitas video di pojok kanan atas … Badge tahun tayang di bagian bawah … Badge durasi film di bagian bawah … Jika memiliki episode_count: ganti menjadi jumlah episode … Tambahkan field yang diperlukan jika belum ada … Pastikan data otomatis muncul dari database Supabase DramaKu, kalau belum ada tolong kamu buatkan. … Tolong pastikan badge muncul di semua halaman: Home, Search result, Kategori, Detail drama, Rekomendasi."

## Ringkasan

Tiap poster drama/film di seluruh situs mendapat 4 label kecil yang menempel di pojok posternya:
⭐ rating (kiri-atas), kualitas video CAM/HD/WEB-DL/BluRay (kanan-atas), tahun tayang (kiri-bawah), dan
durasi `01:26` untuk film / `62 EPS` untuk serial (kanan-bawah). Labelnya digambar **satu kali** di
komponen `Poster` yang sudah dipakai SEMUA kartu, jadi Home, hasil cari, kategori, halaman detail, dan
baris rekomendasi ikut berubah sekaligus — bukan ditambal satu per satu halaman.

Satu-satunya data yang benar-benar belum ada di DramaKu adalah **kualitas video** → dibuatkan kolom baru
`quality` di tabel `dramaapp.dramas`. Empat data lainnya sudah ada, cuma namanya beda (`imdb_rating`,
`year`, `runtime`, `episodes`) — sengaja **tidak** dibuat kolom kembar supaya tidak ada dua sumber
kebenaran untuk satu hal yang sama.

## ✅ Terverifikasi (sudah dibaca di kode / database produksi)

- `Drama` sudah punya `year`, `runtime`, `imdbRating`, `episodes` — `lib/types.ts:36-85`
- `Drama` **tidak** punya field kualitas video — `lib/types.ts:36-85`; komentar yang melarang badge
  HD/CAM karangan ada di `lib/beranda-catalog.ts:36-44`
- Semua kartu poster memakai komponen yang sama: `Poster` dipakai `CatalogCard`, `ContentRow`,
  `DramaCard`, `HistoryCard`, dan halaman detail — `app/components/Poster.tsx:52`,
  `app/components/beranda/CatalogCard.tsx:46`, `app/components/ContentRow.tsx:114`,
  `app/components/DramaCard.tsx:21`, `app/components/HistoryCard.tsx:37`, `app/drama/[id]/page.tsx:135`
- Home → `FeaturedRow` → `CatalogCard` (`app/page.tsx:59` & `:113`); hasil cari + kategori →
  `DramaBrowser`/`CatalogBrowser` → `CatalogCard` (`app/components/DramaBrowser.tsx:222`,
  `app/components/beranda/CatalogBrowser.tsx:284`); rekomendasi → `PersonalRows` → `ContentRow`
  (`app/components/beranda/PersonalRows.tsx:131`)
- **Isi katalog produksi (Supabase schema `dramaapp`, 41 baris, dibaca 2026-09-22):**
  `year` terisi 7/41 · `runtime` 7/41 · `imdb_rating` 6/41 · `episodes` 41/41 · `status` **0/41** ·
  subtitle "id" 24/41 · premium 13/41. **Ketujuh yang terisi itu SEMUANYA film** (`kind = movie`);
  ke-34 serial nol tahun, nol rating, nol durasi.
- `runtime` disimpan dalam format OMDb `"165 min"`, bukan `01:26` — jadi wajib diterjemahkan
- Form admin **menyembunyikan** kolom Tahun/Runtime/Rating kalau drama belum punya metadata IMDb —
  `app/components/admin/DramaForm.tsx:614` (`{(imdbIdMeta || director || … ) && (`). Akibatnya owner
  sekarang **tidak punya cara** mengisi tahun/durasi untuk 34 serial itu.
- Pola migrasi + urutan wajibnya (SQL dulu, baru deploy) sudah tertulis —
  `supabase_migrations/add_status_to_dramas.sql:18-21`
- Pesan error "kolom belum ada" sudah pernah diterjemahkan untuk kolom `kind` —
  `app/api/admin/drama/route.ts:67-79`

## ❓ Asumsi (BELUM dikonfirmasi / belum terbukti)

- Daftar nilai kualitas yang dipakai: `CAM · HDCAM · HD · HDTV · WEB-DL · WEBRip · BluRay · 4K`.
  Owner bisa minta tambah/kurang — daftarnya ada di SATU tempat (`lib/types.ts`) + pagar CHECK di
  database, jadi mengubahnya berarti mengubah keduanya.
- Durasi ditampilkan `jam:menit` (`165 min` → `02:45`) sesuai contoh client. Film 45 menit jadi `00:45`.

## Keputusan owner (popup 2026-09-22)

1. **Kolom `quality` dibuat KOSONG** untuk 41 judul lama — badge kualitas baru muncul di judul yang
   owner isi sendiri lewat panel admin. Alasan: tidak ada label yang salah. (Pilihan "isi semua HD
   sekaligus" ditolak.)
2. **Kiri-bawah saat tahun kosong → tetap "SUB INDO"** (perilaku yang sudah berjalan di grid beranda),
   bukan dikosongkan. Menyentuh 24 dari 41 judul yang punya subtitle Indonesia.

## Yang TIDAK dibangun (sengaja, biar tak salah harap)

- **Tidak** membuat kolom kembar `rating` / `duration` / `episode_count`. Yang dipakai kolom yang sudah
  ada (`imdb_rating`, `runtime`, `episodes`). Dua kolom untuk satu arti = sumber bug lintas-sesi.
- **Tidak** mengisi tahun/rating/durasi 34 serial secara otomatis. Datanya memang belum ada di mana pun;
  mengarangnya melanggar aturan anti-halusinasi. Yang dibangun adalah **tempat mengisinya** di panel admin.
- **Tidak** memakai rating penonton DramaKu (bintang 1-5 di halaman detail) untuk badge. Skalanya beda
  dari IMDb (0-10) — `⭐ 4.5` di sebelah `⭐ 8.1` akan menipu, dan datanya tidak tersimpan di tabel
  `dramas` sehingga butuh 1 query tambahan per poster.
- **Tidak** menyentuh kartu video **Playly** (`PlaylyVideoGrid`, `DashboardVideoGrid`, `HasilPlayly`).
  Itu sumber data yang sama sekali lain — tidak punya rating/tahun/durasi/episode.
- **Tidak** menyentuh pencarian maupun data film yang sudah ada (permintaan eksplisit client).

## Yang ikut tersenggol

| Fitur/halaman lain yang memakai bagian ini | Sudah ada penjaganya? |
|---|---|
| Halaman depan `/` (baris poster + Film Unggulan) | ⚠️ belum ada tes render kartu |
| `/beranda` grid katalog + hasil cari + saring genre | ✅ `tests/beranda-catalog.test.ts`, `tests/strip-katalog.test.ts` |
| `/discover` (hasil cari & kategori) | ✅ `tests/discover-filter.test.ts` |
| Halaman detail drama `/drama/<id>` | ⚠️ belum ada tes render |
| Baris "Karena kamu suka …" & "Trending di …" (rekomendasi) | ✅ `tests/recommend.test.ts` (logikanya, bukan tampilannya) |
| `/my-list` & baris Favorit di profil (`DramaCard`) | ⚠️ belum ada tes render |
| `/history` (kartu riwayat + bar progres di dasar poster) | ✅ `tests/progress.test.ts` (hitungannya) |
| Panel admin → simpan/ubah drama | ✅ `tests/admin-drama-route.test.ts` |
| Label ONGOING/TAMAT di kartu | ✅ `tests/drama-status.test.ts` |

## Pre-mortem (1 kalimat, kernel §4.4)

*Anggap semuanya sudah dikerjakan dan hasilnya NOL guna bagi client — apa penyebab paling mungkin?*
**Badge-nya kosong di hampir semua poster**, karena 34 dari 41 judul memang tak punya tahun/rating/durasi
**dan** form admin menyembunyikan kolom pengisinya — jadi owner tak bisa memperbaikinya sendiri.
→ Karena itu Tahap 4 (kolom Tahun/Durasi/Rating/Kualitas yang **selalu** tampil di form admin) WAJIB
masuk, bukan tambahan opsional.
Penyebab kedua: **kode di-push sebelum SQL dijalankan** → PostgREST menolak kolom `quality` yang belum
ada dan SEMUA penyimpanan drama dari panel admin gagal (persis pelajaran kolom `kind` & `status`).
→ Karena itu urutan Tahap 1 dikunci + pesan errornya diterjemahkan ke bahasa yang bisa ditindaklanjuti.

## Lima kepala bahasan (fitur baru: kolom kualitas + lapisan lencana)

1. **Alur pengguna** — Penonton: buka halaman mana pun → tiap poster langsung memajang ⭐ rating,
   kualitas, tahun, dan durasi/jumlah episode tanpa perlu diklik. Owner: panel admin → pilih drama →
   isi Tahun/Durasi/Rating + pilih Kualitas dari dropdown → Simpan → label langsung ikut berubah
   (katalog publik menyusul maksimal 60 detik, mengikuti `CATALOG_TTL_SECONDS`).
2. **Data & siapa boleh lihat** — Yang disimpan cuma 1 kolom teks baru (`quality`) di tabel `dramas`;
   tak ada data pribadi. Isinya **publik** (memang untuk dipajang di poster). Yang boleh mengubah:
   admin saja — endpoint `POST /api/admin/drama` sudah dijaga `isAdminRequest`, dan nilainya disaring
   ulang di server lewat `parseDramaQuality` (UI bukan pagar: siapa pun bisa mengirim body apa saja).
3. **Kalau gagal** — Field kosong = badge-nya **tidak digambar sama sekali** (bukan "—" atau "N/A"):
   poster tanpa label lebih jujur daripada label karangan. `runtime` berisi teks yang tak bisa dibaca
   (mis. "N/A") → badge durasi hilang, bukan menampilkan `NaN:NaN`. Kalau SQL Tahap 1 belum dijalankan,
   penyimpanan drama dari panel admin gagal dan admin melihat pesan berbahasa Indonesia yang menyebut
   nama berkas SQL-nya, bukan pesan PostgREST mentah.
4. **Batas/skala** — Katalog sekarang 41 judul; lencana dihitung dari data yang SUDAH ikut di query
   `select=*` yang ada, jadi **nol** query tambahan dan nol biaya database. Teks kualitas dibatasi
   daftar tetap (maks 7 karakter) supaya tidak meluber di kartu selebar 112px (baris rekomendasi di HP).
5. **Cara uji** — Klik: buka `dramaku.vercel.app` → lihat baris "Film Unggulan" → poster **Spider-Man
   Brand New Day** harus memajang `⭐ 8.1` kiri-atas, `2026` kiri-bawah, `02:25` kanan-bawah; poster
   drama serial mana pun harus memajang `62 EPS` (atau angka episodenya) di kanan-bawah. Otomatis:
   `tests/lencana-kartu.test.ts` (BARU) menguji terjemahan durasi + penyaring kualitas + aturan "field
   kosong = badge hilang", ditambah tes lama yang sudah ada.

## Tahapan

1. **Tahap 1 — SQL (owner).** `supabase_migrations/add_quality_to_dramas.sql` ditempel di Supabase →
   SQL Editor → Run. WAJIB paling dulu; kalau dibalik, penyimpanan drama dari panel admin gagal semua.
2. **Tahap 2 — kode** (kontrak data → lencana → tampilan → panel admin), lalu build + tsc + tes.
3. **Tahap 3 — rilis** (izin owner, §5.5) lalu owner mengisi kualitas/tahun/durasi per judul dari panel
   admin. Badge terisi bertahap seiring pengisian — itu memang bentuk yang dipilih owner.

## Langkah kerja

1. `supabase_migrations/add_quality_to_dramas.sql` — kolom `quality text` (boleh NULL) + CHECK daftar
   nilai sah. Aman diulang (`if not exists`), tanpa DEFAULT (biar judul lama tidak ditandai asal).
2. `lib/types.ts` — `DRAMA_QUALITY_OPTIONS`, tipe `DramaQuality`, `parseDramaQuality()` (pola sama
   dengan `parseDramaStatus`), field `Drama.quality?`.
3. `lib/format.ts` — `menitDariRuntime()` + `formatJamMenit()` → `"165 min"` jadi `"02:45"`; tak
   terbaca = `null`.
4. `lib/dramas.ts` — `DramaRow.quality` + pemetaan dua arah.
5. `lib/lencana-kartu.ts` **(BARU)** — `cardBadges` dipindah ke sini dari `lib/beranda-catalog.ts`
   (kini dipakai SELURUH kartu, bukan cuma beranda) + 3 nilai baru: `kualitas`, `tahun`, `durasi`.
6. `app/components/Poster.tsx` — satu lapisan lencana 4 pojok untuk semua kartu; prop `showRating`
   dihapus (pemakainya cuma `CatalogCard`, yang kini tak perlu menggambar sendiri).
7. `app/components/beranda/CatalogCard.tsx` — hapus lencana duplikatnya.
8. `app/components/DramaCard.tsx` + `ContentRow.tsx` — tulisan di bawah kartu berhenti mengulang
   rating/tahun/episode (sekarang sudah di posternya).
9. `app/components/admin/DramaForm.tsx` — blok **"Lencana kartu"** yang SELALU tampil: Tahun · Durasi ·
   Rating IMDb · Kualitas (dropdown).
10. `app/admin/page.tsx` — state `quality`, ikut dikirim saat simpan & ikut terisi saat drama dibuka.
11. `app/api/admin/drama/route.ts` — terima + saring `quality`, dan terjemahkan error "kolom belum ada".
12. `tests/lencana-kartu.test.ts` (BARU) + rapikan impor di 2 tes lama → jalankan `npm run build` →
    `npx tsc --noEmit` → `npm test` (urutan build-dulu WAJIB, lihat `AGENTS.local.md` gerbang pra-rilis).
