#Requires -Module Pester

BeforeAll {
    $script:scriptPath = Join-Path $PSScriptRoot '..\update-kit.ps1'
    if (-not (Test-Path $script:scriptPath)) {
        throw "update-kit.ps1 tidak ditemukan di $script:scriptPath"
    }

    # Baca raw content sekali untuk pattern checks.
    $script:scriptContent = Get-Content -Path $script:scriptPath -Raw -Encoding UTF8

    # Parse AST sekali untuk param-block introspection.
    $tokens = $null
    $errors = $null
    $script:scriptAst = [System.Management.Automation.Language.Parser]::ParseFile(
        $script:scriptPath, [ref]$tokens, [ref]$errors
    )

    # Ambil top-level param block (kalau ada).
    $script:paramBlock = $script:scriptAst.ParamBlock
    if (-not $script:paramBlock) {
        # Fallback: cari ParamBlockAst di seluruh AST (script bisa pakai function-level param).
        $script:paramBlock = $script:scriptAst.Find({
            param($node) $node -is [System.Management.Automation.Language.ParamBlockAst]
        }, $true)
    }

    # Helper: cek param name ada di paramBlock.
    # NOTE: function uses singular "ParamExist" to comply with PSUseSingularNouns (no SuppressMessage attribute - PS parser doesn't accept it on function decl).
    function script:Test-ParamExist {
        param([string]$Name)
        if (-not $script:paramBlock) { return $false }
        foreach ($p in $script:paramBlock.Parameters) {
            if ($p.Name.VariablePath.UserPath -ieq $Name) { return $true }
        }
        return $false
    }

    # Ekstrak teks fungsi MURNI dari skrip TANPA menjalankan badan utamanya (git/clone/backup).
    # update-kit.ps1 = skrip dengan main body; dot-source langsung BERBAHAYA. Ambil teks
    # FunctionDefinitionAst-nya saja (definisi fungsi = tidak ada efek samping sampai dipanggil).
    function script:Get-UpdateKitFunctionText {
        param([string]$Name)
        $fn = $script:scriptAst.Find({
            param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $Name
        }, $true)
        if (-not $fn) { throw "Fungsi $Name tidak ditemukan di update-kit.ps1" }
        return $fn.Extent.Text
    }
    $script:srcResolveUpdateTier   = script:Get-UpdateKitFunctionText -Name 'Resolve-UpdateTier'
    $script:srcInvokeBackupCleanup = script:Get-UpdateKitFunctionText -Name 'Invoke-BackupCleanup'
    $script:srcGetChangelogRangeBody = script:Get-UpdateKitFunctionText -Name 'Get-ChangelogRangeBody'
    $script:srcTestTrustedRepo = script:Get-UpdateKitFunctionText -Name 'Test-LintasTrustedRepo'
    $script:srcTestChangelogLabel = script:Get-UpdateKitFunctionText -Name 'Test-LintasChangelogLabel'
}

