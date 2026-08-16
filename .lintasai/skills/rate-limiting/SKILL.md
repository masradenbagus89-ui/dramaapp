---
nama: rate-limiting
deskripsi: Batasi laju permintaan kelas-industri — token-bucket atomik di penyimpanan terbagi, per-identitas yang tepat, balas 429 + Retry-After, lindungi login/OTP/tarik-dana dari brute-force & abuse.
divisi: keamanan
pemicu: [rate-limit, rate-limiting, throttle, throttling, brute-force, too-many-requests, batasi-laju, anti-spam, flood-request, gak-spam, spam-kirim, batasi-percobaan, coba-berkali, terlalu-sering, ddos]
rawan_keamanan: true
menggantikan: []
---

# Skill: Rate Limiting (batasi laju permintaan) — kelas industri

> **Inti:** rate limit menghitung permintaan per identitas dalam jendela waktu tertentu; begitu satu identitas melewati batas, permintaan berikutnya ditolak sementara (coba lagi setelah beberapa detik) — bukan diblokir selamanya. Tujuannya: trafik wajar tetap dilayani, tapi percobaan bertubi-tubi (menebak password / spam) tertahan.

Butir **🔒 HASIL** = jaminan keamanan yang tak boleh gagal. Cek dokumentasi penyimpanan/gateway **versi terpasang** sebelum menulis kode — perintah atomik (Lua/`INCR`) & header rate-limit beda antar-sistem/versi. Rate limiting = **satu lapis** (mengurangi abuse), BUKAN pengganti auth kuat / anti-DDoS di edge.

---

## 1. Kontrak (yang HARUS benar — tulis DULU)

- 🔒 **HASIL:**
  - **Input:** identitas peminta (IP + akun/API-key bila ada) + nama aksi/endpoint.
  - **Output — di bawah batas:** permintaan diteruskan; sisa kuota dilaporkan (header `RateLimit-*`).
  - **Output — lewat batas:** ditolak **HTTP 429 (Too Many Requests)** + header **`Retry-After`** (detik sampai boleh coba lagi). BUKAN 200, BUKAN 500.
  - **Error (penyimpanan penghitung mati):** perilaku **fail-open/fail-closed ditentukan SADAR per-endpoint** (lihat §2 poin 6) — bukan kebetulan.
  - **Atomik:** "baca hitungan → tambah → bandingkan batas" satu operasi tak-terpisah — dua permintaan bersamaan tak boleh dua-duanya lolos di ambang (race condition = balapan proses → batas tembus).

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 🔒 **HASIL — Penghitung di penyimpanan TERBAGI, BUKAN memori proses.** Variabel/`Map` di dalam aplikasi **tak terbagi** antar-replica (tiap instance punya hitungan sendiri → batas efektif ×jumlah-instance) dan **hilang tiap deploy** — bocor senyap di serverless/multi-instance (kelas bug sama seperti antrean in-memory, `skills/background-job/SKILL.md`). Pilih:
   - 📐 CARA BAKU: **Redis/Upstash** (`INCR`+`EXPIRE`, atau Lua atomik) — standar de-facto, cepat, TTL bawaan.
   - 📐 CARA BAKU: **Edge platform** (Cloudflare Rate Limiting/Durable Object, Vercel) untuk lapis terluar — ikuti dokumentasi penyedia yang dipakai project ini (cek config-nya dulu, jangan karang nama setelan).
   - 💡 SARAN: skala kecil 1-instance → tabel DB + `UPDATE ... RETURNING` bisa, tapi jangan jadikan jalur panas DB. Naik ke Redis saat trafik tumbuh (YAGNI: jangan pasang Redis sebelum butuh).
   - 📐 **Sinyal project INI:** grep rute sensitif (`login`/`otp`/`reset-password`/`withdraw`) — justru ini yang paling wajib pakai store terbagi. Default-bahaya konkret: `express-rate-limit` **MemoryStore (default)** = per-instance → jebol di multi-instance/serverless; ganti ke store terbagi (Redis).
