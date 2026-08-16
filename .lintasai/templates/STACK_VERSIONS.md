# Stack Versions Reference - lintasAI

> Tempat rujukan TUNGGAL untuk version requirement (rujukan manusia/AI — BUKAN ditarik otomatis oleh kode; verifikasi angka via `npm view`, lihat catatan di bawah).
> Update file ini saat upgrade major version framework.
> Konsumen: STACK_GUIDE.md, dst.
> Last updated: 2026-07-11

## Required Versions (Minimum Supported)

> ⚠️ Kolom **"Tested"** = patch terakhir yang diketahui aman saat file ini ditulis, BUKAN angka yang harus di-pin buta. Sebelum upgrade, **selalu cek versi rilis aktual** (`npm view <pkg> version`) — angka di bawah bisa sudah ketinggalan.

| Stack | Minimum | Recommended | Tested (verify saat upgrade) |
|---|---|---|---|
| Node.js | 22.x | 24.x LTS | 24.x |
| Next.js | 14.x | 16.x | 16.x |
| React | 18.x | 19.x | 19.x |
| Prisma | 5.x | 7.x | 7.x |
| Tailwind | 3.x | 4.x | 4.x |
| TypeScript | 5.x | 5.x | 5.x |
| NextAuth | v4 | v4 | 4.x |

> 🚨 **Node.js (diverifikasi 2026-07-11 ke nodejs.org previous-releases):** **Node 20 (Iron) sudah EOL/habis-dukungan sejak 2026-04-30** — tak ada lagi patch keamanan; JANGAN pakai base image `node:20-*` untuk produksi. **24.x (Krypton) = LTS "Active"** (fitur + perbaikan penuh, EOL ~2028-04) = rekomendasi default. **22.x (Jod) = LTS "Maintenance"** (hanya patch penting/keamanan, EOL ~2027-04) = opsi konservatif kalau project belum siap naik. Project di ≤20 → rencanakan naik. `:latest` DILARANG (bisa loncat ke Current yang belum LTS).

## Update Policy

- **Patch** (Next 16.2 → 16.3): aman, langsung naik.
- **Minor** (Next 16 → 17): uji di staging dulu sebelum produksi.
- **Major**: rencanakan — baca migration guide framework-nya, siapkan rollback, naikkan 1 paket per
  langkah (jangan borongan) supaya kalau pecah, jelas penyebabnya yang mana.
