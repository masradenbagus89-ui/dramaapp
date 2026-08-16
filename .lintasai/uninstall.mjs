#!/usr/bin/env node
// uninstall.mjs - Penghapus lintasAI dari sebuah project dengan AMAN, berbasis catatan-pasang.
//
// Cara kerja sama: baca .lintasai/.install-manifest.json (catatan yang
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
//   segel format-lama dianggap 'invalid' -> butuh --yes. AMAN: gagal ke arah "jangan hapus".
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
import { stripBom, eqCI, backupStamp } from './engine/fs-text.mjs'
import { testPathsHaveReparsePoint } from './engine/reparse-guard.mjs'
// Fase E 2026-07-25: laporan (cetak-saja) + eksekusi (satu-satunya titik hapus) dipindah ke engine/.
// Isi dipindah apa adanya — teks konsol + urutan operasi + penjaga TOCTOU byte-identik.
import { printUninstallHeader, printDryRunSummary, printPlan, printUninstallClosing } from './engine/uninstall-report.mjs'
import { deletePristineEntries, backupThenDeleteModified, removeEmptyKitDirs } from './engine/uninstall-exec.mjs'
import { NAMA_FOLDER_KIT, NAMA_FOLDER_KIT_DIKENAL, adalahFolderKit, cariFolderKit } from './engine/project-root.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ---- Penguraian argumen (gaya Node, double-dash) ----
export function parseArgs(argv) {
  // --no-gui DICABUT 2026-07-26: nilainya tak pernah dibaca (sisa era popup jendela; penghapus versi
  // Node memang non-interaktif SELALU, jadi "tanpa GUI" tak punya lawan). Bendera lain di bawah semuanya
  // terpakai. Catatan: alias usang --force DICABUT v8.0.0 - pakai --allow-modified (hapus berkas
  // ter-edit) / --yes (konfirmasi otomatis). Bendera tak dikenal diabaikan -> arah gagal aman (tak menghapus).
  const a = {
    dryRun: false, allowModified: false, deleteAgents: false,
    keepKit: false, yes: false, allowProjectRootMismatch: false, projectRoot: null,
  }
  for (let i = 0; i < argv.length; i++) {
    const t = String(argv[i]).toLowerCase()
    if (t === '--dry-run' || t === '--dryrun' || t === '--simulasi') a.dryRun = true
    else if (t === '--allow-modified' || t === '--allowmodified') a.allowModified = true
    else if (t === '--delete-agents' || t === '--deleteagents') a.deleteAgents = true
    else if (t === '--keep-kit' || t === '--keepkit') a.keepKit = true
    else if (t === '--yes' || t === '-y') a.yes = true
    else if (t === '--allow-project-root-mismatch' || t === '--allowprojectrootmismatch') a.allowProjectRootMismatch = true
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

    // Banding TAK peka huruf-besar-kecil: manifest dgn 'agents.md'/'Agents.md' harus tetap
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
      currentHash = getFileSha256(c.full) // hex HURUF-BESAR
    } catch (e) {
      locked.push({ item: c.item, path: c.full, reason: e.message })
      continue
    }
    if (eqCI(currentHash, c.item.sha256)) pristine.push({ item: c.item, path: c.full })
    else modified.push({ item: c.item, path: c.full, current_sha: currentHash })
  }

  return { pristine, modified, symlinked, blocked, locked, missing, skipped, backups }
}

// ============================ Orkestrasi (main) ============================
// Mengembalikan kode-keluar (number). Memakai process.exitCode di blok isMain (anti potong-output).
// opts.reparseCheck = penyuntik pemeriksa-junction tiruan UNTUK UJI (produksi memakai reparse-guard.mjs Node).
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

  // Pemeriksa junction/symlink: jalur utama Node (default; reparse-guard.mjs lstat ancestor-walk)
  // ATAU suntikan uji. SATU fungsi dipakai untuk
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
  // dgn klasifikasi) untuk SEMUA berkas yang akan disentuh, SEKALI, SEBELUM menghapus apa pun.
  // Kita batch 1x = jendela JS-loop sangat
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

// Resolusi akar project + folder kit + validasi posisi .lintasai.
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
    projectRoot = path.dirname(__dirname) // script ada di .lintasai/, induk = akar project
  }
  console.log(`Root proyek   : ${projectRoot}`)

  // ---- Resolusi folder kit (tempat script ini) ----
  let kitDir = __dirname
  if (args.projectRoot && String(args.projectRoot).trim() !== '') {
    // Mode npx: script dijalankan dari cache npm -> arahkan KitDir ke .lintasai di project.
    // Cari folder kit yang ADA (nama baru menang; nama lama tetap dikenali supaya client yang
    // belum sempat migrasi masih bisa uninstall).
    const temuanKit = cariFolderKit(projectRoot)
    if (temuanKit) {
      kitDir = fs.realpathSync(temuanKit.path)
      console.log(`[mode-npx] KitDir diarahkan ke: ${kitDir}`)
    } else {
      console.log(`[mode-npx] PERINGATAN: ${NAMA_FOLDER_KIT} tidak ditemukan di ${projectRoot}`)
      console.log('Kit mungkin belum dipasang. Jalankan: npx lintasai init')
      return 1
    }
  }

  // ---- Validasi posisi: folder kit HARUS bernama .lintasai ----
  const kitFolderName = path.basename(kitDir)
  // DIKENAL = nama baru ATAU nama lama — client yang belum migrasi tetap boleh uninstall.
  if (!adalahFolderKit(kitFolderName)) {
    console.log('')
    console.log(`BERHENTI: Script ini tidak berada di dalam folder ${NAMA_FOLDER_KIT_DIKENAL.join(' / ')}.`)
    console.log(`          Lokasi script sekarang: ${kitDir}`)
    console.log('')
    console.log('Kemungkinan:')
    console.log('  (A) Kamu jalankan dari folder SALAH (project ini belum pernah pasang lintasAI).')
    console.log(`  (B) Folder kit di-rename ke nama lain (rename balik jadi '${NAMA_FOLDER_KIT}' lalu ulangi).`)
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
  // Node belum bisa baca). 'verified' -> aman, lanjut diam-diam. Default tanpa --yes = BATAL.
  let sigStatus
  try {
    sigStatus = getManifestSignatureStatus(manifest, { kitRoot: kitDir })
  } catch (e) {
    // FAIL-SECURE: verifikator error JANGAN diam-diam lanjut.
    console.log('')
    console.log(`PERINGATAN: Verifikasi segel catatan-pasang GAGAL JALAN: ${e.message}`)
    console.log('[BATAL] Penghapusan dibatalkan: verifikasi segel tak bisa jalan (fail-secure).')
    console.log('        Periksa engine/manifest-signing.mjs sebelum mengulang.')
    return 1
  }
  const bypass = args.yes
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
      console.log(`  Kalau ${NAMA_FOLDER_KIT} disalin dari project LAIN: JANGAN lanjut (catatan milik project lain).`)
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

// ---- Util kecil ---- (stripBom/eqCI/backupStamp dari sumber bersama engine/fs-text.mjs, impor di atas;
//      isSymlinkLike kini dipakai di engine/uninstall-exec.mjs, tempat penghapusan sesungguhnya terjadi)

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  process.exitCode = runUninstall(process.argv.slice(2))
}
