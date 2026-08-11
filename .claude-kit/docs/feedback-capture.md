# feedback-capture — Pengingat "Rekam Pelajaran" otomatis (Stop hook)

> Versi 1 · 2026-07-17 · Pendamping `engine/feedback-capture.mjs` + `engine/ensure-feedback-capture-hook.mjs`.
> Latar keputusan: [ADR-006](decisions/ADR-006-sistem-feedback-pembelajaran-lintas-client.md) + [ADR-008](decisions/ADR-008-hook-penegak-checklist-penyelesaian.md) (addendum). Aturan perilaku AI = [rules/6.5-frontier-lessons.md](../rules/6.5-frontier-lessons.md).

## Tujuan

Membuat kemampuan "Rekam Pelajaran" (§6.5) **lebih andal**. Aturan §6.5 sudah auto-baca tiap sesi, tapi aturan = imbauan yang mudah terlupa di bawah beban kerja. Hook ini = **rem-mesin lunak**: di **akhir tiap giliran AI** (event `Stop` Claude Code), kalau ada pekerjaan kode di sesi ini, hook **menyuntik satu pengingat singkat** ke konteks AI supaya AI menimbang: "ada teknik/standar IT profesional yang belum dijaga kit?" — lalu (kalau ada) mencatat ke berkas lokal ter-redaksi lewat §6.5.

🏢 Analogi: seperti stiker kecil "sudah isi buku catatan hari ini?" yang muncul di meja tiap kali kamu selesai satu pekerjaan — cuma mengingatkan, tak memaksa.

## Cara Pakai

- **Default sudah NYALA** (keputusan owner 2026-07-17). `setup-pola-b.mjs` memasangnya otomatis tiap `npx lintasai init` DAN `npx lintasai update`.
- **Pasang-ulang manual** (kalau hook terhapus / settings lama): `npx lintasai enable-feedback-capture` (idempoten, fail-safe, pertahankan setelan lain).
- **Aktif setelah buka chat BARU** (hook dimuat saat sesi mulai — §4.6: efek tak langsung terasa di sesi berjalan).
- **Matikan kapan saja:** hapus blok `Stop` feedback-capture dari `.claude/settings.json`. Atau matikan perilaku rekamnya lewat aturan: bilang "matikan rekam pelajaran" / centang opt-out di `AGENTS.md` (aturan §6.5 berhenti; hook tetap ada tapi AI menghormati opt-out).

## Input-Output

- **Input:** JSON dari harness lewat stdin (memuat `stop_hook_active`, `cwd`, dll). Fail-safe: apa pun yang aneh → diperlakukan seperti "tak ada input".
- **Sinyal pemicu:** `git status --porcelain` — ada perubahan kode di working tree = "ada kerja". (`--porcelain` menghormati `.gitignore`, jadi berkas pelajaran yang gitignored TIDAK jadi sinyal.)
- **Output kalau memicu:** `{"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"<pengingat §6.5>"}}` + **exit 0** (non-blokir). Kalau tidak memicu: diam + exit 0.
- **Exit code:** SELALU 0. Hook ini TIDAK pernah exit 2 (yang akan MEMBLOKIR / memaksa AI lanjut).

## Dependensi

- `git` di PATH (kalau tak ada → hook diam, fail-open).
- Node.js ≥18 (engines kit).
- `engine/ensure-feedback-capture-hook.mjs` untuk wiring; `templates/hooks/feedback-capture.settings.example.json` = SSOT bentuk hook (matcher `''` + command + timeout 10).

## Catatan (edge case + keputusan)

- **Kenapa `Stop`, bukan `SessionEnd`/`PostToolUse`** (diverifikasi ke dokumentasi resmi Claude Code 2026-07-17): `Stop` jalan di akhir giliran + bisa menyuntik `additionalContext`; `SessionEnd` sesi sudah tutup (tak bisa menyuntik); `PostToolUse` reaktif per-tool (koreksi ADR-008 PostToolUse→Stop).
- **Anti-loop:** kalau harness menandai `stop_hook_active: true` → hook DIAM (`decide()` di `engine/feedback-capture.mjs`). Ini menutup risiko lanjutan-berulang.
- **De-dup "sekali per tugas":** BUKAN tugas hook — hook cuma menepuk pundak tiap Stop saat ada kerja. Yang menyaring "catat SEKALI per tugas" = aturan §6.5 yang dijalankan AI. Simetris filosofi `lang-reminder` (jalan tiap giliran; AI yang menyaring). Kalau pengingat terasa berisik saat piloting, opsi masa depan = penanda per-sesi (belum dibangun).
- **HANYA menepuk pundak (pagar §6.4 anti-self-evolve):** hook TIDAK menulis berkas, TIDAK menilai, TIDAK menskor. Keputusan mencatat di AI (aturan §6.5); yang menimbang jadi standar kit = OWNER.
- **Bus factor ≥2:** logika keputusan diisolasi di fungsi murni `decide()` + `gitHasWork()` + diuji unit di `tests/ensure-feedback-capture-hook.test.mjs` — perawat berikutnya bisa memahami tanpa menjalankan harness nyata.
- **Source:** `engine/feedback-capture.mjs:1` (skrip hook), `engine/ensure-feedback-capture-hook.mjs:1` (wiring).
