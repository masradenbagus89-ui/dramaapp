# HANDOFF — lanjut di sini

> **Cara pakai:** buka tab chat baru, ketik **`lanjut dari handoff`**.
> AI wajib baca berkas ini **pertama**, lalu `antrean-deploy.md`.
>
> **AI:** tiap kali ada perbaikan / deploy / keputusan — **perbarui berkas ini di langkah terakhir**, sebelum bilang selesai. Jangan tumpuk sejarah panjang di sini; pindahkan yang lama ke `NEXT-SESSION.md`.

**Terakhir diisi:** 2026-08-17 siang

## Status sekarang (1 menit)

- Situs hidup: **https://dramaapp.vercel.app** — commit terbaru yang sudah di-push tetap `8060f78`.
- **Tahap 2 redesign selesai** di working tree: filter `/discover` (tahun, rating IMDb, urutan) dan dashboard `/profile` (Lanjut Menonton, Favorit, Riwayat Terbaru, Menu Cepat, Premium/Koin). Belum di-commit.
- **Revisi Hero cinematic** sudah di-commit sebagai `c2302dd`.
- Build lokal & test lulus (198 tests).
- Database Supabase **tidak diubah**.
- Perubahan admin (password per admin / admin VIEWER) **sengaja tidak ikut** commit; masih di working tree.

## Yang baru saja diperbaiki

| Kapan | Apa | Hasil yang kamu rasakan |
|---|---|---|
| 2026-08-17 siang | Tahap 2 redesign: filter discover + dashboard profile | Buka `/discover` → pilih tahun / rating IMDb / urutan; buka `/profile` → lihat baris Lanjut Menonton, Favorit, Riwayat Terbaru, menu cepat, dan saldo koin |
| 2026-08-17 siang | Commit revisi Hero Section cinematic `c2302dd` | Perubahan hero cinematic tersimpan di git, terpisah dari perubahan admin |
| 2026-08-17 pagi | Revisi Hero Section cinematic: background video memenuhi layar, judul lebih kecil di kiri dengan pecahan koma, info minimal (rating, episode, genre, status), tombol `Mulai Menonton` merah premium + `Tambah ke My List`, navigasi dots garis, transisi halus | `/beranda` dan `/discover` terasa seperti Netflix/IDLIX: fokus pada video, teks tidak menutupi karakter, gradient kiri kuat |
| 2026-08-16 malam | Fix hero video: `object-fit: contain` di `/beranda` | Video teaser di banner atas tidak lagi terpotong, tampil utuh |
| 2026-08-16 malam | Commit + dual-push Tahap 1 redesign streaming | `origin/main` dan `dramaku/main` sudah sama di `8060f78` |
| 2026-08-16 malam | Verifikasi Tahap 1: build + test hijau | Situs bisa dibangun tanpa error sebelum di-push |

## Belum selesai / menunggu kamu

1. Pantau Vercel: commit `8060f78` sedang/sudah deploy.
2. Commit + push Tahap 2 (butuh izin).
3. Tahap 3: rekomendasi lebih pintar, coin/premium polish.
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
