# docs/glossary.md - Kamus Istilah dramaapp

> Versi 1 · 2026-06-20

<!--
PENGANTAR SINGKAT (baca dulu sebelum edit):

- **Apa ini?** Kamus istilah domain proyek dramaapp. Tempat rujukan tunggal
  untuk vocabulary bisnis + konvensi penamaan kode (dijaga konsisten secara disiplin
  AI/manusia — belum ada robot yang mengecek nama di kode benar-benar cocok dengan kamus ini).
- **Kapan dibaca?** Tiap kali kamu (atau AI) ragu istilah/penamaan. Baca SEBELUM
  bikin tabel DB, route, atau komponen baru.
- **Kapan di-update?** Tiap kenalin istilah domain baru, ubah nama
  tabel/route/komponen, atau ubah alur status objek bisnis. Jangan dibiarkan basi.
- **Hubungan dengan dokumen lain?** Lihat `docs/architecture.md` untuk peta proyek
  keseluruhan. Istilah UMUM (edge case, reuse, least privilege) ada di CLAUDE.md
  global - JANGAN diduplikasi di sini. File ini khusus istilah SPESIFIK proyek.
- **Bahasa:** Bahasa Indonesia, junior-friendly (konsisten dengan CLAUDE.md global).
-->

## Tujuan & Cara Pakai

Glossary ini mencegah salah-paham istilah domain (mis. "user" vs "client" vs "tenant") antar AI, junior dev, dan stakeholder bisnis. Update tiap ada istilah baru atau rename. Baca sekali di awal onboarding, lalu rujuk tiap ragu - identifier kode (variabel, tabel, route, komponen) WAJIB konsisten dengan entri di sini. Lihat juga `docs/architecture.md` untuk peta makro proyek.

## Aturan Penamaan

Default Postgres-style + JS/TS. Sesuaikan kalau pakai DB/bahasa lain (mis. MongoDB biasanya `camelCase`).

- **Tabel DB** - `snake_case` jamak. Contoh: `users`, `invoices`, `invoice_items`.
- **Kolom DB** - `snake_case` tunggal. Contoh: `created_at`, `user_id`, `is_active`.
- **Model / Class** - `PascalCase` tunggal. Contoh: `User`, `Invoice`, `InvoiceItem`.
- **Route HTTP** - `kebab-case` jamak. Contoh: `/api/invoices`, `/api/invoice-items`.
- **Komponen UI** - `PascalCase`. Contoh: `UserCard`, `InvoiceTable`.
- **File kode** - komponen `PascalCase.tsx`, util/route `kebab-case.ts`. [TBD: <sesuaikan stack>].
- **Folder fitur** - `kebab-case` jamak. Contoh: `features/invoices/`, `features/clients/`.
- **Branch git** - `<tipe>/<ringkas>` dengan tipe `feat`, `fix`, `chore`, `docs`, `refactor`. Contoh: `feat/invoice-export`.
- **Variabel boolean** - prefix `is` / `has` / `can`. Contoh: `isActive`, `hasPaid`, `canEdit`.
- **Env var** - `SCREAMING_SNAKE_CASE`. Contoh: `DATABASE_URL`, `SUPABASE_ANON_KEY`.

## Istilah Domain dramaapp

Istilah NYATA yang dipakai kode dramaapp (sumber: `lib/coins.ts`, `lib/wallet.ts`, `lib/auth.ts`, `lib/dramas.ts`, `supabase_setup.sql`). Format: `**istilah** - definisi singkat. *(kode terkait)*`

- **koin (coin)** - mata uang virtual di dalam aplikasi untuk membuka episode berbayar. Didapat dari nonton iklan, check-in harian, atau beli paket. *(kode: konstanta di `lib/coins.ts` — `COIN_PER_EPISODE`=8, `COIN_PACKS`; RPC `coin_add()` di `supabase_setup.sql:87`)*
- **dompet (wallet)** - saldo koin milik 1 penonton, disimpan per email. *(kode: tabel `wallets(email, balance)` di `supabase_setup.sql:55`; `lib/wallet.ts` `fetchWallet()` + tipe `WalletStatus`)*
  - 🏢 Analogi: seperti saldo GoPay/OVO — satu kantong angka yang naik saat top-up dan turun saat dipakai.
