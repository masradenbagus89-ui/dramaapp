---
nama: email-notifikasi
deskripsi: Kirim email/OTP/notifikasi kelas-industri — sampai ke inbox (SPF/DKIM/DMARC), OTP aman (hash/expiry/sekali-pakai), tak jadi corong spammer.
divisi: backend
pemicu: [email, surel, otp, kode verifikasi, notifikasi, notification, kirim pesan]
rawan_keamanan: false
menggantikan: [email/notifikasi]
---

# Skill: Email & Notifikasi (kirim email/OTP/notif) — kelas industri

> **Kapan skill ini aktif:** prompt menyentuh "kirim email / notifikasi / OTP / kode verifikasi / reset password / struk / undangan / newsletter". Dispatcher `rak-pemicu` menyalakannya otomatis. Resep merakit pengiriman email yang **sampai ke inbox, tak disalahgunakan spammer, dan OTP-nya aman**.
>
> 🙂 **Analogi:** email = **kantor pos**. Kalau alamat pengirimmu tak terverifikasi (SPF/DKIM/DMARC = "surat izin resmi"), surat masuk **kotak spam** atau dicurigai palsu. Kirim surat = titip ke kurir profesional (provider), jangan bawa sendiri ke tiap rumah (SMTP dari server app = sering diblok).

Skill ini **advisory** (§4.17): otak native memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = jaminan yang tak boleh gagal. Cek dokumentasi provider **versi terpasang** sebelum menulis kode (§8.2 A3) — nama header, format webhook, dan cara verifikasi domain berbeda antar-provider.

---

## 1. Kontrak (yang HARUS benar — tulis DULU)

- 🔒 **HASIL:**
  - **Input:** niat kirim (penerima, template, data).
  - **Output:** email terkirim + status (terkirim / mental (bounce) / mengeluh (complaint)).
  - **Error:** gagal transient (gagal sementara — jaringan/provider sesaat) → coba-ulang; jangan kirim dobel.
  - **Rahasia:** API key provider **server-only**; jangan bocorkan daftar email penerima antar-pengguna.

---

## 2. Cara rakit (prinsip — cek dokumentasi provider versi terpasang §8.2)

1. 📐 **CARA BAKU — Pakai provider email teruji** (Resend, SendGrid, Amazon SES, Postmark) — **jangan** kirim SMTP mentah dari server app (deliverability jelek + IP gampang masuk daftar-hitam).
2. 📐 **CARA BAKU — Deliverability = setel SPF + DKIM + DMARC di DNS domain.** Tiga ini bukti "email ini benar dari kami" supaya tak masuk spam / tak bisa dipalsukan orang (spoofing). Verifikasi domain pengirim di dashboard provider. Tanpa ini, email penting (OTP, struk) sering nyangkut di spam.
3. 📐 **CARA BAKU — Kirim di LATAR (antrean), jangan blok request user.** Panggilan ke provider bisa lambat/gagal → masukkan ke antrean latar + **coba-ulang berjeda (backoff)** untuk gagal transient (rujuk `skills/background-job/SKILL.md`). Buat **idempoten**: satu event bisnis = satu email, walau job di-retry (jangan kirim 3× struk yang sama).
4. 🔒 **HASIL — OTP / kode verifikasi aman:**
   - 📐 CARA BAKU: Kode **acak kripto** (`crypto.randomBytes`, bukan `Math.random`), simpan **HASH**-nya di DB (bukan kode mentah).
   - 📐 CARA BAKU: **Masa-berlaku pendek** (mis. 5–10 menit) + **sekali-pakai** + **batas percobaan** (anti brute-force = tebak kode berulang) + rate-limit permintaan-kirim (anti banjir SMS/email).
   - 📐 CARA BAKU: **Jangan** taruh OTP/token di URL yang ikut ter-log; jangan tampilkan di response. (Rujuk alur sesi `skills/auth/SKILL.md`.)
5. 🔒 **HASIL — Anti-abuse (jangan jadi corong spammer):** form yang mengirim email ke alamat arbitrer + isi dari user = disalahgunakan untuk spam/phishing atas nama domainmu. Rate-limit per-user/IP, verifikasi alamat, batasi siapa boleh memicu kirim. **Escape konten dari user** yang masuk ke email (cegah injeksi tautan phishing).
6. 📐 **CARA BAKU — Kelola bounce & complaint (webhook provider):** alamat yang **mental** atau **mengeluh** (tandai spam) → hapus dari daftar kirim otomatis (menjaga reputasi pengirim; kalau tidak, provider menurunkan deliverability semua emailmu).
7. 📐 **CARA BAKU — Pisah email transaksional vs marketing:** transaksional (OTP, struk, reset) = boleh tanpa opt-in. Marketing/newsletter = **butuh persetujuan (consent)** + tautan **berhenti-langganan (unsubscribe)** yang berfungsi (wajib hukum di banyak wilayah; rujuk peta-jalan `templates/PRIVACY_PDP_NON_LEGAL`).

