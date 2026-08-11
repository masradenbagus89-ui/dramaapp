#!/usr/bin/env node
// engine/env-check.mjs - Robot "Pemeriksa Lingkungan Setara" (deterministik, ~0 token AI).
//
// APA INI: memotret LINGKUNGAN EKSEKUSI di komputer (versi Node/OS/Git + ada-tidaknya
// node_modules/lockfile/.env.local), lalu menilainya terhadap ambang yang diharapkan. Tujuannya
// menutup akar keluhan "di dev jalan, di client TERASA BEDA": penyebab tersering = beda versi/konfig
// lingkungan, padahal `kit doctor` lama cuma cek berkas kit + sha256 -- BUTA ke runtime client.
//
// DIPANGGIL DARI: invokeDoctor (kit.mjs) sebagai BAGIAN DEFAULT doctor (v2.0.0 - gerbang
// output-identik ADR-003 gugur bersama kit.ps1; janji §7.6); bisa dimatikan dengan --no-env.
// Robot ini mengembalikan DATA (facts + findings); kit.mjs yang mencetak + menambah penghitung
// OK/WARN/ERROR (invokeDoctor pakai console.log + counter, BUKAN return teks -- jadi env-check
// sengaja TIDAK mencetak sendiri supaya satu gaya output + mudah diuji tanpa menangkap stdout).
//
// v2.0.0: kit 100% Node -> env-check TIDAK lagi memotret/menilai PowerShell (dulu ada temuan "PS tak
// terdeteksi = jalur cadangan kit butuh ini" - basi + menyesatkan karena tak ada lagi jalur PS).
//
// KEAMANAN (WAJIB, dikunci tes env-check.test.mjs):
//   - HANYA mengumpulkan nomor versi + platform + boolean ada/tidak. DILARANG mengambil/mencetak
//     hostname, username, path absolut, isi env var, atau ISI .env (cuma cek NAMA berkas ada/tidak,
//     sesuai CLAUDE_universal_v1 sec.8.1 #6 "kerahasiaan secret mutlak").
//   - Spawn Git pakai array-args (tanpa shell -> tak ada injeksi) + timeout 5 detik.
//   - FAIL-HONEST: kalau deteksi gagal/timeout -> lapor "tidak terdeteksi", JANGAN diam-diam "OK"
//     (sec.6.3 #4 "timbangan mati != 0 kg").
//
// REUSE (anti-duplikasi sec.5): getPackageManager (project-detect.mjs) untuk tebak alat-paket +
// lockfile; stripBom (fs-text.mjs) untuk baca package.json ber-BOM Windows tanpa menyedak JSON.parse.

import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { getPackageManager } from './project-detect.mjs'
import { readTextSafe, isFile, isDir } from './fs-text.mjs'
import { readLintasProjectManifest, resolveLintasManifestPath } from './project-manifest.mjs'

// Ambang Node default kalau project tak menyatakan engines.node. Selaras package.json kit (>=18) +
// LTS aktif minimum yang masih didukung saat berkas ini ditulis.
export const DEFAULT_NODE_MAJOR = 18

// Batas waktu deteksi alat luar (Git) (ms).
const SPAWN_TIMEOUT_MS = 5000

// --- util kecil (senyap) -------------------------------------------------------------------------
// readTextSafe/isFile/isDir: dipindah ke sumber bersama engine/fs-text.mjs (audit fungsi-kembar
// 2026-06-25; fileExists/dirExists -> isFile/isDir 2026-07-18) -> tak ada salinan yang bisa drift.

// parseNodeMajor: "v20.11.0" / "20.11.0" -> 20 (atau null kalau tak ada angka).
export function parseNodeMajor(versionString) {
  if (!versionString) return null
  const m = String(versionString).match(/(\d+)/)
  return m ? Number(m[1]) : null
}

// parseEnginesNodeMajor: terjemahkan rentang semver engines.node -> major MINIMAL yang masuk akal.
// ">=18" -> 18 | "^20.0.0" -> 20 | "~18.1.0" -> 18 | "18.x" -> 18 | "20 || 22" -> 20 | "*"/"" -> null.
// Sengaja sederhana (angka pertama = major minimal): cukup untuk gerbang "Node terlalu lama".
export function parseEnginesNodeMajor(range) {
  if (!range || typeof range !== 'string') return null
  const m = range.match(/(\d+)/)
  return m ? Number(m[1]) : null
}

