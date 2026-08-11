#!/usr/bin/env node
// engine/migrate-client-struktur.mjs - Migrator STRUKTUR artefak klien (ADR-027 Task 14).
//
// MASALAH (v3.0.0 breaking, ADR-027): Task 13 me-rename folder kit `lib/`->`engine/` +
// `workflows/`->`rules/`. Saat klien v1/v2 menjalankan `npx lintasai@latest update`, folder
// .claude-kit/ DIGANTI UTUH oleh kit baru (isi engine/+rules/) - folder lib/workflows lama IKUT
// pindah ke .claude-kit.backup-<timestamp>, TIDAK tersisa yatim. TAPI referensi path di LUAR
// .claude-kit/ tetap BASI, terutama command hook di .claude/settings.json yang masih menunjuk
// `node .claude-kit/lib/risk-gate.js` (folder lib/ sudah lenyap -> hook mati diam-diam).
//
// KENAPA ensure-*-hook TAK BISA memperbaiki sendiri: penanda idempotennya = NAMA-BERKAS saja
// (`command.includes('risk-gate.js')`), buta terhadap segmen path lib/ vs engine/. Ia melihat
// 'risk-gate.js' sudah terdaftar -> changed:false -> path lib/ basi DIBIARKAN. Melonggarkan penanda
// jadi path-penuh malah bikin DUPLIKAT (entri lib/ lama + engine/ baru). Karena itu perbaikan wajib
// langkah rewrite TERPISAH (berkas ini), dijalankan update-kit SEBELUM ensure-hook.
//
// APA YANG DILAKUKAN (keputusan owner 2026-07-21):
//   1. WAJIB auto-rewrite (ber-backup): .claude/settings.json + settings.local.json -> segmen path
//      '.claude-kit/lib/'->'.claude-kit/engine/' dan '.claude-kit/workflows/'->'.claude-kit/rules/'.
//      settings.json = EKSEKUSI (basi -> hook mati), jadi wajib dibetulkan otomatis.
//   2. LAPOR-saja (TIDAK auto-edit): AGENTS.md/CLAUDE.md/docs klien - Grep pola lama, laporkan
//      temuan supaya owner memutuskan. Itu artefak klien yang sering dikustom + rujukan dokumentatif
//      (basi TAK merusak fungsi), jadi menyentuhnya otomatis lebih berisiko daripada faedahnya.
//
// AMAN (cermin fail-safe engine/ensure-risk-gate-hook.mjs + §8.2 Aturan 5 / §12):
//   - IDEMPOTEN by-construction: tak ada pola lama -> NO-OP senyap (aman dijalankan berulang; aman
//     pula pada klien yang sudah v3). Tak butuh buku-besar .migration-state.json (yang khusus artefak
//     ber-schema_version; settings.json bukan itu).
//   - FAIL-SAFE: settings.json RUSAK (JSON tak valid) -> JANGAN sentuh, laporkan (jangan timpa kunci
//     kustom klien). Hasil rewrite divalidasi JSON.parse lagi sebelum ditulis; tak valid -> BATAL.
//   - SURGICAL: ganti HANYA segmen path (split-join literal ber-anchor '.claude-kit/'), teks lain +
//     kustomisasi user 100% utuh. Anchor '.claude-kit/' -> folder lib/ milik project klien sendiri
//     (mis. src/lib, @/lib) TAK PERNAH ikut kena.
//   - BACKUP ber-timestamp DULU (.backup-<yyyyMMdd-HHmmss>, BUKAN .bak) + tulis ATOMIK (tmp+rename).
//
// DIPANGGIL DARI: update-kit.mjs (setelah kit baru terpasang, SEBELUM Langkah 4 setup-pola-b) +
// CLI manual (`node .claude-kit/engine/migrate-client-struktur.mjs --project-root <dir> [--apply]`).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readTextSafe, backupStamp } from './fs-text.mjs'

// Pasangan segmen path LAMA -> BARU. ANCHOR '.claude-kit/' = pembeda kunci: hanya path DI DALAM
// folder kit yang kena; folder lib/ milik project klien (src/lib, @/lib) selamat (jebakan a Task 13).
export const PETA_SEGMEN_PATH = Object.freeze([
  ['.claude-kit/lib/', '.claude-kit/engine/'],
  ['.claude-kit/workflows/', '.claude-kit/rules/'],
])

// Berkas EKSEKUSI Claude Code yang command hook-nya wajib dibetulkan (relatif ke projectRoot).
export const BERKAS_SETTINGS_WAJIB = Object.freeze([
  path.join('.claude', 'settings.json'),
  path.join('.claude', 'settings.local.json'),
])

