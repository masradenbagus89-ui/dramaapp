# Rencana: tambah "Film" (1 video utuh, tanpa episode) di panel admin

- **Tanggal:** 2026-08-25
- **Diminta client:** "selama ini ketika add drama selalu yang pakai episode, sekarang atasan juga mau add full film yang tidak pakai episode, bisa kamu tambahkan yang tidak ada episode"

## Ringkasan

Panel admin sekarang selalu menganggap tiap judul = serial berepisode: kolom **Jumlah episode**
wajib diisi, halaman detail selalu menampilkan daftar "Episode 1, 2, 3…", dan kartu di beranda
selalu menulis "12 eps". Yang dibangun: **penanda jenis tayangan** — *Serial* (seperti sekarang)
atau *Film* (satu video utuh). Kalau admin memilih **Film**, kolom jumlah episode hilang dari form
(sistem mengunci 1 video), halaman detail tidak lagi menampilkan daftar episode, kartu menulis
"Film", dan di pemutar tombol "Eps 1/1" + tombol pindah episode disembunyikan.

Keputusan client lewat popup 2026-08-25: **(1)** film untuk sekarang **100% gratis** — centang
"berbayar (koin)" otomatis disembunyikan & dimatikan untuk film; **(2)** kalau nanti film dibuat
berbayar, harga acuan **20 koin** (belum dikerjakan sekarang); **(3)** film **campur** dengan drama
di Beranda/Discover, dibedakan hanya lewat tulisan "Film" di kartu — belum ada saringan/menu khusus.

## ✅ Terverifikasi (sudah dibaca di kode)

- Form admin mewajibkan episode ≥ 1, tanpa pilihan jenis tayangan — `app/components/admin/DramaForm.tsx:713-733`
- API simpan drama menolak episode < 1 untuk SEMUA judul — `app/api/admin/drama/route.ts:92-95`
- Halaman detail selalu memasang daftar episode saat `episodes > 0` — `app/drama/[id]/page.tsx:242-253`
- Kartu katalog menulis "N eps" — `app/components/DramaCard.tsx:33`, `app/shorts/page.tsx:56`,
  `app/components/admin/DramaList.tsx:63`; hero menulis "N Episode" — `app/components/HomeHero.tsx:166`
- Data terstruktur untuk Google selalu `"@type": "TVSeries"` + `numberOfEpisodes` — `lib/structured-data.ts:16-22`
- Pemutar membangun slide dari jumlah episode & menampilkan "Eps x / y" + tombol Episode —
  `app/components/FeedPlayer.tsx:55`, `app/components/player/PlayerControls.tsx:77-81,191-196`
- **Aturan koin:** episode 1–3 selalu gratis (`FREE_EPISODES = 3`) — `lib/coins.ts:17,51,76`.
  Artinya film (1 video = "episode 1") **tetap gratis walau dicentang berbayar** → centang itu akan
  berbohong ke admin kalau dibiarkan tampil.
- Tabel Supabase `dramas` memakai kolom eksplisit (bukan JSON bebas) — `lib/dramas.ts:31-56`,
  jadi field baru **wajib** lewat migration SQL; polanya sudah ada di `supabase_migrations/add_imdb_country_language.sql`
- Istilah `kind` dengan nilai `"movie" | "series"` SUDAH dipakai di repo ini untuk hasil OMDb —
  `lib/imdb-tool.ts:49,159-164` → nama yang sama dipakai ulang (satu konsep = satu nama)

## ❓ Asumsi (BELUM dikonfirmasi client)

- Berkas film di PC backup tetap bernama **`1.mp4`** di dalam folder `<drama-id>/`, sama seperti
  episode pertama serial. Alasan: agent hardlink + endpoint scan + pemutar semuanya sudah memakai
  pola `<angka>.mp4` (`app/api/admin/scan/route.ts:50`); mengubahnya berarti menyentuh 3 tempat
  tanpa manfaat tambahan.
- Subtitle film memakai pola nama yang sama: `1.id.vtt`, `1.en.vtt`.
- Film lama/serial lama tidak perlu dikonversi — semua judul yang sudah ada tetap Serial.

## Yang TIDAK dibangun (sengaja, biar tak salah harap)

- **Film berbayar pakai koin** (termasuk "X menit pertama gratis"). Client memilih "gratis dulu".
  Kalau nanti diminta: perlu aturan kunci baru untuk film di `lib/coins.ts` + harga 20 koin.
- **Saringan "Film saja"** di Discover dan **menu Film** terpisah di navigasi atas.
- Trailer/preview film, multi-part film (film dengan 2 bagian), dan season/musim untuk serial.
- Konversi otomatis judul lama menjadi Film.

## Yang ikut tersenggol