2. 🔒 **HASIL — Kunci penghitung pakai IDENTITAS yang tepat, bukan IP saja.** IP saja rapuh: banyak user di belakang satu NAT/kantor berbagi IP (satu orang kena limit, yang lain ikut terdampak), penyerang gampang ganti IP. Pilih kunci per-aksi:
   - Login / OTP / reset-password / tarik-dana → **per-akun ATAU per-email/HP + per-IP** (dua-duanya), supaya satu penyerang tak mengunci akun korban DAN tak bisa keliling IP.
   - API ber-key → **per-API-key**. Endpoint publik anonim → per-IP (+ jitera bila ada).
   - ⚠️ **Ambil IP asli dengan benar** di belakang proxy/CDN: pakai header proxy tepercaya yang di-set infra-mu (mis. `CF-Connecting-IP`), JANGAN percaya `X-Forwarded-For` mentah dari client (bisa dipalsukan) — validasi di boundary.
3. 📐 **Pilih algoritma sesuai kebutuhan** (semua benar; beda karakter):
   - **Token bucket** — izinkan ledakan (burst) terkendali lalu isi-ulang pelan; enak untuk API. 
   - **Sliding window** — paling adil di batas jendela (tak ada lonjakan ganda di pergantian menit); lebih mahal.
   - **Fixed window** (`INCR`+`EXPIRE 60`) — paling sederhana; kelemahan: 2× burst di sekitar pergantian jendela. Cukup untuk banyak kasus.
4. 🔒 **HASIL — Balas 429 + `Retry-After` + header kuota.** Client (dan browser/SDK) butuh tahu **kapan** boleh coba lagi. Sertakan `Retry-After: <detik>` dan idealnya `RateLimit-Limit`/`RateLimit-Remaining`/`RateLimit-Reset` (draft IETF) supaya client mundur sesuai jadwal, bukan mengulang permintaan makin sering.
5. 📐 **Endpoint sensitif = lebih dari sekadar rate limit** (pertahanan berlapis): login/OTP juga butuh **jeda-progresif / lockout** (makin sering gagal makin lama tunggu), **captcha setelah N gagal**, dan **balasan yang tak membocorkan** apakah email terdaftar (jangan beda pesan/timing/limit antara "user ada" vs "tidak" → cegah enumerasi akun). Lockout login → `skills/auth/SKILL.md`. Anti-abuse pembayaran/webhook → `skills/pembayaran/SKILL.md`.
6. 📐 **Fail-open vs fail-closed = keputusan SADAR saat penyimpanan mati.** Redis tak terjangkau → apakah **izinkan semua** (fail-open: tetap melayani, TAPI tanpa perlindungan sesaat) atau **tolak** (fail-closed: aman, TAPI bisa menjatuhkan layananmu sendiri)? Aturan praktis: endpoint **sangat sensitif** (tarik-dana, ganti-password) condong **fail-closed**; endpoint umum condong **fail-open + alert**. Apa pun pilihannya — catat + pantau, jangan diam.
7. 📐 **Batasi juga di lapis LUAR + berdasar BIAYA.** Taruh lapis kasar di edge/CDN/gateway (murah, jauh dari server) + lapis halus per-user di aplikasi. Endpoint mahal (ekspor besar, pencarian berat, generate) → beri **kuota lebih ketat / berbobot** ("1 ekspor = 10 poin"), bukan hitung 1-request-1.
8. 📐 **Kecualikan health-check & trafik internal** dari limit (jangan sampai monitor sendiri kena blok), dan **jangan hanya andalkan pembatasan sisi-client** (bisa dilewati) — server tetap otoritas.

---

## 3. Powerful — pola siap-adaptasi

🧪 **CONTOH KASUS (ambil polanya, jangan salin mentah):** sliding-window atomik di Redis pakai Lua — increment + set-expiry + baca-hitungan sebagai SATU operasi (anti race condition), tak ada dua permintaan lolos bersamaan di ambang:

```lua
-- KEYS[1] = kunci limit (mis. "rl:login:user42"); ARGV[1] = batas; ARGV[2] = jendela(detik)
-- Return: hitungan sekarang. Pemanggil: kalau > batas -> tolak 429.
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2])) end
return c
```
```txt
Pemanggil (pseudo):
  c = evalsha(script, key="rl:login:"+akunId, batas=5, jendela=60)
  if c > 5:  ->  429 + Retry-After: TTL(key)   // 5 percobaan / 60 detik / akun
  else:      ->  teruskan
```
- 📐 CARA BAKU: kunci menyertakan **aksi + identitas** (`rl:<aksi>:<id>`) supaya tiap endpoint punya anggaran terpisah — batasi login tak ikut membatasi lihat-halaman.
- 💡 SARAN: butuh token-bucket / burst terkendali / limit terdistribusi matang → pakai pustaka teruji (mis. `@upstash/ratelimit`, `express-rate-limit` + store Redis, `slowapi` untuk FastAPI) ketimbang menulis sendiri.

