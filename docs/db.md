# db.md — Denah Database dramaapp

> Versi 1 · 2026-06-20 · Sumber: `supabase_setup.sql` (utama), dikonfirmasi `migrasi-schema.sql`.
> Akses app: `lib/supabase.ts` (REST/PostgREST) + `lib/store.ts` (dual-mode).

## Ringkasan

Database = **PostgreSQL di Supabase**, skema `public`. Berisi **5 tabel** + **3 fungsi RPC**
(_RPC = Remote Procedure Call: fungsi di server DB yang dipanggil app lewat REST_).

- **Tabel**: `app_data`, `dramas`, `likes`, `unlocks`, `wallets`.
- **RPC atomik**: `like_change`, `coin_add`, `coin_spend_unlock` (_atomik = sekali jalan
  utuh; tidak ada hitungan yang hilang saat 2 klik bersamaan_).

## Tabel

### `app_data` — gudang dokumen JSON serbaguna (model key→value, seperti KV store)
| Kolom | Tipe | Constraint | Tujuan |
|---|---|---|---|
| `key` | text | **PK** | kunci unik dokumen |
| `value` | jsonb | NOT NULL | isi dokumen (JSON) |

Contoh `key`: `admins`, `comments:<dramaId>`, `ads`, `coinmeta:<email>`,
`twofa:<email>`, `order:<orderId>` (`supabase_setup.sql:14-16`).

### `dramas` — katalog drama (relasional, 1 baris = 1 judul)
| Kolom | Tipe | Constraint |
|---|---|---|
| `id` | text | **PK** |
| `title`, `category` | text | NOT NULL |
| `episodes` | integer | NOT NULL, default 0 |
| `views`, `synopsis`, `gradient` | text | NOT NULL, default `''` |
| `poster_image`, `hero_image` | text | nullable |
| `hero_dim`, `exclusive`, `premium` | boolean | NOT NULL, default false |
| `subtitles` | text[] | NOT NULL, default `{}` |
| `sort_index` | double precision | NOT NULL, default 0 |
| `created_at` | timestamptz | NOT NULL, default `now()` |

**Index**: `dramas_sort_idx` pada `sort_index` (`supabase_setup.sql:42`) — untuk urut beranda.

### `likes` — jumlah like per drama (diubah hanya lewat RPC `like_change`)
| Kolom | Tipe | Constraint |
|---|---|---|
| `drama_id` | text | **PK** |
| `count` | integer | NOT NULL, default 0 |

### `wallets` — saldo koin per penonton (diubah lewat RPC `coin_add` / `coin_spend_unlock`)
| Kolom | Tipe | Constraint |
|---|---|---|
| `email` | text | **PK** |
| `balance` | integer | NOT NULL, default 0 |

### `unlocks` — daftar episode yang sudah dibuka (himpunan email+token)
| Kolom | Tipe | Constraint |
|---|---|---|
| `email` | text | NOT NULL |
| `token` | text | NOT NULL |
| (gabungan) | | **PK (email, token)** |

`token` berformat `"<dramaId>:<ep>"` (`supabase_setup.sql:61`).

## Fungsi RPC

| RPC | Parameter | Mengubah | Atomik? |
|---|---|---|---|
| `like_change` | `p_drama_id text, p_delta int` | `likes.count` (+1/−1, tak < 0); return jumlah baru | Ya — `INSERT ... ON CONFLICT DO UPDATE` |
| `coin_add` | `p_email text, p_delta int` | `wallets.balance` (delta boleh −, tak < 0); return saldo baru | Ya — upsert atomik |
| `coin_spend_unlock` | `p_email text, p_token text, p_cost int` | kurangi `wallets.balance` + INSERT `unlocks`; return `(ok boolean, balance int)` | Ya + **idempoten** (kalau sudah terbuka, koin tak ditarik lagi) |

Detail: `supabase_setup.sql:74-125`. Dipanggil app via `sbRpc(...)`
(`lib/store.ts:170, 283, 316`).

## Hubungan antar tabel

Tidak ada **FK** (foreign key) eksplisit; relasi lewat nilai yang sama:
- `likes.drama_id` ↔ `dramas.id` (per drama).
- `unlocks.token` memuat `dramaId` (per episode dari drama).
- `wallets.email`, `unlocks.email` ↔ **email penonton** (identitas user).
- RPC `coin_spend_unlock` menautkan **wallets** (saldo) ⇄ **unlocks** (akses) dalam 1 transaksi.

## Catatan

- **RLS (Row Level Security — pengaman per-baris) = NONAKTIF.** SQL hanya menyertakan
  perintah `enable RLS` sebagai **komentar/opsional** (`supabase_setup.sql:127-136`).
  App memakai **service role key** yang mem-bypass RLS (`lib/supabase.ts:9-10`).
- **Fallback file JSON**: kalau env Supabase tidak di-set, `useSupabase=false`
  (`lib/supabase.ts:20`) → app baca/tulis file di folder `data/` (`lib/store.ts:49-68`).
  Jadi `npm run dev` jalan tanpa Supabase.
- **Idempoten & aman diulang**: skrip SQL pakai `create ... if not exists` /
  `create or replace`, jadi aman dijalankan berkali-kali.
- **Perbaikan `coin_spend_unlock` belum tentu ter-apply di produksi.** Ada bug
  "column reference \"balance\" is ambiguous" (kode 42702); perbaikannya (alias tabel
  `w.balance`) sudah ada di repo: `scripts/fix_coin_spend_unlock_prod.sql`. **Versi di
  `supabase_setup.sql` sudah memakai alias yang benar**, tapi DB produksi mungkin masih
  pakai versi lama — perlu di-Run manual di SQL Editor produksi untuk memastikan.

---

## 🙂 Untuk non-programmer

Bayangkan database ini seperti **aplikasi Tokopedia** versi mini:
- **`dramas`** = katalog produk (daftar drama yang bisa ditonton).
- **`wallets`** = saldo TokoPay tiap pembeli (di sini namanya "koin").
- **`unlocks`** = riwayat "barang yang sudah dibeli" — episode yang sudah dibuka,
  supaya tidak ditagih dua kali.
- **`likes`** = jumlah jempol per drama; **`app_data`** = laci serbaguna untuk catatan
  lain (admin, komentar, iklan, dll).

**3 fungsi RPC** itu seperti **kasir otomatis**: saat menambah jempol, isi koin, atau
membayar buka episode, kasir mengerjakannya sekali utuh — tidak mungkin "saldo kepotong
tapi episode tidak kebuka". Khusus buka episode, kalau sudah pernah dibeli, koin tidak
ditarik lagi (seperti riwayat pembelian yang mencegah bayar dobel).

**Catatan penting**: ada satu "kasir" (fungsi buka-episode) yang pernah error di server
asli. Perbaikannya sudah disiapkan di file `scripts/fix_coin_spend_unlock_prod.sql`,
tapi belum tentu sudah dipasang di server yang dipakai pengunjung — perlu dicek/dipasang
manual oleh yang punya akses server.
