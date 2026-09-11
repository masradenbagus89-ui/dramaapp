# Rencana: menu pemutar sendiri (titik tiga) untuk video Playly

> Dikerjakan 2026-09-09 · bobot **BERAT** (fitur BARU + mengganti cara video Playly diputar)
> Permintaan owner: menu titik tiga di pemutar halaman Playly berisi PIP, Volume Stabil,
> Penguat Suara, Pencahayaan Sinematik, Terjemahan, Kecepatan, Kualitas — dark theme,
> kanan bawah, compact, animasi halus.

## Masalah

Halaman `/playly` memutar video lewat **iframe milik Playly**
(`app/playly/page.tsx:39` → `app/components/PlaylyVideoGrid.tsx:47` →
`app/components/EmbedPlayer.tsx:57`). Menu titik tiga yang terlihat owner
(hanya "Playback speed" + "Picture in picture") adalah menu bawaan Chrome untuk
elemen `<video>` **di dalam** iframe itu. Karena isi iframe berasal dari domain
lain, same-origin policy melarang JavaScript kita menyentuhnya — menu itu tidak
bisa diganti, ditimpa, atau ditambahi selama pemutarnya masih iframe.

Satu-satunya jalan: video Playly diputar **pemutar DramaKu sendiri**.

## ✅ Terverifikasi (dijalankan / dibaca)

- `GET https://playly-dashboard.vercel.app/api/public-video?id=<id>` mengirim field
  **`videoUrl`** = alamat mp4 di Cloudflare R2, bertanda tangan, `X-Amz-Expires=21600`
  (6 jam). Jadi memutar sendiri MUNGKIN.
- Berkas mp4-nya: `Content-Type: video/mp4`, `Accept-Ranges: bytes`, balas `206 Partial
  Content` → bisa diputar & di-seek langsung oleh browser.
- **Tidak ada header `Access-Control-Allow-Origin`** pada mp4 itu (dicek dengan
  `Origin: https://dramaapp.vercel.app`). Akibatnya Web Audio API tidak bisa dipasang →
  **Volume Stabil & Penguat Suara tidak bisa dijalankan** untuk video Playly.
- **`variants: {}` kosong di 9 dari 9 video** yang diperiksa (4 milik creator `coklat` =
  akun mitra kita, 5 lainnya) → tidak ada berkas 360p/480p/720p/1080p. Menu Kualitas
  tidak punya isi selain "Auto".
- **`subtitles: []` kosong + `subtitleVtt` kosong di 9 dari 9** → tidak ada berkas
  subtitle. Menu Terjemahan tidak punya isi selain "Mati".
- `lib/playly.ts:66` — `DEFAULT_PLAYLY_CREATOR = "coklat"`, cocok dengan creator video
  di layar owner.
- `lib/playly.ts:975` — komentar lama menyatakan `videoUrl` SENGAJA diabaikan supaya
  hitungan tayang Playly tetap benar. Keputusan itu **dibatalkan owner 2026-09-09**.
- Pemutar sendiri yang sudah ada (`app/components/FeedPlayer.tsx` + `player/PlayerSettings.tsx`)
  memakai ikon gerigi dan tidak punya PIP / Volume Stabil / Penguat Suara / Pencahayaan
  Sinematik. **Tidak disentuh** atas permintaan owner ("jangan sentuh yang lain").

## ❓ Asumsi

- Video mitra di luar 9 yang diperiksa juga tanpa varian & subtitle (pola 9/9 konsisten,
  tapi jalur mitra `/api/videos` berisi lebih banyak video daripada katalog publik).
- Hitungan tayang di dashboard Playly berhenti bertambah untuk video yang diputar dari
  DramaKu. Belum bisa dibuktikan dari sisi kita — dashboard-nya milik mitra.

## Keputusan owner (popup 2026-09-09)

1. **Halaman Playly, ganti pemutar** — bukan cuma pemutar drama sendiri.
2. **Volume Stabil & Penguat Suara: dilewati** untuk video Playly. Proxy DITOLAK.
3. **Kualitas & Terjemahan: tetap tampil apa adanya + keterangan**, bukan disembunyikan.

## Kenapa TIDAK pakai proxy (pelajaran mahal yang sudah tercatat)

