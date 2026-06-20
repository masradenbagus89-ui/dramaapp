#Requires -Module Pester

<#
.SYNOPSIS
  Pester 5+ tests untuk uninstall.ps1 (manifest-based safe uninstall).

.DESCRIPTION
  Tiga area uji:
    1) DryRun mode    - fresh install harus exit 0, classification PRISTINE/MODIFIED/MISSING
                        terlihat, AGENTS.md di-skip secara default.
    2) Manifest gone  - project tanpa manifest harus warn / abort dengan exit non-zero,
                        TIDAK menghapus apa pun.
    3) Param surface  - -AllowModified harus exist sebagai parameter (AST static check).

  Strategi:
    - Build fake project root di $env:TEMP dengan struktur:
        <fakeRoot>\
          AGENTS.md                       (akan masuk manifest, default skipped uninstall)
          docs\README.md                  (PRISTINE - hash match)
          docs\edited.md                  (MODIFIED - hash mismatch)
          docs\gone.md                    (MISSING - di-list manifest tapi sudah dihapus)
          .claude-kit\
            uninstall.ps1                 (copy dari kit asli)
            lib\safety.ps1, manifest-signing.ps1   (dependencies)
            .install-manifest.json        (di-craft + HMAC-signed di BeforeAll)

    - Jalankan uninstall.ps1 -DryRun -Yes dari fake project, capture stdout + exit code.
    - Assert keyword di output + exit code.

  Tests TIDAK menjalankan delete sungguhan (selalu -DryRun) untuk safety.
#>

