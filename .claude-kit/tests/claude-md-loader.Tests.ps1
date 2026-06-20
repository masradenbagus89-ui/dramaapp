# tests/claude-md-loader.Tests.ps1
# Guard fix v1.5.26 (Pola B auto-load): pastikan CLAUDE.md loader tetap utuh + ter-wire ke installer.
# Kenapa: Claude Code OTOMATIS baca CLAUDE.md (BUKAN AGENTS.md). Loader ini yang bikin aturan kit
# benar-benar ke-load mekanis tiap sesi di proyek staff. Kalau drift, staff diam-diam tak dapat aturan.

BeforeAll {
    $script:RepoRoot = Split-Path -Parent $PSScriptRoot
}

Describe "CLAUDE.md loader template (Pola B auto-load)" {
    It "CLAUDE.md.template ada di root repo" {
        Test-Path (Join-Path $script:RepoRoot 'CLAUDE.md.template') | Should -BeTrue
    }
    It "CLAUDE.md.template @import aturan kit (CLAUDE_universal_v1.md)" {
        $c = Get-Content (Join-Path $script:RepoRoot 'CLAUDE.md.template') -Raw
        $c | Should -Match '@\./\.claude-kit/CLAUDE_universal_v1\.md'
    }
    It "CLAUDE.md.template @import AGENTS.md (override proyek)" {
        $c = Get-Content (Join-Path $script:RepoRoot 'CLAUDE.md.template') -Raw
        $c | Should -Match '@\./AGENTS\.md'
    }
    It "CLAUDE.md.template terdaftar di kit-files.psd1 universal_rules" {
        $psd1 = Import-PowerShellDataFile (Join-Path $script:RepoRoot 'lib\kit-files.psd1')
        $psd1.universal_rules | Should -Contain 'CLAUDE.md.template'
    }
}

Describe "Publish-ClaudeMd ter-wire ke installer" {
    It "lib/agents-md.ps1 mendefinisikan function Publish-ClaudeMd" {
        $c = Get-Content (Join-Path $script:RepoRoot 'lib\agents-md.ps1') -Raw
        $c | Should -Match 'function\s+Publish-ClaudeMd'
    }
    It "setup-pola-b.ps1 memanggil Publish-ClaudeMd" {
        $c = Get-Content (Join-Path $script:RepoRoot 'setup-pola-b.ps1') -Raw
        $c | Should -Match 'Publish-ClaudeMd'
    }
    It "setup-pola-b.ps1 merujuk CLAUDE.md.template" {
        $c = Get-Content (Join-Path $script:RepoRoot 'setup-pola-b.ps1') -Raw
        $c | Should -Match 'CLAUDE\.md\.template'
    }
}

Describe "Publish-ClaudeMd behavior (end-to-end di temp dir)" {
    BeforeAll {
        # Reset guard supaya dot-source pasti mendefinisikan function di scope test ini.
        $script:__lintasAI_AgentsMdLoaded = $null
        . (Join-Path $script:RepoRoot 'lib\agents-md.ps1')
        $script:tmpl = Join-Path $script:RepoRoot 'CLAUDE.md.template'
    }
    BeforeEach {
        $script:proj = Join-Path ([System.IO.Path]::GetTempPath()) ('lintasai-claudemd-' + [System.IO.Path]::GetRandomFileName())
        New-Item -ItemType Directory -Path $script:proj -Force | Out-Null
    }
    AfterEach {
        if (Test-Path $script:proj) { Remove-Item $script:proj -Recurse -Force -ErrorAction SilentlyContinue }
    }

    It "CREATE loader saat CLAUDE.md belum ada" {
        $r = Publish-ClaudeMd -ProjectRoot $script:proj -TemplatePath $script:tmpl -Placeholders @{ '<NAMA_PROYEK>' = 'demo' }
        $r.action | Should -Be 'created'
        $written = Get-Content (Join-Path $script:proj 'CLAUDE.md') -Raw
        $written | Should -Match '@\./\.claude-kit/CLAUDE_universal_v1\.md'
        $written | Should -Match 'demo'
    }

    It "CURRENT (idempotent) saat sudah loader - tidak timpa, tidak backup" {
        Publish-ClaudeMd -ProjectRoot $script:proj -TemplatePath $script:tmpl -Placeholders @{ '<NAMA_PROYEK>' = 'demo' } | Out-Null
        $r = Publish-ClaudeMd -ProjectRoot $script:proj -TemplatePath $script:tmpl -Placeholders @{ '<NAMA_PROYEK>' = 'demo' }
        $r.action | Should -Be 'current'
        $r.backup_path | Should -BeNullOrEmpty
    }

    It "BACKUP + ganti saat CLAUDE.md custom (tanpa marker)" {
        Set-Content (Join-Path $script:proj 'CLAUDE.md') -Value '# aturan custom user lama' -Encoding UTF8
        $r = Publish-ClaudeMd -ProjectRoot $script:proj -TemplatePath $script:tmpl -Placeholders @{ '<NAMA_PROYEK>' = 'demo' }
        $r.action | Should -Be 'updated'
        $r.backup_path | Should -Not -BeNullOrEmpty
        Test-Path $r.backup_path | Should -BeTrue
        (Get-Content $r.backup_path -Raw) | Should -Match 'custom user lama'
        (Get-Content (Join-Path $script:proj 'CLAUDE.md') -Raw) | Should -Match '@\./\.claude-kit/CLAUDE_universal_v1\.md'
    }
}
