# Menyalakan backup database harian (belum pernah berhasil sekali pun)

> Dibuat 2026-10-14. Dikerjakan **owner** — butuh kredensial yang memang hanya
> owner punya. Perkiraan 10 menit.

## Keadaan sebelum ini

`Backup Schemas Daily` sudah terpasang sejak lama dan **gagal 20 dari 20 run**.
Dua sebabnya:

1. `DATABASE_URL_BACKUP` tidak pernah di-set (daftar secret repo **kosong**).
2. `SCHEMAS_TO_BACKUP` masih berisi nilai contoh bawaan template
   (`schema_a schema_b`), bukan schema sungguhan project ini (`dramaapp`).

Nomor 2 **sudah diperbaiki** di repo. Nomor 1 butuh owner.

Artinya: **tidak ada backup otomatis sama sekali sampai hari ini.** Yang ada
cuma `backups/prod-2026-08-29…` di disk komputer owner — satu salinan manual,
berumur 6 minggu, tidak ada di mana pun selain satu komputer.

## 🔴 Kenapa tidak boleh asal dinyalakan

**Repo produksi `masradenbagus89-ui/dramaapp` berstatus PUBLIC.**

Dump schema `dramaapp` memuat **data pribadi penonton**: hash password, rahasia
2FA, email, saldo koin, riwayat buka episode. Workflow versi lama mengunggah
hasil dump sebagai **GitHub Actions artifact**, dan artifact mengikuti izin baca
repo. Diuji 2026-10-14: `GET /actions/artifacts` repo ini dijawab **HTTP 200
tanpa login sama sekali**.

Jadi kalau secret dipasang ke workflow versi lama, besok paginya dump lengkap
data penonton tersedia untuk diunduh. **Kegagalan 20 kali itulah yang selama ini
menahannya.**

Sudah ditutup: langkah artifact kini dipagari `github.event.repository.private`,
jadi di repo publik ia tidak pernah berjalan. Dan kalau tujuan simpan yang aman
belum lengkap, workflow sengaja **GAGAL** — bukan diam-diam melewatinya.

⚠️ Jangan melonggarkan pagar itu "biar jalan dulu". Workflow gagal tidak
membocorkan apa pun; workflow sukses ke tempat salah membocorkan semuanya satu
kali, permanen, tak bisa ditarik kembali.

---

## Langkah

### 1. Buat bucket PRIVAT di Supabase

Dashboard → **Storage** → New bucket → nama `db-backups` → **Public bucket:
MATIKAN**.

⚠️ Bucket publik = masalah yang sama persis dengan artifact tadi, cuma pindah
tempat.

### 2. Ambil connection string

Dashboard → **Settings** → **Database** → **Connection string** → tab **URI**.
Satu baris panjang yang diawali `postgresql://`. **Salin apa adanya** dengan
tombol copy di dashboard — jangan diketik ulang atau disusun sendiri dari
potongan; satu karakter meleset menghasilkan error koneksi yang pesannya tidak
menunjuk ke bagian mana yang salah.

⚠️ Isinya **password database**. Jangan tempel ke chat mana pun (termasuk ke
saya), jangan simpan di berkas dalam repo. Langsung dari dashboard ke kolom
secret GitHub.

> Contoh utuhnya sengaja tidak ditulis di sini. Bentuk connection string
> lengkap (yang memuat nama pengguna dan password sebelum tanda `@`) memicu
> `pre-commit` penjaga-rahasia repo ini — dan pagar itu memang harus tetap
> galak, termasuk terhadap tulisan yang "cuma contoh". Hook-nya sudah menolak
> draf panduan ini dua kali saat ditulis; keduanya benar.

### 3. Pasang 4 secret

GitHub → repo → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**:

| Nama secret | Isi |
|---|---|
| `DATABASE_URL_BACKUP` | connection string dari langkah 2 |
| `SUPABASE_PROJECT_REF` | bagian sebelum `.supabase.co` pada alamat Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Settings → API → `service_role` |
| `SUPABASE_STORAGE_BUCKET` | `db-backups` (nama dari langkah 1) |

Keempatnya wajib di repo publik — tanpa tujuan simpan yang aman, workflow
memang dirancang gagal.

### 4. Jalankan manual, jangan tunggu jadwal

Actions → **Backup Schemas Daily** → **Run workflow**.

Yang dicari di log:

| Baris | Artinya |
|---|---|
| `Tabel terbaca di dump: 5` | dump berisi isi, bukan cuma header |
| `✓ Semua tabel wajib ada: app_data dramas likes wallets unlocks` | ✅ isinya benar |
| `TIDAK memuat tabel wajib: …` | role di connection string tak bisa baca sebagian tabel |
| `✓ Uploaded: dramaapp-….sql.gz` | sampai ke bucket |
| `Supabase upload secrets belum lengkap DAN repo ini PUBLIK` | ada secret yang terlewat |

### 5. ⚠️ UJI PULIHKAN — tanpa ini belum bisa disebut backup

Unduh satu berkas `.gz` dari bucket, lalu pulihkan ke database **kosong**
(Supabase project baru gratis, atau Postgres lokal):

```bash
gunzip -c dramaapp-<tanggal>.sql.gz | psql "<connection-string-database-kosong>"
```

Lalu periksa isinya benar-benar ada:

```sql
select count(*) from dramaapp.dramas;
select count(*) from dramaapp.wallets;
```

**Backup yang tak pernah diuji pulihkan bukan backup — itu berkas yang disangka
backup.** Satu-satunya cara tahu bedanya adalah mencobanya sebelum dibutuhkan,
bukan pada hari ia dibutuhkan.

---

## Utang yang masih terbuka (sengaja tidak dikerjakan)

- **Pembersihan backup lama belum ada.** `RETENTION_DAYS: 30` tertulis tapi
  tidak ditegakkan — langkah "Cleanup" cuma mencetak TODO. Akibatnya berkas
  menumpuk di bucket dan memakan kuota. Sementara: hapus manual dari Supabase
  Dashboard. Bukan soal backup berfungsi, murni soal biaya penyimpanan.
- **Notifikasi gagal hanya lewat email GitHub** (`SLACK_WEBHOOK_URL` tidak
  di-set). Cukup, asal emailnya dibaca — kegagalan 20 kali kemarin membuktikan
  email saja mudah terlewat.

## Catatan terpisah: repo produksi berstatus PUBLIC

Ditemukan saat mengerjakan ini. Bukan untuk diputuskan sekarang, tapi layak
diketahui: `masradenbagus89-ui/dramaapp` bisa dibaca siapa saja — termasuk
seluruh kode logika pembayaran, pembukaan episode berbayar, dan pemberian koin.
Itu tidak membocorkan secret (semuanya lewat env, dan `secret-guard.yml`
berjalan), tapi menaikkan taruhan setiap kali ada berkas baru yang menyentuh
data atau kredensial — seperti workflow ini.
