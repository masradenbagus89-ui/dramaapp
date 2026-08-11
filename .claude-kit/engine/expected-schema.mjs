#!/usr/bin/env node
// engine/expected-schema.mjs - PETA "versi-diharapkan" per-artefak milik kit (Mesin 1, STRATEGI_UPDATE_v2 §4).
//
// MASALAH yang dipecahkan: artefak klien (Lajur C - hidup di LUAR .claude-kit/, disemai sekali saat
// pasang lalu jadi milik klien) membawa penanda format `schema_version`. Kit terus di-update (folder
// .claude-kit/ diganti total), artefak klien TIDAK -> bisa timbul "version skew senyap" (sebagian
// berkas masih format lama tanpa ada yang sadar). Dulu robot cuma cek `schema_version >= 1`, jadi
// kartu format-v1 di bawah kit yang sudah butuh format-v2 tetap dilaporkan "OK" selamanya
// (risiko #3 rencana docs/plans/STRATEGI_UPDATE_v2.md §5: "terlupa selamanya").
//
// SOLUSI (Mesin 1): kit versi ini MENDEKLARASIKAN, per artefak, versi skema MINIMUM yang ia
// harapkan - di SATU tempat ini. Konsumennya:
//   - PEMERIKSA membanding penanda artefak vs peta ini (bukan angka mati):
//       engine/project-manifest.mjs getLintasManifestSchemaFinding (kartu project)
//       engine/migration-state.mjs (robot laporan-migrasi Mesin 2 - enumerasi SEMUA entri peta ini)
//       uninstall.mjs (catatan-pasang; cek PERSIS-sama, lihat catatan semantik di bawah)
//   - PENULIS bootstrap menulis angka dari peta yang SAMA (penulis & pemeriksa tak bisa selisih):
//       engine/project-manifest.mjs getLintasManifestStarterContentJsonc (kartu project)
//       engine/manifest.mjs saveManifest (catatan-pasang)
//       engine/migration-state.mjs recordLintasMigrationApplied (buku-besar migrasi)
//
// SEMANTIK ANGKA: satu angka = "versi yang DITULIS penulis" sekaligus "MINIMUM yang diterima
// pemeriksa" (semantik >=, selaras Mesin 2 rencana: sehat = semua artefak `schema >= diharapkan`).
//   sv >= angka peta -> OK (artefak versi sama / lebih baru dari yang kit pahami).
//   sv <  angka peta -> MISMATCH (artefak BASI -> perlu migrasi; pelapor migrasi = Langkah 3).
// PENGECUALIAN uninstall.mjs: tetap cek PERSIS-sama (===), karena menghapus berkas berdasar
// catatan berformat LEBIH BARU dari yang dipahami skrip = bahaya dua arah (fail-closed dua arah).
//
// CARA MENAIKKAN ANGKA (checklist wajib saat format artefak berubah):
//   1. Naikkan angka DI SINI (sisi Node: penulis + pemeriksa ikut otomatis lewat import).
//   2. Tes pengunci tests/expected-schema.test.mjs akan MERAH menunjuk salinan hardcode yang
//      belum ikut (template contoh + berkas PowerShell cadangan) -> perbarui yang ditunjuk.
//   3. WAJIB sediakan migrator + entri CHANGELOG ber-label [BREAKING] (Keranjang 1 rencana §3)
//      SEBELUM rilis. Menaikkan angka TANPA migrator = mengunci klien lama di luar gerbang.
//
// KENAPA modul konstanta (bukan berkas expected-schema.json): dibaca kode Node lain via import
// (tanpa baca-disk + parse yang bisa gagal di mesin klien), dan ikut terganti utuh saat update kit
// (peta selalu sezaman dengan robot yang memakainya).
//
// CATATAN CAKUPAN: hanya artefak yang punya penanda `schema_version`. Artefak klien lain
// (consistency-map.jsonc, wiring hook) belum ber-penanda;
// mereka dapat entri di sini SAAT diberi penanda (rencana §4 Mesin 2 / Langkah 3+). Berkas internal
// kit (mis. lib/kit-files.psd1) SENGAJA tak masuk peta: ia terganti utuh bersama kit tiap update,
// jadi tak mungkin ketinggalan versi (bukan Lajur C).
//
// CATATAN LOKASI: peta ini cuma memuat NAMA + ANGKA. Lokasi tiap artefak di disk didaftarkan di
// engine/migration-state.mjs (ARTIFACT_LOCATIONS) - entri baru di sini TANPA lokasi di sana akan bikin
// robot laporan-migrasi LEMPAR error jelas (fail-closed, dikunci tes migration-state.test.mjs).

export const LINTAS_EXPECTED_SCHEMA = Object.freeze({
  // Kartu identitas project (akar project klien; varian .psd1 lama diperiksa robot PowerShell).
  'project.lintas.jsonc': 1,
  // Catatan-pasang: daftar resmi berkas terpasang (.claude-kit/.install-manifest.json).
  '.install-manifest.json': 1,
  // Buku-besar migrasi (akar project klien, LUAR .claude-kit/ supaya selamat saat update mengganti
  // folder kit): catatan migrasi artefak yang SUDAH dijalankan (Mesin 2 / Langkah 3). Lahir saat
  // migrasi pertama dicatat engine/migration-state.mjs recordLintasMigrationApplied - tak disemai installer.
  '.migration-state.json': 1,
})

// Ambil versi-diharapkan sebuah artefak. FAIL-CLOSED: kunci tak terdaftar -> LEMPAR error jelas,
// BUKAN mengembalikan undefined (undefined lolos diam-diam bikin perbandingan `sv >= undefined`
// selalu false/NaN tanpa pesan - kelas bug senyap yang rencana ini justru berantas).
export function getLintasExpectedSchemaVersion(artifactKey) {
  if (!Object.prototype.hasOwnProperty.call(LINTAS_EXPECTED_SCHEMA, artifactKey)) {
    throw new Error(`Artefak '${artifactKey}' tidak terdaftar di peta versi-diharapkan (engine/expected-schema.mjs) - daftarkan dulu sebelum dipakai robot.`)
  }
  return LINTAS_EXPECTED_SCHEMA[artifactKey]
}
