#!/usr/bin/env node
// engine/peta-gen.mjs - Generator PETA.md (ADR-027 Tugas 15, celah ③ "PETA auto-generate + anti-basi").
//
// KENAPA: kit butuh SATU peta "apa di mana" + aturan penempatan berkas baru (struktur-hygiene) yang AI
// baca PERTAMA. Ditulis TANGAN = cepat basi (folder/skill berubah, peta ketinggalan). Robot ini
// meng-generate PETA.md dari KENYATAAN DISK (folder top-level + skills/) + katalog konstanta -> peta ==
// disk selalu. Guard anti-basi checkPetaDrift (preflight) memerah kalau PETA.md != hasil generate.
// Pola KEMBAR: engine/skill-registry.mjs (scanSkills -> registry.json) + checkRegistryDrift.
//
// PURE + terinjeksi (bangunPeta tak sentuh disk kalau data disuntik) -> mudah diuji. Deterministik
// (folder + skill di-sort; tak ada Date.now/random) supaya output stabil = syarat guard anti-basi.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripBom } from './fs-text.mjs'
import { scanSkills } from './skill-registry.mjs'

export const VERSI_SKEMA_PETA = 1

// Katalog DESKRIPSI 1-baris per folder top-level. diClient TIDAK di sini — di-DERIVE dari package.json
// files[] (SUMBER KEBENARAN "apa yang ikut paket npm"; setup-pola-b menyalin isi paket npm ke .claude-kit/
// client), supaya kolom "Di .claude-kit klien?" JUJUR + self-maintaining, bukan tebakan konstanta yg bisa
// basi. (Pelajaran: bin/ + tests/ DIKIRIM ke client via files[]; menebaknya "hanya repo kit" = salah.)
// Folder BARU tak-terdaftar -> deskripsi default (checkPetaDrift memerah -> maintainer sadar & isi katalog).
const KATALOG_FOLDER = {
  bin: { deskripsi: 'Dispatcher `npx lintasai <cmd>` (pintu masuk semua perintah).' },
  engine: { deskripsi: 'Robot & helper Node (`*.mjs`/`*.js`) — mesin kit: generator, guard, helper installer.' },
  rules: { deskripsi: 'Rak aturan detail rujukan on-demand (per-seksi). `rules/INDEX.md` = daftar isi + pemicu.' },
  skills: { deskripsi: 'Buku panduan per-bidang (`<nama>/SKILL.md`). `registry.json` = indeks yang dibaca dispatcher.' },
  templates: { deskripsi: 'Berkas yang di-DEPLOY ke project client saat pasang (skeleton docs + panduan tim).' },
  docs: { deskripsi: 'Dokumentasi repo kit + ADR keputusan (`docs/decisions/`). Sebagian dinegasi di files[] (tak semua ikut).' },
  tests: { deskripsi: 'Tes Node (`*.test.mjs`) + `preflight.mjs` (gerbang pra-rilis).' },
  'create-lintasai': { deskripsi: 'Paket pembuat `npm create lintasai` (bootstrap installer).' },
}

const DESKRIPSI_DEFAULT = '(folder baru — belum ada catatan; tambahkan ke KATALOG_FOLDER di `engine/peta-gen.mjs`)'

// Folder top-level yang DIKIRIM ke client, dibaca dari package.json files[] (entri positif "<folder>/").
// Entri negasi (diawali !), berkas root, glob (*.template), & sub-path (a/b.md) DIABAIKAN. Alasan: setup-pola-b
// menyalin isi paket npm (= files[]) ke .claude-kit/ client. FAIL-SAFE: package.json tak terbaca -> Set kosong.
function folderTerkirimClient(root) {
  const set = new Set()
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
    for (const f of (Array.isArray(pkg.files) ? pkg.files : [])) {
      if (typeof f !== 'string') continue
      const m = /^([^/!*]+)\/$/.exec(f.replace(/\\/g, '/')) // "engine/" -> engine; buang "!x", "*.template", "a/b.md"
      if (m) set.add(m[1])
    }
  } catch { /* fail-safe: Set kosong */ }
  return set
}

// Folder yg SELALU diabaikan (bukan navigasi konten). Dot-folder (.git/.github/…) juga di-skip di scan.
const ABAIKAN_FOLDER = new Set(['node_modules'])

