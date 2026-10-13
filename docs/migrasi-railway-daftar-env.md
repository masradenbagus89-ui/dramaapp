# Daftar periksa environment variables — migrasi Vercel → Railway

> Dibuat 2026-10-12 untuk Tahap 2 langkah 3. Isinya **hanya NAMA** variabel, tidak pernah nilainya.
> Nilai rahasia disalin dari panel Vercel ke panel Railway **langsung**, lewat pengelola password —
> jangan pernah lewat chat, jangan pernah ditulis ke berkas di dalam repo ini.
>
> Sumber daftar: pencarian `process.env.X` dan pola `env.X` di `app/`, `lib/`, `components/`,
> ditambah 5 nama yang **dirakit saat aplikasi jalan** (`lib/playly-unduhan-domain.ts:38`) sehingga
> tidak akan muncul di pencarian biasa. Total **41 nama**.

## Cara memakai

1. Buka panel Vercel → Settings → Environment Variables.
2. Untuk tiap baris di bawah, isi kolom **Ada di Vercel?** (ya / tidak).
3. Salin nilainya ke panel Railway, lalu centang **Sudah di Railway?**.
4. Baris bertanda ❌ **jangan diisi sama sekali**.
5. Jangan ada satu pun sel yang kosong atau "tidak tahu" sebelum lanjut ke Tahap 3.

---

## ⛔ Tiga aturan yang tidak boleh dilanggar

**1. JANGAN menyalin isi `.env.local` apa adanya ke Railway.**
Berkas itu berisi `ENABLE_DEMO_TOPUP=1` tanpa kunci pembayaran Midtrans. Kombinasi itu membuat
`app/api/coins/topup/route.ts:87-89` mengkredit koin **tanpa pembayaran apa pun**, langsung ke
database produksi. Susun daftar dari tabel di bawah, satu per satu.

**2. `PLAYLY_ENCRYPTION_KEY` harus nilai yang SAMA PERSIS dengan di Vercel.**
Kunci API Playly tersimpan **terenkripsi di dalam database**. Mengisi dengan kunci baru yang diacak
sendiri **sama rusaknya** dengan mengosongkannya — `lib/playly.ts:273-276` menolak membukanya.
Gejalanya menipu: daftar film terlihat penuh (dibaca dari salinan cadangan), tapi tidak ada yang
bisa diputar.

**3. `NEXT_PUBLIC_SITE_URL` JANGAN diisi selama Tahap 2-5.**
Biarkan kosong supaya situs uji Railway memberi tahu Google "aku bukan yang asli" — itu yang
melindungi peringatan pencarian situs lama selama pengujian. Akibat yang harus diketahui: tombol
Bagikan di situs uji akan menampilkan alamat vercel. **Itu benar, bukan bug.**
Nilai berawalan `NEXT_PUBLIC_` disematkan **saat build**, jadi mengubahnya nanti wajib diikuti
**redeploy**, bukan sekadar restart.

---

## ✅ TAHAP 3 SELESAI — Railway HIDUP & TERBUKTI (2026-10-12)

**Project Railway:** `ravishing-adaptation` · workspace `jalurlangit-ops` · service `dramaapp`
**Alamat uji:** `https://dramaapp-production-9e88.up.railway.app`
**Region:** Southeast Asia · **Replicas:** 1 · **Repo:** `masradenbagus89-ui/dramaapp`

### Gerbang bukti — semua hijau, diuji dari luar

| Gerbang | Hasil |
|---|---|
| `/api/health` | `{"ok":true,"sumberData":"database"}` — **stabil 3× pengukuran** |
| Katalog | **64 judul**, identik dengan Vercel (cadangan hanya 42 → terbukti dari database) |
| Smoke test | 12 halaman semuanya HTTP 200 |
| Kunci Playly | **bekerja** — 112 sampul film, angka identik dengan produksi |
| `/playly` → `/film` | HTTP 308, pengalihan lama masih bekerja |
| Fitur rilis terakhir | kaki situs + tab "SERIES TERBARU" ikut tayang |
| Perlindungan SEO | canonical & `robots.txt` menunjuk Vercel — **sesuai rancangan** |
| Kuota bandwidth | sampul film diambil langsung dari server Playly, **tidak lewat Railway** |

### Riwayat build — dua kegagalan yang BENAR

