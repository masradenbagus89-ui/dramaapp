"""Diagnosa kenapa /api/coins/unlock -> 500. Panggil RPC coin_spend_unlock & coin_add
langsung ke PostgREST prod untuk lihat pesan error PostgreSQL aslinya.
"""
import json, re, urllib.request, urllib.error

ENV_PATH = r"D:\Users\user18\dramaapp\.env.local"
env = {}
with open(ENV_PATH, encoding="utf-8") as f:
    for line in f:
        m = re.match(r"\s*([A-Z_]+)\s*=\s*(.+?)\s*$", line)
        if m: env[m.group(1)] = m.group(2)
URL = env["SUPABASE_URL"].rstrip("/"); KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
EMAIL = "qa-diag@dramaku.test"

def rest(method, path, body=None):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}",
        data=json.dumps(body).encode() if body is not None else None, method=method)
    for k,v in {"apikey":KEY,"Authorization":f"Bearer {KEY}","Content-Type":"application/json"}.items():
        req.add_header(k,v)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            t=r.read().decode(); return r.status,(json.loads(t) if t.strip() else None)
    except urllib.error.HTTPError as e:
        t=e.read().decode()
        try: return e.code, json.loads(t)
        except: return e.code, t

print("=== coin_add (yang BERHASIL dipakai check-in) ===")
print(rest("POST","rpc/coin_add",{"p_email":EMAIL,"p_delta":20}))

print("\n=== coin_spend_unlock (yang DICURIGAI gagal) ===")
print(rest("POST","rpc/coin_spend_unlock",{"p_email":EMAIL,"p_token":"x:5","p_cost":8}))

print("\n=== daftar fungsi RPC yang ADA di prod (introspeksi) ===")
# PostgREST tak ekspos pg_proc; cek lewat OpenAPI root (definisi rpc terdaftar)
req = urllib.request.Request(f"{URL}/rest/v1/", method="GET")
for k,v in {"apikey":KEY,"Authorization":f"Bearer {KEY}"}.items(): req.add_header(k,v)
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        spec = json.loads(r.read().decode())
    rpcs = [p for p in spec.get("paths",{}) if p.startswith("/rpc/")]
    print("RPC terdaftar:", rpcs)
except Exception as e:
    print("gagal ambil spec:", e)

print("\n=== cleanup wallet diag ===")
print(rest("DELETE", f"wallets?email=eq.{EMAIL}"))
