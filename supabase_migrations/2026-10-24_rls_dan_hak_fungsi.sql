-- Migrasi KEAMANAN: nyalakan RLS di seluruh tabel dramaapp + cabut hak EXECUTE
-- fungsi dari PUBLIC. Hasil audit keamanan 2026-10-24 (temuan TINGGI T-2/T-3).
--
-- ⚠️ SCHEMA `dramaapp`, BUKAN `public` (lib/supabase.ts SUPABASE_SCHEMA).
--
-- ========================= KENAPA =========================
-- Keadaan sebelum migrasi ini, DIVERIFIKASI langsung dari database 2026-10-24
-- (bukan dibaca dari berkas migrasi lama):
--   * RLS MATI di kelima tabel (app_data, wallets, unlocks, likes, dramas)
--   * NOL policy
--   * Hak TABEL untuk anon/authenticated/PUBLIC: sudah KOSONG (revoke lama
--     memang berhasil — catatan HANDOFF.md:6160-6161 terbukti BENAR)
--   * anon & authenticated TIDAK punya USAGE ke schema dramaapp
--   * TAPI ketiga fungsi (`coin_add`, `coin_spend_unlock`, `like_change`)
--     BISA dijalankan anon DAN authenticated — karena Postgres memberi EXECUTE
--     ke PUBLIC secara BAWAAN untuk fungsi baru, dan skrip perbaikan izin
--     terdahulu (scripts/perbaiki_izin_dramaapp.py:83) hanya mencabut hak
--     TABEL, tidak hak FUNGSI.
--
-- Jadi yang menahan semuanya hari ini cuma SATU hal: gerbang USAGE schema yang
-- tertutup. Itu pertahanan SELAPIS. Tiga kejadian biasa membukanya tanpa
-- peringatan apa pun: seseorang menjalankan `grant usage on schema dramaapp to
-- anon` (pola copy-paste paling umum di tutorial Supabase), tabel baru dibuat
-- lalu di-grant ikut-ikutan, atau pengelola project bersama menyetel ulang izin.
-- Begitu gerbang itu terbuka, `coin_add` bisa dipanggil siapa pun untuk
-- mencetak koin ke email mana pun. Migrasi ini mengubahnya jadi DUA lapis.
--
-- ⚠️ Database ini DIPAKAI BERSAMA banyak project lain (terlihat schema
-- mappingplan, bigseo, novelaksara, footballbot + belasan user `creative_*`).
-- SELURUH perintah di bawah hanya menyentuh objek di schema `dramaapp` yang
-- dimiliki role `creative_raden`. NOL objek milik tim lain tersentuh.
--
-- ================= KENAPA NOL POLICY (disengaja) =================
-- Rak `supabase-prisma` §1 menyarankan "tulis policy segera setelah enable",
-- karena RLS nyala tanpa policy = tolak-total. Di sini tolak-total JUSTRU yang
-- diinginkan, dan ini mengikuti pola yang sudah diputuskan project di
-- supabase_migrations/2026-10-05_playly_link_unduhan.sql:37-42.
--
-- Alasannya terbukti dari database, bukan dari dokumentasi: role `service_role`
-- punya atribut `rolbypassrls = true` (diperiksa 2026-10-24 di pg_roles), dan
-- aplikasi mengakses database HANYA lewat service_role (lib/supabase.ts:16-17).
-- Browser tidak pernah menyentuh tabel ini langsung. Jadi tolak-total mengenai
-- anon/authenticated saja — bukan aplikasi.
--
-- ================= AMAN DIJALANKAN ULANG =================
-- Semua perintah idempoten: `enable row level security` pada tabel yang sudah
-- menyala tidak error, REVOKE/GRANT yang sudah sesuai juga tidak.
--
-- ================= CARA MENJALANKAN =================
--   python scripts/jalankan_sql_dramaapp.py supabase_migrations/2026-10-24_rls_dan_hak_fungsi.sql
--     (tanpa --jalankan = SIMULASI, otomatis rollback; tambah --jalankan untuk menyimpan)
--   atau Supabase Dashboard -> SQL Editor -> tempel isi berkas ini -> Run
--
-- ================= ROLLBACK (1 blok, tempel apa adanya) =================
--   alter table dramaapp.app_data disable row level security;
--   alter table dramaapp.wallets  disable row level security;
--   alter table dramaapp.unlocks  disable row level security;
--   alter table dramaapp.likes    disable row level security;
--   alter table dramaapp.dramas   disable row level security;
--   grant execute on function dramaapp.coin_add(p_email text, p_delta integer) to public;
--   grant execute on function dramaapp.coin_spend_unlock(p_email text, p_token text, p_cost integer) to public;
--   grant execute on function dramaapp.like_change(p_drama_id text, p_delta integer) to public;
-- =========================================================================

