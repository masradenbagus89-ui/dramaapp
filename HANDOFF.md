# HANDOFF — lanjut di sini

> **Cara pakai:** buka tab chat baru, ketik **`lanjut dari handoff`**.
> AI wajib baca berkas ini **pertama**, lalu `antrean-deploy.md`.
>
> **AI:** tiap kali ada perbaikan / deploy / keputusan — **perbarui berkas ini di langkah terakhir**, sebelum bilang selesai. Jangan tumpuk sejarah panjang di sini; pindahkan yang lama ke `NEXT-SESSION.md`.

**Terakhir diisi:** 2026-08-22 — video mati lagi (**siklus ke-3**) lalu **dipulihkan & diverifikasi
ujung-ke-ujung**; alamat tunnel aktif diperbarui, tanda tanya `/_agent/health` terjawab, + 1 pelajaran
baru (tunnel yatim 530). Bagian lain masih apa adanya dari 2026-08-21, belum diukur ulang.

## Status sekarang (1 menit)

- Situs hidup: **https://dramaapp.vercel.app** — commit kode terbaru `4954817`, di-push ke `origin` + `dramaku` (selisih nol) dan **TERVERIFIKASI TAYANG** 2026-08-20 malam: teks perbaikan player ditemukan di bundle produksi `/_next/static/chunks/27z9f9ucdybcg.js`. Sebelum push: **265 tes lulus**, `tsc --noEmit` exit 0, `next build` sukses, nol secret di diff.
- **Tahap 7 SELESAI PENUH** — diverifikasi 2026-08-20 dari DUA sisi: (a) owner mencoba sendiri lewat tampilan (daftar → simpan kode → ganti password hanya dengan kode; alurnya mudah & berhasil); (b) uji end-to-end mesin ke API produksi **19/19 lulus**. `tests/recovery-code.test.ts` 12 tes lulus. Akun uji sudah dibersihkan dari Supabase (0 baris tersisa, login balas 401).
- Skema database Supabase **tidak diubah** (akun penonton memakai tabel `app_data` yang sudah ada).
- Tahap kelar: 1 · 2 · 3 · 4 (Performance & SEO) · 5 (rating/share/balasan) · 6 (login penonton aman) · 7 (kode pemulihan).
- **AWAS dua penomoran "Tahap" yang beda di repo ini** (sumber salah paham antar-sesi):
  (a) **Tahap PRODUK 1-7** = yang dipakai berkas ini. Tahap 1-3 adalah rencana "platform streaming modern gabungan Melolo + IDLIX + Netflix" — SUDAH SELESAI SEMUA: Tahap 1 `1af6e12` (16 Agt), Tahap 2 `00f0d2e` (17 Agt), Tahap 3 `a8ab69e` (17 Agt). Tahap 4-7 kelanjutannya.
  (b) **Tahap INFRASTRUKTUR 1-8** di [`PLAN-MAPPING.md`](./PLAN-MAPPING.md) = peta lama soal setup/tunnel/deploy. Di situ "Tahap 7" berarti *named tunnel*, BUKAN kode pemulihan. Isinya belum diperbarui sejak Juli.

## 🔴 SEDANG DIKERJAKAN: video mati berulang → dibikin PERMANEN

> ## ✅ SEJAK 2026-08-22 SORE: ALAMAT VIDEO DIURUS OTOMATIS — JANGAN TEMPEL MANUAL LAGI
>
> **JANGAN mencari/menghafal alamat tunnel di berkas ini lagi.** Alamat berganti tiap PC backup
> restart dan **dilaporkan sendiri** oleh PC backup ke database. Cara melihat alamat yang
> benar-benar dipakai (login admin):
> `https://dramaapp.vercel.app/api/agent/video-base` → lihat field `dipakai` + `sumber`.
>
> **JANGAN jalankan `start-dramaapp.ps1` lagi** dan **jangan menempel alamat ke env Vercel** —
> keduanya cara lama. Env `NEXT_PUBLIC_VIDEO_BASE_URL` kini hanya cadangan; kalau baris DB ada,
> env TIDAK dipakai.
>
> Video mati? Cukup di PC backup: `schtasks /run /tn "DramaApp Video"` lalu baca
> `C:\Users\USER\pc-backup-agent\logs\start-video-services.log`.

### 🆕 2026-08-22 — alamat video jadi RUNTIME CONFIG (kode selesai, tinggal dipasang di PC backup)

