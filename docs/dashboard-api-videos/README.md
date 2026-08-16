# Kode siap-tempel untuk dashboard (playly-dashboard)

> ⚠️ **Status jujur:** berkas di folder ini **belum pernah dijalankan** — repo dashboard
> ada di komputer lain, jadi aku tidak bisa mengujinya. Yang sudah terbukti jalan
> adalah sisi WebMovie (lihat `docs/sambungan-dashboard-webmovie.md`).
>
> Salin berkas di sini ke repo dashboard, sesuaikan nama tabel/kolom, lalu uji
> dengan langkah di bagian "Cara menguji" paling bawah.

## Isi folder

| Berkas di sini | Salin ke dashboard sebagai |
|---|---|
| `videos-route.ts` | `app/api/videos/route.ts` |
| `video-detail-route.ts` | `app/api/videos/[id]/route.ts` |
| `cors.ts` | `lib/cors.ts` |

Kalau dashboard-mu memakai **Pages Router** (`pages/api/...`) atau Vite + Vercel
Functions (`api/*.ts`), lihat bagian "Kalau bukan App Router" di bawah.

## Asumsi yang HARUS kamu cek dulu

Aku tidak bisa membaca database-mu, jadi kode ini menganggap ada tabel bernama
`videos` dengan kolom berikut. **Kalau namanya beda, ubah di bagian atas
`videos-route.ts`** (ada konstanta `TABEL` dan `KOLOM`):

| Kolom | Isi |
|---|---|
| `id` | pengenal unik (uuid atau teks) |
| `title` | judul video |
| `description` | deskripsi |
| `video_url` | alamat berkas video di Supabase Storage (https) |
| `thumbnail_url` | alamat gambar sampul (boleh kosong) |
| `created_at` | waktu upload |

Kalau tabelmu belum punya `thumbnail_url`, hapus saja namanya dari daftar `KOLOM` —
sisi WebMovie sudah menangani thumbnail yang kosong.

## Env yang dibutuhkan di dashboard

```env
# Sudah ada (dipakai endpoint upload-mu)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Baru — untuk CORS. Isi domain yang boleh memanggil dari browser.
# Dipisah koma. JANGAN diisi * kalau nanti pakai cookie/login.
CORS_ALLOWED_ORIGINS=https://dramaapp.vercel.app,http://localhost:3000
```

## Catatan penting soal CORS

Dengan cara sambung yang kamu pilih (WebMovie mengambil lewat servernya sendiri),
**CORS sebenarnya tidak diperlukan** — aturan CORS hanya ditegakkan browser, dan
panggilan server-ke-server tidak melewatinya.

`cors.ts` tetap disertakan sesuai permintaanmu, berguna kalau nanti:
- ada halaman lain yang memanggil dashboard **langsung dari browser**, atau
- kamu mau menguji endpoint dari konsol browser.

Yang dihindari di sini: `Access-Control-Allow-Origin: *` digabung dengan
credentials (cookie/token ikut terkirim) — kombinasi itu membuka jalan pencurian
sesi. Karena itu daftar domainnya spesifik, diambil dari env.

## Keamanan yang sudah dipasang di kode ini

- **Kunci service role tidak pernah keluar ke browser** — hanya dipakai di server.
- **Hanya kolom yang didaftarkan yang dikirim** (`select=` eksplisit), jadi kolom
  internal tidak ikut bocor kalau nanti tabelnya bertambah.
- **Filter id di-encode** sebelum masuk query, bukan disambung mentah.
- **Batas jumlah** (`LIMIT_MAKS`) supaya satu permintaan tidak menarik ribuan baris.
- **Status yang benar**: 200 sukses · 400 id ngawur · 404 tidak ada · 500 error
  server · 503 env belum diisi.

## Kalau bukan App Router

**Pages Router** (`pages/api/videos.ts`): ganti `export async function GET()`
menjadi `export default async function handler(req, res)`, ambil id dari
`req.query.id`, dan balas dengan `res.status(200).json(...)`. Logika query
Supabase-nya sama persis.

**Vite + Vercel Functions** (`api/videos.ts`): bentuknya sama dengan Pages Router
(`export default function handler(req, res)`).

## Cara menguji setelah dipasang

```bash
# 1. Jalankan dashboard di lokal
npm run dev

# 2. Daftar video
curl http://localhost:3000/api/videos

# 3. Detail 1 video (ganti <id> dengan id asli dari langkah 2)
curl http://localhost:3000/api/videos/<id>

# 4. Uji CORS (harus muncul header Access-Control-Allow-Origin)
curl -i -X OPTIONS http://localhost:3000/api/videos \
  -H "Origin: https://dramaapp.vercel.app" \
  -H "Access-Control-Request-Method: GET"
```

Kalau langkah 2 membalas `{"ok":true,"videos":[...]}` berisi `video_url` yang
diawali `https://`, berarti dashboard siap disambungkan ke WebMovie.
