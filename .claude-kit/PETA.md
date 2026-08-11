# PETA.md — Peta "Apa di Mana" + Aturan Penempatan Berkas Baru (lintasAI)

> ⚙️ **BERKAS DI-GENERATE OTOMATIS** oleh `engine/peta-gen.mjs` (`npx lintasai peta-gen`). JANGAN edit tangan —
> perubahan tangan akan tertimpa + guard `checkPetaDrift` (preflight) memerah. Ubah lewat sumbernya:
> folder/skill di disk, atau katalog konstanta di `engine/peta-gen.mjs`. Versi skema: 1.
>
> **AI: baca berkas INI PERTAMA** untuk tahu "apa di mana" + ke mana menaruh berkas baru (struktur-hygiene).

## 1. Struktur folder — apa fungsi tiap folder

| Folder | Fungsi | Di `.claude-kit/` klien? |
|---|---|---|
| `bin/` | Dispatcher `npx lintasai <cmd>` (pintu masuk semua perintah). | ✅ ikut |
| `create-lintasai/` | Paket pembuat `npm create lintasai` (bootstrap installer). | — (hanya repo kit) |
| `docs/` | Dokumentasi repo kit + ADR keputusan (`docs/decisions/`). Sebagian dinegasi di files[] (tak semua ikut). | ✅ ikut |
| `engine/` | Robot & helper Node (`*.mjs`/`*.js`) — mesin kit: generator, guard, helper installer. | ✅ ikut |
| `rules/` | Rak aturan detail rujukan on-demand (per-seksi). `rules/INDEX.md` = daftar isi + pemicu. | ✅ ikut |
| `skills/` | Buku panduan per-bidang (`<nama>/SKILL.md`). `registry.json` = indeks yang dibaca dispatcher. | ✅ ikut |
| `templates/` | Berkas yang di-DEPLOY ke project client saat pasang (skeleton docs + panduan tim). | ✅ ikut |
| `tests/` | Tes Node (`*.test.mjs`) + `preflight.mjs` (gerbang pra-rilis). | ✅ ikut |

## 2. Skill (buku panduan per-bidang) — apa di mana + kapan aktif

> 🔒 = rawan keamanan (wajib dibaca saat menyentuh bidangnya). Pemicu = kata di prompt yang menyalakan skill.
> Indeks mesin-baca: `skills/registry.json` (dijaga sinkron oleh `checkRegistryDrift`).

| Skill | Divisi | Pemicu (contoh) | Berkas |
|---|---|---|---|
| 🔒 admin-panel | backend | admin-panel, panel-admin, dashboard-admin, backoffice, … | `skills/admin-panel/SKILL.md` |
| analytics | product | analytics, analitik, lacak, tracking, … | `skills/analytics/SKILL.md` |
| 🔒 anti-fraud | keamanan | anti-fraud, antifraud, fraud, penipuan, … | `skills/anti-fraud/SKILL.md` |
| 🔒 auth | keamanan | login, masuk, daftar, sign-up, … | `skills/auth/SKILL.md` |
| 🔒 backend | backend | endpoint, backend, rest-api, server-action, … | `skills/backend/SKILL.md` |
| background-job | backend | antrean, antrian, queue, cron, … | `skills/background-job/SKILL.md` |
| caching | backend | cache, caching, cached, cache-aside, … | `skills/caching/SKILL.md` |
| cakupan-tes | qa | tes, test, testing, coverage, … | `skills/cakupan-tes/SKILL.md` |
| chrome-extension | stack | chrome-extension, manifest-v3, content-script, extension-service-worker | `skills/chrome-extension/SKILL.md` |
| cloudflare | stack | cloudflare, wrangler, cloudflare-workers, durable-object | `skills/cloudflare/SKILL.md` |
| 🔒 database | database | migrasi, migration, skema, schema, … | `skills/database/SKILL.md` |
| deploy | stack | vercel, railway, fly-io, render.yaml, … | `skills/deploy/SKILL.md` |
| devops | devops | deploy, rilis, release, produksi, … | `skills/devops/SKILL.md` |
| ekspor-laporan | backend | ekspor, export, unduh, download, … | `skills/ekspor-laporan/SKILL.md` |
| email-notifikasi | backend | email, surel, otp, kode verifikasi, … | `skills/email-notifikasi/SKILL.md` |
| frontend-lanjutan | stack | react-testing-library, react-useeffect, framer-motion, react-animasi | `skills/frontend-lanjutan/SKILL.md` |
| galeri-folder | stack | struktur-folder, galeri-folder, layout-project | `skills/galeri-folder/SKILL.md` |
| github-actions | stack | github-actions, ci-workflow, actions-yaml | `skills/github-actions/SKILL.md` |
| go | stack | golang, goroutine, go-module, errgroup, … | `skills/go/SKILL.md` |
| 🔒 kepatuhan-teregulasi | keamanan | judi, gambling, fintech, kyc, … | `skills/kepatuhan-teregulasi/SKILL.md` |
| nextjs | stack | next.js, nextjs, app-router, server-component, … | `skills/nextjs/SKILL.md` |
| 🔒 owasp | stack | owasp, xss, csrf, ssrf, … | `skills/owasp/SKILL.md` |
| 🔒 pembayaran | keamanan | bayar, pembayaran, payment, checkout, … | `skills/pembayaran/SKILL.md` |
| perbaiki-error | devops | error, crash, gagal-build, build-gagal, … | `skills/perbaiki-error/SKILL.md` |
| permukaan-ai | security | permukaan ai, audit keamanan ai, mcp, ai-config, … | `skills/permukaan-ai/SKILL.md` |
| php | stack | php, laravel, phpstan, laravel-pint | `skills/php/SKILL.md` |
| python | stack | python, fastapi, django, pydantic, … | `skills/python/SKILL.md` |
| 🔒 rate-limiting | keamanan | rate-limit, rate-limiting, throttle, throttling, … | `skills/rate-limiting/SKILL.md` |
| 🔒 realtime | backend | realtime, real-time, websocket, socket.io, … | `skills/realtime/SKILL.md` |
| seo | marketing | seo, sitemap, robots, meta-tag, … | `skills/seo/SKILL.md` |
| 🔒 supabase-prisma | stack | supabase, prisma, drizzle, rls-policy | `skills/supabase-prisma/SKILL.md` |
| tahan-gagal | backend | retry, coba-ulang, coba-lagi, timeout, … | `skills/tahan-gagal/SKILL.md` |
| uiux | frontend | aksesibilitas, a11y, wcag, disabilitas, … | `skills/uiux/SKILL.md` |
| 🔒 upload-storage | backend | unggah, upload, foto, gambar, … | `skills/upload-storage/SKILL.md` |
| vps | stack | vps, nginx, systemd, pm2, … | `skills/vps/SKILL.md` |
| 🔒 wallet-ledger | keamanan | wallet, dompet-digital, saldo, ledger, … | `skills/wallet-ledger/SKILL.md` |
| webdesign | frontend | desain, design, tata-letak, layout, … | `skills/webdesign/SKILL.md` |

