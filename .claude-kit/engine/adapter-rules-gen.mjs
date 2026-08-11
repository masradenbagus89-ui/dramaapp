#!/usr/bin/env node
// engine/adapter-rules-gen.mjs - Generator berkas aturan untuk alat AI yang TIDAK membaca CLAUDE.md.
// RUMAH BERSAMA 3 generator adapter harness (satu per alat): Kimi (buildKimiAgents/runKimiAgentsGen),
// Cursor (buildCursorRules/runCursorRulesGen), Codex (buildCodexAgents/runCodexAgentsGen). Nama fungsi
// SENGAJA menyebut alatnya masing-masing (bukan warisan) - yang dinetralkan hanya nama berkas payung ini.
// Keluaran: .kimi-code/AGENTS.md (Kimi) · .cursor/rules/lintasai.mdc (Cursor) · blok di AGENTS.md
// akar (Codex, bergerbang batas 32 KiB - lihat blok CURSOR + CODEX di bawah).
// (Pra-v3.0.0 berkas + perintah ini bernama kimi-agents-gen.mjs - warisan "Kimi keluaran pertama";
// ADR-027 Task 17 menetralkannya karena kini melayani 3 alat. Perintah CLI payung: `adapter-sync`.
// Orkestrator ke-3 adapter: runAllAdaptersSync di bawah.)
//
// KENAPA ADA: Claude Code memuat aturan lewat CLAUDE.md (@import CLAUDE_universal_v1.md). Kimi Code
// TIDAK membaca CLAUDE.md dan TIDAK mengenal sintaks @import - tetapi Kimi MEMBACA `AGENTS.md`
// (root + .kimi-code/AGENTS.md) otomatis tiap sesi (dokumentasi resmi MoonshotAI/kimi-code:
// customization/agents). Supaya kualitas kit di Kimi IDENTIK dengan di Claude, aturan yang di Claude
// "selalu-dimuat" (CLAUDE_universal_v1.md) di-SALIN PENUH ke .kimi-code/AGENTS.md - bukan ringkasan,
// supaya tak ada aturan yang tertinggal. Detail per-topik tetap on-demand lewat penunjuk ke rules/.
//
// KENAPA .kimi-code/AGENTS.md (bukan menebalkan AGENTS.md root): Claude TIDAK membaca folder
// .kimi-code/, jadi salinan penuh ini TIDAK membebani sesi Claude (nol dobel). Root AGENTS.md tetap
// tipis (override proyek) dan dibaca KEDUA alat.
//
// SIFAT: DETERMINISTIK (isi = salinan literal sumber + header tetap) -> regenerate selalu identik,
// mustahil basi. Artefak GENERATED (gitignored di repo kit; dibuat saat install ke client; REGENERATE
// saat update). Diukur byte UTF-8. present:false = sumber tak ketemu (auto-skip anggun).
//
// TERUJI: buildKimiAgents PURE + runAllAdaptersSync (isi disuntik) - tests/adapter-rules-gen.test.mjs.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripBom, readTextSafe, writeUtf8NoBom, backupStamp } from './fs-text.mjs'

// Penanda berkas generated (dipakai untuk membedakan "digest kita" vs berkas asing yang diedit tangan).
export const KIMI_AGENTS_MARKER = '<!-- KIMI-AGENTS v1 - DIBUAT OTOMATIS oleh lintasAI - JANGAN edit tangan -->'

