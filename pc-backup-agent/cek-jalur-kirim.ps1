# ============================================================
#  cek-jalur-kirim.ps1  -  kenapa video drama tersendat?
#
#  DIJALANKAN DI PC BACKUP (mesin yang menyimpan berkas video), bukan di
#  komputer kerja. Hanya MEMBACA; nol perubahan, nol berkas disentuh, nol
#  layanan di-restart.
#
#  Lahir dari pengukuran 2026-11-27: dari luar, berkas video drama hanya
#  mengalir 21-85 KB/detik (rata-rata ~40), sedangkan satu episode 2 menit
#  berukuran 27,2 MB BUTUH 231 KB/detik supaya tidak macet. Film Playly dari
#  Cloudflare R2 pada saat yang sama mengalir 1.517 KB/detik, jadi yang lambat
#  jelas jalur PC ini -- bukan internet penonton dan bukan kode situs.
#
#  Script ini menjawab tiga pertanyaan yang TIDAK bisa dijawab dari luar:
#    1. Apakah PC ini melayani berkasnya sendiri dengan cepat? (disk + Caddy)
#    2. Berapa byte/detik yang sedang KELUAR dari PC ini, dan siapa pemakainya?
#    3. Tunnel-nya mode NAMED (alamat tetap) atau QUICK (alamat acak, gratis)?
#
#  JALANKAN (PowerShell biasa, tidak perlu Administrator):
#    powershell -ExecutionPolicy Bypass -File C:\Users\USER\pc-backup-agent\cek-jalur-kirim.ps1
#
#  SENGAJA ASCII SAJA: PowerShell 5.1 gagal mem-parse .ps1 ber-karakter non-ASCII
#  (pelajaran 2026-08-20, docs/lintasai/INDEX.md).
# ============================================================

$ErrorActionPreference = "Continue"

function Judul($teks) {
  Write-Host ""
  Write-Host "=== $teks ===" -ForegroundColor Cyan
}

Write-Host "Cek jalur kirim PC backup - dimulai $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# ------------------------------------------------------------
# 0. Pagar salah-mesin.
#
#    KENAPA ADA: dijalankan di komputer yang KELIRU, bagian 1 tetap mencetak
#    "mode tunnel QUICK" (karena service cloudflared memang tidak ada di sana)
#    dan itu terbaca seperti temuan, padahal cuma salah mesin. Terbukti saat
#    script ini diuji di komputer kerja 2026-11-27.
# ------------------------------------------------------------
$videoRoot = "C:\Users\$env:USERNAME\Downloads\video"
$adaVideo  = Test-Path $videoRoot
$adaPort   = $null -ne (Get-NetTCPConnection -LocalPort 8088 -State Listen -ErrorAction SilentlyContinue)

if (-not $adaVideo -and -not $adaPort) {
  Write-Host ""
  Write-Host "PERINGATAN: ini sepertinya BUKAN PC backup." -ForegroundColor Red
  Write-Host "  - folder video '$videoRoot' tidak ada"
  Write-Host "  - tidak ada yang mendengarkan di port 8088 (penyaji video)"
  Write-Host "  Hasil di bawah TIDAK menggambarkan PC yang menyiarkan video."
  Write-Host "  Jalankan ulang di PC backup - yang menyimpan berkas .mp4 drama."
}

# ------------------------------------------------------------
# 1. Layanan yang seharusnya hidup
# ------------------------------------------------------------
Judul "1. Layanan video"

foreach ($nama in @("cloudflared", "caddy", "node")) {
  $p = Get-Process -Name $nama -ErrorAction SilentlyContinue
  if ($p) {
    $totalMB = [math]::Round(($p | Measure-Object WorkingSet64 -Sum).Sum / 1MB, 0)
    Write-Host ("  {0,-14} HIDUP  ({1} proses, {2} MB memori)" -f $nama, $p.Count, $totalMB)
  } else {
    Write-Host ("  {0,-14} TIDAK ADA" -f $nama) -ForegroundColor Yellow
  }
}

# Mode tunnel: service terpasang = NAMED (alamat tetap), kalau tidak = QUICK.
$svc = Get-Service -Name "cloudflared" -ErrorAction SilentlyContinue
if ($svc) {
  Write-Host ("  mode tunnel    NAMED (service '{0}', status {1})" -f $svc.Name, $svc.Status)
} else {
  Write-Host "  mode tunnel    QUICK (alamat acak trycloudflare.com, gratis & seadanya)" -ForegroundColor Yellow
}

# ------------------------------------------------------------
# 2. Secepat apa PC ini melayani berkasnya SENDIRI
#    Kalau di sini cepat tapi dari internet lambat -> yang sempit jalur
#    keluarnya (internet/tunnel), BUKAN disk atau Caddy.
# ------------------------------------------------------------
Judul "2. Kecepatan melayani berkas dari dalam PC ini (lewat localhost:8088)"

$contoh = $null
if ($adaVideo) {
  $contoh = Get-ChildItem -Path $videoRoot -Filter *.mp4 -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $_.Length -gt 2MB } |
            Select-Object -First 1
}