### Contoh pola ❌→✅ (ambil POLANYA, jangan salin mentah — cek versi paket/provider terpasang)

🧪 **Penghitung terbagi, bukan memori proses (§2 butir 1)**:

❌ **SALAH** (hitungan di memori proses — kelas bug yang sama dengan MemoryStore default `express-rate-limit`):
```ts
const hitungan = new Map<string, number>() // memori proses: tiap replica/instance punya Map SENDIRI
const c = (hitungan.get(kunci) ?? 0) + 1 // 3 replica = batas efektif 3×; serverless: cold-start mulai dari 0
hitungan.set(kunci, c)
if (c > 5) return tolak429() // deploy/restart → hitungan hilang → brute-force nyaris tak terbendung
```
✅ **BENAR** (penyimpanan terbagi — semua instance lihat hitungan yang sama):
```ts
import { Ratelimit } from '@upstash/ratelimit' // API bisa beda antar versi — cek docs paket terpasang
import { Redis } from '@upstash/redis'

const rl = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(5, '60 s') })

const { success, reset } = await rl.limit(`login:${akunId}`) // hitung+banding atomik DI Redis, kebal restart/scale-out
if (!success) // §1: lewat batas = 429 + Retry-After, BUKAN 200/500
  return new Response(null, { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))) } })
```

🧪 **Identitas tepat + IP asli tepercaya (§2 butir 2)**:

❌ **SALAH** (kunci dari `X-Forwarded-For` mentah + per-IP saja):
```ts
const ip = req.headers.get('x-forwarded-for') ?? 'anon' // header ini BISA DITULIS client → nilai baru tiap request
const { success } = await rl.limit(`login:${ip}`) // = kunci selalu baru → limit tak pernah tercapai
// per-IP saja: penyerang tinggal ganti IP untuk terus brute-force akun korban
```
✅ **BENAR** (IP dari header yang di-set infra sendiri + kunci ganda per-akun & per-IP):
```ts
const ip = req.headers.get('cf-connecting-ip') ?? 'anon' // di-set proxy/CDN sendiri, bukan client — nama header: cek docs infra terpasang
const email = emailInput.trim().toLowerCase() // normalisasi: "Budi@x.com" = "budi@x.com" (satu anggaran)
const [perAkun, perIp] = await Promise.all([
  rl.limit(`login:akun:${email}`), // tahan penyerang keliling IP menembak SATU akun
  rlLonggar.limit(`login:ip:${ip}`), // tahan satu IP menembak BANYAK akun; lebih longgar (NAT kantor berbagi IP)
])
if (!perAkun.success || !perIp.success) // §1: WAJIB sertakan Retry-After — hitung dari `reset` spt pola pertama di atas
  return new Response(null, { status: 429, headers: { 'Retry-After': '60' } })
```

🧪 **Atomik: hitung-dan-bandingkan satu operasi (§1 Kontrak)**:

❌ **SALAH** (baca → banding → tulis terpisah = race condition):
```ts
const c = Number(await redis.get(kunci)) || 0 // baca dulu...
if (c >= 5) return tolak429()
await redis.set(kunci, c + 1, { ex: 60 }) // ...tulis TERPISAH: 100 request paralel sama-sama baca c=4
// → semua lolos cek lalu semua menulis → ambang 5 tembus jadi ratusan
```
✅ **BENAR** (skala kecil tanpa Redis: SATU statement SQL = atomik per-baris; padanan Redis = Lua di awal §3):
```sql
CREATE TABLE rate_limit (kunci text PRIMARY KEY, hitungan int NOT NULL, kadaluarsa timestamptz NOT NULL);

INSERT INTO rate_limit (kunci, hitungan, kadaluarsa) VALUES ($1, 1, now() + interval '60 seconds')
ON CONFLICT (kunci) DO UPDATE SET -- tambah-dan-baca dalam satu statement: tak bisa disela request lain
  hitungan   = CASE WHEN rate_limit.kadaluarsa < now() THEN 1 ELSE rate_limit.hitungan + 1 END,
  kadaluarsa = CASE WHEN rate_limit.kadaluarsa < now() THEN now() + interval '60 seconds' ELSE rate_limit.kadaluarsa END
RETURNING hitungan; -- pemanggil: hitungan > 5 → 429 + Retry-After
```

