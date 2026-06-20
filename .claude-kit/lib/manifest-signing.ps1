#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Manifest HMAC signing untuk prevent tampering attack.
.DESCRIPTION
  Sign .install-manifest.json dengan HMAC-SHA256 pakai salt derived dari
  kit version constant. Verify signature sebelum trust manifest entries.

  HMAC = anti-EDIT detection (manifest tidak diam-diam dimodifikasi),
  BUKAN forge-proof secret. Pakai detached signature kalau perlu real secret.
#>

function Get-OrCreateLocalSecret {
    <#
    .SYNOPSIS
      Get-or-create per-install random secret di .manifest-secret.
    .DESCRIPTION
      Generate 32 byte cryptographically-secure random pakai RandomNumberGenerator,
      persist ke <kit-root>/.manifest-secret (gitignored). Same install = same secret
      = signature stable across runs di mesin yang sama.
    #>
    param([string]$KitRoot)

    if (-not $KitRoot) {
        # Resolve kit root dari lokasi script ini (lib/manifest-signing.ps1 -> ..)
        $KitRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
    }

    $secretFile = Join-Path $KitRoot '.manifest-secret'

    if (Test-Path $secretFile) {
        $existing = (Get-Content -Path $secretFile -Raw -ErrorAction Stop).Trim()
        if ($existing) { return $existing }
    }

    # Generate 32 bytes (256-bit) cryptographically-secure random
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    } finally {
        $rng.Dispose()
    }
    $secret = [Convert]::ToBase64String($bytes)

    # Persist (UTF8 no BOM, no trailing newline)
    [System.IO.File]::WriteAllText($secretFile, $secret, [System.Text.UTF8Encoding]::new($false))

    return $secret
}

function Get-ManifestSecret {
    [Diagnostics.CodeAnalysis.SuppressMessageAttribute(
        'PSReviewUnusedParameter', 'KitVersion',
        Justification = 'Reserved for future per-version key derivation; kept for stable signature compat across callers New-ManifestSignature / Test-ManifestSignature.'
    )]
    param(
        [string]$KitVersion,
        [string]$KitRoot
    )

    if ($env:LINTASAI_MANIFEST_SECRET) {
        return $env:LINTASAI_MANIFEST_SECRET
    }

    # Warn user: tanpa env var, signature pakai per-install secret (non-portable).
    Write-Warning "LINTASAI_MANIFEST_SECRET tidak di-set. Pakai per-install secret di .manifest-secret (manifest signature TIDAK portable antar mesin)."

    # Per-install random secret (forge-resistant, but non-portable)
    return Get-OrCreateLocalSecret -KitRoot $KitRoot
}

function New-ManifestSignature {
    [CmdletBinding()]
    [Diagnostics.CodeAnalysis.SuppressMessageAttribute(
        'PSUseShouldProcessForStateChangingFunctions',
        '',
        Justification = 'Pure-compute HMAC-SHA256 over canonical JSON input; tidak menulis ke filesystem/registry/env/network. Verb New- bersifat semantic (compute new signature value), bukan stateful mutation. Renaming ke Get-/ConvertTo- akan break public API yang sudah di-dot-source di update-kit.ps1 + tests.'
    )]
    param(
        [Parameter(Mandatory)][hashtable]$Manifest,
        [Parameter(Mandatory)][string]$KitVersion,
        [string]$KitRoot
    )

    $secret = Get-ManifestSecret -KitVersion $KitVersion -KitRoot $KitRoot
    $secretBytes = [System.Text.Encoding]::UTF8.GetBytes($secret)

    # Sign canonical JSON (sort keys recursively)
    $canonical = $Manifest | ConvertTo-Json -Depth 10 -Compress
    $canonicalBytes = [System.Text.Encoding]::UTF8.GetBytes($canonical)

    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = $secretBytes
    $signature = $hmac.ComputeHash($canonicalBytes)
    return [Convert]::ToBase64String($signature)
}

