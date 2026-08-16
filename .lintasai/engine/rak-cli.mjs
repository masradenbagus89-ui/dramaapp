#!/usr/bin/env node
// engine/rak-cli.mjs - CLI "rak": beri TOPIK -> cetak daftar rak (skill) relevan (~300 char).
//
// KENAPA ADA: saat AI perlu routing manual (petunjuk rak dari hook UserPromptSubmit tak muncul), kernel
// §4.2 dulu menyuruh AI memetakan lewat skills/registry.json - tapi membaca registry.json PENUH boros
// (~5.000 token). CLI ini membungkus fungsi yang SUDAH ADA `muatPetunjukRak` (engine/lang-reminder.mjs)
// supaya AI cukup jalankan 1 perintah dan menerima ringkasan pendek. TUJUAN: hemat token routing +
// deterministik (robot, bukan tebakan model - selaras doktrin "fast default = robot deterministik").
//
// TIPIS DISENGAJA (Ponytail §4): tak ada logika baru - semua deteksi rak tetap di rak-pemicu.mjs /
// skill-registry.mjs. Berkas ini cuma "gagang" CLI: baca argumen -> panggil fungsi -> cetak.
//
// JALUR PAKAI: AI di client -> `node .lintasai/engine/rak-cli.mjs "<topik>"` (pasti seversi registry
// terpasang, tak kena cache npx). Manusia -> `npx lintasai rak "<topik>"`. Keduanya memanggil berkas ini.
//
// FAIL-SAFE: process.cwd() dipakai sebagai basis -> muatRegistry cari registry.json di CWD ATAU
// CWD/.lintasai/ (skill-registry.mjs). Registry hilang/korup -> muatPetunjukRak fallback tabel
// RAK_PEMICU / string kosong; CLI beri pesan arah skills/registry.json. SELALU exit 0 (tak pernah bikin merah).

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { muatPetunjukRak } from './lang-reminder.mjs'
import { rakUntukBerkas } from './rak-pemicu.mjs'
import { muatRegistry } from './skill-registry.mjs'

const PESAN_PAKAI = 'Pemakaian: npx lintasai rak "<topik>"  (mis. "buat halaman login")'
const PESAN_KOSONG = 'Belum ada rak spesifik yang cocok. Lihat skills/registry.json (pemicu tiap skill).'
const PESAN_DIVISI_KOSONG = 'Tak ada divisi berisiko-senyap yang tersentuh dari berkas itu.'

// --- MODE `--divisi <path...>`: berkas yang BENAR-BENAR diubah -> divisi mana yang terkena ----------
//
// KENAPA ADA (AGENTS.md sec.4.6 laporan akhir; sejak v8.0.0 JUGA sec.4.2 rute berkas->rak + sec.4.4
// gerbang re-deteksi sebelum edit pertama): laporan "divisi apa saja yang terkena" ke client harus lahir dari
// BERKAS NYATA yang dieksekusi, bukan tebakan dari kalimat client. Rantainya sudah ada semua -
// rakUntukBerkas(path) -> skill, registry -> divisi tiap skill; berkas ini cuma merangkainya jadi 1
// perintah (~100 token) supaya AI tak perlu membuka registry 20 KB untuk menjawabnya.
//
// BATAS JUJUR: rakUntukBerkas SENGAJA sempit - hanya bidang yang kerusakannya SENYAP (auth/bayar/DB/
// unggah/API/DevOps). Frontend & SEO sengaja TIDAK dipetakan (kerusakannya kelihatan di layar), jadi
// kerja tampilan murni akan menghasilkan daftar KOSONG. Itu disengaja, bukan bug: melebarkannya =
// menghidupkan lagi ritual "tiap divisi wajib bicara" yang ADR-023 cabut karena terukur merugikan.
export function divisiUntukBerkas(paths, entriRegistry = []) {
  const perSkill = new Map(entriRegistry.map((e) => [e.path, e]))
  const perDivisi = new Map() // divisi -> { rawan, berkas:Set, skill:Set }
  for (const p of Array.isArray(paths) ? paths : []) {
    for (const rak of rakUntukBerkas(p)) {
      const e = perSkill.get(rak)
      const divisi = (e && e.divisi) || '(tak terdaftar)'
      if (!perDivisi.has(divisi)) perDivisi.set(divisi, { rawan: false, berkas: new Set(), skill: new Set() })
      const d = perDivisi.get(divisi)
      if (e && e.rawan_keamanan === true) d.rawan = true
      d.berkas.add(String(p))
      d.skill.add(rak)
    }
  }
  // Urut: rawan dulu (yang perlu perhatian lebih diminta lebih dulu), lalu alfabet -> keluaran DETERMINISTIK.
  return [...perDivisi.entries()]
    .map(([divisi, d]) => ({ divisi, rawan: d.rawan, berkas: [...d.berkas].sort(), skill: [...d.skill].sort() }))
    .sort((a, b) => (b.rawan - a.rawan) || a.divisi.localeCompare(b.divisi))
}

export function formatDivisi(daftar) {
  if (!daftar.length) return PESAN_DIVISI_KOSONG
  const baris = daftar
    .map((d) => `${d.rawan ? '🔒 ' : ''}${d.divisi}: ${d.berkas.join(', ')}  (${d.skill.join(', ')})`)
  // Keluaran ini dibaca AI, lalu DICERITAKAN ke client dengan bahasanya sendiri. `stack` bukan profesi,
  // jadi tanpa catatan ini AI gampang memarafrasekan "divisi stack" - istilah yang tak berarti apa-apa
  // bagi client. Cuma muncul saat memang relevan (bukan hiasan tetap).
  if (daftar.some((d) => d.divisi === 'stack')) {
    baris.push('(stack = rak teknologi, bukan profesi — sebut bidang tugasnya saat menjelaskan ke client)')
  }
  return baris.join('\n')
}

// Ambil topik dari argumen; buang pasangan flag `--project-root <x>` bila terselip (tahan-banting -
// walau `rak` SENGAJA di luar shouldPassProjectRoot, jaga-jaga bila dipanggil manual dengan flag itu).
function ambilTopik(argv) {
  const sisa = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project-root') { i++; continue } // lewati flag + nilainya
    sisa.push(argv[i])
  }
  return sisa.join(' ').trim()
}

async function main() {
  const argv = process.argv.slice(2)
  // Mode `--divisi`: argumen sesudahnya = daftar path berkas yang diubah (bukan topik).
  if (argv[0] === '--divisi') {
    const paths = ambilTopik(argv.slice(1)).split(/\s+/).filter(Boolean)
    console.log(paths.length ? formatDivisi(divisiUntukBerkas(paths, muatRegistry([process.cwd()]))) : PESAN_DIVISI_KOSONG)
    process.exitCode = 0
    return
  }
  const topik = ambilTopik(argv)
  if (!topik) { console.log(PESAN_PAKAI); process.exitCode = 0; return }
  let teks = ''
  try { teks = await muatPetunjukRak(topik, process.cwd()) } catch { teks = '' }
  console.log(teks && teks.trim() ? teks.trim() : PESAN_KOSONG)
  process.exitCode = 0
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
