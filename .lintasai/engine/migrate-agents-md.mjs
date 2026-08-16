#!/usr/bin/env node
// engine/migrate-agents-md.mjs - Migrasi client LAMA ke tata-letak ADR-032 (cegah kehilangan data).
//
// MASALAH: sebelum ADR-032, `AGENTS.md` akar = milik CLIENT (override project: stack, opt-in mode) +
// kadang blok Codex generated (penanda LINTASAI-CODEX). Sejak ADR-032, `AGENTS.md` = KERNEL milik kit
// yang DI-REFRESH tiap update. Kalau update langsung menimpa AGENTS.md lama dengan kernel, kustomisasi
// client HILANG. Robot ini memindahkan bagian override client -> `AGENTS.local.md` LEBIH DULU.
//
// SIFAT: IDEMPOTEN + FAIL-SAFE. Tak melakukan apa-apa kalau (a) AGENTS.md sudah kernel baru, atau
// (b) AGENTS.local.md sudah ada (sudah pernah dimigrasi / client sudah pakai tata-letak baru).
// Tak pernah menghapus AGENTS.md di sini (penulisan kernel = tugas pemanggil, yang mencadangkan dulu).
import fs from 'node:fs'
import path from 'node:path'

// Penanda kernel BARU (ADR-032). Kalau AGENTS.md memuat ini = sudah tata-letak baru, tak perlu migrasi.
export const KERNEL_MARKER = 'Aturan Kerja lintasAI (Microkernel)'
// Penanda blok Codex generated LAMA (dulu ditempel di bawah override client). Dibuang saat migrasi.
export const CODEX_BLOCK_MARKER = '<!-- LINTASAI-CODEX v1'

// Deteksi AGENTS.md gaya-lama + pindahkan bagian override client ke AGENTS.local.md.
// Return { migrated:boolean, reason, overridePath?, hadCodexBlock? }.
export function migrateOldAgentsMd({ projectRoot } = {}) {
  const agentsPath = path.join(projectRoot, 'AGENTS.md')
  const overridePath = path.join(projectRoot, 'AGENTS.local.md')

  if (!fs.existsSync(agentsPath)) return { migrated: false, reason: 'tak-ada-agents-md' }

  let content = ''
  try { content = fs.readFileSync(agentsPath, 'utf8') } catch { return { migrated: false, reason: 'tak-terbaca' } }

  // Sudah kernel baru -> bukan client lama, tak perlu migrasi.
  if (content.includes(KERNEL_MARKER)) return { migrated: false, reason: 'sudah-kernel-baru' }

  // AGENTS.local.md sudah ada -> sudah dimigrasi / client sudah tata-letak baru. Jangan timpa kerjanya.
  if (fs.existsSync(overridePath)) return { migrated: false, reason: 'override-sudah-ada' }

  // AGENTS.md gaya-lama = override client (+ mungkin blok Codex generated di bawah). Ambil bagian
  // override saja (buang blok Codex yang memang artefak generated, bukan kerja client).
  const idx = content.indexOf(CODEX_BLOCK_MARKER)
  const overridePart = (idx >= 0 ? content.slice(0, idx) : content).replace(/\s+$/, '') + '\n'

  try {
    fs.writeFileSync(overridePath, overridePart, 'utf8')
  } catch (e) {
    return { migrated: false, reason: `gagal-tulis-override: ${e.message}` }
  }
  return { migrated: true, reason: 'override-dipindah', overridePath, hadCodexBlock: idx >= 0 }
}

// (Blok CLI uji-banding `if (isMain)` DICABUT v8.0.0 — migrasi ADR-032 dipanggil otomatis oleh
//  installer/updater via import, bukan sebagai perintah terpisah.)

// --- MIGRASI NAMA OVERRIDE: AGENTS.override.md -> AGENTS.local.md (2026-08-09) --------------------
//
// KENAPA WAJIB PINDAH NAMA: dokumentasi resmi OpenAI Codex menyatakan ia memeriksa `AGENTS.override.md`
// LEBIH DULU dan memuat PALING BANYAK SATU berkas per-folder. Karena installer lintasAI menerbitkan
// KEDUA berkas di akar project, client Codex memuat berkas override (isian checklist) dan MELEWATI
// kernel 166 baris — nol §1 Bahasa, nol §2 Anti-halusinasi, nol §5 Jangan-merusak, tanpa pesan error.
// Nama `AGENTS.local.md` tidak diklaim Codex, jadi kernel kembali termuat.
//
// PERTUKARAN YANG DISENGAJA (ditulis terang-terangan, jangan diklaim lebih): sesudah pindah, Codex
// TIDAK lagi memuat berkas override secara otomatis. Kernel yang memuat pagar keselamatan (§2/§5) jauh
// lebih penting daripada preferensi project — dan kernel kini membawa satu baris yang menyuruh AI
// membaca `AGENTS.local.md`, jadi instruksinya tetap sampai lewat jalur yang hidup.
//
// STUB DITOLAK sebagai alternatif: Codex hanya melewati berkas yang BENAR-BENAR kosong; stub
// ber-komentar tetap menutupi kernel. Karena itu berkas lama DIBUANG — dengan izin owner (§3.1),
// sesudah isinya disalin utuh dan dicadangkan.
export const NAMA_OVERRIDE_LAMA = 'AGENTS.override.md'
export const NAMA_OVERRIDE_BARU = 'AGENTS.local.md'

// Pindahkan isi override client ke nama baru. IDEMPOTEN + FAIL-SAFE.
// Return { migrated:boolean, reason, from?, to?, backup? }.
export function migrateOverrideToLocal({ projectRoot, backupStamp } = {}) {
  const lama = path.join(projectRoot, NAMA_OVERRIDE_LAMA)
  const baru = path.join(projectRoot, NAMA_OVERRIDE_BARU)

  if (!fs.existsSync(lama)) return { migrated: false, reason: 'tak-ada-berkas-lama' }

  let isi = ''
  try { isi = fs.readFileSync(lama, 'utf8') } catch (e) { return { migrated: false, reason: `tak-terbaca: ${e.message}` } }

  // Nama baru SUDAH ada = client sudah pernah migrasi lalu berkas lama muncul lagi (mis. update kit
  // lama dijalankan setelahnya). Berkas lama TETAP harus pergi — ia yang menutupi kernel — tapi isinya
  // JANGAN menimpa kerja client di berkas baru. Cadangkan lalu buang.
  const tabrakan = fs.existsSync(baru)

  // Cadangkan DULU, buang BELAKANGAN: kalau pencadangan gagal, berkas lama tetap utuh di tempatnya.
  let backup = null
  try {
    backup = `${lama}.backup-${backupStamp || 'migrasi'}`
    fs.copyFileSync(lama, backup)
  } catch { backup = null }
  if (!backup) return { migrated: false, reason: 'gagal-cadangkan' }

  if (!tabrakan) {
    try { fs.writeFileSync(baru, isi, 'utf8') } catch (e) { return { migrated: false, reason: `gagal-tulis-baru: ${e.message}` } }
  }

  try { fs.rmSync(lama, { force: true }) } catch (e) { return { migrated: false, reason: `gagal-buang-lama: ${e.message}` } }

  return { migrated: true, reason: tabrakan ? 'dua-duanya-ada' : 'dipindah', from: lama, to: baru, backup }
}
