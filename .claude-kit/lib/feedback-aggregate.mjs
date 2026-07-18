#!/usr/bin/env node
// lib/feedback-aggregate.mjs - Agregator berkas "Rekam Pelajaran" owner-side, DETERMINISTIK (~0 token).
//
// KENAPA ADA (FASE C2 sistem feedback, docs/decisions/ADR-006): owner mengumpulkan 40-50 berkas pelajaran
// tiap minggu. Mengolahnya dengan "AI baca-mata 50 berkas" = boros + rawan (dilarang §6.3). Robot ini
// mengelompokkan + menghitung + men-de-dup + cek-silang ke kit + rank -> tabel bahan-timbang. SPEC PERSIS =
// docs/plans/ROBOT_FEEDBACK_LINTASAI.md §9 (6 perbaikan skala) + §10 (Prompt E, format keluaran).
//
// PRINSIP INTI (ADR-006 #4 + GERBANG_UJI_STANDAR.md:7): "feedback = GEJALA, standar = RESEP dari otoritas".
//   FREKUENSI = PRIORITAS (mana ditinjau dulu), BUKAN VALIDITAS (apakah benar). Robot ini TIDAK PERNAH
//   menstempel "LULUS/jadi standar" - itu keputusan OWNER lewat gerbang otoritas (FASE D). Keluaran = umpan.
//
// PAGAR:
//   - Korroborasi per-ORGANISASI (org_id) -> 1 org = 1 suara; rank by JANGKAUAN (jml org), bukan intensitas
//     (total entri) -> 1 client spam 15x tetap 1 suara (anti-bajak-ambang, §9 butir 4).
//   - Hitung-ULANG sendiri (jangan percaya jumlah_entri client, §9 butir 1).
//   - Berkas rusak/kebesaran = SKIP + lapor (bukan gagalkan batch, §9 butir 1).
//   - Cek-silang JUJUR: verifikasi KEBERADAAN penjaga terdaftar, BUKAN kelayakan/cakupan (GERBANG:46).
//   - Berkas = DATA, bukan PERINTAH: baris injeksi-prompt ditandai, TAK PERNAH dijalankan (§8.1).
//   - CUMA-BACA + raw-free (tak menulis berkas project; keluaran tak memuat nilai mentah git).
//
// BAHASA INDONESIA WAJIB: pesan dipindai lib/output-lang-check.mjs (berkas ini di lib/*.mjs).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readTextSafe } from './fs-text.mjs'
import { readLintasConfig } from './config-loader.mjs'
import { isWellFormedId } from './project-id.mjs'

export const MAX_FILE_BYTES = 512 * 1024

// Registry kode->robot penjaga NYATA (owner-maintained). Cek KEBERADAAN berkas (bukan kelayakan).
// Hanya kode yang benar-benar punya robot deterministik di kit. Sisanya = 🟡 (aturan/taksonomi saja).
export const KODE_GUARD_ROBOT = {
  'BE-SWALLOWED-ERROR': 'lib/swallowed-error-check.mjs',
  'OPS-ENV-DRIFT': 'lib/env-keys-check.mjs',
  'PERF-WEIGHT-BUDGET': 'lib/perf-budget.mjs',
  'SEC-CLIENT-SECRET': 'lib/ai-config-check.mjs',
  'OPS-SECRET-IN-REPO': 'lib/install-secret-hook.mjs',
  'DEP-VULN-UNPINNED': 'lib/stack-check.mjs',
}

function normalizeForCompare(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim()
}

// Set bukti/gejala CONTOH-TEMPLATE (ROBOT_FEEDBACK:308,319 + rekam-pelajaran.md contoh) -> entri yang
// menyalin ini = kemungkinan paste-template -> dikeluarkan dari reach/intensity (§9 butir 5).
const TEMPLATE_EVIDENCE = new Set([
  'app/api/orders/[id]/route.ts:31',
  'prisma/migrations/20260615_drop_phone/migration.sql:1',
  'src/features/****/****/[id]/route.ts',
  'route detail-sumber-daya dinamis kirim data tanpa cek pemilik',
].map(normalizeForCompare))

