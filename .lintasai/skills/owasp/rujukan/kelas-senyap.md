# Kelas kerentanan yang gampang terlewat — frontend & input + kelas "senyap"

> Bagian dari `skills/owasp` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
> Isi detail §3 SKILL.md (🧪 contoh/pola — ambil polanya, jangan salin mentah): kelas yang tak tertangkap scanner biasa.

### 🧪 Frontend & input — 3 kelas sering terlewat

- **XSS via `dangerouslySetInnerHTML` (React) / `innerHTML` / `v-html`:** kalau WAJIB render HTML dari user, **sanitasi di TITIK PEMANGGILAN** pakai sanitizer teruji (mis. DOMPurify) dengan **allowlist tag** (daftar tag yang BOLEH), bukan denylist (daftar yang dilarang — selalu ada celah baru). Sanitasi di boundary API hanya aman kalau SEMUA pemakainya terverifikasi. Idealnya render sebagai teks / markdown yang otomatis di-sanitasi.
- **Prototype pollution (JS/TS):** menggabung objek tak-tepercaya (`Object.assign`/library `merge`/parser query) bisa menyuntik `__proto__` → mengubah perilaku SEMUA objek app (bisa berujung XSS/bypass). Tolak key `__proto__`/`constructor`/`prototype`; pakai `Object.create(null)` untuk map; validasi skema (Zod) sebelum merge.
- **Mass assignment:** user menyuntik field terlarang (`is_admin=true`, `role=owner`) lewat body request. **Allowlist field** yang boleh ditulis — jangan spread body mentah ke DB. Prisma/TS: `data: { name, email }` eksplisit, BUKAN `data: req.body`. (DRF sudah dibahas `skills/python/SKILL.md` `perform_create`; Laravel: whitelist kolom via `$fillable`/`$guarded`, jangan simpan body mentah.)

### 🧪 Kelas kerentanan "senyap" — tak tertangkap scanner biasa, cek manual saat relevan

- **Insecure deserialization** (A08): JANGAN memulihkan objek dari data tak-tepercaya via `pickle.loads`/`yaml.load` (Python) · `unserialize` (PHP) · `readObject` (Java) — bisa jadi eksekusi kode jahat. Pakai format data pasif (JSON) + validasi skema; kalau wajib YAML → `yaml.safe_load`.
- **XXE (XML External Entity)** = parser XML yang mengizinkan "entitas eksternal" bisa dipaksa membaca file server / memicu SSRF. Matikan entitas eksternal (Python: paket `defusedxml` — cek registry dulu; PHP: libxml 2.9+ default aman; Java: `FEATURE_SECURE_PROCESSING`).
- **ReDoS (Regex Denial-of-Service)** = pola regex dengan kuantifier bersarang (`(a+)+`, `(.*)*`) pada input user bisa dibuat "macet" (CPU 100% → situs tumbang). Hindari nested quantifier; batasi panjang input; pakai timeout/engine regex aman.
- **TOCTOU / race bernama** (Time-Of-Check-To-Time-Of-Use = celah antara "memeriksa" dan "memakai"): cek saldo cukup → (jeda) → potong saldo; dua permintaan barengan bikin saldo minus. Bungkus cek+aksi dalam satu transaksi + kunci baris (`FOR UPDATE`, `skills/supabase-prisma/SKILL.md`) atau operasi atomik/idempoten.
- **Open redirect**: `?next=<url>` yang langsung dipakai untuk redirect bisa mengarahkan korban ke situs phishing atas nama domainmu. Validasi tujuan ke **allowlist path/host internal**; tolak URL absolut eksternal.
- **SSRF mendalam** (Server-Side Request Forgery = server dipaksa memanggil URL pilihan penyerang; lengkapi `fetch(userProvidedUrl)` di `skills/owasp/rujukan/cara-rakit.md` butir 1): allowlist host tujuan + **blokir IP internal & endpoint metadata cloud** (`169.254.169.254`, `localhost`, rentang privat) + jangan ikuti redirect ke alamat internal.
- **Path traversal di LUAR upload** (sisi upload sudah dijaga "5 pagar + lanjutan" — `skills/owasp/rujukan/cara-rakit.md` butir 3): tiap path/nama-berkas dari luar (URL, query, body, nama entri arsip) yang dipakai MEMBACA/MENULIS berkas — endpoint download/ekspor, penyaji berkas statik, pemilih template — bisa diselundupi `../../.env` (termasuk versi ter-encode `..%2F`, kadang perlu decode ganda baru kelihatan). Pola benar berurutan:
  1. **TERBAIK — user tak mengirim path sama sekali**: peta ID→path di server (allowlist);
  2. **terpaksa terima nama**: gabung ke folder-dasar → **normalisasi ke path absolut → TOLAK kalau hasil akhirnya keluar folder-dasar**;
  3. jangan cuma menolak string `..` (mudah dikaburkan encoding).

  Resep per-bahasa (API dicek ke dok resmi 2026-07): **Node/TS** `const p = path.resolve(BASE, input)` lalu tolak kecuali `p.startsWith(BASE + path.sep)`; **Python 3.9+** `Path(BASE, input).resolve()` lalu wajib `.is_relative_to(Path(BASE).resolve())`; **Go** terbaik `os.OpenRoot(BASE)` (Go 1.24+ — sekalian tahan symlink) atau `filepath.IsLocal(input)` (Go 1.20+, murni leksikal — TIDAK melindungi dari symlink); **PHP/Laravel** `realpath()` + cek awalan, atau kunci lewat disk `Storage` ber-nama-buatan-server. **Varian zip-slip:** entri arsip bernama `../../x` menimpa berkas di luar folder tujuan saat ekstraksi — terapkan cek yang sama pada path hasil-gabung TIAP entri SEBELUM menulis.
- 💡 SARAN — **GraphQL (kalau dipakai — mis. Supabase `pg_graphql`):** matikan **introspection** (fitur yang membocorkan seluruh skema API) di produksi; batasi **kedalaman + kompleksitas + batching** query (satu request bisa minta ribuan data sekaligus = DoS/brute-force teramplifikasi); rate-limit + cek otorisasi per-field. Banyak tim Supabase pakai REST/PostgREST → cek dulu apakah GraphQL benar dipakai sebelum pasang pagar ini.
