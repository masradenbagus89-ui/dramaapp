// engine/setup-deploy.mjs — TAHAP 10-14 pemasangan: menulis berkas ke project client.
//
// Dipecah dari setup-pola-b.mjs (Fase E 2026-07-25, fase D). Isi tiap tahap dipindah APA ADANYA —
// tiap baris konsol + urutan operasi byte-identik. Pasangannya: engine/setup-steps.mjs (tahap 1-9,
// yang menyiapkan + mengamankan kit SEBELUM satu berkas pun ditulis ke project).
//
// Semua tahap di sini menerima objek konteks (ctx) yang sama — lihat penjelasan lengkapnya di
// engine/setup-steps.mjs. Aturannya sama: destructure di baris pertama, dan kalau sebuah tahap
// menghasilkan nilai untuk tahap berikutnya, simpan balik ke ctx di baris terakhir.
//
// URUTAN DI SINI BERMAKNA: migrasi+gerbang AGENTS.md WAJIB jalan sebelum kernel ditulis (kalau tidak,
// kustomisasi client ditimpa tanpa pemberitahuan), dan catatan-pasang ditulis PALING AKHIR supaya
// mencatat seluruh berkas yang benar-benar mendarat.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { addToManifest, addDirToManifest, saveManifest } from './manifest.mjs'
import { publishAgentsMd, publishAgentsOverrideMd, publishClaudeMd } from './agents-md.mjs'
import { migrateOldAgentsMd, migrateOverrideToLocal } from './migrate-agents-md.mjs'
import { backupStamp } from './fs-text.mjs'
import { writeLintasProjectManifestIfMissing } from './project-manifest.mjs'
import { detectAgentsFormat, buildAgentsMdOptions, diffLines } from './setup-interactive.mjs'
import { showInput, showNumberedChoice } from './setup-prompts.mjs'
import { appendGitignoreIfMissing, deployOne, pasangPolaGitignoreLintasAI } from './setup-fs.mjs'
import { NAMA_FOLDER_KIT } from './project-root.mjs'

// Penanda "berkas ini milik kit" di robot keamanan CI. Wajib IDENTIK dengan baris penanda di
// templates/github/workflows/secret-guard.yml — dikunci tests/kit-templates-guard.test.mjs supaya
// keduanya tak bisa bergeser sendiri-sendiri (kalau bergeser, jalur refresh diam-diam mati).
export const PENANDA_SECRET_GUARD = 'lintasAI CI secret guard'

export function susunPlaceholders(ctx) {
  const { KitDir, projectName, today, kitVersion } = ctx
  const { force, dryRun } = ctx.args
  // ---- Info pemilik/repo (opsional, untuk isi AGENTS.md) ----
  // Tanya lewat popup HANYA kalau bukan --force / bukan --dry-run. Mode otomatis/tanpa-layar ->
  // showInput balas Cancel -> pakai nilai default aman.
  // os.userInfo() bisa melempar (akun tanpa nama/homedir di sandbox tertentu) - bungkus supaya tak
  // menghentikan pemasang sebelum apa pun jalan. Di Windows normal USERNAME hampir selalu terisi.
  let osUser = ''
  try { osUser = os.userInfo().username || '' } catch { osUser = '' }
  const defaultOwner = process.env.USERNAME || osUser || 'staff'
  let ownerName = defaultOwner
  let repoUrl = 'belum-ada (solo project)'
  if (!force && !dryRun) {
    const nameRes = showInput({
      title: 'Info untuk AGENTS.md (opsional)',
      message: `Nama kamu (Enter / batal = pakai bawaan: ${defaultOwner}):`,
      defaultValue: defaultOwner,
      kitDir: KitDir,
    })
    if (nameRes.status === 'OK' && nameRes.value.trim()) ownerName = nameRes.value.trim()
    const repoRes = showInput({
      title: 'Info untuk AGENTS.md (opsional)',
      message: "URL repo standar tim (Enter / batal = pakai bawaan: 'belum-ada'):",
      defaultValue: '',
      kitDir: KitDir,
    })
    if (repoRes.status === 'OK' && repoRes.value.trim()) repoUrl = repoRes.value.trim()
  }
  const placeholders = {
    '<NAMA_PROYEK>': projectName,
    '<TANGGAL_HARI_INI>': today,
    '<NAMA_KAMU>': ownerName,
    '<URL_REPO_STANDAR>': repoUrl,
    '<VERSI_KIT>': kitVersion,
  }
  ctx.placeholders = placeholders
}

