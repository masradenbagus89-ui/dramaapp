#!/usr/bin/env node
// engine/ensure-big-file-read-guard-hook.mjs - Nyalakan "Penjaga Baca Besar" (engine/big-file-read-guard.mjs) 1 perintah.
//
// KENAPA ADA: hook hanya AKTIF kalau terdaftar di .claude/settings.json. Tanpa modul ini,
// engine/big-file-read-guard.mjs dikirim ke client dalam keadaan mati total (persis nasib fact-gate sebelum
// 2026-07-18) dan tak ada satu pun cara menyalakannya.
//
// DEFAULT MATI (opt-in) = keputusan owner (Tugas 8, sesi 2026-07-20). Sama seperti Palang Fakta: penjaga
// ini menambah friksi (menahan sebagian `Read`), jadi OWNER yang memutuskan menyalakan. TIDAK dipasang
// otomatis di engine/setup-hooks.mjs - dinyalakan manual `npx lintasai enable-big-file-read-guard`.
//
// MATCHER = 'Read' saja (beda dari rak-gate 'Read|Edit|Write|MultiEdit'): penjaga ini cuma peduli baca-utuh.
//
// SIFAT (cermin engine/ensure-rak-gate-hook.mjs - pola pemasang-hook teruji, JANGAN tulis ulang):
//  - IDEMPOTEN: hook sudah ada -> tak menambah lagi (changed:false).
//  - DEFENSIF: pertahankan SEMUA hook/kunci lain; settings.json RUSAK/terkunci -> JANGAN tulis.
//  - TULIS ATOMIK: temp + rename (tak ada settings setengah-tertulis kalau proses mati).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readJsonFileSafely, writeJsonAtomic } from './json-merge-helpers.mjs'
import { ensureKimiHooks, KIMI_BIG_FILE_GUARD_HOOK } from './kimi/ensure-kimi-hooks.mjs'

export const BIG_FILE_GUARD_MATCHER = 'Read'
export const BIG_FILE_GUARD_HOOK_COMMAND = 'node .claude-kit/engine/big-file-read-guard.mjs'
const BIG_FILE_GUARD_MARKER = 'big-file-read-guard.mjs' // penanda idempoten = substring command

export function buildBigFileGuardHookGroup() {
  return { matcher: BIG_FILE_GUARD_MATCHER, hooks: [{ type: 'command', command: BIG_FILE_GUARD_HOOK_COMMAND }] }
}

// Apakah settings sudah memuat hook penjaga-baca-besar? Cek SEMUA grup PreToolUse (toleran bentuk).
export function hasBigFileGuardHook(settings) {
  const pre = settings && settings.hooks && settings.hooks.PreToolUse
  if (!Array.isArray(pre)) return false
  for (const group of pre) {
    const hooks = group && group.hooks
    if (!Array.isArray(hooks)) continue
    for (const h of hooks) {
      if (h && typeof h.command === 'string' && h.command.includes(BIG_FILE_GUARD_MARKER)) return true
    }
  }
  return false
}

// Gabung hook TANPA memutasi sumber. Return { settings, changed }.
export function mergeBigFileGuardHook(settings) {
  const base = (settings && typeof settings === 'object' && !Array.isArray(settings)) ? settings : {}
  if (hasBigFileGuardHook(base)) return { settings: base, changed: false }
  const next = { ...base }
  const hooks = { ...(base.hooks && typeof base.hooks === 'object' && !Array.isArray(base.hooks) ? base.hooks : {}) }
  const pre = Array.isArray(hooks.PreToolUse) ? hooks.PreToolUse.slice() : []
  pre.push(buildBigFileGuardHookGroup())
  hooks.PreToolUse = pre
  next.hooks = hooks
  return { settings: next, changed: true }
}

// Pasang ke .claude/settings.json project. Return { changed, reason }. FAIL-SAFE.
export function ensureBigFileGuardHook(projectRoot, { dryRun = false } = {}) {
  const settingsDir = path.join(projectRoot, '.claude')
  const settingsPath = path.join(settingsDir, 'settings.json')
  const fileExists = fs.existsSync(settingsPath)
  let existing = null
  try {
    existing = readJsonFileSafely(settingsPath, { suppressMalformedError: true, suppressLockError: true })
  } catch {
    return { changed: false, reason: 'baca-gagal' }
  }
  if (existing === null && fileExists) {
    return { changed: false, reason: 'settings-rusak-atau-terkunci' }
  }
  const { settings, changed } = mergeBigFileGuardHook(existing || {})
  if (!changed) return { changed: false, reason: 'sudah-ada' }
  if (dryRun) return { changed: true, reason: 'simulasi' }
  if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true })
  writeJsonAtomic(settingsPath, settings)
  return { changed: true, reason: fileExists ? 'digabung' : 'dibuat' }
}