Build #1 dan #2 **gagal**, dan itu hasil yang diinginkan: pagar `periksaSetelanSupabase`
(rilis `8514427`) menolak menyala tanpa env Supabase. Pesannya muncul sebagai
`Failed to collect page data for /api/admin/playly/imdb` — rantainya route → `@/lib/store` →
`lib/supabase` → lempar saat modul dievaluasi. Tanpa pagar itu, build akan **berhasil** dan
situs menyala sambil diam-diam membuang data penonton.

### Keputusan teknis saat eksekusi

⚠️ **`NODE_ENV` sengaja TIDAK diset di Railway.** Sempat dimasukkan lalu dibuang: `tailwindcss`
dan `typescript` ada di `devDependencies` dan dibutuhkan saat build, sedangkan `NODE_ENV=production`
bisa membuat `npm ci` melewatinya → build gagal. Tidak ada yang hilang: build #1 terbukti sudah
berjalan dalam mode produksi (pagar memicu) padahal `NODE_ENV` belum diset sama sekali — Next.js
menyetelnya sendiri.

### Dari mana 13 nilai didapat

`vercel env pull` **hanya bisa menarik 3** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_VIDEO_BASE_URL`) — sisanya bertipe **Secret** di Vercel yang memang write-only
("You can't reveal this value after saving"). Selebihnya:

- `AUTH_SECRET`, `ADMIN_PASSWORD`, `OMDB_API_KEY` ← `.env.local` komputer owner
  ⚠️ **Nilainya mungkin BERBEDA dari produksi Vercel.** Akibatnya password admin di Railway
  adalah yang dari komputer, bukan yang di situs lama. Bukan bug — tapi kalau login admin
  ditolak, inilah sebabnya.
- `DASHBOARD_API_URL`, `DASHBOARD_API_KEY_HEADER` ← `docs/sambungan-dashboard-webmovie.md`
  (diperiksa: `DASHBOARD_API_KEY` di dokumen itu KOSONG, jadi nol kunci asli bocor ke repo)
- `PLAYLY_API_KEY`, `PLAYLY_WEBHOOK_SECRET` ← salinan milik owner
  `DASHBOARD_API_KEY` diisi SAMA dengan `PLAYLY_API_KEY` (nama lama, `lib/playly.ts:315`)
- `PLAYLY_ENCRYPTION_KEY`, `HARDLINK_AGENT_SECRET` ← **dibuat acak baru**

### 🔑 Kenapa `PLAYLY_ENCRYPTION_KEY` boleh dibuat baru — diverifikasi, bukan diasumsikan

`getPlaylyKey()` (`lib/playly.ts`) mendahulukan database atas env:
`const rec = await getPlaylyKeyRecord(); if (rec) return decryptSecret(rec.secret);`
Jadi kalau ada baris tersimpan, env TIDAK dipakai dan kunci lama wajib ada.

Diperiksa langsung ke Supabase: `app_data?key=eq.playly:key` membalas **`[]`** — kosong.
Maka `readPlaylyKeyFromEnv()` yang dipakai, dan kunci enkripsi lama tidak dibutuhkan sama sekali.
Kunci baru tetap diisi supaya fitur "simpan kunci lewat panel admin" tetap hidup.

⚠️ **`HARDLINK_AGENT_SECRET` kini BERBEDA antara Railway dan PC backup.** Aman sekarang: agent
tetap melapor ke Vercel, dan Railway membaca alamat tunnel dari dokumen `videobase` di database
yang sama. **Wajib disamakan sebelum Vercel dipensiunkan**, kalau tidak alamat tunnel berhenti
diperbarui tanpa satu pun gejala (`lib/store.ts:758-765`).

### Berkas berisi kunci asli yang HARUS dihapus setelah tidak dipakai

`.env.railway.local` dan `.env.vercel.local` (keduanya sudah terabaikan git — Vercel CLI ikut
menambahkan pola `.env*` ke `.gitignore`, menutup celah yang dicatat di Tahap 1).
⚠️ `.env.railway.local` adalah **satu-satunya tempat** `PLAYLY_ENCRYPTION_KEY` dan
`HARDLINK_AGENT_SECRET` yang baru — salin ke pengelola password SEBELUM menghapusnya.

---

## HASIL PENDATAAN PANEL VERCEL — 2026-10-12

Panel Vercel memuat **21 variabel**. Setelah dicocokkan ke kode: **13 dipakai, 8 pensiun.**

### 13 yang WAJIB dipindah ke Railway

| Nama | Scope di Vercel | Tipe |
|---|---|---|
| `SUPABASE_URL` | Production **and Preview** | Config |
| `SUPABASE_SERVICE_ROLE_KEY` | Production **and Preview** | Config ⚠️ (lihat catatan bawah) |
| `AUTH_SECRET` | Production and Preview | 🔒 Secret |
| `ADMIN_PASSWORD` | Production and Preview | 🔒 Secret |
| `HARDLINK_AGENT_SECRET` | Production and Preview | 🔒 Secret |
| `NEXT_PUBLIC_VIDEO_BASE_URL` | Production and Preview | Config |
| `OMDB_API_KEY` | Production and Preview | 🔒 Secret |
| `PLAYLY_ENCRYPTION_KEY` | Production and Preview | 🔒 Secret |
| `PLAYLY_API_KEY` | **Production saja** | 🔒 Secret |
| `PLAYLY_WEBHOOK_SECRET` | **Production saja** | 🔒 Secret |
| `DASHBOARD_API_URL` | Production and Preview | 🔒 Secret |
| `DASHBOARD_API_KEY` | Production and Preview | 🔒 Secret |
| `DASHBOARD_API_KEY_HEADER` | Production and Preview | 🔒 Secret |

### 8 yang PENSIUN — JANGAN dipindah ke Railway

Diverifikasi 2026-10-12: **nol pemakai** di `app/`, `lib/`, `components/`, `scripts/`.

- `GITHUB_TOKEN`, `GITHUB_REPO_NAME`, `GITHUB_REPO_OWNER` — dulu panel admin menyimpan drama
  lewat GitHub API; sejak pindah ke Supabase tidak dipakai lagi (`SUPABASE_MIGRATION.md:57`).
- `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL`, `REDIS_URL` —
  sisa Upstash Redis sebelum pindah ke Supabase.

Jangan dihapus dari Vercel selama Vercel masih jadi jalur mundur. Cukup jangan disalin.

### Yang dipakai kode tapi TIDAK ADA di Vercel (artinya memang kosong di produksi)

`NEXT_PUBLIC_SITE_URL` (→ jatuh ke default `https://dramaapp.vercel.app`, lihat aturan 3) ·
`TMDB_API_KEY` · `MIDTRANS_SERVER_KEY` · `MIDTRANS_CLIENT_KEY` · `MIDTRANS_IS_PRODUCTION` ·
`ENABLE_DEMO_TOPUP` · `NEXT_PUBLIC_ADSENSE_*` · `EXTERNAL_VIDEO_*` · `DASHBOARD_VIDEO_HOSTS` ·
`VIDEO_BASE_ALLOWED_SUFFIXES` · `PLAYLY_API_URL` · `PLAYLY_EMBED_HOSTS` · `PLAYLY_EMBED_PATH` ·
`PLAYLY_CREATOR` · `PLAYLY_UNDUHAN_DOMAIN_*`

