-- =====================================================================
-- FIX: coin_spend_unlock — "column reference \"balance\" is ambiguous" (42702)
-- Sebab: output column `balance` (RETURNS TABLE) bentrok dgn kolom wallets.balance
--        pada baris UPDATE. Solusi: alias tabel + kualifikasikan RHS (w.balance).
-- Aman dijalankan berulang (CREATE OR REPLACE). Jalankan di project PRODUKSI
-- (ref iicrzdnmcpontfytfypi) lewat Supabase SQL Editor.
-- =====================================================================
create or replace function public.coin_spend_unlock(
  p_email text, p_token text, p_cost int
) returns table(ok boolean, balance int) language plpgsql as $$
declare cur int;
begin
  -- Sudah terbuka -> tidak menarik koin (idempoten).
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
