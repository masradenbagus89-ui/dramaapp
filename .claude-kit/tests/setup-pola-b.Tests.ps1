#Requires -Module Pester

<#
.SYNOPSIS
  Pester 5+ tests untuk setup-pola-b.ps1 (ProjectRoot resolution + npx mode copy).

.DESCRIPTION
  Empat invocation branches yang di-test:
    1. No -ProjectRoot, kit at <tmp>/.claude-kit/setup-pola-b.ps1
       -> project = parent of kit (traditional Pola B mode).
    2. -ProjectRoot supplied (valid path)
       -> project = that explicit path (no derivation).
    3. -ProjectRoot non-existent path
       -> script errors out clearly (not silent fail). Resolve-Path -ErrorAction Stop
          melempar terminating error; test assert exit code non-zero.
    4. -ProjectRoot supplied + kit at npm-cache-like path (TEMP\nodemod-test\@ojokesusu\lintasai)
       -> npx mode auto-detect, kit di-COPY ke $ProjectRoot/.claude-kit/.

  Plus:
    5. Manifest sanity: setelah setup sukses, .install-manifest.json terbuat.

  Strategi:
    - Real kit (parent dari folder tests/) jadi source-of-truth file.
    - Per-test fake project root di $env:TEMP dengan layout sesuai branch.
    - Branch 1, 2, 4, 5: pakai -Force -SkipTeamFiles untuk skip prompt + faster run.
    - Branch 3: pakai path yang sengaja tidak ada, assert exit != 0 + pesan error.
    - Test memanggil script di child PowerShell -NoProfile -NonInteractive supaya
      env caller tidak ke-pollute (Set-StrictMode di lib/manifest.ps1 dll).
#>

BeforeAll {
    # ---- Resolve repo root (kit folder asli, parent dari tests/) ----
    $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
    $script:SetupScript = Join-Path $script:KitRepoRoot 'setup-pola-b.ps1'

    # ---- Canonical TEMP (long form) ----
    # $env:TEMP sering return 8.3 short path (mis. C:\Users\ADMINI~1\AppData\Local\Temp\2).
    # Setup script pakai $PSScriptRoot (long form) untuk derive ProjectRoot di traditional
    # mode, dan Resolve-Path tidak expand 8.3 -> long. Akibatnya: output script pakai long
    # form, regex test pakai short form -> tidak match. Pakai (Get-Item).FullName supaya
    # canonical long form di semua test path.
    $script:TempCanonical = (Get-Item -LiteralPath $env:TEMP).FullName

    if (-not (Test-Path $script:SetupScript)) {
        throw "setup-pola-b.ps1 not found at $script:SetupScript - tests assume layout tests/ sibling to setup-pola-b.ps1"
    }

    # ---- Helper: copy kit asli ke target folder (jadi .claude-kit di fake project) ----
    function script:Copy-RealKit {
        param(
            [Parameter(Mandatory)][string]$Destination
        )
        if (-not (Test-Path -LiteralPath $Destination)) {
            $null = New-Item -ItemType Directory -Path $Destination -Force
        }
        # Copy semua isi kit kecuali subfolder yang bisa bikin loop/lambat (kalau ada)
        Get-ChildItem -Path $script:KitRepoRoot -Force | Where-Object {
            $_.Name -notin @('.git', 'node_modules')
        } | ForEach-Object {
            $dest = Join-Path $Destination $_.Name
            if ($_.PSIsContainer) {
                Copy-Item -LiteralPath $_.FullName -Destination $dest -Recurse -Force
            } else {
                Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
            }
        }
    }

    # ---- Helper: bikin file dummy supaya proyek "tidak hampir kosong" ----
    # setup-pola-b.ps1 skip docs/ skeleton kalau project root hampir kosong (heuristic
    # menghitung non-hidden file/dir). Test branch 1/2/4/5 mau real flow, jadi taruh
    # 2 file dummy supaya nonHiddenFiles.Count > 1.
    function script:Add-ProjectContent {
        param([Parameter(Mandatory)][string]$Root)
        [System.IO.File]::WriteAllText(
            (Join-Path $Root 'README.md'),
            "# Test Project`nDummy content untuk lewatin proyek-hampir-kosong heuristic.`n",
            (New-Object System.Text.UTF8Encoding $false)
        )
        [System.IO.File]::WriteAllText(
            (Join-Path $Root 'package.json'),
            '{"name":"test","version":"0.0.1"}',
            (New-Object System.Text.UTF8Encoding $false)
        )
    }

    # ---- Helper: run setup-pola-b.ps1 di child PowerShell, capture stdout + exit ----
    function script:Invoke-Setup {
        param(
            [Parameter(Mandatory)][string]$ScriptPath,
            [string[]]$ScriptArgs = @()
        )
        $pwshExe = (Get-Process -Id $PID).Path
        if (-not $pwshExe) { $pwshExe = 'powershell.exe' }
        $allArgs = @('-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', $ScriptPath) + $ScriptArgs
        # Tangkap stdout + stderr ke FILE TERPISAH (bukan '2>&1 | Out-String' inline).
        # Di Windows PowerShell 5.1, '2>&1' pada native exe (child powershell.exe) membungkus
        # stderr jadi RemoteException yang MELEMPAR di parent -> false-fail walau script child
        # sudah benar (exit non-zero + pesan jelas). Redirect ke file menghindari jebakan itu;
        # portable ke PowerShell 7 (CI). Lihat juga reproduksi manual di CHANGELOG v1.10.2.
        $outFile = Join-Path ([System.IO.Path]::GetTempPath()) ("lx-setup-out-{0}.txt" -f ([guid]::NewGuid().ToString('N')))
        $errFile = Join-Path ([System.IO.Path]::GetTempPath()) ("lx-setup-err-{0}.txt" -f ([guid]::NewGuid().ToString('N')))
        $prevEAP = $ErrorActionPreference
        try {
            $ErrorActionPreference = 'Continue'  # native stderr tidak boleh jadi terminating di scope ini
            & $pwshExe @allArgs 1> $outFile 2> $errFile
            $exit = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $prevEAP
        }
        $stdout = Get-Content -LiteralPath $outFile -Raw -ErrorAction SilentlyContinue
        $stderr = Get-Content -LiteralPath $errFile -Raw -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $outFile, $errFile -Force -ErrorAction SilentlyContinue
        return [pscustomobject]@{
            Output   = "$stdout`n$stderr"
            ExitCode = $exit
        }
    }

    # ---- Helper: cleanup folder kalau ada ----
    function script:Remove-TestRoot {
        param([Parameter(Mandatory)][string]$Path)
        if (Test-Path -LiteralPath $Path) {
            Remove-Item -Recurse -Force -LiteralPath $Path -ErrorAction SilentlyContinue
        }
    }
}

