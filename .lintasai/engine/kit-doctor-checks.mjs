#!/usr/bin/env node
// engine/kit-doctor-checks.mjs - Cek-cek MANDIRI untuk `kit.mjs doctor` (diekstrak dari invokeDoctor).
//
// KENAPA ADA: invokeDoctor dulu ~416 baris (semua cek inline) -> boros token AI + susah dinavigasi saat
// kit di-upgrade/revisi. Cek yang MANDIRI (tak berbagi state antar-cek) dipindah ke sini sebagai fungsi
// bernama, invokeDoctor menyusut jadi orkestrator. Yang TETAP inline di kit.mjs: cek file-inti (2, `const
// groups` dijaga tes struktural tests/kit-doctor-files.test.mjs) + integritas (2b, pakai readManifestJson
// lokal kit.mjs) - memindahnya malah menambah kopling/duplikasi.
//
// KONTRAK tiap fungsi cek: (…argumen, emit) -> { ok, warn, err }. `emit(s)` = pencetak baris (di doctor =
// console.log) supaya URUTAN + ISI keluaran IDENTIK dengan versi inline. Penghitung dikembalikan (bukan
// memutasi variabel luar) supaya fungsi murni-testable. process.stdout.write dipakai apa adanya untuk
// meneruskan keluaran robot-anak (migrasi/kartu) - sama seperti sebelumnya.
//
// PERILAKU DIKUNCI (jaring pra-refactor): tests/kit-doctor-branches.test.mjs (versi/struktur/ringkasan)
// menjalankan doctor SUNGGUHAN -> penyimpangan keluaran apa pun langsung merah.
import fs from 'node:fs'
import path from 'node:path'

import { getKitVersionFallback } from './version-detect.mjs'
import { getLatestNpmVersion } from './npm-query.mjs'
import { compareDotNetVersion } from '../update-kit.mjs'
import { runEnvCheck } from './env-check.mjs'
import { findProjectRoot, NAMA_FOLDER_KIT } from './project-root.mjs'
import { bangunMatriksHarness, barisPalangTerlewat, LEVEL_HARNESS } from './doctor-harness-matrix.mjs'
import { readState } from './hook-session-state.mjs'
import { STATE_NAMESPACE_TERLEWAT, kunciProject } from './rak-gate.mjs'

// ---- Cek 1 + 1b: versi kit terpasang + apakah KEDALUWARSA vs npm ----
export function checkVersion(kitDir, extra, emit) {
  const c = { ok: 0, warn: 0, err: 0 }
  const version = getKitVersionFallback(kitDir, { changelogPath: path.join(kitDir, 'CHANGELOG.md') })
  if (/^v?\d+\.\d+\.\d+/.test(version)) {
    const display = /^v/.test(version) ? version : 'v' + version
    emit(`OK    Kit version: ${display}`)
    c.ok++
  } else if (version === 'unknown') {
    emit('WARN  Kit version: unknown (manifest hilang, $script:KIT_VERSION kosong, CHANGELOG.md tidak parseable)')
    c.warn++
  } else {
    emit(`ERROR Kit version: format tidak dikenali ('${version}')`)
    c.err++
  }

  // 1b. FAIL-OPEN: offline / registry diblokir / npm tak ada -> INFO, JANGAN merah (jangan alarm-palsu
  //     gara-gara jaringan kantor). Banding ke npm (bukan repo) supaya klien tanpa akses repo terlayani.
  if (!extra.includes('--skip-cek-versi')) {
    const latest = getLatestNpmVersion()
    const now = String(version).replace(/^v/, '').trim()
    if (!latest) {
      emit('INFO  Versi terbaru: belum bisa dicek (offline / npm tak terjangkau) - dilewati, bukan masalah.')
    } else if (!/^\d+\.\d+\.\d+/.test(now)) {
      emit(`INFO  Versi terbaru di npm: v${latest} (versi terpasang tak terbaca, jadi tak bisa dibandingkan).`)
    } else {
      const cmp = compareDotNetVersion(now, latest)
      if (cmp !== null && cmp < 0) {
        emit(`WARN  Kit kamu KEDALUWARSA: terpasang v${now}, terbaru v${latest}.`)
        emit("        -> Update dengan: npx lintasai@latest update   (tak butuh akun GitHub)")
        c.warn++
      } else {
        emit(`OK    Versi terbaru: v${now} sudah paling baru (npm: v${latest}).`)
        c.ok++
      }
    }
  }
  return c
}

