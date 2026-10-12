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

- **Nama repo GitHub yang di-deploy Vercel** (Settings → Git): ................
  Railway harus disambungkan ke repo yang **sama**.
- **Versi Node** (log build terakhir, baris paling atas): ................
  Supaya Railway memakai versi yang sama persis. Proyek ini tidak mengunci versi Node di mana pun.
