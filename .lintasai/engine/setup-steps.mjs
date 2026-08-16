// engine/setup-steps.mjs — TAHAP 1-9 pemasangan: siapkan + amankan kit sebelum menulis ke project.
//
// Dipecah dari setup-pola-b.mjs (Fase E 2026-07-25, fase D — bagian PALING BERISIKO): badan main()
// (623 baris) diiris jadi tahap-tahap. Isi tiap tahap dipindah APA ADANYA — tiap baris konsol,
// urutan operasi, dan titik process.exit byte-identik. Tahap yang MENULIS berkas ke project ada di
// modul sebelahnya: engine/setup-deploy.mjs (tahap 10-14).
//
// 🚨 KENAPA ADA OBJEK KONTEKS (ctx): main() dulu berbagi state MUTABLE antar-langkah — KitDir dan
// projectRoot BERUBAH di tengah jalan (KitDir: folder sumber -> .lintasai hasil salin -> induk
// kalau kit ter-ekstrak bersarang), sementara manifestState + skippedSteps DIMUTASI hampir tiap
// langkah. Mengoper nilai satu per satu akan diam-diam membekukan salinan lama; ctx membuat
// "satu sumber kebenaran" itu eksplisit.
//   - Tahap yang MENGUBAH KitDir/projectRoot menyalin balik ke ctx di baris terakhirnya.
//   - Tahap lain destructure di baris pertama (cuma-baca) supaya badan tahap tetap byte-identik
//     dengan versi lamanya di dalam main().
// Kalau menambah tahap: ikuti pola itu — JANGAN memutasi ctx di tengah badan tahap, karena urutan
// baca/tulis antar-tahap justru yang membuat alur ini bisa ditelusuri.
//
// process.exit DIPERTAHANKAN di dalam tahap (bukan diubah jadi return berkode): pemasang memang
// berhenti seketika di titik-titik itu, dan mengubahnya = perubahan perilaku, bukan refactor.
import fs from 'node:fs'
import path from 'node:path'
import { initializeManifest, addToManifest } from './manifest.mjs'
import { removeGitMetadata, removeMotwBlock } from './git-helpers.mjs'
import { getKitVersionFromChangelog } from './version-detect.mjs'
import { backupStamp } from './fs-text.mjs'
import { readKitManifest } from './kit-files.mjs'
import { getStackType } from './project-detect.mjs'
import { findProjectRoot, terapkanModeAkar, pesanAkarMeleset, NAMA_FOLDER_KIT } from './project-root.mjs'
import { isInteractiveInput, showYesNo } from './setup-prompts.mjs'
import { adalahRepoPengembanganKit, shouldCopyKitEntry } from './setup-kit-filter.mjs'
import { migrasiNamaFolderKit, barisLaporanMigrasi } from './kit-staging.mjs'

export function laporModeInteraktif(ctx) {
  const { noGui } = ctx.args
  // ---- Mode non-interaktif (tanpa keyboard manusia - dijalankan AI/CI) ----
  // --no-gui = paksa mode aman TANPA popup. Pemasang tak punya jalur input-konsol, jadi "tanpa GUI"
  // = pakai nilai-aman = sama efeknya dengan non-interaktif. Di-set SEBELUM isInteractiveInput dipanggil
  // (cache-nya hanya di-set sekali) supaya semua popup Tahap 2 ikut membalas nilai-aman.
  if (noGui) process.env.LINTASAI_NONINTERACTIVE = '1'
  const nonInteractive = !isInteractiveInput()
  if (nonInteractive) {
    console.log('INFO: Mode non-interaktif terdeteksi (tidak ada keyboard manusia / dijalankan otomatis).')
    console.log('      Semua pertanyaan dilewati pakai nilai default yang aman.')
  } else {
    // Manusia di terminal NYATA (TTY). Pemasang versi Node ini SENGAJA tak punya input konsol -- popup
    // GUI dibuang (ADR-004), pilihan dilakukan lewat AI di chat.
    // JUJURKAN supaya tak ada divergensi diam-diam: tanpa
    // pemberitahuan ini, manusia mengira akan ditanya Nama/repo/email padahal semuanya dilewati.
    console.log('CATATAN: Pemasang versi Node ini berjalan OTOMATIS PENUH - tidak menanyakan apa pun lewat konsol.')
    console.log('         Semua pertanyaan (Nama / URL repo / email) dilewati pakai nilai default aman.')
    console.log('         Atur sesudah pasang: lewat AI di chat, atau `git config user.name` / `git config user.email`.')
  }
}

