# ADR-020: Install Senyap — Bongkar Alur Popup Pasca-Instalasi

---

## Metadata

- **Tanggal:** 2026-07-18
- **Status:** Accepted
- **Author:** owner (dokterbrutal) + Claude Code
- **Reviewer:** owner (lewat persetujuan rencana / ExitPlanMode)

---

## Context

- **Problem statement:** Saat kit lintasAI dipasang ke project client, alur pasca-instalasi (`JALANKAN_KIT.md` Bagian 0-7, dijalankan sebagai "Phase 5b" §4.3b) menghujani staff dengan 3-4 popup berurutan sebelum mereka bisa mulai kerja: Setup Mode (LENGKAP/CEPAT/PILIH SENDIRI) → Audit Menyeluruh (conditional) → Ukuran Tim + Bentuk Kode (termasuk pecah-repo) → jaminan Refactor Bertingkat "14d". Owner minta ini dibongkar: pemasangan harus **senyap** (0 popup wajib untuk kasus baku), langsung memberi manfaat skill programming standard-industri, tapi tetap cocok profil tim (16 kondisi tetap ADR-018).
- **Constraints:** (a) skill 8 divisi (§4.13) + Gerbang Verifikasi Pra-Rilis (§4.6) + konfirmasi aksi-merusak (§8.2 Aturan 5) = Tingkat 1, TIDAK boleh ikut terlemahkan; (b) kapabilitas audit/refactor/pecah-repo TIDAK boleh hilang — cuma tidak proaktif ditawarkan; (c) 2 bug historis (v1.43.1 audit hilang, v1.45.0 refactor hilang, akar sama: salah-deteksi kematangan di Windows) tidak boleh terulang tanpa pengganti; (d) tie-breaker §0 "Benar & Bebas Bug" > "Hemat Token" — penyederhanaan tak boleh mengorbankan korektnas.
- **Asumsi:** mesin 8 divisi berjalan lewat hook `lib/lang-reminder.mjs` (`UserPromptSubmit`) yang terpicu tiap prompt — **terpisah total** dari alur popup instalasi (diverifikasi baca langsung), jadi membongkar popup tidak menyentuhnya. ADR-018 (disahkan hari yang sama) menjadikan kondisi #10 (hemat token) + #16b (NOL fan-out kecuali diminta) constraint formal yang belum ada saat popup-popup ini dulu diputuskan.

---

## Decision

Bongkar alur popup pasca-instalasi jadi **install senyap + kapabilitas on-demand**:

1. **HAPUS TOTAL dari alur otomatis** (kapabilitas tetap ada, dipicu manual lewat chat): Popup #1 Setup Mode, Popup #2 Audit Menyeluruh, cabang split-repo Popup #3, jaminan Refactor "14d".
2. **UBAH JADI INFO PASIF** (jalan otomatis diam-diam, jadi laporan 1-arah): deteksi kematangan (dipakai cuma untuk 1 kalimat status), ukuran tim (default SENDIRI/TIM KECIL), gerbang mutu CI (auto-pasang kalau GitHub), papan status, Pending Action Items Tier A (auto-eksekusi + lapor).
3. **PERTAHANKAN SEBAGAI GERBANG** (tetap popup wajib — semua terkait Tingkat 1): proteksi `AGENTS.md` existing, git-status sebelum rapikan, tingkat 🔴 Berat Refactor (§8.2 Aturan 5), peringatan BETA split-repo, Pending Action Items Tier C (RLS produksi/integrasi luar, konfirmasi verbatim).

Alur baru = `JALANKAN_KIT.md` **Bagian 1-2** (setup teknis → aktivasi otomatis → 1 Laporan Penutup non-popup dengan menu kapabilitas on-demand) + **Bagian 3** (kapabilitas on-demand: audit/refactor/pecah-repo, dibaca hanya saat user memicu frasanya). **Instalasi baku (project baru tanpa konflik `AGENTS.md`) = 0 popup wajib.**

### Addendum (2026-07-18, sesi lanjutan owner) — 3 penajaman

1. **Peta struktur project = GIT, bukan generate docs.** Saat install, AI TIDAK men-scan seluruh project untuk mengisi `docs/architecture.md`. Struktur diambil dari fakta git deterministik (`npx lintasai project-map` per-modul, atau `git ls-files` daftar berkas — ~0 token AI). Template `docs/` kosong tetap disalin (murah). Dokumentasi per-file / denah database = **on-demand** ("buatkan catatan file X"), kapabilitas dipertahankan penuh (owner memilih "docs on-demand", BUKAN hapus total). Alasan: generate-docs tiap pasang = boros token + waktu + cepat basi; git selalu update sendiri. Selaras tujuan owner "hemat token, cepat, tanpa scan menyeluruh".
2. **Scan kematangan (MATURE/FRESH) dicabut dari install.** Diganti baca stack RINGAN (`package.json` → framework/ORM untuk stack-pack §4.14 — 1 file, murah, tetap memberi manfaat 8-divisi). Teks ambang MATURE dipertahankan di berkas (dipakai audit on-demand + `STACK_DETECTION_PATTERN.md` + dikunci `roster-sync`), tapi bukan lagi gerbang install.
3. **Ukuran tim = default internal senyap TOTAL.** Default SENDIRI (skip nagging CODEOWNERS), TIDAK diumumkan sebagai "sudah dikerjakan" di Laporan Penutup. Tetap bisa diubah on-demand ("ubah ukuran tim jadi ...").
4. **Jaminan refactor 🟢🟡🔴 dikonfirmasi TETAP on-demand** (owner memilih "tetap seperti sekarang") — tidak dikembalikan jadi tawaran proaktif.
5. **Koreksi §7.3 READ-MINIMAL:** kalau `architecture.md` client belum diisi (default sejak install-senyap), AI pakai git (`project-map`/`git ls-files`) + `Grep` untuk struktur — bukan meraba repo, bukan auto-mengisi architecture.md.