export function migrasiDanGerbangAgents(ctx) {
  const { KitDir, projectRoot, skippedSteps } = ctx
  const { force, dryRun } = ctx.args
  // ---- Migrasi client lama (ADR-032) + kernel AGENTS.md + override AGENTS.local.md ----
  // ADR-032: AGENTS.md = KERNEL milik kit (di-refresh tiap install/update; acuan tunggal, dibaca native
  // Codex/Kimi/Cursor + Claude via @import). Kustomisasi project pindah ke AGENTS.local.md (MILIK
  // client, DIPERTAHANKAN lintas-update). Migrasi dulu: pindahkan AGENTS.md gaya-lama -> AGENTS.local.md
  // SEBELUM kernel menimpanya (cegah kehilangan kustomisasi client lama).
  const kernelSource = path.join(KitDir, 'AGENTS.md')
  // (overrideTemplate dipakai di pasangKernelDanPemuat, bukan di sini - tak diulang supaya tak ada
  //  variabel menganggur yang menyesatkan pembaca berikutnya.)

  if (!dryRun) {
    try {
      const mig = migrateOldAgentsMd({ projectRoot })
      if (mig.migrated) {
        console.log(`OK    Migrasi ADR-032: kustomisasi lama di AGENTS.md dipindah ke AGENTS.local.md${mig.hadCodexBlock ? ' (blok Codex generated dibuang)' : ''} - tidak hilang.`)
      }
    } catch (e) {
      console.log(`PERINGATAN: Migrasi AGENTS.md dilewati: ${e.message} (lanjut - AGENTS.md lama tetap dicadangkan saat kernel ditulis).`)
    }

    // Migrasi NAMA override (2026-08-09): AGENTS.override.md MENUTUPI kernel di Codex - alat itu memuat
    // paling banyak SATU berkas per-folder dan memeriksa override lebih dulu. Dijalankan SETELAH migrasi
    // ADR-032 (supaya isi client yang baru diselamatkan ikut pindah) dan SEBELUM kernel/override ditulis.
    // Isinya disalin utuh + dicadangkan SEBELUM berkas lama dibuang (izin owner, sec.3.1).
    try {
      const ren = migrateOverrideToLocal({ projectRoot, backupStamp: backupStamp(new Date()) })
      if (ren.migrated) {
        const catatan = ren.reason === 'dua-duanya-ada' ? ' (berkas baru sudah ada - isi lama TIDAK menimpanya)' : ''
        console.log(`OK    Migrasi nama override: AGENTS.override.md -> AGENTS.local.md${catatan}.`)
        console.log(`        -> Kenapa: nama lama MENUTUPI kernel di Codex (alat itu memuat 1 berkas per-folder). Cadangan: ${path.basename(ren.backup)}`)
      } else if (ren.reason && ren.reason.startsWith('gagal')) {
        console.log(`PERINGATAN: Migrasi nama override dilewati (${ren.reason}) - AGENTS.override.md dibiarkan APA ADANYA. Kernel masih tertutup di Codex; coba lagi setelah masalahnya beres.`)
      }
    } catch (e) {
      console.log(`PERINGATAN: Migrasi nama override dilewati: ${e.message} (berkas lama tidak disentuh).`)
    }
  }

  // ---- Gerbang proteksi AGENTS.md milik project (format ASING) ----
  // KENAPA jadi MESIN, bukan prosa: menimpa berkas aturan milik user = keputusan keselamatan. Sebelumnya
  // gerbang ini cuma tertulis di prompt alur pemasangan (kini dibongkar) - artinya TAK PERNAH benar-benar
  // berjalan. Celah nyata yang ditutup: `migrateOldAgentsMd` di atas menyelamatkan AGENTS.md gaya-lama
  // HANYA kalau AGENTS.local.md belum ada (lihat alasan 'override-sudah-ada' di engine/migrate-agents-md.mjs);
  // di luar itu berkas asing ditimpa tanpa satu pun kalimat pemberitahuan.
  // Cakupan SEMPIT - hanya format 'foreign'. Format lintasAI SENGAJA tak ditanya: sejak ADR-032 AGENTS.md
  // = kernel milik kit yang WAJIB di-refresh tiap update (kalau ditanya lalu di-skip, update jadi mandul).
  // JUJUR soal batasnya: pemasang sengaja non-interaktif (ADR-004) -> di mode otomatis pilihan jatuh ke
  // indeks 0 = "cadangkan lalu ganti" (aman: berkas lama disimpan + bisa dibalik). Gerbang tetap lewat shim
  // supaya kalau suatu hari shim diberi input konsol, pertanyaannya langsung hidup tanpa menyunting berkas ini.
  let agentsPreserve = false
  const agentsTarget = path.join(projectRoot, 'AGENTS.md')
  if (!dryRun && fs.existsSync(agentsTarget)) {
    let existingAgents = ''
    try { existingAgents = fs.readFileSync(agentsTarget, 'utf8') } catch { existingAgents = '' }
    if (existingAgents.trim() && detectAgentsFormat(existingAgents) === 'foreign') {
      const opsi = buildAgentsMdOptions(false)
      // --force = "jangan tanya apa pun" (kontrak flag) -> langsung nilai-aman indeks 0.
      const pilih = force ? 0 : showNumberedChoice({
        title: 'AGENTS.md di project ini sudah ada',
        message: 'Berkas AGENTS.md di project ini BUKAN format lintasAI - kemungkinan dipakai alat AI lain, atau kamu tulis sendiri. Kernel lintasAI perlu menempati berkas itu supaya aturannya kebaca. Mau diapakan?',
        options: opsi.map((o) => o.label),
        defaultIndex: 0,
        kitDir: KitDir,
      })
      const aksi = (opsi[pilih] || opsi[0]).action
      if (aksi === 'diff') {
        try {
          const tpl = fs.existsSync(kernelSource) ? fs.readFileSync(kernelSource, 'utf8') : ''
          const d = diffLines(existingAgents, tpl)
          console.log(`INFO: Beda isi AGENTS.md - ${d.onlyExisting.length} baris hanya ada di berkas lamamu, ${d.onlyTemplate.length} baris hanya ada di kernel lintasAI.`)
        } catch { /* ringkasan beda cuma pelengkap - jangan pernah bikin pemasangan gagal */ }
      }
      if (aksi === 'skip') {
        agentsPreserve = true
        console.log('OK    AGENTS.md lamamu DIPERTAHANKAN atas pilihanmu (tidak disentuh).')
        console.log('      PERINGATAN: aturan lintasAI jadi TIDAK terpasang penuh di project ini.')
        skippedSteps.push('AGENTS.md (dipertahankan - berkas milik project; aturan lintasAI tak terpasang penuh)')
      } else {
        console.log('PERHATIAN: AGENTS.md di project ini bukan format lintasAI. Berkas lamamu DICADANGKAN dulu,')
        console.log('           baru diganti kernel lintasAI. Mau kembalikan? salin ulang berkas .backup-<cap-waktu>')
        console.log('           yang path-nya tercetak di baris CADANGAN di bawah.')
      }
    }
  }
  ctx.agentsPreserve = agentsPreserve
}