Akar masalah "video mati tiap PC restart" **dihapus tanpa named tunnel**. Alamat tidak lagi
dibakar saat build; kini dibaca dari Supabase `app_data` key `videobase`, dan PC backup
**melapor sendiri** tiap dapat alamat baru → tidak perlu redeploy, tidak perlu `VERCEL_TOKEN`,
tidak perlu tempel manual, tidak perlu domain.

| Berkas | Perannya |
|---|---|
| `lib/video-base.ts` | `getVideoBaseUrl()` (baca DB, **fallback ke env lama**) + `isAllowedVideoBase()` (pagar keamanan) |
| `lib/store.ts` | `getVideoBaseRecord` / `setVideoBaseRecord` (pola sama dengan `getTwoFA`) |
| `app/api/agent/video-base/route.ts` | **titik-risiko** — POST dari PC backup; 3 lapis: rate-limit 2 kunci → banding rahasia hash+timing-safe → allowlist host |
| `pc-backup-agent/start-video-services.ps1` | **mode QUICK/NAMED otomatis**; mode QUICK menjalankan tunnel lalu melapor |
| `tests/video-base.test.ts` | 16 tes pagar keamanan (host menyamar, http, port, path, kredensial) |

**Kenapa allowlist wajib:** alamat ini nanti di-`fetch` oleh server kita sendiri
(`app/api/teaser/route.ts:31`) — jadi ini jalur **SSRF-tersimpan**. Allowlist-lah yang
memblokir `localhost` / `169.254.169.254` / IP internal. Jangan dilonggarkan.

**Bonus yang ikut beres:** `DramaCard`/`ContentRow` tidak lagi membaca env di browser (pakai
`/api/teaser` seperti hero), dan prop `baseUrl` di `HomeHero` yang ternyata **tak pernah dipakai**
sudah dibuang. Efeknya `/beranda` & `/discover` **tetap ISR 60 detik** — dikonfirmasi di output
`next build` (`○ Static … 1m`), jadi performa yang sudah diukur sehat tidak berubah.

Bukti: **281 tes lulus** (naik dari 265) · `tsc --noEmit` exit 0 · `next build` sukses ·
route `/api/agent/video-base` terdaftar di `app-path-routes-manifest.json`.

#### 🔍 Audit adversarial 2026-08-22 — 7 temuan diperbaiki (dari 30, 23 ditolak verifikasi)

Kode di atas diaudit 65 agent dengan 4 lensa; tiap temuan wajib lolos 2 skeptik independen.
Yang lolos sudah diperbaiki:

| # | Temuan | Perbaikan |
|---|---|---|
| **1 BLOCKER** | Baris DB **selalu menang** atas env & tak pernah kedaluwarsa, mode NAMED tak pernah melapor, tak ada cara menghapus → saat named tunnel dipasang nanti, situs **tetap** menyajikan alamat quick tunnel yang sudah lenyap, padahal env/service/curl semua tampak hijau | `$NAMED_URL` di script + **mode NAMED ikut melapor**; `DELETE /api/agent/video-base` (admin) untuk mengosongkan; `GET` menambah field `sumber`; README diluruskan |
| **2** | Mode QUICK dibatalkan kalau port **8089** mati — padahal video dilayani **8088** (Caddy); 8089 cuma untuk tombol Scan | Syarat diturunkan ke Caddy saja; agent mati = peringatan, bukan pembatalan |
| **3** | Kuota rate-limit global dihitung **sebelum** auth → orang luar bisa membanjiri endpoint tanpa tahu rahasia, menghabiskan kuota, lalu laporan sah PC backup ditolak 429. Pagar keamanan jadi tombol mematikan video | Auth **dulu**; kuota hanya dikenakan pada percobaan yang **gagal** auth |
| **4** | Allowlist host hanya menjaga alamat **awal** — `fetch` mengikuti redirect, jadi upstream bisa membelokkan server kita ke IP internal/metadata cloud (SSRF) | `redirect: "manual"` di **semua** fetch ke sumber video; di `hardlink` ini juga mencegah `x-agent-secret` ikut terkirim ke host redirect |
| **4b** | `/api/teaser` & `/api/download` menyalin `Content-Type` upstream mentah — jalur ini **same-origin**, jadi upstream yang mengaku `text/html` dirender browser di domain kita (XSS) | Dipaksa `video/mp4` + `X-Content-Type-Options: nosniff` |
| **5** | `cloudflared` autoupdate bisa restart sendiri → hostname berganti diam-diam, alamat terlapor jadi basi | `--no-autoupdate` |
| **6** | Kalau lapor gagal, DB **sudah basi** (tunnel lama dibunuh duluan) tapi pesan bilang aman, dan jalan mundur "tempel ke env" **tidak berfungsi** (env kalah dari DB) | Pesan diluruskan + perintah POST manual siap-salin dicetak ke log |
| **7** | Bagian Verifikasi README hanya sahih untuk mode NAMED → pemakai mode QUICK dapat 3 kegagalan palsu | Verifikasi dipecah: langkah bersama + tambahan khusus NAMED |