| Fitur/halaman lain yang memakai bagian ini | Sudah ada penjaganya? |
|---|---|
| Simpan/ubah SEMUA drama (bukan cuma film) — kolom database `dramas` bertambah 1 | ⚠️ belum ada tes; dijaga urutan rilis: SQL dulu, kode belakangan |
| Halaman detail drama (daftar episode) | ⚠️ belum ada tes tampilan; dicek manual + `tsc`/`build` |
| Kartu drama di Beranda, Discover, Shorts, Riwayat, panel admin | ⚠️ belum ada tes tampilan |
| Pemutar video (`/feed/<id>`) — tombol episode & geser-atas | ⚠️ belum ada tes tampilan |
| Data terstruktur Google (SEO) di halaman detail | ✅ tes baru ditambahkan (`tests/drama-kind.test.ts`) |
| Jalur koin/paywall | ✅ tidak berubah — film dipaksa gratis di server; `tests/coins.test.ts` tetap hijau |

## Lima kepala bahasan (fitur BARU)

1. **Alur pengguna:** Admin → panel admin → *Tambah Drama* → pilih **Jenis tayangan: Film** → kolom
   "Jumlah episode" hilang, centang berbayar hilang → isi judul/kategori/sinopsis → *Scan &
   auto-hardlink* memastikan `1.mp4` ada → *Simpan drama*. Penonton: kartu bertuliskan "Film" →
   halaman detail tanpa daftar episode → tombol *Mulai Nonton* → video langsung jalan, tanpa
   tombol pindah episode.
2. **Data & siapa boleh lihat:** satu kolom baru `kind` di tabel `dramas` (isi `'series'` atau
   `'movie'`, default `'series'`). Bukan data pribadi. Yang boleh menulis: admin terverifikasi
   server-side (`isAdminRequest`) — tidak berubah dari sekarang. Yang boleh membaca: publik, sama
   seperti judul/poster.
3. **Kalau gagal:** (a) kolom `kind` belum dibuat di Supabase → penyimpanan drama gagal; API
   menerjemahkan error PostgREST jadi pesan Indonesia yang menyebut berkas SQL-nya, bukan error
   mentah. (b) berkas `1.mp4` belum ada di PC backup → tombol Scan sudah memberi pesan folder/berkas
   belum siap (perilaku lama, tidak diubah). (c) tunnel PC backup mati → pesan lama tetap muncul.
4. **Batas/skala:** tidak menambah query maupun kolom yang di-scan; 1 kolom teks per baris. Tidak ada
   batas baru pada jumlah judul.
5. **Cara uji:** klik sendiri (admin → Tambah Drama → pilih Film → simpan → buka halaman drama:
   tidak ada daftar episode, kartu tertulis "Film") + tes otomatis `tests/drama-kind.test.ts`
   (penanda film, data terstruktur `Movie`, film dipaksa 1 video & gratis).

## Pre-mortem (1 kalimat)

Semua ini selesai tapi **nol guna** kalau kolom `kind` belum dijalankan di Supabase produksi — bukan
cuma film yang gagal disimpan, **semua** penyimpanan drama ikut gagal karena kode mengirim kolom yang
tidak ada → karena itu urutannya dikunci: **jalankan SQL dulu, deploy kode sesudahnya**, dan pesan
errornya diterjemahkan supaya admin tahu apa yang harus dilakukan.

## Tahapan

1. **Tahap 1 (dikerjakan sekarang):** jenis tayangan Serial/Film + tampilan penonton + SEO + tes.
2. **Tahap 2 (kalau nanti diminta):** film berbayar 20 koin (dengan atau tanpa preview gratis) +
   saringan "Film" di Discover.

## Langkah kerja

1. `supabase_migrations/add_kind_to_dramas.sql` — `alter table … add column if not exists kind text not null default 'series'` (dijalankan owner di Supabase SQL Editor).
2. `lib/types.ts` — field `kind?: "series" | "movie"` + helper `isMovie()` sebagai satu-satunya sumber kebenaran.
3. `lib/dramas.ts` — pemetaan kolom `kind` ↔ objek Drama (baris lama tanpa kolom = Serial).
4. `app/api/admin/drama/route.ts` — terima `kind`; film → `episodes` dipaksa 1 & `premium` dibuang (di SERVER, bukan cuma disembunyikan di form); terjemahkan error "kolom belum ada".
5. `app/admin/page.tsx` + `app/components/admin/DramaForm.tsx` — pemilih jenis tayangan + sembunyikan kolom episode/berbayar untuk film + draft IMDb bertipe movie ikut memilih Film.
6. Tampilan penonton: `app/drama/[id]/page.tsx`, `app/components/DramaCard.tsx`, `app/shorts/page.tsx`, `app/components/HomeHero.tsx`, `app/components/admin/DramaList.tsx`.
7. Pemutar: `app/feed/[id]/page.tsx` → `FeedPlayer` → `PlayerControls` (sembunyikan tombol episode & petunjuk geser-atas).
8. SEO: `lib/structured-data.ts` — film pakai `"@type": "Movie"` tanpa `numberOfEpisodes`.
9. `tests/drama-kind.test.ts` + jalankan seluruh tes, `tsc --noEmit`, `next build`.
