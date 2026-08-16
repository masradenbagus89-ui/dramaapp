// engine/setup-stage2.mjs — TAHAP 2 pemasang: identitas git + buka VS Code.
//
// Dipecah dari setup-pola-b.mjs (Fase E 2026-07-25, fase B): isi dipindah APA ADANYA — tiap baris
// konsol, urutan cek, dan cabang keputusan byte-identik.
// TAHAP 2 = fungsi "lem" interaktif (jawaban-aman non-interaktif + penolong murni
// engine/setup-interactive.mjs). Mode otomatis/tanpa-layar: popup tak tampil, pakai nilai-aman.
//
// 🚨 CATATAN: setupGitIdentity bisa memanggil process.exit(0) (cabang "user batalkan di langkah git").
// Itu DIPERTAHANKAN apa adanya — pemasang memang berhenti di sana dengan kode-keluar 0 (graceful,
// berkas kit sudah mendarat). Jangan diubah jadi return tanpa mengubah pemanggilnya juga.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync, spawn } from 'node:child_process'
import { STARTER_PROMPT, isValidGitEmail, deriveGitName, findVsCodeExe } from './setup-interactive.mjs'
import { showYesNo, showInput, showNumberedChoice, showInfo, isInteractiveInput } from './setup-prompts.mjs'
import { writeMarkerSafe } from './setup-fs.mjs'
import { NAMA_FOLDER_KIT } from './project-root.mjs'
// Pra-cek "project sudah `git init`?" + tawarkan 3 pilihan kalau belum.
// "belum git init" HANYA kalau .git BUKAN direktori. (.git bisa berupa BERKAS gitlink di
// submodule/worktree - dideteksi via isDirectory, bukan existsSync biasa.)
//
// 🚨 SENGAJA TIDAK memanggil process.exit: fungsi ini MELAPORKAN keputusan ('batal' | null) dan
// pemanggil (setupGitIdentity) yang menghentikan proses. Menaruh exit di sini akan menyembunyikan
// titik-henti pemasang di dalam helper. Isi + tiap baris konsol dipindah APA ADANYA.
function praCekRepoGit({ projectRoot, kitDir, skippedSteps, skipMarker }) {
  const gitFolder = path.join(projectRoot, '.git')
  let hasGitDir = false
  try { hasGitDir = fs.statSync(gitFolder).isDirectory() } catch { hasGitDir = false }
  if (hasGitDir) return null

  console.log('')
  console.log('=== Pra-cek: cek repo Git ===')
  console.log(`Project '${path.basename(projectRoot)}' belum di-git init.`)
  console.log('Tanpa repo git lokal, identitas git (user.email) tidak bisa di-set per-project.')
  console.log('')
  // Opsi [1] = lewati git (paling aman, tidak mengubah berkas) = rekomendasi + default (indeks 0).
  const idx = showNumberedChoice({
    title: 'Repo Git belum ada',
    message: `Project '${path.basename(projectRoot)}' belum di-git init. Pilih:`,
    options: [
      { Label: 'Lewati langkah git, pakai identitas global (rekomendasi, paling aman: tidak mengubah berkas)', Recommended: true },
      { Label: 'Buat git init otomatis di folder project (kalau mau simpan setup di sini)' },
      { Label: 'Batalkan setup di langkah git (mau init git manual dulu)', SpecialKey: 'cancel' },
    ],
    defaultIndex: 0,
    kitDir,
  })
  const choice = (Number.isInteger(idx) ? idx : 0) + 1 // 0-based -> 1-based; -1/aneh -> 0 -> [1] aman
  if (choice === 2) {
    console.log(`Menjalankan git init di ${projectRoot} ...`)
    const r = spawnSync('git', ['-C', projectRoot, 'init'], { encoding: 'utf8' })
    if (!r.error && r.status === 0) {
      console.log('OK    Repo git dibuat.')
    } else {
      console.log('PERINGATAN: git init gagal. Pakai identitas --global sebagai cadangan.')
    }
  } else if (choice === 3) {
    console.log('Identitas git dilewati (kamu pilih batal di langkah git).')
    console.log('CATATAN: berkas kit SUDAH ter-pasang. Yang dilewati cuma setup identitas git.')
    console.log('Jalankan ulang pemasang kapan saja untuk menyelesaikan langkah ini.')
    skippedSteps.push('Setup identitas Git (kamu batalkan di pra-cek)')
    writeMarkerSafe(skipMarker)
    return 'batal'
  } else {
    console.log('Lewati git init. Identitas akan di-set di scope --global.')
  }
  return null
}

