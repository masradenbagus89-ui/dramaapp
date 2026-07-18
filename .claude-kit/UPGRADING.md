# UPGRADING.md — Panduan pindah versi BESAR kit lintasAI

> Versi 2 · 2026-07-10 · Langkah 5 rencana `docs/plans/STRATEGI_UPDATE_v2.md` (§6 disiplin rilis)

## Apa bedanya dengan CHANGELOG.md?

- **`CHANGELOG.md`** = *daftar perubahan* per rilis (apa yang baru/diperbaiki) — dibaca urut waktu.
- **`UPGRADING.md` (berkas ini)** = *buku panduan pindah* — HANYA diisi saat ada rilis **BESAR /
  `[BREAKING]`** (perubahan yang tidak kompatibel-mundur), berisi langkah konkret "dari versi lama
  ke versi baru" di satu tempat, tanpa harus menyisir CHANGELOG panjang.

🏢 Analogi: CHANGELOG = **koran** (berita harian); UPGRADING = **petunjuk pindahan rumah** — hanya
terbit saat kamu benar-benar pindah rumah, dan isinya langkah-langkah, bukan berita.

## Cara pakai (klien)

1. Saat update kit melaporkan ada label `[BREAKING]`, buka berkas ini → cari bagian
   `## vX → vY` yang sesuai.
2. Ikuti langkahnya **urut dari atas**. Minta AI memandu: *"pandu aku migrasi kit ke vY"* —
   AI menjalankan per-langkah dengan konfirmasi (bukan borong sekaligus).
3. **Selalu SIMULASI dulu** (jalan pura-pura, tidak mengubah apa pun) sebelum langkah yang
   mengubah berkas — hasil simulasi ditinjau, baru diterapkan sungguhan.
4. Selesai? Jalankan `npx lintasai doctor` — bagian "laporan migrasi" harus hijau
   ("Termigrasi X dari X"). Kalau masih "Selesai sebagian", ada artefak yang belum menyusul.

## Aturan menulis entri (maintainer kit — WAJIB tiap rilis `[BREAKING]`)

Tiap rilis ber-label `[BREAKING]` WAJIB menambah satu bagian di bawah dengan kerangka ini
(penjaga gerbang `preflight` menagih: kenaikan `schema_version` artefak yang tidak disebut di
berkas ini = peringatan PENTING):

```markdown
## vX.Y.Z → vA.B.C (tanggal)

**Apa yang berubah + siapa terdampak:** <1-2 kalimat bahasa awam>
**Artefak yang naik format:** <nama berkas, mis. project.lintas.jsonc v1 → v2>

**Langkah migrasi (urut):**
1. SIMULASI dulu (tidak mengubah apa pun): `<perintah 1-baris --simulasi>`
2. Tinjau hasil simulasi → kalau cocok, terapkan: `<perintah 1-baris>`
   (migrator WAJIB idempoten + membuat cadangan ber-cap-waktu + mencatat ke buku-besar
   `.migration-state.json` supaya tak jalan dobel)
3. Verifikasi: `npx lintasai doctor` → laporan migrasi hijau.

**Cara balik (rollback) kalau ada masalah:** <1 baris, mis. pulihkan dari cadangan .backup-<ts>>
```

Rujukan maintainer: `docs/RESEP_PERUBAHAN.md` **Resep 9** (naik-versi-skema) + aturan
**"Dua Keranjang Migrasi"** di `workflows/4.5-update-strategy.md` (dulu di `LINTASAI_WORKFLOWS_v1.md` §4.5 — sejak v2.4.0 berkas itu jadi pengalih).

---

## Riwayat pindah-versi

## v1.62.x / v1.63.x → v2.0.0 (2026-07-10)

**Apa yang berubah + siapa terdampak:** SEMUA alat PowerShell dihapus dari kit — kit kini **100%
Node** (jalan sama di semua komputer). Skrip lama `kit.ps1`, `update-kit.ps1`, dan seluruh
`lib/*.ps1` **tidak ada lagi** → semua perintah kini lewat `npx lintasai <perintah>`
(mis. `npx lintasai doctor`, `npx lintasai@latest update`). Terdampak: semua project ber-kit yang masih
memanggil skrip `.ps1` kit secara langsung. Catatan penting: yang dihapus hanya **alat kit yang
ditulis dalam bahasa PowerShell** — PowerShell sebagai *terminal Windows* (jendela tempat kamu
mengetik `npm`/`npx`) tetap kamu pakai seperti biasa. Alasan keputusan lengkap:
`docs/decisions/ADR-007-hapus-total-powershell-v2.md`.

**Artefak yang naik format:**
- Kartu identitas project `project.lintas.psd1` (wadah lama) → `project.lintas.jsonc`
  (isi/angka skemanya tetap versi 1 — yang berubah **wadah berkas**-nya, bukan formatnya).
- `.github/scripts/setup-branch-protection.ps1` (kalau ada di project-mu) → pengganti resmi
  `npx lintasai protect-main` (default SIMULASI; tambah `--apply` untuk sungguhan). Skrip lamanya
  boleh dihapus setelah pengganti terbukti jalan.
- Folder `.claude-kit.backup-*` yang berisi `.ps1` lama = **arsip normal** — biarkan saja,
  **JANGAN disalin balik** ke `.claude-kit/`.

**Larangan penting:** JANGAN update ke v2.0.0 memakai updater PowerShell lama
(`.\.claude-kit\update-kit.ps1`) — kit v2 tidak lagi membawa berkas yang updater lama harapkan.
(Satu stub penyelamat `setup-pola-b.ps1` sengaja disisakan di kit sampai v3 supaya updater lama
yang terlanjur jalan tidak tersangkut setengah-jadi — tapi itu jaring darurat, bukan jalur resmi.)
Jalur resmi: `npx lintasai@latest update` — atau `npm create lintasai@latest` kalau tak punya akses repo.

**Langkah migrasi (urut):**
1. Update kit lewat jalur resmi: `npx lintasai@latest update` — cadangan `.claude-kit.backup-<cap-waktu>`
   dibuat otomatis sebelum ada yang diubah.
2. Kalau project-mu masih punya kartu lama `project.lintas.psd1` → **SIMULASI dulu** (jalan
   pura-pura, tidak mengubah apa pun): `npx lintasai migrate-project-card`
3. Tinjau hasil simulasi → kalau cocok, terapkan: `npx lintasai migrate-project-card --apply`
   (migrator idempoten + membuat cadangan ber-cap-waktu + mencatat ke buku-besar
   `.migration-state.json` supaya tak jalan dobel).
4. (Opsional) Kalau dulu memasang kunci-gabung branch via skrip PS: `npx lintasai protect-main`
   (SIMULASI) → tinjau → `npx lintasai protect-main --apply`.
5. Verifikasi: `npx lintasai doctor` → hijau + laporan migrasi **"Termigrasi X dari X artefak
   yang ada"** (tidak ada yang tertinggal).

**Cara balik (rollback) kalau ada masalah:** pulihkan cadangan — rename folder
`.claude-kit.backup-<cap-waktu>` kembali menjadi `.claude-kit` — lalu `npm install lintasai@1.62`
(versi stabil terakhir sebelum kereta v2 di npm; catatan: v1.63.0 = rilis jembatan yang TIDAK
pernah diterbitkan ke npm, jadi `@1.63` akan gagal "No matching version").
