# ============================================================
#  start-video-services.ps1  -  penerus start-dramaapp.ps1
#
#  Dijalankan OTOMATIS oleh Windows saat PC backup boot (Task Scheduler),
#  bukan diketik manusia. Karena itu script ini:
#    - TIDAK punya Read-Host  (kalau ada, tugas Windows menggantung selamanya)
#    - TIDAK membuka window   (jalan senyap di latar belakang)
#    - TIDAK menyentuh Vercel (alamat video sudah PERMANEN lewat named tunnel,
#                              jadi tidak ada lagi env var yang perlu diubah)
#    - memakai PATH ABSOLUT   (Task Scheduler jalan sebagai SYSTEM, dan PATH
#                              milik SYSTEM berbeda dari PATH akun user -
#                              inilah penyebab autostart gagal paling sering)
#
#  Yang di-start di sini:
#    1. hardlink-agent (Node, port 8089)
#    2. Caddy          (port 8088, penyaji berkas video)
#    3. cloudflared    - HANYA kalau belum jadi Windows service (lihat di bawah)
#
#  DUA MODE, dipilih OTOMATIS - tidak ada saklar yang bisa lupa diubah:
#    - Mode NAMED  : service cloudflared sudah terpasang & Running. Alamatnya
#                    permanen, jadi script ini tidak menyentuh tunnel sama sekali
#                    (perilaku asli script ini).
#    - Mode QUICK  : belum ada service cloudflared. Script menjalankan quick
#                    tunnel sendiri, menangkap alamat acaknya, lalu MELAPOR ke
#                    situs (POST /api/agent/video-base) supaya alamat itu langsung
#                    dipakai TANPA redeploy dan tanpa owner menempel manual.
#  Deteksi otomatis ini sekaligus mencegah dua cloudflared berebut port 8088.
#
#  Daftarkan sekali (PowerShell sebagai Administrator):
#    schtasks /create /tn "DramaApp Video" /sc onstart /ru SYSTEM /rl HIGHEST /f `
#      /tr "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\Users\USER\pc-backup-agent\start-video-services.ps1"
#
#  Uji tanpa restart:  schtasks /run /tn "DramaApp Video"
#  Lihat hasilnya   :  Get-Content C:\Users\USER\pc-backup-agent\logs\start-video-services.log -Tail 30
# ============================================================

# ====== CONFIG ======
$AGENT_DIR  = "C:\Users\USER\pc-backup-agent"
$VIDEO_ROOT = "C:\Users\USER\Downloads\video"
$LOG_DIR    = Join-Path $AGENT_DIR "logs"

# Kandidat lokasi node.exe & caddy.exe, dicoba berurutan. Kalau di PC-mu
# tempatnya beda, tambahkan path-nya di paling atas daftar.
$NODE_CANDIDATES = @(
  "C:\Program Files\nodejs\node.exe",
  "C:\Program Files (x86)\nodejs\node.exe",
  "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
)
$CADDY_CANDIDATES = @(
  "C:\Users\USER\caddy.exe",
  "$AGENT_DIR\caddy.exe",
  "C:\Program Files\Caddy\caddy.exe",
  "C:\ProgramData\chocolatey\bin\caddy.exe"
)
# Dipakai hanya di mode QUICK (belum ada service cloudflared).
$CLOUDFLARED_CANDIDATES = @(
  "$env:USERPROFILE\cloudflared.exe",
  "C:\Users\USER\cloudflared.exe",
  "$AGENT_DIR\cloudflared.exe",
  "C:\Program Files (x86)\cloudflared\cloudflared.exe"
)
# Alamat situs yang akan diberi tahu alamat tunnel baru (mode QUICK).
$SITUS_URL = "https://dramaapp.vercel.app"
# ====================

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
$LOG = Join-Path $LOG_DIR "start-video-services.log"

function Catat($pesan) {
  $baris = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $pesan
  Add-Content -Path $LOG -Value $baris -Encoding UTF8
}

# Berhenti dengan pesan yang bisa dibaca manusia nanti. Tidak ada Read-Host:
# script ini tidak punya siapa-siapa untuk ditanyai saat PC baru menyala.
function Berhenti($pesan) {
  Catat "GAGAL: $pesan"
  exit 1
}

