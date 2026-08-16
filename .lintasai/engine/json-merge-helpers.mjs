#!/usr/bin/env node
// engine/json-merge-helpers.mjs - Penggabung daftar-izin Claude Code (.claude/settings.local.json).
//
// ADR-004: pemasang (setup-pola-b.mjs) + update-kit.mjs menggabungkan daftar-izin (permissions.allow)
// bawaan kit ke settings.local.json project, sambil menjaga kunci lain milik user (permissions.deny,
// env, apiKeyHelper, dst.).
//
// SIFAT NON-PERUSAK: menggabungkan daftar-izin tanpa membuang kunci milik user. Berkas ini TAK
// ber-tanda-tangan, jadi gaya-tulisan (indentasi, CRLF vs LF) = KOSMETIK + tak berdampak fungsional
// (Claude Code membaca permissions.allow sebagai himpunan, bukan urut byte).
//
// NILAI entri allow sengaja CASE-SENSITIVE: "Bash(X)" != "bash(x)".
// NAMA KUNCI (permissions/allow) dicocokkan CASE-INSENSITIVE
// lewat getPropCI -> kalau user menulis "Permissions" (P besar), tetap dikenali + digabung ke kunci itu
// (bukan bikin kunci "permissions" huruf-kecil duplikat).
import fs from 'node:fs'
import path from 'node:path'
import { stripBom, backupStamp } from './fs-text.mjs'

// Ambang peringatan-lunak daftar-izin (bukan batas keras - kit tetap menggabung). Daftar-izin
// yang tumbuh tak wajar = erosi prinsip hak-akses-seminimal-mungkin -> owner perlu tahu.
export const ALLOW_WARN_THRESHOLD = 200

function warn(msg) {
  // Ke stderr. Pakai Bahasa Indonesia (output bisa terlihat staff).
  console.error(`PERINGATAN json-merge: ${msg}`)
}

// Cap-waktu nama berkas cadangan (yyyyMMdd-HHmmss): dipindah ke sumber bersama engine/fs-text.mjs
// sebagai backupStamp (audit fungsi-kembar 2026-07-18). Pemanggil oper new Date() eksplisit karena
// backupStamp tak punya argumen-default (perilaku identik dgn backupStamp(new Date()) lama).

// Baca + parse JSON dengan kegagalan anggun:
//   - berkas tak ada -> null.
//   - terkunci/tak terbaca -> THROW (cegah caller perusak salah-anggap "kosong" lalu menimpa),
//     kecuali suppressLockError -> warn + null.
//   - isi kosong -> null.
//   - JSON rusak (ada + non-kosong) -> THROW (cegah penghapusan kunci kustom user),
//     kecuali suppressMalformedError -> warn + null.
export function readJsonFileSafely(filePath, opts = {}) {
  const { suppressLockError = false, suppressMalformedError = false } = opts
  if (!fs.existsSync(filePath)) return null
  let raw
  try {
    raw = fs.readFileSync(filePath, 'utf8')
  } catch (e) {
    const msg = `Tidak bisa baca settings '${filePath}' - berkas mungkin terkunci proses lain (tutup VS Code/editor lalu coba lagi). Detail: ${e.message}`
    if (suppressLockError) { warn(msg); return null }
    throw new Error(msg)
  }
  if (raw == null) return null
  raw = stripBom(raw) // buang BOM (JSON.parse tersedak BOM)
  if (raw.trim().length === 0) return null
  try {
    return JSON.parse(raw)
  } catch (e) {
    const msg = `JSON rusak di '${filePath}' (${e.message}). Berkas ADA dengan isi non-kosong - perbaiki sintaks JSON atau hapus berkas ini manual, lalu jalankan setup ulang. Penolakan ini sengaja untuk mencegah penghapusan kunci kustom (permissions.deny / env / apiKeyHelper).`
    if (suppressMalformedError) { warn(msg); return null }
    throw new Error(msg)
  }
}

