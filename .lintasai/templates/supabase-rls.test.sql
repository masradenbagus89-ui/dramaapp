-- templates/supabase-rls.test.sql — kerangka tes policy RLS otomatis (pgTAP).
-- Salin ke supabase/tests/rls.test.sql lalu sesuaikan nama tabel/kolom. Jalankan: `supabase test db`.
-- Tujuan: buktikan RLS BENAR-BENAR menolak akses lintas-penyewa (bukan cuma "ON") — penjaga #1
-- kebocoran data multi-penyewa. Ganti <tabel>, <kolom_pemilik>, <user-A>, <user-B> sesuai project.

BEGIN;
-- Muat pgTAP + tetapkan jumlah assert yang diharapkan.
SELECT plan(4);

-- ── Siapkan dua identitas user (peran authenticated + klaim JWT) ──────────────────────────────
-- Helper set-identitas (pola umum project Supabase; sesuaikan bila punya helper sendiri).
CREATE OR REPLACE FUNCTION _test_as(uid text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
END; $$;

-- ── 1. User A HANYA melihat barisnya sendiri ──────────────────────────────────────────────────
SELECT _test_as('<user-A>');
SELECT results_eq(
  'SELECT count(*)::int FROM <tabel> WHERE <kolom_pemilik> <> ''<user-A>''',
  ARRAY[0],
  'User A tak boleh melihat baris milik user lain (RLS SELECT own-row)'
);

-- ── 2. User A TIDAK melihat baris user B ──────────────────────────────────────────────────────
SELECT is_empty(
  'SELECT * FROM <tabel> WHERE <kolom_pemilik> = ''<user-B>''',
  'User A tak boleh melihat baris user B sama sekali'
);

-- ── 3. User A DILARANG mengubah baris user B (RLS UPDATE) ──────────────────────────────────────
SELECT throws_ok(
  'UPDATE <tabel> SET <kolom_pemilik> = <kolom_pemilik> WHERE <kolom_pemilik> = ''<user-B>''',
  NULL,
  NULL,
  'User A tak boleh meng-UPDATE baris user B'
);

-- ── 4. anon (belum login) TIDAK melihat apa pun (default-deny) ─────────────────────────────────
SELECT set_config('role', 'anon', true);
SELECT is_empty(
  'SELECT * FROM <tabel>',
  'anon (belum login) tak boleh melihat baris tabel sensitif'
);

SELECT * FROM finish();
ROLLBACK;
