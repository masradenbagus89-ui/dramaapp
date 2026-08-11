---
nama: pembayaran
deskripsi: Checkout & webhook anti bayar-dobel kelas-industri — idempoten, harga dihitung di server, status hanya dari webhook terverifikasi.
divisi: keamanan
pemicu: [bayar, pembayaran, payment, checkout, invoice, faktur, tagihan, langganan, subscription, midtrans, xendit, stripe]
rawan_keamanan: true
menggantikan: [pembayaran]
---

# Skill: Pembayaran (checkout · webhook · anti bayar-dobel) — kelas industri

> **Kapan skill ini aktif:** prompt menyentuh "tambah pembayaran / checkout / langganan / tagih / integrasi Midtrans/Xendit/Stripe". Menutup salah satu kondisi **GENTING penghenti-rilis** (§4.6: "webhook bayar/fulfillment tak idempoten"). `rawan_keamanan: true` → buka rak keamanan sebelum edit pertama.
>
> 🙂 **Analogi:** pembayaran = **kasir + buku kas**. **Idempoten** (kebal-ulang) = "walau struk dicetak 2× karena mesin nge-lag, uangnya cuma dicatat SEKALI". **Webhook** (panggilan-balik) = "bank menelepon balik toko: 'pembayaran #123 LUNAS'" — toko wajib pastikan telepon itu benar dari bank, bukan penipu.

Skill ini **advisory** (§4.17), TAPI butir **🔒 HASIL** menyangkut uang = tak boleh gagal. Cek dokumentasi gateway **versi terpasang** (§8.2 A3) — nama header tanda-tangan & alur webhook beda antar-gateway.

---

## 1. Kontrak (yang HARUS benar)

- 🔒 **HASIL:**
  - **Input:** niat-bayar (jumlah, mata uang, id-pesanan). **Output:** status pembayaran terverifikasi + pesanan ter-update. **Error:** gagal-bayar ditangani (bukan pesanan menggantung).
  - **Uang:** disimpan tipe tepat — **integer satuan-terkecil (sen) / `numeric`**, **JANGAN `float`** (🧪 CONTOH: `0.1 + 0.2 ≠ 0.3` → saldo meleset diam-diam).

---

## 2. Cara rakit (prinsip — cek dokumentasi gateway versi terpasang §8.2)

1. 📐 **Pakai payment gateway teruji** (Stripe/Midtrans/Xendit) — **JANGAN pegang nomor kartu sendiri** (biar gateway yang PCI-compliant = tersertifikasi keamanan kartu).
2. 🔒 **HASIL — Jangan percaya harga dari client.** Hitung total **di server** dari data produk — client cuma kirim id/qty (cegah manipulasi harga lewat body request).
3. 📐 **Idempotency-key** (kunci-kebal-ulang): kirim kunci unik per-transaksi ke gateway + simpan `(key → hasil)` di DB dengan constraint `UNIQUE` → request ulang mengembalikan hasil tersimpan, **tak memproses 2×** (anti bayar-dobel saat user klik ganda / retry jaringan). Pola upsert → `skills/supabase-prisma/SKILL.md`.
4. 🔒 **HASIL — Webhook = SUMBER KEBENARAN status bayar (4 aturan wajib).** Alamat webhook publik → siapa pun bisa ikut "menelepon"; 4 aturan ini membedakan uang masuk beneran dari palsu:
   - 📐 **Baca RAW body sebelum di-parse.** Tanda-tangan dihitung dari byte asli; begitu framework mengubahnya jadi JSON (spasi/urutan-kunci bergeser), tanda-tangan tak akan cocok. Next.js App Router: `await req.text()`, JANGAN `await req.json()` dulu.
   - 📐 **Bandingkan tanda-tangan konstan-waktu** (`crypto.timingSafeEqual`, BUKAN `===`). `===` berhenti di huruf pertama yang beda → selisih waktu bocorkan tanda-tangan huruf-demi-huruf. Tolak **401 sebelum menyentuh DB** kalau tak cocok.
   - 📐 **Anti-replay + idempoten by event-id:** simpan `event_id` di kolom `UNIQUE`; sudah ada → balas 200 lalu berhenti (gateway SENGAJA kirim ulang kalau balasan telat — ini normal, bukan error). Tolak event yang timestamp-nya kadaluarsa.
   - 📐 **Balas 2xx cepat, kerja berat async.** Kirim struk/email/update-stok → antrean (`skills/background-job/SKILL.md`). Balasan >beberapa detik → gateway anggap gagal lalu ulang → kamu memproses pembayaran yang sama berkali-kali.
