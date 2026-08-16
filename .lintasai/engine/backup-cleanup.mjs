// engine/backup-cleanup.mjs — ROTASI cadangan (berkas *.bak/*.backup-* + folder .lintasai.backup-*).
//
// Dipecah dari update-kit.mjs (Fase E 2026-07-25): isi + teks laporan dipindah APA ADANYA.
// Ini menghapus berkas, jadi sengaja berdiri sendiri: hanya dipanggil kalau user memilih
// --cleanup-backups (OPT-IN, default MATI) — lihat pemanggilnya di update-kit.mjs.
// Batas amannya: hanya menyapu ISI LANGSUNG projectRoot (readdirSync tanpa rekursi) dan hanya nama
// yang cocok pola cadangan; berkas kerja user tak pernah masuk daftar.
import fs from 'node:fs'
import path from 'node:path'
import { adalahCadanganKit } from './project-root.mjs'

// Bersihkan berkas cadangan (*.bak / *.backup-*) di akar project +
// rotasi FOLDER cadangan (.lintasai.backup-*). Hapus yang > maxAgeDays hari, lalu per nama-dasar
// simpan keepLatest terbaru. Return jumlah yang dihapus. Aman: folder tak ada / tak ada cadangan -> 0.
// Pencocokan nama TAK-peka huruf-besar-kecil (NTFS Windows).
export function invokeBackupCleanup(projectRoot = '.', { maxAgeDays = 30, keepLatest = 3 } = {}) {
  try {
    if (!fs.existsSync(projectRoot)) {
      console.log(`[WARN] Project root tidak ada: ${projectRoot}`)
      return 0
    }
    const listFiles = (matcher) => {
      let out = []
      try {
        for (const e of fs.readdirSync(projectRoot, { withFileTypes: true })) {
          if (e.isFile() && matcher(e.name.toLowerCase())) out.push(path.join(projectRoot, e.name))
        }
      } catch { /* abaikan */ }
      return out
    }
    const listDirs = (matcher) => {
      let out = []
      try {
        for (const e of fs.readdirSync(projectRoot, { withFileTypes: true })) {
          if (e.isDirectory() && matcher(e.name.toLowerCase())) out.push(path.join(projectRoot, e.name))
        }
      } catch { /* abaikan */ }
      return out
    }
    const isBak = (n) => n.endsWith('.bak')
    const isBackupDash = (n) => n.includes('.backup-')
    // Kenali cadangan bernama BARU maupun LAMA: cadangan yang dibuat sebelum rename sudah duduk di
    // disk client. Kalau cuma nama baru yang dikenali, cadangan lama tak pernah dirotasi (menumpuk).
    const isKitBackupDir = (n) => adalahCadanganKit(n)

    // Dua listing digabung (.bak DAN .backup-*).
    let backupFiles = [...listFiles(isBak), ...listFiles(isBackupDash)]
    const backupDirsPre = listDirs(isKitBackupDir)
    if (backupFiles.length === 0 && backupDirsPre.length === 0) {
      console.log('Cleanup: tidak ada cadangan (berkas/folder) ditemukan.')
      return 0
    }

    let removed = 0
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
    const mtime = (p) => { try { return fs.statSync(p).mtimeMs } catch { return 0 } }

    // --- Langkah 1: hapus yang lebih tua dari maxAgeDays ---
    for (const f of backupFiles) {
      if (mtime(f) < cutoff) {
        try { fs.rmSync(f, { force: true }); removed++ }
        catch (e) { console.log(`[WARN] Gagal hapus ${path.basename(f)}: ${e.message}`) }
      }
    }

    // --- Langkah 2: per nama-dasar, simpan keepLatest terbaru ---
    // "Nama-dasar" = nama sebelum akhiran .bak / .backup-* (mis. AGENTS.md.backup-... -> "AGENTS.md").
    const remaining = [...listFiles(isBak), ...listFiles(isBackupDash)]
    const groups = new Map()
    for (const f of remaining) {
      const base = backupBaseName(path.basename(f))
      if (!groups.has(base)) groups.set(base, [])
      groups.get(base).push(f)
    }
    for (const [, grp] of groups) {
      if (grp.length <= keepLatest) continue
      const sorted = grp.slice().sort((a, b) => mtime(b) - mtime(a)) // terbaru dulu
      const excess = sorted.slice(keepLatest) // sisanya = paling lama
      for (const f of excess) {
        try { fs.rmSync(f, { force: true }); removed++ }
        catch (e) { console.log(`[WARN] Gagal hapus ${path.basename(f)}: ${e.message}`) }
      }
    }

    // --- Langkah 3: rotasi FOLDER cadangan .lintasai.backup-* ---
    const backupDirs = listDirs(isKitBackupDir)
    if (backupDirs.length > keepLatest) {
      const excessDirs = backupDirs.slice().sort((a, b) => mtime(b) - mtime(a)).slice(keepLatest)
      for (const d of excessDirs) {
        try { fs.rmSync(d, { recursive: true, force: true }); removed++ }
        catch (e) { console.log(`[WARN] Gagal hapus folder cadangan ${path.basename(d)}: ${e.message}`) }
      }
    }

    console.log(`Cleanup: ${removed} cadangan/folder lama dihapus (> ${maxAgeDays} hari atau di luar ${keepLatest} terbaru).`)
    return removed
  } catch (e) {
    console.log(`[ERROR] Bersih-bersih cadangan gagal total: ${e.message}`)
    return 0
  }
}
// Nama-dasar berkas cadangan. Cocokkan TAK-peka huruf-besar-kecil -> flag 'i'.
function backupBaseName(name) {
  let m = name.match(/^(.+?)\.backup-/i)
  if (m) return m[1]
  m = name.match(/^(.+?)\.bak$/i)
  if (m) return m[1]
  return name
}
