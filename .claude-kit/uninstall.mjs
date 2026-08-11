#!/usr/bin/env node
// uninstall.mjs - Penghapus lintasAI dari sebuah project dengan AMAN (versi Node), berbasis catatan-pasang.
//
// Padanan uninstall.ps1. Cara kerja sama: baca .claude-kit/.install-manifest.json (catatan yang
// dibuat saat pasang) lalu bandingkan sidik-jari (SHA-256) tiap berkas kit vs berkas di disk:
//   ASLI    (sidik-jari cocok)   -> hapus otomatis (berkas persis sama dgn yang dipasang kit).
//   DIEDIT  (sidik-jari beda)    -> DILEWATI (kamu sudah ubah). --allow-modified -> backup .bak lalu hapus.
//   TAUTAN  (junction/symlink)   -> SELALU dilewati (tak pernah dihapus otomatis; cegah bocor isi luar).
//   DITOLAK (keluar dari project) -> dilewati (entri catatan yang menunjuk ke luar project = ditolak).
//   TERKUNCI(gagal baca sidik-jari) -> dilewati (berkas dikunci editor/antivirus; tutup editor lalu ulangi).
//   HILANG  (berkas sudah tak ada)  -> dilewati diam-diam.
// Folder yang dibuat saat pasang hanya dihapus kalau KOSONG. Berkas project kamu di sana TETAP aman.
// AGENTS.md default DILEWATI (biasanya kamu sunting berat) - pakai --delete-agents untuk ikut hapus.
//
// ===========================================================================================
// SIFAT NON-INTERAKTIF (keputusan owner 06-22): ini aksi MERUSAK -> default-aman TIDAK menghapus
//   apa pun; hapus sungguhan WAJIB --yes (AI konfirmasi ke staff di chat dulu). Tanpa --yes ->
//   hanya menampilkan rencana lalu berhenti aman.
// BATAS VERIFIKASI SEGEL (jujur): manifest-signing.mjs hanya kenal segel format-BARU (urut-abjad);
//   segel format-lama dianggap 'invalid' -> butuh --force/--yes. AMAN: gagal ke arah "jangan hapus".
// DETEKSI JUNCTION/SYMLINK: engine/reparse-guard.mjs (Node murni sejak v2.0.0: lstat + telusur
//   folder-induk, batch 1x). Gagal cek -> BATAL (fail-secure: lebih baik tak menghapus daripada
//   salah ikuti junction ke luar project).
// ===========================================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeSafeProjectRoot, resolveSafeProjectPath } from './engine/safety.mjs'
import { getFileSha256 } from './engine/manifest.mjs'
import { getLintasExpectedSchemaVersion } from './engine/expected-schema.mjs'
import { getManifestSignatureStatus } from './engine/manifest-signing.mjs'
import { stripBom, eqCI, backupStamp, isSymlinkLike } from './engine/fs-text.mjs'
import { testPathsHaveReparsePoint } from './engine/reparse-guard.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ---- Penguraian argumen (gaya Node, double-dash) - cermin param uninstall.ps1 ----
export function parseArgs(argv) {
  const a = {
    dryRun: false, allowModified: false, force: false, deleteAgents: false,
    keepKit: false, yes: false, allowProjectRootMismatch: false, noGui: false, projectRoot: null,
  }
  for (let i = 0; i < argv.length; i++) {
    const t = String(argv[i]).toLowerCase()
    if (t === '--dry-run' || t === '--dryrun' || t === '--simulasi') a.dryRun = true
    else if (t === '--allow-modified' || t === '--allowmodified') a.allowModified = true
    else if (t === '--force') a.force = true
    else if (t === '--delete-agents' || t === '--deleteagents') a.deleteAgents = true
    else if (t === '--keep-kit' || t === '--keepkit') a.keepKit = true
    else if (t === '--yes' || t === '-y') a.yes = true
    else if (t === '--allow-project-root-mismatch' || t === '--allowprojectrootmismatch') a.allowProjectRootMismatch = true
    else if (t === '--no-gui' || t === '--nogui') a.noGui = true
    else if (t === '--project-root' || t === '--projectroot') a.projectRoot = argv[++i] || null
  }
  return a
}

// eqCI (banding tak peka huruf) -> sumber bersama engine/fs-text.mjs (impor di atas).

// ---- Deteksi reparse-point (junction/symlink) -> disatukan ke engine/reparse-guard.mjs (audit
//      fungsi-kembar 2026-06-25; Node murni sejak v2.0.0). Di-impor + di-RE-EXPORT supaya pemanggil
//      internal + tes tetap bisa pakai dari modul ini (tanda tangan + perilaku tak berubah).
export { testPathsHaveReparsePoint }