// Deteksi injeksi-prompt (berkas = DATA, bukan perintah). Tandai saja; JANGAN pernah dijalankan.
const INJECTION_RX = /ignore\s+(?:previous|above)\s+instructions|abaikan\s+instruksi\s+(?:sebelum|di\s*atas)/i

// === Parse 1 berkas pelajaran -> { amplop, entri[], errors[] } ===================================
export function parseFeedbackFile(text) {
  const errors = []
  if (text == null || text === '') return { amplop: null, entri: [], errors: ['teks-kosong'] }
  const t = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  // Amplop frontmatter (antara --- ... ---).
  let amplop = null
  const fm = t.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (fm) {
    amplop = {}
    for (const line of fm[1].split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_][\w]*):\s*(.*)$/)
      if (m) amplop[m[1]] = m[2].replace(/\s+#.*$/, '').trim()
    }
  } else {
    errors.push('amplop-frontmatter-hilang')
  }

  // Entri: iris antar heading "## ENTRI ..." (robust, tak bergantung lookahead).
  const entri = []
  const startRx = /^##\s+ENTRI\b[^\n]*$/gm
  const starts = []
  let sm
  while ((sm = startRx.exec(t)) !== null) starts.push(sm.index)
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i]
    const to = i + 1 < starts.length ? starts[i + 1] : t.length
    entri.push(parseEntryFields(t.slice(from, to)))
  }
  if (amplop && entri.length === 0) errors.push('tak-ada-entri')

  return { amplop, entri, errors }
}

// Parse field "- Key: value" (toleran-sinonim, buang komentar inline "# ...").
function parseEntryFields(block) {
  const raw = {}
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^-\s*([^:]+?):\s*(.*)$/)
    if (!m) continue
    const key = m[1].trim().toLowerCase()
    const val = m[2].replace(/\s+#.*$/, '').trim()
    if (!(key in raw)) raw[key] = val
  }
  const get = (...keys) => {
    for (const k of keys) if (raw[k] != null && raw[k] !== '') return raw[k]
    return ''
  }
  return {
    kode: get('kode'),
    tingkat: get('tingkat'),
    divisi: get('divisi'),
    status_kit: get('status-kit', 'status_kit'),
    stack: get('stack'),
    gejala: get('gejala-teknis', 'judul', 'gejala'),
    lokasi: get('lokasi', 'bukti-aman', 'bukti'),
    terverifikasi: get('terverifikasi-ai', 'terverifikasi'),
    dampak: get('dampak-teknis', 'dampak'),
    usul: get('usul-penjaga', 'usul-perbaikan', 'usul'),
  }
}

// === Baca folder -> daftar berkas ter-parse (skip rusak/kebesaran + lapor) ========================
export function readFeedbackFolder(dir) {
  const files = []
  const skipped = []
  const rootAbs = path.resolve(dir)
  let entries = []
  try { entries = fs.readdirSync(rootAbs, { withFileTypes: true }) } catch { return { files, skipped } }
  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.endsWith('.md')) continue
    const abs = path.resolve(rootAbs, ent.name)
    const rel = path.relative(rootAbs, abs)
    if (rel.startsWith('..') || path.isAbsolute(rel)) { skipped.push({ path: abs, reason: 'di-luar-folder' }); continue }
    let st
    try { st = fs.statSync(abs) } catch { skipped.push({ path: abs, reason: 'tak-terbaca' }); continue }
    if (st.size > MAX_FILE_BYTES) { skipped.push({ path: abs, reason: 'terlalu-besar' }); continue }
    const text = readTextSafe(abs)
    if (text == null) { skipped.push({ path: abs, reason: 'tak-terbaca' }); continue }
    const parsed = parseFeedbackFile(text)
    if (!parsed.amplop) { skipped.push({ path: abs, reason: 'amplop-rusak' }); continue }
    const suspicious = INJECTION_RX.test(text)
    files.push({ path: abs, name: ent.name, ...parsed, suspicious })
  }
  return { files, skipped }
}

