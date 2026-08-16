# Rujukan supabase-prisma — Pola produksi (detail §3)
> Bagian dari `skills/supabase-prisma` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
> Konteks: 7 pola siap-adaptasi kelas-produksi seksi §3 SKILL.md inti (🧪 CONTOH KASUS) — upsert · transaksi `.rpc()` · paginasi cursor · antrian `SKIP LOCKED` · anti-deadlock · pgTAP · type-safety.

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

🙂 Non-Programmer: upsert = satu perintah yang otomatis membuat data baru kalau belum ada, atau memperbarui kalau sudah ada, tanpa perlu cek dulu — data dengan penanda yang sama tak akan tercatat dobel. `DO NOTHING` = "kalau sudah ada, biarkan". `skipDuplicates` = impor daftar, yang kembar dilewati, sisanya tetap masuk.

> 🗃️ Kredit: ECC `postgres-patterns` + `prisma-patterns`, MIT © Affaan Mustafa

#### Transaksi multi-tabel di Supabase murni (tanpa Prisma): bungkus ke fungsi Postgres + `.rpc()`

> 🗃️ LATAR: satu panggilan `supabase-js` `.from().insert()` = satu perintah PostgREST = **satu transaksi sendiri**. Dua `.from().insert()` berurutan **BUKAN** atomik — kalau yang kedua gagal, yang pertama TETAP tersimpan (pesanan/saldo "setengah-jadi"). `BEGIN; ... COMMIT;` tak bisa dikirim lewat PostgREST. Ini melengkapi mandat atomik `skills/backend/SKILL.md` (poin 3 §2).

🔒 **HASIL — [Postgres/Supabase saja] multi-tulis yang harus konsisten → bungkus dalam SATU fungsi Postgres**, panggil sekali `supabase.rpc('nama', {...})` → jalan dalam satu transaksi implisit (semua-jadi atau semua-batal). 🧪 CONTOH KASUS (ambil polanya, jangan salin mentah):
```sql
CREATE FUNCTION buat_pesanan(p_user uuid, p_total numeric)
RETURNS uuid LANGUAGE plpgsql
SECURITY INVOKER            -- INVOKER (default) = RLS pemanggil TETAP berlaku. SECURITY DEFINER = BYPASS RLS → hindari; kalau terpaksa, kunci search_path + cek auth.uid() di dalam fungsi.
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO pesanan (user_id, total) VALUES (p_user, p_total) RETURNING id INTO v_id;
  INSERT INTO pesanan_item (pesanan_id, ...) VALUES (v_id, ...);
  RETURN v_id;             -- error apa pun di tengah → seluruh transaksi otomatis ROLLBACK
END; $$;
```
```ts
const { data, error } = await supabase.rpc('buat_pesanan', { p_user, p_total })
if (error) throw error    // biarkan error NAIK; JANGAN bungkus EXCEPTION WHEN OTHERS (menyulap galat jadi "sukses" = kegagalan senyap, lihat skills/backend)
```
🙂 Non-Programmer: kalau satu proses harus menulis ke beberapa tabel sekaligus (buat pesanan + isinya), bungkus jadi SATU perintah database supaya bila satu langkah gagal SEMUANYA dibatalkan (tak ada data setengah-jadi). `SECURITY DEFINER` = fungsi jalan dengan hak pembuatnya + MELEWATI aturan akses per-baris (RLS) — jangan dipakai kecuali paham risikonya.

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
💡 SARAN: kalau cursor dikirim keluar lewat API, buat **buram** (encode dulu, mis. base64) dan perlakukan sebagai penanda posisi yang isinya urusan server — supaya klien tak menyandarkan kodenya ke `id` internal, dan kamu masih bebas mengubah cara urutnya nanti tanpa memutus mereka.

🙂 Non-Programmer: cursor = "tampilkan data SETELAH posisi ini" untuk tampilan yang terus dimuat bertahap, bukan "loncat ke halaman 500". Tiebreaker `id` dipakai supaya dua data yang tercatat di waktu SAMA tetap punya urutan pasti, tak tukar-tempat.

**Kapan pakai yang mana:**

| Kebutuhan | Paginasi |
|---|---|
| Tabel admin, data kecil (<10rb), "loncat ke halaman N" | offset (`skip`/`take`) |
| Feed / infinite-scroll / API publik / data besar | cursor/keyset |
| Hasil pencarian (user harap nomor halaman) | offset |

