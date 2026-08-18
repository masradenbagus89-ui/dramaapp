# Integrasi Playly — DramaKu sebagai "Mitra"

> Dibuat 2026-08-18. Kondisi terverifikasi ada di bagian **Bukti uji** di bawah.

Playly adalah partner yang punya video. Mereka memberi DramaKu sebuah
**API key** (kunci akses — teks rahasia yang membuktikan bahwa yang meminta
data memang DramaKu). Dokumen ini menjelaskan cara memasangnya, cara memilih
video, dan apa yang terjadi kalau ada yang salah.

Istilah yang dipakai berulang:

| Istilah | Artinya dalam satu kalimat |
|---|---|
| **API key** | kunci akses berupa teks rahasia, di sini selalu diawali `plyk_` |
| **enkripsi** | mengacak teks supaya tak terbaca tanpa kunci pembukanya |
| **embed / iframe** | menumpangkan pemutar video milik situs lain di halaman kita |
| **env / Environment Variable** | setelan rahasia yang disimpan di server, bukan di kode |
| **masked** | bentuk tersamar, mis. `plyk_••••••••json` |

---

## 1. Cara pakai (untuk admin)

### Langkah 1 — pasang kunci pengacak, sekali saja

Sebelum kunci Playly bisa disimpan, server butuh **kunci pengacak** untuk
mengenkripsi kunci itu. Buat sekali dengan perintah:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Hasilnya (64 karakter) diisikan ke `PLAYLY_ENCRYPTION_KEY`:

- **Lokal**: berkas `.env.local`
- **Vercel**: Settings → Environment Variables → lalu **deploy ulang**

> ⚠️ Jangan mengganti nilai ini setelah kunci Playly tersimpan. Kunci lama jadi
> tidak bisa dibuka lagi, dan harus dimasukkan ulang lewat halaman setelan.
> (Kalau terlanjur: halaman setelan akan menampilkan pesan yang menjelaskan ini,
> tinggal tempel ulang kunci Playly-nya.)

### Langkah 2 — masukkan kunci Playly

Buka **`/admin/settings/playly`** → tempel kunci `plyk_...` → **Simpan kunci** →
klik **Uji sambungan**.

Yang ditampilkan setelah tersimpan hanya bentuk tersamarnya
(`plyk_••••••••json`). Kunci aslinya tidak bisa dilihat lagi dari halaman mana
pun — hanya bisa diganti. Ini disengaja: layar admin bisa terlihat orang lain,
dan isi halaman bisa dibaca lewat DevTools browser.

### Langkah 3 — pilih video dan kaitkan ke drama

Buka **`/admin/videos/playly`**:

1. Daftar video Playly muncul (judul, durasi, kreator).
2. Klik satu video → muncul pratinjau pemutarnya + kode tempel `<iframe>`.
3. Pilih **drama DramaKu** tujuannya, isi **nomor episode** kalau relevan.
4. **Simpan kaitan.**

Video yang sudah dikaitkan langsung tampil di halaman publik
**`/discover`** pada bagian "Video dari Playly".

Melepas kaitan: tombol **Lepas** pada daftar di bawah. Video aslinya di Playly
tidak ikut terhapus — yang dilepas hanya tampilannya di DramaKu.

---

## 2. Cara kerjanya (untuk pengembang)

```
browser admin ──► /api/admin/playly/*  (server DramaKu)  ──► API Playly
                        │                                   header X-Playly-Key
                        └─► database (kunci TERENKRIPSI + kaitan video)

pengunjung ──► /discover  ──► baca kaitan dari database ──► <iframe> Playly
                              (TIDAK memanggil Playly, TIDAK menyentuh kunci)
```

### Berkas yang terlibat

| Berkas | Isinya |
|---|---|
| `lib/playly.ts` | enkripsi/dekripsi kunci, penyamaran, penerjemah JSON, panggilan ke Playly |
| `lib/store.ts` | penyimpanan kunci + kaitan video (bagian "INTEGRASI PLAYLY") |
| `app/api/admin/playly/key/` | pasang / lihat status / cabut kunci |
| `app/api/admin/playly/videos/` | ambil daftar video dari Playly |
| `app/api/admin/playly/embeds/` | simpan / lihat / lepas kaitan video↔drama |
| `app/admin/settings/playly/` | halaman setelan kunci |
| `app/admin/videos/playly/` | halaman pilih & pasang video |
| `app/components/PlaylyRow.tsx` | tampilan video Playly di `/discover` |
| `tests/playly.test.ts` | 46 tes pengunci perilaku |

### Penyimpanan

Dua dokumen di tabel `app_data` yang **sudah ada** — jadi fitur ini **tidak
perlu migrasi SQL** di Supabase:

- `playly:key` → `{ secret, masked, updatedAt, updatedBy }`
- `playly:embeds` → daftar kaitan video↔drama

Tanpa Supabase (mode lokal), keduanya masuk `data/playly.json` yang sudah
didaftarkan di `.gitignore`.

### Empat pagar keamanan

1. **Kunci tidak pernah sampai ke browser.** Semua panggilan ke Playly terjadi
   di server. Yang keluar dari API hanya bentuk tersamar.
2. **Kunci disimpan terenkripsi** (AES-256-GCM). Orang yang bisa mengintip isi
   database hanya melihat teks acak seperti `v1.X5VgO1qD...`. GCM juga memberi
   "segel": kalau isinya diubah orang, proses buka-kunci gagal — bukan diam-diam
   menghasilkan kunci ngawur.
3. **Alamat player diambil ulang dari Playly**, bukan dari browser admin. Saat
   menyimpan kaitan, browser hanya mengirim `videoId` + `dramaId`; alamat embed,
   judul, durasi, dan kreator diambil server langsung dari Playly.
