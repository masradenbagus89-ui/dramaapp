#!/usr/bin/env node
// kit.mjs - Router perintah kit lintasAI (port Node dari kit.ps1, Gelombang 4 ADR-004).
//
// SATU pintu masuk yang gampang diingat staff: `kit <perintah>` daripada hafal 3 nama skrip.
// Subperintah: setup / update / check-update / uninstall / doctor / scan / status / diff /
//   version / rollback / bump / help.
//
// v2.0.0: kit 100% Node. kit.mjs adalah SATU-SATUNYA router perintah (kit.ps1 sudah dihapus).
// Dispatcher (bin/lintasai.js) mengarahkan tiap `npx lintasai <perintah>` ke sini atau ke port Node
// terkait.
//
// DELEGASI:
//   - setup/update/check-update/uninstall/rollback -> port Node (setup-pola-b.mjs, update-kit.mjs,
//     uninstall.mjs, engine/rollback.mjs) di KitDir.
//   - bump -> penulis cap-versi (invokeLintasVersionBump + setLintasDeclaredVersion +
//     addLintasChangelogSkeleton dll) di engine/consistency-check.mjs; case 'bump' memanggilnya langsung.
//
// doctor bagian 2c "laporan migrasi artefak klien" (Mesin 2 STRATEGI_UPDATE_v2 Langkah 3) SELALU jalan:
//   health-check boleh hijau hanya kalau semua artefak klien >= versi-diharapkan, jadi tak boleh
//   disembunyikan di balik flag (beda dari --env yang opt-in). `doctor --skip-migrasi` melewatinya
//   (mencetak 1 baris INFO "Laporan migrasi dilewati...").
//
// 2 PERBAIKAN BUG yang disengaja:
//   (1) SCAN CRASH: pola Security '*-guard*' = regex tak-valid (JS melempar "Quantifier following
//       nothing"). Perbaikan: cabang pencocokan-regex (FullName) DILEWATI untuk pola yang bukan regex
//       sah; cabang wildcard (Name -like) tetap jalan. + urutan kategori dibuat DETERMINISTIK
//       (deklarasi, bukan urutan-hash).
//   (2) DOBEL-"v": Show-Help + scan dulu mencetak "vv1.57.1" (versi dari CHANGELOG sudah ber-awalan
//       'v', lalu ditambah 'v' lagi). Diperbaiki dengan normalisasi awalan-v (cermin logika doctor/status).
//
// KETAHANAN INPUT CACAT:
//   - daftar-berkas (kit-files.json / fallback .psd1) ADA tapi RUSAK -> cetak "ERROR ... rusak / tak
//     terbaca" lalu LANJUT ke baris Result (bukan crash).
//   - manifest .json RUSAK saat `diff` -> cetak peringatan rapi TANPA membocorkan jejak-error teknis.
//   - Perintah TIDAK peka-huruf: 'Doctor'/'DOCTOR' diperlakukan sama dengan 'doctor'.
//   - skip-folder di scan menguji path INDUK juga.
//   - manifest cacat-tangan (mis. `files` objek/bukan array, `sha256` angka) ditolak ketat via
//     Array.isArray + banding-string.
//
// Bahasa output WAJIB non-programmer Indonesia (ADR-004 #3) - dijaga robot engine/output-lang-check.mjs.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { getKitVersionFallback } from './engine/version-detect.mjs'
import { getManifestSignatureStatus } from './engine/manifest-signing.mjs'
import { readKitManifest } from './engine/kit-files.mjs'
import { stripBom } from './engine/fs-text.mjs'
import { invokeLintasVersionBump, invokeLintasConsistencyCheckKit } from './engine/consistency-check.mjs'
// Cek-cek doctor MANDIRI (versi/migrasi/artefak-yatim/struktur/lingkungan) diekstrak ke lib/.
// Yang TETAP inline di invokeDoctor: cek file-inti (2) + integritas (2b) - lihat catatan di kit-doctor-checks.mjs.
import { checkVersion, checkMigrationReport, checkOrphanArtifacts, checkProjectStructure, checkInstallLocation, checkAiTools, checkEnvironment } from './engine/kit-doctor-checks.mjs'

// Lokasi kit.mjs sendiri (cache npm saat lewat `npx`, .claude-kit project saat dipanggil langsung).
const ScriptRoot = path.dirname(fileURLToPath(import.meta.url))

// ---- Baca pilihan baris-perintah (cermin param kit.ps1: Command, -ProjectRoot, ExtraArgs) ----
// Dispatcher memanggil: node kit.mjs <perintah> --project-root <cwd-user> [args].
function parseArgs(argv) {
  const a = { command: '', projectRoot: null, extra: [] }
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i]
    if (t === '--project-root' || t === '--projectroot') { a.projectRoot = argv[++i] ?? null; continue }
    if (!a.command && !t.startsWith('--')) { a.command = t; continue }
    a.extra.push(t)
  }
  return a
}

