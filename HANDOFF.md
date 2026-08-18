# HANDOFF — lanjut di sini

> **Cara pakai:** buka tab chat baru, ketik **`lanjut dari handoff`**.
> AI wajib baca berkas ini **pertama**, lalu `antrean-deploy.md`.
>
> **AI:** tiap kali ada perbaikan / deploy / keputusan — **perbarui berkas ini di langkah terakhir**, sebelum bilang selesai. Jangan tumpuk sejarah panjang di sini; pindahkan yang lama ke `NEXT-SESSION.md`.

**Terakhir diisi:** 2026-08-18

## Status sekarang (1 menit)

- Situs hidup: **https://dramaapp.vercel.app** — yang TAYANG `55e6d8b` (Tahap 5).
- **Tahap 6 selesai tapi BELUM di-push.** Build lokal & test lulus (**229 tests**).
- Skema database Supabase **tidak diubah** (akun penonton pakai tabel `app_data` yang sudah ada).
- Tahap kelar: 1 · 2 · 3 · 4 (Performance & SEO) · 5 (rating/share/balasan) · 6 (login penonton aman).

## ⚠️ BACA DULU SEBELUM RILIS TAHAP 6

Tahap 6 menutup lubang keamanan, dan itu **memutus sesi penonton lama**:

1. **Semua penonton harus DAFTAR ULANG** dengan password (minimal 8 karakter).
   Sebelumnya akun penonton tak pernah ada di server — password saat daftar dibuang.
2. **Kamu duluan yang klaim 3 akun bersaldo** (total 42 koin). Caranya: buka `/daftar`,
   pakai **email yang sama persis** dengan akun lama. Koin menempel pada email, jadi
   begitu email itu diklaim, saldonya kembali. Siapa cepat dia dapat — kalau orang lain
   mendaftar dengan email itu lebih dulu, saldonya ikut ke dia.
3. **Pastikan `AUTH_SECRET` sudah di-set di Vercel.** Tanpa itu, daftar & login penonton
   membalas error 500 (sengaja gagal-mengunci, bukan gagal-membuka). Login admin sudah
   memakainya, jadi kemungkinan besar sudah ada — tapi cek dulu sebelum rilis.

## Kenapa Tahap 6 dikerjakan (temuan, bukan permintaan fitur)

Ditemukan lubang **IDOR** di jalur uang: identitas penonton diambil dari email yang
dikirim browser, sehingga siapa pun bisa **membaca saldo dan membelanjakan koin orang
lain** hanya dengan mengetik email mereka. Koin dibeli dengan uang asli lewat Midtrans.
Sekarang identitas hanya berasal dari cookie bertanda tangan.

## Yang baru saja dikerjakan

| Kapan | Apa | Hasil yang kamu rasakan |
|---|---|---|
| 2026-08-18 | **Tahap 6: login penonton aman** (belum push) | Daftar/login penonton pakai password sungguhan; koin & komentar orang lain tak bisa disentuh |
| 2026-08-18 | **Tahap 5: rating + bagikan + balasan** (`55e6d8b`) | Bintang 1-5, tombol Bagikan, komentar bisa dibalas |
| 2026-08-18 | **Tahap 4: Performance & SEO** | Judul unik per drama di Google, sitemap 42 URL, halaman jauh lebih cepat |

## Belum selesai / menunggu kamu

1. **Push Tahap 6** → menunggu izin kamu (dan cek `AUTH_SECRET` di Vercel dulu).
2. **Daftarkan sitemap ke Google Search Console** (tertunda sejak Tahap 4): buka
   https://search.google.com/search-console → tambah properti `dramaapp.vercel.app` →
   Sitemaps → isi `sitemap.xml` → Submit.
3. Sinopsis drama dari OMDb masih **berbahasa Inggris** — perlu diterjemahkan lewat admin.
4. API key Playly yang valid — masih menunggu rekan.
5. Kandidat Tahap 7: **kirim email** (buka jalan untuk verifikasi email + lupa password),
   notifikasi episode baru, PWA "pasang ke HP", atau download offline.

## Utang teknis yang DISENGAJA

- **Tidak ada "lupa password"** dan **tidak ada verifikasi email** — project belum punya
  kemampuan kirim email (tak ada nodemailer/resend/sendgrid). Penonton yang lupa password
  TERKUNCI. Ini alasan utama kandidat Tahap 7 di atas.
- **Rating penonton masih belum dikirim ke Google.** Sekarang identitas sudah aman, jadi
  batasan ini SUDAH BOLEH dicabut — tapi tunggu Tahap 6 terbukti jalan di produksi dulu.
  Catatannya ada di `lib/store.ts` ("BATAS JUJUR") dan `lib/structured-data.ts`.
- Sesi penonton tidak dicek ulang ke database tiap request (cukup tanda tangan + masa
  berlaku 7 hari). Kalau nanti ada fitur HAPUS akun penonton, tambahkan pengecekan
  keberadaan akun di `resolveUserEmail` supaya sesi ikut mati.

## Jangan dilakukan

- Jangan commit `.env.local` / API key / `cookies.txt`.
- Jangan `git push` dari working tree kotor tanpa izin.
- Jangan ganti tabel Supabase jadi `users`/`episodes`/`watch_history` — merusak koin & admin.
- **Jangan kembalikan parameter email ke `resolveUserEmail`** — parameter itu SENGAJA
  dihapus supaya pemanggil yang mengirim identitas dari klien gagal saat build.
- **Jangan pakai `getAllDramasCached`/`getDramaCached` di jalur koin, admin, atau tulis.**
- Kalau menguji API lewat `next start`, ingat datanya masuk **Supabase produksi** —
  bersihkan setelah selesai.

## Berkas terkait

- Rencana Tahap 6: [`docs/lintasai/rencana/2026-08-18-tahap-6-login-penonton.md`](./docs/lintasai/rencana/2026-08-18-tahap-6-login-penonton.md)
- Rencana Tahap 5: [`docs/lintasai/rencana/2026-08-18-tahap-5-rating-share.md`](./docs/lintasai/rencana/2026-08-18-tahap-5-rating-share.md)
- Antrean: [`antrean-deploy.md`](./antrean-deploy.md)
- Arsip: [`NEXT-SESSION.md`](./NEXT-SESSION.md)
