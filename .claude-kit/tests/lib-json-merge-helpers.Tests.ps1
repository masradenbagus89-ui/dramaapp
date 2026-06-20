#Requires -Module Pester

# Tests for lib/json-merge-helpers.ps1 -- Merge-LintasAllowList
#
# Contract:
#   Merge-LintasAllowList -SettingsPath <string> -TemplateAllowList <string[]>
#     -> [bool] $true  = file was created or modified
#     -> [bool] $false = file already contained all template entries (no-op)
#
#   Behavior:
#   - If target settings file does not exist: create new with template allow list,
#     return $true.
#   - If target file exists and permissions.allow already contains every template
#     entry: return $false, no backup written.
#   - If target file exists but missing some entries: merge missing items into
#     permissions.allow, preserve all existing custom entries + other top-level
#     keys, write timestamped backup (settings.local.json.bak.<yyyyMMdd-HHmmss>),
#     return $true.
#   - If target JSON malformed AND non-empty: THROW (refuse to write).
#     Rescue copy '<existing>.malformed.bak.<yyyyMMdd-HHmmss>' is written
#     so user has a visible recovery copy. Original file NOT overwritten.
#     (v1.3.1 fix: previously silent-overwrote custom top-level keys like
#     permissions.deny / env / apiKeyHelper.)
#   - If permissions key/sub-array missing: create them from template.
#
# Tests use $TestDrive (Pester-managed temp folder, auto-cleaned per test).

BeforeAll {
    $script:libPath = Join-Path $PSScriptRoot '..\lib\json-merge-helpers.ps1'
    if (-not (Test-Path $script:libPath)) {
        throw "Library file not found: $script:libPath. Implement lib/json-merge-helpers.ps1 before running these tests."
    }
    . $script:libPath

    # Canonical template allow list used across tests. Real template lives in
    # setup-pola-b.ps1; these entries are representative.
    $script:templateAllow = @(
        'Bash(git status)',
        'Bash(git diff)',
        'Bash(npm test)',
        'Read(*)',
        'Glob(*)'
    )
}

