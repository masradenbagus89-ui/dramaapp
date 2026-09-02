# Antrean deploy

> **Cara pakai:** ketik **`cek antrean-deploy`** atau **`lanjut dari handoff`**.
> AI wajib `git fetch origin` + `git fetch dramaku`, bandingkan `origin/main` vs `dramaku/main` vs produksi Vercel, lalu **perbarui tabel di bawah**.

**Terakhir dicek:** 2026-09-02. **Lokal = `origin/main` = `dramaku/main` = `5aa8344`, selisih NOL ✅** (dual push judul hero rata kiri; `git fetch` ulang sesudah push, hash dibandingkan satu per satu — bukan mengandalkan pesan "berhasil"). **⚠️ Remote `official` (`projectraden/backup-dramaapp`) MATI** — `git fetch official` balas `Repository not found`, jadi baris `official` di tabel bawah sudah tidak berlaku sampai repo-nya dibuat/diberi akses ulang. **Cek kesehatan produksi 2026-09-02:** `/` · `/beranda` · `/discover` · `/shorts` semua **200** · HTML landing produksi berisi `max-w-7xl … items-start … text-left` + 2× `justify-start` + `ellipse_at_left` = perubahan hero benar-benar sampai ke penonton, bukan cuma ter-commit.

Sebelumnya 2026-08-31. **`origin/main` (repo produksi) = lokal = `3dad2e8` ✅ — tak ada rilis tertinggal.** **⚠️ `dramaku/main` masih `ee8f18c` — commit `3dad2e8` (migrasi Supabase) BELUM ter-push ke repo cermin** (aturan dual push). Sebabnya bukan kode: `git ls-remote dramaku` ditolak GitHub `Invalid username or token` → kredensial `ojokesusu/dramaku` di PC ini kedaluwarsa. Push ke `dramaku` TIDAK merilis apa pun, jadi penonton tak terdampak; yang berisiko cuma rekan bekerja di atas kode lama. **Cek kesehatan produksi 2026-08-31:** landing **200** · `/playly` **200** · `/discover` **200** · `/api/teaser` **307 / 0 byte** → tunnel baru `interference-positions-style-manufacture.trycloudflare.com` · redirect diikuti balas **206 `video/mp4` `ftypisom`** · `/api/dramas` **200 berisi 42 judul** (bukti database Supabase project baru + schema `dramaapp` sudah melayani produksi).

Sebelumnya 2026-08-29. **Lokal = `origin/main` = `dramaku/main` = `7a440c2`, selisih NOL** (`7a440c2` = commit catatan handoff di atas `53e923b`, sudah ter-push ke dua remote). Tidak ada rilis tertinggal. **Cek kesehatan produksi 2026-08-29:** landing **200** · `/api/teaser` **307 / 0 byte** → tunnel baru `ping-newspapers-damaged-dublin.trycloudflare.com` · redirect diikuti balas **206 `video/mp4`** (byte video tetap mengalir langsung tunnel→penonton, kuota Vercel aman).

Sebelumnya 2026-08-28 (deploy hero landing): **Lokal = `origin/main` = `dramaku/main` = `53e923b`, selisih NOL.** Hero landing "hidup" (cuplikan 60 dtk/judul) TAYANG & terverifikasi (markup `70svh` di produksi 45 dtk sesudah push; `/api/teaser` produksi 307 / 0 byte → tunnel).

> ⚠️ **NAMA REMOTE BEDA ANTAR-KOMPUTER — inilah sumber salah kirim yang berulang.**
> Bukan salah satu catatan yang keliru; keduanya benar untuk mesinnya masing-masing.
> Dicek langsung dengan `git remote -v`:
>
> | Repo | Nama di **PC owner** (dicek 2026-08-26) | Nama di **PC rekan** | Dipantau Vercel? |
> |---|---|---|---|
> | `masradenbagus89-ui/dramaapp` | **`origin`** | `dramaapp` | **Ya — ini tombol rilis** |
> | `ojokesusu/dramaku` | **`dramaku`** | `origin` | Tidak — push ke sini TIDAK merilis apa pun |
> | `projectraden/backup-dramaapp` | `official` | — | Tidak — cadangan |
>
> **SELALU `git remote -v` dulu sebelum push. Jangan percaya kata "origin" di catatan mana pun.**

