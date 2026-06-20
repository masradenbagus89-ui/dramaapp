# tests/modify-workflow-rule.Tests.ps1
# Pengunci v1 (anti-rot) untuk aturan 7.3a:
#   "Task MODIFIKASI: dokumen untuk NAVIGASI, kode asli WAJIB dibaca sebelum edit".
#
# Kenapa tes ini ada:
#   Aturan 7.3a mudah "ngumpet" di satu sub-section lalu terlupa / terhapus saat
#   seseorang menyunting berkas aturan. Tes ini bikin SUITE MERAH kalau wiring 7.3a
#   hilang dari salah satu dari 3 tempat wajibnya:
#     (1) alur inti seksi 3 (Workflow per task)         -> penunjuk ke 7.3a
#     (2) checklist Definition of Done seksi 4           -> checkbox kode-asli-sebelum-edit
#     (3) berkas pola tugas LINTASAI_WORKFLOWS_v1.md 4.2 -> gema aturan 7.3a
#   plus menjaga bahwa catatan penjaga bawaan "Read-before-Edit" tetap terdokumentasi.
#
# Catatan: SEMUA pola di tes ini sengaja ASCII (tanpa karakter section/non-latin)
#   supaya tidak rusak saat dibaca Windows PowerShell 5.1.

BeforeAll {
    $script:RepoRoot  = Split-Path -Parent $PSScriptRoot
    $script:Universal = Get-Content (Join-Path $script:RepoRoot 'CLAUDE_universal_v1.md') -Raw -Encoding UTF8
    $script:Workflows = Get-Content (Join-Path $script:RepoRoot 'LINTASAI_WORKFLOWS_v1.md') -Raw -Encoding UTF8
}

Describe "Aturan 7.3a (baca kode asli sebelum edit) ter-wire anti-rot" {

    It "Section 7.3a tetap ADA di CLAUDE_universal_v1.md" {
        $script:Universal | Should -Match '### 7\.3a Task MODIFIKASI'
    }

    It "7.3a tetap memuat kalimat-inti (dokumen untuk navigasi, kode untuk mengubah)" {
        $script:Universal | Should -Match 'Dokumen untuk MENAVIGASI, kode asli untuk MENGUBAH'
    }

    It "7.3a tetap mewajibkan baca KODE ASLI berkas target sebelum edit" {
        $script:Universal | Should -Match 'baca KODE ASLI berkas yang akan diubah'
    }

    It "7.3a mendokumentasikan penjaga otomatis bawaan Claude Code (Read-before-Edit)" {
        $script:Universal | Should -Match 'Read-before-Edit'
    }

    It "7.3a merujuk tes-pengunci ini (self-reference, anti hapus diam-diam)" {
        $script:Universal | Should -Match 'tests/modify-workflow-rule\.Tests\.ps1'
    }

    It "Alur inti seksi 3 MENUNJUK ke 7.3a untuk task ubah/tambah/hapus" {
        # Frasa ini sengaja unik ke langkah Read di seksi 3.
        $script:Universal | Should -Match 'baca kode asli berkas target SEBELUM edit'
    }

    It "Checklist Definition of Done seksi 4 punya checkbox kode-asli-sebelum-edit" {
        $script:Universal | Should -Match '- \[ \] \*\*Baca kode asli sebelum mengedit'
    }

    It "Berkas pola LINTASAI_WORKFLOWS_v1.md menggemakan aturan 7.3a" {
        $script:Workflows | Should -Match '7\.3a'
        $script:Workflows | Should -Match 'baca KODE ASLI berkas target'
    }
}
