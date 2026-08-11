> ## INI FILE BUAT AI BACA — JALUR `npm create lintasai` (TIPIS, MERUJUK SUMBER TUNGGAL)
>
> File ini dipanggil otomatis oleh pemasang (`setup-pola-b.mjs`) closing message untuk **paksa AI lanjut Fase Aktivasi** setelah install kit selesai.
>
> **v2.10.0 — install senyap**: file ini **TIDAK mendefinisikan alur sendiri**.
> Definisi Fase Aktivasi + Laporan Penutup + kapabilitas on-demand (Audit, Rapikan Kode Bertingkat, Pecah Repo) =
> **sumber tunggal di `.claude-kit/JALANKAN_KIT.md` Bagian 1-4**. File ini cuma
> menjalankan pre-cek lalu **mengeksekusi flow di sana** — supaya 2 jalur (npx vs paste-manual)
> mustahil melenceng.
>
> **Manual paste kalau**:
> - Sesi AI tutup di tengah workflow (mis. kompaksi, restart) — paste ini supaya AI resume.
> - Setup install pakai versi lama — paste ini setelah `npm create lintasai`.

---

# POST_SETUP_CHECKLIST_PROMPT_v1 — Auto-Trigger Fase Aktivasi Setelah Install Kit

> v2.10.0 · WAJIB AI eksekusi setelah `setup-pola-b.mjs` / `npm create lintasai` selesai.
>
> Per `CLAUDE_universal_v1.md` Section 4.3b (Aktivasi Pasca-Instalasi — Install Senyap).

## Konteks: Kenapa file ini ada

Bug ditemukan saat dogfood test 2026-06-08: AI yang menjalankan `npm create lintasai` via Bash tool **stop di "Status: SIAP NGODING"** tanpa lanjut ke fase aktivasi. User dapet kit ter-install tapi aktivasi tidak jalan. Fix: closing kit installer include **explicit AI checklist** (panggil file ini).

**v2.10.0 (install senyap):** dulu file ini menjalankan rangkaian 3-4 popup (Setup Mode / Audit / Ukuran Tim / Refactor) sebelum staff bisa mulai kerja. Sekarang **instalasi baku = 0 popup wajib** — aktivasi berjalan otomatis diam-diam lalu tutup dengan 1 Laporan Penutup, dan kapabilitas besar (audit/refactor/pecah-repo) tinggal diminta on-demand lewat chat.

---

## CHECKLIST WAJIB (AI eksekusi urut, jangan skip)

### [0] WAJIB PRE-SEND CHECKLIST tiap response substantive

SEBELUM AI tutup tiap response substantive di sesi ini (code change, ship/release, audit findings, multi-phase workflow — bukan cuma final laporan), AI WAJIB run **PRE-SEND CHECKLIST 5 kategori**: (1) Inline-narasi antar tool · (2) Update-Todos · (3) Body-final · (4) Tinjauan lintasAI Divisi (👨‍🎓 Junior-<profesi> + 🙂 Non-<profesi>) · (5) Popup/pilihan.

**Definisi lengkap tiap kategori = `CLAUDE_universal_v1.md` §2.1.1** (PRE-SEND CHECKLIST) + Reference Card translasi jargon §2.1. Jangan salin-ulang di sini supaya tak drift.

**Indicator violation**: kalau output punya >3 jargon teknis yang dibiarkan mentah tanpa penjelasan awam → STOP, rewrite SEMUA, baru kirim.

### [1] Auto-detect kondisi project — UNTUK PERSONALISASI LAPORAN SAJA (bukan gate popup)

> **Sejak v2.10.0 install-senyap: SAAT INSTALL cukup baca stack RINGAN — JANGAN scan file-counting menyeluruh.** Baca `package.json` (+ marker `prisma/schema.prisma`/`pyproject.toml`/dll) → tahu framework/ORM untuk mengaktifkan stack-pack (§4.14). Itu saja. **Peta struktur project = dari GIT** (`npx lintasai project-map` / `git ls-files`, ~0 token) saat AI butuh — BUKAN dengan men-scan repo + menulis docs.

Kalau nanti pakai tool berkas untuk deteksi (mis. saat audit on-demand), **pakai tool Claude Code (`Glob` / `Grep` / `Read`), BUKAN perintah shell mentah.** Perintah Unix `find` / `grep` / `wc` GAGAL di PowerShell (shell utama Windows): `find` → `find.exe` Windows → "File not found", `grep` / `wc` tidak ada → hasilnya **0 PALSU**.

> **Kriteria kematangan MATURE = HANYA untuk audit on-demand (Bagian 3a JALANKAN_KIT), BUKAN gerbang install.** Kalau user minta "audit project", AI cek apakah ada kode untuk diaudit dengan kriteria OR ini (SUMBER TUNGGAL `JALANKAN_KIT.md` Bagian 2a + `templates/STACK_DETECTION_PATTERN.md`): folder dashboard 3+ subfolder · ATAU 5+ model/tabel DB · ATAU `src/lib/` 10+ file · ATAU 5+ route API · ATAU aset merek custom · ATAU jelas banyak file kode nyata. **JANGAN pakai ambang kaku.**

Kalimat status Laporan Penutup = tentang **stack**, bukan hasil scan menyeluruh: *"Stack terdeteksi: Next.js + Supabase (stack-pack aktif)."* (atau "stack belum ketahuan — sebut aja nanti"). Menu kapabilitas on-demand **selalu tercetak tanpa syarat** — jadi tak ada risiko "salah-deteksi menyembunyikan tawaran" (pengganti struktural bug lama v1.43.1/v1.45.0).

