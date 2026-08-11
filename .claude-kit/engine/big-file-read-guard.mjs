#!/usr/bin/env node
// engine/big-file-read-guard.mjs - "Penjaga Baca Besar" (PreToolUse hook Claude Code, deterministik, ~0 token).
//
// MASALAH: tool `Read` bawaan menarik SELURUH isi berkas ke konteks. Untuk berkas raksasa (mis. di kit
// ini CHANGELOG.md ~52.9k token, MCP_SETUP.md ~16.1k - angka di ADR-027 sec 2)
// satu baca-utuh tak sengaja membakar puluhan ribu token DAN memenuhi konteks dengan teks tak relevan
// (memecah perhatian AI - ADR-023). Aturan sec 6 ("berkas rujukan/arsip >~20KB -> Grep saja") = LAPIS-1
// (imbauan teks, bisa lalai). Berkas ini = LAPIS-2 MESIN: penegak deterministik saat imbauan terlewat (sec 6.4).
//
// YANG DITEGAKKAN: `Read` atas berkas >50KB TANPA offset/limit (baca-utuh), yang BUKAN berkas kode
// (perlu dibaca utuh untuk dipahami/diedit) dan BUKAN berkas aturan inti (CLAUDE_universal_v1.md /
// CLAUDE.md / AGENTS.md, memang dibaca penuh) -> DITAHAN-LUNAK: pesan mengarahkan ke Grep/offset.
// BLOCK-LUNAK (bukan dialog "ask" ke manusia) = keputusan owner (Tugas 8, sesi 2026-07-20): ini soal
// HEMAT TOKEN, jadi yang tepat menyesuaikan = AI (pakai Grep/offset), bukan manusia diganggu popup.
//
// DAMPENING (bikin block ini LUNAK, bukan tembok): tahan HANYA percobaan baca-utuh PERTAMA per berkas
// per sesi. Kalau AI mengulang Read yang sama (menandakan ia MEMANG butuh seluruh isi), percobaan ke-2
// diloloskan. Jadi penjaga ini menepuk pundak sekali, tak pernah mengunci.
//
// DEFAULT MATI (opt-in) = keputusan owner. Dinyalakan manual `npx lintasai enable-big-file-read-guard`
// (engine/ensure-big-file-read-guard-hook.mjs). Ini pagar EFISIENSI, BUKAN keamanan: `Bash cat`/`Grep`
// tak dihitung & tak ditahan (batas jujur sama seperti Palang Rak). Yang menjaga aksi berbahaya = engine/risk-gate.js.
//
// KONTRAK PreToolUse: stdin JSON { tool_name, tool_input{file_path, offset?, limit?}, session_id }.
// block = exit 2 + stderr (umpan-balik ke AI, ia baca cerdas lalu retry). allow = exit 0.
// FAIL-OPEN: input rusak / berkas tak ada / state error -> allow (jangan kunci kerja tim).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readState, writeState } from './hook-session-state.mjs'
import { emitBlock } from './fact-gate.mjs'

// Diekspor supaya adaptor Kimi (engine/kimi/big-file-read-guard-kimi.mjs) memakai LACI STATE YANG SAMA.
export const STATE_NAMESPACE = 'bigfileguard'
export const AMBANG_BYTE = 50 * 1024 // 50 KB: di atas ini baca-utuh ~>12rb token - layak ditahan-lunak.

// Ekstensi berkas KODE/konfigurasi: DIKECUALIKAN (biasanya dibaca utuh untuk dipahami/diedit; Read-before-
// Edit butuh isi penuh). Berkas dokumen/arsip/data (.md/.txt/.csv/.log/.jsonl/...) TIDAK di sini = itu
// justru SASARAN penjaga (di situlah baca-besar-tak-sengaja paling mahal).
const KODE_EXT = new Set([
  'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'mts', 'cts', 'json', 'jsonc', 'py', 'pyi', 'go', 'php', 'rb',
  'rs', 'java', 'kt', 'kts', 'swift', 'scala', 'c', 'cc', 'cpp', 'cxx', 'h', 'hh', 'hpp', 'cs', 'm', 'mm',
  'css', 'scss', 'sass', 'less', 'styl', 'vue', 'svelte', 'astro', 'html', 'htm', 'xml', 'yaml', 'yml',
  'toml', 'ini', 'cfg', 'conf', 'env', 'sh', 'bash', 'zsh', 'fish', 'ps1', 'psm1', 'psd1', 'bat', 'cmd',
  'sql', 'graphql', 'gql', 'proto', 'lua', 'dart', 'ex', 'exs', 'erl', 'pl', 'pm', 'r', 'jl', 'hs', 'clj', 'tf',
])
// Berkas aturan INTI (dibaca penuh tiap sesi / saat diedit) - dikecualikan lewat NAMA, apa pun ekstensinya.
const ATURAN_INTI = new Set(['claude_universal_v1.md', 'claude.md', 'agents.md'])

// --- Fungsi MURNI (bisa diuji tanpa disk) --------------------------------------------------------

