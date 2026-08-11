#!/usr/bin/env node
// engine/ensure-plan-mode-gate-hook.mjs - Nyalakan "Lampu Hijau Plan Mode" (engine/plan-mode-gate.js) 1 langkah.
//
// KENAPA ADA: engine/plan-mode-gate.js ikut tersalin ke klien (.claude-kit/engine/), TAPI hook hanya AKTIF
// kalau terdaftar di .claude/settings.json. Tanpa wiring ini, berkasnya ADA di klien tapi TAK PERNAH
// TERPANGGIL -> staff tetap dihujani dialog izin saat plan mode. Modul ini menggabungkannya DALAM 1 PERINTAH.
//
// DEFAULT NYALA (keputusan owner 2026-07-18, ADR-021): setup-pola-b memanggil ensurePlanModeGateHook()
// otomatis tiap init/update (cermin lang-hook + risk-gate). Alasan boleh default-nyala: yang diizinkan
// otomatis HANYA daftar-putih cuma-baca, dan penilaian bahaya tetap dipegang risk-gate (dipanggil lebih
// dulu di dalam plan-mode-gate). Jadi hook ini MENGURANGI gesekan TANPA mengurangi pagar - beda dari
// mode-OTONOMI (co-pilot/auto-confirm) yang TETAP default MATI (§4.12), dan beda jauh dari "bypass saat
// plan mode" yang DITOLAK sengaja (ADR-021).
//
// SIFAT (cermin engine/ensure-risk-gate-hook.mjs - pola pemasang-hook yang sudah teruji):
//  - IDEMPOTEN: hook sudah ada -> tak menambah lagi (changed:false).
//  - DEFENSIF: pertahankan SEMUA hook/kunci lain; settings.json RUSAK/terkunci -> JANGAN tulis
//    (lapor + lewati) supaya tak menghapus pengaturan kustom klien.
//  - TULIS ATOMIK: temp + rename (tak ada settings setengah-tertulis kalau proses mati).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readJsonFileSafely, writeJsonAtomic } from './json-merge-helpers.mjs'

// Bentuk hook = SSOT templates/hooks/plan-mode-gate.settings.example.json (matcher + command).
// Dikunci tes paritas (tests/ensure-plan-mode-gate-hook.test.mjs) supaya kalau contoh berubah, nilai di
// sini ikut diperbarui (anti-drift).
export const PLAN_MODE_GATE_MATCHER = 'Read|Grep|Glob|NotebookRead|TodoWrite|WebSearch|Bash'
export const PLAN_MODE_GATE_HOOK_COMMAND = 'node .claude-kit/engine/plan-mode-gate.js'
const PLAN_MODE_GATE_MARKER = 'plan-mode-gate.js' // penanda idempoten = substring command

export function buildPlanModeGateHookGroup() {
  return { matcher: PLAN_MODE_GATE_MATCHER, hooks: [{ type: 'command', command: PLAN_MODE_GATE_HOOK_COMMAND }] }
}

// Apakah settings sudah memuat hook plan-mode-gate? Cek SEMUA grup PreToolUse (toleran bentuk).
export function hasPlanModeGateHook(settings) {
  const pre = settings && settings.hooks && settings.hooks.PreToolUse
  if (!Array.isArray(pre)) return false
  for (const group of pre) {
    const hooks = group && group.hooks
    if (!Array.isArray(hooks)) continue
    for (const h of hooks) {
      if (h && typeof h.command === 'string' && h.command.includes(PLAN_MODE_GATE_MARKER)) return true
    }
  }
  return false
}

// Gabung hook ke objek settings TANPA memutasi sumber. Return { settings, changed }.
// Pertahankan SEMUA hook/kunci lain. Idempoten (sudah ada -> changed:false, objek asli dikembalikan).
export function mergePlanModeGateHook(settings) {
  const base = (settings && typeof settings === 'object' && !Array.isArray(settings)) ? settings : {}
  if (hasPlanModeGateHook(base)) return { settings: base, changed: false }
  const next = { ...base }
  const hooks = { ...(base.hooks && typeof base.hooks === 'object' && !Array.isArray(base.hooks) ? base.hooks : {}) }
  const pre = Array.isArray(hooks.PreToolUse) ? hooks.PreToolUse.slice() : []
  pre.push(buildPlanModeGateHookGroup())
  hooks.PreToolUse = pre
  next.hooks = hooks
  return { settings: next, changed: true }
}

// Pasang hook ke .claude/settings.json project. Return { changed, reason }. FAIL-SAFE.
export function ensurePlanModeGateHook(projectRoot, { dryRun = false } = {}) {
  const settingsDir = path.join(projectRoot, '.claude')
  const settingsPath = path.join(settingsDir, 'settings.json')
  const fileExists = fs.existsSync(settingsPath)
  let existing = null
  try {
    existing = readJsonFileSafely(settingsPath, { suppressMalformedError: true, suppressLockError: true })
  } catch {
    return { changed: false, reason: 'baca-gagal' }
  }
  // null + file ADA = rusak/terkunci -> JANGAN tulis (jangan timpa pengaturan kustom klien).
  if (existing === null && fileExists) {
    return { changed: false, reason: 'settings-rusak-atau-terkunci' }
  }
  const { settings, changed } = mergePlanModeGateHook(existing || {})
  if (!changed) return { changed: false, reason: 'sudah-ada' }
  if (dryRun) return { changed: true, reason: 'simulasi' }
  if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true })
  writeJsonAtomic(settingsPath, settings)
  return { changed: true, reason: fileExists ? 'digabung' : 'dibuat' }
}

// --- CLI: `node engine/ensure-plan-mode-gate-hook.mjs [--project-root <dir>] [--dry-run]` ---
function main() {
  let projectRoot = process.cwd()
  let dryRun = false
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project-root') projectRoot = argv[++i] || projectRoot
    else if (argv[i] === '--dry-run' || argv[i] === '--simulasi') dryRun = true
  }

  const res = ensurePlanModeGateHook(projectRoot, { dryRun })
  switch (res.reason) {
    case 'sudah-ada':
      console.log('OK - Lampu Hijau Plan Mode SUDAH nyala di .claude/settings.json (tak ada perubahan).')
      break
    case 'simulasi':
      console.log('SIMULASI - Lampu Hijau Plan Mode AKAN dinyalakan (belum menulis apa pun). Jalankan tanpa --dry-run untuk benar-benar pasang.')
      break
    case 'dibuat':
    case 'digabung':
      console.log('OK - Lampu Hijau Plan Mode DINYALAKAN di .claude/settings.json (pengaturan lain tetap utuh).')
      console.log('Efeknya: saat plan mode, aksi cuma-baca jalan tanpa dialog izin. Aksi berbahaya TETAP ditanya (Palang Rem tetap jalan).')
      console.log('LANGKAH WAJIB: buka chat BARU (hook dimuat saat sesi mulai) - lihat docs/plan-mode-gate.md.')
      console.log('Matikan kapan saja: hapus blok PreToolUse plan-mode-gate dari .claude/settings.json.')
      break
    case 'settings-rusak-atau-terkunci':
      console.error('[LEWATI] .claude/settings.json ada tapi rusak/terkunci - TIDAK diubah (jaga pengaturanmu).')
      console.error('  Tutup editor (mis. VS Code) yang mengunci berkas, atau perbaiki JSON-nya, lalu ulang.')
      process.exit(1)
      break
    default:
      console.error(`[GAGAL] Tidak bisa menyalakan Lampu Hijau Plan Mode (alasan: ${res.reason}).`)
      process.exit(1)
  }
  process.exit(0)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
