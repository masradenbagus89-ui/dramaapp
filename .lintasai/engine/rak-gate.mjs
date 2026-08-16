#!/usr/bin/env node
// engine/rak-gate.mjs - "Palang Rak" (PreToolUse hook Claude Code, deterministik, ~0 token).
//
// MASALAH: isi detail standar kit tinggal di rak on-demand dan dibaca SUKARELA. Uji buta 2026-07-19
// atas 6 prompt client nyata: hanya 8 dari 56 rak relevan dibuka (~14%); tugas RINGAN 0%. Pengingat
// LUNAK (engine/lang-reminder.mjs) tak menggerakkannya - ia mengaku sendiri "tak bisa memaksa".
//
// APA YANG DITEGAKKAN: sebelum edit PERTAMA sebuah berkas berdampak-tinggi (auth/pembayaran/migrasi/
// API/unggah/DevOps-infra), harus ADA CATATAN bahwa rak terkait benar-benar di-`Read` di sesi ini.
// Daftar jenis = engine/rak-pemicu.mjs PETA_BERKAS (sengaja SEMPIT: hanya kerusakan SENYAP - Frontend/SEO
// TIDAK termasuk karena kerusakannya kelihatan, bukan senyap; §4.3 anti-upacara).
//
// 🔑 BUKTI, BUKAN KLAIM (ini yang membuat palang ini beda dari palang berbasis-janji):
// Hook PreToolUse HANYA menerima {tool_name, tool_input, session_id} - ia tak pernah melihat prosa AI.
// Jadi syarat "sebutkan rak yang kau baca" MUSTAHIL diverifikasi mesin; satu-satunya implementasinya
// adalah "blokir sekali lalu izinkan retry apa pun" - lubang yang membuat palang jenis itu bisa di-bluff
// (path ditandai `gated` saat MEMBLOKIR, jadi retry telanjang lolos tanpa fakta apa pun disajikan).
// Palang ini memakai TANDA-TERIMA `Read`: matcher mencakup `Read`, tiap pembacaan rak dicatat ke state
// sesi. Yang dicatat = PEMANGGILAN TOOL, jadi tak bisa di-bluff. Ini memenuhi ADR-008 Keputusan #3
// ("penilaian WAJIB DETERMINISTIK - robot memeriksa sinyal nyata, BUKAN AI menyatakan 'sudah'").
//
// 🔑 MENEGAKKAN "DIBACA", TAK PERNAH "DIPATUHI":
// isi rak = Tingkat-2 dan BOLEH kalah oleh kenyataan kode (§4.3). Pesan palang WAJIB menyatakan itu
// (dikunci tes) supaya palang ini tak pernah berubah jadi "rak = hukum".
//
// BATAS JUJUR (tulis terang-terangan, jangan diklaim lebih):
//  - Baca-murni via shell (`cat`/`type`/`Get-Content`/`head`/...) IKUT dihitung tanda-terima —
//    pembalikan sadar atas false-negative yang menghabiskan katup pelepas. Yang direkam tetap
//    PEMANGGILAN TOOL, jadi tetap tak bisa di-bluff dengan kata-kata.
//    `Grep` TIDAK dihitung (cabangnya dicabut 2026-08-09): ia tak pernah bisa jalan karena
//    RAK_GATE_MATCHER tak memuat `Grep` — lihat catatan di butir (1d) di bawah.
//    BATAS YANG DITERIMA APA ADANYA: jalur shell menghitung bacaan PARSIAL sebagai penuh
//    (`head -c 1 skills/auth/SKILL.md` lolos dengan 1 karakter), dan pembelokan keluaran selain `>`
//    (mis. `| Out-File`) tak terdeteksi. Diterima SADAR, bukan terlewat: ini pagar KEPATUHAN
//    ("sudah dibuka?"), BUKAN pagar KEAMANAN. Yang menjaga aksi berbahaya tetap engine/risk-gate.js.
//  - Belum terverifikasi apakah `Read` sub-agen memicu hook sesi induk (dokumentasi resmi tak menyebut).
//    Katup pelepas 2x-per-sesi menyelamatkan kalau ternyata tidak.
//
// KONTRAK PreToolUse (terverifikasi ke dok resmi 2026-07-19): stdin JSON { tool_name, tool_input,
// session_id, cwd, permission_mode, ... }. block = exit 2 + stderr (umpan-balik ke AI, ia baca rak lalu
// retry). allow = exit 0. FAIL-OPEN: input rusak/state error -> allow (jangan kunci kerja tim).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readState, writeState } from './hook-session-state.mjs'
import { isLowValue, emitBlock } from './gate-shared.mjs'
import { rakUntukBerkas } from './rak-pemicu.mjs'
import { NAMA_FOLDER_KIT } from './project-root.mjs'