_37 skill terdaftar._

## 3. Aturan penempatan berkas BARU (struktur-hygiene) — baca SEBELUM bikin berkas

Taruh berkas baru di RUMAH yang benar + daftarkan supaya tak "un-ship senyap" (tak sampai ke client) / basi:

| Mau bikin… | Rumahnya | Wajib didaftar/dijalankan |
|---|---|---|
| **Skill baru** (buku panduan bidang) | `skills/<nama>/SKILL.md` (FLAT, 1 folder/skill) | `npx lintasai skill-registry` (perbarui `registry.json`) + tambah baris `SKILL.md` ke grup `skills` di `engine/kit-files.json` |
| **Rak aturan baru** (detail on-demand) | `rules/<seksi>.md` | Tambah baris ke `rules/INDEX.md` + grup `rules` di `engine/kit-files.json`; rujuk dari kernel via path |
| **Robot/helper Node baru** | `engine/<nama>.mjs` | Tambah ke grup `node_lib` di `engine/kit-files.json`; kalau jadi perintah → `COMMANDS_NODE` di `bin/lintasai.js` |
| **Tes baru** | `tests/<nama>.test.mjs` | Otomatis terpungut `npm test` (tak perlu daftar) |
| **Template untuk client** | `templates/<nama>` | Tambah grup `templates` di `engine/kit-files.json` + blok `teamFiles` `setup-pola-b.mjs` kalau di-deploy |
| **Dokumen repo kit** | `docs/<nama>.md` | On-demand (§7). ADR → `docs/decisions/ADR-XXX-*.md` |
| **Berkas root aturan/prompt** | akar repo | Tambah `package.json` `files[]` (root `.md` dikirim satu-per-satu, bukan pola `*.md`) + grup cocok di `engine/kit-files.json` |

**Prinsip:** jangan buang berkas di root sembarangan — tiap berkas punya rumah. Berkas yang dikirim ke client WAJIB terdaftar di `engine/kit-files.json` **dan** `package.json` `files[]`; kalau tidak, guard coverage (`skill-registry.test`/`package-bundle.test`) memerah ATAU berkas tak sampai ke client (un-ship senyap).

## 4. Peta lain (ini MELENGKAPI — jangan duplikasi isinya)

PETA.md = inventaris "apa di mana" + aturan penempatan. Untuk hal lain, rumahnya:

| Butuh… | Baca | Catatan |
|---|---|---|
| Narasi makro + alur perintah (kenapa/bagaimana) | `docs/architecture.md` | Peta makro prosa (READ-MINIMAL §7.3) — ikut ke client |
| Fakta/angka X (versi, jumlah, daftar repo) tinggal di mana + 1-sumber/duplikat | `docs/PETA_SUMBER_KEBENARAN.md` | ⚠️ **INTERNAL repo kit — TAK ada di client** |
| Berkas mana ikut bergerak per jenis perubahan | `docs/RESEP_PERUBAHAN.md` | Checklist per-perubahan |
| Daftar isi rak rujukan on-demand + pemicunya | `rules/INDEX.md` | Ikut ke client |

