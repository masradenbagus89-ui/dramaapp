#!/usr/bin/env node
// engine/kimi/lang-reminder-kimi.mjs - Pengingat per-giliran versi Kimi Code (UserPromptSubmit hook).
//
// Memakai ulang buildReminder() dari engine/lang-reminder.mjs (SATU sumber teks pengingat - bahasa +
// titik risiko + plan-mode). Kimi menyuntik konteks lewat STDOUT (verbatim docs resmi:
// teks yang dikembalikan UserPromptSubmit "is appended to context"). SELALU exit 0 (hook blockable;
// exit != 0 bisa membatalkan giliran - pantang untuk pengingat).
//
// permission_mode Kimi belum dipastikan dokumen -> kalau field tak ada, blok plan-mode cukup TAK
// tampil (degradasi anggun, sama seperti Claude saat field absen). FAIL-OPEN.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildReminder, muatPetunjukRak } from '../lang-reminder.mjs'
import { readStdinRaw, parseHookInput, emitContext, guardPipes } from './kimi-hook-io.mjs'

// PURE: rakit teks pengingat dari payload Kimi (deteksi mode plan defensif terhadap nama field).
// `petunjukRak` opsional supaya fungsi ini tetap murni-sinkron + gampang diuji tanpa disk.
export function buildKimiReminder(input, petunjukRak) {
  const mode = input && (input.permission_mode || input.permissionMode || input.mode)
  return buildReminder({ permissionMode: mode, petunjukRak })
}

// Blok-5 "Petunjuk Rak" ikut ke Kimi lewat jalur yang SAMA (satu sumber, tak ada salinan logika).
// Nama field prompt di Kimi belum dipastikan dokumen -> coba beberapa bentuk, absen = blok-5 sekadar
// tak tampil (degradasi anggun, seperti perlakuan permission_mode di atas). FAIL-OPEN penuh.
async function main() {
  const input = parseHookInput(readStdinRaw())
  let petunjuk = ''
  try {
    const prompt = input && (input.prompt || input.user_prompt || input.message)
    petunjuk = await muatPetunjukRak(prompt, input && input.cwd)
  } catch { petunjuk = '' }
  emitContext(buildKimiReminder(input, petunjuk) + '\n')
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  guardPipes()
  main()
}
