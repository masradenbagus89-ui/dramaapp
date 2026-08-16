---
nama: backend
deskripsi: Logika & API sisi-server kelas industri — kontrak dulu, validasi di boundary, otorisasi per-resource (anti-IDOR), status code benar, error tak ditelan.
divisi: backend
pemicu: [endpoint, backend, rest-api, server-action, controller, handler, route-handler, crud, tampilkan-data, ambil-data, daftar-pelanggan, daftar-pesanan, openapi, graphql, paginasi, repository, double-booking, laporan-penjualan, export-excel, pencarian-produk]
rawan_keamanan: true
menggantikan: []
---

# Skill: Backend — logika & API sisi-server (kelas industri)

> `rawan_keamanan: true` → skill ini **sangat disarankan dibuka sebelum edit pertama** berkas endpoint/route, karena kesalahan otorisasi di sini = kebocoran data yang **senyap** (tak kelihatan di layar).
>
> **Inti:** endpoint = alamat API yang bisa dipanggil aplikasi lain (mis. `/api/pesanan`). Kontrak = ketentuan tertulis untuk tiap endpoint (apa yang wajib dikirim, apa yang dikembalikan, alasan kalau ditolak). Otorisasi per-resource = server **wajib memverifikasi** bahwa data yang diminta memang milik user yang meminta — bukan langsung diberikan ke siapa pun yang menyebut ID-nya.

Butir **🔒 HASIL** = hasil keselamatan yang tak boleh gagal apa pun caranya.

---

## 1. Kontrak (yang HARUS benar — tulis DULU sebelum koding)

- 🔒 **HASIL — bentuk data yang menyeberang (tulis kontrak tiap endpoint/fungsi publik):**
  - **Input:** apa yang diterima (jenis + wajib/opsional) — dan dari mana (body/query/header/URL). Semua = **data tak-tepercaya** sampai divalidasi.
  - **Output:** bentuk respons yang konsisten (amplop: sukses + data + error + info paginasi) — sama untuk semua endpoint, jangan tiap endpoint beda bentuk.
  - **Error + status:** kode status HTTP **BENAR** (200/201/204 · 400 · 401 · 403 · 404 · 409 · 410 · 422 · 429 · 500 · 502/503) — **JANGAN kirim semua sebagai 200** (klien tak bisa bedakan sukses dari gagal). 201 = data dibuat, **sertakan header `Location: /v1/<resource>/<id>`** (klien langsung tahu alamat data barunya, tak perlu menebak) · 204 = sukses **tanpa isi** (DELETE/PUT yang tak mengembalikan data — bukan 200 ber-body kosong) · **400 = permintaan tak bisa DIBACA sama sekali** (JSON rusak, parameter/header wajib hilang — gagal sebelum validasi isi dimulai) · 401 = belum login · 403 = login tapi tak berhak · 404 = tak ada · 409 = bentrok · 410 = dulu ada, kini dihapus permanen (endpoint di-sunset) · **422 = permintaan terbaca tapi ISINYA tak lolos validasi** (email tak sah, harga negatif) — **pilih SATU: kegagalan validasi skema = 422, jangan campur dengan 400** · 429 = kebanyakan permintaan, **sertakan `Retry-After`** (klien butuh tahu KAPAN boleh coba lagi; detail kebijakan → `skills/rate-limiting/SKILL.md`) · **500 = kesalahan tak-terduga di server** — balas pesan generik, detail internal (stack trace, pesan SQL) TIDAK ikut keluar · 502 = layanan hulu (*upstream* = layanan lain yang kamu panggil) gagal · 503 = kelebihan beban/perawatan, **sertakan `Retry-After`** supaya klien mundur terjadwal, bukan menyerbu ulang.
    - ⚠️ Pengecualian yang sudah diketahui: **DRF dengan `SessionAuthentication`** membalas **403** untuk pengunjung anonim, bukan 401 → `skills/python/SKILL.md`. Cek setelan project dulu sebelum menulis tes yang meng-assert 401.
  - **Rahasia:** secret/token/PII (*Personally Identifiable Information* = data pribadi yang bisa mengidentifikasi orang: email/no.HP/KTP/nomor kartu) **TAK PERNAH** masuk log atau body respons error.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

Detail 10 butir + contoh kodenya dipindah ke berkas rujukan on-demand (nomor butir asli dipertahankan di sana) — buka yang relevan dengan tugasmu:

