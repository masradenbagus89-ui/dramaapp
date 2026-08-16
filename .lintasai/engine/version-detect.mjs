#!/usr/bin/env node
// engine/version-detect.mjs - Deteksi versi kit.
//
// MIGRASI grup [A] (ADR-003): robot regex
// MURNI (0 System API), C4 nol. Dipakai pemanggil Node (mis. bin/lintasai.js) + diuji node:test.
//
// Scan TERPADU lintas-format (regresi v1.13.3): ambil heading versi PERTAMA dari atas (= terbaru),
// terima KEDUA gaya: "## [X.Y.Z]" (Keep-a-Changelog, sekarang) DAN "## vX.Y.Z" (lama).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripBom } from './fs-text.mjs'

// Regex heading versi: ^##\s+\[?v?(\d+\.\d+\.\d+)
// Heading non-versi ('## [Unreleased]', '## Label ...') otomatis ter-skip (tak ada digit versi).
// Return 'vX.Y.Z' (selalu prefix 'v') atau null. Tidak throw - pemanggil yang memutuskan fallback.
export function getKitVersionFromChangelog(changelogPath) {
  if (!changelogPath || !fs.existsSync(changelogPath)) return null
  let content
  try { content = fs.readFileSync(changelogPath, 'utf8') } catch { return null }
  content = stripBom(content) // buang BOM
  // Pisah baris: pecah \r\n, \r-tunggal (Mac lama), DAN \n.
  // `split('\n')` lama tak memisah \r-tunggal -> heading versi setelah \r-tunggal terlewat (temuan cek-silang).
  for (const line of content.split(/\r\n|\r|\n/)) {
    const m = line.match(/^##\s+\[?v?(\d+\.\d+\.\d+)/)
    if (m) return 'v' + m[1] // berhenti di yang pertama (= terbaru)
  }
  return null
}

// Baca metadata.kit_version dari .install-manifest.json.
// PRIMARY source (apa yang BENAR-BENAR ter-install), bukan apa yang ada di file kit sekarang.
export function getKitVersionFromManifest(projectRoot) {
  const manifestPath = path.join(projectRoot, '.install-manifest.json')
  if (!fs.existsSync(manifestPath)) return null
  try {
    let json = fs.readFileSync(manifestPath, 'utf8') // Node default UTF-8
    // Buang BOM. Tanpa ini,
    // manifest ber-BOM (mis. disimpan Notepad 'Save As UTF-8') bikin JSON.parse melempar -> versi
    // jatuh ke CHANGELOG (basi/salah). Manifest tulisan kit = no-BOM
    // (strip = no-op), jadi ini murni menutup celah kalau user meng-edit manifest dengan editor ber-BOM.
    json = stripBom(json)
    const m = JSON.parse(json)
    if (m && m.metadata && m.metadata.kit_version) return String(m.metadata.kit_version)
  } catch { return null }
  return null
}

// Rantai pertahanan-berlapis.
//   1. manifest (PRIMARY) -> 2. konstanta versi kit (di Node = param
//   eksplisit kitVersionConst) -> 3. CHANGELOG regex -> 4. 'unknown'.
export function getKitVersionFallback(projectRoot, { changelogPath = null, kitVersionConst = null } = {}) {
  let ver = getKitVersionFromManifest(projectRoot)
  if (ver) return ver
  if (kitVersionConst) return kitVersionConst
  ver = getKitVersionFromChangelog(changelogPath || path.join(projectRoot, 'CHANGELOG.md'))
  if (ver) return ver
  return 'unknown'
}

function main() {
  const cl = process.argv[2] || path.join(process.cwd(), 'CHANGELOG.md')
  const v = getKitVersionFromChangelog(cl)
  console.log(v ?? '(tidak ketemu)')
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
