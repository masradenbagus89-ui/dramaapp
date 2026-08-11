#!/usr/bin/env node
// engine/rak-gate.mjs - "Palang Rak" (PreToolUse hook Claude Code, deterministik, ~0 token).
//
// MASALAH: isi detail standar kit tinggal di rak `rules/` dan dibaca SUKARELA. Uji buta 2026-07-19
// atas 6 prompt client nyata: hanya 8 dari 56 rak relevan dibuka (~14%); tugas RINGAN 0%. Pengingat
// LUNAK (engine/lang-reminder.mjs) tak menggerakkannya - ia mengaku sendiri "tak bisa memaksa".
//
// APA YANG DITEGAKKAN: sebelum edit PERTAMA sebuah berkas berdampak-tinggi (auth/pembayaran/migrasi/
// API/unggah/DevOps-infra), harus ADA CATATAN bahwa rak terkait benar-benar di-`Read` di sesi ini.
// Daftar jenis = engine/rak-pemicu.mjs PETA_BERKAS (sengaja SEMPIT: hanya kerusakan SENYAP - Frontend/SEO
// TIDAK termasuk karena kerusakannya kelihatan, bukan senyap; §4.17 anti-upacara).
//
// 🔑 BUKTI, BUKAN KLAIM (ini pembeda inti dari engine/fact-gate.mjs):
// Hook PreToolUse HANYA menerima {tool_name, tool_input, session_id} - ia tak pernah melihat prosa AI.
// Jadi syarat "sebutkan rak yang kau baca" MUSTAHIL diverifikasi mesin; satu-satunya implementasinya
// adalah "blokir sekali lalu izinkan retry apa pun" - persis lubang yang masih ada di fact-gate.mjs:96-99
// (path ditandai `gated` saat MEMBLOKIR, jadi retry telanjang lolos tanpa fakta apa pun disajikan).
// Palang ini memakai TANDA-TERIMA `Read`: matcher mencakup `Read`, tiap pembacaan rak dicatat ke state
// sesi. Yang dicatat = PEMANGGILAN TOOL, jadi tak bisa di-bluff. Ini memenuhi ADR-008 Keputusan #3
// ("penilaian WAJIB DETERMINISTIK - robot memeriksa sinyal nyata, BUKAN AI menyatakan 'sudah'").
//
// 🔑 MENEGAKKAN "DIBACA", TAK PERNAH "DIPATUHI":
// isi rak = Tingkat-2 dan BOLEH kalah oleh kenyataan kode (sec.4.17). Pesan palang WAJIB menyatakan itu
// (dikunci tes) supaya palang ini tak pernah berubah jadi "rak = hukum".
//
// BATAS JUJUR (tulis terang-terangan, jangan diklaim lebih):
//  - `Bash cat`/`Grep` TIDAK dihitung sebagai bacaan dan TIDAK diblokir. Ini pagar KEPATUHAN, bukan
//    pagar KEAMANAN. Yang menjaga aksi berbahaya tetap engine/risk-gate.js.
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
import { isLowValue, emitBlock } from './fact-gate.mjs'
import { rakUntukBerkas } from './rak-pemicu.mjs'

// Diekspor supaya adaptor Kimi (engine/kimi/rak-gate-kimi.mjs) memakai LACI STATE YANG SAMA, bukan
// menyalin string-nya. Satu sesi = satu laci, apa pun otak yang dipakai.
export const STATE_NAMESPACE = 'rakgate'
export const MAKS_BLOKIR_SESI = 2 // katup pelepas keras: refactor besar tak boleh jadi upacara
// F2 (ADR-027 Tugas 12): rak kini hidup di DUA rumah - rules/** (rak lama) DAN skills/**/SKILL.md
// (paket-stack + divisi yang sudah dimigrasi). Perluas ATOMIK bersama repoint PETA_BERKAS ke skills/,
// kalau tidak palang menuntut baca rak yang pembacaannya tak pernah tercatat -> mati senyap (dijaga
// tests/rak-gate.test.mjs "invarian rute").
const RAK_RE = /(?:rules|skills)[/\\][\w.\-/\\]*\.md$/i
const INDEX_RE = /rules[/\\]INDEX\.md$/i

// --- Fungsi MURNI (bisa diuji tanpa disk) --------------------------------------------------------

export function adalahBacaanRak(filePath) { return RAK_RE.test(String(filePath || '')) }
export function adalahIndex(filePath) { return INDEX_RE.test(String(filePath || '')) }

export function pesanPalang(namaBerkas, rakWajib) {
  return [
    `[Palang Rak] Berkas "${namaBerkas}" menyentuh titik risiko, tapi belum ada rak lintasAI yang dibaca di sesi ini.`,
    // Kata "buka/baca" sengaja NETRAL-OTAK: alat baca Claude bernama `Read`, di Kimi bisa `read_file`.
    'Sebelum edit pertama: buka (baca) SATU rak paling relevan di bawah, lalu ulangi operasi yang sama.',
    ...rakWajib.map((r) => `- ${r}`),
    'Isi rak TIDAK mengikat: bentrok dengan kenyataan kode -> kenyataan kode MENANG (§4.17).',
    'Cukup sebut alasan menyimpang + bukti berkas:baris. Tak ada yang cocok -> buka rules/INDEX.md.',
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

  // (1) PEREKAM: Read atas rak rules/**.md -> catat tanda-terima, selalu izinkan.
  if (/^Read$/i.test(tool)) {
    if (filePath && adalahBacaanRak(filePath)) return { decision: 'allow', catat: normalkan(filePath) }
    return { decision: 'allow' }
  }

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

// Rak nyata di disk. Klien menaruhnya di `.claude-kit/rules/...`; repo kit di `rules/...`.
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
  const adaDiSalahSatu = (rel) => basis.some((b) => {
    try { return fs.existsSync(path.join(b, rel)) || fs.existsSync(path.join(b, '.claude-kit', rel)) }
    catch { return false }
  })
  return (filePath) => rakUntukBerkas(filePath).filter(adaDiSalahSatu)
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
  const sessionId = typeof obj.session_id === 'string' ? obj.session_id : ''
  if (!sessionId) { process.exitCode = 0; return }

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
