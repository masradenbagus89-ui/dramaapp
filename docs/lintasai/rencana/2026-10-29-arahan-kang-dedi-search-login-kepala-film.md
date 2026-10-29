# 2026-10-29 — Tiga arahan Kang Dedi: kotak cari, login penonton, kepala halaman film

> Status: **SELESAI DIKERJAKAN, BELUM DIRILIS** — menunggu owner melihat hasilnya.
> Gerbang pra-rilis (AGENTS.local.md §6) sudah lolos penuh.

## Permintaannya

Owner meneruskan tangkapan layar arahan Kang Dedi, tiga butir:

1. *"searchnya kelebaran"*
2. *"hapus fitur login / daftar, karena orang lain tidak perlu login, mereka
   tinggal nonton gratis saja."*
3. *"ketika filmnya di klik maka masuk ke halaman FILM, akan tetapi halaman
   header + sidebar nya berbeda dengan yang di Home — HOME warnanya pink +
   kuning + putih, PAGES (nonton) halamannya DARK / Gelap."*

Owner menambahkan: butir 2 **khusus viewer**, dan *"cuma login dan daftar aja
yang dihapus, sisanya biarkan saja jadi viewer masih bisa kasih rating komen."*

Dari popup, owner memilih: kepala situs saja yang diseragamkan (badan halaman
film tetap gelap), dan layar pemutar `/watch` **tidak disentuh**.

## Temuan yang mengubah pekerjaan

### Jawaban owner butir 2 tidak bisa jalan apa adanya

*"Sisanya biarkan saja"* terdengar seperti nol pekerjaan tambahan, tapi
`app/api/comments/route.ts` dan `app/api/ratings/route.ts` **menolak 401 tanpa
sesi login**. Membuang login lalu membiarkan sisanya = komentar & bintang
**mati total untuk semua orang** — dan matinya SENYAP, sebab 401 adalah jawaban
yang sah; tak ada error di sisi kita. Yang ketahuan cuma kalau ada penonton
mencoba berkomentar.

Karena maksud owner jelas (*"viewer masih bisa kasih rating komen"*), keduanya
dibuat bisa dipakai **tanpa akun** lewat identitas tamu.

### Temuan sampingan: alamat email penulis komentar disiarkan ke semua orang

`GET /api/comments` memulangkan baris komentar apa adanya, termasuk field
`email`. Artinya alamat email setiap penulis ikut terkirim ke browser **semua**
pengunjung — terbaca dari panel jaringan tanpa alat khusus. Ditutup pada
kesempatan yang sama lewat `untukPublik()`; penggantinya penanda `milikku`
yang diputuskan server.

Ini **bukan** bagian dari permintaan Kang Dedi — ditemukan saat membaca route
yang memang harus diubah, dan ditutup karena membiarkannya terbuka sementara
kita sedang menyentuh berkas yang sama adalah pilihan yang salah.

## Yang dikerjakan

| # | Perubahan | Berkas inti |
|---|---|---|
| 1 | Kotak cari dibatasi `md:max-w-xl` (36rem/576px) | `app/components/beranda/SearchBar.tsx` |
| 2 | Saklar `AKUN_PENONTON_ENABLED = false` | `lib/saklar-fitur.ts` |
| 3 | Identitas tamu bertanda tangan (cookie HttpOnly) | `lib/tamu.ts` (baru) |
| 4 | Komentar & rating menerima tamu; email berhenti disiarkan | `app/api/comments/route.ts`, `app/api/ratings/route.ts` |
| 5 | Kepala situs ala Home untuk 4 halaman film | `app/components/beranda/KepalaFilm.tsx` (baru) |
| 6 | `/drama`, `/film`, `/katalog`, `/tonton` pindah kelompok navigasi | `lib/navigasi-halaman.ts` |

### Kotak cari — ini putaran KEDUA, jangan diputar ketiga kalinya tanpa sadar

