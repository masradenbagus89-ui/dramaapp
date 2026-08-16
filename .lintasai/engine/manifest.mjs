#!/usr/bin/env node
// engine/manifest.mjs - Pembuat "daftar resmi berkas terpasang" (.install-manifest.json), versi Node.
//
// Dipakai uninstall/rollback untuk hapus-aman (deteksi berkas masih asli
// via sidik-jari SHA-256). GANDENG dgn engine/manifest-signing.mjs (segel anti-utak-atik).
//
// CATATAN byte-identik: SIDIK-JARI (SHA-256) WAJIB byte-identik dgn PowerShell Get-FileHash
// (hex HURUF-BESAR). Tanda-tangan/segel pakai canonical baku (urut-abjad) dari manifest-signing.mjs,
// jadi format JSON tersimpan (rapi/pretty) TIDAK perlu sama persis dgn PS -- verifikasi menghitung
// ulang canonical dari nilai tersimpan, bukan dari tata-letak berkas. (ADR-004 / Gelombang 1.)
//
// Status migrasi: pembuat (saveManifest) = lem-pemasang yang dipanggil orkestrator (setup/update);
// dipakai-penuh saat orkestrator pindah ke Node (Gelombang 4). getFileSha256 = primitif murni, siap.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { newManifestSignature, toSignableManifest } from './manifest-signing.mjs'
// stripBom (sumber bersama engine/fs-text.mjs): tanpa buang-BOM, manifest ber-BOM (editor Windows) bikin
// merge daftar-berkas-lama HILANG diam-diam (entri lama tak terlacak saat uninstall = sampah tertinggal).
import { stripBom } from './fs-text.mjs'
// Peta versi-diharapkan (Mesin 1 STRATEGI_UPDATE_v2): angka schema_version catatan-pasang diambil
// dari sumber-tunggal engine/expected-schema.mjs -> penulis ini + pemeriksa uninstall.mjs tak bisa selisih.
import { getLintasExpectedSchemaVersion } from './expected-schema.mjs'

// Buat wadah state baru untuk melacak manifest pemasangan.
export function initializeManifest(projectRoot) {
  if (!projectRoot) throw new Error('initializeManifest: projectRoot wajib diisi.')
  return { projectRoot, files: [], directories: [] }
}

// Hitung SHA-256 berkas (hex HURUF-BESAR, tanpa pemisah). null kalau berkas tak ada.
// Cermin PowerShell Get-FileHash -Algorithm SHA256 (yang mengembalikan hex huruf-besar).
export function getFileSha256(filePath) {
  if (!fs.existsSync(filePath)) return null
  const buf = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(buf).digest('hex').toUpperCase()
}

// Ubah path absolut -> path relatif (garis-miring-depan, tanpa garis-miring awal).
export function toManifestRelativePath(absolutePath, projectRoot) {
  let rel = String(absolutePath).split(projectRoot).join('') // replace SEMUA kemunculan projectRoot
  rel = rel.replace(/^[\\/]+/, '')
  return rel.replace(/\\/g, '/')
}

// Lacak berkas ke state manifest dgn sidik-jari SHA-256.
export function addToManifest(state, filePath, kind, from) {
  if (!fs.existsSync(filePath)) return
  const sha = getFileSha256(filePath)
  const relPath = toManifestRelativePath(filePath, state.projectRoot)
  const entry = { path: relPath, kind, sha256: sha }
  if (from) entry.from = from
  state.files.push(entry)
}

// Keanggotaan string CASE-INSENSITIVE untuk dedup path manifest
// Tanpa ini, path/folder yang
// beda HANYA huruf-besar-kecil (mis. rename 'Foo.md' -> 'foo.md' antar-versi) lolos
// dedup -> manifest dapat entri GANDA (harus dicegah).
// Path manifest = ASCII;
// toLowerCase() cukup + selaras fix case-insensitivity sebelumnya.
function includesCI(arr, value) {
  const v = String(value).toLowerCase()
  for (const x of arr) { if (String(x).toLowerCase() === v) return true }
  return false
}

// Lacak folder ke state manifest (dedup CASE-INSENSITIVE).
export function addDirToManifest(state, dirPath) {
  if (!fs.existsSync(dirPath)) return
  const relPath = toManifestRelativePath(dirPath, state.projectRoot)
  if (!includesCI(state.directories, relPath)) state.directories.push(relPath)
}

