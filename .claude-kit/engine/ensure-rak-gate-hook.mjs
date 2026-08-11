#!/usr/bin/env node
// engine/ensure-rak-gate-hook.mjs - Nyalakan "Palang Rak" (engine/rak-gate.mjs) dengan 1 perintah.
//
// KENAPA ADA: pola yang sama seperti engine/ensure-fact-gate-hook.mjs - robot hanya AKTIF kalau terdaftar
// di .claude/settings.json. Tanpa modul ini, engine/rak-gate.mjs akan dikirim ke tiap klien dalam keadaan
// mati total (persis nasib fact-gate sebelum 2026-07-18), dan engine/tool-reach-check.mjs akan MERAH
// ("perkakas terkirim tanpa gagang") - benar, karena kemampuan yang tak bisa dipanggil = ruang terbayar
// yang tak pernah dipakai.
//
// BEDA MATCHER dari fact-gate: WAJIB menyertakan `Read`. Palang Rak bekerja atas BUKTI tanda-terima
// bacaan - tanpa `Read` di matcher, hook tak pernah melihat pembacaan rak terjadi, sehingga satu-satunya
// keluaran yang mungkin adalah "blokir selamanya". `Read` di sini murni PEREKAM (selalu exit 0), bukan
// penyaring: tak ada satu pun jalur di rak-gate.mjs yang memblokir `Read`.
//
// SIFAT (cermin engine/ensure-fact-gate-hook.mjs - pola pemasang-hook yang sudah teruji, JANGAN tulis ulang):
//  - IDEMPOTEN: hook rak-gate sudah ada -> tak menambah lagi (changed:false).
//  - DEFENSIF: pertahankan SEMUA hook/kunci lain; settings.json RUSAK/terkunci -> JANGAN tulis.
//  - TULIS ATOMIK: temp + rename (tak ada settings setengah-tertulis kalau proses mati).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readJsonFileSafely, writeJsonAtomic } from './json-merge-helpers.mjs'
import { ensureKimiHooks, KIMI_RAK_GATE_HOOK } from './kimi/ensure-kimi-hooks.mjs'

export const RAK_GATE_MATCHER = 'Read|Edit|Write|MultiEdit'
export const RAK_GATE_HOOK_COMMAND = 'node .claude-kit/engine/rak-gate.mjs'
const RAK_GATE_MARKER = 'rak-gate.mjs' // penanda idempoten = substring command

export function buildRakGateHookGroup() {
  return { matcher: RAK_GATE_MATCHER, hooks: [{ type: 'command', command: RAK_GATE_HOOK_COMMAND }] }
}

// Apakah settings sudah memuat hook rak-gate? Cek SEMUA grup PreToolUse (toleran bentuk).
export function hasRakGateHook(settings) {
  const pre = settings && settings.hooks && settings.hooks.PreToolUse
  if (!Array.isArray(pre)) return false
  for (const group of pre) {
    const hooks = group && group.hooks
    if (!Array.isArray(hooks)) continue
    for (const h of hooks) {
      if (h && typeof h.command === 'string' && h.command.includes(RAK_GATE_MARKER)) return true
    }
  }
  return false
}

// Gabung hook rak-gate TANPA memutasi sumber. Return { settings, changed }.
export function mergeRakGateHook(settings) {
  const base = (settings && typeof settings === 'object' && !Array.isArray(settings)) ? settings : {}
  if (hasRakGateHook(base)) return { settings: base, changed: false }
  const next = { ...base }
  const hooks = { ...(base.hooks && typeof base.hooks === 'object' && !Array.isArray(base.hooks) ? base.hooks : {}) }
  const pre = Array.isArray(hooks.PreToolUse) ? hooks.PreToolUse.slice() : []
  pre.push(buildRakGateHookGroup())
  hooks.PreToolUse = pre
  next.hooks = hooks
  return { settings: next, changed: true }
}

// Pasang ke .claude/settings.json project. Return { changed, reason }. FAIL-SAFE.
export function ensureRakGateHook(projectRoot, { dryRun = false } = {}) {
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
  const { settings, changed } = mergeRakGateHook(existing || {})
  if (!changed) return { changed: false, reason: 'sudah-ada' }
  if (dryRun) return { changed: true, reason: 'simulasi' }
  if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true })
  writeJsonAtomic(settingsPath, settings)
  return { changed: true, reason: fileExists ? 'digabung' : 'dibuat' }
}

