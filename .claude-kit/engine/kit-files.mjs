#!/usr/bin/env node
// engine/kit-files.mjs - Pembaca daftar-file kit (SSOT). v2.0.0: SSOT = engine/kit-files.json (kit 100%
// Node). Parser .psd1 DIPERTAHANKAN sebagai fallback dua-format (kit klien era-v1 saat doctor
// lintas-versi). Lihat readKitManifest.
//
// Kenapa parser `.psd1` masih ada: kit era-v1 memakai `lib/kit-files.psd1` sebagai SSOT (dibaca dulu
// oleh orkestrator PowerShell via `Import-PowerShellDataFile`). Di v2.0.0 SSOT pindah ke JSON, tapi
// parser ini DIPERTAHANKAN agar doctor v2 bisa membaca daftar file kit klien yang MASIH era-v1
// (jendela lintas-versi) + dipakai migrator kartu. Ia mem-parse subset data-file `.psd1` jadi objek
// JavaScript yang identik hasilnya dengan `Import-PowerShellDataFile`.
//
// Lingkup parser = subset DATA-FILE PowerShell (yang aman tanpa mengeksekusi PS): tabel
// `@{ ... }`, array `@( ... )`, string kutip-tunggal `'...'` (escape `''`) + kutip-ganda
// `"..."`, angka, `$true`/`$false`/`$null`, komentar `#` 1-baris + `<# ... #>` blok, dan
// pemisah baris/`;`/`,`. Sengaja TIDAK mendukung ekspresi/variabel/sub-ekspresi PS (itu butuh
// mesin PS) — kalau ketemu, parser MELEMPAR error yang jelas (gagal-nyaring, bukan diam-salah).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripBom } from './fs-text.mjs'

// Pecah teks .psd1 jadi token. SADAR-STRING: `#` / `@{` dst. DI DALAM string TIDAK ditafsir.
export function tokenizeKitFiles(text) {
  const toks = []
  let i = 0
  const n = text.length
  const push = (t, v) => toks.push(v === undefined ? { t } : { t, v })
  while (i < n) {
    const c = text[i]
    // Pemisah yang diabaikan: spasi, tab, CR, LF, dan `;` (PS pakai `;`/baris-baru antar-entri).
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === ';') { i++; continue }
    // Komentar baris `# ...`
    if (c === '#') { while (i < n && text[i] !== '\n') i++; continue }
    // Komentar blok `<# ... #>`
    if (c === '<' && text[i + 1] === '#') {
      i += 2
      while (i < n && !(text[i] === '#' && text[i + 1] === '>')) i++
      if (i >= n) throw new Error('komentar blok <# tidak ditutup dengan #>')
      i += 2
      continue
    }
    if (c === '@' && text[i + 1] === '{') { push('@{'); i += 2; continue }
    if (c === '@' && text[i + 1] === '(') { push('@('); i += 2; continue }
    if (c === '}') { push('}'); i++; continue }
    if (c === ')') { push(')'); i++; continue }
    if (c === '=') { push('='); i++; continue }
    if (c === ',') { push(','); i++; continue }
    // String kutip-tunggal: literal; `''` = satu tanda kutip.
    if (c === "'") {
      i++
      let s = ''
      let closed = false
      while (i < n) {
        if (text[i] === "'") {
          if (text[i + 1] === "'") { s += "'"; i += 2; continue }
          i++; closed = true; break
        }
        s += text[i]; i++
      }
      if (!closed) throw new Error("string kutip-tunggal tidak ditutup")
      push('str', s); continue
    }
    // String kutip-ganda: backtick = escape PS; `""` = satu tanda kutip ganda.
    if (c === '"') {
      i++
      let s = ''
      let closed = false
      while (i < n) {
        if (text[i] === '`' && i + 1 < n) { s += text[i + 1]; i += 2; continue }
        if (text[i] === '"') {
          if (text[i + 1] === '"') { s += '"'; i += 2; continue }
          i++; closed = true; break
        }
        s += text[i]; i++
      }
      if (!closed) throw new Error("string kutip-ganda tidak ditutup")
      push('str', s); continue
    }
    // $true / $false / $null (satu-satunya "variabel" yang sah di data-file)
    if (c === '$') {
      i++
      let id = ''
      while (i < n && /[A-Za-z]/.test(text[i])) { id += text[i]; i++ }
      const low = id.toLowerCase()
      if (low === 'true') push('val', true)
      else if (low === 'false') push('val', false)
      else if (low === 'null') push('val', null)
      else throw new Error(`variabel '$${id}' tak didukung (data-file hanya boleh $true/$false/$null)`)
      continue
    }
    // Angka (termasuk negatif/desimal)
    if (c === '-' || (c >= '0' && c <= '9')) {
      let num = c
      i++
      while (i < n && /[0-9.eE+-]/.test(text[i])) { num += text[i]; i++ }
      const v = Number(num)
      if (Number.isNaN(v)) throw new Error(`angka tak valid '${num}'`)
      push('num', v); continue
    }
    // Bareword (kunci tabel tak-berkutip, mis. core_prompts)
    if (/[A-Za-z_]/.test(c)) {
      let id = c
      i++
      while (i < n && /[A-Za-z0-9_]/.test(text[i])) { id += text[i]; i++ }
      push('ident', id); continue
    }
    throw new Error(`karakter tak dikenal '${c}' (kode ${c.charCodeAt(0)}) di posisi ${i}`)
  }
  return toks
}

