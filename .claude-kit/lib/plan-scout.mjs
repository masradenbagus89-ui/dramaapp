// Plan-Scout: robot PRA-PINDAI cuma-baca deterministik (~0 token AI) untuk Pindai Cepat §4.19.
// Diberi kata-kunci task -> keluarkan ringkasan "mulai lihat di sini" SEBELUM AI membaca:
//   (a) cek keberadaan kandidat 8-dimensi stack (Next.js/Supabase/deploy/API/DevOps/SEO/Observability/Python)
//   (b) berkas cocok kata-kunci, diperingkat by jumlah-kecocokan (UTAMA) + hint import-count STATELESS (opsional)
//   (c) ringkasan kartu project.lintas.jsonc + flag kartu-kosong
// Mode khusus (dari stress-test §4.19):
//   --migration-timeline <objek> : daftar migrasi menyentuh <objek> terurut nomor + tandai TERTINGGI + lockdown/revoke
//   --reverse-ref <target>       : daftar SEMUA router + export target + pemakai (untuk intent HAPUS)
//
// PATUH ADR-001: STATELESS — jalan segar tiap panggil, TANPA indeks/graf tersimpan, TANPA nomor baris.
// Hint import-count = penghitungan sesaat (bukan graf ketergantungan). CUMA-BACA: tak menulis berkas.
// Pakai: node lib/plan-scout.mjs "<kata kunci>" --project-root <repo> [--json] [--top <n>]
//        node lib/plan-scout.mjs --project-root <repo> --migration-timeline <objek>
//        node lib/plan-scout.mjs --project-root <repo> --reverse-ref <NamaKomponen>

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Folder yang TAK pernah dipindai (bising / bukan sumber). Deterministik.
const IGNORE_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.turbo', '.vercel', 'out', '.cache'])
const MAX_FILES = 6000        // pagar: jangan jelajah tak terbatas
const MAX_READ_BYTES = 262144 // 256 KB: berkas lebih besar dilewati saat scan isi
const DEFAULT_TOP = 15        // jatah-token keras: ringkasan <= top-N berkas
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.sql', '.py', '.json', '.md', '.yml', '.yaml', '.toml'])

// --- Fungsi MURNI (bisa diuji tanpa disk) --------------------------------------------------------

// Normalisasi kata-kunci: pisah spasi/koma, buang kosong, huruf-kecil, unik.
export function parseKeywords(input) {
  return [...new Set(String(input || '').split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))]
}

// Skor 1 berkas terhadap kata-kunci. Nama-berkas cocok = bobot 3 (sinyal kuat), isi = 1 per kecocokan.
// importHint (berapa kali berkas ini di-import) = tie-breaker kecil (Aider RepoMap, STATELESS, opsional).
export function scoreFile({ relPath, filenameHits, contentHits, importHint = 0 }) {
  // importHint SENGAJA <1 total (maks 0.9): tie-breaker murni, TAK PERNAH membalik beda skor bulat.
  return filenameHits * 3 + contentHits + Math.min(importHint, 18) * 0.05
}

