# Sidebar Video Playly jadi divider + keterangan panjang masuk tombol "?"

**Tanggal:** 2026-11-06
**Permintaan owner (verbatim):**
> "1. sidebar kiri video playly terlalu panjang kamu jadikan divider — IMDB / Link download / Daftar video Playly
> 2. video playly dibawahnya ada keterangan bisa kamu jadikan/masukan icon ?, jadi klo orang mau baca tinggal klik
> kamu kerjakan satu persatu dan buka lokalhost agar aku bisa cek hasilnya"

**Status:** ✅ kode selesai + seluruh gerbang hijau · ⏳ **BELUM di-commit, BELUM di-push** — menunggu owner melihat hasilnya di localhost.

---

## 1. Kondisi nyata sebelum diubah (✅ terverifikasi, bukan ingatan)

| Fakta | Bukti |
|---|---|
| Menu sidebar admin **datar**, tanpa grup | `app/components/admin/AdminSidebar.tsx:39-59` (versi lama) |
| Sidebar dipakai **4 halaman** admin | `app/admin/page.tsx`, `app/admin/settings/playly/page.tsx`, `app/admin/videos/playly/page.tsx`, `app/admin/webhooks/playly/page.tsx` |
| Satu menu "Video Playly" membuka **3 panel besar bertumpuk** | `app/admin/videos/playly/page.tsx:137-221` (versi lama) |
| Pola "satu menu = satu bagian" **sudah ada** di project | `lib/bagian-admin.ts` + `tests/bagian-admin.test.ts` |

Pemetaan nama owner → komponen nyata:

| Nama di menu (owner) | Komponen | Judul panel di layar |
|---|---|---|
| IMDb | `PlaylyVisibilityManager` | "Video yang tampil di halaman penonton" |
| Link download | `PlaylyUnduhanManager` | "Link download per video" |
| Daftar video Playly | `PlaylyVideoPicker` | daftar video + "Video yang sudah terpasang di DramaKu" |

---

## 2. Keputusan rancangan + alasannya

### 2.1 Hash (`#imdb`), BUKAN tiga halaman terpisah

Tiga alamat terpisah terlihat lebih "benar", tapi di halaman INI ia merugikan:
halaman Video Playly memanggil Playly belasan kali saat dibuka, termasuk
`petaBerbatasPlayly` yang menembak **satu permintaan per video** untuk menandai
"video belum siap" (`app/admin/videos/playly/page.tsx:122-130`). Memecahnya jadi
tiga route berarti seluruh pemanggilan itu **diulang tiap pindah menu**.

Dengan hash, pindah menu **nol panggilan jaringan** — datanya sudah ada di layar.
Dan polanya bukan barang baru: `lib/bagian-admin.ts` sudah memakainya sejak
2026-11-05, lengkap dengan tesnya.

### 2.2 🪤 Panel yang tidak dibuka DISEMBUNYIKAN, bukan dilepas dari halaman

**Ini jebakan yang sudah pernah kena di project ini**, bukan kehati-hatian teoretis.

`PlaylyUnduhanManager` menyimpan isian link yang belum ditekan Simpan di state
`draft` miliknya sendiri. Melepas panel dari DOM saat owner menengok menu lain
akan **menghapus isian itu diam-diam** — tanpa error, tanpa peringatan, tanpa
satu pun tes merah. Jebakan identik pernah terjadi di form Tambah Drama; obatnya
tercatat di `tests/bagian-admin.test.ts` ("form DISEMBUNYIKAN, bukan dilepas").

Karena itu `PlaylyBagianAktif` memakai `className={bagian === nama ? undefined : "hidden"}`,
dan ada tes yang **menolak** `bagian === nama && ...`.

### 2.3 Angka tidak boleh ikut hilang ke balik tombol "?"

Dua hitungan dulu terkubur di tengah paragraf penjelasan: "Ditandai Series: 0
dari 500" dan "Sudah terisi: 376 dari 500". Kalau paragrafnya disembunyikan,
angkanya ikut hilang — itu **kemunduran senyap**, bukan perapian.

