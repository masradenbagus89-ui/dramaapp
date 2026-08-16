---
nama: owasp
deskripsi: Keamanan web OWASP kelas industri — XSS/CSRF/SSRF, rate-limit, CORS, upload aman, header keamanan, cek CVE.
divisi: stack
pemicu: [owasp, xss, csrf, ssrf, unggah, upload, foto-profil, avatar, lampiran, aman gak, aman nggak, aman-tidak, aman-belum, cek keamanan, periksa keamanan, ada yang bocor, data bocor, bisa diretas, kena hack, dibobol, data-leak, vulnerability, security-check, hacked, pentest, sql-injection, sqli, idor, path-traversal]
rawan_keamanan: true
menggantikan: [unggah-berkas]
---

# Skill: OWASP — Keamanan Web kelas industri

> **Kapan skill ini aktif:** **WAJIB untuk produk publik** — project yang endpoint/halamannya dipakai orang luar (login, form, API, upload). Melengkapi divisi Cyber Security. Skill ini paket-stack: tarik pas-ukuran saat menggarap kode yang menyentuh input dari luar, DI ATAS standar inti.
>
> **Inti:** OWASP Top 10 adalah daftar 10 celah keamanan web paling berbahaya versi terbaru, disusun dari pola serangan nyata yang benar-benar dipakai penyerang tahun ini. Skill ini menjaga produk dari serangan peretas dari luar — **pelengkap** mekanisme anti-AI-nakal lintasAI. Project profesional [expert] butuh KEDUANYA.

Butir **🔒 HASIL** = hasil keamanan yang tak boleh gagal apa pun caranya.

---

## 1. Kontrak (yang HARUS benar — non-negotiable, WAJIB untuk produk publik)

