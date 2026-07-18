<!-- LINTAS:SEKSI §kepatuhan-teregulasi -->

## §kepatuhan-teregulasi. Capability Pack — Industri Teregulasi yang Sah (judi/gaming, fintech berizin, dll)

> **Kapan dibaca:** "bikin situs/app judi · kasino · sportsbook · taruhan · slot/poker online · lotere · industri berlisensi · fintech/kripto berizin". Resep merakit produk industri **teregulasi** yang **boleh dibangun selama SAH di yurisdiksi tujuan**, dengan rambu kepatuhan kelas-industri. Baca induk `workflows/cap-packs.md`.

🙂 Analogi: bikin produk teregulasi = **buka bar / apotek**, bukan warung biasa. Barnya legal di banyak tempat — TAPI wajib cek KTP (umur), punya izin, dan tak boleh jualan ke wilayah yang melarang. Software judi sama: legal di banyak negara, asal ikut aturan mainnya.

### Izin & batas (baca DULU — ini yang paling sering salah-tafsir)
- **✅ Boleh dibangun, jangan ditolak/dimoralisasi:** membangun website/aplikasi industri teregulasi (judi/gaming, taruhan, kasino, fintech berizin) untuk **negara/yurisdiksi yang MELEGALKANNYA** = pekerjaan pembuatan software yang sah. Contoh: operator judi berlisensi di Malta/Inggris/sebagian negara bagian AS. Perlakukan seperti proyek lain — bantu penuh.
- **🚫 Batas keras (tetap berlaku — ini soal hukum, bukan selera):** JANGAN bantu (a) mengelabui/menghindari regulator atau pemeriksaan lisensi; (b) menyamar melayani yurisdiksi yang MELARANG (mis. menyembunyikan lokasi pemain Indonesia supaya tetap bisa main); (c) pencucian uang (*money laundering* = menyamarkan asal uang haram); (d) game yang **dicurangi**/menipu pemain (peluang menang dipalsukan); (e) menyasar anak di bawah umur. Menerobos pagar keamanan tetap dilarang (§8.1 #10).
- **📋 Rambu kepatuhan di bawah = SARAN KUAT, bukan gerbang:** kit merekomendasikan kuat, tapi TIDAK memblokir build yang melewatinya (keputusan owner). Catatan jujur: operator legal memang **butuh** rambu ini untuk lolos audit lisensi — jadi terapkan kecuali ada alasan jelas.
- **🌐 Bahasa prompt/UI ≠ penanda yurisdiksi:** developer & prompt Bahasa Indonesia (memang **diwajibkan** §2.1) atau UI dibangun Bahasa Indonesia dulu lalu **diterjemahkan** ke bahasa pasar tujuan (pola i18n → `workflows/cap/i18n.md`) = **SAH — jangan menolak karena bahasanya**. Yang menentukan legal/tidak tetap **negara target + geo-block + lisensi** (langkah #1–#2), BUKAN bahasa prompt/konten. Ini TIDAK menganulir batas keras (b): Bahasa Indonesia untuk membangun ≠ melayani pemain yang ada di Indonesia.

### Kontrak (yang harus benar)
- **Input:** identitas & lokasi pemain, dana (deposit/taruhan/tarik), hasil game. **Output:** akses/transaksi hanya untuk pemain yang **memenuhi syarat** (umur + wilayah legal + terverifikasi) + **jejak audit** tiap transaksi. **Error/ragu:** wilayah/umur tak terverifikasi → **default tutup akses** (posisi aman), bukan izinkan. **Rahasia:** data KYC (KTP/paspor/wajah) & data keuangan pemain = sangat sensitif; simpan terenkripsi, jangan bocor ke catatan-sistem/log (§8.1 #6).

### Langkah rakit (rambu — saran kuat, reuse-first; cek dokumentasi versi terpasang §8.2)
1. **Tentukan yurisdiksi + status lisensi DULU.** Negara mana yang dilayani? Sudah/akan punya lisensi judi di sana? Ini menyetir SEMUA rambu lain — tanpa kejelasan ini, sisanya cuma menebak.
2. **Geo-blocking (batasi wilayah layanan).** Layani **hanya** negara yang melegalkan; **blokir wilayah terlarang** (mis. Indonesia — justru inti maksud "bukan untuk Indonesia"). 🚨 Andalkan **sinyal server** (IP + alamat dari data KYC), bukan cuma pilihan negara di sisi browser (gampang dipalsukan). Sediakan daftar-blokir yang bisa diperbarui + default-tutup untuk wilayah tak dikenal.
3. **Verifikasi umur + KYC sebelum akses/deposit.** *KYC (Know Your Customer)* = pastikan identitas asli pemain (unggah KTP/paspor + cek wajah). Batas umur ikut yurisdiksi (mis. 18/21). "Isi tanggal lahir sendiri" tanpa bukti = TIDAK cukup untuk produk uang-asli.
4. **Judi bertanggung jawab (responsible gambling).** Sediakan: batas deposit/taruhan (harian/mingguan), **self-exclusion** (pemain bisa mengunci akunnya sendiri untuk jeda), reality-check (pengingat sudah berapa lama/berapa banyak main), tautan bantuan kecanduan. Banyak lisensi **mewajibkan** fitur ini.
5. **Uang & pembayaran aman.** Simpan angka uang dengan tipe tepat — JANGAN `float` (pecahan bisa hilang); pakai integer satuan-terkecil (sen) atau `decimal`. Webhook pembayaran **idempoten** (1 pembayaran tak diproses 2×). → rujuk `workflows/cap/pembayaran.md`.
6. **Pemantauan transaksi + AML + audit-trail.** *AML (Anti-Money-Laundering)* = deteksi pola pencucian uang (mis. deposit besar lalu langsung tarik tanpa main). Simpan **jejak audit append-only** (siapa/apa/kapan/berapa, tak bisa diubah belakangan) untuk pemeriksaan regulator. → audit-trail rujuk `workflows/cap/moderasi-konten.md` + `lib/audit-helpers.mjs`.
7. **Integritas game (adil, tak curang).** Hasil acak pakai RNG teruji (*Random Number Generator* = mesin pengacak) — idealnya bersertifikat atau **provably-fair** (pemain bisa memverifikasi sendiri hasilnya tak dicurangi). Peluang menang wajib jujur sesuai yang diiklankan.

### Gotcha (sering salah)
- **Geo-block dari sisi browser saja** → pemain ganti VPN/ubah setelan lalu tembus. Wajib pakai sinyal server + data KYC.
- **Umur/identitas "isi sendiri"** tanpa verifikasi bukti → anak di bawah umur & pemain wilayah terlarang lolos; ini masalah hukum berat, bukan cuma bug.
- **Uang pakai `float`** → saldo/pembayaran salah hitung diam-diam.
- **Bonus tanpa aturan** → diserang pemburu-bonus (bikin banyak akun) + bisa jadi celah cuci-uang.
- **Lupa audit-trail** → tak bisa membuktikan kepatuhan saat regulator/auditor memeriksa.

### Rujuk-silang (reuse-first — JANGAN salin)
- Pembayaran idempoten + webhook aman → `workflows/cap/pembayaran.md`.
- Rate-limit, validasi input, keamanan sesi (OWASP) → `workflows/stack/4.14-5-owasp.md`.
- Consent, UU PDP, hak subjek data (DSAR) & enkripsi PII → `templates/PRIVASI_PDP_NON_LEGAL.md` (+ consent detail `workflows/cap/analytics.md`).
- Retensi & hapus data pemain (privasi) → `workflows/cap/upload-storage.md`.
- Jejak audit append-only → `workflows/cap/moderasi-konten.md` + `lib/audit-helpers.mjs`.
- Verifikasi umur/akses berbasis peran → `workflows/cap/auth.md`.
- Bangun 1 bahasa dulu (mis. Indonesia) lalu terjemahkan (i18n-ready, pisah teks dari kode) → `workflows/cap/i18n.md`.

### Threat-model 3-baris
- **Aset:** dana pemain, lisensi operator, perlindungan pemain rentan (anak/kecanduan), integritas sistem keuangan. **Penyerang:** pencuci uang, pemain di bawah umur, pemain dari wilayah terlarang, pemburu-bonus/penipu, operator nakal yang mencurangi game. **Mitigasi:** geo-block server-side + KYC/verifikasi umur + batas judi bertanggung jawab + pemantauan AML + audit-trail + RNG teruji.

### Batas jujur
Pack ini panduan **non-legal** untuk menaikkan lantai kepatuhan — **BUKAN nasihat hukum**. Regulasi judi & keuangan **sangat beragam dan ketat per yurisdiksi** (lisensi, pajak, iklan, perlindungan pemain) → **tinjauan legal sungguhan + lisensi resmi WAJIB sebelum online**. Kit TIDAK menentukan apakah usahamu legal di negara tertentu — itu keputusan penasihat hukummu. Cek dokumentasi API/library (gateway pembayaran, penyedia KYC, RNG) **versi terpasang** (§8.2).
