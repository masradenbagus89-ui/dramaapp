# Draf pesan ke mitra Playly — migrasi hosting DramaKu

> Dibuat 2026-10-13. Dipakai di Tahap 6 migrasi Vercel → Railway.
> **Dua pesan, sengaja dipisah.** Pesan 1 bisa dikirim HARI INI (tak butuh
> domain final). Pesan 2 menunggu domain final ditentukan.
> ⚠️ Jangan tulis secret / kunci API apa pun di pesan ke mitra.

## Keputusan 2026-10-13: Pesan 1 DILEWATI, langsung Pesan 2

Owner memutuskan mengirim langsung pesan pergantian alamat. Itu sah — dua dari
tiga pertanyaan Pesan 1 sudah terjawab oleh KENYATAAN, bukan oleh jawaban
mitra: Railway terbukti bisa memanggil API Playly (sampul film tampil, video
diputar saat Putaran 1). Kalau Playly membatasi akses per-IP atau mengikat
kunci ke domain, hal itu MUSTAHIL terjadi. Pertanyaan ketiga (kuota saat dua
situs jalan bersamaan) juga sudah terjawab sendiri — berjalan berhari-hari,
nol gejala pemblokiran.

Pesan 1 dihapus dari berkas ini supaya tidak ada dua versi yang bisa tersalin
keliru.

## ⚠️ KOREKSI PREMIS — baca sebelum mengirim

Owner menyebut tujuan pesan ini "memastikan video Playly tidak masuk lagi ke
dramaapp.vercel.app". **Pesan ini TIDAK melakukan itu, dan tidak ada pesan
yang bisa.**

Webhook Playly tidak mengirim video ke SITUS, melainkan ke DATABASE:
`app/api/webhooks/playly/route.ts` -> `upsertPlaylyWebhookVideo` ->
`savePlaylyWebhookVideos` -> `sbDocSet` (`lib/store.ts:1449-1451`) -> Supabase.
Railway dan Vercel membaca database Supabase yang SAMA — terbukti 2026-10-13:
katalog keduanya 40 judul, selisih nol di kedua arah (dicocokkan per-`id`).

Jadi ke alamat mana pun Playly mengetuk, hasilnya masuk ke database yang sama
dan KEDUA situs menampilkannya. Satu-satunya cara Vercel berhenti menampilkan
film baru adalah MEMATIKAN Vercel.

**Kenapa pesannya tetap perlu dikirim:** supaya saat Vercel dimatikan nanti,
ketukan Playly tidak jatuh ke alamat mati. Kalau itu terjadi, film baru
berhenti masuk ke DATABASE — hilang dari Railway juga, bukan cuma dari Vercel.
Urutan aman: ganti alamat -> buktikan masuk -> baru matikan Vercel.

## Status kesiapan Railway (diukur 2026-10-13)

