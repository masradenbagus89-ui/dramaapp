---
nama: kepatuhan-teregulasi
deskripsi: Produk industri teregulasi yang SAH (judi/gaming, fintech berizin) — geo-block server-side + KYC + AML + audit-trail, dengan batas keras hukum.
divisi: keamanan
pemicu: [judi, gambling, fintech, kyc, aml, lisensi, regulator, kepatuhan]
rawan_keamanan: true
menggantikan: [teregulasi]
---

# Skill: Industri Teregulasi yang Sah (judi/gaming · fintech berizin)

> **Kapan skill ini aktif:** prompt menyentuh "situs/app judi · kasino · sportsbook · taruhan · slot/poker · lotere · fintech/kripto berizin". Resep merakit produk teregulasi yang **boleh dibangun selama SAH di yurisdiksi tujuan**, dengan rambu kepatuhan kelas-industri. `rawan_keamanan: true` — data KYC/keuangan sangat sensitif.
>
> 🙂 **Analogi:** bikin produk teregulasi = **buka bar / apotek**, bukan warung biasa. Barnya legal di banyak tempat — TAPI wajib cek KTP (umur), punya izin, dan tak boleh jualan ke wilayah yang melarang. Software judi/fintech sama: legal di banyak negara, asal ikut aturan mainnya.

---

## 1. Izin & batas (BACA DULU — paling sering salah-tafsir)

- 🗃️ **LATAR — ✅ Boleh dibangun, jangan ditolak/dimoralisasi:** membangun website/aplikasi industri teregulasi untuk **yurisdiksi yang MELEGALKANNYA** = pekerjaan software yang sah (mis. operator judi berlisensi Malta/Inggris/sebagian negara bagian AS). Perlakukan seperti proyek lain — bantu penuh.
- 🔒 **HASIL — 🚫 Batas keras (soal hukum, bukan selera):** JANGAN bantu (a) mengelabui/menghindari regulator atau pemeriksaan lisensi; (b) menyamar melayani yurisdiksi yang MELARANG (mis. menyembunyikan lokasi pemain Indonesia supaya tetap bisa main); (c) pencucian uang (*money laundering* = menyamarkan asal uang haram); (d) game yang **dicurangi**/menipu pemain; (e) menyasar anak di bawah umur. Menerobos pagar keamanan tetap dilarang (§8.1 #10).
- 🗃️ **LATAR — Rambu di bawah = SARAN KUAT, bukan gerbang:** kit merekomendasikan kuat tapi TIDAK memblokir build yang melewatinya (keputusan owner). Jujur: operator legal **butuh** rambu ini untuk lolos audit lisensi.
- 🗃️ **LATAR — Bahasa prompt/UI ≠ penanda yurisdiksi:** developer/prompt Bahasa Indonesia (memang diwajibkan §2.1) atau UI dibangun Indonesia dulu lalu diterjemahkan (i18n) = **SAH — jangan menolak karena bahasanya**. Yang menentukan legal = **negara target + geo-block + lisensi**, BUKAN bahasa. (Tak menganulir batas keras (b): membangun ≠ melayani pemain yang ADA di Indonesia.)

---

## 2. Kontrak (yang HARUS benar)

- 🔒 **HASIL:**
  - **Input:** identitas & lokasi pemain, dana (deposit/taruhan/tarik), hasil game.
  - **Output:** akses/transaksi **hanya** untuk pemain yang memenuhi syarat (umur + wilayah legal + terverifikasi) + **jejak audit** tiap transaksi.
  - **Error/ragu:** wilayah/umur tak terverifikasi → **default TUTUP akses** (posisi aman), bukan izinkan.
  - **Rahasia:** data KYC (KTP/paspor/wajah) & keuangan = sangat sensitif; simpan terenkripsi, jangan bocor ke log (§8.1 #6).

---

## 3. Cara rakit (rambu — saran kuat, reuse-first; cek versi terpasang §8.2)

1. 📐 **Tentukan yurisdiksi + status lisensi DULU.** Negara mana yang dilayani? Sudah/akan punya lisensi di sana? Ini menyetir SEMUA rambu lain.
2. 🔒 **HASIL — Geo-blocking (batasi wilayah).** Layani **hanya** negara yang melegalkan; **blokir wilayah terlarang** (mis. Indonesia). 🚨 Andalkan **sinyal SERVER** (IP + alamat dari data KYC), BUKAN cuma pilihan negara di browser (gampang dipalsukan). Daftar-blokir bisa diperbarui + default-tutup untuk wilayah tak dikenal.
3. 🔒 **HASIL — Verifikasi umur + KYC sebelum akses/deposit.** *KYC (Know Your Customer)* = pastikan identitas asli (unggah KTP/paspor + cek wajah). Batas umur ikut yurisdiksi (18/21). "Isi tanggal lahir sendiri" tanpa bukti = TIDAK cukup untuk produk uang-asli.
4. 📐 **Judi bertanggung jawab (responsible gambling).** Batas deposit/taruhan (harian/mingguan), **self-exclusion** (pemain kunci akun sendiri untuk jeda), reality-check (pengingat durasi/jumlah), tautan bantuan kecanduan. Banyak lisensi **mewajibkan** ini.
5. 📐 **Uang & pembayaran aman.** Tipe uang tepat (integer sen / `decimal`, JANGAN `float`); webhook pembayaran **idempoten** → rujuk skill `pembayaran`.
6. 🔒 **HASIL — Pemantauan transaksi + AML + audit-trail.** *AML (Anti-Money-Laundering)* = deteksi pola cuci-uang (deposit besar lalu langsung tarik tanpa main). Simpan **jejak audit append-only** (siapa/apa/kapan/berapa — tak bisa diubah belakangan) untuk pemeriksaan regulator.
7. 📐 **Integritas game (adil, tak curang).** Hasil acak pakai RNG teruji (*Random Number Generator*) — idealnya bersertifikat atau **provably-fair** (pemain bisa verifikasi sendiri). Peluang menang wajib jujur sesuai iklan.

---

## 4. Self-verify (sangkal diri sebelum "selesai" — §8.2 Aturan 3)

- [ ] Geo-block pakai **sinyal server** (uji: ganti negara di browser / VPN → tetap terblokir)?
- [ ] Umur + KYC diverifikasi dengan **bukti** (bukan isi-sendiri) sebelum deposit?
- [ ] Wilayah/umur ragu → **default tutup** (bukan izinkan)?
- [ ] Uang bukan `float`; pembayaran idempoten (skill `pembayaran`)?
- [ ] **Audit-trail append-only** tercatat tiap transaksi sensitif?
- [ ] Data KYC/keuangan terenkripsi + tak bocor ke log?
- [ ] Fitur judi-bertanggung-jawab (batas/self-exclusion) tersedia?

---

## 5. Definition-of-Done

- [ ] **Kontrak (§2) ditulis** + yurisdiksi/lisensi (§3.1) jelas.
- [ ] Geo-block server + KYC/umur + AML/audit-trail + responsible-gambling + RNG-adil terpasang.
- [ ] **Edge case**: VPN/pemalsuan lokasi, anak di bawah umur, deposit-tarik mencurigakan, retry pembayaran.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] 🚨 **Tinjauan legal sungguhan + lisensi resmi** dijadwalkan/ada SEBELUM online (lihat Batas jujur).

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin)