- **unlock / buka episode** - aksi membayar `COIN_PER_EPISODE` koin untuk membuka 1 episode terkunci; **idempoten** (kalau sudah terbuka, koin tidak ditarik lagi). *(kode: `lib/wallet.ts` `unlockEpisode()` → route `/api/coins/unlock`; RPC `coin_spend_unlock()` di `supabase_setup.sql:101`)*
- **token unlock** - kode unik penanda 1 episode milik 1 user, formatnya `"<dramaId>:<ep>"` (mis. `"cinta:5"`). Jadi kunci baris di tabel `unlocks`. *(kode: `lib/coins.ts` `unlockToken(dramaId, ep)`; kolom `unlocks.token` di `supabase_setup.sql:63`)*
  - 🏢 Analogi: seperti nomor struk belanja — satu kode mewakili satu transaksi (episode) tertentu.
- **premium** - penanda (flag) bahwa sebuah drama dikenai paywall (butuh koin). Drama tanpa flag ini tetap gratis. *(kode: kolom `dramas.premium` boolean di `supabase_setup.sql:37`; field `Drama.premium`; saklar global `PAYWALL_ENABLED` di `lib/coins.ts:14`)*
- **check-in harian** - klaim bonus koin gratis sekali per hari (`CHECKIN_BONUS`=15). *(kode: `lib/wallet.ts` `claimCheckin()` → route `/api/coins/checkin`; metadata harian disimpan di `app_data` key `coinmeta:<email>`)*
- **reward iklan (rewarded ad)** - koin (`REWARD_PER_AD`=4) yang didapat tiap selesai menonton 1 iklan; dibatasi `DAILY_AD_LIMIT`=12 iklan/hari (anti-curang). *(kode: `lib/wallet.ts` `claimReward()` → route `/api/coins/reward`)*
- **kuota harian (daily limit)** - batas berapa kali sebuah hadiah boleh diklaim per hari, supaya tidak disalahgunakan. Contoh: `DAILY_AD_LIMIT` (iklan) dan check-in (1×/hari). *(kode: konstanta di `lib/coins.ts`)*
  - 🏢 Analogi: seperti limit transfer harian di m-banking BCA — ada plafon yang reset tiap ganti hari.
- **viewer / penonton** - pengguna biasa yang menonton drama. **Tanpa password**: identitas hanya nama + email yang disimpan di browser (localStorage), dipakai sebagai kunci dompet. *(kode: `Role = "viewer"` di `lib/auth.ts:3`; `readUser()`/`writeUser()`)*
  - 🏢 Analogi: seperti isi keranjang Tokopedia yang tersimpan di HP tanpa login penuh — datanya nempel di perangkat, bukan akun ber-password.
- **admin** - pengelola katalog (tambah/ubah/hapus drama, iklan). Berbeda dari viewer karena diverifikasi di server (daftar email + cookie sesi), bukan sekadar klaim dari browser. *(kode: `Role = "admin"` di `lib/auth.ts:3`; `fetchUserRole()` cek ke `/api/admins` → `app_data` key `admins`)*
- **drama** - satu judul serial pendek (punya episode, kategori, poster, sinopsis). *(kode: tabel `dramas` di `supabase_setup.sql:25`; tipe `Drama`; CRUD di `lib/dramas.ts`)*
- **episode** - 1 bagian/babak dari sebuah drama, dinomori mulai 1. Episode 1..`FREE_EPISODES` (3) gratis; sisanya butuh koin. *(kode: kolom `dramas.episodes`; `isFreeEpisode(ep)` + `FREE_EPISODES` di `lib/coins.ts`)*

## Role & Permission

| Role | Bisa apa | Tidak bisa apa |
|------|----------|----------------|
| **viewer** | Nonton drama, buka episode pakai koin, klaim reward iklan/check-in, top-up | Tambah/ubah/hapus drama; kelola iklan & admin |
| **admin** | Semua hak viewer + kelola katalog drama, iklan (`ads`), daftar admin | — |