export function tentukanAkarProject(ctx) {
  const { args } = ctx
  const KitDir = ctx.KitDir
  // ---- Tentukan akar project ----
  let projectRoot = args.projectRoot
  const npxMode = !!projectRoot
  if (!projectRoot) {
    projectRoot = path.dirname(KitDir) // tradisional: kit di <project>/.lintasai/
  } else {
    console.log(`[npx] Mode: akar project dari pemanggil = ${projectRoot}`)
  }
  if (!fs.existsSync(projectRoot)) {
    console.error(`ERROR: Akar project tidak ditemukan: ${projectRoot}`)
    process.exit(1)
  }
  projectRoot = fs.realpathSync(projectRoot)

  // ---- Celah 4 (ADR-024): pastikan kit mendarat di AKAR project, bukan di folder tempat
  //      perintah kebetulan dijalankan ----
  //
  // `bin/lintasai.js` menyuntik --project-root <process.cwd()>. Kalau client menjalankan
  // pemasang dari `bigseo/apps/web/`, kit mendarat di sana - lalu saat alat AI dibuka dari
  // `bigseo/`, CLAUDE.md tak dimuat, .claude/settings.json tak terbaca, hook menunjuk berkas
  // yang tak ada dan mati diam-diam. Client mengira lintasAI aktif padahal tidak.
  //
  // Yang dilakukan: DETEKSI + TANYA, bukan menebak. Memasang di subfolder itu SAH (monorepo);
  // yang dilarang adalah memasangnya di sana tanpa client tahu. Mode tradisional (bukan npx,
  // kit sudah duduk di <project>/.lintasai/) dilewati - di situ tak ada yang bisa meleset.
  if (npxMode) {
    const jejakAkar = findProjectRoot(projectRoot)
    const pilihan = terapkanModeAkar(jejakAkar, args.projectRootMode)
    if (pilihan.butuhTanya) {
      console.error(pesanAkarMeleset(jejakAkar, { perintah: 'npx lintasai init' }))
      process.exit(2)
    }
    if (pilihan.root !== projectRoot) {
      // Client memilih [1]: kit dipindahkan naik ke akar project.
      console.log(`[akar] Akar project terdeteksi (${jejakAkar.cara}): ${pilihan.root}`)
      console.log(`[akar] Kit dipasang di sana, bukan di folder perintah dijalankan (${projectRoot}).`)
      projectRoot = fs.realpathSync(pilihan.root)
    } else if (jejakAkar.meleset) {
      // Client memilih [2]: pasang di subfolder walau akar sebenarnya ada di atas. Ini SAH, tapi
      // DILARANG dilaporkan seolah folder ini akar project - keyakinan palsu semacam itu persis
      // yang membuat Celah 4 tak terdeteksi selama ini.
      console.log(`[akar] Atas pilihanmu, kit dipasang di folder ini: ${projectRoot}`)
      console.log(`[akar] Akar project sebenarnya ada di: ${jejakAkar.root}`)
      console.log('[akar] PENTING: buka alat AI-mu (Claude Code / Kimi / Codex / Cursor) dari folder')
      console.log('       tempat kit dipasang di atas - BUKAN dari akar project. Kalau tidak, aturan')
      console.log('       lintasAI tidak termuat dan pengamannya tidak jalan tanpa pesan error.')
    } else if (jejakAkar.cara !== 'cwd') {
      console.log(`[akar] Folder ini SUDAH akar project (dasar: ${jejakAkar.cara}).`)
    }
  }
  // ---- MIGRASI nama folder kit, sebelum penyalinan menyentuh apa pun ----
  // KENAPA di init juga, bukan cuma di update: client yang menjalankan `npx lintasai init` ulang di
  // project yang SUDAH punya kit bernama lama akan mendapat folder KEDUA bernama baru - dua folder
  // kit berdampingan, hook menunjuk yang lama, doctor bingung. Di sini rename justru lebih aman
  // daripada di update: pemasang berjalan dari cache npm, jadi folder kit client tidak terkunci.
  // FAIL-SAFE: keadaan yang tak boleh diteruskan -> berhenti aman dengan pesan, nol berkas disentuh.
  const migrasi = migrasiNamaFolderKit({ projectRoot, selfDir: KitDir, dryRun: args.dryRun })
  if (migrasi.pesan) {
    console.error('')
    for (const b of migrasi.pesan) console.error(b)
    process.exit(1)
  }
  for (const b of barisLaporanMigrasi(migrasi)) console.log(b)

  ctx.projectRoot = projectRoot
  ctx.npxMode = npxMode
}

