---
nama: auth
deskripsi: Login, sesi, dan hak-akses kelas industri — autentikasi (membuktikan SIAPA) + otorisasi (boleh APA) yang aman by-default.
divisi: keamanan
pemicu: [login, masuk, daftar-akun, form-pendaftaran, pendaftaran-member, bikin-akun, sign-up, sign-in, akun, auth, oauth, sso, sesi, session, peran, role, hak-akses, rbac, password, otentikasi, otorisasi, permission, permissions, access-control, reset-password]
rawan_keamanan: true
menggantikan: [login/akun]
scaffold: true
---

# Skill: Auth — login · sesi · hak-akses (kelas industri)

> `rawan_keamanan: true` → skill ini **sangat disarankan dibuka sebelum edit pertama** berkas auth.
>
> **Inti:** Auth mencakup dua hal — autentikasi (membuktikan identitas pengguna itu benar) dan otorisasi (menentukan data/tindakan apa yang boleh diakses pengguna itu). Skill ini memastikan keduanya benar-benar ditegakkan di server, bukan cuma tampak aman.

Butir **🔒 HASIL** = hasil keselamatan yang tak boleh gagal apa pun caranya.

---

## 1. Kontrak (yang HARUS benar — tulis DULU sebelum koding)

- 🔒 **HASIL — bentuk data yang menyeberang:**
  - **Input:** kredensial = email+password / token provider (Google dsb) / OTP (kode sekali-pakai).
  - **Output:** sesi terverifikasi (cookie aman) + identitas **server-side** (bukan klaim dari client).
  - **Error:** **401** = belum login / token tak sah / kadaluarsa · **403** = sudah login TAPI tak berhak. JANGAN ditukar (salah kode bikin klien "login ulang" padahal masalahnya izin).
  - **Rahasia:** password/secret/token **TAK PERNAH** masuk log atau response body.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **Pilih cara masuk + pakai library teruji.** email+password, login sosial, atau OTP/magic-link. Pakai **library auth teruji** (NextAuth/Auth.js, Lucia, Supabase Auth, Django auth). 🔒 HASIL: **JANGAN bikin sistem auth/kripto sendiri** (kripto standar; auth buatan-sendiri = celah keamanan hampir pasti).
2. 📐 **Password = hash (acakan satu-arah), bukan plaintext.** Pakai **bcrypt/argon2**. Tolak password yang sudah bocor via HIBP *k-anonymity* (kirim hanya 5 huruf awal hash SHA-1, password utuh TAK dikirim) — detail di `skills/owasp/SKILL.md`.
3. 📐 **Sesi = cookie `HttpOnly` + `Secure` + `SameSite`.** 🔒 HASIL: **Putar/regenerasi ID sesi saat login** (cegah *session-fixation* = penyerang menanam ID sesi sebelum korban login lalu ikut masuk). Set masa-berlaku (idle + absolut). Hapus/regenerasi sesi saat logout.
4. 🔒 **HASIL — Otorisasi per-resource pakai identitas SERVER-side, BUKAN ID dari body/URL** (cegah **IDOR**). Default-deny: mulai tak-boleh, tambah izin seperlunya.
5. 📐 **RBAC (Role-Based Access Control = "siapa boleh apa", diatur lewat peran) — 6 aturan penutup mayoritas bug izin:**
   - 📐 Satu tabel peran→izin **terpusat** (jangan tersebar di banyak tempat). Tulis izin sebagai kata-kerja spesifik (`pesanan.buat`, `pesanan.batal`, `diskon.beri`), BUKAN nama jabatan.
   - 📐 **Satu titik cek izin terpusat** (`bolehkah(user, 'pesanan.batal')`). DILARANG `if (role === 'admin')` bertebaran di banyak berkas — itu penyebab #1 izin bocor (satu tempat lupa diperbarui → pintu terbuka).
   - 📐 **Default-deny.** Izin tak terdaftar = DITOLAK. Jangan pernah "kalau tak dikenali, izinkan".
   - 📐 **Cek di SERVER, tiap permintaan.** Menyembunyikan tombol di layar BUKAN kontrol izin — penyerang memanggil API-nya langsung.
   - 🔒 **HASIL — 🚨 Tiap izin yang TAMPIL di layar pengaturan WAJIB benar-benar diperiksa di kode.** Izin yang bisa dicentang/dimatikan pengelola tapi **tak pernah dipanggil** = **hiasan berbahaya**: pengelola mematikannya lalu MENGIRA sudah membatasi sesuatu (rasa aman palsu). Terjadi nyata (2026-07-19): izin `logs:export` tampil sebagai sakelar tapi tombol ekspornya digerbangi `if (role === 'PIC')` keras — nol pemanggilan. **Cek murah (robot ~0 token):** untuk tiap nama izin, `Grep` di seluruh kode; kalau muncul HANYA di berkas-definisi + berkas-layar (tak ada di pemanggilan penjaga), izin itu hiasan → tegakkan, ATAU sembunyikan dari layar sampai ditegakkan.
   - 📐 **Catat jejak aksi sensitif** (siapa · apa · kapan · dari mana) untuk batal-transaksi, beri-diskon, ubah-peran, hapus-data.
   - 📐 Butuh izin per-baris data (kasir cuma lihat pesanan cabangnya)? → RLS di `skills/supabase-prisma/SKILL.md`.
