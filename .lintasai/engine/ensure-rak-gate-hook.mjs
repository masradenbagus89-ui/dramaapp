#!/usr/bin/env node
// engine/ensure-rak-gate-hook.mjs - Nyalakan "Palang Rak" (engine/rak-gate.mjs) dengan 1 perintah.
//
// KENAPA ADA: robot hanya AKTIF kalau terdaftar di .claude/settings.json. Tanpa modul ini,
// engine/rak-gate.mjs dikirim ke tiap klien dalam keadaan mati total, dan pemeriksa "perkakas terkirim
// tanpa gagang" (<repo>/tools/tool-reach-check.mjs, alat maintainer) akan MERAH.
//
// MATCHER-nya WAJIB menyertakan `Read`. Palang Rak bekerja atas BUKTI tanda-terima
// bacaan - tanpa `Read` di matcher, hook tak pernah melihat pembacaan rak terjadi, sehingga satu-satunya
// keluaran yang mungkin adalah "blokir selamanya". `Read` di sini murni PEREKAM (selalu exit 0), bukan
// penyaring: tak ada satu pun jalur di rak-gate.mjs yang memblokir `Read`.
//
// `Bash` DITAMBAHKAN 2026-07-25 dengan alasan yang sama - ia PEREKAM, bukan penyaring: menjalankan
// `node .../rak-cli.mjs` dicatat sebagai konsultasi indeks (rak-gate.mjs butir 1b), supaya jalan keluar
// sah tak lagi menuntut `Read skills/registry.json` (~20 KB, dan terus membebani konteks tiap giliran
// berikutnya). TAK ADA satu pun jalur di rak-gate.mjs yang memblokir `Bash`.
// ONGKOS JUJUR (terukur 2026-07-25): ~54 ms per panggilan Bash untuk menjalankan hook ini. Bash memang
// SUDAH melewati hook lain (risk-gate matcher `Bash|Edit|Write|MultiEdit`), jadi ini tambahan - bukan
// yang pertama. Mau mencabutnya: buang `|Bash` dari baris di bawah (rak-gate.mjs tetap aman - cabang
// Bash-nya cuma jadi kode mati yang selalu 'allow').
//
// Mekanik pemasang (idempoten + fail-safe + tulis-atomik) = engine/hook-installer.mjs (dipakai bersama gate lain).
import { makeHookInstaller, runHookCli } from './hook-installer.mjs'
import { NAMA_FOLDER_KIT } from './project-root.mjs'

export const RAK_GATE_MATCHER = 'Read|Edit|Write|MultiEdit|Bash'
export const RAK_GATE_HOOK_COMMAND = `node ${NAMA_FOLDER_KIT}/engine/rak-gate.mjs`

const gate = makeHookInstaller({ marker: 'rak-gate.mjs', matcher: RAK_GATE_MATCHER, command: RAK_GATE_HOOK_COMMAND })
export const buildRakGateHookGroup = gate.buildGroup
export const hasRakGateHook = gate.has
export const mergeRakGateHook = gate.merge
export const ensureRakGateHook = gate.ensure

runHookCli(import.meta.url, {
  ensure: ensureRakGateHook,
  friendlyName: 'Palang Rak',
  successLines: [
    'Apa efeknya: sebelum AI mengubah berkas PENTING (login, pembayaran, migrasi, API, unggah, DevOps/infra)',
    '  untuk pertama kali dalam satu sesi, ia ditahan sampai panduan terkait BENAR-BENAR dibuka.',
    '  Yang diperiksa = catatan pembacaan nyata, BUKAN klaim AI - jadi tak bisa dilewati dengan kata-kata.',
    '  Isi panduan TIDAK mengikat: kalau bentrok dengan kode nyata, kode yang menang (§4.3).',
    '  Batas: maksimal 2x menahan per sesi, supaya tak jadi upacara.',
    'LANGKAH WAJIB: buka chat BARU (hook dimuat saat sesi mulai) lalu uji-jalan.',
    'Matikan kapan saja: hapus blok PreToolUse rak-gate dari .claude/settings.json.',
  ],
})
