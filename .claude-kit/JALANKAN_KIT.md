> ## INI FILE BUAT AI BACA, BUKAN KAMU!
>
> **Halo staff baru!** Kalau kamu **bukan programmer**, JANGAN baca isi file ini - bikin pusing dan nggak perlu. Cukup jalankan `npm create lintasai` di folder project (atau minta AI-mu menjalankannya) — AI yang memandu sisanya.
>
> **Cara pakai file ini (4 langkah):**
> 1. Buka **Claude Code** (aplikasi AI-nya).
> 2. **Copy seluruh isi file ini**: tekan `Ctrl+A` (select all) lalu `Ctrl+C` (copy).
> 3. **Paste ke chat Claude Code**: tekan `Ctrl+V` lalu Enter.
> 4. **Selesai** - AI auto-execute semua langkah di bawah.
>
> **Total waktu**: pemasangan otomatis, tanpa menunggu jawaban popup untuk kasus baku.

---

> ## 📌 SUMBER TUNGGAL ALUR AKTIVASI (v2.10.0 — install senyap)
>
> File ini = **satu-satunya tempat** definisi alur aktivasi pasca-pasang + kapabilitas on-demand
> (Audit, Rapikan Kode Bertingkat, Pecah Repo). Jalur `npm create lintasai`
> (`POST_SETUP_CHECKLIST_PROMPT_v1.md`) **TIDAK** mendefinisikan alurnya sendiri — ia
> **menjalankan alur yang didefinisikan DI SINI**. Tujuannya: isi alur mustahil melenceng
> antar-2 jalur (dulu sempat beda).
>
> - **Jalur utama** (staff non-programmer): `npm create lintasai` → closing kit
>   panggil `POST_SETUP_CHECKLIST_PROMPT_v1.md` → file itu menjalankan Bagian 2 file INI.
> - **Jalur cadangan** (kalau pasang gagal / sesi putus): owner paste file ini manual → flow sama persis.
>
> **Sejak v2.10.0: instalasi SENYAP.** Untuk instalasi baku (project baru, tanpa konflik `AGENTS.md`)
> → **0 popup wajib**. Audit menyeluruh, rapikan kode bertingkat, dan pecah-repo **tidak lagi
> ditawarkan proaktif** — kapabilitasnya tetap ada 100%, tinggal diminta lewat chat biasa kapan saja
> (lihat Bagian 3). Popup yang tersisa (proteksi `AGENTS.md`, git-status sebelum rapikan, tingkat
> 🔴 Berat, peringatan BETA split-repo, item Tier C) semuanya terkait keamanan/aksi-merusak — bukan
> preferensi alur pasang, jadi TIDAK dihapus.

---

Tolong jalankan setup Pola B kit AI di proyek ini. Aku sudah copy folder `claude-ai-rules-kit/` (atau versi terbaru di-extract dari zip / di-clone dari GitHub) ke root proyek.

Eksekusi workflow ini end-to-end (rename folder, run script, write skeleton `docs/` + file tim `.github/`, scan struktur proyek read-only) — **otomatis, tanpa nanya**, kecuali popup yang memang wajib (lihat daftar di atas). **Destructive ops (delete, force-push, rm -rf, DROP, prisma migrate prod) tetap WAJIB konfirmasi 1x walau auto-confirm aktif** — lihat `CLAUDE_universal_v1.md` section 8.1 (AI Anti-Prompt-Injection Rules).

> Catatan: Claude Code IDE mungkin tetap nanya YES/NO untuk tool call individu tergantung permission setting kamu (centang "Always allow" kalau muncul). Itu IDE-level, bukan dari prompt ini.

---

## Klarifikasi Terminologi Popup (BACA DULU — Anti-Misinterpretation)

> v2 · 2026-06-08 (diperbarui v2.10.0) · Sejak kit 100% Node, praktis hanya ada **1 sistem popup: Tipe A (di dalam chat)**. Popup jendela Windows lama (Tipe B, WPF via PowerShell) sudah **pensiun**. Sejak v2.10.0, jumlah popup Tipe A juga jauh berkurang — instalasi baku 0 popup wajib; sisanya cuma untuk gerbang keamanan/aksi-merusak (lihat daftar di bawah).