- 🔒 **HASIL — Cek OWASP Top 10:2025** (daftar 10 celah web paling berbahaya sedunia, versi 2025) tiap kali membangun/mengubah fitur yang menyentuh input luar: broken access (otorisasi tiap route, cegah IDOR — kini #1), misconfig (debug OFF di prod + security headers), **supply chain (A03 — BARU, lihat butir di bawah)**, kripto lemah (hash bcrypt/argon2), injection (query parameterized + XSS escape+CSP), insecure design, auth lemah (sesi aman), integritas data/deserialization, logging+alerting, **fail-open (A10 — BARU, lihat di bawah)**.
- 🔒 **HASIL — A03:2025 Supply Chain (rantai pasok kode) — kini risiko #3 dunia.** App kita memakai puluhan paket buatan orang lain; satu paket jahat = seluruh app jebol. WAJIB: (1) **pin versi + commit lockfile** (`package-lock.json`/`poetry.lock`) supaya versi tak bergeser diam-diam; (2) **pemindai CVE otomatis** (`npm audit`/`pip-audit`); (3) **dependency-confusion** — paket internal bisa "dibajak" oleh paket publik bernama sama (atur scope registry di `.npmrc`); (4) **slopsquatting** — pastikan paket yang disarankan AI benar ada + ejaan tepat; (5) opsional **SBOM** (daftar-isi semua paket) untuk respons cepat saat ada celah paket.
- 🔒 **HASIL — A10:2025 Mishandling Exceptional Conditions (salah menangani kondisi tak-terduga) — kategori BARU 2025.** Saat error/timeout/input aneh, sistem harus **gagal-AMAN (default-deny)**, JANGAN **fail-open** (malah membuka akses / melewati cek ketika gagal). Contoh bahaya: fungsi cek-izin yang di blok `catch`-nya malah `return true`; verifikasi token yang saat timeout diloloskan. WAJIB: tangani exception eksplisit + default MENOLAK; jangan `catch` kosong.
- 🔒 **HASIL — CORS `allow_origins=['*']` + credentials = jebakan kombinasi berbahaya.** CORS dengan wildcard `*` DIGABUNG `allow_credentials=true` membuat browser ikut mengirim cookie/token login ke origin mana pun — pintu pencurian sesi. WAJIB: saat credentials ON, whitelist origin SPESIFIK dari env (`CORS_ALLOWED_ORIGINS=https://app.contoh.com`), JANGAN `*`. Berlaku FastAPI (`CORSMiddleware`), Django (`django-cors-headers`), Laravel (`config/cors.php`). Bonus: header `X-Forwarded-For` (asal-IP klaim klien) mudah dipalsukan — jangan dipercaya buta untuk rate-limit/blokir-IP; set `trusted_proxies` ke rentang IP proxy spesifik, bukan `*`. Sadar-versi: nama setelan berubah antar-versi (django-cors-headers `CORS_ORIGIN_WHITELIST` lama → `CORS_ALLOWED_ORIGINS` v3+) — cek dok versi terpasang.
- 🔒 **HASIL — 🚨 Next.js: middleware ≠ satu-satunya penjaga login (CVE-2025-29927, CVSS 9.1 KRITIS).** CVE = nomor resmi celah keamanan yang diumumkan publik. Celahnya: penyerang cukup menambahkan header `x-middleware-subrequest` ke permintaannya untuk **melewati SELURUH cek login/izin yang hanya ada di middleware** (berkas middleware `proxy.ts`/`middleware.ts`, `skills/next-core/SKILL.md`). Mitigasi WAJIB & berlapis: (1) **upgrade Next.js** ke versi patch (12.3.5 / 13.5.9 / 14.2.25 / 15.2.3 ke atas) — cek nomor `next` di `package.json` vs advisory resmi NVD/Next.js, JANGAN tebak; (2) **jangan jadikan middleware satu-satunya lapisan otorisasi** — cek ulang auth + hak-akses DI DALAM route handler / Server Action + andalkan RLS database (`skills/supabase-prisma/SKILL.md`), jadi kalau lapisan depan tertembus masih ada lapisan otorisasi tambahan di belakang (defense-in-depth = pertahanan berlapis); (3) opsional: setel proxy/WAF (penyaring di depan server) untuk MEMBUANG header `x-middleware-subrequest` dari permintaan luar.

---

## 2. Cara rakit (mekanisme — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

Empat mekanisme baku — DETAIL lengkap (sub-butir + resep per-framework) → baca `skills/owasp/rujukan/cara-rakit.md` (kapan: menggarap kode auth/token/upload/login, atau butuh daftar pola bahaya lengkap):
1. 📐 **Pola bahaya yang langsung di-flag** — ketemu `innerHTML = userInput` · `fetch(userProvidedUrl)` · SQL string-concat · cek-saldo tanpa lock · password plaintext · route tanpa cek auth = tandai risiko tinggi.
2. 📐 **Token = scoped, bukan "login → boleh semua"** — abilities/scopes + expiry, dipaksa cek per-route; pisahkan 401 (belum login) vs 403 (tak berhak).
3. 📐 **File upload aman (5 pagar inti + 4 lanjutan)** — rumah kanonis "upload aman"; rak `unggah-berkas` mengarah ke sini.
4. 📐 **Auth kuat** — cek-password-bocor (k-anonymity) + regenerasi ID sesi saat login + blokir email sekali-pakai + rate-limit per-akun DAN per-IP.

---

## 3. Powerful — kelas kerentanan yang gampang terlewat (🧪 contoh/pola, ambil polanya — jangan salin mentah)

Detail kelas + mayoritas contoh dipindah on-demand:
- **Frontend & input + kelas "senyap"** (XSS `dangerouslySetInnerHTML` · prototype pollution · mass assignment · insecure deserialization · XXE · ReDoS · TOCTOU · open redirect · SSRF mendalam · path traversal/zip-slip · GraphQL) → baca `skills/owasp/rujukan/kelas-senyap.md` (kapan: review/menulis kode yang menyentuh salah satu kelas ini).
- **Contoh pola ❌→✅ lainnya** (fail-open A10:2025 · CORS credentials+origin · Next.js CVE-2025-29927) → baca `skills/owasp/rujukan/contoh-pola.md` (kapan: butuh pola kode siap-tiru sebelum menulis fix).

Pasangan PALING kritis dipertahankan di sini — 🧪 **Broken access / IDOR — Top 10 #1 (§1 butir 1)** — id di URL mudah ditebak; kepemilikan WAJIB jadi syarat query:

❌ **SALAH** (query hanya by id = siapa pun yang tahu id bisa baca data orang lain):
```ts
// GET /api/pesanan/[id] — route tanpa cek pemilik
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const p = await db.pesanan.findUnique({ where: { id: params.id } }) // ganti angka id → pesanan tetangga terbaca (IDOR)
  return Response.json(p)
}
```
✅ **BENAR** (401 kalau belum login + filter kepemilikan + 404 seragam):
```ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const sesi = await ambilSesi(req) // helper auth project — cek siapa pemanggil
  if (!sesi?.user) return new Response('Unauthorized', { status: 401 })
  const p = await db.pesanan.findFirst({ where: { id: params.id, userId: sesi.user.id } }) // pemilik ikut difilter
  if (!p) return new Response('Not Found', { status: 404 }) // "punya orang lain" & "tak ada" dibalas sama — tak bocor info
  return Response.json(p)
}
```

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai")

- [ ] OWASP Top 10:2025 dicek untuk fitur yang menyentuh input luar (broken access/IDOR, misconfig, supply chain, kripto, injection, insecure design, auth, deserialization, logging, fail-open)?
- [ ] `package-lock.json`/`poetry.lock` (dsb) di-commit + pemindai CVE (`npm audit`/`pip-audit`) jalan bersih?
- [ ] Blok `catch`/exception TIDAK ada yang fail-open (`return true` saat gagal cek izin)?
- [ ] CORS: kalau `allow_credentials=true`, origin **bukan** wildcard `*` — whitelist spesifik dari env?
- [ ] Next.js: versi `next` di atas ambang patch CVE-2025-29927 + otorisasi ADA di route handler/Server Action (bukan cuma middleware)?
- [ ] Token punya scope + expiry; 401 (belum login) tak tertukar 403 (tak berhak)?
- [ ] Upload: isi file dicek (magic bytes) + batas ukuran + TIDAK diserve dari `public` + signed URL berjangka + otorisasi dicek sebelum terbit URL + key/nama berkas acak server-side + SVG diblok/attachment + kredensial storage server-only?
- [ ] Login: cek password-bocor (k-anonymity) + regenerasi ID sesi saat login + blokir email sekali-pakai + rate-limit **per-akun DAN per-IP** (bukan IP saja) → 429 + `Retry-After`?
- [ ] `dangerouslySetInnerHTML`/`innerHTML`/`v-html` (kalau dipakai) disanitasi allowlist-tag di titik pemanggilan?
- [ ] Merge objek dari input luar menolak `__proto__`/`constructor`/`prototype`?
- [ ] Field yang ditulis ke DB di-allowlist (bukan spread body mentah — cegah mass assignment)?
- [ ] Deserialization tak-tepercaya TIDAK pakai `pickle.loads`/`yaml.load`/`unserialize`/`readObject` mentah; XML parser mematikan entitas eksternal (anti-XXE)?
- [ ] Regex dari/atas input user bebas nested-quantifier (anti-ReDoS)?
- [ ] Operasi cek-lalu-pakai (saldo dll) dibungkus transaksi+lock, bukan cek-lalu-tulis terpisah (anti TOCTOU)?
- [ ] Redirect (`?next=`) divalidasi ke allowlist internal (anti open-redirect)?
- [ ] URL yang dipanggil server dari input user (`fetch(userProvidedUrl)`) diallowlist host + blokir IP internal/metadata cloud (anti-SSRF)?
- [ ] Path/nama-berkas dari luar dinormalisasi + dicek tetap di dalam folder-dasar (anti path-traversal/zip-slip)?
- [ ] GraphQL (kalau dipakai): introspection OFF di prod + kedalaman/kompleksitas/batching dibatasi?

> **Verifikasi WAJIB cuma-baca**: membuktikan = baca kode + `Grep` + jalankan pemindai CVE (cuma-periksa) + menalar, JANGAN jalankan perintah yang mengubah data/produksi live.

---

## 5. Definition-of-Done (kapan skill OWASP dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** Top 10:2025 dicek + supply chain dipin+dipindai + tak ada fail-open + CORS tak wildcard+credentials + mitigasi CVE-2025-29927 (kalau Next.js) terpasang.
- [ ] **Edge case** ditangani: input jahat (XSS/prototype-pollution/mass-assignment), file upload disamarkan jadi tipe lain, URL luar diarahkan ke IP internal, path berisi `../`, request bertubi (rate-limit), sesi lama dipakai ulang setelah login baru.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Endpoint sensitif (auth/bayar/data-pribadi/upload) → rak ini sudah dibuka **sebelum** kontrak endpoint difinalkan (lihat `skills/backend/SKILL.md` §5 DoD).
- [ ] Pemindai CVE (`npm audit`/`pip-audit`) dijalankan + lulus/temuan ditindaklanjuti; `go.sum`/lockfile ter-commit.

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Kalau yang dibangun endpoint/API** (kontrak, otorisasi per-resource, status code) — **jangan dirancang ulang di sini** → `skills/backend/SKILL.md`.
- 📐 **Login/sesi/RBAC (Role-Based Access Control = atur izin lewat peran) / IDOR mendalam** → `skills/auth/SKILL.md`.
- 📐 **Struktur DB / RLS / lock baris (`FOR UPDATE`) / migrasi aman** → `skills/database/SKILL.md` (Supabase/Prisma spesifik → `skills/supabase-prisma/SKILL.md`).
- 📐 **Next.js (middleware/`proxy.ts`/Server Action)** → `skills/next-core/SKILL.md`.
- 📐 **Python (DRF `perform_create`, mass-assignment)** → `skills/python/SKILL.md`. **PHP/Laravel:** mass-assignment via `$fillable`/`$guarded`; CORS whitelist di `config/cors.php` (bukan `*`).
- 📐 **Upload berkas (5 pagar inti + 4 lanjutan: key acak server-side, SVG-handling, kredensial server-only, anti-abuse)** → §2 butir 3 (detail: `skills/owasp/rujukan/cara-rakit.md` butir 3).
- 📐 **Batas laju permintaan mendalam** (kunci per-identitas yang tepat, token-bucket atomik di penyimpanan terbagi, `429` + `Retry-After`, kebijakan fail-open/closed) → `skills/rate-limiting/SKILL.md`.
- 📐 **Panggilan API luar tahan-gagal** (retry/backoff/circuit-breaker, relevan untuk SSRF-safe fetch) → `skills/tahan-gagal/SKILL.md`.
- 📐 **Anti bayar-dobel / idempotency-key** (relevan untuk anti-TOCTOU pada saldo) → `skills/pembayaran/SKILL.md`.
- 🗃️ **LATAR — kredit (MIT © Affaan Mustafa):** pola CORS-aman + token-scoped/401-vs-403 + upload aman + auth-kuat (breach-check/session/disposable) diadaptasi dari skill/agen ECC v2.0.0 `fastapi-reviewer`, `laravel-security`, `fastapi-patterns`, `django-security`; kelas "senyap" (deserialization/XXE/ReDoS/TOCTOU/open-redirect/SSRF) dari `security-reviewer` + `perl-security`; pemicu path-traversal per-bahasa dari agen `typescript/python/go/php-reviewer` (mitigasi modern `os.OpenRoot`/`is_relative_to` BUKAN dari ECC — diverifikasi ke dok resmi Go/Python); frontend & mass-assignment (dangerouslySetInnerHTML/prototype-pollution) dari skill ECC `react` + `typescript-reviewer` + `laravel-security` (kelas universal diambil, sintaksis niche dibuang) — semua ditulis-ulang non-programmer + dinetralkan lintas-framework. CVE-2025-29927 & OWASP Top 10:2025 (A03/A10) = fakta publik NVD/OWASP, diverifikasi ke sumber resmi (bukan dari ECC).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** data user, sesi login, integritas tulisan, ketersediaan layanan publik. **Penyerang:** pengganti-ID (IDOR), penyuntik input (XSS/SQLi/prototype-pollution/mass-assignment), pembajak-sesi (session fixation, middleware-bypass CVE-2025-29927), pemalsu-lokasi (SSRF/open-redirect/path-traversal), pembanjir-request (rate-limit/ReDoS/GraphQL-batching), rantai-pasok-jahat (paket bervirus/slopsquatting). **Mitigasi:** Top 10:2025 dicek + supply-chain dipin&dipindai + default-deny saat error + CORS whitelist-spesifik + defense-in-depth (jangan andalkan satu lapis) + token scoped+expiry + upload 5-pagar + auth kuat (breach-check/session-regen/rate-limit) + allowlist untuk semua path/URL/field dari luar.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** keamanan web umum; **tidak menggantikan** penetration testing profesional atau audit keamanan pihak ketiga untuk produk berisiko tinggi (finansial/kesehatan/data-sensitif-masal). Nama flag/API/setelan berubah antar-versi framework — jangan salin contoh mentah dari internet/ingatan model.

🙂 **Non-Programmer:** OWASP Top 10 itu daftar 10 celah keamanan web paling berbahaya tahun ini, disusun oleh komunitas keamanan dunia berdasarkan serangan nyata yang berulang di banyak perusahaan — bukan teori. Skill ini menjaga produk dari serangan peretas dari luar — **pelengkap** mekanisme anti-AI-nakal lintasAI. Project profesional [expert] butuh KEDUANYA: pengaman dari serangan luar (skill ini) DAN pengaman dari AI yang keliru/disesatkan.
