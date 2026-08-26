# ============================================================
#  start-dramaapp-web.ps1  -  jalankan SITUS dramaapp dari PC backup
#
#  MASALAH YANG DIJAWAB: 2026-08-26 akun Vercel di-pause karena kuota Fast
#  Origin Transfer jebol, dan pause tingkat AKUN tidak punya tombol Resume
#  gratis - hanya Upgrade. Project ini belum disetujui atasan, jadi upgrade
#  belum boleh. Tanpa jalur lain, situs mati sampai kuota 30 hari bergulir
#  habis (sekitar 21-25 Sep) DAN support bersedia meng-unpause.
#
#  CARA KERJA: PC backup sudah menjalankan cloudflared + Caddy 24 jam untuk
#  menyajikan berkas video. Skrip ini menambahkan satu hal lagi di mesin yang
#  sama: Next.js (`next start`). Tunnel yang sudah ada tinggal diberi hostname
#  kedua. Hasilnya situs hidup tanpa Vercel, tanpa biaya, tanpa batas kuota.
#
#  BUKAN pengganti permanen: begitu akun Vercel pulih, situs boleh balik ke
#  sana. Ini jalur supaya pekerjaan bisa ditunjukkan ke atasan sekarang.
#
#  SENGAJA TIDAK menyentuh git / tidak mengunduh apa pun dari internet.
#  Menarik kode dari jaringan lalu menjalankannya = pola "unduh-lalu-jalankan"
#  yang dilarang aturan kerja (AGENTS.md 5.4). Pembaruan kode dilakukan
#  manusia dengan `git pull` sadar, lalu skrip ini dijalankan ulang.
#
#  CATATAN ENCODING: berkas ini WAJIB ASCII murni. PowerShell 5.1 gagal
#  mem-parse .ps1 ber-karakter non-ASCII (pelajaran nyata, lihat
#  docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md).
#
#  Cara run:
#    powershell -ExecutionPolicy Bypass -File start-dramaapp-web.ps1
#    powershell -ExecutionPolicy Bypass -File start-dramaapp-web.ps1 -Rebuild
# ============================================================

param(
  # Folder repo dramaapp di PC backup. Ganti kalau lokasinya beda.
  [string]$RepoDir = "C:\Users\USER\dramaapp",

  # Port lokal untuk Next.js. Harus SAMA dengan yang ditulis di config.yml
  # cloudflared (ingress hostname aplikasi).
  [int]$Port = 3010,

  # Paksa build ulang walau folder .next sudah ada. Dipakai sesudah `git pull`.
  [switch]$Rebuild
)

$ErrorActionPreference = "Stop"
$LogFile = Join-Path $PSScriptRoot "start-dramaapp-web.log"

function Catat($pesan) {
  $baris = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $pesan
  Write-Host $baris
  Add-Content -Path $LogFile -Value $baris -Encoding utf8
}

function Berhenti($pesan) {
  Catat "GAGAL: $pesan"
  Catat "Skrip dihentikan. Perbaiki dulu hal di atas, lalu jalankan lagi."
  exit 1
}

Catat "=========================================================="
Catat "start-dramaapp-web.ps1 mulai. Repo=$RepoDir Port=$Port"

# --- 1. Prasyarat: Node ------------------------------------------------
# Dicek eksplisit supaya pesannya jelas. Tanpa ini kegagalannya muncul
# sebagai error npm yang membingungkan bagi non-programmer.
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Berhenti "Node.js tidak ditemukan di PATH. Pasang dari https://nodejs.org lalu buka ulang PowerShell."
}
Catat "Node ditemukan: $(node -v)"

# --- 2. Prasyarat: folder repo ----------------------------------------
if (-not (Test-Path (Join-Path $RepoDir "package.json"))) {
  Berhenti "Tidak ada package.json di $RepoDir. Salin/clone repo dramaapp ke situ, atau jalankan skrip dengan -RepoDir <lokasi lain>."
}
Set-Location $RepoDir
Catat "Masuk ke folder repo."

# --- 3. Prasyarat: .env.local -----------------------------------------
# SENGAJA tidak dibuat otomatis. Berkas ini berisi SUPABASE_SERVICE_ROLE_KEY
# dan AUTH_SECRET - rahasia yang tidak boleh ditebak, dibuat, atau disalin
# oleh skrip. Harus diisi manusia (AGENTS.md 5.2).
if (-not (Test-Path (Join-Path $RepoDir ".env.local"))) {
  Catat "BELUM ADA .env.local di $RepoDir."
  Catat "Isinya rahasia (kunci Supabase, AUTH_SECRET) jadi TIDAK dibuat otomatis."
  Catat "Salin daftar variabelnya dari .env.example, lalu isi nilainya sama"
  Catat "persis seperti yang tersimpan di Vercel (Settings -> Environment Variables)."
  Berhenti ".env.local wajib ada sebelum situs bisa dijalankan."
}
Catat ".env.local ditemukan."

# --- 4. Dependensi ------------------------------------------------------
if (-not (Test-Path (Join-Path $RepoDir "node_modules"))) {
  Catat "node_modules belum ada. Menjalankan npm ci (bisa beberapa menit)..."
  npm ci
  if ($LASTEXITCODE -ne 0) { Berhenti "npm ci gagal. Cek koneksi internet." }
  Catat "Dependensi terpasang."
} else {
  Catat "node_modules sudah ada, lewati pemasangan."
}

# --- 5. Build -----------------------------------------------------------
# `next start` HANYA bisa menyajikan hasil build; ia tidak mem-build sendiri.
$perluBuild = $Rebuild -or (-not (Test-Path (Join-Path $RepoDir ".next\BUILD_ID")))
if ($perluBuild) {
  Catat "Membangun situs (npm run build)..."
  npm run build
  if ($LASTEXITCODE -ne 0) { Berhenti "Build gagal. Baca pesan error di atas." }
  Catat "Build sukses."
} else {
  Catat "Build lama dipakai. Sesudah `git pull`, jalankan ulang dengan -Rebuild."
}

# --- 6. Jalankan + nyalakan ulang kalau mati ---------------------------
# Pola loop ini menyamai start-localhost-3010.bat yang sudah dipakai project:
# proses Node bisa mati sendiri (kehabisan memori, error tak tertangkap), dan
# tanpa loop situs ikut mati diam-diam sampai ada yang sadar.
Catat "Menyalakan situs di http://localhost:$Port"
Catat "JANGAN TUTUP jendela ini. Tekan Ctrl+C untuk berhenti."
Catat "----------------------------------------------------------"

while ($true) {
  npm run start -- -p $Port
  $kode = $LASTEXITCODE
  Catat "Server BERHENTI (kode=$kode). Menyalakan ulang 5 detik lagi..."
  Start-Sleep -Seconds 5
}
