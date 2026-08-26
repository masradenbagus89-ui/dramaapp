# ============================================================
#  penjaga-berkas.ps1  -  penjaga berkas penting PC backup
#
#  MASALAH YANG DIJAWAB: start-video-services.ps1 HILANG dua kali dari
#  C:\Users\USER\pc-backup-agent\ (2026-08-24 & ~2026-08-25). Tugas terjadwal
#  tetap dipanggil Windows tiap 15 menit, tapi -File menunjuk berkas kosong,
#  jadi powershell.exe mati seketika (Last Result -196608) TANPA menulis
#  sebaris pun log. Akibatnya video mati dan baru ketahuan ~24 JAM kemudian,
#  lewat laporan penonton - bukan lewat alat.
#
#  CARA KERJA: berkas penting disalin ke <AgentDir>\cadangan\. Tiap 10 menit:
#    - berkas aktif HILANG          -> dipulihkan dari cadangan
#    - berkas aktif ADA & beda hash -> cadangan yang DISEGARKAN, bukan
#                                      sebaliknya (update sah jangan dibatalkan)
#    - aktif & cadangan hilang      -> berteriak di log, butuh manusia
#
#  SENGAJA TIDAK mengunduh dari internet. Penjaga yang otomatis menarik kode
#  dari jaringan lalu menjalankannya persis pola "unduh-lalu-jalankan" yang
#  dilarang aturan kerja (AGENTS.md 5.4) - satu repo yang dibajak = PC backup
#  ikut jatuh. Kalau cadangan ikut hilang, pemulihan dilakukan manusia dengan
#  pencocokan SHA256, seperti 2026-08-26.
#
#  Script ini dipanggil DARI folder cadangan\, bukan folder utama - supaya
#  kalau folder utama yang dibersihkan, penjaganya sendiri selamat. Pasangannya:
#  start-video-services.ps1 memulihkan penjaga ini kalau yang hilang penjaganya.
#  Jadi keduanya saling menjaga; tidak ada satu titik yang mematikan keduanya.
#
#  Daftarkan sekali : pasang-penjaga.ps1 (PowerShell sebagai Administrator)
#  Uji manual       : powershell -ExecutionPolicy Bypass -File <path> -AgentDir <folder>
#  Lihat hasilnya   : Get-Content <AgentDir>\logs\penjaga-berkas.log -Tail 20
# ============================================================

param(
  # Bisa ditimpa supaya script ini dapat diuji di folder simulasi tanpa
  # menyentuh PC backup sungguhan.
  [string]$AgentDir = "C:\Users\USER\pc-backup-agent"
)

# ====== CONFIG ======
# Berkas yang rantai videonya putus kalau salah satu raib. penjaga-berkas.ps1
# ikut didaftar supaya penjaga menjaga dirinya sendiri juga.
$BERKAS_DIJAGA = @(
  "start-video-services.ps1",
  "penjaga-berkas.ps1",
  "hardlink-agent.js",
  "Caddyfile"
)

# Ambang "ada yang menghapus AKTIF". Kalau berkas yang sama sudah dipulihkan
# sebanyak ini dalam 1 jam terakhir, memulihkan lagi cuma menutupi gejala -
# akarnya (tersangka: antivirus mengarantina) belum disentuh. Penjaga berhenti
# mengulang dan menyuruh manusia memasang exclusion.
$MAKS_PULIH_PER_JAM = 2
# ====================

$ErrorActionPreference = "Stop"

$CADANGAN_DIR = Join-Path $AgentDir "cadangan"
$LOG_DIR      = Join-Path $AgentDir "logs"
New-Item -ItemType Directory -Path $CADANGAN_DIR -Force | Out-Null
New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
$LOG = Join-Path $LOG_DIR "penjaga-berkas.log"

function Catat($pesan) {
  $baris = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $pesan
  Add-Content -Path $LOG -Value $baris -Encoding UTF8
}

function Sidik([string]$path) {
  return (Get-FileHash -Path $path -Algorithm SHA256).Hash
}

