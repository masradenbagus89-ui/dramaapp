#!/usr/bin/env node
// lib/workflows-ref-check.mjs - Penjaga Rujukan berkas rujukan on-demand (folder workflows/).
//
// KENAPA ADA: dulu detail aturan hidup di 1 berkas raksasa LINTASAI_WORKFLOWS_v1.md dan rujukannya
// berbentuk "§4.13" yang harus DITEBAK AI lewat pola judul - audit 2026-07-10 membuktikan 11 dari 25
// rujukan gagal ditemukan + 1 rujukan (§7.3a) menunjuk seksi yang tidak ada. Jalur gagalnya mahal:
// AI membaca utuh ~177 KB (~44-51rb token) atau mengarang isi aturan dari ingatan. Sejak pecah-per-seksi,
// rujukan = PATH BERKAS LITERAL (workflows/<nomor>-<slug>.md) sehingga keberadaannya biner (ada/tidak) -
// dan robot ini yang menjamin 100% rujukan tersambung SEBELUM rilis (doktrin §6.4: yang mengingat = MESIN).
//
// 6 PEMERIKSAAN (semua deterministik, ~0 token AI):
//   1. FORWARD  - tiap rujukan `workflows/*.md` di berkas kit wajib menunjuk berkas NYATA.   [PENTING]
//   2. REVERSE  - tiap berkas workflows/ terdaftar di workflows/INDEX.md (nol berkas yatim). [PENTING]
//   3. PENSIUN  - pola rujukan lama "LINTASAI_WORKFLOWS_v1.md §X" DILARANG menyelinap balik. [PENTING]
//   4. PENANDA  - baris-1 tiap berkas = `<!-- LINTAS:SEKSI §<id> ... -->`, id unik lintas-berkas,
//                 dan id pertama muncul di nama berkasnya (typo nama/penanda ketahuan).       [PENTING]
//   5. INDEX    - tiap path `workflows/...md` yang disebut INDEX.md wajib ada berkasnya.      [PENTING]
//   6. ANGGARAN - berkas seksi > ambang (default 18.000 char) -> saran pecah (non-blokir).    [RAPIKAN]
//
// SIFAT: CUMA-BACA + deterministik. AUTO-SKIP anggun: folder workflows/ tak ketemu (client belum
// update / repo lama) -> present:false (INFO), bukan error. Inti PURE (analyzeWorkflows menerima teks
// yang disuntik) - teruji di tests/workflows-refs.test.mjs tanpa menyentuh disk.
//
// CLI: node lib/workflows-ref-check.mjs [--project-root <dir>] [--report]
//   --report = mode inventaris: daftar SEMUA rujukan (gaya lama §X + gaya baru path) + status resolve.
//              Dipakai saat migrasi sebagai checklist sapu-rujukan (alat migrasi = alat penjaga).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripBom, readTextSafe, isDir, isFile } from './fs-text.mjs'

// Langit-langit anti-regresi ukuran per-berkas seksi (bukan target; seksi terbesar saat pecah ~17,5 KB).
// Lewat ambang -> RAPIKAN (saran sub-pecah, tak memblokir) - filosofi sama rules-budget-check.
export const DEFAULT_SECTION_BUDGET = 18000

