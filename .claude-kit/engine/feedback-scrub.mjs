#!/usr/bin/env node
// engine/feedback-scrub.mjs - Robot redaksi DETERMINISTIK 2-lapis untuk berkas "Rekam Pelajaran" (~0 token).
//
// KENAPA ADA (FASE B2 sistem feedback, docs/decisions/ADR-006): berkas pelajaran client
// (docs/pelajaran-lintasai/*.md) di-redaksi AI (lapis-1). Dengan 40-50 client, peluang bocor naik ->
// butuh JARING REGEL DETERMINISTIK lapis-2 (ROBOT_FEEDBACK_LINTASAI.md butir "redaksi = robot regex jalan
// 2x"). "Belajar CARANYA bukan BISNISnya" (templates/feedback/rekam-pelajaran.md): tanpa kode mentah,
// nama bisnis, secret, atau data pribadi.
//
// DUA PERAN, SATU INTI (DRY §5):
//   - CLIENT (sensor):    scrubText/scrubFile -> mengganti bocoran jadi placeholder (AI yang menulis berkas).
//   - OWNER (verifikasi): verifyRedacted/verifyFile/verifyDir -> MENILAI bersih/kotor sebelum agregasi;
//                         berkas rusak/kebesaran = SKIP+lapor (bukan gagalkan batch).
//   Keduanya memakai detectLeaks() yang SAMA -> mustahil drift antar-lapis.
//
// PAGAR:
//   - CUMA-BACA (§8.1): robot TIDAK menulis/menghapus berkas project; scrubFile mengembalikan teks bersih,
//     PEMANGGIL (AI) yang memutuskan menulis. Laporan cuma lokasi + cuplikan TER-MASKING.
//   - cuplikan_aman WAJIB ter-masking (§8.1#6): jangan simpan nilai rahasia utuh -> laporan sendiri bisa bocor.
//   - Anti-alarm-palsu (§8.2 3b): placeholder resmi / env-ref / digit-dummy / domain-teknis TIDAK di-flag.
//   - BATAS JUJUR (§4.6): regex TIDAK bisa tangkap nama-bisnis arbitrer di prosa bebas -> "bersih" =
//     bersih dari POLA yang bisa dideteksi mesin, BUKAN sertifikat bebas-bisnis. Tetap perlu mata manusia.
//   - Input-defensif: cap ukuran berkas + guard path-traversal (verifyDir).
//
// BAHASA INDONESIA WAJIB: pesan dipindai engine/output-lang-check.mjs (berkas ini di engine/*.mjs).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readTextSafe } from './fs-text.mjs'
import { SECRET_PATTERNS } from './ai-config-check.mjs'
import { findPathLeaks } from './path-leak-check.mjs'

// Batas ukuran berkas pelajaran (berkas valid = beberapa KB; lebih besar = mencurigakan/DoS).
export const MAX_INPUT_BYTES = 512 * 1024

// --- Allowlist anti-alarm-palsu (§8.2 3b) ---
// Placeholder resmi (rekam-pelajaran.md:130 + tabel anonim) + domain teknis sah -> JANGAN di-flag.
const PLACEHOLDER_EMAIL = new Set(['user@contoh.com', 'user@example.com', 'nama@contoh.com'])
const TECH_DOMAINS = new Set([
  'contoh.com', 'example.com', 'localhost',
  'github.com', 'gitlab.com', 'nextjs.org', 'react.dev', 'vercel.app', 'vercel.com',
  'supabase.com', 'supabase.co', 'prisma.io', 'railway.app', 'render.com', 'cloudflare.com',
  'npmjs.com', 'nodejs.org', 'developer.mozilla.org', 'schema.org', 'web.dev', 'owasp.org', 'w3.org',
])