// Hitung file rekursif di sebuah folder (cermin (Get-ChildItem -Recurse -File).Count). Dipindah dari
// kit.mjs (dulu doctor-only) bersama cek struktur di bawah.
function countFilesRecursive(dir) {
  let count = 0
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return 0 }
  for (const e of entries) {
    if (e.isDirectory()) count += countFilesRecursive(path.join(dir, e.name))
    else if (e.isFile()) count++
  }
  return count
}

// ---- Cek 3-6: struktur project (AGENTS.md, docs/, .github/, .git internal .lintasai) ----
export function checkProjectStructure(kitDir, projectRoot, emit) {
  const c = { ok: 0, warn: 0, err: 0 }
  // 3. AGENTS.md di root proyek
  if (fs.existsSync(path.join(projectRoot, 'AGENTS.md'))) {
    emit('OK    AGENTS.md ada di root proyek')
    c.ok++
  } else {
    emit('WARN  AGENTS.md belum di-copy ke root proyek')
    emit('      Saran: npx lintasai init')
    c.warn++
  }

  // 4. docs/ folder
  const docsDir = path.join(projectRoot, 'docs')
  if (fs.existsSync(docsDir)) {
    const docsCount = countFilesRecursive(docsDir)
    emit(`OK    docs/ ada (${docsCount} file)`)
    c.ok++
  } else {
    // JUJUR + tidak melingkar (2026-08-10): saran lama "npx lintasai init" muncul juga TEPAT SESUDAH
    // init selesai — pemasang sengaja MELEWATI docs/ di project yang masih hampir kosong
    // (engine/setup-deploy.mjs), jadi menyuruh mengulang perintah yang barusan jalan cuma membingungkan.
    // Ini INFO, bukan WARN: folder kosong di project baru bukan kerusakan.
    emit('INFO  docs/ belum ada - normal di project baru (pemasang sengaja melewatinya sampai ada kode).')
    emit('      Akan dibuat otomatis saat kamu mulai menulis kode, atau minta AI: "buatkan catatan project".')
  }

  // 5. .github/ folder (team mode)
  if (fs.existsSync(path.join(projectRoot, '.github'))) {
    emit('OK    .github/ ada (robot keamanan terpasang)')
    c.ok++
  } else {
    emit('INFO  .github/ tidak ada (dilewati saat pasang, atau project non-GitHub)')
  }

  // 6. .git/ internal (seharusnya TIDAK ada untuk clone Pola B)
  const internalGit = path.join(kitDir, '.git')
  if (fs.existsSync(internalGit)) {
    emit(`WARN  ${NAMA_FOLDER_KIT}\\.git\\ masih ada (sisa dari clone)`)
    emit(`      Saran: Remove-Item '${internalGit}' -Recurse -Force`)
    c.warn++
  } else {
    emit(`OK    ${NAMA_FOLDER_KIT}/ tidak ada .git/ internal`)
    c.ok++
  }
  return c
}

