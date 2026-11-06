# Rencana: baris "Playly" di popup Pilih provider download

- **Tanggal:** 2026-11-06
- **Diminta client:** owner menyerahkan berkas `code to push link provider.txt` (potongan JavaScript
  `tambahPlayly(...)`) + kalimat *"kamu cek kamu buka lalu kamu kerjakan"*.

## Ringkasan

Popup **Pilih provider download** di video Playly sekarang cuma berisi provider pihak luar yang
alamatnya diisi admin sendiri (Google Share, Telegram, Cast, Mega, Sendcm). Pekerjaan ini menambah
**satu baris lagi: "Playly"** — unduhan yang berasal dari server Playly itu sendiri, dengan satu
tombol per resolusi yang mereka tawarkan (mis. 480p / 720p / ASLI). Hasil akhirnya bagi penonton:
kalau pengunggah di Playly mengizinkan videonya diunduh, penonton DramaKu bisa langsung mengambilnya
tanpa menunggu admin menempel link provider manual.

## Fakta yang sudah diperiksa (OK) vs masih asumsi (TANYA)

OK — **popup yang dimaksud = `app/components/player/ModalProviderPlayly.tsx`** (judulnya persis
"Pilih provider download"). Ia dipakai lewat `InfoVideoPlayly` di DUA tempat: grid daftar film
(`app/components/PlaylyVideoGrid.tsx:61`) dan halaman tonton (`app/tonton/[id]/page.tsx:289`).

OK — **kode yang diserahkan owner TIDAK bisa ditempel apa adanya.** Ia JavaScript DOM polos
(`document.createElement`) memakai kelas CSS `provider-row` / `provider-name` / `btn-download` —
dicari di seluruh `app/`, `components/`, `lib/`: **nol kemunculan**. Project ini React + Tailwind,
barisnya digambar sebagai `<tr>` di dalam `<table>`. Jadi kodenya dipakai sebagai **spesifikasi**
(alamat API, bentuk data, aturan tampil), lalu ditulis ulang dengan cara project ini.

OK — **field `unduh` MEMANG ADA di balasan Playly** `/api/public-video?id=...` — diperiksa langsung,
bukan dari ingatan.

OK — **tapi nilainya `null` di 200 dari 200 video kita** (id diambil dari HTML produksi `/film`,
semua balasan `ok:true`). Artinya: begitu dirilis, baris Playly **belum akan muncul di video mana
pun** — bukan karena kodenya salah.

OK — **penyebabnya ada di sisi Playly, dan mereka menyatakannya sendiri.** Halaman unduhan Playly
`/unduh/<id>` membalas 200 dengan tulisan: *"Video tidak tersedia untuk diunduh - Tautannya salah,
videonya tidak dibagikan, atau pemiliknya tidak mengizinkan unduhan."* Jadi izin unduh itu
**saklar per-video milik pengunggah**, bukan sesuatu yang bisa kita nyalakan dari DramaKu.

OK — **CORS Playly `*`**, jadi secara teknis browser penonton boleh memanggil Playly langsung.

TANYA — **bentuk persis isi `unduh` belum pernah terlihat terisi.** Yang dipakai = kontrak dari kode
owner: `{ url: string, resolusi: string[] }`, alamat tombol = `url` + `?res=<resolusi>`. Karena belum
ada satu pun contoh nyata, penyaringnya dibuat **jujur**: bentuk yang tak dikenali dilaporkan apa
adanya (`alasan: "bentuk-tak-dikenali"`), BUKAN disamakan dengan "tidak ada unduhan". Tanpa itu,
perubahan kontrak di sisi Playly akan gagal **senyap** — persis jenis kerusakan yang tak pernah
dilaporkan siapa pun.

## Yang TIDAK dibangun (sengaja)

- **Tidak** menyalurkan byte video lewat server DramaKu. Situs ini pernah MATI TOTAL karena
  `/api/teaser` menyalurkan video (29,71 GB dari jatah 10 GB,
  `docs/lintasai/rencana/2026-08-26-vercel-paused-teaser-proxy.md`). Yang keluar dari server kita
  cuma **alamatnya**; byte-nya mengalir langsung dari Playly ke penonton.
- **Tidak** mengambil `unduh` saat halaman daftar dibangun. Field itu hanya ada di
  `/api/public-video` (satu panggilan per video) — mengambilnya untuk seluruh daftar = mengulang
  insiden 2026-10-06 (172 panggilan serentak sampai SELURUH poster kosong). Diambil **saat popupnya
  dibuka saja**: 1 panggilan per klik penonton.
- **Tidak** mengubah baris provider yang sudah ada, warnanya, maupun bentuk popupnya.
- **Tidak** menambah warna tombol baru. Hanya dua kelas warna yang ditulis utuh di
  `app/components/unduhan-kelas.ts` yang ikut dibundel Tailwind; kelas yang dirakit saat program
  berjalan tergambar **tanpa warna** tanpa error apa pun.
- **Tidak** menyentuh panel admin link unduhan (`/admin/videos/playly`) — baris Playly tidak diisi
  manusia, datanya dari Playly.

## Yang ikut tersenggol (fitur lain yang memakai kode ini)

