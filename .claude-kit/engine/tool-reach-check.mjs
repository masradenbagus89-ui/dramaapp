#!/usr/bin/env node
// engine/tool-reach-check.mjs - Penjaga Jangkauan Perkakas ("tiap yang dikirim wajib punya GAGANG").
//
// KENAPA ADA: 2026-07-18 ketahuan engine/fact-gate.mjs dikirim ke SETIAP client (engine/kit-files.json) tapi
// MATI TOTAL - nol perintah CLI, nol dipanggil preflight, nol disebut aturan. Robotnya lengkap & teruji,
// tapi tak ada satu pun cara memanggilnya, jadi AI tak pernah tahu ia ada. Saat itu yang diperbaiki cuma
// KORBANNYA; pemeriksaan ini menutup KELASNYA - dan langsung menemukan korban kedua yang masih hidup:
// engine/split-guard.mjs (robot penjaga penuh, 6 kode deteksi, penegakannya cuma bergantung AI ingat
// membaca SPLIT_REPO_MIGRATION_PROMPT_v1.md - persis anti-pola yang header robot itu sendiri kritik).
//
// ATURANNYA SATU: berkas engine/**.mjs yang DIKIRIM ke client DAN BISA DIJALANKAN SENDIRI (punya guard
// `isMain`) wajib punya minimal satu GAGANG - jalur nyata untuk memanggilnya:
//
//   gagang     | cara robot ini memverifikasi (SEMUA dari kenyataan, bukan daftar-restu tulis-tangan)
//   -----------|---------------------------------------------------------------------------------
//   cli        | path-nya jadi nilai di COMMANDS_NODE (bin/lintasai.js)
//   preflight  | di-import tests/preflight.mjs (jadi langkah gerbang)
//   hook       | perintahnya disebut engine/setup-hooks.mjs / engine/ensure-*-hook.mjs (dipasang ke settings)
//   spawn      | robot terkirim lain menjalankannya sebagai PROSES ANAK: `path.join(..., 'engine', 'X.mjs')`
//              | (mis. doctor Cek 2c men-spawn engine/migration-state.mjs). Bentuk argumen ber-kutip itu
//              | hanya muncul di kode, tak pernah di prosa komentar -> aman dari alarm-palsu.
//   pustaka    | dipakai modul lain -> bukan perkakas mandiri, otomatis lolos (tak perlu didaftar)
//
// KENAPA "punya isMain" SAJA BUKAN PENANDA PERKAKAS: banyak PUSTAKA di kit ini punya blok `isMain`
// berisi "CLI tipis untuk uji-banding" (mis. engine/safety.mjs:66, engine/git-helpers.mjs:124) - gagang UJI
// bagi pengembang, bukan kemampuan untuk dipakai staff. Versi pertama robot ini memakai isMain sebagai
// satu-satunya penanda dan langsung melahirkan 17 alarm-palsu dari 18 temuan; kalau dibiarkan, orang
// belajar mengabaikan robotnya - lebih buruk daripada tak punya robot. PEMBEDA YANG BENAR: apakah ada
// modul lain yang meng-`import` berkas ini. Dipakai modul lain = pustaka (isMain-nya harness). Nol yang
// memakai + punya isMain = ia memang berdiri sendiri, jadi WAJIB punya gagang. Tes tidak dihitung
// sebagai pemakai: perkakas yang punya tes tetap perkakas.
//
// SENGAJA TANPA DAFTAR-KECUALI MANUAL: daftar-restu yang ditulis tangan pasti membusuk jadi stempel
// karet ("sudah lama di situ, pasti ada alasannya") - dan itu justru kelas bug yang sedang ditutup.
// Kalau sebuah perkakas memang tak butuh gagang, jawabannya BUKAN menambah pengecualian, melainkan
// berhenti mengirimnya ke client (keluarkan dari kit-files.json).
//
// TINGKAT: PENTING, bukan GENTING. Perkakas tak terjangkau itu cacat jangkauan - kemampuan yang dibayar
// ruang tapi tak bisa dipakai - bukan kerusakan yang membahayakan data. Memblokir `--strict`, tidak
// memblokir kerja sehari-hari.
//
// SIFAT: CUMA-BACA + deterministik (~0 token AI). Inti PURE (analyzeToolReach menerima teks yang
// disuntik) - teruji di tests/tool-reach-check.test.mjs tanpa menyentuh disk.
//
// CLI: node engine/tool-reach-check.mjs [--project-root <dir>]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readTextSafe, isFile } from './fs-text.mjs'

