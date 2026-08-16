---
nama: supabase-prisma
deskripsi: Supabase/Postgres+Prisma kelas industri — RLS multi-penyewa, migrasi aman, transaksi & antrean DB, anti bocor kolom.
divisi: stack
pemicu: [supabase, prisma, drizzle, rls-policy, orm]
rawan_keamanan: true
menggantikan: []
---

# Skill: Supabase / Postgres + Prisma — database kelas industri

> `rawan_keamanan: true` → skill ini **sangat disarankan dibuka sebelum edit pertama** skema/RLS/migrasi — kesalahan di sini = kebocoran data lintas-penyewa yang **senyap** (tak kelihatan di layar).
>
> **Inti:** RLS (Row Level Security = aturan di level database yang menentukan siapa boleh baca/tulis baris mana) WAJIB aktif langsung di database, bukan cuma disaring di kode aplikasi; kunci `service_role` membuka akses ke SEMUA data tanpa dibatasi RLS — simpan rapat di server, jangan sampai ke browser.

Butir **🔒 HASIL** = hasil keamanan/integritas yang tak boleh gagal apa pun caranya. Prisma = penghubung kode↔database (Postgres/MySQL/SQLite), dipakai LUAS, dan punya jebakan kelas-produksi yang sering bikin **HILANG DATA** / **hasil diam-diam salah**. **WAJIB cek versi dulu** (`npx prisma --version`) — perilaku Prisma 5/6 beda dari 4; verifikasi dokumentasi resmi versi TERPASANG.
>
> ⚠️ **"Universal" di sini = jebakan Prisma-nya, BUKAN sintaks SQL-nya.** Butir khusus satu mesin DB diberi label **[Postgres saja]** — jangan disalin ke DB lain (migrasi ditolak, gagalnya muncul di CI). Cek `provider` di `prisma/schema.prisma` dulu.

---

## 1. Kontrak (yang HARUS benar — 🔒 HASIL)

- 🔒 **HASIL — RLS (Row Level Security) WAJIB ON di tiap tabel yang diakses dari klien** (default-deny) — JANGAN andalkan filter di kode app saja (cegah IDOR = *Insecure Direct Object Reference*, ganti ID untuk curi data orang lain).
- 🔒 **HASIL — Pemisahan kunci:** `anon` key boleh ke browser (dilindungi RLS); `service_role` key = **server-only, BYPASS RLS** — jangan pernah ke browser/repo.
- 🔒 **HASIL — Sinyal project INI:** grep `service_role` di kode sisi-browser / `NEXT_PUBLIC_` (bocor = bypass RLS total). **Default-bahaya:** RLS di-ON **tapi BELUM ada policy = deny-total** (semua akses ditolak diam-diam) → tulis policy segera setelah enable.
- 🔒 **HASIL — Sesi diverifikasi server-side**; jangan percaya user-id dari klien.
- 🔒 **HASIL — Migrasi = file terversion** (`supabase migration` / migrasi Prisma), bukan edit lewat GUI; constraint (NOT NULL/UNIQUE/FK/CHECK) di level DB.
- 🔒 **HASIL — Prisma: `deleteMany()` / `updateMany()` TANPA `where`** = menghapus/mengubah SELURUH baris tabel. Wajib selalu sertakan `where`; polos mengosongkan tabel diam-diam.
- 🔒 **HASIL — Prisma: `prisma migrate dev` bisa MERESET database** (buang semua data) saat mendeteksi "drift" (struktur DB beda dari catatan migrasi). JANGAN pernah di DB bersama/staging/produksi — di sana pakai `prisma migrate deploy`. `migrate dev` hanya untuk DB lokal pribadi.
- 🔒 **HASIL — Prisma: ubah kolom jadi `NOT NULL` atau rename dalam 1 migrasi** = mengunci tabel / membuang data. Pakai pola tambah-dulu-hapus-belakangan (expand-then-contract): tambah kolom baru → isi data (backfill) → baru wajibkan/hapus yang lama.
- 🔒 **HASIL — Prisma: mengedit manual file migrasi yang SUDAH dijalankan** = merusak deploy berikutnya (`P3006 checksum mismatch` di tiap lingkungan tempat versi asli sudah jalan). Buat migrasi BARU, jangan sunting yang lama.
- 🙂 Non-Programmer: RLS mengatur akses ke database langsung per-baris data, bukan cuma disaring di aplikasi; kunci `service_role` membuka akses ke SEMUA data tanpa dibatasi RLS — simpan rapat di server, jangan sampai ke browser. Tiga perintah Prisma paling berbahaya: (1) hapus/ubah-banyak tanpa syarat = menghapus/mengubah SELURUH baris tabel sekaligus; (2) "migrate dev" bisa mengosongkan seluruh database kalau dipakai di tempat salah; (3) ubah-struktur sekaligus bisa membuang data yang sudah ada. AI WAJIB berhenti + minta konfirmasi sebelum ketiganya.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

