#!/usr/bin/env node
// lib/update-lock.mjs - kunci "cuma boleh ada 1 update jalan" per project.
//
// MASALAH (audit ketahanan 2026-07-15): tak ada satu pun penguncian di jalur update. Kalau 2 update
// jalan bersamaan (user klik 2x, atau AI jalan barengan user, atau terminal ke-2 lupa ditutup),
// keduanya berebut folder yang sama: proses A menyisihkan .claude-kit jadi cadangan-A, proses B lalu
// menyisihkan hasil kerja A jadi cadangan-B -> kit lama asli terkubur di cadangan-A, dan pemasang
// keduanya menulis catatan-pasang bersamaan (baca-gabung-tulis TIDAK atomik = lost update).
// Selama ini yang menyelamatkan cuma KEBETULAN: Windows biasanya menolak rename folder yang lagi
// dipakai. Kebetulan bukan pengaman.
//
// CARA: `fs.mkdirSync` = operasi ATOMIK di Windows maupun POSIX - kalau folder sudah ada ia MELEMPAR
// EEXIST. Jadi "siapa yang berhasil mkdir, dia yang pegang kunci". Tak perlu dependensi.
//
// KUNCI BASI: proses bisa mati tanpa sempat melepas kunci (Ctrl-C, listrik padam, task-kill). Kunci
// yang tak pernah kedaluwarsa = project TERKUNCI SELAMANYA, dan staff non-programmer tak akan tahu
// harus menghapus folder apa. Maka: kunci lebih tua dari `staleMinutes` DIAMBIL ALIH otomatis + dilapor
// terus terang. Ambang default sengaja longgar (30 menit) - update normal hitungan detik, jadi kunci
// setua itu hampir pasti bangkai; tapi cukup panjang supaya update lambat di jaringan/disk lemot tak
// dirampok proses lain.
//
// FAIL-OPEN yang DISENGAJA: kalau kunci tak bisa dibuat karena alasan LAIN (disk penuh, izin folder),
// JANGAN memblokir update - pengaman ini mencegah tabrakan, dan tabrakan jauh lebih jarang daripada
// "kit tak bisa di-update sama sekali". Ia lapisan tambahan, bukan gerbang keselamatan utama
// (yang utama = siapkan-periksa-tukar di lib/kit-staging.mjs, yang aman walau tanpa kunci).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const LOCK_DIR_NAME = '.claude-kit.lock'
const INFO_FILE = 'info.json'

// Umur kunci dalam menit; null kalau tak terbaca.
function lockAgeMinutes(lockDir) {
  try {
    const st = fs.statSync(lockDir)
    return (Date.now() - st.mtimeMs) / 60000
  } catch {
    return null
  }
}

export function readLockInfo(lockDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(lockDir, INFO_FILE), 'utf8'))
  } catch {
    return null
  }
}

// Ambil kunci. Return { ok, lockDir, release(), takenOver, heldBy, ageMinutes, reason }.
//  ok:true           -> kunci dipegang; WAJIB panggil release() saat selesai.
//  ok:false          -> ADA update lain yang masih jalan; pemanggil harus BERHENTI (jangan paksa).
//  reason:'gagal-*'  -> fail-open: kunci tak bisa dipasang karena alasan lingkungan; pemanggil boleh lanjut.
export function acquireUpdateLock(projectRoot, { staleMinutes = 30, now = Date.now() } = {}) {
  const lockDir = path.join(projectRoot, LOCK_DIR_NAME)
  const tulisInfo = () => {
    try {
      fs.writeFileSync(
        path.join(lockDir, INFO_FILE),
        `${JSON.stringify({ pid: process.pid, startedAt: new Date(now).toISOString() }, null, 2)}\n`,
        'utf8',
      )
    } catch { /* info = kenyamanan diagnosa; ketiadaannya tak membatalkan kunci */ }
  }
  const buatRelease = () => () => {
    try {
      fs.rmSync(lockDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
      return { ok: true, error: null }
    } catch (e) {
      // JUJUR: jangan telan. Kunci tertinggal = update berikutnya tertahan sampai kedaluwarsa.
      return { ok: false, error: e.message }
    }
  }

  try {
    fs.mkdirSync(lockDir) // ATOMIK: pemenang tunggal
    tulisInfo()
    return { ok: true, lockDir, release: buatRelease(), takenOver: false, heldBy: null, ageMinutes: 0, reason: 'dipegang' }
  } catch (e) {
    if (e.code !== 'EEXIST') {
      // Bukan tabrakan - lingkungan bermasalah. FAIL-OPEN (lihat kontrak di kepala berkas).
      return { ok: true, lockDir: null, release: () => ({ ok: true, error: null }), takenOver: false, heldBy: null, ageMinutes: null, reason: `gagal-pasang-kunci: ${e.message}` }
    }
  }

  // Kunci sudah ada -> milik proses hidup, atau bangkai?
  const umur = lockAgeMinutes(lockDir)
  const info = readLockInfo(lockDir)
  if (umur !== null && umur >= staleMinutes) {
    try {
      fs.rmSync(lockDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
      fs.mkdirSync(lockDir)
      tulisInfo()
      return { ok: true, lockDir, release: buatRelease(), takenOver: true, heldBy: info, ageMinutes: umur, reason: 'ambil-alih-kunci-basi' }
    } catch (e) {
      return { ok: false, lockDir, release: () => ({ ok: true, error: null }), takenOver: false, heldBy: info, ageMinutes: umur, reason: `gagal-ambil-alih: ${e.message}` }
    }
  }

  return { ok: false, lockDir, release: () => ({ ok: true, error: null }), takenOver: false, heldBy: info, ageMinutes: umur, reason: 'update-lain-sedang-jalan' }
}

// Pesan bahasa awam saat kunci ditolak. Dipisah dari logika supaya bisa diuji + dipakai ulang.
export function pesanKunciDitolak(hasil) {
  const baris = []
  baris.push('BERHENTI: sepertinya ada proses update LAIN yang sedang berjalan di project ini.')
  if (hasil.heldBy && hasil.heldBy.startedAt) baris.push(`  Update itu mulai: ${hasil.heldBy.startedAt}`)
  if (hasil.ageMinutes != null) baris.push(`  Umur penanda: ~${Math.max(0, Math.round(hasil.ageMinutes))} menit`)
  baris.push('')
  baris.push('Dua update berjalan bersamaan bisa saling menimpa dan bikin kit kacau, jadi yang ini')
  baris.push('dihentikan. Kit kamu TIDAK diubah - aman.')
  baris.push('')
  baris.push('Yang bisa kamu lakukan:')
  baris.push('  1. Tunggu update yang satunya selesai, lalu jalankan lagi.')
  baris.push('  2. Kalau yakin tak ada update lain (mis. komputer sempat mati di tengah update),')
  baris.push(`     hapus folder penanda ini lalu ulangi: ${hasil.lockDir ?? '.claude-kit.lock'}`)
  baris.push('     (Penanda yang lebih tua dari 30 menit otomatis dianggap bangkai dan diambil alih.)')
  return baris.join('\n')
}

function main() {
  const projectRoot = process.argv[2] || process.cwd()
  const r = acquireUpdateLock(projectRoot)
  if (!r.ok) {
    console.error(pesanKunciDitolak(r))
    process.exitCode = 1
    return
  }
  console.log(`OK - kunci diambil (${r.reason}) di ${r.lockDir ?? '(dilewati)'}`)
  r.release()
  console.log('OK - kunci dilepas.')
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