**Catatan lama, 2026-08-25** (sesudah owner login GitHub di PowerShell, `git fetch` dari sesi AI JALAN lagi). Keadaan saat pemeriksaan: repo produksi = `c648fef` — sudah berisi fitur Film & **terverifikasi tayang**; `ojokesusu/dramaku` = `fd83427` — berisi 5 commit Playly yang belum pernah masuk produksi. Keduanya digabung hari itu di komputer owner.

⚠️ **Penamaan remote BEDA antara komputer owner dan komputer rekan** (sumber salah paham): di sini `origin` = repo produksi & `dramaku` = repo rekan; di catatan rekan (baris Playly di bawah) `origin` justru berarti repo `dramaku`, dan repo produksi mereka sebut `dramaapp`. Selalu sebut URL-nya kalau ragu.

**Catatan sebelumnya:** 2026-08-24 sore WIB (`git fetch origin` + `git fetch dramaku` dua-duanya SUKSES; `HEAD` = `origin/main` = `dramaku/main` = **`ba82058`**, selisih NOL)

## Siapa memantau apa

> ✅ **DIKOREKSI 2026-08-26 — peringatan lama di sini SALAH.** `git remote -v` hari ini membuktikan
> nama remote TIDAK tertukar dan `dramaku` MASIH ADA (`git fetch dramaku` sukses, menarik `7372259..fc34161`).
> Yang berlaku sekarang adalah tabel di bawah. Tetap jalankan `git remote -v` dulu sebelum push.

| Repo | Remote git | Dipantau Vercel? |
|---|---|---|
| `masradenbagus89-ui/dramaapp` | **`origin`** | **Ya** — `git push origin main` = tombol rilis |
| `ojokesusu/dramaku` | **`dramaku`** | Tidak — cermin/tempat rekan commit. Push ke sini TIDAK merilis apa pun |
| `projectraden/backup-dramaapp` | `official` | Tidak — cadangan |

Produksi: https://dramaapp.vercel.app  
Commit terbaru yang di-push: **`4954817`** (5 commit sekaligus: perbaikan layar hitam player, berkas autostart named tunnel, tes e2e Tahap 7, 2 dokumentasi) — di-push 2026-08-20 malam sesudah 265 tes lulus + `tsc` exit 0 + `next build` sukses. **TERVERIFIKASI TAYANG**: teks perbaikan player ditemukan di bundle produksi `/_next/static/chunks/27z9f9ucdybcg.js`.
Catatan: `git fetch` ke `origin` **dan** `dramaku` dua-duanya SUKSES 2026-08-19 sore (timeout `dramaku` pagi tadi tidak kambuh).
Tahap 6 (`b48bf32`): **sudah diverifikasi owner jalan di produksi** 2026-08-18.
AUTH_SECRET di Vercel: dikonfirmasi ADA oleh owner 2026-08-18.

## Antrian sekarang

