# Tombol DOWNLOAD pindah posisi + melayang, dan muncul juga di pemutar

> 2026-09-23 · permintaan owner · bobot SEDANG (5 berkas kode + 2 berkas tes,
> 2 halaman; tanpa sentuhan ke database, auth, maupun pembayaran)

## Yang diminta owner

1. Tombol DOWNLOAD di halaman detail pindah ke **bawah baris badge Subtitle**,
   **di atas** heading SINOPSIS.
2. Tombol itu **melayang** (tetap terlihat) selama penonton menggulung halaman.
3. Tetap bisa diakses **saat video sedang diputar**.
4. Fungsinya TIDAK berubah — hanya posisi + kepersistenan.
5. Rapi di HP maupun desktop.

## Dua premis owner yang ternyata keliru (dikoreksi sebelum mengerjakan)

**(a) "Tombol DOWNLOAD sejajar dengan Lanjut Nonton".** Tidak. Di kode, tombol
itu sudah berada di baris sendiri di bawah deretan Favorit/Suka/Bagikan. Yang
belum sesuai keinginan owner hanyalah posisinya masih DI ATAS badge subtitle.
Konsekuensinya: permintaan nomor 3 owner ("baris Lanjut Nonton jadi full-width
sendirian") **tidak menyisakan pekerjaan** — baris itu memang sudah tidak berisi
tombol unduh. Baris tersebut sengaja TIDAK disentuh.

**(b) "Overlay player menutupi sebagian halaman detail".** Tidak ada player di
halaman detail sama sekali. Menekan "Lanjut Nonton" **berpindah halaman penuh**
ke `/feed/[id]` (`app/feed/[id]/page.tsx:22` merender `FeedPlayer` setinggi
`100dvh`). Jadi tidak ada lapisan yang bisa "ditembus" dengan z-index — halaman
detailnya lenyap seluruhnya. Satu-satunya cara memenuhi maksud nomor 3 adalah
menaruh jalan masuk unduhan **di dalam pemutar**. Owner memilih: ikon di rail
kanan, sebaris dengan Suka/Komen/Simpan/Bagikan.

## Keputusan teknis + alasannya

### 1. `position: sticky`, bukan `fixed` + JavaScript

Sticky menahan tombol di tepi bawah layar selama **induknya** masih tergulung,
lalu melepasnya sendiri di ujung halaman. Induk tombol ini adalah blok konten
yang membentang sampai `<Comments/>`, jadi tombol menemani penonton dari badge
subtitle sampai kolom komentar — tanpa `IntersectionObserver`, tanpa tombol
kembar, dan halaman detail **tetap Server Component**.

Jalur `fixed` menuntut tombol KEDUA (satu in-flow + satu melayang), dan tombol
kedua berarti **state modal kedua**. Cacatnya halus tapi nyata: saat modal
terbuka lalu halaman tergulung, tombol melayang itu ter-unmount dan modalnya
ikut lenyap di tengah pemakaian.

### 2. Kelas sticky menempel di TOMBOL, bukan di div pembungkus

Ini jebakan yang paling mudah terlewat. **`position: sticky` SELALU membuat
stacking context.** `DownloadModal` dirender sebagai **saudara** tombol (lihat
`DownloadButton.tsx`), jadi kalau tombolnya dibungkus `<div className="sticky">`,
modal `z-50` itu ikut terkurung di dalam stacking context tersebut — dan seluruh
kurungan itu duduk di level `z-30`. Akibatnya modal **kalah dari `BottomNav`**
(`z-30`, `BottomNav.tsx:69`) yang berada di luar, lalu tertimbun menu bawah di
HP. Sebagai anak langsung, modalnya tetap berada di stacking context halaman.

Cacat kembar yang sama dihindari di pemutar: div rail `absolute ... z-20` juga
membuat stacking context, jadi `<DownloadModal>` di `ActionRail` sengaja
dirender **di luar** div rail (keduanya dibungkus fragment). Dua-duanya dikunci
tes, karena kegagalannya cuma kelihatan di layar kecil dan tidak memicu error.

### 3. Angka yang tidak boleh diubah sembarangan

| Kelas | Kenapa |
|---|---|
| `bottom-20` | BottomNav setinggi ~64px menempel di dasar layar HP (`layout.tsx:55` `pb-16`). `bottom-4` saja = tombol tertimbun menu. |
| `md:bottom-4` | Di >=md BottomNav disembunyikan (`md:hidden`), jadi jaraknya boleh turun. |
| `z-30` | Cukup untuk melewati isi halaman, termasuk `z-10` di dalam AdBanner. |
| `flex` + `sm:w-fit` | `flex` mengubah tombol dari `inline-flex` jadi block-level supaya sticky berperilaku konsisten. Block-level dengan `w-auto` justru melebar penuh — `w-fit` yang mengembalikannya ke selebar isi di layar besar. |

### 4. Ikon Unduh di rail pemutar hanya muncul kalau ada provider

Drama yang belum punya daftar provider **tidak** mendapat ikon Unduh — bukan
ikon yang membuka daftar kosong. Jalur unduh lama tetap tersedia di balik ikon
gerigi pemutar (`PlayerSettings.tsx:153`), jadi tidak ada yang hilang.

**Catatan paywall (sengaja, bukan kelalaian).** Ikon ini TIDAK disembunyikan
saat episode terkunci. Alasannya: daftar provider adalah tautan pihak luar yang
diisi owner sendiri, dan daftar yang sama sudah tampil tanpa syarat di halaman
detail yang publik — yang cuma satu ketukan dari pemutar lewat ikon poster di
puncak rail. Menyembunyikannya di pemutar hanya menambah langkah, bukan
penghalang; menyembunyikan tombol bukan keamanan. Jalur berbayar yang
sesungguhnya (`/api/download` ke berkas server sendiri) **tidak disentuh sama
sekali** dan tetap terkunci di episode gratis oleh
`tests/download-button.test.ts`. Kalau owner tetap ingin ikonnya hilang saat
paywall menyala, itu satu kondisi `&& !lockedActive` — `FeedPlayer` sudah
memegang nilainya di `FeedPlayer.tsx:125`.

## Berkas yang diubah

| Berkas | Perubahan |
|---|---|
| `app/drama/[id]/page.tsx` | Tombol dipindah ke bawah badge subtitle + kelas sticky |
| `app/components/ActionRail.tsx` | Ikon Unduh + `DownloadModal` (dirender di luar div rail) |
| `app/components/FeedPlayer.tsx` | Prop `providers`, diteruskan ke `ActionRail` |
| `app/feed/[id]/page.tsx` | Mengirim `drama.downloadProviders` ke pemutar |
| `tests/unduhan-pemasangan.test.ts` | +8 penjaga posisi & alur data |
| `tests/download-modal-render.test.ts` | +3 penjaga tampilan ikon rail |

## Bukti

Gerbang pra-rilis §6 dijalankan penuh, urutan benar (`build` sebelum `tsc`):

- `rm -rf .next` -> `npm run build` **exit 0**
- `npx tsc --noEmit` **exit 0**
- `npm test` **950 tes / 65 berkas hijau** (naik dari 939)

Bukti tayang, bukan sekadar "sudah ditulis" — server hasil build dijalankan di
`:3099`:

- `/drama/over-your-dead-body` 200. Urutan di HTML **nyata**: badge `Subtitle`
  (posisi karakter 24272) -> tombol DOWNLOAD (25048) -> heading `Sinopsis`
  (26135).
- Kelas yang benar-benar terkirim ke browser:
  `... bg-pink-600 ... sticky bottom-20 z-30 mt-4 flex w-full shadow-lg shadow-black/50 sm:w-fit md:bottom-4`
  — perhatikan `inline-flex` bawaan Button sudah digantikan `flex` oleh
  tailwind-merge, persis seperti yang dirancang.
- CSS hasil build memuat aturannya (bukan kelas yang menguap dari bundel):
  `.sticky{position:sticky}`, `.bottom-20{bottom:calc(var(--spacing) * 20)}`,
  `.w-fit{width:fit-content}`.
- `/feed/over-your-dead-body` 200, rail lama utuh (Suka/Komen/Simpan/Bagikan),
  ikon Unduh **tidak** muncul — benar, karena drama ini nol provider.

Penjaga **diuji-balik** (tes yang tak pernah merah bukan penjaga):

| Yang dirusak sementara | Hasil |
|---|---|
| `md:bottom-4` dihapus | 1 tes MERAH |
| `providers={providers}` dilepas dari FeedPlayer | 1 tes MERAH |
| Tombol dikembalikan ke atas badge subtitle | 1 tes MERAH |
| Modal dipindah ke DALAM div rail | 1 tes MERAH |

Semuanya dipulihkan -> 38/38 hijau pada kedua berkas tes itu.

## Yang BELUM terbukti (jujur)

- **Ikon Unduh di pemutar belum pernah terlihat di layar.** Bukan karena rusak:
  **0 dari 42** judul di katalog punya daftar provider (diukur lewat
  `/api/dramas` pada server hasil build). Yang sudah terbukti adalah
  komponennya menggambar ikon itu saat diberi provider (tes render) dan datanya
  mengalir utuh dari halaman -> FeedPlayer -> ActionRail (tes pemasangan). Owner
  bisa membuktikannya penuh dengan mengisi satu provider lewat panel admin.
- **Perilaku sticky di HP sungguhan belum diketuk jari.** Yang terbukti:
  kelasnya ada di HTML, aturan CSS-nya ada di bundel, dan rantai induknya tidak
  memakai `overflow` yang mematikan sticky (dicek di `app/globals.css` dan
  `app/layout.tsx`).
- `npm run lint` **tidak ada** di project ini, dan tidak ada berkas konfigurasi
  ESLint (`eslint.config.*` maupun `.eslintrc.*`). Penggantinya: `next build`
  exit 0 + `tsc --noEmit` exit 0.

## Cara owner mencobanya sendiri

1. Buka halaman detail drama mana pun, mis. `/drama/over-your-dead-body`.
2. Lihat di bawah baris badge **Subtitle / Indonesia** — tombol pink **DOWNLOAD**
   ada di situ, tepat di atas tulisan **SINOPSIS**.
3. Gulung ke bawah ke sinopsis, daftar episode, lalu komentar. Tombol pink itu
   **ikut turun** dan menempel di tepi bawah layar, di atas menu
   Beranda/Cari/Profil, dan tetap bisa diketuk di posisi itu.
4. Untuk ikon Unduh di dalam video: isi dulu satu provider di panel admin (form
   drama, kotak isian sumber unduhan), simpan, lalu buka drama itu dan tekan
   **Lanjut Nonton**. Ikon panah-ke-bawah berlabel **Unduh** muncul di deretan
   ikon kanan, di bawah Bagikan.
