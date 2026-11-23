-- Migrasi KEAMANAN: tutup race condition "cek saldo lalu kurangi" di
-- dramaapp.coin_spend_unlock. Hasil audit keamanan 2026-11-14 (temuan SEC-002).
--
-- ⚠️ SCHEMA `dramaapp`, BUKAN `public` (lib/supabase.ts SUPABASE_SCHEMA).
--
-- ========================= KENAPA =========================
-- Bentuk fungsi sekarang (supabase_migrations/2026-08-29_schema_lengkap_dramaapp.sql:108-131)
-- membaca saldo ke variabel, memeriksanya, LALU menulis — tiga langkah terpisah
-- tanpa kunci baris apa pun:
--
--   select w.balance into cur ... where w.email = p_email;   -- (1) baca
--   if cur < p_cost then return false;                       -- (2) periksa
--   update dramaapp.wallets set balance = balance - p_cost;   -- (3) kurangi
--
-- Dua permintaan yang datang BERSAMAAN dari satu penonton sama-sama menjalankan
-- (1) dan melihat angka yang sama, jadi keduanya lolos (2), lalu keduanya
-- menjalankan (3). Saldo 8 koin bisa membuka 2 episode seharga 8 koin masing-
-- masing; dengan 10 permintaan serentak, 10 episode terbuka. UPDATE-nya tidak
-- punya penjaga `balance >= p_cost` dan tidak memakai greatest(0, ...) seperti
-- coin_add, jadi saldonya ikut MINUS.
--
-- Kerusakan kedua di jalur yang sama: dua permintaan serentak untuk episode
-- yang SAMA sama-sama lolos pemeriksaan `exists` pada tabel unlocks, jadi
-- penonton ditarik koin DUA KALI untuk satu episode (yang kedua menulis
-- `on conflict do nothing`, tapi koinnya sudah terpotong).
--
-- Rak `skills/owasp/SKILL.md` §2 butir 1 menyebut "cek-saldo tanpa lock"
-- sebagai pola yang langsung ditandai risiko tinggi. Kelasnya TOCTOU
-- (Time-Of-Check to Time-Of-Use): keadaan berubah di antara "diperiksa" dan
-- "dipakai".
--
-- ========================= BATAS JUJUR =========================
-- Lubang ini BELUM bisa dipicu hari ini: lib/saklar-fitur.ts:45 menyetel
-- PAYWALL_ENABLED = false, jadi keenam route /api/coins/* dibalas 404 oleh
-- guardFitur sebelum menyentuh fungsi ini. Migrasi ini dijalankan sekarang
-- JUSTRU karena itu — berkas saklar yang sama (baris 21-22) menjanjikan
-- penyalaan ulang "nol migration SQL, nol env baru". Tanpa perbaikan ini,
-- mengubah satu `false` jadi `true` akan menghidupkan kembali lubangnya tanpa
-- satu pun langkah yang mengingatkan.
--
-- Yang TIDAK diubah: tarif, alur, bentuk balasan (ok, balance), dan sifat
-- idempoten. Pemanggil di lib/store.ts:496-511 tidak perlu disentuh.
--
-- ========================= CARA PERBAIKANNYA =========================
-- `for update` mengunci baris dompet penonton ini sampai transaksinya selesai.
-- Permintaan kedua dari penonton yang SAMA menunggu di baris itu, lalu membaca
-- keadaan TERBARU sesudah yang pertama selesai — jadi urutan baca→periksa→tulis
-- tidak bisa lagi disela. Penonton LAIN tidak ikut menunggu: kuncinya per-baris
-- (per-email), bukan per-tabel.
--
-- Pembacaan saldo DIPINDAH KE ATAS pemeriksaan `exists` dengan sengaja: kunci
-- harus sudah dipegang SEBELUM tabel unlocks diperiksa, kalau tidak pemeriksaan
-- ganda-tarik di atas tetap bisa lolos berdua.
--
-- Dompet yang BELUM ada (penonton baru, nol koin) tidak mengunci apa pun —
-- `cur` jadi NULL lalu di-coalesce 0, dan jalurnya berhenti di "koin tidak
-- cukup". Itu benar, dan di situ memang tak ada uang yang bisa diperebutkan.
--
-- ================= AMAN DIJALANKAN ULANG =================
-- `create or replace function` idempoten. Tanda tangan fungsi (nama + tipe
-- argumen) TIDAK berubah, jadi hak EXECUTE dari
-- supabase_migrations/2026-10-24_rls_dan_hak_fungsi.sql:95-104 tetap menempel
-- dan TIDAK perlu di-grant ulang. (Kalau tanda tangannya diubah, fungsi baru
-- lahir dengan PUBLIC boleh EXECUTE lagi — lihat BATAS JUJUR bagian 3 di
-- migrasi itu.)
--
-- ================= CARA MENJALANKAN =================
--   python scripts/jalankan_sql_dramaapp.py supabase_migrations/2026-11-14_kunci_baris_dompet_koin.sql
--     (tanpa --jalankan = SIMULASI, otomatis rollback; tambah --jalankan untuk menyimpan)
--   atau Supabase Dashboard -> SQL Editor -> tempel isi berkas ini -> Run
--
-- ================= ROLLBACK =================
-- Tempel ulang definisi lama dari
-- supabase_migrations/2026-08-29_schema_lengkap_dramaapp.sql:108-131.
-- ⚠️ Rollback MENGEMBALIKAN lubang overspend di atas — hanya tempuh kalau
-- fungsi ini terbukti bikin masalah lain, jangan sebagai langkah rutin.
-- =========================================================================

create or replace function dramaapp.coin_spend_unlock(
  p_email text, p_token text, p_cost int
) returns table(ok boolean, balance int) language plpgsql as $$
declare cur int;
begin
  -- 🔒 KUNCI BARIS DOMPET DULU, sebelum pemeriksaan apa pun di bawah.
  -- Inilah satu-satunya perubahan perilaku migrasi ini: tanpa `for update`,
  -- dua permintaan serentak membaca saldo yang sama lalu membelanjakannya
  -- dua kali (audit 2026-11-14 / SEC-002).
  select w.balance into cur from dramaapp.wallets w
    where w.email = p_email
    for update;
  cur := coalesce(cur, 0);

  -- Sudah terbuka -> tidak menarik koin (idempoten). Diperiksa SESUDAH kunci
  -- dipegang, supaya dua permintaan untuk episode yang sama tidak bisa
  -- sama-sama lolos lalu menarik koin dua kali.
  if exists (select 1 from dramaapp.unlocks u
             where u.email = p_email and u.token = p_token) then
    return query select true, cur;
    return;
  end if;

  if cur < p_cost then
    return query select false, cur;
    return;
  end if;

  update dramaapp.wallets w set balance = w.balance - p_cost
    where w.email = p_email;
  insert into dramaapp.unlocks (email, token) values (p_email, p_token)
    on conflict (email, token) do nothing;
  return query select true, cur - p_cost;
end; $$;