---

## 4. Self-verify (sangkal diri sebelum "selesai")

- [ ] Penghitung **terbagi antar-instance** (Redis/edge), BUKAN memori proses (uji: 2 instance → batas tetap utuh, tak jadi 2×)?
- [ ] Operasi hitung-dan-bandingkan **atomik** (uji: 100 permintaan paralel di ambang → yang lolos = tepat batas, bukan lebih)?
- [ ] Kunci pakai **identitas tepat** (login = per-akun **dan** per-IP), IP asli diambil dari header proxy tepercaya (bukan `X-Forwarded-For` mentah)?
- [ ] Lewat batas → **429 + `Retry-After`** (bukan 200/500)?
- [ ] Endpoint sensitif (login/OTP/reset/tarik) punya limit ketat + lockout progresif + tak membocorkan akun terdaftar?
- [ ] Perilaku saat penyimpanan mati **ditentukan sadar** (fail-open/closed) + di-alert?
- [ ] Health-check & internal dikecualikan; tak ada pembatasan yang HANYA di sisi client?

---

## 5. Definition-of-Done

- [ ] **Kontrak (§1) ditulis** (input/output-di-bawah/output-lewat/error/atomik).
- [ ] Penghitung terbagi + atomik + kunci per-identitas + 429/`Retry-After` + kebijakan fail-open/closed terpasang.
- [ ] **Edge case** diuji: 2 permintaan bersamaan di ambang, IP di belakang proxy, penyimpanan mati, banyak-user-satu-NAT, endpoint sensitif brute-force.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Observability aktif: hitung 429 per-endpoint + alert saat lonjakan (deteksi serangan / limit keketatan salah) sebelum "online".
- [ ] build + lint + test lulus; min 1 test happy-path (di bawah batas lolos) + 1 test "lewat batas → 429" + 1 test race (paralel di ambang).

---

## 6. Handoff / rujuk-silang (reuse-first — jangan salin)

- 📐 Lockout login progresif + anti-enumerasi akun → `skills/auth/SKILL.md`.
- 📐 Payung keamanan web (CORS, header, CVE, upload) — rate-limit adalah SATU bab di dalamnya → `skills/owasp/SKILL.md`.
- 📐 Idempotensi & anti bayar-dobel (webhook/checkout) → `skills/pembayaran/SKILL.md`; anti abuse tarik-dana/saldo → skill wallet-ledger (bila sudah ada) / `skills/kepatuhan-teregulasi/SKILL.md`.
- 📐 Penghitung DB `FOR UPDATE`/antrean → `skills/supabase-prisma/SKILL.md` · `skills/background-job/SKILL.md`. Lapis edge → dokumentasi penyedia project ini.
- 🗃️ LATAR — metrik & alert 429 → `templates/PRODUCTION_OBSERVABILITY.md`. Beda dari `skills/tahan-gagal/SKILL.md` (itu melindungi DIRIMU dari layanan-luar rewel; rate-limiting melindungi layananMU dari peminta yang berlebihan).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** endpoint sensitif (login/OTP/reset/tarik-dana/API mahal) + kapasitas server. **Mode-gagal:** brute-force password/OTP, enumerasi akun, spam form, scraping, pengurasan kuota/biaya, penghitung bocor antar-instance, race di ambang, IP palsu via `X-Forwarded-For`. **Mitigasi:** penghitung terbagi + atomik + kunci per-identitas tepat + limit ketat endpoint sensitif + lockout/captcha + IP-asli tepercaya + 429/`Retry-After` + fail-policy sadar + observability (§5).
- 🗃️ **LATAR — Batas jujur:** rate limiting **mengurangi** abuse, **bukan** anti-DDoS penuh (banjir volumetrik butuh mitigasi di edge/jaringan) dan **bukan** pengganti auth kuat. Penyerang terdistribusi (banyak IP/akun) menekan efektivitas limit per-identitas → gabungkan dengan deteksi anomali/anti-fraud. Angka batas yang tepat = hasil ukur trafik nyata (mulai konservatif, longgarkan berdasar data), bukan tebakan.
