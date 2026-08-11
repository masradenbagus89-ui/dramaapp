#!/usr/bin/env node
// tests/preflight.mjs - "Gerbang Pra-Rilis 1-perintah" (LAPIS 2 cetak-biru docs/plans/BUKU_PELAJARAN_DAN_PREFLIGHT.md).
//
// TUJUAN (WHY): selama ini pemeriksa (tes Node, ESLint, Pester, robot kecocokan, smoke, pemindai
//   Unicode) dijalankan MANUAL satu-satu -> gampang "lupa cek sesuatu", dan tak ada cek KELENGKAPAN
//   RILIS (mis. versi naik tapi CHANGELOG belum punya entrinya). Berkas ini menggabung SEMUA jadi
//   satu perintah `npm run preflight` + menambah cek kelengkapan rilis, lalu memilah hasil jadi
//   GENTING / PENTING / RAPIKAN dengan satu exit-code. Itu yang dipakai sebagai "gerbang sebelum
//   menyatakan selesai/rilis" (CLAUDE_universal_v1.md sec. 4.6).
//
// KEPUTUSAN OWNER (2026-06-24, Tahap A):
//   - CAKUPAN: "Node dulu, PowerShell kalau ada". Bagian Node SELALU jalan; bagian PowerShell
//     (Pester + smoke) otomatis DILEWATI dengan PERINGATAN JELAS (level PENTING) kalau PowerShell
//     (pwsh/powershell) tidak terpasang. Ramah mesin minim + tetap jujur "belum tercek".
//   - PEMBLOKIR: hanya GENTING yang MENGHENTIKAN (exit !=0) saat kerja harian. PENTING & RAPIKAN =
//     peringatan (tetap exit 0). Mode `--strict` (dipakai saat MAU RILIS) juga menghentikan PENTING.
//   - Terpasang di CI (.github/workflows/validate.yml, job `preflight`) + tersambung ke dispatcher (`npx lintasai preflight` via bin/lintasai.js).
//
// REUSE (anti-duplikasi, CLAUDE_universal sec. 5): robot kecocokan + pemindai Unicode + parser
//   CHANGELOG di-IMPORT dari lib/ (fungsi murni cuma-baca yang sudah teruji), BUKAN ditulis ulang.
//   Tes Node / ESLint / Pester / smoke di-SPAWN sebagai proses terpisah (pakai exit-code-nya).
//
// AMAN dari rekursi: berkas ini BUKAN '*.test.mjs' -> tidak ikut dijalankan `npm test`. Saat di-import
//   (oleh tests/preflight.test.mjs untuk menguji fungsinya), main() TIDAK jalan (dijaga isMain).
//   Tes pengunci HANYA memanggil fungsi murni (classify, checkReleaseCompleteness, dll), TIDAK
//   memanggil runPreflight() -> tak ada "preflight memanggil tes yang memanggil preflight".
//
// Versi: 1 - 2026-06-24

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { invokeLintasConsistencyCheckKit, invokeLintasConsistencyCheckProject } from '../engine/consistency-check.mjs'
import { scan as unicodeScan } from '../engine/unicode-safety-check.mjs'
import { getKitVersionFromChangelog } from '../engine/version-detect.mjs'
import { stripBom } from '../engine/fs-text.mjs'
import { runPerfBudget, fmtKb } from '../engine/perf-budget.mjs'
import { runRulesBudget, runAlwaysLoadBudget, CHARS_PER_TOKEN } from '../engine/rules-budget-check.mjs'
import { runRulesRefCheck } from '../engine/rules-ref-check.mjs'
import { runToolReachCheck } from '../engine/tool-reach-check.mjs'
import { runSkillFormatCheck } from '../engine/skill-format-check.mjs'
import { scanSkills } from '../engine/skill-registry.mjs'
import { bangunPeta, scanStrukturRepo, normalisasiPeta } from '../engine/peta-gen.mjs'
import { getLintasAiConfigTarget, invokeLintasAiConfigCheck } from '../engine/ai-config-check.mjs'
import { runSwallowedErrorCheck } from '../engine/swallowed-error-check.mjs'
import { runComplexityBudget } from '../engine/complexity-budget.mjs'
import { compareEnvKeys } from '../engine/env-keys-check.mjs'
import { invokeLintasStackCheck } from '../engine/stack-check.mjs'
import { LINTAS_EXPECTED_SCHEMA } from '../engine/expected-schema.mjs'

// Tingkat keseriusan (bahasa non-programmer, sec. 2.1 #7 - bukan P0/Critical/High).
//   GENTING = wajib diperbaiki, menghentikan gerbang. PENTING = saran kuat (menghentikan saat --strict).
//   RAPIKAN = enak kalau dibereskan, tak pernah menghentikan. OK = lulus. INFO = konteks, tak dihitung.
export const LEVEL = { OK: 'OK', GENTING: 'GENTING', PENTING: 'PENTING', RAPIKAN: 'RAPIKAN', INFO: 'INFO' }

// ---------------------------------------------------------------------------
// Util kecil
// ---------------------------------------------------------------------------

// Akar repo default = folder induk dari tests/ (tempat package.json kit/project berada).
export function defaultRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
}

function readText(p) {
  return stripBom(fs.readFileSync(p, 'utf8')) // cermin ReadAllText UTF-8 (buang BOM)
}

function readPackageJson(repoRoot) {
  try { return JSON.parse(readText(path.join(repoRoot, 'package.json'))) } catch { return {} }
}

// Buang kode warna ANSI (mis. "[32m"). WHY: saat output PowerShell/Pester di-PIPE (bukan layar),
// Pester TETAP menyisipkan kode warna -> menyela baris ringkasan ("Tests Passed: 677, <ANSI>Failed: 0")
// sehingga regex penghitung GAGAL (tampil "?"). Karakter ESC dibangun via String.fromCharCode(27)
// (BUKAN regex literal) supaya tidak melanggar aturan ESLint no-control-regex.
const ANSI_RX = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g')
export function stripAnsi(s) { return String(s || '').replace(ANSI_RX, '') }

// Ambil N baris terakhir sebuah teks (untuk menampilkan ekor output saat sebuah pemeriksa gagal),
// sudah bersih dari kode warna ANSI supaya laporan rapi terbaca.
function tailLines(s, n) {
  return stripAnsi(s).split(/\r?\n/).filter((l) => l.length > 0).slice(-n).join('\n')
}

// Jalankan perintah eksternal dengan AMAN. WHY: spawnSync JARANG melempar (hanya argumen invalid);
// untuk error proses (ENOENT command tak ada, ENOBUFS output melebihi maxBuffer, ETIMEDOUT timeout) ia
// TIDAK melempar - melainkan mengembalikan { status: null, error, signal } (terbukti uji empiris 2026-06-24).
// Helper ini menyeragamkan: kalau spawnSync MELEMPAR (langka) -> dibungkus jadi objek yang sama. maxBuffer
// 64MB karena Pester Detailed / node:test bisa ber-output banyak.
function runCmd(exe, args, opts = {}) {
  try {
    return spawnSync(exe, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts })
  } catch (e) {
    return { status: null, stdout: '', stderr: '', error: e }
  }
}

// Apakah perintah GAGAL DIJALANKAN (beda dari "jalan tapi tesnya gagal")? true kalau spawnSync melempar,
// proses dihentikan, atau status null (ENOENT/ENOBUFS-overflow/timeout/sinyal). Untuk GERBANG ini WAJIB
// jadi GENTING dengan pesan JELAS - BUKAN diam-diam OK (fail-closed) dan BUKAN bikin preflight crash.
function cmdNotRun(r) {
  return Boolean(r.error) || r.status === null || r.status === undefined
}
// Pesan error proses dalam BAHASA AWAM (#2, keputusan owner 2026-06-24): kode sistem mentah seperti
// "ENOENT" bikin staff non-programmer bingung. Terjemahkan ke kalimat + selipkan kode asli dalam kurung
// untuk diagnosa programmer. Kode tak dikenal -> tampil apa adanya (tak crash, tetap jujur).
const ERR_AWAM = {
  ENOENT: 'perintahnya tak ditemukan - program seperti Node/git/PowerShell mungkin belum terpasang',
  ENOBUFS: 'keluaran terlalu besar (membludak melewati batas)',
  ETIMEDOUT: 'kelamaan - melewati batas waktu (timeout)',
  EACCES: 'akses ditolak - izin kurang',
}
export function cmdErrMsg(r) {
  if (r.error) {
    const code = r.error.code
    if (code && ERR_AWAM[code]) return `${ERR_AWAM[code]} (${code})`
    return code || r.error.message
  }
  if (r.signal) return `proses dihentikan paksa (sinyal ${r.signal}) - mungkin keluaran melebihi batas / kelamaan`
  return 'proses tak mengembalikan kode hasil'
}

// Bandingkan dua versi semver "X.Y.Z". Return -1 (A<B) / 0 (sama) / 1 (A>B). Non-versi -> 0.
export function cmpSemver(a, b) {
  const pa = String(a).split('.').map((x) => parseInt(x, 10))
  const pb = String(b).split('.').map((x) => parseInt(x, 10))
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0
    const y = pb[i] || 0
    if (x < y) return -1
    if (x > y) return 1
  }
  return 0
}

// v2.0.0: deteksi PowerShell (findPowerShell) + jalur smoke-fast.ps1/Pester DIHAPUS - kit 100% Node.
// Preflight kini Node-murni secara konstruksi (tes Node + ESLint + robot kecocokan + Unicode + smoke
// Node lewat tests/smoke-portable.test.mjs yang ikut node:test). Tak ada lagi bagian PowerShell.

// ---------------------------------------------------------------------------
// Helper CHANGELOG (fungsi MURNI -> mudah diuji tanpa menjalankan apa pun)
// ---------------------------------------------------------------------------

// Pola heading versi CHANGELOG: terima "## [X.Y.Z]" (Keep-a-Changelog) DAN "## vX.Y.Z" (lama).
const RX_CHANGELOG_HEADING = /^##\s+\[?v?\d+\.\d+\.\d+/

// Ambil BLOK entri teratas CHANGELOG: dari heading versi PERTAMA sampai SEBELUM heading versi berikutnya.
// Return null kalau tak ada heading versi sama sekali. Dipakai untuk cek "isi entri" + label [BREAKING].
export function getTopChangelogBlock(text) {
  const lines = String(text || '').split(/\r\n|\r|\n/)
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (RX_CHANGELOG_HEADING.test(lines[i])) { start = i; break }
  }
  if (start < 0) return null
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (RX_CHANGELOG_HEADING.test(lines[i])) { end = i; break }
  }
  return lines.slice(start, end).join('\n')
}

// Apakah blok entri masih berisi TEKS-CONTOH dari kerangka bump (Add-LintasChangelogSkeleton di
// consistency-check.ps1)? Kalau ya -> entri belum diisi manusia. Pola sengaja spesifik pada
// placeholder kerangka (pakai kurung-siku < >) supaya tak salah-tangkap prosa biasa.
export function hasChangelogPlaceholder(block) {
  if (!block) return false
  return /<ISI deskripsi|<Diubah\/Ditambah\/Diperbaiki>|<ringkas apa yang berubah/.test(block)
}