// ---- Inti: klasifikasi tiap berkas catatan-pasang. PURE terhadap argumen (FS read + shim reparse). ----
// opts: { deleteAgents, reparseCheck } ; reparseCheck(absPaths)->Map<absPath,boolean> (bisa di-stub utk uji).
// Mengembalikan { pristine, modified, symlinked, blocked, locked, missing, skipped, backups } (array).
export function classifyManifest(manifest, safe, kitDir, opts = {}) {
  const deleteAgents = opts.deleteAgents === true
  const reparseCheck = typeof opts.reparseCheck === 'function'
    ? opts.reparseCheck
    : (absPaths) => testPathsHaveReparsePoint(absPaths, safe.root, kitDir)

  const pristine = [], modified = [], symlinked = [], blocked = [], locked = [], missing = [], skipped = [], backups = []
  const files = Array.isArray(manifest.files) ? manifest.files : []

  // Tahap 1: pisahkan skip/backup/blocked/missing + kumpulkan kandidat yang ADA di disk (utk cek reparse batch).
  const candidates = [] // { item, full }
  for (const item of files) {
    const relPath = String(item.path == null ? '' : item.path)
    const itemKind = String(item.kind == null ? '' : item.kind)

    // Cermin PS -eq (TAK peka huruf-besar-kecil): manifest dgn 'agents.md'/'Agents.md' harus tetap
    // dianggap AGENTS.md (dilewati default), bukan berkas-biasa-yang-dihapus. Sama untuk kind 'backup'.
    if (eqCI(relPath, 'AGENTS.md') && !deleteAgents) {
      skipped.push({ item, reason: 'AGENTS.md dilewati (pakai --delete-agents untuk ikut hapus)' })
      continue
    }
    if (eqCI(itemKind, 'backup')) { backups.push({ item }); continue }

    let fullPath
    try {
      fullPath = resolveSafeProjectPath(safe, relPath, `berkas '${relPath}'`)
    } catch (e) {
      blocked.push({ item, reason: `path keluar dari project root (ditolak: ${e.message})` })
      continue
    }
    if (!fs.existsSync(fullPath)) { missing.push({ item, path: fullPath }); continue }
    candidates.push({ item, full: fullPath })
  }

  // Tahap 2: cek reparse-point untuk semua kandidat sekaligus (1 panggilan shim).
  const reparseMap = reparseCheck(candidates.map((c) => c.full))

  // Tahap 3: klasifikasi sisa (TAUTAN / TERKUNCI / ASLI / DIEDIT).
  for (const c of candidates) {
    if (reparseMap.get(c.full) === true) { symlinked.push({ item: c.item, path: c.full }); continue }
    let currentHash
    try {
      currentHash = getFileSha256(c.full) // hex HURUF-BESAR (cermin Get-FileHash)
    } catch (e) {
      locked.push({ item: c.item, path: c.full, reason: e.message })
      continue
    }
    if (eqCI(currentHash, c.item.sha256)) pristine.push({ item: c.item, path: c.full })
    else modified.push({ item: c.item, path: c.full, current_sha: currentHash })
  }

  return { pristine, modified, symlinked, blocked, locked, missing, skipped, backups }
}

// Hitung jumlah segmen path (untuk urut folder terdalam-dulu, cermin PS Sort-Object segmen-count).
function segmentCount(s) { return String(s).split(/[\\/]/).length }

// ============================ Orkestrasi (main) ============================
// Mengembalikan kode-keluar (number). Memakai process.exitCode di blok isMain (anti potong-output).
// opts.reparseCheck = penyuntik pemeriksa-junction tiruan UNTUK UJI (produksi memakai shim PowerShell).
export function runUninstall(argv, opts = {}) {
  const args = parseArgs(argv)

  // ---- Resolusi akar project + folder kit (helper; kegagalan -> kode keluar) ----
  const roots = resolveUninstallRoots(args)
  if (typeof roots === 'number') return roots
  const { projectRoot, kitDir } = roots

  // ---- Cek + baca catatan-pasang (helper; kegagalan -> kode keluar) ----
  const timestamp = backupStamp(new Date())
  const loaded = loadUninstallManifest(kitDir)
  if (typeof loaded === 'number') return loaded
  const { manifest } = loaded

  // ---- Verifikasi segel + skema + kecocokan akar project (helper; kegagalan -> kode keluar) ----
  const trustCode = checkUninstallTrust(manifest, { args, kitDir, projectRoot, timestamp })
  if (trustCode !== null) return trustCode

  // ---- Siapkan akar canonical (dipakai helper safety) ----
  const safe = makeSafeProjectRoot(projectRoot)
  const projectName = path.basename(projectRoot)

  // Pemeriksa junction/symlink: jalur utama Node (default; reparse-guard.mjs lstat ancestor-walk,
  // PowerShell hanya cadangan saat Node gagal fatal) ATAU suntikan uji. SATU fungsi dipakai untuk
  // klasifikasi DAN cek-ulang TOCTOU sebelum hapus -> sama-kuat (telusur folder-induk) di kedua titik.
  const reparseCheck = typeof opts.reparseCheck === 'function'
    ? opts.reparseCheck
    : (absPaths) => testPathsHaveReparsePoint(absPaths, safe.root, kitDir)

  printUninstallHeader(manifest, args, projectName, projectRoot)

  // ---- Klasifikasi ----
  let groups
  try {
    groups = classifyManifest(manifest, safe, kitDir, { deleteAgents: args.deleteAgents, reparseCheck })
  } catch (e) {
    // Pemeriksa reparse gagal jalan (jalur Node + cadangan PS dua-duanya gagal) -> fail-secure batal.
    console.log('')
    console.log(`[BATAL] Tidak bisa memeriksa junction/symlink dengan aman: ${e.message}`)
    console.log('        Penghapusan dibatalkan demi keamanan. (Jalur Node murni; gagal-aman saat cek junction/symlink tak bisa dipastikan.)')
    return 1
  }
  const { pristine, modified } = groups

  // ---- Cetak rencana ----
  printPlan(groups, manifest, args)

  if (args.dryRun) return printDryRunSummary(groups, args)

  // ---- Konfirmasi sebelum eksekusi (helper; non-interaktif: butuh --yes untuk aksi merusak) ----
  const confirmCode = confirmDeletionOrStop(args, pristine, modified)
  if (confirmCode !== null) return confirmCode

  // ---- TOCTOU (tutup celah): cek-ULANG junction/symlink (telusur folder-induk via shim, sama-kuat
  // dgn klasifikasi) untuk SEMUA berkas yang akan disentuh, SEKALI, SEBELUM menghapus apa pun. Cermin
  // Test-PathHasReparsePoint PS di titik hapus (PS cek per-berkas; kita batch 1x = jendela JS-loop sangat
  // sempit, + per-berkas lstat di bawah menutup swap-berkas detik-terakhir). Gagal cek -> BATAL sebelum
  // hapus apa pun (fail-secure: lebih baik tak menghapus daripada salah ikuti junction ke luar project).
  const toCheckExec = pristine.map((p) => p.path)
  if (args.allowModified) for (const m of modified) toCheckExec.push(m.path)
  let reparseAtExec
  try {
    reparseAtExec = reparseCheck(toCheckExec)
  } catch (e) {
    console.log('')
    console.log(`[BATAL] Cek-ulang junction sebelum hapus gagal: ${e.message}. Tidak ada yang dihapus (fail-secure).`)
    return 1
  }

  // ---- Eksekusi: hapus berkas asli (helper; re-hash + cek-ulang junction = tutup celah TOCTOU) ----
  console.log('')
  console.log('--- EKSEKUSI ---')
  const pristineRes = deletePristineEntries(pristine, reparseAtExec)
  let deletedCount = pristineRes.deleted
  let errorCount = pristineRes.errors
  const rehashSkipped = pristineRes.rehashSkipped

  // ---- Eksekusi: backup + hapus berkas yang diedit (helper; kalau --allow-modified) ----
  if (args.allowModified && modified.length > 0) {
    const modRes = backupThenDeleteModified(modified, safe, timestamp, reparseAtExec)
    deletedCount += modRes.deleted
    errorCount += modRes.errors
  }

  // ---- Hapus folder kosong (helper; terdalam dulu supaya nested aman) ----
  const dirsRes = removeEmptyKitDirs(manifest, safe, reparseCheck)
  errorCount += dirsRes.errors
  const { dirs, dirDeleted, dirsMissing } = dirsRes

  // ---- Status berkas project + instruksi hapus-sendiri + ringkasan (helper) ----
  printUninstallClosing({
    projectRoot, kitDir, args, groups,
    dirs, dirDeleted, dirsMissing,
    deletedCount, errorCount, rehashSkipped,
  })

  return errorCount > 0 ? 1 : 0
}

