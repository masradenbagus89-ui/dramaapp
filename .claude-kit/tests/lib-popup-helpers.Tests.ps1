#Requires -Module Pester

# Tests for lib/popup-helpers.ps1
#
# Background: popup-helpers.ps1 is tracked in lib/kit-files.psd1 (lib_files)
# so setup-pola-b.ps1 hashes it into .install-manifest.json and HMAC-signs it.
# Tamper detection IS active. CI contract verification was missing -- this file
# closes that gap (Round 2 finding).
#
# Two contracts asserted:
#   (a) Test-LintasHeadless returns $true when [Environment]::UserInteractive
#       reports non-interactive (cache-injection technique: pre-set the
#       script-scope cache and verify the function honors it on subsequent
#       calls -- the cache itself is set ONLY when the early probe in
#       Test-LintasHeadless decides headless, so seeding it simulates
#       "previous probe said headless").
#   (b) Static AST contract test: each Show-Lintas* function must declare the
#       canonical parameter names used by setup-pola-b.ps1 call sites. Caught
#       via [System.Management.Automation.Language.Parser]::ParseFile +
#       ParamBlock inspection. This is the test that WOULD HAVE caught
#       Finding #1 (parameter-name mismatch) before ship.

BeforeAll {
    $script:libPath = Join-Path $PSScriptRoot '..\lib\popup-helpers.ps1'
    . $script:libPath

    # Parse the popup-helpers script ONCE via AST for contract tests.
    $tokens = $null
    $parseErrors = $null
    $script:popupAst = [System.Management.Automation.Language.Parser]::ParseFile(
        $script:libPath,
        [ref]$tokens,
        [ref]$parseErrors
    )
    if ($parseErrors -and $parseErrors.Count -gt 0) {
        throw "popup-helpers.ps1 has parse errors: $($parseErrors -join '; ')"
    }

    # Helper: extract declared parameter names for a function definition.
    function Get-FunctionParamName {
        param(
            [System.Management.Automation.Language.ScriptBlockAst]$Ast,
            [string]$FunctionName
        )
        # Capture in local var so PSScriptAnalyzer detects usage across nested scriptblock.
        $targetName = $FunctionName
        $fnAst = $Ast.FindAll({
            param($node)
            $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
            $node.Name -eq $targetName
        }.GetNewClosure(), $true) | Select-Object -First 1

        if (-not $fnAst) { return @() }

        $paramBlock = $fnAst.Body.ParamBlock
        if (-not $paramBlock) { return @() }

        return $paramBlock.Parameters | ForEach-Object { $_.Name.VariablePath.UserPath }
    }
}

Describe "Test-LintasHeadless" {
    BeforeEach {
        # Reset cache before each test so probes re-run.
        Set-Variable -Name 'LintasHeadless' -Scope Script -Value $null
        Set-Variable -Name 'LintasGuiAvailable' -Scope Script -Value $null
    }

    It "Function exists and is invokable" {
        Get-Command Test-LintasHeadless -ErrorAction SilentlyContinue | Should -Not -BeNullOrEmpty
    }

    It "Returns [bool]" {
        $result = Test-LintasHeadless
        $result | Should -BeOfType [bool]
    }

    It "Honors cached value (script:LintasHeadless = `$true) on subsequent calls" {
        # Seed cache to simulate "previous probe decided headless".
        # Test-LintasHeadless returns the cache immediately when non-null.
        Set-Variable -Name 'LintasHeadless' -Scope Script -Value $true
        Test-LintasHeadless | Should -BeTrue
    }

    It "Honors cached value (script:LintasHeadless = `$false) on subsequent calls" {
        Set-Variable -Name 'LintasHeadless' -Scope Script -Value $false
        Test-LintasHeadless | Should -BeFalse
    }

    It "Caches result across calls (second call hits cache)" {
        Set-Variable -Name 'LintasHeadless' -Scope Script -Value $null
        $first = Test-LintasHeadless
        # If cache works, second call returns same value without re-probing.
        $second = Test-LintasHeadless
        $second | Should -Be $first
    }
}

