#!/usr/bin/env node
// engine/migration-state.mjs - Robot LAPORAN-MIGRASI + BUKU-BESAR migrasi artefak klien
// (Mesin 2, rencana docs/plans/STRATEGI_UPDATE_v2.md Langkah 3). Meniru Angular `ng update`
// (pelapor migrasi ber-versi) + Prisma migrate (idempoten: yang sudah jalan dicatat, tak diulang).
//
// MASALAH yang dipecahkan (risiko #3 rencana: "terlupa selamanya"): artefak klien (Lajur C - hidup
// di LUAR .claude-kit/, disemai sekali saat pasang lalu jadi milik klien) membawa penanda format
// `schema_version`. Kit terus di-update (folder .claude-kit/ diganti utuh), artefak klien TIDAK.
// Tanpa pelapor, artefak format-lama bisa tertinggal bertahun-tahun sementara health-check tetap
// "hijau" (rasa-aman-palsu). Robot ini yang melapor - di `update` DAN `doctor`.
//
// DUA BAGIAN:
//   1. LAPORAN MIGRASI (CUMA-BACA): banding penanda `schema_version` TIAP artefak vs peta
//      versi-diharapkan engine/expected-schema.mjs (Mesin 1 - SUMBER TUNGGAL; robot ini enumerasi
//      DARI peta, TIDAK punya daftar artefak sendiri -> saat peta bertambah, laporan otomatis ikut).
//      Cetak bahasa awam: "Termigrasi X dari Y artefak yang ada. Belum: ...".
//   2. BUKU-BESAR (.migration-state.json di AKAR project klien - LUAR .claude-kit/ supaya selamat
//      saat update mengganti folder kit): catat migrasi yang SUDAH dijalankan -> IDEMPOTEN
//      (dicatat 2x = tetap 1 entri, tak dobel). Pemakainya = migrator (Langkah 4/5 rencana,
//      menyusul). Robot LAPORAN tidak menulis apa pun (verifikasi wajib cuma-baca, §8.2 Aturan 3).
//
// DIPANGGIL DARI: (a) kit.mjs doctor bagian 2c - health-check HIJAU hanya kalau SEMUA artefak
// >= versi-diharapkan, selain itu "Selesai sebagian" (§4.7); (b) update-kit.mjs Langkah 7
// (sesudah update, memakai peta kit BARU). Keduanya menjalankan berkas ini sebagai PROSES ANAK
// dari kit yang diinspeksi (bukan import statis) supaya peta yang dipakai selalu sezaman dengan
// kit terpasang di project (kasus npx: kit.mjs bisa berjalan dari salinan cache npm beda versi).
//
// FAIL-CLOSED (Mesin 3 rencana - JANGAN dilonggarkan):
//   - Artefak ADA tapi RUSAK / penanda tak sah -> dihitung BELUM-terbukti-termigrasi (memblokir),
//     BUKAN dilewati diam-diam ("timbangan mati bukan berarti 0 kg", §6.3 #4).
//   - Kunci peta TANPA lokasi terdaftar di sini -> LEMPAR error jelas (bukan lolos senyap).
//   - Buku-besar korup ATAU berformat LEBIH BARU dari yang robot ini pahami -> penulis MENOLAK
//     menulis (jangan timpa data klien; fail-closed dua arah, cermin uninstall.mjs).
//   - Artefak TIDAK ADA = bukan pelanggaran (artefak opsional; tak ada format lama yang bisa
//     bertabrakan) -> dilaporkan sebagai info, TIDAK memblokir.
//
// REUSE (anti-duplikasi §5): readLintasConfig (config-loader.mjs) - pembaca JSONC teruji untuk
// kartu ber-komentar; writeJsonAtomic + formatLocalTimestamp (manifest.mjs) - penulis atomik +
// cap-waktu yang sama dengan catatan-pasang.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LINTAS_EXPECTED_SCHEMA, getLintasExpectedSchemaVersion } from './expected-schema.mjs'
import { readLintasConfig } from './config-loader.mjs'
import { writeJsonAtomic, formatLocalTimestamp } from './manifest.mjs'

export const LINTAS_MIGRATION_LEDGER_FILENAME = '.migration-state.json'

// Lokasi tiap artefak peta di disk, relatif ke { projectRoot, kitDir }. FAIL-CLOSED lewat
// resolveLintasArtifactPath: entri peta tanpa lokasi di sini -> LEMPAR (dikunci tes "resolver
// lengkap" di migration-state.test.mjs) - jadi menambah artefak ke peta TANPA memberitahu robot
// ini tak mungkin lolos senyap.
const ARTIFACT_LOCATIONS = {
  'project.lintas.jsonc': ({ projectRoot }) => path.join(projectRoot, 'project.lintas.jsonc'),
  '.install-manifest.json': ({ kitDir }) => path.join(kitDir, '.install-manifest.json'),
  '.migration-state.json': ({ projectRoot }) => path.join(projectRoot, LINTAS_MIGRATION_LEDGER_FILENAME),
}

