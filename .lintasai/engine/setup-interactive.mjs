#!/usr/bin/env node
// engine/setup-interactive.mjs - Penolong MURNI untuk bagian tanya-jawab (Tahap 2) pemasang Node.
//
// GELOMBANG 4/5 (ADR-004): bagian interaktif pemasang
// (popup-klik) butuh beberapa keputusan kecil yang BISA diuji tanpa layar/popup - mis. cek format
// email benar, deteksi AGENTS.md milik lintasAI atau bukan, urutan opsi popup (yang AMAN di posisi 1),
// cari lokasi VS Code, susun panduan simpan-ke-git. Fungsi-fungsi itu DIPISAH ke sini supaya:
//   1. Bisa diuji deterministik (tes node:test).
//   2. Orkestrator (setup-pola-b.mjs) cuma jadi "lem" tipis: panggil jawaban-aman + fungsi murni ini.
//
// Bahasa output WAJIB non-programmer Indonesia (ADR-004 #3).
import fs from 'node:fs'
import path from 'node:path'
import { NAMA_FOLDER_KIT } from './project-root.mjs'

// Kalimat pembuka yang disalin ke papan-tempel saat membuka VS Code.
export const STARTER_PROMPT = 'halo aku staff baru pertama kali clone project ini, guide aku step-by-step'

// === Validasi email git ==========================================================================
// Batas 254 huruf (RFC 5321) + tolak spasi/karakter-kendali/@
// ganda. Karakter-kendali (\x00-\x1F + \x7F) ditolak supaya tak ada NUL yang memotong string di
// hilir (nilai git config user.email bisa korup diam-diam - relevan keamanan).
// eslint-disable-next-line no-control-regex -- karakter-kendali memang SENGAJA dicocokkan untuk DITOLAK (lihat alasan keamanan di atas)
const GIT_EMAIL_RE = /^[^\s@\x00-\x1F\x7F]+@[^\s@\x00-\x1F\x7F]+\.[^\s@\x00-\x1F\x7F]+$/

// Apakah email berbentuk sah untuk dipasang ke git config? (true/false)
export function isValidGitEmail(email) {
  if (typeof email !== 'string') return false
  const e = email.trim()
  if (e.length === 0 || e.length > 254) return false
  // Tolak awalan '-' (PERKETAT dari PS): `git config user.email -x@y.com` bisa disalahartikan git
  // sebagai opsi, bukan nilai -> identitas gagal di-set diam-diam. Tak ada email sah berawal '-'.
  if (e.startsWith('-')) return false
  return GIT_EMAIL_RE.test(e)
}

// Ambil bagian sebelum '@' sebagai nama. Input WAJIB email sah.
export function deriveGitName(email) {
  return String(email).trim().split('@')[0]
}

// === Deteksi format AGENTS.md ====================================================================
// 'lintasai' = punya penanda kit (aman di-Lewati); 'foreign' =
// berkas dari alat lain (kalau di-Lewati, aturannya ikut nyetir AI + bisa bentrok aturan tim).
export function detectAgentsFormat(content) {
  // Penanda: header override Pola B · marker kernel ADR-032 · path folder kit (mencakup
  // varian legacy '.claude-kit/CLIENT.md' dari client lama tanpa perlu disebut terpisah).
  //
  // DUA nama SENGAJA diperiksa: '.claude-kit/' HARDCODE PERMANEN karena berkas milik client LAMA
  // memuat nama itu dan tak pernah berubah sendiri — kalau dibuang, AGENTS.md client lama salah
  // divonis 'foreign' lalu diperlakukan sebagai berkas alat asing. NAMA_FOLDER_KIT menangani client
  // baru. Keduanya wajib hidup berdampingan; jangan "rapikan" jadi satu.
  if (typeof content === 'string' &&
      (content.includes('standar tim IT (Pola B)') || content.includes('Aturan Kerja lintasAI') ||
       content.includes('.claude-kit/') || content.includes(`${NAMA_FOLDER_KIT}/`))) {
    return 'lintasai'
  }
  return 'foreign'
}

