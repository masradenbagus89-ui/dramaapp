<!-- LINTAS:SEKSI §7-documentation -->

## 7. Dokumentasi `.md`
`.md` pendamping di `docs/` = catatan singkat tiap bagian kode penting (Bahasa Indonesia, junior-friendly) supaya sesi/orang berikutnya tak meraba. Perbarui yang relevan saat kode berubah substansial — kode tetap sumber kebenaran; dokumen untuk NAVIGASI (§7.3, §7.3a). Dibuat **on-demand saat memang perlu** (bukan otomatis tiap edit); butuh peta aktivitas apa yang berubah belakangan → `npx lintasai project-map` (§7.11). Aturan baca tiap sesi = §7.3 READ-MINIMAL; format wajib tiap `.md` = §7.5 (`templates/_PATTERNS.md` + `_EXAMPLE.md`).

### 7.3 READ-MINIMAL docs
1. **Baca SATU peta** sekali di awal sesi: ada kartu `project.lintas.jsonc` → baca kartu saja (§7.9 #1); tidak → `docs/architecture.md`. `architecture.md` menyusul hanya saat butuh narasi/konvensi (fitur besar, arsitektur, onboarding). **Kalau `architecture.md` belum diisi / cuma `[TBD]`** (default sejak install-senyap — kit TIDAK generate docs otomatis): untuk struktur project pakai **GIT** (`npx lintasai project-map` fakta commit per-modul, atau `git ls-files` daftar berkas — deterministik, ~0 token) + `Grep`; jangan meraba repo dengan `ls` berulang, dan JANGAN otomatis mengisi `architecture.md` (itu on-demand saat owner minta).
2. **Cherry-pick `.md` relevan task** (task auth → `docs/auth.md` + `docs/permissions.md` saja). Pakai `Grep`/nama berkas.
**LARANGAN:** ❌ baca semua `docs/*.md` di awal · ❌ browse `docs/` dengan `ls`/`Glob` lalu baca satu-satu · ❌ re-read `architecture.md` di tengah task sama. **Docs >30 file:** pakai subfolder grouping + `architecture.md` + `Grep`.

### 7.4 `docs/architecture.md` — peta makro proyek (USER-EDITED)
Berisi: tujuan, stack, struktur folder, entry points, modul inti, env vars, konvensi. Skeleton dari `templates/architecture.md`. AI boleh update (tambah modul saat feature besar, tanya user). SATU peta makro; JANGAN bikin registry/TOC terpisah — cukup `architecture.md` + `Grep`.

### 7.5 Format wajib tiap file `.md` pendamping
Template = `.claude-kit/templates/_PATTERNS.md` + `_EXAMPLE.md`. Inti: judul 1-baris + header **versi · tanggal** + bagian **Tujuan / Cara Pakai / Input-Output / Dependensi / Catatan** (edge case + keputusan + source `path:line`).
- File aturan/kontrak (`CLAUDE.md`, `AGENTS.md`, `decisions.md`, spec API) wajib header versi + tanggal; naikkan versi saat perubahan substansial.
- Keputusan teknis non-sepele dicatat di `docs/decisions/` pakai ADR pattern (keputusan/alasan/alternatif ditolak).

### 7.6 AI Auto-Health-Check (sesi PERTAMA pasca pasang/update + reaktif — bukan tiap sesi)
Jalankan pada 3 pemicu saja: (a) sesi pertama pasca pasang/update; (b) reaktif saat error berbau lingkungan / "di komputerku jalan, di sana beda"; (c) manual `npx lintasai doctor`. Daftar 6 hal yang dicek + jebakannya (roster placeholder = normal, BUKAN rusak; hook penjaga project tak ada = BUKAN error) = `rules/7.6-health-check.md`.

### 7.7 Bus Factor Scorer (WAJIB tiap edit file CRITICAL)
**Bus factor** = berapa orang paham cara kerja sesuatu; =1 berbahaya, target ≥2 per file CRITICAL. **File CRITICAL** = 6 kategori: Auth (login/session/oauth/jwt) · DB/Persistence (prisma/repository/schema/models) · Security/Crypto (crypto/permissions/*-guard/rate-limit) · API/Router (routes/controllers/handlers) · Entry points (main/index/app/server/layout) · Feature domain (`features/`, `modules/`). Tiap edit/buat file CRITICAL: AI beri skor + lapor inline 1 baris bahasa non-programmer + tawarkan perbaikan kalau <2. Skala skor 0-4 + kapan SKIP + contoh kalimat lapor = `rules/7.7-bus-factor.md`.

### 7.9 Kartu Identitas Project (`project.lintas.jsonc`) — baca DULU + jaga `modules` sinkron
Kalau project punya kartu identitas mesin-baca di akar (`project.lintas.jsonc`), AI WAJIB membacanya DULU: tujuan, peta modul→lokasi, stack, konvensi (hemat token, tak meraba tiap sesi). Aturan:
1. **Baca-dulu — SATU peta, bukan dua:** task rutin baca kartu ini SAJA di langkah READ (§7.3). `architecture.md` dibaca hanya saat perlu narasi/konvensi (fitur besar, arsitektur, onboarding).
2. **Isi sesi pertama:** `intent.purpose`/`domain` masih `'pending'` → AI isi dari obrolan staff.
3. **Perbarui `modules` tiap struktur berubah:** tiap tambah/ubah/hapus modul, perbarui array `modules`. Path WAJIB nyata (dijaga robot).
4. **Sumber-tunggal:** `stack` = turunan `package.json` (jangan salin dependency); `refs.kit_version` = pointer ke `.install-manifest.json`. Robot `engine/project-manifest.mjs` cek kartu vs kenyataan di Gerbang §4.6.
5. **`split.access_tier` = CATATAN niat, BUKAN keamanan** — pertahanan akses nyata di GitHub repo + CODEOWNERS (§8.1 #4).
Detail = `docs/project-manifest.md`. (Project kecil/solo boleh tanpa kartu.)

### 7.10 Higiene menulis dokumen kit (anti-"slop") — rujukan on-demand
Saat menulis/merapikan dokumen kit: buang basa-basi + pengulangan fakta. ⚠️ Yang TIDAK boleh dibuang (itu pagar, bukan "slop"): kata-ragu/hedging (§8.2), emoji/analogi/blok 2-versi (§2.1/§4.1). Rincian = `rules/7.10-doc-hygiene.md`.

### 7.11 Peta Aktivitas Project → draf roadmap (human-gated)
Staff minta roadmap/peta jalan/progres/denah → `npx lintasai project-map` (fakta git, cuma-baca) lalu susun DRAF yang **WAJIB disetujui manusia** sebelum ditulis; git = masa lalu, roadmap = rencana. Langkah = `rules/7.11-project-map.md`.

---