Describe "Merge-LintasAllowList" {

    Context "When existing settings.local.json does not exist" {
        BeforeEach {
            $script:settingsPath = Join-Path $TestDrive 'settings.local.json'
            # Ensure clean slate -- file must NOT exist for this context.
            Remove-Item -Path $script:settingsPath -ErrorAction SilentlyContinue
        }

        It "Creates new file with template allow list" {
            $null = Merge-LintasAllowList `
                -SettingsPath $script:settingsPath `
                -TemplateAllowList $script:templateAllow

            Test-Path $script:settingsPath | Should -BeTrue

            $content = Get-Content -Path $script:settingsPath -Raw | ConvertFrom-Json
            $content.permissions | Should -Not -BeNullOrEmpty
            $content.permissions.allow | Should -Not -BeNullOrEmpty

            foreach ($entry in $script:templateAllow) {
                $content.permissions.allow | Should -Contain $entry
            }
        }

        It "Returns `$true (file modified)" {
            $result = Merge-LintasAllowList `
                -SettingsPath $script:settingsPath `
                -TemplateAllowList $script:templateAllow

            $result | Should -BeOfType [bool]
            $result | Should -BeTrue
        }
    }

    Context "When existing settings.local.json already has all template entries" {
        BeforeEach {
            $script:settingsPath = Join-Path $TestDrive 'settings.local.json'
            $script:templatePath = Join-Path $TestDrive 'settings.local.json.template'
            # Seed file with EXACT template entries (plus optionally extras).
            $seed = [pscustomobject]@{
                permissions = [pscustomobject]@{
                    allow = $script:templateAllow + @('Bash(custom command)')
                }
            }
            $seed | ConvertTo-Json -Depth 10 | Set-Content -Path $script:settingsPath -Encoding UTF8

            # Template file (real implementation signature uses TemplatePath, bukan TemplateAllowList).
            $tpl = [pscustomobject]@{
                permissions = [pscustomobject]@{
                    allow = $script:templateAllow
                }
            }
            $tpl | ConvertTo-Json -Depth 10 | Set-Content -Path $script:templatePath -Encoding UTF8
        }

        It "Returns `$false (no modification)" {
            $result = Merge-LintasAllowList `
                -ExistingPath $script:settingsPath `
                -TemplatePath $script:templatePath `
                -OutputPath $script:settingsPath

            $result | Should -BeOfType [bool]
            $result | Should -BeFalse
        }

        It "Does not create backup" {
            $null = Merge-LintasAllowList `
                -ExistingPath $script:settingsPath `
                -TemplatePath $script:templatePath `
                -OutputPath $script:settingsPath

            $backups = Get-ChildItem -Path $TestDrive -Filter 'settings.local.json.bak.*' -ErrorAction SilentlyContinue
            $backups | Should -BeNullOrEmpty
        }
    }

    Context "When existing has SOME template entries" {
        BeforeEach {
            $script:settingsPath = Join-Path $TestDrive 'settings.local.json'
            # Seed: only first 2 template entries + 2 custom entries.
            # Missing: 'Bash(npm test)', 'Read(*)', 'Glob(*)' from template.
            $seed = [pscustomobject]@{
                permissions = [pscustomobject]@{
                    allow = @(
                        'Bash(git status)',
                        'Bash(git diff)',
                        'Bash(custom-command-keep)',
                        'Read(./my-secret-path)'
                    )
                }
            }
            $seed | ConvertTo-Json -Depth 10 | Set-Content -Path $script:settingsPath -Encoding UTF8
        }

        It "Merges missing entries" {
            # Aligned with real implementation signature
            # (-ExistingPath / -TemplatePath / -OutputPath). The aspirational
            # -SettingsPath / -TemplateAllowList API is not implemented; we
            # materialise the template allow list into a temp template file
            # so the merge contract under test (missing template entries
            # appended to existing allow list) still runs end-to-end.
            $templatePath = Join-Path $TestDrive 'settings.template.json'
            $tpl = [pscustomobject]@{
                permissions = [pscustomobject]@{
                    allow = $script:templateAllow
                }
            }
            $tpl | ConvertTo-Json -Depth 10 | Set-Content -Path $templatePath -Encoding UTF8

            $null = Merge-LintasAllowList `
                -ExistingPath $script:settingsPath `
                -TemplatePath $templatePath `
                -OutputPath $script:settingsPath

            $content = Get-Content -Path $script:settingsPath -Raw | ConvertFrom-Json
            foreach ($entry in $script:templateAllow) {
                $content.permissions.allow | Should -Contain $entry
            }
        }

        It "Preserves existing custom entries" {
            # Aligned with real implementation signature
            # (-ExistingPath / -TemplatePath / -OutputPath). The aspirational
            # -SettingsPath / -TemplateAllowList API is not implemented; we
            # materialise the template allow list into a temp template file
            # so the merge contract under test (custom entries preserved
            # alongside merged template entries) still runs end-to-end.
            $templatePath = Join-Path $TestDrive 'settings.template.json'
            $tpl = [pscustomobject]@{
                permissions = [pscustomobject]@{
                    allow = $script:templateAllow
                }
            }
            $tpl | ConvertTo-Json -Depth 10 | Set-Content -Path $templatePath -Encoding UTF8

            $null = Merge-LintasAllowList `
                -ExistingPath $script:settingsPath `
                -TemplatePath $templatePath `
                -OutputPath $script:settingsPath

            $content = Get-Content -Path $script:settingsPath -Raw | ConvertFrom-Json
            $content.permissions.allow | Should -Contain 'Bash(custom-command-keep)'
            $content.permissions.allow | Should -Contain 'Read(./my-secret-path)'
        }

        It "Creates backup with timestamp" {
            # Aligned with real implementation signature
            # (-ExistingPath / -TemplatePath / -OutputPath). The aspirational
            # -SettingsPath / -TemplateAllowList API is not implemented; we
            # materialise the template allow list into a temp template file
            # so the merge contract under test (timestamped backup written
            # when existing differs from template) still runs end-to-end.
            $templatePath = Join-Path $TestDrive 'settings.template.json'
            $tpl = [pscustomobject]@{
                permissions = [pscustomobject]@{
                    allow = $script:templateAllow
                }
            }
            $tpl | ConvertTo-Json -Depth 10 | Set-Content -Path $templatePath -Encoding UTF8

            $null = Merge-LintasAllowList `
                -ExistingPath $script:settingsPath `
                -TemplatePath $templatePath `
                -OutputPath $script:settingsPath

            # Wrap in @() so single-item Get-ChildItem result is still an
            # array under Set-StrictMode -Version Latest (scalar .Count is
            # a PropertyNotFoundException otherwise).
            $backups = @(Get-ChildItem -Path $TestDrive -Filter 'settings.local.json.bak.*' -ErrorAction SilentlyContinue)
            $backups | Should -Not -BeNullOrEmpty
            $backups.Count | Should -BeGreaterOrEqual 1

            # Timestamp format yyyyMMdd-HHmmss (15 chars including dash).
            $backups[0].Name | Should -Match '^settings\.local\.json\.bak\.\d{8}-\d{6}$'
        }
    }

    Context "When existing JSON is malformed (non-empty)" {
        # v1.3.1 silent-overwrite fix. Tests below intentionally use the REAL
        # implementation signature (-ExistingPath / -TemplatePath / -OutputPath)
        # because the contract for malformed-existing changed: it MUST throw,
        # not silently merge into a blank object. Other Contexts in this file
        # still use the aspirational -SettingsPath / -TemplateAllowList API
        # and will need their own alignment pass separately.
        BeforeEach {
            $script:settingsPath = Join-Path $TestDrive 'settings.local.json'
            $script:templatePath = Join-Path $TestDrive 'settings.local.json.template'

            # Existing file: malformed JSON that ALSO contains custom keys the
            # user does not want silently destroyed. The "broken" is the
            # missing closing bracket on the allow array. The denyList + env +
            # apiKeyHelper keys are exactly the kind of state the regression
            # used to wipe.
            $malformed = @'
{
  "permissions": {
    "allow": [
      "Bash(git status)"
  },
  "denyList": ["Bash(rm -rf /)"],
  "env": { "DEBUG": "true" },
  "apiKeyHelper": "/usr/local/bin/get-key.sh"
'@
            Set-Content -Path $script:settingsPath -Value $malformed -Encoding UTF8

            # Template file: valid JSON, real shape used by Merge.
            $tpl = [pscustomobject]@{
                permissions = [pscustomobject]@{
                    allow = $script:templateAllow
                }
            }
            $tpl | ConvertTo-Json -Depth 10 | Set-Content -Path $script:templatePath -Encoding UTF8
        }

        It "Throws hard error (refuse silent overwrite)" {
            {
                Merge-LintasAllowList `
                    -ExistingPath $script:settingsPath `
                    -TemplatePath $script:templatePath `
                    -OutputPath $script:settingsPath `
                    -WarningAction SilentlyContinue
            } | Should -Throw -ExpectedMessage '*refuse to write*'
        }

        It "Writes rescue copy '.malformed.bak.[timestamp]' before throwing" {
            try {
                Merge-LintasAllowList `
                    -ExistingPath $script:settingsPath `
                    -TemplatePath $script:templatePath `
                    -OutputPath $script:settingsPath `
                    -WarningAction SilentlyContinue
            } catch {
                # expected: Merge-LintasAllowList throws on malformed JSON
                Write-Verbose "Expected throw captured: $($_.Exception.Message)"
            }

            $rescue = @(Get-ChildItem -Path $TestDrive -Filter 'settings.local.json.malformed.bak.*' -ErrorAction SilentlyContinue)
            $rescue | Should -Not -BeNullOrEmpty
            $rescue.Count | Should -BeGreaterOrEqual 1
            $rescue[0].Name | Should -Match '^settings\.local\.json\.malformed\.bak\.\d{8}-\d{6}$'

            # Rescue copy must contain the original malformed bytes (proves we
            # captured user state before any rewrite, so they can recover the
            # custom keys by hand).
            $rescueContent = Get-Content -Path $rescue[0].FullName -Raw
            $rescueContent | Should -Match 'denyList'
            $rescueContent | Should -Match 'apiKeyHelper'
        }

        It "Does NOT overwrite original file (custom keys preserved verbatim)" {
            $sha = [System.Security.Cryptography.SHA256]::Create()
            try {
                $originalBytes = [System.IO.File]::ReadAllBytes($script:settingsPath)
                $originalHash = -join ($sha.ComputeHash($originalBytes) | ForEach-Object { $_.ToString('x2') })

                try {
                    Merge-LintasAllowList `
                        -ExistingPath $script:settingsPath `
                        -TemplatePath $script:templatePath `
                        -OutputPath $script:settingsPath `
                        -WarningAction SilentlyContinue
                } catch {
                    # expected: Merge-LintasAllowList throws on malformed JSON
                    Write-Verbose "Expected throw captured: $($_.Exception.Message)"
                }

                $afterBytes = [System.IO.File]::ReadAllBytes($script:settingsPath)
                $afterHash = -join ($sha.ComputeHash($afterBytes) | ForEach-Object { $_.ToString('x2') })

                # Original file untouched: still the same malformed bytes so
                # user can repair or replace it by hand.
                $afterHash | Should -Be $originalHash
            } finally {
                $sha.Dispose()
            }
        }

        It "Logs warning before throwing" {
            $warnings = @()
            try {
                Merge-LintasAllowList `
                    -ExistingPath $script:settingsPath `
                    -TemplatePath $script:templatePath `
                    -OutputPath $script:settingsPath `
                    -WarningVariable warnings `
                    -WarningAction SilentlyContinue
            } catch {
                # expected: Merge-LintasAllowList throws on malformed JSON
                Write-Verbose "Expected throw captured: $($_.Exception.Message)"
            }

            $warnings | Should -Not -BeNullOrEmpty
        }
    }

    Context "When permissions.allow array missing in existing" {
        BeforeEach {
            $script:settingsPath = Join-Path $TestDrive 'settings.local.json'
            # File exists, valid JSON, but no permissions.allow path.
            $seed = [pscustomobject]@{
                otherKey = 'preserved'
            }
            $seed | ConvertTo-Json -Depth 10 | Set-Content -Path $script:settingsPath -Encoding UTF8
        }

        It "Creates permissions.allow array from template" {
            $null = Merge-LintasAllowList `
                -SettingsPath $script:settingsPath `
                -TemplateAllowList $script:templateAllow

            $content = Get-Content -Path $script:settingsPath -Raw | ConvertFrom-Json
            $content.permissions | Should -Not -BeNullOrEmpty
            $content.permissions.allow | Should -Not -BeNullOrEmpty

            foreach ($entry in $script:templateAllow) {
                $content.permissions.allow | Should -Contain $entry
            }
        }
    }

    Context "When other top-level keys exist (e.g. denyList)" {
        # Uses the REAL implementation signature
        # (-ExistingPath / -TemplatePath / -OutputPath), aligned with the
        # "malformed (non-empty)" Context above. Other Contexts in this file
        # still use the aspirational -SettingsPath / -TemplateAllowList API
        # and will need their own alignment pass separately.
        BeforeEach {
            $script:settingsPath = Join-Path $TestDrive 'settings.local.json'
            $script:templatePath = Join-Path $TestDrive 'settings.local.json.template'

            $seed = [pscustomobject]@{
                permissions = [pscustomobject]@{
                    allow = @('Bash(git status)')
                    deny  = @('Bash(rm -rf /)', 'Bash(format-volume)')
                }
                env = [pscustomobject]@{
                    DEBUG = 'true'
                }
                customTopLevel = 'should-survive'
            }
            $seed | ConvertTo-Json -Depth 10 | Set-Content -Path $script:settingsPath -Encoding UTF8

            # Template file with same shape as Merge expects.
            $tpl = [pscustomobject]@{
                permissions = [pscustomobject]@{
                    allow = $script:templateAllow
                }
            }
            $tpl | ConvertTo-Json -Depth 10 | Set-Content -Path $script:templatePath -Encoding UTF8
        }

        It "Preserves other keys" {
            $null = Merge-LintasAllowList `
                -ExistingPath $script:settingsPath `
                -TemplatePath $script:templatePath `
                -OutputPath $script:settingsPath `
                -WarningAction SilentlyContinue

            $content = Get-Content -Path $script:settingsPath -Raw | ConvertFrom-Json

            # Sibling under permissions preserved.
            $content.permissions.deny | Should -Not -BeNullOrEmpty
            $content.permissions.deny | Should -Contain 'Bash(rm -rf /)'
            $content.permissions.deny | Should -Contain 'Bash(format-volume)'

            # Sibling at top level preserved.
            $content.env | Should -Not -BeNullOrEmpty
            $content.env.DEBUG | Should -Be 'true'
            $content.customTopLevel | Should -Be 'should-survive'

            # Template entries also merged into allow.
            foreach ($entry in $script:templateAllow) {
                $content.permissions.allow | Should -Contain $entry
            }
        }
    }
}