// ============== Helper runUninstall (pecahan §5: fungsi <100 baris) ==============
// Kode DIPINDAH apa adanya dari badan runUninstall (2026-07-22) - perilaku + urutan +
// teks keluaran konsol byte-identik. Helper yang bisa gagal mengembalikan kode-keluar.

// Resolusi akar project + folder kit + validasi posisi .claude-kit.
// Kembalikan number (kode-keluar) saat gagal, atau { projectRoot, kitDir } saat sah.
function resolveUninstallRoots(args) {
  // ---- Resolusi akar project (param-driven, fallback ke lokasi script) ----
  let projectRoot
  if (args.projectRoot && String(args.projectRoot).trim() !== '') {
    if (!fs.existsSync(args.projectRoot)) {
      console.error(`ERROR: Akar project tidak ditemukan: ${args.projectRoot}`)
      return 1
    }
    projectRoot = fs.realpathSync(args.projectRoot)
  } else {
    projectRoot = path.dirname(__dirname) // script ada di .claude-kit/, induk = akar project
  }
  console.log(`Root proyek   : ${projectRoot}`)

  // ---- -Force = alias usang untuk --allow-modified (peringatkan) ----
  if (args.force) {
    console.log('')
    console.log('[USANG] Bendera --force. Pakai --allow-modified.')
    console.log('        --force masih bekerja sebagai alias demi kompatibilitas, tapi akan dihapus nanti.')
    console.log('')
    if (!args.allowModified) args.allowModified = true
  }

  // ---- Resolusi folder kit (tempat script ini) ----
  let kitDir = __dirname
  if (args.projectRoot && String(args.projectRoot).trim() !== '') {
    // Mode npx: script dijalankan dari cache npm -> arahkan KitDir ke .claude-kit di project.
    const expectedKitDir = path.join(projectRoot, '.claude-kit')
    if (fs.existsSync(expectedKitDir)) {
      kitDir = fs.realpathSync(expectedKitDir)
      console.log(`[mode-npx] KitDir diarahkan ke: ${kitDir}`)
    } else {
      console.log(`[mode-npx] PERINGATAN: .claude-kit tidak ditemukan di ${projectRoot}`)
      console.log('Kit mungkin belum dipasang. Jalankan: npx lintasai init')
      return 1
    }
  }

  // ---- Validasi posisi: folder kit HARUS bernama .claude-kit ----
  const kitFolderName = path.basename(kitDir)
  if (kitFolderName !== '.claude-kit') {
    console.log('')
    console.log('BERHENTI: Script ini tidak berada di dalam folder .claude-kit.')
    console.log(`          Lokasi script sekarang: ${kitDir}`)
    console.log('')
    console.log('Kemungkinan:')
    console.log('  (A) Kamu jalankan dari folder SALAH (project ini belum pernah pasang lintasAI).')
    console.log('  (B) Folder kit di-rename dari .claude-kit ke nama lain (rename balik lalu ulangi).')
    console.log('')
    console.log('TIDAK ADA satu pun berkas project kamu yang disentuh. Aman.')
    return 1
  }

  return { projectRoot, kitDir }
}