-- ---------------------------------------------------------------------------
-- 1. RLS: lapis kedua di tingkat BARIS untuk kelima tabel.
--
-- `dramas` ikut dinyalakan walau isinya katalog publik (bukan data pribadi):
-- katalog dibaca penonton lewat halaman yang dirender server, bukan oleh
-- browser langsung ke database. Menyamakan kelimanya juga membuat "tabel mana
-- yang RLS-nya nyala" berhenti jadi pertanyaan — semuanya nyala.
-- ---------------------------------------------------------------------------
alter table dramaapp.app_data enable row level security;
alter table dramaapp.wallets  enable row level security;
alter table dramaapp.unlocks  enable row level security;
alter table dramaapp.likes    enable row level security;
alter table dramaapp.dramas   enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Hak EXECUTE fungsi: cabut dari PUBLIC, PASTIKAN service_role tetap boleh.
--
-- ⚠️ URUTAN & PASANGAN GRANT-nya WAJIB, jangan dipisah. `rolbypassrls` pada
-- service_role hanya melewati RLS — ia TIDAK melewati izin fungsi. Mencabut
-- dari PUBLIC tanpa memberi EXECUTE ke service_role akan MEMATIKAN fitur koin
-- (check-in, hadiah iklan, top-up, buka episode) dan tombol like, karena
-- aplikasi memanggil ketiganya lewat PostgREST sebagai service_role
-- (lib/supabase.ts:290 `sbRpc`).
--
-- anon & authenticated ikut disebut eksplisit walau hari ini hak mereka datang
-- lewat PUBLIC saja: kalau nanti ada yang memberi grant langsung ke salah satu
-- role itu, baris ini yang mencabutnya.
-- ---------------------------------------------------------------------------
revoke all on function dramaapp.coin_add(p_email text, p_delta integer)
  from public, anon, authenticated;
revoke all on function dramaapp.coin_spend_unlock(p_email text, p_token text, p_cost integer)
  from public, anon, authenticated;
revoke all on function dramaapp.like_change(p_drama_id text, p_delta integer)
  from public, anon, authenticated;

grant execute on function dramaapp.coin_add(p_email text, p_delta integer)
  to service_role;
grant execute on function dramaapp.coin_spend_unlock(p_email text, p_token text, p_cost integer)
  to service_role;
grant execute on function dramaapp.like_change(p_drama_id text, p_delta integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- 3. BATAS JUJUR — fungsi BARU akan kembali bisa dijalankan PUBLIC.
--
-- Rencana awal migrasi ini memuat baris:
--     alter default privileges in schema dramaapp revoke execute on functions from public;
-- Baris itu DIBUANG karena DIUJI dan terbukti NOL EFEK (2026-10-24, di dalam
-- transaksi yang dibatalkan):
--   * sesudah dijalankan, nol entri muncul di `pg_default_acl`
--   * fungsi yang baru dibuat TETAP terbaca `has_function_privilege('anon', ...)
--     = true`
--   * mekanismenya sendiri hidup — `alter default privileges ... GRANT execute
--     ... to service_role` MEMANG terekam. Jadi yang tidak bisa spesifik:
--     mencabut hak bawaan PUBLIC lewat default privileges.
--
-- Artinya perbaikan bagian 2 di atas berlaku untuk KETIGA fungsi yang ada
-- SEKARANG, dan fungsi ke-4 nanti akan lahir dengan PUBLIC boleh EXECUTE lagi.
--
-- Penggantinya BUKAN ingatan manusia, tapi perintah yang bisa dijalankan:
--     python scripts/cek_rls_dramaapp.py
-- Ia membaca keadaan nyata (RLS per tabel, siapa boleh EXECUTE tiap fungsi,
-- hak anon/authenticated, USAGE schema) dan BERHENTI dengan status gagal kalau
-- ada yang longgar. Jalankan sesudah menambah fungsi/tabel baru di schema ini.
--
-- Jadi: siapa pun yang membuat fungsi baru di `dramaapp` wajib menambahkan
--     revoke all on function dramaapp.<nama>(<argumen>) from public, anon, authenticated;
--     grant execute on function dramaapp.<nama>(<argumen>) to service_role;
-- di migrasi yang sama. Pasangan GRANT-nya jangan lupa — tanpa itu fiturnya mati.
-- ---------------------------------------------------------------------------
