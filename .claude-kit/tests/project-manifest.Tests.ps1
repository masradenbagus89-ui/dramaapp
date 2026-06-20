#Requires -Module Pester

<#
.SYNOPSIS
  Pester 5+ tes untuk lib/project-manifest.ps1 - pembaca + robot "kartu identitas project".

.DESCRIPTION
  Membuktikan robot BENAR-BENAR menangkap kartu basi/rusak (bukan lulus trivial):
    - PARSE-OK   : berkas rusak terdeteksi (MismatchCount=1), bukan diam.
    - PathExists : modul/ref yang path-nya tak ada di disk -> MISSING.
    - DeriveMatch: framework tak ada di package.json / pm salah -> MISMATCH (konservatif).
    - Manifest opsional: project tanpa kartu -> Present=$false, MismatchCount=0 (bukan error).
    - Kasus BERSIH: project tiruan yang valid -> MismatchCount=0.
    - Contoh template (templates/project.lintas.example.psd1) bisa di-baca + punya schema_version.
  Statis + sandbox: hanya baca/tulis di TestDrive (project tiruan). Tidak menyentuh project nyata.
#>

Describe 'lib/project-manifest.ps1 - pembaca + robot kartu identitas project' {

    BeforeAll {
        $script:Root = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
        . (Join-Path $script:Root 'lib/project-manifest.ps1')

        # Helper bikin project tiruan di TestDrive. Didefinisikan di BeforeAll (fase run) supaya
        # tersedia di semua It/Context (Pester 5: fungsi top-level discovery TIDAK terlihat saat run).
        function New-LintasFixtureProject {
            param(
                [Parameter(Mandatory)][string]$BaseDir,
                [Parameter(Mandatory)][string]$Name,
                [string]$ManifestContent,
                [hashtable]$Files,
                [string[]]$Dirs
            )
            $enc = [System.Text.UTF8Encoding]::new($false)
            $dir = Join-Path $BaseDir $Name
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            foreach ($d in @($Dirs)) { if ($d) { New-Item -ItemType Directory -Path (Join-Path $dir $d) -Force | Out-Null } }
            if ($Files) {
                foreach ($k in $Files.Keys) {
                    $fp = Join-Path $dir $k
                    New-Item -ItemType Directory -Path (Split-Path $fp -Parent) -Force | Out-Null
                    [System.IO.File]::WriteAllText($fp, [string]$Files[$k], $enc)
                }
            }
            if ($PSBoundParameters.ContainsKey('ManifestContent') -and $null -ne $ManifestContent) {
                [System.IO.File]::WriteAllText((Join-Path $dir 'project.lintas.psd1'), $ManifestContent, $enc)
            }
            return $dir
        }

        $script:PkgJson = '{ "dependencies": { "next": "14.0.0", "@prisma/client": "5.0.0" }, "devDependencies": { "prisma": "5.0.0" } }'
        $script:CleanManifest = @'
@{
    schema_version = 1
    intent = @{ purpose = 'test'; domain = 'test' }
    stack = @{ type = 'node'; package_manager = 'pnpm'; frameworks = @('next','prisma'); _derived_from = 'package.json' }
    refs = @{ architecture = 'docs/architecture.md'; glossary = 'docs/glossary.md'; registry = 'docs/architecture_auto.md' }
    modules = @( @{ name = 'auth'; path = 'src/lib/auth'; purpose = 'x'; role = 'core' } )
    conventions = @( @{ rule = 'r'; applies_to = 'x' } )
    split = @{ role = $null; access_tier = $null; base_name = $null; portfolio_ref = $null }
}
'@
        $script:BasiManifest = @'
@{
    schema_version = 1
    intent = @{ purpose = 'test'; domain = 'test' }
    stack = @{ type = 'node'; package_manager = 'yarn'; frameworks = @('svelte'); _derived_from = 'package.json' }
    refs = @{ architecture = 'docs/architecture.md' }
    modules = @( @{ name = 'hilang'; path = 'src/lib/MISSING'; purpose = 'x'; role = 'core' } )
}
'@
    }

    Context 'Read-LintasProjectManifest (PARSE-OK)' {
        It 'manifest tidak ada -> Present=$false, Ok=$false (opsional, bukan error)' {
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'kosong'
            $r = Read-LintasProjectManifest -Path (Join-Path $dir 'project.lintas.psd1')
            $r.Present | Should -BeFalse
        }
        It 'manifest valid -> Ok=$true + Manifest terisi' {
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'valid-read' -ManifestContent $script:CleanManifest
            $r = Read-LintasProjectManifest -Path (Join-Path $dir 'project.lintas.psd1')
            $r.Ok | Should -BeTrue
            $r.Manifest.schema_version | Should -Be 1
        }
        It 'manifest RUSAK -> Ok=$false + Error terisi (tidak diam)' {
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'rusak-read' -ManifestContent '@{ broken ='
            $r = Read-LintasProjectManifest -Path (Join-Path $dir 'project.lintas.psd1')
            $r.Present | Should -BeTrue
            $r.Ok | Should -BeFalse
            $r.Error | Should -Not -BeNullOrEmpty
        }
    }

    Context 'Get-LintasManifestSchemaFinding' {
        It 'schema_version=1 -> OK' {
            (Get-LintasManifestSchemaFinding -Manifest @{ schema_version = 1 })[0].Status | Should -Be 'OK'
        }
        It 'schema_version hilang -> MISMATCH' {
            (Get-LintasManifestSchemaFinding -Manifest @{ intent = @{} })[0].Status | Should -Be 'MISMATCH'
        }
        It 'schema_version bukan integer valid -> MISMATCH' {
            (Get-LintasManifestSchemaFinding -Manifest @{ schema_version = 'satu' })[0].Status | Should -Be 'MISMATCH'
        }
    }

    Context 'Invoke-LintasManifestCheck - kasus BERSIH' {
        It 'project tiruan valid + semua path ada + stack cocok -> MismatchCount=0' {
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'bersih' `
                -ManifestContent $script:CleanManifest `
                -Dirs @('src/lib/auth') `
                -Files @{
                    'package.json'             = $script:PkgJson
                    'pnpm-lock.yaml'           = ''
                    'docs/architecture.md'     = '# arch'
                    'docs/glossary.md'         = '# glossary'
                    'docs/architecture_auto.md' = '# registry'
                }
            $res = Invoke-LintasManifestCheck -RepoRoot $dir -Quiet
            $res.Present | Should -BeTrue
            $res.MismatchCount | Should -Be 0
            $res.Ok | Should -BeTrue
        }
    }

    Context 'Invoke-LintasManifestCheck - kasus BASI (robot HARUS menangkap)' {
        BeforeAll {
            $script:BasiDir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'basi' `
                -ManifestContent $script:BasiManifest `
                -Files @{
                    'package.json'   = $script:PkgJson
                    'pnpm-lock.yaml' = ''
                }
            $script:BasiRes = Invoke-LintasManifestCheck -RepoRoot $script:BasiDir -Quiet
        }
        It 'MismatchCount > 0 (tidak lulus trivial)' {
            $script:BasiRes.MismatchCount | Should -BeGreaterThan 0
        }
        It 'PathExists: modul yang path-nya tak ada -> MISSING' {
            ($script:BasiRes.Findings | Where-Object { $_.Field -eq 'module:hilang' }).Status | Should -Be 'MISSING'
        }
        It 'PathExists: ref yang tak ada -> MISSING' {
            ($script:BasiRes.Findings | Where-Object { $_.Field -eq 'ref:architecture' }).Status | Should -Be 'MISSING'
        }
        It 'DeriveMatch: framework tak ada di package.json -> MISMATCH' {
            ($script:BasiRes.Findings | Where-Object { $_.Field -eq 'stack.framework:svelte' }).Status | Should -Be 'MISMATCH'
        }
        It 'DeriveMatch: package_manager salah (yarn dideklarasikan, hanya pnpm-lock ada) -> MISMATCH' {
            ($script:BasiRes.Findings | Where-Object { $_.Field -eq 'stack.package_manager' }).Status | Should -Be 'MISMATCH'
        }
    }

    Context 'Invoke-LintasManifestCheck - anti alarm-palsu (konservatif)' {
        It 'framework cocok (substring di deps): next -> OK, prisma -> OK (lewat @prisma/client)' {
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'derive-ok' `
                -ManifestContent $script:CleanManifest `
                -Dirs @('src/lib/auth') `
                -Files @{
                    'package.json'             = $script:PkgJson
                    'pnpm-lock.yaml'           = ''
                    'docs/architecture.md'     = ''
                    'docs/glossary.md'         = ''
                    'docs/architecture_auto.md' = ''
                }
            $res = Invoke-LintasManifestCheck -RepoRoot $dir -Quiet
            ($res.Findings | Where-Object { $_.Field -eq 'stack.framework:prisma' }).Status | Should -Be 'OK'
            ($res.Findings | Where-Object { $_.Field -eq 'stack.framework:next' }).Status | Should -Be 'OK'
        }
        It 'tanpa package.json -> framework di-SKIP (tidak alarm-palsu MISMATCH)' {
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'no-pkg' `
                -ManifestContent $script:CleanManifest `
                -Dirs @('src/lib/auth') `
                -Files @{ 'docs/architecture.md' = ''; 'docs/glossary.md' = ''; 'docs/architecture_auto.md' = '' }
            $res = Invoke-LintasManifestCheck -RepoRoot $dir -Quiet
            @($res.Findings | Where-Object { $_.Field -like 'stack.framework:*' }).Count | Should -Be 0
        }
    }

    Context 'Invoke-LintasManifestCheck - manifest rusak + tidak ada' {
        It 'tidak ada manifest -> Present=$false, MismatchCount=0' {
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'tanpa-kartu'
            $res = Invoke-LintasManifestCheck -RepoRoot $dir -Quiet
            $res.Present | Should -BeFalse
            $res.MismatchCount | Should -Be 0
        }
        It 'manifest rusak -> MismatchCount=1 (PARSE-OK gagal, tidak diam)' {
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'rusak-invoke' -ManifestContent '@{ x ='
            $res = Invoke-LintasManifestCheck -RepoRoot $dir -Quiet
            $res.Present | Should -BeTrue
            $res.Ok | Should -BeFalse
            $res.MismatchCount | Should -Be 1
        }
    }

    Context 'Bootstrap writer (Increment 2) - lahir terisi + langsung bersih' {
        It 'Get-LintasDerivedStack: package.json+pnpm-lock+next/prisma -> node/pnpm + frameworks' {
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'derive-stack' `
                -Files @{ 'package.json' = $script:PkgJson; 'pnpm-lock.yaml' = '' }
            $stack = Get-LintasDerivedStack -RepoRoot $dir
            $stack.type | Should -Be 'node'
            $stack.package_manager | Should -Be 'pnpm'
            $stack.frameworks | Should -Contain 'next'
            $stack.frameworks | Should -Contain 'prisma'
        }
        It 'Get-LintasDerivedStack: tanpa package.json -> unknown + pm null + frameworks kosong' {
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'derive-empty'
            $stack = Get-LintasDerivedStack -RepoRoot $dir
            $stack.type | Should -Be 'unknown'
            $stack.package_manager | Should -BeNullOrEmpty
            @($stack.frameworks).Count | Should -Be 0
        }
        It 'Write...IfMissing: tulis kartu baru -> Written + file valid + LANGSUNG bersih (MismatchCount=0)' {
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'bootstrap-write' `
                -Files @{
                    'package.json'              = $script:PkgJson
                    'pnpm-lock.yaml'            = ''
                    'docs/architecture.md'      = ''
                    'docs/glossary.md'          = ''
                    'docs/architecture_auto.md' = ''
                }
            $w = Write-LintasProjectManifestIfMissing -RepoRoot $dir
            $w.Written | Should -BeTrue
            Test-Path -LiteralPath $w.Path | Should -BeTrue
            # KUNCI: kartu yang baru lahir HARUS langsung lolos robot (bukan bikin manifest basi).
            $res = Invoke-LintasManifestCheck -RepoRoot $dir -Quiet
            $res.Present | Should -BeTrue
            $res.MismatchCount | Should -Be 0
        }
        It 'Write...IfMissing: idempoten - panggil lagi saat sudah ada -> Written=$false, exists' {
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'bootstrap-idem' `
                -Files @{ 'package.json' = $script:PkgJson; 'pnpm-lock.yaml' = '' }
            $w1 = Write-LintasProjectManifestIfMissing -RepoRoot $dir
            $w1.Written | Should -BeTrue
            $w2 = Write-LintasProjectManifestIfMissing -RepoRoot $dir
            $w2.Written | Should -BeFalse
            $w2.Reason | Should -Be 'exists'
        }
    }

    Context 'Tersambung ke alur pasang (wiring anti-drift)' {
        BeforeAll {
            $script:SetupSrc = Get-Content -LiteralPath (Join-Path $script:Root 'setup-pola-b.ps1') -Raw -Encoding UTF8
        }
        It 'setup-pola-b.ps1 memuat lib/project-manifest.ps1 di $libsToLoad' {
            $script:SetupSrc | Should -Match 'lib\\project-manifest\.ps1'
        }
        It 'setup-pola-b.ps1 memanggil Write-LintasProjectManifestIfMissing (bootstrap kartu)' {
            $script:SetupSrc | Should -Match 'Write-LintasProjectManifestIfMissing'
        }
    }

    Context 'Registry docs robot (anti-basi architecture_auto.md)' {
        It 'MISSING: docs/*.md yang belum terdaftar -> MISSING; yang terdaftar -> OK' {
            $reg = @'
# Registry
- [auth.md](auth.md) - modul auth
'@
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'reg-missing' -Files @{
                'docs/architecture_auto.md' = $reg
                'docs/auth.md'              = '# auth'
                'docs/extra.md'             = '# extra (belum terdaftar)'
            }
            $res = Invoke-LintasRegistryCheck -RepoRoot $dir -Quiet
            ($res.Findings | Where-Object { $_.Field -eq 'docs/extra.md' }).Status | Should -Be 'MISSING'
            ($res.Findings | Where-Object { $_.Field -eq 'docs/auth.md' }).Status | Should -Be 'OK'
            $res.MismatchCount | Should -BeGreaterThan 0
        }
        It 'boundary: auth.md TIDAK keliru cocok di entri oauth.md (anti false-OK)' {
            $reg = @'
# Registry
- [oauth.md](oauth.md) - modul oauth
'@
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'reg-boundary' -Files @{
                'docs/architecture_auto.md' = $reg
                'docs/oauth.md'             = '# oauth'
                'docs/auth.md'              = '# auth (belum terdaftar)'
            }
            $res = Invoke-LintasRegistryCheck -RepoRoot $dir -Quiet
            ($res.Findings | Where-Object { $_.Field -eq 'docs/auth.md' }).Status | Should -Be 'MISSING'
        }
        It 'ORPHAN: link registry ke berkas yang tak ada -> ORPHAN' {
            $reg = @'
# Registry
- [gone.md](gone.md) - berkas sudah dihapus
'@
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'reg-orphan' -Files @{
                'docs/architecture_auto.md' = $reg
            }
            $res = Invoke-LintasRegistryCheck -RepoRoot $dir -Quiet
            ($res.Findings | Where-Object { $_.Field -eq 'link:gone.md' }).Status | Should -Be 'ORPHAN'
        }
        It 'BERSIH: semua docs terdaftar + semua link ada -> MismatchCount=0' {
            $reg = @'
# Registry
- [auth.md](auth.md) - modul auth
'@
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'reg-clean' -Files @{
                'docs/architecture_auto.md' = $reg
                'docs/auth.md'              = '# auth'
            }
            $res = Invoke-LintasRegistryCheck -RepoRoot $dir -Quiet
            $res.Present | Should -BeTrue
            $res.MismatchCount | Should -Be 0
        }
        It 'tanpa architecture_auto.md -> Present=$false, MismatchCount=0 (opsional)' {
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'reg-none' -Files @{ 'docs/auth.md' = '# auth' }
            $res = Invoke-LintasRegistryCheck -RepoRoot $dir -Quiet
            $res.Present | Should -BeFalse
            $res.MismatchCount | Should -Be 0
        }
        It 'AUTO-GENERATE: append entri yang hilang -> Changed + setelahnya registry BERSIH' {
            $reg = @'
# Registry
- [auth.md](auth.md) - modul auth
'@
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'reg-append' -Files @{
                'docs/architecture_auto.md' = $reg
                'docs/auth.md'              = '# auth'
                'docs/extra.md'             = '# extra'
            }
            $add = Add-LintasMissingRegistryEntry -RepoRoot $dir
            $add.Changed | Should -BeTrue
            $add.Added | Should -Contain 'extra.md'
            (Invoke-LintasRegistryCheck -RepoRoot $dir -Quiet).MismatchCount | Should -Be 0
        }
        It 'AUTO-GENERATE: idempoten - panggil lagi saat sudah lengkap -> Changed=$false' {
            $reg = @'
# Registry
- [auth.md](auth.md) - modul auth
'@
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'reg-append-idem' -Files @{
                'docs/architecture_auto.md' = $reg
                'docs/auth.md'              = '# auth'
                'docs/extra.md'             = '# extra'
            }
            $null = Add-LintasMissingRegistryEntry -RepoRoot $dir
            $add2 = Add-LintasMissingRegistryEntry -RepoRoot $dir
            $add2.Changed | Should -BeFalse
            $add2.Reason | Should -Be 'already-complete'
        }
        It 'AUTO-GENERATE: tanpa registry -> tidak bikin baru (Changed=$false, no-registry)' {
            $dir = New-LintasFixtureProject -BaseDir $TestDrive -Name 'reg-append-none' -Files @{ 'docs/auth.md' = '# auth' }
            $add = Add-LintasMissingRegistryEntry -RepoRoot $dir
            $add.Changed | Should -BeFalse
            $add.Reason | Should -Be 'no-registry'
        }
    }

    Context 'Aturan + dokumen terpasang (Increment 3, anti-rot)' {
        It 'CLAUDE_universal_v1.md punya aturan baca project.lintas.psd1 (sec 7.9)' {
            $c = Get-Content -LiteralPath (Join-Path $script:Root 'CLAUDE_universal_v1.md') -Raw -Encoding UTF8
            $c | Should -Match 'project\.lintas\.psd1'
            $c | Should -Match '7\.9'
        }
        It 'docs/project-manifest.md ada (dokumen pendamping + keputusan desain)' {
            Test-Path -LiteralPath (Join-Path $script:Root 'docs/project-manifest.md') | Should -BeTrue
        }
        It 'PETA_SUMBER_KEBENARAN.md mencatat project.lintas.psd1 sebagai sumber sejati' {
            $p = Get-Content -LiteralPath (Join-Path $script:Root 'docs/PETA_SUMBER_KEBENARAN.md') -Raw -Encoding UTF8
            $p | Should -Match 'project\.lintas\.psd1'
        }
        It 'KEUNGGULAN_LINTASAI.md punya entri kartu identitas (AUTO-SYNC sec 7.8)' {
            $k = Get-Content -LiteralPath (Join-Path $script:Root 'KEUNGGULAN_LINTASAI.md') -Raw -Encoding UTF8
            $k | Should -Match 'Kartu Identitas Project'
        }
    }

    Context 'Contoh template ter-kirim valid' {
        It 'templates/project.lintas.example.psd1 ada + bisa di-baca + schema_version=1' {
            $examplePath = Join-Path $script:Root 'templates/project.lintas.example.psd1'
            Test-Path -LiteralPath $examplePath | Should -BeTrue
            $r = Read-LintasProjectManifest -Path $examplePath
            $r.Ok | Should -BeTrue
            $r.Manifest.schema_version | Should -Be 1
        }
        It 'contoh template terdaftar di kit-files.psd1 templates (anti-drift integritas)' {
            $psd1 = Import-PowerShellDataFile -LiteralPath (Join-Path $script:Root 'lib/kit-files.psd1')
            ($psd1.templates | ForEach-Object { $_ -replace '\\','/' }) | Should -Contain 'templates/project.lintas.example.psd1'
        }
        It 'lib/project-manifest.ps1 terdaftar di kit-files.psd1 lib_files (anti-drift integritas)' {
            $psd1 = Import-PowerShellDataFile -LiteralPath (Join-Path $script:Root 'lib/kit-files.psd1')
            ($psd1.lib_files | ForEach-Object { $_ -replace '\\','/' }) | Should -Contain 'lib/project-manifest.ps1'
        }
    }
}
