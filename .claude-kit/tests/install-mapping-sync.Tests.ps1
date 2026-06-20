#Requires -Module Pester

<#
.SYNOPSIS
  Pester 5+ guard anti-drift: $mapping di install-windows.ps1 harus konsisten dengan
  file nyata di repo.

.DESCRIPTION
  Bug yang dijaga (kasus nyata kit ini):
    1) File rule auto-loaded ditambah ke kit tapi LUPA didaftarkan di installer
       -> file diam-diam tak ke-install di mesin user (mis. LINTASAI_WORKFLOWS_v1.md
       sempat untracked + tak masuk mapping, lolos smoke karena ada lokal).
    2) Mapping merujuk file yang sudah di-rename/hapus -> Copy-Item gagal saat install.

  Dua assertion:
    A) Setiap 'Src' di $mapping HARUS ada di disk repo (catch stale ref).
    B) Rule auto-loaded yang WAJIB mendarat di ~/.claude (CLAUDE_universal_v1.md +
       LINTASAI_WORKFLOWS_v1.md) HARUS tercantum di mapping (catch lupa-daftar).

  Statis: cuma baca teks install-windows.ps1 + regex extract 'Src'. Tidak menjalankan
  installer, tidak menyentuh ~/.claude.
#>

# ---------------------------------------------------------------------------
# Discovery-time: extract Src dari $mapping. WAJIB di top-level (bukan BeforeAll)
# supaya -ForEach pada It terisi saat fase discovery Pester 5.
# ---------------------------------------------------------------------------
$__root = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
$__installText = Get-Content -LiteralPath (Join-Path $__root 'install-windows.ps1') -Raw
$MappingSrc = @(
    [regex]::Matches($__installText, "Src\s*=\s*'([^']+)'") |
        ForEach-Object { $_.Groups[1].Value }
)

# Daftar file tes di disk (dipakai -ForEach saat discovery). psd1.tests di-import
# ulang di BeforeAll untuk fase run.
$DiskTests = @(
    Get-ChildItem -Path (Join-Path $__root 'tests') -Filter '*.Tests.ps1' -File |
        ForEach-Object { "tests/$($_.Name)" }
)

# Discovery-time: extract Src template dari blok $teamFiles di setup-pola-b.ps1.
# (Hanya entri 'Src = ''templates...''' yang ditarik -> daftar template yang DI-DEPLOY ke project.)
$__setupText = Get-Content -LiteralPath (Join-Path $__root 'setup-pola-b.ps1') -Raw
$TeamFilesSrc = @(
    [regex]::Matches($__setupText, "Src\s*=\s*'(templates[^']+)'") |
        ForEach-Object { $_.Groups[1].Value }
)

Describe 'install-windows.ps1 $mapping integrity (anti-drift)' {

    BeforeAll {
        $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
        $installText = Get-Content -LiteralPath (Join-Path $script:KitRepoRoot 'install-windows.ps1') -Raw
        $script:MappingSrc = @(
            [regex]::Matches($installText, "Src\s*=\s*'([^']+)'") |
                ForEach-Object { $_.Groups[1].Value }
        )
    }

    It 'mapping punya minimal 1 entri Src' {
        $script:MappingSrc.Count | Should -BeGreaterThan 0
    }

    It 'Src ada di disk repo: <_>' -ForEach $MappingSrc {
        $rel = ($_ -replace '\\', '/')
        $full = Join-Path $script:KitRepoRoot $rel
        Test-Path -LiteralPath $full | Should -BeTrue -Because "mapping merujuk '$_' tapi file tidak ada di repo (drift: file di-rename/hapus -> Copy-Item gagal saat install)"
    }

    It 'rule auto-loaded WAJIB tercantum di mapping: <_>' -ForEach @('CLAUDE_universal_v1.md', 'LINTASAI_WORKFLOWS_v1.md') {
        $script:MappingSrc | Should -Contain $_ -Because "rule '$_' harus di-copy installer ke ~/.claude; kalau lupa daftar, user kehilangan aturan ini tiap sesi"
    }
}

Describe 'lib/kit-files.psd1 tests array vs disk (anti-drift)' {

    BeforeAll {
        $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
        $psd1 = Import-PowerShellDataFile -Path (Join-Path $script:KitRepoRoot 'lib/kit-files.psd1')
        $script:Psd1Tests = @($psd1.tests | ForEach-Object { $_ -replace '\\', '/' })
    }

    It 'setiap file tes di disk terdaftar di psd1.tests: <_>' -ForEach $DiskTests {
        $script:Psd1Tests | Should -Contain $_ -Because "file tes '$_' ada di disk tapi tidak terdaftar di manifest kit-files.psd1 -> tidak ke-track integritas (drift)"
    }
}

Describe 'install-windows.ps1 gerbang non-interaktif (anti-hang, audit Tingkat 3)' {

    BeforeAll {
        $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
        $script:InstallText = Get-Content -LiteralPath (Join-Path $script:KitRepoRoot 'install-windows.ps1') -Raw
    }

    It 'Memakai [Console]::IsInputRedirected untuk deteksi non-interaktif' {
        $script:InstallText | Should -Match 'IsInputRedirected'
    }

    It 'Gerbang non-interaktif muncul SEBELUM Read-Host (anti pipa-terbuka menggantung)' {
        $idxGuard = $script:InstallText.IndexOf('IsInputRedirected')
        $idxRead  = $script:InstallText.IndexOf('Read-Host "Lanjut install')
        $idxGuard | Should -BeGreaterThan -1
        $idxRead  | Should -BeGreaterThan -1
        $idxGuard | Should -BeLessThan $idxRead -Because 'guard harus dievaluasi sebelum Read-Host supaya pipa-terbuka tidak pernah memblokir'
    }

    It 'Punya escape-hatch LINTASAI_INTERACTIVE (human Git Bash bisa paksa prompt)' {
        $script:InstallText | Should -Match 'LINTASAI_INTERACTIVE'
    }
}