### Tipe A — **AI Popup dalam chat** (pertanyaan dari AI di sesi Claude Code)

- **Apa**: pertanyaan pilihan dari AI ke user. **2 bentuk tampil**:
  - **A-klik (UTAMA — WAJIB kalau tersedia)**: AI pakai tool popup-pilihan native Claude Code (`AskUserQuestion`) → muncul **kotak pilihan yang BISA DIKLIK**.
  - **A-teks (CADANGAN)**: HANYA kalau tool popup tidak tersedia → AI tulis blok pertanyaan teks (markdown numbered list), user balas ketik **digit `1` / `2` / `3` / `Enter`** atau token seperti `[skip]` / `[cancel]`.
- **Medium**: dalam chat/IDE Claude Code — kotak pilihan klik (A-klik) atau teks (A-teks). **TIDAK ADA window Windows terpisah yang pop up**.
- **Popup yang MASIH ada (semuanya gerbang keamanan/aksi-merusak, bukan preferensi alur)**:
  - Bagian 1 step 4: **Popup proteksi `AGENTS.md`** existing (kondisional — hanya kalau ada konflik nyata)
  - Bagian 3: **Popup "simpan dulu kerjamu"** (git-status) sebelum rapikan kode existing
  - Bagian 3: **Popup 🔴 Berat** (persetujuan verbatim §8.2 Aturan 5) di Mode Refactor Bertingkat
  - Bagian 3: **Popup peringatan BETA** sebelum eksekusi pecah-repo
  - Bagian 4: **Popup Tier C** (item produksi — RLS, integrasi luar) dengan konfirmasi ketik-persis
- **Headless-safe**: aman jalan via SSH / Server Core / CI — mode A-teks (fallback) cuma text di chat, tidak butuh display.
- **Auto-confirm mode**: AI **TETAP wajib tunggu user reply** untuk popup di atas (sesuai section 8.1 anti-prompt-injection). Cuma destructive ops yang force konfirmasi 1x.

### Tipe B — **WPF GUI Popup** (PENSIUN sejak v2.0.0 — catatan riwayat)

Dulu skrip PowerShell menampilkan jendela Windows (WPF); sejak kit 100% Node mekanisme itu dihapus. **Rule of thumb**: SEMUA popup kit yang tersisa = **Tipe A di dalam chat** — klik opsi, atau ketik angka di mode cadangan. **TIDAK ADA jendela Windows terpisah** — kalau muncul jendela "Save As"-style, itu BUKAN dari lintasAI.

### Cara Tampil Popup (WAJIB — berlaku untuk SEMUA popup Tipe A yang tersisa)

1. **Kalau tool popup-pilihan native tersedia** (`AskUserQuestion`) → AI **WAJIB** render tiap popup lewat tool itu: 1 pertanyaan per popup, **opsi recommended ditaruh PERTAMA + akhiran "(rekomendasi)"**.
2. **Maks 4 opsi UTAMA per pertanyaan.** Opsi meta (`[skip]`/`[cancel]`/`[help]`) TIDAK ikut dihitung.
3. **Blok teks `[1]/[2]/[3]` di tiap Bagian = ISI KANONIK + fallback** — dipakai persis apa adanya HANYA kalau tool popup tidak tersedia. **JANGAN render dobel.**
4. **Mode klik TIDAK punya tombol Enter/default** — user wajib klik salah satu. Khusus **popup destruktif/berisiko**: di mode klik, opsi AMAN ditaruh PERTAMA + "(rekomendasi)", opsi berisiko paling BAWAH.
5. **Bahasa tampilan WAJIB awam (per §2.1 CLAUDE_universal)**: label opsi jargon mentah (mis. "monorepo", "split repo") WAJIB diterjemahkan saat merender — makna & nomor opsi TIDAK berubah. (Istilah programming boleh dipertahankan + gloss di deskripsi opsi — term-first §2.1.)

---

## WORKFLOW (lakukan otomatis tanpa konfirmasi tambahan AI-side, kecuali popup yang ditandai)

### Bagian 0 — Peta Langkah (WAJIB, ringkas)