// ---- Resolusi path (cermin kit.ps1 baris 64-76) ----
// Dengan --project-root (kasus npx launcher): inspeksi kit di CWD USER (.claude-kit di project),
// BUKAN lokasi kit.mjs ($ScriptRoot di cache npm). Tanpa --project-root (pemanggilan langsung),
// $ScriptRoot SUDAH .claude-kit project -> fallback pakai $ScriptRoot.
function resolveDirs(projectRootArg) {
  let projectRoot = projectRootArg
  let kitDir
  if (projectRoot) {
    kitDir = path.join(projectRoot, '.claude-kit')
  } else {
    kitDir = ScriptRoot
    projectRoot = path.dirname(kitDir)
  }
  // PowerShell selalu menormalkan huruf drive jadi KAPITAL (mis. "D:\...") di $PSScriptRoot dkk.
  // Node mempertahankan huruf dari cara dipanggil (bisa "d:\..."). Samakan supaya tampilan path
  // IDENTIK dengan kit.ps1 (huruf drive tak memengaruhi operasi berkas - Windows abai-huruf).
  return { kitDir: upperDrive(kitDir), projectRoot: upperDrive(projectRoot) }
}

// Naikkan huruf drive Windows jadi kapital (cermin normalisasi path PowerShell). "d:\x" -> "D:\x".
function upperDrive(p) {
  return typeof p === 'string' ? p.replace(/^([a-z]):/, (_m, d) => d.toUpperCase() + ':') : p
}

// ---- Helper: deteksi versi kit (rantai pertahanan-berlapis, cermin Get-KitVersion) ----
// manifest (kit_version) -> CHANGELOG '## [X.Y.Z]'/'## vX.Y.Z' -> 'unknown'. Reuse helper teruji.
function getKitVersion(kitDir) {
  return getKitVersionFallback(kitDir, { changelogPath: path.join(kitDir, 'CHANGELOG.md') })
}

// Tampilan versi yang dinormalkan (cermin logika Invoke-Status baris ~502): kalau sudah ber-awalan
// 'v' -> apa adanya; 'unknown' -> 'unknown'; selain itu tambah 'v'. PERBAIKAN dobel-v (lihat header).
function versionDisplay(version) {
  if (/^v/.test(version)) return version
  if (version === 'unknown') return 'unknown'
  return 'v' + version
}

// Baca manifest JSON dengan aman: buang BOM (cermin ReadAllText UTF8 PS) lalu JSON.parse.
// Melempar kalau gagal parse -> pemanggil yang memutuskan pesan (WARN/skip).
function readManifestJson(manifestPath) {
  return JSON.parse(stripBom(fs.readFileSync(manifestPath, 'utf8')))
}

