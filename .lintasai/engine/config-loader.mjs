#!/usr/bin/env node
// engine/config-loader.mjs - Pembaca config JSON-berkomentar (JSONC) untuk Node.
//
// KENAPA JSONC (bukan JSON polos): config kit/staff perlu KOMENTAR — staff non-programmer membaca
// penjelasan tiap kolom langsung di berkasnya. JSON.parse standar tersedak `//` dan `/* */`, jadi
// modul ini membersihkannya dulu. (Format ini menggantikan `.psd1` era-PowerShell; migrasinya sudah
// TUNTAS sejak v2.0.0 — kit kini 100% Node dan tak ada lagi pembaca .psd1 di mana pun.)
//
// Penghapus komentar SADAR-STRING: `//` atau `/*` DI DALAM string TIDAK dipotong (mis. URL
// "https://x" atau Pattern regex). Trailing-comma juga sadar-string. Lalu JSON.parse standar.
import fs from 'node:fs'
import { stripBom } from './fs-text.mjs'

// Buang komentar // dan /* */ TANPA menyentuh isi string (jejak quote + escape).
export function stripJsonComments(text) {
  let out = ''
  let i = 0
  const n = text.length
  let inStr = false
  while (i < n) {
    const c = text[i]
    const c2 = i + 1 < n ? text[i + 1] : ''
    if (inStr) {
      out += c
      if (c === '\\') { out += c2; i += 2; continue } // escape: salin pasangannya apa adanya
      if (c === '"') inStr = false
      i++
      continue
    }
    if (c === '"') { inStr = true; out += c; i++; continue }
    if (c === '/' && c2 === '/') { i += 2; while (i < n && text[i] !== '\n') i++; continue }
    if (c === '/' && c2 === '*') { i += 2; while (i < n && !(text[i] === '*' && (i + 1 < n ? text[i + 1] : '') === '/')) i++; i += 2; continue }
    out += c
    i++
  }
  return out
}

// Buang koma-ekor sebelum } atau ] (sadar-string). Dipanggil SETELAH stripJsonComments.
export function stripTrailingCommas(text) {
  let out = ''
  let i = 0
  const n = text.length
  let inStr = false
  while (i < n) {
    const c = text[i]
    const c2 = i + 1 < n ? text[i + 1] : ''
    if (inStr) {
      out += c
      if (c === '\\') { out += c2; i += 2; continue }
      if (c === '"') inStr = false
      i++
      continue
    }
    if (c === '"') { inStr = true; out += c; i++; continue }
    if (c === ',') {
      let j = i + 1
      while (j < n && /\s/.test(text[j])) j++
      if (j < n && (text[j] === '}' || text[j] === ']')) { i++; continue } // drop koma-ekor
    }
    out += c
    i++
  }
  return out
}

// Parse string JSONC -> object. Throw dengan pesan jelas kalau JSON rusak.
export function parseJsonc(text, label = '<jsonc>') {
  const t = stripBom(text) // buang BOM
  const cleaned = stripTrailingCommas(stripJsonComments(t))
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    throw new Error(`config-loader: JSON rusak di '${label}' (${e.message}). Perbaiki sintaks atau hapus berkas lalu buat ulang.`)
  }
}

// Baca berkas .jsonc/.json -> object. Throw kalau tak ada / rusak.
export function readLintasConfig(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`config-loader: berkas tidak ditemukan: '${filePath}'`)
  const raw = fs.readFileSync(filePath, 'utf8')
  return parseJsonc(raw, filePath)
}

// (Blok CLI uji-banding `if (isMain)` DICABUT v8.0.0 — modul ini murni pustaka impor.)