# ---------------------------------------------------------------------------
# Tests for collapse-of-superseded entries + length-cap warning (v1.3.1 fix).
#
# These tests target the ACTUAL function signature:
#   Merge-LintasAllowList -ExistingPath -TemplatePath -OutputPath [-DryRun]
# (different from the legacy SettingsPath/TemplateAllowList shape used in
# tests above - those test a separate contract.)
# ---------------------------------------------------------------------------

Describe "Merge-LintasAllowList :: collapse superseded wildcards" {

    BeforeEach {
        $script:existingPath = Join-Path $TestDrive 'settings.local.json'
        $script:templatePath = Join-Path $TestDrive 'settings.template.json'
        Remove-Item -LiteralPath $script:existingPath -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $script:templatePath -ErrorAction SilentlyContinue
    }

    It "Drops bare entry when wildcard sibling exists" {
        # Existing has both forms (legacy state from older kit versions).
        $existing = [pscustomobject]@{
            permissions = [pscustomobject]@{
                allow = @(
                    'Bash(git status)',
                    'Bash(git status:*)',
                    'Bash(custom-keep)'
                )
            }
        }
        $existing | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $script:existingPath -Encoding UTF8

        # Template (canonical: only wildcard form).
        $template = [pscustomobject]@{
            permissions = [pscustomobject]@{
                allow = @('Bash(git status:*)')
            }
        }
        $template | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $script:templatePath -Encoding UTF8

        $result = Merge-LintasAllowList `
            -ExistingPath $script:existingPath `
            -TemplatePath $script:templatePath `
            -OutputPath $script:existingPath

        # Diff IS detected (bare entry dropped).
        $result | Should -BeTrue

        $content = Get-Content -LiteralPath $script:existingPath -Raw | ConvertFrom-Json
        $content.permissions.allow | Should -Not -Contain 'Bash(git status)'
        $content.permissions.allow | Should -Contain 'Bash(git status:*)'
        $content.permissions.allow | Should -Contain 'Bash(custom-keep)'
    }

    It "Preserves bare entry when no wildcard sibling exists" {
        $existing = [pscustomobject]@{
            permissions = [pscustomobject]@{
                allow = @('Bash(git status)')
            }
        }
        $existing | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $script:existingPath -Encoding UTF8

        $template = [pscustomobject]@{
            permissions = [pscustomobject]@{
                allow = @('Bash(git status)')
            }
        }
        $template | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $script:templatePath -Encoding UTF8

        $null = Merge-LintasAllowList `
            -ExistingPath $script:existingPath `
            -TemplatePath $script:templatePath `
            -OutputPath $script:existingPath

        $content = Get-Content -LiteralPath $script:existingPath -Raw | ConvertFrom-Json
        $content.permissions.allow | Should -Contain 'Bash(git status)'
        # No wildcard form should magically appear.
        $content.permissions.allow | Should -Not -Contain 'Bash(git status:*)'
    }

    It "Is idempotent on second run (no diff after collapse)" {
        # Pre-collapsed state.
        $existing = [pscustomobject]@{
            permissions = [pscustomobject]@{
                allow = @('Bash(git status:*)', 'Bash(git diff:*)')
            }
        }
        $existing | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $script:existingPath -Encoding UTF8

        $template = [pscustomobject]@{
            permissions = [pscustomobject]@{
                allow = @('Bash(git status:*)')
            }
        }
        $template | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $script:templatePath -Encoding UTF8

        # First call - no diff (template subset of existing).
        $r1 = Merge-LintasAllowList `
            -ExistingPath $script:existingPath `
            -TemplatePath $script:templatePath `
            -OutputPath $script:existingPath
        $r1 | Should -BeFalse

        # Second call - still no diff.
        $r2 = Merge-LintasAllowList `
            -ExistingPath $script:existingPath `
            -TemplatePath $script:templatePath `
            -OutputPath $script:existingPath
        $r2 | Should -BeFalse
    }

    It "Drops bare even when only template provides wildcard" {
        # Existing has ONLY bare (legacy template); template adds wildcard.
        $existing = [pscustomobject]@{
            permissions = [pscustomobject]@{
                allow = @('Bash(git status)')
            }
        }
        $existing | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $script:existingPath -Encoding UTF8

        $template = [pscustomobject]@{
            permissions = [pscustomobject]@{
                allow = @('Bash(git status:*)')
            }
        }
        $template | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $script:templatePath -Encoding UTF8

        $result = Merge-LintasAllowList `
            -ExistingPath $script:existingPath `
            -TemplatePath $script:templatePath `
            -OutputPath $script:existingPath
        $result | Should -BeTrue

        $content = Get-Content -LiteralPath $script:existingPath -Raw | ConvertFrom-Json
        # Migration path: bare entry replaced by wildcard.
        $content.permissions.allow | Should -Contain 'Bash(git status:*)'
        $content.permissions.allow | Should -Not -Contain 'Bash(git status)'
    }

    It "Does not collapse unrelated entries that happen to share prefix" {
        # "Bash(git push)" should NOT be collapsed by "Bash(git push --force:*)"
        # because the bare counterpart of the wildcard is "Bash(git push --force)",
        # not "Bash(git push)".
        $existing = [pscustomobject]@{
            permissions = [pscustomobject]@{
                allow = @(
                    'Bash(git push)',
                    'Bash(git push --force:*)'
                )
            }
        }
        $existing | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $script:existingPath -Encoding UTF8

        $template = [pscustomobject]@{
            permissions = [pscustomobject]@{
                allow = @()
            }
        }
        $template | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $script:templatePath -Encoding UTF8

        $null = Merge-LintasAllowList `
            -ExistingPath $script:existingPath `
            -TemplatePath $script:templatePath `
            -OutputPath $script:existingPath

        $content = Get-Content -LiteralPath $script:existingPath -Raw | ConvertFrom-Json
        $content.permissions.allow | Should -Contain 'Bash(git push)'
        $content.permissions.allow | Should -Contain 'Bash(git push --force:*)'
    }
}

