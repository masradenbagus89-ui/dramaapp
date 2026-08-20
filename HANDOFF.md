# HANDOFF — lanjut di sini

> **Cara pakai:** buka tab chat baru, ketik **`lanjut dari handoff`**.
> AI wajib baca berkas ini **pertama**, lalu `antrean-deploy.md`.
>
> **AI:** tiap kali ada perbaikan / deploy / keputusan — **perbarui berkas ini di langkah terakhir**, sebelum bilang selesai. Jangan tumpuk sejarah panjang di sini; pindahkan yang lama ke `NEXT-SESSION.md`.

**Terakhir diisi:** 2026-08-20 malam

## Status sekarang (1 menit)

- Situs hidup: **https://dramaapp.vercel.app** — commit kode terbaru `4954817`, di-push ke `origin` + `dramaku` (selisih nol) dan **TERVERIFIKASI TAYANG** 2026-08-20 malam: teks perbaikan player ditemukan di bundle produksi `/_next/static/chunks/27z9f9ucdybcg.js`. Sebelum push: **265 tes lulus**, `tsc --noEmit` exit 0, `next build` sukses, nol secret di diff.
- **Tahap 7 SELESAI PENUH** — diverifikasi 2026-08-20 dari DUA sisi: (a) owner mencoba sendiri lewat tampilan (daftar → simpan kode → ganti password hanya dengan kode; alurnya mudah & berhasil); (b) uji end-to-end mesin ke API produksi **19/19 lulus**. `tests/recovery-code.test.ts` 12 tes lulus. Akun uji sudah dibersihkan dari Supabase (0 baris tersisa, login balas 401).
- Skema database Supabase **tidak diubah** (akun penonton memakai tabel `app_data` yang sudah ada).
- Tahap kelar: 1 · 2 · 3 · 4 (Performance & SEO) · 5 (rating/share/balasan) · 6 (login penonton aman) · 7 (kode pemulihan).
- **AWAS dua penomoran "Tahap" yang beda di repo ini** (sumber salah paham antar-sesi):
  (a) **Tahap PRODUK 1-7** = yang dipakai berkas ini. Tahap 1-3 adalah rencana "platform streaming modern gabungan Melolo + IDLIX + Netflix" — SUDAH SELESAI SEMUA: Tahap 1 `1af6e12` (16 Agt), Tahap 2 `00f0d2e` (17 Agt), Tahap 3 `a8ab69e` (17 Agt). Tahap 4-7 kelanjutannya.
  (b) **Tahap INFRASTRUKTUR 1-8** di [`PLAN-MAPPING.md`](./PLAN-MAPPING.md) = peta lama soal setup/tunnel/deploy. Di situ "Tahap 7" berarti *named tunnel*, BUKAN kode pemulihan. Isinya belum diperbarui sejak Juli.

## 🔴 SEDANG DIKERJAKAN: video mati lagi 2026-08-20 → dibikin PERMANEN

**Status 2026-08-20 MALAM (terbaru — menggantikan status sore di bawah).** Owner lapor video
tak bisa diputar. Diukur langsung: tunnel sore tadi `written-coated-drawings-joe.trycloudflare.com`
sudah **LENYAP** — `nslookup` balas `Non-existent domain`, `curl` status 000 (sedangkan
`cloudflare.com` balas 200 dari server yang sama, jadi bukan jaringan kami). Persis yang
diprediksi: quick tunnel mati + ganti alamat tiap PC backup restart.

Owner menjalankan `start-dramaapp.ps1`. Langkah **[1/6]-[4/6] SUKSES**, alamat baru
`https://proxy-marks-isolation-subjects.trycloudflare.com` — diuji dari luar: root **200**,
`/diremehkan-sebagai-gadis-desa-ternyata-dia-legenda-terkuat/2.mp4` **200** (berkasnya ADA).
Langkah **[5/6] GAGAL 403 Forbidden** — `VERCEL_TOKEN` mati, jadi jalur otomatis buntu. Alamat baru
akhirnya masuk ke env lewat jalur manual (Settings → Environment Variables → Redeploy).

