# docs/architecture.md - Peta Proyek `dramaapp`
> Versi 2 · `2026-06-20`

## Pengantar
File ini adalah **peta proyek 1-halaman**. Dibaca sekali di awal sesi (oleh AI atau dev baru) untuk paham struktur tanpa harus jelajah repo. Update **tiap kali** ada perubahan signifikan: tambah modul, ganti stack, ubah ENV, atau ubah konvensi. Bukan dokumentasi mendalam - detail teknis tetap di file `.md` masing-masing fitur di folder `docs/`.

Semua dokumentasi proyek ditulis dalam **Bahasa Indonesia** (konsisten dengan `CLAUDE.md` global). File ini = peta makro proyek; kamus istilah ada di `docs/glossary.md`; registry semua `.md` pendamping (auto-maintained AI) ada di `docs/architecture_auto.md`.

---

## Tujuan Proyek
Aplikasi **streaming "drama pendek"** (drama Asia episodik) gratis untuk penonton di HP & web (live: `https://dramaapp.vercel.app`). Penonton bisa menonton episode, menyukai/menyimpan drama, dan mengumpulkan **koin** (dari check-in harian + menonton iklan) untuk **membuka episode premium**. Admin/owner mengunggah katalog drama + episode video lewat panel `/admin`. Target user: penonton umum (login **tanpa password** by design) + 1 admin pengelola konten.

---

## Stack
- **Bahasa utama**: TypeScript 5
- **Framework**: Next.js 16.2.4 (App Router) + React 19.2.4
- **Runtime / Build**: Node (Vercel serverless) — `next dev` (lokal) / `next build` (produksi)
- **UI / Styling**: Tailwind CSS 4 (`@tailwindcss/postcss`) — **tanpa shadcn/ui**
- **DB**: Supabase (PostgreSQL). Aksesnya lewat REST buatan sendiri di `lib/supabase.ts` (TIDAK pakai paket `@supabase/supabase-js`). Ada **fallback file JSON lokal** (folder `data/`) saat env Supabase kosong (mode dev) — lihat `lib/store.ts`.

---

## Struktur Folder
```text
dramaapp/
├── app/                 // halaman + UI (Next.js App Router)
│   ├── api/<resource>/route.ts   // 24 endpoint (auth, coins, admin, ads, comments, dll)
│   ├── components/      // komponen UI (player, kartu drama, nav, dll)
│   ├── layout.tsx       // root layout + metadata global
│   └── <halaman>/page.tsx        // beranda, discover, drama, feed, profile, admin, dll
├── lib/                 // logika inti (auth, koin, dompet, data, pembayaran)
├── docs/                // dokumentasi (peta ini + catatan per-fitur)
├── scripts/             // skrip QA + perbaikan (Python/SQL)
├── public/              // aset statis (favicon, ikon, ads.txt)
├── .github/             // workflow robot tim (review, backup, secret-guard)
├── .claude-kit/         // kit aturan tim lintasAI (read-only)
├── *.sql                // skema & migrasi DB (supabase_setup.sql, migrasi-*.sql)
└── package.json
```
> Catatan: TIDAK ada folder `prisma/` (skema DB berupa file `.sql` mentah) maupun `tests/` (belum ada tes otomatis — lihat audit).

---

## Entry Points
- **App utama**: `app/layout.tsx` (root layout Next.js App Router + metadata global)
- **Halaman pertama**: `app/page.tsx` (landing `/`) dan `app/beranda/page.tsx` (beranda konten)
- **Panel admin**: `app/admin/page.tsx`
- **Background worker / cron**: tidak ada di app. Backup DB terjadwal via `.github/workflows/backup-schemas.yml` (perlu dikonfigurasi — lihat audit).

---

## Modul Inti
| Modul | Lokasi | Tujuan | Dependensi Utama |
|---|---|---|---|
| Halaman & komponen UI | `app/`, `app/components/` | Tampilan penonton + panel admin | React 19, Tailwind |
| Endpoint API | `app/api/<resource>/route.ts` | 24 pintu data: auth, coins, admin, ads, comments, likes, dramas, download, subtitle | `lib/*` |
| Auth & sesi | `lib/auth.ts`, `lib/session.ts`, `lib/totp.ts` | Login admin (password + 2FA TOTP) + cookie sesi bertanda-tangan (HMAC). Penonton tanpa password. | `crypto` (Node) |
| Ekonomi koin | `lib/coins.ts`, `lib/wallet.ts` | Dapat koin (iklan/check-in), pakai koin (buka episode), aturan kuota harian | `lib/store.ts` |
| Lapisan data | `lib/store.ts`, `lib/supabase.ts`, `lib/dramas.ts` | Baca/tulis data ke Supabase ATAU file JSON (fallback) | `fetch` REST |
| Pembayaran | `lib/midtrans.ts` | Top-up koin via Midtrans Snap (saat ini belum aktif → balas 501) | env Midtrans |

