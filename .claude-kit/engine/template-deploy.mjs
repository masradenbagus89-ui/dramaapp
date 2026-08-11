#!/usr/bin/env node
// engine/template-deploy.mjs - Helper deploy template (port Node dari template-deploy.ps1).
//
// MIGRASI grup [A] (ADR-003): robot PENULIS PENUH (salin template + placeholder + backup).
//
// Kontrak penting:
//  - Substitusi LITERAL via split/join (bukan regex) -> value ber-karakter $0/$1/$ tak corrupt.
//  - Tulis UTF-8 NO-BOM (fs writeFileSync utf8). Strip BOM saat baca (cermin Get-Content -Encoding UTF8).
//  - SHA256 file TARGET (post-substitution), hex UPPERCASE (cermin Get-FileHash.Hash).
//  - action: created | updated | skipped | missing.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { writeUtf8NoBom, readTemplate, backupStamp } from './fs-text.mjs'

export function getSupportedPlaceholder() {
  return ['<NAMA_PROYEK>', '<TANGGAL_HARI_INI>', '<NAMA_KAMU>', '<URL_REPO_STANDAR>', '<VERSI_KIT>']
}

// SHA256 hex UPPERCASE dari file (cermin Get-FileHash -Algorithm SHA256 .Hash).
function fileSha256Hex(filePath) {
  if (!fs.existsSync(filePath)) return null
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase()
}

// writeUtf8NoBom dipindah ke sumber bersama engine/fs-text.mjs (audit fungsi-kembar 2026-06-25).

// defaultBackupSuffix -> backupStamp (sumber bersama engine/fs-text.mjs).

// Skip/Backup/Overwrite. Return true kalau caller boleh write, false kalau skip.
function resolveExistingTarget(targetPath, mode, backupSuffix) {
  if (!fs.existsSync(targetPath)) return true // target tidak ada -> bebas write
  if (mode === 'Skip') return false
  if (mode === 'Overwrite') return true
  if (mode === 'Backup') {
    const suffix = backupSuffix || backupStamp(new Date())
    fs.copyFileSync(targetPath, `${targetPath}.backup-${suffix}`)
    return true
  }
  return false
}

// readTemplate -> sumber bersama engine/fs-text.mjs (audit fungsi-kembar 2026-06-25).

// Copy template + placeholder substitution -> { copied, action, sha256 }.
export function copyTemplateWithPlaceholder({ sourcePath, targetPath, placeholders = {}, ifExists = 'Skip', backupSuffix = null } = {}) {
  if (!fs.existsSync(sourcePath)) return { copied: false, action: 'missing', sha256: null }

  const targetExists = fs.existsSync(targetPath)
  if (!resolveExistingTarget(targetPath, ifExists, backupSuffix)) {
    return { copied: false, action: 'skipped', sha256: null }
  }

  const parentDir = path.dirname(targetPath)
  if (parentDir && !fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true })

  let content = readTemplate(sourcePath)
  for (const [key, value] of Object.entries(placeholders || {})) {
    // split/join = substitusi LITERAL (search + replacement), aman utk value ber-$/regex.
    content = content.split(key).join(String(value))
  }

  writeUtf8NoBom(targetPath, content)
  const sha = fileSha256Hex(targetPath)
  return { copied: true, action: targetExists ? 'updated' : 'created', sha256: sha }
}

// Copy verbatim (tanpa substitusi), tetap normalize ke UTF-8 NO-BOM -> { copied, action, sha256 }.
export function copyStaticTemplate({ sourcePath, targetPath, ifExists = 'Skip', backupSuffix = null } = {}) {
  if (!fs.existsSync(sourcePath)) return { copied: false, action: 'missing', sha256: null }

  const targetExists = fs.existsSync(targetPath)
  if (!resolveExistingTarget(targetPath, ifExists, backupSuffix)) {
    return { copied: false, action: 'skipped', sha256: null }
  }

  const parentDir = path.dirname(targetPath)
  if (parentDir && !fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true })

  const content = readTemplate(sourcePath)
  writeUtf8NoBom(targetPath, content)
  const sha = fileSha256Hex(targetPath)
  return { copied: true, action: targetExists ? 'updated' : 'created', sha256: sha }
}

// --- Refresh UPDATE_GUIDE.md era-PowerShell (v2.0.0 Fase 3e) --------------------------------------
// Salinan docs/UPDATE_GUIDE.md milik klien di-deploy "lewati-kalau-ada" -> versi lama (menyuruh
// `kit.ps1 update`) tak pernah tersegarkan. Mekanisme ini: kalau salinan klien masih era-PS DAN
// template kit sudah BEBAS-PS -> cadangkan (ber-cap-waktu) lalu timpa. Idempoten + aman lintas-urutan
// rilis: selama template kit sendiri masih era-PS (pra-sapuan dokumen 3f), guard sumber-bebas-PS
// mencegah backup-spam (tak ada yang lebih baik untuk ditawarkan).

// Penanda isi era-PowerShell: dokumen menyebut perintah/berkas .ps1 kit lama.
export const UPDATE_GUIDE_LEGACY_MARKERS = [/\bkit\.ps1\b/i, /\bupdate-kit\.ps1\b/i, /\bsetup-pola-b\.ps1\b/i]

export function isLegacyUpdateGuide(text) {
  if (!text || typeof text !== 'string') return false
  return UPDATE_GUIDE_LEGACY_MARKERS.some((re) => re.test(text))
}

// refreshUpdateGuideIfLegacy -> { status, backupPath?, action? }.
//   status: 'no-target' (klien tak punya file) | 'already-current' (bukan era-PS) |
//           'no-source' (template kit hilang) | 'source-still-legacy' (template belum bebas-PS -> tunda) |
//           'simulated' (dryRun) | 'refreshed' | 'failed'.
export function refreshUpdateGuideIfLegacy({ sourcePath, targetPath, dryRun = false } = {}) {
  if (!targetPath || !fs.existsSync(targetPath)) return { status: 'no-target' }
  if (!isLegacyUpdateGuide(readTemplate(targetPath))) return { status: 'already-current' }
  if (!sourcePath || !fs.existsSync(sourcePath)) return { status: 'no-source' }
  if (isLegacyUpdateGuide(readTemplate(sourcePath))) return { status: 'source-still-legacy' }
  if (dryRun) return { status: 'simulated' }
  const suffix = backupStamp(new Date())
  const r = copyStaticTemplate({ sourcePath, targetPath, ifExists: 'Backup', backupSuffix: suffix })
  return { status: r.copied ? 'refreshed' : 'failed', backupPath: `${targetPath}.backup-${suffix}`, action: r.action }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) console.log('engine/template-deploy.mjs - library (import getSupportedPlaceholder/copyTemplateWithPlaceholder/copyStaticTemplate/refreshUpdateGuideIfLegacy).')
