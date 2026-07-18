#!/usr/bin/env node
// lib/kit-staging.mjs - "siapkan dulu, periksa, baru tukar" untuk folder .claude-kit/ klien.
//
// MASALAH YANG DIPECAHKAN (audit ketahanan 2026-07-15 atas update-kit.mjs):
//  1. Urutan lama = rename .claude-kit -> cadangan DULU, baru ambil versi baru. Selama pengambilan
//     (clone lewat jaringan = puluhan detik) .claude-kit TIDAK ADA. Tak ada penangan sinyal di seluruh
//     kode produksi -> Ctrl-C/listrik padam = kit klien LENYAP. Menjalankan ulang malah gagal dengan
//     pesan menyesatkan ("berkas terkunci / antivirus") karena rename sumbernya ENOENT.
//  2. Tak ada validasi isi kit baru sebelum kit lama ditinggalkan -> kit kosong/cacat bisa mendarat
//     dan proses tetap melapor sukses.
// Modul ini membalik urutannya: siapkan isi ke folder staging -> PERIKSA -> baru tukar (2 rename
// berurutan = milidetik). Kalau apa pun gagal sebelum tukar, .claude-kit klien TAK PERNAH disentuh.
//
// Pola tukar-atomik ini mencontek cacache (mesin cache npm sendiri): tulis ke sementara lalu pindah,
// supaya tahan tulis-separuh & tabrakan proses. Rujukan: https://github.com/npm/cacache
//
// SIFAT: tak ada I/O jaringan (pemanggil yang menyediakan isi staging), pesan Bahasa Indonesia awam,
// tiap fungsi mengembalikan hasil (bukan melempar) supaya pemanggil bisa memutuskan + melapor jujur.
import fs from 'node:fs'
import path from 'node:path'

// Berkas/folder yang MENANDAKAN sebuah folder benar-benar kit lintasAI yang waras. Sengaja sedikit &
// stabil: ini gerbang "jangan tinggalkan kit lama demi isi yang cacat", bukan audit kelengkapan penuh
// (itu tugas `doctor` + lib/kit-files.json). Menambah entri di sini = menaikkan risiko alarm-palsu
// saat tata-letak kit berubah, jadi tambah hanya yang benar-benar mustahil hilang di rilis sah.
export const KIT_CORE_ENTRIES = Object.freeze([
  'setup-pola-b.mjs', // pemasang - dipanggil Langkah 4; hilang = artefak klien tak pernah ter-deploy
  'kit.mjs', // dispatcher + doctor
  'CHANGELOG.md', // sumber versi + label [SECURITY]/[BREAKING]; hilang = banner keamanan hilang senyap
  'CLAUDE_universal_v1.md', // berkas aturan - alasan utama kit ini ada
  'lib', // robot pendukung
  'workflows', // rak aturan on-demand
])

// Periksa folder = kit yang waras? Return { ok, missing: string[] }.
// FAIL-CLOSED dipakai pemanggil: !ok -> BATAL, jangan tukar.
export function validateKitContents(dir) {
  const missing = []
  if (!dir || !fs.existsSync(dir)) return { ok: false, missing: ['(folder tidak ada)'] }
  for (const entry of KIT_CORE_ENTRIES) {
    if (!fs.existsSync(path.join(dir, entry))) missing.push(entry)
  }
  return { ok: missing.length === 0, missing }
}