// Segmen path GENERIK framework yang DIPERTAHANKAN (rekam-pelajaran.md:63 + perluasan hati-hati).
// Sisanya (nama fitur/produk/perusahaan) -> ****. Default: ragu -> samarkan.
const FRAMEWORK_SEGMENTS = new Set([
  'src', 'app', 'api', 'lib', 'prisma', 'migrations', 'features', 'components', 'hooks', 'utils',
  'pages', 'styles', 'public', 'tests', '__tests__', 'server', 'client', 'types', 'config',
  'route.ts', 'route.js', 'page.tsx', 'page.jsx', 'layout.tsx', 'loading.tsx', 'error.tsx',
  'not-found.tsx', 'middleware.ts', 'proxy.ts', 'schema.prisma', 'migration.sql', 'index.ts', 'index.tsx',
])
// Ekstensi kode = sinyal "ini path" (supaya prosa biasa 'a/b' tak dianggap path).
const CODE_EXT_RX = /\.(?:ts|tsx|js|jsx|mjs|cjs|sql|prisma|vue|svelte|py|go|rs|json)$/i

// --- Util masking (kritis privasi) ---
// Kembalikan cuplikan AMAN yang TIDAK memuat nilai rahasia utuh. Maks 4 char depan + '****'.
function maskSnippet(raw) {
  const s = String(raw)
  if (s.length <= 4) return '****'
  return s.slice(0, 4) + '****'
}

// Luhn valid? (untuk kartu kredit). Buang non-digit dulu.
function luhnValid(str) {
  const d = String(str).replace(/\D/g, '')
  if (d.length < 13 || d.length > 19) return false
  let sum = 0
  let alt = false
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48
    if (alt) { n *= 2; if (n > 9) n -= 9 }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

// Digit "dummy" (variasi rendah) = bukan PII nyata (test-card 4242..., 0000..., NIK contoh berulang).
function isDummyDigits(str) {
  const d = String(str).replace(/\D/g, '')
  if (!d) return true
  const distinct = new Set(d.split('')).size
  return distinct <= 2 // 4242.../0000.../1111... = variasi <=2
}

// --- Aturan token/PII (satu inti regex; urutan penting: rahasia dulu, generik belakangan) ---
// re WAJIB global (dipakai matchAll + replace). skipIf(match)->true = allowlist (jangan flag/redaksi).
// validate(match)->false = bukan target (mis. Luhn gagal). placeholder = pengganti saat redaksi.
function buildTokenRules() {
  // Rahasia vendor (reuse SECRET_PATTERNS - satu sumber; dijadikan global untuk redaksi/matchAll).
  const secretRules = SECRET_PATTERNS.map((p) => ({
    kelas: 'SECRET', tingkat: 'GENTING', placeholder: '[DIREDAKSI]',
    re: new RegExp(p.re.source, 'g'), // vendor secret = case-sensitive (tanpa 'i'), cermin ai-config-check
  }))
  return [
    // Blok kunci privat multiline.
    {
      kelas: 'PRIVATE_KEY', tingkat: 'GENTING', placeholder: '[DIREDAKSI]',
      re: /-----BEGIN[A-Z ]*PRIVATE KEY-----[\s\S]*?-----END[A-Z ]*PRIVATE KEY-----/g,
    },
    ...secretRules,
    // Email (sebelum DOMAIN supaya domain email tak dobel-flag).
    {
      kelas: 'EMAIL', tingkat: 'PENTING', placeholder: 'user@contoh.com',
      re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
      skipIf: (m) => PLACEHOLDER_EMAIL.has(m.toLowerCase()) || TECH_DOMAINS.has(m.split('@')[1] || ''),
    },
    // Kartu kredit (Luhn) - SEBELUM NIK supaya 16-digit kartu tak salah-jadi-NIK.
    {
      kelas: 'CARD', tingkat: 'GENTING', placeholder: '[DIREDAKSI]',
      re: /\b(?:\d[ -]?){13,19}\b/g,
      validate: (m) => luhnValid(m) && !isDummyDigits(m),
    },
    // NIK 16-digit.
    {
      kelas: 'NIK', tingkat: 'PENTING', placeholder: '<ID>',
      re: /\b\d{16}\b/g,
      skipIf: (m) => isDummyDigits(m),
    },
    // Nomor HP Indonesia / E.164.
    {
      kelas: 'PHONE', tingkat: 'PENTING', placeholder: '<ID>',
      re: /(?:\+62|62|0)8[0-9]{1}[ -]?[0-9]{3,4}[ -]?[0-9]{3,5}/g,
      skipIf: (m) => isDummyDigits(m),
    },
    // Domain / URL bisnis (RAPIKAN - low severity, FP-prone -> allowlist teknis ketat).
    {
      kelas: 'DOMAIN', tingkat: 'RAPIKAN', placeholder: '<DOMAIN>',
      re: /\bhttps?:\/\/[A-Za-z0-9.-]+|\b[A-Za-z0-9-]+\.(?:com|co\.id|id|net|io|org|app|dev|ai|xyz|store|shop)\b/g,
      skipIf: (m) => {
        const host = m.replace(/^https?:\/\//, '').split('/')[0].toLowerCase()
        return TECH_DOMAINS.has(host) || CODE_EXT_RX.test(m)
      },
    },
  ]
}

const TOKEN_RULES = buildTokenRules()

// Hitung {line,col} 1-indexed dari indeks karakter di teks.
function posOf(text, index) {
  let line = 1
  let last = -1
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) { line++; last = i }
  }
  return { baris: line, kolom: index - last }
}

