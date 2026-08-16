#!/usr/bin/env node
// engine/skill-registry.mjs - Robot self-registering skill (ADR-027 Microkernel+Plugin, Tugas 7).
//
// KENAPA: tiap skill = buku panduan mandiri di skills/<nama>/SKILL.md dengan frontmatter
// (nama·deskripsi·divisi·pemicu·rawan_keamanan). Robot ini scan folder skills/ -> tulis
// skills/registry.json (indeks yang dibaca dispatcher rak-pemicu). Tambah skill = drop 1
// folder; robot yang mendaftarkannya. FAIL-SAFE: skills/ tak ada -> registry kosong [].
//
// PURE + terinjeksi (parseFrontmatter/scanSkills tak wajib sentuh disk kalau isi disuntik) -> mudah diuji.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripBom } from './fs-text.mjs'
import { NAMA_FOLDER_KIT } from './project-root.mjs'

// Parser frontmatter: subset YAML yang cukup untuk SKILL.md (bukan YAML penuh, sengaja minimal).
// Dukung: `key: teks`, `key: "teks"`, `key: [a, b, c]`, `key: true/false`. Baris lain diabaikan.
export function parseFrontmatter(teks) {
  // Normalisasi CRLF->LF DULU. Tanpa ini, baris TERAKHIR frontmatter berkas CRLF (checkout Windows)
  // menyisakan '\r' telanjang (regex penutup memakan '\n'-nya) -> regex per-baris gagal match ('.' JS
  // tak match '\r') -> field terakhir hilang DIAM-DIAM. Insiden nyata: CI v3.1.0 merah 'menggantikan' drift.
  const t = stripBom(String(teks || '')).replace(/\r\n?/g, '\n')
  const m = /^---\s*\n([\s\S]*?)\n---/.exec(t) // blok antara --- pertama dan --- kedua
  if (!m) return {}
  const out = {}
  for (const baris of m[1].split(/\r?\n/)) {
    const kv = /^\s*([a-zA-Z_][\w-]*)\s*:\s*(.*)$/.exec(baris)
    if (!kv) continue
    const key = kv[1]
    let raw = kv[2].trim()
    if (raw === '') { out[key] = ''; continue }
    if (/^\[.*\]$/.test(raw)) { // array: [a, b, c]
      out[key] = raw.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    } else if (raw === 'true' || raw === 'false') {
      out[key] = raw === 'true'
    } else {
      out[key] = raw.replace(/^["']|["']$/g, '') // buang kutip pembungkus
    }
  }
  return out
}

// Ubah frontmatter -> entri registry ternormalisasi. Path relatif ke root .lintasai.
export function entriDariFrontmatter(fm, relPath) {
  return {
    nama: String(fm.nama || '').trim(),
    deskripsi: String(fm.deskripsi || '').trim(),
    divisi: String(fm.divisi || '').trim(),
    pemicu: Array.isArray(fm.pemicu) ? fm.pemicu.map((s) => String(s).toLowerCase()) : [],
    rawan_keamanan: fm.rawan_keamanan === true,
    // id grup tabel-lama (deteksiRak) yang diambil-alih skill ini - dipakai SHIM bangunPetunjukRak
    // supaya prompt multi-topik tak menampilkan grup dobel (skill + rak lama sekaligus). Transisi-saja
    // (ADR-027): dicabut saat Tugas 15 menghapus tabel lama. Kosong = skill baru tak menggantikan apa pun.
    menggantikan: Array.isArray(fm.menggantikan) ? fm.menggantikan.map((s) => String(s).trim()) : [],
    path: relPath,
  }
}

// Scan skills/*/SKILL.md di disk -> array entri. FAIL-SAFE: dir tak ada / korup -> lewati diam.
// Hanya skill BER-NAMA + BER-PEMICU yang masuk (frontmatter tak lengkap = dilewati, bukan error).
export function scanSkills(skillsDir) {
  let sub = []
  try {
    sub = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  } catch {
    return [] // skills/ belum ada (masa transisi) -> registry kosong
  }
  const entri = []
  for (const nama of sub.sort()) {
    const skillPath = path.join(skillsDir, nama, 'SKILL.md')
    let teks = ''
    try { teks = fs.readFileSync(skillPath, 'utf8') } catch { continue }
    const e = entriDariFrontmatter(parseFrontmatter(teks), `skills/${nama}/SKILL.md`)
    if (e.nama && e.pemicu.length) entri.push(e)
  }
  return entri
}

// Tulis skills/registry.json dari hasil scan. Return {jumlah, path} atau {jumlah:0} bila skills/ tak ada.
export function tulisRegistry(kitRoot = process.cwd()) {
  const skillsDir = path.join(kitRoot, 'skills')
  const entri = scanSkills(skillsDir)
  const outPath = path.join(skillsDir, 'registry.json')
  try {
    if (!fs.existsSync(skillsDir)) return { jumlah: 0, path: null, present: false }
    fs.writeFileSync(outPath, JSON.stringify({ versi: 1, skills: entri }, null, 2) + '\n')
    return { jumlah: entri.length, path: outPath, present: true }
  } catch (e) {
    return { jumlah: 0, path: null, present: false, error: e.message }
  }
}

// Baca registry.json (dipakai dispatcher + hook pengingat tiap giliran). FAIL-SAFE: tak ada / korup -> [].
// URUTAN KANDIDAT (diperbaiki 2026-07-30) - dari yang paling PASTI milik kit ke yang paling ambigu:
//   1. `<b>/.lintasai/skills/` - salinan kit asli di project client. Penanda KUAT (nama folder khas kit).
//   2. `<b>/kit/skills/`       - repo-dev setelah pemisahan client/dev (isi kit/ = yang jadi .lintasai/).
//   3. `<b>/skills/`           - kit dijalankan dari dalam dirinya (mode tradisional/zip). Penanda LEMAH.
// KENAPA root TURUN ke urutan terakhir: dulu ia dicoba PERTAMA, padahal `skills/` adalah nama folder yang
// wajar dimiliki project client sendiri. Project client ber-`skills/` sendiri akan MENGALAHKAN registry
// kit -> seluruh routing rak memakai daftar yang salah, DIAM-DIAM (nol pesan error). Penanda paling
// ambigu wajib dicoba paling akhir. Urutan ini kini sama dengan tools/preflight-core.mjs kitDirDari().
export function muatRegistry(basisDirs = [process.cwd()]) {
  const kandidat = []
  for (const b of basisDirs) {
    if (b && typeof b === 'string') {
      kandidat.push(path.join(b, NAMA_FOLDER_KIT, 'skills', 'registry.json'))
      kandidat.push(path.join(b, 'kit', 'skills', 'registry.json'))
      kandidat.push(path.join(b, 'skills', 'registry.json'))
    }
  }
  for (const p of kandidat) {
    try {
      const data = JSON.parse(stripBom(fs.readFileSync(p, 'utf8')))
      if (Array.isArray(data.skills)) return data.skills
    } catch { /* lanjut kandidat berikut */ }
  }
  return []
}

// CLI: `node engine/skill-registry.mjs [--project-root <dir>]` -> tulis registry.json.
function main() {
  let root = process.cwd()
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) if (argv[i] === '--project-root') root = argv[++i] || root
  const r = tulisRegistry(root)
  if (!r.present) console.log(`Registry skill: DILEWATI - folder skills/ belum ada di ${root} (masa transisi, wajar).`)
  else console.log(`Registry skill: ${r.jumlah} skill terdaftar -> ${r.path}`)
  process.exit(0)
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