export function pasangKernelDanPemuat(ctx) {
  const { KitDir, projectRoot, projectName, manifestState, skippedSteps, placeholders, agentsPreserve } = ctx
  const { dryRun } = ctx.args
  // kernelSource/overrideTemplate dihitung ulang di sini (deterministik, path saja) supaya tahap ini
  // berdiri sendiri — migrasiDanGerbangAgents di atas memakai nilai yang sama.
  const kernelSource = path.join(KitDir, 'AGENTS.md')
  const overrideTemplate = path.join(KitDir, 'AGENTS.local.md.template')

  // Kernel AGENTS.md: SELALU refresh (kit-owned). Backup existing lalu timpa - kustomisasi client sudah
  // aman di AGENTS.local.md (migrasi di atas), jadi timpa di sini tidak menghilangkan kerja client.
  if (dryRun) {
    console.log('[SIMULASI] REFRESH kernel AGENTS.md (backup + timpa)')
  } else if (!fs.existsSync(kernelSource)) {
    console.log('PERINGATAN: kernel AGENTS.md tak ada di kit - lewati (aturan mungkin tidak terpasang).')
  } else {
    try {
      const r = publishAgentsMd({ projectRoot, templatePath: kernelSource, placeholders: {}, preserve: agentsPreserve })
      if (r.backup_path) {
        addToManifest(manifestState, r.backup_path, 'backup', 'AGENTS.md (cadangan pra-refresh kernel)')
        console.log(`CADANGAN AGENTS.md -> ${r.backup_path}`)
      }
      if (r.action === 'preserved') {
        // Gerbang di atas memilih 'skip' - berkas milik project sengaja tak disentuh. JANGAN catat
        // sebagai 'kernel' di manifest: berkasnya bukan milik kit, dan uninstall tak boleh menghapusnya.
        console.log(`OK    ${r.target_path} (berkas milik project - tidak diubah)`)
      } else {
        addToManifest(manifestState, r.target_path, 'kernel', 'AGENTS.md (kernel aturan)')
        console.log(`OK    ${r.target_path} (kernel aturan - dibaca native Codex/Kimi/Cursor + Claude via @import)`)
      }
    } catch (e) {
      console.error(`GAGAL pasang kernel AGENTS.md: ${e.message}`)
      process.exit(1)
    }
  }

  // Override AGENTS.local.md: MILIK CLIENT -> PRESERVE kalau sudah ada (tak pernah ditimpa saat update).
  if (dryRun) {
    console.log('[SIMULASI] PASANG AGENTS.local.md (preserve kalau sudah ada)')
  } else if (!fs.existsSync(overrideTemplate)) {
    console.log('PERINGATAN: AGENTS.local.md.template tak ada di kit - lewati override.')
  } else {
    try {
      const r = publishAgentsOverrideMd({ projectRoot, templatePath: overrideTemplate, placeholders, preserve: true })
      if (r.action === 'preserved') {
        console.log('OK    AGENTS.local.md sudah ada - dipertahankan (kustomisasi project tidak ditimpa).')
        skippedSteps.push('AGENTS.local.md (dipertahankan - milik project)')
      } else {
        addToManifest(manifestState, r.target_path, 'filled_template', 'AGENTS.local.md.template')
        console.log(`OK    ${r.target_path} (override khusus project)`)
      }
    } catch (e) {
      console.log(`PERINGATAN: Gagal pasang AGENTS.local.md: ${e.message} (kernel AGENTS.md tetap ada).`)
    }
  }

  // ---- Pasang pemuat CLAUDE.md (otomatis dibaca Claude Code) ----
  const claudeTemplate = path.join(KitDir, 'CLAUDE.md.template')
  if (dryRun) {
    console.log('[SIMULASI] PASANG pemuat CLAUDE.md')
  } else if (!fs.existsSync(claudeTemplate)) {
    console.log('PERINGATAN: CLAUDE.md.template tidak ada di kit - lewati pemuat (aturan mungkin tidak auto-baca).')
  } else {
    try {
      const r = publishClaudeMd({ projectRoot, templatePath: claudeTemplate, placeholders: { '<NAMA_PROYEK>': projectName } })
      if (r.action === 'current') {
        console.log('OK    Pemuat CLAUDE.md sudah terpasang (tidak diubah).')
      } else {
        if (r.backup_path) {
          addToManifest(manifestState, r.backup_path, 'backup', 'CLAUDE.md (kustom, cadangan pra-pemuat)')
          console.log(`CADANGAN CLAUDE.md kustom -> ${r.backup_path}`)
        }
        addToManifest(manifestState, r.target_path, 'filled_template', 'CLAUDE.md.template')
        console.log(`OK    ${r.target_path} (pemuat aturan tim - otomatis dibaca Claude Code)`)
      }
    } catch (e) {
      console.log(`PERINGATAN: Gagal pasang pemuat CLAUDE.md: ${e.message} (AGENTS.md tetap ada).`)
    }
  }
}

