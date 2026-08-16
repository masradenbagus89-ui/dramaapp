// engine/doctor-integrity.mjs — dua pemeriksa berat milik `npx lintasai doctor`.
//
// KENAPA DIPISAH: keduanya diekstrak dari `invokeDoctor` di kit.mjs yang tadinya 173 baris dalam SATU
// fungsi (lewat langit-langit 100 baris `lintasAI.md` §4.2 — kernel DEVELOPER, bukan §4.2 AGENTS.md
// yang di sisi client berarti DETEKSI). Keduanya berdiri sendiri: masuk (kitDir/projectRoot +
// fungsi cetak), keluar hitungan {ok, warn, err}. Memisahkannya membuat invokeDoctor tinggal jadi
// perakit: panggil pemeriksa, jumlahkan, cetak ringkasan.
//
// KONTRAK yang sengaja dipertahankan PERSIS seperti sebelum dipisah (ini refactor, bukan perbaikan):
//   - urutan + teks baris cetak tak berubah (output doctor dibaca staff & tes)
//   - manifest rusak -> WARN + lanjut (bukan lempar); rincian error TIDAK dicetak (bisa memuat path
//     komputer staff)
//   - path di .install-manifest.json relatif AKAR PROJECT, jadi digabung ke projectRoot (bukan kitDir)
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

import { readManifestJson } from './rollback.mjs'
import { getManifestSignatureStatus } from './manifest-signing.mjs'
import { readKitManifest } from './kit-files.mjs'

// Grup manifest yang dianggap "berkas inti wajib ada" oleh doctor. Lebih luas dari daftar pemasang
// (setup-pola-b) karena doctor memeriksa kit TERPASANG, termasuk robot node_lib.
//
// 'skills' + 'github_assets' DITAMBAHKAN 2026-07-26 (celah verifikasi, bukan kode mati): keduanya
// TERKIRIM ke client tapi tak pernah masuk daftar mana pun -> 34 berkas (30 SKILL.md + registry.json
// + 3 workflow) bisa hilang di komputer client sementara doctor tetap melapor "file inti utuh".
// Yang paling berbahaya: templates/github/workflows/secret-guard.yml = robot penahan rahasia bocor,
// dan skills/ = seluruh rak on-demand yang dirujuk kernel AGENTS.md. Sengaja ditambahkan HANYA di
// doctor (diagnostik yang MELAPORKAN), bukan di daftar installer (yang MEMBLOKIR pemasangan).
// Kit lama tanpa grup ini tetap aman: cabang Array.isArray() di bawah melewatinya.
const GRUP_WAJIB = ['core_prompts', 'universal_rules', 'scripts', 'lib_files', 'node_lib',
  'templates', 'skills', 'github_assets', 'docs', 'tests', 'ci', 'meta']

