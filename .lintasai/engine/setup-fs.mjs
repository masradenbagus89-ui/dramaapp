// engine/setup-fs.mjs — tiga operasi berkas kecil milik pemasang: tambah pola .gitignore,
// salin-1-template + catat ke manifest, dan tulis berkas penanda.
//
// Dipecah dari setup-pola-b.mjs (Fase E 2026-07-25): isi dipindah APA ADANYA — tiap teks konsol
// (LEWATI/OK/PERINGATAN/[SIMULASI]) byte-identik, karena urutan + isi keluaran pemasang dikunci
// tests/setup-pola-b-write.test.mjs.
//
// Ketiganya BEST-EFFORT by design: kegagalan di sini melapor lalu lanjut, tak pernah menggagalkan
// pemasangan (berkas kit yang sudah mendarat tetap sah).
import fs from 'node:fs'
import path from 'node:path'
import { addToManifest } from './manifest.mjs'
import { stripBom } from './fs-text.mjs'
import { copyTemplateWithPlaceholder, copyStaticTemplate } from './template-deploy.mjs'
import { NAMA_FOLDER_KIT } from './project-root.mjs'

// === Pola .gitignore lintasAI — SATU SUMBER untuk pemasang DAN migrasi nama folder ==============
// KENAPA dipusatkan (2026-07-26): daftar ini dulu inline di setup-deploy.mjs saja. Waktu folder kit
// berganti nama, entri untuk nama BARU hanya menyusul kalau langkah setup benar-benar berjalan —
// dan `update` BERHENTI LEBIH AWAL saat versi sudah terbaru, jadi langkah itu bisa TIDAK jalan.
// Akibatnya `.manifest-secret` / `.install-manifest.json` folder baru TIDAK terlindungi dari commit.
// Migrasi kini memasang polanya sendiri lewat fungsi ini, memakai daftar yang SAMA (anti-drift).
export const HEADER_GITIGNORE_LINTASAI =
  '\n\n# === pola lintasAI (ditambah otomatis pemasang) ===\n# Cegah kebocoran: rahasia kit, identitas per-staff, folder cadangan.\n'

export function polaGitignoreLintasAI() {
  return [
    `${NAMA_FOLDER_KIT}/.audit-log`,
    `${NAMA_FOLDER_KIT}/.manifest-secret`,
    `${NAMA_FOLDER_KIT}/.install-manifest.json`,
    '.git-identity-*',
    `${NAMA_FOLDER_KIT}.backup-*/`,
    '*.backup-*',
    '*.bak',
    '*.bak.*',
    // Artefak GENERATED adaptor Cursor (2026-08-09). Repo kit sendiri sudah mengabaikannya, tapi pola
    // itu tak pernah ikut ke client -> di sisi client berkasnya ter-commit. Aman diabaikan karena Cursor
    // membaca AGENTS.md akar secara NATIVE: rekan tim yang meng-clone tanpa menjalankan pemasang TETAP
    // dapat kernel; yang di-gitignore cuma turunan yang bisa dibuat ulang (`adapter-sync --write`).
    // SENGAJA per-berkas, BUKAN folder `.cursor/`: folder itu juga rumah aturan/hook milik client —
    // mengabaikannya seluruhnya = kit mencuri berkas orang.
    '.cursor/rules/lintasai.mdc',
  ]
}

// Pasang pola lintasAI ke .gitignore akar project. APPEND-only (entri lama client tak disentuh).
export function pasangPolaGitignoreLintasAI(projectRoot, dryRun = false) {
  return appendGitignoreIfMissing(
    path.join(projectRoot, '.gitignore'),
    polaGitignoreLintasAI(),
    HEADER_GITIGNORE_LINTASAI,
    dryRun,
  )
}

// Tambah pola ke .gitignore KALAU belum ada (pertahankan isi lama). UTF-8 no-BOM.
export function appendGitignoreIfMissing(gitignorePath, entries, headerComment, dryRun) {
  let existingLines = []
  if (fs.existsSync(gitignorePath)) {
    let raw = fs.readFileSync(gitignorePath, 'utf8')
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1) // buang BOM
    existingLines = raw.split(/\r?\n/)
  }
  const missing = entries.filter((e) => !existingLines.includes(e))
  if (missing.length === 0) return { added: 0 }
  if (dryRun) return { added: missing.length }
  const block = headerComment + missing.join('\n') + '\n'
  if (existingLines.length > 0 && fs.existsSync(gitignorePath)) {
    fs.appendFileSync(gitignorePath, block, 'utf8')
  } else {
    fs.writeFileSync(gitignorePath, block.replace(/^\n+/, ''), 'utf8')
  }
  return { added: missing.length }
}