export function praCekStack(ctx) {
  const { projectRoot } = ctx
  // ---- Pra-cek: jenis stack (HENTI KERAS untuk non-Node) ----
  // SEBELUM menyalin apa pun: kalau project BUKAN Node (mis. Python/PHP), pemasang berhenti DI SINI
  // supaya TIDAK ada folder .lintasai setengah-jadi yang tertinggal jadi sampah di project non-Node.
  // (Dulu pra-cek ini ada SETELAH penyalinan -> folder sudah terlanjur tersalin saat [STOP] dipanggil.)
  const stack = getStackType(projectRoot)
  console.log('\n=== Pra-cek: deteksi stack ===')
  if (stack.stackType === 'unknown') {
    console.log('[!] Stack tidak dikenali. lintasAI dioptimalkan untuk Node.js (Next.js). Lanjut dengan asumsi Node.js.')
  } else if (stack.isSupported) {
    console.log(`OK: stack terdeteksi = ${stack.stackType} (dari ${stack.detectedFiles.join(', ')}).`)
  } else {
    console.log('\n[STOP] lintasAI saat ini Node.js-only.')
    console.log(`       Stack terdeteksi: ${stack.stackType} (dari ${stack.detectedFiles.join(', ')})`)
    console.log('       Cara sementara: pasang kit di project Node lain (mis. Next.js).')
    console.log('       (Belum ada berkas yang disalin ke project ini - aman, tak ada folder tertinggal.)')
    process.exit(1)
  }
}

