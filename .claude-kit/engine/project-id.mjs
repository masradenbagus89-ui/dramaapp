#!/usr/bin/env node
// engine/project-id.mjs - Hitung 3 ID hash-anonim (ORG/REPO/STAFF) dari git, DETERMINISTIK (~0 token).
//
// KENAPA ADA (FASE C1 sistem feedback, docs/decisions/ADR-006): berkas "Rekam Pelajaran" tiap client
// diberi 3 ID hash-anonim supaya bisa diagregasi PER-ORGANISASI tanpa membocorkan identitas. Sampai kini
// hashing dihitung AI di dalam prompt (`node -e ...` inline) -> rawan salah/ejaan. Robot ini MEMINDAHKAN
// hashing ke tempat deterministik. KONTRAK PERSIS = templates/feedback/rekam-pelajaran.md:79-100 (hasil
// hash robot WAJIB sama byte dengan yang prompt hasilkan -> dikunci "oracle test").
//
// PAGAR PRIVASI (§8.1#6): nilai MENTAH git (URL repo, email, nama folder) HANYA bahan hash lalu DIBUANG.
// Objek kembalian TIDAK PERNAH memuat nilai mentah - cuma hash + periode. Robot cuma-baca (git config --get).
//
// "belajar CARANYA bukan BISNISnya": ID = sidik-jari anonim, bukan nama. Korroborasi per-ORGANISASI
// (ORG-ID sama untuk semua repo 1 organisasi) -> client microservice ber-banyak-repo tetap 1 suara.
import path from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Bentuk ID sah (dipakai-ULANG C2 engine/feedback-aggregate.mjs untuk deteksi ID cacat/placeholder).
export const ID_SHAPE = {
  org: /^ORG-[0-9a-f]{8}$/,
  repo: /^REPO-[0-9a-f]{8}$/,
  staff: /^STAFF-(?:[0-9a-f]{8}|anon)$/,
}

export function isWellFormedId(kind, val) {
  const rx = ID_SHAPE[kind]
  return !!rx && typeof val === 'string' && rx.test(val)
}

// sha256[:8] hex LOWERCASE (rekam-pelajaran.md:89). CATATAN anti-drift: JANGAN toUpperCase seperti
// engine/manifest.mjs (itu hash BERKAS dengan kontrak beda) - prompt memakai .digest('hex').slice(0,8) lowercase.
export function sha256short(text) {
  return createHash('sha256').update(String(text)).digest('hex').slice(0, 8)
}