// Salin isi kit dari srcDir ke stagingDir (folder BARU, harus belum ada).
// filter = fungsi (srcAbs) => boolean; pemanggil yang menyuplai (mis. shouldCopyKitEntry milik
// setup-pola-b) supaya modul ini tak bergantung pada pemasang. Return { ok, error }.
export function stageFromDirectory(srcDir, stagingDir, filter = null) {
  try {
    if (!fs.existsSync(srcDir)) return { ok: false, error: `Sumber kit tidak ada: ${srcDir}` }
    if (fs.existsSync(stagingDir)) return { ok: false, error: `Folder penyiapan sudah ada: ${stagingDir}` }
    fs.mkdirSync(stagingDir, { recursive: true })
    fs.cpSync(srcDir, stagingDir, { recursive: true, ...(filter ? { filter } : {}) })
    return { ok: true, error: null }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// Buang folder penyiapan (best-effort TAPI JUJUR: kegagalan dilaporkan, tidak ditelan diam-diam -
// pelajaran dari restoreBackupOrWarn lama yang menelan error rmSync lalu bikin keadaan makin ambigu).
// Return { ok, error }.
export function discardStaging(stagingDir) {
  try {
    if (stagingDir && fs.existsSync(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 120 })
    }
    return { ok: true, error: null }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// TUKAR: kit lama -> cadangan, staging -> kit. Inti ketahanannya ada di sini.
// Urutan: (1) rename kitDir -> backupDir  (2) rename stagingDir -> kitDir.
// Kalau (2) gagal, (1) DIBATALKAN (cadangan dikembalikan) supaya klien tak pernah tertinggal tanpa kit.
// Return { ok, backupPath, error, restored }.
export function swapInKit({ kitDir, stagingDir, backupDir, keepBackup = true }) {
  if (!fs.existsSync(stagingDir)) return { ok: false, backupPath: null, error: `Folder penyiapan tak ada: ${stagingDir}`, restored: false }

  const kitAda = fs.existsSync(kitDir)
  let backupPath = null

  // (1) Sisihkan kit lama.
  if (kitAda) {
    if (keepBackup) {
      if (fs.existsSync(backupDir)) {
        return { ok: false, backupPath: null, error: `Folder cadangan sudah ada: ${backupDir} (ada update lain berjalan?)`, restored: false }
      }
      try {
        fs.renameSync(kitDir, backupDir)
        backupPath = backupDir
      } catch (e) {
        // Kit lama TIDAK tersentuh -> aman total.
        return { ok: false, backupPath: null, error: `Gagal menyisihkan kit lama: ${e.message}`, restored: false }
      }
    } else {
      try {
        fs.rmSync(kitDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 120 })
      } catch (e) {
        return { ok: false, backupPath: null, error: `Gagal menghapus kit lama: ${e.message}`, restored: false }
      }
    }
  }

  // (2) Pasang kit baru.
  try {
    fs.renameSync(stagingDir, kitDir)
    return { ok: true, backupPath, error: null, restored: false }
  } catch (e) {
    // Batalkan (1): kembalikan cadangan supaya klien tak tertinggal TANPA kit sama sekali.
    let restored = false
    let restoreErr = null
    if (backupPath && fs.existsSync(backupPath) && !fs.existsSync(kitDir)) {
      try { fs.renameSync(backupPath, kitDir); restored = true } catch (e2) { restoreErr = e2.message }
    }
    const detail = restored
      ? ' Kit lama sudah dikembalikan - tak ada yang hilang.'
      : restoreErr
        ? ` Pengembalian cadangan JUGA gagal (${restoreErr}). Pulihkan manual: pindahkan '${backupPath}' ke '${kitDir}'.`
        : ''
    return { ok: false, backupPath, error: `Gagal memasang kit baru: ${e.message}.${detail}`, restored }
  }
}

// Cari folder cadangan yatim (.claude-kit.backup-*) di akar project. Dipakai saat .claude-kit HILANG
// (bekas update yang mati di tengah pada versi lama): tanpa ini, klien buntu - updater lama gagal
// dengan pesan menyesatkan dan tak pernah menyebut cadangan yang duduk diam di sebelahnya.
// Return array path absolut, TERBARU dulu.
export function findOrphanBackups(projectRoot) {
  try {
    if (!projectRoot || !fs.existsSync(projectRoot)) return []
    const hasil = []
    for (const nama of fs.readdirSync(projectRoot)) {
      if (!nama.startsWith('.claude-kit.backup-')) continue
      const p = path.join(projectRoot, nama)
      try {
        const st = fs.statSync(p)
        if (st.isDirectory()) hasil.push({ path: p, mtime: st.mtimeMs })
      } catch { /* lewati entri yang tak terbaca */ }
    }
    return hasil.sort((a, b) => b.mtime - a.mtime).map((x) => x.path)
  } catch {
    return []
  }
}
