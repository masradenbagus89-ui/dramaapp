#!/usr/bin/env node
// lib/lang-reminder.mjs - Pengingat per-giliran (disuntik ke konteks AI TIAP user kirim pesan):
//   (1) BAHASA      : jawab Bahasa Indonesia + gaya non-programmer (sec.2.1).
//   (2) 8 DIVISI    : pertimbangkan 8 lensa divisi profesional tiap prompt + perketat di titik risiko (sec.4.13/4.17).
//   (3) BLOK BELAJAR: tutup output substantif dengan blok "Belajar dari task ini" (sec.4.1b).
//
// KENAPA: dua aturan ini hanya berupa TEKS yang terkubur jauh di dokumen aturan ~1900 baris. Bawaan model
// = Bahasa Inggris, DAN di bawah beban kerja AI gampang lupa menimbang lensa divisi - jadi di awal sesi
// (sebelum benar-benar menyerap aturan) AI sering "kabur" ke Inggris / mengerjakan permukaan saja.
// Berkas aturan = imbauan; berkas ini = rem-mesin LUNAK: dijalankan harness Claude Code lewat hook
// `UserPromptSubmit`, lalu apa pun yang dicetak ke stdout DITAMBAHKAN ke konteks AI untuk giliran itu -
// posisinya tepat sebelum AI menjawab, jadi jauh lebih kuat daripada teks di awal berkas panjang.
// "LUNAK" = pengingat, BUKAN pemblokir (selalu exit 0): ia MENGUATKAN kepatuhan, tak bisa memaksa.
//
// KENAPA 8 DIVISI IKUT DI SINI (audit 2026-06-28): audit menemukan asimetri - aturan BAHASA sudah diberi
// rem-mesin (hook ini), tapi aturan 8 DIVISI belum, padahal alasannya IDENTIK (teks panjang sering dilupakan
// AI di bawah beban). Menyatukannya di satu hook = REUSE wiring yang sudah terpasang di semua klien (penanda
// idempoten 'lang-reminder.mjs' di lib/lang-hook-wiring.mjs) - tanpa hook/berkas settings baru. Pengingat 8
// divisi sengaja MENEKANKAN "tampilkan pas-ukuran" supaya tak memicu AI meledakkan 15-lensa / mengarang
// temuan untuk hal sepele (lawan sec.4.17 + sec.8.2 Aturan 3b).
//
// WIRING: di repo kit -> .claude/settings.json (tunjuk lib/lang-reminder.mjs). Di project KLIEN ->
// dipasang OTOMATIS ke .claude/settings.json saat init/update oleh lib/lang-hook-wiring.mjs (tunjuk
// .claude-kit/lib/lang-reminder.mjs); contoh bentuk hook = templates/settings.json.template.
//
// SENGAJA SEDERHANA + FAIL-SAFE: 3 blok lama SELALU dicetak DULU (degradasi anggun), BARU coba
// baca stdin untuk blok-4 kondisional plan-mode. Satu-satunya I/O = baca stdin ber-jaring:
// isTTY-null (anti-hang run manual) + try/catch-null + buang-BOM. Apa pun yang aneh -> null ->
// perlaku persis seperti dulu (blok-4 absen). Asumsi desain: harness Claude Code MENUTUP stdin
// setelah kirim JSON (kalau tidak, hang dibatasi timeout:15 di lib/lang-hook-wiring.mjs; exit
// timeout != 2 jadi pesan user tak terblokir). Hook keluar-kode 2 MEMBLOKIR pesan user - pantang;
// selalu exit 0.
//
// BAHASA INDONESIA WAJIB: teks di bawah dipindai robot penjaga bahasa (lib/output-lang-check.mjs)
// karena berkas ini ada di lib/*.mjs. Kalau ditulis Inggris -> gerbang bahasa merah. Lagipula
// pengingat ke AI memang harus Indonesia: ia jadi "contoh hidup" mode bahasa yang diminta.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Blok 1 - pengingat BAHASA (jalan TIAP giliran -> sengaja pendek demi hemat token).
// DIET v2.0.0: teks dipangkas ~40% (1.032 -> ~600 char = hemat ~107 token TIAP prompt client)
// tanpa membuang satu pun frasa yang dikunci tests/lang-reminder.test.mjs.
const pengingatBahasa = [
  '[Pengingat lintasAI - bahasa output]',
  'Jawab SELALU Bahasa Indonesia - sejak kalimat pertama, narasi antar-langkah, to-do, laporan.',
  'Gaya junior-programmer + non-programmer: jargon langsung dijelaskan awam; identifier kode',
  'tetap asli. (§2.1 - menimpa bawaan model yang Inggris.)',
]

