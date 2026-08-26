# PC Backup Agent — Setup Guide

Penyaji video dramaapp dari PC backup: Caddy menyajikan berkas `.mp4`, hardlink-agent
merapikan nama berkas (fitur "Scan & auto-hardlink" di admin), cloudflared membuka
alamat publiknya.

> **Sejak 2026-08-20 cara jalannya berubah.** Dulu tiap PC restart wajib buka 3 window
> PowerShell + update alamat di Vercel. Sekarang semuanya jalan sendiri saat PC menyala.
> Bagian **"Cara baru"** di bawah adalah yang berlaku; cara lama disimpan di paling bawah
> sebagai jalan mundur.
>
> **Sejak 2026-08-22 tidak perlu menunggu named tunnel lagi.** `start-video-services.ps1`
> punya **dua mode** yang dipilih otomatis:
>
> | Mode | Kapan aktif | Yang terjadi |
> |---|---|---|
> | **QUICK** | service `cloudflared` **belum** terpasang | script menjalankan quick tunnel sendiri, lalu **melapor** alamat acaknya ke situs → alamat langsung dipakai **tanpa redeploy & tanpa tempel manual** |
> | **NAMED** | service `cloudflared` **sudah** Running | alamat sudah permanen; script tidak menyentuh tunnel sama sekali |
>
> Artinya **Setup Bagian B (named tunnel) sekarang OPSIONAL** — pasang saat domain sudah
> siap. Sebelum itu, Bagian A + C + D sudah cukup untuk membuat video hidup sendiri tiap
> PC menyala.
>
> ⚠️ **PENTING saat nanti pindah ke named tunnel** (koreksi atas versi awal dokumen ini, yang
> keliru menjanjikan "tidak ada yang perlu diubah"): alamat yang **tersimpan di database
> SELALU menang** atas env var `NEXT_PUBLIC_VIDEO_BASE_URL`, dan **tidak pernah kedaluwarsa**.
> Jadi saat berpindah ke named tunnel kamu **wajib** melakukan salah satu dari ini:
>
> 1. **Isi `$NAMED_URL`** di `start-video-services.ps1` (mis. `https://video.amasyaforum.com`).
>    Mode NAMED akan melaporkan alamat itu tiap boot, jadi database selalu ikut kenyataan.
>    **Ini cara yang disarankan.** Kalau dibiarkan kosong, script sengaja **berhenti dengan
>    pesan gagal** — bukan diam-diam melanjutkan.
> 2. Atau **kosongkan** alamat tersimpan supaya situs kembali memakai env var:
>    `DELETE /api/agent/video-base` (perlu login admin).
>
> Tanpa salah satu langkah itu, situs akan **terus menyajikan alamat quick tunnel lama yang
> sudah lenyap** walaupun named tunnel sehat — dan semuanya tampak hijau: env var benar,
> `sc query cloudflared` Running, `curl https://video.amasyaforum.com/` balas 200.
> **Cara memastikan alamat mana yang benar-benar dipakai:** buka `GET /api/agent/video-base`
> sebagai admin dan lihat field `dipakai` + `sumber`. Env var di dashboard Vercel **bukan**
> sumber kebenaran lagi.

## Prasyarat

