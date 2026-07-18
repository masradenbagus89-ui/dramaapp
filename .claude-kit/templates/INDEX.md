# Index - Daftar Lengkap Dokumen lintasAI v2.9.0

> Master index untuk navigasi ~115 file kit.
> Last updated: 2026-07-15 (v2.8.0: satu perintah update untuk SEMUA client — `npx lintasai@latest update`, sumber paket npm; jalur repo+GPG jadi `--from-repo` owner-saja)

---

## Entry Points (root) - Yang user paste ke Claude Code

| File | Trigger | Untuk |
|---|---|---|
| JALANKAN_KIT.md | Setup awal kit di project (first time) | Owner |
| UPDATE_KIT_PROMPT_v1.md | Update kit ke versi baru | Owner |
| AUDIT_POST_SETUP_PROMPT_v1.md | Audit 8-dimensi setelah setup | Owner |
| PROJECT_LIFECYCLE_PROMPT_v1.md | Workflow 4 stage (Kickoff/Bootstrap/Update/Migration) | Owner |
| SPLIT_REPO_MIGRATION_PROMPT_v1.md | Migrate monolith ke 3-repo split | Owner |
| POST_SETUP_CHECKLIST_PROMPT_v1.md | Eksekutor tipis Phase 5b (jalur pasang npm) | AI |
| MULAI_DI_SINI.md | Primer pertama untuk manusia non-programmer | Staff |

## Universal Rules

| File | Fungsi |
|---|---|
| CLAUDE_universal_v1.md | Universal AI rules (auto-loaded tiap sesi) |
| workflows/ (+ INDEX.md) | Rak detail on-demand pecah-per-seksi (pattern, popup, update tier, dst); LINTASAI_WORKFLOWS_v1.md = pengalih tipis |
| AGENTS.md.template | Template AGENTS.md per project |
| CLAUDE.md.template | Template CLAUDE.md per project |

## Node Scripts (root) - JALUR UTAMA (sejak migrasi PS→Node)

| Script | Fungsi |
|---|---|
| kit.mjs | Router perintah utama (version, doctor, status, diff, check-update, setup) |
| setup-pola-b.mjs | First-time setup (jalur `npx lintasai init`) |
| update-kit.mjs | Update kit dari GitHub + verifikasi tag GPG + auto-classify tier |
| uninstall.mjs | Safe uninstall dengan manifest verify |
| team-setup.mjs | Setup berkas kerja-tim |
| install-windows.mjs | Initial install ke ~/.claude |

## Lib (Helper Modules — Node)

| File | Fungsi |
|---|---|
| lib/popup-shim.mjs | Jawaban-aman non-interaktif untuk orkestrator (popup GUI dibuang, ADR-004) |
| lib/safety.mjs | Security helpers (path containment, reparse check, sha256) |
| lib/manifest-signing.mjs | HMAC manifest signing (anti-tampering) |
| lib/manifest.mjs | Bangun/baca manifest file terpasang |
| lib/rollback.mjs | Rollback ke versi sebelumnya via backup files |
| lib/json-merge-helpers.mjs | Deep-merge JSON (pertahankan kunci user) |
| lib/template-deploy.mjs | Deploy template ke project |
| lib/project-detect.mjs | Deteksi jenis/stack project |
| lib/version-detect.mjs | Deteksi versi kit terpasang |
| lib/agents-md.mjs | Generate/update AGENTS.md |
| lib/git-helpers.mjs | Helper git (branch, identity, MOTW) |
| lib/audit-helpers.mjs | Helper audit READ-ONLY |
| lib/kit-files.json (+ kit-files.mjs) | Single source of truth untuk file list (dibaca via JSON.parse) |

> Kit 100% Node (v2.0.0): daftar resmi berkas Node ada di `lib/kit-files.json` bagian `node_lib`
> (±25 modul `lib/*.mjs`).

## Templates

### Prompts Library
| File | Berisi |
|---|---|
| templates/PROMPT_LIBRARY.md | 23 prompt patterns ready-to-paste |
| templates/CHECKLIST_KEBUTUHAN_DOMAIN.md | Pemantik kebutuhan per-jenis-aplikasi (dipakai alur Aplikasi-Utuh §4.2c) |

### Onboarding & Workflow
| File | Berisi |
|---|---|
| templates/ONBOARDING.md | Day 0-14 staff onboarding playbook |
| templates/OWNER_SETUP_CHECKLIST_v1.md | Checklist owner saat pertama setup (Tier A/B/C action items) |
| templates/TEAM_FLOW_SKETCH_v1.md | Flow kerja tim end-to-end (siapa ngapain, staging->production, deploy aman) |
| templates/KERJA_KELOMPOK.md | Pintu masuk kerja kelompok (langkah klik kunci main + alur branch->PR->review, penghubung ke panduan tim) |
| templates/CLAUDE_TEAM_GUIDE.md | Team workflow guide |
| templates/REFACTOR_STANDARD.md | Standar Tangga Refactor 3-Tingkat (in-place -> modular -> split) |
| templates/GLOSSARY_NON_PROGRAMMER.md | Glossary istilah teknis untuk non-programmer |
| templates/ANALOGI_LIBRARY.md | **[ACTIVE]** 35 jargon + bahan analogi tools digital (opsional; auto-deploy ke `docs/` via setup-pola-b) |
| templates/UPDATE_GUIDE.md | 4-tier update strategy untuk staff |

