---
nama: backend
deskripsi: Logika & API sisi-server kelas industri — kontrak dulu, validasi di boundary, otorisasi per-resource (anti-IDOR), status code benar, error tak ditelan.
divisi: backend
pemicu: [endpoint, backend, rest-api, server-action, controller, handler, route-handler, crud]
rawan_keamanan: true
menggantikan: []
---

# Skill: Backend — logika & API sisi-server (kelas industri)

> **Kapan skill ini aktif:** prompt menyentuh "bikin API / endpoint / logika server / controller / handler / CRUD (buat-baca-ubah-hapus data)". Dispatcher `rak-pemicu` menyalakannya otomatis. `rawan_keamanan: true` → skill ini **sangat disarankan dibuka sebelum edit pertama** berkas endpoint/route, karena kesalahan otorisasi di sini = kebocoran data yang **senyap** (tak kelihatan di layar). Ditandai 🔒 di Petunjuk Rak.
>
> 🙂 **Analogi:** endpoint (pintu API = alamat yang bisa "ditelepon" aplikasi lain, mis. `/api/pesanan`) = **loket kantor**. Kontrak = papan syarat di loket ("bawa apa, dapat apa, kalau ditolak alasannya apa"). Otorisasi per-resource = petugas loket **wajib cek** apakah nomor antrean yang kamu pegang benar-benar MILIKMU — bukan asal kasih dokumen ke siapa saja yang menyebut nomor.

Skill ini **advisory** (§4.17): otak native yang memutuskan adopsi/adaptasi/abaikan tiap butir 📐/💡. Tapi butir **🔒 HASIL** = hasil keselamatan yang tak boleh gagal apa pun caranya. Sebelum memakai fungsi/parameter library yang tak yakin, **cek dokumentasi versi terpasang** lewat alat docs/MCP (mis. Context7/ref-tools) (§8.2 A3) — jangan andalkan ingatan.

---

## 1. Kontrak (yang HARUS benar — tulis DULU sebelum koding)

- 🔒 **HASIL — bentuk data yang menyeberang (tulis kontrak tiap endpoint/fungsi publik):**
  - **Input:** apa yang diterima (jenis + wajib/opsional) — dan dari mana (body/query/header/URL). Semua = **data tak-tepercaya** sampai divalidasi.
  - **Output:** bentuk respons yang konsisten (amplop: sukses + data + error + info paginasi) — sama untuk semua endpoint, jangan tiap endpoint beda bentuk.
  - **Error + status:** kode status HTTP **BENAR** (200/201 · 400 · 401 · 403 · 404 · 409 · 422 · 429 · 500) — **JANGAN kirim semua sebagai 200** (klien tak bisa bedakan sukses dari gagal). 401 = belum login · 403 = login tapi tak berhak · 404 = tak ada · 409 = bentrok · 422 = input tak lolos validasi · 429 = kebanyakan permintaan.
  - **Rahasia:** secret/token/PII (*Personally Identifiable Information* = data pribadi yang bisa mengidentifikasi orang: email/no.HP/KTP/nomor kartu) **TAK PERNAH** masuk log atau body respons error.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **Validasi + sanitasi SEMUA input di pintu masuk (boundary).** Tiap data dari luar (HTTP body/query/header/URL/file/env) divalidasi bentuk+tipe+rentang SEBELUM dipakai. Pakai skema validasi (zod/valibot/pydantic/…). 🔒 HASIL: **query ke DB pakai parameter/prepared statement, JANGAN sambung-string** (cegah SQL injection = penyerang menyelipkan perintah lewat input).
2. 🔒 **HASIL — Otorisasi per-resource pakai identitas SERVER-side, BUKAN ID dari body/URL** (cegah **IDOR** = *Insecure Direct Object Reference* = penyerang mengganti angka ID di URL untuk mengambil data orang lain). Ambil "siapa user ini" dari **sesi/token terverifikasi di server**, lalu cek apakah dia berhak atas baris data yang diminta. Default-deny: mulai tak-boleh, buka izin seperlunya. → alur login & cek izin: `skills/auth/SKILL.md`.
3. 📐 **Operasi multi-tulis = atomik ATAU idempoten.** **Atomik** (semua-jadi atau semua-batal) = pakai transaksi DB saat beberapa tulis harus konsisten. **Idempoten** (kebal-ulang = dijalankan 2× hasilnya sama, tak dobel) = untuk operasi yang bisa di-retry klien/jaringan (mis. anti bayar-dobel). → pola idempoten: `skills/pembayaran/SKILL.md`.
4. 📐 **Desain API rapi (REST):** amplop respons konsisten · status code benar (butir §1) · **versi di URL** (`/v1/`) untuk perubahan yang memutus klien lama. List besar = **paginasi** (potong per halaman) + **index kolom** yang di-`ORDER BY`/`WHERE` (jangan kirim ribuan baris sekaligus).
5. 📐 **Jangan telan error diam-diam (anti *silent failure*).** Error WAJIB di-log terstruktur dengan konteks (apa · di mana · ID terkait, **tanpa** secret/PII) + dipropagasi. 🔒 HASIL: **DILARANG `catch {}` kosong** atau fallback menyesatkan (`.catch(() => [])` yang menyembunyikan kegagalan jadi "data kosong") — itu melahirkan bug tersembunyi yang mahal (§12). Tangkap error **spesifik**, jangan telan semua.
6. 📐 **Panggilan ke layanan luar yang rapuh** (gateway bayar, storage, API pihak-ketiga) → bungkus coba-ulang berjeda + saklar-pemutus supaya 1 layanan lambat tak menyeret seluruh sistem → `skills/tahan-gagal/SKILL.md`.
7. 📐 **Kerja berat/lambat jangan menahan respons** — dorong ke antrean latar (kirim email, buat PDF, proses file) → `skills/background-job/SKILL.md`. Balas cepat, kerjakan di belakang.

