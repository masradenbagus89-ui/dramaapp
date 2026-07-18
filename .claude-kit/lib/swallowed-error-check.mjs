#!/usr/bin/env node
// lib/swallowed-error-check.mjs - Robot "Error-ditelan-diam" (deterministik, ~0 token AI, CUMA-BACA).
//
// APA INI: memindai berkas kode (JS/TS + Python) untuk blok PENANGKAP-ERROR yang KOSONG - yaitu
// `try/catch` (atau `.catch(...)`, atau `except:` Python) yang MENELAN error tanpa berbuat apa pun
// dan tanpa komentar-alasan. Pola ini menyembunyikan kegagalan: program tampak "jalan" padahal ada
// error yang ditelan diam-diam (kayak alarm rumah yang dimatikan tanpa dicatat kenapa). Standar
// industri sejati: ESLint `no-empty` (bagian dari eslint:recommended) + Go `errcheck` menegakkan hal
// yang sama. Adaptasi ide dari willey-labs/agent-skills (MIT) - ditulis ulang untuk Node + Bahasa
// Indonesia non-programmer (docs/plans/WILLEY_BORROW_IMPLEMENTASI.md Item #1).
//
// JALAN-KELUAR SAH (cermin desain ESLint no-empty): kalau pengabaian memang DISENGAJA, tulis
// KOMENTAR-ALASAN DI DALAM blok -> blok dianggap "tak kosong" -> LOLOS. Robot jalan di TEKS MENTAH
// (komentar TIDAK dibuang) supaya jalan-keluar ini bekerja.
//
// DIPANGGIL DARI: (a) `npx lintasai swallowed-check` (dispatcher COMMANDS_NODE) untuk pindai manual;
// (b) tests/preflight.mjs sebagai pemeriksa MODE-PERINGATAN (level RAPIKAN, TAK memblokir gerbang -
// mutu-kode itu bisa-dibalik + robot baru belum punya angka laju-alarm-palsu, jadi jangan naikkan jadi
// pemblokir-keras dulu). Mengembalikan DATA (findings) supaya mudah diuji + dipakai ulang; main() mencetak.
//
// KEAMANAN (CUMA-BACA, sec. 8.1): hanya MEMBACA berkas + menghitung pola. Tidak menulis/mengubah berkas,
// tidak menjalankan kode yang dipindai, tidak mengirim apa pun ke jaringan. Laporan cuma menyebut
// LOKASI (berkas:baris) + jenis pola - bukan isi rahasia.
//
// REUSE (anti-duplikasi sec. 5): readTextSafe (fs-text.mjs) untuk baca berkas ber-BOM Windows. Pola
// penjelajah-berkas + guard isMain meniru lib/unicode-safety-check.mjs (robot sejenis yang sudah teruji).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readTextSafe } from './fs-text.mjs'

// Ekstensi kode yang diperiksa. Stack tim = Next.js/React/TypeScript + kadang Python (profil tim).
const CODE_EXTS = new Set(['.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx', '.mts', '.cts', '.py'])

// Fragmen path yang DILEWATI (case-insensitive, dipisah backslash). Filter alarm-palsu WAJIB: berkas
// hasil-build/dependency/cadangan bukan kode yang kita tulis -> jangan dipindai. (Berkas TES dilewati
// terpisah lewat isTestFile karena polanya berbasis NAMA, bukan folder.)
const SKIP_FRAGMENTS = [
  '\\node_modules\\', '\\.git\\', '\\.next\\', '\\dist\\', '\\build\\', '\\out\\',
  '\\coverage\\', '\\vendor\\', '\\.venv\\', '\\venv\\', '\\__pycache__\\',
  '\\.backup-', '\\.claude-kit\\',
]

// Berkas TES/contoh dilewati: fixtures tes SENGAJA berisi pola "buruk" untuk menguji -> memindainya =
// alarm-palsu. Konvensi: *.test.* / *.spec.* (JS), test_*.py / *_test.py (Python), *.min.js, *.d.ts.
export function isTestFile(name) {
  const b = name.toLowerCase()
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(b)) return true
  if (/(^|[\\/])test_[^\\/]*\.py$/.test(b) || /_test\.py$/.test(b)) return true
  if (/\.min\.js$/.test(b) || /\.d\.ts$/.test(b)) return true
  return false
}