// Cek keberadaan + baca catatan-pasang. Kembalikan number saat gagal, atau { manifest }.
function loadUninstallManifest(kitDir) {
  const manifestPath = path.join(kitDir, '.install-manifest.json')
  if (!fs.existsSync(manifestPath)) {
    console.log('')
    console.log('BERHENTI: Tidak bisa lanjut karena berkas pencatat pasang hilang.')
    console.log('')
    console.log('Apa yang terjadi: tiap kali kit dipasang, ia membuat catatan kecil berisi DAFTAR berkas kit')
    console.log(`  + sidik-jari tiap berkas: ${manifestPath}`)
    console.log('  Tanpa catatan ini, script TIDAK BERANI hapus apa pun (takut salah hapus berkas project kamu).')
    console.log('')
    console.log('Cara pulih (pilih salah satu):')
    console.log('  A. Pasang ulang: npx lintasai init  (akan membuat ulang catatan dari berkas kit yang ada).')
    console.log('  B. Hapus manual sesuai daftar di README bagian "Kalau manifest TIDAK ADA".')
    return 1
  }
  let manifest
  try {
    manifest = JSON.parse(stripBom(fs.readFileSync(manifestPath, 'utf8')))
  } catch (e) {
    console.log('')
    console.log('ERROR: Catatan-pasang tidak bisa dibaca (JSON rusak):')
    console.log(`       Lokasi : ${manifestPath}`)
    console.log(`       Pesan  : ${e.message}`)
    console.log('')
    console.log('Saran: pasang ulang (npx lintasai init) untuk membuat ulang catatan dari berkas yang ada.')
    return 1
  }
  return { manifest }
}

// Verifikasi segel HMAC + schema_version + kecocokan akar project.
// Kembalikan number (kode-keluar) saat harus berhenti, atau null saat aman lanjut.
function checkUninstallTrust(manifest, { args, kitDir, projectRoot, timestamp }) {
  // ---- Verifikasi segel keaslian (HMAC) ----
  // 'unsigned' -> kit lama / pra-segel. 'invalid' -> mungkin diutak-atik (atau segel format-lama yang
  // Node belum bisa baca). 'verified' -> aman, lanjut diam-diam. Default tanpa --force/--yes = BATAL.
  let sigStatus
  try {
    sigStatus = getManifestSignatureStatus(manifest, { kitRoot: kitDir })
  } catch (e) {
    // FAIL-SECURE (cermin uninstall.ps1): verifikator error JANGAN diam-diam lanjut.
    console.log('')
    console.log(`PERINGATAN: Verifikasi segel catatan-pasang GAGAL JALAN: ${e.message}`)
    console.log('[BATAL] Penghapusan dibatalkan: verifikasi segel tak bisa jalan (fail-secure).')
    console.log('        Periksa engine/manifest-signing.mjs sebelum mengulang.')
    return 1
  }
  const bypass = args.force || args.yes
  if (sigStatus === 'unsigned') {
    console.log('')
    console.log('[!] Catatan-pasang TANPA segel (kit versi lama / pasang sebelum fitur segel).')
    if (!bypass) {
      console.log('    RISIKO: tak ada cara memastikan catatan belum diubah. Berkas yang akan dihapus')
      console.log('            bisa salah kalau catatan sudah diutak-atik.')
      console.log('    Kalau yakin kit dari sumber tepercaya + belum disentuh: ulangi dengan --yes.')
      console.log('    Kalau ragu: pasang ulang kit terbaru supaya catatan ber-segel.')
      console.log('[BATAL] Penghapusan dibatalkan (catatan tanpa segel, butuh --yes untuk lanjut).')
      return 1
    }
    console.warn(`CATATAN-AUDIT: User memilih lanjut hapus dgn catatan TANPA segel. Project=${projectRoot} Waktu=${timestamp}. Verifikasi keaslian dilewati atas persetujuan eksplisit user.`)
  } else if (sigStatus === 'invalid') {
    console.log('')
    console.log('[!] Segel catatan-pasang TIDAK COCOK - catatan mungkin sudah diubah setelah dipasang.')
    console.log('    (Atau: segel format-lama yang versi Node belum bisa verifikasi - lihat catatan di atas berkas ini.)')
    if (!bypass) {
      console.log('    Kalau RAGU: jangan lanjut, pasang ulang dari sumber resmi.')
      console.log('    Lanjut HANYA kalau kamu paham risiko + sudah periksa catatan manual: ulangi dengan --yes.')
      console.log('[BATAL] Penghapusan dibatalkan (segel tidak cocok, butuh --yes untuk lanjut).')
      return 1
    }
    console.warn(`CATATAN-AUDIT: User memilih lanjut hapus dgn segel TIDAK COCOK. Project=${projectRoot} KitDir=${kitDir} Waktu=${timestamp}. Verifikasi keaslian dilewati atas persetujuan eksplisit user.`)
  }

  // ---- Validasi schema_version (penjaga maju-kompat) ----
  // Angka dari peta versi-diharapkan (engine/expected-schema.mjs, Mesin 1 STRATEGI_UPDATE_v2) - satu
  // sumber dgn penulis engine/manifest.mjs. TETAP cek PERSIS-sama (===), BUKAN >=: menghapus berkas
  // berdasar catatan berformat lebih BARU dari yang skrip ini pahami = bahaya (fail-closed dua arah).
  const expectedManifestSchema = getLintasExpectedSchemaVersion('.install-manifest.json')
  const schemaVersion = parseInt(String(manifest.schema_version), 10)
  if (schemaVersion !== expectedManifestSchema) {
    console.log('')
    console.log(`ERROR: Versi skema catatan = ${manifest.schema_version} (script ini cuma kenal schema_version=${expectedManifestSchema}).`)
    console.log('       Catatan mungkin dari kit versi lebih baru. Perbarui kit, atau pakai uninstall versi sama.')
    return 1
  }

  // ---- Cek kecocokan akar project di catatan vs lokasi sekarang ----
  const manifestProjectRoot = String(manifest.project_root == null ? '' : manifest.project_root)
  const projectRootSupplied = !!(args.projectRoot && String(args.projectRoot).trim() !== '')
  if (!projectRootSupplied && manifestProjectRoot && manifestProjectRoot !== projectRoot && manifestProjectRoot !== '<PROJECT_ROOT>') {
    console.log('')
    if (!args.allowProjectRootMismatch) {
      console.log('BATAL: Akar project di catatan TIDAK cocok dengan lokasi sekarang.')
      console.log(`  Catatan dipasang di : ${manifestProjectRoot}`)
      console.log(`  Lokasi sekarang     : ${projectRoot}`)
      console.log('')
      console.log('  Kalau folder di-rename/pindah: ulangi dengan --allow-project-root-mismatch.')
      console.log('  Kalau .claude-kit disalin dari project LAIN: JANGAN lanjut (catatan milik project lain).')
      return 1
    }
    console.log('PERINGATAN: ketidakcocokan akar project ditimpa lewat --allow-project-root-mismatch.')
    console.log(`  Catatan dipasang di : ${manifestProjectRoot}`)
    console.log(`  Lokasi sekarang     : ${projectRoot}`)
  } else if (projectRootSupplied && manifestProjectRoot && manifestProjectRoot !== projectRoot && manifestProjectRoot !== '<PROJECT_ROOT>') {
    console.log('')
    console.log('INFO: --project-root diberi eksplisit, pengecekan akar di catatan dilewati.')
  }

  return null
}

