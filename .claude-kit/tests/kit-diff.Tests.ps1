# tests/kit-diff.Tests.ps1
# Guard REL-3 (audit 2026-06-17): kit.ps1 `diff` dulu crash dengan exception .NET mentah
# ("You cannot call a method on a null-valued expression") kalau ada entry manifest dengan
# sha256 = null (mis. file hilang saat manifest dibuat, atau manifest corrupt/di-tamper).
# Fix = guard null sebelum .ToLower() (kit.ps1 Invoke-Diff). Tes ini menjalankan kit.ps1
# di PROSES TERPISAH (bukan dot-source) karena dispatch kit.ps1 memanggil `exit` di tiap
# cabang -> dot-source akan mematikan host tes. Bonus: subprocess pakai powershell.exe =
# runtime asli yang dipakai launcher (bin/lintasai.js spawn powershell.exe).

BeforeAll {
    $script:RepoRoot = Split-Path -Parent $PSScriptRoot
    $script:Kit = Join-Path $script:RepoRoot 'kit.ps1'
    # Prefer Windows PowerShell 5.1 (runtime target asli); fallback ke pwsh kalau tak ada.
    $script:Pwsh = (Get-Command powershell.exe -ErrorAction SilentlyContinue).Source
    if (-not $script:Pwsh) { $script:Pwsh = (Get-Command pwsh -ErrorAction SilentlyContinue).Source }
}

Describe "kit.ps1 diff - tahan manifest dengan sha256 null (REL-3)" {
    BeforeEach {
        $script:proj = Join-Path ([System.IO.Path]::GetTempPath()) ('lintasai-kitdiff-' + [System.IO.Path]::GetRandomFileName())
        New-Item -ItemType Directory -Path (Join-Path $script:proj '.claude-kit') -Force | Out-Null
        # File ADA di disk, tapi entry manifest-nya sha256 = null -> pemicu REL-3.
        Set-Content (Join-Path $script:proj 'AGENTS.md') -Value 'isi apa saja' -Encoding UTF8
        $manifestJson = @'
{
  "schema_version": 1,
  "metadata": { "kit_version": "v0.0.0-test" },
  "files": [
    { "path": "AGENTS.md", "sha256": null }
  ]
}
'@
        Set-Content (Join-Path $script:proj '.claude-kit\.install-manifest.json') -Value $manifestJson -Encoding UTF8
    }
    AfterEach {
        if (Test-Path $script:proj) { Remove-Item $script:proj -Recurse -Force -ErrorAction SilentlyContinue }
    }

    It "ada engine PowerShell utk subprocess" {
        $script:Pwsh | Should -Not -BeNullOrEmpty
    }

    It "tidak crash + tandai file (sha256 null) sebagai modified, exit 0" {
        $out = & $script:Pwsh -NoProfile -ExecutionPolicy Bypass -File $script:Kit diff -ProjectRoot $script:proj 2>&1
        $code = $LASTEXITCODE
        $text = ($out | Out-String)
        $code | Should -Be 0
        $text | Should -Match 'AGENTS\.md'
        # Tak boleh ada exception .NET mentah (bukti regresi REL-3 kembali).
        $text | Should -Not -Match 'null-valued expression'
    }
}
