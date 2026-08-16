# Lanjutan Sesi Drama-App

**Terakhir update:** 2026-08-16 (HANDOFF.md + antrean-deploy.md jadi jembatan utama)

> **Titik lanjut tab baru:** `HANDOFF.md` (ketik `lanjut dari handoff`).
> **Cek commit rekan / antrian rilis:** `antrean-deploy.md`.
> Berkas ini = arsip lebih panjang. Tanda ❓ = belum diverifikasi ulang.

## WAJIB — Commit + Push dual remote (owner, 2026-08-11)

Setiap ada perubahan kode/docs yang layak disimpan, AI **WAJIB**:
1. **Commit** (aman: jangan sertakan `.env*`, `cookies.txt`, zip migrasi, artefak build).
2. **Push ke KEDUA** remote ini:
   - `https://github.com/ojokesusu/dramaku` → remote git: `dramaku`
   - `https://github.com/masradenbagus89-ui/dramaapp` → remote git: `origin`

Perintah tipikal setelah commit: `git push dramaku main` lalu `git push origin main`. Jangan anggap selesai kalau hanya satu remote yang ter-push.

## ⚠️ Koreksi remote (✅ terverifikasi 2026-08-15 lewat `git remote -v`)

Di folder kerja ini (`D:\Users\user26\Dramaapp`) **hanya ada SATU remote**:

- `origin` = `https://github.com/ojokesusu/dramaku.git`

Remote bernama `dramaku` **tidak ada**, dan repo `masradenbagus89-ui/dramaapp`
**belum terpasang sama sekali** di folder ini. Catatan lama di bawah menggambarkan
folder kerja berbeda (`user18`), jadi jangan dipakai sebagai patokan.

Akibatnya aturan dual-push di `AGENTS.md` **belum bisa dijalankan apa adanya** di
folder ini. Owner memilih push ke `ojokesusu/dramaku` saja (2026-08-15). Kalau repo
kedua masih dipakai → pasang remote-nya dulu; kalau sudah tidak dipakai → perbarui
`AGENTS.md` supaya dokumennya tidak menyesatkan.

Identitas commit di-set **lokal** (bukan global), sama dengan commit sebelumnya:
`masradenbagus89-ui <zyyherlambang@gmail.com>`.

## Kondisi lama soal remote (per 2026-08-11 — ❓ tidak akurat untuk folder ini)

- Catatan lama menyebut dual remote `dramaku` + `origin`. Lihat koreksi di atas.

## Kondisi terkini (✅ terverifikasi 2026-07-23)

- Lokasi project: `D:\Users\user18\dramaapp` (catatan lama menyebut `C:\Users\user18\dramaapp` — pakai yang di drive D:).
- `git` TERINSTALL dan dipakai normal di mesin ini (catatan lama bilang tidak ada — sudah tidak berlaku).
- Kit lintasAI: **v3.0.0** terpasang bersih (v2.9.0 lama dihapus total: `.claude-kit/`, `.kimi-code/`, `CLAUDE.md`, `AGENTS.md` lama, pengait `.claude/settings.json`, 27 panduan bawaan di `docs/`).
- Dokumen asli proyek UTUH di `docs/`: `architecture.md`, `auth.md`, `payments.md`, `wallet.md`, `db.md`, `data-layer.md`, `glossary.md`, `decisions/`, dll.
- Stack: Next.js + React, npm. Jalan lokal: `npm install` lalu `npm run dev`.

## Yang terakhir dikerjakan (2026-07-23)

- Migrasi kit lintasAI v2.9.0 → v3.0.0: SELESAI + terverifikasi 3 sumber (`package.json` kit, `.install-manifest.json`, `CHANGELOG.md`).
- Jebakan yang ditemukan: `npm create lintasai@latest` bisa memasang versi BASI dari cache npm. Solusi pasti: pin versi persis, mis. `npx lintasai@3.0.0 init`.

## Yang terakhir dikerjakan (2026-08-15 malam — deploy rilis video API)

- Rilis rekan (2 jalur terima video dari API luar) dipindah dari `ojokesusu/dramaku` ke `masradenbagus89-ui/dramaapp` lalu di-deploy Vercel.
- Produksi: `https://dramaapp.vercel.app` = commit `820abb8` (deployment `dpl_AW6Vgzn9jkqhMCrHkQAHz8Uu74xj`).
- Build pertama (`8880c5a`) GAGAL: font Playfair Google woff2 v40 404. Perbaikan: lepas `next/font/google` Playfair, judul pakai Georgia.
- Smoke test: `/discover` 200 tanpa "Video terbaru"; `/api/videos` 503; `/api/external-videos` 503; `?page=abc` 400; `/beranda`+`/login` 200.
- Rollback: Vercel → Promote deployment 14 Agustus (`954c9ca` / `dpl_2sPEPBnAMZe2jrkJuvHMvx8sZfuC`).
- Folder lokal `D:\Users\user18\dramaapp` MASIH di `954c9ca` + working tree kotor (pekerjaan admin/riwayat). Jangan `git push` dari sini sebelum di-stash/commit terpisah.
- Rencana: `docs/lintasai/rencana/2026-08-15-deploy-jalur-video-api.md`

## Yang terakhir dikerjakan (2026-08-15)

