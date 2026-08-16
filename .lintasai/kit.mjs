#!/usr/bin/env node
// kit.mjs - Router perintah kit lintasAI (Gelombang 4 ADR-004).
//
// SATU pintu masuk yang gampang diingat staff: `kit <perintah>` daripada hafal 3 nama skrip.
// Subperintah: setup / update / check-update / uninstall / doctor / status / diff /
//   version / rollback / help.
//
// v2.0.0: kit 100% Node. kit.mjs adalah SATU-SATUNYA router perintah (kit.ps1 sudah dihapus).
// Dispatcher (bin/lintasai.js) mengarahkan tiap `npx lintasai <perintah>` ke sini atau ke port Node
// terkait.
//
// DELEGASI:
//   - setup/update/check-update/uninstall/rollback -> port Node (setup-pola-b.mjs, update-kit.mjs,
//     uninstall.mjs, engine/rollback.mjs) di KitDir.
//   (Perintah `bump` DICABUT v6.0.0 - alat rilis maintainer, kini di <repo>/tools/version-bump.mjs
//    yang TIDAK dikirim ke client. Lihat catatan di router bawah.)
//
// PERBAIKAN BUG yang disengaja:
//   DOBEL-"v": Show-Help dulu mencetak "vv1.57.1" (versi dari CHANGELOG sudah ber-awalan
//   'v', lalu ditambah 'v' lagi). Diperbaiki dengan normalisasi awalan-v (cermin logika doctor/status).
//
// KETAHANAN INPUT CACAT:
//   - daftar-berkas (kit-files.json) ADA tapi RUSAK -> cetak "ERROR ... rusak / tak
//     terbaca" lalu LANJUT ke baris Result (bukan crash).
//   - manifest .json RUSAK saat `diff` -> cetak peringatan rapi TANPA membocorkan jejak-error teknis.
//   - Perintah TIDAK peka-huruf: 'Doctor'/'DOCTOR' diperlakukan sama dengan 'doctor'.
//   - manifest cacat-tangan (mis. `files` objek/bukan array, `sha256` angka) ditolak ketat via
//     Array.isArray + banding-string.
//
// Bahasa output WAJIB non-programmer Indonesia (ADR-004 #3).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { getKitVersionFallback } from './engine/version-detect.mjs'
import { stripBom } from './engine/fs-text.mjs'
// Cek-cek doctor MANDIRI (versi/migrasi/artefak-yatim/struktur/lingkungan) diekstrak ke engine/.
// Cek file-inti (2) + integritas (2b) juga sudah pindah -> engine/doctor-integrity.mjs (lihat invokeDoctor).
import { checkVersion, checkProjectStructure, checkInstallLocation, checkAiTools, checkEnvironment } from './engine/kit-doctor-checks.mjs'
import { checkKitFilesComplete, checkManifestIntegrity } from './engine/doctor-integrity.mjs'
import { NAMA_FOLDER_KIT } from './engine/project-root.mjs'

// Lokasi kit.mjs sendiri (cache npm saat lewat `npx`, .lintasai project saat dipanggil langsung).
const ScriptRoot = path.dirname(fileURLToPath(import.meta.url))

// ---- Baca pilihan baris-perintah ----
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

// ---- Resolusi path ----
// Dengan --project-root (kasus npx launcher): inspeksi kit di CWD USER (.lintasai di project),
// BUKAN lokasi kit.mjs ($ScriptRoot di cache npm). Tanpa --project-root (pemanggilan langsung),
// $ScriptRoot SUDAH .lintasai project -> fallback pakai $ScriptRoot.
function resolveDirs(projectRootArg) {
  let projectRoot = projectRootArg
  let kitDir
  if (projectRoot) {
    kitDir = path.join(projectRoot, NAMA_FOLDER_KIT)
  } else {
    kitDir = ScriptRoot
    projectRoot = path.dirname(kitDir)
  }
  // PowerShell selalu menormalkan huruf drive jadi KAPITAL (mis. "D:\...") di $PSScriptRoot dkk.
  // Node mempertahankan huruf dari cara dipanggil (bisa "d:\..."). Samakan supaya tampilan path
  // IDENTIK di semua pemanggilan (huruf drive tak memengaruhi operasi berkas - Windows abai-huruf).
  return { kitDir: upperDrive(kitDir), projectRoot: upperDrive(projectRoot) }
}

