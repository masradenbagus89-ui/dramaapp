# ADR-030 — Microkernel ekstrem `CLAUDE_universal_v1.md`: 64rb → 31rb char (−52% token/sesi client)

- Status: DITERIMA (keputusan owner, 2026-07-22)
- Titik pemulihan isi lama: commit `385028c` (semua teks yang dihapus bisa diambil kembali dari riwayat git)

## Keputusan owner

Berkas aturan always-load dirampingkan ekstrem. Yang AKTIF tiap sesi hanya: **8 favorit owner**
(bahasa non-programmer + narasi ber-"kenapa" · Tinjauan Divisi §4.1 TIDAK diubah · deteksi skill
otomatis · §4.17 AI native pengambil keputusan · microkernel §0 · hemat token · AI benar
§1b/§7.3a/§8.2 · §4.19 Pindai Cepat) + penopang kecil + kerangka pemicu 1-2 baris. Badan 14 seksi
(§4.3b · §4.7 · §4.10 · §4.11 · §5 · §7 · §8 · §8.1 · §9 · §10 · §11 · §12 · §14.1 · §15 sepuluh-ide)
**dihapus dari muatan sesi** — fungsi tetap hidup di rak/skill on-demand yang memang sudah jadi
rumahnya (ADR-024/027) + **Tabel-Pemicu baru di §4.13** (1 baris/kemampuan). Mode kilat atas perintah
owner: penghapusan TANPA banding-isi per butir (arsip = riwayat git; "mungkin kuperbaiki pasca-rilis
jika butuh"). §8.2 Aturan 1/A3/A4/4/5 dipertahankan sebagai mandat 1-baris (penopang "AI benar");
Aturan 1b/2/3/3b dioptimalkan. Susunan berkas diurut prioritas (terpenting di atas), gaya telegram.

## Angka terukur (sebelum → sesudah)

- Berkas aturan: 64.012 → 30.939 char (65.415 → 31.896 byte) ≈ 16.003 → 7.735 token.
- Muatan sesi client (universal + CLAUDE.md + AGENTS.md template): 70.889 → 36.360 char ≈ 17.722 →
  9.090 token — **hemat ±8.632 token/sesi (−48,7%)**.
- Adapter ikut ramping: Kimi `.kimi-code/AGENTS.md` 66.311 → 32.744 byte · Cursor 33.049 byte ·
  **Codex: blok aturan TERTULIS untuk pertama kalinya** (32.601 byte ≤ gerbang 32.768; sebelumnya
  66.144 byte = DITAHAN total, client Codex dapat NOL aturan).

## Metode & bukti tidak-ada-yang-rusak

Metode "kerangka frasa terkunci": semua frasa/struktur yang dikunci 25 berkas tes + robot
(`engine/locked-phrase-list.mjs`, pemetaan manual per seksi) dipertahankan verbatim; yang dipangkas
= prosa penyambung; draf diuji mesin di scratchpad SEBELUM menimpa repo. Bukti akhir: **1.533/1.533
tes lulus · `preflight --strict` GENTING 0 / PENTING 0 · simulasi dispatcher 4 skenario
byte-identik dengan pra-perubahan · simulasi Palang Rak 3 kasus benar** (mesin `rak-pemicu`/
`lang-reminder`/`rak-gate`/`risk-gate` memang tidak membaca berkas ini — terverifikasi).

## Penyesuaian ikutan (transparan, bukan pelemahan)

1. `tests/setup-pola-b-write.test.mjs` — ekspektasi "tidak boleh ada `AGENTS.md.backup-*`" ditulis
   saat Codex mustahil muat; kini adapter Codex aktif + membuat cadangan pengaman sebelum menyisip
   blok. Kontrak "update tak menimpa kerja client" tetap dijaga (marker client wajib bertahan di
   berkas hidup + cadangan wajib salinan setia).
2. Redaksi §6 "jangan baca utuh" → "JANGAN dibaca penuh" — kompresi membuat nama berkas Grep-dulu
   masuk jendela 200-char cek (11) `rules-ref-check`; diganti sesuai saran robot, bukan melonggarkan robot.
3. `.gitignore` + `/AGENTS.md` akar repo kit — artefak generate `runCodexAgentsGen` (perlakuan sama
   dengan `.kimi-code/` dan `.cursor/rules/lintasai.mdc`). AGENTS.md milik CLIENT tidak terpengaruh.

## Batas jujur & catatan

- **Margin Codex tipis:** rakitan Codex muat dengan sisa ±150 byte bila AGENTS.md client ramping.
  Client dengan AGENTS.md template penuh (±4,6rb byte) masih melewati gerbang gabungan → blok Codex
  DITAHAN untuk mereka (gerbang per-client menilai jujur saat `update`). Opsi lanjutan bila owner
  mau: rampingkan `AGENTS.md.template`.
- **Drift Palang Rak DICATAT, tidak diubah** (keputusan owner): teks §8.2 + `docs/rak-gate.md`
  menyatakan "DEFAULT MATI", padahal `engine/setup-hooks.mjs:102` memasangnya tanpa syarat
  ("default NYALA sejak v4.0.0"). Perlu keputusan owner terpisah.
- Klausa ADR-024 "§8.2 tak disentuh" dicabut ATAS PERINTAH OWNER untuk restrukturisasi ini
  (substansi aturan dipertahankan; yang berubah = kepadatan + lokasi detail).
- Nomor-nomor seksi lama (§5/§7/§8/…) tetap hidup sebagai label baris di Tabel-Pemicu §4.13 supaya
  ±300 rujukan silang di `rules/`/`skills/` tidak yatim.
