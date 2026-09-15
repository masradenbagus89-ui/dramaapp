# Rencana — Susunan film /beranda jadi baris kategori gaya LK21

Tanggal: 2026-09-15 · Bobot: SEDANG (>3 langkah, 1 divisi = tampilan/frontend,
bukan titik-risiko: tak menyentuh login/bayar/skema DB)

## Maksud owner
Owner mengirim 2 screenshot (dramaku vs Layarkaca21) dengan kotak merah menandai
**judul-judul baris kategori** di LK21, lalu minta: "Susunan Film seperti LK21 …
Buat tampilan poster berbentuk grid horizontal kecil. fokus perbaiki itu saja
jangan ada yang kamu sentuh lain nya".

Owner memilih (popup 2026-09-15): **baris kategori menggantikan grid; grid +
nomor halaman tetap ada tapi hanya muncul saat penonton mencari/menyaring** —
persis cara LK21 bekerja. Nol fitur dibuang.

## Laporan kondisi nyata (terverifikasi)
- ✅ Layar di screenshot = `/beranda`, bukan `/`. Bukti: "Lanjut Menonton" +
  "Favorit Saya" (`PersonalRows`) & "Halaman 1 dari 1 — N judul"
  (`app/components/beranda/CatalogBrowser.tsx:280`). Halaman `/` tak punya keduanya.
- ✅ Susunan film /beranda sekarang = SATU grid panjang ber-paginasi
  (`CatalogBrowser.tsx:329`, memakai `GRID_CLASS`), tanpa judul kategori.
- ✅ Pola LK21 yang diminta **SUDAH ADA** di project: halaman `/` memakai
  `homeCatalogRows` + `FeaturedRow` (`app/page.tsx:111`). Jadi TIDAK membangun
  mekanisme baru — dipakai ulang (§4.4).
- ✅ Grid pernah dikecilkan owner 2026-09-11 dengan alasan tertulis "mau seperti
  LK21" (`app/components/beranda/shell.ts:20-31`) → mengecilkan poster saja sudah
  dicoba dan TIDAK cukup. Yang membedakan LK21 adalah adanya judul kategori.
- ✅ Katalog nyata (Supabase schema `dramaapp`, bukan `data/dramas.json`):
  **42 judul** — Action 21 · Romance 14 · Tycoon 4 · Harem 1 · Time Travel 1 ·
  Comedy 1. Dengan `ROW_MIN_ITEMS=4` → **5 baris**: Drama Terbaru, Paling Banyak
  Ditonton, Drama Action, Drama Romance, Drama Tycoon.
- ✅ `.shell-wide` = `max-width:100%` (`app/globals.css:196`), dan `FeaturedRow`
  membawa pembungkus `shell-wide … px-4 md:px-6` SENDIRI (`FeaturedRow.tsx:64`)
  → baris kategori HARUS diletakkan di LUAR `<div className={SHELL}>`, kalau
  tidak paddingnya dobel.
- ✅ `GRID_CLASS` juga dipakai `DramaBrowser` (/discover). Rencana ini TIDAK
  mengubah `GRID_CLASS` → /discover tidak tersentuh.
- ✅ Gerbang re-deteksi (§4.4) atas 3 berkas target: "Tak ada divisi
  berisiko-senyap yang tersentuh".

## PRE-MORTEM (wajib, >3 langkah)
Anggap semua sudah dikerjakan dan hasilnya NOL guna bagi owner. Penyebab paling
mungkin — dua-duanya terbukti nyata, jadi masuk rencana:

1. **Dropdown "Urutkan" jadi terlihat rusak.** `filterAktif`
   (`CatalogBrowser.tsx:126`) TIDAK menghitung `sort`. Kalau percabangan
   "baris vs grid" memakai `filterAktif` apa adanya, owner memilih "Judul A-Z"
   → grid tak pernah muncul, urutannya tak kelihatan berubah, dan owner
   menyimpulkan fitur urut rusak. → Masuk rencana: satu fungsi murni
   `sedangMenyaring()` yang IKUT menghitung `sort`, dites tersendiri.
2. **Owner tak pernah melihatnya.** Owner menguji di situs asli, bukan
   localhost. Perubahan yang tidak dirilis = nol guna. → Masuk rencana: bukti
   lokal dikumpulkan dulu, lalu MINTA IZIN rilis (§5.5 — push `origin main` =
   tombol rilis), jangan push diam-diam.

## Yang dibangun
| Berkas | Isi |
|---|---|
| `lib/beranda-catalog.ts` (ubah) | + `GENRE_SEMUA` & fungsi murni `sedangMenyaring()` — satu-satunya penentu "tampilkan grid hasil atau baris kategori". Ikut menghitung `sort` (hasil pre-mortem 1). |
| `tests/beranda-catalog.test.ts` (ubah) | + penjaga `sedangMenyaring`, termasuk kasus "ganti urutan WAJIB memunculkan grid". |
| `app/components/beranda/shell.ts` (ubah) | + `ROW_KATEGORI_CARD_CLASS` — lebar poster baris kategori, sengaja lebih kecil dari `ROW_CARD_CLASS` ("grid horizontal kecil"). Aditif. |
| `app/components/beranda/FeaturedRow.tsx` (ubah) | + prop opsional `cardClass`, default `ROW_CARD_CLASS` = perilaku lama persis. Aditif. |
| `app/components/beranda/CatalogBrowser.tsx` (ubah) | Percabangan: tidak menyaring → baris kategori (`homeCatalogRows`); sedang menyaring → hitungan + grid + paginasi seperti sekarang. |

## Yang TIDAK dibangun (sengaja)
- `GRID_CLASS` TIDAK diubah → /discover & grid hasil pencarian tetap sama.
- `homeCatalogRows` / `ROW_MAX_ITEMS` / `ROW_MIN_ITEMS` TIDAK diubah → halaman
  depan `/` tidak ikut berubah (owner: "jangan sentuh yang lain").
- `PersonalRows`, `HasilPlayly`, `SearchBar`, `GenreStrip`, `TopNav` tidak
  disentuh.
- Tab filter LK21 ("TERBARU / SERIES UNGGULAN / …") tidak dibangun: dropdown
  Urutkan yang sudah ada sudah menjawab kebutuhan yang sama, dan owner minta
  fokus pada susunan poster saja.

## Yang ikut tersenggol
- **Tombol "Hapus filter"** — sekarang ikut mengembalikan urutan ke bawaan,
  supaya benar-benar memulangkan penonton ke baris kategori. Tanpa ini penonton
  bisa terjebak di tampilan grid tanpa jalan keluar yang jelas. Hanya di
  /beranda.
- **Halaman `/`** — memakai `FeaturedRow` & `homeCatalogRows` yang sama. Karena
  prop `cardClass` opsional & default lama, tampilannya TIDAK berubah. Dicek
  dengan grep pemanggil + build.
- **/discover** — memakai `GRID_CLASS` & `CatalogCard` yang sama; keduanya tidak
  diubah. Penjaga: `tests/discover-filter.test.ts` (sudah ada).

## Bukti yang harus dikumpulkan (§4.6)
1. `npx tsc --noEmit` bersih.
2. `npm test` hijau (termasuk penjaga baru `sedangMenyaring`).
3. `rm -rf .next` lalu `npm run build` sukses (pelajaran 2026-09-10: build
   inkremental menyajikan halaman statis LAMA sehingga perubahan tampak "tidak masuk").
4. Langkah klik untuk owner mencoba sendiri.
