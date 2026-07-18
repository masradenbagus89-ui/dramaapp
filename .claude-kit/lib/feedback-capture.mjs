#!/usr/bin/env node
// lib/feedback-capture.mjs - Hook "pengingat rekam pelajaran" (Stop hook, jalan di AKHIR giliran AI).
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
//   - HANYA MENEPUK PUNDAK: menyuntik teks pengingat. TIDAK menulis berkas, TIDAK menilai, TIDAK menskor,
//     TIDAK mengubah apa pun. Keputusan mencatat tetap di AI (mengikuti aturan §6.5) -> owner yang menimbang.
//   - FAIL-OPEN + NON-BLOKIR: process.exitCode SELALU 0 (exit 2 = MEMBLOKIR pesan -> PANTANG). Input rusak /
//     git tak ada / error apa pun -> DIAM (tak menyuntik), tak pernah mengunci kerja tim.
//   - ANTI-LOOP: kalau harness menandai `stop_hook_active: true` (hook ini sudah memicu lanjutan) -> DIAM.
//   - DETERMINISTIK: pemicu = SINYAL GIT nyata ("ada pekerjaan di sesi ini?"), BUKAN "AI merasa perlu".
//   - DE-DUP "sekali per tugas" diserahkan ke aturan §6.5 (AI mencatat SEKALI per tugas, bukan tiap giliran) -
//     simetris filosofi lang-reminder yang juga jalan tiap giliran; hook cuma mengingatkan, AI yang menyaring.
//
// WIRING: dipasang OTOMATIS ke .claude/settings.json (grup `Stop`) saat init/update oleh
// lib/ensure-feedback-capture-hook.mjs (default NYALA - keputusan owner 2026-07-17, lihat ADR-008 addendum).
// Bentuk hook (matcher + command + timeout) = SSOT templates/hooks/feedback-capture.settings.example.json.
//
// BAHASA INDONESIA WAJIB: teks pengingat + pesan dipindai lib/output-lang-check.mjs (berkas ini di lib/*.mjs).
// Lagipula pengingat ke AI memang harus Indonesia (jadi "contoh hidup" mode bahasa §2.1).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

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
// Cermin bacaKonteksHook lib/lang-reminder.mjs (isTTY-null cegah hang saat run manual; buang BOM; try/catch).
export function readHookInput() {
  try {
    if (process.stdin.isTTY) return null
    let mentah = fs.readFileSync(0, 'utf8')
    if (!mentah) return null
    // Buang BOM: sebagian pipa/shell Windows menyisipkan U+FEFF -> JSON.parse melempar. Inline SENGAJA
    // (bukan import lib/fs-text.mjs) supaya hook tetap jalan walau .claude-kit parsial/korup (LP-004).
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
// Return { inject, additionalContext }. Aturan:
//   - stop_hook_active true (hook sudah memicu lanjutan) -> DIAM (anti-loop).
//   - ada kerja (sinyal git) -> suntik pengingat.
//   - selain itu -> DIAM.
export function decide({ hookInput, hasWork }) {
  if (hookInput && hookInput.stop_hook_active === true) return { inject: false }
  if (hasWork) return { inject: true, additionalContext: PENGINGAT_REKAM }
  return { inject: false }
}

// Bangun payload JSON kontrak `Stop` (hookSpecificOutput.additionalContext). Exit 0 + JSON ini = suntik
// pengingat ke konteks AI TANPA memblokir (kontrak resmi Claude Code, diverifikasi 2026-07-17).
export function buildStopOutput(additionalContext) {
  return { hookSpecificOutput: { hookEventName: 'Stop', additionalContext } }
}

function main() {
  // 3 langkah, semua fail-open: baca input -> tentukan cwd -> putuskan. Apa pun gagal -> diam + exit 0.
  const hookInput = readHookInput()
  const cwd = (hookInput && typeof hookInput.cwd === 'string' && hookInput.cwd) || process.cwd()
  const hasWork = gitHasWork(cwd)
  const d = decide({ hookInput, hasWork })
  if (d.inject) console.log(JSON.stringify(buildStopOutput(d.additionalContext)))
  // process.exitCode (bukan process.exit) = aman dari stdout ke-potong. 0 = JANGAN blokir / JANGAN paksa lanjut.
  process.exitCode = 0
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
