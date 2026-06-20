#Requires -Module Pester

<#
.SYNOPSIS
  Pester 5+ tests untuk lib/git-helpers.ps1 (Remove-GitMetadata + Remove-MotwBlock).

.DESCRIPTION
  Sebelumnya 0 tes (audit 2026-06-17, COV-003). Remove-GitMetadata memakai
  Remove-Item -Recurse -Force pada turunan -Path; tanpa tes, regresi path-handling
  / idempotensi tidak tertangkap. Tes ini mengunci: hapus .git/ kalau ada, no-op
  aman kalau tidak ada, dan tidak melempar pada path yang tidak ada.
#>

BeforeAll {
    $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
    . (Join-Path $script:KitRepoRoot 'lib\git-helpers.ps1')
}

Describe "Remove-GitMetadata" {

    It "Hapus folder .git/ kalau ada + return `$true" {
        $proj = Join-Path $TestDrive ('proj-{0}' -f ([guid]::NewGuid().ToString('N')))
        $gitDir = Join-Path $proj '.git'
        New-Item -ItemType Directory -Path $gitDir -Force | Out-Null
        Set-Content -Path (Join-Path $gitDir 'HEAD') -Value 'ref: refs/heads/main' -Encoding UTF8
        New-Item -ItemType File -Path (Join-Path $proj 'README.md') -Force | Out-Null

        $result = Remove-GitMetadata -Path $proj

        $result | Should -BeTrue
        (Test-Path -LiteralPath $gitDir) | Should -BeFalse
        # File user lain TIDAK ikut terhapus
        (Test-Path -LiteralPath (Join-Path $proj 'README.md')) | Should -BeTrue
    }

    It "No-op idempotent kalau .git/ tidak ada + return `$true" {
        $proj = Join-Path $TestDrive ('nogit-{0}' -f ([guid]::NewGuid().ToString('N')))
        New-Item -ItemType Directory -Path $proj -Force | Out-Null

        Remove-GitMetadata -Path $proj | Should -BeTrue
    }

    It "Path tidak ada -> return `$true (tidak melempar)" {
        $missing = Join-Path $TestDrive ('missing-{0}' -f ([guid]::NewGuid().ToString('N')))
        Remove-GitMetadata -Path $missing | Should -BeTrue
    }
}

Describe "Remove-MotwBlock" {

    It "Folder normal berisi file -> return `$true" {
        $proj = Join-Path $TestDrive ('motw-{0}' -f ([guid]::NewGuid().ToString('N')))
        New-Item -ItemType Directory -Path $proj -Force | Out-Null
        Set-Content -Path (Join-Path $proj 'a.ps1') -Value '# noop' -Encoding UTF8

        Remove-MotwBlock -Path $proj | Should -BeTrue
    }

    It "Path tidak ada -> return `$true (tidak melempar)" {
        $missing = Join-Path $TestDrive ('motw-missing-{0}' -f ([guid]::NewGuid().ToString('N')))
        Remove-MotwBlock -Path $missing | Should -BeTrue
    }
}
