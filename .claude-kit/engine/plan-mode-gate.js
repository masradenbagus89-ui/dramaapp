#!/usr/bin/env node
/*
 * engine/plan-mode-gate.js - "Lampu Hijau Plan Mode" (PreToolUse hook Claude Code, deterministik, ~0 token).
 *
 * Masalah yang dipecahkan: saat PLAN MODE (mode menyusun rencana), staff tetap dihujani dialog izin
 * padahal AI cuma memeriksa kode. Akibatnya: kerja tersendat + kebiasaan buruk "klik izinkan tanpa baca"
 * (di mesin owner, daftar izin sudah menggelembung jadi ratusan entri karena refleks itu). Robot ini
 * memberi LAMPU HIJAU OTOMATIS untuk aksi yang TERBUKTI cuma-baca saat plan mode - sehingga dialog yang
 * tersisa benar-benar cuma untuk hal yang pantas ditanyakan.
 *
 * BUKAN "bypass": permintaan awal owner adalah "saat plan mode, izinkan APA PUN". DITOLAK sengaja -
 * plan mode TIDAK mengunci perintah terminal (yang dikunci keras cuma Edit/Write), dan dokumentasi resmi
 * Anthropic menyatakan mode bypass "offers no protection against prompt injection". Lihat ADR-021.
 *
 * DUA PAGAR YANG MEMBUAT INI AMAN:
 *   1. URUTAN - risk-gate.decide() dipanggil DULU. Apa pun yang Palang Rem anggap berbahaya TIDAK PERNAH
 *      bisa diizinkan robot ini (dipakai-ulang, bukan ditulis-ulang -> satu sumber penilaian bahaya).
 *   2. DAFTAR-PUTIH, BUKAN DAFTAR-HITAM - yang tak dikenali secara eksplisit = TIDAK diizinkan (jatuh ke
 *      alur izin normal). Jadi kalau kami lalai mendaftar sesuatu, akibatnya "popup masih muncul"
 *      (menjengkelkan), BUKAN "perintah berbahaya lolos" (celah). Mode gagalnya berpihak ke aman.
 *
 * DI LUAR PLAN MODE ROBOT INI DIAM TOTAL - permission_mode != 'plan' -> keluar tanpa keputusan apa pun.
 * Jadi perilaku sesi normal NOL berubah.
 *
 * KONTRAK Claude Code PreToolUse (cek ulang dokumen versi terpasang saat dipakai):
 *   - Input JSON di stdin: { permission_mode, tool_name, tool_input{ command|file_path|pattern }, ... }
 *   - "allow": exit 0 + stdout JSON { hookSpecificOutput:{ hookEventName:'PreToolUse',
 *              permissionDecision:'allow', permissionDecisionReason:<alasan> } } -> jalan tanpa dialog.
 *   - "tanpa keputusan": exit 0 TANPA output -> alur izin normal berlaku (dialog seperti biasa).
 *
 * FAIL-SAFE (sengaja, kebalikan risk-gate): input rusak/kosong/error -> TANPA KEPUTUSAN, bukan 'allow'.
 * risk-gate boleh fail-open karena kegagalannya = "tidak menambah pertanyaan"; robot ini kalau fail-open
 * ke 'allow' justru MELEPAS pagar. Ragu = diam.
 *
 * BATAS YANG DISENGAJA (didokumentasikan di docs/plan-mode-gate.md):
 *   - Hanya alat `Bash`. PowerShell TIDAK ditangani (sintaksnya terlalu bebas untuk dinilai aman).
 *   - `WebFetch` TIDAK diizinkan otomatis (pintu masuk titipan-perintah + URL bisa menyelundupkan data).
 *   - Berkas rahasia (.env, kunci, kredensial) TIDAK PERNAH diizinkan otomatis - walau cuma dibaca (§8.1 #6).
 *
 * Versi  : 1.0.0
 * Tanggal: 2026-07-18
 * Diuji  : tests/plan-mode-gate.test.mjs (node:test).
 */
'use strict';

const fs = require('fs');
const riskGate = require('./risk-gate.js');

// ---------------------------------------------------------------------------
// Daftar-putih ALAT yang murni membaca. Edit/Write/MultiEdit SENGAJA tak ada di sini.
// ---------------------------------------------------------------------------
const ALAT_BACA = new Set(['Read', 'Grep', 'Glob', 'NotebookRead', 'TodoWrite', 'WebSearch']);

// Berkas rahasia: JANGAN pernah auto-izinkan, walau operasinya "cuma baca" (§8.1 #6 - boundary keras).
// Sengaja longgar (over-reject): kena berkas biasa = cuma muncul popup, bukan celah.
const POLA_RAHASIA = /\.env\b|[\\/]\.ssh|[\\/]\.aws|gcloud|\.pem\b|\.key\b|\.pfx\b|\.p12\b|id_rsa|id_ed25519|\.npmrc|\.netrc|credential|secret|token|passwd|shadow/i;

