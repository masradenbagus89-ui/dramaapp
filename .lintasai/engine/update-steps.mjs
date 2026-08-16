// engine/update-steps.mjs — TAHAPAN alur `lintasai update`, satu fungsi per langkah.
//
// Dipecah dari update-kit.mjs (Fase E 2026-07-25): badan runUpdateInner (314 baris) diiris jadi
// tahapan berurutan. Isi dipindah APA ADANYA — urutan operasi + tiap baris konsol byte-identik.
//
// 🚨 JEBAKAN YANG DITUTUP DI SINI: berkas ini tinggal di engine/, jadi `__dirname`-nya = .../engine —
// BUKAN akar kit seperti di update-kit.mjs. Tiap tahap yang butuh lokasi paket-yang-sedang-berjalan
// menerimanya sebagai parameter `selfDir` dari pemanggil. Kalau suatu saat ada yang "menyederhanakan"
// dengan memakai __dirname lokal, akar project meleset satu tingkat dan update menyasar folder salah.
//
// shouldCopyKitEntry juga sengaja DISUNTIKKAN (parameter `shouldCopy`), bukan di-impor dari
// ../setup-pola-b.mjs — engine/ tak boleh bergantung balik ke alat di akar kit.
//
// Konvensi return: tahap yang bisa menggagalkan update mengembalikan NUMBER (kode-keluar) saat harus
// berhenti, atau null/objek saat aman lanjut — cermin pola helper di uninstall.mjs.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { stripBom, backupStamp } from './fs-text.mjs'
import { getKitVersionFromChangelog } from './version-detect.mjs'
import { getLatestNpmVersion } from './npm-query.mjs'
import { stageFromDirectory, validateKitContents, discardStaging, swapInKit, findOrphanBackups, migrasiNamaFolderKit, barisLaporanMigrasi } from './kit-staging.mjs'
import { decideNpmUpdate } from './update-decide.mjs'
import { buildPostUpdateReportLines, getLatestChangelogEntry, resolveUpdateTier, formatUpdateSummary } from './update-changelog.mjs'
import { invokeBackupCleanup } from './backup-cleanup.mjs'
import { NAMA_FOLDER_KIT, NAMA_FOLDER_KIT_DIKENAL, adalahFolderKit, cariFolderKit } from './project-root.mjs'

