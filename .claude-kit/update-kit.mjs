#!/usr/bin/env node
// update-kit.mjs - Perbarui kit lintasAI di sebuah project ke versi terbaru (versi Node), via ambil-ulang bersih.
//
// Alur atomic (tanpa setengah-jadi), sumber = paket npm yang SUDAH diunduh+diverifikasi npx:
//   A. Siapkan (stage) kit baru di folder sementara (kit lama belum disentuh)
//   B. Periksa kelengkapan kit baru sebelum menukar
//   C. Tukar (2 rename = milidetik) + simpan cadangan .claude-kit.backup-<cap-waktu>
//   4. Jalankan ulang pemasang (--force) supaya docs/ kamu TIDAK ditimpa
//   5. Tampilkan beda CHANGELOG lama vs baru + langkah lanjut + peringatan keamanan
//
// ===========================================================================================
// JALUR AKTIF untuk `npx lintasai update` (v2.0.0, kit 100% Node):
//   Dispatcher bin/lintasai.js memetakan 'update' -> update-kit.mjs di COMMANDS_NODE, dan
//   package.json files[] mendaftarkannya eksplisit -> ikut paket npm + jalan di mesin staff.
//   (update-kit.ps1 sudah dihapus.)
//
// SIFAT NON-INTERAKTIF (keputusan owner 06-22): versi Node TIDAK menampilkan popup jendela.
//   Keputusan keamanan yang di versi PS pakai popup/Read-Host -> di sini jadi default-AMAN:
//     - Repo di luar daftar-putih (URL asing)  -> BATAL, kecuali --allow-untrusted-repo.
//     - Hapus PERMANEN kit lama (--no-backup)   -> BATAL, kecuali --yes-delete-no-backup.
//     - Gagal hubungi server saat cek versi     -> BATAL aman (tak memaksa update buta).
//   AI mengonfirmasi ke staff di chat dulu, baru menjalankan dengan bendera yang sesuai.
//
// MEKANISME salin: stageFromDirectory + validateKitContents + swapInKit (engine/kit-staging.mjs) +
//   shouldCopyKitEntry (setup-pola-b.mjs) - identik dengan yang dipakai `npm create lintasai@latest`.
//   Kit 100% Node. Langkah pasang-ulang (4) memanggil pemasang Node (setup-pola-b.mjs);
//   Langkah cek-kesehatan (6) memanggil 'node kit.mjs doctor --skip-migrasi'. Tak ada lagi jalur .ps1/GPG.
//
// BATAS JUJUR (§4.6): jalur update npm (siapkan->periksa->tukar + pasang-ulang + doctor) diuji
//   end-to-end di tests/update-e2e.test.mjs (hermetik, tanpa jaringan). Fungsi-logika murni
//   (CHANGELOG/tier/keputusan-update-npm/bersih-cadangan) diuji tersendiri. Real-run = uji lapangan owner.
// ===========================================================================================
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { stripBom, eqCI, backupStamp } from './engine/fs-text.mjs'
import { getKitVersionFromChangelog } from './engine/version-detect.mjs'
import { getLatestNpmVersion } from './engine/npm-query.mjs'
import { stageFromDirectory, validateKitContents, discardStaging, swapInKit, findOrphanBackups } from './engine/kit-staging.mjs'
import { acquireUpdateLock, pesanKunciDitolak } from './engine/update-lock.mjs'
import { invokeMigrateClientStructure } from './engine/migrate-client-struktur.mjs'
import { shouldCopyKitEntry } from './setup-pola-b.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ---- Konstanta (cermin update-kit.ps1) ----
const DEFAULT_REPO_URL = 'https://github.com/ojokesusu/lintasAI.git'

// Kata kunci Tier 2 (fitur/aturan baru) - spesifik supaya tak salah-vonis.
const TIER2_KEYWORDS = [
  'tambah section', 'fitur baru', 'aturan AI', 'aturan baru', 'panduan baru',
  'section baru', 'rule baru', 'tambah fitur', 'tambah aturan', 'tambah panduan',
]

// ---- Util kecil ---- (stripBom dari sumber bersama engine/fs-text.mjs, impor di atas)
function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
// eqCI -> sumber bersama engine/fs-text.mjs (impor di atas).

// Cap-waktu cadangan -> backupStamp (sumber bersama engine/fs-text.mjs).

// Urai versi gaya .NET [version] untuk X.Y.Z (2-4 komponen numerik). Return array angka panjang-4
// (komponen absen = -1, cermin .NET) atau null kalau gagal. JANGAN buang 'v' di sini (pemanggil yang buang).
export function parseDotNetVersion(s) {
  if (s == null) return null
  const parts = String(s).trim().split('.')
  if (parts.length < 2 || parts.length > 4) return null
  const nums = []
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null
    const n = Number(p)
    if (!Number.isSafeInteger(n) || n < 0) return null
    nums.push(n)
  }
  while (nums.length < 4) nums.push(-1)
  return nums
}
// Banding 2 array versi hasil parseDotNetVersion. Return -1/0/1, atau null kalau salah satu gagal-urai.
export function compareDotNetVersion(a, b) {
  const va = parseDotNetVersion(a), vb = parseDotNetVersion(b)
  if (va === null || vb === null) return null
  for (let i = 0; i < 4; i++) { if (va[i] !== vb[i]) return va[i] < vb[i] ? -1 : 1 }
  return 0
}

// ============================================================================================
// FUNGSI-LOGIKA MURNI (mudah diuji + jadi target uji-banding vs PS)
// ============================================================================================