// Format waktu lokal 'yyyy-MM-dd HH:mm:ss' (cermin .ToString('yyyy-MM-dd HH:mm:ss') PS, waktu lokal).
function formatTimestamp(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ` +
    `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

// ---- Helper SCAN: cocokkan glob (Name -like) + regex sah (FullName -match) ----
// Cermin `-like` PowerShell (wildcard penuh, peka-huruf TIDAK): hanya * dan ? jadi wildcard,
// sisanya literal; cocok seluruh string (anchor). Pola dari kit.ps1 tak memakai kelas [..].
function likeMatch(name, glob) {
  const esc = glob.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape SEMUA metachar regex
  const rx = '^' + esc.replace(/\\\*/g, '.*').replace(/\\\?/g, '.') + '$' // lalu buka * dan ?
  return new RegExp(rx, 'i').test(name)
}
// Apakah pola adalah regex sah? (mis. '*-guard*' = TIDAK -> cabang -match dilewati, anti-crash.)
function regexValid(p) {
  try { new RegExp(p); return true } catch { return false }
}

// ---- Helper: tampilkan usage (cermin Show-Help) ----
function showHelp(kitDir) {
  const v = versionDisplay(getKitVersion(kitDir)) // PERBAIKAN dobel-v (dulu "v$(Get-KitVersion)")
  const L = (s = '') => console.log(s)
  L('')
  L(`lintasai - Router perintah kit lintasAI (${v})`)
  L('')
  L('USAGE:')
  L('  npx lintasai <command> [args]')
  L('')
  L('COMMANDS:')
  L('  init      - Setup Pola B di proyek (copy AGENTS.md, docs skeleton, file tim)')
  L('              Args: --force, --dry-run, --skip-team-files')
  L('')
  L('  update    - Update kit ke versi terbaru via re-clone fresh dari GitHub')
  L('              Args: --no-backup, --repo-url <url>, --branch <name>, --dry-run')
  L('')
  L('  check-update - Cek apakah ada versi baru TANPA mengubah apa pun (read-only)')
  L('              (no args)')
  L('')
  L('  uninstall - Hapus kit dari proyek dengan AMAN (diff vs daftar file kit)')
  L('              Args: --dry-run, --force, --delete-agents, --keep-kit, --yes')
  L('              File project (yang BUKAN dari kit) AMAN tidak terhapus.')
  L('              Path traversal + symlink protection aktif by default.')
  L('')
  L('  doctor    - Diagnostic: cek versi + file inti utuh + cross-ref')
  L('              --env: cek lingkungan (Node/OS/Git) - sumber "beda di client"')
  L('')
  L('  scan      - Re-run scan project untuk identifikasi kandidat CRITICAL')
  L('              (tanpa setup ulang)')
  L('')
  L('  status    - Ringkasan 1-layar: versi, install mode, AGENTS.md, manifest, tier')
  L('              (no args)')
  L('')
  L('  version   - Print versi kit aktif (dari .install-manifest.json)')
  L('')
  L('  rollback  - Pulihkan berkas project per-satuan dari cadangan (AGENTS.md/docs)')
  L('              (cadangan per-berkas, bukan seluruh folder). Untuk balik SELURUH folder kit')
  L('              yang rusak: kembalikan .claude-kit.backup-<tanggal> (atau minta')
  L("              AI: 'rollback dong').")
  L('')
  L('  bump      - [kit dev] Naikkan versi 1-langkah: cap nomor versi ke semua')
  L('              berkas + tambah kerangka CHANGELOG + cek kecocokan otomatis.')
  L('              Args: <versi> (mis. bump 1.42.0). Cuma untuk repo kit.')
  L('')
  L('  help      - Tampilkan help ini')
  L('')
  L('EXAMPLES:')
  L('  npx lintasai init --force')
  L('  npx lintasai update')
  L('  npx lintasai doctor')
  L('')
}

// ---- Helper: doctor diagnostic (cermin Invoke-Doctor) ----
// Mengembalikan kode-keluar (0 sehat/warning, 1 ada ERROR).
function invokeDoctor(kitDir, projectRoot, extra = []) {
  const L = (s = '') => console.log(s)
  L('')
  L('=== Kit Doctor (diagnostic) ===')
  L('')

  let ok = 0
  let warn = 0
  let err = 0
  const acc = (r) => { ok += r.ok; warn += r.warn; err += r.err }

  // 1 + 1b. Versi kit + apakah KEDALUWARSA vs npm -> engine/kit-doctor-checks.mjs (cek mandiri).
  acc(checkVersion(kitDir, extra, L))

  // 2. Cek file inti. Sumber tunggal DUA-FORMAT (v2.0.0, D1): engine/kit-files.json (SSOT baru) ATAU
  // lib/kit-files.psd1 (kit era-v1 klien). readKitManifest prefer .json, fallback .psd1. Inilah
  // penutup jebakan doctor lintas-versi (§2.3): doctor v2 atas kit v1 TETAP baca daftar (fallback
  // .psd1) -> INFO lunak ajakan update, BUKAN vonis "manifest hilang" ERROR.
  let wajibAda = []
  let testsGroup = []
  let manifest = null
  try { manifest = readKitManifest(kitDir) } catch (e) {
    L('ERROR manifest daftar-berkas (engine/kit-files.json / .psd1) rusak / tak terbaca')
    L(`      ${e.message}`)
    err++
    manifest = { data: null }
  }
  if (manifest === null) {
    L('ERROR manifest daftar-berkas hilang (engine/kit-files.json - single-source-of-truth)')
    err++
  } else {
    const kitFiles = manifest.data
    if (manifest.format === 'psd1-legacy') {
      // Kit era-v1 (masih .psd1). BUKAN error - cukup ajak update ke format baru.
      L('INFO  Kit era-v1 terdeteksi (manifest masih lib/kit-files.psd1 format lama).')
      L('      Saran lunak: jalankan `npx lintasai update` untuk pindah ke kit 100% Node (v2).')
    }
    if (kitFiles) {
      const groups = ['core_prompts', 'universal_rules', 'rules', 'scripts', 'lib_files', 'node_lib',
        'templates', 'docs', 'tests', 'ci', 'meta']
      const merged = []
      for (const g of groups) { if (Array.isArray(kitFiles[g])) merged.push(...kitFiles[g]) }
      wajibAda = merged.map((f) => String(f).replace(/\//g, '\\'))
      // Carve-out "suite Pester opsional-per-jalur" = SEMATA kompat-mundur kit era-v1 (.psd1).
      // Kit v2 = 100% Node: tak ada tes .ps1 sama sekali + grup `tests` kit-files.json KOSONG, jadi
      // testsGroup di jalur JSON selalu [] (tak ada yang di-carve-out -> tak ada risiko salah-vonis).
      // Carve-out HANYA aktif saat doctor v2 menginspeksi kit v1 klien lewat fallback .psd1: suite
      // Pester internal (tests/*.Tests.ps1) TIDAK ikut paket npm -> jangan divonis "hilang". Pelari
      // tes (Run-Tests.ps1, preflight.mjs, smoke-*.ps1/mjs) IKUT paket npm era-v1 -> TETAP wajib ada.
      if (manifest.format === 'psd1-legacy') {
        testsGroup = (Array.isArray(kitFiles.tests) ? kitFiles.tests : [])
          .map((f) => String(f).replace(/\//g, '\\'))
          .filter((f) => /\.tests\.ps1$/i.test(f))
      }
    }
  }

  if (wajibAda.length > 0) {
    const missing = []
    for (const f of wajibAda) {
      if (!fs.existsSync(path.join(kitDir, f))) missing.push(f)
    }
    // (Kompat-mundur kit era-v1 saja; testsSet selalu kosong untuk kit v2 100% Node.) Di kit v1,
    // suite Pester internal (tests/*.Tests.ps1) SENGAJA tidak ikut paket npm (files[] era-v1 hanya
    // membawa pelari tesnya) - padahal npm = jalur resmi client. SEMUA suite absen = ciri pemasangan
    // npm yang sehat -> INFO, bukan vonis "kit rusak" (integritas berkas yang benar-benar terpasang
    // tetap dijaga cek manifest sha256 di 2b). Suite absen SEBAGIAN = korupsi nyata -> tetap ERROR
    // (jalur repo/git membawa suite lengkap).
    const testsSet = new Set(testsGroup)
    const missingTests = missing.filter((f) => testsSet.has(f))
    const allTestsAbsent = testsSet.size > 0 && missingTests.length === testsSet.size
    const effMissing = allTestsAbsent ? missing.filter((f) => !testsSet.has(f)) : missing
    const utuhCount = allTestsAbsent ? wajibAda.length - testsSet.size : wajibAda.length
    if (effMissing.length === 0) {
      L(`OK    ${utuhCount} file inti utuh`)
      ok++
    } else {
      L(`ERROR ${effMissing.length} file missing:`)
      for (const m of effMissing) L(`        - ${m}`)
      err++
      L('      Saran: npx lintasai update (re-clone fresh)')
    }
    if (allTestsAbsent) {
      L(`INFO  ${testsSet.size} berkas tes internal kit tidak ikut terpasang (normal untuk pemasangan via paket npm; jalur repo/git yang membawanya)`)
    }
  }

  // 2b. Cek integritas (sha256) - manifest di kitDir/.install-manifest.json.
  const manifestPath = path.join(kitDir, '.install-manifest.json')
  if (fs.existsSync(manifestPath)) {
    let manifest = null
    try {
      manifest = readManifestJson(manifestPath)
    } catch (e) {
      // Pesan TETAP tanpa detail-error runtime: identik PS==Node + tak bocorkan isi manifest rusak
      // (bisa memuat path komputer) ke layar staff. Cermin pola yang sudah benar di invokeDiff.
      L('WARN  Integrity check skipped: manifest .install-manifest.json rusak / tak terbaca (cek format JSON).')
      warn++
      manifest = null
    }

    if (manifest !== null) {
      // 2b-i. Verifikasi KEASLIAN manifest (tanda-tangan) DULU supaya 'PRISTINE' tidak menyesatkan.
      // Helper Node selalu ada (di-import), TAPI hormati niat PS "skip kalau helper kit tak ada":
      // gate ke keberadaan engine/manifest-signing.mjs di kit yang diinspeksi. Gagal/error => 'skipped'.
      let sigStatus = 'skipped'
      const signingLib = fs.existsSync(path.join(kitDir, 'engine', 'manifest-signing.mjs'))
        ? path.join(kitDir, 'engine', 'manifest-signing.mjs')
        : path.join(kitDir, 'lib', 'manifest-signing.mjs')
      if (fs.existsSync(signingLib)) {
        try { sigStatus = getManifestSignatureStatus(manifest, { kitRoot: kitDir }) } catch { sigStatus = 'skipped' }
      }
      switch (sigStatus) {
        case 'verified': L('OK    Manifest: tanda-tangan VALID (daftar berkas terverifikasi asli)'); ok++; break
        case 'invalid':
          L('WARN  Manifest: tanda-tangan TIDAK COCOK - daftar mungkin diubah; hasil integrity di bawah BELUM tentu bisa dipercaya.')
          L('      Kemungkinan lain (kit era-lama): segel format LAMA pra-2026-06-22 yang tak terbaca kit Node -> jalankan `npx lintasai update` untuk menyegel ulang format baru.')
          warn++; break
        case 'unsigned': L('INFO  Manifest: tanpa tanda-tangan (legacy) - integrity di bawah = cek sha256 saja, keaslian daftar belum diverifikasi.'); break
        default: L('INFO  Manifest: verifikasi tanda-tangan dilewati (helper tidak tersedia).'); break
      }

      let pristine = 0
      const modifiedList = []
      let integrityMissing = 0

      let entries = []
      if (Array.isArray(manifest.files) && manifest.files.length) entries = manifest.files
      else if (Array.isArray(manifest.entries) && manifest.entries.length) entries = manifest.entries

      for (const entry of entries) {
        let relPath = null
        if (entry.path) relPath = entry.path
        else if (entry.file) relPath = entry.file
        if (!relPath) continue

        let expectedSha = null
        if (entry.sha256) expectedSha = entry.sha256
        if (!expectedSha) continue

        const relPathNorm = String(relPath).replace(/\//g, '\\')
        // Manifest menyimpan path relatif terhadap AKAR PROJECT (mis. ".claude-kit/lib/rollback.ps1",
        // "AGENTS.md") -> gabung ke projectRoot (cermin kit.ps1 baris 324, hindari double-prefix).
        const absPath = path.join(projectRoot, relPathNorm)

        if (!fs.existsSync(absPath)) { integrityMissing++; continue }

        try {
          const buf = fs.readFileSync(absPath)
          const actualSha = crypto.createHash('sha256').update(buf).digest('hex')
          if (actualSha.toLowerCase() === String(expectedSha).toLowerCase()) {
            pristine++
          } else {
            modifiedList.push(relPath)
          }
        } catch (e) {
          modifiedList.push(`${relPath} (hash error: ${e.message})`)
        }
      }

      const modifiedCount = modifiedList.length
      L(`OK    Integrity: PRISTINE=${pristine}, MODIFIED=${modifiedCount}, MISSING=${integrityMissing}`)
      if (modifiedCount > 0) {
        L('WARN  File berikut dimodifikasi sejak install (mungkin disengaja):')
        for (const m of modifiedList) L(`        - ${m}`)
        warn++
      } else {
        ok++
      }
      if (integrityMissing > 0) {
        L(`ERROR Integrity: ${integrityMissing} file di manifest tapi tidak ada di disk`)
        err++
      }
    }
  } else {
    L('INFO  Integrity check skipped: .install-manifest.json tidak ada (kit pre-manifest atau belum di-install)')
  }

  // 2c. Laporan migrasi artefak klien (robot anak) -> engine/kit-doctor-checks.mjs.
  acc(checkMigrationReport(kitDir, projectRoot, extra, L))

  // 2e + 2e-bis + 2f. Artefak PowerShell era-lama (yatim / sisa v1 / UPDATE_GUIDE) -> engine/kit-doctor-checks.mjs.
  acc(checkOrphanArtifacts(kitDir, projectRoot, L))

  // 3-6. Struktur project (AGENTS.md / docs/ / .github/ / .git internal) -> engine/kit-doctor-checks.mjs.
  acc(checkProjectStructure(kitDir, projectRoot, L))

  // 6b. Lokasi pasang: apakah kit mendarat di folder yang membuatnya benar-benar TERMUAT (Celah 4,
  // ADR-024) -> engine/kit-doctor-checks.mjs. Gagal di sini = lintasAI diam-diam tidak aktif sama sekali.
  acc(checkInstallLocation(kitDir, projectRoot, L))

  // 6c. Status per-alat AI: aturan sampai ke mana, palang berlaku di mana (v4 Tugas 10/11, ADR-024).
  // Client Cursor/Codex berhak tahu ia TIDAK mendapat palang - mendiamkannya = rasa-aman-palsu.
  acc(checkAiTools(kitDir, projectRoot, L))

  // 7. Lingkungan eksekusi (parity, potret runtime klien) -> engine/kit-doctor-checks.mjs. --no-env skip.
  acc(checkEnvironment(projectRoot, extra, L))

  // Ringkasan
  L('')
  L(`Result: OK=${ok} WARN=${warn} ERROR=${err}`)
  if (err === 0 && warn === 0) {
    L('Kit sehat. Siap dipakai.')
    return 0
  } else if (err === 0) {
    L('Kit OK dengan warning. Bisa dipakai, tapi fix warning kalau bisa.')
    return 0
  } else {
    L('Kit BERMASALAH. Fix ERROR di atas dulu.')
    return 1
  }
}

// ---- Helper: scan project (cermin Invoke-Scan + 2 perbaikan: urutan deterministik + anti-crash) ----
function invokeScan(kitDir, projectRoot) {
  const L = (s = '') => console.log(s)
  L('')
  L(`=== Kit Scan - Universal Adaptive Scan (kit ${versionDisplay(getKitVersion(kitDir))}) ===`)
  L('')
  L('Catatan: kit scan = scan ringan untuk count kandidat.')
  L('        Untuk bulk-bootstrap actual, paste JALANKAN_KIT.md ke Claude Code (yang trigger AI workflow).')
  L('')

  // Pola CRITICAL (universal, sesuai JALANKAN_KIT). URUTAN DETERMINISTIK (array, bukan hashtable acak).
  const patterns = [
    ['Auth', ['auth*', 'session*', 'login*', 'oauth*', 'jwt*', 'passport*']],
    ['DB', ['db.*', 'prisma*', 'drizzle*', 'repository*', 'schema*', 'models']],
    ['Security', ['crypto*', 'encrypt*', 'decrypt*', 'permissions*', 'acl*', 'policies*', '*-guard*', 'rate-limit*', 'csrf*', 'cors*']],
    ['API/Router', ['routes', 'controllers', 'handlers', 'api', 'endpoints', 'resolvers', 'actions']],
    ['Entry/MW', ['main.*', 'index.*', 'app.*', 'server.*', 'layout.*', 'middleware.*', 'interceptor.*']],
  ]

  const sourceFolders = ['src', 'app', 'lib', 'internal', 'pkg', 'cmd', 'features', 'modules', 'routes', 'controllers', 'handlers', 'services', 'domain']
  const skipFolders = ['node_modules', 'dist', '.next', 'target', 'build', 'vendor', '__pycache__', '.venv', 'generated', '.git']
  // Regex pemangkas direktori - cermin filter PS `$_.FullName -match "[\\/]$skip[\\/]"` (peka-huruf TIDAK).
  const skipRx = skipFolders.map((s) => new RegExp('[\\\\/]' + s + '[\\\\/]', 'i'))

  const totalByCategory = {}
  for (const [cat] of patterns) totalByCategory[cat] = 0

  for (const src of sourceFolders) {
    const srcPath = path.join(projectRoot, src)
    if (!fs.existsSync(srcPath)) continue

    // Cermin PS: filter '$_.FullName -match "[\\/]skip[\\/]"' menguji SELURUH path absolut, termasuk
    // segmen INDUK DI ATAS srcPath. Jadi kalau project berada di dalam folder ber-nama-skip (mis.
    // C:\build\proj\src), PS men-skip SEMUA berkasnya -> Total 0. Tiru: kalau srcPath sendiri memuat
    // segmen skip, lewati seluruh folder ini (selain pemangkasan dir DI BAWAH srcPath di walkFilesSkipping).
    if (skipRx.some((rx) => rx.test(srcPath + path.sep))) continue

    const allFiles = walkFilesSkipping(srcPath, skipRx) // [{ name, fullName }]

    for (const [cat, pats] of patterns) {
      for (const p of pats) {
        const rxOk = regexValid(p)
        let rx = null
        if (rxOk) { try { rx = new RegExp(p, 'i') } catch { rx = null } }
        let matched = 0
        for (const f of allFiles) {
          if (likeMatch(f.name, p) || (rx && rx.test(f.fullName))) matched++
        }
        totalByCategory[cat] += matched
      }
    }
  }

  L('Kandidat CRITICAL per kategori (rough estimate):')
  let grandTotal = 0
  for (const [cat] of patterns) {
    const count = totalByCategory[cat]
    L(`  ${cat.padEnd(15)} ${String(count).padStart(4)} file`)
    grandTotal += count
  }
  L('')
  L(`Total kandidat (rough, may include duplicates): ${grandTotal}`)
  L('')

  if (grandTotal >= 30) {
    L('Saran: total >= 30, pakai subfolder grouping saat bulk-bootstrap.')
    L('      Mapping: docs/api/, docs/lib/, docs/security/, docs/features/<n>/, dst.')
  } else {
    L('Saran: total < 30, flat docs/ masih oke.')
  }

  L('')
  L('Next step:')
  L('  1. Paste isi .claude-kit\\JALANKAN_KIT.md ke Claude Code untuk full workflow.')
  L('  2. AI akan tanya pilih (1)/(2)/(3)/(4) di step 12 (default (3) Skeleton-first).')
  L('')
  return 0
}

// Walk file rekursif dengan PEMANGKASAN direktori yang cocok skipRx (cermin Get-ChildItem -Recurse -File
// lalu Where-Object skip-filter: file dikecualikan iff suatu segmen direktorinya cocok skipRx).
function walkFilesSkipping(root, skipRx) {
  const out = []
  const rec = (dir) => {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.isDirectory()) {
        // Segmen "/name/" diuji ke skipRx - sama dengan PS menolak file ber-segmen ini di FullName.
        if (skipRx.some((rx) => rx.test('\\' + e.name + '\\'))) continue
        rec(path.join(dir, e.name))
      } else if (e.isFile()) {
        out.push({ name: e.name, fullName: path.join(dir, e.name) })
      }
    }
  }
  rec(root)
  return out
}

// ---- Helper: status ringkas 1-layar (cermin Invoke-Status) ----
function invokeStatus(kitDir, projectRoot) {
  const L = (s = '') => console.log(s)
  L('')
  L('=== Kit Status (ringkas) ===')
  L('')

  // 1. Versi kit
  const version = getKitVersion(kitDir)
  L(`Kit version    : ${versionDisplay(version)}`)

  // 2. Install mode (npx vs git-clone). Heuristik: lokasi kit.mjs mengandung jejak cache npm?
  let installMode = 'git-clone-mode'
  if (/(node_modules|npm-cache|_npx|AppData[\\/]+Local[\\/]+npm-cache)/i.test(ScriptRoot)) {
    installMode = 'npx-mode'
  }
  L(`Install mode   : ${installMode}`)

  // 3. AGENTS.md ada? (+ waktu modifikasi)
  const agentsAtRoot = path.join(projectRoot, 'AGENTS.md')
  if (fs.existsSync(agentsAtRoot)) {
    try {
      const mtime = formatTimestamp(fs.statSync(agentsAtRoot).mtime)
      L(`AGENTS.md      : Y (last modified: ${mtime})`)
    } catch {
      L('AGENTS.md      : Y (mtime unavailable)')
    }
  } else {
    L('AGENTS.md      : N (belum di-copy ke project root)')
  }

  // 4. Manifest signed? (+ last update)
  const manifestPath = path.join(kitDir, '.install-manifest.json')
  let manifestSignedDisplay = 'N (manifest hilang)'
  let lastUpdateDisplay = 'unknown'
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = readManifestJson(manifestPath)

      let hasSignature = false
      if (manifest.metadata && manifest.metadata.signature) hasSignature = true
      if (!hasSignature) {
        let entries = []
        if (Array.isArray(manifest.files) && manifest.files.length) entries = manifest.files
        else if (Array.isArray(manifest.entries) && manifest.entries.length) entries = manifest.entries
        const shaCount = entries.filter((e) => e && e.sha256).length
        if (shaCount > 0) {
          hasSignature = true
          manifestSignedDisplay = `Y (${shaCount} files w/ sha256)`
        }
      } else {
        manifestSignedDisplay = 'Y (manifest bertanda-tangan)'
      }

      if (!hasSignature) {
        manifestSignedDisplay = 'N (manifest ada tapi tidak signed)'
      }

      // Waktu update terakhir dari manifest
      if (manifest.metadata && manifest.metadata.installed_at) lastUpdateDisplay = manifest.metadata.installed_at
      else if (manifest.metadata && manifest.metadata.updated_at) lastUpdateDisplay = manifest.metadata.updated_at
      else if (manifest.installed_at) lastUpdateDisplay = manifest.installed_at
    } catch (e) {
      // Pesan TETAP tanpa detail runtime (identik PS==Node + tak bocorkan isi manifest). Lihat invokeDiff.
      manifestSignedDisplay = 'N (manifest rusak / tak terbaca)'
    }
  }
  L(`Daftar file kit signed: ${manifestSignedDisplay}`)

  // 5. Last update
  L(`Last update    : ${lastUpdateDisplay}`)

  // 6. Tier setup (.staff-profile.md ada?)
  if (fs.existsSync(path.join(projectRoot, '.staff-profile.md'))) {
    L('Tier setup     : Y (.staff-profile.md ada)')
  } else {
    L('Tier setup     : N (.staff-profile.md belum dibuat - solo/owner mode)')
  }

  L('')
  L('Untuk detail lebih lengkap: npx lintasai doctor')
  L('')
  return 0
}

// ---- Helper: print versi (cermin Show-Version) ----
function showVersion(kitDir) {
  console.log(getKitVersion(kitDir))
}

// ---- Helper: diff vs manifest (cermin Invoke-Diff) ----
// CATATAN: cermin kit.ps1 - diff SELALU pakai projectRoot/.claude-kit (BUKAN $KitDir), beda dari
// doctor/status. Saat dipanggil langsung tanpa --project-root, ini menengok .claude-kit di INDUK.
function invokeDiff(projectRoot) {
  const kitDir = path.join(projectRoot, '.claude-kit')
  const manifestPath = path.join(kitDir, '.install-manifest.json')
  if (!fs.existsSync(manifestPath)) {
    // Cermin PS Write-Warning (awalan "WARNING:" ditambah PS otomatis, teks Indonesia) -> stderr.
    console.error(`WARNING: Tidak ada manifest di ${manifestPath}. Kit belum di-install atau corrupt.`)
    return 1
  }
  let manifest
  try {
    manifest = readManifestJson(manifestPath)
  } catch (e) {
    // Manifest RUSAK (gagal parse JSON) -> cetak peringatan rapi. Pesan dibuat TANPA detail-error
    // runtime demi prinsip non-programmer (jangan bocorkan jejak-error teknis ke staf).
    console.error('WARNING: Manifest .install-manifest.json rusak / tak terbaca (cek format JSON).')
    return 1
  }
  const modified = []
  const missing = []
  const entries = Array.isArray(manifest.files) ? manifest.files : []
  for (const entry of entries) {
    const filePath = path.join(projectRoot, String(entry.path))
    if (!fs.existsSync(filePath)) {
      missing.push(entry.path)
    } else if (!entry.sha256) {
      // Entry tanpa sidik-jari -> tak bisa diverifikasi -> tandai modified (konservatif, cermin REL-3).
      modified.push(entry.path)
    } else {
      const currentHash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toLowerCase()
      if (currentHash !== String(entry.sha256).toLowerCase()) {
        modified.push(entry.path)
      }
    }
  }
  console.log('=== Kit Diff (vs daftar file kit) ===')
  console.log(`Modified (${modified.length}):`)
  for (const m of modified) console.log(`  M ${m}`)
  console.log('')
  console.log(`Missing (${missing.length}):`)
  for (const m of missing) console.log(`  - ${m}`)
  return 0
}

// ---- Delegasi ke port Node (setup/update/check-update/uninstall) ----
function delegateNode(kitDir, scriptName, args) {
  const script = path.join(kitDir, scriptName)
  if (!fs.existsSync(script)) {
    console.log(`ERROR: ${scriptName} tidak ada di ${kitDir}`)
    return 1
  }
  const r = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' })
  if (r.error) {
    console.log(`ERROR: gagal menjalankan ${scriptName}: ${r.error.message}`)
    return 1
  }
  return r.status == null ? 1 : r.status
}

// CATATAN: bump ditangani Node murni (engine/consistency-check.mjs invokeLintasVersionBump, dipanggil
// langsung di case 'bump').

// ---- Router ----
function main(argv) {
  const parsed = parseArgs(argv)
  // Cermin PowerShell yang PEKA-HURUF TIDAK (ValidateSet menerima 'Doctor'/'DOCTOR' = 'doctor').
  // Tanpa ini, `node kit.mjs Doctor` salah jatuh ke help (beda perilaku + kode-keluar dari kit.ps1).
  const command = parsed.command.toLowerCase()
  const projectRootArg = parsed.projectRoot
  const extra = parsed.extra
  const { kitDir, projectRoot } = resolveDirs(projectRootArg)

  // Beri tahu kit mana yang diinspeksi (cermin kit.ps1 baris 80-82) - untuk subperintah cuma-baca.
  // CATATAN: 'rollback' DIKELUARKAN di sini - sejak CUTOVER ke port Node (2026-06-23) ia jadi orkestrator
  // yang mencetak header sendiri ("lintasAI rollback - balikin..."), sama seperti setup/update/uninstall
  // yang juga TIDAK ikut baris "Inspecting" (konvensi: cuma perintah inspeksi cuma-baca yang cetak
  // "Inspecting").
  if (['doctor', 'version', 'scan', 'status', 'diff'].includes(command)) {
    console.log(`Inspecting kit at: ${kitDir}`)
  }

  switch (command) {
    case 'setup':
      return delegateNode(kitDir, 'setup-pola-b.mjs', ['--project-root', projectRoot, ...extra])
    case 'update':
      return delegateNode(kitDir, 'update-kit.mjs', ['--project-root', projectRoot, ...extra])
    case 'check-update':
      // Cermin kit.ps1: panggil update-kit -CheckOnly TANPA meneruskan ExtraArgs (read-only).
      return delegateNode(kitDir, 'update-kit.mjs', ['--project-root', projectRoot, '--check-only'])
    case 'uninstall':
      return delegateNode(kitDir, 'uninstall.mjs', ['--project-root', projectRoot, ...extra])
    case 'doctor':
      return invokeDoctor(kitDir, projectRoot, extra)
    case 'scan':
      return invokeScan(kitDir, projectRoot)
    case 'status':
      return invokeStatus(kitDir, projectRoot)
    case 'diff':
      return invokeDiff(projectRoot)
    case 'version':
      showVersion(kitDir)
      return 0
    case 'rollback':
      // CUTOVER Gelombang 6 (aksi MERUSAK, sesi-khusus owner 2026-06-23): rollback kini pakai port Node
      // engine/rollback.mjs (dulu shim ke kit.ps1). Suntik --project-root supaya rollback menyasar manifest +
      // .claude-kit di project (cermin delegasi setup/update/uninstall). NON-INTERAKTIF: butuh --yes untuk
      // benar-benar menimpa (default-batal).
      return delegateNode(kitDir, 'engine/rollback.mjs', ['--project-root', projectRoot, ...extra])
    case 'bump': {
      // CUTOVER (migrasi PS->Node 2026-06-25, owner-gated): penulis cap-versi kini Node murni
      // (engine/consistency-check.mjs invokeLintasVersionBump): stamp dulu, lalu jalankan pemeriksaan
      // kecocokan MODE KIT (verifikasi hasil), exit = jumlah ketakcocokan.
      const newVer = extra && extra.length >= 1 ? extra[0] : ''
      if (!newVer) {
        console.log('Pemakaian: kit bump <versi>   (mis. node kit.mjs bump 1.42.0)')
        console.log('Cap nomor versi baru ke semua berkas + tambah kerangka entri CHANGELOG + cek kecocokan.')
        return 1
      }
      try {
        invokeLintasVersionBump(kitDir, newVer)
        const check = invokeLintasConsistencyCheckKit(kitDir)
        if (check.MismatchCount === 0) {
          console.log(`Sekarang tulis deskripsi entri CHANGELOG [${newVer}] (ganti placeholder), lalu jalankan npm run preflight.`)
        }
        return check.MismatchCount
      } catch (e) {
        console.log(`[ERROR] bump gagal: ${e.message}`)
        return 2
      }
    }
    case 'help':
      showHelp(kitDir)
      return 0
    default:
      showHelp(kitDir)
      return command === '' ? 0 : 1
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  process.exitCode = main(process.argv.slice(2))
}

export { parseArgs, resolveDirs, getKitVersion, versionDisplay, likeMatch, regexValid, invokeDoctor, invokeScan, invokeStatus, invokeDiff, showVersion, showHelp, main }