// Atur identitas git (email -> user.email/user.name).
// Alur: cek repo sudah git init? (kalau belum, tawarkan lewati/init/batal) -> kalau email belum
// di-set, minta lewat popup -> validasi -> simpan ke scope LOKAL (atau global kalau bukan repo) ->
// tulis penanda biar tak ditanya ulang. Semua dibungkus try/catch: git hilang/gagal != crash.
export function setupGitIdentity({ projectRoot, kitDir, skippedSteps }) {
  try {
    const setMarker = path.join(projectRoot, NAMA_FOLDER_KIT, '.git-identity-set')
    const skipMarker = path.join(projectRoot, NAMA_FOLDER_KIT, '.git-identity-skipped')
    if (fs.existsSync(setMarker)) {
      console.log(`INFO: Identitas Git sudah diatur sebelumnya (tidak ditanya lagi). Hapus ${NAMA_FOLDER_KIT}/.git-identity-set kalau mau atur ulang.`)
      return
    }
    if (fs.existsSync(skipMarker)) {
      console.log(`INFO: Pengaturan identitas Git sebelumnya dilewati (hapus ${NAMA_FOLDER_KIT}/.git-identity-skipped kalau mau coba lagi).`)
      skippedSteps.push('Setup identitas Git (dilewati via penanda)')
      return
    }

    // ---- Pra-cek: project sudah `git init`? ----
    // Diekstrak ke praCekRepoGit (bawah). Ia MENGEMBALIKAN keputusan, tidak menghentikan proses —
    // process.exit(0) sengaja TETAP DI SINI supaya titik-henti pemasang tetap kelihatan di alur utama.
    if (praCekRepoGit({ projectRoot, kitDir, skippedSteps, skipMarker }) === 'batal') {
      // return/exit setelah pesan -> tak lanjut ke VS Code / rangkuman penuh.
      process.exit(0)
    }

    // ---- Cek email saat ini (LOCAL dulu, lalu GLOBAL) - scope baca = scope tulis (cegah tanya ulang) ----
    let currentEmail = ''
    const localEmail = spawnSync('git', ['-C', projectRoot, 'config', '--local', '--get', 'user.email'], { encoding: 'utf8' })
    if (!localEmail.error && localEmail.status === 0 && (localEmail.stdout || '').trim()) {
      currentEmail = localEmail.stdout.trim()
    }
    if (!currentEmail) {
      const globalEmail = spawnSync('git', ['config', '--global', '--get', 'user.email'], { encoding: 'utf8' })
      if (!globalEmail.error && globalEmail.status === 0 && (globalEmail.stdout || '').trim()) {
        currentEmail = globalEmail.stdout.trim()
      }
    }
    if (currentEmail) return // sudah di-set -> selesai

    // ---- Minta email (popup input). Mode tanpa-layar -> Cancel -> lewati (bisa diatur nanti). ----
    console.log('')
    console.log('=== Setup identitas Git ===')
    console.log('Git user.email belum di-set. Diperlukan untuk identitas commit (jejak siapa mengubah apa).')
    const res = showInput({
      title: 'Setup Identitas Git',
      message: 'Email kamu (untuk identitas commit git):',
      defaultValue: '',
      kitDir,
    })
    const email = (res.status === 'OK' ? String(res.value || '') : '').trim()
    if (!email) {
      // Pemasang Node non-interaktif (popup GUI dibuang 06-22): showInput selalu balas Cancel, jadi
      // langkah email SELALU dilewati di sini - identitas git diatur lewat AI/chat atau `git config`
      // sesudahnya. JANGAN tulis penanda skip: kalau ditulis, pasang-ulang
      // oleh staff akan lompati langkah ini diam-diam.
      skippedSteps.push('Setup identitas Git (dilewati - atur lewat AI/chat atau git config nanti)')
      return
    }
    if (!isValidGitEmail(email)) {
      console.log('PERINGATAN: Format email tidak sah - identitas git tidak di-set.')
      skippedSteps.push('Setup identitas Git (format email tidak sah)')
      return
    }

    // ---- Simpan ke scope LOKAL (kalau di dalam repo) atau GLOBAL (kalau bukan repo) ----
    const derivedName = deriveGitName(email)
    let isRepo = false
    const inside = spawnSync('git', ['-C', projectRoot, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' })
    if (!inside.error && inside.status === 0 && (inside.stdout || '').trim() === 'true') isRepo = true
    if (isRepo) {
      spawnSync('git', ['-C', projectRoot, 'config', '--local', 'user.email', email])
      spawnSync('git', ['-C', projectRoot, 'config', '--local', 'user.name', derivedName])
      console.log(`Identitas git di-set (scope lokal): ${email} (nama=${derivedName})`)
    } else {
      console.log(`INFO: ${projectRoot} bukan repo git. Set identitas --global sebagai cadangan.`)
      spawnSync('git', ['config', '--global', 'user.email', email])
      spawnSync('git', ['config', '--global', 'user.name', derivedName])
      console.log(`Identitas git di-set (scope global, tanpa repo lokal): ${email} (nama=${derivedName})`)
    }
    // Penanda sukses (idempoten lintas-proses: pasang-ulang tak menanya lagi).
    writeMarkerSafe(setMarker, `${email}|${new Date().toISOString()}`)
  } catch (e) {
    console.log(`PERINGATAN: Setup identitas git dilewati: ${e.message}`)
  }
}

// Cek kesehatan SESUDAH pasang — cermin jalur `update` yang sejak awal menjalankan doctor otomatis
// (engine/update-steps.mjs Langkah 6). Pemasangan PERTAMA justru jalur paling rawan salah-lokasi (kit
// mendarat di folder yang bukan akar project -> aturan tak pernah termuat, tanpa satu pun pesan error),
// tapi dulu ia satu-satunya jalur yang TIDAK memverifikasi dirinya sendiri.
//
// PAGAR WAJIB — hasil doctor HANYA DICETAK, TIDAK PERNAH mengubah kode keluar pemasangan.
// Alasannya konkret: doctor mengembalikan bukan-0 untuk WARN yang wajar di project baru (mis. .github/
// belum ada). Kalau kode itu merembes, pemasangan yang SEHAT akan terlihat GAGAL di mata client maupun
// CI. Karena itu fungsi ini mengembalikan laporan, bukan kode keluar, dan seluruh badannya fail-safe.
// Dikunci tests/setup-stage2-doctor.test.mjs.
export function jalankanCekKesehatan({ projectRoot, kitDir, dryRun = false } = {}) {
  if (dryRun) {
    console.log('')
    console.log('[SIMULASI] Akan menjalankan cek kesehatan: npx lintasai doctor')
    return { dijalankan: false, alasan: 'simulasi' }
  }
  const kitMjs = path.join(kitDir, 'kit.mjs')
  if (!fs.existsSync(kitMjs)) return { dijalankan: false, alasan: 'kit-mjs-tak-ada' }
  console.log('')
  console.log('=== Cek kesehatan pemasangan (doctor) ===')
  try {
    // --skip-cek-versi: kit BARU SAJA dipasang dari sumber ini, jadi menanya npm cuma menambah tunggu
    // jaringan tanpa informasi baru.
    const r = spawnSync(
      process.execPath,
      [kitMjs, 'doctor', '--skip-cek-versi', '--project-root', projectRoot],
      { stdio: 'inherit', timeout: 300000 },
    )
    return { dijalankan: true, kode: r.error ? 1 : r.status }
  } catch (e) {
    console.log(`PERINGATAN: Cek kesehatan dilewati: ${e.message} (pemasangan TETAP berhasil).`)
    return { dijalankan: false, alasan: 'gagal-jalan' }
  }
}

// Deteksi VS Code + tawarkan buka (popup Ya/Tidak) + salin kalimat pembuka ke papan-tempel.
// Mode tanpa-layar -> popup tak tampil -> 'No' -> lewati.
export function launchVsCode({ projectRoot, kitDir, skippedSteps }) {
  const vsCodeExe = findVsCodeExe(process.env)
  if (!vsCodeExe) {
    console.log('VS Code tidak terdeteksi - pasang dari code.visualstudio.com kalau perlu.')
    return
  }
  const ans = showYesNo({
    title: 'Pemasangan selesai!',
    message: 'Buka VS Code sekarang? (disarankan: Ya - langsung buka lalu tempel kalimat pembuka). Catatan: isi papan-tempel (clipboard) akan diganti kalimat pembuka - pastikan tidak ada password/rahasia yang sedang kamu salin. Lanjut?',
    defaultYes: false,
    kitDir,
  })
  if (ans !== 'Yes') {
    // JUJUR (§2.2): di mode otomatis shim showYesNo membalas 'No' TANPA pernah menampilkan dialog —
    // menulis "kamu pilih Tidak" di situ adalah klaim yang tidak terjadi. Bedakan dua sebabnya.
    skippedSteps.push(
      isInteractiveInput()
        ? 'Buka VS Code (kamu pilih Tidak / batal popup)'
        : 'Buka VS Code (mode otomatis - tak ada dialog; buka sendiri kalau perlu)',
    )
    return
  }
  // Salin kalimat pembuka ke papan-tempel (lewat clip.exe). Catat hasilnya supaya pesan tip jujur.
  let clipboardOk = true
  try {
    const c = spawnSync('clip', [], { input: STARTER_PROMPT, encoding: 'utf8' })
    if (c.error || c.status !== 0) clipboardOk = false
  } catch (e) {
    clipboardOk = false
  }
  // Buka VS Code TANPA menunggu (lepas + unref). Path project sebagai argumen
  // posisional (aman untuk path ber-spasi/Unicode; spawn tak menyatukan argumen dengan spasi).
  try {
    const child = spawn(vsCodeExe, [projectRoot], { detached: true, stdio: 'ignore' })
    child.unref()
  } catch (e) {
    console.log(`PERINGATAN: Gagal buka VS Code: ${e.message}`)
    return
  }
  if (clipboardOk) {
    showInfo({
      title: 'Tip',
      message: 'Kalimat pembuka sudah ada di papan-tempel. Buka chat Claude Code, tekan Ctrl+V, lalu Enter.',
      kitDir,
    })
  } else {
    // Papan-tempel gagal (mis. clipboard RDP terkunci) - tampilkan kalimatnya biar bisa disalin manual.
    showInfo({
      title: 'Tip',
      message: `Papan-tempel gagal diisi - salin manual kalimat pembuka berikut ke chat Claude Code lalu tekan Enter:\n\n${STARTER_PROMPT}`,
      kitDir,
    })
  }
}
