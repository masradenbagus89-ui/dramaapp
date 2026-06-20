# data-layer.md - Lapisan akses data dramaapp (Supabase REST atau file JSON lokal)
> Versi 1 · 2026-06-20 · auto-generated (lintasAI)

## Tujuan
Untuk developer yang menyentuh penyimpanan data dramaapp. Semua baca/tulis data (drama, komentar, like, koin, iklan, 2FA, order) lewat 3 berkas: `lib/supabase.ts` (klien REST tipis), `lib/store.ts` (admin/komentar/like/koin/iklan), `lib/dramas.ts` (katalog drama). Masalah yang dipecahkan: 1 kode bisa jalan **dengan Supabase** (produksi) **atau dengan file JSON lokal** (dev tanpa setup DB).

## Cara Pakai
- **Saklar mode** = konstanta `useSupabase` (`lib/supabase.ts:20`), `true` kalau env `SUPABASE_URL` **dan** `SUPABASE_SERVICE_ROLE_KEY` (atau `SUPABASE_KEY`) terisi. Kalau salah satu kosong -> `false` -> semua fungsi fallback baca/tulis file di folder `data/`.
- Contoh baca katalog: `const dramas = await getAllDramas()` (`lib/dramas.ts:117`). Dipakai di halaman beranda/discover/detail.
- Contoh tulis dokumen JSON: `await sbDocSet("ads", ads)` -> upsert ke tabel `app_data` (`lib/store.ts:78-80`).
- Contoh RPC atomik: `await changeLike(dramaId, "like")` -> panggil fungsi Postgres `like_change` (`lib/store.ts:170`).

## Input / Output
**`lib/supabase.ts`** (klien PostgREST minimal, hanya pakai `fetch`):
- `sbSelect<T>(query)` -> `T[]`. `query` = path PostgREST, mis. `"dramas?id=eq.foo&select=*"` (`:44`).
- `sbUpsert(table, rows, conflict)` -> insert/merge; header `Prefer: resolution=merge-duplicates` (`:54-71`).
- `sbDelete(table, filter)`; `eq(value)` -> string filter `"eq.<encoded>"` (`:39`).
- `sbRpc<T>(fn, args)` -> POST ke `/rest/v1/rpc/<fn>`, kembalikan JSON apa adanya (`:84`).
- Semua header dibuat `baseHeaders()`: `apikey` + `Authorization: Bearer <key>` pakai **service_role** (`:22-29`).
- Error: `ensureOk` lempar `Error` kalau status bukan 2xx, isinya status + body respons (`:31-36`).

**`lib/store.ts`** & **`lib/dramas.ts`**: tiap fungsi `if (useSupabase) { ...REST... } else { ...file... }`. Side effect = tulis tabel Supabase atau tulis file `data/*.json`. Error REST naik dari `ensureOk`; mode file menelan error parse JSON dan kembalikan fallback (`lib/store.ts:54-62`).