// Berkas dokumentasi klien yang HANYA dilaporkan (tidak auto-edit; keputusan owner Q4 2026-07-21).
export const BERKAS_DOKUMEN_LAPOR = Object.freeze(['AGENTS.md', 'CLAUDE.md'])

// Hitung total kemunculan SEMUA pola lama di teks (untuk deteksi + laporan). 0 = tak perlu migrasi.
export function hitungReferensiLama(teks) {
  const t = String(teks || '')
  let total = 0
  for (const [lama] of PETA_SEGMEN_PATH) {
    if (!lama) continue
    total += t.split(lama).length - 1
  }
  return total
}

// Ganti SEMUA segmen path lama -> baru (split-join literal, bukan regex -> aman dari karakter meta).
// Return { hasil, jumlah }. jumlah=0 -> hasil === teks (tak berubah).
export function rewriteReferensiPath(teks) {
  let hasil = String(teks || '')
  let jumlah = 0
  for (const [lama, baru] of PETA_SEGMEN_PATH) {
    if (!lama) continue
    const potong = hasil.split(lama)
    jumlah += potong.length - 1
    hasil = potong.join(baru)
  }
  return { hasil, jumlah }
}

// Tulis teks ATOMIK (tmp ber-pid + rename) - pasangan-tulis untuk settings.json supaya tak ada
// berkas setengah-tertulis kalau proses mati. Nama fungsi sengaja UNIK (bukan writeFileAtomic /
// writeJsonAtomic yang sudah ada) supaya detektor duplikat-fungsi tak menandainya; body pun beda
// (menulis TEKS apa adanya, bukan JSON.stringify) - menjaga formatting/urutan kunci klien 100%.
function tulisTeksAtomik(filePath, teks) {
  const tmp = `${filePath}.tmp-${process.pid}`
  fs.writeFileSync(tmp, teks, 'utf8')
  fs.renameSync(tmp, filePath)
}

// Migrasi SATU berkas settings (settings.json / settings.local.json). Return objek laporan:
//   { file, changed, reason, count, backupPath }
// reason: 'tak-ada' | 'rusak' | 'tak-perlu' | 'simulasi' | 'hasil-tak-valid' | 'dimigrasi'.
export function migrateSettingsFile(filePath, { dryRun = false, now = null } = {}) {
  if (!fs.existsSync(filePath)) {
    return { file: filePath, changed: false, reason: 'tak-ada', count: 0, backupPath: null }
  }
  const raw = readTextSafe(filePath) // baca + buang BOM; null kalau tak terbaca (terkunci)
  if (raw == null) {
    // Terkunci/tak terbaca -> JANGAN sentuh (fail-safe, jangan timpa kustomisasi klien).
    return { file: filePath, changed: false, reason: 'rusak', count: 0, backupPath: null }
  }
  // Validasi: settings WAJIB JSON valid sebelum disentuh. Rusak -> lapor + lewati (jangan timpa).
  try { JSON.parse(raw) } catch {
    return { file: filePath, changed: false, reason: 'rusak', count: 0, backupPath: null }
  }

  const jumlah = hitungReferensiLama(raw)
  if (jumlah === 0) {
    return { file: filePath, changed: false, reason: 'tak-perlu', count: 0, backupPath: null }
  }

  const { hasil } = rewriteReferensiPath(raw)
  // Validasi HASIL tetap JSON valid (mestinya ya - kita cuma ganti segmen di dalam string).
  // Kalau tidak, ada yang tak beres -> BATAL, jangan tulis (fail-closed).
  try { JSON.parse(hasil) } catch {
    return { file: filePath, changed: false, reason: 'hasil-tak-valid', count: jumlah, backupPath: null }
  }

  if (dryRun) {
    return { file: filePath, changed: false, reason: 'simulasi', count: jumlah, backupPath: null }
  }

  // Backup ber-timestamp DULU (BUKAN .bak; konvensi update-kit `.backup-<stamp>`), lalu tulis atomik.
  const backupPath = `${filePath}.backup-${backupStamp(now || new Date())}`
  fs.copyFileSync(filePath, backupPath)
  tulisTeksAtomik(filePath, hasil)
  return { file: filePath, changed: true, reason: 'dimigrasi', count: jumlah, backupPath }
}