Sebelum mulai, AI tampilkan 1 blok pendek:

```
🗺️ Pemasangan lintasAI:
  1. Pasang kit + aturan tim (otomatis)
  2. Aktivasi otomatis (docs, ukuran tim, gerbang mutu) + laporan penutup
Kalau nanti butuh audit / rapikan kode / pecah repo — tinggal minta kapan saja, lihat menu di laporan penutup.
```

Tiap selesai 1 bagian, AI tutup dengan 1 kalimat hasil singkat bahasa awam. Tidak perlu penunjuk "Langkah N dari M" lagi — cuma 2 bagian, keduanya otomatis.

### Bagian 1 — Setup teknis (auto, no popup kecuali step 4)

1. Konfirmasi folder kit (`claude-ai-rules-kit/` atau nama serupa, atau `.claude-kit/` kalau clone dari GitHub) ada di root proyek.
2. Rename folder jadi `.claude-kit/` kalau belum. Kalau hasil clone, biasanya sudah `.claude-kit/`.
3. **Kalau hasil clone**: penghapusan `.claude-kit/.git/` (supaya tidak konflik dengan git proyek user) **dilakukan OTOMATIS oleh pemasang** (`setup-pola-b.mjs`, dijalankan `npx lintasai init`, fungsi `removeGitMetadata`). AI **TIDAK perlu** menjalankan hapus-paksa manual.
4. Jalankan pemasang Node: `npx lintasai init` (setara `node .\.claude-kit\setup-pola-b.mjs --force`). **Popup proteksi `AGENTS.md`** (kondisional — hanya kalau project SUDAH punya `AGENTS.md` bermakna, bukan format lintasAI): AI WAJIB tanya SEBELUM pakai `--force`:
   ```
   [1] Cadangkan lalu ganti (rekomendasi — file lamamu disimpan otomatis sebagai cadangan
       ber-timestamp, lalu AGENTS.md lintasAI dipasang supaya aturannya kebaca)
   [2] Pertahankan yang lama (konsekuensi: aturan lintasAI tidak terpasang penuh)
   ```
   JANGAN timpa diam-diam (§14.1 + §1.1). Kalau `AGENTS.md` belum ada / masih kosong → `--force` langsung aman, tanpa popup.
5. Tunjukkan output pemasang (setup-pola-b.mjs auto-copy file skeleton + 21 file tim profesional ke proyek by default).
6. Verifikasi: `AGENTS.md` di root tergenerate + file inti `.claude-kit/` ter-copy + file skeleton `docs/` ada (kecuali project hampir kosong) + **21 file tim** (2 di .github: robot backup-schemas + secret-guard; 19 di docs: panduan pendukung, glossary, playbook keamanan, peta ancaman, ADR template, panduan verifikasi rilis, dll — daftar persis = `teamFiles` di `setup-pola-b.mjs`, angka 21/2/19 dijaga robot `engine/consistency-check.mjs`). Hindari mematok jumlah file inti di sini — kalau butuh angka pasti, hitung dari `engine/kit-files.json` (sumber tunggal).
7. Baca `AGENTS.md` + `.claude-kit/CLAUDE_universal_v1.md` untuk load aturan.

### Bagian 2 — Aktivasi Otomatis (auto, no popup) + Laporan Penutup

Setelah Bagian 1 selesai, AI jalankan SEMUA langkah berikut **diam-diam** (tanpa popup), lalu tutup dengan 1 Laporan Penutup:

**2a. Baca stack RINGAN (1 file, bukan scan menyeluruh).** AI cukup baca `package.json` (+ marker sejenis: `prisma/schema.prisma`, `pyproject.toml`, dll) untuk tahu **framework/ORM** → mengaktifkan stack-pack yang tepat (§4.14 — mis. Next.js/Supabase). **DILARANG scan file-counting menyeluruh saat install** (boros token + lambat, lawan tujuan hemat). Struktur project TIDAK dipetakan dengan men-scan repo — dipetakan dari GIT (lihat 2b). *(Catatan: kriteria kematangan MATURE/FRESH di `templates/STACK_DETECTION_PATTERN.md` — folder dashboard 3+ subfolder · 5+ model DB · `src/lib/` 10+ file · 5+ route API — dipakai HANYA saat audit on-demand [Bagian 3a] untuk tahu ada-tidaknya kode yang diaudit, BUKAN gerbang saat install.)*

