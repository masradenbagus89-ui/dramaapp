# HANDOFF — lanjut di sini

> **Cara pakai:** buka tab chat baru, ketik **`lanjut dari handoff`**.
> AI wajib baca berkas ini **pertama**, lalu `antrean-deploy.md`.
>
> **AI:** tiap kali ada perbaikan / deploy / keputusan — **perbarui berkas ini di langkah terakhir**, sebelum bilang selesai. Jangan tumpuk sejarah panjang di sini; pindahkan yang lama ke `NEXT-SESSION.md`.

**Terakhir diisi:** 2026-08-16 malam

## Status sekarang (1 menit)

Situs hidup: **https://dramaapp.vercel.app** — commit terbaru yang sudah di-push: `8060f78`. Pantau Vercel untuk memastikan build deploy sukses.

**Tahap 1 redesign streaming** sudah **dual-push** ke `origin/main` dan `dramaku/main`:
- `1af6e12` feat(streaming): Tahap 1 redesign DramaApp
- `7bafe58` chore(kit): upgrade lintasAI kit v3 → v8
- `657a43f` Merge branch 'dramaku/main' (sambungan dashboard video rekan)
- `9b69055` chore(dev): dokumentasi rencana + AGENTS.local + helper lokal
- `58d5d55` docs(handoff): update status commit Tahap 1
- `8060f78` fix(hero): hero video di `/beranda` pakai `object-fit: contain` supaya tampil utuh, tidak terpotong

Database Supabase **tidak diubah**. Perubahan admin (password per admin / admin VIEWER) **sengaja tidak ikut** commit; masih di working tree.

## Yang baru saja diperbaiki

| Kapan | Apa | Hasil yang kamu rasakan |
|---|---|---|
| 2026-08-16 malam | Fix hero video: `object-fit: contain` di `/beranda` | Video teaser di banner atas tidak lagi terpotong, tampil utuh |
| 2026-08-16 malam | Commit + dual-push Tahap 1 redesign streaming | `origin/main` dan `dramaku/main` sudah sama di `8060f78` |
| 2026-08-16 malam | Verifikasi Tahap 1: build + test hijau | Situs bisa dibangun tanpa error sebelum di-push |
| 2026-08-16 sore | Hero hidup: kamera geser di poster (tunnel video mati), utamakan drama berseri, bukan film IMDb | Geser kiri/kanan di `/beranda` atau `/discover` — gambar bergerak seperti trailer, bukan foto kaku |
| 2026-08-16 siang | Tahap 1: homepage 16:9, baris Netflix, daftar episode, player (volume/0.5×/1080p/prev-next), lanjut dari menit terakhir | Buka `/beranda` lokal — banner + baris baru; nonton lalu berhenti → teks "Lanjut Menonton Episode X dari mm:ss" |
| 2026-08-15 malam | Deploy rilis rekan video API luar | Produksi belum berubah di sesi ini |

## Belum selesai / menunggu kamu

1. **Lanjut besok:** Tahap 2 redesign — perkaya `/discover` dengan filter tahun & rating IMDb, lalu ubah `/profile` jadi dashboard user lengkap (Lanjut Menonton, Favorit, Riwayat, Download, Pengaturan, Premium/Coin).
2. Pantau Vercel: commit `8060f78` sedang/sudah deploy.
3. Tahap 3: rekomendasi lebih pintar, coin/premium.
4. API key Playly yang valid (produksi) — masih menunggu rekan.
5. Perubahan admin (password per admin / admin VIEWER) masih di working tree — jangan di-push tanpa dipisah dulu.

## Jangan dilakukan

- Jangan commit `.env.local` / API key.
- Jangan `git push` dari working tree kotor tanpa izin.
- Jangan ganti tabel Supabase jadi `users`/`episodes`/`watch_history` — merusak koin & admin.

## Berkas terkait

- Rencana: [`docs/lintasai/rencana/2026-08-16-redesign-streaming-tahap-1.md`](./docs/lintasai/rencana/2026-08-16-redesign-streaming-tahap-1.md)
- Antrean: [`antrean-deploy.md`](./antrean-deploy.md)
- Arsip: [`NEXT-SESSION.md`](./NEXT-SESSION.md)
