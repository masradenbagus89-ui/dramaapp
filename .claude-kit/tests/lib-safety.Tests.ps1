#Requires -Module Pester

BeforeAll {
    $libPath = Join-Path $PSScriptRoot '..\lib\safety.ps1'
    . $libPath
    Initialize-SafeProjectPath -ProjectRoot 'C:\test-project'
}

Describe "Resolve-SafeProjectPath" {
    It "Should resolve valid relative path" {
        $result = Resolve-SafeProjectPath -RelativePath 'src/app.ts'
        $result | Should -Not -BeNullOrEmpty
        $result | Should -Match 'C:\\test-project'
    }

    It "Should REJECT absolute path outside project" {
        { Resolve-SafeProjectPath -RelativePath 'C:\Windows\system32' } | Should -Throw
    }

    It "Should REJECT path traversal via ..\" {
        { Resolve-SafeProjectPath -RelativePath '..\..\evil.txt' } | Should -Throw
    }

    It "Should REJECT prefix collision (proj vs proj-evil)" {
        Initialize-SafeProjectPath -ProjectRoot 'C:\proj'
        { Resolve-SafeProjectPath -RelativePath '..\proj-evil\file.txt' } | Should -Throw
    }

    It "Should handle nested valid path" {
        # Re-init: test sebelumnya (prefix collision) ganti root ke C:\proj - reset balik.
        Initialize-SafeProjectPath -ProjectRoot 'C:\test-project'
        $result = Resolve-SafeProjectPath -RelativePath 'src/lib/utils/format.ts'
        $result | Should -Match 'C:\\test-project\\src\\lib\\utils'
    }
}

Describe "Test-PathHasReparsePoint" {
    It "Returns false for regular file" {
        $tempFile = Join-Path $env:TEMP "test-regular-$(Get-Random).txt"
        Set-Content -Path $tempFile -Value "test" -Force
        try {
            Test-PathHasReparsePoint -FullPath $tempFile | Should -BeFalse
        } finally {
            Remove-Item -Force $tempFile -ErrorAction SilentlyContinue
        }
    }

    It "Handles non-existent path gracefully" {
        Test-PathHasReparsePoint -FullPath "C:\does-not-exist-$(Get-Random)" | Should -BeFalse
    }
}

Describe "Get-FileSha256" {
    It "Computes correct sha256" {
        $tempFile = Join-Path $env:TEMP "test-sha-$(Get-Random).txt"
        # Pakai WriteAllBytes raw supaya tidak ada BOM (PS 5.1 Set-Content -Encoding UTF8 nulis BOM).
        # Expected hash "2cf24dba..." = SHA-256 dari ASCII "hello" persis (5 byte).
        [System.IO.File]::WriteAllBytes($tempFile, [System.Text.Encoding]::ASCII.GetBytes("hello"))
        try {
            $hash = Get-FileSha256 -FilePath $tempFile
            $hash | Should -Be "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
        } finally {
            Remove-Item -Force $tempFile -ErrorAction SilentlyContinue
        }
    }
}
