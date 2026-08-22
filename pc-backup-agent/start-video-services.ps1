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
# Alamat situs yang akan diberi tahu alamat tunnel (kedua mode).
$SITUS_URL = "https://dramaapp.vercel.app"
# Alamat PERMANEN named tunnel. Diisi saat Setup Bagian B dikerjakan.
# WAJIB diisi begitu pindah ke named tunnel: alamat yang tersimpan di database
# SELALU menang atas env var, dan tidak pernah kedaluwarsa. Kalau dibiarkan kosong,
# mode NAMED tidak melapor apa-apa sehingga situs TETAP memakai alamat quick tunnel
# lama yang sudah lenyap - padahal env var, status service, dan curl ke domain baru
# semuanya terlihat sehat. Kerusakan senyap; ditemukan audit 2026-08-22.
$NAMED_URL = ""
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

# Kumpulkan folder PATH dari registry: MESIN + TIAP PROFIL USER.
#
# KENAPA PERLU: tugas ini jalan sebagai SYSTEM, dan SYSTEM TIDAK mewarisi PATH
# milik akun user. Program yang dipasang lewat winget/scoop/choco biasanya
# terdaftar di PATH user saja, jadi `Get-Command caddy` yang berhasil di jendela
# PowerShell milikmu akan GAGAL total di sini. Ini kejadian nyata 2026-08-22:
# log cuma bilang "caddy.exe tidak ketemu" padahal caddy jelas terpasang.
function Ambil-PathTerdaftar {
  $folder = @()
  try {
    $m = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment' -Name Path -ErrorAction Stop).Path
    $folder += $m -split ';'
  } catch { }
  # PATH tiap profil user di HKEY_USERS (SYSTEM bisa membacanya).
  try {
    $hive = Get-ChildItem 'Registry::HKEY_USERS' -ErrorAction Stop |
      Where-Object { $_.Name -notmatch '_Classes$' }
    foreach ($h in $hive) {
      try {
        $u = (Get-ItemProperty "Registry::$($h.Name)\Environment" -Name Path -ErrorAction Stop).Path
        if ($u) { $folder += $u -split ';' }
      } catch { }
    }
  } catch { }
  return $folder | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Sort-Object -Unique
}

$PATH_TERDAFTAR = Ambil-PathTerdaftar

# Berkas penanda alamat yang TERAKHIR berhasil dilaporkan. Dipakai supaya script
# ini aman dijalankan berulang: kalau semuanya masih sehat, ia tidak menyentuh
# apa pun (idempoten). Tanpa penanda ini, tiap kali jalan ia akan membunuh tunnel
# yang sehat dan membuat alamat baru - alamat jadi berganti terus-menerus.
$PENANDA = Join-Path $LOG_DIR "alamat-terakhir.txt"