### Stack & Architecture
| File | Berisi |
|---|---|
| templates/STACK_VERSIONS.md | Centralized version constants |
| templates/STACK_GUIDE.md | Stack convention guide |
| templates/STACK_MIGRATION_GUIDE.md | Migration antar versi stack |
| templates/STACK_DETECTION_PATTERN.md | Pattern auto-detect stack |
| templates/architecture.md | Reference architecture template (user-edited) |

### Database & Security
| File | Berisi |
|---|---|
| templates/DB_SCHEMA_SCAN_PROMPT.md | Scan database schema prompt |
| templates/RLS_SETUP_PROMPT.md | Setup Row Level Security |
| templates/MCP_SETUP.md | Setup MCP server Supabase/Postgres (4 opsi isolasi schema) |
| templates/OPERASI_DATABASE_AMAN.md | Ubah struktur DB tanpa downtime (expand-then-contract) + rollback runbook |
| templates/OBSERVABILITY_PRODUKSI.md | Alarm error produksi (Sentry) + structured logging + healthcheck — wajib sebelum online |
| templates/SECURITY_INCIDENT_PLAYBOOK.md | Incident response playbook (+ forensik staf-keluar READ-ONLY) |
| templates/THREAT_MODEL_NON_LEGAL.md | Peta ancaman tim tanpa jalur hukum (apa dijaga / dari siapa / dengan apa) |

### Split Repo Architecture
| File | Berisi |
|---|---|
| templates/SPLIT_REPO_AGENTS_TEMPLATES.md | Index AGENTS.md templates per repo |
| templates/SPLIT_REPO_NON_PROGRAMMER_PROMPTS.md | Cheatsheet prompt staff non-programmer |
| templates/SPLIT_REPO_TOOLS_SETUP.md | Setup tools untuk split-repo automation |
| templates/SPLIT_REPO_PREPROVISION_v1.md | Helper migrasi pra-split (COPY-not-MOVE, guardrails) |
| templates/ROBOT_CI_TESTING_PLAYBOOK.md | Test-before-trust playbook robot CI (non-programmer) |
| templates/CROSS_REPO_TYPES_PIPELINE.md | Auto types pipeline: backend schema -> @project/shared -> frontend auto-PR |
| templates/lintasai-portfolio.example.yml | Buku Induk repo: daftar semua repo + tingkat-sensitif + siapa boleh akses (sumber tunggal kelola-banyak-repo) |
| templates/PORTFOLIO_REGISTRY_v1.md | Panduan isi Buku Induk (non-programmer) |
| templates/ACCESS_CONTROL_NREPO_v1.md | Atur izin clone per-repo dari Buku Induk (cetak-rencana SIMULASI, owner eksekusi) |
| templates/WIZARD_BUKU_INDUK_v1.md | Naskah AI: wawancara owner bahasa biasa -> tulis lintasai-portfolio.yml (robot lib/portfolio-write.mjs) |
| templates/split-agents/FRONTEND.md | AGENTS.md template frontend repo |
| templates/split-agents/BACKEND.md | AGENTS.md template backend repo |
| templates/split-agents/SHARED.md | AGENTS.md template shared package |
| templates/split-agents/TOOLS.md | (OPT-IN) AGENTS.md template tools repo |
| templates/PROJECT_STARTER_TEMPLATES.md | Catalog 4 starter templates |

### GitHub Automation (templates/github/ - auto-copy ke project saat split-repo)
| File | Berisi |
|---|---|
| templates/github/AUTO_MERGE_SHARED_WORKFLOW.yml | Auto-merge shared update (semver-gated, BREAKING ditahan) |
| templates/github/PUBLISH_SHARED_WORKFLOW.yml | Publish @project/shared + guard cegah tipe rahasia bocor |
| templates/github/TRIGGER_FRONTEND_UPDATE.yml | Backend trigger frontend update (real-time dispatch) |
| templates/github/RECEIVE_BACKEND_UPDATE.yml | Frontend terima update -> auto-PR |
| templates/github/RENOVATE_FRONTEND.json | Config Renovate (dependency update terjadwal) |
| templates/github/GENERATE_TYPES_SCRIPT.md | Script generate tipe dari schema backend |
| templates/github/CODEOWNERS.template | Template CODEOWNERS (review wajib per-path) |
| templates/github/pull_request_template.md | Template badan PR |
| templates/github/workflows/ai-review.yml | Workflow AI PR reviewer (GENTING/PENTING/RAPIKAN) |
| templates/github/workflows/backup-schemas.yml | Cron backup pg_dump per-schema harian |
| templates/github/workflows/secret-guard.yml | Penjaga kebocoran rahasia (tolak .env asli ter-commit; peringatan kunci asli) |
| templates/github/workflows/audit-access.yml | Pengingat cek-akses bulanan (buka Issue, TIDAK mencabut akses) |
| templates/github/scripts/ai-review.cjs | Skrip AI PR reviewer (dipanggil ai-review.yml; .cjs = kebal setelan "type":"module" project) |