Pemeriksaan kesiapan tunnel juga dilonggarkan dari "2xx/3xx" ke **HTTP < 500** — tunnel sehat
yang membalas 404/405 di root dulu dianggap gagal sehingga alamatnya tak pernah dilaporkan.

✅ **AKTIF & TERBUKTI JALAN — 2026-08-22 15:23.** Rantai lengkap berhasil untuk pertama kalinya:
PC backup menjalankan tunnel sendiri lalu **melapor sendiri**, dan situs langsung memakai alamat
baru **tanpa redeploy dan tanpa owner menyentuh Vercel**.

Bukti dari log PC backup (`logs\start-video-services.log`):

```
15:22:42  caddy: C:\Users\USER\AppData\Local\...\WinGet\Packages\CaddyServer.Caddy_...\caddy.exe
15:22:47  cloudflared: C:\Users\USER\cloudflared.exe
15:23:00  tunnel balas HTTP 530 (belum nyambung ke Caddy), tunggu...
15:23:04  tunnel terbukti dijawab server (HTTP < 500)
15:23:06  [QUICK] alamat DILAPORKAN & tersimpan: https://inspection-says-without-sam...
```

Perhatikan 15:23:00 → 15:23:04: tunnel sempat 530 dan script **menolak melaporkannya** sampai
benar-benar melayani. Tanpa penjaga itu, alamat "tunnel yatim" akan tersimpan dan video mati —
persis jebakan yang menggigit 4 kali sebelumnya.

Bukti dari produksi: `/api/teaser` **206** di 3 drama berbeda; 1.048.576 byte terunduh dengan
`content-type: video/mp4` dan signature `ftypmp42`; bundle produksi **nol** alamat tunnel
(artinya alamat memang datang dari database, bukan dari build).

### 🔴 PELAJARAN TERPENTING 2026-08-22: QUIC diblokir → 530 yang menyamar jadi "tunnel yatim"

Sebagian besar waktu seharian itu habis karena **gejalanya berbohong**. Tunnel selalu punya
DNS hidup dan setiap langkah pemasangan melapor sukses, tapi Cloudflare membalas **530** ke
semua orang. Penyebabnya baru terbaca dari `logs\cloudflared.err.log`:

```
ERR Failed to dial a quic connection error="failed to dial to edge with quic:
    timeout: handshake did not complete in time"
```

**Jaringan PC backup memblokir QUIC (UDP 7844)** — protokol bawaan cloudflared ke edge.
Tunnel jadi *terdaftar* (DNS hidup) tapi tidak pernah *tersambung*. Dari luar, gejalanya
identik dengan tunnel yatim, jadi berulang kali salah didiagnosis.

**Obatnya:** `--protocol http2` (TCP 443). Sudah dipasang di script untuk mode QUICK.
Untuk named tunnel nanti: `protocol: http2` di `config.yml`.

**Cara mendeteksi cepat lain kali** — jangan tebak dari luar, baca dari cloudflared sendiri:
baris **`Registered tunnel connection`** di `logs\cloudflared.err.log` = benar-benar tersambung.
Kalau tidak ada baris itu, tunnel belum melayani berapa pun DNS-nya terlihat hidup.
Script sekarang menunggu baris itu dan mencatatnya.

⚠️ **Mendapat ALAMAT ≠ TERSAMBUNG.** cloudflared mencetak alamat lebih dulu, baru menghubungi
edge. Jangan pernah menyimpulkan sehat hanya karena alamat sudah muncul.