| Yang client kenal | Kenapa tersenggol | Penjaganya |
|---|---|---|
| Popup DOWNLOAD di **grid daftar film** (`/film`, `/discover`) | komponen popup yang sama | `tests/playly-modal-provider.test.ts` (sudah ada) + tes baru |
| Popup DOWNLOAD di **halaman tonton** (`/tonton/<id>`) | komponen popup yang sama | `tests/tonton-halaman.test.ts`, `tests/playly-info-video.test.ts` (sudah ada) |
| Popup unduhan **halaman drama** (`DownloadModal`) | **TIDAK** disentuh — komponen berbeda | tes drama yang sudah ada |
| Pemutar video Playly | **TIDAK** disentuh — `/api/playly/video` tidak diubah, hanya gerbangnya ditiru | `tests/playly-*.test.ts` (sudah ada) |

Perilaku popup bagi pemanggil lama **tidak berubah**: prop `videoId` opsional, dan tanpa prop itu
tidak ada satu pun panggilan jaringan — pemakai lama menggambar persis seperti sebelumnya.

## Pre-mortem (wajib sebelum mengerjakan)

> Anggap semuanya sudah selesai dan hasilnya NOL guna bagi owner — penyebab paling mungkin:
> **baris Playly tak pernah muncul** karena `unduh` masih `null` di semua video, lalu owner
> menyimpulkan pekerjaannya gagal.

Yang masuk ke rencana karena jawaban itu: endpoint `/api/playly/unduh?id=<id>` membalas **alasan yang
bisa dibaca manusia** (`tidak-diizinkan` / `bentuk-tak-dikenali` / `playly-tak-terjawab`), supaya owner
bisa membuktikan sendiri dalam 1 klik bahwa sisi DramaKu **sudah jalan** dan yang tersisa adalah
saklar di sisi Playly.

## Lima kepala bahasan (fitur BARU)

1. **Alur pengguna:** penonton klik DOWNLOAD -> popup terbuka menampilkan provider yang sudah ada ->
   di belakang layar popup menanyakan 1x ke `/api/playly/unduh?id=<id>` -> kalau Playly mengizinkan,
   baris **Playly** muncul paling bawah dengan 1 tombol per resolusi -> klik tombol membuka halaman
   unduhan Playly di tab baru.
2. **Data & siapa boleh lihat:** tidak ada data baru yang disimpan (nol tabel, nol kolom, nol env
   baru). Yang menyeberang hanya alamat unduhan milik Playly. Gerbangnya sama dengan
   `/api/playly/video`: id dari browser **tidak** dipakai langsung — video yang disembunyikan admin
   atau bukan milik akun mitra ditolak **404**, supaya endpoint kita tidak jadi pintu belakang ke
   seluruh katalog Playly (IDOR).
3. **Kalau gagal:** gagal-AMAN. Playly mati/timeout/bentuk berubah -> baris Playly **tidak digambar**,
   provider lain tetap tampil seperti biasa, tanpa pesan error merah ke penonton. Kalau SEMUA sumber
   kosong, teks lamanya tetap: "Link unduhan belum tersedia" — tapi hanya **sesudah** pemeriksaan
   selesai, supaya tidak sempat berbohong saat masih memeriksa.
4. **Batas/skala:** 1 panggilan per popup yang dibuka (bukan per video di halaman). Batas Playly 120
   permintaan/menit per IP; hasilnya ditahan di sisi server lewat `revalidate` dan diingat per video
   selama komponennya hidup. Maksimal 8 tombol resolusi per baris — daftar resolusi datang dari pihak
   luar, jadi panjangnya dibatasi di pintu masuk.
5. **Cara uji:** (a) otomatis — berkas tes baru untuk penyaringnya + tes popup yang menggambar baris
   Playly dari balasan tiruan; (b) owner bisa coba sendiri: buka
   `<situs>/api/playly/unduh?id=1789096535588` -> harus terbaca
   `{"ok":true,"unduh":null,"alasan":"tidak-diizinkan"}` = sisi DramaKu jalan, saklarnya di Playly.

## Langkah kerja

1. `lib/playly-unduh-langsung.ts` (BARU) — aturan murni: bentuk data, penyaring `unduh` (https +
   domain Playly + resolusi wajar), label tombol, perakit alamat `?res=`, pemilih warna. Tanpa
   jaringan & tanpa env supaya bisa diuji langsung dan aman diimpor komponen browser.
2. `lib/playly.ts` — tambah `fetchPlaylyUnduhLangsung(id)`: ambil `/api/public-video`, lalu serahkan
   field `unduh` ke penyaring di langkah 1. Fungsi lama tidak diubah.
3. `app/api/playly/unduh/route.ts` (BARU) — endpoint publik on-demand + gerbang anti-IDOR yang sama
   dengan `/api/playly/video`, amplop balasan `{ ok, unduh, alasan }`.
4. `ModalProviderPlayly` — prop `videoId` OPSIONAL; saat popup terbuka, tanyakan sekali lalu gambar
   baris Playly paling bawah. Tanpa `videoId` -> perilaku lama persis.
5. `InfoVideoPlayly` + kedua pemanggilnya meneruskan `videoId`.
6. Tes baru: penyaring + baris Playly di popup. Lalu gerbang pra-rilis AGENTS.local.md §6
   (`rm -rf .next` -> `build` -> `tsc` -> `npm test`).
