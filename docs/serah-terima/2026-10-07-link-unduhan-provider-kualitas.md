# 2026-10-07 — Link unduhan Playly per provider × kualitas

Branch: `feat/link-unduhan-provider-kualitas` (6 commit `b48b319..4b7c034`, dasar `d02700b`
= `main` produksi saat ini → bisa digabung **fast-forward**, tak ada bentrok).
Rencana + keputusan owner: `docs/lintasai/rencana/2026-10-05-link-unduhan-provider-kualitas.md`.

> Kenapa lewat serah-terima: push ke repo produksi dari komputer ini ditolak (403) — login
> GitHub-nya akun `yusufscorpio`, yang memang tak punya izin ke `masradenbagus89-ui/dramaapp`.
> Produksi TIDAK berubah. Owner yang merilis.

## 1. Apa yang berubah + kenapa
Tombol DOWNLOAD video Playly di produksi masih memunculkan pesan "belum tersedia" — belum ada
tempat menyimpan link unduhan. Sekarang tombol itu membuka popup **tabel provider × tombol per
kualitas** (Google Drive · Telegram · Cast · Mega × 1080p · 480p). Video yang belum diisi
link menampilkan "Link unduhan belum tersedia".

Link bisa diisi lewat 3 jalan: kotak isian di `/admin/videos/playly`, impor massal CSV
(`npm run impor:unduhan -- <berkas.csv> --dry-run`), atau webhook `POST /api/webhooks/playly`
(field `downloads` opsional). Semua jalan memakai aturan yang sama: wajib `https` + domain
persis milik provider-nya. Link Cast selalu ditolak selama `PLAYLY_UNDUHAN_DOMAIN_CAST` kosong
— **owner memutuskan Cast tidak dipakai**, jadi itu perilaku yang diinginkan.

Celah ikut ditutup: halaman `/tonton/[id]` dulu tidak mengoper link ke popup, jadi tombol
DOWNLOAD di halaman itu mati.

## 2. Berkas yang disentuh
36 berkas (`git diff --stat d02700b..feat/link-unduhan-provider-kualitas`). Inti:
- `lib/playly-unduhan.ts`, `lib/playly-unduhan-domain.ts`, `lib/playly-unduhan-impor.ts` — data + validasi + impor
- `lib/store.ts` — baca/tulis dokumen `app_data` baru `playly:link-unduhan`
- `lib/playly-webhook.ts`, `app/api/webhooks/playly/route.ts` — field `downloads`
- `app/api/admin/playly/unduhan/route.ts`, `app/components/admin/PlaylyUnduhanManager.tsx`, `app/admin/videos/playly/page.tsx` — panel admin
- `app/components/player/ModalProviderPlayly.tsx`, `app/components/player/InfoVideoPlayly.tsx` — popup
- `scripts/impor-link-unduhan.ts`, `scripts/contoh-link-unduhan.csv`, `package.json` (+ devDependency `jiti`, hanya untuk skrip — tidak masuk ke situs)

Halaman yang ikut terpengaruh: `/tonton/[id]` dan `/film` (lewat `PlaylyVideoGrid`), serta
hasil Playly di beranda (`HasilPlayly`, `KartuVideo`). Semuanya tercakup tes di bawah.

## 3. Butuh SQL migrasi?
**Tidak.** Data disimpan di tabel `app_data` yang sudah ada. `supabase_migrations/2026-10-05_playly_link_unduhan.sql`
hanya jalur naik kelas untuk nanti — **jangan dijalankan sekarang**.

## 4. Butuh env baru di Vercel?
**Tidak.** Env yang dirujuk kode baru (`PLAYLY_API_URL`, `PLAYLY_EMBED_HOSTS`,
`PLAYLY_WEBHOOK_SECRET`, `SUPABASE_URL`) sudah dipakai produksi. `PLAYLY_UNDUHAN_DOMAIN_*`
opsional (menambah domain di luar bawaan); kosong = aman. Cast tidak dipakai → biarkan kosong.

## 5. Bukti (dijalankan 2026-10-06, urutan gerbang aturan 6)
- `rm -rf .next` → folder hilang
- `npm run build` → exit 0
- `npx tsc --noEmit` → exit 0 (0 error)
- `npm test` → **1338 lulus / 90 berkas**
- Berkas env/kunci di diff → hanya `.env.example` (template, nilai kosong); pola rahasia → nihil
- `d02700b` ancestor dari branch → fast-forward ke produksi aman

**Belum diuji:** tampilan di browser sungguhan / HP (tes memakai jsdom) dan unduhan nyata.

## 6. Cara owner mencoba
Rilis (dari komputer owner, login GitHub `masradenbagus89-ui`):
```
git fetch dramaku
git checkout main && git merge --ff-only dramaku/feat/link-unduhan-provider-kualitas
# gerbang aturan 6: rm -rf .next → npm run build → npx tsc --noEmit → npm test
git push origin main      # di komputer owner: origin = PRODUKSI
git push dramaku main
```
Sesudah Vercel selesai deploy:
1. Buka `/admin/videos/playly` → pilih satu video → isi kotak **Telegram 480p** dengan link
   `https://t.me/...` asli → simpan.
2. Buka video itu di situs → klik **DOWNLOAD**.
3. Harus muncul popup tabel dengan baris **Telegram** dan tombol **480p** yang membuka link tadi.
   Video lain yang belum diisi menampilkan "Link unduhan belum tersedia" — itu benar, bukan bug.
