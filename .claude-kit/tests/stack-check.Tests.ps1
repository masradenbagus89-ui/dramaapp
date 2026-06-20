#Requires -Module Pester

<#
.SYNOPSIS
  Tes untuk lib/stack-check.ps1 (robot pemeriksa mutu kode per-bahasa).

.DESCRIPTION
  Memastikan robot: (A) memetakan stack -> alat-cek yang benar (python/go/node/rust/php);
  (B) CONFIG-GATED: alat dilewati kalau config-nya tak ada (anti alarm-palsu) + dilewati kalau alat
  belum terpasang (BUKAN dianggap "bersih"); (C) klasifikasi hasil-jalan benar (exit 0 -> bersih,
  exit !=0 -> PENTING, timeout -> PENTING) + robot TAK PERNAH GENTING; (D) runner menangkap kode-keluar
  alat nyata (pakai `git` yang dijamin ada di repo + CI); (E) GERBANG: repo kit ASLI 0 GENTING (kit
  punya package.json tapi tanpa tsconfig/eslint/lockfile -> alat node ter-gate-off -> bersih).
  Tes ini TIDAK mengandalkan go/python/rust/php terpasang (pakai SIMULASI -NoRun + alat sintetik).
#>

BeforeAll {
    $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
    # Dot-source: InvocationName '.' -> auto-run di-skip, cuma definisikan fungsi.
    . (Join-Path $script:KitRepoRoot 'lib/stack-check.ps1')

    function New-LintasTempDir {
        $d = Join-Path ([System.IO.Path]::GetTempPath()) ("stackchk-{0}" -f ([guid]::NewGuid().ToString('N')))
        New-Item -ItemType Directory -Force -Path $d | Out-Null
        return $d
    }
    function New-LintasTempFile {
        param([string]$Dir, [string]$Name, [string]$Body = 'x')
        $enc = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText((Join-Path $Dir $Name), $Body, $enc)
    }
}

Describe 'stack-check: spesifikasi alat per bahasa' {
    It 'python -> ruff + mypy + bandit' {
        $tools = @(Get-LintasStackToolSpec -Stack 'python' | ForEach-Object { $_.Tool })
        $tools | Should -Contain 'ruff'
        $tools | Should -Contain 'mypy'
        $tools | Should -Contain 'bandit'
    }
    It 'go -> go vet + staticcheck + govulncheck' {
        $tools = @(Get-LintasStackToolSpec -Stack 'go' | ForEach-Object { $_.Tool })
        $tools | Should -Contain 'go'
        $tools | Should -Contain 'staticcheck'
        $tools | Should -Contain 'govulncheck'
    }
    It 'node -> tsc + eslint + npm' {
        $tools = @(Get-LintasStackToolSpec -Stack 'node' | ForEach-Object { $_.Tool })
        $tools | Should -Contain 'tsc'
        $tools | Should -Contain 'eslint'
        $tools | Should -Contain 'npm'
    }
    It 'rust -> cargo (clippy + fmt)' {
        $specs = @(Get-LintasStackToolSpec -Stack 'rust')
        @($specs | Where-Object { $_.Tool -eq 'cargo' }).Count | Should -Be 2
    }
    It 'php -> phpstan + pint' {
        $tools = @(Get-LintasStackToolSpec -Stack 'php' | ForEach-Object { $_.Tool })
        $tools | Should -Contain 'phpstan'
        $tools | Should -Contain 'pint'
    }
    It 'stack tak dikenal -> kosong' {
        @(Get-LintasStackToolSpec -Stack 'cobol').Count | Should -Be 0
    }
    It 'tiap alat punya argumen mode-CEK (tak ada --fix yang menulis)' {
        foreach ($s in 'node', 'python', 'go', 'rust', 'php') {
            foreach ($spec in (Get-LintasStackToolSpec -Stack $s)) {
                ($spec.Args -join ' ') | Should -Not -Match '(?<!--no-)--fix'
            }
        }
    }
}

Describe 'stack-check: config-gate (anti alarm-palsu) + cek alat' {
    It 'config tak ada -> skip-not-configured' {
        $dir = New-LintasTempDir
        try {
            $spec = @(Get-LintasStackToolSpec -Stack 'python')[0]   # ruff
            Get-LintasStackApplicability -Root $dir -Spec $spec | Should -Be 'skip-not-configured'
        } finally { Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue }
    }
    It 'config ADA tapi alat tak terpasang -> skip-missing-tool' {
        $dir = New-LintasTempDir
        try {
            New-LintasTempFile -Dir $dir -Name 'go.mod' -Body 'module x'
            $spec = [pscustomobject]@{ Tool = 'alat-yang-pasti-tak-ada-xyz123'; Args = @(); Lang = 'go'; RequiresAny = @('go.mod') }
            Get-LintasStackApplicability -Root $dir -Spec $spec | Should -Be 'skip-missing-tool'
        } finally { Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue }
    }
    It 'Test-LintasStackConfigured: true kalau salah satu RequiresAny ada' {
        $dir = New-LintasTempDir
        try {
            New-LintasTempFile -Dir $dir -Name 'requirements.txt' -Body 'flask'
            $spec = @(Get-LintasStackToolSpec -Stack 'python' | Where-Object { $_.Tool -eq 'ruff' })[0]
            Test-LintasStackConfigured -Root $dir -Spec $spec | Should -BeTrue
        } finally { Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue }
    }
}

