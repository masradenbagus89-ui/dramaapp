#!/usr/bin/env node
// engine/ensure-fact-gate-hook.mjs - Nyalakan "Palang Fakta" (engine/fact-gate.mjs) dengan 1 perintah.
//
// KENAPA ADA: `engine/fact-gate.mjs` ikut tersalin ke SETIAP klien (engine/kit-files.json) dan sudah teruji,
// TAPI hook hanya AKTIF kalau terdaftar di .claude/settings.json. Sampai 2026-07-18 tak ada satu pun
// cara menyalakannya: nol perintah CLI, nol dipasang installer, nol disebut di berkas aturan - jadi
// robotnya dikirim ke tiap klien dalam keadaan mati total dan AI pun tak tahu ia ada. ADR-014 sendiri
// mencatat "enable-command = backlog"; modul ini MENGEKSEKUSI backlog itu, bukan keputusan arah baru.
//
// TETAP DEFAULT MATI (opt-in) - BEDA dari risk-gate yang default nyala. Alasan tak berubah dari ADR-014:
// Palang Fakta menambah FRIKSI di jalur kerja AI (memblokir edit-pertama berkas berdampak-tinggi sampai
// AI menyajikan 4 fakta), jadi OWNER yang memutuskan menyalakan. Menyalakannya otomatis untuk semua
// klien = mengubah perilaku di project orang tanpa diminta.
//
// SIFAT (cermin engine/ensure-risk-gate-hook.mjs - pola pemasang-hook yang sudah teruji, JANGAN tulis ulang):
//  - IDEMPOTEN: hook fact-gate sudah ada -> tak menambah lagi (changed:false).
//  - DEFENSIF: pertahankan SEMUA hook/kunci lain; settings.json RUSAK/terkunci -> JANGAN tulis.
//  - TULIS ATOMIK: temp + rename (tak ada settings setengah-tertulis kalau proses mati).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readJsonFileSafely, writeJsonAtomic } from './json-merge-helpers.mjs'

// Matcher = alat yang MENGUBAH berkas (fact-gate cuma peduli edit/tulis, bukan Bash).
// Sengaja TANPA `Bash`: beda dari risk-gate yang memang menjaga perintah berbahaya.
export const FACT_GATE_MATCHER = 'Edit|Write|MultiEdit'
export const FACT_GATE_HOOK_COMMAND = 'node .claude-kit/engine/fact-gate.mjs'
const FACT_GATE_MARKER = 'fact-gate.mjs' // penanda idempoten = substring command

export function buildFactGateHookGroup() {
  return { matcher: FACT_GATE_MATCHER, hooks: [{ type: 'command', command: FACT_GATE_HOOK_COMMAND }] }
}

// Apakah settings sudah memuat hook fact-gate? Cek SEMUA grup PreToolUse (toleran bentuk).
export function hasFactGateHook(settings) {
  const pre = settings && settings.hooks && settings.hooks.PreToolUse
  if (!Array.isArray(pre)) return false
  for (const group of pre) {
    const hooks = group && group.hooks
    if (!Array.isArray(hooks)) continue
    for (const h of hooks) {
      if (h && typeof h.command === 'string' && h.command.includes(FACT_GATE_MARKER)) return true
    }
  }
  return false
}

// Gabung hook fact-gate ke objek settings TANPA memutasi sumber. Return { settings, changed }.
// Pertahankan SEMUA hook/kunci lain (termasuk risk-gate yang biasanya sudah ada di PreToolUse).
export function mergeFactGateHook(settings) {
  const base = (settings && typeof settings === 'object' && !Array.isArray(settings)) ? settings : {}
  if (hasFactGateHook(base)) return { settings: base, changed: false }
  const next = { ...base }
  const hooks = { ...(base.hooks && typeof base.hooks === 'object' && !Array.isArray(base.hooks) ? base.hooks : {}) }
  const pre = Array.isArray(hooks.PreToolUse) ? hooks.PreToolUse.slice() : []
  pre.push(buildFactGateHookGroup())
  hooks.PreToolUse = pre
  next.hooks = hooks
  return { settings: next, changed: true }
}

// Pasang hook fact-gate ke .claude/settings.json project. Return { changed, reason }. FAIL-SAFE.
export function ensureFactGateHook(projectRoot, { dryRun = false } = {}) {
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
  const { settings, changed } = mergeFactGateHook(existing || {})
  if (!changed) return { changed: false, reason: 'sudah-ada' }
  if (dryRun) return { changed: true, reason: 'simulasi' }
  if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true })
  writeJsonAtomic(settingsPath, settings)
  return { changed: true, reason: fileExists ? 'digabung' : 'dibuat' }
}

// --- CLI: `node engine/ensure-fact-gate-hook.mjs [--project-root <dir>] [--dry-run]` ---
function main() {
  let projectRoot = process.cwd()
  let dryRun = false
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project-root') projectRoot = argv[++i] || projectRoot
    else if (argv[i] === '--dry-run' || argv[i] === '--simulasi') dryRun = true
  }

  const res = ensureFactGateHook(projectRoot, { dryRun })
  switch (res.reason) {
    case 'sudah-ada':
      console.log('OK - Palang Fakta SUDAH nyala di .claude/settings.json (tak ada perubahan).')
      break
    case 'simulasi':
      console.log('SIMULASI - Palang Fakta AKAN dinyalakan (belum menulis apa pun). Jalankan tanpa --dry-run untuk benar-benar pasang.')
      break
    case 'dibuat':
    case 'digabung':
      console.log('OK - Palang Fakta DINYALAKAN di .claude/settings.json (pengaturan lain tetap utuh).')
      console.log('Apa efeknya: sebelum AI mengubah berkas PENTING (login, database, migrasi, API, pembayaran)')
      console.log('  untuk pertama kali dalam satu sesi, ia ditahan dulu dan wajib menyebutkan 4 hal:')
      console.log('  siapa yang memakai berkas itu, fungsi apa yang terdampak, bentuk datanya, dan instruksi aslimu.')
      console.log('  Tujuannya: AI tak menebak dampak perubahan. Konsekuensinya: langkah pertama jadi sedikit lebih lambat.')
      console.log('LANGKAH WAJIB: buka chat BARU (hook dimuat saat sesi mulai) lalu uji-jalan.')
      console.log('Matikan kapan saja: hapus blok PreToolUse fact-gate dari .claude/settings.json.')
      break
    case 'settings-rusak-atau-terkunci':
      console.error('[LEWATI] .claude/settings.json ada tapi rusak/terkunci - TIDAK diubah (jaga pengaturanmu).')
      console.error('  Tutup editor (mis. VS Code) yang mengunci berkas, atau perbaiki JSON-nya, lalu ulang.')
      process.exit(1)
      break
    default:
      console.error(`[GAGAL] Tidak bisa menyalakan Palang Fakta (alasan: ${res.reason}).`)
      process.exit(1)
  }
  process.exit(0)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