| Butir | Ringkasan | -> Baca |
|---|---|---|
| 1–2 | Validasi SEMUA input di boundary (🔒 query ke DB pakai parameter/prepared statement, anti SQL-injection) + 🔒 otorisasi per-resource dari sesi server-side (anti-IDOR) + amplop respons seragam. | `skills/backend/rujukan/validasi-otorisasi.md` (kapan: bikin/edit endpoint APA PUN yang menerima input atau menyentuh data ber-pemilik) |
| 3–4 | Multi-tulis atomik/idempoten + Desain API rapi (REST): penamaan URL, konvensi query-param, paginasi, 🔒 anti `SELECT *`, anti N+1, `ETag`/🔒 `If-Match`, tabel method HTTP, deprecation/versi. | `skills/backend/rujukan/desain-api.md` (kapan: menentukan bentuk URL/respons/versi, list besar, atau data yang diedit >1 orang) |
| 5 | Jangan telan error: kelas error (gagal-dunia-nyata vs bug sendiri), 🔒 `{ cause: e }`, log penuh SEKALI di boundary, `await` wajib. | `skills/backend/rujukan/penanganan-error.md` (kapan: menulis `try/catch`, log, atau kode async) |
| 6–10 | Layanan luar rapuh (retry+saklar), kerja berat ke antrean, modul dalam & 3 lapis (Repository·Service·Middleware, 🔒 middleware bukan satu-satunya cek izin), Law of Demeter, `switch` berulang → tabel/factory. | `skills/backend/rujukan/arsitektur-modul.md` (kapan: menyusun lapisan/struktur modul atau memanggil layanan luar) |

---

## 3. Powerful — amplop respons + guard yang paling berdaya-ungkit

Dua penghemat bug terbesar di backend: amplop respons seragam + titik cek otorisasi tunggal (penjelasan + contoh `Ok`/`Err` + guard 401/403/404 + validasi-di-atas-handler -> baca `skills/backend/rujukan/validasi-otorisasi.md`; kapan: mulai menulis handler). Error ber-tipe + SATU penerjemah di pintu keluar (+ gotcha `instanceof` ES5 · gaya `Result`) -> baca `skills/backend/rujukan/penanganan-error.md` (kapan: menyusun `catch`/status code).

### Contoh pola ❌→✅ (ambil POLANYA, jangan salin mentah — cek versi paket/provider terpasang)

🧪 **Otorisasi per-resource dari sesi server-side, anti-IDOR (§2 butir 2 → `skills/backend/rujukan/validasi-otorisasi.md`)** — dipertahankan di inti karena inilah kebocoran paling senyap:

❌ **SALAH** ("milik siapa" ditentukan angka kiriman client = tinggal diganti):
```ts
// GET /api/pesanan?userId=42
const userId = Number(new URL(req.url).searchParams.get('userId'))
const data = await db.pesanan.findMany({ where: { ownerId: userId } })
return Response.json({ ok: true, data }) // ganti ?userId=43 → pesanan orang lain, bocor tanpa error (SENYAP)
```
✅ **BENAR** (identitas dari sesi terverifikasi server — client tak bisa memilih jadi siapa):
```ts
const user = await sesiTerverifikasi(req) // dari cookie/token yang DIVERIFIKASI server
if (!user) return json(401, { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Belum login' } })
const data = await db.pesanan.findMany({ where: { ownerId: user.id } }) // hanya milik user sesi ini
return Response.json({ ok: true, data })
```

Contoh ❌→✅ lain (SQL injection · `SELECT *`) ada di berkas rujukan topiknya masing-masing.

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai")