Describe "setup-pola-b.ps1 Branch 1: traditional invocation (no -ProjectRoot)" {
    BeforeAll {
        # Layout: <tmp>/<project>/.claude-kit/setup-pola-b.ps1
        $script:Root1 = Join-Path $script:TempCanonical ("lintasAI-setup-test-traditional-{0}" -f ([guid]::NewGuid().ToString('N').Substring(0,8)))
        $null = New-Item -ItemType Directory -Path $script:Root1 -Force
        script:Add-ProjectContent -Root $script:Root1
        $script:Kit1 = Join-Path $script:Root1 '.claude-kit'
        script:Copy-RealKit -Destination $script:Kit1
        $script:SetupInKit1 = Join-Path $script:Kit1 'setup-pola-b.ps1'
    }

    AfterAll {
        script:Remove-TestRoot -Path $script:Root1
    }

    It "Resolves project root = parent of kit folder" {
        $result = script:Invoke-Setup -ScriptPath $script:SetupInKit1 -ScriptArgs @('-Force', '-SkipTeamFiles')
        $result.ExitCode | Should -Be 0
        # Output harus mention root proyek sesuai $Root1.
        $result.Output | Should -Match ([regex]::Escape($script:Root1))
        # AGENTS.md harus dideploy di project root.
        (Test-Path -LiteralPath (Join-Path $script:Root1 'AGENTS.md')) | Should -BeTrue
    }

    It "Does NOT print npx mode banner" {
        # Traditional mode: tidak boleh ada string "[npx] Mode" karena ProjectRoot tidak di-pass.
        # Re-run dengan -DryRun supaya tidak duplicate setup di same root.
        $result = script:Invoke-Setup -ScriptPath $script:SetupInKit1 -ScriptArgs @('-Force', '-SkipTeamFiles', '-DryRun')
        $result.Output | Should -Not -Match '\[npx\] Mode'
    }
}