Keduanya dipindah ke satu baris ringkas **di luar** kotak "?", tepat di bawah
baris status. Penjelasan = aturan (boleh disembunyikan); angka = status (harus
terbaca sekilas).

Konsekuensinya ketiga paragraf keterangan jadi **tidak lagi bersyarat** "ada
video" — sebab tombol "?" yang diklik lalu tidak menampilkan apa-apa terbaca
seperti tombol rusak.

---

## 3. Berkas yang disentuh

**Baru:**
- `lib/bagian-playly.ts` — aturan murni "alamat mana = panel mana"
- `app/components/admin/PlaylyBagianAktif.tsx` — memilih panel yang terlihat
- `app/components/admin/BantuanSingkat.tsx` — judul + tombol "?" + kotak keterangan
- `tests/bagian-playly.test.ts` — 7 tes penjaga

**Diubah:**
- `app/components/admin/AdminSidebar.tsx` — dukungan grup (divider) + `sedangDibuka` kini mengerti hash di halaman non-`/admin`
- `app/admin/videos/playly/page.tsx` — tiga panel dibungkus `PlaylyBagianAktif`, keterangan kepala halaman masuk "?"
- `app/components/admin/PlaylyVisibilityManager.tsx` — 3 keterangan masuk "?", angka pindah ke baris ringkas

---

## 4. Yang ikut tersenggol

| Fitur | Terdampak? | Penjaganya |
|---|---|---|
| Menu `/admin` (Dashboard, Tambah Drama, dst.) | Logika penanda "sedang dibuka" ditulis ulang | `tests/bagian-admin.test.ts` — 8 tes, tetap hijau |
| Halaman Kunci Playly & Webhook Playly | Memakai sidebar yang sama | build + tes hijau; menunya tetap di luar grup |
| Panel link download | Dipindah ke menu sendiri | tes "disembunyikan, bukan dilepas" |
| Halaman penonton | **Tidak** — nol berkas penonton disentuh | — |

---

## 5. Bukti (§4.6 — "selesai = terbukti")

Urutan gerbang sesuai `AGENTS.local.md` §6 (**build mendahului tsc**, sengaja):

```
rm -rf .next
npm run build   -> sukses
npx tsc --noEmit -> exit 0
npm test        -> 138 berkas / 1992 tes hijau (dari 137/1970)
```

Dev server lokal: `npm run dev -- -p 3030 -H 127.0.0.1` → `GET /admin/videos/playly` **200**.

**Batas jujur:** tampilan SESUDAH login admin belum dilihat sendiri — login
lokal ditolak **401** (akun admin tampaknya sudah memakai password per-akun di
database, bukan `ADMIN_PASSWORD` bersama). Yang terbukti: kode terkompilasi,
tipe benar, struktur menu↔panel konsisten, halaman merespons. Yang **belum**
terbukti: jarak/garis/posisi visual — itu perlu mata owner.

---

## 6. Yang TIDAK dibangun (sengaja)

- **Menu "Webhook Playly" & "Kunci Playly" tidak dimasukkan ke dalam grup.** Owner
  menyebut tiga anak, bukan lima; keduanya halaman terpisah dan dibiarkan di
  tempatnya. Batas grup ditegaskan dengan garis atas-bawah supaya tidak terbaca
  seolah ikut anggota.
- **Halaman tidak dipecah jadi tiga route.** Alasannya di §2.1.
- **Tidak ada dependensi UI baru** (tooltip/popover). Tombol "?" dibangun dari
  `button` + CSS yang sudah ada.

---

# PUTARAN 2 — kepala panel dirapikan + PAGINASI

**Permintaan owner (verbatim):**
> "sekarang kamu rapikan lagi yang no 1 agar UI nya lebih bagus lalu buatkan
> pagination dimana setiap halaman bisa kita adjust (25,50,100,150,200, dst)
> ada sebelumnya - berikutnya"

Owner melampirkan dua tangkapan layar: panel IMDb miliknya sendiri (area no.1
ditandai = tumpukan spanduk + kalimat status + baris angka), dan panel admin
NumberSEO sebagai contoh paginasi (`101-200 dari 5.252 · Baris: 100 ·
‹ Sebelumnya · Berikutnya ›`).

