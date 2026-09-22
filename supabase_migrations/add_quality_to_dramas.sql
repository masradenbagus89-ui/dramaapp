-- Migrasi: kualitas video (CAM / HD / WEB-DL / BluRay / ...) pada tabel dramas
--
-- ⚠️ SCHEMA: `dramaapp`, BUKAN `public`. Project Supabase ini dipakai bersama
-- aplikasi lain, jadi tabel DramaApp sengaja ditaruh di schema sendiri (lihat
-- lib/supabase.ts:24 `SUPABASE_SCHEMA = "dramaapp"`). Berkas migrasi LAMA di
-- folder ini masih menulis `public.dramas` — itu dari SEBELUM pindah schema,
-- jangan disalin mentah.
--
-- ⛔ URUTAN WAJIB: jalankan SQL ini DULU, baru deploy kodenya. Kalau dibalik,
-- kode mengirim kolom `quality` yang belum ada -> SEMUA penyimpanan drama dari
-- panel admin GAGAL (PostgREST menolak kolom tak dikenal, kode 42703) — bukan
-- cuma drama yang diisi kualitasnya. Pelajaran yang sama sudah dua kali terjadi
-- waktu menambah kolom `kind` (2026-08-25) dan `status` (2026-09-07).
--
-- Aman dijalankan ulang (IF NOT EXISTS). TIDAK menghapus/mengubah data lama.
--
-- Kenapa BOLEH NULL & sengaja TANPA DEFAULT: nilai bawaan di level database
-- berarti menandai judul yang belum diperiksa dengan kualitas yang belum tentu
-- benar. Kolom baru yang boleh NULL juga tidak menulis ulang isi tabel, jadi tak
-- ada penguncian panjang. Kosong = badge kualitas tidak digambar sama sekali
-- (lihat lib/lencana-kartu.ts).
--
-- Pengisian nilai awalnya ada di berkas TERPISAH:
-- supabase_migrations/isi_lencana_awal_dramas.sql (keputusan owner 2026-09-22
-- sore: 34 serial = HD, film 2026 = CAM, film lain = BluRay). Struktur dan isi
-- sengaja dipisah — yang satu sekali seumur hidup, yang satu boleh dikoreksi.
--
-- Rollback (kalau perlu):
--   alter table dramaapp.dramas drop constraint if exists dramas_quality_check;
--   alter table dramaapp.dramas drop column if exists quality;
--
-- Cara pakai: Supabase Dashboard -> SQL Editor -> tempel & Run.

alter table dramaapp.dramas
  add column if not exists quality text;

-- Pagar isi kolom di level DATABASE (bukan cuma di kode): hanya nilai dari
-- daftar ini yang sah, plus NULL untuk "belum diisi". Tanpa ini, salah ketik
-- dari alat lain (mis. edit manual lewat dashboard Supabase) membuat poster
-- memajang label yang tak berarti bagi penonton.
--
-- Daftarnya HARUS sama persis dengan DRAMA_QUALITY_OPTIONS di lib/types.ts —
-- kalau owner minta nilai baru, ubah KEDUANYA. Penjaganya:
-- tests/lencana-kartu.test.ts membaca berkas SQL ini dan membandingkannya.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'dramas_quality_check'
  ) then
    alter table dramaapp.dramas
      add constraint dramas_quality_check
      check (
        quality is null
        or quality in ('CAM', 'HDCAM', 'HD', 'HDTV', 'WEB-DL', 'WEBRip', 'BluRay', '4K')
      );
  end if;
end $$;