// Label awam per artefak (kosmetik - kunci tak terdaftar jatuh ke nama berkasnya, bukan error).
const ARTIFACT_LABELS = {
  'project.lintas.jsonc': 'kartu project',
  '.install-manifest.json': 'catatan-pasang',
  '.migration-state.json': 'buku-besar migrasi',
}
function artifactLabel(artifactKey) {
  const label = ARTIFACT_LABELS[artifactKey]
  return label ? `${label} (${artifactKey})` : artifactKey
}

// Lokasi absolut sebuah artefak peta. LEMPAR untuk kunci tanpa lokasi (fail-closed, lihat atas).
export function resolveLintasArtifactPath(artifactKey, { projectRoot, kitDir }) {
  if (!Object.prototype.hasOwnProperty.call(ARTIFACT_LOCATIONS, artifactKey)) {
    throw new Error(`Artefak '${artifactKey}' terdaftar di peta versi-diharapkan tapi lokasinya belum didaftarkan di engine/migration-state.mjs (ARTIFACT_LOCATIONS) - daftarkan dulu supaya laporan migrasi tidak bolong diam-diam.`)
  }
  return ARTIFACT_LOCATIONS[artifactKey]({ projectRoot, kitDir })
}

// Baca berkas ber-penanda (JSONC = superset JSON, jadi kartu ber-komentar pun terbaca).
// Return { Present, Ok, Data, Error } - "tak ada" DIPISAH dari "ada tapi RUSAK" supaya pemanggil
// bisa fail-closed atas yang rusak (jangan ditelan jadi "bersih"; pola sama readPackageJson).
function readVersionedArtifact(p) {
  if (!fs.existsSync(p)) return { Present: false, Ok: false, Data: null, Error: null }
  try {
    const data = readLintasConfig(p)
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return { Present: true, Ok: false, Data: null, Error: 'akar berkas harus objek (bukan null/array/nilai tunggal)' }
    }
    return { Present: true, Ok: true, Data: data, Error: null }
  } catch (e) {
    return { Present: true, Ok: false, Data: null, Error: e.message }
  }
}

// ============================================================================
// BAGIAN 1 - LAPORAN MIGRASI (cuma-baca)
// ============================================================================

// Kumpulkan temuan migrasi per artefak peta. Return array:
//   { Artifact, Label, Expected, Found, Status, Path }
// Status: 'OK' (>= diharapkan) | 'BEHIND' (di bawah -> perlu migrasi) | 'BROKEN' (rusak/penanda
// tak sah -> tak terbukti termigrasi, memblokir) | 'ABSENT' (tak ada -> info, tidak memblokir).
// `expectedOverrides` HANYA untuk tes (mensimulasikan "kit masa depan yang mengharap v2" tanpa
// menaikkan peta sungguhan) - produksi selalu pakai angka peta.
export function getLintasMigrationFinding({ projectRoot, kitDir, expectedOverrides = {} } = {}) {
  const findings = []
  for (const artifact of Object.keys(LINTAS_EXPECTED_SCHEMA)) {
    const expected = Object.prototype.hasOwnProperty.call(expectedOverrides, artifact)
      ? expectedOverrides[artifact]
      : getLintasExpectedSchemaVersion(artifact)
    const p = resolveLintasArtifactPath(artifact, { projectRoot, kitDir })
    const label = artifactLabel(artifact)
    const r = readVersionedArtifact(p)
    if (!r.Present) {
      findings.push({ Artifact: artifact, Label: label, Expected: expected, Found: '(belum ada)', Status: 'ABSENT', Path: p })
      continue
    }
    if (!r.Ok) {
      findings.push({ Artifact: artifact, Label: label, Expected: expected, Found: `tak terbaca: ${r.Error}`, Status: 'BROKEN', Path: p })
      continue
    }
    const sv = r.Data.schema_version
    if (typeof sv !== 'number' || !Number.isInteger(sv)) {
      findings.push({ Artifact: artifact, Label: label, Expected: expected, Found: `penanda schema_version tak sah (${String(sv)})`, Status: 'BROKEN', Path: p })
      continue
    }
    findings.push({
      Artifact: artifact, Label: label, Expected: expected, Found: `versi ${sv}`,
      Status: sv >= expected ? 'OK' : 'BEHIND', SchemaVersion: sv, Path: p,
    })
  }
  return findings
}

