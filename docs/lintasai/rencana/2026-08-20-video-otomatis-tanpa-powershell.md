# Rencana: Video jalan otomatis tanpa buka PowerShell

- **Tanggal:** 2026-08-20
- **Bobot:** BERAT — titik-risiko rilis (env var + redeploy Vercel), fitur baru (autostart + alamat permanen), 3 subsistem (PC backup · Cloudflare/DNS · aplikasi Vercel)
- **Diminta client:** *"video dramaapp tidak bisa diputar sejak kemarin, sudah restart tapi tetap mati. Cari cara agar videonya bisa diputar tanpa harus buka PowerShell — saya mau otomatis."*

## Ringkasan

Video mati bukan karena satu bug, tapi karena rantainya memang dirancang manual: alamat
video disimpan di env var Vercel yang **dibakar saat build**, isinya dari **quick tunnel
yang alamatnya acak baru tiap restart**, dan langkah yang mendorong alamat baru itu ke
Vercel **gagal 403** karena `VERCEL_TOKEN` mati. Jadi restart berapa kali pun percuma.

Solusinya menghapus penyebabnya, bukan menambal token: alamat video dibuat **permanen**
(`https://video.amasyaforum.com`) lewat cloudflared **named tunnel**, lalu semua service
dijalankan Windows sendiri saat boot. Sesudah itu env var Vercel diisi **sekali selamanya**
dan `VERCEL_TOKEN` tidak dibutuhkan lagi.

## Keputusan client (popup 2026-08-20)

| Pertanyaan | Jawaban |
|---|---|
| Arah perbaikan | **Bertahap** — hidupkan hari ini → otomatis penuh (gratis) → R2 nanti |
| Domain alamat video | **`amasyaforum.com`** (nameserver dipindah ke Cloudflare) |
| Kondisi PC backup | **Nyala hampir 24 jam** → migrasi R2 ditunda |

## ✅ Terverifikasi

