---
nama: email-transaksional
deskripsi: Email transaksional yang benar-benar SAMPAI — SPF/DKIM/DMARC sebelum kirim pertama, token verifikasi/reset yang aman, antrean + idempotensi, tangani bounce.
divisi: backend
pemicu: [kirim-email, email-verifikasi, reset-password-email, email-notifikasi, masuk-spam, email-gak-sampai, smtp, dkim, dmarc, spf-record, dkim-spf, sendgrid, mailgun, postmark, resend-email, verifikasi-akun, bounce-email, email-blast]
rawan_keamanan: true
menggantikan: []
---

# Skill: Email transaksional — sampai ke inbox, dan tak bisa dipakai membajak akun

> 🙂 **Inti:** email transaksional (verifikasi akun, reset password, struk pesanan) punya DUA kegagalan yang sama-sama tak terlihat di layar. Pertama, emailnya masuk folder spam — kamu tak pernah tahu, yang kamu lihat cuma "pengguna saya sepi". Kedua, tautan reset password yang bisa ditebak orang lain — akun pelanggan diambil alih tanpa satu pun tanda di aplikasimu.

Label bobot: 🔒 HASIL wajib tercapai · 📐 CARA BAKU (pakai kecuali project punya cara lain yang mencapai HASIL sama) · 💡 SARAN · 🧪 CONTOH · 🗃️ LATAR.

---

## 1. Kontrak (yang HARUS benar)

- 🔒 **HASIL — Domain pengirim terotentikasi SEBELUM email pertama dikirim.** SPF + DKIM + DMARC terpasang di DNS. *(SPF = daftar server yang boleh mengirim atas nama domainmu · DKIM = tanda tangan digital di tiap email · DMARC = instruksi ke penerima kalau dua cek itu gagal.)* Tanpa ketiganya, Gmail/Outlook memperlakukan emailmu sebagai kemungkinan penipuan — masuk spam atau ditolak diam-diam.
- 🔒 **HASIL — Token verifikasi/reset: acak kriptografis, DISIMPAN TER-HASH, sekali-pakai, kedaluwarsa ≤60 menit.** Token yang disimpan apa adanya di database = siapa pun yang bisa membaca tabel itu (backup bocor, SQL injection, staff) bisa mengambil alih akun mana pun. Token berbasis waktu/urutan bisa ditebak.
- 🔒 **HASIL — Balasan "lupa password" SERAGAM untuk email terdaftar maupun tidak.** Balasan berbeda = alat pengintip untuk memetakan siapa saja yang punya akun (*user enumeration*).
- 🔒 **HASIL — Host tautan di dalam email berasal dari allowlist server, BUKAN dari header permintaan.** Menyusun tautan dari `Host`/`X-Forwarded-Host` = penyerang mengarahkan tautan reset ke servernya sendiri, dan korban mengklik tautan yang terlihat sah (*host header injection*).
- 🔒 **HASIL — Kredensial provider tak pernah sampai ke browser.** Kunci API email hidup di server/env saja; jangan pernah di berkas yang ikut ter-bundle ke sisi klien.
- 🔒 **HASIL — Kegagalan kirim TERCATAT, bukan hilang.** Email yang gagal masuk log/DLQ dengan alasannya. "Sudah dikirim" tanpa bukti provider menerimanya bukan laporan (§2.3).

---

## 2. Cara rakit

