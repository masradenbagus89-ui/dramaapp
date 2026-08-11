// engine/consistency-check-data.mjs - REGISTRY DATA "MODE KIT" untuk robot pemeriksa kecocokan.
//
// Diekstrak dari engine/consistency-check.mjs (putaran-2 hemat-token-saat-dikembangkan): edit yang
// PALING SERING di robot ini = menambah istilah-pensiun / fakta baru. Dulu itu berarti membaca berkas
// mesin ~553 baris; kini cukup baca berkas DATA ~110 baris ini. Ini DATA MURNI (tanpa perilaku) —
// konstanta `KIT_*` yang sama, cuma pindah rumah. consistency-check.mjs meng-`import` + me-re-export,
// jadi permukaan publik & perilaku IDENTIK.
//
// KEHATI-HATIAN (case-sensitivity, sumber bug tersering di robot ini):
//  - Pemeriksa versi pakai PS `-match` (CASE-INSENSITIVE) -> compileRx (flag i) di consistency-check.mjs.
//  - Buku FAKTA pakai `[regex]::Matches(...)` DEFAULT CASE-SENSITIVE (BEDA!) -> compileRxGlobalCS.

// Daftar deklarasi "versi-saat-ini" milik KIT. Pattern = regex 1 capture group untuk nilai.
// HeaderLines: cari hanya di N baris pertama (hindari salah-tangkap penanda sejarah versi
// di badan berkas). UseChangelogParser: pakai parser CHANGELOG format-agnostic.
export const KIT_VERSION_CHECKS = [
  { File: 'CHANGELOG.md', Label: 'Entri teratas CHANGELOG', UseChangelogParser: true },
  { File: 'CLAUDE_universal_v1.md', Label: 'Judul aturan (auto-baca tiap sesi staff)', Pattern: 'Versi\\s+(\\d+\\.\\d+\\.\\d+)', HeaderLines: 10 },
  { File: 'README.md', Label: 'Baris "Versi stabil sekarang"', Pattern: 'Versi stabil sekarang:\\s*\\*\\*v(\\d+\\.\\d+\\.\\d+)\\*\\*' },
  { File: 'templates/INDEX.md', Label: 'Judul Index dokumen', Pattern: 'Daftar Lengkap Dokumen lintasAI v(\\d+\\.\\d+\\.\\d+)' },
]

// Sumber kebenaran versi KIT = field 'version' di package.json.
export const KIT_SOURCE = { File: 'package.json', JsonField: 'version' }

// Sumber 'jumlah file tim' didefinisikan SEKALI (anti-DRY); tiap fakta cuma beda Filter.
// Kind 'CountInBlock' = hitung baris ber-Entry di antara baris BlockStart..BlockEnd.
// EXPORT (bukan const lokal) supaya tes Node (tests/consistency-check.test.mjs) bisa memakai nilai ini.
// PENTING: BlockStart menunjuk array `teamFiles` DI DALAM setup-pola-b.mjs -> JANGAN pindah/rename array itu.
export const KIT_TEAM_FILES_SOURCE = { Kind: 'CountInBlock', File: 'setup-pola-b.mjs', BlockStart: 'const teamFiles\\s*=\\s*\\[', BlockEnd: '^\\s*\\]', Entry: "\\['templates/" }

// Buku fakta: nilai-berulang NON-versi yang gampang drift (mis. "jumlah file tim").
// Beda dari versi: 1 dokumen boleh sebut angkanya >1x -> dicek SEMUA kemunculan.
export const KIT_FACTS = [
  { Name: 'file-tim-total', Label: 'Jumlah file tim (total)', Source: KIT_TEAM_FILES_SOURCE, Filter: null,
    Declarations: [{ File: 'README.md', Pattern: '(\\d+) file tim' }, { File: 'JALANKAN_KIT.md', Pattern: '(\\d+) file tim' }] },
  { Name: 'file-tim-github', Label: 'Jumlah file tim di .github', Source: KIT_TEAM_FILES_SOURCE, Filter: 'workflowsDir|scriptsDir|githubDir',
    Declarations: [{ File: 'JALANKAN_KIT.md', Pattern: '(\\d+) di \\.github' }] },
  { Name: 'file-tim-docs', Label: 'Jumlah file tim di docs', Source: KIT_TEAM_FILES_SOURCE, Filter: 'docsDir|decisionsDir',
    Declarations: [{ File: 'JALANKAN_KIT.md', Pattern: '(\\d+) di docs' }] },
]

