#!/usr/bin/env node
// lib/rules-budget-check.mjs - Penjaga Anggaran Token berkas aturan always-load.
//
// KENAPA ADA: `CLAUDE_universal_v1.md` dibaca AI **tiap sesi** (biaya token TETAP per-sesi, di kit
// DAN di tiap project client). Selama pengembangan, berkas ini gampang menggembung diam-diam
// (duplikasi aturan, cerita asal-usul/insiden, cap tanggal) tanpa ada yang menangkap - persis yang
// ditemukan lewat audit MANUAL di sesi kompaksi. Robot ini mengubah pelajaran itu jadi PENJAGA
// PERMANEN (doktrin §6.4): ukur ukuran berkas always-load, banding "anggaran", nyalakan peringatan
// begitu bengkak lewat ambang. Aturan penempatan (detail ke workflows, cerita ke CHANGELOG) ada di
// `CLAUDE_universal_v1.md` §14.
//
// SIFAT: CUMA-BACA (READ-ONLY) + deterministik (~0 token AI). Tingkat = RAPIKAN (saran) - TIDAK
// memblokir rilis (ukuran dokumen bukan pemblokir keras; sama filosofi perf-budget). AUTO-SKIP
// anggun: berkas tak ketemu -> present:false (INFO), bukan error.
//
// TERUJI: measureRules PURE (isi disuntik) - tests/rules-budget.test.mjs.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripBom } from './fs-text.mjs'

// Perkiraan ~4 char/token. 128.000 char ~= 32.000 token. Nilai ini = LANGIT-LANGIT anti-regresi
// (beri sedikit ruang di atas kondisi terkini), BUKAN target - makin kecil makin baik. Naikkan HANYA
// dengan alasan sadar (mis. aturan Tingkat-1 baru yang wajib always-load), jangan untuk menampung bloat.
export const DEFAULT_BUDGET_CHARS = 128000
export const CHARS_PER_TOKEN = 4

// Cari berkas always-load: kit (root) ATAU client (.claude-kit/). Return path pertama yang ada, atau null.
export function findAlwaysLoadFile(repoRoot = process.cwd()) {
  const candidates = [
    path.join(repoRoot, 'CLAUDE_universal_v1.md'),
    path.join(repoRoot, '.claude-kit', 'CLAUDE_universal_v1.md'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return null
}

// PURE: hitung dari isi teks. DISUNTIK di tes (tak menyentuh disk).
export function measureRules(text, { budgetChars = DEFAULT_BUDGET_CHARS } = {}) {
  const chars = stripBom(String(text)).length
  const tokensEst = Math.round(chars / CHARS_PER_TOKEN)
  return { chars, tokensEst, budgetChars, over: chars > budgetChars, remaining: budgetChars - chars }
}

// Orkestrasi untuk CLI + preflight. present:false = berkas tak ketemu (auto-skip anggun).
export function runRulesBudget({ repoRoot = process.cwd(), budgetChars = DEFAULT_BUDGET_CHARS, filePath = null } = {}) {
  const p = filePath || findAlwaysLoadFile(repoRoot)
  if (!p || !fs.existsSync(p)) return { present: false, budgetChars }
  let text = ''
  try {
    text = fs.readFileSync(p, 'utf8')
  } catch {
    return { present: false, budgetChars }
  }
  return { present: true, path: p, ...measureRules(text, { budgetChars }) }
}

function fmt(n) {
  return (Number(n) || 0).toLocaleString('en-US')
}

// --- CLI: `node lib/rules-budget-check.mjs [--project-root <dir>] [--budget-chars 128000]` ---
function main() {
  let repoRoot = process.cwd()
  let budgetChars = DEFAULT_BUDGET_CHARS
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project-root') repoRoot = argv[++i] || repoRoot
    else if (argv[i] === '--budget-chars') budgetChars = Number(argv[++i]) || DEFAULT_BUDGET_CHARS
  }

  const res = runRulesBudget({ repoRoot, budgetChars })
  if (!res.present) {
    console.log('Anggaran token berkas aturan: DILEWATI - CLAUDE_universal_v1.md tak ketemu (root / .claude-kit/).')
    process.exit(0)
  }

  const budgetTok = Math.round(res.budgetChars / CHARS_PER_TOKEN)
  console.log('')
  console.log('Anggaran Token Berkas Aturan Always-Load (READ-ONLY)')
  console.log('-'.repeat(64))
  console.log(`  Berkas   : ${res.path}`)
  console.log(`  Ukuran   : ${fmt(res.chars)} char (~${fmt(res.tokensEst)} token)`)
  console.log(`  Anggaran : ${fmt(res.budgetChars)} char (~${fmt(budgetTok)} token)`)
  console.log('-'.repeat(64))
  if (res.over) {
    console.log(`PERHATIAN: berkas aturan MELEWATI anggaran (kelebihan ~${fmt(-res.remaining)} char).`)
    console.log('  Padatkan / pindah detail ke berkas seksi workflows/ - lihat §4.18 Compaction + §14 aturan penempatan.')
  } else {
    console.log(`BERSIH: di bawah anggaran (sisa ~${fmt(res.remaining)} char).`)
  }
  console.log('')
  process.exit(0)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