// Rujukan gaya BARU: path berkas di folder workflows/ (boleh berprefiks .claude-kit/).
// Batas-kiri (negative lookbehind) WAJIB: tanpa itu, path client yang KEBETULAN memuat segmen
// 'workflows/' (mis. docs/workflows/x.md, src/workflows/y.md, .github/workflows/README.md milik
// PROJECT client sendiri, disebut di AGENTS.md/CLAUDE.md kustom mereka) ikut tertangkap sebagai
// rujukan rak kit -> temuan "rujukan putus" PALSU tingkat PENTING yang MEMBLOKIR `preflight --strict`
// (gerbang rilis client). Lookbehind menolak match bila 'workflows/' didahului karakter jalur
// (huruf/angka/._-/\) = tanda ia sub-segmen path lain, bukan awal rujukan rak.
const PATH_REF_RE = /(?<![A-Za-z0-9._/\\-])(?:\.claude-kit\/)?workflows\/[A-Za-z0-9][A-Za-z0-9._\-/]*\.md/g
// Rujukan gaya LAMA (PENSIUN): "LINTASAI_WORKFLOWS_v1.md §X" (dgn/tanpa backtick, spasi bebas).
const LEGACY_REF_RE = /LINTASAI_WORKFLOWS(?:_v1)?\.md`?\s*(§[\w.-]+(?:\s*(?:Aturan|#)\s*\S+)?)/g
// Penanda mesin-baca di baris-1 tiap berkas seksi: <!-- LINTAS:SEKSI §id [§id2 ...] -->
const MARKER_RE = /^<!--\s*LINTAS:SEKSI\s+((?:§[a-z0-9.-]+\s*)+)-->\s*$/

// Berkas yang BOLEH tetap menyebut pola lama (riwayat/arsip/cadangan) - bukan rujukan hidup.
const LEGACY_EXEMPT = [
  /(^|\/)CHANGELOG(_ARCHIVE)?\.md$/i,
  /(^|\/)UPGRADING\.md$/i,
  /(^|\/)LINTASAI_WORKFLOWS_v1\.md$/i, // pengalih/stub - justru tugasnya menjelaskan pola lama
  /(^|\/)docs\/decisions\//i,
  /(^|\/)docs\/plans\//i, // dokumen rencana/audit = catatan sejarah keputusan
  /(^|\/)BUKU_PELAJARAN\.md$/i,
]

export function extractPathRefs(text) {
  const out = []
  const lines = String(text).split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(PATH_REF_RE)) {
      out.push({ ref: m[0].replace(/^\.claude-kit\//, ''), line: i + 1 })
    }
  }
  return out
}

export function extractLegacyRefs(text) {
  const out = []
  const lines = String(text).split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(LEGACY_REF_RE)) {
      out.push({ ref: m[1].trim(), line: i + 1 })
    }
  }
  return out
}

export function parseMarker(firstLine) {
  const m = String(firstLine || '').match(MARKER_RE)
  if (!m) return null
  return m[1].trim().split(/\s+/).map((s) => s.replace(/^§/, ''))
}

// INTI PURE - seluruh isi disuntik, tak menyentuh disk.
//   scanDocs:     [{ rel, text }] berkas kit yang boleh merujuk (CLAUDE_universal, prompts, templates, docs).
//   sectionFiles: [{ rel, text }] berkas di workflows/ (rel diawali 'workflows/'), TANPA INDEX.md.
//   indexText:    isi workflows/INDEX.md (null = INDEX hilang).
export function analyzeWorkflows({ scanDocs = [], sectionFiles = [], indexText = null, sectionBudget = DEFAULT_SECTION_BUDGET } = {}) {
  const findings = []
  const sectionSet = new Set(sectionFiles.map((f) => f.rel))
  const add = (tingkat, cek, pesan) => findings.push({ tingkat, cek, pesan })

  // (1) FORWARD: rujukan path -> berkas seksi nyata (INDEX.md sendiri juga target sah).
  // Berkas seksi ikut dipindai - rujukan-silang ANTAR-seksi juga wajib tersambung.
  const targetSet = new Set([...sectionSet, 'workflows/INDEX.md'])
  const livingDocs = [...scanDocs, ...sectionFiles]
  for (const doc of livingDocs) {
    for (const { ref, line } of extractPathRefs(doc.text)) {
      if (!targetSet.has(ref)) add('PENTING', 'forward', `${doc.rel}:${line} merujuk '${ref}' - berkas TIDAK ADA (rujukan putus).`)
    }
  }

  // (3) PENSIUN: pola lama dilarang di berkas hidup (termasuk di dalam berkas seksi sendiri).
  for (const doc of livingDocs) {
    if (LEGACY_EXEMPT.some((re) => re.test(doc.rel))) continue
    for (const { ref, line } of extractLegacyRefs(doc.text)) {
      add('PENTING', 'pensiun', `${doc.rel}:${line} masih pakai rujukan gaya lama 'LINTASAI_WORKFLOWS_v1.md ${ref}' - ganti ke path workflows/<berkas>.md.`)
    }
  }

  // (4) PENANDA baris-1 + id unik + id pertama nyambung ke nama berkas.
  const seenIds = new Map() // id -> rel
  for (const f of sectionFiles) {
    const firstLine = stripBom(f.text).split(/\r?\n/, 1)[0]
    const ids = parseMarker(firstLine)
    if (!ids || ids.length === 0) {
      add('PENTING', 'penanda', `${f.rel} baris-1 tanpa penanda '<!-- LINTAS:SEKSI §<id> -->' (cadangan Grep hilang).`)
      continue
    }
    for (const id of ids) {
      if (seenIds.has(id)) add('PENTING', 'penanda', `id '§${id}' DOBEL: ${seenIds.get(id)} dan ${f.rel} (rujukan jadi ambigu).`)
      else seenIds.set(id, f.rel)
    }
    const base = path.posix.basename(f.rel, '.md')
    if (!base.includes(ids[0])) add('PENTING', 'penanda', `${f.rel}: id pertama '§${ids[0]}' tak muncul di nama berkas (nama vs penanda tak nyambung).`)
  }

  // (2) REVERSE + (5) INDEX sinkron.
  if (indexText == null) {
    if (sectionFiles.length > 0) add('PENTING', 'index', `workflows/INDEX.md HILANG - daftar isi wajib ada (fallback AI + peta manusia).`)
  } else {
    const indexRefs = new Set(extractPathRefs(indexText).map((r) => r.ref))
    for (const f of sectionFiles) {
      if (!indexRefs.has(f.rel)) add('PENTING', 'reverse', `${f.rel} tidak terdaftar di workflows/INDEX.md (berkas yatim - AI tak bisa menemukannya lewat fallback).`)
    }
    for (const ref of indexRefs) {
      if (ref !== 'workflows/INDEX.md' && !sectionSet.has(ref)) add('PENTING', 'index', `workflows/INDEX.md menyebut '${ref}' - berkasnya TIDAK ADA (daftar isi basi).`)
    }
  }

  // (6) ANGGARAN ukuran per-berkas seksi.
  for (const f of sectionFiles) {
    const chars = stripBom(f.text).length
    if (chars > sectionBudget) add('RAPIKAN', 'anggaran', `${f.rel} ${chars.toLocaleString('en-US')} char > ambang ${sectionBudget.toLocaleString('en-US')} - pertimbangkan sub-pecah (§4.18).`)
  }

  return { findings, counts: countLevels(findings), sections: sectionFiles.length, ids: seenIds.size }
}

function countLevels(findings) {
  const c = { GENTING: 0, PENTING: 0, RAPIKAN: 0 }
  for (const f of findings) c[f.tingkat] = (c[f.tingkat] || 0) + 1
  return c
}

// --- Pengumpul berkas dari disk (orkestrasi; intinya tetap analyzeWorkflows yang PURE) ---

// Folder yang TAK pernah dipindai (bukan bagian kit / bukan sumber rujukan hidup).
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'coverage', '.claude', 'scratchpad'])

function walkMd(dir, baseForRel, out) {
  let entries = []
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walkMd(path.join(dir, e.name), baseForRel, out)
    } else if (e.isFile() && (e.name.toLowerCase().endsWith('.md') || e.name.toLowerCase().endsWith('.md.template'))) {
      // .md.template (AGENTS.md.template / CLAUDE.md.template) = berkas kiriman ber-rujukan hidup - ikut dipindai
      const abs = path.join(dir, e.name)
      out.push({ abs, rel: path.relative(baseForRel, abs).split(path.sep).join('/') })
    }
  }
}

// Temukan "basis kit": repo kit (root, ada lib/kit-files.json) ATAU project client (.claude-kit/).
export function findKitBase(repoRoot = process.cwd()) {
  if (isFile(path.join(repoRoot, 'lib', 'kit-files.json'))) return { base: repoRoot, mode: 'kit' }
  if (isDir(path.join(repoRoot, '.claude-kit'))) return { base: path.join(repoRoot, '.claude-kit'), mode: 'client' }
  return null
}

// Orkestrasi: kumpulkan berkas dari disk lalu jalankan inti PURE. present:false = auto-skip anggun.
export function runWorkflowsRefCheck({ repoRoot = process.cwd(), sectionBudget = DEFAULT_SECTION_BUDGET } = {}) {
  const found = findKitBase(repoRoot)
  if (!found) return { present: false }
  const { base, mode } = found
  const wfDir = path.join(base, 'workflows')
  if (!isDir(wfDir)) return { present: false, mode } // belum pecah-per-seksi / client belum update

  const all = []
  walkMd(base, base, all)
  const scanDocs = []
  const sectionFiles = []
  let indexText = null
  for (const f of all) {
    const text = readTextSafe(f.abs)
    if (text == null) continue
    if (f.rel === 'workflows/INDEX.md') indexText = text
    else if (f.rel.startsWith('workflows/')) sectionFiles.push({ rel: f.rel, text })
    else scanDocs.push({ rel: f.rel, text })
  }
  // Project client: AGENTS.md/CLAUDE.md kustom di AKAR project juga perujuk hidup.
  if (mode === 'client') {
    for (const name of ['AGENTS.md', 'CLAUDE.md']) {
      const t = readTextSafe(path.join(repoRoot, name))
      if (t != null) scanDocs.push({ rel: name, text: t })
    }
  }
  return { present: true, mode, base, ...analyzeWorkflows({ scanDocs, sectionFiles, indexText, sectionBudget }) }
}

// Mode --report: inventaris SEMUA rujukan (lama + baru) + status - checklist migrasi/sapu-rujukan.
export function runReport({ repoRoot = process.cwd() } = {}) {
  const found = findKitBase(repoRoot)
  if (!found) return { present: false }
  const { base, mode } = found
  const all = []
  walkMd(base, base, all)
  const rows = []
  const sectionSet = new Set(all.filter((f) => f.rel.startsWith('workflows/')).map((f) => f.rel))
  for (const f of all) {
    if (f.rel.startsWith('workflows/')) continue
    const text = readTextSafe(f.abs)
    if (text == null) continue
    for (const { ref, line } of extractLegacyRefs(text)) {
      rows.push({ gaya: 'LAMA', berkas: f.rel, baris: line, rujukan: ref, status: LEGACY_EXEMPT.some((re) => re.test(f.rel)) ? 'dikecualikan (arsip)' : 'PERLU DISAPU' })
    }
    for (const { ref, line } of extractPathRefs(text)) {
      rows.push({ gaya: 'BARU', berkas: f.rel, baris: line, rujukan: ref, status: sectionSet.has(ref) || ref === 'workflows/INDEX.md' ? 'tersambung' : 'PUTUS' })
    }
  }
  return { present: true, mode, base, rows }
}

// --- CLI ---
function main() {
  let repoRoot = process.cwd()
  let report = false
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project-root') repoRoot = argv[++i] || repoRoot
    else if (argv[i] === '--report') report = true
  }

  if (report) {
    const r = runReport({ repoRoot })
    if (!r.present) { console.log('Rujukan workflows: DILEWATI - bukan repo kit / tak ada .claude-kit/.'); process.exit(0) }
    console.log('')
    console.log(`Inventaris Rujukan workflows (mode ${r.mode}, basis ${r.base}) - READ-ONLY`)
    console.log('-'.repeat(72))
    for (const row of r.rows) console.log(`  [${row.gaya}] ${row.berkas}:${row.baris}  ${row.rujukan}  -> ${row.status}`)
    const sapu = r.rows.filter((x) => x.status === 'PERLU DISAPU').length
    const putus = r.rows.filter((x) => x.status === 'PUTUS').length
    console.log('-'.repeat(72))
    console.log(`Total ${r.rows.length} rujukan | gaya lama perlu disapu: ${sapu} | path putus: ${putus}`)
    process.exit(0)
  }

  const res = runWorkflowsRefCheck({ repoRoot })
  if (!res.present) { console.log('Rujukan workflows: DILEWATI - folder workflows/ tak ketemu (belum pecah-per-seksi / belum update).'); process.exit(0) }
  console.log('')
  console.log('Penjaga Rujukan workflows/ (READ-ONLY)')
  console.log('-'.repeat(72))
  console.log(`  Basis: ${res.base} (mode ${res.mode}) | berkas seksi: ${res.sections} | id anchor: ${res.ids}`)
  if (res.findings.length === 0) {
    console.log('BERSIH: semua rujukan tersambung, nol berkas yatim, INDEX sinkron.')
    process.exit(0)
  }
  for (const f of res.findings) console.log(`  [${f.tingkat}] (${f.cek}) ${f.pesan}`)
  console.log('-'.repeat(72))
  console.log(`Ringkasan: GENTING ${res.counts.GENTING} | PENTING ${res.counts.PENTING} | RAPIKAN ${res.counts.RAPIKAN}`)
  process.exit(res.counts.GENTING + res.counts.PENTING > 0 ? 1 : 0)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
