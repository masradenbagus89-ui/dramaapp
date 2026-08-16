#!/usr/bin/env node
/*
 * engine/risk-gate.js - "Palang Rem Otomatis" (PreToolUse hook Claude Code, deterministik, ~0 token).
 *
 * Masalah yang dipecahkan: aturan kit soal aksi merusak (§5.1 "konfirmasi verbatim" + §5 pengaman umum;
 * detail DB/Prisma di skills/database & skills/supabase-prisma) selama ini = KEBIJAKAN TEKS yang bergantung AI patuh.
 * Robot ini = PENEGAK-MESIN: dipasang sebagai hook PreToolUse, membaca aksi yang akan dijalankan AI
 * lalu MEMINTA KONFIRMASI user (dialog klik native, mode "ask") untuk aksi berisiko - atau MENOLAK
 * keras (exit 2) untuk aksi menembus pagar / unduh-lalu-jalankan.
 *
 * Bukan aturan baru: memaksa §5.1 yang SUDAH ADA. Pola hook diadaptasi dari ECC v2.0.0
 * (MIT) config-protection.js / gateguard-fact-force.js - ditulis-ulang + mode "ask" bahasa Indonesia.
 *
 * RUNTIME = Node.js (keputusan owner 2026-06-20 + ADR-002 addendum): benchmark di RDP owner
 * menunjukkan Node ~7,7x lebih cepat dari PowerShell 5.1 (~66ms vs ~509ms/panggilan). Karena palang
 * akan dipakai aktif oleh semua staff, kecepatan jadi prioritas. Node dijamin ada (pasang via npm
 * `engines node>=18`). GOTCHA yang diperbaiki: exit DILAKUKAN SETELAH stdout/stderr ter-flush
 * (callback) - kalau tidak, output bisa kepotong pada pipa.
 *
 * KONTRAK Claude Code PreToolUse (cek ulang dokumen versi terpasang saat dipakai):
 *   - Input JSON di stdin: { tool_name, tool_input{ command|file_path }, ... }
 *   - "ask"  : exit 0 + stdout JSON { hookSpecificOutput:{ hookEventName:'PreToolUse',
 *              permissionDecision:'ask', permissionDecisionReason:<alasan> } } -> dialog Setujui/Tolak.
 *   - "block": exit 2 + pesan ke stderr -> aksi diblokir, pesan jadi umpan-balik ke AI.
 *   - "allow": exit 0 tanpa output -> aksi lanjut normal.
 *
 * FAIL-OPEN (sengaja): input rusak/kosong/error -> 'allow' (exit 0). Robot yang crash lalu fail-closed
 * = mengunci SELURUH kerja tim. PENGECUALIAN: kategori "menembus pagar" yang TERDETEKSI = blok-keras.
 *
 * ANTI ALARM-PALSU: hanya pola benar-benar berisiko yang dijaga. `deleteMany({ where })`,
 * `DELETE ... WHERE`, `prisma migrate deploy`, `rm berkas.txt` = AMAN -> lolos.
 *
 * Default NYALA sejak v1.61.0 (ADR-002): setup-pola-b memasang hook ini otomatis tiap init/update;
 * matikan = hapus blok PreToolUse risk-gate di .claude/settings.json; pasang lagi = `npx lintasai enable-risk-gate`.
 * Robot TIDAK auto-memperbaiki/menjalankan apa pun - cuma menilai lalu
 * meneruskan keputusan ke USER.
 *
 * Versi  : 2.2.0
 * Tanggal: 2026-06-20 (2.2.0: 2026-08-09 - kategori RILIS_PRODUKSI; 2.1.0: 2026-07-25 - pola buang-data)
 * Diuji  : tests/risk-gate.test.mjs (node:test).
 *
 * v2.1.0 menambah kategori ASK (berbukti celah nyata di audit skill 2026-07-25): prisma migrate reset,
 * prisma db push --accept-data-loss/--force-reset, supabase db reset, DROP PARTITION, ClickHouse
 * ALTER TABLE ... DELETE WHERE / DETACH PARTITION, wrangler kv/r2/d1 delete, Django migrate <app> zero.
 * Semua ber-anti-FP (mis. ON DELETE CASCADE, wrangler deploy, migrate <app> 0001 = allow).
 */
'use strict';

const fs = require('fs');

