#!/usr/bin/env node
// engine/doctor-harness-matrix.mjs - matriks "apa yang sampai ke alat AI mana" untuk `npx lintasai doctor`.
//
// KENAPA MODUL SENDIRI (bukan ditempel ke kit-doctor-checks.mjs): berkas itu sudah 314 baris, di atas
// ideal Ponytail <300. Dan isi matriks ini akan tumbuh tiap kali dukungan harness berubah - kalau ia
// menumpang di sana, berkas doctor jadi laci-sampah.
//
// MASALAH YANG DIPECAHKAN (nyata, 2026-08-09): baris "Codex/Kimi baca kernel AGENTS.md secara native"
// dicetak semata-mata dari `ada('AGENTS.md')`. Itu SALAH persis di konfigurasi paling umum: dokumentasi
// resmi Codex menyatakan ia memeriksa `AGENTS.override.md` LEBIH DULU dan hanya memuat SATU berkas
// per-folder, jadi client yang punya kedua berkas mendapat override-nya dan MELEWATI kernel. Alat yang
// tugasnya jujur justru menyebarkan klaim tak benar (§2.2).
//
// KONTRAK: bangunMatriksHarness({ ada, settingsTeks }) -> array baris { level, teks, saran? }.
//   `ada(...segmen)` = predikat keberadaan berkas (DI-INJEKSI supaya fungsi ini MURNI + mudah diuji
//   tanpa menyentuh disk). `settingsTeks` = isi .claude/settings.json apa adanya (boleh string kosong).
//
// SEVERITAS BERBASIS BUKTI PEMAKAIAN (keputusan sadar): alat yang NOL tanda dipakai -> `INFO`, bukan
// `WARN`. Doctor yang selalu merah untuk hal tak relevan mengajari client mengabaikan warna, dan itu
// merusak satu-satunya kanal jujur yang ia punya.
export const LEVEL_HARNESS = { OK: 'OK', INFO: 'INFO', WARN: 'WARN', ERR: 'ERR' }

// Nama LAMA berkas override. Sengaja tetap disebut di sini: inilah berkas yang MENUTUPI kernel di
// Codex. Kalau ia masih ada di project client, doctor WAJIB memperingatkannya (nama barunya AGENTS.local.md tak diklaim Codex, jadi tak perlu diperiksa).
export const NAMA_OVERRIDE_LAMA = 'AGENTS.override.md'

// PURE. Mengembalikan baris SIAP-CETAK; pemanggil yang mengurus emit + hitung ok/warn/err.
export function bangunMatriksHarness({ ada, settingsTeks = '' } = {}) {
  const punya = typeof ada === 'function' ? ada : () => false
  const teks = String(settingsTeks || '')
  const baris = []
  const tambah = (level, t, saran) => baris.push(saran ? { level, teks: t, saran } : { level, teks: t })

  const adaKernel = punya('AGENTS.md')
  const adaOverride = punya(NAMA_OVERRIDE_LAMA)
  const dipakaiCodex = punya('.codex')
  const dipakaiCursor = punya('.cursor')

  // --- Claude Code: satu-satunya yang mendapat SELURUH palang hari ini ---
  if (punya('CLAUDE.md')) {
    const palang = ['risk-gate', 'rak-gate', 'plan-mode-gate'].filter((m) => teks.includes(m))
    tambah(LEVEL_HARNESS.OK,
      `Claude Code    : aturan lewat CLAUDE.md · palang terpasang ${palang.length}/3 (${palang.join(', ') || 'nol'})`,
      palang.length < 3 ? 'Pasang sisanya: npx lintasai enable-risk-gate · npx lintasai enable-rak-gate' : null)
  } else {
    tambah(LEVEL_HARNESS.WARN, 'Claude Code    : CLAUDE.md tak ada - aturan tak dimuat di awal sesi.',
      'npx lintasai init  (jalankan dari folder akar project)')
  }

  // --- Codex: KERNEL BISA TERTUTUP OVERRIDE. Ini temuan yang paling mahal kalau diam. ---
  if (!adaKernel) {
    tambah(LEVEL_HARNESS.INFO, 'Codex/Kimi     : AGENTS.md akar tak ketemu - kernel belum terpasang di project ini.',
      'npx lintasai init')
  } else if (adaOverride) {
    // ERR hanya kalau ADA TANDA Codex dipakai; selain itu WARN (jangan memerahkan hal tak relevan).
    tambah(dipakaiCodex ? LEVEL_HARNESS.ERR : LEVEL_HARNESS.WARN,
      `Codex          : ${NAMA_OVERRIDE_LAMA} MENUTUPI kernel AGENTS.md - aturan lintasAI TIDAK termuat di Codex.`,
      'Codex memuat paling banyak SATU berkas per-folder dan memeriksa override LEBIH DULU. ' +
      'Buktikan sendiri: jalankan `codex --print-instructions` - kalau judul kernel tak muncul, ' +
      'inilah sebabnya. Perbaikan: `npx lintasai update` (memindahkan override ke nama yang tak diklaim Codex).')
    tambah(LEVEL_HARNESS.OK, 'Kimi           : baca kernel AGENTS.md akar secara native · palang belum terpasang')
  } else {
    tambah(LEVEL_HARNESS.OK, 'Codex/Kimi     : baca kernel AGENTS.md akar secara native · palang belum terpasang')
  }

  // --- Cursor: aturan sampai lewat berkas generated; palang belum ---
  if (punya('.cursor', 'rules', 'lintasai.mdc')) {
    tambah(LEVEL_HARNESS.OK, 'Cursor         : aturan + peta rak lewat .cursor/rules/lintasai.mdc (alwaysApply) · palang belum terpasang')
  } else if (dipakaiCursor) {
    tambah(LEVEL_HARNESS.WARN, 'Cursor         : folder .cursor/ ada tapi berkas aturan lintasAI belum di-generate.',
      'npx lintasai adapter-sync --write')
  } else {
    tambah(LEVEL_HARNESS.INFO, 'Cursor         : belum ada .cursor/rules/lintasai.mdc (normal kalau kamu tak memakai Cursor).')
  }

  return baris
}

// Berapa kali Palang Rak SEHARUSNYA menahan tapi tak bisa (alat AI tak mengirim penanda sesi).
// Dipisah dari matriks karena sumbernya state runtime, bukan keberadaan berkas.
export function barisPalangTerlewat(n, terakhir) {
  const jml = Number(n) || 0
  if (jml <= 0) return null
  return {
    level: LEVEL_HARNESS.WARN,
    teks: `Palang Rak     : seharusnya menahan ${jml}x tapi tak bisa - alat AI tak mengirim penanda sesi${terakhir ? ` (terakhir ${terakhir})` : ''}.`,
    saran: 'Angka ini dihitung untuk PROJECT INI saja, disimpan di folder sementara sistem - jadi ia ' +
      'bisa ter-reset saat komputer restart (angka kecil bukan berarti aman). Kalau terus naik, palang ' +
      'itu praktis tak pernah hidup di alat yang kamu pakai - andalkan tinjauan manusia.',
  }
}
