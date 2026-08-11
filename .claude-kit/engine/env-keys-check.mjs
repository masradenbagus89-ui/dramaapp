#!/usr/bin/env node
// engine/env-keys-check.mjs - Robot "Banding Kunci Env" (deterministik, ~0 token AI, CUMA-BACA).
//
// APA INI: membandingkan DAFTAR NAMA kunci environment antara berkas kontrak (.env.example) dan
// berkas nyata (.env.local) lalu melaporkan kunci yang HILANG / BERLEBIH. Menutup penyebab crash
// deploy tersering (Vercel/Railway/Render): 1 env-var lupa di-set -> aplikasi tumbang saat online.
//
// DIPANGGIL DARI: `npx lintasai env-keys` (dispatcher COMMANDS_NODE). Mengembalikan DATA
// (findings + missing/extra) supaya mudah diuji + dipakai ulang; main() yang mencetak.
//
// KEAMANAN MUTLAK (WAJIB, dikunci tes env-keys-check.test.mjs; CLAUDE_universal_v1 sec.8.1 #6
// "kerahasiaan secret mutlak" + boundary keras .env*):
//   - HANYA mengambil NAMA kunci (bagian KIRI dari tanda '='). NILAI (bagian KANAN) SENGAJA
//     tak pernah disentuh, disimpan, dicetak, atau dikembalikan. parseEnvKeys membuang nilai
//     di tempat -> tak ada jalan nilai rahasia bocor ke output/laporan.
//   - CUMA-BACA: tidak menulis/mengubah berkas apa pun. Tidak mengirim ke jaringan.
//   - FAIL-SENYAP-AMAN: berkas tak ada -> lapor "dilewati" (INFO), bukan error/crash.
//
// REUSE (anti-duplikasi sec.5): readTextSafe (fs-text.mjs) untuk baca berkas ber-BOM Windows.

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readTextSafe } from './fs-text.mjs'

// parseEnvKeys: teks berkas .env -> Set NAMA kunci. Abaikan komentar (#), baris kosong, prefix
// `export `. Ambil HANYA bagian kiri '='. KEAMANAN: nilai (kanan '=') tak pernah disimpan.
export function parseEnvKeys(text) {
  const keys = new Set()
  if (!text) return keys
  for (const rawLine of String(text).split(/\r?\n/)) {
    let line = rawLine.trim()
    if (!line || line.startsWith('#')) continue // komentar / baris kosong
    if (/^export\s+/i.test(line)) line = line.replace(/^export\s+/i, '') // "export FOO=bar"
    const eq = line.indexOf('=')
    const namePart = eq === -1 ? line : line.slice(0, eq) // KIRI '=' saja -> nilai dibuang
    const name = namePart.trim()
    // Nama kunci env yang sah: mulai huruf/underscore, lalu huruf/angka/underscore. Buang yang aneh
    // (mis. baris sampah / potongan nilai multi-baris) supaya tak jadi "kunci" palsu.
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) keys.add(name)
  }
  return keys
}

// compareEnvKeys: banding NAMA kunci .env.example (kontrak) vs .env.local (nyata).
// -> { exampleExists, actualExists, missing[], extra[], findings[] }. Semua bebas-nilai.
export function compareEnvKeys(projectRoot, opts = {}) {
  const exampleName = opts.example || '.env.example'
  const actualName = opts.actual || '.env.local'
  const exampleRaw = readTextSafe(path.join(projectRoot, exampleName)) // null kalau tak ada
  const actualRaw = readTextSafe(path.join(projectRoot, actualName))
  const exampleExists = exampleRaw != null
  const actualExists = actualRaw != null
  const exampleKeys = parseEnvKeys(exampleRaw)
  const actualKeys = parseEnvKeys(actualRaw)
  const missing = [...exampleKeys].filter((k) => !actualKeys.has(k)).sort()
  const extra = [...actualKeys].filter((k) => !exampleKeys.has(k)).sort()
  const findings = []

  if (!exampleExists) {
    findings.push({
      level: 'INFO',
      label: 'Kontrak env',
      message: `Tak ada ${exampleName} (kontrak daftar kunci) — pemeriksaan kunci env dilewati.`,
      hint: `Buat ${exampleName} berisi NAMA kunci (tanpa nilai rahasia) supaya tiap komputer tahu env apa yang wajib di-set.`,
    })
    return { exampleExists, actualExists, missing: [], extra: [], findings }
  }
  if (!actualExists) {
    findings.push({
      level: 'INFO',
      label: 'Env lokal',
      message: `${exampleName} ada, tapi ${actualName} belum ada — belum bisa dibandingkan.`,
      hint: `Salin ${exampleName} jadi ${actualName} lalu isi nilainya (JANGAN commit ${actualName}).`,
    })
    return { exampleExists, actualExists, missing: [], extra: [], findings }
  }

  if (missing.length > 0) {
    findings.push({
      level: 'WARN',
      label: 'Kunci env belum di-set',
      message: `${missing.length} kunci ada di ${exampleName} tapi BELUM ada di ${actualName}: ${missing.join(', ')}`,
      hint: `Set kunci ini di ${actualName} (dan di dashboard deploy: Vercel/Railway/Render) SEBELUM online — env-var yang lupa di-set = penyebab crash tersering.`,
    })
  } else {
    findings.push({
      level: 'OK',
      label: 'Kunci env',
      message: `Semua ${exampleKeys.size} kunci di ${exampleName} sudah ada di ${actualName}.`,
    })
  }
  if (extra.length > 0) {
    findings.push({
      level: 'INFO',
      label: 'Kunci env tambahan',
      message: `${extra.length} kunci di ${actualName} di luar ${exampleName}: ${extra.join(', ')}`,
      hint: `Kalau kunci ini memang dipakai, tambahkan NAMA-nya ke ${exampleName} (tanpa nilai) supaya kontraknya lengkap.`,
    })
  }
  return { exampleExists, actualExists, missing, extra, findings }
}

// runEnvKeysCheck: orkestrasi -> { ...compare, summary:{ok,warn,err} }.
export function runEnvKeysCheck(projectRoot, opts = {}) {
  const r = compareEnvKeys(projectRoot, opts)
  const summary = { ok: 0, warn: 0, err: 0 }
  for (const f of r.findings) {
    if (f.level === 'OK') summary.ok++
    else if (f.level === 'WARN') summary.warn++
    else if (f.level === 'ERROR') summary.err++
  }
  return { ...r, summary }
}

function parseArgs(argv) {
  let projectRoot = process.cwd()
  let example
  let actual
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i]
    if (t === '--project-root' || t === '--projectroot') projectRoot = argv[++i] || projectRoot
    else if (t === '--example') example = argv[++i]
    else if (t === '--actual') actual = argv[++i]
  }
  return { projectRoot, example, actual }
}

function main() {
  const { projectRoot, example, actual } = parseArgs(process.argv.slice(2))
  const { findings, missing } = runEnvKeysCheck(projectRoot, { example, actual })
  for (const f of findings) {
    console.log(`${f.level.padEnd(5)} ${f.label}: ${f.message}`)
    if (f.hint) console.log(`      -> ${f.hint}`)
  }
  // exit = jumlah kunci HILANG (0 = aman untuk gerbang). process.exitCode (bukan process.exit)
  // supaya stdout selesai di-flush saat dipipa (cermin pola robot lain: unicode/ai-config).
  process.exitCode = missing.length
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
