# ============================================================
#  start-dramaapp.ps1
#  All-in-one startup untuk PC backup dramaapp.
#  Jalankan script ini SETIAP habis mati lampu / restart PC.
#
#  Yang dilakukan otomatis:
#    1. Stop service lama (kalau ada yang nyangkut)
#    2. Start hardlink-agent (port 8089)
#    3. Start Caddy (port 8088)
#    4. Start cloudflared + tangkap URL tunnel baru
#    5. Update Vercel env var NEXT_PUBLIC_VIDEO_BASE_URL via API
#    6. Trigger Vercel redeploy via Deploy Hook
#
#  Cara run: klik kanan file ini > Run with PowerShell
#  Atau di PowerShell:  .\start-dramaapp.ps1
# ============================================================

# ====== CONFIG — ISI SEKALI DENGAN NILAI ASLI ======
# PENTING: file ini berisi token rahasia setelah diisi.
# JANGAN upload / commit file ini ke GitHub atau share ke siapapun.

$VERCEL_TOKEN    = "ISI_VERCEL_API_TOKEN_DISINI"
$DEPLOY_HOOK_URL = "ISI_DEPLOY_HOOK_URL_DISINI"
$AGENT_SECRET    = "ISI_HARDLINK_AGENT_SECRET_DISINI"

# Biasanya tidak perlu diubah:
$VERCEL_PROJECT  = "dramaapp"
$VERCEL_TEAM_ID  = ""                                  # kosongkan kalau akun personal
$ENV_VAR_KEY     = "NEXT_PUBLIC_VIDEO_BASE_URL"
$VIDEO_ROOT      = "C:\Users\USER\Downloads\video"
$AGENT_DIR       = "C:\Users\USER\pc-backup-agent"
$CLOUDFLARED     = "$env:USERPROFILE\cloudflared.exe"
# ====================================================

function Fail($msg) {
  Write-Host ""
  Write-Host "GAGAL: $msg" -ForegroundColor Red
  Write-Host "Script berhenti. Perbaiki masalah di atas lalu jalankan lagi." -ForegroundColor Red
  Read-Host "Tekan Enter untuk menutup"
  exit 1
}

Write-Host "=== dramaapp PC backup — auto startup ===" -ForegroundColor Cyan

# --- Validasi config ---
if ($VERCEL_TOKEN -like "ISI_*") { Fail "VERCEL_TOKEN belum diisi di bagian CONFIG." }
if ($DEPLOY_HOOK_URL -like "ISI_*") { Fail "DEPLOY_HOOK_URL belum diisi di bagian CONFIG." }
if ($AGENT_SECRET -like "ISI_*") { Fail "AGENT_SECRET belum diisi di bagian CONFIG." }
if (-not (Test-Path $CLOUDFLARED)) { Fail "cloudflared.exe tidak ada di $CLOUDFLARED" }
if (-not (Test-Path "$AGENT_DIR\hardlink-agent.js")) { Fail "hardlink-agent.js tidak ada di $AGENT_DIR" }
if (-not (Test-Path "$AGENT_DIR\Caddyfile")) { Fail "Caddyfile tidak ada di $AGENT_DIR" }

# --- 1. Stop service lama (kill by port) ---
Write-Host "[1/6] Stop service lama..." -ForegroundColor Yellow
foreach ($port in 8088, 8089) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "    Port $port dibebaskan."
  }
}
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# --- 2. Start hardlink-agent ---
Write-Host "[2/6] Start hardlink-agent (port 8089)..." -ForegroundColor Yellow
$agentCmd = "`$env:HARDLINK_AGENT_SECRET='$AGENT_SECRET'; `$env:VIDEO_ROOT='$VIDEO_ROOT'; Set-Location '$AGENT_DIR'; node hardlink-agent.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $agentCmd

# --- 3. Start Caddy ---
Write-Host "[3/6] Start Caddy (port 8088)..." -ForegroundColor Yellow
$caddyCmd = "Set-Location '$AGENT_DIR'; caddy run --config Caddyfile"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $caddyCmd
Start-Sleep -Seconds 4

# --- 4. Start cloudflared + tangkap URL ---
Write-Host "[4/6] Start cloudflared + tunggu URL tunnel..." -ForegroundColor Yellow
$cfLog = "$env:TEMP\cloudflared-dramaapp.log"
if (Test-Path $cfLog) { Remove-Item $cfLog -Force -ErrorAction SilentlyContinue }
$cfCmd = "& '$CLOUDFLARED' tunnel --url http://localhost:8088 2>&1 | Tee-Object -FilePath '$cfLog'"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $cfCmd

$tunnelUrl = $null
$elapsed = 0
while (-not $tunnelUrl -and $elapsed -lt 70) {
  Start-Sleep -Seconds 2
  $elapsed += 2
  if (Test-Path $cfLog) {
    try {
      $content = [System.IO.File]::ReadAllText($cfLog)
      if ($content -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
        $tunnelUrl = $matches[0]
      }
    } catch {}
  }
}
if (-not $tunnelUrl) {
  Fail "cloudflared tidak kasih URL dalam 70 detik. Cek window cloudflared yang baru kebuka."
}
Write-Host "    URL tunnel baru: $tunnelUrl" -ForegroundColor Green

# --- 5. Update Vercel env var ---
Write-Host "[5/6] Update Vercel env var '$ENV_VAR_KEY'..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $VERCEL_TOKEN" }
$teamQ = if ($VERCEL_TEAM_ID) { "?teamId=$VERCEL_TEAM_ID" } else { "" }

try {
  $envList = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$VERCEL_PROJECT/env$teamQ" -Headers $headers -Method Get
} catch {
  Fail "Gagal ambil env list dari Vercel. Cek VERCEL_TOKEN valid. Error: $($_.Exception.Message)"
}
$envVar = $envList.envs | Where-Object { $_.key -eq $ENV_VAR_KEY } | Select-Object -First 1
if (-not $envVar) {
  Fail "Env var '$ENV_VAR_KEY' tidak ditemukan di project Vercel '$VERCEL_PROJECT'."
}

$patchBody = @{ value = $tunnelUrl; target = $envVar.target } | ConvertTo-Json
try {
  Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$VERCEL_PROJECT/env/$($envVar.id)$teamQ" `
    -Headers $headers -Method Patch -Body $patchBody -ContentType "application/json" | Out-Null
} catch {
  Fail "Gagal update env var. Error: $($_.Exception.Message)"
}
Write-Host "    Env var ke-update ke URL baru." -ForegroundColor Green

# --- 6. Trigger redeploy via Deploy Hook ---
Write-Host "[6/6] Trigger Vercel redeploy..." -ForegroundColor Yellow
try {
  Invoke-RestMethod -Uri $DEPLOY_HOOK_URL -Method Post | Out-Null
} catch {
  Fail "Gagal trigger redeploy. Cek DEPLOY_HOOK_URL. Error: $($_.Exception.Message)"
}
Write-Host "    Redeploy triggered." -ForegroundColor Green

# --- Selesai ---
Write-Host ""
Write-Host "=== SELESAI ===" -ForegroundColor Cyan
Write-Host "URL tunnel : $tunnelUrl"
Write-Host "Vercel sedang build ulang (~1-2 menit). Setelah Ready, drama hidup."
Write-Host ""
Write-Host "3 window sudah jalan (agent, Caddy, cloudflared) — JANGAN ditutup." -ForegroundColor Yellow
Write-Host "Window ini boleh ditutup."
Read-Host "Tekan Enter untuk menutup window ini"
