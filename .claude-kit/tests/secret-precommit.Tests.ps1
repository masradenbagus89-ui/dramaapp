# tests/secret-precommit.Tests.ps1
# Guard: pre-commit secret guard (templates/hooks/pre-commit-secret-scan.sh) benar-benar
# MEMBLOKIR rahasia ter-commit (file .env asli + isi mirip kunci), LOLOS file bersih/contoh,
# dan TIDAK PERNAH mencetak NILAI rahasianya. Hook diuji via bash di repo git sementara.
#
# bash di Windows sering TIDAK di PATH walau Git terpasang -> resolusi tangguh: coba PATH,
# lalu turunkan dari lokasi git (<GitRoot>\bin\bash.exe). Supaya tes JALAN (bukan skip) di
# laptop maintainer DAN di CI windows-latest.

# --- Discovery-time: resolve bash (dipakai -Skip + run phase) ---
function Resolve-LintasBashExe {
    $b = (Get-Command bash -ErrorAction SilentlyContinue).Source
    if ($b) { return $b }
    $git = (Get-Command git -ErrorAction SilentlyContinue).Source
    if ($git) {
        $gitRoot = Split-Path -Parent (Split-Path -Parent $git)
        foreach ($c in @((Join-Path $gitRoot 'bin\bash.exe'), (Join-Path $gitRoot 'usr\bin\bash.exe'))) {
            if (Test-Path $c) { return $c }
        }
    }
    return $null
}
$script:HasBash = [bool](Resolve-LintasBashExe)

BeforeAll {
    $script:RepoRoot  = Split-Path -Parent $PSScriptRoot
    $script:Hook      = Join-Path $script:RepoRoot 'templates\hooks\pre-commit-secret-scan.sh'
    $script:Installer = Join-Path $script:RepoRoot 'templates\hooks\install-secret-hook.ps1'
    # Resolusi bash (inline; fungsi top-level discovery tidak terbawa ke fase run Pester 5).
    $script:Bash = (Get-Command bash -ErrorAction SilentlyContinue).Source
    if (-not $script:Bash) {
        $gitExe = (Get-Command git -ErrorAction SilentlyContinue).Source
        if ($gitExe) {
            $gitRoot = Split-Path -Parent (Split-Path -Parent $gitExe)
            foreach ($c in @((Join-Path $gitRoot 'bin\bash.exe'), (Join-Path $gitRoot 'usr\bin\bash.exe'))) {
                if (Test-Path $c) { $script:Bash = $c; break }
            }
        }
    }

    function script:ConvertTo-BashPath([string]$p) {
        $p = $p -replace '\\', '/'
        if ($p -match '^([A-Za-z]):/(.*)$') { return '/' + $Matches[1].ToLower() + '/' + $Matches[2] }
        return $p
    }
    function script:New-TempRepo {
        $d = Join-Path ([System.IO.Path]::GetTempPath()) ('lintasai-sec-' + [System.IO.Path]::GetRandomFileName())
        New-Item -ItemType Directory -Path $d -Force | Out-Null
        & git -C $d init -q 2>$null | Out-Null
        return $d
    }
    function script:Stage([string]$repo) { & git -C $repo add -A 2>$null | Out-Null }
    function script:Invoke-Hook([string]$repo) {
        $br = script:ConvertTo-BashPath $repo
        $bh = script:ConvertTo-BashPath $script:Hook
        $out = & $script:Bash -c "cd '$br' && bash '$bh'" 2>&1
        return [PSCustomObject]@{ Exit = $LASTEXITCODE; Out = ($out | Out-String) }
    }
}

Describe "pre-commit secret guard (hook)" -Skip:(-not $script:HasBash) {

    It "berkas hook ada" {
        Test-Path $script:Hook | Should -BeTrue
    }

    It "TOLAK .env asli yang di-stage (exit 1) + TIDAK bocorkan nilai" {
        $repo = script:New-TempRepo
        try {
            Set-Content (Join-Path $repo '.env') -Value 'API_KEY=supersecretvalue12345' -Encoding UTF8
            script:Stage $repo
            $r = script:Invoke-Hook $repo
            $r.Exit | Should -Be 1
            $r.Out  | Should -Match '\.env'
            $r.Out  | Should -Not -Match 'supersecretvalue12345'
        } finally { Remove-Item $repo -Recurse -Force -ErrorAction SilentlyContinue }
    }

    It "TOLAK isi mirip kunci asli (AKIA...) di file non-env (exit 1) + nama saja" {
        $repo = script:New-TempRepo
        try {
            Set-Content (Join-Path $repo 'config.js') -Value 'const k = "AKIA1234567890ABCDEF";' -Encoding UTF8
            script:Stage $repo
            $r = script:Invoke-Hook $repo
            $r.Exit | Should -Be 1
            $r.Out  | Should -Match 'config\.js'
            $r.Out  | Should -Not -Match 'AKIA1234567890ABCDEF'
        } finally { Remove-Item $repo -Recurse -Force -ErrorAction SilentlyContinue }
    }

    It "LOLOS file bersih + .env.example (placeholder) (exit 0)" {
        $repo = script:New-TempRepo
        try {
            Set-Content (Join-Path $repo 'README.md')   -Value '# proyek bersih, tanpa rahasia' -Encoding UTF8
            Set-Content (Join-Path $repo '.env.example') -Value 'API_KEY=your-key-here' -Encoding UTF8
            script:Stage $repo
            $r = script:Invoke-Hook $repo
            $r.Exit | Should -Be 0
        } finally { Remove-Item $repo -Recurse -Force -ErrorAction SilentlyContinue }
    }

    It "LOLOS saat tidak ada yang di-stage (exit 0)" {
        $repo = script:New-TempRepo
        try {
            $r = script:Invoke-Hook $repo
            $r.Exit | Should -Be 0
        } finally { Remove-Item $repo -Recurse -Force -ErrorAction SilentlyContinue }
    }
}

Describe "install-secret-hook.ps1 (installer)" {
    It "pasang hook ke .git/hooks/pre-commit + idempotent" {
        $repo = & {
            $d = Join-Path ([System.IO.Path]::GetTempPath()) ('lintasai-sec-' + [System.IO.Path]::GetRandomFileName())
            New-Item -ItemType Directory -Path $d -Force | Out-Null
            & git -C $d init -q 2>$null | Out-Null
            $d
        }
        try {
            & $script:Installer -ProjectRoot $repo *>&1 | Out-Null
            $target = Join-Path $repo '.git\hooks\pre-commit'
            Test-Path $target | Should -BeTrue
            (Get-Content $target -Raw) | Should -Match 'lintasAI pre-commit secret guard'
            # Jalankan lagi: idempotent, tetap ada, tak error.
            & $script:Installer -ProjectRoot $repo *>&1 | Out-Null
            Test-Path $target | Should -BeTrue
        } finally { Remove-Item $repo -Recurse -Force -ErrorAction SilentlyContinue }
    }
}