4. **Pagar domain.** Hanya `playly-dashboard.vercel.app` (dan subdomainnya) yang
   boleh masuk `<iframe>`, dan wajib `https`. Domain lain dibuang beserta
   alasannya. Kalau Playly memakai domain lain untuk playernya, tambahkan di
   `PLAYLY_EMBED_HOSTS` — daftar itu **menambah**, tidak menghapus domain resmi.

Ditambah pagar yang sudah dipakai endpoint lain di project ini: sesi admin
bertanda-tangan (cookie HttpOnly), penolakan permintaan lintas-domain (anti-CSRF),
dan pembatas laju per-IP.

### Setelan env

| Nama | Wajib? | Kalau kosong |
|---|---|---|
| `PLAYLY_ENCRYPTION_KEY` | **ya** (kalau fitur dipakai) | halaman setelan menolak menyimpan kunci, dengan pesan + perintah pembuatnya |
| `PLAYLY_API_URL` | tidak | pakai `https://playly-dashboard.vercel.app` |
| `PLAYLY_API_KEY` | tidak | tidak apa-apa; ini hanya jalan pintas. Kunci di database selalu menang |
| `PLAYLY_EMBED_HOSTS` | tidak | hanya domain Playly resmi yang diizinkan |
| `PLAYLY_EMBED_PATH` | tidak | pola `/embed/{id}` |

---

## 3. Kalau ada yang salah

Pesan error sengaja ditulis dalam bahasa yang bisa ditindaklanjuti, bukan
"HTTP 401". Yang mungkin muncul:

| Pesan | Artinya | Yang perlu dilakukan |
|---|---|---|
| "Kunci ditolak Playly…" | kunci salah / sudah dicabut Playly | minta kunci baru ke Playly, perbarui di halaman setelan |
| "Playly tidak bisa dihubungi…" | server Playly mati / alamat salah | cek `PLAYLY_API_URL`, cek status Playly |
| "Playly tidak menjawab dalam 10 detik" | Playly lambat | coba lagi; halaman kita sengaja tidak ikut menggantung |
| "Playly membatasi jumlah permintaan" | terlalu sering memanggil | tunggu sebentar |
| "Kunci API Playly belum dipasang" | belum ada kunci | pasang di `/admin/settings/playly` |
| "PLAYLY_ENCRYPTION_KEY belum di-set…" | kunci pengacak belum ada | jalankan perintah di Langkah 1 |
| "Kunci tersimpan tidak bisa dibuka…" | `PLAYLY_ENCRYPTION_KEY` diganti | tempel ulang kunci Playly di halaman setelan |
| "domain player belum diizinkan" | video dari domain di luar daftar | tambahkan di `PLAYLY_EMBED_HOSTS` kalau memang sah |

Halaman `/discover` **tidak ikut rusak** kalau Playly bermasalah — bagian
Playly hanya tampil kalau ada video yang sudah tersimpan, dan alamatnya sudah
ada di database.

---

## 4. Bukti uji (2026-08-18)

**✅ Terverifikasi** — `npm test` 181 lulus (14 berkas, termasuk 46 tes Playly) ·
`tsc --noEmit` bersih · `npm run build` sukses dengan 5 route baru terdaftar ·
uji hidup lewat Playly tiruan + server produksi di port 3031:

| Yang diuji | Hasil |
|---|---|
| Akses tanpa login | `/api/admin/playly/key` & `/videos` → **401**; halaman → "Akses ditolak" |
| Kunci format salah (`sk_live_...`) | ditolak dengan pesan yang menyebut awalan `plyk_` |
| Simpan kunci benar | tersimpan; status balik `plyk_••••••••json` |
| Isi berkas penyimpanan | `v1.X5VgO1qD…` — kunci asli **tidak ada** di dalamnya |
| Ambil daftar video | 2 video lolos, 1 dibuang dengan alasan "domain player belum diizinkan" |
| Kaitkan ke drama | tersimpan + tampil di `/discover` |
| Kaitkan video domain asing | ditolak |
| Kaitkan ke drama yang tidak ada | ditolak (404) |
| POST dari domain asing (CSRF) | **403** |
| Halaman publik `/discover` | 200, memuat judul video, **tidak** memuat kunci apa pun |
| Kunci salah → ambil video | "Kunci ditolak Playly. Perbarui kuncinya di Setelan → Playly." |
| Playly dimatikan → ambil video | "Playly tidak bisa dihubungi…"; halaman admin & `/discover` tetap 200 |
| Lepas kaitan | bagian Playly hilang dari `/discover` |

**❓ BELUM terverifikasi** — sambungan ke **Playly yang sungguhan**: kunci
`plyk_` asli belum ada, jadi bentuk JSON balasan mereka belum pernah dilihat
langsung. Dua hal yang mungkin perlu disesuaikan setelah dicoba dengan kunci asli:

1. **Nama field** di JSON Playly. Penerjemah sudah mencoba banyak nama yang lazim
   (`title`/`judul`/`name`, `creator`/`author`/`uploader`, dst). Kalau Playly
   memakai nama lain, tambahkan namanya di daftar konstanta di `lib/playly.ts`
   bagian "PENERJEMAH DAFTAR VIDEO" — logikanya tidak perlu diubah.
2. **Pola alamat embed** `/embed/{id}`, yang dipakai **hanya kalau** Playly tidak
   mengirim `embedUrl` di JSON-nya. Kalau polanya beda, ubah lewat
   `PLAYLY_EMBED_PATH` tanpa mengubah kode.

Cara memastikan: pasang kunci asli → `/admin/settings/playly` → **Uji sambungan**.
Kalau jumlah video terbaca > 0, dua hal di atas sudah benar.