🙂 **Non-Programmer:** endpoint yang "jalan" saat kamu tes sendiri belum tentu **aman**. Dua bahaya paling sering tak kelihatan di layar: (a) orang bisa mengganti angka di alamat dan melihat data orang lain (IDOR), dan (b) error yang "ditelan" diam-diam sehingga aplikasi kelihatan normal padahal ada data gagal tersimpan. Skill ini memasang dua pagar itu.

---

## 3. Powerful — amplop respons + guard yang paling berdaya-ungkit

Yang paling menghemat bug backend = **satu bentuk amplop respons** dipakai semua endpoint + **satu titik cek otorisasi**. 🧪 **CONTOH KASUS (ambil polanya, jangan salin mentah — netralkan ke stack + versi library terpasang):**

```ts
// Amplop respons SERAGAM — semua endpoint balas bentuk sama (klien tak perlu tebak-tebak).
type Ok<T>  = { ok: true;  data: T; page?: { total: number; next?: string } }
type Err    = { ok: false; error: { code: string; message: string } }

// Pemakaian di route/handler — cek DI SERVER, tiap permintaan:
const user = await sesiTerverifikasi(req)          // identitas dari sesi server-side
if (!user) return json(401, { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Belum login' } })

const pesanan = await db.pesanan.findUnique({ where: { id } })
if (!pesanan) return json(404, { ok: false, error: { code: 'NOT_FOUND', message: 'Tak ada' } })
// 🔒 kunci anti-IDOR: baris ini milik user tsb? -> identitas dari SESI, bukan dari body/URL.
if (pesanan.ownerId !== user.id) return json(403, { ok: false, error: { code: 'FORBIDDEN', message: 'Tak berhak' } })
```

- 📐 CARA BAKU: input divalidasi skema DI ATAS handler (`parse(body)` gagal → balas **422**, jangan lanjut).
- 💡 SARAN: taruh cek "boleh apa" di satu helper terpusat (`bolehkah(user, aksi, resource)`) — jangan sebar `if (role === 'admin')` di banyak berkas (satu tempat lupa = pintu bocor). → `skills/auth/SKILL.md`.

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

Jawab dengan bukti `berkas:baris` (tak bisa jawab → belum selesai):
- [ ] Tiap input dari luar **divalidasi di boundary** sebelum dipakai (uji: kirim tipe/nilai aneh → ditolak 400/422)?
- [ ] Otorisasi per-resource dari **sesi server-side** (uji IDOR: ganti ID di URL → apakah bisa lihat data orang lain?)?
- [ ] Query DB **parameterized** (tak ada string-concat SQL)?
- [ ] Status code **benar** per kasus (bukan semua 200)? Amplop respons **konsisten**?
- [ ] Multi-tulis **atomik/idempoten** (uji: jalankan 2× / potong di tengah → tak korup/dobel)?
- [ ] Tak ada `catch {}` kosong / fallback yang menyembunyikan kegagalan? Error di-log dengan konteks (tanpa secret)?
- [ ] List besar dipaginasi + kolom filter/urut ter-index?

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan = baca kode + `Grep` + menalar, JANGAN jalankan SQL/perintah yang mengubah data live.

---

## 5. Definition-of-Done (kapan skill backend dianggap benar-selesai)

- [ ] **Kontrak (§1) ditulis** dulu — input/output/error+status/rahasia — untuk tiap endpoint/fungsi publik.
- [ ] **Edge case** ditangani: input kosong/0/null, payload jahat, ID milik orang lain (IDOR), bentrok tulis-serentak (race), koneksi DB putus.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Endpoint sensitif (auth/bayar/data-pribadi) → **rak keamanan dibuka** (`skills/owasp/SKILL.md`) sebelum kontrak final.
- [ ] build + lint + test lulus lokal; min 1 test happy-path + 1 alur kritis (mis. tolak akses lintas-pemilik/IDOR) diuji.
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** — "selesai" = terbukti dengan bukti, bukan "sudah kuubah".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Login/sesi/cek-izin** (RBAC = *Role-Based Access Control* = atur izin lewat peran · IDOR mendalam) → `skills/auth/SKILL.md`.
- 📐 **Keamanan web** (rate-limit, CORS, SSRF, input tak-tepercaya, upload) → `skills/owasp/SKILL.md`.
- 📐 **Struktur DB / migrasi aman / RLS / index** → `skills/database/SKILL.md`.
- 📐 **Anti bayar-dobel / idempotency-key** → `skills/pembayaran/SKILL.md`. **Kerja latar/antrean** → `skills/background-job/SKILL.md`. **Panggilan API luar tahan-gagal** → `skills/tahan-gagal/SKILL.md`.
- 🗃️ **LATAR:** Ambang angka (status code, Core Web Vitals) = §1b aturan inti. Rak asal skill ini hanya di riwayat git (ADR-027).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** data user & integritas tulisan (pesanan, saldo, hak). **Penyerang:** IDOR (curi data lewat ganti ID), injeksi (SQL/command lewat input), manipulasi payload, penyalahgunaan endpoint tanpa rate-limit. **Mitigasi:** validasi boundary + parameterized query + otorisasi per-resource server-side default-deny + status/amplop konsisten + error tak-ditelan + rate-limit endpoint sensitif.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** kualitas & keamanan API umum; **tidak menggantikan** review keamanan mendalam untuk auth/pembayaran (buka rak owasp) maupun desain sistem terdistribusi. Cek dokumentasi framework/library **versi terpasang** sebelum menulis kode.
