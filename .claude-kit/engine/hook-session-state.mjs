#!/usr/bin/env node
// engine/hook-session-state.mjs - util state per-sesi untuk hook Claude Code (ADR-019, fail-open total).
//
// KENAPA: beberapa hook (mis. feedback-capture) perlu "ingat" sesuatu ANTAR-panggilan dalam 1 sesi yang
// sama (mis. "sudah pernah mengingatkan di rentang-kerja ini?") tanpa menulis apa pun ke folder project
// (supaya tak butuh .gitignore baru + tak mengotori `git status`, yang justru dipakai sinyal hook lain
// - lihat gitHasWork() di engine/feedback-capture.mjs).
//
// Pola diadopsi dari engine/fact-gate.mjs (PreToolUse, sudah jalan produksi sejak ADR-014): state kecil di
// os.tmpdir(), dikunci per session_id, tulis atomik (temp+rename), FAIL-OPEN total (apa pun gagal ->
// fallback, TAK PERNAH throw) supaya hook pemakai tak pernah gagal gara-gara util ini.
//
// KONTRAK: readState(namespace, sessionId, fallback) -> object (fallback kalau tak ada/korup/gagal).
//          writeState(namespace, sessionId, obj) -> boolean (false kalau gagal, TAK PERNAH throw).
// namespace + sessionId SELALU disanitasi (cegah path traversal / karakter aneh dari harness).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

function sanitizeId(id) {
  return String(id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
}

function sanitizeNamespace(ns) {
  return String(ns || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'default'
}

function statePath(namespace, sessionId) {
  const ns = sanitizeNamespace(namespace)
  const id = sanitizeId(sessionId) || 'nosession'
  return path.join(os.tmpdir(), `lintas-${ns}-${id}.json`)
}

// Baca state. FAIL-OPEN: berkas tak ada / JSON korup / apa pun aneh -> fallback.
export function readState(namespace, sessionId, fallback = {}) {
  try {
    const raw = fs.readFileSync(statePath(namespace, sessionId), 'utf8')
    const obj = JSON.parse(raw)
    return obj && typeof obj === 'object' ? obj : fallback
  } catch {
    return fallback
  }
}

// Tulis state (atomik: temp + rename). FAIL-OPEN: gagal simpan -> false, TAK PERNAH throw (hook pemakai
// tetap lanjut - state hilang paling buruk = pengingat muncul lagi, bukan hook crash).
export function writeState(namespace, sessionId, obj) {
  try {
    const p = statePath(namespace, sessionId)
    const tmp = p + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(obj || {}), 'utf8')
    fs.renameSync(tmp, p)
    return true
  } catch {
    return false
  }
}

// Dibuka lewat testStatePath (bukan diekspor publik) supaya tes bisa cek lokasi + bersih-bersih tanpa
// membongkar sanitasi ke pemanggil biasa.
export const _internal = { statePath }