// Apakah berkas ini dikecualikan dari penjaga (kode/konfigurasi ATAU aturan inti)?
export function dikecualikan(filePath) {
  const nama = String(filePath || '').split(/[\\/]/).pop() || ''
  if (ATURAN_INTI.has(nama.toLowerCase())) return true
  const titik = nama.lastIndexOf('.')
  const ext = titik > 0 ? nama.slice(titik + 1).toLowerCase() : '' // titik>0: ".env" (titik=0) tak dihitung ekstensi
  return KODE_EXT.has(ext)
}

// Apakah tool_input menandakan baca-SEBAGIAN (offset atau limit di-set)? Kalau ya, bukan baca-utuh.
function bacaSebagian(ti) {
  return typeof ti.offset === 'number' || typeof ti.limit === 'number'
}

// Pesan tahan-lunak: sebut ukuran + tawarkan Grep/offset + beri tahu katup lepas (retry ke-2 lolos).
export function pesanBlok(filePath, ukuran) {
  const nama = String(filePath).split(/[\\/]/).pop()
  const kb = Math.round(ukuran / 1024)
  const estTok = Math.round(ukuran / 4 / 1000) // kira-kira: byte ÷ 4 ≈ token, ÷1000 = ribu
  return [
    `[Penjaga Baca Besar] "${nama}" ~${kb} KB - baca-utuh (Read tanpa offset) akan menelan kira-kira ~${estTok}rb token sekaligus (boros + memenuhi konteks).`,
    'Coba yang lebih hemat dulu:',
    '- Cari kata/anchor yang kau butuh dengan Grep (tak menarik seluruh isi).',
    '- Perlu bagian tertentu: Read pakai offset + limit (baca sebagian).',
    'Kalau MEMANG butuh seluruh isi (jarang), ulangi Read yang sama sekali lagi - permintaan kedua diloloskan.',
  ].join('\n')
}

function ukuranBerkasNyata(filePath) {
  try { return fs.statSync(filePath).size } catch { return -1 }
}

// KEPUTUSAN MURNI. gated = Set path yang sudah pernah ditahan sesi ini (dampening). ukuranDari di-injeksi
// supaya bisa diuji tanpa disk. Return { decision:'allow'|'block', reason?, filePath? }.
export function decideBigRead(obj, gated, ukuranDari = ukuranBerkasNyata) {
  if (!obj || typeof obj !== 'object') return { decision: 'allow' }
  const tool = typeof obj.tool_name === 'string' ? obj.tool_name : ''
  if (!/^Read$/i.test(tool)) return { decision: 'allow' }        // cuma Read yang dijaga
  const ti = obj.tool_input && typeof obj.tool_input === 'object' ? obj.tool_input : {}
  const filePath = typeof ti.file_path === 'string' ? ti.file_path : (typeof ti.file === 'string' ? ti.file : '')
  if (!filePath) return { decision: 'allow' }
  if (bacaSebagian(ti)) return { decision: 'allow' }             // sudah baca-sebagian -> bukan urusan penjaga
  if (dikecualikan(filePath)) return { decision: 'allow' }       // kode/aturan-inti -> biarkan
  const key = filePath.replace(/\\/g, '/')
  if (gated && gated.has(key)) return { decision: 'allow', filePath: key } // sudah ditahan -> mengalah (lunak)
  const ukuran = ukuranDari(filePath)
  if (!(ukuran > AMBANG_BYTE)) return { decision: 'allow' }      // -1 (tak ada) / kecil -> biarkan
  return { decision: 'block', reason: pesanBlok(filePath, ukuran), filePath: key }
}

// State dampening (per-sesi) via engine/hook-session-state.mjs (fail-open total). Nama sengaja BEDA dari
// readGated/writeGated fact-gate: laci sendiri (namespace 'bigfileguard'), tak berbagi dengan Palang Fakta.
export function bacaGated(sessionId) {
  const st = readState(STATE_NAMESPACE, sessionId, { gated: [] })
  return new Set(Array.isArray(st.gated) ? st.gated : [])
}
export function tulisGated(sessionId, gated) {
  writeState(STATE_NAMESPACE, sessionId, { gated: [...gated].slice(-500) }) // batas: sesi panjang tak menumbuhkan state tanpa henti
}

function main() {
  let raw = ''
  try { raw = fs.readFileSync(0, 'utf8') } catch { process.exitCode = 0; return }  // fail-open
  const cleaned = (raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw).trim()        // buang BOM
  let obj = null
  try { obj = cleaned ? JSON.parse(cleaned) : null } catch { process.exitCode = 0; return } // fail-open
  if (!obj) { process.exitCode = 0; return }

  const sessionId = typeof obj.session_id === 'string' ? obj.session_id : null
  const gated = bacaGated(sessionId)
  const d = decideBigRead(obj, gated)
  if (d.decision === 'block') {
    gated.add(d.filePath)          // catat: baca-utuh BERIKUTNYA berkas sama diloloskan (lunak)
    tulisGated(sessionId, gated)
    return emitBlock(d.reason)
  }
  process.exitCode = 0             // allow
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  process.stdout.on('error', () => {})
  process.stderr.on('error', () => {})
  main()
}
