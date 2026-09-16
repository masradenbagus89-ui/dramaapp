# 2026-09-16 — Menu & halaman admin untuk webhook Playly

> Branch: **`feat/playly-webhook`**. Menyambung `docs/serah-terima/2026-09-14-webhook-playly.md`
> dan `2026-09-15-gabung-video-playly.md` (keduanya sudah tayang lewat merge `5e6cbec`).

## 1. Apa yang berubah + kenapa

Endpoint `POST /api/webhooks/playly` sudah tayang sejak `5e6cbec`, tapi **tidak punya tampilan
sama sekali** — satu-satunya cara mengetahui jalur itu hidup atau mati adalah mengetuknya lewat
terminal. Akibatnya owner tidak punya cara memeriksa fitur yang sudah dirilisnya sendiri, dan
di menu admin tidak ada jejak bahwa webhook itu ada.

Sekarang ada halaman **`/admin/webhooks/playly`** plus satu baris menu **"Webhook Playly"** di
sidebar admin, tepat di bawah "Video Playly".

**Keputusan desain yang paling menentukan:** halaman ini berpusat pada menjawab
**"kenapa daftarnya kosong?"**, bukan sekadar menampilkan daftar. Alasannya, dua sebab kosong
yang berbeda terlihat **sama persis** di layar tapi langkah perbaikannya berlawanan:

- **Kunci belum dipasang** → endpoint membalas 503 ke Playly; notifikasi asli pun ditolak.
  Yang perlu dilakukan: pasang env + deploy ulang.
- **Kunci terpasang, Playly belum pernah mengirim** → tak ada yang perlu diperbaiki di sisi
  kita; yang perlu dilakukan: hubungi pengelola Playly.

Tanpa pembedaan ini owner akan menunggu kiriman yang tak akan pernah datang. Halaman
menampilkan salah satu dari tiga kartu status (belum menyala / siap tapi kosong / hidup), dan
**selalu** menampilkan alamat endpoint yang harus diserahkan ke pengelola Playly.

**Keadaan produksi saat berkas ini ditulis:** `PLAYLY_WEBHOOK_SECRET` **belum terpasang** —
terverifikasi dengan mengetuk `https://dramaapp.vercel.app/api/webhooks/playly` tanpa kunci,
balasannya `HTTP 503 {"error":"PLAYLY_WEBHOOK_SECRET belum di-set di server."}`. Jadi begitu
halaman ini tayang, yang akan owner lihat adalah kartu merah "Jalur webhook belum menyala"
berikut dua langkah perbaikannya. Itu memang keadaan yang sebenarnya, bukan bug halaman.

### 🔒 Kunci rahasia tidak pernah menyeberang ke browser

Halaman hanya menerima **jawaban boolean** "kunci ada isinya atau tidak"
(`readWebhookSecret() !== null`), bukan nilainya. Bentuk boolean itulah yang menjamin kuncinya
tak punya jalan untuk ikut terbawa — bukan sekadar "kita ingat untuk tidak mengirimnya".
Terbukti dengan mencari nilai asli kunci di dalam HTML yang dikirim server: tidak ditemukan
(lihat §5). Kolom `description`, `embedUrl`, dan `thumbnailUrl` juga sengaja tidak ikut
terkirim karena tidak digambar — apa pun yang terkirim tetap terbaca di network tab browser
walau tak tampil di layar.

## 2. Berkas yang disentuh

**Baru:**
- `app/admin/webhooks/playly/page.tsx` — halaman, dijaga cookie sesi admin di server
- `app/components/admin/PlaylyWebhookMonitor.tsx` — daftar video + tombol sembunyikan
- `lib/playly-webhook-status.ts` — peringkas keadaan (fungsi murni, tanpa DB/jaringan)
- `tests/playly-webhook-status.test.ts` (16 tes)

**Diubah:**
- `app/components/admin/AdminSidebar.tsx` — **+1 baris menu + 1 import ikon**. Nol perubahan
  perilaku untuk baris menu yang sudah ada.

### Yang ikut tersenggol — dan yang sengaja TIDAK dibangun

`AdminSidebar` dipakai halaman **Video Playly** (`/admin/videos/playly`) dan **Kunci Playly**
(`/admin/settings/playly`). Perubahannya hanya menambah satu entri di daftar menu, jadi kedua
halaman itu tetap berfungsi sama — yang berubah cuma ada satu baris menu tambahan.

**Nol endpoint API baru.** Tombol "Sembunyikan" memakai `/api/admin/playly/hidden` yang **sudah
ada**, karena daftar sembunyi memang satu untuk kedua sumber (ruang id-nya sama — dua-duanya id
video Playly). Aturan itu sudah ditegakkan di `lib/playly-gabungan.ts` dan dijaga
`tests/playly-gabungan.test.ts`. Membuat endpoint kedua untuk pekerjaan yang sama justru
membuka peluang kedua daftar berbeda isi.

Halaman ini **hanya membaca dan menyembunyikan**. Ia tidak bisa menghapus baris webhook,
mengubah datanya, atau memicu pengiriman ulang dari Playly — semuanya di luar lingkup dan tak
ada yang memintanya.

## 3. Butuh SQL migrasi?

**Tidak.** Halaman membaca dokumen `playly:webhook` yang sudah dipakai endpoint sejak `b6e8b05`.
Tidak ada tabel maupun kolom baru.

