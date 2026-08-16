#!/usr/bin/env node
// engine/lang-hook-wiring.mjs - Pasang hook "pengingat Bahasa Indonesia" ke .claude/settings.json KLIEN.
//
// KENAPA ADA: engine/lang-reminder.mjs (pengingat bahasa) ikut tersalin ke project klien (.lintasai/engine/),
// TAPI sebuah hook hanya AKTIF kalau terdaftar di .claude/settings.json. Tanpa wiring ini, berkas
// pengingat ADA di klien tapi TAK PERNAH TERPANGGIL -> fitur "rem-mesin bahasa" cuma nyala di repo kit,
// tak sampai ke klien. Modul ini menggabungkan hook itu ke settings.json klien saat init/update.
//
// SIFAT (sengaja):
//  - IDEMPOTEN: kalau hook lang-reminder sudah ada -> tak menambah lagi (changed:false).
//  - DEFENSIF (jangan rusak settings klien): pertahankan SEMUA hook/kunci lain; kalau settings.json
//    klien RUSAK/terkunci -> JANGAN tulis (lapor + lewati; pemasangan tetap sukses) - cegah hapus
//    kunci kustom mereka (permissions.deny / env / apiKeyHelper).
//  - NON-MEMAKSA: hook lang-reminder selalu exit 0 (tak pernah blokir) -> aman dinyalakan otomatis
//    (risk-gate juga default NYALA sejak v1.61.0 walau ia MEMAKSA konfirmasi - lihat engine/ensure-risk-gate-hook.mjs).
//  - TULIS ATOMIK: temp + rename, supaya tak ada settings.json setengah-tertulis kalau proses mati.
//
// Dijalankan dari setup-pola-b.mjs (init) -> otomatis ikut saat UPDATE juga (update-kit menjalankan
// ulang setup-pola-b --force). Satu titik wiring = cakupan install + update.
// Mekanik pemasang (idempoten + fail-safe + tulis-atomik) = engine/hook-installer.mjs, dipakai bersama
// 3 gate lain. Modul ini dulu menyalin skeleton itu (build/has/merge/ensure) — `ensureLangHook` bahkan
// BYTE-IDENTIK dengan `ensure` di sana. Duplikasi itu lolos tests/no-duplicate-functions.test.mjs karena
// nama fungsinya beda per-gate. Disatukan 2026-07-26: yang tersisa di sini cuma DATA + nama lama.
import { makeHookInstaller } from './hook-installer.mjs'
import { NAMA_FOLDER_KIT } from './project-root.mjs'

// Command yang dijalankan klien. Berkas kit terpasang di <folder-kit>/ -> tunjuk ke sana. $CLAUDE_PROJECT_DIR
// di-expand Claude Code (robust, tak bergantung folder-kerja). Penanda idempoten = substring 'lang-reminder.mjs'.
export const LANG_HOOK_COMMAND = `node "$CLAUDE_PROJECT_DIR/${NAMA_FOLDER_KIT}/engine/lang-reminder.mjs"`
const LANG_HOOK_MARKER = 'lang-reminder.mjs'

// BEDA dari 3 gate lain (yang semuanya PreToolUse dengan objek hook polos), ada dua:
//   event     : 'UserPromptSubmit' — pengingat bahasa ditempelkan ke tiap PROMPT, bukan ke tiap tool-call.
//   hookExtra : { timeout: 15 } — batas waktu khusus hook ini; di-spread SESUDAH `command` sehingga
//               urutan kunci tetap type -> command -> timeout, persis seperti sebelum disatukan.
const lang = makeHookInstaller({
  marker: LANG_HOOK_MARKER,
  matcher: '',
  command: LANG_HOOK_COMMAND,
  event: 'UserPromptSubmit',
  hookExtra: { timeout: 15 },
})

// Nama lama DIPERTAHANKAN (fasad): dipakai setup-hooks.mjs + tests/lang-hook-wiring.test.mjs.
export const buildLangHookGroup = lang.buildGroup
export const hasLangHook = lang.has
export const mergeLangHook = lang.merge
export const ensureLangHook = lang.ensure