// Tulis JSON atomik (temp ber-pid + rename) - pasangan-tulis untuk readJsonFileSafely di atas. Dipakai
// pemasang-hook (ensure-risk-gate-hook / ensure-rak-gate-hook / lang-hook-wiring) supaya tak ada
// settings.json setengah-tertulis kalau proses mati. Kontrak `.tmp-<pid>` + newline penutup SENGAJA BEDA
// dari manifest.mjs (`.tmp` polos, tanpa newline) -> tetap 2 rumah (tests/no-duplicate-functions.test.mjs).
export function writeJsonAtomic(filePath, obj) {
  const tmp = `${filePath}.tmp-${process.pid}`
  fs.writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`, 'utf8')
  fs.renameSync(tmp, filePath)
}

// Cari nama properti yang cocok CASE-INSENSITIVE. Kembalikan
// nama kunci ASLI yang ada di obj (mis. "Permissions"), atau undefined kalau tak ada. Dipakai supaya
// settings.local.json yang ditulis user dgn kapitalisasi beda tetap dikenali + digabung.
function getPropCI(obj, name) {
  if (obj == null || typeof obj !== 'object') return undefined
  const lower = String(name).toLowerCase()
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === lower) return k
  }
  return undefined
}

// Ekstrak permissions.allow jadi array string (tak pernah null). Lewati
// nilai null + toleran kalau allow bukan-array (skalar tunggal di-iterasi sekali). Nama kunci
// permissions/allow dicocokkan case-insensitive (getPropCI).
export function getAllowArrayFromObject(obj) {
  const out = []
  if (obj == null || typeof obj !== 'object') return out
  const permsKey = getPropCI(obj, 'permissions')
  const perms = permsKey ? obj[permsKey] : null
  if (perms == null || typeof perms !== 'object') return out
  const allowKey = getPropCI(perms, 'allow')
  const allow = allowKey ? perms[allowKey] : null
  if (allow == null) return out
  const items = Array.isArray(allow) ? allow : [allow]
  for (const item of items) {
    if (item != null) out.push(String(item))
  }
  return out
}

// Buang entri "bare" yang sudah ditutup varian wildcard ":*".
// case-sensitive Ordinal, idempoten, jaga urutan input.
// Mis. ada "Bash(git status)" + "Bash(git status:*)" -> buang yang bare.
export function compressSupersededAllowEntry(entries) {
  const out = []
  if (!entries || entries.length === 0) return out
  const entrySet = new Set()
  for (const e of entries) { if (e != null) entrySet.add(String(e)) }
  const toDrop = new Set()
  for (const e of entrySet) {
    if (e.length >= 4 && e.endsWith(':*)')) {
      const bare = e.slice(0, e.length - 3) + ')'
      if (entrySet.has(bare)) toDrop.add(bare)
    }
  }
  for (const e of entries) {
    if (e == null) continue
    if (!toDrop.has(String(e))) out.push(String(e))
  }
  return out
}

// Gabung permissions.allow template ke settings existing.
// opts (varian berkas): { existingPath, templatePath, outputPath, dryRun }
// opts (varian in-memory): { settingsPath, templateAllowList, dryRun }
// Return: true kalau ada perubahan (atau akan ada saat dryRun), false kalau sudah ter-gabung.
// Tentukan SUMBER merge dari dua bentuk pemanggilan yang sama-sama didukung:
//   varian in-memory : { settingsPath, templateAllowList }        - dipakai pemasang-hook.
//   varian berkas    : { existingPath, templatePath, outputPath } - dipakai setup/update + CLI.
// Return { existingPath, outputPath, templateObj }. MELEMPAR (pesan verbatim, dikunci tes) kalau
// template varian-berkas hilang atau kosong/rusak.
function resolveSumberMerge(opts) {
  const isInMemory = Array.isArray(opts.templateAllowList) || typeof opts.settingsPath === 'string'
  if (isInMemory) {
    return {
      existingPath: opts.settingsPath,
      outputPath: opts.settingsPath,
      templateObj: { permissions: { allow: [...(opts.templateAllowList || [])] } },
    }
  }
  if (!fs.existsSync(opts.templatePath)) {
    throw new Error(`mergeAllowList: TemplatePath tidak ditemukan: '${opts.templatePath}'`)
  }
  const templateObj = readJsonFileSafely(opts.templatePath)
  if (templateObj == null) {
    throw new Error(`mergeAllowList: template '${opts.templatePath}' kosong atau rusak.`)
  }
  return { existingPath: opts.existingPath, outputPath: opts.outputPath, templateObj }
}

// Baca settings existing. readJsonFileSafely default THROW saat terkunci / rusak. Untuk rusak,
// simpan copy mentah ke ".malformed.bak.<ts>" dulu (jejak buat user) lalu re-throw — supaya
// pengaturan kustom klien tak pernah hilang tanpa jejak.
function bacaExistingAtauSelamatkan(existingPath, outputPath, existingExists) {
  try {
    return readJsonFileSafely(existingPath)
  } catch (e) {
    if (existingExists) {
      const malformedBackup = `${existingPath}.malformed.bak.${backupStamp(new Date())}`
      try {
        fs.copyFileSync(existingPath, malformedBackup)
        warn(`existing settings rusak. Copy mentah disimpan ke '${malformedBackup}' supaya tidak hilang. Perbaiki '${existingPath}' atau hapus berkas itu lalu rerun setup.`)
      } catch (e2) {
        warn(`gagal salin copy rescue '${existingPath}' -> '${malformedBackup}': ${e2.message}. Berkas asli BELUM ditimpa.`)
      }
    }
    throw new Error(`mergeAllowList: menolak menulis '${outputPath}'. ${e.message}`)
  }
}

export function mergeAllowList(opts = {}) {
  const { dryRun = false } = opts
  const { existingPath, outputPath, templateObj } = resolveSumberMerge(opts)

  const existingExists = fs.existsSync(existingPath)
  const existingObj = bacaExistingAtauSelamatkan(existingPath, outputPath, existingExists)

  const existingAllow = getAllowArrayFromObject(existingObj)
  const templateAllow = getAllowArrayFromObject(templateObj)

  // Union (dedup case-sensitive) menjaga item tambahan dari template.
  const seen = new Set()
  const merged = []
  for (const item of existingAllow) { if (!seen.has(item)) { seen.add(item); merged.push(item) } }
  for (const item of templateAllow) { if (!seen.has(item)) { seen.add(item); merged.push(item) } }

  // Buang entri tertimpa wildcard.
  const collapsed = compressSupersededAllowEntry(merged)

  if (collapsed.length > ALLOW_WARN_THRESHOLD) {
    warn(`permissions.allow punya ${collapsed.length} entri (> ambang ${ALLOW_WARN_THRESHOLD}). Review '${outputPath}' untuk buang entri usang/tertimpa. Daftar-izin besar = erosi prinsip hak-akses-seminimal-mungkin.`)
  }

  // Sort (ordinal/code-unit, deterministik). Urutan serial adalah KOSMETIK (himpunan yang
  // penting); uji-banding membandingkan himpunan, bukan urutan persis.
  const mergedSorted = [...collapsed].sort()

  // Deteksi diff vs existing (banding himpunan, abai urutan).
  const existingSet = new Set(existingAllow)
  const mergedSet = new Set(mergedSorted)
  let hasDiff = existingSet.size !== mergedSet.size
  if (!hasDiff) {
    for (const m of mergedSet) {
      if (!existingSet.has(m)) { hasDiff = true; break }
    }
  }

  if (!hasDiff) return false
  if (dryRun) return true

  // Bangun objek output: jaga kunci top-level existing, timpa permissions.allow saja. Pakai kembali
  // nama kunci yang SUDAH ada secara case-insensitive (mis. "Permissions") supaya merge masuk ke kunci
  // itu -- bukan bikin kunci "permissions" huruf-kecil duplikat (cermin akses-anggota PS yang abai-huruf).
  const outObj = existingObj == null ? {} : structuredClone(existingObj)
  const permsKey = getPropCI(outObj, 'permissions') || 'permissions'
  if (outObj[permsKey] == null || typeof outObj[permsKey] !== 'object' || Array.isArray(outObj[permsKey])) {
    outObj[permsKey] = {}
  }
  const allowKey = getPropCI(outObj[permsKey], 'allow') || 'allow'
  outObj[permsKey][allowKey] = mergedSorted

  tulisHasilMerge(outObj, existingPath, outputPath, existingExists)
  return true
}

// Cadangkan-lalu-tulis hasil merge. Urutan tiga langkah ini BERMAKNA dan dipertahankan apa adanya:
//   1. backup existing DULU (best-effort: gagal backup -> peringatan, tulis tetap lanjut),
//   2. pastikan folder output ada (gagal -> MELEMPAR, jangan menulis ke tempat yang tak jelas),
//   3. baru menimpa berkas.
function tulisHasilMerge(outObj, existingPath, outputPath, existingExists) {
  // Cadangkan existing kalau ada DAN ada diff.
  if (existingExists) {
    const backupPath = `${existingPath}.bak.${backupStamp(new Date())}`
    try {
      fs.copyFileSync(existingPath, backupPath)
    } catch (e) {
      warn(`gagal backup '${existingPath}' -> '${backupPath}': ${e.message}`)
    }
  }

  // Pastikan folder output ada.
  const outDir = path.dirname(outputPath)
  if (outDir && !fs.existsSync(outDir)) {
    try {
      fs.mkdirSync(outDir, { recursive: true })
    } catch (e) {
      throw new Error(`mergeAllowList: gagal buat folder output '${outDir}': ${e.message}`)
    }
  }

  // Tulis UTF-8 tanpa BOM (writeFileSync utf8 = no-BOM; JSON.stringify pakai LF).
  // gaya-tulisan beda = kosmetik (berkas tak ber-tanda-tangan).
  const json = JSON.stringify(outObj, null, 2)
  try {
    fs.writeFileSync(outputPath, json, 'utf8')
  } catch (e) {
    throw new Error(`mergeAllowList: gagal tulis '${outputPath}': ${e.message}`)
  }
}

// Cek apakah semua entri requiredAllowList sudah ada di permissions.allow. Read-only:
// berkas terkunci/rusak -> false ("belum ter-gabung").
export function testAllowListMerged(filePath, requiredAllowList) {
  if (!requiredAllowList || requiredAllowList.length === 0) return true
  const obj = readJsonFileSafely(filePath, { suppressLockError: true, suppressMalformedError: true })
  if (obj == null) return false
  const set = new Set(getAllowArrayFromObject(obj))
  for (const req of requiredAllowList) {
    if (!set.has(req)) return false
  }
  return true
}

// Ambil permissions.allow dari berkas (array string, mungkin kosong, tak pernah throw).
// (read-only, suppress dua mode kegagalan).
export function getAllowList(filePath) {
  const obj = readJsonFileSafely(filePath, { suppressLockError: true, suppressMalformedError: true })
  return getAllowArrayFromObject(obj)
}

// (Blok CLI uji-banding `if (isMain)` DICABUT v8.0.0 — modul ini murni pustaka impor.)
