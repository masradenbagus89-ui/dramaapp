#Requires -Module Pester

# READ-ONLY static tests untuk batch keamanan v1.15.0:
#   - secret-guard.yml      : penjaga kebocoran rahasia (tolak commit .env asli)
#   - audit-access.yml      : pengingat cek-akses bulanan (buka Issue, TIDAK mencabut akses)
#   - THREAT_MODEL_NON_LEGAL.md : peta ancaman tim tanpa jalur hukum
# Tes ini cuma MEMBACA berkas lalu assert strukturnya. Tidak menjalankan apa pun.

BeforeAll {
    $script:Root = Resolve-Path (Join-Path $PSScriptRoot '..')
    $script:SecretGuard = Join-Path $script:Root 'templates/github/workflows/secret-guard.yml'
    $script:AuditAccess = Join-Path $script:Root 'templates/github/workflows/audit-access.yml'
    $script:ThreatModel = Join-Path $script:Root 'templates/THREAT_MODEL_NON_LEGAL.md'
    $script:Psd1Text = Get-Content -Raw (Join-Path $script:Root 'lib/kit-files.psd1')
    $script:SetupText = Get-Content -Raw (Join-Path $script:Root 'setup-pola-b.ps1')
    $script:SecretGuardText = if (Test-Path $script:SecretGuard) { Get-Content -Raw $script:SecretGuard } else { '' }
    $script:AuditAccessText = if (Test-Path $script:AuditAccess) { Get-Content -Raw $script:AuditAccess } else { '' }
}

Describe "v1.15.0 keamanan: berkas ada + terdaftar + ikut terpasang" {
    It "secret-guard.yml ada di disk" {
        Test-Path $script:SecretGuard | Should -BeTrue
    }
    It "audit-access.yml ada di disk" {
        Test-Path $script:AuditAccess | Should -BeTrue
    }
    It "THREAT_MODEL_NON_LEGAL.md ada di disk" {
        Test-Path $script:ThreatModel | Should -BeTrue
    }
    It "secret-guard.yml terdaftar di kit-files.psd1" {
        $script:Psd1Text | Should -Match 'templates/github/workflows/secret-guard\.yml'
    }
    It "audit-access.yml terdaftar di kit-files.psd1" {
        $script:Psd1Text | Should -Match 'templates/github/workflows/audit-access\.yml'
    }
    It "THREAT_MODEL_NON_LEGAL.md terdaftar di kit-files.psd1" {
        $script:Psd1Text | Should -Match 'templates/THREAT_MODEL_NON_LEGAL\.md'
    }
    It "secret-guard.yml ikut disalin ke proyek staf (teamFiles)" {
        $script:SetupText | Should -Match 'secret-guard\.yml'
    }
    It "audit-access.yml ikut disalin ke proyek staf (teamFiles)" {
        $script:SetupText | Should -Match 'audit-access\.yml'
    }
    It "THREAT_MODEL ikut disalin ke proyek staf (teamFiles)" {
        $script:SetupText | Should -Match 'THREAT_MODEL_NON_LEGAL\.md'
    }
}

Describe "secret-guard.yml: blokir aman + tanpa alarm-palsu" {
    It "memblokir commit saat gagal (ada exit 1)" {
        $script:SecretGuardText | Should -Match 'exit 1'
    }
    It "mengecualikan file contoh (.example/.sample/.template, termasuk jamak) dari blokir .env" {
        $script:SecretGuardText | Should -Match 'examples\?'
        $script:SecretGuardText | Should -Match 'templates\?'
    }
    It "tidak mencetak NILAI rahasia ke log (pakai grep -l = nama berkas saja)" {
        $script:SecretGuardText | Should -Match 'grep -lIE'
    }
    It "memindai token JWT (eyJ...) - kunci 'gudang emas' (regresi v1.35.0)" {
        $script:SecretGuardText | Should -Match 'eyJ'
    }
    It "memindai alamat database ber-password / connection string (postgres + mysql + mongodb)" {
        $script:SecretGuardText | Should -Match 'postgres'
        $script:SecretGuardText | Should -Match 'mysql'
        $script:SecretGuardText | Should -Match 'mongodb'
    }
    It "hak akses minimum: contents read (bukan write)" {
        $script:SecretGuardText | Should -Match 'contents:\s*read'
    }
    It "tidak butuh secret apa pun (tidak ada ANTHROPIC/GITHUB token di env step)" {
        $script:SecretGuardText | Should -Not -Match 'secrets\.'
    }
}

Describe "audit-access.yml: pengingat saja, bukan auto-cabut" {
    It "terjadwal bulanan (ada schedule + cron)" {
        $script:AuditAccessText | Should -Match 'schedule:'
        $script:AuditAccessText | Should -Match 'cron:'
    }
    It "hak akses minimum: issues write (bukan contents/admin)" {
        $script:AuditAccessText | Should -Match 'issues:\s*write'
    }
    It "TIDAK mencabut akses otomatis (tanpa DELETE / removeCollaborator)" {
        $script:AuditAccessText | Should -Not -Match 'removeCollaborator|--method DELETE|method:\s*.DELETE.|DELETE /repos'
    }
    It "pakai github-script resmi (tanpa npm install)" {
        $script:AuditAccessText | Should -Match 'actions/github-script'
    }
}
