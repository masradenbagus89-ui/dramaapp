#!/usr/bin/env node
// engine/rollback.mjs - "Balikin ke versi sebelumnya" (rollback) versi Node, berbasis catatan-pasang + backup.
//
// Cara kerja: baca .install-manifest.json (catatan berkas terpasang), untuk tiap berkas ter-track cari
// backup TERBARU (.bak.<ts> = merge JSON / .backup-<ts> = deploy template), lalu TIMPA berkas sekarang
// dengan isi backup. Sesudahnya: perbarui sidik-jari (SHA-256) di catatan + segel ulang catatan (HMAC)
// supaya tidak memicu alarm "di-utak-atik" palsu.
//
// ===========================================================================================
// FILE INI = JALUR PRODUKSI (aksi MERUSAK). Dispatcher (bin/lintasai.js) memetakan 'rollback' -> file
//   INI di COMMANDS_NODE + menyuntik --project-root; router kit.mjs juga men-delegasi ke sini. Jadi
//   `npx lintasai rollback` MENJALANKAN file ini di PRODUKSI (menimpa berkas project dari backup) --
//   nilai blast radius dengan benar saat menyunting (bukan dormant). Diuji tests/rollback.test.mjs.
//
// NON-INTERAKTIF (keputusan owner 06-22, cermin uninstall.mjs): tak ada popup jendela. Karena ini aksi
//   MERUSAK, default-aman = TIDAK menimpa apa pun; rollback sungguhan WAJIB --yes (AI konfirmasi ke
//   staff di chat dulu). Tanpa --yes -> tampilkan rencana lalu berhenti aman.
//
// PETA BENDERA:
//   --dry-run / --simulasi      : pratinjau saja (tak menimpa apa pun).
//   --yes / -y                  : lewati pintu konfirmasi MERUSAK (= "user pilih Yes").
//   --force                     : ikut lewati pintu konfirmasi + lewati abort manifest TANPA-segel (legacy/pra-HMAC).
//   --accept-untrusted-manifest : lanjut walau SEGEL catatan TIDAK COCOK (mungkin di-tamper). DANGEROUS, opt-in.
//   --project-root <path>       : akar project (mode npx; dispatcher menyuntiknya dari cwd-user).
//
// BATAS VERIFIKASI SEGEL (jujur, sama dgn uninstall.mjs): manifest-signing.mjs (Node) hanya kenal segel
//   format-BARU (urut-abjad); manifest bersegel-LAMA (urutan-acak .NET kit lama) dianggap 'invalid' ->
//   butuh --accept-untrusted-manifest. Ini AMAN: gagal ke arah "jangan timpa"/minta opt-in eksplisit,
//   bukan "timpa sembarangan". Divergensi DISENGAJA dari kit lama + fail-secure (lebih ketat).
//
// DETEKSI REPARSE-POINT (junction/symlink): ditangani engine/reparse-guard.mjs (acuan TUNGGAL logika
//   keamanan, Node murni sejak v2.0.0: fs.lstat + telusur SEMUA folder-induk), di-BATCH. Berkas ini +
//   uninstall.mjs sama-sama meng-IMPOR lalu me-re-export fungsi itu -- tak ada salinan pembungkus lagi.
//   Pemeriksa tak bisa jalan -> BATAL (lebih baik tak menimpa daripada salah ikuti junction ke luar).
// ===========================================================================================
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { makeSafeProjectRoot, resolveSafeProjectPath, getFileSha256 } from './safety.mjs'
import { getManifestSignatureStatus, newManifestSignature, toSignableManifest } from './manifest-signing.mjs'
import { stripBom, isSymlinkLike } from './fs-text.mjs'
import { testPathsHaveReparsePoint } from './reparse-guard.mjs'
import { NAMA_FOLDER_KIT } from './project-root.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ---- Penguraian argumen (gaya Node, double-dash) ----
export function parseArgs(argv) {
  const a = { dryRun: false, force: false, acceptUntrustedManifest: false, yes: false, projectRoot: null }
  for (let i = 0; i < (argv || []).length; i++) {
    const t = String(argv[i]).toLowerCase()
    if (t === '--dry-run' || t === '--dryrun' || t === '--simulasi') a.dryRun = true
    else if (t === '--force') a.force = true
    else if (t === '--accept-untrusted-manifest' || t === '--accepttustedmanifest' || t === '--accept-untrusted') a.acceptUntrustedManifest = true
    else if (t === '--yes' || t === '-y') a.yes = true
    else if (t === '--project-root' || t === '--projectroot') a.projectRoot = argv[++i] || null
  }
  return a
}

