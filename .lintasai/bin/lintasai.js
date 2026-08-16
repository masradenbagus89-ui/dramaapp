#!/usr/bin/env node
// lintasAI CLI launcher - menjalankan port Node kit (v2.0.0: kit 100% Node, tanpa PowerShell)
// Usage: npx lintasai <command> [args]

const { spawn } = require("child_process");
const path = require("path");
const os = require("os");

const KIT_ROOT = path.resolve(__dirname, "..");

// v2.0.0: registry perintah. Kit 100% Node - semua orkestrator/robot punya implementasi Node
// (migrasi PowerShell->Node tuntas). Tiap entri { "command": "berkas.mjs" } atau ["kit.mjs","<sub>"]
// (subperintah router). Tak ada lagi cadangan PowerShell / registry COMMANDS PS.
const COMMANDS_NODE = {
  // Pemasang kit (orkestrator) versi Node. `npx lintasai init` menjalankan setup-pola-b.mjs.
  // Dispatcher menyuntik --project-root <cwd-user> (lihat cabang Node di bawah) supaya kit mendarat
  // di project user, bukan cache npm.
  "init": "setup-pola-b.mjs",
  // Alat update kit versi Node (update-kit.mjs). `npx lintasai update` = satu-satunya jalur update.
  // Dispatcher menyuntik --project-root <cwd-user> (update ada di daftar shouldPassProjectRoot) supaya
  // alat update menyasar .lintasai di project user, BUKAN cache npm. Keputusan keamanan diambil
  // deterministik (BUKAN popup, ADR-004) di engine/update-decide.mjs: berhenti kalau sumber==tujuan,
  // versi-diri tak terbaca, updater kena cache-npx lama, atau kit terpasang lebih baru (anti-rollback,
  // kecuali --allow-downgrade). Sumbernya paket npm yang sudah diverifikasi npx - tak ada lagi gerbang
  // daftar-putih-repo/GPG era git-clone (lihat KOREKSI di header update-kit.mjs).
  "update": "update-kit.mjs",
  // Penghapus kit (uninstall.mjs). Dispatcher menyuntik --project-root <cwd-user> (uninstall ada di
  // shouldPassProjectRoot). AKSI MERUSAK: tanpa --yes hanya menampilkan rencana lalu BERHENTI AMAN
  // (default-batal); butuh --yes eksplisit untuk benar-benar menghapus (AI konfirmasi ke staff dulu).
  "uninstall": "uninstall.mjs",
  // Balikin-versi (engine/rollback.mjs, aksi MERUSAK, sesi-khusus owner). Menjalankan versi Node
  // engine/rollback.mjs. Dispatcher menyuntik --project-root <cwd-user> (rollback ada di
  // shouldPassProjectRoot) supaya rollback menyasar .lintasai + manifest di project user, BUKAN cache
  // npm. AKSI MERUSAK: tanpa --yes hanya menampilkan rencana lalu BERHENTI AMAN (default-batal); butuh
  // --yes eksplisit untuk benar-benar menimpa berkas dari backup (AI konfirmasi ke staff dulu).
  "rollback": "engine/rollback.mjs",
  // Pasang-ulang "Palang Rem" risk-gate (hook PreToolUse minta konfirmasi aksi berbahaya) dengan 1 langkah.
  // Default NYALA sejak v1.61.0 (ADR-002): setup-pola-b memanggil ensureRiskGateHook otomatis tiap
  // init/update; perintah ini = jalur pasang-ULANG manual (hook terhapus/settings lama).
  // Helper engine/ensure-risk-gate-hook.mjs deep-merge ke
  // .claude/settings.json klien (pertahankan setelan lain, idempoten, fail-safe). Di shouldPassProjectRoot
  // -> dispatcher suntik --project-root supaya target .claude project USER, bukan cache npm.
  "enable-risk-gate": "engine/ensure-risk-gate-hook.mjs",
  // Palang Rak: tahan edit PERTAMA berkas berisiko sampai panduan terkait benar-benar dibaca.
  // Bukti = catatan tanda-terima `Read` (bukan klaim AI) -> memenuhi ADR-008 Keputusan #3.
  "enable-rak-gate": "engine/ensure-rak-gate-hook.mjs",
  // CLI "rak" (engine/rak-cli.mjs, CUMA-BACA ~0 token): beri TOPIK -> cetak daftar rak/skill relevan
  // (~300 char) dengan membungkus muatPetunjukRak (engine/lang-reminder.mjs). Dipakai AI untuk routing
  // manual TANPA membaca skills/registry.json penuh (~5.000 token). SENGAJA TIDAK di shouldPassProjectRoot:
  // rak-cli memakai process.cwd() sbg basis (muatRegistry cari registry di CWD ATAU CWD/.lintasai/);
  // menyuntik --project-root justru mencemari argumen TOPIK. Pakai: `npx lintasai rak "<topik>"`.
  "rak": "engine/rak-cli.mjs",
  // Generator berkas aturan adapter Cursor (engine/adapter-rules-gen.mjs): Cursor (.cursor/rules/lintasai.mdc).
  // SEJAK ADR-032 kernel = AGENTS.md akar = acuan tunggal yang dibaca NATIVE oleh Codex & Kimi Code, jadi
  // fotokopi Kimi/Codex DIPENSIUNKAN (baca AGENTS.md langsung); TERSISA cuma Cursor yang butuh format khusus
  // (.mdc + alwaysApply) -> disalin PENUH dari AGENTS.md biar kualitas di Cursor IDENTIK dengan di Claude.
  // Default `--check` (cuma-baca cek sinkron); `--write` membuat/memperbarui. Di shouldPassProjectRoot ->
  // --project-root supaya target project USER. setup-pola-b/update memanggil generator ini otomatis
  // (SELALU, init & update; fail-safe).
  "adapter-sync": "engine/adapter-rules-gen.mjs",
  // Router perintah kit versi Node (kit.mjs). Bentuk array ["kit.mjs","<sub>"] = subperintah; cabang
  // Node di bawah menyuntik --project-root supaya kit.mjs menginspeksi kit di CWD USER (.lintasai
  // project), BUKAN cache npm. kit.mjs men-delegasi setup/update/check-update/uninstall/rollback ke
  // setup-pola-b.mjs/update-kit.mjs/uninstall.mjs/engine/rollback.mjs.
  //
  // v6.0.0 — 19 perintah MAINTAINER dicabut dari dispatcher client (preflight · peta-gen ·
  // skill-registry · unicode-check · project-check · perf-budget · stack-check · ai-config-check ·
  // env-keys · swallowed-check · complexity-budget · type-escape-check · debug-artifact-check ·
  // quality-ledger · plan-scout, dan `bump` di kit.mjs). Robotnya pindah ke <repo>/tools/ yang TIDAK
  // dikirim ke client. KENAPA: client non-programmer tak pernah mengetik perintah CLI, dan kernel
  // AGENTS.md tak menyebut satu pun dari mereka — jadi 242 KB perkakas mendarat di tiap project tanpa
  // satu pun jalan untuk dipicu. Maintainer memakainya langsung: `npm run preflight`,
  // `node tools/<robot>.mjs`.
  "doctor": ["kit.mjs", "doctor"],
  "version": ["kit.mjs", "version"],
  "status": ["kit.mjs", "status"],
  // (diff/check-update/setup DICABUT v8.0.0: duplikat doctor / update --check-only / init.)
};

