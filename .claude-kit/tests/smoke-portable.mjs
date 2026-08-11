#!/usr/bin/env node
// tests/smoke-portable.mjs - Gerbang smoke Node UTAMA (kit 100% Node).
//
// 5 cek cepat:
//   1. Syntax .mjs (node --check)     2. Critical files (daftar era Node)
//   3. Manifest integrity (rekursif)  4. Orphan refs   5. JSON valid
// Job CI `fast-smoke` memakai modul ini.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readKitManifest } from '../engine/kit-files.mjs'

const SKIP_DIRS = ['\\.git\\', '\\node_modules\\', '\\.backup-']

// Daftar berkas kritis era Node. v2.0.0: manifest SSOT = engine/kit-files.json (bukan .psd1 lagi).
export const CRITICAL_FILES_NODE = [
  'bin/lintasai.js',
  'README.md',
  'package.json',
  'engine/kit-files.json',
  'setup-pola-b.mjs',
  'kit.mjs',
  'update-kit.mjs',
  'uninstall.mjs',
  'AGENTS.md.template',
  'engine/json-merge-helpers.mjs',
  'engine/manifest.mjs',
]

function walk(root, exts) {
  const out = []
  const rec = (dir) => {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const full = path.join(dir, e.name)
      const norm = full.replace(/\//g, '\\')
      if (SKIP_DIRS.some((s) => norm.includes(s))) continue
      if (e.isDirectory()) rec(full)
      else if (exts.includes(path.extname(e.name).toLowerCase())) out.push(full)
    }
  }
  rec(root)
  return out
}

// Cek 1: sintaks .mjs (padanan parse-PowerShell di smoke-fast.ps1).
export function checkMjsSyntax(kitRoot) {
  const mjsFiles = walk(kitRoot, ['.mjs'])
  const errors = []
  let passed = 0
  for (const f of mjsFiles) {
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8', timeout: 15000 })
    if (r.status !== 0) {
      const msg = ((r.stderr || r.stdout || '').trim().split(/\r?\n/)[0]) || 'syntax error'
      errors.push({ file: path.relative(kitRoot, f).replace(/\\/g, '/'), msg })
    } else {
      passed++
    }
  }
  return { passed, failed: errors.length, errors }
}

// Cek 2: berkas kritis ada (era Node).
export function checkCriticalFiles(kitRoot, critical = CRITICAL_FILES_NODE) {
  const missing = critical.filter((rel) => !fs.existsSync(path.join(kitRoot, rel)))
  return { total: critical.length, missing }
}

// Cek 3: integritas manifest daftar-berkas — jalan rekursif semua entri string (cermin Test-LintasManifestIntegrity).
// Dua-format (v2.0.0): engine/kit-files.json (SSOT) atau .psd1 (kit era-v1) via readKitManifest.
export function checkManifestIntegrity(kitRoot) {
  let resolved
  try {
    resolved = readKitManifest(kitRoot)
  } catch (e) {
    return { total: 0, missing: [`manifest daftar-berkas parse error: ${e.message}`] }
  }
  if (!resolved) {
    return { total: 0, missing: ['engine/kit-files.json (atau .psd1) not found'] }
  }
  const manifest = resolved.data
  const missing = []
  let total = 0
  function walkNode(node) {
    if (Array.isArray(node)) {
      for (const item of node) walkNode(item)
    } else if (node && typeof node === 'object') {
      for (const v of Object.values(node)) walkNode(v)
    } else if (typeof node === 'string') {
      total++
      const full = path.join(kitRoot, node.replace(/\\/g, path.sep))
      if (!fs.existsSync(full)) missing.push(node.replace(/\\/g, '/'))
    }
  }
  walkNode(manifest)
  return { total, missing }
}