// Diekspor supaya adaptor harness LAIN memakai LACI STATE YANG SAMA, bukan menyalin string-nya.
// Satu sesi = satu laci, apa pun otak yang dipakai. (Adaptor Kimi yang dulu memakainya sudah DICABUT
// di ADR-032 — Kimi membaca AGENTS.md secara native; ekspor ini dipertahankan untuk adaptor berikutnya.)
export const STATE_NAMESPACE = 'rakgate'
export const MAKS_BLOKIR_SESI = 2 // katup pelepas keras: refactor besar tak boleh jadi upacara
// ADR-034: rak kini hidup di SATU rumah - skills/**/SKILL.md (folder rak lama dicabut total).
// RAK_RE dan PETA_BERKAS wajib bergerak ATOMIK, kalau tidak palang menuntut baca rak yang
// pembacaannya tak pernah tercatat -> mati senyap (dijaga tests/rak-gate.test.mjs "invarian rute").
// Daftar-isi (katup pelepas `adalahIndex`) kini = skills/registry.json, bukan .md -> dicocokkan sendiri.
const RAK_RE = /skills[/\\][\w.\-/\\]*\.md$|skills[/\\]registry\.json$/i
const INDEX_RE = /skills[/\\]registry\.json$/i

// --- Fungsi MURNI (bisa diuji tanpa disk) --------------------------------------------------------

export function adalahBacaanRak(filePath) { return RAK_RE.test(String(filePath || '')) }
export function adalahIndex(filePath) { return INDEX_RE.test(String(filePath || '')) }

// Perintah shell BACA-MURNI di awal command — daftar sempit disengaja (bukan sed/awk: bisa menulis).
const BACA_MURNI_RE = /^\s*(?:cat|type|head|tail|more|less|Get-Content|gc)\b/i

