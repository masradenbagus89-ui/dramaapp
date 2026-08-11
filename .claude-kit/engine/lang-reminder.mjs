#!/usr/bin/env node
// engine/lang-reminder.mjs - Pengingat per-giliran (disuntik ke konteks AI TIAP user kirim pesan):
//   (1) BAHASA       : jawab Bahasa Indonesia + gaya non-programmer + istilah programming term-first (sec.2.1).
//   (2) TITIK RISIKO : perketat pemeriksaan di area berbahaya + lapor jujur/anti-karang-temuan (sec.4.17/8.2).
//
// KENAPA: aturan-aturan ini hanya berupa TEKS yang terkubur jauh di dokumen aturan ~1900 baris. Bawaan model
// = Bahasa Inggris, DAN di bawah beban kerja AI gampang lupa memperketat di area berbahaya - jadi di awal
// sesi (sebelum benar-benar menyerap aturan) AI sering "kabur" ke Inggris / mengerjakan permukaan saja.
// Berkas aturan = imbauan; berkas ini = rem-mesin LUNAK: dijalankan harness Claude Code lewat hook
// `UserPromptSubmit`, lalu apa pun yang dicetak ke stdout DITAMBAHKAN ke konteks AI untuk giliran itu -
// posisinya tepat sebelum AI menjawab, jadi jauh lebih kuat daripada teks di awal berkas panjang.
// "LUNAK" = pengingat, BUKAN pemblokir (selalu exit 0): ia MENGUATKAN kepatuhan, tak bisa memaksa.
//
// KENAPA DAFTAR "8 DIVISI" DICABUT DARI SINI (2026-07-19, ADR-023): blok-2 dulu menyebut 8 lensa divisi
// tiap giliran. Dua uji buta di project klien nyata (ADR-022:236-247) menemukan ritual itu MERUGIKAN -
// sisi yang memakainya kalah 1-vs-11 dan 2-vs-10, dan justru menemukan LEBIH SEDIKIT aspek yang tak
// disebut client (11 vs 15 - padahal itu alasan keberadaannya). Mekanismenya: daftar 8 kotak MENJANGKARKAN
// perhatian, pemakainya berhenti setelah kotak ke-8. Yang kalah BUKAN standarnya - isi standar (sec.5, 8,
// 9, 10, 4.6) tetap dibaca kedua sisi dan terbukti bekerja.
//
// YANG SENGAJA TIDAK IKUT DICABUT: dua pagar keselamatan dulu MENUMPANG di dalam blok 8-divisi yang sama -
// (a) pengingat titik-risiko (login/bayar/data-pribadi/upload/skema-DB/rilis) dan (b) rem anti-karang-temuan
// ("nol temuan itu sah"). Mencabut blok itu bulat-bulat akan diam-diam ikut membuang keduanya, jadi mereka
// dipindahkan lebih dulu ke blok-2 yang baru. Ini prasyarat yang ADR-022:286-289 tetapkan sendiri.
//
// WIRING: di repo kit -> .claude/settings.json (tunjuk engine/lang-reminder.mjs). Di project KLIEN ->
// dipasang OTOMATIS ke .claude/settings.json saat init/update oleh engine/lang-hook-wiring.mjs (tunjuk
// .claude-kit/engine/lang-reminder.mjs); contoh bentuk hook = templates/settings.json.template.
//
// SENGAJA SEDERHANA + FAIL-SAFE: 2 blok lama SELALU dicetak DULU (degradasi anggun), BARU coba
// baca stdin untuk blok-4 kondisional plan-mode. Satu-satunya I/O = baca stdin ber-jaring:
// isTTY-null (anti-hang run manual) + try/catch-null + buang-BOM. Apa pun yang aneh -> null ->
// perlaku persis seperti dulu (blok-4 absen). Asumsi desain: harness Claude Code MENUTUP stdin
// setelah kirim JSON (kalau tidak, hang dibatasi timeout:15 di engine/lang-hook-wiring.mjs; exit
// timeout != 2 jadi pesan user tak terblokir). Hook keluar-kode 2 MEMBLOKIR pesan user - pantang;
// selalu exit 0.
//
// BAHASA INDONESIA WAJIB: teks di bawah dipindai robot penjaga bahasa (engine/output-lang-check.mjs)
// karena berkas ini ada di engine/*.mjs. Kalau ditulis Inggris -> gerbang bahasa merah. Lagipula
// pengingat ke AI memang harus Indonesia: ia jadi "contoh hidup" mode bahasa yang diminta.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Blok 1 - pengingat BAHASA (jalan TIAP giliran -> sengaja pendek demi hemat token).
// DIET v2.0.0: teks dipangkas ~40% (1.032 -> ~600 char) tanpa membuang frasa yang dikunci
// tests/lang-reminder.test.mjs. ADR-028: ditambah mandat "mau ngapain + kenapa singkat" (narasi/todo/
// jawaban/popup) - dipadatkan ulang supaya tetap ~5 baris (biaya token per-prompt nyaris tak berubah).
const pengingatBahasa = [
  '[Pengingat lintasAI - bahasa output]',
  'Jawab SELALU Bahasa Indonesia - narasi antar-langkah, to-do, jawaban akhir, popup. Tiap langkah/',
  'pilihan: sebut "mau ngapain + kenapa" SINGKAT (pendek, hemat token) - biar non-programmer paham &',
  'naik kelas. Istilah programming DIPERTAHANKAN + gloss awam sekali di kemunculan pertama (junior',
  'belajar konsep, non-programmer paham); JANGAN parafrase; identifier asli. (§2.1 - timpa bawaan Inggris.)',
]