6. 📐 **Kalau pakai JWT — 3 jebakan fatal:** (a) 🔒 HASIL: **verifikasi TANDA-TANGAN server-side + tolak token ber-`alg: none`** (token tanpa tanda-tangan = siapa pun bisa memalsukan). (b) **Kunci algoritma yang diharapkan** (cegah *key-confusion* RS256→HS256). (c) **Cek klaim `exp`/`aud`/`iss`**. Pakai library JWT teruji, JANGAN verifikasi manual.
7. 📐 **2FA/MFA + passkey (lapis kedua) — WAJIB untuk data sensitif/admin.** TOTP (kode 6-angka authenticator) atau passkey/WebAuthn (sidik jari/wajah/kunci perangkat, *phishing-resistant*). Hindari 2FA-SMS bila ada opsi lain (rawan SIM-swap). Cek dukungan versi library terpasang.
8. 📐 **Alur pendukung:** lupa-password (token sekali-pakai + kadaluarsa), verifikasi email, **rate-limit + lock** percobaan login (anti brute-force → owasp), logout.
9. 📐 **UI (4 state):** form login validasi client+server, error per-field, loading saat submit; halaman "belum login" (401) vs "tak berhak" (403) beda.

### Login sosial (OAuth/OIDC) — 5 jebakan khas (library teruji menangani sebagian, JANGAN berasumsi)
1. 🔒 **HASIL — 🚨 Account-linking otomatis = perebutan akun.** User daftar `budi@gmail.com`+password; penyerang login-Google `budi@gmail.com`. Kalau sistem **auto-gabung** hanya karena email sama → akun Budi diambil alih. Aturan: JANGAN auto-gabung; gabung hanya setelah user login lalu sengaja menautkan, atau verifikasi kepemilikan email ulang.
2. 📐 **Cek klaim `email_verified` dari penyedia** (email provider bisa BELUM terverifikasi). Tolak kalau bukan `true`.
3. 📐 **Parameter `state` WAJIB** (kode acak sekali-pakai, cegah CSRF login = korban menyelesaikan alur pakai akun penyerang).
4. 📐 **PKCE** (kode rahasia sekali-pakai) untuk aplikasi publik/mobile — cegah kode-tukar dicuri di tengah jalan. Di alur server-side dengan client-secret pun, PKCE **tetap disarankan**.
5. 🔒 **HASIL — Alat internal → gagal-mengunci, bukan gagal-membuka.** Login Google menerima SEMUA akun sedunia secara bawaan. Kunci ke domain kantor lewat klaim `hd` **dan** cocokkan ke daftar user DB — jangan cuma cek akhiran teks email. Variabel domain belum diisi → **tolak** (jangan gagal-buka).

