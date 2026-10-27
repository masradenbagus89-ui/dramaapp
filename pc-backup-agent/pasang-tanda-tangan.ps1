# Pemasang penegakan tanda tangan video (Tahap B) - SEKALI JALAN, memeriksa sendiri.
#
# KENAPA ADA: pemasangan manualnya 4 langkah di 2 mesin, dan tiap langkah jadi
# kesempatan baru untuk gagal. Pada percobaan 2026-10-27 itu memang gagal dua
# kali dan video mati total ~10 menit. Akar masalahnya bukan kodenya melainkan
# PROSEDURNYA: saklar dinyalakan sebelum kecocokan kunci dibuktikan.
#
# Skrip ini membalik urutan itu. Ia MEMBUKTIKAN DULU, baru mengubah:
#   1. ambil alamat bertanda tangan ASLI dari situs yang sedang tayang
#   2. hitung ulang tanda tangannya memakai kunci yang kamu berikan
#   3. TIDAK COCOK -> berhenti, nol perubahan, video tak tersentuh
#   4. COCOK      -> pasang env, start ulang agent, uji, dan KEMBALIKAN SENDIRI
#                    kalau ada satu saja pemeriksaan yang gagal
#
# Jalankan sebagai Administrator - proses agent dimiliki NT AUTHORITY\SYSTEM
# dan tidak bisa dimatikan dari PowerShell biasa (terbukti 2026-10-27: Stop-Process
# gagal diam-diam, proses lama tetap hidup, dan kegagalannya tersembunyi karena
# -ErrorAction SilentlyContinue).
#
# Contoh:
#   .\pasang-tanda-tangan.ps1 -Kunci "isi-kunci-dari-panel-hosting"
#   .\pasang-tanda-tangan.ps1 -Matikan          # saklar darurat

param(
  [string]$Kunci,
  [switch]$Matikan,
  [string]$Situs    = "https://dramaapp-production-9e88.up.railway.app",
  [string]$DramaUji = "suami-mengkhianatinya-setelah-7-tahun",
  [string]$AgentDir = "C:\Users\USER\pc-backup-agent",
  [string]$VideoRoot = "C:\Users\USER\Downloads\video"
)

$ErrorActionPreference = "Stop"
function Baik($t) { Write-Host "  [OK]   $t" -ForegroundColor Green }
function Buruk($t) { Write-Host "  [GAGAL] $t" -ForegroundColor Red }
function Info($t) { Write-Host "  .      $t" -ForegroundColor Gray }
function Judul($t) { Write-Host ""; Write-Host "=== $t ===" -ForegroundColor Cyan }

# --- Hidupkan ulang agent dengan env yang diminta -------------------------
function Restart-Agent([string]$RahasiaTandaTangan) {
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -like "*hardlink-agent*" } |
    ForEach-Object {
      try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; Info "agent lama PID $($_.ProcessId) dimatikan" }
      catch { Buruk "PID $($_.ProcessId) TIDAK bisa dimatikan: $($_.Exception.Message)"; return $false }
    }
  Start-Sleep -Seconds 3
  if (Get-NetTCPConnection -State Listen -LocalPort 8089 -ErrorAction SilentlyContinue) {
    Buruk "port 8089 masih dipakai - agent lama belum mati (jalankan sebagai Administrator?)"
    return $false
  }
  $env:HARDLINK_AGENT_SECRET = [Environment]::GetEnvironmentVariable('HARDLINK_AGENT_SECRET','Machine')
  $env:VIDEO_SIGNING_SECRET  = $RahasiaTandaTangan
  $env:VIDEO_ROOT            = $VideoRoot
  Start-Process node -ArgumentList "hardlink-agent.js" -WorkingDirectory $AgentDir -WindowStyle Hidden
  Start-Sleep -Seconds 4
  try {
    $null = Invoke-WebRequest "http://127.0.0.1:8089/health" -UseBasicParsing -TimeoutSec 10
    Baik "agent hidup kembali"
    return $true
  } catch { Buruk "agent tidak menjawab sesudah start: $($_.Exception.Message)"; return $false }
}

function Kode([string]$u) {
  try { return [int](Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 20).StatusCode }
  catch { if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode } else { return 0 } }
}

Set-Location $AgentDir

# ==========================================================================
# SAKLAR DARURAT
# ==========================================================================
if ($Matikan) {
  Judul "MEMATIKAN penegakan tanda tangan"
  [Environment]::SetEnvironmentVariable('VIDEO_SIGNING_SECRET', $null, 'Machine')
  Info "env Machine dihapus"
  if (-not (Restart-Agent "")) { Buruk "agent gagal start - PERIKSA SEGERA"; exit 2 }
  $k = Kode "http://127.0.0.1:8088/$DramaUji/1.mp4"
  if ($k -eq 200) { Baik "alamat polos 200 - video PULIH, penegakan MATI"; exit 0 }
  Buruk "alamat polos menjawab $k - belum pulih, periksa Caddyfile"; exit 2
}

if (-not $Kunci) { Write-Host "Pakai: .\pasang-tanda-tangan.ps1 -Kunci '<kunci>'   atau   -Matikan" -ForegroundColor Yellow; exit 1 }
$Kunci = $Kunci.Trim()