// ---------------------------------------------------------------------------
// Penyamar (masker): kunci anti-alarm-palsu. Mengembalikan string PANJANG-SAMA dengan input, di mana:
//   - ISI STRING-LITERAL diganti SPASI  -> pola "catch {}" DI DALAM string tak ikut memicu (spasi polos).
//   - ISI KOMENTAR diganti 'x' (non-spasi) -> dua tujuan sekaligus:
//       (a) komentar-alasan DI DALAM `catch { ... }` bikin blok jadi "tak kosong" (`{ xxx }`) -> LOLOS.
//       (b) pola "catch {}" yang kebetulan ada DI DALAM komentar jadi 'xxxx' -> tak memicu.
//   - Pembatas (kutip, //, /* */, #) + newline DIPERTAHANKAN -> nomor baris/kolom tetap akurat.
// Asimetri spasi-vs-'x' inilah yang membuat "komentar = jalan-keluar sah" bekerja benar.
// ---------------------------------------------------------------------------

// Penyamar untuk keluarga brace (JS/TS/JSX). Menangani string ' " `, komentar // dan /* */, escape \.
// Catatan batas (didokumentasikan, bukan bug): regex-literal JS (mis. /foo/) TIDAK diurai khusus - kasus
// langka /catch {}/ di dalam regex-literal bisa memicu. Untuk pemeriksa PERINGATAN (RAPIKAN) ini diterima.
export function maskJs(code) {
  const s = String(code)
  const out = s.split('')
  const n = s.length
  let i = 0
  const NONE = 0; const LINE = 1; const BLOCK = 2; const STR = 3
  let state = NONE
  let quote = ''
  while (i < n) {
    const c = s[i]
    const c2 = i + 1 < n ? s[i + 1] : ''
    if (state === NONE) {
      if (c === '/' && c2 === '/') { state = LINE; i += 2; continue }       // // ... (pembatas dipertahankan)
      if (c === '/' && c2 === '*') { state = BLOCK; i += 2; continue }       // /* ... */
      if (c === '"' || c === "'" || c === '`') { state = STR; quote = c; i++; continue } // kutip dipertahankan
      i++; continue
    }
    if (state === LINE) {
      if (c === '\n') { state = NONE; i++; continue }
      out[i] = 'x'; i++; continue
    }
    if (state === BLOCK) {
      if (c === '*' && c2 === '/') { state = NONE; i += 2; continue }        // */ dipertahankan
      if (c !== '\n') out[i] = 'x'
      i++; continue
    }
    // state === STR
    if (c === '\\') { // escape: netralkan 2 karakter (jaga newline)
      if (c !== '\n') out[i] = ' '
      if (i + 1 < n && s[i + 1] !== '\n') out[i + 1] = ' '
      i += 2; continue
    }
    if (c === quote) { state = NONE; quote = ''; i++; continue }             // kutip penutup dipertahankan
    // Kutip ' dan " TAK BOLEH lintas-baris di JS (baris-baru mentah = string sudah berakhir / sintaks
    // salah). Reset di newline -> membatasi "kekacauan" dari kutip DI DALAM regex-literal (yang tak
    // diurai khusus, mis. /it's/ atau /path"x/) HANYA ke baris itu, bukan menular ke baris berikutnya
    // (mencegah alarm-palsu + luput lintas-baris; temuan verifikasi adversarial 2026-07-08). Template `
    // memang boleh lintas-baris -> tak di-reset. Escape `\<newline>` (sambung baris) sudah ditangani di atas.
    if (c === '\n' && quote !== '`') { state = NONE; quote = ''; i++; continue } // newline dipertahankan apa adanya
    if (c !== '\n') out[i] = ' '
    i++
  }
  return out.join('')
}

// Penyamar untuk Python. Menangani string ' " serta triple ''' """, komentar #, escape \.
export function maskPy(code) {
  const s = String(code)
  const out = s.split('')
  const n = s.length
  let i = 0
  const NONE = 0; const HASH = 1; const STR = 2
  let state = NONE
  let delim = ''
  while (i < n) {
    const c = s[i]
    if (state === NONE) {
      if (c === '#') { state = HASH; i++; continue }                        // # dipertahankan
      if (c === '"' || c === "'") {
        const triple = s.slice(i, i + 3)
        if (triple === '"""' || triple === "'''") { delim = triple; state = STR; i += 3; continue }
        delim = c; state = STR; i++; continue
      }
      i++; continue
    }
    if (state === HASH) {
      if (c === '\n') { state = NONE; i++; continue }
      out[i] = 'x'; i++; continue
    }
    // state === STR
    if (c === '\\') {
      if (c !== '\n') out[i] = ' '
      if (i + 1 < n && s[i + 1] !== '\n') out[i + 1] = ' '
      i += 2; continue
    }
    if (delim.length === 3) {
      if (s.slice(i, i + 3) === delim) { state = NONE; delim = ''; i += 3; continue }
      if (c !== '\n') out[i] = ' '
      i++; continue
    }
    if (c === delim) { state = NONE; delim = ''; i++; continue }
    if (c === '\n') { state = NONE; delim = ''; i++; continue }             // string 1-baris tak-tertutup: aman berhenti di newline
    out[i] = ' '
    i++
  }
  return out.join('')
}