Describe "Test-LintasGuiAvailable" {
    BeforeEach {
        Set-Variable -Name 'LintasGuiAvailable' -Scope Script -Value $null
        Set-Variable -Name 'LintasHeadless' -Scope Script -Value $null
    }

    It "Function exists and is invokable" {
        Get-Command Test-LintasGuiAvailable -ErrorAction SilentlyContinue | Should -Not -BeNullOrEmpty
    }

    It "Returns [bool]" {
        $result = Test-LintasGuiAvailable
        $result | Should -BeOfType [bool]
    }

    It "Returns `$false when headless cache is `$true (no GUI on headless)" {
        # If headless probe says yes, GuiAvailable must be no even if assemblies load.
        Set-Variable -Name 'LintasGuiAvailable' -Scope Script -Value $null
        Set-Variable -Name 'LintasHeadless' -Scope Script -Value $true
        Test-LintasGuiAvailable | Should -BeFalse
    }
}

Describe "Show-Lintas* parameter contract (AST static check)" {
    # These are the EXACT parameter names that setup-pola-b.ps1 binds at call
    # sites. If any popup function drops/renames a parameter, the script breaks
    # at runtime. This test catches drift at CI time instead.
    #
    # Canonical contract sourced from setup-pola-b.ps1 call sites:
    #   line ~461  Show-LintasChoicePopup -Title -Message -Options -DefaultIndex
    #   line ~817  Show-LintasInputPopup  -Title -Message -DefaultValue
    #   line ~866  Show-LintasYesNoPopup  -Title -Message
    #   line ~883  Show-LintasInfoPopup   -Title -Message

    It "Show-LintasYesNoPopup declares Title and Message parameters" {
        $params = Get-FunctionParamName -Ast $script:popupAst -FunctionName 'Show-LintasYesNoPopup'
        $params | Should -Contain 'Title'
        $params | Should -Contain 'Message'
    }

    It "Show-LintasInfoPopup declares Title and Message parameters" {
        $params = Get-FunctionParamName -Ast $script:popupAst -FunctionName 'Show-LintasInfoPopup'
        $params | Should -Contain 'Title'
        $params | Should -Contain 'Message'
    }

    It "Show-LintasInputPopup declares Title, Message, and DefaultValue parameters" {
        $params = Get-FunctionParamName -Ast $script:popupAst -FunctionName 'Show-LintasInputPopup'
        $params | Should -Contain 'Title'
        $params | Should -Contain 'Message'
        $params | Should -Contain 'DefaultValue'
    }

    It "Show-LintasChoicePopup declares Title, Message, Options, and DefaultIndex parameters" {
        $params = Get-FunctionParamName -Ast $script:popupAst -FunctionName 'Show-LintasChoicePopup'
        $params | Should -Contain 'Title'
        $params | Should -Contain 'Message'
        $params | Should -Contain 'Options'
        $params | Should -Contain 'DefaultIndex'
    }

    It "Show-LintasChoicePopup Options parameter is typed [string[]]" {
        # Call sites pass an @('a','b','c') string array. Drift to [object[]] or
        # [string] would silently accept then throw at radio-button binding.
        $fnAst = $script:popupAst.FindAll({
            param($node)
            $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
            $node.Name -eq 'Show-LintasChoicePopup'
        }, $true) | Select-Object -First 1

        $optionsParam = $fnAst.Body.ParamBlock.Parameters |
            Where-Object { $_.Name.VariablePath.UserPath -eq 'Options' }

        $optionsParam | Should -Not -BeNullOrEmpty
        $optionsParam.StaticType.FullName | Should -Be 'System.String[]'
    }
}