// ---- Cari catatan-pasang: probe 3 lokasi kandidat ----
// setup bisa menaruh manifest di akar project ATAU di .lintasai/ tergantung mode. Cek semua.
// (stripBom dipakai di bawah - dari sumber bersama engine/fs-text.mjs, impor di atas.)
export function findManifestPath(projectRoot) {
  const candidates = [
    path.join(projectRoot, '.install-manifest.json'),
    path.join(projectRoot, NAMA_FOLDER_KIT, '.install-manifest.json'),
    path.join(projectRoot, NAMA_FOLDER_KIT, 'install-manifest.json'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return null
}

// ---- Baca + tulis catatan-pasang (JSON) ----
export function readManifestJson(p) {
  return JSON.parse(stripBom(fs.readFileSync(p, 'utf8')))
}
// Tulis ATOMIK: tulis ke berkas sementara dulu lalu rename.
// Tanpa ini, listrik mati/proses ditebas di tengah tulis bisa meninggalkan catatan setengah jadi (rusak).
// Format JSON.stringify(,2) (cermin pemasang Node manifest.mjs) -> segel TETAP sah krn verifikasi
// menghitung-ulang bentuk-baku (canonical) dari NILAI, bukan tata-letak berkas (lihat manifest-signing.mjs).
export function writeManifestJson(p, manifest) {
  const tmp = p + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2), 'utf8')
  fs.renameSync(tmp, p)
}

// ---- Cek apakah working tree git "kotor" (ada perubahan belum di-commit) - hanya untuk peringatan ----
export function testGitDirty(root) {
  try {
    const r = spawnSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8', timeout: 30000 })
    if (r.error) return false
    if (r.status !== 0) return false
    if (!r.stdout || String(r.stdout).trim() === '') return false
    return true
  } catch { return false }
}

// ---- Cari SEMUA berkas backup untuk satu OriginalPath, cocokkan DUA konvensi nama ----
//   1. "<leaf>.bak.<ts>"     -> backup rutin merge JSON (engine/json-merge-helpers.mjs).
//   2. "<leaf>.backup-<ts>"  -> backup deploy template (engine/agents-md.mjs, engine/template-deploy.mjs) = mayoritas
//                               berkas ter-track (AGENTS.md, docs/, dst.).
// Snapshot ".malformed.bak.<ts>" (salinan JSON korup) DIKECUALIKAN -- itu bukan backup sehat.
// Mengembalikan array { name, fullName, mtimeMs }.
export function getLintasBackupCandidate(originalPath) {
  const dir = path.dirname(originalPath)
  const leaf = path.basename(originalPath)
  if (!fs.existsSync(dir)) return []
  let names
  try { names = fs.readdirSync(dir) } catch { return [] }
  const out = []
  const seen = new Set()
  for (const name of names) {
    // Cocokkan pola #1 (.bak.) ATAU #2 (.backup-). startsWith = anchored prefix; readdir+startsWith
    // kebal masalah short-name 8.3 yang bisa salah-cocok di glob filter naif -> Node lebih bersih.
    const isBak = name.startsWith(leaf + '.bak.')
    const isBackup = name.startsWith(leaf + '.backup-')
    if (!isBak && !isBackup) continue
    // KECUALIKAN snapshot korup .malformed.bak.<ts> (defensif).
    if (name.startsWith(leaf + '.malformed.bak.')) continue
    const fullName = path.join(dir, name)
    if (seen.has(fullName)) continue
    seen.add(fullName)
    let mtimeMs = 0
    try {
      const st = fs.statSync(fullName)
      if (!st.isFile()) continue // hanya berkas, bukan folder
      mtimeMs = st.mtimeMs
    } catch { continue }
    out.push({ name, fullName, mtimeMs })
  }
  return out
}

// ---- Pilih backup TERBARU ----
// "Terbaru" = waktu-ubah (LastWriteTime) terbesar. Pakai WAKTU (bukan urut nama) karena dua konvensi
// nama (.bak. vs .backup-) tak sebanding secara leksikal. Tie-break: Name menurun (deterministik).
export function findLatestBackup(originalPath) {
  const candidates = getLintasBackupCandidate(originalPath)
  if (candidates.length === 0) return null
  candidates.sort((a, b) => {
    if (b.mtimeMs !== a.mtimeMs) return b.mtimeMs - a.mtimeMs
    return b.name.localeCompare(a.name) // tie-break: nama menurun
  })
  return candidates[0].fullName
}

