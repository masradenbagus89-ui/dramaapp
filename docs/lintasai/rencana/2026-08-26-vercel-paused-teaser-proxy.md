# Rencana: situs mati total karena kuota Vercel jebol (teaser di-proxy, bukan di-redirect)

> Dikerjakan 2026-08-26 · bobot SEDANG (4 berkas, 2 divisi: backend + frontend)
> Status: **kode SELESAI & terbukti lokal · BELUM di-push** (menunggu keputusan owner soal upgrade/tunggu)

## Ringkasan

Owner melapor `dramaapp.vercel.app` balas "This deployment is temporarily paused",
padahal tidak ada satu pun video yang disimpan di Vercel — semuanya di PC backup.

Penyebabnya bukan penyimpanan, tapi **lalu lintas**: kuota **Fast Origin Transfer**
(data yang ditarik server Vercel dari sumber luar lalu diteruskan ke penonton)
terpakai **29,71 GB dari jatah 10 GB** — lewat ~3x. Paket Hobby tidak punya tagihan
kelebihan pemakaian, jadi Vercel **mem-pause SELURUH project**, bukan cuma halaman video.

Sumber 29,71 GB itu adalah **cuplikan (teaser)**, bukan orang yang menonton:
`app/api/teaser/route.ts` MENYALURKAN isi video lewat server
(`new NextResponse(upstream.body)`), sementara pemutaran episode asli sudah langsung
ke tunnel (`lib/video.ts:12`) dan tidak membebani Vercel sama sekali.

## ✅ Terverifikasi (dibaca di kode / dijalankan)

- `app/api/teaser/route.ts:66` (versi lama) — `new NextResponse(upstream.body)` = byte video mengalir lewat Vercel.
- `app/components/HeroPreview.tsx:154` (versi lama) — `preload="auto"` + `autoPlay`: hero menarik video pada SETIAP kunjungan, tanpa diklik.
- `lib/hero-teaser.ts:11` — hero berganti slide tiap 20 detik → beberapa teaser per kunjungan.
- `app/api/teaser/route.ts:63` (versi lama) — `Cache-Control: max-age=60`: simpanan CDN kedaluwarsa hampir seketika → hampir tiap penonton menarik ulang dari sumber.
- `app/components/Poster.tsx:36` — hover kartu 400 ms juga memicu teaser (desktop saja).
- **`TEASER_BYTES` di `app/api/teaser/route.ts:11` dideklarasikan tapi TIDAK PERNAH dipakai** (dicek grep ke seluruh `app/` + `lib/`): niat membatasi 8 MB tidak pernah terpasang → satu cuplikan bisa menarik SELURUH file episode.
- `lib/video.ts:12` + `app/feed/[id]/page.tsx:26` — pemutaran episode langsung ke tunnel, nol beban Vercel. Jadi alamat tunnel memang SUDAH terlihat browser sejak dulu; redirect tidak menambah kebocoran.
- `lib/video-base.ts:80-146` — `isAllowedVideoBase()` mewajibkan https, tanpa path/port/kredensial, host di bawah suffix allowlist → tujuan redirect tidak bisa dikendalikan klien (bukan open redirect).

## ❓ Asumsi (BELUM dikonfirmasi)

- Siklus tagihan mulai tanggal 15 (owner hanya ingat "pertama pakai 15 Mei"; halaman Usage tidak ditemukan). Kalau benar, reset berikutnya 15 Sep 2026.
- Perkiraan 2,7 GB/hari (29,71 GB ÷ 11 hari) mengasumsikan pemakaian rata. Artinya jatah 10 GB habis dalam ~3,7 hari — **menunggu reset tanpa memperbaiki kode = situs hidup ~4 hari lalu mati lagi.**
- Porsi bot vs penonton asli **tidak diketahui**: Logs Vercel kosong karena deployment paused (tidak ada request yang dilayani) + retensi log paket gratis pendek.
- Apakah CDN Vercel benar-benar menyimpan respons 307 sesuai `s-maxage` — belum diverifikasi. Kalau tidak, dampaknya hanya fungsi terpanggil lebih sering (kuota CPU), bukan kuota transfer.

## Kenapa redirect, bukan cara lain (§4.4 — alat yang sudah ada dicari dulu)

- **Tetap proxy + batasi Range 8 MB**: 10 GB ÷ 8 MB = ~1.250 pemutaran teaser sebulan. Terlalu sedikit untuk situs publik → gugur.
- **Naikkan cache jadi 1 tahun**: JUSTRU BERBAHAYA. Alamat tunnel berganti tiap PC backup restart (5 siklus, lihat HANDOFF.md) → teaser menunjuk alamat mati sampai cache kedaluwarsa. Gugur.
- **Alamat tunnel langsung di komponen client (tanpa route)**: tidak bisa — `NEXT_PUBLIC_*` dibakar saat build, jadi alamat baru butuh redeploy (`lib/video-base.ts:60`). Itu persis masalah yang sudah dibereskan 2026-08-22.
- **307 redirect** menang: byte langsung PC backup → penonton, tapi alamat tetap dibaca sisi server saat request, jadi ikut pindah tanpa redeploy.