Describe "Show-Lintas* / setup-pola-b.ps1 call-site binding match" {
    # Parse setup-pola-b.ps1 and verify every Show-Lintas* invocation only uses
    # parameter names that the corresponding function declares. This is the
    # bidirectional half of the contract: above tests prove the function side,
    # this proves the caller side. Together they prevent the
    # "parameter-name mismatch" class of bug (Finding #1) from re-shipping.

    BeforeAll {
        $setupPath = Join-Path $PSScriptRoot '..\setup-pola-b.ps1'
        $tokens = $null
        $parseErrors = $null
        $script:setupAst = [System.Management.Automation.Language.Parser]::ParseFile(
            $setupPath,
            [ref]$tokens,
            [ref]$parseErrors
        )
        # setup-pola-b.ps1 may have benign parse warnings; only fail on real errors.
        $realErrors = $parseErrors | Where-Object { $_.IncompleteInput -eq $false }
        if ($realErrors -and $realErrors.Count -gt 0) {
            throw "setup-pola-b.ps1 has parse errors: $($realErrors -join '; ')"
        }

        # Collect all parameter names used in each Show-Lintas* call site.
        $script:callSiteParams = @{}
        $invocations = $script:setupAst.FindAll({
            param($node)
            $node -is [System.Management.Automation.Language.CommandAst]
        }, $true)

        foreach ($inv in $invocations) {
            $cmdName = $inv.GetCommandName()
            if ($cmdName -and $cmdName -like 'Show-Lintas*') {
                if (-not $script:callSiteParams.ContainsKey($cmdName)) {
                    $script:callSiteParams[$cmdName] = @{}
                }
                foreach ($element in $inv.CommandElements) {
                    if ($element -is [System.Management.Automation.Language.CommandParameterAst]) {
                        $script:callSiteParams[$cmdName][$element.ParameterName] = $true
                    }
                }
            }
        }
    }

    It "Every parameter bound at Show-Lintas* call site exists in the function definition" {
        $violations = @()
        foreach ($cmdName in $script:callSiteParams.Keys) {
            $declared = Get-FunctionParamName -Ast $script:popupAst -FunctionName $cmdName
            foreach ($usedParam in $script:callSiteParams[$cmdName].Keys) {
                if ($declared -notcontains $usedParam) {
                    $violations += "${cmdName}: -$usedParam not declared (declared: $($declared -join ', '))"
                }
            }
        }
        $violations | Should -BeNullOrEmpty -Because "setup-pola-b.ps1 binds parameter names that do not exist on the popup function"
    }
}

# ----------------------------------------------------------------------------
# Tests for the 3 enforcement helpers added in v1.11.0 (Format-LintasChoiceLine,
# Show-LintasNumberedChoicePopup, Show-LintasSecurityChoicePopup). v1.13.0 closes
# the gap flagged by the full-scan audit: these "enforcement" helpers shipped
# with zero tests despite the kit claiming "caller tak bisa salah format".
# Format-LintasChoiceLine is the shared formatting engine both GUI helpers
# delegate to, so testing it covers RULE-1..5 enforcement directly.
# ----------------------------------------------------------------------------

Describe "Format-LintasChoiceLine (RULE-1..5 formatting engine)" {
    It "Function exists and is invokable" {
        Get-Command Format-LintasChoiceLine -ErrorAction SilentlyContinue | Should -Not -BeNullOrEmpty
    }

    It "Returns a [string]" {
        $opts = @(
            @{ Label = 'Ya'; Recommended = $true; SpecialKey = $null },
            @{ Label = 'Tidak'; Recommended = $false; SpecialKey = $null }
        )
        (Format-LintasChoiceLine -Options $opts -DefaultIndex 0) | Should -BeOfType [string]
    }

    It "Numbered options get ascending [1] [2] prefixes (RULE-1)" {
        $opts = @(
            @{ Label = 'Satu'; Recommended = $false; SpecialKey = $null },
            @{ Label = 'Dua'; Recommended = $false; SpecialKey = $null }
        )
        $out = Format-LintasChoiceLine -Options $opts -DefaultIndex 0 -Layout 'multiline'
        $out | Should -Match '\[1\] Satu'
        $out | Should -Match '\[2\] Dua'
    }

    It "Recommended default option gets '(rekomendasi, default)' suffix (RULE-2)" {
        $opts = @(
            @{ Label = 'Lanjut'; Recommended = $true; SpecialKey = $null },
            @{ Label = 'Batal'; Recommended = $false; SpecialKey = $null }
        )
        $out = Format-LintasChoiceLine -Options $opts -DefaultIndex 0
        $out | Should -Match '\(rekomendasi, default\)'
    }

    It "Recommended non-default option gets '(rekomendasi)' suffix (RULE-2)" {
        $opts = @(
            @{ Label = 'Batal'; Recommended = $false; SpecialKey = $null },
            @{ Label = 'Lanjut'; Recommended = $true; SpecialKey = $null }
        )
        $out = Format-LintasChoiceLine -Options $opts -DefaultIndex 0
        $out | Should -Match 'Lanjut \(rekomendasi\)'
    }

    It "Whitelisted SpecialKey renders as [skip] prefix, not a number (RULE-3)" {
        $opts = @(
            @{ Label = 'Kerjakan'; Recommended = $true; SpecialKey = $null },
            @{ Label = 'Lewati'; Recommended = $false; SpecialKey = 'skip' }
        )
        $out = Format-LintasChoiceLine -Options $opts -DefaultIndex 0 -Layout 'multiline'
        $out | Should -Match '\[skip\] Lewati'
    }

    It "Non-whitelist SpecialKey throws (RULE-3 enforcement)" {
        $opts = @(
            @{ Label = 'Aneh'; Recommended = $false; SpecialKey = 'destroy' }
        )
        { Format-LintasChoiceLine -Options $opts -DefaultIndex 0 } | Should -Throw -ExpectedMessage '*whitelist*'
    }

    It "Empty Options array throws" {
        { Format-LintasChoiceLine -Options @() -DefaultIndex 0 } | Should -Throw
    }

    It "Includes the RULE-5 confirmation line" {
        $opts = @(
            @{ Label = 'Ya'; Recommended = $true; SpecialKey = $null },
            @{ Label = 'Tidak'; Recommended = $false; SpecialKey = $null }
        )
        $out = Format-LintasChoiceLine -Options $opts -DefaultIndex 0
        $out | Should -Match 'Default \(Enter/kosong\) ->'
    }

    It "More than 4 options forces multiline layout (RULE-4)" {
        $opts = @(
            @{ Label = 'A'; Recommended = $false; SpecialKey = $null },
            @{ Label = 'B'; Recommended = $false; SpecialKey = $null },
            @{ Label = 'C'; Recommended = $false; SpecialKey = $null },
            @{ Label = 'D'; Recommended = $false; SpecialKey = $null },
            @{ Label = 'E'; Recommended = $false; SpecialKey = $null }
        )
        $out = Format-LintasChoiceLine -Options $opts -DefaultIndex 0 -Layout 'auto'
        # multiline puts each option on its own indented line under a 'Pilihan:' header
        $out | Should -Match "Pilihan:`n"
    }
}