| Status | Commit | Isi | Aksi |
|---|---|---|---|
| ✅ **TAYANG & TERVERIFIKASI 2026-08-28** | `53e923b` | **Hero landing "hidup"**: komponen baru `LandingHero` — cuplikan ep 1 berputar antar 5 judul unggulan (`featuredHeroSlides`), ganti tiap **60 detik**, tombol suara + label judul; lapisan gelap ditipiskan (video cerah), kolase poster statis dihapus | Permintaan owner 2026-08-28. Jalur video TIDAK berubah (tetap `/api/teaser` 307 — nol byte video lewat Vercel). Pra-push: 390 tes lulus, `tsc` exit 0, `next build` sukses. Dual push SUKSES (`origin` + `dramaku`, `222eaf6..53e923b`). **Bukti tayang:** markup hero baru (`70svh`) muncul di `dramaapp.vercel.app` 45 dtk sesudah push; `/api/teaser` produksi balas **307 / 0 byte** → tunnel |
| ✅ **TAYANG & TERVERIFIKASI 2026-08-27 sore** | `f17b528` + `8a41ae4` + `a242921` | **Perbaikan kuota Vercel**: `/api/teaser` + `/api/download` dari penyalur byte jadi 307 redirect; `TEASER_BYTES` mangkrak dibuang; hero `preload="metadata"` + jeda 1,2 dtk; batas cuplikan hover 10 dtk; 14 tes penjaga baru | Deployment `8a41ae4` tak pernah dibangun (terblokir saat akun paused). AI mengirim commit pemicu kosong `a242921` (di atas `8a41ae4` — **Playly TIDAK ikut tayang**) atas permintaan owner → Vercel membangun. **Bukti tayang:** teaser **307 / 0 byte** → tunnel `optical-comprehensive-harper-howto.trycloudflare.com`; redirect diikuti balas **206 `video/mp4` `ftypisom`**. Catatan: `origin/main` kini `a242921`, **di depan** lokal & `dramaku` (masih `2b9f530`/`fc34161`) — merge balik nanti saat rilis berikutnya |
| ✅ **DIRILIS & TERVERIFIKASI TAYANG 2026-08-27 malam** | `9e17f40` + `fc34161` → merge `14fa0cc` | Fitur rekan **"video Playly tampil otomatis"** — halaman `/playly`, baris di `/discover`, tautan TopNav, admin bisa menyembunyikan; jalur katalog-publik-tersaring supaya kunci mitra yang dicabut tak mematikan video | Owner menyetujui rilis 2026-08-27 malam (kuota sudah terbukti aman + penyisiran penuh tuntas) — **keputusan sadar, bukan efek samping merge** (koreksi atas dugaan di catatan rekan). `origin/main` (`a242921`) di-merge balik ke lokal → `14fa0cc`, di-push ke `origin` (`a242921..14fa0cc`) **dan** `dramaku` (`9feb4e1..14fa0cc`) — ketiganya selisih NOL. **Bukti tayang:** `/playly` balas **200** ±1 menit sesudah push (sebelumnya 404); diverifikasi rekan dari sisi mereka: halaman memuat **keempat video `coklat`** (Transformers 8, Transformers The Last Knight, Hulk Abu-abu, Suara Hewan), dan kunci mitra `plyk_…` **diterima lagi** (`{"ok":true,"count":4}` — catatan "invalid_key 25 Agt" basi). Audit lama tetap berlaku: nol pola penyalur byte, video lewat `<iframe>` ke `playly-dashboard.vercel.app` (bukan Vercel kita), thumbnail pakai `<img>` biasa. ⚠️ Push dari PC rekan tetap **403** (`denied to yusufscorpio`) — jalan keluar permanen: tambahkan `yusufscorpio` sebagai collaborator Write; kalau sudah bisa, perintah yang benar = `git push dramaapp origin/main:main`, JANGAN `fix/playly-otomatis:main` (non-fast-forward, menghapus perbaikan kuota) |
| 📋 **catatan rekan (bukti dari sisi mereka)** | `9e17f40` (branch `fix/playly-otomatis`) | **Video Playly tampil OTOMATIS**: halaman baru `/playly`, baris di `/discover`, tautan TopNav, admin bisa menyembunyikan. Jalur katalog-publik-TERSARING supaya kunci mitra yang dicabut tak lagi mematikan video | Diperiksa dulu: **376 tes lulus**, `tsc` exit 0, `next build` sukses, nol secret di diff. Terbukti lokal: 4 video milik `coklat` tampil, **nol kebocoran** dari 11 video kreator lain, keempat berkas MP4 mengalir (206, `ftypisom`, `[ftyp,free,mdat]`). `/discover` tetap Static 1m (nol regresi). **Push ke `ojokesusu/dramaku` SUKSES** `7372259..9e17f40` (2026-08-26, diverifikasi). **Push ke `masradenbagus89-ui/dramaapp` DITOLAK 403** — git di PC ini login sebagai `yusufscorpio` yang tak punya akses tulis (dicek lewat `git push --dry-run`, tidak mengubah apa pun). Owner jalankan: `git push dramaapp fix/playly-otomatis:main` |
| ✅ **RILIS GABUNGAN TAYANG** | `e765e29` (merge) | **Fitur Film + integrasi Playly dirilis bersama** 2026-08-25 atas izin owner | Dual push SUKSES dari sesi AI: `origin` `c648fef..e765e29`, `dramaku` `fd83427..e765e29`. Sesudah `git fetch` keduanya: lokal = `origin/main` = `dramaku/main` = `e765e29`, **selisih NOL**. Sebelum push: **358 tes lulus** (302 + tes Playly), `tsc` exit 0, `next build` sukses (5 route Playly terdaftar), nol secret nyata di diff (hanya kunci contoh di tes). **Terverifikasi tayang** di deployment `dpl_28aUguP18E7FpHXZ4grMFFi3Tp5w`: `/admin/videos/playly` **200** (sebelumnya 404), dan chunk `/_next/static/chunks/3om_miassjcgs.js` memuat "Jenis tayangan" + "Film selalu gratis" + "Playly" sekaligus |
| ✅ **sudah di-push & TAYANG** | `5156949` + `c648fef` | Fitur **Film tanpa episode** di panel admin (jenis tayangan Serial/Film) + kolom DB `kind` + 2 berkas tes baru | Owner memberi izin rilis 2026-08-25. SQL `add_kind_to_dramas.sql` dijalankan owner di Supabase produksi (Success) SEBELUM push. Push ke `origin` dilakukan owner sendiri di PowerShell (sesi AI tak bisa membuka dialog login GitHub): `617f6a0..c648fef`. **Terverifikasi tayang**: teks "Jenis tayangan", "Film selalu gratis", "1 video utuh" ditemukan di bundle produksi `/_next/static/chunks/32zoz1a8f4vl2.js`. Sebelum push: nol secret di diff, **302 tes lulus**, `tsc` exit 0, `next build` sukses |
| ⏸️ **menunggu owner (boleh kapan saja)** | — | SQL data-fix `supabase_migrations/mark_existing_movies.sql` — menandai 7 judul film lama (Transformers, Spider-Man, Avengers, Predator, 28 Years Later, Fireworks Wednesday, The Dark Knight) sebagai `kind = 'movie'` + melepas tanda berbayar yang memang tak berefek | Supabase → SQL Editor → tempel & Run. Boleh sebelum atau sesudah deploy (kode lama mengabaikan kolom `kind`, jadi tidak merusak apa pun) |
| ✅ **penghalang 403 TERBUKA & DIRILIS 2026-08-25** | `0e7a5c5` (asal) → `e765e29` | Integrasi Playly + perbaikan yang membuatnya jalan (pola `/id/{id}/embed`, alamat relatif, katalog publik saat kunci mitra ditolak) | Rekan tak bisa push ke repo produksi (403, `gh` login sebagai `yusufscorpio` tanpa akses tulis). Owner memberi izin 2026-08-25 → 5 commit `dramaku` digabung ke `main` di komputer owner (konflik hanya di 3 berkas catatan; kode nol bentrok), diperiksa ulang, lalu dirilis bersama fitur Film. Status akhir push dicatat di baris paling atas tabel ini sesudah rilis |
| ⚠️ **kunci Playly TIDAK SAH lagi** | — | `DASHBOARD_API_KEY` (`plyk_…`) diuji ulang 2026-08-25 → `invalid_key`. Dulu tercatat "SAH 2026-08-19" | Jalur embed **tidak terhalang** (turun ke katalog publik). Kartu "Video terbaru" di `/discover` **masih kosong** sampai ada kunci baru dari pengelola Playly |
| ✅ **sudah di-push** | `ba82058` | Tolak `api.trycloudflare.com` sebagai alamat video (2 lapis: saringan di `start-video-services.ps1` + `HOST_TERLARANG` di `lib/video-base.ts`) + `HANDOFF.md` siklus ke-4 | Owner memberi izin 2026-08-24. Dual push SUKSES (`origin` + `dramaku`, selisih nol). Diperiksa dulu: nol secret di diff, **283 tes lulus**, `tsc` exit 0, `next build` sukses, script PS lolos parser. Sesudah push: raw GitHub dicocokkan persis dengan berkas yang diuji; situs `/beranda` 200 & `/api/teaser` 206 |
| ✅ **video PULIH (siklus ke-4)** | — | Akarnya PEMASANGAN, bukan kode: `start-video-services.ps1` tidak ada di PC backup + watchdog 15 menit belum pernah dibuat. Keduanya dibereskan; alamat aktif `boats-voluntary-ensure-kim.trycloudflare.com` (akan berganti — jangan dihafal) | **Terverifikasi 2026-08-24 dari jaringan LAIN:** `/api/teaser` **206** di ep 1/27/56, `video/mp4`, signature `ftypmp42`, root tunnel **200**. Owner mencoba sendiri: video tayang. Sejak sekarang watchdog memulihkan sendiri ≤15 menit |
| ✅ **video PULIH** | — | Tunnel sore (`written-coated-...`) LENYAP (DNS `Non-existent domain`) → owner jalankan `start-dramaapp.ps1` → alamat baru **`proxy-marks-isolation-subjects.trycloudflare.com`**. Langkah [5/6] gagal 403 (`VERCEL_TOKEN` mati), alamat masuk lewat jalur manual | **Terverifikasi 2026-08-20 malam:** URL yang dipakai produksi balas **206** `video/mp4`, isi diawali `ftypmp42`. ⚠️ Sementara — mati lagi saat PC backup restart |
| ✅ **sudah di-push** | `8dd6f22`..`4954817` | Perbaikan layar hitam player + berkas autostart PC backup (`start-video-services.ps1`, `cloudflared-config.example.yml`, README baru, `.gitignore` kredensial tunnel) + tes e2e Tahap 7 | Owner memberi izin 2026-08-20 malam. Dual push SUKSES (`origin` + `dramaku`, selisih nol). Diperiksa dulu: nol secret di diff, 265 tes, tsc 0, build sukses. **Terverifikasi tayang** — teks perbaikan ketemu di bundle produksi |
| ✅ **SELESAI PENUH** | `1ce14c3` | Tahap 7: kode pemulihan password | Terverifikasi 2026-08-20: uji manual owner (tampilan) + uji end-to-end mesin ke API produksi **19/19 lulus**. Akun uji dibersihkan. Tak ada sisa |
| ⚠️ **utang operasional (AKTIF lagi)** | — | `VERCEL_TOKEN` di `start-dramaapp.ps1` kedaluwarsa (403) — **menggigit 2026-08-20 malam**: langkah [5/6] gagal, owner harus tempel alamat manual | **Koreksi catatan sebelumnya:** utang ini gugur **hanya SESUDAH** named tunnel terpasang. Selama masih quick tunnel, tiap restart PC = tempel manual. Prioritaskan Tahap 2 |
| ✅ tayang & terverifikasi | `0d77f4a` | Kartu status sambungan Playly di /admin | Selesai. Kartu kini menampilkan "Belum diatur" |
| ⏸️ menunggu owner | — | 3 env Playly di Vercel (`DASHBOARD_API_URL`, `DASHBOARD_API_KEY_HEADER=X-Playly-Key`, `DASHBOARD_API_KEY`) | Owner isi manual + Redeploy; sesudah itu kartu berubah jadi "Tersambung" |
| ⏸️ menunggu rekan | — | Dashboard Playly masih KOSONG (`count: 0`) | Kunci sudah diuji SAH 2026-08-19; minta rekan upload video contoh |

