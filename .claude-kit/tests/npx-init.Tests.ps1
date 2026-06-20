#Requires -Module Pester

<#
.SYNOPSIS
  Pester 5+ regression tests untuk v1.1.3 fix - npx-init flow (setup-pola-b.ps1
  via npm wrapper dengan -ProjectRoot eksplisit).

.DESCRIPTION
  v1.1.3 fix area:
    1) AGENTS.md.template HARUS ke-bundle di tarball (sebelumnya hilang krn glob).
    2) setup-pola-b.ps1 HARUS terima -ProjectRoot tanpa error (parameter exists).
    3) Saat -ProjectRoot dipakai, $ProjectRoot != Split-Path -Parent $KitDir
       (npm cache path BUKAN root proyek user).
    4) Saat $KitDir bukan child of $ProjectRoot/.claude-kit, script auto-copy
       isi kit dari $PSScriptRoot ke $ProjectRoot/.claude-kit.
    5) Project name di-derive dari leaf $ProjectRoot (bukan parent KitDir).
    6) Setelah init: AGENTS.md ada di $ProjectRoot (bukan di npm cache).
    7) Setelah init: .claude-kit/setup-pola-b.ps1 ada di $ProjectRoot.

  Strategi:
    - BeforeAll: bikin temp dir mock-npm-cache (simulasi $KitDir) + temp dir
      mock-project-root. Copy kit minimal (atau seluruh kit) ke mock-npm-cache.
    - Jalankan setup-pola-b.ps1 -ProjectRoot <mockProjectRoot> -Force -SkipTeamFiles
      dari mock-npm-cache.
    - Assert hasil: AGENTS.md ada di $mockProjectRoot, .claude-kit/setup-pola-b.ps1
      ada di $mockProjectRoot, dst.
    - AfterAll: cleanup kedua temp dir.

  Catatan:
    - Test #1 (tarball content) pakai `npm pack --dry-run --json` untuk
      enumerate file list TANPA bikin tarball asli (faster + no disk write).
    - Test #2 (parameter exists) pakai AST static check (tidak invoke script).
    - Test #3-7 perlu actual invocation tapi `-DryRun` tidak cukup karena
      v1.1.3 copy step harus betul-betul dieksekusi untuk verifikasi.
#>

BeforeAll {
    $ErrorActionPreference = 'Stop'

    # ---- Resolve repo root (kit folder yang berisi setup-pola-b.ps1) ----
    $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
    $script:SetupScript = Join-Path $script:KitRepoRoot 'setup-pola-b.ps1'
    $script:PackageJson = Join-Path $script:KitRepoRoot 'package.json'
    $script:AgentsTemplate = Join-Path $script:KitRepoRoot 'AGENTS.md.template'

    if (-not (Test-Path $script:SetupScript)) {
        throw "setup-pola-b.ps1 not found at $script:SetupScript"
    }

    # ---- Temp dir untuk mock-npm-cache + mock-project-root ----
    $stamp = Get-Date -Format 'yyyyMMddHHmmssfff'
    $script:TempBase = Join-Path $env:TEMP "lintasAI-npx-init-tests-$stamp"
    $script:MockNpmCache = Join-Path $script:TempBase 'npm-cache-kit'
    $script:MockProjectRoot = Join-Path $script:TempBase 'my-shiny-project'

    New-Item -ItemType Directory -Path $script:MockNpmCache -Force | Out-Null
    New-Item -ItemType Directory -Path $script:MockProjectRoot -Force | Out-Null

    # ---- Copy seluruh kit ke mock-npm-cache (simulasi npm extract tarball) ----
    # Pakai robocopy supaya cepat, exclude tests/ supaya tidak rekursif.
    $robocopyArgs = @(
        $script:KitRepoRoot,
        $script:MockNpmCache,
        '/E',           # include subdirs (empty too)
        '/NFL', '/NDL', '/NJH', '/NJS', '/NC', '/NS', '/NP',  # quiet
        '/XD', 'node_modules', '.git'
    )
    & robocopy @robocopyArgs | Out-Null
    # robocopy exit 0-7 = success; 8+ = error
    if ($LASTEXITCODE -ge 8) {
        throw "robocopy failed with exit code $LASTEXITCODE"
    }

    $script:MockSetupScript = Join-Path $script:MockNpmCache 'setup-pola-b.ps1'
    if (-not (Test-Path $script:MockSetupScript)) {
        throw "Mock kit setup script missing at $script:MockSetupScript - copy failed"
    }
}

