# Rujukan supabase-prisma — Galeri contoh ❌ SALAH → ✅ BENAR
> Bagian dari `skills/supabase-prisma` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
> Konteks: galeri lengkap pasangan ❌→✅ seksi §3 SKILL.md inti; pasangan paling kritis (RLS ON default-deny + policy segera) DIPERTAHANKAN di SKILL.md inti §3 — sisanya di sini.

### Contoh pola ❌→✅ (ambil POLANYA, jangan salin mentah — cek versi paket/provider terpasang)

🧪 **Pemisahan kunci `anon`/`service_role` (SKILL.md §1 butir 2-3)**:

❌ **SALAH** (`NEXT_PUBLIC_` ikut dibundel ke browser — `service_role` BYPASS RLS total):
```ts
const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!)
// prefiks NEXT_PUBLIC_ = terkirim ke browser -> siapa pun buka DevTools dapat kunci semua-data
```
✅ **BENAR** (browser pakai `anon`; `service_role` hanya di file server):
```ts
// komponen client / browser:
const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) // dilindungi RLS
// route handler / server action SAJA (tanpa NEXT_PUBLIC_ -> tak pernah dibundel ke browser):
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
```

🧪 **Sesi diverifikasi server-side (SKILL.md §1 butir 4)**:

❌ **SALAH** (percaya user-id dari body request):
```ts
const { userId } = await req.json() // penyerang kirim userId orang lain -> IDOR
const pesanan = await db.pesanan.findMany({ where: { userId } })
```
✅ **BENAR** (identitas dari sesi terverifikasi di server):
```ts
const { data: { user }, error } = await supabase.auth.getUser() // verifikasi token ke server Auth
if (error || !user) return new Response('unauthorized', { status: 401 })
const pesanan = await db.pesanan.findMany({ where: { userId: user.id } }) // id dari sesi, bukan body
```

🧪 **Constraint di level DB, bukan cuma validasi app (SKILL.md §1 butir 5)**:

❌ **SALAH** (cek-dulu-baru-tulis di app = kalah balapan):
```ts
const ada = await db.user.findFirst({ where: { email } }) // 2 request bersamaan: dua-duanya lolos cek
if (!ada) await db.user.create({ data: { email } })       // -> email dobel tetap masuk
```
✅ **BENAR** (DB yang menolak — atomik walau request bersamaan; tangkap `P2002`, `rujukan/cara-rakit.md` butir 6):
```sql
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
```

🧪 **`deleteMany`/`updateMany` WAJIB `where` (SKILL.md §1 butir 6)**:

❌ **SALAH** (tanpa `where` = SELURUH tabel):
```ts
await prisma.sesi.deleteMany() // polos: menghapus SEMUA baris tabel, diam-diam tanpa peringatan
```
✅ **BENAR** (selalu bersyarat):
```ts
await prisma.sesi.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } })
```

🧪 **`migrate dev` vs `migrate deploy` (SKILL.md §1 butir 7)**:

❌ **SALAH** (di DB bersama/staging/produksi):
```sh
npx prisma migrate dev   # deteksi drift -> bisa MERESET database = seluruh data terbuang
```
✅ **BENAR** (pisahkan per lingkungan):
```sh
npx prisma migrate dev      # HANYA DB lokal pribadi (boleh reset, datanya milikmu)
npx prisma migrate deploy   # DB bersama: apply migrasi saja, tak pernah reset
```

🧪 **Expand-then-contract untuk `NOT NULL` (SKILL.md §1 butir 8)**:

❌ **SALAH** (sekali jalan):
```sql
ALTER TABLE users ALTER COLUMN phone SET NOT NULL; -- baris lama ber-NULL -> migrasi GAGAL / kunci tabel
```
✅ **BENAR** (tambah → backfill → baru wajibkan, migrasi TERPISAH):
```sql
-- migrasi 1: tambah kolom nullable
ALTER TABLE users ADD COLUMN phone text;
-- migrasi 2, SETELAH backfill diverifikasi:
UPDATE users SET phone = '-' WHERE phone IS NULL;  -- backfill (tabel besar: bertahap/batch)
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
```