Detail 9 butir → baca `skills/supabase-prisma/rujukan/cara-rakit.md` (kapan: sebelum menulis policy RLS / index / query / migrasi Prisma). Ringkasnya:
- Butir 1-2: kecepatan RLS — policy `(SELECT auth.uid())` dihitung sekali per query · index kolom WHERE/JOIN/ORDER + `EXPLAIN ANALYZE`.
- Butir 3-4 (🔒 HASIL di dalamnya): ambil kolom seperlunya (`.select('id, ...')`, BUKAN `.select('*')`) · [Postgres saja] index tabel besar = `CREATE INDEX CONCURRENTLY` via `migrate dev --create-only` (Prisma tak bisa otomatis).
- Butir 5-7: 5 jebakan "hasil diam-diam salah" (`updateMany` balikkan count · `@updatedAt` basi · soft-delete vs `findUniqueOrThrow` · timeout `$transaction` 5 detik · N+1/DTO) · kode error `P2002`/`P2025`/`P2003` · serverless `connection_limit=1` + singleton `PrismaClient`.
- Butir 8-9: strategi ID (`cuid`/`uuid`/`autoincrement`; nomor dokumen berurut TERPISAH dari `id` internal) · tabel anti-pola yang langsung di-flag.

---

## 3. Powerful — pola siap-adaptasi kelas-produksi (🧪 CONTOH KASUS)

Detail pindah ke 2 rujukan (baca on-demand, jangan tebak polanya dari ingatan):
- **7 pola ber-kode** → `skills/supabase-prisma/rujukan/pola-produksi.md` (kapan: merancang tulis-data/transaksi/paginasi/antrian/tes RLS) — upsert idempoten `ON CONFLICT`+`upsert()` · transaksi multi-tabel Supabase murni via `.rpc()` · paginasi cursor/keyset ber-tiebreaker · antrian `FOR UPDATE SKIP LOCKED` (dan larangannya untuk saldo/stok) · kunci multi-baris anti-deadlock · uji RLS pgTAP · type-safety `gen types`.
- **Galeri 12 pasangan ❌ SALAH → ✅ BENAR lainnya** (kunci `anon`/`service_role` · sesi server-side · constraint DB · `deleteMany` ber-`where` · `migrate dev`/`deploy` · expand-then-contract · jangan edit migrasi lama · select kolom · `CONCURRENTLY` · `.rpc()` · tiebreaker paginasi · `SKIP LOCKED`) → `skills/supabase-prisma/rujukan/contoh-salah-benar.md` (kapan: sebelum menulis kode nyata dari kontrak §1 / pola di atas).

### Contoh pola ❌→✅ paling kritis (ambil POLANYA, jangan salin mentah)

🧪 **RLS ON default-deny + policy segera (§1 butir 1 & 3)**:

