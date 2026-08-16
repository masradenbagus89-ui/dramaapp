#!/usr/bin/env node
// engine/agents-md.mjs - Deploy AGENTS.md + CLAUDE.md loader.
//
// MIGRASI grup [A] (ADR-003): robot PENULIS PENUH terakhir. v2.0.0: berkas .ps1 sudah dihapus.
//
// Kontrak: substitusi LITERAL (split/join, aman $0/$1/$); tulis UTF-8
// NO-BOM; strip BOM saat baca (charCodeAt 0xFEFF); backup .backup-<timestamp> sebelum overwrite;
// Publish-ClaudeMd idempoten (kalau sudah ada marker loader -> 'current', jangan timpa).
import fs from 'node:fs'
import path from 'node:path'
import { isFile, isDir, writeUtf8NoBom, readTemplate, backupStamp } from './fs-text.mjs'

// readTemplate/writeUtf8NoBom/isFile/isDir + cap-waktu cadangan (backupStamp) dipindah ke sumber
// bersama engine/fs-text.mjs (audit fungsi-kembar 2026-06-25).

// Publish AGENTS.md ke project root: fill template + backup existing.
// Mode: tidak ada -> CREATE; ada + preserve -> PRESERVE; ada tanpa flag -> BACKUP + UPDATE.
export function publishAgentsMd({ projectRoot, templatePath, placeholders = {}, preserve = false } = {}) {
  if (!isDir(projectRoot)) throw new Error(`Publish-AgentsMd: ProjectRoot tidak ditemukan atau bukan folder: ${projectRoot}`)
  if (!isFile(templatePath)) throw new Error(`Publish-AgentsMd: TemplatePath tidak ditemukan: ${templatePath}`)

  const target = path.join(projectRoot, 'AGENTS.md')
  const existing = isFile(target)

  if (existing && preserve) {
    return { action: 'preserved', backup_path: null, target_path: target, placeholders_applied: 0 }
  }

  let backupPath = null
  if (existing) {
    backupPath = `${target}.backup-${backupStamp(new Date())}`
    fs.copyFileSync(target, backupPath)
  }

  let content = readTemplate(templatePath)
  let applied = 0
  for (const [key, value] of Object.entries(placeholders || {})) {
    content = content.split(String(key)).join(String(value)) // .Replace() literal
    applied++
  }
  writeUtf8NoBom(target, content)

  return { action: existing ? 'updated' : 'created', backup_path: backupPath, target_path: target, placeholders_applied: applied }
}

// Publish AGENTS.local.md ke project root: fill template + backup existing.
// ADR-032: berkas ini MILIK CLIENT (override project) -> default PRESERVE (skip kalau sudah ada), supaya
// update TIDAK menimpa kustomisasi client. Beda dari publishAgentsMd (kernel, di-refresh preserve=false).
export function publishAgentsOverrideMd({ projectRoot, templatePath, placeholders = {}, preserve = true } = {}) {
  if (!isDir(projectRoot)) throw new Error(`Publish-AgentsOverrideMd: ProjectRoot tidak ditemukan atau bukan folder: ${projectRoot}`)
  if (!isFile(templatePath)) throw new Error(`Publish-AgentsOverrideMd: TemplatePath tidak ditemukan: ${templatePath}`)

  const target = path.join(projectRoot, 'AGENTS.local.md')
  const existing = isFile(target)

  if (existing && preserve) {
    return { action: 'preserved', backup_path: null, target_path: target, placeholders_applied: 0 }
  }

  let backupPath = null
  if (existing) {
    backupPath = `${target}.backup-${backupStamp(new Date())}`
    fs.copyFileSync(target, backupPath)
  }

  let content = readTemplate(templatePath)
  let applied = 0
  for (const [key, value] of Object.entries(placeholders || {})) {
    content = content.split(String(key)).join(String(value))
    applied++
  }
  writeUtf8NoBom(target, content)

  return { action: existing ? 'updated' : 'created', backup_path: backupPath, target_path: target, placeholders_applied: applied }
}

// Publish CLAUDE.md loader. Idempoten: kalau existing sudah punya marker @import -> 'current'.
export function publishClaudeMd({ projectRoot, templatePath, placeholders = {} } = {}) {
  if (!isDir(projectRoot)) throw new Error(`Publish-ClaudeMd: ProjectRoot tidak ditemukan atau bukan folder: ${projectRoot}`)
  if (!isFile(templatePath)) throw new Error(`Publish-ClaudeMd: TemplatePath tidak ditemukan: ${templatePath}`)

  const target = path.join(projectRoot, 'CLAUDE.md')
  const existing = isFile(target)

  // Marker idempoten DIPERKUAT (v3.1.0): loader klien LAMA (pra-ADR-032) JUGA memuat `@./AGENTS.md`
  // (dulu = import override) tapi masih menunjuk kernel arsip `@./.claude-kit/...` dan belum meng-import
  // `@./AGENTS.local.md`. Cek tunggal `@./AGENTS.md` salah-deteksi loader lama sebagai 'current' →
  // update TIDAK me-refresh → import mati + override tak termuat. Syarat 'current' kini 3 lapis;
  // gagal salah satu → jatuh ke jalur backup+timpa di bawah (kerja klien aman, dicadangkan dulu).
  if (existing) {
    let cur = ''
    try { cur = fs.readFileSync(target, 'utf8') } catch { cur = '' }
    if (cur && cur.includes('@./AGENTS.md') && cur.includes('@./AGENTS.local.md') && !cur.includes('@./.claude-kit/')) {
      return { action: 'current', backup_path: null, target_path: target }
    }
  }

  let backupPath = null
  if (existing) {
    backupPath = `${target}.backup-${backupStamp(new Date())}`
    fs.copyFileSync(target, backupPath)
  }

  let content = readTemplate(templatePath)
  for (const [key, value] of Object.entries(placeholders || {})) {
    content = content.split(String(key)).join(String(value))
  }
  writeUtf8NoBom(target, content)

  return { action: existing ? 'updated' : 'created', backup_path: backupPath, target_path: target }
}

// (Blok CLI `if (isMain)` DICABUT v8.0.0 — modul ini murni pustaka impor.)