`PLAYLY_WEBHOOK_SECRET` **terpasang dan bekerja**. Dibuktikan tanpa login
admin: POST badan kosong ke `/api/webhooks/playly` dijawab **401** ("Tidak
terverifikasi sebagai Playly"), bukan 503. 503 berarti secret belum di-set;
401 berarti secret ada dan sedang menolak tanda tangan palsu — perilaku yang
benar. Vercel menjawab identik.

⚠️ Alamat `dramaapp-production-9e88.up.railway.app` adalah alamat bawaan
Railway. Kalau nanti dipasang domain sendiri, mitra harus diminta mengubahnya
LAGI. Owner sudah diberi tahu dan tetap memilih mengirim sekarang.

---

## PESAN — kirim sekarang

Halo, kabar dari DramaKu.

Server baru kami sudah aktif. Alamat tujuan webhook yang baru:

https://dramaapp-production-9e88.up.railway.app/api/webhooks/playly

Kunci API dan webhook secret TIDAK berubah — hanya alamat ini yang berganti.

Mohon alamat baru ini DITAMBAHKAN dulu, jangan langsung menggantikan yang lama
(dramaapp.vercel.app). Setelah ada satu video masuk dan kami konfirmasi
diterima, baru alamat lama dihapus.

Kalau sistemnya hanya bisa satu alamat, mohon dikabari — nanti kita sepakati
jamnya supaya saya bisa memantau dari sisi sini.

Terima kasih banyak.

---

## BALASAN PLAYLY 2026-10-13 + jawaban kita

Mitra menjawab tiga hal yang mengubah rencana:

1. **Sistem mereka hanya bisa SATU alamat webhook per mitra** — jaring pengaman
   "dua alamat berdampingan" batal, penggantian harus dijadwalkan.
2. **Secret BERGANTI otomatis** begitu alamat diganti (pengaman supaya pemilik
   alamat lama tak bisa memalsukan kiriman). Draf kita sebelumnya menulis
   "secret tidak berubah" — **mitra yang benar, kita yang salah.**
3. Video yang sudah terkirim tidak dikirim ulang; yang tertolak dicoba lagi.

### 🔴 Risiko yang mitra belum sebut

`readWebhookSecret()` membaca dari **env** (`lib/playly-webhook.ts:227`), bukan
dari panel admin — jadi memasang secret baru di Railway **memicu redeploy**,
beberapa menit, bukan instan.

Selama jeda itu Railway punya secret **lama** (bukan kosong), jadi kiriman
bertanda tangan baru dijawab **401**, bukan 503. Bedanya menentukan: kode kita
sendiri sudah mencatat bahwa 503 dibaca "coba lagi nanti" sedangkan 401 dibaca
"ditolak permanen" (`app/api/webhooks/playly/route.ts:77-80`). Banyak sistem
webhook TIDAK me-retry 4xx. Jadi jaminan "tidak ada yang hilang" harus
dipastikan berlaku untuk 401.

### ✅ Urutan yang membuat jeda NOL — nol perubahan kode

Railway sekarang **tidak menerima kiriman apa pun** (alamat terdaftar masih
Vercel), jadi `PLAYLY_WEBHOOK_SECRET` di sana boleh diganti kapan saja sebelum
penggantian — tak ada yang bergantung pada nilai lamanya.

1. Playly buat secret baru -> kirim (alamat BELUM diganti)
2. Owner pasang di Railway -> tunggu redeploy selesai
3. Owner konfirmasi siap
4. BARU Playly ganti alamat

Syaratnya cuma sistem mereka bisa memisahkan "buat secret" dari "ganti alamat".

### Soal jam: pilih JAM KERJA, bukan dini hari

Penggantian ini tidak menyentuh penonton sama sekali — Vercel tetap melayani,
database tidak berubah. Yang berisiko cuma film baru tertunda beberapa menit.
Jadi yang penting kedua pihak sigap dan bisa saling menghubungi, bukan jam
sepi. Begadang untuk ini justru memperbesar risiko salah ketik.

### PESAN — balasan, kirim sekarang

Halo, terima kasih penjelasannya.

Siap, kami ikut satu alamat.

Soal secret baru: memasangnya di server kami butuh beberapa menit (aplikasi
dibangun ulang). Bisakah secret dikirim dulu, kami pasang dan konfirmasi siap,
baru alamat diganti? Supaya tidak ada jeda.

Kalau tidak bisa dipisah: selama jeda, server kami menolak dengan kode 401.
Apakah 401 ikut dicoba ulang, atau hanya 5xx dan timeout?

Untuk jam kami usul 10.00 WIB.

Terima kasih.

---

## JADWAL DIUNDUR ke 14.00 WIB (keputusan owner 2026-10-14)

Dari 10.00 ke **14.00 WIB**. Justru lebih aman: jadwal 10.00 cuma menyisakan 30
menit sampai putaran retry harian mitra (10.30), sementara memasang secret baru
di Railway memicu **redeploy** yang makan beberapa menit — durasinya belum
pernah diukur.

**Konsekuensi yang harus disebut ke mitra:** jam 14.00 sudah melewati putaran
harian 10.30, jadi kiriman yang tertolak selama jeda redeploy **tidak akan
otomatis terulang hari itu** — bergantung pada pemicu manual yang mereka
tawarkan, atau menunggu putaran 10.30 besoknya. Mitra sudah menyatakan bisa
memicu manual, jadi ini bukan penghalang; tapi jangan sampai tidak disebut.

### PESAN — minta undur jadwal

Halo, mohon maaf — boleh jadwalnya diundur ke 14.00 WIB hari ini?

Urutannya tetap sama seperti yang Anda sebutkan.

Satu catatan: karena 14.00 sudah lewat putaran harian 10.30, kami mungkin perlu
bantuan pemicu kiriman manual seperti yang Anda tawarkan.

Terima kasih.

---

## Daftar periksa owner setelah Pesan 2 dikirim

- [ ] Mitra konfirmasi alamat sudah ditambahkan/diganti
- [ ] Tunggu satu film baru dari Playly → cek Admin → Webhooks, kiriman masuk
- [ ] Baru matikan situs lama
- [ ] Isi `NEXT_PUBLIC_SITE_URL` di Railway dengan alamat baru — kalau lupa,
      canonical & sitemap menunjuk alamat mati dan Google diarahkan ke sana
      (`docs/migrasi-railway-daftar-env.md:290`)
- [ ] Samakan `HARDLINK_AGENT_SECRET` Railway dengan PC backup sebelum situs
      lama dipensiunkan (`HANDOFF.md`, utang nomor 1)