// ---- Penjaga ISTILAH-PENSIUN (retired-term guard) ----
// Masalah yang dipecahkan: istilah/heading kanonik diganti (mis. "Multi-Divisi" -> "Tinjauan
// lintasAI Divisi"), tapi salinan lama nyangkut di berkas instruksi -> klien lihat istilah usang.
// Ini drift TEKS (bukan angka). Robot MENOLAK rilis kalau pola istilah-pensiun muncul di berkas
// instruksi HIDUP (root *.md + templates/*.md + pemasang setup-pola-b.mjs), KECUALI di berkas sejarah
// (CHANGELOG, di ExcludeFiles). CASE-SENSITIVE: "Multi-Divisi" (proper noun) ditangkap;
// "multi-divisi" (prosa umum, mis. "full multi-divisi") + "Multi-Divisional" (sebutan peran) TIDAK.
// EXPORT supaya tes Node (tests/consistency-check.test.mjs) bisa memakai daftar ini (anti drift-senyap).
export const KIT_RETIRED_TERMS = [
  {
    Name: 'heading-tinjauan-divisi',
    Label: 'Istilah lama blok review (bagian 4.1)',
    Pattern: 'Multi-Divisi(?!onal)', // (?!onal) = izinkan "Multi-Divisional Engineer" (sebutan peran)
    Replacement: 'Tinjauan lintasAI Divisi',
    ExcludeFiles: ['CHANGELOG.md'], // sejarah - boleh menyimpan istilah lama
  },
  // 2 entri di bawah menjaga kelas-bug LP risk-gate (drift v1.61.0->v2.5.0): komentar/teks yang masih
  // mengklaim Palang Rem risk-gate "OPT-IN/default mati/opsional" padahal DEFAULT NYALA sejak v1.61.0
  // (setup-pola-b memasangnya otomatis tiap init/update). Kenapa DUA entri: pattern dieksekusi PER-BARIS,
  // sedangkan 2 baris basi (engine/risk-gate.js header + bin/lintasai.js komentar registry) TIDAK memuat
  // kata "risk-gate"/"Palang Rem" di baris yang sama -> butuh entri frasa-unik terpisah (E2).
  {
    Name: 'risk-gate-optin-sebaris',
    Label: 'Klaim basi risk-gate OPT-IN/mati/opsional (sebaris dengan kata risk-gate/Palang Rem)',
    // (?!.*NYALA) WAJIB: baris sah penjelas pengecualian (mis. setup-pola-b "…jadi default NYALA…")
    // menyebut risk-gate + "default mati" sekaligus -> tanpa guard ini ikut tertangkap (alarm palsu).
    Pattern: '(?=.*(?:[Rr]isk-[Gg]ate|Palang Rem))(?!.*NYALA).*(?:OPT-IN|[Oo]pt-in|opsional|default[- ](?:kit )?[Mm][Aa][Tt][Ii])',
    Replacement: 'default NYALA sejak v1.61.0 (ADR-002)',
    ExcludeFiles: ['CHANGELOG.md'],
  },
  {
    Name: 'risk-gate-optin-frasa',
    Label: 'Frasa basi "Default OPT-IN"/"default kit MATI" (baris tanpa kata risk-gate)',
    Pattern: 'Default OPT-IN|default kit MATI', // frasa unik: 0 kemunculan sah lain di cakupan pindai
    Replacement: 'Default NYALA sejak v1.61.0 (ADR-002)',
    ExcludeFiles: ['CHANGELOG.md'],
  },
  // Entri #4 (v2.6.0, ADR-012): label STATIS lama blok 2-versi diganti label DINAMIS ikut profesi
  // (👨‍🎓 Junior-<profesi> + 🙂 Non-<profesi>, mis. Junior-Backend). Emoji SENGAJA ikut di pattern:
  // menangkap LABEL output lama yang nyangkut via copy-paste, TANPA menyentuh frasa gaya §2.1
  // "gaya junior-programmer + non-programmer" (huruf kecil, tanpa emoji) yang tetap sah.
  {
    Name: 'label-tinjauan-junior-programmer',
    Label: 'Label statis lama blok 2-versi (diganti label dinamis Junior-<profesi>, v2.6.0)',
    Pattern: '👨‍🎓 Junior-programmer',
    Replacement: '👨‍🎓 Junior-<profesi> (label dinamis ikut divisi/topik, §4.1)',
    ExcludeFiles: ['CHANGELOG.md'],
  },
  // 2 entri di bawah = pagar anti-hidup-kembali perampingan pasca-3.0.0 (fitur kerja-kelompok +
  // dokumen install/pustaka DIHAPUS). Menangkap rujukan yang menyelinap balik ke berkas instruksi
  // hidup lewat copy-paste/merge lama. Sebutan konsep GitHub yang SAH (bare "CODEOWNERS" tanpa
  // ".template", "branch protection") SENGAJA tidak dipola. UPGRADING dikecualikan: ia justru
  // MENDOKUMENTASIKAN pencabutan ini untuk klien lama.
  {
    Name: 'fitur-tim-dihapus',
    Label: 'Rujukan fitur kerja-kelompok yang sudah dicabut (perampingan pasca-3.0.0)',
    Pattern: 'TEAMWORK_GUIDE|CLAUDE_TEAM_GUIDE|TEAM_FLOW_SKETCH|TEAM_ROLLOUT_GUIDE|DISCORD_BOT_INTEGRATION|CODEOWNERS\\.template|ai-review\\.(?:yml|cjs)|audit-access\\.yml|staff-roster|team-setup\\.mjs|protect-main|branch-protect\\.mjs|ONBOARDING\\.md',
    Replacement: 'fitur tim dicabut - kunci main manual di GitHub Settings -> Branches (lihat UPGRADING.md)',
    ExcludeFiles: ['CHANGELOG.md', 'UPGRADING.md'],
  },
  {
    Name: 'pustaka-install-dihapus',
    Label: 'Rujukan dokumen install/pustaka yang sudah dicabut (perampingan pasca-3.0.0)',
    Pattern: 'MULAI_DI_SINI|MCP_SETUP|PROMPT_LIBRARY|RULES_COMPLIANCE_TEST|kimi-sync|migrate-project-card|project-card-migrate',
    Replacement: 'dokumen dicabut - padanannya: rules/4.2 (pola kerja), skills/database (DB tiering), README (install)',
    ExcludeFiles: ['CHANGELOG.md', 'UPGRADING.md'],
  },
]

// Cakupan pindai: berkas instruksi HIDUP yang dikirim/di-load sebagai aturan. Dir NON-rekursif.
// (docs/ + docs/plans/ SENGAJA di luar cakupan: berisi laporan bertanggal = sejarah, seperti CHANGELOG.)
// ExtraFiles = GLOBAL untuk semua entri (lolos filter ekstensi .md); berkas lib/bin/docs spesifik di bawah
// masuk cakupan untuk penjaga risk-gate (kelas-bug "komentar kode basi soal kebijakan default").
export const KIT_RETIRED_SCAN = {
  Dirs: ['.', 'templates'],
  Extensions: ['.md'],
  ExtraFiles: [
    'setup-pola-b.mjs',
    'engine/risk-gate.js',
    'bin/lintasai.js',
    'engine/lang-hook-wiring.mjs',
    'engine/install-secret-hook.mjs',
    'engine/ensure-preflight-ci.mjs',
    'docs/architecture.md',
    'docs/install-secret-hook.md',
    'templates/hooks/risk-gate.settings.example.json', // templates/ dipindai tapi HANYA .md -> .json wajib lewat sini
  ],
}
