# Video Playly tidak muncul & tidak bisa diputar di DramaKu

> 2026-08-25 · status: **SELESAI & TERBUKTI** (kode diperbaiki, video terbukti berputar)
> Pemicu: owner sudah meng-upload video di dashboard Playly, tapi di DramaKu
> daftarnya kosong dan tidak ada yang bisa diputar.

## Laporan kondisi nyata

✅ Terverifikasi lewat panggilan langsung ke Playly asli (2026-08-25):

- Video **ADA**: 15 video di Playly, terbaru di-upload hari itu juga.
- Endpoint mitra `GET /api/videos` hidup; header yang dibaca memang `X-Playly-Key`.
- Semua video punya `allowEmbed: true` dan berkas video nyata di Cloudflare R2.

## Akar masalah — EMPAT lapis, saling menutupi

Yang membuat ini sulit dilacak: memperbaiki satu lapis saja tidak mengubah
apa pun, karena lapis berikutnya tetap menghentikan alurnya.

| # | Masalah | Bukti | Sisi |
|---|---|---|---|
| 1 | Kunci `plyk_…` **ditolak Playly** (`invalid_key`), dan tersimpan di variabel salah (`DASHBOARD_API_KEY`, bukan `PLAYLY_API_KEY`) | balasan `{"ok":false,"error":"invalid_key"}` | env kita |
| 2 | Pola alamat pemutar ditebak `/embed/{id}` | aslinya `/id/{id}/embed` | kode kita |
| 3 | Playly mengirim `embedUrl` **relatif** (`/id/123/embed`), penerjemah hanya menerima `https://…` | semua video dibuang, alasan "alamat embed tidak bisa dibaca" | kode kita |
| 4 | Playly hanya mengizinkan penyematan dari **domain mitra terdaftar** | halaman "🔒 Situs ini belum diizinkan" | sisi Playly |

Lapis 2 & 3 berarti: **sekalipun kunci valid didapat, video tetap tidak muncul.**

## Yang dikerjakan

1. `lib/playly.ts`
   - `embedUrlFull` didahulukan; `embedUrl` relatif dilengkapi memakai alamat
     dasar Playly (`toHttpsUrl(raw, baseUrl)`).
   - Pola bawaan jadi `/id/{id}/embed` (konstanta `DEFAULT_PLAYLY_EMBED_PATH`).
   - Sampul (`thumb`) boleh data URI gambar raster; SVG ditolak (bisa memuat skrip).
   - Sumber kedua: katalog **publik** `/api/catalog` dipakai kalau kunci belum
     ada atau ditolak. Kegagalan LAIN (mati/timeout) tetap dilaporkan sebagai
     error — tidak disamarkan jadi "sukses".
   - Hasil fetch kini membawa `source` + `note`.
2. `app/api/admin/playly/videos/route.ts` — meneruskan `source` + `note`.
3. `app/components/admin/PlaylyVideoPicker.tsx` — pita kuning yang menyebut
   daftar sedang diambil dari katalog publik, bukan kunci mitra.
4. `tests/playly.test.ts` — 10 tes pengunci baru memakai bentuk balasan Playly ASLI.

## Yang TIDAK dibangun (sengaja)

- Tidak membuat penerbit kunci sendiri — kunci mitra wewenang pengelola Playly.
- Tidak menyentuh jalur A (`lib/dashboard-videos.ts`) maupun jalur B
  (`lib/external-video.ts`); keduanya terpisah dan tidak ikut berubah.
- Tidak mengubah skema database (tetap dokumen `app_data`).

## Yang ikut tersenggol

- `fetchPlaylyVideos()` dipakai 2 tempat: route daftar video **dan** route
  penyimpan kaitan (`embeds/route.ts`). Nilai kembaliannya hanya DITAMBAH
  (`source`, `note`), jadi pemanggil lama tetap jalan — dibuktikan lewat
  `tsc --noEmit` bersih + 297 tes lulus + `npm run build` sukses.
- Perilaku yang BERUBAH: dulu "kunci belum dipasang" langsung error 503;
  sekarang turun ke katalog publik. Ini disengaja — tanpa itu halaman admin
  buntu total selama kunci mitra belum ada.

## Bukti

- 297 tes lulus (25 berkas) · `tsc --noEmit` bersih · `npm run build` sukses.
- Uji hidup lokal: daftar **15 video, 0 dibuang** (sebelumnya 0 video), kaitan
  tersimpan, `/discover` menampilkannya, kunci tidak bocor ke halaman publik.
- Uji pemutaran di browser sungguhan: video maju **2,27 s → 7,27 s**, gambar
  1280×720, `readyState` 4. Berkasnya nyata: MP4 44 MB, streaming HTTP 206.

## Pelajaran untuk sesi berikutnya

- **"Lulus tes" ≠ "tersambung"**: 46 tes Playly lulus sejak awal karena semuanya
  memakai bentuk data KARANGAN. Bentuk asli baru terlihat setelah API sungguhan
  dipanggil. Tes pengunci baru sekarang memakai bentuk balasan asli.
- Video Playly **tidak bisa diuji dari `localhost`** — gerbang domain Playly
  menolaknya. Itu normal; ujilah lewat domain produksi.
