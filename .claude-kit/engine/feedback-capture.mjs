#!/usr/bin/env node
// engine/feedback-capture.mjs - Hook "pengingat rekam pelajaran" (Stop hook, jalan di AKHIR giliran AI).
//
// KENAPA ADA: FASE A sudah memasang kemampuan "Rekam Pelajaran" lewat aturan §6.5 (auto-baca tiap sesi).
// Tapi aturan = imbauan yang terkubur di dokumen panjang -> di bawah beban kerja, AI bisa LUPA menimbang
// "ada pelajaran teknis frontier yang belum dijaga kit?" di akhir tugas. Berkas ini = rem-mesin LUNAK:
// dijalankan harness Claude Code lewat hook `Stop` (saat AI selesai merespons), lalu MENYUNTIK satu
// pengingat singkat ke konteks AI SUPAYA AI ingat menimbang §6.5. "LUNAK" = pengingat, BUKAN pemblokir.
//
// KENAPA `Stop` (BUKAN SessionEnd / PostToolUse) - diverifikasi ke dokumentasi resmi Claude Code 2026-07-17:
//   - `Stop`       : jalan saat AI selesai merespons (akhir giliran). BISA menyuntik `additionalContext`
//                    lewat exit 0 + JSON stdout TANPA memblokir. Punya `stop_hook_active` = penjaga anti-loop.
//   - `SessionEnd` : sesi SUDAH tutup -> tak bisa menyuntik konteks (sia-sia untuk pengingat).
//   - `PostToolUse`: reaktif setelah 1 tool -> tak cocok untuk "akhir giliran" (koreksi ADR-008).
//   => Event yang benar untuk "tepuk pundak di akhir kerja, non-blokir" = `Stop`.
//
// PAGAR (selaras ADR-006 + ADR-008 + §6.4 anti-self-evolve):
//   - HANYA MENEPUK PUNDAK: menyuntik teks pengingat. TIDAK menulis berkas project, TIDAK menilai, TIDAK
//     menskor, TIDAK mengubah apa pun. Keputusan mencatat tetap di AI (mengikuti aturan §6.5) -> owner
//     yang menimbang.
//   - FAIL-OPEN + NON-BLOKIR: process.exitCode SELALU 0 (exit 2 = MEMBLOKIR pesan -> PANTANG). Input rusak /
//     git tak ada / error apa pun -> DIAM (tak menyuntik), tak pernah mengunci kerja tim.
//   - ANTI-LOOP: kalau harness menandai `stop_hook_active: true` (hook ini sudah memicu lanjutan) -> DIAM.
//   - DETERMINISTIK: pemicu = SINYAL GIT nyata ("ada pekerjaan di sesi ini?"), BUKAN "AI merasa perlu".
//
// SEKALI PER RENTANG-KERJA (ADR-019, diet ~93% - dulu menyuntik TIAP `Stop` selama git kotor, padahal
// §6.5 sendiri bilang "sekali per TUGAS, bukan tiap pesan" - docs/feedback-capture.md sudah mencatat
// rencana "penanda per-sesi" ini sejak awal). State kecil di os.tmpdir() (engine/hook-session-state.mjs,
// pola sama engine/fact-gate.mjs) menandai "sudah diingatkan utk rentang-kerja INI" per session_id;
// dirty->clean (commit) mereset penanda, siap untuk tugas berikutnya. session_id kosong/tak terkirim ->
// throttle MATI TOTAL (balik ke perilaku lama, fail-safe - BUKAN bucket 'nosession' bersama: kalau
// dipakai, sesi A yang sudah diingatkan bisa membungkam sesi B yang belum pernah, arah SALAH).
//
// WIRING: dipasang OTOMATIS ke .claude/settings.json (grup `Stop`) saat init/update oleh
// engine/ensure-feedback-capture-hook.mjs (default NYALA - keputusan owner 2026-07-17, lihat ADR-008 addendum).
// Bentuk hook (matcher + command + timeout) = SSOT templates/hooks/feedback-capture.settings.example.json.
//
// BAHASA INDONESIA WAJIB: teks pengingat + pesan dipindai engine/output-lang-check.mjs (berkas ini di engine/*.mjs).
// Lagipula pengingat ke AI memang harus Indonesia (jadi "contoh hidup" mode bahasa §2.1).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readState, writeState } from './hook-session-state.mjs'

const STATE_NAMESPACE = 'feedback-capture'

// Pengingat yang disuntik ke konteks AI (via additionalContext). Sengaja RINGKAS demi hemat token
// (jalan tiap Stop saat ada kerja) - detail penuh sudah hidup di aturan §6.5 always-load, jangan diulang.
export const PENGINGAT_REKAM = [
  '[Pengingat lintasAI - rekam pelajaran §6.5]',
  'Sesi ini menyentuh kode. Kalau tugas teknis sudah SELESAI, timbang sekali: ada teknik/standar IT',
  'profesional yang BELUM dijaga kit (frontier)? Kalau ada, catat ke berkas LOKAL ter-redaksi',
  '(docs/pelajaran-lintasai/, gitignored) via §6.5 - SEKALI per tugas (bukan tiap giliran), bukan',
  'bisnis/kode mentah. Nol temuan itu sah. Kalau belum selesai / tak relevan, abaikan pengingat ini.',
].join('\n')