# ==========================================================================
# TAHAP 1 - BUKTIKAN KUNCINYA COCOK (nol perubahan di tahap ini)
# ==========================================================================
Judul "1. Membuktikan kunci cocok dengan situs"
Info "panjang kunci yang diberikan: $($Kunci.Length) karakter"

try {
  $req = [System.Net.HttpWebRequest]::Create("$Situs/api/teaser?id=$DramaUji&ep=1")
  $req.AllowAutoRedirect = $false; $req.Timeout = 40000
  $res = $req.GetResponse(); $lokasi = $res.Headers["Location"]; $res.Close()
} catch { Buruk "tidak bisa menghubungi situs: $($_.Exception.Message)"; exit 2 }

if (-not $lokasi) { Buruk "situs tidak membalas alamat video - cek /api/teaser"; exit 2 }
if ($lokasi -notlike "*signature=*") {
  Buruk "situs BELUM menandatangani alamat."
  Info "Artinya VIDEO_SIGNING_SECRET di panel hosting belum terisi / build belum selesai."
  Info "Isi dulu di sana, tunggu selesai build, baru jalankan skrip ini. NOL perubahan dilakukan."
  exit 2
}
Baik "situs sudah menandatangani alamat"

$uri     = ([System.Uri]$lokasi).AbsolutePath + ([System.Uri]$lokasi).Query
$jalur   = $uri.Split('?')[0]
$qs      = $uri.Split('?')[1]
$sigAsli = ($qs.Split('&') | Where-Object { $_ -like 'signature=*' }) -replace '^signature=',''
$urut    = (($qs.Split('&') | Where-Object { $_ -notlike 'signature=*' }) | Sort-Object) -join '&'

$hm = New-Object System.Security.Cryptography.HMACSHA256
$hm.Key = [Text.Encoding]::UTF8.GetBytes($Kunci)
$b64 = [Convert]::ToBase64String($hm.ComputeHash([Text.Encoding]::UTF8.GetBytes($jalur + '?' + $urut)))
$sigHitung = $b64.TrimEnd('=').Replace('+','-').Replace('/','_')

if ($sigHitung -ne $sigAsli) {
  Buruk "KUNCI TIDAK COCOK dengan yang dipakai situs."
  Write-Host ""
  Info "NOL perubahan dilakukan. Video tetap jalan seperti sekarang."
  Info "Penyebab paling sering: panel hosting MENYEMBUNYIKAN nilai variabel,"
  Info "jadi yang tersalin bukan nilainya. Pakai tombol salin di panel, atau"
  Info "ganti nilainya di panel dengan kunci yang kamu pegang, tunggu build"
  Info "selesai, lalu jalankan skrip ini lagi."
  exit 1
}
Baik "KUNCI COCOK - aman dipasang"

# ==========================================================================
# TAHAP 2 - PASANG, LALU UJI. GAGAL = KEMBALIKAN SENDIRI.
# ==========================================================================
Judul "2. Memasang penegakan"
[Environment]::SetEnvironmentVariable('VIDEO_SIGNING_SECRET', $Kunci, 'Machine')
Info "env Machine diisi"
if (-not (Restart-Agent $Kunci)) {
  Buruk "agent gagal start - mengembalikan"
  [Environment]::SetEnvironmentVariable('VIDEO_SIGNING_SECRET', $null, 'Machine')
  $null = Restart-Agent ""
  exit 2
}

Judul "3. Menguji (gagal = dikembalikan otomatis)"
$polos      = Kode "http://127.0.0.1:8088/$DramaUji/1.mp4"
$berTanda   = Kode "http://127.0.0.1:8088$uri"
$lewatSitus = Kode "$Situs/api/teaser?id=$DramaUji&ep=1"

$hasil = @()
if ($polos -eq 403)      { Baik "alamat polos ditolak 403" }        else { Buruk "alamat polos menjawab $polos (harap 403)"; $hasil += "polos" }
if ($berTanda -eq 200)   { Baik "alamat bertanda tangan dilayani 200" } else { Buruk "alamat bertanda tangan menjawab $berTanda (harap 200)"; $hasil += "bertanda" }
if ($lewatSitus -eq 200) { Baik "jalur penonton lewat situs 200" }   else { Buruk "jalur penonton menjawab $lewatSitus (harap 200)"; $hasil += "situs" }

if ($hasil.Count -gt 0) {
  Write-Host ""
  Buruk "ADA YANG GAGAL ($($hasil -join ', ')) - MENGEMBALIKAN SEKARANG"
  [Environment]::SetEnvironmentVariable('VIDEO_SIGNING_SECRET', $null, 'Machine')
  $null = Restart-Agent ""
  $pulih = Kode "http://127.0.0.1:8088/$DramaUji/1.mp4"
  if ($pulih -eq 200) { Baik "video PULIH, penegakan dimatikan lagi" } else { Buruk "video masih $pulih - PERIKSA SEGERA" }
  exit 1
}

Write-Host ""
Write-Host "  BERHASIL - penegakan tanda tangan AKTIF dan video tetap jalan." -ForegroundColor Green
Write-Host "  Saklar darurat: .\pasang-tanda-tangan.ps1 -Matikan" -ForegroundColor Gray
exit 0