---

## 3. Gotcha (sering salah)

- 📐 CARA BAKU: **Tanpa SPF/DKIM/DMARC** → email penting masuk spam / domainmu dipalsukan. Setel dulu sebelum rilis.
- 📐 CARA BAKU: **Kirim sinkron di dalam request** → halaman lambat/timeout kalau provider lelet. Selalu di latar.
- 📐 CARA BAKU: **OTP tanpa batas percobaan / masa-berlaku** → ditebak paksa (brute-force). Wajib expiry + attempt-limit + sekali-pakai.
- 📐 CARA BAKU: **Simpan OTP/token mentah / log-kan** → bocor = akun dibajak. Simpan hash, jangan log.
- 📐 CARA BAKU: **Konten user tak di-escape di email HTML** → phishing/injeksi tautan atas nama kamu.
- 📐 CARA BAKU: **Abaikan bounce/complaint** → reputasi pengirim jatuh, semua email nyangkut spam.

---

## 4. Self-verify (sangkal diri sebelum "selesai" — §8.2 Aturan 3)

- [ ] Domain pengirim **terverifikasi** + **SPF + DKIM + DMARC** terpasang di DNS (uji: kirim tes → cek header, tak masuk spam)?
- [ ] Kirim lewat **provider teruji**, bukan SMTP mentah dari server app?
- [ ] Pengiriman di **latar (antrean)** + retry-backoff untuk gagal transient + **idempoten** (satu event bisnis = satu email, walau job di-retry)?
- [ ] OTP: **acak kripto** + **hash di DB** (bukan mentah) + **expiry pendek** + **sekali-pakai** + **batas percobaan** + rate-limit permintaan-kirim?
- [ ] OTP/token **tak** di URL yang ter-log, **tak** ditampilkan di response, **tak** di-log?
- [ ] **Anti-abuse:** rate-limit per-user/IP + verifikasi alamat + batasi pemicu kirim + **escape konten user** di email HTML?
- [ ] **Bounce/complaint** dikelola (webhook) → alamat mental/mengeluh dihapus dari daftar kirim otomatis?
- [ ] Marketing/newsletter punya **consent** + tautan **unsubscribe** yang berfungsi?

---

## 5. Definition-of-Done

- [ ] **Kontrak (§1) ditulis** (input/output/error/rahasia).
- [ ] SPF/DKIM/DMARC + provider teruji + kirim-di-latar + idempoten + OTP aman + anti-abuse + kelola bounce/complaint terpasang.
- [ ] **Edge case** diuji: provider lelet/timeout, gagal transient berulang, OTP kedaluwarsa/ditebak paksa, alamat mental, konten user berisi tautan jahat.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] API key provider **server-only** (bukan di repo/log/klien); daftar email tak bocor antar-pengguna.
- [ ] build + lint + test lulus; min 1 test happy-path (email terkirim) + 1 alur "OTP salah berulang → terkunci".

---

## 6. Handoff / rujuk-silang (reuse-first — jangan salin)

- 💡 SARAN: Kirim di latar + retry/backoff + DLQ → `skills/background-job/SKILL.md`.
- 💡 SARAN: OTP dalam alur login/verifikasi + sesi → `skills/auth/SKILL.md`.
- 💡 SARAN: Rate-limit + escape output (anti-abuse) → `skills/owasp/SKILL.md`.
- 🗃️ LATAR: Notifikasi in-app langsung (muncul di dalam aplikasi, bukan email) = kanal terpisah dari email, di luar cakupan skill ini. Consent/privasi → peta-jalan `templates/PRIVACY_PDP_NON_LEGAL`.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** kotak masuk user, reputasi domain pengirim, OTP/token. **Penyerang:** spam via form, brute-force OTP, spoofing domain, phishing lewat konten, banjir permintaan-kirim. **Mitigasi:** SPF/DKIM/DMARC + rate-limit + OTP hash/expiry/sekali-pakai/attempt-limit + escape konten + kelola bounce/complaint.
- 🗃️ **LATAR — Batas jujur:** Deliverability juga bergantung reputasi & pemanasan (warm-up) IP/domain, isi email (kata pemicu spam), dan kebijakan penyedia inbox — pack ini menaikkan lantai, tak menjamin "selalu masuk inbox". SMS-OTP butuh gateway SMS terpisah dengan pertimbangan biaya/penipuan sendiri. Cek dokumentasi resmi provider **versi terpasang** — nama header, format webhook, dan cara verifikasi domain berbeda antar-provider.
