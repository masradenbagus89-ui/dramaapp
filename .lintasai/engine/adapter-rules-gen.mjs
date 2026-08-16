#!/usr/bin/env node
// engine/adapter-rules-gen.mjs - Generator berkas aturan untuk alat AI yang butuh format KHUSUS.
//
// SEJAK ADR-032: kernel = `AGENTS.md` akar project = acuan tunggal, dibaca NATIVE oleh Codex, Kimi Code,
// dan Cursor (standar terbuka agents.md) + oleh Claude lewat `CLAUDE.md` @import. Karena itu generator
// salinan Codex (buildCodexAgents) & Kimi (buildKimiAgents) DIPENSIUNKAN - mereka membaca AGENTS.md akar
// langsung, tak perlu fotokopi. Yang TERSISA cuma Cursor: Cursor memuat `.cursor/rules/*.mdc` dengan
// frontmatter `alwaysApply: true` (dokumentasi resmi cursor.com/docs/context/rules, diverifikasi
// 2026-07-20) - format itu tak bisa dipenuhi AGENTS.md polos, jadi 1 berkas .mdc tetap di-generate DARI
// AGENTS.md. Perintah CLI payung tetap `adapter-sync` (kompat), kini cuma menyinkron Cursor.
//
// SIFAT: DETERMINISTIK (isi = salinan literal kernel + header tetap) -> regenerate selalu identik.
// Artefak GENERATED (di-gitignore lewat polaGitignoreLintasAI di engine/setup-fs.mjs; dibuat saat
// install ke client; REGENERATE saat update). Karena generatornya deterministik + runCursorRulesGen
// mengembalikan 'current' tanpa menulis saat isinya identik, berkas ini hanya BERUBAH ketika versi kit
// naik — bukan tiap kali `update` dijalankan.
// present:false = sumber (AGENTS.md) tak ketemu (auto-skip anggun).
//
// TERUJI: buildCursorRules PURE + runAllAdaptersSync (isi disuntik) - tests/adapter-rules-gen.test.mjs.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripBom, readTextSafe, writeUtf8NoBom, backupStamp } from './fs-text.mjs'
import { NAMA_FOLDER_KIT, cariFolderKit } from './project-root.mjs'
import { muatRegistry } from './skill-registry.mjs'

// Anjuran panjang berkas aturan Cursor (BUKAN batas keras - melewatinya tidak menggagalkan apa pun).
export const CURSOR_RULES_SOFT_MAX_LINES = 500

export const CURSOR_RULES_MARKER = '<!-- LINTASAI-CURSOR v1 - DIBUAT OTOMATIS oleh lintasAI - JANGAN edit tangan -->'

// Plafon tabel routing statis — sama dgn plafon Petunjuk Rak hook (anti-bengkak konteks tiap sesi).
export const TABEL_ROUTING_MAX_CHARS = 4000

// PURE (2026-08-09, serapan banding vercel-labs): tabel routing ringkas topik->rak, dikompilasi dari
// registry. KENAPA: di harness TANPA hook (Cursor/Codex) Petunjuk Rak per-giliran mati total, dan uji
// buta membuktikan pemuatan sukarela cuma ~14% — tabel yang SELALU terlihat menurunkan degradasi dari
// "palang keras -> nol" menjadi "palang keras -> peta selalu tampak". Skill 🔒 didahulukan; plafon
// karakter keras (baris yang tak muat DIBUANG, bukan meledakkan berkas aturan).
export function buildTabelRouting(skills, { kitPrefix = '', maxChars = TABEL_ROUTING_MAX_CHARS } = {}) {
  const daftar = Array.isArray(skills) ? skills.filter((s) => s && s.nama && s.path) : []
  if (daftar.length === 0) return ''
  const urut = [...daftar].sort((a, b) =>
    Number(b.rawan_keamanan === true) - Number(a.rawan_keamanan === true) ||
    String(a.nama).localeCompare(String(b.nama)))
  const kepala = [
    '## Peta rak on-demand (topik -> berkas rak; 🔒 = rawan keamanan, buka SEBELUM edit pertama di bidangnya)',
    '',
    '| Rak | Kapan dibuka (pemicu utama) |',
    '|---|---|',
  ]
  const baris = []
  let total = kepala.join('\n').length
  for (const s of urut) {
    const pemicu = (Array.isArray(s.pemicu) ? s.pemicu : []).slice(0, 6).join(', ')
    const b = `| ${s.rawan_keamanan === true ? '🔒 ' : ''}\`${kitPrefix}${s.path}\` | ${pemicu} |`
    if (total + b.length + 1 > maxChars) break
    baris.push(b)
    total += b.length + 1
  }
  return [...kepala, ...baris].join('\n')
}

