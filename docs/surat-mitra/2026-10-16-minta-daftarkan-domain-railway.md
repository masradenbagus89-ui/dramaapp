# Minta Playly mendaftarkan domain Railway — SIAP KIRIM (16 Oktober 2026)

> **Status: siap dikirim owner.** Permintaannya satu kalimat, jadi pesannya sengaja
> PENDEK — tinggal salin blok "Pesan siap kirim" di bawah ke chat.
>
> **Kenapa pendek:** surat `2026-10-01-surat-ke-playly.md` panjangnya 170 baris dan
> **tidak pernah jadi dikirim** — keputusan owner saat itu: *"cukup beberapa kalimat
> lewat chat, bukan surat 170 baris"*. Pelajaran itu dipakai di sini.
>
> **Nol rahasia di dalamnya.** Yang disebut hanya alamat situs kami sendiri (publik),
> satu `videoId` yang memang tampil di katalog publik, dan hasil pengukuran. Nol kunci
> API, nol token, nol alamat bertanda tangan.

---

## Pesan siap kirim

> Halo Vio & tim Playly,
>
> Ada satu permintaan kecil dari sisi kami.
>
> Situs penonton DramaKu sudah pindah hosting ke Railway. Alamat barunya:
>
> ```
> https://dramaapp-production-9e88.up.railway.app
> ```
>
> Alamat ini belum terdaftar di daftar domain mitra kalian, jadi penyematan video
> dari sana masih dijawab halaman **"🔒 Situs ini belum diizinkan"**. Bisa dicek
> sendiri — dua perintah ini bedanya cuma di `Referer`:
>
> ```bash
> # alamat BARU kami -> halaman "belum diizinkan"
> curl -s -H "Referer: https://dramaapp-production-9e88.up.railway.app/" \
>   https://playly-hosting-video.up.railway.app/id/1788093325344/embed | grep -o "belum diizinkan"
>
> # alamat LAMA kami -> player termuat normal
> curl -s -H "Referer: https://dramaapp.vercel.app/" \
>   https://playly-hosting-video.up.railway.app/id/1788093325344/embed | grep -o "<video"
> ```
>
> **Yang kami minta: TAMBAHKAN alamat Railway di atas ke daftar domain mitra —
> jangan menghapus `dramaapp.vercel.app` dulu.** Alamat lama masih kami pakai
> sebagai pengalihan sampai sekitar akhir November, jadi lebih aman kalau keduanya
> terdaftar selama masa itu.
>
> **Seberapa mendesak, jujurnya:** penonton TIDAK terdampak sekarang — halaman
> tonton kami memakai pemutar sendiri, bukan iframe, dan itu jalan normal. Yang
> terkena baru pratinjau di panel admin kami. **Tapi ada tenggatnya:** setelah
> `dramaapp.vercel.app` kami tutup (paling cepat 26 November), tidak ada lagi satu
> pun alamat kami yang terdaftar di sisi kalian. Jadi tidak darurat hari ini, tapi
> sebaiknya tidak menunggu sampai bulan depan.
>
> Satu info ke depan supaya tidak mengagetkan: kalau nanti kami jadi membeli domain
> sendiri, akan ada satu permintaan serupa sekali lagi — kami kabari kalau sudah pasti.
>
> Terima kasih!

---

## Konteks untuk kita sendiri (jangan ikut dikirim)

### Apa yang sebenarnya terjadi

Playly memasang **gerbang domain** di sisi mereka: video hanya mau disematkan dari
domain mitra yang sudah terdaftar. Ini sudah lama diketahui dan tercatat di
`.env.example` ("GERBANG DOMAIN DI SISI PLAYLY") serta `docs/playly-integrasi.md` §6.
Yang baru: **alamat Railway belum masuk daftar itu**, dan ketahuan saat audit migrasi
2026-10-16.

### Hasil pengukuran (diulang 2026-10-16)

| Referer yang dikirim | Hasil |
|---|---|
| `dramaapp-production-9e88.up.railway.app` | 🔒 DIBLOKIR — "Situs ini belum diizinkan" (8.899 byte) |
| `dramaapp.vercel.app` | ✅ lolos, player termuat (10.785 byte) |
| situs asing acak | 🔒 diblokir — gerbangnya memang aktif & membedakan |
| tanpa `Referer` | lolos |

⚠️ **Keduanya membalas HTTP 200.** Pemantauan berbasis status code tidak akan pernah
menangkap ini — bedanya hanya di isi halaman.

### Kenapa penonton tidak terdampak (ini sempat salah diduga)

Dugaan awal: "video Playly mati di Railway". **Salah**, dan dikoreksi oleh pengukuran:

- `/film` dan `/tonton/[id]` memakai **`PlaylyPlayer`** — pemutar buatan sendiri sejak
  2026-09-09, bukan `<iframe>`.
- Video aslinya diambil dari **presigned URL Cloudflare R2** lewat `/api/playly/video`.
  Diuji dengan `Referer` Railway: **HTTP 206 `video/mp4`** — normal. R2 tidak punya
  gerbang domain.

Yang memakai `<iframe>` (`EmbedPlayer`) tinggal dua, keduanya bukan halaman tonton:
`PlaylyVideoPicker` di panel admin, dan `/video-eksternal` (halaman uji internal,
`noindex`).

### Kenapa tetap harus dibereskan

Satu-satunya alamat kami yang terdaftar di Playly adalah **Vercel** — alamat yang
dijadwalkan ditutup. Begitu ditutup, nol alamat kami yang terdaftar, dan jalur iframe
mati sepenuhnya tanpa jalan mundur yang cepat (pendaftaran ada di sisi mitra, bukan
sesuatu yang bisa kami ubah sendiri).

### 🪤 Jebakan yang sudah tercatat — jangan terulang saat mereka menambahkan

Host wajib ditulis **lengkap sampai subdomain**. Pencocokan di sisi kita memakai
akhiran (`hostAllowed`, `lib/playly.ts`), jadi mendaftarkan `up.railway.app` saja akan
meloloskan aplikasi Railway **milik siapa pun** ke dalam `<iframe>` kita. Sudah dikunci
tes; dicatat di `docs/lintasai/rencana/2026-09-29-pindah-alamat-playly.md:60`.
Aturan yang sama berlaku untuk daftar di sisi mereka.

### Sesudah mereka menjawab

1. Ukur ulang dengan perintah `curl` di pesan — alamat Railway harus **lolos**.
2. Catat hasilnya di `HANDOFF.md`.
3. Kalau nanti beli domain sendiri: kirim permintaan serupa, dan tambahkan butir ini
   ke `docs/migrasi-railway-tahap6-pindah-domain.md` seksi "Daftar nilai cadangan" —
   pendaftaran di sisi mitra adalah langkah yang tidak kelihatan dari `git grep`.