// Cadangkan kit LAMA sebelum `init` menimpanya. Return { dicadangkan, alasan, backupDir? }.
//
// MASALAH yang ditutup: `init` menyalin dengan cpSync yang menimpa berkas per-berkas TANPA cadangan
// DAN TANPA membuang berkas yang sudah dicabut versi baru — jadi client yang mengetik `init` untuk
// "upgrade" mendapat kit CAMPUR lama+baru, tanpa satu pun peringatan. Bandingkan `update`, yang
// menukar folder secara utuh lewat cadangan (engine/kit-staging.mjs swapInKit).
//
// KENAPA MENCADANGKAN, BUKAN BERTANYA: pemasang TIDAK punya jalur input sama sekali — showYesNo di
// engine/setup-prompts.mjs selalu membalas nilai tetap tanpa pernah menampilkan apa pun (ADR-004
// mencabut popup dan menjadikan pemasang otomatis penuh). Konfirmasi di sini cuma punya dua
// kemungkinan: palsu, atau membatalkan SETIAP pemasangan. Cadangan memberi perlindungan nyata tanpa
// butuh keyboard, sekaligus membuat pemasangannya BERSIH (berkas usang tak lagi tertinggal bercampur).
//
// TIGA SYARAT, semuanya wajib — tiap syarat menutup satu jalur yang akan RUSAK kalau ikut kena:
//   1. !sameLocation — di CI, sumber kit ADALAH folder tujuannya sendiri (validate.yml menjalankan
//      `.lintasai/setup-pola-b.mjs` tanpa --force). Memindahkan folder di situ = menghapus rumah skrip
//      yang sedang berjalan.
//   2. !force — `npx lintasai update` memanggil ulang pemasang dengan --force (engine/update-steps.mjs)
//      SESUDAH ia membuat cadangannya sendiri. Tanpa syarat ini tiap update meninggalkan cadangan DOBEL.
//   3. folder tujuan memang sudah ada — kalau belum, tak ada apa pun untuk dicadangkan.
//
// FAIL-SAFE: gagal me-rename (khas Windows: folder terkunci editor/antivirus) TIDAK menghentikan
// pemasangan — cetak peringatan lalu lanjut menimpa, persis perilaku sebelum fungsi ini ada.
// Dikunci tests/setup-cadangan-init.test.mjs.
export function cadangkanKitLamaSebelumTimpa({ expectedKitDir, sameLocation, force, dryRun, clock = () => new Date() }) {
  if (sameLocation) return { dicadangkan: false, alasan: 'sumber-sama-dengan-tujuan' }
  if (force) return { dicadangkan: false, alasan: 'force' }
  if (!fs.existsSync(expectedKitDir)) return { dicadangkan: false, alasan: 'belum-ada-kit-lama' }

  const backupDir = `${expectedKitDir}.backup-${backupStamp(clock())}`
  if (dryRun) {
    console.log(`[SIMULASI] Kit lama akan dicadangkan: ${expectedKitDir} -> ${backupDir}`)
    return { dicadangkan: false, alasan: 'simulasi', backupDir }
  }
  try {
    fs.renameSync(expectedKitDir, backupDir)
    console.log(`OK    Kit lama dicadangkan: ${backupDir}`)
    console.log('      (Pemasangan jadi BERSIH - berkas versi lama tak tertinggal bercampur.)')
    console.log('      Untuk pindah versi biasa, `npx lintasai update` lebih tepat: ia juga membuang berkas usang + mendeteksi perubahan [BREAKING].')
    return { dicadangkan: true, alasan: 'dicadangkan', backupDir }
  } catch (e) {
    console.log(`PERINGATAN: Kit lama tak bisa dicadangkan (${e.message}).`)
    console.log('            Pemasangan LANJUT dengan menimpa berkas per-berkas - berkas versi lama bisa tertinggal.')
    console.log('            Kalau folder terkunci: tutup editor/terminal di folder itu, lalu jalankan `npx lintasai update`.')
    return { dicadangkan: false, alasan: 'gagal-rename' }
  }
}

export function salinKitKeProject(ctx) {
  const { projectRoot, npxMode } = ctx
  const { dryRun } = ctx.args
  let KitDir = ctx.KitDir
  // ---- Mode npx: salin kit dari sumber (cache npm) ke <project>/.lintasai/ ----
  const expectedKitDir = path.join(projectRoot, NAMA_FOLDER_KIT)
  const sameLocation = path.resolve(KitDir).toLowerCase() === path.resolve(expectedKitDir).toLowerCase()
  if (npxMode && sameLocation) {
    console.log('[npx] Sumber kit sudah di lokasi yang benar, lewati penyalinan.')
  } else if (npxMode) {
    cadangkanKitLamaSebelumTimpa({ expectedKitDir, sameLocation, force: ctx.args.force, dryRun })
    console.log(`[npx] Salin kit: ${KitDir} -> ${expectedKitDir}`)
    if (!dryRun) {
      try {
        fs.mkdirSync(expectedKitDir, { recursive: true })
        // filter: cegah rahasia kit-sumber (kunci-segel, profil tim, docs/plans) bocor + kurangi bloat
        // saat dijalankan dari repo-dev/CI (jalur npm staff sudah bersih via files[]). Lihat shouldCopyKitEntry.
        fs.cpSync(KitDir, expectedKitDir, { recursive: true, filter: (src) => shouldCopyKitEntry(src, KitDir) })
        KitDir = expectedKitDir
        console.log('[npx] Kit berhasil disalin.')
      } catch (e) {
        console.error(`ERROR: Gagal menyalin berkas kit ke ${expectedKitDir}`)
        console.error(`       Rincian: ${e.message}`)
        console.error('       Kemungkinan: antivirus mengunci berkas, path kepanjangan (>260), atau folder/disk penuh.')
        console.error('       Perbaiki penyebab di atas, lalu jalankan ulang.')
        process.exit(1)
      }
    } else {
      console.log(`[SIMULASI] [npx] Akan menyalin isi kit dari ${KitDir} ke ${expectedKitDir}`)
    }
  }
  ctx.KitDir = KitDir
}

