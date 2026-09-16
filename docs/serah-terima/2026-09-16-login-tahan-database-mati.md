# 2026-09-16 — Login tahan saat database mati (pemicu: error 522 di halaman login)

## 1. Apa yang berubah + kenapa

Owner melapor tidak bisa masuk Dashboard DramaKu. Kotak merah di halaman login menampilkan
**halaman error Cloudflare mentah-mentah** — ribuan karakter HTML yang diawali
`Supabase select 522: <!DOCTYPE html> ... supabase.co | 522: Connection timed out`.

**Sebab sebenarnya: server database Supabase berhenti menjawab query.** Bukan password salah,
bukan akun terhapus, bukan bug kode kita. Dibuktikan hari itu juga dari luar:

| Yang diuji | Hasil saat gangguan | Artinya |
|---|---|---|
| `GET /api/dramas`, `/api/ads`, `/api/admins` (butuh database) | **500** setelah **±20 detik**, badan kosong, konsisten 3× | Semua jalur database menggantung sampai fungsi Vercel mati |
| `/`, `/login`, `/playly`, `/beranda` (halaman statis) | **200**, < 1,2 detik | Situs & Vercel sendiri sehat |
| Gerbang Supabase (`/rest/v1/`, root) | **401 / 404** dalam 0,25–0,6 detik | Gerbang hidup; yang menggantung ada di belakangnya (PostgREST/Postgres) |
| status.supabase.com | `API Gateway: degraded_performance`, insiden belum selesai sejak 2026-08-14 | Cocok dengan gejala, tapi **belum bisa dipastikan** ini insiden yang sama |

**Gangguannya sudah berlalu sendiri** (terverifikasi pukul ±09:05, lihat bagian 5) — jadi yang
diperbaiki di sini BUKAN penyebabnya (itu di pihak Supabase, di luar kendali kode kita),
melainkan **tiga cacat kita sendiri yang membuat gangguan itu jauh lebih buruk dari seharusnya**:

1. **Pesan internal bocor mentah ke browser.** `ensureOk()` menempelkan seluruh badan balasan
   ke pesan error, route login meneruskan `err.message` apa adanya, halaman login mencetaknya.
   Akibat ganda: penonton tak bisa membacanya, dan host + jalur internal terpampang di browser
   siapa pun. Sekarang badan balasan **diringkas di akarnya** — satu baris, tanpa tag HTML.
2. **Tidak ada batas waktu sendiri.** Request menggantung sampai fungsi Vercel mati di detik
   ke-20, jadi yang sampai ke penonton cuma 500 kosong tanpa penjelasan. Sekarang ada batas
   6 detik per percobaan (waktu normal terukur 0,8–1,15 detik, jadi batasnya ±5× longgar).
3. **Tidak ada percobaan ulang.** Gangguan sekejap langsung menggagalkan login. Sekarang
   operasi **BACA** dicoba ulang sekali.

⚠️ **Percobaan ulang SENGAJA hanya untuk BACA.** Operasi tulis tidak lewat jalur itu:
`coin_add` dan `like_change` menambah nilai, dan timeout tak pernah bisa memastikan apakah
server sudah terlanjur mengerjakannya — mengulang berarti risiko **koin bertambah dua kali**.

Di halaman login, penonton kini membaca: *"Server database sedang tidak merespons... Ini BUKAN
karena email atau password kamu salah"*. Tanpa kalimat itu, satu-satunya tebakan yang masuk akal
baginya adalah password salah — lalu ia mencoba puluhan kali sia-sia sampai kena rate-limit.

## 2. Berkas yang disentuh

- `lib/supabase.ts` — **dipakai hampir seluruh situs** (`lib/store.ts`, `lib/dramas.ts`, semua
  route admin, koin, komentar, Playly). Perubahannya menambah ketahanan; bentuk data yang
  dikembalikan `sbSelect()` **tidak berubah**, jadi pemanggil lain tidak perlu disesuaikan.
  Penambahan: `ringkasBalasan()` (diekspor, agar bisa dites) + `ambilBaca()` (internal).
  `sbUpsert`/`sbDelete`/`sbRpc` **sengaja tidak diubah** — lihat alasan koin di atas.