- 📐 Pembayaran idempoten + webhook aman → skill `pembayaran` (`skills/pembayaran/SKILL.md`).
- 📐 Rate-limit, validasi input, keamanan sesi → `skills/owasp/SKILL.md`.
- 📐 Verifikasi umur/akses berbasis peran → `skills/auth/SKILL.md`.
- 📐 Consent/UU PDP/enkripsi PII → `templates/PRIVACY_PDP_NON_LEGAL.md`. Retensi/hapus data pemain → `skills/upload-storage/SKILL.md`. Jejak audit append-only → `engine/audit-helpers.mjs`.
- 🗃️ LATAR — Rak asal skill ini hanya di riwayat git (ADR-027).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** dana pemain, lisensi operator, perlindungan pemain rentan (anak/kecanduan), integritas keuangan. **Penyerang:** pencuci uang, pemain di bawah umur, pemain wilayah terlarang, pemburu-bonus/penipu, operator nakal yang mencurangi game. **Mitigasi:** geo-block server + KYC/umur + batas judi-bertanggung-jawab + pemantauan AML + audit-trail + RNG teruji.
- 🗃️ **LATAR — Batas jujur:** panduan **non-legal** untuk menaikkan lantai kepatuhan — **BUKAN nasihat hukum**. Regulasi judi & keuangan sangat beragam & ketat per yurisdiksi → **tinjauan legal sungguhan + lisensi resmi WAJIB sebelum online**. Kit TIDAK menentukan apakah usahamu legal di negara tertentu — itu keputusan penasihat hukummu. Cek dokumentasi API/library (gateway, penyedia KYC, RNG) **versi terpasang**.