# Hitung berapa kali berkas ini dipulihkan dalam 1 jam terakhir, dibaca dari
# log penjaga sendiri. Dipakai untuk membedakan "hilang sekali" (wajar,
# pulihkan saja) dari "dihapus terus-menerus" (percuma, panggil manusia).
function Hitung-PulihTerakhir([string]$nama) {
  if (-not (Test-Path $LOG)) { return 0 }
  $batas = (Get-Date).AddHours(-1)
  $jumlah = 0
  foreach ($baris in (Get-Content -Path $LOG -ErrorAction SilentlyContinue)) {
    if ($baris -notlike "*DIPULIHKAN $nama*") { continue }
    # Format baris dikunci di Catat(): 19 karakter pertama = stempel waktu.
    $stempel = $baris.Substring(0, 19)
    $waktu = [datetime]::MinValue
    if ([datetime]::TryParseExact($stempel, "yyyy-MM-dd HH:mm:ss", $null, 'None', [ref]$waktu)) {
      if ($waktu -ge $batas) { $jumlah++ }
    }
  }
  return $jumlah
}

$adaMasalah = $false
$adaTindakan = $false

foreach ($nama in $BERKAS_DIJAGA) {
  $aktif = Join-Path $AgentDir $nama
  $cad   = Join-Path $CADANGAN_DIR $nama
  $adaAktif = Test-Path $aktif
  $adaCad   = Test-Path $cad

  try {
    if ($adaAktif -and $adaCad) {
      if ((Sidik $aktif) -ne (Sidik $cad)) {
        Copy-Item -Path $aktif -Destination $cad -Force
        Catat "cadangan disegarkan: $nama (isi aktif berubah - dianggap update sah)"
        $adaTindakan = $true
      }
      continue
    }

    if ($adaAktif -and -not $adaCad) {
      Copy-Item -Path $aktif -Destination $cad -Force
      Catat "cadangan dibuat: $nama"
      $adaTindakan = $true
      continue
    }

    if (-not $adaAktif -and $adaCad) {
      $pernah = Hitung-PulihTerakhir $nama
      if ($pernah -ge $MAKS_PULIH_PER_JAM) {
        Catat "!!! BERHENTI MEMULIHKAN $nama - sudah $pernah kali dalam 1 jam. Ada yang MENGHAPUS AKTIF (tersangka: antivirus mengarantina). Memulihkan lagi percuma. LANGKAH MANUSIA: cek riwayat karantina antivirus, lalu pasang exclusion untuk folder $AgentDir"
        $adaMasalah = $true
        continue
      }
      Copy-Item -Path $cad -Destination $aktif -Force
      Catat "!!! DIPULIHKAN $nama - berkas aktif HILANG, dikembalikan dari cadangan (pemulihan ke-$($pernah + 1) dalam 1 jam)"
      $adaTindakan = $true
      continue
    }

    # Aktif DAN cadangan sama-sama tidak ada: penjaga tidak punya bahan.
    Catat "!!! GAGAL $nama - berkas aktif DAN cadangannya sama-sama hilang. Penjaga tidak bisa memulihkan. LANGKAH MANUSIA: unduh ulang dari repo lalu cocokkan SHA256 sebelum dijalankan"
    $adaMasalah = $true
  } catch {
    Catat "!!! ERROR saat menangani ${nama}: $($_.Exception.Message)"
    $adaMasalah = $true
  }
}

# Selalu tulis 1 baris walau tidak ada yang perlu diperbaiki. KENAPA: pelajaran
# 2026-08-24 - lompatan jam di log adalah satu-satunya cara mengetahui penjaga
# berhenti jalan. Log yang diam saat sehat membuat "mati" dan "tidak apa-apa"
# terlihat sama persis.
if (-not $adaTindakan -and -not $adaMasalah) {
  Catat "semua berkas utuh ($($BERKAS_DIJAGA.Count) diperiksa)"
}

if ($adaMasalah) { exit 1 }
exit 0
