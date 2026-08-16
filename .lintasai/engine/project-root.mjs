#!/usr/bin/env node
// engine/project-root.mjs - Pencari AKAR PROJECT yang sesungguhnya (Celah 4, ADR-024).
//
// MASALAH YANG DIPECAHKAN (terverifikasi 2026-07-20):
//   `bin/lintasai.js:328,370` menyuntik `--project-root <process.cwd()>` -- yaitu FOLDER TEMPAT
//   PERINTAH DIJALANKAN, bukan akar project. `setup-pola-b.mjs` memakainya apa adanya. Grep
//   `--show-toplevel` di installer = NOL; yang ada cuma `rev-parse --is-inside-work-tree`
//   (memeriksa APAKAH di dalam repo, BUKAN mencari akarnya).
//
//   Akibatnya kalau client menjalankan pemasang "di tengah-tengah project" -- mis. dari
//   `bigseo/apps/web/` -- kit mendarat di `bigseo/apps/web/.claude-kit/`. Seluruh berkas ikut
//   ke sana: CLAUDE.md, AGENTS.md, .claude/settings.json. Lalu saat alat AI dibuka dari
//   `bigseo/` (akar sebenarnya):
//     - CLAUDE.md di subfolder TIDAK dimuat di awal sesi -> aturan lintasAI tak termuat;
//     - .claude/settings.json tak terbaca -> hook tak terdaftar;
//     - $CLAUDE_PROJECT_DIR = bigseo/ -> hook menunjuk bigseo/.claude-kit/engine/... yang tak ada
//       -> mati diam-diam (fail-open exit 0).
//   Client mengira lintasAI aktif padahal tidak -- TANPA satu pun pesan error.
//
// YANG SENGAJA TIDAK DILAKUKAN: `$CLAUDE_PROJECT_DIR` TIDAK diganti dengan jalur rakitan
// sendiri. Ia satu-satunya pengganti-jalur resmi Claude Code, dan menggantinya berisiko lebih
// besar daripada masalah yang dipecahkan. Yang dilakukan modul ini: mendaratkan kit di folder
// yang benar SEJAK AWAL, lalu MEMBERI TAHU kalau meleset.
//
// URUTAN PENCARIAN (berhenti di jawaban pertama):
//   1. `git rev-parse --show-toplevel` -- paling tepercaya kalau project = repo git.
//   2. Naik dari folder awal mencari berkas penanda akar: package.json / composer.json /
//      go.mod / pyproject.toml. Yang TERJAUH (paling atas) menang -- di monorepo, package.json
//      milik paket anak ada di bawah, milik akar ada di atas.
//   3. Menyerah -> pakai folder awal apa adanya (cwd). Jujur, bukan tebakan.
//
// Pustaka (di-import modul lain), bukan perkakas mandiri -- tak butuh "gagang" perintah.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

// NAMA FOLDER KIT di project client — SATU-SATUNYA sumber kebenaran.
//
// KENAPA konstanta, bukan literal: nama ini dulu di-hardcode di 118 berkas (544 kemunculan). Tiap
// perubahan soal LOKASI kit harus disunting di ratusan tempat, dan satu yang terlewat = kit dicari
// di folder yang salah lalu gagal DIAM-DIAM (bukan error yang terlihat). Ditaruh di modul ini karena
// project-root.mjs memang modul "di mana kit & project berada", dan ia pure library (cuma import
// fs/os/path/child_process) sehingga siapa pun boleh mengimpornya tanpa risiko circular import.
// SENGAJA di modul yang sudah ada: menambah berkas kit/engine/*.mjs baru memerahkan 4 penjaga
// distribusi (kit-files / peta-gen / paritas-distribusi / package-bundle).
export const NAMA_FOLDER_KIT = '.lintasai'

// Nama folder versi LAMA — HANYA untuk mengenali & memigrasikan pemasangan lama. JANGAN dipakai
// untuk menulis/membuat apa pun; jalur tulis selalu NAMA_FOLDER_KIT.
export const NAMA_FOLDER_KIT_LAMA = '.claude-kit'

// Semua nama folder kit yang HARUS DIKENALI saat membaca disk, urut prioritas (baru dulu).
// Di-dedupe supaya saat nama baru == nama lama (masa transisi) tak ada pemeriksaan dobel.
// BACA pakai daftar ini; TULIS selalu pakai NAMA_FOLDER_KIT.
export const NAMA_FOLDER_KIT_DIKENAL = [...new Set([NAMA_FOLDER_KIT, NAMA_FOLDER_KIT_LAMA])]

