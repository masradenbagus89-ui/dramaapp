#!/usr/bin/env node
// lib/project-card-migrate.mjs - Migrator kartu identitas project.lintas.psd1 -> .jsonc (Fase 1e v2).
//
// MASALAH: pemasang PowerShell lama menulis project.lintas.psd1; pemasang Node menulis .jsonc BARU
// di sampingnya -> kartu ganda, isi kurasi (intent/modules/conventions) di .psd1 tak terbawa.
//
// SOLUSI: baca .psd1 via parser lib/kit-files.mjs (parseKitFilesPsd1), salin intent/modules/conventions
// (+ stack/refs/split/environment bila ada), tulis project.lintas.jsonc, cadangkan berkas yang
// ditimpa, catat buku-besar via recordLintasMigrationApplied. Default SIMULASI (dry-run); --apply
// untuk sungguhan. IDEMPOTEN: migrasi sama dicatat 2x = tanpa-aksi.
//
// DIPANGGIL: npx lintasai migrate-project-card [--apply] + kit.mjs doctor (deteksi legacy/ganda).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseKitFilesPsd1 } from './kit-files.mjs'
import { backupStamp } from './fs-text.mjs'
import { getLintasExpectedSchemaVersion } from './expected-schema.mjs'
import { recordLintasMigrationApplied, testLintasMigrationApplied } from './migration-state.mjs'
import { readLintasProjectManifest } from './project-manifest.mjs'

export const LEGACY_PSD1_FILENAME = 'project.lintas.psd1'
export const JSONC_FILENAME = 'project.lintas.jsonc'
const ARTIFACT_KEY = JSONC_FILENAME

// Cermin PS @() — inline (hindari duplikat asArray di project-manifest.mjs).
function listify(v) { return Array.isArray(v) ? v : (v == null ? [] : [v]) }

// Salin objek dangkal (hanya plain object / array primitif dari parser .psd1).
function shallowCloneObj(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return o
  const out = {}
  for (const k of Object.keys(o)) out[k] = o[k]
  return out
}

export function resolveLegacyPsd1Path(projectRoot) {
  return path.join(projectRoot, LEGACY_PSD1_FILENAME)
}

export function resolveProjectCardJsoncPath(projectRoot) {
  return path.join(projectRoot, JSONC_FILENAME)
}

// Baca kartu lama .psd1. Return { Ok, Present, Data, Error, Path }.
export function readLegacyProjectCardPsd1(projectRoot) {
  const p = resolveLegacyPsd1Path(projectRoot)
  if (!fs.existsSync(p)) return { Ok: false, Present: false, Data: null, Error: null, Path: p }
  try {
    const data = parseKitFilesPsd1(fs.readFileSync(p, 'utf8'), p)
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return { Ok: false, Present: true, Data: null, Error: 'akar kartu .psd1 harus objek (bukan null/array)', Path: p }
    }
    return { Ok: true, Present: true, Data: data, Error: null, Path: p }
  } catch (e) {
    return { Ok: false, Present: true, Data: null, Error: e.message, Path: p }
  }
}