# TLS 1.2 diset SEBELUM panggilan HTTPS pertama (PowerShell 5.1 tidak memakainya
# secara default, dan Vercel menolak protokol lama).
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Laporkan alamat ke situs. Dipakai KETIGA jalur (sehat / NAMED / QUICK), jadi
# didefinisikan di sini - sebelum pemanggilan pertama.
function Lapor-Alamat([string]$alamat, [string]$mode) {
  $LAPOR_URL = "$SITUS_URL/api/agent/video-base"
  for ($i = 1; $i -le 3; $i++) {
    try {
      $resp = Invoke-RestMethod -Uri $LAPOR_URL -Method Post `
        -Headers @{ "x-agent-secret" = $SECRET } `
        -Body (ConvertTo-Json @{ baseUrl = $alamat }) `
        -ContentType "application/json" -TimeoutSec 30
      Catat "[$mode] alamat DILAPORKAN & tersimpan: $($resp.url) (updatedAt $($resp.updatedAt))"
      # Penanda ditulis hanya SESUDAH laporan berhasil, supaya berkas ini tidak
      # pernah menyimpan alamat yang belum tentu dipakai situs.
      try { Set-Content -Path $PENANDA -Value $alamat -Encoding ASCII } catch { }
      return $true
    } catch {
      # Pesan server ikut dicatat: 401 = secret beda antara Vercel dan PC ini,
      # 400 = alamat ditolak allowlist, 404 = endpoint belum tayang (commit belum
      # di-push). Tanpa ini penyebabnya cuma bisa ditebak.
      $detail = $_.Exception.Message
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        $detail = (New-Object System.IO.StreamReader($stream)).ReadToEnd()
      } catch { }
      Catat "[$mode] percobaan lapor ke-$i gagal: $detail"
      Start-Sleep -Seconds 5
    }
  }
  return $false
}

# Tunggu jaringan benar-benar bisa dipakai.
#
# KENAPA PERLU: tugas /sc onstart dijalankan SANGAT AWAL saat Windows menyala -
# sering sebelum kartu jaringan mendapat IP dan DNS siap. Akibatnya cloudflared
# gagal membuat tunnel atau laporan ke situs gagal, lalu tidak ada yang mencoba
# lagi sampai manusia turun tangan. Ini penyebab kegagalan boot 2026-08-22.
function Tunggu-Jaringan([int]$maksDetik = 300) {
  $lewat = 0
  while ($lewat -lt $maksDetik) {
    try {
      $r = Invoke-WebRequest -Uri "$SITUS_URL/api/agent/video-base" -Method Post `
        -Headers @{ "x-agent-secret" = "cek-jaringan" } `
        -Body "{}" -ContentType "application/json" `
        -TimeoutSec 10 -UseBasicParsing
      return $true
    } catch {
      # 401/400 = server MENJAWAB (jaringan hidup) - itu yang kita cari.
      # Yang berarti belum siap: tidak ada response sama sekali (DNS/koneksi gagal).
      if ($_.Exception.Response) { return $true }
    }
    Start-Sleep -Seconds 10
    $lewat += 10
    Catat "jaringan belum siap, menunggu... ($lewat dtk)"
  }
  return $false
}

# Cari .exe berurutan: kandidat eksplisit -> PATH proses -> PATH registry
# (mesin + tiap user) -> folder package manager di dalam profil user.
function Cari-Exe([string[]]$kandidat, [string]$namaPerintah) {
  foreach ($p in $kandidat) {
    if ($p -and (Test-Path $p)) { return $p }
  }
  $cmd = Get-Command $namaPerintah -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($dir in $PATH_TERDAFTAR) {
    $kandidatPath = Join-Path $dir "$namaPerintah.exe"
    try {
      if (Test-Path $kandidatPath) { return $kandidatPath }
    } catch { }
  }
  # Package manager menaruh program DI DALAM profil user, dan nama foldernya
  # memuat ID/versi paket yang berubah tiap update - jadi dicari dengan wildcard,
  # bukan path tetap. Kasus nyata 2026-08-22: caddy dipasang lewat winget dan
  # berada di ...\WinGet\Packages\CaddyServer.Caddy_<id>\caddy.exe, tak terlihat
  # oleh SYSTEM. Semua profil user disapu, bukan cuma satu.
  $polaProfil = @(
    "C:\Users\*\AppData\Local\Microsoft\WinGet\Links\$namaPerintah.exe",
    "C:\Users\*\AppData\Local\Microsoft\WinGet\Packages\*\$namaPerintah.exe",
    "C:\Users\*\scoop\shims\$namaPerintah.exe",
    "C:\Users\*\$namaPerintah.exe"
  )
  foreach ($pola in $polaProfil) {
    try {
      $hit = Get-ChildItem -Path $pola -File -ErrorAction SilentlyContinue |
        Select-Object -First 1
      if ($hit) { return $hit.FullName }
    } catch { }
  }
  return $null
}

Catat "=== start-video-services dijalankan (user: $env:USERNAME) ==="

