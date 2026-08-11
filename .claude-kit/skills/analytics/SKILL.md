---
nama: analytics
deskripsi: Analytics (lacak kunjungan/konversi/event) kelas-industri — consent-first, tanpa PII ke pihak ketiga, event kritis diukur di server.
divisi: product
pemicu: [analytics, analitik, lacak, tracking, kunjungan, statistik pengunjung]
rawan_keamanan: false
menggantikan: [analitik]
---

# Skill: Analytics (lacak kunjungan/konversi/event) — kelas industri

> **Kapan skill ini aktif:** prompt menyentuh "lacak kunjungan / analytics / statistik / konversi / event / funnel / pasang Google Analytics / ukur perilaku user". Dispatcher `rak-pemicu` menyalakannya otomatis. Ini resep merakit pengukuran yang **berguna untuk keputusan TANPA melanggar privasi**.
>
> 🙂 **Analogi:** analytics = **buku tamu + kotak saran toko**. Hitung berapa yang datang & apa yang mereka lakukan, TAPI **jangan diam-diam mencatat data pribadi** (nama, no. HP, isi keranjang) tanpa izin — itu melanggar kepercayaan dan hukum.

Skill ini **advisory** (§4.17): otak native memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = jaminan privasi & akurasi yang tak boleh gagal. Cek dokumentasi resmi alat **versi terpasang** sebelum menulis kode (§8.2 A3) — API event & pengaturan privasi/consent berbeda antar-alat.

---

## 1. Kontrak (yang HARUS benar — tulis DULU)

- 🗃️ **LATAR:**
  - **Input:** event (aksi user: lihat halaman, klik, beli).
  - **Output:** angka teragregasi untuk mengambil keputusan produk/bisnis.
  - **Privasi:** **jangan** kirim data pribadi (PII = Personally Identifiable Information, data yang bisa mengenali orang: nama, email, no. HP) ke pihak ketiga tanpa persetujuan; hormati "tolak dilacak".
  - **Rahasia:** kunci/ID properti analytics diperlakukan sesuai dok penyedia (banyak yang memang publik, tapi jangan campur dengan secret lain).

---

## 2. Cara rakit (prinsip — cek dokumentasi alat versi terpasang §8.2)

1. 📐 **CARA BAKU — Lacak minimal 3 aksi inti sejak rilis (§10):** **view** halaman utama, **klik CTA** (Call To Action = tombol ajakan bertindak), **konversi** (daftar/beli/kirim). Tentukan dulu event yang PENTING — jangan lacak semuanya (jadi bising, mahal, dan menambah risiko privasi tanpa manfaat).
2. 🔒 **HASIL — Consent dulu untuk pelacakan non-esensial (wajib UU PDP Indonesia / GDPR).** Consent = persetujuan user sebelum dilacak. Tampilkan **banner persetujuan** sebelum menyalakan analytics yang memakai cookie/mengidentifikasi orang; sediakan opsi **tolak** yang benar-benar mematikannya. Analytics anonim-agregat tanpa cookie umumnya lebih longgar — tetap cek aturan wilayahmu (rujuk peta-jalan `templates/PRIVACY_PDP_NON_LEGAL`).
3. 🔒 **HASIL — JANGAN kirim PII ke analytics pihak ketiga.** Email, nama, no. HP, alamat, isi form, nomor pesanan yang mengidentifikasi = **jangan** dikirim ke Google/pihak ketiga. Pakai ID anonim/pseudonim + agregasi. **Redaksi (redact = sensor/hapus)** query-string sensitif (mis. token di URL) sebelum terkirim.
4. 💡 **SARAN — Pilih alat sesuai kebutuhan privasi:**
   - 💡 SARAN: **Privacy-first** (Plausible, Umami, Fathom) — tanpa cookie, ringan, sering tak butuh banner consent, bisa self-host (dipasang di server sendiri). Cocok untuk metrik dasar.
   - 💡 SARAN: **GA4 / analytics fitur-lengkap** — kuat untuk funnel (alur langkah user sampai konversi)/segmen, TAPI butuh consent + konfigurasi privasi hati-hati.
