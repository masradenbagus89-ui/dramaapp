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
> PC menyala. Saat nanti named tunnel dipasang, script berpindah mode **sendiri**, tidak
> ada yang perlu diubah.

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
schtasks /create /tn "DramaApp Video" /sc onstart /ru SYSTEM /rl HIGHEST /f `
  /tr "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\Users\USER\pc-backup-agent\start-video-services.ps1"
```

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

## Setup 1× — Bagian E: alamat permanen di Vercel

Settings → Environment Variables → `NEXT_PUBLIC_VIDEO_BASE_URL` = `https://video.amasyaforum.com`
→ Save → **Redeploy**. Sesudah ini env var tersebut **tidak pernah disentuh lagi**.

## Verifikasi

```powershell
# 1. Tunnel hidup dari internet
Invoke-WebRequest "https://video.amasyaforum.com/" -Method Head -TimeoutSec 20 -UseBasicParsing

# 2. Agent terjangkau lewat tunnel
Invoke-WebRequest "https://video.amasyaforum.com/_agent/health" -TimeoutSec 20 -UseBasicParsing
# harus JSON: {"ok":true,"videoRoot":"C:\\Users\\USER\\Downloads\\video","port":8089}

# 3. Service tunnel jalan
sc query cloudflared
```

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
| Tunnel 530 walau service Running | pastikan `protocol: http2` ada di `config.yml` (QUIC/UDP 7844 sering diblokir) |
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
