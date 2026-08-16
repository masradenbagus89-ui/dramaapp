#!/usr/bin/env node
// engine/ensure-risk-gate-hook.mjs - Nyalakan "Palang Rem Otomatis" (engine/risk-gate.js) dengan 1 langkah.
//
// KENAPA ADA: engine/risk-gate.js (hook PreToolUse yang minta konfirmasi klik untuk aksi berisiko -
// hapus massal, DROP TABLE, force-push, sentuh .env) ikut tersalin ke klien (.lintasai/engine/), TAPI
// hook hanya AKTIF kalau terdaftar di .claude/settings.json. Modul ini menggabungkannya ke settings.json
// klien DALAM 1 PERINTAH (`npx lintasai enable-risk-gate`) + dipanggil setup-pola-b tiap init/update.
//
// DEFAULT NYALA sejak v1.61.0 (keputusan owner): Palang Rem MENGURANGI risiko AI (MEMBATASI aksi, bukan
// menambah otonomi), jadi default NYALA = selaras "keamanan dulu" - BEDA dari mode-OTONOMI (co-pilot/
// auto-confirm) yang TETAP default MATI (opt-in). Mudah dimatikan: hapus blok PreToolUse dari settings.json.
//
// Mekanik pemasang (idempoten + fail-safe + tulis-atomik) = engine/hook-installer.mjs (dipakai bersama 6 gate).
import { makeHookInstaller, runHookCli } from './hook-installer.mjs'
import { NAMA_FOLDER_KIT } from './project-root.mjs'

// Bentuk hook = acuan tests/fixtures/hooks/risk-gate.settings.example.json (repo kit) (matcher + command). Dikunci tes
// paritas tests/ensure-risk-gate-hook.test.mjs (anti-drift). command relatif '<folder-kit>/...' (Claude
// Code menjalankan hook dari akar project, jadi path relatif benar).
export const RISK_GATE_MATCHER = 'Bash|Edit|Write|MultiEdit'
export const RISK_GATE_HOOK_COMMAND = `node ${NAMA_FOLDER_KIT}/engine/risk-gate.js`

const gate = makeHookInstaller({ marker: 'risk-gate.js', matcher: RISK_GATE_MATCHER, command: RISK_GATE_HOOK_COMMAND })
export const hasRiskGateHook = gate.has
export const mergeRiskGateHook = gate.merge
export const ensureRiskGateHook = gate.ensure

runHookCli(import.meta.url, {
  ensure: ensureRiskGateHook,
  friendlyName: 'Palang Rem risk-gate',
  successLines: [
    'LANGKAH WAJIB: buka chat BARU - hook cuma dimuat saat sesi mulai, jadi sesi yang sedang jalan BELUM terlindungi.',
    'Uji-jalan di chat baru: minta AI menjalankan `git push --force` di branch buangan. Muncul dialog Setujui/Tolak = palang hidup.',
    'Matikan kapan saja: hapus blok PreToolUse risk-gate dari .claude/settings.json.',
  ],
})