export function pasangDocsDanRobotCI(ctx) {
  const { KitDir, projectRoot, manifestState } = ctx
  const { dryRun } = ctx.args
  // ---- Bootstrap docs/ skeleton (lewati kalau project hampir kosong) ----
  const docsDir = path.join(projectRoot, 'docs')
  const excludeNames = new Set(['.git', NAMA_FOLDER_KIT, 'AGENTS.md', 'CLAUDE.md', 'docs', 'node_modules', 'vendor', 'dist', 'build', 'out', 'target', '__pycache__', '.venv', 'venv', '.next', '.nuxt', '.turbo', '.cache'])
  let nonHidden = []
  try {
    nonHidden = fs.readdirSync(projectRoot).filter((n) => !excludeNames.has(n) && !n.startsWith('.'))
  } catch { nonHidden = [] }
  const almostEmpty = nonHidden.length <= 1

  if (almostEmpty) {
    console.log('\nINFO: Project terlihat hampir kosong - lewati skeleton docs/ (terlalu dini). Akan auto-dibuat setelah ada kode.')
  } else if (!fs.existsSync(docsDir) && !dryRun) {
    fs.mkdirSync(docsDir, { recursive: true })
    addDirToManifest(manifestState, docsDir)
    console.log(`\nDIBUAT ${docsDir}`)
  }

  // ---- Bootstrap robot keamanan CI ----
  // SATU SUMBER, BUKAN DUA (2026-07-26). Dulu blok ini menyalin 13 panduan ke docs/ project client,
  // padahal isi kit yang SAMA sudah mendarat di .lintasai/templates/ dan itulah yang dirujuk semua
  // SKILL.md (path `templates/...`). Dua salinan = dijamin melenceng, karena deployOne BERHENTI kalau
  // target sudah ada (engine/setup-fs.mjs) sehingga salinan docs/ membeku di versi install PERTAMA
  // selamanya sementara .lintasai/templates/ di-refresh tiap update. Panduan kini hidup di SATU
  // tempat saja; yang tetap disalin cuma yang benar-benar harus berada di repo client untuk bekerja:
  // workflow GitHub (jalan di CI client, mustahil dijalankan dari dalam .lintasai/).
  // Nama variabel `teamFiles` + kind 'team_file' SENGAJA TETAP: anchor tests/kit-templates-guard.test.mjs
  // + kind dipakai pencocokan pembersih update-cleanup di manifest client LAMA.
  if (!almostEmpty) {
    console.log('\n=== Salin robot keamanan CI ===')
    const githubDir = path.join(projectRoot, '.github')
    const workflowsDir = path.join(githubDir, 'workflows')
    for (const d of [githubDir, workflowsDir]) {
      if (!fs.existsSync(d) && !dryRun) {
        fs.mkdirSync(d, { recursive: true })
        addDirToManifest(manifestState, d)
        console.log(`DIBUAT ${d}`)
      }
    }
    const teamFiles = [
      ['templates/github/workflows/secret-guard.yml', path.join(workflowsDir, 'secret-guard.yml')],
    ]
    for (const [src, dst] of teamFiles) {
      // refreshMarker: robot keamanan CI WAJIB ikut diperbarui tiap update — pola deteksi rahasianya
      // berkembang, dan tanpa ini ia membeku di versi pemasangan PERTAMA selamanya (cermin jalur
      // refresh hook lokal pre-commit). Berkas yang penandanya tak ada = milik client -> tetap dilewati.
      deployOne({ src: path.join(KitDir, src), dst, from: src, kind: 'team_file', manifestState, dryRun, withPlaceholder: false, refreshMarker: PENANDA_SECRET_GUARD })
    }

    // Pengingat: langkah lanjut yang TAK muncul di rangkuman akhir.
    console.log('')
    console.log('=== Pengingat ===')
    console.log(`  - Kalau pakai database: ${NAMA_FOLDER_KIT}/templates/SAFE_DATABASE_OPERATIONS.md.`)
  }
  ctx.docsDir = docsDir
  ctx.almostEmpty = almostEmpty
}

