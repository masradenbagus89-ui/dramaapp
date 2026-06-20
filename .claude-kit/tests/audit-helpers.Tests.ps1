#Requires -Module Pester

<#
.SYNOPSIS
  Pester 5+ tests untuk lib/audit-helpers.ps1 (Add-LintasAuditEntry).

.DESCRIPTION
  Sebelumnya 0 tes (audit 2026-06-17, COV-004). Fungsi ini menulis jejak audit
  keputusan keamanan (GPG skip/bypass) ke .audit-log. Tes mengunci: berkas dibuat,
  format baris `<timestamp ISO8601 UTC> | <source> | <action> | <detail>`, dan
  append (tidak menimpa baris sebelumnya).
#>

BeforeAll {
    $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
    . (Join-Path $script:KitRepoRoot 'lib\audit-helpers.ps1')
}

Describe "Add-LintasAuditEntry" {

    It "Membuat .audit-log dengan format baris yang benar" {
        $dir = Join-Path $TestDrive ('audit-{0}' -f ([guid]::NewGuid().ToString('N')))
        New-Item -ItemType Directory -Path $dir -Force | Out-Null

        Add-LintasAuditEntry -Source 'update-kit.ps1' -Action 'gpg-check-skipped' `
            -Detail 'repo=https://github.com/ojokesusu/lintasAI.git reason=trusted' -AuditDir $dir

        $logPath = Join-Path $dir '.audit-log'
        (Test-Path -LiteralPath $logPath) | Should -BeTrue

        $line = (Get-Content -LiteralPath $logPath -Raw).Trim()
        $line | Should -Match '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z \| update-kit\.ps1 \| gpg-check-skipped \| repo='
    }

    It "Append: 2 panggilan -> 2 baris (tidak menimpa)" {
        $dir = Join-Path $TestDrive ('audit2-{0}' -f ([guid]::NewGuid().ToString('N')))
        New-Item -ItemType Directory -Path $dir -Force | Out-Null

        Add-LintasAuditEntry -Source 's' -Action 'gpg-check-passed'   -Detail 'x' -AuditDir $dir
        Add-LintasAuditEntry -Source 's' -Action 'gpg-check-bypassed' -Detail 'y' -AuditDir $dir

        $lines = @(Get-Content -LiteralPath (Join-Path $dir '.audit-log'))
        $lines.Count | Should -Be 2
        $lines[0]    | Should -Match 'gpg-check-passed'
        $lines[1]    | Should -Match 'gpg-check-bypassed'
    }
}