// Guard "berkas ini dijalankan langsung, bukan di-import" - penanda bahwa ia perkakas mandiri.
// Pola kanonik di seluruh kit: process.argv[1] + fileURLToPath(import.meta.url).
const IS_MAIN_RE = /process\s*\.\s*argv\s*\[\s*1\s*\][\s\S]{0,120}?fileURLToPath\s*\(\s*import\s*\.\s*meta\s*\.\s*url\s*\)/

export const GAGANG = { CLI: 'cli', PREFLIGHT: 'preflight', HOOK: 'hook', SPAWN: 'spawn', PUSTAKA: 'pustaka' }

// Apakah berkas ini bisa dijalankan sendiri? (Syarat perlu, BUKAN syarat cukup - lihat dipakaiModulLain.)
export function punyaIsMain(teks) {
  return IS_MAIN_RE.test(String(teks || ''))
}

// Apakah ada modul lain yang meng-import berkas ini? Kalau ya -> ia PUSTAKA, blok isMain-nya cuma
// harness uji, dan ia tak butuh gagang. `teksSumberNonTes` sengaja TIDAK memuat berkas tests/:
// perkakas yang punya tes tetap perkakas, bukan berubah jadi pustaka.
export function dipakaiModulLain(rel, teksSumberNonTes) {
  const nama = rel.replace(/^.*\//, '').replace(/\./g, '\\.')
  return new RegExp(`from\\s+['"][^'"]*${nama}['"]`).test(String(teksSumberNonTes || ''))
}

// Nama-nama berkas engine/*.mjs yang dijadikan nilai perintah di COMMANDS_NODE bin/lintasai.js.
// Sengaja mencocokkan PATH LENGKAP ber-kutip ("engine/x.mjs") - bukan sekadar nama disebut di komentar,
// supaya penyebutan dalam prosa penjelasan tidak salah dihitung sebagai gagang nyata.
export function extractCliTargets(teksBin) {
  const out = new Set()
  for (const m of String(teksBin || '').matchAll(/"((?:engine\/)?[A-Za-z0-9._\-/]+\.m?js)"/g)) {
    // Hanya sisi NILAI yang relevan; kunci perintah tak pernah berakhiran .mjs/.js.
    out.add(m[1])
  }
  return out
}

// Berkas engine/ yang di-import tests/preflight.mjs (jadi langkah gerbang).
export function extractPreflightImports(teksPreflight) {
  const out = new Set()
  for (const m of String(teksPreflight || '').matchAll(/from\s+['"](?:\.\.\/)?engine\/([A-Za-z0-9._-]+\.mjs)['"]/g)) {
    out.add(`engine/${m[1]}`)
  }
  return out
}

// Berkas engine/ yang dijalankan robot lain sebagai PROSES ANAK. Pola kanonik di kit:
// `path.join(<dir>, 'engine', 'X.mjs')` lalu spawnSync/execFile - argumen ber-kutip `'engine', 'X.mjs'`
// hanya lahir dari kode (prosa komentar menulis `engine/X.mjs` utuh), jadi tak menghitung sebutan prosa.
export function extractSpawnTargets(teksSumberNonTes) {
  const out = new Set()
  for (const m of String(teksSumberNonTes || '').matchAll(/['"]engine['"]\s*,\s*['"]([A-Za-z0-9._-]+\.m?js)['"]/g)) {
    out.add(`engine/${m[1]}`)
  }
  return out
}

// Berkas engine/ yang dipasang sebagai hook (perintahnya ditulis ke .claude/settings.json).
// Sumbernya = teks para pemasang hook (setup-hooks.mjs + ensure-*-hook.mjs) digabung.
export function extractHookTargets(teksPemasangGabungan) {
  const out = new Set()
  for (const m of String(teksPemasangGabungan || '').matchAll(/(?:\.claude-kit\/)?(engine\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.m?js)/g)) {
    out.add(m[1])
  }
  return out
}

// INTI PURE. Masukan sudah berupa teks/daftar; tak menyentuh disk sama sekali.
//   shipped      : array path relatif (mis. 'engine/split-guard.mjs') yang dikirim ke client
//   isiBerkas    : Map path -> isi teksnya (untuk deteksi isMain)
//   teksBin/Preflight/Pemasang : sumber ketiga gagang
export function analyzeToolReach({ shipped, isiBerkas, teksBin, teksPreflight, teksPemasang, teksSumberNonTes }) {
  const cli = extractCliTargets(teksBin)
  const pref = extractPreflightImports(teksPreflight)
  const hook = extractHookTargets(teksPemasang)
  const spawn = extractSpawnTargets(teksSumberNonTes)

  const findings = []
  const perkakas = []
  for (const rel of shipped) {
    const teks = isiBerkas.get(rel)
    if (teks == null) continue // berkas terdaftar tapi tak terbaca -> urusan pemeriksa lain
    if (!punyaIsMain(teks)) continue // tak bisa dijalankan sendiri -> pustaka murni
    if (dipakaiModulLain(rel, teksSumberNonTes)) continue // dipakai modul lain -> pustaka, isMain = harness

    const gagang = []
    if (cli.has(rel) || cli.has(rel.replace(/^engine\//, ''))) gagang.push(GAGANG.CLI)
    if (pref.has(rel)) gagang.push(GAGANG.PREFLIGHT)
    if (hook.has(rel)) gagang.push(GAGANG.HOOK)
    if (spawn.has(rel)) gagang.push(GAGANG.SPAWN)

    perkakas.push({ ref: rel, gagang })
    if (gagang.length === 0) {
      findings.push({
        tingkat: 'PENTING',
        kode: 'perkakas-tanpa-gagang',
        ref: rel,
        pesan: `${rel} dikirim ke client + bisa dijalankan sendiri, tapi NOL gagang (tak ada perintah CLI, tak dipanggil preflight, tak dipasang sebagai hook, tak di-spawn robot lain) - kemampuan mati yang tak bisa dipakai siapa pun. Beri perintah di bin/lintasai.js, ATAU jadikan langkah preflight, ATAU berhenti mengirimnya (engine/kit-files.json). Lihat Resep 12 docs/RESEP_PERUBAHAN.md.`,
      })
    }
  }

  const counts = { GENTING: 0, PENTING: 0, RAPIKAN: 0 }
  for (const f of findings) counts[f.tingkat]++
  return { findings, counts, perkakas, total: perkakas.length }
}

// Pembungkus disk. AUTO-SKIP anggun: manifest/bin tak ketemu (bukan repo kit) -> present:false.
export function runToolReachCheck({ repoRoot } = {}) {
  const root = path.resolve(repoRoot || process.cwd())
  const manifestPath = path.join(root, 'engine', 'kit-files.json')
  const binPath = path.join(root, 'bin', 'lintasai.js')
  if (!isFile(manifestPath) || !isFile(binPath)) return { present: false, findings: [], counts: { GENTING: 0, PENTING: 0, RAPIKAN: 0 }, perkakas: [], total: 0 }

  let manifest
  try {
    manifest = JSON.parse(readTextSafe(manifestPath) || '{}')
  } catch {
    return { present: false, findings: [], counts: { GENTING: 0, PENTING: 0, RAPIKAN: 0 }, perkakas: [], total: 0 }
  }

  // Yang dikirim ke client + berupa modul di engine/ (.mjs maupun .js - risk-gate.js ikut dinilai).
  const shipped = []
  for (const grup of Object.values(manifest)) {
    if (!Array.isArray(grup)) continue
    for (const rel of grup) {
      if (typeof rel === 'string' && /^engine\/.+\.m?js$/.test(rel)) shipped.push(rel)
    }
  }

  const isiBerkas = new Map()
  for (const rel of shipped) {
    const p = path.join(root, rel)
    if (isFile(p)) isiBerkas.set(rel, readTextSafe(p) || '')
  }

  // Seluruh sumber NON-tes digabung -> dipakai membedakan pustaka (ada yang meng-import) vs perkakas
  // mandiri (nol yang meng-import). tests/ SENGAJA dikecualikan: punya tes tak membuat perkakas jadi pustaka.
  let teksSumberNonTes = ''
  for (const [rel, teks] of isiBerkas) teksSumberNonTes += `\n/*${rel}*/\n${teks}`
  for (const nama of ['kit.mjs', 'setup-pola-b.mjs', 'update-kit.mjs', 'uninstall.mjs']) {
    const p = path.join(root, nama)
    if (isFile(p)) teksSumberNonTes += `\n${readTextSafe(p) || ''}`
  }

  // Sumber gagang 'hook': semua pemasang hook digabung jadi satu teks.
  const engineDir = path.join(root, 'engine')
  let teksPemasang = ''
  const kandidatPemasang = ['setup-hooks.mjs']
  try {
    for (const nama of fs.readdirSync(engineDir)) {
      if (/^ensure-.*hook.*\.mjs$/.test(nama)) kandidatPemasang.push(nama)
    }
    const kimiDir = path.join(engineDir, 'kimi')
    if (fs.existsSync(kimiDir)) {
      for (const nama of fs.readdirSync(kimiDir)) {
        if (/^ensure-.*hook.*\.mjs$/.test(nama)) kandidatPemasang.push(path.join('kimi', nama))
      }
    }
  } catch { /* folder engine/ tak terbaca -> teksPemasang kosong, gagang hook jadi nol */ }
  for (const nama of kandidatPemasang) {
    const p = path.join(engineDir, nama)
    if (isFile(p)) teksPemasang += `\n${readTextSafe(p) || ''}`
  }

  const hasil = analyzeToolReach({
    shipped,
    isiBerkas,
    teksBin: readTextSafe(binPath) || '',
    teksPreflight: readTextSafe(path.join(root, 'tests', 'preflight.mjs')) || '',
    teksPemasang,
    teksSumberNonTes,
  })
  return { present: true, ...hasil }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const args = process.argv.slice(2)
  const i = args.indexOf('--project-root')
  const root = i >= 0 && i + 1 < args.length ? args[i + 1] : process.cwd()
  const r = runToolReachCheck({ repoRoot: root })
  if (!r.present) {
    console.log('[info] engine/kit-files.json atau bin/lintasai.js tak ketemu - bukan repo kit, dilewati.')
  } else if (r.findings.length === 0) {
    console.log(`[OK] Jangkauan perkakas: ${r.total} perkakas mandiri terkirim, semuanya punya gagang.`)
  } else {
    for (const f of r.findings) console.log(`[${f.tingkat}] ${f.pesan}`)
    console.log(`\nRingkasan: GENTING ${r.counts.GENTING} | PENTING ${r.counts.PENTING} | RAPIKAN ${r.counts.RAPIKAN}`)
  }
  // exit = jumlah PENTING+GENTING (0 = bersih). process.exitCode supaya stdout selesai di-flush saat dipipa.
  process.exitCode = r.counts.GENTING + r.counts.PENTING
}
