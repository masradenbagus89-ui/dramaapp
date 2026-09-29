# Playly pindah alamat: Vercel → Railway (2026-09-29)

**Pemicu:** rekan Playly (cantika) mengabarkan layanan Playly berpindah alamat.
API, kunci API, dan cara pakainya **tidak berubah sama sekali** — hanya alamatnya.

| | Alamat |
|---|---|
| Lama | `https://playly-dashboard.vercel.app` |
| Baru | `https://playly-hosting-video.up.railway.app` |

---

## 1. Yang DIUKUR lebih dulu (bukan diterima sebagai kabar)

| Yang dicek | Hasil |
|---|---|
| Alamat baru hidup? | **HTTP 200** |
| `/api/videos` di alamat baru | **401 missing_key** → endpoint-nya ada, hanya menuntut kunci (perilaku lama) |
| `/api/catalog` di alamat baru | **401** (sama seperti sejak 2026-09-22) |
| Alamat lama masih hidup? | **HTTP 200** — belum dimatikan, sesuai kabar rekan |
| Satu database atau dua? | **Satu.** `/api/public-video?id=` untuk id yang sama memulangkan judul, kreator, dan sampul **identik** dari kedua alamat |
| Produksi kita menunjuk ke mana? | HTML `/film` → **138** kemunculan alamat lama: **48 pemutar** + **90 sampul** |

## 2. Pertanyaan rekan: "apakah kalian menyimpan `embedUrlFull` ke database?"

Jawabannya **ya, tapi hanya di satu tempat yang menyegarkan dirinya sendiri.**
Dihitung langsung dari `app_data` produksi, bukan dikira-kira:

| Dokumen | Isi | Alamat lama tersimpan |
|---|---|---|
| `playly:embeds` | **dokumen belum ada** | 0 |
| `playly:webhook` | **dokumen belum ada** | 0 |
| `playly:cadangan` | 48 video | **93** — tapi dokumen ini **ditulis ulang tiap pengambilan berhasil**, jadi pulih sendiri |
| `playly:hidden` | 2 id | 0 (hanya id, tanpa alamat) |

**Akibatnya: nol migrasi data, nol SQL untuk owner.**

Jalur webhook memang sudah memakai pola yang disarankan rekan (opsi b): Playly
mengirim potongan relatif `/id/<id>/embed`, dan yang melengkapinya jadi alamat
penuh adalah alamat dasar **milik kita** (`lib/playly-webhook.ts:324`). Ganti satu
konstanta, seluruh jalur itu ikut pindah. Dua tes membuktikannya — keduanya merah
saat konstantanya diganti, lalu hijau setelah ekspektasinya ikut pindah.

## 3. Yang diubah

`lib/playly.ts` — dua konstanta:

1. `DEFAULT_PLAYLY_API_URL` → alamat Railway.
2. `DEFAULT_PLAYLY_EMBED_HOSTS` → **kedua** host, bukan tukar-ganti.

Kenapa host lama dipertahankan (ini keputusan, bukan kelalaian):

- Alamat lama masih hidup, dan salinan darurat 48 video masih memakainya.
  Membuang host lama sekarang = video itu ditolak pagar `<iframe>` dan hilang
  dari situs, padahal alamatnya masih bisa dibuka.
- **Sampul video lama masih beralamat lama walau diminta lewat alamat baru** —
  lihat §4.

> ⚠️ Host ditulis **lengkap sampai subdomain**. Pencocokannya memakai akhiran
> (`hostAllowed`, `lib/playly.ts:470`), jadi mendaftarkan `up.railway.app` saja
> akan meloloskan aplikasi Railway **milik siapa pun** ke dalam `<iframe>` kita.
> Ada tes yang merah kalau pagar itu dilonggarkan.

## 4. 🔴 Temuan untuk DIKEMBALIKAN ke rekan Playly