Semuanya opsional dan punya nilai bawaan di kode. **Biarkan kosong juga di Railway** — kecuali
`ENABLE_DEMO_TOPUP` yang memang tidak boleh ada (aturan 1).

### ✅ Scope Preview — pertanyaan yang sudah tertutup

`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` **aktif di Production DAN Preview**. Itu syarat
pagar `periksaSetelanSupabase` (rilis `8514427`): build preview Vercel tidak akan gagal.

### ⚠️ Utang yang diketahui — `SUPABASE_SERVICE_ROLE_KEY` tersimpan sebagai Config, bukan Secret

Vercel menandainya "Needs Attention": *"looks like a secret, but its value is visible to anyone
with access."* Ini kunci service_role — menembus seluruh RLS — tapi justru satu-satunya yang
tersimpan dalam mode yang nilainya bisa dibaca di panel.

Penilaian jujur: **tidak darurat.** Project Vercel berpaket **Hobby** (personal), jadi "anyone
with access" praktis = owner sendiri. Risiko tersisa: kalau akun Vercel diakses orang lain,
kunci terbaca tanpa hambatan.

⛔ **JANGAN klik "Rotate Variable" selama migrasi.** Kunci ini dipakai di `.env.local`,
`.github/workflows/backup-schemas.yml`, skrip Python di `scripts/`, dan nanti Railway —
mengganti di satu tempat mematikan yang lain. Dan "rotating at the source" berarti di dashboard
Supabase, sementara project `nvblmpkwyzbpdbshyvzw` **milik Kang Dedi, bukan owner**
(`docs/lintasai/INDEX.md:55`). Rotasi kunci + migrasi hosting bersamaan = dua perubahan berisiko
bertumpuk; kalau rusak, penyebabnya tak bisa dibedakan.

