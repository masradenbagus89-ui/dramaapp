# ============================================================
#  pasang-penjaga.ps1  -  pemasang sekali-jalan untuk penjaga-berkas.ps1
#
#  Jalankan SEKALI di PC backup, PowerShell sebagai Administrator:
#    powershell -ExecutionPolicy Bypass -File C:\Users\USER\pc-backup-agent\pasang-penjaga.ps1
#
#  Yang dikerjakan:
#    1. Buat folder <AgentDir>\cadangan\ + salin berkas penting ke sana
#    2. Daftarkan tugas "DramaApp Penjaga Berkas" (tiap 10 menit, sebagai SYSTEM)
#       yang menjalankan cadangan\penjaga-berkas.ps1
#    3. Jalankan sekali lalu BUKTIKAN hasilnya dari log - bukan cuma bilang sukses
#
#  Tugas sengaja menunjuk salinan di cadangan\, bukan berkas di folder utama:
#  folder utama itu yang dua kali kehilangan isi, jadi penjaganya jangan ikut
#  disimpan di sana.
#
#  CATATAN KEAMANAN: script ini TIDAK menyentuh setelan antivirus. Memasang
#  exclusion berarti melemahkan pengaman dan itu keputusan sadar pemilik PC,
#  bukan sesuatu yang boleh dilakukan diam-diam oleh script. Kalau log penjaga
#  menunjukkan berkas dihapus berulang, perintahnya dicetak di akhir untuk
#  dijalankan manual.
# ============================================================

param(
  [string]$AgentDir = "C:\Users\USER\pc-backup-agent",
  # Tiap berapa menit penjaga memeriksa. 10 dipilih supaya lebih rapat daripada
  # tugas video (15 menit): berkas yang hilang sudah kembali sebelum siklus
  # video berikutnya membutuhkannya.
  [int]$IntervalMenit = 10
)

$ErrorActionPreference = "Stop"
$NAMA_TUGAS = "DramaApp Penjaga Berkas"

function Info($pesan) { Write-Output $pesan }
function Gagal($pesan) { Write-Output "GAGAL: $pesan"; exit 1 }

# --- 1. Prasyarat ---
$identitas = [Security.Principal.WindowsIdentity]::GetCurrent()
$peran = New-Object Security.Principal.WindowsPrincipal($identitas)
if (-not $peran.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Gagal "harus dijalankan sebagai Administrator (klik kanan PowerShell -> Run as administrator). Tanpa itu tugas terjadwal tidak bisa didaftarkan sebagai SYSTEM."
}
if (-not (Test-Path $AgentDir)) { Gagal "folder tidak ada: $AgentDir" }

$penjagaMaster = Join-Path $AgentDir "penjaga-berkas.ps1"
if (-not (Test-Path $penjagaMaster)) {
  Gagal "penjaga-berkas.ps1 tidak ada di $AgentDir. Salin dulu dari repo (pc-backup-agent\penjaga-berkas.ps1)."
}

# --- 2. Siapkan folder cadangan + isi awalnya ---
$cadanganDir = Join-Path $AgentDir "cadangan"
New-Item -ItemType Directory -Path $cadanganDir -Force | Out-Null
Info "folder cadangan: $cadanganDir"

# Salinan pertama dibuat di sini supaya tugas punya bahan sejak menit pertama.
# Sesudah ini penjaga sendiri yang merawat isinya.
foreach ($nama in @("start-video-services.ps1", "penjaga-berkas.ps1", "hardlink-agent.js", "Caddyfile")) {
  $sumber = Join-Path $AgentDir $nama
  if (Test-Path $sumber) {
    Copy-Item -Path $sumber -Destination (Join-Path $cadanganDir $nama) -Force
    Info "  disalin: $nama"
  } else {
    Info "  DILEWATI (tidak ada di folder utama): $nama"
  }
}

# --- 3. Daftarkan tugas terjadwal ---
$penjagaJalan = Join-Path $cadanganDir "penjaga-berkas.ps1"
# Kutip di dalam /tr ditulis \" - itu bentuk yang selamat saat PowerShell
# meneruskan argumen ke schtasks.exe. Tanpa itu path bertspasi terpotong.
$perintah = 'powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File \"' + $penjagaJalan + '\" -AgentDir \"' + $AgentDir + '\"'
# schtasks menolak /tr yang lebih dari 261 karakter - batas Windows, bukan
# pilihan kita, dan pesan errornya tidak menyebut solusinya. Ditemukan saat uji
# 2026-08-26 memakai folder ber-path panjang.
if ($perintah.Length -gt 261) {
  Gagal "perintah tugas $($perintah.Length) karakter, sedangkan Windows membatasi 261. Pindahkan folder agent ke path yang lebih pendek (mis. C:\dramaapp-agent) lalu jalankan ulang script ini dengan -AgentDir path-baru."
}

schtasks /create /tn $NAMA_TUGAS /sc minute /mo $IntervalMenit /ru SYSTEM /rl HIGHEST /f /tr $perintah | Out-Null
if ($LASTEXITCODE -ne 0) { Gagal "schtasks menolak membuat tugas (kode $LASTEXITCODE)" }
Info "tugas terdaftar: $NAMA_TUGAS (tiap $IntervalMenit menit, sebagai SYSTEM)"

# --- 4. Buktikan, jangan percaya "sukses" ---
# Pelajaran 2026-08-24: "SUCCESS: Attempted to run..." tidak membuktikan apa pun.
# Yang membuktikan: baris BARU muncul di log penjaga sesudah tugas dijalankan.
$logPenjaga = Join-Path $AgentDir "logs\penjaga-berkas.log"
$sebelum = 0
if (Test-Path $logPenjaga) { $sebelum = (Get-Content $logPenjaga).Count }

schtasks /run /tn $NAMA_TUGAS | Out-Null
Info "tugas dijalankan sekali, menunggu 30 detik..."
Start-Sleep -Seconds 30

if (-not (Test-Path $logPenjaga)) {
  Gagal "penjaga tidak menulis log sama sekali. Cek: schtasks /query /tn `"$NAMA_TUGAS`" /v /fo LIST  -> lihat Last Result (-196608 = berkasnya tidak ketemu)"
}
$sesudah = (Get-Content $logPenjaga).Count
if ($sesudah -le $sebelum) {
  Gagal "log penjaga tidak bertambah ($sebelum -> $sesudah baris). Tugas terdaftar tapi belum terbukti jalan."
}

Info ""
Info "=== TERBUKTI JALAN - $($sesudah - $sebelum) baris baru di log ==="
Get-Content $logPenjaga -Tail 6 | ForEach-Object { Info "  $_" }
Info ""
Info "Cek berkala : Get-Content `"$logPenjaga`" -Tail 20"
Info "Hapus tugas : schtasks /delete /tn `"$NAMA_TUGAS`" /f"
Info ""
Info "KALAU log memuat 'BERHENTI MEMULIHKAN', berarti ada yang menghapus berkas"
Info "secara aktif - hampir pasti antivirus. Perintah exclusion (jalankan MANUAL,"
Info "sadar bahwa ini melemahkan pemindaian di folder tsb):"
Info "  Add-MpPreference -ExclusionPath `"$AgentDir`""
Info "Untuk antivirus pihak ketiga (mis. Norton), exclusion dipasang lewat"
Info "aplikasinya sendiri - Settings -> Antivirus -> Scans and Risks -> Exclusions."
