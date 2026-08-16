#!/usr/bin/env node
// engine/project-detect.mjs - Deteksi keadaan project (versi Node).
//
// FUNGSI (logika MURNI: baca berkas/folder + parse package.json, tanpa spawn alat luar -> aman & lintas-OS,
// ):
//   - getMonorepoState   : tebak apakah project = monorepo (1 gudang isi banyak peran) + ragam + keyakinan.
//   - getPackageManager  : tebak alat paket Node (pnpm/yarn/bun/npm) dari berkas-kunci + field Corepack.
//   - getStackType       : tebak bahasa gudang (node/python/go/rust/ruby/php) dari berkas penanda.
//
// SENGAJA TIDAK DISERTAKAN:
//   - Get-DynamicPopup2Order : USANG sejak v1.43.0 (skema Popup #2 LAMA), TANPA pemanggil aktif di kode
//                              (cuma muncul di CHANGELOG = riwayat). Hindari menghidupkan kode mati (sec.5
//                              reuse/anti-duplikasi). Kalau suatu saat skema lama dibutuhkan lagi, rujuk
//                              sumber asli (riwayat CHANGELOG) + perbarui ke skema Popup #3 dulu.
//
// CATATAN GERBANG (penting saat menyunting): nilai string "Evidence"/"Flavor"/"Reason"/"DetectedPatterns"
// DISENGAJA berbahasa Inggris (gerbang "output-identik" ADR-003). Itu DATA
// INTERNAL yang dibaca orkestrator/AI (lalu AI yang menerjemahkan ke bahasa awam untuk user) -- BUKAN teks
// yang langsung dipajang ke user. Jangan "rapikan" ke Indonesia (nilai-data internal, bukan teks user).
// Gerbang bahasa non-programmer (ADR-004 #3) berlaku untuk teks USER-FACING (popup/prompt/narasi/error),
// bukan untuk nilai-data internal ini. Komentar kode = Indonesia (untuk perawat berikutnya).
import fs from 'node:fs'
import path from 'node:path'
import { readTextSafe, isFile, isDir, pathExists } from './fs-text.mjs'
import { NAMA_FOLDER_KIT } from './project-root.mjs'

// --- util kecil (senyap): pathExists/isDir/isFile/readTextSafe dipindah ke sumber bersama
// engine/fs-text.mjs (impor di atas) -> audit fungsi-kembar 2026-06-25 (parse aman).

// Folder yang DILEWATI saat menghitung berkas.
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', NAMA_FOLDER_KIT])

// Hitung berkas di bawah root, lewati folder berat + berkas *.log/*.lock, BERHENTI di 500
function countFilesCapped(root, cap = 500) {
  let count = 0
  const stack = [root]
  while (stack.length > 0) {
    if (count >= cap) break
    const dir = stack.pop()
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { continue }
    for (const ent of entries) {
      if (count >= cap) break
      if (ent.isDirectory()) {
        // CASE-INSENSITIVE: folder 'Node_Modules'/'.GIT'/'.NEXT' juga dilewati.
        // SKIP_DIRS semua huruf-kecil, jadi turunkan nama folder dulu sebelum cek.
        if (SKIP_DIRS.has(ent.name.toLowerCase())) continue
        stack.push(path.join(dir, ent.name))
      } else if (ent.isFile()) {
        const lower = ent.name.toLowerCase()
        if (lower.endsWith('.log') || lower.endsWith('.lock')) continue
        count++
      }
    }
  }
  return count
}

// Kumpulkan dependencies + devDependencies dari package.json jadi satu Set nama paket. {} kalau gagal.
function readDepNames(pkgPath) {
  const names = new Set()
  const raw = readTextSafe(pkgPath)
  if (raw == null) return names
  let pkg
  try { pkg = JSON.parse(raw) } catch { return names }
  for (const field of ['dependencies', 'devDependencies']) {
    const obj = pkg && pkg[field]
    if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) names.add(k)
  }
  return names
}

