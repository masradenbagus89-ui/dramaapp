#!/usr/bin/env node
// lib/kimi/lang-reminder-kimi.mjs - Pengingat per-giliran versi Kimi Code (UserPromptSubmit hook).
//
// Memakai ulang buildReminder() dari lib/lang-reminder.mjs (SATU sumber teks pengingat - bahasa +
// 8 divisi + blok belajar + plan-mode). Kimi menyuntik konteks lewat STDOUT (verbatim docs resmi:
// teks yang dikembalikan UserPromptSubmit "is appended to context"). SELALU exit 0 (hook blockable;
// exit != 0 bisa membatalkan giliran - pantang untuk pengingat).
//
// permission_mode Kimi belum dipastikan dokumen -> kalau field tak ada, blok plan-mode cukup TAK
// tampil (degradasi anggun, sama seperti Claude saat field absen). FAIL-OPEN.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildReminder } from '../lang-reminder.mjs'
import { readStdinRaw, parseHookInput, emitContext, guardPipes } from './kimi-hook-io.mjs'

// PURE: rakit teks pengingat dari payload Kimi (deteksi mode plan defensif terhadap nama field).
export function buildKimiReminder(input) {
  const mode = input && (input.permission_mode || input.permissionMode || input.mode)
  return buildReminder({ permissionMode: mode })
}

function main() {
  const input = parseHookInput(readStdinRaw())
  emitContext(buildKimiReminder(input) + '\n')
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  guardPipes()
  main()
}
