"""CEK READ-ONLY kondisi database LAMA sebelum shutdown.
Hanya GET: hitung baris (Content-Range) + 3 baris terbaru per tabel.
Tidak menulis/mengubah apa pun.
"""
import json, os, re, urllib.request, urllib.error

ENV_PATH = r"D:\Users\user18\dramaapp\.env.local"
env = {}
with open(ENV_PATH, encoding="utf-8") as f:
    for line in f:
        m = re.match(r"\s*([A-Z_]+)\s*=\s*(.+?)\s*$", line)
        if m: env[m.group(1)] = m.group(2)
# URL bisa dioverride untuk menembak project LAMA dengan kunci yang ada
URL = (os.environ.get("TARGET_SUPABASE_URL") or env["SUPABASE_URL"]).rstrip("/")
KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
SCHEMA = os.environ.get("TARGET_SCHEMA") or "dramaapp"
TABLES = ["app_data", "dramas", "likes", "wallets", "unlocks"]

def get(path, extra_headers=None, want_headers=False):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}", method="GET")
    h = {"apikey": KEY, "Authorization": f"Bearer {KEY}",
         "Accept-Profile": SCHEMA}
    if extra_headers: h.update(extra_headers)
    for k, v in h.items(): req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = json.loads(r.read().decode() or "null")
            return (r.status, body, dict(r.headers)) if want_headers else (r.status, body)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: body = json.loads(t)
        except Exception: body = t
        return (e.code, body, {}) if want_headers else (e.code, body)

print(f"Project: {URL}\n")
for t in TABLES:
    # 1) hitung total baris via Content-Range (tanpa menarik data)
    st, _, hdr = get(f"{t}?select=*", {"Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0"}, want_headers=True)
    cr = hdr.get("Content-Range", hdr.get("content-range", "?"))
    total = cr.split("/")[-1] if "/" in cr else "?"
    print(f"== {t}: status={st} total_baris={total}")
    # 2) coba 3 baris terbaru berdasar created_at (kalau kolomnya ada)
    st2, rows = get(f"{t}?select=*&order=created_at.desc&limit=3")
    if st2 == 200 and isinstance(rows, list) and rows:
        for r in rows:
            label = r.get("created_at")
            ident = r.get("id") or r.get("key") or r.get("email") or r.get("title") or ""
            print(f"   terbaru: {label}  ({ident})")
    else:
        # fallback: lihat kolom apa saja yang ada dari 1 baris
        st3, rows3 = get(f"{t}?select=*&limit=1")
        if st3 == 200 and isinstance(rows3, list) and rows3:
            print(f"   kolom: {sorted(rows3[0].keys())}")
        else:
            print(f"   info: status={st3} {str(rows3)[:200]}")
    print()