## P2.1 Kepala panel: dari empat blok teks jadi kartu + satu kelompok spanduk

**Sebelum:** spanduk amber (gangguan Playly) → kalimat status → baris angka
kecil → tombol pencocokan massal → spanduk rose (belum siap) → spanduk sky
(katalog publik) → tombol saringan. Peringatan berserak di dua tempat dengan
tiga ukuran teks berbeda, dan **posisinya berpindah** tergantung spanduk mana
yang kebetulan muncul.

**Sesudah:** judul + "?" → **4 kartu angka** (Total · Tampil ke penonton ·
Ditandai Series · Sudah ada IMDb) → **satu kelompok spanduk** bergaya seragam →
pencocokan massal → toolbar saringan → paginasi → daftar → paginasi.

Dua komponen pembantu dibuat **di luar** komponen utama (`Spanduk`,
`KartuAngka`) — komponen yang didefinisikan ulang tiap render dianggap React
sebagai komponen baru. Warna spanduk dipusatkan di `NADA_SPANDUK`; sebelumnya
tiga spanduk masing-masing menulis ulang rentetan kelas sendiri dan **satu di
antaranya sudah terlanjur beda ukuran teks**.

## P2.2 Paginasi — tiga jebakan senyap, ditutup lewat PENJEPIT saat render

Nomor halaman yang keluar rentang **tidak memunculkan error apa pun**.
Daftarnya cuma kosong, dan layar kosong terbaca seperti panel rusak. Tiga
kejadian nyata membuatnya kedaluwarsa tanpa ada yang menyentuh tombol halaman:

| # | Kejadian | Akibat tanpa penjepit |
|---|---|---|
| 1 | Di halaman 3 "Semua" (359 video) → klik "Belum ada IMDb" (61 video) | halaman 3 tidak ada → daftar kosong |
| 2 | Di halaman terakhir "Belum" → video terakhirnya dicocokkan | halaman itu lenyap → kosong |
| 3 | Di halaman 10 dengan Baris 25 → ganti ke 200 | menunjuk baris ke-1800 → kosong |

Obatnya `jepitHalaman()` yang dipanggil **saat render**, bukan `useEffect` yang
membetulkan state sesudahnya — lewat efek, selalu ada **satu render di mana
daftarnya kosong lebih dulu**, dan kosong itulah yang terbaca rusak. Ganti
saringan dan ganti ukuran **tambahan** memulangkan ke halaman 1, karena
melompat ke halaman terakhir tanpa diminta tetap membingungkan walau tidak
rusak.

**Keputusan yang diambil sendiri (default masuk akal, owner boleh ubah):**
bawaan **50 baris**, pilihan `25 · 50 · 100 · 150 · 200 · 500`. Angka terbesar
melampaui jumlah video hari ini (±500), jadi memilihnya setara "tampilkan
semua" — **tanpa perlu nilai khusus** yang harus diperlakukan beda di setiap
perhitungan.

**Kontrol dipasang dua kali** (atas & bawah daftar) dan sengaja **tidak
menyimpan nomor halaman sendiri**: dengan 200 baris per halaman, kontrol yang
cuma ada di bawah memaksa menggulung seluruh daftar hanya untuk pindah halaman
— dan dua kontrol ber-state sendiri akan menampilkan angka yang berbeda untuk
daftar yang sama.

## P2.3 🪤 Penjaga LAMA yang ikut merah — dan kenapa diperketat, bukan dilonggarkan

`tests/saring-video-admin.test.ts:88` mengunci `videoTampil.map(` untuk menjaga
"daftar memakai hasil saringan, BUKAN daftar mentah". Paginasi mengubah mata
rantainya jadi `videos → saringVideoImdb → videoTampil → potongHalaman →
videoHalaman → .map`, sehingga penjaga itu merah.

**Godaannya:** hapus barisnya supaya hijau. Itu persis pelanggaran §5.3
(melemahkan pengaman demi meloloskan kerja sendiri). **Yang dilakukan:**
penjaganya menuntut **kedua** mata rantai sekaligus (`potongHalaman(videoTampil`
dan `videoHalaman.map(`) — lebih ketat dari sebelumnya, maksudnya tetap sama.