export function rapikanKitBersarang(ctx) {
  const { force, dryRun } = ctx.args
  let KitDir = ctx.KitDir
  // ---- Deteksi kit ter-ekstrak BERSARANG (.lintasai/<folder>/...) ----
  const kitFolderName = path.basename(KitDir)
  const parentDir = path.dirname(KitDir)
  const parentFolderName = path.basename(parentDir)
  if (parentFolderName === NAMA_FOLDER_KIT) {
    console.log(`DETEKSI: Kit ter-ekstrak BERSARANG (folder di dalam folder) - skrip ada di '${kitFolderName}' di dalam '${NAMA_FOLDER_KIT}'.`)
    console.log('        Ini biasa terjadi kalau membuka zip pakai Windows Explorer (tombol Extract All).')
    if (dryRun) {
      console.log(`[SIMULASI] Akan rapikan: pindahkan isi '${KitDir}' ke '${parentDir}', lalu hapus folder kosong.`)
      console.log('Mode SIMULASI: berhenti setelah pratinjau bersarang.')
      process.exit(0)
    }
    // Tanpa -Force: tawarkan rapikan otomatis lewat popup Ya/Tidak. Default AMAN = Tidak
    // (operasi ini MENGHAPUS folder). Mode otomatis/tanpa-layar -> 'No' -> instruksi manual + henti.
    let doFlatten = force
    if (!force) {
      console.log('')
      const ans = showYesNo({
        title: 'Folder kit bersarang',
        message: `Folder kit ada di dalam folder lain ('${kitFolderName}' di dalam '${NAMA_FOLDER_KIT}'). Mau aku rapikan otomatis? (pindahkan isinya ke folder yang benar, lalu hapus folder kosong). Tidak = biarkan apa adanya (paling aman).`,
        defaultYes: false,
        kitDir: KitDir,
      })
      doFlatten = ans === 'Yes'
    }
    if (doFlatten) {
      try {
        for (const name of fs.readdirSync(KitDir)) {
          fs.renameSync(path.join(KitDir, name), path.join(parentDir, name))
        }
        fs.rmSync(KitDir, { recursive: true, force: true })
        console.log('OK    Rapikan selesai.')
        KitDir = parentDir
      } catch (e) {
        console.error(`GAGAL merapikan: ${e.message}`)
        console.error('       Perbaiki manual: pindahkan isi folder ke induknya, hapus folder kosong.')
        // tunjukkan berkas yang MASIH tertinggal di folder
        // sumber supaya staff tahu persis apa yang perlu dipindah manual (mis. saat 1 berkas terkunci
        // antivirus di tengah pemindahan). Best-effort: kalau folder sudah terhapus sebagian, abaikan.
        try {
          const sisa = fs.readdirSync(KitDir)
          if (sisa.length > 0) {
            console.error(`       Berkas yang masih di ${KitDir}:`)
            for (const name of sisa) console.error(`         ${name}`)
          }
        } catch { /* folder mungkin sudah terhapus sebagian - lewati daftar */ }
        process.exit(1)
      }
    } else {
      console.log('Dibiarkan apa adanya (tidak ada persetujuan rapikan otomatis). Perbaiki manual:')
      console.log(`  1. Pindahkan SEMUA isi '${KitDir}' ke induk '${parentDir}'.`)
      console.log(`  2. Hapus folder kosong '${KitDir}'.`)
      console.log('  3. Jalankan ulang pemasang dari folder induk.')
      process.exit(1)
    }
  }

  if (path.basename(KitDir) !== NAMA_FOLDER_KIT) {
    console.log(`PERINGATAN: Folder kit ini bernama '${path.basename(KitDir)}', bukan '${NAMA_FOLDER_KIT}'.`)
    console.log(`          Pola B mengasumsikan kit ada di "<project>/${NAMA_FOLDER_KIT}/". Aku tetap lanjut.`)
  }
  ctx.KitDir = KitDir
}