🧪 **Jangan edit migrasi yang sudah jalan (SKILL.md §1 butir 9)**:

❌ **SALAH** (menyunting file lama):
```sh
vim prisma/migrations/20260101_init/migration.sql  # checksum berubah -> P3006 di tiap lingkungan lain
```
✅ **BENAR** (perbaikan = migrasi BARU):
```sh
npx prisma migrate dev --create-only --name perbaiki_kolom  # tulis SQL perbaikan di file baru ini
```

🧪 **Ambil kolom seperlunya (`rujukan/cara-rakit.md` butir 3)**:

❌ **SALAH** (tarik semua kolom):
```ts
const { data } = await supabase.from('users').select('*') // kolom internal/sensitif ikut ke browser
```
✅ **BENAR** (sebut yang dipakai saja):
```ts
const { data } = await supabase.from('users').select('id, nama, status')
```

🧪 **[Postgres saja] Index tabel besar tanpa mengunci tulis (`rujukan/cara-rakit.md` butir 4)**:

❌ **SALAH** (lewat migrasi Prisma biasa):
```sql
CREATE INDEX idx_users_email ON users (email); -- mengunci SEMUA tulis selama build -> app seolah hang
```
✅ **BENAR** (tulis manual di migrasi `--create-only` — `CONCURRENTLY` tak bisa dalam transaksi Prisma):
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
```

🧪 **Multi-tulis Supabase murni = satu fungsi `.rpc()` (`rujukan/pola-produksi.md` "Transaksi multi-tabel")**:

❌ **SALAH** (dua `.insert()` berurutan = dua transaksi TERPISAH):
```ts
await supabase.from('pesanan').insert({ id, user_id, total }) // transaksi #1 — sudah COMMIT
await supabase.from('pesanan_item').insert(items) // #2 gagal -> pesanan tanpa item TETAP tersimpan
```
✅ **BENAR** (satu fungsi Postgres = satu transaksi; SQL fungsinya lihat CONTOH KASUS di `rujukan/pola-produksi.md`):
```ts
const { error } = await supabase.rpc('buat_pesanan', { p_user, p_total })
if (error) throw error // gagal di tengah -> seluruh isi fungsi otomatis ROLLBACK
```

🧪 **Paginasi cursor: tiebreaker unik (`rujukan/pola-produksi.md` "Paginasi cursor/keyset")**:

❌ **SALAH** (urut waktu saja):
```ts
const page = await prisma.post.findMany({
  orderBy: { createdAt: 'desc' }, // waktu SAMA -> urutan tak pasti -> baris dobel/terlewat antar-halaman
  take: 20, ...(cursor && { cursor: { id: cursor }, skip: 1 }),
})
```
✅ **BENAR** (kolom unik sebagai urutan kedua):
```ts
const page = await prisma.post.findMany({
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], // id = tiebreaker -> urutan selalu pasti
  take: 20, ...(cursor && { cursor: { id: cursor }, skip: 1 }),
})
```

🧪 **`SKIP LOCKED` bukan untuk hitung saldo/stok (`rujukan/pola-produksi.md` "Antrian kerja", HASIL kedua)**:

❌ **SALAH** (baris terkunci TERLEWAT → total diam-diam salah):
```sql
SELECT id, amount FROM ledger WHERE user_id = :u FOR UPDATE SKIP LOCKED; -- yang sedang dikunci transaksi lain tak ikut terjumlah
```
✅ **BENAR** (MENUNGGU kunci lepas → semua baris terbaca):
```sql
SELECT id, amount FROM ledger WHERE user_id = :u FOR UPDATE; -- SKIP LOCKED HANYA untuk antrian job
```
