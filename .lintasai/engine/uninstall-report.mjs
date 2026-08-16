// engine/uninstall-report.mjs — LAPORAN uninstall (cetak-saja, NOL efek-samping ke disk).
//
// Dipecah dari uninstall.mjs (Fase E 2026-07-25): berkas induk lewat ambang berkas-gemuk. Isi
// dipindah APA ADANYA — teks konsol byte-identik, urutan cetak sama. Yang cetak dipisah dari yang
// MENGHAPUS supaya tiap perubahan teks tak perlu membuka modul yang memegang fs.rmSync.
//
// Modul ini HANYA console.log + fs.readdirSync/existsSync (baca folder untuk laporan "berkas kamu
// masih ada"). Tak ada satu pun operasi hapus/tulis di sini — sengaja, biar audit alat destruktif
// cukup membaca engine/uninstall-exec.mjs.
import fs from 'node:fs'
import path from 'node:path'
import { NAMA_FOLDER_KIT } from './project-root.mjs'

// Cetak header + daftar bendera aktif.
export function printUninstallHeader(manifest, args, projectName, projectRoot) {
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
  if (args.deleteAgents) flags.push('--delete-agents (AGENTS.md ikut dievaluasi)')
  if (args.keepKit) flags.push(`--keep-kit (instruksi hapus-sendiri ${NAMA_FOLDER_KIT} disembunyikan)`)
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
export function printDryRunSummary(groups, args) {
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

// ---- Cetak rencana per-kategori ----
export function printPlan(groups, manifest, args) {
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
  if (args.keepKit) console.log(`[KIT] Folder ${NAMA_FOLDER_KIT} DIPERTAHANKAN (--keep-kit aktif).`)
  else console.log(`[KIT] Folder ${NAMA_FOLDER_KIT} harus kamu hapus MANUAL (script tidak bisa hapus-diri saat berjalan, instruksi di akhir).`)
}

// Cetak status berkas project + instruksi hapus-sendiri .lintasai + ringkasan akhir.
export function printUninstallClosing({ projectRoot, kitDir, args, groups, dirs, dirDeleted, dirsMissing, deletedCount, errorCount, rehashSkipped }) {
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
    console.log(`Folder ${NAMA_FOLDER_KIT} TIDAK BISA dihapus oleh script ini (karena script ada di dalamnya).`)
    console.log('')
    console.log('Cara hapus:')
    console.log(`  1. TUTUP semua VS Code/editor yang sedang buka berkas di ${NAMA_FOLDER_KIT}.`)
    console.log(`  2. Buka PowerShell baru di akar project (folder INDUK dari ${NAMA_FOLDER_KIT}).`)
    console.log('  3. Salin-tempel perintah berikut PERSIS:')
    console.log('')
    console.log(`     Remove-Item -Recurse -Force '${kitDir}'`)
    console.log('')
    console.log(`  4. Cek folder ${NAMA_FOLDER_KIT} sudah hilang di File Explorer.`)
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