🙂 **Non-Programmer:** "login pakai Google" **bukan** berarti keamanannya diurus Google sepenuhnya. Yang Google jamin cuma "benar ini pemilik akun Google tersebut". Sisanya urusanmu: memastikan akun Google itu memang milik staff-mu, dan memastikan orang tak bisa merebut akun lama cuma karena alamat emailnya kebetulan sama (jebakan #1 di atas).

---

## 3. Powerful — apa yang skill ini bantu KIRIM cepat (delivery)

Skill = buku panduan **+ bahan rakit siap-adaptasi**, bukan cuma nasihat. Yang paling berdaya-ungkit untuk auth = **satu titik cek izin terpusat** (aturan RBAC #2). Ini scaffold minimal siap-tempel — 🧪 **CONTOH KASUS: ambil polanya, jangan salin mentah** (netralkan ke stack + versi library terpasang):

```ts
// lib/izin.ts — SATU titik terpusat cek izin. Default-deny. Cek di SERVER.
// 🔒 HASIL: tiap key di PERAN_IZIN yang tampil di layar WAJIB dipanggil bolehkah() di suatu penjaga.
const PERAN_IZIN: Record<string, readonly string[]> = {
  kasir:      ['pesanan.buat', 'pesanan.lihat'],
  supervisor: ['pesanan.buat', 'pesanan.lihat', 'pesanan.batal', 'diskon.beri'],
  admin:      ['*'], // '*' = semua izin
}
// user.role dari SESI TERVERIFIKASI server-side — BUKAN dari body/header/URL (cegah IDOR).
export function bolehkah(user: { role: string }, izin: string): boolean {
  const daftar = PERAN_IZIN[user.role]
  if (!daftar) return false                 // peran tak dikenal -> TOLAK (default-deny)
  return daftar.includes('*') || daftar.includes(izin)
}
```

```ts
// Pemakaian di route/Server Action — cek DI SERVER, tiap permintaan (bukan sembunyikan tombol di UI).
const user = await sesiTerverifikasi(req)   // 401 kalau null
if (!user) return respons(401, 'Belum login')
if (!bolehkah(user, 'pesanan.batal')) return respons(403, 'Tak berhak') // 403 != 401
// ...aksi + catat jejak (siapa·apa·kapan·dari-mana)
```

- 📐 CARA BAKU: **Robot penemu "izin hiasan"** (aturan RBAC #5, ~0 token): tiap key izin → `Grep` di seluruh kode; kemunculan HANYA di berkas-definisi + berkas-layar = hiasan → tegakkan atau sembunyikan.
- 💡 SARAN: generator scaffold spesifik-framework (Next.js/Supabase/Django) menghasilkan berkas `lib/izin`, middleware sesi, dan form login 4-state siap-pakai. *Batas jujur:* generator penuh = pekerjaan Tugas 15+ (belum dibangun); pilot ini menyediakan **pola** di atas, bukan CLI generator.

### Contoh pola ❌→✅ (ambil POLANYA, jangan salin mentah — cek versi paket/provider terpasang)

🧪 **Error 401 vs 403 jangan ditukar (§1)**:

❌ **SALAH** (semua ditolak 401 → user yang cuma kurang izin disuruh login ulang terus-menerus):
```ts
const user = await sesiTerverifikasi(req)
if (!user || !bolehkah(user, 'laporan.lihat'))
  return respons(401, 'Silakan login') // padahal user SUDAH login — masalahnya izin, bukan identitas
```
✅ **BENAR** (401 = identitas belum terbukti · 403 = terbukti tapi tak berhak):
```ts
const user = await sesiTerverifikasi(req)
if (!user) return respons(401, 'Belum login')
if (!bolehkah(user, 'laporan.lihat')) return respons(403, 'Tak berhak')
```

🧪 **Rahasia tak pernah masuk log/response (§1)**:

❌ **SALAH** (kredensial bocor ke log & ke client):
```ts
console.log('login gagal:', req.body)  // body berisi password plaintext → terekam permanen di log
return Response.json({ user })         // objek user membawa kolom password_hash keluar server
```
✅ **BENAR** (log tanpa kredensial; kolom rahasia dibuang sebelum keluar server):
```ts
console.log('login gagal:', { email }) // cukup identitas non-rahasia untuk debugging
const { password_hash, ...aman } = user
return Response.json({ user: aman })
```

🧪 **Jangan bikin kripto/auth sendiri (§2 butir 1)**:

❌ **SALAH** (SHA-256 polos: tanpa salt + super-cepat → GPU menebak miliaran hash/detik):
```ts
import { createHash } from 'node:crypto'
const hash = createHash('sha256').update(password).digest('hex') // rainbow-table + brute-force murah
```
✅ **BENAR** (algoritma khusus-password: salt otomatis + sengaja lambat):
```ts
import bcrypt from 'bcryptjs' // atau argon2 — cek paket terpasang
const hash = await bcrypt.hash(password, 12)
const cocok = await bcrypt.compare(password, hash) // JANGAN bandingkan hash pakai ===
```

🧪 **Putar ID sesi saat login (§2 butir 3)**:

❌ **SALAH** (ID sesi lama dipertahankan = session-fixation):
```ts
// penyerang menanam ID sesi ke browser korban SEBELUM korban login...
session.userId = user.id // ...ID tanaman itu kini sesi ber-identitas → penyerang ikut masuk
```
✅ **BENAR** (identitas hanya menempel di ID sesi BARU):
```ts
await session.regenerate() // API regenerasi: cek docs library sesi terpasang
session.userId = user.id   // ID lama (yang mungkin ditanam) mati seketika
```

🧪 **IDOR: identitas dari sesi server, bukan body/URL (§2 butir 4)**:

❌ **SALAH** (`userId` dari client = tinggal diganti jadi ID orang lain):
```ts
const { userId } = await req.json() // penyerang kirim userId orang lain → datanya terbaca
const pesanan = await db.pesanan.findMany({ where: { userId } })
```
✅ **BENAR** (ID dari sesi terverifikasi — client tak pernah ditanya "kamu siapa"):
```ts
const user = await sesiTerverifikasi(req)
if (!user) return respons(401, 'Belum login')
const pesanan = await db.pesanan.findMany({ where: { userId: user.id } })
```

🧪 **Izin di layar wajib ditegakkan di kode (§2 butir 5, RBAC #5)**:

❌ **SALAH** (layar menampilkan sakelar izin `logs:export`, penjaganya cek role keras → sakelar hiasan):
```ts
if (user.role === 'PIC') await eksporLog() // izin dimatikan di layar → TETAP bisa ekspor (rasa aman palsu)
```
✅ **BENAR** (penjaga memanggil izin yang SAMA dengan yang tampil di layar):
```ts
if (!bolehkah(user, 'logs:export')) return respons(403, 'Tak berhak') // sakelar layar kini berefek nyata
await eksporLog()
```

🧪 **JWT: verifikasi tanda-tangan + kunci algoritma (§2 butir 6)**:

❌ **SALAH** (`decode()` TIDAK memverifikasi apa pun):
```ts
const klaim = jwt.decode(token)  // token alg:none / tanda-tangan palsu tetap lolos decode
if (klaim) izinkan(klaim.sub)    // = siapa pun bisa mengarang identitas
```
✅ **BENAR** (verify + algoritma dikunci + `aud`/`iss` dicek — `exp` dicek otomatis oleh verify):
```ts
import jwt from 'jsonwebtoken' // library teruji, JANGAN verifikasi manual
const klaim = jwt.verify(token, kunciPublik, {
  algorithms: ['RS256'],       // dikunci → alg:none & key-confusion RS256→HS256 ditolak
  audience: 'api-ku', issuer: 'https://sso.contoh.co.id',
})
```

🧪 **OAuth: jangan auto-gabung akun karena email sama (Login sosial #1)**:

❌ **SALAH** (akun dicari/dibuat HANYA lewat email):
```ts
const user = await db.user.upsert({ where: { email: profil.email },
  update: {}, create: { email: profil.email } }) // penyerang login-Google email Budi → merebut akun Budi
```
✅ **BENAR** (tautan dicari per pasangan provider+id-akun-provider; belum tertaut → alur tautkan-sadar):
```ts
const tautan = await db.akunOauth.findUnique({ where: {
  provider_providerAccountId: { provider: 'google', providerAccountId: profil.sub } } })
if (!tautan) return arahkan('/tautkan-akun') // gabung hanya SETELAH user login & sengaja menautkan
```

🧪 **Alat internal: gagal-mengunci, bukan gagal-membuka (Login sosial #5)**:

❌ **SALAH** (cek akhiran teks email; config kosong = semua akun sedunia masuk):
```ts
if (profil.email.endsWith('kantor.co.id')) izinkan(profil) // 'budi@jahat-kantor.co.id' ikut lolos
```
✅ **BENAR** (klaim `hd` + cocokkan daftar user DB; domain belum diisi → TOLAK):
```ts
const domain = process.env.DOMAIN_KANTOR
if (!domain) return respons(403, 'Domain belum dikonfigurasi') // gagal = MENGUNCI
const dikenal = await db.user.findUnique({ where: { email: profil.email } })
if (profil.hd !== domain || !dikenal) return respons(403, 'Bukan akun kantor')
```

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai")

Sebelum menandai auth "selesai", jawab dengan bukti `berkas:baris` (tak bisa jawab → belum selesai):
- [ ] Otorisasi dicek di **SERVER** tiap route sensitif (bukan cuma tombol UI disembunyikan)? Route/Server-Action Next.js **publik secara default** — tiap yang sensitif wajib cek sesi.
- [ ] Identitas dari **sesi server-side**, bukan ID dari body/URL (uji: ganti ID di URL → apakah bisa lihat data orang lain? = IDOR).
- [ ] Password **hash** (bcrypt/argon2), tak ada plaintext di DB/log/response?
- [ ] ID sesi **diputar saat login**; cookie `HttpOnly`+`Secure`+`SameSite`?
- [ ] JWT (jika ada): tanda-tangan diverifikasi + `alg:none` ditolak + algoritma dikunci?
- [ ] Login sosial (jika ada): **tak auto-gabung** akun beda-metode dgn email sama; `email_verified` dicek; `state` dipakai?
- [ ] Tiap izin yang **tampil di layar** benar-benar **dipanggil** di penjaga (bukan hiasan)?
- [ ] Pesan error tak membocorkan mana yang salah ("email **atau** password salah", bukan "password salah")?
- [ ] Rate-limit + lock pada login (anti brute-force)?

> **Verifikasi WAJIB cuma-baca**: membuktikan auth = baca kode + `Grep` + menalar, JANGAN jalankan SQL/perintah yang mengubah data live. Klaim yang cuma bisa diuji dengan mengubah data → minta owner jalankan di staging.

---

## 5. Definition-of-Done (kapan skill auth dianggap benar-selesai)

- [ ] **Kontrak (§1) ditulis** dulu — input/output/error (401 vs 403)/rahasia.
- [ ] **4 state UI** form login (loading/empty/error/success) + halaman 401 vs 403 beda.
- [ ] **Edge case** ditangani: kredensial salah, sesi kadaluarsa, akun terkunci, token dipalsukan, race saat login.
- [ ] **Self-verify (§4) semua tercentang** dengan bukti `berkas:baris`.
- [ ] **Rak keamanan dibuka** (`skills/owasp/SKILL.md`) sebelum kontrak final — skill ini `rawan_keamanan: true`, jadi buka dulu (bukan opsional bagi diri sendiri, walau mesin belum memaksa).
- [ ] build + lint + test lulus lokal; min 1 test happy-path (login sukses) + 1 alur kritis (tolak IDOR) diuji.

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Kedalaman keamanan** (CSRF, rate-limit, HIBP, CORS, upload, CVE Next.js middleware) → `skills/owasp/SKILL.md` (sumber; skill ini sengaja TAK menyalinnya — 20KB, reuse-first).
- 📐 **Cookie flags + security headers** → `templates/STACK_GUIDE.md` §7 Security Checklist.
- 📐 **Izin per-baris data (RLS)** → `skills/supabase-prisma/SKILL.md`.
- 🗃️ **LATAR — skill terkait:** `skills/pembayaran/SKILL.md` (butuh user login).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** akun & data pribadi user, sesi. **Penyerang:** pencuri kredensial (brute-force/phishing), pembajak sesi, pemalsu token JWT, IDOR. **Mitigasi:** hash kuat + rate-limit/lock + cookie aman + putar-sesi + verifikasi JWT (tolak `alg:none`) + 2FA/passkey untuk aksi sensitif + otorisasi server-side default-deny.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** keamanan auth; **tidak menjamin** kebal (phishing tetap mungkin walau 2FA menurunkan risikonya). RBAC di §2.5 = cukup untuk kasus umum (peran tetap: kasir/supervisor/admin); kebutuhan izin per-atribut-data (ABAC) → pakai RLS database. Data sangat sensitif/kepatuhan → konsultasi keamanan tambahan.