// Ringkas temuan jadi angka laporan. Penyebut Y = artefak yang ADA (OK+BEHIND+BROKEN); yang
// TIDAK ADA tak dihitung (artefak opsional - menghitungnya bikin project polos selamanya "belum
// termigrasi" = alarm palsu). MismatchCount = BEHIND + BROKEN (RUSAK ikut memblokir, fail-closed).
export function getLintasMigrationSummary(findings) {
  const present = findings.filter((f) => f.Status !== 'ABSENT')
  const migrated = present.filter((f) => f.Status === 'OK')
  const pending = present.filter((f) => f.Status === 'BEHIND' || f.Status === 'BROKEN')
  return {
    PresentCount: present.length,
    MigratedCount: migrated.length,
    Pending: pending,
    MismatchCount: pending.length,
    Ok: pending.length === 0,
  }
}

// Orkestrasi laporan: jalankan + (opsional) cetak bahasa awam. CUMA-BACA - tidak menulis berkas
// apa pun (buku-besar hanya DIBACA sebagai salah satu artefak). Return { Findings, Summary,
// MismatchCount, Ok }; kode-keluar pemanggil CLI = MismatchCount (0 = semua sesuai).
export function invokeLintasMigrationCheck({ projectRoot, kitDir = null, quiet = false, expectedOverrides = {} } = {}) {
  const root = projectRoot || process.cwd()
  const kd = kitDir || path.join(root, '.claude-kit')
  const findings = getLintasMigrationFinding({ projectRoot: root, kitDir: kd, expectedOverrides })
  const summary = getLintasMigrationSummary(findings)

  if (!quiet) {
    console.log('')
    // Baris judul ini = KONTRAK STRING dgn pemanggil (kit.mjs doctor 2c + update-kit.mjs Langkah 7):
    // dipakai membedakan "robot melapor temuan" (baris ini tercetak) vs "robot crash sebelum sempat
    // melapor" (tidak tercetak) - dua-duanya keluar kode !=0. Jangan ganti sepihak.
    console.log('Robot laporan-migrasi artefak klien (Node) - banding penanda versi vs peta kit')
    console.log('Peta versi-diharapkan: engine/expected-schema.mjs milik kit yang menjalankan robot ini')
    console.log('-'.repeat(64))
    for (const f of findings) {
      if (f.Status === 'OK') console.log(`  [OK]        ${f.Label}: ${f.Found} (kit mengharap >= ${f.Expected})`)
      else if (f.Status === 'BEHIND') console.log(`  [BELUM]     ${f.Label}: ${f.Found}, kit mengharap >= ${f.Expected} -> perlu migrasi`)
      else if (f.Status === 'BROKEN') console.log(`  [RUSAK]     ${f.Label}: ${f.Found} -> dianggap BELUM termigrasi demi aman (perbaiki berkasnya dulu)`)
      else console.log(`  [BELUM ADA] ${f.Label}: belum ada (wajar - opsional, tidak menghalangi)`)
    }
    console.log('-'.repeat(64))
    if (summary.PresentCount === 0) {
      console.log('Belum ada artefak ber-penanda versi di project ini - tidak ada yang perlu dimigrasi.')
    } else if (summary.Ok) {
      console.log(`Termigrasi ${summary.MigratedCount} dari ${summary.PresentCount} artefak yang ada - semua sesuai versi yang diharapkan kit ini.`)
    } else {
      const names = summary.Pending.map((f) => f.Label).join(', ')
      console.log(`Termigrasi ${summary.MigratedCount} dari ${summary.PresentCount} artefak yang ada. Belum: ${names}.`)
      console.log('Status: SELESAI SEBAGIAN - jangan anggap "aman penuh" sebelum artefak di atas menyusul.')
      console.log('Langkah: baca entri ber-label [BREAKING] di CHANGELOG kit (.claude-kit/CHANGELOG.md) lalu minta AI memandu migrasinya.')
    }
  }
  return { Findings: findings, Summary: summary, MismatchCount: summary.MismatchCount, Ok: summary.Ok }
}

// ============================================================================
// BAGIAN 2 - BUKU-BESAR (.migration-state.json) - idempoten, ditulis MIGRATOR (bukan pelapor)
// ============================================================================

export function resolveLintasMigrationLedgerPath(projectRoot) {
  return path.join(projectRoot, LINTAS_MIGRATION_LEDGER_FILENAME)
}

