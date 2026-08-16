// engine/setup-summary.mjs — RANGKUMAN AKHIR pemasangan + dua papan status yang jadi buktinya.
//
// Dipecah dari setup-pola-b.mjs (Fase E 2026-07-25, fase C): isi dipindah APA ADANYA — tiap baris
// keluaran byte-identik. Teks banner "KIT lintasAI - TER-INSTALL" dikunci tes smoke orkestrator, dan
// kedua build*Lines dikunci tests/setup-pola-b-write.test.mjs — jangan ubah teksnya tanpa tesnya.
//
// Semua fungsi di sini CUMA-BACA (existsSync + baca teks): mereka MELAPORKAN keadaan, tak pernah
// mengubahnya. Itu yang membuat panel "SUDAH AKTIF" jadi BUKTI, bukan klaim (§2.3 "ditulis != terbukti").
import fs from 'node:fs'
import path from 'node:path'
import { getPackageManager } from './project-detect.mjs'
import { buildCommitGuidance } from './setup-interactive.mjs'
import { NAMA_FOLDER_KIT } from './project-root.mjs'
// Cetak rangkuman akhir + panduan tindak-lanjut (bagian:
// SUDAH AKTIF / yang perlu kamu lakukan / alat paket / panduan simpan ke git / langkah berikut /
// langkah yang dilewati / Status SIAP NGODING).
// #4 Papan "apa yang sudah nyala vs belum": cek deterministik (cuma-baca) status tiap PENJAGA yang bisa
// dinyalakan di project, supaya owner tahu di Hari-0 mana yang masih tidur (bukan baru ketahuan saat
// insiden). Pola lintasAI: penjaga default NYALA (mis. Palang Rem risk-gate sejak v1.61.0) -> panel ini
// MEMBUATNYA TERLIHAT + 1 kalimat cara nyalakan (ramah non-programmer). Semua cek = existsSync / baca
// teks -> tak mengubah apa pun. Diekspor untuk uji-banding. Dipakai printFinalSummary (hanya saat bukan simulasi).
export function buildGuardStatusLines(projectRoot) {
  const lines = []
  const mark = (on) => (on ? '[x]' : '[ ]')
  const hasText = (p, needle) => {
    try { return fs.existsSync(p) && fs.readFileSync(p, 'utf8').includes(needle) } catch { return false }
  }
  // 1) Penjaga rahasia pre-commit (tolak commit .env/kunci di laptop). Penanda = baris header template.
  const secretOn = hasText(path.join(projectRoot, '.git', 'hooks', 'pre-commit'), 'lintasAI pre-commit secret guard')
  lines.push(`  ${mark(secretOn)} Penjaga rahasia (commit)   : ${secretOn ? 'NYALA' : 'BELUM - buat repo dulu (git init), lalu: npx lintasai update'}`)
  // 2) Palang Rem aksi-berbahaya (risk-gate) - default NYALA sejak v1.61.0, di .claude/settings.json.
  const riskOn = hasText(path.join(projectRoot, '.claude', 'settings.json'), 'risk-gate')
  lines.push(`  ${mark(riskOn)} Palang Rem aksi-berbahaya  : ${riskOn ? 'NYALA (matikan: hapus blok PreToolUse risk-gate)' : 'BELUM (harusnya default NYALA) - jalankan: npx lintasai enable-risk-gate'}`)
  // 2b) Lampu Hijau Plan Mode (plan-mode-gate) - default NYALA (ADR-021), di .claude/settings.json.
  // Ikut dilaporkan karena ia MENGUBAH perilaku izin (mengurangi dialog saat plan mode) - staff berhak
  // tahu apa yang menyala di mesinnya, bukan cuma pagar yang menambah pertanyaan.
  const planGateOn = hasText(path.join(projectRoot, '.claude', 'settings.json'), 'plan-mode-gate')
  lines.push(`  ${mark(planGateOn)} Lampu Hijau Plan Mode      : ${planGateOn ? 'NYALA (saat plan mode, aksi cuma-baca tanpa dialog izin)' : `BELUM (harusnya default NYALA) - jalankan: node ${NAMA_FOLDER_KIT}/engine/ensure-plan-mode-gate-hook.mjs`}`)
  // 2c) Palang Rak (rak-gate) - default NYALA sejak v4.0.0 (Tugas 17), di .claude/settings.json.
  // Tahan edit berkas berisiko (login/bayar/migrasi/API/unggah/DevOps) pertama kali per sesi sampai
  // panduan terkait dibuka. Ditegakkan dari catatan pembacaan, bukan klaim; isi panduan tak mengikat.
  const rakGateOn = hasText(path.join(projectRoot, '.claude', 'settings.json'), 'rak-gate')
  lines.push(`  ${mark(rakGateOn)} Palang Rak (buka panduan)  : ${rakGateOn ? 'NYALA (matikan: hapus blok PreToolUse rak-gate)' : 'BELUM (harusnya default NYALA) - jalankan: npx lintasai enable-rak-gate'}`)
  return lines
}