# Kunci antar-proses. Script ini dipicu DUA tugas (saat boot + tiap 15 menit),
# jadi dua instance bisa berpapasan - dan keduanya sama-sama mematikan lalu
# menyalakan cloudflared, yang berakhir dengan alamat saling menimpa. Instance
# kedua cukup keluar diam-diam; toh yang pertama sedang mengerjakan hal yang sama.
$MUTEX = New-Object System.Threading.Mutex($false, "Global\DramaAppVideoServices")
$PUNYA_KUNCI = $false
try { $PUNYA_KUNCI = $MUTEX.WaitOne(0) } catch [System.Threading.AbandonedMutexException] {
  # Instance sebelumnya mati tanpa melepas kunci - kunci tetap jadi milik kita.
  $PUNYA_KUNCI = $true
}
if (-not $PUNYA_KUNCI) {
  Catat "instance lain sedang berjalan -> keluar (bukan error)"
  exit 0
}

# --- 1. Cek semua prasyarat DULU, sebelum ada yang di-start ---
Catat "folder PATH terdaftar yang ikut dicari: $($PATH_TERDAFTAR.Count)"

# Pesan gagal sengaja menyertakan CARA MENEMUKAN path-nya. Versi lama cuma bilang
# "tidak ketemu" tanpa memberi tahu langkah berikutnya - buntu bagi yang membaca
# log saat PC baru menyala (kejadian 2026-08-22).
function Berhenti-TakKetemu([string]$nama, [string]$variabel) {
  Berhenti ("$nama tidak ketemu (dicari di kandidat, PATH proses, dan PATH registry mesin+user). " +
    "Cari lokasinya di jendela PowerShell BIASA dengan: (Get-Command $($nama -replace '\.exe$','')).Source " +
    "lalu tambahkan hasilnya ke $variabel di paling atas script ini.")
}

$NODE_EXE = Cari-Exe $NODE_CANDIDATES "node"
if (-not $NODE_EXE) { Berhenti-TakKetemu "node.exe" "`$NODE_CANDIDATES" }

$CADDY_EXE = Cari-Exe $CADDY_CANDIDATES "caddy"
if (-not $CADDY_EXE) { Berhenti-TakKetemu "caddy.exe" "`$CADDY_CANDIDATES" }

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

# --- 1b. Tunggu jaringan, lalu cek apakah semuanya SUDAH sehat ---
if (-not (Tunggu-Jaringan 300)) {
  Berhenti "jaringan tidak tersedia setelah 5 menit. Tugas berjadwal akan mencoba lagi nanti."
}
Catat "jaringan siap"

# Kalau tunnel yang tercatat masih hidup DAN masih melayani, JANGAN sentuh apa pun -
# cukup pastikan situs tahu alamatnya, lalu keluar. Ini yang membuat script aman
# dijalankan berulang (tiap beberapa menit) tanpa mengganti-ganti alamat.
function Cek-Sudah-Sehat {
  if (-not (Test-Path $PENANDA)) { return $null }
  $alamat = (Get-Content $PENANDA -Raw -ErrorAction SilentlyContinue)
  if ($alamat) { $alamat = $alamat.Trim() }
  if (-not $alamat) { return $null }
  if (-not (Get-Process cloudflared -ErrorAction SilentlyContinue)) { return $null }
  if (-not (Get-NetTCPConnection -LocalPort 8088 -State Listen -ErrorAction SilentlyContinue)) { return $null }
  $kode = 0
  try {
    $r = Invoke-WebRequest -Uri "$alamat/" -Method Get -TimeoutSec 15 -UseBasicParsing
    $kode = [int]$r.StatusCode
  } catch {
    if ($_.Exception.Response) { $kode = [int]$_.Exception.Response.StatusCode }
  }
  if ($kode -ge 200 -and $kode -lt 500) { return $alamat }
  return $null
}