// Baca konteks hook dari stdin (JSON dari harness). FAIL-SAFE: apa pun yang aneh -> null.
// Cermin bacaKonteksHook engine/lang-reminder.mjs (isTTY-null cegah hang saat run manual; buang BOM; try/catch).
export function readHookInput() {
  try {
    if (process.stdin.isTTY) return null
    let mentah = fs.readFileSync(0, 'utf8')
    if (!mentah) return null
    // Buang BOM: sebagian pipa/shell Windows menyisipkan U+FEFF -> JSON.parse melempar. Inline SENGAJA
    // (bukan import engine/fs-text.mjs) supaya hook tetap jalan walau .claude-kit parsial/korup (LP-004).
    if (mentah.charCodeAt(0) === 0xfeff) mentah = mentah.slice(1)
    if (!mentah.trim()) return null
    return JSON.parse(mentah)
  } catch {
    return null
  }
}

// Sinyal git deterministik: "ada pekerjaan (perubahan kode) di working tree?" Fail-open (git tak ada /
// bukan repo / error -> false = DIAM). `git status --porcelain` sudah menghormati .gitignore, jadi berkas
// pelajaran (docs/pelajaran-lintasai/, gitignored) TIDAK ikut jadi sinyal - sinyal murni "kerja kode".
export function gitHasWork(cwd) {
  try {
    const r = spawnSync('git', ['status', '--porcelain'], {
      cwd: cwd || process.cwd(),
      encoding: 'utf8',
      timeout: 4000,
      windowsHide: true,
    })
    if (r.error || r.status !== 0 || typeof r.stdout !== 'string') return false
    return r.stdout.trim().length > 0
  } catch {
    return false
  }
}

// Otak keputusan (MURNI + deterministik -> gampang diuji unit tanpa git/stdin nyata).
// Return { inject, additionalContext?, remindedThisStreak }. Aturan:
//   - stop_hook_active true (hook sudah memicu lanjutan) -> DIAM (anti-loop), state TAK berubah.
//   - tak ada kerja (git bersih) -> DIAM + reset (remindedThisStreak:false, siap rentang-kerja berikutnya).
//   - ada kerja + SUDAH pernah diingatkan di rentang-kerja ini -> DIAM (tetap true, sekali per rentang-kerja).
//   - ada kerja + BELUM pernah diingatkan -> suntik + tandai true.
// remindedThisStreak opsional (default false) = perilaku identik versi lama kalau pemanggil tak mengirimnya
// (mis. tanpa session_id) - parameter baru TAK memecah kontrak lama.
export function decide({ hookInput, hasWork, remindedThisStreak = false }) {
  if (hookInput && hookInput.stop_hook_active === true) return { inject: false, remindedThisStreak }
  if (!hasWork) return { inject: false, remindedThisStreak: false }
  if (remindedThisStreak) return { inject: false, remindedThisStreak: true }
  return { inject: true, additionalContext: PENGINGAT_REKAM, remindedThisStreak: true }
}

// Bangun payload JSON kontrak `Stop` (hookSpecificOutput.additionalContext). Exit 0 + JSON ini = suntik
// pengingat ke konteks AI TANPA memblokir (kontrak resmi Claude Code, diverifikasi 2026-07-17).
export function buildStopOutput(additionalContext) {
  return { hookSpecificOutput: { hookEventName: 'Stop', additionalContext } }
}

function main() {
  // 4 langkah, semua fail-open: baca input -> tentukan cwd -> baca state (kalau ada session_id) ->
  // putuskan -> tulis state. Apa pun gagal -> diam + exit 0.
  const hookInput = readHookInput()
  const cwd = (hookInput && typeof hookInput.cwd === 'string' && hookInput.cwd) || process.cwd()
  const hasWork = gitHasWork(cwd)
  const sessionId = hookInput && typeof hookInput.session_id === 'string' ? hookInput.session_id : null
  // session_id kosong -> throttle MATI TOTAL (remindedThisStreak selalu false = perilaku identik versi
  // lama). SENGAJA bukan bucket 'nosession' bersama - lihat catatan di kepala berkas.
  const prevReminded = sessionId ? !!readState(STATE_NAMESPACE, sessionId, { remindedThisStreak: false }).remindedThisStreak : false
  const d = decide({ hookInput, hasWork, remindedThisStreak: prevReminded })
  if (d.inject) console.log(JSON.stringify(buildStopOutput(d.additionalContext)))
  if (sessionId) writeState(STATE_NAMESPACE, sessionId, { remindedThisStreak: d.remindedThisStreak })
  // process.exitCode (bukan process.exit) = aman dari stdout ke-potong. 0 = JANGAN blokir / JANGAN paksa lanjut.
  process.exitCode = 0
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
