#Requires -Module Pester

<#
.SYNOPSIS
  Penjaga "jejak folder-pribadi" (path-PII) di dokumen yang DITERBITKAN.

.DESCRIPTION
  Masalah: path mesin pribadi developer (mis. C:\Users\Administrator\projects\akses) bocor ke
  dokumen publik -> membocorkan struktur folder + nama proyek + bikin contoh tak jalan di mesin
  lain. Penjaga ini memindai dokumen terbit (*.md) untuk pola path ber-username NYATA, lalu
  GAGAL kalau ada (gerbang pra-rilis). Adopsi selektif pola path-leak ECC (ditulis-ulang PowerShell).

  ANTI ALARM-PALSU (sesuai catatan cek-silang):
   - Allowlist placeholder (<NamaKamu>, %username%) + nama generik (user/username/you/runner/dst).
   - KECUALIKAN berkas riwayat/forensik (CHANGELOG*, AUDIT*, *HISTORY*, docs/decisions/) yang SAH
     mengutip path lama sebagai catatan sejarah.
  Ini PENCEGAHAN (bukan kebakaran): pola path-mesin gampang nyelip ke dokumen seiring waktu.
#>

BeforeAll {
    $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path

    function Test-LintasIsGenericUser {
        param([string]$Seg)
        if ($Seg -match '[<>%]') { return $true }   # placeholder: <NamaKamu>, %USERNAME%
        $generic = @(
            'user', 'username', 'youruser', 'you', 'your', 'me', 'public', 'default',
            'nama', 'namakamu', 'namauser', 'namaanda', 'contoh', 'example', 'someone',
            'runner', 'app', 'workspace', 'ubuntu', 'vagrant'
        )
        return ($generic -contains $Seg.ToLower())
    }

    function Get-LintasPathLeak {
        param([string]$Content)
        $hits = @()
        if ([string]::IsNullOrEmpty($Content)) { return $hits }
        $rxWin = [regex]'(?i)[A-Za-z]:\\Users\\([^\\\r\n]+)\\'
        $rxNix = [regex]'/(?:home|Users)/([^/\r\n]+)/'
        foreach ($m in $rxWin.Matches($Content)) {
            if (-not (Test-LintasIsGenericUser $m.Groups[1].Value)) { $hits += $m.Value }
        }
        foreach ($m in $rxNix.Matches($Content)) {
            if (-not (Test-LintasIsGenericUser $m.Groups[1].Value)) { $hits += $m.Value }
        }
        return $hits
    }

    # Dokumen terbit yang dijaga; KECUALI riwayat/forensik (sah mengutip path lama).
    $script:ScanFiles = Get-ChildItem -Path $script:KitRepoRoot -Recurse -File -Filter *.md -ErrorAction SilentlyContinue |
        Where-Object {
            $full = $_.FullName
            ($full -notlike '*\.git\*') -and ($full -notlike '*node_modules*') -and ($full -notlike '*.backup-*') -and
            ($full -notlike '*\docs\decisions\*') -and
            ($_.Name -notlike 'CHANGELOG*') -and ($_.Name -notlike 'AUDIT*') -and ($_.Name -notlike '*HISTORY*')
        }
}

Describe 'path-leak: regex + allowlist (unit)' {
    It 'menandai path-pribadi NYATA (username asli)' {
        @(Get-LintasPathLeak -Content 'cd D:\Users\Administrator\projects\akses').Count | Should -BeGreaterThan 0
    }
    It 'TIDAK menandai placeholder kurung-siku (NamaKamu)' {
        @(Get-LintasPathLeak -Content 'mis. C:\Users\<NamaKamu>\.claude\').Count | Should -Be 0
    }
    It 'TIDAK menandai nama generik (username)' {
        @(Get-LintasPathLeak -Content 'C:\Users\username\nodejs\').Count | Should -Be 0
    }
    It 'menandai path Unix dengan username asli (/home/budi/)' {
        @(Get-LintasPathLeak -Content 'lihat /home/budi/project/ ya').Count | Should -BeGreaterThan 0
    }
    It 'TIDAK menandai /home/runner/ (CI default)' {
        @(Get-LintasPathLeak -Content 'di /home/runner/work/repo/').Count | Should -Be 0
    }
}

Describe 'path-leak: GERBANG dokumen terbit bersih (bukan riwayat/forensik)' {
    It 'tidak ada jejak folder-pribadi di dokumen terbit' {
        $leaks = @()
        foreach ($f in $script:ScanFiles) {
            $c = Get-Content -LiteralPath $f.FullName -Raw -ErrorAction SilentlyContinue
            if ($null -eq $c) { continue }
            foreach ($h in (Get-LintasPathLeak -Content $c)) {
                $rel = $f.FullName.Replace($script:KitRepoRoot, '').TrimStart('\', '/')
                $leaks += "${rel} -> $h"
            }
        }
        $leaks.Count | Should -Be 0 -Because "jejak path-pribadi bocor ke dokumen terbit: $($leaks -join ' ; ')"
    }
}
