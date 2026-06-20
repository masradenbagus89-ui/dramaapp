#Requires -Module Pester

<#
.SYNOPSIS
  Pester 5+ tests untuk lib/template-deploy.ps1 (modul penulis file: copy template +
  placeholder substitution). Sebelumnya modul KRITIS ini TANPA tes sama sekali — kalau
  rusak diam-diam, AGENTS.md/CODEOWNERS/docs bisa korup tanpa peringatan (audit 2026-06-16).

.DESCRIPTION
  Kunci perilaku: mode Skip/Backup/Overwrite, action created/updated/skipped/missing,
  substitusi .Replace() LITERAL (aman untuk value ber-karakter $0/$1/$), output UTF-8 NO-BOM.
#>

BeforeAll {
    $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
    . (Join-Path $script:KitRepoRoot 'lib\template-deploy.ps1')

    function script:New-TempDir {
        $d = Join-Path ([System.IO.Path]::GetTempPath()) ("lx-td-{0}" -f ([guid]::NewGuid().ToString('N')))
        New-Item -ItemType Directory -Path $d -Force | Out-Null
        return $d
    }
    function script:Set-FileText {
        param([string]$Path, [string]$Text)
        [System.IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding $false))
    }
    function script:Test-Utf8Bom {
        param([string]$Path)
        $b = [System.IO.File]::ReadAllBytes($Path)
        return ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF)
    }
}

Describe "Get-SupportedPlaceholder" {
    It "Mengembalikan 5 placeholder standar (termasuk angle bracket)" {
        $p = Get-SupportedPlaceholder
        $p.Count | Should -Be 5
        $p | Should -Contain '<NAMA_PROYEK>'
        $p | Should -Contain '<VERSI_KIT>'
    }
}

Describe "Copy-TemplateWithPlaceholder" {

    It "action='missing' + copied=false saat source tidak ada" {
        $d = script:New-TempDir
        try {
            $r = Copy-TemplateWithPlaceholder -SourcePath (Join-Path $d 'nope.template') -TargetPath (Join-Path $d 'out.md')
            $r.copied | Should -BeFalse
            $r.action | Should -Be 'missing'
            $r.sha256 | Should -BeNullOrEmpty
        } finally { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
    }

    It "action='created' + tulis file + sha256 ada saat target belum ada" {
        $d = script:New-TempDir
        try {
            $src = Join-Path $d 'a.template'; script:Set-FileText $src 'Halo <NAMA_PROYEK>'
            $dst = Join-Path $d 'a.md'
            $r = Copy-TemplateWithPlaceholder -SourcePath $src -TargetPath $dst -Placeholders @{ '<NAMA_PROYEK>' = 'akses' }
            $r.copied | Should -BeTrue
            $r.action | Should -Be 'created'
            $r.sha256 | Should -Not -BeNullOrEmpty
            (Get-Content -LiteralPath $dst -Raw) | Should -Be 'Halo akses'
        } finally { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
    }

    It "Substitusi LITERAL: value ber-karakter \$0/\$1 TIDAK corrupt (bukan regex)" {
        $d = script:New-TempDir
        try {
            $src = Join-Path $d 'b.template'; script:Set-FileText $src 'X=<NAMA_KAMU>'
            $dst = Join-Path $d 'b.md'
            Copy-TemplateWithPlaceholder -SourcePath $src -TargetPath $dst -Placeholders @{ '<NAMA_KAMU>' = 'a$1b$0c' } | Out-Null
            (Get-Content -LiteralPath $dst -Raw) | Should -Be 'X=a$1b$0c'
        } finally { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
    }

    It "Output UTF-8 NO-BOM" {
        $d = script:New-TempDir
        try {
            $src = Join-Path $d 'c.template'; script:Set-FileText $src 'konten'
            $dst = Join-Path $d 'c.md'
            Copy-TemplateWithPlaceholder -SourcePath $src -TargetPath $dst | Out-Null
            script:Test-Utf8Bom $dst | Should -BeFalse
        } finally { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
    }

    It "Mode Skip (default): target ada -> action='skipped', isi LAMA dipertahankan" {
        $d = script:New-TempDir
        try {
            $src = Join-Path $d 'd.template'; script:Set-FileText $src 'BARU'
            $dst = Join-Path $d 'd.md'; script:Set-FileText $dst 'LAMA'
            $r = Copy-TemplateWithPlaceholder -SourcePath $src -TargetPath $dst
            $r.copied | Should -BeFalse
            $r.action | Should -Be 'skipped'
            (Get-Content -LiteralPath $dst -Raw) | Should -Be 'LAMA'
        } finally { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
    }

    It "Mode Overwrite: target ada -> action='updated', isi diganti" {
        $d = script:New-TempDir
        try {
            $src = Join-Path $d 'e.template'; script:Set-FileText $src 'BARU'
            $dst = Join-Path $d 'e.md'; script:Set-FileText $dst 'LAMA'
            $r = Copy-TemplateWithPlaceholder -SourcePath $src -TargetPath $dst -IfExists Overwrite
            $r.action | Should -Be 'updated'
            (Get-Content -LiteralPath $dst -Raw) | Should -Be 'BARU'
        } finally { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
    }

    It "Mode Backup: target ada -> action='updated' + file .backup-* berisi isi LAMA" {
        $d = script:New-TempDir
        try {
            $src = Join-Path $d 'f.template'; script:Set-FileText $src 'BARU'
            $dst = Join-Path $d 'f.md'; script:Set-FileText $dst 'LAMA'
            $r = Copy-TemplateWithPlaceholder -SourcePath $src -TargetPath $dst -IfExists Backup -BackupSuffix 'test1'
            $r.action | Should -Be 'updated'
            (Get-Content -LiteralPath $dst -Raw) | Should -Be 'BARU'
            $bak = Join-Path $d 'f.md.backup-test1'
            Test-Path -LiteralPath $bak | Should -BeTrue
            (Get-Content -LiteralPath $bak -Raw) | Should -Be 'LAMA'
        } finally { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
    }

    It "Bikin folder induk otomatis kalau belum ada" {
        $d = script:New-TempDir
        try {
            $src = Join-Path $d 'g.template'; script:Set-FileText $src 'isi'
            $dst = Join-Path $d 'sub\nested\g.md'
            $r = Copy-TemplateWithPlaceholder -SourcePath $src -TargetPath $dst
            $r.action | Should -Be 'created'
            Test-Path -LiteralPath $dst | Should -BeTrue
        } finally { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
    }
}

Describe "Copy-StaticTemplate (verbatim, tanpa substitusi)" {

    It "Copy apa adanya (placeholder TIDAK diganti) + action='created'" {
        $d = script:New-TempDir
        try {
            $src = Join-Path $d 'h.template'; script:Set-FileText $src 'biarkan <NAMA_PROYEK> apa adanya'
            $dst = Join-Path $d 'h.md'
            $r = Copy-StaticTemplate -SourcePath $src -TargetPath $dst
            $r.action | Should -Be 'created'
            (Get-Content -LiteralPath $dst -Raw) | Should -Be 'biarkan <NAMA_PROYEK> apa adanya'
            script:Test-Utf8Bom $dst | Should -BeFalse
        } finally { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
    }

    It "action='missing' saat source tidak ada" {
        $d = script:New-TempDir
        try {
            $r = Copy-StaticTemplate -SourcePath (Join-Path $d 'x') -TargetPath (Join-Path $d 'y.md')
            $r.action | Should -Be 'missing'
        } finally { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
    }
}
