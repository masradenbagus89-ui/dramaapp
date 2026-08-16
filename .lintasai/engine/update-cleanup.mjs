// engine/update-cleanup.mjs - Bersihkan berkas yang PERNAH dipasang kit tapi sudah DICABUT.
//
// MASALAH yang dipecahkan: saat sebuah berkas dicabut dari kit, klien yang sudah terlanjur pasang
// tetap menyimpan salinannya di docs/ selamanya - jadi berkas yatim yang membingungkan (AI/manusia
// membacanya sebagai panduan resmi padahal sudah tak didukung).
//
// PENGAMAN (§3.1 "AI tidak boleh merusak" - ini SATU-SATUNYA tempat kit menghapus berkas milik klien):
//   1. Hanya berkas yang TERCATAT di .install-manifest.json dengan kind 'team_file' - artinya
//      pemasang kit sendiri yang dulu menaruhnya. Berkas buatan klien tak akan pernah tersentuh.
//   2. Re-hash sesaat sebelum hapus: isi HARUS masih persis seperti saat dipasang. Sekali klien
//      mengedit, berkas DIBIARKAN + dia diberi tahu. (Pola sama dgn deletePristineEntries di
//      engine/uninstall-exec.mjs - disiplin yang sudah dipercaya di alur hapus-kit.)
//   3. Selalu dilaporkan di layar. Tak ada penghapusan senyap.
//   4. --dry-run / --check-only = NOL perubahan, cuma simulasi.
//
// URUTAN PANGGIL (kritis): WAJIB sebelum performNpmSwap. swapInKit me-rename seluruh .lintasai/
// lama ke folder cadangan, jadi sesudah tukar-kit .install-manifest.json sudah TIDAK ada di
// tempatnya - sidik-jari pembanding hilang dan pembersihan jadi mustahil.
//
// Sesudah berkas terhapus, catatan-pasang bersih SENDIRI: saveManifest (engine/manifest.mjs) hanya
// me-merge entri lama yang MASIH ADA di disk. Jangan pernah menyunting .install-manifest.json manual.
import fs from 'node:fs'
import path from 'node:path'
import { getFileSha256 } from './manifest.mjs'
import { stripBom } from './fs-text.mjs'
import { NAMA_FOLDER_KIT } from './project-root.mjs'

// Daftar berkas yang dulu di-deploy ke docs/ klien tapi sudah dicabut dari kit.
// Tambah entri baru di sini tiap kali sebuah berkas team_file dicabut.
export const BERKAS_DICABUT = Object.freeze([
  {
    nama: 'THREAT_MODEL_NON_LEGAL.md',
    sejak: '5.0.0',
    alasan: 'peta ancaman non-legal dicabut - isinya sudah tercakup skills/owasp + PRODUCTION_OBSERVABILITY',
  },
  {
    nama: 'REFACTOR_STANDARD.md',
    sejak: '5.0.0',
    alasan: 'standar refactor bertingkat dicabut - penilaian berat-ringannya kembali ke owner + review',
  },
  // --- v6.0.0: panduan pindah ke SATU sumber (.lintasai/templates/) ---------------------------
  // Salinan di docs/ tak pernah di-refresh (deployOne berhenti kalau target ada), jadi ia membeku di
  // versi install pertama sementara .lintasai/templates/ terus diperbarui. Semua SKILL.md merujuk
  // path `templates/...`, jadi salinan docs/ ini memang tak pernah dibaca siapa pun.
  ...[
    'STACK_GUIDE.md', 'STACK_VERSIONS.md', 'STACK_MIGRATION_GUIDE.md', 'RESEP_PERUBAHAN.md',
    'BUKU_PELAJARAN.example.md', 'SAFE_DATABASE_OPERATIONS.md', 'PRODUCTION_OBSERVABILITY.md',
    'UPDATE_GUIDE.md', 'SECURITY_INCIDENT_PLAYBOOK.md',
    // docs/decisions/* - client non-programmer tak menulis ADR; templatenya tinggal di repo kit.
    '_TEMPLATE.md', 'README.md',
    // skeleton docs (kind 'skeleton', bukan 'team_file') - lihat KIND_DIBERSIHKAN di bawah.
    '_PATTERNS.md', '_EXAMPLE.md',
  ].map((nama) => ({
    nama,
    sejak: '6.0.0',
    alasan: `panduan kini punya SATU rumah di ${NAMA_FOLDER_KIT}/templates/ (salinan docs/ tak pernah ikut ter-update)`,
  })),
  // --- v8.0.0: robot backup per-schema dicabut (sisa fitur tim "schema per staff") -----------------
  // Tanpa 3 secret yang hampir tak pernah diset client, workflow ini MERAH tiap hari di GitHub client;
  // langkah cleanup-nya pun masih TODO. Backup DB: PITR Supabase + templates/SAFE_DATABASE_OPERATIONS.md.
  {
    nama: 'backup-schemas.yml',
    sejak: '8.0.0',
    alasan: 'robot backup per-schema (sisa fitur tim) dicabut - tanpa secret ia gagal tiap hari; backup DB pakai PITR Supabase + templates/SAFE_DATABASE_OPERATIONS.md',
  },
])

