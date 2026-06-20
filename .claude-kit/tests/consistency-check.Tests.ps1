#Requires -Module Pester

<#
.SYNOPSIS
  Pester 5+ tests untuk lib/consistency-check.ps1 (robot pemeriksa kecocokan versi).

.DESCRIPTION
  Robot ini menutup celah "angka basi": dulu cuma 3 berkas dijaga otomatis, 5 berkas
  lain buta sampai scan manual. Tes ini mengunci 2 hal:
    1. POSITIF: repo kit ASLI saat ini konsisten (semua deklarasi versi-saat-ini cocok
       dengan package.json). Ini yang gagal kalau ada yang "lupa ganti satu berkas".
    2. NEGATIF: robot benar-benar MENANGKAP ketidakcocokan + ketidakhadiran baris versi
       (bukan lulus trivial). Pakai repo tiruan di folder sementara.
#>

BeforeAll {
    $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
    # Dot-source: hanya muat fungsi, TIDAK auto-run/exit (InvocationName = '.').
    . (Join-Path $script:KitRepoRoot 'lib\consistency-check.ps1')

    function script:New-TempRepo {
        param([Parameter(Mandatory)][hashtable]$Files)
        $root = Join-Path ([System.IO.Path]::GetTempPath()) ("lx-cc-{0}" -f ([guid]::NewGuid().ToString('N')))
        New-Item -ItemType Directory -Path $root -Force | Out-Null
        foreach ($rel in $Files.Keys) {
            $full = Join-Path $root $rel
            $dir = Split-Path -Parent $full
            if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
            [System.IO.File]::WriteAllText($full, $Files[$rel], (New-Object System.Text.UTF8Encoding $false))
        }
        return $root
    }
}

Describe "Robot pemeriksa kecocokan versi - repo kit ASLI" {

    It "Semua deklarasi versi-saat-ini cocok dengan package.json (anti 'lupa ganti satu berkas')" {
        $result = Invoke-LintasConsistencyCheck -RepoRoot $script:KitRepoRoot -Quiet
        # Kalau ini gagal, pesan error sebut berkas mana yang basi -> langsung tahu yang lupa.
        $bad = @($result.Findings | Where-Object { $_.Status -ne 'OK' })
        $detail = ($bad | ForEach-Object { "$($_.File): found=$($_.Found) expected=$($_.Expected) ($($_.Status))" }) -join '; '
        $result.MismatchCount | Should -Be 0 -Because "berkas basi: $detail"
    }

    It "Menjaga minimal 5 berkas (3 lama + perluasan README/KEUNGGULAN/INDEX)" {
        $result = Invoke-LintasConsistencyCheck -RepoRoot $script:KitRepoRoot -Quiet
        $result.Findings.Count | Should -BeGreaterOrEqual 5
    }
}

