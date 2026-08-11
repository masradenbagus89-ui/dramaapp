---
nama: supabase-prisma
deskripsi: Supabase/Postgres+Prisma kelas industri — RLS multi-penyewa, migrasi aman, transaksi & antrean DB, anti bocor kolom.
divisi: stack
pemicu: [supabase, prisma, drizzle, rls-policy]
rawan_keamanan: true
menggantikan: []
---

# Skill: Supabase / Postgres + Prisma — database kelas industri

> **Kapan skill ini aktif:** **utama = deteksi config** — project punya `@supabase/*`, folder `supabase/`, `@prisma/client`, atau `prisma/schema.prisma` (§4.14 auto-detect). Teks "supabase/prisma/drizzle/rls-policy" jadi pemicu sekunder. `rawan_keamanan: true` → skill ini **sangat disarankan dibuka sebelum edit pertama** skema/RLS/migrasi — kesalahan di sini = kebocoran data lintas-penyewa yang **senyap** (tak kelihatan di layar).
>
> 🙂 **Analogi:** RLS (Row Level Security = aturan level-database siapa boleh baca/tulis baris mana) = **satpam per-baris data** dipasang di pintu gerbang database, bukan cuma di aplikasi; kunci `service_role` = **kunci master** yang membuka semua pintu — simpan rapat di server, jangan sampai ke browser.

Skill ini **advisory** (§4.17): otak native yang memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = hasil keamanan/integritas yang tak boleh gagal apa pun caranya. Prisma = penghubung kode↔database (Postgres/MySQL/SQLite), dipakai LUAS, dan punya jebakan kelas-produksi yang sering bikin **HILANG DATA** / **hasil diam-diam salah**. **WAJIB cek versi dulu** (`npx prisma --version`) — perilaku Prisma 5/6 beda dari 4; verifikasi dokumentasi resmi versi TERPASANG (§8.2 Aturan 1).
>
> ⚠️ **"Universal" di sini = jebakan Prisma-nya, BUKAN sintaks SQL-nya.** Butir khusus satu mesin DB diberi label **[Postgres saja]** — jangan disalin ke DB lain (migrasi ditolak, gagalnya muncul di CI). Cek `provider` di `prisma/schema.prisma` dulu.

---

## 1. Kontrak (yang HARUS benar — 🔒 HASIL)