BeforeAll {
    # ---- Resolve repo root (kit folder yang berisi uninstall.ps1) ----
    $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
    $script:UninstallScript = Join-Path $script:KitRepoRoot 'uninstall.ps1'
    $script:SigningLib = Join-Path $script:KitRepoRoot 'lib\manifest-signing.ps1'
    $script:SafetyLib = Join-Path $script:KitRepoRoot 'lib\safety.ps1'

    if (-not (Test-Path $script:UninstallScript)) {
        throw "uninstall.ps1 not found at $script:UninstallScript - tests assume layout tests/ sibling to uninstall.ps1"
    }

    # ---- Helper: build fake project (root + .claude-kit + files) ----
    function script:New-FakeProject {
        param(
            [Parameter(Mandatory)][string]$Root,
            [switch]$NoManifest,
            [switch]$SkipAgents,
            [switch]$IncludeMissingEntry,
            [switch]$IncludeModifiedEntry,
            [string]$KitVersion = '1.0.0'
        )

        # Bersihkan kalau ada sisa run sebelumnya
        if (Test-Path -LiteralPath $Root) {
            Remove-Item -Recurse -Force -LiteralPath $Root -ErrorAction SilentlyContinue
        }
        $null = New-Item -ItemType Directory -Path $Root -Force
        $kitDir = Join-Path $Root '.claude-kit'
        $kitLib = Join-Path $kitDir 'lib'
        $null = New-Item -ItemType Directory -Path $kitDir -Force
        $null = New-Item -ItemType Directory -Path $kitLib -Force

        # Copy script + lib supaya dot-source di uninstall.ps1 bisa nemu file-nya
        Copy-Item -LiteralPath $script:UninstallScript -Destination (Join-Path $kitDir 'uninstall.ps1') -Force
        Copy-Item -LiteralPath $script:SafetyLib -Destination (Join-Path $kitLib 'safety.ps1') -Force
        Copy-Item -LiteralPath $script:SigningLib -Destination (Join-Path $kitLib 'manifest-signing.ps1') -Force

        # ---- Tulis file project yang akan ditrack manifest ----
        $docsDir = Join-Path $Root 'docs'
        $null = New-Item -ItemType Directory -Path $docsDir -Force

        # PRISTINE candidate
        $pristineRel = 'docs/README.md'
        $pristineFull = Join-Path $Root 'docs\README.md'
        $pristineContent = "# Pristine test`nhash should match`n"
        [System.IO.File]::WriteAllText($pristineFull, $pristineContent, (New-Object System.Text.UTF8Encoding $false))
        $pristineHash = (Get-FileHash -LiteralPath $pristineFull -Algorithm SHA256).Hash

        $files = @()
        $files += [ordered]@{ path = $pristineRel; kind = 'file'; sha256 = $pristineHash }

        # AGENTS.md (default skipped during uninstall)
        if (-not $SkipAgents) {
            $agentsFull = Join-Path $Root 'AGENTS.md'
            $agentsContent = "# AGENTS`n"
            [System.IO.File]::WriteAllText($agentsFull, $agentsContent, (New-Object System.Text.UTF8Encoding $false))
            $agentsHash = (Get-FileHash -LiteralPath $agentsFull -Algorithm SHA256).Hash
            $files += [ordered]@{ path = 'AGENTS.md'; kind = 'file'; sha256 = $agentsHash }
        }

        # MODIFIED candidate (hash mismatch - file di-edit setelah "install")
        if ($IncludeModifiedEntry) {
            $modFull = Join-Path $Root 'docs\edited.md'
            [System.IO.File]::WriteAllText($modFull, "ORIGINAL", (New-Object System.Text.UTF8Encoding $false))
            $origHash = (Get-FileHash -LiteralPath $modFull -Algorithm SHA256).Hash
            # Sekarang ubah isi -> hash on disk beda dari yang tercatat di manifest
            [System.IO.File]::WriteAllText($modFull, "EDITED BY USER", (New-Object System.Text.UTF8Encoding $false))
            $files += [ordered]@{ path = 'docs/edited.md'; kind = 'file'; sha256 = $origHash }
        }

        # MISSING candidate (entry ada di manifest tapi file tidak pernah di-create di disk)
        if ($IncludeMissingEntry) {
            $files += [ordered]@{
                path = 'docs/gone.md'
                kind = 'file'
                sha256 = 'a' * 64
            }
        }

        $dirsTracked = @('docs')

        if (-not $NoManifest) {
            $manifest = [ordered]@{
                schema_version      = 1
                kit_version         = $KitVersion
                installed_at        = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')
                installed_by        = '<USER>'
                project_name        = (Split-Path -Leaf $Root)
                project_root        = '<PROJECT_ROOT>'   # uninstall.ps1 treats this as "match anything"
                metadata            = [ordered]@{
                    kit_version  = $KitVersion
                    installed_at = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')
                    installer    = 'setup-pola-b.ps1'
                }
                files               = $files
                directories_created = $dirsTracked
            }

            # HMAC sign manifest (dot-source signing lib sekali di scope helper)
            . $script:SigningLib
            try {
                $sig = New-ManifestSignature -Manifest $manifest -KitVersion $KitVersion
                $manifest.metadata.signature = $sig
            } catch {
                # Kalau signing gagal, tetap tulis (uninstall.ps1 akan treat sebagai unsigned,
                # tests pakai -Yes untuk bypass prompt unsigned).
                Write-Verbose "Signing skipped (treated as unsigned): $($_.Exception.Message)"
            }

            $json = $manifest | ConvertTo-Json -Depth 10
            $manifestPath = Join-Path $kitDir '.install-manifest.json'
            [System.IO.File]::WriteAllText($manifestPath, $json, (New-Object System.Text.UTF8Encoding $false))
        }

        return [pscustomobject]@{
            Root        = $Root
            KitDir      = $kitDir
            Uninstall   = (Join-Path $kitDir 'uninstall.ps1')
            Manifest    = (Join-Path $kitDir '.install-manifest.json')
        }
    }

    # ---- Helper: run uninstall.ps1 in fresh powershell, capture stdout + exit ----
    function script:Invoke-Uninstall {
        param(
            [Parameter(Mandatory)][string]$ScriptPath,
            [string[]]$ScriptArgs = @()
        )
        $pwshExe = (Get-Process -Id $PID).Path
        if (-not $pwshExe) { $pwshExe = 'powershell.exe' }
        $allArgs = @('-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', $ScriptPath) + $ScriptArgs
        # Capture stdout+stderr ke string, jangan throw walau exit != 0
        $output = & $pwshExe @allArgs 2>&1 | Out-String
        return [pscustomobject]@{
            Output   = $output
            ExitCode = $LASTEXITCODE
        }
    }
}