// Keputusan jalur npm: BOLEH tukar kit, atau BERHENTI? Murni (tanpa I/O) supaya tiap aturan bisa
// diuji tanpa menyentuh disk/jaringan; pemanggil yang menyediakan fakta + mengeksekusi.
//
// Yang dijaga di sini (semua dari audit + riset 2026-07-15):
//  (a) sumber == tujuan -> menyalin folder ke dirinya sendiri = tak bermakna. Terjadi kalau update
//      dijalankan DARI kit terpasang (node .claude-kit/update-kit.mjs) alih-alih lewat npx.
//  (b) JEBAKAN npx (paling penting): `npx lintasai update` TAK dijamin menjalankan versi terbaru -
//      dokumentasi npm: "Package names provided without a specifier will be matched with whatever
//      version exists in the local project", dan cache npx membekukan versi (npm/cli#6179; baru
//      diperbaiki sebagian di npm 11.2.0 - klien ber-npm 10.x masih kena). Tanpa gerbang ini, updater
//      LAMA akan memasang kit LAMA sambil melapor "sukses" = kelas bug paling senyap.
//  (c) TUF anti-rollback ("attacker presents files older than those the client has already seen"):
//      JANGAN turunkan versi kit klien tanpa izin eksplisit.
// FAIL-OPEN untuk (b): latestNpmVersion null (offline/registry diblokir) -> JANGAN memblokir update;
// pengetahuan yang tak ada bukan alasan menahan klien (pemanggil melapor "belum bisa dibandingkan").
export function decideNpmUpdate({
  selfKitDir,
  kitDir,
  selfVersion,
  installedVersion,
  latestNpmVersion = null,
  allowDowngrade = false,
}) {
  const sama = (a, b) => eqCI(String(a ?? '').replace(/[\\/]+$/, ''), String(b ?? '').replace(/[\\/]+$/, ''))
  if (sama(selfKitDir, kitDir)) {
    return {
      action: 'stop',
      reason: 'sumber-sama-dengan-tujuan',
      message:
        'Update ini dijalankan DARI kit yang sedang terpasang, jadi tak ada versi baru untuk disalin.\n' +
        "Jalankan lewat npx supaya npm mengambilkan versi terbaru: 'npx lintasai@latest update'",
    }
  }

  const bersih = (v) => String(v ?? '').replace(/^v/, '').trim()
  const selfV = bersih(selfVersion)
  if (!selfV || parseDotNetVersion(selfV) === null) {
    return {
      action: 'stop',
      reason: 'versi-diri-tak-terbaca',
      message:
        'Tidak bisa memastikan versi paket lintasAI yang sedang berjalan (CHANGELOG.md-nya tak terbaca).\n' +
        "Demi aman, kit kamu TIDAK diubah. Coba: 'npx lintasai@latest update'",
    }
  }

  // (b) Gerbang versi-diri - hanya kalau kita TAHU versi terbaru (fail-open).
  const latestV = bersih(latestNpmVersion)
  if (latestV && parseDotNetVersion(latestV) !== null) {
    const c = compareDotNetVersion(selfV, latestV)
    if (c !== null && c < 0) {
      return {
        action: 'stop',
        reason: 'updater-bukan-terbaru',
        message:
          `Perintah update yang berjalan ini versi v${selfV}, padahal yang terbaru v${latestV}.\n` +
          'Kalau diteruskan, kit kamu justru dipasangi versi lama. Kit TIDAK diubah.\n' +
          "Jalankan ini supaya dapat yang terbaru: 'npx lintasai@latest update'",
      }
    }
  }

  const instV = bersih(installedVersion)
  const instTerbaca = instV && instV !== 'unknown' && parseDotNetVersion(instV) !== null
  if (instTerbaca) {
    const c = compareDotNetVersion(instV, selfV)
    if (c === 0) {
      return { action: 'uptodate', reason: 'sudah-terbaru', message: `Kit kamu sudah v${instV} - sama dengan versi terbaru yang tersedia. Tidak ada yang perlu diubah.` }
    }
    if (c !== null && c > 0 && !allowDowngrade) {
      return {
        action: 'stop',
        reason: 'tolak-turun-versi',
        message:
          `Kit terpasang (v${instV}) lebih BARU dari paket yang mau dipasang (v${selfV}).\n` +
          'Menurunkan versi bisa merusak berkas yang sudah menyesuaikan versi baru, jadi dihentikan.\n' +
          "Kalau memang sengaja mau turun versi, ulangi dengan '--allow-downgrade'.",
      }
    }
  }

  return {
    action: 'proceed',
    reason: instTerbaca ? 'ada-update' : 'versi-terpasang-tak-diketahui',
    message: instTerbaca ? `Update tersedia: v${instV} -> v${selfV}` : `Akan memasang v${selfV} (versi terpasang tak diketahui).`,
    fromVersion: instTerbaca ? instV : null,
    toVersion: selfV,
  }
}

// Tiruan Get-LatestChangelogEntry: ambil entri versi PALING ATAS (= terbaru) dari CHANGELOG.
// Pola heading FLEKSIBEL (cermin PS): "## [1.2.3]" (Keep-a-Changelog) / "## v1.2.3" (gaya lama).
// Return { version: '1.2.3' (tanpa 'v'), body: '...' } atau null. (Catatan: PS pakai \s* bukan \s+.)
export function getLatestChangelogEntry(changelogPath) {
  if (!changelogPath || !fs.existsSync(changelogPath)) return null
  let content
  try { content = fs.readFileSync(changelogPath, 'utf8') } catch { return null }
  content = stripBom(content)
  const lines = content.split(/\r\n|\r|\n/) // cermin Get-Content (PS 5.1): pecah \r\n, \r-tunggal, \n
  const versionPattern = /^##\s*\[?v?(\d+\.\d+\.\d+)\]?/
  let latestVersion = null
  const bodyLines = []
  let inLatest = false
  for (const line of lines) {
    const m = line.match(versionPattern)
    if (m) {
      if (latestVersion === null) { latestVersion = m[1]; inLatest = true; continue }
      break // heading versi kedua = berhenti, entri pertama sudah lengkap
    }
    if (inLatest) bodyLines.push(line)
  }
  if (latestVersion === null) return null
  return { version: latestVersion, body: bodyLines.join('\n').trim() }
}

// Tiruan Get-ChangelogRangeBody: gabung body SEMUA entri di rentang (fromExclusive, toInclusive].
// Dipakai supaya label keamanan di versi-TENGAH yang dilewati (mis. lompat v1.20 -> v1.33) tetap kebaca.
// Return string gabungan atau '' kalau gagal/kosong/from-to tak valid.
export function getChangelogRangeBody(changelogPath, fromVersionExclusive, toVersionInclusive) {
  try {
    if (!changelogPath || !fs.existsSync(changelogPath)) return ''
    let content
    try { content = fs.readFileSync(changelogPath, 'utf8') } catch { return '' }
    content = stripBom(content)
    const lines = content.split(/\r\n|\r|\n/)
    const versionPattern = /^##\s*\[?v?(\d+\.\d+\.\d+)\]?/
    const fromV = parseDotNetVersion(String(fromVersionExclusive).replace(/^v/, ''))
    const toV = parseDotNetVersion(String(toVersionInclusive).replace(/^v/, ''))
    if (fromV === null || toV === null) return ''
    const collect = []
    let inRange = false
    for (const line of lines) {
      const m = line.match(versionPattern)
      if (m) {
        const v = parseDotNetVersion(m[1])
        inRange = (v !== null && cmpArr(v, fromV) > 0 && cmpArr(v, toV) <= 0)
        continue // heading-nya sendiri tak ikut dikumpulkan
      }
      if (inRange) collect.push(line)
    }
    return collect.join('\n').trim()
  } catch { return '' }
}
function cmpArr(a, b) { for (let i = 0; i < 4; i++) { if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1 } return 0 }