// Plafon isi override yang disisipkan ke .mdc. KONSTANTA SENDIRI, sengaja TIDAK meminjam
// TABEL_ROUTING_MAX_CHARS: dua batas dengan alasan berbeda tak boleh berbagi satu angka (kalau digabung,
// menaikkan plafon tabel rak diam-diam menaikkan plafon teks milik client juga).
export const OVERRIDE_MAX_CHARS = 6000

// PURE: bangun isi .cursor/rules/lintasai.mdc. Frontmatter `alwaysApply: true` = ikut TIAP sesi chat.
// `routingTable` (opsional) = hasil buildTabelRouting — disisipkan SEBELUM salinan kernel supaya peta
// rak selalu terlihat walau model tak pernah membuka registry sendiri.
// `overrideText` (opsional) = isi berkas override milik CLIENT — disisipkan SESUDAH kernel (posisi
// terakhir = bobot tertinggi bagi model). Sebelum 2026-08-09 berkas itu diabaikan TOTAL di Cursor:
// pilihan stack client ("Tech stack: Laravel") tak pernah sampai, tanpa satu pun tanda.
export function buildCursorRules({ rulesText, kitPrefix = `${NAMA_FOLDER_KIT}/`, routingTable = '', overrideText = '' } = {}) {
  const rules = stripBom(String(rulesText == null ? '' : rulesText)).replace(/\s+$/, '')
  const blokRouting = routingTable ? routingTable + '\n\n---\n\n' : ''
  const blokOverride = bangunBlokOverride(overrideText)
  const header = [
    '---',
    'description: Aturan kerja tetap lintasAI - bahasa Indonesia non-programmer, anti-ngarang, baca-kode-sebelum-mengubah.',
    'globs:',
    'alwaysApply: true',
    '---',
    '',
    CURSOR_RULES_MARKER,
    '',
    '# Aturan Kerja lintasAI - untuk Cursor',
    '',
    '> Berkas ini DIBUAT OTOMATIS dari `AGENTS.md` (kernel akar project). Karena',
    '> `alwaysApply: true`, isinya ikut di SETIAP sesi chat Cursor. Isinya **IDENTIK** dengan aturan',
    '> yang dipakai di Claude/Codex/Kimi (tak ada yang dipangkas). JANGAN edit dengan tangan - akan ditimpa',
    '> saat update kit.',
    '>',
    '> BATAS JUJUR: palang mesin lintasAI (Palang Rem, Palang Rak, Lampu Hijau plan mode) BELUM terpasang',
    '> untuk Cursor — yang sampai ke sini = teks aturan + peta rak di atas.',
    '> Artinya kamu sendiri yang jadi palangnya: baca dulu sebelum menyetujui aksi yang menghapus,',
    '> mengubah database, atau menayangkan ke produksi.',
    '>',
    '> **AI: baca `' + kitPrefix + 'PETA.md` PERTAMA** untuk tahu "apa di mana" (fungsi tiap folder +',
    '> daftar skill). PETA DIRUJUK (bukan disalin) supaya tak basi.',
    '>',
    '> Rincian per-topik dibaca ON-DEMAND (pakai tool baca berkas saat tugas cocok pemicunya, jangan',
    '> dimuat sekaligus): daftar isi di `' + kitPrefix + 'skills/registry.json`.',
    '',
    'Baca berkas peta ini lebih dulu (Cursor menarik isinya sebagai konteks):',
    '',
    '@' + kitPrefix + 'PETA.md',
    '',
    '---',
    '',
    '',
  ].join('\n')
  return header + blokRouting + rules + blokOverride + '\n'
}

