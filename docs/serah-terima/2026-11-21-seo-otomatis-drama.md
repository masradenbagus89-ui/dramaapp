# 2026-11-21 — SEO otomatis per drama + tombol "Generate SEO Otomatis" di admin

Branch: `feat/seo-otomatis` di remote `dramaku` — dibuat dari `main` **6de869d** (terbaru saat
ditulis 2026-11-23), belum dirilis. Commit tunggal, hanya berkas di bagian 2.

Catatan pemindahan: fitur ini mula-mula ditulis di atas basis yang tertinggal 315 commit, lalu
**dipasang ulang** di atas `main`. Dua hal disesuaikan: (1) konflik import di
`app/api/admin/drama/route.ts`, `segarkanCachePublik` milik main tetap dipertahankan; (2)
`toMetaDescription` di `lib/site.ts` **tidak jadi dihapus**, karena di main masih dipakai
`<KakiFilm>` (`app/drama/[id]/page.tsx`).

## 1. Apa yang berubah + kenapa
Owner minta SEO otomatis tiap kali film ditambah/diedit. Catatan: permintaan aslinya menyebut
PHP, padahal project ini Next.js + Supabase, jadi dikerjakan di sistem yang ada.

Yang **sudah ada sebelumnya** dan tetap dipakai: canonical, Open Graph, JSON-LD `Movie`/`TVSeries`,
URL slug. Slug yang sudah tayang **tidak diubah** (mengubahnya mematikan link lama).

Yang baru:
- **Generator template** (`lib/seo-drama.ts`), tanpa API berbayar, hanya merangkai data drama:
  title ≤60 karakter (+ "| DramaKu"), deskripsi 150–160 (pembuka + genre + potongan sinopsis),
  5–10 keyword (judul, jenis, tahun, genre, negara). Data kosong tidak dikarang: tanpa tahun
  tidak ada angka tahun, serial **berbayar tidak disebut "gratis"**. Sinopsis tidak ditambang
  jadi keyword (tanpa model bahasa hasilnya kata acak).
- **Form admin**: kotak hijau "SEO (Google & preview share)" di atas tombol Simpan. Ada 3 kolom
  + penghitung karakter + tombol **✨ Generate SEO Otomatis**. Kolom berisi isian manual →
  muncul konfirmasi (OK = timpa semua · Batal = isi yang kosong saja).
- **Halaman drama**: memakai isian admin per kolom, kolom kosong otomatis dihitung saat tampil
  (ikut data terbaru). Ini **mengubah title/description semua 42 halaman drama lama** di Google
  (URL tetap). Contoh: dulu "X Sub Indo | DramaKu", sekarang "Nonton X (2026) Sub Indo Gratis | DramaKu".
- `meta keywords` dipasang sesuai permintaan. Jujur saja: Google tidak memakai tag ini untuk
  peringkat. Yang berpengaruh title & description.

Disimpan di dokumen `app_data` key `seo` (pola sama dengan `kualitas`/`unduhan`), **bukan**
kolom tabel. Utang teknis + cara naik kelas ditulis di `lib/seo-drama-data.ts`.

## 2. Berkas yang disentuh
- `lib/seo-drama.ts` (baru): generator + penyaring (murni)
- `lib/seo-drama-data.ts` (baru): baca/tulis `app_data` key `seo`
- `app/components/admin/SeoFields.tsx` (baru): kotak SEO di form
- `lib/types.ts`: tipe `SeoDrama` + field `Drama.seo`
- `lib/dramas.ts`: 4 fungsi baca katalog ikut menempelkan SEO (yang ber-cache ikut `revalidate`)
- `app/api/admin/drama/route.ts`: terima & simpan `seo` (tak dikirim = tak disentuh)
- `app/admin/page.tsx`, `app/components/admin/DramaForm.tsx`: state + pasang kotak
- `app/drama/[id]/page.tsx`: `generateMetadata` memakai `seoTerpakai`
- `tests/seo-drama.test.ts` (baru, 17 tes) · `tests/admin-drama-route.test.ts` (+3 tes)

Dipakai halaman lain: `getAllDramas*`/`getDrama*` dipakai beranda, katalog, sitemap, dan lainnya.
Yang ditambahkan hanya field `seo` opsional + 1 pembacaan `app_data` ber-cache.

## 3. Butuh SQL migrasi?
Tidak. Dokumen `app_data` key `seo` dibuat otomatis saat SEO pertama disimpan.

