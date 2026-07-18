<!-- LINTAS:SEKSI §auth -->

## §auth. Capability Pack — Auth (login, sesi, hak-akses) kelas-industri

> **Kapan dibaca:** "tambah login / daftar / akun user / siapa boleh apa / peran admin". Resep merakit autentikasi (membuktikan SIAPA kamu) + otorisasi (kamu boleh APA) yang aman. Baca induk `workflows/cap-packs.md` untuk disiplin umum.

🙂 Analogi: auth = **satpam + kartu akses gedung**. Autentikasi = cek KTP di pintu ("benar kamu?"); otorisasi = kartu akses menentukan lantai mana boleh dimasuki.

### Kontrak (yang harus benar)
- **Input:** kredensial (email+password / token provider / OTP). **Output:** sesi terverifikasi (cookie aman) + identitas server-side. **Error:** 401 (belum login), 403 (login tapi tak berhak). **Rahasia:** password/secret TAK PERNAH ke log/response.

### Langkah rakit (prinsip — cek versi library terpasang §8.2)
1. **Pilih cara masuk:** email+password, login sosial (Google dsb), atau OTP/magic-link. Pakai **library auth teruji** (NextAuth/Auth.js, Lucia, Supabase Auth, Django auth) — **JANGAN bikin sistem auth sendiri** (§8 kripto standar).
2. **Password:** simpan sebagai *hash* (acakan satu-arah) pakai **bcrypt/argon2** — jangan plaintext. Cek password bocor via HIBP k-anonymity (rujuk `stack/4.14-5-owasp.md`).
3. **Sesi:** cookie **`HttpOnly` + `Secure` + `SameSite`** (rujuk `templates/STACK_GUIDE.md` §keamanan). **Putar ID sesi saat login** (cegah *session-fixation* = pembajakan sesi lama). Set masa-berlaku (idle + absolut).
4. **Otorisasi per-resource pakai identitas SERVER-side**, BUKAN ID dari body/URL (cegah **IDOR** = ganti ID untuk curi data orang lain, §8). Default-deny: mulai tak-boleh, tambah izin seperlunya.
5. **Peran (RBAC):** kalau ada admin/moderator → definisikan peran + cek izin terpusat, bukan `if role === 'admin'` bertebaran. (Detail model RBAC/ABAC lanjut = peta-jalan `stack/4.14-5b` — belum tersedia.)
6. **Kalau pakai JWT (token login, mis. Supabase) — hindari 3 jebakan fatal:** JWT (JSON Web Token = kartu-akses digital ber-tanda-tangan). (a) **Selalu verifikasi TANDA-TANGAN** server-side + **tolak token ber-`alg: none`** (token tanpa tanda-tangan = siapa pun bisa memalsukan). (b) **Kunci algoritma yang diharapkan** (cegah *key-confusion* RS256→HS256: penyerang memakai kunci publikmu sebagai password untuk menandatangani token palsu). (c) **Cek klaim `exp` (kadaluarsa), `aud` (untuk siapa), `iss` (penerbit)** — jangan cuma percaya isi token. Pakai library JWT teruji, JANGAN decode/verifikasi manual (§8 kripto standar). (🙂 periksa hologram + tanggal + nama di kartu, bukan cuma baca tulisannya.)
7. **2FA/MFA + passkeys (lapis kedua) — WAJIB untuk data sensitif/admin.** Lapis kedua setelah password: **TOTP** (kode 6-angka dari Google Authenticator) atau **passkey/WebAuthn** (sidik jari/wajah/kunci perangkat — *phishing-resistant* = tak bisa dicuri lewat situs palsu, standar emas 2025). Banyak library auth (Supabase Auth, Auth.js) sudah menyediakan — **cek dukungan versi terpasang**, jangan bikin sendiri. Hindari 2FA lewat SMS kalau ada opsi lain (rawan SIM-swap). (🙂 selain password, minta "kode sekali-pakai" atau sidik jari — kalau password bocor, pencuri tetap terkunci di luar.)
8. **Alur pendukung:** lupa-password (token sekali-pakai + kadaluarsa), verifikasi email, **rate-limit + lock** percobaan login (anti brute-force — rujuk `stack/4.14-5-owasp.md`), logout (hapus sesi).
9. **UI (4 state §4.13):** form login validasi client+server, error per-field, loading saat submit; halaman "belum login" vs "tak berhak" beda.

### Gotcha (sering salah)
- Cek otorisasi cuma di frontend = **bisa dilewati** (tombol disembunyikan ≠ endpoint aman). Wajib cek di server.
- Route/Server-Action di Next.js **publik secara default** → tiap yang sensitif wajib cek sesi (rujuk `stack/4.14-1-nextjs.md`).
- Token/secret di env, jangan di kode/log (§8.1 #6).
- Enumerasi user: pesan "email atau password salah" (jangan bocorkan mana yang salah).

### Rujuk-silang (reuse-first — jangan salin)
- Keamanan sesi/CSRF/rate-limit/HIBP detail → `workflows/stack/4.14-5-owasp.md`.
- Cookie flags + header keamanan → `templates/STACK_GUIDE.md`.
- Pack lain: `cap/pembayaran.md` (butuh user login), `cap/ai-rag-aman.md` (authz retrieval).

### Threat-model 3-baris
- **Aset:** akun & data pribadi user, sesi. **Penyerang:** pencuri kredensial (brute-force/phishing), pembajak sesi, pemalsu token JWT, IDOR. **Mitigasi:** hash kuat + rate-limit/lock + cookie aman + putar-sesi + verifikasi JWT (tolak `alg:none`) + 2FA/passkey untuk aksi sensitif + otorisasi server-side default-deny.

### Batas jujur
Pack ini menaikkan lantai keamanan auth; **tidak menjamin** kebal (mis. phishing tetap mungkin walau 2FA/passkey menurunkan risikonya; RBAC/ABAC lanjut menyusul di `stack/4.14-5b`). Untuk data sangat sensitif/kepatuhan → konsultasi keamanan tambahan. Cek dokumentasi resmi library auth **versi terpasang** sebelum menulis kode.
