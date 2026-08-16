// engine/update-changelog.mjs — LOGIKA MURNI seputar CHANGELOG + versi untuk alat update.
//
// Dipecah dari update-kit.mjs (Fase E 2026-07-25): isi dipindah APA ADANYA — pola regex, urutan cek,
// dan tiap string keluaran byte-identik (beberapa di antaranya KONTRAK yang dikunci tes, lihat bawah).
// KENAPA dipisah: semua fungsi di sini murni-baca (tak menulis/menghapus/spawn apa pun), jadi bisa
// diuji tanpa menyentuh disk — sementara berkas induk mengurus orkestrasi yang menukar folder kit.
//
// KONTRAK YANG DIKUNCI TES (jangan ubah teksnya tanpa memperbarui produsen+tesnya):
//   - penanda mesin '[LINTASAI:PERLU-TINDAKAN]' + urutan label SECURITY, BREAKING, SCAN-REQUIRED
//     (tests/update-report-lock.test.mjs) — ini kontrak dengan AI pembaca keluaran, bukan sekadar prosa.
//   - deteksi label [SECURITY]/[BREAKING]/[SCAN-REQUIRED] (tests/changelog-labels.test.mjs).
import fs from 'node:fs'
import path from 'node:path'
import { stripBom } from './fs-text.mjs'
import { NAMA_FOLDER_KIT } from './project-root.mjs'

// Kata kunci Tier 2 (fitur/aturan baru) - spesifik supaya tak salah-vonis.
const TIER2_KEYWORDS = [
  'tambah section', 'fitur baru', 'aturan AI', 'aturan baru', 'panduan baru',
  'section baru', 'rule baru', 'tambah fitur', 'tambah aturan', 'tambah panduan',
]

function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

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

