# Sambungan Dashboard → WebMovie

> Dibuat 2026-08-12. Menghubungkan **playly-dashboard** (tempat upload) ke
> **WebMovie/dramaapp** (tempat tonton).

## Peta alurnya

```
Browser pengunjung
      │  buka /discover
      ▼
WebMovie (dramaapp.vercel.app)
      │  GET /api/videos          ← jalur milik kita sendiri
      ▼
Server WebMovie  ──────────────►  Dashboard (playly-dashboard.vercel.app)
                  GET /api/videos          │  baca tabel
                                           ▼
                                      Supabase (data + Storage)
```

**Kenapa lewat server WebMovie, bukan browser langsung ke dashboard:**

1. **CORS tidak ikut main.** Aturan CORS (izin situs domain lain memanggil API)
   hanya ditegakkan browser. Panggilan server-ke-server bebas dari itu.
2. **Kunci API tidak bocor** — kalau nanti dashboard butuh kunci, kuncinya tetap
   di server WebMovie, tidak pernah sampai ke browser pengunjung.
3. **Bisa disimpan sebentar (cache 60 detik)**, jadi dashboard tidak dihujani
   permintaan tiap kali ada pengunjung.
4. **Alamat dashboard tidak terlihat publik.**

## Berkas di sisi WebMovie (repo ini)

| Berkas | Tugasnya |
|---|---|
| [lib/dashboard-videos.ts](../lib/dashboard-videos.ts) | Bentuk data standar + penerjemah JSON dashboard + aturan alamat |
| [app/api/videos/route.ts](../app/api/videos/route.ts) | `GET /api/videos` — daftar video |
| [app/api/videos/[id]/route.ts](../app/api/videos/[id]/route.ts) | `GET /api/videos/:id` — detail 1 video |
| [app/components/DashboardVideoGrid.tsx](../app/components/DashboardVideoGrid.tsx) | Grid thumbnail + judul, klik untuk putar |
| [app/discover/page.tsx](../app/discover/page.tsx) | Menyisipkan grid itu ke halaman `/discover` |
| [tests/dashboard-videos.test.ts](../tests/dashboard-videos.test.ts) | 18 tes pengunci perilaku |
| [app/api/demo-dashboard-videos/](../app/api/demo-dashboard-videos/) | **API tiruan** untuk uji tanpa dashboard asli — hapus kalau sudah tidak perlu |

## Setelan (env) di WebMovie

```env
# WAJIB — alamat endpoint daftar video di dashboard.
DASHBOARD_API_URL=https://playly-dashboard.vercel.app/api/videos

# Opsional — kalau dashboard minta kunci.
DASHBOARD_API_KEY=
# Nama header tempat kunci dititipkan. KOSONG = "Authorization: Bearer <kunci>".
# Playly memakai X-Playly-Key (lihat "Cara tahu nama header" di bawah).
DASHBOARD_API_KEY_HEADER=X-Playly-Key

# Opsional — batasi domain berkas video yang boleh diputar, dipisah koma.
# KOSONG = semua alamat https diterima.
DASHBOARD_VIDEO_HOSTS=xxxx.supabase.co
```

⚠️ Selama `DASHBOARD_API_URL` kosong, bagian "Video terbaru" **tidak muncul sama
sekali** di `/discover`. Ini disengaja: lebih baik tidak tampil daripada halaman
publik menampilkan pesan error hanya karena setelan belum diisi.

## Cara tahu nama header kunci yang dipakai dashboard

Kunci yang benar tetap ditolak kalau dititipkan di header yang salah. Cara
memastikannya tanpa perlu membaca kode dashboard — panggil endpoint-nya dan
perhatikan **perubahan pesan errornya**:

```powershell
$u = "https://playly-dashboard.vercel.app/api/videos"
# 1. tanpa kunci sama sekali
curl.exe -s $u
# 2. tebak nama headernya, isi nilai ngawur
curl.exe -s -H "X-Playly-Key: ngawur" $u
```

Bacaannya:

| Balasan berubah dari | Menjadi | Artinya |
|---|---|---|
| `missing_key` | `invalid_key` | ✅ Nama headernya **benar**, tinggal isi kunci asli |
| `missing_key` | `missing_key` (tetap) | ❌ Header itu tidak dibaca — coba nama lain |

Petunjuk lain: header balasan `Access-Control-Allow-Headers` sering menyebut nama
header yang diterima. Playly membalas `Content-Type, X-Playly-Key` — dari situlah
nama `X-Playly-Key` ketahuan (diuji 2026-08-16).

Setelah nama header diketahui, isi `DASHBOARD_API_KEY_HEADER` dengan nama itu.
Kalau dashboard memakai cara umum `Authorization: Bearer`, biarkan kosong.

---

# Cara menguji

## A. Uji lokal TANPA dashboard asli (paling cepat)

Repo ini punya API tiruan yang meniru bentuk balasan dashboard.

