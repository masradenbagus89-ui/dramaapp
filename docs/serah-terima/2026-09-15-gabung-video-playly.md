# 2026-09-15 — Halaman /playly menampilkan video webhook, bukan cuma katalog

> Branch: **`feat/playly-webhook`** (lanjutan dari `b7459a4`). **Belum tayang.**
> Menyambung pekerjaan `docs/serah-terima/2026-09-14-webhook-playly.md`.

## 1. Apa yang berubah + kenapa

Endpoint webhook yang dipasang 2026-09-14 sudah menyimpan video yang didorong Playly dengan
rapi, **tapi datanya tidak pernah ditampilkan di halaman mana pun**. Halaman `/playly` hanya
menggambar katalog yang kita jemput sendiri tiap 300 detik, jadi seluruh gunanya webhook
(video baru muncul seketika) belum terasa sama sekali.

Sekarang `/playly` membaca **kedua** sumber dan menggabungkannya jadi satu daftar. Tiga
keputusan yang perlu diketahui owner:

**Saat videoId yang sama ada di kedua sumber, versi KATALOG yang menang.** Bukan karena
datanya lebih baru, tapi karena baris katalog sudah lolos dua saringan yang **tidak** dilewati
baris webhook: video yang disembunyikan admin, dan video yang berkasnya tak pernah sampai di
Playly (upload putus → penonton dapat layar hitam). Kalau baris webhook yang menang, video
yang sengaja disembunyikan admin bisa muncul lagi lewat pintu webhook — persis bug yang sudah
pernah lolos ke produksi sekali.

**Daftar sembunyi admin sekarang berlaku untuk kedua sumber.** Tanpa ini: admin menyembunyikan
video → hilang dari katalog → muncul lagi dari webhook.

**Urutannya dua blok: webhook di atas, katalog di bawah.** Ini bukan pilihan estetika. Tipe
`PlaylyVideo` (`lib/playly.ts:390-402`) **tidak punya field tanggal sama sekali** — tidak
dikirim Playly, tidak dibaca parser (`lib/playly.ts:628-637`). Jadi tidak ada angka waktu di
sisi katalog untuk dibandingkan dengan `receivedAt` milik webhook. Dan `receivedAt` sendiri
artinya "kapan **kita** menerima notifikasi", bukan "kapan videonya dibuat" — memakainya
sebagai pembanding lintas-sumber akan membuat video katalog yang baru diunggah kalah dari
video webhook lama yang notifikasinya kebetulan baru tiba. Antar sesama video webhook urutan
`receivedAt` tetap dipakai (terbaru di atas).

## 2. Berkas yang disentuh

**Baru:**
- `lib/playly-gabungan.ts` — aturan gabung + adapter bentuk data
- `tests/playly-gabungan.test.ts` (18 tes)

**Diubah:**
- `app/playly/page.tsx` — memanggil `getPlaylyVideosGabungan()` (ganti `getPlaylyVideosPublik()`)
- `app/api/playly/video/route.ts` — gerbang video ikut membaca daftar gabungan
- `tests/playly-video-route.test.ts` — mock menyesuaikan + 1 tes baru

### ⚠️ Kenapa route `/api/playly/video` ikut disentuh

Kartu di halaman diputar pemutar DramaKu sendiri, yang minta alamat berkas ke
`/api/playly/video?id=...`. Route itu punya **gerbang IDOR**: id dari browser hanya diteruskan
ke Playly kalau video itu memang ada di daftar yang tampil di halaman penonton. Gerbangnya
dulu hanya mengenal katalog mitra — artinya kalau daftarnya saja yang digabung, **video
webhook akan TAMPIL di halaman tapi membalas 404 begitu diklik.** Kartu yang terlihat sehat
tapi mati, dan rusaknya baru ketahuan kalau ada yang mengkliknya.

**Gerbangnya tidak dilemahkan.** Yang berubah cuma isi daftar yang diizinkan, dan isinya tetap
daftar tertutup yang kita kurasi: baris webhook hanya bisa masuk lewat POST yang sudah lolos
verifikasi kunci (`lib/playly-webhook.ts`), berstatus `published`, dan tidak ada di daftar
sembunyi admin.

### Halaman lain: TIDAK berubah

`lib/playly-publik.ts` **tidak disentuh sama sekali**, jadi `/beranda`, `/discover`, dan
halaman admin berperilaku persis seperti sebelumnya — video webhook belum muncul di sana.
Itu sengaja: menyuntikkan sumber kedua ke berkas itu berarti empat pemanggil ikut berubah
diam-diam. Kalau owner mau ketiganya ikut, tinggal ganti satu baris import di masing-masing
halaman (lihat §7).

