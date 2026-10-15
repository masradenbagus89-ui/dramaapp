# Uji pulihkan backup — 🟡 ALATNYA SIAP, tinggal 1 langkah owner

> **Status 2026-10-15: robotnya sudah dibuat dan diuji.** Rute 2 di bawah bukan
> lagi rencana — `.github/workflows/uji-pulihkan-backup.yml` sudah ada di repo,
> lengkap dengan pagar-pagarnya, dan tiap langkahnya sudah diuji memakai `psql`
> tiruan (15 skenario: lolos DAN ditolak).
>
> **Yang masih menahan — satu hal saja:** satu Supabase project KOSONG. Itu di
> tangan owner, bukan sesuatu yang bisa dibuat dari sini.
>
> **Begitu project itu ada, pekerjaannya tinggal 3 langkah** (±10 menit) —
> lihat "Rute 2" di bawah.

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

### Rute 2 — lewat GitHub Actions ✅ SUDAH DIBUATKAN (dianjurkan)

Robotnya: **`.github/workflows/uji-pulihkan-backup.yml`**. Ia mengerjakan
seluruh rantainya sendiri — unduh backup terbaru dari bucket → jalankan ke
database uji lewat `psql` → hitung baris → bandingkan → periksa kolom & fungsi
RPC. Dijalankan **manual saja**; tidak ada jadwal, jadi ia tidak akan pernah
menyala sendiri.

**3 langkah owner:**

1. **Buat Supabase project baru & kosong** (paket gratis cukup) → tunggu siap.
2. **Settings → Database → Connection string → "Session pooler"** → salin.
   Pasang di repo `masradenbagus89-ui/dramaapp` →
   *Settings → Secrets and variables → Actions → New repository secret*:
   nama **`DATABASE_URL_UJI_PULIH`**, isi = connection string tadi
   (ganti `[YOUR-PASSWORD]` dengan password database project baru itu).
   ⚠️ **Harus "Session pooler", bukan "Direct connection".** Runner GitHub hanya
   punya IPv4, sedangkan Direct connection project gratis IPv6 saja → tidak akan
   nyambung, dan pesannya tidak menjelaskan sebab ini.
3. **Actions → "Uji Pulihkan Backup (manual)" → Run workflow** → ketik persis
   `DATABASE UJI KOSONG` di kolom konfirmasi → Run.
   (Kolom *nama_berkas* boleh dikosongkan = pakai backup terbaru.)

**Tiga pagar yang dipasang di dalamnya**, karena uji seperti ini punya tiga cara
untuk "lulus" secara palsu:

| Pagar | Yang dicegah |
|---|---|
| Tujuan bukan produksi | Connection string produksi yang salah tempel → uji menulis DDL ke database yang hidup. Ref project dicocokkan; cocok = berhenti **sebelum** satu perintah pun dijalankan |
| Database harus kosong | Semua `insert` di backup berakhiran `on conflict do nothing`. Di database yang sudah berisi, nol baris benar-benar masuk tapi `count(*)` tetap cocok **dari data lama** — hijau tanpa bukti |
| Konfirmasi ketik | Satu-satunya kasus yang tak bisa dideteksi mesin: connection string milik database **lain** yang kebetulan bukan produksi dramaapp |

🔴 **Log run repo publik terbaca tanpa login.** Karena itu workflow ini: nol
`upload-artifact`, isi berkas tak pernah dicetak, dan keluaran `psql` disaring
(`VERBOSITY=terse` + hanya baris `ERROR:` yang ditampilkan) — baris `DETAIL:`
milik PostgreSQL memuat isi baris yang gagal, termasuk email dan hash password.

⚠️ Secret `DATABASE_URL_UJI_PULIH` **dihapus setelah selesai**. Ia membuka
database uji sepenuhnya; tidak ada alasan menyimpannya setelah pengujian lewat.

## Kriteria LULUS — angka, bukan perasaan

Sesudah pemulihan, jalankan di database uji:

```sql
select count(*) from dramaapp.dramas;    -- harus 40
select count(*) from dramaapp.app_data;  -- harus 36
select count(*) from dramaapp.likes;     -- harus 46
select count(*) from dramaapp.wallets;   -- harus 3
select count(*) from dramaapp.unlocks;   -- harus 0
```

Angka di atas berlaku untuk backup 2026-10-14/15 dan **akan basi** begitu katalog
bertambah — itu sebabnya ia hanya dipakai di rute 1 (manual).

✅ **Rute 2 tidak memakai angka dari berkas ini sama sekali.** Robotnya membaca
angka pembanding dari **berkas backup yang sedang diuji**: `export-dramaapp-sql.mjs`
menulis satu baris komentar per tabel (`-- dramas: 40 baris`), dan itulah yang
dibandingkan dengan hasil `count(*)`. Jadi uji rute 2 tetap benar untuk backup
tanggal mana pun, dan tak pernah perlu diperbarui di sini.

Dua hal lagi yang wajib diperiksa, karena keduanya pernah jadi sumber kerusakan
senyap di project ini:

1. **Kolom `dramas.status` ada.** Inilah kolom yang dulu hilang dan membatalkan
   seluruh pemulihan. `select status from dramaapp.dramas limit 1;` tidak boleh
   error.
2. **Ketiga fungsi RPC ikut.** `coin_add`, `coin_spend_unlock`, `like_change` —
   diambil dari berkas migrasi, bukan dari database, jadi justru bagian inilah
   yang paling mungkin basi. `select to_regprocedure('dramaapp.coin_add(text,integer)');`
   tidak boleh `null`.

Keduanya sudah **otomatis** diperiksa di rute 2 (langkah "Periksa struktur").

## Sesudah lulus

1. Hapus project uji (atau kosongkan) — isinya data pribadi penonton sungguhan:
   hash password, rahasia 2FA, email, saldo koin.
2. Hapus secret `DATABASE_URL_UJI_PULIH` kalau memakai rute 2.
3. Catat hasilnya ke `HANDOFF.md`, dan **baru** sejak saat itu kata "backup"
   boleh dipakai tanpa tanda kutip.

## Berkas terkait

- `.github/workflows/uji-pulihkan-backup.yml` — **robot uji pulih (rute 2)**
- `scripts/uji-pulihkan-backup.mjs` — pagar + pembanding, dipisah supaya bisa diuji tanpa GitHub
- `tests/uji-pulihkan-backup.test.ts` — 19 tes penjaga: pagarnya terbukti **menolak**, bukan cuma hijau
- `.github/workflows/backup-dramaapp.yml` — robot harian yang menghasilkan backup
- `scripts/export-dramaapp-sql.mjs` — penarik isi database + 3 gerbang pemeriksa
- `docs/backup-database-setup.md` — latar lengkap + kenapa jalur `pg_dump` buntu