- Bug: email sudah di Kelola Admin tapi lencana tetap VIEWER. Penyebab: sesi penonton di browser tidak ikut berubah; login admin butuh password admin (bukan password saat daftar).
- Perbaikan UX: pesan tambah-admin, password awal opsional, banner "masuk ulang" di header, pesan error login lebih jelas.
- Rencana: `docs/lintasai/rencana/2026-08-15-admin-tetap-viewer.md`
- Tes: `npm test` 104 lulus.

## Yang terakhir dikerjakan (2026-08-14)

- Generate metadata IMDb diperkuat ke JSON kontrak: title, year, poster, banner, genre[], rating, runtime, country, language, description, director, writers[], stars[], plus episodeCount untuk series.
- Sumber tetap OMDb (bukan scrape IMDb). Banner lebar opsional lewat `TMDB_API_KEY`.
- Admin: preview + JSON + Isi form. Halaman `/drama/[id]` tampilkan genre pill, negara, bahasa.
- Migrasi SQL (jalankan di Supabase sebelum Simpan drama memakai negara/bahasa): `supabase_migrations/add_imdb_country_language.sql`
- Tes: `npm test` 86 lulus. Rencana: `docs/lintasai/rencana/2026-08-14-imdb-metadata-json.md`

## Yang terakhir dikerjakan (2026-08-07)

- Fitur **generate draft drama dari IMDb** sudah di-*wire* ke UI admin:
  - Backend: `lib/imdb-tool.ts` + `app/api/generate-from-imdb/route.ts` (sudah ada sebelum sesi).
  - Frontend: `app/components/admin/DramaForm.tsx` ditambahkan blok input ID IMDb → fetch draft → preview poster/judul/sinopsis → tombol **Isi form ini** mengisi judul, slug, sinopsis, poster, hero, dan kategori (kalau cocok).
  - Status: `tsc --noEmit` lulus dan `npm run build` lulus (route `/api/generate-from-imdb` terdaftar).
- Prasyarat agar fitur jalan: `OMDB_API_KEY` di `.env.local` harus diisi (daftar gratis di omdbapi.com/apikey.aspx).

## Yang terakhir dikerjakan (2026-08-15) — jalur terima video dari API luar

Commit `6bb2539`, sudah ter-push ke `ojokesusu/dramaku`. Ada **dua jalur terpisah**;
pemutar lama (video `.mp4` dari PC backup lewat `lib/video.ts`) TIDAK disentuh.

| Jalur | Untuk apa | Berkas inti | Setelan wajib |
|---|---|---|---|
| **A — dashboard upload** (playly-dashboard) | berkas `.mp4` di Supabase Storage, diputar tag `<video>` (kendali putar tetap milik kita) | `lib/dashboard-videos.ts`, `app/api/videos/`, `DashboardVideoGrid.tsx`, disisipkan di `/discover` | `DASHBOARD_API_URL` |
| **B — API pihak lain** | player milik penyedia lewat `<iframe>` | `lib/external-video.ts`, `app/api/external-videos/`, `EmbedPlayer.tsx`, halaman `/video-eksternal` | `EXTERNAL_VIDEO_API_URL` + `EXTERNAL_VIDEO_EMBED_HOSTS` |

Panduan lengkap: `docs/sambungan-dashboard-webmovie.md` · `docs/video-eksternal.md`.
Semua nama setelan sudah terdaftar di `.env.example` beserta akibat kalau dikosongkan.

**✅ Terverifikasi 2026-08-15:** `npm test` 131 lulus (13 berkas) · `tsc --noEmit`
bersih · uji hidup lewat API tiruan di port 3013 → jalur A `count=2 skipped=1`,
jalur B `count=3 skipped=2`, halaman `/discover` + `/video-eksternal` HTTP 200,
gerbang parameter menolak `page=abc` dan `q` >100 karakter dengan 400.

**❓ BELUM terverifikasi:** sambungan ke dashboard ASLI dan API penyedia ASLI —
dua-duanya belum ada alamatnya. Kode siap-tempel untuk sisi dashboard ada di
`docs/dashboard-api-videos/` dan **belum pernah dijalankan** (repo dashboard di
komputer lain).

**Sisa pekerjaan yang sudah diketahui:**
1. Isi `DASHBOARD_API_URL` (Vercel → Settings → Environment Variables → **deploy ulang**).
2. Pasang endpoint `GET /api/videos` di playly-dashboard (salin dari `docs/dashboard-api-videos/`).
3. Dua API tiruan (`app/api/demo-dashboard-videos/`, `app/api/demo-video-provider/`)
   ikut ter-deploy dan bisa diakses publik. Isinya cuma data contoh, tapi sebaiknya
   dimatikan di produksi atau dihapus setelah server asli siap.

## Catatan lama — ❓ BELUM diverifikasi ulang (per 2026-05-14)

- Rencana deploy ke Vercel (akun GitHub `masradenbagus89-ui`) — statusnya belum dicek lagi.
- Blocker akses publik lama: port 3002 di-block firewall; proxy `127.0.0.1:8806` menolak tunnel (ngrok/cloudflared/localtunnel semua gagal per 2026-05-14).
- File video TIDAK ada di repo (sengaja, `.gitignore` — limit GitHub 100 MB/file); rencana lama: pindah ke Cloudflare R2. Folder `public/posters/` (25 poster) ADA di repo.
