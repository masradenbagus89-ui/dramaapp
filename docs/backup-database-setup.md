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

> ## ✅ SUDAH BERJALAN — tidak ada yang perlu owner kerjakan
>
> **Diperbarui 2026-10-14 siang.** Kotak di posisi ini pagi tadi menyuruh owner
> mengambil connection string. **Itu sudah tidak berlaku** — lihat alasannya di
> "Kenapa jalur pg_dump buntu" di bawah.
>
> Backup harian kini berjalan lewat **`.github/workflows/backup-dramaapp.yml`**,
> memakai REST API dengan kunci `service_role` milik dramaapp sendiri. **Nol
> kredensial baru, nol ketergantungan ke pihak lain.**
>
> | Butir | Status | Bukti |
> |---|---|---|
> | Bucket `db-backups` privat | ✅ dibuat AI | dibaca ulang -> `"public": false`; uji anonim 3 cara semua ditolak (`400` tanpa authorization; jalur publik menjawab `Bucket not found` — jawaban yang benar untuk bucket privat) |
> | `SUPABASE_PROJECT_REF` | ✅ terpasang | `nvblmpkwyzbpdbshyvzw` |
> | `SUPABASE_STORAGE_BUCKET` | ✅ terpasang | `db-backups` |
> | `SUPABASE_SERVICE_ROLE_KEY` | ✅ terpasang | dialirkan dari `.env.local` ke `gh secret set` lewat variabel shell — nilainya tak pernah tercetak |
> | **Backup pertama** | ✅ **ada di bucket** | `dramaapp-20261014-041514.sql.gz`, **103.093 byte**, dibaca ulang dari sisi server |
> | `DATABASE_URL_BACKUP` | ⛔ **tidak dipakai lagi** | jalur pg_dump buntu; lihat bawah |
>
> **Isi backup pertama:** `app_data` 36 · `dramas` 40 · `likes` 46 · `wallets` 3 ·
> `unlocks` 0 baris — tiap angka dicocokkan dengan hitungan server sendiri.
>
> ### 🔴 Bug yang ketemu saat mengerjakan ini (dan sudah diperbaiki)
>
> `scripts/export-dramaapp-sql.mjs` **menghasilkan backup yang tidak bisa
> dipulihkan**, dan tak ada gejalanya: berkasnya utuh, ukurannya wajar.
> Sebabnya ia menyalin struktur tabel dari `supabase_migrations/`, sementara
> folder itu sudah menyimpang dari produksi — kolom `dramas.status` (migrasi
> 7 September) tidak pernah terpasang di sana karena owner tak punya akses DDL.
>
> Akibatnya: tabel dibuat 28 kolom, lalu `insert` menyebut kolom ke-29 ->
> Postgres menolak (`42703`) -> karena seluruh data dibungkus satu
> `begin; ... commit;`, **SELURUH pemulihan dibatalkan. Nol baris masuk.**
>
> Diukur sebelum/sesudah pada berkas sungguhan:
>
> | Versi | `dramas` | Vonis |
> |---|---|---|
> | sebelum | insert pakai 29 kolom, dideklarasikan **28** | 🔴 tidak bisa dipulihkan |
> | sesudah | insert pakai 29, dideklarasikan **29** | ✅ bisa dipulihkan |
>
> **Perbaikannya:** struktur kini dibaca dari **database hidup** (spec PostgREST
> memuat tipe, default, NOT NULL, dan primary key termasuk PK gabungan), bukan
> dari berkas. Berkas migrasi tetap dipakai sesudahnya — idempoten, dan ia
> menyumbang index + badan fungsi RPC yang tak terbaca dari spec.
>
> ### Kenapa folder migrasi tidak bisa dipercaya sebagai gambaran produksi
>
> Ketiganya fakta terukur, bukan dugaan:
> 1. `2026-08-29_schema_lengkap_dramaapp.sql` tidak memuat `dramas.status`.
> 2. `mark_existing_movies.sql:27` masih menyebut **`public.dramas`** — schema
>    sebelum pindah. Dijalankan di database kosong, ia ERROR.
> 3. `2026-10-05_playly_link_unduhan.sql` membuat tabel yang **di produksi tidak
>    ada** (dijawab `PGRST205`) — migrasinya belum pernah dijalankan.
>
> ### Gerbang yang dipasang, dan buktinya bekerja
>
> Tiap gerbang diuji dengan sengaja merusak masukannya, bukan cuma ditulis:
>
> | Gerbang | Uji | Hasil |
> |---|---|---|
> | kolom hidup wajib ikut ke struktur | kolom `status` dibuang | ditolak, exit 1 |
> | jumlah baris vs hitungan **server** | 1 baris `dramas` dibuang | ditolak, exit 1 |
> | paginasi tak boleh berhenti dini | `PAGE=10`, berhenti di halaman 1 | ditolak, exit 1 (3 tabel) |
> | tiap tabel wajib ada isinya | `wallets` dikosongkan | ditolak, exit 1 |
> | struktur tabel wajib ada | `create table likes` dihapus | ditolak, exit 1 |
> | kunci rahasia tak boleh ikut | kunci disisipkan ke berkas | ditolak, exit 1 |
> | berkas wajib ada di bucket | nama berkas palsu | ditolak, exit 1 |
>
> 🪤 **Satu gerbang sempat LOLOS saat diuji dan itu temuan nyata.** Versi pertama
> membandingkan jumlah `insert` dengan daftar baris di memori — dua angka yang
> berasal dari sumber yang sama. Satu baris dibuang, keduanya ikut turun,
> gerbang tetap hijau. Diperbaiki dengan pembanding dari LUAR: hitungan baris
> milik server sendiri (`Content-Range` PostgREST). Pelajarannya: gerbang yang
> belum pernah terlihat MENOLAK belum terbukti apa pun.

---

## Jalur pg_dump — BUNTU, disimpan untuk nanti

### 🔴 Kenapa jalur pg_dump buntu

Project Supabase `nvblmpkwyzbpdbshyvzw` **bukan milik owner dramaapp.** Ia milik
pihak lain dan dipakai bersama beberapa aplikasi; dramaapp menempati schema
`dramaapp`. Tercatat di `antrean-deploy.md:732`, `HANDOFF.md`, dan
`docs/migrasi-railway-daftar-env.md:180`.

Akibatnya menu **Settings → Database → Connection string** tidak terbuka untuk
owner. Dan memintanya ke pemilik project bukan permintaan kecil: connection
string role `postgres` membuka **seluruh** database milik pihak lain, bukan cuma
bagian kita. Keputusan senada sudah diambil 2026-08-31 — menolak meminta
Personal Access Token pemilik project, dengan alasan yang sama persis.

**Jalan naik kelas yang sopan dan masuk akal:** minta pemilik project membuat
role read-only yang **hanya** boleh membaca schema `dramaapp`, lalu pakai role
itu — bukan `postgres`. Ada presedennya: beliau sudah pernah menjalankan
`grant usage on schema dramaapp to service_role` di SQL Editor untuk kita.

Jalur pg_dump lebih kuat (tidak bergantung PostgREST, dan membaca definisi
fungsi langsung dari database), jadi `backup-schemas.yml` **tidak dihapus** —
hanya jadwal hariannya dimatikan supaya tidak mengirim email gagal tiap hari.

Langkah di bawah berlaku **kalau** suatu saat role itu tersedia.

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

### 3. Pasang secret (tinggal 1 — tiga lainnya sudah terpasang, lihat kotak di atas)

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