Di Railway masalah ini **membaik sendiri**: Railway menyembunyikan nilai variabel secara bawaan.
Rotasi terencana bisa dikerjakan belakangan, terpisah dari migrasi.

---

## A. Wajib — tanpa ini website tidak berfungsi benar

| Nama | Untuk apa | Kalau kosong | Ada di Vercel? | Sudah di Railway? |
|---|---|---|---|---|
| `SUPABASE_URL` | Alamat database | ⚠️ **Jebakan "dua wajah"** — situs tetap terlihat normal tapi data penonton hilang tiap deploy | | |
| `SUPABASE_SERVICE_ROLE_KEY` | Kunci database | sama seperti di atas | | |
| `AUTH_SECRET` | Penanda tangan cookie login | Login gagal total (balasan 500) | | |
| `ADMIN_PASSWORD` | Password admin bersama | Login admin gagal (500) | | |

> `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` harus **keduanya** terisi atau **keduanya** kosong.
> Mengisi hanya salah satu membuat aplikasi mati keras saat dimuat (`lib/supabase.ts:74-82`) —
> itu justru perilaku yang baik, karena kesalahannya langsung terlihat.

---

## B. Playly — tanpa ini film tidak bisa diputar

| Nama | Untuk apa | Kalau kosong | Ada di Vercel? | Sudah di Railway? |
|---|---|---|---|---|
| `PLAYLY_ENCRYPTION_KEY` | Membuka kunci Playly yang tersimpan di DB | Film terlihat lengkap tapi **tidak bisa diputar**. ⛔ Lihat aturan 2 | | |
| `PLAYLY_API_KEY` | Kunci mitra Playly | Jatuh ke katalog publik. Catatan: kunci sah bisa tersimpan di Vercel dengan nama lama `DASHBOARD_API_KEY` | | |
| `PLAYLY_WEBHOOK_SECRET` | Membuktikan webhook benar dari Playly | Webhook balas 503 → **film baru berhenti masuk**, nol gejala | | |
| `PLAYLY_API_URL` | Alamat API Playly | Pakai bawaan `playly-hosting-video.up.railway.app` | | |
| `PLAYLY_EMBED_HOSTS` | Domain pemutar tambahan | Pakai bawaan | | |
| `PLAYLY_EMBED_PATH` | Pola alamat embed | Pakai bawaan `/id/{id}/embed` | | |
| `PLAYLY_CREATOR` | Nama akun kreator DramaKu | Pakai bawaan | | |
| `PLAYLY_UNDUHAN_DOMAIN_GOOGLE` | Domain link unduhan tambahan | Pakai bawaan | | |
| `PLAYLY_UNDUHAN_DOMAIN_TELEGRAM` | idem | Pakai bawaan | | |
| `PLAYLY_UNDUHAN_DOMAIN_CAST` | idem | ⚠️ bawaannya **kosong** → link `cast` ditolak | | |
| `PLAYLY_UNDUHAN_DOMAIN_MEGA` | idem | Pakai bawaan | | |
| `PLAYLY_UNDUHAN_DOMAIN_SENDCM` | idem | Pakai bawaan | | |

---

## C. Video dari PC backup

| Nama | Untuk apa | Kalau kosong | Ada di Vercel? | Sudah di Railway? |
|---|---|---|---|---|
| `NEXT_PUBLIC_VIDEO_BASE_URL` | Alamat tunnel PC backup | Baris di database menang atas env, jadi biasanya tetap jalan | | |
| `HARDLINK_AGENT_SECRET` | Token agar agen PC boleh lapor alamat | Endpoint agen balas 500 | | |
| `VIDEO_BASE_ALLOWED_SUFFIXES` | Daftar akhiran host yang boleh | Alamat baru ditolak 400. ⚠️ **Tidak ada di `.env.example`** — paling mudah terlewat | | |

---

## D. Data film (IMDb/TMDB)