// Tiruan Test-LintasChangelogLabel: deteksi label [SECURITY]/[BREAKING]/[SCAN-REQUIRED] di POSISI
// KONVENSIONAL awal baris. Dua pola (cermin update-kit.ps1):
//  (1) baris HEADING (#..######) yang DI MANA PUN memuat [LABEL] -> tangkap '### Diperbaiki [SECURITY]'
//      (label setelah teks judul, gaya entri CHANGELOG kit) + '### [SECURITY] ...' (label langsung).
//  (2) [LABEL] di AWAL baris setelah opsional butir (-/*) + bold (**) -> '- **[SECURITY]**', '[SECURITY]'.
// Anchored awal baris supaya penyebutan label di TENGAH prosa / di tengah butir-prosa TIDAK memicu
// alarm palsu. PS -match = TAK-peka huruf-besar-kecil -> flag 'i' (+ 'm' untuk ^ per-baris).
// SEJARAH: fix 2026-06-18 menambah '### [SECURITY]' (label langsung); fix 2026-06-25 menambah label
// SETELAH teks judul ('### Diperbaiki [SECURITY]') supaya banner keamanan tak hilang gara-gara gaya judul.
export function testChangelogLabel(body, label) {
  if (body == null || String(body).trim() === '') return false
  const esc = escapeRegex(label)
  const pattern = new RegExp(
    '^\\s*#{1,6}\\s+.*\\[' + esc + '\\]' +        // (1) baris heading memuat [LABEL] di mana pun
    '|^\\s*[-*]?\\s*\\*{0,2}\\[' + esc + '\\]',   // (2) [LABEL] di awal baris (butir/bold/polos)
    'mi'
  )
  return pattern.test(String(body))
}

// Tiruan Resolve-UpdateTier: klasifikasi "Tier 1".."Tier 4" dari isi entri CHANGELOG.
// Urutan cek (paling spesifik dulu): SCAN-REQUIRED -> BREAKING -> kata-kunci Tier 2 -> Tier 1 default.
export function resolveUpdateTier(entryBody) {
  try {
    if (entryBody == null || String(entryBody).trim() === '') return 'Tier 1'
    if (testChangelogLabel(entryBody, 'SCAN-REQUIRED')) return 'Tier 4'
    if (testChangelogLabel(entryBody, 'BREAKING')) return 'Tier 3'
    for (const kw of TIER2_KEYWORDS) {
      // PS -match = TAK-peka huruf-besar-kecil -> flag 'i'. Tak ter-anchor (cocok di mana saja).
      if (new RegExp(escapeRegex(kw), 'i').test(String(entryBody))) return 'Tier 2'
    }
    return 'Tier 1'
  } catch { return 'Tier 1' }
}

// Tiruan Format-UpdateSummary: susun ringkasan ramah staff non-programmer (pakai analogi tools digital).
// CATATAN PARITY: teks SENGAJA dipertahankan persis seperti PS (target uji-banding fungsi). PS pakai
// StringBuilder.AppendLine (akhir-baris Environment.NewLine = CRLF di Windows); versi Node pakai '\n'
// (akhir-baris beda = KOSMETIK; ringkasan dibaca manusia, dibanding per-baris saat uji-banding).
export function formatUpdateSummary(tier, entry) {
  const version = entry.version
  const body = entry.body
  let analogi = '', action = ''
  switch (tier) {
    case 'Tier 1':
      analogi = 'Tier 1 (kayak WhatsApp minor update, 2.23.10 -> 2.23.11)'
      action = 'Action: udah selesai. Tinggal pakai biasa, ga ada yang berubah cara kerjanya.'
      break
    case 'Tier 2':
      analogi = 'Tier 2 (kayak iPhone iOS 17.3 -> 17.4 minor, ada fitur baru)'
      action = 'Action: AI bakal otomatis pakai aturan/fitur baru sesi berikutnya. Restart chat = aman.'
      break
    case 'Tier 3':
      analogi = 'Tier 3 BREAKING (kayak iPhone iOS 16 -> iOS 17 major, backup wajib)'
      action = 'Action: BACA migration notes di CHANGELOG + UPGRADING.md, jalanin langkah migrasi yang tertera. Cadangan otomatis di folder .claude-kit.backup-<tanggal>.'
      break
    case 'Tier 4':
      analogi = 'Tier 4 SCAN-REQUIRED (kayak Tokopedia ganti algoritma kategori, perlu re-mapping)'
      action = 'Action: paste ulang isi JALANKAN_KIT.md ke Claude Code. AI bakal re-scan project & re-bootstrap.'
      break
    default:
      analogi = 'Unknown tier - treat as Tier 1 (paling aman)'
      action = 'Action: pakai biasa, monitor sesi berikutnya.'
  }
  const lines = []
  lines.push('')
  lines.push('============================================================')
  lines.push(`  Kit Update Summary - v${version}`)
  lines.push('============================================================')
  lines.push(`Klasifikasi: ${analogi}`)
  lines.push('')
  lines.push(action)
  lines.push('')
  lines.push('--- CHANGELOG entry (verbatim) ---')
  if (body == null || String(body).trim() === '') lines.push('(entry kosong)')
  else lines.push(body)
  lines.push('============================================================')
  return lines.join('\n') + '\n' // tiap AppendLine PS tambah akhir-baris (termasuk yang terakhir)
}