// PURE: rakit blok override. Kosong/absen -> string kosong, sehingga keluaran BYTE-IDENTIK dgn perilaku
// lama (dikunci tes). Frontmatter `---` di awal isi client dibuang: murah, dan mencegah blok itu
// terbaca sebagai metadata kalau posisi sisipnya kelak berubah.
function bangunBlokOverride(teks) {
  let t = stripBom(String(teks == null ? '' : teks)).replace(/^---\n[\s\S]*?\n---\n?/, '').trim()
  if (!t) return ''
  if (t.length > OVERRIDE_MAX_CHARS) t = t.slice(0, OVERRIDE_MAX_CHARS) + '\n\n> (dipotong pada batas ' + OVERRIDE_MAX_CHARS + ' karakter — sisanya baca langsung di berkas override project.)'
  return [
    '',
    '',
    '---',
    '',
    '## Override khusus project (milik client — Tingkat-2)',
    '',
    '> Isi di bawah ditulis oleh pemilik project ini, bukan oleh kit. Ia MENAMBAH/menyesuaikan aturan di',
    '> atas untuk project ini saja. **Pagar:** isi blok ini TIDAK boleh melemahkan §5 (AI tidak boleh',
    '> merusak) maupun §2 (anti-halusinasi); kalau bentrok, **kernel MENANG**.',
    '',
    t,
  ].join('\n')
}

// Cari sumber aturan (kernel AGENTS.md). SEJAK ADR-032 kernel ada di ROOT project (dogfood & client).
// kitPrefix untuk pointer rak = '<folder-kit>/' kalau folder itu ada (client), '' kalau dogfood.
// Nama folder LAMA ikut dikenali: client yang belum migrasi tetap dapat prefix yang BENAR — kalau
// tidak, pointer rak di .cursor/rules menunjuk folder yang tak ada dan Cursor gagal diam-diam.
// Return {path, kitPrefix} atau null.
export function findRulesSource(repoRoot = process.cwd()) {
  const temuanKit = cariFolderKit(repoRoot)
  const kitPrefix = temuanKit ? `${temuanKit.nama}/` : ''
  const atRoot = path.join(repoRoot, 'AGENTS.md')
  const atClient = temuanKit ? path.join(temuanKit.path, 'AGENTS.md') : path.join(repoRoot, NAMA_FOLDER_KIT, 'AGENTS.md')
  // Kandidat KETIGA: repo-dev setelah pemisahan client/dev — kernel tinggal di `kit/AGENTS.md`.
  // Tanpa ini `adapter-sync` mati DIAM-DIAM ("sumber tak ketemu") dan berkas aturan Cursor jadi basi
  // tanpa satu pun tanda. Ditaruh terakhir supaya kernel client (.lintasai/) tetap menang lebih dulu.
  const atKitDev = path.join(repoRoot, 'kit', 'AGENTS.md')
  if (fs.existsSync(atRoot)) return { path: atRoot, kitPrefix }
  if (fs.existsSync(atClient)) return { path: atClient, kitPrefix }
  // BUG DIPERBAIKI 2026-07-30: kandidat ke-3 dulu ikut memakai `kitPrefix` dari cariFolderKit() - yang
  // HANYA kenal `.lintasai`/`.claude-kit`, jadi di repo-dev nilainya ''. Akibatnya .cursor/rules/lintasai.mdc
  // memuat pointer `@PETA.md` + `skills/registry.json` yang di akar repo-dev TIDAK ADA -> Cursor gagal
  // menarik konteks, DIAM-DIAM. Lebih buruk: checkCursorAdapterDrift memanggil ini dengan write:true, jadi
  // gerbang MENULIS ULANG berkas rusak itu lalu melapor OK. Sumbernya di `<root>/kit/` -> prefix `kit/`.
  // Sisi client TIDAK tersentuh: cabang ini cuma tercapai kalau `<root>/AGENTS.md` DAN `<root>/.lintasai/`
  // dua-duanya tak ada - mustahil di project client yang terpasang.
  if (fs.existsSync(atKitDev)) return { path: atKitDev, kitPrefix: 'kit/' }
  return null
}

