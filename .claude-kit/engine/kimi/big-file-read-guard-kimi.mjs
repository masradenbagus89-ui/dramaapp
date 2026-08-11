#!/usr/bin/env node
// engine/kimi/big-file-read-guard-kimi.mjs - "Penjaga Baca Besar" versi Kimi Code (PreToolUse hook).
//
// KENAPA ADA: ADR-018 kondisi #11 - otak asli = Claude Code ATAU Kimi Code. Otak keputusan (decideBigRead
// + state dampening) DIPAKAI ULANG dari engine/big-file-read-guard.mjs; berkas ini HANYA memetakan payload
// Kimi -> bentuk kanonik lalu keputusan -> kontrak Kimi. JANGAN tulis-ulang logikanya: dua salinan = satu
// sisi bisa melenceng diam-diam dan penjaga jadi bohong di salah satu otak.
//
// CATATAN offset/limit: normalizeToolCall (kimi-hook-io) sengaja cuma menyimpan command+file_path, jadi
// offset/limit diambil DEFENSIF dari payload MENTAH di sini (nama field baca-sebagian Kimi tak
// didokumentasikan -> coba beberapa kandidat). Tak ketemu -> baca dianggap utuh; arah gagal aman: paling
// buruk tertahan sekali lalu diloloskan pada retry (dampening).
//
// FAIL-OPEN penuh: input rusak/kosong -> izinkan.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decideBigRead, bacaGated, tulisGated } from '../big-file-read-guard.mjs'
import { readStdinRaw, parseHookInput, normalizeToolCall, emitDeny, emitAllow, guardPipes } from './kimi-hook-io.mjs'

// Nama tool baca Kimi -> 'Read'. Longgar SENGAJA (nama tak dikenal dikembalikan apa adanya -> decideBigRead
// menganggapnya "bukan Read" -> izinkan; arah gagal yang benar).
const POLA_BACA = /^(read|read_file|readfile|view|view_file|open_file|cat|get_file)$/i

export function kanonkanTool(nama) {
  const n = String(nama || '')
  if (POLA_BACA.test(n)) return 'Read'
  return n
}

// Ambil tool_input MENTAH (sebelum dinormalisasi) untuk mengintip offset/limit.
function rawToolInput(input) {
  if (!input || typeof input !== 'object') return {}
  for (const k of ['tool_input', 'toolInput', 'input']) {
    if (input[k] && typeof input[k] === 'object') return input[k]
  }
  return {}
}
function angkaPertama(...cands) {
  for (const x of cands) if (typeof x === 'number') return x
  return undefined
}

// PURE: payload Kimi + state -> keputusan decideBigRead.
export function decideBigReadKimi(input, gated) {
  const norm = normalizeToolCall(input)
  const raw = rawToolInput(input)
  const ti = { file_path: norm.tool_input.file_path }
  const off = angkaPertama(raw.offset, raw.start, raw.start_line, raw.startLine)
  const lim = angkaPertama(raw.limit, raw.count, raw.num_lines, raw.numLines)
  if (off !== undefined) ti.offset = off
  if (lim !== undefined) ti.limit = lim
  return decideBigRead({ tool_name: kanonkanTool(norm.tool_name), tool_input: ti }, gated)
}

function main() {
  const input = parseHookInput(readStdinRaw())
  if (!input) return emitAllow() // fail-open

  const sessionId = typeof input.session_id === 'string' ? input.session_id : null
  let gated
  try { gated = bacaGated(sessionId) } catch { return emitAllow() } // state tak terbaca -> jangan kunci kerja orang

  const d = decideBigReadKimi(input, gated)
  if (d.decision === 'block') {
    try { gated.add(d.filePath); tulisGated(sessionId, gated) } catch { /* gagal tulis state: keputusan di bawah tetap berlaku */ }
    return emitDeny(d.reason)
  }
  return emitAllow()
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  guardPipes()
  main()
}