// Bangun objek dari daftar token (rekursif: tabel @{} + array @() boleh bersarang).
export function parseKitFilesTokens(toks) {
  let p = 0
  const peek = () => toks[p]
  const next = () => toks[p++]
  const expect = (t) => {
    const tk = next()
    if (!tk || tk.t !== t) throw new Error(`harap '${t}' tapi dapat '${tk ? tk.t : 'akhir-berkas'}'`)
    return tk
  }

  function parseValue() {
    const tk = peek()
    if (!tk) throw new Error('nilai hilang (akhir-berkas)')
    if (tk.t === 'num' || tk.t === 'str' || tk.t === 'val') { next(); return tk.v }
    if (tk.t === '@{') return parseHashtable()
    if (tk.t === '@(') return parseArray()
    throw new Error(`nilai tak dikenal '${tk.t}'`)
  }

  function parseArray() {
    expect('@(')
    const arr = []
    while (peek() && peek().t !== ')') {
      if (peek().t === ',') { next(); continue } // toleransi koma pemisah
      arr.push(parseValue())
    }
    expect(')')
    return arr
  }

  function parseHashtable() {
    expect('@{')
    const obj = {}
    while (peek() && peek().t !== '}') {
      if (peek().t === ',') { next(); continue } // toleransi pemisah nyasar
      const keyTok = next()
      let key
      if (keyTok.t === 'ident') key = keyTok.v
      else if (keyTok.t === 'str') key = keyTok.v
      else if (keyTok.t === 'num') key = String(keyTok.v)
      else throw new Error(`kunci tabel tak valid '${keyTok.t}'`)
      // Cermin Import-PowerShellDataFile: kunci ganda DILARANG (PS melempar). Gagal-nyaring,
      // jangan diam-menimpa (kalau diam, daftar file bisa salah tanpa ketahuan).
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        throw new Error(`kunci ganda '${key}' tak diizinkan dalam tabel`)
      }
      expect('=')
      obj[key] = parseValue()
    }
    expect('}')
    return obj
  }

  // Lewati apa pun sebelum tabel utama @{ (mis. blok komentar sudah dibuang tokenizer).
  while (peek() && peek().t !== '@{') next()
  if (!peek()) throw new Error('tidak menemukan tabel @{ ... } di berkas')
  const result = parseHashtable()
  // Cermin data-file PS: setelah tabel utama tak boleh ada isi lain (gagal-nyaring).
  if (peek()) throw new Error(`token berlebih setelah tabel utama ('${peek().t}')`)
  return result
}

// Parse string .psd1 -> objek. Buang BOM. Lempar pesan jelas kalau sintaks tak didukung.
export function parseKitFilesPsd1(text, label = '<psd1>') {
  const t = stripBom(text) // buang BOM
  try {
    return parseKitFilesTokens(tokenizeKitFiles(t))
  } catch (e) {
    throw new Error(`kit-files: gagal baca '${label}' (${e.message}). Cek sintaks .psd1 (subset data-file).`)
  }
}

