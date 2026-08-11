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
// PERILAKU DIKUNCI (jaring pra-refactor): tests/kit-doctor-branches.test.mjs (versi/struktur/ringkasan) +
// tests/doctor-v2-artifacts.test.mjs (artefak yatim 2e/2f) menjalankan doctor SUNGGUHAN -> penyimpangan
// keluaran apa pun langsung merah.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { runCodexAgentsGen } from './adapter-rules-gen.mjs'

import { getKitVersionFallback } from './version-detect.mjs'
import { getLatestNpmVersion } from './npm-query.mjs'
import { compareDotNetVersion } from '../update-kit.mjs'
import { runEnvCheck } from './env-check.mjs'
import { isLegacyUpdateGuide } from './template-deploy.mjs'
import { findProjectRoot } from './project-root.mjs'

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

// ---- Cek 2c: laporan migrasi artefak klien (robot anak engine/migration-state.mjs) ----
// FAIL-HONEST: robot gagal/berhenti-sebelum-melapor != artefak sehat -> WARN (jangan diam-diam OK, jangan
// pula divonis "belum termigrasi"). Pembeda crash vs laporan = baris penanda robot (kontrak string).
export function checkMigrationReport(kitDir, projectRoot, extra, emit) {
  const c = { ok: 0, warn: 0, err: 0 }
  const skipMigrasi = extra.some((a) => String(a).toLowerCase() === '--skip-migrasi')
  const migrationRobot = path.join(kitDir, 'engine', 'migration-state.mjs')
  if (skipMigrasi) {
    emit('INFO  Laporan migrasi dilewati (--skip-migrasi - pemanggil menjalankan laporannya terpisah / sedang banding PS==Node).')
  } else if (!fs.existsSync(migrationRobot)) {
    emit('INFO  Laporan migrasi dilewati: kit yang diinspeksi belum punya engine/migration-state.mjs (kit lama).')
  } else {
    const r = spawnSync(process.execPath, [migrationRobot, '--project-root', projectRoot, '--kit-dir', kitDir], { encoding: 'utf8', timeout: 60000 })
    const robotOut = r.stdout || ''
    if (robotOut.trim()) process.stdout.write(robotOut) // teruskan laporan robot ke layar
    const reportPrinted = robotOut.includes('Robot laporan-migrasi artefak klien')
    if (r.error || r.status == null || (r.status !== 0 && !reportPrinted)) {
      emit('WARN  Robot laporan-migrasi gagal dijalankan / berhenti sebelum melapor (dilewati).')
      emit('      Kemungkinan salinan kit tidak lengkap - coba pasang ulang / update kit, atau jalankan')
      emit('      manual untuk lihat detailnya: node .claude-kit/engine/migration-state.mjs')
      c.warn++
    } else if (r.status === 0) {
      emit('OK    Artefak klien sesuai versi yang diharapkan kit (laporan migrasi di atas).')
      c.ok++
    } else {
      emit(`ERROR ${r.status} artefak klien belum/tak terbukti termigrasi (lihat laporan di atas) - status "Selesai sebagian", belum "aman penuh".`)
      c.err++
    }
  }
  return c
}

