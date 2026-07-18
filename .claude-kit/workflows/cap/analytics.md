<!-- LINTAS:SEKSI §analytics -->

## §analytics. Capability Pack — Analytics (lacak kunjungan/konversi/event) kelas-industri

> **Kapan dibaca:** "lacak kunjungan / analytics / statistik / konversi / event / funnel / pasang Google Analytics / ukur perilaku user". Resep merakit pengukuran yang **berguna untuk keputusan TANPA melanggar privasi**. Baca induk `workflows/cap-packs.md`.

🙂 Analogi: analytics = **buku tamu + kotak saran toko**. Hitung berapa yang datang & apa yang mereka lakukan, TAPI **jangan diam-diam mencatat data pribadi** (nama, no. HP, isi keranjang) tanpa izin — itu melanggar kepercayaan dan hukum.

### Kontrak (yang harus benar)
- **Input:** event (aksi user: lihat halaman, klik, beli). **Output:** angka teragregasi untuk mengambil keputusan produk/bisnis. **Privasi:** **jangan** kirim data pribadi (PII) ke pihak ketiga tanpa persetujuan; hormati "tolak dilacak". **Rahasia:** kunci/ID properti analytics diperlakukan sesuai dok penyedia (banyak yang memang publik, tapi jangan campur dengan secret lain).

### Langkah rakit (prinsip — cek dokumentasi alat versi terpasang §8.2)
1. **Lacak minimal 3 aksi inti sejak rilis (§10):** **view** halaman utama, **klik CTA** (tombol ajakan), **konversi** (daftar/beli/kirim). Tentukan dulu event yang PENTING — jangan lacak semuanya (jadi bising, mahal, dan menambah risiko privasi tanpa manfaat).
2. **Consent dulu untuk pelacakan non-esensial (wajib UU PDP Indonesia / GDPR).** Tampilkan **banner persetujuan** sebelum menyalakan analytics yang memakai cookie/mengidentifikasi orang; sediakan opsi **tolak** yang benar-benar mematikannya. Analytics anonim-agregat tanpa cookie umumnya lebih longgar — tetap cek aturan wilayahmu (rujuk peta-jalan `templates/PRIVASI_PDP_NON_LEGAL`).
3. **JANGAN kirim PII ke analytics pihak ketiga.** Email, nama, no. HP, alamat, isi form, nomor pesanan yang mengidentifikasi = **jangan** dikirim ke Google/pihak ketiga. Pakai ID anonim/pseudonim + agregasi. **Redaksi (redact)** query-string sensitif (mis. token di URL) sebelum terkirim.
4. **Pilih alat sesuai kebutuhan privasi:**
   - **Privacy-first** (Plausible, Umami, Fathom) — tanpa cookie, ringan, sering tak butuh banner consent, bisa self-host. Cocok untuk metrik dasar.
   - **GA4 / analytics fitur-lengkap** — kuat untuk funnel/segmen, TAPI butuh consent + konfigurasi privasi hati-hati.
5. **Ukur event bisnis-kritis di SERVER, bukan hanya browser.** Event browser bisa **diblok adblock** atau hilang (koneksi putus) → angka konversi/pembayaran kurang akurat. Untuk angka yang jadi dasar keputusan uang, catat di server (mis. saat webhook pembayaran sukses — rujuk `cap/pembayaran.md`).
6. **Skema event konsisten:** samakan penamaan (`checkout_selesai`, bukan campur `btn_click`/`click_button`) + properti standar. Skema kacau = data tak bisa dianalisis.
7. **Jaga performa (§10):** skrip analytics jangan blok render (muat `async`/`defer`); batasi jumlah skrip pihak ketiga (tiap skrip = beban + risiko privasi); hormati sinyal "Do Not Track"/Global Privacy Control bila relevan.

### Gotcha (sering salah)
- **Kirim PII ke GA** (email di URL/parameter) → langgar privasi + melanggar ToS Google (properti bisa disetop).
- **Lacak tanpa consent** di wilayah yang mewajibkan → risiko hukum/denda.
- **Lacak segala-galanya** → bising, mahal, sulit dibaca, dan memperluas paparan data.
- **Hanya client-side untuk angka penting** → meleset karena adblock/koneksi. Ukur kritis di server.
- **Skrip sinkron di `<head>`** → halaman lambat (buruk untuk UX & SEO/Core Web Vitals).
- **Nama event tak konsisten** → laporan tak bisa dijumlahkan.

### Rujuk-silang (reuse-first — jangan salin)
- 3 aksi inti + performa (jangan blok render) → baseline Frontend/SEO (§10) & `workflows/stack/4.14-6-seo.md`.
- Konversi/pembayaran diukur dari webhook server → `cap/pembayaran.md`.
- Consent & data pribadi (privasi) → peta-jalan `templates/PRIVASI_PDP_NON_LEGAL`.
- Jangan bocorkan PII di log/pihak ketiga → `workflows/stack/4.14-5-owasp.md`.

### Threat-model 3-baris
- **Aset:** data perilaku user, kepatuhan privasi, reputasi & kepercayaan. **Risiko:** kebocoran PII ke pihak ketiga, pelanggaran consent/hukum, pelacakan berlebihan yang jadi liabilitas, angka bisnis salah karena hanya client-side. **Mitigasi:** consent-first + tanpa-PII + agregasi/anonim + event kritis diukur di server + minimalkan skrip pihak ketiga.

### Batas jujur
Kepatuhan privasi (UU PDP Indonesia, GDPR, CCPA) butuh tinjauan **legal** sungguhan — pack ini panduan **non-legal** untuk menaikkan lantai, bukan nasihat hukum. Atribusi akurat (dari mana konversi datang) itu sulit dan penuh asumsi; jangan perlakukan angka analytics sebagai kebenaran mutlak. Cek dokumentasi resmi alat **versi terpasang** — API event & pengaturan privasi/consent berbeda antar-alat.