function Test-ManifestSignature {
    param(
        [Parameter(Mandatory)][hashtable]$Manifest,
        [Parameter(Mandatory)][string]$KitVersion,
        [Parameter(Mandatory)][string]$ExpectedSignature,
        [string]$KitRoot
    )

    $actualSignature = New-ManifestSignature -Manifest $Manifest -KitVersion $KitVersion -KitRoot $KitRoot

    # Constant-time compare byte-exact (Ordinal).
    # WHY byte, bukan char: operator PowerShell -ne pada [char] CASE-INSENSITIVE
    # (mis. 'A' -ne 'a' = $false), jadi banding char SALAH untuk base64 yang
    # case-sensitive -> 2 signature beda kapitalisasi keliru dinilai sama.
    # Banding lewat byte UTF-8 + XOR-accumulate (tetap konstan-waktu, tanpa early-exit).
    $actualBytes   = [System.Text.Encoding]::UTF8.GetBytes($actualSignature)
    $expectedBytes = [System.Text.Encoding]::UTF8.GetBytes($ExpectedSignature)
    if ($actualBytes.Length -ne $expectedBytes.Length) { return $false }
    $diff = 0
    for ($i = 0; $i -lt $actualBytes.Length; $i++) {
        $diff = $diff -bor ($actualBytes[$i] -bxor $expectedBytes[$i])
    }
    return ($diff -eq 0)
}

function ConvertTo-LintasSignableHashtable {
    # Deep-convert (PSCustomObject hasil ConvertFrom-Json / hashtable) -> [ordered]
    # hashtable, MEMPERTAHANKAN urutan properti supaya ConvertTo-Json menghasilkan JSON
    # kanonik yang IDENTIK dengan saat sign (lib/manifest.ps1 pakai [ordered]). Cermin dari
    # ConvertTo-HashtableDeep (uninstall.ps1) / ConvertTo-RollbackHashtableDeep (rollback.ps1)
    # supaya verifikasi di kit.ps1 doctor konsisten dengan jalur uninstall/rollback yang teruji.
    param($Object)
    if ($null -eq $Object) { return $null }
    if ($Object -is [System.Collections.IDictionary]) {
        $ht = [ordered]@{}
        foreach ($k in $Object.Keys) { $ht[$k] = ConvertTo-LintasSignableHashtable -Object $Object[$k] }
        return $ht
    }
    if ($Object -is [System.Management.Automation.PSCustomObject]) {
        $ht = [ordered]@{}
        foreach ($prop in $Object.PSObject.Properties) { $ht[$prop.Name] = ConvertTo-LintasSignableHashtable -Object $prop.Value }
        return $ht
    }
    if ($Object -is [System.Collections.IEnumerable] -and -not ($Object -is [string])) {
        $arr = @()
        foreach ($item in $Object) { $arr += ,(ConvertTo-LintasSignableHashtable -Object $item) }
        return ,$arr
    }
    return $Object
}

function Get-LintasManifestSignatureStatus {
    # Status keaslian manifest yang SUDAH di-parse (PSCustomObject dari ConvertFrom-Json).
    # Return:
    #   'verified' -> ada tanda-tangan + COCOK (daftar berkas asli, tidak diutak-atik)
    #   'invalid'  -> ada tanda-tangan tapi TIDAK cocok (manifest mungkin di-tamper)
    #   'unsigned' -> tanpa tanda-tangan (legacy / pre-HMAC)
    # Melempar kalau verifikasi tak bisa dijalankan -> caller (doctor) memilih: skip + INFO.
    param(
        [Parameter(Mandatory)]$Manifest,
        [string]$KitRoot
    )
    $sig = $null
    if ($Manifest.metadata -and $Manifest.metadata.signature) { $sig = [string]$Manifest.metadata.signature }
    if ([string]::IsNullOrWhiteSpace($sig)) { return 'unsigned' }

    # Rekonstruksi manifest TANPA field signature (sign dihitung sebelum signature disisipkan).
    $copy = ConvertTo-LintasSignableHashtable -Object $Manifest
    if ($copy.metadata -is [System.Collections.IDictionary]) { $null = $copy.metadata.Remove('signature') }

    $kitVer = ''
    if ($Manifest.metadata -and $Manifest.metadata.kit_version) { $kitVer = [string]$Manifest.metadata.kit_version }
    elseif ($Manifest.kit_version) { $kitVer = [string]$Manifest.kit_version }

    if (Test-ManifestSignature -Manifest $copy -KitVersion $kitVer -ExpectedSignature $sig -KitRoot $KitRoot) {
        return 'verified'
    }
    return 'invalid'
}

# Functions auto-exposed via dot-source (no Export-ModuleMember karena .ps1)
