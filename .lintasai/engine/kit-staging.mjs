#!/usr/bin/env node
// engine/kit-staging.mjs - "siapkan dulu, periksa, baru tukar" untuk folder .lintasai/ klien.
//
// MASALAH YANG DIPECAHKAN (audit ketahanan 2026-07-15 atas update-kit.mjs):
//  1. Urutan lama = rename .lintasai -> cadangan DULU, baru ambil versi baru. Selama pengambilan
//     (clone lewat jaringan = puluhan detik) .lintasai TIDAK ADA. Tak ada penangan sinyal di seluruh
//     kode produksi -> Ctrl-C/listrik padam = kit klien LENYAP. Menjalankan ulang malah gagal dengan
//     pesan menyesatkan ("berkas terkunci / antivirus") karena rename sumbernya ENOENT.
//  2. Tak ada validasi isi kit baru sebelum kit lama ditinggalkan -> kit kosong/cacat bisa mendarat
//     dan proses tetap melapor sukses.
// Modul ini membalik urutannya: siapkan isi ke folder staging -> PERIKSA -> baru tukar (2 rename
// berurutan = milidetik). Kalau apa pun gagal sebelum tukar, .lintasai klien TAK PERNAH disentuh.
//
// Pola tukar-atomik ini mencontek cacache (mesin cache npm sendiri): tulis ke sementara lalu pindah,
// supaya tahan tulis-separuh & tabrakan proses. Rujukan: https://github.com/npm/cacache
//
// SIFAT: tak ada I/O jaringan (pemanggil yang menyediakan isi staging), pesan Bahasa Indonesia awam,
// tiap fungsi mengembalikan hasil (bukan melempar) supaya pemanggil bisa memutuskan + melapor jujur.
import fs from 'node:fs'
import path from 'node:path'
import { adalahCadanganKit, cariFolderKit, NAMA_FOLDER_KIT, NAMA_FOLDER_KIT_LAMA } from './project-root.mjs'
import { migrasiPathHookDiSettings } from './hook-installer.mjs'
import { pasangPolaGitignoreLintasAI } from './setup-fs.mjs'
import { runCursorRulesGen } from './adapter-rules-gen.mjs'
import { migrasiPathManifest } from './manifest.mjs'

