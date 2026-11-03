# Permintaan ke rekan Playly — izin olah suara (CORS) di penyimpanan video

> Dibuat 2026-11-03. **Ini bukan laporan bug di sisi Playly** — videonya jalan
> normal. Yang diminta satu setelan tambahan supaya DramaKu bisa menyalakan dua
> fitur suara di pemutarnya.
>
> Teks di bawah garis bisa disalin apa adanya dan dikirim ke rekan Playly.

---

## Untuk owner — ringkasnya

Dua tombol di pemutar DramaKu (**Volume Stabil** dan **Penguat suara**) sudah
dibangun penuh dan tesnya hijau, tapi **belum bisa menyala** karena satu hal di
luar kendali kita: browser melarang mengolah suara dari berkas milik domain lain
kecuali server berkas itu memberi izin.

Diukur 2026-11-03 pada berkas video Playly: **nol** header izin.

Begitu rekan Playly memasang setelan di bawah, **tombolnya menyala sendiri** —
tidak perlu rilis ulang dari sisi kita, karena pemutar memeriksa izin itu setiap
kali video dibuka.

Kalau mereka **tidak bisa** memasangnya, itu juga jawaban yang sah: tombolnya
tetap tampil abu dengan keterangan apa adanya, dan tidak ada yang rusak.

---

## Untuk dikirim ke rekan Playly

Halo, ada satu permintaan kecil dari sisi DramaKu.

Kami memutar berkas video dari penyimpanan Playly memakai pemutar kami sendiri.
Semuanya berjalan normal — ini bukan laporan masalah.

Kami ingin menyalakan dua fitur suara di pemutar (peredam lonjakan volume dan
penguat suara untuk film yang rekamannya pelan). Keduanya memakai **Web Audio
API** di browser, dan Web Audio hanya boleh mengolah suara dari berkas yang
servernya mengirim header **CORS**.

Saat kami periksa (3 November 2026), permintaan ke berkas video membalas
**200/206 dengan benar**, tapi **tanpa** header `Access-Control-Allow-Origin`.
Akibatnya fitur itu kami matikan sendiri — kalau dipaksa, videonya jadi bisu.

**Yang kami minta:** tambahkan aturan CORS pada bucket R2 tempat berkas video
disimpan, mengizinkan origin kami.

Contoh aturan CORS untuk Cloudflare R2:

```json
[
  {
    "AllowedOrigins": ["https://dramaapp-production-9e88.up.railway.app"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range", "Content-Type"],
    "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges"],
    "MaxAgeSeconds": 86400
  }
]
```

Catatan kecil yang penting:

- `Range` perlu ikut diizinkan karena pemutar meminta potongan berkas saat
  penonton melompat ke menit tertentu.
- `ExposeHeaders` membuat pemutar bisa membaca panjang berkasnya.
- Kalau lebih nyaman memakai `"AllowedOrigins": ["*"]`, itu juga cukup untuk
  kebutuhan kami — tapi silakan pilih yang paling sesuai kebijakan kalian.
- Ini **tidak** membuka akses baru ke berkas: alamatnya tetap bertanda tangan
  dan berumur pendek seperti sekarang. CORS hanya mengatur browser mana yang
  boleh **membaca** balasan, bukan siapa yang boleh mengunduh.

Kalau sudah terpasang, kami tidak perlu melakukan apa-apa lagi — pemutar kami
memeriksanya sendiri setiap video dibuka.

Terima kasih.

---

## Cara owner memeriksa apakah sudah terpasang

Buka salah satu film di DramaKu → menu titik tiga di pemutar. Kalau **Volume
Stabil** dan **Penguat suara** sudah bisa digeser (tidak abu-abu lagi), berarti
izinnya sudah ada dan fiturnya hidup.

Kalau masih abu-abu dengan tulisan *"sumbernya tidak mengizinkan suara diolah"*,
berarti setelannya belum terpasang atau belum mencakup alamat situs kita.