**2b. Peta struktur project = dari GIT (deterministik, ~0 token AI) — TIDAK generate docs.** Saat AI perlu tahu struktur project, pakai fakta git yang sudah ada: `npx lintasai project-map` (aktivitas commit per-modul/folder, `rules/7.11-project-map.md`) atau `git ls-files` (daftar struktur berkas mentah). **TIDAK ADA generate/isi `docs/architecture.md` otomatis saat install** — dulu itu menyuruh AI men-scan seluruh project + menulis dokumen (mahal token, cepat basi). Template `docs/` kosong tetap disalin script (murah, boleh diisi owner manual kapan saja). Dokumentasi detail per-file / denah database = **on-demand** (Bagian 3e), hanya saat diminta.

**2c. Ukuran tim — default internal senyap TOTAL (tidak diumumkan).** Default = **SENDIRI**. Robot keamanan `.github/` (backup-schemas + secret-guard) tetap ter-copy dan berlaku untuk semua ukuran tim. **JANGAN sebut ini sebagai "sudah dikerjakan" di Laporan Penutup** — ini keputusan internal diam. Kapan pun user chat *"ubah ukuran tim jadi SENDIRI/TIM KECIL/TIM BESAR"* → AI terapkan ulang action items sesuai level baru (naik level = ingatkan kunci branch `main` manual di GitHub Settings → Branches; turun level = berhenti menagih, JANGAN hapus file apa pun) + catat 1 baris di `AGENTS.md`.

**2d. Gerbang mutu CI — auto-pasang diam-diam kalau relevan.** Deteksi `git remote get-url origin` berisi `github.com`? Tidak ada remote / bukan GitHub → lewati diam-diam. Kalau ADA → AI jalankan `npx lintasai enable-preflight-ci` (menyalin `.github/workflows/preflight.yml`, tidak menimpa yang sudah ada) **tanpa menunggu jawaban**, lalu sebutkan hasilnya + biaya jujur di Laporan Penutup ("robot cek mutu terpasang otomatis; catatan: memakai menit GitHub Actions runner Windows, di repo privat tarifnya 2× runner biasa — lepas kapan saja dengan `npx lintasai disable-preflight-ci` kalau tak diinginkan").

**2e. Rekam Pelajaran — pengumuman pasif.** Sebut singkat: "Kit ini otomatis mencatat **pelajaran TEKNIS** (pola standar IT yang belum dijaga kit) ke berkas **LOKAL** `docs/pelajaran-lintasai/` — **bukan** kode/data bisnismu, **tidak** dikirim ke mana pun otomatis. Mau matikan? bilang 'matikan rekam pelajaran' atau hapus `[x]` di `AGENTS.md`."

**2f. Laporan Penutup (TUTUP Bagian 2 — non-popup, 1 arah, bahasa awam):**

```markdown
✅ lintasAI terpasang & aktif. Standar profesional (keamanan, database, UI/UX, SEO, dll)
otomatis menemani tiap kali kamu ngeprompt — langsung bisa kerja.

**Stack terdeteksi:** [1 kalimat dari 2a — mis. "Next.js + Supabase/Prisma; stack-pack aktif"
ATAU "belum ketahuan; sebut aja stack-mu nanti"]

**Sudah otomatis dikerjakan:**
- [HANYA hasil 2d yang benar-benar terjadi — mis. "✅ Gerbang mutu CI terpasang (catatan biaya: ...)".
  JANGAN sebut ukuran tim (keputusan internal senyap). JANGAN sebut generate docs (tidak dilakukan).]

**Perlu kamu kerjakan manual (kalau relevan stack):**
- [Tier B dari Bagian 4 — mis. kunci branch `main` di GitHub, dst.]

**Kalau nanti butuh, tinggal minta kapan saja — tidak perlu nunggu ditawari:**
- "audit project" → periksa 11 sisi (keamanan, database, kecepatan, dst.), mode cuma-baca
- "rapikan kode bertingkat" → rapikan bertahap paling aman dulu (🟢→🟡→🔴)
- "pecah repo sekarang" / "ubah ukuran tim jadi TIM BESAR" → pecah jadi beberapa repo
- "lihat struktur project" → dari catatan git (cepat, ~0 token), tanpa nunggu docs dibuat
- "buatkan catatan file X" → dokumentasi detail 1 file/modul (2 versi), hanya saat diminta
- "lintasAI skill" → pindai menyeluruh 18 kriteria
```

