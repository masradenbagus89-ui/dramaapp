# Migrasi Database → Supabase

DramaApp kini memakai **Supabase (PostgreSQL)** sebagai database produksi,
menggantikan Redis/Vercel KV. Mode lokal tetap pakai file JSON di `data/`
secara otomatis bila env Supabase belum di-set — jadi `npm run dev` tetap jalan.

## Apa yang berubah di kode

| Berkas | Perubahan |
| --- | --- |
| `lib/supabase.ts` | **Baru.** Klien PostgREST minimal (fetch, tanpa dependency). |
| `lib/store.ts` | Backend KV/Redis → Supabase. Semua signature fungsi tetap sama. |
| `lib/dramas.ts` | Sekarang **async** (query Supabase). Tambah `upsertDrama`/`removeDrama`. |
| `app/api/admin/drama/route.ts` | Tak lagi pakai GitHub API; tulis langsung ke DB (update **instan**, tanpa redeploy). |
| 9 call-site drama | Ditambah `await` (page & route jadi async). |
| `supabase_setup.sql` | **Baru.** Skema tabel + fungsi RPC atomik. |
| `scripts/seed-supabase.mjs` | **Baru.** Seed data awal dari `data/*.json`. |

Pemetaan data di Supabase:
- **Tabel relasional**: `dramas`, `likes`, `wallets`, `unlocks`.
- **Dokumen JSON** (tabel `app_data`, key→value): admins, komentar per-drama,
  iklan, meta koin, 2FA, order Midtrans.
- **Atomik** (anti hitungan-hilang): like & saldo koin lewat fungsi Postgres
  (`like_change`, `coin_add`, `coin_spend_unlock`).

## Langkah setup (sekali jalan)

1. **Buat project** di https://supabase.com → New project (catat password DB).
2. **Buat skema**: Dashboard → SQL Editor → New query → paste seluruh isi
   `supabase_setup.sql` → **Run**.
3. **Ambil kredensial**: Project Settings → API → salin:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key (bukan anon) → `SUPABASE_SERVICE_ROLE_KEY`
4. **Set env**:
   - Lokal: tambahkan keduanya ke `.env.local` (lihat `.env.example`).
   - Vercel: Project → Settings → Environment Variables → tambahkan keduanya.
5. **Seed data awal** dari JSON:
   ```
   node scripts/seed-supabase.mjs
   ```
   (Atau biarkan kosong — app auto-seed drama/admin dari `data/*.json` saat
   pertama diakses.)
6. **Deploy** ulang di Vercel. Selesai.

## ⚠️ Penting: data live yang sedang berjalan

`scripts/seed-supabase.mjs` menyeed dari **file `data/*.json`** (baseline),
**bukan** dari data live yang mungkin masih ada di Redis/KV (saldo koin user,
komentar baru, iklan sponsor, secret 2FA admin). Bila produksi lama memang
menyimpan data user di Redis, ekspor data itu dari Redis lebih dulu lalu
masukkan ke Supabase — kalau tidak, data tersebut perlu dibuat ulang
(mis. admin set ulang 2FA, iklan ditambah ulang). Drama & komentar dari
repo aman karena ikut di `data/*.json`.

## Env yang tidak lagi dipakai

`GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_BRANCH` —
dulu untuk menyimpan drama via commit GitHub. Boleh dihapus dari Vercel.
