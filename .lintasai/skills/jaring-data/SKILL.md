---
nama: jaring-data
deskripsi: Jaring-pengaman data untuk client awam — sebelum ubah data/skema berisiko, PASTIKAN ada cara-balik (backup/staging/undo) + jelaskan ke client bahasa awam. Reuse rollback + risk-gate, bukan mekanik baru.
divisi: database
pemicu: [backup, cadangan, restore, pulihkan, jangan-sampai-hilang, data-hilang, balikin, takut-data-rusak, undo]
rawan_keamanan: false
menggantikan: []
---

# Skill: Jaring Data — cara-balik SEBELUM ubah data berisiko (client-facing)

> **Inti:** ketakutan #1 client non-programmer: "AI akan merusak data live-ku?". Skill ini menjawabnya — sebelum aksi berisiko pada data, AI **memastikan ada cara balik** DAN **menjelaskannya bahasa awam**. Ini disiplin **client-facing** (janji cara-balik), BUKAN mekanik migrasi (itu di `skills/database`) atau palang per-perintah (itu `engine/risk-gate.js`).

Butir 🔒 HASIL menyangkut data yang tak boleh hilang = tak boleh gagal. **Reuse-first:** mekanik teknis (expand-then-contract, snapshot, rollback) dirujuk ke skill lain — skill ini menambah **lapisan janji + komunikasi awam**, bukan menyalin caranya.

---

## 1. Kontrak (yang HARUS benar)

- 🔒 **HASIL — tak ada perubahan data BERISIKO tanpa cara-balik + persetujuan.** Sebelum aksi yang bisa menghilangkan/menimpa data (migrasi destruktif, hapus/ubah massal, sentuh tabel produksi): WAJIB ada **(a)** backup/titik-pulih yang terbukti ADA, **ATAU (b)** konfirmasi verbatim client untuk lanjut tanpa itu. Default = TIDAK jalan (aman-dulu).
- 🔒 **HASIL — cara-balik dijelaskan bahasa awam SEBELUM aksi.** Client harus tahu, dalam kalimat polos: apa yang akan berubah · apakah ada backup · cara membalikkan kalau salah. Jangan aksi diam-diam lalu baru lapor kalau rusak.

---

## 2. Cara (📐 CARA BAKU)

1. 📐 **Kenali aksi berisiko-data.** Migrasi drop/rename kolom · `DELETE`/`UPDATE` massal · reset/seed ulang · impor menimpa · `prisma migrate` ke non-lokal. (Palang mesin `risk-gate` kini menanya-konfirmasi otomatis untuk perintah perusak-data umum — `prisma migrate reset`/`db push --accept-data-loss`, `supabase db reset`, `DROP`/`TRUNCATE`/`DROP PARTITION`, `deleteMany`/`updateMany` tanpa `where`, `wrangler …delete`, Django `migrate <app> zero` — tapi itu jaring runtime; skill ini tetap menambah backup + penjelasan awam SEBELUM aksi, bukan menggantinya.)
2. 📐 **Utamakan staging, bukan produksi.** Uji di salinan/staging dengan data mirip dulu (dry-run). Produksi = pilihan terakhir + setelah backup.
3. 🔒 **HASIL — pastikan titik-pulih ADA sebelum aksi.** Snapshot DB / export tabel / commit git untuk perubahan berkas. Untuk berkas yang dipasang kit: rollback tersedia via `npx lintasai rollback` (pratinjau dulu tanpa `--yes`; `engine/rollback.mjs` = aksi merusak, jalan hanya dengan `--yes` setelah konfirmasi). Ubah struktur tabel → langkah aman + runbook rollback di `templates/SAFE_DATABASE_OPERATIONS.md`.
4. 📐 **Jelaskan + minta izin** (popup-rekomendasi untuk aksi besar): "Aku akan [X]. Sudah kubackup [Y]. Kalau salah, cara balik: [Z]. Lanjut?" — bahasa awam, tanpa jargon.
5. 📐 **Sesudah aksi: verifikasi + simpan cara-balik.** Cek data utuh (jumlah baris, sampel). Catat langkah rollback di laporan penutup (`skills/cek-permintaan`) supaya client tahu jaring pengamannya.

