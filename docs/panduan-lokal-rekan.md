# Panduan preview lokal untuk rekan (Yusuf)

> Tujuan: kamu bisa **melihat dan memastikan sendiri** hasil kerjamu di komputermu sebelum
> commit — tanpa memegang satu pun kunci milik owner.
>
> Aturan kerja lengkapnya ada di `AGENTS.local.md` seksi "Pembagian kerja: owner ↔ rekan".

---

## 1. Menyalakan (sekali setup, ~5 menit)

```bash
npm install
cp .env.example .env.local     # Windows PowerShell: Copy-Item .env.example .env.local
```

Buka `.env.local`, isi **hanya 2 baris** ini dengan nilai **karangan sendiri**:

```
ADMIN_PASSWORD=terserah-kamu-minimal-8-karakter
AUTH_SECRET=<tempel hasil perintah di bawah>
```

Bikin `AUTH_SECRET` acak:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Ini BUKAN kunci produksi.** Nilainya bebas dan cuma dipakai menandatangani cookie sesi di
mesinmu sendiri. Kamu tidak membutuhkan — dan tidak boleh memegang — nilai milik produksi.

Kenapa wajib: tanpa **kedua** variable ini, login dan seluruh panel admin mati total
(`lib/session.ts:37` → `Boolean(process.env.ADMIN_PASSWORD && process.env.AUTH_SECRET)`).
Tanpa tahu ini kamu akan mengira ada bug.

Sisa isi `.env.local` **biarkan kosong**. Variable lain semuanya opsional; efek kosongnya
dijelaskan di bagian 3.

Jalankan:

```bash
npm run dev        # buka http://localhost:3000
```

> ⚠️ Jangan pakai `start-localhost-3010.bat`. Namanya menyebut 3010 tapi isinya menjalankan
> port **3055**, dan node-nya dipatok ke `C:\Program Files\nodejs\node.exe` — berkas itu
> dibuat untuk komputer owner, bukan untuk umum.

---

## 2. Yang BISA kamu percaya dari localhost

- Seluruh tampilan, tata letak, dan gaya di semua halaman
- Navigasi antar halaman + menu katalog & penyaringnya (Genre, Jenis, Populer, Negara, Tahun)
- Panel admin (sesudah 2 variable di atas diisi)
- `npm test` · `npx tsc --noEmit` · `npm run build`

Katalog lokal di `data/dramas.json` **sudah disegarkan dari produksi** (42 judul, kolom tahun
dan negara terisi), jadi menu katalog di layarmu menampilkan isi yang sama seperti yang dilihat
penonton. Berkas itu tetap **cadangan**, bukan sumber kebenaran — kalau owner mengubah katalog,
berkas ini baru ikut berubah setelah disegarkan lagi.

---

## 3. Yang TIDAK bisa — ini **bukan bug**, jangan dikejar

| Yang tidak jalan | Kenapa |
|---|---|
| **Video Playly tidak mau diputar** | Playly hanya mengizinkan video-nya tampil di domain mitra yang terdaftar di sisi mereka. `dramaapp.vercel.app` terdaftar, `localhost` **tidak** (terverifikasi 2026-08-25, tercatat di `.env.example`) |
| **Video drama utama tidak mengalir** | Berkas videonya disalurkan lewat tunnel dari PC backup milik owner (`NEXT_PUBLIC_VIDEO_BASE_URL`), yang tidak menyala di komputermu |
| **Top-up koin** | Butuh kunci Midtrans |
| **Data IMDb (tahun, rating, genre) pada judul BARU** | Butuh `OMDB_API_KEY` / `TMDB_API_KEY`. Judul lama tetap tampil karena datanya sudah tersimpan di katalog |
| **Banner iklan kosong** | Butuh kunci AdSense / kode banner |
| **Menu "Status" tidak muncul** | Kolom `status` memang **0 terisi** di produksi juga. Menu ini sengaja tidak digambar kalau datanya kosong |

Kalau salah satu di atas yang tidak jalan, **jangan** laporkan sebagai bug dan jangan
"perbaiki" — itu perilaku yang benar.

---

## 4. Dua jebakan Windows yang sudah terbukti memakan waktu

**a. Hapus `.next` dulu sebelum `npm run build` kalau sedang memverifikasi TAMPILAN.**

```bash
rm -rf .next && npm run build
```

Tanpa ini, build inkremental tetap menyajikan halaman statis **lama** — perubahanmu terlihat
"tidak masuk" padahal kodenya sudah benar.

**b. `pkill` tidak berlaku di Windows.** Server uji lama tetap hidup, server baru gagal
`listen` (`EADDRINUSE errno -4091`), dan `curl` dijawab server **lama**. Cara benar:

```bash
netstat -ano | grep LISTENING | grep :3000
taskkill //PID <nomor> //F
```

Lalu pastikan log server benar-benar menulis "Ready" sebelum kamu percaya hasilnya.

---

## 5. Sebelum commit — gerbangmu sendiri

```bash
npx tsc --noEmit     # harus 0 error
npm test             # harus hijau semua
npm run build        # harus sukses
```

Lalu buka halaman yang kamu ubah di browser dan **lihat sendiri** hasilnya.

Sesudah itu tulis berkas serah-terima — format dan isi wajibnya di
`docs/serah-terima/README.md`.

---

## 6. Push ke mana

Push **hanya** ke remote `dramaku` (`ojokesusu/dramaku`), ke **branch**, bukan ke `main`.

```bash
git push dramaku <nama-branch>
```

**JANGAN** `git push <remote> <branch>:main` di remote mana pun. Perintah itu bisa
non-fast-forward dan menghapus pekerjaan yang sudah tayang di situs
(pernah nyaris terjadi — `HANDOFF.md:1093`).

Owner yang menarik, memeriksa, menjalankan SQL/env kalau perlu, lalu merilis.