### [2] WAJIB jalankan Fase Aktivasi + Laporan Penutup dari SUMBER TUNGGAL (`JALANKAN_KIT.md`)

> **JANGAN definisikan alur di sini.** Baca `.claude-kit/JALANKAN_KIT.md` lalu **jalankan apa adanya**:
>
> - **Bagian 1 — Setup teknis** (auto; popup proteksi `AGENTS.md` HANYA kalau ada konflik nyata).
> - **Bagian 2 — Aktivasi Otomatis SENYAP** (baca stack ringan dari `package.json` · ukuran tim default internal senyap · gerbang mutu CI auto-pasang kalau GitHub · Rekam Pelajaran pengumuman) → **tutup dengan 1 Laporan Penutup non-popup**. **TIDAK ada scan menyeluruh + generate docs** — struktur project dari GIT (`project-map`/`git ls-files`); dokumentasi per-file = on-demand.
> - **Bagian 3 — Kapabilitas On-Demand** (audit / rapikan kode bertingkat / pecah-repo / lihat struktur dari git / buatkan catatan file) — **JANGAN dijalankan otomatis**; cuma disebut di menu Laporan Penutup, dieksekusi hanya kalau user memicu frasanya nanti.
>
> **Instalasi baku = 0 popup wajib.** Popup yang boleh muncul di jalur baku HANYA proteksi `AGENTS.md` (kondisional-langka). Tampilkan popup itu sebagai **popup klik** (`AskUserQuestion`) kalau tersedia; fallback chat-text. Aturan lengkap: `JALANKAN_KIT.md` > "Cara Tampil Popup".

### [3] Eksekusi sesuai kondisi

Mapping aktivasi (stack ringan × ukuran tim senyap × gerbang mutu × Tier A auto-eksekusi) **sudah didefinisikan lengkap di `JALANKAN_KIT.md`** (Bagian 2 + Bagian 4). Ikuti itu — jangan bikin mapping baru di sini. **Ingat: TIDAK ada generate docs saat install; struktur = git.**

### [4] Audit = ON-DEMAND, JANGAN ditawarkan proaktif

Sejak v2.10.0 audit **TIDAK LAGI** ditawarkan lewat popup pasca-instalasi. Cukup **sebut di menu Laporan Penutup** ("kalau nanti butuh: ketik 'audit project'"). Kalau user memicu ("audit project" / "periksa seluruh kode") → baru execute `AUDIT_POST_SETUP_PROMPT_v1.md` (mode aman cuma-baca, output diurut risiko rendah→tinggi bahasa awam).

### [5] WAJIB lapor Pending Action Items

> **Definisi + tabel + aturan tier-aware = SUMBER TUNGGAL di `JALANKAN_KIT.md` Bagian 4.**
> Jalankan itu — jangan duplikasi tabelnya di sini. **Tier A aman (denah DB, rapikan docs/) = auto-eksekusi + lapor hasil** (bukan popup nunggu jawaban). **Tier C (RLS produksi, integrasi luar) = tetap popup verbatim keras.**

---

## Cara memicu Fase Aktivasi lengkap secara manual (veteran / re-install)

User boleh ketik di awal sesi:
- `lanjutkan setup lintasAI` → AI jalankan ulang Fase Aktivasi (Bagian 1-2) + Laporan Penutup.
- `verbose post-setup` → AI jalankan + extra explanation per langkah (untuk staff baru).

Default kalau user diam sesudah install: AI jalankan Fase Aktivasi otomatis lalu tutup Laporan Penutup.

---

## [6] LARANGAN

- AI **TIDAK BOLEH** stop di "Status: SIAP NGODING" tanpa lapor Laporan Penutup (checklist 1-5) di atas.
- AI **TIDAK BOLEH** mendefinisikan alur/popup versi sendiri di sini — WAJIB jalankan definisi `JALANKAN_KIT.md` (sumber tunggal).
- AI **TIDAK BOLEH** menawarkan audit/refactor/pecah-repo secara proaktif via popup saat install — itu on-demand (Bagian 3 JALANKAN_KIT).
- AI **TIDAK BOLEH** cuma "lapor tabel diam" untuk Pending Action Items — Tier A aman WAJIB auto-eksekusi + lapor; Tier C WAJIB popup verbatim keras.

---

## Cross-reference

- `.claude-kit/JALANKAN_KIT.md` — **SUMBER TUNGGAL** Fase Aktivasi + Kapabilitas On-Demand (Bagian 1-4)
- `.claude-kit/CLAUDE_universal_v1.md` Section 4.3b (Aktivasi Pasca-Instalasi — Install Senyap)
- `.claude-kit/CLAUDE_universal_v1.md` Section 4.4 (audit on-demand) + §4.11 (refactor on-demand)
- `.claude-kit/PROJECT_LIFECYCLE_PROMPT_v1.md` Stage 1/2/4
- `.claude-kit/AUDIT_POST_SETUP_PROMPT_v1.md` (lengkap audit workflow)
- `.claude-kit/SPLIT_REPO_MIGRATION_PROMPT_v1.md` (split + rambu skala-besar: kunci pengaman gabung + gabung-otomatis-aman)
- `.claude-kit/templates/MIGRATE_TO_SUBFOLDER_PROMPT_v1.md`
- `.claude-kit/templates/DB_SCHEMA_SCAN_PROMPT.md`
- `.claude-kit/templates/RLS_SETUP_PROMPT.md`
