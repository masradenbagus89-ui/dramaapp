# Tahap 6 — pindah domain penonton ke Railway

> Dibuat 2026-10-15. Pelengkap `docs/migrasi-railway-daftar-env.md` (daftar env),
> `docs/migrasi-railway-pc-backup.md` (sumber video), dan
> `docs/migrasi-railway-pesan-ke-playly.md` (pesan ke mitra).
>
> **Tahap ini BELUM dimulai dan sengaja ditahan.** Yang menahan bukan kerja teknis —
> satu kolom di panel Railway, nol commit — melainkan **keputusan alamat**.

---

## Status & keputusan owner (2026-10-15)

**Keputusan: beli domain sendiri dulu.** `NEXT_PUBLIC_SITE_URL` di Railway
**dibiarkan KOSONG** sampai domain itu aktif dan menunjuk Railway.

Ini keadaan **aman**, bukan pekerjaan yang tertunda. Alasannya di bawah ("Kenapa
kosong justru aman sekarang").

Dua pilihan yang DITOLAK, supaya sesi berikutnya tak menawarkannya lagi:

| Yang ditolak | Kenapa |
|---|---|
| Isi `dramaapp-production-9e88.up.railway.app` sekarang, domain nanti | Ongkos SEO dibayar **dua kali**: Google mulai mengindeks alamat panjang itu, lalu seluruh pemindahan canonical + 301 diulang dari nol saat domain asli datang |
| Pakai alamat `railway.app` permanen | Alamat penonton panjang & tak bisa diingat, dan **terikat ke Railway** — pindah hosting lagi berarti ganti alamat penonton lagi |

---

## Keadaan yang terukur saat keputusan ini diambil (2026-10-15)

Diukur dari luar, bukan dari catatan:

| Yang diperiksa | Hasil |
|---|---|
| `/api/health` Railway | `{"ok":true,"sumberData":"database"}` |
| `/api/health` Vercel | `{"ok":true,"sumberData":"database"}` |
| canonical beranda Railway | `https://dramaapp.vercel.app` |
| `robots.txt` Railway | `Sitemap: https://dramaapp.vercel.app/sitemap.xml` |
| `sitemap.xml` Railway | **377 URL, semuanya beralamat Vercel** |
| `NEXT_PUBLIC_SITE_URL` di Railway | tidak ada |

Perintah untuk mengulang pengukuran ini kapan pun:

```bash
curl -s https://dramaapp-production-9e88.up.railway.app/robots.txt
curl -s https://dramaapp-production-9e88.up.railway.app/ | grep -oE 'rel="canonical"[^>]*'
curl -s https://dramaapp-production-9e88.up.railway.app/sitemap.xml | grep -c '<loc>'
```

---

## Kenapa kosong justru aman sekarang

"Canonical" = baris di dalam halaman yang memberi tahu Google **alamat mana yang
dianggap aslinya** kalau isi yang sama bisa dibuka dari beberapa alamat. Situs ini
sekarang bisa dibuka dari dua alamat (Vercel & Railway) dengan database yang sama,
jadi isinya **identik**.

Selama Vercel masih **melayani penonton**, keadaan sekarang konsisten: Railway
bilang "yang asli itu Vercel", dan Vercel memang yang asli. Google tak bingung.

**Bahayanya baru muncul kalau urutannya dibalik** — Vercel diubah jadi pengalihan
301 ke Railway **sebelum** variabel ini diisi:

- Railway → "yang asli itu Vercel"
- Vercel → 301 → Railway

Dua sinyal bertabrakan. Google menganggapnya kesalahan dan **bisa menjatuhkan
halaman dari hasil pencarian**. Tak ada pesan error, tak ada yang melapor —
ketahuan berminggu-minggu kemudian dari trafik yang turun.

> ⛔ **Aturan yang tak boleh dibalik: isi variabel DULU, baru 301.**

---

## Mekanisme: kenapa WAJIB deploy ulang, bukan restart

Diverifikasi 2026-10-15 di hasil build sungguhan, bukan dari ingatan.

Catatan lama menulis *"`NEXT_PUBLIC_*` dipanggang saat build"*. Itu benar untuk kode
yang jalan di browser, **tapi bukan sebab utama di kasus ini**:

1. Di potongan kode **server**, `process.env.NEXT_PUBLIC_SITE_URL` **masih dibaca
   saat request** — tidak dipanggang. (Terbukti: berkas di `.next/server/chunks/`
   memuat teks `process.env.NEXT_PUBLIC_SITE_URL` lalu nilai bawaannya sebagai
   cadangan.)
2. Yang membekukan adalah **prerender statis**. 16 halaman situs ini dicetak jadi
   berkas HTML saat build, dengan alamatnya sudah jadi teks mati di dalamnya.
   Di `.next/server/app/index.html` baris canonical-nya sudah tertulis penuh
   `https://dramaapp.vercel.app`. `robots.txt` juga begitu — dibekukan permanen
   sampai build berikutnya.

**Akibat praktis yang perlu diketahui:**

- ⛔ Mengganti nama variabel (membuang awalan `NEXT_PUBLIC_`) **TIDAK akan
  menolong**. Yang membekukan adalah prerender halaman, bukan awalannya. Jangan
  tawarkan "solusi" itu.
- `sitemap.xml` punya `revalidate = 3600` (`app/sitemap.ts:8`) → ia menyegarkan
  diri sendiri dalam ≤1 jam tanpa deploy.
- canonical & `robots.txt` **tidak** punya itu → hanya berubah lewat build baru.
- Railway menjalankan deploy ulang **otomatis** saat variabel diubah, jadi ini
  bukan langkah terpisah yang perlu diingat.

Satu sumber alamat untuk SEMUANYA: `lib/site.ts:12`. Dipakai `app/layout.tsx`
(metadataBase + og:url), `app/robots.ts`, `app/sitemap.ts`, `app/drama/[id]/page.tsx`,
`app/tonton/[id]/page.tsx`. **Jangan hardcode alamat di tempat lain.**

### 🪤 Jebakan senyap di `lib/site.ts` — SETENGAH ditutup 2026-10-15

Kalau variabelnya hilang atau salah ketik, kode **tidak error** — ia jatuh ke nilai
bawaan `https://dramaapp.vercel.app`. Sesudah Vercel pensiun, itu berarti canonical
menunjuk alamat **mati**, tanpa satu pun gejala di layar.

**Yang SUDAH ditutup** (pagar `periksaAlamatSitus` di `lib/site.ts`, mengikuti pola
`periksaSetelanSupabase` di `lib/supabase.ts:50`): nilai yang **diisi tapi rusak**
menggagalkan build dengan pesan yang menyebut nama variabelnya. Yang ditolak:

| Nilai | Hasil |
|---|---|
| `dramaku.com` (lupa `https://`) | **DITOLAK** |
| `http://dramaku.com` (http polos) | **DITOLAK** — Google menghitung http & https sebagai dua situs |
| `https://dramaku.com/` | lolos, garis miring dibuang |
| `http://localhost:3000` | lolos — untuk `next dev` |
| kosong / blank | lolos ke nilai bawaan (lihat di bawah) |

Kenapa gagalnya build itu **aman**: deploy yang gagal membuat Railway tetap
menyajikan deployment sebelumnya, jadi situs tidak ikut mati — kamu melihat deploy
merah dan membetulkan ketikannya. Bandingkan dengan tanpa pagar: deploy berhasil,
canonical jadi kacau, dan nol orang tahu.

**Yang MASIH terbuka, dan sengaja:** nilai **kosong** tetap lolos ke nilai bawaan
tanpa peringatan. Itu keputusan, bukan kelalaian — kosong memang BENAR selama
Tahap 2-5, dan pagar yang berbunyi di tiap build hari ini akan berhenti dibaca orang
jauh sebelum migrasi sungguhan terjadi (penyakit yang sudah tercatat soal
`KEEPALIVE_SITES`). Juga masih terbuka: alamat yang **bentuknya sah tapi salah
situs** (mis. masih menunjuk host lama) — itu tak bisa ketahuan dari dalam kode.

➡️ **Kedua celah itu ditutup oleh langkah 3, jadi verifikasi di bawah WAJIB,
bukan opsional.**

---

## Prasyarat (ketiganya, sebelum langkah 1)

1. **Domain sudah dibeli** dan DNS-nya menunjuk service Railway `dramaapp`
   (project `ravishing-adaptation`, workspace `jalurlangit-ops`), dan dibuka di
   browser sudah menampilkan situs.
2. **`HARDLINK_AGENT_SECRET` Railway = PC backup.** Sudah SELESAI & lulus uji
   restart 2026-10-14 (`00872a2`) — tapi periksa ulang, karena kalau tak cocok,
   video penonton mati begitu tunnel berganti dan tak ada yang memulihkannya.
3. **Putaran 2 (login admin) lolos** — pagar yang dipasang owner sendiri.

---

## Urutan langkah — JANGAN dibalik

| # | Langkah | Siapa | Kenapa di posisi ini |
|---|---|---|---|
| 1 | Isi `NEXT_PUBLIC_SITE_URL` di panel Railway = domain baru, **tanpa garis miring di ujung** | owner | Harus mendahului 301, lihat "Kenapa kosong justru aman" |
| 2 | Tunggu deploy ulang Railway selesai (status `Active`) | owner | Prerender = perubahan hanya ikut build baru |
| 3 | **Verifikasi** (perintah di bawah) | AI/owner | Salah ketik tak memunculkan error — hanya ketahuan dari pengukuran |
| 4 | `KEEPALIVE_SITES` di panel GitHub: buang alamat Vercel, isi domain baru | owner | Robot sengaja GAGAL kalau ada satu alamat sakit → Vercel pensiun = email gagal tiap hari |
| 5 | Kirim Pesan 2 ke mitra Playly (domain penonton baru) | owner | `docs/migrasi-railway-pesan-ke-playly.md` |
| 6 | Vercel diubah jadi **pengalihan 301** ke domain baru | owner | Bookmark, link yang pernah dibagikan, dan peringkat Google tidak putus mendadak |
| 7 | Biarkan 301 hidup **beberapa minggu**, baru Vercel dimatikan | owner | Google butuh waktu memindahkan peringkat; mematikan terlalu cepat = trafik hilang |

> ⚠️ Langkah 6 **bukan** "matikan situs lama". Daftar periksa lama di
> `docs/migrasi-railway-pesan-ke-playly.md` sempat menaruh "matikan situs lama"
> **sebelum** langkah 1 — urutan itu persis yang menghasilkan tabrakan sinyal di
> atas. Dibetulkan 2026-10-15.

---

## Verifikasi langkah 3 — selesai = terbukti

Ganti `<DOMAIN>` dengan domain baru (tanpa garis miring di ujung).

```bash
# 1. canonical beranda harus menyebut domain baru, BUKAN vercel
curl -s https://<DOMAIN>/ | grep -oE 'rel="canonical"[^>]*'

# 2. robots.txt harus menunjuk sitemap domain baru
curl -s https://<DOMAIN>/robots.txt | grep Sitemap

# 3. sitemap: NOL URL boleh beralamat vercel (jawaban harus 0)
curl -s https://<DOMAIN>/sitemap.xml | grep -c 'dramaapp.vercel.app'

# 4. jumlah URL sitemap masih wajar (2026-10-15: 377)
curl -s https://<DOMAIN>/sitemap.xml | grep -c '<loc>'

# 5. situs benar-benar melayani, bukan cuma halaman kosong
curl -s https://<DOMAIN>/api/health
```

**Kriteria lulus:** (1) & (2) menyebut domain baru · (3) menjawab **0** ·
(4) ±377 · (5) `{"ok":true,"sumberData":"database"}`.

Kalau (3) tidak nol padahal deploy sudah `Active`: tunggu ≤1 jam (sitemap
menyegarkan per jam), lalu ukur ulang. Masih tidak nol → variabelnya salah ketik.

---

## Rollback

Hapus `NEXT_PUBLIC_SITE_URL` dari panel Railway → deploy ulang → semuanya kembali
menunjuk `dramaapp.vercel.app` (nilai bawaan `lib/site.ts:8`). **Nol commit, nol
kode.** Syaratnya Vercel masih hidup — karena itu langkah 7 menahan pemadamannya
beberapa minggu.

---

## Yang masih terbuka

- ❓ Domain final belum dibeli/ditentukan (per 2026-10-15).
- ❓ Apakah akhiran acak `9e88` pada alamat `railway.app` dijamin tetap kalau
  service Railway pernah dibuat ulang — **belum diverifikasi**. Tidak menghalangi
  tahap ini (keputusannya memakai domain sendiri), tapi jangan diklaim tetap.
- ❓ `start-video-services.ps1` tak pernah memanggil `ReleaseMutex` dan tak punya
  blok `finally` (temuan 2026-10-14, belum diperbaiki). Tak menghalangi Tahap 6,
  tapi memengaruhi pemulihan video otomatis.
