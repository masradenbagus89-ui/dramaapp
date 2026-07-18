#!/usr/bin/env node
// lib/kimi/kimi-hook-io.mjs - Lapisan I/O hook untuk Kimi Code CLI.
//
// KENAPA ADA: kit memakai otak keputusan yang SAMA (lib/risk-gate.js decide(), lib/fact-gate.mjs, dll)
// untuk Claude Code DAN Kimi Code. Yang beda cuma "kulit" I/O-nya. Berkas ini memusatkan SEMUA hal
// yang khusus Kimi (baca stdin, petakan nama field, kirim keputusan) di SATU tempat, supaya kalau ada
// detail Kimi yang perlu diperbaiki, cukup ubah di sini - adaptor lain tak tersentuh.
//
// FAKTA KONTRAK (verbatim dokumentasi resmi MoonshotAI/kimi-code, docs/en/customization/hooks.md):
//  - stdin JSON snake_case; field dasar { hook_event_name, session_id, cwd }.
//  - PreToolUse membawa `tool_input.command` (dipastikan dokumen). Nama field NAMA-tool & path berkas
//    TIDAK dicontohkan dokumen -> di sini dinormalisasi defensif (coba beberapa kandidat, fail-safe).
//  - MEMBLOKIR: exit code 2 + pesan ke stderr (jadi alasan blokir).
//  - MENGIZINKAN: exit code 0 (senyap). Isi stdout pada exit 0 = "may be appended to context".
//  - Tak ada mekanisme "ask"/konfirmasi di hook Kimi (hanya blokir vs izinkan) -> lihat pemetaan hybrid
//    di risk-gate-kimi.mjs.
//
// FAIL-OPEN: input rusak/kosong -> anggap izinkan (jangan mengunci kerja tim karena robot tersedak).
import fs from 'node:fs'

// Baca seluruh stdin (fd 0) sebagai teks. Senyap kalau tak ada input.
export function readStdinRaw() {
  try {
    return fs.readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

// Parse JSON hook (buang BOM tak-kasat-mata dulu -> JSON.parse anti-tersedak). null kalau kosong/rusak.
export function parseHookInput(raw) {
  const s = raw == null ? '' : String(raw)
  const cleaned = (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s).trim()
  if (!cleaned) return null
  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

// Ambil string pertama yang ada dari daftar nama field kandidat (defensif terhadap variasi nama Kimi).
function firstString(obj, keys) {
  if (!obj || typeof obj !== 'object') return ''
  for (const k of keys) {
    if (typeof obj[k] === 'string' && obj[k]) return obj[k]
  }
  return ''
}

// Nama event hook (kalau ada).
export function hookEventName(input) {
  return (input && (input.hook_event_name || input.hookEventName || input.event)) || ''
}

// Normalisasi payload Kimi -> bentuk KANONIK yang dipahami decide() Claude:
//   { tool_name, tool_input: { command, file_path } }
// `tool_input.command` = jalur yang DIPASTIKAN dokumen -> deteksi perintah-bahaya jalan andal.
// Nama-tool & path = kandidat (kalau Kimi memakai nama beda, cek berbasis-perintah tetap jalan;
// cek berbasis-berkas (mis. .env) degradasi anggun -> ditutup dialog persetujuan bawaan Kimi).
export function normalizeToolCall(input) {
  if (!input || typeof input !== 'object') return { tool_name: '', tool_input: { command: '', file_path: '' } }
  const toolName = firstString(input, ['tool_name', 'toolName', 'tool', 'name'])
  let ti = {}
  if (input.tool_input && typeof input.tool_input === 'object') ti = input.tool_input
  else if (input.toolInput && typeof input.toolInput === 'object') ti = input.toolInput
  else if (input.input && typeof input.input === 'object') ti = input.input
  const command = firstString(ti, ['command', 'cmd', 'script', 'bash'])
  const filePath = firstString(ti, ['file_path', 'filePath', 'path', 'file'])
  return { tool_name: toolName, tool_input: { command, file_path: filePath } }
}

// --- Encoder keputusan (kontrak Kimi) ---

// Blokir keras: exit 2 + alasan ke stderr. (Set kode DULU -> pipa putus tak mengubah keputusan.)
export function emitDeny(reason) {
  process.exitCode = 2
  try {
    process.stderr.write(String(reason) + '\n')
  } catch {
    /* pipa putus: kode tetap 2 */
  }
}

// Izinkan senyap: exit 0.
export function emitAllow() {
  process.exitCode = 0
}

// Izinkan TAPI beri peringatan (advisory) ke stderr - keputusan tetap di dialog bawaan Kimi.
export function emitWarnAllow(message) {
  process.exitCode = 0
  try {
    process.stderr.write(String(message) + '\n')
  } catch {
    /* pipa putus: kode tetap 0 */
  }
}

// Suntik teks ke konteks AI lewat stdout (untuk UserPromptSubmit/Stop; verbatim: stdout exit 0
// "may be appended to context").
export function emitContext(text) {
  process.exitCode = 0
  try {
    if (text) process.stdout.write(String(text))
  } catch {
    /* pipa putus */
  }
}

// Pasang peredam EPIPE supaya hook TAK PERNAH crash dengan kode salah saat pipa putus.
export function guardPipes() {
  process.stdout.on('error', () => {})
  process.stderr.on('error', () => {})
}