// Ubah data .psd1 -> objek manifest .jsonc. Salin intent/modules/conventions + turunan/refs lain.
export function convertPsd1ToManifest(psd1Data, { toVersion = getLintasExpectedSchemaVersion(ARTIFACT_KEY) } = {}) {
  const intent = psd1Data.intent && typeof psd1Data.intent === 'object' && !Array.isArray(psd1Data.intent)
    ? shallowCloneObj(psd1Data.intent)
    : { purpose: 'pending', domain: 'pending' }

  const stack = psd1Data.stack && typeof psd1Data.stack === 'object' && !Array.isArray(psd1Data.stack)
    ? shallowCloneObj(psd1Data.stack)
    : { type: 'unknown', package_manager: null, frameworks: [], _derived_from: 'package.json' }
  if (!Object.prototype.hasOwnProperty.call(stack, '_derived_from')) stack._derived_from = 'package.json'
  stack.frameworks = listify(stack.frameworks)

  const refs = psd1Data.refs && typeof psd1Data.refs === 'object' && !Array.isArray(psd1Data.refs)
    ? shallowCloneObj(psd1Data.refs)
    : { kit_version: '.claude-kit/.install-manifest.json#metadata.kit_version' }

  const split = psd1Data.split && typeof psd1Data.split === 'object' && !Array.isArray(psd1Data.split)
    ? shallowCloneObj(psd1Data.split)
    : { role: null, access_tier: null, base_name: null, portfolio_ref: null }

  const manifest = {
    schema_version: toVersion,
    intent,
    stack,
    refs,
    modules: listify(psd1Data.modules).map((m) => (m && typeof m === 'object' ? shallowCloneObj(m) : m)).filter(Boolean),
    conventions: listify(psd1Data.conventions).map((c) => (c && typeof c === 'object' ? shallowCloneObj(c) : c)).filter(Boolean),
    split,
  }

  if (psd1Data.environment && typeof psd1Data.environment === 'object' && !Array.isArray(psd1Data.environment)) {
    manifest.environment = shallowCloneObj(psd1Data.environment)
  }
  return manifest
}

// Bangun teks .jsonc dari objek manifest (header komentar + JSON pretty; dibaca readLintasConfig).
export function buildProjectCardJsoncContent(manifest) {
  const lines = [
    '// project.lintas.jsonc - KARTU IDENTITAS PROJECT (dimigrasi dari project.lintas.psd1)',
    '// Kolom intent/modules/conventions disalin dari kartu lama; stack/refs ikut bila ada.',
    '// Dijaga robot anti-basi lib/project-manifest.mjs.',
    '',
    JSON.stringify(manifest, null, 2),
    '',
  ]
  return lines.join('\n')
}

// Temuan legacy/ganda untuk doctor. Status: NEEDS_MIGRATION | DUPLICATE | LEFTOVER_PSD1 | PSD1_RUSAK.
export function getProjectCardLegacyFinding(projectRoot) {
  const psd1Path = resolveLegacyPsd1Path(projectRoot)
  const jsoncPath = resolveProjectCardJsoncPath(projectRoot)
  const psd1Present = fs.existsSync(psd1Path)
  const jsoncPresent = fs.existsSync(jsoncPath)
  const findings = []

  if (!psd1Present) return { Findings: findings, ActionableCount: 0 }

  const psd1Read = readLegacyProjectCardPsd1(projectRoot)
  if (psd1Present && !psd1Read.Ok) {
    findings.push({
      Status: 'PSD1_RUSAK',
      Field: LEGACY_PSD1_FILENAME,
      Detail: psd1Read.Error || 'tak terbaca',
      Suggest: 'perbaiki sintaks .psd1 atau pulihkan dari cadangan sebelum migrasi',
    })
    return { Findings: findings, ActionableCount: 1 }
  }

  const toVersion = getLintasExpectedSchemaVersion(ARTIFACT_KEY)
  let ledgerSaysMigrated = false
  try {
    ledgerSaysMigrated = testLintasMigrationApplied(projectRoot, { artifact: ARTIFACT_KEY, toVersion })
  } catch (e) {
    findings.push({
      Status: 'LEDGER_RUSAK',
      Field: '.migration-state.json',
      Detail: e.message,
      Suggest: 'perbaiki buku-besar migrasi dulu sebelum menjalankan migrator',
    })
    return { Findings: findings, ActionableCount: 1 }
  }

  if (jsoncPresent && psd1Present) {
    findings.push({
      Status: ledgerSaysMigrated ? 'LEFTOVER_PSD1' : 'DUPLICATE',
      Field: `${LEGACY_PSD1_FILENAME}+${JSONC_FILENAME}`,
      Detail: ledgerSaysMigrated
        ? 'migrasi sudah tercatat; kartu .psd1 lama masih ada (bisa dibersihkan manual)'
        : 'dua format kartu bersamaan - isi kurasi lama mungkin hanya di .psd1',
      Suggest: ledgerSaysMigrated
        ? 'hapus project.lintas.psd1 setelah yakin project.lintas.jsonc sudah benar'
        : 'jalankan: npx lintasai migrate-project-card (SIMULASI dulu) lalu --apply',
    })
  } else {
    findings.push({
      Status: 'NEEDS_MIGRATION',
      Field: LEGACY_PSD1_FILENAME,
      Detail: 'kartu identitas format lama (.psd1) terdeteksi',
      Suggest: 'jalankan: npx lintasai migrate-project-card (SIMULASI dulu) lalu --apply',
    })
  }

  const actionable = findings.filter((f) => f.Status !== 'LEFTOVER_PSD1').length
  return { Findings: findings, ActionableCount: actionable }
}

