# wallet.md - Ekonomi koin: cara dapat, cara pakai, & atomicity

> Versi 1 · 2026-06-20 · auto-generated (lintasAI)

## Tujuan

Untuk developer yang memelihara fitur monetisasi dramaapp (model ala Melolo/DramaBox: episode awal gratis, sisanya dibuka pakai koin). Berkas ini menjelaskan dari mana koin **didapat**, bagaimana koin **dipakai** untuk membuka episode premium, dan jaminan **atomicity** (semua-berhasil-atau-batal) di dua mode penyimpanan: Supabase (produksi) vs file JSON (dev lokal).

## Cara Pakai

Dari sisi klien (UI) lewat pembungkus di `lib/wallet.ts`:

- `fetchWallet(dramaId)` → status saldo + episode terbuka. Dipakai di `lib/wallet.ts:34`.
- `claimCheckin()` → POST `/api/coins/checkin`. Dipakai di `lib/wallet.ts:80`.
- `claimReward()` → POST `/api/coins/reward` (sesudah selesai nonton iklan). Dipakai di `lib/wallet.ts:77`.
- `unlockEpisode(dramaId, ep)` → POST `/api/coins/unlock`. Dipakai di `lib/wallet.ts:74`.

**Konstanta ekonomi** (`lib/coins.ts`): `CHECKIN_BONUS = 15` (`coins.ts:29`), `REWARD_PER_AD = 4` (`coins.ts:23`), `DAILY_AD_LIMIT = 12` (`coins.ts:26`), `COIN_PER_EPISODE = 8` (`coins.ts:20`), `FREE_EPISODES = 3` (`coins.ts:17`), `PAYWALL_ENABLED = true` (`coins.ts:14`).

## Input / Output

**Cara DAPAT koin:**
- **Check-in harian** (`app/api/coins/checkin/route.ts`): +15 koin, sekali per hari. Kalau `meta.lastCheckin === hari ini` → balas `{ ok:false, already:true }` tanpa nambah (`checkin/route.ts:30-37`). Tanggal pakai `today()` UTC (`checkin/route.ts:9`).
- **Nonton iklan berhadiah** (`app/api/coins/reward/route.ts`): +4 koin per iklan, maksimal **12 iklan/hari**. Kalau `count >= DAILY_AD_LIMIT` → HTTP 429 + `remaining:0` (`reward/route.ts:35-44`). Kuota di-reset tiap ganti tanggal: `count = meta.adDate === d ? meta.adCount : 0` (`reward/route.ts:33`).
- **Top-up** (paket `COIN_PACKS` di `coins.ts:39`) via Midtrans — di luar cakupan berkas ini.

**Cara PAKAI koin** (`app/api/coins/unlock/route.ts`): buka 1 episode terkunci seharga 8 koin.
- Gratis tanpa potong koin bila: user **admin**, drama **bukan premium** (`!drama?.premium`), atau episode ≤ 3 (`isFreeEpisode`) (`unlock/route.ts:39`).
- Selain itu panggil `spendUnlock(email, token, 8)`. Token unlock = `"<dramaId>:<ep>"` dari `unlockToken()` (`coins.ts:55`).
- Saldo kurang → HTTP **402** + `{ needed: 8 }` (`unlock/route.ts:53-62`).

## Dependensi

- `lib/store.ts` — `addCoins`, `getBalance`, `spendUnlock`, `getUnlocks`, `getCoinMeta`, `setCoinMeta`.
- `lib/session.ts` — `resolveUserEmail()` (identitas user).
- `lib/dramas.ts` — `getDrama()` (cek flag `premium`).
- **Env var**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY=***` (kalau ada → mode Supabase; kalau tidak → mode file JSON di `data/wallets.json`). Saklar otomatis lewat `useSupabase` (`store.ts:27`).
- **SQL RPC**: `coin_add`, `coin_spend_unlock` di `supabase_setup.sql:87-125`.

## Catatan

- **Atomicity (anti hitungan hilang):**
  - Mode **Supabase**: penambahan saldo lewat RPC `coin_add` (`store.ts:283`), dan belanja+unlock lewat RPC `coin_spend_unlock` (`store.ts:315`) — keduanya satu operasi Postgres tunggal, jadi 2 request bareng tidak saling menimpa.
  - Mode **file**: `addCoins`/`spendUnlock` pakai **read-modify-write** ke `wallets.json` (`store.ts:285-289`, `store.ts:325-334`). Aman hanya karena dev = proses tunggal; **tidak aman untuk konkurensi banyak proses** (catatan di `store.ts:17-22`).
- **Idempoten:** unlock yang sama 2x tidak menarik koin lagi. Supabase: cek `unlocks` dulu, lalu `INSERT ... ON CONFLICT DO NOTHING` (`supabase_setup.sql:106-124`). File: cek `data.unlocks[e]?.includes(token)` (`store.ts:326`).
- **Saldo tak pernah minus:** `coin_add` pakai `greatest(0, ...)` (`supabase_setup.sql:92-94`); mode file pakai `Math.max(0, ...)` (`store.ts:286`).
- **Saldo kurang:** `spendUnlock` balas `{ ok:false, reason:"insufficient" }`, route ubah jadi HTTP 402 (`store.ts:330`, `unlock/route.ts:53`).
- **Race condition check-in/reward:** update `coinmeta:<email>` masih dokumen baca-tulis biasa (bukan RPC atomik), jadi 2 klaim check-in/reward dalam ~milidetik secara teori bisa lolos kuota — risiko rendah, dampak kecil (bonus dobel).
- **🚨 Catatan keamanan — celah IDOR (Insecure Direct Object Reference = akses pakai ID milik orang lain):** untuk **viewer** (bukan admin), email diambil dari **body request** yang dikirim klien (`session.ts:106-107`), bukan dari sesi tertanda-tangan. Artinya siapa pun bisa mengirim email orang lain untuk menambah/membelanjakan koin atas nama mereka. Admin aman karena emailnya dari cookie HMAC tepercaya (`session.ts:104-105`). Detail & rencana perbaikan: `docs/decisions/2026-06-20-audit-findings.md`.

## 🙂 Untuk non-programmer (bahasa sehari-hari)

Berkas-berkas ini mengatur "dompet koin" di aplikasi drama. User dapat koin dengan **absen harian** (15 koin/hari) atau **nonton iklan** (4 koin per iklan, maksimal 12 iklan sehari), lalu memakai koin itu untuk **membuka episode berbayar** (8 koin per episode; 3 episode pertama selalu gratis).

Analogi seperti **GoPay di Gojek**: saldo bertambah saat top-up/promo dan berkurang saat bayar. Saat di server pusat (Supabase), pengurangan saldo dijamin "rapi" — kalau dua transaksi datang bersamaan, saldo tidak kacau, sama seperti GoPay yang tidak salah hitung walau kamu klik bayar dua kali cepat. Satu hal yang masih lemah: untuk user biasa, aplikasi masih percaya "nama akun" yang dikirim dari HP user, jadi belum sekuat kunci PIN GoPay — ini sudah dicatat sebagai PR keamanan untuk diperbaiki.
