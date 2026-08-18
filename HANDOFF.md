# HANDOFF — lanjut di sini

> **Cara pakai:** buka tab chat baru, ketik **`lanjut dari handoff`**.
> AI wajib baca berkas ini **pertama**, lalu `antrean-deploy.md`.
>
> **AI:** tiap kali ada perbaikan / deploy / keputusan — **perbarui berkas ini di langkah terakhir**, sebelum bilang selesai. Jangan tumpuk sejarah panjang di sini; pindahkan yang lama ke `NEXT-SESSION.md`.

**Terakhir diisi:** 2026-08-18

## Status sekarang (1 menit)

- Situs hidup: **https://dramaapp.vercel.app** — commit terbaru `02efb6a` sudah di-push ke `origin` + `dramaku`.
- **Belum diverifikasi:** apakah build Vercel untuk `02efb6a` sudah Ready — perlu dicek di dashboard.
- Build lokal & test lulus (212 tests). Database Supabase **tidak diubah**.
- Repo `dramaku` sudah disamakan sampai `0100a66` (utang dual-push 6 commit sudah dibayar).

## Yang baru saja dikerjakan

| Kapan | Apa | Hasil yang kamu rasakan |
|---|---|---|
| 2026-08-18 | **Tahap 4: Performance & SEO** (`332b23f`) | Tiap drama punya judul sendiri di Google (dulu semua judulnya sama); situs punya sitemap 42 URL + robots.txt; link yang di-share ke WhatsApp/FB kini tampil gambar; halaman publik di-cache 60 detik jadi jauh lebih cepat |
| 2026-08-18 | Pengaman `.gitignore` (`a36bc67`) | `cookies.txt` berisi token login admin tak bisa lagi ter-commit tak sengaja ke repo publik |
| 2026-08-18 | Dual push ke `dramaku` | Cadangan repo tak lagi tertinggal 6 commit |
| 2026-08-17 sore | Push perubahan admin (password per admin + role VIEWER) | Admin bisa set password awal saat tambah kolega |

## Belum selesai / menunggu kamu

1. **Cek dashboard Vercel** — pastikan build `02efb6a` statusnya Ready, lalu buka situsnya. Kalau gagal: Deployments → Promote `0100a66` untuk kembali ke versi sebelumnya.
2. **Daftarkan sitemap ke Google Search Console** sesudah rilis — tanpa ini sitemap-nya ada tapi Google tak pernah tahu. Buka https://search.google.com/search-console → tambah properti `dramaapp.vercel.app` → menu Sitemaps → isi `sitemap.xml` → Submit.
3. Sinopsis drama dari OMDb masih **berbahasa Inggris**, padahal situs berbahasa Indonesia. Itu isi data, bukan kode — perlu diterjemahkan lewat admin kalau mau rapi di hasil Google.
4. API key Playly yang valid (produksi) — masih menunggu rekan.
5. Fitur berikutnya (pilih): notifikasi/engagement, download offline, atau social features.

## Jangan dilakukan

- Jangan commit `.env.local` / API key / `cookies.txt`.
- Jangan `git push` dari working tree kotor tanpa izin.
- Jangan ganti tabel Supabase jadi `users`/`episodes`/`watch_history` — merusak koin & admin.
- **Jangan pakai `getAllDramasCached`/`getDramaCached` di jalur koin, admin, atau tulis** — itu versi ber-cache khusus halaman publik. Jalur uang & tulis wajib `getAllDramas`/`getDrama` yang selalu terbaru.

## Berkas terkait

- Rencana terbaru: [`docs/lintasai/rencana/2026-08-18-performance-seo.md`](./docs/lintasai/rencana/2026-08-18-performance-seo.md)
- Antrean: [`antrean-deploy.md`](./antrean-deploy.md)
- Arsip: [`NEXT-SESSION.md`](./NEXT-SESSION.md)