// --- Redaksi PATH (per-segmen; rekam-pelajaran.md:62-66) ---
// Normalkan 1 segmen dinamis: [orderId]->[id], [productSlug]->[slug]. [id]/[slug] generik -> tetap.
function normalizeDynamicSegment(seg) {
  if (/^\[.+\]$/.test(seg)) return /slug/i.test(seg) ? '[slug]' : '[id]'
  return seg
}
// Redaksi 1 token path. Kembalikan {redacted, changed}.
function redactPathToken(token) {
  const parts = token.split('/')
  let changed = false
  const out = parts.map((seg) => {
    if (seg === '') return seg
    if (/^\[.+\]$/.test(seg)) {
      const norm = normalizeDynamicSegment(seg)
      if (norm !== seg) changed = true
      return norm
    }
    if (FRAMEWORK_SEGMENTS.has(seg)) return seg
    // segmen non-generik (nama bisnis) -> samarkan
    changed = true
    return '****'
  })
  return { redacted: out.join('/'), changed }
}
// Token dianggap PATH kalau: ada >=1 '/' DAN (ada segmen framework ATAU ekstensi kode) -> cegah FP prosa 'a/b'.
const PATH_TOKEN_RX = /(?:\[[^\]\s/]+\]|[A-Za-z0-9._-]+)(?:\/(?:\[[^\]\s/]+\]|[A-Za-z0-9._-]+))+/g
function looksLikePath(token) {
  const segs = token.split('/')
  if (segs.length < 2) return false
  return segs.some((s) => FRAMEWORK_SEGMENTS.has(s) || CODE_EXT_RX.test(s))
}

// === INTI: detectLeaks ===========================================================================
// Pindai teks -> daftar temuan (TANPA mengubah teks). Murni. findings[] tiap: {kelas,tingkat,baris,kolom,cuplikan_aman,placeholder,alasan}.
export function detectLeaks(text) {
  if (text == null || text === '') return []
  const findings = []
  const push = (kelas, tingkat, index, raw, placeholder, alasan) => {
    const { baris, kolom } = posOf(text, index)
    findings.push({ kelas, tingkat, baris, kolom, cuplikan_aman: maskSnippet(raw), placeholder, alasan })
  }

  // 1) Token/PII rules.
  for (const rule of TOKEN_RULES) {
    rule.re.lastIndex = 0
    let m
    while ((m = rule.re.exec(text)) !== null) {
      const raw = m[0]
      if (raw === '') { rule.re.lastIndex++; continue }
      if (rule.skipIf && rule.skipIf(raw)) continue
      if (rule.validate && !rule.validate(raw)) continue
      push(rule.kelas, rule.tingkat, m.index, raw, rule.placeholder, `Terdeteksi pola ${rule.kelas} - disamarkan jadi ${rule.placeholder}.`)
    }
  }

  // 2) PATH bisnis (per-segmen).
  PATH_TOKEN_RX.lastIndex = 0
  let pm
  while ((pm = PATH_TOKEN_RX.exec(text)) !== null) {
    const token = pm[0]
    if (!looksLikePath(token)) continue
    const { changed } = redactPathToken(token)
    if (changed) {
      const kelas = /(?:^|\/)migrations\//.test(token) ? 'MIGRATION_FILE' : 'PATH_BISNIS'
      push(kelas, 'PENTING', pm.index, token, '****', 'Segmen path ber-nama-bisnis - disamarkan jadi ****.')
    }
  }

  // 3) PATH pribadi (C:\Users\x\, /home/x/) - reuse findPathLeaks.
  for (const hit of findPathLeaks(text)) {
    const idx = text.indexOf(hit)
    push('PATH_PRIBADI', 'PENTING', idx < 0 ? 0 : idx, hit, '****', 'Path memuat nama pengguna nyata - disamarkan.')
  }

  return findings
}

