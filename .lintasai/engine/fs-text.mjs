#!/usr/bin/env node
// engine/fs-text.mjs - Helper teks + berkas bersama (versi Node). SATU TEMPAT helper baca/tulis kecil.
//
// WHY (RAPIKAN/DRY, BUKAN perbaikan bug): pola helper kecil yang sama dulu disalin di banyak tempat -
// `stripBom` kembar (~3 fungsi + ~10 cek inline) + `readTextSafe`/`isFile`/`isDir`/`pathExists`/
// `writeUtf8NoBom` masing-masing 2-3 salinan byte-identik tersebar di engine/ + alat inti. Disatukan ke
// SATU tempat supaya kalau perilakunya perlu berubah, cukup ubah di sini -> tak ada salinan yang
// ketinggalan (audit konsolidasi A6 2026-06-23 untuk stripBom; diperluas audit fungsi-kembar 2026-06-25).
// Semua pemanggil SUDAH berperilaku sama sebelumnya, jadi perilaku TIDAK berubah - ini murni rapi-rapi.
//
// Penjaga anti-rot: tests/fs-text.test.mjs memindai SEMUA berkas .mjs dan MENOLAK (tes merah) kalau ada
// yang mendefinisikan ulang `function <helper>` di luar berkas ini -> duplikasi tak bisa diam-diam balik
// (penting untuk kerja TIM: anggota baru yang copy-paste helper ini langsung ketahuan sebelum rilis).
import fs from 'node:fs'
import path from 'node:path'

// stripBom: buang penanda byte-order (U+FEFF) tak-kasat-mata di AWAL teks. Editor Windows (Notepad /
// VS Code "UTF-8 with BOM") bisa menyisipkannya saat menyimpan ulang; JSON.parse tersedak BOM -> melempar.
// Aman pada null/undefined/'' (tak melempar) -> boleh dipakai langsung pada hasil baca
// yang mungkin kosong. Catatan: 0xfeff ditulis sebagai HEX (bukan karakter mentah) supaya gerbang
// unicode-safety repo tak menolak berkas ini (larangan karakter tak-kasat ter-commit).
export function stripBom(s) {
  return (s && s.charCodeAt(0) === 0xfeff) ? s.slice(1) : s
}

// readTextSafe: baca berkas UTF-8 + buang BOM, return null kalau gagal (berkas tak ada / tak terbaca).
// Tanpa buang-BOM, JSON.parse Node tersedak BOM (package.json
// tulisan editor Windows sering ber-BOM -> deteksi salah, BEDA dari PS; terbukti uji-banding Gelombang 2).
export function readTextSafe(p) {
  try { return stripBom(fs.readFileSync(p, 'utf8')) } catch { return null }
}

// readText: baca berkas UTF-8 + buang BOM, MELEMPAR kalau gagal (berkas tak ada/tak terbaca).
// Beda dari readTextSafe (yang menelan error jadi null): pemanggil readText memang ingin kegagalan
// terlihat — mereka membungkusnya sendiri dengan try/catch berpesan-jelas.
// Menyatukan 2 salinan byte-identik (dulu di preflight + penulis cap-versi; kini keduanya alat MAINTAINER
// di <repo>/tools/, tak dikirim ke client) — utang teknis yang dicatat di daftar-izin
// tests/no-duplicate-functions.test.mjs, dibayar saat preflight dipecah.
export function readText(p) {
  return stripBom(fs.readFileSync(p, 'utf8')) // cermin ReadAllText UTF-8 (buang BOM)
}

