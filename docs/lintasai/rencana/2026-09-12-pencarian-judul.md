# Rencana — Perbaiki fitur pencarian judul (gaya LK21)

**Tanggal:** 2026-09-12 · **Diminta owner:** "Ketika user mengetik judul, tampilkan hasil yang
sesuai, tidak sensitif huruf besar-kecil. Fokus itu saja, jangan sentuh yang lain."

## Laporan kondisi nyata (✅ = terverifikasi, ❓ = asumsi)

✅ **Huruf besar-kecil SUDAH tidak masalah.** `lib/discover.ts:172` sudah `query.toLowerCase()`
dan tiap field juga `.toLowerCase()`. Dibuktikan menjalankan `filterAndSortDramas` asli terhadap
**42 judul produksi** (`GET /api/dramas`): `ceo` · `CEO` · `Ceo MiLiArDeR` · `  ceo  ` semuanya
memulangkan hasil.

✅ **Empat kegagalan NYATA yang ditemukan lewat data produksi:**

| Ketikan | Hasil sekarang | Sebab (`berkas:baris`) |
|---|---|---|
| `spider man` | **0** | `lib/discover.ts:184` pakai `includes` mentah; judul aslinya `Spider-Man` |
| `transformers last knight` | **0** | satu kata dilewat ("The") → substring tidak utuh |
| `knight dark` | **0** | urutan kata dibalik → substring tidak utuh |
| `beyond the last signal` | **0** | video Playly, gudang datanya TERPISAH dari 42 drama |

✅ `Beyond The Last Signal` benar-benar ADA — sebagai video Playly (terbaca di HTML `/playly`
produksi, 19 video). Sumbernya `lib/playly-publik.ts` `getPlaylyVideosPublik()`, bukan Supabase.

✅ Pemakai `filterAndSortDramas` hanya DUA: `CatalogBrowser.tsx:91` (/beranda) &
`DramaBrowser.tsx:125` (/discover). Keduanya permukaan pencarian → memperbaiki di akar aman,
tidak perlu tambal per-pemanggil.

✅ Halaman depan `/` tidak menyaring sendiri; ia melempar ke `/discover?q=`
(`PublicTopBars.tsx:36-39`) → ikut terbawa perbaikan tanpa disentuh.

✅ `/discover` SUDAH punya bagian "Video dari Playly" (`app/discover/page.tsx:60-84`) tapi
**tidak ikut tersaring** ketikan. `/beranda` belum punya bagian itu sama sekali.

✅ `getPlaylyVideosPublik()` seluruhnya ber-cache 5 menit & tidak pernah melempar error
(`lib/playly-publik.ts:137-196`) → aman dipanggil dari `/beranda` tanpa memperlambat per-pengunjung.

## Keputusan owner (popup 2026-09-12)

**Hasil dipisah 2 bagian** — poster drama di atas, bagian "Video dari Playly" yang ikut tersaring
di bawahnya. Bukan dicampur satu grid, karena poster drama TEGAK (2:3) dan kartu Playly MELINTANG
(16:9); mencampurnya bikin barisan jomplang dan menuntut desain ulang kartu.

## PRE-MORTEM — anggap ini sudah dikerjakan tapi NOL guna. Kenapa?

**Penyebab paling mungkin:** owner mengetik judul Playly, bagian drama balas "tidak ada yang
cocok", lalu owner berhenti di situ — **tidak menggulir ke bawah** tempat videonya berada. Atau:
videonya cocok tapi **terpotong `limit={8}`** yang dipakai /discover hari ini.

**Masuk ke rencana:** (a) saat ada ketikan, batas 8 kartu DILEPAS — tampilkan semua yang cocok;
(b) pesan kosong bagian drama WAJIB menyebut "ada N video Playly yang cocok di bawah".

## Langkah

1. **BARU `lib/pencarian.ts`** — satu tempat aturan "teks cocok dengan ketikan":
   `normalisasiTeks` (buang aksen + tanda baca + emoji, huruf kecil), `pecahKataKunci`,
   `cocokSemuaKata` (semua kata harus ada, urutan bebas), `saringDenganKetikan` (generik).
2. **`lib/discover.ts`** — ganti pencocokan `includes` mentah dengan `cocokSemuaKata`. Field yang
   dicari TIDAK ditambah/dikurangi (tetap judul · kategori · sinopsis).
3. **BARU `app/components/beranda/HasilPlayly.tsx`** — bagian "Video dari Playly" yang tersaring.
4. **`CatalogBrowser.tsx`** (+prop `playlyVideos`) & **`DramaBrowser.tsx`** (+prop sama) memakainya.
5. **`app/beranda/page.tsx`** ambil video Playly & oper. **`app/discover/page.tsx`** oper video yang
   SUDAH diambil, dan bagian Playly-nya PINDAH ke dalam DramaBrowser (kalau tidak, /discover punya
   DUA bagian Playly saat mencari).
6. **Tes penjaga BARU** `tests/pencarian.test.ts` — mengunci keempat ketikan yang hari ini gagal.

## Yang TIDAK dibangun (sengaja)

- Tidak ada kotak cari baru di `/playly` (opsi C ditolak owner).
- Tidak ada pengurutan "paling sesuai" (title-match naik ke atas) — ditawarkan terpisah, bukan
  dikerjakan diam-diam.
- `/shorts`, `/my-list`, halaman drama, admin: NOL tersentuh.
- Bentuk kartu (poster & kartu Playly) NOL tersentuh — rilis poster besar kemarin (`fde4c97`) aman.

## Yang ikut tersenggol

| Fitur yang owner kenal | Kenapa ikut | Penjaganya |
|---|---|---|
| Kotak cari /beranda | pakai `filterAndSortDramas` yang sama | `tests/discover-filter.test.ts` (ada) + tes baru |
| Kotak cari /discover | sama | sama |
| Kotak cari halaman depan `/` | melempar ke `/discover?q=` | sama |
| Menu katalog (Genre/Tahun/…) | `filterDariUrl` lewat berkas yang sama | `tests/nav-katalog.test.ts` (ada) |
| Baris "Video dari Playly" /discover | pindah ke dalam DramaBrowser | `tests/playly-video-grid.test.ts` (ada) |
