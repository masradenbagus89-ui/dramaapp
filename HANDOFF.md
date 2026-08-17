# HANDOFF — lanjut di sini

> **Cara pakai:** buka tab chat baru, ketik **`lanjut dari handoff`**.
> AI wajib baca berkas ini **pertama**, lalu `antrean-deploy.md`.
>
> **AI:** tiap kali ada perbaikan / deploy / keputusan — **perbarui berkas ini di langkah terakhir**, sebelum bilang selesai. Jangan tumpuk sejarah panjang di sini; pindahkan yang lama ke `NEXT-SESSION.md`.

**Terakhir diisi:** 2026-08-17 sore

## Status sekarang (1 menit)

- Situs hidup: **https://dramaapp.vercel.app** — commit terbaru yang sudah di-push: `3007a73` (admin password per akun).
- **Semua tahap redesign selesai**: Tahap 1 (homepage/player), Tahap 2 (discover/profile), Tahap 3 (rekomendasi/koin/iklan).
- Build lokal & test lulus (212 tests).
- Database Supabase **tidak diubah**.
- Working tree bersih — tidak ada perubahan tertinggal.

## Yang baru saja diperbaiki

| Kapan | Apa | Hasil yang kamu rasakan |
|---|---|---|
| 2026-08-17 sore | Push perubahan admin (password per admin + role VIEWER) | Admin bisa set password awal saat tambah kolega; pesan login lebih jelas; `origin/main` di `3007a73` |
| 2026-08-17 sore | Tahap 3 redesign: rekomendasi pintar + coin polish + monetisasi | Beranda menampilkan "Karena kamu menonton X" dan "Trending di genre kamu"; paywall punya tombol "Buka semua episode"; profil menampilkan riwayat koin; iklan muncul di antara baris dan detail |
| 2026-08-17 siang | Push Tahap 2 ke origin | `origin/main` diperbarui ke `00f0d2e` |
| 2026-08-17 siang | Tahap 2 redesign: filter discover + dashboard profile | Buka `/discover` → pilih tahun / rating IMDb / urutan; buka `/profile` → lihat baris Lanjut Menonton, Favorit, Riwayat Terbaru, menu cepat, dan saldo koin |
| 2026-08-17 siang | Commit revisi Hero Section cinematic `c2302dd` | Perubahan hero cinematic tersimpan di git, terpisah dari perubahan admin |

## Belum selesai / menunggu kamu

1. Pantau Vercel untuk commit terbaru (`3007a73`).
2. API key Playly yang valid (produksi) — masih menunggu rekan.
3. Fitur berikutnya (pilih): notifikasi/engagement, download offline, social features, atau performance/SEO.

## Jangan dilakukan

- Jangan commit `.env.local` / API key.
- Jangan `git push` dari working tree kotor tanpa izin.
- Jangan ganti tabel Supabase jadi `users`/`episodes`/`watch_history` — merusak koin & admin.

## Berkas terkait

- Rencana: [`docs/lintasai/rencana/2026-08-16-redesign-streaming-tahap-1.md`](./docs/lintasai/rencana/2026-08-16-redesign-streaming-tahap-1.md)
- Antrean: [`antrean-deploy.md`](./antrean-deploy.md)
- Arsip: [`NEXT-SESSION.md`](./NEXT-SESSION.md)