---

## Dependensi Utama
- **`next` 16.2.4** - framework full-stack (halaman + API route + serverless di Vercel).
- **`react` / `react-dom` 19.2.4** - pustaka UI.
- **`tailwindcss` 4** (+ `@tailwindcss/postcss`) - styling berbasis utility class.
- **`typescript` 5** - tipe statis.
- Catatan: akses Supabase & TOTP 2FA **ditulis manual** pakai `fetch` + modul `crypto` bawaan Node (tidak ada paket pihak-ketiga untuk keduanya).

---

## Environment Variables
**Loader**: `.env.local` (dev) → dashboard Vercel (prod). Template: `.env.example` di root. (Nilai asli JANGAN ditulis di sini / di-commit.)

| Nama | Wajib? | Tujuan | Contoh Format |
|---|---|---|---|
| `SUPABASE_URL` | ya (prod) | URL project Supabase | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ya (prod) | **Kunci rahasia** server-side ke DB. Jangan diekspos ke client. | `eyJhbGciOi...` |
| `ADMIN_PASSWORD` | ya | Password login admin | `***` |
| `AUTH_SECRET` | ya | Kunci penanda-tangan cookie sesi (min 32 karakter) | `***` |
| `NEXT_PUBLIC_VIDEO_BASE_URL` | ya | Alamat tunnel video dari PC backup | `https://xxx.trycloudflare.com` |
| `HARDLINK_AGENT_SECRET` | ya | Kunci agen hardlink admin | `***` |
| `MIDTRANS_SERVER_KEY` / `MIDTRANS_CLIENT_KEY` / `MIDTRANS_IS_PRODUCTION` | tidak | Pembayaran top-up (kosong = top-up balas 501) | `***` / `false` |
| `ENABLE_DEMO_TOPUP` | tidak | Izinkan top-up "demo" tanpa uang (uji) | `1` |
| `NEXT_PUBLIC_ADSENSE_CLIENT` / `_SLOT` | tidak | Iklan AdSense | `ca-pub-...` |
| `NEXT_PUBLIC_AD_BANNER_HTML` | tidak | Tempel kode banner Adsterra/Monetag (menimpa AdSense) | `<script>...` |

---

## Skrip & Perintah
- `npm run dev` - server dev (hot reload) di port 3000
- `npm run build` - build production
- `npm run start` - jalankan hasil build
- ⚠️ **Belum ada** `npm run test` maupun `npm run lint` (tidak ada framework tes/lint di `package.json`) — lihat `docs/decisions/2026-06-20-audit-findings.md`.
- **SQL**: jalankan `supabase_setup.sql` / `migrasi-schema.sql` / `migrasi-full.sql` di Supabase SQL editor. Perbaikan RPC produksi: `scripts/fix_coin_spend_unlock_prod.sql`.

---

## Sumber Data Eksternal
- **Database utama**: Supabase Postgres — prod ref `iicrzdnmcpontfytfypi` (schema `public`), staging ref `nvblmpkwyzbpdbshyvzw` (schema `dramaapp`). Fallback: file JSON di `data/` saat env kosong. Detail: `docs/db.md`.
- **Video**: di-serve dari **tunnel PC backup** (`NEXT_PUBLIC_VIDEO_BASE_URL`, Cloudflare trycloudflare).
- **Pembayaran**: Midtrans (Snap) — **belum aktif** (balas 501 sampai key dipasang).
- **Iklan**: Google AdSense atau Adsterra/Monetag (opsional, via env).

---

## Deploy & CI
- **Hosting**: Vercel (app) + Supabase (DB). Live: `https://dramaapp.vercel.app`.
- **Branch auto-deploy**: `main` → production (merge ke main = langsung deploy).
- **CI / robot**: `.github/workflows/` — `ai-review.yml` (butuh secret `ANTHROPIC_API_KEY`), `backup-schemas.yml` (butuh `DATABASE_URL_BACKUP` + nama schema benar), `secret-guard.yml`, `audit-access.yml`.
- **Rollback**: `git revert HEAD && git push` (Vercel auto-redeploy 2-5 menit) atau Vercel dashboard → Promote previous.

