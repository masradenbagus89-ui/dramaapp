"""Reproduksi bug -> apply fix -> tes -> cleanup, di schema dramaapp (STAGING)."""
import psycopg2

HOST="aws-1-ap-southeast-1.pooler.supabase.com"; PORT=5432; DB="postgres"
USER="creative_raden.nvblmpkwyzbpdbshyvzw"
with open(r"C:\Users\user18\Downloads\password.txt",encoding="utf-8") as f:
    PW=f.read().split(":",1)[1].strip()
conn=psycopg2.connect(host=HOST,port=PORT,dbname=DB,user=USER,password=PW,
                      sslmode="require",connect_timeout=20)
conn.autocommit=True
cur=conn.cursor()
EMAIL="stg-fix-test@dramaku.test"

def call(token,cost,label):
    try:
        cur.execute("select * from dramaapp.coin_spend_unlock(%s,%s,%s)",(EMAIL,token,cost))
        print(f"  {label}: {cur.fetchone()}")
    except Exception as e:
        print(f"  {label}: ERROR {getattr(e,'pgcode',None)} {str(e).strip()[:90]}")

# bersihkan & siapkan wallet test saldo 20
cur.execute("delete from dramaapp.unlocks where email=%s",(EMAIL,))
cur.execute("delete from dramaapp.wallets where email=%s",(EMAIL,))
cur.execute("insert into dramaapp.wallets(email,balance) values(%s,20)",(EMAIL,))

print("=== 1) REPRODUKSI BUG (fungsi lama) ===")
call("d:5",8,"spend d:5 cost8 (harap ERROR 42702)")

print("\n=== 2) APPLY FIX ===")
cur.execute("""
create or replace function dramaapp.coin_spend_unlock(
  p_email text, p_token text, p_cost int
) returns table(ok boolean, balance int) language plpgsql as $func$
declare cur int;
begin
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
end; $func$;
""")
print("  fungsi di-replace OK")

print("\n=== 3) TES FUNGSI HASIL FIX (saldo awal 20) ===")
call("d:5",8,"spend d:5 cost8  (harap (True,12))")
call("d:5",8,"spend d:5 LAGI   (idempoten, harap (True,12))")
call("d:6",100,"spend d:6 cost100(koin kurang, harap (False,12))")
call("d:6",12,"spend d:6 cost12 (harap (True,0))")
cur.execute("select balance from dramaapp.wallets where email=%s",(EMAIL,))
print("  saldo akhir di DB:",cur.fetchone()[0],"(harap 0)")
cur.execute("select token from dramaapp.unlocks where email=%s order by token",(EMAIL,))
print("  unlocks tersimpan:",[r[0] for r in cur.fetchall()],"(harap ['d:5','d:6'])")

print("\n=== 4) CLEANUP test ===")
cur.execute("delete from dramaapp.unlocks where email=%s",(EMAIL,))
cur.execute("delete from dramaapp.wallets where email=%s",(EMAIL,))
print("  bersih.")
cur.close(); conn.close()
