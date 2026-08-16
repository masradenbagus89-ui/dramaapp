#!/usr/bin/env node
// update-kit.mjs - Perbarui kit lintasAI di sebuah project ke versi terbaru (versi Node), via ambil-ulang bersih.
//
// Alur atomic (tanpa setengah-jadi), sumber = paket npm yang SUDAH diunduh+diverifikasi npx:
//   A. Siapkan (stage) kit baru di folder sementara (kit lama belum disentuh)
//   B. Periksa kelengkapan kit baru sebelum menukar
//   C. Tukar (2 rename = milidetik) + simpan cadangan .lintasai.backup-<cap-waktu>
//   4. Jalankan ulang pemasang (--force) supaya docs/ kamu TIDAK ditimpa
//   5. Tampilkan beda CHANGELOG lama vs baru + langkah lanjut + peringatan keamanan
//
// ===========================================================================================
// PETA ISI (Fase E 2026-07-25: berkas ini kini FASAD - isinya pindah ke engine/, permukaan tetap):
//   engine/update-changelog.mjs  logika murni CHANGELOG/versi/tier + laporan pasca-update
//   engine/update-decide.mjs     gerbang keputusan boleh-tukar-atau-berhenti (murni, nol I/O)
//   engine/update-steps.mjs      tahapan alur (resolusi akar -> tukar -> pasang ulang -> doctor)
//   engine/backup-cleanup.mjs    rotasi cadangan (*.bak / .lintasai.backup-*), opt-in
// Berkas ini menahan: penguraian argumen, kunci "1 update per project", dan urutan pemanggilan tahap.
//
// JALUR AKTIF untuk `npx lintasai update` (v2.0.0, kit 100% Node):
//   Dispatcher bin/lintasai.js memetakan 'update' -> update-kit.mjs di COMMANDS_NODE, dan
//   package.json files[] mendaftarkannya eksplisit -> ikut paket npm + jalan di mesin staff.
//
// SIFAT NON-INTERAKTIF (keputusan owner 06-22): versi Node TIDAK menampilkan popup jendela.
//   GERBANG KEAMANAN YANG BENAR-BENAR ADA (semua di engine/update-decide.mjs, murni + teruji):
//     - Sumber == tujuan (update dijalankan DARI kit terpasang)  -> BERHENTI.
//     - Versi paket yang berjalan tak terbaca                     -> BERHENTI (jangan menebak).
//     - Jebakan cache npx: updater LEBIH LAMA dari rilis terbaru  -> BERHENTI (kalau tidak, kit klien
//       justru dipasangi versi LAMA sambil melapor "sukses" - kelas bug paling senyap).
//     - TUF anti-rollback: kit terpasang lebih BARU dari paket    -> BERHENTI, kecuali --allow-downgrade.
//   FAIL-OPEN yang DISENGAJA: kalau registry npm tak terjangkau (offline/diblokir), update TETAP
//   dilanjutkan - pengetahuan yang tak ada bukan alasan menahan klien.
//
// ⚠️ KOREKSI 2026-07-26 (§2.2 - jujur sesuai kenyataan): blok ini DULU menjanjikan tiga gerbang yang
//   sebenarnya TIDAK ADA di kode - "repo di luar daftar-putih -> BATAL kecuali --allow-untrusted-repo",
//   "--no-backup -> BATAL kecuali --yes-delete-no-backup", dan "gagal hubungi server -> BATAL aman"
//   (yang terakhir bahkan KEBALIKAN dari perilaku nyata: fail-open). Ketiganya sisa era update lewat
//   `git clone` + tag ber-GPG; sejak jalur update 100% npm-swap (sumber = paket npm yang sudah
//   diverifikasi npx), mekanisme itu tak relevan lagi. Bendera-bendera penyertanya SUDAH DICABUT di
//   parseArgs (lihat catatan di sana) supaya tak ada lagi jalan buntu yang tampak seperti pengaman.
//
// MEKANISME salin: stageFromDirectory + validateKitContents + swapInKit (engine/kit-staging.mjs) +
//   shouldCopyKitEntry (setup-pola-b.mjs) - identik dengan yang dipakai `npm create lintasai@latest`.
//   Kit 100% Node. Langkah pasang-ulang (4) memanggil pemasang Node (setup-pola-b.mjs);
//   Langkah cek-kesehatan (6) memanggil 'node kit.mjs doctor'.
//
// BATAS JUJUR (§4.6): jalur update npm (siapkan->periksa->tukar + pasang-ulang + doctor) diuji
//   end-to-end di tests/update-e2e.test.mjs (hermetik, tanpa jaringan). Fungsi-logika murni
//   (CHANGELOG/tier/keputusan-update-npm/bersih-cadangan) diuji tersendiri. Real-run = uji lapangan owner.
// ===========================================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { acquireUpdateLock, pesanKunciDitolak } from './engine/update-lock.mjs'
import { shouldCopyKitEntry } from './setup-pola-b.mjs'
import {
  resolveUpdateRoots, printUpdateHeader, detectInstalledKitVersion, performNpmSwap,
  rerunInstaller, reportUpdateAndRunDoctor, printTierSummary, runBackupCleanupStep,
} from './engine/update-steps.mjs'
import { bersihkanBerkasUsang } from './engine/update-cleanup.mjs'
import { NAMA_FOLDER_KIT } from './engine/project-root.mjs'

