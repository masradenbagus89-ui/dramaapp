#!/usr/bin/env node
// engine/rules-budget-check.mjs - Penjaga Anggaran Token berkas aturan always-load.
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

// Anggaran GABUNGAN (CLAUDE_universal_v1.md + AGENTS.md + CLAUDE.md) - ADR-019. Sebelumnya robot ini
// cuma mengukur CLAUDE_universal_v1.md sendirian, padahal client dapat DUA berkas @import lain
// (AGENTS.md + CLAUDE.md, lihat CLAUDE.md.template) yang sama-sama termuat tiap sesi tapi tak terpantau -
// AGENTS.md khususnya didesain untuk TUMBUH (opt-in §15, catatan tim). Sama filosofi DEFAULT_BUDGET_CHARS
// (langit-langit anti-regresi untuk STACK gabungan, bukan target).
export const DEFAULT_TOTAL_BUDGET_CHARS = 128000

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

// Cari berkas TEMAN yang sama-sama @import tiap sesi (AGENTS.md, CLAUDE.md) relatif ke anchor
// (CLAUDE_universal_v1.md). Client: anchor di "<root>/.claude-kit/CLAUDE_universal_v1.md" -> companion
// root = <root> (naik 1 level dari .claude-kit/). Kit-dev (dogfood): anchor di "<root>/CLAUDE_universal_v1.md"
// -> companion root = dir yang sama (otomatis benar - repo kit ini sendiri tak punya AGENTS.md di root).
// Return null per-berkas kalau tak ada (auto-skip anggun, TIDAK melempar).
export function findCompanionAlwaysLoadFiles(anchorPath) {
  if (!anchorPath) return { agentsMdPath: null, claudeMdPath: null }
  const anchorDir = path.dirname(anchorPath)
  const companionRoot = path.basename(anchorDir) === '.claude-kit' ? path.dirname(anchorDir) : anchorDir
  const agentsMdPath = path.join(companionRoot, 'AGENTS.md')
  const claudeMdPath = path.join(companionRoot, 'CLAUDE.md')
  return {
    agentsMdPath: fs.existsSync(agentsMdPath) ? agentsMdPath : null,
    claudeMdPath: fs.existsSync(claudeMdPath) ? claudeMdPath : null,
  }
}

// Kedalaman maksimum rantai `@import` yang ditelusuri. Dokumentasi resmi Claude Code menyebut
// import bersarang didukung sampai 4 lompatan; pakai angka yang sama supaya robot mengukur persis
// sebanyak yang benar-benar dimuat harness (bukan lebih, bukan kurang).
export const MAX_IMPORT_DEPTH = 4

// Ambil path dari baris `@...` sebuah berkas aturan. SENGAJA konservatif: hanya baris yang DIMULAI
// `@` (boleh didahului spasi), dan hasilnya baru dipakai kalau berkasnya BENAR-BENAR ADA di disk
// (lihat traceImports) - jadi salah-tangkap (mis. `@media` di blok kode) otomatis tersaring, bukan
// bikin angka menggelembung.
function parseImportLines(text) {
  const out = []
  for (const baris of String(text).split(/\r?\n/)) {
    const m = /^\s*@(\S+)\s*$/.exec(baris)
    if (m) out.push(m[1])
  }
  return out
}

