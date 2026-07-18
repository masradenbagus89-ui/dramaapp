# ADR-007: v2.0.0 — Hapus TOTAL PowerShell dari kit (kit 100% Node)

> Menuntaskan arah ADR-003 → ADR-004 → ADR-005. ADR-005 sudah membuat **jalur eksekusi tim 100% Node**,
> tapi berkas PowerShell (~70 berkas) tetap **disimpan sebagai cadangan** — ban serep yang tak pernah
> dipakai tapi wajib dirawat. ADR ini **mencabut keputusan "simpan cadangan PS"** itu: v2.0.0 (rilis
> BREAKING) **menghapus TOTAL** seluruh berkas PowerShell dari kit. Rencana eksekusi bertahap ber-gerbang
> ada di [`docs/plans/RENCANA_V2_HAPUS_POWERSHELL.md`](../plans/RENCANA_V2_HAPUS_POWERSHELL.md).

---

## Metadata

- **Tanggal:** 2026-07-10
- **Status:** **Accepted** — owner menyetujui 2026-07-09 (popup persetujuan rencana; D1–D6 = rekomendasi [1] semua). Eksekusi **owner-gated per sub-fase**: commit/rilis = keputusan owner; JANGAN push/tag/publish tanpa aba-aba.
- **Author:** Tim lintasAI (rancangan AI-assisted; berbasis pindai 7-dimensi + cek-silang 3-lensa 2026-07-09, terverifikasi-di-kit; efek lapangan klien diuji di Fase 4a)
- **Reviewer:** owner

**Men-supersede:**

- **[ADR-003](ADR-003-migrasi-bertahap-powershell-ke-node.md)** — "Strangler Fig / migrasi bertahap PS↔Node berdampingan" + gerbang output-identik PS==Node. Gugur: tak ada lagi sisi PS untuk didampingi/disamakan.
- **[ADR-004](ADR-004-konsolidasi-besar-ke-node.md)** — target "~98% Node, sisakan shim PowerShell permanen". Diganti target 100% Node.
- **[ADR-005](ADR-005-jalur-tim-100-persen-node.md)** — "berkas PowerShell = SIMPAN sebagai cadangan". Dicabut: berkas PS dihapus (arsip cukup dari tag git v1.63.0).

> 📦 ADR-003 s/d ADR-006 hanya ada di **repo GitHub** (tidak ikut paket npm ke client — riwayat era migrasi).

---

## Context

- **Problem statement:** Sejak ADR-005 jalur yang dipakai tim/klien **sudah 100% Node**. Berkas PowerShell
  (66 `.ps1` + 4 `.psd1`, ±19.768 baris) tinggal **ban serep** — tak pernah dieksekusi di alur normal, tapi
  tetap wajib dirawat, diuji (Pester + PSScriptAnalyzer di CI), dan **ikut dikirim ke `.claude-kit/` klien**.
  Ia juga menjadi sumber **halusinasi AI** ("cadangan PS masih ada") karena komentar/dokumen kit menyebutnya
  masih hidup, padahal tak dipakai.
- **Constraints:**
  - Rilis **BREAKING** (perubahan tak-kompatibel-mundur) → wajib naik versi **BESAR** (2.0.0).
  - Lingkungan pengembangan owner = Windows PowerShell 5.1 (terminal), Node 24.
  - Penghapusan **bukan sekadar "delete file"**: ada penjaga tes yang harus diport dulu (Pester → `node:test`),
    1 skrip klien tanpa padanan Node (pengunci branch), 3 jebakan senyap (robot fakta membaca `setup-pola-b.ps1`;
    `kit-files.psd1` = SSOT yang dibaca Node; `doctor` v2 bisa salah-vonis kit v1 klien "rusak"), dan CI + gerbang
    terbit npm yang bisa mengunci dirinya sendiri bila tak diubah di kereta yang sama.
- **Asumsi:** PowerShell tetap ada di mesin owner/klien sebagai **terminal Windows** — kit tidak menghapus PS
  dari mesin siapa pun, hanya dari **isi kit**. Dokumen yang menyebut PS sebagai *terminal tempat mengetik npm*
  tetap sah.

---

## Decision

**Hapus TOTAL PowerShell dari kit di v2.0.0.** Kit menjadi **100% Node**. Konkretnya (D1–D6, owner 2026-07-09,
semua rekomendasi [1]):

1. **D1** — `lib/kit-files.psd1` dikonversi ke `lib/kit-files.json` (SSOT). Pembaca `lib/kit-files.mjs` jadi
   **dua-format** (JSON dulu → fallback parser `.psd1`) agar doctor v2 bisa membaca kit klien era-v1
   (jendela lintas-versi) → **INFO ajakan update**, BUKAN vonis "rusak".
2. **D2** — Lintas-platform (mac/linux) **DITUNDA ke v2.1** — satu rilis breaking = satu tema.
3. **D3** — Selesaikan wiring `--repos` papan-repo (mesin sudah ada).
4. **D4** — Jalur cadangan PS di `reparse-guard.mjs` (keamanan rollback/uninstall) → **Node murni,
   fail-closed** (batal-aman bila jalur Node gagal fatal — keamanan tidak berkurang).
