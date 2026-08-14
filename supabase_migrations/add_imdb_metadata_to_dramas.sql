-- Migrasi: metadata IMDb pada tabel dramas
-- Aman dijalankan ulang (IF NOT EXISTS). Tidak menghapus data lama.
-- Rollback (kalau perlu): DROP COLUMN masing-masing kolom di bawah.
--
-- Cara pakai (lokal/staging/prod — hanya setelah kamu setuju):
--   Supabase Dashboard → SQL Editor → tempel & Run

alter table public.dramas add column if not exists imdb_id text;
alter table public.dramas add column if not exists year text;
alter table public.dramas add column if not exists content_rating text;
alter table public.dramas add column if not exists runtime text;
alter table public.dramas add column if not exists imdb_rating text;
alter table public.dramas add column if not exists imdb_votes text;
alter table public.dramas add column if not exists genre text;
alter table public.dramas add column if not exists director text;
alter table public.dramas add column if not exists writer text;
alter table public.dramas add column if not exists stars text;

create index if not exists dramas_imdb_id_idx on public.dramas (imdb_id);