// Seksi 3 (aturan penempatan) + seksi 4 (peta lain) = KONSTANTA markdown (bagian "prosa" full-auto:
// 1 rumah = berkas ini, ikut ter-generate + dijaga guard). Ubah di sini lalu `npx lintasai peta-gen`.
const ATURAN_PENEMPATAN = `## 3. Aturan penempatan berkas BARU (struktur-hygiene) — baca SEBELUM bikin berkas

Taruh berkas baru di RUMAH yang benar + daftarkan supaya tak "un-ship senyap" (tak sampai ke client) / basi:

| Mau bikin… | Rumahnya | Wajib didaftar/dijalankan |
|---|---|---|
| **Skill baru** (buku panduan bidang) | \`skills/<nama>/SKILL.md\` (FLAT, 1 folder/skill) | \`npx lintasai skill-registry\` (perbarui \`registry.json\`) + tambah baris \`SKILL.md\` ke grup \`skills\` di \`engine/kit-files.json\` |
| **Rak aturan baru** (detail on-demand) | \`rules/<seksi>.md\` | Tambah baris ke \`rules/INDEX.md\` + grup \`rules\` di \`engine/kit-files.json\`; rujuk dari kernel via path |
| **Robot/helper Node baru** | \`engine/<nama>.mjs\` | Tambah ke grup \`node_lib\` di \`engine/kit-files.json\`; kalau jadi perintah → \`COMMANDS_NODE\` di \`bin/lintasai.js\` |
| **Tes baru** | \`tests/<nama>.test.mjs\` | Otomatis terpungut \`npm test\` (tak perlu daftar) |
| **Template untuk client** | \`templates/<nama>\` | Tambah grup \`templates\` di \`engine/kit-files.json\` + blok \`teamFiles\` \`setup-pola-b.mjs\` kalau di-deploy |
| **Dokumen repo kit** | \`docs/<nama>.md\` | On-demand (§7). ADR → \`docs/decisions/ADR-XXX-*.md\` |
| **Berkas root aturan/prompt** | akar repo | Tambah \`package.json\` \`files[]\` (root \`.md\` dikirim satu-per-satu, bukan pola \`*.md\`) + grup cocok di \`engine/kit-files.json\` |

**Prinsip:** jangan buang berkas di root sembarangan — tiap berkas punya rumah. Berkas yang dikirim ke client WAJIB terdaftar di \`engine/kit-files.json\` **dan** \`package.json\` \`files[]\`; kalau tidak, guard coverage (\`skill-registry.test\`/\`package-bundle.test\`) memerah ATAU berkas tak sampai ke client (un-ship senyap).

## 4. Peta lain (ini MELENGKAPI — jangan duplikasi isinya)

PETA.md = inventaris "apa di mana" + aturan penempatan. Untuk hal lain, rumahnya:

| Butuh… | Baca | Catatan |
|---|---|---|
| Narasi makro + alur perintah (kenapa/bagaimana) | \`docs/architecture.md\` | Peta makro prosa (READ-MINIMAL §7.3) — ikut ke client |
| Fakta/angka X (versi, jumlah, daftar repo) tinggal di mana + 1-sumber/duplikat | \`docs/PETA_SUMBER_KEBENARAN.md\` | ⚠️ **INTERNAL repo kit — TAK ada di client** |
| Berkas mana ikut bergerak per jenis perubahan | \`docs/RESEP_PERUBAHAN.md\` | Checklist per-perubahan |
| Daftar isi rak rujukan on-demand + pemicunya | \`rules/INDEX.md\` | Ikut ke client |
`

// Normalisasi teks sebelum banding (guard anti-basi): buang BOM + samakan newline CRLF->LF. WAJIB dipakai
// guard + tes supaya checkout Windows (CRLF) / BOM editor tak memicu drift PALSU. Generator selalu \n.
export function normalisasiPeta(s) {
  return stripBom(String(s || '')).replace(/\r\n/g, '\n')
}

