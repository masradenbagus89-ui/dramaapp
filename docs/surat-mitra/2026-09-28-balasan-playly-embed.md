# Balasan ke tim Playly — usulan embed di halaman pemutar

> Draf 2026-09-28. Status: BELUM dikirim. Nol kode DramaKu diubah.
> Konteks: Playly mengusulkan halaman pemutar kembali memakai embed mereka.
> Keputusan owner: tanya balik dulu sebelum menyentuh kode.

---

Halo Vio & tim Playly,

Terima kasih sudah menyiapkan komponen dan panduannya. Sebelum kami mulai,
ada tiga hal yang perlu kami luruskan dulu supaya kerjanya tidak mubazir.

## 1. Kami pernah memakai embed Playly, dan pindah dengan sengaja

Sampai 9 September 2026 halaman itu memang memakai `<iframe>` embed Playly.
Kami menggantinya dengan pemutar sendiri karena satu alasan yang tidak bisa
diselesaikan dari sisi kami: menu titik-tiga yang dilihat penonton adalah menu
bawaan Chrome (hanya "Playback speed" + "Picture in picture"), dan isinya
mustahil kami ubah karena beda domain (same-origin policy).

Jadi usulan ini bukan hal yang belum terpikir — ini justru arah sebaliknya dari
keputusan yang sudah kami ambil sadar. Kami tetap terbuka, tapi butuh jawaban
atas pertanyaan di bagian 2 dulu.

Yang akan kami LEPAS kalau kembali ke embed:

- Pencahayaan Sinematik (penyetelan kontras/warna, filter CSS milik kami)
- Volume Stabil + Penguat Suara
- Menu Terjemahan & Kualitas dengan tampilan kami sendiri

Kalau embed Playly punya cara mengisi atau menyembunyikan menu itu dari luar
(lewat `embed-bridge` misalnya), tolong sebutkan — itu bisa mengubah jawaban kami.

## 2. Pertanyaan pokok: subtitle & kualitas sudah terisi?

Pesan kalian menjual "pilihan kualitas, subtitle beserta gaya subtitle".
Saat kami mengukur pada 9 September 2026, field `variants` dan `subtitles` di
API Playly KOSONG pada 9 dari 9 video yang kami periksa.

Pertanyaan: apakah sekarang sudah terisi?

- Kalau SUDAH → tolong sebutkan 2-3 `videoId` contoh yang sudah punya subtitle
  dan lebih dari satu kualitas, biar kami bisa verifikasi sendiri.
- Kalau BELUM → pindah ke embed tidak akan memunculkan subtitle apa pun bagi
  penonton kami, dan lebih baik kita tunda sampai datanya ada.

## 3. Tiga koreksi kecil

a. **Nama halamannya sudah berubah.** `/playly` dipindah jadi `/film` sejak
   26 September 2026, dan halaman pemutarnya ada di `/tonton/<id>`. Alamat lama
   tetap hidup (redirect permanen), tapi untuk pembahasan berikutnya silakan
   pakai nama baru.

b. **Lampirannya belum sampai.** Folder `D:\Users\user72\dramaku-cara-a\` itu ada
   di komputer kalian, bukan di komputer kami. `PlaylyEmbedPlayer.tsx` dan
   `CARA-PASANG.md` belum kami terima — mohon dikirim lewat chat atau email.

c. **Sepertinya ada pesan yang salah alamat:** kami ikut menerima "Pesan untuk
   Aksara" (`aksara-novel.vercel.app`). Kami abaikan, tapi barangkali perlu
   kalian kirim ulang ke tujuan yang benar.

## 4. Yang bisa kalian mulai sekarang

Pendaftaran domain sebagai mitra tidak tergantung keputusan di atas — silakan
langsung didaftarkan supaya tidak jadi penghambat nanti:

```
https://dramaapp.vercel.app
```

Kabari kalau sudah aktif, dan kami akan uji di preview Vercel (bukan localhost,
sesuai catatan kalian).

Terima kasih,
Tim DramaKu

---

# TAMBAHAN 28 Sep 2026 — embed menolak SEMUA videoId kami (404)

Sesudah menerima `PlaylyEmbedPlayer.tsx` + `CARA-PASANG.md`, kami langsung
menguji ke server kalian. Hasilnya embed belum bisa dipakai sama sekali.

## Yang kami ukur

Tiga `videoId` diambil dari halaman produksi kami yang sedang tayang
(`https://dramaapp.vercel.app/film`):

| videoId | HTTP | isi halaman |
|---|---|---|
| 1790566389495 | 200 | "This page could not be found." |
| 1790342663839 | 200 | "This page could not be found." |
| 1789038141880 | 200 | "This page could not be found." |

Semuanya diuji dengan header `Referer: https://dramaapp.vercel.app/`.

## Yang bisa kami simpulkan

- **Pola alamatnya benar.** `/id/<id>/embed` membalas HTTP 200 (route dikenali).
  Pembanding: `/embed/<id>` dan `/v/<id>` membalas HTTP 404 murni.
- **Yang tidak dikenali adalah id-nya**, bukan alamatnya. Halaman yang muncul
  adalah halaman "not found" Playly lengkap dengan tombol "Kembali ke Playly".
- **Ini BUKAN pesan "Situs ini belum diizinkan"** yang kalian sebut di panduan.
  Jadi kami tidak bisa memastikan apakah ini soal pendaftaran domain atau
  soal id yang berbeda.

## Pertanyaan

1. Apakah `videoId` untuk embed **berbeda** dengan id yang kalian kirim di
   katalog/webhook? Kalau ya, field mana yang harus kami pakai?
2. Apakah video yang belum didaftarkan domainnya memang tampil sebagai 404
   (bukan "Situs ini belum diizinkan")? Kalau ya, penjelasan di panduan perlu
   diperbarui supaya mitra tidak salah diagnosa.
3. Tolong kirim **satu videoId contoh yang kalian pastikan hidup**, supaya kami
   bisa memisahkan "domain belum terdaftar" dari "id salah".

## Pertanyaan menu pemutar (dari owner DramaKu)

Menu titik-tiga pemutar kami sekarang berisi 7 baris. Kami perlu tahu mana yang
sudah ada di embed kalian, supaya tidak membuat tombol dobel:

| Menu kami | Ada di embed Playly? |
|---|---|
| PiP / Picture in Picture | (panduan menyebut "Pop-up" — konfirmasi?) |
| Volume Stabil | ? |
| Penguat suara | ? |
| Pencahayaan sinematik | ? |
| Terjemahan / subtitle | (panduan menyebut ada — konfirmasi?) |
| Kecepatan | (panduan menyebut ada — konfirmasi?) |
| Kualitas | (panduan menyebut ada — konfirmasi?) |

Kalau ada yang TIDAK ada di embed, mohon beri tahu apakah `embed-bridge` bisa
dipakai menambah baris menu dari sisi mitra — atau memang tidak bisa.