// Blok 2 - pengingat 8 DIVISI (pertimbangkan SELALU; tampilkan PAS-UKURAN, jangan diledakkan).
const pengingatDivisi = [
  '[Pengingat lintasAI - 8 divisi profesional]',
  'Timbang otomatis 8 lensa: Backend, Frontend, Database, Webdesign, UI/UX, DevOps, Security, SEO;',
  'perketat saat sentuh login/bayar/data-pribadi/upload/skema-DB/rilis (§4.13/§4.17).',
  'Tampilkan pas-ukuran: blok Tinjauan HANYA saat ada temuan nyata/keputusan besar,',
  'jangan ledakkan 13 lensa, nol temuan itu sah (§4.1/§8.2).',
]

// Blok 3 - pengingat BLOK BELAJAR (sec.4.1b) - jalan TIAP giliran, sengaja ringkas demi diet token:
// detail aturan (5 baris, label, daftar SKIP) sudah hidup di mandat sec.4.1b yang always-load,
// jangan diulang di sini. Ukuran blok ini ~236 char ~ ~59 token/prompt (rasio kit 4 char/token,
// selaras lib/rules-budget-check.mjs; angka dihitung nyata via .length saat dipasang 2026-07-14).
const pengingatBelajar = [
  '[Pengingat lintasAI - blok belajar]',
  'Tutup output substantif dengan blok "📚 Belajar dari task ini" (5 baris §4.1b:',
  '👨‍🎓 Junior-<profesi> s/d 🚀 jalan ke senior); balasan 1-2 baris & Mode Hemat dilewati;',
  'ragu -> jangan ngarang (§8.2).',
]

// Blok 4 - pengingat PLAN MODE (§4.19) - HANYA saat harness melapor permission_mode "plan".
// Rencana cepat-akurat: pasangan 2-versi + klaim berbukti; jangan fan-out kecuali diminta/titik-risiko.
const pengingatPlanMode = [
  '[Pengingat lintasAI - plan mode]',
  'Sedang PLAN MODE: sajikan rencana format §4.19 - pasangan 👨‍🎓 Junior-<profesi> + 🙂 Non-<profesi>',
  'per seksi utama; tiap klaim berbukti berkas:baris, pisah ✅ terverifikasi vs ❓ asumsi (§4.2-0);',
  'Pindai Cepat: JANGAN fan-out agen kecuali diminta menyeluruh/audit ATAU rencana sentuh titik',
  'risiko (login/bayar/data pribadi/skema DB - §4.17); ragu -> jangan ngarang (§8.2).',
]

// Baca konteks hook dari stdin (JSON dari harness, memuat permission_mode). FAIL-SAFE: apa pun
// yang aneh -> null (= perlakukan seperti BUKAN plan mode). isTTY-null cegah hang saat run manual.
function bacaKonteksHook() {
  try {
    if (process.stdin.isTTY) return null
    let mentah = fs.readFileSync(0, 'utf8')
    if (!mentah) return null
    // Buang BOM: sebagian pipa/shell Windows menyisipkan U+FEFF -> JSON.parse melempar. Inline
    // SENGAJA (bukan import lib/fs-text.mjs stripBom): hook harus tetap jalan walau .claude-kit
    // parsial/korup; import gagal meruntuhkan SELURUH hook termasuk 3 blok lama (LP-004).
    if (mentah.charCodeAt(0) === 0xFEFF) mentah = mentah.slice(1)
    if (!mentah.trim()) return null
    return JSON.parse(mentah)
  } catch {
    return null
  }
}

// buildReminder: rakit teks pengingat (dipakai ulang oleh adaptor Kimi lib/kimi/lang-reminder-kimi.mjs).
// PURE (tak menyentuh I/O) -> gampang diuji + dipakai lintas-harness. Untuk Claude, jalur cetak di bawah
// TETAP memakai console.log 2-tahap yang sama persis seperti sebelumnya (output byte-identik).
export function buildReminder({ permissionMode } = {}) {
  let out = [...pengingatBahasa, '', ...pengingatDivisi, '', ...pengingatBelajar].join('\n')
  if (permissionMode === 'plan') out += '\n\n' + pengingatPlanMode.join('\n')
  return out
}

// Jalankan sebagai hook HANYA saat di-run langsung (harness Claude Code menjalankannya). Saat di-IMPORT
// (adaptor Kimi) -> JANGAN auto-cetak / auto-baca-stdin. Perilaku saat di-run langsung SAMA PERSIS.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  // 3 blok lama dicetak DULU (dijamin ter-flush) sebelum menyentuh stdin -> jendela kerugian
  // skenario terburuk mengecil ke blok-4 saja.
  console.log([...pengingatBahasa, '', ...pengingatDivisi, '', ...pengingatBelajar].join('\n'))
  const konteksHook = bacaKonteksHook()
  if (konteksHook && konteksHook.permission_mode === 'plan') console.log('\n' + pengingatPlanMode.join('\n'))
  // process.exitCode (bukan process.exit) = aman dari stdout ke-potong. 0 = jangan blokir pesan user.
  process.exitCode = 0
}