// PURE: bangun isi .kimi-code/AGENTS.md dari teks aturan sumber. DISUNTIK di tes (tak menyentuh disk).
// kitPrefix: '' saat sumber = root repo kit; '.claude-kit/' saat sumber = di dalam project client.
export function buildKimiAgents({ rulesText, kitPrefix = '.claude-kit/' } = {}) {
  const rules = stripBom(String(rulesText == null ? '' : rulesText)).replace(/\s+$/, '')
  const header = [
    KIMI_AGENTS_MARKER,
    '',
    '# Aturan Kerja lintasAI - untuk Kimi Code CLI',
    '',
    '> Berkas ini DIBUAT OTOMATIS dari `' + kitPrefix + 'CLAUDE_universal_v1.md` dan dibaca Kimi Code',
    '> otomatis tiap sesi. Isinya = aturan kerja tim yang **IDENTIK** dengan yang dipakai di Claude Code',
    '> (tak ada yang dipangkas). JANGAN edit berkas ini dengan tangan - akan ditimpa saat update kit.',
    '>',
    '> **AI: baca `' + kitPrefix + 'PETA.md` PERTAMA** untuk tahu "apa di mana" (fungsi tiap folder +',
    '> daftar skill) + ke mana menaruh berkas baru (struktur-hygiene). PETA di-generate otomatis; di sini',
    '> ia DIRUJUK (bukan disalin) supaya tak pernah basi.',
    '>',
    '> Rincian per-topik dibaca ON-DEMAND (pakai tool Read saat tugas cocok pemicunya, jangan dimuat',
    '> sekaligus): daftar isi di `' + kitPrefix + 'rules/INDEX.md`, lalu baca berkas seksi',
    '> `' + kitPrefix + 'rules/<nomor>-*.md` yang relevan.',
    '',
    '---',
    '',
    '',
  ].join('\n')
  return header + rules + '\n'
}

// ===========================================================================================
// CURSOR + CODEX (v4 Tugas 10) - alat AI ketiga & keempat. Reuse-first: generator yang sama,
// keluaran berbeda. TIDAK ada generator baru (§5 reuse > duplikasi).
//
// LANGKAH NOL (wajib sebelum menulis kode ini) - diverifikasi 2026-07-20 ke dokumentasi RESMI,
// bukan dari ingatan (§8.2 A3):
//   Codex  : https://learn.chatgpt.com/docs/agent-configuration/agents-md
//            "Starting at the project root (typically the Git root), Codex walks down to your
//            current working directory." -> AGENTS.md akar project DIBACA OTOMATIS. Tak butuh
//            frontmatter. TAPI: "Codex ... stops adding files once the combined size reaches the
//            limit defined by `project_doc_max_bytes` (32 KiB by default)."
//   Cursor : https://cursor.com/docs/context/rules
//            "Project rules live in `.cursor/rules` as `.mdc` files and are version-controlled."
//            alwaysApply: true -> "Always included. Globs and description are ignored."
//            Anjuran (bukan batas keras): "Keep rules under 500 lines".
//
// AKIBATNYA UNTUK CODEX: berkas aturan kit saat ini ~91 KiB = ~2,9x batas 32 KiB. Dokumentasi
// TIDAK menyatakan apa yang terjadi pada satu berkas yang sendirian melewati batas (terpotong?
// dilewati?) - dan menebaknya dilarang (§8.2 A1). Jadi penulisan ke AGENTS.md akar DIGERBANG:
// hanya jalan kalau hasilnya MUAT. Selama tidak muat, berkas client TIDAK disentuh sama sekali
// dan `doctor` melaporkannya terus terang. Ini keputusan owner 2026-07-20 (ADR-024): membangun
// mesin + penjaganya sekarang, menyalakan penulisannya setelah inti diramping (Tugas 16).
// Gerbang ini juga yang mencegah mode gagal terburuk: client mengira aturannya sampai, padahal
// separuhnya terpotong diam-diam.

// Batas ukuran gabungan instruksi project Codex (`project_doc_max_bytes`, bawaan 32 KiB).
export const CODEX_DOC_MAX_BYTES = 32 * 1024

// Anjuran panjang berkas aturan Cursor (BUKAN batas keras - melewatinya tidak menggagalkan apa pun).
export const CURSOR_RULES_SOFT_MAX_LINES = 500

export const CURSOR_RULES_MARKER = '<!-- LINTASAI-CURSOR v1 - DIBUAT OTOMATIS oleh lintasAI - JANGAN edit tangan -->'
export const CODEX_AGENTS_MARKER = '<!-- LINTASAI-CODEX v1 - DIBUAT OTOMATIS oleh lintasAI - JANGAN edit tangan -->'