| Nama | Untuk apa | Kalau kosong | Ada di Vercel? | Sudah di Railway? |
|---|---|---|---|---|
| `OMDB_API_KEY` | Ambil data & poster dari OMDb | Fitur "buat dari IMDb" mati | | |
| `TMDB_API_KEY` | Banner lebar | Banner jatuh ke poster biasa | | |

---

## E. Pembayaran

| Nama | Untuk apa | Kalau kosong | Ada di Vercel? | Sudah di Railway? |
|---|---|---|---|---|
| `MIDTRANS_SERVER_KEY` | Kunci server pembayaran | Top-up berbayar mati. ⚠️ Kalau webhook sudah diarahkan ke Railway tapi kunci ini belum ada → balasan 403, **uang masuk tapi koin tidak** | | |
| `MIDTRANS_CLIENT_KEY` | Kunci halaman pembayaran | Top-up mati | | |
| `MIDTRANS_IS_PRODUCTION` | Saklar sandbox vs asli | Default sandbox | | |
| ❌ `ENABLE_DEMO_TOPUP` | **JANGAN DIISI** | Lihat aturan 1 — koin gratis tak terbatas | **—** | **JANGAN** |

---

## F. Dashboard upload video (opsional)

| Nama | Kalau kosong | Ada di Vercel? | Sudah di Railway? |
|---|---|---|---|
| `DASHBOARD_API_URL` | `/api/videos` balas 503, bagian "Video terbaru" di `/discover` hilang. ⚠️ **Terbukti terisi di Vercel** padahal tidak ada di `.env.local` (`lib/playly-alamat.ts:12-20`) | | |
| `DASHBOARD_API_KEY` | idem | | |
| `DASHBOARD_API_KEY_HEADER` | Kosong = pakai `Authorization: Bearer` | | |
| `DASHBOARD_VIDEO_HOSTS` | Kosong = semua https diterima | | |

---

## G. Video pihak ketiga (opsional)

| Nama | Kalau kosong | Ada di Vercel? | Sudah di Railway? |
|---|---|---|---|
| `EXTERNAL_VIDEO_API_URL` | `/api/external-videos` balas 503 | | |
| `EXTERNAL_VIDEO_API_KEY` | idem | | |
| `EXTERNAL_VIDEO_API_KEY_HEADER` | — | | |
| `EXTERNAL_VIDEO_API_KEY_PARAM` | — | | |
| `EXTERNAL_VIDEO_EMBED_HOSTS` | ⚠️ Kosong = **SEMUA video ditolak** (disengaja, fail-closed) | | |

---

## H. Iklan (opsional)

| Nama | Kalau kosong | Ada di Vercel? | Sudah di Railway? |
|---|---|---|---|
| `NEXT_PUBLIC_ADSENSE_CLIENT` | Slot jatuh ke iklan manual | | |
| `NEXT_PUBLIC_ADSENSE_SLOT` | idem | | |
| `NEXT_PUBLIC_AD_BANNER_HTML` | Kalau diisi, **menimpa** AdSense | | |

---

## I. Khusus — jangan diisi / diisi platform

| Nama | Keterangan |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | ⛔ **Jangan diisi selama Tahap 2-5** (aturan 3). Baru diisi di Tahap 6 |
| `NODE_ENV` | Diisi platform otomatis. Pastikan Railway menyetelnya `production` — kalau tidak, cookie login dikirim tanpa penanda aman |
| `PORT` | Diisi Railway otomatis. `next start` membacanya sendiri — jangan disetel manual |
| `IZINKAN_MODE_BERKAS` | **Baru**, dipasang bersama pagar Tahap 2. Jangan diisi di Railway. Hanya untuk komputer pengembang yang perlu `npm run build` tanpa database |
| `SUPABASE_KEY` | Nama cadangan untuk `SUPABASE_SERVICE_ROLE_KEY`. Tidak perlu kalau nama utama sudah diisi |
| `NEXT_PUBLIC_SUPABASE_URL` | Nama cadangan untuk `SUPABASE_URL`. Tidak perlu |
| `E2E_BASE` | Hanya untuk skrip uji di komputer, bukan untuk hosting |

---

## Workspace Railway & penyegelan variabel — KEPUTUSAN 2026-10-12

**Workspace: `jalurlangit-ops` (paket PRO).** Ini akun kerja milik atasan owner; 18 project rekan
lain sudah ada di sana, jadi menaruh DramaKu di situ wajar secara organisasi dan kapasitasnya
sudah ditanggung.