Describe "Robot pemeriksa kecocokan versi - deteksi ketidakcocokan (repo tiruan)" {

    It "MENANGKAP satu berkas yang versinya salah (bukti bukan lulus trivial)" {
        $repo = script:New-TempRepo -Files @{
            'package.json'           = '{ "version": "9.9.9" }'
            'CHANGELOG.md'           = "# Changelog`n`n## [9.9.9] - 2026-06-16`n- ok"
            'CLAUDE_universal_v1.md' = "# Aturan`n`n> Versi 9.9.9 - Universal`n`nisi"
            'README.md'              = "# Judul`n`n## Versi stabil sekarang: **v1.0.0** (lama)`n"  # SENGAJA SALAH
            'KEUNGGULAN_LINTASAI.md' = "# Keunggulan`n`n> Terakhir diselaraskan: **v9.9.9 - 2026-06-16**`n"
            'templates/INDEX.md'     = "# Index - Daftar Lengkap Dokumen lintasAI v9.9.9`n"
        }
        try {
            $result = Invoke-LintasConsistencyCheck -RepoRoot $repo -Quiet
            $result.MismatchCount | Should -Be 1
            $readme = $result.Findings | Where-Object { $_.File -eq 'README.md' }
            $readme.Status | Should -Be 'MISMATCH'
            $readme.Found  | Should -Be '1.0.0'
            $readme.Expected | Should -Be '9.9.9'
        } finally {
            Remove-Item -LiteralPath $repo -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "MENANGKAP baris versi yang HILANG (berkas ada tapi deklarasi versi lenyap)" {
        $repo = script:New-TempRepo -Files @{
            'package.json'           = '{ "version": "9.9.9" }'
            'CHANGELOG.md'           = "# Changelog`n`n## [9.9.9] - 2026-06-16`n- ok"
            'CLAUDE_universal_v1.md' = "# Aturan`n`n> Versi 9.9.9 - Universal`n"
            'README.md'              = "# Judul`n`ntanpa baris versi sama sekali`n"  # baris versi LENYAP
            'KEUNGGULAN_LINTASAI.md' = "# Keunggulan`n`n> Terakhir diselaraskan: **v9.9.9 - x**`n"
            'templates/INDEX.md'     = "# Index - Daftar Lengkap Dokumen lintasAI v9.9.9`n"
        }
        try {
            $result = Invoke-LintasConsistencyCheck -RepoRoot $repo -Quiet
            $readme = $result.Findings | Where-Object { $_.File -eq 'README.md' }
            $readme.Status | Should -Be 'MISSING'
            $result.MismatchCount | Should -BeGreaterOrEqual 1
        } finally {
            Remove-Item -LiteralPath $repo -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Describe "Robot mode PROJECT (-ChecksFile) - dipakai project staff dengan peta sendiri" {

    It "Pakai Source + Checks dari peta project (.psd1) dan tangkap ketidakcocokan" {
        $repo = script:New-TempRepo -Files @{
            'package.json'             = '{ "version": "2.0.0" }'
            'README.md'                = "# App`n`nversi v1.0.0 lama`n"   # SENGAJA salah
            'docs/consistency-map.psd1' = @'
@{
    Source = @{ File = 'package.json'; JsonField = 'version' }
    Checks = @(
        @{ File = 'README.md'; Label = 'Badge versi README'; Pattern = 'v(\d+\.\d+\.\d+)' }
    )
}
'@
        }
        try {
            $mapPath = Join-Path $repo 'docs/consistency-map.psd1'
            $result = Invoke-LintasConsistencyCheck -RepoRoot $repo -ChecksFile $mapPath -Quiet
            $result.CanonicalVersion | Should -Be '2.0.0'
            $readme = $result.Findings | Where-Object { $_.File -eq 'README.md' }
            $readme.Status | Should -Be 'MISMATCH'
            $readme.Found | Should -Be '1.0.0'
        } finally {
            Remove-Item -LiteralPath $repo -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "Source pakai Pattern (project tanpa package.json) berjalan + lapor BERSIH saat cocok" {
        $repo = script:New-TempRepo -Files @{
            'VERSION.txt'              = "3.4.5`n"
            'README.md'                = "# App`n`nrilis v3.4.5`n"
            'docs/consistency-map.psd1' = @'
@{
    Source = @{ File = 'VERSION.txt'; Pattern = '(\d+\.\d+\.\d+)' }
    Checks = @(
        @{ File = 'README.md'; Label = 'Badge versi README'; Pattern = 'v(\d+\.\d+\.\d+)' }
    )
}
'@
        }
        try {
            $mapPath = Join-Path $repo 'docs/consistency-map.psd1'
            $result = Invoke-LintasConsistencyCheck -RepoRoot $repo -ChecksFile $mapPath -Quiet
            $result.CanonicalVersion | Should -Be '3.4.5'
            $result.MismatchCount | Should -Be 0
        } finally {
            Remove-Item -LiteralPath $repo -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Describe "Template warisan ke project staff: ada + terdaftar + ikut terpasang" {

    It "templates/RESEP_PERUBAHAN.md + consistency-map.example.psd1 ada di disk" {
        Test-Path (Join-Path $script:KitRepoRoot 'templates/RESEP_PERUBAHAN.md') | Should -BeTrue
        Test-Path (Join-Path $script:KitRepoRoot 'templates/consistency-map.example.psd1') | Should -BeTrue
    }

    It "Contoh peta-konsistensi valid (data-only) + punya Source & Checks" {
        $map = Import-PowerShellDataFile -LiteralPath (Join-Path $script:KitRepoRoot 'templates/consistency-map.example.psd1')
        $map.Source | Should -Not -BeNullOrEmpty
        $map.Checks | Should -Not -BeNullOrEmpty
    }

    It "Robot + 2 template terdaftar di kit-files.psd1 (anti-drift integritas)" {
        $psd1 = Import-PowerShellDataFile -LiteralPath (Join-Path $script:KitRepoRoot 'lib/kit-files.psd1')
        $psd1.lib_files | Should -Contain 'lib/consistency-check.ps1'
        $psd1.templates | Should -Contain 'templates/RESEP_PERUBAHAN.md'
        $psd1.templates | Should -Contain 'templates/consistency-map.example.psd1'
    }

    It "setup-pola-b.ps1 ikut memasang resep + contoh peta ke project (teamFiles)" {
        $setup = Get-Content -LiteralPath (Join-Path $script:KitRepoRoot 'setup-pola-b.ps1') -Raw -Encoding UTF8
        $setup | Should -Match 'templates\\RESEP_PERUBAHAN\.md'
        $setup | Should -Match 'templates\\consistency-map\.example\.psd1'
    }
}

Describe "Buku fakta (nilai-berulang non-versi) - repo kit ASLI" {

    It "Fakta file tim cocok dengan sumber teamFiles (anti drift angka, mis. 30->31 / 22->23)" {
        $result = Invoke-LintasConsistencyCheck -RepoRoot $script:KitRepoRoot -Quiet
        @($result.FactFindings).Count | Should -BeGreaterThan 0
        $factBad = @($result.FactFindings | Where-Object { $_.Status -ne 'OK' })
        $detail = ($factBad | ForEach-Object { "$($_.File)/$($_.Label): found=$($_.Found) expected=$($_.Expected) ($($_.Status))" }) -join '; '
        $factBad.Count | Should -Be 0 -Because "fakta basi: $detail"
    }

    It "Get-LintasCountFromBlock: total teamFiles = github + docs (tak ada yang tercecer)" {
        $src = @{ Kind = 'CountInBlock'; File = 'setup-pola-b.ps1'; BlockStart = '\$teamFiles\s*=\s*@\('; BlockEnd = '^\s*\)\s*$'; Entry = "Src\s*=\s*'templates" }
        $total  = Get-LintasCountFromBlock -RepoRoot $script:KitRepoRoot -Source $src
        $github = Get-LintasCountFromBlock -RepoRoot $script:KitRepoRoot -Source $src -Filter 'workflowsDir|scriptsDir|githubDir'
        $docs   = Get-LintasCountFromBlock -RepoRoot $script:KitRepoRoot -Source $src -Filter 'docsDir|decisionsDir'
        $github | Should -BeGreaterThan 0
        $docs   | Should -BeGreaterThan 0
        $total  | Should -Be ($github + $docs)
    }
}

Describe "Buku fakta - deteksi ketidakcocokan (repo tiruan)" {

    It "MENANGKAP angka file-tim salah di dokumen (bukti bukan lulus trivial)" {
        $repo = script:New-TempRepo -Files @{
            'package.json'           = '{ "version": "1.0.0" }'
            'CHANGELOG.md'           = "# Changelog`n`n## [1.0.0] - 2026-06-17`n- ok"
            'CLAUDE_universal_v1.md' = "# Aturan`n`n> Versi 1.0.0 - Universal`n"
            'README.md'              = "# Judul`n`n## Versi stabil sekarang: **v1.0.0** (x)`n`nauto-copy 99 file tim profesional`n"
            'KEUNGGULAN_LINTASAI.md' = "# K`n`n> Terakhir diselaraskan: **v1.0.0 - x**`n"
            'templates/INDEX.md'     = "# Index - Daftar Lengkap Dokumen lintasAI v1.0.0`n"
            'JALANKAN_KIT.md'        = "# Jalankan`n`n3 file tim (2 di .github + 1 di docs)`n"
            'setup-pola-b.ps1'       = @'
$teamFiles = @(
    @{ Src = 'templates\github\workflows\a.yml'; Dst = (Join-Path $workflowsDir 'a.yml') }
    @{ Src = 'templates\github\CODEOWNERS.template'; Dst = (Join-Path $githubDir 'CODEOWNERS') }
    @{ Src = 'templates\X.md'; Dst = (Join-Path $docsDir 'X.md') }
)
'@
        }
        try {
            $result = Invoke-LintasConsistencyCheck -RepoRoot $repo -Quiet
            $readme = $result.FactFindings | Where-Object { $_.File -eq 'README.md' -and $_.Fact -eq 'file-tim-total' }
            $readme.Status   | Should -Be 'MISMATCH'
            $readme.Found    | Should -Be '99'
            $readme.Expected | Should -Be '3'
            $result.MismatchCount | Should -BeGreaterThan 0
        } finally {
            Remove-Item -LiteralPath $repo -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    It "Fakta dilewati AMAN saat sumber (setup-pola-b.ps1) tak ada - tidak error" {
        $repo = script:New-TempRepo -Files @{
            'package.json'           = '{ "version": "1.0.0" }'
            'CHANGELOG.md'           = "# Changelog`n`n## [1.0.0] - 2026-06-17`n- ok"
            'CLAUDE_universal_v1.md' = "# Aturan`n`n> Versi 1.0.0 - Universal`n"
            'README.md'              = "# Judul`n`n## Versi stabil sekarang: **v1.0.0** (x)`n"
            'KEUNGGULAN_LINTASAI.md' = "# K`n`n> Terakhir diselaraskan: **v1.0.0 - x**`n"
            'templates/INDEX.md'     = "# Index - Daftar Lengkap Dokumen lintasAI v1.0.0`n"
        }
        try {
            $result = Invoke-LintasConsistencyCheck -RepoRoot $repo -Quiet
            @($result.FactFindings).Count | Should -Be 0
            $result.MismatchCount | Should -Be 0
        } finally {
            Remove-Item -LiteralPath $repo -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Describe "Cap versi 1-langkah (Invoke-LintasVersionBump) - repo tiruan" {

    BeforeAll {
        function script:New-BumpRepo {
            param([string]$Version = '1.0.0', [string]$Name = 'lintasai')
            script:New-TempRepo -Files @{
                'package.json'           = "{ `"name`": `"$Name`", `"version`": `"$Version`" }"
                'CHANGELOG.md'           = "# Changelog`n`n---`n`n## [$Version] - 2026-06-01`n`n### Ditambah`n`n- lama"
                'CLAUDE_universal_v1.md' = "# Aturan`n`n> Versi $Version - Universal`n`nisi"
                'README.md'              = "# Judul`n`n## Versi stabil sekarang: **v$Version** (x)`n"
                'KEUNGGULAN_LINTASAI.md' = "# K`n`n> Terakhir diselaraskan: **v$Version - x**`n"
                'templates/INDEX.md'     = "# Index - Daftar Lengkap Dokumen lintasAI v$Version`n"
            }
        }
    }

    It "Stamp versi baru ke 6 berkas -> pemeriksa BERSIH + canonical = versi baru" {
        $repo = script:New-BumpRepo -Version '1.0.0'
        try {
            $res = Invoke-LintasVersionBump -RepoRoot $repo -NewVersion '1.2.0' -Date '2026-06-17' -Quiet
            $res.OldVersion | Should -Be '1.0.0'
            $res.NewVersion | Should -Be '1.2.0'
            $check = Invoke-LintasConsistencyCheck -RepoRoot $repo -Quiet
            $check.CanonicalVersion | Should -Be '1.2.0'
            $check.MismatchCount | Should -Be 0
        } finally { Remove-Item -LiteralPath $repo -Recurse -Force -ErrorAction SilentlyContinue }
    }

    It "CHANGELOG dapat kerangka entri baru DI ATAS + entri lama tetap ada (tak menghapus)" {
        $repo = script:New-BumpRepo -Version '1.0.0'
        try {
            $null = Invoke-LintasVersionBump -RepoRoot $repo -NewVersion '1.2.0' -Date '2026-06-17' -Quiet
            $cl = [System.IO.File]::ReadAllText((Join-Path $repo 'CHANGELOG.md'))
            $cl | Should -Match '## \[1\.2\.0\] - 2026-06-17'
            $cl | Should -Match '## \[1\.0\.0\] - 2026-06-01'
            ($cl.IndexOf('[1.2.0]')) | Should -BeLessThan ($cl.IndexOf('[1.0.0]'))
        } finally { Remove-Item -LiteralPath $repo -Recurse -Force -ErrorAction SilentlyContinue }
    }

    It "package.json: HANYA nilai version berubah (format/field lain utuh)" {
        $repo = script:New-BumpRepo -Version '1.0.0'
        try {
            $null = Invoke-LintasVersionBump -RepoRoot $repo -NewVersion '1.2.0' -Quiet
            $pkg = [System.IO.File]::ReadAllText((Join-Path $repo 'package.json')) | ConvertFrom-Json
            $pkg.name | Should -Be 'lintasai'
            $pkg.version | Should -Be '1.2.0'
        } finally { Remove-Item -LiteralPath $repo -Recurse -Force -ErrorAction SilentlyContinue }
    }

    It "GUARD: tolak (throw) kalau package.json bukan kit (name != 'lintasai')" {
        $repo = script:New-BumpRepo -Version '1.0.0' -Name 'app-staff'
        try {
            { Invoke-LintasVersionBump -RepoRoot $repo -NewVersion '1.1.0' -Quiet } | Should -Throw
        } finally { Remove-Item -LiteralPath $repo -Recurse -Force -ErrorAction SilentlyContinue }
    }

    It "TOLAK (throw) downgrade: versi baru < versi sekarang" {
        $repo = script:New-BumpRepo -Version '2.0.0'
        try {
            { Invoke-LintasVersionBump -RepoRoot $repo -NewVersion '1.9.9' -Quiet } | Should -Throw
        } finally { Remove-Item -LiteralPath $repo -Recurse -Force -ErrorAction SilentlyContinue }
    }

    It "TOLAK (throw) format versi invalid" {
        $repo = script:New-BumpRepo -Version '1.0.0'
        try {
            { Invoke-LintasVersionBump -RepoRoot $repo -NewVersion 'v1.2' -Quiet } | Should -Throw
        } finally { Remove-Item -LiteralPath $repo -Recurse -Force -ErrorAction SilentlyContinue }
    }

    It "Idempoten: cap versi SAMA 2x -> tetap konsisten + CHANGELOG TIDAK dobel entri" {
        $repo = script:New-BumpRepo -Version '1.0.0'
        try {
            $null = Invoke-LintasVersionBump -RepoRoot $repo -NewVersion '1.1.0' -Date '2026-06-17' -Quiet
            $null = Invoke-LintasVersionBump -RepoRoot $repo -NewVersion '1.1.0' -Date '2026-06-17' -Quiet
            $check = Invoke-LintasConsistencyCheck -RepoRoot $repo -Quiet
            $check.MismatchCount | Should -Be 0
            $cl = [System.IO.File]::ReadAllText((Join-Path $repo 'CHANGELOG.md'))
            ([regex]::Matches($cl, '## \[1\.1\.0\]')).Count | Should -Be 1
        } finally { Remove-Item -LiteralPath $repo -Recurse -Force -ErrorAction SilentlyContinue }
    }

    It "Compare-LintasSemver benar untuk lebih-kecil, sama, lebih-besar" {
        (Compare-LintasSemver -A '1.0.0' -B '1.0.1') | Should -Be -1
        (Compare-LintasSemver -A '1.2.0' -B '1.2.0') | Should -Be 0
        (Compare-LintasSemver -A '2.0.0' -B '1.9.9') | Should -Be 1
    }
}
