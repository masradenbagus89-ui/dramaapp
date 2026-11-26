# 2026-11-26 — Domain utama pindah ke layarindo.com

Branch: `feat/domain-layarindo` (dari `main` 4395e0e) · 2 commit, bisa diterima terpisah.

## 1. Apa yang berubah + kenapa
`layarindo.com` sudah dibeli. Kode disiapkan supaya begitu `NEXT_PUBLIC_SITE_URL` di Railway diganti
ke `https://layarindo.com`, seluruh situs ikut pindah: canonical, sitemap, robots, preview share — dan
alamat Railway lama + `www.layarindo.com` dialihkan permanen (308) ke `https://layarindo.com`, dengan
path & query ikut. Nama "Layarindo" sudah ada di `main` (0691e03), jadi tak disentuh lagi.

**Sakelarnya tetap variabel di panel Railway, bukan merge.** Selama variabel masih berisi alamat
Railway, alamat Railway tidak dialihkan ke mana pun — branch ini aman di-merge kapan saja.

`/api/*` SENGAJA tidak dialihkan: webhook Playly, robot keep-db-awake, dan agent PC memanggil alamat
Railway langsung. Karena itu cadangan #2 (`KEEPALIVE_SITES`) dan #3 (`$SITUS_URL` agent PC) di
"Daftar nilai cadangan" sengaja tetap alamat Railway — tetap hidup sebelum & sesudah domain pindah.

**Commit 2 (opsional) — deskripsi SEO tak lagi memotong nama situs.** Menjawab catatan di
`tests/seo-drama.test.ts` ("Perbaikan sebenarnya = memotong JUDUL di dalam kalimat pembuka …
menunggu keputusan owner"). Kalimat pembuka selalu utuh sampai "di Layarindo.", judul yang
dipendekkan bila kepanjangan, genre dibuang per item. Teks yang sudah terbit di Google TIDAK berubah
untuk judul katalog nyata (terpanjang 89 huruf — masih muat utuh, hasil sama persis); yang berubah
hanya judul >~110 huruf. Tak mau? Cukup tak ikut menarik commit kedua.

## 2. Berkas yang disentuh
Commit 1 (domain):
- `next.config.ts` — `pengalihanDomainLama()` (308, lewati `/api/*`)
- `lib/site.ts` — `DEFAULT_SITE_URL` → `https://layarindo.com` (cadangan #1)
- `scripts/e2e-tahap7.mjs` — `BASE` → `https://layarindo.com` (cadangan #4)
- `docs/migrasi-railway-tahap6-pindah-domain.md` — catatan pembaruan di "Daftar nilai cadangan"

Commit 2 (SEO): `lib/seo-drama.ts` (`pembukaMuat`, `tambahGenre`) + `tests/seo-drama.test.ts` —
dipakai halaman `/drama/[id]` dan tombol "Generate SEO Otomatis" di form admin.

## 3. Butuh SQL migrasi?
Tidak.

## 4. Butuh env baru di Railway?
Tidak ada variabel BARU — yang sudah ada diganti nilainya: `NEXT_PUBLIC_SITE_URL` =
`https://layarindo.com`, lalu **deploy ulang** (ditanam saat build). Rollback = isi kembali alamat
Railway lalu deploy ulang (jangan dihapus — cadangannya sekarang layarindo.com).

**Urutan wajib:**
1. Playly mengizinkan `layarindo.com` + `www.layarindo.com` (Pesan 2 di dokumen Tahap 6) — tanpa ini
   video tampil "Situs ini belum diizinkan" begitu domain dipakai.
2. Railway → service → Settings → Networking → Custom Domain: tambah `layarindo.com` dan
   `www.layarindo.com`; isi record DNS yang ditampilkan di pengelola domain (domain utama tak bisa
   CNAME → ALIAS/ANAME atau DNS di Cloudflare). Tunggu `https://layarindo.com` terbuka bergembok.
3. Ganti `NEXT_PUBLIC_SITE_URL` → deploy ulang.
4. Supabase → Authentication → URL Configuration: Site URL + Redirect URLs ke layarindo.com.
5. `KEEPALIVE_SITES` di kedua repo GitHub: biarkan alamat Railway (lihat bagian 1).

## 5. Bukti yang sudah dijalankan
Commit 1, dari `rm -rf .next` (build lokal pakai `ALLOW_FILE_MODE=1` — komputer rekan tanpa Supabase):
- `npm run build` exit 0 (dua kali, untuk dua nilai variabel) · `npx tsc --noEmit` exit 0 ·
  `npm test` 2892 lulus / 203 berkas
- `next start` + header Host, variabel = **alamat Railway (keadaan produksi sekarang)**:
  Railway `/` & `/film?ref=x` → 200 (TIDAK dialihkan) · `www.layarindo.com/drama/abc` → 308 ke Railway ·
  `/api/dramas` → 200 · `healthcheck.railway.app` → 200 · canonical & robots = alamat Railway
- variabel = **`https://layarindo.com`**: Railway `/` → 308 `https://layarindo.com/` ·
  `/film?ref=x` → 308 `https://layarindo.com/film?ref=x` · `www…/drama/abc` → 308 `https://layarindo.com/drama/abc` ·
  `/api/dramas` → 200 (tak dialihkan) · healthcheck → 200 · canonical `https://layarindo.com` ·
  robots `Sitemap: https://layarindo.com/sitemap.xml`

## 6. Cara owner mencoba sendiri (sesudah langkah 3)
1. Buka `https://dramaapp-production-9e88.up.railway.app/film` → harus pindah sendiri ke `https://layarindo.com/film` bergembok.
2. Buka `https://layarindo.com/robots.txt` → baris `Sitemap:` harus `https://layarindo.com/sitemap.xml`.
3. Buka satu film, putar → video harus jalan (bukan "Situs ini belum diizinkan").