// Orkestrasi deteksi + (opsional) cetak untuk doctor.
export function invokeProjectCardLegacyCheck(projectRoot, { quiet = false } = {}) {
  const r = getProjectCardLegacyFinding(projectRoot)
  if (!quiet && r.Findings.length) {
    console.log('')
    console.log('Robot deteksi kartu identitas legacy (project.lintas.psd1 -> .jsonc)')
    console.log('-'.repeat(64))
    for (const f of r.Findings) {
      if (f.Status === 'LEFTOVER_PSD1') console.log(`  [INFO]      ${f.Field}: ${f.Detail}`)
      else if (f.Status === 'NEEDS_MIGRATION' || f.Status === 'DUPLICATE') console.log(`  [PERLU]     ${f.Field}: ${f.Detail}`)
      else console.log(`  [MASALAH]   ${f.Field}: ${f.Detail}`)
      if (f.Suggest) console.log(`              -> ${f.Suggest}`)
    }
    console.log('-'.repeat(64))
  }
  return r
}

// Migrator utama. dryRun=true (default) = SIMULASI. Return { Applied, Reason, DryRun, ... }.
export function migrateProjectCard(projectRoot, { dryRun = true, now = null } = {}) {
  const toVersion = getLintasExpectedSchemaVersion(ARTIFACT_KEY)
  const psd1Read = readLegacyProjectCardPsd1(projectRoot)
  const jsoncPath = resolveProjectCardJsoncPath(projectRoot)

  if (!psd1Read.Present) {
    return { Applied: false, Reason: 'tidak-perlu', DryRun: dryRun, Message: 'tidak ada project.lintas.psd1 - migrasi tidak diperlukan' }
  }
  if (!psd1Read.Ok) {
    return { Applied: false, Reason: 'psd1-rusak', DryRun: dryRun, Error: psd1Read.Error, Path: psd1Read.Path }
  }

  let alreadyRecorded = false
  try {
    alreadyRecorded = testLintasMigrationApplied(projectRoot, { artifact: ARTIFACT_KEY, toVersion })
  } catch (e) {
    return { Applied: false, Reason: 'buku-besar-rusak', DryRun: dryRun, Error: e.message }
  }

  const jsoncRead = readLintasProjectManifest(jsoncPath)
  if (alreadyRecorded && jsoncRead.Ok && jsoncRead.Manifest.schema_version >= toVersion) {
    return {
      Applied: false, Reason: 'sudah-termigrasi', DryRun: dryRun,
      Path: jsoncPath, Message: 'migrasi psd1->jsonc sudah tercatat dan kartu .jsonc valid',
    }
  }

  // .jsonc sudah valid tapi buku-besar belum -> cukup catat (idempoten).
  if (jsoncRead.Ok && jsoncRead.Manifest.schema_version >= toVersion && !alreadyRecorded) {
    if (dryRun) {
      return {
        Applied: false, Reason: 'simulasi-catat-buku-besar', DryRun: true,
        WouldRecordLedger: true, Path: jsoncPath,
        Message: 'project.lintas.jsonc sudah ada dan valid - SIMULASI hanya akan mencatat buku-besar migrasi',
      }
    }
    const rec = recordLintasMigrationApplied(projectRoot, { artifact: ARTIFACT_KEY, toVersion, now })
    return { Applied: true, Reason: 'catat-buku-besar-saja', DryRun: false, Path: jsoncPath, Ledger: rec }
  }

  const manifest = convertPsd1ToManifest(psd1Read.Data, { toVersion })
  const content = buildProjectCardJsoncContent(manifest)
  const wouldBackup = fs.existsSync(jsoncPath) ? `${jsoncPath}.bak.${backupStamp(now || new Date())}` : null

  if (dryRun) {
    return {
      Applied: false, Reason: 'simulasi', DryRun: true,
      WouldWrite: jsoncPath, WouldBackup: wouldBackup, WouldRecordLedger: true,
      FieldsCopied: ['intent', 'modules', 'conventions', 'stack', 'refs', 'split', 'environment'],
      Preview: manifest,
      Message: 'SIMULASI: tidak ada berkas yang diubah - jalankan dengan --apply untuk menerapkan',
    }
  }

  let backupPath = null
  if (fs.existsSync(jsoncPath)) {
    const ts = backupStamp(now || new Date())
    backupPath = `${jsoncPath}.bak.${ts}`
    fs.copyFileSync(jsoncPath, backupPath)
  }

  fs.writeFileSync(jsoncPath, content, 'utf8')
  const rec = recordLintasMigrationApplied(projectRoot, { artifact: ARTIFACT_KEY, toVersion, now })
  return {
    Applied: true, Reason: 'dimigrasi', DryRun: false,
    Path: jsoncPath, BackupPath: backupPath, Ledger: rec, Manifest: manifest,
    Message: 'kartu project.lintas.jsonc ditulis dari project.lintas.psd1; buku-besar migrasi diperbarui',
  }
}