### Gagal-aman saat daftar sembunyi tak terbaca

Kalau `getPlaylyHiddenIdsCached()` gagal, kita tidak tahu video mana yang sengaja
disembunyikan admin — jadi **jalur webhook ditahan seluruhnya**, bukan diloloskan
(`skills/owasp/SKILL.md` §1 A10: jangan fail-open). Yang ditahan hanya sumber baru ini;
katalog tetap berperilaku seperti sebelumnya, karena keputusan itu sudah dipakai
`/beranda` + `/discover` juga dan mengubahnya di sini = mengubah dua halaman lain diam-diam.

## 3. Butuh SQL migrasi?

**Tidak.** Tidak ada tabel, kolom, atau dokumen baru — yang dibaca dokumen `playly:webhook`
dan `playly:hidden` yang sudah ada.

## 4. Butuh env baru di Vercel?

**Tidak.** Tapi catatan penting: kalau `PLAYLY_WEBHOOK_SECRET` belum dipasang di Vercel,
webhook membalas 503 dan **tidak ada video yang pernah masuk** — jadi halaman `/playly` akan
terlihat persis seperti sebelum perubahan ini. Itu bukan tanda gabungannya gagal.

## 5. Bukti yang sudah dijalankan

- `npx tsc --noEmit` → **0 error**
- `npm test` → **632 tes lulus, 46 berkas** (19 di antaranya baru: 18 di
  `tests/playly-gabungan.test.ts` + 1 di `tests/playly-video-route.test.ts`)
- `rm -rf .next && npm run build` → **sukses**, `/playly` tetap static + revalidate 5m

Empat skenario yang diminta tercakup di `tests/playly-gabungan.test.ts`: kedua sumber berisi ·
videoId sama di keduanya · satu sumber mati (diuji dua arah: katalog mati, lalu webhook mati) ·
kedua sumber kosong. Ditambah: video unpublished, video yang disembunyikan admin, gagal-aman
saat daftar sembunyi tak terbaca, urutan `receivedAt`, dan pemetaan bentuk datanya.

## 6. Cara owner mencoba sendiri

1. Buka **`/playly`** → video katalog yang sekarang tayang harus masih ada semua, urutannya
   tidak berubah.
2. Kirim satu notifikasi `video.published` dari Playly (atau ketuk
   `POST /api/webhooks/playly` dengan kunci yang benar) → **refresh `/playly` setelah 5 menit**
   (halaman disimpan 300 detik) → video baru itu muncul **di posisi paling atas**.
3. **Klik** video baru itu → pemutar harus benar-benar jalan, bukan pesan "Video tidak
   tersedia". Inilah yang membuktikan gerbang di §2 sudah benar.
4. Buka halaman admin → sembunyikan video itu → setelah 5 menit, video hilang dari `/playly`.

## 7. Batas jujur + yang sengaja TIDAK dibangun

- ❓ **Belum terbukti di dunia nyata:** apakah `fetchPlaylyVideoUrl()` berhasil mengambil
  alamat berkas untuk video yang **hanya** ada di webhook. Secara desain seharusnya bisa — ia
  memakai endpoint publik Playly tanpa kunci (`lib/playly.ts:1239`), jadi tidak terbatas pada
  akun mitra. Tapi sampai ada video webhook sungguhan yang masuk, ini **asumsi, bukan fakta**.
  Langkah 3 di §6 adalah pembuktiannya.
- **Video webhook TIDAK diperiksa "berkasnya ada atau tidak"** seperti video katalog.
  Pemeriksaan itu butuh satu panggilan jaringan per video, dan risikonya lebih kecil di jalur
  ini (Playly mengirim `video.published` justru saat video sudah diterbitkan). Kalau ternyata
  ada video webhook yang gagal diputar, di situlah penyebab pertama yang harus dicek.
- **Kaitan video→drama tidak ikut untuk video webhook** (label "bagian dari drama X" kosong).
  Kaitan itu dibuat admin dari daftar katalog mitra, jadi video yang hanya masuk lewat webhook
  memang belum punya kaitan yang bisa dibaca. Tahun & genre tetap terisi kalau Playly
  mengirimnya.
- **`/beranda` dan `/discover` belum ikut.** Kalau owner mau, ganti import
  `getPlaylyVideosPublik` → `getPlaylyVideosGabungan` di `app/beranda/page.tsx:3` dan
  `app/discover/page.tsx:4`. Perlu diputuskan owner, bukan diubah diam-diam: keduanya halaman
  yang sudah tayang.
