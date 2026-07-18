<!-- LINTAS:SEKSI §email-notifikasi -->

## §email-notifikasi. Capability Pack — Email & Notifikasi (kirim email/OTP/notif) kelas-industri

> **Kapan dibaca:** "kirim email / notifikasi / OTP / kode verifikasi / reset password / struk / undangan / newsletter". Resep merakit pengiriman email yang **sampai ke inbox, tak disalahgunakan spammer, dan OTP-nya aman**. Baca induk `workflows/cap-packs.md`.

🙂 Analogi: email = **kantor pos**. Kalau alamat pengirimmu tak terverifikasi (SPF/DKIM/DMARC = "surat izin resmi"), surat masuk **kotak spam** atau dicurigai palsu. Kirim surat = titip ke kurir profesional (provider), jangan bawa sendiri ke tiap rumah (SMTP dari server app = sering diblok).

### Kontrak (yang harus benar)
- **Input:** niat kirim (penerima, template, data). **Output:** email terkirim + status (terkirim / mental (bounce) / mengeluh (complaint)). **Error:** gagal transient (gagal sementara — jaringan/provider sesaat) → coba-ulang; jangan kirim dobel. **Rahasia:** API key provider **server-only**; jangan bocorkan daftar email penerima antar-pengguna.

### Langkah rakit (prinsip — cek dokumentasi provider versi terpasang §8.2)
1. **Pakai provider email teruji** (Resend, SendGrid, Amazon SES, Postmark) — **jangan** kirim SMTP mentah dari server app (deliverability jelek + IP gampang masuk daftar-hitam).
2. **Deliverability = setel SPF + DKIM + DMARC di DNS domain.** Tiga ini bukti "email ini benar dari kami" supaya tak masuk spam / tak bisa dipalsukan orang (spoofing). Verifikasi domain pengirim di dashboard provider. Tanpa ini, email penting (OTP, struk) sering nyangkut di spam.
3. **Kirim di LATAR (antrean), jangan blok request user.** Panggilan ke provider bisa lambat/gagal → masukkan ke antrean latar + **coba-ulang berjeda (backoff)** untuk gagal transient (rujuk `cap/background-job.md`). Buat **idempoten**: satu event bisnis = satu email, walau job di-retry (jangan kirim 3× struk yang sama).
4. **OTP / kode verifikasi aman:**
   - Kode **acak kripto** (`crypto.randomBytes`, bukan `Math.random`), simpan **HASH**-nya di DB (bukan kode mentah).
   - **Masa-berlaku pendek** (mis. 5–10 menit) + **sekali-pakai** + **batas percobaan** (anti brute-force = tebak kode berulang) + rate-limit permintaan-kirim (anti banjir SMS/email).
   - **Jangan** taruh OTP/token di URL yang ikut ter-log; jangan tampilkan di response. (Rujuk alur sesi `cap/auth.md`.)
5. **Anti-abuse (jangan jadi corong spammer):** form yang mengirim email ke alamat arbitrer + isi dari user = disalahgunakan untuk spam/phishing atas nama domainmu. Rate-limit per-user/IP, verifikasi alamat, batasi siapa boleh memicu kirim. **Escape konten dari user** yang masuk ke email (cegah injeksi tautan phishing).
6. **Kelola bounce & complaint (webhook provider):** alamat yang **mental** atau **mengeluh** (tandai spam) → hapus dari daftar kirim otomatis (menjaga reputasi pengirim; kalau tidak, provider menurunkan deliverability semua emailmu).
7. **Pisah email transaksional vs marketing:** transaksional (OTP, struk, reset) = boleh tanpa opt-in. Marketing/newsletter = **butuh persetujuan (consent)** + tautan **berhenti-langganan (unsubscribe)** yang berfungsi (wajib hukum di banyak wilayah; rujuk peta-jalan `templates/PRIVASI_PDP_NON_LEGAL`).

### Gotcha (sering salah)
- **Tanpa SPF/DKIM/DMARC** → email penting masuk spam / domainmu dipalsukan. Setel dulu sebelum rilis.
- **Kirim sinkron di dalam request** → halaman lambat/timeout kalau provider lelet. Selalu di latar.
- **OTP tanpa batas percobaan / masa-berlaku** → ditebak paksa (brute-force). Wajib expiry + attempt-limit + sekali-pakai.
- **Simpan OTP/token mentah / log-kan** → bocor = akun dibajak. Simpan hash, jangan log.
- **Konten user tak di-escape di email HTML** → phishing/injeksi tautan atas nama kamu.
- **Abaikan bounce/complaint** → reputasi pengirim jatuh, semua email nyangkut spam.

### Rujuk-silang (reuse-first — jangan salin)
- Kirim di latar + retry/backoff + DLQ → `cap/background-job.md`.
- OTP dalam alur login/verifikasi + sesi → `cap/auth.md`.
- Rate-limit + escape output (anti-abuse) → `workflows/stack/4.14-5-owasp.md`.
- Notifikasi in-app langsung (bukan email) → `cap/realtime.md`. Consent/privasi → peta-jalan `templates/PRIVASI_PDP_NON_LEGAL`.

### Threat-model 3-baris
- **Aset:** kotak masuk user, reputasi domain pengirim, OTP/token. **Penyerang:** spam via form, brute-force OTP, spoofing domain, phishing lewat konten, banjir permintaan-kirim. **Mitigasi:** SPF/DKIM/DMARC + rate-limit + OTP hash/expiry/sekali-pakai/attempt-limit + escape konten + kelola bounce/complaint.

### Batas jujur
Deliverability juga bergantung reputasi & pemanasan (warm-up) IP/domain, isi email (kata pemicu spam), dan kebijakan penyedia inbox — pack ini menaikkan lantai, tak menjamin "selalu masuk inbox". SMS-OTP butuh gateway SMS terpisah dengan pertimbangan biaya/penipuan sendiri. Cek dokumentasi resmi provider **versi terpasang** — nama header, format webhook, dan cara verifikasi domain berbeda antar-provider.