// Laporan "Langkah 5" update-kit: deteksi versi baru dari CHANGELOG kit BARU + pindai label penting +
// susun kotak PERHATIAN + saran langkah lanjut. Diiris dari badan orkestrator runUpdateInner (refactor
// hemat-token) mengikuti pola return-lines idiomatik repo (buildGuardStatusLines/buildCommitGuidance/
// formatUpdateSummary): fungsi MURNI (cuma baca CHANGELOG, tak menulis apa pun, tak process.exit) ->
// mudah diuji unit tanpa spawn (tests/update-report-lock.test.mjs). Pemanggil (runUpdateInner) mencetak
// tiap baris apa adanya -> keluaran byte-identik dengan versi inline lama. Return string[].
export function buildPostUpdateReportLines({ kitDir, currentVersion }) {
  const lines = []
  const newChangelog = path.join(kitDir, 'CHANGELOG.md')
  let newVersion = 'unknown'
  let newEntry = null
  if (fs.existsSync(newChangelog)) {
    newEntry = getLatestChangelogEntry(newChangelog)
    if (newEntry && newEntry.version) newVersion = String(newEntry.version).replace(/^v/, '').trim()
  }

  lines.push('')
  lines.push('=== Update selesai ===')
  lines.push(`Versi lama   : v${currentVersion}`)
  lines.push(`Versi baru   : v${newVersion}`)

  if (currentVersion !== newVersion && newVersion !== 'unknown') {
    lines.push('')
    lines.push(`Update v${currentVersion} -> v${newVersion} sukses!`)

    let breakingFound = false, scanRequiredFound = false, securityFound = false
    if (newEntry && newEntry.body) {
      let entryText = newEntry.body
      // Pindai SELURUH rentang (versi-lama, versi-baru] supaya label di versi-tengah yang dilewati kebaca.
      if (currentVersion && currentVersion !== 'unknown') {
        const rangeBody = getChangelogRangeBody(newChangelog, currentVersion, newVersion)
        if (rangeBody && rangeBody.trim() !== '') entryText = rangeBody
      }
      if (testChangelogLabel(entryText, 'BREAKING')) breakingFound = true
      if (testChangelogLabel(entryText, 'SCAN-REQUIRED')) scanRequiredFound = true
      if (testChangelogLabel(entryText, 'SECURITY')) securityFound = true
    }

    if (breakingFound || scanRequiredFound || securityFound) {
      lines.push('')
      lines.push('================================================================')
      lines.push('  PERHATIAN: VERSI INI ADA PERUBAHAN PENTING')
      lines.push('================================================================')
      // Penanda mesin-baca untuk AI (Keranjang 1 "eager" - rules/4.5-update-strategy.md).
      // Perintah ini skrip terminal; ia TAK bisa memunculkan popup sendiri - yang memunculkan popup
      // adalah AI yang membaca keluaran ini. Penanda dibuat eksplisit supaya AI tak perlu menebak dari
      // prosa: ADA penanda -> WAJIB tawarkan popup perbaiki; TAK ada -> DIAM (Tier 1/2 tak boleh
      // mengganggu kerja klien). Label dipisah koma supaya mudah dibaca mesin maupun manusia.
      const labelPenting = [securityFound && 'SECURITY', breakingFound && 'BREAKING', scanRequiredFound && 'SCAN-REQUIRED'].filter(Boolean)
      lines.push(`  [LINTASAI:PERLU-TINDAKAN] ${labelPenting.join(', ')}`)
      lines.push('  (AI: ini Keranjang 1 - WAJIB tawarkan popup perbaiki ke user, jangan diam.)')
      if (securityFound) {
        lines.push('  [SECURITY] Perbaikan KEAMANAN - pasang SEGERA, jangan tunda.')
        lines.push('             (Walau update kecil, ini menambal lubang keamanan.)')
      }
      if (breakingFound) {
        lines.push('  [BREAKING] Ada perubahan yang tidak backward-compatible.')
        lines.push(`             Baca CHANGELOG entri v${newVersion} sebelum lanjut kerja.`)
      }
      if (scanRequiredFound) {
        lines.push('  [SCAN-REQUIRED] Wajib regenerate docs/ supaya kompatibel.')
        lines.push('                  Re-paste isi .claude-kit\\PROJECT_LIFECYCLE_PROMPT_v1.md (Stage 2: Bikin Catatan Proyek)')
        lines.push('                  ke Claude Code untuk regenerate docs lama.')
      }
      lines.push('================================================================')
    }

    lines.push('')
    lines.push('Langkah lanjut yang disarankan:')
    lines.push(`  1. Baca CHANGELOG entri [v${newVersion}]:`)
    lines.push(`     ${newChangelog}`)
    lines.push('  2. Verifikasi berkas baru di docs/ + .github/ (kalau ada di catatan rilis).')
    lines.push('  3. Versi kit dibaca OTOMATIS dari baris atas .claude-kit/CHANGELOG.md (kini')
    lines.push(`     v${newVersion}) - TIDAK perlu edit AGENTS.md manual. Kalau AGENTS.md-mu masih`)
    lines.push("     punya baris lama 'Versi kit di .claude-kit/: vX.Y.Z', itu tak dipakai lagi (boleh dihapus).")
    if (!breakingFound && !scanRequiredFound && !securityFound) {
      lines.push('  4. Tidak ada label [BREAKING]/[SCAN-REQUIRED]/[SECURITY] - docs/ kamu AMAN, tak perlu scan ulang.')
      lines.push('  5. Kalau CHANGELOG sebut perubahan alur di JALANKAN_KIT.md:')
      lines.push('     Re-paste isi .claude-kit\\JALANKAN_KIT.md ke Claude Code.')
    } else {
      lines.push('  4. WAJIB ikuti instruksi PERHATIAN di atas sebelum kerja lanjut.')
    }
  } else if (currentVersion === newVersion) {
    lines.push('')
    lines.push(`Tidak ada perubahan versi (v${currentVersion}). Update mungkin cuma perbaikan kecil.`)
    lines.push('Cek CHANGELOG untuk detail.')
  }
  return lines
}

// Tiruan Invoke-BackupCleanup: bersihkan berkas cadangan (*.bak / *.backup-*) di akar project +
// rotasi FOLDER cadangan (.claude-kit.backup-*). Hapus yang > maxAgeDays hari, lalu per nama-dasar
// simpan keepLatest terbaru. Return jumlah yang dihapus. Aman: folder tak ada / tak ada cadangan -> 0.
// Pencocokan nama TAK-peka huruf-besar-kecil (NTFS Windows; cermin Get-ChildItem -Filter).
export function invokeBackupCleanup(projectRoot = '.', { maxAgeDays = 30, keepLatest = 3 } = {}) {
  try {
    if (!fs.existsSync(projectRoot)) {
      console.log(`[WARN] Project root tidak ada: ${projectRoot}`)
      return 0
    }
    const listFiles = (matcher) => {
      let out = []
      try {
        for (const e of fs.readdirSync(projectRoot, { withFileTypes: true })) {
          if (e.isFile() && matcher(e.name.toLowerCase())) out.push(path.join(projectRoot, e.name))
        }
      } catch { /* abaikan */ }
      return out
    }
    const listDirs = (matcher) => {
      let out = []
      try {
        for (const e of fs.readdirSync(projectRoot, { withFileTypes: true })) {
          if (e.isDirectory() && matcher(e.name.toLowerCase())) out.push(path.join(projectRoot, e.name))
        }
      } catch { /* abaikan */ }
      return out
    }
    const isBak = (n) => n.endsWith('.bak')
    const isBackupDash = (n) => n.includes('.backup-')
    const isKitBackupDir = (n) => n.startsWith('.claude-kit.backup-')

    // Cermin PS: dua Get-ChildItem digabung (.bak DAN .backup-*).
    let backupFiles = [...listFiles(isBak), ...listFiles(isBackupDash)]
    const backupDirsPre = listDirs(isKitBackupDir)
    if (backupFiles.length === 0 && backupDirsPre.length === 0) {
      console.log('Cleanup: tidak ada cadangan (berkas/folder) ditemukan.')
      return 0
    }

    let removed = 0
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
    const mtime = (p) => { try { return fs.statSync(p).mtimeMs } catch { return 0 } }

    // --- Langkah 1: hapus yang lebih tua dari maxAgeDays ---
    for (const f of backupFiles) {
      if (mtime(f) < cutoff) {
        try { fs.rmSync(f, { force: true }); removed++ }
        catch (e) { console.log(`[WARN] Gagal hapus ${path.basename(f)}: ${e.message}`) }
      }
    }

    // --- Langkah 2: per nama-dasar, simpan keepLatest terbaru ---
    // "Nama-dasar" = nama sebelum akhiran .bak / .backup-* (mis. AGENTS.md.backup-... -> "AGENTS.md").
    const remaining = [...listFiles(isBak), ...listFiles(isBackupDash)]
    const groups = new Map()
    for (const f of remaining) {
      const base = backupBaseName(path.basename(f))
      if (!groups.has(base)) groups.set(base, [])
      groups.get(base).push(f)
    }
    for (const [, grp] of groups) {
      if (grp.length <= keepLatest) continue
      const sorted = grp.slice().sort((a, b) => mtime(b) - mtime(a)) // terbaru dulu
      const excess = sorted.slice(keepLatest) // sisanya = paling lama
      for (const f of excess) {
        try { fs.rmSync(f, { force: true }); removed++ }
        catch (e) { console.log(`[WARN] Gagal hapus ${path.basename(f)}: ${e.message}`) }
      }
    }

    // --- Langkah 3: rotasi FOLDER cadangan .claude-kit.backup-* ---
    const backupDirs = listDirs(isKitBackupDir)
    if (backupDirs.length > keepLatest) {
      const excessDirs = backupDirs.slice().sort((a, b) => mtime(b) - mtime(a)).slice(keepLatest)
      for (const d of excessDirs) {
        try { fs.rmSync(d, { recursive: true, force: true }); removed++ }
        catch (e) { console.log(`[WARN] Gagal hapus folder cadangan ${path.basename(d)}: ${e.message}`) }
      }
    }

    console.log(`Cleanup: ${removed} cadangan/folder lama dihapus (> ${maxAgeDays} hari atau di luar ${keepLatest} terbaru).`)
    return removed
  } catch (e) {
    console.log(`[ERROR] Bersih-bersih cadangan gagal total: ${e.message}`)
    return 0
  }
}
// Nama-dasar berkas cadangan. Cermin PS -match (TAK-peka huruf-besar-kecil) -> flag 'i'.
function backupBaseName(name) {
  let m = name.match(/^(.+?)\.backup-/i)
  if (m) return m[1]
  m = name.match(/^(.+?)\.bak$/i)
  if (m) return m[1]
  return name
}

