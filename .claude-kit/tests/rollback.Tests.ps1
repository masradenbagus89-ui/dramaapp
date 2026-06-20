#Requires -Module Pester

BeforeAll {
    $libPath = Join-Path $PSScriptRoot '..\lib\rollback.ps1'
    . $libPath
}

Describe "Test-LintasRollbackPathSafe (penjaga jalur balik-versi: anti path-traversal/escape/reparse)" {

    BeforeAll {
        $script:safeRoot = Join-Path $env:TEMP "rb-pathsafe-$(Get-Random)"
        New-Item -ItemType Directory -Path $script:safeRoot -Force | Out-Null
    }
    AfterAll {
        Remove-Item -Recurse -Force $script:safeRoot -ErrorAction SilentlyContinue
    }

    It "Fungsi ada" {
        Get-Command Test-LintasRollbackPathSafe -ErrorAction SilentlyContinue | Should -Not -BeNullOrEmpty
    }

    It "TERIMA relative path normal di dalam root" {
        Test-LintasRollbackPathSafe -Root $script:safeRoot -RelPath 'docs/file.md' | Should -BeTrue
        Test-LintasRollbackPathSafe -Root $script:safeRoot -RelPath 'AGENTS.md' | Should -BeTrue
    }

    It "TOLAK path kosong / whitespace" {
        Test-LintasRollbackPathSafe -Root $script:safeRoot -RelPath '' | Should -BeFalse
        Test-LintasRollbackPathSafe -Root $script:safeRoot -RelPath '   ' | Should -BeFalse
    }

    It "TOLAK absolute path (drive-letter)" {
        Test-LintasRollbackPathSafe -Root $script:safeRoot -RelPath 'C:\Windows\system32\evil.dll' | Should -BeFalse
    }

    It "TOLAK leading separator + UNC" {
        Test-LintasRollbackPathSafe -Root $script:safeRoot -RelPath '\evil' | Should -BeFalse
        Test-LintasRollbackPathSafe -Root $script:safeRoot -RelPath '/evil' | Should -BeFalse
        Test-LintasRollbackPathSafe -Root $script:safeRoot -RelPath '\\server\share\x' | Should -BeFalse
    }

    It "TOLAK parent-traversal (..) di awal maupun tengah" {
        Test-LintasRollbackPathSafe -Root $script:safeRoot -RelPath '..\..\evil.txt' | Should -BeFalse
        Test-LintasRollbackPathSafe -Root $script:safeRoot -RelPath 'a\..\..\b' | Should -BeFalse
        Test-LintasRollbackPathSafe -Root $script:safeRoot -RelPath '../escape' | Should -BeFalse
    }

    It "TOLAK reparse-point (junction) di jalur - redirect risk" {
        $jParent = Join-Path $script:safeRoot 'jdir'
        $realOutside = Join-Path $env:TEMP "rb-outside-$(Get-Random)"
        New-Item -ItemType Directory -Path $realOutside -Force | Out-Null
        $made = $false
        try {
            New-Item -ItemType Junction -Path $jParent -Target $realOutside -ErrorAction Stop | Out-Null
            $made = $true
        } catch {
            Set-ItResult -Skipped -Because "junction tidak bisa dibuat di lingkungan ini"
        }
        if ($made) {
            try {
                Test-LintasRollbackPathSafe -Root $script:safeRoot -RelPath 'jdir/file.md' | Should -BeFalse
            } finally {
                Remove-Item -Recurse -Force $jParent -ErrorAction SilentlyContinue
                Remove-Item -Recurse -Force $realOutside -ErrorAction SilentlyContinue
            }
        }
    }
}