// Baca buku-besar. Return { Present, Ok, Ledger, Error, Path }. Tak ada = sah (Ok:true, Ledger:null,
// buku lahir saat migrasi pertama). Ada tapi rusak / bentuk tak sah -> Ok:false + Error (fail-closed:
// pemanggil DILARANG menganggapnya kosong lalu menimpa).
export function readLintasMigrationLedger(projectRoot) {
  const p = resolveLintasMigrationLedgerPath(projectRoot)
  const r = readVersionedArtifact(p)
  if (!r.Present) return { Present: false, Ok: true, Ledger: null, Error: null, Path: p }
  if (!r.Ok) return { Present: true, Ok: false, Ledger: null, Error: r.Error, Path: p }
  const sv = r.Data.schema_version
  if (typeof sv !== 'number' || !Number.isInteger(sv) || sv < 1) {
    return { Present: true, Ok: false, Ledger: null, Error: `schema_version buku-besar tak sah (${String(sv)})`, Path: p }
  }
  if (!Array.isArray(r.Data.migrations)) {
    return { Present: true, Ok: false, Ledger: null, Error: "kolom 'migrations' harus array", Path: p }
  }
  return { Present: true, Ok: true, Ledger: r.Data, Error: null, Path: p }
}

// Apakah migrasi (artifact -> toVersion) SUDAH tercatat pernah jalan? Buku tak ada -> false.
// Buku RUSAK -> LEMPAR (fail-closed: migrator harus berhenti bertanya ke manusia, bukan
// menjalankan ulang secara buta di atas catatan yang tak bisa dipercaya).
export function testLintasMigrationApplied(projectRoot, { artifact, toVersion }) {
  const read = readLintasMigrationLedger(projectRoot)
  if (read.Present && !read.Ok) {
    throw new Error(`Buku-besar migrasi rusak (${read.Error}) di ${read.Path} - perbaiki/pulihkan dari cadangan dulu sebelum menjalankan migrasi.`)
  }
  if (!read.Present) return false
  return read.Ledger.migrations.some((m) => m && m.artifact === artifact && Number(m.to_version) === Number(toVersion))
}

// Catat bahwa migrasi (artifact -> toVersion) SUDAH dijalankan. IDEMPOTEN: entri yang sama dicatat
// 2x -> penulisan kedua jadi tanpa-aksi (Written:false), TIDAK dobel. Tulis ATOMIK (tmp+rename,
// reuse writeJsonAtomic manifest.mjs) supaya proses ditebas di tengah tak meninggalkan buku rusak.
// `now` opsional (Date) untuk uji deterministik. Return { Written, Reason, Path }.
export function recordLintasMigrationApplied(projectRoot, { artifact, toVersion, now = null } = {}) {
  // Artefak WAJIB terdaftar di peta (getter LEMPAR untuk kunci asing - fail-closed) + versi integer.
  getLintasExpectedSchemaVersion(artifact)
  if (typeof toVersion !== 'number' || !Number.isInteger(toVersion) || toVersion < 1) {
    throw new Error(`recordLintasMigrationApplied: toVersion harus integer >= 1, dapat: ${String(toVersion)}`)
  }

  const read = readLintasMigrationLedger(projectRoot)
  if (read.Present && !read.Ok) {
    throw new Error(`Buku-besar migrasi rusak (${read.Error}) di ${read.Path} - MENOLAK menulis di atasnya (jangan timpa catatan klien; perbaiki/pulihkan dari cadangan dulu).`)
  }
  const expectedLedgerSchema = getLintasExpectedSchemaVersion(LINTAS_MIGRATION_LEDGER_FILENAME)
  if (read.Present && read.Ledger.schema_version > expectedLedgerSchema) {
    throw new Error(`Buku-besar migrasi berformat LEBIH BARU (schema_version=${read.Ledger.schema_version}) dari yang dipahami kit ini (${expectedLedgerSchema}) - MENOLAK menulis (fail-closed dua arah, cermin uninstall). Perbarui kit dulu.`)
  }

  const ledger = read.Present ? read.Ledger : { schema_version: expectedLedgerSchema, migrations: [] }
  const already = ledger.migrations.some((m) => m && m.artifact === artifact && Number(m.to_version) === Number(toVersion))
  if (already) return { Written: false, Reason: 'sudah-tercatat', Path: read.Path }

  const ts = now || new Date()
  ledger.migrations.push({ artifact, to_version: toVersion, applied_at: formatLocalTimestamp(ts) })
  writeJsonAtomic(read.Path, ledger)
  return { Written: true, Reason: read.Present ? 'ditambah' : 'dibuat', Path: read.Path }
}

// ============================================================================
// CLI - dipanggil kit.mjs doctor (bagian 2c) + update-kit.mjs (Langkah 7) sebagai proses anak.
// Kode-keluar = jumlah artefak BELUM/RUSAK (0 = semua sesuai). CUMA-BACA.
// ============================================================================
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const args = process.argv.slice(2)
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null }
  const projectRoot = get('--project-root') || process.cwd()
  const kitDir = get('--kit-dir') // null -> default projectRoot/.claude-kit di invoke
  const quiet = args.includes('--quiet')
  const r = invokeLintasMigrationCheck({ projectRoot, kitDir, quiet })
  // process.exitCode (bukan process.exit) supaya stdout selesai di-flush saat di-pipa.
  process.exitCode = r.MismatchCount
}