function showHelp() {
  console.log("");
  console.log("lintasAI CLI - AI workflow kit for Claude Code");
  console.log("");
  console.log("Usage:");
  console.log("  npx lintasai <command> [args]");
  console.log("");
  console.log("Commands:");
  console.log("  init           Setup kit di project (alias setup-pola-b)");
  console.log("  update         Update kit ke versi terbaru (cek-saja tanpa mengubah: update --check-only)");
  console.log("  doctor         Verify kit integrity");
  console.log("  status         Show kit status ringkas (1-layar)");
  console.log("  version        Show kit version");
  console.log("  rollback       Rollback ke versi sebelumnya");
  console.log("  uninstall      Remove kit dari project");
  console.log("  enable-risk-gate   Pasang-ulang Palang Rem (konfirmasi aksi berbahaya) 1-langkah - default sudah NYALA sejak v1.61.0, pertahankan setelan lain");
  console.log("  enable-rak-gate    Pasang-ulang Palang Rak: sebelum AI ubah berkas berisiko pertama kali per sesi, panduan terkait wajib BENAR-BENAR dibuka (diperiksa dari catatan pembacaan, bukan klaim); maks 2x/sesi - default sudah NYALA");
  console.log("  rak <topik>        Beri topik -> daftar rak/skill relevan (~300 char) tanpa baca registry.json penuh; routing hemat token (READ-ONLY). Pakai: rak \"buat halaman login\"");
  console.log("  adapter-sync       Buat/cek berkas aturan Cursor (.cursor/rules) - salinan penuh AGENTS.md biar kualitas di Cursor identik Claude (Codex/Kimi kini baca AGENTS.md akar langsung). --write utk buat/perbarui (default cek-sinkron)");
  console.log("");
  console.log("Examples:");
  console.log("  npx lintasai init");
  console.log("  npx lintasai update");
  console.log("  npx lintasai doctor");
  console.log("");
  console.log("More info: https://github.com/ojokesusu/lintasAI");
}