## Yang dikerjakan

| # | Berkas | Perubahan |
|---|---|---|
| 1 | `app/api/teaser/route.ts` | Proxy byte → **307 redirect**. Validasi `id`/`ep` & gagal-AMAN (404 kalau alamat kosong) dipertahankan. |
| 2 | `app/api/teaser/route.ts` | `TEASER_BYTES` yang mangkrak dibuang; `Cache-Control` diberi komentar "JANGAN dipanjangkan" + alasannya. |
| 3 | `app/components/HeroPreview.tsx` | `preload="auto"` → `"metadata"` + prop `delayMs` (default `HERO_TEASER_DELAY_MS` = 1200 ms) sebelum `<video>` dipasang. |
| 4 | `app/components/Poster.tsx` | Cuplikan hover diulang di detik ke-`CARD_PREVIEW_SEC` (10) — pengganti `TEASER_BYTES` di sisi browser. |
| 5 | `lib/hero-teaser.ts` | Rumah 2 konstanta baru + alasannya. |
| 6 | `tests/teaser-redirect.test.ts` | **Penjaga permanen** 8 tes: 307 + badan kosong + cache pendek + tolak path traversal + gagal-AMAN. |

## Yang TIDAK dikerjakan (sengaja)

- **Tidak di-push.** `git push` ke branch produksi = tombol rilis (§5.5), butuh izin owner.
- **Tidak upgrade / tidak mengubah paket Vercel.** Keputusan biaya = owner.
- **Tidak menyentuh `/api/download`** — masih proxy, tapi hanya jalur cadangan (unduh utama langsung ke tunnel lewat `?dl=1`, `lib/video.ts:17`). Perlu diukur terpisah sebelum diubah.
- **Tidak menambah `Save-Data`/deteksi jaringan lambat.** Layak, tapi di luar lingkup yang diminta.

## Yang ikut tersenggol

`teaserSrc()` dipakai 3 tempat — semuanya ikut berubah perilakunya:
`app/components/HomeHero.tsx:76` (hero beranda) · `app/components/DramaCard.tsx:14` (kartu drama) ·
`app/components/ContentRow.tsx:114` (baris konten). Penjaganya: `tests/teaser-redirect.test.ts` (baru)
+ `tests/hero-teaser.test.ts` (sudah ada).

## Pre-mortem (§4.4)

*"Semua ini dikerjakan, tapi hasilnya nol guna bagi owner — kenapa?"*
Karena kuota tetap jebol dari sumber LAIN yang belum diukur (mis. `/api/download`, atau ISR/gambar),
sehingga situs di-pause lagi walau teaser sudah nol. → Mitigasi: sesudah situs hidup, **pantau halaman
Usage 2-3 hari pertama**; kalau Fast Origin Transfer masih naik cepat, tersangka berikutnya `/api/download`.

## Bukti (§4.6 — dijalankan, bukan dibaca)

- `npx vitest run` → **366 tes lulus** (358 lama + 8 baru), 31 berkas tes.
- `npx tsc --noEmit` → **exit 0**.
- `npx next build` → **sukses**, `/api/teaser` ikut ter-compile.
- **Mutation check**: `307` diganti `200` → tes MERAH ("expected 200 to be 307"); dikembalikan → hijau. Penjaganya terbukti menggigit, bukan tes kosong.
- **Uji server nyata** (`next start` port 3011, lalu curl):
  `HTTP/1.1 307` · `location: https://<tunnel>/over-your-dead-body/1.mp4` ·
  `cache-control: public, max-age=0, s-maxage=60` · **`0 byte` terunduh dari server kita**.

## Temuan terpisah (BUKAN akibat perubahan ini)

Alamat tunnel yang tersimpan (`kelly-officials-laid-written.trycloudflare.com`) **sudah mati** —
`nslookup` balas "Non-existent domain" (internet sesi normal: `example.com` → 200).

Dugaan penyebab, dari kode: PC backup melaporkan alamat barunya dengan **POST ke situs Vercel**
(`pc-backup-agent/start-video-services.ps1:203`). Situs sedang paused → laporan gagal → alamat di
database beku di tunnel lama. Kalau benar, begitu Vercel hidup lagi PC backup bisa lapor dan video
pulih sendiri, **tanpa perlu dihitung sebagai siklus mati ke-6**. Belum diverifikasi (butuh situs hidup).

---

## Lanjutan 2026-08-26 — `/api/download` + audit seluruh kuota + jalan keluar

### `/api/download` juga diubah jadi redirect