// Scan struktur disk: folder top-level (terkatalog) + skill (dari disk). FAIL-SAFE: root tak terbaca -> kosong.
export function scanStrukturRepo(root) {
  let entri = []
  try {
    entri = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    entri = []
  }
  const terkirim = folderTerkirimClient(root)
  const folders = entri
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !ABAIKAN_FOLDER.has(d.name))
    .map((d) => d.name)
    .sort()
    .map((nama) => {
      const k = KATALOG_FOLDER[nama]
      return { nama, deskripsi: k ? k.deskripsi : DESKRIPSI_DEFAULT, diClient: terkirim.has(nama) }
    })
  const skills = scanSkills(path.join(root, 'skills'))
  return { folders, skills }
}

// PURE: data -> string markdown PETA.md. Deterministik (input sama -> output sama), tak sentuh disk.
export function bangunPeta({ folders = [], skills = [], versiSkema = VERSI_SKEMA_PETA } = {}) {
  const L = []
  L.push('# PETA.md — Peta "Apa di Mana" + Aturan Penempatan Berkas Baru (lintasAI)')
  L.push('')
  L.push('> ⚙️ **BERKAS DI-GENERATE OTOMATIS** oleh `engine/peta-gen.mjs` (`npx lintasai peta-gen`). JANGAN edit tangan —')
  L.push('> perubahan tangan akan tertimpa + guard `checkPetaDrift` (preflight) memerah. Ubah lewat sumbernya:')
  L.push('> folder/skill di disk, atau katalog konstanta di `engine/peta-gen.mjs`. Versi skema: ' + versiSkema + '.')
  L.push('>')
  L.push('> **AI: baca berkas INI PERTAMA** untuk tahu "apa di mana" + ke mana menaruh berkas baru (struktur-hygiene).')
  L.push('')

  L.push('## 1. Struktur folder — apa fungsi tiap folder')
  L.push('')
  L.push('| Folder | Fungsi | Di `.claude-kit/` klien? |')
  L.push('|---|---|---|')
  for (const f of folders) {
    L.push(`| \`${f.nama}/\` | ${f.deskripsi} | ${f.diClient ? '✅ ikut' : '— (hanya repo kit)'} |`)
  }
  L.push('')

  L.push('## 2. Skill (buku panduan per-bidang) — apa di mana + kapan aktif')
  L.push('')
  L.push('> 🔒 = rawan keamanan (wajib dibaca saat menyentuh bidangnya). Pemicu = kata di prompt yang menyalakan skill.')
  L.push('> Indeks mesin-baca: `skills/registry.json` (dijaga sinkron oleh `checkRegistryDrift`).')
  L.push('')
  L.push('| Skill | Divisi | Pemicu (contoh) | Berkas |')
  L.push('|---|---|---|---|')
  for (const s of skills) {
    const nama = (s.rawan_keamanan ? '🔒 ' : '') + s.nama
    const semua = Array.isArray(s.pemicu) ? s.pemicu : []
    const pemicu = semua.slice(0, 4).join(', ') + (semua.length > 4 ? ', …' : '')
    L.push(`| ${nama} | ${s.divisi || '—'} | ${pemicu} | \`${s.path}\` |`)
  }
  L.push('')
  L.push(`_${skills.length} skill terdaftar._`)
  L.push('')

  L.push(ATURAN_PENEMPATAN.trim())
  L.push('')
  return L.join('\n') + '\n'
}

// Tulis PETA.md dari hasil scan disk. Return {ok, path, folders, skills} atau {ok:false, error}.
export function tulisPeta(root = process.cwd()) {
  const data = scanStrukturRepo(root)
  const teks = bangunPeta(data)
  const outPath = path.join(root, 'PETA.md')
  try {
    fs.writeFileSync(outPath, teks)
    return { ok: true, path: outPath, folders: data.folders.length, skills: data.skills.length }
  } catch (e) {
    return { ok: false, path: null, error: e.message }
  }
}

// CLI: `node engine/peta-gen.mjs [--project-root <dir>]` -> tulis PETA.md.
function main() {
  let root = process.cwd()
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) if (argv[i] === '--project-root') root = argv[++i] || root
  const r = tulisPeta(root)
  if (r.ok) console.log(`PETA.md: ${r.folders} folder + ${r.skills} skill -> ${r.path}`)
  else console.log(`PETA.md: GAGAL tulis (${r.error})`)
  process.exit(0)
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