// Susun opsi popup pilihan AGENTS.md. Sumber-tunggal: label + aksi DIPASANGKAN per opsi (cegah
// melenceng antara popup & konsol). Opsi REKOMENDASI / paling-AMAN SELALU di INDEKS 0:
//   - format lintasAI  -> aman di-Lewati (berkas lama tak diubah).
//   - format asing      -> aman di-Cadangkan-lalu-ganti (berkas lama disimpan + bisa dibalik).
export function buildAgentsMdOptions(isLintasai) {
  if (isLintasai) {
    return [
      { label: 'Lewati - jangan sentuh (rekomendasi, paling aman: berkas lama tidak diubah)', action: 'skip' },
      { label: 'Cadangkan lalu ganti (berkas lama disimpan dulu)', action: 'backup-replace' },
      { label: 'Lihat beda dulu (bandingkan isi berkas)', action: 'diff' },
    ]
  }
  return [
    { label: 'Cadangkan lalu ganti - berkas lama dicadangkan (rekomendasi: aman, berkas lama disimpan + bisa dibalik)', action: 'backup-replace' },
    { label: 'Lihat beda dulu (lihat isi berkas lama)', action: 'diff' },
    { label: 'Lewati - pertahankan berkas asing (HATI-HATI, bisa bentrok aturan tim)', action: 'skip' },
  ]
}

// === Cari lokasi VS Code =========================================================================
// Cek 4 lokasi kandidat dengan PATH PENUH (bukan lewat PATH
// lingkungan). Tolak path tak-berakar (anti CWD-injection). env null/kosong dilewati (tak crash).
export function findVsCodeExe(env = process.env) {
  const candidates = []
  if (env.LOCALAPPDATA) {
    candidates.push(path.join(env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', 'Code.exe'))
    candidates.push(path.join(env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code Insiders', 'Code - Insiders.exe'))
  }
  if (env.ProgramFiles) {
    candidates.push(path.join(env.ProgramFiles, 'Microsoft VS Code', 'Code.exe'))
  }
  if (env['ProgramFiles(x86)']) {
    candidates.push(path.join(env['ProgramFiles(x86)'], 'Microsoft VS Code', 'Code.exe'))
  }
  for (const cand of candidates) {
    if (!cand) continue
    if (!path.isAbsolute(cand)) continue // tolak path tak-berakar (anti injeksi CWD)
    try { if (fs.existsSync(cand)) return cand } catch { /* lanjut ke kandidat berikut */ }
  }
  return null
}

// === Panduan simpan ke git =======================================================================
// Susun baris-baris panduan commit hasil setup. Kebijakan branch/PR/review = urusan repo client
// sendiri (proteksi `main` mereka yang atur) — kit TIDAK ikut mendeteksi/menasihatinya.
// Nomor versi DIAMBIL dari kitVersion (bukan paku-mati 'v1.5.6'
// itu jadi basi). Mengembalikan array string (orkestrator yang mencetak baris demi baris).
// CLAUDE.md & AGENTS.local.md WAJIB ikut: keduanya dibuat pemasang di akar project, dan tanpa
// CLAUDE.md rekan setim yang meng-clone repo TIDAK memuat kernel sama sekali di Claude Code —
// gagal senyap, tanpa pesan error. Dikunci tests/setup-interactive.test.mjs.
export function buildCommitGuidance(kitVersion = '') {
  const verTag = kitVersion ? ` (lintasAI ${kitVersion})` : ''
  return [
    'Simpan hasil setup ke git:',
    `  git add AGENTS.md AGENTS.local.md CLAUDE.md ${NAMA_FOLDER_KIT}/ docs/ .github/`,
    `  git commit -m 'chore: pasang standar tim IT${verTag}'`,
    '',
    '  Kenapa CLAUDE.md ikut: itu pemuat aturan untuk Claude Code. Tanpa berkas ini,',
    '  rekan setim yang meng-clone repo tak memuat aturan sama sekali - tanpa pesan error.',
  ]
}

// === Beda isi berkas (untuk aksi "Lihat beda dulu" AGENTS.md) ====================================
// Versi ringan: baris yang HANYA ada di salah satu
// sisi. Bukan diff baris-demi-baris canggih - cukup untuk staff memutuskan gabung manual.
// Mengembalikan { onlyExisting: string[], onlyTemplate: string[] }.
export function diffLines(existing, template) {
  const norm = (s) => String(s == null ? '' : s).split(/\r?\n/)
  const exLines = norm(existing)
  const tplLines = norm(template)
  const exSet = new Set(exLines)
  const tplSet = new Set(tplLines)
  const onlyExisting = exLines.filter((l) => !tplSet.has(l))
  const onlyTemplate = tplLines.filter((l) => !exSet.has(l))
  return { onlyExisting, onlyTemplate }
}