// Verifikasi 4 TITIK-MASUK harness benar-benar MENDARAT di akhir install (bukan klaim statis).
// KENAPA: panel "SUDAH AKTIF" dulu meng-klaim kernel aktif TANPA bukti; kalau satu generator gagal-senyap
// (mis. Cursor .mdc lewat try/catch di engine/setup-hooks.mjs), client tak akan tahu (§2.3 "ditulis != terbukti").
// Cek murni-file + FAIL-SAFE: pelengkap, TAK BOLEH bikin install gagal (dipanggil dalam try/catch di
// printFinalSummary). Cerminan buildGuardStatusLines (hook) - beda concern: ini titik-masuk aturan tiap harness.
// kitDir = <project>/.lintasai (Pola B, selalu). Diuji tests/setup-pola-b-write.test.mjs.
export function buildHarnessLandingLines(projectRoot, kitDir) {
  const lines = []
  const mark = (on) => (on ? '[x]' : '[ ]')
  const exists = (p) => { try { return fs.existsSync(p) } catch { return false } }
  const hasText = (p, needle) => {
    try { return fs.existsSync(p) && fs.readFileSync(p, 'utf8').includes(needle) } catch { return false }
  }
  // 1) AGENTS.md di ROOT = kernel yang dibaca Codex & Kimi NATIVE (ADR-032). Marker = judul kernel.
  const agentsOn = hasText(path.join(projectRoot, 'AGENTS.md'), 'Aturan Kerja lintasAI')
  lines.push(`  ${mark(agentsOn)} Codex + Kimi (AGENTS.md akar): ${agentsOn ? 'kernel di akar project - dibaca native tiap sesi' : 'HILANG - jalankan: npx lintasai update'}`)
  // 2) CLAUDE.md = pemuat Claude Code (@import AGENTS.md + override).
  const claudeOn = hasText(path.join(projectRoot, 'CLAUDE.md'), '@./AGENTS.md')
  lines.push(`  ${mark(claudeOn)} Claude Code (CLAUDE.md)     : ${claudeOn ? '@import AGENTS.md aktif' : 'HILANG/rusak - jalankan: npx lintasai update'}`)
  // 3) Cursor = .cursor/rules/lintasai.mdc (alwaysApply). Paling rawan gagal-senyap saat generate.
  const cursorOn = hasText(path.join(projectRoot, '.cursor', 'rules', 'lintasai.mdc'), 'alwaysApply: true')
  lines.push(`  ${mark(cursorOn)} Cursor (.cursor/rules)      : ${cursorOn ? 'aturan alwaysApply terpasang' : 'BELUM - jalankan: npx lintasai adapter-sync --write (abaikan bila tak pakai Cursor)'}`)
  // 4) Isi kit di .lintasai/ = sumber rak on-demand (skills/ + registry.json) yang dirujuk kernel.
  const kitOn = exists(path.join(kitDir, 'AGENTS.md')) && exists(path.join(kitDir, 'skills', 'registry.json'))
  lines.push(`  ${mark(kitOn)} Isi kit (${NAMA_FOLDER_KIT}/)      : ${kitOn ? 'skills/ + registry.json siap (rak on-demand)' : 'HILANG - pasang ulang: npx lintasai init'}`)
  return lines
}

