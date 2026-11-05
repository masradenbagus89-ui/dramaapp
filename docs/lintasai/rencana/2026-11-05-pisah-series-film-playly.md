# 2026-11-05 — Video Playly: pisahkan SERIAL dari "Film Terbaru"

**Permintaan owner:** *"rekan saya upload drama dari playly tapi masuknya ke film terbaru,
harusnya masuk ke series terbaru"* (+ tangkapan layar halaman depan, kotak merah di
"Pemuda Miskin Mata Tembus Pandang Jadi Miliarder", durasi 2:00).

**Bobot: BERAT** — fitur BARU (penanda jenis belum pernah ada) · 3 subsistem (penyimpanan ·
panel admin · beranda) · hasilnya dilihat SELURUH penonton.

---

## Laporan Kondisi Nyata (diukur di produksi, bukan dari data lokal)

✅ **Terverifikasi**

- Akar masalahnya **bukan salah logika — fiturnya memang belum pernah dibangun.**
  `app/components/beranda/TabKatalogTampilan.tsx:198` menggambar seksi "Film Terbaru" dengan
  `kartu={videos.map(bungkusVideo)}` — SELURUH video Playly, tanpa penyaringan apa pun.
  Hal yang sama di `lib/beranda-video.ts:130` untuk `/beranda`.
- **Playly tidak pernah mengirim penanda jenis.** `PlaylyWebhookVideo` (`lib/store.ts:1482`)
  berisi judul, durasi, sampul, tahun, genre bebas — nol field "serial/film".
- **489 video** di jalur Playly produksi (dihitung dari payload halaman `/film`, bukan ditaksir).
- **Ini bukan cuma 1 drama.** Judul berseri lain yang ikut salah tempat: Transformers
  *Chapter 1–7*, *THE VESSEL Episode 1*, `Outlander S07E15`, `All of Us Are Dead SEASON1EPISODE2`,
  `Imitation (2023) - E02`, `KONO EXPRESS Bab 2`.
- **Jalur resmi yang sudah ada TIDAK terpakai.** Fitur "kaitkan video → drama + episode"
  (`/api/admin/playly/embeds`) sudah lengkap, tapi **489 dari 489** video `dramaTitle`-nya
  `null` dan `episode`-nya `null`. Nol kaitan pernah dibuat.

🪤 **Kenapa tebakan otomatis DITOLAK — diukur, bukan dirasa**

| Penanda | Hasil nyata di 489 video |
|---|---|
| Pola judul (`Chapter N`, `Ep N`, `SxxEyy`, …) | cocok **18**, dan **2 di antaranya FILM**: "John Wick Chapter 4", "Kantara A Legend Chapter 1" → akan salah pindah ke Series |
| Judul yang dikeluhkan owner | **TIDAK terdeteksi** — "Pemuda Miskin Mata Tembus Pandang Jadi Miliarder" tak punya angka episode |
| Durasi | **282 dari 489 (58%)** durasinya `null` (Playly tak mengirim) → lebih dari separuh tak bisa dinilai |

Kesimpulan: tebakan otomatis meleset DUA arah sekaligus, dan melesetnya **senyap** — tak ada
error, cuma judul yang duduk di baris yang salah.

## Keputusan owner (popup 2026-11-05)

1. **Ditandai manual di panel admin** — dropdown "Jenis: Film / Series" per video.
2. **Video bertanda serial masuk ke seksi "Series Terbaru"** yang sudah ada, bercampur drama katalog.

## Yang TIDAK dibangun (sengaja)

- ❌ Tebakan otomatis dari judul/durasi — alasannya di tabel di atas.
- ❌ Pengelompokan beberapa episode jadi SATU kartu serial. Hari ini baru 1 video serial,
  jadi membangunnya sekarang = membangun yang belum dibutuhkan (§3.9). ❓ **Dicatat sebagai
  batas:** begitu satu judul punya >5 episode di Playly, bentuk ini perlu ditinjau ulang.
- ❌ Mengubah jalur "kaitkan video → drama" yang sudah ada — tetap berdiri, tidak disentuh.

## Pre-mortem (§4.4)

> Anggap ini sudah selesai dan hasilnya NOL guna. Penyebab paling mungkin?

Rekan meng-upload 30 episode drama pendek, semua ditandai Series, lalu seksi "Series Terbaru"
dipenuhi 30 kartu berjudul hampir sama dan **drama katalog owner terdorong keluar layar** —
owner akan melapor "malah jadi berantakan".

→ Masuk rencana: jatah video Playly di seksi "Series Terbaru" **DIBATASI**
(`MAKS_SERIES_PLAYLY_DI_SEKSI`), sisanya tetap terjangkau lewat halaman katalog. Drama katalog
tidak pernah tergusur habis.

## Langkah

| # | Berkas | Isi |
|---|---|---|
| 1 | `lib/jenis-video.ts` **(baru)** | fungsi MURNI: tipe `JenisVideo`, allowlist `parseJenisVideo`, `pisahFilmSeries` |
| 2 | `lib/store.ts` | dokumen `playly:jenis` — pola persis `playly:kualitas` |
| 3 | `app/api/admin/playly/jenis/route.ts` **(baru)** | GET + POST, pagar disalin dari `/genre` |
| 4 | `lib/playly-publik.ts` | field `jenis?` pada `PlaylyVideoPublik` |
| 5 | `lib/playly-gabungan.ts` | tempel peta jenis ke KEDUA sumber (katalog + webhook) |
| 6 | `lib/beranda-video.ts` | baris `/beranda`: film saja di "Film Terbaru", serial → "Drama Terbaru" |
| 7 | `TabKatalogTampilan.tsx` + `app/page.tsx` | halaman depan: pisah SEBELUM dipotong 20 |
| 8 | `PlaylyVisibilityManager.tsx` + `app/admin/videos/playly/page.tsx` | dropdown Jenis |
| 9 | `tests/jenis-video.test.ts` **(baru)** | penjaga aturan |

⚠️ **Jebakan yang sudah ditemukan sebelum menulis:** `app/page.tsx:34` memotong
`videos.slice(0, TAB_GRID_ITEMS)` **sebelum** daftarnya sampai ke tampilan. Kalau pemisahan
film/serial dilakukan di komponen, seksi Film menyusut (dari 20 kartu jadi 19) setiap kali ada
serial di 20 teratas. **Pemisahan WAJIB terjadi sebelum potongan itu.**

## Yang ikut tersenggol

| Fitur yang client kenal | Penjaganya |
|---|---|
| Seksi "Film Terbaru" halaman depan | `tests/seksi-film-depan.test.ts` (sudah ada) |
| Baris "Film Terbaru" di `/beranda` | `tests/beranda-video.test.ts` (sudah ada) |
| Baris genre beranda (video berkategori) | `tests/beranda-video.test.ts` (sudah ada) |
| Panel admin video Playly | `tests/playly-publik.test.ts` + penjaga baru |

Bawaan `film` dipilih supaya perubahan ini **nol efek sampai owner menandai** — tak ada satu
video pun yang berpindah tanpa diminta.