export function tulisKartuDanCatatanPasang(ctx) {
  const { KitDir, projectRoot, projectName, kitVersion, manifestState } = ctx
  const { dryRun } = ctx.args
  // ---- Tulis kartu identitas project (project.lintas.jsonc) ----
  try {
    const pmWrite = writeLintasProjectManifestIfMissing(projectRoot, { dryRun })
    if (pmWrite.Written) {
      addToManifest(manifestState, pmWrite.Path, 'project_manifest', 'generated: project.lintas.jsonc')
      console.log(`OK    ${pmWrite.Path} (kartu identitas project - stack otomatis, tujuan menunggu AI)`)
    } else if (pmWrite.Reason === 'exists') {
      console.log('LEWATI project.lintas.jsonc (sudah ada, tidak ditimpa)')
    } else if (pmWrite.Reason === 'whatif') {
      console.log('[SIMULASI] TULIS project.lintas.jsonc di akar project')
    }
  } catch (e) {
    console.log(`PERINGATAN: Gagal tulis kartu identitas (lanjut): ${e.message}`)
  }

  // ---- Simpan catatan-pasang (.install-manifest.json + stempel keaslian) ----
  if (!dryRun) {
    try {
      const saveResult = saveManifest(manifestState, { kitDir: KitDir, kitVersion, projectName, installerName: 'setup-pola-b.mjs' })
      // .lintasai/.gitignore: cegah kebocoran catatan-pasang + cadangan + rahasia
      appendGitignoreIfMissing(
        path.join(KitDir, '.gitignore'),
        ['.install-manifest.json', '.manifest-secret', '.audit-log', '.git-identity-*', '*.bak', '*.backup-*', '*.env', '*.env.local', '*.pem', '*.key'],
        '\n# Ditambah otomatis oleh pemasang lintasAI (cegah kebocoran rahasia + metadata):\n',
        false,
      )
      console.log(`\nOK    catatan-pasang ditulis (${saveResult.filesCount} berkas + ${saveResult.dirsCount} folder dicatat)`)
      if (saveResult.merged) console.log('      Digabung dengan catatan sebelumnya (pasang ulang terdeteksi).')
      if (saveResult.signed) console.log('      Diberi stempel keaslian (deteksi utak-atik aktif).')
    } catch (e) {
      console.log(`PERINGATAN: Gagal tulis catatan-pasang: ${e.message} (pemasangan TETAP berhasil).`)
    }

    // .gitignore akar project: cegah commit rahasia + identitas per-staff + folder cadangan
    try {
      // Daftar pola + header ada di engine/setup-fs.mjs (SATU sumber, dipakai juga oleh migrasi
      // nama folder kit — lihat catatan anti-drift di sana).
      const r = pasangPolaGitignoreLintasAI(projectRoot, false)
      if (r.added > 0) console.log(`OK    .gitignore akar project: ${r.added} pola lintasAI ditambah (cegah kebocoran rahasia)`)
      else console.log('OK    .gitignore akar project: pola lintasAI sudah ada (tidak diubah)')
    } catch (e) {
      console.log(`PERINGATAN: Gagal perbarui .gitignore akar project: ${e.message}`)
    }
  }
}
