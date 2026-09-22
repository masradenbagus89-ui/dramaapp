# Katalog Playly kini wajib pakai API key (22 September 2026)

> Status: **BELUM TAYANG** — sudah terbukti lewat gerbang §6 penuh, menunggu izin rilis owner.
> Berkas tersentuh: `lib/playly.ts` (1 berkas kode) + `tests/playly-katalog-kunci.test.ts` (baru, 5 tes).
> **Nol SQL · nol env baru.** Kunci yang dipakai adalah kunci yang SUDAH terpasang.

## 1. Apa yang berubah di pihak Playly

Playly memberi tahu bahwa sejak 22 September 2026 endpoint katalog mereka tidak lagi
terbuka. Ini **bukan** dugaan dari surat — diverifikasi langsung ke server mereka hari itu:

| Yang diuji | Hasil nyata (2026-09-22) |
|---|---|
| `GET /api/catalog?limit=2` **tanpa** kunci | **401** `{"ok":false,"error":"missing_key"}` |
| `GET /api/catalog?limit=2` **dengan** kunci kita | **200** · `total:299` |
| `GET /api/videos?limit=2` dengan kunci kita | **200** (tidak berubah) |
| `GET /api/public-video?id=…` tanpa kunci | **200** (tidak berubah — tetap terbuka) |

Kuncinya **sama** dengan yang sudah dipakai `/api/videos`. Tidak ada kunci baru,
tidak ada pendaftaran ulang.

## 2. Kenapa kode kita perlu disentuh

`lib/playly.ts` punya SATU fungsi yang memanggil katalog, `fetchVideoKatalogPublik()`,
dan fungsi itu mengirim header `Accept` saja. Tiga pemanggilnya:

1. `fetchPlaylyVideos()` — halaman admin, saat kunci mitra ditolak 401.
2. `fetchPlaylyVideos()` — halaman admin, saat kunci belum dipasang sama sekali.
3. `fetchPlaylyVideosKita()` — halaman penonton, jalur cadangan (disaring nama kreator kita).

Tanpa perubahan, ketiganya membentur 401. Yang berbahaya jalur ke-3: `fetchPlaylyVideosKita()`
**sengaja tidak pernah melempar** (gagal-aman), jadi katalog yang ditolak cuma berubah
jadi daftar KOSONG — tanpa error merah, tanpa halaman rusak, tanpa siapa pun melapor.

## 3. Yang dikerjakan

- `fetchVideoKatalogPublik()` menerima `apiKey: string | null` dan mengirim
  `X-Playly-Key` lewat **header**, bukan query `?key=`. Playly melayani keduanya;
  query dipilih TIDAK dipakai karena alamat URL ikut tercetak di log server, log
  proxy, dan header `Referer` — header tidak.
- Ketiga pemanggil meneruskan kunci yang memang sudah mereka pegang.
- Pesan 401 dipecah dua supaya bisa ditindaklanjuti: "kunci ditolak → perbarui di
  Setelan → Playly" vs "katalog kini wajib kunci, dan kunci kita belum dipasang".
- Tiga komentar yang mengklaim katalog "tanpa kunci" dikoreksi — komentar yang
  berbohong lebih mahal daripada tak ada komentar.

**Kunci tidak pernah sampai ke browser.** Saran Playly membuat endpoint perantara
sudah terpenuhi sejak awal: `lib/playly.ts` server-only, dan tiga komponen `"use client"`
yang mengimpornya hanya memakai `import type` (hilang saat kompilasi).

## 4. Yang TIDAK dikerjakan (sengaja)

- **`/api/videos`, `/api/public-video`, dan embed tidak disentuh** — Playly meminta
  begitu, dan pengujian membenarkan keduanya masih berperilaku sama.
- **Membaca header `Retry-After` saat 429 belum dibangun.** Kode sekarang
  menerjemahkan 429 jadi pesan "tunggu sebentar" tanpa tahu berapa lama
  (`lib/playly.ts`, cabang `res.status === 429`). Batas Playly 120 permintaan / 60
  detik per IP — jauh di atas pemakaian kita, jadi ini dicatat sebagai utang, bukan
  dikerjakan tanpa kebutuhan.
- **Jalur cadangan tidak dihapus** walau nilainya menyusut (lihat §5) — menghapusnya
  mengubah perilaku yang sudah dipakai, jadi itu keputusan owner, bukan AI.

## 5. ⚠️ Akibat yang harus owner tahu: jalur cadangan praktis ikut tertutup

Jalur "katalog publik" dibangun sebagai jaring pengaman untuk kejadian nyata
2026-08-26: kunci yang sama dibalas `ok:true` pagi itu lalu `invalid_key` 20 menit
kemudian. Idenya, kalau kunci mati, video kita masih bisa diambil dari katalog terbuka.

**Sejak katalog memakai kunci yang SAMA, jaring itu tidak lagi menangkap kasus yang
melahirkannya.** Kunci mati = kedua jalur mati. Yang tersisa cuma satu kasus sempit:
`/api/videos` bermasalah sendiri sementara kuncinya sah — dan untuk itulah kunci tetap
dikirim ke katalog, bukan dibiarkan polos.

Ini bukan kemunduran yang diakibatkan perubahan ini; perubahan ini hanya membuatnya
terlihat. Tanpa perubahan ini jaringnya sudah putus, cuma tidak ada yang tahu.

## 6. Penjaga permanen

`tests/playly-katalog-kunci.test.ts` — 5 tes:
1. halaman penonton: kunci ikut ke katalog, video tetap tampil;
2. halaman admin: sama, saat `/api/videos` menolak;
3. **kunci tidak pernah bocor ke query string** (pagar keamanan);
4. kunci belum dipasang: tetap dicoba, gagal-aman, pesannya bisa ditindaklanjuti;
5. jalur mitra tetap didahulukan — katalog tidak dipanggil kalau tidak perlu
   (pagar arah sebaliknya: jangan sampai situs menarik video kreator lain).

**Diuji-balik**: header kunci dilepas sementara → tes 1 & 2 MERAH; dikembalikan → hijau.
Jadi penjaga ini benar-benar menjaga, bukan hijau karena kebetulan.

## 7. Bukti

- `npm test` → **685 tes / 53 berkas hijau**
- `rm -rf .next` → `npm run build` → **sukses**
- `npx tsc --noEmit` → **exit 0**
- curl langsung ke Playly (tabel §1)

## 8. Catatan rilis

Working tree saat ini menumpuk **dua** paket yang belum tayang: kerja 2026-09-18
(`/playly` dinamis → cache) dan kerja ini. Keduanya menyentuh `lib/playly*.ts` tapi
tidak tumpang-tindih. Pertimbangkan commit terpisah supaya bisa di-rollback sendiri-sendiri.
