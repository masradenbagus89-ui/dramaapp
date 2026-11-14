# Urutan video SE-SITUS diurut TAHUN RILIS, bukan waktu upload

> 2026-11-14 · dua permintaan owner berurutan:
> 1. *"film terbaru kamu rubah daftarnya lihat dari tahunnya bukan dari yang baru di upload biar terupdate film yang benar benar baru"*
> 2. *"seragam ikut tahun rilis"* — berlaku untuk SELURUH halaman, bukan satu baris.
>
> Status: **selesai + terbukti**, ⏳ belum di-push.

## Masalahnya

Baris "Film Terbaru" di halaman depan diurut dari `receivedAt` — **kapan video diunggah**, bukan tahun rilis filmnya (`lib/playly-gabungan.ts:227`). Akibatnya film 2021 yang kebetulan baru diunggah kemarin duduk di posisi 1, di atas film 2026.

Terukur di produksi hari itu, 20 teratas berisi campuran 2021–2026, dan satu film **tanpa tahun sama sekali** ("Novocaine") nangkring di posisi 13.

## 🪤 Jebakan yang hampir membuat perbaikannya jadi KEBALIKANNYA

Pendekatan paling jelas — "urutkan saja pakai kolom `year`" — justru **melempar film terbaru ke buntut daftar**. Sebabnya diukur lebih dulu, bukan dikira-kira (481 video tayang):

| sumber tahun | jumlah |
|---|---|
| kolom `year` tersimpan (IMDb / ketikan admin) | 377 |
| **hanya ada di dalam judul**, mis. `The Mongoose (2026)` | 70 |
| tidak ada di mana pun | 28 |

Yang menentukan: **12 video paling depan saat owner melapor — persis yang ada di layarnya — semuanya belum dicocokkan metadatanya**, jadi `year`-nya `null`. Mengurut dari kolom `year` saja akan menaruh kedua belas film terbaru itu di urutan paling akhir. Nol error, nol tes merah: baris yang isinya salah, dan tak ada yang melapor.

Karena itu judul ikut dibaca — tapi hanya sebagai **cadangan**, bukan sumber utama.

## Aturannya (`lib/tahun-film.ts`)

1. **Kolom `year` dulu.** Ia sudah berisi ketikan admin yang menang atas IMDb (`lib/durasi-video-publik.ts:80`). Ketikan admin = koreksi sadar manusia; ia tak boleh kalah oleh angka yang kebetulan tertulis di nama berkas.
2. **Kalau kosong, baca tahun dalam kurung di judul.** Harus dalam kurung — pagar yang penting: tanpa itu "Blade Runner 2049" jadi film tahun 2049 dan menguasai urutan teratas selamanya.
3. **Tahun sama → urutan upload dipertahankan** (sort stabil). Jadi di antara sesama film 2026, yang baru diunggah tetap di depan.
4. **Tanpa tahun → ke belakang, TIDAK dibuang.** Membuangnya berarti 28 film lenyap dari situs gara-gara metadatanya belum lengkap.

Diurut **sebelum** `.slice(0, 20)`. Urutannya tidak boleh dibalik: memotong duluan berarti yang diurut cuma 20 film teratas menurut waktu upload — hasilnya *terlihat* urut tahun padahal isinya tetap salah.

## Di mana dipasang, dan kenapa justru di situ

**SATU pemanggil: `rakitGabungan` di `lib/playly-gabungan.ts`** — titik tempat daftar video dirakit untuk seluruh situs. Bukan ditempel di tiap halaman.

Dua alasan, keduanya mengikat:

1. **"Seragam" cuma bisa dijamin oleh satu pemanggil.** Begitu sebuah halaman mengurut sendiri, ia boleh berbeda dari halaman lain — dan penonton melihat urutan berubah hanya karena berpindah halaman, tanpa satu pun error.
2. **Harus di lapisan PALING LUAR**, sesudah seluruh penempelan metadata. `lengkapiDurasiVideo` lah yang menempelkan **tahun ketikan admin** ke `year`. Mengurut lebih dalam = mengurut sebelum koreksi admin masuk: tiap tahun yang dibetulkan admin dengan tangan akan diabaikan urutannya, diam-diam.

**Jalur cadangan ikut diurut.** Kalau tidak, urutan situs kembali ke aturan lama persis saat sumber videonya sedang bermasalah — dan gejalanya akan terbaca sebagai bug baru, bukan sebagai tanda gangguan.

