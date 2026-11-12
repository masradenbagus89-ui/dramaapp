# Isi massal data video Playly — "sekali jalan, tidak per satu film"

> 2026-11-11 · bobot **BERAT** (fitur baru + nilainya tayang ke penonton) ·
> owner: *"sebagian film kan tidak ada di imdb dan saya harus isi manual contohnya
> kualitas, rating dll, kalau diisi satu persatu akan makan waktu bisa kamu buatkan
> agar saya bisa mengisinya sekali jalan agar tidak perlu isi persatu film"*

## 0. Keputusan owner (popup 2026-11-11)

| Pertanyaan | Jawaban owner |
|---|---|
| Bentuk isian | **Keduanya** — centang-banyak → terapkan satu nilai, DITAMBAH ketik-semua → Simpan sekali |
| Cakupan kolom | **6 kolom**: Jenis, Kategori, Kualitas, Rating, Tahun, Durasi |

## 1. Laporan kondisi nyata (✅ terverifikasi dari kode)

✅ Tabel Admin → IMDb ada di `app/components/admin/PlaylyVisibilityManager.tsx`
(1461 baris), dirender sebagai bagian `#imdb` halaman `/admin/videos/playly`.

✅ Enam kolom isian manual sudah ada, masing-masing **endpoint sendiri** dan
**simpan sendiri-sendiri**:

| Kolom | Cara isi sekarang | Endpoint | Penyaring nilai |
|---|---|---|---|
| Jenis | dropdown, simpan seketika | `/api/admin/playly/jenis` | `parseJenisVideo` (`lib/jenis-video.ts`) |
| Kategori | dropdown, simpan seketika | `/api/admin/playly/genre` | `parseKategoriVideo` (`lib/types.ts:370`) |
| Kualitas | dropdown, simpan seketika | `/api/admin/playly/kualitas` | `parseDramaQuality` (`lib/types.ts:73`) |
| Rating | ketik + blur | `/api/admin/playly/rating` | `parseRatingManual` (`lib/rating-video.ts`) |
| Tahun | **harus klik judul dulu** → panel detail | `/api/admin/playly/meta` | `parseTahunManual` (`lib/meta-video-manual.ts`) |
| Durasi | **harus klik judul dulu** → panel detail | `/api/admin/playly/meta` | `parseDurasiManual` (`lib/meta-video-manual.ts`) |

✅ Satu film tanpa data IMDb butuh **±6 interaksi + 4 permintaan ke server**.
Dikali puluhan film = inilah yang owner keluhkan.

✅ **Jebakan 1 — pembatas laju.** `guardMutation` (`lib/request-guard.ts`)
membatasi **60 permintaan per menit per endpoint per IP**. Mengisi 100 film
dengan 100 permintaan rating = kena 429 di tengah jalan.

✅ **Jebakan 2 — tulis-timpa (lost update).** Tiap `setPlaylyVideo*` di
`lib/store.ts` membaca **seluruh** dokumen → ubah satu kunci → tulis **seluruh**
dokumen kembali (`setPlaylyVideoKualitas` `lib/store.ts:1279`,
`setPlaylyVideoMetaManual` `lib/store.ts:1420`). Memanggilnya 50× berbarengan =
yang belakangan menimpa yang duluan, **tanpa satu pun error**.

✅ **Jebakan 3 — lebar tabel sudah mepet.** `KOLOM_BARIS`
(`PlaylyVisibilityManager.tsx:117`) mencatat lebar tiap kolom diukur dari potret;
judul film hanya kebagian ±124px. Menambah centang + Tahun + Durasi ke tabel itu
= 10 kolom, judul terpotong jadi beberapa huruf — keluhan yang sudah pernah owner
sampaikan.

❓ Belum diverifikasi: berapa film di produksi yang benar-benar kosong
rating/kualitas/tahun/durasi (butuh data produksi; tidak mengubah rancangan).

## 2. Keputusan rancangan + alasannya

**(a) Layar sendiri, bukan menumpang tabel IMDb.** Bagian baru `#isi-cepat` di
halaman yang sama + satu baris menu baru di sidebar grup "Video Playly".
Alasan: jebakan 3 di atas, dan tabel IMDb yang sudah disetujui owner tidak
disentuh sama sekali (nol risiko kemunduran). Bonus yang kebetulan pas:
`PlaylyBagianAktif` **menyembunyikan** panel yang tak dibuka, bukan melepasnya —
jadi isian yang belum disimpan tidak hilang saat owner menengok menu lain.

**(b) SATU endpoint massal baru**, bukan memanggil 6 endpoint lama berkali-kali:
`POST /api/admin/playly/massal` menerima daftar perubahan, menyaring di server,
lalu menulis **satu kali per dokumen**. Menutup jebakan 1 dan 2 sekaligus.

**(c) Penyaring nilai DIPAKAI ULANG, tidak ditulis ulang.** Keenam penyaring di
tabel §1 sudah teruji; menulis aturan kedua di endpoint baru = dua aturan yang
pasti menyimpang.

## 3. Pre-mortem — "semua ini jadi, tapi NOL guna bagi owner. Kenapa?"

**Penyebab paling mungkin: owner mengisi 40 film, lalu ketikannya hilang** —
halaman ter-refresh, tab tertutup, atau simpan gagal sebagian tanpa memberi tahu.
Mode "ketik semua lalu simpan sekali" justru **menumpuk** risiko itu: makin lama
diisi, makin banyak yang bisa hilang sekaligus. Fitur yang bikin kerja ulang
lebih buruk daripada tidak ada.