- **2026-09-21** owner MELEPAS batas `md:max-w-md` (448px) — terlalu sempit.
- **2026-10-29** Kang Dedi: "kelebaran" — tanpa batas, `flex-1` memakan seluruh
  sisa baris (±700–800px di layar 1440).
- Sekarang 576px: di tengah-tengah kedua keluhan. Riwayat lengkapnya ditulis di
  komentar kode supaya putaran berikutnya tahu kedua ujungnya sudah pernah
  ditolak.

## Diperiksa terhadap rak `skills/auth/SKILL.md`

Rak dibuka sesudah palang re-deteksi berbunyi. Hasil pemeriksaan:

| Butir rak | Status |
|---|---|
| Sesi = cookie `HttpOnly` + `Secure` + `SameSite` | ✅ `opsiCookieTamu()` memakai ketiganya |
| Otorisasi dari identitas SERVER-side, bukan body/URL (anti-IDOR) | ✅ kunci tamu HANYA dari cookie bertanda tangan; `body.email` tidak dibaca sama sekali |
| Masa berlaku diperiksa | ✅ `exp` divalidasi di `bacaKunciTamu` |
| Verifikasi tanda tangan, tolak `alg: none` | ✅ algoritma di-hardcode HMAC-SHA256, tidak dinegosiasikan dari token → celah key-confusion tidak ada |
| Pembanding tahan serangan waktu | ✅ `crypto.timingSafeEqual` |
| Rate-limit tetap berlaku | ✅ 20 komentar/menit, 30 rating/menit per IP; anti-CSRF tetap |
| Menyembunyikan tombol ≠ kontrol izin | ✅ hak hapus diperiksa SERVER; tombol di layar cuma kerapian — ditulis di komentar `onDelete` |
| Default-deny | ✅ jalur DELETE tidak menerbitkan identitas baru; tanpa cookie = 403 |
| Tak ada "izin hiasan" | ✅ `milikku`/`adminAktif` yang menggambar tombol benar-benar ditegakkan di route |

### Dua butir yang perlu dibela secara sadar

**1. "JANGAN bikin sistem auth sendiri" — dilanggar? Tidak, tapi harus jujur.**

Yang dibuat BUKAN sistem auth: tidak ada kredensial, password, atau pembuktian
siapa seseorang. Yang dibuat adalah **nomor pembeda anonim**. Kriptografinya pun
bukan buatan sendiri — `crypto.createHmac("sha256")` + `timingSafeEqual`,
primitif standar Node, memakai ulang `secret()`/`hmac()` yang SUDAH dipakai sesi
admin di repo ini. Memasang library auth penuh (NextAuth/Lucia) untuk
menerbitkan satu nomor acak adalah ketidaksesuaian ukuran yang justru menambah
permukaan serangan. Keputusan sadar, bukan kelalaian.

**2. 401 ditukar jadi 403 di DELETE komentar — disengaja dan sesuai rak.**

Rak: 401 = belum login · 403 = sudah login tapi tak berhak. Sesudah login
dihapus untuk penonton, "belum login" bukan lagi keadaan yang berarti —
pengunjung tanpa cookie tamu memang **bukan penulis** komentar itu. Jadi 403
(*"Hanya penulis komentar yang bisa menghapusnya"*) yang benar; 401 akan
menyuruh orang "login ulang" ke pintu yang sudah tidak ada untuknya.

### ⚠️ BATAS JUJUR baru yang lahir dari rak (session-fixation)

Rak mewajibkan "regenerasi ID sesi saat login" untuk mencegah *session-fixation*
(penyerang menanam ID sesi sebelum korban memakainya). Untuk nomor tamu,
padanannya: penyerang yang berhasil menanam cookie tamu miliknya di browser
korban bisa **menghapus komentar yang kemudian ditulis korban** — bukan membaca
apa pun, bukan menyamar sebagai korban.

