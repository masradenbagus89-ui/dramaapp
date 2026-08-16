#!/usr/bin/env node
// engine/template-deploy.mjs - Helper deploy template.
//
// MIGRASI grup [A] (ADR-003): robot PENULIS PENUH (salin template + placeholder + backup).
//
// Kontrak penting:
//  - Substitusi LITERAL via split/join (bukan regex) -> value ber-karakter $0/$1/$ tak corrupt.
//  - Tulis UTF-8 NO-BOM (fs writeFileSync utf8). Strip BOM saat baca.
//  - SHA256 file TARGET (post-substitution), hex UPPERCASE.
//  - action: created | updated | skipped | missing.
import fs from 'node:fs'
import path from 'node:path'
import { writeUtf8NoBom, readTemplate, backupStamp } from './fs-text.mjs'
// Sidik-jari berkas: pakai acuan TUNGGAL engine/manifest.mjs. Dulu berkas ini punya salinan sendiri
// (`fileSha256Hex`) dengan kontrak PERSIS sama (hex HURUF-BESAR, null kalau berkas tak ada) — lolos
// penjaga fungsi-kembar semata karena namanya beda. Nol siklus impor (manifest.mjs tak menarik berkas
// ini), dan nol biaya muat: engine/setup-fs.mjs sudah mengimpor KEDUA modul ini bersamaan.
import { getFileSha256 } from './manifest.mjs'

export function getSupportedPlaceholder() {
  return ['<NAMA_PROYEK>', '<TANGGAL_HARI_INI>', '<NAMA_KAMU>', '<URL_REPO_STANDAR>', '<VERSI_KIT>']
}

// fileSha256Hex -> disatukan ke getFileSha256 (engine/manifest.mjs, impor di atas; audit fungsi-kembar 2026-07-26).

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
  const sha = getFileSha256(targetPath)
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
  const sha = getFileSha256(targetPath)
  return { copied: true, action: targetExists ? 'updated' : 'created', sha256: sha }
}

// (Blok CLI `if (isMain)` DICABUT v8.0.0 — modul ini murni pustaka impor.)