// Berkas/folder yang MENANDAKAN sebuah folder benar-benar kit lintasAI yang waras. Sengaja sedikit &
// stabil: ini gerbang "jangan tinggalkan kit lama demi isi yang cacat", bukan audit kelengkapan penuh
// (itu tugas `doctor` + engine/kit-files.json). Menambah entri di sini = menaikkan risiko alarm-palsu
// saat tata-letak kit berubah, jadi tambah hanya yang benar-benar mustahil hilang di rilis sah.
export const KIT_CORE_ENTRIES = Object.freeze([
  'setup-pola-b.mjs', // pemasang - dipanggil Langkah 4; hilang = artefak klien tak pernah ter-deploy
  'kit.mjs', // dispatcher + doctor
  'CHANGELOG.md', // sumber versi + label [SECURITY]/[BREAKING]; hilang = banner keamanan hilang senyap
  'AGENTS.md', // berkas aturan (kernel) - alasan utama kit ini ada
  'engine', // robot pendukung
  'skills', // rak aturan on-demand (ADR-034: menggantikan folder rak lama yang dicabut)
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

// Cari folder cadangan yatim (.lintasai.backup-*) di akar project. Dipakai saat .lintasai HILANG
// (bekas update yang mati di tengah pada versi lama): tanpa ini, klien buntu - updater lama gagal
// dengan pesan menyesatkan dan tak pernah menyebut cadangan yang duduk diam di sebelahnya.
// Return array path absolut, TERBARU dulu.
export function findOrphanBackups(projectRoot) {
  try {
    if (!projectRoot || !fs.existsSync(projectRoot)) return []
    const hasil = []
    for (const nama of fs.readdirSync(projectRoot)) {
      // Cadangan bernama BARU maupun LAMA sama-sama dihitung: penyelamat "kit hilang" harus tetap
      // menemukan cadangan yang dibuat sebelum rename.
      if (!adalahCadanganKit(nama)) continue
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

// === MIGRASI nama folder kit (<nama-lama>/ -> <nama-baru>/) ======================================
//
// Dijalankan di AWAL init & update. IDEMPOTEN + GAGAL-AMAN: client yang sudah bernama baru, atau
// yang belum pernah pasang, tak tersentuh sama sekali.
//
// URUTAN WAJIB (jangan ditukar):
//   1. rename folder   — pakai fs.renameSync (PINDAH nama, isi tak disentuh). BUKAN salin-lalu-hapus:
//                        tak ada berkas client yang dihapus di jalur ini sama sekali.
//   2. tulis ulang hook di .claude/settings.json ke path baru.
//   3. (pemanggil) jalankan setup seperti biasa.
// Kalau (2) dijalankan lebih dulu, hook menunjuk folder yang belum ada.
//
// Kalau (1) gagal, kita BERHENTI dan TIDAK menyentuh settings.json — lebih baik client tetap utuh
// di nama lama (semuanya masih jalan) daripada separuh-jadi (folder lama + hook menunjuk folder baru).

// Alasan-alasan yang membuat migrasi DILEWATI tanpa error (semuanya keadaan normal).
export const MIGRASI_DILEWATI = Object.freeze({
  TAK_PERLU: 'nama-baru-sama-dengan-lama', // masa transisi: belum cutover
  SUDAH: 'sudah-nama-baru',
  TAK_ADA_KIT: 'belum-pasang-kit',
})

/**
 * Migrasikan folder kit client dari nama lama ke nama baru.
 *
 * @param {object} o
 * @param {string} o.projectRoot akar project client.
 * @param {string} [o.selfDir] folder tempat skrip yang SEDANG BERJALAN berada. Dipakai pengaman
 *   Windows: kalau skrip dijalankan DARI DALAM folder yang mau di-rename, folder itu terkunci
 *   proses sendiri -> rename bisa gagal EBUSY/EPERM di tengah. Kita menolak lebih dulu, dengan
 *   pesan yang bisa ditindaklanjuti, alih-alih meninggalkan keadaan separuh-jadi.
 * @param {boolean} [o.dryRun]
 * @returns {{migrated:boolean, reason:string, dari?:string, ke?:string, hook?:object, pesan?:string[]}}
 */
export function migrasiNamaFolderKit({ projectRoot, selfDir = null, dryRun = false } = {}) {
  // Masa transisi: nama baru == nama lama -> tak ada yang perlu dipindah.
  if (NAMA_FOLDER_KIT === NAMA_FOLDER_KIT_LAMA) {
    return { migrated: false, reason: MIGRASI_DILEWATI.TAK_PERLU }
  }
  if (!projectRoot || !fs.existsSync(projectRoot)) {
    return { migrated: false, reason: MIGRASI_DILEWATI.TAK_ADA_KIT }
  }

  const dari = path.join(projectRoot, NAMA_FOLDER_KIT_LAMA)
  const ke = path.join(projectRoot, NAMA_FOLDER_KIT)
  const adaLama = fs.existsSync(dari)
  const adaBaru = fs.existsSync(ke)

  if (!adaLama) {
    return { migrated: false, reason: adaBaru ? MIGRASI_DILEWATI.SUDAH : MIGRASI_DILEWATI.TAK_ADA_KIT }
  }

  // KEDUANYA ada = keadaan ambigu (migrasi sebelumnya berhenti di tengah, atau client menyalin
  // manual). JANGAN menebak mana yang benar - salah tebak membuang kerjaan client.
  if (adaBaru) return berhentiAmbigu({ projectRoot, dari, ke })

  // PENGAMAN WINDOWS: skrip yang sedang berjalan ada DI DALAM folder yang mau di-rename.
  if (selfDir && berbagiJalur(dari, selfDir)) return berhentiSkripDiDalam({ dari, ke })

  if (dryRun) {
    return { migrated: true, reason: 'simulasi', dari, ke }
  }

  // (1) PINDAH nama. renameSync = operasi atomik di satu volume; isi folder tak disentuh.
  try {
    fs.renameSync(dari, ke)
  } catch (e) {
    return berhentiRenameGagal({ dari, ke, pesanError: e.message })
  }

  // (2) Baru sesudah folder benar-benar pindah: arahkan ulang hook di settings.json klien.
  const hook = migrasiPathHookDiSettings({
    projectRoot,
    namaLama: NAMA_FOLDER_KIT_LAMA,
    namaBaru: NAMA_FOLDER_KIT,
  })

  // (3) Catatan-pasang (.install-manifest.json) menyimpan path RELATIF ber-prefix nama folder.
  // Tanpa ditulis ulang: doctor melapor "56 file di manifest tapi tidak ada di disk" (Kit BERMASALAH)
  // dan uninstall/rollback jadi buta - persis setelah update yang sukses. Ikut disegel ulang.
  let manifest = null
  try {
    manifest = migrasiPathManifest({ kitDir: ke, namaLama: NAMA_FOLDER_KIT_LAMA, namaBaru: NAMA_FOLDER_KIT })
  } catch { manifest = null }

  // (4) Pola .gitignore untuk nama BARU — WAJIB di sini, bukan dititipkan ke langkah setup.
  // TERBUKTI di uji lapangan 2026-07-26: `update` BERHENTI LEBIH AWAL kalau versi sudah terbaru,
  // jadi langkah setup (yang biasanya menambah pola ini) TIDAK jalan. Akibatnya
  // `<folder-baru>/.manifest-secret` + `.install-manifest.json` tak terlindungi dari commit.
  // APPEND-only: entri lama milik client tak disentuh (yang lama jadi baris mati, tak berbahaya).
  let gitignore = null
  try { gitignore = pasangPolaGitignoreLintasAI(projectRoot, false) } catch { gitignore = null }

  // (5) Berkas aturan Cursor memuat pointer '<folder-kit>/PETA.md' -> regen supaya tak menunjuk
  // folder yang sudah tak ada. Alasan yang sama dengan (4): tak boleh bergantung langkah setup.
  let cursor = null
  try { cursor = runCursorRulesGen({ repoRoot: projectRoot, write: true }) } catch { cursor = null }

  return {
    migrated: true,
    reason: 'dipindah',
    dari,
    ke,
    hook,
    manifest,
    gitignore,
    cursor,
    milikClient: berkasClientYangMenyebutNamaLama(projectRoot),
  }
}

// --- Tiga keadaan BERHENTI AMAN. Dipisah dari migrasiNamaFolderKit supaya alur utamanya tetap
// terbaca sebagai 6 langkah; ketiganya sama-sama menjamin NOL berkas disentuh. ---

function berhentiAmbigu({ projectRoot, dari, ke }) {
  return {
    migrated: false,
    reason: 'ambigu-dua-folder',
    dari,
    ke,
    pesan: [
      `BERHENTI: Ada DUA folder kit sekaligus di ${projectRoot}:`,
      `  - ${NAMA_FOLDER_KIT_LAMA}  (nama lama)`,
      `  - ${NAMA_FOLDER_KIT}  (nama baru)`,
      '',
      'Aku TIDAK menebak yang mana yang benar - salah tebak bisa membuang kerjaanmu.',
      'Cek isi keduanya, simpan yang kamu mau, hapus/pindahkan yang satunya, lalu ulangi.',
      '',
      'TIDAK ADA satu pun berkas yang disentuh. Aman.',
    ],
  }
}

function berhentiSkripDiDalam({ dari, ke }) {
  return {
    migrated: false,
    reason: 'skrip-di-dalam-folder',
    dari,
    ke,
    pesan: [
      `BERHENTI: Folder kit perlu diganti nama '${NAMA_FOLDER_KIT_LAMA}' -> '${NAMA_FOLDER_KIT}',`,
      'tapi perintah ini dijalankan DARI DALAM folder itu sendiri, jadi folder-nya terkunci',
      'oleh proses yang sedang berjalan (Windows) dan rename bisa gagal di tengah.',
      '',
      'Jalankan dari LUAR folder kit supaya aman:',
      '  npx lintasai@latest update',
      '',
      'TIDAK ADA satu pun berkas yang disentuh. Aman.',
    ],
  }
}

function berhentiRenameGagal({ dari, ke, pesanError }) {
  return {
    migrated: false,
    reason: `rename-gagal: ${pesanError}`,
    dari,
    ke,
    pesan: [
      `BERHENTI: Gagal mengganti nama folder kit '${NAMA_FOLDER_KIT_LAMA}' -> '${NAMA_FOLDER_KIT}'.`,
      `Rincian: ${pesanError}`,
      '',
      'Biasanya: ada editor/terminal yang sedang membuka berkas di dalam folder itu, atau',
      'antivirus mengunci berkas. TUTUP VS Code / terminal di folder itu lalu ulangi.',
      '',
      'Kit kamu TIDAK berubah - masih lengkap di nama lama, semuanya tetap jalan. Aman.',
    ],
  }
}

// Berkas MILIK CLIENT yang kit janjikan TIDAK PERNAH ditimpa, tapi mungkin menyebut nama folder lama.
// SENGAJA cuma dideteksi lalu DILAPORKAN, bukan disunting: menyunting berkas yang kit sendiri
// janjikan "tak pernah disentuh" itu melanggar kontrak ke client - lebih buruk daripada satu baris
// rujukan yang basi. Client yang memutuskan.
const BERKAS_MILIK_CLIENT = Object.freeze(['AGENTS.local.md', '.gitignore'])

function berkasClientYangMenyebutNamaLama(projectRoot) {
  const hasil = []
  for (const rel of BERKAS_MILIK_CLIENT) {
    const p = path.join(projectRoot, rel)
    try {
      if (!fs.existsSync(p)) continue
      if (fs.readFileSync(p, 'utf8').includes(`${NAMA_FOLDER_KIT_LAMA}/`)) hasil.push(rel)
    } catch { /* tak terbaca -> lewati, ini cuma laporan */ }
  }
  return hasil
}

// Apakah `anak` berada di dalam (atau sama dengan) `induk`? Perbandingan path yang sudah
// dinormalkan; tak peka besar-kecil huruf karena Windows memang begitu.
function berbagiJalur(induk, anak) {
  try {
    const a = path.resolve(induk).toLowerCase()
    const b = path.resolve(anak).toLowerCase()
    return b === a || b.startsWith(a + path.sep)
  } catch {
    return false
  }
}

// Susun baris laporan migrasi untuk staff (Bahasa awam, sebut apa yang berubah + apa yang aman).
export function barisLaporanMigrasi(hasil) {
  if (!hasil || !hasil.migrated) return []
  const baris = [
    '',
    '=== Migrasi nama folder kit ===',
    `Folder kit diganti nama: ${NAMA_FOLDER_KIT_LAMA}/ -> ${NAMA_FOLDER_KIT}/`,
    '  (isi folder TIDAK disentuh - cuma namanya yang berubah, tak ada berkas yang dihapus)',
  ]
  const h = hasil.hook
  if (h && h.changed) {
    baris.push(`  ${h.jumlah} hook di .claude/settings.json diarahkan ke folder baru (pengaturan lain utuh)`)
  } else if (h && h.reason === 'settings-rusak-atau-terkunci') {
    baris.push('  PERINGATAN: .claude/settings.json rusak/terkunci - hook BELUM diarahkan ulang.')
    baris.push('              Perbaiki JSON-nya lalu jalankan: npx lintasai enable-risk-gate')
  } else if (h && h.reason === 'tak-ada-settings') {
    baris.push('  (.claude/settings.json belum ada - tak ada hook yang perlu diarahkan)')
  }
  // Lapor APA YANG BENAR-BENAR TERJADI, bukan apa yang diharapkan terjadi nanti (§2.3).
  const m = hasil.manifest
  if (m && m.changed) {
    baris.push(`  ${m.jumlah} path di catatan-pasang diarahkan ke folder baru${m.resegel ? ' + segel dibuat ulang' : ''}`)
  } else if (m && m.reason && !['tak-perlu', 'tak-ada-manifest', 'sudah-terbaru'].includes(m.reason)) {
    baris.push(`  PERINGATAN: catatan-pasang BELUM diperbarui (${m.reason}).`)
    baris.push('              Akibatnya `doctor` bisa melapor berkas "hilang". Perbaikan: npx lintasai init')
  }
  const g = hasil.gitignore
  if (g && g.added > 0) baris.push(`  ${g.added} pola .gitignore untuk folder baru ditambahkan (rahasia kit tetap terlindungi)`)
  else if (g) baris.push('  Pola .gitignore untuk folder baru sudah ada (tidak diubah)')
  const c = hasil.cursor
  if (c && c.present && (c.action === 'created' || c.action === 'updated')) {
    baris.push('  Berkas aturan Cursor (.cursor/rules/lintasai.mdc) diarahkan ke folder baru')
  }
  const milik = hasil.milikClient
  if (Array.isArray(milik) && milik.length > 0) {
    baris.push('')
    baris.push(`  CATATAN: berkas MILIK KAMU di bawah masih menyebut '${NAMA_FOLDER_KIT_LAMA}/':`)
    for (const rel of milik) baris.push(`    - ${rel}`)
    baris.push('  Sengaja TIDAK aku ubah - berkas itu milikmu dan kit berjanji tak pernah menimpanya.')
    baris.push(`  Kalau mau, ganti sendiri rujukannya jadi '${NAMA_FOLDER_KIT}/' (tak mendesak).`)
  }
  return baris
}
