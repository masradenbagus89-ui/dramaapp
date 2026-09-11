# Video Playly yang berkasnya tidak pernah sampai — jangan tampilkan ke penonton

> 2026-08-29 · dilaporkan owner dari layar nyata · bobot SEDANG · **SELESAI & TERBUKTI**

## Keluhan

Video **"Diasingkan Ke Bumi‼️ Dianggap Dewa Oleh Manusia Cerita Film Mas Of Steel" (35:07)** muncul di
`/admin/videos/playly` tapi di `/playly` hanya menampilkan layar hitam **"Video belum tersedia — File
video belum di-upload atau sudah dihapus."** Owner menegaskan: perbaikannya **tidak boleh** membuat
video menyalur lewat Vercel (kuota).

## Diagnosis (fakta, bukan dugaan)

1. **Pesan errornya bukan milik DramaKu.** `grep "belum di-upload"` di `app/`, `lib/`, `components/` →
   **nol hasil**. Tulisan itu keluar dari dalam `<iframe>` = pemutar milik Playly.
2. **Playly sendiri menyatakan berkasnya kosong.** `GET /api/public-video?id=…` untuk 6 video akun
   `coklat` (diperiksa 2026-08-29):

   | Video | `videoUrl` | `variants` |
   |---|---|---|
   | Diasingkan Ke Bumi … **Mas Of Steel** (35:07, id `1787977846374`) | `null` | `{}` |
   | Diasingkan Ke Bumi … **Steelzz** (35:07, id `1787976646197`) | `null` | `{}` |
   | Transformers 8 · The Last Knight · Hulk Abu-abu · Suara Hewan | ada `.mp4` di R2 | 360p–1080p |

3. **❓ Dugaan penyebab (belum diverifikasi):** upload putus di tengah. Tiga petunjuk — sampul video
   gagal berupa `data:image/jpeg;base64` (dibuat browser **sebelum** upload) sedangkan video sehat
   sampulnya di R2 (dibuat server **sesudah** upload); ada 2 entri kembar selisih ±20 menit, keduanya
   `views: 0`; semua yang sukses berdurasi 2–5 menit, yang gagal 35 menit.

## Yang dikerjakan

| Berkas | Perubahan |
|---|---|
| `lib/playly.ts` | `fetchPlaylyThumbnail` → **`fetchPlaylyDetailPublik`** (sekalian membaca status berkas, tanpa panggilan tambahan) + fungsi murni **`punyaFileVideo`** + tipe `PlaylyDetailPublik` |
| `lib/playly-publik.ts` | video dengan `punyaFile === false` dibuang dari halaman penonton + fungsi murni **`bolehTampilKePenonton`** |
| `app/admin/videos/playly/page.tsx` | hitung `belumSiapIds` (revalidate 0 = data segar) |
| `app/components/admin/PlaylyVisibilityManager.tsx` | badge **"belum siap"** + kotak penjelas berisi langkah perbaikan; hitungan "X dari Y tampil" ikut jujur |
| `tests/playly-publik.test.ts` | +12 tes pengunci |

## Keputusan desain paling penting: 3 keadaan, bukan 2

`punyaFile` bertipe `boolean | null` — **`null` = TIDAK TAHU** (Playly mati/timeout/bentuk JSON berubah).
Hanya `false` yang menyembunyikan video.

**Kenapa:** pre-mortem menemukan bahwa kegagalan paling mungkin bukan "video rusak tetap tampil",
melainkan **penyaring salah baca lalu menghapus SEMUA video sehat** — kerusakan jauh lebih parah
daripada masalah aslinya. Karena itu ada pagar tambahan di `fetchPlaylyDetailPublik`: kalau balasan
Playly tidak berbentuk catatan video yang dikenali (tak ada `id` maupun `title` di level atas),
statusnya `null`, bukan `false`. Dikunci tes *"bentuk JSON Playly berubah → null, BUKAN false"*.

## Kuota Vercel — nol tambahan

Yang menyeberang cuma **JSON teks** ke `/api/public-video`, panggilan yang **sudah ada sebelumnya**
untuk mengambil sampul (sekarang sekalian membaca status berkas — bukan panggilan baru), ter-cache 5
menit di halaman penonton. Byte videonya tetap lewat `<iframe>` ke Vercel **milik Playly**.
`videoUrl` hanya dibaca **ada/tidaknya**, tidak pernah dipakai memutar atau menyalurkan.

## Bukti

- `npx vitest run` → **402 tes lulus** (33 berkas) — 12 di antaranya tes baru berkas ini.
- `npx tsc --noEmit` → **exit 0**.
- **Uji ke Playly nyata** memakai fungsi yang baru ditulis: 2 video 35 menit → `punyaFile=false` →
  DISEMBUNYIKAN; 4 video lain → `punyaFile=true` → TAMPIL; sampul keenamnya tetap terbaca.
- ⚠️ `npx next build` **gagal di komputer ini** pada prerender `/beranda`
  (`getaddrinfo ENOTFOUND xxxxxxxxxxxx.supabase.co`). **Bukan akibat perubahan ini** — dibuktikan
  dengan `git stash` lalu build ulang kode lama: gagal identik, digest error sama (`3227098399`).
  Sebabnya `.env.local` di komputer ini masih berkas contoh (`SUPABASE_URL=https://xxxxxx…`).
  Tahap compile + TypeScript di dalam build sendiri **lulus**.

## Yang TIDAK dikerjakan

- Tidak menghapus/mengubah apa pun di akun Playly (bukan wewenang AI, dan itu aksi eksternal).
- Tidak menyentuh jalur video DramaKu sendiri (tunnel/`lib/video.ts`) — tak ada hubungannya.
- Tidak commit, tidak push, tidak deploy. Nol build Vercel terpakai.

## Langkah owner

1. Upload ulang video 35 menit di dashboard Playly sampai 100% selesai.
2. Hapus salah satu dari 2 entri kembar setelah berhasil (kalau tidak, judulnya dobel di halaman penonton).
3. Buka `/admin/videos/playly` — badge "belum siap" hilang sendiri begitu berkasnya ada.