// Cetak header + daftar bendera aktif.
function printUninstallHeader(manifest, args, projectName, projectRoot) {
  console.log('')
  console.log('================================================================')
  console.log('  lintasAI uninstall - hapus aman berbasis sidik-jari')
  console.log('================================================================')
  console.log(`Proyek         : ${projectName} (${projectRoot})`)
  console.log(`Versi kit      : ${manifest.kit_version}`)
  console.log(`Dipasang       : ${manifest.installed_at} oleh ${manifest.installed_by}`)
  console.log(`Berkas tercatat: ${Array.isArray(manifest.files) ? manifest.files.length : 0}`)
  console.log(`Folder tercatat: ${Array.isArray(manifest.directories_created) ? manifest.directories_created.length : 0}`)

  const flags = []
  if (args.dryRun) flags.push('SIMULASI (pratinjau saja, tidak ada yang dihapus)')
  if (args.allowModified) flags.push('--allow-modified (berkas yang diedit akan di-backup + hapus)')
  if (args.force && !args.allowModified) flags.push('--force (USANG, alias untuk --allow-modified)')
  if (args.deleteAgents) flags.push('--delete-agents (AGENTS.md ikut dievaluasi)')
  if (args.keepKit) flags.push('--keep-kit (instruksi hapus-sendiri .claude-kit disembunyikan)')
  if (args.yes) flags.push('--yes (konfirmasi otomatis, lewati pertanyaan)')
  if (args.allowProjectRootMismatch) flags.push('--allow-project-root-mismatch (timpa cek akar project)')
  if (flags.length > 0) {
    console.log('Bendera aktif  :')
    for (const f of flags) console.log(`  - ${f}`)
  } else {
    console.log('Bendera aktif  : (default - konservatif, lewati berkas yang sudah diedit)')
  }
  console.log('')
}

// Cetak ringkasan mode SIMULASI lalu kembalikan kode-keluar 0.
function printDryRunSummary(groups, args) {
  const { pristine, modified, symlinked, blocked, locked, missing, skipped, backups } = groups
  console.log('')
  console.log('--- RINGKASAN SIMULASI ---')
  console.log(`  Aman dihapus (asli)      : ${pristine.length} berkas`)
  if (modified.length > 0) {
    if (args.allowModified) console.log(`  Diedit user + backup     : ${modified.length} berkas (karena --allow-modified)`)
    else console.log(`  Diedit user (DILEWATI)   : ${modified.length} berkas - pakai --allow-modified kalau mau ikut hapus`)
  }
  if (symlinked.length > 0) console.log(`  Tautan/junction          : ${symlinked.length} berkas (SELALU dilewati)`)
  if (locked.length > 0) console.log(`  Terkunci (cek editor)    : ${locked.length} berkas`)
  if (blocked.length > 0) console.log(`  DITOLAK (keluar project) : ${blocked.length} berkas - catatan mungkin diutak-atik`)
  console.log(`  Sudah hilang             : ${missing.length} berkas`)
  console.log(`  Sengaja dilewati         : ${skipped.length} berkas (mis. AGENTS.md)`)
  if (backups.length > 0) console.log(`  Backup pra-pasang        : ${backups.length} berkas (dipertahankan)`)
  console.log('')
  console.log('Yakin dengan rencana di atas?')
  console.log('  - Lanjut hapus beneran : jalankan ulang TANPA --dry-run, tambah --yes')
  console.log('  - Batal                : tidak ada yang berubah')
  return 0
}