```powershell
# 1. Arahkan setelan ke API tiruan, lalu jalankan
$env:DASHBOARD_API_URL = "http://localhost:3013/api/demo-dashboard-videos"
npm run dev -- -p 3013

# 2. Buka di browser
#    http://localhost:3013/discover   -> bagian "Video terbaru" muncul, klik = putar

# 3. Periksa datanya langsung (di terminal lain)
curl http://localhost:3013/api/videos
curl http://localhost:3013/api/videos/vid-001
```

Yang harus terlihat: **2 video lolos, 1 dilewati** (`"skipped":1`). Yang dilewati
itu memang sengaja beralamat `http`, untuk membuktikan penyaringnya bekerja.

## B. Uji lokal DENGAN dashboard asli

Jalankan dua aplikasi sekaligus di port berbeda:

```powershell
# Terminal 1 — dashboard
cd <folder-dashboard>
npm run dev            # biasanya port 3000

# Terminal 2 — WebMovie
cd D:\Users\user26\Dramaapp
$env:DASHBOARD_API_URL = "http://localhost:3000/api/videos"
npm run dev -- -p 3013
```

Urutan memeriksanya — **selalu dari hulu ke hilir**, supaya tahu di mana putusnya:

| Langkah | Perintah | Kalau gagal, artinya |
|---|---|---|
| 1 | `curl http://localhost:3000/api/videos` | Masalah di dashboard/Supabase, belum menyangkut WebMovie |
| 2 | `curl http://localhost:3013/api/videos` | Dashboard sehat, tapi WebMovie tidak bisa menjangkaunya (cek `DASHBOARD_API_URL`) |
| 3 | Buka `http://localhost:3013/discover` | Data sampai, masalahnya di tampilan |

## C. Uji setelah deploy ke Vercel

1. **Isi env di WebMovie.** Vercel → project `dramaapp` → Settings →
   Environment Variables → tambah `DASHBOARD_API_URL` =
   `https://playly-dashboard.vercel.app/api/videos`.
   ⚠️ **Wajib deploy ulang** setelah menambah env — env baru tidak terbaca oleh
   build lama.
2. **Uji endpoint dashboard langsung** dari komputer mana pun:
   ```bash
   curl https://playly-dashboard.vercel.app/api/videos
   ```
3. **Uji jalur WebMovie:**
   ```bash
   curl https://dramaapp.vercel.app/api/videos
   ```
4. **Buka** `https://dramaapp.vercel.app/discover` dan klik salah satu video.

### Membaca log kalau ada yang aneh

Vercel → project → tab **Logs**. Jalur ini sengaja mencatat alasan tiap video
yang dibuang, contoh:

```
[videos] 1 video dilewati: [ { reason: 'alamat video harus https', value: 'http://...' } ]
```

## Daftar masalah yang paling sering terjadi

| Gejala | Penyebab paling mungkin | Cara pastikan |
|---|---|---|
| `/discover` tidak menampilkan bagian "Video terbaru" | `DASHBOARD_API_URL` kosong di lingkungan itu | Cek Environment Variables di Vercel, lalu deploy ulang |
| Balasan `503` | Sama seperti di atas | Pesannya menyebut nama env yang kurang |
| Balasan `502` | Dashboard mati, salah alamat, atau balasannya bukan JSON | Uji `curl` ke dashboard langsung (langkah 2 di atas) |
| `"count":0` padahal dashboard punya data | Nama kolom di dashboard belum dikenali penerjemah | Lihat log `[videos] ... dilewati`, lalu tambahkan nama kolomnya di daftar konstanta [lib/dashboard-videos.ts](../lib/dashboard-videos.ts) |
| Video muncul tapi hitam/tidak jalan saat diputar | Alamat Storage tidak publik, atau berkasnya bukan format yang didukung browser | Tempel `videoUrl` langsung di tab browser baru — kalau di situ pun gagal, masalahnya di Supabase Storage, bukan di kode ini |
| Semua video "dilewati" | Alamatnya `http`, atau `DASHBOARD_VIDEO_HOSTS` diisi domain yang salah | Baca alasan di log server |

## Kalau nanti mau browser memanggil dashboard LANGSUNG

Barulah CORS diperlukan. Kode siap-tempelnya sudah disiapkan di
[docs/dashboard-api-videos/](dashboard-api-videos/) — pasang `lib/cors.ts` di
dashboard dan isi env `CORS_ALLOWED_ORIGINS=https://dramaapp.vercel.app`.

Cara memastikan CORS-nya benar:

```bash
curl -i -X OPTIONS https://playly-dashboard.vercel.app/api/videos \
  -H "Origin: https://dramaapp.vercel.app" \
  -H "Access-Control-Request-Method: GET"
```

Harus muncul baris `Access-Control-Allow-Origin: https://dramaapp.vercel.app`.
Kalau yang muncul `*`, jangan dipakai bersama cookie/login — itu membuka jalan
pencurian sesi.
