# Izin olah suara (CORS) di penyimpanan video Playly — ✅ SUDAH TERPASANG

> **Status 2026-11-03: SELESAI.** Rekan Playly sudah memasang aturan CORS, dan
> **Volume Stabil + Penguat suara kini aktif** di pemutar DramaKu. Tidak ada
> rilis ulang yang diperlukan — pemutar memeriksa izin itu sendiri tiap video
> dibuka, persis seperti yang dirancang.

## Bukti, diukur sendiri (bukan hanya laporan pihak lain)

Permintaan ke berkas video dengan `Origin` situs kita membalas:

```
HTTP/1.1 206 Partial Content
Access-Control-Allow-Origin: https://dramaapp-production-9e88.up.railway.app
Access-Control-Expose-Headers: Content-Length,Content-Range,Accept-Ranges
Accept-Ranges: bytes
```

Dan di halaman tonton produksi, elemen videonya kini membawa
`crossorigin="anonymous"` — atribut itu **hanya** dipasang kalau pemeriksaan
izin berhasil (`app/components/player/PlaylyPlayer.tsx`). Video tetap dimuat
normal, durasi terbaca.

## ⚠️ Satu hal yang BELUM pernah diuji siapa pun: bunyinya

Mesin kerja kita server tanpa perangkat suara — `AudioContext` di sana melapor
"running" tapi grafiknya tidak pernah diproses, jadi semua pengukuran suara
memulangkan nol. Yang sudah terkunci cuma aturan & angkanya (21 tes,
`tests/olah-suara.test.ts`).

**Uji dengar wajib dilakukan manusia.** Buka film → menu titik tiga → nyalakan
tombolnya → dengarkan. Yang dicari:

| Tombol | Harusnya terdengar | Kalau salah |
|---|---|---|
| Volume Stabil | dialog pelan & ledakan jadi lebih rata | suara "memompa" naik-turun, atau terasa datar/kehilangan tenaga |
| Penguat suara | jelas lebih keras dari 100% | suara pecah/serak (berarti batasnya terlalu tinggi) |

Angkanya ada di SATU tempat dan gampang disetel: `lib/olah-suara.ts` —
`SETELAN_VOLUME_STABIL` (ratio/threshold) dan `PENGUAT_MAKS` (sekarang 2×).

## Kalau ternyata bermasalah

Kedua tombol **bawaannya MATI** — hanya aktif kalau penonton sendiri yang
menyalakannya, jadi penonton yang tidak menyentuhnya tidak terpengaruh sama
sekali.

Kalau perlu dimatikan total: `git revert 88d3429` lalu dual push. Nol perubahan
database, nol env.

## Catatan dari rekan Playly

- Aturan dipasang untuk origin **tanpa garis miring di akhir** — memang begitu
  yang benar, browser mengirim alamat asal tanpa itu.
- Domain yang tidak terdaftar tetap ditolak (domain Vercel lama ikut ditolak,
  sesuai yang kita mau).
- **Kalau DramaKu pindah ke domain sendiri, daftarnya harus dikirim ulang ke
  mereka** — kalau tidak, fitur suara mati lagi di domain baru.