- 🔒 **HASIL — RLS (Row Level Security) WAJIB ON di tiap tabel yang diakses dari klien** (default-deny) — JANGAN andalkan filter di kode app saja (cegah IDOR = *Insecure Direct Object Reference*, ganti ID untuk curi data orang lain).
- 🔒 **HASIL — Pemisahan kunci:** `anon` key boleh ke browser (dilindungi RLS); `service_role` key = **server-only, BYPASS RLS** — jangan pernah ke browser/repo.
- 🔒 **HASIL — Sesi diverifikasi server-side**; jangan percaya user-id dari klien.
- 🔒 **HASIL — Migrasi = file terversion** (`supabase migration` / migrasi Prisma), bukan edit lewat GUI; constraint (NOT NULL/UNIQUE/FK/CHECK) di level DB.
- 🔒 **HASIL — Prisma: `deleteMany()` / `updateMany()` TANPA `where`** = menghapus/mengubah SELURUH baris tabel. Wajib selalu sertakan `where`; polos mengosongkan tabel diam-diam.
- 🔒 **HASIL — Prisma: `prisma migrate dev` bisa MERESET database** (buang semua data) saat mendeteksi "drift" (struktur DB beda dari catatan migrasi). JANGAN pernah di DB bersama/staging/produksi — di sana pakai `prisma migrate deploy`. `migrate dev` hanya untuk DB lokal pribadi.
- 🔒 **HASIL — Prisma: ubah kolom jadi `NOT NULL` atau rename dalam 1 migrasi** = mengunci tabel / membuang data. Pakai pola tambah-dulu-hapus-belakangan (expand-then-contract, §9): tambah kolom baru → isi data (backfill) → baru wajibkan/hapus yang lama.
- 🔒 **HASIL — Prisma: mengedit manual file migrasi yang SUDAH dijalankan** = merusak deploy berikutnya (`P3006 checksum mismatch` di tiap lingkungan tempat versi asli sudah jalan). Buat migrasi BARU, jangan sunting yang lama.
- 🙂 Non-Programmer: pasang "satpam per-baris data" (RLS) di database, bukan cuma di aplikasi; kunci `service_role` = kunci master yang membuka semua — simpan rapat di server, jangan sampai ke browser. Tiga perintah Prisma paling berbahaya: (1) hapus/ubah-banyak tanpa syarat = Select-All+Delete di Excel (semua baris lenyap); (2) "migrate dev" bisa mengosongkan lemari kalau di tempat salah; (3) ubah-struktur sekaligus bisa membuang isi laci. AI WAJIB berhenti + minta konfirmasi sebelum ketiganya.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **Optimasi kecepatan RLS di tabel besar — bungkus fungsi auth dengan `SELECT`:** tulis policy `USING ((SELECT auth.uid()) = user_id)`, BUKAN `USING (auth.uid() = user_id)`. Tanpa dibungkus, Postgres memanggil `auth.uid()` ULANG tiap baris yang diperiksa; dengan `(SELECT …)` hasilnya dihitung SEKALI per query lalu dipakai ulang (Postgres menyebutnya "initPlan"/cache) → jauh lebih ringan di tabel ratusan-ribu baris. Ini soal KECEPATAN, bukan keamanan — RLS ON default-deny (§1) tetap wajib lebih dulu.
2. 📐 **Index** kolom yang dipakai WHERE/JOIN/ORDER (B-tree default; GIN untuk JSONB/full-text); cek `EXPLAIN ANALYZE`; hindari N+1 (query berulang dalam loop).
3. 📐 **Ambil kolom seperlunya di query Supabase — `.select('id, nama, status')`, BUKAN `.select('*')`:** `.select('*')` menarik SEMUA kolom (boros lebar-pita + berisiko ikut mengirim kolom internal/sensitif ke browser). Sebut hanya kolom yang dipakai. (Prinsip sama untuk Prisma dibahas di poin over-fetch di bawah.)
4. 🔒 **HASIL — [Postgres saja] Index di tabel besar = `CREATE INDEX CONCURRENTLY` — dan Prisma TAK bisa membuatnya sendiri.** `CREATE INDEX` biasa mengunci SEMUA operasi tulis ke tabel selama index dibangun (di tabel jutaan baris = app seolah "hang"/timeout). Pakai `CREATE INDEX CONCURRENTLY IF NOT EXISTS ...` — bangun index tanpa mengunci tulis (`IF NOT EXISTS` = idempoten/kebal-diulang, aman diulang). Dua jebakan:
   - **`CONCURRENTLY` TAK BISA jalan di dalam blok transaksi** — dan Prisma membungkus tiap file migrasi dalam satu transaksi, jadi Prisma tak pernah meng-generate `CONCURRENTLY` otomatis.
   - **Jalur benar:** `npx prisma migrate dev --create-only --name add_email_index` (bikin file migrasi KOSONG, jangan langsung apply) → buka file `.sql`-nya → tulis manual `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);` → baru `prisma migrate deploy` di lingkungan bersama. (Tabel keputusan 🟢/🟡/🔴 operasi DB aman ada di `templates/SAFE_DATABASE_OPERATIONS.md` §3.)
   - 🚨 **DB lain:** `CONCURRENTLY` tak dikenal MySQL/MariaDB/SQLite → migrasi DITOLAK (gagal di CI, bukan di laptop). Padanan: **MySQL 8/MariaDB** `ALTER TABLE ... ADD INDEX` sudah online bawaan (`INPLACE`) — tak perlu kata kunci khusus; **PlanetScale** sudah non-blokir lewat *deploy request*; **SQLite** tak relevan.
   - 🙂 Non-Programmer: `CREATE INDEX` biasa = "tutup toko dulu baru pasang rak" (kasir & pembeli kena imbas selama pemasangan); `CONCURRENTLY` = "pasang rak sambil toko tetap buka". Prisma tak bisa menulis versi "toko tetap buka" itu sendiri, jadi minta Prisma bikin file migrasi kosong (`--create-only`) lalu ketik SQL-nya manual.
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
   | `@default(uuid())` | wajib tukar data dengan sistem non-Prisma | tabel sering-ditulis — UUID acak "mengacak" index B-tree (struktur pencari-cepat DB) → tulis melambat |
   | `@default(autoincrement())` | tabel-sambung internal / log audit | ID yang tampil publik — angka berurut membocorkan JUMLAH record (mis. URL `/invoice/1042` = ketahuan baru ada 1042 invoice) |

   🚨 **Jangan "membetulkan" nomor dokumen jadi acak.** Faktur/nota/bukti kas/dokumen pajak sering WAJIB berurut tanpa lompat menurut aturan pembukuan — menggantinya ke `cuid()` = melanggar syarat itu, dan tak bisa dibatalkan setelah dokumen terbit. Pola benar: **pisahkan dua nomor** — `id` internal (`cuid()`, untuk URL & relasi) + `nomorDokumen` berurut terpisah (di-generate dalam transaksi ber-`UNIQUE`, atau dari `SEQUENCE`). Ragu → tanya owner, jangan putuskan sendiri.
   - 🙂 Non-Programmer: ID = nomor identitas tiap data. `cuid` = kode acak-tapi-tertata-waktu, aman dipajang & cepat. `uuid` acak murni bikin database "capek menata" di tabel yang sering diisi. Nomor urut 1,2,3 gampang ditebak + membocorkan berapa banyak data yang kamu punya — jangan dipakai di alamat halaman (URL). **Tapi** nomor faktur/nota HARUS urut rapi karena aturan pembukuan — pakai dua nomor: kode acak untuk alamat halaman, nomor urut khusus untuk dokumennya.
   - Sadar-versi: cek `npx prisma --version` — Prisma baru mendorong `cuid(2)` (beda dari `cuid()` lama); kalau DB pakai UUIDv7 (urut-waktu), kelemahan fragmentasi B-tree pada `uuid()` sebagian besar hilang. Verifikasi ke dok versi terpasang (§8.2 Aturan 1).