// Konfirmasi non-interaktif sebelum eksekusi: tanpa --yes -> berhenti aman (kode 0), dgn --yes -> null (lanjut).
function confirmDeletionOrStop(args, pristine, modified) {
  console.log('')
  let forceSuffix = ''
  if (args.allowModified) forceSuffix = ` + ${modified.length} diedit (dengan backup)`
  console.log(`Total berkas akan dihapus: ${pristine.length} asli${forceSuffix}`)
  if (!args.yes) {
    console.log('')
    console.log('BERHENTI (default aman): penghapusan TIDAK dijalankan.')
    console.log('  Ini aksi MERUSAK. Versi otomatis (Node) TIDAK lagi bertanya Y/N di layar seperti dulu,')
    console.log('  jadi default-nya = tidak menghapus apa pun (ini NORMAL, bukan rusak).')
    console.log('  Untuk benar-benar menghapus: jalankan ulang dengan --yes (sesudah lihat rencana di atas).')
    console.log('  Contoh: npx lintasai uninstall --yes')
    return 0
  }
  console.log('Konfirmasi otomatis via --yes.')
  return null
}

// Hapus berkas ASLI (re-hash + cek-ulang junction sesaat sebelum hapus = tutup celah TOCTOU).
function deletePristineEntries(pristine, reparseAtExec) {
  let deleted = 0, errors = 0, rehashSkipped = 0
  for (const p of pristine) {
    let rehash
    try {
      rehash = getFileSha256(p.path)
    } catch (e) {
      console.log(`KUNCI ${p.item.path}: ${e.message}`)
      console.log('       PETUNJUK: Tutup berkas di editor (VS Code/Notepad), lalu ulangi.')
      errors++
      continue
    }
    if (!eqCI(rehash, p.item.sha256)) {
      console.log(`LEWATI ${p.item.path}: berkas berubah sejak rencana dibuat (mungkin diedit setelah simulasi)`)
      rehashSkipped++
      continue
    }
    // Tutup celah TOCTOU: cek-ulang junction/symlink sebelum hapus. reparseAtExec = telusur folder-induk
    // (shim PS, sama-kuat klasifikasi) + isSymlinkLike (lstat, penjaga detik-terakhir) + re-hash di atas
    // (menangkap swap-isi). Tiga lapis, cermin Test-PathHasReparsePoint+LinkType PS di titik hapus.
    if (reparseAtExec.get(p.path) === true || isSymlinkLike(p.path)) {
      console.log(`LEWATI ${p.item.path}: TOCTOU - jadi tautan/junction setelah rencana, tidak dihapus`)
      rehashSkipped++
      continue
    }
    try {
      fs.rmSync(p.path, { force: true })
      console.log(`HAPUS ${p.item.path}`)
      deleted++
    } catch (e) {
      console.log(`GAGAL ${p.item.path}: ${e.message}`)
      console.log('       PETUNJUK: Tutup berkas di editor, lalu ulangi.')
      errors++
    }
  }
  return { deleted, errors, rehashSkipped }
}

// Backup lalu hapus berkas DIEDIT (jalur --allow-modified).
function backupThenDeleteModified(modified, safe, timestamp, reparseAtExec) {
  let deleted = 0, errors = 0
  for (const m of modified) {
    const bakPath = `${m.path}.pre-uninstall-${timestamp}.bak`
    let bakResolved
    try { bakResolved = path.resolve(bakPath) } catch {
      console.log(`GAGAL ${m.item.path}: path backup tidak valid`); errors++; continue
    }
    // Pertahanan berlapis: pastikan path backup tetap di dalam akar project.
    if (!bakResolved.toLowerCase().startsWith(safe.canonical.toLowerCase())) {
      console.log(`GAGAL ${m.item.path}: path backup keluar dari akar project (DITOLAK)`); errors++; continue
    }
    if (!fs.existsSync(m.path)) { console.log(`LEWATI ${m.item.path}: berkas hilang sejak rencana dibuat`); continue }
    // Cek-ulang junction sebelum backup+hapus: telusur folder-induk (shim) + lstat. PENTING untuk
    // berkas DIEDIT karena Copy-Item lewat junction bisa menyalin isi LUAR project ke .bak (bocor).
    if (reparseAtExec.get(m.path) === true || isSymlinkLike(m.path)) {
      console.log(`LEWATI ${m.item.path}: TOCTOU - jadi tautan/junction setelah rencana, tidak di-backup/hapus`)
      continue
    }
    try {
      fs.copyFileSync(m.path, bakPath)
      fs.rmSync(m.path, { force: true })
      console.log(`BACKUP ${m.item.path} -> ${path.basename(bakPath)}`)
      deleted++
    } catch (e) {
      console.log(`GAGAL ${m.item.path}: ${e.message}`)
      if (fs.existsSync(bakPath)) console.log(`       CATATAN: backup ada di ${path.basename(bakPath)} (berkas asli tetap di tempat)`)
      errors++
    }
  }
  return { deleted, errors }
}