// Resolusi akar project + folder kit + cap-waktu cadangan, plus dua hard-stop (cadangan yatim &
// nama folder salah). Kembalikan number (kode-keluar) saat gagal, atau { projectRoot, kitDir,
// timestamp, backupDir } saat aman lanjut. selfDir = akar paket yang sedang berjalan.
export function resolveUpdateRoots(args, selfDir) {
  // ---- Resolusi akar project ----
  const projectRootExplicit = args.projectRoot != null && String(args.projectRoot).trim() !== ''
  let projectRoot
  if (!projectRootExplicit) {
    projectRoot = path.dirname(selfDir) // induk dari .lintasai/ = akar project
  } else {
    try { projectRoot = fs.realpathSync(path.resolve(String(args.projectRoot))) }
    catch { console.log(`ERROR: --project-root tidak ditemukan: ${args.projectRoot}`); return 1 }
  }
  console.log(`Root proyek   : ${projectRoot}`)

  // ---- MIGRASI nama folder kit (paling awal, sebelum apa pun menyentuh folder kit) ----
  // WAJIB di sini: hard-stop posisi di bawah + penamaan folder cadangan sama-sama bersandar pada
  // nama folder. Kalau migrasi dijalankan sesudahnya, updater bekerja memakai nama LAMA lalu
  // meninggalkan client separuh-jadi. Idempoten: client yang sudah bernama baru tak tersentuh.
  const migrasi = migrasiNamaFolderKit({ projectRoot, selfDir, dryRun: args.dryRun })
  if (migrasi.pesan) {
    // Keadaan yang TIDAK boleh diteruskan (dua folder sekaligus / skrip di dalam folder / rename
    // gagal). Semuanya sudah dijamin TIDAK menyentuh berkas apa pun.
    console.log('')
    for (const b of migrasi.pesan) console.log(b)
    return 1
  }
  for (const b of barisLaporanMigrasi(migrasi)) console.log(b)

  // ---- Resolusi path (kalau --project-root eksplisit, cari folder kit yang BENAR-BENAR ada) ----
  // Nama baru menang lebih dulu; nama LAMA tetap dikenali supaya client yang belum migrasi bisa
  // menjalankan update (justru update-lah yang me-rename-nya). Tak ada satu pun -> pakai nama baru
  // (jalur "pasang kit baru di folder ini" + jalur cadangan-yatim di bawah tetap bekerja seperti dulu).
  //
  // TIDAK ada cek `temuanKit.ambigu` di sini — SENGAJA, bukan kelalaian: migrasiNamaFolderKit di atas
  // memeriksa keberadaan KEDUA folder itu dengan syarat yang SAMA dan sudah berhenti (reason
  // 'ambigu-dua-folder') sebelum baris ini tercapai. Menyalinnya ulang di sini = kode mati + dua
  // sumber pesan yang bisa saling melenceng.
  const temuanKit = projectRootExplicit ? cariFolderKit(projectRoot) : null
  const kitDir = projectRootExplicit
    ? (temuanKit ? temuanKit.path : path.join(projectRoot, NAMA_FOLDER_KIT))
    : selfDir
  const kitFolderName = path.basename(kitDir)
  const timestamp = backupStamp(new Date())
  const backupDir = `${kitDir}.backup-${timestamp}`

  // ---- Penyelamat: kit HILANG tapi ada folder cadangan yatim ----
  // Kondisi ini nyata di lapangan pada updater versi LAMA: urutannya rename-kit-jadi-cadangan DULU baru
  // ambil versi baru, tanpa satu pun penangan sinyal -> Ctrl-C/listrik padam = .lintasai LENYAP dan
  // cuma menyisakan .lintasai.backup-<cap>. Menjalankan update lagi malah gagal dengan pesan
  // MENYESATKAN ("berkas terkunci / antivirus") karena rename sumbernya ENOENT - dan tak ada satu pun
  // yang memberi tahu bahwa kit lengkapnya duduk diam di sebelah. Klien non-programmer buntu total.
  // Kita TIDAK memulihkan otomatis (isi cadangan = keputusan pemilik project), tapi WAJIB menunjukkan
  // jalan keluarnya dengan jelas. Update baru (staging-first) tak bisa lagi menciptakan kondisi ini.
  if (!fs.existsSync(kitDir)) {
    const yatim = findOrphanBackups(projectRoot)
    if (yatim.length > 0) {
      console.log('')
      console.log(`BERHENTI: Folder kit '${kitDir}' TIDAK ADA, tapi ada cadangan yang tertinggal:`)
      for (const y of yatim.slice(0, 3)) console.log(`  - ${path.basename(y)}`)
      console.log('')
      console.log('Sepertinya update sebelumnya berhenti di tengah jalan (mati listrik / Ctrl-C /')
      console.log('komputer restart). Kit kamu TIDAK hilang - dia ada di folder cadangan di atas.')
      console.log('')
      console.log('Cara mengembalikannya (pilih cadangan paling baru):')
      console.log(`  ganti nama folder '${path.basename(yatim[0])}' menjadi '${NAMA_FOLDER_KIT}'`)
      console.log('lalu jalankan update lagi. Atau minta AI: "kit-ku hilang, tolong pulihkan dari cadangan".')
      console.log('')
      console.log('TIDAK ADA satu pun berkas yang disentuh. Aman.')
      return 1
    }
  }

  // ---- Validasi posisi: folder kit harus bernama nama-kit yang DIKENAL (cermin uninstall.mjs) ----
  // Kalau BUKAN: clone mendarat di folder kit BARU sementara backup/GPG/setup pakai kitDir (folder
  // LAMA) -> jadi 2 folder + langkah verifikasi/setup menyasar folder yang sudah jadi backup
  // (GPG fail-open, setup no-op). Fail-closed: BERHENTI di sini, jangan biarkan update separuh-jadi.
  //
  // DIKENAL = nama baru ATAU nama lama. Nama lama WAJIB lolos: kalau ditolak di sini, migrasi
  // rename tak akan pernah bisa jalan karena hard-stop menyala sebelum migrasi sempat bekerja.
  if (!adalahFolderKit(kitFolderName)) {
    console.log('')
    console.log(`BERHENTI: Folder kit ini bernama '${kitFolderName}', bukan ${NAMA_FOLDER_KIT_DIKENAL.map((n) => `'${n}'`).join(' atau ')}.`)
    console.log(`          Update dirancang untuk Pola B (${NAMA_FOLDER_KIT}/ di akar proyek).`)
    console.log('Kemungkinan:')
    console.log('  (A) Kamu jalankan dari folder SALAH (project ini belum pernah pasang lintasAI).')
    console.log(`  (B) Folder kit di-rename ke nama lain (rename balik jadi '${NAMA_FOLDER_KIT}' lalu ulangi).`)
    console.log('')
    console.log('TIDAK ADA satu pun berkas yang disentuh. Aman.')
    return 1
  }

  // migrasiTerjadi diteruskan ke performNpmSwap sebagai `paksaRefresh`: folder sudah di-rename, jadi
  // isi kit di disk (dari SEBELUM rename) masih mencari folder nama lama dan WAJIB disegarkan walau
  // nomor versinya sama. Tanpa ini kit tinggal separuh-migrasi: nama baru, kode lama, rak tak ketemu.
  return { projectRoot, kitDir, timestamp, backupDir, migrasiTerjadi: !!migrasi.migrated }
}

