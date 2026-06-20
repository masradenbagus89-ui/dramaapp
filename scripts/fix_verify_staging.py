"""Verifikasi fix coin_spend_unlock di DB STAGING (akses DDL langsung via psycopg2).
Langkah: introspeksi -> reproduksi bug -> apply fix -> tes -> cleanup.
"""
import psycopg2

HOST = "aws-1-ap-southeast-1.pooler.supabase.com"
PORT = 5432  # session mode untuk DDL
DB = "postgres"
USER = "creative_raden.nvblmpkwyzbpdbshyvzw"
with open(r"C:\Users\user18\Downloads\password.txt", encoding="utf-8") as f:
    PW = f.read().split(":", 1)[1].strip()

conn = psycopg2.connect(host=HOST, port=PORT, dbname=DB, user=USER, password=PW,
                        sslmode="require", connect_timeout=20)
conn.autocommit = True
cur = conn.cursor()

print("=== schema + fungsi coin_spend_unlock yang ada ===")
cur.execute("""
  select n.nspname as schema, p.proname,
         pg_get_function_identity_arguments(p.oid) as args
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where p.proname in ('coin_spend_unlock','coin_add')
  order by 1,2;
""")
for row in cur.fetchall():
    print("  ", row)

print("\n=== tabel wallets/unlocks ada di schema mana ===")
cur.execute("""
  select table_schema, table_name from information_schema.tables
  where table_name in ('wallets','unlocks') order by 1,2;
""")
rows = cur.fetchall()
for r in rows: print("  ", r)

# Tentukan schema target (tempat wallets berada)
schemas = sorted(set(r[0] for r in rows if r[1]=='wallets'))
print("\nschema target (punya wallets):", schemas)

cur.close(); conn.close()
print("\n(introspeksi selesai)")
