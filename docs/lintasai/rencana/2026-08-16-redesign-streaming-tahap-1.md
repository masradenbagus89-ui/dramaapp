# Rencana: Redesign streaming DramaApp (Tahap 1)

- **Tanggal:** 2026-08-16
- **Diminta client:** Ubah DramaApp jadi platform streaming modern gabungan Melolo + IDLIX + Netflix, tanpa bikin aplikasi baru. Analisa dulu, jangan hapus fitur yang sudah jalan, daftar berkas, jelaskan sebelum coding, tetap kompatibel dengan Supabase yang ada.

## Ringkasan

DramaApp **sudah** punya tulang punggung streaming (beranda baris, detail drama, player swipe, riwayat, favorit, pencarian, admin, koin). Tahap 1 **memperkuat tampilan & pengalaman nonton** di 4 permukaan yang sudah ada: homepage `/beranda`, detail `/drama/[id]`, player `/feed/[id]`, riwayat `/history`. Skema Supabase **tidak diganti**; progress detik disimpan di localStorage dulu (format lama tetap terbaca).

## ✅ Terverifikasi (sudah dibaca di kode)

- Homepage penonton = `/beranda` (bukan `/`) — `app/beranda/page.tsx:12`
- Hero sudah ada (gambar lebar, judul, kategori, episode, sinopsis, tombol Tonton + Detail) — `app/beranda/page.tsx:38-90`
- Baris: Lanjut Nonton, Daftar Saya, Populer Minggu Ini, Baru Ditambahkan, kategori — `app/components/BerandaRows.tsx:115-149`
- Detail: banner, poster, judul, IMDb rating, genre, tahun, sinopsis, Tonton Eps 1, simpan/favorit, like, grid nomor episode — `app/drama/[id]/page.tsx`
- Player utama = `FeedPlayer` (swipe vertikal Melolo). `/watch/[id]/[ep]` **redirect** ke `/feed` — `app/watch/[id]/[ep]/page.tsx:4`
- Player sudah punya play/pause, seek, kecepatan 1–2×, resolusi Asli/720/480/360, subtitle, fullscreen, unduh, auto-lanjut — `app/components/player/PlayerSettings.tsx:10-19`
- Riwayat = localStorage `dramaku:progress` (episode + tanggal, **tanpa detik**) — `lib/progress.ts:4-15`
- Favorit = localStorage `lib/myList.ts`, halaman `/my-list`
- Pencarian + filter kategori = `/discover` + `DramaBrowser` — `app/components/DramaBrowser.tsx:23-34`
- Admin sudah: tambah/edit drama, poster, banner/hero, episode via scan, statistik katalog — `app/components/admin/`
- Tabel Supabase nyata: `dramas`, `likes`, `unlocks`, `wallets`, `app_data` — **bukan** `users` / `episodes` / `watch_history` / `favorites` — `docs/db.md:11-12`
- Kolom IMDb sudah ada di `dramas` (year, genre, imdb_rating, poster_image, hero_image) — `supabase_migrations/add_imdb_metadata_to_dramas.sql`
- Identitas visual: dark + emas amber, token di `app/globals.css:12-26`
- Working tree laptop tertinggal produksi + ada pekerjaan lokal belum commit (HANDOFF 2026-08-16)

## ❓ Asumsi (BELUM dikonfirmasi client)

- Pendekatan **A** (rekomendasi): perkuat hybrid yang sudah ada — Beranda = Netflix/IDLIX, Feed = Melolo, Discover = katalog. Bukan ganti player utama jadi landscape.
- 1080p ditampilkan di menu; kalau file `N.1080p.mp4` tidak ada, player kembali ke Asli (pola yang sama dengan 720p sekarang).
- Durasi episode diambil dari metadata video saat diputar (`video.duration`), bukan dari kolom DB (kolom itu belum ada).
- Rekomendasi Tahap 1 = aturan sederhana dari riwayat + favorit di perangkat ini ("Karena kamu suka Romance"), tanpa tabel baru.
- Coin / Premium / monetisasi **tidak disentuh** di Tahap 1 (sudah ada, Tahap 3).

## Yang TIDAK dibangun (sengaja)

- Aplikasi baru / ganti stack
- Tabel `users`, `episodes`, `watch_history`, `favorites` (akan merusak koin, unlock, admin, fallback JSON)
- Sinkron riwayat antar-HP (butuh sesi penonton server — roadmap Fase 3 terpisah)
- Download manager baru (unduh episode sudah ada di player)
- Panel admin baru dari nol
- Light mode
- Menyalin warna merah Netflix — identitas tetap **DramaKu emas di latar gelap**

## Yang ikut tersenggol

| Fitur/halaman lain yang memakai bagian ini | Sudah ada penjaganya? |
|---|---|
| Baris Lanjut Nonton di Beranda (`BerandaRows` + `ContentRow`) | ⚠️ tes `tests/progress.test.ts` ada; UI belum |
| Halaman `/history` + kartu riwayat | ⚠️ tes progress ada; UI belum |
| Feed swipe `/feed/[id]` (player bersama semua nonton) | ⚠️ tes video/seek/subtitle ada |
| Tombol Simpan / Daftar Saya | ⚠️ belum ada tes UI |
| `/watch/...` (redirect ke feed) | ⚠️ redirect saja — jangan dihapus |
| Admin, koin, unlock, login, iklan | tidak disentuh Tahap 1 |

