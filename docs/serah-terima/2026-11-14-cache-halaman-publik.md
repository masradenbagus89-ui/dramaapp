# 2026-11-14 — Cache halaman publik: segar otomatis saat admin menyimpan + tombol "Segarkan cache"

Branch: `perf/cache-katalog` (dibuat dari `dramaapp/main` `f6b1c03`). Tidak bercampur dengan
branch captcha/unduhan.

## 1. Apa yang berubah + kenapa

Halaman penonton **sudah** memakai pola stale-while-revalidate sejak lama (ISR `revalidate = 60`
di beranda/katalog/detail/shorts/discover, 300 di /film). Yang belum ada adalah cara membuangnya:
sesudah admin mengubah drama, penonton masih melihat versi lama 1-5 menit. Video yang **ditarik**
Playly lewat webhook juga masih tampil sampai 5 menit.

Empat perubahan:

1. **Buang cache otomatis** sesudah simpan di panel admin dan sesudah webhook Playly — satu fungsi
   `segarkanCachePublik()` (`revalidatePath("/", "layout")` = seluruh halaman di bawah layout akar).
   Gagal-terbuka: kalau pembuangan gagal, simpanan admin tetap sukses (data sudah tertulis; batas
   60/300 detik yang menyegarkannya).
   **Tombol "Segarkan cache"** di Dashboard admin, untuk perubahan di luar panel (mis. edit
   langsung di Supabase). Dijaga sesi admin + anti-CSRF + maks 10/menit.
2. **`/feed/[id]`** (halaman pemutar) membaca drama dari cache yang sama dengan `/drama/[id]`
   (`getDramaCached`). Sebelumnya tiap klik Tonton = 3 query Supabase. Halamannya tetap dinamis
   (membaca `?ep=`); alamat video tetap tidak dikirim dari sini.
3. **`/api/katalog`** baru (ber-cache 60 dtk) untuk `/history` dan `/my-list`.
   `/api/dramas` **sengaja tidak diubah**: KatalogStatusCard dan robot pemantau database
   (`tests/pemantau-database.test.ts`) memakainya untuk tahu database hidup/mati — jawaban
   ber-cache akan melapor "sehat" padahal mati.
4. **Header cache browser 1 hari** untuk `/posters/*`, `/logo.png`, `/logo-mark.png` (sebelumnya
   `max-age=0`). JS/CSS dan `/_next/image` sudah 1 tahun dari Next.js — tidak disentuh.
   ⚠️ Ganti gambar di `public/` dengan nama berkas yang SAMA → bisa terlihat lama sampai 1 hari.

**Yang SENGAJA tidak di-cache:** login/auth, koin/pembayaran, admin, `/api/tonton` (captcha),
`/api/playly/video` (sudah `private, no-store`), `/api/dramas`. Like/komentar/koin TIDAK memicu
pembuangan cache (kalau iya, cache terbuang tiap klik penonton).

**Iklan (`/api/admin/ads`) tidak dipasangi** — fiturnya sedang dijeda (`ADS_ENABLED`).

## 2. Berkas yang disentuh

Baru:
- `lib/cache-publik.ts` — `segarkanCachePublik()`
- `app/api/admin/cache/route.ts` — endpoint tombol
- `app/components/admin/SegarkanCacheCard.tsx` — kartu tombol (di bawah kartu status katalog)
- `app/api/katalog/route.ts` — katalog ber-cache untuk penonton
- `tests/cache-publik.test.ts` — 8 tes

Diubah (1-3 baris tiap berkas):
- Route admin yang menulis katalog: `drama`, `durasi`, `playly/{embeds,genre,hidden,imdb,jenis,key,kualitas,massal,meta,rating,unduhan}`
- `app/api/webhooks/playly/route.ts` — 3 jalur simpan (tarik video hanya bila videonya ketemu)
- `app/feed/[id]/page.tsx` — `getDrama` → `getDramaCached`
- `app/history/page.tsx`, `app/my-list/page.tsx` — `/api/dramas` → `/api/katalog`
- `app/components/admin/AdminDashboard.tsx` — memasang kartu tombol
- `next.config.ts` — aturan cache gambar ditambahkan ke `headers()` yang sudah ada (header keamanan/CSP tidak berubah)

