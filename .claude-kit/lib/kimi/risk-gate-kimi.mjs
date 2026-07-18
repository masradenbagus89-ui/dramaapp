#!/usr/bin/env node
// lib/kimi/risk-gate-kimi.mjs - "Palang Rem" versi Kimi Code (PreToolUse hook).
//
// KENAPA ADA: di Claude Code, lib/risk-gate.js meminta KONFIRMASI klik (mode "ask") untuk aksi
// berisiko. Kimi Code TIDAK punya mekanisme "ask" di hook - hanya BLOKIR (exit 2) atau IZINKAN
// (exit 0). Kimi juga BAWAANNYA sudah minta persetujuan untuk tool Bash/Edit/Write. Maka keputusan
// owner = HYBRID:
//   - EKSTREM / tak-bisa-dibatalkan  -> DITOLAK keras (exit 2): menembus pagar, unduh-lalu-jalankan,
//     hapus rekursif paksa (rm -rf), DROP/TRUNCATE tabel, format disk.
//   - Berisiko-tapi-bisa-dipulihkan  -> DIPERINGATKAN lalu DIIZINKAN (dialog persetujuan bawaan Kimi
//     yang menuntun): DELETE ... WHERE, prisma migrate, sentuh .env, deleteMany/updateMany, git force.
//
// OTAK KEPUTUSAN DIPAKAI ULANG dari lib/risk-gate.js decide() (JANGAN tulis-ulang logika risiko -
// satu sumber kebenaran). Berkas ini cuma memetakan keputusan Claude -> kontrak Kimi (lewat
// lib/kimi/kimi-hook-io.mjs). Deteksi berbasis-PERINTAH memakai `tool_input.command` yang dipastikan
// dokumen Kimi -> andal. Deteksi berbasis-BERKAS (.env) degradasi anggun kalau nama field beda.
//
// FAIL-OPEN: input rusak/kosong -> izinkan. TERUJI: decideKimi PURE - tests/kimi-adapters.test.mjs.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import {
  readStdinRaw,
  parseHookInput,
  normalizeToolCall,
  emitDeny,
  emitAllow,
  emitWarnAllow,
  guardPipes,
} from './kimi-hook-io.mjs'

// risk-gate.js = CommonJS -> muat lewat createRequire (interop ESM->CJS yang eksplisit & andal).
const require = createRequire(import.meta.url)
const { decide } = require('../risk-gate.js')

// Kategori yang di Kimi = TOLAK KERAS. 'block' dari decide() selalu ditolak; kategori 'ask' berikut
// DINAIKKAN jadi tolak (ekstrem/irreversibel). Sisanya (ask) -> peringatan + izinkan.
export const KIMI_DENY_CATEGORIES = new Set([
  'BYPASS_PAGAR',
  'UNDUH_JALANKAN',
  'HAPUS_REKURSIF',
  'SQL_DESTRUKTIF',
  'FORMAT_DISK',
])

// Deskripsi risiko PER-KATEGORI dalam bahasa yang TEPAT untuk Kimi (Kimi tak punya dialog
// "Setujui/Tolak" kita - blokir = keras, izin = lewat dialog persetujuan BAWAAN Kimi). Ini prosa
// user-facing khusus Kimi; LOGIKA risikonya tetap dari decide() (satu sumber kebenaran). Fallback ke
// alasan decide() kalau kategori tak dikenal.
const KIMI_RISK_DESC = {
  BYPASS_PAGAR: 'perintah ini mematikan portal izin AI (menembus pagar keamanan, dilarang sec. 8.1 #10)',
  UNDUH_JALANKAN: 'perintah ini mengunduh kode dari internet lalu langsung menjalankannya (sangat berisiko, sec. 8.1 #2)',
  HAPUS_REKURSIF: 'perintah ini menghapus banyak berkas sekaligus secara paksa (hapus rekursif) - sulit dibatalkan',
  SQL_DESTRUKTIF: 'perintah ini bisa menghapus seluruh tabel/struktur database (DROP/TRUNCATE) - data hilang permanen',
  FORMAT_DISK: 'perintah ini bisa memformat/menghapus seluruh isi disk atau partisi',
  SQL_DELETE_ALL: 'perintah ini menghapus SELURUH baris tabel (DELETE tanpa syarat WHERE)',
  SQL_DELETE: 'perintah ini menghapus baris database',
  PRISMA_MIGRATE_DEV: "'prisma migrate dev' bisa MERESET database kalau dipakai di luar DB lokal pribadi",
  PRISMA_BULK_NO_WHERE: 'deleteMany/updateMany tanpa syarat (where) mengubah/menghapus SELURUH baris tabel',
  GIT_BERBAHAYA: 'perintah git ini bisa menimpa/membuang riwayat atau melewati pemeriksaan (force/reset --hard/--no-verify)',
  SENTUH_ENV: 'kamu akan menulis/mengubah berkas rahasia (.env) - jaga jangan ada kunci bocor / ikut ter-commit',
}

function riskDesc(category, fallback) {
  return (category && KIMI_RISK_DESC[category]) || fallback || 'aksi ini berisiko'
}

// PURE: petakan payload Kimi -> { action: 'deny'|'warn'|'allow', message, category }.
// message = teks siap-kirim (deny -> stderr; warn -> stderr advisory).
export function decideKimi(input) {
  const norm = normalizeToolCall(input)
  const d = decide(norm)
  const desc = riskDesc(d.category, d.reason)
  if (d.decision === 'block' || (d.decision === 'ask' && d.category && KIMI_DENY_CATEGORIES.has(d.category))) {
    return {
      action: 'deny',
      category: d.category,
      message:
        '[lintasAI Palang Rem] DITOLAK: ' + desc + '. ' +
        'Kimi tak bisa melanjutkan ini lewat dialog - kalau memang perlu, jalankan sendiri manual di luar AI.',
    }
  }
  if (d.decision === 'ask') {
    return {
      action: 'warn',
      category: d.category,
      message:
        '[lintasAI Palang Rem - PERINGATAN] ' + desc + '. ' +
        'Kimi akan meminta persetujuanmu - lanjut hanya kalau kamu yakin.',
    }
  }
  return { action: 'allow' }
}

function main() {
  const input = parseHookInput(readStdinRaw())
  if (!input) return emitAllow() // fail-open
  const r = decideKimi(input)
  if (r.action === 'deny') return emitDeny(r.message)
  if (r.action === 'warn') return emitWarnAllow(r.message)
  return emitAllow()
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  guardPipes()
  main()
}
