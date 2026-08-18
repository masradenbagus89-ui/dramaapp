# Rencana — Performance & SEO (Tahap 4)

**Tanggal:** 2026-08-18 · **Bobot:** SEDANG-BERAT (menyentuh 5 halaman publik bersama + metadata situs)
**Keputusan owner:** domain canonical `https://dramaapp.vercel.app` (lewat env var) · cache ISR **60 detik**

## Kontrak (§1 skill seo)

- **Input:** halaman publik `/`, `/beranda`, `/discover`, `/shorts`, `/drama/[id]`.
- **Output:** tiap halaman punya title+deskripsi UNIK, bisa di-crawl, ada sitemap+robots, preview share tampil.
- **URL tidak berubah** di tahap ini → tidak ada redirect 301 yang perlu dipasang.
- **Bukan rahasia:** metadata SEO memang untuk publik.

## Kondisi awal (terverifikasi, bukan asumsi)

| # | Temuan | Bukti |
|---|---|---|
| 1 | `force-dynamic` di 6 halaman publik → cache mati | `app/page.tsx:9`, `beranda:7`, `discover:8`, `drama/[id]:16`, `feed/[id]:5`, `shorts:8` |
| 2 | `generateStaticParams()` dibatalkan `force-dynamic` = kode mati | `app/drama/[id]/page.tsx:16` vs `:18` |
| 3 | Nol `next/image`; 9 `<img>` mentah | `app/page.tsx:146,280,414` dll |
| 4 | Semua halaman berbagi 1 title | hanya `app/layout.tsx:17` + `video-eksternal:6` |
| 5 | Tak ada `sitemap.ts` / `robots.ts` | tidak ada di `app/` maupun `public/` |
| 6 | `/admin` tanpa `noindex` | tak ada penanda di `app/admin/` |
| 7 | Tak ada `metadataBase` + OG | `app/layout.tsx:17-20` |

Versi terpasang: next **16.2.9**, react **19.2.4**.

## Langkah

1. `lib/site.ts` — SATU sumber alamat situs (`NEXT_PUBLIC_SITE_URL`, default `https://dramaapp.vercel.app`).
2. `app/robots.ts` — izinkan publik; larang `/admin`, `/api`, halaman akun; tunjuk sitemap.
3. `app/sitemap.ts` — di-generate dari `getAllDramas()` supaya drama baru otomatis masuk.
4. `app/layout.tsx` — `metadataBase`, `title.template`, OG/Twitter default.
5. `app/drama/[id]/page.tsx` — `generateMetadata` (title/deskripsi/OG UNIK per drama) + `force-dynamic` → `revalidate = 60` (menghidupkan kembali `generateStaticParams`).
6. `app/page.tsx`, `beranda`, `discover`, `shorts` — `force-dynamic` → `revalidate = 60` + metadata per halaman.
7. `app/admin/layout.tsx` — `robots: { index: false }`.
8. `next/image` untuk poster beranda + konfigurasi `images` di `next.config.ts`.
9. Bukti: `npm run build` + `npm test` harus lulus.

## Yang TIDAK dibangun (sengaja)

- `feed/[id]` tetap `force-dynamic` — memakai `searchParams`, memang tak bisa di-cache.
- Tidak ada riset kata kunci / backlink (itu SEO off-page, di luar baseline teknis — skill `seo` §2 butir 6).
- Tidak menyentuh Supabase, skema DB, koin, maupun auth.
- Tidak mengganti `<img>` di halaman admin/login (bukan halaman publik, tak berpengaruh ke SEO).

## Yang ikut tersenggol

| Fitur yang kamu kenal | Kenapa tersenggol | Penjaganya |
|---|---|---|
| Tambah drama baru di admin | Halaman publik jadi cached 60 detik | Drama baru muncul maks 60 detik — disetujui owner |
| Beranda / discover / shorts | Ganti strategi render | `npm test` (212 tes) + `npm run build` |
| Halaman detail drama | Dapat metadata + jadi pre-built | Sama seperti di atas |

## Pre-mortem

*Anggap semua ini sudah dikerjakan dan hasilnya nol guna bagi owner — kenapa?*
→ Paling mungkin: sitemap terisi tapi Google tak pernah tahu, karena sitemap tidak pernah didaftarkan
ke Google Search Console. Maka langkah penutup WAJIB memberi owner instruksi daftar Search Console,
bukan cuma "sitemap sudah jadi".
