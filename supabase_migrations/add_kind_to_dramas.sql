-- Migrasi: jenis tayangan (serial vs film) pada tabel dramas
-- Aman dijalankan ulang (IF NOT EXISTS). Tidak menghapus/mengubah data lama:
-- semua judul yang sudah ada otomatis bernilai 'series' (perilaku sekarang).
--
-- Rollback (kalau perlu): ALTER TABLE public.dramas DROP COLUMN kind;
--
-- URUTAN WAJIB: jalankan SQL ini DULU, baru deploy kodenya. Kalau dibalik,
-- kode mengirim kolom `kind` yang belum ada → SEMUA penyimpanan drama gagal,
-- bukan cuma film.
--
-- Kenapa aman untuk tabel yang sudah berisi: di Postgres 11+ menambah kolom
-- NOT NULL yang punya DEFAULT tidak menulis ulang seluruh tabel (nilainya
-- disimpan di katalog), jadi tidak ada penguncian panjang maupun data hilang.
--
-- Cara pakai (staging/prod — hanya setelah kamu setuju):
--   Supabase Dashboard → SQL Editor → tempel & Run

alter table public.dramas
  add column if not exists kind text not null default 'series';

-- Pagar isi kolom di level DATABASE (bukan cuma di kode): hanya dua nilai yang
-- sah. Tanpa ini, salah ketik dari alat lain (mis. edit manual lewat dashboard)
-- membuat judul tidak terbaca sebagai film maupun serial.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'dramas_kind_check'
  ) then
    alter table public.dramas
      add constraint dramas_kind_check check (kind in ('series', 'movie'));
  end if;
end $$;