// === INTI: applyRedaction ========================================================================
// Kembalikan teks yang SUDAH tersensor. Idempoten (placeholder hasil ada di allowlist -> pass kedua no-op).
export function applyRedaction(text) {
  if (text == null || text === '') return text
  let out = text

  // 1) Token/PII (urutan sama: rahasia dulu).
  for (const rule of TOKEN_RULES) {
    out = out.replace(new RegExp(rule.re.source, rule.re.flags), (m) => {
      if (m === '') return m
      if (rule.skipIf && rule.skipIf(m)) return m
      if (rule.validate && !rule.validate(m)) return m
      return rule.placeholder
    })
  }

  // 2) PATH bisnis (per-segmen).
  out = out.replace(new RegExp(PATH_TOKEN_RX.source, 'g'), (token) => {
    if (!looksLikePath(token)) return token
    const { redacted } = redactPathToken(token)
    return redacted
  })

  return out
}

// === Lapis CLIENT (sensor) =======================================================================
export function scrubText(text) {
  return { clean: applyRedaction(text), findings: detectLeaks(text) }
}

// Baca berkas dengan batas ukuran + BOM-safe. Return {text, skipped, reason}.
export function readBounded(absPath, maxBytes = MAX_INPUT_BYTES) {
  let st
  try { st = fs.statSync(absPath) } catch { return { text: null, skipped: true, reason: 'tak-terbaca' } }
  if (!st.isFile()) return { text: null, skipped: true, reason: 'bukan-berkas' }
  if (st.size > maxBytes) return { text: null, skipped: true, reason: 'terlalu-besar' }
  const text = readTextSafe(absPath)
  if (text == null) return { text: null, skipped: true, reason: 'tak-terbaca' }
  return { text, skipped: false, reason: null }
}

export function scrubFile(absPath, { maxBytes = MAX_INPUT_BYTES } = {}) {
  const r = readBounded(absPath, maxBytes)
  if (r.skipped) return { path: absPath, clean: null, findings: [], skipped: true, reason: r.reason }
  const { clean, findings } = scrubText(r.text)
  return { path: absPath, clean, findings, skipped: false, reason: null }
}

// === Lapis OWNER (verifikasi) ====================================================================
// ok = tak ada bocoran; blocking = bocoran GENTING/PENTING (dasar karantina; RAPIKAN cuma dilaporkan).
export function verifyRedacted(text) {
  const violations = detectLeaks(text)
  const blocking = violations.filter((v) => v.tingkat === 'GENTING' || v.tingkat === 'PENTING')
  return { ok: violations.length === 0, violations, blocking }
}

export function verifyFile(absPath, { maxBytes = MAX_INPUT_BYTES } = {}) {
  const r = readBounded(absPath, maxBytes)
  if (r.skipped) return { path: absPath, ok: false, violations: [], blocking: [], skipped: true, reason: r.reason }
  const v = verifyRedacted(r.text)
  return { path: absPath, ...v, skipped: false, reason: null }
}