// ============================================================================================
// PENGURAIAN ARGUMEN
// ============================================================================================
export function parseArgs(argv) {
  const a = {
    noBackup: false,
    repoUrl: DEFAULT_REPO_URL,
    branch: 'main',
    dryRun: false,
    checkOnly: false,
    allowUntrustedRepo: false,
    force: false,
    allowUnsignedTag: false,
    cleanupBackups: false,
    yesDeleteNoBackup: false,
    projectRoot: null,
    noGui: false,
    // Izinkan TURUN versi (TUF anti-rollback default menolaknya). Sengaja tanpa alias singkat: ini
    // pintu darurat sadar, bukan bendera harian.
    allowDowngrade: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const t = String(argv[i]).toLowerCase()
    if (t === '--no-backup' || t === '--nobackup') a.noBackup = true
    else if (t === '--repo-url' || t === '--repourl') a.repoUrl = argv[++i] ?? a.repoUrl
    else if (t === '--branch') a.branch = argv[++i] ?? a.branch
    else if (t === '--dry-run' || t === '--dryrun' || t === '--simulasi') a.dryRun = true
    else if (t === '--check-only' || t === '--checkonly') a.checkOnly = true
    else if (t === '--allow-untrusted-repo' || t === '--allowuntrustedrepo') a.allowUntrustedRepo = true
    else if (t === '--force') a.force = true
    else if (t === '--allow-unsigned-tag' || t === '--allowunsignedtag') a.allowUnsignedTag = true
    else if (t === '--cleanup-backups' || t === '--cleanupbackups') a.cleanupBackups = true
    else if (t === '--yes-delete-no-backup' || t === '--yesdeletenobackup') a.yesDeleteNoBackup = true
    else if (t === '--no-gui' || t === '--nogui') a.noGui = true
    else if (t === '--allow-downgrade' || t === '--allowdowngrade') a.allowDowngrade = true
    else if (t === '--project-root' || t === '--projectroot') a.projectRoot = argv[++i] ?? null
  }
  return a
}

// ============================================================================================
// ORKESTRATOR UTAMA
// ============================================================================================
// Pembungkus: pegang kunci "cuma 1 update per project" selama kerja yang MENGUBAH berkas.
// Kenapa dibungkus (bukan disisipkan ke dalam): runUpdateInner punya belasan titik `return`; try/finally
// di sini menjamin kunci SELALU dilepas tanpa harus menaruh release() di tiap cabang (satu cabang lupa =
// project terkunci sampai kunci kedaluwarsa).
// Mode cuma-baca (--check-only) & SIMULASI tak mengubah apa pun -> tak perlu kunci, dan tak boleh
// terhalang update lain yang sedang jalan.
export function runUpdate(argv) {
  const args = parseArgs(argv)
  if (args.checkOnly || args.dryRun) return runUpdateInner(argv)

  let projectRoot = null
  try {
    projectRoot = args.projectRoot != null && String(args.projectRoot).trim() !== ''
      ? fs.realpathSync(path.resolve(String(args.projectRoot)))
      : path.dirname(__dirname)
  } catch {
    return runUpdateInner(argv) // biar runUpdateInner yang melapor akar project tak ketemu (pesannya lebih baik)
  }

  const lock = acquireUpdateLock(projectRoot)
  if (!lock.ok) {
    console.log('')
    console.log(pesanKunciDitolak(lock))
    return 1
  }
  if (lock.takenOver) {
    console.log('')
    console.log(`INFO  Ada penanda update lama (~${Math.round(lock.ageMinutes)} menit) - sepertinya update sebelumnya`)
    console.log('      berhenti mendadak. Penanda itu diambil alih, update ini lanjut.')
  }
  try {
    return runUpdateInner(argv)
  } finally {
    const r = lock.release()
    if (!r.ok) {
      console.log('')
      console.log(`WARN  Gagal membuang penanda update (${r.error}).`)
      console.log(`      Kalau update berikutnya bilang "ada update lain jalan", hapus folder: ${lock.lockDir}`)
    }
  }
}

