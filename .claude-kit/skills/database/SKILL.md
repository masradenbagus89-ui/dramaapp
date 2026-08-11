---
nama: database
deskripsi: Struktur data & migrasi aman kelas industri — constraint di level DB, migrasi ter-version & reversible, RLS multi-penyewa, parameterized query, index kolom panas.
divisi: database
pemicu: [migrasi, migration, skema, schema, tabel-baru, kolom-baru, prisma, supabase, rls, database, basis-data, index-database, constraint]
rawan_keamanan: true
menggantikan: [skema-database]
---

# Skill: Database — struktur data & migrasi aman (kelas industri)

> **Kapan skill ini aktif:** prompt menyentuh "tambah/ubah tabel/kolom, migrasi, skema, Prisma, RLS, index, basis data". Dispatcher `rak-pemicu` menyalakannya otomatis. `rawan_keamanan: true` → **sangat disarankan dibuka sebelum edit pertama** berkas skema/migrasi, karena salah di sini = **data hilang** atau **data penyewa lain bocor** secara **senyap** (tak kelihatan sampai sudah terlambat). Ditandai 🔒 di Petunjuk Rak.
>
> 🙂 **Analogi:** database = **lemari arsip kantor**. Migrasi (perubahan struktur lemari) = **memindah/menambah laci** — kalau serampangan, dokumen lama bisa robek/hilang. **RLS** (*Row Level Security* = kunci per-laci) = tiap cabang toko cuma bisa buka laci miliknya sendiri, dijaga oleh lemarinya — bukan cuma "janji" petugas untuk tidak mengintip.

Skill ini **advisory** (§4.17): otak native memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** menyangkut data yang tak boleh hilang/bocor = tak boleh gagal. Cek perilaku **versi terpasang** (Postgres/Prisma/Supabase) sebelum menulis migrasi (§8.2 A3).

---

## 1. Kontrak (yang HARUS benar — sebelum jalankan migrasi apa pun)

- 🔒 **HASIL:**
  - **Perubahan struktur = ter-version + reversible.** Tiap perubahan skema = file migrasi yang di-commit ke repo (bukan diedit lewat GUI panel) + punya **rollback tertulis** (cara membalikkan). Idempotent (`IF NOT EXISTS`) supaya aman kalau dijalankan ulang.
  - **JANGAN migrasi destruktif (drop/rename kolom, `NOT NULL` baru) langsung di produksi tanpa snapshot** — snapshot/backup DULU. Kolom yang di-drop = data hilang permanen.
  - **Data multi-penyewa (tenant) → aturan akses di level DB (RLS)**, bukan cuma `WHERE tenant_id=` di kode. Satu query lupa filter = bocor senyap.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 🔒 **HASIL — Constraint di level DB, bukan cuma di aplikasi.** `NOT NULL` · `UNIQUE` · `FOREIGN KEY` · `CHECK`. Validasi aplikasi bisa dilewati (bug/race/klien lain langsung ke DB); DB adalah **benteng terakhir** integritas data. Contoh: `UNIQUE(email)` mencegah dua akun email sama walau dua request datang berbarengan.
2. 🔒 **HASIL — Perubahan yang memutus klien = zero-downtime (expand-then-contract).** JANGAN rename/hapus kolom langsung. Urutan aman: **(1) tambah-baru** (kolom baru, nullable) → **(2) migrasi klien** (kode tulis ke dua-duanya, backfill data lama) → **(3) hapus-lama** (setelah tak ada yang pakai). Ubah struktur tabel di Supabase/Postgres → muat `templates/SAFE_DATABASE_OPERATIONS.md` (tabel 🟢/🟡/🔴 + runbook rollback).
3. 🔒 **HASIL — RLS untuk data multi-penyewa.** Aturan "siapa boleh baca/tulis BARIS mana" dipasang di DB (Postgres Row Level Security). Jangan andalkan filter di kode aplikasi saja — satu endpoint yang lupa `WHERE tenant_id=` = data penyewa lain bocor, dan itu **tak kelihatan** sampai ada yang mengeluh. → pola RLS lengkap: `skills/supabase-prisma/SKILL.md`.
4. 📐 **Parameterized query / prepared statement WAJIB.** DILARANG merangkai SQL lewat string-concat input user (cegah **SQL injection** = penyerang menyelipkan perintah SQL berbahaya lewat kolom input). Pakai query builder / ORM (*Object-Relational Mapping* = pustaka yang menerjemahkan objek kode ↔ tabel DB) yang mem-parameter otomatis, atau placeholder (`$1`, `?`).
5. 📐 **Multi-statement → transaksi** (semua-jadi atau semua-batal). Migrasi data multi-baris → **dry-run** (uji-jalan / SIMULASI tanpa efek nyata) **di staging** dengan data mirip prod dulu; reversible / punya rollback tertulis. Tabel besar → pola online (tambah nullable → backfill bertahap → pasang constraint) supaya tak mengunci tabel lama-lama.
6. 📐 **Index kolom yang dipakai `WHERE`/`JOIN`/`ORDER BY`** (kardinalitas tinggi = nilai banyak variasi); verifikasi dengan `EXPLAIN`. Tanpa index, query lambat diam-diam saat data membesar. Jangan over-index (tiap index memperlambat tulis).
7. 📐 **Versioned payload:** saat ubah bentuk data JSON tersimpan → tandai `v1`/`v2` + kode bisa baca versi lama (fallback). **Naming konsisten**, kolom waktu suffix `_at`, timezone-aware. **Query kompleks yang muncul >2 tempat → pusatkan** di view/function/repository (DRY — jangan duplikasi logika query di banyak berkas).
8. 📐 **DB role tiering (hak login berjenjang):** sebelum `CREATE/ALTER/DROP/TRUNCATE`, cek tier login. Login **junior = DML-only** (boleh `SELECT/INSERT/UPDATE/DELETE`, TIDAK ubah struktur) → JANGAN paksa DDL; jelaskan "ini hak senior, bukan error" + arahkan ke PR/backend senior. Ragu = anggap junior (default-deny). Error `permission denied`/`must be owner` → terjemahkan ke bahasa awam.

