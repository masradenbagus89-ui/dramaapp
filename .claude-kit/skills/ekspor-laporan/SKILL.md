---
nama: ekspor-laporan
deskripsi: Ekspor & laporan (CSV/Excel/PDF/terjadwal) kelas-industri — anti CSV-injection, otorisasi per-baris server-side, ekspor besar via latar + streaming.
divisi: backend
pemicu: [ekspor, export, unduh, download, csv, excel, laporan, report, rekap]
rawan_keamanan: false
menggantikan: [ekspor/laporan]
---

# Skill: Ekspor & Laporan (CSV/Excel/PDF/terjadwal) — kelas industri

> **Kapan skill ini aktif:** prompt menyentuh "ekspor data / unduh CSV / export Excel / cetak PDF / laporan bulanan / kirim laporan otomatis / download tabel / rekap". Dispatcher `rak-pemicu` menyalakannya otomatis. Resep merakit ekspor & laporan yang **aman, tak bocorkan data, dan tak menjatuhkan server** saat volume besar.
>
> 🙂 **Analogi:** ekspor = **mesin fotokopi + kurir laporan bulanan**. Salin data ke bentuk yang bisa dibawa keluar (Excel/PDF), TAPI jangan ikut-salin yang rahasia, dan jangan bikin kantor macet saat mencetak ribuan halaman sekaligus.

Skill ini **advisory** (§4.17): otak native memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = jaminan yang tak boleh gagal (data yang user tak berhak tak ikut terekspor, sel CSV di-escape, server tak tumbang saat volume besar). Cek dokumentasi library CSV/Excel/PDF **versi terpasang** sebelum menulis kode (§8.2 A3) — API escaping & streaming beda antar-versi.

---

## 1. Kontrak (yang HARUS benar — tulis DULU)

- 🔒 **HASIL:**
  - **Input:** permintaan ekspor (filter, rentang tanggal, format).
  - **Output:** berkas (CSV/Excel/PDF) berisi **HANYA** data yang user berhak lihat.
  - **Error:** terlalu besar → alihkan ke proses latar; hasil kosong → pesan jelas, bukan berkas rusak.
  - **Rahasia:** jangan sertakan kolom sensitif (data pribadi/rahasia) di luar hak user; jangan bocorkan data pelanggan/tenant lain.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama; cek dokumentasi library versi terpasang §8.2)

1. 🔒 **HASIL — Otorisasi ekspor = cek-ulang izin per-baris pakai identitas SERVER-side.** Jangan asumsi "kalau bisa lihat halaman, boleh ekspor semua". Ekspor adalah jalan bocor **IDOR** massal (Insecure Direct Object Reference = ganti ID/filter untuk tarik data orang lain, §8) — saring data sesuai izin user (dan tenant untuk multi-pelanggan) SEBELUM menulis berkas. Rujuk `skills/auth/SKILL.md`.
2. 🔒 **HASIL — Cegah CSV injection (formula injection).** Sel yang diawali `=`, `+`, `-`, atau `@` bisa dieksekusi sebagai **rumus berbahaya** saat berkas dibuka di Excel/Google Sheets (mis. mencuri data / jalankan perintah). Awali sel teks yang mulai dengan karakter itu dengan tanda kutip/escape. Ini gotcha keamanan #1 ekspor CSV — sering terlupa.
3. 📐 **CARA BAKU — Ekspor besar JANGAN sinkron di request-response.** Ribuan/jutaan baris = timeout + **kehabisan memori (OOM = Out Of Memory, server kehabisan RAM)** server, kadang menjatuhkan layanan untuk SEMUA user. Pola aman: antre di latar (rujuk `skills/background-job/SKILL.md`) → tulis **streaming** (baris-per-baris / kursor, jangan muat semua ke memori) ke storage → beri **link unduh berbatas-waktu** (rujuk `skills/upload-storage/SKILL.md` untuk signed URL = link bertanda-tangan yang kadaluarsa) → kabari user saat selesai (rujuk `skills/email-notifikasi/SKILL.md`). **Batasi juga laju & jumlah ekspor per user** (rate-limit + kuota harian + maks 1-2 job aktif/user) — streaming hanya menjinakkan SATU ekspor besar; tanpa batas ini, user/skrip bisa memicu ratusan ekspor beruntun yang membanjiri antrean latar & biaya storage.
4. 💡 **SARAN — Pilih format sesuai kebutuhan:**
   - 📐 CARA BAKU: **CSV/Excel** untuk data tabular — pakai library yang benar meng-escape + mendukung streaming (mis. `csv-stringify`, `exceljs` mode stream). Untuk Excel Windows tambah **UTF-8 BOM** (Byte Order Mark = penanda encoding di awal berkas) agar huruf non-ASCII tak jadi "mojibake" (teks kacau).
   - 📐 CARA BAKU: **PDF** untuk laporan berformat (invoice, sertifikat). Render server-side. **Hati-hati:** PDF dari HTML yang memuat input user = jalan **XSS** (Cross-Site Scripting = kode/script berbahaya milik user ikut jalan saat halaman dirender) **/ SSRF** (Server-Side Request Forgery = server ditipu mengakses alamat internal) — sanitasi input, batasi resource yang boleh dimuat.