❌ **SALAH** (RLS belum ON — semua baris terbaca lewat `anon` key):
```sql
CREATE TABLE pesanan (id uuid PRIMARY KEY, user_id uuid NOT NULL, total numeric(18,2));
-- tanpa ENABLE ROW LEVEL SECURITY: siapa pun ber-anon key baca SEMUA baris (bocor lintas-penyewa, senyap)
```
✅ **BENAR** (ON + policy SEGERA — ON tanpa policy = deny-total diam-diam):
```sql
ALTER TABLE pesanan ENABLE ROW LEVEL SECURITY;      -- default-deny mulai di sini
CREATE POLICY pesanan_milik_sendiri ON pesanan
  FOR SELECT USING ((SELECT auth.uid()) = user_id); -- dibungkus SELECT = dihitung 1x per query (rujukan/cara-rakit.md butir 1)
```

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai")

- [ ] RLS ON default-deny di tiap tabel yang diakses klien; policy pakai `(SELECT auth.uid())` (bukan telanjang) di tabel besar?
- [ ] `service_role` key tak pernah ada di kode sisi-browser/repo; sesi diverifikasi server-side?
- [ ] Tiap `deleteMany()`/`updateMany()` punya `where`? Tak ada `migrate dev` di DB bersama/staging/produksi?
- [ ] Migrasi struktur (NOT NULL/rename) pakai pola expand-then-contract, bukan sekali-jalan?
- [ ] File migrasi yang sudah dijalankan **tak** diedit manual (migrasi baru dibuat, bukan disunting)?
- [ ] Index tabel besar [Postgres] pakai `CREATE INDEX CONCURRENTLY` via `migrate dev --create-only`, bukan migrasi biasa?
- [ ] Hasil `updateMany`/`deleteMany` tak dipakai sebagai data baris; `@updatedAt` di-set manual saat `updateMany`?
- [ ] Soft-delete pakai `findFirstOrThrow({ where: { deletedAt: null } })`, bukan `findUniqueOrThrow`?
- [ ] `$transaction` tak membungkus panggilan eksternal (email/HTTP)?
- [ ] Query Supabase pilih kolom seperlunya (`.select('id, ...')`, bukan `.select('*')`); entitas Prisma dipetakan ke DTO sebelum dikirim ke API (tak bocor field internal)?
- [ ] Strategi ID sesuai kebutuhan (`cuid`/`uuid`/`autoincrement`); nomor dokumen berurut TERPISAH dari `id` internal?
- [ ] Upsert pakai kolom UNIQUE/PK di `where`; `ON CONFLICT` menarget constraint NYATA?
- [ ] Paginasi cursor punya tiebreaker unik (`id`) di `orderBy`?
- [ ] Antrian kerja pakai `FOR UPDATE SKIP LOCKED` di tabel DB (bukan array in-memory); `SKIP LOCKED` **tak** dipakai untuk hitung saldo/stok?
- [ ] Kunci multi-baris (transfer) selalu ber-`ORDER BY` urutan sama (anti-deadlock)?
- [ ] Minimal 1 tes pgTAP per tabel sensitif (RLS terbukti menolak lewat CI)?
- [ ] Serverless: `connection_limit=1` + `PrismaClient` singleton?

> **Verifikasi WAJIB cuma-baca:** membuktikan = baca kode + `EXPLAIN ANALYZE`/`supabase test db` (cuma-periksa) + menalar. JANGAN jalankan SQL yang mengubah data live saat verifikasi.

---

