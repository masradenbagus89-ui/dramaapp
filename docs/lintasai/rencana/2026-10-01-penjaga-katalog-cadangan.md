# Rencana + hasil: penjaga "katalog diam-diam basi"

- **Tanggal:** 2026-10-01
- **Tangga bobot:** BERAT (fitur BARU: endpoint + kartu admin)
- **Diminta owner:** "Pasang penjaga kerusakan senyap"
- **Status:** kode selesai, gerbang §6 lolos penuh, **belum di-commit & belum di-push**

---

## Ringkasan

Saat memeriksa kiriman rekan Playly, ketahuan database Supabase mati. Yang berbahaya bukan
matinya — itu wajar dan pulih sendiri beberapa jam kemudian tanpa satu baris kode pun diubah.
Yang berbahaya: **halaman publik beralih ke berkas cadangan tanpa meninggalkan jejak apa pun.**

/katalog tampil "sehat" dengan 42 judul dari `data/dramas.json` (terakhir disegarkan 11 September),
sementara database sebenarnya berisi 39 judul. Nol pesan, nol tanda di layar. Kalau gangguannya
berlangsung berhari-hari, penonton melihat katalog yang makin tertinggal dan tak seorang pun tahu.

Yang dibangun: kartu di Dashboard admin yang menjawab satu pertanyaan — **judul yang dilihat
penonton sekarang datang dari database, atau dari cadangan?**

## ✅ Terverifikasi (diukur, bukan dikira)

- Pengaman jatuh ke berkas lokal tanpa jejak — `lib/dramas.ts:264` (`catch` → `readLocalDramas()`)
- Database 522 konsisten 3× (±19,7 dtk); Auth 401 & Storage 400 di project yang sama tetap hidup
  → yang mati khusus databasenya
- Cadangan lokal 42 judul · database 39 judul · catatan 28 Sep mencatat 35 → cadangan memang basi
- 5 halaman publik memakai pengaman itu: `app/page.tsx:29` · beranda:26 · katalog:34 · discover:22 ·
  shorts:20
- `/api/dramas`, `/api/likes`, `/api/ads` serempak 500 saat database mati — jadi `/api/dramas`
  adalah sinyal yang sah untuk "database tidak menjawab"
- Pulih sendiri: ketiga API kembali 200, `/film` kembali 46 video, `/beranda` 40 tautan `/tonton/`

## 🔴 JEBAKAN TERBESAR — penjaga admin IKUT MATI bersama database

Ini nyaris membuat seluruh fitur sia-sia, dan hanya ketahuan karena dicari sebelum menulis kode.

`isAdminRequest` → `getAdmins()` → `sbDocGetOrSeed` (`lib/store.ts:116`) membaca database **tanpa
penangkap**. Jadi ia **MELEMPAR**, bukan memulangkan `false`, tepat ketika database mati — yaitu
satu-satunya saat kartu ini dibutuhkan. Akibatnya endpoint membalas **500 tanpa penjelasan**.

Terbukti di log server saat uji lokal:

```
[status-katalog] daftar admin tidak terbaca, akses ditolak: Supabase tidak menjawab setelah 2 percobaan
GET /api/admin/status-katalog 401 in 12.4s
```

**Dua lapis penanganan, keduanya tanpa melonggarkan keamanan sedikit pun:**

1. Endpoint menangkap lemparan itu dan **MENOLAK** (rak owasp A10 default-deny) → 401, bukan 500.
   Tidak ada jalur yang mengubah gagal-periksa jadi izin masuk.
2. Kartu punya **jalur cadangan**: menyimpulkan keadaan dari `/api/dramas` yang **sudah publik sejak
   lama**. Nol data baru terbuka, nol pengaman dilonggarkan.

**Keputusan owner 2026-10-01:** memilih jalur (2) di atas usul melonggarkan cek admin. Usul yang
ditolak itu — menerima token admin bertanda tangan sah tanpa memastikan ulang ke database — akan
membuat admin yang baru dicabut tetap bisa membuka kartu ini selama database mati.

**Batas jujur jalur cadangan:** ia tahu database hidup atau mati, tapi TIDAK tahu berapa judul yang
dilihat penonton. Karena itu ada `jumlahTerukur: false`, supaya kartunya menahan diri menyebut angka
alih-alih mengarang. Tanpa pembedaan ini, "belum diukur" masuk sebagai 0 dan dilaporkan sebagai
katalog KOSONG — tuduhan yang jauh lebih menakutkan daripada keadaan sebenarnya.

## Berkas