// ---------------------------------------------------------------------------
// Pendeteksi (dijalankan di TEKS TER-SAMAR)
// ---------------------------------------------------------------------------

// Ubah indeks karakter -> {line, col} (1-berbasis). Panjang teks-tersamar = teks asli, jadi indeks cocok.
function posToLineCol(text, idx) {
  let line = 1
  let last = -1
  for (let i = 0; i < idx; i++) {
    if (text[i] === '\n') { line++; last = i }
  }
  return { line, col: idx - last }
}

// `catch {}` / `catch (e) {}` kosong (binding opsional; blok hanya whitespace, boleh lintas-baris).
// Lookbehind (?<=\}\s*) MENSYARATKAN ada `}` (penutup blok `try`) tepat sebelum `catch`. Ini menjaga
// DUA hal sekaligus: (1) BUKAN method `.catch(...)` (didahului titik/`)`, bukan `}`) - itu tugas
// RX_EMPTY_CATCH_HANDLER; (2) BUKAN method/properti BERNAMA `catch` (mis. `const o = { catch() {} }` /
// `class T { catch(fn) {} }`) yang didahului `{`/`,`/`;` - bukan `}` (temuan verifikasi adversarial
// 2026-07-08). SOUND: `try/catch` ASLI SELALU punya `}` penutup blok try tepat sebelum `catch`, jadi
// syarat ini tak menimbulkan luput baru pada try/catch sungguhan. Sisa langka (method KOSONG bernama
// `catch` yang kebetulan tepat setelah `}` method lain) didokumentasikan di docs/swallowed-error-check.md.
const RX_EMPTY_CATCH = /(?<=\}\s*)catch\b\s*(?:\([^)]*\))?\s*\{\s*\}/g
// `.catch(() => {})` / `.catch(e => {})` / `.catch(function (e) {})` dengan blok KOSONG.
const RX_EMPTY_CATCH_HANDLER = /\.catch\s*\(\s*(?:async\s+)?(?:function\b[^{;()]*\([^)]*\)|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)\s*\{\s*\}\s*\)/g

function scanJs(masked, relPath, findings) {
  for (const [rx, kind] of [[RX_EMPTY_CATCH, 'catch-kosong'], [RX_EMPTY_CATCH_HANDLER, '.catch()-kosong']]) {
    rx.lastIndex = 0
    let m
    while ((m = rx.exec(masked)) !== null) {
      const { line, col } = posToLineCol(masked, m.index)
      findings.push({ File: relPath, Line: line, Col: col, Kind: kind })
      if (m.index === rx.lastIndex) rx.lastIndex++ // jaga-jaga match panjang-0 (tak seharusnya terjadi)
    }
  }
}

// Python. Inline: `except ...: pass|...` TANPA komentar-alasan setelahnya (komentar sudah jadi 'xxx' oleh
// masker -> baris tak berakhir tepat di pass -> LOLOS). Multi-baris: header `except ...:` yang badannya
// HANYA satu `pass`/`...` (baris berikut dedent/EOF). Kalau ada statement lain di badan -> ada penanganan
// -> JANGAN tandai (kurangi alarm-palsu; RAPIKAN condong konservatif).
const RX_PY_INLINE = /^\s*except\b[^:\n]*:[ \t]*(?:pass|\.\.\.)[ \t]*$/
const RX_PY_HEADER = /^(\s*)except\b[^:\n]*:[ \t]*$/
const RX_PY_BODY_ONLY = /^(\s+)(?:pass|\.\.\.)[ \t]*$/

function scanPy(masked, relPath, findings) {
  const lines = masked.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (RX_PY_INLINE.test(line)) {
      findings.push({ File: relPath, Line: i + 1, Col: line.length - line.trimStart().length + 1, Kind: 'except-pass' })
      continue
    }
    const hm = RX_PY_HEADER.exec(line)
    if (!hm) continue
    const headerIndent = hm[1].length
    // Cari baris badan pertama yang tak kosong.
    let j = i + 1
    while (j < lines.length && lines[j].trim() === '') j++
    if (j >= lines.length) continue
    const bm = RX_PY_BODY_ONLY.exec(lines[j])
    if (!bm || bm[1].length <= headerIndent) continue // bukan `pass`/`...` polos di dalam blok
    // Pastikan badan HANYA berisi pass itu: baris tak-kosong berikutnya harus dedent (keluar blok) / EOF.
    let k = j + 1
    while (k < lines.length && lines[k].trim() === '') k++
    if (k < lines.length && (lines[k].length - lines[k].trimStart().length) > headerIndent) continue // ada statement lain
    findings.push({ File: relPath, Line: j + 1, Col: bm[1].length + 1, Kind: 'except-pass' })
  }
}