Jawab dengan bukti `berkas:baris` (tak bisa jawab → belum selesai):
- [ ] Tiap input dari luar **divalidasi di boundary** sebelum dipakai (uji: kirim tipe/nilai aneh → ditolak **422**; body yang tak bisa di-parse → **400**)?
- [ ] Otorisasi per-resource dari **sesi server-side** (uji IDOR: ganti ID di URL → apakah bisa lihat data orang lain?)?
- [ ] Query DB **parameterized** (tak ada string-concat SQL)?
- [ ] Status code **benar** per kasus (bukan semua 200)? Amplop respons **konsisten**?
- [ ] Multi-tulis **atomik/idempoten** (uji: jalankan 2× / potong di tengah → tak korup/dobel)?
- [ ] Tak ada `catch {}` kosong / fallback yang menyembunyikan kegagalan? Error di-log dengan konteks (tanpa secret)?
- [ ] Tiap `catch` sudah ditentukan **kelasnya** (gagal-dunia-nyata = ditangkap · bug kode sendiri = dibiarkan naik, bukan ditelan)?
- [ ] Error yang dibungkus **mengikat asalnya** (`{ cause: e }` / `from e`), dan dicatat penuh **sekali** di boundary (bukan log-lalu-lempar berlapis di tiap lapis)?
- [ ] Respons error menyertakan **`requestId`** yang sama dengan `trace-id` di log (uji: picu 500, cocokkan kodenya di log)?
- [ ] List besar dipaginasi + kolom filter/urut ter-index?
- [ ] Tak ada `SELECT *`/`select('*')` dan tak ada query **di dalam loop** (N+1) di jalur yang sering dipanggil?
- [ ] `201` menyertakan header `Location`; `204` dipakai untuk sukses-tanpa-isi (bukan 200 ber-body kosong)?
- [ ] Konvensi saring/urut/paginasi **seragam** di semua endpoint (tak campur gaya antar-alamat)?
- [ ] URL resource = kata benda jamak kebab-case tanpa kata kerja (bukan `snake_case`/tunggal); method HTTP sesuai idempoten-nya (GET/PUT/DELETE idempoten, POST/PATCH tidak)?
- [ ] Data yang bisa diedit >1 orang: ada **`If-Match`→`412`** ATAU kolom versi di `WHERE` (uji: dua penyimpanan hampir bersamaan → yang belakangan **ditolak**, bukan menimpa diam-diam)?
- [ ] Perubahan API breaking → `/v2/` sambil `/v1/` hidup (maks 2 versi aktif) + `Sunset` **berformat tanggal HTTP** / `410` untuk endpoint yang dimatikan (bukan mengubah `/v1/` diam-diam)?

> **Verifikasi WAJIB cuma-baca**: membuktikan = baca kode + `Grep` + menalar, JANGAN jalankan SQL/perintah yang mengubah data live.

---

## 5. Definition-of-Done (kapan skill backend dianggap benar-selesai)

- [ ] **Kontrak (§1) ditulis** dulu — input/output/error+status/rahasia — untuk tiap endpoint/fungsi publik.
- [ ] **Edge case** ditangani: input kosong/0/null, payload jahat, ID milik orang lain (IDOR), bentrok tulis-serentak (race), koneksi DB putus.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Endpoint sensitif (auth/bayar/data-pribadi) → **rak keamanan dibuka** (`skills/owasp/SKILL.md`) sebelum kontrak final.
- [ ] API yang dipakai **klien luar/pihak-ketiga** → kontrak mesin-baca (**OpenAPI** = berkas spesifikasi API yang bisa dibaca alat lain untuk membuat dokumentasi & client SDK otomatis) ditulis dan **ikut ditinjau tiap endpoint berubah**. API internal: opsional — jangan bangun yang belum dibutuhkan (YAGNI).
  - 💡 SARAN: API untuk klien luar **boleh** mempertimbangkan `application/problem+json` (**RFC 9457** = format badan-error HTTP yang baku lintas-vendor, jadi SDK/gateway pihak lain sudah mengerti bentuknya tanpa dokumentasi tambahan). API internal **tetap** pakai amplop `Err` §3 (bentuknya → `skills/backend/rujukan/validasi-otorisasi.md`) — jangan diseragamkan paksa, dua kosakata di satu API justru bikin klien menebak.
