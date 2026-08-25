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
#    (opsional)  -VideoKbps 1200   -Tinggi 720   -FolderVideo "D:\video"
# ============================================================

param(
  [Parameter(Mandatory = $true)][string]$DramaId,
  [int]$VideoKbps = 1000,
  [int]$AudioKbps = 128,
  [int]$Tinggi = 720,
  [string]$FolderVideo = "C:\Users\USER\Downloads\video"
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
Info "Encode ke ${Tinggi}p, video ${VideoKbps} kbps + audio ${AudioKbps} kbps. Ini makan waktu (puluhan menit)."
& ffmpeg -hide_banner -y -i $asli `
  -vf "scale=-2:$Tinggi" `
  -c:v libx264 -preset medium -b:v "${VideoKbps}k" -maxrate "$([int]($VideoKbps * 1.3))k" -bufsize "$([int]($VideoKbps * 2))k" `
  -c:a aac -b:a "${AudioKbps}k" -ac 2 `
  -movflags +faststart `
  $sementara

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