// getNodeThreshold: ambang major Node yang diharapkan + dari mana asalnya (untuk pesan jujur).
// Sumber: engines.node di package.json PROJECT (kalau ada) -> kalau tidak, DEFAULT_NODE_MAJOR.
export function getNodeThreshold(projectRoot) {
  const pkgPath = path.join(projectRoot, 'package.json')
  const raw = readTextSafe(pkgPath)
  if (raw) {
    try {
      const pkg = JSON.parse(raw)
      const eng = pkg && pkg.engines && pkg.engines.node
      const major = parseEnginesNodeMajor(eng)
      if (major != null) return { major, source: `package.json engines.node ("${eng}")` }
    } catch { /* package.json rusak -> pakai default */ }
  }
  return { major: DEFAULT_NODE_MAJOR, source: 'ambang default lintasAI' }
}

// detectGit: "git version 2.43.0" -> "2.43.0". FAIL-HONEST -> null.
export function detectGit() {
  try {
    const r = spawnSync('git', ['--version'], { encoding: 'utf8', timeout: SPAWN_TIMEOUT_MS, windowsHide: true })
    if (!r.error && r.status === 0 && r.stdout && r.stdout.trim()) {
      return r.stdout.trim().replace(/^git version\s+/i, '')
    }
  } catch { /* git tak terpasang */ }
  return null
}

// collectEnvironment: kumpulkan FAKTA lingkungan (semua bebas-rahasia). { skipSpawn } untuk tes
// deterministik (lewati deteksi Git yang bergantung mesin).
export function collectEnvironment(projectRoot, { skipSpawn = false } = {}) {
  const pm = getPackageManager(projectRoot)
  const hasPackageJson = isFile(path.join(projectRoot, 'package.json'))
  const lockFile = pm.lockFile // nama berkas-kunci (mis. "package-lock.json") atau null
  return {
    nodeVersion: process.version, // "v20.11.0"
    nodeMajor: parseNodeMajor(process.version),
    platform: process.platform, // "win32"/"linux"/"darwin" -- BUKAN hostname
    osRelease: os.release(), // mis. "10.0.26100" (build OS, bukan PII)
    arch: process.arch, // "x64"/"arm64"
    git: skipSpawn ? null : detectGit(),
    packageManager: pm.manager, // "npm"/"pnpm"/"yarn"/"bun"/"none"
    lockFile,
    hasPackageJson,
    hasNodeModules: isDir(path.join(projectRoot, 'node_modules')),
    hasLockfile: !!(lockFile && isFile(path.join(projectRoot, lockFile))),
    hasEnvLocal: isFile(path.join(projectRoot, '.env.local')), // cuma ADA/tidak; isi TAK dibaca
  }
}