// Format waktu lokal 'yyyy-MM-ddTHH:mm:ss'. Helper lapisan manifest
// (anti fungsi-kembar, §5 reuse, dijaga tests/no-duplicate-functions.test.mjs).
export function formatLocalTimestamp(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// Tulis JSON ke disk secara ATOMIK: tulis ke berkas sementara (.tmp) lebih dulu, lalu ganti-nama
// (rename) ke tujuan. rename di filesystem yang sama bersifat atomik (libuv pakai MoveFileEx
// MOVEFILE_REPLACE_EXISTING di Windows -> timpa berkas lama dgn aman). Tanpa ini, listrik mati /
// proses ditebas di TENGAH penulisan bisa meninggalkan .install-manifest.json setengah-jadi (JSON
// rusak) -> rollback (rollback.mjs:readManifestJson) DAN uninstall (uninstall.mjs) dua-duanya
// lumpuh persis saat dibutuhkan. Cermin idiom writeManifestJson di engine/rollback.mjs (sumber
// idiom sama; sengaja TAK di-impor lintas-modul demi jaga batas lapisan installer<-manifest ringan).
// Di-EXPORT sebagai helper tulis-atomik lapisan manifest; duplikat dgn rollback.mjs tetap
// terdokumentasi di daftar-izin tests/no-duplicate-functions.test.mjs.
export function writeJsonAtomic(targetPath, obj) {
  const tmp = targetPath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8')
  fs.renameSync(tmp, targetPath)
}

// === MIGRASI path di dalam catatan-pasang saat folder kit berganti nama ==========================
//
// KENAPA WAJIB (cacat nyata, ketangkap uji lapangan 2026-07-26): entri manifest memakai path
// RELATIF ber-prefix nama folder kit (`.claude-kit/engine/risk-gate.js`). Waktu foldernya di-rename,
// prefix itu TIDAK ikut berubah, jadi seluruh entri kit menunjuk berkas yang tak ada:
//   - `doctor`   -> "56 file di manifest tapi tidak ada di disk", ERROR, "Kit BERMASALAH"
//   - `uninstall`-> tak menemukan berkas kit; klasifikasi ASLI/DIEDIT jadi ngawur
//   - `rollback` -> sama butanya
// Diam-diam? Tidak sepenuhnya (doctor memang MERAH), tapi client melihat kit "bermasalah" tepat
// setelah update yang sukses - dan uninstall jadi tak bisa membersihkan apa pun.
//
// SEGEL: manifest disegel HMAC di metadata.signature. Menulis ulang path TANPA menyegel ulang bikin
// segel tak cocok -> `rollback` berhenti di gerbang segel ("manifest-signature-invalid"). Jadi kalau
// tadinya bersegel, kita segel ULANG dengan kunci lokal yang sama (kunci ikut pindah bersama folder).
//
// Return { changed, jumlah, resegel, reason }. FAIL-SAFE: tak pernah melempar.
export function migrasiPathManifest({ kitDir, namaLama, namaBaru, kitVersion = null }) {
  if (!kitDir || !namaLama || !namaBaru || namaLama === namaBaru) {
    return { changed: false, jumlah: 0, resegel: false, reason: 'tak-perlu' }
  }
  const manifestPath = path.join(kitDir, '.install-manifest.json')
  if (!fs.existsSync(manifestPath)) return { changed: false, jumlah: 0, resegel: false, reason: 'tak-ada-manifest' }

  let m
  try { m = JSON.parse(stripBom(fs.readFileSync(manifestPath, 'utf8'))) } catch (e) {
    return { changed: false, jumlah: 0, resegel: false, reason: `manifest-rusak: ${e.message}` }
  }

  // Ganti HANYA prefix penggal-pertama, supaya folder client yang namanya berawalan sama
  // (mis. '.claude-kit-punyaku/') tak ikut tertukar.
  const tukar = (s) => {
    const t = String(s)
    if (t === namaLama) return namaBaru
    return t.startsWith(`${namaLama}/`) ? namaBaru + t.slice(namaLama.length) : t
  }

  let jumlah = 0
  if (Array.isArray(m.files)) {
    for (const f of m.files) {
      if (!f || typeof f !== 'object') continue
      for (const kunci of ['path', 'from']) {
        if (typeof f[kunci] !== 'string') continue
        const baru = tukar(f[kunci])
        if (baru !== f[kunci]) { f[kunci] = baru; jumlah++ }
      }
    }
  }
  if (Array.isArray(m.directories_created)) {
    m.directories_created = m.directories_created.map((d) => {
      const baru = tukar(d)
      if (baru !== d) jumlah++
      return baru
    })
  }
  if (jumlah === 0) return { changed: false, jumlah: 0, resegel: false, reason: 'sudah-terbaru' }

  // Segel ULANG kalau tadinya bersegel (kalau tidak, rollback akan menolak manifest ini).
  let resegel = false
  const adaSegel = !!(m.metadata && m.metadata.signature)
  if (adaSegel) {
    try {
      const versi = kitVersion || (m.metadata && m.metadata.kit_version) || m.kit_version || null
      const signable = toSignableManifest(m)
      m.metadata.signature = newManifestSignature(signable, { kitVersion: versi, kitRoot: kitDir })
      resegel = true
    } catch (e) {
      return { changed: false, jumlah, resegel: false, reason: `segel-ulang-gagal: ${e.message}` }
    }
  }

  try { writeJsonAtomic(manifestPath, m) } catch (e) {
    return { changed: false, jumlah, resegel, reason: `tulis-gagal: ${e.message}` }
  }
  return { changed: true, jumlah, resegel, reason: 'diperbarui' }
}

// Merge dgn manifest sebelumnya (kalau ada), segel HMAC, tulis JSON ke disk.
// opts: { kitDir, kitVersion, projectName, installerName, noPreserve=false, skipSigning=false, now? }
// `now` opsional (Date) untuk uji deterministik; default = sekarang.
// `installerName` = nama pemasang yang menulis catatan ini (metadata.installer). Default
// 'setup-pola-b.mjs' (v2.0.0: kit 100% Node).
export function saveManifest(state, { kitDir, kitVersion, projectName, installerName = 'setup-pola-b.mjs', noPreserve = false, skipSigning = false, now = null } = {}) {
  if (!kitDir) throw new Error('saveManifest: kitDir wajib diisi.')
  const manifestPath = path.join(kitDir, '.install-manifest.json')
  let merged = false

  // Baca manifest sebelumnya (kalau ada) untuk merge.
  let previous = null
  if (!noPreserve && fs.existsSync(manifestPath)) {
    try { previous = JSON.parse(stripBom(fs.readFileSync(manifestPath, 'utf8'))) } catch (e) {
      console.warn('Catatan: daftar berkas lama rusak/tak terbaca, akan ditulis ulang (' + e.message + ').')
    }
  }

  // Merge berkas: pertahankan entri lama yang masih ada di disk + tak bentrok dgn yang baru.
  if (previous && Array.isArray(previous.files)) {
    // Dedup CASE-INSENSITIVE: rename yang beda HANYA huruf-besar-kecil
    // antar-versi tak boleh bikin entri ganda. Kunci set + pembanding di-lower-case.
    const newPaths = new Set(state.files.map((f) => String(f.path).toLowerCase()))
    for (const prev of previous.files) {
      if (newPaths.has(String(prev.path).toLowerCase())) continue
      const fullPath = path.join(state.projectRoot, String(prev.path).replace(/\//g, path.sep))
      if (fs.existsSync(fullPath)) {
        const entry = { path: String(prev.path), kind: String(prev.kind), sha256: String(prev.sha256) }
        if (prev.from) entry.from = String(prev.from)
        state.files.push(entry)
        merged = true
      }
    }
  }

  // Merge folder: pertahankan yang masih ada.
  if (previous && Array.isArray(previous.directories_created)) {
    for (const prevDir of previous.directories_created) {
      const d = String(prevDir)
      if (includesCI(state.directories, d)) continue
      const fullDir = path.join(state.projectRoot, d.replace(/\//g, path.sep))
      if (fs.existsSync(fullDir)) { state.directories.push(d); merged = true }
    }
  }

  // Bangun objek manifest (urutan untuk keterbacaan; segel akan urut-abjad sendiri).
  const ts = now || new Date()
  const manifest = {
    schema_version: getLintasExpectedSchemaVersion('.install-manifest.json'),
    kit_version: kitVersion,
    installed_at: formatLocalTimestamp(ts),
    installed_by: '<USER>',
    project_name: projectName,
    project_root: '<PROJECT_ROOT>',
    metadata: { kit_version: kitVersion, installed_at: formatLocalTimestamp(ts) + 'Z', installer: installerName },
    files: state.files,
    directories_created: state.directories,
  }

  // Segel HMAC (opsional). Kunci secret di kitDir/.manifest-secret.
  let signed = false
  if (!skipSigning) {
    try {
      manifest.metadata.signature = newManifestSignature(manifest, { kitVersion, kitRoot: kitDir })
      signed = true
    } catch (e) {
      console.warn('Catatan: gagal menyegel daftar berkas (' + e.message + '). Tetap ditulis tanpa segel; saat hapus-kit nanti akan ada konfirmasi tambahan.')
    }
  }

  // Tulis JSON (UTF-8 TANPA BOM -> hash stabil + ramah git). ATOMIK (tmp+rename) supaya proses yang
  // ditebas / listrik mati di TENGAH-tulis tak meninggalkan catatan setengah-jadi (rusak) yang
  // melumpuhkan rollback + uninstall sekaligus (audit P3 2026-06-23).
  writeJsonAtomic(manifestPath, manifest)

  return { manifestPath, filesCount: state.files.length, dirsCount: state.directories.length, merged, signed }
}

// (Blok CLI uji-banding `if (isMain)` DICABUT v8.0.0 — modul ini murni pustaka impor.)