// Naikkan huruf drive Windows jadi kapital. "d:\x" -> "D:\x".
function upperDrive(p) {
  return typeof p === 'string' ? p.replace(/^([a-z]):/, (_m, d) => d.toUpperCase() + ':') : p
}

// ---- Helper: deteksi versi kit (rantai pertahanan-berlapis) ----
// manifest (kit_version) -> CHANGELOG '## [X.Y.Z]'/'## vX.Y.Z' -> 'unknown'. Reuse helper teruji.
function getKitVersion(kitDir) {
  return getKitVersionFallback(kitDir, { changelogPath: path.join(kitDir, 'CHANGELOG.md') })
}

// Tampilan versi yang dinormalkan: kalau sudah ber-awalan
// 'v' -> apa adanya; 'unknown' -> 'unknown'; selain itu tambah 'v'. PERBAIKAN dobel-v (lihat header).
function versionDisplay(version) {
  if (/^v/.test(version)) return version
  if (version === 'unknown') return 'unknown'
  return 'v' + version
}

// Baca manifest JSON dengan aman: buang BOM lalu JSON.parse.
// Melempar kalau gagal parse -> pemanggil yang memutuskan pesan (WARN/skip).
function readManifestJson(manifestPath) {
  return JSON.parse(stripBom(fs.readFileSync(manifestPath, 'utf8')))
}

// Format waktu lokal 'yyyy-MM-dd HH:mm:ss' (waktu lokal).
function formatTimestamp(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ` +
    `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

// ---- Helper: tampilkan usage ----
function showHelp(kitDir) {
  const v = versionDisplay(getKitVersion(kitDir)) // PERBAIKAN dobel-v
  const L = (s = '') => console.log(s)
  L('')
  L(`lintasai - Router perintah kit lintasAI (${v})`)
  L('')
  L('USAGE:')
  L('  npx lintasai <command> [args]')
  L('')
  L('COMMANDS:')
  L('  init      - Setup Pola B di proyek (copy AGENTS.md, docs skeleton, robot keamanan CI)')
  L('              Args: --force, --dry-run')
  L('')
  L('  update    - Update kit ke versi terbaru (ambil paket npm terbaru lalu tukar isinya)')
  L('              Args: --no-backup, --check-only, --cleanup-backups, --allow-downgrade')
  L('')
  L('  uninstall - Hapus kit dari proyek dengan AMAN (diff vs daftar file kit)')
  L('              Args: --dry-run, --allow-modified, --delete-agents, --keep-kit, --yes')
  L('              File project (yang BUKAN dari kit) AMAN tidak terhapus.')
  L('              Path traversal + symlink protection aktif by default.')
  L('')
  L('  doctor    - Diagnostic: cek versi + file inti utuh + cross-ref + lingkungan (Node/OS/Git)')
  L('              --no-env: matikan cek lingkungan (default NYALA)')
  L('')
  L('  status    - Ringkasan 1-layar: versi, install mode, AGENTS.md, manifest, last update')
  L('              (no args)')
  L('')
  L('  version   - Print versi kit aktif (dari .install-manifest.json)')
  L('')
  L('  rollback  - Pulihkan berkas project per-satuan dari cadangan (AGENTS.md/docs)')
  L('              (cadangan per-berkas, bukan seluruh folder). Untuk balik SELURUH folder kit')
  L(`              yang rusak: kembalikan ${NAMA_FOLDER_KIT}.backup-<tanggal> (atau minta`)
  L("              AI: 'rollback dong').")
  L('')
  L('  help      - Tampilkan help ini')
  L('')
  L('EXAMPLES:')
  L('  npx lintasai init --force')
  L('  npx lintasai update')
  L('  npx lintasai doctor')
  L('')
}

// ---- Helper: doctor diagnostic ----
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

  // 2. Berkas inti kit utuh? + 2b. Integritas berkas terpasang (tanda-tangan + sha256).
  // Keduanya diekstrak ke engine/doctor-integrity.mjs — dulu ~130 baris inline di sini yang membuat
  // invokeDoctor jadi 173 baris (lewat langit-langit 100 baris §4.2). Kontrak cetaknya tak berubah.
  acc(checkKitFilesComplete(kitDir, L))
  acc(checkManifestIntegrity(kitDir, projectRoot, L))

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

// ---- Helper: status ringkas 1-layar ----
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
      // Pesan TETAP tanpa detail runtime (tak bocorkan isi manifest). Lihat invokeDiff.
      manifestSignedDisplay = 'N (manifest rusak / tak terbaca)'
    }
  }
  L(`Daftar file kit signed: ${manifestSignedDisplay}`)

  // 5. Last update
  L(`Last update    : ${lastUpdateDisplay}`)

  L('')
  L('Untuk detail lebih lengkap: npx lintasai doctor')
  L('')
  return 0
}