5. 🔒 **HASIL — Ukur event bisnis-kritis di SERVER, bukan hanya browser.** Event browser bisa **diblok adblock** atau hilang (koneksi putus) → angka konversi/pembayaran kurang akurat. Untuk angka yang jadi dasar keputusan uang, catat di server (mis. saat webhook pembayaran sukses — rujuk `skills/pembayaran/SKILL.md`).
6. 📐 **CARA BAKU — Skema event konsisten:** samakan penamaan (`checkout_selesai`, bukan campur `btn_click`/`click_button`) + properti standar. Skema kacau = data tak bisa dianalisis.
7. 📐 **CARA BAKU — Jaga performa (§10):** skrip analytics jangan blok render (muat `async`/`defer`); batasi jumlah skrip pihak ketiga (tiap skrip = beban + risiko privasi); hormati sinyal "Do Not Track"/Global Privacy Control (sinyal browser "jangan lacak saya") bila relevan.

---

## 3. Gotcha (sering salah)

- 🗃️ LATAR: **Kirim PII ke GA** (email di URL/parameter) → langgar privasi + melanggar ToS (Terms of Service = syarat layanan) Google → properti bisa disetop.
- 🗃️ LATAR: **Lacak tanpa consent** di wilayah yang mewajibkan → risiko hukum/denda.
- 🗃️ LATAR: **Lacak segala-galanya** → bising, mahal, sulit dibaca, dan memperluas paparan data.
- 🗃️ LATAR: **Hanya client-side untuk angka penting** → meleset karena adblock/koneksi. Ukur kritis di server.
- 🗃️ LATAR: **Skrip sinkron di `<head>`** → halaman lambat (buruk untuk UX & SEO/Core Web Vitals — metrik kecepatan halaman dari Google).
- 🗃️ LATAR: **Nama event tak konsisten** → laporan tak bisa dijumlahkan.

---

## 4. Self-verify (sangkal diri sebelum "selesai" — §8.2 Aturan 3)

- [ ] Hanya event **inti yang PENTING** dilacak (bukan segala-galanya)?
- [ ] **Consent-banner** tampil sebelum pelacakan non-esensial + opsi **tolak** benar-benar mematikan?
- [ ] **Tak ada PII** (email/nama/no.HP/nomor pesanan/token URL) yang terkirim ke pihak ketiga — sudah di-redaksi?
- [ ] Angka bisnis-kritis (konversi/pembayaran) **diukur di server**, bukan cuma browser?
- [ ] Nama event **konsisten** (satu skema, bukan campur)?
- [ ] Skrip analytics **tak blok render** (`async`/`defer`, tak sinkron di `<head>`)?

---

## 5. Definition-of-Done

- [ ] **Kontrak (§1) ditulis** (input/output/privasi/rahasia).
- [ ] Consent-first + tanpa-PII ke pihak ketiga + event kritis diukur di server + skema event konsisten terpasang.
- [ ] **Edge case** diuji: user menolak consent (pelacakan mati total), adblock (event browser hilang → server tetap catat), PII tak sengaja terkirim (di-redaksi).
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Skrip analytics tak blok render (`async`/`defer`); tinjauan privasi (UU PDP/GDPR) dijadwalkan bila pakai consent.
- [ ] build + lint + test lulus; min 1 test happy-path (event tercatat) + 1 alur "consent ditolak → tak ada cookie/PII terkirim".

---

## 6. Handoff / rujuk-silang (reuse-first — jangan salin)

- 🗃️ LATAR: 3 aksi inti + performa (jangan blok render) → baseline Frontend/SEO (§10) & `skills/seo/SKILL.md`.
- 🗃️ LATAR: Konversi/pembayaran diukur dari webhook server → `skills/pembayaran/SKILL.md`.
- 🗃️ LATAR: Consent & data pribadi (privasi) → peta-jalan `templates/PRIVACY_PDP_NON_LEGAL`.
- 🗃️ LATAR: Jangan bocorkan PII di log/pihak ketiga → `skills/owasp/SKILL.md`.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** data perilaku user, kepatuhan privasi, reputasi & kepercayaan. **Risiko:** kebocoran PII ke pihak ketiga, pelanggaran consent/hukum, pelacakan berlebihan yang jadi liabilitas, angka bisnis salah karena hanya client-side. **Mitigasi:** consent-first + tanpa-PII + agregasi/anonim + event kritis diukur di server + minimalkan skrip pihak ketiga.
- 🗃️ **LATAR — Batas jujur:** Kepatuhan privasi (UU PDP Indonesia, GDPR, CCPA) butuh tinjauan **legal** sungguhan — skill ini panduan **non-legal** untuk menaikkan lantai, bukan nasihat hukum. Atribusi akurat (dari mana konversi datang) itu sulit dan penuh asumsi; jangan perlakukan angka analytics sebagai kebenaran mutlak. Cek dokumentasi resmi alat **versi terpasang** — API event & pengaturan privasi/consent berbeda antar-alat.