🪤 Jebakan kecil yang ikut ketahuan: tes paginasi baru **hijau saat dijalankan
sendiri** tapi suite penuh merah — karena yang merah bukan tes baru itu,
melainkan tes lama di berkas lain. Menjalankan hanya berkas tes yang baru
ditulis **bukan bukti tidak ada yang rusak**.

## P2.4 Berkas (putaran 2)

**Baru:** `lib/paginasi.ts` · `app/components/admin/PaginasiDaftar.tsx` ·
`tests/paginasi.test.ts` (15 tes).
**Diubah:** `app/components/admin/PlaylyVisibilityManager.tsx` ·
`tests/saring-video-admin.test.ts` (penjaga diperketat).

## P2.5 Bukti (putaran 2)

```
dev server dimatikan dulu (menulis ke .next yang sama dengan build)
rm -rf .next
npm run build    -> Compiled successfully (exit 0)
npx tsc --noEmit -> exit 0
npm test         -> 139 berkas / 2007 tes hijau (dari 138/1992)
```

**Diuji-balik** (bukan sekadar hijau): `videoHalaman.map` dikembalikan jadi
`videoTampil.map` **dan** `setHalaman(HALAMAN_PERTAMA)` dihapus dari tombol
saringan → **2 tes MERAH** tepat di dua titik itu; kode dikembalikan → hijau
lagi.

Dev lokal `127.0.0.1:3030` → `GET /admin/videos/playly` **200**.

**Batas jujur (sama seperti putaran 1):** tampilan sesudah login admin belum
dilihat sendiri — login lokal ditolak 401. Jarak, lebar kartu, dan posisi
tombol halaman masih perlu mata owner.

---

# PUTARAN 3 — koreksi owner atas putaran 2

**Permintaan owner (verbatim):**
> "1. yang kusilang kamu hapus lalu 1 dan 2 kamu letak di kiri
> 2. keterangan pagination ada 2 (atas dan bawah) yang di atas kamu hapus
> 3. kamu rapikan kalau perlu di bikin chart agar lebih enak lihatnya"

## P3.1 Teks rentang dibuang, kontrol rata kiri

Teks `1–50 dari 359 video` dihapus; `Baris:` + `Hal 1 / 8` + kedua tombol kini
satu kelompok rata **kiri**. **Nol informasi hilang:** jumlahnya memang sudah
tertulis di tombol saringan tepat di atas daftar (`Semua 359 · Sudah ada IMDb
298 · Belum ada IMDb 61`), jadi menuliskannya lagi cuma mengulang.

`rentangTampil()` ikut dihapus dari `lib/paginasi.ts` beserta tesnya — tidak
ada lagi yang memakainya, dan fungsi yang tak terpakai adalah dead code (§3.1).

## P3.2 Kontrol halaman tinggal SATU, di bawah daftar

Putaran 2 memasangnya dua kali dengan alasan "biar tak perlu menggulung".
Owner menilai yang atas cuma menambah baris. Penjaga barunya menuntut **tepat
satu** `<PaginasiDaftar>` **dan** posisinya sesudah `videoHalaman.map(` —
supaya tidak diam-diam kembali jadi dua saat panel ini disunting lagi.

## P3.3 Daftar video berbaris kolom — dan kenapa BUKAN tabel satu baris

Keluhan owner terlihat jelas di tangkapan layarnya: tombol **"Sembunyikan"
turun ke baris kedua hanya pada sebagian video**, jadi tinggi barisnya
berbeda-beda tanpa pola. Penyebabnya `flex-wrap` — begitu isinya melebihi
lebar, elemen terakhir membungkus; video berjudul panjang membungkus, yang
pendek tidak.

**Tabel 6 kolom satu baris DIUKUR dan DITOLAK.** Kelima kontrolnya saja
memakan ±580px, sedangkan isi panel hanya ±670px di lebar layar yang dipakai
owner (viewport ±1000px: `1000 − 48 padding − 220 sidebar − 24 gap − 40 padding
section`). Memaksakan judul ikut sebaris berarti judulnya tinggal belasan
karakter, atau tabelnya harus digeser ke samping. Yang dipilih: **dua tingkat
yang seragam** — judul + catatan di tingkat atas, lima kontrol berbaris kolom
di tingkat bawah, dengan **judul kolom** di atas daftar. Tinggi tiap video jadi
identik.