$SEHAT = Cek-Sudah-Sehat
if ($SEHAT) {
  Catat "sudah sehat - tunnel lama masih melayani: $SEHAT (tidak ada yang diubah)"
  # Tetap dilaporkan ulang: murah, dan menyembuhkan kasus tunnel sehat tapi alamat
  # di database sempat salah/hilang.
  if (Lapor-Alamat $SEHAT "SEHAT") {
    Catat "=== SELESAI - tidak ada yang perlu diperbaiki ==="
    exit 0
  }
  Catat "PERINGATAN: tunnel sehat tapi laporan gagal. Lanjut membangun ulang."
}

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

# --- 7. Tunnel: mode NAMED (service) atau mode QUICK (jalankan sendiri) ---
$svc = Get-Service -Name cloudflared -ErrorAction SilentlyContinue

if ($svc -and $svc.Status -eq "Running") {
  # Mode NAMED. Alamatnya permanen, TAPI tetap WAJIB dilaporkan: baris alamat di
  # database selalu menang atas env var dan tidak pernah kedaluwarsa. Kalau mode ini
  # diam saja, alamat quick tunnel lama yang sudah lenyap akan terus disajikan ke
  # penonton walau named tunnel sudah sehat - dan semua indikator tampak hijau.
  Catat "service cloudflared: Running -> mode NAMED"
  if (-not $NAMED_URL) {
    Catat "GAGAL: mode NAMED aktif tapi `$NAMED_URL masih kosong di script ini."
    Catat "AKIBATNYA: situs kemungkinan besar MASIH memakai alamat quick tunnel lama"
    Catat "yang sudah mati, walau named tunnel sehat. Isi `$NAMED_URL (mis."
    Catat "https://video.amasyaforum.com) lalu jalankan ulang; ATAU kosongkan alamat"
    Catat "tersimpan lewat DELETE /api/agent/video-base (butuh login admin)."
    Catat "=== SELESAI DENGAN MASALAH - alamat tidak dilaporkan ==="
    exit 1
  }
  if (-not $CADDY_OK) {
    Berhenti "mode NAMED: Caddy (port 8088) mati, video tidak akan terlayani."
  }
  if (Lapor-Alamat $NAMED_URL "NAMED") {
    Catat "=== SELESAI - semua hidup (mode NAMED) ==="
    exit 0
  }
  Catat "=== SELESAI DENGAN MASALAH - alamat named tidak terkirim ==="
  exit 1
}

if ($svc) {
  Catat "PERINGATAN: service cloudflared ada tapi statusnya $($svc.Status). Coba: sc start cloudflared"
  Catat "Lanjut ke mode QUICK supaya video tetap hidup."
} else {
  Catat "service cloudflared belum terpasang -> mode QUICK"
}

# Yang WAJIB hidup cuma Caddy (8088) - itu yang menyajikan berkas video.
# Agent (8089) hanya melayani tombol "Scan & auto-hardlink" di admin; kalau ia mati,
# video tetap bisa diputar. Dulu di sini dipakai syarat "agent DAN Caddy", yang berarti
# mematikan video demi fitur admin - salah prioritas (audit 2026-08-22).
if (-not $CADDY_OK) {
  Berhenti "mode QUICK dibatalkan: Caddy (port 8088) mati, tunnel jadi percuma."
}
if (-not $AGENT_OK) {
  Catat "PERINGATAN: port 8089 (agent) mati -> tombol Scan & auto-hardlink di admin"
  Catat "tidak akan jalan. Video TETAP dilayani Caddy, jadi mode QUICK diteruskan."
}

$CLOUDFLARED_EXE = Cari-Exe $CLOUDFLARED_CANDIDATES "cloudflared"
if (-not $CLOUDFLARED_EXE) { Berhenti-TakKetemu "cloudflared.exe" "`$CLOUDFLARED_CANDIDATES" }
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
  # --no-autoupdate WAJIB: kalau cloudflared memperbarui dirinya sendiri, ia
  # restart dan quick tunnel mendapat HOSTNAME BARU. Alamat yang sudah kita
  # laporkan jadi basi diam-diam, dan tidak ada yang melapor ulang karena script
  # ini cuma jalan saat boot.
  Start-Process -FilePath $CLOUDFLARED_EXE `
    -ArgumentList "tunnel", "--no-autoupdate", "--url", "http://localhost:8088" `
    -RedirectStandardOutput $cfOut `
    -RedirectStandardError  $cfErr `
    -WindowStyle Hidden
  Catat "cloudflared quick tunnel di-start (--no-autoupdate)"
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