// Apakah `nama` (satu segmen folder, bukan path penuh) adalah folder kit — nama baru ATAU lama?
// Dipakai hard-stop update/uninstall: menolak nama lama = migrasi tak akan pernah bisa jalan
// (hard-stop menyala sebelum migrasi sempat me-rename) alias masalah ayam-telur.
export function adalahFolderKit(nama) {
  return NAMA_FOLDER_KIT_DIKENAL.includes(String(nama))
}

// Apakah `nama` adalah FOLDER CADANGAN kit (`<folder-kit>.backup-<cap-waktu>`)?
// Wajib kenal nama lama juga: cadangan yang dibuat SEBELUM rename sudah duduk di disk client.
// Kalau cuma kenal nama baru, cadangan lama tak pernah dirotasi -> menumpuk selamanya.
export function adalahCadanganKit(nama) {
  const n = String(nama)
  return NAMA_FOLDER_KIT_DIKENAL.some((k) => n.startsWith(`${k}.backup-`))
}

/**
 * Cari folder kit yang BENAR-BENAR ADA di sebuah akar project.
 *
 * Urutan: nama baru menang lebih dulu, baru nama lama. Kalau KEDUANYA ada, itu keadaan ambigu
 * (mis. migrasi berhenti di tengah) — dikembalikan apa adanya lewat `ambigu:true` supaya pemanggil
 * bisa BERHENTI dan bertanya, bukan menebak folder mana yang benar.
 *
 * @returns {{path:string, nama:string, lama:boolean, ambigu:boolean}|null} null kalau tak satu pun ada.
 */
export function cariFolderKit(projectRoot, opts = {}) {
  const adaSync = opts.adaSync || ((p) => fs.existsSync(p))
  const ketemu = []
  for (const nama of NAMA_FOLDER_KIT_DIKENAL) {
    const p = path.join(projectRoot, nama)
    if (adaSync(p)) ketemu.push({ path: p, nama, lama: nama !== NAMA_FOLDER_KIT })
  }
  if (ketemu.length === 0) return null
  return { ...ketemu[0], ambigu: ketemu.length > 1 }
}

// Berkas penanda akar project per-stack. Urutan tak berpengaruh (yang menang = yang TERJAUH ke atas).
export const PENANDA_AKAR = ['package.json', 'composer.json', 'go.mod', 'pyproject.toml']

// Batas jumlah tingkat yang dinaiki. Pengaman anti-loop di path aneh (junction/symlink melingkar).
const MAKS_NAIK = 40

function jalurNyata(p) {
  try {
    return fs.realpathSync(p)
  } catch {
    return path.resolve(p)
  }
}

