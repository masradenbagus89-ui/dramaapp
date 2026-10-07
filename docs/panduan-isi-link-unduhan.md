# Panduan Mengisi Link Download Film — DramaKu

> Untuk tim pengisi konten. Tidak perlu bisa coding. Cukup bisa salin-tempel.

---

## Apa yang kamu kerjakan

Tiap film di DramaKu punya tombol **DOWNLOAD**. Saat ini tombol itu masih kosong — kalau penonton klik, muncul tulisan "Link unduhan belum tersedia".

Tugasmu: menempelkan link filmnya, supaya tombol itu berfungsi.

Satu film bisa punya beberapa pilihan download sekaligus (Google Drive, Telegram, Mega, Sendcm), masing-masing dalam dua kualitas.

---

## Yang perlu disiapkan

1. **Akun admin DramaKu** — minta ke owner kalau belum punya
2. **Link filmnya** — sudah diunggah ke Google Drive / Telegram / Mega / Sendcm

---

## Langkah mengisi

### 1. Buka halaman admin

Alamatnya: **dramaapp.vercel.app/admin/videos/playly**

### 2. Cari panel yang benar

Halaman ini panjang. Tekan **Ctrl + F**, ketik **Link download**, tekan Enter.

Kamu akan sampai ke panel berjudul **"Link download per video"**. Di bawah judulnya ada keterangan seperti *"3 dari 54 video sudah punya link"*.

> ⚠️ Jangan tertukar dengan panel di atasnya yang berjudul "Video yang tampil di halaman penonton" — itu panel berbeda, untuk menyembunyikan film.

### 3. Pilih filmnya

Cari judul film yang mau diisi. Di sebelah kanannya ada tombol **Atur link** (ada ikon pensil). Klik.

Di bawah tiap judul ada keterangan **"belum ada link"** atau **"2 link"** — itu penanda film mana yang sudah dikerjakan.

### 4. Isi kotaknya

Muncul 5 kotak bergaris, satu per tempat penyimpanan. Tiap kotak punya 2 kolom: **1080p** dan **480p**.

Tempel link di kolom yang sesuai. **Tidak harus diisi semua** — isi yang kamu punya saja.

### 5. Simpan

Klik **Simpan**. Kalau berhasil, muncul tulisan hijau.

### 6. Cek hasilnya

Buka film itu di situs, klik **DOWNLOAD**.

> ⏰ **Tunggu dulu 5 menit, lalu refresh dua kali.**
>
> Halaman situs tidak dibuat ulang tiap kali dibuka — ia disegarkan tiap 5 menit sekali supaya situs tetap ringan. Jadi perubahanmu tidak langsung terlihat. Dan refresh pertama biasanya masih versi lama, versi barunya muncul di refresh kedua.
>
> **Ini bukan kerusakan.** Banyak orang panik di titik ini dan mengisi ulang berkali-kali. Tidak perlu — sabar 5 menit saja.

---

## ⛔ ATURAN LINK — baca ini, jangan dilewati

Sistemnya sengaja galak. Link yang salah **akan ditolak**, tidak bisa disimpan.

### Link harus cocok dengan kotaknya

| Kotak | Link harus dimulai dengan |
|---|---|
| **Google Share** | `https://drive.google.com/` |
| **Telegram** | `https://t.me/` atau `https://telegram.me/` |
| **Mega** | `https://mega.nz/` |
| **Sendcm** | `https://send.cm/` |
| **Cast** | ❌ **jangan dipakai** — lihat catatan di bawah |

Link Mega yang ditempel di kotak Telegram akan **ditolak**, walaupun linknya benar. Sistem memeriksa bahwa isinya cocok dengan labelnya — karena penonton memilih tombol berdasarkan nama itu.

### Wajib `https://`, bukan `http://`

Link yang diawali `http://` saja (tanpa huruf **s**) akan ditolak. Ini soal keamanan, bukan kerewelan.

### Soal kotak Cast

Kotak Cast akan menolak link apa pun yang kamu masukkan. **Itu memang disengaja, bukan rusak.**

Alasannya: alamat resmi layanan Cast belum diketahui pasti, dan menebaknya berarti membuka pintu ke alamat yang belum tentu benar. Jadi kotak itu sengaja dikunci sampai alamat resminya dipastikan.

**Lewati saja kotak Cast.**

---

## 1080p dan 480p — apa bedanya

| | Artinya | Warna tombolnya |
|---|---|---|
| **1080p** | Gambar tajam, ukuran file besar | 🔵 Biru |
| **480p** | Gambar biasa, ukuran file kecil, hemat kuota | 🟠 Oranye |

Warnanya berbeda supaya penonton bisa membedakan sekilas tanpa membaca.

**Tidak wajib mengisi keduanya.** Kalau kamu cuma punya versi 1080p, isi kolom 1080p saja — kolom 480p dibiarkan kosong, dan tombolnya memang tidak akan muncul.

**Jangan asal menaruh di kolom mana saja.** Kalau file 480p ditaruh di kolom 1080p, penonton akan melihat tombol biru bertulisan "DOWNLOAD 1080p" padahal isinya 480p. Penonton merasa dibohongi.

---

## Kalau muncul tulisan merah

Sistem selalu menyebutkan alasannya. Ini arti yang paling sering muncul:

| Tulisan merah | Artinya | Yang harus dilakukan |
|---|---|---|
| *alamat wajib diawali https://* | Linkmu `http://` atau tidak lengkap | Tambahkan huruf **s** jadi `https://` |
| *domain "..." bukan domain ... yang diizinkan* | Link ditempel di kotak yang salah | Pindahkan ke kotak yang sesuai tabel di atas |
| *alamat (url) kosong* | Kotak kosong tapi tetap disimpan | Isi dulu, atau biarkan benar-benar kosong |
| *alamat bukan URL yang sah* | Ada salah ketik, spasi, atau terpotong | Salin ulang linknya dari awal |
| *alamat tidak boleh memuat nama pengguna/kata sandi* | Link mengandung tanda `@` sebelum nama situs | Pakai link biasa, jangan link berpassword |
| *domain untuk Cast belum diatur* | Kamu mengisi kotak Cast | Lewati kotak Cast |

**Tips:** selalu **salin-tempel**, jangan mengetik ulang. Satu huruf meleset saja sudah ditolak.

---

## Mengisi banyak film sekaligus

Kalau filmnya puluhan, mengisi satu per satu melelahkan. Ada cara massal lewat file CSV (file tabel seperti Excel).

Itu perlu dijalankan dari komputer yang punya akses teknis — **minta bantuan owner**. Siapkan saja daftarnya dalam bentuk tabel dengan kolom: judul film, tempat penyimpanan, kualitas, link.

---

## Yang TIDAK boleh dilakukan

- ❌ Menempel link yang bukan milik penyedia di kotak itu
- ❌ Memakai link yang butuh password atau minta login dulu — penonton tidak akan bisa membukanya
- ❌ Menaruh file 480p di kolom 1080p (atau sebaliknya)
- ❌ Memaksa mengisi kotak Cast

---

## Kalau masih bingung

Catat dua hal ini, lalu kirim ke owner:

1. **Judul film** yang sedang kamu kerjakan
2. **Foto layar** — termasuk tulisan merahnya kalau ada

Dua hal itu biasanya cukup untuk langsung ketemu masalahnya.
