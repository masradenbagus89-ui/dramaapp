---
nama: auth
deskripsi: Login, sesi, dan hak-akses kelas industri — autentikasi (membuktikan SIAPA) + otorisasi (boleh APA) yang aman by-default.
divisi: keamanan
pemicu: [login, masuk, daftar, sign-up, sign-in, akun, auth, oauth, sso, sesi, session, peran, role, hak-akses, rbac, password, otentikasi, otorisasi]
rawan_keamanan: true
menggantikan: [login/akun]
scaffold: true
---

# Skill: Auth — login · sesi · hak-akses (kelas industri)

> **Kapan skill ini aktif:** prompt menyentuh "tambah login / daftar / akun user / siapa boleh apa / peran admin / sesi / password". Dispatcher `rak-pemicu` menyalakannya otomatis (staff tak perlu mengetik nama skill). `rawan_keamanan: true` → skill ini **sangat disarankan dibuka sebelum edit pertama** berkas auth; ditandai 🔒 di Petunjuk Rak. (Petunjuk Rak = pengingat LUNAK, bukan pemblokir. Penegakan KERAS — Palang Rak menahan edit sampai rak dibaca — bersifat opt-in dan sedang disatukan ke jalur skill; lihat ADR-027 Tugas 12. Jadi jangan andalkan mesin memaksa: buka karena memang perlu.)
>
> 🙂 **Analogi:** auth = **satpam + kartu akses gedung**. Autentikasi = cek KTP di pintu ("benar ini kamu?"); otorisasi = kartu akses menentukan lantai mana yang boleh dimasuki. Skill ini memastikan pintunya benar-benar mengunci — bukan cuma kelihatan terkunci.

Skill ini **advisory** (§4.17): otak native yang memutuskan adopsi/adaptasi/abaikan tiap butir 📐/💡. Tapi butir **🔒 HASIL** = hasil keselamatan yang tak boleh gagal apa pun caranya. Selalu **cek versi library terpasang** sebelum menulis kode (§8.2 A3) — API auth sering berubah antar-versi.

---

## 1. Kontrak (yang HARUS benar — tulis DULU sebelum koding)

- 🔒 **HASIL — bentuk data yang menyeberang:**
  - **Input:** kredensial = email+password / token provider (Google dsb) / OTP (kode sekali-pakai).
  - **Output:** sesi terverifikasi (cookie aman) + identitas **server-side** (bukan klaim dari client).
  - **Error:** **401** = belum login / token tak sah / kadaluarsa · **403** = sudah login TAPI tak berhak. JANGAN ditukar (salah kode bikin klien "login ulang" padahal masalahnya izin).
  - **Rahasia:** password/secret/token **TAK PERNAH** masuk log atau response body.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **Pilih cara masuk + pakai library teruji.** email+password, login sosial, atau OTP/magic-link. Pakai **library auth teruji** (NextAuth/Auth.js, Lucia, Supabase Auth, Django auth). 🔒 HASIL: **JANGAN bikin sistem auth/kripto sendiri** (§8 — kripto standar; auth buatan-sendiri = celah keamanan hampir pasti).
2. 📐 **Password = hash (acakan satu-arah), bukan plaintext.** Pakai **bcrypt/argon2**. Tolak password yang sudah bocor via HIBP *k-anonymity* (kirim hanya 5 huruf awal hash SHA-1, password utuh TAK dikirim) — detail di `skills/owasp/SKILL.md`.
3. 📐 **Sesi = cookie `HttpOnly` + `Secure` + `SameSite`.** 🔒 HASIL: **Putar/regenerasi ID sesi saat login** (cegah *session-fixation* = penyerang menanam ID sesi sebelum korban login lalu ikut masuk). Set masa-berlaku (idle + absolut). Hapus/regenerasi sesi saat logout.
4. 🔒 **HASIL — Otorisasi per-resource pakai identitas SERVER-side, BUKAN ID dari body/URL** (cegah **IDOR** = ganti angka ID di URL untuk curi data orang lain, §8). Default-deny: mulai tak-boleh, tambah izin seperlunya.
5. 📐 **RBAC (Role-Based Access Control = "siapa boleh apa", diatur lewat peran) — 6 aturan penutup mayoritas bug izin:**
   - 📐 Satu tabel peran→izin, **satu sumber kebenaran**. Tulis izin sebagai kata-kerja spesifik (`pesanan.buat`, `pesanan.batal`, `diskon.beri`), BUKAN nama jabatan.
   - 📐 **Satu titik cek izin terpusat** (`bolehkah(user, 'pesanan.batal')`). DILARANG `if (role === 'admin')` bertebaran di banyak berkas — itu penyebab #1 izin bocor (satu tempat lupa diperbarui → pintu terbuka).
   - 📐 **Default-deny.** Izin tak terdaftar = DITOLAK. Jangan pernah "kalau tak dikenali, izinkan".
   - 📐 **Cek di SERVER, tiap permintaan.** Menyembunyikan tombol di layar BUKAN kontrol izin — penyerang memanggil API-nya langsung.
   - 🔒 **HASIL — 🚨 Tiap izin yang TAMPIL di layar pengaturan WAJIB benar-benar diperiksa di kode.** Izin yang bisa dicentang/dimatikan pengelola tapi **tak pernah dipanggil** = **hiasan berbahaya**: pengelola mematikannya lalu MENGIRA sudah membatasi sesuatu (rasa aman palsu). Terjadi nyata (2026-07-19): izin `logs:export` tampil sebagai sakelar tapi tombol ekspornya digerbangi `if (role === 'PIC')` keras — nol pemanggilan. **Cek murah (robot ~0 token):** untuk tiap nama izin, `Grep` di seluruh kode; kalau muncul HANYA di berkas-definisi + berkas-layar (tak ada di pemanggilan penjaga), izin itu hiasan → tegakkan, ATAU sembunyikan dari layar sampai ditegakkan.
   - 📐 **Catat jejak aksi sensitif** (siapa · apa · kapan · dari mana) untuk batal-transaksi, beri-diskon, ubah-peran, hapus-data.
   - 📐 Butuh izin per-baris data (kasir cuma lihat pesanan cabangnya)? → RLS di `skills/supabase-prisma/SKILL.md`.