// --- Langkah 1: tanya git ---
// Dipisah supaya bisa dimatikan di tes (opts.gitLookup) tanpa mengotori repo penguji.
function cariLewatGit(mulaiDir) {
  const r = spawnSync('git', ['-C', mulaiDir, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' })
  if (r.error || r.status !== 0) return null
  const keluar = String(r.stdout || '').trim()
  if (!keluar) return null
  if (!fs.existsSync(keluar)) return null
  return jalurNyata(keluar)
}

// --- Langkah 2: naik cari berkas penanda ---
// Mengembalikan penanda TERJAUH (paling atas), bukan yang terdekat.
// KENAPA terjauh: di monorepo `bigseo/apps/web/package.json` ADA, tapi akar sesungguhnya
// `bigseo/package.json`. Ambil yang terdekat = mengulang bug yang sedang diperbaiki.
//
// TAPI "terjauh" tanpa batas itu berbahaya, dan ini bukan kekhawatiran teoretis: satu
// `package.json` nyasar di folder home (sisa `npm install` yang salah folder - kejadian umum)
// akan membuat SELURUH project di bawahnya dianggap berakar di home. Kit lalu mendarat di
// home. Karena itu pemanjatan BERHENTI SEBELUM folder home dan sebelum akar drive; keduanya
// tak pernah boleh jadi jawaban.
//
// Batas ini hanya berlaku untuk jalur penanda. Project yang berupa repo git sudah dijawab
// Langkah 1 dengan sumber yang jauh lebih tepercaya.
function cariLewatPenanda(mulaiDir) {
  let dir = jalurNyata(mulaiDir)
  const home = jalurNyata(os.homedir())
  let temuanTerjauh = null
  for (let i = 0; i < MAKS_NAIK; i++) {
    const induk = path.dirname(dir)
    const diAkarDrive = induk === dir
    // Folder home & akar drive TIDAK pernah dianggap akar project (lihat catatan di atas).
    if (dir !== home && !diAkarDrive) {
      for (const penanda of PENANDA_AKAR) {
        if (fs.existsSync(path.join(dir, penanda))) {
          temuanTerjauh = { root: dir, penanda }
          break
        }
      }
    }
    if (diAkarDrive || induk === home) break
    dir = induk
  }
  return temuanTerjauh
}

/**
 * Cari akar project yang sesungguhnya dari sebuah folder awal.
 *
 * @param {string} mulaiDir folder tempat perintah dijalankan (biasanya process.cwd()).
 * @param {object} [opts]
 * @param {boolean} [opts.pakaiGit=true] matikan untuk menguji jalur penanda saja.
 * @returns {{root:string, cara:'git'|'penanda'|'cwd', penanda:string|null, mulai:string, meleset:boolean}}
 *   `meleset` = true kalau akar terdeteksi BEDA dari folder awal -- inilah pemicu "jangan pilih
 *   diam-diam": pemanggil WAJIB bertanya, bukan memilih sendiri.
 */
export function findProjectRoot(mulaiDir, opts = {}) {
  const pakaiGit = opts.pakaiGit !== false
  const mulai = jalurNyata(mulaiDir)

  if (pakaiGit) {
    const viaGit = cariLewatGit(mulai)
    if (viaGit) {
      return { root: viaGit, cara: 'git', penanda: null, mulai, meleset: viaGit !== mulai }
    }
  }

  const viaPenanda = cariLewatPenanda(mulai)
  if (viaPenanda) {
    return {
      root: viaPenanda.root,
      cara: 'penanda',
      penanda: viaPenanda.penanda,
      mulai,
      meleset: viaPenanda.root !== mulai,
    }
  }

  return { root: mulai, cara: 'cwd', penanda: null, mulai, meleset: false }
}

/**
 * Susun penjelasan bahasa awam saat akar project BEDA dari folder sekarang.
 * Dipakai pemasang (berhenti aman) DAN `doctor` (laporan) supaya kata-katanya seragam.
 *
 * SENGAJA berupa teks, bukan popup: pemasang versi Node berjalan OTOMATIS PENUH dan tak punya
 * input konsol (ADR-004 membuang popup GUI dari installer). Polanya meniru keputusan keamanan
 * `update` di `bin/lintasai.js:21-25` -- default-AMAN-batal + bendera eksplisit, BUKAN popup.
 * Popup pilihannya ditampilkan AI di chat setelah membaca pesan ini.
 */
export function pesanAkarMeleset(hasil, opts = {}) {
  const perintah = opts.perintah || 'npx lintasai init'
  const baris = []
  baris.push('')
  baris.push('=== BERHENTI AMAN: folder pemasangan belum dipastikan ===')
  baris.push('')
  baris.push(`Kamu menjalankan perintah ini dari : ${hasil.mulai}`)
  baris.push(`Akar project yang terdeteksi      : ${hasil.root}`)
  baris.push(`Dasar deteksi                     : ${hasil.cara === 'git' ? 'folder induk repo git' : `berkas penanda "${hasil.penanda}"`}`)
  baris.push('')
  baris.push('Kenapa ini dihentikan, bukan ditebak:')
  baris.push('  lintasAI dimuat dari folder tempat ia dipasang. Kalau kit mendarat di subfolder')
  baris.push('  sementara alat AI-mu dibuka dari akar project, aturan lintasAI TIDAK termuat dan')
  baris.push('  seluruh pengamannya tidak jalan - tanpa satu pun pesan error. Kamu akan mengira')
  baris.push('  lintasAI aktif padahal tidak.')
  baris.push('')
  baris.push('  Memasang di subfolder itu SAH (di monorepo kadang memang disengaja). Yang tidak')
  baris.push('  boleh adalah memasangnya di sana tanpa kamu tahu.')
  baris.push('')
  baris.push('Pilih satu, lalu jalankan ulang:')
  baris.push('')
  baris.push(`  [1] Pasang di AKAR PROJECT (disarankan) - ${hasil.root}`)
  baris.push(`      ${perintah} --project-root-mode=akar`)
  baris.push('')
  baris.push(`  [2] Pasang di FOLDER SEKARANG - ${hasil.mulai}`)
  baris.push(`      ${perintah} --project-root-mode=folder-sekarang`)
  baris.push('')
  baris.push('Sesudah pasang, buka alat AI-mu (Claude Code / Kimi Code / Codex / Cursor) dari')
  baris.push(`folder tempat ${NAMA_FOLDER_KIT}/ berada.`)
  baris.push('')
  return baris.join('\n')
}

/**
 * Terapkan pilihan mode ke hasil pencarian.
 * @returns {{root:string, butuhTanya:boolean}} `butuhTanya` = true berarti pemanggil WAJIB berhenti aman.
 */
export function terapkanModeAkar(hasil, mode) {
  if (mode === 'akar') return { root: hasil.root, butuhTanya: false }
  if (mode === 'folder-sekarang') return { root: hasil.mulai, butuhTanya: false }
  // Tanpa mode eksplisit: hanya boleh lanjut kalau memang tak ada perbedaan.
  return { root: hasil.mulai, butuhTanya: hasil.meleset }
}