// Cek 4: referensi stub yang sudah dihapus.
export function checkOrphanRefs(kitRoot) {
  const deletedStubs = ['BOOTSTRAP_PROJECT_DOCS_PROMPT', 'PROJECT_KICKOFF_PROMPT', 'PROJECT_MIGRATION_PROMPT', 'SETUP_POLA_B_PROMPT', 'UPDATE_DOCS_PROMPT']
  const pattern = new RegExp(deletedStubs.join('|'))
  const excludeNames = new Set(['CHANGELOG.md', 'CHANGELOG_ARCHIVE.md', 'AUDIT_HISTORY.md', 'smoke-fast.ps1', 'smoke-portable.mjs', 'smoke-portable.test.mjs'])
  let count = 0
  for (const f of walk(kitRoot, ['.md', '.ps1', '.psd1', '.mjs'])) {
    if (excludeNames.has(path.basename(f))) continue
    let content
    try { content = fs.readFileSync(f, 'utf8') } catch { continue }
    for (const line of content.split(/\r?\n/)) { if (pattern.test(line)) count++ }
  }
  return { count }
}

// Cek 5: semua .json parse + settings.local.json.template eksplisit (skip package-lock.json seperti PS).
export function checkJsonValid(kitRoot) {
  const jsonFiles = walk(kitRoot, ['.json']).filter((f) => path.basename(f) !== 'package-lock.json')
  const tmpl = path.join(kitRoot, 'templates', 'settings.local.json.template')
  if (fs.existsSync(tmpl) && !jsonFiles.includes(tmpl)) jsonFiles.push(tmpl)
  const invalid = []
  for (const f of jsonFiles) {
    try {
      let raw = fs.readFileSync(f, 'utf8')
      if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)
      JSON.parse(raw)
    } catch { invalid.push(path.basename(f)) }
  }
  return { total: jsonFiles.length, invalid }
}

export function runPortableSmoke(kitRoot, { quiet = false } = {}) {
  const start = Date.now()
  const mjs = checkMjsSyntax(kitRoot)
  const crit = checkCriticalFiles(kitRoot)
  const manifest = checkManifestIntegrity(kitRoot)
  const orphan = checkOrphanRefs(kitRoot)
  const json = checkJsonValid(kitRoot)
  const pass = mjs.failed === 0
    && crit.missing.length === 0
    && manifest.missing.length === 0
    && orphan.count === 0
    && json.invalid.length === 0
  const durationSec = ((Date.now() - start) / 1000).toFixed(2)
  if (!quiet) {
    console.log('')
    console.log('=== lintasAI Fast Smoke (Node) ===')
    console.log(`Parse MJS   : ${mjs.passed} OK, ${mjs.failed} fail`)
    console.log(`Critical    : ${crit.total} expected, ${crit.missing.length} missing`)
    console.log(`Manifest    : ${manifest.total} files, ${manifest.missing.length} missing`)
    console.log(`Orphan refs : ${orphan.count}`)
    console.log(`JSON files  : ${json.total} checked, ${json.invalid.length} invalid`)
    console.log(`Duration    : ${durationSec} sec`)
    console.log('')
    if (mjs.failed > 0) {
      console.log('MJS syntax errors:')
      for (const e of mjs.errors) console.log(`  ${e.file}: ${e.msg}`)
    }
    if (crit.missing.length > 0) {
      console.log('Missing critical files:')
      for (const m of crit.missing) console.log(`  ${m}`)
    }
    if (manifest.missing.length > 0) {
      console.log('Missing manifest entries:')
      for (const m of manifest.missing.slice(0, 20)) console.log(`  ${m}`)
      if (manifest.missing.length > 20) console.log(`  ... +${manifest.missing.length - 20} lagi`)
    }
    if (json.invalid.length > 0) {
      console.log('Invalid JSON files:')
      for (const f of json.invalid) console.log(`  ${f}`)
    }
    console.log(pass ? 'PASS: FAST SMOKE PASSED' : 'FAIL: FAST SMOKE FAILED')
    console.log('')
  }
  return { pass, mjs, crit, manifest, orphan, json, durationSec }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  process.exit(runPortableSmoke(kitRoot).pass ? 0 : 1)
}