// Hapus folder kosong dari catatan (terdalam dulu supaya nested aman; junction dijaga 3-lapis).
function removeEmptyKitDirs(manifest, safe, reparseCheck) {
  const dirs = Array.isArray(manifest.directories_created) ? manifest.directories_created.map(String) : []
  const dirsSorted = [...dirs].sort((a, b) => segmentCount(b) - segmentCount(a))
  let dirDeleted = 0, errors = 0
  const dirsMissing = []
  const systemNoise = new Set(['desktop.ini', 'thumbs.db', '.ds_store'])

  // KEAMANAN (paritas pass berkas + uninstall.ps1:884 Test-PathHasReparsePoint): periksa SEMUA
  // folder kandidat lewat shim penelusur-folder-INDUK SEBELUM rmdir. isSymlinkLike (lstat) SAJA terlalu
  // sempit -> bisa tertembus junction folder yang menunjuk ke LUAR project (mis. 'docs/' = junction ke
  // folder luar; sub-folder kosong di dalamnya bisa ter-rmdir folder NYATA di luar project; PS terlindungi
  // karena menelusur induk). engine/safety.mjs sendiri memperingatkan lstat "JANGAN dilemahkan demi Node".
  // Batch 1x (cermin TOCTOU berkas), fail-secure kalau shim gagal.
  const dirCheckPaths = []
  for (const dStr of dirsSorted) {
    let fd
    try { fd = resolveSafeProjectPath(safe, dStr, `folder '${dStr}'`) } catch { continue }
    if (fs.existsSync(fd)) dirCheckPaths.push(fd)
  }
  let reparseDirs = new Map()
  let reparseDirsFailed = false
  if (dirCheckPaths.length > 0) {
    try {
      reparseDirs = reparseCheck(dirCheckPaths)
    } catch (e) {
      // Shim gagal -> JANGAN hapus folder apa pun (fail-secure, semangat sama dgn pass berkas).
      reparseDirsFailed = true
      console.log('')
      console.log(`[CATATAN] Cek junction folder gagal (${e.message}); semua folder kit DIPERTAHANKAN (fail-secure). Hapus manual bila yakin aman.`)
    }
  }

  for (const dStr of dirsSorted) {
    let fullDir
    try {
      fullDir = resolveSafeProjectPath(safe, dStr, `folder '${dStr}'`)
    } catch { errors++; continue }
    if (!fs.existsSync(fullDir)) { dirsMissing.push(dStr); continue }
    // Penjaga reparse 3-lapis (cermin pass berkas): shim penelusur-folder-induk (sama-kuat
    // klasifikasi) + isSymlinkLike (lstat backstop). reparseDirsFailed -> jangan hapus folder apa pun.
    if (reparseDirsFailed || reparseDirs.get(fullDir) === true || isSymlinkLike(fullDir)) {
      console.log(`SIMPAN ${dStr} (tautan/junction terdeteksi atau tak terverifikasi aman, tidak diikuti)`)
      continue
    }
    let entries = []
    try { entries = fs.readdirSync(fullDir) } catch { /* abaikan */ }
    const realEntries = entries.filter((n) => !systemNoise.has(n.toLowerCase()))
    if (realEntries.length === 0) {
      for (const noise of entries) {
        if (systemNoise.has(noise.toLowerCase())) {
          try { fs.rmSync(path.join(fullDir, noise), { force: true }) } catch { /* best-effort */ }
        }
      }
      try {
        fs.rmdirSync(fullDir)
        console.log(`HAPUS-FOLDER ${dStr}`)
        dirDeleted++
      } catch (e) {
        console.log(`GAGAL hapus folder ${dStr}: ${e.message}`)
        errors++
      }
    } else {
      const sample = realEntries.slice(0, 5)
      let sampleStr = sample.join(', ')
      if (realEntries.length > 5) sampleStr += ', ...'
      console.log(`SIMPAN ${dStr} (${realEntries.length} berkas/folder milikmu tersisa: ${sampleStr})`)
    }
  }

  return { dirs, dirDeleted, dirsMissing, errors }
}