5. 📐 **CARA BAKU — Laporan terjadwal** = pekerjaan cron di latar (rujuk `skills/background-job/SKILL.md`): **idempoten** (diulang saat retry tak menghasilkan laporan/email dobel), **zona waktu eksplisit** ("harian jam berapa, TZ mana"), simpan histori laporan.
6. 📐 **CARA BAKU — Angka & waktu konsisten:** format lokal untuk tampilan, tapi untuk data yang akan diproses ulang sertakan nilai mentah; timezone eksplisit; pemisah desimal/ribuan sesuai locale target (koma vs titik salah = laporan keuangan salah baca).
7. 📐 **CARA BAKU — Retensi berkas ekspor.** Ekspor = salinan data sensitif yang menumpuk. Simpan di storage **privat** + link kadaluarsa; hapus terjadwal (retensi). Nama berkas jangan bocorkan info sensitif.

---

## 3. Gotcha (sering salah)

- 🗃️ **LATAR:** **CSV injection** diabaikan → user buka di Excel, rumus jahat jalan.
- 🗃️ **LATAR:** Ekspor sinkron besar → timeout/OOM, kadang menjatuhkan server untuk semua orang.
- 🗃️ **LATAR:** Query ekspor ikut bawa **kolom yang user tak berhak** (join tabel menyeret kolom internal).
- 🗃️ **LATAR:** **PDF dari HTML** tanpa sanitasi → XSS/SSRF.
- 🗃️ **LATAR:** Link unduh **publik tanpa kadaluarsa** → siapa pun yang pegang link bisa unduh data sensitif.
- 🗃️ **LATAR:** Locale angka/tanggal salah → laporan salah dibaca (1.000 vs 1,000).

---

## 4. Self-verify (sangkal diri sebelum "selesai" — §8.2 Aturan 3)

- [ ] Otorisasi ekspor dicek **per-baris pakai identitas server-side** (uji: ganti filter/ID → tak bisa tarik data orang lain)?
- [ ] Sel CSV yang mulai `=`/`+`/`-`/`@` di-**escape** (anti CSV-injection)?
- [ ] Ekspor besar **via latar + streaming** (bukan sinkron di request), + rate-limit/kuota per-user?
- [ ] PDF dari HTML memuat input user → **sanitasi** (anti XSS/SSRF)?
- [ ] Link unduh **berbatas-waktu** (signed URL) + retensi/hapus terjadwal?
- [ ] Kolom sensitif / data tenant lain **tak ikut** terekspor?

---

## 5. Definition-of-Done

- [ ] **Kontrak (§1) ditulis** (input/output/error/rahasia).
- [ ] Otorisasi per-baris + escape CSV + ekspor besar via latar+streaming + rate-limit/kuota + link kadaluarsa + retensi terpasang.
- [ ] **Edge case** diuji: ekspor jutaan baris (tak OOM), sel formula jahat, filter manipulasi IDOR, hasil kosong, locale angka/tanggal.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] build + lint + test lulus; min 1 test happy-path (ekspor benar) + 1 alur "ekspor over-broad → data user lain tak bocor".

---

## 6. Handoff / rujuk-silang (reuse-first — jangan salin)

- 💡 **SARAN:** Antre latar + retry + jadwal cron → `skills/background-job/SKILL.md`.
- 💡 **SARAN:** Simpan hasil + link unduh berbatas-waktu (signed URL) → `skills/upload-storage/SKILL.md`.
- 💡 **SARAN:** Kabari user hasil siap → `skills/email-notifikasi/SKILL.md`.
- 💡 **SARAN:** Otorisasi per-baris / anti-IDOR → `skills/auth/SKILL.md` + `skills/owasp/SKILL.md`.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** data yang diekspor (sering data pribadi/keuangan), integritas laporan, ketersediaan server. **Penyerang:** pencuri data lewat ekspor over-broad/IDOR, penyalahguna CSV-injection, pelaku **DoS** (Denial of Service = serangan membanjiri server sampai tumbang) via ekspor raksasa/berulang. **Mitigasi:** otorisasi per-baris server-side + escape sel CSV + ekspor besar via latar+streaming + **rate-limit/kuota ekspor per-user** + link kadaluarsa + retensi.
- 🗃️ **LATAR — Batas jujur:** Skill ini menaikkan lantai keamanan & skalabilitas ekspor; **tidak menjamin** performa untuk volume ekstrem (butuh arsitektur data/warehouse khusus) atau kepatuhan format laporan spesifik industri (pajak, akuntansi, regulator) — verifikasi kebutuhan format legal itu terpisah. Cek dokumentasi library CSV/Excel/PDF **versi terpasang** (API escaping & streaming berbeda antar-versi).
