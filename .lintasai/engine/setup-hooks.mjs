// engine/setup-hooks.mjs - Langkah "pasang hook + wiring project" pemasang lintasAI (Pola B), diekstrak dari
// setup-pola-b.mjs main() (refactor hemat-token, TANPA mengubah fungsi). Semua langkah di sini = TULANG
// PUNGGUNG deterministik yang jalan SETELAH berkas ter-deploy: gabung daftar izin Claude Code, pasang hook
// pengingat bahasa, Palang Rem risk-gate, Palang Rak rak-gate, Lampu Hijau plan-mode-gate, berkas aturan
// Cursor, penjaga rahasia pre-commit. (Daftar ini = cermin HOOK_STEPS + impor di bawah; dulu ia menyebut
// "pengingat rekam-pelajaran" & "aturan Kimi" — keduanya sudah tak ada, komentar basi yang bikin pembaca
// mengira ada hook yang tak pernah dipasang.)
// TIDAK ada process.exit / tak menyentuh KitDir (aman dipisah). Tiap langkah FAIL-SAFE
// (try/catch -> pemasangan TETAP berhasil). String output + urutan SENGAJA byte-identik dengan versi lama
// (dikunci tests/setup-pola-b-write.test.mjs).
//
// Kontrak: installProjectHooks({ projectRoot, kitDir, dryRun, manifestState }) -> { secretHookDeferred }.
//   secretHookDeferred=true kalau penjaga rahasia DILEWATI karena project belum "git init" -> pemanggil
//   (main) memasang ulang penjaga SETELAH setupGitIdentity mungkin membuat git init (tutup celah-bocor).
import fs from 'node:fs'
import path from 'node:path'

import { mergeAllowList } from './json-merge-helpers.mjs'
import { addToManifest } from './manifest.mjs'
import { ensureLangHook } from './lang-hook-wiring.mjs'
import { ensureRiskGateHook } from './ensure-risk-gate-hook.mjs'
import { ensureRakGateHook } from './ensure-rak-gate-hook.mjs'
import { ensurePlanModeGateHook } from './ensure-plan-mode-gate-hook.mjs'
import { runCursorRulesGen } from './adapter-rules-gen.mjs'
import { installSecretHook } from './install-secret-hook.mjs'

