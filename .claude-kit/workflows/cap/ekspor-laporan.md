<!-- LINTAS:SEKSI §ekspor-laporan -->

## §ekspor-laporan. Capability Pack — Ekspor & Laporan (CSV/Excel/PDF/terjadwal) kelas-industri

> **Kapan dibaca:** "ekspor data / unduh CSV / export Excel / cetak PDF / laporan bulanan / kirim laporan otomatis / download tabel". Resep merakit ekspor & laporan yang **aman, tak bocorkan data, dan tak menjatuhkan server** saat volume besar. Baca induk `workflows/cap-packs.md`.

🙂 Analogi: ekspor = **mesin fotokopi + kurir laporan bulanan**. Salin data ke bentuk yang bisa dibawa keluar (Excel/PDF), TAPI jangan ikut-salin yang rahasia, dan jangan bikin kantor macet saat mencetak ribuan halaman sekaligus.

### Kontrak (yang harus benar)
- **Input:** permintaan ekspor (filter, rentang tanggal, format). **Output:** berkas (CSV/Excel/PDF) berisi **HANYA** data yang user berhak lihat. **Error:** terlalu besar → alihkan ke proses latar; hasil kosong → pesan jelas, bukan berkas rusak. **Rahasia:** jangan sertakan kolom sensitif (data pribadi/rahasia) di luar hak user; jangan bocorkan data pelanggan/tenant lain.

### Langkah rakit (prinsip — cek dokumentasi library versi terpasang §8.2)
1. **Otorisasi ekspor = cek-ulang izin per-baris pakai identitas SERVER-side.** Jangan asumsi "kalau bisa lihat halaman, boleh ekspor semua". Ekspor adalah jalan bocor **IDOR** massal (ganti ID/filter untuk tarik data orang lain, §8) — saring data sesuai izin user (dan tenant untuk multi-pelanggan) SEBELUM menulis berkas. Rujuk `workflows/cap/auth.md`.
2. **Cegah CSV injection (formula injection).** Sel yang diawali `=`, `+`, `-`, atau `@` bisa dieksekusi sebagai **rumus berbahaya** saat berkas dibuka di Excel/Google Sheets (mis. mencuri data / jalankan perintah). Awali sel teks yang mulai dengan karakter itu dengan tanda kutip/escape. Ini gotcha keamanan #1 ekspor CSV — sering terlupa.
3. **Ekspor besar JANGAN sinkron di request-response.** Ribuan/jutaan baris = timeout + **kehabisan memori (OOM)** server, kadang menjatuhkan layanan untuk SEMUA user. Pola aman: antre di latar (rujuk `workflows/cap/background-job.md`) → tulis **streaming** (baris-per-baris / kursor, jangan muat semua ke memori) ke storage → beri **link unduh berbatas-waktu** (rujuk `workflows/cap/upload-storage.md` untuk signed URL) → kabari user saat selesai (rujuk `workflows/cap/email-notifikasi.md`). **Batasi juga laju & jumlah ekspor per user** (rate-limit + kuota harian + maks 1-2 job aktif/user) — streaming hanya menjinakkan SATU ekspor besar; tanpa batas ini, user/skrip bisa memicu ratusan ekspor beruntun yang membanjiri antrean latar & biaya storage.
4. **Pilih format sesuai kebutuhan:**
   - **CSV/Excel** untuk data tabular — pakai library yang benar meng-escape + mendukung streaming (mis. `csv-stringify`, `exceljs` mode stream). Untuk Excel Windows tambah **UTF-8 BOM** agar huruf non-ASCII tak jadi "mojibake" (teks kacau).
   - **PDF** untuk laporan berformat (invoice, sertifikat). Render server-side. **Hati-hati:** PDF dari HTML yang memuat input user = jalan **XSS** (kode/script berbahaya milik user ikut jalan saat halaman dirender) **/ SSRF** (server ditipu mengakses alamat internal) — sanitasi input, batasi resource yang boleh dimuat.
5. **Laporan terjadwal** = pekerjaan cron di latar (rujuk `workflows/cap/background-job.md`): **idempoten** (diulang saat retry tak menghasilkan laporan/email dobel), **zona waktu eksplisit** ("harian jam berapa, TZ mana"), simpan histori laporan.
6. **Angka & waktu konsisten (rujuk `workflows/cap/i18n.md`):** format lokal untuk tampilan, tapi untuk data yang akan diproses ulang sertakan nilai mentah; timezone eksplisit; pemisah desimal/ribuan sesuai locale target (koma vs titik salah = laporan keuangan salah baca).
7. **Retensi berkas ekspor.** Ekspor = salinan data sensitif yang menumpuk. Simpan di storage **privat** + link kadaluarsa; hapus terjadwal (retensi). Nama berkas jangan bocorkan info sensitif.

### Gotcha (sering salah)
- **CSV injection** diabaikan → user buka di Excel, rumus jahat jalan.
- Ekspor sinkron besar → timeout/OOM, kadang menjatuhkan server untuk semua orang.
- Query ekspor ikut bawa **kolom yang user tak berhak** (join tabel menyeret kolom internal).
- **PDF dari HTML** tanpa sanitasi → XSS/SSRF.
- Link unduh **publik tanpa kadaluarsa** → siapa pun yang pegang link bisa unduh data sensitif.
- Locale angka/tanggal salah → laporan salah dibaca (1.000 vs 1,000).

### Rujuk-silang (reuse-first — jangan salin)
- Antre latar + retry + jadwal cron → `workflows/cap/background-job.md`.
- Simpan hasil + link unduh berbatas-waktu (signed URL) → `workflows/cap/upload-storage.md`.
- Kabari user hasil siap → `workflows/cap/email-notifikasi.md`.
- Otorisasi per-baris / anti-IDOR → `workflows/cap/auth.md` + `workflows/stack/4.14-5-owasp.md`.
- Format angka/tanggal/locale → `workflows/cap/i18n.md`.

### Threat-model 3-baris
- **Aset:** data yang diekspor (sering data pribadi/keuangan), integritas laporan, ketersediaan server. **Penyerang:** pencuri data lewat ekspor over-broad/IDOR, penyalahguna CSV-injection, pelaku **DoS** (serangan membanjiri server sampai tumbang) via ekspor raksasa/berulang. **Mitigasi:** otorisasi per-baris server-side + escape sel CSV + ekspor besar via latar+streaming + **rate-limit/kuota ekspor per-user** + link kadaluarsa + retensi.

### Batas jujur
Pack ini menaikkan lantai keamanan & skalabilitas ekspor; **tidak menjamin** performa untuk volume ekstrem (butuh arsitektur data/warehouse khusus) atau kepatuhan format laporan spesifik industri (pajak, akuntansi, regulator) — verifikasi kebutuhan format legal itu terpisah. Cek dokumentasi library CSV/Excel/PDF **versi terpasang** (API escaping & streaming berbeda antar-versi).