// Nyalakan Palang Rak untuk Kimi Code JUGA - tapi HANYA kalau project ini memang memakai Kimi
// (folder .kimi-code/ ada). Alasan paritas ADR-018 #11: otak asli = Claude ATAU Kimi; kalau perintah
// ini cuma menyentuh Claude, pemakai Kimi menyala setengah dan mengira dirinya terjaga.
// Project tanpa .kimi-code -> lewati senyap (bukan error): jangan bikin folder untuk alat yang tak dipakai.
export function ensureRakGateKimi(projectRoot, { dryRun = false } = {}) {
  if (!fs.existsSync(path.join(projectRoot, '.kimi-code'))) return { changed: false, reason: 'kimi-tak-dipakai' }
  try {
    return ensureKimiHooks(projectRoot, { dryRun, hooks: [KIMI_RAK_GATE_HOOK] })
  } catch {
    return { changed: false, reason: 'kimi-gagal' } // sisi Claude tetap sah; jangan gagalkan seluruh perintah
  }
}

// --- CLI: `node engine/ensure-rak-gate-hook.mjs [--project-root <dir>] [--dry-run]` ---
function main() {
  let projectRoot = process.cwd()
  let dryRun = false
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project-root') projectRoot = argv[++i] || projectRoot
    else if (argv[i] === '--dry-run' || argv[i] === '--simulasi') dryRun = true
  }

  const res = ensureRakGateHook(projectRoot, { dryRun })
  const kimi = ensureRakGateKimi(projectRoot, { dryRun })
  // Simulasi WAJIB menyebut sisi Kimi juga - simulasi yang menyembunyikan sebagian dampaknya
  // membuat owner memutuskan dari gambaran yang tak lengkap.
  const laporKimi = () => {
    if (kimi.reason === 'kimi-tak-dipakai') return
    if (kimi.reason === 'simulasi') console.log('KIMI CODE: Palang Rak juga AKAN dinyalakan di .kimi-code/config.toml.')
    else if (kimi.changed) console.log('KIMI CODE: Palang Rak juga dinyalakan di .kimi-code/config.toml.')
    else if (kimi.reason === 'sudah-ada') console.log('KIMI CODE: Palang Rak sudah nyala di .kimi-code/config.toml.')
    else console.error('[CATATAN] Sisi Kimi TIDAK dinyalakan (alasan: ' + kimi.reason + '). Sisi Claude Code tetap aktif.')
  }
  switch (res.reason) {
    case 'sudah-ada':
      console.log('OK - Palang Rak SUDAH nyala di .claude/settings.json (tak ada perubahan).')
      laporKimi() // .kimi-code bisa saja baru ditambahkan setelah sisi Claude dinyalakan
      break
    case 'simulasi':
      console.log('SIMULASI - Palang Rak AKAN dinyalakan (belum menulis apa pun). Jalankan tanpa --dry-run untuk benar-benar pasang.')
      laporKimi()
      break
    case 'dibuat':
    case 'digabung':
      console.log('OK - Palang Rak DINYALAKAN di .claude/settings.json (pengaturan lain tetap utuh).')
      console.log('Apa efeknya: sebelum AI mengubah berkas PENTING (login, pembayaran, migrasi, API, unggah, DevOps/infra)')
      console.log('  untuk pertama kali dalam satu sesi, ia ditahan sampai panduan terkait BENAR-BENAR dibuka.')
      console.log('  Yang diperiksa = catatan pembacaan nyata, BUKAN klaim AI - jadi tak bisa dilewati dengan kata-kata.')
      console.log('  Isi panduan TIDAK mengikat: kalau bentrok dengan kode nyata, kode yang menang (§4.17).')
      console.log('  Batas: maksimal 2x menahan per sesi, supaya tak jadi upacara.')
      console.log('LANGKAH WAJIB: buka chat BARU (hook dimuat saat sesi mulai) lalu uji-jalan.')
      console.log('Matikan kapan saja: hapus blok PreToolUse rak-gate dari .claude/settings.json.')
      laporKimi()
      break
    case 'settings-rusak-atau-terkunci':
      console.error('[LEWATI] .claude/settings.json ada tapi rusak/terkunci - TIDAK diubah (jaga pengaturanmu).')
      console.error('  Tutup editor (mis. VS Code) yang mengunci berkas, atau perbaiki JSON-nya, lalu ulang.')
      process.exit(1)
      break
    default:
      console.error(`[GAGAL] Tidak bisa menyalakan Palang Rak (alasan: ${res.reason}).`)
      process.exit(1)
  }
  process.exit(0)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