Describe "Numbered/Security popup parameter contract (AST static check)" {
    It "Show-LintasNumberedChoicePopup declares Title, Message, Options, DefaultIndex" {
        $params = Get-FunctionParamName -Ast $script:popupAst -FunctionName 'Show-LintasNumberedChoicePopup'
        $params | Should -Contain 'Title'
        $params | Should -Contain 'Message'
        $params | Should -Contain 'Options'
        $params | Should -Contain 'DefaultIndex'
    }

    It "Show-LintasSecurityChoicePopup declares Title, RiskStatement, Preview, Options" {
        $params = Get-FunctionParamName -Ast $script:popupAst -FunctionName 'Show-LintasSecurityChoicePopup'
        $params | Should -Contain 'Title'
        $params | Should -Contain 'RiskStatement'
        $params | Should -Contain 'Preview'
        $params | Should -Contain 'Options'
    }
}

Describe "Show-LintasSecurityChoicePopup RULE-6 safe-default enforcement" {
    BeforeEach {
        Set-Variable -Name 'LintasHeadless' -Scope Script -Value $null
        Set-Variable -Name 'LintasGuiAvailable' -Scope Script -Value $null
    }
    AfterEach {
        Set-Variable -Name 'LintasHeadless' -Scope Script -Value $null
        Set-Variable -Name 'LintasGuiAvailable' -Scope Script -Value $null
    }

    It "Throws RULE-6 when no safe-default option (cancel/skip/stop) is present" {
        # Force GUI 'available' via cache so we get PAST the GUI check and actually
        # exercise the RULE-6 safe-default loop (Test-LintasGuiAvailable honors cache).
        Set-Variable -Name 'LintasHeadless' -Scope Script -Value $false
        Set-Variable -Name 'LintasGuiAvailable' -Scope Script -Value $true
        Test-LintasGuiAvailable | Should -BeTrue
        $unsafe = @(
            @{ Label = 'Hapus sekarang'; Recommended = $false; SpecialKey = $null },
            @{ Label = 'Hapus paksa'; Recommended = $false; SpecialKey = $null }
        )
        { Show-LintasSecurityChoicePopup -Title 'X' -RiskStatement 'Y' -Options $unsafe } |
            Should -Throw -ExpectedMessage '*RULE-6*'
    }

    It "Show-LintasNumberedChoicePopup refuses to render when GUI is unavailable (headless)" {
        Set-Variable -Name 'LintasGuiAvailable' -Scope Script -Value $false
        $opts = @(
            @{ Label = 'Ya'; Recommended = $true; SpecialKey = $null },
            @{ Label = 'Tidak'; Recommended = $false; SpecialKey = $null }
        )
        { Show-LintasNumberedChoicePopup -Title 'X' -Message 'Y' -Options $opts -DefaultIndex 0 } |
            Should -Throw -ExpectedMessage '*GUI not available*'
    }
}
