#Requires -Module Pester

<#
.SYNOPSIS
  Pester 5+ guard: 8 Skill Divisi WAJIB (bagian 4.13) tetap utuh + konsisten antar berkas.

.DESCRIPTION
  Fitur v1.35.0: tiap install lintasAI WAJIB otomatis punya 8 skill divisi profesional
  (Backend, Frontend, Database, Webdesign, UI/UX, DevOps, Cyber Security, SEO) yang
  TIDAK boleh dihapus tapi BOLEH ditambah.

  Yang dijaga (anti-drift):
    A) Stub aturan 4.13 ada di CLAUDE_universal_v1.md (auto-load) dengan status WAJIB +
       pemicu "skill <divisi>" + larangan hapus + izin tambah.
    B) Detail per-skill 4.13 ada di LINTASAI_WORKFLOWS_v1.md (on-demand).
    C) KEDELAPAN nama divisi muncul di bagian 4.13 KEDUA berkas (kalau satu hilang = drift).
    D) Aturan anti-bentrok dgn 4.9 ("lokal boleh perluas, tak boleh matikan baseline") ada.

  Statis: cuma baca teks 2 berkas aturan. Tidak menjalankan apa pun.
  Catatan: berkas ini dijaga ASCII-only (tanpa BOM) supaya lulus PSScriptAnalyzer.
#>

BeforeAll {
    $script:Root = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path

    function Get-Section413 {
        param([string]$Path)
        $raw = Get-Content -LiteralPath $Path -Raw
        $start = $raw.IndexOf('## 4.13')
        if ($start -lt 0) { return '' }
        $rest = $raw.Substring($start)
        # Heading top-level berikutnya setelah judul 4.13 (cari "\n## " mulai setelah karakter awal).
        $next = $rest.IndexOf("`n## ", 4)
        if ($next -gt 0) { return $rest.Substring(0, $next) }
        return $rest
    }

    $script:Universal     = Join-Path $script:Root 'CLAUDE_universal_v1.md'
    $script:Workflows     = Join-Path $script:Root 'LINTASAI_WORKFLOWS_v1.md'
    $script:UnivSection   = Get-Section413 -Path $script:Universal
    $script:WflowSection  = Get-Section413 -Path $script:Workflows
}

Describe "8 Skill Divisi WAJIB (4.13) - stub aturan auto-load (CLAUDE_universal_v1.md)" {
    It "punya bagian 4.13" {
        $script:UnivSection | Should -Not -BeNullOrEmpty
        $script:UnivSection | Should -Match '4\.13'
    }
    It "menyatakan status WAJIB + tak boleh dihapus" {
        $script:UnivSection.ToUpper() | Should -Match 'TAK BOLEH DIHAPUS'
    }
    It "menyatakan boleh ditambah" {
        $script:UnivSection.ToUpper() | Should -Match 'BOLEH DITAMBAH'
    }
    It "menyebut pemicu 'skill <divisi>'" {
        $script:UnivSection | Should -Match 'skill <divisi>'
    }
    It "memuat KEDELAPAN nama divisi: <_>" -ForEach @('Backend', 'Frontend', 'Database', 'Webdesign', 'UI/UX', 'DevOps', 'Cyber Security', 'SEO') {
        $script:UnivSection.Contains($_) | Should -BeTrue -Because "divisi '$_' WAJIB ada di stub baseline (kalau hilang = drift)"
    }
    It "merujuk pengecualian anti-bentrok ke 4.9" {
        $script:UnivSection | Should -Match '4\.9'
    }
    It "menegaskan penerapan OTOMATIS tanpa staff mengetik 'skill'" {
        $script:UnivSection.ToUpper() | Should -Match 'OTOMATIS'
    }
    It "menyatakan cocok di semua topologi" {
        $script:UnivSection.ToLower() | Should -Match 'topologi'
    }
}