**Bukti berhasil (2026-08-22 18:35):** log memuat `TERSAMBUNG ke edge` + `TERBUKTI
ujung-ke-ujung`; dari produksi `/api/teaser` **206 di 5 dari 5 drama**, 1.048.576 byte
`video/mp4` `ftypmp42`; tunnel diuji dari jaringan lain balas **200** (bukan 530).

**Empat kegagalan pemasangan yang terjadi & sudah diperbaiki** (jangan terulang di PC lain):
0. **QUIC diblokir** (di atas) — akar yang sebenarnya.
0b. **`Invoke-WebRequest -Headers @{Range=...}` dilarang di PowerShell 5.1** (`ArgumentException`,
   tanpa `.Response` → terbaca "kode 0"). Ini membuat penjaga 15 menit selalu memvonis rantai
   rusak lalu **membangun ulang tunnel terus-menerus**. Wajib `HttpWebRequest.AddRange`.
1. Tugas terjadwal jalan sebagai **SYSTEM** (`DESKTOP-...$`), yang **tidak** mewarisi PATH akun
   user → `caddy.exe tidak ketemu`. Diperbaiki: `Cari-Exe` membaca PATH dari **registry**
   (mesin + tiap profil user).
2. `caddy` dipasang lewat **winget**, jadi binernya di dalam profil user dengan nama folder
   bervensi. Diperbaiki: pencarian wildcard ke `WinGet\Links`, `WinGet\Packages\*`, `scoop\shims`,
   dan root profil user (yang terakhir menangkap `cloudflared.exe`).

**Status 2026-08-22 — siklus ke-3, PULIH & TERVERIFIKASI.** Owner lapor video tak bisa diputar.
Diukur langsung: alamat yang dipakai produksi saat itu (`mac-carroll-flows-holly.trycloudflare.com`)
sudah **LENYAP** (`nslookup` → `Non-existent domain`, `curl` → 000), dan `/api/teaser` balas **502**
= `app/api/teaser/route.ts:62` "Sumber video sedang mati" — bukti dari sisi **server Vercel**, bukan
cuma jaringan lokal. Situs sendiri sehat (`/beranda` 200).

Pemulihan: `start-dramaapp.ps1` di PC backup ([5/6] gagal 403 seperti biasa) → alamat baru ditempel
manual ke env + **Redeploy tanpa build cache**. Diverifikasi **4 gerbang, semua LULUS**:

| Gerbang | Hasil |
|---|---|
| Bundle produksi memuat alamat yang benar | ✅ `therefore-donna-crops-doctors` (dicocokkan **persis**, bukan sekadar "bukan yang lama") |
| DNS alamat itu | ✅ hidup |
| `/api/teaser` (server Vercel → sumber) | ✅ **206** (bukan 502) |
| Isi berkas `1.mp4` | ✅ **206** `video/mp4`, signature **`ftypmp42`** = MP4 asli, bukan halaman error menyamar |

Diuji juga langsung ke tunnel: **8 dari 10** drama pertama punya `1.mp4` sah. Yang 404:
`28-years-later-the-bone-temple`, `avengers-doomsday` — memang belum ada berkasnya (bukan masalah
tunnel). Jangan pakai keduanya sebagai bahan uji.

✅ **`/_agent/health` TERJAWAB — kini balas 200** `{"ok":true,"videoRoot":"C:\\Users\\USER\\Downloads\\video","port":8089}`.
Dugaan lama "agent tak terjangkau" (404 pada 2026-08-20) **GUGUR** — itu gejala tunnel yang sudah
mati, bukan soal agent.
❓ **Masih terbuka:** apakah `hardlink-agent.js` di PC backup sudah versi baru. Jalur `/health`
(`hardlink-agent.js:243`) cuma balas `ok/videoRoot/port` **tanpa menyebut versi**, jadi 200 TIDAK
bisa dipakai menyimpulkan itu. Hanya memengaruhi "Scan & auto-hardlink", bukan pemutaran video.

⚠️ **PELAJARAN BARU 2026-08-22 — "tunnel yatim" balas 530.** Owner menjalankan `start-dramaapp.ps1`
**dua kali**, jadi dua alamat tercetak di layar. Run kedua membunuh cloudflared run pertama
(`start-dramaapp.ps1:81`), **tapi catatan DNS-nya tertinggal** → alamat run pertama tetap resolve
di DNS namun balas **530** (nama terdaftar, tak ada yang menjawab di ujung). Menempel alamat itu =
video tetap mati dengan sebab yang sulit dilacak, karena cek DNS saja akan terlihat "hijau".
**Aturan: selalu pakai alamat dari run TERAKHIR, dan verifikasi `curl` root balas 200 — bukan cuma
DNS.** Jangan jalankan script lagi setelah alamatnya ditempel ke Vercel; alamat itu langsung basi.

