import sys
import psycopg2

HOST = "aws-1-ap-southeast-1.pooler.supabase.com"
PORT = 6543
DB = "postgres"
# password read from Downloads/password.txt -> "Password : <pw>"
with open(r"C:\Users\user18\Downloads\password.txt", encoding="utf-8") as f:
    line = f.read().strip()
PW = line.split(":", 1)[1].strip()

users = [
    "creative_raden.nvblmpkwyzbpdbshyvzw",
    "creative_raden.vhsridhwjbqypwummrtp",
]

for user in users:
    print(f"--- trying user: {user}")
    try:
        conn = psycopg2.connect(
            host=HOST, port=PORT, dbname=DB, user=user, password=PW,
            sslmode="require", connect_timeout=15,
        )
        cur = conn.cursor()
        cur.execute("select current_user, current_database(), version();")
        cu, cd, ver = cur.fetchone()
        print(f"    SUCCESS user={cu} db={cd}")
        print(f"    {ver}")
        cur.execute("select schema_name from information_schema.schemata order by 1;")
        print("    schemas:", ", ".join(r[0] for r in cur.fetchall()))
        cur.execute("""
            select table_name from information_schema.tables
            where table_schema = 'dramaapp' order by 1;
        """)
        tabs = [r[0] for r in cur.fetchall()]
        print(f"    dramaapp tables ({len(tabs)}):", ", ".join(tabs) if tabs else "(none)")
        cur.close()
        conn.close()
        sys.exit(0)
    except Exception as e:
        print(f"    FAILED: {type(e).__name__}: {e}")

print("All connection attempts failed.")
sys.exit(1)
