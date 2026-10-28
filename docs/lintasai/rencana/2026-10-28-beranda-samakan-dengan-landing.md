# Rencana: samakan tampilan `/beranda` dengan landing page `/`

> 2026-10-28 · owner: *"aku mau tampilan beranda sama dengan tampilan di landing page,
> begitu selesai kamu tunjukan hasilnya dulu biar ku cek."*
> Keputusan owner dari popup: **baris "Lanjut Menonton" TETAP** di paling atas; dua baris
> personal lain ("Karena kamu menonton", "Trending di <genre>") ikut hilang.

## 0. Ringkas

**APA:** `/beranda` (halaman yang dilihat penonton SESUDAH login) memakai susunan badan yang
sama dengan `/` (halaman untuk yang BELUM login).

**KENAPA dua halaman ini beda:** `/` memantulkan penonton yang sudah login ke `/beranda`
(`app/components/RedirectIfAuthed.tsx`), jadi owner tak pernah melihat `/` kecuali logout.

👨‍🎓 **Junior-frontend:** badan bersama diangkat ke SATU komponen (`BadanKatalog`) yang dipakai
kedua halaman, bukan disalin. Perbedaan yang tersisa dioper lewat prop: `slotAtas` (bar login vs
baris Lanjut Menonton) dan `basePath` (tujuan klik tab).
🙂 **Non-programmer:** kedua halaman memakai satu cetakan yang sama. Kalau suatu saat cetakannya
diubah, keduanya ikut berubah bersama — tak bisa lagi diam-diam jadi beda seperti sekarang.

## 1. Beda yang ada SEKARANG (terukur, bukan ingatan)

| | `/` landing | `/beranda` |
|---|---|---|
| Deret tab | **isi tab digambar** (`seksiLengkap`) → Film Terbaru, Series Terbaru, … | **cuma menu** (`hanyaMenu`) → tiap tab membuka `/katalog/...` |
| Atas badan | bar **"Lanjutkan Menonton"** (pintu Masuk/Daftar, tertutup) | `PersonalRows`: Lanjut Menonton · Karena kamu menonton · Trending di `<genre>` · Favorit Saya |
| Badan | — | `CatalogBrowser`: Drama Terbaru/Action/Romance/Tycoon, Film Terbaru, Paling Banyak Ditonton |
| Kaki | `FooterSitus` (4 kolom) | tidak ada |

## 2. Pre-mortem — anggap sudah dikerjakan dan hasilnya NOL guna

**Penyebab paling mungkin:** tab di `/beranda` menunjuk ke `/`, lalu `RedirectIfAuthed`
memantulkan penonton kembali → **tab terlihat mati**. Bahaya ini sudah ditulis terang-terangan di
`app/beranda/page.tsx` oleh sesi sebelumnya. **Masuk ke rencana:** `basePath="/beranda"` wajib,
dan diuji.

**Penyebab kedua:** isi tab digambar SAMBIL baris kategori dipertahankan → daftar sama muncul dua
kali, persis keluhan owner **"ada 2 rekomendasi"** (2026-09-26). **Masuk ke rencana:** baris
kategori (`CatalogBrowser`) memang dilepas, bukan ditumpuk.

## 3. Langkah

1. **`app/components/beranda/BadanKatalog.tsx` (BARU)** — badan bersama: `FeaturedRow` →
   `slotAtas` → pembungkus tema terang + `TabKatalog seksiLengkap` → `FooterSitus`.
2. **`app/page.tsx`** memakainya, `slotAtas={<LanjutMenonton />}`, `basePath` bawaan `/`.
3. **`app/beranda/page.tsx`** memakainya, `slotAtas={<PersonalRows hanyaLanjut />}`,
   **`basePath="/beranda"`**. `CatalogBrowser` dilepas dari halaman ini.
4. **`PersonalRows`** dapat prop `hanyaLanjut` — hanya menggambar baris "Lanjut Menonton".
5. **Tes** — perbarui tes beranda yang mengunci bentuk lama; tambah tes yang mengunci:
   (a) kedua halaman memakai badan yang SAMA; (b) tab `/beranda` TIDAK menunjuk ke `/`.

## 4. Yang ikut tersenggol

- **`CatalogBrowser` jadi tak terpakai** (anak-anaknya — `SearchBar`, `KepalaKatalog`,
  `NomorHalaman`, `FilterKatalog` — masih dipakai halaman lain, jadi aman). **Sengaja TIDAK
  dihapus dulu**: owner mau melihat hasilnya dulu, dan menghapus komponen besar di saat yang sama
  membuat pembatalan jadi mahal. Utang yang dicatat → bereskan sesudah owner setuju.
- **Baris kategori & penomoran halaman di `/beranda` hilang.** Genre tetap bisa dicapai dari strip
  kuning, menu atas, dan tombol FILTER — sama seperti di `/`.
- **`/beranda` jadi punya kaki situs** (sebelumnya tidak). Ikut karena badan bersama; kalau owner
  tak mau, cukup jadikan kaki itu opsional.