// PURE: bangun isi .cursor/rules/lintasai.mdc. Frontmatter `alwaysApply: true` = ikut TIAP sesi chat.
export function buildCursorRules({ rulesText, kitPrefix = '.claude-kit/' } = {}) {
  const rules = stripBom(String(rulesText == null ? '' : rulesText)).replace(/\s+$/, '')
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
    '> Berkas ini DIBUAT OTOMATIS dari `' + kitPrefix + 'CLAUDE_universal_v1.md`. Karena',
    '> `alwaysApply: true`, isinya ikut di SETIAP sesi chat Cursor. Isinya **IDENTIK** dengan aturan',
    '> yang dipakai di Claude Code (tak ada yang dipangkas). JANGAN edit dengan tangan - akan ditimpa',
    '> saat update kit.',
    '>',
    '> BATAS JUJUR: Cursor TIDAK punya sistem hook, jadi palang mesin lintasAI (Palang Rem, Palang',
    '> Rak, Lampu Hijau plan mode) TIDAK berlaku di sini. Yang sampai = teks aturannya saja.',
    '>',
    '> **AI: baca `' + kitPrefix + 'PETA.md` PERTAMA** untuk tahu "apa di mana" (fungsi tiap folder +',
    '> daftar skill) + ke mana menaruh berkas baru. PETA DIRUJUK (bukan disalin) supaya tak basi.',
    '>',
    '> Rincian per-topik dibaca ON-DEMAND (pakai tool baca berkas saat tugas cocok pemicunya, jangan',
    '> dimuat sekaligus): daftar isi di `' + kitPrefix + 'rules/INDEX.md`.',
    '',
    'Baca berkas peta ini lebih dulu (Cursor menarik isinya sebagai konteks):',
    '',
    '@' + kitPrefix + 'PETA.md',
    '',
    '---',
    '',
    '',
  ].join('\n')
  return header + rules + '\n'
}

// PURE: bangun isi AGENTS.md akar untuk Codex = delta project yang SUDAH ADA + blok aturan ber-penanda.
// projectDelta dipertahankan apa adanya (jangan pernah menghapus kustomisasi client); blok lama
// ber-penanda dibuang dulu supaya regenerate idempoten (tak menumpuk).
export function buildCodexAgents({ rulesText, kitPrefix = '.claude-kit/', projectDelta = '' } = {}) {
  const rules = stripBom(String(rulesText == null ? '' : rulesText)).replace(/\s+$/, '')
  const delta = stripPrevCodexBlock(projectDelta)
  const header = [
    CODEX_AGENTS_MARKER,
    '',
    '# Aturan Kerja lintasAI - blok untuk Codex',
    '',
    '> Blok ini DIBUAT OTOMATIS dari `' + kitPrefix + 'CLAUDE_universal_v1.md` dan ditempel di bawah',
    '> aturan khusus project di atas. Codex membaca `AGENTS.md` akar project otomatis tiap sesi.',
    '> JANGAN edit blok ini dengan tangan - akan ditimpa saat update kit. Yang di ATAS penanda aman',
    '> untuk diedit: itu milik project.',
    '>',
    '> **AI: baca `' + kitPrefix + 'PETA.md` PERTAMA** untuk tahu "apa di mana" (fungsi tiap folder +',
    '> daftar skill) + ke mana menaruh berkas baru. PETA DIRUJUK (bukan disalin) supaya tak basi.',
    '>',
    '> BATAS JUJUR: Codex TIDAK punya sistem hook, jadi palang mesin lintasAI TIDAK berlaku di sini.',
    '',
    '---',
    '',
    '',
  ].join('\n')
  const atas = delta ? delta.replace(/\s+$/, '') + '\n\n' : ''
  return atas + header + rules + '\n'
}

// Buang blok generated lama (dari penanda sampai akhir berkas) supaya regenerate tak menumpuk.
function stripPrevCodexBlock(text) {
  const t = stripBom(String(text == null ? '' : text))
  const i = t.indexOf(CODEX_AGENTS_MARKER)
  return i < 0 ? t : t.slice(0, i)
}