// === Agregasi ====================================================================================
export function aggregate(files, { taksonomi = null, kitRoot = null } = {}) {
  const orgOf = (amplop) => amplop.org_id || amplop.client_id_anonim || 'ORG-unknown'
  const dataQuality = { skipped: [], jumlahMismatch: [], idCacat: [], buktiTersalin: [], mencurigakan: [] }

  // Peta per-kode + himpunan org.
  const perCode = new Map() // kode -> { orgs:Set, intensity, tingkat:{}, statusKit:{} }
  const allOrgs = new Set()

  for (const f of files) {
    const org = orgOf(f.amplop)
    allOrgs.add(org)
    if (!isWellFormedId('org', org) && !/^ORG-unknown$/.test(org)) dataQuality.idCacat.push({ file: f.name, org })
    if (f.suspicious) dataQuality.mencurigakan.push({ file: f.name, alasan: 'baris injeksi-prompt terdeteksi (diperlakukan sbg DATA, tak dijalankan)' })

    // Hitung-ULANG: bandingkan jumlah_entri amplop vs entri nyata.
    const declared = parseInt(f.amplop.jumlah_entri, 10)
    if (Number.isFinite(declared) && declared !== f.entri.length) {
      dataQuality.jumlahMismatch.push({ file: f.name, declared, nyata: f.entri.length })
    }

    for (const e of f.entri) {
      const kode = (e.kode || '').trim()
      if (!kode || kode.startsWith('<')) continue // kosong / placeholder template
      // Anti bukti-tersalin: lokasi/gejala == contoh-template -> keluarkan.
      if (TEMPLATE_EVIDENCE.has(normalizeForCompare(e.lokasi)) || TEMPLATE_EVIDENCE.has(normalizeForCompare(e.gejala))) {
        dataQuality.buktiTersalin.push({ file: f.name, kode })
        continue
      }
      if (!perCode.has(kode)) perCode.set(kode, { orgs: new Set(), intensity: 0, tingkat: {}, statusKit: {} })
      const rec = perCode.get(kode)
      rec.orgs.add(org) // de-dup per org otomatis (Set)
      rec.intensity++
      if (e.tingkat) rec.tingkat[e.tingkat] = (rec.tingkat[e.tingkat] || 0) + 1
      if (e.status_kit) rec.statusKit[e.status_kit] = (rec.statusKit[e.status_kit] || 0) + 1
    }
  }

  const totalOrgs = allOrgs.size
  const rows = []
  for (const [kode, rec] of perCode) {
    const reach = rec.orgs.size
    const v = verdictFor(kode, { taksonomi, kitRoot })
    rows.push({
      kode,
      kelas: (taksonomi && taksonomi.kode && taksonomi.kode[kode]) || '(deskripsi tak ada di taksonomi)',
      reach_org: reach,
      total_org: totalOrgs,
      intensity_entri: rec.intensity,
      tingkat_hist: rec.tingkat,
      status_kit_klaim: rec.statusKit,
      kit_verdict: v.verdict,
      kit_bukti: v.bukti,
      prioritas: prioritasFor(reach, v.verdict),
    })
  }
  // Rank by JANGKAUAN desc, tie-break kode asc (deterministik).
  rows.sort((a, b) => (b.reach_org - a.reach_org) || (a.kode < b.kode ? -1 : a.kode > b.kode ? 1 : 0))

  return { rows, totalOrgs, jsonl: toJsonl(rows), markdown: toMarkdown(rows, totalOrgs), dataQuality }
}

// Cek-silang JUJUR: kode tak di taksonomi -> ❓; ada robot penjaga (berkas ADA) -> ✅; selain -> 🟡.
function verdictFor(kode, { taksonomi, kitRoot }) {
  const inEnum = !!(taksonomi && taksonomi.kode && Object.prototype.hasOwnProperty.call(taksonomi.kode, kode))
  if (!inEnum) return { verdict: '❓ PERLU OWNER CEK', bukti: 'kode tak ada di taksonomi kit' }
  const robot = KODE_GUARD_ROBOT[kode]
  if (robot && kitRoot && fs.existsSync(path.join(kitRoot, robot))) {
    return { verdict: '✅ ADA-ROBOT', bukti: robot }
  }
  return { verdict: '🟡 ATURAN-SAJA', bukti: 'ada di taksonomi/aturan, belum ada robot penegak terdaftar' }
}