// Cetak kepala laporan update (identitas folder + sumber + tujuan cadangan).
export function printUpdateHeader({ kitDir, projectRoot, selfDir, args, backupDir }) {
  console.log('')
  console.log('=== Update Kit lintasAI ===')
  console.log(`Kit folder    : ${kitDir}`)
  console.log(`Project root  : ${projectRoot}`)
  // JUJUR soal sumber: jalur non-repo menyalin paket lintasAI YANG SEDANG BERJALAN (selfDir). Lewat
  // `npx lintasai@latest update` itu = paket npm resmi yang baru diunduh & diverifikasi npm. Tapi kalau
  // dijalankan langsung dari repo-dev (`node update-kit.mjs ...`), yang tersalin = repo-dev itu - termasuk
  // kerjaan yang belum di-commit. Menyebutnya "paket npm resmi" tanpa syarat = klaim yang bisa keliru.
  console.log(`Sumber        : paket lintasAI yang sedang berjalan (${selfDir})`)
  console.log(`Backup        : ${args.noBackup ? 'DIMATIKAN (--no-backup)' : backupDir}`)
  if (args.dryRun) console.log('Mode          : SIMULASI (tidak ada perubahan berkas)')
  console.log('')
}

// Pra-cek: deteksi versi kit sekarang dari .install-manifest.json.
// Return { currentVersion, canCheckRemote } — currentVersion 'unknown' kalau tak terbaca.
export function detectInstalledKitVersion(kitDir) {
  const manifestPath = path.join(kitDir, '.install-manifest.json')
  let currentVersion = null
  let manifestPresent = false
  if (fs.existsSync(manifestPath)) {
    manifestPresent = true
    try {
      const raw = stripBom(fs.readFileSync(manifestPath, 'utf8'))
      const obj = JSON.parse(raw)
      if (obj && obj.metadata && obj.metadata.kit_version) {
        currentVersion = String(obj.metadata.kit_version).replace(/^v/, '').trim()
      }
    } catch (e) {
      console.log(`WARN  Gagal urai .install-manifest.json: ${e.message}`)
    }
  }
  const canCheckRemote = Boolean(currentVersion)
  if (currentVersion) {
    console.log(`OK    Versi sekarang (manifest): ${currentVersion}`)
  } else if (manifestPresent) {
    console.log('WARN  manifest ada tapi metadata.kit_version kosong - lewati cek versi.')
    currentVersion = 'unknown'
  } else {
    console.log('INFO  .install-manifest.json tidak ada - update akan MEMASANG KIT BARU di folder ini.')
    console.log(`      PERHATIAN: kalau kit-mu sebenarnya terpasang di SUBFOLDER (mis. apps/web/${NAMA_FOLDER_KIT}),`)
    console.log('      hentikan (Ctrl+C) lalu jalankan update DARI folder itu - kalau diteruskan, project ini')
    console.log('      mendapat kit KEDUA di sini.')
    currentVersion = 'unknown'
  }
  return { currentVersion, canCheckRemote }
}