// Salin 1 berkas template -> target + catat ke manifest. Lewati kalau target sudah ada.
//
// `refreshMarker` (opsional) = potongan teks yang MEMBUKTIKAN berkas tujuan milik kit. Kalau diberikan
// DAN berkas tujuan memuatnya DAN isinya beda dari template, berkas itu DI-REFRESH, bukan dilewati.
//
// KENAPA (celah nyata, ditutup 2026-08-10): tanpa ini `deployOne` berhenti begitu target ada, sehingga
// robot keamanan CI MEMBEKU di versi pemasangan PERTAMA selamanya — tiap perbaikan pola deteksi rahasia
// tak pernah sampai ke client lama. Asimetri yang aneh: hook lokal pre-commit (lapis-1) SUDAH punya
// jalur refresh sejak 2026-07-26 (engine/install-secret-hook.mjs `punyaKitaBasi`), lapis-2 (CI) tidak.
// Ini cermin pola itu, bukan mekanisme baru.
//
// AMAN ditimpa TANPA cadangan: penanda membuktikan berkas ini milik kit, jadi tak ada kerja client yang
// hilang. Berkas TANPA penanda = milik client (atau editan yang penandanya sengaja dibuang) -> tetap
// DILEWATI seperti dulu. Dikunci tests/kit-templates-guard.test.mjs.
export function deployOne({ src, dst, from, kind, placeholders = {}, manifestState, dryRun, withPlaceholder, refreshMarker = null }) {
  if (fs.existsSync(dst)) {
    const bolehRefresh = refreshMarker && fs.existsSync(src) && punyaKitTapiBasi(dst, src, refreshMarker)
    if (!bolehRefresh) {
      console.log(`LEWATI ${dst} (sudah ada, tidak ditimpa)`)
      return
    }
    if (dryRun) {
      console.log(`[SIMULASI] SEGARKAN ${dst} (milik kit, versinya lama)`)
      return
    }
    try {
      fs.copyFileSync(src, dst)
      addToManifest(manifestState, dst, kind, from.replace(/\\/g, '/'))
      console.log(`OK    ${dst} (disegarkan ke versi kit ini - berkas milik kit, editanmu tak ada di sini)`)
    } catch (e) {
      console.log(`PERINGATAN: Gagal menyegarkan ${dst}: ${e.message} (berkas lama dibiarkan utuh).`)
    }
    return
  }
  if (!fs.existsSync(src)) {
    console.log(`PERINGATAN: Template tidak ditemukan: ${src} (lewati)`)
    return
  }
  if (dryRun) {
    console.log(`[SIMULASI] SALIN ${src} -> ${dst}`)
    return
  }
  const r = withPlaceholder
    ? copyTemplateWithPlaceholder({ sourcePath: src, targetPath: dst, placeholders, ifExists: 'Skip' })
    : copyStaticTemplate({ sourcePath: src, targetPath: dst, ifExists: 'Skip' })
  if (r.copied) {
    addToManifest(manifestState, dst, kind, from.replace(/\\/g, '/'))
    console.log(`OK    ${dst}`)
  } else if (r.action === 'missing') {
    console.log(`GAGAL salin ${dst}: sumber hilang`)
  }
}

// Apakah berkas tujuan MILIK KIT tapi isinya sudah lama? FAIL-SAFE: ragu apa pun -> false (jangan
// sentuh berkas client). Perbandingan menormalkan CRLF/BOM supaya beda akhir-baris antar-platform tak
// dibaca sebagai "versi beda" lalu menulis ulang berkas yang sebenarnya identik.
function punyaKitTapiBasi(dst, src, marker) {
  try {
    const norm = (s) => stripBom(s).replace(/\r\n/g, '\n')
    const kini = norm(fs.readFileSync(dst, 'utf8'))
    if (!kini.includes(marker)) return false          // bukan punya kit -> jangan sentuh
    return kini !== norm(fs.readFileSync(src, 'utf8')) // identik -> tak ada kerjaan
  } catch {
    return false
  }
}

// Tulis berkas penanda kecil (best-effort: gagal-pun tak menghentikan pemasangan). UTF-8 no-BOM.
export function writeMarkerSafe(markerPath, content = '') {
  try {
    fs.mkdirSync(path.dirname(markerPath), { recursive: true })
    fs.writeFileSync(markerPath, content, 'utf8')
  } catch (e) {
    console.log(`PERINGATAN: Gagal tulis penanda ${path.basename(markerPath)}: ${e.message}`)
  }
}
