# 2026-10-10 — Seksi halaman depan: baris geser berpanah, kaki situs 4 kolom, nomor halaman /film

## Laporan kondisi nyata (sebelum dikerjakan)

✅ **Sesi dibuka dari folder yang SALAH.** `D:\Users\user18\dramaapp` tertinggal **3 commit** dari
`origin/main`. Rumah project sejak 2026-10-09 adalah **`E:\dramaapp`** (HANDOFF.md). Ketahuan
karena HTML produksi memuat `<section id="seksi-video-terbaru">` yang tidak ada di kode lokal.

✅ Penyebab "dua baris" bukan jumlah posternya, melainkan **grid yang kolomnya menyesuaikan lebar
layar** (`GRID_CLASS`, auto-fill) sementara isinya TETAP 20 (`TAB_GRID_ITEMS`). Dua angka itu
hampir tak pernah pas → baris terakhir selalu tersisa separuh (di layar owner: 17 lalu 3).

✅ `/film` memajang **seluruh** film dalam satu halaman (lokal 89, produksi 164), tanpa nomor
halaman.

✅ Mekanisme geser + panah sudah ADA di `FeaturedRow`, tapi tertanam di dalamnya.

---

## 🪤 Pelajaran: bentuk seksi berputar EMPAT kali dalam dua hari

| Kapan | Bentuk | Kenapa diganti |
|---|---|---|
| 2026-10-09 | baris geser → **grid bertumpuk** | owner: "sama persis seperti LK21" |
| 2026-10-10 pagi | grid **dipotong satu baris penuh** | baris terakhir sisa separuh; owner: "tidak rapi" |
| 2026-10-10 sore | **kembali ke baris geser** + panah | owner: "diujung kasih tanda panah agar bisa geser ke kanan/kiri" |
| 2026-10-10 sore (lagi) | tombol **"Semua" naik SEJAJAR judul** | di baris yang bisa digeser, tombol di bawah terseret jauh dari judulnya; owner: "kata semua kamu letakan sejajar dengan rekomendasi" |

**Yang ditinggalkan — jangan dihidupkan lagi tanpa perintah baru:** utility `.grid-baris-penuh`
(sudah dihapus dari `app/globals.css`) dan tulisan tombol **"Lainnya"** (dikembalikan ke
**"Semua"**).

**Yang ikut selesai karena putaran ketiga:** utang teknis potongan grid. Saat grid dipotong,
poster yang tidak muat tetap ada di HTML dan masih bisa dijangkau tombol Tab walau tak terlihat.
Dengan baris geser tidak ada lagi yang disembunyikan.

**Pre-mortem yang terbukti berguna:** "halaman depan terasa kosong di HP" — satu baris di layar
360px cuma memuat 3 poster. Di bentuk grid-dipotong itu ditutup dengan memberi HP dua baris; di
bentuk baris-geser masalahnya hilang sendiri, sebab poster berikutnya tinggal digeser.

---

## Yang dikerjakan

| Berkas | Perubahan |
|---|---|
| `app/components/beranda/BarisGeser.tsx` | **BARU** — deretan kartu yang bisa digeser + panah dua ujung; prop `panahSelalu` |
| `app/components/beranda/FeaturedRow.tsx` | Memakai `BarisGeser`; `"use client"` dilepas (tak ada hook lagi); API ke 5 pemanggil tidak berubah |
| `app/components/beranda/SeksiKatalog.tsx` | Grid terpotong → `BarisGeser` dengan `panahSelalu`; tombol "Lainnya" → **"Semua"**, posisinya SEJAJAR judul |
| `app/globals.css` | `.grid-baris-penuh` **dihapus** (kembali persis seperti sebelum hari ini) |
| `lib/tab-katalog.ts` | Label tab `TERBARU` → **`SERIES TERBARU`**; judul seksi ikut otomatis |
| `app/components/beranda/FooterSitus.tsx` | **BARU** — kaki situs 4 kolom; genre dihitung dari katalog nyata |
| `app/page.tsx` | Kaki situs lama ("Prototype") diganti `FooterSitus`; `availableGenres` dihitung di server |
| `lib/beranda-catalog.ts` | `pageOfCatalog` + `CatalogPage` digenerikkan `<T>` |
| `app/components/NomorHalaman.tsx` | **BARU** — deret nomor halaman bersama |
| `app/components/film/DaftarFilmBerhalaman.tsx` | **BARU** — `/film` 24 per halaman |
| `app/film/page.tsx` | Memakai daftar berhalaman |
| `app/components/beranda/CatalogBrowser.tsx` | Markup paginasi tertanam → komponen bersama |