// ---- Cek 6b: LOKASI PASANG (Celah 4, ADR-024) ----
//
// KENAPA: kit yang mendarat di folder yang BUKAN akar project gagal secara SENYAP - CLAUDE.md tak
// dimuat di awal sesi, .claude/settings.json tak terbaca, hook menunjuk berkas yang tak ada lalu mati
// diam-diam (fail-open exit 0). Client mengira lintasAI aktif padahal tidak, TANPA pesan error apa pun.
// Cek ini satu-satunya yang bisa memberitahunya. Tiap kegagalan WAJIB menampilkan PERBAIKANNYA, bukan
// cuma "ada masalah" - laporan yang tak bisa ditindaklanjuti sama tak bergunanya dengan diam.
//
// CUMA-BACA: memindahkan berkas = aksi mengubah, jadi cek ini hanya MENAWARKAN langkahnya (§5).
export function checkInstallLocation(kitDir, projectRoot, emit) {
  const c = { ok: 0, warn: 0, err: 0 }
  emit('')
  emit('--- Lokasi pasang (apakah lintasAI akan benar-benar termuat?) ---')

  const kitParent = path.dirname(path.resolve(kitDir))
  const claudeMd = path.join(kitParent, 'CLAUDE.md')
  const settingsJson = path.join(kitParent, '.claude', 'settings.json')

  // ANTI ALARM-PALSU: folder induk yang TIDAK tampak seperti project sama sekali (tak ada berkas
  // penanda stack, tak ada .git, tak ada CLAUDE.md/AGENTS.md) bukan pemasangan nyata - itu kit yang
  // diinspeksi lepas dari project-nya (mis. sarang uji, atau `doctor` diarahkan ke folder kit telanjang).
  // Melaporkannya ERROR = temuan-karangan yang menutupi temuan asli. Dilewati JUJUR, bukan dihijaukan:
  // pesannya menyatakan terus terang bahwa "dilewati" != "aman".
  //
  // Pemasangan nyata SELALU punya saudara: pemasang menulis CLAUDE.md + AGENTS.md + docs/ di folder
  // yang sama. Jadi kit yang mendarat di folder yang salah TETAP diperiksa - persis kasus yang dicari.
  const tandaProject = ['package.json', 'composer.json', 'go.mod', 'pyproject.toml', '.git', 'CLAUDE.md', 'AGENTS.md']
  const tampakProject = tandaProject.some((n) => fs.existsSync(path.join(kitParent, n)))
  if (!tampakProject) {
    emit(`INFO  Folder induk kit (${kitParent}) tidak tampak seperti project - pemeriksaan lokasi dilewati.`)
    emit('        -> "Dilewati" BUKAN berarti aman: jalankan doctor dari dalam project yang sesungguhnya.')
    return c
  }

  // (1) .lintasai/ sefolder dengan CLAUDE.md
  if (fs.existsSync(claudeMd)) {
    emit(`OK    CLAUDE.md sefolder dengan ${NAMA_FOLDER_KIT}/ (${kitParent})`)
    c.ok++
  } else {
    emit(`ERROR CLAUDE.md TIDAK ada di ${kitParent}`)
    emit('        -> Tanpa berkas ini, aturan lintasAI tak pernah dimuat saat sesi AI dibuka.')
    emit(`        -> Perbaikan: jalankan \`npx lintasai init\` dari ${kitParent}`)
    c.err++
  }

  // (2) .claude/settings.json sefolder juga
  if (fs.existsSync(settingsJson)) {
    emit('OK    .claude/settings.json sefolder juga (hook bisa terdaftar)')
    c.ok++
  } else {
    emit(`WARN  .claude/settings.json TIDAK ada di ${kitParent}`)
    emit('        -> Akibatnya hook/palang tidak terdaftar: Palang Rem & pengingat bahasa tak jalan.')
    emit('        -> Perbaikan: `npx lintasai enable-risk-gate` dari folder itu.')
    c.warn++
  }

  // (3) folder itu = akar project yang terdeteksi
  let jejak = null
  try {
    jejak = findProjectRoot(kitParent)
  } catch { /* fail-honest: dilaporkan di bawah */ }
  if (!jejak) {
    emit('WARN  Akar project tak bisa dideteksi (pemeriksaan dilewati, bukan berarti aman).')
    c.warn++
  } else if (path.resolve(jejak.root).toLowerCase() === path.resolve(kitParent).toLowerCase()) {
    emit(`OK    Folder ini memang akar project (dasar: ${jejak.cara === 'git' ? 'repo git' : jejak.cara === 'penanda' ? `berkas ${jejak.penanda}` : 'folder kerja'})`)
    c.ok++
  } else {
    emit(`ERROR Kit terpasang di ${kitParent}, tapi akar project ada di ${jejak.root}`)
    emit('        -> Kalau alat AI dibuka dari akar project, aturan lintasAI TIDAK termuat dan')
    emit('           seluruh pengamannya tidak jalan - tanpa satu pun pesan error.')
    emit('        -> Pilihan A (disarankan): pasang ulang di akar ->')
    emit(`           cd ${jejak.root} && npx lintasai init --project-root-mode=akar`)
    emit('        -> Pilihan B (kalau memang disengaja, mis. monorepo per-paket): biarkan, TAPI selalu')
    emit(`           buka alat AI-mu dari ${kitParent}, bukan dari akar project.`)
    emit('        -> Memindahkan berkas TIDAK dilakukan otomatis (aksi mengubah butuh persetujuanmu).')
    c.err++
  }

  // (4) path hook di settings.json benar-benar resolve ke berkas nyata
  if (fs.existsSync(settingsJson)) {
    let hooksTeks = ''
    try { hooksTeks = fs.readFileSync(settingsJson, 'utf8') } catch { hooksTeks = '' }
    // Ambil path berkas kit yang disebut perintah hook (.lintasai/... .mjs|.js), lalu buktikan ADA.
    const disebut = [...hooksTeks.matchAll(/\.lintasai[\\/][\w./\\-]+\.(?:mjs|js)/g)].map((m) => m[0].replace(/\\/g, '/'))
    const unik = [...new Set(disebut)]
    if (unik.length === 0) {
      emit('WARN  Tak ada satu pun hook lintasAI terdaftar di .claude/settings.json.')
      emit('        -> Perbaikan: `npx lintasai enable-risk-gate` (Palang Rem = pengaman default).')
      c.warn++
    } else {
      const hilang = unik.filter((rel) => !fs.existsSync(path.join(kitParent, rel)))
      if (hilang.length === 0) {
        emit(`OK    ${unik.length} path hook menunjuk berkas yang benar-benar ada`)
        c.ok++
      } else {
        emit(`ERROR ${hilang.length} path hook menunjuk berkas yang TIDAK ADA: ${hilang.join(', ')}`)
        emit('        -> Hook seperti ini mati diam-diam (keluar tanpa pesan), jadi kamu takkan pernah tahu.')
        emit(`        -> Perbaikan: \`npx lintasai update\` (memulihkan isi ${NAMA_FOLDER_KIT}/), lalu jalankan doctor lagi.`)
        c.err++
      }
    }
  }

  return c
}