Describe "rollback.ps1 graceful no-op" {
    It "Invoke-Rollback function exists" {
        Get-Command Invoke-Rollback -ErrorAction SilentlyContinue | Should -Not -BeNullOrEmpty
    }

    It "Get-RollbackPreview function exists" {
        Get-Command Get-RollbackPreview -ErrorAction SilentlyContinue | Should -Not -BeNullOrEmpty
    }

    It "Returns no-manifest status when manifest tidak ada" {
        $tempRoot = Join-Path $env:TEMP "rollback-test-nomanifest-$(Get-Random)"
        New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
        try {
            $result = Invoke-Rollback -ProjectRoot $tempRoot -Force
            $result.status | Should -Be 'no-manifest'
            $result.restored | Should -Be 0
            $result.skipped | Should -Be 0
        } finally {
            Remove-Item -Recurse -Force $tempRoot -ErrorAction SilentlyContinue
        }
    }

    It "Should NOT throw saat no-manifest" {
        $tempRoot = Join-Path $env:TEMP "rollback-test-nothrow-$(Get-Random)"
        New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
        try {
            { Invoke-Rollback -ProjectRoot $tempRoot -Force } | Should -Not -Throw
        } finally {
            Remove-Item -Recurse -Force $tempRoot -ErrorAction SilentlyContinue
        }
    }
}

Describe "Find-ManifestPath multi-location probe" {
    It "Returns null when no manifest" {
        $tempRoot = Join-Path $env:TEMP "find-manifest-null-$(Get-Random)"
        New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
        try {
            $result = Find-ManifestPath -ProjectRoot $tempRoot
            $result | Should -BeNullOrEmpty
        } finally {
            Remove-Item -Recurse -Force $tempRoot -ErrorAction SilentlyContinue
        }
    }

    It "Finds manifest at project root" {
        $tempRoot = Join-Path $env:TEMP "find-manifest-root-$(Get-Random)"
        New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
        try {
            $manifestPath = Join-Path $tempRoot '.install-manifest.json'
            Set-Content -Path $manifestPath -Value '{"files":[]}' -Encoding UTF8 -Force
            $result = Find-ManifestPath -ProjectRoot $tempRoot
            $result | Should -Not -BeNullOrEmpty
            $result | Should -Be $manifestPath
        } finally {
            Remove-Item -Recurse -Force $tempRoot -ErrorAction SilentlyContinue
        }
    }
}