// Jenis catatan-pasang yang BOLEH dibersihkan. Keduanya = berkas yang PEMASANG KIT sendiri taruh:
// 'team_file' (panduan pendukung) + 'skeleton' (kerangka docs/_PATTERNS/_EXAMPLE). Yang TIDAK pernah
// masuk sini: 'filled_template' (AGENTS.local.md - milik client) dan 'project_manifest'.
// Pengaman re-hash di bawah tetap berlaku untuk keduanya: sekali client mengedit, berkas DIBIARKAN.
const KIND_DIBERSIHKAN = new Set(['team_file', 'skeleton'])

// Baca catatan-pasang. Return array files, atau [] kalau tak ada / rusak (bukan error: pembersihan
// ini pelengkap, JANGAN pernah menggagalkan update hanya karena urusan bersih-bersih).
function bacaEntriManifest(kitDir) {
  try {
    const p = path.join(kitDir, '.install-manifest.json')
    if (!fs.existsSync(p)) return []
    const data = JSON.parse(stripBom(fs.readFileSync(p, 'utf8')))
    return Array.isArray(data.files) ? data.files : []
  } catch {
    return []
  }
}

// Bersihkan berkas usang di project klien. Selalu aman dipanggil (fail-safe: apa pun yang aneh -> lewati).
export function bersihkanBerkasUsang({ projectRoot, kitDir, args = {} }) {
  if (!projectRoot || !kitDir) return { dihapus: 0, dipertahankan: 0 }
  const simulasi = Boolean(args.dryRun || args.checkOnly)
  const entri = bacaEntriManifest(kitDir)
  if (entri.length === 0) return { dihapus: 0, dipertahankan: 0 }

  let dihapus = 0
  let dipertahankan = 0
  for (const cabut of BERKAS_DICABUT) {
    // Dicocokkan lewat manifest (bukan path tetap 'docs/...') supaya tetap benar walau folder docs
    // klien bernama lain. Jenis yang boleh disentuh = KIND_DIBERSIHKAN (berkas yang pemasang kit
    // sendiri taruh) - berkas buatan client tak akan pernah cocok.
    const target = entri.find(
      (f) => f && KIND_DIBERSIHKAN.has(f.kind) && path.basename(String(f.path)) === cabut.nama,
    )
    if (!target) continue

    const abs = path.join(projectRoot, String(target.path).replace(/\//g, path.sep))
    if (!fs.existsSync(abs)) continue

    if (simulasi) {
      console.log(`[SIMULASI] akan menghapus berkas usang: ${target.path} (${cabut.alasan})`)
      continue
    }

    // Re-hash: yang sudah diedit klien TIDAK boleh dihapus - itu kerja dia, bukan artefak kit lagi.
    const sekarang = getFileSha256(abs)
    if (!sekarang || String(sekarang).toUpperCase() !== String(target.sha256).toUpperCase()) {
      console.log(`INFO  ${target.path} sudah tidak dipakai kit lagi, TAPI ada perubahan dari kamu di dalamnya.`)
      console.log('      Dibiarkan apa adanya - hapus manual kalau memang tak dibutuhkan.')
      dipertahankan++
      continue
    }

    try {
      fs.rmSync(abs, { force: true })
      console.log(`OK    Dihapus berkas usang: ${target.path}`)
      console.log(`      Alasan: ${cabut.alasan} (dicabut sejak kit v${cabut.sejak}).`)
      dihapus++
    } catch (e) {
      console.log(`PERINGATAN: gagal menghapus ${target.path} (${e.message}) - lanjut, hapus manual saja.`)
    }
  }
  return { dihapus, dipertahankan }
}