// ---- JALUR npm (DEFAULT): bahan = paket lintasai yang SUDAH diunduh & diverifikasi npx ----
// Kenapa bukan mengunduh sendiri: saat klien mengetik `npx lintasai@latest update`, npm SUDAH menarik
// + memverifikasi integritas (sha512) paket ini untuk bisa menjalankan perintah ini. Paketnya sudah
// ada di disk (selfDir). Mengunduh ulang = menulis kode jaringan sendiri (proxy/mirror korporat,
// .npmrc, auth, verifikasi) yang semuanya sudah beres di npm = permukaan bug baru tanpa manfaat.
// Mekanisme salinnya pun bukan barang baru: identik dengan yang dipakai `npm create lintasai@latest`
// tiap hari (setup-pola-b.mjs mode npx: cpSync + shouldCopyKitEntry).
// Return number (kode-keluar) saat harus berhenti, atau null saat kit baru sudah terpasang.
export function performNpmSwap({ selfDir, kitDir, currentVersion, args, timestamp, backupDir, shouldCopy, paksaRefresh = false }) {
  const selfKitDir = selfDir
  const selfVersion = getKitVersionFromChangelog(path.join(selfKitDir, 'CHANGELOG.md'))
  console.log('')
  console.log('Cek versi terbaru di npm...')
  const latestNpm = getLatestNpmVersion()
  console.log(latestNpm ? `OK    Versi terbaru di npm: v${latestNpm}` : 'INFO  Belum bisa menghubungi npm (offline?) - cek versi terbaru dilewati.')

  const rencana = decideNpmUpdate({
    selfKitDir,
    kitDir,
    selfVersion,
    installedVersion: currentVersion,
    latestNpmVersion: latestNpm,
    allowDowngrade: args.allowDowngrade,
    paksaRefresh,
  })

  if (args.checkOnly) {
    console.log('')
    console.log(rencana.message)
    console.log('Mode cek-saja: TIDAK ada perubahan dilakukan.')
    return 0
  }
  if (rencana.action === 'uptodate') {
    console.log('')
    console.log(`[OK] ${rencana.message}`)
    return 0
  }
  if (rencana.action === 'stop') {
    console.log('')
    console.log('BERHENTI (kit kamu TIDAK diubah):')
    for (const baris of String(rencana.message).split('\n')) console.log(`  ${baris}`)
    return 1 // update TIDAK terjadi -> kode-keluar WAJIB bukan 0 (jangan bohongi skrip/CI/AI)
  }

  console.log('')
  console.log(`[INFO] ${rencana.message}`)

  if (args.dryRun) {
    console.log('')
    console.log(`[SIMULASI] Akan menyiapkan kit v${rencana.toVersion} dari paket npm, memeriksanya, lalu menukar.`)
    console.log(`[SIMULASI] Cadangan versi lama: ${backupDir}`)
    return 0
  }

  // (1) SIAPKAN di sebelah - kit klien belum tersentuh sama sekali.
  const stagingDir = `${kitDir}.new-${timestamp}`
  console.log('')
  console.log('Langkah A: Siapkan kit baru di folder sementara (kit lama belum disentuh)...')
  discardStaging(stagingDir) // sisa percobaan sebelumnya yang mati di tengah
  const siap = stageFromDirectory(selfKitDir, stagingDir, (src) => shouldCopy(src, selfKitDir))
  if (!siap.ok) {
    console.log(`ERROR: Gagal menyiapkan kit baru: ${siap.error}`)
    console.log('       Kemungkinan: antivirus mengunci berkas, path kepanjangan (>260), atau disk penuh.')
    console.log('       Kit kamu TIDAK diubah - aman. Perbaiki penyebab di atas lalu ulangi.')
    discardStaging(stagingDir)
    return 1
  }

  // (2) PERIKSA sebelum menukar - jangan pernah tinggalkan kit lama demi isi yang cacat.
  console.log('Langkah B: Periksa kelengkapan kit baru sebelum menukar...')
  const periksa = validateKitContents(stagingDir)
  if (!periksa.ok) {
    console.log(`ERROR: Kit baru tidak lengkap - yang hilang: ${periksa.missing.join(', ')}`)
    console.log('       Update DIBATALKAN. Kit kamu TIDAK diubah - aman.')
    discardStaging(stagingDir)
    return 1
  }
  console.log('OK    Kit baru lengkap.')

  // (3) TUKAR (2 rename berurutan = milidetik). Gagal -> kit lama dikembalikan otomatis.
  console.log('Langkah C: Tukar kit lama dengan kit baru...')
  const tukar = swapInKit({ kitDir, stagingDir, backupDir, keepBackup: !args.noBackup })
  if (!tukar.ok) {
    console.log(`ERROR: ${tukar.error}`)
    discardStaging(stagingDir)
    return 1
  }
  console.log(`OK    Kit baru terpasang.${tukar.backupPath ? ` Cadangan versi lama: ${tukar.backupPath}` : ''}`)
  return null
}

