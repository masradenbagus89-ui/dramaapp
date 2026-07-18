#!/usr/bin/env node
// lib/ensure-feedback-capture-hook.mjs - Nyalakan "pengingat rekam pelajaran" (lib/feedback-capture.mjs)
// dengan 1 langkah, deep-merge ke .claude/settings.json klien.
//
// KENAPA ADA: lib/feedback-capture.mjs (hook Stop yang mengingatkan AI menimbang §6.5 di akhir kerja) ikut
// tersalin ke klien (.claude-kit/lib/), TAPI sebuah hook hanya AKTIF kalau terdaftar di .claude/settings.json.
// Tanpa wiring ini, berkas hook ADA di klien tapi TAK PERNAH TERPANGGIL. Modul ini menggabungkan hook itu
// ke settings.json klien saat init/update (cermin lib/ensure-risk-gate-hook.mjs + lib/lang-hook-wiring.mjs).
//
// DEFAULT NYALA (keputusan owner 2026-07-17, lihat docs/decisions/ADR-008 addendum): setup-pola-b memanggil
// ensureFeedbackCaptureHook() otomatis tiap init/update. Alasan: hook ini FAIL-OPEN + NON-BLOKIR (cuma
// menyuntik pengingat, exit 0 selalu) - profil risiko sama dengan lang-reminder yang juga default NYALA.
// BEDA dari hook-penegak-checklist yang ADR-008 tunda (yang itu bisa MENAHAN "selesai"); yang ini cuma
// menepuk pundak. Mudah dimatikan: hapus blok Stop feedback-capture; pasang-ulang: npx lintasai enable-feedback-capture.
//
// SIFAT (cermin lib/lang-hook-wiring.mjs / lib/ensure-risk-gate-hook.mjs - pola pemasang-hook teruji):
//  - IDEMPOTEN: hook feedback-capture sudah ada -> tak menambah lagi (changed:false).
//  - DEFENSIF: pertahankan SEMUA hook/kunci lain; settings.json RUSAK/terkunci -> JANGAN tulis (lapor + lewati).
//  - TULIS ATOMIK: temp + rename (tak ada settings setengah-tertulis kalau proses mati).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readJsonFileSafely } from './json-merge-helpers.mjs'

// Bentuk hook = SSOT templates/hooks/feedback-capture.settings.example.json (matcher + command + timeout).
// Dikunci tes paritas (tests/ensure-feedback-capture-hook.test.mjs) supaya kalau contoh berubah, nilai di
// sini ikut diperbarui (anti-drift). $CLAUDE_PROJECT_DIR di-expand Claude Code (robust, tak bergantung
// folder-kerja) - cermin LANG_HOOK_COMMAND. timeout 10 dtk = pagar (hook menjalankan `git status`).
export const FEEDBACK_CAPTURE_MATCHER = ''
export const FEEDBACK_CAPTURE_HOOK_COMMAND = 'node "$CLAUDE_PROJECT_DIR/.claude-kit/lib/feedback-capture.mjs"'
export const FEEDBACK_CAPTURE_HOOK_TIMEOUT = 10
const FEEDBACK_CAPTURE_MARKER = 'feedback-capture.mjs' // penanda idempoten = substring command

export function buildFeedbackCaptureHookGroup() {
  return {
    matcher: FEEDBACK_CAPTURE_MATCHER,
    hooks: [{ type: 'command', command: FEEDBACK_CAPTURE_HOOK_COMMAND, timeout: FEEDBACK_CAPTURE_HOOK_TIMEOUT }],
  }
}

// Apakah settings sudah memuat hook feedback-capture? Cek SEMUA grup Stop (toleran bentuk).
export function hasFeedbackCaptureHook(settings) {
  const stop = settings && settings.hooks && settings.hooks.Stop
  if (!Array.isArray(stop)) return false
  for (const group of stop) {
    const hooks = group && group.hooks
    if (!Array.isArray(hooks)) continue
    for (const h of hooks) {
      if (h && typeof h.command === 'string' && h.command.includes(FEEDBACK_CAPTURE_MARKER)) return true
    }
  }
  return false
}

// Gabung hook feedback-capture ke objek settings TANPA memutasi sumber. Return { settings, changed }.
// Pertahankan SEMUA hook/kunci lain. Idempoten (sudah ada -> changed:false, objek asli dikembalikan).
export function mergeFeedbackCaptureHook(settings) {
  const base = (settings && typeof settings === 'object' && !Array.isArray(settings)) ? settings : {}
  if (hasFeedbackCaptureHook(base)) return { settings: base, changed: false }
  const next = { ...base }
  const hooks = { ...(base.hooks && typeof base.hooks === 'object' && !Array.isArray(base.hooks) ? base.hooks : {}) }
  const stop = Array.isArray(hooks.Stop) ? hooks.Stop.slice() : []
  stop.push(buildFeedbackCaptureHookGroup())
  hooks.Stop = stop
  next.hooks = hooks
  return { settings: next, changed: true }
}

function writeJsonAtomic(filePath, obj) {
  const tmp = `${filePath}.tmp-${process.pid}`
  fs.writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`, 'utf8')
  fs.renameSync(tmp, filePath)
}

// Pasang hook feedback-capture ke .claude/settings.json project. Return { changed, reason }. FAIL-SAFE.
export function ensureFeedbackCaptureHook(projectRoot, { dryRun = false } = {}) {
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
  const { settings, changed } = mergeFeedbackCaptureHook(existing || {})
  if (!changed) return { changed: false, reason: 'sudah-ada' }
  if (dryRun) return { changed: true, reason: 'simulasi' }
  if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true })
  writeJsonAtomic(settingsPath, settings)
  return { changed: true, reason: fileExists ? 'digabung' : 'dibuat' }
}

// --- CLI: `node lib/ensure-feedback-capture-hook.mjs [--project-root <dir>] [--dry-run]` ---
function main() {
  let projectRoot = process.cwd()
  let dryRun = false
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project-root') projectRoot = argv[++i] || projectRoot
    else if (argv[i] === '--dry-run' || argv[i] === '--simulasi') dryRun = true
  }

  const res = ensureFeedbackCaptureHook(projectRoot, { dryRun })
  switch (res.reason) {
    case 'sudah-ada':
      console.log('OK - Pengingat rekam pelajaran SUDAH nyala di .claude/settings.json (tak ada perubahan).')
      break
    case 'simulasi':
      console.log('SIMULASI - Pengingat rekam pelajaran AKAN dinyalakan (belum menulis apa pun). Jalankan tanpa --dry-run untuk benar-benar pasang.')
      break
    case 'dibuat':
    case 'digabung':
      console.log('OK - Pengingat rekam pelajaran DINYALAKAN di .claude/settings.json (pengaturan lain tetap utuh).')
      console.log('LANGKAH WAJIB: buka chat BARU (hook dimuat saat sesi mulai). Di akhir tugas yang menyentuh kode, AI diingatkan menimbang §6.5 - cuma pengingat, tak memaksa.')
      console.log('Matikan kapan saja: hapus blok Stop feedback-capture dari .claude/settings.json.')
      break
    case 'settings-rusak-atau-terkunci':
      console.error('[LEWATI] .claude/settings.json ada tapi rusak/terkunci - TIDAK diubah (jaga pengaturanmu).')
      console.error('  Tutup editor (mis. VS Code) yang mengunci berkas, atau perbaiki JSON-nya, lalu ulang.')
      process.exit(1)
      break
    default:
      console.error(`[GAGAL] Tidak bisa menyalakan pengingat rekam pelajaran (alasan: ${res.reason}).`)
      process.exit(1)
  }
  process.exit(0)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
