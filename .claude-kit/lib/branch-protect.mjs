#!/usr/bin/env node
// lib/branch-protect.mjs - Deteksi + pasang kunci branch utama (main) di GitHub.
//
// GELOMBANG 4/5 (ADR-004): padanan Node dari Test-MainBranchProtected (inline di setup-pola-b.ps1).
// Fase 1b v2: tambah penerap aturan (port setup-branch-protection.ps1) -> `npx lintasai protect-main`.
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function run(cmd, args, cwd, input) {
  try {
    const r = spawnSync(cmd, args, {
      encoding: 'utf8',
      cwd,
      timeout: 20000,
      input: input ?? undefined,
    })
    return { code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim(), spawnError: r.error }
  } catch (e) {
    return { code: null, out: '', err: e.message, spawnError: e }
  }
}

// Cermin Get-Command gh: cek gh tersedia (probe --version, exit 0 = ada).
function hasGh() {
  const r = run('gh', ['--version'])
  return !r.spawnError && r.code === 0
}

function ghAuthOk() {
  const r = run('gh', ['auth', 'status'])
  return !r.spawnError && r.code === 0
}

function detectRepo(projectRoot) {
  const r = run('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], projectRoot)
  if (r.code === 0 && r.out) return r.out.trim()
  return null
}

function buildProtectionPayload(requiredCheck) {
  return {
    required_status_checks: { strict: true, contexts: [requiredCheck] },
    enforce_admins: true,
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      require_code_owner_reviews: true,
    },
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
  }
}

/** Port setup-branch-protection.ps1. Default SIMULASI; apply=true untuk sungguhan. */
export function setupMainBranchProtection(projectRoot, opts = {}) {
  const branch = opts.branch || 'main'
  const requiredCheck = opts.requiredCheck || 'ci'
  const apply = Boolean(opts.apply)
  let repo = (opts.repo || '').trim()

  if (!hasGh()) {
    return { ok: false, exit: 1, mode: apply ? 'apply' : 'dry-run', messages: ['GAGAL: GitHub CLI (gh) belum terpasang.', 'Pasang: https://cli.github.com/ lalu gh auth login'] }
  }
  if (!ghAuthOk()) {
    return { ok: false, exit: 1, mode: apply ? 'apply' : 'dry-run', messages: ['GAGAL: Belum login ke GitHub.', 'Jalankan: gh auth login'] }
  }
  if (!repo) {
    repo = detectRepo(projectRoot)
    if (!repo) {
      return { ok: false, exit: 1, mode: apply ? 'apply' : 'dry-run', messages: ['GAGAL: Repo tidak disebut + tidak bisa deteksi dari folder ini.', "Sebut manual: --repo 'owner/nama-repo'"] }
    }
  }

  const payload = buildProtectionPayload(requiredCheck)
  const payloadJson = JSON.stringify(payload)
  const messages = [
    '',
    '=== RAMBU: Kunci Pengaman Gabung (branch protection) ===',
    '',
    `Repo   : ${repo}`,
    `Branch : ${branch}`,
    `Syarat cek otomatis wajib hijau : ${requiredCheck}`,
    '',
    '4 syarat sebelum boleh gabung ke jalur utama:',
    '  [1] WAJIB lewat permintaan-gabung (tidak boleh tulis langsung).',
    `  [2] WAJIB lulus cek otomatis '${requiredCheck}' (kalau merah, gabung terkunci).`,
    '  [3] WAJIB disetujui penanggung jawab (CODEOWNERS) - minimal 1 review.',
    '  [4] DILARANG menimpa paksa (force-push) jalur utama.',
    '',
  ]

  if (!apply) {
    messages.push('MODE: SIMULASI (tidak ada yang diubah).', '  Ini cuma menampilkan rencana. Repo BELUM diubah.', '')
    messages.push('Aturan (JSON) yang akan dikirim ke GitHub:', payloadJson, '')
    messages.push('Untuk benar-benar menyalakan, ulangi dengan tambah --apply di akhir.')
    messages.push(`  Contoh: npx lintasai protect-main --repo '${repo}' --required-check '${requiredCheck}' --apply`)
    return { ok: true, exit: 0, mode: 'dry-run', repo, branch, requiredCheck, payload, messages }
  }

  messages.push('MODE: APPLY - benar-benar menyalakan kunci pengaman gabung...', '')
  const apiPath = `repos/${repo}/branches/${branch}/protection`
  const prot = run('gh', ['api', '--method', 'PUT', apiPath, '--input', '-'], projectRoot, payloadJson)
  if (prot.code !== 0) {
    messages.push(`GAGAL menyalakan: gh api keluar dengan kode ${prot.code}`)
    if (prot.err) messages.push(prot.err)
    messages.push('  Penyebab umum:', '  - Kamu bukan admin repo ini (minta owner jalankan).', `  - Nama cek '${requiredCheck}' belum pernah jalan (jalankan CI sekali dulu).`, '  - Repo private di paket GitHub gratis (butuh public atau paket berbayar).')
    return { ok: false, exit: 1, mode: 'apply', repo, branch, requiredCheck, messages }
  }
  messages.push('BERHASIL: Kunci pengaman gabung sudah aktif.', `  Mulai sekarang, gabung ke '${branch}' WAJIB lewat permintaan-gabung + cek hijau + 1 persetujuan.`, '')
  messages.push('Langkah lanjut: pastikan .github/CODEOWNERS sudah diisi username asli (bukan placeholder).')
  return { ok: true, exit: 0, mode: 'apply', repo, branch, requiredCheck, messages }
}