### Discord Integration
| File | Berisi |
|---|---|
| templates/DISCORD_BOT_INTEGRATION.md | **[OPSIONAL — hanya kalau tim pakai Discord]** Discord server structure + webhook + bot custom |

### Misc
| File | Berisi |
|---|---|
| templates/INDEX.md | THIS FILE - master index |
| templates/glossary.md | Glossary umum |
| templates/_EXAMPLE.md | Example doc template |
| templates/_PATTERNS.md | Pattern reference |
| templates/feature-flags-advanced.md | **[LANJUTAN — pasca-rilis, bukan tahap awal]** Feature flag advanced patterns |
| templates/MIGRATE_TO_SUBFOLDER_PROMPT_v1.md | Migrate kit ke subfolder prompt |
| templates/settings.local.json.template | Template settings lokal Claude Code |
| templates/RESEP_PERUBAHAN.md | Resep "berkas mana ikut berubah" per jenis perubahan |
| templates/WIZARD_PENCEGAH_DRIFT_v1.md | Naskah AI: pindai project -> tulis docs/consistency-map.jsonc dgn fakta NYATA (anti alarm-palsu) |
| templates/WIZARD_SEO_CHECK_v1.md | Naskah AI: audit SEO dasar paham framework (title/meta/OG/heading) - bukan robot regex (anti alarm-palsu) |
| templates/consistency-map.example.jsonc | Contoh peta-konsistensi untuk robot pemeriksa project |
| templates/decisions/_TEMPLATE.md | ADR template |
| templates/decisions/README.md | ADR convention |

## Docs (Auto-deployed ke project)

| File | Berisi |
|---|---|
| docs/SIGNED_RELEASE.md | GPG verification workflow |
| docs/NPX_INSTALL.md | Panduan install via npm (non-programmer) |
| docs/CLAUDE_CODE_MEDIATED_INSTALL.md | Install via Claude Code (klik-demi-klik) |
| docs/FAST_SMOKE.md | SOP smoke test cepat |
| docs/AUDIT_HISTORY.md | Arsip riwayat audit (era v1.2.x — historis, BUKAN advisori aktif) |

## Tests (suite Node `node --test` — jalankan `npm test` untuk jumlah terkini)

| File | Berisi |
|---|---|
| tests/smoke-portable.mjs | Gerbang smoke Node (syntax, critical files, manifest, orphans, JSON) |
| tests/preflight.mjs | Gerbang pra-rilis 1-perintah (`npm run preflight`) |
| tests/*.test.mjs | Suite tes Node (perilaku lib + orkestrator + penjaga template + anti-drift). Contoh: `security-guard`/`kit-templates-guard`, `rollback`, `update-kit`, `uninstall`, `setup-pola-b-write`, `install-mapping-sync`, `package-bundle`, `version-detect`, `consistency-check`, `template-deploy`, `skills-divisi`, `create-lintasai`, `secret-precommit`, `risk-gate`, `path-leak`, `modify-workflow-rule` |

## CI

| File | Berisi |
|---|---|
| .github/workflows/validate.yml | CI: fast-smoke + smoke-setup + yaml-lint + node-lint + node-test + preflight (semua Node) |
| .github/workflows/publish-npm.yml | Terbit npm saat tag (gerbang tes WAJIB lulus dulu) |

## Project Meta

| File | Berisi |
|---|---|
| README.md | User-facing docs |
| CHANGELOG.md | Release history (Keep a Changelog format) |
| CONTRIBUTING.md | Contribution guide + runbook terbit npm |
| TEAM_ROLLOUT_GUIDE_v1.md | Governance + exception management |
| LICENSE | License |
| .gitignore | Gitignore default |

---

## Navigasi Cepat (Most Used)

**First time user**:
1. README.md (overview)
2. JALANKAN_KIT.md (setup)
3. templates/ONBOARDING.md (staff onboarding flow)
4. templates/TEAM_FLOW_SKETCH_v1.md (flow kerja tim end-to-end)

**Routine owner**:
1. PROJECT_LIFECYCLE_PROMPT_v1.md (saat ada task baru)
2. AUDIT_POST_SETUP_PROMPT_v1.md (audit periodic)
3. UPDATE_KIT_PROMPT_v1.md (saat update kit)

**Saat masalah**:
1. templates/SECURITY_INCIDENT_PLAYBOOK.md (incident)
2. `npx lintasai rollback` (rollback berkas project dari backup)
3. `npx lintasai uninstall` (kalau mau uninstall)

**Saat scale team**:
1. SPLIT_REPO_MIGRATION_PROMPT_v1.md (migrate)
2. templates/SPLIT_REPO_NON_PROGRAMMER_PROMPTS.md (cheatsheet staff)
3. templates/ROBOT_CI_TESTING_PLAYBOOK.md (uji robot CI sebelum percaya)
4. templates/DISCORD_BOT_INTEGRATION.md (Discord setup)