9. 📐 **Anti-pola (langsung di-flag):**

   | Anti-pola | Perbaikan |
   |---|---|
   | `deleteMany()` / `updateMany()` tanpa `where` | selalu sertakan `where` (cegah hapus/ubah seluruh tabel) |
   | `migrate dev` di staging/produksi | `migrate deploy` di luar DB lokal pribadi |
   | pakai hasil `updateMany`/`deleteMany` sebagai data baris | tangkap `id` dulu, lalu `findMany` ulang |
   | `findUniqueOrThrow` untuk data soft-delete | `findFirstOrThrow({ where: { ..., deletedAt: null } })` |
   | panggilan eksternal di dalam `$transaction` | keluarkan dari transaksi (cegah timeout 5 detik) |
   | kembalikan entitas Prisma mentah ke API | petakan ke bentuk respons (DTO) eksplisit |

---

## 3. Powerful — pola siap-adaptasi kelas-produksi (🧪 CONTOH KASUS)

#### Upsert idempoten (tulis aman-diulang): `ON CONFLICT` (Postgres) + `upsert()` (Prisma)

> 🗃️ LATAR: Upsert = "INSERT kalau belum ada, UPDATE kalau sudah ada" dalam SATU perintah atomik (= semua-jadi atau semua-batal). Untuk data yang di-set-ulang (setelan user, counter, sinkron dari sumber luar) + kunci idempoten (kebal-ulang = dijalankan 2× hasilnya sama, tak dobel): perintah sama diulang TAK bikin baris dobel. SYARAT MUTLAK: kolom penentu-bentrok WAJIB punya UNIQUE/PK di DB — tanpa itu `ON CONFLICT` error + rawan balapan-data (sejalan `skills/python/SKILL.md` "andalkan constraint DB").

🧪 **CONTOH KASUS SQL Supabase/Postgres** (ambil polanya, jangan salin mentah — target konflik = constraint unik NYATA; `EXCLUDED` = baris yang tadinya mau di-insert):
```sql
INSERT INTO settings (user_id, key, value) VALUES (123, 'theme', 'dark')
ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value;  -- WAJIB cocok UNIQUE/PK
INSERT INTO tags (name) VALUES ('promo') ON CONFLICT (name) DO NOTHING;  -- insert idempoten
```

🧪 **CONTOH KASUS Prisma:** `upsert({ where, create, update })` — `where` WAJIB kolom unik/PK. Non-obvious: `upsert()` TIDAK dijamin atomik; 2 request bareng bisa satu kena `P2002` → tetap pasang UNIQUE di DB + tangkap `P2002`. `@updatedAt` OTOMATIS ter-set di `upsert` (beda `updateMany`).
```ts
await prisma.setting.upsert({
  where: { userId_key: { userId, key: 'theme' } },
  create: { userId, key: 'theme', value: 'dark' },
  update: { value: 'dark' },
})
```

📐 Impor massal anti-dobel: `createMany({ data, skipDuplicates: true })` — masukkan banyak, LEWATI yang bentrok (bukan gagalkan semua). Sadar-versi: `skipDuplicates` TAK didukung SQLite/MongoDB. Untuk update-massal-saat-bentrok pakai loop `upsert` / SQL `ON CONFLICT DO UPDATE`.

