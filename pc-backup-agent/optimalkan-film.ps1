# ============================================================
#  optimalkan-film.ps1  -  bikin FILM panjang bisa diputar lewat tunnel
#
#  MASALAH YANG DIBERESKAN (terukur 2026-08-25 pada "Over Your Dead Body"):
#    1. Film 1,82 GB / 105 menit butuh aliran 281 KB/detik terus-menerus,
#       sedangkan tunnel PC backup cuma sanggup ~180 KB/detik -> buffering
#       selamanya walau berhasil mulai.
#    2. "Daftar isi" MP4 (box moov) ada di UJUNG berkas & besarnya 5,1 MB;
#       browser wajib mengunduhnya lebih dulu -> ~28 detik layar kosong sebelum
#       gambar pertama muncul. Ini yang terlihat sebagai "tidak bisa diputar".
#
#  Yang dilakukan script ini (SEKALI per film):
#    - encode ulang ke 720p dengan bitrate target rendah (default 1000 kbps
#      video + 128 kbps audio) -> muat di kapasitas tunnel
#    - -movflags +faststart  -> daftar isi dipindah ke DEPAN berkas, mulai instan
#
#  AMAN: berkas asli TIDAK dihapus. Hasil ditulis ke nama sementara, baru
#  ditukar setelah jadi; aslinya disimpan sebagai 1.asli.mp4 supaya bisa
#  dikembalikan kalau hasilnya tidak disukai.
#
#  CATATAN PowerShell 5.1: berkas ini sengaja ASCII murni (tanpa emoji/tanda
#  kutip miring). Karakter non-ASCII pernah membuat parser PowerShell 5.1 gagal
#  di PC backup - lihat docs/lintasai/rencana/2026-08-20-video-otomatis-*.md
#
#  PAKAI:
#    powershell -ExecutionPolicy Bypass -File optimalkan-film.ps1 -DramaId over-your-dead-body
#    (opsional)  -Cepat   (pakai GPU: jauh lebih cepat)
#    (opsional)  -VideoKbps 1200   -Tinggi 720   -FolderVideo "D:\video"
# ============================================================

param(
  [Parameter(Mandatory = $true)][string]$DramaId,
  [int]$VideoKbps = 1000,
  [int]$AudioKbps = 128,
  [int]$Tinggi = 720,
  [string]$FolderVideo = "C:\Users\USER\Downloads\video",
  # -Cepat = pakai encoder GPU (NVIDIA/AMD/Intel) kalau kartunya memang ada.
  # Jauh lebih cepat (menit, bukan puluhan menit), kualitas sedikit di bawah
  # CPU pada bitrate serendah ini. Tanpa switch ini dipakai CPU (libx264).
  [switch]$Cepat
)

$ErrorActionPreference = "Stop"

function Info($teks) { Write-Host "[optimalkan-film] $teks" }

# --- 1. ffmpeg harus ada -------------------------------------------------
$ffmpeg = (Get-Command ffmpeg -ErrorAction SilentlyContinue)
if (-not $ffmpeg) {
  Write-Host ""
  Write-Host "ffmpeg BELUM terpasang. Pasang dulu (pilih salah satu):"
  Write-Host "  winget install --id Gyan.FFmpeg -e"
  Write-Host "  atau unduh manual: https://www.gyan.dev/ffmpeg/builds/ (ffmpeg-release-essentials.zip)"
  Write-Host "Sesudah itu TUTUP PowerShell, buka lagi, jalankan ulang script ini."
  exit 1
}
Info "ffmpeg ditemukan: $($ffmpeg.Source)"

# --- 1b. encoder GPU: ada di daftar ffmpeg BELUM berarti kartunya ada -----
# Karena itu tiap kandidat DIUJI betulan: encode 0,1 detik layar hitam.
#
# PENTING (jebakan PowerShell 5.1, pernah menghentikan script ini 2026-08-25):
# JANGAN panggil ffmpeg dengan "&" lalu redirect stderr ("2>$null"). ffmpeg
# menulis semua pesannya ke stderr, dan PowerShell membungkus stderr native
# jadi ErrorRecord; dengan $ErrorActionPreference = "Stop" itu MEMATIKAN script
# padahal kegagalan uji GPU adalah hasil yang WAJAR (mis. "Cannot load
# nvcuda.dll" di PC tanpa kartu NVIDIA). Start-Process tidak punya masalah itu:
# ia menaruh keluaran ke berkas dan hanya mengembalikan ExitCode.
function Jalankan-Ffmpeg([string[]]$argumen, [string]$namaLog) {
  $errLog = Join-Path $env:TEMP "$namaLog.err.txt"
  $outLog = Join-Path $env:TEMP "$namaLog.out.txt"
  try {
    $proses = Start-Process -FilePath $ffmpeg.Source -ArgumentList $argumen `
      -NoNewWindow -Wait -PassThru `
      -RedirectStandardError $errLog -RedirectStandardOutput $outLog
    return @{ Kode = $proses.ExitCode; Keluaran = (Get-Content $outLog -Raw -ErrorAction SilentlyContinue) }
  } catch {
    return @{ Kode = 1; Keluaran = "" }
  } finally {
    Remove-Item $errLog, $outLog -Force -ErrorAction SilentlyContinue
  }
}

