// engine/gate-shared.mjs - Potongan bersama untuk hook PreToolUse (deterministik, ~0 token).
//
// KENAPA ADA: dua kemampuan kecil di bawah dipakai lebih dari satu palang, jadi rumahnya harus netral.
// Sebelumnya keduanya menumpang di engine/fact-gate.mjs (Palang Fakta) - artinya palang yang masih
// hidup ikut mati kalau Palang Fakta dicabut. Dipindah ke sini saat Palang Fakta dipensiunkan
// (pagar opt-in yang tak pernah dinyalakan client), supaya engine/rak-gate.mjs (DEFAULT NYALA) berdiri
// di atas modul yang tak punya nasib politik.
//
// Dijaga tests/no-duplicate-functions.test.mjs: JANGAN salin ulang kedua fungsi ini ke berkas lain.
// Sejak 2026-07-26 penjaga itu memindai engine/*.js JUGA (dulu berkas .js jadi titik-buta), jadi
// klaim "dijaga" kini berlaku penuh. Satu pengecualian TERDAFTAR: emitBlock kembar dgn
// engine/risk-gate.js karena beda sistem-modul (ESM vs CommonJS) - alasannya ada di daftar-izin tes itu.

// Pohon RENDAH-NILAI - berkas yang tak layak ditahan palang mana pun ("siapa yang import ini" tak
// bermakna di sini): tes, hasil generate, folder build, mock, scratch.
const LOW_VALUE = /(\.test\.|\.spec\.|\.d\.ts$|\.generated\.|database\.types\.ts$|(^|[/\\])(tests?|__mocks__|__tests__|dist|build|out|coverage|node_modules|\.next|fixtures?|scratch|tmp)[/\\])/i

export function isLowValue(filePath) { return LOW_VALUE.test(String(filePath || '')) }

// Protokol BLOKIR PreToolUse Claude Code: exit 2 + pesan ke stderr = umpan-balik yang dibaca AI
// (ia perbaiki lalu retry). Bukan exit 1 - itu error biasa yang TIDAK dikembalikan ke AI.
// Pipa putus sengaja ditelan: kode keluar 2 tetap yang menentukan.
export function emitBlock(message) {
  process.exitCode = 2
  try { process.stderr.write(message + '\n') } catch { /* pipa putus: kode tetap 2 */ }
}
