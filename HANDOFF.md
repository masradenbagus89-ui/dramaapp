# HANDOFF — lanjut di sini

> **Cara pakai:** buka tab chat baru, ketik **`lanjut dari handoff`**.
> AI wajib baca berkas ini **pertama**, lalu `antrean-deploy.md`.
>
> **AI:** tiap kali ada perbaikan / deploy / keputusan — **perbarui berkas ini di langkah terakhir**, sebelum bilang selesai. Jangan tumpuk sejarah panjang di sini; pindahkan yang lama ke `NEXT-SESSION.md`.

**Terakhir diisi:** 2026-08-16 malam

## Status sekarang (1 menit)

Situs hidup: **https://dramaapp.vercel.app** — commit `820abb8` (belum termasuk redesign + hero hidup).

**Tahap 1 redesign streaming** sudah di-commit dan siap dual-push:
- `1af6e12` feat(streaming): Tahap 1 redesign DramaApp
- `7bafe58` chore(kit): upgrade lintasAI kit v3 → v8
- `657a43f` Merge branch 'dramaku/main' (sambungan dashboard video rekan)
- `9b69055` chore(dev): dokumentasi rencana + AGENTS.local + helper lokal

Database Supabase **tidak diubah**. Perubahan admin (password per admin / admin VIEWER) **sengaja tidak ikut** commit; masih di working tree.

## Yang baru saja diperbaiki

| Kapan | Apa | Hasil yang kamu rasakan |
|---|---|---|
| 2026-08-16 malam | Verifikasi Tahap 1: build + test hijau, siap commit | Situs bisa dibangun tanpa error sebelum di-push |
| 2026-08-16 sore | Hero hidup: kamera geser di poster (tunnel video mati), utamakan drama berseri, bukan film IMDb | Geser kiri/kanan di `/beranda` atau `/discover` — gambar bergerak seperti trailer, bukan foto kaku |
| 2026-08-16 siang | Tahap 1: homepage 16:9, baris Netflix, daftar episode, player (volume/0.5×/1080p/prev-next), lanjut dari menit terakhir | Buka `/beranda` lokal — banner + baris baru; nonton lalu berhenti → teks "Lanjut Menonton Episode X dari mm:ss" |
| 2026-08-15 malam | Deploy rilis rekan video API luar | Produksi belum berubah di sesi ini |

## Belum selesai / menunggu kamu

1. **Deploy Tahap 1** — setelah commit & dual-push, pantau Vercel.
2. Tahap 2: search/filter tahun-rating, dashboard profil, favorit dipoles.
3. Tahap 3: rekomendasi lebih pintar, coin/premium.
4. API key Playly yang valid (produksi) — masih menunggu rekan.

## Jangan dilakukan

- Jangan commit `.env.local` / API key.
- Jangan `git push` dari working tree kotor tanpa izin.
- Jangan ganti tabel Supabase jadi `users`/`episodes`/`watch_history` — merusak koin & admin.

## Berkas terkait

- Rencana: [`docs/lintasai/rencana/2026-08-16-redesign-streaming-tahap-1.md`](./docs/lintasai/rencana/2026-08-16-redesign-streaming-tahap-1.md)
- Antrean: [`antrean-deploy.md`](./antrean-deploy.md)
- Arsip: [`NEXT-SESSION.md`](./NEXT-SESSION.md)