✅ **RANTAI VIDEO PULIH — diverifikasi ujung-ke-ujung 2026-08-20 malam.** Alamat yang dipakai
produksi = `proxy-marks-isolation-subjects.trycloudflare.com`; ambil 1 MB pertama dari
`/diremehkan-.../2.mp4` balas **206** `video/mp4` dan isinya diawali `ftypmp42` (tanda tangan MP4
asli, bukan halaman error yang menyamar). 206 = server dukung seek, syarat player bisa memutar.

⚠️ Alamat ini **tetap sementara** — mati lagi saat PC backup restart. Selama masih quick tunnel,
tiap restart = ulangi `start-dramaapp.ps1` + tempel manual (karena [5/6] tetap 403).

⚠️ **Koreksi catatan lama:** "utang `VERCEL_TOKEN` GUGUR" itu **baru berlaku SESUDAH named tunnel
terpasang**. Selama masih quick tunnel, token mati = tiap restart PC owner harus tempel alamat
manual. Hari ini utang itu menggigit.

❓ **Temuan belum tuntas:** `/_agent/health` lewat tunnel baru balas **404**, padahal
`pc-backup-agent/hardlink-agent.js:243` punya jalur `/health` dan `Caddyfile:13` mem-proxy
`/_agent/*`. Dugaan: versi agent atau Caddyfile di PC backup masih lama — **belum diverifikasi**.
Tidak menghalangi memutar video; berpotensi mengganggu "Scan & auto-hardlink".

<details><summary>Status sore 2026-08-20 (sudah usang, disimpan sebagai riwayat)</summary>

Tunnel `written-coated-drawings-joe.trycloudflare.com` balas 200, `/_agent/health` balas
`{"ok":true}`, `guru-misterius-.../1.mp4` balas 200. Jadi 404 yang sempat terlihat bukan tunnel
mati, melainkan berkas dengan nama yang dicari memang tidak ada di folder drama itu (kasus
"Over Your Dead Body" di "Belum selesai" no.1).

</details>

**Akar masalahnya bukan bug, tapi rantai yang memang manual** (jadi restart PC tidak akan
pernah menolong):

1. `NEXT_PUBLIC_VIDEO_BASE_URL` berawalan `NEXT_PUBLIC_` → **dibakar saat build**, ganti nilai = wajib redeploy.
2. Isinya dari **quick tunnel**, yang memberi **alamat acak baru tiap PC restart** (`start-dramaapp.ps1:88-92`).
3. Yang mendorong alamat baru ke Vercel = langkah [5/6], dan itu **gagal 403** karena `$VERCEL_TOKEN` mati (insiden 2026-08-19, belum pernah diperbaiki).

**Solusinya menghapus penyebabnya, bukan menambal token:** alamat video dibuat PERMANEN
(`https://video.amasyaforum.com`) lewat cloudflared **named tunnel** + semua service
dijalankan Windows saat boot. Sesudah itu env Vercel diisi **sekali selamanya** dan
`VERCEL_TOKEN` **tidak dibutuhkan lagi**.

Rencana lengkap + perintahnya: [`docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md`](./docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md)
dan [`pc-backup-agent/README.md`](./pc-backup-agent/README.md).

> Selama masih quick tunnel: URL BERGANTI ACAK tiap PC backup restart — jangan dihafalkan.
> Ambil yang aktif dari `$env:TEMP\cloudflared-dramaapp.log` di PC backup.

**Keputusan owner 2026-08-20:** perbaikan bertahap · domain `amasyaforum.com` · PC backup
nyala hampir 24 jam → migrasi ke Cloudflare R2 **ditunda** (Tahap 3).

## ✅ Tahap 6 sudah diverifikasi di produksi

Owner mengecek sendiri 2026-08-18: build Ready, daftar & login penonton jalan,
password salah ditolak, dan akun bersaldo sudah diklaim. Jadi fondasi login aman
sudah TERBUKTI, bukan cuma lulus tes lokal.

## Yang baru saja dikerjakan