// GERBANG PLATFORM — ini SATU-SATUNYA tempat lintasAI menolak sistem operasi lain.
//
// KENAPA di sini, BUKAN lewat field `os` di package.json (dicabut 2026-08-10): dengan `os: ["win32"]`,
// npm menolak paketnya dengan EBADPLATFORM sebelum satu baris kode kit pun sempat jalan — jadi pesan
// penjelasan di bawah ini, yang sudah ditulis lengkap sejak lama, TAK PERNAH SEKALI PUN terbaca orang.
// Yang dilihat calon pemakai cuma error mentah npm tanpa sebab, tanpa jalan keluar. Kit tetap
// Windows-only secara fungsi; yang berubah cuma: penolakannya kini menjelaskan diri.
// Dikunci tests/create-lintasai.test.mjs + tests/gerbang-platform.test.mjs.
if (os.platform() !== "win32") {
  console.error("");
  console.error("[BERHENTI] lintasAI untuk sekarang cuma jalan di Windows.");
  console.error("");
  console.error("Sistem yang terdeteksi: " + os.platform() + " (" + os.arch() + ")");
  console.error("");
  console.error("Kenapa: isi kit sudah 100% Node (tak ada lagi PowerShell sejak v2.0.0), tapi pemasangnya");
  console.error("        masih mengasumsikan cara Windows menata berkas - huruf drive C:\\, %USERPROFILE%,");
  console.error("        dan letak config global %USERPROFILE%\\.claude. Memaksakannya di mac/Linux akan");
  console.error("        memasang kit di tempat yang salah, dan aturannya tak akan pernah termuat.");
  console.error("        Dukungan mac/Linux ada di rencana, sebagai rilis tersendiri.");
  console.error("");
  console.error("Yang bisa kamu lakukan sekarang:");
  console.error("  1. Jalankan di Windows 10 ke atas (termasuk mesin virtual: VirtualBox/VMware/Hyper-V).");
  console.error("  2. Pakai WSL2 hanya untuk menjalankan alat AI-nya, tapi simpan project di sisi Windows");
  console.error("     (/mnt/c/...), lalu pasang kit dari sisi Windows itu.");
  console.error("");
  console.error("Pantau perkembangannya: https://github.com/ojokesusu/lintasAI/issues?q=label%3Across-platform");
  // exitCode + `return` dari modul (sah di CommonJS: Node membungkus berkas .js dalam fungsi) —
  // `process.exit` memutus stderr saat dipipa, padahal penjelasan di atas justru satu-satunya hal
  // yang berguna di jalur ini.
  process.exitCode = 1;
  return;
}

// v1.5.6 Fix #4: Claude Code Desktop vs Web context detection.
// Web context (claude.ai chat) TIDAK punya filesystem access - `npx lintasai init`
// akan gagal silent / aneh. Detect lebih awal supaya user tahu pakai Desktop.
const isInteractiveTTY = process.stdin.isTTY === true || process.stdout.isTTY === true;
const hasClaudeCodeEnv = !!(
  process.env.CLAUDE_CODE_ENTRYPOINT ||
  process.env.CLAUDECODE ||
  process.env.CLAUDE_CODE === "desktop"
);
const looksLikeShell = !!(process.env.SHELL || process.env.ComSpec || process.env.PSModulePath);

if (!isInteractiveTTY && !hasClaudeCodeEnv && !looksLikeShell) {
  console.error("");
  console.error("[ERROR] lintasAI tampaknya dijalankan dari Claude.ai Web (browser).");
  console.error("");
  console.error("Web Claude TIDAK SUPPORT filesystem operations (mkdir, write file, spawn process).");
  // NAMA-FOLDER-KIT HARDCODE (disengaja): launcher ini CommonJS, tak bisa import konstanta ESM
  // NAMA_FOLDER_KIT dari engine/project-root.mjs secara sinkron. Cuma pesan error, jadi dynamic
  // import tak sepadan. Kalau nama folder kit berubah, baris di bawah WAJIB disunting manual.
  console.error("Kit ini butuh shell access untuk: clone repo, write .lintasai/, run setup-pola-b.mjs.");
  console.error("");
  console.error("Solusi: pakai Claude Code DESKTOP (bukan Web):");
  console.error("  1. Download Desktop: https://claude.ai/download");
  console.error("  2. Install + sign in pakai akun Anthropic kamu");
  console.error("  3. Buka project folder di Desktop, lalu jalankan: npx lintasai init");
  console.error("");
  console.error("Kalau kamu YAKIN ini Desktop (false positive detection), set env:");
  console.error("  Windows PowerShell: $env:CLAUDECODE='1'; npx lintasai init");
  console.error("");
  process.exit(1);
}

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command || command === "help" || command === "--help" || command === "-h") {
  showHelp();
  process.exit(0);
}