---

## Alternatif yang Ditolak

- **Pertahankan semua popup (status quo):** ditolak — kontradiksi langsung dengan ADR-018 #10 (hemat token) + #16b (NOL fan-out kecuali diminta); memaksa staff non-programmer memutuskan hal (ukuran tim final, mau audit) sebelum punya konteks cukup di hari-0.
- **Hapus SEMUA popup termasuk gerbang keamanan:** ditolak — melanggar Tingkat 1 (§8.2 Aturan 5 konfirmasi aksi-merusak, §8/§8.1 keamanan). Popup RLS produksi & proteksi `AGENTS.md` bukan preferensi alur, tapi pagar keselamatan.
- **Matikan default via opt-out `AGENTS.md` (bukan hapus dari kit):** dipertimbangkan (kit sudah punya pola opt-out untuk Mode Hemat/Auto-Confirm), tapi ditolak sebagai solusi utama — owner ingin senyap jadi **default untuk semua client baru**, bukan hal yang harus dinyalakan per-project. Opt-out per-project tetap bisa ditambah belakangan kalau perlu.

---

## Konsekuensi

### Pros
- Instalasi baku: 0 popup wajib → staff langsung kerja; skill 8 divisi tetap otomatis aktif dari prompt pertama (bukan setelah upacara popup selesai).
- Hemat token/waktu per instalasi (ADR-018 #10) untuk 100% instalasi baru, bukan cuma sebagian kasus MATURE.
- Kapabilitas besar (audit/refactor/pecah-repo) tetap 100% ada, disebut eksplisit di Laporan Penutup + `MULAI_DI_SINI.md` — lebih mudah ditemukan staff daripada terkubur dalam teks workflow.
- Menghilangkan pola directive-ke-AI-lewat-stdout ("WAJIB EKSEKUSI - JANGAN STOP") yang tidak andal + melanggar §8.1.

### Cons
- Membalik keputusan v1.43.0/v1.45.0 yang dulu eksplisit "bukan penghapusan fitur" — pembaca CHANGELOG lama bisa bingung (dimitigasi: ADR ini + catatan CHANGELOG v2.10.0).
- Staff yang terbiasa "ditawari audit otomatis" harus tahu cara memicu manual (dimitigasi: menu on-demand selalu tercetak di Laporan Penutup + `MULAI_DI_SINI.md`).

### Risk
- **Regresi konseptual bug lama** (project setengah-jadi diam-diam tak pernah ditawari bantuan). Mitigasi 3-lapis non-popup: (1) Laporan Penutup **wajib** menyatakan 1 kalimat kondisi project — kalau deteksi salah, kesalahannya terlihat di teks, bukan tersembunyi; (2) menu kapabilitas on-demand **selalu tercetak tanpa syarat** — menghilangkan akar bug secara struktural (dulu tawaran cuma muncul KALAU deteksi bilang MATURE); (3) opsional (bukan blocker) — pemeriksa preflight RAPIKAN "banyak file kode tapi architecture.md masih placeholder".
- **Efek hanya terasa di instalasi/chat BARU** (aturan dimuat saat chat START). Client existing tidak otomatis kena sampai `npx lintasai update` + buka chat baru.

---

## Implementation Notes

- **File inti:** `JALANKAN_KIT.md` (Bagian 0-7 → Bagian 1-4 install-senyap), `POST_SETUP_CHECKLIST_PROMPT_v1.md`, `CLAUDE_universal_v1.md` (§4.3b/§4.4/§4.11 + §6 rujukan), `setup-pola-b.mjs` (closing message).
- **File sekunder disinkronkan:** `AUDIT_POST_SETUP_PROMPT_v1.md`, `PROJECT_LIFECYCLE_PROMPT_v1.md`, `workflows/4.4-audit-post-setup.md`, `workflows/14.1-popup-ui.md`, `templates/PROMPT_LIBRARY.md`, `docs/RESEP_PERUBAHAN.md`, `docs/CLAUDE_CODE_MEDIATED_INSTALL.md`, `templates/INDEX.md`, `README.md`, `MULAI_DI_SINI.md`.
- **Tes diupdate bersamaan:** `tests/install-anchors.test.mjs` (anchor lama Popup #1/#2/#3/14d → anchor struktur baru); `tests/roster-sync.test.mjs` + `tests/setup-pola-b-smoke.test.mjs` tetap hijau (ambang MATURE & banner dipertahankan).
- **Koreksi klaim keliru:** `docs/plans/install-senyap-dan-command-v1.md:3` (anotasi "sudah terwujud" ternyata keliru — WP1 belum jalan; diverifikasi lawan `setup-pola-b.mjs:1058`).
- **Rollback plan:** perubahan murni dokumen + closing-message (tak ada perubahan skema/API/data). Balik = `git revert` commit ADR-020; client existing tak terpengaruh sampai update.

---

## Riwayat

| Tanggal     | Status   | Oleh                    | Catatan                                                        |
|-------------|----------|-------------------------|----------------------------------------------------------------|
| 2026-07-18  | Accepted | owner + Claude Code     | Bongkar alur popup pasca-instalasi jadi install-senyap; adopsi ulang WP1/WP4 dari `docs/plans/install-senyap-dan-command-v1.md` (WP2 tetap ditunda per ADR-017) |