// === getMonorepoState ============================================================================
// Tebak apakah project = monorepo + ragamnya. 4 pola (urut prioritas, termasuk
// pola 1 & 2 yang TIDAK dijaga "-not IsMonorepo" -> bisa MENUMPUK; pola 3 & 4 dijaga).
//
// SATU DIVERGENSI DISENGAJA (Node lebih benar, BUKAN bug-replikasi):
//   PS Get-MonorepoState membaca dep via `$pkg.dependencies` / `$pkg.devDependencies`. Di bawah
//   `Set-StrictMode -Version Latest`, mengakses properti yang ABSEN (mis. package.json yang punya
//   "dependencies" tapi TANPA "devDependencies") akan MELEMPAR -> tertangkap try/catch PS -> SEMUA
//   dep gagal terbaca -> project Next.js bisa salah-divonis "None". Itu bug-laten PS (terverifikasi
//   2026-06-22: `./package.json` repo ini sendiri tak punya devDependencies = pemicu nyata). Node
//   memakai `pkg[field]` yang aman (absen -> undefined, tak melempar) -> tetap membaca dep dengan
//   BENAR. Pada package.json REALISTIS (punya kedua field) hasil 100% identik dgn PS (uji-banding
//   23/23 lulus di StrictMode). Sengaja TIDAK meniru bug PS (jangan lemahkan kebenaran).
export function getMonorepoState(projectRoot) {
  const result = {
    isMonorepo: false,
    monorepoFlavor: 'None',
    fileCount: 0,
    confidence: 'low',
    evidence: [],
    detectedPatterns: [],
  }
  if (!pathExists(projectRoot)) return result

  result.fileCount = countFilesCapped(projectRoot, 500)

  const pkgPath = path.join(projectRoot, 'package.json')
  const deps = readDepNames(pkgPath)
  const hasNext = deps.has('next')
  const hasReact = deps.has('react') && !hasNext
  const hasVue = deps.has('vue')
  const hasSvelte = deps.has('svelte') || deps.has('@sveltejs/kit')
  const hasExpress = deps.has('express')
  const hasFastify = deps.has('fastify')
  const hasHono = deps.has('hono')
  const hasNest = deps.has('@nestjs/core')

  const hasApiFolder = pathExists(path.join(projectRoot, 'src/app/api'))
  const hasComponentsFolder = pathExists(path.join(projectRoot, 'src/components'))
  const hasPrismaFolder = pathExists(path.join(projectRoot, 'prisma/schema.prisma'))

  // Pola 1: Next.js fullstack monolith (TANPA penjaga IsMonorepo).
  if (hasNext && hasApiFolder && hasComponentsFolder) {
    result.isMonorepo = true
    result.monorepoFlavor = 'NextjsFullstack'
    result.confidence = 'high'
    result.evidence.push('package.json contains "next" + src/app/api/ + src/components/ co-exist')
    result.detectedPatterns.push('Pattern1_NextjsFullstack')
  }

  // Pola 2: Workspace monorepo (TANPA penjaga IsMonorepo -- bisa menimpa ragam pola 1).
  const hasBackendFolder =
    pathExists(path.join(projectRoot, 'backend')) ||
    pathExists(path.join(projectRoot, 'apps/backend')) ||
    pathExists(path.join(projectRoot, 'packages/backend'))
  const hasFrontendFolder =
    pathExists(path.join(projectRoot, 'frontend')) ||
    pathExists(path.join(projectRoot, 'apps/frontend')) ||
    pathExists(path.join(projectRoot, 'packages/frontend')) ||
    pathExists(path.join(projectRoot, 'apps/web'))
  const hasSharedFolder =
    pathExists(path.join(projectRoot, 'shared')) ||
    pathExists(path.join(projectRoot, 'packages/shared'))

  if ((hasBackendFolder && hasFrontendFolder) || hasSharedFolder) {
    let hasWorkspacesField = false
    const pkgRaw = readTextSafe(pkgPath)
    if (pkgRaw) hasWorkspacesField = /"workspaces"\s*:/i.test(pkgRaw)
    const hasPnpmWs = pathExists(path.join(projectRoot, 'pnpm-workspace.yaml'))
    const hasTurbo = pathExists(path.join(projectRoot, 'turbo.json'))
    const hasNx = pathExists(path.join(projectRoot, 'nx.json'))

    if (hasWorkspacesField || hasPnpmWs || hasTurbo || hasNx) {
      result.isMonorepo = true
      result.monorepoFlavor = 'WorkspaceMonorepo'
      result.confidence = 'high'
      result.evidence.push('Sibling backend/frontend folders + workspace tool detected (Yarn/PNPM/Turbo/Nx)')
      result.detectedPatterns.push('Pattern2_WorkspaceMonorepo')
    } else {
      // Cabang "loose" ini HANYA menambah Evidence, TIDAK menambah DetectedPatterns.
      result.isMonorepo = true
      result.monorepoFlavor = 'WorkspaceMonorepo'
      result.confidence = 'medium'
      result.evidence.push('Sibling backend/frontend/shared folders but no workspace tool (loose monorepo)')
    }
  }

  // Pola 3: Prisma + components (sinyal lebih lemah; DIJAGA -not isMonorepo).
  if (hasPrismaFolder && hasComponentsFolder && !result.isMonorepo) {
    result.isMonorepo = true
    result.monorepoFlavor = 'PrismaPlusComponents'
    result.confidence = 'medium'
    result.evidence.push('prisma/schema.prisma + src/components/ co-exist (DB layer mixed with UI layer)')
    result.detectedPatterns.push('Pattern3_PrismaPlusComponents')
  }

  // Pola 4: dependency backend + frontend campur (DIJAGA -not isMonorepo).
  const hasBackendDep = hasExpress || hasFastify || hasHono || hasNest
  const hasFrontendDep = hasReact || hasVue || hasSvelte || hasNext
  if (hasBackendDep && hasFrontendDep && !result.isMonorepo) {
    result.isMonorepo = true
    result.monorepoFlavor = 'MixedBackendFrontendDeps'
    result.confidence = 'medium'
    result.evidence.push('package.json has BOTH backend framework + frontend framework deps')
    result.detectedPatterns.push('Pattern4_MixedBackendFrontendDeps')
  }

  return result
}