Describe "8 Skill Divisi WAJIB (4.13) - detail per-skill (LINTASAI_WORKFLOWS_v1.md)" {
    It "punya bagian 4.13" {
        $script:WflowSection | Should -Not -BeNullOrEmpty
        $script:WflowSection | Should -Match '4\.13'
    }
    It "memuat KEDELAPAN nama divisi: <_>" -ForEach @('Backend', 'Frontend', 'Database', 'Webdesign', 'UI/UX', 'DevOps', 'Cyber Security', 'SEO') {
        $script:WflowSection.Contains($_) | Should -BeTrue -Because "divisi '$_' WAJIB punya checklist di detail (kalau hilang = drift)"
    }
    It "memuat pemicu fokus per divisi (mis. 'skill backend' + 'skill seo')" {
        $script:WflowSection.ToLower() | Should -Match 'skill backend'
        $script:WflowSection.ToLower() | Should -Match 'skill seo'
    }
    It "menegaskan baseline = lantai (tak boleh dimatikan skill lokal)" {
        $script:WflowSection.ToLower() | Should -Match 'lantai'
    }
    It "memetakan 3 topologi (monorepo + split + multi-repo)" {
        $s = $script:WflowSection.ToLower()
        $s | Should -Match 'topologi'
        $s | Should -Match 'monorepo'
        $s | Should -Match 'split'
        $s | Should -Match 'multi-repo'
    }
    It "menegaskan Cyber Security selalu primer di semua repo" {
        $script:WflowSection.ToLower() | Should -Match 'cyber security selalu primer'
    }
}

Describe "Skill kustom (4.9) tersambung ke pengecualian baseline (4.13)" {
    It "CLAUDE_universal_v1.md 4.9 menyebut pengecualian 8 skill divisi WAJIB" {
        $raw = Get-Content -LiteralPath $script:Universal -Raw
        $raw | Should -Match 'Pengecualian 8 skill divisi WAJIB'
    }
}

Describe "8 Skill Divisi (4.13) - pendalaman v1.46.0 (pinjam ECC, dikunci anti-rot)" {
    It "UI/UX memuat standar aksesibilitas WCAG 2.2" {
        $script:WflowSection | Should -Match 'WCAG 2\.2'
    }
    It "UI/UX menyebut ARIA untuk komponen non-standar" {
        $script:WflowSection | Should -Match 'ARIA'
    }
    It "Backend memuat checklist desain API" {
        $script:WflowSection | Should -Match 'Desain API rapi'
    }
    It "Backend melarang menelan error (anti silent failure)" {
        $script:WflowSection.ToLower() | Should -Match 'silent failure'
    }
    It "Backend mengarahkan cek dokumentasi library eksternal (anti-halusinasi)" {
        $script:WflowSection | Should -Match 'Context7'
    }
    It "mencantumkan kredit sumber ECC (lisensi MIT)" {
        $script:WflowSection | Should -Match 'ECC v2\.0\.0'
    }
}

Describe "Paket Stack (4.14) - stack packs ada + cakup stack inti (dikunci anti-rot)" {
    BeforeAll { $script:WflowRaw = Get-Content -LiteralPath $script:Workflows -Raw }
    It "punya bagian 4.14 Paket Stack" {
        $script:WflowRaw | Should -Match '4\.14'
        $script:WflowRaw | Should -Match 'Paket Stack'
    }
    It "mencakup stack inti: <_>" -ForEach @('Next.js', 'Supabase', 'wrangler', 'NEXT_PUBLIC', 'RLS', 'OWASP', 'Python', 'bandit', 'FastAPI') {
        $script:WflowRaw.Contains($_) | Should -BeTrue -Because "paket stack '$_' WAJIB ada di 4.14 (kalau hilang = drift)"
    }
    It "ter-wire dari checklist 4.13 (auto-apply DI ATAS baseline)" {
        $script:WflowSection | Should -Match '4\.14'
    }
    It "CLAUDE_universal stub 4.13 menyebut Paket Stack 4.14 (auto-trigger always-load)" {
        $script:UnivSection | Should -Match '4\.14'
    }
}

Describe "5 Pola Bantu (4.15) - perbaiki-error + coverage + pindai-permukaan-AI + uji-situs + tahan-gagal (dikunci anti-rot)" {
    BeforeAll { $script:WflowRaw2 = Get-Content -LiteralPath $script:Workflows -Raw }
    It "punya bagian 4.15" {
        $script:WflowRaw2 | Should -Match '4\.15'
    }
    It "memuat 5 pola inti: <_>" -ForEach @('Perbaiki Error', 'Cakupan Tes', 'Permukaan-AI', 'Uji Situs', 'Tahan-Gagal') {
        $script:WflowRaw2.Contains($_) | Should -BeTrue -Because "pola '$_' WAJIB ada di 4.15"
    }
    It "pola pindai-permukaan-AI menyebut MCP + izin/hook" {
        $script:WflowRaw2.Contains('.mcp.json') | Should -BeTrue
        $script:WflowRaw2.Contains('settings.json') | Should -BeTrue
    }
    It "CLAUDE_universal stub menyebut 5 Pola Bantu 4.15 (auto-trigger always-load)" {
        $script:UnivSection | Should -Match '4\.15'
    }
}
