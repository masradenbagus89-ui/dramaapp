-- =====================================================================
-- DramaApp  ->  Supabase (PostgreSQL) — SETUP SKEMA + FUNGSI
-- ---------------------------------------------------------------------
-- Cara pakai:  Supabase Dashboard -> SQL Editor -> New query ->
--              paste SELURUH isi file ini -> Run.
-- Idempoten: aman dijalankan berulang (create ... if not exists / replace).
--
-- Setelah ini, seed data awal dari data/*.json dengan:
--     node scripts/seed-supabase.mjs
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) app_data : dokumen JSON serbaguna (model "key -> value" seperti KV).
--    Menyimpan: "admins", "comments:<dramaId>", "ads",
--               "coinmeta:<email>", "twofa:<email>", "order:<orderId>".
-- ---------------------------------------------------------------------
create table if not exists public.app_data (
  key   text primary key,
  value jsonb not null
);

-- ---------------------------------------------------------------------
-- 2) dramas : katalog drama (relasional -> bisa dilihat sbg baris di dashboard).
-- ---------------------------------------------------------------------
create table if not exists public.dramas (
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
create index if not exists dramas_sort_idx on public.dramas (sort_index);

-- ---------------------------------------------------------------------
-- 3) likes : jumlah like per drama (diubah atomik via RPC like_change).
-- ---------------------------------------------------------------------
create table if not exists public.likes (
  drama_id text primary key,
  count    integer not null default 0
);

-- ---------------------------------------------------------------------
-- 4) wallets : saldo koin per user (atomik via RPC coin_add / coin_spend_unlock).
-- ---------------------------------------------------------------------
create table if not exists public.wallets (
  email   text primary key,
  balance integer not null default 0
);

-- ---------------------------------------------------------------------
-- 5) unlocks : episode terbuka. token = "<dramaId>:<ep>".
-- ---------------------------------------------------------------------
create table if not exists public.unlocks (
  email text not null,
  token text not null,
  primary key (email, token)
);

-- =====================================================================
-- FUNGSI RPC — operasi atomik (pengganti HINCRBY / SADD Redis)
-- =====================================================================

-- Tambah/kurang like (+1 / -1), tak pernah < 0. Kembalikan jumlah terbaru.
create or replace function public.like_change(p_drama_id text, p_delta int)
returns int language plpgsql as $$
declare new_count int;
begin
  insert into public.likes (drama_id, count)
       values (p_drama_id, greatest(0, p_delta))
  on conflict (drama_id)
    do update set count = greatest(0, public.likes.count + p_delta)
  returning count into new_count;
  return new_count;
end; $$;

-- Tambah saldo koin (delta boleh negatif), tak pernah < 0. Kembalikan saldo baru.
create or replace function public.coin_add(p_email text, p_delta int)
returns int language plpgsql as $$
declare new_bal int;
begin
  insert into public.wallets (email, balance)
       values (p_email, greatest(0, p_delta))
  on conflict (email)
    do update set balance = greatest(0, public.wallets.balance + p_delta)
  returning balance into new_bal;
  return new_bal;
end; $$;

-- Belanjakan koin untuk buka 1 episode. Idempoten (kalau sudah terbuka, tak
-- menarik koin). Atomik. Kembalikan satu baris: (ok boolean, balance int).
create or replace function public.coin_spend_unlock(
  p_email text, p_token text, p_cost int
) returns table(ok boolean, balance int) language plpgsql as $$
declare cur int;
begin
  -- Sudah terbuka -> tidak menarik koin.
  if exists (select 1 from public.unlocks u
             where u.email = p_email and u.token = p_token) then
    select w.balance into cur from public.wallets w where w.email = p_email;
    return query select true, coalesce(cur, 0);
    return;
  end if;

  select w.balance into cur from public.wallets w where w.email = p_email;
  cur := coalesce(cur, 0);
  if cur < p_cost then
    return query select false, cur;
    return;
  end if;

  update public.wallets w set balance = w.balance - p_cost where w.email = p_email;
  insert into public.unlocks (email, token) values (p_email, p_token)
    on conflict (email, token) do nothing;
  return query select true, cur - p_cost;
end; $$;

-- =====================================================================
-- Catatan keamanan (opsional):
--   Server memakai SERVICE ROLE key yang mem-bypass RLS, jadi app tetap jalan
--   walau RLS diaktifkan. Kalau mau menutup akses publik via anon key:
--     alter table public.app_data enable row level security;
--     alter table public.dramas   enable row level security;
--     alter table public.likes    enable row level security;
--     alter table public.wallets  enable row level security;
--     alter table public.unlocks  enable row level security;
-- =====================================================================
