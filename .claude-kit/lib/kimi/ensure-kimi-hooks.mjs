#!/usr/bin/env node
// lib/kimi/ensure-kimi-hooks.mjs - Pasang hook lintasAI ke config Kimi Code (PER-PROJECT, OPT-IN).
//
// KENAPA ADA: adaptor hook Kimi (lib/kimi/*-kimi.mjs) hanya AKTIF kalau terdaftar di config Kimi.
// Claude memakai .claude/settings.json (JSON); Kimi memakai config.toml (TOML) dengan blok `[[hooks]]`.
// Modul ini menulis blok itu ke config PER-PROJECT `.kimi-code/config.toml` (keputusan owner: TAK
// menyentuh config GLOBAL ~/.kimi-code/config.toml).
//
// OPT-IN (bukan auto-jalan installer): dokumentasi resmi Kimi memastikan hook di config GLOBAL; dukungan
// hook PER-PROJECT belum dipastikan dokumen. Supaya TAK merilis perilaku yang belum teruji, pemasangan
// hook = perintah manual `npx lintasai enable-kimi-hooks` yang user jalankan + UJI di Kimi (lihat
// KIMI_CODE_SETUP.md). Kalau ternyata hook per-project tak dibaca Kimi versi tsb: aman (tak ada yang
// rusak) - keamanan tetap dijaga persetujuan BAWAAN Kimi + aturan (.kimi-code/AGENTS.md); user bisa
// memindahkan blok ke config global atas pilihannya sendiri.
//
// SIFAT (cermin lib/ensure-risk-gate-hook.mjs):
//  - IDEMPOTEN: blok yang sudah ada (penanda `lintasai:<nama>`) TIDAK ditambah lagi.
//  - DEFENSIF: pertahankan SELURUH isi config lain; config tak terbaca -> JANGAN tulis (skip).
//  - TULIS ATOMIK: temp + rename.
//  - Format valid: hanya 4 field yang diizinkan Kimi (event/matcher/command/timeout); command = TOML
//    literal-string ('...') supaya path backslash Windows tak perlu escape.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readTextSafe, writeUtf8NoBom, isFile } from '../fs-text.mjs'

// SSOT bentuk hook Kimi. command relatif '.claude-kit/...' - working dir hook Kimi = folder project
// (verbatim docs: "The working directory for hook commands is the current session's project directory").
export const KIMI_HOOKS = [
  { marker: 'lintasai:risk-gate', event: 'PreToolUse', matcher: 'Bash|Edit|Write', command: 'node .claude-kit/lib/kimi/risk-gate-kimi.mjs', timeout: 15 },
  { marker: 'lintasai:lang-reminder', event: 'UserPromptSubmit', matcher: null, command: 'node .claude-kit/lib/kimi/lang-reminder-kimi.mjs', timeout: 15 },
  { marker: 'lintasai:feedback-capture', event: 'Stop', matcher: null, command: 'node .claude-kit/lib/kimi/feedback-capture-kimi.mjs', timeout: 10 },
]

// Bangun satu blok [[hooks]] ber-penanda (mudah dimatikan manual: hapus blok).
export function buildHookBlock(h) {
  const lines = [
    `# >>> ${h.marker} (dibuat lintasAI - hapus seluruh blok ini utk matikan)`,
    '[[hooks]]',
    `event = "${h.event}"`,
  ]
  if (h.matcher) lines.push(`matcher = "${h.matcher}"`)
  lines.push(`command = '${h.command}'`)
  lines.push(`timeout = ${h.timeout}`)
  lines.push(`# <<< ${h.marker}`)
  return lines.join('\n')
}

// PURE: gabungkan blok hook yang BELUM ada ke teks config (append di akhir - header [[hooks]] baru selalu
// TOML valid + tak mengganggu tabel lain). Return { text, added:[markers] }.
export function mergeKimiHooks(existingText, hooks = KIMI_HOOKS) {
  const base = existingText == null ? '' : String(existingText)
  const toAdd = hooks.filter((h) => !base.includes(h.marker))
  if (toAdd.length === 0) return { text: base, added: [] }
  let text = base
  if (text && !text.endsWith('\n')) text += '\n'
  const header = base.trim() ? '' : '# Config Kimi Code - hook lintasAI (per-project). Dikelola `npx lintasai enable-kimi-hooks`.\n\n'
  const blocks = toAdd.map(buildHookBlock).join('\n\n')
  text = header + text + (text && !text.endsWith('\n\n') ? '\n' : '') + blocks + '\n'
  return { text, added: toAdd.map((h) => h.marker) }
}

// Pasang ke .kimi-code/config.toml project. FAIL-SAFE. Return { changed, reason, added, target }.
export function ensureKimiHooks(projectRoot, { dryRun = false } = {}) {
  const dir = path.join(projectRoot, '.kimi-code')
  const target = path.join(dir, 'config.toml')
  const fileExists = isFile(target)
  const existing = fileExists ? readTextSafe(target) : ''
  // file ADA tapi tak terbaca (terkunci/rusak) -> JANGAN tulis (jaga config user).
  if (existing === null) return { changed: false, reason: 'config-tak-terbaca', target }
  const { text, added } = mergeKimiHooks(existing)
  if (added.length === 0) return { changed: false, reason: 'sudah-ada', added: [], target }
  if (dryRun) return { changed: true, reason: 'simulasi', added, target }
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const tmp = `${target}.tmp-${process.pid}`
  writeUtf8NoBom(tmp, text)
  fs.renameSync(tmp, target)
  return { changed: true, reason: fileExists ? 'digabung' : 'dibuat', added, target }
}

// --- CLI: `node lib/kimi/ensure-kimi-hooks.mjs [--project-root <dir>] [--dry-run]` ---
function main() {
  let projectRoot = process.cwd()
  let dryRun = false
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project-root') projectRoot = argv[++i] || projectRoot
    else if (argv[i] === '--dry-run' || argv[i] === '--simulasi') dryRun = true
  }

  const res = ensureKimiHooks(projectRoot, { dryRun })
  switch (res.reason) {
    case 'sudah-ada':
      console.log('OK - hook Kimi lintasAI SUDAH terpasang di .kimi-code/config.toml (tak ada perubahan).')
      break
    case 'simulasi':
      console.log('SIMULASI - AKAN menambah hook: ' + res.added.join(', ') + ' (belum menulis apa pun).')
      break
    case 'dibuat':
    case 'digabung':
      console.log('OK - hook Kimi lintasAI dipasang di .kimi-code/config.toml (' + res.added.join(', ') + ').')
      console.log('LANGKAH WAJIB (uji di Kimi): buka sesi Kimi BARU dari folder project ini, lalu coba minta')
      console.log('  Kimi menjalankan perintah berbahaya (mis. `rm -rf ./uji-tidak-ada`) - harus DITOLAK.')
      console.log('CATATAN: dukungan hook PER-PROJECT belum resmi didokumentasikan Kimi. Kalau ternyata TAK')
      console.log('  terpicu, keamanan tetap dijaga persetujuan bawaan Kimi + aturan; kamu boleh memindah blok')
      console.log('  ke ~/.kimi-code/config.toml (global) - lihat .claude-kit/KIMI_CODE_SETUP.md.')
      break
    case 'config-tak-terbaca':
      console.error('[LEWATI] .kimi-code/config.toml ada tapi tak terbaca (terkunci/rusak) - TIDAK diubah.')
      process.exit(1)
      break
    default:
      console.error('[GAGAL] Tidak bisa memasang hook Kimi (alasan: ' + res.reason + ').')
      process.exit(1)
  }
  process.exit(0)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