**Yang perlu disadari:** workspace itu punya ±10 Admin, dan **pembatasan per-project TIDAK BISA
menolong** — dokumentasi Railway menyatakan *"Workspace admins can access every project, whether
or not they belong to a group"*, dan fitur Access Groups pun hanya ada di paket Enterprise
(<https://docs.railway.com/enterprise/access-groups>). Jadi tiap Admin di sana bisa membuka tab
Variables DramaKu dan membaca kunci induk database.

**Penangkalnya ada: Sealed Variables** (<https://docs.railway.com/guides/managing-secrets-on-railway>)
— variabel write-only. Railway tetap menyuntikkan nilainya ke aplikasi, tapi tak pernah
menampilkannya di UI dan menolak mengembalikannya lewat API. Bukan cuma 10 Admin itu yang tak
bisa membacanya — **tak seorang pun bisa**, termasuk owner.

### ⚠️ URUTANNYA PENTING — JANGAN segel di awal

**Tahap 3: isi variabel BIASA, jangan segel apa pun.** Penyegelan bersifat **permanen** (nilai
bisa diganti, tapi tak pernah bisa dibaca lagi, dan tak bisa dikembalikan ke mode biasa). Kalau
disegel sebelum terbukti, satu salah ketik di antara 13 nilai tidak bisa diperiksa — yang tersisa
cuma menebak dan menimpa satu per satu.

**Segel baru dipertimbangkan SESUDAH Tahap 5**, saat seluruh nilai sudah terbukti benar lewat
pengujian. Kandidat yang layak disegel saat itu: `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`,
`ADMIN_PASSWORD`, `HARDLINK_AGENT_SECRET`, `OMDB_API_KEY`, `PLAYLY_ENCRYPTION_KEY`,
`PLAYLY_API_KEY`, `PLAYLY_WEBHOOK_SECRET`, `DASHBOARD_API_KEY`. Tidak perlu disegel:
`SUPABASE_URL` (cuma alamat) dan `NEXT_PUBLIC_VIDEO_BASE_URL` (memang dikirim ke browser).

⚠️ **`PLAYLY_ENCRYPTION_KEY` paling berbahaya untuk disegel.** Ia membuka kunci API Playly yang
tersimpan terenkripsi di database. Disegel + salinannya hilang = tidak akan pernah bisa dibuka
lagi, dan gejalanya menipu (daftar film penuh, nol yang bisa diputar).

**Kalau akhirnya memilih TIDAK menyegel — itu sah.** Yang dilepas: ±10 Admin bisa membaca semua
kunci, dan risikonya tumbuh sendiri tiap ada anggota baru di workspace. Penggantinya yang murah
dan tidak permanen: **nyalakan 2FA di akun Railway** (layar People 2026-10-12 menunjukkan kolom
2FA **Off** untuk semua anggota, termasuk owner).

### WAJIB dikerjakan sebelum mengisi Railway

**Salin semua nilai dari panel Vercel ke pengelola password milik owner sendiri.** Bukan demi
penyegelan — tapi karena saat ini satu-satunya tempat sebagian kunci berada adalah panel Vercel.
Hilang akses ke sana = `PLAYLY_ENCRYPTION_KEY` hilang bersamanya, dan ia tak bisa dibuat ulang.

---

## Region Railway — KEPUTUSAN 2026-10-12

**Pakai Singapore (`asia-southeast1`).**

Region Supabase **tidak bisa dipastikan** — owner tidak punya akses dashboard project
`nvblmpkwyzbpdbshyvzw` (milik Kang Dedi, `docs/lintasai/INDEX.md:55`), dan dua catatan internal
saling bertentangan: `INDEX.md` + `docs/permintaan-restart-supabase.md` menyebut pooler
`aws-0-ap-northeast-1` (**Tokyo**, koneksi BERHASIL 74 ms), sedangkan `HANDOFF.md:2117` menyebut
`aws-1-ap-southeast-1` (**Singapore**, koneksi GAGAL — password tidak berlaku, jadi host-nya pun
belum tentu benar). Bukti lebih berat ke Tokyo, tapi **tidak terverifikasi**.

Singapore dipilih karena **benar di kedua kemungkinan**:
- Paling dekat dengan penonton Indonesia — manfaat pasti, tak bergantung lokasi database.
- Kalau database di Tokyo: Singapore→Tokyo ±70 ms, masih jauh di dalam margin.
- Kalau database di Singapore: pilihan terbaik.

⚠️ **Kenapa region tidak boleh asal pilih — margin lebih tipis dari dugaan.** Diukur 2026-10-12
dari komputer owner, query paling ringan (`dramas?select=id&limit=1`) berayun **0,26 – 3,32
detik**. Batas tunggu kode adalah 6 detik per percobaan (`lib/supabase.ts`), angka yang dulu
dipilih khusus agar muat dalam batas 20 detik Vercel. Jadi puncak 3,3 detik sudah memakan lebih
dari separuh jatah. Cocok dengan `INDEX.md`: Supabase tercatat berayun antara 0,02 dtk dan
timeout total dalam hitungan menit (`PGRST002`). Region yang jauh akan menggerus sisa margin itu.

**Cara memastikan belakangan (opsional):** minta Kang Dedi membuka Supabase Dashboard → Settings
→ General → Region. Kalau ternyata Tokyo dan terbukti bermasalah, region Railway bisa dipindah —
itu setelan panel, bukan perubahan kode.

---

## Catatan tambahan untuk langkah 4 Tahap 2

Saat membuka panel Vercel, catat juga **scope** dua variabel ini — Production, Preview, atau
Development:

- `SUPABASE_URL` → scope: ................
- `SUPABASE_SERVICE_ROLE_KEY` → scope: ................

**Kenapa penting:** pagar yang akan dipasang di `lib/supabase.ts` membuat build gagal kalau kedua
variabel itu kosong di mode produksi. Kalau keduanya **tidak** aktif untuk scope Preview, build
preview Vercel akan mulai gagal setelah pagar di-push. Ini satu-satunya cara perubahan Tahap 2 bisa
mengganggu Vercel, dan dicek **sebelum** push, bukan sesudah.

## Dua hal lain yang dicatat di langkah yang sama

- **Nama repo GitHub yang di-deploy Vercel** (Settings → Git):
  ✅ **`masradenbagus89-ui/dramaapp`** — dipastikan owner 2026-10-12.
  Ini sama dengan remote `origin` di komputer owner, dan dikonfirmasi silang oleh
  rilis `8514427`: push ke `origin` diikuti `/api/health` tayang di produksi.
  **Railway WAJIB disambungkan ke repo ini**, bukan ke cermin `ojokesusu/dramaku`.
- **Versi Node**:
  ⚠️ **Tidak tercetak di mana pun** — dicari owner 2026-10-12 di Build Logs (133 baris; log
  melompat dari "Installing dependencies" langsung ke `Running "npm run build"`) maupun di
  Settings. Vercel memakai pengaturan bawaan dan tidak mencetaknya.
  **Keputusan: pakai Node 22 di Railway.** Dasarnya bukan tebakan — `next@16.2.9` mensyaratkan
  `node >=20.9.0` (`package-lock.json`), proyek tidak mengunci versi di mana pun (tidak ada
  `engines`, `.nvmrc`, `.node-version`), dan tidak ada kode yang bergantung pada versi tertentu.
  Node 22 = versi LTS yang didukung penuh.
  **Cara memastikan sesudah deploy pertama Railway:** baca baris versi Node di log build Railway;
  kalau di bawah 20.9, build akan gagal dengan pesan yang jelas — bukan rusak diam-diam.

  ✅ **HASIL NYATA (dibaca 2026-10-13 dari panel Railway, bukan dari rencana): `node@24.21.0`,
  BUKAN Node 22.** Railway memilih sendiri versi terbarunya karena proyek ini memang tidak
  mengunci versi di mana pun. **Tidak perlu diperbaiki** — syaratnya `next@16.2.9` →
  `node >=20.9.0` (dibaca dari `package-lock.json`), dan 24.21.0 memenuhinya dengan lebar.
  Terbukti empiris, bukan teori: build sukses · `/api/health` → `{"ok":true,"sumberData":"database"}`
  · 8 halaman 200 · katalog identik Vercel (nol selisih per-`id`).
  **Yang dikoreksi di sini adalah CATATANNYA, bukan Railway-nya** — supaya sesi berikutnya tidak
  membuang waktu mencari "kenapa Node 22 tidak terpasang" atau, lebih buruk, memaksa turun ke 22
  tanpa alasan. Kalau suatu hari versi Node perlu dikunci, caranya tambahkan `engines` di
  `package.json` — jangan andalkan ingatan panel.