🙂 **Non-Programmer:** dua kesalahan database yang paling mahal justru yang **tak berbunyi**: (a) migrasi yang menghapus/menimpa kolom sehingga data lama lenyap tanpa backup, dan (b) aturan akses yang cuma "dijanjikan di kode" sehingga suatu hari satu halaman lupa menyaring dan data pelanggan cabang lain ikut tampil. Skill ini memaksa backup-dulu + kunci di level lemari (RLS).

---

## 3. Powerful — expand-then-contract (urutan migrasi aman)

📐 CARA BAKU: rename kolom `nama` → `nama_lengkap` TANPA downtime, urutannya:

```
1. ALTER TABLE user ADD COLUMN nama_lengkap text;         -- tambah baru (nullable) — belum ganggu klien
2. (kode) tulis ke KEDUA kolom + backfill: UPDATE user SET nama_lengkap = nama WHERE nama_lengkap IS NULL;
3. (rilis) semua kode baca dari nama_lengkap
4. ALTER TABLE user DROP COLUMN nama;                     -- hapus lama — HANYA setelah nol pemakai + snapshot
```

- 🔒 HASIL: langkah 4 (destruktif) jalan **hanya setelah** langkah 1-3 terbukti aman + snapshot diambil. Melompat langsung ke rename = downtime + risiko data hilang.
- 💡 SARAN: migrasi destruktif prod = **aksi merusak** → tampilkan rencana + rollback + minta konfirmasi verbatim (§8.2 Aturan 5). Jangan auto-jalankan `prisma migrate deploy` ke prod tanpa konfirmasi.

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

- [ ] Migrasi = **file ter-commit** (bukan edit GUI) + **idempotent** + punya **rollback tertulis**?
- [ ] Migrasi destruktif prod → **snapshot/backup diambil dulu** + konfirmasi verbatim?
- [ ] Constraint penting (`NOT NULL`/`UNIQUE`/`FK`/`CHECK`) di **level DB**, bukan cuma aplikasi?
- [ ] Data multi-penyewa → **RLS aktif** (uji: user tenant A coba baca baris tenant B → ditolak DB)?
- [ ] Semua query **parameterized** (tak ada string-concat SQL)?
- [ ] Kolom `WHERE`/`JOIN`/`ORDER BY` panas **ter-index** (cek `EXPLAIN`)?
- [ ] Perubahan yang memutus klien pakai **expand-then-contract** (bukan rename/drop langsung)?

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan = baca skema/migrasi + `Grep` + menalar. Klaim yang cuma bisa diuji dengan mengubah data (mis. RLS benar-benar memblokir) → **minta owner jalankan di staging**, JANGAN jalankan `INSERT/UPDATE/DELETE/DROP` di DB live.

---

## 5. Definition-of-Done (kapan skill database dianggap benar-selesai)

- [ ] **Kontrak (§1) jelas** — reversible + snapshot-sebelum-destruktif + RLS untuk multi-tenant.
- [ ] Migrasi ter-version, idempotent, di-dry-run di staging, punya rollback.
- [ ] **Edge case** ditangani: migrasi dijalankan ulang, tabel besar (lock), data lama tak sesuai constraint baru, dua tenant.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Ubah struktur tabel → **`templates/SAFE_DATABASE_OPERATIONS.md` dibuka**; multi-tenant → **rak RLS dibuka** (`skills/supabase-prisma/SKILL.md`).
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** — migrasi "aman" = terbukti (dry-run + rollback teruji), bukan "kelihatannya jalan".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **RLS multi-penyewa + antrean DB (`FOR UPDATE SKIP LOCKED`) + gotcha transaksi Prisma** → `skills/supabase-prisma/SKILL.md`.
- 📐 **Langkah aman ubah struktur** (expand-then-contract + tabel 🟢/🟡/🔴 + rollback runbook) → `templates/SAFE_DATABASE_OPERATIONS.md`.
- 📐 **Query dari endpoint** (validasi input, parameterized, otorisasi per-resource) → `skills/backend/SKILL.md`. **Login/izin per-baris** → `skills/auth/SKILL.md`.
- 🗃️ **LATAR:** Hak login DB junior/senior (role tiering §9: junior DML-only, DDL di senior) — susun SQL `GRANT`/`REVOKE` per schema sesuai kebutuhan project. Rak asal skill ini hanya di riwayat git (ADR-027).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** integritas & kerahasiaan data (tak hilang, tak bocor lintas-tenant, tak korup). **Penyerang / mode-gagal:** migrasi destruktif tanpa backup (data hilang), RLS bocor (tenant lihat data tenant lain), SQL injection (string-concat), constraint cuma di app (race melewatinya), migrasi mengunci tabel besar (downtime). **Mitigasi:** constraint level-DB + RLS + parameterized + expand-then-contract + snapshot-sebelum-destruktif + dry-run staging + index.
- 🗃️ **LATAR — Batas jujur:** skill menaikkan **lantai** keamanan & keandalan data; **tidak menggantikan** DBA untuk skala besar (sharding, replikasi, tuning lanjutan). Uji RLS & migrasi destruktif **di staging** dulu. Cek perilaku Postgres/Prisma/Supabase **versi terpasang**.