// Cek 2: berkas inti kit utuh? Acuan = engine/kit-files.json (fallback lib/ untuk client v2 lama).
export function checkKitFilesComplete(kitDir, L) {
  let ok = 0, warn = 0, err = 0
  let wajibAda = []
  let manifest = null
  try {
    manifest = readKitManifest(kitDir)
  } catch (e) {
    L('ERROR manifest daftar-berkas (engine/kit-files.json) rusak / tak terbaca')
    L(`      ${e.message}`)
    err++
    manifest = { data: null }
  }
  if (manifest === null) {
    L('ERROR manifest daftar-berkas hilang (engine/kit-files.json - single-source-of-truth)')
    err++
  } else if (manifest.data) {
    const merged = []
    for (const g of GRUP_WAJIB) { if (Array.isArray(manifest.data[g])) merged.push(...manifest.data[g]) }
    wajibAda = merged.map((f) => String(f).replace(/\//g, '\\'))
  }

  if (wajibAda.length > 0) {
    const missing = wajibAda.filter((f) => !fs.existsSync(path.join(kitDir, f)))
    if (missing.length === 0) {
      L(`OK    ${wajibAda.length} file inti utuh`)
      ok++
    } else {
      L(`ERROR ${missing.length} file missing:`)
      for (const m of missing) L(`        - ${m}`)
      err++
      L('      Saran: npx lintasai update (re-clone fresh)')
    }
  }
  return { ok, warn, err }
}

// Verifikasi KEASLIAN manifest (tanda-tangan) — dijalankan SEBELUM cek sha256 supaya laporan
// 'PRISTINE' tidak menyesatkan saat daftarnya sendiri sudah diubah orang.
function laporTandaTangan(manifest, kitDir, L) {
  let ok = 0, warn = 0
  let sigStatus = 'skipped'
  // Helper Node selalu ada (di-import), TAPI hormati niat aslinya "skip kalau helper kit tak ada":
  // gate ke keberadaan berkasnya DI KIT YANG DIINSPEKSI (bisa kit lama). Gagal/error => 'skipped'.
  const signingLib = fs.existsSync(path.join(kitDir, 'engine', 'manifest-signing.mjs'))
    ? path.join(kitDir, 'engine', 'manifest-signing.mjs')
    : path.join(kitDir, 'lib', 'manifest-signing.mjs')
  if (fs.existsSync(signingLib)) {
    try { sigStatus = getManifestSignatureStatus(manifest, { kitRoot: kitDir }) } catch { sigStatus = 'skipped' }
  }
  switch (sigStatus) {
    case 'verified': L('OK    Manifest: tanda-tangan VALID (daftar berkas terverifikasi asli)'); ok++; break
    case 'invalid':
      L('WARN  Manifest: tanda-tangan TIDAK COCOK - daftar mungkin diubah; hasil integrity di bawah BELUM tentu bisa dipercaya.')
      L('      Kemungkinan lain (kit era-lama): segel format LAMA pra-2026-06-22 yang tak terbaca kit Node -> jalankan `npx lintasai update` untuk menyegel ulang format baru.')
      warn++; break
    case 'unsigned': L('INFO  Manifest: tanpa tanda-tangan (legacy) - integrity di bawah = cek sha256 saja, keaslian daftar belum diverifikasi.'); break
    default: L('INFO  Manifest: verifikasi tanda-tangan dilewati (helper tidak tersedia).'); break
  }
  return { ok, warn }
}

// Bandingkan sha256 tiap entri manifest dengan berkas nyata di disk.
function bandingkanSha(entries, projectRoot) {
  let pristine = 0, hilang = 0
  const berubah = []
  for (const entry of entries) {
    const relPath = entry.path || entry.file || null
    if (!relPath) continue
    const expectedSha = entry.sha256 || null
    if (!expectedSha) continue

    // Manifest menyimpan path relatif terhadap AKAR PROJECT (mis. ".lintasai/engine/rollback.mjs",
    // "AGENTS.md") -> gabung ke projectRoot, bukan kitDir (hindari double-prefix).
    const absPath = path.join(projectRoot, String(relPath).replace(/\//g, '\\'))
    if (!fs.existsSync(absPath)) { hilang++; continue }
    try {
      const actualSha = crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex')
      if (actualSha.toLowerCase() === String(expectedSha).toLowerCase()) pristine++
      else berubah.push(relPath)
    } catch (e) {
      berubah.push(`${relPath} (hash error: ${e.message})`)
    }
  }
  return { pristine, berubah, hilang }
}

// Cek 2b: integritas berkas terpasang (tanda-tangan manifest + sha256 per-berkas).
export function checkManifestIntegrity(kitDir, projectRoot, L) {
  let ok = 0, warn = 0, err = 0
  const manifestPath = path.join(kitDir, '.install-manifest.json')
  if (!fs.existsSync(manifestPath)) {
    L('INFO  Integrity check skipped: .install-manifest.json tidak ada (kit pre-manifest atau belum di-install)')
    return { ok, warn, err }
  }

  let manifest = null
  try {
    manifest = readManifestJson(manifestPath)
  } catch {
    // Pesan TETAP tanpa detail-error runtime: jangan bocorkan isi manifest rusak (bisa memuat path
    // komputer staff) ke layar. Cermin pola yang sudah benar di invokeDiff.
    L('WARN  Integrity check skipped: manifest .install-manifest.json rusak / tak terbaca (cek format JSON).')
    return { ok, warn: warn + 1, err }
  }
  if (manifest === null) return { ok, warn, err }

  const sig = laporTandaTangan(manifest, kitDir, L)
  ok += sig.ok
  warn += sig.warn

  const entries = (Array.isArray(manifest.files) && manifest.files.length) ? manifest.files
    : (Array.isArray(manifest.entries) && manifest.entries.length) ? manifest.entries : []
  const { pristine, berubah, hilang } = bandingkanSha(entries, projectRoot)

  L(`OK    Integrity: PRISTINE=${pristine}, MODIFIED=${berubah.length}, MISSING=${hilang}`)
  if (berubah.length > 0) {
    L('WARN  File berikut dimodifikasi sejak install (mungkin disengaja):')
    for (const m of berubah) L(`        - ${m}`)
    warn++
  } else {
    ok++
  }
  if (hilang > 0) {
    L(`ERROR Integrity: ${hilang} file di manifest tapi tidak ada di disk`)
    err++
  }
  return { ok, warn, err }
}