const target = COMMANDS_NODE[command];
if (!target) {
  console.error("[ERROR] Unknown command: " + command);
  console.error("Run: npx lintasai help");
  process.exit(1);
}
const userCwd = process.cwd();
// For init/update/uninstall: pass user CWD explicitly so script knows real project root
const shouldPassProjectRoot = ["init", "update", "uninstall", "rollback", "enable-risk-gate", "enable-rak-gate", "adapter-sync"].includes(command);

// v1.26.1: deteksi eksekusi non-interaktif (alat AI / CI) supaya skrip anak tak menggantung menunggu
// input keyboard. { stdio: "inherit" } membuat anak mewarisi STDIN terbuka; kalau tak ada manusia
// mengetik, prompt bisa memblokir. Set LINTASAI_NONINTERACTIVE=1 -> helper Node lewati prompt dgn
// default aman. LINTASAI_INTERACTIVE=1 memaksa mode interaktif (menang atas auto-deteksi) - untuk
// manusia di Git Bash/mintty yang stdin-nya pipe (isTTY undefined). AI Bash tool SENGAJA tetap
// non-interaktif (tak auto-treat Git Bash sebagai interaktif) supaya tak menggantung.
const forceInteractiveVal = process.env.LINTASAI_INTERACTIVE;
const forceInteractive = !!(forceInteractiveVal && forceInteractiveVal !== "0" && forceInteractiveVal !== "false");
const stdinIsInteractive = process.stdin.isTTY === true;
const envNonInteractive = !!(
  process.env.LINTASAI_NONINTERACTIVE ||
  process.env.CLAUDECODE ||
  process.env.CI
);
const nonInteractive = forceInteractive ? false : (!stdinIsInteractive || envNonInteractive);

const childEnv = Object.assign({}, process.env);
if (nonInteractive) childEnv.LINTASAI_NONINTERACTIVE = "1";

// v2.0.0: kit 100% Node. Tiap perintah -> port Node: skrip .mjs langsung ATAU ["kit.mjs","<sub>"]
// (subperintah router). Dispatcher menyuntik --project-root <cwd-user> supaya kit menyasar
// .lintasai di project USER, bukan folder kit di cache npm.
const nodeTarget = target;
let nodeScript;
let leadingArgs; // subperintah untuk router kit.mjs (mis. ["doctor"]); kosong untuk skrip langsung
let injectProjectRoot;
if (Array.isArray(nodeTarget)) {
  nodeScript = path.join(KIT_ROOT, nodeTarget[0]);
  leadingArgs = nodeTarget.slice(1);
  injectProjectRoot = true; // router kit.mjs SELALU butuh akar project (inspeksi folder kit user)
} else {
  nodeScript = path.join(KIT_ROOT, nodeTarget);
  leadingArgs = [];
  // init/update/uninstall/rollback dll butuh akar project user (--project-root). TANPA ini,
  // pemasang jatuh ke path.dirname(KitDir) = cache npm -> memasang ke LOKASI SALAH.
  injectProjectRoot = shouldPassProjectRoot;
}
const nodeArgs = injectProjectRoot
  ? [...leadingArgs, "--project-root", userCwd, ...args]
  : [...leadingArgs, ...args];
const nodeChild = spawn(process.execPath, [nodeScript, ...nodeArgs], { stdio: "inherit", cwd: userCwd, env: childEnv });
nodeChild.on("error", (err) => {
  console.error("[ERROR] Perintah '" + command + "' tidak bisa dijalankan (Node): " + err.message);
  console.error("Pastikan Node.js terpasang + ada di PATH (https://nodejs.org), lalu ulangi.");
  console.error("Kalau masih gagal, kirim pesan error di atas ke tim teknis kamu.");
  process.exit(127);
});
nodeChild.on("close", (code) => {
  // Anak mati oleh SIGNAL (taskkill/timeout/OOM/Ctrl+C) -> code=null = GAGAL (1), bukan sukses palsu (0).
  process.exit(code == null ? 1 : code);
});