// ---- Cek bentuk-path AMAN ----
// Reparse-point (junction/symlink) dicek TERPISAH (di-batch). Di sini hanya:
// tolak kosong / absolut / segmen naik-folder '..' / keluar dari akar project. REUSE resolveSafeProjectPath
// (safety.mjs) = batas keamanan ter-audit (lempar saat ditolak -> kita bungkus jadi {safe,full}).
export function isRollbackPathShapeSafe(safe, relPath) {
  try {
    const full = resolveSafeProjectPath(safe, relPath, 'entri rollback')
    return { safe: true, full }
  } catch {
    return { safe: false, full: null }
  }
}

// Deteksi reparse-point (junction/symlink) banyak path sekaligus -> disatukan ke engine/reparse-guard.mjs
// (audit fungsi-kembar 2026-06-25). Di-impor + di-RE-EXPORT: tanda tangan + perilaku tak berubah.
// (isSymlinkLike, penjaga TOCTOU lstat, juga dari sumber bersama engine/fs-text.mjs - impor di atas.)
export { testPathsHaveReparsePoint }

// ---- Ringkasan rencana - dicetak ke konsol supaya AI/staff paham dampaknya SEBELUM --yes ----
export function formatRollbackPlanSummary(plan, projectRoot) {
  const haveBackup = plan.filter((p) => p.backup != null)
  const count = haveBackup.length
  if (count === 0) return 'Tidak ada file dengan backup yang bisa di-restore.'
  const sampleCount = Math.min(5, count)
  const samples = haveBackup.slice(0, sampleCount).map((p) => {
    let rel = p.original
    if (String(rel).toLowerCase().startsWith(String(projectRoot).toLowerCase())) {
      rel = String(rel).slice(String(projectRoot).length).replace(/^[\\/]+/, '')
    }
    return '  - ' + rel
  })
  let more = ''
  if (count > sampleCount) more = `\n  ... dan ${count - sampleCount} file lain`
  return `Akan restore ${count} file dari backup (.bak.<ts> / .backup-<ts>):\n${samples.join('\n')}${more}\n\n` +
    'File yang sekarang ada di project akan DITIMPA dengan versi backup.'
}

