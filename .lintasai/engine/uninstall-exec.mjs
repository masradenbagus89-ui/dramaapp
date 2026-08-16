// engine/uninstall-exec.mjs — TITIK HAPUS uninstall (satu-satunya modul yang benar-benar menghapus).
//
// Dipecah dari uninstall.mjs (Fase E 2026-07-25): isi dipindah APA ADANYA — urutan operasi, penjaga,
// dan teks konsol byte-identik. KENAPA dipisah: semua `fs.rmSync`/`fs.rmdirSync` alat ini sekarang
// duduk di SATU berkas kecil, jadi audit "apa yang bisa menghapus" tak perlu membaca 700 baris.
//
// PENJAGA YANG TIDAK BOLEH DILEMAHKAN (tiap satu pernah jadi lubang nyata):
//   1. Re-hash sesaat sebelum hapus  -> berkas yang berubah sesudah rencana dibuat TIDAK dihapus.
//   2. Cek-ulang junction/symlink (reparseAtExec = telusur folder-INDUK) + isSymlinkLike (lstat)
//      -> tutup celah TOCTOU; lstat SAJA terlalu sempit (junction folder tembus).
//   3. Folder: fail-secure — shim gagal = JANGAN hapus folder apa pun.
// Dipanggil HANYA sesudah pemanggil memastikan konfirmasi --yes (aksi merusak, lihat uninstall.mjs).
import fs from 'node:fs'
import path from 'node:path'
import { resolveSafeProjectPath } from './safety.mjs'
import { getFileSha256 } from './manifest.mjs'
import { eqCI, isSymlinkLike } from './fs-text.mjs'

// Hitung jumlah segmen path (untuk urut folder terdalam-dulu, cermin PS Sort-Object segmen-count).
function segmentCount(s) { return String(s).split(/[\\/]/).length }

// Hapus berkas ASLI (re-hash + cek-ulang junction sesaat sebelum hapus = tutup celah TOCTOU).
export function deletePristineEntries(pristine, reparseAtExec) {
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
    // (sama-kuat klasifikasi) + isSymlinkLike (lstat, penjaga detik-terakhir) + re-hash di atas
    // (menangkap swap-isi). Tiga lapis di titik hapus.
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
export function backupThenDeleteModified(modified, safe, timestamp, reparseAtExec) {
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
    // berkas DIEDIT karena copy lewat junction bisa menyalin isi LUAR project ke .bak (bocor).
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
export function removeEmptyKitDirs(manifest, safe, reparseCheck) {
  const dirs = Array.isArray(manifest.directories_created) ? manifest.directories_created.map(String) : []
  const dirsSorted = [...dirs].sort((a, b) => segmentCount(b) - segmentCount(a))
  let dirDeleted = 0, errors = 0
  const dirsMissing = []
  const systemNoise = new Set(['desktop.ini', 'thumbs.db', '.ds_store'])

  // KEAMANAN (paritas pass berkas): periksa SEMUA
  // folder kandidat lewat shim penelusur-folder-INDUK SEBELUM rmdir. isSymlinkLike (lstat) SAJA terlalu
  // sempit -> bisa tertembus junction folder yang menunjuk ke LUAR project (mis. 'docs/' = junction ke
  // folder luar; sub-folder kosong di dalamnya bisa ter-rmdir folder NYATA di luar project)
  // engine/safety.mjs sendiri memperingatkan lstat "JANGAN dilemahkan demi Node".
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