AI sapa user Bahasa Indonesia ramah sebelum Laporan Penutup, sebut versi kit aktif.

---

### Bagian 3 — Kapabilitas On-Demand (baca HANYA saat user memicu, bukan alur otomatis instalasi)

> Bagian ini TIDAK berjalan otomatis. AI baca &amp; eksekusi hanya ketika user memicu salah satu frasa di bawah — kapan saja, tidak terikat urutan instalasi.

**3a. Audit Menyeluruh — trigger: "audit project" / "periksa seluruh kode" / "review codebase".**
Eksekusi `AUDIT_POST_SETUP_PROMPT_v1.md` (mode aman cuma-baca). **11 sisi diperiksa** (bahasa awam ke user): perapian kode, keamanan, tes otomatis, database, kirim-ke-server, kecepatan, tampilan/frontend, kemudahan-pakai (UI/UX), SEO, kelengkapan catatan, kesiapan staf baru. Tiap temuan dicek-silang skeptis, diurut risiko rendah → tinggi, + analogi non-programmer. Tak ada popup penawaran di depan — user sudah meminta secara eksplisit.

**3b. Rapikan Kode Bertingkat — trigger: "rapikan kode bertingkat" / "rapikan bertahap" / "dari yang paling aman dulu".**
Pakai mesin `CLAUDE_universal_v1.md` §4.11 + `rules/4.2-pattern-driven.md`. **Sebelum mengubah kode existing (pengaman "simpan dulu"):** AI cek `git status`. Kalau ada perubahan menggantung → popup: `[1] Simpan dulu kerjamu (commit) sebelum aku rapikan (rekomendasi) / [2] Lanjut saja (perubahan yang belum tersimpan akan ikut tercampur)`. JANGAN langsung ubah kode di atas perubahan belum tersimpan.
Peluang dikelompokkan 🟢 Ringan → 🟡 Sedang → 🔴 Berat. **🟢 + 🟡 digabung 1 popup** (`[1] kerjakan semua 🟢+🟡 / [2] pilih satu-satu / [3] lewati / [stop]`) — hemat token, karena user sudah eksplisit minta. **🔴 Berat TETAP popup verbatim terpisah** (§8.2 Aturan 5 — Tingkat 1, tidak boleh digabung/dilewati) + tiap kenaikan tingkat WAJIB lulus Gerbang §4.6. Safety Net = branch terpisah + commit kecil + lint/build/test lulus sebelum naik tingkat. Sebelum 🟡/🔴 (sentuh perilaku) → cek tes dulu + pahami pemanggil.

**3c. Pecah Repo — trigger: "pecah repo sekarang" / "ubah ukuran tim jadi TIM BESAR" (lalu tanya lanjut pecah atau tidak).**
Jalankan `SPLIT_REPO_MIGRATION_PROMPT_v1.md`. Sebelum eksekusi, **popup peringatan BETA wajib**:
```
🧪 Fitur pecah-repo masih BETA — belum diuji end-to-end di GitHub nyata. Arsitektur +
pengamannya solid (Tahap 0 cuma salin, kode asli tidak disentuh, bisa dibatalkan; anti-bocor
.env), tapi disarankan uji dulu di repo coba-coba / project tiruan, JANGAN langsung di
project produksi penting. Lanjut?
[1] Ya, aku paham risikonya (uji di repo coba-coba dulu)
[2] Batal
```
Tanya bentuk: **per-Lapisan** (2-3 repo: `<project>-frontend`/`<project>-backend`, `-shared` opsional, cocok tim 3-5+) atau **per-Kapabilitas** (jumlah repo ikut wilayah rahasia + tim, nama auto-deteksi dari fitur project, cocok tim 15-30+; sumber topologi = `docs/plans/POLA_REPO_AMAN.md`). **Anti-spam guard**: `docs/decisions/*permanent-monorepo*.md` ada → jangan tawarkan; `.claude-kit/.split-state` ada → sudah terpecah. **Tahap 0 dulu** (aman, bisa dibatalkan): folder salinan berdampingan, kode asli tidak disentuh.