// Metakarakter yang TIDAK bisa dinilai aman per-penggal -> tolak seluruh perintah.
// '>' '<' = tulis/baca-alih berkas · '$(' '${' '`' = penyulihan perintah · baris-baru = perintah tersembunyi.
const PENOLAK_MUTLAK = /[><`]|\$\(|\$\{|[\r\n]/;

// Pemisah rantai. Tiap penggal dinilai SENDIRI-SENDIRI dan SEMUANYA wajib lolos.
// Jadi `git status && rm -rf /` gugur di penggal kedua; `cat x | sh` gugur karena 'sh' tak terdaftar.
const PEMISAH_RANTAI = /\|\||&&|;|\|/;

// --- Lapis BACA: memeriksa saja, tidak menjalankan kode project ---
const PERINTAH_BACA = new Set([
  'ls', 'dir', 'pwd', 'cat', 'head', 'tail', 'wc', 'file', 'stat',
  'basename', 'dirname', 'realpath', 'readlink', 'which', 'type',
  'grep', 'egrep', 'fgrep', 'rg', 'tree', 'diff', 'cmp', 'date', 'whoami', 'hostname',
]);

// Sub-perintah git yang murni membaca. 'branch'/'config'/'remote'/'tag'/'stash' ditangani terpisah
// karena bentuk tertentunya MENULIS (mis. `git branch -D`, `git config x y`, `git tag v1`).
const GIT_BACA = new Set([
  'status', 'log', 'diff', 'show', 'rev-parse', 'ls-files', 'blame', 'shortlog',
  'describe', 'rev-list', 'cat-file', 'count-objects', 'whatchanged', 'ls-tree',
]);

// Skrip project yang boleh dijalankan otomatis saat plan mode (Lapis PROYEK).
// Sengaja daftar-nama, bukan `npm run *` - supaya `npm run deploy` TIDAK ikut terbawa.
const SKRIP_PROYEK = new Set([
  'test', 'lint', 'build', 'typecheck', 'check', 'preflight',
  'format:check', 'lint:check', 'test:unit', 'test:run',
]);

// Sub-perintah CLI kit yang cuma-baca.
const LINTASAI_BACA = new Set([
  'preflight', 'doctor', 'project-map', 'env-keys', 'unicode-check', 'plan-scout', 'version',
]);

/** Pecah perintah jadi token kasar. Cukup untuk daftar-putih: salah-parse -> gagal cocok -> tak diizinkan. */
function token(segmen) {
  return segmen.trim().split(/\s+/).filter(Boolean);
}

/** Apakah SATU penggal perintah aman? Daftar-putih ketat. */
function penggalAman(tok) {
  if (!tok.length) return false;
  const cmd = tok[0];
  const argv = tok.slice(1);

  if (PERINTAH_BACA.has(cmd)) return true;

  // `find` sengaja DI LUAR daftar polos: ia bisa MENGHAPUS/MENJALANKAN lewat aksi tertentu.
  if (cmd === 'find') {
    return !argv.some((a) => /^-(delete|exec|execdir|ok|okdir|fls|fprint|fprintf)$/i.test(a));
  }

  if (cmd === 'git') {
    const sub = argv[0];
    if (!sub) return false;
    if (GIT_BACA.has(sub)) return true;
    // Bentuk aman-bersyarat: hanya varian yang MEMBACA.
    if (sub === 'branch') return !argv.some((a) => /^(-d|-D|-m|-M|-c|-C|--delete|--move|--copy|--edit-description)$/i.test(a));
    if (sub === 'config') return argv.some((a) => /^(--get|--get-all|--get-regexp|--list|-l)$/i.test(a));
    if (sub === 'remote') return argv.length === 1 || argv.some((a) => /^(-v|--verbose|show)$/i.test(a));
    if (sub === 'tag') return argv.some((a) => /^(-l|--list)$/i.test(a));
    if (sub === 'stash') return argv[1] === 'list' || argv[1] === 'show';
    return false;
  }

  if (cmd === 'node') return argv.length === 1 && /^(-v|--version)$/.test(argv[0]);

  if (cmd === 'npm' || cmd === 'pnpm' || cmd === 'yarn') {
    const sub = argv[0];
    if (!sub) return false;
    if (/^(-v|--version)$/.test(sub)) return true;
    if (sub === 'ls' || sub === 'list' || sub === 'view' || sub === 'outdated' || sub === 'why') return true;
    if (sub === 'test') return true;                                   // Lapis PROYEK
    if (sub === 'run') return !!argv[1] && SKRIP_PROYEK.has(argv[1]);  // Lapis PROYEK, daftar-nama
    return false;
  }

  if (cmd === 'npx') {
    // Hanya CLI kit sendiri + sub-perintah cuma-baca. `npx <paket-asing>` TIDAK diizinkan
    // (npx mengunduh + menjalankan paket dari internet - persis pola yang dilarang §8.1 #2).
    if (argv[0] !== 'lintasai') return false;
    return !!argv[1] && LINTASAI_BACA.has(argv[1]);
  }

  return false;
}

/** Apakah SELURUH baris perintah aman? Semua penggal wajib lolos. */
function perintahAman(cmd) {
  if (typeof cmd !== 'string' || !cmd.trim()) return false;
  if (PENOLAK_MUTLAK.test(cmd)) return false;
  if (POLA_RAHASIA.test(cmd)) return false;
  const penggal = cmd.split(PEMISAH_RANTAI);
  if (!penggal.length) return false;
  for (const p of penggal) {
    if (p.includes('&')) return false;          // proses latar (`cmd &`) - tak bisa dinilai
    if (!penggalAman(token(p))) return false;
  }
  return true;
}

/**
 * Keputusan murni dari sebuah tool-call (objek). Dipisah supaya logika mudah dinalar + diuji.
 * Mengembalikan { decision: 'allow'|'none', reason?, category? }.
 * 'none' = JANGAN cetak apa pun (alur izin normal berlaku).
 */
function decide(obj) {
  if (!obj || typeof obj !== 'object') return { decision: 'none' };

  // (1) HANYA plan mode. Di luar itu robot ini tak berpendapat sama sekali.
  if (obj.permission_mode !== 'plan') return { decision: 'none' };

  // (2) PAGAR UTAMA: apa pun yang Palang Rem anggap berbahaya -> JANGAN pernah diizinkan di sini.
  //     Dipakai-ulang (bukan ditulis-ulang) supaya penilaian bahaya tetap SATU sumber.
  try {
    const risiko = riskGate.decide(obj);
    if (risiko && risiko.decision !== 'allow') return { decision: 'none', category: 'DITAHAN_PALANG_REM' };
  } catch (e) {
    return { decision: 'none', category: 'PALANG_REM_ERROR' };  // ragu = diam
  }

  const tool = typeof obj.tool_name === 'string' ? obj.tool_name : '';
  const ti = obj.tool_input && typeof obj.tool_input === 'object' ? obj.tool_input : {};

  // (3) Alat yang murni membaca.
  if (ALAT_BACA.has(tool)) {
    // Berkas rahasia tak pernah auto-izin, walau cuma dibaca (§8.1 #6).
    const sasaran = [ti.file_path, ti.path, ti.pattern, ti.notebook_path, ti.glob]
      .filter((v) => typeof v === 'string').join(' ');
    if (sasaran && POLA_RAHASIA.test(sasaran)) {
      return { decision: 'none', category: 'BERKAS_RAHASIA' };
    }
    return { decision: 'allow', category: 'ALAT_BACA',
      reason: 'Plan mode: alat ini hanya membaca (' + tool + '), diizinkan otomatis oleh lintasAI.' };
  }

  // (4) Perintah terminal yang seluruh penggalnya cuma-baca.
  if (tool === 'Bash' && perintahAman(typeof ti.command === 'string' ? ti.command : '')) {
    return { decision: 'allow', category: 'PERINTAH_BACA',
      reason: 'Plan mode: perintah ini ada di daftar-putih cuma-baca lintasAI, diizinkan otomatis.' };
  }

  // (5) Selain itu: tak berpendapat -> dialog izin normal.
  return { decision: 'none' };
}

// PERBAIKAN GOTCHA (sama seperti risk-gate): JANGAN process.exit() - memotong tulisan async pada pipa.
function emitAllow(reason) {
  const payload = JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', permissionDecisionReason: reason }
  });
  process.exitCode = 0;
  try { process.stdout.write(payload); } catch (e) { /* pipa putus: kode tetap 0 */ }
}

function main() {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch (e) { process.exitCode = 0; return; }  // ragu = diam
  const cleaned = (raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw).trim();
  let obj = null;
  try { obj = cleaned ? JSON.parse(cleaned) : null; } catch (e) { process.exitCode = 0; return; }
  if (!obj) { process.exitCode = 0; return; }

  const d = decide(obj);
  if (d.decision === 'allow') return emitAllow(d.reason);
  process.exitCode = 0;  // tanpa keputusan
}

if (require.main === module) {
  process.stdout.on('error', function () {});
  process.stderr.on('error', function () {});
  main();
}
module.exports = { decide, perintahAman, penggalAman };
