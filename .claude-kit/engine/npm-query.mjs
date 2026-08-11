#!/usr/bin/env node
// engine/npm-query.mjs - tanya registry npm dengan AMAN dari dalam Node (Windows-first).
//
// KENAPA ADA: jalur update baru (v2.8) memakai npm sebagai sumber resmi supaya klien TANPA akses repo
// privat tetap bisa `npx lintasai update`. Untuk itu updater perlu tahu "versi terbaru di npm berapa?".
// Memanggil npm dari Node di Windows punya 3 jebakan yang SEMUANYA sudah diuji nyata (2026-07-15):
//   spawnSync('npm', args)                 -> ENOENT  (npm bukan .exe; ia npm.cmd)
//   spawnSync('npm.cmd', args)             -> EINVAL  (Node menolak .bat/.cmd tanpa shell sejak
//                                                      tambalan CVE-2024-27980)
//   spawnSync('npm', args, {shell:true})   -> JALAN, tapi memicu DEP0190: "args ... are not escaped,
//                                                      only concatenated" = celah injeksi perintah.
// Jalan yang BENAR & dipakai di sini: jalankan berkas npm-cli.js pakai node yang SEDANG berjalan
// (`process.execPath`) TANPA shell -> tak ada .cmd, tak ada shell, tak ada penggabungan argumen.
// Fallback shell:true HANYA kalau npm-cli.js tak ketemu (npm non-standar: nvm/volta/portable), dengan
// argumen KONSTANTA (tak pernah memuat masukan pengguna) supaya DEP0190 tak jadi celah nyata.
//
// SIFAT: cuma-baca (hanya `npm view`), FAIL-OPEN (jaringan mati/registry tak terjangkau -> null, bukan
// lempar) supaya pemanggil bisa memutuskan sendiri: "belum tahu" != "gagal".
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Nama paket npm resmi kit (SSOT: package.json "name").
export const LINTAS_NPM_PACKAGE = 'lintasai'

// Cari npm-cli.js milik npm yang terpasang. Urutan: (1) petunjuk resmi npm saat dijalankan lewat npm
// script; (2) sebelah node.exe (pemasang resmi Windows); (3) tata-letak gaya Unix/nvm. Return path
// absolut atau null (pemanggil -> fallback shell).
export function findNpmCli() {
  const kandidat = []
  // npm_execpath = di-set npm saat menjalankan skrip; menunjuk langsung ke npm-cli.js.
  if (process.env.npm_execpath && String(process.env.npm_execpath).endsWith('.js')) {
    kandidat.push(process.env.npm_execpath)
  }
  const nodeDir = path.dirname(process.execPath)
  kandidat.push(path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'))
  kandidat.push(path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'))
  for (const c of kandidat) {
    try { if (fs.existsSync(c)) return path.resolve(c) } catch { /* lanjut kandidat berikutnya */ }
  }
  return null
}

// Jalankan `npm <args>` seaman mungkin. args WAJIB array konstanta / nilai yang sudah divalidasi
// pemanggil - JANGAN pernah oper masukan pengguna mentah (jalur fallback memakai shell).
// Return { status, stdout, stderr, error, viaShell }.
export function runNpm(args, { timeout = 60000, cwd = undefined } = {}) {
  const cli = findNpmCli()
  if (cli) {
    const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout, cwd })
    return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', error: r.error, viaShell: false }
  }
  // Fallback: npm non-standar. shell:true = satu-satunya cara menjalankan npm.cmd; aman DI SINI karena
  // args = konstanta pemanggil (lihat kontrak di atas), bukan masukan pengguna.
  const r = spawnSync('npm', args, { encoding: 'utf8', timeout, cwd, shell: true })
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', error: r.error, viaShell: true }
}

// Versi X.Y.Z yang waras? (jaga-jaga registry/mirror membalas HTML error page / teks sampah)
export function isPlainVersion(s) {
  return typeof s === 'string' && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(s.trim())
}

// Versi terbaru paket di registry (dist-tag `latest`). FAIL-OPEN: null = belum tahu (offline, registry
// diblokir, npm tak ada). BUKAN lempar - pemanggil membedakan "belum tahu" dari "gagal".
export function getLatestNpmVersion(pkg = LINTAS_NPM_PACKAGE, { timeout = 60000 } = {}) {
  // Nama paket divalidasi ketat: hanya paket kit sendiri / nama npm waras. Ini pagar untuk jalur
  // fallback shell (lihat kontrak runNpm).
  if (typeof pkg !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/.test(pkg)) return null
  try {
    const r = runNpm(['view', pkg, 'version'], { timeout })
    if (r.error || r.status !== 0) return null
    const v = String(r.stdout).trim()
    return isPlainVersion(v) ? v : null
  } catch {
    return null
  }
}

// --- CLI kecil untuk diagnosa manual: `node engine/npm-query.mjs [nama-paket]` ---
function main() {
  const pkg = process.argv[2] || LINTAS_NPM_PACKAGE
  const cli = findNpmCli()
  console.log(`npm-cli.js : ${cli ?? '(tak ketemu - akan pakai jalur cadangan shell)'}`)
  const v = getLatestNpmVersion(pkg)
  console.log(`Versi terbaru '${pkg}' di npm: ${v ?? '(belum tahu - offline / registry tak terjangkau)'}`)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