`/api/public-video` **di alamat baru** masih memulangkan sampul beralamat lama:

```
id 1788093325344 → "thumb": "https://playly-dashboard.vercel.app/api/thumb?k=..."
id 1790648580475 → "thumb": "https://pub-...r2.dev/thumbs/..."   (video baru, sudah benar)
```

Itu **data dari Playly**, bukan simpanan kita — tidak ada baris kode di sisi
DramaKu yang bisa memperbaikinya. Di halaman `/film` produksi ada **90** sampul
berbentuk itu. Kalau alamat lama dimatikan sebelum Playly memperbarui sampul
video lamanya, **90 poster berubah jadi kotak kosong** sementara videonya sendiri
tetap jalan.

## 5. Env di Vercel: tak seorang pun bisa menyuntingnya → ditambal dari kode

Owner menyatakan **tidak punya akses** ke panel Vercel, dan sesi AI ini juga
tidak (nol kredensial: tak ada folder `.vercel`, tak ada `VERCEL_*` di env, dan
login Vercel butuh browser). Jadi "perbaiki env-nya" **bukan langkah yang
tersedia bagi siapa pun** — premis itu harus ditutup, bukan ditunggu.

**Risikonya terbukti nyata, bukan hipotetis.** Bagian "Video terbaru" tampil di
`/discover` produksi, dan bagian itu HANYA tampil kalau `DASHBOARD_API_URL`
terisi (`app/discover/page.tsx:41`) — nilainya yang tercatat dipasang adalah
`https://playly-dashboard.vercel.app/api/videos` (`HANDOFF.md:3967`), alamat
lama. Mengganti konstanta di kode tidak menolong jalur itu sama sekali, karena
env selalu menang.

**Perbaikannya ditaruh di tempat yang memang bisa kita kendalikan: kode.**
`lib/playly-alamat.ts` (berkas baru, murni, tanpa import) memegang alamat aktif
+ daftar alamat pensiun, dan `pindahkanAlamatPlaylyPensiun()` menukar **host**
saja — jalur, query, dan tanda pagar dipertahankan, karena `DASHBOARD_API_URL`
menunjuk endpoint (`/api/videos`), bukan akar. Dipasang di dua pembaca env:
`readPlaylyConfig` dan `readDashboardConfig`.

> **Batas yang disengaja:** ini MENAMBAL, bukan memaksakan. Alamat env yang
> bukan alamat pensiun tetap dihormati apa adanya — kalau Playly kelak memakai
> domain ketiga dan seseorang menyetelnya lewat env, setelan itu yang menang.
> Begitu panel hosting bisa disunting lagi, isi env-nya dibereskan dan berkas
> ini boleh disederhanakan.

Uji-balik penjaga (mutation check), keduanya **MERAH** seperti seharusnya:
melumpuhkan penambalnya → **5 tes merah**; melepas sambungannya dari jalur
dashboard → **1 tes merah**.

## 5b. Yang belum bisa diverifikasi dari sini (jujur)

- **`/api/videos` tanpa parameter pencarian.** Dokumentasi baru Playly menulis
  `imdbId` atau `title` sebagai "salah satu wajib", sedangkan kode kita memanggil
  tanpa keduanya (dan itu terbukti jalan 2026-09-14: 42 video). Kunci API-nya ada
  di database produksi dalam keadaan terenkripsi dan `PLAYLY_ENCRYPTION_KEY` tidak
  ada di mesin lokal, jadi ini **tidak bisa diuji dari sini** — buktikan sesudah
  rilis lewat `/admin/videos/playly`. Kalau ternyata berubah, video tidak hilang
  total: jalur katalog + salinan darurat menahannya.

## 6. Bukti gerbang pra-rilis

`rm -rf .next` → `npm run build` **sukses** → `npx tsc --noEmit` **exit 0** →
`npm test` **1193 tes / 82 berkas hijau** → nol berkas env/kunci ter-stage.
