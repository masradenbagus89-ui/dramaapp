#!/usr/bin/env node
// engine/hook-installer.mjs - Pabrik pemasang-hook bersama untuk keluarga engine/ensure-*-hook.mjs.
//
// KENAPA ADA: modul-modul ensure-*-hook (risk/rak/plan-mode) dulu menyalin skeleton yang SAMA PERSIS
// (build/has/merge/ensure + CLI switch), beda cuma marker/matcher/command + teks pesan.
// Duplikasi struktural itu lolos no-duplicate-functions (nama fungsi beda
// per-gate) dan bikin satu perbaikan/audit di logika pemasang-hook KEAMANAN harus disalin berkali-kali (rawan drift).
// Modul ini menaruh CORE fail-safe + skeleton CLI di SATU tempat ter-audit; tiap gate cuma menyuplai DATA.
//
// SIFAT CORE (dipertahankan verbatim dari 6 modul lama, teruji tests/ensure-*-hook.test.mjs):
//  - IDEMPOTEN: hook sudah ada (command memuat marker) -> changed:false.
//  - DEFENSIF: pertahankan SEMUA hook/kunci lain; settings.json RUSAK/terkunci -> JANGAN tulis (lapor+lewati).
//  - TULIS ATOMIK: temp + rename (tak ada settings setengah-tertulis kalau proses mati).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readJsonFileSafely, writeJsonAtomic } from './json-merge-helpers.mjs'

// Buat pemasang hook untuk satu gate. marker = substring command (penanda idempoten); matcher+command =
// isi blok hook. Return { buildGroup, has, merge, ensure } - badan identik dengan 6 modul lama.
//
// event     : nama event Claude Code tempat hook didaftarkan. Default 'PreToolUse' (dipakai 3 gate
//             risk/rak/plan-mode) -> pemanggil lama TIDAK berubah sama sekali.
//             engine/lang-hook-wiring.mjs memakai 'UserPromptSubmit'.
// hookExtra : kunci TAMBAHAN untuk objek hook (mis. { timeout: 15 } milik hook bahasa). Di-spread
//             SESUDAH `command` supaya urutan kunci tetap type -> command -> extra; urutan ini PENTING
//             karena settings.json ditulis lewat JSON.stringify (urutan kunci = urutan byte berkas).
//             Default null -> spread objek kosong -> NOL kunci tambahan (bentuk lama byte-identik).
export function makeHookInstaller({ marker, matcher, command, event = 'PreToolUse', hookExtra = null }) {
  const buildGroup = () => ({ matcher, hooks: [{ type: 'command', command, ...(hookExtra || {}) }] })

  // Apakah settings sudah memuat hook gate ini? Cek SEMUA grup pada event-nya (toleran bentuk).
  const has = (settings) => {
    const pre = settings && settings.hooks && settings.hooks[event]
    if (!Array.isArray(pre)) return false
    for (const group of pre) {
      const hooks = group && group.hooks
      if (!Array.isArray(hooks)) continue
      for (const h of hooks) {
        if (h && typeof h.command === 'string' && h.command.includes(marker)) return true
      }
    }
    return false
  }

  // Gabung hook gate ke objek settings TANPA memutasi sumber. Return { settings, changed }. Idempoten.
  const merge = (settings) => {
    const base = (settings && typeof settings === 'object' && !Array.isArray(settings)) ? settings : {}
    if (has(base)) return { settings: base, changed: false }
    const next = { ...base }
    const hooks = { ...(base.hooks && typeof base.hooks === 'object' && !Array.isArray(base.hooks) ? base.hooks : {}) }
    const daftarGrup = Array.isArray(hooks[event]) ? hooks[event].slice() : []
    daftarGrup.push(buildGroup())
    hooks[event] = daftarGrup
    next.hooks = hooks
    return { settings: next, changed: true }
  }

  // Pasang hook ke .claude/settings.json project. Return { changed, reason }. FAIL-SAFE.
  const ensure = (projectRoot, { dryRun = false } = {}) => {
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
    const { settings, changed } = merge(existing || {})
    if (!changed) return { changed: false, reason: 'sudah-ada' }
    if (dryRun) return { changed: true, reason: 'simulasi' }
    if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true })
    writeJsonAtomic(settingsPath, settings)
    return { changed: true, reason: fileExists ? 'digabung' : 'dibuat' }
  }

  return { buildGroup, has, merge, ensure }
}

