#Requires -Module Pester

<#
.SYNOPSIS
  Pester 5+ tests untuk lib/project-detect.ps1 (Get-StackType, Get-PackageManager,
  Get-MonorepoState).

.DESCRIPTION
  Sebelumnya 0 tes (audit 2026-06-17, COV-002) padahal Get-StackType jadi gerbang
  HARD STOP installer (setup-pola-b.ps1) dan Get-PackageManager menyarankan perintah
  ke staff. Tes ini mengunci logika gerbang + prioritas deteksi + REGRESI BUG-2
  (folder kosong -> FileCount 0, bukan crash di StrictMode).
#>

BeforeAll {
    $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
    . (Join-Path $script:KitRepoRoot 'lib\project-detect.ps1')

    function script:New-FixtureDir {
        $p = Join-Path $TestDrive ('pd-{0}' -f ([guid]::NewGuid().ToString('N')))
        New-Item -ItemType Directory -Path $p -Force | Out-Null
        return $p
    }
}

Describe "Get-StackType (gerbang dukungan stack)" {

    It "package.json -> node + IsSupported `$true" {
        $d = script:New-FixtureDir
        Set-Content -Path (Join-Path $d 'package.json') -Value '{}' -Encoding UTF8
        $r = Get-StackType -ProjectRoot $d
        $r.StackType   | Should -Be 'node'
        $r.IsSupported | Should -BeTrue
    }

    It "pyproject.toml saja -> python + IsSupported `$false" {
        $d = script:New-FixtureDir
        Set-Content -Path (Join-Path $d 'pyproject.toml') -Value '[tool]' -Encoding UTF8
        $r = Get-StackType -ProjectRoot $d
        $r.StackType   | Should -Be 'python'
        $r.IsSupported | Should -BeFalse
    }

    It "Polyglot (package.json + pyproject.toml) -> node menang (prioritas)" {
        $d = script:New-FixtureDir
        Set-Content -Path (Join-Path $d 'package.json') -Value '{}' -Encoding UTF8
        Set-Content -Path (Join-Path $d 'pyproject.toml') -Value '[tool]' -Encoding UTF8
        $r = Get-StackType -ProjectRoot $d
        $r.StackType   | Should -Be 'node'
        $r.IsSupported | Should -BeTrue
    }

    It "Folder kosong -> unknown + IsSupported `$false" {
        $d = script:New-FixtureDir
        $r = Get-StackType -ProjectRoot $d
        $r.StackType   | Should -Be 'unknown'
        $r.IsSupported | Should -BeFalse
    }
}

Describe "Get-PackageManager (saran perintah install)" {

    It "pnpm-lock.yaml -> pnpm (high confidence)" {
        $d = script:New-FixtureDir
        Set-Content -Path (Join-Path $d 'pnpm-lock.yaml') -Value 'lockfileVersion: 9' -Encoding UTF8
        $r = Get-PackageManager -ProjectRoot $d
        $r.Manager    | Should -Be 'pnpm'
        $r.InstallCmd | Should -Be 'pnpm install'
    }

    It "package.json tanpa lockfile -> npm (medium confidence)" {
        $d = script:New-FixtureDir
        Set-Content -Path (Join-Path $d 'package.json') -Value '{}' -Encoding UTF8
        $r = Get-PackageManager -ProjectRoot $d
        $r.Manager    | Should -Be 'npm'
        $r.Confidence | Should -Be 'medium'
    }

    It "packageManager field (Corepack) override deteksi lockfile-less" {
        $d = script:New-FixtureDir
        Set-Content -Path (Join-Path $d 'package.json') -Value '{ "packageManager": "yarn@4.1.0" }' -Encoding UTF8
        $r = Get-PackageManager -ProjectRoot $d
        $r.Manager    | Should -Be 'yarn'
        $r.Confidence | Should -Be 'high'
    }
}

Describe "Get-MonorepoState (regresi BUG-2: anti-crash folder kosong)" {

    It "Folder kosong di StrictMode -> FileCount 0, TIDAK melempar" {
        $d = script:New-FixtureDir
        # StrictMode aktif (seperti setup-pola-b.ps1). Tanpa fix @(), pipeline
        # 0-hasil = $null dan .Count MELEMPAR di sini -> It ini gagal = regresi tertangkap.
        Set-StrictMode -Version Latest
        $r = Get-MonorepoState -ProjectRoot $d
        $r.FileCount  | Should -Be 0
        $r.IsMonorepo | Should -BeFalse
    }
}