// Orkestrasi migrator + cetak bahasa awam.
export function invokeMigrateProjectCard(projectRoot, { dryRun = true, quiet = false } = {}) {
  const r = migrateProjectCard(projectRoot, { dryRun })
  if (!quiet) {
    console.log('')
    console.log(`Migrator kartu project (${dryRun ? 'SIMULASI' : 'TERAPKAN'}) - psd1 -> jsonc`)
    console.log('-'.repeat(64))
    if (r.Reason === 'simulasi') {
      console.log(`  [SIMULASI]  akan tulis: ${r.WouldWrite}`)
      if (r.WouldBackup) console.log(`  [SIMULASI]  cadangan: ${r.WouldBackup}`)
      console.log(`  [SIMULASI]  salin: ${(r.FieldsCopied || []).join(', ')}`)
      console.log(`  [SIMULASI]  catat buku-besar: ya (artifact=${ARTIFACT_KEY}, to_version=${getLintasExpectedSchemaVersion(ARTIFACT_KEY)})`)
    } else if (r.Applied) {
      console.log(`  [OK]        ${r.Message}`)
      if (r.Path) console.log(`  [OK]        berkas: ${r.Path}`)
      if (r.BackupPath) console.log(`  [OK]        cadangan: ${r.BackupPath}`)
    } else {
      console.log(`  [LEWAT]     ${r.Message || r.Reason}`)
      if (r.Error) console.log(`  [ERROR]     ${r.Error}`)
    }
    console.log('-'.repeat(64))
    if (dryRun && r.Reason === 'simulasi') {
      console.log('SIMULASI selesai - tinjau di atas, lalu jalankan ulang dengan --apply bila cocok.')
    }
  }
  return r
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const args = process.argv.slice(2)
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null }
  const projectRoot = get('--project-root') || process.cwd()
  const apply = args.includes('--apply')
  const quiet = args.includes('--quiet')
  if (args.includes('--detect-only')) {
    const r = invokeProjectCardLegacyCheck(projectRoot, { quiet: false })
    process.exitCode = r.ActionableCount > 0 ? 1 : 0
  } else {
    const r = invokeMigrateProjectCard(projectRoot, { dryRun: !apply, quiet })
    process.exitCode = (r.Reason === 'psd1-rusak' || r.Reason === 'buku-besar-rusak') ? 1 : 0
  }
}