| Berkas | Peran |
|---|---|
| `lib/katalog-status.ts` (baru) | Fungsi MURNI `ringkasStatusKatalog` — bisa diuji tanpa React/server |
| `lib/dramas.ts` (+1 fungsi) | `periksaKatalogHidup()` — pembacaan paling ringan, TANPA cache |
| `app/api/admin/status-katalog/route.ts` (baru) | Endpoint, dijaga admin, `force-dynamic` |
| `app/components/admin/KatalogStatusCard.tsx` (baru) | Kartu, meniru `PlaylyStatusCard` |
| `app/components/admin/AdminDashboard.tsx` | +1 kartu di bawah kartu Playly |
| `tests/katalog-status.test.ts` (baru) | 11 tes, termasuk penjaga anti-senyap |

**Dua keputusan desain yang gampang dirusak sesi berikutnya:**

- `periksaKatalogHidup` SENGAJA tidak lewat `getAllDramas` — fungsi itu memanggil `seedDramasIfEmpty`
  yang bisa **MENULIS** ke database (`lib/dramas.ts:169`). Pemeriksaan status tidak boleh punya efek
  samping (§3.7).
- Pembacaannya WAJIB tanpa cache. `sbSelect` tanpa `revalidate` memakai `cache: "no-store"`
  (`lib/supabase.ts:213`). Status ber-cache akan melaporkan "hidup" memakai jawaban lama — kartu yang
  berbohong lebih buruk daripada tidak ada kartu.

## Bukti (dijalankan, bukan dikira)

Keempat cabang diuji di server lokal, database sungguhan DAN database diarahkan ke host mati:

| Kondisi | endpoint admin | /api/dramas | kartu |
|---|---|---|---|
| database hidup + sesi admin sah | **200** `status:"database", jumlahTampil:39` | 200 | hijau |
| database hidup + tanpa sesi | 401 | 200 | hijau (jalur cadangan) |
| **database mati + sesi admin sah** | **401 dalam 12,4 dtk** (bukan 500) | 500 | **merah "cadangan"** |
| database mati + tanpa sesi | 401 | 500 | merah |

Gerbang §6, urutan benar (`build` sebelum `tsc`): `rm -rf .next` → `npm run build` **sukses** →
`npx tsc --noEmit` **exit 0** → `npm test` **84 berkas / 1210 tes hijau** → nol berkas env ter-stage.

**Baseline diukur terpisah** dengan menyingkirkan berkas tes sendiri: **83 berkas / 1199 tes**.
Selisihnya persis +1 berkas / +11 tes milik sendiri → **nol tes lama yang rusak**.

## 🪤 Jebakan alat yang kambuh di sesi ini

- **`npm run build` gagal acak selagi database bermasalah** — percobaan pertama
  `worker exited with code: 4294967295`, percobaan kedua atas kode yang **sama persis** sukses.
  Kekambuhan ketiga pola ini (tercatat 2026-09-23 & 2026-09-24). Ukur ulang sebelum berburu penyebab.
- **`next dev` mengubah `next-env.d.ts`** (terjadi lagi, 1 baris). Berkas itu ditulis mesin —
  dipulihkan dengan `git checkout --`, jangan di-commit.
- **Port 3099 tidak langsung bebas** sesudah task dihentikan; proses `node`-nya masih LISTENING.
  Periksa pemiliknya dulu (`Get-NetTCPConnection` + `Get-Process`, cocokkan jam mulainya) sebelum
  menghentikan apa pun — jangan membunuh proses milik orang lain.
- **Jangan percaya satu kali `npm test` untuk menghitung baseline.** Run pertama melaporkan
  83 berkas / 1201 tes, run bersih kemudian 84 / 1210 dengan baseline 83 / 1199. Angka yang berlaku
  adalah yang diukur dengan menyingkirkan berkas yang ditambahkan, bukan selisih antar-run.

## Yang TIDAK dibangun (sengaja)

- Tidak mengubah perilaku halaman publik sama sekali — penonton tidak melihat apa pun yang baru.
- Tidak menyentuh pengaman `getAllDramasCachedSafe`. Satu baris pun tidak.
- Tidak menyegarkan `data/dramas.json` (butuh database hidup; tugas menyusul).
- Tidak mengirim notifikasi — kartu harus dibuka untuk dibaca. Kalau owner jarang membuka /admin,
  penjaga ini perlu disusul pemberitahuan; di luar lingkup sekarang.
- **Tidak memperbaiki akar kerapuhannya:** `getAdmins()` yang melempar saat database mati membuat
  SELURUH panel admin tak bisa dipakai justru saat ada gangguan. Itu perubahan pada fungsi bersama
  yang menyentuh auth — titik risiko tinggi, dan bukan yang owner setujui. **Layak ditawarkan
  terpisah.**

## Cara owner mencoba sendiri

1. Buka situs → **/admin** → masuk sebagai admin
2. Bagian **Dashboard**, tepat di bawah kartu "Playly — dashboard upload"
3. Kartu **"Katalog drama — sumber data"**: titik **hijau "Dari database — N judul"** saat sehat.
   Kalau suatu hari database bermasalah lagi, titiknya **merah** dan kartunya menjelaskan bahwa
   penonton sedang melihat daftar cadangan.