### Aturan lama yang digantikan

`gabungVideoPlayly` dulu menaruh **webhook di atas, katalog di bawah** sebagai dua blok terpisah, karena sisi katalog tak punya data waktu sama sekali. Tahun rilis **dipunyai keduanya**, jadi pemisahan itu tidak lagi jujur: film katalog 2026 berhak di depan video webhook 2019. Fungsi `gabungVideoPlayly` sendiri **tidak diubah** — urutan internalnya tetap jadi tie-break saat tahunnya sama.

## Batas yang diketahui (jujur, tidak disembunyikan)

13 dari 481 video (terukur 2026-11-14) punya tahun IMDb yang **beda** dari tahun di judulnya, dan sebagian jelas salah-cocok: `Pitfall (2025)` tercatat **1962**, `외계+인 2부 (2024)` tercatat **1991**, `老板娘3 (2023)` tercatat **2010**. Film itu akan duduk di tahun IMDb-nya.

Ini masalah **akurasi metadata**, bukan masalah urutan — dan cara membetulkannya sudah ada tanpa kode baru: isi kolom Tahun di panel admin (fitur 2026-11-09), karena ketikan admin menang atas semuanya.

## Cakupannya sekarang

Ikut berubah otomatis karena membaca sumber yang sama: **halaman depan `/`**, **`/beranda`**, **`/film`**, **`/discover`**, **hasil pencarian**, dan **baris genre**.

Serial Playly ikut terurut juga — jalur rakitnya satu. Dampak nyatanya kecil (baru 1 video yang ditandai serial), dan aturannya sama masuk akal: tahun rilis terbaru lebih dulu.

Yang **tidak** tersentuh: katalog drama Supabase punya urutannya sendiri (`lib/discover.ts`) dan tidak lewat jalur ini.

## Bukti

- `tests/tahun-film.test.ts` — aturan tahunnya sendiri + penjaga "aturannya tidak tercecer ke halaman" (komentar dibuang dulu sebelum teks diperiksa, mengikuti pelajaran 2026-11-14 ke-2).
- `tests/playly-gabungan.test.ts` — **5 tes perilaku** di titik rakit: film tahun terbaru naik walau diunggah paling lama · ketikan admin ikut menentukan urutan · video tanpa tahun turun tapi tidak hilang · video katalog ikut terurut bersama webhook · tahun sama tetap terbaru-upload dulu.
- **Diuji-balik dengan benar, dan percobaan pertamanya GAGAL jadi bukti:** melumpuhkan pengurut dengan cara yang merusak sintaks membuat jumlah tes turun 67→24 — berkasnya gagal dimuat, bukan tesnya merah. Diulang memakai fungsi identitas yang sintaksnya sah → **4 tes MERAH**, dipasang lagi → hijau. 🪤 **Jumlah "Test Files" wajib dibaca saat uji-balik; "ada yang merah" saja bukan bukti.**
- Satu tes sempat **hijau palsu** — urutan masuknya kebetulan sudah benar, jadi ia lulus walau pengurutnya dicabut. Dibetulkan dengan membalik urutan masuknya lebih dulu.
- `tests/jenis-video.test.ts` dilonggarkan dari teks persis ke pola — penjaga lama mengunci ejaan `film.slice(...)` sehingga pembungkus yang sah ikut merah. Yang dijaga tetap sama: yang dipotong berasal dari `film`, bukan `videos`.
- `npm run gerbang` → **LOLOS 5/5**, exit 0 (**2509 tes / 178 berkas** hijau; build exit 0; `tsc --noEmit` exit 0 sesudah build; nol berkas rahasia di antrean push). `/` dan `/beranda` tetap **○ Static**.
- Fungsi aslinya dijalankan atas data produksi: 20 teratas berubah dari campuran 2021–2026 (+1 tanpa tahun) menjadi **seluruhnya 2026, nol film tanpa tahun yang bocor**.

## 📌 Angka-angka di atas adalah POTRET SESAAT

Terukur bergerak dalam setengah jam yang sama: video ber-`year` naik **377 → 444**, entri `playly:imdb` **493 → 560** — admin sedang melengkapi metadata. Jangan pakai angkanya untuk menyimpulkan "pembacaan judul sudah tak perlu": selama video baru masuk lebih cepat daripada pencocokan metadatanya, **upload terbaru akan selalu jadi kelompok yang `year`-nya paling sering kosong** — persis kelompok yang paling penting diurutkan benar.