1. 📐 **Pakai provider transaksional** (Resend/SendGrid/Mailgun/Postmark/SES) — **jangan** SMTP Gmail pribadi untuk aplikasi: kuotanya kecil, reputasinya bukan milikmu, dan akun bisa dikunci.
2. 📐 **Kirim dari SUBDOMAIN khusus** (`mail.domainmu.com`, bukan `domainmu.com`). Kalau reputasi pengiriman jatuh, email penting perusahaan di domain utama tidak ikut terseret.
3. 📐 **Pasang DNS SEBELUM kirim pertama** — SPF, DKIM (kunci dari provider), DMARC mulai `p=none` untuk memantau, naik ke `p=quarantine`/`p=reject` setelah laporan bersih.
4. 📐 **Kirim lewat ANTREAN, jangan di dalam permintaan HTTP.** Provider bisa lambat/down; pengguna tak boleh menunggu — dan pendaftarannya tak boleh gagal cuma karena emailnya gagal. Pola antrean + retry + DLQ → `skills/background-job/SKILL.md`.
5. 📐 **Idempotensi:** satu peristiwa = satu email, walau task-nya diulang. Kunci diturunkan dari id peristiwa (id pengguna + jenis email), bukan dari waktu.
6. 📐 **Tangani bounce & keluhan spam** lewat webhook provider: alamat yang *hard bounce* ditandai dan berhenti dikirimi. Terus mengirim ke alamat mati merusak reputasi domainmu.
7. 📐 **Rate-limit permintaan "kirim ulang"** per akun dan per alamat IP — kalau tidak, endpoint itu jadi alat membanjiri orang lain dengan email (dan menghabiskan kuota kirimmu).

---

## 3. Powerful — pasangan ❌ SALAH → ✅ BENAR

**1. Token reset disimpan apa adanya.**

❌ SALAH — token telanjang di database + tanpa kedaluwarsa; bocornya tabel = seluruh akun bisa diambil:
```ts
const token = Math.random().toString(36).slice(2)          // bisa ditebak
await db.resetToken.create({ data: { userId, token } })     // tersimpan apa adanya
```

✅ BENAR — acak kriptografis, yang disimpan hanya sidik jarinya, sekali-pakai + kedaluwarsa:
```ts
import { randomBytes, createHash } from 'node:crypto'
const token = randomBytes(32).toString('base64url')                 // dikirim ke email
const hash = createHash('sha256').update(token).digest('hex')       // yang disimpan
await db.resetToken.create({
  data: { userId, hash, expiresAt: new Date(Date.now() + 60 * 60_000), usedAt: null },
})
```

**2. Balasan "lupa password" membocorkan siapa yang punya akun.**

❌ SALAH — dua balasan berbeda = daftar akun bisa dipetakan orang luar:
```ts
if (!user) return res.status(404).json({ error: 'Email tidak terdaftar' })
return res.json({ message: 'Link reset dikirim' })
```

✅ BENAR — balasan SERAGAM; yang berbeda hanya apa yang terjadi di belakang layar:
```ts
if (user) await antrean.tambah('kirim-reset', { userId: user.id })
return res.json({ message: 'Kalau email itu terdaftar, tautan reset sudah kami kirim.' })
```

**3. Tautan disusun dari header permintaan.**

