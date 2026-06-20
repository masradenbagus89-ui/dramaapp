# Pester 5+ tests untuk paket scaffolder create-lintasai (`npm create lintasai`).
# Memastikan paket tipis ini valid + benar-benar mendelegasikan ke paket `lintasai`.

Describe "create-lintasai (scaffolder npm create lintasai)" {
    BeforeAll {
        $script:Root   = Split-Path -Parent $PSScriptRoot
        $script:PkgDir = Join-Path $script:Root 'create-lintasai'
        $script:Pkg    = Get-Content -Raw -LiteralPath (Join-Path $script:PkgDir 'package.json') | ConvertFrom-Json
        $script:Index  = Get-Content -Raw -LiteralPath (Join-Path $script:PkgDir 'index.js')
    }

    It "package.json bernama create-lintasai" {
        $script:Pkg.name | Should -Be 'create-lintasai'
    }

    It "punya bin create-lintasai -> index.js" {
        $script:Pkg.bin.'create-lintasai' | Should -Be 'index.js'
    }

    It "bergantung ke paket lintasai (satu sumber kebenaran)" {
        $script:Pkg.dependencies.lintasai | Should -Not -BeNullOrEmpty
    }

    # v1.33.1: pengikat versi WAJIB selalu ambil TERBARU (bukan caret-pin satu major),
    # supaya `npm create lintasai` (pintu pasang utama) tak diam-diam basi saat kit naik
    # ke major berikutnya (caret ^1.x tidak ikut lompat ke 2.0). Lihat audit alur distribusi.
    It "pengikat versi lintasai = TERBARU (latest/*), bukan caret-pin satu major" {
        $script:Pkg.dependencies.lintasai | Should -BeIn @('latest', '*')
    }

    It "Windows-only (konsisten dengan lintasAI)" {
        $script:Pkg.os | Should -Contain 'win32'
    }

    It "index.js mendelegasikan ke peluncur lintasai" {
        $script:Index | Should -Match 'lintasai/bin/lintasai\.js'
    }

    It "index.js menjalankan perintah init" {
        $script:Index | Should -Match "'init'"
    }

    It "workflow penerbit create-lintasai ada" {
        Test-Path -LiteralPath (Join-Path $script:Root '.github/workflows/publish-create-lintasai.yml') | Should -BeTrue
    }
}
