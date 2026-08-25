# Buku pelajaran / indeks lintasAI (dramaapp)

## Handoff & antrean

- [HANDOFF.md](../../HANDOFF.md) — ketik `lanjut dari handoff` di tab baru
- [antrean-deploy.md](../../antrean-deploy.md) — cek commit rekan yang belum di-deploy

## Rencana

- [2026-08-25-tambah-film-tanpa-episode.md](./rencana/2026-08-25-tambah-film-tanpa-episode.md) — jenis tayangan Serial vs **Film** (1 video utuh, tanpa episode) di panel admin: kolom DB `kind`, film dipaksa 1 video & gratis di server, JSON-LD `Movie`. Berisi alasan film tak bisa berbayar tanpa mengubah `FREE_EPISODES` + urutan wajib "SQL dulu, deploy belakangan"
- [2026-08-22-alamat-video-runtime.md](./rencana/2026-08-22-alamat-video-runtime.md) — video berhenti mati tiap PC backup restart TANPA named tunnel: alamat pindah dari "dibakar saat build" ke `app_data` Supabase + PC backup lapor sendiri. Berisi alasan ngrok gugur (1 GB/bulan) & pre-mortem secret level User vs Machine
- [2026-08-20-video-nama-berkas-1mp4.md](./rencana/2026-08-20-video-nama-berkas-1mp4.md) — drama baru tak bisa diputar padahal berkasnya ada: nama berkas bukan `1.mp4`; 3 bug hardlink-agent (angka "4" dari `.mp4`, berkas tanpa nomor dilewati, nol hardlink dibalas sukses) + penjaga `tests/hardlink-agent.test.ts`
- [2026-08-20-video-otomatis-tanpa-powershell.md](./rencana/2026-08-20-video-otomatis-tanpa-powershell.md) — alamat video permanen (named tunnel) + autostart PC backup; berisi 2 pelajaran bug: layar hitam `/sample.mp4` & `.ps1` non-ASCII gagal parse di PowerShell 5.1
- [2026-08-18-tahap-7-kode-pemulihan.md](./rencana/2026-08-18-tahap-7-kode-pemulihan.md) — kode pemulihan password penonton, tanpa email/domain
- [2026-08-18-tahap-6-login-penonton.md](./rencana/2026-08-18-tahap-6-login-penonton.md) — tutup IDOR jalur koin: identitas penonton pindah ke cookie terverifikasi
- [2026-08-18-tahap-5-rating-share.md](./rencana/2026-08-18-tahap-5-rating-share.md) — rating penonton (1 email = 1 suara, TIDAK dikirim ke Google) + share + balasan komentar
- [2026-08-18-performance-seo.md](./rencana/2026-08-18-performance-seo.md) — metadata unik per halaman, sitemap/robots, cache ISR 60 detik tanpa menyentuh jalur koin
- [2026-08-16-hero-trailer-hidup.md](./rencana/2026-08-16-hero-trailer-hidup.md) — hero trailer hidup di Beranda + Discover (lokal :3055)
- [2026-08-16-redesign-streaming-tahap-1.md](./rencana/2026-08-16-redesign-streaming-tahap-1.md) — redesign homepage/detail/player/riwayat tanpa ganti skema Supabase
- [2026-08-15-deploy-jalur-video-api.md](./rencana/2026-08-15-deploy-jalur-video-api.md) — pindahkan rilis video API luar dari dramaku ke origin lalu deploy Vercel
- [2026-08-15-admin-tetap-viewer.md](./rencana/2026-08-15-admin-tetap-viewer.md) — admin baru tetap tampil VIEWER karena sesi penonton lama
- [2026-08-15-riwayat-penonton.md](./rencana/2026-08-15-riwayat-penonton.md) — halaman Riwayat Penonton (Watch History) di `/history`
- [2026-08-14-imdb-metadata-json.md](./rencana/2026-08-14-imdb-metadata-json.md) — generate JSON metadata dari IMDb ID (OMDb + banner opsional TMDB)
- [2026-08-13-imdb-detail-drama.md](./rencana/2026-08-13-imdb-detail-drama.md) — detail film dari ID IMDb (OMDb), simpan metadata, tampil di halaman drama