Describe "setup-pola-b.ps1 Branch 2: -ProjectRoot supplied (valid path)" {
    BeforeAll {
        # Layout: <tmp>/<project>/.claude-kit/setup-pola-b.ps1 (kit lives standard place)
        # but we ALSO pass -ProjectRoot explicitly to exercise the npx-mode code path
        # bahkan kalau path-nya same. Script harus treat sebagai npx mode.
        $script:Root2 = Join-Path $script:TempCanonical ("lintasAI-setup-test-explicitroot-{0}" -f ([guid]::NewGuid().ToString('N').Substring(0,8)))
        $null = New-Item -ItemType Directory -Path $script:Root2 -Force
        script:Add-ProjectContent -Root $script:Root2
        $script:Kit2 = Join-Path $script:Root2 '.claude-kit'
        script:Copy-RealKit -Destination $script:Kit2
        $script:SetupInKit2 = Join-Path $script:Kit2 'setup-pola-b.ps1'
    }

    AfterAll {
        script:Remove-TestRoot -Path $script:Root2
    }

    It "Uses the explicit ProjectRoot path (no derivation)" {
        $result = script:Invoke-Setup -ScriptPath $script:SetupInKit2 -ScriptArgs @(
            '-Force', '-SkipTeamFiles', '-ProjectRoot', $script:Root2
        )
        $result.ExitCode | Should -Be 0
        # Banner npx mode harus muncul (proves the branch executed).
        $result.Output | Should -Match '\[npx\] Mode: explicit ProjectRoot'
        # AGENTS.md harus ada di explicit root.
        (Test-Path -LiteralPath (Join-Path $script:Root2 'AGENTS.md')) | Should -BeTrue
    }
}

Describe "setup-pola-b.ps1 Branch 3: -ProjectRoot non-existent path" {
    BeforeAll {
        # Kit lives di TEMP/<kit-folder>/.claude-kit dengan parent project legit, tapi
        # we pass -ProjectRoot ke path yang tidak ada -> Resolve-Path -ErrorAction Stop
        # harus throw -> exit code non-zero, with clear error message (not silent).
        $script:Root3 = Join-Path $script:TempCanonical ("lintasAI-setup-test-badroot-{0}" -f ([guid]::NewGuid().ToString('N').Substring(0,8)))
        $null = New-Item -ItemType Directory -Path $script:Root3 -Force
        script:Add-ProjectContent -Root $script:Root3
        $script:Kit3 = Join-Path $script:Root3 '.claude-kit'
        script:Copy-RealKit -Destination $script:Kit3
        $script:SetupInKit3 = Join-Path $script:Kit3 'setup-pola-b.ps1'
        # Path yang DIJAMIN tidak ada
        $script:BadRoot = Join-Path $script:TempCanonical ("lintasAI-DOES-NOT-EXIST-{0}" -f ([guid]::NewGuid().ToString('N').Substring(0,8)))
    }

    AfterAll {
        script:Remove-TestRoot -Path $script:Root3
        script:Remove-TestRoot -Path $script:BadRoot   # defensive (script harusnya tidak create)
    }

    It "Errors out (non-zero exit) with clear message" {
        $result = script:Invoke-Setup -ScriptPath $script:SetupInKit3 -ScriptArgs @(
            '-Force', '-SkipTeamFiles', '-ProjectRoot', $script:BadRoot
        )
        $result.ExitCode | Should -Not -Be 0
        # Pesan harus include "Resolve-Path" / "not exist" / nama path yang tidak valid -
        # apa pun yang membuktikan ini BUKAN silent fail.
        # Resolve-Path throws "Cannot find path '...' because it does not exist."
        $result.Output | Should -Match '(?i)(cannot find path|does not exist|not exist|tidak ditemukan|tidak ada)'
    }

    It "Does NOT create .claude-kit at the bogus path" {
        # Script tidak boleh men-create folder di path yang tidak ada (defensive guard).
        (Test-Path -LiteralPath $script:BadRoot) | Should -BeFalse
    }
}