❌ SALAH — penyerang mengganti `Host`, korban menerima tautan sah-tampak yang menuju servernya:
```ts
const link = `https://${req.headers.host}/reset?token=${token}`
```

✅ BENAR — host dari konfigurasi server, tak pernah dari permintaan:
```ts
const BASE = process.env.APP_URL              // divalidasi saat startup (fail-fast)
const link = `${BASE}/reset?token=${encodeURIComponent(token)}`
```

**4. Email dikirim di dalam permintaan pendaftaran.**

❌ SALAH — provider lambat = pendaftaran gagal, padahal akunnya sudah dibuat:
```ts
const user = await db.user.create({ data })
await mailer.send(user.email, verifikasi(user))   // provider timeout -> 500 ke pengguna
return res.json({ ok: true })
```

✅ BENAR — akun dibuat, email diantrekan; kegagalan kirim tak menjatuhkan pendaftaran:
```ts
const user = await db.user.create({ data })
await antrean.tambah('kirim-verifikasi', { userId: user.id }, { idempotencyKey: `verif:${user.id}` })
return res.json({ ok: true })
```

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "email jalan")

- [ ] Kirim uji ke Gmail **dan** Outlook, lalu buka **header** email masuknya: `Authentication-Results` menunjukkan `spf=pass`, `dkim=pass`, `dmarc=pass`? (Ini bukti sesungguhnya — "emailnya masuk kok" di satu akun bukan bukti.)
- [ ] Emailnya mendarat di **Inbox**, bukan Spam/Promosi, di kedua penyedia?
- [ ] Token reset: acak kriptografis, DISIMPAN ter-hash, sekali-pakai, kedaluwarsa ≤60 menit — dibuktikan dengan membaca skema + kodenya, bukan diingat?
- [ ] Token yang SUDAH dipakai ditolak saat dicoba ulang? Token kedaluwarsa ditolak?
- [ ] Balasan "lupa password" SAMA PERSIS untuk email terdaftar dan tidak (bandingkan dua respons nyata)?
- [ ] Tautan di email memakai host dari env, bukan dari header permintaan?
- [ ] Kunci API provider tidak ada di kode yang terkirim ke browser (cek bundle, bukan asumsi)?
- [ ] Pengiriman lewat antrean + punya kunci idempotensi, jadi retry tak mengirim dobel?
- [ ] Webhook bounce terpasang + alamat *hard bounce* berhenti dikirimi?
- [ ] Endpoint "kirim ulang" ber-rate-limit per akun dan per IP?

> **Verifikasi WAJIB memakai bukti**: header `Authentication-Results` dan respons nyata. "Harusnya sampai" bukan laporan (§2.3).

---

## 5. Definition-of-Done

- [ ] **Kontrak (§1) terpenuhi** — SPF/DKIM/DMARC pass · token ter-hash sekali-pakai · balasan seragam · host dari allowlist · kredensial server-only · kegagalan tercatat.
- [ ] **Edge case** ditangani: provider down (antrean + retry + DLQ), alamat tak ada (bounce), pengguna menekan "kirim ulang" berkali-kali (rate-limit + idempotensi), token dipakai dua kali, token kedaluwarsa.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris` atau header email nyata.
- [ ] Alur reset password ditinjau bersama `skills/auth/SKILL.md` (token = bagian dari permukaan login).

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Login, sesi, dan aturan password** → `skills/auth/SKILL.md`. Reset password adalah pintu masuk akun: keputusan di sini terikat ke sana.
- 📐 **Antrean, retry, DLQ, idempotensi** → `skills/background-job/SKILL.md` (jangan tulis ulang mekanismenya di sini).
- 📐 **Rate-limit endpoint "kirim ulang"** → `skills/rate-limiting/SKILL.md`.
- 📐 **Validasi env fail-fast (`APP_URL`, kunci provider) + rahasia di dashboard platform** → `skills/deploy/SKILL.md`.
- 📐 **Escape konten pengguna di dalam badan email HTML** → `skills/owasp/SKILL.md` (nama pengguna yang dirender mentah = jalan masuk yang sama seperti di halaman web).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** kendali akun pengguna, reputasi domain pengirim, kuota kirim. **Mode-gagal khas:** token reset ditebak atau dicuri dari database, tautan reset diarahkan ke host penyerang, daftar akun dipetakan lewat beda balasan, email masuk spam karena DNS tak lengkap, reputasi jatuh karena terus mengirim ke alamat mati, endpoint "kirim ulang" dipakai membanjiri orang lain, kunci provider bocor ke bundle browser. **Mitigasi:** token acak kriptografis ter-hash sekali-pakai berkedaluwarsa + host dari env + balasan seragam + SPF/DKIM/DMARC + webhook bounce + rate-limit + kunci server-only.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** keandalan & keamanan email transaksional. Ia **tidak** menjamin masuk Inbox — penyedia email menilai reputasi pengirim dari waktu ke waktu, dan domain baru selalu butuh masa pemanasan. Ia juga **bukan** panduan email pemasaran massal (kepatuhan berlangganan/CAN-SPAM/GDPR marketing = topik lain). Angka ambang dan nama fitur provider berubah — cek dokumentasi provider yang benar-benar dipakai, jangan dari ingatan (§2.1).

🙂 **Non-Programmer:** dua hal yang paling sering bikin rugi diam-diam. Pertama, email verifikasi masuk folder spam — pendaftar mengira aplikasimu rusak lalu pergi, dan kamu tak pernah dapat laporannya. Kedua, tautan "reset password" yang mudah ditebak — orang lain bisa masuk ke akun pelangganmu tanpa perlu tahu passwordnya. Keduanya dicegah dengan memasang tiga catatan DNS sebelum email pertama dikirim, dan menyimpan tautan reset dalam bentuk teracak yang hanya berlaku sekali dan kedaluwarsa dalam satu jam.
