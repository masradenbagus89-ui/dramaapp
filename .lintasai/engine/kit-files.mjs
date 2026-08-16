#!/usr/bin/env node
// engine/kit-files.mjs - Pembaca daftar-file kit. Acuan = engine/kit-files.json (kit 100% Node).
// Lihat readKitManifest.
import fs from 'node:fs'
import path from 'node:path'
import { stripBom } from './fs-text.mjs'

// Baca berkas daftar-file kit -> objek. Format = JSON (kit 100% Node). JSON.parse (buang BOM dulu).
// Lempar kalau tak ada / rusak / bukan .json (gagal-nyaring, bukan diam-salah).
export function readKitFiles(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`kit-files: berkas tidak ditemukan: '${filePath}'`)
  const raw = fs.readFileSync(filePath, 'utf8')
  if (!filePath.toLowerCase().endsWith('.json')) {
    throw new Error(`kit-files: format tak didukung '${filePath}' (hanya .json).`)
  }
  try {
    return JSON.parse(stripBom(raw))
  } catch (e) {
    throw new Error(`kit-files: gagal baca '${filePath}' (${e.message}). Cek sintaks JSON.`)
  }
}

// Resolver manifest untuk sebuah kit-dir. Prefer engine/kit-files.json (acuan v3); fallback
// lib/kit-files.json (client v2 belum migrasi struktur). Return { data, format, path } atau null kalau
// dua-duanya tak ada. `format` = 'json'.
export function readKitManifest(kitDir) {
  // v3 (ADR-027): acuan pindah ke engine/kit-files.json. Urutan coba: engine/json (v3) -> lib/json
  // (client v2 belum migrasi). Fallback lib/ WAJIB tetap ada supaya v3 doctor bisa membaca client yang
  // belum di-rename (struktur client lama, pra-v3).
  const enginePath = path.join(kitDir, 'engine', 'kit-files.json')
  const jsonPath = path.join(kitDir, 'lib', 'kit-files.json')
  if (fs.existsSync(enginePath)) {
    return { data: readKitFiles(enginePath), format: 'json', path: enginePath }
  }
  if (fs.existsSync(jsonPath)) {
    return { data: readKitFiles(jsonPath), format: 'json', path: jsonPath }
  }
  return null
}

// Gabung daftar "file wajib ada" persis seperti verifikasi setup-pola-b.mjs: 9 grup, urutan SAMA.
// Path dikembalikan apa adanya (forward-slash) — pemanggil yang menormalkan separator sesuai kebutuhan.
// Grup tak ada di manifest -> dilewati (aman untuk kit lama yang masih punya grup 'rules' pra-ADR-034).
// Grup 'docs' & 'tests' SENGAJA ADA tapi KOSONG: docs/ dicabut dari distribusi client (v4.0.0) dan tes
// internal tak dikirim. Kuncinya DIPERTAHANKAN (bukan dihapus) karena tests/kit-files.test.mjs mewajibkan
// tiap REQUIRED_GROUPS berupa array -> menghapusnya = ubah 3 berkas + 1 tes demi nol manfaat.
export const REQUIRED_GROUPS = [
  'core_prompts',
  'universal_rules',
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

// (Blok CLI uji-banding `if (isMain)` DICABUT v8.0.0 — modul ini murni pustaka impor.)