// === Migrasi path folder kit di dalam command hook ===============================================
//
// KENAPA ADA: hook lintasAI disimpan di .claude/settings.json milik KLIEN sebagai TEKS perintah
// (mis. `node .lintasai/engine/risk-gate.js`). Waktu folder kit diganti nama, teks itu TIDAK ikut
// berubah sendiri -> keempat pengaman (Palang Rem, Palang Rak, Lampu Hijau, pengingat bahasa)
// menunjuk berkas yang tak ada lagi. Claude Code menjalankannya, gagal, lalu DIAM. Klien mengira
// pengamannya masih nyala padahal tidak - kelas bug paling berbahaya di kit ini.
//
// SIFAT (cermin `ensure` di atas, sengaja sama):
//  - IDEMPOTEN     : tak ada command yang memuat nama lama -> changed:false, berkas tak disentuh.
//  - DEFENSIF      : HANYA menyentuh properti `command` yang memuat `<namaLama>/`. Hook milik klien,
//                    kunci lain, urutan, dan seluruh isi settings.json lainnya DIPERTAHANKAN.
//  - GAGAL-AMAN    : settings.json rusak/terkunci -> JANGAN tulis, lapor lalu lewati.
//  - TULIS ATOMIK  : lewat writeJsonAtomic (temp + rename).
//
// Sengaja TIDAK memakai regex sapu-jagat pada seluruh teks berkas: itu bisa mengubah string milik
// klien yang kebetulan menyebut nama folder. Kita hanya menulis ulang field `command`.

// Ganti prefix folder kit pada SATU string command. Return string baru (atau string asal kalau tak cocok).
// Cocokkan `<namaLama>/` sebagai penggal path — bukan substring bebas — supaya
// `.lintasai-punyaku/` tidak ikut tertukar.
export function gantiPrefixKitDiCommand(command, namaLama, namaBaru) {
  if (typeof command !== 'string' || !namaLama || namaLama === namaBaru) return command
  // Batas kiri: awal string / spasi / kutip / '/' / '\' / '$VAR}' — semua pembatas path yang nyata
  // muncul di command hook kita (termasuk "$CLAUDE_PROJECT_DIR/.lintasai/...").
  const esc = namaLama.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return command.replace(new RegExp(`(^|[\\s"'\`/\\\\])${esc}(?=[/\\\\])`, 'g'), `$1${namaBaru}`)
}

// Tulis ulang SEMUA command hook di objek settings. Murni (tak memutasi input).
// Return { settings, changed, jumlah } — jumlah = banyaknya command yang berubah.
export function gantiPrefixKitDiSettings(settings, namaLama, namaBaru) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings) || namaLama === namaBaru) {
    return { settings, changed: false, jumlah: 0 }
  }
  const hooks = settings.hooks
  if (!hooks || typeof hooks !== 'object' || Array.isArray(hooks)) {
    return { settings, changed: false, jumlah: 0 }
  }
  let jumlah = 0
  const hooksBaru = {}
  for (const [event, daftarGrup] of Object.entries(hooks)) {
    if (!Array.isArray(daftarGrup)) { hooksBaru[event] = daftarGrup; continue }
    hooksBaru[event] = daftarGrup.map((grup) => {
      if (!grup || typeof grup !== 'object' || !Array.isArray(grup.hooks)) return grup
      return {
        ...grup,
        hooks: grup.hooks.map((h) => {
          if (!h || typeof h !== 'object' || typeof h.command !== 'string') return h
          const baru = gantiPrefixKitDiCommand(h.command, namaLama, namaBaru)
          if (baru === h.command) return h
          jumlah++
          return { ...h, command: baru } // urutan kunci dipertahankan (spread lalu timpa `command`)
        }),
      }
    })
  }
  if (jumlah === 0) return { settings, changed: false, jumlah: 0 }
  return { settings: { ...settings, hooks: hooksBaru }, changed: true, jumlah }
}