// FASAD: nama-nama di bawah dulu didefinisikan di berkas ini. Isinya pindah ke engine/ (Fase E),
// tapi TETAP di-export dari sini supaya nol titik impor berubah - ~5 berkas tes + pemanggil internal
// mengimpornya dari '../kit/update-kit.mjs'.
export {
  parseDotNetVersion, compareDotNetVersion, getLatestChangelogEntry, getChangelogRangeBody,
  testChangelogLabel, resolveUpdateTier, formatUpdateSummary, buildPostUpdateReportLines,
} from './engine/update-changelog.mjs'
export { decideNpmUpdate } from './engine/update-decide.mjs'
export { invokeBackupCleanup } from './engine/backup-cleanup.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ============================================================================================
// PENGURAIAN ARGUMEN
// ============================================================================================
// Tiap bendera di bawah BENAR-BENAR dibaca jalur update (diverifikasi 2026-07-26). Kalau menambah
// bendera baru, pastikan ada yang membacanya — bendera yang cuma diparse = jalan buntu yang
// menyesatkan staff.
//
// DICABUT 2026-07-26 (7 bendera + konstanta DEFAULT_REPO_URL): --repo-url, --branch,
//   --allow-untrusted-repo, --allow-unsigned-tag, --yes-delete-no-backup, --force, --no-gui.
//   Semuanya sisa era update lewat `git clone` + tag ber-GPG; sejak jalur update 100% npm-swap
//   nilainya TIDAK PERNAH dibaca satu baris kode pun, sementara dokumentasi lama menjanjikannya
//   sebagai pengaman (rasa-aman-palsu, §2.2). Efek ke pengguna NOL: dulu diparse-lalu-diabaikan,
//   kini tak dikenali-lalu-diabaikan — dua-duanya sama-sama tak berpengaruh.
export function parseArgs(argv) {
  const a = {
    noBackup: false,
    dryRun: false,
    checkOnly: false,
    cleanupBackups: false,
    projectRoot: null,
    // Izinkan TURUN versi (TUF anti-rollback default menolaknya). Sengaja tanpa alias singkat: ini
    // pintu darurat sadar, bukan bendera harian.
    allowDowngrade: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const t = String(argv[i]).toLowerCase()
    if (t === '--no-backup' || t === '--nobackup') a.noBackup = true
    else if (t === '--dry-run' || t === '--dryrun' || t === '--simulasi') a.dryRun = true
    else if (t === '--check-only' || t === '--checkonly') a.checkOnly = true
    else if (t === '--cleanup-backups' || t === '--cleanupbackups') a.cleanupBackups = true
    else if (t === '--allow-downgrade' || t === '--allowdowngrade') a.allowDowngrade = true
    else if (t === '--project-root' || t === '--projectroot') a.projectRoot = argv[++i] ?? null
  }
  return a
}