# --- 8. Buktikan tunnel benar-benar melayani, SEBELUM dilaporkan ---
# Melaporkan alamat yang belum siap = situs menunjuk ke alamat mati, dan itu
# persis masalah yang mau dihapus. Balasan 530 = tunnel terdaftar tapi belum
# nyambung ke Caddy.
# Yang dibuktikan: ADA SERVER yang menjawab di ujung tunnel. Jadi kode 4xx pun
# diterima (mis. 404/405 kalau root folder tak punya index) - yang ditolak hanya
# 5xx, khususnya 530 = tunnel terdaftar tapi tidak nyambung ke Caddy. Dulu di sini
# hanya 2xx/3xx yang lolos, sehingga tunnel sehat yang membalas 404 di root akan
# dianggap gagal dan alamatnya tak pernah dilaporkan (audit 2026-08-22).
$SIAP = $false
for ($i = 0; $i -lt 10; $i++) {
  $kode = 0
  try {
    $r = Invoke-WebRequest -Uri "$TUNNEL_URL/" -Method Get -TimeoutSec 15 -UseBasicParsing
    $kode = [int]$r.StatusCode
  } catch {
    # PowerShell 5.1 melempar untuk 4xx/5xx; statusnya diambil dari response.
    if ($_.Exception.Response) { $kode = [int]$_.Exception.Response.StatusCode }
  }
  if ($kode -ge 200 -and $kode -lt 500) { $SIAP = $true; break }
  if ($kode -eq 0) {
    Catat "tunnel belum menjawab sama sekali, tunggu..."
  } else {
    Catat "tunnel balas HTTP $kode (belum nyambung ke Caddy), tunggu..."
  }
  Start-Sleep -Seconds 3
}
if (-not $SIAP) {
  Berhenti "tunnel $TUNNEL_URL tidak melayani setelah ~45 detik. Alamat TIDAK dilaporkan (lebih baik tak berubah daripada menunjuk alamat mati)."
}
Catat "tunnel terbukti dijawab server (HTTP < 500)"

# --- 9. Laporkan alamat ke situs ---
if (Lapor-Alamat $TUNNEL_URL "QUICK") {
  Catat "=== SELESAI - semua hidup (mode QUICK, alamat sudah dilaporkan) ==="
  exit 0
}

# Jujur soal keadaannya: tunnel LAMA sudah dibunuh di langkah sebelumnya, jadi
# alamat yang tersimpan di database sekarang menunjuk ke sesuatu yang sudah mati.
# Video MATI sampai laporan berhasil - jangan bilang "masih aman".
Catat "GAGAL melapor. Tunnel BARU hidup di $TUNNEL_URL, tapi alamat di database"
Catat "masih yang LAMA dan sudah mati -> VIDEO MATI sampai laporan berhasil."
Catat "JALAN MUNDUR (jalankan di PC ini, ganti <token> dengan HARDLINK_AGENT_SECRET):"
Catat "  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12"
Catat "  Invoke-RestMethod '$SITUS_URL/api/agent/video-base' -Method Post ``"
Catat "    -Headers @{'x-agent-secret'='<token>'} -ContentType 'application/json' ``"
Catat "    -Body '{\"baseUrl\":\"$TUNNEL_URL\"}'"
Catat "CATATAN: menempel alamat ke env var Vercel TIDAK menolong selama baris alamat"
Catat "di database masih ada - database SELALU menang atas env. Kalau ingin kembali"
Catat "memakai env, kosongkan dulu lewat DELETE /api/agent/video-base (login admin)."
Catat "=== SELESAI DENGAN MASALAH - alamat tidak terkirim ==="
exit 1
