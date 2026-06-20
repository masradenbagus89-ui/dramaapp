#Requires -Module Pester

<#
.SYNOPSIS
    Regression tests untuk package.json files[] bundle.

.DESCRIPTION
    Memastikan `npm pack` mem-bundle SEMUA file kritikal kit
    (AGENTS.md.template, bin/lintasai.js, lib/, templates/, docs/, tests/).

    Latar belakang: pernah ada regression di mana AGENTS.md.template
    hilang dari tarball karena pattern files[] tidak match.
    Test ini = guard supaya regression yang sama tidak terulang.

.NOTES
    Pakai `npm pack --dry-run --json` untuk parsing deterministic.
#>

BeforeAll {
    $script:KitRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
    $script:PackageJsonPath = Join-Path $script:KitRoot 'package.json'

    # Run `npm pack --dry-run --json` SEKALI di BeforeAll (mahal).
    Push-Location $script:KitRoot
    try {
        $rawOutput = & npm pack --dry-run --json 2>&1
        $exitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }

    if ($exitCode -ne 0) {
        throw "npm pack --dry-run gagal (exit $exitCode). Output: $rawOutput"
    }

    # npm pack --json kadang campur stderr ke stdout; ambil JSON array/object di akhir.
    $jsonText = ($rawOutput | Out-String).Trim()
    # Cari posisi '[' atau '{' pertama yang masuk akal - npm pack --json balikin array.
    $jsonStart = $jsonText.IndexOf('[')
    if ($jsonStart -lt 0) { $jsonStart = $jsonText.IndexOf('{') }
    if ($jsonStart -gt 0) {
        $jsonText = $jsonText.Substring($jsonStart)
    }

    $script:PackInfo = $jsonText | ConvertFrom-Json
    # npm pack --json returns array; ambil entry pertama.
    if ($script:PackInfo -is [array]) {
        $script:PackInfo = $script:PackInfo[0]
    }

    # File list (relative path di dalam tarball).
    $script:PackFiles = @($script:PackInfo.files | ForEach-Object { $_.path })
}

Describe "package.json structural integrity" {
    It "package.json adalah valid JSON" {
        { Get-Content -Raw -Path $script:PackageJsonPath | ConvertFrom-Json } | Should -Not -Throw
    }

    It "package.json punya files[] array" {
        $pkg = Get-Content -Raw -Path $script:PackageJsonPath | ConvertFrom-Json
        $pkg.files | Should -Not -BeNullOrEmpty
        $pkg.files.Count | Should -BeGreaterThan 0
    }

    It "files[] include pattern untuk AGENTS.md.template (explicit atau via wildcard)" {
        $pkg = Get-Content -Raw -Path $script:PackageJsonPath | ConvertFrom-Json
        $patterns = @($pkg.files)

        # Match jika ada salah satu: explicit "AGENTS.md.template", wildcard "*.template", atau wildcard "*.md".
        $hasExplicit = $patterns -contains 'AGENTS.md.template'
        $hasTemplateWildcard = $patterns -contains '*.template'
        $hasMdWildcard = $patterns -contains '*.md'

        ($hasExplicit -or $hasTemplateWildcard -or $hasMdWildcard) | Should -BeTrue `
            -Because "AGENTS.md.template harus ter-cover oleh pattern di files[] (explicit atau wildcard)"
    }
}

Describe "npm pack --dry-run bundle coverage" {
    It "Tarball memuat AGENTS.md.template" {
        $script:PackFiles | Should -Contain 'AGENTS.md.template' `
            -Because "AGENTS.md.template adalah file kritikal kit; tanpa ini setup Pola B di project gagal"
    }

    It "Tarball memuat bin/lintasai.js" {
        $script:PackFiles | Should -Contain 'bin/lintasai.js' `
            -Because "Entry point CLI; tanpa ini `npx lintasai` tidak jalan"
    }

    It "Tarball memuat file di lib/" {
        $libFiles = @($script:PackFiles | Where-Object { $_ -like 'lib/*' })
        $libFiles.Count | Should -BeGreaterThan 0 -Because "lib/ harus ada di tarball"
    }

    It "Tarball memuat file di templates/" {
        $templateFiles = @($script:PackFiles | Where-Object { $_ -like 'templates/*' })
        $templateFiles.Count | Should -BeGreaterThan 0 -Because "templates/ harus ada di tarball"
    }

    It "Tarball memuat file di docs/" {
        $docsFiles = @($script:PackFiles | Where-Object { $_ -like 'docs/*' })
        $docsFiles.Count | Should -BeGreaterThan 0 -Because "docs/ harus ada di tarball"
    }

    It "Tarball memuat file di tests/" {
        $testFiles = @($script:PackFiles | Where-Object { $_ -like 'tests/*' })
        $testFiles.Count | Should -BeGreaterThan 0 -Because "tests/ harus ada di tarball (untuk konsumen yang mau re-verify)"
    }
}

Describe "Tarball size & file count sanity" {
    It "Tarball size < 2 MB" {
        # npm pack --json balikin `size` (unpacked) dan `unpackedSize`. Pakai size (tarball compressed) kalau ada.
        $size = if ($null -ne $script:PackInfo.size) { $script:PackInfo.size } else { $script:PackInfo.unpackedSize }
        $size | Should -Not -BeNullOrEmpty
        $size | Should -BeLessThan (2 * 1024 * 1024) `
            -Because "Kit harus stay lightweight (<2MB). Saat ini: $([math]::Round($size/1024,1)) KB"
    }

    It "Tarball entryCount > 50 (sanity check, bukan empty bundle)" {
        $entryCount = if ($null -ne $script:PackInfo.entryCount) {
            $script:PackInfo.entryCount
        } else {
            $script:PackFiles.Count
        }
        $entryCount | Should -BeGreaterThan 50 `
            -Because "Kit punya banyak file (templates, docs, lib, tests). <50 = something missing. Actual: $entryCount"
    }
}