Describe "Merge-LintasAllowList :: length-cap warning" {

    BeforeEach {
        $script:existingPath = Join-Path $TestDrive 'settings.local.json'
        $script:templatePath = Join-Path $TestDrive 'settings.template.json'
        Remove-Item -LiteralPath $script:existingPath -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $script:templatePath -ErrorAction SilentlyContinue
    }

    It "Emits Write-Warning when total entries exceed threshold (200)" {
        # Bangun template > 200 unique entries.
        $bigList = 1..205 | ForEach-Object { "Bash(synthetic-$_)" }
        $template = [pscustomobject]@{
            permissions = [pscustomobject]@{
                allow = $bigList
            }
        }
        $template | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $script:templatePath -Encoding UTF8

        $warnings = @()
        Merge-LintasAllowList `
            -ExistingPath $script:existingPath `
            -TemplatePath $script:templatePath `
            -OutputPath $script:existingPath `
            -WarningVariable warnings `
            -WarningAction SilentlyContinue | Out-Null

        $warnings | Should -Not -BeNullOrEmpty
        ($warnings -join ' ') | Should -Match '205'
    }

    It "Does NOT emit threshold warning for small lists" {
        $smallList = 1..10 | ForEach-Object { "Bash(synthetic-$_)" }
        $template = [pscustomobject]@{
            permissions = [pscustomobject]@{
                allow = $smallList
            }
        }
        $template | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $script:templatePath -Encoding UTF8

        $warnings = @()
        Merge-LintasAllowList `
            -ExistingPath $script:existingPath `
            -TemplatePath $script:templatePath `
            -OutputPath $script:existingPath `
            -WarningVariable warnings `
            -WarningAction SilentlyContinue | Out-Null

        # No threshold warning. (Other warnings unrelated to threshold may still
        # appear in malformed-JSON contexts elsewhere; here we assert specifically
        # NO threshold-related warning.)
        $thresholdWarnings = $warnings | Where-Object { $_ -match 'permission.surface|principle.of.least.privilege|> threshold' }
        $thresholdWarnings | Should -BeNullOrEmpty
    }
}