// Peringkat berkas: skor turun, lalu path A->Z (deterministik). Ambil top-N.
export function rankFiles(entries, top = DEFAULT_TOP) {
  return [...entries]
    .map((e) => ({ ...e, score: scoreFile(e) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || a.relPath.localeCompare(b.relPath))
    .slice(0, top)
}

// Angka pemimpin nama migrasi ('068_revoke_x.sql' -> 68; 'abc.sql' -> -1).
export function migrationNumber(name) {
  const m = /(^|\/)(\d+)[_-]/.exec(String(name).replace(/\\/g, '/'))
  return m ? parseInt(m[2], 10) : -1
}

// Urutkan entri migrasi (yang menyentuh objek) + tandai TERTINGGI + tandai lockdown/revoke/fix/security.
export function buildMigrationTimeline(entries) {
  const sorted = [...entries].sort((a, b) => migrationNumber(a.file) - migrationNumber(b.file) || a.file.localeCompare(b.file))
  const withNum = sorted.map((e) => ({ ...e, num: migrationNumber(e.file), remediasi: /lockdown|revoke|fix|secur|hardening|lock/i.test(e.file) }))
  const highest = withNum.length ? withNum[withNum.length - 1] : null
  return { timeline: withNum, otoritatif: highest, remediasiTerakhir: [...withNum].reverse().find((e) => e.remediasi) || null }
}

// --- Bagian menyentuh disk (cuma-baca, bounded) --------------------------------------------------

// Jelajah berkas sumber secara bounded (skip IGNORE_DIRS, cap MAX_FILES). Kembalikan path relatif '/'.
export function listSourceFiles(root, { maxFiles = MAX_FILES } = {}) {
  const out = []
  const stack = ['']
  while (stack.length && out.length < maxFiles) {
    const rel = stack.pop()
    const abs = path.join(root, rel)
    let ents
    try { ents = fs.readdirSync(abs, { withFileTypes: true }) } catch { continue }
    ents.sort((a, b) => a.name.localeCompare(b.name))
    for (const ent of ents) {
      if (out.length >= maxFiles) break
      const childRel = rel ? rel + '/' + ent.name : ent.name
      if (ent.isDirectory()) {
        if (!IGNORE_DIRS.has(ent.name) && !ent.name.startsWith('.')) stack.push(childRel)
      } else if (ent.isFile()) {
        if (CODE_EXT.has(path.extname(ent.name).toLowerCase())) out.push(childRel)
      }
    }
  }
  return out.sort()
}

// Baca isi berkas dengan aman (cap ukuran); '' bila gagal/terlalu besar.
function readSafe(abs) {
  try {
    const st = fs.statSync(abs)
    if (st.size > MAX_READ_BYTES) return ''
    return fs.readFileSync(abs, 'utf8')
  } catch { return '' }
}

// Hitung kecocokan kata-kunci per berkas (nama + isi). Kembalikan entri untuk rankFiles.
export function scanKeywordHits(root, files, keywords) {
  const kw = keywords.map((k) => k.toLowerCase())
  const entries = []
  for (const rel of files) {
    const lowerPath = rel.toLowerCase()
    const filenameHits = kw.reduce((n, k) => n + (lowerPath.includes(k) ? 1 : 0), 0)
    let contentHits = 0
    if (kw.length) {
      const text = readSafe(path.join(root, rel)).toLowerCase()
      if (text) for (const k of kw) { const c = text.split(k).length - 1; contentHits += c }
    }
    if (filenameHits || contentHits) entries.push({ relPath: rel, filenameHits, contentHits })
  }
  return entries
}

// Hitung berapa kali tiap berkas di-import (STATELESS, sesaat). basename tanpa ekstensi -> jumlah 'from .../<base>'.
export function countImportHints(root, files, candidates) {
  const bases = new Map() // base -> relPath
  for (const c of candidates) {
    const base = path.basename(c.relPath).replace(/\.[^.]+$/, '')
    if (base && base.length >= 3) bases.set(base, c.relPath)
  }
  if (!bases.size) return candidates
  const counts = new Map()
  for (const rel of files) {
    const text = readSafe(path.join(root, rel))
    if (!text || !/\b(import|require|from)\b/.test(text)) continue
    for (const [base] of bases) {
      // cocokkan 'from ".../base"' atau "import(...base...)" — sederhana + deterministik
      const re = new RegExp('(from|import|require)\\s*\\(?[\'"][^\'"]*/' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\'"/]', 'g')
      const m = text.match(re)
      if (m) counts.set(base, (counts.get(base) || 0) + m.length)
    }
  }
  return candidates.map((c) => {
    const base = path.basename(c.relPath).replace(/\.[^.]+$/, '')
    return { ...c, importHint: counts.get(base) || 0 }
  })
}

// Cek keberadaan kandidat 8-dimensi (ls/grep murah). Kembalikan {dim, ada, bukti}.
export function detectCandidates(root) {
  const has = (p) => { try { return fs.existsSync(path.join(root, p)) } catch { return false } }
  const hasAny = (arr) => arr.find((p) => has(p)) || null
  const dirHasFile = (dir, re) => {
    try { return fs.readdirSync(path.join(root, dir)).some((f) => re.test(f)) } catch { return false }
  }
  const pkgText = readSafe(path.join(root, 'package.json'))
  const dep = (name) => pkgText.includes('"' + name)
  return [
    { dim: 'Next.js', ada: dep('next'), bukti: hasAny(['next.config.mjs', 'next.config.js', 'next.config.ts', 'app', 'pages']) || 'dep next di package.json' },
    { dim: 'Supabase', ada: has('supabase') || dep('@supabase/'), bukti: hasAny(['supabase/migrations', 'supabase/config.toml']) || 'dep @supabase' },
    { dim: 'deploy', ada: !!hasAny(['vercel.json', 'render.yaml', 'railway.json', 'railway.toml', 'Dockerfile', 'fly.toml']), bukti: hasAny(['vercel.json', 'render.yaml', 'railway.json', 'railway.toml', 'Dockerfile', 'fly.toml']) || 'sinyal-turunan: cek script next build (belum terdeteksi != tidak-deploy)' },
    { dim: 'API / Edge Functions', ada: has('supabase/functions') || dirHasFile('app', /route/) || has('pages/api') || has('middleware.ts') || has('src/middleware.ts'), bukti: hasAny(['supabase/functions', 'pages/api', 'middleware.ts', 'src/middleware.ts']) || 'app/**/route.ts (cek manual)' },
    { dim: 'SEO', ada: !!hasAny(['app/robots.ts', 'app/sitemap.ts', 'src/app/robots.ts']), bukti: hasAny(['app/robots.ts', 'app/sitemap.ts']) || 'berkas-niat: baca robots.ts DULU (§4.19 P4)' },
    { dim: 'DevOps / CI', ada: has('.github/workflows'), bukti: hasAny(['.github/workflows', '.gitlab-ci.yml', 'Dockerfile']) || 'nihil' },
    { dim: 'Observability', ada: dep('@sentry') || dep('pino') || dep('winston'), bukti: dep('@sentry') ? 'dep @sentry' : (dep('pino') ? 'dep pino' : (dep('winston') ? 'dep winston' : 'nihil -> gap §11 bila mau online')) },
    { dim: 'Python', ada: !!hasAny(['pyproject.toml', 'requirements.txt', 'manage.py']), bukti: hasAny(['pyproject.toml', 'requirements.txt', 'manage.py']) || 'nihil' },
  ]
}

// Ringkas kartu project.lintas.jsonc + flag kartu-kosong (P11).
export function readCardSummary(root) {
  const p = path.join(root, 'project.lintas.jsonc')
  let text
  try { text = fs.readFileSync(p, 'utf8') } catch { return { ada: false, kosong: false, purpose: null, modules: 0, catatan: 'kartu tidak ada (pakai docs/architecture.md sbagai peta — §7.3)' } }
  const noComments = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
  let purpose = null, modulesLen = 0
  try {
    const obj = JSON.parse(noComments)
    purpose = obj?.intent?.purpose ?? null
    modulesLen = Array.isArray(obj?.modules) ? obj.modules.length : 0
  } catch { /* jsonc rumit -> heuristik di bawah */ }
  const kosong = (purpose === null || purpose === 'pending') || modulesLen === 0
  return { ada: true, kosong, purpose, modules: modulesLen, catatan: kosong ? 'KARTU KOSONG -> "baca 1 peta" TAK tuntas: tawarkan isi purpose/modules dulu (§7.9), Pindai Cepat jatuh ke Grep (P11)' : 'kartu terisi -> peta modul bisa dipercaya' }
}

// Migrasi-timeline: daftar migrasi (supabase/migrations, prisma/migrations) yang menyentuh <objek>.
export function scanMigrationTimeline(root, object) {
  const dirs = ['supabase/migrations', 'prisma/migrations', 'migrations', 'db/migrations']
  const obj = String(object).toLowerCase()
  const hits = []
  for (const d of dirs) {
    let files
    try { files = fs.readdirSync(path.join(root, d)) } catch { continue }
    for (const f of files.sort()) {
      if (!/\.sql$/i.test(f)) continue
      const rel = d + '/' + f
      const text = readSafe(path.join(root, rel)).toLowerCase()
      if (text.includes(obj)) hits.push({ file: rel })
    }
  }
  return buildMigrationTimeline(hits)
}

// Reverse-ref: enumerasi SEMUA router + pemakai simbol target (untuk intent HAPUS, P8).
export function scanReverseRef(root, target) {
  const files = listSourceFiles(root)
  const sym = String(target).replace(/\.[^.]+$/, '') // buang ekstensi bila diberi nama berkas
  const base = path.basename(sym)
  const routers = []
  const users = []
  const ROUTER_RE = /createBrowserRouter|createRoutesFromElements|RouterProvider|createMemoryRouter|<Routes?\b/
  for (const rel of files) {
    const text = readSafe(path.join(root, rel))
    if (!text) continue
    if (ROUTER_RE.test(text)) routers.push(rel)
    // pemakai: sebut simbol (default/named) ATAU import path basename
    const re = new RegExp('\\b' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b')
    if (re.test(text) && rel !== sym && !rel.endsWith('/' + base) && path.basename(rel).replace(/\.[^.]+$/, '') !== base) {
      users.push(rel)
    }
  }
  return { target: base, routers: [...new Set(routers)].sort(), users: [...new Set(users)].sort() }
}

// --- Render (Markdown default; JSON via --json) --------------------------------------------------

export function renderScout({ keywords, candidates, ranked, card }) {
  const L = []
  L.push('# Plan-Scout — ringkasan "mulai lihat di sini" (cuma-baca, deterministik)')
  L.push('> BUKAN bukti — ini NAVIGASI. ✅ hanya lahir dari membaca KODE ASLI (§4.19 doktrin navigasi-vs-bukti).')
  L.push('')
  L.push(`- Kata-kunci: ${keywords.length ? keywords.map((k) => '`' + k + '`').join(', ') : '(tak ada — cuma peta kandidat)'}`)
  L.push(`- Kartu identitas: ${card.ada ? (card.kosong ? '⚠️ KOSONG' : 'terisi') + ` (purpose=${card.purpose ?? '-'}, modules=${card.modules})` : 'tidak ada'}`)
  L.push(`  - ${card.catatan}`)
  L.push('')
  L.push('## Kandidat 8-dimensi (uji-keberadaan; yang ADA baru dibaca, tak ada -> jatuh ke Grep)')
  for (const c of candidates) L.push(`- ${c.ada ? '✅ ADA' : '— tak-terdeteksi'} **${c.dim}** — ${c.bukti}`)
  L.push('')
  if (keywords.length) {
    L.push(`## Berkas cocok kata-kunci (top ${ranked.length}, by kecocokan; hint import = tie-breaker)`)
    if (!ranked.length) L.push('_(tak ada berkas cocok — perlebar kata-kunci / cek ejaan)_')
    for (const r of ranked) L.push(`- \`${r.relPath}\` — nama×${r.filenameHits}, isi×${r.contentHits}${r.importHint ? `, di-import×${r.importHint}` : ''}`)
    L.push('')
  }
  L.push('> Langkah berikut: baca berkas-OTORITATIF per intent (§4.19 Matriks) — untuk klaim RLS/izin pakai `--migration-timeline <objek>`; untuk HAPUS pakai `--reverse-ref <Nama>`.')
  return L.join('\n').trimEnd() + '\n'
}

// Orkestrator utama (mode kata-kunci).
export function invokeLintasPlanScout({ projectRoot, keywords = [], top = DEFAULT_TOP, json = false, quiet = false } = {}) {
  const root = projectRoot || process.cwd()
  const kw = Array.isArray(keywords) ? keywords : parseKeywords(keywords)
  const candidates = detectCandidates(root)
  const card = readCardSummary(root)
  let ranked = []
  if (kw.length) {
    const files = listSourceFiles(root)
    let entries = scanKeywordHits(root, files, kw)
    const prelim = rankFiles(entries, top)
    entries = countImportHints(root, files, prelim) // hint hanya untuk kandidat teratas (hemat)
    ranked = rankFiles(entries, top)
  }
  const payload = { keywords: kw, candidates, ranked, card }
  const text = json ? JSON.stringify(payload, null, 2) : renderScout(payload)
  if (!quiet) console.log(text)
  return { ok: true, ...payload, text }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const args = process.argv.slice(2)
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null }
  const projectRoot = get('--project-root') || get('--repo-root') || process.cwd()
  const json = args.includes('--json')
  const quiet = args.includes('--quiet')
  const migObj = get('--migration-timeline')
  const revTarget = get('--reverse-ref')

  if (migObj) {
    const r = scanMigrationTimeline(projectRoot, migObj)
    if (json) { console.log(JSON.stringify({ mode: 'migration-timeline', objek: migObj, ...r }, null, 2)) } else {
      console.log(`# Migration-timeline untuk objek: ${migObj}`)
      console.log('> State RLS/izin EFEKTIF = migrasi ber-nomor TERTINGGI yang menyentuh objek (§4.19 P2). ✅ sah hanya bila ini terbaca.')
      if (!r.timeline.length) console.log('_(tak ada migrasi menyentuh objek ini)_')
      for (const e of r.timeline) console.log(`- #${e.num} \`${e.file}\`${e.remediasi ? ' 🔒 (lockdown/revoke/fix)' : ''}${r.otoritatif && e.file === r.otoritatif.file ? ' ← OTORITATIF (terakhir)' : ''}`)
    }
    process.exitCode = 0
  } else if (revTarget) {
    const r = scanReverseRef(projectRoot, revTarget)
    if (json) { console.log(JSON.stringify({ mode: 'reverse-ref', ...r }, null, 2)) } else {
      console.log(`# Reverse-ref (Sapuan-Referensi-Terbalik) untuk: ${r.target}`)
      console.log('> HAPUS: DILARANG klaim "yatim" bila ADA pemakai. Enumerasi SEMUA router dulu (§4.19 P8).')
      console.log(`\n## Router terdeteksi (${r.routers.length}):`)
      for (const f of r.routers) console.log(`- \`${f}\``)
      console.log(`\n## Pemakai simbol '${r.target}' (${r.users.length}):`)
      if (!r.users.length) console.log('_(tak ada pemakai terdeteksi — TETAP cek named-export & string route manual sebelum klaim yatim)_')
      for (const f of r.users) console.log(`- \`${f}\``)
    }
    process.exitCode = 0
  } else {
    const kwInput = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--project-root' && args[args.indexOf(a) - 1] !== '--repo-root' && args[args.indexOf(a) - 1] !== '--top') || ''
    const top = Math.max(1, parseInt(get('--top') || String(DEFAULT_TOP), 10) || DEFAULT_TOP)
    const r = invokeLintasPlanScout({ projectRoot, keywords: parseKeywords(kwInput), top, json, quiet })
    process.exitCode = r.ok ? 0 : 1
  }
}