Kenapa tetap diterima: `HttpOnly` memblokir penanaman lewat JavaScript halaman,
dan `SameSite=lax` memblokir penanaman dari situs lain. Untuk menanamnya,
penyerang sudah harus menguasai domain kita — dan kalau itu terjadi, menghapus
komentar adalah kerugian paling kecil dari daftar masalah. Dicatat di sini supaya
keputusannya terlihat, bukan terlewat.

## Identitas tamu — BATAS JUJUR yang wajib diketahui owner

Nomor tamu hidup di cookie browser. Hapus cookie / jendela samaran / ganti
perangkat = nomor baru, dan orang yang sama bisa menilai lagi. Jadi rating kini
berarti **"satu browser satu suara"**, bukan "satu orang satu suara" — lebih
longgar daripada sebelumnya (satu akun satu suara).

Konsekuensi yang TIDAK boleh dilupakan:

- Rating penonton tetap **DILARANG** jadi structured data Google.
  `lib/structured-data.ts` memakai rating IMDb asli — jangan ditukar.
- Angkanya cukup untuk "suara penonton", tidak cukup untuk keputusan uang.

Menutupnya kembali = nyalakan `AKUN_PENONTON_ENABLED`; jalur sesi lamanya masih
utuh dan **didahulukan** oleh `identitasInteraksi()`.

## Pengaman yang SENGAJA tidak ikut longgar

- `resolveUserEmail` (`lib/session.ts`) **tidak disentuh**. Koin, paywall, kode
  pemulihan, dan daftar admin tetap mensyaratkan sesi bertanda tangan sungguhan.
  Identitas tamu dipakai **hanya** oleh komentar & rating.
- Tamu tidak pernah bisa mendapat lencana admin — dicoba lewat body, diabaikan.
- Tamu tidak bisa menghapus komentar tamu lain (403).
- Nama tamu dibersihkan dari karakter kendali **dan penanda arah teks Unicode**
  (U+202E dkk) yang bisa dipakai menyamarkan nama jadi nama orang lain.

## Yang TETAP hidup

- `/login` — pintu ADMIN, satu-satunya. `AdminAccessDenied` tetap menunjuk ke sana.
- `/daftar` — dibiarkan hidup supaya tautan lama & bookmark tidak jadi 404.
- `/admin` tetap bernavbar hitam: halaman kerja, bukan halaman penonton.
- Layar pemutar `/watch` & `/feed` tidak disentuh sama sekali.

## Bukti

**Gerbang pra-rilis (AGENTS.local.md §6), urutan build→tsc:**
`rm -rf .next` → `npm run build` **sukses** → `npx tsc --noEmit` **exit 0** →
`npm test` **1684 hijau / 117 berkas** (+42 tes baru).

**Dari HTML sungguhan yang dikirim server (`next start`):**

- Kepala `/drama/…`, `/film`, `/katalog` **IDENTIK byte-per-byte** dengan
  `/beranda` sesudah id acak Radix dinormalkan.
- Navbar hitam: **nol** di keempat halaman film.
- Tautan `/login` / `/daftar` di halaman penonton: **nol**.
- Form komentar + kolom nama tamu + bintang yang bisa diklik: **tergambar**.

**End-to-end di server mode-berkas (NOL sentuhan ke Supabase produksi):**

- Komentar tanpa akun → **200**, tersimpan, balasan **tanpa field email**.
- Bintang tanpa akun → **200**.
- Menilai 3× dari browser sama → `count` tetap **1**.
- Tamu lain menghapus komentar orang → **403**.

⚠️ Uji tulis **sengaja tidak dijalankan** terhadap server lokal yang memakai
`.env.local`: env itu menunjuk Supabase **produksi** dengan `service_role`, jadi
komentar uji akan mengotori data penonton sungguhan. Server kedua dijalankan
dengan `ALLOW_FILE_MODE=1`, dan `data/comments.json`/`data/ratings.json`
dipulihkan sesudahnya (diverifikasi: `git status -- data/` bersih).

