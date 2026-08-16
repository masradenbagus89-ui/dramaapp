# Serah-terima deploy — jalur terima video dari API luar (2026-08-15)

> Untuk rekan yang memegang akses **Vercel**. Dibuat oleh sisi developer yang
> TIDAK punya akses Vercel. Semua klaim di sini punya bukti; yang belum terbukti
> ditandai ❓ supaya tidak ada yang dianggap beres padahal belum.

## ⚠️ Baca ini dulu — kode belum sampai ke repo yang di-deploy

| Repo | Isi terkini | Vercel |
|---|---|---|
| `ojokesusu/dramaku` (**privat**) | ✅ commit baru ada di sini (`d93a1fb`) | ❓ tidak ada satu pun catatan deployment |
| `masradenbagus89-ui/dramaapp` (publik) | ❌ masih tertinggal di `954c9ca` | ✅ **ini yang dipantau Vercel** |

Buktinya (dibaca lewat GitHub API pada 2026-08-15):

- Di `masradenbagus89-ui/dramaapp` ada riwayat deployment `environment=Production`
  yang dibuat `vercel[bot]`, terakhir 2026-08-14 11:59 UTC.
- Commit `954c9ca` di repo itu punya laporan status **`Vercel: success`** yang
  menunjuk ke `https://vercel.com/dramaapp/dramaapp/...`.
- Di `ojokesusu/dramaku` daftar deployment-nya **kosong**.

**Artinya: menekan tombol deploy saja tidak cukup.** Commit `6bb2539` dan `d93a1fb`
harus dipindahkan dulu ke `masradenbagus89-ui/dramaapp`, baru Vercel bisa melihatnya.

### Cara memindahkannya (untuk yang punya akses tulis ke `dramaapp`)

Dijalankan di folder salinan `masradenbagus89-ui/dramaapp`:

```bash
git remote add dramaku https://github.com/ojokesusu/dramaku.git   # sekali saja
git fetch dramaku
git merge dramaku/main        # tidak ada konflik yang diketahui per 2026-08-15
git push origin main          # push ini yang memicu deploy Vercel
```

Butuh akses **baca** ke `ojokesusu/dramaku` (repo privat). Kalau tidak punya,
minta undangan ke pemilik repo, atau minta kiriman berkas patch.

---

## Apa yang berubah di rilis ini

Dua **jalur terima data video dari API luar**, terpisah dan tidak saling mengganggu.
Pemutar lama (berkas `.mp4` dari PC backup) **tidak disentuh sama sekali**.

| Jalur | Untuk apa | Alamat barunya |
|---|---|---|
| **A — dashboard upload** (playly-dashboard) | berkas `.mp4` di Supabase Storage, diputar dengan tag `<video>` biasa | `GET /api/videos`, `GET /api/videos/:id` |
| **B — API pihak lain** | player milik penyedia, ditampilkan lewat `<iframe>` | `GET /api/external-videos`, halaman `/video-eksternal` |

Penjelasan lengkap: `docs/sambungan-dashboard-webmovie.md` dan `docs/video-eksternal.md`.

## Setelan (env) — TIDAK ada yang wajib untuk deploy ini

Ini bagian yang menenangkan: **deploy bisa dilakukan tanpa mengisi satu env pun.**
Semua setelan baru bersifat opsional dan dirancang gagal-aman:

| Nama setelan | Kalau DIKOSONGKAN | Kalau diisi |
|---|---|---|
| `DASHBOARD_API_URL` | bagian "Video terbaru" di `/discover` **tidak muncul sama sekali** (bukan error), `/api/videos` membalas 503 | bagian itu muncul dan menarik data dari dashboard |
| `DASHBOARD_API_KEY` | tidak dikirim kunci apa pun | dikirim sebagai `Authorization: Bearer` dari server |
| `DASHBOARD_VIDEO_HOSTS` | semua alamat `https` diterima | hanya domain yang terdaftar yang diputar |
| `EXTERNAL_VIDEO_API_URL` | `/api/external-videos` membalas 503, halaman `/video-eksternal` menampilkan pesan setelan belum diisi | jalur B aktif |
| `EXTERNAL_VIDEO_EMBED_HOSTS` | ⚠️ **semua video jalur B ditolak** (disengaja: tolak dulu semua) | hanya domain player yang terdaftar boleh tampil |

