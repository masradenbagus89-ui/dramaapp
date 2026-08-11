---
nama: owasp
deskripsi: Keamanan web OWASP kelas industri — XSS/CSRF/SSRF, rate-limit, CORS, upload aman, header keamanan, cek CVE.
divisi: stack
pemicu: [owasp, xss, csrf, ssrf, rate-limit]
rawan_keamanan: true
menggantikan: []
---

# Skill: OWASP — Keamanan Web kelas industri

> **Kapan skill ini aktif:** **WAJIB untuk produk publik** — project yang endpoint/halamannya dipakai orang luar (login, form, API, upload). Melengkapi divisi Cyber Security (§4.13 #7 di CLAUDE.md). Teks "owasp/xss/csrf/ssrf/rate-limit" jadi pemicu. Skill ini paket-stack: tarik pas-ukuran saat menggarap kode yang menyentuh input dari luar, DI ATAS standar inti (§5/§8).
>
> 🙂 **Analogi:** OWASP Top 10 = **daftar 10 modus pencurian paling umum yang dipakai satpam gedung untuk latihan** — bukan teori, tapi pola serangan yang benar-benar dipakai penjahat sungguhan tahun ini. Skill ini "satpam anti-peretas" untuk produk yang dipakai publik — **pelengkap** satpam "anti-AI-nakal" lintasAI (§8.1). Project profesional [expert] butuh DUA-DUANYA.

Skill ini **advisory** (§4.17): otak native yang memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = hasil keamanan yang tak boleh gagal apa pun caranya. Cek dokumentasi resmi **versi terpasang** (§8.2 A3) sebelum menaruh nama flag/API di kode — nama setelan berubah antar-versi framework.

---

## 1. Kontrak (yang HARUS benar — non-negotiable, WAJIB untuk produk publik)

- 🔒 **HASIL — Cek OWASP Top 10:2025** (daftar 10 celah web paling berbahaya sedunia, versi 2025) tiap kali membangun/mengubah fitur yang menyentuh input luar: broken access (otorisasi tiap route, cegah IDOR — kini #1), misconfig (debug OFF di prod + security headers), **supply chain (A03 — BARU, lihat butir di bawah)**, kripto lemah (hash bcrypt/argon2), injection (query parameterized + XSS escape+CSP), insecure design, auth lemah (sesi aman), integritas data/deserialization, logging+alerting, **fail-open (A10 — BARU, lihat di bawah)**.
- 🔒 **HASIL — A03:2025 Supply Chain (rantai pasok kode) — kini risiko #3 dunia.** App kita memakai puluhan paket buatan orang lain; satu paket jahat = seluruh app jebol. WAJIB: (1) **pin versi + commit lockfile** (`package-lock.json`/`poetry.lock`) supaya versi tak bergeser diam-diam; (2) **pemindai CVE otomatis** (`npm audit`/`pip-audit`; sudah dibungkus `npx lintasai stack-check`); (3) **dependency-confusion** — paket internal bisa "dibajak" oleh paket publik bernama sama (atur scope registry di `.npmrc`); (4) **slopsquatting** — pastikan paket yang disarankan AI benar ada + ejaan tepat (§8.2); (5) opsional **SBOM** (daftar-isi semua paket) untuk respons cepat saat ada celah paket. (🙂 periksa tiap "bahan baku" dari pemasok sebelum masuk dapur — satu bahan busuk merusak seluruh masakan.)
- 🔒 **HASIL — A10:2025 Mishandling Exceptional Conditions (salah menangani kondisi tak-terduga) — kategori BARU 2025.** Saat error/timeout/input aneh, sistem harus **gagal-AMAN (default-deny)**, JANGAN **fail-open** (malah membuka akses / melewati cek ketika gagal). Contoh bahaya: fungsi cek-izin yang di blok `catch`-nya malah `return true`; verifikasi token yang saat timeout diloloskan. WAJIB: tangani exception eksplisit + default MENOLAK; jangan `catch` kosong (§5). (🙂 kalau alat pendeteksi di pintu rusak, pintu harus otomatis TERKUNCI, bukan otomatis terbuka.)
- 🔒 **HASIL — CORS `allow_origins=['*']` + credentials = jebakan kombinasi berbahaya.** CORS (Cross-Origin Resource Sharing = aturan situs asal-domain mana yang boleh memanggil API-mu) dengan wildcard `*` DIGABUNG `allow_credentials=true` membuat browser ikut mengirim cookie/token login ke origin mana pun — pintu pencurian sesi. WAJIB: saat credentials ON, whitelist origin SPESIFIK dari env (`CORS_ALLOWED_ORIGINS=https://app.contoh.com`), JANGAN `*`. Berlaku FastAPI (`CORSMiddleware`), Django (`django-cors-headers`), Laravel (`config/cors.php`). Bonus: header `X-Forwarded-For` (asal-IP klaim klien) mudah dipalsukan — jangan dipercaya buta untuk rate-limit/blokir-IP; set `trusted_proxies` ke rentang IP proxy spesifik, bukan `*`. Sadar-versi: nama setelan berubah antar-versi (django-cors-headers `CORS_ORIGIN_WHITELIST` lama → `CORS_ALLOWED_ORIGINS` v3+) — cek dok versi terpasang. (🙂 satpam yang membolehkan SIAPA PUN masuk sambil menyerahkan kunci brankas — tulis daftar tamu, jangan "semua".)
- 🔒 **HASIL — 🚨 Next.js: middleware ≠ satu-satunya penjaga login (CVE-2025-29927, CVSS 9.1 KRITIS).** CVE = nomor resmi celah keamanan yang diumumkan publik. Celahnya: penyerang cukup menambahkan header `x-middleware-subrequest` ke permintaannya untuk **melewati SELURUH cek login/izin yang hanya ada di middleware** (berkas "satpam pintu masuk" `proxy.ts`/`middleware.ts`, `skills/nextjs/SKILL.md`). Mitigasi WAJIB & berlapis: (1) **upgrade Next.js** ke versi patch (12.3.5 / 13.5.9 / 14.2.25 / 15.2.3 ke atas) — cek nomor `next` di `package.json` vs advisory resmi NVD/Next.js, JANGAN tebak; (2) **jangan jadikan middleware satu-satunya lapisan otorisasi** — cek ulang auth + hak-akses DI DALAM route handler / Server Action + andalkan RLS database (`skills/supabase-prisma/SKILL.md`), jadi kalau satpam depan tertembus masih ada satpam dalam (defense-in-depth = pertahanan berlapis); (3) opsional: setel proxy/WAF (penyaring di depan server) untuk MEMBUANG header `x-middleware-subrequest` dari permintaan luar. (🙂 jangan pasang SATU satpam di gerbang lalu percaya penuh — ternyata gerbangnya punya "pintu rahasia" tersembunyi; taruh juga satpam di tiap ruangan penting.)

---

## 2. Cara rakit (mekanisme — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **Pola bahaya yang langsung di-flag** (kalau ketemu pola ini di kode, tandai sebagai risiko tinggi): `innerHTML = userInput`, `fetch(userProvidedUrl)`, SQL string-concat, cek-saldo tanpa lock (`FOR UPDATE`), password plaintext, route tanpa cek auth.
2. 📐 **Token = scoped (izin terbatas), bukan "login → boleh semua"; pisahkan 401 vs 403.** Terbitkan token dengan daftar kemampuan (abilities/scopes = daftar izin, mis. `['posts:read']`) lalu PAKSA cek per-route (route tulis menolak token yang cuma boleh baca). Bedakan: **401 Unauthorized** = belum login / token tak sah / kadaluarsa; **403 Forbidden** = sudah login TAPI tak berhak (jangan ditukar — salah kode bikin klien "login ulang" padahal masalahnya izin). Token WAJIB punya masa-berlaku (expiry) eksplisit. Pisahkan cek "siapa kamu" (auth → 401) dari "boleh tidak" (otorisasi → 403). (🙂 kartu akses gedung yang cuma membuka lantai tertentu + ada tanggal kadaluarsa; "belum punya kartu" ≠ "punya kartu tapi lantai ini terlarang".)
3. 📐 **File upload aman (5 pagar):** upload = titik risiko tinggi.
   1. **Periksa ISI file (magic bytes), bukan MIME/nama dari browser** — cross-check ekstensi vs isi (Python `python-magic`, atau paket `filetype` pure-Python kalau container tanpa `libmagic`; Laravel rule `mimes:`/`extensions:`).
   2. **Batas ukuran** wajib.
   3. **JANGAN simpan/serve dari folder `public`** (path traversal + eksekusi skrip jahat).
   4. Simpan **private/S3**, akses lewat **signed URL berjangka** (mis. 15 menit).
   5. **Cek OTORISASI dulu**, baru terbitkan URL.

   (🙂 periksa ISI amplop, bukan tulisan di luarnya; simpan di gudang terkunci + beri tiket sementara hanya ke yang berhak.)
4. 📐 **Auth kuat: cek-password-bocor + regenerasi sesi + blokir email sekali-pakai.**
   1. **Tolak password yang sudah bocor** — cek ke database kebocoran pakai *k-anonymity* (kirim hanya 5 huruf awal hash SHA-1 ke HaveIBeenPwned; password utuh TAK dikirim).
   2. 🚨 **Regenerasi ID sesi saat login** + hapus/regenerasi token saat logout — cegah *session fixation* (peretas menanam ID sesi sebelum korban login lalu ikut masuk).
   3. **Blokir domain email sekali-pakai** (mailinator dll) via daftar dari env.
   4. Rate-limit login **5/menit per-IP → 429** (baseline §8/§4.13; jangan percaya `X-Forwarded-For` buta).

   Sumber Laravel — netralkan ke stack terpasang (helper regenerasi sesi beda tiap framework). (🙂 tolak password yang sudah pernah bocor + "ganti nomor kunci" tiap login supaya kunci lama yang mungkin dicuri jadi tak berguna.)

🙂 **Non-Programmer (dari sumber asli):** ini "satpam anti-peretas" untuk produk yang dipakai publik — **pelengkap** satpam "anti-AI-nakal" lintasAI (§8.1). Project profesional [expert] butuh DUA-DUANYA.

---

## 3. Powerful — kelas kerentanan yang gampang terlewat (🧪 contoh/pola, ambil polanya — jangan salin mentah)

### 🧪 Frontend & input — 3 kelas sering terlewat

- **XSS via `dangerouslySetInnerHTML` (React) / `innerHTML` / `v-html`:** kalau WAJIB render HTML dari user, **sanitasi di TITIK PEMANGGILAN** pakai sanitizer teruji (mis. DOMPurify) dengan **allowlist tag** (daftar tag yang BOLEH), bukan denylist (daftar yang dilarang — selalu ada celah baru). Sanitasi di boundary API hanya aman kalau SEMUA pemakainya terverifikasi. Idealnya render sebagai teks / markdown yang otomatis di-sanitasi. (🙂 kalau harus menempel "tulisan tamu" ke dinding, saring dulu lewat penyaring resmi — jangan percaya tulisan mentah.)
- **Prototype pollution (JS/TS):** menggabung objek tak-tepercaya (`Object.assign`/library `merge`/parser query) bisa menyuntik `__proto__` → mengubah perilaku SEMUA objek app (bisa berujung XSS/bypass). Tolak key `__proto__`/`constructor`/`prototype`; pakai `Object.create(null)` untuk map; validasi skema (Zod) sebelum merge. (🙂 satu formulir jahat bisa "mengubah cetakan pabrik" semua objek — periksa dulu isian sebelum digabung.)
- **Mass assignment:** user menyuntik field terlarang (`is_admin=true`, `role=owner`) lewat body request. **Allowlist field** yang boleh ditulis — jangan spread body mentah ke DB. Prisma/TS: `data: { name, email }` eksplisit, BUKAN `data: req.body`. (DRF sudah dibahas `skills/python/SKILL.md` `perform_create`; Laravel `$fillable` `skills/php/SKILL.md`.) (🙂 isi formulir pendaftaran hanya kolom yang disediakan — jangan biarkan pelamar menambah kolom "jabatan: direktur" sendiri.)

### 🧪 Kelas kerentanan "senyap" — tak tertangkap scanner biasa, cek manual saat relevan

- **Insecure deserialization** (A08): JANGAN memulihkan objek dari data tak-tepercaya via `pickle.loads`/`yaml.load` (Python) · `unserialize` (PHP) · `readObject` (Java) — bisa jadi eksekusi kode jahat. Pakai format data pasif (JSON) + validasi skema; kalau wajib YAML → `yaml.safe_load`.
- **XXE (XML External Entity)** = parser XML yang mengizinkan "entitas eksternal" bisa dipaksa membaca file server / memicu SSRF. Matikan entitas eksternal (Python: paket `defusedxml` — cek registry dulu; PHP: libxml 2.9+ default aman; Java: `FEATURE_SECURE_PROCESSING`). Cek dok versi terpasang.
- **ReDoS (Regex Denial-of-Service)** = pola regex dengan kuantifier bersarang (`(a+)+`, `(.*)*`) pada input user bisa dibuat "macet" (CPU 100% → situs tumbang). Hindari nested quantifier; batasi panjang input; pakai timeout/engine regex aman.
- **TOCTOU / race bernama** (Time-Of-Check-To-Time-Of-Use = celah antara "memeriksa" dan "memakai"): cek saldo cukup → (jeda) → potong saldo; dua permintaan barengan bikin saldo minus. Bungkus cek+aksi dalam satu transaksi + kunci baris (`FOR UPDATE`, `skills/supabase-prisma/SKILL.md`) atau operasi atomik/idempoten (§5).
- **Open redirect**: `?next=<url>` yang langsung dipakai untuk redirect bisa mengarahkan korban ke situs phishing atas nama domainmu. Validasi tujuan ke **allowlist path/host internal**; tolak URL absolut eksternal.
- **SSRF mendalam** (Server-Side Request Forgery = server dipaksa memanggil URL pilihan penyerang; lengkapi `fetch(userProvidedUrl)` di §2 butir 1): allowlist host tujuan + **blokir IP internal & endpoint metadata cloud** (`169.254.169.254`, `localhost`, rentang privat) + jangan ikuti redirect ke alamat internal. (🙂 kalau server bisa "disuruh menelepon nomor mana pun" oleh pengguna, ia bisa dipakai menelepon 'brankas internal' perusahaan.)
- **Path traversal di LUAR upload** (sisi upload sudah dijaga `skills/upload-storage/SKILL.md`): tiap path/nama-berkas dari luar (URL, query, body, nama entri arsip) yang dipakai MEMBACA/MENULIS berkas — endpoint download/ekspor, penyaji berkas statik, pemilih template — bisa diselundupi `../../.env` (termasuk versi ter-encode `..%2F`, kadang perlu decode ganda baru kelihatan). Pola benar berurutan:
  1. **TERBAIK — user tak mengirim path sama sekali**: peta ID→path di server (allowlist);
  2. **terpaksa terima nama**: gabung ke folder-dasar → **normalisasi ke path absolut → TOLAK kalau hasil akhirnya keluar folder-dasar**;
  3. jangan cuma menolak string `..` (mudah dikaburkan encoding).

  Resep per-bahasa (API dicek ke dok resmi 2026-07): **Node/TS** `const p = path.resolve(BASE, input)` lalu tolak kecuali `p.startsWith(BASE + path.sep)`; **Python 3.9+** `Path(BASE, input).resolve()` lalu wajib `.is_relative_to(Path(BASE).resolve())`; **Go** terbaik `os.OpenRoot(BASE)` (Go 1.24+ — sekalian tahan symlink) atau `filepath.IsLocal(input)` (Go 1.20+, murni leksikal — TIDAK melindungi dari symlink); **PHP/Laravel** `realpath()` + cek awalan, atau kunci lewat disk `Storage` ber-nama-buatan-server. **Varian zip-slip:** entri arsip bernama `../../x` menimpa berkas di luar folder tujuan saat ekstraksi — terapkan cek yang sama pada path hasil-gabung TIAP entri SEBELUM menulis. (🙂 penipu menulis alamat rak "../../ruang-brankas" di slip pengambilan — petugas wajib memastikan alamat rak HASIL AKHIRNYA masih di dalam gudang yang diizinkan.)
- 💡 SARAN — **GraphQL (kalau dipakai — mis. Supabase `pg_graphql`):** matikan **introspection** (fitur yang membocorkan seluruh skema API) di produksi; batasi **kedalaman + kompleksitas + batching** query (satu request bisa minta ribuan data sekaligus = DoS/brute-force teramplifikasi); rate-limit + cek otorisasi per-field. Banyak tim Supabase pakai REST/PostgREST → cek dulu apakah GraphQL benar dipakai sebelum pasang pagar ini.

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

- [ ] OWASP Top 10:2025 dicek untuk fitur yang menyentuh input luar (broken access/IDOR, misconfig, supply chain, kripto, injection, insecure design, auth, deserialization, logging, fail-open)?
- [ ] `package-lock.json`/`poetry.lock` (dsb) di-commit + pemindai CVE (`npm audit`/`pip-audit`/`npx lintasai stack-check`) jalan bersih?
- [ ] Blok `catch`/exception TIDAK ada yang fail-open (`return true` saat gagal cek izin)?
- [ ] CORS: kalau `allow_credentials=true`, origin **bukan** wildcard `*` — whitelist spesifik dari env?
- [ ] Next.js: versi `next` di atas ambang patch CVE-2025-29927 + otorisasi ADA di route handler/Server Action (bukan cuma middleware)?
- [ ] Token punya scope + expiry; 401 (belum login) tak tertukar 403 (tak berhak)?
- [ ] Upload: isi file dicek (magic bytes) + batas ukuran + TIDAK diserve dari `public` + signed URL berjangka + otorisasi dicek sebelum terbit URL?
- [ ] Login: cek password-bocor (k-anonymity) + regenerasi ID sesi saat login + blokir email sekali-pakai + rate-limit 5/menit/IP?
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

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan = baca kode + `Grep` + jalankan pemindai CVE (cuma-periksa) + menalar, JANGAN jalankan perintah yang mengubah data/produksi live.

---

## 5. Definition-of-Done (kapan skill OWASP dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** Top 10:2025 dicek + supply chain dipin+dipindai + tak ada fail-open + CORS tak wildcard+credentials + mitigasi CVE-2025-29927 (kalau Next.js) terpasang.
- [ ] **Edge case** ditangani: input jahat (XSS/prototype-pollution/mass-assignment), file upload disamarkan jadi tipe lain, URL luar diarahkan ke IP internal, path berisi `../`, request bertubi (rate-limit), sesi lama dipakai ulang setelah login baru.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Endpoint sensitif (auth/bayar/data-pribadi/upload) → rak ini sudah dibuka **sebelum** kontrak endpoint difinalkan (lihat `skills/backend/SKILL.md` §5 DoD).
- [ ] Pemindai CVE (`npm audit`/`pip-audit`/`npx lintasai stack-check`) dijalankan + lulus/temuan ditindaklanjuti; `go.sum`/lockfile ter-commit.
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** — "selesai" = terbukti dengan bukti, bukan "sudah kuubah + kelihatannya benar".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Kalau yang dibangun endpoint/API** (kontrak, otorisasi per-resource, status code) — **jangan dirancang ulang di sini** → `skills/backend/SKILL.md`.
- 📐 **Login/sesi/RBAC (Role-Based Access Control = atur izin lewat peran) / IDOR mendalam** → `skills/auth/SKILL.md`.
- 📐 **Struktur DB / RLS / lock baris (`FOR UPDATE`) / migrasi aman** → `skills/database/SKILL.md` (Supabase/Prisma spesifik → `skills/supabase-prisma/SKILL.md`).
- 📐 **Next.js (middleware/`proxy.ts`/Server Action)** → `skills/nextjs/SKILL.md`.
- 📐 **Python (DRF `perform_create`, mass-assignment)** → `skills/python/SKILL.md`. **PHP/Laravel (`$fillable`, `config/cors.php`)** → `skills/php/SKILL.md`.
- 📐 **Upload berkas (5 pagar detail penyimpanan/signed-URL)** → `skills/upload-storage/SKILL.md`.
- 📐 **Panggilan API luar tahan-gagal** (retry/backoff/circuit-breaker, relevan untuk SSRF-safe fetch) → `skills/tahan-gagal/SKILL.md`.
- 📐 **Anti bayar-dobel / idempotency-key** (relevan untuk anti-TOCTOU pada saldo) → `skills/pembayaran/SKILL.md`.
- 🗃️ **LATAR — kredit (MIT © Affaan Mustafa):** pola CORS-aman + token-scoped/401-vs-403 + upload aman + auth-kuat (breach-check/session/disposable) diadaptasi dari skill/agen ECC v2.0.0 `fastapi-reviewer`, `laravel-security`, `fastapi-patterns`, `django-security`; kelas "senyap" (deserialization/XXE/ReDoS/TOCTOU/open-redirect/SSRF) dari `security-reviewer` + `perl-security`; pemicu path-traversal per-bahasa dari agen `typescript/python/go/php-reviewer` (mitigasi modern `os.OpenRoot`/`is_relative_to` BUKAN dari ECC — diverifikasi ke dok resmi Go/Python); frontend & mass-assignment (dangerouslySetInnerHTML/prototype-pollution) dari `rules/react` + `typescript-reviewer` + `laravel-security` (kelas universal diambil, sintaksis niche dibuang) — semua ditulis-ulang non-programmer + dinetralkan lintas-framework. CVE-2025-29927 & OWASP Top 10:2025 (A03/A10) = fakta publik NVD/OWASP, diverifikasi ke sumber resmi (bukan dari ECC).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** data user, sesi login, integritas tulisan, ketersediaan layanan publik. **Penyerang:** pengganti-ID (IDOR), penyuntik input (XSS/SQLi/prototype-pollution/mass-assignment), pembajak-sesi (session fixation, middleware-bypass CVE-2025-29927), pemalsu-lokasi (SSRF/open-redirect/path-traversal), pembanjir-request (rate-limit/ReDoS/GraphQL-batching), rantai-pasok-jahat (paket bervirus/slopsquatting). **Mitigasi:** Top 10:2025 dicek + supply-chain dipin&dipindai + default-deny saat error + CORS whitelist-spesifik + defense-in-depth (jangan andalkan satu lapis) + token scoped+expiry + upload 5-pagar + auth kuat (breach-check/session-regen/rate-limit) + allowlist untuk semua path/URL/field dari luar.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** keamanan web umum; **tidak menggantikan** penetration testing profesional atau audit keamanan pihak ketiga untuk produk berisiko tinggi (finansial/kesehatan/data-sensitif-masal). Nama flag/API/setelan berubah antar-versi framework — cek dokumentasi resmi **versi terpasang** (§8.2 A3) sebelum menaruhnya di kode, jangan salin contoh mentah dari internet/ingatan model.

🙂 **Non-Programmer:** OWASP Top 10 itu daftar 10 modus pencurian paling umum di web tahun ini, disusun oleh komunitas keamanan dunia — bukan teori, tapi kejadian nyata yang berulang di banyak perusahaan. Skill ini "satpam anti-peretas" untuk produk yang dipakai publik — **pelengkap** satpam "anti-AI-nakal" lintasAI (§8.1). Project profesional [expert] butuh DUA-DUANYA: satpam yang menjaga dari serangan luar (skill ini) DAN satpam yang menjaga dari AI yang keliru/disesatkan (§8.1).