## Lima kepala bahasan

1. **Alur pengguna:** buka Beranda → lihat banner + baris → klik drama → detail Netflix-style → Mulai Nonton / pilih episode → player → berhenti → kembali ke Beranda/Riwayat → teks "Lanjut Menonton Episode X dari mm:ss"
2. **Data & siapa boleh lihat:** katalog tetap dari tabel `dramas` (publik). Progress detik = localStorage perangkat ini (boleh tanpa login, seperti sekarang). Tidak baca riwayat orang lain.
3. **Kalau gagal:** poster/banner hilang → gradient cadangan. Video gagal → pesan yang sudah ada / sample. Progress gagal disimpan (storage penuh) → nonton tetap jalan, baris Lanjut kosong.
4. **Batas/skala:** katalog ratusan judul (sudah di-load utuh seperti sekarang). Baris homepage maks ~12 item. Progress 1 entri per drama (bukan per episode terpisah).
5. **Cara uji:** langkah klik di bawah + `npm test` (progress format lama tetap lulus) + `npx tsc --noEmit`

## Tahapan

1. **Tahap 1 (sesi ini, setelah kamu setuju):** redesign homepage, detail, player, riwayat + simpan detik
2. **Tahap 2:** rapikan favorit, search/filter (tahun/rating), dashboard profil — setelah Tahap 1 terbukti
3. **Tahap 3:** rekomendasi lebih pintar, coin/premium polish, monetisasi — setelah Tahap 2

## PRE-MORTEM

Kalau hasilnya nol guna: paling mungkin kita **membangun skema DB baru** atau **player baru** sehingga nonton/koin/admin yang sudah jalan malah rusak, sementara tampilan baru belum terasa beda. Mitigasi: hanya sentuh UI + `lib/progress.ts`; jangan rename kolom Supabase; jangan ganti `FeedPlayer` dengan library baru.

## Arah desain (wajib sebelum kode)

1. **Tujuan layar:** pilih drama cepat, lalu nonton tanpa pikir.
2. **Yang di-scan pertama:** poster + banner, baru judul/rating.
3. **Nada:** ekspresif gelap (hiburan), bukan dashboard kerja.
4. **Satu detail berkesan:** banner 16:9 + kartu poster dengan overlay rating/progress emas DramaKu.
5. **Batasan:** Tailwind 4 + token yang sudah ada; tanpa library animasi baru; `prefers-reduced-motion`; kontras ≥ 4,5:1; tombol ~44px.

## Langkah kerja Tahap 1 (setelah persetujuan)

1. Homepage: hero 16:9 + rating/tahun/genre + tombol Favorit; baris Trending / Terbaru / Populer / Rating Tertinggi / Lanjut / Rekomendasi sederhana / Favorit
2. Detail: daftar episode bergaya kartu (thumbnail poster, nomor, status ditonton); durasi tampil setelah pernah diputar atau "—"
3. Player: volume, 0.5×, 1080p di menu, tombol episode sebelumnya/berikutnya; simpan `positionSec` + persen
4. Riwayat + Lanjut Nonton: teks "Lanjut Menonton Episode X dari mm:ss"; resume ke detik itu
5. Tes progress format lama tetap hijau; typecheck

## Berkas yang akan diubah (Tahap 1)

| Berkas | Perubahan |
|---|---|
| `app/beranda/page.tsx` | Hero 16:9, rating/tahun, tombol Favorit |
| `app/components/BerandaRows.tsx` | Baris kategori sesuai brief |
| `app/components/ContentRow.tsx` | Card overlay + teks lanjut ber-detik |
| `app/components/DramaCard.tsx` / `Poster.tsx` | Card streaming (rating, hover) |
| `app/components/SaveButton.tsx` | Dipakai di hero |
| `app/drama/[id]/page.tsx` | Daftar episode kartu + status ditonton |
| `app/components/FeedPlayer.tsx` | Resume detik, prev/next, volume, simpan progress berkala |
| `app/components/player/PlayerControls.tsx` | Volume, prev/next |
| `app/components/player/PlayerSettings.tsx` | 0.5× + 1080p |
| `lib/progress.ts` | Field `positionSec` + persen; baca format lama |
| `app/history/page.tsx` + `HistoryCard.tsx` | Teks "dari mm:ss" |
| `lib/video.ts` | Dukung kode `1080p` (pola nama file yang sama) |
| `tests/progress.test.ts` | Tes format baru + kompatibilitas lama |
| `tests/video.test.ts` | URL 1080p |

Berkas **baru** (kalau perlu, kecil): `app/components/EpisodeRow.tsx` (daftar episode di detail).

## Berkas yang TIDAK diubah di Tahap 1

Admin, login/daftar, koin, Midtrans, `supabase_setup.sql`, tabel `wallets`/`unlocks`, landing `/`, `/shorts`, iklan.