function Cari-EncoderGpu {
  $daftar = (Jalankan-Ffmpeg @("-hide_banner", "-encoders") "encoders").Keluaran
  if (-not $daftar) { return $null }
  foreach ($kandidat in @("h264_nvenc", "h264_qsv", "h264_amf")) {
    if ($daftar -notmatch [regex]::Escape($kandidat)) { continue }
    Info "  menguji encoder GPU: $kandidat"
    $uji = Jalankan-Ffmpeg @(
      "-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", "color=black:s=320x240:d=0.1",
      "-c:v", $kandidat, "-f", "null", "-"
    ) "uji-$kandidat"
    if ($uji.Kode -eq 0) { return $kandidat }
    Info "  $kandidat tidak bisa dipakai di PC ini - dilewati"
  }
  return $null
}

$encoderGpu = Cari-EncoderGpu
if ($encoderGpu) {
  if ($Cepat) {
    Info "GPU dipakai: $encoderGpu (mode -Cepat)"
  } else {
    Info "GPU tersedia ($encoderGpu) TAPI tidak dipakai."
    Info "  Mau jauh lebih cepat? hentikan (Ctrl+C) lalu jalankan ulang dengan tambahan -Cepat"
    Info "  Bedanya: CPU = lebih lama, gambar sedikit lebih bagus di bitrate rendah."
  }
} elseif ($Cepat) {
  Info "-Cepat diminta, tapi tidak ada encoder GPU yang benar-benar jalan di PC ini."
  Info "  Ini NORMAL, bukan kerusakan - berarti PC ini tidak punya kartu grafis yang"
  Info "  bisa dipakai ffmpeg. Proses lanjut memakai CPU (lebih lama, gambar lebih bagus)."
}

# --- 2. berkas sumber ----------------------------------------------------
$folder = Join-Path $FolderVideo $DramaId
$asli   = Join-Path $folder "1.mp4"
if (-not (Test-Path $asli)) {
  Write-Host "Tidak ketemu: $asli"
  Write-Host "Pastikan folder <drama-id> ada dan berkasnya sudah bernama 1.mp4"
  Write-Host "(kalau masih mentah, klik dulu 'Scan & auto-hardlink' di panel admin)."
  exit 1
}
$ukuranAwalMB = [math]::Round((Get-Item $asli).Length / 1MB, 1)
Info "Sumber : $asli ($ukuranAwalMB MB)"

$sementara = Join-Path $folder "1.baru.mp4"
$cadangan  = Join-Path $folder "1.asli.mp4"
if (Test-Path $sementara) { Remove-Item $sementara -Force }

# --- 3. encode -----------------------------------------------------------
# -vf scale: lebar dihitung otomatis (-2 = kelipatan 2, syarat H.264)
# -movflags +faststart: daftar isi (moov) dipindah ke depan berkas
$pakaiGpu = ($Cepat -and $encoderGpu)
if ($pakaiGpu) {
  $argEncoder = @("-c:v", $encoderGpu, "-preset", "p5", "-rc", "vbr")
  $perkiraan  = "beberapa menit"
} else {
  $argEncoder = @("-c:v", "libx264", "-preset", "medium")
  $perkiraan  = "puluhan menit"
}
Info "Encode ke ${Tinggi}p, video ${VideoKbps} kbps + audio ${AudioKbps} kbps. Perkiraan: $perkiraan."
Info "Jangan tutup jendela ini sampai muncul SELESAI."

& ffmpeg -hide_banner -y -i $asli `
  -vf "scale=-2:$Tinggi" `
  @argEncoder -b:v "${VideoKbps}k" -maxrate "$([int]($VideoKbps * 1.3))k" -bufsize "$([int]($VideoKbps * 2))k" `
  -c:a aac -b:a "${AudioKbps}k" -ac 2 `
  -movflags +faststart `
  $sementara

# Driver NVIDIA lama menolak "-preset p5". Ulangi SEKALI tanpa preset itu supaya
# proses tidak batal cuma karena beda versi driver.
if ($LASTEXITCODE -ne 0 -and $pakaiGpu) {
  Info "Encoder GPU menolak preset p5 (driver lama?). Diulang tanpa preset."
  & ffmpeg -hide_banner -y -i $asli `
    -vf "scale=-2:$Tinggi" `
    -c:v $encoderGpu -b:v "${VideoKbps}k" -maxrate "$([int]($VideoKbps * 1.3))k" -bufsize "$([int]($VideoKbps * 2))k" `
    -c:a aac -b:a "${AudioKbps}k" -ac 2 `
    -movflags +faststart `
    $sementara
}

if ($LASTEXITCODE -ne 0 -or -not (Test-Path $sementara)) {
  Write-Host "ffmpeg GAGAL (exit $LASTEXITCODE). Berkas asli TIDAK disentuh."
  exit 1
}

# --- 4. tukar berkas (asli disimpan, bukan dihapus) ----------------------
if (Test-Path $cadangan) { Remove-Item $cadangan -Force }
Move-Item $asli $cadangan -Force
Move-Item $sementara $asli -Force

$ukuranBaruMB = [math]::Round((Get-Item $asli).Length / 1MB, 1)
$hemat = [math]::Round(100 - ($ukuranBaruMB / $ukuranAwalMB * 100), 1)

Write-Host ""
Info "SELESAI."
Info "  sebelum : $ukuranAwalMB MB"
Info "  sesudah : $ukuranBaruMB MB  (turun $hemat persen)"
Info "  asli disimpan di: $cadangan  (hapus manual kalau hasilnya sudah oke)"
Write-Host ""
Info "Cek di browser: buka halaman film di dramaapp.vercel.app, tekan Ctrl+Shift+R."
Info "Gambar harus muncul dalam hitungan detik, bukan puluhan detik."
