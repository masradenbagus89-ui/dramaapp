#Requires -Module Pester

<#
.SYNOPSIS
  Tes untuk lib/repo-board.ps1 (Papan Status Lintas-Repo) - fokus logika skor risiko (PURE).

.DESCRIPTION
  Menguji Get-LintasRepoRisk: memberi skor yang BENAR + label awam dari fakta git sintetis
  (tanpa repo nyata): .env -> GENTING, ahead/dirty -> PENTING, behind/detached/no-upstream ->
  RAPIKAN, bersih+sinkron -> OK, dan PRIORITAS (risiko tertinggi menang). Catatan = Bahasa Indonesia.
#>

BeforeAll {
    $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
    . (Join-Path $script:KitRepoRoot 'lib/repo-board.ps1')
}

Describe 'repo-board: skor risiko per kondisi' {
    It 'bersih + sinkron -> OK' {
        $r = Get-LintasRepoRisk -Branch 'main' -Ahead 0 -Behind 0 -PorcelainLines @() -HasUpstream $true
        $r.Risk | Should -Be 'OK'
    }
    It 'ada .env di perubahan -> GENTING' {
        $r = Get-LintasRepoRisk -Branch 'main' -Ahead 0 -Behind 0 -PorcelainLines @('?? .env') -HasUpstream $true
        $r.Risk | Should -Be 'GENTING'
    }
    It '.env.local juga -> GENTING' {
        $r = Get-LintasRepoRisk -Branch 'main' -Ahead 0 -Behind 0 -PorcelainLines @(' M .env.local') -HasUpstream $true
        $r.Risk | Should -Be 'GENTING'
    }
    It 'ada commit belum dikirim (ahead>0) -> PENTING' {
        $r = Get-LintasRepoRisk -Branch 'main' -Ahead 3 -Behind 0 -PorcelainLines @() -HasUpstream $true
        $r.Risk | Should -Be 'PENTING'
        $r.Notes | Should -Match 'belum dikirim'
    }
    It 'perubahan belum disimpan (dirty non-env) -> PENTING' {
        $r = Get-LintasRepoRisk -Branch 'main' -Ahead 0 -Behind 0 -PorcelainLines @(' M src/app.ts') -HasUpstream $true
        $r.Risk | Should -Be 'PENTING'
    }
    It 'ketinggalan dari server (behind>0) -> RAPIKAN' {
        $r = Get-LintasRepoRisk -Branch 'main' -Ahead 0 -Behind 2 -PorcelainLines @() -HasUpstream $true
        $r.Risk | Should -Be 'RAPIKAN'
        $r.Notes | Should -Match 'ketinggalan'
    }
    It 'kepala terlepas (detached HEAD) -> RAPIKAN' {
        $r = Get-LintasRepoRisk -Branch 'HEAD' -Ahead 0 -Behind 0 -PorcelainLines @() -HasUpstream $true
        $r.Risk | Should -Be 'RAPIKAN'
    }
    It 'belum ada remote tracking -> RAPIKAN' {
        $r = Get-LintasRepoRisk -Branch 'main' -Ahead 0 -Behind 0 -PorcelainLines @() -HasUpstream $false
        $r.Risk | Should -Be 'RAPIKAN'
    }
}

Describe 'repo-board: prioritas risiko tertinggi menang' {
    It '.env + ahead -> GENTING (bukan PENTING)' {
        $r = Get-LintasRepoRisk -Branch 'main' -Ahead 5 -Behind 0 -PorcelainLines @('?? .env') -HasUpstream $true
        $r.Risk | Should -Be 'GENTING'
    }
    It 'ahead + behind -> PENTING (ahead menang atas behind)' {
        $r = Get-LintasRepoRisk -Branch 'main' -Ahead 1 -Behind 1 -PorcelainLines @() -HasUpstream $true
        $r.Risk | Should -Be 'PENTING'
    }
}

Describe 'repo-board: label + bahasa awam' {
    It 'label OK memuat penanda hijau' {
        (Get-LintasRepoRisk -Branch 'main' -Ahead 0 -Behind 0 -PorcelainLines @() -HasUpstream $true).Label | Should -Match 'OK'
    }
    It 'label GENTING memuat kata GENTING' {
        (Get-LintasRepoRisk -Branch 'main' -Ahead 0 -Behind 0 -PorcelainLines @('?? .env') -HasUpstream $true).Label | Should -Match 'GENTING'
    }
    It 'fungsi Invoke-LintasRepoBoard ada (terdefinisi)' {
        (Get-Command Invoke-LintasRepoBoard -ErrorAction SilentlyContinue) | Should -Not -BeNullOrEmpty
    }
}
