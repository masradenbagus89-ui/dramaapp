# Surat ke tim Playly — DITUNDA, JANGAN DIKIRIM APA ADANYA (1 Oktober 2026)

> ## ⛔ KEPUTUSAN OWNER 2026-10-02: TIDAK JADI DIKIRIM. Jangan kirim surat ini tanpa menanyakan ulang ke owner.
>
> **Bukan karena isinya salah — karena sebagian besar pertanyaannya sudah TIDAK RELEVAN** sesudah
> pekerjaan 1-2 Oktober. Sesi berikutnya: baca tabel ini dulu sebelum menyentuh berkas ini.
>
> | Pertanyaan di surat | Masih relevan? | Sebab |
> |---|---|---|
> | 1. Daftar video tanpa alamat berkas | ❌ **TIDAK** | Satu-satunya pemakainya — seksi "Video terbaru" di `/discover` — sudah **dilepas** (`b2a9289`). Tak ada lagi yang menunggu jawaban ini. |
> | 2. Embed menolak semua videoId | ❌ **TIDAK** | Owner sudah memutuskan memakai pemutar sendiri sejak 2026-09-09, dan pemutar kita lebih lengkap daripada embed mereka. |
> | 3. Server Playly lambat (31-98 dtk) | 🟡 informatif | Menguntungkan Playly, bukan kebutuhan kita. |
> | 4. **Subtitle & kualitas sudah terisi?** | ✅ **YA — satu-satunya yang masih bernilai** | Subtitle satu-satunya hal yang kurang di situs dan **tidak bisa kita buat sendiri**. Terakhir diukur (2026-09-09) kosong di 9 dari 9 video. |
>
> **Kalau suatu saat owner mau bertanya lagi, cukup poin 4** — beberapa kalimat lewat chat, bukan
> surat 170 baris ini. Sisanya simpan sebagai arsip: ia merekam apa yang sudah pernah diukur dan
> kapan, berguna kalau Playly mengubah sesuatu lalu kita perlu membandingkan.
>
> **JANGAN selidiki ulang poin 1 & 2.** Keduanya sudah ditutup dengan bukti terukur, bukan dugaan —
> rinciannya di `HANDOFF.md` 2026-10-01 dan 2026-10-02.

---

> **Catatan asal (1 Okt):** berkas ini menggantikan draf `2026-09-28-balasan-playly-embed.md` yang
> belum pernah dikirim — pertanyaan yang masih relevan dari draf itu sudah digabung ke sini.
>
> **Nol rahasia di dalamnya:** tidak ada kunci API, token, atau alamat bertanda tangan. Hanya `videoId`
> yang memang tampil publik di katalog kita sendiri, dan angka hasil pengukuran.
>
> Semua angka di bawah **diukur ulang 1 Oktober 2026**, bukan disalin dari catatan lama.

---

Halo Vio & tim Playly,

Terima kasih untuk kiriman `PlaylyEmbedPlayer.tsx`, `CARA-PASANG.md`, dan `PEMUTAR-TEGAK.md`. Kami
sudah membacanya dan mengujinya. Ada **empat hal** yang perlu jawaban dari sisi kalian sebelum kami
bisa melangkah — tiga di antaranya menahan pekerjaan kami sepenuhnya.

## 1. 🔴 Daftar video dari dashboard tidak memuat alamat berkasnya — 20 dari 20 kami tolak

Ini temuan **baru hari ini** dan yang paling berdampak buat kami.

Situs kami memanggil dashboard kalian untuk bagian "Video terbaru". Hasilnya hari ini:

```
20 video diterima · 0 lolos · alasan: "tidak ada alamat video" (20 dari 20)
```

Penerjemah kami mencari alamat berkas video di sebelas nama field yang umum dipakai:

```
videoUrl · video_url · url · fileUrl · file_url · playbackUrl
playback_url · src · video · publicUrl · public_url
```

**Tidak satu pun ketemu** di baris-baris yang kalian kirim.

Dugaan kami — mohon dikonfirmasi: alamat berkas video memang **sengaja tidak disertakan di daftar**,
karena alamat kalian bertanda tangan dan berumur pendek, jadi hanya diberikan saat video benar-benar
diputar. Kalau itu benar, maka tidak ada yang rusak di sisi kalian — justru **cara kami memanggil
yang keliru**, dan kami yang harus menyesuaikan.

**Yang kami butuhkan:**

1. Apakah dugaan di atas benar? Daftar memang tanpa alamat berkas?
2. Kalau ya, **endpoint mana** yang harus kami panggil untuk mendapat alamat berkas satu video, dan
   berapa lama alamat itu berlaku?
3. Kalau tidak — artinya daftar seharusnya memuat alamat — **nama field-nya apa persisnya?**

Satu baris contoh dari balasan daftar kalian (boleh disamarkan isinya) sudah cukup untuk menjawab
ketiganya sekaligus.

## 2. 🔴 Embed masih menolak SEMUA videoId kami, termasuk di alamat Railway yang baru

Kami lapor ini pada 28 September di alamat Vercel lama. Kalian lalu pindah ke Railway, jadi kami
**uji ulang hari ini di alamat baru** — hasilnya sama persis:

| videoId | HTTP | isi halaman |
|---|---|---|
| 1790342663839 | 200 | "This page could not be found." |
| 1790566389495 | 200 | "This page could not be found." |
| 1789038141880 | 200 | "This page could not be found." |

Diuji ke `https://playly-hosting-video.up.railway.app/id/<id>/embed`, dengan header
`Referer: https://dramaapp.vercel.app/`.