| Kapan | Apa | Hasil yang kamu rasakan |
|---|---|---|
| 2026-08-20 malam | **Video mati lagi → dipulihkan, DAN 5 commit yang tertahan akhirnya rilis** | Sesudah PC backup restart, alamat video sore tadi LENYAP (`nslookup` balas "Non-existent domain") — bukan dugaan, diukur langsung. Dipulihkan lewat `start-dramaapp.ps1` + tempel alamat manual ke Vercel (langkah [5/6] gagal 403). Terbukti jalan: **206 `video/mp4`**. Sekaligus 5 commit yang menumpuk (`8dd6f22`..`4954817`) di-dual-push sesudah lolos 265 tes + tsc 0 + build + scan secret → perbaikan "layar hitam" kini **TAYANG**, jadi kalau sumber mati lagi penonton melihat pesan + tombol **Coba lagi**, bukan layar hitam |
| 2026-08-20 | **Diagnosa "Over Your Dead Body" tak bisa diputar + 3 bug hardlink-agent diperbaiki** | Penyebabnya bukan tunnel mati: berkas di PC backup bernama `Over-Your-Dead-Body.mp4`, sedangkan player selalu minta `1.mp4` → 404. Agent lama tak bisa membereskannya DAN tetap lapor "berhasil" walau nol berkas dibuat. Sekarang: berkas tanpa nomor jadi episode 1, berkas `.mkv` dilaporkan "perlu dikonversi", nol hasil = GAGAL dengan sebab jelas. Dikunci 10 tes (`tests/hardlink-agent.test.ts`). **Masih perlu 1 langkahmu di PC backup — lihat "Belum selesai" no.1** |
| 2026-08-20 | **Penjaga permanen Tahap 7** (`npm run e2e:tahap7`) | Satu perintah untuk memastikan jalur "lupa password" masih hidup di produksi. Membuat 1 akun uji lalu MENGHAPUSNYA sendiri (bahkan kalau uji gagal di tengah). Dipisah dari `npm test` supaya tes harian tetap cepat & tak menyentuh database |
| 2026-08-20 | **Tahap 7 diuji end-to-end ke produksi** | 19 pemeriksaan lulus semua di situs sungguhan: kode pemulihan hanya bisa dipakai SEKALI, password lama langsung mati, kode boleh diketik huruf kecil tanpa tanda hubung, pesan gagal selalu sama (orang luar tak bisa menebak email mana yang terdaftar), dan batas 5 percobaan/menit terbukti menahan penebakan kode. Akun uji dihapus lagi dari database |
| 2026-08-20 | **Player tidak lagi kotak hitam saat sumber mati** | Dulu kalau PC backup/tunnel mati, layar cuma hitam tanpa keterangan (player mengarah ke `/sample.mp4` yang tidak pernah ada). Sekarang muncul "Video sedang tidak bisa diputar — sumber videonya sedang mati" + tombol **Coba lagi**. Dikunci 5 tes penjaga |
| 2026-08-20 | **Berkas autostart PC backup siap** | `start-video-services.ps1` + `cloudflared-config.example.yml` + README baru. Setelah owner pasang, PC nyala = video hidup sendiri, tanpa buka PowerShell |
| 2026-08-19 | **Kartu status Playly di /admin** | Di Dashboard admin ada kartu "Playly — dashboard upload": Tersambung / Belum diatur / Gagal, plus jumlah video. Tak perlu lagi buka situs sebagai pengunjung untuk tahu sambungannya hidup |
| 2026-08-18 | **Tahap 7: kode pemulihan** (`1ce14c3`) | Saat daftar, penonton dapat 1 kode untuk disimpan. Lupa password → `/lupa-password`, masukkan email + kode → password baru. Tanpa email, tanpa domain, tanpa biaya |
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