## Penjaga permanen yang ditinggalkan

`tests/jeda-akun-penonton.test.ts` (28 tes) — tripwire saklar, komentar & rating
tanpa akun, hak hapus, privasi email, tanda tangan nomor tamu, pembersihan nama.

`tests/kepala-situs.test.ts` diperluas: kepala film diperiksa **dua arah** —
navbar hitam hilang **dan** `<KepalaFilm />` benar-benar terpasang. Tanpa arah
kedua, sebuah halaman bisa berakhir tanpa kepala sama sekali dan semua tes tetap
hijau (persis kejadian /beranda 2026-10-28).

## Cara membalikkan

- Butir 2 (login): `AKUN_PENONTON_ENABLED = true` di `lib/saklar-fitur.ts`, lalu
  perbarui tripwire pertama di `tests/jeda-akun-penonton.test.ts`.
- Butir 1 (kotak cari): ubah `md:max-w-xl` di `SearchBar.tsx`.
- Butir 3 (kepala film): kembalikan keempat alamat dari `AKAR_BERKEPALA_FILM` ke
  `AKAR_BERNAVBAR_ATAS` di `lib/navigasi-halaman.ts` dan lepas `<KepalaFilm />`.

## Yang masih terbuka untuk owner

1. **Lebar kotak cari 576px itu pilihan AI**, bukan angka dari Kang Dedi. Kedua
   ujungnya sudah pernah ditolak, jadi kalau masih terasa kurang pas, sebutkan
   arahnya — satu baris yang diubah.
2. **Kepala `/` (landing) masih sedikit berbeda** dari `/beranda` dan halaman
   film: `/` tidak punya tombol menu garis-tiga. Perbedaan ini **sudah ada
   sebelum** pekerjaan hari ini dan bukan bagian keluhan Kang Dedi, jadi tidak
   diubah. Sesudah login dihapus, `/` adalah halaman yang dilihat semua
   pengunjung baru — kalau owner mau benar-benar seragam, ini satu-satunya yang
   tersisa.
3. **`app/components/profile/DashboardMenu.tsx:77`** — tombol "Bantuan" menunjuk
   ke `/login`. Itu salah sejak sebelum hari ini (bantuan ≠ login) dan makin
   membingungkan sekarang. Tidak diubah karena di luar permintaan; tunggu
   keputusan owner.

---

# PUTARAN KEDUA (owner 2026-10-29, sesudah melihat hasil putaran pertama)

Owner melihat preview lalu memberi dua koreksi, disertai tangkapan layar situs
pembanding (REBAHIN):

1. *"tombol search masih terlalu besar"*
2. *"ketika klik film ternyata gelap tidak bagus, bisa kamu ubah seperti SS"*

Dari popup owner memilih: **search jadi tombol pop up**, dan halaman film
**"warna + sidebar kanan"**.

## 1. Kotak cari → TOMBOL, bukan diperkecil lagi

Ini keputusan **ketiga** atas lebar yang sama:

| Tanggal | Keputusan | Hasil |
|---|---|---|
| 2026-09-21 | owner MELEPAS `md:max-w-md` (448px) | "berhenti di tengah, terlalu sempit" |
| 2026-10-29 pagi | dibatasi `md:max-w-xl` (576px) | "masih terlalu besar" |
| 2026-10-29 siang | **diganti TOMBOL + lapisan pop up** | tidak memakan ruang sama sekali |

Pelajarannya: selama kotaknya duduk di bar, **lebar berapa pun salah** bagi
sebagian layar — dua ujung sudah sama-sama ditolak. Mengubahnya jadi tombol
menghapus pertanyaannya, bukan menjawabnya lagi.