// TABEL 4 pemasang hook .claude/settings.json. Dulu 4 blok try/catch yang kerangkanya SAMA PERSIS
// (beda cuma teks + fungsi ensure) — kini DATA, supaya menambah gate ke-5 = menambah 1 entri.
// Tiap string di bawah dipindah VERBATIM dari blok lamanya; urutan entri = urutan baris di layar staff.
// `ringkas` dipakai di DUA tempat (pesan settings-rusak + pesan catch) karena dulu memang kata yang sama.
const HOOK_STEPS = [
  {
    // Idempoten + fail-safe (engine/lang-hook-wiring.mjs). Non-blokir: cuma menambah pengingat bahasa ke
    // konteks AI tiap pesan. Jalan di init DAN update (update-kit menjalankan ulang setup-pola-b --force).
    ensure: ensureLangHook,
    ringkas: 'hook bahasa',
    simulasi: '[SIMULASI] PASANG hook pengingat Bahasa Indonesia ke .claude/settings.json',
    changed: (aksi) => `OK    Hook pengingat Bahasa Indonesia ${aksi} (.claude/settings.json) - tutup + buka ulang VS Code untuk menerapkan.`,
    sudahAda: 'OK    Hook pengingat Bahasa Indonesia sudah terpasang (tidak ada perubahan).',
  },
  {
    // "Palang Rem Otomatis" (risk-gate), default NYALA sejak v1.61.0. Idempoten + FAIL-SAFE
    // (engine/ensure-risk-gate-hook.mjs): minta konfirmasi klik sebelum aksi BENAR-BENAR berbahaya
    // (rm -rf, DROP/DELETE tanpa WHERE, push --force, sentuh .env, format disk) + blokir menembus-pagar.
    // Mode "ask" = kerja normal TAK terganggu (hanya aksi bahaya yang ditanya). BEDA dari mode-otonomi
    // (opt-in, default mati): Palang Rem MENGURANGI risiko -> default NYALA selaras "keamanan dulu".
    ensure: ensureRiskGateHook,
    ringkas: 'Palang Rem',
    simulasi: '[SIMULASI] PASANG Palang Rem risk-gate ke .claude/settings.json',
    changed: (aksi) => `OK    Palang Rem aksi-berbahaya ${aksi} (.claude/settings.json) - minta konfirmasi sebelum aksi merusak. Matikan: hapus blok PreToolUse risk-gate. Aktif setelah buka chat BARU.`,
    sudahAda: 'OK    Palang Rem aksi-berbahaya sudah terpasang (tidak ada perubahan).',
  },
  {
    // "Palang Rak" (rak-gate), default NYALA sejak v4.0.0 (Tugas 17). Sebelum AI mengubah berkas
    // berisiko-tinggi (login/pembayaran/migrasi/API/unggah/DevOps) untuk PERTAMA kali per sesi, ia ditahan
    // sampai panduan terkait BENAR-BENAR dibuka (diperiksa dari catatan pembacaan Read, BUKAN klaim AI -
    // tak bisa di-bluff). Isi panduan TIDAK mengikat: bentrok dengan kode nyata -> kode MENANG (§4.3).
    // Batas 2x tahan/sesi (katup pelepas anti-upacara). DINYALAKAN setelah Tahap-7/F4 mengukur manfaat
    // (ADR-024 #6). BEDA dari Palang Rem (KEAMANAN, tolak aksi merusak): ini KEPATUHAN (buka panduan dulu).
    ensure: ensureRakGateHook,
    ringkas: 'Palang Rak',
    simulasi: '[SIMULASI] PASANG Palang Rak rak-gate ke .claude/settings.json',
    changed: (aksi) => `OK    Palang Rak (buka panduan dulu) ${aksi} (.claude/settings.json) - sebelum ubah berkas berisiko pertama kali per sesi, panduan terkait wajib dibuka (dicek dari catatan pembacaan, bukan klaim). Isi panduan tak mengikat: kode nyata MENANG (§4.3). Maks 2x tahan/sesi. Matikan: hapus blok PreToolUse rak-gate. Aktif setelah buka chat BARU.`,
    sudahAda: 'OK    Palang Rak sudah terpasang (tidak ada perubahan).',
  },
  {
    // "Lampu Hijau Plan Mode" (plan-mode-gate), default NYALA (ADR-021): saat PLAN MODE, aksi yang TERBUKTI
    // cuma-baca jalan TANPA dialog izin -> staff tak lagi refleks "klik izinkan" tanpa baca. Di luar plan
    // mode robot ini DIAM (perilaku sesi normal nol berubah). BUKAN bypass: ia memanggil risk-gate DULU,
    // jadi aksi berbahaya TAK PERNAH lolos lewat jalur ini, dan yang diizinkan cuma DAFTAR-PUTIH.
    // Berkas rahasia (.env/kunci) tak pernah auto-izin walau cuma dibaca.
    // 🔑 SENGAJA entri TERAKHIR: dipasang SESUDAH risk-gate supaya urutan grup di settings.json
    //    mencerminkan urutan pagar. Jangan pindahkan ke atas.
    ensure: ensurePlanModeGateHook,
    ringkas: 'Lampu Hijau Plan Mode',
    simulasi: '[SIMULASI] PASANG Lampu Hijau Plan Mode ke .claude/settings.json',
    changed: (aksi) => `OK    Lampu Hijau Plan Mode ${aksi} (.claude/settings.json) - saat plan mode, aksi cuma-baca jalan tanpa dialog izin; aksi berbahaya TETAP ditanya. Matikan: hapus blok PreToolUse plan-mode-gate. Aktif setelah buka chat BARU.`,
    sudahAda: 'OK    Lampu Hijau Plan Mode sudah terpasang (tidak ada perubahan).',
  },
]