6. 📐 **Kalau pakai JWT (JSON Web Token = kartu-akses digital ber-tanda-tangan) — 3 jebakan fatal:** (a) 🔒 HASIL: **verifikasi TANDA-TANGAN server-side + tolak token ber-`alg: none`** (token tanpa tanda-tangan = siapa pun bisa memalsukan). (b) **Kunci algoritma yang diharapkan** (cegah *key-confusion* RS256→HS256). (c) **Cek klaim `exp`/`aud`/`iss`**. Pakai library JWT teruji, JANGAN verifikasi manual.
7. 📐 **2FA/MFA + passkey (lapis kedua) — WAJIB untuk data sensitif/admin.** TOTP (kode 6-angka authenticator) atau passkey/WebAuthn (sidik jari/wajah/kunci perangkat, *phishing-resistant*). Hindari 2FA-SMS bila ada opsi lain (rawan SIM-swap). Cek dukungan versi library terpasang.
8. 📐 **Alur pendukung:** lupa-password (token sekali-pakai + kadaluarsa), verifikasi email, **rate-limit + lock** percobaan login (anti brute-force → owasp), logout.
9. 📐 **UI (4 state §10):** form login validasi client+server, error per-field, loading saat submit; halaman "belum login" (401) vs "tak berhak" (403) beda.

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
// lib/izin.ts — SATU sumber kebenaran cek izin. Default-deny. Cek di SERVER.
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

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

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

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan auth = baca kode + `Grep` + menalar, JANGAN jalankan SQL/perintah yang mengubah data live. Klaim yang cuma bisa diuji dengan mengubah data → minta owner jalankan di staging.

---

## 5. Definition-of-Done (kapan skill auth dianggap benar-selesai)

- [ ] **Kontrak (§1) ditulis** dulu — input/output/error (401 vs 403)/rahasia.
- [ ] **4 state UI** form login (loading/empty/error/success) + halaman 401 vs 403 beda.
- [ ] **Edge case** ditangani: kredensial salah, sesi kadaluarsa, akun terkunci, token dipalsukan, race saat login.
- [ ] **Self-verify (§4) semua tercentang** dengan bukti `berkas:baris`.
- [ ] **Rak keamanan dibuka** (`skills/owasp/SKILL.md`) sebelum kontrak final — skill ini `rawan_keamanan: true`, jadi buka dulu (bukan opsional bagi diri sendiri, walau mesin belum memaksa).
- [ ] build + lint + test lulus lokal; min 1 test happy-path (login sukses) + 1 alur kritis (tolak IDOR) diuji.
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** — "selesai" = terbukti dengan bukti, bukan "sudah kuubah".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Kedalaman keamanan** (CSRF, rate-limit, HIBP, CORS, upload, CVE Next.js middleware) → `skills/owasp/SKILL.md` (sumber; skill ini sengaja TAK menyalinnya — 20KB, reuse-first).
- 📐 **Cookie flags + security headers** → `templates/STACK_GUIDE.md` §7 Security Checklist.
- 📐 **Izin per-baris data (RLS)** → `skills/supabase-prisma/SKILL.md`.
- 🗃️ **LATAR — skill terkait:** `skills/pembayaran/SKILL.md` (butuh user login).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** akun & data pribadi user, sesi. **Penyerang:** pencuri kredensial (brute-force/phishing), pembajak sesi, pemalsu token JWT, IDOR. **Mitigasi:** hash kuat + rate-limit/lock + cookie aman + putar-sesi + verifikasi JWT (tolak `alg:none`) + 2FA/passkey untuk aksi sensitif + otorisasi server-side default-deny.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** keamanan auth; **tidak menjamin** kebal (phishing tetap mungkin walau 2FA menurunkan risikonya). RBAC di §2.5 = cukup untuk kasus umum (peran tetap: kasir/supervisor/admin); kebutuhan izin per-atribut-data (ABAC) → pakai RLS database. Data sangat sensitif/kepatuhan → konsultasi keamanan tambahan. Cek dokumentasi library auth **versi terpasang** sebelum menulis kode.