// Ambil entri versi PALING ATAS (= terbaru) dari CHANGELOG.
// Pola heading FLEKSIBEL: "## [1.2.3]" (Keep-a-Changelog) / "## v1.2.3" (gaya lama).
// Return { version: '1.2.3' (tanpa 'v'), body: '...' } atau null. (Catatan: pola pakai \s* bukan \s+.)
export function getLatestChangelogEntry(changelogPath) {
  if (!changelogPath || !fs.existsSync(changelogPath)) return null
  let content
  try { content = fs.readFileSync(changelogPath, 'utf8') } catch { return null }
  content = stripBom(content)
  const lines = content.split(/\r\n|\r|\n/) // pecah \r\n, \r-tunggal, \n
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

// Gabung body SEMUA entri di rentang (fromExclusive, toInclusive].
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

// Deteksi label [SECURITY]/[BREAKING]/[SCAN-REQUIRED] di POSISI
// KONVENSIONAL awal baris. Dua pola:
//  (1) baris HEADING (#..######) yang DI MANA PUN memuat [LABEL] -> tangkap '### Diperbaiki [SECURITY]'
//      (label setelah teks judul, gaya entri CHANGELOG kit) + '### [SECURITY] ...' (label langsung).
//  (2) [LABEL] di AWAL baris setelah opsional butir (-/*) + bold (**) -> '- **[SECURITY]**', '[SECURITY]'.
// Anchored awal baris supaya penyebutan label di TENGAH prosa / di tengah butir-prosa TIDAK memicu
// alarm palsu. Cocokkan TAK-peka huruf-besar-kecil -> flag 'i' (+ 'm' untuk ^ per-baris).
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

// Klasifikasi "Tier 1".."Tier 4" dari isi entri CHANGELOG.
// Urutan cek (paling spesifik dulu): SCAN-REQUIRED -> BREAKING -> kata-kunci Tier 2 -> Tier 1 default.
export function resolveUpdateTier(entryBody) {
  try {
    if (entryBody == null || String(entryBody).trim() === '') return 'Tier 1'
    if (testChangelogLabel(entryBody, 'SCAN-REQUIRED')) return 'Tier 4'
    if (testChangelogLabel(entryBody, 'BREAKING')) return 'Tier 3'
    for (const kw of TIER2_KEYWORDS) {
      // Cocokkan TAK-peka huruf-besar-kecil -> flag 'i'. Tak ter-anchor (cocok di mana saja).
      if (new RegExp(escapeRegex(kw), 'i').test(String(entryBody))) return 'Tier 2'
    }
    return 'Tier 1'
  } catch { return 'Tier 1' }
}

// Susun ringkasan update ramah staff non-programmer — klasifikasi tier + aksi,
// TANPA analogi (§1.4: jelaskan polos & langsung). Teks dibaca manusia; akhir-baris pakai '\n'.
export function formatUpdateSummary(tier, entry) {
  const version = entry.version
  const body = entry.body
  let klasifikasi = '', action = ''
  switch (tier) {
    case 'Tier 1':
      klasifikasi = 'Tier 1 — perbaikan ringan, tak ada perubahan cara kerja'
      action = 'Action: udah selesai. Tinggal pakai biasa, ga ada yang berubah cara kerjanya.'
      break
    case 'Tier 2':
      klasifikasi = 'Tier 2 — ada fitur/aturan baru, versi lama tetap jalan'
      action = 'Action: AI bakal otomatis pakai aturan/fitur baru sesi berikutnya. Restart chat = aman.'
      break
    case 'Tier 3':
      klasifikasi = 'Tier 3 BREAKING — wajib backup + ikuti langkah migrasi'
      action = `Action: BACA migration notes di CHANGELOG + UPGRADING.md, jalanin langkah migrasi yang tertera. Cadangan otomatis di folder ${NAMA_FOLDER_KIT}.backup-<tanggal>.`
      break
    case 'Tier 4':
      klasifikasi = 'Tier 4 SCAN-REQUIRED — perlu re-scan + re-mapping project'
      action = 'Action: minta AI membaca ulang struktur project (git ls-files / Grep) lalu menyesuaikan docs yang terdampak.'
      break
    default:
      klasifikasi = 'Tier tak dikenal — perlakukan sebagai Tier 1 (paling aman)'
      action = 'Action: pakai biasa, monitor sesi berikutnya.'
  }
  const lines = []
  lines.push('')
  lines.push('============================================================')
  lines.push(`  Kit Update Summary - v${version}`)
  lines.push('============================================================')
  lines.push(`Klasifikasi: ${klasifikasi}`)
  lines.push('')
  lines.push(action)
  lines.push('')
  lines.push('--- CHANGELOG entry (verbatim) ---')
  if (body == null || String(body).trim() === '') lines.push('(entry kosong)')
  else lines.push(body)
  lines.push('============================================================')
  return lines.join('\n') + '\n' // akhir-baris di tiap baris, termasuk yang terakhir
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
      // Penanda mesin-baca untuk AI (Keranjang 1 "eager" - UPGRADING.md).
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
        lines.push('  [SCAN-REQUIRED] Catatan docs/ yang terdampak perlu ditinjau ulang.')
        lines.push('                  Minta AI perbarui catatan per-berkas yang relevan (on-demand).')
      }
      lines.push('================================================================')
    }

    lines.push('')
    lines.push('Langkah lanjut yang disarankan:')
    lines.push(`  1. Baca CHANGELOG entri [v${newVersion}]:`)
    lines.push(`     ${newChangelog}`)
    lines.push('  2. Verifikasi berkas baru di docs/ + .github/ (kalau ada di catatan rilis).')
    lines.push(`  3. Versi kit dibaca OTOMATIS dari baris atas ${NAMA_FOLDER_KIT}/CHANGELOG.md (kini`)
    lines.push(`     v${newVersion}) - TIDAK perlu edit AGENTS.md manual. Kalau AGENTS.md-mu masih`)
    lines.push(`     punya baris lama 'Versi kit di ${NAMA_FOLDER_KIT}/: vX.Y.Z', itu tak dipakai lagi (boleh dihapus).`)
    if (!breakingFound && !scanRequiredFound && !securityFound) {
      lines.push('  4. Tidak ada label [BREAKING]/[SCAN-REQUIRED]/[SECURITY] - docs/ kamu AMAN, tak perlu scan ulang.')
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