function runUpdateInner(argv) {
  const args = parseArgs(argv)

  // ---- Resolusi akar project (cermin update-kit.ps1:131-175) ----
  const projectRootExplicit = args.projectRoot != null && String(args.projectRoot).trim() !== ''
  let projectRoot
  if (!projectRootExplicit) {
    projectRoot = path.dirname(__dirname) // induk dari .claude-kit/ = akar project
  } else {
    try { projectRoot = fs.realpathSync(path.resolve(String(args.projectRoot))) }
    catch { console.log(`ERROR: --project-root tidak ditemukan: ${args.projectRoot}`); return 1 }
  }
  console.log(`Root proyek   : ${projectRoot}`)

  // ---- Resolusi path (cermin: kalau --project-root eksplisit, kit = projectRoot/.claude-kit) ----
  const kitDir = projectRootExplicit ? path.join(projectRoot, '.claude-kit') : __dirname
  const kitFolderName = path.basename(kitDir)
  const timestamp = backupStamp(new Date())
  const backupDir = `${kitDir}.backup-${timestamp}`

  // ---- Penyelamat: kit HILANG tapi ada folder cadangan yatim ----
  // Kondisi ini nyata di lapangan pada updater versi LAMA: urutannya rename-kit-jadi-cadangan DULU baru
  // ambil versi baru, tanpa satu pun penangan sinyal -> Ctrl-C/listrik padam = .claude-kit LENYAP dan
  // cuma menyisakan .claude-kit.backup-<cap>. Menjalankan update lagi malah gagal dengan pesan
  // MENYESATKAN ("berkas terkunci / antivirus") karena rename sumbernya ENOENT - dan tak ada satu pun
  // yang memberi tahu bahwa kit lengkapnya duduk diam di sebelah. Klien non-programmer buntu total.
  // Kita TIDAK memulihkan otomatis (isi cadangan = keputusan pemilik project), tapi WAJIB menunjukkan
  // jalan keluarnya dengan jelas. Update baru (staging-first) tak bisa lagi menciptakan kondisi ini.
  if (!fs.existsSync(kitDir)) {
    const yatim = findOrphanBackups(projectRoot)
    if (yatim.length > 0) {
      console.log('')
      console.log(`BERHENTI: Folder kit '${kitDir}' TIDAK ADA, tapi ada cadangan yang tertinggal:`)
      for (const y of yatim.slice(0, 3)) console.log(`  - ${path.basename(y)}`)
      console.log('')
      console.log('Sepertinya update sebelumnya berhenti di tengah jalan (mati listrik / Ctrl-C /')
      console.log('komputer restart). Kit kamu TIDAK hilang - dia ada di folder cadangan di atas.')
      console.log('')
      console.log('Cara mengembalikannya (pilih cadangan paling baru):')
      console.log(`  ganti nama folder '${path.basename(yatim[0])}' menjadi '.claude-kit'`)
      console.log('lalu jalankan update lagi. Atau minta AI: "kit-ku hilang, tolong pulihkan dari cadangan".')
      console.log('')
      console.log('TIDAK ADA satu pun berkas yang disentuh. Aman.')
      return 1
    }
  }

  // ---- Validasi posisi: folder kit HARUS bernama .claude-kit (cermin uninstall.mjs hard-stop) ----
  // Kalau BUKAN: clone mendarat di '.claude-kit' (folder BARU) sementara backup/GPG/setup pakai kitDir
  // (folder LAMA) -> jadi 2 folder + langkah verifikasi/setup menyasar folder yang sudah jadi backup
  // (GPG fail-open, setup no-op). Fail-closed: BERHENTI di sini, jangan biarkan update separuh-jadi.
  if (kitFolderName !== '.claude-kit') {
    console.log('')
    console.log(`BERHENTI: Folder kit ini bernama '${kitFolderName}', bukan '.claude-kit'.`)
    console.log('          Update dirancang untuk Pola B (.claude-kit/ di akar proyek).')
    console.log('Kemungkinan:')
    console.log('  (A) Kamu jalankan dari folder SALAH (project ini belum pernah pasang lintasAI).')
    console.log('  (B) Folder kit di-rename dari .claude-kit ke nama lain (rename balik lalu ulangi).')
    console.log('')
    console.log('TIDAK ADA satu pun berkas yang disentuh. Aman.')
    return 1
  }

  console.log('')
  console.log('=== Update Kit lintasAI ===')
  console.log(`Kit folder    : ${kitDir}`)
  console.log(`Project root  : ${projectRoot}`)
  // JUJUR soal sumber: jalur non-repo menyalin paket lintasAI YANG SEDANG BERJALAN (__dirname). Lewat
  // `npx lintasai@latest update` itu = paket npm resmi yang baru diunduh & diverifikasi npm. Tapi kalau
  // dijalankan langsung dari repo-dev (`node update-kit.mjs ...`), yang tersalin = repo-dev itu - termasuk
  // kerjaan yang belum di-commit. Menyebutnya "paket npm resmi" tanpa syarat = klaim yang bisa keliru.
  console.log(`Sumber        : paket lintasAI yang sedang berjalan (${__dirname})`)
  console.log(`Backup        : ${args.noBackup ? 'DIMATIKAN (--no-backup)' : backupDir}`)
  if (args.dryRun) console.log('Mode          : SIMULASI (tidak ada perubahan berkas)')
  console.log('')

  // ---- Pra-cek: deteksi versi kit sekarang (dari .install-manifest.json) ----
  const manifestPath = path.join(kitDir, '.install-manifest.json')
  let currentVersion = null
  let manifestPresent = false
  if (fs.existsSync(manifestPath)) {
    manifestPresent = true
    try {
      const raw = stripBom(fs.readFileSync(manifestPath, 'utf8'))
      const obj = JSON.parse(raw)
      if (obj && obj.metadata && obj.metadata.kit_version) {
        currentVersion = String(obj.metadata.kit_version).replace(/^v/, '').trim()
      }
    } catch (e) {
      console.log(`WARN  Gagal urai .install-manifest.json: ${e.message}`)
    }
  }
  const canCheckRemote = Boolean(currentVersion)
  if (currentVersion) {
    console.log(`OK    Versi sekarang (manifest): ${currentVersion}`)
  } else if (manifestPresent) {
    console.log('WARN  manifest ada tapi metadata.kit_version kosong - lewati cek versi.')
    currentVersion = 'unknown'
  } else {
    console.log('INFO  .install-manifest.json tidak ada - anggap pasang-baru, lewati cek versi.')
    currentVersion = 'unknown'
  }

  // ---- JALUR npm (DEFAULT): bahan = paket lintasai yang SUDAH diunduh & diverifikasi npx ----
  // Kenapa bukan mengunduh sendiri: saat klien mengetik `npx lintasai@latest update`, npm SUDAH menarik
  // + memverifikasi integritas (sha512) paket ini untuk bisa menjalankan perintah ini. Paketnya sudah
  // ada di disk (__dirname). Mengunduh ulang = menulis kode jaringan sendiri (proxy/mirror korporat,
  // .npmrc, auth, verifikasi) yang semuanya sudah beres di npm = permukaan bug baru tanpa manfaat.
  // Mekanisme salinnya pun bukan barang baru: identik dengan yang dipakai `npm create lintasai@latest`
  // tiap hari (setup-pola-b.mjs mode npx: cpSync + shouldCopyKitEntry).
  {
    const selfKitDir = __dirname
    const selfVersion = getKitVersionFromChangelog(path.join(selfKitDir, 'CHANGELOG.md'))
    console.log('')
    console.log('Cek versi terbaru di npm...')
    const latestNpm = getLatestNpmVersion()
    console.log(latestNpm ? `OK    Versi terbaru di npm: v${latestNpm}` : 'INFO  Belum bisa menghubungi npm (offline?) - cek versi terbaru dilewati.')

    const rencana = decideNpmUpdate({
      selfKitDir,
      kitDir,
      selfVersion,
      installedVersion: currentVersion,
      latestNpmVersion: latestNpm,
      allowDowngrade: args.allowDowngrade,
    })

    if (args.checkOnly) {
      console.log('')
      console.log(rencana.message)
      console.log('Mode cek-saja: TIDAK ada perubahan dilakukan.')
      return 0
    }
    if (rencana.action === 'uptodate') {
      console.log('')
      console.log(`[OK] ${rencana.message}`)
      return 0
    }
    if (rencana.action === 'stop') {
      console.log('')
      console.log('BERHENTI (kit kamu TIDAK diubah):')
      for (const baris of String(rencana.message).split('\n')) console.log(`  ${baris}`)
      return 1 // update TIDAK terjadi -> kode-keluar WAJIB bukan 0 (jangan bohongi skrip/CI/AI)
    }

    console.log('')
    console.log(`[INFO] ${rencana.message}`)

    if (args.dryRun) {
      console.log('')
      console.log(`[SIMULASI] Akan menyiapkan kit v${rencana.toVersion} dari paket npm, memeriksanya, lalu menukar.`)
      console.log(`[SIMULASI] Cadangan versi lama: ${backupDir}`)
      return 0
    }

    // (1) SIAPKAN di sebelah - kit klien belum tersentuh sama sekali.
    const stagingDir = `${kitDir}.new-${timestamp}`
    console.log('')
    console.log('Langkah A: Siapkan kit baru di folder sementara (kit lama belum disentuh)...')
    discardStaging(stagingDir) // sisa percobaan sebelumnya yang mati di tengah
    const siap = stageFromDirectory(selfKitDir, stagingDir, (src) => shouldCopyKitEntry(src, selfKitDir))
    if (!siap.ok) {
      console.log(`ERROR: Gagal menyiapkan kit baru: ${siap.error}`)
      console.log('       Kemungkinan: antivirus mengunci berkas, path kepanjangan (>260), atau disk penuh.')
      console.log('       Kit kamu TIDAK diubah - aman. Perbaiki penyebab di atas lalu ulangi.')
      discardStaging(stagingDir)
      return 1
    }

    // (2) PERIKSA sebelum menukar - jangan pernah tinggalkan kit lama demi isi yang cacat.
    console.log('Langkah B: Periksa kelengkapan kit baru sebelum menukar...')
    const periksa = validateKitContents(stagingDir)
    if (!periksa.ok) {
      console.log(`ERROR: Kit baru tidak lengkap - yang hilang: ${periksa.missing.join(', ')}`)
      console.log('       Update DIBATALKAN. Kit kamu TIDAK diubah - aman.')
      discardStaging(stagingDir)
      return 1
    }
    console.log('OK    Kit baru lengkap.')

    // (3) TUKAR (2 rename berurutan = milidetik). Gagal -> kit lama dikembalikan otomatis.
    console.log('Langkah C: Tukar kit lama dengan kit baru...')
    const tukar = swapInKit({ kitDir, stagingDir, backupDir, keepBackup: !args.noBackup })
    if (!tukar.ok) {
      console.log(`ERROR: ${tukar.error}`)
      discardStaging(stagingDir)
      return 1
    }
    console.log(`OK    Kit baru terpasang.${tukar.backupPath ? ` Cadangan versi lama: ${tukar.backupPath}` : ''}`)
  }

  // ---- Mode cek-saja (cuma-baca): lapor status lalu berhenti TANPA mengubah apa pun ----
  if (args.checkOnly) {
    if (!canCheckRemote) {
      console.log('[i] Belum bisa banding versi (belum ada catatan-pasang / pasang-baru).')
      console.log("    Cek versi terbaru di npm: jalankan 'npm view lintasai version'.")
    }
    console.log('Mode cek-saja: TIDAK ada perubahan dilakukan.')
    console.log("Kalau mau update: minta AI 'tolong update kit', atau jalankan 'npx lintasai update'.")
    return 0
  }

  // Ingatkan editan DI DALAM .claude-kit/ akan diganti (versi lama aman di folder cadangan).
  if (!args.dryRun && !args.noBackup) {
    console.log('')
    console.log('Catatan: kalau kamu pernah MENGEDIT berkas DI DALAM .claude-kit/ (mis. aturan lokal),')
    console.log('         editan itu akan diganti versi baru; versi lamamu tetap aman di folder cadangan.')
  }

  // ---- Langkah 3b: Migrasi STRUKTUR artefak klien (ADR-027 v3.0.0 - lib/->engine/, workflows/->rules/) ----
  // Klien v1/v2 punya command hook di .claude/settings.json yang masih menunjuk `.claude-kit/lib/*`.
  // Kit baru (engine/) sudah terpasang -> path lib/ itu basi (folder lib/ ikut pindah ke cadangan) ->
  // hook mati diam-diam. Betulkan DI SINI, SEBELUM Langkah 4: kalau ditaruh SESUDAH setup-pola-b,
  // ensure-*-hook keburu menganggap hook "sudah ada" (penandanya nama-berkas, BUTA segmen path) ->
  // path lib/ basi tak pernah dibetulkan. IDEMPOTEN: klien yang sudah v3 (tak ada pola lama) = no-op.
  console.log('')
  console.log('Langkah 3b: Migrasi struktur artefak klien (settings.json: path lib/->engine/, workflows/->rules/)...')
  try {
    invokeMigrateClientStructure(projectRoot, { dryRun: args.dryRun })
  } catch (e) {
    console.log(`WARN  Migrasi struktur klien bermasalah: ${e.message}`)
    console.log('      Kit sudah terpasang; betulkan referensi path lama di .claude/settings.json manual bila perlu.')
  }

  // ---- Langkah 4: Jalankan ulang pemasang (-Force, anti-timpa docs/) ----
  console.log('')
  console.log('Langkah 4: Jalankan ulang pemasang (anti-timpa untuk docs/ yang sudah ada)...')
  if (args.dryRun) {
    console.log(`[SIMULASI] jalankan pemasang ulang: setup-pola-b (--force --project-root '${projectRoot}')`)
  } else {
    const setupMjs = path.join(kitDir, 'setup-pola-b.mjs')
    if (fs.existsSync(setupMjs)) {
      // v2.0.0: pemasang Node (kit 100% Node).
      const r = spawnSync(process.execPath, [setupMjs, '--force', '--project-root', projectRoot], { stdio: 'inherit', timeout: 600000 })
      if (r.error || r.status !== 0) {
        console.log(`WARN  Pemasang Node bermasalah (kode ${r.status ?? 'error'}). Berkas kit sudah ter-ambil, tapi setup mungkin tak komplit.`)
        console.log('      Jalankan manual: node .\\.claude-kit\\setup-pola-b.mjs --force')
      }
    } else {
      console.log('WARN  Pemasang setup-pola-b.mjs tak ada di kit baru - lewati.')
    }
  }

  // ---- Langkah 5: Deteksi versi baru + beda CHANGELOG + peringatan label ----
  if (!args.dryRun) {
    // Laporan Langkah-5 diiris ke buildPostUpdateReportLines (fungsi murni, return-lines; string byte-identik,
    // dikunci tests/update-report-lock.test.mjs). Pemanggil cuma mencetak tiap baris apa adanya.
    for (const line of buildPostUpdateReportLines({ kitDir, currentVersion })) console.log(line)

    // ---- Langkah 6: Cek kesehatan kit baru (doctor) ----
    const newKitMjs = path.join(kitDir, 'kit.mjs')
    let doctorExit = null
    if (fs.existsSync(newKitMjs)) {
      console.log('')
      console.log('Langkah 6: Cek kesehatan kit baru (doctor)...')
      // --skip-migrasi: laporan migrasi artefak klien dijalankan TERPISAH di Langkah 7 (dengan
      // penjelasan yang benar). Kalau ikut di doctor sini, artefak-tertinggal bikin doctor merah ->
      // pesan "update mungkin tak lengkap" + saran rollback di bawah jadi MENYESATKAN (kit-nya
      // sendiri sehat; yang tertinggal = berkas milik project). Kit baru versi lama tak kenal
      // bendera ini -> diabaikan tanpa efek (aman dua arah).
      // --skip-cek-versi: kita BARU SAJA memasang versi terbaru, jadi menanya npm lagi cuma menambah
      // tunggu jaringan + berisiko bikin laporan membingungkan. Kit versi lama tak kenal bendera ini ->
      // diabaikan tanpa efek (aman dua arah, sama seperti --skip-migrasi).
      const r = spawnSync(process.execPath, [newKitMjs, 'doctor', '--skip-migrasi', '--skip-cek-versi'], { stdio: 'inherit', timeout: 300000 })
      doctorExit = r.error ? 1 : r.status
    }
    if (doctorExit !== null && doctorExit !== 0) {
      console.log('')
      console.log(`WARN  Doctor menemukan masalah di kit baru (kode ${doctorExit}) - update mungkin tak lengkap.`)
      if (!args.noBackup && fs.existsSync(backupDir)) {
        console.log('      Versi lama AMAN tersimpan UTUH di folder cadangan:')
        console.log(`        ${backupDir}`)
        console.log("      Cara balik ke versi lama (paling mudah): minta AI -> 'rollback dong'")
        console.log('      Atau manual - kembalikan folder cadangan (2 langkah):')
        console.log(`        1) pindahkan '${kitDir}' ke '${kitDir}.broken-${timestamp}'`)
        console.log(`        2) pindahkan '${backupDir}' ke '${kitDir}'`)
        console.log("      (CATATAN: 'rollback' hanya memulihkan berkas project per-satuan, BUKAN folder kit ini.)")
      } else {
        console.log('      Tidak ada cadangan (--no-backup) - perbaiki manual: jalankan update lagi.')
      }
    } else if (doctorExit === 0) {
      console.log('OK    Kit baru sehat (doctor lulus).')
    }

    // ---- Langkah 7: Laporan migrasi artefak klien (Mesin 2 STRATEGI_UPDATE_v2 Langkah 3) ----
    // Jalankan robot MILIK KIT BARU (proses anak, bukan import dari kit lama yang sedang berjalan) -
    // yang dibanding = peta versi-diharapkan kit BARU. Non-fatal untuk update (kit sudah terpasang
    // benar); hasil "Selesai sebagian" = pekerjaan lanjutan di berkas project, BUKAN alasan rollback.
    const migrationRobot = path.join(kitDir, 'engine', 'migration-state.mjs')
    if (fs.existsSync(migrationRobot)) {
      console.log('')
      console.log('Langkah 7: Banding artefak klien vs versi yang diharapkan kit BARU (laporan migrasi)...')
      // Tangkap keluaran supaya bisa BEDAKAN "robot crash" vs "robot melapor artefak tertinggal"
      // (dua-duanya exit !=0). Pembeda: baris penanda laporan (kontrak string dgn
      // engine/migration-state.mjs - cermin kit.mjs doctor 2c). Crash -> saran perbaiki kit, BUKAN
      // saran migrasi CHANGELOG yang salah arah. stderr sengaja tak ditampilkan (jejak-error
      // mentah bisa memuat path komputer; jalankan manual kalau butuh detail).
      const rm = spawnSync(process.execPath, [migrationRobot, '--project-root', projectRoot, '--kit-dir', kitDir], { encoding: 'utf8', timeout: 60000 })
      const robotOut = rm.stdout || ''
      if (robotOut.trim()) process.stdout.write(robotOut)
      const reportPrinted = robotOut.includes('Robot laporan-migrasi artefak klien')
      if (rm.error || rm.status == null || (rm.status !== 0 && !reportPrinted)) {
        console.log('WARN  Robot laporan-migrasi gagal dijalankan / berhenti sebelum melapor - salinan kit baru mungkin')
        console.log('      tidak lengkap. Jalankan doctor untuk cek: node .claude-kit/kit.mjs doctor')
        console.log('      (detail error robot: jalankan manual node .claude-kit/engine/migration-state.mjs)')
      } else if (rm.status !== 0) {
        console.log('')
        console.log('CATATAN: "Selesai sebagian" di atas BUKAN kegagalan update - berkas kit sendiri sudah baru semua.')
        console.log('         Yang tertinggal = berkas milik project (di luar .claude-kit/). JANGAN rollback karena ini;')
        console.log('         ikuti langkah migrasi di entri CHANGELOG ber-label [BREAKING] versi terkait.')
      }
    } else {
      console.log('')
      console.log('INFO  Laporan migrasi dilewati: kit baru belum punya robotnya (engine/migration-state.mjs).')
    }

    if (!args.noBackup && fs.existsSync(backupDir)) {
      console.log('')
      console.log('Cadangan lama tersimpan di:')
      console.log(`  ${backupDir}`)
      console.log('')
      console.log('Hapus cadangan kalau sudah yakin update sukses:')
      console.log(`  hapus folder '${backupDir}'`)
    }
  }

  console.log('')

  // ---- Klasifikasi tier + ringkasan (selalu jalan, non-fatal) ----
  try {
    console.log('')
    console.log('[*] Klasifikasi tier update dari CHANGELOG...')
    let changelogPath = path.join(kitDir, 'CHANGELOG.md')
    if (!fs.existsSync(changelogPath)) changelogPath = path.join(process.cwd(), '.claude-kit', 'CHANGELOG.md')
    const entry = getLatestChangelogEntry(changelogPath)
    if (entry) {
      const tier = resolveUpdateTier(entry.body)
      const summary = formatUpdateSummary(tier, entry)
      console.log(summary)
    } else {
      console.log('[WARN] Lewati klasifikasi tier - CHANGELOG tak bisa diurai.')
    }
  } catch (e) {
    console.log(`[WARN] Klasifikasi tier error (non-fatal): ${e.message}`)
  }

  // ---- Bersih-bersih cadangan - OPT-IN via --cleanup-backups (default MATI) ----
  if (args.cleanupBackups) {
    try {
      console.log('')
      console.log('[*] Bersih-bersih cadangan lama (--cleanup-backups aktif)...')
      const rootForCleanup = projectRoot || '.'
      invokeBackupCleanup(rootForCleanup, { maxAgeDays: 30, keepLatest: 3 })
    } catch (e) {
      console.log(`[WARN] Bersih-bersih cadangan error (non-fatal): ${e.message}`)
    }
  } else {
    console.log('')
    console.log('[i] Bersih-bersih cadangan DILEWATI (opt-in via --cleanup-backups).')
    console.log('    Berkas *.bak / *.backup-* di akar proyek tidak diutak-atik.')
    console.log('    Jalankan ulang dengan --cleanup-backups kalau mau auto-hapus cadangan > 30 hari.')
  }

  console.log('OK update-kit.mjs selesai.')
  return 0
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  process.exitCode = runUpdate(process.argv.slice(2))
}
