#!/usr/bin/env node
// lib/kimi-agents-gen.mjs - Generator berkas aturan Kimi Code: .kimi-code/AGENTS.md
//
// KENAPA ADA: Claude Code memuat aturan lewat CLAUDE.md (@import CLAUDE_universal_v1.md). Kimi Code
// TIDAK membaca CLAUDE.md dan TIDAK mengenal sintaks @import - tetapi Kimi MEMBACA `AGENTS.md`
// (root + .kimi-code/AGENTS.md) otomatis tiap sesi (dokumentasi resmi MoonshotAI/kimi-code:
// customization/agents). Supaya kualitas kit di Kimi IDENTIK dengan di Claude, aturan yang di Claude
// "selalu-dimuat" (CLAUDE_universal_v1.md) di-SALIN PENUH ke .kimi-code/AGENTS.md - bukan ringkasan,
// supaya tak ada aturan yang tertinggal. Detail per-topik tetap on-demand lewat penunjuk ke workflows/.
//
// KENAPA .kimi-code/AGENTS.md (bukan menebalkan AGENTS.md root): Claude TIDAK membaca folder
// .kimi-code/, jadi salinan penuh ini TIDAK membebani sesi Claude (nol dobel). Root AGENTS.md tetap
// tipis (override proyek) dan dibaca KEDUA alat.
//
// SIFAT: DETERMINISTIK (isi = salinan literal sumber + header tetap) -> regenerate selalu identik,
// mustahil basi. Artefak GENERATED (gitignored di repo kit; dibuat saat install ke client; REGENERATE
// saat update). Diukur byte UTF-8. present:false = sumber tak ketemu (auto-skip anggun).
//
// TERUJI: buildKimiAgents PURE (isi disuntik) - tests/kimi-agents-gen.test.mjs.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripBom, readTextSafe, writeUtf8NoBom, backupStamp } from './fs-text.mjs'

// Penanda berkas generated (dipakai untuk membedakan "digest kita" vs berkas asing yang diedit tangan).
export const KIMI_AGENTS_MARKER = '<!-- KIMI-AGENTS v1 - DIBUAT OTOMATIS oleh lintasAI - JANGAN edit tangan -->'

// PURE: bangun isi .kimi-code/AGENTS.md dari teks aturan sumber. DISUNTIK di tes (tak menyentuh disk).
// kitPrefix: '' saat sumber = root repo kit; '.claude-kit/' saat sumber = di dalam project client.
export function buildKimiAgents({ rulesText, kitPrefix = '.claude-kit/' } = {}) {
  const rules = stripBom(String(rulesText == null ? '' : rulesText)).replace(/\s+$/, '')
  const header = [
    KIMI_AGENTS_MARKER,
    '',
    '# Aturan Kerja lintasAI - untuk Kimi Code CLI',
    '',
    '> Berkas ini DIBUAT OTOMATIS dari `' + kitPrefix + 'CLAUDE_universal_v1.md` dan dibaca Kimi Code',
    '> otomatis tiap sesi. Isinya = aturan kerja tim yang **IDENTIK** dengan yang dipakai di Claude Code',
    '> (tak ada yang dipangkas). JANGAN edit berkas ini dengan tangan - akan ditimpa saat update kit.',
    '>',
    '> Rincian per-topik dibaca ON-DEMAND (pakai tool Read saat tugas cocok pemicunya, jangan dimuat',
    '> sekaligus): daftar isi di `' + kitPrefix + 'workflows/INDEX.md`, lalu baca berkas seksi',
    '> `' + kitPrefix + 'workflows/<nomor>-*.md` yang relevan.',
    '',
    '---',
    '',
    '',
  ].join('\n')
  return header + rules + '\n'
}

// Cari sumber aturan: root repo kit ATAU di dalam project client (.claude-kit/). Return {path, kitPrefix} atau null.
export function findRulesSource(repoRoot = process.cwd()) {
  const atRoot = path.join(repoRoot, 'CLAUDE_universal_v1.md')
  const atClient = path.join(repoRoot, '.claude-kit', 'CLAUDE_universal_v1.md')
  if (fs.existsSync(atRoot)) return { path: atRoot, kitPrefix: '' }
  if (fs.existsSync(atClient)) return { path: atClient, kitPrefix: '.claude-kit/' }
  return null
}

// Orkestrasi untuk CLI + preflight. write:false = cek sinkron (read-only); write:true = tulis berkas.
// present:false = sumber tak ketemu (auto-skip anggun).
export function runKimiAgentsGen({ repoRoot = process.cwd(), write = false } = {}) {
  const src = findRulesSource(repoRoot)
  if (!src) return { present: false }

  const rulesText = readTextSafe(src.path)
  if (rulesText == null) return { present: false }

  const content = buildKimiAgents({ rulesText, kitPrefix: src.kitPrefix })
  const bytes = Buffer.byteLength(content, 'utf8')
  const targetDir = path.join(repoRoot, '.kimi-code')
  const target = path.join(targetDir, 'AGENTS.md')
  const existing = readTextSafe(target)
  const exists = existing != null
  const inSync = exists && existing === content

  if (!write) {
    return { present: true, target, exists, inSync, bytes }
  }

  if (inSync) return { present: true, target, action: 'current', bytes }

  // Berkas ada tapi BUKAN hasil generate kita (diedit tangan / berkas asing) -> cadangkan dulu.
  let backup = null
  if (exists && !existing.includes('KIMI-AGENTS v1')) {
    backup = `${target}.backup-${backupStamp(new Date())}`
    try { fs.copyFileSync(target, backup) } catch { backup = null }
  }
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
  writeUtf8NoBom(target, content)
  return { present: true, target, action: exists ? 'updated' : 'created', backup, bytes }
}

// --- CLI: `node lib/kimi-agents-gen.mjs [--project-root <dir>] [--write] [--check]` ---
function main() {
  let repoRoot = process.cwd()
  let write = false
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project-root') repoRoot = argv[++i] || repoRoot
    else if (argv[i] === '--write') write = true
    else if (argv[i] === '--check') write = false
  }

  const res = runKimiAgentsGen({ repoRoot, write })
  if (!res.present) {
    console.log('Kimi AGENTS.md: DILEWATI - CLAUDE_universal_v1.md tak ketemu (root / .claude-kit/).')
    process.exit(0)
  }

  if (!write) {
    if (!res.exists) {
      console.log('Kimi AGENTS.md: BELUM ADA. Jalankan `npx lintasai kimi-sync --write` untuk membuatnya.')
      process.exit(0)
    }
    if (res.inSync) {
      console.log(`Kimi AGENTS.md: SINKRON dengan aturan (${res.bytes.toLocaleString('en-US')} byte).`)
    } else {
      console.log('Kimi AGENTS.md: BASI (beda dari aturan sumber). Jalankan `npx lintasai kimi-sync --write`.')
    }
    process.exit(0)
  }

  switch (res.action) {
    case 'current':
      console.log(`OK - .kimi-code/AGENTS.md SUDAH sinkron (${res.bytes.toLocaleString('en-US')} byte, tak ada perubahan).`)
      break
    case 'created':
      console.log(`OK - .kimi-code/AGENTS.md DIBUAT (${res.bytes.toLocaleString('en-US')} byte). Kimi Code akan membacanya tiap sesi.`)
      break
    case 'updated':
      console.log(`OK - .kimi-code/AGENTS.md DIPERBARUI (${res.bytes.toLocaleString('en-US')} byte).`)
      if (res.backup) console.log(`  Berkas lama dicadangkan ke: ${res.backup}`)
      break
    default:
      break
  }
  process.exit(0)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