Penangkal yang masuk ke rencana:
1. Peringatan browser saat meninggalkan halaman dengan isian belum disimpan.
2. Panel disembunyikan (bukan dilepas) saat pindah menu — sudah dijamin
   `PlaylyBagianAktif`, ditambah tes penjaga.
3. Simpan gagal → **draft TIDAK dihapus**, isian tetap di layar untuk dicoba lagi.
4. Balasan server menyebut **angka pasti** ("38 video tersimpan"), dan nilai yang
   ditolak penyaring dilaporkan per baris — bukan hilang diam-diam.

## 4. Tahapan

| Tahap | Isi | Bukti selesai |
|---|---|---|
| 1 | `lib/isian-massal-video.ts` — fungsi MURNI: baca+saring body, terapkan ke 5 peta | `tests/isian-massal-video.test.ts` hijau |
| 2 | `simpanIsianMassalPlayly` di `lib/store.ts` + `app/api/admin/playly/massal/route.ts` | `tests/admin-playly-massal-route.test.ts` hijau |
| 3 | `app/components/admin/PlaylyIsiCepat.tsx` + bagian `#isi-cepat` + menu sidebar | `tests/isi-cepat-panel.test.ts` hijau |
| 4 | Gerbang pra-rilis | `npm run gerbang` lolos |

## 5. Yang TIDAK dibangun (sengaja)

- **Poster & sinopsis manual.** Film tanpa IMDb juga kosong di dua hal itu, tapi
  mengisinya butuh unggah gambar — cakupan baru, bukan bagian permintaan ini.
- **Audit-trail per perubahan** (rak admin-panel §2.2). Panel ini satu-admin dan
  dokumen lama pun belum punya audit; menambahkannya sekarang = fitur baru yang
  tidak diminta. Dicatat sebagai utang yang disadari.
- **Undo setelah tersimpan.** Pembatalnya = mengosongkan kotak (kembali ke
  otomatis), sama seperti perilaku kolom-kolom yang sudah ada.

## 6. Yang ikut tersenggol

| Yang dipakai bersama | Terdampak? | Penjaganya |
|---|---|---|
| Kartu video di beranda (rating, kualitas, tahun, durasi) | **Ya** — ini yang berubah isinya | nilai disaring penyaring lama yang sudah teruji |
| Tabel Admin → IMDb | Tidak disentuh | `tests/paginasi.test.ts`, `tests/bagian-playly.test.ts` |
| `lib/store.ts` dokumen `playly:*` | Ditambah fungsi baru, fungsi lama tidak diubah | tes route lama tetap hijau |
| Sidebar admin | +1 baris menu | `tests/bagian-playly.test.ts` diperluas |

---

## 7. HASIL — dikerjakan & dibuktikan 2026-11-11

| Tahap | Status | Bukti |
|---|---|---|
| 1. `lib/isian-massal-video.ts` | ✅ | `tests/isian-massal-video.test.ts` — 22 tes hijau, diuji-balik 3 titik (semua merah) |
| 2. `simpanIsianMassalPlayly` + `/api/admin/playly/massal` | ✅ | `tests/admin-playly-massal-route.test.ts` — 12 tes hijau, diuji-balik 2 titik |
| 3. `PlaylyIsiCepat` + bagian `#isi-cepat` + menu | ✅ | `tests/isi-cepat-panel.test.ts` — 10 tes hijau, diuji-balik 2 titik; `tests/bagian-playly.test.ts` diperluas |
| 4. Gerbang | ⚠️ sebagian | `build` exit 0 · `tsc --noEmit` exit 0 · `npm test` 167 berkas / 2354 tes hijau — TAPI tanpa `rm -rf .next` lebih dulu (ada `next dev` berjalan) |

### Satu tes yang sempat merah — dan kenapa itu BUKAN dari kerja ini

`tests/jeda-koin-iklan.test.ts > "6 route koin + 3 route iklan membalas 404"` gagal **timeout 5000ms**
pada putaran suite pertama. Sendirian ia **hijau dalam 2,5 detik**, dan putaran suite kedua **hijau
seluruhnya**. Tesnya mengimpor 9 route dalam satu `it` ber-timeout bawaan; di mesin RDP bersama,
impor bisa melewati 5 detik. Pola yang sama sudah tercatat 2026-11-10. Dibiarkan — di luar cakupan,
tapi dicatat supaya sesi berikutnya tidak mengira ini kerusakan baru.

### Satu tes yang HIJAU karena alasan yang salah — dan dibetulkan

Uji-balik menyelamatkan satu tes palsu: percobaan pertama menguji pagar "nilai IMDb tidak ikut
terkirim" dengan mengetik ulang angka yang **sama**, lalu memastikan tombol Simpan tidak muncul.
Tes itu **tetap hijau walau pagarnya dicabut** — sebabnya React punya pelacak nilai yang menelan
event `change` saat isi kotaknya tidak berubah, jadi yang membuatnya hijau adalah React, bukan kode
yang sedang diuji. Diganti jadi: ubah dulu ke angka lain, **lalu kembalikan** ke angka semula —
dan ditambah satu kasus dari sisi borongan. Keduanya merah saat pagarnya dicabut.

⭐ **Aturan yang dibawa pulang:** tes yang tidak pernah dibuktikan MERAH belum tentu menguji apa pun.
SELALU rusak kodenya sekali untuk melihat tesnya berteriak.