Catatan: role viewer hanya klaim dari browser (`lib/auth.ts` `readUser()`), TIDAK aman untuk otorisasi. Status admin diverifikasi server-side via `fetchUserRole()` → `/api/admins` + cookie sesi admin. Otorisasi aksi sensitif WAJIB dicek ulang di server, bukan percaya role dari client.

## Status & State Penting

dramaapp tidak punya objek bisnis ber-lifecycle rumit seperti invoice. State terpenting = status sebuah episode bagi 1 penonton:

| Kondisi | Penjelasan |
|---------|------------|
| **gratis** | Nomor episode ≤ `FREE_EPISODES` (3), atau drama bukan `premium`, atau `PAYWALL_ENABLED=false` — langsung bisa ditonton. |
| **terkunci** | Episode premium yang belum dibayar — perlu koin sejumlah `COIN_PER_EPISODE`. |
| **terbuka (unlocked)** | Sudah dibayar; ada baris di tabel `unlocks` dengan `token = "<dramaId>:<ep>"`. Permanen untuk email itu. |

## Singkatan & Jargon Teknis Proyek

Hanya istilah SPESIFIK proyek ini. Istilah umum (RLS, ORM, dll.) sudah ada di CLAUDE.md global.

- **paywall** - "dinding bayar": pembatas yang mengharuskan koin untuk membuka episode premium. Saklarnya `PAYWALL_ENABLED` di `lib/coins.ts`.
- **top-up** - isi ulang koin dengan uang asli (Rupiah) lewat paket (`COIN_PACKS`), diproses via Midtrans/QRIS. *(kode: `lib/wallet.ts` `topup(packId)` → `/api/coins/topup`)*
- **dual-mode** - kode bisa jalan dengan Supabase (produksi) ATAU file JSON lokal (dev), dipilih oleh flag `useSupabase`. Lihat `lib/dramas.ts`.
- **RPC (atomik)** - fungsi di database (mis. `coin_add`, `coin_spend_unlock`, `like_change`) yang mengubah saldo/like dalam 1 langkah aman dari "klik dobel". Lihat `supabase_setup.sql`.

## Istilah yang Mudah Tertukar

Pasangan rancu yang sering bikin bug. Klarifikasi singkat.

- **viewer vs admin** - `viewer` = penonton tanpa password, identitas dari browser saja. `admin` = pengelola, diverifikasi server (daftar email + sesi). Jangan percaya role yang datang dari client untuk aksi admin.
- **gratis vs premium** - `gratis` = episode 1-3 atau drama non-premium. `premium` = flag drama yang mengaktifkan paywall; tetap menyisakan episode awal gratis.
- **koin vs Rupiah** - `koin` = mata uang dalam-app untuk buka episode. `Rupiah` (`priceIDR`) = uang asli untuk beli koin via top-up.
- **wallet vs unlocks** - `wallet` = saldo koin (1 baris per email). `unlocks` = daftar episode yang sudah dibeli (banyak baris per email). Beli episode = saldo wallet turun + 1 baris unlock bertambah.

## 🙂 Untuk non-programmer

Bayangkan dramaapp seperti aplikasi nonton drama pendek (mirip nonton video di aplikasi hiburan). Beberapa episode awal **gratis** seperti cuplikan; episode berikutnya perlu **koin** untuk dibuka. Koin itu seperti **saldo GoPay/OVO khusus di dalam aplikasi** — kamu bisa dapat gratis (nonton iklan, absen harian) atau beli pakai uang asli (top-up). Sekali sebuah episode dibuka, statusnya "terbuka" selamanya untuk emailmu — seperti film yang sudah kamu beli di aplikasi tetap bisa ditonton ulang. **Penonton** cukup pakai nama + email (tanpa password, datanya nempel di HP seperti keranjang belanja yang tersimpan), sedangkan **admin** (pengelola) diperiksa lebih ketat di server karena dia yang bisa menambah/menghapus drama.

## Riwayat Perubahan

| Versi | Tanggal | Author | Ringkasan |
|-------|---------|--------|-----------|
| 1 | 2026-06-20 | tim dramaapp | Inisialisasi template + tambah bagian "Istilah Domain dramaapp" (koin, dompet, unlock, premium, check-in, reward iklan, viewer, admin, episode, drama, kuota harian, token unlock). |
<!-- ISI: tambah baris baru tiap update. -->
