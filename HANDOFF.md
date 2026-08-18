# HANDOFF — lanjut di sini

> **Cara pakai:** buka tab chat baru, ketik **`lanjut dari handoff`**.
> AI wajib baca berkas ini **pertama**, lalu `antrean-deploy.md`.
>
> **AI:** tiap kali ada perbaikan / deploy / keputusan — **perbarui berkas ini di langkah terakhir**, sebelum bilang selesai. Jangan tumpuk sejarah panjang di sini; pindahkan yang lama ke `NEXT-SESSION.md`.

**Terakhir diisi:** 2026-08-18

## Status sekarang (1 menit)

- Situs hidup: **https://dramaapp.vercel.app** — commit terbaru `1ce14c3` (Tahap 7) sudah di-push ke `origin` + `dramaku`.
- **Belum diverifikasi:** apakah build Vercel untuk `1ce14c3` sudah Ready. Build lokal & test lulus (**241 tests**).
- Skema database Supabase **tidak diubah** (akun penonton memakai tabel `app_data` yang sudah ada).
- Tahap kelar: 1 · 2 · 3 · 4 (Performance & SEO) · 5 (rating/share/balasan) · 6 (login penonton aman) · 7 (kode pemulihan).

## ✅ Tahap 6 sudah diverifikasi di produksi

Owner mengecek sendiri 2026-08-18: build Ready, daftar & login penonton jalan,
password salah ditolak, dan akun bersaldo sudah diklaim. Jadi fondasi login aman
sudah TERBUKTI, bukan cuma lulus tes lokal.

## Yang baru saja dikerjakan

| Kapan | Apa | Hasil yang kamu rasakan |
|---|---|---|
| 2026-08-18 | **Tahap 7: kode pemulihan** (belum push) | Saat daftar, penonton dapat 1 kode untuk disimpan. Lupa password → `/lupa-password`, masukkan email + kode → password baru. Tanpa email, tanpa domain, tanpa biaya |
| 2026-08-18 | **Tahap 6: login penonton aman** (`b48bf32`) | Password penonton sungguhan; koin & komentar orang lain tak bisa disentuh |
| 2026-08-18 | **Tahap 5: rating + bagikan + balasan** | Bintang 1-5, tombol Bagikan, komentar bisa dibalas |
| 2026-08-18 | **Tahap 4: Performance & SEO** | Judul unik per drama di Google, sitemap 42 URL, halaman jauh lebih cepat |

## Cara kerja kode pemulihan (untuk dijelaskan ke penonton)

- Bentuk: `ABCD-EFGH-JKMN-PQRS` (16 karakter, tanpa 0/O/1/I/L supaya tak salah ketik).
- Ditampilkan **SEKALI** saat daftar. Yang disimpan server cuma hash-nya — tak ada
  cara melihat kode lama, termasuk oleh admin.
- **Sekali pakai**: setelah dipakai memulihkan, kode lama hangus dan penonton
  langsung diberi kode baru.
- Kode hilang tapi masih bisa masuk → buat baru di **Profil → Kode pemulihan**
  (wajib masukkan password lagi, karena kode baru menghanguskan yang lama).
- Akun Tahap 6 belum punya kode → buat lewat Profil. Field-nya opsional, jadi akun
  lama tetap valid tanpa migrasi.
- **Kode hilang DAN password lupa = akun tak bisa dipulihkan.** Satu-satunya jalan:
  admin menghapus baris `viewerpass:<email>` di Supabase supaya bisa daftar ulang.

## Belum selesai / menunggu kamu

1. **Cek dashboard Vercel** — pastikan build `1ce14c3` Ready, lalu coba daftar 1 akun dan simpan kode pemulihannya. Kalau build gagal: Deployments → Promote `b48bf32`.
2. **Daftarkan sitemap ke Google Search Console** (tertunda sejak Tahap 4): buka
   https://search.google.com/search-console → tambah properti `dramaapp.vercel.app` →
   Sitemaps → isi `sitemap.xml` → Submit.
3. Sinopsis drama dari OMDb masih **berbahasa Inggris** — perlu diterjemahkan lewat admin.
4. API key Playly yang valid — masih menunggu rekan.
5. Kandidat Tahap 8: **rating penonton ke Google** (kini sudah aman — tinggal cabut
   batasannya), PWA "pasang ke HP", notifikasi episode baru, atau download offline.

## Utang teknis yang DISENGAJA

- **Belum ada verifikasi email.** Siapa pun bisa mendaftar dengan email milik orang
  lain selama email itu belum terdaftar. Butuh domain sendiri + layanan kirim email.
- **Rating penonton masih belum dikirim ke Google.** Sejak Tahap 6 identitas sudah
  aman, jadi batasan ini SUDAH BOLEH dicabut — tunggu Tahap 6 terbukti di produksi.
  Catatan ada di `lib/store.ts` ("BATAS JUJUR") dan `lib/structured-data.ts`.
- **Satu kode pemulihan per akun** (bukan 10 seperti kode cadangan 2FA) — sengaja,
  supaya mudah dipahami penonton awam.
- Sesi penonton tidak dicek ulang ke database tiap request (cukup tanda tangan +
  masa berlaku 7 hari). Kalau nanti ada fitur HAPUS akun, tambahkan pengecekan
  keberadaan akun di `resolveUserEmail`.

## Jangan dilakukan

- Jangan commit `.env.local` / API key / `cookies.txt`.
- Jangan `git push` dari working tree kotor tanpa izin.
- Jangan ganti tabel Supabase jadi `users`/`episodes`/`watch_history` — merusak koin & admin.
- **Jangan kembalikan parameter email ke `resolveUserEmail`** — dihapus SENGAJA supaya
  pemanggil yang mengirim identitas dari klien gagal saat build.
- **Jangan simpan kode pemulihan sebagai teks asli** di mana pun (log, response selain
  sekali-tampil, database). Yang boleh disimpan hanya hash-nya.
- **Jangan pakai `getAllDramasCached`/`getDramaCached` di jalur koin, admin, atau tulis.**
- Kalau menguji API lewat `next start`, ingat datanya masuk **Supabase produksi** —
  bersihkan setelah selesai.

## Berkas terkait

- Rencana Tahap 7: [`docs/lintasai/rencana/2026-08-18-tahap-7-kode-pemulihan.md`](./docs/lintasai/rencana/2026-08-18-tahap-7-kode-pemulihan.md)
- Rencana Tahap 6: [`docs/lintasai/rencana/2026-08-18-tahap-6-login-penonton.md`](./docs/lintasai/rencana/2026-08-18-tahap-6-login-penonton.md)
- Antrean: [`antrean-deploy.md`](./antrean-deploy.md)
- Arsip: [`NEXT-SESSION.md`](./NEXT-SESSION.md)
