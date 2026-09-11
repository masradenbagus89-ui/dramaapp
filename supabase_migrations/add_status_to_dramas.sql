-- Migrasi: status tayang (masih tayang / tamat) pada tabel dramas
--
-- ⚠️ SCHEMA: `dramaapp`, BUKAN `public`. Project Supabase ini dipakai bersama
-- aplikasi lain, jadi tabel DramaApp sengaja ditaruh di schema sendiri (lihat
-- lib/supabase.ts:24 `SUPABASE_SCHEMA = "dramaapp"`). Berkas migrasi LAMA di
-- folder ini masih menulis `public.dramas` — itu dari SEBELUM pindah schema,
-- jangan disalin mentah. Menjalankannya di `public` mengubah tabel yang salah
-- (atau gagal karena tabelnya memang tidak ada di sana).
--
-- Aman dijalankan ulang (IF NOT EXISTS). TIDAK menghapus/mengubah data lama:
-- kolomnya NULL untuk semua judul yang sudah ada = "belum ditentukan", dan
-- tampilan memang sengaja DIAM kalau kosong.
--
-- Rollback (kalau perlu):
--   alter table dramaapp.dramas drop constraint if exists dramas_status_check;
--   alter table dramaapp.dramas drop column if exists status;
--
-- URUTAN WAJIB: jalankan SQL ini DULU, baru deploy kodenya. Kalau dibalik,
-- kode mengirim kolom `status` yang belum ada -> SEMUA penyimpanan drama dari
-- panel admin GAGAL (PostgREST menolak kolom tak dikenal, kode 42703). Sama
-- persis dengan pelajaran waktu menambah kolom `kind`.
--
-- Kenapa aman untuk tabel yang sudah berisi: kolom baru yang BOLEH NULL tidak
-- menulis ulang isi tabel, jadi tidak ada penguncian panjang & tidak ada data
-- yang hilang. Sengaja TIDAK memakai NOT NULL + DEFAULT: memberi nilai bawaan
-- berarti menandai judul-judul lama dengan status yang belum tentu benar.
--
-- Cara pakai: Supabase Dashboard -> SQL Editor -> tempel & Run.

alter table dramaapp.dramas
  add column if not exists status text;

-- Pagar isi kolom di level DATABASE (bukan cuma di kode): hanya dua nilai yang
-- sah, plus NULL untuk "belum ditentukan". Tanpa ini, salah ketik dari alat
-- lain (mis. edit manual lewat dashboard) membuat kartu drama memasang label
-- yang tak berarti bagi penonton.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'dramas_status_check'
  ) then
    alter table dramaapp.dramas
      add constraint dramas_status_check
      check (status is null or status in ('Ongoing', 'Completed'));
  end if;
end $$;