// ---- Langkah 4: Jalankan ulang pemasang (-Force, anti-timpa docs/) ----
export function rerunInstaller({ kitDir, projectRoot, dryRun }) {
  console.log('')
  console.log('Langkah 4: Jalankan ulang pemasang (anti-timpa untuk docs/ yang sudah ada)...')
  if (dryRun) {
    console.log(`[SIMULASI] jalankan pemasang ulang: setup-pola-b (--force --project-root '${projectRoot}' --project-root-mode=folder-sekarang)`)
    return
  }
  const setupMjs = path.join(kitDir, 'setup-pola-b.mjs')
  if (fs.existsSync(setupMjs)) {
    // v2.0.0: pemasang Node (kit 100% Node).
    // --project-root-mode=folder-sekarang: update TIDAK pernah memindah lokasi install - re-setup
    // di folder kit yang sedang di-update. Tanpa ini, install-subfolder sah (monorepo) kena gerbang
    // akar exit 2 di tengah update -> AGENTS.md/CLAUDE.md/.mdc tak di-refresh (celah audit 2026-07-26).
    const r = spawnSync(process.execPath, [setupMjs, '--force', '--project-root', projectRoot, '--project-root-mode=folder-sekarang'], { stdio: 'inherit', timeout: 600000 })
    if (r.error || r.status !== 0) {
      console.log(`WARN  Pemasang Node bermasalah (kode ${r.status ?? 'error'}). Berkas kit sudah ter-ambil, tapi setup mungkin tak komplit.`)
      console.log(`      Jalankan manual: node .\\${NAMA_FOLDER_KIT}\\setup-pola-b.mjs --force`)
    }
  } else {
    console.log('WARN  Pemasang setup-pola-b.mjs tak ada di kit baru - lewati.')
  }
}