if (-not $contoh) {
  Write-Host "  Berkas contoh tidak ketemu di $videoRoot - langkah ini dilewati." -ForegroundColor Yellow
} else {
  $relatif = $contoh.FullName.Substring($videoRoot.Length).TrimStart("\") -replace "\\", "/"
  $url = "http://127.0.0.1:8088/$relatif"
  Write-Host "  Menguji: $url"
  try {
    $jam = [System.Diagnostics.Stopwatch]::StartNew()
    $req = [System.Net.HttpWebRequest]::Create($url)
    $req.AddRange(0, 2097151)   # 2 MB pertama saja
    $req.Timeout = 30000
    $res = $req.GetResponse()
    $aliran = $res.GetResponseStream()
    $penampung = New-Object byte[] 65536
    $total = 0
    while (($n = $aliran.Read($penampung, 0, $penampung.Length)) -gt 0) { $total += $n }
    $aliran.Close(); $res.Close()
    $jam.Stop()
    $kbps = [math]::Round($total / 1KB / $jam.Elapsed.TotalSeconds, 0)
    Write-Host ("  Hasil: {0} KB dalam {1:N2} detik = {2} KB/detik" -f [math]::Round($total/1KB,0), $jam.Elapsed.TotalSeconds, $kbps)
    if ($kbps -gt 5000) {
      Write-Host "  -> Disk & Caddy SEHAT. Berarti yang sempit jalur keluar (internet/tunnel)." -ForegroundColor Green
    } else {
      Write-Host "  -> Lambat bahkan di dalam PC sendiri. Curigai disk/antivirus, bukan internet." -ForegroundColor Yellow
    }
  } catch {
    Write-Host ("  GAGAL: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
    Write-Host "  (Caddy di port 8088 mungkin tidak jalan - lihat bagian 1 di atas.)"
  }
}

# ------------------------------------------------------------
# 3. Berapa byte/detik yang sedang KELUAR dari PC ini
# ------------------------------------------------------------
Judul "3. Lalu lintas keluar PC ini, 10 detik"

try {
  $sampel = Get-Counter -Counter "\Network Interface(*)\Bytes Sent/sec" -SampleInterval 1 -MaxSamples 10 -ErrorAction Stop
  $perKartu = @{}
  foreach ($s in $sampel) {
    foreach ($n in $s.CounterSamples) {
      if ($n.InstanceName -match "isatap|Loopback|Teredo") { continue }
      if (-not $perKartu.ContainsKey($n.InstanceName)) { $perKartu[$n.InstanceName] = @() }
      $perKartu[$n.InstanceName] += $n.CookedValue
    }
  }
  foreach ($kartu in $perKartu.Keys) {
    $rata = [math]::Round(($perKartu[$kartu] | Measure-Object -Average).Average / 1KB, 1)
    $puncak = [math]::Round(($perKartu[$kartu] | Measure-Object -Maximum).Maximum / 1KB, 1)
    if ($rata -lt 1 -and $puncak -lt 5) { continue }
    Write-Host ("  {0,-40} rata-rata {1} KB/dtk, puncak {2} KB/dtk" -f $kartu, $rata, $puncak)
  }
  Write-Host ""
  Write-Host "  CARA MEMBACA: kalau angkanya ratusan/ribuan KB/dtk padahal tidak ada"
  Write-Host "  penonton, berarti ADA PROGRAM LAIN yang memakan jalur kirim."
} catch {
  Write-Host ("  Gagal membaca penghitung jaringan: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
}

# ------------------------------------------------------------
# 4. Kandidat pemakan jalur kirim
# ------------------------------------------------------------
Judul "4. Program yang sedang membuka banyak sambungan keluar"

try {
  $sambungan = Get-NetTCPConnection -State Established -ErrorAction Stop |
               Where-Object { $_.RemoteAddress -notmatch "^(127\.|::1|0\.0\.0\.0)" }
  $ringkas = $sambungan | Group-Object OwningProcess | Sort-Object Count -Descending | Select-Object -First 8
  foreach ($g in $ringkas) {
    $proc = Get-Process -Id $g.Name -ErrorAction SilentlyContinue
    $nama = if ($proc) { $proc.ProcessName } else { "(pid $($g.Name))" }
    Write-Host ("  {0,-24} {1} sambungan keluar" -f $nama, $g.Count)
  }
  Write-Host ""
  Write-Host "  Untuk melihat SIAPA yang mengirim berapa: buka 'resmon' -> tab Network"
  Write-Host "  -> kolom Send (B/sec). Urutkan dari besar ke kecil."
} catch {
  Write-Host ("  Gagal membaca daftar sambungan: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
}

# ------------------------------------------------------------
# 5. Kecepatan kartu jaringan (batas atas teoretis)
# ------------------------------------------------------------
Judul "5. Kartu jaringan"

try {
  Get-NetAdapter -ErrorAction Stop | Where-Object { $_.Status -eq "Up" } | ForEach-Object {
    Write-Host ("  {0,-28} {1,-12} {2}" -f $_.Name, $_.LinkSpeed, $_.InterfaceDescription)
  }
  Write-Host ""
  Write-Host "  CATATAN: angka ini kecepatan kabel/Wi-Fi ke ROUTER, bukan kecepatan"
  Write-Host "  internet. Jatah UPLOAD dari provider jauh lebih kecil - itu yang"
  Write-Host "  menentukan lancar-tidaknya video. Uji di browser PC ini:"
  Write-Host "  https://fast.com (klik 'Show more info' supaya angka UPLOAD muncul)."
} catch {
  Write-Host ("  Gagal membaca kartu jaringan: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
}

Judul "Selesai"
Write-Host "Kirim SELURUH tampilan di atas ke sesi AI untuk dibaca bersama."
Write-Host ""
Write-Host "Pembanding yang sudah diukur dari luar 2026-11-27:"
Write-Host "  dibutuhkan agar video tidak macet : 231 KB/detik"
Write-Host "  kenyataan dari internet           : 21-85 KB/detik (rata-rata ~40)"
Write-Host "  film Playly (Cloudflare R2)       : 1.517 KB/detik"