// Telusuri rantai `@import` mulai dari berkas-berkas benih, kembalikan path berkas TAMBAHAN yang
// ter-import tapi belum terhitung. ADITIF di atas findCompanionAlwaysLoadFiles (yang daftarnya KAKU:
// hanya AGENTS.md + CLAUDE.md) - tanpa ini, berkas kernel KEEMPAT yang kelak ditambahkan lewat
// @import akan luput dari pemantauan, persis kelas celah yang ditutup ADR-019 untuk AGENTS.md.
// FAIL-SAFE total: berkas tak terbaca / tak ada -> dilewati diam, tak pernah melempar.
export function traceImports(seedPaths, { maxDepth = MAX_IMPORT_DEPTH } = {}) {
  const terlihat = new Set()
  const tambahan = []
  for (const p of seedPaths) {
    if (p) terlihat.add(path.resolve(p))
  }
  let lapisan = [...terlihat]
  for (let depth = 0; depth < maxDepth && lapisan.length; depth++) {
    const berikutnya = []
    for (const asal of lapisan) {
      let text = ''
      try {
        text = fs.readFileSync(asal, 'utf8')
      } catch {
        continue
      }
      for (const rel of parseImportLines(text)) {
        let target
        try {
          target = path.resolve(path.dirname(asal), rel)
        } catch {
          continue
        }
        if (terlihat.has(target)) continue // sudah terhitung / sudah dikunjungi -> cegah dobel + siklus
        terlihat.add(target)
        let statOk = false
        try {
          statOk = fs.statSync(target).isFile()
        } catch {
          statOk = false
        }
        if (!statOk) continue // path tak ada = rujukan menggantung, bukan biaya token -> lewati
        tambahan.push(target)
        berikutnya.push(target)
      }
    }
    lapisan = berikutnya
  }
  return tambahan
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

// Orkestrasi BARU (ADR-019): total gabungan SEMUA berkas @import tiap sesi (CLAUDE_universal_v1.md +
// AGENTS.md + CLAUDE.md kalau ada). BUKAN pengganti runRulesBudget() - itu tetap fokus 1 berkas (pesan
// remediasinya beda: "pindah ke rules/"). Ini cuma jumlahkan apa yang BENAR-BENAR ter-@import.
export function runAlwaysLoadBudget({ repoRoot = process.cwd(), budgetChars = DEFAULT_TOTAL_BUDGET_CHARS, filePath = null } = {}) {
  const anchorPath = filePath || findAlwaysLoadFile(repoRoot)
  if (!anchorPath || !fs.existsSync(anchorPath)) return { present: false, budgetChars }
  const { agentsMdPath, claudeMdPath } = findCompanionAlwaysLoadFiles(anchorPath)
  const dasar = [
    { role: 'CLAUDE_universal_v1.md', path: anchorPath },
    ...(agentsMdPath ? [{ role: 'AGENTS.md', path: agentsMdPath }] : []),
    ...(claudeMdPath ? [{ role: 'CLAUDE.md', path: claudeMdPath }] : []),
  ]
  // Lapis ADITIF: berkas lain yang benar-benar ter-`@import` dari ketiga berkas di atas. Daftar `dasar`
  // di atas KAKU (cuma 2 nama berkas teman) - kalau kelak ada berkas kernel keempat, ia cuma tertangkap
  // lewat penelusuran ini. Dedup memakai path absolut, jadi rantai normal (CLAUDE.md -> CLAUDE_universal_v1.md)
  // tidak terhitung dua kali dan angkanya persis sama seperti sebelum perubahan ini.
  const sudahAda = new Set(dasar.map((c) => path.resolve(c.path)))
  const candidates = [
    ...dasar,
    ...traceImports(dasar.map((c) => c.path))
      .filter((p) => !sudahAda.has(path.resolve(p)))
      .map((p) => ({ role: `@import ${path.basename(p)}`, path: p })),
  ]
  const parts = []
  let totalChars = 0
  for (const c of candidates) {
    let text = ''
    try {
      text = fs.readFileSync(c.path, 'utf8')
    } catch {
      continue
    }
    const chars = stripBom(text).length
    totalChars += chars
    parts.push({ role: c.role, path: c.path, chars })
  }
  const tokensEst = Math.round(totalChars / CHARS_PER_TOKEN)
  return { present: true, parts, chars: totalChars, tokensEst, budgetChars, over: totalChars > budgetChars, remaining: budgetChars - totalChars }
}

function fmt(n) {
  return (Number(n) || 0).toLocaleString('en-US')
}

// --- CLI: `node engine/rules-budget-check.mjs [--project-root <dir>] [--budget-chars 128000]` ---
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
    console.log('  Padatkan / pindah detail ke berkas seksi rules/ - lihat §4.18 Compaction + §14 aturan penempatan.')
  } else {
    console.log(`BERSIH: di bawah anggaran (sisa ~${fmt(res.remaining)} char).`)
  }
  console.log('')

  // Blok TAMBAHAN (ADR-019) - total gabungan semua berkas @import tiap sesi. Tak menggantikan blok
  // di atas (yang tetap fokus CLAUDE_universal_v1.md sendirian untuk pesan "pindah ke rules/").
  const totalRes = runAlwaysLoadBudget({ repoRoot })
  if (totalRes.present && totalRes.parts.length > 1) {
    console.log('Anggaran Token GABUNGAN - semua berkas @import tiap sesi (READ-ONLY)')
    console.log('-'.repeat(64))
    for (const part of totalRes.parts) console.log(`  ${part.role.padEnd(24)}: ${fmt(part.chars)} char`)
    console.log('-'.repeat(64))
    console.log(`  Total    : ${fmt(totalRes.chars)} char (~${fmt(totalRes.tokensEst)} token)`)
    console.log(`  Anggaran : ${fmt(totalRes.budgetChars)} char (~${fmt(Math.round(totalRes.budgetChars / CHARS_PER_TOKEN))} token)`)
    if (totalRes.over) {
      console.log(`  PERHATIAN: total MELEWATI anggaran gabungan (kelebihan ~${fmt(-totalRes.remaining)} char).`)
    } else {
      console.log(`  BERSIH: total di bawah anggaran gabungan (sisa ~${fmt(totalRes.remaining)} char).`)
    }
    console.log('')
  }
  process.exit(0)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