// ---- Langkah 5 + 6: laporan versi/label + cek kesehatan kit baru (doctor) + info cadangan ----
export function reportUpdateAndRunDoctor({ kitDir, currentVersion, args, backupDir, timestamp }) {
  // Laporan Langkah-5 diiris ke buildPostUpdateReportLines (fungsi murni, return-lines; string byte-identik,
  // dikunci tests/update-report-lock.test.mjs). Pemanggil cuma mencetak tiap baris apa adanya.
  for (const line of buildPostUpdateReportLines({ kitDir, currentVersion })) console.log(line)

  // ---- Langkah 6: Cek kesehatan kit baru (doctor) ----
  const newKitMjs = path.join(kitDir, 'kit.mjs')
  let doctorExit = null
  if (fs.existsSync(newKitMjs)) {
    console.log('')
    console.log('Langkah 6: Cek kesehatan kit baru (doctor)...')
    // --skip-cek-versi: kita BARU SAJA memasang versi terbaru, jadi menanya npm lagi cuma menambah
    // tunggu jaringan + berisiko bikin laporan membingungkan. Kit versi lama tak kenal bendera ini ->
    // diabaikan tanpa efek (aman dua arah).
    const r = spawnSync(process.execPath, [newKitMjs, 'doctor', '--skip-cek-versi'], { stdio: 'inherit', timeout: 300000 })
    doctorExit = r.error ? 1 : r.status
  }
  if (doctorExit !== null && doctorExit !== 0) {
    console.log('')
    console.log(`WARN  Doctor menemukan masalah di kit baru (kode ${doctorExit}) - update mungkin tak lengkap.`)
    if (!args.noBackup && fs.existsSync(backupDir)) {
      console.log('      Versi lama AMAN tersimpan UTUH di folder cadangan:')
      console.log(`        ${backupDir}`)
      console.log("      Cara balik ke versi lama (paling mudah): minta AI -> 'rollback dong'")
      console.log('      Atau manual - kembalikan folder cadangan (2 langkah):')
      console.log(`        1) pindahkan '${kitDir}' ke '${kitDir}.broken-${timestamp}'`)
      console.log(`        2) pindahkan '${backupDir}' ke '${kitDir}'`)
      console.log("      (CATATAN: 'rollback' hanya memulihkan berkas project per-satuan, BUKAN folder kit ini.)")
    } else {
      console.log('      Tidak ada cadangan (--no-backup) - perbaiki manual: jalankan update lagi.')
    }
  } else if (doctorExit === 0) {
    console.log('OK    Kit baru sehat (doctor lulus).')
  }

  if (!args.noBackup && fs.existsSync(backupDir)) {
    console.log('')
    console.log('Cadangan lama tersimpan di:')
    console.log(`  ${backupDir}`)
    console.log('')
    console.log('Hapus cadangan kalau sudah yakin update sukses:')
    console.log(`  hapus folder '${backupDir}'`)
  }
}

// ---- Klasifikasi tier + ringkasan (selalu jalan, non-fatal) ----
export function printTierSummary(kitDir) {
  try {
    console.log('')
    console.log('[*] Klasifikasi tier update dari CHANGELOG...')
    let changelogPath = path.join(kitDir, 'CHANGELOG.md')
    if (!fs.existsSync(changelogPath)) changelogPath = path.join(process.cwd(), NAMA_FOLDER_KIT, 'CHANGELOG.md')
    const entry = getLatestChangelogEntry(changelogPath)
    if (entry) {
      const tier = resolveUpdateTier(entry.body)
      const summary = formatUpdateSummary(tier, entry)
      console.log(summary)
    } else {
      console.log('[WARN] Lewati klasifikasi tier - CHANGELOG tak bisa diurai.')
    }
  } catch (e) {
    console.log(`[WARN] Klasifikasi tier error (non-fatal): ${e.message}`)
  }
}

// ---- Bersih-bersih cadangan - OPT-IN via --cleanup-backups (default MATI) ----
export function runBackupCleanupStep(args, projectRoot) {
  if (args.cleanupBackups) {
    try {
      console.log('')
      console.log('[*] Bersih-bersih cadangan lama (--cleanup-backups aktif)...')
      const rootForCleanup = projectRoot || '.'
      invokeBackupCleanup(rootForCleanup, { maxAgeDays: 30, keepLatest: 3 })
    } catch (e) {
      console.log(`[WARN] Bersih-bersih cadangan error (non-fatal): ${e.message}`)
    }
  } else {
    console.log('')
    console.log('[i] Bersih-bersih cadangan DILEWATI (opt-in via --cleanup-backups).')
    console.log('    Berkas *.bak / *.backup-* di akar proyek tidak diutak-atik.')
    console.log('    Jalankan ulang dengan --cleanup-backups kalau mau auto-hapus cadangan > 30 hari.')
  }
}