Describe "setup-pola-b.ps1 Branch 4: -ProjectRoot + kit at npm-cache-like path" {
    BeforeAll {
        # Layout simulasi npx:
        #   <tmp>\nodemod-test\@ojokesusu\lintasai\setup-pola-b.ps1   (kit di npm cache)
        #   <tmp>\<project-root>\                                     (target project, beda parent)
        # Script harus detect mismatch ($KitDir tidak dalam $ProjectRoot/.claude-kit/)
        # dan COPY isi kit ke $ProjectRoot/.claude-kit/.
        $script:Root4 = Join-Path $script:TempCanonical ("lintasAI-setup-test-npx-{0}" -f ([guid]::NewGuid().ToString('N').Substring(0,8)))
        $null = New-Item -ItemType Directory -Path $script:Root4 -Force
        script:Add-ProjectContent -Root $script:Root4

        # Kit DIPASANG di npm-cache-like location (BUKAN di $script:Root4/.claude-kit)
        $script:NpmCacheRoot = Join-Path $script:TempCanonical ("nodemod-test-{0}" -f ([guid]::NewGuid().ToString('N').Substring(0,8)))
        $script:KitInNpmCache = Join-Path $script:NpmCacheRoot '@ojokesusu\lintasai'
        $null = New-Item -ItemType Directory -Path $script:KitInNpmCache -Force
        script:Copy-RealKit -Destination $script:KitInNpmCache
        $script:SetupInNpmCache = Join-Path $script:KitInNpmCache 'setup-pola-b.ps1'
    }

    AfterAll {
        script:Remove-TestRoot -Path $script:Root4
        script:Remove-TestRoot -Path $script:NpmCacheRoot
    }

    It "Detects npx mode and copies kit to <ProjectRoot>/.claude-kit/" {
        # Pre-assert: target .claude-kit tidak ada sebelum jalan.
        $targetKit = Join-Path $script:Root4 '.claude-kit'
        (Test-Path -LiteralPath $targetKit) | Should -BeFalse

        $result = script:Invoke-Setup -ScriptPath $script:SetupInNpmCache -ScriptArgs @(
            '-Force', '-SkipTeamFiles', '-ProjectRoot', $script:Root4
        )
        $result.ExitCode | Should -Be 0
        # Verifikasi log npx mode + copy
        $result.Output | Should -Match '\[npx\] Mode: explicit ProjectRoot'
        $result.Output | Should -Match '(?i)\[npx\] Copy kit'

        # Hasil: .claude-kit di project root harus ada, berisi setup-pola-b.ps1 yang ke-copy
        (Test-Path -LiteralPath $targetKit) | Should -BeTrue
        (Test-Path -LiteralPath (Join-Path $targetKit 'setup-pola-b.ps1')) | Should -BeTrue
        (Test-Path -LiteralPath (Join-Path $targetKit 'CHANGELOG.md')) | Should -BeTrue
        (Test-Path -LiteralPath (Join-Path $targetKit 'lib\manifest.ps1')) | Should -BeTrue
    }
}

Describe "setup-pola-b.ps1 manifest creation" {
    BeforeAll {
        # Reuse pattern Branch 1 (traditional) - setelah setup sukses, manifest harus
        # terbuat di .claude-kit/.install-manifest.json. Pakai fresh root supaya hash
        # & state-nya independent dari describe lain.
        $script:Root5 = Join-Path $script:TempCanonical ("lintasAI-setup-test-manifest-{0}" -f ([guid]::NewGuid().ToString('N').Substring(0,8)))
        $null = New-Item -ItemType Directory -Path $script:Root5 -Force
        script:Add-ProjectContent -Root $script:Root5
        $script:Kit5 = Join-Path $script:Root5 '.claude-kit'
        script:Copy-RealKit -Destination $script:Kit5
        $script:SetupInKit5 = Join-Path $script:Kit5 'setup-pola-b.ps1'
    }

    AfterAll {
        script:Remove-TestRoot -Path $script:Root5
    }

    It "Creates .install-manifest.json after successful setup" {
        $result = script:Invoke-Setup -ScriptPath $script:SetupInKit5 -ScriptArgs @('-Force', '-SkipTeamFiles')
        $result.ExitCode | Should -Be 0
        $manifestPath = Join-Path $script:Kit5 '.install-manifest.json'
        (Test-Path -LiteralPath $manifestPath) | Should -BeTrue
    }

    It "Manifest is valid JSON with expected top-level fields" {
        $manifestPath = Join-Path $script:Kit5 '.install-manifest.json'
        (Test-Path -LiteralPath $manifestPath) | Should -BeTrue
        $json = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8
        { $json | ConvertFrom-Json -ErrorAction Stop } | Should -Not -Throw
        $obj = $json | ConvertFrom-Json
        $obj.PSObject.Properties.Name | Should -Contain 'schema_version'
        $obj.PSObject.Properties.Name | Should -Contain 'files'
    }
}