### Kenapa label tab yang diubah, bukan judul seksinya

Judul seksi diturunkan dari label lewat `judulDariLabel` — aturan yang lahir dari permintaan
owner 2026-09-26 ("nama seperti series unggulan harus sama dengan yang dibawah juga"), setelah
keduanya pernah menyimpang di **empat dari enam** tab. Mengubah judul saja akan menghidupkan
kembali penyimpangan itu.

⚠️ Keterangan tab SENGAJA tetap "Judul yang paling baru…", bukan "Serial…": isi tab ini belum
disaring serial-saja, jadi 1 drama ber-`kind: "movie"` di katalog masih ikut. Menulis "serial" =
janji yang tidak ditepati datanya.

## Yang TIDAK dibangun (sengaja)

- **Nomor halaman di `/katalog`.** 40 judul, selalu muat satu halaman → angka "1" sendirian
  terbaca seperti fitur palsu.
- **`?page=` di alamat.** `/film` punya `revalidate = 300`; membaca `searchParams` membuatnya
  dibangun ulang untuk TIAP pengunjung. Konsekuensi diterima: "halaman 5" tak bisa dibagikan.
- **Kaki situs di seluruh halaman.** Memasangnya di `layout.tsx` ikut menempelkannya ke admin,
  pemutar, dan shorts yang sengaja layar penuh.
- **Menyaring tab Series Terbaru jadi serial-saja.** Akan menyembunyikan 1 drama movie yang tidak
  punya tempat lain di halaman depan — keputusan owner, bukan AI.

## Yang ikut tersenggol

`FeaturedRow` dipakai 5 tempat (`/` hero, `/beranda` hero + baris kategori, `/shorts`, tab
katalog). Isinya diganti ke `BarisGeser` tanpa mengubah satu pun prop. Diuji: `/beranda` 200
(7 panah), `/shorts` 200 (5 panah), `/discover` 200, `/film` 200.

Satu perubahan visual kecil yang ikut terbawa: panah baris unggulan kini duduk tepat di tengah
baris poster. Sebelumnya `top-[45%]` dihitung dari pembungkus yang juga memuat tombol di bawah,
jadi posisinya sedikit di atas tengah.

## Bukti

- `rm -rf .next && npm run build` → sukses, `/` dan `/film` tetap **○ Static**
- `npx tsc --noEmit` (SESUDAH build) → **exit 0**
- `npm test` → **96 berkas / 1416 tes lulus**
- Server produksi lokal `:3123`: panah geser 8 pasang, ">Semua<" 7×, "Lainnya" 0×,
  `grid-baris-penuh` 0×, ">SERIES TERBARU<" 1× + ">Series Terbaru<" 1×, "Prototype" 0×
- `/film`: "Menampilkan 1–24 dari 89 judul", tepat 24 kartu, nav nomor halaman lengkap

## Sesudah TAYANG — `8f07e23`

Dirilis atas izin owner ("commit ,push,deploy"). Dual push `2c888bd..8f07e23` fast-forward ke
kedua repo, ketiga ref sama. Tayang ~30 detik sesudah push.

Verifikasi di produksi **dengan pembanding**: penanda BARU ada (`>SERIES TERBARU<`,
"Tentang DramaKu", "Genre Populer", `opacity-90 hover:opacity-100` 14x, "Geser ke kanan" 8x,
`>Semua<` 7x) sementara penanda LAMA `>TERBARU<`, "Prototype", "Lainnya", `grid-baris-penuh`
semuanya **0**. 7/7 seksi, 121 kartu poster. Smoke test 8 halaman semuanya **200**.
`/film` produksi: **"Menampilkan 1-24 dari 267 judul"**, tepat 24 kartu, nav nomor halaman ada —
267 film, jauh di atas 89 yang terbaca lokal (kunci API Playly hanya ada di Vercel).

**Rollback 1-baris:** `git revert 8f07e23 && git push origin main`, atau promote deployment
`76eab86` dari dashboard Vercel. Nol migrasi SQL, nol env baru.
