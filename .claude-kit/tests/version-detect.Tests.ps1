#Requires -Module Pester

<#
.SYNOPSIS
  Pester 5+ tests untuk lib/version-detect.ps1 Get-KitVersionFromChangelog (anti-stale).

.DESCRIPTION
  Regresi v1.13.3: CHANGELOG ganti gaya heading di v1.13.0 -> "## [X.Y.Z]" (Keep-a-Changelog,
  bracketed, TANPA 'v') sementara entri lama pakai "## vX.Y.Z". Parser lama (coba v-prefix
  DULU lalu bracketed) KELIRU: entri lama "## v1.12.0" ter-tangkap duluan sebagai "terbaru"
  sehingga entri bracketed terbaru ter-bayang -> versi STALE. Akibat nyata: manifest +
  AGENTS.md placeholder + `kit.ps1 version` salah catat versi, dan update-kit lapor "update
  tersedia" palsu terus-menerus. Tes ini mengunci scan TERPADU lintas-format yang selalu
  ambil heading PALING ATAS (= terbaru), apa pun gayanya.
#>

BeforeAll {
    $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
    . (Join-Path $script:KitRepoRoot 'lib\version-detect.ps1')

    function script:New-TempChangelog {
        param([Parameter(Mandatory)][string]$Content)
        $p = Join-Path ([System.IO.Path]::GetTempPath()) ("lx-cl-{0}.md" -f ([guid]::NewGuid().ToString('N')))
        [System.IO.File]::WriteAllText($p, $Content, (New-Object System.Text.UTF8Encoding $false))
        return $p
    }
}

Describe "Get-KitVersionFromChangelog format-agnostic (v1.13.3 regression)" {

    It "Ambil entri bracketed terbaru walau ada entri v-prefix lama di bawahnya (bug AKAR)" {
        $cl = script:New-TempChangelog -Content @'
# Changelog

## [Unreleased]

## [1.13.2] - 2026-06-13
- fix terbaru

## [1.13.0] - 2026-06-13
- aturan baru

## v1.12.0 - 2026-06-12
- entri lama gaya-v
'@
        try { Get-KitVersionFromChangelog -ChangelogPath $cl | Should -Be 'v1.13.2' }
        finally { Remove-Item -LiteralPath $cl -Force -ErrorAction SilentlyContinue }
    }

    It "Tetap baca format lama murni '## vX.Y.Z' (legacy tidak rusak)" {
        $cl = script:New-TempChangelog -Content @'
# Changelog

## v1.11.1 - 2026-06-10
- lama

## v1.11.0 - 2026-06-09
- lebih lama
'@
        try { Get-KitVersionFromChangelog -ChangelogPath $cl | Should -Be 'v1.11.1' }
        finally { Remove-Item -LiteralPath $cl -Force -ErrorAction SilentlyContinue }
    }

    It "Lewati heading non-versi ('## [Unreleased]' / '## Label ...') tidak salah ambil" {
        $cl = script:New-TempChangelog -Content @'
# Changelog

## Label spesial (auto-detect oleh kit.ps1 update)

## Disiplin penomoran versi (semver)

## [Unreleased]

## [2.0.0] - 2026-07-01
- besar
'@
        try { Get-KitVersionFromChangelog -ChangelogPath $cl | Should -Be 'v2.0.0' }
        finally { Remove-Item -LiteralPath $cl -Force -ErrorAction SilentlyContinue }
    }

    It "CHANGELOG kit ASLI = versi yang sama dengan package.json (anti-drift versi)" {
        $realCl = Join-Path $script:KitRepoRoot 'CHANGELOG.md'
        $pkg = Get-Content (Join-Path $script:KitRepoRoot 'package.json') -Raw | ConvertFrom-Json
        $detected = Get-KitVersionFromChangelog -ChangelogPath $realCl
        # detected = 'vX.Y.Z'; package.json = 'X.Y.Z'. Harus cocok (kalau tidak = stale/drift).
        ($detected -replace '^v', '') | Should -Be $pkg.version
    }

    It "Header 'Versi X.Y.Z' di CLAUDE_universal_v1.md = package.json (anti-drift versi aturan)" {
        # CLAUDE_universal_v1.md auto-baca tiap sesi di project staff; header versinya WAJIB
        # cocok dengan package.json supaya staff tidak melihat nomor versi aturan yang basi.
        $pkg = Get-Content (Join-Path $script:KitRepoRoot 'package.json') -Raw | ConvertFrom-Json
        $headerLines = Get-Content -LiteralPath (Join-Path $script:KitRepoRoot 'CLAUDE_universal_v1.md') -TotalCount 8
        $headerLine = ($headerLines | Where-Object { $_ -match 'Versi\s+\d+\.\d+\.\d+' } | Select-Object -First 1)
        $headerLine | Should -Not -BeNullOrEmpty
        ($headerLine -match 'Versi\s+(\d+\.\d+\.\d+)') | Should -BeTrue
        $Matches[1] | Should -Be $pkg.version
    }
}
