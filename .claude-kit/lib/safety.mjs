#!/usr/bin/env node
// lib/safety.mjs - Helper keamanan path (versi Node murni; dulu berpadanan lib/safety.ps1 — dihapus v2.0.0).
//
// DI-PORT (logika murni, byte-identik perilaku dgn PS):
//   - makeSafeProjectRoot     : normalkan project root + bentuk "canonical" (akhiran pemisah).
//   - resolveSafeProjectPath  : validasi path relatif dari manifest -> path absolut DALAM project root.
//                               TOLAK: path absolut, segmen naik-folder '..', path yang keluar root.
//                               Tolak = lempar error (batas keamanan, bukan fallback diam).
//   - getFileSha256           : SHA-256 file -> hex HURUF-KECIL (cermin Get-FileSha256 di safety.ps1;
//                               BEDA dari manifest.mjs yang HURUF-BESAR -- dua kontrak berbeda, sengaja).
//
// DETEKSI REPARSE-POINT (symlink/junction): kini Node MURNI di lib/reparse-guard.mjs
//   (dulu Test-PathHasReparsePoint di lib/safety.ps1, dihapus v2.0.0 saat kit jadi 100% Node).
//   fs.lstat().isSymbolicLink() Node lebih sempit dari atribut Windows `FileAttributes.ReparsePoint`,
//   jadi reparse-guard.mjs memilih BATAL-AMAN (fail-closed) untuk jenis reparse yang tak jelas —
//   tetap KONTROL KEAMANAN (cegah redirect symlink keluar root), JANGAN dilemahkan. Dipakai
//   uninstall.mjs + lib/rollback.mjs (testPathsHaveReparsePoint).
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Normalkan project root (resolve '.', '..') + bentuk canonical berakhiran pemisah folder
// (cegah salah-cocok awalan: "C:\proj" jangan cocok "C:\proj-evil").
export function makeSafeProjectRoot(projectRoot) {
  if (!projectRoot || String(projectRoot).trim() === '') throw new Error('makeSafeProjectRoot: projectRoot wajib diisi.')
  const root = path.resolve(String(projectRoot))
  const canonical = root.endsWith(path.sep) ? root : root + path.sep
  return { root, canonical }
}

// Validasi + resolve path relatif (dari manifest) ke absolut DALAM project root. Lempar saat ditolak.
export function resolveSafeProjectPath(safe, relPath, label = 'entry') {
  if (!safe || !safe.canonical) throw new Error('resolveSafeProjectPath: project root belum disiapkan (panggil makeSafeProjectRoot dulu).')
  if (relPath == null || String(relPath).trim() === '') throw new Error(`TOLAK path kosong untuk ${label}`)
  const rp = String(relPath)
  // Tolak path absolut: huruf-drive (C:\), UNC (\\server\), atau diawali pemisah.
  if (path.isAbsolute(rp) || /^[a-zA-Z]:/.test(rp) || /^[\\/]/.test(rp)) {
    throw new Error(`TOLAK path absolut di manifest (${label}): ${rp}`)
  }
  // Tolak segmen naik-folder '..'.
  if (/(^|[\\/])\.\.([\\/]|$)/.test(rp)) {
    throw new Error(`TOLAK segmen naik-folder '..' di manifest (${label}): ${rp}`)
  }
  const candidate = path.join(safe.root, rp.replace(/\//g, path.sep))
  let full
  try { full = path.resolve(candidate) } catch (e) {
    throw new Error(`TOLAK path tidak sah di manifest (${label}): ${rp}`)
  }
  const canon = safe.canonical.endsWith(path.sep) ? safe.canonical : safe.canonical + path.sep
  // Cek "masih di dalam root" (awalan, abaikan besar/kecil huruf -> cermin Windows OrdinalIgnoreCase).
  if (!full.toLowerCase().startsWith(canon.toLowerCase())) {
    throw new Error(`TOLAK path keluar dari project root (${label}): ${rp} -> ${full}`)
  }
  return full
}

// SHA-256 file -> hex HURUF-KECIL. Lempar kalau berkas tak ada (cermin Get-FileSha256 di safety.ps1).
export function getFileSha256(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`getFileSha256: berkas tidak ditemukan: ${filePath}`)
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toLowerCase()
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  // CLI tipis untuk uji-banding: `node lib/safety.mjs resolve <root> <relPath>` -> "ACCEPT<TAB>path" / "REJECT".
  const [cmd, root, rel] = process.argv.slice(2)
  if (cmd === 'resolve' && root != null && rel != null) {
    try { console.log('ACCEPT\t' + resolveSafeProjectPath(makeSafeProjectRoot(root), rel)) } catch { console.log('REJECT') }
  } else {
    console.error('Pakai: node lib/safety.mjs resolve <root> <relPath>')
    process.exit(2)
  }
}