5. 🔒 **HASIL — Status jujur:** JANGAN tandai "lunas" dari **redirect browser** / halaman "terima kasih" (user bisa tutup/refresh/palsukan) — **hanya dari webhook terverifikasi**. Sediakan status "menunggu / lunas / gagal".
6. 📐 **Uang & bukti:** angka uang tipe tepat; simpan bukti/riwayat transaksi; refund/pembatalan bila relevan.

---

## 3. Powerful — urutan wiring aman

📐 CARA BAKU: rakit dalam urutan ini supaya tiap lapis menutup lubang lapis sebelumnya: **(1)** harga dihitung server → **(2)** buat niat-bayar + idempotency-key → **(3)** redirect ke gateway (bukan pegang kartu) → **(4)** webhook verifikasi tanda-tangan (RAW body + konstan-waktu) → **(5)** dedup event-id → **(6)** update status "lunas" HANYA di sini → **(7)** efek samping (struk/fulfillment) via background-job idempoten. 🧪 Sandbox gateway dulu sebelum live.

---

## 4. Self-verify (sangkal diri sebelum "selesai" — §8.2 Aturan 3)

- [ ] Total dihitung **di server** (uji: kirim harga palsu di body → ditolak/diabaikan)?
- [ ] Webhook memverifikasi **tanda-tangan** (RAW body + konstan-waktu) + tolak 401 sebelum DB?
- [ ] **Idempoten**: proses event yang sama 2× → efek 1× (uji: kirim ulang webhook)?
- [ ] Klik "bayar" 2× / retry jaringan → **tak ketagih 2×** (idempotency-key)?
- [ ] Status "lunas" **hanya** dari webhook, bukan redirect browser?
- [ ] Uang bukan `float`?

---

## 5. Definition-of-Done

- [ ] **Kontrak (§1) ditulis** (input/output/error/tipe-uang).
- [ ] 4 aturan webhook + idempotency-key + harga-server + status-dari-webhook terpasang.
- [ ] **Edge case**: klik ganda, retry webhook, webhook palsu (tanda-tangan salah), gateway timeout, refund.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] **Rak keamanan dibuka** (`skills/owasp/SKILL.md`) — `rawan_keamanan: true`.
- [ ] Diuji di **sandbox** gateway; min 1 happy-path (bayar sukses) + 1 alur "webhook dobel → 1× efek".

---

## 6. Handoff / rujuk-silang (reuse-first — jangan salin)

- 📐 Idempoten/upsert DB + transaksi → `skills/supabase-prisma/SKILL.md`.
- 📐 Kirim struk/email di latar (idempoten) → `skills/background-job/SKILL.md` (skill: `background-job`).
- 📐 User login sebelum bayar → `skills/auth/SKILL.md`. Keamanan web (rate-limit/CORS) → `skills/owasp/SKILL.md`.
- 🗃️ LATAR — Rak asal skill ini hanya di riwayat git (ADR-027).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** uang & pesanan pelanggan. **Penyerang:** manipulasi harga, webhook palsu, bayar-dobel karena retry, kebocoran status. **Mitigasi:** hitung harga di server + verifikasi tanda-tangan webhook (RAW+konstan-waktu) + idempotency-key + status hanya dari webhook.
- 🗃️ **LATAR — Batas jujur:** menutup pola-gagal pembayaran paling umum; **tidak menjamin** semua kasus (rekonsiliasi keuangan, pajak, multi-mata-uang, penipuan lanjutan butuh penanganan sendiri). Sandbox dulu sebelum live. Cek dokumentasi gateway **versi terpasang**.
