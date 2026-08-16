#!/usr/bin/env node
// engine/reparse-guard.mjs - Penjaga reparse-point (junction/symlink) BERSAMA untuk uninstall + rollback.
//
// WHY (DRY + keamanan): fungsi ini dulu DISALIN byte-identik (beda HANYA prefix berkas-sementara) di
// uninstall.mjs + engine/rollback.mjs (~35 baris kode keamanan). Disatukan ke 1 sumber (audit fungsi-kembar
// 2026-06-25) supaya kalau LOGIKA keamanannya perlu berubah, cukup 1 tempat. uninstall.mjs + rollback.mjs
// MENG-IMPOR + me-RE-EXPORT dari sini (tanda tangan + perilaku TIDAK berubah untuk pemanggil).
//
// v2.0.0 (D4, keputusan owner): kit 100% Node.
// Deteksi reparse-point (symlink/junction) kini NODE MURNI: fs.lstatSync().isSymbolicLink()
// + ancestor-walk (cek target + tiap folder induk sampai projectRoot). Fail-secure DUA-LAPIS:
//   (1) per-path: lstat gagal -> tandai true (anggap berbahaya, defensive fail-secure);
//   (2) jalur Node gagal fatal tak terduga -> testPathsHaveReparsePoint MELEMPAR (gagal-AMAN/fail-closed):
//       pemanggil (uninstall/rollback) MEMBATALKAN operasi -> lebih baik tak menghapus/memulihkan
//       daripada salah ikut junction yang menunjuk ke luar root.
// CATATAN PARITAS JUJUR: lstat menangkap symlink + junction (vektor serangan "junction ke luar root").
// Jenis reparse SANGAT langka (mis. placeholder cloud OneDrive) yang attribute-bit .NET dulu tandai bisa
// TIDAK ditandai Node - itu BUKAN vektor "junction ke luar root", jadi keamanan anti-serangan tetap.
import fs from 'node:fs'
import path from 'node:path'
import { NAMA_FOLDER_KIT } from './project-root.mjs'

// --- Jalur utama: NODE MURNI ---
// Untuk 1 path: apakah ia ATAU salah satu folder induknya (sampai projectRoot) = reparse-point
// (symlink/junction)? Struktur ancestor-walk:
//   - path ADA + symlink/junction -> true; lalu walk dari folder-nya (folder: dirinya; file: induknya).
//   - path TIDAK ADA -> walk dari folder induk (induk bisa reparse-point).
//   - lstat gagal di mana pun -> true (defensive).
//   - berhenti naik saat mencapai root drive ATAU saat keluar projectRoot.
function pathHasReparseNode(fullPath, rootCanonical) {
  const rootClean = String(rootCanonical || '').replace(/[\\/]+$/, '')
  const abs = path.resolve(String(fullPath))
  let current
  if (fs.existsSync(abs)) {
    let st
    try { st = fs.lstatSync(abs) } catch { return true }
    if (st.isSymbolicLink()) return true
    current = st.isDirectory() ? abs : path.dirname(abs)
  } else {
    current = path.dirname(abs)
  }
  while (current) {
    const driveRoot = path.parse(current).root
    if (current === driveRoot) break // mencapai root drive
    let st
    try { st = fs.lstatSync(current) } catch { return true }
    if (st.isSymbolicLink()) return true
    const parent = path.dirname(current)
    if (!parent || parent === current) break
    // Berhenti kalau parent lebih pendek dari projectRoot (keluar root).
    if (parent.length < rootClean.length) break
    current = parent
  }
  return false
}

// Jalur utama Node: petakan tiap path -> reparse? tanpa spawn apa pun.
export function testReparseNode(paths, projectRoot) {
  const result = new Map()
  for (const p of paths) result.set(p, pathHasReparseNode(p, projectRoot))
  return result
}

// testPathsHaveReparsePoint: untuk tiap path absolut, apakah ia junction/symlink (reparse-point)?
// Return Map<absPath, boolean>. Input kosong -> Map kosong. JALUR = Node murni (v2.0.0). Kalau jalur
// Node gagal FATAL tak terduga -> LEMPAR (fail-closed): pemanggil membatalkan operasi demi keamanan.
// (Param ke-3 kitDir DIPERTAHANKAN untuk kompat tanda-tangan pemanggil lama; kini tak dipakai.)
export function testPathsHaveReparsePoint(absPaths, projectRoot) {
  const paths = (absPaths || []).filter((p) => p != null && String(p).trim() !== '')
  if (paths.length === 0) return new Map()
  try {
    return testReparseNode(paths, projectRoot)
  } catch (e) {
    throw new Error(
      `Batal demi keamanan: gagal memverifikasi reparse-point (junction/symlink) lewat jalur Node ` +
      `(${e.message}). Operasi DIHENTIKAN (gagal-aman) - tidak ada berkas yang dihapus/dipulihkan. ` +
      `Cek folder ${NAMA_FOLDER_KIT}/ dari junction/symlink mencurigakan, lalu ulangi.`,
    )
  }
}
