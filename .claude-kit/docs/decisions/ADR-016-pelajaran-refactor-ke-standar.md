# ADR-016: Serap 4 pelajaran refactor-aman ke REFACTOR_STANDARD (kontrak tak-terlihat, red→green, anti-over-split, metrik-sukses)

---

## Metadata

- **Tanggal:** 2026-07-18
- **Status:** Accepted
- **Author:** owner (dokterbrutal) + Claude Code
- **Reviewer:** owner (lewat persetujuan rencana / ExitPlanMode)

---

## Context

- **Problem statement:** Sesi refactor hemat-token memecah 3 perkakas yang dijalankan CLIENT — `kit.mjs doctor`, installer `setup-pola-b.mjs`, updater `update-kit.mjs`. Prosesnya memunculkan **kelas-bug nyata** (dicatat [LP-010](../BUKU_PELAJARAN.md)): banyak cabang keputusan + **kontrak-keluaran yang dibaca mesin/AI** (mis. penanda `[LINTASAI:PERLU-TINDAKAN]`) tidak punya tes → jalur regresi senyap. Dari refleksi ini muncul 4 pelajaran metodologi yang belum tertulis di standar refactor yang dikirim ke client.
- **Constraints:** (a) Profil tim (`PROFIL_TIM.local.md`, sengaja tak ikut ter-publikasi): komposisi tim membuat **disiplin-tes jadi jaring pengaman mutu utama**; doktrin `:139` "menambah aturan ≠ menambah kepatuhan — yang menangkap = pemeriksa yang membuka sumber"; doktrin `:149` "kirim produk > sempurnakan kit, tambah HANYA saat task tersandung". (b) Anti-bloat always-load (`CLAUDE_universal_v1.md` §14).
- **Asumsi:** 4 pelajaran ini = konsep rekayasa perangkat lunak baku (bukan opini) — divalidasi ke sumber industri: characterization test (Feathers), TDD red→green (Beck), cohesion/coupling + AHA (Metz/Dodds), LOC-bukan-metrik + mutation coverage.

---

## Decision

Serap **4 pelajaran** ke `templates/REFACTOR_STANDARD.md` (v3 → v4, ter-ship ke client, dibaca AI+staff ON-DEMAND saat refactor):

1. **L1 — Anti-over-split:** jangan paksa pisah kode yang menempel erat (berpasangan / berbagi state / terkopling ke inti) → biarkan menyatu. *Cohesion/coupling + AHA.* → butir "Kapan JANGAN refactor".
2. **L2 — Kunci "kontrak tak-terlihat" dulu:** keluaran yang dibaca mesin/AI/sistem lain (JSON API, RLS Supabase, webhook, log, markup SEO, string penanda) → kunci dengan **characterization test** SEBELUM memindah. → langkah baru di "Cara AMAN" + checklist.
3. **L3 — Red→green:** tes-pengunci dibuktikan MERAH dulu baru percaya HIJAU; penjaga tak-pernah-merah = rasa-aman-palsu. → langkah "Verify".
4. **L4 — Metrik sukses ≠ jumlah baris** (baris = sinyal, bukan nilai sukses) + inventaris cakupan per-perilaku sebelum menyentuh. → catatan setelah "Manfaat" + checklist.

Bukti-mesin dicatat sebagai **LP-010** di `docs/BUKU_PELAJARAN.md` (status TERPASANG, menunjuk 3 tes-pengunci nyata sesi ini). **TIDAK** mencatat ulang 3 pelajaran yang sudah jadi aturan penuh (tes-pengunci-dulu §4.11; robot>AI §6.3/§6.4; dokumentasi WHY-NOT §4.20/§7.5).

Jangkauan ADR ini = **repo-dev** (seperti ADR-012/013/014); yang sampai ke client = isi REFACTOR_STANDARD v4-nya sendiri.

---

## Alternatif yang Ditolak

- **A — Tulis pelajaran di `CLAUDE_universal_v1.md` (always-load):** ditolak — menambah biaya token tiap sesi (lawan hemat-token) + profil `:139` "menambah aturan ≠ menambah kepatuhan"; teks always-load bukan tuas kepatuhan.
- **B — Rekam semua 8 pelajaran kandidat:** ditolak — 3 sudah jadi aturan penuh → duplikat = bloat, lawan SSOT §6/§14.
- **C — Buat berkas baru `docs/pelajaran-lintasai/`:** ditolak — itu folder client-side gitignored untuk **celah frontier di project client** (§6.5), bukan rumah metodologi kit-repo.
- **D — Bikin robot deterministik penegak L2/L3:** ditolak (untuk sekarang) — "inventaris cakupan" & "red→green" sulit ditegakkan robot tanpa alarm-palsu (kuadran BETA, `docs/plans/PIPELINE_FEEDBACK_KE_STANDAR.md:33`). Penegak nyata yang ADA = 3 tes-pengunci (LP-010).

---

## Konsekuensi

### Pros
- Standar refactor client kini menutup 4 celah nyata yang paling menyakiti **app Next.js/Supabase/webhook/SEO** (kontrak tak-terlihat = titik bocor senyap termahal).
- Selaras profil tim: memberi disiplin-tes yang bisa dibaca AI + staff non-programmer saat merapikan kode.
- Nol biaya always-load (semua on-demand/internal).
- Bukti-mesin (LP-010) memenuhi doktrin "pemeriksa yang membuka sumber", bukan sekadar teks.

### Cons
- `REFACTOR_STANDARD.md` bertambah ~15 baris (v3 185 → v4 ~200) — masih lean, tapi bukan nol.
- Sebagian pelajaran (L3/L4-inventaris) belum punya penegak-robot deterministik → mengandalkan AI+reviewer membaca standar saat refactor.

### Risk
- Teks standar bisa "ada tapi tak dipatuhi" (persis pelajaran profil `:139`). **Mitigasi:** yang benar-benar menegakkan = 3 tes-pengunci LP-010 + kebiasaan characterization test; standar = rujukan, bukan gerbang.
- Nomor baris sisipan bisa membuat dokumen bergeser — mitigasi: tak ada tes yang mengunci teks REFACTOR_STANDARD (diverifikasi: hanya path/keberadaan yang dijaga `lib/kit-files.json`).

---

## Implementation Notes

- **File yang berubah:** `templates/REFACTOR_STANDARD.md` (v4), `docs/BUKU_PELAJARAN.md` (LP-010), `docs/decisions/README.md` (indeks: tambah baris ADR-015 + ADR-016).
- **Penjaga terpasang (LP-010):** `tests/kit-doctor-branches.test.mjs`, `tests/setup-hooks-lock.test.mjs`, `tests/update-report-lock.test.mjs`.
- **Rollback plan:** kalau standar dinilai tak berguna — hapus 4 sisipan REFACTOR_STANDARD + turunkan versi; LP-010 + tes-pengunci TETAP (bernilai independen).

---

## Riwayat

| Tanggal     | Status            | Oleh         | Catatan                                                       |
|-------------|-------------------|--------------|---------------------------------------------------------------|
| 2026-07-18  | Accepted          | owner        | Disetujui lewat persetujuan rencana / ExitPlanMode           |
