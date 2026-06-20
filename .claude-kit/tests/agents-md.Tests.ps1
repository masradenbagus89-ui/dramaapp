# tests/agents-md.Tests.ps1
# Guard REL-5 (audit 2026-06-17): Publish-AgentsMd menulis AGENTS.md ke root project (output
# inti dari setup) tapi sebelumnya TANPA tes end-to-end (cuma saudaranya Publish-ClaudeMd teruji).
# Mirror pola tests/claude-md-loader.Tests.ps1 "Publish-ClaudeMd behavior (end-to-end di temp dir)".

BeforeAll {
    $script:RepoRoot = Split-Path -Parent $PSScriptRoot
    # Reset guard supaya dot-source pasti mendefinisikan function di scope test ini.
    $script:__lintasAI_AgentsMdLoaded = $null
    . (Join-Path $script:RepoRoot 'lib\agents-md.ps1')
    $script:tmpl = Join-Path $script:RepoRoot 'AGENTS.md.template'
}

Describe "Publish-AgentsMd ada + ter-wire" {
    It "lib/agents-md.ps1 mendefinisikan function Publish-AgentsMd" {
        $c = Get-Content (Join-Path $script:RepoRoot 'lib\agents-md.ps1') -Raw
        $c | Should -Match 'function\s+Publish-AgentsMd'
    }
    It "AGENTS.md.template ada di root repo" {
        Test-Path $script:tmpl | Should -BeTrue
    }
}

Describe "Publish-AgentsMd behavior (end-to-end di temp dir)" {
    BeforeEach {
        $script:proj = Join-Path ([System.IO.Path]::GetTempPath()) ('lintasai-agentsmd-' + [System.IO.Path]::GetRandomFileName())
        New-Item -ItemType Directory -Path $script:proj -Force | Out-Null
    }
    AfterEach {
        if (Test-Path $script:proj) { Remove-Item $script:proj -Recurse -Force -ErrorAction SilentlyContinue }
    }

    It "CREATE saat AGENTS.md belum ada (action=created, tanpa backup)" {
        $r = Publish-AgentsMd -ProjectRoot $script:proj -TemplatePath $script:tmpl -Placeholders @{ '<NAMA_PROYEK>' = 'demo' }
        $r.action | Should -Be 'created'
        $r.backup_path | Should -BeNullOrEmpty
        Test-Path (Join-Path $script:proj 'AGENTS.md') | Should -BeTrue
        (Get-Content (Join-Path $script:proj 'AGENTS.md') -Raw) | Should -Match 'demo'
        $r.placeholders_applied | Should -BeGreaterThan 0
    }

    It "PRESERVE saat AGENTS.md existing + -Preserve (tidak timpa, tanpa backup)" {
        Set-Content (Join-Path $script:proj 'AGENTS.md') -Value '# aturan custom user lama' -Encoding UTF8
        $r = Publish-AgentsMd -ProjectRoot $script:proj -TemplatePath $script:tmpl -Placeholders @{ '<NAMA_PROYEK>' = 'demo' } -Preserve
        $r.action | Should -Be 'preserved'
        $r.backup_path | Should -BeNullOrEmpty
        # File asli TIDAK berubah
        (Get-Content (Join-Path $script:proj 'AGENTS.md') -Raw) | Should -Match 'custom user lama'
    }

    It "BACKUP + UPDATE saat existing tanpa flag (action=updated, backup berisi konten lama)" {
        Set-Content (Join-Path $script:proj 'AGENTS.md') -Value '# aturan custom user lama' -Encoding UTF8
        $r = Publish-AgentsMd -ProjectRoot $script:proj -TemplatePath $script:tmpl -Placeholders @{ '<NAMA_PROYEK>' = 'demo' }
        $r.action | Should -Be 'updated'
        $r.backup_path | Should -Not -BeNullOrEmpty
        Test-Path $r.backup_path | Should -BeTrue
        (Get-Content $r.backup_path -Raw) | Should -Match 'custom user lama'
        (Get-Content (Join-Path $script:proj 'AGENTS.md') -Raw) | Should -Match 'demo'
    }

    It "Placeholder value dengan karakter regex (\$0/\$1/\$) ditulis LITERAL (anti regex-injection)" {
        $r = Publish-AgentsMd -ProjectRoot $script:proj -TemplatePath $script:tmpl -Placeholders @{ '<NAMA_PROYEK>' = 'PT $0 $1 & Co' }
        $r.action | Should -Be 'created'
        $written = Get-Content (Join-Path $script:proj 'AGENTS.md') -Raw
        # .Replace() literal: nilai harus muncul apa adanya, bukan ke-expand sebagai grup regex.
        $written | Should -BeLike '*PT $0 $1 & Co*'
    }

    It "Tulis UTF-8 tanpa BOM (PS 5.1 default with-BOM, beberapa tool sensitif)" {
        Publish-AgentsMd -ProjectRoot $script:proj -TemplatePath $script:tmpl -Placeholders @{ '<NAMA_PROYEK>' = 'demo' } | Out-Null
        $bytes = [System.IO.File]::ReadAllBytes((Join-Path $script:proj 'AGENTS.md'))
        # BOM UTF-8 = EF BB BF. Pastikan TIDAK diawali BOM.
        ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) | Should -BeFalse
    }
}
