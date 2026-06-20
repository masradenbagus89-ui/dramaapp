#Requires -Module Pester

<#
.SYNOPSIS
    Static (READ-ONLY) guards untuk fitur kelola-banyak-repo (N-repo INTI):
    Buku Induk (portfolio registry) + kontrol-akses + pengaman .env per tingkat.

.DESCRIPTION
    Tidak menjalankan apa pun yang mengubah sistem - cuma baca teks file + manifest.
    Mengunci invariant inti supaya tidak drift:
      - 3 file baru ada di disk + terdaftar di manifest (kit-files.psd1).
      - Buku Induk punya struktur akses inti (access_tier + allowed_teams) dan
        repo sensitive contoh dikunci ke lingkaran kecil.
      - Panduan kontrol-akses menegaskan mode cetak-rencana (SIMULASI), bukan
        auto-eksekusi, dan membedakan izin clone (memblokir) vs CODEOWNERS.
      - Pengaman .env sudah tier-driven (berlaku untuk repo non-sensitive,
        bukan cuma "frontend").
#>

# Daftar file baru (dipakai -ForEach saat fase discovery Pester 5).
$NRepoFiles = @(
    'templates/lintasai-portfolio.example.yml',
    'templates/PORTFOLIO_REGISTRY_v1.md',
    'templates/ACCESS_CONTROL_NREPO_v1.md'
)

Describe 'N-repo INTI: file portfolio + akses terdaftar (anti-drift)' {

    BeforeAll {
        $script:Root = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
        $psd1 = Import-PowerShellDataFile -Path (Join-Path $script:Root 'lib/kit-files.psd1')
        $script:Templates = @($psd1.templates | ForEach-Object { $_ -replace '\\', '/' })
    }

    It 'file ada di disk: <_>' -ForEach $NRepoFiles {
        Test-Path -LiteralPath (Join-Path $script:Root $_) | Should -BeTrue -Because "file '$_' harus ada"
    }

    It 'file terdaftar di kit-files.psd1 templates: <_>' -ForEach $NRepoFiles {
        $script:Templates | Should -Contain $_ -Because "file '$_' harus didaftarkan supaya ter-deploy ke project"
    }
}

Describe 'Buku Induk (registry) punya struktur inti' {

    BeforeAll {
        $script:Root = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
        $script:Reg = Get-Content -LiteralPath (Join-Path $script:Root 'templates/lintasai-portfolio.example.yml') -Raw
    }

    It 'punya blok portfolio/access_groups/repos' {
        $script:Reg | Should -Match 'portfolio:'
        $script:Reg | Should -Match 'access_groups:'
        $script:Reg | Should -Match 'repos:'
    }

    It 'punya field kunci akses (access_tier + allowed_teams)' {
        $script:Reg | Should -Match 'access_tier:'
        $script:Reg | Should -Match 'allowed_teams:'
    }

    It 'repo sensitive contoh dikunci ke lingkaran kecil (core-backend)' {
        $script:Reg | Should -Match 'allowed_teams:\s*\[core-backend\]' -Because "repo sensitive contoh tidak boleh terbuka ke feature-staff"
    }
}

Describe 'Kontrol-akses: cetak-rencana SIMULASI + bedakan clone vs CODEOWNERS' {

    BeforeAll {
        $script:Root = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
        $script:Ac = Get-Content -LiteralPath (Join-Path $script:Root 'templates/ACCESS_CONTROL_NREPO_v1.md') -Raw
    }

    It 'menegaskan mode SIMULASI / cetak-rencana (bukan auto-eksekusi)' {
        $script:Ac | Should -Match 'SIMULASI'
        $script:Ac | Should -Match 'cetak'
    }

    It 'membedakan izin clone (memblokir) vs CODEOWNERS (bukan izin akses)' {
        $script:Ac | Should -Match 'CODEOWNERS'
        $script:Ac | Should -Match 'clone'
    }
}

Describe 'Pengaman .env: tier-driven (bukan cuma frontend)' {

    BeforeAll {
        $script:Root = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
        $script:Pre = Get-Content -LiteralPath (Join-Path $script:Root 'templates/SPLIT_REPO_PREPROVISION_v1.md') -Raw
    }

    It 'guardrail digeneralisasi ke repo non-sensitive (pakai access_tier)' {
        $script:Pre | Should -Match 'access_tier'
        $script:Pre | Should -Match 'non-.?sensitive'
    }

    It 'tetap melarang DATABASE_URL bocor ke repo non-sensitive' {
        $script:Pre | Should -Match 'DATABASE_URL'
    }
}

Describe 'Portfolio reader (READ-ONLY) - lib/portfolio-read.ps1' {

    BeforeAll {
        $script:Root = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
        . (Join-Path $script:Root 'lib/portfolio-read.ps1')
        $script:Example = Join-Path $script:Root 'templates/lintasai-portfolio.example.yml'
    }

    It 'lib/portfolio-read.ps1 terdaftar di kit-files.psd1 lib_files (anti-drift)' {
        $psd1 = Import-PowerShellDataFile -LiteralPath (Join-Path $script:Root 'lib/kit-files.psd1')
        ($psd1.lib_files | ForEach-Object { $_ -replace '\\', '/' }) | Should -Contain 'lib/portfolio-read.ps1'
    }
    It 'Read-LintasPortfolio: baca contoh -> meta + jumlah repo/group benar' {
        $d = Read-LintasPortfolio -Path $script:Example
        $d.Present | Should -BeTrue
        $d.BaseName | Should -Be 'bigseo'
        $d.GithubOwner | Should -Be 'ojokesusu'
        @($d.Repos).Count | Should -Be 5
        @($d.Groups).Count | Should -Be 3
    }
    It 'Read-LintasPortfolio: repo sensitive ter-parse benar (role/tier/allowed_teams)' {
        $d = Read-LintasPortfolio -Path $script:Example
        $be = $d.Repos | Where-Object { $_.name -eq 'bigseo-backend' }
        $be.role | Should -Be 'backend'
        $be.access_tier | Should -Be 'sensitive'
        $be.allowed_teams | Should -Contain 'core-backend'
    }
    It 'Read-LintasPortfolio: allowed_teams multi ter-split (dashboard: core-backend + feature-staff)' {
        $d = Read-LintasPortfolio -Path $script:Example
        $dash = $d.Repos | Where-Object { $_.name -eq 'bigseo-dashboard' }
        @($dash.allowed_teams).Count | Should -Be 2
        $dash.allowed_teams | Should -Contain 'feature-staff'
    }
    It 'Show-LintasPortfolioPlan: contoh -> Present + RepoCount=5 (READ-ONLY)' {
        $s = Show-LintasPortfolioPlan -RepoRoot $script:Root -Path $script:Example -Quiet
        $s.Present | Should -BeTrue
        $s.RepoCount | Should -Be 5
    }
    It 'Read-LintasPortfolio: berkas tak ada -> Present=$false (aman)' {
        $d = Read-LintasPortfolio -Path (Join-Path $script:Root 'tidak-ada-portfolio.yml')
        $d.Present | Should -BeFalse
    }
}