## Dependensi
- Env var (dibaca di `lib/supabase.ts:13-17`): `SUPABASE_URL` (atau `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY=***` (atau `SUPABASE_KEY=***`).
- Modul Node bawaan: `node:fs`, `node:path` (akses file lokal).
- Skema DB + fungsi RPC: `supabase_setup.sql`. Tipe `Drama` dari `lib/types.ts`.
- Tabel Supabase: `dramas` (relasional), `app_data` (key->value jsonb), `likes`, `wallets`, `unlocks`.

## Catatan
- **Pola "Supabase ATAU file JSON"**: 1 sumber kebenaran saklar (`useSupabase`). Folder `data/` ikut ke deploy (read-only di Vercel), jadi dipakai sebagai **seed awal**: `sbDocGetOrSeed` & `seedDramasIfEmpty` mengisi DB sekali dari file kalau tabel masih kosong (`lib/store.ts:86-96`, `lib/dramas.ts:100-114`). Seed drama dijaga flag proses `seedChecked` (sekali per proses, `lib/dramas.ts:99`).
- **Tabel `app_data` = penyimpan dokumen JSON** (1 kolom `key`, 1 kolom `value` jsonb). Key berpola: `"admins"`, `"comments:<dramaId>"`, `"ads"`, `"coinmeta:<email>"`, `"twofa:<email>"`, `"order:<orderId>"` (`lib/store.ts:10-12`). Helper `sbDocGet`/`sbDocSet` (`:71-80`).
- **Kenapa ada fungsi RPC (Remote Procedure Call = fungsi yang jalan di dalam Postgres):** untuk operasi yang harus **atomik** (semua-atau-tidak, tak ada hitungan hilang). `like_change`, `coin_add`, `coin_spend_unlock` mengubah counter di satu langkah server, jadi 2 permintaan barengan tak saling menimpa. `coin_spend_unlock` juga **idempoten** (kalau episode sudah terbuka, koin tak ditarik lagi; `lib/store.ts:308-323`).
- **CRUD drama** (`lib/dramas.ts`): baca `getAllDramas`/`getDrama` (kini async karena bisa query DB); tulis `upsertDrama` (jaga `sort_index` lama kalau sudah ada, `:160-176`), `writeAllDramas` (upsert semua + hapus yang tak ada lagi, `:140-157`), `removeDrama`. Pemetaan kolom snake_case DB <-> camelCase `Drama` via `rowToDrama`/`dramaToRow` (`:46-83`).
- **EDGE CASE - race condition dokumen JSON** (read-modify-write tanpa transaksi): `addComment` baca lalu tulis ulang seluruh array komentar (`lib/store.ts:215-221`); `incrementAdStat`/`saveAds` juga (`:480-489`). Dua tulisan ke **key yang sama** dalam ~ms bisa saling menimpa -> 1 komentar/klik hilang. Lihat audit temuan **[14]** (`docs/decisions/2026-06-20-audit-findings.md`). Counter yang aman (like/koin) memang sengaja dipisah ke RPC, bukan dokumen.
- **EDGE CASE - N+1 saat `writeAllDramas`**: hapus drama yang tak ada lagi dilakukan satu per satu dalam loop `for` (1 HTTP DELETE per drama, `lib/dramas.ts:151-152`) karena PostgREST tak punya batch DELETE pakai `IN`. Hapus 29 drama = 29 round-trip = lambat. Lihat audit temuan **[13]**.
- **KEAMANAN**: `SERVICE_ROLE_KEY` mem-bypass RLS (Row Level Security = aturan baris per-user di DB) dan **hanya** boleh dipakai server-side, jangan pernah dikirim ke browser (`lib/supabase.ts:9-10`). Semua `fetch` pakai `cache: "no-store"` supaya data selalu segar.

## 🙂 Untuk non-programmer (bahasa sehari-hari)
Tiga berkas ini adalah **gudang data** aplikasi: tempat menyimpan daftar drama, komentar, jumlah like, saldo koin, dan iklan. Pintarnya, gudang ini punya **2 mode otomatis**: kalau server database "Supabase" sudah dicolok (lewat kunci rahasia di pengaturan), aplikasi pakai itu; kalau belum (saat ngoprek di laptop sendiri), aplikasi diam-diam pakai file biasa di folder `data/` supaya tetap jalan. Untuk hitungan yang rawan rebutan (like, saldo koin), aplikasi pakai "petugas khusus di dalam database" (fungsi RPC) yang menjamin tak ada hitungan yang hilang walau banyak orang klik bersamaan.

Analogi: seperti **fitur stok di Tokopedia**. Saat 2 pembeli klik "Beli" di detik yang sama untuk barang stok 1, sistem harus memastikan stok tidak jadi minus - itulah gunanya "petugas khusus" (RPC) untuk koin & like. Tapi dua bagian (komentar & iklan) masih pakai cara lama "ambil catatan, tulis ulang semua" - kalau 2 orang komentar pas bersamaan, salah satu komentar bisa hilang (catatan audit nomor [14]). Lalu saat admin upload daftar drama baru sekaligus, menghapus drama lama dilakukan satu-satu seperti kurir bolak-balik 29 kali padahal bisa sekali angkut - itu bikin lambat (catatan audit nomor [13]).