- [ ] build + lint + test lulus lokal; min 1 test happy-path + 1 alur kritis (mis. tolak akses lintas-pemilik/IDOR) diuji.

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Login/sesi/cek-izin** (RBAC = *Role-Based Access Control* = atur izin lewat peran · IDOR mendalam) → `skills/auth/SKILL.md`.
- 📐 **Keamanan web** (CORS, SSRF, input tak-tepercaya, upload) → `skills/owasp/SKILL.md`. **Batas laju permintaan** (token-bucket, kunci per-identitas, `429` + `Retry-After`) → `skills/rate-limiting/SKILL.md`.
- 📐 **Struktur DB / migrasi aman / RLS / index** → `skills/database/SKILL.md`.
- 📐 **Anti bayar-dobel / idempotency-key** → `skills/pembayaran/SKILL.md`. **Kerja latar/antrean** → `skills/background-job/SKILL.md`. **Panggilan API luar tahan-gagal** → `skills/tahan-gagal/SKILL.md`.
- 🗃️ **LATAR — log terstruktur + `trace-id`** (nomor seri unik per-permintaan yang ikut di semua log, supaya jejak satu request bisa dirangkai lintas-layanan saat menyelidiki error — **tanpa** secret/PII, §1) → `templates/PRODUCTION_OBSERVABILITY.md`.
- 🗃️ **LATAR:** Ambang angka (status code, Core Web Vitals) = aturan inti. Rak asal skill ini hanya di riwayat git (ADR-027).
- 🗃️ **LATAR — kredit (MIT © Affaan Mustafa):** diserap dari ECC `api-design` + `backend-patterns` + `error-handling` lalu **ditulis-ulang** non-programmer & dinetralkan untuk project apa pun — aturan deprecation (`Sunset` berformat tanggal HTTP · maks 2 versi aktif · `410`), penamaan resource URL (termasuk larangan `snake_case`/tunggal), tabel semantik method HTTP + catatan PATCH-bisa-idempoten, bentuk `error.details[]`, konvensi query-param saring/urut/cari `?q=`/field bersarang, `page.has_next`, versioning lewat header sebagai gaya yang harus DIIKUTI bila project client sudah memakainya, `201`+`Location` & `204`, anti `SELECT *`, anti N+1, nama 3 lapis (Repository/Service/Middleware), hierarki error ber-tipe, dan OpenAPI sebagai butir Definition-of-Done.
- 🗃️ **LATAR — kredit (MIT © willey-labs):** butir §2.9 (Law of Demeter, OD-003) & §2.10 (`switch` berulang → tabel/factory, FN-004) — kini di `skills/backend/rujukan/arsitektur-modul.md` — diserap dari `willey-labs/agent-skills` `coding-standards`, lalu **ditulis-ulang** Bahasa Indonesia non-programmer + diturunkan posturnya jadi 📐/💡 (bukan hard-block ber-hook Python seperti aslinya — ADR-009 & ADR-013). Aturan craft yang berlaku LINTAS-bidang (fungsi kecil satu-abstraksi · anti efek-samping tersembunyi · perintah ≠ pertanyaan · early-return · konstanta bernama · wasit saat prinsip bentrok) sengaja TIDAK ditaruh di sini melainkan di kernel `AGENTS.md` §3.6–§3.9 — supaya ikut TIAP sesi, bukan hanya saat rak backend kebetulan terbuka.
- 🗃️ **LATAR — BUKAN dari ECC (asli kit):** permintaan bersyarat `ETag`/`If-None-Match`→`304` dan 🔒 `If-Match`→`412` (anti tulis saling-menimpa senyap) — ECC `api-design` tak memuatnya sama sekali; ditambahkan karena "yang belakangan menimpa diam-diam" persis kelas kerusakan SENYAP yang kit ini perangi.
- 🗃️ **LATAR — TIDAK diambil dari ECC** (bentrok 🔒 HASIL kit — jangan diusulkan ulang): tabel tarif rate-limit siap-angka (batas yang benar = hasil ukur trafik nyata) · header `X-RateLimit-*` (kit pakai draft IETF tanpa `X-`) · sparse fieldset `?fields=`/`include=` tanpa allowlist · antrean `JobQueue` in-memory (hilang tiap deploy + tak terbagi antar-instance → `skills/background-job/SKILL.md`) · `verifyToken` tanpa `algorithms`/`aud`/`iss` · `hasPermission` tanpa default-deny (peran tak dikenal = crash, bukan tolak) · penjaga izin yang **melempar** tanpa penangkap (403 jadi 500) · `retry` yang mengulang **semua** error termasuk 4xx — akarnya predikat "boleh diulang" yang **ber-default `() => true`**; di kit predikat itu WAJIB disuntik tanpa default (→ `skills/tahan-gagal/SKILL.md`) · **membuang variabel error saat membungkus** (`catch (e) { throw new AppError(...) }` tanpa `cause`) — ECC melakukannya di contoh TypeScript-nya padahal contoh Go-nya sendiri memakai `%w` dengan benar · blok `EXCEPTION WHEN OTHERS` yang mengubah gagal jadi sukses-senyap · dan blok kode 3-bahasa siap-salin.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** data user & integritas tulisan (pesanan, saldo, hak). **Penyerang:** IDOR (curi data lewat ganti ID), injeksi (SQL/command lewat input), manipulasi payload, penyalahgunaan endpoint tanpa rate-limit. **Mitigasi:** validasi boundary + parameterized query + otorisasi per-resource server-side default-deny + status/amplop konsisten + error tak-ditelan + rate-limit endpoint sensitif.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** kualitas & keamanan API umum; **tidak menggantikan** review keamanan mendalam untuk auth/pembayaran (buka rak owasp) maupun desain sistem terdistribusi. Cek dokumentasi framework/library **versi terpasang** (lewat alat docs/MCP mis. Context7/ref-tools, jangan andalkan ingatan) sebelum menulis kode.
