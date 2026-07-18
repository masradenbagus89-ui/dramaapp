<!-- LINTAS:SEKSI §pembayaran -->

## §pembayaran. Capability Pack — Pembayaran (checkout, webhook, anti bayar-dobel)

> **Kapan dibaca:** "tambah pembayaran / checkout / langganan / tagih / integrasi Midtrans/Xendit/Stripe". Resep merakit pembayaran yang **idempoten & tepercaya** — menutup salah satu kondisi **GENTING-rilis** (§4.6: "webhook bayar/fulfillment tak idempoten"). Baca induk `workflows/cap-packs.md`.

🙂 Analogi: pembayaran = **kasir + buku kas**. Idempoten = "walau struk dicetak 2× karena mesin nge-lag, uangnya cuma dicatat SEKALI". Webhook = "bank menelepon balik toko: 'pembayaran #123 LUNAS'" — toko wajib pastikan telepon itu benar dari bank, bukan penipu.

### Kontrak (yang harus benar)
- **Input:** niat-bayar (jumlah, mata uang, id-pesanan). **Output:** status pembayaran terverifikasi + pesanan ter-update. **Error:** gagal-bayar ditangani (bukan pesanan menggantung). **Uang:** disimpan tipe tepat (integer sen / `numeric`), **JANGAN `float`** (pecahan uang rusak).

### Langkah rakit (prinsip — cek dokumentasi gateway versi terpasang §8.2)
1. **Pakai payment gateway teruji** (Stripe/Midtrans/Xendit) — **JANGAN pegang nomor kartu sendiri** (biar gateway yang PCI-compliant).
2. **Jangan percaya harga dari client.** Hitung total **di server** dari data produk — client cuma kirim id/qty (cegah manipulasi harga).
3. **Idempotency-key:** kirim kunci unik per-transaksi ke gateway + simpan `(key → hasil)` di DB dengan constraint UNIQUE → request ulang mengembalikan hasil tersimpan, **tak memproses 2×** (anti bayar-dobel saat user klik ganda / retry jaringan). Rujuk pola upsert `stack/4.14-2-supabase-prisma.md`.
4. **Webhook konfirmasi (SUMBER KEBENARAN status bayar):**
   - **Verifikasi tanda-tangan** tiap webhook (baca RAW body, bandingkan HMAC **konstan-waktu**) — jangan percaya webhook tanpa verifikasi (penipu bisa palsukan "LUNAS").
   - **Anti-replay:** tolak event yang timestamp-nya kadaluarsa.
   - **Idempoten by event-id:** simpan id event diproses; duplikat dilewati (gateway kirim webhook bisa >1×).
   - **Balas 2xx cepat**, proses berat async (jangan bikin gateway timeout lalu kirim ulang).
5. **Status jujur:** JANGAN tandai "lunas" dari redirect browser (user bisa tutup/refresh) — hanya dari webhook terverifikasi. Sediakan status "menunggu/lunas/gagal".
6. **Uang & bukti:** angka uang tipe tepat; simpan bukti/riwayat transaksi; refund/pembatalan bila relevan.

### Gotcha (sering salah)
- Menandai lunas dari halaman "terima kasih" (redirect) → **rawan**. Webhook yang benar.
- Webhook tanpa verifikasi tanda-tangan → **siapa saja bisa memalsukan pembayaran**.
- Tanpa idempotency → user klik 2× = ketagih 2×.
- Uang pakai `float` → `0.1 + 0.2 ≠ 0.3`, saldo meleset.

### Rujuk-silang (reuse-first — jangan salin)
- Idempoten/upsert DB + transaksi → `workflows/stack/4.14-2-supabase-prisma.md`.
- Terima-webhook aman detail lanjut → peta-jalan `stack/4.14-10` (backend-api-lanjutan — belum tersedia).
- Butuh user login → `cap/auth.md`. Latar-proses (kirim struk/email) → `cap/background-job.md`.

### Threat-model 3-baris
- **Aset:** uang & pesanan pelanggan. **Penyerang:** manipulasi harga, webhook palsu, bayar-dobel karena retry, kebocoran status. **Mitigasi:** hitung harga di server + verifikasi tanda-tangan webhook + idempotency-key + status hanya dari webhook.

### Batas jujur
Pack ini menutup pola-gagal pembayaran paling umum; **tidak menjamin** semua kasus (rekonsiliasi keuangan, pajak, multi-mata-uang, penipuan lanjutan butuh penanganan sendiri). Sandbox dulu sebelum live. Cek dokumentasi resmi gateway **versi terpasang** — nama header tanda-tangan & alur webhook berbeda antar-gateway.