Describe 'stack-check: klasifikasi hasil-jalan (murni) - tak pernah GENTING' {
    It 'exit 0 -> 0 temuan' {
        $rr = [pscustomobject]@{ Ran = $true; TimedOut = $false; ExitCode = 0; Output = ''; Spec = [pscustomobject]@{ Tool = 'go'; Lang = 'go' } }
        @(Get-LintasStackFinding -RunResult $rr).Count | Should -Be 0
    }
    It 'exit !=0 -> 1 PENTING TOOL_FINDINGS (bukan GENTING)' {
        $rr = [pscustomobject]@{ Ran = $true; TimedOut = $false; ExitCode = 1; Output = 'lint: error di baris 9'; Spec = [pscustomobject]@{ Tool = 'ruff'; Lang = 'python' } }
        $f = @(Get-LintasStackFinding -RunResult $rr)
        $f.Count | Should -Be 1
        $f[0].Tingkat | Should -Be 'PENTING'
        $f[0].Kode | Should -Be 'TOOL_FINDINGS'
    }
    It 'timeout -> 1 PENTING TOOL_TIMEOUT' {
        $rr = [pscustomobject]@{ Ran = $true; TimedOut = $true; ExitCode = $null; Output = ''; Spec = [pscustomobject]@{ Tool = 'mypy'; Lang = 'python' } }
        $f = @(Get-LintasStackFinding -RunResult $rr)
        $f[0].Kode | Should -Be 'TOOL_TIMEOUT'
    }
    It 'tak jalan (alat absen) -> 0 temuan (caller yang catat sbg dilewati)' {
        $rr = [pscustomobject]@{ Ran = $false; TimedOut = $false; ExitCode = $null; Output = ''; Spec = [pscustomobject]@{ Tool = 'x'; Lang = 'x' } }
        @(Get-LintasStackFinding -RunResult $rr).Count | Should -Be 0
    }
}

Describe 'stack-check: runner menangkap kode-keluar alat nyata (git)' {
    It 'kode-keluar 0 + keluaran tertangkap (git --version)' -Skip:(-not (Get-Command git -ErrorAction SilentlyContinue)) {
        $spec = [pscustomobject]@{ Tool = 'git'; Args = @('--version'); Lang = 'tool' }
        $res = Invoke-LintasStackTool -Root $script:KitRepoRoot -Spec $spec
        $res.Ran | Should -BeTrue
        $res.ExitCode | Should -Be 0
        $res.Output | Should -Match 'git version'
    }
    It 'kode-keluar !=0 dari perintah yang gagal (ref tak ada)' -Skip:(-not (Get-Command git -ErrorAction SilentlyContinue)) {
        $spec = [pscustomobject]@{ Tool = 'git'; Args = @('rev-parse', '--verify', 'refs/heads/__tak_ada_branch_xyz__'); Lang = 'tool' }
        $res = Invoke-LintasStackTool -Root $script:KitRepoRoot -Spec $spec
        $res.Ran | Should -BeTrue
        $res.ExitCode | Should -BeOfType [int]
        $res.ExitCode | Should -BeGreaterThan 0
    }
    It 'alat absen -> Ran=false (bukan crash)' {
        $spec = [pscustomobject]@{ Tool = 'alat-tak-ada-xyz123'; Args = @(); Lang = 'x' }
        (Invoke-LintasStackTool -Root $script:KitRepoRoot -Spec $spec).Ran | Should -BeFalse
    }
}

Describe 'stack-check: orkestrasi SIMULASI (-NoRun) tanpa butuh toolchain' {
    It 'project go (SIMULASI): laporkan alat go akan dijalankan, 0 GENTING, tak eksekusi' {
        $dir = New-LintasTempDir
        try {
            New-LintasTempFile -Dir $dir -Name 'go.mod' -Body 'module x'
            $res = Invoke-LintasStackCheck -RepoRoot $dir -Stack 'go' -NoRun -Quiet
            $res.Stack | Should -Be 'go'
            $res.Genting | Should -Be 0
            @($res.Ran).Count | Should -BeGreaterThan 0
            ($res.Ran -join ' ') | Should -Match 'SIMULASI'
        } finally { Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue }
    }
    It 'project kosong (python tak terkonfigurasi): semua alat dilewati, 0 temuan' {
        $dir = New-LintasTempDir
        try {
            $res = Invoke-LintasStackCheck -RepoRoot $dir -Stack 'python' -Quiet
            $res.Count | Should -Be 0
            @($res.SkippedNotConfigured).Count | Should -BeGreaterThan 0
        } finally { Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue }
    }
}

Describe 'stack-check: GERBANG repo kit ASLI 0 GENTING' {
    # Repo kit punya package.json TAPI tanpa tsconfig/eslint/lockfile -> alat node ter-gate-off.
    # Gerbang: WAJIB 0 GENTING (robot memang tak pernah GENTING; ini jaring kalau perilaku berubah).
    It 'robot pada repo kit: 0 GENTING + tidak crash' {
        $res = Invoke-LintasStackCheck -RepoRoot $script:KitRepoRoot -Quiet
        $res.Genting | Should -Be 0
    }
}
