# Materi Presentasi DramaApp / DramaKu
**Presentasi: Selasa, 2 Juni 2026**
App live: https://dramaapp.vercel.app/

> Catatan: file ini = naskah/poin yang perlu kamu jelaskan saat presentasi.
> Urutan slide bisa ikut urutan bab di bawah ini.

---

## 1. Pembukaan — Apa itu DramaApp?

- **DramaApp (nama brand: DramaKu)** adalah aplikasi **streaming drama China pendek** (short drama), gratis, bisa dibuka di HP & web.
- Konsepnya mirip gabungan **Netflix + TikTok**: ada halaman browsing katalog (Netflix-style) dan halaman *Shorts* (scroll vertikal TikTok-style).
- Sudah **online & bisa diakses publik** di: `https://dramaapp.vercel.app/`
- Saat ini berisi **33 judul drama**, dengan 24 poster, dalam 7 kategori: Romance, Tycoon, Harem, Time Travel, Action, Comedy, Fantasy.

**Kalimat pembuka yang bisa dipakai:**
> "DramaApp adalah platform streaming drama China pendek yang saya bangun dari nol, sudah online dan bisa diakses siapa saja. Saya akan jelaskan dari dua sisi: sisi teknis aplikasinya, dan sistem yang saya pakai selama membangunnya."

---

## 2. Teknologi yang Dipakai (Tech Stack)

| Komponen | Teknologi | Kenapa dipilih |
|---|---|---|
| **Framework** | Next.js 16.2.4 (App Router) | Framework React modern, satu kerangka untuk frontend + backend (API) |
| **Bahasa** | TypeScript 5 | Lebih aman dari error karena tipe data dicek otomatis |
| **UI Library** | React 19.2 | Standar industri untuk antarmuka interaktif |
| **Styling** | Tailwind CSS v4 | Desain cepat, responsive HP & desktop |
| **Build tool** | Turbopack | Compiler super cepat bawaan Next.js |
| **Hosting App** | Vercel | Gratis, otomatis deploy dari GitHub, optimasi Next.js |
| **Source code** | GitHub (public repo) | Version control + auto-deploy ke Vercel |
| **Database** | File JSON (bukan database SQL) | Ringan, simpel, cocok untuk skala project ini |
| **Web server video** | Caddy (di PC backup) | Menyalurkan file video lewat tunnel |

**Poin penting buat dijelaskan:**
- Ini **full-stack** aplikasi: frontend dan backend (API) ada dalam satu project Next.js.
- **Tidak pakai database tradisional** — data drama, komentar, admin, dan interaksi (like) disimpan dalam **file JSON** (`data/dramas.json`, `comments.json`, `admins.json`, `interactions.json`). Keputusan sadar: cukup untuk skala sekarang, tidak perlu infrastruktur database yang rumit.

---

## 3. Arsitektur Sistem (bagian PALING menarik untuk dijelaskan)

DramaApp memakai **arsitektur hybrid** — ini yang membedakannya dari app biasa:

```
[ Pengunjung ]
      │
      ▼
[ Vercel ] ── aplikasi (halaman, katalog, API) — gratis, selalu online
      │
      │  (untuk video, app mengarah ke...)
      ▼
[ PC Backup ] ── menyimpan file video asli (besar, tidak muat di GitHub/Vercel)
      │
      └─ Caddy + Tunnel ── menyalurkan video ke pengunjung
```

**Kenapa arsitekturnya begini? (cerita masalah → solusi):**
- File video drama **berukuran besar**. GitHub batasi 100 MB/file, dan hosting gratis tidak muat untuk ratusan video.
- **Solusi:** aplikasi-nya di Vercel (ringan, gratis, cepat), tapi **file video tetap di PC** dan disalurkan lewat tunnel.
- Jadi: aplikasi & video dipisah. Vercel urus tampilan, PC urus video. Ini menghemat biaya 100% (semua pakai layanan gratis).

**Komponen pendukung di PC backup** (`pc-backup-agent/`):
- `Caddyfile` — konfigurasi web server untuk video
- `hardlink-agent.js` — agent yang otomatis menyiapkan file video saat admin menambah drama baru
- `start-dramaapp.ps1` — script otomatis: 1 perintah untuk start semuanya

---

## 4. Fitur Aplikasi (dari sisi pengguna)

Struktur halaman (`app/`):

**Untuk pengunjung/viewer:**
- **Landing / Beranda** (`/`, `/beranda`) — halaman utama katalog
- **Discover** (`/discover`) — jelajah drama per kategori
- **Shorts** (`/shorts`) — scroll vertikal ala TikTok
- **Detail Drama** (`/drama/[id]`) — sinopsis, daftar episode
- **Player** (`/watch/[id]/[ep]`) — pemutar video per episode
- **Login & Daftar** (`/login`, `/daftar`) — autentikasi user
- **My List** (`/my-list`) — drama yang disimpan
- **Profile** (`/profile`) — profil + pilih warna avatar
- **Like & Komentar** — interaksi sosial di tiap drama

**Untuk admin:**
- **Admin Panel** (`/admin`) — tambah drama via form, tanpa edit file manual

**Komponen UI penting:** VideoPlayer (dengan fallback otomatis kalau video belum ada), DramaCard, BottomNav (navigasi HP), TopNav, LikeButton, SaveButton, Comments.

**Detail teknis menarik di VideoPlayer:** kalau file video asli belum diupload, player otomatis menampilkan video sample + label "Video sample — file asli belum diupload". Jadi app tetap jalan walau video belum lengkap.

---

## 5. Sistem Login & Keamanan Admin