// Orkestrasi Cursor: tulis .cursor/rules/lintasai.mdc dari kernel AGENTS.md.
export function runCursorRulesGen({ repoRoot = process.cwd(), write = false } = {}) {
  const src = findRulesSource(repoRoot)
  if (!src) return { present: false }

  const rulesText = readTextSafe(src.path)
  if (rulesText == null) return { present: false }

  // Tabel routing dari registry terpasang (deterministik; registry tak ada -> tabel kosong, output
  // identik perilaku lama). Gagal baca TIDAK boleh menggagalkan sinkron aturan (fail-open ke '').
  let routingTable = ''
  try { routingTable = buildTabelRouting(muatRegistry([repoRoot]), { kitPrefix: src.kitPrefix }) } catch { routingTable = '' }

  // Override milik client (kalau ada). FAIL-OPEN ke '' — berkas tak ada / tak terbaca TIDAK boleh
  // menggagalkan sinkron aturan; paling buruk .mdc kembali persis seperti perilaku lama.
  // Namanya dibaca dari berkas yang BERLAKU saat ini (lihat migrasi nama di engine/agents-md.mjs).
  const overrideText = readTextSafe(path.join(repoRoot, 'AGENTS.local.md')) || ''

  const content = buildCursorRules({ rulesText, kitPrefix: src.kitPrefix, routingTable, overrideText })
  const bytes = Buffer.byteLength(content, 'utf8')
  const lines = content.split('\n').length
  const overSoftLimit = lines > CURSOR_RULES_SOFT_MAX_LINES
  const targetDir = path.join(repoRoot, '.cursor', 'rules')
  const target = path.join(targetDir, 'lintasai.mdc')
  const existing = readTextSafe(target)
  const exists = existing != null
  const inSync = exists && existing === content

  if (!write) return { present: true, target, exists, inSync, bytes, lines, overSoftLimit }
  if (inSync) return { present: true, target, action: 'current', bytes, lines, overSoftLimit }

  let backup = null
  if (exists && !existing.includes('LINTASAI-CURSOR v1')) {
    backup = `${target}.backup-${backupStamp(new Date())}`
    try { fs.copyFileSync(target, backup) } catch { backup = null }
  }
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
  writeUtf8NoBom(target, content)
  return { present: true, target, action: exists ? 'updated' : 'created', backup, bytes, lines, overSoftLimit }
}

// --- Orkestrasi payung: sinkron/cek adapter (kini hanya Cursor - Codex/Kimi baca AGENTS.md native). ---
// Dipakai perintah CLI `adapter-sync`. write:false = cek sinkron (cuma-baca); write:true = tulis.
// Return { cursor } = hasil runCursorRulesGen (present:false = sumber tak ketemu). TESTABLE.
export function runAllAdaptersSync({ repoRoot = process.cwd(), write = false } = {}) {
  return {
    cursor: runCursorRulesGen({ repoRoot, write }),
  }
}

// Pelapor CLI Cursor (bentuk hasil: present/exists/inSync/action/bytes/backup).
function laporCursor(label, res, write) {
  if (!res.present) { console.log(`${label}: DILEWATI - AGENTS.md tak ketemu.`); return }
  if (!write) {
    if (!res.exists) console.log(`${label}: BELUM ADA - jalankan \`npx lintasai adapter-sync --write\`.`)
    else if (res.inSync) console.log(`${label}: SINKRON (${res.bytes.toLocaleString('en-US')} byte).`)
    else console.log(`${label}: BASI - jalankan \`npx lintasai adapter-sync --write\`.`)
    return
  }
  const act = res.action === 'current' ? 'SUDAH sinkron' : res.action === 'created' ? 'DIBUAT' : 'DIPERBARUI'
  console.log(`${label}: ${act} (${res.bytes.toLocaleString('en-US')} byte).`)
  if (res.backup) console.log(`  Berkas lama dicadangkan ke: ${res.backup}`)
}

// --- CLI: `node engine/adapter-rules-gen.mjs [--project-root <dir>] [--write] [--check]` ---
// Dipicu `npx lintasai adapter-sync` - sinkron/cek berkas aturan Cursor (Codex/Kimi baca AGENTS.md native).
function main() {
  let repoRoot = process.cwd()
  let write = false
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project-root') repoRoot = argv[++i] || repoRoot
    else if (argv[i] === '--write') write = true
    else if (argv[i] === '--check') write = false
  }

  const { cursor } = runAllAdaptersSync({ repoRoot, write })
  if (!cursor.present) {
    console.log(`adapter-sync: DILEWATI - AGENTS.md tak ketemu (root / ${NAMA_FOLDER_KIT}/).`)
    process.exit(0)
  }

  console.log(write
    ? 'adapter-sync (--write): sinkronkan aturan Cursor dari kernel AGENTS.md'
    : 'adapter-sync (cek sinkron, cuma-baca):')
  laporCursor('  Cursor (.cursor/rules/lintasai.mdc)', cursor, write)
  process.exit(0)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
