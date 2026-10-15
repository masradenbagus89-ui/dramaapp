# Pengajuan: beli satu domain sendiri untuk DramaKu

> Dibuat 2026-10-15 untuk dipakai owner saat mengajukan ke atasan. Isinya sengaja
> dibuat bisa dibaca orang non-teknis — angkanya sudah dicek, bukan perkiraan.
>
> ⚠️ **Ini BUKAN permintaan mendesak.** Situs berjalan normal tanpa ini, dan
> tidak ada pekerjaan lain yang tertahan karenanya. Ajukan saat waktunya pas.

---

## Yang diminta

Satu nama domain, misalnya `dramaku.com` atau `dramaku.id`.

| | |
|---|---|
| **Biaya** | ±**Rp200.000 per tahun** untuk `.com` (Rumahweb Rp195.000 per April 2026; Niagahoster Rp160.000–180.000). `.id` lebih murah saat daftar (±Rp80.000) tapi **perpanjangannya biasanya lebih mahal** — bandingkan harga perpanjangan, bukan harga promo tahun pertama. |
| **Biaya lain** | Nol. Hosting, sertifikat HTTPS, dan email tidak bertambah — Railway sudah menyediakan HTTPS gratis untuk domain sendiri. |
| **Waktu kerja** | ±1 jam sekali saja (menyetel alamat + memberi tahu mitra Playly), prosedurnya sudah ditulis lengkap: `docs/migrasi-railway-tahap6-pindah-domain.md`. |

---

## Kenapa perlu — satu kalimat

**Alamat situs sekarang adalah pinjaman dari perusahaan hosting, bukan milik
sendiri.** Kalau suatu hari pindah hosting lagi, alamatnya ikut berubah lagi —
dan setiap perpindahan alamat itu memakan biaya yang tidak kelihatan di tagihan.

### Alamat yang sekarang dipakai

```
https://dramaapp-production-9e88.up.railway.app
```

Bagian `up.railway.app` itu milik Railway, perusahaan hostingnya. Bagian depannya
pun dibuat otomatis oleh mereka (`9e88` adalah kode acak). Situs ini sudah
**dua kali** berganti alamat dalam setahun: dulu `dramaapp.vercel.app`, sekarang
Railway. Keduanya alamat pinjaman.

### Apa yang hilang tiap kali alamat berubah

Ini bukan teori — ketiganya baru saja dialami pada perpindahan 2026-10-15:

1. **Peringkat Google harus dibangun ulang.** Google memperlakukan alamat baru
   sebagai situs yang berbeda. Masa pemulihannya diperkirakan **±6 minggu**, dan
   selama itu alamat lama harus tetap dibayar/dipelihara sebagai penunjuk jalan.
2. **Mitra harus menyetel ulang.** Playly (penyedia iklan video) menyimpan alamat
   situs di sistem mereka. Tiap perpindahan = satu putaran koordinasi dengan
   pihak luar, menunggu jadwal mereka.
3. **Alamat tertulis di banyak tempat ikut basi.** Pada perpindahan kemarin
   ditemukan **5 tempat** yang masih menunjuk alamat lama, dan semuanya gagal
   **tanpa pesan error** — termasuk satu yang kalau terlewat membuat **seluruh
   video mati** sementara indikator di layar tetap hijau.

Dengan domain sendiri, ketiga biaya itu **dibayar sekali ini saja**. Sesudahnya,
ganti hosting berapa kali pun tidak mengubah alamat yang dilihat penonton, Google,
maupun mitra.

### Keuntungan tambahan yang langsung terasa

- **Mudah diingat & diucapkan.** `dramaku.com` bisa disebut di WhatsApp atau
  dicetak; `dramaapp-production-9e88.up.railway.app` tidak.
- **Terlihat seperti usaha sungguhan.** Alamat berakhiran nama perusahaan hosting
  terbaca seperti proyek percobaan.
- **Bisa punya email `@dramaku.com`** kalau suatu saat dibutuhkan.

---

## Kalau tidak disetujui — apa yang terjadi

**Tidak ada yang rusak.** Situs tetap jalan, penonton tetap bisa menonton, Google
tetap mengindeks. `dramaapp.vercel.app` juga alamat pinjaman platform, dan situs
ini sudah setahun hidup dengan alamat seperti itu.

Satu-satunya yang berlanjut adalah **ketergantungan**: selama alamatnya milik
Railway, pindah hosting berikutnya akan mengulang ketiga biaya di atas lagi.

---

## Kalau disetujui — yang terjadi sesudahnya

1. Owner membeli domain di registrar pilihan (Rumahweb / Niagahoster / Domainesia).
2. Domain diarahkan ke Railway (menambah 1-2 baris setelan DNS; Railway
   menerbitkan sertifikat HTTPS otomatis).
3. Alamat baru diisikan ke variabel `NEXT_PUBLIC_SITE_URL`, lalu **5 nilai
   cadangan** diganti — daftarnya sudah ditulis dan tidak perlu dicari ulang:
   `docs/migrasi-railway-tahap6-pindah-domain.md` seksi
   *"Daftar nilai cadangan — WAJIB diubah SEMUA saat domain berganti"*.
4. Mitra Playly diberi tahu sekali.
5. Alamat Railway lama dibiarkan mengalihkan selama beberapa minggu, sama seperti
   yang sekarang dilakukan Vercel.

Perpindahan terakhir sudah membuktikan prosedur ini berjalan, jadi yang ini
tinggal mengulanginya — bukan merintis dari nol.

---

## Catatan untuk sesi AI berikutnya

- Keputusan owner 2026-10-15: **beli domain BUKAN prasyarat menutup Vercel.**
  Jangan jadikan blocker (`HANDOFF.md`, seksi "KEPUTUSAN OWNER").
- Saat domain dibeli, itu juga **titik evaluasi alami** untuk membahas ulang
  penyegelan 13 variabel Railway yang sekarang ditunda.

## Sumber harga

- [Perubahan Harga Domain .COM dan .NET April 2026 — Rumahweb Blog](https://blog.rumahweb.com/perubahan-harga-domain-com-dan-net-april-2026/)
- [Domain Murah Indonesia — Rumahweb](https://www.rumahweb.com/domain-murah/)
- [Perbandingan Harga Domain dari Beberapa Registrar di Indonesia](https://depodomain.com/p/perbandingan-harga-domain-registrar-indonesia)