🙂 Non-Programmer: upsert = tombol "simpan" pintar — buat baru kalau kosong, perbarui kalau ada, tanpa cek dulu; seperti simpan kontak: nomor sama tak bikin kontak dobel. `DO NOTHING` = "kalau sudah ada, biarkan". `skipDuplicates` = impor daftar, yang kembar dilewati, sisanya tetap masuk.

> 🗃️ Kredit: ECC `postgres-patterns` + `prisma-patterns`, MIT © Affaan Mustafa

#### Paginasi cursor/keyset (anti "halaman goyang") — Prisma

> 🗃️ LATAR: Paginasi = membagi data jadi halaman. Dua cara: **offset** (`skip`/`OFFSET`, "loncat ke halaman N") dan **cursor/keyset** (ambil "setelah baris terakhir"). Offset makin lambat di halaman jauh (DB tetap menghitung + membuang baris sebelumnya) dan bisa **skip/dobel** baris kalau ada data baru masuk saat user pindah halaman.

🔒 **HASIL — ⚠️ GOTCHA paling sering: `orderBy` WAJIB menyertakan kolom UNIK sebagai urutan kedua.** Kalau hanya urut `createdAt` dan ada beberapa baris berwaktu SAMA, urutannya tak pasti → paginasi "goyang" (baris muncul dobel / terlewat, salah tanpa peringatan). Tambah `id` sebagai tiebreaker (pemecah-seri).

🧪 **CONTOH KASUS:** ambil `take: limit + 1` lalu `pop()` untuk deteksi `hasNextPage` tanpa query hitung terpisah; `cursor` + `skip: 1` untuk lewati baris cursor.
```ts
const items = await prisma.post.findMany({
  where: { published: true },
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], // id = tiebreaker WAJIB
  take: limit + 1,
  ...(cursor && { cursor: { id: cursor }, skip: 1 }),
})
const hasNextPage = items.length > limit
if (hasNextPage) items.pop()
const nextCursor = hasNextPage ? items[items.length - 1].id : null
```
🙂 Non-Programmer: cursor = "tampilkan yang SETELAH ini", seperti tombol "muat lebih banyak" di Instagram — bukan "loncat ke halaman 500". Tiebreaker `id` = nomor antrean cadangan biar dua data berwaktu sama tak tukar-tempat.

**Kapan pakai yang mana:**

| Kebutuhan | Paginasi |
|---|---|
| Tabel admin, data kecil (<10rb), "loncat ke halaman N" | offset (`skip`/`take`) |
| Feed / infinite-scroll / API publik / data besar | cursor/keyset |
| Hasil pencarian (user harap nomor halaman) | offset |

#### Antrian kerja banyak-worker: `FOR UPDATE SKIP LOCKED` (bukan antrian di memori)

> 🗃️ LATAR: Antrian kerja = daftar tugas latar (kirim email, indexing, dll) yang diambil satu per satu oleh "worker" (pekerja proses). Kalau beberapa worker jalan bersamaan, dua worker bisa mengambil tugas SAMA → kerja dobel.

🔒 **HASIL — JANGAN pakai antrian di memori proses** (array `JobQueue` di dalam aplikasi) untuk produksi serverless/multi-instance: isinya HILANG tiap deploy dan TIDAK terbagi antar-replica (tiap instance punya antrian sendiri).

🧪 **CONTOH KASUS Programmer:** pakai tabel `jobs` di Postgres + `FOR UPDATE SKIP LOCKED` — tiap worker mengunci 1 baris `pending` dan MELEWATI baris yang sedang dikunci worker lain (bukan menunggu). Beda dari `select_for_update()` biasa (lihat `4.14-galeri-folder.md`, kunci stok) yang MENUNGGU baris terkunci; `SKIP LOCKED` cocok untuk ANTRIAN (banyak worker rebutan tugas).
```sql
-- SQL mentah (Supabase/Postgres)
UPDATE jobs SET status = 'processing'
WHERE id = (
  SELECT id FROM jobs WHERE status = 'pending'
  ORDER BY created_at LIMIT 1
  FOR UPDATE SKIP LOCKED
) RETURNING *;
```
```python
# Django ORM padanannya
with transaction.atomic():
    job = (Job.objects
           .select_for_update(skip_locked=True)
           .filter(status='pending').order_by('created_at').first())
    if job:
        job.status = 'processing'; job.save(update_fields=['status'])
```
🙂 Non-Programmer: seperti antrean kasir dengan banyak kasir — tiap kasir ambil pelanggan BERIKUTNYA yang belum dilayani, tidak berebut pelanggan yang sama. "SKIP LOCKED" = "lewati yang sedang dilayani kasir lain".