AfterAll {
    if ($script:TempBase -and (Test-Path $script:TempBase)) {
        Remove-Item -Path $script:TempBase -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Describe "v1.1.3 - npm pack bundles AGENTS.md.template" {
    It "AGENTS.md.template appears in npm pack file list" {
        # `npm pack --dry-run --json` returns metadata including the file list
        # without actually creating a tarball on disk.
        Push-Location $script:KitRepoRoot
        try {
            $packJson = & npm pack --dry-run --json 2>$null | Out-String
            $packJson | Should -Not -BeNullOrEmpty
            $packData = $packJson | ConvertFrom-Json
            # npm returns array of package objects
            $pkg = if ($packData -is [array]) { $packData[0] } else { $packData }
            $files = $pkg.files | ForEach-Object { $_.path }
            $files | Should -Contain 'AGENTS.md.template'
        } finally {
            Pop-Location
        }
    }
}

Describe "v1.1.3 - setup-pola-b.ps1 accepts -ProjectRoot parameter" {
    It "Has -ProjectRoot parameter declared in param block (AST check)" {
        $tokens = $null
        $errors = $null
        $ast = [System.Management.Automation.Language.Parser]::ParseFile(
            $script:SetupScript, [ref]$tokens, [ref]$errors
        )
        $errors | Where-Object { $_.IncompleteInput -eq $false } | Should -BeNullOrEmpty

        # Find top-level param block
        $paramBlock = $ast.ParamBlock
        $paramBlock | Should -Not -BeNullOrEmpty

        $paramNames = $paramBlock.Parameters | ForEach-Object { $_.Name.VariablePath.UserPath }
        $paramNames | Should -Contain 'ProjectRoot'
    }

    It "Invokes without parameter binding error when -ProjectRoot supplied" {
        # Quick sanity: -DryRun -Force -SkipTeamFiles + -ProjectRoot should
        # at minimum get past param binding (may fail later for other reasons
        # but NOT ParameterBindingException).
        $sandboxRoot = Join-Path $script:TempBase 'paramcheck-root'
        New-Item -ItemType Directory -Path $sandboxRoot -Force | Out-Null

        $output = & powershell.exe -NoProfile -ExecutionPolicy Bypass `
            -File $script:MockSetupScript `
            -ProjectRoot $sandboxRoot `
            -DryRun -Force -SkipTeamFiles 2>&1 | Out-String

        # ParameterBindingException = test fail
        $output | Should -Not -Match 'ParameterBindingException'
        $output | Should -Not -Match "parameter cannot be found that matches"
    }
}

Describe "v1.1.3 - ProjectRoot resolution (npx wrapper mode)" {
    It "When -ProjectRoot supplied, root = explicit value (NOT parent of KitDir)" {
        # Run setup with -ProjectRoot = mockProjectRoot. KitDir = mockNpmCache.
        # If fix broken: $ProjectRoot would default to Split-Path -Parent $KitDir
        #               = $script:TempBase (parent of mockNpmCache), WRONG.
        # If fix works: $ProjectRoot stays at mockProjectRoot.
        # Verify by checking that AGENTS.md lands in mockProjectRoot, not TempBase.

        # Clean target first to avoid stale state from prior tests
        $targetRoot = Join-Path $script:TempBase 'resolve-check-root'
        if (Test-Path $targetRoot) { Remove-Item -Path $targetRoot -Recurse -Force }
        New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null

        $output = & powershell.exe -NoProfile -ExecutionPolicy Bypass `
            -File $script:MockSetupScript `
            -ProjectRoot $targetRoot `
            -Force -SkipTeamFiles 2>&1 | Out-String

        # AGENTS.md must exist in targetRoot (explicit -ProjectRoot honored)
        $agentsInTarget = Join-Path $targetRoot 'AGENTS.md'
        Test-Path $agentsInTarget | Should -BeTrue -Because "AGENTS.md should land in -ProjectRoot ($targetRoot), got output:`n$output"

        # AGENTS.md must NOT exist in TempBase (parent of MockNpmCache)
        $agentsInParent = Join-Path $script:TempBase 'AGENTS.md'
        Test-Path $agentsInParent | Should -BeFalse -Because "AGENTS.md must NOT leak to parent of KitDir"
    }
}

Describe "v1.1.3 - Auto-copy kit when ProjectRoot lacks .claude-kit" {
    It "Triggers copy from `$PSScriptRoot when target .claude-kit absent" {
        # Setup: fresh project root WITHOUT .claude-kit. Run setup with
        # -ProjectRoot pointing there. Script should detect npx mode and copy
        # kit contents from $KitDir (mockNpmCache) to $ProjectRoot/.claude-kit.

        $autoCopyRoot = Join-Path $script:TempBase 'autocopy-root'
        if (Test-Path $autoCopyRoot) { Remove-Item -Path $autoCopyRoot -Recurse -Force }
        New-Item -ItemType Directory -Path $autoCopyRoot -Force | Out-Null

        # Pre-condition: no .claude-kit yet
        $kitTargetDir = Join-Path $autoCopyRoot '.claude-kit'
        Test-Path $kitTargetDir | Should -BeFalse

        $output = & powershell.exe -NoProfile -ExecutionPolicy Bypass `
            -File $script:MockSetupScript `
            -ProjectRoot $autoCopyRoot `
            -Force -SkipTeamFiles 2>&1 | Out-String

        # Post-condition: .claude-kit created with key files
        Test-Path $kitTargetDir | Should -BeTrue -Because "Script should auto-copy kit to .claude-kit, output:`n$output"
        Test-Path (Join-Path $kitTargetDir 'setup-pola-b.ps1') | Should -BeTrue
        Test-Path (Join-Path $kitTargetDir 'CHANGELOG.md') | Should -BeTrue
    }
}

Describe "v1.1.3 - Project name derived from -ProjectRoot leaf" {
    It "Project name = Split-Path -Leaf `$ProjectRoot (not KitDir parent)" {
        $namedRoot = Join-Path $script:TempBase 'unique-project-name-xyz'
        if (Test-Path $namedRoot) { Remove-Item -Path $namedRoot -Recurse -Force }
        New-Item -ItemType Directory -Path $namedRoot -Force | Out-Null

        $output = & powershell.exe -NoProfile -ExecutionPolicy Bypass `
            -File $script:MockSetupScript `
            -ProjectRoot $namedRoot `
            -Force -SkipTeamFiles 2>&1 | Out-String

        $agentsPath = Join-Path $namedRoot 'AGENTS.md'
        Test-Path $agentsPath | Should -BeTrue -Because "AGENTS.md must exist before name check, output:`n$output"

        # Project name appears in deployed AGENTS.md (template fills it in heading)
        $agentsContent = Get-Content -Path $agentsPath -Raw
        $expectedName = Split-Path -Leaf $namedRoot
        $agentsContent | Should -Match ([regex]::Escape($expectedName)) -Because "AGENTS.md should reference project name '$expectedName' from -ProjectRoot leaf"
    }
}

Describe "v1.1.3 - Post-init artifacts in `$ProjectRoot" {
    BeforeAll {
        # One init run shared by both `It` blocks below
        $script:PostInitRoot = Join-Path $script:TempBase 'postinit-root'
        if (Test-Path $script:PostInitRoot) { Remove-Item -Path $script:PostInitRoot -Recurse -Force }
        New-Item -ItemType Directory -Path $script:PostInitRoot -Force | Out-Null

        $script:PostInitOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass `
            -File $script:MockSetupScript `
            -ProjectRoot $script:PostInitRoot `
            -Force -SkipTeamFiles 2>&1 | Out-String
    }

    It "AGENTS.md exists at `$ProjectRoot root" {
        $agentsPath = Join-Path $script:PostInitRoot 'AGENTS.md'
        Test-Path $agentsPath | Should -BeTrue -Because "Post-init AGENTS.md must exist, output:`n$script:PostInitOutput"
    }

    It ".claude-kit/setup-pola-b.ps1 exists at `$ProjectRoot/.claude-kit" {
        $kitSetup = Join-Path $script:PostInitRoot '.claude-kit\setup-pola-b.ps1'
        Test-Path $kitSetup | Should -BeTrue -Because "Post-init kit setup script must exist in deployed .claude-kit"
    }
}
