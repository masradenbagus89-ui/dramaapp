<#
.SYNOPSIS
  setup-pola-b.ps1 - STUB PENYELAMAT (v2.0.0). Kit lintasAI kini 100% Node.

  Berkas ini BUKAN pemasang lagi - hanya penyambung tipis ke pemasang Node
  (setup-pola-b.mjs). Ada HANYA supaya updater PowerShell LAMA (vintage mana pun,
  termasuk klien pelompat-jembatan) yang Step 4-nya memanggil setup-pola-b.ps1
  tetap MENUNTASKAN setup lewat Node - bukan "skip dengan WARN" yang mudah
  terlewat non-programmer.

  Jalur RESMI: `npx lintasai init` (pasang) / `npx lintasai update` (update).
  Pengecualian terdokumentasi tunggal (keputusan D6, docs/plans/RENCANA_V2_HAPUS_POWERSHELL.md);
  stub ini dijadwalkan dihapus di v3.
#>
param(
  [switch]$Force,
  [string]$ProjectRoot = (Get-Location).Path
)
$ErrorActionPreference = 'Stop'

$mjs = Join-Path $PSScriptRoot 'setup-pola-b.mjs'
if (-not (Test-Path $mjs)) {
  Write-Error "setup-pola-b.mjs tak ditemukan di $PSScriptRoot. Kit tampak rusak - jalankan: npx lintasai update"
  exit 1
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Error "Node.js tak ada di PATH. Pasang Node.js lalu jalankan: npx lintasai init"
  exit 1
}

$argsList = @($mjs)
if ($Force) { $argsList += '--force' }
$argsList += @('--project-root', $ProjectRoot)

Write-Host "setup-pola-b.ps1 = stub v2.0.0 -> meneruskan ke pemasang Node (setup-pola-b.mjs)..."
& $node.Source @argsList
exit $LASTEXITCODE
