#!/usr/bin/env node
// engine/fact-gate.mjs - "Palang Fakta" (PreToolUse hook Claude Code, deterministik, ~0 token).
//
// Masalah yang dipecahkan: aturan kit "baca pemanggil sebelum edit" (sec.7.3a), "cari reuse dulu"
// (sec.5), "blast radius" (sec.4.6) selama ini = KEBIJAKAN TEKS yang bergantung AI patuh. Read-before-Edit
// bawaan Claude Code cuma memaksa BERKAS-nya di-Read, TAK memaksa AI menyebut pemakainya. Palang ini
// = PENEGAK-MESIN: sebelum edit/tulis PERTAMA sebuah berkas BERDAMPAK-TINGGI dalam sesi, ia memblokir
// lalu meminta AI menyajikan 4 FAKTA (pemakai/importer, fungsi terdampak, skema data, instruksi verbatim).
// Sesudah AI menyajikan + retry, edit berikutnya berkas SAMA diizinkan (dampening: sekali per berkas/sesi).
//
// Adopsi ECC gateguard-fact-force.js (MIT) - ditulis-ulang, mode Bahasa Indonesia non-programmer,
// DEFAULT MATI (opt-in): ini menambah friksi tiap edit-pertama, jadi OWNER yang memutuskan menyalakan
// (pasang blok PreToolUse fact-gate di .claude/settings.json). Read-before-Edit bawaan = lantai;
// fact-gate = tingkat di atasnya untuk berkas berdampak-tinggi. Keputusan + jangkauan = ADR-014.
//
// KONTRAK PreToolUse (cek dok versi terpasang): input JSON stdin { tool_name, tool_input{file_path},
// session_id }. "block" = exit 2 + stderr (umpan-balik ke AI, ia sajikan fakta lalu retry). "allow" =
// exit 0. FAIL-OPEN: input rusak/state error/berkas rendah-nilai -> allow (jangan kunci kerja tim).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readState, writeState } from './hook-session-state.mjs'

// Berkas BERDAMPAK-TINGGI (worth "siapa pemakai / skema apa"): auth, DB/migrasi/RLS, API/route,
// keamanan, middleware, entry. Ini menyempitkan pemicu = dampening pola (jarang, tapi taruhan tinggi).
const HIGH_IMPACT = /(auth|login|session|oauth|jwt|migration|migrations|schema|policy|rls|[/\\]api[/\\]|route\.(t|j)sx?$|middleware|proxy|guard|crypto|permission|billing|payment|webhook)/i
// Pohon RENDAH-NILAI (skip: "siapa import ini" tak bermakna): tes, generated, dist, mock, scratch.
const LOW_VALUE = /(\.test\.|\.spec\.|\.d\.ts$|\.generated\.|database\.types\.ts$|(^|[/\\])(tests?|__mocks__|__tests__|dist|build|out|coverage|node_modules|\.next|fixtures?|scratch|tmp)[/\\])/i

// --- Fungsi MURNI (bisa diuji tanpa disk) --------------------------------------------------------

export function isHighImpact(filePath) { return HIGH_IMPACT.test(String(filePath || '')) }
export function isLowValue(filePath) { return LOW_VALUE.test(String(filePath || '')) }

// Pesan 4-fakta (Bahasa Indonesia non-programmer + teknis ringkas untuk AI).
export function editGateMsg(filePath) {
  const leaf = String(filePath).split(/[\\/]/).pop()
  return [
    '[Palang Fakta] Sebelum mengubah berkas berdampak-tinggi "' + leaf + '", sajikan dulu 4 fakta',
    '(cegah edit tanpa lihat dampak -> anti-crash). Setelah disajikan, ulangi operasi yang sama:',
    '1. Daftar SEMUA berkas yang meng-import/memakai berkas ini (Grep/Glob nama & path-nya).',
    '2. Fungsi/kelas publik yang terdampak perubahan ini.',
    '3. Kalau baca/tulis data: nama field + struktur + format (pakai contoh, bukan data produksi asli).',
    '4. Kutip instruksi user saat ini apa adanya (verbatim).',
  ].join('\n')
}

// Keputusan MURNI: block hanya untuk Edit/Write/MultiEdit berkas high-impact yang BELUM di-gate sesi ini.
// gatedSet = daftar path yang sudah pernah di-gate (dampening). Kembalikan {decision, reason, filePath}.
export function decide(obj, gatedSet) {
  if (!obj || typeof obj !== 'object') return { decision: 'allow' }
  const tool = typeof obj.tool_name === 'string' ? obj.tool_name : ''
  if (!/^(Edit|Write|MultiEdit)$/i.test(tool)) return { decision: 'allow' }
  const ti = obj.tool_input && typeof obj.tool_input === 'object' ? obj.tool_input : {}
  const filePath = typeof ti.file_path === 'string' ? ti.file_path : (typeof ti.file === 'string' ? ti.file : '')
  if (!filePath) return { decision: 'allow' }
  if (isLowValue(filePath)) return { decision: 'allow' }        // pohon rendah-nilai -> lewati
  if (!isHighImpact(filePath)) return { decision: 'allow' }     // bukan berkas berdampak-tinggi -> lewati
  const key = filePath.replace(/\\/g, '/')
  if (gatedSet && gatedSet.has(key)) return { decision: 'allow', filePath: key } // sudah di-gate -> dampening
  return { decision: 'block', reason: editGateMsg(filePath), filePath: key }
}

// --- State per-sesi (dampening) — fail-open total, via engine/hook-session-state.mjs (ADR-019: SATU
// sumber logika state-per-sesi dipakai bersama engine/feedback-capture.mjs, DRY - dulu berkas ini punya
// statePath() sendiri byte-mirip; disatukan tanpa mengubah lokasi/format berkas state di disk, format
// nama tetap "lintas-factgate-<id>.json" persis seperti sebelumnya). ------------------------------

const STATE_NAMESPACE = 'factgate'

export function readGated(sessionId) {
  const st = readState(STATE_NAMESPACE, sessionId, { gated: [] })
  return new Set(Array.isArray(st.gated) ? st.gated : [])
}
function writeGated(sessionId, set) {
  writeState(STATE_NAMESPACE, sessionId, { gated: [...set] })
}

// Diekspor (bukan cuma internal) sejak 2026-07-19: engine/rak-gate.mjs memakai protokol blokir PreToolUse
// yang SAMA PERSIS (exit 2 + stderr). Disatukan di sini supaya tak ada dua salinan yang bisa melenceng
// - dijaga tests/no-duplicate-functions.test.mjs. Perilaku tak berubah sedikit pun.
export function emitBlock(message) {
  process.exitCode = 2
  try { process.stderr.write(message + '\n') } catch { /* pipa putus: kode tetap 2 */ }
}

function main() {
  let raw = ''
  try { raw = fs.readFileSync(0, 'utf8') } catch { process.exitCode = 0; return }  // fail-open
  const cleaned = (raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw).trim()       // buang BOM
  let obj = null
  try { obj = cleaned ? JSON.parse(cleaned) : null } catch { process.exitCode = 0; return } // fail-open
  if (!obj) { process.exitCode = 0; return }

  const sessionId = typeof obj.session_id === 'string' ? obj.session_id : null
  const gated = readGated(sessionId)
  const d = decide(obj, gated)
  if (d.decision === 'block') {
    gated.add(d.filePath)          // catat: edit BERIKUTNYA berkas sama diizinkan (dampening)
    writeGated(sessionId, gated)
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
