#Requires -Module Pester

<#
.SYNOPSIS
  Tes untuk lib/unicode-safety-check.ps1 (robot pemindai huruf-tipuan Unicode).

.DESCRIPTION
  Memastikan robot: (A) MENANGKAP karakter berbahaya (Tag block, bidi-override, zero-width);
  (B) TIDAK alarm-palsu pada emoji ber-ZWJ / BOM di awal berkas (default); (C) menyalakan
  deteksi joiner hanya dengan -IncludeJoiners; (D) GERBANG: repo kit ASLI bersih (Count = 0).
  Pola "repo/string sengaja-berisi" lalu assert robot menangkap = bukti bukan lulus-trivial.
#>

BeforeAll {
    $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
    # Dot-source: InvocationName '.' -> auto-run di-skip, cuma definisikan fungsi.
    . (Join-Path $script:KitRepoRoot 'lib/unicode-safety-check.ps1')
}

Describe 'unicode-safety: menangkap karakter berbahaya' {
    It 'menandai Tag block (U+E0041) sebagai instruksi tersembunyi' {
        $tag = [char]::ConvertFromUtf32(0xE0041)
        $f = Get-LintasUnicodeFinding -Content "halo${tag}dunia"
        @($f).Count | Should -BeGreaterThan 0
        $f[0].Name | Should -Match 'TAG BLOCK'
    }
    It 'menandai RLO bidi-override (U+202E - Trojan Source)' {
        $rlo = [char]0x202E
        $f = Get-LintasUnicodeFinding -Content "user${rlo}admin"
        @($f).Count | Should -Be 1
        $f[0].Hex | Should -Be 'U+202E'
    }
    It 'menandai ZERO WIDTH SPACE (U+200B)' {
        $zwsp = [char]0x200B
        $f = Get-LintasUnicodeFinding -Content "pass${zwsp}word"
        @($f).Count | Should -Be 1
        $f[0].Name | Should -Match 'ZERO WIDTH SPACE'
    }
    It 'melaporkan posisi baris+kolom' {
        $rlo = [char]0x202E
        $f = Get-LintasUnicodeFinding -Content "baris1`nab${rlo}cd"
        $f[0].Line | Should -Be 2
        $f[0].Col | Should -Be 3
    }
}

Describe 'unicode-safety: anti alarm-palsu (default)' {
    It 'TIDAK menandai emoji ber-ZWJ secara default (mis. emoji profesi)' {
        # man(U+1F468) + ZWJ(U+200D) + laptop(U+1F4BB) = emoji "teknisi"
        $emoji = [char]::ConvertFromUtf32(0x1F468) + [char]0x200D + [char]::ConvertFromUtf32(0x1F4BB)
        $f = Get-LintasUnicodeFinding -Content "lihat $emoji ini"
        @($f).Count | Should -Be 0
    }
    It 'TAPI menandai ZWJ kalau -IncludeJoiners dinyalakan' {
        $zwj = [char]0x200D
        $f = Get-LintasUnicodeFinding -Content "a${zwj}b" -IncludeJoiners
        @($f).Count | Should -Be 1
        $f[0].Name | Should -Match 'ZWJ'
    }
    It 'TIDAK menandai BOM di AWAL berkas (sah)' {
        $bom = [char]0xFEFF
        $f = Get-LintasUnicodeFinding -Content "${bom}# Judul`nisi"
        @($f).Count | Should -Be 0
    }
    It 'TAPI menandai BOM di TENGAH berkas (mencurigakan)' {
        $bom = [char]0xFEFF
        $f = Get-LintasUnicodeFinding -Content "teks${bom}lagi"
        @($f).Count | Should -Be 1
        $f[0].Name | Should -Match 'tengah berkas'
    }
    It 'string bersih -> 0 temuan' {
        $f = Get-LintasUnicodeFinding -Content "teks normal Bahasa Indonesia + kode `$x = 1"
        @($f).Count | Should -Be 0
    }
}

Describe 'unicode-safety: baca UTF-8 deterministik (regresi alarm-palsu CJK di PS 5.1)' {
    # Tanpa -Encoding UTF8, Get-Content di Windows PowerShell 5.1 pakai codepage ANSI ->
    # byte multi-byte UTF-8 yang sah salah-ditafsir. Contoh: 中 (U+4E2D) = byte E4 B8 AD ->
    # byte AD keliru jadi U+00AD (SOFT HYPHEN) -> alarm palsu + hasil beda 5.1 vs pwsh7.
    It 'TIDAK menandai berkas berisi karakter CJK (multi-byte UTF-8 yang sah)' {
        $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("ucs-cjk-{0}.md" -f ([guid]::NewGuid().ToString('N')))
        try {
            $cjk = [string][char]0x4E2D + [string][char]0x6587   # 中文 (dikonstruksi, bukan literal)
            $enc = New-Object System.Text.UTF8Encoding($false)
            [System.IO.File]::WriteAllText($tmp, "# Judul`nteks $cjk normal", $enc)
            $res = Invoke-LintasUnicodeSafetyCheck -Path $tmp -Quiet
            $res.Count | Should -Be 0 -Because "karakter CJK = UTF-8 sah (bukan huruf-tipuan); robot WAJIB baca -Encoding UTF8"
        } finally { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }
    }
}

Describe 'unicode-safety: GERBANG repo kit ASLI bersih' {
    # Penegakan: robot dijalankan atas SELURUH berkas teks repo kit -> WAJIB 0 temuan.
    # Kalau merah = ada karakter tak-kasat-mata ter-commit (perlu dibersihkan), BUKAN lulus-trivial.
    It 'repo kit tidak punya karakter Unicode berbahaya (default, tanpa joiners)' {
        $res = Invoke-LintasUnicodeSafetyCheck -RepoRoot $script:KitRepoRoot -Quiet
        $res.Count | Should -Be 0 -Because "ada karakter tak-kasat-mata ter-commit: $(($res.Findings | ForEach-Object { "$($_.File):$($_.Line) $($_.Hex)" }) -join '; ')"
    }
}