// Cetak perintah pasang dependensi yang BENAR untuk project ini (npm/pnpm/yarn dideteksi dari
// berkas-kunci). BEST-EFFORT: deteksi alat paket cuma pelengkap — kegagalannya ditelan diam-diam
// supaya tak pernah menggagalkan rangkuman pemasangan. Isi + urutan baris dipindah APA ADANYA.
function printPackageManagerHint(projectRoot) {
  try {
    const pm = getPackageManager(projectRoot)
    if (pm.manager && pm.manager !== 'none' && pm.installCmd) {
      console.log('')
      console.log(`=== Perintah pasang dependensi (terdeteksi: ${pm.manager}) ===`)
      console.log(`  Pakai: ${pm.installCmd}`)
      // Susun alasan dalam Bahasa Indonesia (pm.reason dari modul lain berbahasa Inggris - jangan
      // dicetak mentah ke staff non-programmer, §2.1; robot bahasa tak lihat nilai antar-modul).
      const alasan = pm.lockFile
        ? `terdeteksi dari berkas-kunci ${pm.lockFile}`
        : (pm.confidence === 'high'
            ? 'dideklarasikan di package.json (kolom packageManager)'
            : 'bawaan npm - belum ada berkas-kunci (keyakinan sedang)')
      console.log(`  Alasan: ${alasan}`)
      if (pm.runCmd) console.log(`  Jalankan server lokal: ${pm.runCmd}`)
    }
  } catch (e) {
    // diam - deteksi alat paket cuma pelengkap, jangan bikin gagal.
  }
}

// Panduan simpan hasil setup ke git. Kebijakan branch/PR/review = urusan repo client sendiri
// (proteksi `main` mereka yang atur) — kit tidak ikut mendeteksi/menasihatinya.
// Cabang catch = teks cadangan ringkas, tetap memberi perintah yang bisa langsung disalin staff.
function printGitGuidance(kitVersion) {
  try {
    console.log('')
    console.log('=== Panduan simpan ke git ===')
    for (const line of buildCommitGuidance(kitVersion)) console.log(line)
  } catch (e) {
    console.log('')
    console.log('=== Panduan simpan ke git ===')
    console.log(`  [ ] opsional  Simpan setup ke git: git add AGENTS.md AGENTS.local.md CLAUDE.md ${NAMA_FOLDER_KIT}/ docs/ .github/ && git commit -m 'chore: pasang standar tim IT'`)
  }
}

