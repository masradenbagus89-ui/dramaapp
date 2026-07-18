# architecture.md — Peta Makro Repo Kit lintasAI

> Versi 1 · 2026-06-24 · Untuk maintainer + AI yang kerja DI repo kit ini (dogfood).
>
> Ini **jalur READ-MINIMAL** (§7.3): baca berkas INI dulu, BARU cherry-pick berkas relevan task
> (pakai `Grep` untuk menemukannya). JANGAN menjelajah seluruh repo tiap sesi.
>
> Angka yang gampang basi (jumlah tes/berkas/versi) **SENGAJA tak ditulis di sini** (de-fragilize §6.3) —
> lihat sumbernya: versi → `package.json`; jumlah tes → jalankan `npm run preflight`; daftar fakta yang
> dijaga → `docs/PETA_SUMBER_KEBENARAN.md` *(internal — hanya di repo GitHub kit, tidak ikut paket npm)*.

## Apa ini
Repo kit lintasAI = paket npm (`lintasai`) berisi **aturan kerja AI + alat** (installer/updater/robot
pemeriksa) yang dipasang ke project lain (Pola B: `<project>/.claude-kit/`). Repo ini juga **"dogfood"**
aturannya sendiri: `CLAUDE.md` meng-`@import` `CLAUDE_universal_v1.md` tiap sesi.

## Stack & jalur utama
- **Runtime: Node.js 100%** (v2.0.0, lihat `docs/decisions/ADR-007` yang men-supersede ADR-003/004/005).
  Seluruh alat PowerShell sudah **dihapus** — kit tidak lagi membawa `.ps1`/`.psd1`. (Satu-satunya sisa:
  stub penyelamat `setup-pola-b.ps1` ~30 baris yang meng-exec `node setup-pola-b.mjs`, demi updater PS lama klien — dihapus di v3.)
- **Entry-point resmi:** `bin/lintasai.js` — dispatcher `npm create lintasai` / `npx lintasai <cmd>`.
  Memetakan perintah → port Node (`COMMANDS_NODE`). Dispatcher Node-murni; tak ada lagi registry PS.

## Struktur folder (lokasi modul inti)
- `bin/lintasai.js` — **dispatcher npx** (pintu masuk semua perintah; suntik `--project-root`).
- `kit.mjs` — **router perintah kit** (doctor/scan/status/diff/version/bump/help).
- `setup-pola-b.mjs` — **installer Pola B** (salin kit → `.claude-kit/` + deploy berkas tim + kartu identitas).
- `update-kit.mjs` — **updater** (re-clone + backup + setup, rollback-safe).
- `uninstall.mjs` — **uninstaller** via manifest sha256.
- `team-setup.mjs`, `install-windows.mjs` — setup tim + installer global (Pola A).
- `lib/` — **helper engine** (Node `*.mjs`). Inti:
  - `consistency-check.mjs` — **robot kecocokan SSOT** (versi + fakta jumlah file-tim). MODE KIT + PROJECT.
  - `manifest.mjs` + `manifest-signing.mjs` — catatan-pasang + tanda tangan HMAC (integritas, tulis-atomik).
  - `version-detect.mjs` — pembaca versi (parse CHANGELOG/manifest).
  - `project-detect.mjs`, `project-manifest.mjs`, `stack-check.mjs` — deteksi stack + kartu identitas project.
  - `split-guard.mjs` — robot anti-bocor `.env` saat pecah-repo.
  - `unicode-safety-check.mjs` — pemindai "huruf-tipuan" Unicode.
  - `project-card-migrate.mjs` — migrator kartu identitas `.psd1` (era-v1) → `.jsonc`.
  - `rollback.mjs` — balikin berkas project dari backup.
  - `risk-gate.js` — Palang Rem aksi berisiko (hook `PreToolUse`, default NYALA sejak v1.61.0).
  - `kit-files.json` (+ `kit-files.mjs`) — **SUMBER daftar berkas kit** (dibaca runtime via `JSON.parse`; pembaca dua-format juga menerima `.psd1` era-v1 untuk doctor lintas-versi).
  - Lain: json-merge, git-helpers, safety, fs-text, lang-*, dll.
- `tests/` — `*.test.mjs` (Node) + `preflight.mjs` (gerbang pra-rilis).
- `templates/` — berkas yang **DI-DEPLOY ke project client** (skeleton docs + panduan tim).
- `docs/` — dokumentasi repo kit (cari berkas relevan pakai `Grep` + peta ini).
- `.github/` — CI (`validate.yml` + `publish-npm.yml`) + CODEOWNERS.

## Berkas aturan (akar) — yang auto-load tiap sesi
- `CLAUDE.md` → `@import CLAUDE_universal_v1.md` — **aturan inti AI** (auto-load tiap sesi, di repo & client).
- `workflows/` — rak detail rujukan **on-demand** pecah-per-seksi (TIDAK auto-load → hemat token; `workflows/INDEX.md` = daftar isi; `LINTASAI_WORKFLOWS_v1.md` = pengalih tipis; dijaga `lib/workflows-ref-check.mjs`).
- `README.md`, `CHANGELOG.md`, `JALANKAN_KIT.md` — dokumen pendukung.

## Alur kerja (perintah utama)
- **Pasang:** `npm create lintasai` → `bin/lintasai.js` → `setup-pola-b.mjs` (salin kit ke `.claude-kit/`).
- **Update:** `npx lintasai update` → `update-kit.mjs`. **Copot:** `npx lintasai uninstall` → `uninstall.mjs`.
- **Gerbang pra-rilis (WAJIB lulus sebelum "selesai", §4.6):** `npm run preflight` (`tests/preflight.mjs`) —
  tes Node + ESLint + robot kecocokan + pemindai Unicode + smoke Node + cek CHANGELOG.
- **Naikkan versi:** `node kit.mjs bump X.Y.Z` (penulis cap-versi `lib/consistency-check.mjs`).

## SSOT — di mana fakta "tinggal" (JANGAN duplikasi tanpa penjaga)
- `docs/PETA_SUMBER_KEBENARAN.md` — di mana tiap fakta tinggal + jenisnya (1-sumber sejati / duplikat+pengecek / prosa). *(internal — hanya di repo GitHub kit)*
- `docs/RESEP_PERUBAHAN.md` — berkas mana ikut bergerak per jenis perubahan + cara jalankan robot.
- Robot penjaga drift: `lib/consistency-check.mjs` (jalan otomatis di preflight + tes Node).

## Konvensi penting
- **Fakta robot** (versi/jumlah file-tim) diubah di `lib/consistency-check.mjs` (`KIT_FACTS`/`KIT_VERSION_CHECKS`); daftar berkas-tim di `setup-pola-b.mjs` (blok `teamFiles`) — dijaga tes Node.
- **Read-before-Edit** (§7.3a) + **gerbang preflight** (§4.6) sebelum menyatakan "selesai".
- Keputusan teknis non-sepele → ADR di `docs/decisions/`.