**3d. Verifikasi "aplikasi masih jalan" (WAJIB setelah 3b/3c mengubah kode existing)** — Gerbang Pra-Rilis §4.6, JANGAN lapor "✅ selesai" tanpa ini: deteksi package manager + skrip yang ADA, **buktikan perintahnya benar-benar jalan** (exit-code sukses), jalankan build+tes yang ada + minta owner smoke-test 3-5 alur kritis. Project belum punya skrip build/tes → JANGAN klaim "aman/lulus" (0 dari 0 tes = rasa-aman-palsu); lapor jujur & minta owner cek manual.

**3e. Struktur project (git) + catatan/docs on-demand.**
- **Lihat struktur project — trigger: "lihat struktur project" / "struktur project apa aja".** Pakai fakta git deterministik (~0 token AI): `npx lintasai project-map` (aktivitas commit per-modul/folder) atau `git ls-files` (daftar berkas). **JANGAN men-scan repo + menulis dokumen** untuk ini — git sudah punya jawabannya.
- **Buatkan catatan/dokumentasi file — trigger: "buatkan catatan file X" / "dokumentasikan modul Y" / "buat peta project lengkap".** HANYA saat diminta eksplisit. Isi `docs/architecture.md` (kalau owner minta denah lengkap), `docs/db-schema.md` kalau pakai DB (baca STRUKTUR saja, JANGAN baca `.env`/secret/PII), dan/atau catatan kode file/modul yang diminta (`PROJECT_LIFECYCLE_PROMPT_v1.md` Stage 2). **Tiap catatan kode = 2 VERSI dalam 1 berkas**: 👨‍💻 programmer (Tujuan/Cara Pakai/Input-Output/Dependensi/Catatan + `path:baris`) + 🙂 non-programmer (1 blok ringkas bahasa sehari-hari + analogi). Format sumber = `templates/_PATTERNS.md` + `templates/_EXAMPLE.md`. **Kunci: dokumentasi = on-demand pay-as-you-use, BUKAN bulk otomatis saat install** (§4.19 + tujuan hemat token).

---

### Bagian 4 — WAJIB lapor Pending Action Items (tier-aware)

Di Laporan Penutup Bagian 2, AI WAJIB lapor daftar item yang perlu tindak lanjut (skip yang tidak relevan stack). **WAJIB arahkan owner/lead ke `docs/OWNER_SETUP_CHECKLIST.md`**:

```markdown
## 📋 Daftar Tugas (perlu tindak lanjut)

| # | Tugas | Tier | Perilaku AI | Perkiraan waktu |
|---|---|---|---|---|
| 1 | Kunci branch `main` di GitHub: Settings → Branches → Add branch protection rule (wajib PR + 1 approval) | **B** | Lapor saja | 5 menit |
| 2 | Buat denah struktur database → `docs/db-schema.md` (kalau terdeteksi pakai DB/ORM apa pun) | **A** | **Auto-eksekusi langsung + lapor hasil** (mode aman cuma-baca) | 15 menit |
| 3 | Pasang RLS di Supabase (siapa boleh lihat baris data mana) | **C** | **WAJIB popup konfirmasi HARD + ketik-persis (verbatim)** | 1-2 jam |
| 4 | Pecah-repo — Tahap 0 persiapan cepat (kalau terdeteksi penanda MULTI) | **A** | **Tetap manual-only** (bagian dari kapabilitas on-demand 3c, bukan auto-eksekusi) | 30-60 menit |
| 5 | Rapikan catatan ke sub-folder `docs/` (kalau `docs/` >30 file) | **A** | **Auto-eksekusi langsung + lapor hasil** | 30 menit |

Keterangan Tier: **A** = AI kerjakan otomatis + lapor hasil (aman & reversibel) · **B** = harus owner kerjakan manual · **C** = AI bisa tapi risikonya tinggi, popup keras.
```