**Status 2026-08-25 (sesudah rilis gabungan):** lokal = `origin/main` = `dramaku/main` = **`e765e29`**, selisih **NOL** (diverifikasi dengan `git fetch` ke dua remote). Utang dual-push nol.

⚠️ **Peringatan dari catatan rekan (berlaku di KOMPUTER REKAN, bukan di sini):** branch `main` lokal mereka menyimpang (`5c2147b`, berisi commit Playly duplikat & tertinggal 52 commit); rilis Playly mereka dikerjakan dari branch `rilis/playly`. Kalau rekan mau lanjut bekerja, `main` lokal mereka perlu diselaraskan dulu.

**Catatan lama — selisih `dramaku/main` vs `origin/main`:** NOL — lokal, `origin`, dan `dramaku` semuanya di `4954817` (diverifikasi 2026-08-20 malam sesudah dual push). Branch `origin/chore/penjaga-anti-tidur` sudah ter-merge penuh ke `main` (nol commit tertinggal), jadi bukan pekerjaan yang menggantung.

## Cara cek cepat (AI / kamu)

```powershell
git fetch origin
git fetch dramaku
git log --oneline origin/main..dramaku/main
```

- Ada baris di situ = **rekan sudah commit di dramaku, belum di origin** → masukkan ke tabel "Antrian sekarang", lalu tawarkan deploy (izin dulu sebelum `git push origin main`).
- Kosong = tidak ada rilis tertinggal.