- Windows + Node.js terpasang (cek: `node --version`)
- Caddy terpasang (cek: `caddy version`)
- cloudflared terpasang (cek: `cloudflared.exe --version`)
- Folder video di `C:\Users\USER\Downloads\video\`
- **1 domain di akun Cloudflare** (dipakai `amasyaforum.com`) — syarat named tunnel

## File di folder ini

| Berkas | Fungsi |
|---|---|
| `hardlink-agent.js` | Node HTTP server port 8089 — merapikan nama berkas video |
| `Caddyfile` | Config Caddy: sajikan video port 8088 + reverse-proxy `/_agent/*` |
| `start-video-services.ps1` | **[CARA BARU]** dijalankan Windows saat boot: start agent + Caddy |
| `cloudflared-config.example.yml` | **[CARA BARU]** contoh config named tunnel |
| `penjaga-berkas.ps1` | **[PENJAGA]** tiap 10 menit: pulihkan berkas penting yang hilang dari `cadangan\` |
| `pasang-penjaga.ps1` | **[PENJAGA]** pemasang sekali-jalan untuk penjaga di atas (Bagian F) |
| `optimalkan-film.ps1` | perkecil berkas film besar supaya bisa diputar lewat tunnel |
| `start-dramaapp.ps1` | **[CARA LAMA]** launcher manual — disimpan sebagai jalan mundur |
| `README.md` | berkas ini |

---

# Cara baru — jalan otomatis, tanpa buka PowerShell

Hasil akhir: **nyalakan PC backup → tunggu ±1 menit → video sudah hidup.** Tidak ada
window yang dibuka, tidak ada alamat yang di-update, tidak ada redeploy Vercel.

Kenapa bisa begitu: alamat video jadi **tetap** (`https://video.amasyaforum.com`) berkat
*named tunnel*, jadi env var `NEXT_PUBLIC_VIDEO_BASE_URL` di Vercel diisi **sekali
selamanya**. `VERCEL_TOKEN` tidak dibutuhkan lagi.

## Setup 1× — Bagian A: token agent (kalau belum pernah)

Token rahasia untuk auth antara Vercel ↔ agent.

```powershell
$secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host "Secret: $secret"
Set-Clipboard -Value $secret
```

Token itu dipasang di **2 tempat**:

1. **Vercel** → project dramaapp → Settings → Environment Variables → `HARDLINK_AGENT_SECRET`
   (Sensitive: **ON**, Environments: Production + Preview) → Save → Redeploy.
2. **PC backup**, sebagai env var tingkat mesin — buka **PowerShell sebagai Administrator**:
   ```powershell
   [Environment]::SetEnvironmentVariable('HARDLINK_AGENT_SECRET','<paste-token>','Machine')
   ```
   Level `Machine` (bukan `User`) itu wajib: tugas Windows jalan sebagai akun SYSTEM,
   yang tidak bisa membaca env var milik akun user. Token disimpan di sini, **bukan di
   dalam script**, supaya tidak pernah ikut ter-commit ke repo.

## Setup 1× — Bagian B: named tunnel + Windows service  *(OPSIONAL sejak 2026-08-22)*

> **Boleh dilewati dulu.** Tanpa bagian ini script jalan di **mode QUICK** dan video tetap
> hidup sendiri tiap PC menyala — alamatnya saja yang berganti-ganti, dan itu tidak lagi
> menjadi masalah karena PC backup melaporkannya sendiri. Kerjakan bagian ini saat domain
> sudah di-ACC; script berpindah mode otomatis, tidak ada yang perlu diubah.
>
> Syarat mode QUICK: `cloudflared.exe` **ada di PC** (tidak harus jadi service) dan env
> `HARDLINK_AGENT_SECRET` di PC = yang di Vercel (Bagian A).

Prasyarat: `amasyaforum.com` sudah ditambahkan ke akun Cloudflare dan berstatus **Active**
(nameserver di Namecheap sudah diarahkan ke Cloudflare).

```powershell
cd $env:USERPROFILE
.\cloudflared.exe login                                   # pilih zona amasyaforum.com di browser
.\cloudflared.exe tunnel create dramaapp-videos           # CATAT UUID yang muncul
.\cloudflared.exe tunnel route dns dramaapp-videos video.amasyaforum.com
```

Lalu siapkan config-nya:

1. Salin `cloudflared-config.example.yml` → ganti `<UUID-TUNNEL>` dengan UUID asli.
2. Simpan sebagai `config.yml` di `C:\Windows\System32\config\systemprofile\.cloudflared\`
   (lokasi WAJIB — di situlah service mencarinya).
3. Pindahkan berkas kredensial `<UUID>.json` ke folder yang sama.

```powershell
.\cloudflared.exe tunnel ingress validate     # harus bilang config valid
.\cloudflared.exe service install
sc start cloudflared
sc query cloudflared                          # harus: STATE : 4 RUNNING
```

## Setup 1× — Bagian C: autostart agent + Caddy

Salin `start-video-services.ps1` ke `C:\Users\USER\pc-backup-agent\`, lalu di
**PowerShell sebagai Administrator**:

```powershell
# 1) saat PC menyala
schtasks /create /tn "DramaApp Video" /sc onstart /ru SYSTEM /rl HIGHEST /f `
  /tr "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\Users\USER\pc-backup-agent\start-video-services.ps1"

# 2) WAJIB juga: penjaga yang jalan tiap 15 menit
schtasks /create /tn "DramaApp Video Watchdog" /sc minute /mo 15 /ru SYSTEM /rl HIGHEST /f `
  /tr "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\Users\USER\pc-backup-agent\start-video-services.ps1"
```

> **Kenapa perlu DUA tugas.** Tugas `onstart` berjalan sangat awal saat Windows menyala —
> sering **sebelum jaringan siap**. Kalau saat itu gagal, dulu tidak ada yang mencoba lagi
> sampai ada manusia yang turun tangan; itu penyebab kegagalan nyata 2026-08-22.
> Penjaga 15 menit membuat sistem **memperbaiki dirinya sendiri**: apa pun sebab kegagalannya,
> video pulih dalam ≤15 menit tanpa disentuh.
>
> Aman dijalankan sesering itu karena script bersifat **idempoten** — kalau tunnel masih hidup
> dan melayani, ia tidak menyentuh apa pun (log: `sudah sehat - tidak ada yang diubah`).
> Dua instance yang berpapasan juga tidak bertabrakan: ada kunci antar-proses, yang kedua
> keluar diam-diam.

Uji tanpa perlu restart:

```powershell
schtasks /run /tn "DramaApp Video"
Get-Content C:\Users\USER\pc-backup-agent\logs\start-video-services.log -Tail 30
```

Baris terakhir yang benar tergantung mode:

- Mode QUICK: `=== SELESAI - semua hidup (mode QUICK, alamat sudah dilaporkan) ===`,
  didahului baris `alamat DILAPORKAN & tersimpan: https://...`
- Mode NAMED: `=== SELESAI - semua hidup (mode NAMED) ===`

Kalau ada yang `MATI`, log menyebut berkas mana yang harus dibuka
(`logs\agent.err.log` / `logs\caddy.err.log` / `logs\cloudflared.err.log`).

**Kalau baris laporannya gagal**, log menuliskan balasan server apa adanya:

| Isi log | Artinya | Perbaikannya |
|---|---|---|
| `401 ... x-agent-secret tidak cocok` | token di PC ≠ token di Vercel | ulangi Bagian A langkah 2, pastikan level **`Machine`** |
| `400 ... baseUrl ditolak` | alamat di luar daftar host yang diizinkan | wajar hanya kalau ganti penyedia tunnel; tambahkan env `VIDEO_BASE_ALLOWED_SUFFIXES` di Vercel |
| `500 ... HARDLINK_AGENT_SECRET belum di-set` | env belum ada **di Vercel** | Settings → Environment Variables → tambah → Redeploy |
| `tunnel ... tidak melayani setelah ~45 detik` | tunnel hidup tapi Caddy belum menjawab | cek `logs\caddy.err.log`; alamat **sengaja tidak dilaporkan** supaya situs tidak menunjuk alamat mati |

> Kalau lognya bilang `node.exe tidak ketemu` atau `caddy.exe tidak ketemu`: buka
> `start-video-services.ps1`, tambahkan path asli di daftar `$NODE_CANDIDATES` /
> `$CADDY_CANDIDATES` paling atas. Penyebabnya akun SYSTEM punya PATH berbeda dari
> akun user — jadi nama perintah saja sering tidak cukup.

## Setup 1× — Bagian D: cegah PC tidur

PC yang tidur = tunnel putus, walaupun PC "kelihatan nyala".

```powershell
powercfg /change standby-timeout-ac 0     # jangan pernah sleep saat colok listrik
powercfg /change hibernate-timeout-ac 0
powercfg /change monitor-timeout-ac 15    # layar boleh mati, mesin tetap jalan
```

## Setup 1× — Bagian E: alamat permanen *(hanya saat pindah ke named tunnel)*

**Isi `$NAMED_URL`** di `start-video-services.ps1`:

```powershell
$NAMED_URL = "https://video.amasyaforum.com"
```

Itu saja — script akan melaporkannya tiap boot, jadi database selalu ikut kenyataan.

Env var `NEXT_PUBLIC_VIDEO_BASE_URL` sekarang hanya **cadangan** (dipakai saat database kosong).
Boleh diisi `https://video.amasyaforum.com` juga, tapi **mengisinya saja tidak cukup** — selama
baris alamat di database masih ada, env var tidak akan pernah dipakai.

## Setup 1× — Bagian F: penjaga berkas *(WAJIB — pasang sekali)*

**Masalah yang dijawab.** `start-video-services.ps1` sudah HILANG dua kali dari folder ini
(2026-08-24 dan ~2026-08-25). Tugas terjadwal tetap dipanggil Windows tiap 15 menit, tapi `-File`
menunjuk berkas kosong → `powershell.exe` mati seketika (`Last Result: -196608`) **tanpa menulis
sebaris pun log**. Video ikut mati dan baru ketahuan ~24 jam kemudian lewat laporan penonton.

**Pasang (PowerShell sebagai Administrator, sekali saja):**

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\USER\pc-backup-agent\pasang-penjaga.ps1
```

Script itu membuat `cadangan\`, menyalin berkas penting ke sana, mendaftarkan tugas
**"DramaApp Penjaga Berkas"** (tiap 10 menit, sebagai SYSTEM), lalu **membuktikan** tugasnya jalan
dengan membandingkan jumlah baris log sebelum/sesudah — bukan berhenti di `SUCCESS: Attempted to run`.

**Cara kerjanya (dua arah, tidak ada satu titik yang mematikan semuanya):**

| Yang hilang | Yang mengembalikan | Kapan |
|---|---|---|
| `start-video-services.ps1`, `hardlink-agent.js`, `Caddyfile` | `cadangan\penjaga-berkas.ps1` | tiap 10 menit |
| `penjaga-berkas.ps1` (di folder utama maupun di `cadangan\`) | `start-video-services.ps1` → `Pastikan-Penjaga` | tiap 15 menit |

Berkas yang **berubah isinya** tidak dibatalkan — justru cadangannya yang disegarkan, supaya update
yang kamu lakukan sendiri tidak ditimpa balik oleh penjaga.

**Kalau berkas dihapus terus-menerus,** penjaga BERHENTI setelah 2 pemulihan dalam 1 jam dan menulis
`!!! BERHENTI MEMULIHKAN`. Itu disengaja: memulihkan terus cuma menutupi gejala, sementara akarnya
(hampir pasti antivirus mengarantina) tidak tersentuh. Yang harus dikerjakan manusia:

```powershell
# lihat antivirus apa saja yang terdaftar - BUKAN cuma Defender
Get-CimInstance -Namespace root\SecurityCenter2 -ClassName AntiVirusProduct | Select-Object displayName
# riwayat karantina Defender
Get-MpThreatDetection | Select-Object -Last 5 InitialDetectionTime,Resources
```

Exclusion **tidak** dipasang otomatis oleh script mana pun di folder ini — itu melemahkan pemindaian
dan harus jadi keputusan sadar pemilik PC:

```powershell
Add-MpPreference -ExclusionPath "C:\Users\USER\pc-backup-agent"
```

Untuk antivirus pihak ketiga (mis. Norton), exclusion dipasang lewat aplikasinya sendiri.

**Batas yang perlu diketahui:** Windows menolak perintah tugas terjadwal lebih dari **261 karakter**
(ditemukan saat uji 2026-08-26, pesan errornya tidak menyebut solusinya). Dengan path
`C:\Users\USER\pc-backup-agent` perintahnya **166 karakter — aman**. Kalau folder agent dipindah ke
path panjang, `pasang-penjaga.ps1` berhenti dengan pesan yang menyebut angkanya, bukan gagal diam-diam.

**Cek berkala:**

```powershell
Get-Content C:\Users\USER\pc-backup-agent\logs\penjaga-berkas.log -Tail 20
```

Baris `semua berkas utuh (4 diperiksa)` ditulis tiap siklus walau tidak ada yang perlu diperbaiki —
**disengaja**, supaya lompatan jam di log langsung terlihat kalau penjaganya sendiri berhenti jalan.

## Verifikasi

### Berlaku untuk KEDUA mode — mulai dari sini

```powershell
# 1. Baca hasil jalannya script
Get-Content C:\Users\USER\pc-backup-agent\logs\start-video-services.log -Tail 30
```

Cari baris `alamat DILAPORKAN & tersimpan: <url>`. **Itulah** alamat yang berlaku.
Kalau baris itu tidak ada, laporannya gagal — log menyebut sebabnya.

```powershell
# 2. Alamat itu benar-benar melayani (JANGAN berhenti di cek DNS -
#    "tunnel yatim" tetap punya DNS hidup tapi balas 530; lihat HANDOFF.md)
Invoke-WebRequest "<url-dari-log>/" -Method Get -TimeoutSec 20 -UseBasicParsing

# 3. Situs benar-benar memakai alamat itu (bukan alamat lama di database).
#    Buka sebagai admin, lihat field "dipakai" dan "sumber":
#    https://dramaapp.vercel.app/api/agent/video-base

# 4. Server situs bisa menjangkau sumber - harus 206/200, bukan 502/404
Invoke-WebRequest "https://dramaapp.vercel.app/api/teaser?id=<drama-id>&ep=1" -Headers @{Range="bytes=0-1023"} -UseBasicParsing
```

### Tambahan khusus mode NAMED

```powershell
sc query cloudflared                       # harus STATE : 4 RUNNING
Invoke-WebRequest "https://video.amasyaforum.com/_agent/health" -TimeoutSec 20 -UseBasicParsing
# harus JSON: {"ok":true,"videoRoot":"C:\\Users\\USER\\Downloads\\video","port":8089}
```

> Di mode **QUICK** ketiga perintah lama (`curl` ke `video.amasyaforum.com`, `sc query
> cloudflared`) akan **gagal semua** — itu WAJAR, bukan tanda pemasangan salah. Domain itu
> memang belum dipakai dan cloudflared memang belum jadi service.

Lalu dari mana saja:

```
https://dramaapp.vercel.app/api/teaser?id=<drama-id>&ep=1
```
harus balas **206/200** — kalau **502 "Sumber video sedang mati"**, berarti rantai di PC
backup putus.

**Tes yang menentukan:** restart PC backup, **jangan buka PowerShell sama sekali**, tunggu
2 menit, ulangi 3 cek di atas. Kalau tetap benar → otomatisnya terbukti.

## Troubleshooting

| Gejala | Yang dicek |
|---|---|
| Video mati, `/api/teaser` 502 | `sc query cloudflared` → Running? Lalu `Get-Content ...\logs\start-video-services.log -Tail 30` |
| Log bilang port 8088/8089 `MATI` | buka `logs\caddy.err.log` / `logs\agent.err.log` |
| Log bilang `HARDLINK_AGENT_SECRET belum di-set` | ulangi Setup Bagian A langkah 2 (level `Machine`, PowerShell Administrator) |
| Scan admin error `Unauthorized` | token di Vercel ≠ token di PC backup. Samakan, redeploy Vercel, `schtasks /run /tn "DramaApp Video"` |
| Scan admin error `Unexpected token '<'` | tunnel balas HTML error, bukan JSON → cek service cloudflared |
| **Tunnel 530 (mode apa pun)** | **Penyebab tersering: QUIC (UDP 7844) diblokir jaringan.** Cek `logs\cloudflared.err.log`; kalau ada `failed to dial to edge with quic ... handshake did not complete in time`, itu dia. Obat: paksa `http2` (TCP 443). Mode QUICK sudah otomatis (`--protocol http2` di script); named tunnel: tambahkan `protocol: http2` di `config.yml`. **Gejalanya menipu** — tunnel terdaftar sehingga DNS-nya hidup, tapi Cloudflare membalas 530 ke semua orang, persis seperti "tunnel yatim". Terjadi 2026-08-22. |
| Tunnel dapat alamat tapi tetap 530 | Mendapat ALAMAT bukan berarti TERSAMBUNG. Cari baris `Registered tunnel connection` di `logs\cloudflared.err.log` — kalau tidak ada, cloudflared belum berhasil menghubungi edge Cloudflare (lihat baris di atas). |
| Folder drama tidak ketemu | taruh `.mp4` di `C:\Users\USER\Downloads\video\<drama-id>\`; drama-id huruf kecil + dash |

---

# Cara lama (arsip) — quick tunnel manual

`start-dramaapp.ps1` **sengaja tidak dihapus** sebagai jalan mundur kalau named tunnel
bermasalah. Batasannya, dan kenapa ditinggalkan:

- Alamatnya **acak baru tiap restart** → wajib update env Vercel + redeploy tiap kali.
- Langkah update itu butuh `VERCEL_TOKEN` yang **sudah mati** (403) sejak 2026-08-19.
- Berisi `Read-Host` di akhir + membuka window `-NoExit`, jadi **tidak bisa** dijadikan
  tugas otomatis.

Kalau terpaksa dipakai:

```powershell
cd C:\Users\USER\pc-backup-agent
powershell -ExecutionPolicy Bypass -File start-dramaapp.ps1
```

Lalu update `NEXT_PUBLIC_VIDEO_BASE_URL` di Vercel dengan alamat yang tercetak di langkah
[4/6] + Redeploy. Sesudah named tunnel jalan, **matikan tugas ini** supaya tidak ada dua
tunnel berebut port 8088:

```powershell
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
```