Bukan penyebab aktif: `lib/video.ts:21` sudah mengarahkan tombol Unduh LANGSUNG ke tunnel (`?dl=1`)
selama alamat tunnel ada, jadi route ini praktis cuma jalur cadangan mode lokal. Tetap dibereskan
karena ia menyala persis ketika keadaan sedang kacau — satu unduhan 300 MB = 3% jatah bulanan.
Paksa-unduh tetap jalan sesudah redirect: `?dl=1` ditangani Caddy PC backup dengan
`header Content-Disposition "attachment"` (`pc-backup-agent/Caddyfile:22-26`, sudah diverifikasi baca).
Penjaga: `tests/download-redirect.test.ts` (6 tes, termasuk mengunci `?dl=1` supaya tak hilang).

### Audit seluruh kuota Vercel Hobby (jawaban "apa lagi yang bisa bikin paused")

| Kuota | Angka saat pause | Sesudah perbaikan | Nilai |
|---|---|---|---|
| Fast Origin Transfer | **29,71 / 10 GB — JEBOL** | ~nol | beres |
| Fast Data Transfer | 23,11 / 100 GB | ikut turun (byte teaser juga terhitung di sini) | aman |
| Fluid Active CPU | 1j21m / 4j | ikut turun (fungsi tak lagi menahan aliran byte) | aman |
| **ISR Writes** | **54K / 200K** | **tidak berubah** | **risiko #2 — lihat bawah** |
| Image Transformations | 30 gambar (`i.imgur.com`), batas 5.000 | — | aman, jauh |
| Function Invocations | batas 1.000.000; nol polling dari browser | — | aman |

**Risiko #2 — ISR Writes.** `revalidate = 60` dipasang di 5 berkas (`app/beranda`, `app/discover`,
`app/drama/[id]`, `app/page.tsx`, `app/shorts`) untuk 21 judul + halaman statis. Terpakai 54K dalam
~11 hari → proyeksi ~147K/bulan = **73% dari 200K**. Belum jebol, tapi sekali trafik naik ia menyusul.
Menaikkan `revalidate` 60 → 600 memotongnya ~10x. **BELUM dikerjakan**: ini mengubah yang client
rasakan (drama baru muncul dalam 10 menit, bukan 1 menit) → keputusan owner (§4.4).

**Yang diperiksa dan ternyata AMAN:** nol cron job (tak ada `vercel.json`) · nol polling browser ke API
(2 `setInterval` yang ada murni UI: rotasi carousel + hitung mundur iklan) · `public/` cuma 19 KB ·
`/api/subtitle` hanya teks kecil.

**Temuan sampingan (bukan kuota):** `/api/admin/upload` menulis ke filesystem, padahal filesystem
Vercel read-only — komentarnya sendiri sudah mengakui "hanya berfungsi di lingkungan LOKAL"
(`app/api/admin/upload/route.ts:17`). Jadi route ini mati di produksi. Bukan risiko kuota (batas body
Vercel menolak upload besar lebih dulu), tapi dead code yang menyesatkan (§3.1). Belum disentuh.

### ⚠️ Risiko yang TIDAK bisa diperbaiki dengan kode

Dokumen resmi Vercel: paket Hobby dibatasi **"non-commercial, personal use only"**
(https://vercel.com/docs/plans/hobby → fair use guidelines). Project ini punya atasan yang harus
menyetujui upgrade → kalau dinilai komersial, Vercel bisa mem-pause karena kebijakan, dan tak ada
perbaikan kode yang mencegahnya. Perlu diketahui owner sebelum memilih bertahan di Hobby.

### 🔑 Jalan keluar yang ditemukan (GRATIS, tak perlu upgrade)

Dokumentasi resmi Vercel: **"Paused projects resume one at a time, never automatically."**
Artinya (a) menunggu reset TIDAK akan menghidupkan situs sendiri — ini mengoreksi dugaan sesi ini
sebelumnya; (b) ada tombol **Resume Project** yang **tidak menuntut upgrade**.

Letaknya BUKAN di halaman Overview akun (di situ memang cuma ada tombol Upgrade), tapi di:
**Project `dramaapp` → Settings → General → seksi "Pause Project" (tepat di atas Delete Project)**.
Ada juga banner di halaman project. Butuh peran Owner/Member/Project Administrator.

Urutan yang benar: **push perbaikan DULU, baru Resume.** Kalau Resume ditekan selagi kode lama masih
tayang, kuota terbakar lagi dalam hitungan jam. Kalau sesudah di-Resume ternyata langsung ter-pause
lagi (kuota siklus ini memang sudah habis), sisa pilihannya: tunggu 30 hari, atau pindah host sementara.

Sumber: https://vercel.com/kb/guide/why-is-my-account-deployment-blocked · https://vercel.com/docs/plans/hobby