🙂 **Non-Programmer:** kamu tak akan kehilangan data diam-diam. Sebelum AI menyentuh data yang berisiko (mis. mengubah struktur tabel atau menghapus banyak baris), ia akan: (1) mencadangkan dulu, (2) kerjakan di salinan kalau bisa, (3) memberitahumu cara mengembalikan kalau ada yang salah — dengan bahasa yang kamu paham. Kalau tak ada cara balik, ia BERHENTI dan tanya kamu.

---

## 3. Powerful — kalimat jaring pengaman + urutan aman

🧪 CONTOH kalimat ke client (adaptasi):
> "Kamu minta hapus produk lama. Ini menghapus **342 baris** permanen. Aku sudah **export tabel produk** ke `backup-produk-2026-07-25.csv` dulu. Kalau ternyata salah, aku bisa **impor balik** dari file itu. Lanjut hapus?"

📐 Urutan aman ubah struktur (rujuk, jangan salin): **tambah-baru → migrasi → hapus-lama** (expand-then-contract) — detail di `skills/database/SKILL.md` §3 + `templates/SAFE_DATABASE_OPERATIONS.md`. Snapshot DULU sebelum langkah destruktif.

---

## 4. Self-verify (sangkal diri SEBELUM aksi data berisiko)

- [ ] Aksi ini bisa menghilangkan/menimpa data? Kalau ya → ada **backup/titik-pulih** yang terbukti ADA?
- [ ] Aku bisa kerjakan di **staging/salinan** dulu (bukan langsung produksi)?
- [ ] Aku sudah **jelaskan bahasa awam** (apa berubah · backup · cara balik) + minta izin untuk aksi besar?
- [ ] Cara rollback **tertulis** (di laporan / commit) supaya bisa diulang?
- [ ] Kalau TAK ada cara balik → aku **BERHENTI + konfirmasi verbatim**, bukan lanjut diam-diam?

> Verifikasi WAJIB cuma-baca: memastikan backup ADA = cek file/snapshot, JANGAN "uji" dengan menghapus data live. Aksi merusak sungguhan → minta owner jalankan / setujui.

---

## 5. Definition-of-Done

- [ ] Aksi berisiko-data teridentifikasi + backup/titik-pulih dipastikan ada (atau konfirmasi verbatim).
- [ ] Dikerjakan di staging bila memungkinkan; produksi hanya setelah backup.
- [ ] Cara-balik dijelaskan bahasa awam SEBELUM aksi + dicatat untuk laporan penutup.
- [ ] Data diverifikasi utuh sesudah aksi.
- [ ] Tak ada aksi merusak data yang jalan tanpa konfirmasi.

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Mekanik migrasi aman** (expand-then-contract, constraint, RLS, index) → `skills/database/SKILL.md`. **RLS + antrean DB + gotcha transaksi Prisma** → `skills/supabase-prisma/SKILL.md`.
- 📐 **Langkah aman ubah struktur + runbook rollback** → `templates/SAFE_DATABASE_OPERATIONS.md`.
- 📐 **Rollback berkas kit** → `npx lintasai rollback` (`engine/rollback.mjs`). **Palang per-perintah merusak** (DROP/DELETE-all/deleteMany) sudah dijaga `engine/risk-gate.js` (skill ini melengkapi dengan backup + penjelasan awam).
- 📐 **Laporan penutup + cara uji sendiri** → `skills/cek-permintaan/SKILL.md`.
- 🗃️ **LATAR — kredit:** kebutuhan "jaring-pengaman data client-facing" disingkap dari review 3-lensa serapan mattpocock/skills (praktik senior yang terlewat) — skill ini menutupnya tanpa duplikat mekanik `database`/`rollback`.

---

## 7. Batas jujur

- 🗃️ **LATAR:** skill ini menjamin **ada cara-balik + client diberitahu** sebelum aksi data berisiko — TIDAK menjamin backup-nya sempurna untuk skala besar (PITR/replikasi = ranah DBA). Yang dicegah: perubahan data yang menghilangkan pekerjaan/data client secara SENYAP tanpa jalan pulang. Mekanik teknisnya tetap di `database`/`rollback` — skill ini lapisan janji + komunikasi awam.