// Baca berkas daftar-file kit -> objek. DUA-FORMAT (v2.0.0, D1):
//   - `.json` = SSOT baru (kit 100% Node). JSON.parse (buang BOM dulu).
//   - `.psd1` = format LAMA (kit era-v1). parseKitFilesPsd1 DIPERTAHANKAN untuk membaca kit
//     klien lama saat doctor lintas-versi.
// Lempar kalau tak ada / rusak (gagal-nyaring, bukan diam-salah).
export function readKitFiles(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`kit-files: berkas tidak ditemukan: '${filePath}'`)
  const raw = fs.readFileSync(filePath, 'utf8')
  if (filePath.toLowerCase().endsWith('.json')) {
    try {
      return JSON.parse(stripBom(raw))
    } catch (e) {
      throw new Error(`kit-files: gagal baca '${filePath}' (${e.message}). Cek sintaks JSON.`)
    }
  }
  return parseKitFilesPsd1(raw, filePath)
}

// Resolver manifest dua-format untuk sebuah kit-dir. Prefer engine/kit-files.json (SSOT v2); fallback
// lib/kit-files.psd1 (kit era-v1 klien). Return { data, format, path } atau null kalau dua-duanya
// tak ada. `format` = 'json' | 'psd1-legacy'. Inilah penutup jebakan doctor lintas-versi (§2.3):
// doctor v2 atas kit v1 TETAP bisa membaca daftar (via fallback .psd1) -> INFO lunak, BUKAN ERROR.
export function readKitManifest(kitDir) {
  // v3 (ADR-027): SSOT pindah ke engine/kit-files.json. Urutan coba: engine/json (v3) -> lib/json
  // (client v2 belum migrasi) -> lib/kit-files.psd1 (kit era-v1). Fallback lib/ WAJIB tetap ada supaya
  // v3 doctor bisa membaca client yang belum di-rename (migrasi struktur client = Task 14 update-client).
  const enginePath = path.join(kitDir, 'engine', 'kit-files.json')
  const jsonPath = path.join(kitDir, 'lib', 'kit-files.json')
  const psd1Path = path.join(kitDir, 'lib', 'kit-files.psd1')
  if (fs.existsSync(enginePath)) {
    return { data: readKitFiles(enginePath), format: 'json', path: enginePath }
  }
  if (fs.existsSync(jsonPath)) {
    return { data: readKitFiles(jsonPath), format: 'json', path: jsonPath }
  }
  if (fs.existsSync(psd1Path)) {
    return { data: readKitFiles(psd1Path), format: 'psd1-legacy', path: psd1Path }
  }
  return null
}

// Gabung daftar "file wajib ada" persis seperti verifikasi setup-pola-b.mjs ($wajibAda): 10 grup,
// urutan SAMA. Path dikembalikan apa adanya (forward-slash seperti di .psd1) — pemanggil
// yang menormalkan separator sesuai kebutuhan (PS pakai backslash; Node lintas-platform).
// Grup 'rules' (eks 'workflows', ADR-027; rak rujukan on-demand) aman untuk kit lama: grup tak ada -> dilewati.
export const REQUIRED_GROUPS = [
  'core_prompts',
  'universal_rules',
  'rules',
  'scripts',
  'lib_files',
  'templates',
  'docs',
  'tests',
  'ci',
  'meta',
]
export function getRequiredKitFiles(kitFiles) {
  const out = []
  for (const g of REQUIRED_GROUPS) {
    const v = kitFiles[g]
    if (Array.isArray(v)) out.push(...v)
  }
  return out
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const target = process.argv[2]
  if (!target) { console.error('Pakai: node engine/kit-files.mjs <kit-files.psd1> [--required|--canonical]'); process.exit(2) }
  try {
    const data = readKitFiles(target)
    const mode = process.argv[3]
    if (mode === '--required') {
      console.log(getRequiredKitFiles(data).join('\n'))
    } else if (mode === '--canonical') {
      // Output deterministik untuk uji-banding vs Import-PowerShellDataFile (kunci diurut).
      const lines = Object.keys(data).sort().map((k) => {
        const v = data[k]
        return `${k}=${Array.isArray(v) ? v.join(',') : v}`
      })
      console.log(lines.join('\n'))
    } else {
      console.log(JSON.stringify(data, null, 2))
    }
  } catch (e) {
    console.error(e.message); process.exit(1)
  }
}