- `app/api/auth/login/route.ts` — blok `catch` berhenti membocorkan pesan internal; membalas
  **503** saat gangguan database (dulu 500), dengan pesan berbahasa manusia.
- `tests/supabase-tahan-gangguan.test.ts` — **baru**, 8 tes.
- `tests/login-database-mati.test.ts` — **baru**, 4 tes.

**Efek samping yang menguntungkan:** karena badan error diringkas di akarnya (`ensureOk`),
±20 route lain yang masih meneruskan `err.message` ke browser **ikut berhenti memuntahkan HTML
raksasa** tanpa satu pun disentuh. Mereka masih membocorkan detail teknis singkat — lihat
bagian 7.

## 3. Butuh SQL migrasi?

**Tidak.** Tidak ada tabel/kolom baru.

## 4. Butuh env baru di Vercel?

**Tidak.** Tidak ada variable baru; tidak ada nilai env yang perlu diubah.

## 5. Bukti yang sudah dijalankan

- `npx tsc --noEmit` → **0 error**
- `npm test` → **644 tes lulus, 48 berkas, 0 gagal** (termasuk 12 tes baru)
- `rm -rf .next && npm run build` → **sukses**
- Bukti gangguan sudah berlalu, diukur dari luar setelah perbaikan selesai:
  - `GET /api/dramas` → **200** (5 sampel: 0,88 / 1,06 / 1,09 / 1,13 / 1,15 detik)
  - `GET /api/ads` → **200** (0,80–0,84 detik)
  - `POST /api/auth/login` dengan email yang jelas tidak terdaftar → **401 "Email atau password
    salah."** dalam **1,19 detik**. Ini bukti jalur login **sudah menyentuh database dan berhasil
    memverifikasi akun** — sebelumnya jalur ini yang membalas 522.
- ❓ **Belum terverifikasi:** perbaikan ini **belum tayang di produksi** (belum di-push, lihat
  catatan rilis di bawah). Pesan ramah yang baru baru bisa dilihat penonton setelah deploy.
- ❓ **Belum bisa dipastikan:** apakah gangguan Supabase tadi adalah insiden "API Gateway
  degraded" yang terdaftar di status.supabase.com, atau masalah khusus project kita (misal
  koneksi penuh / kuota). Memastikannya butuh Dashboard Supabase → Reports, yang hanya ada di
  tangan owner.

## 6. Cara owner mencoba sendiri

**Sekarang juga (tanpa menunggu deploy) — situs sudah pulih:**
1. Buka `https://dramaapp.vercel.app/login`
2. Isi email + password admin, klik **Masuk**
3. Harus langsung masuk ke Dashboard. Kalau masih gagal, perhatikan tulisan di kotak merah —
   kalau bunyinya "Password admin salah", itu memang password; kalau menyebut server/database,
   gangguannya kambuh.

**Sesudah perbaikan ini di-deploy — cara memastikan pesan barunya benar:**
Gangguan database tidak bisa dipesan kapan munculnya, jadi yang bisa dicek dari layar hanyalah
bahwa login normal tetap berjalan seperti biasa (langkah 1-3 di atas). Perilaku saat database
mati sudah dikunci oleh 12 tes otomatis, bukan oleh pemeriksaan mata.

## 7. Catatan untuk owner (butuh keputusan)

1. **Rilis.** Perubahan ini **belum di-push ke mana pun**. Branch kerja saat ini
   `feat/playly-webhook` juga masih memuat pekerjaan Playly yang belum di-commit — sebaiknya
   perbaikan login ini **di-commit terpisah** supaya bisa dirilis sendiri tanpa menunggu Playly.
2. **Sisa kebocoran pesan error (tawaran, belum dikerjakan).** ±20 route lain masih meneruskan
   `err.message` mentah ke browser — sekarang isinya sudah pendek, tapi masih menyebut detail
   teknis internal. Merapikannya jadi pola yang sama seperti login = satu tugas terpisah.
3. **Berkas `payload.json`** di akar repo belum terlacak git dan sepertinya sisa uji coba.
   Tidak saya sentuh — owner yang menentukan dihapus atau tidak.