Describe 'JALANKAN_KIT.md derive ukuran-tim mapping (anti-inversi 13a, audit Fase B 2026-06-18)' {

    BeforeAll {
        $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
        $script:JkText = Get-Content -LiteralPath (Join-Path $script:KitRepoRoot 'JALANKAN_KIT.md') -Raw
    }

    It 'Punya pemetaan TERPISAH untuk versi PENUH (13b) dan RINGKAS (13a)' {
        $script:JkText | Should -Match 'Versi PENUH \(13b'
        $script:JkText | Should -Match 'Versi RINGKAS \(13a'
    }

    It 'RINGKAS [1] dipetakan ke TIM KECIL (bukan SENDIRI) -> cegah inversi yang salah-set governance tim' {
        $script:JkText | Should -Match '\[1\]\s*TIM KECIL\s*\|\s*TIM KECIL'
    }

    It 'TIDAK ada lagi pemetaan parenthetical lama yang terbalik ([1] tetap-1-tempat = SENDIRI di versi ringkas)' {
        $script:JkText | Should -Not -Match 'atau "SENDIRI" di versi ringkas'
    }
}

Describe 'setup-pola-b.ps1 $teamFiles vs kit-files.psd1 (anti-drift daftar deploy ke project)' {
    # Celah yang dijaga: nama template di-deploy ke project hidup di DUA daftar terpisah --
    # blok $teamFiles (setup-pola-b.ps1) DAN kit-files.psd1. Sebelum penjaga ini, hanya
    # beberapa file dicek satu-satu (RESEP, secret-guard, dst), bukan SEMUA. Akibatnya:
    # tambah/rename template di salah satu daftar tapi lupa yang lain -> tidak ketahuan.
    # Penjaga UMUM: tiap Src template di $teamFiles (A) ada di disk + (B) terdaftar di kit-files.psd1.

    BeforeAll {
        $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
        $psd1 = Import-PowerShellDataFile -Path (Join-Path $script:KitRepoRoot 'lib/kit-files.psd1')
        # Gabung SEMUA nilai string dari tiap tier psd1 (templates + github_assets + decisions + dst)
        # jadi satu set "berkas yang terdaftar di kit", lalu normalisasi ke forward-slash.
        $script:AllPsd1Files = @(
            $psd1.Values |
                ForEach-Object { $_ } |
                Where-Object { $_ -is [string] } |
                ForEach-Object { $_ -replace '\\', '/' }
        )
    }

    It 'punya minimal 1 template yang di-deploy (regex $teamFiles tidak gagal senyap)' {
        @($TeamFilesSrc).Count | Should -BeGreaterThan 0
    }

    It 'template yang di-deploy ADA di disk: <_>' -ForEach $TeamFilesSrc {
        $rel = ($_ -replace '\\', '/')
        Test-Path -LiteralPath (Join-Path $script:KitRepoRoot $rel) | Should -BeTrue -Because "daftar deploy tim merujuk file ini tapi tidak ada di repo (drift: di-rename/hapus -> copy gagal saat setup tim)"
    }

    It 'template yang di-deploy TERDAFTAR di kit-files.psd1: <_>' -ForEach $TeamFilesSrc {
        $rel = ($_ -replace '\\', '/')
        $script:AllPsd1Files | Should -Contain $rel -Because "file ini di-deploy ke project (daftar deploy tim) tapi tidak terdaftar di kit-files.psd1 -> tidak ter-verifikasi kelengkapan + tidak ke-track integritas (drift 'lupa daftar di salah satu dari 2 daftar')"
    }
}

Describe 'JALANKAN_KIT.md jaminan tawaran Refactor Bertingkat (anti-popup-hilang)' {
    # Celah yang dijaga: tawaran refactor dulu cuma muncul untuk project monorepo-berkode (Popup #3 13b).
    # Project setengah-jadi yang salah-terdeteksi kosong / non-monorepo / sudah-terpecah -> tawaran HILANG.
    # Langkah 14d (JAMINAN) memastikan refactor ditawarkan untuk SEMUA project ber-kode. Tes ini menguncinya.

    BeforeAll {
        $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
        $script:JkText = Get-Content -LiteralPath (Join-Path $script:KitRepoRoot 'JALANKAN_KIT.md') -Raw
    }

    It 'punya langkah JAMINAN tawaran refactor (14d)' {
        $script:JkText | Should -Match '14d'
        $script:JkText | Should -Match 'JAMINAN TAWARAN REFACTOR'
    }
    It 'jaminan berlaku untuk project ber-kode apa pun bentuk repo (bukan cuma monorepo)' {
        $script:JkText | Should -Match 'non-monorepo'
        $script:JkText | Should -Match 'sudah-terpecah'
    }
    It 'default TAWARKAN saat ragu/borderline (jangan lewati diam-diam)' {
        $script:JkText | Should -Match 'DEFAULT TAWARKAN'
    }
    It '13a RINGKAS menegaskan melewati PECAH saja, BUKAN RAPIKAN' {
        $script:JkText | Should -Match 'BUKAN RAPIKAN'
    }
}
