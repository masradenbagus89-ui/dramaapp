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
  // alat update menyasar .claude-kit di project user, BUKAN cache npm. Keputusan keamanan (repo di luar
  // daftar-putih, GPG) = default-AMAN-batal + butuh bendera eksplisit (--allow-untrusted-repo /
  // --allow-unsigned-tag), BUKAN popup (ADR-004).
  "update": "update-kit.mjs",
  // Penghapus kit (uninstall.mjs). Dispatcher menyuntik --project-root <cwd-user> (uninstall ada di
  // shouldPassProjectRoot). AKSI MERUSAK: tanpa --yes hanya menampilkan rencana lalu BERHENTI AMAN
  // (default-batal); butuh --yes eksplisit untuk benar-benar menghapus (AI konfirmasi ke staff dulu).
  "uninstall": "uninstall.mjs",
  // Balikin-versi (engine/rollback.mjs, aksi MERUSAK, sesi-khusus owner). Menjalankan versi Node
  // engine/rollback.mjs. Dispatcher menyuntik --project-root <cwd-user> (rollback ada di
  // shouldPassProjectRoot) supaya rollback menyasar .claude-kit + manifest di project user, BUKAN cache
  // npm. AKSI MERUSAK: tanpa --yes hanya menampilkan rencana lalu BERHENTI AMAN (default-batal); butuh
  // --yes eksplisit untuk benar-benar menimpa berkas dari backup (AI konfirmasi ke staff dulu).
  "rollback": "engine/rollback.mjs",
  // Robot pindai huruf-tipuan Unicode.
  "unicode-check": "engine/unicode-safety-check.mjs",
  // Robot self-registering skill (ADR-027): scan skills/*/SKILL.md -> tulis skills/registry.json (indeks dispatcher). Aman dipanggil ulang.
  "skill-registry": "engine/skill-registry.mjs",
  // Generator PETA.md (ADR-027 Tugas 15): scan folder top-level + skills/ -> tulis PETA.md ("apa di mana" +
  // aturan penempatan berkas baru). Deterministik/aman dipanggil ulang. Guard anti-basi checkPetaDrift di preflight.
  "peta-gen": "engine/peta-gen.mjs",
  // Robot pemeriksa kecocokan versi MODE PROJECT (baca peta .jsonc). Pakai: --repo-root . --checks-file <peta.jsonc>.
  "consistency-check": "engine/consistency-check.mjs",
  // Robot pemeriksa "kartu identitas project" (baca project.lintas.jsonc). Pakai: --repo-root . [--manifest-path <berkas>].
  "project-check": "engine/project-manifest.mjs",
  // Robot penjaga bahasa: pastikan tulisan kit ke staff tetap Bahasa Indonesia awam (ADR-004 #3 +
  // fondasi "Gate bahasa" sebelum orkestrator besar diport ke Node). Robot BARU (tak ada padanan PS).
  // Pakai: lang-check [berkas...] (tanpa argumen = pindai kode Node produksi kit).
  "lang-check": "engine/output-lang-check.mjs",
  // Gerbang Pra-Rilis 1-perintah (LAPIS 2 cetak-biru BUKU_PELAJARAN_DAN_PREFLIGHT, Tahap E). Klien
  // jalankan `npx lintasai preflight` (atau `... preflight --strict` saat mau rilis) untuk menjalankan
  // SEMUA pemeriksa + cek kelengkapan rilis sekaligus. Dispatcher menyuntik --project-root <cwd-user>
  // (preflight ada di shouldPassProjectRoot) supaya preflight memeriksa PROJECT KLIEN, bukan folder kit
  // di cache npm. preflight.mjs auto-deteksi "mode project" (pkg.name != lintasai) -> jalankan `npm test`
  // klien + cek kelengkapan klien yang lebih lunak. Aman dipanggil dari mana saja (cuma-baca + jalankan tes).
  "preflight": "tests/preflight.mjs",
  // Pasang-ulang "Palang Rem" risk-gate (hook PreToolUse minta konfirmasi aksi berbahaya) dengan 1 langkah.
  // Default NYALA sejak v1.61.0 (ADR-002): setup-pola-b memanggil ensureRiskGateHook otomatis tiap
  // init/update; perintah ini = jalur pasang-ULANG manual (hook terhapus/settings lama).
  // Helper engine/ensure-risk-gate-hook.mjs deep-merge ke
  // .claude/settings.json klien (pertahankan setelan lain, idempoten, fail-safe). Di shouldPassProjectRoot
  // -> dispatcher suntik --project-root supaya target .claude project USER, bukan cache npm.
  "enable-risk-gate": "engine/ensure-risk-gate-hook.mjs",
  // Nyalakan "Palang Fakta" (hook PreToolUse engine/fact-gate.mjs): sebelum AI mengubah berkas BERDAMPAK-TINGGI
  // (auth/DB/migrasi/RLS/API/pembayaran) pertama kali dalam sesi, ia ditahan + wajib menyajikan 4 fakta
  // (siapa pemakai, fungsi terdampak, bentuk data, instruksi verbatim). DEFAULT MATI (opt-in) - beda dari
  // risk-gate yang default nyala, karena palang ini menambah FRIKSI ke jalur kerja (ADR-014). Sebelum ini
  // robotnya dikirim ke tiap klien tanpa satu pun cara menyalakannya ("enable-command = backlog" ADR-014).
  "enable-fact-gate": "engine/ensure-fact-gate-hook.mjs",
  // Palang Rak: tahan edit PERTAMA berkas berisiko sampai panduan terkait benar-benar dibaca.
  // Bukti = catatan tanda-terima `Read` (bukan klaim AI) -> memenuhi ADR-008 Keputusan #3.
  "enable-rak-gate": "engine/ensure-rak-gate-hook.mjs",
  // Penjaga Baca Besar (hook PreToolUse engine/big-file-read-guard.mjs): tahan-LUNAK baca-utuh berkas >50KB
  // (Read tanpa offset) yang BUKAN kode/aturan-inti -> arahkan ke Grep/offset (hemat token). DEFAULT MATI
  // (opt-in, Tugas 8) - pagar EFISIENSI bukan keamanan, jadi owner yang menyalakan. Di shouldPassProjectRoot
  // -> dispatcher suntik --project-root supaya target .claude project USER, bukan cache npm.
  "enable-big-file-read-guard": "engine/ensure-big-file-read-guard-hook.mjs",
  // Pasang-ulang "Pengingat rekam pelajaran" (hook Stop yang mengingatkan AI menimbang §6.5 di akhir tugas
  // yang menyentuh kode - non-blokir, cuma menepuk pundak). Default NYALA (setup-pola-b memanggil
  // ensureFeedbackCaptureHook otomatis tiap init/update, keputusan owner 2026-07-17); perintah ini = jalur
  // pasang-ULANG manual (hook terhapus/settings lama). Helper engine/ensure-feedback-capture-hook.mjs deep-merge
  // ke .claude/settings.json klien (pertahankan setelan lain, idempoten, fail-safe). Di shouldPassProjectRoot
  // -> dispatcher suntik --project-root supaya target .claude project USER, bukan cache npm.
  "enable-feedback-capture": "engine/ensure-feedback-capture-hook.mjs",
  // Pasang "Gerbang mutu CI" (workflow .github/workflows/preflight.yml) ke project klien (OPT-IN, audit
  // 2026-06-28 PENTING #2). Menutup celah "robot mutu cuma jalan kalau AI ingat panggil preflight": tiap
  // push/PR ke GitHub -> robot mutu jalan OTOMATIS (backstop mesin). Helper engine/ensure-preflight-ci.mjs
  // menyalin template (idempoten, fail-safe, tak timpa editan klien tanpa --force). Di shouldPassProjectRoot
  // -> dispatcher suntik --project-root supaya target .github project USER, bukan cache npm.
  "enable-preflight-ci": "engine/ensure-preflight-ci.mjs",
  // Penjaga Anggaran Ukuran Halaman (Next.js, robot cuma-baca): baca manifest build .next lalu hitung
  // perkiraan ukuran JS per route, banding anggaran (default 500 KB). AUTO-SKIP kalau belum build/bukan
  // Next. Pakai SETELAH `npm run build`. Di shouldPassProjectRoot -> --project-root supaya baca .next
  // project USER. Pakai: perf-budget [--budget-kb 500].
  "perf-budget": "engine/perf-budget.mjs",
  // Robot mutu kode per-bahasa. Auto-deteksi bahasa gudang lalu jalankan alat-cek STATIS standar
  // (tsc/eslint/npm-audit, ruff/mypy/bandit, go vet/staticcheck, cargo clippy, phpstan) -> serahkan
  // FAKTA ke AI. Cuma-periksa (tak auto-fix, tak jalankan tes), config-gated. SENGAJA TIDAK di
  // shouldPassProjectRoot: robot pakai flag --repo-root (BUKAN --project-root) + butuh verb `run`.
  // Pakai: `npx lintasai stack-check run --repo-root .`.
  "stack-check": "engine/stack-check.mjs",
  // Robot pemindai konfigurasi-AI. Deteksi kunci-API bocor / izin lebar / hook unduh-jalankan /
  // frasa-tembus-pagar di .mcp.json / .claude/settings.json / SKILLS_LOCAL.md (cuma-baca; tingkat
  // GENTING/PENTING/RAPIKAN). SENGAJA TIDAK di shouldPassProjectRoot: pakai flag --repo-root.
  // Pakai: `npx lintasai ai-config-check --repo-root .`.
  "ai-config-check": "engine/ai-config-check.mjs",
  // Robot redaksi berkas "Rekam Pelajaran" (feedback-scrub, CUMA-BACA ~0 token, FASE B2 ADR-006). Dua verb:
  // `scrub <berkas>` (sisi client: tampilkan versi tersensor + temuan) / `verify <folder>` (sisi owner:
  // periksa berkas pelajaran, karantina yang masih bocor secret/PII/nama-bisnis). SENGAJA TIDAK di
  // shouldPassProjectRoot: pakai path/cwd langsung (dispatcher sudah spawn dgn cwd=project USER).
  // Pakai: `npx lintasai feedback-scrub scrub docs/pelajaran-lintasai/<berkas>.md`.
  "feedback-scrub": "engine/feedback-scrub.mjs",
  // Robot agregator berkas "Rekam Pelajaran" (feedback-aggregate, OWNER-ONLY, CUMA-BACA ~0 token, FASE C2
  // ADR-006): kumpulkan 40-50 berkas dari banyak client -> kelompok PER-ORGANISASI (1 org=1 suara) + de-dup +
  // rank by JANGKAUAN (bukan volume) + cek-silang KEBERADAAN penjaga kit -> tabel bahan-timbang owner. TIDAK
  // menstempel "LULUS/standar" (keputusan owner via gerbang otoritas). SENGAJA TIDAK di shouldPassProjectRoot:
  // pakai --dir <folder-berkas> + --kit-root. Pakai: `npx lintasai feedback-aggregate --dir <folder> [--jsonl]`.
  "feedback-aggregate": "engine/feedback-aggregate.mjs",
  // Robot Banding Kunci Env (Node BARU, CUMA-BACA ~0 token): banding NAMA kunci .env.example vs
  // .env.local -> lapor kunci yang BELUM di-set (penyebab crash deploy Vercel/Railway/Render
  // tersering). KEAMANAN: cuma NAMA kunci, NILAI rahasia tak pernah disentuh (engine/env-keys-check.mjs).
  // Di shouldPassProjectRoot -> dispatcher suntik --project-root supaya baca .env project USER.
  "env-keys": "engine/env-keys-check.mjs",
  // Robot "Error-ditelan-diam" (Node BARU, CUMA-BACA ~0 token): pindai blok penangkap-error KOSONG
  // (try/catch atau .catch() JS/TS + except: pass Python) yang menelan error tanpa pesan & tanpa
  // komentar-alasan -> pola yang menyembunyikan kegagalan (standar industri: ESLint no-empty + Go
  // errcheck). Jalan-keluar sah: tulis komentar DI DALAM blok. SENGAJA TIDAK di shouldPassProjectRoot:
  // robot menyapu dari CWD (cermin unicode-check); dispatcher sudah spawn dgn cwd=project USER.
  // Pakai: `npx lintasai swallowed-check` (atau beri path berkas/folder). Adaptasi ide willey-labs (MIT).
  "swallowed-check": "engine/swallowed-error-check.mjs",
  // Robot "Anggaran Kerumitan" (Node BARU, CUMA-BACA ~0 token): pindai berkas gemuk (>=500 baris) +
  // fungsi/blok panjang (>=100 baris) = sarang bug + boros token AI. Buang file auto-generate (Prisma/
  // Supabase/.d.ts) supaya tak jadi alarm-palsu. SARAN (RAPIKAN), tak memblokir. SENGAJA TIDAK di
  // shouldPassProjectRoot: robot menyapu dari CWD (cermin swallowed-check); dispatcher sudah spawn dgn
  // cwd=project USER. Pakai: `npx lintasai complexity-budget`. Adaptasi ide Ponytail (MIT).
  "complexity-budget": "engine/complexity-budget.mjs",
  // Penjaga pisah-repo (engine/split-guard.mjs) - memeriksa repo hasil pecah: rahasia ikut terbawa, tier
  // akses bentrok, berkas nyasar lintas-repo. TIDAK di shouldPassProjectRoot: robot memakai --repo-root
  // (bukan --project-root) dan sudah jatuh ke process.cwd(); dispatcher spawn dgn cwd=project USER.
  // GAGANG BARU 2026-07-18: robot ini sebelumnya dikirim ke SETIAP client tapi nol cara memanggilnya -
  // penegakannya bergantung AI ingat membaca SPLIT_REPO_MIGRATION_PROMPT_v1.md (anti-pola yang header
  // robotnya sendiri kritik). Dijaga permanen oleh engine/tool-reach-check.mjs (Buku Pelajaran LP-012).
  "split-guard": "engine/split-guard.mjs",
  // Daftar Frasa Terkunci (engine/locked-phrase-list.mjs) - cetak frasa di berkas aturan yang DIKUNCI tes,
  // dibaca SEBELUM memadatkan aturan (§4.18) supaya tak menghapus teks yang bikin tes merah. BUKAN
  // pemeriksa (tak memblokir, tak ikut preflight). Client bisa memakainya atas berkas aturan mereka
  // sendiri: `npx lintasai locked-phrases --file AGENTS.md`.
  "locked-phrases": "engine/locked-phrase-list.mjs",
  // Peta Aktivitas Project (robot cuma-baca ~0 token): baca `git log` cabang ini (opsi sejak tag
  // terakhir) lalu ringkas jadi FAKTA - commit per modul (peta dari project.lintas.jsonc) + per tipe
  // Conventional Commit + jendela waktu/tag. BUKAN peta lengkap/roadmap (header jujur). Umpan on-demand
  // untuk AI menyusun draf roadmap yang tetap DISETUJUI MANUSIA (rules/7.11-project-map.md).
  // Di shouldPassProjectRoot -> dispatcher suntik --project-root supaya baca git project USER. PATUH
  // ADR-001/ADR-011 (fakta bukan tebakan, on-demand, tak klaim lengkap).
  "project-map": "engine/project-map.mjs",
  // Plan-Scout (§4.19): robot pra-pindai CUMA-BACA deterministik. Diberi kata-kunci -> ringkasan
  // "mulai lihat di sini" (kandidat 8-dimensi + berkas cocok) SEBELUM AI membaca; mode migration-timeline
  // & reverse-ref. STATELESS (ADR-001: tanpa indeks tersimpan). Percepat Pindai Cepat di repo besar.
  "plan-scout": "engine/plan-scout.mjs",
  // Robot ID-project (project-id, CUMA-BACA ~0 token, FASE C1 ADR-006): hitung 3 ID hash-anonim
  // (ORG/REPO/STAFF) dari git remote + email untuk berkas "Rekam Pelajaran". Nilai MENTAH git cuma bahan
  // hash lalu DIBUANG (§8.1#6) - cetak HANYA hash. Di shouldPassProjectRoot -> --project-root supaya baca
  // git project USER. Pakai: `npx lintasai project-id` (atau --json).
  "project-id": "engine/project-id.mjs",
  // Generator berkas aturan 3 adapter harness (engine/adapter-rules-gen.mjs): Kimi (.kimi-code/AGENTS.md),
  // Cursor (.cursor/rules/lintasai.mdc), Codex (blok di AGENTS.md akar). Menyalin PENUH CLAUDE_universal_v1.md
  // -> kualitas kit di alat non-Claude IDENTIK dengan di Claude. Default `--check` (cuma-baca cek sinkron);
  // `--write` membuat/memperbarui. Di shouldPassProjectRoot -> --project-root supaya target project USER.
  // setup-pola-b/update memanggil generator ini otomatis (SELALU, init & update; fail-safe).
  "adapter-sync": "engine/adapter-rules-gen.mjs",
  // Pasang hook lintasAI ke config Kimi Code (per-project .kimi-code/config.toml, OPT-IN). Adaptor hook
  // (Palang Rem/pengingat) hanya aktif kalau terdaftar; Kimi pakai TOML (bukan JSON settings Claude).
  // OPT-IN + WAJIB DIUJI: dukungan hook per-project belum resmi didokumentasikan Kimi -> user jalankan
  // manual lalu uji di Kimi (KIMI_CODE_SETUP.md). Idempoten + fail-safe. Di shouldPassProjectRoot.
  "enable-kimi-hooks": "engine/kimi/ensure-kimi-hooks.mjs",
  // Router perintah kit versi Node (kit.mjs). Bentuk array ["kit.mjs","<sub>"] = subperintah; cabang
  // Node di bawah menyuntik --project-root supaya kit.mjs menginspeksi kit di CWD USER (.claude-kit
  // project), BUKAN cache npm. kit.mjs men-delegasi setup/update/check-update/uninstall/rollback ke
  // setup-pola-b.mjs/update-kit.mjs/uninstall.mjs/engine/rollback.mjs; 'bump' -> invokeLintasVersionBump
  // di engine/consistency-check.mjs.
  "doctor": ["kit.mjs", "doctor"],
  "version": ["kit.mjs", "version"],
  "status": ["kit.mjs", "status"],
  "diff": ["kit.mjs", "diff"],
  "check-update": ["kit.mjs", "check-update"],
  "setup": ["kit.mjs", "setup"],
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
  console.log("  update         Update kit ke versi terbaru");
  console.log("  check-update   Cek apakah ada versi baru (read-only)");
  console.log("  doctor         Verify kit integrity");
  console.log("  status         Show kit status ringkas (1-layar)");
  console.log("  version        Show kit version");
  console.log("  rollback       Rollback ke versi sebelumnya");
  console.log("  uninstall      Remove kit dari project");
  console.log("  unicode-check  Pindai karakter Unicode tersembunyi/berbahaya (Node)");
  console.log("  consistency-check  Cek kecocokan versi lintas-berkas project (baca peta .jsonc, Node)");
  console.log("  project-check      Cek 'kartu identitas project' vs kenyataan (project.lintas.jsonc, Node)");
  console.log("  lang-check         Cek tulisan kit ke staff tetap Bahasa Indonesia awam (bukan prosa Inggris, Node)");
  console.log("  preflight          Gerbang pra-rilis: jalankan semua pemeriksa + cek kelengkapan (pakai --strict saat mau rilis)");
  console.log("  enable-risk-gate   Pasang-ulang Palang Rem (konfirmasi aksi berbahaya) 1-langkah - default sudah NYALA sejak v1.61.0, pertahankan setelan lain");
  console.log("  enable-fact-gate   Nyalakan Palang Fakta: sebelum AI ubah berkas PENTING (login/database/API/pembayaran) pertama kali per sesi, ia wajib sebut dampaknya dulu - OPT-IN, default MATI");
  console.log("  enable-rak-gate    Nyalakan Palang Rak: sebelum AI ubah berkas berisiko pertama kali per sesi, panduan terkait wajib BENAR-BENAR dibuka (diperiksa dari catatan pembacaan, bukan klaim); maks 2x/sesi - OPT-IN, default MATI");
  console.log("  enable-big-file-read-guard  Nyalakan Penjaga Baca Besar: tahan-lunak saat AI baca-utuh berkas >50KB (tanpa offset) yang bukan kode/aturan-inti -> arahkan ke Grep/offset biar hemat token; retry ke-2 diloloskan - OPT-IN, default MATI");
  console.log("  enable-feedback-capture Pasang-ulang Pengingat rekam pelajaran (hook akhir-tugas ingatkan AI catat pelajaran §6.5) - default sudah NYALA, non-blokir");
  console.log("  enable-preflight-ci Pasang Gerbang mutu CI (robot mutu jalan otomatis tiap push/PR GitHub) - OPT-IN");
  console.log("  perf-budget        Cek perkiraan ukuran JS per halaman vs anggaran (Next.js; jalankan setelah build)");
  console.log("  stack-check        Jalankan alat-cek mutu STATIS per-bahasa (tsc/eslint/ruff/go vet...); cuma-periksa. Pakai: stack-check run --repo-root .");
  console.log("  ai-config-check    Pindai konfigurasi AI (.mcp.json/settings/skill) cari kunci bocor/izin lebar/frasa tembus-pagar (READ-ONLY). Pakai: ai-config-check --repo-root .");
  console.log("  feedback-scrub     Redaksi berkas Rekam Pelajaran: `scrub <berkas>` sensor secret/PII/nama-bisnis, `verify <folder>` periksa bocoran (READ-ONLY, ~0 token)");
  console.log("  feedback-aggregate OWNER: kumpulkan berkas pelajaran banyak client -> tabel per-organisasi urut jangkauan + cek penjaga kit (bahan-timbang, tak vonis LULUS). Pakai: feedback-aggregate --dir <folder>");
  console.log("  env-keys           Banding NAMA kunci .env.example vs .env.local, lapor yang belum di-set (cegah crash deploy; CUMA nama, bukan nilai rahasia)");
  console.log("  swallowed-check    Pindai blok penangkap-error KOSONG (catch/except menelan error tanpa pesan); tulis komentar-alasan di dalam blok utk lolos (READ-ONLY)");
  console.log("  complexity-budget  Pindai berkas gemuk (>=500 baris) + fungsi panjang (>=100 baris) = sarang bug + boros token AI; buang file auto-generate; SARAN, tak memblokir (READ-ONLY)");
  console.log("  split-guard        Periksa repo hasil pecah-repo: rahasia ikut terbawa / tier akses bentrok / berkas nyasar lintas-repo (READ-ONLY). Pakai: split-guard --repo-root .");
  console.log("  locked-phrases     Cetak frasa di berkas aturan yang DIKUNCI tes - baca DULU sebelum memadatkan aturan biar tak menghapus teks yang bikin tes merah (READ-ONLY, tak memblokir)");
  console.log("  project-map        Ringkas riwayat commit jadi FAKTA per-modul/per-tipe (umpan draf roadmap; READ-ONLY, bukan peta lengkap)");
  console.log("  peta-gen           Tulis PETA.md ('apa di mana' + aturan penempatan berkas baru) dari struktur folder + skills/. Deterministik; dijaga anti-basi di preflight");
  console.log("  plan-scout <kata>  Pra-pindai CUMA-BACA: ringkasan 'mulai lihat di sini' + kandidat 8-dimensi (percepat Pindai Cepat §4.19; --migration-timeline/--reverse-ref)");
  console.log("  project-id         Hitung 3 ID hash-anonim (ORG/REPO/STAFF) utk Rekam Pelajaran dari git (nilai mentah dibuang; READ-ONLY). Pakai: project-id [--json]");
  console.log("  adapter-sync       Buat/cek berkas aturan 3 alat AI (Kimi/Cursor/Codex) - salinan penuh aturan biar kualitas di alat non-Claude identik Claude. --write utk buat/perbarui (default cek-sinkron)");
  console.log("  enable-kimi-hooks  Pasang pagar keamanan Kimi ke config .kimi-code/config.toml (per-project) - tolak perintah berbahaya + pengingat. Jalankan manual lalu WAJIB uji di Kimi (lihat KIMI_CODE_SETUP.md)");
  console.log("");
  console.log("Examples:");
  console.log("  npx lintasai init");
  console.log("  npx lintasai update");
  console.log("  npx lintasai doctor");
  console.log("");
  console.log("More info: https://github.com/ojokesusu/lintasAI");
}