Describe "setup-pola-b.ps1 backup-leak prevention (v1.13.2 regression)" {
    # Regresi bug v1.13.2: .gitignore akar proyek dulu CUMA punya pola FOLDER
    # '.claude-kit.backup-*/' -> file backup tingkat-akar (AGENTS.md.backup-<ts>,
    # CLAUDE.md.backup-<ts>, *.bak) TIDAK ter-ignore -> bocor ke repo tim saat staff
    # `git add .`. Fix: tambah pola FILE '*.backup-*', '*.bak', '*.bak.*' ke .gitignore
    # akar (setup-pola-b.ps1 ~baris 981-991). Tes ini jalankan setup nyata dgn AGENTS.md
    # existing supaya backup-replace bikin AGENTS.md.backup-<ts>, lalu buktikan ter-ignore.
    BeforeAll {
        $script:Root6 = Join-Path $script:TempCanonical ("lintasAI-setup-test-bakleak-{0}" -f ([guid]::NewGuid().ToString('N').Substring(0,8)))
        $null = New-Item -ItemType Directory -Path $script:Root6 -Force
        script:Add-ProjectContent -Root $script:Root6
        # AGENTS.md existing (custom staff) supaya -Force memicu backup-replace -> backup di akar.
        [System.IO.File]::WriteAllText(
            (Join-Path $script:Root6 'AGENTS.md'),
            "# Custom AGENTS.md milik staff`nIsi lama yang akan dicadangkan saat setup -Force.`n",
            (New-Object System.Text.UTF8Encoding $false)
        )
        $script:Kit6 = Join-Path $script:Root6 '.claude-kit'
        script:Copy-RealKit -Destination $script:Kit6
        $script:SetupInKit6 = Join-Path $script:Kit6 'setup-pola-b.ps1'
        $script:SetupResult6 = script:Invoke-Setup -ScriptPath $script:SetupInKit6 -ScriptArgs @('-Force', '-SkipTeamFiles')
    }

    AfterAll {
        script:Remove-TestRoot -Path $script:Root6
    }

    It "Setup berhasil (exit 0)" {
        $script:SetupResult6.ExitCode | Should -Be 0
    }

    It "Project-root .gitignore meng-ignore file backup, bukan cuma folder backup" {
        $gitignore = Join-Path $script:Root6 '.gitignore'
        (Test-Path -LiteralPath $gitignore) | Should -BeTrue
        $content = Get-Content -LiteralPath $gitignore -Raw -Encoding UTF8
        # Pola FOLDER lama tetap ada.
        $content | Should -Match ([regex]::Escape('.claude-kit.backup-*/'))
        # Pola FILE baru (inti fix v1.13.2).
        $content | Should -Match ([regex]::Escape('*.backup-*'))
        $content | Should -Match ([regex]::Escape('*.bak'))
    }

    It "Membuat AGENTS.md.backup-<ts> di akar (file yang dulu bocor)" {
        $backups = Get-ChildItem -LiteralPath $script:Root6 -Filter 'AGENTS.md.backup-*' -File -ErrorAction SilentlyContinue
        @($backups).Count | Should -BeGreaterThan 0
    }

    It "git check-ignore membuktikan AGENTS.md.backup-<ts> sekarang ter-ignore (end-to-end)" {
        $git = Get-Command git -ErrorAction SilentlyContinue
        if (-not $git) { Set-ItResult -Skipped -Because 'git tidak tersedia di runner'; return }
        $backup = Get-ChildItem -LiteralPath $script:Root6 -Filter 'AGENTS.md.backup-*' -File -ErrorAction SilentlyContinue | Select-Object -First 1
        $backup | Should -Not -BeNullOrEmpty
        Push-Location $script:Root6
        try {
            & git init -q 2>$null | Out-Null
            & git check-ignore $backup.Name 2>$null | Out-Null
            # exit 0 = path DI-ignore; exit 1 = tidak ter-ignore (bocor).
            $LASTEXITCODE | Should -Be 0
        } finally {
            Pop-Location
            Remove-Item -LiteralPath (Join-Path $script:Root6 '.git') -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Describe "setup-pola-b.ps1 roster skeleton (v1.13.3 fix)" {
    # Bug v1.13.3: roster dulu hardcode email palsu 'replace-with-owner-email@example.com'
    # (bukan git config user.email asli) -> health-check seksi 7.6 false-alarm di sesi pertama;
    # + roster merujuk aturan AGENTS.md "Staff Scope" yang tidak pernah ada (yatim).
    # Cek source-level (deterministik, tidak tergantung env git runner).
    BeforeAll { $script:SetupSrc = Get-Content -LiteralPath $script:SetupScript -Raw -Encoding UTF8 }

    It "Isi email roster dari git config user.email (bukan cuma placeholder hardcoded)" {
        $script:SetupSrc | Should -Match 'config user\.email'
        $script:SetupSrc | Should -Match "Replace\('__OWNER_EMAIL__'"
    }

    It "Tidak lagi merujuk aturan 'Staff Scope' yang tidak ada di AGENTS.md.template (anti-yatim)" {
        $script:SetupSrc | Should -Not -Match 'AGENTS\.md "Staff Scope"'
    }
}

Describe "setup-pola-b.ps1 non-interactive safety (regresi v1.26.1 - installer hang)" {
    # AKAR BUG: saat AI/CI menjalankan installer, stdin = PIPA TERBUKA tanpa data
    # (bukan EOF, bukan -NonInteractive). Read-Host MEMBLOKIR selamanya (tidak melempar),
    # jadi try/catch fallback tak pernah kena -> installer menggantung. Tes ini mengunci
    # penjaga (Test-LintasInteractiveInput + [Console]::IsInputRedirected) supaya regresi
    # ini ketahuan otomatis. CATATAN: Invoke-Setup (helper di atas) pakai -NonInteractive
    # yang justru MENUTUPI bug ini (Read-Host melempar, bukan menggantung) -> maka tes
    # perilaku di bawah sengaja TANPA -NonInteractive + stdin pipa-terbuka beneran.
    BeforeAll {
        $script:LibPopupSrc = Get-Content -LiteralPath (Join-Path $script:KitRepoRoot 'lib\popup-helpers.ps1') -Raw -Encoding UTF8
        $script:LauncherSrc = Get-Content -LiteralPath (Join-Path $script:KitRepoRoot 'bin\lintasai.js') -Raw -Encoding UTF8
        $t = $null; $e = $null
        $script:SetupAstNI = [System.Management.Automation.Language.Parser]::ParseFile(
            $script:SetupScript, [ref]$t, [ref]$e)
        ($e | Where-Object { $_.IncompleteInput -eq $false }) | Should -BeNullOrEmpty
    }

    It "Penjaga Test-LintasInteractiveInput ada + pakai [Console]::IsInputRedirected" {
        $script:LibPopupSrc | Should -Match 'function\s+Test-LintasInteractiveInput'
        $script:LibPopupSrc | Should -Match 'IsInputRedirected'
        $script:LibPopupSrc | Should -Match 'LINTASAI_NONINTERACTIVE'
    }

    It "setup-pola-b.ps1 memakai penjaga non-interaktif untuk memaksa console mode" {
        $script:SetupSrc2 = Get-Content -LiteralPath $script:SetupScript -Raw -Encoding UTF8
        $script:SetupSrc2 | Should -Match 'Test-LintasInteractiveInput'
        $script:SetupSrc2 | Should -Match '__lintasAI_NonInteractive'
    }

    It "SETIAP Read-Host di setup-pola-b.ps1 dijaga oleh cek non-interaktif (anti-hang)" {
        $readHosts = $script:SetupAstNI.FindAll({
                param($n)
                ($n -is [System.Management.Automation.Language.CommandAst]) -and
                ($n.GetCommandName() -eq 'Read-Host')
            }, $true)
        $readHosts.Count | Should -BeGreaterThan 0 -Because "sanity: installer memang punya prompt interaktif"

        $ungated = @()
        foreach ($rh in $readHosts) {
            $node = $rh
            $gated = $false
            while ($null -ne $node.Parent) {
                $node = $node.Parent
                if ($node -is [System.Management.Automation.Language.IfStatementAst]) {
                    foreach ($clause in $node.Clauses) {
                        if ($clause.Item1.Extent.Text -match '__lintasAI_NonInteractive') {
                            $gated = $true
                            break
                        }
                    }
                }
                if ($gated) { break }
            }
            if (-not $gated) {
                $ungated += ("Read-Host baris {0}: {1}" -f $rh.Extent.StartLineNumber, $rh.Extent.Text)
            }
        }
        $ungated | Should -BeNullOrEmpty -Because "Read-Host tanpa penjaga non-interaktif MENGGANTUNG saat stdin pipa-terbuka"
    }

    It "bin/lintasai.js mengirim sinyal non-interaktif saat stdin bukan keyboard (bukan TTY)" {
        $script:LauncherSrc | Should -Match 'isTTY'
        $script:LauncherSrc | Should -Match 'LINTASAI_NONINTERACTIVE'
        $script:LauncherSrc | Should -Match '-NonInteractive'
    }

    It "Ada escape-hatch LINTASAI_INTERACTIVE di launcher + helper (human Git Bash bisa opt-in prompt)" {
        $script:LauncherSrc | Should -Match 'LINTASAI_INTERACTIVE'
        $script:LibPopupSrc | Should -Match 'LINTASAI_INTERACTIVE'
    }

    It "manifest.ps1 baca manifest sebelumnya pakai -LiteralPath (anti glob-bracket path)" {
        $m = Get-Content -LiteralPath (Join-Path $script:KitRepoRoot 'lib\manifest.ps1') -Raw -Encoding UTF8
        $m | Should -Match 'Test-Path -LiteralPath \$manifestPath'
        $m | Should -Match 'Get-Content -LiteralPath \$manifestPath'
    }

    It "Tidak menggantung saat stdin = pipa terbuka TANPA -NonInteractive (reproduksi bug asli)" {
        $root = Join-Path $script:TempCanonical ("lintasAI-nonint-pipe-{0}" -f ([guid]::NewGuid().ToString('N').Substring(0, 8)))
        $null = New-Item -ItemType Directory -Path $root -Force
        try {
            script:Add-ProjectContent -Root $root
            $kit = Join-Path $root '.claude-kit'
            script:Copy-RealKit -Destination $kit
            $setup = Join-Path $kit 'setup-pola-b.ps1'

            $pwshExe = (Get-Process -Id $PID).Path
            if (-not $pwshExe) { $pwshExe = 'powershell.exe' }

            $psi = New-Object System.Diagnostics.ProcessStartInfo
            $psi.FileName = $pwshExe
            # SENGAJA tanpa -NonInteractive (itu menutupi bug). -SkipTeamFiles batasi
            # cakupan; TANPA -Force supaya prompt opsional (Nama/URL repo) benar-benar
            # terpanggil -> tanpa penjaga, di sinilah Read-Host menggantung.
            $psi.Arguments = ('-NoProfile -ExecutionPolicy Bypass -File "{0}" -ProjectRoot "{1}" -SkipTeamFiles' -f $setup, $root)
            $psi.RedirectStandardInput = $true
            $psi.RedirectStandardOutput = $true
            $psi.RedirectStandardError = $true
            $psi.UseShellExecute = $false
            $psi.CreateNoWindow = $true

            $proc = [System.Diagnostics.Process]::Start($psi)
            # JANGAN tutup / tulis StandardInput -> simulasi pipa terbuka kosong (kasus AI).
            # Drain output async supaya child tidak blok karena buffer pipe penuh.
            $null = $proc.StandardOutput.ReadToEndAsync()
            $null = $proc.StandardError.ReadToEndAsync()
            $exited = $proc.WaitForExit(60000)   # fix bikin selesai cepat; 60 detik = margin lebar
            if (-not $exited) {
                try { $proc.Kill() } catch { Write-Verbose "Kill gagal (proses mungkin sudah berhenti): $_" }
                try { $proc.WaitForExit(5000) } catch { Write-Verbose "WaitForExit pasca-Kill gagal: $_" }
            }
            $exited | Should -BeTrue -Because "stdin pipa-terbuka TIDAK boleh bikin Read-Host menggantung; penjaga IsInputRedirected harus melewati prompt + pakai default aman"
        } finally {
            script:Remove-TestRoot -Path $root
        }
    }
}

Describe "Fitur kerja-kelompok (team-setup) v1.27.0" {
    BeforeAll {
        $script:KkPath = Join-Path $script:KitRepoRoot 'templates\KERJA_KELOMPOK.md'
        $script:TeamSetupPath = Join-Path $script:KitRepoRoot 'team-setup.ps1'
        $script:LauncherSrc2 = Get-Content -LiteralPath (Join-Path $script:KitRepoRoot 'bin\lintasai.js') -Raw -Encoding UTF8
        $script:SetupSrc3 = Get-Content -LiteralPath $script:SetupScript -Raw -Encoding UTF8
        $script:Psd1Src = Get-Content -LiteralPath (Join-Path $script:KitRepoRoot 'lib\kit-files.psd1') -Raw -Encoding UTF8
    }

    It "templates/KERJA_KELOMPOK.md ada + memuat langkah kunci main + peringatan CODEOWNERS != clone" {
        Test-Path -LiteralPath $script:KkPath | Should -BeTrue
        $kk = Get-Content -LiteralPath $script:KkPath -Raw -Encoding UTF8
        $kk | Should -Match 'Require a pull request'
        $kk | Should -Match 'CODEOWNERS'
        $kk | Should -Match 'BUKAN'   # penegasan CODEOWNERS != izin clone
    }

    It "team-setup.ps1 ada, terima -ProjectRoot, dan TANPA Read-Host (anti-hang)" {
        Test-Path -LiteralPath $script:TeamSetupPath | Should -BeTrue
        $t = $null; $e = $null
        $ast = [System.Management.Automation.Language.Parser]::ParseFile($script:TeamSetupPath, [ref]$t, [ref]$e)
        ($e | Where-Object { $_.IncompleteInput -eq $false }) | Should -BeNullOrEmpty -Because "team-setup.ps1 harus valid PowerShell"
        $paramNames = $ast.ParamBlock.Parameters | ForEach-Object { $_.Name.VariablePath.UserPath }
        $paramNames | Should -Contain 'ProjectRoot'
        $readHosts = $ast.FindAll({
                param($n)
                ($n -is [System.Management.Automation.Language.CommandAst]) -and ($n.GetCommandName() -eq 'Read-Host')
            }, $true)
        $readHosts.Count | Should -Be 0 -Because "team-setup dijalankan otomatis; tidak boleh ada Read-Host yang bisa menggantung"
    }

    It "team-setup.ps1 + KERJA_KELOMPOK.md terdaftar di kit-files.psd1 (integritas)" {
        $script:Psd1Src | Should -Match "team-setup\.ps1"
        $script:Psd1Src | Should -Match "templates/KERJA_KELOMPOK\.md"
    }

    It "bin/lintasai.js mendaftarkan perintah team-setup + kirim -ProjectRoot" {
        $script:LauncherSrc2 | Should -Match '"team-setup"\s*:\s*"team-setup\.ps1"'
        $script:LauncherSrc2 | Should -Match 'shouldPassProjectRoot[^\n]*team-setup'
    }

    It "setup-pola-b.ps1 ikut memasang KERJA_KELOMPOK.md saat Team Mode" {
        # Source pakai 1 backslash (templates\KERJA_KELOMPOK.md). Regex \\ = cocok 1 backslash.
        $script:SetupSrc3 | Should -Match "templates\\KERJA_KELOMPOK\.md"
    }

    It "Repo lintasAI ini di-dogfood: .github/CODEOWNERS + PR template ada" {
        Test-Path -LiteralPath (Join-Path $script:KitRepoRoot '.github\CODEOWNERS') | Should -BeTrue
        Test-Path -LiteralPath (Join-Path $script:KitRepoRoot '.github\pull_request_template.md') | Should -BeTrue
    }

    It "Template CODEOWNERS mengajarkan pola ANTI-BOTTLENECK (multi-owner / team)" {
        $co = Get-Content -LiteralPath (Join-Path $script:KitRepoRoot 'templates\github\CODEOWNERS.template') -Raw -Encoding UTF8
        $co | Should -Match 'ANTI-BOTTLENECK'
        $co | Should -Match 'any-of-N'
        $co | Should -Match 'TEAM'
    }
}

Describe "Standar pesan commit dual-audience (v1.28.0)" {
    It "CLAUDE_universal_v1.md section 11 punya standar pesan commit jelas untuk non-programmer" {
        $cu = Get-Content -LiteralPath (Join-Path $script:KitRepoRoot 'CLAUDE_universal_v1.md') -Raw -Encoding UTF8
        $cu | Should -Match 'Pesan commit'
        $cu | Should -Match 'Conventional Commits'
        $cu | Should -Match 'non-programmer pun paham'
    }
}

Describe "Mode Co-Pilot Berpagar (v1.32.0, section 4.12)" {
    BeforeAll {
        $script:cuCopilot = Get-Content -LiteralPath (Join-Path $script:KitRepoRoot 'CLAUDE_universal_v1.md') -Raw -Encoding UTF8
    }

    It "Punya aturan section 4.12 'Mode Co-Pilot Berpagar'" {
        $script:cuCopilot | Should -Match '## 4\.12\. Mode Co-Pilot Berpagar'
    }

    It "OPT-IN + DEFAULT MATI (aman untuk non-programmer)" {
        $script:cuCopilot | Should -Match 'OPT-IN'
        $script:cuCopilot | Should -Match 'DEFAULT MATI'
    }

    It "Git (commit/push/PR/merge) BERPAGAR = bukan otomatis" {
        $script:cuCopilot | Should -Match 'commit / push / buka PR / merge'
        $script:cuCopilot | Should -Match 'BUKAN otomatis'
    }

    It "Bug-LOGIKA + aksi merusak tetap berpagar (tak bisa dimatikan)" {
        $script:cuCopilot | Should -Match 'bug-LOGIKA'
        $script:cuCopilot | Should -Match 'konfirmasi verbatim'
    }

    It "Dirujuk di section 15 (daftar opt-in)" {
        $script:cuCopilot | Should -Match 'Mode Co-Pilot Berpagar \(otomatis untuk yang aman'
    }
}

Describe "Doktrin Efisiensi 4 disiplin operasional (v1.38.0, section 6.3)" {
    BeforeAll {
        $script:cuEff = Get-Content -LiteralPath (Join-Path $script:KitRepoRoot 'CLAUDE_universal_v1.md') -Raw -Encoding UTF8
    }

    It "Section 6.3 memuat blok '4 disiplin operasional'" {
        $script:cuEff | Should -Match '4 disiplin operasional'
    }
    It "Disiplin 1: gelombang kecil saat fan-out besar" {
        $script:cuEff | Should -Match 'Gelombang kecil saat fan-out besar'
    }
    It "Disiplin 2: uji bagian paling berisiko dulu" {
        $script:cuEff | Should -Match 'Uji bagian PALING BERISIKO dulu'
    }
    It "Disiplin 3: prediksi hasil sebelum mengedit" {
        $script:cuEff | Should -Match 'Prediksi hasil SEBELUM mengedit'
    }
    It "Disiplin 4: pastikan alat benar-benar jalan" {
        $script:cuEff | Should -Match 'Pastikan alat BENAR-BENAR jalan'
    }
}
