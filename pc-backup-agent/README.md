# PC Backup Agent — Setup Guide

Agent + Caddyfile untuk mendukung fitur "Scan & auto-hardlink" di admin form Vercel.

## Prasyarat

- Windows + Node.js terpasang (cek: `node --version`)
- Caddy terpasang (cek: `caddy version`)
- cloudflared terpasang (cek: `cloudflared.exe --version`)
- Folder video di `C:\Users\USER\Downloads\video\`

## File yang ada di folder ini

- `hardlink-agent.js` — Node.js HTTP server di port 8089
- `Caddyfile` — Caddy config (serve video + reverse-proxy `/_agent/*`)
- `README.md` — file ini

## Setup 1x (5 menit)

### Step 1 — Download file ini ke PC backup

Di PC backup, buka PowerShell, jalankan:

```powershell
$dst = "C:\Users\USER\pc-backup-agent"
New-Item -ItemType Directory -Path $dst -Force | Out-Null
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/masradenbagus89-ui/dramaapp/main/pc-backup-agent/hardlink-agent.js" -OutFile "$dst\hardlink-agent.js"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/masradenbagus89-ui/dramaapp/main/pc-backup-agent/Caddyfile" -OutFile "$dst\Caddyfile"
Write-Host "Downloaded to: $dst"
```

### Step 2 — Generate secret token

Token rahasia untuk auth antara Vercel ↔ agent. Generate string random:

```powershell
$secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host "Secret: $secret"
Set-Clipboard -Value $secret
Write-Host "(Token sudah di-copy ke clipboard, paste ke Vercel env var nanti)"
```

Catatan token-nya — perlu di-paste ke 2 tempat:
- Vercel env var `HARDLINK_AGENT_SECRET`
- PC backup PowerShell sebelum run agent (lihat Step 4)

### Step 3 — Set Vercel env var

1. Buka `https://vercel.com/dashboard` → project dramaapp → Settings → Environment Variables
2. Klik **Add Environment Variable**
3. Isi:
   - Key: `HARDLINK_AGENT_SECRET`
   - Value: paste token dari Step 2 (Ctrl+V)
   - Sensitive: **ON** ✅ (rahasia)
   - Environments: Production + Preview
4. Save
5. Redeploy: Deployments → ⋯ → Redeploy (wajib biar env var ke-pickup)

### Step 4 — Jalankan agent di PC backup

Buka **PowerShell baru** di PC backup:

```powershell
cd C:\Users\USER\pc-backup-agent
$env:HARDLINK_AGENT_SECRET = "<paste-token-disini>"
node hardlink-agent.js
```

Output harus:
```
[hardlink-agent] Listening on http://127.0.0.1:8089
[hardlink-agent] Video root: C:\Users\USER\Downloads\video
[hardlink-agent] Secret set: YES (length: 32)
```

**Jangan close PowerShell ini.**

### Step 5 — Restart Caddy pakai Caddyfile (replace command lama)

Sebelumnya kamu jalanin Caddy dengan `caddy file-server --root ... --listen :8088 --browse`. Sekarang ganti pakai Caddyfile baru yang juga handle reverse-proxy:

1. Close window Caddy yang lama (Ctrl+C atau X)
2. Buka PowerShell baru:

```powershell
cd C:\Users\USER\pc-backup-agent
caddy run --config Caddyfile
```

Output harus ada baris:
```
INFO	http.handlers.file_server	...
INFO	http.handlers.reverse_proxy	...
```

**Jangan close PowerShell ini.**

### Step 6 — cloudflared (tetap seperti biasa)

Window cloudflared yang lama tetap dipertahankan (atau restart kalau perlu URL baru):

```powershell
& "$env:USERPROFILE\cloudflared.exe" tunnel --url http://localhost:8088
```

## Verifikasi setup

Buka di browser:

```
https://<tunnel-url>/_agent/health
```

Output harus JSON:
```json
{"ok":true,"videoRoot":"C:\\Users\\USER\\Downloads\\video","port":8089}
```

Kalau ya → setup berhasil. Buka admin form Vercel, klik tombol **🪄 Scan & auto-hardlink** untuk test.

## Setiap kali PC backup di-restart

Wajib jalankan **3 PowerShell window** lagi:

1. `node hardlink-agent.js` (dengan env var `HARDLINK_AGENT_SECRET` di-set dulu)
2. `caddy run --config Caddyfile`
3. `cloudflared tunnel --url http://localhost:8088`

Kalau cloudflared dapat URL baru → update `NEXT_PUBLIC_VIDEO_BASE_URL` di Vercel + redeploy (sama prosedur seperti sebelumnya).

## Troubleshooting

**Error "Tidak bisa connect ke hardlink-agent"** saat klik Scan:
- Cek window `node hardlink-agent.js` masih jalan
- Cek window `caddy run` masih jalan
- Test manual: `curl https://<tunnel-url>/_agent/health` harus return JSON

**Error "Unauthorized"** dari agent:
- Token `HARDLINK_AGENT_SECRET` di Vercel beda dengan yang di PowerShell `$env:HARDLINK_AGENT_SECRET`
- Pastikan sama persis, lalu redeploy Vercel + restart agent

**Folder tidak ditemukan**:
- Drop file mp4 dulu di `C:\Users\USER\Downloads\video\<drama-id>\`
- Drama-id harus huruf kecil + dash, mis. `istri-rahasia-sang-ceo`