// ========== TAHAP 1-9: siapkan + verifikasi (CUMA-BACA, belum menimpa berkas project) ==========
// Diekstrak dari invokeRollback (2026-07-26); isi tiap tahap dipindah APA ADANYA (teks konsol + urutan
// cek + tiap nilai `return` byte-identik). KONTRAK RETURN sengaja dua bentuk, supaya 8 titik `return`
// di bawah tak perlu disentuh:  berhenti -> objek hasil FINAL ({ status, restored, skipped }) TANPA
// properti `plan`;  lanjut -> { root, kitDir, manifestPath, manifest, manifestWasSigned,
// kitVerForVerify, plan }. `kitDir` ikut dikembalikan karena tahap 6 dapat mengubahnya.
function siapkanRencanaRollback({ projectRoot, kitDir, force, acceptUntrustedManifest, signatureCheck }) {
  // ---- 1. Resolusi akar project ----
  let root
  try {
    if (!projectRoot || String(projectRoot).trim() === '') projectRoot = process.cwd()
    if (!fs.existsSync(projectRoot)) throw new Error('tidak ditemukan')
    root = fs.realpathSync(projectRoot)
  } catch {
    console.log(`[INFO] ProjectRoot tidak valid: ${projectRoot}. Tidak ada yang di-rollback.`)
    return { status: 'no-project-root', restored: 0, skipped: 0 }
  }

  // ---- 2. Cari catatan-pasang ----
  const manifestPath = findManifestPath(root)
  if (!manifestPath) {
    console.log('[INFO] Tidak ada manifest. Belum pernah install atau setup belum jalan. Tidak ada yang di-rollback.')
    return { status: 'no-manifest', restored: 0, skipped: 0 }
  }

  // ---- 3. Peringatan git kotor (tidak menghalangi) ----
  if (testGitDirty(root)) {
    console.warn(`Working tree git dirty di ${root}. Pertimbangkan stash/commit sebelum rollback.`)
  }

  // ---- 4. Baca catatan-pasang ----
  let manifest
  try {
    manifest = readManifestJson(manifestPath)
  } catch (e) {
    console.log(`[ERROR] Gagal parse manifest ${manifestPath}: ${e.message}`)
    return { status: 'manifest-parse-error', restored: 0, skipped: 0 }
  }

  // ---- 5. Manifest punya properti 'files'? (cermin hasFilesProp: properti ADA, walau null/non-array) ----
  const hasFilesProp = manifest && typeof manifest === 'object' && Object.prototype.hasOwnProperty.call(manifest, 'files')
  if (!hasFilesProp) {
    console.log("[INFO] Manifest tidak punya properti 'files'. Tidak ada yang di-rollback.")
    return { status: 'manifest-no-files', restored: 0, skipped: 0 }
  }
  const files = Array.isArray(manifest.files) ? manifest.files : []

  // ---- 6. Resolusi kitDir (tempat manifest-signing.mjs + .manifest-secret) ----
  // signing lib relatif manifest, fallback root/.lintasai. kitDir dipakai untuk
  // (a) verifikasi/segel-ulang HMAC (kunci .manifest-secret) + (b) shim reparse.
  if (!kitDir || String(kitDir).trim() === '') {
    const manifestDir = path.dirname(manifestPath)
    if (fs.existsSync(path.join(manifestDir, 'engine', 'manifest-signing.mjs')) || fs.existsSync(path.join(manifestDir, 'lib', 'manifest-signing.mjs')) || fs.existsSync(path.join(manifestDir, 'lib', 'safety.ps1'))) {
      kitDir = manifestDir
    } else if (fs.existsSync(path.join(root, NAMA_FOLDER_KIT))) {
      kitDir = path.join(root, NAMA_FOLDER_KIT)
    } else {
      kitDir = path.dirname(__dirname) // fallback: kit root dari lokasi rollback.mjs sendiri (.lintasai)
    }
  }

  // ---- 7. Verifikasi SEGEL keaslian (HMAC) sebelum percaya entri ----
  const segel = verifikasiSegelManifest(manifest, { manifestPath, kitDir, force, acceptUntrustedManifest, signatureCheck })
  if (segel.status) return segel // abort keamanan (unsigned / invalid / verifikator error)
  const { manifestWasSigned, kitVerForVerify } = segel

  // ---- 8. Pra-scan: ada minimal 1 backup yang nyambung ke entri? Kalau zero -> graceful no-op ----
  let hasAnyBak = false
  for (const entry of files) {
    const absOrig = path.join(root, String(entry.path == null ? '' : entry.path).replace(/\//g, path.sep))
    if (getLintasBackupCandidate(absOrig).length > 0) { hasAnyBak = true; break }
  }
  if (!hasAnyBak) {
    console.log('[OK] Manifest ada tapi tidak ada file backup (.bak.<ts> / .backup-<ts>). Tidak ada yang di-rollback (fresh install belum di-update).')
    return { status: 'no-backups', restored: 0, skipped: 0 }
  }

  // ---- 9. Bangun rencana (entri -> path asli -> backup terbaru) ----
  const plan = []
  for (const entry of files) {
    const orig = path.join(root, String(entry.path == null ? '' : entry.path).replace(/\//g, path.sep))
    const bak = findLatestBackup(orig)
    plan.push({ entry, original: orig, backup: bak })
  }
  return { root, kitDir, manifestPath, manifest, manifestWasSigned, kitVerForVerify, plan }
}

// TAHAP 7 — gerbang keaslian catatan-pasang. Rollback = menimpa berkas dari .bak ke path arbitrer di
// akar project, jadi kalau manifest di-tamper penyerang bisa menimpa berkas kritis: segel WAJIB
// diverifikasi SEBELUM entri dipercaya. Isi + tiap teks dipindah APA ADANYA.
// Return { status, ... } = abort (diteruskan pemanggil), atau { manifestWasSigned, kitVerForVerify }.
function verifikasiSegelManifest(manifest, { manifestPath, kitDir, force, acceptUntrustedManifest, signatureCheck }) {
  let manifestWasSigned = false
  let kitVerForVerify = ''
  if (manifest.metadata && manifest.metadata.kit_version) kitVerForVerify = String(manifest.metadata.kit_version)
  else if (manifest.kit_version) kitVerForVerify = String(manifest.kit_version)

  const expectedSig = (manifest.metadata && manifest.metadata.signature) ? String(manifest.metadata.signature) : ''
  if (!expectedSig) {
    // ---- Manifest TANPA segel (kit versi lama / pra-HMAC) ----
    console.warn(`[AUDIT] Rollback: manifest UNSIGNED (kit versi lama / install pra-HMAC) di ${manifestPath}.`)
    if (!force) {
      console.log('')
      console.log('[!] Catatan-pasang TANPA segel - tak ada cara memastikan catatan belum diubah.')
      console.log('    RISIKO: kalau backup ter-tamper, rollback bisa restore versi berbahaya.')
      console.log('    Kalau yakin kit dari sumber tepercaya + belum disentuh: ulangi dengan --force.')
      console.log('    Kalau ragu: pasang ulang kit terbaru supaya catatan ber-segel.')
      console.log('[BATAL] Rollback dibatalkan (catatan tanpa segel, butuh --force untuk lanjut).')
      console.warn('[AUDIT] Rollback aborted: unsigned manifest (butuh --force).')
      return { status: 'manifest-unsigned-aborted', restored: 0, skipped: 0 }
    }
    console.warn('[AUDIT] Rollback: --force di-set -> bypass unsigned-manifest (legacy compat).')
  } else {
    // ---- Manifest ber-segel -> verifikasi HMAC ----
    manifestWasSigned = true
    // Penyuntik verifikator (default = produksi). Memungkinkan uji jalur fail-secure saat verifikator
    // MELEMPAR (mis. kunci .manifest-secret tak terbaca / modul rusak) - cermin pola reparseCheck.
    const sigCheckFn = typeof signatureCheck === 'function' ? signatureCheck : (m, o) => getManifestSignatureStatus(m, o)
    let status
    try {
      status = sigCheckFn(manifest, { kitRoot: kitDir })
    } catch (e) {
      // FAIL-SECURE: verifikator error -> JANGAN diam-diam lanjut (abort, exit 1).
      console.warn(`[AUDIT] Rollback: signature verification ERRORED (${manifestPath}): ${e.message}`)
      console.log('[ABORT] Rollback dibatalkan: verifikasi tanda-tangan gagal jalan (fail-secure).')
      console.log('        Periksa engine/manifest-signing.mjs sebelum mengulang.')
      return { status: 'manifest-verify-error', restored: 0, skipped: 0 }
    }
    if (status === 'invalid') {
      console.warn(`[AUDIT] Rollback: manifest signature INVALID di ${manifestPath} - mungkin di-tamper`)
      console.warn('        (atau segel format-LAMA yang versi Node belum bisa verifikasi - lihat catatan di atas berkas ini).')
      if (!acceptUntrustedManifest) {
        console.log('[ABORT] Rollback dibatalkan: signature INVALID.')
        console.log('        Pakai --accept-untrusted-manifest kalau yakin manifest legit (DANGEROUS).')
        return { status: 'manifest-signature-invalid', restored: 0, skipped: 0 }
      }
      console.warn('[AUDIT] Rollback: --accept-untrusted-manifest -> proceed dengan signature INVALID (opt-in eksplisit).')
    }
    // status === 'verified' -> lanjut diam-diam.
  }
  return { manifestWasSigned, kitVerForVerify }
}

// ============================ Inti: invokeRollback ============================
// PURE terhadap argumen (FS read/write + shim reparse). opts.reparseCheck =
// penyuntik pemeriksa-junction tiruan UNTUK UJI (produksi memakai shim reparse-guard.mjs). opts.signatureCheck =
// penyuntik verifikator-segel tiruan UNTUK UJI (default = getManifestSignatureStatus; dipakai menguji
// jalur fail-secure 'manifest-verify-error' saat verifikator MELEMPAR). opts.now (Date) untuk uji
// deterministik (rolledBackAt).
// Mengembalikan objek hasil: { status?, restored, skipped, items?, dryRun?, cancelled? }.
//
// 🚨 TAHAP 10 (pratinjau) + 11 (pintu konfirmasi) SENGAJA TETAP INLINE di sini DAN dalam urutan ini.
//    tests/rollback.test.mjs mengiris SUMBER berkas ini di antara judul kedua tahap itu, lalu menuntut
//    potongannya memuat pemanggilan cek-bentuk-path + penanda blokir-pratinjau. Memindahkan salah
//    satunya ke fungsi lain, menukar urutannya, ATAU menyebut ulang judul tahap itu di komentar mana
//    pun DI ATAS sini, membuat irisan tersebut meleset -> penjaga "pratinjau jujur" mati diam-diam.
export function invokeRollback({ projectRoot, kitDir, force = false, acceptUntrustedManifest = false, dryRun = false, yes = false, reparseCheck, signatureCheck, now = null } = {}) {
  // Tahap 1-9. Jalur berhenti mengembalikan objek hasil FINAL (tanpa .plan) -> teruskan apa adanya.
  const siap = siapkanRencanaRollback({ projectRoot, kitDir, force, acceptUntrustedManifest, signatureCheck })
  if (!siap.plan) return siap
  const { root, manifestPath, manifest, manifestWasSigned, kitVerForVerify, plan } = siap
  kitDir = siap.kitDir

  // ---- 10. SIMULASI (--dry-run): pratinjau saja ----
  if (dryRun) {
    // R5 (audit 2026-06-23): jalankan juga cek BENTUK-path (murni Node, ~0 biaya) supaya pratinjau
    // JUJUR menandai entri yang akan DIBLOKIR saat run nyata - bukan menjanjikan "would restore" untuk
    // berkas yang nanti di-skip. Cek junction/symlink LENGKAP (shim, mahal) tetap hanya di run nyata.
    const safePreview = makeSafeProjectRoot(root)
    let wouldBlock = 0
    for (const p of plan) {
      if (p.backup == null) { console.log(`skip (no backup): ${p.original}`); continue }
      const shape = isRollbackPathShapeSafe(safePreview, String(p.entry.path == null ? '' : p.entry.path))
      if (!shape.safe) { console.log(`would BLOCK (path tidak aman: absolut/'..'/keluar-root): ${p.original}`); wouldBlock++; continue }
      console.log(`would restore: ${p.original} <- ${p.backup}`)
    }
    if (wouldBlock > 0) console.log(`Catatan: ${wouldBlock} entri akan DIBLOKIR demi keamanan. Cek junction/symlink LENGKAP baru jalan saat rollback sungguhan (--yes).`)
    return { dryRun: true, restored: 0, skipped: plan.filter((p) => p.backup == null).length, wouldBlock, items: plan }
  }

  // ---- 11. Pintu konfirmasi MERUSAK (gaya non-interaktif) ----
  console.log('')
  console.log(formatRollbackPlanSummary(plan, root))
  const confirmed = force || yes
  if (!confirmed) {
    console.log('')
    console.log('BERHENTI (default aman): rollback TIDAK dijalankan.')
    console.log('  Ini aksi MERUSAK (menimpa berkas project dengan versi backup). Versi otomatis (Node)')
    console.log('  TIDAK bertanya Y/N di layar seperti dulu, jadi default = tidak menimpa apa pun (NORMAL,')
    console.log('  bukan rusak). Untuk benar-benar rollback: jalankan ulang dengan --yes (sesudah lihat')
    console.log('  rencana di atas). Contoh: npx lintasai rollback --yes')
    return { cancelled: true, restored: 0, skipped: plan.length, items: [] }
  }

  // ---- 12-13. Cek-keamanan path + eksekusi restore (satu-satunya titik yang MENIMPA berkas) ----
  const hasil = eksekusiRestore({ plan, root, kitDir, reparseCheck, now })
  if (hasil.status) return hasil // jalur fail-secure (reparse-check-failed)
  const { restored, skipped, items } = hasil

  // ---- 14. Segel ULANG catatan setelah sha256 berubah (cegah alarm "di-tamper" palsu) ----
  if (manifestWasSigned && restored > 0) segelUlangManifest(manifest, kitVerForVerify, kitDir)

  // ---- 15. Tulis catatan-pasang (atomik) ----
  writeManifestJson(manifestPath, manifest)

  console.log('')
  console.log(`[OK] Rollback selesai. Dipulihkan: ${restored} berkas. Dilewati: ${skipped} berkas.`)
  return { restored, skipped, items }
}

// ============ TAHAP 12-13: cek-keamanan path lalu TIMPA berkas dari backup ============
// Diekstrak dari invokeRollback (2026-07-26); isi + tiap teks konsol dipindah APA ADANYA.
// Ini SATU-SATUNYA tempat berkas project benar-benar ditimpa, jadi seluruh pemeriksaan keamanan
// (bentuk-path, reparse-point batch, lstat backstop TOCTOU) berada tepat di sebelah aksi tulisnya.
// Return { status, ... } = jalur fail-secure yang diteruskan pemanggil; atau { restored, skipped, items }.
function eksekusiRestore({ plan, root, kitDir, reparseCheck, now }) {
  // ---- 12. Cek-keamanan path (bentuk + reparse di-BATCH) untuk kandidat yang punya backup ----
  const safe = makeSafeProjectRoot(root)
  const evals = [] // { p, noBackup, shapeSafe, full }
  for (const p of plan) {
    if (p.backup == null) { evals.push({ p, noBackup: true }); continue }
    const shape = isRollbackPathShapeSafe(safe, String(p.entry.path == null ? '' : p.entry.path))
    evals.push({ p, noBackup: false, shapeSafe: shape.safe, full: shape.full })
  }
  const reparseFn = typeof reparseCheck === 'function' ? reparseCheck : (absPaths) => testPathsHaveReparsePoint(absPaths, root, kitDir)
  const reparseTargets = evals.filter((e) => !e.noBackup && e.shapeSafe).map((e) => e.full)
  let reparseMap
  try {
    reparseMap = reparseFn(reparseTargets)
  } catch (e) {
    // Shim reparse gagal -> fail-secure batal (jangan ambil risiko ikuti junction ke luar project).
    console.log('')
    console.log(`[BATAL] Tidak bisa memeriksa junction/symlink dengan aman: ${e.message}. Tidak ada yang di-rollback (fail-secure).`)
    return { status: 'reparse-check-failed', restored: 0, skipped: plan.length, items: [] }
  }

  // ---- 13. Eksekusi: timpa berkas dari backup (+ perbarui sidik-jari di catatan) ----
  let restored = 0
  let skipped = 0
  const items = []
  const stampNow = now || new Date()

  for (const e of evals) {
    const p = e.p
    if (e.noBackup) {
      skipped++
      items.push({ path: p.entry.path, action: 'skip', reason: 'no-backup' })
      continue
    }
    // SECURITY: tolak path tak-aman (bentuk: absolut/'..'/keluar-root) ATAU reparse (junction/symlink di
    // jalur ATAU folder-induk) ATAU swap-ke-symlink detik-terakhir (lstat backstop, tutup celah TOCTOU).
    if (!e.shapeSafe || reparseMap.get(e.full) === true || isSymlinkLike(e.full)) {
      console.log(`BLOCKED (path tidak aman, di-skip demi keamanan): ${p.entry.path}`)
      skipped++
      items.push({ path: p.entry.path, action: 'blocked', reason: 'unsafe-path' })
      continue
    }
    try {
      fs.copyFileSync(p.backup, e.full) // timpa berkas sekarang dengan isi backup
    } catch (err) {
      console.log(`GAGAL restore ${p.entry.path}: ${err.message}`)
      skipped++
      items.push({ path: p.entry.path, action: 'error', reason: err.message })
      continue
    }
    const newHash = getFileSha256(e.full) // hex HURUF-KECIL
    // Perbarui entri di tempat (bagian dari manifest.files -> ikut tertulis saat write).
    p.entry.sha256 = newHash
    p.entry.rolledBackAt = stampNow.toISOString()
    restored++
    items.push({ path: p.entry.path, action: 'restore', backup: p.backup, sha256: newHash })
  }

  return { restored, skipped, items }
}

// Segel ULANG catatan-pasang setelah sha256 berubah. Restore memperbarui entry.sha256 -> segel HMAC lama
// jadi BASI. Tanpa segel-ulang: rollback BERIKUTNYA / `kit doctor` menilai manifest "INVALID" padahal
// rollback sendiri yang mengubahnya. Dipanggil HANYA kalau manifest memang ber-segel + restored > 0.
// Memutasi `manifest` di tempat (metadata.signature) — pemanggil menuliskannya di tahap 15.
function segelUlangManifest(manifest, kitVerForVerify, kitDir) {
  try {
    const reSignable = toSignableManifest(manifest) // deep-clone + buang metadata.signature
    const newSig = newManifestSignature(reSignable, { kitVersion: kitVerForVerify, kitRoot: kitDir })
    if (!manifest.metadata || typeof manifest.metadata !== 'object') manifest.metadata = {}
    manifest.metadata.signature = newSig
  } catch (e) {
    // Segel-ulang gagal -> JANGAN tinggalkan segel BASI (sumber false-tamper). Hapus segel lama supaya
    // manifest jadi UNSIGNED yang konsisten ("tak ber-segel" lebih aman daripada "ber-segel tapi salah").
    console.warn(`[AUDIT] Rollback: gagal segel ulang manifest (${e.message}). Tanda-tangan lama dihapus agar tidak memicu alarm 'di-tamper' palsu.`)
    // R3 (audit 2026-06-23): petunjuk pemulihan AWAM - restore SUDAH aman; segel bisa dipulihkan
    // tanpa melemahkan pengaman. Cegah staff terbiasa pakai --force sebagai jalan pintas.
    console.warn("[PENTING] Berkas SUDAH dipulihkan dengan aman; hanya 'segel' catatan yang gagal diperbarui.")
    console.warn("          Pulihkan segel: jalankan 'npx lintasai init' (atau 'npx lintasai doctor').")
    console.warn('          JANGAN biasakan pakai --force / --accept-untrusted-manifest sebagai jalan pintas (itu melemahkan pengaman).')
    try {
      if (manifest.metadata && Object.prototype.hasOwnProperty.call(manifest.metadata, 'signature')) {
        delete manifest.metadata.signature
      }
    } catch (e2) {
      console.warn(`[AUDIT] Rollback: gagal menghapus tanda-tangan basi: ${e2.message}`)
    }
  }
}

// ---- Pratinjau (= invokeRollback dengan dryRun) ----
export function getRollbackPreview({ projectRoot, kitDir, reparseCheck } = {}) {
  return invokeRollback({ projectRoot, kitDir, dryRun: true, reparseCheck })
}

// ============================ Orkestrasi CLI (runRollback) ============================
// Mengembalikan kode-keluar (number). isMain memakai process.exitCode (anti potong-output).
export function runRollback(argv, opts = {}) {
  const args = parseArgs(argv)

  // ---- Resolusi akar project (param-driven, fallback ke lokasi script) ----
  let projectRoot
  if (args.projectRoot && String(args.projectRoot).trim() !== '') {
    if (!fs.existsSync(args.projectRoot)) {
      console.error(`ERROR: Akar project tidak ditemukan: ${args.projectRoot}`)
      return 1
    }
    projectRoot = fs.realpathSync(args.projectRoot)
  } else {
    // rollback.mjs ada di .lintasai/engine/ -> akar project = naik 2 level (engine -> .lintasai -> project).
    projectRoot = path.dirname(path.dirname(__dirname))
  }

  // ---- Resolusi kitDir (.lintasai; tempat manifest-signing.mjs + .manifest-secret) ----
  let kitDir = path.dirname(__dirname) // .lintasai (induk dari engine/) - mode lokal/dev
  if (args.projectRoot && String(args.projectRoot).trim() !== '') {
    // Mode npx: script dari cache npm -> arahkan kitDir ke .lintasai di project user.
    const expected = path.join(projectRoot, NAMA_FOLDER_KIT)
    if (fs.existsSync(expected)) kitDir = fs.realpathSync(expected)
    // else: pakai kitDir lokasi script (cache npm) - manifest-signing.mjs isi sama.
  }

  console.log('================================================================')
  console.log('  lintasAI rollback - balikin berkas project ke versi backup')
  console.log('================================================================')
  console.log(`Root proyek   : ${projectRoot}`)

  const reparseCheck = typeof opts.reparseCheck === 'function'
    ? opts.reparseCheck
    : (absPaths) => testPathsHaveReparsePoint(absPaths, projectRoot, kitDir)

  const result = invokeRollback({
    projectRoot,
    kitDir,
    force: args.force,
    acceptUntrustedManifest: args.acceptUntrustedManifest,
    dryRun: args.dryRun,
    yes: args.yes,
    reparseCheck,
    signatureCheck: opts.signatureCheck,
    now: opts.now,
  })

  return rollbackResultToExitCode(result)
}

// Pemetaan hasil -> kode keluar. Abort keamanan / parse-error / shim-gagal = 1; no-op aman / simulasi /
// batal-default / sukses = 0 (cermin uninstall.mjs: default-aman & no-op bukan kegagalan).
export function rollbackResultToExitCode(result) {
  if (!result || typeof result !== 'object') return 1
  const failStatuses = new Set([
    'manifest-parse-error',
    'manifest-unsigned-aborted',
    'manifest-signature-invalid',
    'manifest-verify-error',
    'reparse-check-failed',
  ])
  if (result.status && failStatuses.has(result.status)) return 1
  return 0
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  process.exitCode = runRollback(process.argv.slice(2))
}