5. **D5** — Rilis **jembatan v1.63.0** (deprecate-dulu) sebelum v2.0.0 (menambal updater PS lama klien +
   membawa semua PORT-DULU). *(Catatan: owner memilih **straight-to-v2** saat eksekusi — v1.63.0 disiapkan
   di repo tapi TIDAK diterbitkan; semua isinya ikut kereta v2.0.0.)*
6. **D6** — **Satu-satunya pengecualian:** stub mini `setup-pola-b.ps1` (~30 baris, hanya
   `exec node setup-pola-b.mjs --force`) DIPERTAHANKAN sampai v3 supaya updater PowerShell lama klien
   (vintage mana pun) tetap tuntas. Dijaga tes: tarball WAJIB 0 berkas `.ps*` **KECUALI** tepat 1 stub ini.

**Definisi "Selesai"** (ringkas): 0 berkas `.ps1`/`.psm1`/`.psd1` (kecuali stub D6); 10 penjaga kategori-(b)
hidup di `node:test`; `npx lintasai protect-main` menggantikan `setup-branch-protection.ps1`; migrator kartu
`.psd1`→`.jsonc`; doctor era-v1 = INFO (bukan error); CI hijau tanpa job PS; `UPGRADING.md` v2.0.0 +
CHANGELOG `[BREAKING]`; simulasi E2E klien hijau sebelum tag.

---

## Alternatif yang Ditolak

- **Pertahankan PowerShell sebagai cadangan permanen (status-quo ADR-005):** ditolak — biaya rawat + sumber
  halusinasi AI + "kit bebas PS" jadi tidak jujur; ban serep tak pernah dipakai sejak jalur 100% Node.
- **Konversi `kit-files.psd1` → `.psd1` tetap (bukan JSON):** ditolak — janggal ("kit bebas PS" bohong) +
  jebakan doctor lintas-versi tetap harus ditangani; JSON.parse menggantikan parser 240 baris.
- **Murni 0 `.ps1` tanpa stub D6:** ditolak sadar — klien non-programmer yang refleks memakai updater PS lama
  jatuh setengah-jadi; biaya stub ~30 baris jauh lebih murah daripada risiko itu.
- **Big-bang (hapus semua di 1 commit):** ditolak — rilis raksasa sulit diaudit + gerbang antar-commit mustahil
  hijau bila urutan salah (rel pengaman PS harus dilepas SEBELUM konversi/hapus).

---

## Konsekuensi

### Pros

- Kit **benar-benar** 100% Node — janji "bebas PowerShell" jadi jujur; sumber halusinasi AI hilang.
- Tak ada lagi Pester/PSScriptAnalyzer/PowerShell yang dirawat/diuji/dikirim ke klien.
- Paket npm mengecil; tarball dijaga permanen "0 `.ps*`" (kecuali stub D6).

### Cons

- Rilis BREAKING → klien wajib pindah lewat `npx lintasai update` / `npm create lintasai@latest` (bukan updater PS lama).
- Satu pengecualian (stub D6) mengurangi kemurnian "angka nol" sampai v3 — kompromi sadar demi keselamatan klien.

### Risk

- **Doctor v2 salah-vonis kit v1 klien "rusak" di hari pertama tayang** → dimitigasi pembaca dua-format +
  deteksi era-v1 → INFO ajakan update; kasus uji khusus di Fase 4a.
- **Artefak PS yatim milik klien** (kartu `.psd1`, `.github/scripts/*.ps1`, segel manifest format lama) →
  migrator + deteksi doctor + pesan lunak; entri `UPGRADING.md`.
- **Klien refleks pakai updater PS lama** → stub D6 + larangan tegas di `UPGRADING.md`.

---

## Implementation Notes

- **Rencana:** [`docs/plans/RENCANA_V2_HAPUS_POWERSHELL.md`](../plans/RENCANA_V2_HAPUS_POWERSHELL.md) (Fase 0–4, tiap sub-fase ber-gerbang).
- **Rollback:** tag `v1.63.0`/`v1.62.0` tetap ada (`npm install lintasai@1.63`); tag git = arsip lengkap terakhir era PS.
- **Migration plan (klien):** entri v1.x → v2.0.0 di `UPGRADING.md` (langkah SIMULASI-dulu + verifikasi doctor + rollback 1-baris).

---

## Riwayat

| Tanggal     | Status            | Oleh         | Catatan                                                       |
|-------------|-------------------|--------------|---------------------------------------------------------------|
| 2026-07-09  | Accepted          | owner        | Persetujuan rencana v2.0.0 (popup); D1–D6 = rekomendasi [1]   |
| 2026-07-10  | Accepted          | Tim lintasAI | ADR ditulis saat eksekusi Fase 3f (supersede ADR-003/004/005) |