// Cetak status berkas project + instruksi hapus-sendiri .claude-kit + ringkasan akhir.
function printUninstallClosing({ projectRoot, kitDir, args, groups, dirs, dirDeleted, dirsMissing, deletedCount, errorCount, rehashSkipped }) {
  const { modified, symlinked, blocked, locked, skipped, backups } = groups

  // ---- Tenangkan dulu (status berkas project) sebelum instruksi hapus-sendiri ----
  console.log('')
  console.log('=== BERKAS PROJECT KAMU - STATUS ===')
  console.log('Yang AMAN (tidak disentuh sama sekali):')
  for (const dStr of dirs) {
    const fullDir = path.join(projectRoot, dStr.replace(/\//g, path.sep))
    if (fs.existsSync(fullDir)) {
      let userFiles = []
      try { userFiles = fs.readdirSync(fullDir) } catch { /* abaikan */ }
      if (userFiles.length > 0) console.log(`  - ${dStr} : ${userFiles.length} berkas/folder milikmu, AMAN`)
    }
  }
  if (modified.length > 0 && !args.allowModified) console.log(`  - ${modified.length} berkas kit yang sudah kamu edit TETAP ADA di tempatnya.`)
  if (skipped.length > 0) console.log('  - AGENTS.md (kalau ada) TETAP ADA - default dilewati karena biasanya kamu sunting.')
  console.log('Verifikasi: jalankan `git status` di akar project - berkas project tidak boleh muncul sebagai terhapus.')

  // ---- Instruksi hapus-sendiri (kecuali --keep-kit) ----
  if (!args.keepKit) {
    console.log('')
    console.log('=== LANGKAH TERAKHIR (manual) ===')
    console.log('Folder .claude-kit TIDAK BISA dihapus oleh script ini (karena script ada di dalamnya).')
    console.log('')
    console.log('Cara hapus:')
    console.log('  1. TUTUP semua VS Code/editor yang sedang buka berkas di .claude-kit.')
    console.log('  2. Buka PowerShell baru di akar project (folder INDUK dari .claude-kit).')
    console.log('  3. Salin-tempel perintah berikut PERSIS:')
    console.log('')
    console.log(`     Remove-Item -Recurse -Force '${kitDir}'`)
    console.log('')
    console.log('  4. Cek folder .claude-kit sudah hilang di File Explorer.')
  }

  // ---- Ringkasan ----
  console.log('')
  console.log('================================================================')
  console.log(`  lintasAI uninstall - ${(errorCount > 0 || locked.length > 0) ? 'SELESAI SEBAGIAN' : 'SELESAI'}`)
  console.log('================================================================')
  console.log(`Berkas dihapus    : ${deletedCount}`)
  console.log(`Folder dihapus    : ${dirDeleted}`)
  if (rehashSkipped > 0) console.log(`Sidik-jari berubah: ${rehashSkipped} (berkas berubah sejak rencana, tidak dihapus)`)
  if (modified.length > 0 && !args.allowModified) console.log(`Diedit disimpan   : ${modified.length} (pakai --allow-modified kalau mau ikut hapus)`)
  if (symlinked.length > 0) console.log(`Tautan dilewati   : ${symlinked.length} (cek manual)`)
  if (locked.length > 0) console.log(`Terkunci dilewati : ${locked.length} (tutup editor, ulangi)`)
  if (blocked.length > 0) console.log(`DITOLAK (keluar)  : ${blocked.length} - catatan mungkin diutak-atik, periksa manual`)
  if (dirsMissing.length > 0) console.log(`Folder tercatat hilang: ${dirsMissing.length} (mungkin di-rename: ${dirsMissing.join(', ')})`)
  if (backups.length > 0) console.log(`Backup pra-pasang : ${backups.length} (dipertahankan, hapus manual kalau mau)`)
  if (skipped.length > 0) console.log(`Dilewati          : ${skipped.length} (AGENTS.md / lain-lain)`)
  if (errorCount > 0) console.log(`ERROR             : ${errorCount} (cek log di atas)`)
  // R8 (audit 2026-06-23): kalau ada yang gagal/terkunci, kit terhapus SEBAGIAN - katakan TERANG +
  // tegaskan AMAN diulang (penghapusan idempoten), supaya staff non-programmer tak kira "rusak".
  if (errorCount > 0 || locked.length > 0) {
    console.log('')
    console.log('CATATAN: kit terhapus SEBAGIAN - sebagian berkas/folder belum terhapus (mungkin terkunci editor/antivirus).')
    console.log('         AMAN diulang: tutup editor/antivirus lalu jalankan uninstall sekali lagi (yang sudah hilang akan dilewati).')
  }
  console.log('')
}

// ---- Cetak rencana per-kategori ----
function printPlan(groups, manifest, args) {
  const { pristine, modified, symlinked, blocked, locked, missing, skipped, backups } = groups
  console.log('--- RENCANA HAPUS ---')

  if (pristine.length > 0) {
    console.log('')
    console.log(`[ASLI] ${pristine.length} berkas (sidik-jari cocok, HAPUS OTOMATIS):`)
    for (const p of pristine) console.log(`  - ${p.item.path}`)
  }
  if (modified.length > 0) {
    console.log('')
    if (args.allowModified) console.log(`[DIEDIT] ${modified.length} berkas (diedit user, BACKUP + HAPUS karena --allow-modified):`)
    else console.log(`[DIEDIT] ${modified.length} berkas (diedit user, DILEWATI - pakai --allow-modified untuk hapus dengan backup):`)
    for (const m of modified) console.log(`  [edit] ${m.item.path}`)
  }
  if (symlinked.length > 0) {
    console.log('')
    console.log(`[TAUTAN] ${symlinked.length} berkas (junction/symlink terdeteksi, SELALU dilewati - cek manual):`)
    for (const s of symlinked) console.log(`  [tautan] ${s.item.path}`)
  }
  if (locked.length > 0) {
    console.log('')
    console.log(`[TERKUNCI] ${locked.length} berkas (gagal baca sidik-jari - mungkin dibuka editor/antivirus):`)
    for (const l of locked) console.log(`  [kunci] ${l.item.path}`)
    console.log('         PETUNJUK: Tutup berkas di editor, lalu ulangi.')
  }
  if (blocked.length > 0) {
    console.log('')
    console.log(`[DITOLAK] ${blocked.length} berkas (path keluar dari project - DITOLAK):`)
    for (const b of blocked) console.log(`  [tolak] ${b.item.path}`)
  }
  if (missing.length > 0) {
    console.log('')
    console.log(`[HILANG] ${missing.length} berkas (sudah tidak ada, dilewati):`)
    for (const m of missing) console.log(`  - ${m.item.path}`)
  }
  if (skipped.length > 0) {
    console.log('')
    console.log(`[DILEWATI] ${skipped.length} berkas:`)
    for (const s of skipped) console.log(`  - ${s.item.path} (${s.reason})`)
  }
  if (backups.length > 0) {
    console.log('')
    console.log(`[CADANGAN] ${backups.length} berkas backup pra-pasang ditemukan (DIPERTAHANKAN, hapus manual kalau mau):`)
    for (const b of backups) console.log(`  - ${b.item.path}`)
  }

  console.log('')
  console.log('[FOLDER] Folder dari catatan (cek kosong sebelum hapus):')
  for (const d of (Array.isArray(manifest.directories_created) ? manifest.directories_created : [])) console.log(`  - ${d}`)

  console.log('')
  if (args.keepKit) console.log('[KIT] Folder .claude-kit DIPERTAHANKAN (--keep-kit aktif).')
  else console.log('[KIT] Folder .claude-kit harus kamu hapus MANUAL (script tidak bisa hapus-diri saat berjalan, instruksi di akhir).')
}

// ---- Util kecil ---- (stripBom/eqCI/backupStamp/isSymlinkLike dari sumber bersama engine/fs-text.mjs, impor di atas)

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  process.exitCode = runUninstall(process.argv.slice(2))
}
