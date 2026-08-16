# Rujukan supabase-prisma — Cara rakit (detail §2)
> Bagian dari `skills/supabase-prisma` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
> Konteks: detail 9 butir §2 "Cara rakit" SKILL.md inti — nomor butir di sini = target penunjuk "cara-rakit.md butir N" dari berkas lain.

1. 📐 **Optimasi kecepatan RLS di tabel besar — bungkus fungsi auth dengan `SELECT`:** tulis policy `USING ((SELECT auth.uid()) = user_id)`, BUKAN `USING (auth.uid() = user_id)`. Tanpa dibungkus, Postgres memanggil `auth.uid()` ULANG tiap baris yang diperiksa; dengan `(SELECT …)` hasilnya dihitung SEKALI per query lalu dipakai ulang (Postgres menyebutnya "initPlan"/cache) → jauh lebih ringan di tabel ratusan-ribu baris. Ini soal KECEPATAN, bukan keamanan — RLS ON default-deny (SKILL.md §1) tetap wajib lebih dulu.
2. 📐 **Index** kolom yang dipakai WHERE/JOIN/ORDER (B-tree default; GIN untuk JSONB/full-text); cek `EXPLAIN ANALYZE`; hindari N+1 (query berulang dalam loop).
3. 🔒 **HASIL — Ambil kolom seperlunya di query Supabase — `.select('id, nama, status')`, BUKAN `.select('*')`** (postur sama dengan `skills/backend/SKILL.md` §2.4 — jangan lebih longgar di sini)**:** `.select('*')` menarik SEMUA kolom (boros lebar-pita + berisiko ikut mengirim kolom internal/sensitif ke browser). Sebut hanya kolom yang dipakai. (Prinsip sama untuk Prisma dibahas di poin over-fetch di bawah.)
4. 🔒 **HASIL — [Postgres saja] Index di tabel besar = `CREATE INDEX CONCURRENTLY` — dan Prisma TAK bisa membuatnya sendiri.** `CREATE INDEX` biasa mengunci SEMUA operasi tulis ke tabel selama index dibangun (di tabel jutaan baris = app seolah "hang"/timeout). Pakai `CREATE INDEX CONCURRENTLY IF NOT EXISTS ...` — bangun index tanpa mengunci tulis (`IF NOT EXISTS` = idempoten/kebal-diulang, aman diulang). Dua jebakan:
   - **`CONCURRENTLY` TAK BISA jalan di dalam blok transaksi** — dan Prisma membungkus tiap file migrasi dalam satu transaksi, jadi Prisma tak pernah meng-generate `CONCURRENTLY` otomatis.
   - **Jalur benar:** `npx prisma migrate dev --create-only --name add_email_index` (bikin file migrasi KOSONG, jangan langsung apply) → buka file `.sql`-nya → tulis manual `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);` → baru `prisma migrate deploy` di lingkungan bersama. (Tabel keputusan 🟢/🟡/🔴 operasi DB aman ada di `templates/SAFE_DATABASE_OPERATIONS.md` §3.)
   - 🚨 **DB lain:** `CONCURRENTLY` tak dikenal MySQL/MariaDB/SQLite → migrasi DITOLAK (gagal di CI, bukan di laptop). Padanan: **MySQL 8/MariaDB** `ALTER TABLE ... ADD INDEX` sudah online bawaan (`INPLACE`) — tak perlu kata kunci khusus; **PlanetScale** sudah non-blokir lewat *deploy request*; **SQLite** tak relevan.
   - 🙂 Non-Programmer: `CREATE INDEX` biasa mengunci SEMUA operasi tulis ke tabel selama proses pembuatan index berlangsung (aplikasi ikut kena imbas/lambat); `CONCURRENTLY` membangun index TANPA mengunci tulis, jadi aplikasi tetap jalan normal. Prisma tak bisa menulis perintah `CONCURRENTLY` itu sendiri, jadi minta Prisma bikin file migrasi kosong (`--create-only`) lalu ketik SQL-nya manual.
5. 📐 **CARA BAKU — ⚠️ Hasil diam-diam SALAH (data tak rusak, tapi keliru tanpa peringatan) — 5 jebakan Prisma:**
   - **`updateMany` / `deleteMany` mengembalikan JUMLAH (`{ count: n }`), BUKAN datanya.** Kalau butuh barisnya: catat `id` dulu (`findMany` `select: { id: true }`) → `updateMany` → ambil ulang `findMany` untuk `id`-id tadi.
   - **`@updatedAt` TIDAK ikut ter-update saat `updateMany`** (otomatis hanya di `update`/`upsert`). Set manual `updatedAt: new Date()` di `updateMany`, kalau tidak waktunya jadi basi.
   - **Soft-delete + `findUniqueOrThrow` tetap mengembalikan baris yang "sudah dihapus"** (soft-delete = baris masih ada, cuma ditandai). Pakai `findFirstOrThrow({ where: { id, deletedAt: null } })` — `findUniqueOrThrow` tak bisa difilter `deletedAt`.
   - **`$transaction` bentuk interaktif TIMEOUT 5 detik** (default) → error "Transaction already closed". Keluarkan panggilan eksternal (kirim email/HTTP) DARI dalam transaksi; naikkan `timeout` hanya kalau pemrosesan massal memang perlu.
   - **N+1 + over-fetch:** jangan query relasi di dalam loop (1 query per baris) — pakai `include`/`select`. Jangan kembalikan entitas Prisma mentah ke respons API (bocor field internal mis. `passwordHash`) — petakan ke bentuk respons (DTO = *Data Transfer Object*, bentuk data yang sengaja dirapikan sebelum dikirim) eksplisit.