Describe "Resolve-UpdateTier (klasifikasi tingkat update untuk staff non-programmer)" {
    BeforeAll {
        # Resolve-UpdateTier sekarang memanggil helper single-source Test-LintasChangelogLabel,
        # jadi helper wajib di-load dulu di scope terisolasi ini.
        . ([scriptblock]::Create($script:srcTestChangelogLabel))
        . ([scriptblock]::Create($script:srcResolveUpdateTier))
    }

    It "Whitespace-only -> Tier 1 (patch kecil)" {
        Resolve-UpdateTier -EntryBody "   `n  " | Should -Be 'Tier 1'
    }

    It "Parameter Mandatory menolak string KOSONG di level binding (cabang internal tak terjangkau via '')" {
        { Resolve-UpdateTier -EntryBody '' } | Should -Throw
    }

    It "[SCAN-REQUIRED] di awal baris -> Tier 4" {
        Resolve-UpdateTier -EntryBody '- **[SCAN-REQUIRED]** regenerate docs' | Should -Be 'Tier 4'
    }

    It "[BREAKING] di awal baris -> Tier 3" {
        Resolve-UpdateTier -EntryBody '- **[BREAKING]** hapus API lama' | Should -Be 'Tier 3'
    }

    It "Keyword fitur/aturan baru -> Tier 2" {
        Resolve-UpdateTier -EntryBody 'Sekarang ada fitur baru untuk export PDF' | Should -Be 'Tier 2'
        Resolve-UpdateTier -EntryBody '- tambah aturan AI soal commit' | Should -Be 'Tier 2'
    }

    It "Fix kecil tanpa keyword -> Tier 1 (default)" {
        Resolve-UpdateTier -EntryBody 'perbaiki typo kecil di README' | Should -Be 'Tier 1'
    }

    It "Anti false-positive: [BREAKING] di TENGAH kalimat prosa -> BUKAN Tier 3" {
        Resolve-UpdateTier -EntryBody 'Catatan: tidak ada [BREAKING] changes di rilis ini' | Should -Be 'Tier 1'
    }

    It "Precedence: SCAN-REQUIRED menang atas BREAKING" {
        Resolve-UpdateTier -EntryBody "- **[SCAN-REQUIRED]** scan ulang`n- **[BREAKING]** ubah skema" | Should -Be 'Tier 4'
    }

    # GENTING fix 2026-06-18: label gaya SUB-JUDUL '### [LABEL]' dulu lolos -> tier salah-klasifikasi.
    It "Gaya sub-judul '### [SCAN-REQUIRED]' -> Tier 4 (bukan Tier 1)" {
        Resolve-UpdateTier -EntryBody '### [SCAN-REQUIRED] Diperbaiki' | Should -Be 'Tier 4'
    }

    It "Gaya sub-judul '### [BREAKING]' -> Tier 3 (bukan Tier 1)" {
        Resolve-UpdateTier -EntryBody '### [BREAKING] hapus API lama' | Should -Be 'Tier 3'
    }
}

# GENTING fix 2026-06-18: deteksi label CHANGELOG dipusatkan ke Test-LintasChangelogLabel
# (single-source untuk Resolve-UpdateTier + banner Step 5). Bug akar: regex lama tak kenal
# gaya sub-judul '### [SECURITY]' -> peringatan keamanan hilang diam-diam saat lompat versi.
# Tes ini menjalankan deteksi SUNGGUHAN (perilaku), bukan sekadar cek string ada di file.
Describe "Test-LintasChangelogLabel (deteksi label CHANGELOG - anti peringatan keamanan terlewat)" {
    BeforeAll { . ([scriptblock]::Create($script:srcTestChangelogLabel)) }

    It "REGRESI GENTING: '### [SECURITY] ...' (gaya sub-judul) TERDETEKSI" {
        Test-LintasChangelogLabel -Body '### [SECURITY] Diperbaiki' -Label 'SECURITY' | Should -BeTrue
    }

    It "Gaya butir-list '- **[SECURITY]** ...' terdeteksi" {
        Test-LintasChangelogLabel -Body '- **[SECURITY]** tambal lubang penting' -Label 'SECURITY' | Should -BeTrue
    }

    It "Gaya bold polos '**[SECURITY]**' + label di awal-baris polos terdeteksi" {
        Test-LintasChangelogLabel -Body '**[SECURITY]** penting' -Label 'SECURITY' | Should -BeTrue
        Test-LintasChangelogLabel -Body '[SECURITY] langsung di awal baris' -Label 'SECURITY' | Should -BeTrue
    }

    It "Heading dalam-multibaris (label bukan di baris pertama) tetap terdeteksi" {
        $body = "Ringkasan rilis biasa.`n`n### [SECURITY] Ada tambalan keamanan"
        Test-LintasChangelogLabel -Body $body -Label 'SECURITY' | Should -BeTrue
    }

    It "ANTI false-positive: label di TENGAH prosa TIDAK terdeteksi" {
        Test-LintasChangelogLabel -Body 'Catatan: tidak ada [SECURITY] issue di rilis ini' -Label 'SECURITY' | Should -BeFalse
        Test-LintasChangelogLabel -Body 'lihat catatan [BREAKING] sebelumnya untuk konteks' -Label 'BREAKING' | Should -BeFalse
    }

    It "Body kosong / whitespace -> false (graceful)" {
        Test-LintasChangelogLabel -Body '' -Label 'SECURITY' | Should -BeFalse
        Test-LintasChangelogLabel -Body "   `n  " -Label 'SECURITY' | Should -BeFalse
    }

    It "Label lain (BREAKING / SCAN-REQUIRED) gaya sub-judul juga terdeteksi" {
        Test-LintasChangelogLabel -Body '### [BREAKING] ubah skema' -Label 'BREAKING' | Should -BeTrue
        Test-LintasChangelogLabel -Body '###### [SCAN-REQUIRED] regen docs' -Label 'SCAN-REQUIRED' | Should -BeTrue
    }

    It "Tidak salah-cocok label berbeda (body BREAKING dicari SECURITY -> false)" {
        Test-LintasChangelogLabel -Body '### [BREAKING] ubah skema' -Label 'SECURITY' | Should -BeFalse
    }
}

