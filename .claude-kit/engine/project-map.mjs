// Peta Aktivitas Project (robot cuma-baca, deterministik, ~0 token baseline).
// Baca `git log` cabang ini (opsi: sejak tag/ref tertentu) lalu ringkas jadi FAKTA:
//   - commit per MODUL (path dipetakan dari `project.lintas.jsonc` bila ada, else folder tingkat-atas)
//   - commit per TIPE Conventional Commit (feat/fix/refactor/...)
//   - jendela waktu/tag, modul deklarasi yang tak tersentuh, folder aktif tanpa modul di kartu
//
// PATUH ADR-001 & ADR-011: ini melapor FAKTA riwayat commit (bukan tebakan graf-pemanggil),
// on-demand (bukan always-load), TAK PERNAH klaim "peta lengkap"/"roadmap". Robot ini MEMBERI UMPAN
// ke peta tunggal yang sudah ada (project.lintas.jsonc + docs/architecture.md) — bukan peta tandingan.
// Roadmap yang disusun dari sini TETAP di-gerbang manusia (lihat rules/7.11-project-map.md).
//
// Cuma-baca: tidak menulis berkas, tidak menyentuh git (tak fetch/commit/config). Cetak ke stdout.
// Pakai: node engine/project-map.mjs --project-root <repo> [--since <tag|ref>] [--limit <n>] [--json] [--quiet]

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveLintasManifestPath, readLintasProjectManifest } from './project-manifest.mjs'

// Pemisah rekaman/kolom: RS (0x1e) di depan tiap commit, US (0x1f) antar-kolom header.
// Dua karakter kontrol ini mustahil muncul di %H/%an/%ad/%s, jadi parsing aman walau subjek
// mengandung ':', '(', ')', tanda kutip, atau unicode.
const RS = '\x1e'
const US = '\x1f'
const FMT = '%x1e%H%x1f%an%x1f%ad%x1f%s'

// Tipe Conventional Commit baku (§11). Urutan ini dipakai saat menampilkan (kanonik = deterministik).
export const KNOWN_TYPES = ['feat', 'fix', 'refactor', 'perf', 'docs', 'test', 'build', 'ci', 'chore']

// Jalankan git READ-ONLY dengan spawn bersih. Tak pernah lewat shell.
function gitRead(repoRoot, args) {
  const r = spawnSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8' })
  return { code: r.status, out: (r.stdout || '').replace(/\r\n/g, '\n').trimEnd(), err: r.stderr || '' }
}

// --- Fungsi MURNI (bisa diuji tanpa git nyata) ---------------------------------------------------

// Ubah keluaran `git log ... --pretty=format:FMT --name-only` jadi array commit terstruktur.
export function parseGitLog(raw) {
  if (!raw) return []
  const chunks = raw.split(RS).map((c) => c.replace(/^\n+/, '')).filter((c) => c.length > 0)
  const commits = []
  for (const chunk of chunks) {
    const lines = chunk.split('\n')
    const parts = (lines[0] || '').split(US)
    if (parts.length < 4) continue
    const [hash, author, date, subject] = parts
    const files = lines.slice(1).map((l) => l.trim()).filter((l) => l.length > 0)
    commits.push({ hash, author, date, subject, files })
  }
  return commits
}

// Pisah subjek Conventional Commit. Tipe di luar KNOWN_TYPES -> bucket 'other' (jujur, tak menebak).
export function parseConventionalSubject(subject) {
  const m = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/.exec(subject || '')
  if (!m) return { type: 'other', scope: null, description: (subject || '').trim(), breaking: false }
  const type = m[1].toLowerCase()
  return {
    type: KNOWN_TYPES.includes(type) ? type : 'other',
    scope: m[2] || null,
    description: m[4],
    breaking: Boolean(m[3]),
  }
}

// Folder tingkat-atas sebuah path ('src/lib/x.ts' -> 'src'; 'README.md' -> '(root)').
export function topLevelDir(file) {
  const norm = String(file).replace(/\\/g, '/')
  const idx = norm.indexOf('/')
  return idx === -1 ? '(root)' : norm.slice(0, idx)
}

// Petakan berkas ke modul kartu (prefix-path TERPANJANG menang) atau folder tingkat-atas kalau tak cocok.
export function mapFileToModule(file, modules) {
  const norm = String(file).replace(/\\/g, '/')
  let best = null
  for (const m of modules || []) {
    if (!m || !m.path) continue
    const mp = String(m.path).replace(/\\/g, '/').replace(/\/+$/, '')
    if (mp && (norm === mp || norm.startsWith(mp + '/'))) {
      if (!best || mp.length > best.len) best = { key: m.name || mp, len: mp.length }
    }
  }
  if (best) return { key: best.key, mapped: true }
  return { key: topLevelDir(norm), mapped: false }
}

