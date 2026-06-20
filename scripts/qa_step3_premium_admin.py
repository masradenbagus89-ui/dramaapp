"""Step-3 lanjutan: (A) tes pemotongan koin paywall, (B) tes login admin.
Menyentuh PRODUKSI sesaat (1 drama di-premium-kan) lalu DIBALIKKAN di finally.
Semua data test dibersihkan di akhir.
"""
import json, re, http.cookiejar, urllib.request, urllib.error

LIVE = "https://dramaapp.vercel.app"
ENV_PATH = r"D:\Users\user18\dramaapp\.env.local"
DRAMA = "guru-misterius-membentuk-pasukan-rahasia"
PEMAIL = "qa-premium-test@dramaku.test"
ADMIN_EMAIL = "admin@dramaku.com"

# --- kredensial prod dari .env.local ---
env = {}
with open(ENV_PATH, encoding="utf-8") as f:
    for line in f:
        m = re.match(r"\s*([A-Z_]+)\s*=\s*(.+?)\s*$", line)
        if m: env[m.group(1)] = m.group(2)
URL = env["SUPABASE_URL"].rstrip("/"); KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
ADMIN_PW = env.get("ADMIN_PASSWORD", "")

def rest(method, path, body=None):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}",
        data=json.dumps(body).encode() if body is not None else None, method=method)
    for k,v in {"apikey":KEY,"Authorization":f"Bearer {KEY}","Content-Type":"application/json",
                "Prefer":"return=representation"}.items(): req.add_header(k,v)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            t=r.read().decode(); return r.status,(json.loads(t) if t.strip() else None)
    except urllib.error.HTTPError as e: return e.code, e.read().decode()

def api(method, path, body=None, opener=None):
    req = urllib.request.Request(LIVE+path,
        data=json.dumps(body).encode() if body is not None else None, method=method)
    if body is not None: req.add_header("Content-Type","application/json")
    opn = opener.open if opener else urllib.request.urlopen
    try:
        with opn(req, timeout=30) as r:
            code, t = r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        code, t = e.code, e.read().decode()
    except Exception as e:
        return None, f"EXC {type(e).__name__}: {e}"
    try: return code, json.loads(t)
    except Exception: return code, (t[:200] if t.strip() else "(empty)")

def bal(email):
    return api("GET", f"/api/coins?email={email}")[1].get("balance")

# =========================== A. PAYWALL DEDUCTION ===========================
print("================ A. TES PEMOTONGAN KOIN (PAYWALL) ================")
print(f"set premium=true on '{DRAMA}':", rest("PATCH", f"dramas?id=eq.{DRAMA}",
      {"premium": True})[0])
chk = rest("GET", f"dramas?id=eq.{DRAMA}&select=id,premium")[1]
print("  konfirmasi DB:", chk)
try:
    api("POST","/api/auth/login",{"email":PEMAIL})
    api("POST","/api/coins/checkin",{"email":PEMAIL})   # +15
    api("POST","/api/coins/reward",{"email":PEMAIL})    # +4
    print(f"\n  saldo awal (harap 19): {bal(PEMAIL)}")
    def unlock(ep):
        c,r = api("POST","/api/coins/unlock",{"email":PEMAIL,"dramaId":DRAMA,"ep":ep})
        print(f"  unlock ep{ep} -> [{c}] {json.dumps(r) if isinstance(r,dict) else repr(r)}")
        return c,r
    unlock(5)   # harap potong 8 -> 11
    unlock(5)   # idempoten
    unlock(6)
    unlock(7)   # harap 402 koin kurang
    st = api("GET", f"/api/coins?email={PEMAIL}&dramaId={DRAMA}")[1]
    print(f"  status drama: unlockedEps={sorted(st['unlockedEps'])} balance={st['balance']} (harap eps [5,6], bal 3)")
finally:
    print("\n  >> REVERT premium=false:", rest("PATCH", f"dramas?id=eq.{DRAMA}", {"premium": False})[0])
    print("     konfirmasi DB:", rest("GET", f"dramas?id=eq.{DRAMA}&select=id,premium")[1])
    # cleanup data test
    rest("DELETE", f"wallets?email=eq.{PEMAIL}")
    rest("DELETE", f"app_data?key=eq.coinmeta:{PEMAIL}")
    rest("DELETE", f"unlocks?email=eq.{PEMAIL}")
    print(f"     cleanup -> saldo test sekarang: {bal(PEMAIL)} (harap 0), unlocks dihapus")

# =========================== B. ADMIN LOGIN ===========================
print("\n================ B. TES LOGIN ADMIN ================")
tf = rest("GET", f"app_data?key=eq.twofa:{ADMIN_EMAIL}&select=value")[1]
tf_enabled = bool(tf and tf[0]["value"].get("enabled"))
print(f"  2FA aktif untuk {ADMIN_EMAIL}? {tf_enabled}")

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

c,r = api("POST","/api/auth/login",{"email":ADMIN_EMAIL,"password":ADMIN_PW}, opener)
print(f"  login admin -> [{c}] {json.dumps(r)[:120]}")
got_cookie = any(ck.name=="dramaku_admin" for ck in cj)
print(f"  cookie sesi admin di-set? {got_cookie}")

if got_cookie:
    c,r = api("GET","/api/coins", None, opener)  # tanpa email -> identitas dari cookie
    print(f"  GET /api/coins (pakai cookie) -> [{c}] loggedIn={r.get('loggedIn')} isAdmin={r.get('isAdmin')} (harap isAdmin True)")
    c,r = api("GET", f"/api/admin/scan?id={DRAMA}", None, opener)
    print(f"  GET /api/admin/scan (gate admin) -> [{c}] {json.dumps(r)[:140]}")
    print("     (yang penting: BUKAN 401 -> gate kebuka untuk admin terautentikasi)")
    # tes negatif: tanpa cookie harus 401
    c,_ = api("GET", f"/api/admin/scan?id={DRAMA}")
    print(f"  kontrol: scan TANPA cookie -> [{c}] (harap 401)")
    api("POST","/api/auth/logout",{}, opener)
    print("  logout: cookie dibersihkan")
elif r.get("need2fa"):
    print("  -> login minta 2FA: password BENAR & enforcement 2FA BEKERJA (gate lapis-2 aktif).")

print("\n=== SELESAI ===")