// Blok 2 - pengingat TITIK RISIKO + LAPOR JUJUR. Dua pagar yang dulu MENUMPANG di blok "8 divisi":
// (a) perketat di area berbahaya (§4.17), (b) rem anti-karang-temuan (§8.2 Aturan 3b) + anti-teater
// (jangan ledakkan 10 lensa untuk hal sepele). Daftar 8 lensa sengaja TIDAK disebut - lihat catatan
// "KENAPA DAFTAR 8 DIVISI DICABUT" di kepala berkas. Yang tersisa di sini murni PAGAR, bukan ritual.
const pengingatRisiko = [
  '[Pengingat lintasAI - titik risiko + lapor jujur]',
  'Perketat pemeriksaan saat menyentuh login/bayar/data-pribadi/upload/skema-DB/rilis (§4.17).',
  'Tampilkan pas-ukuran: blok Tinjauan HANYA saat ada temuan nyata/keputusan besar,',
  'jangan ledakkan 10 lensa, nol temuan itu sah (§4.1/§8.2).',
]

// (Blok 3 "BLOK BELAJAR §4.1b" DIHAPUS 2026-07-20, ADR-026 — fitur §4.1b Blok Belajar dicabut;
// yang tersisa jalan-tiap-giliran = 2 blok pagar: BAHASA + TITIK RISIKO.)

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
    // SENGAJA (bukan import engine/fs-text.mjs stripBom): hook harus tetap jalan walau .claude-kit
    // parsial/korup; import gagal meruntuhkan SELURUH hook termasuk 2 blok lama (LP-004).
    if (mentah.charCodeAt(0) === 0xFEFF) mentah = mentah.slice(1)
    if (!mentah.trim()) return null
    return JSON.parse(mentah)
  } catch {
    return null
  }
}

// buildReminder: rakit teks pengingat (dipakai ulang oleh adaptor Kimi engine/kimi/lang-reminder-kimi.mjs).
// PURE (tak menyentuh I/O) -> gampang diuji + dipakai lintas-harness. Untuk Claude, jalur cetak di bawah
// TETAP memakai console.log 2-tahap yang sama persis seperti sebelumnya (output byte-identik).
//
// `petunjukRak` = teks blok-5 yang SUDAH dihitung pemanggil (lihat muatPetunjukRak di bawah). Sengaja
// diterima sebagai STRING, bukan dihitung di sini: menghitungnya butuh `import` tabel + akses disk, dan
// buildReminder wajib tetap murni-sinkron. Kosong/absen -> keluaran BYTE-IDENTIK dengan versi sebelum
// fitur ini ada (dijaga tests/lang-reminder.test.mjs).
export function buildReminder({ permissionMode, petunjukRak } = {}) {
  let out = [...pengingatBahasa, '', ...pengingatRisiko].join('\n')
  if (permissionMode === 'plan') out += '\n\n' + pengingatPlanMode.join('\n')
  if (typeof petunjukRak === 'string' && petunjukRak.trim()) out += '\n\n' + petunjukRak.trim()
  return out
}