Describe "Find-LatestBackup dual naming convention (v1.5.14 rollback fix)" {
    It "Get-LintasBackupCandidate + Find-LatestBackup functions exist" {
        Get-Command Get-LintasBackupCandidate -ErrorAction SilentlyContinue | Should -Not -BeNullOrEmpty
        Get-Command Find-LatestBackup -ErrorAction SilentlyContinue | Should -Not -BeNullOrEmpty
    }

    It "Menemukan backup deploy bersuffix .backup- (regresi bug rollback no-op)" {
        $root = Join-Path $env:TEMP "rb-deploybak-$(Get-Random)"
        New-Item -ItemType Directory -Path $root -Force | Out-Null
        try {
            $f = Join-Path $root 'AGENTS.md'
            Set-Content -LiteralPath $f -Value 'current' -Encoding UTF8
            Set-Content -LiteralPath (Join-Path $root 'AGENTS.md.backup-20260101-120000') -Value 'old' -Encoding UTF8
            (Split-Path -Leaf (Find-LatestBackup -OriginalPath $f)) | Should -Be 'AGENTS.md.backup-20260101-120000'
        } finally {
            Remove-Item -Recurse -Force $root -ErrorAction SilentlyContinue
        }
    }

    It "Menemukan backup merge-JSON bersuffix .bak." {
        $root = Join-Path $env:TEMP "rb-jsonbak-$(Get-Random)"
        New-Item -ItemType Directory -Path $root -Force | Out-Null
        try {
            $f = Join-Path $root 'settings.local.json'
            Set-Content -LiteralPath $f -Value '{}' -Encoding UTF8
            Set-Content -LiteralPath (Join-Path $root 'settings.local.json.bak.20260101-120000') -Value '{"old":1}' -Encoding UTF8
            (Split-Path -Leaf (Find-LatestBackup -OriginalPath $f)) | Should -Be 'settings.local.json.bak.20260101-120000'
        } finally {
            Remove-Item -Recurse -Force $root -ErrorAction SilentlyContinue
        }
    }

    It "Pilih backup terbaru lintas konvensi (by LastWriteTime)" {
        $root = Join-Path $env:TEMP "rb-newest-$(Get-Random)"
        New-Item -ItemType Directory -Path $root -Force | Out-Null
        try {
            $f = Join-Path $root 'AGENTS.md'
            Set-Content -LiteralPath $f -Value 'current' -Encoding UTF8
            $older = Join-Path $root 'AGENTS.md.backup-20260101-120000'
            Set-Content -LiteralPath $older -Value 'older' -Encoding UTF8
            $newer = Join-Path $root 'AGENTS.md.bak.20251231-120000'
            Set-Content -LiteralPath $newer -Value 'newer' -Encoding UTF8
            (Get-Item $older).LastWriteTime = (Get-Date '2026-01-01 12:00:00')
            (Get-Item $newer).LastWriteTime = (Get-Date '2026-02-01 12:00:00')
            (Split-Path -Leaf (Find-LatestBackup -OriginalPath $f)) | Should -Be 'AGENTS.md.bak.20251231-120000'
        } finally {
            Remove-Item -Recurse -Force $root -ErrorAction SilentlyContinue
        }
    }

    It "Mengecualikan snapshot .malformed.bak." {
        $root = Join-Path $env:TEMP "rb-malformed-$(Get-Random)"
        New-Item -ItemType Directory -Path $root -Force | Out-Null
        try {
            $f = Join-Path $root 'settings.local.json'
            Set-Content -LiteralPath $f -Value '{}' -Encoding UTF8
            $good = Join-Path $root 'settings.local.json.bak.20260101-120000'
            Set-Content -LiteralPath $good -Value 'good' -Encoding UTF8
            $malformed = Join-Path $root 'settings.local.json.malformed.bak.20260301-120000'
            Set-Content -LiteralPath $malformed -Value 'corrupt' -Encoding UTF8
            (Get-Item $good).LastWriteTime = (Get-Date '2026-01-01 12:00:00')
            (Get-Item $malformed).LastWriteTime = (Get-Date '2026-03-01 12:00:00')
            (Split-Path -Leaf (Find-LatestBackup -OriginalPath $f)) | Should -Be 'settings.local.json.bak.20260101-120000'
        } finally {
            Remove-Item -Recurse -Force $root -ErrorAction SilentlyContinue
        }
    }

    It "Return null saat tidak ada backup" {
        $root = Join-Path $env:TEMP "rb-none-$(Get-Random)"
        New-Item -ItemType Directory -Path $root -Force | Out-Null
        try {
            $f = Join-Path $root 'AGENTS.md'
            Set-Content -LiteralPath $f -Value 'current' -Encoding UTF8
            Find-LatestBackup -OriginalPath $f | Should -BeNullOrEmpty
        } finally {
            Remove-Item -Recurse -Force $root -ErrorAction SilentlyContinue
        }
    }
}