if (os.platform() !== "win32") {
  console.error("");
  console.error("[ERROR] lintasAI saat ini Windows-only.");
  console.error("");
  console.error("Platform terdeteksi: " + os.platform() + " (" + os.arch() + ")");
  console.error("Reason: kit kini 100% Node (PowerShell sudah dihapus di v2.0.0), TAPI pemasang &");
  console.error("        beberapa jalur masih mengasumsikan konvensi Windows (path C:\\, %USERPROFILE%,");
  console.error("        config global %USERPROFILE%\\.claude). Dukungan mac/linux belum dibuka (rencana");
  console.error("        rilis terpisah).");
  console.error("");
  console.error("Workaround sekarang:");
  console.error("  1. Pakai Windows VM (VirtualBox/VMware/Hyper-V) + Windows 10+");
  console.error("  2. Pakai WSL2 hanya untuk Claude Code, tapi project di /mnt/c/ Windows-side");
  console.error("");
  console.error("Track progress: https://github.com/ojokesusu/lintasAI/issues?q=label%3Across-platform");
  process.exit(1);
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
  console.error("Kit ini butuh shell access untuk: clone repo, write .claude-kit/, run setup-pola-b.mjs.");
  console.error("");
  console.error("Solusi: pakai Claude Code DESKTOP (bukan Web):");
  console.error("  1. Download Desktop: https://claude.ai/download");
  console.error("  2. Install + sign in pakai akun Anthropic kamu");
  console.error("  3. Buka project folder di Desktop, paste prompt JALANKAN_KIT.md");
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
const shouldPassProjectRoot = ["init", "update", "uninstall", "rollback", "preflight", "enable-risk-gate", "enable-fact-gate", "enable-rak-gate", "enable-big-file-read-guard", "enable-feedback-capture", "enable-preflight-ci", "perf-budget", "env-keys", "project-map", "project-id", "plan-scout", "adapter-sync", "enable-kimi-hooks"].includes(command);

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
// .claude-kit di project USER, bukan folder kit di cache npm.
const nodeTarget = target;
let nodeScript;
let leadingArgs; // subperintah untuk router kit.mjs (mis. ["doctor"]); kosong untuk skrip langsung
let injectProjectRoot;
if (Array.isArray(nodeTarget)) {
  nodeScript = path.join(KIT_ROOT, nodeTarget[0]);
  leadingArgs = nodeTarget.slice(1);
  injectProjectRoot = true; // router kit.mjs SELALU butuh akar project (inspeksi .claude-kit user)
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