// ---- Helper: print versi ----
function showVersion(kitDir) {
  console.log(getKitVersion(kitDir))
}

// (invokeDiff DICABUT v8.0.0: hasilnya subset `doctor` cek 2b yang lebih lengkap + bertanda-tangan;
//  0 rujukan di dokumen/skill mana pun dan tak pernah ada di help — mustahil ditemukan client.)

// ---- Delegasi ke port Node (update/uninstall/rollback) ----
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

// CATATAN: tak ada lagi perintah yang ditangani inline di sini selain doctor/status/diff/version -
// sisanya di-delegasi lewat delegateNode di atas.

// ---- Router ----
function main(argv) {
  const parsed = parseArgs(argv)
  // Perintah TIDAK peka-huruf ('Doctor'/'DOCTOR' = 'doctor').
  // Tanpa ini, `node kit.mjs Doctor` salah jatuh ke help (beda perilaku + kode-keluar).
  const command = parsed.command.toLowerCase()
  const projectRootArg = parsed.projectRoot
  const extra = parsed.extra
  const { kitDir, projectRoot } = resolveDirs(projectRootArg)

  // Beri tahu kit mana yang diinspeksi - untuk subperintah cuma-baca.
  // CATATAN: 'rollback' DIKELUARKAN di sini - sejak CUTOVER ke port Node (2026-06-23) ia jadi orkestrator
  // yang mencetak header sendiri ("lintasAI rollback - balikin..."), sama seperti setup/update/uninstall
  // yang juga TIDAK ikut baris "Inspecting" (konvensi: cuma perintah inspeksi cuma-baca yang cetak
  // "Inspecting").
  if (['doctor', 'version', 'status'].includes(command)) {
    console.log(`Inspecting kit at: ${kitDir}`)
  }

  // (case 'setup'/'diff'/'check-update' DICABUT v8.0.0: setup = duplikat persis `init` lewat 1 proses
  //  ekstra; diff = subset doctor; check-update = alias 3-proses `update --check-only`. Ketiganya
  //  0 rujukan di dokumen/skill kit.)
  switch (command) {
    case 'update':
      return delegateNode(kitDir, 'update-kit.mjs', ['--project-root', projectRoot, ...extra])
    case 'uninstall':
      return delegateNode(kitDir, 'uninstall.mjs', ['--project-root', projectRoot, ...extra])
    case 'doctor':
      return invokeDoctor(kitDir, projectRoot, extra)
    case 'status':
      return invokeStatus(kitDir, projectRoot)
    case 'version':
      showVersion(kitDir)
      return 0
    case 'rollback':
      // CUTOVER Gelombang 6 (aksi MERUSAK, sesi-khusus owner 2026-06-23): rollback kini pakai port Node
      // engine/rollback.mjs. Suntik --project-root supaya rollback menyasar manifest +
      // .lintasai di project (cermin delegasi setup/update/uninstall). NON-INTERAKTIF: butuh --yes untuk
      // benar-benar menimpa (default-batal).
      return delegateNode(kitDir, 'engine/rollback.mjs', ['--project-root', projectRoot, ...extra])
    // (case 'bump' DICABUT v6.0.0: penulis cap-versi = alat rilis repo kit, kini di tools/version-bump.mjs
    //  yang TIDAK dikirim ke client. Maintainer memakainya langsung: `node tools/version-bump.mjs <versi>`.
    //  Di sisi client perintah ini tak pernah bermakna — kit di sana salinan read-only yang di-refresh
    //  `npx lintasai update`, jadi menaikkan versinya mustahil punya efek.)
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

export { parseArgs, resolveDirs, getKitVersion, versionDisplay, invokeDoctor, invokeStatus, showVersion, showHelp, main }