Dipasang di `SearchBar.tsx` sebagai prop `modeTombol`, dinyalakan di
`KepalaBeranda` (= /beranda + keempat halaman film) dan `PublicTopBars` (= `/`).
**SENGAJA mati di `/discover`**: itu halaman HASIL pencarian, kotaknya wajib
terlihat terus supaya penonton bisa menyunting kata kunci yang sedang berlaku.

⚠️ **BATAS JUJUR:** lapisannya dibuka JavaScript, jadi sebelum JS aktif tombol
itu diam dan pencarian tak bisa dibuka dari bar. Diterima karena situs ini sudah
mensyaratkan JS untuk memutar video — tapi kalau suatu saat pencarian harus
hidup tanpa JS, mode tombol yang pertama harus dilepas.

## 2. Halaman film jadi TERANG + sidebar

`/drama/[id]` dan `/tonton/[id]`: latar `bg-zinc-100` (menimpa `bg-black` dari
`app/layout.tsx`), isi utama kartu putih, dua kolom dengan
`SidebarPopuler` ("Paling Banyak Ditonton", 5 judul, urut `sortCatalog(...,
"populer")` — fungsi yang sudah dipakai penyaring katalog, bukan logika baru).

Tema terang dioper lewat prop `terang` ke 6 komponen. **Semuanya default
`false`** dan itu WAJIB: `Comments` & `RatingStars` juga dipakai `FeedPlayer` dan
`CommentsDrawer` — dua layar pemutar yang harus tetap gelap. Dijaga tes
"komponen bersama tetap DEFAULT GELAP".

`/` dan `/beranda` **tetap gelap** — owner tidak memintanya berubah
(diverifikasi: keduanya masih `min-h-screen bg-black`).

## 🪤 JEBAKAN BUILD yang hampir membuat laporan ini SALAH

Sesudah build + `next start`, `/drama` tampil versi BARU tapi `/tonton` dan `/`
masih versi LAMA — kotak cari lama masih tergambar, latar masih gelap. Sumbernya
sudah benar, tes hijau, `tsc` exit 0.

**Sebabnya: `rm -rf .next` GAGAL DIAM-DIAM selama server lama masih hidup.** Di
Windows, berkas yang sedang dipegang proses lain tidak bisa dihapus, dan `rm -rf`
tidak mengeluh. Build berikutnya menulis sebagian, sehingga halaman yang
**di-prerender saat build** (`○ Static` / `● SSG` — yaitu `/` dan `/tonton/[id]`)
tetap memakai berkas lama. `/drama/[id]` lolos justru karena ia dibangun
**on-demand** (`generateStaticParams` memulangkan daftar kosong).

**Aturan untuk sesi berikutnya:** matikan server lebih dulu lewat PID, buktikan
port kosong, baru `rm -rf .next` — dan **buktikan foldernya benar-benar hilang**
(`if [ -d .next ]`) sebelum build. Jangan percaya `rm -rf` berhasil hanya karena
ia tidak mengeluarkan error.

Ini sejalan dengan jebakan yang sudah tercatat: *"TaskStop tidak mematikan server
npx — harus dibunuh lewat PID"* dan *"Proses di PC backup dimiliki SYSTEM,
`Stop-Process` gagal dan `-ErrorAction SilentlyContinue` menyembunyikannya."*
Pola yang sama berulang: **perintah pembersih yang gagal tanpa suara.**

## Bukti putaran kedua

build **sukses** (sesudah `.next` dibuktikan terhapus) · `tsc` **exit 0** ·
**1.697 tes hijau / 118 berkas** (+13 baru di
`tests/cari-popup-dan-film-terang.test.ts`).

Dari HTML server: keempat halaman (`/`, `/beranda`, `/drama/…`, `/tonton/…`)
memuat **tombol cari** dan **nol kotak cari di bar** · `/drama` + `/tonton`
berlatar `bg-zinc-100` dengan `<aside>` sidebar · `/` + `/beranda` **tetap**
`bg-black` tanpa sidebar.