# Cari .exe dari daftar kandidat, kalau nihil coba PATH. Alasan: SYSTEM tidak
# mewarisi PATH milik akun user, jadi "node" saja sering tidak ketemu.
function Cari-Exe([string[]]$kandidat, [string]$namaPerintah) {
  foreach ($p in $kandidat) {
    if ($p -and (Test-Path $p)) { return $p }
  }
  $cmd = Get-Command $namaPerintah -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

Catat "=== start-video-services dijalankan (user: $env:USERNAME) ==="

# --- 1. Cek semua prasyarat DULU, sebelum ada yang di-start ---
$NODE_EXE = Cari-Exe $NODE_CANDIDATES "node"
if (-not $NODE_EXE) { Berhenti "node.exe tidak ketemu. Tambahkan path-nya ke `$NODE_CANDIDATES di script ini." }

$CADDY_EXE = Cari-Exe $CADDY_CANDIDATES "caddy"
if (-not $CADDY_EXE) { Berhenti "caddy.exe tidak ketemu. Tambahkan path-nya ke `$CADDY_CANDIDATES di script ini." }

if (-not (Test-Path "$AGENT_DIR\hardlink-agent.js")) { Berhenti "hardlink-agent.js tidak ada di $AGENT_DIR" }
if (-not (Test-Path "$AGENT_DIR\Caddyfile"))         { Berhenti "Caddyfile tidak ada di $AGENT_DIR" }
if (-not (Test-Path $VIDEO_ROOT))                    { Berhenti "Folder video tidak ada: $VIDEO_ROOT" }

# Secret dibaca dari environment variable tingkat MESIN, bukan ditulis di file
# ini - supaya rahasianya tidak pernah ikut ter-commit ke repo.
# Set sekali (PowerShell sebagai Administrator):
#   [Environment]::SetEnvironmentVariable('HARDLINK_AGENT_SECRET','<token>','Machine')
$SECRET = [Environment]::GetEnvironmentVariable("HARDLINK_AGENT_SECRET", "Machine")
if (-not $SECRET) { $SECRET = $env:HARDLINK_AGENT_SECRET }
if (-not $SECRET) {
  Berhenti "HARDLINK_AGENT_SECRET belum di-set di level Machine. Jalankan: [Environment]::SetEnvironmentVariable('HARDLINK_AGENT_SECRET','<token>','Machine')"
}

Catat "node : $NODE_EXE"
Catat "caddy: $CADDY_EXE"
Catat "secret terbaca (panjang $($SECRET.Length) karakter)"   # nilainya JANGAN pernah dicatat

# --- 2. Bebaskan port kalau ada sisa proses dari sesi sebelumnya ---
foreach ($port in 8088, 8089) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Catat "port $port dibebaskan (proses lama dihentikan)"
  }
}
Start-Sleep -Seconds 2

# --- 3. Start hardlink-agent (port 8089) ---
# Env var disuntik ke proses ini dulu; proses anak mewarisinya.
$env:HARDLINK_AGENT_SECRET = $SECRET
$env:VIDEO_ROOT            = $VIDEO_ROOT

# try/catch WAJIB di sini: $ErrorActionPreference = "Stop" membuat Start-Process
# yang gagal langsung mematikan script TANPA menulis apa pun ke log - gagal
# senyap yang baru ketahuan saat penonton mengeluh.
try {
  Start-Process -FilePath $NODE_EXE `
    -ArgumentList "hardlink-agent.js" `
    -WorkingDirectory $AGENT_DIR `
    -RedirectStandardOutput (Join-Path $LOG_DIR "agent.out.log") `
    -RedirectStandardError  (Join-Path $LOG_DIR "agent.err.log") `
    -WindowStyle Hidden
  Catat "hardlink-agent di-start"
} catch {
  Berhenti "gagal menjalankan hardlink-agent: $($_.Exception.Message)"
}

# --- 4. Start Caddy (port 8088) ---
try {
  Start-Process -FilePath $CADDY_EXE `
    -ArgumentList "run", "--config", "Caddyfile" `
    -WorkingDirectory $AGENT_DIR `
    -RedirectStandardOutput (Join-Path $LOG_DIR "caddy.out.log") `
    -RedirectStandardError  (Join-Path $LOG_DIR "caddy.err.log") `
    -WindowStyle Hidden
  Catat "Caddy di-start"
} catch {
  Berhenti "gagal menjalankan Caddy: $($_.Exception.Message)"
}