export function printFinalSummary({ projectName, projectRoot, kitVersion, almostEmpty, dryRun, skippedSteps, kesehatan = null }) {
  console.log('')
  console.log('================================================================')
  // Teks banner "KIT lintasAI - TER-INSTALL" =
  // penanda sukses pemasangan yang dikunci tes smoke orkestrator - jangan ganti tanpa memperbarui tesnya.
  console.log(`  OK    KIT lintasAI - TER-INSTALL DI ${projectName}`)
  console.log('================================================================')
  console.log('')

  console.log('SUDAH AKTIF (otomatis dibaca tiap sesi AI):')
  // Verifikasi NYATA titik-masuk aturan tiap harness (bukan klaim statis, §2.3). Simulasi: berkas belum
  // ditulis -> tampilkan klaim ringkas (kalau dicek, semua [ ] menyesatkan). FAIL-SAFE: cek tak boleh menggagalkan.
  if (!dryRun) {
    try {
      for (const line of buildHarnessLandingLines(projectRoot, path.join(projectRoot, NAMA_FOLDER_KIT))) console.log(line)
    } catch { console.log('  [x] Aturan AI                : kernel AGENTS.md + rak panduan on-demand (skills/)') }
  } else {
    console.log('  [x] Aturan AI                : kernel AGENTS.md + rak panduan on-demand (skills/) [SIMULASI]')
  }
  if (almostEmpty) {
    console.log('  [ ] docs/             : DILEWATI (project hampir kosong) - akan dibuat otomatis saat ada kode')
    console.log('  [ ] .github/          : DILEWATI (project hampir kosong) - robot keamanan CI belum disalin')
  } else {
    // JUJUR (§2.3): sejak v6.0.0 installer HANYA mkdir docs/ - nol panduan disalin ke sana
    // (engine/setup-deploy.mjs "SATU SUMBER, BUKAN DUA"), dan update-cleanup justru MENGHAPUS salinan
    // lama. Baris ini dulu menyebut _PATTERNS/_EXAMPLE/STACK_GUIDE/SECURITY_INCIDENT_PLAYBOOK -> client
    // diarahkan ke folder kosong tepat saat ia butuh. Sebut rumah yang BENAR.
    console.log(`  [x] docs/             : folder dokumen project (kosong - ingatan project: docs/lintasai/ · panduan kit: ${NAMA_FOLDER_KIT}/templates/)`)
    console.log('  [x] .github/          : secret-guard.yml (robot keamanan CI)')
  }
  console.log('')

  // #4 Papan status penjaga (nyala vs belum) - hanya saat bukan simulasi (di simulasi berkas tak ditulis).
  if (!dryRun) {
    try {
      console.log('STATUS PENJAGA (nyala vs belum - cek cepat, cuma-baca):')
      for (const line of buildGuardStatusLines(projectRoot)) console.log(line)
      console.log('  Frasa ajaib untuk AI (tinggal ketik): "lintasAI skill" = pindai menyeluruh; "rapikan kode".')
      console.log('')
    } catch { /* panel status = pelengkap; jangan pernah bikin pemasangan gagal */ }
  }

  console.log('HAL YANG PERLU KAMU LAKUKAN SENDIRI:')
  printPackageManagerHint(projectRoot)
  printGitGuidance(kitVersion)
  console.log('')

  console.log('LANGKAH SELANJUTNYA:')
  console.log(`  Buka Claude Code di ${projectRoot}, lalu langsung kerja.`)
  console.log('  Aturan AI (termasuk standar profesional lintas-bidang) otomatis kebaca tiap sesi -')
  console.log('  tak ada langkah pemasangan lanjutan yang perlu kamu jalankan.')
  console.log('  Struktur project dibaca dari GIT saat perlu (cepat, ~0 token); catatan/dokumentasi')
  console.log('  dibuat cuma kalau kamu minta. Butuh rapikan kode? tinggal minta lewat chat.')
  console.log('')

  console.log('UPDATE KIT KE VERSI BARU:')
  console.log('  npx lintasai update   (auto unduh-ulang + cadangkan + deteksi [BREAKING]/[SCAN-REQUIRED])')
  console.log('')

  // Sebut perintah pemeriksanya, jangan cuma jalankan sekali lalu diam: kalau kelak aturan tiba-tiba
  // "tak terasa" (hook hilang, kit dipindah, berkas terhapus), inilah satu perintah yang menjawabnya.
  // Tanpa disebut di sini, client tak pernah tahu perintah ini ada.
  console.log('CEK KESEHATAN KIT KAPAN SAJA:')
  console.log('  npx lintasai doctor   (aturan sampai ke alat AI mana saja · palang mana yang nyala · berkas utuh?)')
  if (kesehatan && kesehatan.dijalankan && kesehatan.kode !== 0) {
    console.log(`  Catatan: cek barusan menemukan hal yang perlu ditinjau (kode ${kesehatan.kode}) - baca bagian "Kit Doctor" di atas.`)
    console.log('  Pemasangan sendiri BERHASIL; sebagian besar temuan doctor adalah peringatan wajar di project baru.')
  }
  console.log('')

  if (dryRun) console.log('Mode SIMULASI: jalankan ulang tanpa --dry-run untuk eksekusi sungguhan.')

  // Lapor jujur langkah yang dilewati (tetap selesai dengan kode-keluar 0 / graceful).
  if (skippedSteps.length > 0) {
    console.log('')
    // "oleh user" DICABUT: di mode otomatis tak ada user yang memilih apa pun (§2.2) - alasan
    // sebenarnya ikut di tiap baris di bawah.
    console.log('Pemasangan selesai dengan beberapa langkah dilewati:')
    for (const s of skippedSteps) console.log(`  - ${s}`)
    console.log('')
  }
  console.log('Status: SIAP NGODING')
  console.log('')
}