Describe "uninstall.ps1 DryRun mode" {
    BeforeAll {
        $script:FakeRoot1 = Join-Path $env:TEMP ("lintasAI-uninstall-test-dryrun-{0}" -f ([guid]::NewGuid().ToString('N').Substring(0,8)))
        $script:Fake1 = script:New-FakeProject -Root $script:FakeRoot1 `
            -IncludeMissingEntry -IncludeModifiedEntry
    }

    AfterAll {
        if (Test-Path -LiteralPath $script:FakeRoot1) {
            Remove-Item -Recurse -Force -LiteralPath $script:FakeRoot1 -ErrorAction SilentlyContinue
        }
    }

    It "Exit 0 untuk fresh install" {
        $result = script:Invoke-Uninstall -ScriptPath $script:Fake1.Uninstall -ScriptArgs @('-DryRun', '-Yes')
        $result.ExitCode | Should -Be 0
    }

    It "Classification per file shown" {
        $result = script:Invoke-Uninstall -ScriptPath $script:Fake1.Uninstall -ScriptArgs @('-DryRun', '-Yes')
        # Output harus berisi setidaknya satu dari label classification.
        # Test PRISTINE (file hash-match) + MODIFIED (kita craft) + MISSING (entry tanpa file).
        $result.Output | Should -Match '\[PRISTINE\]'
        $result.Output | Should -Match '\[MODIFIED\]'
        $result.Output | Should -Match '\[MISSING\]'
    }

    It "AGENTS.md skipped by default" {
        $result = script:Invoke-Uninstall -ScriptPath $script:Fake1.Uninstall -ScriptArgs @('-DryRun', '-Yes')
        # uninstall.ps1 string: "AGENTS.md skipped (pakai -DeleteAgents untuk override)"
        # Bisa muncul di section [SKIPPED] atau di REASSURANCE FIRST block.
        $result.Output | Should -Match 'AGENTS\.md'
        $result.Output | Should -Match '(?i)(skip|skipped|TETAP ADA|DeleteAgents)'
    }
}

Describe "uninstall.ps1 manifest verification" {
    BeforeAll {
        $script:FakeRoot2 = Join-Path $env:TEMP ("lintasAI-uninstall-test-nomanifest-{0}" -f ([guid]::NewGuid().ToString('N').Substring(0,8)))
        # Build project structure TANPA manifest -- uninstall harus abort.
        $script:Fake2 = script:New-FakeProject -Root $script:FakeRoot2 -NoManifest
    }

    AfterAll {
        if (Test-Path -LiteralPath $script:FakeRoot2) {
            Remove-Item -Recurse -Force -LiteralPath $script:FakeRoot2 -ErrorAction SilentlyContinue
        }
    }

    It "Should handle no-manifest gracefully" {
        # uninstall.ps1 dengan manifest gone: print "STOP: Tidak bisa lanjut karena file pencatat install hilang."
        # lalu exit 1. Test: exit code non-zero + output mengandung STOP / hilang / manifest.
        $result = script:Invoke-Uninstall -ScriptPath $script:Fake2.Uninstall -ScriptArgs @('-DryRun', '-Yes')
        $result.ExitCode | Should -Not -Be 0
        $result.Output | Should -Match '(?i)(STOP|manifest|catatan|hilang|abort)'
    }
}

Describe "uninstall.ps1 -AllowModified flag" {
    It "Should accept -AllowModified parameter" {
        # Verifikasi via AST: parse script + cari ParameterAst dengan nama 'AllowModified'.
        # Tidak panggil script (cukup static check) supaya test cepat & deterministic.
        $tokens = $null
        $errors = $null
        $ast = [System.Management.Automation.Language.Parser]::ParseFile(
            $script:UninstallScript, [ref]$tokens, [ref]$errors
        )
        $errors | Should -BeNullOrEmpty -Because 'uninstall.ps1 must parse cleanly'

        $params = $ast.FindAll({
                param($node)
                $node -is [System.Management.Automation.Language.ParameterAst]
            }, $true)
        $paramNames = $params | ForEach-Object { $_.Name.VariablePath.UserPath }
        $paramNames | Should -Contain 'AllowModified'
    }

    It "Should not break -DryRun when -AllowModified is set" {
        # Sanity: jalankan dengan -AllowModified -DryRun, exit 0 (preview saja).
        $rootMod = Join-Path $env:TEMP ("lintasAI-uninstall-test-allowmod-{0}" -f ([guid]::NewGuid().ToString('N').Substring(0,8)))
        try {
            $fakeMod = script:New-FakeProject -Root $rootMod -IncludeModifiedEntry
            $result = script:Invoke-Uninstall -ScriptPath $fakeMod.Uninstall `
                -ScriptArgs @('-DryRun', '-Yes', '-AllowModified')
            $result.ExitCode | Should -Be 0
            $result.Output | Should -Match '(?i)AllowModified'
        } finally {
            if (Test-Path -LiteralPath $rootMod) {
                Remove-Item -Recurse -Force -LiteralPath $rootMod -ErrorAction SilentlyContinue
            }
        }
    }
}