## 4. Butuh env baru di Vercel?
Tidak.

## 5. Bukti
**Ulang di atas main 6de869d (2026-11-23)**, `npm run gerbang` dengan `ALLOW_FILE_MODE=1` (folder
kerja tanpa `.env.local`, jadi pengaman mode-berkas milik main menolak build tanpa bendera itu):
- `npm run build` ✓ · `npx tsc --noEmit` ✓ · tes SEO 25/25 lulus
- `npm test` → **7 gagal / 2749 lulus** (195 berkas). ⚠️ Ketujuh tes itu **SUDAH MERAH di main
  murni** (perubahan SEO di-stash → 6 berkas yang sama tetap 7 gagal): `bagian-playly`,
  `baris-atas-film`, `hero-gambar-besar`, `panel-playly-tahan-gangguan`, `playly-genre`,
  `saring-video-admin`. Tak satu pun menyentuh SEO, tapi **gerbang pra-rilis main sedang
  merah**. Owner perlu membereskannya sebelum rilis apa pun.

Bukti awal (2026-11-21, basis lama):
Dijalankan di salinan project (server `next start -p 3123` sedang memakai `.next` folder asli):
- `npm run build` → exit 0 · `npx tsc --noEmit` → exit 0 · `npm test` → **1445 lulus / 98 berkas**
- Uji-balik: aturan "gratis" dirusak → tes MERAH. Simpan-edit SEO dirusak → awalnya tetap
  HIJAU (celah), lalu ditambah tes "edit drama ber-SEO" → MERAH. Dikembalikan → hijau.
- Halaman sungguhan (`/drama/over-your-dead-body`, `/drama/diremehkan-…`): title, description,
  keywords, canonical, og:title/description/image/type, JSON-LD Movie/TVSeries tampil.
- Bug yang tertangkap di sini: judul ber-koma terpecah jadi 2 keyword. Sudah diperbaiki,
  ada tes penjaganya, dan dicek ulang di halaman.
- ✅ Dicoba rekan di admin localhost yang sudah login (`next dev`, mode lokal tanpa Supabase):
  Generate → Simpan berhasil untuk 2 film, `over-your-dead-body` & `transformers-the-last-knight`.
  Field `seo` keduanya tersimpan di `data/dramas.json`.
- ❓ Belum dibuktikan: simpan ke `app_data` di **Supabase sungguhan** (localhost & tes memakai
  mode lokal). Mohon owner coba lewat bagian 6 setelah deploy.

## Catatan kerja lokal rekan (BUKAN untuk di-commit)
- `data/dramas.json` berisi 2 entri `seo` hasil coba di localhost. **Jangan ikut di-commit.**
  Cadangan sebelum dicoba ada di scratchpad sesi AI. Pulihkan dulu sebelum commit, atau
  stage berkas fitur saja (bagian 2), tanpa `data/`.
- `data/adminpass.json` = password admin **khusus localhost** (hash) untuk `admin@dramaku.com`.
  Dibuat karena nilai `ADMIN_PASSWORD` di `.env.local` tidak terlihat di editor rekan.
  Dikecualikan lewat `.git/info/exclude` (lokal, tidak mengubah `.gitignore`). Hapus berkasnya
  → login localhost kembali ke `ADMIN_PASSWORD`. **Temuan untuk owner:** `data/adminpass.json`
  tidak ada di `.gitignore`, padahal kembarannya `data/twofa.json` ada (`.gitignore:19`).
  Sebaiknya ditambahkan supaya hash password lokal tidak bisa ikut ter-commit.
- Server localhost dimatikan (batas 2 jam proses latar AI). Menyalakan sendiri:
  `npm run dev -- -p 3000 -H 127.0.0.1` → http://127.0.0.1:3000.

## 6. Cara owner mencoba
1. Buka `/admin` → klik **Edit** pada satu drama → gulir ke kotak hijau **SEO**. Kolomnya
   kosong, isinya terlihat samar (itulah hasil otomatis).
2. Klik **✨ Generate SEO Otomatis** → 3 kolom terisi. Ubah sedikit judulnya → klik Generate
   lagi → harus muncul konfirmasi "sudah ada yang diisi manual". Klik **Simpan drama**.
3. Buka halaman drama itu → klik kanan → *View page source* → `<title>` harus sama dengan
   isianmu. Tes preview share di https://developers.facebook.com/tools/debug/ (judul, deskripsi,
   gambar).