// Rakit digest FAKTA dari array commit. MURNI (fixture-friendly).
export function groupCommits(commits, { modules = [], subjectCap = 5 } = {}) {
  const byType = {}
  const byModule = {}
  let fileCount = 0
  const activeSet = new Set()
  const unmappedSet = new Set()

  for (const c of commits || []) {
    const conv = parseConventionalSubject(c.subject)
    if (!byType[conv.type]) byType[conv.type] = { count: 0, subjects: [] }
    byType[conv.type].count++
    byType[conv.type].subjects.push(c.subject)

    // Dedupe modul DALAM satu commit (1 commit = +1 untuk tiap modul yang disentuh, sekali).
    const touched = new Map()
    for (const f of c.files || []) {
      fileCount++
      const hit = mapFileToModule(f, modules)
      touched.set(hit.key, hit.mapped)
    }
    for (const [key, mapped] of touched) {
      if (!byModule[key]) byModule[key] = { count: 0, mapped, subjects: [], types: {} }
      byModule[key].count++
      byModule[key].subjects.push(c.subject)
      byModule[key].types[conv.type] = (byModule[key].types[conv.type] || 0) + 1
      activeSet.add(key)
      if (!mapped) unmappedSet.add(key)
    }
  }

  const declaredNames = (modules || []).map((m) => m && m.name).filter(Boolean)
  const untouchedModules = declaredNames.filter((n) => !activeSet.has(n))

  return {
    totals: { commits: (commits || []).length, files: fileCount },
    byType,
    byModule,
    activeModules: [...activeSet],
    untouchedModules,
    unmappedTopDirs: [...unmappedSet],
    subjectCap,
  }
}

// Render Markdown (default, manusia-baca). MURNI.
export function renderMarkdown(digest, meta) {
  const cap = digest.subjectCap || 5
  const L = []
  L.push('# Peta Aktivitas Project (fakta git)')
  L.push('')
  L.push('> ' + meta.note)
  L.push('')
  L.push(`- Branch: \`${meta.branch}\` · Jendela: ${meta.window}`)
  L.push(`- Kartu \`project.lintas.jsonc\`: ${meta.hasCard ? 'ADA (modul dipetakan dari kartu)' : 'TIDAK ADA (pakai folder tingkat-atas)'}`)
  L.push(`- Total: ${digest.totals.commits} commit · ${digest.totals.files} sentuhan berkas`)
  L.push('')

  L.push('## Per jenis perubahan (Conventional Commit)')
  const typeKeys = [...KNOWN_TYPES, 'other'].filter((t) => digest.byType[t])
  if (!typeKeys.length) L.push('_(tidak ada commit di jendela ini)_')
  for (const t of typeKeys) L.push(`- **${t}**: ${digest.byType[t].count}`)
  L.push('')

  L.push('## Per modul (aktivitas terbanyak dulu)')
  const modKeys = Object.keys(digest.byModule).sort(
    (a, b) => digest.byModule[b].count - digest.byModule[a].count || a.localeCompare(b),
  )
  if (!modKeys.length) L.push('_(tidak ada modul tersentuh)_')
  for (const k of modKeys) {
    const m = digest.byModule[k]
    const tag = m.mapped ? '' : ' _(belum ada modul di kartu)_'
    L.push(`- **${k}**${tag} — ${m.count} commit`)
    for (const s of m.subjects.slice(0, cap)) L.push(`  - ${s}`)
    if (m.subjects.length > cap) L.push(`  - _(+${m.subjects.length - cap} lagi)_`)
  }
  L.push('')

  if (digest.untouchedModules.length) {
    L.push('## Modul deklarasi yang TAK tersentuh di jendela ini')
    L.push('> Fakta: tak ada commit menyentuh path-nya di jendela ini. BUKAN berarti mati/selesai.')
    for (const n of digest.untouchedModules) L.push(`- ${n}`)
    L.push('')
  }
  if (digest.unmappedTopDirs.length) {
    L.push('## Folder aktif yang belum punya modul di kartu')
    L.push('> Pertimbangkan menambah ke `project.lintas.jsonc` `modules[]` bila ini modul beneran.')
    for (const d of digest.unmappedTopDirs) L.push(`- ${d}`)
    L.push('')
  }
  return L.join('\n').trimEnd() + '\n'
}

// Render JSON (--json). MURNI. Sertakan _note jujur di depan.
export function renderJson(digest, meta) {
  const out = {
    _note: meta.note,
    meta: { branch: meta.branch, since: meta.sinceResolved, window: meta.window, has_card: meta.hasCard },
    totals: digest.totals,
    by_type: digest.byType,
    by_module: digest.byModule,
    active_modules: digest.activeModules,
    untouched_modules: digest.untouchedModules,
    unmapped_top_dirs: digest.unmappedTopDirs,
  }
  return JSON.stringify(out, null, 2)
}