⚠️ **Calon bentrok saat merge:** branch `feat/link-unduhan-provider-kualitas` juga mengubah
`app/feed/[id]/page.tsx` (bagian komentar `providers`). Baris yang saya ubah berbeda (import +
`getDramaCached`), jadi kemungkinan besar tergabung otomatis — tetap periksa.

## 3. Butuh SQL migrasi?
Tidak.

## 4. Butuh env baru di Railway?
Tidak.

## 5. Bukti

- `rm -rf .next` → `npm run build` sukses (mode berkas `ALLOW_FILE_MODE=1` — komputer rekan tak
  punya kunci Supabase). Build menandai `/api/katalog` ber-revalidate 1m.
- `npx tsc --noEmit` → exit 0
- `npm test` → 2463 lulus, 1 gagal: `tests/hero-gambar-besar.test.ts` — **gagal juga di `main`
  tanpa perubahan ini** (dibuktikan dengan `git stash`): tes mencari `\n`, berkas di komputer
  rekan ber-CRLF (`core.autocrlf=true`). Bukan akibat tugas ini.
- Tes baru terbukti menjaga: baris pembuang di route durasi dihapus sementara → tes MERAH → dikembalikan.
- `next start` lokal (port 3310):
  - header: `/api/katalog` `s-maxage=60, stale-while-revalidate` · `/api/dramas` tanpa cache · `/posters/*` & logo `max-age=86400`
  - tombol tanpa login → 401 · dari situs lain → 403 · admin → `{ok:true}`
  - `x-nextjs-cache` `/katalog`, `/api/katalog`, `/beranda`: HIT → (tombol) → MISS → HIT
  - judul drama diubah di `data/dramas.json`: sebelum tombol masih judul lama, sesudah tombol judul baru (berkas dikembalikan)
- ❓ Belum diuji: pembuangan atas data **Supabase** (lokal pakai mode berkas) dan tombol simpan
  admin asli (database lokal = produksi, sengaja tidak ditulis). Mekanismenya sama
  (`revalidatePath` membuang data fetch di halaman itu) — wajib dicek sesudah tayang (bagian 6).

**Ukuran "sebelum" di produksi (Railway, dari komputer rekan, 3-5x tiap alamat):**

| Alamat | TTFB | Catatan |
|---|---|---|
| `/`, `/beranda`, `/katalog`, `/drama/<id>` | ~0,28 dtk | sudah `HIT` dari cache |
| `/feed/<id>` | ~0,31 dtk | `no-store`, 3 query Supabase tiap kali |
| `/api/dramas` | ~0,33 dtk | tanpa cache |
| `/posters/boneka.png` | 0,27 dtk revalidasi | `max-age=0`, ditanya ulang tiap buka |

Jujur soal manfaat: saat Supabase sehat, selisih `/feed` hanya ~30 ms (sebagian besar 0,28 dtk itu
perjalanan jaringan). Manfaat utamanya: (a) perubahan admin tampil seketika, (b) beban Supabase
turun, (c) saat Supabase lambat/mati (kejadian 2026-09-16 & 2026-10-01) halaman pemutar tidak
ikut menggantung selama data cache masih ada.

## 6. Cara owner mencoba (sesudah gerbang pra-rilis + deploy)

1. Buka Dashboard admin → di bawah kartu "Katalog drama — sumber data" ada kartu **Cache halaman
   penonton** → klik **Segarkan cache** → harus muncul "Beres. Pengunjung berikutnya melihat data terbaru."
2. Ubah judul/sinopsis satu drama di panel admin → Simpan → buka `/drama/<id>` di tab penyamaran
   (incognito) → perubahan harus langsung terlihat, bukan setelah 1 menit.
3. Cek header (terminal):
   `curl -sI https://dramaapp-production-9e88.up.railway.app/api/katalog | grep -i "cache"` →
   harus ada `s-maxage=60` dan `x-nextjs-cache`. Di browser: DevTools → Network → klik baris
   `katalog` → Response Headers.

Ukur "sesudah" dengan perintah yang sama seperti tabel di atas:
`curl -s -o /dev/null -w "%{time_starttransfer}\n" https://dramaapp-production-9e88.up.railway.app/feed/<id>?ep=1`

Rollback: `git revert <commit>` — tanpa SQL/env, aman dibalik kapan saja.
