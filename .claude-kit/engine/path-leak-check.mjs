#!/usr/bin/env node
// engine/path-leak-check.mjs — pemindai jejak path-pribadi di dokumen terbit.
// Port logika tests/path-leak.Tests.ps1 (Fase 1a rencana v2).
import fs from 'node:fs'
import path from 'node:path'

const GENERIC_USERS = new Set([
  'user', 'username', 'youruser', 'you', 'your', 'me', 'public', 'default',
  'nama', 'namakamu', 'namauser', 'namaanda', 'contoh', 'example', 'someone',
  'runner', 'app', 'workspace', 'ubuntu', 'vagrant',
])

const RX_WIN = /[A-Za-z]:\\Users\\([^\\\r\n]+)\\/gi
// Case-sensitive: hanya /home/ atau /Users/ (bukan rute API /users/).
const RX_NIX = /\/(?:home|Users)\/([^/\r\n]+)\//g

export function isGenericUser(seg) {
  if (!seg) return true
  if (/[<>%]/.test(seg)) return true
  return GENERIC_USERS.has(seg.toLowerCase())
}

/** Kembalikan daftar path yang terdeteksi bocor di teks. */
export function findPathLeaks(content) {
  const hits = []
  if (!content) return hits
  for (const m of content.matchAll(RX_WIN)) {
    if (!isGenericUser(m[1])) hits.push(m[0])
  }
  for (const m of content.matchAll(RX_NIX)) {
    if (!isGenericUser(m[1])) hits.push(m[0])
  }
  return hits
}

const HISTORY_NAME_RX = /^(CHANGELOG|AUDIT|.*HISTORY)/i

function shouldScanFile(absPath, repoRoot) {
  const rel = path.relative(repoRoot, absPath).replace(/\\/g, '/')
  if (rel.includes('/.git/') || rel.includes('node_modules')) return false
  if (rel.includes('.backup-')) return false
  if (rel.startsWith('docs/decisions/')) return false
  const base = path.basename(absPath)
  if (HISTORY_NAME_RX.test(base)) return false
  return absPath.endsWith('.md')
}

function walkMdFiles(dir, repoRoot, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === '.git' || ent.name === 'node_modules') continue
      walkMdFiles(abs, repoRoot, out)
    } else if (shouldScanFile(abs, repoRoot)) {
      out.push(abs)
    }
  }
  return out
}

/** Pindai semua dokumen terbit di repo; kembalikan { rel, hit }[]. */
export function scanPublishedDocs(repoRoot) {
  const leaks = []
  for (const abs of walkMdFiles(repoRoot, repoRoot)) {
    let content
    try { content = fs.readFileSync(abs, 'utf8') } catch { continue }
    for (const hit of findPathLeaks(content)) {
      leaks.push({ rel: path.relative(repoRoot, abs).replace(/\\/g, '/'), hit })
    }
  }
  return leaks
}