export function siapkanIdentitasPemasangan(ctx) {
  const { projectRoot, KitDir } = ctx
  const projectName = path.basename(projectRoot)
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // ---- Siapkan catatan-pasang (manifest) ----
  const manifestState = initializeManifest(projectRoot)

  // ---- Label versi kit dari CHANGELOG.md ----
  const detectedVersion = getKitVersionFromChangelog(path.join(KitDir, 'CHANGELOG.md'))
  const kitVersion = detectedVersion || 'pre-launch (testing)'
  ctx.projectName = projectName
  ctx.today = today
  ctx.manifestState = manifestState
  ctx.kitVersion = kitVersion
}

export function amankanKitDanRingkasAwal(ctx) {
  const { KitDir, projectRoot, projectName, today } = ctx
  const { dryRun } = ctx.args
  // ---- HENTI KERAS: jangan pernah dijalankan DARI DALAM repo pengembangan kit ----
  // KENAPA (kejadian nyata 2026-07-19): baris `removeGitMetadata(KitDir)` di bawah menghapus .git dari
  // KitDir. Itu BENAR untuk salinan kit di project client (`<project>/.lintasai/` = salinan vendor,
  // riwayat git-nya memang sampah). Tapi kalau installer dijalankan dari repo PENGEMBANGAN kit sendiri,
  // KitDir = repo itu sendiri -> SELURUH RIWAYAT GIT REPO KIT TERHAPUS, tanpa peringatan, tanpa cadangan.
  // Terjadi sungguhan saat menguji installer: 7 commit yang belum di-push hilang (pohon kerja selamat).
  // Pemeriksaan ini mengubah kegagalan-senyap-merusak jadi pesan berhenti yang jelas.
  if (!dryRun && adalahRepoPengembanganKit(KitDir)) {
    console.error('\n[STOP] Installer dijalankan DARI DALAM repo pengembangan lintasAI.')
    console.error(`       KitDir: ${KitDir}`)
    console.error('       Langkah berikutnya akan MENGHAPUS .git repo ini (benar untuk salinan kit di')
    console.error('       project client, fatal untuk repo pengembangan). Dihentikan demi keselamatan.')
    console.error('\n       Mau menguji installer? Pakai salinan kit di luar repo, contoh:')
    console.error('         cp -r <repo-kit> d:/tmp/uji-kit && cd d:/tmp/uji-projek')
    console.error('         node d:/tmp/uji-kit/setup-pola-b.mjs --project-root d:/tmp/uji-projek')
    console.error('\n       CATATAN: `--project-root` saja TIDAK cukup — ia hanya mengubah TUJUAN')
    console.error('       pemasangan, sedangkan .git yang dihapus adalah milik KitDir (asal kit).')
    process.exit(1)
  }

  // ---- Bersihkan .git bawaan kit + buka kunci keamanan Windows (Mark-of-the-Web) ----
  if (!dryRun) {
    if (!removeGitMetadata(KitDir)) console.log(`PERINGATAN: Gagal hapus ${NAMA_FOLDER_KIT}/.git/ (lanjut).`)
    if (removeMotwBlock(KitDir)) {
      console.log('OK    Kunci keamanan Windows dibuka untuk semua berkas kit.')
    } else {
      console.log('PERINGATAN: Buka-kunci keamanan Windows gagal (lanjut; mungkin perlu buka manual).')
    }
  }

  // ---- Ringkasan awal ----
  console.log('\n=== Pemasangan kit lintasAI (Pola B, versi Node) ===')
  console.log(`Folder kit    : ${KitDir}`)
  console.log(`Akar project  : ${projectRoot}`)
  console.log(`Nama project  : ${projectName}`)
  console.log(`Tanggal       : ${today}`)
  if (dryRun) console.log('Mode          : SIMULASI (tidak ada berkas yang ditulis)')
}