// PERBAIKAN GOTCHA: JANGAN panggil process.exit() (memotong tulisan async pada pipa). Cukup tulis
// lalu set process.exitCode; Node otomatis flush stdout/stderr + keluar natural dengan kode itu
// (tak ada handle terbuka setelah stdin habis dibaca). Ini pola benar untuk CLI "tulis lalu keluar".
function emitAsk(reason) {
  const payload = JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: reason }
  });
  process.exitCode = 0;                       // set kode DULU (anti EPIPE mengubah kode)
  try { process.stdout.write(payload); } catch (e) { /* pipa putus: kode tetap 0 */ }
}

function emitBlock(message) {
  process.exitCode = 2;                        // set kode DULU - walau stderr putus, blokir tetap exit 2
  try { process.stderr.write(message + '\n'); } catch (e) { /* pipa putus: kode tetap 2 */ }
}

/**
 * ===== KATEGORI 7 - BLOK KERAS (menembus pagar / unduh-lalu-jalankan) =====
 * WAJIB dievaluasi PALING DULU oleh decide(): keputusannya menolak keras (exit 2) dan tak boleh
 * kalah prioritas dari kategori ASK di bawahnya.
 * Return objek keputusan, atau null kalau tak ada pola yang cocok.
 */
function decideBlokKeras(cmd) {
  if (cmd) {
    if (/dangerously.{0,3}skip.{0,3}permissions/i.test(cmd) || /bypassPermissions/i.test(cmd)) {
      return { decision: 'block', category: 'BYPASS_PAGAR',
        reason: 'DITOLAK: aksi ini mematikan portal izin AI (menembus pagar keamanan). Dilarang (§5.3). Kalau memang perlu, KAMU sendiri yang jalankan manual di luar AI.' };
    }
    if (/\b(curl|wget|iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b/i.test(cmd) &&
        /\|\s*(iex|bash|sh|Invoke-Expression|node|python)\b/i.test(cmd)) {
      return { decision: 'block', category: 'UNDUH_JALANKAN',
        reason: 'DITOLAK: aksi ini mengunduh kode dari internet lalu menjalankannya langsung (sangat berisiko, §5.4). Kalau memang perlu, unduh + periksa dulu, baru jalankan manual.' };
    }
  }
  return null;
}

/**
 * ===== KATEGORI 1-6 - ASK berbasis PERINTAH terminal (minta konfirmasi klik user) =====
 * URUTAN cabang di dalam sini BERMAKNA: pola yang lebih spesifik didahulukan supaya pagar anti
 * alarm-palsu bekerja (mis. ALTER TABLE ... DELETE WHERE dinilai sebelum DELETE FROM). Jangan ditukar.
 * Return objek keputusan, atau null kalau tak ada pola yang cocok.
 */
function decidePerintahBerisiko(cmd) {
  if (cmd) {
    // (1) Hapus rekursif + paksa
    const rmRf = /\brm\b/i.test(cmd) && /(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r|-r[a-z]*\s+-f|--recursive\b.*--force\b|--force\b.*--recursive\b)/i.test(cmd);
    const removeItemRF = /Remove-Item/i.test(cmd) && /-Recurse/i.test(cmd) && /-Force/i.test(cmd);
    if (rmRf || removeItemRF) {
      return { decision: 'ask', category: 'HAPUS_REKURSIF',
        reason: 'Aksi ini menghapus banyak berkas sekaligus secara paksa (hapus rekursif) - sulit dibatalkan. Tekan Setujui kalau ini memang yang kamu mau; kalau ragu, Tolak lalu minta AI jelaskan dulu.' };
    }
    // (2) SQL merusak: DROP (TABLE/DATABASE/SCHEMA/PARTITION) / TRUNCATE
    if (/\b(DROP\s+(TABLE|DATABASE|SCHEMA|PARTITION)|TRUNCATE\s+TABLE?)\b/is.test(cmd)) {
      return { decision: 'ask', category: 'SQL_DESTRUKTIF',
        reason: 'Perintah database ini bisa menghapus seluruh tabel/struktur/partisi data (DROP/TRUNCATE) - data bisa hilang permanen. Setujui hanya kalau kamu yakin. Kalau ini DB PRODUKSI, AI wajib minta kamu MENGETIK frasa konfirmasi (§5.1), bukan cuma klik.' };
    }
    // (2c) ClickHouse mutation buang-data: ALTER TABLE ... DELETE WHERE / DETACH PARTITION.
    // ANTI-FP: `ALTER TABLE ... ADD CONSTRAINT ... ON DELETE CASCADE` AMAN (DELETE didahului token lain, bukan langsung setelah nama tabel).
    if (/\bALTER\s+TABLE\s+\S+\s+DELETE\s+WHERE\b/is.test(cmd) ||
        (/\bALTER\s+TABLE\b/is.test(cmd) && /\bDETACH\s+PARTITION\b/is.test(cmd))) {
      return { decision: 'ask', category: 'CLICKHOUSE_MUTATION',
        reason: 'Perintah ClickHouse ini membuang data (ALTER TABLE ... DELETE WHERE / DETACH PARTITION) - sulit atau tak bisa dibatalkan. Setujui hanya kalau yakin target & datanya benar.' };
    }
    // (2b) DELETE FROM tanpa WHERE
    if (/\bDELETE\s+FROM\b/is.test(cmd) && !/\bWHERE\b/i.test(cmd)) {
      return { decision: 'ask', category: 'SQL_DELETE_ALL',
        reason: 'Perintah ini menghapus SELURUH baris tabel (DELETE tanpa syarat WHERE). Setujui hanya kalau memang itu maksudnya. Kalau ini DB PRODUKSI, AI wajib minta kamu MENGETIK frasa konfirmasi (§5.1), bukan cuma klik.' };
    }
    // (3) Prisma migrate dev
    if (/prisma\s+migrate\s+dev\b/i.test(cmd)) {
      return { decision: 'ask', category: 'PRISMA_MIGRATE_DEV',
        reason: "'prisma migrate dev' bisa MERESET database (hapus semua data) kalau dipakai di luar DB lokal pribadi. Untuk staging/produksi mestinya 'migrate deploy'. Setujui hanya kalau ini DB lokalmu." };
    }
    // (3b) deleteMany/updateMany tanpa where
    if ((/\bdeleteMany\s*\(/i.test(cmd) || /\bupdateMany\s*\(/i.test(cmd)) && !/where/i.test(cmd)) {
      return { decision: 'ask', category: 'PRISMA_BULK_NO_WHERE',
        reason: "'deleteMany/updateMany' tanpa syarat (where) mengubah/menghapus SELURUH baris tabel. Setujui hanya kalau memang itu maksudnya. Kalau ini DB PRODUKSI, AI wajib minta kamu MENGETIK frasa konfirmasi (§5.1), bukan cuma klik." };
    }
    // (3c) Prisma reset penuh: 'migrate reset' (drop+recreate) / 'db push --accept-data-loss|--force-reset'
    if (/prisma\s+migrate\s+reset\b/i.test(cmd)) {
      return { decision: 'ask', category: 'PRISMA_MIGRATE_RESET',
        reason: "'prisma migrate reset' MENGHAPUS SEMUA DATA lalu menerapkan ulang migrasi (drop + recreate database). Setujui hanya kalau ini DB lokal yang memang boleh dikosongkan." };
    }
    if (/prisma\s+db\s+push\b/i.test(cmd) && /(--accept-data-loss|--force-reset)\b/i.test(cmd)) {
      return { decision: 'ask', category: 'PRISMA_DB_PUSH_DATALOSS',
        reason: "'prisma db push --accept-data-loss/--force-reset' menyetujui pembuangan data demi menyamakan skema (kolom/tabel bisa hilang tanpa migrasi tercatat). Setujui hanya kalau paham data mana yang dibuang." };
    }
    // (3d) Supabase CLI: 'db reset' mengosongkan DB lalu muat ulang migrasi + seed
    if (/supabase\s+db\s+reset\b/i.test(cmd)) {
      return { decision: 'ask', category: 'SUPABASE_DB_RESET',
        reason: "'supabase db reset' mengosongkan database lalu memuat ulang migrasi + seed (semua data terhapus). Setujui hanya kalau ini DB lokal/dev." };
    }
    // (3e) Cloudflare wrangler: hapus data KV/R2/D1 (sering langsung ke penyimpanan --remote/produksi).
    // ANTI-FP kategori INI: `wrangler kv:key list` = AMAN (tak ada kata 'delete'). Catatan 2026-08-09:
    // `wrangler deploy` tidak lagi "AMAN" secara mutlak — ia kini ditangani decideRilisProduksi
    // (kategori RILIS_PRODUKSI) sebagai aksi tayang, bukan sebagai aksi buang-data.
    if (/\bwrangler\b/i.test(cmd) && /\b(kv|kv:key|kv:namespace|r2|d1)\b/i.test(cmd) && /\bdelete\b/i.test(cmd)) {
      return { decision: 'ask', category: 'WRANGLER_HAPUS_DATA',
        reason: 'Perintah wrangler ini menghapus data di KV/R2/D1 Cloudflare (bisa langsung ke penyimpanan produksi/--remote) - sulit dibatalkan. Setujui hanya kalau yakin target & datanya benar.' };
    }
    // (3f) Django unapply SEMUA migrasi app: 'migrate <app> zero' -> tabel app itu di-drop (data hilang).
    // ANTI-FP: `migrate app 0001_initial` / `migrate` biasa = AMAN (wajib literal 'zero').
    if (/\bmigrate\s+[\w.]+\s+zero\b/i.test(cmd)) {
      return { decision: 'ask', category: 'DJANGO_MIGRATE_ZERO',
        reason: "'manage.py migrate <app> zero' membatalkan SEMUA migrasi app itu = tabelnya di-drop (data hilang). Setujui hanya kalau memang mau mengosongkan app itu." };
    }
    // (4) Git berbahaya
    if (/\bgit\b/i.test(cmd) && (
        /push\b.*(--force\b|--force-with-lease\b|\s-f\b)/i.test(cmd) ||
        /reset\s+--hard\b/i.test(cmd) ||
        /--no-verify\b/i.test(cmd))) {
      return { decision: 'ask', category: 'GIT_BERBAHAYA',
        reason: 'Perintah git ini berisiko menimpa/membuang riwayat atau melewati pemeriksaan (force / reset --hard / --no-verify). Setujui hanya kalau paham dampaknya.' };
    }
    // (4b) Git BUANG KERJA belum-commit (hilang permanen, TAK ada di riwayat). ANTI-FP: hanya bentuk
    // yang benar-benar membuang worktree - `git clean -f` (BUKAN `-n`/--dry-run), `checkout/restore` dgn
    // pathspec titik `.`/`./` (BUKAN ganti branch), stash drop/clear. `restore --staged` (cuma unstage) DIKECUALIKAN.
    const gitClean = /\bgit\s+clean\b/i.test(cmd) && /(-[a-z]*f[a-z]*|--force)\b/i.test(cmd) && !/(-[a-z]*n[a-z]*|--dry-run)\b/i.test(cmd);
    const gitCheckoutDot = /\bgit\s+checkout\s+(--\s+)?\.\/?(\s|$)/i.test(cmd);          // `checkout .` / `checkout -- .` (BUKAN `checkout <branch>`)
    const gitRestoreDot = /\bgit\s+restore\s+(?!--staged)(--\s+)?\.\/?(\s|$)/i.test(cmd); // `restore .` / `restore -- .` (BUKAN `restore --staged`)
    const gitStashDrop = /\bgit\s+stash\s+(drop|clear)\b/i.test(cmd);                    // buang stash (bukan pop/apply/list)
    if (gitClean || gitCheckoutDot || gitRestoreDot || gitStashDrop) {
      return { decision: 'ask', category: 'GIT_BUANG_KERJA',
        reason: 'Perintah git ini MEMBUANG perubahan/berkas yang belum di-commit (git clean -f / checkout -- . / restore . / stash drop|clear) - hilang PERMANEN, tak ada di riwayat untuk dibalik. Setujui hanya kalau kamu memang mau membuang pekerjaan yang belum tersimpan itu.' };
    }
    // (4c) Git hapus-PAKSA branch (`-D`/`--delete --force`). Severity lebih rendah: commit biasanya masih di reflog.
    if (/\bgit\s+branch\b/i.test(cmd) && (/\s-D\b/.test(cmd) || /--delete\s+--force\b/i.test(cmd))) {
      return { decision: 'ask', category: 'GIT_HAPUS_BRANCH',
        reason: 'Perintah ini menghapus-paksa branch (git branch -D) - commit-nya biasanya MASIH bisa dipulihkan lewat reflog, tapi pointer branch-nya hilang. Setujui hanya kalau branch itu memang tak dipakai lagi.' };
    }
    // (6) Format / partisi disk
    if (/\b(Format-Volume|diskpart|mkfs(\.\w+)?)\b/i.test(cmd) || /\bdd\b.*of=\s*\/dev\//i.test(cmd)) {
      return { decision: 'ask', category: 'FORMAT_DISK',
        reason: 'Perintah ini bisa MEMFORMAT / menghapus seluruh isi disk atau partisi. Sangat berbahaya + sulit dibatalkan. Setujui hanya kalau benar-benar yakin.' };
    }
  }
  return null;
}

/**
 * ===== KATEGORI 8 - ASK: RILIS PRODUKSI (menayangkan ke alamat yang dilihat pelanggan) =====
 *
 * KENAPA FUNGSI SENDIRI, bukan cabang tambahan di decidePerintahBerisiko: fungsi itu sudah 92 baris
 * dari ambang 100 (tools/complexity-budget.mjs) - 9 pola + alasan multi-kalimat pasti melewatinya dan
 * menyalakan sinyal kerumitan kedua. Struktur ini juga mengikuti pola berkas: decideBlokKeras /
 * decidePerintahBerisiko / decideRilisProduksi / decideBerkasRahasia.
 *
 * KENAPA `ask`, bukan `block`: menayangkan ke produksi adalah aksi SAH yang memang sering diminta
 * owner. Yang salah bukan aksinya, melainkan AI melakukannya TANPA izin di sesi itu
 * (skills/deploy/SKILL.md §1 butir terakhir + kernel AGENTS.md §5.5).
 *
 * JANGKAR AWAL-SEGMEN (`^` atau sesudah newline/;/&/|) dipakai di SEMUA pola. Tanpa itu,
 * `echo "railway up"` dan `# railway up` ikut menyalakan dialog - alarm palsu yang mengajari staff
 * mengklik "Setujui" tanpa membaca. Kalibrasi terukur: 21 perintah rilis -> 0 MISS,
 * 34 perintah aman (termasuk `vercel whoami`, `netlify deploy` preview, `wrangler deploy --dry-run`,
 * `git push origin main-fitur`, `git push origin release/main`) -> 0 false-positive.
 *
 * BATAS JUJUR (4 hal yang TIDAK tertangkap - jangan diklaim lebih):
 *   1. `git push` telanjang tanpa nama branch (branch aktif tak terlihat dari perintahnya).
 *   2. Pembungkus skrip: `npm run deploy`, `make release` - isinya ada di package.json, bukan di cmd.
 *   3. Nama perintah di baris TENGAH pipeline kompleks yang tak diawali pemisah yang dikenali.
 *   4. Alat deploy di luar daftar (Heroku, Render CLI, Azure, dsb).
 * Yang tertulis di atas = lantai, bukan jaminan. Pagar sesungguhnya tetap aturan §5.5 + rak deploy.
 */
function decideRilisProduksi(cmd) {
  if (!cmd) return null;
  var AWAL = '(?:^|[\\r\\n;&|]\\s*)';
  var p = function (re) { return new RegExp(AWAL + re, 'i').test(cmd); };
  var kering = /--dry-run\b/i.test(cmd);

  var rilis =
    p('vercel\\b[^\\r\\n]*\\s--prod(uction)?\\b') ||
    p('vercel\\s+(promote|alias\\s+set)\\b') ||
    // `vercel` polos = langsung deploy. `$` tanpa flag `m` TIDAK cocok sebelum newline, jadi pemisah
    // baris disebut eksplisit - kalau tidak, `vercel\nnpm test` lolos diam-diam.
    new RegExp(AWAL + 'vercel\\s*($|[\\r\\n;&|])', 'i').test(cmd) ||
    p('netlify\\s+deploy\\b[^\\r\\n]*--prod') ||
    p('railway\\s+up\\b') ||
    p('(fly|flyctl)\\s+deploy\\b') ||
    (p('wrangler\\s+(deploy|publish)\\b') && !kering) ||
    p('supabase\\s+db\\s+push\\b') ||
    // Di project ber-git-integration, push ke branch produksi = TOMBOL RILIS. Pola ini menutup bentuk
    // `HEAD:refs/heads/main` (dipakai CI/skrip) TANPA ikut menangkap `main-fitur` / `release/main` /
    // `fix-production-bug` - keduanya diuji sebagai anti-alarm-palsu.
    (p('git\\s+push\\b[^\\r\\n]*\\s(origin\\s+)?(HEAD:)?(refs\\/heads\\/)?(main|master|production|prod)(?![\\w\\/-])') && !kering);

  if (!rilis) return null;
  return { decision: 'ask', category: 'RILIS_PRODUKSI',
    reason: 'Perintah ini MENAYANGKAN aplikasi ke alamat yang dilihat pelanggan (rilis produksi), bukan sekadar mengirim kode. Setujui hanya kalau kamu memang mau versi ini tayang sekarang. Kalau cuma ingin mencoba dulu, minta AI memakai preview/staging.' };
}

/**
 * ===== KATEGORI 5 - ASK berbasis BERKAS (sentuh berkas rahasia .env) =====
 * Return objek keputusan, atau null kalau tak cocok.
 */
function decideBerkasRahasia(tool, filePath) {
  // (5) Sentuh berkas rahasia .env (Edit/Write/MultiEdit)
  if (filePath && /^(Edit|Write|MultiEdit)$/i.test(tool)) {
    const leaf = filePath.split(/[\\/]/).pop();
    if (/^\.env($|\.)/i.test(leaf)) {
      return { decision: 'ask', category: 'SENTUH_ENV',
        reason: 'Kamu akan menulis/mengubah berkas rahasia (' + leaf + '). Pastikan tak ada kunci yang bocor + berkas ini tak ikut ter-commit. Setujui untuk lanjut.' };
    }
  }
  return null;
}

/**
 * Keputusan murni dari sebuah tool-call (objek). Dipisah supaya logika mudah dinalar.
 * Mengembalikan { decision: 'ask'|'block'|'allow', reason, category }.
 *
 * URUTAN PEMANGGILAN = urutan prioritas pagar, dan ia SENGAJA sama persis dengan versi sebelum
 * dipecah: blok-keras dulu, lalu ASK-perintah, lalu ASK-berkas, baru 'allow'. Hit PERTAMA menang.
 */
function decide(obj) {
  if (!obj || typeof obj !== 'object') return { decision: 'allow' };
  const tool = typeof obj.tool_name === 'string' ? obj.tool_name : '';
  const ti = obj.tool_input && typeof obj.tool_input === 'object' ? obj.tool_input : {};
  const cmd = typeof ti.command === 'string' ? ti.command : '';
  const filePath = typeof ti.file_path === 'string' ? ti.file_path : (typeof ti.file === 'string' ? ti.file : '');

  const blok = decideBlokKeras(cmd);
  if (blok) return blok;

  const berisiko = decidePerintahBerisiko(cmd);
  if (berisiko) return berisiko;

  // Rilis produksi dinilai SESUDAH perintah-merusak (yang itu lebih genting) dan SEBELUM berkas-rahasia.
  const rilis = decideRilisProduksi(cmd);
  if (rilis) return rilis;

  const rahasia = decideBerkasRahasia(tool, filePath);
  if (rahasia) return rahasia;

  return { decision: 'allow' };
}

function main() {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch (e) { process.exitCode = 0; return; }  // fail-open
  // Buang BOM (penanda tak-kasat-mata) yang sebagian shell/pipa Windows prepend -> JSON.parse anti-throw.
  const cleaned = (raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw).trim();
  let obj = null;
  try { obj = cleaned ? JSON.parse(cleaned) : null; } catch (e) { process.exitCode = 0; return; }  // fail-open
  if (!obj) { process.exitCode = 0; return; }

  const d = decide(obj);
  if (d.decision === 'block') return emitBlock(d.reason);
  if (d.decision === 'ask') return emitAsk(d.reason);
  process.exitCode = 0;  // allow
}

// Jalankan hanya saat di-run langsung; saat di-require (kalau kelak ada unit test JS) jangan auto-run.
if (require.main === module) {
  // Redam EPIPE (pipa putus) supaya hook TAK PERNAH crash dengan kode salah - kode keluar sudah
  // ditetapkan emitAsk/emitBlock; tulisan yang gagal di-flush tak boleh mengubahnya.
  process.stdout.on('error', function () {});
  process.stderr.on('error', function () {});
  main();
}
module.exports = { decide };