// LAPOR-saja (CUMA-BACA): scan AGENTS.md/CLAUDE.md + docs/*.md klien untuk sisa referensi path lama.
// TIDAK menulis apa pun (§8.2 Aturan 3 - laporan wajib cuma-baca). Return array { file, count }.
export function laporReferensiDokumen(projectRoot) {
  const temuan = []
  const kandidat = BERKAS_DOKUMEN_LAPOR.map((f) => path.join(projectRoot, f))
  const docsDir = path.join(projectRoot, 'docs')
  if (fs.existsSync(docsDir)) {
    try {
      for (const nama of fs.readdirSync(docsDir)) {
        if (nama.toLowerCase().endsWith('.md')) kandidat.push(path.join(docsDir, nama))
      }
    } catch { /* docs tak terbaca -> lewati (laporan best-effort) */ }
  }
  for (const p of kandidat) {
    const raw = readTextSafe(p)
    if (raw == null) continue
    const count = hitungReferensiLama(raw)
    if (count > 0) temuan.push({ file: p, count })
  }
  return temuan
}

// Orkestrasi: betulkan settings (WAJIB) + laporkan dokumen (LAPOR-saja). Return laporan gabungan.
export function migrateClientStructure(projectRoot, { dryRun = false, now = null } = {}) {
  const settings = []
  for (const rel of BERKAS_SETTINGS_WAJIB) {
    settings.push(migrateSettingsFile(path.join(projectRoot, rel), { dryRun, now }))
  }
  const dokumen = laporReferensiDokumen(projectRoot)
  const changedCount = settings.filter((s) => s.changed).length
  const wouldChange = settings.filter((s) => s.reason === 'simulasi').length
  return { settings, dokumen, changedCount, wouldChange, dryRun }
}

// Orkestrasi + cetak bahasa awam (non-programmer). Dipanggil update-kit.mjs + CLI.
export function invokeMigrateClientStructure(projectRoot, { dryRun = false, quiet = false } = {}) {
  const r = migrateClientStructure(projectRoot, { dryRun })
  if (!quiet) {
    const adaKerja = r.settings.some((s) => s.reason === 'dimigrasi' || s.reason === 'simulasi' || s.reason === 'rusak' || s.reason === 'hasil-tak-valid')
    if (adaKerja || r.dokumen.length) {
      console.log('')
      console.log(`Migrasi struktur artefak klien (${dryRun ? 'SIMULASI' : 'TERAPKAN'}) - path lib/->engine/, workflows/->rules/`)
      console.log('-'.repeat(64))
      for (const s of r.settings) {
        if (s.reason === 'tak-ada' || s.reason === 'tak-perlu') continue
        if (s.reason === 'dimigrasi') {
          console.log(`  [OK]        ${s.file}: ${s.count} referensi path lama dibetulkan (lib/->engine/, workflows/->rules/)`)
          if (s.backupPath) console.log(`  [OK]        cadangan: ${s.backupPath}`)
        } else if (s.reason === 'simulasi') {
          console.log(`  [SIMULASI]  ${s.file}: ${s.count} referensi path lama AKAN dibetulkan (jalankan --apply)`)
        } else if (s.reason === 'rusak') {
          console.log(`  [LEWAT]     ${s.file}: JSON rusak/terkunci - TIDAK disentuh. Perbaiki berkas ini lalu jalankan setup ulang.`)
        } else if (s.reason === 'hasil-tak-valid') {
          console.log(`  [BATAL]     ${s.file}: hasil rewrite jadi JSON tak valid - dibatalkan (berkas asli aman).`)
        }
      }
      for (const d of r.dokumen) {
        console.log(`  [LAPOR]     ${d.file}: ada ${d.count} rujukan path lama (.claude-kit/lib|workflows/) - TIDAK diubah otomatis.`)
        console.log('              -> minta AI membetulkannya kalau memang rujukan itu masih dipakai.')
      }
      console.log('-'.repeat(64))
    }
  }
  return r
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const args = process.argv.slice(2)
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null }
  const projectRoot = get('--project-root') || process.cwd()
  const quiet = args.includes('--quiet')
  const dryRun = !args.includes('--apply') // default SIMULASI (aman); --apply untuk sungguhan
  if (args.includes('--detect-only')) {
    // CUMA deteksi: berapa berkas yang punya referensi lama (settings + dokumen). Kode-keluar = jumlah.
    const r = migrateClientStructure(projectRoot, { dryRun: true })
    const perluSettings = r.settings.filter((s) => s.reason === 'simulasi').length
    const perluDok = r.dokumen.length
    if (!quiet) {
      console.log(`Deteksi migrasi struktur: ${perluSettings} berkas settings + ${perluDok} berkas dokumen memuat path lama.`)
    }
    process.exitCode = perluSettings + perluDok
  } else {
    const r = invokeMigrateClientStructure(projectRoot, { dryRun, quiet })
    // Kode-keluar 0 = beres/tak-perlu; !=0 hanya kalau ada berkas RUSAK yang tak bisa dibetulkan.
    process.exitCode = r.settings.filter((s) => s.reason === 'rusak' || s.reason === 'hasil-tak-valid').length
  }
}