// ---------------------------------------------------------------------------
// Cek KELENGKAPAN RILIS (bagian BARU & paling berharga - fungsi MURNI cuma-baca).
// lastTag = tag git terbaru (mis. "v1.57.1") atau null kalau git tak tersedia.
// ---------------------------------------------------------------------------
// mode='kit' (default): version + CHANGELOG WAJIB -> ketiadaan/drift = GENTING (memblokir).
// mode='project' (klien): banyak app klien tak pakai versi/CHANGELOG formal -> ketiadaannya = INFO
//   (lewati, bukan masalah); kalau KEDUANYA ada tapi entri drift = PENTING (saran kuat, tetap blokir
//   saat --strict/rilis, tapi tak memblokir kerja harian klien). Default 'kit' menjaga perilaku lama.
export function checkReleaseCompleteness(repoRoot, { lastTag = null, mode = 'kit' } = {}) {
  const out = []
  const pkg = readPackageJson(repoRoot)
  const version = pkg.version
  const clPath = path.join(repoRoot, 'CHANGELOG.md')
  const missingLevel = mode === 'kit' ? LEVEL.GENTING : LEVEL.INFO   // tak ada versi/CHANGELOG
  const driftLevel = mode === 'kit' ? LEVEL.GENTING : LEVEL.PENTING  // entri tak cocok versi

  if (!version) {
    out.push({
      id: 'cl-versi', label: 'Versi package.json', level: missingLevel,
      detail: mode === 'kit' ? 'field "version" tak ada di package.json.' : 'tak ada field "version" di package.json - cek kelengkapan rilis dilewati (project tanpa versi formal).',
    })
    return out
  }
  if (!fs.existsSync(clPath)) {
    out.push({
      id: 'cl-ada', label: 'CHANGELOG.md ada', level: missingLevel,
      detail: mode === 'kit' ? 'CHANGELOG.md tidak ditemukan - tak bisa cek kelengkapan rilis.' : 'tak ada CHANGELOG.md - cek kelengkapan rilis dilewati (project tanpa CHANGELOG formal).',
    })
    return out
  }

  const clText = readText(clPath)
  const topVerRaw = getKitVersionFromChangelog(clPath)            // "vX.Y.Z" atau null
  const topVer = topVerRaw ? topVerRaw.replace(/^v/, '') : null

  // CL-1: entri teratas CHANGELOG = versi package.json (entri rilis SUDAH ditulis).
  if (topVer === version) {
    out.push({ id: 'cl-versi', label: `Entri CHANGELOG utk v${version}`, level: LEVEL.OK, detail: 'ada (entri teratas).' })
  } else {
    out.push({
      id: 'cl-versi', label: `Entri CHANGELOG utk v${version}`, level: driftLevel,
      detail: `Versi package.json = ${version}, tapi entri teratas CHANGELOG = ${topVer ?? '(tak ada)'}. Tambah entri CHANGELOG utk v${version} sebelum rilis.`,
    })
  }

  // CL-2: entri teratas tidak lagi berisi teks-contoh kerangka bump (sudah ditulis manusia).
  const block = getTopChangelogBlock(clText)
  if (block && hasChangelogPlaceholder(block)) {
    out.push({
      id: 'cl-isi', label: 'Isi entri CHANGELOG teratas', level: LEVEL.PENTING,
      detail: 'Entri teratas masih berisi teks-contoh dari kerangka bump (mis. "<ISI deskripsi...>"). Ganti dengan deskripsi nyata sebelum rilis.',
    })
  } else {
    out.push({ id: 'cl-isi', label: 'Isi entri CHANGELOG teratas', level: LEVEL.OK, detail: 'sudah terisi (tak ada teks-contoh).' })
  }

  // CL-3 + breaking: butuh tag git pembanding.
  if (lastTag) {
    const tagNorm = lastTag.replace(/^v/, '')
    const c = cmpSemver(version, tagNorm)
    if (c > 0) {
      out.push({ id: 'rilis-vs-tag', label: 'Versi vs tag terakhir', level: LEVEL.INFO, detail: `versi ${version} > tag ${lastTag}: ada rilis tertunda untuk v${version}.` })
      // Aturan sec. 11: perubahan [BREAKING] WAJIB menaikkan angka BESAR (major). Cek di blok entri teratas saja.
      const hasBreaking = block ? /\[BREAKING\]/.test(block) : false
      const majorBumped = (parseInt(version.split('.')[0], 10) || 0) > (parseInt(tagNorm.split('.')[0], 10) || 0)
      if (hasBreaking && !majorBumped) {
        out.push({
          id: 'breaking-versi', label: 'Breaking tanpa naik BESAR', level: LEVEL.PENTING,
          detail: `Entri v${version} mengandung [BREAKING] tapi angka BESAR tak naik dari ${lastTag}. Aturan sec. 11: breaking WAJIB menaikkan angka BESAR (mis. 1.x -> 2.0).`,
        })
      }
    } else if (c === 0) {
      out.push({ id: 'rilis-vs-tag', label: 'Versi vs tag terakhir', level: LEVEL.INFO, detail: `versi ${version} == tag terakhir ${lastTag} (sudah dirilis).` })
    } else {
      out.push({
        id: 'rilis-vs-tag', label: 'Versi vs tag terakhir', level: LEVEL.PENTING,
        detail: `versi package.json ${version} LEBIH RENDAH dari tag terakhir ${lastTag} (downgrade?). Cek apakah disengaja.`,
      })
    }
  } else {
    out.push({ id: 'rilis-vs-tag', label: 'Versi vs tag terakhir', level: LEVEL.INFO, detail: 'tag git tidak tersedia - banding versi dilewati.' })
  }

  return out
}

// ---------------------------------------------------------------------------
// Penjaga Keranjang 1 (Langkah 4 rencana docs/plans/STRATEGI_UPDATE_v2.md §3+§7):
// menaikkan angka peta versi-diharapkan (engine/expected-schema.mjs) = mengubah FORMAT artefak klien
// = kelas migrasi WAJIB-LANGSUNG (eager) -> entri CHANGELOG teratas WAJIB ber-label [BREAKING]
// (+ sebut nama artefaknya + punya "Migration Steps"). Tanpa kunci mesin ini, kenaikan angka bisa
// terselip di rilis biasa -> klien lama divonis TAK COCOK tanpa jalan keluar ("bom waktu" §5 risiko).
// ---------------------------------------------------------------------------

// Ambil peta { 'artefak': angka } dari TEKS SUMBER expected-schema.mjs. MURNI. Parse dibatasi ke
// DALAM blok `Object.freeze({...})` supaya penyebutan 'nama': angka di komentar luar blok tak ikut.
// Return null kalau bentuk berkas berubah total (pemanggil fail-closed, bukan diam-diam kosong).
export function parseExpectedSchemaSource(sourceText) {
  const s = String(sourceText || '')
  const start = s.indexOf('LINTAS_EXPECTED_SCHEMA = Object.freeze({')
  if (start < 0) return null
  const end = s.indexOf('})', start)
  if (end < 0) return null
  const map = {}
  for (const m of s.slice(start, end).matchAll(/'([^'\n]+)':\s*(\d+)/g)) map[m[1]] = Number(m[2])
  return map
}

// Inti MURNI: banding peta SEKARANG vs BASELINE (peta di rilis/tag terakhir) + periksa entri
// CHANGELOG teratas. Aturan kenaikan:
//   - entri LAMA yang angkanya NAIK = kenaikan (klien lama harus migrasi);
//   - entri BARU bernilai 1 = kelahiran artefak (bukan kenaikan - tak ada format lama yang tabrakan);
//   - entri BARU bernilai >1 = diperlakukan kenaikan (fail-closed: artefak bisa saja SUDAH ada di
//     project klien sebelum masuk peta - mis. catatan-pasang lahir jauh sebelum peta dibuat).
// baseline null = peta belum ada di rilis terakhir -> semua entri dinilai dgn aturan "entri BARU".
// `upgradingText` = isi UPGRADING.md (null kalau berkas tak ada) - saat ada kenaikan, tiap artefak
// yang naik WAJIB disebut di sana (buku panduan pindah-versi, Langkah 5 rencana / §6 disiplin rilis).

