// engine/setup-hooks.mjs - Langkah "pasang hook + wiring project" pemasang lintasAI (Pola B), diekstrak dari
// setup-pola-b.mjs main() (refactor hemat-token, TANPA mengubah fungsi). Semua langkah di sini = TULANG
// PUNGGUNG deterministik yang jalan SETELAH berkas ter-deploy: gabung daftar izin Claude Code, pasang hook
// pengingat bahasa, Palang Rem risk-gate, pengingat rekam-pelajaran, berkas aturan Kimi, penjaga rahasia
// pre-commit. TIDAK ada process.exit / tak menyentuh KitDir (aman dipisah). Tiap langkah FAIL-SAFE
// (try/catch -> pemasangan TETAP berhasil). String output + urutan SENGAJA byte-identik dengan versi lama
// (dikunci tests/setup-hooks-lock.test.mjs + setup-pola-b-write.test.mjs).
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
import { ensureFeedbackCaptureHook } from './ensure-feedback-capture-hook.mjs'
import { runKimiAgentsGen, runCursorRulesGen, runCodexAgentsGen } from './adapter-rules-gen.mjs'
import { installSecretHook } from './install-secret-hook.mjs'

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

  // ---- Pasang hook "pengingat Bahasa Indonesia" ke .claude/settings.json ----
  // Idempoten + fail-safe (engine/lang-hook-wiring.mjs). Non-blokir: cuma menambah pengingat bahasa ke
  // konteks AI tiap pesan. Jalan di init DAN update (update-kit menjalankan ulang setup-pola-b --force).
  try {
    if (dryRun) {
      console.log('[SIMULASI] PASANG hook pengingat Bahasa Indonesia ke .claude/settings.json')
    } else {
      const r = ensureLangHook(projectRoot)
      if (r.changed) console.log(`OK    Hook pengingat Bahasa Indonesia ${r.reason === 'dibuat' ? 'dipasang' : 'digabung'} (.claude/settings.json) - tutup + buka ulang VS Code untuk menerapkan.`)
      else if (r.reason === 'sudah-ada') console.log('OK    Hook pengingat Bahasa Indonesia sudah terpasang (tidak ada perubahan).')
      else if (r.reason === 'settings-rusak-atau-terkunci') console.log('PERINGATAN: .claude/settings.json rusak/terkunci - hook bahasa dilewati (perbaiki JSON lalu jalankan setup ulang). Pemasangan TETAP berhasil.')
    }
  } catch (e) {
    console.log(`PERINGATAN: Pasang hook bahasa dilewati: ${e.message} (pemasangan TETAP berhasil).`)
  }

  // ---- Pasang "Palang Rem Otomatis" (risk-gate) ke .claude/settings.json (default NYALA sejak v1.61.0) ----
  // Idempoten + FAIL-SAFE (engine/ensure-risk-gate-hook.mjs): minta konfirmasi klik sebelum aksi BENAR-BENAR
  // berbahaya (rm -rf, DROP/DELETE tanpa WHERE, push --force, sentuh .env, format disk) + blokir menembus-
  // pagar. Mode "ask" = kerja normal TAK terganggu (hanya aksi bahaya yang ditanya). BEDA dari mode-otonomi
  // (§4.12 default mati): Palang Rem MENGURANGI risiko, jadi default NYALA = selaras "keamanan dulu" (tie-breaker #1).
  // Sangat mudah dimatikan: hapus blok PreToolUse risk-gate dari .claude/settings.json.
  try {
    if (dryRun) {
      console.log('[SIMULASI] PASANG Palang Rem risk-gate ke .claude/settings.json')
    } else {
      const rg = ensureRiskGateHook(projectRoot)
      if (rg.changed) console.log(`OK    Palang Rem aksi-berbahaya ${rg.reason === 'dibuat' ? 'dipasang' : 'digabung'} (.claude/settings.json) - minta konfirmasi sebelum aksi merusak. Matikan: hapus blok PreToolUse risk-gate. Aktif setelah buka chat BARU.`)
      else if (rg.reason === 'sudah-ada') console.log('OK    Palang Rem aksi-berbahaya sudah terpasang (tidak ada perubahan).')
      else if (rg.reason === 'settings-rusak-atau-terkunci') console.log('PERINGATAN: .claude/settings.json rusak/terkunci - Palang Rem dilewati (perbaiki JSON lalu jalankan setup ulang). Pemasangan TETAP berhasil.')
    }
  } catch (e) {
    console.log(`PERINGATAN: Pasang Palang Rem dilewati: ${e.message} (pemasangan TETAP berhasil).`)
  }

  // ---- Pasang "Palang Rak" (rak-gate) ke .claude/settings.json (default NYALA sejak v4.0.0 / Tugas 17) ----
  // Idempoten + FAIL-SAFE (engine/ensure-rak-gate-hook.mjs): sebelum AI mengubah berkas berisiko-tinggi
  // (login/pembayaran/migrasi/API/unggah/DevOps) untuk PERTAMA kali per sesi, ia ditahan sampai panduan
  // terkait BENAR-BENAR dibuka (diperiksa dari catatan pembacaan Read, BUKAN klaim AI - tak bisa di-bluff).
  // Isi panduan TIDAK mengikat: bentrok dengan kode nyata -> kode MENANG (§4.17). Batas 2x tahan/sesi
  // (katup pelepas anti-upacara). DEFAULT MATI sampai v3.x; DINYALAKAN setelah Tahap-7/F4 mengukur manfaat
  // (ADR-024 #6): keputusan AI terbukti BERUBAH sesudah membaca rak + alasan-menyimpang berbukti, friksi nol.
  // BEDA dari Palang Rem (risk-gate=KEAMANAN, tolak aksi merusak): Palang Rak=KEPATUHAN (buka panduan dulu).
  // Jalan di init DAN update (update-kit menjalankan ulang setup-pola-b --force -> idempoten). Matikan:
  // hapus blok PreToolUse rak-gate. Paritas Kimi lewat KIMI_HOOKS (opt-in `npx lintasai enable-kimi-hooks`).
  try {
    if (dryRun) {
      console.log('[SIMULASI] PASANG Palang Rak rak-gate ke .claude/settings.json')
    } else {
      const rk = ensureRakGateHook(projectRoot)
      if (rk.changed) console.log(`OK    Palang Rak (buka panduan dulu) ${rk.reason === 'dibuat' ? 'dipasang' : 'digabung'} (.claude/settings.json) - sebelum ubah berkas berisiko pertama kali per sesi, panduan terkait wajib dibuka (dicek dari catatan pembacaan, bukan klaim). Isi panduan tak mengikat: kode nyata MENANG (§4.17). Maks 2x tahan/sesi. Matikan: hapus blok PreToolUse rak-gate. Aktif setelah buka chat BARU.`)
      else if (rk.reason === 'sudah-ada') console.log('OK    Palang Rak sudah terpasang (tidak ada perubahan).')
      else if (rk.reason === 'settings-rusak-atau-terkunci') console.log('PERINGATAN: .claude/settings.json rusak/terkunci - Palang Rak dilewati (perbaiki JSON lalu jalankan setup ulang). Pemasangan TETAP berhasil.')
    }
  } catch (e) {
    console.log(`PERINGATAN: Pasang Palang Rak dilewati: ${e.message} (pemasangan TETAP berhasil).`)
  }

  // ---- Pasang "Lampu Hijau Plan Mode" (plan-mode-gate) ke .claude/settings.json (default NYALA, ADR-021) ----
  // Idempoten + FAIL-SAFE (engine/ensure-plan-mode-gate-hook.mjs): saat PLAN MODE, aksi yang TERBUKTI cuma-baca
  // (baca berkas, cari teks, git status/log/diff, npm test) jalan TANPA dialog izin -> staff tak lagi refleks
  // "klik izinkan" tanpa baca. Di luar plan mode robot ini DIAM (perilaku sesi normal nol berubah).
  // BUKAN bypass: ia memanggil risk-gate DULU, jadi aksi berbahaya TAK PERNAH bisa lolos lewat jalur ini, dan
  // yang diizinkan cuma DAFTAR-PUTIH (yang tak dikenali -> tetap ditanya). Berkas rahasia (.env/kunci) tak
  // pernah auto-izin walau cuma dibaca. Permintaan awal "izinkan APA PUN saat plan mode" DITOLAK - ADR-021.
  // Sengaja dipasang SESUDAH risk-gate supaya urutan grup di settings.json mencerminkan urutan pagar.
  // Matikan: hapus blok PreToolUse plan-mode-gate dari .claude/settings.json.
  try {
    if (dryRun) {
      console.log('[SIMULASI] PASANG Lampu Hijau Plan Mode ke .claude/settings.json')
    } else {
      const pg = ensurePlanModeGateHook(projectRoot)
      if (pg.changed) console.log(`OK    Lampu Hijau Plan Mode ${pg.reason === 'dibuat' ? 'dipasang' : 'digabung'} (.claude/settings.json) - saat plan mode, aksi cuma-baca jalan tanpa dialog izin; aksi berbahaya TETAP ditanya. Matikan: hapus blok PreToolUse plan-mode-gate. Aktif setelah buka chat BARU.`)
      else if (pg.reason === 'sudah-ada') console.log('OK    Lampu Hijau Plan Mode sudah terpasang (tidak ada perubahan).')
      else if (pg.reason === 'settings-rusak-atau-terkunci') console.log('PERINGATAN: .claude/settings.json rusak/terkunci - Lampu Hijau Plan Mode dilewati (perbaiki JSON lalu jalankan setup ulang). Pemasangan TETAP berhasil.')
    }
  } catch (e) {
    console.log(`PERINGATAN: Pasang Lampu Hijau Plan Mode dilewati: ${e.message} (pemasangan TETAP berhasil).`)
  }

  // ---- Pasang "Pengingat rekam pelajaran" (feedback-capture) ke .claude/settings.json (default NYALA 2026-07-17) ----
  // Idempoten + FAIL-SAFE (engine/ensure-feedback-capture-hook.mjs): hook Stop yang mengingatkan AI menimbang §6.5
  // (rekam pelajaran teknis frontier ke berkas LOKAL ter-redaksi) di akhir tugas yang menyentuh kode. NON-BLOKIR
  // (exit 0 selalu, cuma menepuk pundak) - profil sama dengan lang-reminder yang juga default NYALA. BEDA dari
  // hook-penegak-checklist yang ADR-008 tunda (yang itu bisa MENAHAN "selesai"). Matikan: hapus blok Stop feedback-capture.
  try {
    if (dryRun) {
      console.log('[SIMULASI] PASANG Pengingat rekam pelajaran (feedback-capture) ke .claude/settings.json')
    } else {
      const fc = ensureFeedbackCaptureHook(projectRoot)
      if (fc.changed) console.log(`OK    Pengingat rekam pelajaran ${fc.reason === 'dibuat' ? 'dipasang' : 'digabung'} (.claude/settings.json) - AI diingatkan menimbang §6.5 di akhir tugas. Cuma pengingat, tak memaksa. Aktif setelah buka chat BARU.`)
      else if (fc.reason === 'sudah-ada') console.log('OK    Pengingat rekam pelajaran sudah terpasang (tidak ada perubahan).')
      else if (fc.reason === 'settings-rusak-atau-terkunci') console.log('PERINGATAN: .claude/settings.json rusak/terkunci - Pengingat rekam pelajaran dilewati (perbaiki JSON lalu jalankan setup ulang). Pemasangan TETAP berhasil.')
    }
  } catch (e) {
    console.log(`PERINGATAN: Pasang Pengingat rekam pelajaran dilewati: ${e.message} (pemasangan TETAP berhasil).`)
  }

  // ---- Buat berkas aturan Kimi Code (.kimi-code/AGENTS.md) - SELALU jalan (init DAN update) ----
  // Kimi Code CLI membaca AGENTS.md NATIF tiap sesi (bukan CLAUDE.md/@import). Generator menyalin PENUH
  // .claude-kit/CLAUDE_universal_v1.md ke .kimi-code/AGENTS.md -> kualitas kit di Kimi IDENTIK dengan di
  // Claude (tak ada aturan yang tertinggal). HARMLESS untuk pengguna Claude-only: Claude TIDAK membaca
  // folder .kimi-code/, dan berkasnya gitignored. Artefak GENERATED (regenerate tiap update; deterministik).
  // FAIL-SAFE: gagal -> pemasangan TETAP berhasil. (Pagar keamanan Kimi = OPT-IN: `npx lintasai enable-kimi-hooks`.)
  try {
    if (dryRun) {
      console.log('[SIMULASI] BUAT berkas aturan Kimi Code (.kimi-code/AGENTS.md)')
    } else {
      const ka = runKimiAgentsGen({ repoRoot: projectRoot, write: true })
      if (!ka.present) {
        console.log('INFO  Berkas aturan Kimi dilewati (CLAUDE_universal_v1.md tak ketemu).')
      } else if (ka.action === 'current') {
        console.log('OK    Berkas aturan Kimi Code sudah sinkron (.kimi-code/AGENTS.md).')
      } else {
        addToManifest(manifestState, ka.target, 'kimi_agents', 'generated: .kimi-code/AGENTS.md')
        console.log(`OK    Berkas aturan Kimi Code ${ka.action === 'created' ? 'dibuat' : 'diperbarui'} (.kimi-code/AGENTS.md) - kit jalan di Kimi Code juga, aturan sama seperti Claude. Pagar keamanan Kimi (opsional): npx lintasai enable-kimi-hooks.`)
      }
    }
  } catch (e) {
    console.log(`PERINGATAN: Buat berkas aturan Kimi dilewati: ${e.message} (pemasangan TETAP berhasil).`)
  }

  // ---- Buat berkas aturan Cursor (.cursor/rules/lintasai.mdc) + status Codex - SELALU jalan ----
  // Cursor membaca .cursor/rules/*.mdc; frontmatter `alwaysApply: true` = ikut TIAP sesi chat
  // (dokumentasi resmi cursor.com/docs/context/rules, diverifikasi 2026-07-20). Cursor & Codex TIDAK
  // punya sistem hook -> yang sampai cuma TEKS aturannya; palang mesin tak berlaku di sana. Itu
  // dikatakan terus terang di berkasnya sendiri + di sini, JANGAN di-over-claim (§8.2).
  // Codex: AGENTS.md akar dibaca otomatis, TAPI instruksi project dibatasi 32 KiB
  // (`project_doc_max_bytes`). Selama aturan belum muat, penulisan DITAHAN dan berkas client tidak
  // disentuh - aturan terpotong diam-diam lebih berbahaya daripada aturan yang jelas belum terpasang.
  // FAIL-SAFE: gagal -> pemasangan TETAP berhasil.
  try {
    if (dryRun) {
      console.log('[SIMULASI] BUAT berkas aturan Cursor (.cursor/rules/lintasai.mdc) + cek muat-tidaknya aturan untuk Codex')
    } else {
      const cr = runCursorRulesGen({ repoRoot: projectRoot, write: true })
      if (!cr.present) {
        console.log('INFO  Berkas aturan Cursor dilewati (CLAUDE_universal_v1.md tak ketemu).')
      } else if (cr.action === 'current') {
        console.log('OK    Berkas aturan Cursor sudah sinkron (.cursor/rules/lintasai.mdc).')
      } else {
        addToManifest(manifestState, cr.target, 'cursor_rules', 'generated: .cursor/rules/lintasai.mdc')
        console.log(`OK    Berkas aturan Cursor ${cr.action === 'created' ? 'dibuat' : 'diperbarui'} (.cursor/rules/lintasai.mdc) - aturan sama seperti Claude. Catatan: Cursor tak punya hook, jadi palang otomatis lintasAI tidak berlaku di sana.`)
      }

      const cx = runCodexAgentsGen({ repoRoot: projectRoot, write: true })
      if (cx.present && cx.fits === false) {
        const lebih = (cx.bytes - cx.capBytes).toLocaleString('en-US')
        console.log(`INFO  Codex: aturan BELUM dipasang ke AGENTS.md - ukurannya ${cx.bytes.toLocaleString('en-US')} byte, melebihi batas Codex ${cx.capBytes.toLocaleString('en-US')} byte (kelebihan ${lebih}). AGENTS.md-mu TIDAK disentuh. Codex tetap membaca aturan khusus project di AGENTS.md seperti biasa.`)
      } else if (cx.present && cx.action && cx.action !== 'current') {
        addToManifest(manifestState, cx.target, 'codex_agents', 'generated: blok aturan di AGENTS.md')
        console.log(`OK    Codex: blok aturan ${cx.action === 'created' ? 'dibuat' : 'diperbarui'} di AGENTS.md (muat di bawah batas ${cx.capBytes.toLocaleString('en-US')} byte).`)
      }
    }
  } catch (e) {
    console.log(`PERINGATAN: Buat berkas aturan Cursor/Codex dilewati: ${e.message} (pemasangan TETAP berhasil).`)
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