// evaluateEnvironment: ubah fakta jadi temuan berlabel level. { baseline } opsional (penyokong
// roadmap #3 "cap lingkungan" -- belum diisi di versi inti; siap dipakai nanti).
// Level: 'OK'|'WARN'|'ERROR'|'INFO' (cermin konvensi doctor). 'INFO' = informasi, tak menambah skor.
export function evaluateEnvironment(facts, projectRoot, { baseline = null } = {}) {
  const findings = []

  // Baris potret ringkas (selalu, INFO) -- berguna untuk owner/AI mendiagnosa "beda" dari jauh.
  const gitStr = facts.git ? `Git ${facts.git}` : 'Git tidak terdeteksi'
  findings.push({
    level: 'INFO',
    label: 'Lingkungan',
    message: `Node ${facts.nodeVersion} | ${facts.platform} ${facts.osRelease} ${facts.arch} | ${gitStr} | alat-paket: ${facts.packageManager}`,
  })

  // 1. Versi Node vs ambang -- AKAR parity paling sering.
  const threshold = getNodeThreshold(projectRoot)
  if (facts.nodeMajor != null && facts.nodeMajor < threshold.major) {
    findings.push({
      level: 'ERROR',
      label: 'Versi Node',
      message: `Node kamu v${facts.nodeMajor} (${facts.nodeVersion}), padahal diharapkan minimal v${threshold.major} [${threshold.source}].`,
      hint: 'Naikkan Node dulu (https://nodejs.org, pilih LTS) — beda versi Node sering jadi sumber "kok di sini beda".',
    })
  } else if (facts.nodeMajor != null) {
    findings.push({
      level: 'OK',
      label: 'Versi Node',
      message: `Node v${facts.nodeMajor} memenuhi minimal v${threshold.major} [${threshold.source}].`,
    })
  }

  // 2. node_modules vs package.json -- KANDIDAT self-heal aman (idempoten).
  if (facts.hasPackageJson && !facts.hasNodeModules) {
    const installCmd = facts.packageManager !== 'none' ? `${facts.packageManager} install` : 'npm install'
    findings.push({
      level: 'WARN',
      label: 'Library belum dipasang',
      message: 'Ada package.json tapi folder node_modules belum ada — library project belum terpasang.',
      hint: `Jalankan "${installCmd}" dulu (aman & bisa diulang).`,
    })
  } else if (facts.hasPackageJson) {
    findings.push({ level: 'OK', label: 'Library project', message: 'node_modules ada (library project terpasang).' })
  }

  // 3. Lockfile (pengunci versi library) -- INFO (saran, bukan kesalahan).
  if (facts.hasPackageJson && facts.packageManager !== 'none' && !facts.hasLockfile) {
    findings.push({
      level: 'INFO',
      label: 'Pengunci versi',
      message: `Belum ada berkas pengunci versi (lockfile) untuk ${facts.packageManager}.`,
      hint: 'Commit lockfile-nya supaya tiap komputer memasang versi library yang SAMA (kunci utama "biar tak beda-beda").',
    })
  }

  // 4. Baseline "cap lingkungan" (opsional, penyokong roadmap #3). Hanya INFO penunjuk-sumber-beda.
  if (baseline && baseline.recorded_node_major != null && facts.nodeMajor != null &&
      baseline.recorded_node_major !== facts.nodeMajor) {
    findings.push({
      level: 'INFO',
      label: 'Beda dari lingkungan acuan',
      message: `Kit ini terakhir disetel/uji di Node v${baseline.recorded_node_major}; komputermu Node v${facts.nodeMajor}.`,
      hint: 'Kalau ada yang terasa beda, perbedaan versi ini kandidat pertama untuk dicek.',
    })
  }

  return findings
}

// readEnvBaseline: ambil "cap lingkungan" dari project.lintas.jsonc (kalau ada) -> { recorded_node_major } | null.
// Reuse pembaca kartu identitas (readLintasProjectManifest) -> tak menduplikasi parser .jsonc (anti-duplikasi
// sec.5). Senyap kalau kartu tak ada / rusak / belum punya blok environment (project lama) -> null = fitur
// menyala mulus saat kartu baru dipasang, TIDAK error untuk project lama.
export function readEnvBaseline(projectRoot) {
  try {
    const r = readLintasProjectManifest(resolveLintasManifestPath(projectRoot))
    const env = r && r.Ok && r.Manifest ? r.Manifest.environment : null
    if (env && env.recorded_node_major != null) return { recorded_node_major: Number(env.recorded_node_major) }
  } catch { /* senyap -> jalan tanpa baseline */ }
  return null
}

// runEnvCheck: orkestrasi penuh -> { facts, findings, summary:{ok,warn,err} }.
// Baseline: kalau opts.baseline TAK diberikan, auto-baca dari project.lintas.jsonc (cap lingkungan, Quick Win #3).
export function runEnvCheck(projectRoot, opts = {}) {
  const facts = collectEnvironment(projectRoot, opts)
  const baseline = opts.baseline !== undefined ? opts.baseline : readEnvBaseline(projectRoot)
  const findings = evaluateEnvironment(facts, projectRoot, { baseline })
  const summary = { ok: 0, warn: 0, err: 0 }
  for (const f of findings) {
    if (f.level === 'OK') summary.ok++
    else if (f.level === 'WARN') summary.warn++
    else if (f.level === 'ERROR') summary.err++
  }
  return { facts, findings, summary }
}
