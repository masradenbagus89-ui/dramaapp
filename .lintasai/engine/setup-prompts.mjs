// engine/setup-prompts.mjs — SHIM "tanya user" pemasang: SELALU membalas nilai-aman.
//
// Dipecah dari setup-pola-b.mjs (Fase E 2026-07-25): isi dipindah APA ADANYA.
// Popup GUI DIBUANG dari pemasang Node (ADR-004 / keputusan owner 06-22) -> pemasang SEPENUHNYA
// OTOMATIS: tiap "pertanyaan" langsung dijawab nilai-aman tanpa menampilkan apa pun (tak hang,
// tak crash). Pilihan sebenarnya dilakukan staff lewat AI di chat SESUDAH pemasangan.
//
// KENAPA tanda tangannya dipertahankan padahal argumen tampilan diabaikan: kalau suatu hari shim ini
// diberi jalur input sungguhan, pertanyaan-pertanyaannya langsung hidup TANPA menyunting satu pun
// titik panggil di pemasang. Itu sengaja — jangan "rapikan" dengan membuang parameternya.
let _interactiveCache

// Apakah ada keyboard manusia nyata? Dipakai HANYA untuk pesan "mode otomatis terdeteksi".
//   LINTASAI_INTERACTIVE=1 -> paksa true (escape hatch Git Bash). LINTASAI_NONINTERACTIVE/CLAUDECODE/CI
//   (selain '0'/'false') -> false. stdin BUKAN TTY -> false.
export function isInteractiveInput() {
  if (_interactiveCache !== undefined) return _interactiveCache
  const force = process.env.LINTASAI_INTERACTIVE
  if (force && force !== '0' && force !== 'false') { _interactiveCache = true; return true }
  for (const name of ['LINTASAI_NONINTERACTIVE', 'CLAUDECODE', 'CI']) {
    const v = process.env[name]
    if (v && v !== '0' && v !== 'false') { _interactiveCache = false; return false }
  }
  if (process.stdin.isTTY !== true) { _interactiveCache = false; return false }
  _interactiveCache = true
  return true
}

// API "tanya" - SELALU balas nilai-aman (argumen tampilan diterima lalu diabaikan; tanda tangan dijaga).
export function showYesNo({ defaultYes = false } = {}) { return defaultYes ? 'Yes' : 'No' }
export function showInput() { return { status: 'Cancel', value: '' } }
export function showNumberedChoice({ defaultIndex = 0 } = {}) { return defaultIndex }
export function showInfo({ title, message } = {}) { console.log(`[${title}] ${message}`) }