## 5. Definition-of-Done (kapan skill Supabase/Prisma dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** RLS ON default-deny + pemisahan kunci `anon`/`service_role` + sesi server-side + migrasi terversion + 4 operasi rawan-hilang-data Prisma dijaga.
- [ ] **Edge case** ditangani: tabel kosong/RLS menolak semua, migrasi drift di DB bersama, index build di tabel besar, race antar-worker rebutan job, deadlock transfer 2-baris, paginasi saat data baru masuk di tengah.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Minimal 1 tes pgTAP per tabel sensitif lulus (`supabase test db`); types di-regen (`supabase gen types` / Prisma) setelah skema berubah.
- [ ] **Gerbang Pra-Rilis LULUS** — "selesai" = terbukti (tes RLS dijalankan + hasil dilihat), bukan "sudah kutulis".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Struktur DB umum / migrasi aman generik / index** (di luar Supabase/Prisma spesifik) → `skills/database/SKILL.md`.
- 📐 **Sebelum ubah data BERISIKO** (migrasi destruktif / hapus-ubah massal): pastikan cara-balik + jelaskan ke client bahasa awam → `skills/jaring-data/SKILL.md`.
- 📐 **Cheat-sheet Postgres cepat** (tipe index GIN/BRIN/partial/covering + urutan kolom · 3 query audit: FK tanpa index, query lambat, bloat · tipe data · `statement_timeout` per-role `authenticated`/`anon` Supabase) → `templates/STACK_GUIDE.md` §5.
- 📐 **Kontrak API / status code / amplop respons** yang membungkus query ini → `skills/backend/SKILL.md`.
- 📐 **Login/sesi/RBAC** yang menentukan `auth.uid()`/identitas server-side → `skills/auth/SKILL.md`.
- 📐 **Anti bayar-dobel / idempotency-key** (pola upsert idempoten dipakai juga di sana) → `skills/pembayaran/SKILL.md`.
- 📐 **Antrian job/worker lanjutan** (retry/backoff di atas `FOR UPDATE SKIP LOCKED`) → `skills/background-job/SKILL.md`.
- 📐 **Constraint DB untuk idempotensi di stack lain** (Python/Django) → `skills/python/SKILL.md`.
- 📐 **Kunci stok / `select_for_update()` biasa (MENUNGGU, bukan `SKIP LOCKED`)** — pola locking baris DB (lihat CONTOH KASUS di `skills/supabase-prisma/rujukan/pola-produksi.md`).
- 🗃️ **LATAR — kredit sumber:** ECC `postgres-patterns` + `prisma-patterns` + `mysql-patterns` + `backend-patterns` + agen `database-reviewer`, MIT © Affaan Mustafa (ditulis-ulang non-programmer + dinetralkan untuk project apa pun, dialihkan ke Postgres/Django; pola transaksi `.rpc()` diserap dari `backend-patterns`).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** data multi-penyewa (multi-tenant) di Postgres/Supabase + integritas tulisan (saldo, stok, dokumen berurut). **Mode-gagal khas:** RLS lupa di-ON (kebocoran lintas-penyewa senyap) · `service_role` bocor ke browser (bypass total) · `deleteMany`/`migrate dev` di lingkungan salah (hilang data) · index build mengunci tabel produksi · worker rebutan job yang sama · `SKIP LOCKED` dipakai keliru untuk hitung saldo (hasil diam-diam salah) · deadlock transfer 2-baris. **Mitigasi:** RLS default-deny + tes pgTAP + pemisahan kunci + `migrate deploy` di lingkungan bersama + `CREATE INDEX CONCURRENTLY` + `FOR UPDATE SKIP LOCKED` khusus antrian + urutan kunci konsisten.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** keamanan & integritas database Supabase/Prisma; **tidak menggantikan** review keamanan mendalam untuk skema baru berisiko tinggi maupun load-testing migrasi besar. Perilaku API Prisma berubah antar-versi (5/6 vs 4).

🙂 **Non-Programmer:** database yang "kelihatan jalan" belum tentu **aman** — RLS yang lupa dinyalakan atau kunci `service_role` yang bocor ke browser sama sekali tak kelihatan sampai ada yang mengeksploitasinya. Perintah Prisma tertentu (`deleteMany`/`migrate dev`/edit migrasi lama) bisa menghapus data tanpa peringatan kalau dipakai di tempat yang salah. Skill ini memasang pagar untuk keduanya: kunci akses per-baris di database + jeda wajib-konfirmasi sebelum operasi berbahaya.