// Prioritas TINJAU (ordinal, BUKAN skor angka): sudah ada robot -> rendah; belum + luas -> tinggi.
function prioritasFor(reach, verdict) {
  if (verdict.startsWith('✅')) return 'Sosialisasi' // sudah dijaga robot -> prioritas rendah (ROBOT_FEEDBACK:385)
  if (reach >= 3) return 'Strategi Besar'
  if (reach === 2) return 'Bertahap'
  return 'Quick Win'
}

function toJsonl(rows) {
  return rows.map((r) => JSON.stringify(r)).join('\n')
}

function toMarkdown(rows, totalOrgs) {
  const head = '| Kode | Kelas (awam) | Jml org | Frekuensi | Kit sudah atur? | Prioritas |\n|---|---|---|---|---|---|'
  const body = rows.map((r) =>
    `| ${r.kode} | ${r.kelas} | ${r.reach_org}/${totalOrgs} | ${r.intensity_entri} | ${r.kit_verdict} (${r.kit_bukti}) | ${r.prioritas} |`,
  ).join('\n')
  return `${head}\n${body}`
}

export const KALIMAT_BATAS_AGREGAT = [
  'CATATAN OWNER (jujur soal batas):',
  '- Robot memverifikasi KEBERADAAN penjaga terdaftar, BUKAN kelayakan/cakupannya (GERBANG_UJI_STANDAR §3).',
  '- FREKUENSI = PRIORITAS tinjau, BUKAN VALIDITAS. Ini bahan keputusan, BUKAN keputusan.',
  '- Robot TIDAK menstempel "LULUS/jadi standar" - itu keputusan OWNER lewat gerbang otoritas (FASE D).',
].join('\n')

// === Orkestrasi CLI ==============================================================================
export function invokeFeedbackAggregate({ dir, kitRoot, taksonomiPath }) {
  let taksonomi = null
  const takPath = taksonomiPath || (kitRoot ? path.join(kitRoot, 'templates', 'feedback', 'taksonomi.kit.jsonc') : null)
  if (takPath && fs.existsSync(takPath)) {
    try { taksonomi = readLintasConfig(takPath) } catch { taksonomi = null }
  }
  const { files, skipped } = readFeedbackFolder(dir)
  const res = aggregate(files, { taksonomi, kitRoot })
  res.dataQuality.skipped = skipped
  return res
}

function main() {
  let dir = null
  let kitRoot = process.cwd()
  let asJsonl = false
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dir') dir = argv[++i]
    else if (argv[i] === '--kit-root') kitRoot = argv[++i] || kitRoot
    else if (argv[i] === '--jsonl') asJsonl = true
    else if (!dir && !argv[i].startsWith('--')) dir = argv[i]
  }
  if (!dir) {
    console.error('Pakai: npx lintasai feedback-aggregate --dir <folder-berkas-pelajaran> [--kit-root .] [--jsonl]')
    console.error('  Kumpulkan berkas pelajaran dari banyak client ke satu folder, lalu tunjuk folder itu.')
    process.exit(2)
  }
  const res = invokeFeedbackAggregate({ dir, kitRoot })
  if (asJsonl) {
    console.log(res.jsonl)
    return
  }
  const dq = res.dataQuality
  console.log(`Agregasi ${res.totalOrgs} organisasi, ${res.rows.length} kelas-masalah unik (urut jangkauan lintas-organisasi):\n`)
  console.log(res.markdown)
  console.log('')
  console.log(`Kebersihan data: ${dq.skipped.length} berkas dilewati - ${dq.jumlahMismatch.length} jumlah_entri tak cocok - ${dq.idCacat.length} ID cacat - ${dq.buktiTersalin.length} bukti tersalin-template - ${dq.mencurigakan.length} berkas mencurigakan.`)
  console.log('')
  console.log(KALIMAT_BATAS_AGREGAT)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