> Sadar-versi: `select_for_update(skip_locked=True)` butuh Django ≥2.0; `FOR UPDATE SKIP LOCKED` butuh Postgres ≥9.5 (Supabase jauh di atas itu). Verifikasi versi terpasang sebelum menyalin.

🔒 **HASIL — JANGAN pakai `SKIP LOCKED` untuk membaca data integritas-sensitif** (saldo, stok, akuntansi, apa pun yang dijumlahkan). `SKIP LOCKED` SENGAJA MELEWATI baris yang sedang dikunci → "pemandangan tak lengkap"; kalau dipakai menjumlahkan saldo saat ada baris terkunci, baris itu TERLEWAT → hasilnya diam-diam SALAH tanpa error. `SKIP LOCKED` HANYA untuk antrian (worker rebutan tugas).
🙂 Awam: "lewati yang sedang dilayani" bagus untuk antrean kasir, BERBAHAYA untuk menghitung total uang. Untuk hitung saldo/stok akurat pakai `FOR UPDATE` tanpa `SKIP LOCKED`.

#### Kunci banyak baris dengan urutan KONSISTEN (anti-deadlock transfer saldo/poin)

> 🗃️ LATAR: Kasus locking ke-3 (beda dari kunci-1-baris stok & antrian `SKIP LOCKED`): saat SATU transaksi mengunci ≥2 baris (transfer A→B). "Deadlock" = 2 transaksi saling menunggu kunci lawan selamanya → DB membatalkan salah satu.

🔒 **HASIL — Semua jalur kode WAJIB mengunci dengan URUTAN sama** (mis. selalu urut `id` menaik). Transfer A→B (kunci A lalu B) + B→A bersamaan (kunci B lalu A) = deadlock. Fix: ambil SEMUA baris di depan dalam satu locking-read ber-`ORDER BY`, bukan satu per satu.

🧪 **CONTOH KASUS Postgres:**
```sql
BEGIN;
  SELECT id, balance FROM accounts WHERE id IN (:a, :b) ORDER BY id FOR UPDATE;  -- urutan kunci konsisten
  UPDATE accounts SET balance = balance - :amt WHERE id = :from;
  UPDATE accounts SET balance = balance + :amt WHERE id = :to;
COMMIT;
```
Django: `Account.objects.select_for_update().filter(id__in=[a, b]).order_by('id')`. Deadlock masih mungkin → bungkus retry-transaksi berbatas saat SQLSTATE `40P01`/`40001`. JANGAN tahan kunci selama panggilan email/HTTP di dalam transaksi.

🙂 Non-Programmer: 2 orang saling transfer di ATM sama — kalau satu ambil "buku A lalu B" dan satu "buku B lalu A", keduanya saling tunggu = macet. Aturan "selalu ambil sesuai nomor urut" bikin tak saling-tunggu; kalau tetap kejadian, sistem batalkan lalu ulang otomatis.

> Sadar-versi: `FOR UPDATE` / `select_for_update()` = fitur Postgres/Django standar (bukan MySQL-only). Cek versi terpasang sebelum menyalin.

#### Uji policy RLS OTOMATIS dengan pgTAP (penjaga #1 kebocoran data multi-penyewa)

🔒 **HASIL — RLS ON saja tak cukup — buktikan policy BENAR dengan tes CI.** `supabase test db` jalankan pgTAP (kerangka tes SQL khusus Postgres): set peran `anon`/`authenticated` + klaim JWT → assert baris yang boleh/tak-boleh terlihat (`results_eq`/`is_empty`/`throws_ok`). Template siap-pakai = `templates/supabase-rls.test.sql`. Jadikan **min. 1 tes pgTAP per tabel sensitif** bagian Gerbang Bukti-Jalan §4.19 ("RLS terbukti menolak").

#### Type-safety end-to-end (native Supabase)

📐 `supabase gen types typescript > src/lib/database.types.ts` → **regen SETIAP skema berubah** (hapus/ubah kolom → wajib regen + `npm run build`, sebab query basi lolos gerbang tipe tapi 404 runtime).