// Nyalakan Penjaga Baca Besar untuk Kimi Code JUGA - tapi HANYA kalau project ini memakai Kimi
// (folder .kimi-code/ ada). Paritas ADR-018 #11: otak asli = Claude ATAU Kimi. Project tanpa .kimi-code
// -> lewati senyap (bukan error): jangan bikin folder untuk alat yang tak dipakai.
export function ensureBigFileGuardKimi(projectRoot, { dryRun = false } = {}) {
  if (!fs.existsSync(path.join(projectRoot, '.kimi-code'))) return { changed: false, reason: 'kimi-tak-dipakai' }
  try {
    return ensureKimiHooks(projectRoot, { dryRun, hooks: [KIMI_BIG_FILE_GUARD_HOOK] })
  } catch {
    return { changed: false, reason: 'kimi-gagal' } // sisi Claude tetap sah; jangan gagalkan seluruh perintah
  }
}

// --- CLI: `node engine/ensure-big-file-read-guard-hook.mjs [--project-root <dir>] [--dry-run]` ---
function main() {
  let projectRoot = process.cwd()
  let dryRun = false
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project-root') projectRoot = argv[++i] || projectRoot
    else if (argv[i] === '--dry-run' || argv[i] === '--simulasi') dryRun = true
  }

  const res = ensureBigFileGuardHook(projectRoot, { dryRun })
  const kimi = ensureBigFileGuardKimi(projectRoot, { dryRun })
  // Simulasi WAJIB menyebut sisi Kimi juga - menyembunyikan sebagian dampak = owner memutuskan dari gambaran tak lengkap.
  const laporKimi = () => {
    if (kimi.reason === 'kimi-tak-dipakai') return
    if (kimi.reason === 'simulasi') console.log('KIMI CODE: Penjaga Baca Besar juga AKAN dinyalakan di .kimi-code/config.toml.')
    else if (kimi.changed) console.log('KIMI CODE: Penjaga Baca Besar juga dinyalakan di .kimi-code/config.toml.')
    else if (kimi.reason === 'sudah-ada') console.log('KIMI CODE: Penjaga Baca Besar sudah nyala di .kimi-code/config.toml.')
    else console.error('[CATATAN] Sisi Kimi TIDAK dinyalakan (alasan: ' + kimi.reason + '). Sisi Claude Code tetap aktif.')
  }
  switch (res.reason) {
    case 'sudah-ada':
      console.log('OK - Penjaga Baca Besar SUDAH nyala di .claude/settings.json (tak ada perubahan).')
      laporKimi()
      break
    case 'simulasi':
      console.log('SIMULASI - Penjaga Baca Besar AKAN dinyalakan (belum menulis apa pun). Jalankan tanpa --dry-run untuk benar-benar pasang.')
      laporKimi()
      break
    case 'dibuat':
    case 'digabung':
      console.log('OK - Penjaga Baca Besar DINYALAKAN di .claude/settings.json (pengaturan lain tetap utuh).')
      console.log('Apa efeknya: kalau AI mau baca-UTUH berkas >50 KB (tanpa offset) yang BUKAN kode/aturan-inti,')
      console.log('  ia ditahan-lunak sekali + diarahkan pakai Grep atau offset (baca sebagian) supaya hemat token.')
      console.log('  Kalau ia MEMANG butuh seluruh isi, cukup ulangi - permintaan kedua diloloskan (tak mengunci).')
      console.log('  Ini pagar HEMAT TOKEN, bukan keamanan: Bash cat/Grep tak ditahan.')
      console.log('LANGKAH WAJIB: buka chat BARU (hook dimuat saat sesi mulai) lalu uji-jalan.')
      console.log('Matikan kapan saja: hapus blok PreToolUse big-file-read-guard dari .claude/settings.json.')
      laporKimi()
      break
    case 'settings-rusak-atau-terkunci':
      console.error('[LEWATI] .claude/settings.json ada tapi rusak/terkunci - TIDAK diubah (jaga pengaturanmu).')
      console.error('  Tutup editor (mis. VS Code) yang mengunci berkas, atau perbaiki JSON-nya, lalu ulang.')
      process.exit(1)
      break
    default:
      console.error(`[GAGAL] Tidak bisa menyalakan Penjaga Baca Besar (alasan: ${res.reason}).`)
      process.exit(1)
  }
  process.exit(0)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