6. 📐 **Kode error umum** (tangkap di boundary, terjemahkan ke pesan awam — jangan tampilkan pesan Prisma mentah ke user): `P2002` data duplikat (langgar unik) · `P2025` tak ketemu · `P2003` referensi tak ada (foreign key).
7. 📐 **Serverless (Vercel/Lambda/Workers):** batasi `connection_limit=1` di `DATABASE_URL` + pooler eksternal (PgBouncer) → cegah "kehabisan koneksi". Buat `PrismaClient` **sekali** (singleton via `globalThis`) — tiap instance buka pool koneksi sendiri; hot-reload bisa bikin puluhan instance menumpuk.
8. 📐 **Pilih strategi ID (primary key) — jangan refleks pakai `uuid()`:** ID = penanda unik tiap baris data. Pilihan default berpengaruh ke kecepatan tulis + apakah jumlah data ikut bocor ke luar.

   | Strategi `@id` | Pakai saat | HINDARI saat |
   |---|---|---|
   | `@default(cuid())` | **default** — aman dipajang di URL, urut-waktu, tak bentrok | butuh ID berurutan rapi (1,2,3) untuk sistem luar · **nomor dokumen yang WAJIB berurut tanpa lompat** (faktur, nota, bukti kas, dokumen pajak) |
   | `@default(uuid())` | wajib tukar data dengan sistem non-Prisma | tabel sering-ditulis — UUID acak "mengacak" index B-tree → tulis melambat |
   | `@default(autoincrement())` | tabel-sambung internal / log audit | ID yang tampil publik — angka berurut membocorkan JUMLAH record (mis. URL `/invoice/1042` = ketahuan baru ada 1042 invoice) |

   🚨 **Jangan "membetulkan" nomor dokumen jadi acak.** Faktur/nota/bukti kas/dokumen pajak sering WAJIB berurut tanpa lompat menurut aturan pembukuan — menggantinya ke `cuid()` = melanggar syarat itu, dan tak bisa dibatalkan setelah dokumen terbit. Pola benar: **pisahkan dua nomor** — `id` internal (`cuid()`, untuk URL & relasi) + `nomorDokumen` berurut terpisah (di-generate dalam transaksi ber-`UNIQUE`, atau dari `SEQUENCE`). Ragu → tanya owner, jangan putuskan sendiri.
   - 🙂 Non-Programmer: ID = nomor identitas tiap data. `cuid` = kode acak-tapi-tertata-waktu, aman dipajang & cepat. `uuid` acak murni bikin proses tulis lebih lambat di tabel yang sering diisi (struktur pencari-cepat DB jadi tak berurut). Nomor urut 1,2,3 gampang ditebak + membocorkan berapa banyak data yang kamu punya — jangan dipakai di alamat halaman (URL). **Tapi** nomor faktur/nota HARUS urut rapi karena aturan pembukuan — pakai dua nomor: kode acak untuk alamat halaman, nomor urut khusus untuk dokumennya.
   - Sadar-versi: cek `npx prisma --version` — Prisma baru mendorong `cuid(2)` (beda dari `cuid()` lama); kalau DB pakai UUIDv7 (urut-waktu), kelemahan fragmentasi B-tree pada `uuid()` sebagian besar hilang.
9. 📐 **Anti-pola (langsung di-flag):**

   | Anti-pola | Perbaikan |
   |---|---|
   | `deleteMany()` / `updateMany()` tanpa `where` | selalu sertakan `where` (cegah hapus/ubah seluruh tabel) |
   | `migrate dev` di staging/produksi | `migrate deploy` di luar DB lokal pribadi |
   | pakai hasil `updateMany`/`deleteMany` sebagai data baris | tangkap `id` dulu, lalu `findMany` ulang |
   | `findUniqueOrThrow` untuk data soft-delete | `findFirstOrThrow({ where: { ..., deletedAt: null } })` |
   | panggilan eksternal di dalam `$transaction` | keluarkan dari transaksi (cegah timeout 5 detik) |
   | kembalikan entitas Prisma mentah ke API | petakan ke bentuk respons (DTO) eksplisit |