---

## Deployment & Release Strategy

### Alur Deploy
```
branch (feat/*, fix/*)
  → PR di GitHub
  → Vercel Preview Deploy (auto, ~1-3 menit)
  → Review (owner + AI Reviewer bot)
  → Squash Merge ke main
  → Vercel Production Deploy (auto, ~2-5 menit)
```
`main` = production. Tidak ada manual "promote to production" - merge ke main = langsung deploy.

### Risk Level Strategy (Default - Staging-Only)
Default workflow tim TIDAK pakai feature flag. Tiap task diklasifikasi by Risk Level:
- **🟢 Low**: UI minor, copy edit, refactor internal - review cepat, merge, deploy.
- **🟡 Medium**: Fitur baru self-contained - test extensive di Vercel preview sebelum merge.
- **🔴 High**: Sentuh auth/billing/schema-user-visible/destruktif/eksperimental - owner HOLD MERGE sampai yakin, smoke test prod 5+ menit setelah deploy.

Decision tree lengkap: `./.claude-kit/templates/CLAUDE_TEAM_GUIDE.md` section 7b.

### Rollback Strategy
Target time-to-rollback **<5 menit** via git revert:
```
git revert HEAD && git push
```
Vercel auto-deploy versi sebelumnya 2-5 menit.

### Database Backup
- Supabase Daily Auto-Backup: cek Dashboard → Database → Backups (retention sesuai paket).
- Workflow `backup-schemas.yml` (ke Supabase Storage) **masih pakai nama schema contoh** — perlu dikonfigurasi ke `public` dulu (lihat audit) agar backup benar-benar jalan.
- Snapshot manual WAJIB sebelum approve PR yang sentuh migrasi SQL.

---

## Testing & Quality Gates
- **Framework test**: **BELUM ADA** (tidak ada `test` di `package.json`) — temuan audit GENTING.
- **Coverage minimum**: 0% (belum ada tes). Prioritas pasang tes untuk `lib/auth.ts`, `session.ts`, `totp.ts`, `wallet.ts`, `coins.ts`.
- **Lint / format**: belum ada ESLint/Prettier aktif.
- **Pre-push check**: belum ada.

---

## Konvensi Penting
- **Dokumentasi Bahasa Indonesia** (ikut `CLAUDE.md` global).
- **Commit**: Conventional Commits (`feat:`, `fix:`, `refactor:`) + pesan jelas untuk programmer & non-programmer.
- **Akses data lewat lapisan `lib/`** (`store.ts`/`supabase.ts`/`dramas.ts`), bukan query langsung dari route handler.
- **Identitas admin diverifikasi server-side** (cookie sesi bertanda-tangan HMAC). Untuk aksi admin, JANGAN percaya email/identitas dari body request.
- Halaman publik saat ini pakai `force-dynamic` (ada peluang pakai ISR — lihat audit, sudut Kecepatan).

---

## Dokumen Terkait
File lain di folder `docs/` yang melengkapi INDEX ini:

| File | Fungsi |
|---|---|
| `glossary.md` | Kamus istilah domain (koin, unlock, premium, check-in, viewer/admin) |
| `db.md` | Denah database: 5 tabel + 3 fungsi RPC + hubungan |
| `auth.md` | Login admin (password + 2FA) + sesi + penonton tanpa password |
| `wallet.md` | Ekonomi koin: dapat (iklan/check-in) & pakai (buka episode) |
| `payments.md` | Top-up koin via Midtrans Snap + webhook |
| `data-layer.md` | Lapisan data: Supabase + fallback file JSON |
| `decisions/2026-06-20-audit-findings.md` | Hasil audit 11 sudut (73 temuan) + rencana pengerjaan |

> Aturan dokumentasi: tiap fitur/modul baru wajib punya `.md` pendamping (lihat `CLAUDE.md` global section 7).

---

## Riwayat Perubahan
| Versi | Tanggal | Author | Ringkasan |
|---|---|---|---|
| 1 | `2026-06-20` | `setup` | Inisialisasi architecture.md (template) |
| 2 | `2026-06-20` | `lintasAI` | Isi peta dari struktur nyata (semua `[TBD]` diganti) saat setup lintasAI |