#### Antrian kerja banyak-worker: `FOR UPDATE SKIP LOCKED` (bukan antrian di memori)

> 🗃️ LATAR: Antrian kerja = daftar tugas latar (kirim email, indexing, dll) yang diambil satu per satu oleh "worker" (pekerja proses). Kalau beberapa worker jalan bersamaan, dua worker bisa mengambil tugas SAMA → kerja dobel.

🔒 **HASIL — JANGAN pakai antrian di memori proses** (array `JobQueue` di dalam aplikasi) untuk produksi serverless/multi-instance: isinya HILANG tiap deploy dan TIDAK terbagi antar-replica (tiap instance punya antrian sendiri).

🧪 **CONTOH KASUS Programmer:** pakai tabel `jobs` di Postgres + `FOR UPDATE SKIP LOCKED` — tiap worker mengunci 1 baris `pending` dan MELEWATI baris yang sedang dikunci worker lain (bukan menunggu). Beda dari `select_for_update()` biasa (mis. kunci stok) yang MENUNGGU baris terkunci; `SKIP LOCKED` cocok untuk ANTRIAN (banyak worker rebutan tugas).
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
🙂 Non-Programmer: tiap worker mengambil tugas BERIKUTNYA yang belum diproses, tanpa berebut tugas yang sama dengan worker lain. "SKIP LOCKED" = "lewati tugas yang sedang diproses worker lain".

> Sadar-versi: `select_for_update(skip_locked=True)` butuh Django ≥2.0; `FOR UPDATE SKIP LOCKED` butuh Postgres ≥9.5 (Supabase jauh di atas itu).

🔒 **HASIL — JANGAN pakai `SKIP LOCKED` untuk membaca data integritas-sensitif** (saldo, stok, akuntansi, apa pun yang dijumlahkan). `SKIP LOCKED` SENGAJA MELEWATI baris yang sedang dikunci → "pemandangan tak lengkap"; kalau dipakai menjumlahkan saldo saat ada baris terkunci, baris itu TERLEWAT → hasilnya diam-diam SALAH tanpa error. `SKIP LOCKED` HANYA untuk antrian (worker rebutan tugas).
🙂 Awam: "lewati yang sedang dikunci" aman dipakai untuk antrian tugas biasa, tapi BERBAHAYA untuk menghitung total uang. Untuk hitung saldo/stok akurat pakai `FOR UPDATE` tanpa `SKIP LOCKED`.

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

🙂 Non-Programmer: kalau dua transfer berjalan bersamaan dan masing-masing mengunci baris data dengan URUTAN berbeda (transfer 1 kunci A dulu lalu B, transfer 2 kunci B dulu lalu A), keduanya bisa saling menunggu selamanya = macet (deadlock). Aturan "selalu kunci sesuai urutan yang sama" mencegah saling-tunggu itu; kalau tetap kejadian, sistem membatalkan lalu mengulang otomatis.

> Sadar-versi: `FOR UPDATE` / `select_for_update()` = fitur Postgres/Django standar (bukan MySQL-only).

#### Uji policy RLS OTOMATIS dengan pgTAP (penjaga #1 kebocoran data multi-penyewa)

🔒 **HASIL — RLS ON saja tak cukup — buktikan policy BENAR dengan tes CI.** `supabase test db` jalankan pgTAP (kerangka tes SQL khusus Postgres): set peran `anon`/`authenticated` + klaim JWT → assert baris yang boleh/tak-boleh terlihat (`results_eq`/`is_empty`/`throws_ok`). Template siap-pakai = `templates/supabase-rls.test.sql`. Jadikan **min. 1 tes pgTAP per tabel sensitif** bagian Gerbang Bukti-Jalan ("RLS terbukti menolak").

#### Type-safety end-to-end (native Supabase)

📐 `supabase gen types typescript > src/lib/database.types.ts` → **regen SETIAP skema berubah** (hapus/ubah kolom → wajib regen + `npm run build`, sebab query basi lolos gerbang tipe tapi 404 runtime).

📐 Client ber-tipe: `createClient<Database>()` → `.from()`+`.rpc()` otomatis ter-tipe. DoD: `strict:true` + `no-explicit-any`. Non-Supabase (Prisma murni): generate tipe dari `prisma generate` + ekspor lewat paket bersama (shared package).

> 🗃️ Kredit: ECC `mysql-patterns` + agen `database-reviewer`, MIT © Affaan Mustafa (dialihkan ke Postgres/Django)
