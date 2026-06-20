# AGENTS.md - Aturan Proyek dramaapp

> v1 · 2026-06-20 · ikut standar tim IT (Pola B)

<!-- Header di atas auto-isi oleh setup-pola-b.ps1 (nama proyek dari folder root, tanggal dari sistem). Kalau setup manual, isi sendiri. -->

---

## Pengantar

Proyek ini ikut **standar kerja tim IT** (kit terpasang di `./.claude-kit/`).
Aturan utama (cara coding, dokumentasi, larangan) ada di **`./.claude-kit/CLAUDE_universal_v1.md`**, dan dimuat **OTOMATIS** lewat `CLAUDE.md` di root proyek (yang `@import` file aturan itu + file `AGENTS.md` ini). Claude Code meng-auto-load `CLAUDE.md`, jadi aturan benar-benar masuk konteks tiap sesi — bukan sekadar "ditunjuk" lewat tulisan.
File `AGENTS.md` ini cuma berisi **override khusus proyek** + instruksi resolusi path; ikut di-`@import` oleh `CLAUDE.md`.

---

## Path resolution (PENTING - instruksi untuk AI)

Kit ini di-embed di subfolder `./.claude-kit/` (bukan di `%USERPROFILE%\.claude\`).
Saat baca/merujuk file kit, **kamu (AI) wajib mengganti** path lama jadi path lokal:

- `%USERPROFILE%\.claude\<NAMA_FILE>` → `./.claude-kit/<NAMA_FILE>`
- `~/.claude/<NAMA_FILE>` → `./.claude-kit/<NAMA_FILE>`

Kalau install global **dan** `./.claude-kit/` sama-sama ada → **`./.claude-kit/` menang** (version-locked per proyek).

---

## Versi kit aktif

- Versi kit di `./.claude-kit/`: **v1.57.1** <!-- di-update 2026-06-20 via npm (updater bawaan gagal: repo GitHub privat). Kit lama dicadangkan: .claude-kit.backup-20260620-181204 -->
- Sumber kit (repo standar tim): **belum-ada (solo project)** <!-- ISI: URL repo git tempat kit dirilis. -->

---

## Override khusus proyek

Centang `[x]` cuma yang **beda dari default kit**. Yang tidak dicentang = ikut default.
Contoh: `- [x] Bahasa docs: EN (override dari default ID karena klien minta)`.

- [ ] Bahasa docs: <!-- default ID -->
- [ ] Format commit: <!-- default Conventional Commits -->
- [ ] Folder `docs/`: <!-- default ikut `./.claude-kit/templates/architecture.md` -->
- [x] Tech stack: Next.js 16 (App Router) + React 19 + Tailwind 4 + Supabase (Postgres) + TypeScript. **Tanpa shadcn.** <!-- override dari default: pakai Supabase sebagai backend data, bukan shadcn -->
- [ ] Branch utama: <!-- default `main` -->
- [ ] Pakai GitHub Issue: <!-- default Tidak - pakai chat. Ubah ke `Ya` kalau ada klien eksternal yang tracking via Issue. -->
- [ ] Channel chat task: <!-- link Slack/Discord/Telegram/WhatsApp tempat staff posting task -->
- [ ] Lain-lain:

---

## Workflow & Komunikasi Task

Tim ini pakai workflow chat-driven (tanpa GitHub Issue by default). Detail di `./.claude-kit/templates/CLAUDE_TEAM_GUIDE.md` section 5b.

- **Channel chat task**: <!-- ISI: link Slack/Discord/Telegram/WhatsApp -->
- **Pakai GitHub Issue?** Tidak (default tim). Ubah ke "Ya" kalau proyek punya klien eksternal yang tracking via Issue.
- **Format prompt task**: lihat `./.claude-kit/templates/PROMPT_LIBRARY.md` section "Prompts untuk Workflow Chat-Driven Task".
- **Risk Level decision tree**: lihat `./.claude-kit/templates/CLAUDE_TEAM_GUIDE.md` section 7b (Low/Medium/High klasifikasi task).
- **Rollback playbook**: lihat `./.claude-kit/templates/CLAUDE_TEAM_GUIDE.md` section 13b (git revert <5 menit).
- **Feature flag** = advanced/post-launch (kit early-stage default = staging-only). Lihat `./.claude-kit/templates/feature-flags-advanced.md` kalau butuh.

---

## Skenario adopsi (AI WAJIB tanya popup di sesi pertama setelah setup)

> ✅ **SUDAH DIPILIH (sesi 2026-06-20).** Project terdeteksi **setengah-jadi** (sudah berisi banyak kode: ~36 layar/komponen, 24 alamat data/API, 5 tabel database + 3 fungsi RPC). User memilih **[3] Proyek setengah jadi → Rapikan ke Standar Tim** (`./.claude-kit/PROJECT_LIFECYCLE_PROMPT_v1.md` Stage 4 (Rapikan ke Standar Tim)).

### Pilihan setup Phase 5b (terkunci sesi 2026-06-20)
- **Cara pasang (Setup Mode):** LENGKAP — peta proyek + denah database dibuat lengkap; catatan kode dibuat di langkah akhir (sesudah audit + rapikan) supaya cocok dengan kode final.
- **Periksa kode (Audit):** YA — audit menyeluruh 11 sudut dijalankan di sesi ini (mode aman cuma-baca, hasil disimpan di `docs/decisions/`).
- **Ukuran tim + bentuk kode:** SENDIRI / kecil → **tetap 1 tempat (monorepo) + rapikan kode bertingkat** (🟢 ringan → 🟡 sedang → 🔴 berat). Tidak pecah-repo. File tim `.github/` terpasang tapi "tidur" — aktif kapan saja saat rekrut staf (alur ganti ukuran tim: chat "ubah ukuran tim jadi TIM KECIL/BESAR").

---

## Catatan tim

<!-- Kosongkan section ini kalau proyek solo. -->

- Owner standar tim: <!-- nama + email/handle PIC kit -->
- Channel diskusi: <!-- link Slack/Discord/Telegram -->

---

## Riwayat update kit di proyek ini

| Versi kit | Tanggal update     | Siapa update | Catatan              |
|-----------|--------------------|--------------|----------------------|
| v1.45.0 | 2026-06-20 | user18  | Setup awal Pola B    |
| v1.57.1 | 2026-06-20 | lintasAI (npm) | Update via `npm pack` (updater bawaan gagal: repo GitHub privat). Kit lama → `.claude-kit.backup-20260620-181204`. Catatan/docs/AGENTS keputusan dipertahankan. |

<!-- Tambah baris baru tiap update isi `./.claude-kit/` ke versi lebih baru. -->