Semua sudah terdaftar di `.env.example` beserta akibatnya. Tidak ada satu pun yang
memakai awalan `NEXT_PUBLIC_`, jadi kunci API tidak ikut terkirim ke browser pengunjung.

⚠️ Kalau nanti env ditambahkan di Vercel: **wajib deploy ulang**. Env baru tidak
terbaca oleh build lama.

## Smoke test setelah deploy (5 menit)

Uji cepat "yang penting masih jalan?", dijalankan **setelah** deploy selesai:

| # | Yang dicek | Cara | Hasil yang benar |
|---|---|---|---|
| 1 | Halaman utama tidak rusak | buka `/discover` | tampil seperti biasa; bagian "Video terbaru" **tidak ada** selama env kosong — ini normal |
| 2 | Jalur A hidup dan jujur soal setelan | `curl https://<domain>/api/videos` | `503` + pesan menyebut `DASHBOARD_API_URL` belum di-set |
| 3 | Jalur B hidup dan jujur soal setelan | `curl https://<domain>/api/external-videos` | `503` + pesan menyebut `EXTERNAL_VIDEO_API_URL` |
| 4 | Gerbang parameter bekerja | `curl "https://<domain>/api/external-videos?page=abc"` | `400` "Nomor halaman harus angka." |
| 5 | Fitur lama tidak terganggu | buka 1 halaman drama + putar 1 video lama | jalan seperti sebelumnya |

Kalau nomor 2 dan 3 membalas **500** (bukan 503), berarti ada yang tidak beres —
lihat bagian rollback.

## Rollback (tombol undo)

**Satu baris:** di Vercel → project `dramaapp` → tab **Deployments** → pilih deployment
tanggal 2026-08-14 (commit `954c9ca`) → **Promote to Production** / *Instant Rollback*.

Kenapa aman: rilis ini **hanya menambah** berkas baru + 8 baris di `/discover` yang
dijaga syarat env. Tidak ada perubahan skema database, tidak ada perubahan pada
alur login, pembayaran, maupun pemutar video lama.

## Yang perlu diketahui, tapi bukan penghalang deploy

1. **Dua API tiruan ikut ter-deploy dan bisa dibuka publik:**
   `/api/demo-dashboard-videos` dan `/api/demo-video-provider`. Isinya cuma data
   contoh (video CC0 + alamat player publik), **tidak ada data pengguna atau
   rahasia**. Gunanya untuk menguji sambungan tanpa server asli. Sebaiknya dihapus
   setelah dashboard asli tersambung.
2. **Robot GitHub Actions di `ojokesusu/dramaku` semuanya merah, TAPI bukan karena
   kode.** Pesan resminya: *"The job was not started because recent account payments
   have failed or your spending limit needs to be increased."* Jadi robotnya tidak
   pernah dijalankan GitHub — termasuk "Penjaga Kebocoran Rahasia", "Backup Schemas",
   dan "Penjaga Anti-Tidur Database". ⚠️ Yang terakhir itu berarti **penjaga agar
   database Supabase tidak tertidur juga mati** sejak tagihan bermasalah — layak
   diperiksa terpisah, tidak berhubungan dengan rilis ini.

## Bukti mutu rilis ini (sudah dijalankan di komputer developer)

- `npm test` → **131 tes lulus** (13 berkas), termasuk 44 tes khusus dua jalur ini.
- `npx tsc --noEmit` (pemeriksaan tipe) → bersih.
- Uji hidup dengan API tiruan: jalur A 2 video lolos & 1 ditolak karena `http`;
  jalur B 3 lolos & 2 ditolak (domain asing + `http`); `/discover` dan
  `/video-eksternal` HTTP 200.
- `npm run build` (build produksi) → **lulus**, dan semua alamat baru terdaftar:
  `/api/videos`, `/api/videos/[id]`, `/api/external-videos`, `/video-eksternal`.
- ❓ **Belum diuji:** sambungan ke dashboard asli dan API penyedia asli — alamat
  keduanya belum ada. Build Vercel juga bisa berbeda dari build lokal kalau ada
  env yang hanya ada di Vercel.