Yang bisa kami simpulkan:

- **Pola alamatnya benar.** `/id/<id>/embed` dikenali (200). Pembanding `/embed/<id>` dan `/v/<id>`
  membalas 404 murni.
- **Yang tidak dikenali adalah id-nya**, bukan alamatnya.
- **Ini BUKAN pesan "Situs ini belum diizinkan"** yang panduan kalian sebutkan. Jadi kami tidak bisa
  memastikan apakah ini soal pendaftaran domain atau soal id yang berbeda.

Ketiga id itu kami ambil dari halaman produksi kami yang sedang tayang
(`https://dramaapp.vercel.app/film`), dan ketiganya **berfungsi normal lewat jalur katalog** — hari
ini halaman itu menampilkan **46 video** yang semuanya bisa diputar. Jadi id-nya hidup; yang menolak
hanya embed.

**Yang kami butuhkan:** satu `videoId` contoh yang kalian **pastikan hidup di embed**, supaya kami
bisa memisahkan "domain belum terdaftar" dari "id-nya memang berbeda". Kalau `videoId` untuk embed
memang berbeda dengan id di katalog/webhook, tolong sebutkan field mana yang harus kami pakai.

## 3. ⏱️ Server Playly sangat lambat — ini saja sudah cukup membuat embed gagal di tempat kami

Diukur hari ini dari jaringan kami:

| Yang diminta | Waktu balas |
|---|---|
| Halaman depan Playly | **31–72 detik** |
| Halaman embed | **98 detik** |

Sebagai perbandingan, batas tunggu di hosting kami jauh di bawah itu. Polanya mirip server yang
"tidur" saat sepi lalu butuh waktu lama untuk bangun.

Kami sebutkan karena ini berpengaruh ke kalian juga: pada jam-jam sepi, mitra mana pun yang memanggil
kalian akan menerima kegagalan walaupun semua konfigurasinya sudah benar. Kalau ini bisa dimatikan
dari sisi kalian (mis. menjaga satu instance tetap hidup), itu akan menghilangkan satu sumber
kegagalan yang sulit didiagnosa dari luar.

## 4. ❓ Pertanyaan lama yang belum terjawab: subtitle & kualitas sudah terisi?

Kiriman kalian menyebut pemutar punya "pilihan kualitas, subtitle beserta gaya subtitle". Saat kami
mengukur pada 9 September, field `variants` dan `subtitles` di API kalian **kosong pada 9 dari 9
video** yang kami periksa.

- Kalau **sudah terisi** sekarang → tolong sebutkan 2-3 `videoId` contoh yang punya subtitle dan
  lebih dari satu kualitas, biar kami verifikasi sendiri.
- Kalau **belum** → pindah ke embed tidak akan memunculkan subtitle apa pun bagi penonton kami, dan
  lebih baik ditunda sampai datanya ada.

Kami juga perlu tahu isi menu pemutar kalian, supaya tidak membuat tombol dobel:

| Menu di pemutar kami | Ada di embed Playly? |
|---|---|
| Pop-up / Picture in Picture | panduan menyebut "Pop-up" — konfirmasi? |
| Volume Stabil | ? |
| Penguat suara | ? |
| Pencahayaan sinematik | ? |
| Terjemahan / subtitle | panduan menyebut ada — konfirmasi? |
| Kecepatan | panduan menyebut ada — konfirmasi? |
| Kualitas | panduan menyebut ada — konfirmasi? |

Kalau ada yang **tidak** ada di embed, mohon beri tahu apakah `embed-bridge` bisa dipakai menambah
baris menu dari sisi mitra — atau memang tidak bisa.

## 5. 📝 Dua koreksi kecil pada dokumen kalian

**(a) `PEMUTAR-TEGAK.md` bertentangan dengan `CARA-PASANG.md`.** `CARA-PASANG.md` menyatakan pemutar
drama berepisode **di luar cakupan** karena videonya tidak disimpan di Playly — itu **benar**, video
drama kami memang dari sumber sendiri. Tapi bagian "Untuk DramaKu" di `PEMUTAR-TEGAK.md` justru
mencontohkan `episode.playlyId` dan `drama.jumlahEpisode`, yaitu persis pemutar berepisode itu.

Akibatnya tampilan tegak yang kalian tawarkan tidak bisa kami pakai di satu-satunya tempat kami
memang punya tampilan tegak. Mungkin perlu diperjelas di dokumen agar mitra lain tidak bingung.

**(b) Nama halaman kami sudah berubah.** `/playly` dipindah jadi `/film` sejak 26 September, dan
halaman pemutarnya di `/tonton/<id>`. Alamat lama tetap hidup (redirect permanen), tapi untuk
pembahasan berikutnya silakan pakai nama baru.

## 6. ✅ Yang bisa kalian mulai sekarang

Pendaftaran domain kami sebagai mitra tidak tergantung jawaban di atas — silakan langsung
didaftarkan supaya tidak jadi penghambat nanti:

```
https://dramaapp.vercel.app
```

Kabari kalau sudah aktif, dan kami akan uji di domain sungguhan (bukan localhost, sesuai catatan
kalian).

---

Dari keempat poin di atas, **poin 1 yang paling kami butuhkan lebih dulu** — jawabannya menentukan
apakah bagian "Video terbaru" di situs kami bisa hidup kembali, dan itu tidak tergantung urusan embed
sama sekali.

Terima kasih,
Tim DramaKu
