#!/usr/bin/env node
// engine/kimi/rak-gate-kimi.mjs - "Palang Rak" versi Kimi Code (PreToolUse hook).
//
// KENAPA ADA: ADR-018 kondisi #11 menetapkan otak asli = Claude Code ATAU Kimi Code. Petunjuk Rak
// (blok-5 pengingat) sudah ikut ke Kimi otomatis karena logikanya satu fungsi murni; Palang Rak belum,
// karena ia butuh kulit I/O PreToolUse sendiri. Tanpa berkas ini, pemakai Kimi kehilangan satu-satunya
// bagian yang benar-benar MENEGAKKAN pembacaan rak - dan angka 14% itu tak akan bergerak untuk mereka.
//
// OTAK KEPUTUSAN DIPAKAI ULANG dari engine/rak-gate.mjs (decideRak + stateBerikutnya + buatPenyaringDisk).
// JANGAN tulis-ulang logikanya di sini: aturan "bukti tanda-terima, bukan klaim" adalah inti palang -
// dua salinan = satu sisi bisa melenceng diam-diam dan palang jadi bohong di salah satu otak.
// Berkas ini HANYA memetakan payload Kimi -> bentuk kanonik, lalu keputusan -> kontrak Kimi.
//
// PEMETAAN NAMA TOOL (defensif): dokumentasi Kimi memastikan `tool_input.command`, tapi TIDAK
// mencontohkan nama tool baca/tulis. Kalau nama tak dikenali, akibatnya bukan bahaya melainkan
// friksi: tanda-terima tak tercatat -> edit berisiko tertahan, tapi katup pelepas 2x/sesi tetap
// membebaskan. Maka daftar padanan di bawah dibuat longgar (semua yang berbau baca/tulis).
//
// FAIL-OPEN penuh: input rusak/kosong/tanpa session_id -> izinkan.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readState, writeState } from '../hook-session-state.mjs'
import { decideRak, stateBerikutnya, buatPenyaringDisk, STATE_NAMESPACE } from '../rak-gate.mjs'
import { readStdinRaw, parseHookInput, normalizeToolCall, emitDeny, emitAllow, guardPipes } from './kimi-hook-io.mjs'

// Nama tool Kimi -> nama kanonik yang dipahami decideRak(). Longgar SENGAJA (lihat catatan di atas).
const POLA_BACA = /^(read|read_file|readfile|view|view_file|open_file|cat)$/i
const POLA_UBAH = /^(edit|write|multiedit|multi_edit|edit_file|write_file|create_file|str_replace|str_replace_editor|apply_patch)$/i

// PURE: samakan nama tool Kimi dengan kosakata Claude. Nama tak dikenal dikembalikan apa adanya
// (decideRak akan menganggapnya "bukan urusan palang" -> izinkan; itu arah gagal yang benar).
export function kanonkanTool(nama) {
  const n = String(nama || '')
  if (POLA_BACA.test(n)) return 'Read'
  if (POLA_UBAH.test(n)) return 'Edit' // decideRak memperlakukan Edit/Write/MultiEdit identik
  return n
}

// PURE: payload Kimi + state -> keputusan decideRak. `rakWajibDari` di-injeksi supaya bisa diuji
// tanpa menyentuh disk (pola sama seperti jalur Claude).
export function decideRakKimi(input, state, rakWajibDari) {
  const norm = normalizeToolCall(input)
  const kanonik = { tool_name: kanonkanTool(norm.tool_name), tool_input: { file_path: norm.tool_input.file_path } }
  return decideRak(kanonik, state, rakWajibDari)
}

function main() {
  const input = parseHookInput(readStdinRaw())
  if (!input) return emitAllow() // fail-open

  // session_id kosong -> palang MATI TOTAL (sama persis dengan jalur Claude). Sengaja: state jatuh ke
  // bucket bersama 'nosession', dan untuk BUKTI BACAAN itu bypass nyata - bacaan sesi A akan
  // memuaskan sesi B.
  const sessionId = typeof input.session_id === 'string' ? input.session_id : ''
  if (!sessionId) return emitAllow()

  let state
  try { state = readState(STATE_NAMESPACE, sessionId, { dibaca: [], blokir: 0 }) }
  catch { return emitAllow() } // state tak terbaca -> jangan kunci kerja orang

  const d = decideRakKimi(input, state, buatPenyaringDisk(input.cwd))

  try {
    const berikut = stateBerikutnya(state, d)
    if (berikut) writeState(STATE_NAMESPACE, sessionId, berikut)
  } catch { /* gagal tulis state: keputusan di bawah tetap berlaku */ }

  if (d.decision === 'block') return emitDeny(d.reason)
  return emitAllow()
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  guardPipes()
  main()
}