// === getPackageManager ===========================================================================
// Tebak alat paket Node dari berkas-kunci (pnpm>yarn>bun>npm), lalu field "packageManager" (Corepack)
// menimpa saat tak ada berkas-kunci.
export function getPackageManager(projectRoot) {
  const result = {
    manager: 'none',
    lockFile: null,
    installCmd: null,
    runCmd: null,
    confidence: 'low',
    reason: 'No lockfile or package.json detected',
  }

  if (!isDir(projectRoot)) {
    result.reason = `ProjectRoot does not exist: ${projectRoot}`
    return result
  }

  // Urutan deteksi (cocok PERTAMA menang -- paling spesifik di atas).
  const checks = [
    { lock: 'pnpm-lock.yaml', mgr: 'pnpm', install: 'pnpm install', run: 'pnpm dev' },
    { lock: 'yarn.lock', mgr: 'yarn', install: 'yarn install', run: 'yarn dev' },
    { lock: 'bun.lockb', mgr: 'bun', install: 'bun install', run: 'bun dev' },
    { lock: 'package-lock.json', mgr: 'npm', install: 'npm install', run: 'npm run dev' },
  ]

  for (const check of checks) {
    if (isFile(path.join(projectRoot, check.lock))) {
      result.manager = check.mgr
      result.lockFile = check.lock
      result.installCmd = check.install
      result.runCmd = check.run
      result.confidence = 'high'
      result.reason = `Detected from ${check.lock}`
      return result
    }
  }

  // Tak ada berkas-kunci tapi ada package.json -> default npm (medium).
  const packageJsonPath = path.join(projectRoot, 'package.json')
  if (isFile(packageJsonPath)) {
    result.manager = 'npm'
    result.lockFile = null
    result.installCmd = 'npm install'
    result.runCmd = 'npm run dev'
    result.confidence = 'medium'
    result.reason = 'package.json found, no lockfile yet (default npm)'

    // Heuristik tambahan: field packageManager (Corepack). Senyap kalau parse gagal/invalid.
    try {
      const pkgJson = JSON.parse(readTextSafe(packageJsonPath))
      if (pkgJson && pkgJson.packageManager) {
        const pmDeclared = String(pkgJson.packageManager).split('@')[0]
        if (['pnpm', 'yarn', 'bun', 'npm'].includes(pmDeclared)) {
          result.manager = pmDeclared
          result.installCmd = `${pmDeclared} install`
          result.runCmd = pmDeclared === 'npm' ? 'npm run dev' : `${pmDeclared} dev`
          result.confidence = 'high'
          result.reason = `Declared in package.json packageManager field: ${pkgJson.packageManager}`
        }
      }
    } catch {
      /* senyap -- pakai default npm */
    }
  }

  return result
}

// === getStackType ================================================================================
// Tebak bahasa gudang dari berkas penanda (cocok PERTAMA menang; node di atas supaya project Next.js
// yang punya skrip Python tetap = node). lintasAI v1.x hanya dukung Node.
export function getStackType(projectRoot) {
  const result = {
    stackType: 'unknown',
    isSupported: false,
    detectedFiles: [],
    reason: 'No recognized stack marker file detected',
  }

  if (!isDir(projectRoot)) {
    result.reason = `ProjectRoot does not exist: ${projectRoot}`
    return result
  }

  const stackChecks = [
    { marker: 'package.json', stack: 'node', supported: true },
    { marker: 'pyproject.toml', stack: 'python', supported: false },
    { marker: 'requirements.txt', stack: 'python', supported: false },
    { marker: 'Pipfile', stack: 'python', supported: false },
    { marker: 'go.mod', stack: 'go', supported: false },
    { marker: 'Cargo.toml', stack: 'rust', supported: false },
    { marker: 'Gemfile', stack: 'ruby', supported: false },
    { marker: 'composer.json', stack: 'php', supported: false },
  ]

  for (const check of stackChecks) {
    if (isFile(path.join(projectRoot, check.marker))) {
      result.stackType = check.stack
      result.isSupported = check.supported
      result.detectedFiles = [check.marker]
      result.reason = `Detected from ${check.marker}`

      // Scan penanda lain (informasional saja).
      for (const other of stackChecks) {
        if (other.marker !== check.marker && isFile(path.join(projectRoot, other.marker))) {
          result.detectedFiles.push(other.marker)
        }
      }
      return result
    }
  }

  return result
}

// (Blok CLI uji-banding `if (isMain)` DICABUT v8.0.0 — modul ini murni pustaka impor;
//  tools/stack-check.mjs mengimpor getStackType, bukan men-spawn berkas ini.)