// readPackageJson: baca + urai package.json sebuah akar project, dengan kontrak KAYA supaya pemanggil
// bisa membedakan "tak ada" dari "ada tapi rusak" (dua kondisi yang butuh pesan berbeda ke user).
// Return { present, ok, pkg, error }:
//   { false, true,  null, null }      -> tak ada package.json (bukan error)
//   { true,  false, null, '<alasan>' }-> ada tapi tak terbaca / bukan JSON valid / akarnya bukan objek
//   { true,  true,  {...}, null }     -> terbaca
// Pemanggil yang cuma butuh "objek pkg atau kosong" tinggal membungkusnya (lihat pkgOrEmpty di
// <repo>/tools/preflight-core.mjs — alat maintainer). Menyatukan salinan lama di
// engine/project-manifest.mjs + preflight.
export function readPackageJson(repoRoot) {
  const pkgPath = path.join(repoRoot, 'package.json')
  if (!fs.existsSync(pkgPath)) return { present: false, ok: true, pkg: null, error: null }
  let raw
  try { raw = stripBom(fs.readFileSync(pkgPath, 'utf8')) }
  catch (e) { return { present: true, ok: false, pkg: null, error: `tak terbaca (${e.message})` } }
  let pkg
  try { pkg = JSON.parse(raw) }
  catch (e) { return { present: true, ok: false, pkg: null, error: `bukan JSON valid (${e.message})` } }
  if (pkg === null || typeof pkg !== 'object' || Array.isArray(pkg)) {
    return { present: true, ok: false, pkg: null, error: 'akar package.json bukan objek' }
  }
  return { present: true, ok: true, pkg, error: null }
}

// pathExists: cek ada/tidak (file ATAU folder), senyap (tak melempar).
export function pathExists(p) {
  try { fs.accessSync(p); return true } catch { return false }
}

// isDir: cek "ini folder?", senyap.
export function isDir(p) {
  try { return fs.statSync(p).isDirectory() } catch { return false }
}

// isFile: cek "ini berkas?", senyap.
export function isFile(p) {
  try { return fs.statSync(p).isFile() } catch { return false }
}

// writeUtf8NoBom: tulis berkas UTF-8 TANPA BOM (fs default utf8 = tanpa BOM).
// Pasangan-tulis dari readTextSafe (yang membuang BOM saat baca).
export function writeUtf8NoBom(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8')
}

// readTemplate: baca berkas template UTF-8 + buang BOM. BEDA dari readTextSafe -> MELEMPAR kalau berkas
// hilang (template wajib ada; bukan opsional). Guard `== null` dipertahankan apa adanya (perilaku sama
// dgn 2 salinan lama di agents-md.mjs + template-deploy.mjs sebelum disatukan).
export function readTemplate(sourcePath) {
  let content = fs.readFileSync(sourcePath, 'utf8')
  if (content == null) content = ''
  return stripBom(content)
}

// eqCI: banding 2 string TANPA peka huruf-besar/kecil.
// Dipakai untuk path/hash/nama berkas yang boleh beda hanya kapitalnya (mis. 'Foo.md' = 'foo.md').
export function eqCI(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase()
}

// backupStamp: cap-waktu LOKAL 'yyyyMMdd-HHmmss' untuk nama berkas/folder cadangan.
// Pemanggil oper Date sendiri (mis. backupStamp(new Date())) -> bisa dibuat deterministik saat uji.
// Menyatukan 5 salinan lama (formatStamp x3 + timestampSuffix + defaultBackupSuffix) yang formatnya sama.
export function backupStamp(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

// isSymlinkLike: cek apakah path = symbolic-link/junction (lstat, senyap -> false kalau tak ada/error).
// Dipakai sebagai penjaga TOCTOU cepat (cek-sesaat-sebelum-tulis/hapus, menutup vektor swap-ke-junction)
// di uninstall.mjs + rollback.mjs. Catatan KEAMANAN: ini lapis SEMPIT (cuma lstat berkas itu sendiri);
// pelengkap pemeriksa yang menelusur induk (lihat testPathsHaveReparsePoint) - bukan pengganti.
export function isSymlinkLike(p) {
  try { return fs.lstatSync(p).isSymbolicLink() } catch { return false }
}