Rollback 1-baris: Vercel → project `dramaapp` → Deployments → Promote commit **`954c9ca`** (14 Agustus).

## Riwayat yang sudah lewat antrean

| Tanggal | Commit | Hasil |
|---|---|---|
| 2026-08-15 | `6bb2539` … `8880c5a` dipindah ke origin | Build 1 gagal (font Playfair 404) |
| 2026-08-15 | `820abb8` font Georgia | Build Ready, smoke test lulus; Playly idle (env kosong) |
| 2026-08-18 | `4821c8f`..`0100a66` → `dramaku` | Utang dual-push 6 commit dibayar; kedua repo sama |
| 2026-08-18 | `a36bc67`..`02efb6a` → origin + dramaku | Tahap 4 Performance & SEO dirilis; hasil build Vercel belum diverifikasi |
| 2026-08-18 | `5a51261` → origin + dramaku | Catatan status Tahap 4; ketiga ref sama |
| 2026-08-18 | `d5bb261`..`8602858` → origin + dramaku | Tahap 5 dirilis; hasil build Vercel belum diverifikasi |
| 2026-08-18 | `55e6d8b` → origin + dramaku | Catatan status Tahap 5; ketiga ref sama |
| 2026-08-18 | `82e7536` → origin + dramaku | Tahap 6 dirilis (BREAKING: penonton daftar ulang); build Vercel belum diverifikasi |
| 2026-08-18 | `b48bf32` → origin + dramaku | Catatan status Tahap 6; ketiga ref sama |
| 2026-08-18 | Tahap 6 diverifikasi owner | Build Ready, daftar & login jalan, password salah ditolak, akun bersaldo diklaim |
| 2026-08-18 | `1ce14c3` → origin + dramaku | Tahap 7 dirilis; build Vercel belum diverifikasi |
| 2026-08-19 | — (tanpa commit) | Tahap 7 terverifikasi tayang; tunnel video mati → env `NEXT_PUBLIC_VIDEO_BASE_URL` diupdate MANUAL ke tunnel baru + redeploy; video terbukti jalan (206) |
| 2026-08-19 | `3b97791` → origin + dramaku | Commit catatan yang nyangkut di lokal dibayar; ketiga ref sama. Docs-only (HANDOFF + antrean), nol baris kode aplikasi |
| 2026-08-19 | `2008402` → origin + dramaku | Serah-terima 15 Agt ditandai SUDAH KADALUARSA (instruksi rollback ke `954c9ca` kini berbahaya) |
| 2026-08-19 | `0d77f4a` → origin + dramaku | Kartu status Playly di /admin dirilis; diverifikasi tayang (bundle produksi + 3 kondisi diuji lokal vs API Playly asli) |
| 2026-08-20 | — (tanpa commit) | Tahap 7 diuji end-to-end ke API produksi: **19/19 lulus** (kode sekali-pakai, password lama mati, normalisasi huruf kecil/tanpa strip, pesan gagal seragam anti-penebakan email, rate-limit 5/menit aktif). 1 akun uji dibuat lalu dihapus dari Supabase (verifikasi 0 baris tersisa) |

## Aturan isi (untuk AI)

1. Jangan masukkan secret / API key ke berkas ini.
2. Tiap kali rekan kirim "sudah commit" atau owner minta cek deploy → fetch, isi tabel, sebut 1 kalimat ke owner.
3. Sesudah deploy berhasil: pindahkan baris antrian ke "Riwayat", samakan "Commit yang sedang tayang".
4. Sesudah mengubah berkas ini, perbarui juga tanggal di `HANDOFF.md`.