Describe "Compress-SupersededAllowEntry :: direct invocation" {

    It "Returns empty for empty input" {
        $r = Compress-SupersededAllowEntry -Entries @()
        $r.Count | Should -Be 0
    }

    It "Returns empty for `$null input" {
        $r = Compress-SupersededAllowEntry -Entries $null
        $r.Count | Should -Be 0
    }

    It "Idempotent on already-collapsed list" {
        $entries = @('Bash(git status:*)', 'Read(*)', 'Bash(custom)')
        $r1 = Compress-SupersededAllowEntry -Entries $entries
        $r2 = Compress-SupersededAllowEntry -Entries $r1
        # Same content (order may differ in general, but algo preserves order).
        @($r1).Count | Should -Be @($r2).Count
        foreach ($e in $r1) { $r2 | Should -Contain $e }
    }

    It "Collapses multiple superseded pairs in one pass" {
        $entries = @(
            'Bash(git status)', 'Bash(git status:*)',
            'Bash(git diff)',   'Bash(git diff:*)',
            'Read(*)'
        )
        $r = Compress-SupersededAllowEntry -Entries $entries
        $r | Should -Not -Contain 'Bash(git status)'
        $r | Should -Not -Contain 'Bash(git diff)'
        $r | Should -Contain 'Bash(git status:*)'
        $r | Should -Contain 'Bash(git diff:*)'
        $r | Should -Contain 'Read(*)'
    }
}