⚠️ **Koreksi catatan lama:** "utang `VERCEL_TOKEN` GUGUR" itu **baru berlaku SESUDAH named tunnel
terpasang**. Selama masih quick tunnel, token mati = tiap restart PC owner harus tempel alamat
manual. Sudah menggigit 3 kali.

<details><summary>Riwayat siklus 1-2 (2026-08-20, usang — jangan dipakai sebagai status)</summary>

- **Sore:** tunnel `written-coated-drawings-joe` balas 200, `/_agent/health` `{"ok":true}`,
  `guru-misterius-.../1.mp4` 200. Jadi 404 yang sempat terlihat bukan tunnel mati, melainkan
  berkas yang dicari memang tak ada di folder drama itu (kasus "Over Your Dead Body",
  lihat "Belum selesai" no.1).
- **Malam:** alamat sore itu lenyap → dipulihkan ke `proxy-marks-isolation-subjects`,
  diverifikasi 206 `video/mp4` + `ftypmp42`.
- Sesudah itu sempat berganti lagi ke `mac-carroll-flows-holly` (tak tercatat di sesinya) —
  dan itu pun sudah mati per 2026-08-22.

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
| 2026-08-22 | **Video mati lagi (siklus ke-3) → dipulihkan & dibuktikan 4 gerbang** | Alamat video sebelumnya sudah lenyap dari internet; server Vercel sendiri balas 502 saat mencoba menjangkaunya. Dipulihkan ke `therefore-donna-crops-doctors`. Ketahuan juga jebakan baru: menjalankan `start-dramaapp.ps1` dua kali meninggalkan **"tunnel yatim"** yang DNS-nya masih hidup tapi balas **530** — kalau alamat itu yang ditempel, video tetap mati padahal semua "kelihatan hijau". Sekarang tercatat supaya tak terulang. Bonus: tanda tanya `/_agent/health` sejak 20 Agt terjawab (kini **200**, dugaan lama gugur) |
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
   Lalu **salin `pc-backup-agent/hardlink-agent.js` versi baru** ke `C:\Users\USER\pc-backup-agent\` + `schtasks /run /tn "DramaApp Video"` supaya tombol Scan bisa menangani sendiri lain kali. **Koreksi 2026-08-22:** "bukti tambahan" versi agent lama itu **tidak sahih** — `/_agent/health` sekarang balas **200**, jadi 404 waktu itu cuma gejala tunnel yang mati. Versi agent di PC backup **tetap belum diketahui** (`/health` tidak menyebut versi), jadi menyalin berkas versi baru masih layak dilakukan. Rincian: [`docs/lintasai/rencana/2026-08-20-video-nama-berkas-1mp4.md`](./docs/lintasai/rencana/2026-08-20-video-nama-berkas-1mp4.md).
2. ~~**Hidupkan video lagi (Tahap 1)**~~ — **PULIH, terakhir 2026-08-22 (siklus ke-3).** Alamat aktif sekarang `https://therefore-donna-crops-doctors.trycloudflare.com`; `proxy-marks-isolation-subjects` dan `mac-carroll-flows-holly` sudah **LENYAP**. Diverifikasi 4 gerbang (bundle produksi cocok persis · DNS hidup · `/api/teaser` **206** · signature `ftypmp42`) — rinciannya di seksi "SEDANG DIKERJAKAN" di atas. ⚠️ **Tetap sementara** — mati lagi tiap PC backup restart, dan karena [5/6] balas 403 alamat barunya harus ditempel **manual** ke env Vercel + **Redeploy tanpa build cache**. Berhenti berulang hanya sesudah Tahap 2 (no.3).
3. 🟡 **Pasang alamat permanen + autostart (Tahap 2).** **Turun prioritas 2026-08-22:** bagian
   "alamat permanen" (a·b·e) kini **OPSIONAL** — mode QUICK sudah menghapus keharusan alamat tetap.
   Yang MASIH perlu dikerjakan & bernilai tinggi: **(c) autostart `start-video-services.ps1` +
   (d) `powercfg` cegah sleep**, plus set `HARDLINK_AGENT_SECRET` level `Machine`. Sesudah itu
   PC menyala = video hidup sendiri, tanpa PowerShell, tanpa tempel alamat. Named tunnel dikerjakan
   nanti saat domain di-ACC atasan; script berpindah mode sendiri. Urutan asli: Urutannya: (a) `amasyaforum.com` → Cloudflare, ganti nameserver di Namecheap; (b) `cloudflared` named tunnel + `service install`; (c) salin `start-video-services.ps1` ke PC backup + `schtasks /sc onstart`; (d) `powercfg` cegah sleep; (e) env Vercel = `https://video.amasyaforum.com` (terakhir kali). **Perintah lengkap ada di [`pc-backup-agent/README.md`](./pc-backup-agent/README.md).** Sesudah ini tidak perlu buka PowerShell lagi selamanya.
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
13. 🔑 **Pasang 2FA di akun Vercel owner — BELUM aktif per 2026-08-21, menunggu owner.** Vercel
    menawarkannya lewat layar "Secure Your Account with 2FA"; akun inilah yang menguasai domain,
    tombol Redeploy, dan Environment Variables (alamat video + `DASHBOARD_API_KEY`). Cara:
    ketik sendiri `https://vercel.com/account/settings/authentication` (jangan lewat link kiriman —
    cegah phishing) → Enable → **Authenticator App** → scan QR → ketik 6 angka → **simpan recovery
    codes di password manager / di LUAR folder repo** (repo ini publik; `.gitignore` sudah dipasangi
    pola `*recovery-codes*.txt` sebagai jaring cadangan, terbukti tidak menelan `lib/recovery-code.ts`).
    **Efek ke pekerjaan lain:** no.5 (isi env Playly) dan no.8 opsi (b) (buat token baru di
    `vercel.com/account/tokens`) sama-sama lewat dashboard → sesudah 2FA aktif, keduanya butuh HP
    owner di tangan. Deploy otomatis dari GitHub **tidak** terpengaruh. Bukti sudah aktif: logout →
    login lagi, harus diminta 6 angka. Dasar: <https://vercel.com/docs/two-factor-authentication>.
    ❓ Belum terverifikasi: apakah access token lama tetap sah setelah 2FA menyala — dokumentasi 2FA
    Vercel tidak menyebut token sama sekali. Tidak menghalangi apa pun sekarang (token itu memang
    sudah mati 403 sejak 2026-08-19, lihat no.8).

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
- **Jangan jalankan `start-dramaapp.ps1` dua kali, dan jangan menjalankannya lagi sesudah
  alamatnya ditempel ke Vercel.** Tiap run memberi alamat baru DAN membunuh yang lama, tapi
  catatan DNS alamat lama tertinggal → jadi "tunnel yatim" yang balas **530**. Akibatnya cek
  DNS terlihat hijau padahal sumbernya mati. Kalau terlanjur dijalankan berkali-kali: pakai
  alamat dari run **TERAKHIR**, dan pastikan `curl <alamat>/` balas **200** — jangan berhenti
  di cek DNS. (Terjadi 2026-08-22.)

## Berkas terkait

- 🔴 **Rencana video otomatis (AKTIF):** [`docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md`](./docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md)
- 🔴 **Panduan PC backup (AKTIF):** [`pc-backup-agent/README.md`](./pc-backup-agent/README.md) — perintah lengkap named tunnel + autostart
- Rencana Tahap 7: [`docs/lintasai/rencana/2026-08-18-tahap-7-kode-pemulihan.md`](./docs/lintasai/rencana/2026-08-18-tahap-7-kode-pemulihan.md)
- Rencana Tahap 6: [`docs/lintasai/rencana/2026-08-18-tahap-6-login-penonton.md`](./docs/lintasai/rencana/2026-08-18-tahap-6-login-penonton.md)
- Antrean: [`antrean-deploy.md`](./antrean-deploy.md)
- Arsip: [`NEXT-SESSION.md`](./NEXT-SESSION.md)
- ⛔ **Arsip kadaluarsa** (jangan dipakai sebagai status): [`docs/serah-terima-deploy-2026-08-15.md`](./docs/serah-terima-deploy-2026-08-15.md) — ditandai 2026-08-19
