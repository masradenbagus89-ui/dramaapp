-- Migrasi: schema LENGKAP DramaApp di schema `dramaapp` pada project Supabase
-- target nvblmpkwyzbpdbshyvzw (dijalankan 2026-08-29 saat migrasi dari prod lama
-- iicrzdnmcpontfytfypi). Gabungan dari: migrasi-schema.sql + add_imdb_metadata +
-- add_imdb_country_language + add_kind_to_dramas + fix coin_spend_unlock.
-- IDEMPOTEN: aman dijalankan ulang (if not exists / or replace / do update).
-- TIDAK menyentuh schema lain di project bersama ini.

-- =====================================================================
-- TABEL (5)
-- =====================================================================

create table if not exists dramaapp.app_data (
  key   text primary key,
  value jsonb not null
);

create table if not exists dramaapp.dramas (
  id           text primary key,
  title        text not null,
  category     text not null,
  episodes     integer not null default 0,
  views        text not null default '',
  synopsis     text not null default '',
  gradient     text not null default '',
  poster_image text,
  hero_image   text,
  hero_dim     boolean not null default false,
  exclusive    boolean not null default false,
  premium      boolean not null default false,
  subtitles    text[]  not null default '{}',
  sort_index   double precision not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists dramas_sort_idx on dramaapp.dramas (sort_index);

-- Kolom pasca-Juni (negara/bahasa + metadata IMDb + jenis tayangan).
alter table dramaapp.dramas add column if not exists country text;
alter table dramaapp.dramas add column if not exists language text;
alter table dramaapp.dramas add column if not exists imdb_id text;
alter table dramaapp.dramas add column if not exists year text;
alter table dramaapp.dramas add column if not exists content_rating text;
alter table dramaapp.dramas add column if not exists runtime text;
alter table dramaapp.dramas add column if not exists imdb_rating text;
alter table dramaapp.dramas add column if not exists imdb_votes text;
alter table dramaapp.dramas add column if not exists genre text;
alter table dramaapp.dramas add column if not exists director text;
alter table dramaapp.dramas add column if not exists writer text;
alter table dramaapp.dramas add column if not exists stars text;
create index if not exists dramas_imdb_id_idx on dramaapp.dramas (imdb_id);

alter table dramaapp.dramas
  add column if not exists kind text not null default 'series';
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'dramas_kind_check'
  ) then
    alter table dramaapp.dramas
      add constraint dramas_kind_check check (kind in ('series', 'movie'));
  end if;
end $$;

create table if not exists dramaapp.likes (
  drama_id text primary key,
  count    integer not null default 0
);

create table if not exists dramaapp.wallets (
  email   text primary key,
  balance integer not null default 0
);

create table if not exists dramaapp.unlocks (
  email text not null,
  token text not null,
  primary key (email, token)
);

-- =====================================================================
-- FUNGSI RPC (3) — versi SUDAH DI-FIX (coin_spend_unlock bebas bug
-- "column balance ambiguous", dari scripts/fix_coin_spend_unlock_prod.sql)
-- =====================================================================

create or replace function dramaapp.like_change(p_drama_id text, p_delta int)
returns int language plpgsql as $$
declare new_count int;
begin
  insert into dramaapp.likes (drama_id, count)
       values (p_drama_id, greatest(0, p_delta))
  on conflict (drama_id)
    do update set count = greatest(0, dramaapp.likes.count + p_delta)
  returning count into new_count;
  return new_count;
end; $$;

create or replace function dramaapp.coin_add(p_email text, p_delta int)
returns int language plpgsql as $$
declare new_bal int;
begin
  insert into dramaapp.wallets (email, balance)
       values (p_email, greatest(0, p_delta))
  on conflict (email)
    do update set balance = greatest(0, dramaapp.wallets.balance + p_delta)
  returning balance into new_bal;
  return new_bal;
end; $$;

create or replace function dramaapp.coin_spend_unlock(
  p_email text, p_token text, p_cost int
) returns table(ok boolean, balance int) language plpgsql as $$
declare cur int;
begin
  -- Sudah terbuka -> tidak menarik koin (idempoten).
  if exists (select 1 from dramaapp.unlocks u
             where u.email = p_email and u.token = p_token) then
    select w.balance into cur from dramaapp.wallets w where w.email = p_email;
    return query select true, coalesce(cur, 0);
    return;
  end if;

  select w.balance into cur from dramaapp.wallets w where w.email = p_email;
  cur := coalesce(cur, 0);
  if cur < p_cost then
    return query select false, cur;
    return;
  end if;

  update dramaapp.wallets w set balance = w.balance - p_cost where w.email = p_email;
  insert into dramaapp.unlocks (email, token) values (p_email, p_token)
    on conflict (email, token) do nothing;
  return query select true, cur - p_cost;
end; $$;

-- =====================================================================
-- Catatan: RLS sengaja dibiarkan MATI (identik dengan production lama —
-- app mengakses lewat service role key yang mem-bypass RLS).
-- =====================================================================