// Batch impor owner. Guard path-traversal (target WAJIB di dalam dir). Berkas rusak/kebesaran = SKIP+lapor.
export function verifyDir(dir, { maxBytes = MAX_INPUT_BYTES } = {}) {
  const files = []
  const quarantined = []
  const skipped = []
  const rootAbs = path.resolve(dir)
  let entries = []
  try { entries = fs.readdirSync(rootAbs, { withFileTypes: true }) } catch { return { files, quarantined, skipped, scanned: 0 } }
  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.endsWith('.md')) continue
    const abs = path.resolve(rootAbs, ent.name)
    const rel = path.relative(rootAbs, abs)
    if (rel.startsWith('..') || path.isAbsolute(rel)) { skipped.push({ path: abs, reason: 'di-luar-folder' }); continue } // guard traversal
    const res = verifyFile(abs, { maxBytes })
    if (res.skipped) { skipped.push({ path: abs, reason: res.reason }); continue }
    files.push(res)
    if (res.blocking.length > 0) quarantined.push(abs)
  }
  return { files, quarantined, skipped, scanned: files.length }
}

// Kalimat-batas WAJIB (§4.6) - jangan klaim "aman total".
export const KALIMAT_BATAS = 'Catatan: robot cuma menjamin bersih dari POLA rahasia/PII/path yang bisa dideteksi mesin - BUKAN sertifikat bebas nama-bisnis. Nama bisnis di kalimat bebas tetap perlu mata manusia.'

// --- CLI: node engine/feedback-scrub.mjs <scrub|verify> <path|dir> ---
function main() {
  const [verb, target] = process.argv.slice(2)
  if (!verb || !target || (verb !== 'scrub' && verb !== 'verify')) {
    console.error('Pakai: npx lintasai feedback-scrub <scrub|verify> <berkas|folder>')
    console.error('  scrub  <berkas> : tampilkan versi tersensor + daftar temuan (sisi client).')
    console.error('  verify <folder> : periksa folder berkas pelajaran, lapor yang masih bocor (sisi owner).')
    process.exit(2)
  }
  if (verb === 'scrub') {
    const r = scrubFile(path.resolve(target))
    if (r.skipped) { console.error(`[LEWATI] ${target} - ${r.reason}.`); process.exit(1) }
    console.log(`Temuan: ${r.findings.length} (${r.findings.map((f) => f.kelas).join(', ') || 'tidak ada'})`)
    for (const f of r.findings) console.log(`  - ${f.tingkat} ${f.kelas} baris ${f.baris}: ${f.cuplikan_aman} -> ${f.placeholder}`)
    console.log(KALIMAT_BATAS)
    process.exitCode = r.findings.length
    return
  }
  // verify (folder atau berkas tunggal)
  const abs = path.resolve(target)
  const stat = (() => { try { return fs.statSync(abs) } catch { return null } })()
  if (stat && stat.isDirectory()) {
    const res = verifyDir(abs)
    console.log(`BERSIH: ${res.scanned - res.quarantined.length} dari ${res.scanned} berkas bersih; ${res.quarantined.length} dikarantina; ${res.skipped.length} dilewati.`)
    for (const q of res.quarantined) console.log(`  KARANTINA ${path.basename(q)} - masih ada bocoran GENTING/PENTING.`)
    for (const s of res.skipped) console.log(`  LEWATI ${path.basename(s.path)} - ${s.reason}.`)
    console.log(KALIMAT_BATAS)
    process.exitCode = res.quarantined.length
    return
  }
  const res = verifyFile(abs)
  if (res.skipped) { console.error(`[LEWATI] ${target} - ${res.reason}.`); process.exit(1) }
  console.log(res.ok ? 'BERSIH: 0 bocoran terdeteksi.' : `KOTOR: ${res.violations.length} bocoran (${res.blocking.length} GENTING/PENTING).`)
  for (const v of res.violations) console.log(`  - ${v.tingkat} ${v.kelas} baris ${v.baris}: ${v.cuplikan_aman}`)
  console.log(KALIMAT_BATAS)
  process.exitCode = res.blocking.length
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