Describe "Invoke-BackupCleanup (hapus backup lama - DESTRUKTIF, wajib teruji)" {
    BeforeAll { . ([scriptblock]::Create($script:srcInvokeBackupCleanup)) }

    It "Root tidak ada -> return 0 (graceful, tidak throw)" {
        Invoke-BackupCleanup -ProjectRoot (Join-Path $env:TEMP "nope-$(Get-Random)") | Should -Be 0
    }

    It "Tidak ada backup -> return 0" {
        $d = Join-Path $env:TEMP "bc-empty-$(Get-Random)"; New-Item -ItemType Directory -Path $d -Force | Out-Null
        try { Invoke-BackupCleanup -ProjectRoot $d | Should -Be 0 }
        finally { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
    }

    It "Hapus backup lebih tua dari MaxAgeDays" {
        $d = Join-Path $env:TEMP "bc-old-$(Get-Random)"; New-Item -ItemType Directory -Path $d -Force | Out-Null
        try {
            $old = Join-Path $d 'a.md.bak'; Set-Content -LiteralPath $old -Value 'x'
            (Get-Item -LiteralPath $old).LastWriteTime = (Get-Date).AddDays(-60)
            $removed = Invoke-BackupCleanup -ProjectRoot $d -MaxAgeDays 30 -KeepLatest 3
            $removed | Should -Be 1
            Test-Path -LiteralPath $old | Should -BeFalse
        } finally { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
    }

    It "Keep-latest-N per base-name: 5 backup, KeepLatest=3 -> hapus 2 tertua" {
        $d = Join-Path $env:TEMP "bc-keep-$(Get-Random)"; New-Item -ItemType Directory -Path $d -Force | Out-Null
        try {
            for ($i = 0; $i -lt 5; $i++) {
                $f = Join-Path $d ("x.md.backup-2026010{0}-120000" -f $i)
                Set-Content -LiteralPath $f -Value "v$i"
                (Get-Item -LiteralPath $f).LastWriteTime = (Get-Date).AddDays(-1 * $i)  # i=0 terbaru
            }
            $removed = Invoke-BackupCleanup -ProjectRoot $d -MaxAgeDays 9999 -KeepLatest 3
            $removed | Should -Be 2
            (Get-ChildItem -Path $d -Filter '*.backup-*' -File).Count | Should -Be 3
        } finally { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
    }

    It "TIDAK menyentuh file non-backup (cuma *.bak / *.backup-*)" {
        $d = Join-Path $env:TEMP "bc-safe-$(Get-Random)"; New-Item -ItemType Directory -Path $d -Force | Out-Null
        try {
            $normal = Join-Path $d 'normal.md'; Set-Content -LiteralPath $normal -Value 'penting'
            $oldBak = Join-Path $d 'z.md.bak'; Set-Content -LiteralPath $oldBak -Value 'x'
            (Get-Item -LiteralPath $oldBak).LastWriteTime = (Get-Date).AddDays(-60)
            Invoke-BackupCleanup -ProjectRoot $d -MaxAgeDays 30 | Out-Null
            Test-Path -LiteralPath $normal | Should -BeTrue
            (Get-Content -LiteralPath $normal -Raw).Trim() | Should -Be 'penting'
        } finally { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
    }

    It "Rotasi FOLDER cadangan .claude-kit.backup-*: keep latest 3, hapus folder lama (RAPIKAN v1.33.1)" {
        $d = Join-Path $env:TEMP "bc-dirs-$(Get-Random)"; New-Item -ItemType Directory -Path $d -Force | Out-Null
        try {
            for ($i = 0; $i -lt 5; $i++) {
                $sub = Join-Path $d (".claude-kit.backup-2026010{0}-120000" -f $i)
                New-Item -ItemType Directory -Path $sub -Force | Out-Null
                Set-Content -LiteralPath (Join-Path $sub 'x.txt') -Value "v$i"
                (Get-Item -LiteralPath $sub).LastWriteTime = (Get-Date).AddDays(-1 * $i)  # i=0 terbaru
            }
            Invoke-BackupCleanup -ProjectRoot $d -MaxAgeDays 9999 -KeepLatest 3 | Out-Null
            (Get-ChildItem -Path $d -Filter '.claude-kit.backup-*' -Directory).Count | Should -Be 3
        } finally { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
    }
}

Describe "update-kit.ps1 parameter validation" {
    It "Should have -AllowUnsignedTag parameter (via AST)" {
        Test-ParamExist -Name 'AllowUnsignedTag' | Should -BeTrue
    }

    It "Should have -AllowUntrustedRepo parameter (via AST)" {
        Test-ParamExist -Name 'AllowUntrustedRepo' | Should -BeTrue
    }
}

Describe "GPG verify-tag logic" {
    It "Should reference 'describe --exact-match' atau 'ls-remote.*tags' untuk resolve tag name" {
        $hasDescribe = $script:scriptContent -match 'describe --exact-match'
        $hasLsRemote = $script:scriptContent -match 'ls-remote.*tags'
        ($hasDescribe -or $hasLsRemote) | Should -BeTrue
    }

    It "Should call 'verify-tag' (bukan verify-commit)" {
        ($script:scriptContent -match 'verify-tag') | Should -BeTrue
    }

    It "Should NOT use 'verify-commit' (separation: tag signing, bukan commit signing)" {
        ($script:scriptContent -match 'verify-commit') | Should -BeFalse
    }
}

Describe "Version detection" {
    It "Should define Get-LatestChangelogEntry function" {
        $fnAst = $script:scriptAst.Find({
            param($node)
            $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
            $node.Name -ieq 'Get-LatestChangelogEntry'
        }, $true)
        $fnAst | Should -Not -BeNullOrEmpty
    }

    It "Should have version comparison logic (Sudah versi terbaru / sama / equal)" {
        ($script:scriptContent -match 'Sudah versi terbaru|sama|equal') | Should -BeTrue
    }
}

# v1.13.1 - PENTING #1-#4: flow update naik ke standar profesional.
# Tes statik (literal .Contains, bukan regex) supaya tidak rapuh + mengunci tiap fix.
Describe "v1.13.1 FIX #1: pin update ke TAG rilis (bukan branch 'main')" {
    It "git clone pakai -b `$cloneRef (pin tag), bukan -b `$Branch langsung" {
        $script:scriptContent.Contains('git clone --depth 1 -b $cloneRef') | Should -BeTrue
        $script:scriptContent.Contains('git clone --depth 1 -b $Branch ') | Should -BeFalse
    }

    It "`$cloneRef default ke `$Branch lalu pin ke `$latestVersion (tag terbaru)" {
        $script:scriptContent.Contains('$cloneRef = $Branch') | Should -BeTrue
        $script:scriptContent.Contains('$cloneRef = $latestVersion') | Should -BeTrue
    }
}

Describe "v1.13.1 FIX #2: cek kesehatan (doctor) SETELAH update + rollback kalau gagal" {
    It "Menjalankan doctor kit baru pasca-update" {
        $script:scriptContent.Contains('$newKitPs1 doctor') | Should -BeTrue
    }

    # v1.33.1 GENTING FIX: saat doctor ERROR, arahkan pemulihan FOLDER cadangan ($backupDir),
    # BUKAN 'kit.ps1 rollback' (yang hanya restore berkas per-satuan = rasa-aman palsu).
    It "Saat doctor ERROR: arahkan pemulihan FOLDER cadangan (bukan per-file)" {
        $script:scriptContent.Contains('doctorExit -ne 0') | Should -BeTrue
        $script:scriptContent.Contains("Move-Item '`$backupDir' '`$kitDir'") | Should -BeTrue
        $script:scriptContent.Contains('rollback dong') | Should -BeTrue
    }
}

Describe "v1.13.1 FIX #3+#4: UPDATE_KIT_PROMPT (konfirmasi eksplisit + deteksi versi semver)" {
    BeforeAll {
        $script:promptPath = Join-Path $PSScriptRoot '..\UPDATE_KIT_PROMPT_v1.md'
        if (-not (Test-Path $script:promptPath)) { throw "UPDATE_KIT_PROMPT_v1.md tidak ditemukan" }
        $script:promptContent = Get-Content -Path $script:promptPath -Raw -Encoding UTF8
    }

    It "FIX #4: tidak lagi pakai sort ABJAD pada tag; pakai cast [version] (semver)" {
        $script:promptContent.Contains('Sort-Object -Descending | Select-Object -First 1') | Should -BeFalse
        $script:promptContent.Contains('[version]($_ -replace') | Should -BeTrue
    }

    It "FIX #3: diam BUKAN dianggap setuju update (tidak ada 'assume [1] Yes')" {
        $script:promptContent.Contains('assume [1] Yes') | Should -BeFalse
        $script:promptContent.Contains('JANGAN auto-jalan') | Should -BeTrue
    }
}

# v1.33.1 GENTING FIX: `npx lintasai update` -> update-kit.ps1 -ProjectRoot <proj>.
# $kitDir (yang di-backup/diganti) HARUS = <proj>\.claude-kit, BUKAN lokasi script
# ($PSScriptRoot = folder cache npm saat dijalankan via npx). Uji statik + perilaku DryRun.
Describe "v1.33.1 FIX: -ProjectRoot menentukan kit yang di-backup (bukan lokasi script)" {
    It "Statik: kitDir didamaikan dari ProjectRoot saat -ProjectRoot eksplisit" {
        $script:scriptContent.Contains("`$kitDir = Join-Path `$ProjectRoot '.claude-kit'") | Should -BeTrue
        $script:scriptContent.Contains('$projectRootExplicit') | Should -BeTrue
    }

    It "Perilaku (DryRun): backup menyasar <ProjectRoot>\.claude-kit, bukan folder script" {
        $proj = Join-Path $env:TEMP "ukt-target-$(Get-Random)"
        New-Item -ItemType Directory -Path $proj -Force | Out-Null
        try {
            $out = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script:scriptPath -DryRun -ProjectRoot $proj 2>&1 | Out-String
            $expected = Join-Path $proj '.claude-kit'
            $out | Should -Match ([regex]::Escape($expected)) -Because "kit yang di-backup harus di project, output:`n$out"
            $scriptDir = Split-Path -Parent $script:scriptPath
            $out | Should -Not -Match ([regex]::Escape("Akan backup: $scriptDir ")) -Because "JANGAN backup lokasi script (folder cache npm)"
        } finally {
            Remove-Item -Recurse -Force $proj -ErrorAction SilentlyContinue
        }
    }
}

# v1.33.1: label [SECURITY]/[BREAKING] WAJIB terdeteksi di SELURUH rentang versi yang DILEWATI
# (mis. lompat v1.20 -> v1.33), bukan cuma entri teratas - cegah peringatan keamanan versi-tengah terlewat.
Describe "Get-ChangelogRangeBody (pindai label di rentang versi yang dilewati)" {
    BeforeAll { . ([scriptblock]::Create($script:srcGetChangelogRangeBody)) }

    It "label [SECURITY] di versi TENGAH (dilewati) tetap terbawa; versi from (exclusive) TIDAK" {
        $cl = Join-Path $env:TEMP "cl-range-$(Get-Random).md"
        $lines = @(
            '## [1.33.0] - 2026-06-16',
            '- fix kecil biasa',
            '## [1.27.0] - 2026-06-10',
            '- **[SECURITY]** tambal lubang penting',
            '## [1.20.0] - 2026-06-01',
            '- **[SECURITY]** ini versi LAMA jangan ikut'
        )
        Set-Content -LiteralPath $cl -Value $lines -Encoding UTF8
        try {
            $body = Get-ChangelogRangeBody -ChangelogPath $cl -FromVersionExclusive '1.20.0' -ToVersionInclusive '1.33.0'
            $body | Should -Match '\[SECURITY\]'
            $body | Should -Match 'tambal lubang penting'
            $body | Should -Not -Match 'ini versi LAMA'
        } finally { Remove-Item -LiteralPath $cl -Force -ErrorAction SilentlyContinue }
    }

    It "baseline tidak valid (unknown) -> return '' supaya caller fallback ke entri teratas" {
        $cl = Join-Path $env:TEMP "cl-range2-$(Get-Random).md"
        Set-Content -LiteralPath $cl -Value @('## [1.33.0]', '- x') -Encoding UTF8
        try {
            Get-ChangelogRangeBody -ChangelogPath $cl -FromVersionExclusive 'unknown' -ToVersionInclusive '1.33.0' | Should -Be ''
        } finally { Remove-Item -LiteralPath $cl -Force -ErrorAction SilentlyContinue }
    }
}

# v1.33.1 (RAPIKAN): tabel-kebenaran penjaga repo-tepercaya (auto-skip GPG HANYA untuk URL resmi).
# Boundary keamanan: kalau normalisasi URL suatu hari over-match, tes ini berteriak (anti-regresi).
Describe "Test-LintasTrustedRepo (penjaga repo-tepercaya: auto-skip GPG hanya untuk URL resmi)" {
    BeforeAll {
        # Fungsi membaca $TrustedRepos dari scope; sediakan sama persis seperti di update-kit.ps1.
        $script:TrustedRepos = @(
            'https://github.com/ojokesusu/lintasAI.git',
            'https://github.com/ojokesusu/lintasAI',
            'git@github.com:ojokesusu/lintasAI.git'
        )
        . ([scriptblock]::Create($script:srcTestTrustedRepo))
    }

    It "<url> -> trusted=<expected>" -ForEach @(
        @{ url = 'https://github.com/ojokesusu/lintasAI.git';      expected = $true }   # bentuk kanonik
        @{ url = 'https://github.com/ojokesusu/lintasAI';          expected = $true }   # tanpa .git
        @{ url = 'https://github.com/ojokesusu/lintasAI/';         expected = $true }   # trailing slash
        @{ url = 'HTTPS://GitHub.com/ojokesusu/lintasAI.GIT';      expected = $true }   # case-insensitive
        @{ url = 'git@github.com:ojokesusu/lintasAI.git';          expected = $true }   # SSH
        @{ url = 'https://github.com/attacker/lintasAI.git';       expected = $false }  # owner lain
        @{ url = 'https://github.com/ojokesusu/lintasAI-fork.git'; expected = $false }  # repo beda (anti substring)
        @{ url = 'https://evil.com/ojokesusu/lintasAI.git';        expected = $false }  # host beda
    ) {
        Test-LintasTrustedRepo -RepoUrl $url | Should -Be $expected
    }

    It "Mandatory menolak string KOSONG di level binding (guard internal tak terjangkau via '')" {
        { Test-LintasTrustedRepo -RepoUrl '' } | Should -Throw
    }
}

# v1.33.1 (RAPIKAN): wiring perintah check-update (read-only) lintas kit.ps1 + update-kit.ps1 + bin.
Describe "check-update (perintah cek-versi read-only)" {
    BeforeAll {
        $repoRoot = Split-Path -Parent $script:scriptPath
        $script:kitPs1Content = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'kit.ps1')
        $script:binJsContent  = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'bin/lintasai.js')
    }

    It "update-kit.ps1 punya parameter -CheckOnly (AST)" {
        Test-ParamExist -Name 'CheckOnly' | Should -BeTrue
    }

    It "update-kit.ps1 mode CheckOnly berhenti TANPA backup/clone" {
        $script:scriptContent.Contains('if ($CheckOnly)') | Should -BeTrue
        $script:scriptContent.Contains('Mode cek-saja: TIDAK ada perubahan') | Should -BeTrue
    }

    It "kit.ps1 punya subcommand check-update -> delegate ke update-kit.ps1 -CheckOnly" {
        ($script:kitPs1Content -match "ValidateSet\([^\)]*'check-update'") | Should -BeTrue
        ($script:kitPs1Content -match "'check-update'\s*\{") | Should -BeTrue
        $script:kitPs1Content.Contains('-CheckOnly') | Should -BeTrue
    }

    It "bin/lintasai.js memetakan check-update ke kit.ps1" {
        ($script:binJsContent -match '"check-update"\s*:\s*\[\s*"kit\.ps1"\s*,\s*"check-update"\s*\]') | Should -BeTrue
    }
}

# GENTING fix 2026-06-18: jalur-pengaman terpenting (unduhan-gagal + GPG-gagal) DULU hanya
# di-tes string-presence (.Contains) -> regresi fail-open lolos hijau. Tes berikut menjalankan
# update-kit.ps1 SUNGGUHAN (subprocess) di project sementara untuk membuktikan PERILAKU-nya.
Describe "Jalur GAGAL: unduhan (clone) gagal -> kit lama dikembalikan otomatis (perilaku, bukan string-match)" {
    It "Clone gagal (repo tak ada) -> kit lama utuh kembali + exit !=0 + tidak ada folder cadangan tersisa" {
        $proj = Join-Path $env:TEMP "ukt-clonefail-$(Get-Random)"
        $kit  = Join-Path $proj '.claude-kit'
        New-Item -ItemType Directory -Path $kit -Force | Out-Null
        $marker = Join-Path $kit 'KEEPME.txt'
        Set-Content -LiteralPath $marker -Value 'ORIGINAL-KIT-CONTENT' -Encoding UTF8
        # Repo lokal yang DIJAMIN gagal clone (path tak ada). -AllowUntrustedRepo: lolos allowlist
        # non-interaktif. -AllowUnsignedTag: tak akan tercapai (clone gagal lebih dulu). Tanpa manifest
        # -> cek-versi remote dilewati -> langsung backup (Step 1) lalu clone (Step 2) yang gagal.
        $badRepo = Join-Path $env:TEMP "no-such-repo-$(Get-Random).git"
        try {
            # PS 5.1: git menulis "Cloning into..." ke stderr; di bawah ErrorActionPreference=Stop,
            # 2>&1 mempromosikannya jadi error TERMINATING. Setel Continue lokal (sama seperti
            # update-kit.ps1 lakukan untuk git) supaya yang diuji = exit code + isi output, bukan
            # stderr-promotion. Restore di finally.
            $prevEA = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
            try {
                $out = & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $script:scriptPath `
                    -ProjectRoot $proj -RepoUrl $badRepo -AllowUntrustedRepo -AllowUnsignedTag 2>&1 | Out-String
                $exit = $LASTEXITCODE
            } finally { $ErrorActionPreference = $prevEA }
            Test-Path -LiteralPath $marker | Should -BeTrue -Because "kit lama HARUS di-restore otomatis setelah clone gagal. Output:`n$out"
            (Get-Content -LiteralPath $marker -Raw).Trim() | Should -Be 'ORIGINAL-KIT-CONTENT'
            (Get-ChildItem -Path $proj -Filter '.claude-kit.backup-*' -Directory -ErrorAction SilentlyContinue).Count |
                Should -Be 0 -Because "folder cadangan harus dipindah balik (tidak menyisakan orphan)"
            $exit | Should -Not -Be 0 -Because "clone gagal harus exit !=0"
            $out | Should -Match 'ROLLBACK|Backup restored|restore backup'
        } finally {
            Remove-Item -Recurse -Force $proj -ErrorAction SilentlyContinue
            Remove-Item -Recurse -Force $badRepo -ErrorAction SilentlyContinue
        }
    }
}

Describe "Jalur GAGAL: GPG verify-tag gagal (repo non-tepercaya, tag tak bertanda) -> update DIBATALKAN (fail-closed)" {
    It "Tag tanpa tanda-tangan + TANPA -AllowUnsignedTag -> abort + Step setup TIDAK jalan (.git masih ada)" {
        if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
            Set-ItResult -Skipped -Because 'git tidak tersedia di lingkungan tes'
            return
        }
        $srcRepo = Join-Path $env:TEMP "ukt-srcrepo-$(Get-Random)"
        $proj    = Join-Path $env:TEMP "ukt-gpgfail-$(Get-Random)"
        $kit     = Join-Path $proj '.claude-kit'
        try {
            # 1) Source repo lokal: 1 commit + tag v9.9.9 yang TIDAK ditandatangani (verify-tag pasti gagal).
            New-Item -ItemType Directory -Path $srcRepo -Force | Out-Null
            Push-Location $srcRepo
            try {
                & git init -q 2>$null
                & git config user.email 't@t.t' 2>$null
                & git config user.name  'tester' 2>$null
                & git config commit.gpgsign false 2>$null
                & git config tag.gpgsign false 2>$null
                Set-Content -LiteralPath (Join-Path $srcRepo 'README.md') -Value 'src' -Encoding UTF8
                & git add -A 2>$null
                & git commit -q -m 'init' 2>$null
                & git tag -a v9.9.9 -m 'unsigned release' 2>$null
            } finally { Pop-Location }

            # 2) Project sementara dgn manifest versi lama (1.0.0) supaya cek-versi memilih v9.9.9.
            New-Item -ItemType Directory -Path $kit -Force | Out-Null
            $manifest = @{ metadata = @{ kit_version = '1.0.0' }; files = @() } | ConvertTo-Json -Depth 5
            Set-Content -LiteralPath (Join-Path $kit '.install-manifest.json') -Value $manifest -Encoding UTF8

            # 3) Update dari repo non-tepercaya (GPG TIDAK di-skip) TANPA -AllowUnsignedTag -> harus abort.
            # Continue lokal: git/clone menulis ke stderr; cegah promosi jadi error terminating (PS 5.1).
            $prevEA = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
            try {
                $out = & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $script:scriptPath `
                    -ProjectRoot $proj -RepoUrl $srcRepo -AllowUntrustedRepo 2>&1 | Out-String
                $exit = $LASTEXITCODE
            } finally { $ErrorActionPreference = $prevEA }

            $out | Should -Match 'verify-tag' -Because "harus mencapai verifikasi tag. Output:`n$out"
            $out | Should -Match 'Update aborted|dibatalkan|gagal' -Because "GPG gagal harus fail-closed (abort), bukan lanjut diam-diam"
            $exit | Should -Not -Be 0 -Because "fail-closed harus exit !=0"
            # Abort terjadi SEBELUM Step 3 (hapus .git) + Step 4 (setup) -> .git kit hasil clone masih ada.
            Test-Path -LiteralPath (Join-Path $kit '.git') |
                Should -BeTrue -Because "abort sebelum Step 3 -> .git internal belum dihapus = bukti setup TIDAK dijalankan"
        } finally {
            Remove-Item -Recurse -Force $srcRepo -ErrorAction SilentlyContinue
            Remove-Item -Recurse -Force $proj -ErrorAction SilentlyContinue
        }
    }
}