`docs/lintasai/rencana/2026-08-26-vercel-paused-teaser-proxy.md`: situs pernah **mati
total** karena `/api/teaser` menyalurkan byte video lewat server — Fast Origin Transfer
29,71 GB dari jatah 10 GB, seluruh project di-pause Vercel. Karena itu endpoint baru di
sini **hanya mengirim alamat (JSON, ~300 byte)**; byte videonya mengalir langsung dari
Cloudflare R2 ke penonton, nol beban Vercel — sama seperti perbaikan teaser.

JSON dipilih ketimbang 307 redirect (pola teaser) karena pemutaran video memicu banyak
Range request; dengan JSON server kita disentuh **sekali per video yang diklik**, sisanya
langsung ke R2.

## Pre-mortem — anggap sudah jadi tapi NOL guna, kenapa?

Penyebab paling mungkin: **owner mengklik video lalu layar hitam / muter terus**, karena
mp4 R2 ternyata menolak diputar dari browser (referer, atau signed URL basi), sementara
iframe lama sudah dibuang — jadi halaman Playly justru lebih rusak daripada sebelumnya.

Masuk ke rencana:
- Pemutar wajib punya **keadaan gagal yang terlihat** + tombol "Coba lagi" (ambil alamat
  baru), bukan layar hitam diam.
- Alamat diambil **saat diklik**, bukan saat halaman dirender, supaya tanda tangan 6 jam
  tidak pernah basi di dalam cache halaman (halaman `/playly` di-cache 300 detik).
- Diuji sungguhan di browser sebelum diklaim selesai.

Penyebab kedua: fitur diklik tapi **tidak terasa apa-apa** (Pencahayaan Sinematik terlalu
halus) → owner mengira rusak. Karena itu tiap item punya penanda hidup/mati yang jelas.

## Yang dikerjakan

| # | Berkas | Perubahan |
|---|---|---|
| 1 | `lib/playly.ts` | + `fetchPlaylyVideoUrl()` — ambil `videoUrl` dari `/api/public-video`, wajib https. Fungsi lama tidak diubah. |
| 2 | `app/api/playly/video/route.ts` | **BARU** — GET `?id=`; validasi id, **gerbang: id harus ada di daftar publik mitra** (video yang disembunyikan admin ditolak), balas JSON `{ videoUrl }`. Tidak menyalurkan byte. |
| 3 | `app/components/player/PlayerMenu.tsx` | **BARU** — popup menu titik tiga: 3 sakelar + 3 submenu + PIP. |
| 4 | `app/components/player/PlaylyPlayer.tsx` | **BARU** — `<video>` tanpa `controls` bawaan + kontrol sendiri + menu. |
| 5 | `app/components/PlaylyVideoGrid.tsx` | `EmbedPlayer` → `PlaylyPlayer`. |

## Yang TIDAK dibangun (sengaja)

- **Mesin Web Audio** untuk Volume Stabil & Penguat Suara — tanpa CORS ia tidak akan
  pernah jalan, jadi menulisnya = dead code (§3.1). Kedua item tampil dengan penanda
  "tidak tersedia untuk video ini" + alasannya.
- **Pembaca `variants` / `subtitles`** — bentuk isinya belum pernah terlihat terisi
  (9/9 kosong), jadi kodenya tidak bisa diuji. Membangunnya = menebak (§2.1).
- Perubahan apa pun pada `FeedPlayer`, `PlayerSettings`, `EmbedPlayer`.

## Yang ikut tersenggol

- **Halaman Discover** (`app/discover/page.tsx:81`) memakai `PlaylyVideoGrid` juga, jadi
  baris video Playly di sana ikut memakai pemutar baru. Penjaganya: tidak ada tes untuk
  grid ini — diperiksa manual di browser.
- **`EmbedPlayer` tetap dipakai** `ExternalVideoBrowser.tsx:118` dan
  `admin/PlaylyVideoPicker.tsx:223` → keduanya tidak berubah, berkasnya tidak disentuh.
- **Hitungan tayang di dashboard Playly** — dampak bisnis, sudah disetujui owner.

## Tahapan

1. Endpoint + fungsi pengambil alamat (berkas 1-2), diuji lewat curl.
2. Menu + pemutar (berkas 3-4).
3. Pasang di grid (berkas 5), uji di browser.
