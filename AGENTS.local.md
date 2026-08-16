# AGENTS.local.md - Override khusus proyek dramaapp

> v1 · 2026-08-13 · ikut standar tim IT (Pola B)

<!-- Header auto-isi setup-pola-b.mjs. Tiap <PLACEHOLDER> + frasa "Pola B" = penanda mesin, jangan dihapus. -->

Aturan tim ada di **`./AGENTS.md`** — kernel yang dibaca **OTOMATIS** tiap sesi (Codex & Kimi native; Cursor lewat `.cursor/rules/lintasai.mdc`; Claude lewat `CLAUDE.md` `@import`). **`AGENTS.md` = milik kit, di-refresh saat update — JANGAN edit langsung**; taruh perubahanmu di berkas INI (milikmu, tak pernah ditimpa). **AI: baca `./.lintasai/PETA.md` dulu** ("apa di mana": fungsi tiap folder + daftar skill).

## Versi kit aktif

- Cek versi: **`npx lintasai version`** (atau `kit_version` di `./.lintasai/.install-manifest.json`). Jangan salin angkanya ke sini — jadi basi setelah update.
- Sumber kit (repo standar tim): **belum-ada (solo project)**

## Override khusus proyek

Centang `[x]` hanya yang **beda dari default kit**; yang tidak dicentang = ikut default.

- [ ] Bahasa docs: <!-- default ID -->
- [ ] Format commit: <!-- default Conventional Commits -->
- [ ] Tech stack: <!-- default React/Next.js + Tailwind + shadcn -->
- [ ] Branch utama: <!-- default `main` -->
- [ ] Pakai GitHub Issue: <!-- default Tidak (chat-driven) -->
- [ ] Channel chat task: <!-- link Slack/Discord/Telegram/WhatsApp -->
- [ ] Lain-lain:

## Opt-in — mode & ide opsional (default semua MATI)

Centang `[x]` yang mau diaktifkan.

<!-- Riwayat pencabutan opsi (mis. "Mode Hemat" -> dilebur ke TANGGA BOBOT kernel): .lintasai/CHANGELOG.md. -->

- [ ] **Mode Auto-Confirm** — lewati konfirmasi Y/N sederhana (aksi merusak TETAP wajib konfirmasi).
- [ ] **Mode Co-Pilot Berpagar** — AI proaktif kerjakan yang aman, berhenti di pagar (commit/push/PR/merge = manusia).
- [ ] Ide opsional lain (UTM/tracking, i18n, performance budget, secret scanner — opt-in, catat di sini).

## Catatan tim

<!-- Kosongkan kalau proyek solo. -->

- Owner standar tim: <!-- nama + email/handle PIC kit -->
- Channel diskusi: <!-- link Slack/Discord/Telegram -->
- **Jembatan sesi (untuk AI):** baca `HANDOFF.md` dulu (titik lanjut tab baru: owner ketik `lanjut dari handoff`), lalu `antrean-deploy.md` kalau topiknya rilis/commit rekan. `NEXT-SESSION.md` = arsip lebih panjang. **Wajib perbarui `HANDOFF.md` di akhir tiap perubahan**; sentuh rilis → perbarui juga `antrean-deploy.md` (fetch `origin` + `dramaku` dulu). Jangan tulis secret ke situ.
- **Dual push (WAJIB, owner 2026-08-11):** tiap ada perubahan yang di-commit → push ke **kedua** repo: `https://github.com/ojokesusu/dramaku` (remote `dramaku`) **dan** `https://github.com/masradenbagus89-ui/dramaapp` (remote `origin`). Detail di `NEXT-SESSION.md`.

## Riwayat update kit di proyek ini

| Versi kit | Tanggal update | Siapa update | Catatan |
|---|---|---|---|
| v3.0.0 | 2026-07-23 | user18 | Setup awal Pola B (folder `.claude-kit/`) |
| v8.0.0 | 2026-08-13 | user18 | Pasang ulang bersih → folder `.lintasai/` |

<!-- Tambah baris tiap update `./.lintasai/` ke versi lebih baru. -->