// Terapkan penggantian ke .claude/settings.json sebuah project. FAIL-SAFE (tak pernah melempar).
// Return { changed, jumlah, reason }.
export function migrasiPathHookDiSettings({ projectRoot, namaLama, namaBaru, dryRun = false }) {
  const settingsPath = path.join(projectRoot, '.claude', 'settings.json')
  if (!fs.existsSync(settingsPath)) return { changed: false, jumlah: 0, reason: 'tak-ada-settings' }
  let existing = null
  try {
    existing = readJsonFileSafely(settingsPath, { suppressMalformedError: true, suppressLockError: true })
  } catch {
    return { changed: false, jumlah: 0, reason: 'baca-gagal' }
  }
  // null padahal berkas ADA = rusak/terkunci -> jangan tulis (jangan timpa pengaturan klien).
  if (existing === null) return { changed: false, jumlah: 0, reason: 'settings-rusak-atau-terkunci' }

  const { settings, changed, jumlah } = gantiPrefixKitDiSettings(existing, namaLama, namaBaru)
  if (!changed) return { changed: false, jumlah: 0, reason: 'sudah-terbaru' }
  if (dryRun) return { changed: true, jumlah, reason: 'simulasi' }
  try {
    writeJsonAtomic(settingsPath, settings)
  } catch (e) {
    return { changed: false, jumlah, reason: `tulis-gagal: ${e.message}` }
  }
  return { changed: true, jumlah, reason: 'diperbarui' }
}

// CLI generik untuk `node engine/ensure-<name>-hook.mjs [--project-root <dir>] [--dry-run]`.
// Dipanggil di top-level tiap modul: runHookCli(import.meta.url, {...}). Cuma jalan kalau modul itu
// DIEKSEKUSI langsung (bukan di-import). Pesan di-template dari friendlyName + successLines (blok teks
// case dibuat/digabung, verbatim per-gate).
export function runHookCli(moduleUrl, { ensure, friendlyName, successLines = [] } = {}) {
  const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(moduleUrl)
  if (!isMain) return

  let projectRoot = process.cwd()
  let dryRun = false
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project-root') projectRoot = argv[++i] || projectRoot
    else if (argv[i] === '--dry-run' || argv[i] === '--simulasi') dryRun = true
  }

  const res = ensure(projectRoot, { dryRun })

  switch (res.reason) {
    case 'sudah-ada':
      console.log(`OK - ${friendlyName} SUDAH nyala di .claude/settings.json (tak ada perubahan).`)
      break
    case 'simulasi':
      console.log(`SIMULASI - ${friendlyName} AKAN dinyalakan (belum menulis apa pun). Jalankan tanpa --dry-run untuk benar-benar pasang.`)
      break
    case 'dibuat':
    case 'digabung':
      console.log(`OK - ${friendlyName} DINYALAKAN di .claude/settings.json (pengaturan lain tetap utuh).`)
      for (const line of successLines) console.log(line)
      break
    case 'settings-rusak-atau-terkunci':
      console.error('[LEWATI] .claude/settings.json ada tapi rusak/terkunci - TIDAK diubah (jaga pengaturanmu).')
      console.error('  Tutup editor (mis. VS Code) yang mengunci berkas, atau perbaiki JSON-nya, lalu ulang.')
      // return, BUKAN break: process.exitCode tak menghentikan alur seperti process.exit, jadi `break`
      // akan jatuh ke baris exitCode = 0 di bawah dan menimpa kode gagal ini jadi sukses palsu.
      process.exitCode = 1
      return
    default:
      console.error(`[GAGAL] Tidak bisa menyalakan ${friendlyName} (alasan: ${res.reason}).`)
      process.exitCode = 1
      return
  }
  // process.exitCode (BUKAN process.exit) supaya stdout selesai di-flush saat dipipa — successLines di
  // atas adalah langkah yang WAJIB client baca, dan pemasang memanggil perintah ini lewat spawn.
  process.exitCode = 0
}
