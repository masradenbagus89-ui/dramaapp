#Requires -Module Pester

<#
.SYNOPSIS
  Pester 5+ tests untuk lib/manifest-signing.ps1 (HMAC anti-tamper manifest).

.DESCRIPTION
  Sebelumnya Test-ManifestSignature TIDAK punya tes (audit 2026-06-17, COV-001):
  satpam anti-utak-atik manifest tak pernah diuji, baik kasus tanda-tangan sah
  (harus lolos) maupun palsu (harus ditolak). Tes ini mengunci:
    1. Tanda-tangan deterministik (manifest sama -> tanda-tangan sama).
    2. Tanda-tangan SAH -> Test-ManifestSignature = $true.
    3. Manifest DI-TAMPER setelah ditandatangani -> $false (inti anti-tamper).
    4. REGRESI BUG-1: tanda-tangan beda HANYA pada besar/kecil huruf -> $false
       (dulu banding char PowerShell -ne CASE-INSENSITIVE keliru menilai sama).
    5. Panjang berbeda -> $false.
#>

BeforeAll {
    $script:KitRepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
    . (Join-Path $script:KitRepoRoot 'lib\manifest-signing.ps1')

    # Secret tetap supaya tanda-tangan deterministik + tidak memicu Write-Warning
    # per-install secret. Disimpan & dipulihkan supaya tidak bocor ke tes lain.
    $script:PrevSecret = $env:LINTASAI_MANIFEST_SECRET
    $env:LINTASAI_MANIFEST_SECRET = 'unit-test-fixed-secret-do-not-use-in-prod'

    $script:SampleManifest = [ordered]@{
        schema_version = 1
        files = @(
            @{ path = 'CLAUDE.md'; sha256 = 'AAAA' },
            @{ path = 'lib/safety.ps1'; sha256 = 'BBBB' }
        )
        metadata = @{ kit_version = 'test-1.0.0' }
    }
}

AfterAll {
    $env:LINTASAI_MANIFEST_SECRET = $script:PrevSecret
}

Describe "Test-ManifestSignature (anti-tamper HMAC)" {

    It "New-ManifestSignature deterministik: manifest sama -> tanda-tangan sama" {
        $sig1 = New-ManifestSignature -Manifest $script:SampleManifest -KitVersion 'test-1.0.0'
        $sig2 = New-ManifestSignature -Manifest $script:SampleManifest -KitVersion 'test-1.0.0'
        $sig1 | Should -Be $sig2
        $sig1 | Should -Not -BeNullOrEmpty
    }

    It "Tanda-tangan SAH diterima (return `$true)" {
        $sig = New-ManifestSignature -Manifest $script:SampleManifest -KitVersion 'test-1.0.0'
        Test-ManifestSignature -Manifest $script:SampleManifest -KitVersion 'test-1.0.0' -ExpectedSignature $sig |
            Should -BeTrue
    }

    It "Manifest DI-TAMPER setelah ditandatangani -> ditolak (return `$false)" {
        $sig = New-ManifestSignature -Manifest $script:SampleManifest -KitVersion 'test-1.0.0'
        $tampered = [ordered]@{
            schema_version = 1
            files = @(
                @{ path = 'CLAUDE.md'; sha256 = 'EVIL' },   # <- diubah
                @{ path = 'lib/safety.ps1'; sha256 = 'BBBB' }
            )
            metadata = @{ kit_version = 'test-1.0.0' }
        }
        Test-ManifestSignature -Manifest $tampered -KitVersion 'test-1.0.0' -ExpectedSignature $sig |
            Should -BeFalse
    }

    It "REGRESI BUG-1: tanda-tangan beda HANYA besar/kecil huruf -> ditolak" {
        $valid = New-ManifestSignature -Manifest $script:SampleManifest -KitVersion 'test-1.0.0'

        # Balik kapitalisasi 1 huruf base64 -> string beda secara Ordinal,
        # tapi 'sama' kalau dibanding case-insensitive (bug lama).
        $chars = $valid.ToCharArray()
        $flipIdx = -1
        for ($i = 0; $i -lt $chars.Length; $i++) {
            if ($chars[$i] -cmatch '[A-Za-z]') {
                if ([char]::IsUpper($chars[$i])) { $chars[$i] = [char]::ToLower($chars[$i]) }
                else                             { $chars[$i] = [char]::ToUpper($chars[$i]) }
                $flipIdx = $i; break
            }
        }
        $flipIdx | Should -BeGreaterThan -1 -Because 'tanda-tangan base64 pasti punya minimal 1 huruf'
        $caseFlipped = -join $chars
        $caseFlipped | Should -Not -BeExactly $valid  # beda secara Ordinal

        Test-ManifestSignature -Manifest $script:SampleManifest -KitVersion 'test-1.0.0' -ExpectedSignature $caseFlipped |
            Should -BeFalse -Because 'base64 case-sensitive: beda kapitalisasi = tanda-tangan beda'
    }

    It "Panjang tanda-tangan berbeda -> ditolak (return `$false)" {
        $valid = New-ManifestSignature -Manifest $script:SampleManifest -KitVersion 'test-1.0.0'
        Test-ManifestSignature -Manifest $script:SampleManifest -KitVersion 'test-1.0.0' -ExpectedSignature ($valid + 'XX') |
            Should -BeFalse
    }
}

Describe "Get-LintasManifestSignatureStatus (verifikasi manifest dari disk - MANIFEST-01)" {

    BeforeAll {
        # Bangun manifest seperti lib/manifest.ps1: sign manifest TANPA field signature,
        # lalu sisipkan ke metadata.signature. Round-trip lewat JSON = simulasi baca dari disk.
        function script:New-SignedManifestObject {
            $m = [ordered]@{
                schema_version = 1
                kit_version    = 'test-1.0.0'
                installed_at   = '2026-06-17T00:00:00'
                metadata       = [ordered]@{ installer = 'setup-pola-b.ps1' }
                files          = @(
                    [ordered]@{ path = 'CLAUDE.md';      sha256 = 'AAAA' },
                    [ordered]@{ path = 'lib/safety.ps1'; sha256 = 'BBBB' }
                )
            }
            $m.metadata.signature = New-ManifestSignature -Manifest $m -KitVersion 'test-1.0.0'
            return ($m | ConvertTo-Json -Depth 10 | ConvertFrom-Json)   # round-trip JSON
        }
    }

    It "Manifest bertanda-tangan + utuh -> 'verified' (round-trip JSON cocok)" {
        $parsed = script:New-SignedManifestObject
        Get-LintasManifestSignatureStatus -Manifest $parsed | Should -Be 'verified'
    }

    It "Manifest DI-TAMPER setelah ditandatangani -> 'invalid'" {
        $parsed = script:New-SignedManifestObject
        $parsed.files[0].sha256 = 'EVIL'   # ubah daftar setelah ditandatangani
        Get-LintasManifestSignatureStatus -Manifest $parsed | Should -Be 'invalid'
    }

    It "Manifest tanpa tanda-tangan -> 'unsigned'" {
        $m = [ordered]@{
            schema_version = 1
            kit_version    = 'test-1.0.0'
            metadata       = [ordered]@{ installer = 'setup-pola-b.ps1' }
            files          = @([ordered]@{ path = 'CLAUDE.md'; sha256 = 'AAAA' })
        }
        $parsed = $m | ConvertTo-Json -Depth 10 | ConvertFrom-Json
        Get-LintasManifestSignatureStatus -Manifest $parsed | Should -Be 'unsigned'
    }
}
