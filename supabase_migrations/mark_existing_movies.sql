-- Data-fix (sekali jalan): tandai 7 judul yang selama ini tersimpan sebagai
-- serial 1 episode padahal isinya FILM layar lebar (durasi 102-165 menit).
--
-- PRASYARAT: supabase_migrations/add_kind_to_dramas.sql sudah dijalankan
-- (kolom `kind` harus sudah ada). Dijalankan 2026-08-25 — sudah OK.
--
-- Kenapa daftar id-nya ditulis satu per satu, BUKAN `where episodes = 1`:
-- serial yang baru punya 1 episode juga bernilai 1, jadi syarat itu akan
-- diam-diam menandai judul yang salah — sekarang maupun setiap kali SQL ini
-- dijalankan ulang di masa depan.
--
-- `premium` ikut dimatikan supaya database tidak menyimpan keadaan yang tidak
-- mungkin dibuat aplikasi (film berbayar). Ini TIDAK menghilangkan pemasukan:
-- aturan koin menggratiskan episode 1..FREE_EPISODES (lib/coins.ts), jadi judul
-- 1-video ini memang sudah gratis untuk penonton sejak awal.
--
-- Rollback (kalau perlu) — kembalikan ke keadaan sekarang:
--   update public.dramas set kind = 'series', premium = true
--    where id in ('transformers-the-last-knight', 'spider-man-brand-new-day',
--                 'avengers-doomsday', 'predator-badlands',
--                 'fireworks-wednesday', 'the-dark-knight');
--   update public.dramas set kind = 'series', premium = false
--    where id = '28-years-later-the-bone-temple';
--
-- Cara pakai: Supabase Dashboard → SQL Editor → tempel & Run.

update public.dramas
   set kind = 'movie',
       premium = false
 where id in (
   'transformers-the-last-knight',
   'spider-man-brand-new-day',
   'avengers-doomsday',
   'predator-badlands',
   '28-years-later-the-bone-temple',
   'fireworks-wednesday',
   'the-dark-knight'
 );

-- Cek hasil (harus 7 baris, semuanya kind = movie):
-- select id, title, kind, episodes, premium from public.dramas where kind = 'movie';
