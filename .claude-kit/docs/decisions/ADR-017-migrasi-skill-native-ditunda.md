# ADR-017: Migrasi trigger-summary ke Skill native Claude Code — DITUNDA

> Status: DITUNDA · 2026-07-18 · Konteks: owner tanya cara hemat token lanjutan di
> `CLAUDE_universal_v1.md` tanpa mengubah fungsi deteksi-otomatis skill dari prompt natural.

## Konteks

`CLAUDE_universal_v1.md` (~76.799 karakter) di-`@import` PENUH oleh `CLAUDE.md` root — dibaca
ulang AI di SETIAP sesi kerja (always-loaded, bukan on-demand). Owner minta dianalisa: bisakah
sebagian besar isinya TIDAK di-load penuh tiap sesi, TANPA kehilangan perilaku inti kit
(§4.13: "staff ngeprompt biasa → AI otomatis terapkan checklist 8 divisi/skill relevan, tanpa
mengetik apa pun spesifik").

Riset (dokumentasi resmi `code.claude.com` + inspeksi kode kit sendiri) menemukan:

1. **`@import` selalu full-load tanpa syarat** — tak ada mekanisme conditional-load bawaan.
2. **Skill native** (`.claude/skills/<nama>/SKILL.md`, frontmatter `description`) = mekanisme
   LAZY resmi: deskripsi singkat selalu resident (murah), isi lengkap baru dimuat saat model
   MEMILIH memanggilnya (penalaran model, bukan keyword-matching kaku) — **tapi dokumentasi
   resmi mengakui auto-invoke TIDAK 100% andal**.
3. **Hook `lib/lang-reminder.mjs`** yang sudah jalan di kit ini (auto-terpasang ke semua project
   klien) ternyata bersifat **statis 100%** — teks sama persis tiap prompt (880-1.285 karakter),
   TIDAK membaca/menganalisa isi prompt user untuk memutuskan konten berbeda per topik.
4. **lintasAI belum pernah memakai mekanisme Skill native sama sekali** — 0 folder
   `.claude/skills/`, 0 berkas `SKILL.md` di seluruh repo. Konsep "skill" di kit ini (§4.13
   skill divisi, §4.9 skill kustom) 100% custom: instruksi tertanam sebagai prosa di
   `CLAUDE_universal_v1.md` (always-loaded) + folder `workflows/*.md` (dibaca manual via `Read`).
5. Ringkasan-pemicu untuk konten Tingkat-2 (stack-pack §4.14, capability-pack §cap, 5-pola-bantu
   §4.15, pattern-driven §4.2, dll) sudah tertanam sebagai prosa di badan `CLAUDE_universal_v1.md`
   sendiri — ini yang bikin AI "tahu" berkas rak `workflows/` mana yang harus dibaca, dan prosa
   ini ikut memakan token always-loaded (bukan gratis).

## Opsi dipertimbangkan

1. **Pilot konservatif** — migrasi hanya konten ekstra/opsional (stack-pack, capability-pack,
   5-pola-bantu) ke Skill native. Perkiraan hemat ~1.500-2.000 token. Risiko kecil (yang dipindah
   bukan mekanisme wajib).
2. **Migrasi luas** — tambahkan pattern-driven refactor (§4.2), update-strategy (§4.5),
   co-pilot-berpagar (§4.12), dan seksi Tingkat-2 lain yang berpola sama. Perkiraan hemat
   ~2.500-3.250 token. Risiko sedang (lebih banyak titik bergantung pada reliabilitas
   auto-invoke Skill yang belum pernah diuji di kit ini).
3. **Tunda — status quo.** Tidak ada migrasi; catat analisis untuk direvisit nanti.

## Keputusan

**Opsi 3 — TUNDA.** Alasan owner: `CLAUDE_universal_v1.md` sudah terbukti efisien menurut ukuran
kit sendiri (77.429→76.799 karakter dari ambang `lib/rules-budget-check.mjs` 128.000 karakter —
~60% terpakai, 40% headroom; juga sudah terukur ~10% dari total sesi koding di audit
sebelumnya) — token BUKAN masalah mendesak. Migrasi ke Skill native akan jadi pemakaian PERTAMA
mekanisme ini di kit ini (belum ada jam-terbang teruji), dan tie-breaker §0 kit sendiri
("Benar & Bebas Bug" MENANG atas "Hemat Token") melarang menerima risiko reliabilitas baru tanpa
kebutuhan mendesak yang sepadan.

## Konsekuensi

- **Positif:** tidak ada risiko baru; `CLAUDE_universal_v1.md` tetap 100% konsisten seperti
  sekarang (semua trigger terjamin selalu diterapkan, bukan bergantung pada auto-invoke model).
- **Ditunda, bukan ditolak permanen:** analisis + fakta teknis di ADR ini tetap berlaku sebagai
  dasar kalau owner mau lanjut nanti.
- **Kapan revisit:** (a) kalau ukuran `CLAUDE_universal_v1.md` mendekati ambang 128.000 karakter
  (saat ini masih jauh — lihat `node lib/rules-budget-check.mjs`), ATAU (b) kalau owner sudah
  pernah pakai Skill native untuk kebutuhan lain dulu (attempt lebih kecil non-kritis) supaya ada
  jam-terbang sebelum dipakai di jalur kritis kit ini (8-divisi/skill-detection).

## Alternatif ditolak (untuk saat ini)

- **Migrasi langsung tanpa uji-coba** — ditolak: mengganti mekanisme yang 100% andal (prosa
  always-loaded) dengan mekanisme yang diakui dokumentasi resminya sendiri "tidak 100% andal",
  tanpa data lapangan dulu di kit ini = risiko yang tak perlu diambil saat token belum jadi
  masalah mendesak.
- **Hook `UserPromptSubmit` dinamis (baca isi prompt, suntik kondisional)** — secara teknis
  mungkin (hook bisa baca field `prompt` + regex), tapi butuh logic hand-coded per topik (tak ada
  DSL bawaan) dan ~~hanya jalan di Claude Code lokal (tak portable)~~ — kompleksitas tambahan yang
  belum sepadan dengan urgensi hemat token saat ini. Bisa dipertimbangkan ulang bersamaan dengan
  opsi Skill kalau revisit nanti.

  > 🔧 **KOREKSI 2026-07-19 ([[ADR-022]]):** klaim *"hanya jalan di Claude Code lokal (tak portable)"*
  > **KELIRU** — dibantah `lib/kimi/ensure-kimi-hooks.mjs:30-31`: `UserPromptSubmit` sudah berjalan di
  > Kimi Code lewat `lib/kimi/lang-reminder-kimi.mjs` dan sudah dikirim ke client sejak ADR-015.
  > Alasan satunya (*"butuh logic hand-coded per topik"*) **tetap berlaku** dan terbukti: ADR-022
  > membangunnya sebagai `lib/rak-pemicu.mjs` — tabel tulis-tangan dengan 4 penjaga sinkron
  > deterministik. Biaya itu diterima sadar, bukan hilang. **ADR-017 tetap "Ditunda"** untuk pokok
  > bahasannya sendiri (migrasi ke Skill native); yang dikoreksi hanya klaim portabilitas di sini.

## Terkait

[[ADR-009]] (perkuat-jangan-kurung — otak Claude tetap sopir, kit = perlengkapan) ·
`CLAUDE_universal_v1.md` §4.13 (8 Skill Divisi WAJIB) · `lib/lang-reminder.mjs` ·
`lib/rules-budget-check.mjs`
