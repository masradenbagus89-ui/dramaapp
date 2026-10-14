# Uji pulihkan backup — ⏸️ PENDING (keputusan owner 2026-10-14)

> **Status: DITUNDA, bukan dilupakan.** Owner memilih lanjut ke tahap berikutnya
> dulu. Berkas ini menyimpan prosedurnya supaya saat dikerjakan nanti tak perlu
> menurunkan ulang konteksnya.
>
> **Yang menahan:** butuh satu database kosong untuk dicoba. Tidak ada di tangan
> sekarang.

## Kenapa ini belum boleh dicoret

Backup harian sudah berjalan dan terbukti menghasilkan berkas (`13ccc06`, run
GitHub `38512319033`). Tapi yang sudah dibuktikan baru **pemeriksaan statis**:
tiap kolom yang disebut `insert` sudah dideklarasikan lebih dulu — 29 dari 29
untuk `dramas`.

Yang **belum**: menjalankan berkas itu ke database sungguhan dan menghitung
barisnya.

**Kalimat jujurnya hari ini: "ada berkas backup yang konsisten", BUKAN "punya
backup yang terbukti pulih".** Bedanya baru terasa di hari backup itu dibutuhkan,
dan itu hari terburuk untuk mengetahuinya.

Kejadian 2026-10-14 membuktikan ini bukan kehati-hatian berlebihan: script yang
sama, sebelum diperbaiki, menghasilkan berkas yang terlihat sehat sempurna
(`exit 0`, 125 baris data benar, ukuran wajar) tapi **nol baris akan masuk** saat
dipulihkan — satu kolom tertinggal membatalkan seluruh transaksi.

## Yang dibutuhkan

**Satu Supabase project KOSONG.** Paket gratis cukup. **Nol sentuhan ke
produksi** — pemulihan dijalankan di tempat lain, database yang hidup tidak
dibaca maupun ditulis.

> 💡 Project baru itu **milik owner sendiri**, berbeda dari project produksi yang
> dimiliki pihak lain. Artinya connection string-nya tersedia — dan itu membuka
> rute 2 di bawah.

## Dua rute, pilih salah satu

### Rute 1 — tempel ke SQL Editor (tanpa alat tambahan)

1. Buat project Supabase baru → tunggu sampai siap.
2. Unduh berkas `.gz` terbaru dari bucket `db-backups` (Dashboard produksi →
   Storage) → ekstrak jadi `.sql`.
3. Dashboard project BARU → **SQL Editor** → **New query** → tempel seluruh isi →
   **Run**.
4. **Settings → API → Exposed schemas** → tambahkan `dramaapp`.

⚠️ **Batas rute ini:** berkasnya ±426 KB sebelum dimampatkan. SQL Editor bisa
tersendat atau menolak tempelan sebesar itu. Kalau macet, pakai rute 2.

### Rute 2 — lewat GitHub Actions (lebih andal, bisa diulang)

Project baru milik owner, jadi connection string-nya bisa diambil sendiri
(Settings → Database → Connection string → **Session pooler**, bukan Direct
connection: runner GitHub hanya IPv4 sedangkan Direct connection Supabase gratis
IPv6 saja).

Pasang sebagai secret **sementara** `DATABASE_URL_UJI_PULIH`, lalu AI membuatkan
workflow sekali-pakai yang: unduh backup dari bucket → `psql` ke database uji →
hitung baris → bandingkan dengan angka yang tercatat → hapus secret-nya.

⚠️ Secret itu **dihapus setelah selesai**. Ia membuka database uji sepenuhnya;
tidak ada alasan menyimpannya setelah pengujian lewat.

## Kriteria LULUS — angka, bukan perasaan

Sesudah pemulihan, jalankan di database uji:

```sql
select count(*) from dramaapp.dramas;    -- harus 40
select count(*) from dramaapp.app_data;  -- harus 36
select count(*) from dramaapp.likes;     -- harus 46
select count(*) from dramaapp.wallets;   -- harus 3
select count(*) from dramaapp.unlocks;   -- harus 0
```

Angka pembanding di atas diambil dari backup 2026-10-14. **Kalau backup yang
diuji berasal dari tanggal lain, ambil angkanya dari log run workflow hari itu**
(baris `app_data: 36 baris`, dst.) — bukan dari berkas ini.

Dua hal lagi yang wajib diperiksa, karena keduanya pernah jadi sumber kerusakan
senyap di project ini:

1. **Kolom `dramas.status` ada.** Inilah kolom yang dulu hilang dan membatalkan
   seluruh pemulihan. `select status from dramaapp.dramas limit 1;` tidak boleh
   error.
2. **Ketiga fungsi RPC ikut.** `coin_add`, `coin_spend_unlock`, `like_change` —
   diambil dari berkas migrasi, bukan dari database, jadi justru bagian inilah
   yang paling mungkin basi. `select to_regprocedure('dramaapp.coin_add(text,integer)');`
   tidak boleh `null`.

## Sesudah lulus

1. Hapus project uji (atau kosongkan) — isinya data pribadi penonton sungguhan:
   hash password, rahasia 2FA, email, saldo koin.
2. Hapus secret `DATABASE_URL_UJI_PULIH` kalau memakai rute 2.
3. Catat hasilnya ke `HANDOFF.md`, dan **baru** sejak saat itu kata "backup"
   boleh dipakai tanpa tanda kutip.

## Berkas terkait

- `.github/workflows/backup-dramaapp.yml` — robot harian yang menghasilkan backup
- `scripts/export-dramaapp-sql.mjs` — penarik isi database + 3 gerbang pemeriksa
- `docs/backup-database-setup.md` — latar lengkap + kenapa jalur `pg_dump` buntu
