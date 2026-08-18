# HANDOFF — lanjut di sini

> **Cara pakai:** buka tab chat baru, ketik **`lanjut dari handoff`**.
> AI wajib baca berkas ini **pertama**, lalu `antrean-deploy.md`.
>
> **AI:** tiap kali ada perbaikan / deploy / keputusan — **perbarui berkas ini di langkah terakhir**, sebelum bilang selesai. Jangan tumpuk sejarah panjang di sini; pindahkan yang lama ke `NEXT-SESSION.md`.

**Terakhir diisi:** 2026-08-18

## Status sekarang (1 menit)

- Situs hidup: **https://dramaapp.vercel.app** — yang TAYANG `5a51261` (Tahap 4).
- **Tahap 5 selesai tapi BELUM di-push**: lokal ada di `d5bb261`.
- Build lokal & test lulus (**221 tests**). Skema database Supabase **tidak diubah**.
- Tahap yang sudah kelar: 1 (homepage/player) · 2 (discover/profile) · 3 (rekomendasi/koin/iklan) · 4 (Performance & SEO) · 5 (rating/share/balasan).

## Yang baru saja dikerjakan

| Kapan | Apa | Hasil yang kamu rasakan |
|---|---|---|
| 2026-08-18 | **Tahap 5: rating + bagikan + balasan komentar** (`d5bb261`) | Penonton bisa kasih bintang 1-5 di halaman drama; tombol Bagikan; komentar bisa dibalas; Google kini dapat data bintang IMDb asli |
| 2026-08-18 | **Tahap 4: Performance & SEO** (`5a51261`) | Tiap drama punya judul sendiri di Google; sitemap 42 URL; halaman jauh lebih cepat (cache 60 detik) |
| 2026-08-18 | Pengaman `.gitignore` | `cookies.txt` berisi token admin tak bisa lagi ter-commit tak sengaja |

## Belum selesai / menunggu kamu

1. **Push `d5bb261` ke `origin` + `dramaku`** → ini yang memicu rilis Vercel. Menunggu izin kamu.
2. **Daftarkan sitemap ke Google Search Console** (dari Tahap 4, belum dikerjakan): buka https://search.google.com/search-console → tambah properti `dramaapp.vercel.app` → menu Sitemaps → isi `sitemap.xml` → Submit. Tanpa ini, kerja SEO Tahap 4 tidak terbaca Google.
3. Sinopsis drama dari OMDb masih **berbahasa Inggris** padahal situs berbahasa Indonesia — perlu diterjemahkan lewat admin.
4. API key Playly yang valid (produksi) — masih menunggu rekan.
5. Kandidat Tahap 6: **perkuat login penonton** (paling disarankan, lihat di bawah), notifikasi episode baru, PWA "pasang ke HP", atau download offline.

## Utang teknis yang DISENGAJA (penting, jangan lupa)

**Identitas penonton belum aman.** `lib/session.ts:95-98` — email viewer di-assert dari browser, server tak bisa memverifikasi. Akibatnya:

- Rating penonton **bisa dipalsukan** dengan mengganti email di request. Karena itu rating penonton **sengaja TIDAK dikirim ke Google**; yang dikirim adalah `imdbRating` asli dari OMDb (lihat `lib/structured-data.ts`).
- Begitu login penonton diperkuat (cookie bertanda tangan seperti admin), rating jadi tepercaya dan boleh dipasang ke structured data. Catatannya ada di `lib/store.ts` bagian "BATAS JUJUR".

## Jangan dilakukan

- Jangan commit `.env.local` / API key / `cookies.txt`.
- Jangan `git push` dari working tree kotor tanpa izin.
- Jangan ganti tabel Supabase jadi `users`/`episodes`/`watch_history` — merusak koin & admin.
- **Jangan pakai `getAllDramasCached`/`getDramaCached` di jalur koin, admin, atau tulis** — itu versi ber-cache khusus halaman publik. Jalur uang & tulis wajib `getAllDramas`/`getDrama`.
- **Jangan kirim rating penonton ke schema.org** sebelum identitas viewer aman — risiko penalti Google.
- Kalau menguji API lewat `next start`, ingat datanya masuk **Supabase produksi** — bersihkan setelah selesai.

## Berkas terkait

- Rencana terbaru: [`docs/lintasai/rencana/2026-08-18-tahap-5-rating-share.md`](./docs/lintasai/rencana/2026-08-18-tahap-5-rating-share.md)
- Rencana Tahap 4: [`docs/lintasai/rencana/2026-08-18-performance-seo.md`](./docs/lintasai/rencana/2026-08-18-performance-seo.md)
- Antrean: [`antrean-deploy.md`](./antrean-deploy.md)
- Arsip: [`NEXT-SESSION.md`](./NEXT-SESSION.md)