// findSwallowedErrors: teks 1 berkas -> daftar temuan {File,Line,Col,Kind}. Fungsi MURNI (mudah diuji).
export function findSwallowedErrors(content, relPath = '<string>') {
  const findings = []
  if (content == null || content === '') return findings
  const isPy = /\.py$/i.test(relPath)
  if (isPy) scanPy(maskPy(content), relPath, findings)
  else scanJs(maskJs(content), relPath, findings)
  // Dedupe pengaman: buang temuan yang PERSIS sama (baris+kolom+jenis) supaya 1 lokasi tak terhitung
  // dobel kalau dua pendeteksi kebetulan tumpang-tindih. Urutan pertama-ditemukan dipertahankan.
  const seen = new Set()
  return findings.filter((f) => {
    const key = `${f.Line}:${f.Col}:${f.Kind}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ---------------------------------------------------------------------------
// Penjelajah berkas + orkestrasi
// ---------------------------------------------------------------------------

function shouldSkipPath(full) {
  const norm = full.replace(/\//g, '\\').toLowerCase()
  return SKIP_FRAGMENTS.some((frag) => norm.includes(frag))
}

// listCodeFiles: kumpulkan berkas kode di bawah root (rekursif), lewati folder-skip + berkas tes.
export function listCodeFiles(root) {
  const out = []
  const walk = (dir) => {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return } // folder tak terbaca -> lewati
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (shouldSkipPath(full)) continue
      if (e.isDirectory()) walk(full)
      else if (CODE_EXTS.has(path.extname(e.name).toLowerCase()) && !isTestFile(e.name)) out.push(full)
    }
  }
  walk(root)
  return out
}

// scanSwallowed: daftar path (berkas ATAU folder) -> semua temuan + jumlah berkas yang benar-benar dibaca.
export function scanSwallowed(paths) {
  const targets = []
  for (const p of paths) {
    try {
      const st = fs.statSync(p)
      if (st.isDirectory()) targets.push(...listCodeFiles(p))
      else if (CODE_EXTS.has(path.extname(p).toLowerCase())) targets.push(p) // berkas eksplisit: tak disaring isTestFile
    } catch { /* path tak ada -> lewati */ }
  }
  const findings = []
  for (const f of targets) {
    const text = readTextSafe(f)
    if (text == null) continue
    findings.push(...findSwallowedErrors(text, f))
  }
  return { findings, scanned: targets.length }
}

// runSwallowedErrorCheck: orkestrasi 1 root -> { findings, scanned, summary:{ total } }.
export function runSwallowedErrorCheck(root, opts = {}) {
  const paths = Array.isArray(opts.paths) && opts.paths.length ? opts.paths : [root]
  const { findings, scanned } = scanSwallowed(paths)
  return { findings, scanned, summary: { total: findings.length } }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  let root = process.cwd()
  const paths = []
  let json = false
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i]
    if (t === '--project-root' || t === '--projectroot' || t === '--repo-root') root = argv[++i] || root
    else if (t === '--json') json = true
    else if (!t.startsWith('--')) paths.push(t)
  }
  return { root, paths, json }
}

function main() {
  const { root, paths, json } = parseArgs(process.argv.slice(2))
  const { findings, scanned } = runSwallowedErrorCheck(root, { paths: paths.length ? paths : undefined })
  if (json) {
    process.stdout.write(JSON.stringify(findings, null, 2))
  } else if (findings.length === 0) {
    console.log(`BERSIH: ${scanned} berkas kode dipindai - 0 blok penangkap-error kosong.`)
  } else {
    console.log(`${findings.length} blok penangkap-error kosong (menelan error tanpa pesan) di ${scanned} berkas:`)
    for (const f of findings) console.log(`  [ISI-ALASAN] ${f.File}:${f.Line}:${f.Col}  ${f.Kind}`)
    console.log('Kalau memang sengaja diabaikan, tulis alasannya sebagai komentar DI DALAM blok supaya lolos.')
  }
  // exit = jumlah temuan (0 = bersih). process.exitCode (bukan process.exit) supaya stdout selesai
  // di-flush saat di-pipa (cermin pola robot lain: unicode/env-keys).
  process.exitCode = findings.length
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
