"""Cleanup data test Step-3 dari Supabase PRODUKSI (lewat PostgREST + service role).
Hapus: wallet test, coinmeta test, dan komentar test (selektif by id).
Lalu verifikasi via API live bahwa semuanya sudah bersih.
"""
import json
import re
import urllib.request
import urllib.error

EMAIL = "qa-step3-verify@dramaku.test"
DRAMA = "guru-misterius-membentuk-pasukan-rahasia"
COMMENT_ID = "1781926628419-3e308o"
ENV_PATH = r"D:\Users\user18\dramaapp\.env.local"
LIVE = "https://dramaapp.vercel.app"

# --- baca kredensial prod dari .env.local ---
env = {}
with open(ENV_PATH, encoding="utf-8") as f:
    for line in f:
        m = re.match(r"\s*([A-Z_]+)\s*=\s*(.+?)\s*$", line)
        if m:
            env[m.group(1)] = m.group(2)
URL = env["SUPABASE_URL"].rstrip("/")
KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
print(f"target supabase: {URL}\n")

def rest(method, path, body=None):
    req = urllib.request.Request(
        f"{URL}/rest/v1/{path}",
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
    )
    req.add_header("apikey", KEY)
    req.add_header("Authorization", f"Bearer {KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=representation")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            txt = r.read().decode("utf-8", "replace")
            return r.status, (json.loads(txt) if txt.strip() else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")

def live(path):
    with urllib.request.urlopen(f"{LIVE}{path}", timeout=30) as r:
        return json.loads(r.read().decode())

print("=== CLEANUP ===")
# 1. wallet
print("1. delete wallet:", rest("DELETE", f"wallets?email=eq.{EMAIL}"))
# 2. coinmeta doc
print("2. delete coinmeta:", rest("DELETE", f"app_data?key=eq.coinmeta:{EMAIL}"))
# 3. komentar (selektif): ambil doc, buang id test, tulis balik
code, rows = rest("GET", f"app_data?key=eq.comments:{DRAMA}&select=value")
if isinstance(rows, list) and rows:
    arr = rows[0]["value"] or []
    before = len(arr)
    arr = [c for c in arr if c.get("id") != COMMENT_ID and c.get("user") != EMAIL]
    print(f"3. comments {before} -> {len(arr)} :",
          rest("PATCH", f"app_data?key=eq.comments:{DRAMA}", {"value": arr})[0])
else:
    print("3. comments doc tidak ada / kosong:", code)

print("\n=== VERIFIKASI BERSIH (via API live) ===")
coins = live(f"/api/coins?email={EMAIL}")
print(f"  balance={coins['balance']} (harap 0), unlockedEps={coins['unlockedEps']}")
cm = live(f"/api/comments?dramaId={DRAMA}")
mine = [c for c in cm["comments"] if c.get("id") == COMMENT_ID or c.get("user") == EMAIL]
print(f"  komentar test tersisa: {len(mine)} (harap 0)")
print("\nDONE." if coins["balance"] == 0 and not mine else "\n!! MASIH ADA SISA, cek manual.")