// Return: { Protected: true|false|null, Reason: string, DefaultBranch: string }
//   Protected=null artinya tak bisa deteksi (gh tak ada / tak login / no remote).
export function testMainBranchProtected(projectRoot) {
  const result = { Protected: null, Reason: 'unknown', DefaultBranch: 'main' }

  if (!hasGh()) {
    result.Reason = 'gh CLI tidak terinstall (skip detect, asumsikan unprotected)'
    return result
  }

  // Repo dengan remote GitHub?
  const remote = run('git', ['-C', projectRoot, 'remote', 'get-url', 'origin'])
  if (remote.code !== 0 || !remote.out) {
    result.Reason = 'no git remote (local-only repo)'
    return result
  }
  if (!/github\.com/.test(remote.out)) {
    result.Reason = 'remote bukan GitHub (skip branch protection check)'
    return result
  }

  // Default branch via gh.
  const repoView = run('gh', ['repo', 'view', '--json', 'defaultBranchRef'], projectRoot)
  if (repoView.code === 0 && repoView.out) {
    try {
      const j = JSON.parse(repoView.out)
      if (j && j.defaultBranchRef && j.defaultBranchRef.name) result.DefaultBranch = j.defaultBranchRef.name
    } catch (e) { /* pakai default 'main' */ }
  }

  // Probe endpoint branch protection.
  const prot = run('gh', ['api', `repos/{owner}/{repo}/branches/${result.DefaultBranch}/protection`], projectRoot)
  if (prot.code === 0) {
    result.Protected = true
    result.Reason = `Branch '${result.DefaultBranch}' is protected (PR required)`
  } else {
    result.Protected = false
    result.Reason = `Branch '${result.DefaultBranch}' unprotected (direct commit allowed)`
  }
  return result
}

function parseCliArgs(argv) {
  const opts = { apply: false, branch: 'main', requiredCheck: 'ci', repo: '' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') opts.apply = true
    else if (a === '--repo' && argv[i + 1]) { opts.repo = argv[++i] }
    else if (a === '--branch' && argv[i + 1]) { opts.branch = argv[++i] }
    else if ((a === '--required-check' || a === '--requiredCheck') && argv[i + 1]) { opts.requiredCheck = argv[++i] }
    else if (a === '--project-root' && argv[i + 1]) { opts.projectRoot = argv[++i] }
    else if (a === '--help' || a === '-h') opts.help = true
  }
  return opts
}

function printHelp() {
  console.log(`Kunci Pengaman Gabung (branch protection GitHub)

Pakai:
  npx lintasai protect-main [--repo owner/nama] [--branch main] [--required-check ci] [--apply]

Default = SIMULASI (tidak mengubah apa pun). Tambah --apply untuk benar-benar menyalakan.
Prasyarat: gh CLI terpasang + gh auth login + hak admin di repo.`)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const opts = parseCliArgs(process.argv.slice(2))
  if (opts.help) { printHelp(); process.exit(0) }
  const root = opts.projectRoot || process.cwd()
  const res = setupMainBranchProtection(root, opts)
  for (const line of res.messages || []) console.log(line)
  process.exit(res.exit ?? (res.ok ? 0 : 1))
}