// --- Bagian yang menyentuh git (tak murni) -------------------------------------------------------

// Tag semver terakhir (turunan pola getLastTag di tests/preflight.mjs; direplikasi lokal 4 baris
// supaya lib/ tak import dari tests/). null kalau tak ada tag semver.
function getLastSemverTag(repoRoot) {
  const r = gitRead(repoRoot, ['tag', '--sort=-v:refname'])
  if (r.code !== 0 || !r.out) return null
  const tags = r.out.split('\n').map((t) => t.trim()).filter((t) => /^v?\d+\.\d+\.\d+$/.test(t))
  return tags.length ? tags[0] : null
}

// Baca aktivitas git (READ-ONLY). Gagal-NYARING kalau bukan repo git / ref tak ada.
export function readGitActivity({ repoRoot, since = null, limit = null }) {
  const inside = gitRead(repoRoot, ['rev-parse', '--is-inside-work-tree'])
  if (inside.code !== 0 || inside.out !== 'true') {
    return { ok: false, isRepo: false, error: 'bukan repo git (tak ada .git yang valid)', branch: null, sinceResolved: null, window: null, commits: [] }
  }
  const b = gitRead(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD'])
  const branch = b.code === 0 ? b.out : 'HEAD'

  let sinceRef = null
  if (since) {
    const ok = gitRead(repoRoot, ['rev-parse', '--verify', '--quiet', since + '^{commit}'])
    if (ok.code !== 0) {
      return { ok: false, isRepo: true, error: `ref '--since ${since}' tak ditemukan`, branch, sinceResolved: null, window: null, commits: [] }
    }
    sinceRef = since
  } else {
    sinceRef = getLastSemverTag(repoRoot) // null -> seluruh riwayat
  }

  const range = sinceRef ? `${sinceRef}..HEAD` : null
  const logArgs = ['log', '--no-merges', '--date=short', `--pretty=format:${FMT}`, '--name-only']
  if (limit) logArgs.push('-n', String(limit))
  if (range) logArgs.push(range)
  const log = gitRead(repoRoot, logArgs)
  const commits = parseGitLog(log.out)
  return { ok: true, isRepo: true, error: null, branch, sinceResolved: sinceRef, window: range || 'seluruh riwayat', commits }
}

const HONEST_NOTE =
  'PETA AKTIVITAS GIT — fakta riwayat commit (read-only). BUKAN peta lengkap project, BUKAN roadmap. ' +
  'Modul "tak tersentuh" = tak ada commit menyentuh path-nya DI JENDELA INI (bukan "mati"/"selesai"). ' +
  'Sumber kebenaran struktur = project.lintas.jsonc + docs/architecture.md.'

// Orkestrator: baca git + kartu -> digest -> teks. Cetak ke stdout kecuali quiet.
export function invokeLintasProjectMap({ projectRoot, since = null, limit = null, json = false, quiet = false } = {}) {
  const repoRoot = projectRoot || process.cwd()
  const activity = readGitActivity({ repoRoot, since, limit })
  if (!activity.ok) {
    const msg = `[project-map] GAGAL: ${activity.error}`
    if (!quiet) console.error(msg)
    return { ok: false, error: activity.error, digest: null, meta: null, text: msg }
  }
  const manifest = readLintasProjectManifest(resolveLintasManifestPath(repoRoot))
  const modules = manifest.Ok && Array.isArray(manifest.Manifest.modules) ? manifest.Manifest.modules : []
  const digest = groupCommits(activity.commits, { modules })
  const meta = {
    branch: activity.branch,
    sinceResolved: activity.sinceResolved,
    window: activity.window,
    hasCard: modules.length > 0,
    note: HONEST_NOTE,
  }
  const text = json ? renderJson(digest, meta) : renderMarkdown(digest, meta)
  if (!quiet) console.log(text)
  return { ok: true, error: null, digest, meta, text }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const args = process.argv.slice(2)
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null }
  const projectRoot = get('--project-root') || get('--repo-root') || process.cwd()
  const since = get('--since')
  const limitRaw = get('--limit')
  const limit = limitRaw ? Math.max(1, parseInt(limitRaw, 10) || 0) : null
  const json = args.includes('--json')
  const quiet = args.includes('--quiet')
  const r = invokeLintasProjectMap({ projectRoot, since, limit, json, quiet })
  // Digest = informasi, BUKAN gerbang: exit 0 saat sukses. Exit 1 HANYA saat gagal keras
  // (bukan repo git / ref tak ada) supaya kegagalan tak lolos diam-diam. process.exitCode
  // (bukan process.exit) supaya stdout tuntas ter-flush saat di-pipa.
  process.exitCode = r.ok ? 0 : 1
}
