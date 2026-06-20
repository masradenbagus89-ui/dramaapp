"""QA flow test untuk verifikasi Step 3 — jalur viewer login di situs LIVE.
Tidak butuh kredensial asli: viewer = email saja (auth ringan client-side).
Script ini ADITIF (nambah data) — cleanup dijalankan terpisah via qa_step3_cleanup.py.
"""
import json
import urllib.request
import urllib.error

BASE = "https://dramaapp.vercel.app"
EMAIL = "qa-step3-verify@dramaku.test"  # email test jelas-palsu, dihapus saat cleanup

def call(method, path, body=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode("utf-8", "replace")
            code = r.status
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        code = e.code
    except Exception as e:
        return None, f"EXC {type(e).__name__}: {e}"
    try:
        return code, json.loads(raw)
    except Exception:
        return code, raw

def show(label, code, body):
    b = body if isinstance(body, str) else json.dumps(body, ensure_ascii=False)
    print(f"  [{code}] {label}\n        -> {b[:160]}")

print(f"=== TEST EMAIL: {EMAIL} ===\n")

# 0. cari drama premium (untuk tes paywall)
code, dramas = call("GET", "/api/dramas")
prem = [d["id"] for d in dramas if d.get("premium")] if isinstance(dramas, list) else []
first = dramas[0]["id"] if isinstance(dramas, list) and dramas else None
print(f"0. dramas: {len(dramas) if isinstance(dramas,list) else '?'}, premium: {prem or '(tidak ada)'}\n")

print("--- LOGIN ---")
show("login viewer", *call("POST", "/api/auth/login", {"email": EMAIL}))

print("\n--- KOIN ---")
show("balance awal", *call("GET", f"/api/coins?email={EMAIL}"))
show("check-in #1 (harap +15)", *call("POST", "/api/coins/checkin", {"email": EMAIL}))
show("check-in #2 (harap already)", *call("POST", "/api/coins/checkin", {"email": EMAIL}))
show("reward iklan (harap +4)", *call("POST", "/api/coins/reward", {"email": EMAIL}))
show("balance setelah (harap 19)", *call("GET", f"/api/coins?email={EMAIL}"))

print("\n--- UNLOCK / PAYWALL ---")
target = prem[0] if prem else first
show(f"unlock {target} ep5", *call("POST", "/api/coins/unlock",
     {"email": EMAIL, "dramaId": target, "ep": 5}))
show(f"coins?dramaId={target}", *call("GET", f"/api/coins?email={EMAIL}&dramaId={target}"))

print("\n--- TOPUP (Midtrans) ---")
show("topup starter", *call("POST", "/api/coins/topup", {"email": EMAIL, "packId": "starter"}))

print("\n--- KOMENTAR ---")
show("post comment", *call("POST", "/api/comments",
     {"dramaId": target, "user": EMAIL, "text": "QA step3 test comment"}))
show("get comments", *call("GET", f"/api/comments?dramaId={target}"))

print("\n=== SELESAI (jalankan cleanup setelah review) ===")
