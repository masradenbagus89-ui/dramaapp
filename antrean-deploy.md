# Antrean deploy

> **Cara pakai:** ketik **`cek antrean-deploy`** atau **`lanjut dari handoff`**.
> AI wajib `git fetch origin` + `git fetch dramaku`, bandingkan `origin/main` vs `dramaku/main` vs produksi Vercel, lalu **perbarui tabel di bawah**.

**Terakhir dicek:** 2026-08-26 — `git fetch` ke kedua remote sukses. Keadaan: `masradenbagus89-ui/dramaapp` (**dipantau Vercel**) = `7372259`; `ojokesusu/dramaku` = `9e17f40` sesudah push hari ini.

> 🚨 **NAMA REMOTE DI PC INI TIDAK SAMA DENGAN CATATAN LAMA — sumber salah kirim.**
> Catatan 2026-08-25 di bawah memakai kata "origin" untuk repo PRODUKSI. Di komputer ini
> justru terbalik (dicek `git remote -v` 2026-08-26):
>
> | Repo | Nama remote di PC ini | Dipantau Vercel? |
> |---|---|---|
> | `masradenbagus89-ui/dramaapp` | **`dramaapp`** | **Ya — ini tombol rilis** |
> | `ojokesusu/dramaku` | **`origin`** | Tidak — repo cadangan |
>
> **SELALU `git remote -v` dulu sebelum push.** Jangan percaya kata "origin" di catatan mana pun.

**Catatan lama, 2026-08-25** (sesudah owner login GitHub di PowerShell, `git fetch` dari sesi AI JALAN lagi). Keadaan saat pemeriksaan: `origin` (masradenbagus89-ui/dramaapp, **dipantau Vercel**) = `c648fef` — sudah berisi fitur Film & **terverifikasi tayang**; `dramaku` (ojokesusu/dramaku) = `fd83427` — berisi 5 commit Playly yang belum pernah masuk produksi. Keduanya digabung hari ini di komputer owner.

⚠️ **Penamaan remote BEDA antara komputer owner dan komputer rekan** (sumber salah paham): di sini `origin` = repo produksi & `dramaku` = repo rekan; di catatan rekan (baris Playly di bawah) `origin` justru berarti repo `dramaku`, dan repo produksi mereka sebut `dramaapp`. Selalu sebut URL-nya kalau ragu.

**Catatan sebelumnya:** 2026-08-24 sore WIB (`git fetch origin` + `git fetch dramaku` dua-duanya SUKSES; `HEAD` = `origin/main` = `dramaku/main` = **`ba82058`**, selisih NOL)

## Siapa memantau apa

> ⚠️ **NAMA REMOTE SUDAH BERTUKAR — dicek ulang 2026-08-25.** Remote bernama `dramaku`
> **sudah tidak ada** (`git fetch dramaku` → error). Selalu `git remote -v` dulu sebelum push.

| Repo | Remote git | Dipantau Vercel? |
|---|---|---|
| `masradenbagus89-ui/dramaapp` | **`dramaapp`** | **Ya** — `git push dramaapp main` = tombol rilis |
| `ojokesusu/dramaku` | **`origin`** | Tidak — tempat rekan sering commit dulu |

Produksi: https://dramaapp.vercel.app  
Commit terbaru yang di-push: **`4954817`** (5 commit sekaligus: perbaikan layar hitam player, berkas autostart named tunnel, tes e2e Tahap 7, 2 dokumentasi) — di-push 2026-08-20 malam sesudah 265 tes lulus + `tsc` exit 0 + `next build` sukses. **TERVERIFIKASI TAYANG**: teks perbaikan player ditemukan di bundle produksi `/_next/static/chunks/27z9f9ucdybcg.js`.
Catatan: `git fetch` ke `origin` **dan** `dramaku` dua-duanya SUKSES 2026-08-19 sore (timeout `dramaku` pagi tadi tidak kambuh).
Tahap 6 (`b48bf32`): **sudah diverifikasi owner jalan di produksi** 2026-08-18.
AUTH_SECRET di Vercel: dikonfirmasi ADA oleh owner 2026-08-18.

## Antrian sekarang

| Status | Commit | Isi | Aksi |
|---|---|---|---|
| 🟡 **repo cadangan SUKSES — produksi menunggu owner** | `9e17f40` (branch `fix/playly-otomatis`) | **Video Playly tampil OTOMATIS**: halaman baru `/playly`, baris di `/discover`, tautan TopNav, admin bisa menyembunyikan. Jalur katalog-publik-TERSARING supaya kunci mitra yang dicabut tak lagi mematikan video | Diperiksa dulu: **376 tes lulus**, `tsc` exit 0, `next build` sukses, nol secret di diff. Terbukti lokal: 4 video milik `coklat` tampil, **nol kebocoran** dari 11 video kreator lain, keempat berkas MP4 mengalir (206, `ftypisom`, `[ftyp,free,mdat]`). `/discover` tetap Static 1m (nol regresi). **Push ke `ojokesusu/dramaku` SUKSES** `7372259..9e17f40` (2026-08-26, diverifikasi). **Push ke `masradenbagus89-ui/dramaapp` DITOLAK 403** — git di PC ini login sebagai `yusufscorpio` yang tak punya akses tulis (dicek lewat `git push --dry-run`, tidak mengubah apa pun). Owner jalankan: `git push dramaapp fix/playly-otomatis:main` |
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
