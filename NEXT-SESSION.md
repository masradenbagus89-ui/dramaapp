# Lanjutan Sesi Drama-App

**Terakhir update:** 2026-08-07 (sesi wiring fitur IMDb generator)

> Berkas ini = JEMBATAN antar-sesi AI. Baca pertama di awal sesi baru supaya
> langsung nyambung tanpa mencari ulang. Perbarui di akhir sesi kalau ada
> progres/keputusan penting. Tanda ❓ = belum diverifikasi ulang.

## Kondisi terkini (✅ terverifikasi 2026-07-23)

- Lokasi project: `D:\Users\user18\dramaapp` (catatan lama menyebut `C:\Users\user18\dramaapp` — pakai yang di drive D:).
- `git` TERINSTALL dan dipakai normal di mesin ini (catatan lama bilang tidak ada — sudah tidak berlaku).
- Kit lintasAI: **v3.0.0** terpasang bersih (v2.9.0 lama dihapus total: `.claude-kit/`, `.kimi-code/`, `CLAUDE.md`, `AGENTS.md` lama, pengait `.claude/settings.json`, 27 panduan bawaan di `docs/`).
- Dokumen asli proyek UTUH di `docs/`: `architecture.md`, `auth.md`, `payments.md`, `wallet.md`, `db.md`, `data-layer.md`, `glossary.md`, `decisions/`, dll.
- Stack: Next.js + React, npm. Jalan lokal: `npm install` lalu `npm run dev`.

## Yang terakhir dikerjakan (2026-07-23)

- Migrasi kit lintasAI v2.9.0 → v3.0.0: SELESAI + terverifikasi 3 sumber (`package.json` kit, `.install-manifest.json`, `CHANGELOG.md`).
- Jebakan yang ditemukan: `npm create lintasai@latest` bisa memasang versi BASI dari cache npm. Solusi pasti: pin versi persis, mis. `npx lintasai@3.0.0 init`.

## Yang terakhir dikerjakan (2026-08-07)

- Fitur **generate draft drama dari IMDb** sudah di-*wire* ke UI admin:
  - Backend: `lib/imdb-tool.ts` + `app/api/generate-from-imdb/route.ts` (sudah ada sebelum sesi).
  - Frontend: `app/components/admin/DramaForm.tsx` ditambahkan blok input ID IMDb → fetch draft → preview poster/judul/sinopsis → tombol **Isi form ini** mengisi judul, slug, sinopsis, poster, hero, dan kategori (kalau cocok).
  - Status: `tsc --noEmit` lulus dan `npm run build` lulus (route `/api/generate-from-imdb` terdaftar).
- Prasyarat agar fitur jalan: `OMDB_API_KEY` di `.env.local` harus diisi (daftar gratis di omdbapi.com/apikey.aspx).

## Catatan lama — ❓ BELUM diverifikasi ulang (per 2026-05-14)

- Rencana deploy ke Vercel (akun GitHub `masradenbagus89-ui`) — statusnya belum dicek lagi.
- Blocker akses publik lama: port 3002 di-block firewall; proxy `127.0.0.1:8806` menolak tunnel (ngrok/cloudflared/localtunnel semua gagal per 2026-05-14).
- File video TIDAK ada di repo (sengaja, `.gitignore` — limit GitHub 100 MB/file); rencana lama: pindah ke Cloudflare R2. Folder `public/posters/` (25 poster) ADA di repo.