- `GET https://dramaapp.vercel.app/` → **200**, tapi `GET /api/teaser?...` → **502 "Sumber video sedang mati"** (dites 2026-08-20)
- Pesan itu dari satu tempat: `app/api/teaser/route.ts:61-63`
- Alamat video = satu sumber tunggal, tanpa override per-drama: `lib/video.ts:12-13`; tidak ada `videoUrl`/`driveId` di `lib/types.ts:11-47`, `data/dramas.json`, maupun tabel `dramas` (`lib/dramas.ts:30-57`)
- `NEXT_PUBLIC_VIDEO_BASE_URL` dipakai di 10 titik, semuanya `process.env` langsung — 2 di antaranya dibaca **client-side** (`app/components/DramaCard.tsx:11`, `app/components/ContentRow.tsx:34`), jadi ganti nilai **wajib redeploy**
- Script lama pakai quick tunnel: `pc-backup-agent/start-dramaapp.ps1:88-92`; langkah Vercel gagal 403 (`HANDOFF.md:23-26`)
- Script lama **tidak bisa** dijadikan autostart: `Read-Host` di `:168` + `Start-Process powershell -NoExit` di `:72`/`:77`
- **Nol dukungan Google Drive / R2 / CDN di kode** — grep `drive.google|googleusercontent|cloudflarestorage|bunnycdn|r2.dev` di `app/ lib/ components/ scripts/ data/` = 0 hasil
- `amasyaforum.com` masih halaman parkir Namecheap (A `192.64.119.233`, NS `dns1/dns2.registrar-servers.com`) — aman dipakai
- cloudflared Windows service **wajib** named tunnel + `config.yml` di `C:\Windows\System32\config\systemprofile\.cloudflared\`; quick tunnel `--url` tidak bisa (dokumentasi Cloudflare)
- Harga R2 (untuk Tahap 3): `$0.015/GB-bulan`, **egress gratis**, free tier `10 GB-bulan`

## PELAJARAN — bug yang lolos ke penonton

**1. Layar hitam tanpa penjelasan saat sumber video mati.**
`FeedPlayer.tsx` mengarahkan `src` ke `/sample.mp4` saat gagal, padahal berkas itu tidak
pernah ada di `public/` DAN diblokir `.gitignore` (`public/*.mp4`, `*.mp4`). Hasilnya 404 →
kotak hitam. Penonton tidak tahu apa yang terjadi, owner tidak tahu ada yang rusak.
→ **Penjaga permanen dipasang:** `decideVideoError()` di `lib/video.ts` + 5 tes di
`tests/video.test.ts`. Jalur gagal sekarang WAJIB berakhir di `"menyerah"` yang memunculkan
pesan + tombol "Coba lagi".

**2. Berkas `.ps1` berisi karakter non-ASCII bisa gagal parse di PowerShell 5.1.**
PowerShell 5.1 membaca `.ps1` tanpa BOM sebagai ANSI. Tanda `—` (em-dash, UTF-8 `E2 80 94`)
terbaca sebagai `â€”` di mana byte `0x94` = `”` — dan PowerShell memperlakukan `”` sebagai
**delimiter string**. Akibatnya string putus di tengah dan brace jadi tidak seimbang:
*"Missing closing '}'"* di baris yang jauh dari sumber masalahnya.
→ **Aturan:** berkas `.ps1` di project ini **hanya ASCII**. Cek sebelum commit:
```powershell
$e=$null;$t=$null;[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path .\file.ps1).Path,[ref]$t,[ref]$e);$e
```

## Yang TIDAK dibangun (sengaja)

- Aplikasi **tetap tidak bisa** memutar langsung dari Google Drive (butuh kode baru; Drive juga punya kuota unduh harian & sering blokir hotlink). Drive tetap berguna sebagai cadangan / sumber upload ke R2.
- **PC backup masih harus nyala.** Tahap 1-2 menghapus langkah manual, bukan ketergantungan pada PC. Hanya R2 (Tahap 3) yang menghapus itu.
- Tidak menyentuh login penonton, koin, komentar, rating, kode pemulihan, skema Supabase.
- `start-dramaapp.ps1` **tidak dihapus** — disimpan sebagai jalan mundur, sudah ditandai "CARA LAMA" di header.
- **Tidak membuat `VERCEL_TOKEN` baru** — sesudah Tahap 2 token itu tidak dibutuhkan lagi. Tugas nomor 5 di HANDOFF gugur, bukan dikerjakan.

## Yang ikut tersenggol

| Fitur/halaman lain | Sudah ada penjaganya? |
|---|---|
| Pemutar drama (feed vertikal) | ✅ `tests/video.test.ts` — 12 tes, termasuk 5 tes baru jalur gagal |
| Tombol Unduh episode (`downloadUrl` + `?dl=1`) | ⚠️ belum ada tes; alamatnya ikut berubah → **cek manual** sesudah ganti env |
| Subtitle (`.vtt` dari alamat yang sama) | ⚠️ `tests/subtitles.test.ts` ada tapi tidak menyentuh alamat asal → **cek manual** |
| Trailer hero di Beranda/Discover | ✅ `tests/hero-teaser.test.ts` + sudah fallback ke poster |
| Preview hover poster | ✅ sudah diam-diam balik ke poster saat gagal |
| Admin → "Scan & auto-hardlink" | ⚠️ belum ada tes end-to-end → **wajib dicoba manual** (ini yang dulu error `Unexpected token '<'`) |
| Kartu status Playly di /admin | ✅ tidak tersentuh — jalur Playly terpisah dari alamat tunnel |

## Tahapan & status

### ✅ SELESAI — perbaikan kode (dikerjakan 2026-08-20)

| Berkas | Perubahan |
|---|---|
| `lib/video.ts` | + `decideVideoError()` — fungsi murni penentu langkah saat `<video>` error |
| `app/components/FeedPlayer.tsx` | hapus `FALLBACK = "/sample.mp4"`; `onError` pakai `decideVideoError`; + state `failedEps` + `retryEpisode()`; + panel "Video sedang tidak bisa diputar" + tombol **Coba lagi** |
| `tests/video.test.ts` | + 5 tes penjaga jalur gagal |
| `pc-backup-agent/start-video-services.ps1` | **BARU** — autostart tanpa `Read-Host`, path absolut node/caddy, log ke `logs\`, verifikasi port benar-benar hidup |
| `pc-backup-agent/cloudflared-config.example.yml` | **BARU** — contoh config named tunnel (tanpa kredensial asli) |
| `pc-backup-agent/README.md` | ditulis ulang ke cara baru; cara lama diarsipkan di bagian bawah |
| `pc-backup-agent/start-dramaapp.ps1` | diberi header "CARA LAMA / JALAN MUNDUR" |
| `.gitignore` | + `pc-backup-agent/config.yml`, `pc-backup-agent/*.json`, `pc-backup-agent/logs/` |

**Bukti:** `npm test` → **255 tes lulus (25 berkas)** · `npx tsc --noEmit` → **exit 0** ·
`npm run build` → **exit 0** · parse-check kedua `.ps1` → **0 error sintaks**.

### ⏳ MENUNGGU OWNER — langkah di PC backup / Cloudflare / Vercel

Claude tidak bisa menyentuh PC backup (`C:\Users\USER\...` tidak ada di mesin Claude).

1. **Tahap 1 (sementara, ~10 menit)** — ambil alamat tunnel aktif dari
   `$env:TEMP\cloudflared-dramaapp.log`, tempel ke env `NEXT_PUBLIC_VIDEO_BASE_URL` di
   Vercel, Redeploy tanpa build cache. Video hidup lagi hari ini.
2. **Tahap 2a** — Cloudflare → Add site `amasyaforum.com` (Free) → ganti nameserver di
   Namecheap → tunggu **Active**.
3. **Tahap 2b** — `cloudflared login` → `tunnel create dramaapp-videos` →
   `tunnel route dns ... video.amasyaforum.com` → `config.yml` → `service install` →
   `sc start cloudflared`.
4. **Tahap 2c** — salin `start-video-services.ps1` ke `C:\Users\USER\pc-backup-agent\`,
   set `HARDLINK_AGENT_SECRET` level **Machine**, daftarkan `schtasks ... /sc onstart /ru SYSTEM`.
5. **Tahap 2d** — `powercfg` cegah sleep.
6. **Tahap 2e** — env Vercel = `https://video.amasyaforum.com` → Redeploy (**terakhir kali**).
7. **Tes penentu** — restart PC backup, **jangan buka PowerShell**, tunggu 2 menit, video harus hidup sendiri.

Perintah lengkapnya ada di `pc-backup-agent/README.md`.

### 📌 DITUNDA — Tahap 3: lepas total dari PC backup (Cloudflare R2)

Ditunda atas keputusan owner (PC nyala hampir 24 jam). Catatan supaya tidak hilang:
- Bucket R2 + custom domain `cdn.amasyaforum.com` — gratis dan tanpa langkah tambahan karena domainnya sudah di Cloudflare sejak Tahap 2a. **`r2.dev` tidak boleh dipakai** (dokumentasi Cloudflare: *"rate-limited and should only be used for development purposes"*).
- Skrip `scripts/upload-videos-r2.mjs` — sudah diusulkan di `docs/ROADMAP_PARITAS_KOMPETITOR_v1.md:48`, belum pernah dibuat.
- Biaya: 100 GB ≈ Rp22rb/bln · 300 GB ≈ Rp70rb/bln, egress gratis.
- **Catatan ToS (jujur):** menyajikan video lewat CDN Cloudflare paket gratis itu area abu-abu — Cloudflare berhak membatasi akses kalau CDN dipakai *"to serve video or a disproportionate percentage of ... large files"* tanpa layanan berbayar. Setup `trycloudflare` sekarang **sudah** di area yang sama, jadi named tunnel bukan risiko baru; R2 adalah jalur yang sah.

## Sisa utang (belum dikerjakan, butuh izin owner)

- `app/components/VideoPlayer.tsx` = **dead code** (tidak di-import di mana pun) dan masih menyimpan bug `/sample.mp4` yang sama. Kandidat dihapus, tapi di luar lingkup permintaan — tunggu persetujuan owner.