// PURE: path rak yang benar-benar DIBACA sebuah perintah shell, atau null.
// Dihitung HANYA bila: (a) perintah diawali pembaca-murni, (b) TIDAK ada `>` (redirect = keluaran
// dibelokkan, isi tak pernah tampil ke AI = tanda-terima bohong), (c) ada token ber-path rak.
export function rakDariPerintahBaca(perintah) {
  const s = typeof perintah === 'string' ? perintah : ''
  if (!BACA_MURNI_RE.test(s) || s.includes('>')) return null
  for (const tok of s.split(/\s+/)) {
    const bersih = tok.replace(/^["']+|["']+$/g, '')
    if (adalahBacaanRak(bersih)) return normalkan(bersih)
  }
  return null
}

export function pesanPalang(namaBerkas, rakWajib) {
  return [
    `[Palang Rak] Berkas "${namaBerkas}" menyentuh titik risiko, tapi belum ada rak lintasAI yang dibaca di sesi ini.`,
    // Kata "buka/baca" sengaja NETRAL-OTAK: alat baca Claude bernama `Read`, di Kimi bisa `read_file`.
    'Sebelum edit pertama: buka (baca) SATU rak paling relevan di bawah, lalu ulangi operasi yang sama.',
    ...rakWajib.map((r) => `- ${r}`),
    'Isi rak TIDAK mengikat: bentrok dengan kenyataan kode -> kenyataan kode MENANG (§4.3).',
    'Cukup sebut alasan menyimpang + bukti berkas:baris. Tak ada yang cocok -> buka skills/registry.json.',
    `Palang ini maksimal ${MAKS_BLOKIR_SESI}x per sesi.`,
  ].join('\n')
}

// Keputusan MURNI. state = { dibaca: string[], blokir: number }. rakWajibDari = fungsi path -> string[]
// (di-injeksi supaya penyaringan existsSync bisa diuji tanpa disk).
// Return { decision: 'allow'|'block', catat?: string, reason?: string }.
export function decideRak(obj, state, rakWajibDari = rakUntukBerkas) {
  if (!obj || typeof obj !== 'object') return { decision: 'allow' }
  const tool = typeof obj.tool_name === 'string' ? obj.tool_name : ''
  const ti = obj.tool_input && typeof obj.tool_input === 'object' ? obj.tool_input : {}
  const filePath = typeof ti.file_path === 'string' ? ti.file_path : (typeof ti.file === 'string' ? ti.file : '')

  // (1) PEREKAM: Read atas rak skills/**.md -> catat tanda-terima, selalu izinkan.
  if (/^Read$/i.test(tool)) {
    if (filePath && adalahBacaanRak(filePath)) return { decision: 'allow', catat: normalkan(filePath) }
    return { decision: 'allow' }
  }

  // (1b) PEREKAM SETARA - jalan keluar MURAH (2026-07-25). Menjalankan `rak-cli` = konsultasi INDEKS rak:
  // maknanya sama dengan membaca skills/registry.json (butir 4 "index-dibaca"), tapi keluarannya ~300 char
  // vs ~20 KB - sekitar 70x lebih murah, DAN registry yang terbaca ikut membengkakkan konteks di SEMUA
  // giliran berikutnya. Tanpa ini, jalan keluar sah yang kita sediakan sendiri justru yang paling boros.
  // Dicatat sebagai path indeks kanonik supaya adalahIndex() mengenalinya - nol aturan baru.
  // SEMPIT DISENGAJA: hanya bentuk pemanggilan yang memang diinstruksikan ke AI (AGENTS.md §4.2
  // `node .lintasai/engine/rak-cli.mjs "<topik>"`). `cat`/`grep` atas berkas CLI-nya TIDAK dihitung -
  // membaca kode CLI bukan konsultasi indeks. Dikunci tes ANTI-FP.
  if (/^Bash$/i.test(tool)) {
    const perintah = typeof ti.command === 'string' ? ti.command : ''
    if (/node[^|;&]*rak-cli\.mjs/i.test(perintah)) return { decision: 'allow', catat: 'skills/registry.json' }
    // (1c) PEREKAM SETARA 2 (2026-08-09): baca-murni rak via shell = tanda-terima juga (anti
    // false-negative yang menghabiskan katup pelepas; pagar anti-bluff di rakDariPerintahBaca).
    const rakBaca = rakDariPerintahBaca(perintah)
    if (rakBaca) return { decision: 'allow', catat: rakBaca }
    return { decision: 'allow' }
  }

  // (1d) DICABUT 2026-08-09: cabang perekam `Grep` pernah ada di sini, tapi RAK_GATE_MATCHER
  // (engine/ensure-rak-gate-hook.mjs) TIDAK memuat `Grep` -> hook tak pernah dijalankan untuk tool itu,
  // jadi cabangnya KODE MATI sejak lahir. Menambah `Grep` ke matcher BUKAN jalan keluarnya: pemasang
  // hook idempoten berbasis marker nama berkas (engine/hook-installer.mjs), jadi client yang sudah
  // terpasang TIDAK pernah menerima matcher baru — fiturnya akan tetap mati di lapangan sambil
  // CHANGELOG mengklaim ia hidup. Paritas matcher<->cabang kini dijaga tests/ensure-rak-gate-hook.test.mjs.

  // (2) Bukan alat pengubah berkas -> bukan urusan palang ini.
  if (!/^(Edit|Write|MultiEdit)$/i.test(tool)) return { decision: 'allow' }
  if (!filePath) return { decision: 'allow' }
  if (isLowValue(filePath)) return { decision: 'allow' }        // tes/generated/dist -> lewati

  // (3) Bukan titik risiko -> lewati. MAYORITAS edit lewat sini = nol friksi.
  const wajib = rakWajibDari(filePath)
  if (!Array.isArray(wajib) || wajib.length === 0) return { decision: 'allow' }

  // (4) Sudah ada tanda-terima bacaan yang relevan, ATAU INDEX.md (jalan keluar sah) -> lolos.
  const dibaca = Array.isArray(state && state.dibaca) ? state.dibaca : []
  if (dibaca.some((d) => adalahIndex(d))) return { decision: 'allow', reason: 'index-dibaca' }
  if (dibaca.some((d) => wajib.some((w) => d.endsWith(normalkan(w))))) return { decision: 'allow', reason: 'rak-dibaca' }

  // (5) Katup pelepas: sudah memblokir MAKS kali di sesi ini -> diam, jangan jadi upacara.
  const blokir = Number(state && state.blokir) || 0
  if (blokir >= MAKS_BLOKIR_SESI) return { decision: 'allow', reason: 'katup-pelepas' }

  return { decision: 'block', reason: pesanPalang(String(filePath).split(/[\\/]/).pop(), wajib), wajib }
}

function normalkan(p) { return String(p).replace(/\\/g, '/') }

// PURE: hitung state BERIKUTNYA dari sebuah keputusan. `null` = tak ada yang perlu ditulis ke disk.
// Dipakai BERSAMA jalur Claude (main() di bawah) dan adaptor Kimi. Sengaja satu fungsi: aturan
// "catat tanda-terima" + "hitung blokir" adalah inti pembuktian palang ini; kalau ia disalin ke dua
// tempat, satu sisi bisa melenceng diam-diam dan palang jadi bohong di salah satu otak.
// Batas 200 entri = penjaga agar sesi panjang tak menumbuhkan berkas state tanpa henti.
export function stateBerikutnya(state, d) {
  const dasar = state && typeof state === 'object' ? state : {}
  if (d && d.catat) {
    const dibaca = Array.isArray(dasar.dibaca) ? dasar.dibaca : []
    if (dibaca.includes(d.catat)) return null // sudah tercatat: jangan tulis ulang
    return { ...dasar, dibaca: [...dibaca, d.catat].slice(-200) }
  }
  if (d && d.decision === 'block') return { ...dasar, blokir: (Number(dasar.blokir) || 0) + 1 }
  return null
}

// --- Jalur runtime: penyaringan existsSync + state per-sesi ---------------------------------------

// Rak nyata di disk. Klien menaruhnya di `.lintasai/skills/...`; repo kit di `skills/...`.
// WAJIB: yang tak ada DIBUANG - klien kit lama tak punya semua rak, dan menyodorkan path hantu bikin
// AI membakar ribuan token mencari berkas yang memang tak ada.
// COBA BEBERAPA BASIS, jangan cuma `cwd` dari payload. Ditemukan saat uji-jalan 2026-07-19: kalau
// harness/shell mengirim cwd bergaya POSIX di Windows (mis. "/d/Users/..."), path.join menghasilkan
// path yang tak pernah ada -> seluruh rak dianggap hilang -> palang MATI DIAM-DIAM tanpa satu pun
// tanda. Kegagalan senyap seperti itulah yang menghasilkan angka 14% di awal. Dok resmi Claude Code
// menegaskan cwd hook = folder project, jadi process.cwd() adalah cadangan yang sah dan andal.
export function buatPenyaringDisk(root) {
  const basis = []
  if (root && typeof root === 'string') basis.push(root)
  try { basis.push(process.cwd()) } catch { /* lingkungan aneh: abaikan */ }
  // Kandidat `kit/` = repo-dev setelah pemisahan client/dev; DITARUH TERAKHIR supaya `.lintasai/`
  // (salinan kit asli di project client) selalu menang lebih dulu.
  const adaDiSalahSatu = (rel) => basis.some((b) => {
    try {
      return fs.existsSync(path.join(b, rel))
        || fs.existsSync(path.join(b, NAMA_FOLDER_KIT, rel))
        || fs.existsSync(path.join(b, 'kit', rel))
    } catch { return false }
  })
  return (filePath) => rakUntukBerkas(filePath).filter(adaDiSalahSatu)
}

// Namespace penghitung "palang seharusnya menahan tapi tak bisa" (session_id kosong). Dibaca doctor.
export const STATE_NAMESPACE_TERLEWAT = 'rakgatelewat'

// Kunci penghitung = turunan PATH PROJECT, bukan global-mesin. Client bertanya "apakah project SAYA
// terlindungi", bukan "apakah mesin ini". Tanpa scope ini, satu project bocor membuat SEMUA project di
// mesin yang sama ikut melaporkan angka yang bukan miliknya — dan angka yang bukan miliknya = laporan
// karangan, persis yang kit ini perangi. Hash sederhana (bukan kriptografis): yang dibutuhkan cuma
// pemisahan antar-folder, dan hasilnya WAJIB lolos sanitasi hook-session-state ([A-Za-z0-9_-], <=64).
export function kunciProject(root) {
  const s = String(root || '').replace(/\\/g, '/').toLowerCase()
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
  return 'p' + h.toString(36)
}

// Catat HANYA kejadian yang BERARTI: jalankan keputusan dengan state kosong dan hitung kalau hasilnya
// `block`. Versi naif yang menghitung SETIAP tool-call akan melaporkan "palang dilewati 300x" padahal
// kejadian berartinya mungkin NOL (satu sesi normal = ratusan Read/Bash yang toh akan allow) - angka
// yang menakut-nakuti tanpa dasar melanggar §2.2 ke arah sebaliknya.
// SENGAJA TANPA field `harness`: payload hook tak pernah menyebut nama alat, jadi menebaknya = nilai
// karangan DI DALAM fitur yang tujuannya memberantas laporan karangan.
// FAIL-OPEN mutlak: apa pun yang meledak di sini TIDAK boleh mengubah keputusan (selalu exit 0).
function catatPalangTerlewat(obj) {
  try {
    const d = decideRak(obj, { dibaca: [], blokir: 0 }, buatPenyaringDisk(obj && obj.cwd))
    if (!d || d.decision !== 'block') return
    const s = readState(STATE_NAMESPACE_TERLEWAT, '', { n: 0, terakhir: '' })
    writeState(STATE_NAMESPACE_TERLEWAT, '', {
      n: (Number(s.n) || 0) + 1,
      // Stempel waktu dipakai doctor untuk bilang "terakhir <tanggal>"; nol info sensitif.
      terakhir: new Date().toISOString().slice(0, 10),
    })
  } catch { /* fail-open: pencatat TIDAK boleh menjatuhkan hook */ }
}

function main() {
  let raw = ''
  try { raw = fs.readFileSync(0, 'utf8') } catch { process.exitCode = 0; return }  // fail-open
  const cleaned = (raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw).trim()       // buang BOM
  let obj = null
  try { obj = cleaned ? JSON.parse(cleaned) : null } catch { process.exitCode = 0; return } // fail-open
  if (!obj) { process.exitCode = 0; return }

  // session_id kosong -> palang MATI TOTAL. Sengaja: engine/hook-session-state.mjs jatuh ke bucket
  // bersama 'nosession', dan untuk BUKTI BACAAN itu bypass nyata (bacaan sesi A memuaskan sesi B).
  // TAPI kesenyapannya yang berbahaya: client mengira dirinya terlindungi padahal palangnya tak pernah
  // hidup. Sejak 2026-08-09 kejadiannya DICATAT supaya `npx lintasai doctor` bisa mengatakannya jujur.
  const sessionId = typeof obj.session_id === 'string' ? obj.session_id : ''
  if (!sessionId) { catatPalangTerlewat(obj); process.exitCode = 0; return } // fail-open TETAP

  const state = readState(STATE_NAMESPACE, sessionId, { dibaca: [], blokir: 0 })
  const d = decideRak(obj, state, buatPenyaringDisk(obj.cwd))

  const berikut = stateBerikutnya(state, d)
  if (berikut) writeState(STATE_NAMESPACE, sessionId, berikut)

  if (d.decision === 'block') return emitBlock(d.reason)
  process.exitCode = 0 // allow (termasuk jalur perekam `Read`)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  process.stdout.on('error', () => {})
  process.stderr.on('error', () => {})
  main()
}