// ---- Cek 2e + 2e-bis + 2f: artefak PowerShell era-lama (yatim / sisa v1 / UPDATE_GUIDE) - INFO saja ----
export function checkOrphanArtifacts(kitDir, projectRoot, emit) {
  const c = { ok: 0, warn: 0, err: 0 }
  // 2e. Artefak PowerShell yatim milik klien DI LUAR .claude-kit (mis. .github/scripts/*.ps1, docs/*.psd1).
  const orphanScan = [
    ['.github\\scripts', /\.ps1$/i],
    ['docs', /\.psd1$/i],
  ]
  const orphanHits = []
  for (const [rel, re] of orphanScan) {
    let entries = []
    try { entries = fs.readdirSync(path.join(projectRoot, rel)) } catch { entries = [] }
    for (const name of entries) { if (re.test(name)) orphanHits.push(`${rel}\\${name}`) }
  }
  if (orphanHits.length > 0) {
    emit(`INFO  ${orphanHits.length} artefak PowerShell era-lama terdeteksi (kit kini 100% Node - aman dibersihkan):`)
    for (const h of orphanHits) emit(`        - ${h}`)
    emit('      Opsional: hapus manual bila tak dipakai (pengganti kunci-gabung: GitHub Settings -> Branches).')
  }

  // 2e-bis. Sisa alat PowerShell DI DALAM .claude-kit (footgun update-kit.ps1 setengah-jadi + stub
  //         setup-pola-b.ps1 lama). Kit v3 = 100% Node, TAK mengirim .ps apa pun -> semua .ps = sisa basi.
  const stalePsHits = []
  for (const sub of ['', 'lib', 'engine']) {
    const dir = sub ? path.join(kitDir, sub) : kitDir
    let entries = []
    try { entries = fs.readdirSync(dir) } catch { entries = [] }
    for (const name of entries) {
      if (!/\.ps(1|m1|d1)$/i.test(name)) continue
      stalePsHits.push(sub ? `${sub}/${name}` : name)
    }
  }
  if (stalePsHits.length > 0) {
    emit(`INFO  ${stalePsHits.length} sisa alat PowerShell di .claude-kit/ (kit v3 = 100% Node, tak ada .ps yang sah):`)
    for (const h of stalePsHits) emit(`        - .claude-kit/${h}`)
    emit('      Aman dibersihkan manual. JANGAN jalankan update-kit.ps1/kit.ps1 lama - pakai `npx lintasai update`.')
  }

  // 2f. docs/UPDATE_GUIDE.md era-PowerShell (salinan lama menyuruh `kit.ps1 update`). INFO ajakan update.
  const guidePath = path.join(projectRoot, 'docs', 'UPDATE_GUIDE.md')
  if (fs.existsSync(guidePath)) {
    try {
      if (isLegacyUpdateGuide(fs.readFileSync(guidePath, 'utf8'))) {
        emit('INFO  docs/UPDATE_GUIDE.md masih menyebut perintah PowerShell lama (kit.ps1 / update-kit.ps1).')
        emit('      Saran lunak: `npx lintasai update` akan menyegarkannya otomatis + menyimpan cadangan ber-cap-waktu.')
      }
    } catch { /* baca gagal -> lewati senyap (bukan error gerbang) */ }
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

// ---- Cek 3-6: struktur project (AGENTS.md, docs/, .github/, .git internal .claude-kit) ----
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
    emit('WARN  docs/ belum dibuat')
    emit('      Saran: npx lintasai init')
    c.warn++
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
    emit('WARN  .claude-kit\\.git\\ masih ada (sisa dari clone)')
    emit(`      Saran: Remove-Item '${internalGit}' -Recurse -Force`)
    c.warn++
  } else {
    emit('OK    .claude-kit/ tidak ada .git/ internal')
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
// CUMA-BACA: memindahkan berkas = aksi mengubah, jadi cek ini hanya MENAWARKAN langkahnya (§8.2 A6).
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

  // (1) .claude-kit/ sefolder dengan CLAUDE.md
  if (fs.existsSync(claudeMd)) {
    emit(`OK    CLAUDE.md sefolder dengan .claude-kit/ (${kitParent})`)
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
    // Ambil path berkas kit yang disebut perintah hook (.claude-kit/... .mjs|.js), lalu buktikan ADA.
    const disebut = [...hooksTeks.matchAll(/\.claude-kit[\\/][\w./\\-]+\.(?:mjs|js)/g)].map((m) => m[0].replace(/\\/g, '/'))
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
        emit('        -> Perbaikan: `npx lintasai update` (memulihkan isi .claude-kit/), lalu jalankan doctor lagi.')
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
// Client Cursor berhak tahu ia tidak mendapat palang, alih-alih mengira dirinya terlindungi (§8.2 A4).
// Ditambah gerbang ukuran Codex (32 KiB) yang bisa menahan aturan tanpa suara kalau tak dilaporkan.
export function checkAiTools(kitDir, projectRoot, emit) {
  const c = { ok: 0, warn: 0, err: 0 }
  const ada = (...p) => fs.existsSync(path.join(projectRoot, ...p))
  const settingsJson = path.join(projectRoot, '.claude', 'settings.json')
  let settingsTeks = ''
  try { settingsTeks = fs.readFileSync(settingsJson, 'utf8') } catch { settingsTeks = '' }

  emit('')
  emit('--- Alat AI: aturan sampai ke mana, palang berlaku di mana ---')

  // Claude Code - satu-satunya yang mendapat SELURUH palang.
  if (ada('CLAUDE.md')) {
    emit('OK    Claude Code    : aturan lewat CLAUDE.md · palang otomatis BERLAKU')
    c.ok++
  } else {
    emit('WARN  Claude Code    : CLAUDE.md tak ada di folder ini - aturan tak dimuat di awal sesi.')
    emit('        -> Perbaikan: jalankan `npx lintasai` dari folder akar project.')
    c.warn++
  }

  // Kimi Code - punya adaptor hook sendiri.
  if (ada('.kimi-code', 'AGENTS.md')) {
    emit('OK    Kimi Code      : aturan lewat .kimi-code/AGENTS.md · palang BERLAKU (adaptor Kimi)')
    c.ok++
  } else {
    emit('INFO  Kimi Code      : belum ada .kimi-code/AGENTS.md (normal kalau kamu tak memakai Kimi).')
  }

  // Cursor - aturan sampai, palang TIDAK.
  if (ada('.cursor', 'rules', 'lintasai.mdc')) {
    emit('OK    Cursor         : aturan lewat .cursor/rules/lintasai.mdc (alwaysApply) · palang TIDAK berlaku')
    emit('        -> Cursor tak punya sistem hook. Yang sampai cuma teks aturannya - itu batas alatnya.')
    c.ok++
  } else {
    emit('INFO  Cursor         : belum ada .cursor/rules/lintasai.mdc (normal kalau kamu tak memakai Cursor).')
  }

  // Codex - aturan bisa sampai, TAPI dibatasi 32 KiB. Gerbang wajib bersuara.
  try {
    const cx = runCodexAgentsGen({ repoRoot: projectRoot, write: false })
    if (!cx.present) {
      emit('INFO  Codex          : berkas aturan sumber tak ketemu - status tak bisa dinilai.')
    } else if (cx.fits === false) {
      emit(`WARN  Codex          : aturan BELUM terpasang - ${cx.bytes.toLocaleString('en-US')} byte melebihi batas Codex ${cx.capBytes.toLocaleString('en-US')} byte.`)
      emit('        -> AGENTS.md-mu TIDAK disentuh (sengaja): aturan yang terpotong diam-diam lebih')
      emit('           berbahaya daripada aturan yang jelas belum terpasang. Codex tetap membaca aturan')
      emit('           khusus project di AGENTS.md seperti biasa. Terbuka sendiri setelah aturan diramping.')
      c.warn++
    } else {
      emit(`OK    Codex          : aturan terpasang di AGENTS.md (${cx.bytes.toLocaleString('en-US')} byte, muat di bawah ${cx.capBytes.toLocaleString('en-US')}) · palang TIDAK berlaku`)
      c.ok++
    }
  } catch {
    emit('INFO  Codex          : status tak bisa dinilai di lingkungan ini (dilewati, bukan error).')
  }

  // Lampu Hijau plan mode - hanya Claude Code (+ Kimi bila harness-nya melaporkan permission_mode).
  if (settingsTeks.includes('plan-mode-gate')) {
    emit('OK    plan-mode-gate : NYALA (Claude Code) - saat plan mode, perintah cuma-baca tak lagi menghujani dialog izin')
    emit('        -> Tak berlaku di Cursor & Codex (tak ada hook). Di Kimi: hanya kalau harness-nya')
    emit('           melaporkan permission_mode - kalau tidak, format rencananya tetap jalan lewat teks aturan.')
    c.ok++
  } else {
    emit('INFO  plan-mode-gate : belum terpasang (opsional). Tanpa ini, plan mode tetap jalan - cuma dialog izinnya lebih sering muncul.')
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
