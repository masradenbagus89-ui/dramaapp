-- Migrasi: negara & bahasa IMDb pada tabel dramas
-- Aman dijalankan ulang (IF NOT EXISTS). Tidak menghapus data lama.
-- Rollback (kalau perlu): ALTER TABLE public.dramas DROP COLUMN country;
--                         ALTER TABLE public.dramas DROP COLUMN language;
--
-- Cara pakai (lokal/staging/prod — hanya setelah kamu setuju):
--   Supabase Dashboard → SQL Editor → tempel & Run

alter table public.dramas add column if not exists country text;
alter table public.dramas add column if not exists language text;