## 4. Butuh env baru di Vercel?

**Tidak ada yang baru.** Tapi halaman ini baru berguna penuh setelah env yang **sudah
didokumentasikan sebelumnya** dipasang:

- **`PLAYLY_WEBHOOK_SECRET`** — belum terpasang di produksi (terverifikasi, §1). Fungsinya:
  kunci bersama yang membuktikan notifikasi memang dari Playly. Kalau kosong: endpoint membalas
  503 dan menolak semua notifikasi, termasuk yang asli.
- Cara membuat nilainya ada di `docs/serah-terima/2026-09-14-webhook-playly.md` §4. Nilainya
  sengaja tidak ditulis di berkas mana pun — berkas ini masuk repo.

## 5. Bukti yang sudah dijalankan

Gerbang §6 `AGENTS.local.md`, urutan `rm -rf .next` → build → tsc → tes:

```
rm -rf .next && npm run build   -> sukses; /admin/webhooks/playly terdaftar
                                   (.next/server/app/admin/webhooks/playly/page.js terbentuk)
npx tsc --noEmit                -> exit 0
npx vitest run                  -> 49 berkas, 660 tes lulus, 0 gagal (+16 tes baru)
```

**Uji HTTP langsung** (server produksi lokal `npx next start`, mode file):

| Yang diuji | Hasil | Sesuai harapan |
|---|---|---|
| GET halaman **tanpa** cookie admin | 200 "Akses ditolak"; blok alamat & nama env **0 kemunculan** di HTML | ✅ |
| GET halaman **dengan** sesi admin sah | 200, kartu "Jalur webhook hidup" + daftar video tampil | ✅ |
| Cari **nilai** `PLAYLY_WEBHOOK_SECRET` di HTML terkirim | **tidak ditemukan** | ✅ |
| Server dijalankan **tanpa** `PLAYLY_WEBHOOK_SECRET` | kartu "Jalur webhook belum menyala" + 2 langkah perbaikan | ✅ |
| Endpoint di server yang sama itu | `HTTP 503 PLAYLY_WEBHOOK_SECRET belum di-set` | ✅ |

Baris keempat dan kelima saling mengunci: halaman melaporkan "belum menyala" **persis** ketika
endpoint benar-benar membalas 503. Halaman melaporkan keadaan sebenarnya, bukan menebak.

`git status` sesudah uji: hanya 4 berkas kerja di atas. **`data/` tidak berubah** — uji tidak
mencemari data lokal.

### ⚠️ Yang TIDAK dibuktikan uji ini

- **Tampilan di produksi belum dilihat** — semua uji di atas lokal, mode file (`useSupabase`
  false). Jalur Supabase-nya memakai fungsi `getPlaylyWebhookVideos()` yang sudah dipakai
  `/playly` di produksi, jadi bukan kode baru, tapi tetap belum dilihat langsung.
- **Build lokal mendaftarkan `/playly` sebagai `○ (Static) 5m`**, berbeda dengan TEMUAN di
  `HANDOFF.md` (`ƒ Dynamic` di produksi). Ini **bukan** perbaikan dan bukan bantahan: di lokal
  `useSupabase = false` sehingga `sbDocGet` tak pernah dipanggil, jadi build lokal memang tidak
  bisa membuktikan static-vs-dynamic untuk halaman yang menyentuh Supabase. Keputusan soal
  itu tetap terbuka seperti tercatat di `HANDOFF.md`.

## 6. Cara owner mencoba sendiri

1. Buka situs, login sebagai admin, buka **`/admin`** (atau halaman Video Playly).
2. Di menu samping, klik **"Webhook Playly"** — baris baru tepat di bawah "Video Playly".
3. Yang harus muncul **sekarang** (sebelum kunci dipasang): kartu merah **"Jalur webhook belum
   menyala"** berisi dua langkah perbaikan, lalu kotak **"Alamat yang didaftarkan di Playly"**
   berisi `https://<domain>/api/webhooks/playly`.

Sesudah `PLAYLY_WEBHOOK_SECRET` dipasang di Vercel **dan** situs di-deploy ulang, buka lagi
halaman yang sama: kartu merah harus berganti jadi kartu kuning **"Siap menerima, tapi belum
ada yang masuk"**. Itu buktinya kunci terbaca server. Kartu hijau **"Jalur webhook hidup"**
baru muncul setelah Playly benar-benar mengirim notifikasi pertamanya.

---

## Yang masih menggantung (bukan bagian tugas ini)

Halaman ini **tidak menyelesaikan** penghalang utama yang sudah tercatat di
`2026-09-14-webhook-playly.md`: **belum ada bukti Playly punya fitur kirim webhook sama sekali**
— nol jejak di seluruh repo; nama header, nama event, dan bentuk payload semuanya dari
spesifikasi owner, bukan dokumentasi Playly. Halaman ini membuat keadaan itu **terlihat**, tapi
tidak mengubahnya. Langkah yang menentukan tetap satu: tanyakan ke pengelola Playly apakah
webhook tersedia, lalu minta nama header & bentuk payload yang sebenarnya.

Juga masih terbuka, tercatat di `HANDOFF.md`: anti-replay (`event_id` + `sent_at`),
`/beranda` + `/discover` belum ikut daftar gabungan, dan status static-vs-dynamic `/playly`.