export function verifikasiBerkasIntiKit(ctx) {
  const { KitDir } = ctx
  // ---- Verifikasi berkas inti kit ADA (sumber: engine/kit-files.json) ----
  let manifest
  try {
    manifest = readKitManifest(KitDir)
  } catch (e) {
    console.error(`ERROR: Gagal baca manifest daftar-berkas (engine/kit-files.json): ${e.message}`)
    process.exit(1)
  }
  if (!manifest) {
    console.error('ERROR: manifest daftar-berkas (engine/kit-files.json) hilang. Pasang ulang kit.')
    process.exit(1)
  }
  const kitFiles = manifest.data
  // Grup 'tests' SENGAJA TIDAK diverifikasi sebagai "wajib ada": berkas tes = internal
  // dev, sengaja DIKECUALIKAN dari paket npm ("ramping tarball").
  // kit-files.json tetap mendaftar semua tes (untuk integritas DEV),
  // tapi PEMASANG CLIENT cuma boleh mewajibkan berkas yang BENAR-BENAR dikirim ke client. Dulu mewajibkan
  // 'tests' -> "Kit tidak lengkap. Berkas hilang" di TIAP install/re-install npm (bug terdeteksi uji-tarball
  // 2026-06-25). Dijaga tes bundle (berkas wajib pemasang non-tests WAJIB ada di tarball).
  // ADR-034: grup 'rules' DICABUT (rak on-demand kini = skills/). Kit lama yang masih punya grup itu tetap jalan (|| []).
  const groups = ['core_prompts', 'universal_rules', 'scripts', 'lib_files', 'templates', 'docs', 'ci', 'meta']
  const wajibAda = []
  for (const g of groups) {
    for (const f of (kitFiles[g] || [])) wajibAda.push(String(f))
  }
  const missing = wajibAda.filter((f) => !fs.existsSync(path.join(KitDir, f)))
  if (missing.length > 0) {
    console.error('ERROR: Kit tidak lengkap. Berkas hilang:')
    for (const f of missing) console.error(`        - ${f}`)
    console.error('       Pasang ulang kit, lalu jalankan lagi.')
    process.exit(1)
  }
  console.log(`OK    ${wajibAda.length} berkas inti kit terverifikasi`)
  ctx.kitFiles = kitFiles
}

// Catat SATU grup kit-files.json ke catatan-pasang + cetak ringkasan 1-baris (supaya log tak berisik
// tapi tetap transparan). Dipakai 2x di bawah; dulu dua salinan loop yang sama persis.
// KIND manifest ('lib' / 'node_lib') dibaca uninstall+rollback saat mengklasifikasi berkas — dioper
// sebagai parameter dan JANGAN diubah nilainya.
function catatGrupKeManifest(ctx, grup, kind, label) {
  const { KitDir, kitFiles, manifestState } = ctx
  const { dryRun } = ctx.args
  let tracked = 0
  for (const entri of (kitFiles[grup] || [])) {
    const rel = String(entri)
    const p = path.join(KitDir, rel)
    if (fs.existsSync(p)) {
      if (!dryRun) addToManifest(manifestState, p, kind, `${NAMA_FOLDER_KIT}/` + rel.replace(/\\/g, '/'))
      tracked++
    }
  }
  console.log(dryRun
    ? `[SIMULASI] ${tracked} ${label} akan dicatat ke catatan-pasang`
    : `OK    ${tracked} ${label} dicatat ke catatan-pasang`)
}

export function catatBerkasKitKeManifest(ctx) {
  // Urutan dua panggilan ini = urutan baris yang muncul di layar staff. Jangan ditukar.
  // Label 'berkas lib_files': dulu tertulis "berkas lib/", padahal folder lib/ sudah bernama engine/
  // sejak ADR-027 — grup-nya sendiri masih bernama lib_files (palang risk-gate + plan-mode-gate).
  catatGrupKeManifest(ctx, 'lib_files', 'lib', 'berkas lib_files')
  catatGrupKeManifest(ctx, 'node_lib', 'node_lib', 'berkas Node (.mjs)')
}