// ============================================================================================
// ORKESTRATOR UTAMA
// ============================================================================================
// Pembungkus: pegang kunci "cuma 1 update per project" selama kerja yang MENGUBAH berkas.
// Kenapa dibungkus (bukan disisipkan ke dalam): runUpdateInner punya belasan titik `return`; try/finally
// di sini menjamin kunci SELALU dilepas tanpa harus menaruh release() di tiap cabang (satu cabang lupa =
// project terkunci sampai kunci kedaluwarsa).
// Mode cuma-baca (--check-only) & SIMULASI tak mengubah apa pun -> tak perlu kunci, dan tak boleh
// terhalang update lain yang sedang jalan.
export function runUpdate(argv) {
  const args = parseArgs(argv)
  if (args.checkOnly || args.dryRun) return runUpdateInner(argv)

  let projectRoot = null
  try {
    projectRoot = args.projectRoot != null && String(args.projectRoot).trim() !== ''
      ? fs.realpathSync(path.resolve(String(args.projectRoot)))
      : path.dirname(__dirname)
  } catch {
    return runUpdateInner(argv) // biar runUpdateInner yang melapor akar project tak ketemu (pesannya lebih baik)
  }

  const lock = acquireUpdateLock(projectRoot)
  if (!lock.ok) {
    console.log('')
    console.log(pesanKunciDitolak(lock))
    return 1
  }
  if (lock.takenOver) {
    console.log('')
    console.log(`INFO  Ada penanda update lama (~${Math.round(lock.ageMinutes)} menit) - sepertinya update sebelumnya`)
    console.log('      berhenti mendadak. Penanda itu diambil alih, update ini lanjut.')
  }
  try {
    return runUpdateInner(argv)
  } finally {
    const r = lock.release()
    if (!r.ok) {
      console.log('')
      console.log(`WARN  Gagal membuang penanda update (${r.error}).`)
      console.log(`      Kalau update berikutnya bilang "ada update lain jalan", hapus folder: ${lock.lockDir}`)
    }
  }
}

// Urutan tahap = urutan keluaran di layar. Tiap tahap ada di engine/update-steps.mjs; yang bisa
// menggagalkan update mengembalikan kode-keluar (number) dan kita meneruskannya apa adanya.
// __dirname dioper sebagai selfDir: tahap-tahap itu tinggal di engine/, jadi __dirname MEREKA bukan
// akar kit - lokasi paket-yang-sedang-berjalan hanya benar kalau berasal dari berkas INI.
function runUpdateInner(argv) {
  const args = parseArgs(argv)

  const roots = resolveUpdateRoots(args, __dirname)
  if (typeof roots === 'number') return roots
  const { projectRoot, kitDir, timestamp, backupDir, migrasiTerjadi } = roots

  printUpdateHeader({ kitDir, projectRoot, selfDir: __dirname, args, backupDir })

  const { currentVersion, canCheckRemote } = detectInstalledKitVersion(kitDir)

  // Bersihkan berkas yang sudah DICABUT dari kit tapi masih tertinggal di project klien.
  // WAJIB di sini - sesudah performNpmSwap, .install-manifest.json (sidik-jari pembanding) sudah
  // ikut pindah ke folder cadangan bersama kit lama. Fail-safe + hormat --dry-run/--check-only.
  bersihkanBerkasUsang({ projectRoot, kitDir, args })

  const swapCode = performNpmSwap({
    selfDir: __dirname, kitDir, currentVersion, args, timestamp, backupDir, shouldCopy: shouldCopyKitEntry,
    // Migrasi baru me-rename folder -> isi kit masih dari sebelum rename (masih menunjuk nama lama).
    // Paksa segarkan isinya walau nomor versi sama, kalau tidak kit tinggal separuh-migrasi.
    paksaRefresh: migrasiTerjadi,
  })
  if (typeof swapCode === 'number') return swapCode

  // ---- Mode cek-saja (cuma-baca): lapor status lalu berhenti TANPA mengubah apa pun ----
  if (args.checkOnly) {
    if (!canCheckRemote) {
      console.log('[i] Belum bisa banding versi (belum ada catatan-pasang / pasang-baru).')
      console.log("    Cek versi terbaru di npm: jalankan 'npm view lintasai version'.")
    }
    console.log('Mode cek-saja: TIDAK ada perubahan dilakukan.')
    console.log("Kalau mau update: minta AI 'tolong update kit', atau jalankan 'npx lintasai update'.")
    return 0
  }

  // Ingatkan editan DI DALAM .lintasai/ akan diganti (versi lama aman di folder cadangan).
  if (!args.dryRun && !args.noBackup) {
    console.log('')
    console.log(`Catatan: kalau kamu pernah MENGEDIT berkas DI DALAM ${NAMA_FOLDER_KIT}/ (mis. aturan lokal),`)
    console.log('         editan itu akan diganti versi baru; versi lamamu tetap aman di folder cadangan.')
  }

  rerunInstaller({ kitDir, projectRoot, dryRun: args.dryRun })

  if (!args.dryRun) reportUpdateAndRunDoctor({ kitDir, currentVersion, args, backupDir, timestamp })

  console.log('')

  printTierSummary(kitDir)
  runBackupCleanupStep(args, projectRoot)

  console.log('OK update-kit.mjs selesai.')
  return 0
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  process.exitCode = runUpdate(process.argv.slice(2))
}