// ---- Cek 6c: status per-alat AI - aturan sampai ke mana, palang berlaku di mana (v4 Tugas 10/11) ----
//
// KENAPA ADA: kit sekarang melayani 4 alat, dan dukungannya TIDAK sama rata. Aturan (teks) bisa sampai
// ke keempatnya, tapi palang mesin (Palang Rem, Palang Rak, Lampu Hijau plan mode) butuh sistem hook -
// dan Cursor + Codex tidak punya. Itu batas ALAT, bukan kekurangan kit; yang salah adalah MENDIAMKANNYA.
// Client Cursor berhak tahu ia tidak mendapat palang, alih-alih mengira dirinya terlindungi (§2).
// Ditambah gerbang ukuran Codex (32 KiB) yang bisa menahan aturan tanpa suara kalau tak dilaporkan.
export function checkAiTools(kitDir, projectRoot, emit) {
  const c = { ok: 0, warn: 0, err: 0 }
  const ada = (...p) => fs.existsSync(path.join(projectRoot, ...p))
  let settingsTeks = ''
  try { settingsTeks = fs.readFileSync(path.join(projectRoot, '.claude', 'settings.json'), 'utf8') } catch { settingsTeks = '' }

  emit('')
  emit('--- Alat AI: aturan sampai ke mana, palang berlaku di mana ---')

  const baris = bangunMatriksHarness({ ada, settingsTeks })

  // Penghitung "palang seharusnya menahan tapi tak bisa" (session_id kosong). State di os.tmpdir(),
  // jadi ia MESIN-global bukan per-project - batas itu ditulis di dalam sarannya sendiri.
  try {
    const st = readState(STATE_NAMESPACE_TERLEWAT, kunciProject(projectRoot), { n: 0, terakhir: '' })
    const b = barisPalangTerlewat(st.n, st.terakhir)
    if (b) baris.push(b)
  } catch { /* fail-open: doctor tak boleh gagal gara-gara penghitung */ }

  for (const b of baris) {
    emit(`${b.level.padEnd(5)} ${b.teks}`)
    if (b.saran) emit(`        -> ${b.saran}`)
    if (b.level === LEVEL_HARNESS.OK) c.ok++
    else if (b.level === LEVEL_HARNESS.WARN) c.warn++
    else if (b.level === LEVEL_HARNESS.ERR) c.err++
    // INFO sengaja tak dihitung: alat yang tak dipakai bukan masalah.
  }

  return c
}

// ---- Cek 7: lingkungan eksekusi (parity) - potret runtime klien via engine/env-check.mjs. --no-env skip ----
export function checkEnvironment(projectRoot, extra, emit) {
  const c = { ok: 0, warn: 0, err: 0 }
  const skipEnv = extra.some((a) => String(a).toLowerCase() === '--no-env')
  if (!skipEnv) {
    emit('')
    emit('--- Lingkungan eksekusi (parity) ---')
    try {
      const { findings } = runEnvCheck(projectRoot)
      for (const f of findings) {
        emit(`${f.level.padEnd(5)} ${f.label}: ${f.message}`)
        if (f.hint) emit(`        -> ${f.hint}`)
        if (f.level === 'OK') c.ok++
        else if (f.level === 'WARN') c.warn++
        else if (f.level === 'ERROR') c.err++
      }
    } catch {
      // Robot env gagal != kit rusak: lapor jujur (fail-honest), jangan diam-diam OK, jangan crash doctor.
      emit('WARN  Pemeriksaan lingkungan gagal dijalankan (dilewati). Bagian kit di atas tetap sahih.')
      c.warn++
    }
  }
  return c
}
