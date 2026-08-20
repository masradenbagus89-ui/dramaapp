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
#  Yang di-start di sini cuma 2:
#    1. hardlink-agent (Node, port 8089)
#    2. Caddy          (port 8088, penyaji berkas video)
#  cloudflared TIDAK di sini - ia sudah jadi Windows service sendiri
#  (`cloudflared service install`), jadi Windows yang menghidupkannya.
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

# --- 6. Ingatkan kalau tunnel-nya belum jalan ---
# cloudflared bukan tanggung jawab script ini, tapi tanpa dia video tetap mati
# dari luar - jadi statusnya ikut dicatat supaya diagnosa cukup baca 1 berkas.
$svc = Get-Service -Name cloudflared -ErrorAction SilentlyContinue
if (-not $svc) {
  Catat "PERINGATAN: service cloudflared belum terpasang. Jalankan 'cloudflared service install' (lihat README)."
} elseif ($svc.Status -ne "Running") {
  Catat "PERINGATAN: service cloudflared ada tapi statusnya $($svc.Status). Coba: sc start cloudflared"
} else {
  Catat "service cloudflared: Running"
}

if ($AGENT_OK -and $CADDY_OK) {
  Catat "=== SELESAI - kedua service hidup ==="
  exit 0
}
Catat "=== SELESAI DENGAN MASALAH - ada service yang tidak hidup ==="
exit 1