# --- 5. Buktikan benar-benar hidup (jangan cuma "sudah di-start") ---
# Port kadang butuh beberapa detik untuk terbuka; dicek berulang sampai 20 detik.
$AGENT_OK = $false
$CADDY_OK = $false
for ($i = 0; $i -lt 10; $i++) {
  Start-Sleep -Seconds 2
  if (-not $AGENT_OK) { $AGENT_OK = [bool](Get-NetTCPConnection -LocalPort 8089 -State Listen -ErrorAction SilentlyContinue) }
  if (-not $CADDY_OK) { $CADDY_OK = [bool](Get-NetTCPConnection -LocalPort 8088 -State Listen -ErrorAction SilentlyContinue) }
  if ($AGENT_OK -and $CADDY_OK) { break }
}
Catat "port 8089 (agent): $(if ($AGENT_OK) { 'HIDUP' } else { 'MATI - cek logs\agent.err.log' })"
Catat "port 8088 (Caddy): $(if ($CADDY_OK) { 'HIDUP' } else { 'MATI - cek logs\caddy.err.log' })"

# --- 6. Tunnel: mode NAMED (service) atau mode QUICK (jalankan + lapor) ---
$svc = Get-Service -Name cloudflared -ErrorAction SilentlyContinue

if ($svc -and $svc.Status -eq "Running") {
  # Mode NAMED: alamat sudah permanen, tak ada yang perlu dilaporkan.
  Catat "service cloudflared: Running (mode NAMED - alamat permanen, tidak ada laporan alamat)"
  if ($AGENT_OK -and $CADDY_OK) {
    Catat "=== SELESAI - semua hidup (mode NAMED) ==="
    exit 0
  }
  Catat "=== SELESAI DENGAN MASALAH - ada service yang tidak hidup ==="
  exit 1
}

if ($svc) {
  Catat "PERINGATAN: service cloudflared ada tapi statusnya $($svc.Status). Coba: sc start cloudflared"
  Catat "Lanjut ke mode QUICK supaya video tetap hidup."
} else {
  Catat "service cloudflared belum terpasang -> mode QUICK"
}

# Mode QUICK butuh agent + Caddy hidup dulu; tunnel yang menunjuk port mati
# cuma menghasilkan alamat yang membalas error.
if (-not ($AGENT_OK -and $CADDY_OK)) {
  Berhenti "mode QUICK dibatalkan: agent/Caddy tidak hidup, tunnel jadi percuma."
}

$CLOUDFLARED_EXE = Cari-Exe $CLOUDFLARED_CANDIDATES "cloudflared"
if (-not $CLOUDFLARED_EXE) {
  Berhenti "cloudflared.exe tidak ketemu. Tambahkan path-nya ke `$CLOUDFLARED_CANDIDATES di script ini."
}
Catat "cloudflared: $CLOUDFLARED_EXE"

# Sisa cloudflared dari sesi sebelumnya WAJIB dimatikan. Kalau dibiarkan, akan
# ada dua tunnel: yang lama tetap punya catatan DNS tapi sudah tak melayani
# apa-apa (balas 530), dan alamat yang dilaporkan bisa jadi milik yang salah.
# Ini kejadian nyata 2026-08-22 - lihat HANDOFF.md "tunnel yatim".
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$cfOut = Join-Path $LOG_DIR "cloudflared.out.log"
$cfErr = Join-Path $LOG_DIR "cloudflared.err.log"
foreach ($f in $cfOut, $cfErr) {
  # Log lama HARUS dibuang: alamat sesi sebelumnya masih tertulis di sana, dan
  # kalau ikut terbaca kita akan melaporkan alamat yang sudah mati.
  if (Test-Path $f) { Remove-Item $f -Force -ErrorAction SilentlyContinue }
}

try {
  Start-Process -FilePath $CLOUDFLARED_EXE `
    -ArgumentList "tunnel", "--url", "http://localhost:8088" `
    -RedirectStandardOutput $cfOut `
    -RedirectStandardError  $cfErr `
    -WindowStyle Hidden
  Catat "cloudflared quick tunnel di-start"
} catch {
  Berhenti "gagal menjalankan cloudflared: $($_.Exception.Message)"
}

