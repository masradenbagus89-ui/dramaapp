#!/usr/bin/env node
// engine/ensure-plan-mode-gate-hook.mjs - Nyalakan "Lampu Hijau Plan Mode" (engine/plan-mode-gate.js) 1 langkah.
//
// KENAPA ADA: engine/plan-mode-gate.js ikut tersalin ke klien (.lintasai/engine/), TAPI hook hanya AKTIF
// kalau terdaftar di .claude/settings.json. Tanpa wiring ini, berkasnya ADA di klien tapi TAK PERNAH
// TERPANGGIL -> staff tetap dihujani dialog izin saat plan mode. Modul ini menggabungkannya DALAM 1 PERINTAH.
//
// DEFAULT NYALA (keputusan owner 2026-07-18, ADR-021): setup-pola-b memanggil ensurePlanModeGateHook()
// otomatis tiap init/update. Alasan boleh default-nyala: yang diizinkan otomatis HANYA daftar-putih cuma-baca,
// dan penilaian bahaya tetap dipegang risk-gate (dipanggil lebih dulu di dalam plan-mode-gate). Jadi hook ini
// MENGURANGI gesekan TANPA mengurangi pagar - beda jauh dari "bypass saat plan mode" yang DITOLAK (ADR-021).
//
// Mekanik pemasang (idempoten + fail-safe + tulis-atomik) = engine/hook-installer.mjs (dipakai bersama 6 gate).
import { makeHookInstaller, runHookCli } from './hook-installer.mjs'
import { NAMA_FOLDER_KIT } from './project-root.mjs'

// Bentuk hook = acuan tests/fixtures/hooks/plan-mode-gate.settings.example.json (repo kit) (matcher + command).
// Dikunci tes paritas tests/ensure-plan-mode-gate-hook.test.mjs (anti-drift).
export const PLAN_MODE_GATE_MATCHER = 'Read|Grep|Glob|NotebookRead|TodoWrite|WebSearch|Bash'
export const PLAN_MODE_GATE_HOOK_COMMAND = `node ${NAMA_FOLDER_KIT}/engine/plan-mode-gate.js`

const gate = makeHookInstaller({ marker: 'plan-mode-gate.js', matcher: PLAN_MODE_GATE_MATCHER, command: PLAN_MODE_GATE_HOOK_COMMAND })
export const hasPlanModeGateHook = gate.has
export const mergePlanModeGateHook = gate.merge
export const ensurePlanModeGateHook = gate.ensure

runHookCli(import.meta.url, {
  ensure: ensurePlanModeGateHook,
  friendlyName: 'Lampu Hijau Plan Mode',
  successLines: [
    'Efeknya: saat plan mode, aksi cuma-baca jalan tanpa dialog izin. Aksi berbahaya TETAP ditanya (Palang Rem tetap jalan).',
    'LANGKAH WAJIB: buka chat BARU - hook cuma dimuat saat sesi mulai, jadi sesi yang sedang jalan belum terpengaruh.',
    'Matikan kapan saja: hapus blok PreToolUse plan-mode-gate dari .claude/settings.json.',
  ],
})