// Orkestrasi Cursor: tulis .cursor/rules/lintasai.mdc. Pola sama seperti runKimiAgentsGen.
export function runCursorRulesGen({ repoRoot = process.cwd(), write = false } = {}) {
  const src = findRulesSource(repoRoot)
  if (!src) return { present: false }

  const rulesText = readTextSafe(src.path)
  if (rulesText == null) return { present: false }

  const content = buildCursorRules({ rulesText, kitPrefix: src.kitPrefix })
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

// Orkestrasi Codex: tulis blok aturan ke AGENTS.md akar - TAPI HANYA kalau muat di bawah 32 KiB.
// Tidak muat -> fits:false dan berkas TIDAK disentuh sama sekali (bukan ditulis-lalu-berharap).
export function runCodexAgentsGen({ repoRoot = process.cwd(), write = false } = {}) {
  const src = findRulesSource(repoRoot)
  if (!src) return { present: false }

  const rulesText = readTextSafe(src.path)
  if (rulesText == null) return { present: false }

  const target = path.join(repoRoot, 'AGENTS.md')
  const existing = readTextSafe(target)
  const exists = existing != null

  const content = buildCodexAgents({ rulesText, kitPrefix: src.kitPrefix, projectDelta: exists ? existing : '' })
  const bytes = Buffer.byteLength(content, 'utf8')
  const capBytes = CODEX_DOC_MAX_BYTES
  const fits = bytes <= capBytes
  const inSync = exists && existing === content

  // GERBANG: melebihi batas Codex -> JANGAN tulis. Aturan terpotong diam-diam lebih berbahaya
  // daripada aturan yang jelas-jelas belum terpasang (§8.2 A4).
  if (!fits) {
    return { present: true, target, exists, fits: false, bytes, capBytes, action: 'ditahan-terlalu-besar' }
  }

  if (!write) return { present: true, target, exists, inSync, fits: true, bytes, capBytes }
  if (inSync) return { present: true, target, action: 'current', fits: true, bytes, capBytes }

  let backup = null
  if (exists) {
    backup = `${target}.backup-${backupStamp(new Date())}`
    try { fs.copyFileSync(target, backup) } catch { backup = null }
  }
  writeUtf8NoBom(target, content)
  return { present: true, target, action: exists ? 'updated' : 'created', backup, fits: true, bytes, capBytes }
}

// Cari sumber aturan: root repo kit ATAU di dalam project client (.claude-kit/). Return {path, kitPrefix} atau null.
export function findRulesSource(repoRoot = process.cwd()) {
  const atRoot = path.join(repoRoot, 'CLAUDE_universal_v1.md')
  const atClient = path.join(repoRoot, '.claude-kit', 'CLAUDE_universal_v1.md')
  if (fs.existsSync(atRoot)) return { path: atRoot, kitPrefix: '' }
  if (fs.existsSync(atClient)) return { path: atClient, kitPrefix: '.claude-kit/' }
  return null
}

// Orkestrasi untuk CLI + preflight. write:false = cek sinkron (read-only); write:true = tulis berkas.
// present:false = sumber tak ketemu (auto-skip anggun).
export function runKimiAgentsGen({ repoRoot = process.cwd(), write = false } = {}) {
  const src = findRulesSource(repoRoot)
  if (!src) return { present: false }

  const rulesText = readTextSafe(src.path)
  if (rulesText == null) return { present: false }

  const content = buildKimiAgents({ rulesText, kitPrefix: src.kitPrefix })
  const bytes = Buffer.byteLength(content, 'utf8')
  const targetDir = path.join(repoRoot, '.kimi-code')
  const target = path.join(targetDir, 'AGENTS.md')
  const existing = readTextSafe(target)
  const exists = existing != null
  const inSync = exists && existing === content

  if (!write) {
    return { present: true, target, exists, inSync, bytes }
  }

  if (inSync) return { present: true, target, action: 'current', bytes }

  // Berkas ada tapi BUKAN hasil generate kita (diedit tangan / berkas asing) -> cadangkan dulu.
  let backup = null
  if (exists && !existing.includes('KIMI-AGENTS v1')) {
    backup = `${target}.backup-${backupStamp(new Date())}`
    try { fs.copyFileSync(target, backup) } catch { backup = null }
  }
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
  writeUtf8NoBom(target, content)
  return { present: true, target, action: exists ? 'updated' : 'created', backup, bytes }
}

// --- Orkestrasi payung: sinkron/cek KETIGA adapter (Kimi + Cursor + Codex) sekaligus. ---
// Dipakai perintah CLI `adapter-sync`. write:false = cek sinkron (cuma-baca);
// write:true = tulis. Return { kimi, cursor, codex } = hasil masing-masing run*Gen (present:false =
// sumber tak ketemu). TESTABLE (tak menyentuh proses) - main() di bawah tinggal mencetak hasilnya.
export function runAllAdaptersSync({ repoRoot = process.cwd(), write = false } = {}) {
  return {
    kimi: runKimiAgentsGen({ repoRoot, write }),
    cursor: runCursorRulesGen({ repoRoot, write }),
    codex: runCodexAgentsGen({ repoRoot, write }),
  }
}

// Pelapor CLI untuk Kimi & Cursor (bentuk hasil sama: present/exists/inSync/action/bytes/backup).
function laporKimiCursor(label, res, write) {
  if (!res.present) { console.log(`${label}: DILEWATI - CLAUDE_universal_v1.md tak ketemu.`); return }
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

// Pelapor CLI untuk Codex (punya gerbang 32 KiB: fits:false = ditahan, berkas TIDAK disentuh).
function laporCodex(label, res, write) {
  if (!res.present) { console.log(`${label}: DILEWATI - CLAUDE_universal_v1.md tak ketemu.`); return }
  if (res.fits === false) {
    const lebih = (res.bytes - res.capBytes).toLocaleString('en-US')
    console.log(`${label}: DITAHAN - ${res.bytes.toLocaleString('en-US')} byte > batas Codex ${res.capBytes.toLocaleString('en-US')} byte (kelebihan ${lebih}). AGENTS.md tidak disentuh.`)
    return
  }
  if (!write) {
    console.log(res.inSync
      ? `${label}: SINKRON (${res.bytes.toLocaleString('en-US')} byte, muat).`
      : `${label}: BASI - jalankan \`npx lintasai adapter-sync --write\`.`)
    return
  }
  const act = res.action === 'current' ? 'SUDAH sinkron' : res.action === 'created' ? 'DIBUAT' : 'DIPERBARUI'
  console.log(`${label}: ${act} (${res.bytes.toLocaleString('en-US')} byte).`)
  if (res.backup) console.log(`  AGENTS.md lama dicadangkan ke: ${res.backup}`)
}

// --- CLI: `node engine/adapter-rules-gen.mjs [--project-root <dir>] [--write] [--check]` ---
// Dipicu `npx lintasai adapter-sync` - sinkron/cek 3 berkas aturan adapter.
function main() {
  let repoRoot = process.cwd()
  let write = false
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project-root') repoRoot = argv[++i] || repoRoot
    else if (argv[i] === '--write') write = true
    else if (argv[i] === '--check') write = false
  }

  const { kimi, cursor, codex } = runAllAdaptersSync({ repoRoot, write })
  if (!kimi.present && !cursor.present && !codex.present) {
    console.log('adapter-sync: DILEWATI - CLAUDE_universal_v1.md tak ketemu (root / .claude-kit/).')
    process.exit(0)
  }

  console.log(write
    ? 'adapter-sync (--write): sinkronkan aturan untuk 3 alat AI (Kimi, Cursor, Codex)'
    : 'adapter-sync (cek sinkron, cuma-baca):')
  laporKimiCursor('  Kimi   (.kimi-code/AGENTS.md)', kimi, write)
  laporKimiCursor('  Cursor (.cursor/rules/lintasai.mdc)', cursor, write)
  laporCodex('  Codex  (AGENTS.md akar)', codex, write)
  process.exit(0)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