- ❌ **KOREKSI — klaim awal di baris ini SALAH.** Semula tertulis *"/beranda memakai `TopNav`
  global, jadi bar atas tidak tersentuh"*. Kenyataannya bar atas `/beranda` lahir **di dalam
  `CatalogBrowser`**, jadi melepas komponen itu ikut menghapus logo, kotak cari, menu, dan strip
  genre. `TopNav` justru SENGAJA menyembunyikan diri di `/beranda` (lihat
  `lib/navigasi-halaman.ts`). Ditemukan hanya saat tangkapan layarnya dilihat — rinciannya di
  §7. Sudah diperbaiki dengan `KepalaBeranda.tsx`; isi kanan-kirinya (`chromeKatalog()`) SAMA
  seperti sebelumnya, jadi status login & menu akun tetap tak tersentuh.

## 5. Bukti yang wajib ada sebelum ditunjukkan ke owner

- `npm test` hijau · `tsc` 0 · build sukses.
- Situs dijalankan lokal: `/` dan `/beranda` **200**, dan judul seksi keduanya **sama**.
- Tab di `/beranda` menunjuk ke `/beranda?tab=...` (bukan `/`), dan isinya berpindah saat diklik.
- Tangkapan layar sebelum/sesudah untuk owner.

## 6. HASIL — terukur 2026-10-28, BELUM dirilis (menunggu owner)

Gerbang §6: `rm -rf .next` → build **sukses** → `tsc` **exit 0** → **1.642 tes hijau**
(dari 1.639; +3 tes baru).

Situs dijalankan sungguhan (`next start`, port 3999):

| Diukur | `/` (acuan) | `/beranda` (sesudah) |
|---|---|---|
| Judul seksi | Film Terbaru · Series Terbaru · Series Unggulan · Series Update · Terpopuler · Rekomendasi · 2025 | **identik** |
| Kotak cari · logo · menu Genre · strip genre | 1 · 1 · 1 · ada | **1 · 1 · 1 · ada** |
| Tujuan klik tab | `/?tab=…` | `/beranda?tab=…` — **0** yang menunjuk `/` |
| Baris kategori lama (Drama Terbaru/Action/Romance, Paling Banyak Ditonton) | — | **0** (hilang, sesuai rencana) |
| Kaki situs | ada | **ada** |

## 7. 🔴 REGRESI YANG NYARIS LOLOS — ditangkap oleh GAMBAR, bukan oleh angka

Sesudah `CatalogBrowser` dilepas, **seluruh kepala situs `/beranda` ikut hilang**: logo, kotak
cari, menu katalog, dan strip genre kuning. Penyebabnya bar itu tidak pernah punya rumah sendiri
— ia lahir **di dalam `CatalogBrowser`**, komponen yang tugas utamanya menggambar GRID.

**Yang mengerikan: nol tanda bahaya.** Halaman tetap **200**, `next build` **sukses**, `tsc`
**0 error**, dan **1.639 tes hijau**. Pemeriksaan status & judul seksi juga semuanya lolos —
karena yang hilang bukan isi badan, melainkan kepalanya. Ketahuan hanya karena tangkapan layarnya
benar-benar DILIHAT.

**Aturan yang diambil:** untuk perubahan TAMPILAN, bukti berupa status 200 + judul seksi + tes
hijau TIDAK cukup. Yang membuktikan adalah halaman yang digambar — di sesi ini lewat
`chrome --headless --screenshot`, dan gambar itu harus benar-benar diperiksa, bukan sekadar
dihasilkan.

**Diperbaiki:** `app/components/beranda/KepalaBeranda.tsx` (BARU) memasang bar cari + strip genre
langsung di halaman, memakai `chromeKatalog()` yang SAMA seperti sebelumnya — jadi tombol
garis-tiga & tombol akun tetap persis seperti yang owner lihat selama ini. Bar itu kini tidak lagi
bergantung pada hidup-matinya grid.

**Penjaganya:** `tests/kepala-situs.test.ts` — berkas itu SUDAH menyatakan `/beranda` termasuk
"halaman yang kepalanya dipegang bar cari merah", tapi tak pernah memeriksa apakah halamannya
benar-benar MEMASANGNYA. Dua tes ditambahkan: (a) `KepalaBeranda` menggambar kotak cari + strip
genre; (b) `app/beranda/page.tsx` benar-benar merendernya. Pelajaran yang sama dengan kasus
`DownloadButton` 2026-09-23.

⚠️ **Catatan jujur soal tangkapan layar:** di pratinjau lokal, poster baris **"Film Terbaru"**
tampil sebagai kotak abu-abu kosong. Itu **bukan** akibat perubahan ini — halaman `/` lokal
(acuan, yang tidak disentuh) menunjukkan gejala yang sama persis, jadi penyebabnya gambar film
dari penyedia luar yang tidak termuat di lingkungan lokal. Di produksi baris itu bergambar normal.