- User login → data disimpan di **localStorage** browser (`dramaku:user`).
- Ada 2 role: **admin** dan **viewer** (default viewer).
- **Siapa admin ditentukan server-side**, bukan client — daftar email admin ada di `data/admins.json`. Jadi user tidak bisa mengaku-ngaku jadi admin lewat browser.
- Setiap API admin (tambah drama, scan, hardlink, upload) **mengecek ulang** apakah email pemanggil benar-benar terdaftar sebagai admin (header `x-admin-email`). Kalau tidak → ditolak (401 Unauthorized).

**Poin:** keamanan admin diverifikasi di sisi server di setiap endpoint, bukan cuma di tampilan.

---

## 6. Workflow Admin — "Tambah Drama Cukup 3 Klik"

Ini menunjukkan **evolusi produktivitas** selama development:

1. **Awalnya:** tambah drama = edit file JSON manual + copy video manual (ribet, rawan salah).
2. **Lalu dibuat Admin Form Otomatis** — admin isi form (judul, kategori, sinopsis, episode), sistem otomatis:
   - bikin ID/slug unik dari judul (`generateUniqueId`)
   - pilih warna gradient poster acak
   - simpan ke `dramas.json`
3. **Lalu Auto-Hardlink** — sistem otomatis menyiapkan file video di PC backup (lewat hardlink-agent), tanpa copy manual.
4. **Hasil akhir:** tambah drama baru cukup **±3 klik / ~2 menit**, dari sebelumnya proses manual yang lama.

---

## 7. Tahapan Pembuatan Project (Roadmap — sudah selesai 6 dari 8)

| # | Tahap | Status | Hasil |
|---|---|---|---|
| 1 | **Setup Project** | ✅ Selesai | Code diambil dari GitHub, jalan di laptop |
| 2 | **Online di Vercel** | ✅ Selesai | App bisa dibuka publik: dramaapp.vercel.app |
| 3 | **Video Bisa Diputar** | ✅ Selesai | Video dari PC backup disalurkan via tunnel |
| 4 | **Admin Form Otomatis** | ✅ Selesai | Tambah drama tanpa edit file manual |
| 5 | **Auto-Hardlink** | ✅ Selesai | Tambah drama cukup 3 klik |
| 6 | **Script Otomatis** | ✅ Selesai | 1 command start semua + auto-update Vercel |
| 7 | **Named Tunnel** | 🔜 Berikutnya | Supaya URL video stabil selamanya |
| 8 | **Perbaikan Akhir** | ⚪ Rencana | Fix bug judul panjang + perkuat keamanan |

---

## 8. Tantangan & Solusi (cerita yang bagus untuk presentasi)

Tunjukkan bahwa kamu menghadapi masalah nyata dan menyelesaikannya:

- **Masalah:** Server kantor memblokir banyak akses (firewall block port, proxy block tunnel, ngrok/cloudflared gagal connect).
  **Solusi:** Pindah strategi ke **deploy Vercel** untuk aplikasi (tidak terhalang firewall) + arsitektur hybrid untuk video.

- **Masalah:** Video terlalu besar untuk GitHub & hosting gratis.
  **Solusi:** Pisahkan video ke PC backup, salurkan lewat tunnel + Caddy.

- **Masalah:** Tambah drama awalnya manual & lama.
  **Solusi:** Bikin admin form + auto-hardlink + script otomasi.

---

## 9. Rencana Pengembangan ke Depan

- **Tahap 7 — Named Tunnel:** sekarang URL video berubah tiap PC restart; dengan named tunnel URL jadi **stabil permanen**, tidak perlu update Vercel berulang.
- **Tahap 8 — Perbaikan akhir:** fix bug judul drama yang sangat panjang (slug terpotong) + memperkuat keamanan login admin.
- **Ide lanjutan:** migrasi video ke CDN (mis. Cloudflare R2 10 GB gratis), tambah pencarian, statistik views nyata.

---

## 10. Antisipasi Pertanyaan (Q&A)

**T: Kenapa tidak pakai database beneran?**
J: Untuk skala project ini, file JSON sudah cukup, lebih ringan, dan tidak perlu biaya/infrastruktur tambahan. Kalau data sudah besar, tinggal migrasi ke database (mis. Postgres) tanpa ubah tampilan.

**T: Berapa biaya hosting?**
J: Rp 0 / gratis. Vercel free tier untuk aplikasi, PC sendiri untuk video, semua tool open-source.

**T: Apakah aman?**
J: Role admin diverifikasi di server di setiap endpoint, bukan hanya di tampilan. Video dipisah dari aplikasi.

**T: Apa yang dipakai untuk membangun ini?**
J: Next.js + TypeScript + React + Tailwind, dideploy ke Vercel via GitHub, dengan arsitektur hybrid untuk video.

**T: Bisa diakses dari HP?**
J: Bisa, desainnya responsive (ada bottom-nav khusus mobile) dan bisa dibuka di browser HP mana saja.

---

## 11. Penutup (kalimat penutup)

> "Singkatnya, DramaApp adalah aplikasi streaming yang sudah online, dibangun dengan teknologi modern (Next.js, TypeScript, Vercel), memakai arsitektur hybrid yang hemat biaya untuk menangani video besar, dan punya sistem admin yang membuat penambahan konten jadi sangat cepat. Dari 8 tahap rencana, 6 sudah selesai dan aplikasinya sudah bisa dipakai sekarang."

---

### Lampiran — Angka penting untuk diingat
- **33** judul drama · **24** poster · **7** kategori
- Next.js **16.2.4** · React **19.2** · TypeScript **5**
- **6 dari 8** tahap selesai
- Biaya hosting: **Rp 0**
- URL: **https://dramaapp.vercel.app/**