1. 🔴 **PRIORITAS — bikin `1.mp4` untuk "Over Your Dead Body" (10 detik).** Berkasnya sudah ada & sehat di PC backup, cuma namanya salah. Di PC backup:
   ```powershell
   New-Item -ItemType HardLink -Path "C:\Users\USER\Downloads\video\over-your-dead-body\1.mp4" -Target "C:\Users\USER\Downloads\video\over-your-dead-body\Over-Your-Dead-Body.mp4"
   ```
   Lalu **salin `pc-backup-agent/hardlink-agent.js` versi baru** ke `C:\Users\USER\pc-backup-agent\` + `schtasks /run /tn "DramaApp Video"` supaya tombol Scan bisa menangani sendiri lain kali. **Bukti tambahan 2026-08-20 malam:** `/_agent/health` lewat tunnel baru balas **404**, padahal `hardlink-agent.js:243` punya jalur `/health` dan `Caddyfile:13` mem-proxy `/_agent/*` → menguatkan dugaan versi agent di PC backup memang masih lama (belum diverifikasi langsung). Rincian: [`docs/lintasai/rencana/2026-08-20-video-nama-berkas-1mp4.md`](./docs/lintasai/rencana/2026-08-20-video-nama-berkas-1mp4.md).
2. ~~**Hidupkan video lagi (Tahap 1)**~~ — **PULIH, terakhir 2026-08-20 malam.** Alamat aktif sekarang `https://proxy-marks-isolation-subjects.trycloudflare.com`; yang lama (`written-coated-...`) sudah **LENYAP**. Diverifikasi ujung-ke-ujung: `/diremehkan-.../2.mp4` balas **206** `video/mp4`, isi diawali `ftypmp42`. ⚠️ **Tetap sementara** — mati lagi tiap PC backup restart, dan karena [5/6] balas 403 alamat barunya harus ditempel **manual** ke env Vercel + **Redeploy tanpa build cache**. Berhenti berulang hanya sesudah Tahap 2 (no.3).
3. 🔴 **Pasang alamat permanen + autostart (Tahap 2, ~1 jam).** Urutannya: (a) `amasyaforum.com` → Cloudflare, ganti nameserver di Namecheap; (b) `cloudflared` named tunnel + `service install`; (c) salin `start-video-services.ps1` ke PC backup + `schtasks /sc onstart`; (d) `powercfg` cegah sleep; (e) env Vercel = `https://video.amasyaforum.com` (terakhir kali). **Perintah lengkap ada di [`pc-backup-agent/README.md`](./pc-backup-agent/README.md).** Sesudah ini tidak perlu buka PowerShell lagi selamanya.
4. ~~**Uji manual Tahap 7 dari sisi penonton**~~ — **SELESAI 2026-08-20.** Owner sudah mencoba sendiri (berhasil ganti password hanya bermodal kode) DAN uji end-to-end mesin ke API produksi lulus 19/19. Tak ada sisa pekerjaan di Tahap 7.
5. **Isi 3 env Playly di Vercel** → Settings → Environment Variables: `DASHBOARD_API_URL=https://playly-dashboard.vercel.app/api/videos`, `DASHBOARD_API_KEY_HEADER=X-Playly-Key`, `DASHBOARD_API_KEY=<kunci dari rekan>`. Lalu **Redeploy**. Cek berhasil: `/admin` → Dashboard → kartu Playly berubah dari "Belum diatur" jadi "Tersambung".
6. **Minta rekan upload video contoh** ke dashboard Playly — kuncinya sudah diuji SAH 2026-08-19, tapi dashboard-nya masih kosong (`count: 0`), jadi belum ada yang bisa ditampilkan.
7. **Rotate (ganti) API key Playly** sesudah setup — kunci yang sekarang dikirim rekan lewat screenshot, jadi sudah terekam di riwayat chat.
8. ⚠️ **`VERCEL_TOKEN` mati (403) — MASIH MENGGIGIT sampai Tahap 2 terpasang.** **Koreksi catatan sebelumnya** yang menyatakan ini "gugur": gugurnya baru berlaku **SESUDAH** named tunnel terpasang. Selama masih quick tunnel, tiap PC backup restart langkah [5/6] gagal → owner wajib tempel alamat manual (terbukti 2026-08-20 malam). Dua pilihan: **(a)** kerjakan Tahap 2 — disarankan, token jadi tak dibutuhkan selamanya; **(b)** penambal sementara: buat token baru di `vercel.com/account/tokens` → tempel ke `$VERCEL_TOKEN` di `start-dramaapp.ps1`.
9. **Daftarkan sitemap ke Google Search Console** (tertunda sejak Tahap 4): buka
   https://search.google.com/search-console → tambah properti `dramaapp.vercel.app` →
   Sitemaps → isi `sitemap.xml` → Submit.
10. Sinopsis drama dari OMDb masih **berbahasa Inggris** — perlu diterjemahkan lewat admin.
11. Kandidat Tahap 8: **rating penonton ke Google** (kini sudah aman — tinggal cabut
    batasannya), PWA "pasang ke HP", notifikasi episode baru, atau download offline.
12. **Tahap 3 (ditunda, atas keputusanmu):** pindah video ke Cloudflare R2 supaya PC backup
    boleh mati total. Biaya ~Rp22rb/bln per 100 GB, egress gratis. Catatan lengkap di
    [`docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md`](./docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md).

## Performance /beranda: SUDAH SEHAT (diukur 2026-08-20, jangan diulang)

Sempat terlihat seperti masalah (HTML 382 KB), ternyata BUKAN. Angka lengkapnya:

| Yang diukur | Hasil | Artinya |
|---|---|---|
| HTML dikirim di kabel | **22,5 KB** (brotli) | Yang 382 KB itu ukuran SESUDAH dibuka browser. Kompresi memampatkannya 17x |
| Waktu muat | ~900 ms (sesudah panas) | Wajar. Angka 7 detik hanya muncul di request paling pertama |
| Gambar poster | **AVIF 48 KB** (vs JPEG 89 KB) | Next.js Image sudah menyajikan format modern otomatis |
| Lazy loading | 76 dari 79 gambar | Gambar di bawah layar baru dimuat saat digulir |

**Rencana "ramping-kan payload beranda" DIBATALKAN** sesudah diukur: memangkas field
yang tak dipakai (synopsis dll) hanya menghemat ~29 KB mentah = sekitar **2-3 KB
sesudah kompresi**, sementara ongkosnya mengubah 4 komponen bersama yang dipakai 7
halaman. Tidak sepadan. Kalau nanti ada yang mengusulkan ini lagi, tunjukkan tabel di atas.

## Utang teknis yang DISENGAJA

- **Belum ada verifikasi email.** Siapa pun bisa mendaftar dengan email milik orang
  lain selama email itu belum terdaftar. Butuh domain sendiri + layanan kirim email.
- **Rating penonton masih belum dikirim ke Google.** Sejak Tahap 6 identitas sudah
  aman DAN sudah terbukti di produksi, jadi batasan ini SUDAH BOLEH dicabut kapan saja.
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
- **Jangan tulis karakter non-ASCII di berkas `.ps1`** (em-dash `—`, panah `→`, emoji).
  PowerShell 5.1 membaca `.ps1` tanpa BOM sebagai ANSI; `—` jadi `”` yang dianggap
  **penutup string** → error "Missing closing '}'" di baris yang jauh dari penyebabnya.
  Cek sebelum commit:
  `$e=$null;$t=$null;[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path .\file.ps1).Path,[ref]$t,[ref]$e);$e`
- **Jangan commit `pc-backup-agent/config.yml` atau `pc-backup-agent/*.json`** — itu
  kredensial named tunnel; siapa pun yang punya bisa membajak alamat video. Sudah
  dipagari `.gitignore`, jangan dilonggarkan.
- **Jangan jalankan `start-dramaapp.ps1` (cara lama) bersamaan dengan named tunnel** —
  dua cloudflared akan berebut port 8088.

## Berkas terkait

- 🔴 **Rencana video otomatis (AKTIF):** [`docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md`](./docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md)
- 🔴 **Panduan PC backup (AKTIF):** [`pc-backup-agent/README.md`](./pc-backup-agent/README.md) — perintah lengkap named tunnel + autostart
- Rencana Tahap 7: [`docs/lintasai/rencana/2026-08-18-tahap-7-kode-pemulihan.md`](./docs/lintasai/rencana/2026-08-18-tahap-7-kode-pemulihan.md)
- Rencana Tahap 6: [`docs/lintasai/rencana/2026-08-18-tahap-6-login-penonton.md`](./docs/lintasai/rencana/2026-08-18-tahap-6-login-penonton.md)
- Antrean: [`antrean-deploy.md`](./antrean-deploy.md)
- Arsip: [`NEXT-SESSION.md`](./NEXT-SESSION.md)
- ⛔ **Arsip kadaluarsa** (jangan dipakai sebagai status): [`docs/serah-terima-deploy-2026-08-15.md`](./docs/serah-terima-deploy-2026-08-15.md) — ditandai 2026-08-19
