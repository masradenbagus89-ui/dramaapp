# PETA.md — Peta "Apa di Mana" (lintasAI)

> ⚙️ **BERKAS DI-GENERATE OTOMATIS** oleh generator peta di repo kit (di project client berkas ini
> ikut kit apa adanya, tak perlu & tak bisa di-regen). JANGAN edit tangan — perubahan tangan akan
> tertimpa + guard preflight repo kit memerah. Ubah lewat sumbernya: folder/skill di disk, atau
> katalog konstanta generator. Versi skema: 1.
>
> **AI: baca berkas INI PERTAMA** untuk tahu "apa di mana" (fungsi tiap folder + daftar skill).

## 1. Struktur folder — apa fungsi tiap folder

| Folder | Fungsi | Di `.lintasai/` klien? |
|---|---|---|
| `bin/` | Dispatcher `npx lintasai <cmd>` (pintu masuk semua perintah). | ✅ ikut |
| `engine/` | Robot & helper Node (`*.mjs`/`*.js`) — mesin kit: generator, guard, helper installer. | ✅ ikut |
| `skills/` | Buku panduan per-bidang (`<nama>/SKILL.md`) — rak on-demand SATU-SATUNYA. `registry.json` = indeks yang dibaca dispatcher. | ✅ ikut |
| `templates/` | Panduan mendalam yang TINGGAL DI SINI dan dirujuk skill lewat path `templates/...` (bukan disalin ke project). Yang benar-benar di-deploy ke repo client cuma `github/workflows/secret-guard.yml` (harus jalan di CI client) + `hooks/pre-commit-secret-scan.sh`. | ✅ ikut |

## 2. Skill (buku panduan per-bidang) — apa di mana + kapan aktif

> 🔒 = rawan keamanan (wajib dibaca saat menyentuh bidangnya). Path FLAT: `skills/<nama>/SKILL.md`.
> Pemicu lengkap + indeks mesin-baca: `skills/registry.json`. Routing cepat (hemat token):
> `node .lintasai/engine/rak-cli.mjs "<topik>"` → daftar rak relevan tanpa baca registry penuh.
> `stack` = rak teknologi, **bukan** profesi — label persona §1.5 ikut bidang tugasnya.

| Divisi | Skill (🔒 = rawan keamanan) |
|---|---|
| backend | 🔒 admin-panel, 🔒 backend, background-job, caching, 🔒 email-transaksional, 🔒 realtime, tahan-gagal |
| database | 🔒 database, jaring-data |
| devops | debug-metodis, devops, perbaiki-error |
| frontend | a11y, design-direction |
| keamanan | 🔒 anti-fraud, 🔒 auth, 🔒 kepatuhan-teregulasi, 🔒 pembayaran, permukaan-ai, 🔒 rate-limiting, 🔒 wallet-ledger |
| marketing | seo |
| product | analytics, cek-permintaan |
| qa | cakupan-tes |
| stack | deploy, 🔒 next-core, 🔒 owasp, python, react-native, react-patterns, 🔒 supabase-prisma |

_32 skill terdaftar._

