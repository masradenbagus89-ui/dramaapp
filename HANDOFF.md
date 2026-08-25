# HANDOFF — lanjut di sini

> **Cara pakai:** buka tab chat baru, ketik **`lanjut dari handoff`**.
> AI wajib baca berkas ini **pertama**, lalu `antrean-deploy.md`.
>
> **AI:** tiap kali ada perbaikan / deploy / keputusan — **perbarui berkas ini di langkah terakhir**, sebelum bilang selesai. Jangan tumpuk sejarah panjang di sini; pindahkan yang lama ke `NEXT-SESSION.md`.

**Terakhir diisi:** 2026-08-25

## Status sekarang (1 menit)

- Situs hidup: **https://dramaapp.vercel.app** — menjalankan `main` = **`617f6a0`**.
- **Branch aktif sekarang: `feat/playly-integrasi`** (commit `ecc0263` + perbaikan hari ini yang belum di-commit).
- ⚠️ **Integrasi Playly BELUM ADA di produksi.** `/admin/videos/playly` masih **404**
  di situs — fiturnya belum pernah digabung ke `main`.
- Branch ini tertinggal ~8 commit dari `main` (pekerjaan `pc-backup` 19–22 Agustus).
  Merge/rebase dulu sebelum rilis.

## ⚠️ NAMA REMOTE SUDAH BERTUKAR — cek sebelum push

Catatan lama di `AGENTS.local.md` sudah **basi**. Kondisi nyata 2026-08-25:

| Nama remote | Repo | Dipantau Vercel? |
|---|---|---|
| `dramaapp` | `masradenbagus89-ui/dramaapp` | **Ya — ini tombol rilis** |
| `origin` | `ojokesusu/dramaku` | Tidak |

Remote bernama `dramaku` **sudah tidak ada** (`git fetch dramaku` → error).
Keduanya sama-sama di `617f6a0`, jadi tidak ada rilis tertinggal.

## Kenapa video Playly tidak muncul — LIMA lapis (semua sudah dilacak)

Owner sudah meng-upload 15 video di dashboard Playly, tapi di DramaKu kosong.
Penyebabnya berlapis; memperbaiki satu saja tidak mengubah apa pun.

| # | Masalah | Status |
|---|---|---|
| 1 | Fitur Playly **belum di-deploy** — halaman 404 di produksi | ⏳ **menunggu izin rilis** |
| 2 | Pola alamat pemutar ditebak `/embed/{id}`, aslinya `/id/{id}/embed` | ✅ diperbaiki |
| 3 | Playly mengirim `embedUrl` **relatif**; penerjemah hanya menerima `https://…` → semua video dibuang | ✅ diperbaiki |
| 4 | Kunci `plyk_…` **ditolak Playly** (`invalid_key`) & tersimpan di variabel salah | ✅ ada jalan pintas (katalog publik) |
| 5 | Playly hanya izinkan embed dari domain mitra terdaftar | ✅ `dramaapp.vercel.app` **sudah terdaftar** |

Rincian + bukti: [`docs/lintasai/rencana/2026-08-25-playly-video-tidak-muncul.md`](./docs/lintasai/rencana/2026-08-25-playly-video-tidak-muncul.md)

## Yang baru saja dikerjakan

| Kapan | Apa | Hasil yang kamu rasakan |
|---|---|---|
| 2026-08-25 | **Perbaikan integrasi Playly** (belum di-commit) | Daftar video Playly terisi **15 video** (dulu 0), bisa dipilih, dan videonya **terbukti berputar** |
| 2026-08-18 | Tahap 7: kode pemulihan (`1ce14c3`) | Lupa password → pulih pakai kode, tanpa email |
| 2026-08-18 | Tahap 6: login penonton aman (`b48bf32`) | Koin & komentar orang lain tak bisa disentuh |

## Cara kerja Playly setelah perbaikan (yang perlu diketahui)

- **Dua sumber daftar video.** Kalau kunci mitra belum ada / ditolak, daftar
  diambil dari **katalog publik** Playly (`/api/catalog`) supaya halaman admin
  tidak buntu. Halaman admin menampilkan pita kuning yang menyebutkan hal ini
  apa adanya. Playly mati / timeout **tetap** dilaporkan sebagai error.
- **Kunci mitra diterbitkan pengelola Playly**, tidak bisa dibuat sendiri.
  Kunci yang sekarang ada di `.env.local` (di variabel `DASHBOARD_API_KEY`)
  sudah diuji ke Playly asli dan **ditolak**.
- **Video Playly tidak bisa dicoba dari `localhost`** — Playly menolak domain
  yang belum terdaftar dengan halaman "🔒 Situs ini belum diizinkan". Ini normal.
  Ujilah lewat `dramaapp.vercel.app` yang sudah terdaftar.

## Belum selesai / menunggu kamu

1. **IZIN RILIS** — gabungkan `feat/playly-integrasi` ke `main` lalu push ke
   remote **`dramaapp`**. Tanpa ini halaman Playly tetap 404 di situs.
2. **`PLAYLY_ENCRYPTION_KEY` di Vercel** — wajib ada sebelum kunci mitra bisa
   disimpan lewat halaman setelan. Sudah ada di `.env.local`, **belum dicek di Vercel**.
3. **Kunci `plyk_` yang valid** — minta ke pengelola Playly (yang ada sekarang ditolak).
   Tanpa ini fitur tetap jalan lewat katalog publik.
4. `.env.local` lokal masih berisi `SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co`
   (placeholder) → `npm run build` lokal gagal. Jalankan dengan `SUPABASE_URL=` kosong
   untuk mode file, atau isi nilai aslinya.
5. Sinopsis drama dari OMDb masih berbahasa Inggris.
6. Daftarkan sitemap ke Google Search Console (tertunda sejak Tahap 4).

## Jangan dilakukan

- Jangan `git push` ke remote **`dramaapp`** tanpa izin — itu tombol rilis.
- Jangan commit `.env.local` / API key / `cookies.txt`.
- Jangan anggap "tes lulus" = "tersambung ke Playly". 46 tes Playly lulus sejak
  awal padahal integrasinya tidak pernah jalan — semua tesnya memakai bentuk data
  karangan. Tes baru sekarang memakai bentuk balasan Playly ASLI.
- Jangan ganti pola `/id/{id}/embed` tanpa mengecek ulang ke katalog Playly.
- Jangan simpan kode pemulihan sebagai teks asli di mana pun.
- Jangan ganti tabel Supabase jadi `users`/`episodes`/`watch_history`.
- Jangan pakai `getAllDramasCached`/`getDramaCached` di jalur koin, admin, atau tulis.

## Berkas terkait

- Rencana Playly (2026-08-25): [`docs/lintasai/rencana/2026-08-25-playly-video-tidak-muncul.md`](./docs/lintasai/rencana/2026-08-25-playly-video-tidak-muncul.md)
- Panduan Playly: [`docs/playly-integrasi.md`](./docs/playly-integrasi.md)
- Antrean: [`antrean-deploy.md`](./antrean-deploy.md)
- Arsip: [`NEXT-SESSION.md`](./NEXT-SESSION.md)
