#!/usr/bin/env node
// engine/skill-format-check.mjs - Penjaga Format Skill (ADR-027 Microkernel+Plugin, Tugas 9).
//
// ATURANNYA: tiap skills/<nama>/SKILL.md WAJIB memenuhi INTI Standar Mutu §7:
//   1. Frontmatter LENGKAP (nama, deskripsi, divisi, pemicu[], rawan_keamanan boolean eksplisit).
//   2. Minimal SATU label 🔒 HASIL (hasil non-negotiable = keselamatan yang tak bisa ditawar, §7).
//   3. Seksi Definition-of-Done (daftar "kapan skill dianggap benar-selesai").
//
// KENAPA ADA: robot self-registering (engine/skill-registry.mjs, Tugas 7) sengaja FAIL-SAFE - SKILL.md
// dengan frontmatter tak lengkap DILEWATI DIAM (skill-registry.mjs:66 hanya push kalau nama+pemicu ada),
// jadi skill cacat "hilang" dari registry TANPA satu pun tanda. Itu kegagalan SENYAP - persis kelas bug
// yang kit ini perangi. Penjaga ini menutup kelasnya: ia MELAPORKAN (bukan melewati) skill yang formatnya
// salah, di gerbang preflight, SEBELUM sesuatu disebut "selesai". Registry tetap lenient saat runtime;
// penjaga ini yang menangkap kesalahan penulisan saat pra-rilis (pembagian tugas yang sengaja).
//
// FORWARD-LOOKING: folder skills/ belum ada (dibuat mulai Pilot Tugas 10/12). AUTO-SKIP anggun: skills/
// tak ada -> present:false (dilewati). skills/ ada tapi kosong -> 0 skill -> 0 temuan. MENGGIGIT begitu
// skill pertama ditulis tanpa frontmatter/🔒/DoD. Reuse parseFrontmatter dari skill-registry (DRY - satu
// parser, jangan salin: dua salinan bisa melenceng dan penjaga menilai dengan aturan beda dari registry).
//
// TINGKAT: PENTING (memblokir --strict, bukan GENTING): skill cacat = kemampuan yang formatnya rusak,
// bukan kerusakan data langsung. Cuma-baca + deterministik (~0 token). Inti PURE (analyzeSkillFormat
// menerima teks yang disuntik) -> teruji di tests/skill-format-check.test.mjs tanpa menyentuh disk.
//
// CLI: node engine/skill-format-check.mjs [--project-root <dir>]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readTextSafe, isFile, stripBom } from './fs-text.mjs'
import { parseFrontmatter } from './skill-registry.mjs'

// Field frontmatter WAJIB (§7): tanpa ini dispatcher/registry tak bisa mengaktifkan skill dengan benar.
const FIELD_WAJIB = ['nama', 'deskripsi', 'divisi', 'pemicu']
const RE_HASIL = /\u{1F512}/u // 🔒 = penanda label HASIL non-negotiable (keselamatan, §7)
// Seksi Definition-of-Done - terima bentuk English (§7 KEEP term) maupun padanan Indonesia.
const RE_DOD = /(definition[\s-]?of[\s-]?done|\bDoD\b|definisi[\s-]?selesai)/i

const EMPTY = { GENTING: 0, PENTING: 0, RAPIKAN: 0 }

// --- INTI PURE (bisa diuji tanpa disk) --------------------------------------------------------

// Periksa SATU skill. Return array temuan {tingkat, kode, ref, pesan}. Semua PENTING (cacat format,
// bukan kerusakan data). Satu SKILL.md bisa menghasilkan beberapa temuan (tiap field/label terpisah).
export function periksaSkill(rel, teks) {
  const t = stripBom(String(teks || ''))
  const temuan = []
  const tambah = (kode, pesan) => temuan.push({ tingkat: 'PENTING', kode, ref: rel, pesan: `${rel}: ${pesan}` })

  const punyaBlok = /^---\s*\n[\s\S]*?\n---/.test(t)
  if (!punyaBlok) {
    tambah('frontmatter-hilang', 'tak ada blok frontmatter (--- ... ---) di awal. Wajib: nama, deskripsi, divisi, pemicu, rawan_keamanan (§7).')
  } else {
    const fm = parseFrontmatter(t)
    for (const f of FIELD_WAJIB) {
      const v = fm[f]
      const kosong = v == null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)
      if (kosong) tambah('frontmatter-field', `frontmatter '${f}' hilang/kosong (wajib §7).`)
    }
    if (typeof fm.rawan_keamanan !== 'boolean') {
      tambah('frontmatter-field', "frontmatter 'rawan_keamanan' wajib di-set eksplisit true/false - flag keamanan tak boleh menebak default.")
    }
  }
  if (!RE_HASIL.test(t)) tambah('tanpa-hasil', 'tak ada label 🔒 HASIL (hasil non-negotiable/keselamatan §7). Tandai minimal satu.')
  if (!RE_DOD.test(t)) tambah('tanpa-dod', 'tak ada seksi Definition-of-Done (kapan skill dianggap benar-selesai, §7).')
  return temuan
}

// INTI PURE agregat. skills = [{ rel, teks }]. Return { findings, counts, total }.
export function analyzeSkillFormat({ skills }) {
  const findings = []
  for (const { rel, teks } of skills) for (const f of periksaSkill(rel, teks)) findings.push(f)
  const counts = { ...EMPTY }
  for (const f of findings) counts[f.tingkat]++
  return { findings, counts, total: skills.length }
}

// --- Pembungkus disk. AUTO-SKIP anggun: skills/ tak ada -> present:false. ---------------------------
export function runSkillFormatCheck({ repoRoot } = {}) {
  const root = path.resolve(repoRoot || process.cwd())
  // Cari skills/ di root ATAU .claude-kit/skills (klien menaruh kit di .claude-kit/).
  const skillsDir = [path.join(root, 'skills'), path.join(root, '.claude-kit', 'skills')]
    .find((d) => { try { return fs.statSync(d).isDirectory() } catch { return false } })
  if (!skillsDir) return { present: false, findings: [], counts: { ...EMPTY }, total: 0 }

  let sub = []
  try {
    sub = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  } catch {
    return { present: false, findings: [], counts: { ...EMPTY }, total: 0 }
  }
  const skills = []
  for (const nama of sub.sort()) {
    const p = path.join(skillsDir, nama, 'SKILL.md')
    if (isFile(p)) skills.push({ rel: `skills/${nama}/SKILL.md`, teks: readTextSafe(p) || '' })
  }
  return { present: true, ...analyzeSkillFormat({ skills }) }
}

function main() {
  const args = process.argv.slice(2)
  const i = args.indexOf('--project-root')
  const root = i >= 0 && i + 1 < args.length ? args[i + 1] : process.cwd()
  const r = runSkillFormatCheck({ repoRoot: root })
  if (!r.present) {
    console.log('[info] folder skills/ belum ada - penjaga format skill dilewati (masa transisi ADR-027, wajar).')
  } else if (r.findings.length === 0) {
    console.log(`[OK] Format skill: ${r.total} skill diperiksa - semua punya frontmatter + 🔒 HASIL + Definition-of-Done.`)
  } else {
    for (const f of r.findings) console.log(`[${f.tingkat}] ${f.pesan}`)
    console.log(`\nRingkasan: GENTING ${r.counts.GENTING} | PENTING ${r.counts.PENTING} | RAPIKAN ${r.counts.RAPIKAN}`)
  }
  process.exitCode = r.counts.GENTING + r.counts.PENTING // 0 = bersih; >0 memblokir --strict
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