Describe "Invoke-Rollback re-sign manifest (perbaikan tanda-tangan basi)" {
    BeforeAll {
        # Pakai secret tetap supaya tanda-tangan dibuat di test + diverifikasi/dibuat-ulang
        # di dalam Invoke-Rollback memakai kunci yang SAMA -> deterministik.
        $script:savedSecret = $env:LINTASAI_MANIFEST_SECRET
        $env:LINTASAI_MANIFEST_SECRET = 'rollback-resign-test-secret-0001'
        . (Join-Path $PSScriptRoot '..\lib\manifest-signing.ps1')
    }
    AfterAll {
        $env:LINTASAI_MANIFEST_SECRET = $script:savedSecret
    }

    It "Setelah rollback, manifest bertanda-tangan ditandatangani ULANG (tetap 'verified') + rollback KEDUA tidak ditolak" {
        $root = Join-Path $env:TEMP "rb-resign-$(Get-Random)"
        New-Item -ItemType Directory -Path $root -Force | Out-Null
        # manifest-signing.ps1 harus bisa ditemukan Invoke-Rollback (fallback .claude-kit\lib).
        $libDir = Join-Path $root '.claude-kit\lib'
        New-Item -ItemType Directory -Path $libDir -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $PSScriptRoot '..\lib\manifest-signing.ps1') `
                  -Destination (Join-Path $libDir 'manifest-signing.ps1') -Force
        try {
            $f = Join-Path $root 'AGENTS.md'
            Set-Content -LiteralPath $f -Value 'NEW-VERSION' -Encoding UTF8
            Set-Content -LiteralPath (Join-Path $root 'AGENTS.md.backup-20260101-120000') -Value 'OLD-VERSION' -Encoding UTF8

            # Bangun manifest BERTANDA-TANGAN (mirror cara install: tanda-tangan dihitung
            # atas manifest TANPA field signature, lalu hasilnya ditempel ke metadata).
            $manifest = [ordered]@{
                schema_version = 1
                kit_version    = '1.40.0'
                metadata       = [ordered]@{ kit_version = '1.40.0'; installer = 'test' }
                files          = @( [ordered]@{ path = 'AGENTS.md'; kind = 'file'; sha256 = 'placeholder' } )
            }
            $manifest.metadata.signature = New-ManifestSignature -Manifest $manifest -KitVersion '1.40.0'
            $manifestPath = Join-Path $root '.install-manifest.json'
            ($manifest | ConvertTo-Json -Depth 10) | Set-Content -LiteralPath $manifestPath -Encoding UTF8

            # Rollback PERTAMA: manifest signed+valid -> -Force hanya melewati prompt konfirmasi,
            # verifikasi tanda-tangan tetap jalan.
            $r1 = Invoke-Rollback -ProjectRoot $root -Force
            $r1.restored | Should -Be 1
            (Get-Content -LiteralPath $f -Raw).Trim() | Should -Be 'OLD-VERSION'

            # INTI PERBAIKAN: setelah sha256 berubah, manifest WAJIB ditandatangani ulang ->
            # status tetap 'verified' (tanpa fix, jadi 'invalid' karena tanda-tangan basi).
            $reread = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
            (Get-LintasManifestSignatureStatus -Manifest $reread) | Should -Be 'verified'

            # Rollback KEDUA tidak boleh dibatalkan dengan 'manifest-signature-invalid'.
            $r2 = Invoke-Rollback -ProjectRoot $root -Force
            $status2 = if ($r2.PSObject.Properties.Name -contains 'status') { $r2.status } else { $null }
            $status2 | Should -Not -Be 'manifest-signature-invalid'
            $r2.restored | Should -Be 1
        } finally {
            Remove-Item -Recurse -Force $root -ErrorAction SilentlyContinue
        }
    }
}

Describe "Invoke-Rollback end-to-end restore (v1.5.14)" {
    It "Restore file ter-track dari backup deploy .backup- suffix" {
        $root = Join-Path $env:TEMP "rb-e2e-$(Get-Random)"
        New-Item -ItemType Directory -Path $root -Force | Out-Null
        try {
            # File versi BARU (hasil update menimpa yang lama)
            $f = Join-Path $root 'AGENTS.md'
            Set-Content -LiteralPath $f -Value 'NEW-VERSION' -Encoding UTF8
            # Backup deploy versi LAMA (dibuat saat update)
            Set-Content -LiteralPath (Join-Path $root 'AGENTS.md.backup-20260101-120000') -Value 'OLD-VERSION' -Encoding UTF8
            # Manifest UNSIGNED + -Force bypass prompt (tidak ada lib/manifest-signing.ps1 di temp)
            Set-Content -LiteralPath (Join-Path $root '.install-manifest.json') -Value '{"files":[{"path":"AGENTS.md","sha256":"x"}]}' -Encoding UTF8

            $result = Invoke-Rollback -ProjectRoot $root -Force
            $result.restored | Should -Be 1
            (Get-Content -LiteralPath $f -Raw).Trim() | Should -Be 'OLD-VERSION'
        } finally {
            Remove-Item -Recurse -Force $root -ErrorAction SilentlyContinue
        }
    }
}