// Pasang SATU hook. FAIL-SAFE: apa pun yang meledak -> lapor lalu lanjut (pemasangan TETAP berhasil).
function pasangHook(spec, projectRoot, dryRun) {
  try {
    if (dryRun) {
      console.log(spec.simulasi)
    } else {
      const r = spec.ensure(projectRoot)
      if (r.changed) console.log(spec.changed(r.reason === 'dibuat' ? 'dipasang' : 'digabung'))
      else if (r.reason === 'sudah-ada') console.log(spec.sudahAda)
      else if (r.reason === 'settings-rusak-atau-terkunci') console.log(`PERINGATAN: .claude/settings.json rusak/terkunci - ${spec.ringkas} dilewati (perbaiki JSON lalu jalankan setup ulang). Pemasangan TETAP berhasil.`)
    }
  } catch (e) {
    console.log(`PERINGATAN: Pasang ${spec.ringkas} dilewati: ${e.message} (pemasangan TETAP berhasil).`)
  }
}

export function installProjectHooks({ projectRoot, kitDir, dryRun, manifestState }) {
  // ---- Gabung daftar izin Claude Code (.claude/settings.local.json) ----
  // Deterministik (pertahankan entri pengguna + buang duplikat). Notifikasi popup = [TAHAP 2].
  try {
    const settingsDir = path.join(projectRoot, '.claude')
    const settingsTarget = path.join(settingsDir, 'settings.local.json')
    const settingsTemplate = path.join(kitDir, 'templates', 'settings.local.json.template')
    if (!fs.existsSync(settingsTemplate)) {
      console.log('PERINGATAN: templates/settings.local.json.template tidak ada - lewati gabung daftar izin.')
    } else if (dryRun) {
      console.log('[SIMULASI] GABUNG daftar izin ke .claude/settings.local.json')
    } else {
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true })
        console.log(`DIBUAT ${settingsDir}`)
      }
      const changed = mergeAllowList({ existingPath: settingsTarget, templatePath: settingsTemplate, outputPath: settingsTarget })
      console.log(changed ? 'OK    Daftar izin digabung (tutup + buka ulang VS Code untuk menerapkan).' : 'OK    Daftar izin sudah lengkap (tidak ada perubahan).')
      // CATATAN URUTAN (beda SENGAJA dari PS): di pemasang Node, gabung daftar izin ini bagian TULANG
      // PUNGGUNG Tahap 1 (deterministik) - jalan SEBELUM identitas git. Di PS ia di Pass 2 SETELAH git,
      // jadi jalur "batal di langkah git" PS melewatinya; di Node ia sudah jalan duluan (idempoten +
      // lebih benar: izin selalu terpasang). Header berkas menyatakan ini bagian Tahap 1.
      // (Pemberitahuan popup GUI dibuang 06-22 - pesan konsol di atas sudah cukup untuk semua mode.)
    }
  } catch (e) {
    console.log(`PERINGATAN: Gabung daftar izin dilewati: ${e.message} (pemasangan TETAP berhasil).`)
  }

  // ---- Pasang 4 hook .claude/settings.json (urutan tabel = urutan yang terlihat staff) ----
  for (const spec of HOOK_STEPS) pasangHook(spec, projectRoot, dryRun)

  // ---- Kimi Code + Codex: TAK ADA generator lagi (ADR-032) ----
  // Sejak kernel = AGENTS.md akar (acuan tunggal), Kimi Code & Codex membacanya NATIF tiap sesi -
  // tak perlu fotokopi (.kimi-code/AGENTS.md / blok Codex) lagi. (Palang berbasis hook hanya jalan di
  // Claude Code - kit tak punya mekanisme hook Kimi.) Yang di-generate cuma Cursor (.mdc khusus) di bawah.

  // ---- Buat berkas aturan Cursor (.cursor/rules/lintasai.mdc) - SELALU jalan ----
  // Cursor membaca .cursor/rules/*.mdc; frontmatter `alwaysApply: true` = ikut TIAP sesi chat
  // (dokumentasi resmi cursor.com/docs/context/rules, diverifikasi 2026-07-20). Cursor TIDAK punya
  // sistem hook -> yang sampai cuma TEKS aturannya; palang mesin tak berlaku di sana (jujur, jgn over-claim §2).
  // Sumber = kernel AGENTS.md akar. (Codex & Kimi baca AGENTS.md NATIF - tak perlu generator, ADR-032.)
  // FAIL-SAFE: gagal -> pemasangan TETAP berhasil.
  try {
    if (dryRun) {
      console.log('[SIMULASI] BUAT berkas aturan Cursor (.cursor/rules/lintasai.mdc)')
    } else {
      const cr = runCursorRulesGen({ repoRoot: projectRoot, write: true })
      if (!cr.present) {
        console.log('INFO  Berkas aturan Cursor dilewati (AGENTS.md tak ketemu).')
      } else if (cr.action === 'current') {
        console.log('OK    Berkas aturan Cursor sudah sinkron (.cursor/rules/lintasai.mdc).')
      } else {
        addToManifest(manifestState, cr.target, 'cursor_rules', 'generated: .cursor/rules/lintasai.mdc')
        console.log(`OK    Berkas aturan Cursor ${cr.action === 'created' ? 'dibuat' : 'diperbarui'} (.cursor/rules/lintasai.mdc) - aturan + peta rak sama seperti Claude. Catatan: palang otomatis lintasAI BELUM terpasang untuk Cursor, jadi di sana kamu sendiri yang menyetujui aksi berisiko.`)
      }
    }
  } catch (e) {
    console.log(`PERINGATAN: Buat berkas aturan Cursor dilewati: ${e.message} (pemasangan TETAP berhasil).`)
    console.log('        -> Pulihkan kapan saja: npx lintasai adapter-sync --write (verdict Cursor tampil di ringkasan akhir install).')
  }

  // Penanda: penjaga rahasia DILEWATI karena project belum "git init" saat langkah ini. Kalau nanti
  // setupGitIdentity() membuat git init di sesi yang SAMA, kita pasang ulang penjaga (tutup celah-bocor
  // .env di antara git-init dan update berikutnya).
  let secretHookDeferred = false
  // ---- Pasang penjaga rahasia pre-commit (.env / kunci API) ke .git/hooks/pre-commit ----
  // Idempoten + FAIL-OPEN (engine/install-secret-hook.mjs): cegah rahasia ter-commit DI LAPTOP (shift-left,
  // lapis-1). Lapis-2 = .github/workflows/secret-guard.yml (CI). PENTING, BUKAN jaminan menyeluruh:
  // cegah commit BARU (bukan riwayat lama); bisa dilewati darurat `git commit --no-verify`. Jalan di init
  // DAN update (update-kit menjalankan ulang setup-pola-b --force) -> idempoten, tak dobel.
  try {
    if (dryRun) {
      console.log('[SIMULASI] PASANG penjaga rahasia pre-commit ke .git/hooks/pre-commit')
    } else {
      const sh = installSecretHook(projectRoot)
      if (sh.installed) {
        addToManifest(manifestState, sh.hookPath, 'secret_hook', 'generated: .git/hooks/pre-commit')
        const note = sh.backupPath ? ` (hook lama dicadangkan ke ${path.basename(sh.backupPath)})` : ''
        console.log(`OK    Penjaga rahasia pre-commit terpasang${note} - file .env/kunci ditolak sebelum commit. Lewati darurat: git commit --no-verify.`)
      } else if (sh.reason === 'sudah-ada') {
        console.log('OK    Penjaga rahasia pre-commit sudah terpasang (tidak ada perubahan).')
      } else if (sh.reason === 'tak-ada-git') {
        secretHookDeferred = true
        console.log('INFO  Penjaga rahasia pre-commit dilewati (project belum "git init"). Akan dipasang otomatis kalau git init dibuat di langkah berikut.')
      }
    }
  } catch (e) {
    console.log(`PERINGATAN: Pasang penjaga rahasia dilewati: ${e.message} (pemasangan TETAP berhasil).`)
  }

  return { secretHookDeferred }
}