**Aturan tier-aware (WAJIB, bukan "lapor tabel diam"):**
- **Tier A (aman+reversibel, mis. item 2/5)** — AI **auto-eksekusi langsung**, TIDAK menunggu popup jawaban, lalu lapor hasilnya 1 baris. Kecuali item terkait pecah-repo (item 4) yang tetap manual-only karena bagian dari kapabilitas on-demand 3c.
- **Tier B** — Lapor saja: "⚠️ WAJIB owner manual via [tempat]: [action]. [1-baris kenapa penting]." Tidak ada popup.
- **Tier C** — WAJIB popup KONFIRMASI HARD: `[1] Ya, aku paham risikonya` / `[2] Nanti aja` (rekomendasi) / `[3] Jangan`. 🚨 **Khusus item yang MENGUBAH database/server PRODUKSI** (mis. RLS): klik lunak `[1]` TIDAK CUKUP (§8.2 Aturan 5) — WAJIB user **mengetik FRASA PERSIS (verbatim)**, mis. `PASANG RLS PRODUKSI`; deskripsi opsi `[1]` sebut **blast radius** bahasa awam; AI **HANYA MEMANDU**, owner sendiri yang eksekusi, WAJIB di staging dulu.

**Untuk tim split-repo** (sesudah Tahap 0): nyalakan rambu skala-besar di tiap repo — kunci pengaman gabung (langkah manual owner di GitHub: **Settings → Branches → Add branch protection rule** untuk `main`, wajib PR + 1 approval + larang force-push) + gabung-otomatis-aman (`.github/workflows/auto-merge-shared.yml`). **WAJIB popup-per-item** (kunci-pengaman-gabung = langkah manual owner — AI memandu, owner yang klik; tetap tawarkan via popup karena ini pengaman dasar skala-besar, bukan sekadar rapi-rapi).

---

## Aturan AI selama workflow ini

- **Instalasi baku (project baru, tanpa konflik `AGENTS.md`) = 0 popup wajib.** Popup yang tersisa: proteksi `AGENTS.md` (Bagian 1 step 4, kondisional-langka), git-status sebelum rapikan (3b, kondisional on-demand), 🔴 Berat (3b, on-demand), peringatan BETA split-repo (3c, on-demand), item Tier C (Bagian 4, kondisional).
- **Auto-decide tanpa popup**: docs skeleton (2b), ukuran tim default (2c), gerbang mutu CI (2d), Tier A Pending Action Items (Bagian 4), audit/refactor/split-repo tidak ditawarkan proaktif (murni Bagian 3 on-demand).
- Kalau ERROR yang gak bisa di-fix sendiri, lapor + saran fix.
- JANGAN ubah file di `.claude-kit/` (read-only).
- Anti-overwrite di `docs/` + `.github/`: file existing di-skip, tidak ditimpa.
- IDE permission prompt (PowerShell/Edit YES-NO) di luar kontrol prompt ini.
- Semua respons AI ke user dalam **Bahasa Indonesia**.

---

## Untuk Staff Baru (Day 0 Pertama Kali Pakai lintasAI)

Setelah Bagian 1-2 selesai, kalau kamu **staff IT non-programmer baru pertama kali pakai lintasAI**, AI akan auto-trigger **Guided Step-by-Step Pattern** (`CLAUDE_universal_v1.md` section 4.3):

- 6 phase universal (Foundation → Reading → Project Context → Environment Setup → First Micro-Task → Daily Work Starts)
- Wait-for-confirm pattern: AI minta kamu konfirm tiap step sebelum lanjut, tidak overwhelm
- Berlaku universal untuk SEMUA project
- Phase 2 (reading GLOSSARY + SECURITY_PLAYBOOK) cuma sekali per staff - di-skip kalau pernah baca

Trigger conditions: detect `architecture.md` fresh-generated, `AGENTS.md` placeholder belum filled, atau user eksplisit ngomong "halo aku staff baru".

Detail lengkap di `CLAUDE_universal_v1.md` seksi 4.3.

---

Mulai dari Bagian 1 sekarang.