Template kolomnya disimpan di satu konstanta `KOLOM_KONTROL` dan dipakai baris
judul kolom maupun tiap baris video — dua salinan pasti menyimpang, dan kolom
yang menyimpang membuat judul kolom menunjuk kontrol yang salah tanpa error.

Catatan (kreator · durasi · status) didorong ke **kanan judul**, bukan jadi
tingkat sendiri: satu tingkat lebih pendek per video, dan di halaman 50 video
itu menghemat hampir satu layar penuh.

## P3.4 🪤 Akar goyangnya baris: panel pencarian IMDb ikut alur

`PlaylyImdbPicker` menggambar panel pencarian selebar **420px** sebagai elemen
biasa di dalam baris. Begitu satu pencarian dibuka, kolomnya melebar dan
kontrol di sebelahnya terdorong turun — **seluruh daftar bergoyang**. Kolom
yang disejajarkan rapi akan rusak lagi tiap kali tombol *Cari di IMDb* ditekan.

Diperbaiki jadi **melayang** (`absolute right-0 top-full z-20`), dengan
pembungkus `relative` sebagai jangkar. Lebar baris kini tidak berubah sama
sekali saat panel dibuka. Sudah diverifikasi tidak ada induk ber-`overflow-hidden`
di jalurnya (`PlaylyVisibilityManager`, `PlaylyBagianAktif`, halaman) — kalau
ada, panelnya akan terpotong.

`PlaylyImdbPicker` hanya dipakai oleh `PlaylyVisibilityManager` (dicek: di
`PlaylyCocokkanSemua` namanya cuma muncul di komentar), jadi perubahan ini
tidak menyenggol pemanggil lain.

## P3.5 Tes RENDER — bukti di tampilan, bukan cuma di hitungan

Putaran ini menambah tes yang benar-benar menggambar panel ke HTML
(`renderToStaticMarkup`, meniru pola `tests/panel-playly-tahan-gangguan.test.ts`):
60 video masuk → **tepat 50 `<li>` keluar**, "Video 50" ada, "Video 51" tidak;
kelima judul kolom tergambar; dropdown `Baris:` muncul **tepat sekali**; dan 7
video tergambar tujuh-tujuhnya (jaring off-by-one).

Ini penting karena fungsi murni bisa menghitung dengan sempurna sementara
daftarnya tetap menggambar semua video. 💡 Tes render ini **langsung berguna di
percobaan pertama**: ia merah karena judul kolom terakhir punya kelas CSS
sendiri, sehingga pola `<span>Aksi</span>` tidak cocok — polanya yang
dibetulkan, bukan penjaganya yang dilonggarkan.

## P3.6 Berkas (putaran 3)

**Diubah:** `app/components/admin/PaginasiDaftar.tsx` ·
`app/components/admin/PlaylyVisibilityManager.tsx` ·
`app/components/admin/PlaylyImdbPicker.tsx` · `lib/paginasi.ts` (buang
`rentangTampil`) · `tests/paginasi.test.ts` (20 tes).

## P3.7 Bukti (putaran 3)

```
dev server dimatikan dulu
rm -rf .next
npm run build    -> Compiled successfully (exit 0)
npx tsc --noEmit -> exit 0
npm test         -> 139 berkas / 2012 tes hijau (dari 139/2009)
```

**Diuji-balik:** judul kolom "Kualitas" dihapus **dan** panel picker
dikembalikan ikut alur → **2 tes MERAH** tepat di dua titik itu; dikembalikan →
hijau.

**Batas jujur:** tetap sama — tampilan sesudah login admin belum dilihat
sendiri (login lokal 401). Yang kini SUDAH terbukti lewat HTML sungguhan:
jumlah baris per halaman, judul kolom, dan jumlah kontrol halaman. Yang masih
perlu mata owner: lebar kolom di layarnya dan jarak antar tingkat.