// Blok-5 "Petunjuk Rak": menyodorkan PATH rak yang relevan dengan isi prompt. Menutup celah terukur -
// uji 2026-07-19: pada tugas RINGAN, rak relevan dibuka 0% bukan karena AI menolak, tapi karena ia tak
// pernah berhenti untuk bertanya "rak mana yang relevan?". Ini pengingat LUNAK: tak memblokir apa pun.
//
// 🔑 IMPOR DINAMIS DI DALAM try (LP-004): tabel pemicu hidup di berkas TERPISAH. `import` statis akan
// meruntuhkan SELURUH hook (termasuk 2 blok lama) kalau .claude-kit parsial/korup - itu pelajaran mahal
// yang sudah tercatat. Dengan import dinamis ber-try, kerugian terburuk = blok-5 absen, sisanya utuh.
// FAIL-SILENT disengaja: pengingat yang gagal TIDAK boleh menghasilkan pesan error ke staff.
export async function muatPetunjukRak(prompt, root) {
  try {
    if (!prompt || typeof prompt !== 'string') return ''
    const [{ bangunPetunjukRak }, { muatRegistry }, fs, path] = await Promise.all([
      import('./rak-pemicu.mjs'), import('./skill-registry.mjs'), import('node:fs'), import('node:path'),
    ])
    const basis = [root, process.cwd()].filter((b) => b && typeof b === 'string')
    const ada = (rel) => basis.some((b) => {
      try { return fs.existsSync(path.join(b, rel)) || fs.existsSync(path.join(b, '.claude-kit', rel)) }
      catch { return false }
    })
    // SHIM transisi (ADR-027): registry skill (kalau ada) DULU; kosong -> bangunPetunjukRak fallback tabel lama.
    return bangunPetunjukRak(prompt, ada, muatRegistry(basis))
  } catch {
    return '' // tabel/registry hilang/korup -> pengingat lama tetap utuh, blok-5 sekadar absen
  }
}

// Jalankan sebagai hook HANYA saat di-run langsung (harness Claude Code menjalankannya). Saat di-IMPORT
// (adaptor Kimi) -> JANGAN auto-cetak / auto-baca-stdin. Perilaku saat di-run langsung SAMA PERSIS.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  // 2 blok lama dicetak DULU (dijamin ter-flush) sebelum menyentuh stdin -> jendela kerugian
  // skenario terburuk mengecil ke blok-4 saja.
  console.log([...pengingatBahasa, '', ...pengingatRisiko].join('\n'))
  const konteksHook = bacaKonteksHook()
  if (konteksHook && konteksHook.permission_mode === 'plan') console.log('\n' + pengingatPlanMode.join('\n'))
  // process.exitCode (bukan process.exit) = aman dari stdout ke-potong. 0 = jangan blokir pesan user.
  process.exitCode = 0
  // Blok-5 TERAKHIR + ber-try: 2 blok lama sudah ter-flush di atas, jadi apa pun yang gagal di sini
  // (tabel hilang, disk aneh) hanya menghilangkan blok-5 - bukan meruntuhkan pengingat (LP-004).
  if (konteksHook && typeof konteksHook.prompt === 'string') {
    muatPetunjukRak(konteksHook.prompt, konteksHook.cwd)
      .then((teks) => { if (teks) console.log('\n' + teks) })
      .catch(() => { /* fail-silent: pengingat gagal TIDAK boleh jadi pesan error ke staff */ })
  }
}