// Ambil bagian "## Riwayat pindah-versi" dari UPGRADING.md. HANYA bagian ini yang dihitung sebagai
// entri migrasi NYATA - teks kerangka-contoh di bagian atas berkas menyebut nama artefak sebagai
// CONTOH (mis. "mis. project.lintas.jsonc v1 -> v2"), jadi mencari di SELURUH berkas = penjaga
// puas-palsu sejak hari pertama (temuan cek-silang 2026-07-09: 2 dari 3 artefak peta "tersebut"
// oleh kerangka). Return: null kalau teks null; '' kalau heading tak ada (fail-closed = dianggap
// belum ada entri, JANGAN jatuh ke seluruh-teks); selain itu potongan dari heading sampai akhir.
export function getUpgradingHistorySection(upgradingText) {
  if (upgradingText == null) return null
  const s = String(upgradingText)
  const m = s.match(/^##\s+Riwayat pindah-versi.*$/mi)
  return m ? s.slice(s.indexOf(m[0])) : ''
}

export function evaluateSchemaRaise({ current, baseline, changelogBlock, upgradingText = null }) {
  const out = []
  const cur = current || {}
  const base = baseline || {}
  const raised = []
  for (const [artifact, value] of Object.entries(cur)) {
    const baseVal = Object.prototype.hasOwnProperty.call(base, artifact) ? base[artifact] : null
    if (baseVal !== null ? value > baseVal : value > 1) raised.push({ artifact, from: baseVal, to: value })
  }
  // Arah SEBALIKNYA juga diawasi (temuan cek-silang 2026-07-09 - dulu lolos senyap sbg "OK"):
  // angka TURUN / entri HILANG dari peta itu jarang sah - biasanya salah-ketik / revert tak sengaja.
  // Bukan GENTING (klien tak langsung rusak: pemeriksa pakai >=, format baru tetap diterima) tapi
  // WAJIB kelihatan: entri yang hilang = artefak berhenti dipantau robot laporan-migrasi diam-diam.
  const shrunk = []
  for (const [artifact, baseVal] of Object.entries(base)) {
    if (!Object.prototype.hasOwnProperty.call(cur, artifact)) shrunk.push(`${artifact} (${baseVal} -> hilang dari peta)`)
    else if (cur[artifact] < baseVal) shrunk.push(`${artifact} (${baseVal} -> ${cur[artifact]})`)
  }
  if (shrunk.length > 0) {
    out.push({
      id: 'skema-turun', label: 'Angka peta skema TURUN/hilang', level: LEVEL.PENTING,
      detail: `Peta versi-diharapkan MENYUSUT dari rilis terakhir: ${shrunk.join(', ')}. Ini jarang sah (salah-ketik / revert tak sengaja?) - entri yang hilang = artefak berhenti dipantau robot laporan-migrasi. Kalau memang disengaja, jelaskan alasannya di entri CHANGELOG.`,
    })
  }
  if (raised.length === 0) {
    if (shrunk.length === 0) {
      out.push({ id: 'skema-naik', label: 'Naik versi skema artefak (Keranjang 1)', level: LEVEL.OK, detail: 'peta versi-diharapkan tak naik dari rilis terakhir - tak ada migrasi eager baru.' })
    }
    return out
  }
  const names = raised.map((r) => `${r.artifact} (${r.from === null ? 'baru' : r.from} -> ${r.to})`).join(', ')
  const block = String(changelogBlock || '')
  const hasBreaking = /\[BREAKING\]/.test(block)
  if (!hasBreaking) {
    out.push({
      id: 'skema-naik', label: 'Naik versi skema artefak (Keranjang 1)', level: LEVEL.GENTING,
      detail: `Angka peta versi-diharapkan NAIK (${names}) tapi entri CHANGELOG teratas TIDAK ber-label [BREAKING]. Perubahan format artefak klien = migrasi WAJIB-LANGSUNG (eager, Keranjang 1) - tambah label [BREAKING] + "Migration Steps" + migrator idempoten (Resep 9 docs/RESEP_PERUBAHAN.md) sebelum rilis.`,
    })
    return out
  }
  const unmentioned = raised.filter((r) => !block.includes(r.artifact)).map((r) => r.artifact)
  if (unmentioned.length > 0) {
    out.push({
      id: 'skema-sebut', label: 'Artefak naik-skema disebut di CHANGELOG', level: LEVEL.PENTING,
      detail: `Entri [BREAKING] ada, tapi artefak yang naik belum disebut namanya: ${unmentioned.join(', ')}. Sebut nama berkasnya supaya AI/staf tahu persis apa yang dimigrasi.`,
    })
  }
  if (!/Migration Steps/i.test(block)) {
    out.push({
      id: 'skema-steps', label: 'Migration Steps utk naik-skema', level: LEVEL.PENTING,
      detail: `Entri [BREAKING] ada, tapi belum punya bagian "Migration Steps" (wajib utk Tier 3 - rules/4.5-update-strategy.md). Tulis langkah migrasinya inline di entri CHANGELOG.`,
    })
  }
  // Langkah 5 rencana (§6 disiplin rilis): migrasi selalu SIMULASI dulu (jalan pura-pura, tak
  // mengubah apa pun -> tinjau -> baru terapkan) + tiap kenaikan punya entri di UPGRADING.md
  // (buku panduan pindah-versi, terpisah dari CHANGELOG).
  if (!/SIMULASI/i.test(block)) {
    out.push({
      id: 'skema-simulasi', label: 'SIMULASI-dulu utk naik-skema', level: LEVEL.PENTING,
      detail: 'Migration Steps belum menyebut langkah SIMULASI (jalan pura-pura tanpa mengubah apa pun, ditinjau dulu baru diterapkan). Migrasi artefak klien WAJIB simulasi-dulu (UPGRADING.md + rules/4.5-update-strategy.md).',
    })
  }
  const history = getUpgradingHistorySection(upgradingText)
  const notInUpgrading = (history === null || history === '')
    ? raised.map((r) => r.artifact)
    : raised.filter((r) => !history.includes(r.artifact)).map((r) => r.artifact)
  if (notInUpgrading.length > 0) {
    const why = history === null
      ? `UPGRADING.md tidak ada - tiap kenaikan format artefak wajib punya panduan pindah-versi di sana (artefak: ${notInUpgrading.join(', ')}).`
      : history === ''
        ? `UPGRADING.md ada tapi bagian "## Riwayat pindah-versi" tak ditemukan - entri migrasi dihitung HANYA dari bagian itu (sebutan nama artefak di teks kerangka-contoh TIDAK dihitung). Artefak: ${notInUpgrading.join(', ')}.`
        : `Bagian "Riwayat pindah-versi" UPGRADING.md belum menyebut artefak yang naik: ${notInUpgrading.join(', ')}. Tambah bagian "vLAMA -> vBARU" sesuai kerangka di UPGRADING.md.`
    out.push({ id: 'skema-upgrading', label: 'Entri UPGRADING.md utk naik-skema', level: LEVEL.PENTING, detail: why })
  }
  if (out.length === 0 || (out.length === 1 && out[0].id === 'skema-turun')) {
    out.push({ id: 'skema-naik', label: 'Naik versi skema artefak (Keranjang 1)', level: LEVEL.OK, detail: `naik: ${names} - entri [BREAKING] + Migration Steps + SIMULASI + entri UPGRADING.md lengkap.` })
  } else {
    out.unshift({ id: 'skema-naik', label: 'Naik versi skema artefak (Keranjang 1)', level: LEVEL.INFO, detail: `naik: ${names} - label [BREAKING] ada; lengkapi catatan di bawah.` })
  }
  return out
}

// Pembungkus IO: baseline = `git show <lastTag>:engine/expected-schema.mjs` (peta saat rilis terakhir);
// SEKARANG = peta yang di-import langsung (sumber kebenaran runtime). Plus CEK-WARAS parser: parser
// harus bisa mereproduksi peta sekarang dari teks sumber sekarang - kalau tidak, parser buta ->
// lapor PENTING (fail-closed), jangan diam-diam "tak ada kenaikan" palsu.
export function checkSchemaRaiseBreaking(repoRoot, { lastTag = null } = {}) {
  const srcPath = path.join(repoRoot, 'engine', 'expected-schema.mjs')
  if (!fs.existsSync(srcPath)) {
    return [{ id: 'skema-naik', label: 'Naik versi skema artefak (Keranjang 1)', level: LEVEL.INFO, detail: 'engine/expected-schema.mjs tak ada - dilewati.' }]
  }
  const current = { ...LINTAS_EXPECTED_SCHEMA }
  const parsedCurrent = parseExpectedSchemaSource(readText(srcPath))
  const sameKeys = parsedCurrent && Object.keys(current).length === Object.keys(parsedCurrent).length &&
    Object.entries(current).every(([k, v]) => parsedCurrent[k] === v)
  if (!sameKeys) {
    return [{
      id: 'skema-naik', label: 'Naik versi skema artefak (Keranjang 1)', level: LEVEL.PENTING,
      detail: 'parser peta tak bisa mereproduksi isi engine/expected-schema.mjs (bentuk berkas berubah?) - banding kenaikan TIDAK bisa dipercaya. Perbarui parseExpectedSchemaSource di tests/preflight.mjs.',
    }]
  }
  if (!lastTag) {
    return [{ id: 'skema-naik', label: 'Naik versi skema artefak (Keranjang 1)', level: LEVEL.INFO, detail: 'tag git tidak tersedia - banding peta versi-diharapkan dilewati.' }]
  }
  const r = runCmd('git', ['-C', repoRoot, 'show', `${lastTag}:engine/expected-schema.mjs`])
  // Berkas belum ada di rilis terakhir (peta baru lahir) -> baseline null: entri dinilai sbg "BARU".
  const baseline = (cmdNotRun(r) || r.status !== 0) ? null : parseExpectedSchemaSource(stripBom(r.stdout || ''))
  let changelogBlock = null
  const clPath = path.join(repoRoot, 'CHANGELOG.md')
  if (fs.existsSync(clPath)) changelogBlock = getTopChangelogBlock(readText(clPath))
  const upPath = path.join(repoRoot, 'UPGRADING.md')
  const upgradingText = fs.existsSync(upPath) ? readText(upPath) : null
  return evaluateSchemaRaise({ current, baseline, changelogBlock, upgradingText })
}

// Klasifikasi heuristik "perubahan kode tanpa perubahan tes" (RAPIKAN/peringatan saja). MURNI.
// changedFiles = daftar path relatif gaya git ('/'). Kode = .mjs/.js/.ps1/.psm1 di LUAR tests/.
export function classifyCodeVsTests(changedFiles) {
  const list = Array.isArray(changedFiles) ? changedFiles.map((f) => f.replace(/\\/g, '/')) : []
  const codeExt = /\.(mjs|js|ps1|psm1)$/i
  const code = list.filter((f) => codeExt.test(f) && !f.startsWith('tests/'))
  const tests = list.filter((f) => f.startsWith('tests/'))
  if (code.length > 0 && tests.length === 0) {
    return {
      id: 'kode-vs-tes', label: 'Tes untuk perubahan kode', level: LEVEL.RAPIKAN,
      detail: `${code.length} berkas kode berubah tanpa perubahan berkas tes. Pertimbangkan tambah/ubah tes (sec. 4 DoD: minimal 1 tes happy-path).`,
    }
  }
  return {
    id: 'kode-vs-tes', label: 'Tes untuk perubahan kode', level: LEVEL.OK,
    detail: code.length > 0 ? `${code.length} berkas kode + ${tests.length} berkas tes berubah.` : 'tak ada perubahan kode terlacak sejak tag.',
  }
}

// Pilah semua hasil -> bucket per tingkat + tentukan exit-code (1 kalau ada pemblokir, else 0).
// strict=true -> PENTING ikut jadi pemblokir (dipakai saat mau rilis).
export function classify(results, { strict = false } = {}) {
  const at = (lvl) => results.filter((r) => r.level === lvl)
  const genting = at(LEVEL.GENTING)
  const penting = at(LEVEL.PENTING)
  const rapikan = at(LEVEL.RAPIKAN)
  const blockers = strict ? [...genting, ...penting] : [...genting]
  return { genting, penting, rapikan, blockers, exitCode: blockers.length > 0 ? 1 : 0 }
}

// ---------------------------------------------------------------------------
// Pemeriksa yang di-SPAWN (proses terpisah) - butuh runtime, jadi BUKAN fungsi murni.
// ---------------------------------------------------------------------------

// Jalankan tes. Mode KIT = suite Node kit (tests/run-node-tests.mjs, format `node --test` -> angka
// pass/fail terbaca). Mode PROJECT (klien) = `npm test` milik KLIEN (kontrak universal lintas-runner:
// jest/vitest/mocha/node:test) -> andalkan EXIT CODE saja (format output beragam, tak diparse).
// WHY (bug Tahap E): versi lama HARDCODE tests/run-node-tests.mjs -> di project klien berkas itu TAK ADA
//   (itu berkas kit) -> Node gagal dgn stack-trace mentah = GENTING palsu menakutkan staff non-programmer.
export function runNodeTests(repoRoot, env, mode = 'kit') {
  if (mode === 'kit') {
    const r = runCmd(process.execPath, [path.join(repoRoot, 'tests', 'run-node-tests.mjs')], { cwd: repoRoot, env })
    if (cmdNotRun(r)) return { id: 'node-test', label: 'Tes Node', level: LEVEL.GENTING, detail: `tak bisa dijalankan: ${cmdErrMsg(r)}.` }
    const out = (r.stdout || '') + (r.stderr || '')
    const pass = (out.match(/(?:^|\s)pass\s+(\d+)/m) || [])[1]
    const fail = (out.match(/(?:^|\s)fail\s+(\d+)/m) || [])[1]
    if (r.status !== 0) return { id: 'node-test', label: 'Tes Node', level: LEVEL.GENTING, detail: `${fail ?? '?'} gagal (exit ${r.status}).\n${tailLines(out, 18)}` }
    // Exit 0 = lulus menurut runner (sumber kebenaran; run-node-tests.mjs meneruskan exit `node --test`).
    // Angka tak terbaca -> JANGAN diam-diam OK: lapor PENTING (fail-closed) supaya "format output runner
    // berubah" TERLIHAT, bukan tersembunyi jadi hijau palsu.
    if (pass === undefined && fail === undefined) return { id: 'node-test', label: 'Tes Node', level: LEVEL.PENTING, detail: 'lulus (exit 0) tapi jumlah tes tak terbaca - cek format output runner.' }
    return { id: 'node-test', label: 'Tes Node', level: LEVEL.OK, detail: `${pass ?? '?'} lulus / ${fail ?? '0'} gagal.` }
  }

  // --- Mode PROJECT (klien) ---
  const pkg = readPackageJson(repoRoot)
  const testScript = pkg && pkg.scripts && pkg.scripts.test
  if (!testScript) {
    // Tak punya tes = bukan GENTING (dorongan, bukan pemblokir). DoD sec. 4 anjurkan minimal 1 tes.
    return { id: 'node-test', label: 'Tes project', level: LEVEL.RAPIKAN, detail: 'project belum punya script "test" di package.json - dilewati. Pertimbangkan tambah tes (minimal 1 happy-path).' }
  }
  if (/no test specified/i.test(testScript)) {
    return { id: 'node-test', label: 'Tes project', level: LEVEL.RAPIKAN, detail: 'script "test" masih teks-contoh bawaan npm ("no test specified") - dilewati. Ganti dengan tes nyata.' }
  }
  // Jalankan `npm test` klien. Di Windows npm = npm.cmd -> butuh shell:true (Node modern menolak
  // spawn .cmd tanpa shell). cwd = project klien supaya tes klien jalan di akar mereka. Perintah
  // dikirim sebagai SATU STRING (args kosong) -> hindari DeprecationWarning DEP0190 ("args + shell")
  // yang akan tampil ke layar staff. Tak ada input user di perintah -> aman.
  const isWin = process.platform === 'win32'
  const r = runCmd((isWin ? 'npm.cmd' : 'npm') + ' test', [], { cwd: repoRoot, env, shell: true })
  if (cmdNotRun(r)) return { id: 'node-test', label: 'Tes project (npm test)', level: LEVEL.GENTING, detail: `tak bisa menjalankan "npm test": ${cmdErrMsg(r)}. Pastikan Node + npm terpasang & sudah "npm install".` }
  const out = (r.stdout || '') + (r.stderr || '')
  if (r.status !== 0) return { id: 'node-test', label: 'Tes project (npm test)', level: LEVEL.GENTING, detail: `"npm test" gagal (exit ${r.status}). Kalau gagal karena dependency belum ada, jalankan "npm install" dulu.\n${tailLines(out, 18)}` }
  return { id: 'node-test', label: 'Tes project (npm test)', level: LEVEL.OK, detail: '"npm test" lulus (exit 0).' }
}

// Bangun aplikasi klien (`npm run build`). LUBANG YANG DITUTUP (2026-07-19): sebelum ini 14 pemeriksa
// gerbang TAK SATU PUN mencoba mengompilasi aplikasi -> gerbang bisa mencetak "LULUS" di atas project
// yang gagal `next build`/`tsc`. Itu kelas kegagalan PALING MURAH ditangkap mesin (deterministik, ~0
// token AI) dan justru satu-satunya yang tak dijaga. Diperparah CI: langkah build di
// templates/github/workflows/preflight.yml dibungkus `continue-on-error: true` sambil menjanjikan
// "robot mutu di langkah berikutnya yang melaporkan" - padahal langkah berikutnya (preflight) tak
// punya pemeriksa build sama sekali. Janji itu menunjuk ruangan kosong.
//
// GENTING saat gagal: aplikasi yang tak bisa dibangun tak bisa dirilis - tak ada nuansa di sini.
// Tak punya script "build" -> INFO (dilewati diam-diam), BUKAN alarm palsu: banyak project sah tanpa
//   tahap build (library kecil, skrip, API polos).
// Mode KIT dilewati: repo kit = paket CLI, "build"-nya bukan aplikasi web.
// URUTAN PENTING: pemeriksa ini WAJIB jalan SEBELUM checkPerfBudget - perf-budget butuh hasil build
//   (.next/) dan selama ini auto-lewat diam-diam karena tak ada yang pernah membangun (lihat :558
//   "tak ada .next/ build ... - dilewati"). Satu perbaikan, dua lubang tertutup.
// Timeout 10 menit: build yang menggantung tak boleh membekukan gerbang selamanya; lewat batas ->
//   cmdNotRun() menangkapnya jadi GENTING berpesan jelas (fail-closed, bukan diam-diam hijau).
export function runAppBuild(repoRoot, env, mode = 'kit') {
  if (mode === 'kit') {
    return { id: 'app-build', label: 'Build aplikasi', level: LEVEL.INFO, detail: 'repo kit (paket CLI, bukan aplikasi web) - dilewati.' }
  }
  const pkg = readPackageJson(repoRoot)
  const buildScript = pkg && pkg.scripts && pkg.scripts.build
  if (!buildScript) {
    return { id: 'app-build', label: 'Build aplikasi', level: LEVEL.INFO, detail: 'project tak punya script "build" di package.json - dilewati (tak semua project perlu tahap build).' }
  }
  // Windows: npm = npm.cmd -> butuh shell:true. Perintah dikirim sebagai SATU STRING (args kosong)
  // supaya tak memicu DeprecationWarning DEP0190 ("args + shell") ke layar staff - cermin runNodeTests.
  const isWin = process.platform === 'win32'
  const r = runCmd((isWin ? 'npm.cmd' : 'npm') + ' run build', [], { cwd: repoRoot, env, shell: true, timeout: 10 * 60 * 1000 })
  if (cmdNotRun(r)) {
    return { id: 'app-build', label: 'Build aplikasi', level: LEVEL.GENTING, detail: `tak bisa menjalankan "npm run build": ${cmdErrMsg(r)}. Kalau dependency belum terpasang, jalankan "npm install" dulu.` }
  }
  const out = (r.stdout || '') + (r.stderr || '')
  if (r.status !== 0) {
    return { id: 'app-build', label: 'Build aplikasi', level: LEVEL.GENTING, detail: `aplikasi GAGAL dibangun (exit ${r.status}) - dalam kondisi ini aplikasi tak bisa dirilis. Perbaiki error di bawah lalu jalankan ulang.\n${tailLines(out, 20)}` }
  }
  return { id: 'app-build', label: 'Build aplikasi', level: LEVEL.OK, detail: '"npm run build" berhasil (exit 0).' }
}

export function runEslint(repoRoot, mode = 'kit') {
  const bin = path.join(repoRoot, 'node_modules', 'eslint', 'bin', 'eslint.js')
  if (!fs.existsSync(bin)) {
    // Kit WAJIB punya eslint (devDep) -> PENTING kalau hilang. Klien: eslint opsional (tak semua project
    // pakai) -> RAPIKAN (saran lembut, tak memblokir rilis). Kalau eslint ADA + error -> tetap GENTING.
    return mode === 'kit'
      ? { id: 'eslint', label: 'ESLint', level: LEVEL.PENTING, detail: 'eslint belum terpasang (jalankan `npm ci`) - dilewati.' }
      : { id: 'eslint', label: 'ESLint', level: LEVEL.RAPIKAN, detail: 'eslint tak terpasang di project ini - dilewati (opsional). Pasang + konfigurasi kalau mau cek gaya kode otomatis.' }
  }
  const r = runCmd(process.execPath, [bin, '.'], { cwd: repoRoot })
  if (cmdNotRun(r)) return { id: 'eslint', label: 'ESLint', level: LEVEL.GENTING, detail: `tak bisa dijalankan: ${cmdErrMsg(r)}.` }
  const ok = r.status === 0
  return {
    id: 'eslint', label: 'ESLint', level: ok ? LEVEL.OK : LEVEL.GENTING,
    detail: ok ? 'bersih.' : `menemukan masalah (exit ${r.status}).\n${tailLines((r.stdout || '') + (r.stderr || ''), 20)}`,
  }
}

function runConsistency(repoRoot) {
  try {
    const pkg = readPackageJson(repoRoot)
    const mapJsonc = path.join(repoRoot, 'docs', 'consistency-map.jsonc')
    let r
    if (pkg.name === 'lintasai') {
      r = invokeLintasConsistencyCheckKit(repoRoot, { quiet: true })       // MODE KIT (repo kit ini)
    } else if (fs.existsSync(mapJsonc)) {
      r = invokeLintasConsistencyCheckProject(repoRoot, mapJsonc, { quiet: true }) // MODE PROJECT (klien)
    } else {
      // Klien belum daftar fakta-berulang = WAJAR (opsional). RAPIKAN (saran lembut), BUKAN PENTING:
      // PENTING jadi pemblokir saat --strict/rilis -> klien tak boleh diblokir rilis cuma karena belum
      // bikin peta-konsistensi. RAPIKAN tak pernah memblokir, tetap mendorong mereka mengaktifkannya.
      return { id: 'konsistensi', label: 'Robot kecocokan', level: LEVEL.RAPIKAN, detail: 'belum ada docs/consistency-map.jsonc - dilewati (opsional). Salin docs/consistency-map.example.jsonc -> docs/consistency-map.jsonc lalu daftarkan fakta-berulang project untuk aktifkan pencegah drift.' }
    }
    if (r.MismatchCount === 0) {
      const nFacts = (r.FactFindings || []).length
      // RetiredFindings hanya ada di MODE KIT (penjaga istilah-pensiun) -> tampilkan status bersihnya.
      const retiredNote = Object.prototype.hasOwnProperty.call(r, 'RetiredFindings') ? ' + istilah-pensiun bersih' : ''
      return { id: 'konsistensi', label: 'Robot kecocokan', level: LEVEL.OK, detail: `${r.Findings.length} versi${nFacts ? ` + ${nFacts} fakta` : ''}${retiredNote} cocok @ v${r.CanonicalVersion}.` }
    }
    const bad = [...r.Findings, ...(r.FactFindings || []), ...(r.RetiredFindings || [])].filter((f) => f.Status !== 'OK').map((f) => `${f.File} (${f.Status})`)
    return { id: 'konsistensi', label: 'Robot kecocokan', level: LEVEL.GENTING, detail: `${r.MismatchCount} tak cocok: ${bad.join(', ')}.` }
  } catch (e) {
    return { id: 'konsistensi', label: 'Robot kecocokan', level: LEVEL.GENTING, detail: `gagal jalan: ${e.message}` }
  }
}

function runUnicode(repoRoot) {
  try {
    const findings = unicodeScan([repoRoot])
    if (findings.length === 0) return { id: 'unicode', label: 'Pemindai huruf-tipuan (Unicode)', level: LEVEL.OK, detail: '0 temuan.' }
    const sample = findings.slice(0, 10).map((f) => `${f.File}:${f.Line}:${f.Col} ${f.Hex} ${f.Name}`)
    return { id: 'unicode', label: 'Pemindai huruf-tipuan (Unicode)', level: LEVEL.GENTING, detail: `${findings.length} temuan:\n  ${sample.join('\n  ')}` }
  } catch (e) {
    return { id: 'unicode', label: 'Pemindai huruf-tipuan (Unicode)', level: LEVEL.GENTING, detail: `gagal jalan: ${e.message}` }
  }
}

// v2.0.0: runSmokeFast (smoke-fast.ps1) + runPester (Run-Tests.ps1) DIHAPUS - berkas PS-nya sudah
// tak ada. Smoke Node kini dijalankan sebagai bagian node:test (tests/smoke-portable.test.mjs).

// Penjaga anggaran ukuran halaman (Next.js). AUTO-SKIP anggun: belum build / bukan Next -> INFO (bukan
// alarm). Route lewat-anggaran -> RAPIKAN (saran, TAK PERNAH memblokir - SEO/perf bukan pemblokir keras).
// Cuma-baca. Berguna saat dijalankan SETELAH `npm run build` (mis. di CI post-build).
function checkPerfBudget(repoRoot) {
  try {
    const res = runPerfBudget({ repoRoot })
    if (!res.present) return { id: 'perf', label: 'Anggaran ukuran halaman (Next.js)', level: LEVEL.INFO, detail: 'tak ada .next/ build (belum `npm run build` / bukan Next.js) - dilewati.' }
    if (res.over.length === 0) return { id: 'perf', label: 'Anggaran ukuran halaman (Next.js)', level: LEVEL.OK, detail: `${res.routes.length} route, terberat ${fmtKb(res.maxBytes)} <= ${res.budgetKb} KB (perkiraan JS).` }
    const sample = res.over.slice(0, 5).map((r) => `${r.route} ${fmtKb(r.bytes)}`)
    return { id: 'perf', label: 'Anggaran ukuran halaman (Next.js)', level: LEVEL.RAPIKAN, detail: `${res.over.length} route > ${res.budgetKb} KB JS (perkiraan): ${sample.join(', ')}. Optimalkan bundle (sec. 10).` }
  } catch (e) {
    return { id: 'perf', label: 'Anggaran ukuran halaman (Next.js)', level: LEVEL.INFO, detail: `dilewati (${e.message}).` }
  }
}

// Penjaga anggaran token berkas aturan always-load (CLAUDE_universal_v1.md). Cegah bloat berulang yang
// dibayar token TIAP sesi. AUTO-SKIP anggun kalau berkas tak ketemu. Lewat-anggaran -> RAPIKAN (saran,
// TAK memblokir - ukuran dokumen bukan pemblokir keras). Cuma-baca, deterministik.
function checkRulesBudget(repoRoot) {
  try {
    const res = runRulesBudget({ repoRoot })
    if (!res.present) return { id: 'rules-budget', label: 'Anggaran token berkas aturan', level: LEVEL.INFO, detail: 'CLAUDE_universal_v1.md tak ketemu (root / .claude-kit/) - dilewati.' }
    const budgetTok = Math.round(res.budgetChars / CHARS_PER_TOKEN)
    if (!res.over) return { id: 'rules-budget', label: 'Anggaran token berkas aturan', level: LEVEL.OK, detail: `~${res.tokensEst.toLocaleString('en-US')} token <= ${budgetTok.toLocaleString('en-US')} (sisa ~${res.remaining.toLocaleString('en-US')} char).` }
    return { id: 'rules-budget', label: 'Anggaran token berkas aturan', level: LEVEL.RAPIKAN, detail: `~${res.tokensEst.toLocaleString('en-US')} token > anggaran ${budgetTok.toLocaleString('en-US')} (lebih ~${(-res.remaining).toLocaleString('en-US')} char). Padatkan / pindah detail ke rules (§4.18 + §14).` }
  } catch (e) {
    return { id: 'rules-budget', label: 'Anggaran token berkas aturan', level: LEVEL.INFO, detail: `dilewati (${e.message}).` }
  }
}

// Penjaga anggaran token GABUNGAN (ADR-019): CLAUDE_universal_v1.md + AGENTS.md + CLAUDE.md - SEMUA
// berkas yang ter-@import tiap sesi (bukan cuma 1 seperti checkRulesBudget di atas). AGENTS.md khususnya
// didesain untuk TUMBUH (opt-in §15, catatan tim) - dulu pertumbuhannya tak terpantau. Non-blokir (RAPIKAN),
// AUTO-SKIP anggun kalau anchor tak ketemu. Cuma-baca, deterministik.
function checkAlwaysLoadBudget(repoRoot) {
  try {
    const res = runAlwaysLoadBudget({ repoRoot })
    if (!res.present) return { id: 'rules-budget-total', label: 'Anggaran token gabungan (always-load)', level: LEVEL.INFO, detail: 'CLAUDE_universal_v1.md tak ketemu (root / .claude-kit/) - dilewati.' }
    const budgetTok = Math.round(res.budgetChars / CHARS_PER_TOKEN)
    const roles = res.parts.map((p) => p.role).join('+')
    if (!res.over) return { id: 'rules-budget-total', label: 'Anggaran token gabungan (always-load)', level: LEVEL.OK, detail: `${roles}: ~${res.tokensEst.toLocaleString('en-US')} token <= ${budgetTok.toLocaleString('en-US')} (sisa ~${res.remaining.toLocaleString('en-US')} char).` }
    return { id: 'rules-budget-total', label: 'Anggaran token gabungan (always-load)', level: LEVEL.RAPIKAN, detail: `${roles}: ~${res.tokensEst.toLocaleString('en-US')} token > anggaran ${budgetTok.toLocaleString('en-US')} (lebih ~${(-res.remaining).toLocaleString('en-US')} char). Tinjau AGENTS.md/CLAUDE.md (§14).` }
  } catch (e) {
    return { id: 'rules-budget-total', label: 'Anggaran token gabungan (always-load)', level: LEVEL.INFO, detail: `dilewati (${e.message}).` }
  }
}

// Penjaga rujukan rak on-demand rules/ (v2.4.0 pecah-per-seksi): tiap rujukan `rules/*.md` di
// berkas aturan WAJIB menunjuk berkas nyata, nol berkas yatim, INDEX sinkron, rujukan gaya lama
// "LINTASAI_WORKFLOWS_v1.md §X" dilarang balik. Rujukan putus = aturan tak terbaca AI -> PENTING
// (memblokir). AUTO-SKIP anggun: folder rules/ tak ada (kit/client lama) -> INFO. Cuma-baca.
function checkRulesRefs(repoRoot) {
  try {
    const res = runRulesRefCheck({ repoRoot })
    if (!res.present) return { id: 'rules-refs', label: 'Rujukan rak rules/', level: LEVEL.INFO, detail: 'folder rules/ tak ketemu (kit/client lama) - dilewati.' }
    if (res.findings.length === 0) return { id: 'rules-refs', label: 'Rujukan rak rules/', level: LEVEL.OK, detail: `${res.sections} berkas seksi + ${res.ids} id anchor - semua rujukan tersambung, INDEX sinkron.` }
    const sample = res.findings.slice(0, 8).map((f) => `[${f.tingkat}] ${f.pesan}`)
    const more = res.findings.length > 8 ? `\n  (+${res.findings.length - 8} temuan lagi)` : ''
    const level = res.counts.PENTING > 0 || res.counts.GENTING > 0 ? LEVEL.PENTING : LEVEL.RAPIKAN
    return { id: 'rules-refs', label: 'Rujukan rak rules/', level, detail: `GENTING ${res.counts.GENTING} - PENTING ${res.counts.PENTING} - RAPIKAN ${res.counts.RAPIKAN}.\n  ${sample.join('\n  ')}${more}` }
  } catch (e) {
    return { id: 'rules-refs', label: 'Rujukan rak rules/', level: LEVEL.INFO, detail: `dilewati (${e.message}).` }
  }
}

// Penjaga jangkauan perkakas: tiap robot lib/ yang DIKIRIM ke client + berdiri sendiri wajib punya
// jalur pemanggil (perintah CLI / langkah preflight / hook). Nol gagang = kemampuan yang dibayar ruang
// tapi tak bisa dipakai siapa pun - persis nasib engine/fact-gate.mjs (mati sejak lahir), engine/split-guard.mjs
// dan engine/portfolio-write.mjs sebelum 2026-07-18. PENTING (memblokir --strict), bukan GENTING: ini cacat
// jangkauan, bukan kerusakan data. Cuma-baca. Buku Pelajaran LP-012 + Resep 12.
function checkToolReach(repoRoot) {
  try {
    const res = runToolReachCheck({ repoRoot })
    if (!res.present) return { id: 'tool-reach', label: 'Jangkauan perkakas engine/', level: LEVEL.INFO, detail: 'engine/kit-files.json / bin/lintasai.js tak ketemu (bukan repo kit) - dilewati.' }
    if (res.findings.length === 0) return { id: 'tool-reach', label: 'Jangkauan perkakas engine/', level: LEVEL.OK, detail: `${res.total} perkakas mandiri terkirim - semuanya punya gagang (perintah/preflight/hook).` }
    const sample = res.findings.slice(0, 8).map((f) => `[${f.tingkat}] ${f.ref} - nol gagang (tak bisa dipanggil siapa pun).`)
    const more = res.findings.length > 8 ? `\n  (+${res.findings.length - 8} temuan lagi)` : ''
    return { id: 'tool-reach', label: 'Jangkauan perkakas engine/', level: LEVEL.PENTING, detail: `${res.findings.length} perkakas terkirim tanpa jalur pemanggil. Beri perintah di bin/lintasai.js, jadikan langkah preflight, atau berhenti mengirimnya (Resep 12).\n  ${sample.join('\n  ')}${more}` }
  } catch (e) {
    return { id: 'tool-reach', label: 'Jangkauan perkakas engine/', level: LEVEL.INFO, detail: `dilewati (${e.message}).` }
  }
}

// Penjaga format skill (ADR-027 Tugas 9): tiap skills/*/SKILL.md wajib frontmatter lengkap + 🔒 HASIL +
// Definition-of-Done (§7). Menutup celah "skill cacat DILEWATI DIAM" oleh skill-registry (fail-safe by
// design). FORWARD-LOOKING: skills/ belum ada -> AUTO-SKIP (INFO). PENTING (memblokir --strict), cuma-baca.
function checkSkillFormat(repoRoot) {
  try {
    const res = runSkillFormatCheck({ repoRoot })
    if (!res.present) return { id: 'skill-format', label: 'Format skill (skills/*/SKILL.md)', level: LEVEL.INFO, detail: 'folder skills/ belum ada (masa transisi ADR-027) - dilewati.' }
    if (res.findings.length === 0) return { id: 'skill-format', label: 'Format skill (skills/*/SKILL.md)', level: LEVEL.OK, detail: `${res.total} skill diperiksa - semua punya frontmatter + 🔒 HASIL + Definition-of-Done.` }
    const sample = res.findings.slice(0, 8).map((f) => `[${f.tingkat}] ${f.pesan}`)
    const more = res.findings.length > 8 ? `\n  (+${res.findings.length - 8} temuan lagi)` : ''
    return { id: 'skill-format', label: 'Format skill (skills/*/SKILL.md)', level: LEVEL.PENTING, detail: `${res.findings.length} pelanggaran format skill (§7: wajib frontmatter + 🔒 HASIL + Definition-of-Done).\n  ${sample.join('\n  ')}${more}` }
  } catch (e) {
    return { id: 'skill-format', label: 'Format skill (skills/*/SKILL.md)', level: LEVEL.INFO, detail: `dilewati (${e.message}).` }
  }
}

// Anti-basi registry (ADR-027 celah ③ — aktif sejak F1: registry.json ikut dikirim ke client). registry.json
// = berkas GENERATED. Edit pemicu di SKILL.md tanpa `npx lintasai skill-registry` -> registry BASI ter-ship
// -> routing klien meleset SENYAP. Cek deterministik: scanSkills(skills/) == registry.json.skills. AUTO-SKIP:
// skills/ atau registry.json belum ada -> INFO. Cuma-baca (TAK menulis registry). PENTING (blokir --strict).
function checkRegistryDrift(repoRoot) {
  const LABEL = 'Registry skill anti-basi (skills/registry.json)'
  try {
    const skillsDir = path.join(repoRoot, 'skills')
    const regPath = path.join(skillsDir, 'registry.json')
    if (!fs.existsSync(skillsDir) || !fs.existsSync(regPath)) {
      return { id: 'registry-drift', label: LABEL, level: LEVEL.INFO, detail: 'skills/ atau registry.json belum ada (masa transisi ADR-027) - dilewati.' }
    }
    const disk = JSON.parse(fs.readFileSync(regPath, 'utf8'))
    const segar = scanSkills(skillsDir)
    if (JSON.stringify(disk.skills) === JSON.stringify(segar)) {
      return { id: 'registry-drift', label: LABEL, level: LEVEL.OK, detail: `sinkron dgn ${segar.length} skill di disk.` }
    }
    return { id: 'registry-drift', label: LABEL, level: LEVEL.PENTING, detail: 'registry.json BASI vs skills/*/SKILL.md - jalankan `npx lintasai skill-registry` lalu commit ulang (kalau tidak, klien terima routing meleset senyap).' }
  } catch (e) {
    return { id: 'registry-drift', label: LABEL, level: LEVEL.INFO, detail: `dilewati (${e.message}).` }
  }
}

// Anti-basi PETA.md (ADR-027 Tugas 15, celah ③). PETA.md = GENERATED oleh engine/peta-gen.mjs. Ubah
// folder/skill tanpa `npx lintasai peta-gen` -> PETA basi (AI baca "apa di mana" yg salah). Cek
// deterministik: PETA.md == bangunPeta(scanStrukturRepo). AUTO-SKIP: PETA.md tak ada -> INFO (mode klien:
// PETA ada di .claude-kit/, bukan project root -> skip, sama pola checkRegistryDrift). Banding pakai
// normalisasiPeta (buang BOM + CRLF->LF) supaya checkout Windows tak memicu drift PALSU. Cuma-baca.
// PENTING (blokir --strict).
function checkPetaDrift(repoRoot) {
  const LABEL = 'PETA.md anti-basi (peta apa-di-mana)'
  try {
    const p = path.join(repoRoot, 'PETA.md')
    if (!fs.existsSync(p)) {
      return { id: 'peta-drift', label: LABEL, level: LEVEL.INFO, detail: 'PETA.md belum ada (mode klien: peta ada di .claude-kit/) - dilewati.' }
    }
    const disk = normalisasiPeta(fs.readFileSync(p, 'utf8'))
    const segar = normalisasiPeta(bangunPeta(scanStrukturRepo(repoRoot)))
    if (disk === segar) {
      return { id: 'peta-drift', label: LABEL, level: LEVEL.OK, detail: 'sinkron dgn struktur disk (folder + skill).' }
    }
    return { id: 'peta-drift', label: LABEL, level: LEVEL.PENTING, detail: 'PETA.md BASI vs folder/skill di disk - jalankan `npx lintasai peta-gen` lalu commit ulang.' }
  } catch (e) {
    return { id: 'peta-drift', label: LABEL, level: LEVEL.INFO, detail: `dilewati (${e.message}).` }
  }
}

// Penjaga keamanan konfigurasi-AI (.mcp.json / .claude/settings.json / docs/SKILLS_LOCAL.md). Cuma-baca,
// meng-IMPORT robot engine/ai-config-check.mjs yang SUDAH teruji (anti-duplikasi sec. 5). Deteksi: kunci-API
// bocor / izin tool terlalu lebar / hook unduh-lalu-jalankan / frasa menembus pagar keamanan.
//
// NON-BLOCKING BY DESIGN (keputusan owner 2026-07-08, sec. 4.6 owner-gated): temuan = SARAN, BUKAN vonis
// mesin. Kenapa TAK memblokir gerbang walau robot bisa menandai "GENTING": mutu/keamanan config = keputusan
// OWNER. Banyak pola ter-flag itu SENGAJA & sah (server MCP jarak-jauh yang tepercaya, izin Bash lebar yang
// memang diperlukan) dan "rahasia" ter-flag bisa placeholder/contoh -> memblokir rilis atasnya = "blokir
// keliru" (alarm-palsu yang menghambat). Maka pemeriksa ini SELALU level RAPIKAN (tak pernah memblokir,
// bahkan --strict) — TAPI severity ASLI robot (GENTING/PENTING/RAPIKAN) tetap DICETAK JUJUR di detail supaya
// owner bisa menilai & memutuskan (sec. 8.2: jangan sembunyikan/understate; sec. 2.1 #7: label awam).
// KEAMANAN: pesan robot HANYA menyebut NAMA pola (mis. "kunci-API gaya OpenAI (sk-...)"), TIDAK pernah nilai
// rahasia aslinya (dijaga tests/ai-config-check.test.mjs) -> aman ditampilkan (sec. 8.1 #6 kerahasiaan secret).
export function runAiConfigCheck(repoRoot) {
  try {
    const targets = getLintasAiConfigTarget(repoRoot)
    if (targets.length === 0) {
      return { id: 'ai-config', label: 'Keamanan config-AI', level: LEVEL.INFO, detail: 'tak ada berkas config-AI (.mcp.json / .claude/settings.json / docs/SKILLS_LOCAL.md) - dilewati.' }
    }
    const r = invokeLintasAiConfigCheck(repoRoot, { quiet: true })
    if (r.Count === 0) {
      return { id: 'ai-config', label: 'Keamanan config-AI', level: LEVEL.OK, detail: `${targets.length} berkas config-AI dipindai - 0 pola berisiko.` }
    }
    const sample = r.Findings.slice(0, 8).map((f) => `[${f.Tingkat}] ${path.relative(repoRoot, f.File)}:${f.Line} ${f.Pesan}`)
    const more = r.Findings.length > 8 ? `\n  (+${r.Findings.length - 8} temuan lagi)` : ''
    // Kalau ada GENTING: JANGAN understate ke ikon biasa -> beri penanda kuat di teks (tetap non-blocking).
    const parah = r.Genting > 0 ? ` ADA ${r.Genting} temuan GENTING - owner WAJIB tinjau SEGERA (rahasia bocor / pagar keamanan mati).` : ''
    return {
      id: 'ai-config', label: 'Keamanan config-AI (SARAN owner-gated)', level: LEVEL.RAPIKAN,
      detail: `GENTING ${r.Genting} - PENTING ${r.Penting} - RAPIKAN ${r.Rapikan}.${parah} SARAN owner-gated (sec. 4.6) - gerbang TIDAK diblokir (mutu/keamanan config = keputusan owner).\n  ${sample.join('\n  ')}${more}`,
    }
  } catch (e) {
    // Jangan bikin gerbang crash gara-gara pemeriksa SARAN ini -> INFO (dilewati).
    return { id: 'ai-config', label: 'Keamanan config-AI', level: LEVEL.INFO, detail: `dilewati (${e.message}).` }
  }
}

// Penjaga "error-ditelan-diam": pindai blok penangkap-error KOSONG (try/catch atau .catch() atau
// except: pass Python yang menelan error tanpa pesan & tanpa komentar-alasan). Cuma-baca, meng-IMPORT
// robot engine/swallowed-error-check.mjs yang sudah teruji (anti-duplikasi sec. 5).
//
// MODE-PERINGATAN (keputusan Item #1, docs/plans/WILLEY_BORROW_IMPLEMENTASI.md sec. §4.6): level RAPIKAN -
// TAK PERNAH memblokir gerbang (bahkan --strict). Kenapa bukan pemblokir-keras: (a) mutu-kode itu bisa-
// dibalik (reversible) -> biaya salah-blok > biaya kelewat; (b) robot BARU ini belum punya angka laju-
// alarm-palsu nyata, jadi belum layak menyandera rilis (sec. 4.6 "naik ke pemblokir HANYA setelah eval").
// Selaras runAiConfigCheck yang juga RAPIKAN owner-gated. Kalau kelak terbukti laju-alarm-palsu rendah,
// bisa dinaikkan ke PENTING (memblokir saat --strict). Temuan tetap DICETAK jujur (sec. 8.2 jangan understate).
export function runSwallowedCheck(repoRoot) {
  try {
    const { findings, scanned } = runSwallowedErrorCheck(repoRoot)
    if (findings.length === 0) {
      return { id: 'swallowed', label: 'Error-ditelan-diam (catch/except kosong)', level: LEVEL.OK, detail: `${scanned} berkas kode dipindai - 0 blok penangkap-error kosong.` }
    }
    const sample = findings.slice(0, 8).map((f) => `${path.relative(repoRoot, f.File)}:${f.Line} (${f.Kind})`)
    const more = findings.length > 8 ? `\n  (+${findings.length - 8} temuan lagi)` : ''
    return {
      id: 'swallowed', label: 'Error-ditelan-diam (catch/except kosong) - SARAN', level: LEVEL.RAPIKAN,
      detail: `${findings.length} blok penangkap-error KOSONG (menelan error tanpa pesan - kayak alarm dimatikan diam-diam). Kalau memang sengaja, tulis alasannya sebagai komentar DI DALAM blok supaya lolos. SARAN (tak memblokir gerbang).\n  ${sample.join('\n  ')}${more}`,
    }
  } catch (e) {
    // Jangan bikin gerbang crash gara-gara pemeriksa SARAN ini -> INFO (dilewati).
    return { id: 'swallowed', label: 'Error-ditelan-diam (catch/except kosong)', level: LEVEL.INFO, detail: `dilewati (${e.message}).` }
  }
}

// Penjaga "anggaran kerumitan": berkas gemuk / fungsi panjang (robot engine/complexity-budget.mjs, cuma-baca,
// anti-duplikasi §5; buang file auto-generate lewat isGenerated). MODE-PERINGATAN RAPIKAN - TAK memblokir
// (bahkan --strict; §4.6 mutu-kode bisa-dibalik + robot baru belum punya angka laju-alarm-palsu). MODE KIT:
// tooling kit memang besar (update-kit.mjs 1233 baris dll) -> temuan turun ke INFO supaya tak menyandera
// Gerbang 0/0/0 kit; MODE PROJECT (app klien): RAPIKAN (nudge). Temuan tetap DICETAK jujur (§8.2 jangan
// understate). TANPA skor-angka gabungan (§8.2-3b). Adaptasi ide Ponytail (MIT).
export function checkComplexityBudget(repoRoot, mode = 'project') {
  try {
    const { findings, scanned, generated } = runComplexityBudget(repoRoot)
    const genNote = generated > 0 ? ` (+${generated} file auto-generate dilewati)` : ''
    if (findings.length === 0) {
      return { id: 'complexity', label: 'Anggaran kerumitan (berkas/fungsi panjang)', level: LEVEL.OK, detail: `${scanned} berkas kode dipindai${genNote} - 0 berkas gemuk / fungsi panjang.` }
    }
    const sample = findings.slice(0, 8).map((f) => `${path.relative(repoRoot, f.File)}:${f.Line} (${f.Kind} ${f.Count}/${f.Budget} baris)`)
    const more = findings.length > 8 ? `\n  (+${findings.length - 8} temuan lagi)` : ''
    const level = mode === 'kit' ? LEVEL.INFO : LEVEL.RAPIKAN
    return {
      id: 'complexity', label: 'Anggaran kerumitan (berkas/fungsi panjang) - SARAN', level,
      detail: `${findings.length} sinyal kerumitan${genNote} (berkas gemuk / fungsi panjang - sarang bug + boros token AI). Pecah jadi lebih kecil (REFACTOR_STANDARD.md). SARAN (tak memblokir gerbang).\n  ${sample.join('\n  ')}${more}`,
    }
  } catch (e) {
    return { id: 'complexity', label: 'Anggaran kerumitan', level: LEVEL.INFO, detail: `dilewati (${e.message}).` }
  }
}

// Penjaga "kunci env lupa di-set": banding NAMA kunci .env.example vs .env.local (robot
// engine/env-keys-check.mjs — cuma-baca NAMA, nilai rahasia tak pernah disentuh; dijaga tes keamanannya).
// Dibangunkan ke gerbang v2.0.0 (Paket C pindai babak-2): dulu hanya CLI manual `npx lintasai env-keys`
// yang 0 kali disebut alur mana pun = robot tidur; padahal env-var lupa di-set = penyebab crash
// "jalan di lokal, mati saat online" tersering. NON-BLOCKING BY DESIGN (selaras runSwallowedCheck:
// robot baru tanpa data laju-alarm-palsu tak boleh menyandera rilis — kunci yang sengaja hanya di
// dashboard deploy = alarm-palsu sah): WARN robot dipetakan ke RAPIKAN, TAK PERNAH memblokir (pun --strict).
export function runEnvKeys(repoRoot) {
  try {
    const r = compareEnvKeys(repoRoot)
    if (!r.exampleExists || !r.actualExists) {
      const info = r.findings[0]
      return { id: 'env-keys', label: 'Kunci env (.env.example vs .env.local)', level: LEVEL.INFO, detail: info ? info.message : 'dilewati.' }
    }
    if (r.missing.length === 0) {
      return { id: 'env-keys', label: 'Kunci env (.env.example vs .env.local)', level: LEVEL.OK, detail: `semua kunci kontrak sudah di-set${r.extra.length > 0 ? ` (+${r.extra.length} kunci lokal di luar kontrak — pertimbangkan daftarkan NAMA-nya ke .env.example)` : '.'}` }
    }
    return {
      id: 'env-keys', label: 'Kunci env belum di-set - SARAN', level: LEVEL.RAPIKAN,
      detail: `${r.missing.length} kunci ada di .env.example tapi BELUM di .env.local: ${r.missing.join(', ')}. Set juga di dashboard deploy (Vercel/Railway/Render) SEBELUM online — env lupa di-set = penyebab crash tersering. SARAN (tak memblokir gerbang).`,
    }
  } catch (e) {
    return { id: 'env-keys', label: 'Kunci env (.env.example vs .env.local)', level: LEVEL.INFO, detail: `dilewati (${e.message}).` }
  }
}

// Penjaga "peta project belum diisi": docs/architecture.md di-deploy dari template berisi penanda
// "⛔ BELUM DIISI" (template baru) / "[TBD" (template lama belum dimigrasi) yang HARUS diisi staff.
// Peta separuh-isi = AI menelan placeholder sebagai fakta ATAU jatuh ke jelajah-repo (boros token +
// lambat) — persis yang peta ini mestinya cegah (§7.3 READ-MINIMAL). Robot menghitung penanda tersisa.
// Deteksi ASCII-only (frasa "BELUM DIISI" + "[TBD") supaya kode tak menaruh emoji literal (aman dari
// pemindai Unicode + ESLint). NON-BLOCKING (RAPIKAN, tak pernah memblokir — pun --strict): peta tak-
// lengkap = mutu-dokumen reversible + owner-gated, bukan keamanan (selaras runSwallowedCheck/runEnvKeys).
// Cuma-baca 1 berkas. Berlaku kit + project (peta kit sendiri sudah terisi -> OK, tak bikin noise).
export function checkArchitectureMap(repoRoot) {
  try {
    const p = path.join(repoRoot, 'docs', 'architecture.md')
    if (!fs.existsSync(p)) {
      return { id: 'arch-map', label: 'Peta project (docs/architecture.md)', level: LEVEL.INFO, detail: 'belum ada — tanpa peta, AI cenderung jelajah repo (lebih boros). Pertimbangkan buat dari templates/architecture.md (§7.3).' }
    }
    const text = readText(p)
    const markers = (text.match(/BELUM DIISI|\[TBD/g) || []).length
    if (markers === 0) {
      return { id: 'arch-map', label: 'Peta project (docs/architecture.md)', level: LEVEL.OK, detail: 'ada + tak ada bagian "belum diisi" (AI bisa cherry-pick berkas tanpa jelajah repo).' }
    }
    return {
      id: 'arch-map', label: 'Peta project belum lengkap - SARAN', level: LEVEL.RAPIKAN,
      detail: `${markers} bagian "BELUM DIISI"/[TBD] masih ada di docs/architecture.md — AI bisa menelan placeholder sebagai fakta / jatuh ke jelajah-repo (boros token + lambat). Isi peta (utamakan tabel "Peta Modul -> Lokasi") supaya AI cepat + tak bingung. SARAN (tak memblokir gerbang).`,
    }
  } catch (e) {
    return { id: 'arch-map', label: 'Peta project (docs/architecture.md)', level: LEVEL.INFO, detail: `dilewati (${e.message}).` }
  }
}

// Penjaga "mutu kode + library rentan per-bahasa": robot engine/stack-check.mjs (tsc / npm audit CVE /
// ruff / bandit / dll — config-gated, statis, tanpa --fix). Dibangunkan v2.0.0 (Paket C): dulu hanya
// CLI manual. HANYA jalan saat --strict (gerbang rilis; preflight harian tetap cepat — alat bisa
// makan 1-3 menit). eslint di-exclude (runEslint gerbang sudah menjalankannya — jangan dobel).
// NON-BLOCKING pola runAiConfigCheck: robot menandai semua temuan alat = PENTING (engine/stack-check.mjs)
// dan PENTING memblokir saat --strict — maka DIBUNGKUS ke RAPIKAN owner-gated (severity asli tetap
// dicetak jujur); kegagalan jaringan `npm audit` (ENOTFOUND dkk.) = INFO dilewati, bukan temuan palsu.
// DIPERTIMBANGKAN & DITOLAK (2026-07-19): menaikkan temuan cek-tipe (tsc/mypy) jadi PENTING supaya
// memblokir di --strict. DIBATALKAN karena tests/preflight-robot-baru.test.mjs:54 mengunci kontrak
// "apa pun hasilnya, level selalu non-blokir", dengan alasan tertulis di header berkas itu: "robot
// baru tanpa data laju-alarm-palsu tak boleh menyandera rilis". Melemahkan tes itu agar perubahan
// lolos = persis yang sec.12 larang. Lubang utamanya sudah ditutup runAppBuild (build gagal =
// GENTING); sisa celahnya sempit (bundler yang melewati cek tipe / `ignoreBuildErrors: true`) dan
// itu keputusan owner, bukan keputusan AI.
export function runStackCheck(repoRoot) {
  try {
    const r = invokeLintasStackCheck({ repoRoot, quiet: true, timeoutSec: 120, excludeTools: ['eslint'] })
    if (!r || r.stack === 'unknown') {
      return { id: 'stack-check', label: 'Mutu kode per-bahasa (stack-check)', level: LEVEL.INFO, detail: 'stack tak dikenali / tak ada alat berlaku - dilewati.' }
    }
    const findings = r.findings || []
    const jaringan = findings.filter((f) => f.tool === 'npm' && /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRE|network|ENETUNREACH/i.test(f.pesan || ''))
    const nyata = findings.filter((f) => !jaringan.includes(f))
    const ranInfo = (r.ran && r.ran.length > 0) ? `alat jalan: ${r.ran.join(', ')}` : 'tak ada alat yang bisa dijalankan'
    const skipped = (r.skippedMissingTool && r.skippedMissingTool.length > 0) ? ` | belum terpasang (dilewati, BUKAN bersih): ${r.skippedMissingTool.join(', ')}` : ''
    if (nyata.length === 0) {
      const netNote = jaringan.length > 0 ? ' | npm audit dilewati (jaringan bermasalah — jalankan ulang saat online).' : ''
      return { id: 'stack-check', label: 'Mutu kode per-bahasa (stack-check)', level: (r.ran && r.ran.length > 0) ? LEVEL.OK : LEVEL.INFO, detail: `${ranInfo}${skipped} - 0 temuan.${netNote}` }
    }
    const sample = nyata.slice(0, 6).map((f) => `[${f.tingkat}] ${f.lang}/${f.tool} ${String(f.pesan).slice(0, 160)}`)
    const more = nyata.length > 6 ? `\n  (+${nyata.length - 6} temuan lagi)` : ''
    return {
      id: 'stack-check', label: 'Mutu kode per-bahasa (SARAN owner-gated)', level: LEVEL.RAPIKAN,
      detail: `${nyata.length} temuan alat (severity asli dicetak jujur; termasuk cek library rentan/CVE). SARAN owner-gated - gerbang TIDAK diblokir.\n  ${sample.join('\n  ')}${more}`,
    }
  } catch (e) {
    return { id: 'stack-check', label: 'Mutu kode per-bahasa (stack-check)', level: LEVEL.INFO, detail: `dilewati (${e.message}).` }
  }
}

// ---------------------------------------------------------------------------
// Helper git (defensif: kalau git tak ada / bukan repo -> return null, pemeriksa terkait dilewati).
// ---------------------------------------------------------------------------
// Di-EXPORT supaya tes repo-nyata (preflight.test.mjs) membanding ke tag TERBARU sungguhan -
// bukan tag mati yang ditulis-keras (temuan cek-silang 2026-07-09: tag pinned bikin tes merah
// permanen setelah kenaikan skema pertama yang sah dirilis).
export function getLastTag(repoRoot) {
  const r = runCmd('git', ['-C', repoRoot, 'tag', '--sort=-v:refname'])
  if (cmdNotRun(r) || r.status !== 0 || !r.stdout) return null
  const tags = r.stdout.split(/\r?\n/).map((s) => s.trim()).filter((s) => /^v?\d+\.\d+\.\d+$/.test(s))
  return tags[0] || null
}

function getChangedFiles(repoRoot, lastTag) {
  const r = runCmd('git', ['-C', repoRoot, 'diff', '--name-only', `${lastTag}..HEAD`])
  if (cmdNotRun(r) || r.status !== 0) return null
  return r.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
}

// ---------------------------------------------------------------------------
// Laporan (bahasa Indonesia non-programmer)
// ---------------------------------------------------------------------------
const ICON = { OK: '[OK]   ', GENTING: '[GENTING]', PENTING: '[PENTING]', RAPIKAN: '[RAPIKAN]', INFO: '[info] ' }

// Format lama-waktu ramah baca (#1 "cara aman", keputusan owner 2026-06-24): < 1 dtk -> "850 ms";
// >= 1 dtk -> "12.3 dtk". Dipakai untuk menampilkan bagian mana yang lambat (transparansi).
export function fmtDur(ms) {
  if (typeof ms !== 'number' || ms < 0) return ''
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} dtk`
}

function printReport(results, summary, ctx) {
  const log = ctx.log || console.log
  log('')
  log('=== lintasAI Preflight - Gerbang Pra-Rilis (QA + QC) ===')
  log(`Mode: ${ctx.mode}  |  strict (rilis): ${ctx.strict ? 'YA' : 'tidak'}  |  runtime: Node-murni`)
  log('-'.repeat(64))
  for (const r of results) {
    const dur = (typeof r.ms === 'number') ? `  (${fmtDur(r.ms)})` : ''
    const head = `  ${ICON[r.level] || '[?]'}  ${r.label}${dur}`
    // detail multi-baris di-indent supaya rapi terbaca.
    const detail = String(r.detail || '').split('\n').map((l, i) => (i === 0 ? l : '          ' + l)).join('\n')
    log(`${head.padEnd(52)} ${detail}`)
  }
  log('-'.repeat(64))
  const totalDur = (typeof ctx.totalMs === 'number') ? `  |  total waktu ${fmtDur(ctx.totalMs)}` : ''
  log(`Ringkasan: GENTING ${summary.genting.length} | PENTING ${summary.penting.length} | RAPIKAN ${summary.rapikan.length}${totalDur}`)
  if (summary.exitCode === 0) {
    if (summary.penting.length > 0 || summary.rapikan.length > 0) {
      log('HASIL: LULUS (boleh dilanjut). Ada peringatan di atas - tinjau sebelum RILIS. Untuk gerbang rilis ketat: `npm run preflight -- --strict`.')
    } else {
      log('HASIL: LULUS - bersih.')
    }
  } else {
    const why = ctx.strict ? 'GENTING/PENTING (mode --strict)' : 'GENTING'
    log(`HASIL: GAGAL - ada ${summary.blockers.length} hal ${why} yang harus diperbaiki dulu. Gerbang BELUM boleh dinyatakan "lulus".`)
  }
  log('')
}

// ---------------------------------------------------------------------------
// Orkestrator utama. Jalankan semua pemeriksa berurutan, kumpulkan hasil, pilah, cetak.
// ---------------------------------------------------------------------------
export function runPreflight({ repoRoot = defaultRepoRoot(), strict = false, log = console.log } = {}) {
  // Penjaga anti-rekursi STRUKTURAL (bukan sekadar konvensi-komentar): runPreflight men-spawn `npm test`,
  // yang menjalankan SEMUA *.test.mjs termasuk preflight.test.mjs. Kalau suatu saat tes itu memanggil
  // runPreflight() -> preflight men-spawn npm test lagi -> rekursi tak hingga. Anak-proses tes diberi
  // env LINTASAI_PREFLIGHT_ACTIVE=1 (lihat childEnv di bawah); kalau runPreflight terpanggil saat env itu
  // menyala -> TOLAK keras. Ini mengubah "dijaga komentar" jadi "dijaga mesin".
  if (process.env.LINTASAI_PREFLIGHT_ACTIVE === '1') {
    throw new Error('runPreflight() dipanggil DI DALAM preflight (rekursi) - dicegah. Tes harus menguji fungsi murni, jangan menjalankan preflight penuh.')
  }
  const pkg = readPackageJson(repoRoot)
  const mode = pkg.name === 'lintasai' ? 'kit' : 'project'
  const results = []
  const tStart = Date.now()
  // Stopwatch per-pemeriksa (#1 "cara aman", keputusan owner 2026-06-24): lampirkan lama-waktu (ms) ke
  // hasil tiap pemeriksa supaya laporan menampilkan bagian mana yang lambat (transparansi) TANPA
  // memparalelkan tes berat. Kenapa tak paralel: menjalankan tes Node + Pester (dua suite berat yang
  // sama-sama men-spawn sub-proses) bersamaan berisiko bikin tes "gagal acak"/flaky di mesin lemah ->
  // gerbang yang ANDAL lebih penting dari sedikit lebih cepat (pelajaran kit, anti rasa-aman-palsu).
  // Hanya MENAMBAH r.ms; hasil & urutan pemeriksa tetap utuh.
  const timed = (fn) => { const t0 = Date.now(); const r = fn(); if (r && typeof r === 'object' && !Array.isArray(r)) r.ms = Date.now() - t0; return r }

  // --- Semua pemeriksa Node (kit 100% Node sejak v2.0.0) --- anak-proses tes diberi penanda
  // anti-rekursi di env. Smoke Node ikut di runNodeTests (tests/smoke-portable.test.mjs).
  const childEnv = { ...process.env, LINTASAI_PREFLIGHT_ACTIVE: '1' }
  // Build DULUAN (2026-07-19): (a) aplikasi yang gagal dibangun bikin pemeriksa lain tak bermakna;
  // (b) checkPerfBudget di bawah butuh hasil build (.next/) - dulu selalu auto-lewat karena tak ada
  // yang pernah membangun. Urutan ini yang membuat anggaran halaman akhirnya benar-benar terukur.
  results.push(timed(() => runAppBuild(repoRoot, childEnv, mode)))
  results.push(timed(() => runNodeTests(repoRoot, childEnv, mode)))
  results.push(timed(() => runEslint(repoRoot, mode)))
  results.push(timed(() => runConsistency(repoRoot)))
  results.push(timed(() => runUnicode(repoRoot)))
  results.push(timed(() => checkPerfBudget(repoRoot)))
  results.push(timed(() => checkRulesBudget(repoRoot)))
  results.push(timed(() => checkAlwaysLoadBudget(repoRoot)))
  results.push(timed(() => checkRulesRefs(repoRoot)))
  results.push(timed(() => checkToolReach(repoRoot)))
  results.push(timed(() => checkSkillFormat(repoRoot)))
  results.push(timed(() => checkRegistryDrift(repoRoot)))
  results.push(timed(() => checkPetaDrift(repoRoot)))
  results.push(timed(() => runAiConfigCheck(repoRoot)))
  results.push(timed(() => runSwallowedCheck(repoRoot)))
  results.push(timed(() => checkComplexityBudget(repoRoot, mode)))
  results.push(timed(() => runEnvKeys(repoRoot)))
  results.push(timed(() => checkArchitectureMap(repoRoot)))
  // stack-check (tsc/npm-audit-CVE/ruff/bandit dll.) HANYA di gerbang rilis ketat — alat bisa 1-3 menit;
  // preflight harian tetap cepat. Non-blokir (dibungkus RAPIKAN) — lihat komentar runStackCheck.
  if (strict) results.push(timed(() => runStackCheck(repoRoot)))

  // --- Cek kelengkapan rilis + kode-vs-tes (butuh tag git; defensif kalau git tak ada) ---
  const lastTag = getLastTag(repoRoot)
  for (const r of checkReleaseCompleteness(repoRoot, { lastTag, mode })) results.push(r)
  // Penjaga Keranjang 1 (naik skema artefak wajib [BREAKING]) - urusan repo KIT saja: hanya
  // maintainer kit yang bisa menaikkan peta versi-diharapkan; project klien tak menyentuhnya.
  if (mode === 'kit') {
    for (const r of checkSchemaRaiseBreaking(repoRoot, { lastTag })) results.push(r)
  }
  if (lastTag) {
    const changed = getChangedFiles(repoRoot, lastTag)
    if (changed) results.push(classifyCodeVsTests(changed))
  }

  const summary = classify(results, { strict })
  const totalMs = Date.now() - tStart
  printReport(results, summary, { mode, strict, log, totalMs })
  return { mode, results, totalMs, ...summary }
}

// ---------------------------------------------------------------------------
// main (CLI)
// ---------------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2)
  const strict = args.includes('--strict')
  // Terima --repo-root ATAU --project-root (dispatcher `npx lintasai preflight` menyuntik
  // --project-root <cwd-user>; lihat bin/lintasai.js). Tanpa ini, default repoRoot = folder kit (cache
  // npm) -> preflight memeriksa KIT, bukan project klien. --repo-root menang kalau keduanya diberi.
  const flagIdx = (name) => { const k = args.indexOf(name); return k >= 0 && k + 1 < args.length ? path.resolve(args[k + 1]) : null }
  const repoRoot = flagIdx('--repo-root') || flagIdx('--project-root') || defaultRepoRoot()
  const r = runPreflight({ repoRoot, strict })
  // exit-code = 1 kalau ada pemblokir, 0 kalau lulus. process.exitCode (bukan exit) supaya stdout
  // selesai di-flush dulu (cermin pola aman engine/risk-gate.js).
  process.exitCode = r.exitCode
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
