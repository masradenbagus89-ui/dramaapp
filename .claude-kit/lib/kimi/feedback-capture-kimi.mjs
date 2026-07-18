#!/usr/bin/env node
// lib/kimi/feedback-capture-kimi.mjs - Pengingat rekam pelajaran versi Kimi Code (Stop hook).
//
// Memakai ulang decide()/gitHasWork() dari lib/feedback-capture.mjs (SATU sumber logika). Pemicu =
// SINYAL GIT nyata ("ada kerja kode di sesi ini?"), sama seperti di Claude. Kimi menyuntik konteks
// lewat STDOUT (verbatim docs resmi: Stop exit 0, "stdout content may be appended to context").
// SELALU exit 0 (hook Stop blockable; exit != 0 bisa memaksa AI lanjut - pantang untuk pengingat).
//
// stop_hook_active Kimi belum dipastikan dokumen; decide() sudah aman kalau field absen (dianggap
// BUKAN loop -> pengingat tetap jalan sekali). FAIL-OPEN: git tak ada / input rusak -> DIAM.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decide, gitHasWork } from '../feedback-capture.mjs'
import { readStdinRaw, parseHookInput, emitContext, guardPipes } from './kimi-hook-io.mjs'

function main() {
  const input = parseHookInput(readStdinRaw())
  const cwd = (input && typeof input.cwd === 'string' && input.cwd) || process.cwd()
  const d = decide({ hookInput: input, hasWork: gitHasWork(cwd) })
  if (d.inject) emitContext(d.additionalContext + '\n')
  else process.exitCode = 0 // DIAM (tak ada kerja / anti-loop)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  guardPipes()
  main()
}