# Baca log yang sedang ditulis proses lain (butuh FileShare::ReadWrite, kalau
# tidak akan kena "file sedang dipakai").
function Baca-LogTerbuka([string]$path) {
  try {
    $fs = [System.IO.File]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    $sr = New-Object System.IO.StreamReader($fs)
    $teks = $sr.ReadToEnd()
    $sr.Close(); $fs.Close()
    return $teks
  } catch { return "" }
}

$TUNNEL_URL = $null
$lewat = 0
while (-not $TUNNEL_URL -and $lewat -lt 90) {
  Start-Sleep -Seconds 2
  $lewat += 2
  foreach ($f in $cfErr, $cfOut) {
    if ((-not $TUNNEL_URL) -and (Test-Path $f)) {
      $teks = Baca-LogTerbuka $f
      # Ambil kecocokan TERAKHIR: kalau cloudflared sempat mencetak lebih dari
      # satu alamat, yang berlaku adalah yang paling akhir.
      $cocok = [regex]::Matches($teks, 'https://[a-z0-9-]+\.trycloudflare\.com')
      if ($cocok.Count -gt 0) { $TUNNEL_URL = $cocok[$cocok.Count - 1].Value }
    }
  }
}

if (-not $TUNNEL_URL) {
  Berhenti "cloudflared tidak memberi alamat dalam 90 detik. Cek $cfErr"
}
Catat "alamat tunnel baru: $TUNNEL_URL"

# --- 7. Buktikan tunnel benar-benar melayani, SEBELUM dilaporkan ---
# Melaporkan alamat yang belum siap = situs menunjuk ke alamat mati, dan itu
# persis masalah yang mau dihapus. Balasan 530 = tunnel terdaftar tapi belum
# nyambung ke Caddy.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$SIAP = $false
for ($i = 0; $i -lt 10; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "$TUNNEL_URL/" -Method Head -TimeoutSec 15 -UseBasicParsing
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { $SIAP = $true; break }
    Catat "tunnel balas HTTP $($r.StatusCode), tunggu..."
  } catch {
    Catat "tunnel belum siap ($($_.Exception.Message.Split([char]10)[0])), tunggu..."
  }
  Start-Sleep -Seconds 3
}
if (-not $SIAP) {
  Berhenti "tunnel $TUNNEL_URL tidak melayani setelah ~45 detik. Alamat TIDAK dilaporkan (lebih baik tak berubah daripada menunjuk alamat mati)."
}
Catat "tunnel terbukti melayani (HTTP 2xx/3xx)"

# --- 8. Laporkan alamat ke situs ---
$LAPOR_URL = "$SITUS_URL/api/agent/video-base"
$terkirim = $false
for ($i = 1; $i -le 3; $i++) {
  try {
    $resp = Invoke-RestMethod -Uri $LAPOR_URL -Method Post `
      -Headers @{ "x-agent-secret" = $SECRET } `
      -Body (ConvertTo-Json @{ baseUrl = $TUNNEL_URL }) `
      -ContentType "application/json" -TimeoutSec 30
    Catat "alamat DILAPORKAN & tersimpan: $($resp.url) (updatedAt $($resp.updatedAt))"
    $terkirim = $true
    break
  } catch {
    # Pesan server ikut dicatat: 401 = secret beda antara Vercel dan PC ini,
    # 400 = alamat ditolak allowlist. Tanpa ini penyebabnya cuma bisa ditebak.
    $detail = $_.Exception.Message
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      $detail = (New-Object System.IO.StreamReader($stream)).ReadToEnd()
    } catch { }
    Catat "percobaan lapor ke-$i gagal: $detail"
    Start-Sleep -Seconds 5
  }
}

if (-not $terkirim) {
  Catat "GAGAL melapor. Tunnel HIDUP di $TUNNEL_URL - owner bisa menempelnya manual ke env Vercel sebagai jalan mundur."
  Catat "=== SELESAI DENGAN MASALAH - alamat tidak terkirim ==="
  exit 1
}

Catat "=== SELESAI - semua hidup (mode QUICK, alamat sudah dilaporkan) ==="
exit 0