// Normalkan URL repo (rekam-pelajaran.md:83-87) supaya hash SAMA lintas-mesin walau format beda
// (SSH git@.. / HTTPS / ssh:// / git:// -> hasil identik). Kembalikan string ternormalisasi (tanpa skema).
export function normalizeRepoUrlForId(url) {
  if (url == null) return ''
  let s = String(url).trim()
  if (s === '') return ''
  // 1) buang prefix skema (peel ssh:// -> git@ untuk bentuk ssh://git@host).
  s = s.replace(/^ssh:\/\//i, '')
  s = s.replace(/^git:\/\//i, '')
  s = s.replace(/^https?:\/\//i, '')
  s = s.replace(/^git@/i, '')
  // 2) buang www.
  s = s.replace(/^www\./i, '')
  // 3) host-separator + port: buang :NNNN (port), lalu ganti ':' sisa (scp-form host:path) jadi '/'.
  s = s.replace(/:(\d+)(?=\/|$)/, '')
  s = s.replace(/:/, '/')
  // 4) buang .git di akhir.
  s = s.replace(/\.git$/i, '')
  // 5) buang '/' awal & akhir.
  s = s.replace(/^\/+/, '').replace(/\/+$/, '')
  // 6) lowercase.
  return s.toLowerCase()
}

// Periode ISO tahun-minggu (rekam-pelajaran.md:96-97). Terima Date injectable (deterministik saat uji).
// JANGAN hitung naif dari 1 Januari (mis. 2027-01-01 = 2026-W53).
export function isoWeek(date = new Date()) {
  const t = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const ys = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const w = Math.ceil(((t - ys) / 864e5 + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, '0')}`
}

// Hitung 3 ID dari bahan mentah. Bahan mentah HIDUP hanya sebagai variabel lokal -> keluar-scope.
// Return HANYA hash + periode + nama-berkas (raw-free). remoteUrl kosong -> fallback <folder>-lokal (tetap
// di-hash -> nama folder TIDAK muncul di keluaran; org===repo hash). userEmail kosong -> STAFF-anon.
export function computeIds({ remoteUrl, userEmail, folderName, now } = {}) {
  const normalized = normalizeRepoUrlForId(remoteUrl)
  let orgRaw
  let repoRaw
  if (normalized) {
    const segs = normalized.split('/').filter(Boolean)
    repoRaw = segs.join('/')
    orgRaw = segs.slice(0, 2).join('/')
  } else {
    // Fallback lokal: ORG raw = REPO raw = "<folder>-lokal" (tetap di-hash, mentah dibuang).
    const base = `${(folderName || 'tak-dikenal')}-lokal`
    orgRaw = base
    repoRaw = base
  }
  const email = (userEmail == null ? '' : String(userEmail)).trim()
  const orgId = `ORG-${sha256short(orgRaw)}`
  const repoId = `REPO-${sha256short(repoRaw)}`
  const staffId = email ? `STAFF-${sha256short(email)}` : 'STAFF-anon'
  const periode = isoWeek(now || new Date())
  // orgRaw/repoRaw/email = variabel lokal; TIDAK dimasukkan ke objek kembalian (pagar §8.1#6).
  return { orgId, repoId, staffId, periode, fileName: `pelajaran__${repoId}__${staffId}__${periode}.md` }
}

// Jalankan 1 perintah git cuma-baca; kembalikan stdout ter-trim atau '' (fail-open).
function readGitTrimmed(projectRoot, args) {
  try {
    const r = spawnSync('git', args, { cwd: projectRoot, encoding: 'utf8', timeout: 5000, windowsHide: true })
    if (r.error || r.status !== 0 || typeof r.stdout !== 'string') return ''
    return r.stdout.trim()
  } catch {
    return ''
  }
}

// Baca git deterministik lalu computeIds. remote.origin.url dulu; kosong -> remote pertama yang ada
// (rekam-pelajaran.md:81-82). Nilai mentah dibuang setelah di-hash di computeIds.
export function computeIdsFromGit(projectRoot, { now } = {}) {
  const root = projectRoot || process.cwd()
  let remoteUrl = readGitTrimmed(root, ['config', '--get', 'remote.origin.url'])
  if (!remoteUrl) {
    const firstRemote = readGitTrimmed(root, ['remote']).split(/\r?\n/).filter(Boolean)[0]
    if (firstRemote) remoteUrl = readGitTrimmed(root, ['config', '--get', `remote.${firstRemote}.url`])
  }
  const userEmail = readGitTrimmed(root, ['config', 'user.email'])
  const folderName = path.basename(root)
  return computeIds({ remoteUrl, userEmail, folderName, now })
}

// --- CLI: node engine/project-id.mjs [--project-root <dir>] [--json] ---
// Cetak HANYA hash (jangan pernah cetak nilai mentah git).
function main() {
  let projectRoot = process.cwd()
  let asJson = false
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project-root') projectRoot = argv[++i] || projectRoot
    else if (argv[i] === '--json') asJson = true
  }
  const ids = computeIdsFromGit(projectRoot)
  if (asJson) {
    console.log(JSON.stringify(ids, null, 2))
  } else {
    console.log('ID project (hash anonim - nilai mentah git tidak ditampilkan/disimpan):')
    console.log(`  ORG-ID   : ${ids.orgId}   (mengikat semua repo 1 organisasi -> 1 suara)`)
    console.log(`  REPO-ID  : ${ids.repoId}`)
    console.log(`  STAFF-ID : ${ids.staffId}`)
    console.log(`  Periode  : ${ids.periode}`)
    console.log(`  Berkas   : docs/pelajaran-lintasai/${ids.fileName}`)
  }
  process.exit(0)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