📐 Client ber-tipe: `createClient<Database>()` → `.from()`+`.rpc()` otomatis ter-tipe. DoD: `strict:true` + `no-explicit-any` (§5). Non-Supabase (Prisma murni): generate tipe dari `prisma generate` + ekspor lewat paket bersama (`templates/SPLIT_REPO_TOOLS_SETUP.md` §2).

> 🗃️ Kredit: ECC `mysql-patterns` + agen `database-reviewer`, MIT © Affaan Mustafa (dialihkan ke Postgres/Django)

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

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

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan = baca kode + `EXPLAIN ANALYZE`/`supabase test db` (cuma-periksa) + menalar. JANGAN jalankan SQL yang mengubah data live saat verifikasi.

---

## 5. Definition-of-Done (kapan skill Supabase/Prisma dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** RLS ON default-deny + pemisahan kunci `anon`/`service_role` + sesi server-side + migrasi terversion + 4 operasi rawan-hilang-data Prisma dijaga.
- [ ] **Edge case** ditangani: tabel kosong/RLS menolak semua, migrasi drift di DB bersama, index build di tabel besar, race antar-worker rebutan job, deadlock transfer 2-baris, paginasi saat data baru masuk di tengah.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Minimal 1 tes pgTAP per tabel sensitif lulus (`supabase test db`); types di-regen (`supabase gen types` / Prisma) setelah skema berubah.
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** — "selesai" = terbukti (tes RLS dijalankan + hasil dilihat), bukan "sudah kutulis".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Struktur DB umum / migrasi aman generik / index** (di luar Supabase/Prisma spesifik) → `skills/database/SKILL.md`.
- 📐 **Kontrak API / status code / amplop respons** yang membungkus query ini → `skills/backend/SKILL.md`.
- 📐 **Login/sesi/RBAC** yang menentukan `auth.uid()`/identitas server-side → `skills/auth/SKILL.md`.
- 📐 **Anti bayar-dobel / idempotency-key** (pola upsert idempoten dipakai juga di sana) → `skills/pembayaran/SKILL.md`.
- 📐 **Antrian job/worker lanjutan** (retry/backoff di atas `FOR UPDATE SKIP LOCKED`) → `skills/background-job/SKILL.md`.
- 📐 **Constraint DB untuk idempotensi di stack lain** (Python/Django) → `skills/python/SKILL.md`.
- 📐 **Kunci stok / `select_for_update()` biasa (MENUNGGU, bukan `SKIP LOCKED`)** → `4.14-galeri-folder.md` (rak, belum jadi skill).
- 🗃️ **LATAR — kredit sumber:** ECC `postgres-patterns` + `prisma-patterns` + `mysql-patterns` + agen `database-reviewer`, MIT © Affaan Mustafa (ditulis-ulang non-programmer + dinetralkan untuk project apa pun, dialihkan ke Postgres/Django).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** data multi-penyewa (multi-tenant) di Postgres/Supabase + integritas tulisan (saldo, stok, dokumen berurut). **Mode-gagal khas:** RLS lupa di-ON (kebocoran lintas-penyewa senyap) · `service_role` bocor ke browser (bypass total) · `deleteMany`/`migrate dev` di lingkungan salah (hilang data) · index build mengunci tabel produksi · worker rebutan job yang sama · `SKIP LOCKED` dipakai keliru untuk hitung saldo (hasil diam-diam salah) · deadlock transfer 2-baris. **Mitigasi:** RLS default-deny + tes pgTAP + pemisahan kunci + `migrate deploy` di lingkungan bersama + `CREATE INDEX CONCURRENTLY` + `FOR UPDATE SKIP LOCKED` khusus antrian + urutan kunci konsisten.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** keamanan & integritas database Supabase/Prisma; **tidak menggantikan** review keamanan mendalam untuk skema baru berisiko tinggi maupun load-testing migrasi besar. Perilaku API Prisma berubah antar-versi (5/6 vs 4) — cek dokumentasi resmi versi TERPASANG (§8.2 A3) sebelum menyalin contoh di sini.

🙂 **Non-Programmer:** database yang "kelihatan jalan" belum tentu **aman** — RLS yang lupa dinyalakan atau kunci master (`service_role`) yang bocor ke browser sama sekali tak kelihatan sampai ada yang mengeksploitasinya. Perintah Prisma tertentu (`deleteMany`/`migrate dev`/edit migrasi lama) bisa menghapus data tanpa peringatan kalau dipakai di tempat yang salah. Skill ini memasang pagar untuk keduanya: kunci akses per-baris di database + rem darurat sebelum operasi berbahaya.
