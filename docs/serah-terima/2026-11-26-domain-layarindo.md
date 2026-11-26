# 2026-11-26 — Domain utama pindah ke layarindo.com

Branch: `feat/domain-layarindo` (dari `main` 4395e0e) · 3 commit. Owner sudah memeriksa & menerima
semuanya, termasuk commit SEO.

## Status saat ditulis (dari owner, 2026-11-26)
Langkah sisi owner **SUDAH SELESAI semua**: `layarindo.com` + `www.layarindo.com` hidup (DNS di
Cloudflare, apex CNAME @ dengan CNAME flattening), Playly sudah mendaftarkan domainnya (video jalan
di HP), `NEXT_PUBLIC_SITE_URL` = `https://layarindo.com/` sudah di-deploy. Garis miring di ujung
nilai itu aman — `pengalihanDomainLama` & `lib/site.ts` membuangnya.

**Akibatnya: begitu branch ini di-merge & deploy, pengalihan 308 LANGSUNG menyala.**

## 1. Apa yang berubah + kenapa
- Alamat Railway lama + `www.layarindo.com` dialihkan permanen (308) ke `https://layarindo.com`,
  path & query ikut. Sekarang `www` dan apex dua-duanya 200 = Google melihat dua salinan situs.
- `/api/*` SENGAJA tidak dialihkan: webhook Playly, robot keep-db-awake, dan agent PC.
- Nilai cadangan `lib/site.ts` & `scripts/e2e-tahap7.mjs` → `https://layarindo.com`.
- Deskripsi SEO otomatis tak lagi memotong nama situs (menjawab catatan "menunggu keputusan owner"
  di `tests/seo-drama.test.ts`). Untuk judul katalog nyata hasilnya sama persis.

### Keputusan: `KEEPALIVE_SITES` dan `DRAMAAPP_SITUS_URL` TETAP alamat Railway — jangan diubah
> Ralat: pesan chat rekan sebelumnya menyuruh mengganti keduanya ke layarindo.com. **Itu salah,
> abaikan.** Yang berlaku adalah bagian ini.

- Keduanya hanya memanggil `/api` (robot: `/api/dramas`; agent PC: `/api/teaser` +
  `/api/agent/video-base`), dan `/api` tak dialihkan → alamat Railway tetap menjawab langsung.
- `DRAMAAPP_SITUS_URL` adalah setelan paling berbahaya (salah = semua video mati, indikator tetap
  hijau) dan sekarang terbukti jalan. Mengubahnya = risiko tanpa manfaat.
- `layarindo.com` lewat Cloudflare — satu lapisan tambahan. ❓ Belum diverifikasi apakah proteksi
  bot Cloudflare mencegat skrip PowerShell / robot GitHub; karena itu jangan bergantung padanya.
- **Kapan wajib diganti:** hanya SEBELUM alamat Railway dimatikan. Urutannya: ganti `DRAMAAPP_SITUS_URL`
  + `KEEPALIVE_SITES` (2 repo) → uji rantai situs → tunnel → berkas → baru matikan alamat Railway.
- Cadangan di repo ikut keputusan ini: `.github/workflows/keep-db-awake.yml` (`SITES`) dan
  `pc-backup-agent/start-video-services.ps1` (`$SITUS_URL`) tetap Railway, kini diberi komentar
  "SENGAJA" + syarat gantinya, supaya tak "dirapikan" orang berikutnya.

## 2. Berkas yang disentuh
- `next.config.ts` — `pengalihanDomainLama()` (308, lewati `/api/*`)
- `lib/site.ts` — `DEFAULT_SITE_URL` → `https://layarindo.com` (cadangan #1)
- `scripts/e2e-tahap7.mjs` — `BASE` → `https://layarindo.com` (cadangan #4)
- `.github/workflows/keep-db-awake.yml`, `pc-backup-agent/start-video-services.ps1` — hanya
  komentar (cadangan #2 & #3, nilai tak berubah)
- `docs/migrasi-railway-tahap6-pindah-domain.md` — catatan pembaruan di "Daftar nilai cadangan"
- `lib/seo-drama.ts` (`pembukaMuat`, `tambahGenre`) + `tests/seo-drama.test.ts` — dipakai halaman
  `/drama/[id]` dan tombol "Generate SEO Otomatis" di form admin

## 3. Butuh SQL migrasi?
Tidak.

## 4. Butuh env baru?
Tidak. Semua variabel sudah diisi owner. Tak ada langkah Supabase: login situs ini memakai cookie
sendiri (`lib/session.ts`, HMAC), bukan Supabase Auth — nol pemanggilan `supabase.auth` di kode.

**Rollback:** isi `NEXT_PUBLIC_SITE_URL` dengan alamat Railway → deploy ulang (jangan dihapus —
cadangannya kini layarindo.com). ⚠️ 308 disimpan browser: pengunjung yang sudah pernah dialihkan
tetap dialihkan dari cache-nya walau server sudah berhenti. Tak masalah karena pindahnya memang
permanen — catatan dari owner, supaya tak kaget.

## 5. Bukti yang sudah dijalankan
Pengalihan & cadangan, dari `rm -rf .next` (build lokal pakai `ALLOW_FILE_MODE=1` — komputer rekan
tanpa Supabase):
- `npm run build` exit 0 (dua kali, untuk dua nilai variabel) · `npx tsc --noEmit` exit 0 ·
  `npm test` 2892 lulus / 203 berkas
- `next start` + header Host, variabel = alamat Railway: Railway `/` & `/film?ref=x` → 200 ·
  `www.layarindo.com/drama/abc` → 308 ke Railway · `/api/dramas` → 200 · `healthcheck.railway.app` → 200
- variabel = **`https://layarindo.com`** (keadaan produksi sekarang): Railway `/` → 308
  `https://layarindo.com/` · `/film?ref=x` → 308 `https://layarindo.com/film?ref=x` ·
  `www…/drama/abc` → 308 `https://layarindo.com/drama/abc` · `/api/dramas` → 200 · healthcheck → 200 ·
  canonical `https://layarindo.com` · robots `Sitemap: https://layarindo.com/sitemap.xml`
- Diperiksa ulang owner dengan mesin rute Next: `/api/dramas` & `/api/webhooks/playly` tak dialihkan,
  `/` & `/beranda` dialihkan.

SEO:
- Versi lama vs baru pada 42 drama `data/dramas.json` (cadangan — bisa sedikit basi): **0 deskripsi
  berubah**, judul terpanjang 89 huruf.
- Penjaga terbukti: kode LAMA 3 tes merah ("… di…"), kode baru 20/20 hijau.
- `npm run build` exit 0 · `npx tsc --noEmit` exit 0 · `npm test` 2894 lulus / 203 berkas

Komentar keep-db-awake & agent PC: hanya komentar; YAML terbaca (parser YAML OK) dan PowerShell
0 error parse.

## 6. Cara owner mencoba sendiri (sesudah merge & deploy)
1. Buka `https://dramaapp-production-9e88.up.railway.app/film` → harus pindah sendiri ke `https://layarindo.com/film`.
2. Buka `https://www.layarindo.com/` → harus pindah ke `https://layarindo.com/` (tanpa www).
3. Buka satu film, putar → video harus jalan. Besok pagi cek tab Actions robot keep-db-awake → hijau.
