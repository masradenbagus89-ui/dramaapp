#!/usr/bin/env node
// engine/locked-phrase-list.mjs - Daftar Frasa Terkunci: apa saja di berkas aturan yang DIKUNCI tes.
//
// KENAPA ADA: 2026-07-18, saat memadatkan CLAUDE_universal_v1.md (§4.18 Compaction), frasa harfiah
// "Pengecualian 8 skill divisi WAJIB" ikut terhapus - ternyata tests/skills-divisi.test.mjs
// mengunci frasa itu persis. Baru ketahuan setelah tes merah, harus dibongkar-pasang lagi. Ada 26
// berkas tes yang mengunci frasa di berkas aturan, dan TAK ADA satu pun cara melihat daftarnya
// SEBELUM mengedit. Alat ini mengubah "kejutan setelah merah" jadi "peta sebelum berangkat".
//
// BUKAN PEMERIKSA: tak ada vonis, tak ada GENTING/PENTING/RAPIKAN, TIDAK ikut preflight, tak pernah
// memblokir apa pun. Ia mencetak DAFTAR untuk dibaca manusia/AI sebelum menyunting berkas aturan.
//
// ==> BATAS JUJUR (baca sebelum percaya) <==
// Ekstraksi ini HEURISTIK: ia membaca literal regex dan string di dalam panggilan `assert.*`. Assert
// yang merakit polanya secara dinamis (variabel, template string, pola yang disusun saat jalan) TIDAK
// akan muncul di sini. Artinya: daftar KOSONG bukan berarti aman mengedit; daftar ini mempersempit
// ranjau, tidak menjaminnya nol. Satu-satunya bukti tetap `npm test` setelah mengedit.
//
// CLI: node engine/locked-phrase-list.mjs [--file <berkas-aturan>] [--json]
//      npx lintasai locked-phrases
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readTextSafe, isDir } from './fs-text.mjs'

export const BERKAS_ATURAN_DEFAULT = 'CLAUDE_universal_v1.md'

// Literal regex di dalam baris assert, mis. assert.match(teks, /### 6\.4 Buku Pelajaran/)
const REGEX_LITERAL_RE = /\/((?:[^/\\\n[]|\\.|\[(?:[^\]\\]|\\.)*\])+)\/[gimsuy]*/g
// String literal di dalam .includes('...') / .includes("...")
const INCLUDES_RE = /\.includes\(\s*(['"])((?:\\.|(?!\1).)+)\1\s*\)/g
// Baris yang benar-benar meng-assert (bukan komentar penjelasan).
const BARIS_ASSERT_RE = /^\s*assert\b/

// Apakah baris ini komentar? (komentar sering memuat contoh regex yang bukan kuncian nyata)
function komentar(baris) {
  return /^\s*(\/\/|\*|\/\*)/.test(baris)
}

// INTI PURE: dari isi satu berkas tes -> daftar frasa yang ia kunci.
// `namaBerkasAturan` dipakai sebagai saringan relevansi: tes yang tak menyentuh berkas aturan dilewati.
export function extractLockedPhrases(teksTes, namaBerkasAturan = BERKAS_ATURAN_DEFAULT) {
  if (!String(teksTes || '').includes(namaBerkasAturan)) return []
  const out = []
  const lines = String(teksTes).split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const baris = lines[i]
    if (komentar(baris) || !BARIS_ASSERT_RE.test(baris)) continue
    for (const m of baris.matchAll(REGEX_LITERAL_RE)) {
      const pola = m[1].trim()
      if (pola.length >= 4) out.push({ jenis: 'pola', teks: pola, line: i + 1 })
    }
    for (const m of baris.matchAll(INCLUDES_RE)) {
      const teks = m[2].trim()
      if (teks.length >= 4) out.push({ jenis: 'harfiah', teks, line: i + 1 })
    }
  }
  return out
}

// Pembungkus disk: sapu tests/ lalu kelompokkan per berkas tes.
export function runLockedPhraseList({ repoRoot, berkasAturan = BERKAS_ATURAN_DEFAULT } = {}) {
  const root = path.resolve(repoRoot || process.cwd())
  const testsDir = path.join(root, 'tests')
  if (!isDir(testsDir)) return { present: false, berkasAturan, grup: [], total: 0 }

  const grup = []
  let total = 0
  for (const nama of fs.readdirSync(testsDir).sort()) {
    if (!/\.(test\.)?mjs$/.test(nama)) continue
    const teks = readTextSafe(path.join(testsDir, nama))
    if (!teks) continue
    const frasa = extractLockedPhrases(teks, berkasAturan)
    if (frasa.length === 0) continue
    grup.push({ tes: `tests/${nama}`, frasa })
    total += frasa.length
  }
  return { present: true, berkasAturan, grup, total }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const args = process.argv.slice(2)
  const get = (f) => { const i = args.indexOf(f); return i >= 0 && i + 1 < args.length ? args[i + 1] : null }
  const r = runLockedPhraseList({ repoRoot: process.cwd(), berkasAturan: get('--file') || BERKAS_ATURAN_DEFAULT })

  if (args.includes('--json')) {
    console.log(JSON.stringify(r, null, 2))
  } else if (!r.present) {
    console.log('[info] folder tests/ tak ketemu - dilewati.')
  } else {
    console.log(`Frasa terkunci di ${r.berkasAturan} — ${r.total} kuncian dari ${r.grup.length} berkas tes.`)
    console.log('Jangan hapus/ubah teks ini saat memadatkan aturan (§4.18) tanpa ikut memperbarui tesnya.\n')
    for (const g of r.grup) {
      console.log(`${g.tes}`)
      for (const f of g.frasa) console.log(`   [${f.jenis}] ${f.teks}`)
      console.log('')
    }
    console.log('BATAS: daftar ini HEURISTIK - assert yang merakit polanya secara dinamis tak terbaca.')
    console.log('Daftar kosong BUKAN berarti aman. Bukti sesungguhnya tetap `npm test` setelah mengedit.')
  }
}
