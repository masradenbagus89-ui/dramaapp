---
nama: cek-permintaan
deskripsi: Pastikan hasil = yang DIMINTA client (bukan yang AI kira) — bandingkan ke rencana ✅/❓ yang disepakati, buka daftar asumsi, beri checklist uji-sendiri + laporan penutup bahasa awam. Cegah "stempel palsu".
divisi: product
pemicu: [sesuai-permintaan, sesuai-yang-diminta, udah-bener-belum, udah-sesuai-belum, yang-aku-minta, jangan-nambah-fitur, sesuai-brief, cek-hasil, serah-terima]
rawan_keamanan: false
menggantikan: []
---

# Skill: Cek Permintaan — hasil = yang diminta (serah-terima ke client awam)

> **Inti:** client non-programmer tak bisa baca kode, jadi ia tak tahu apakah yang dibangun = yang ia mau. Skill ini menutup celah itu — TAPI tanpa jebakan "AI menilai kerjaannya sendiri lawan ingatannya sendiri" (stempel palsu).

Butir 🔒 HASIL = jaminan yang tak boleh gagal. Prinsip komunikasi: JANGAN interogasi client (§1.6); ambiguitas → **popup-rekomendasi** (opsi rekomendasi + alasan awam), bukan pertanyaan terbuka.

---

## 1. Kontrak (yang HARUS benar)

- 🔒 **HASIL — titik-acuan = rencana yang DISEPAKATI, bukan ingatan AI.** Cek "sesuai/tidak" WAJIB dibandingkan ke **Laporan Kondisi Nyata ✅/❓ + rencana ringkas yang AI kembalikan di awal** (AGENTS.md §4.1/§4.4) — bukan tebakan AI tentang maksud client. Belum ada rencana tertulis? Bikin dulu parafrase-balik singkat + minta client benarkan (1×, via popup), baru nilai.
- 🔒 **HASIL — DILARANG klaim "sesuai permintaan" bila ada ASUMSI penyetir-hasil yang belum dikonfirmasi.** Tiap asumsi yang mengubah bentuk hasil (mis. "kuanggap pembayaran pakai Midtrans") wajib **ditulis terbuka** + ditandai ❓ belum-dikonfirmasi. Stempel "sesuai" hanya untuk yang benar-benar cocok rencana.

---

## 2. Cara (📐 CARA BAKU)

### Hulu — saat permintaan ambigu-menyetir-hasil
1. 📐 **Parafrase-balik** permintaan client jadi butir konkret + tandai mana ✅ jelas vs ❓ asumsi. Ambiguitas yang **mengubah hasil** (perlu login? bayar sekarang? multi-bahasa?) → **popup-rekomendasi** (bukan pertanyaan terbuka). Yang tak menyetir hasil → ambil default masuk-akal, catat sebagai asumsi (jangan hentikan kerja untuk hal remeh).
   📐 **Simpan rencananya biar tak hilang antar-sesi.** Ambang, path, bentuk isi, dan baris INDEX-nya ada di **`templates/RENCANA.example.md`** (rumah TUNGGAL — JANGAN salin ke sini, ikuti berkas itu; dipicu kernel §4.4). Kenapa perlu: titik-acuan di Kontrak §1 hidup di chat; sesi baru = hilang, dan "sesuai/tidak" jadi tak bisa dinilai.

### Hilir — checkpoint akhir + titik-risiko
2. 📐 **Bandingkan hasil vs rencana** → sajikan **tabel polos 3 kolom**: **yang DIMINTA · yang DIBUAT · yang DIASUMSIKAN**. Client tak perlu paham teknis — cukup mengenali "eh, yang diasumsikan itu salah".
3. 📐 **Deteksi 4 penyimpangan:** (a) **kurang** — permintaan yang belum dibuat; (b) **melenceng** — dibuat tapi beda dari yang diminta; (c) **scope-creep** — fitur yang TAK diminta tapi ikut dibuat (buang / konfirmasi, jangan diam-diam menambah); (d) 🔒 **rusak** — fitur LAMA yang ikut berubah/salah gara-gara perubahan ini.
   🔒 **HASIL — kenapa (d) sumbu TERPISAH:** (a)-(c) diukur terhadap **permintaan client**; (d) diukur terhadap **kondisi sistem sebelum vs sesudah**. Tugas bisa lulus (a)-(c) dengan sempurna sementara fitur lain sudah rusak — laporan jujur, lengkap, dan menyesatkan. Cara mengukurnya: fungsi/field/route yang kau ubah dipakai siapa lagi (§4.4 BACA-KODE) → **jalankan** pemeriksa project yang menyentuh mereka (typecheck · tes terkait · build), jangan disimpulkan dari "aku cuma nambah".
4. 📐 **Smell kode:** ukuran (fungsi/file panjang) → cek cepat ambang: **berkas >500 baris / fungsi >100 baris = tandai PECAH** (hitung via alat baca, jangan menebak). Fokus manual pada yang angka tak tangkap: nama menyesatkan, duplikasi logika, coupling.

### Output WAJIB ke client (E2 + E3)
5. 🔒 **HASIL — checklist uji-sendiri (E2):** sertakan **langkah klik bahasa awam** biar client verifikasi sendiri — mis. "1) buka /daftar → 2) isi email → 3) klik Daftar → harus masuk ke Beranda". Jembatan dari "tes hijau (tak kelihatan)" ke "kamu bisa lihat sendiri" (§1.5 naik kelas).
6. 🔒 **HASIL — laporan penutup awam (E3):** tutup dengan recap polos: **yang saya kerjakan · hasilnya · yang BELUM · yang saya asumsikan**. Bagi non-programmer, laporan ini = produknya.

🙂 **Non-Programmer:** kamu tak perlu baca kode untuk tahu hasilnya benar. AI akan kasih (1) tabel "kamu minta ini / aku buat ini / aku anggap ini", (2) langkah klik biar kamu coba sendiri, (3) ringkasan apa yang sudah & belum. Kalau ada "yang aku anggap" yang salah, tinggal bilang — jangan sungkan.

---

## 3. Powerful — tabel serah-terima + daftar asumsi

🧪 CONTOH format (ambil polanya, jangan salin mentah):

| Yang DIMINTA | Yang DIBUAT | Yang DIASUMSIKAN (❓ belum dikonfirmasi) |
|---|---|---|
| "toko online bisa jualan" | katalog + keranjang + checkout | pembayaran pakai Midtrans (❓ belum kamu pilih) |
| "ada login" | login email + password | belum pakai login Google (❓) |

**Cara uji sendiri:** 1) buka `/produk` → 2) klik "Beli" → 3) di checkout isi data → 4) harus muncul halaman "Pesanan diterima".
**Belum dibuat:** kirim invoice ke email (menunggu kamu pilih penyedia email).

### 🔒 HASIL — bukti WAJIB per JENIS klaim (tiap baris punya perintah nyata, bukan perasaan)

| Klaim | Bukti WAJIB (sudah dijalankan + output dilihat) | TIDAK cukup |
|---|---|---|
| "tes hijau" | output perintah tes: **0 gagal** | run sebelumnya · "harusnya sih lulus" |
| "build sukses" | **exit code 0** dari perintah build | linter lolos saja |
| "bug beres" | **reproduksi asli dijalankan lagi → kini hijau** | kodenya sudah diubah |
| "sudah online/live" | **URL dibuka + halaman yang benar muncul** | "deploy sukses" di log (deploy hijau tapi halaman 404/blank itu biasa) |
| "fitur lain tak terganggu" | pemeriksa yang menyentuh **pemakai** fungsi yang diubah **dijalankan** + output dilihat (typecheck · tes terkait · build) | "aku cuma nambah, tak menghapus apa-apa" · "kelihatannya tak ada yang kena" |

🙂 **Non-Programmer:** "sudah aku kerjakan" bukan berarti "sudah terbukti jalan". Tabel ini memaksa AI menunjukkan buktinya dulu — jadi kamu tak perlu percaya kata-katanya saja. Baris terakhir yang paling sering terlewat: menambah sesuatu di satu halaman bisa diam-diam merusak halaman lain yang memakai perhitungan yang sama.

---

## 4. Self-verify (sangkal diri SEBELUM bilang "sesuai")

- [ ] Aku membandingkan ke **rencana ✅/❓ yang disepakati** (bukan ingatanku sendiri)?
- [ ] Tiap **asumsi penyetir-hasil** ditulis terbuka + ditandai ❓ (tak ada stempel "sesuai" diam-diam)?
- [ ] Aku cek 4 penyimpangan (kurang / melenceng / scope-creep / **rusak**)?
- [ ] Untuk sumbu **rusak**: fungsi bersama yang kuubah, pemakainya sudah **dijalankan/diuji ulang** (bukan cuma kubaca)?
- [ ] Ada **checklist uji-sendiri** langkah-klik (E2) + **laporan penutup** awam (E3)?
- [ ] Ambiguitas penyetir-hasil kuangkat via **popup-rekomendasi**, bukan interogasi terbuka?
- [ ] Tak ada **frasa tanpa bukti** yang lolos ke laporan — "kayaknya sudah", "harusnya jalan", "sudah beres", "seharusnya aman"? Tiap frasa itu = tanda BERHENTI: ganti dengan bukti dari tabel §3, atau tulis terus terang **"belum verify, perlu cek"** (§2.2).

---

## 5. Definition-of-Done

- [ ] Titik-acuan (rencana ✅/❓) ada; kalau belum, parafrase-balik dikonfirmasi client 1×.
- [ ] Tabel **diminta / dibuat / diasumsikan** disajikan.
- [ ] Penyimpangan (kurang / melenceng / scope-creep / **rusak**) dilaporkan + ditindak.
- [ ] Sumbu **rusak** dinilai dengan pemeriksa yang **dijalankan**, bukan dengan penalaran "harusnya aman".
- [ ] Checklist uji-sendiri (E2) + laporan penutup awam (E3) diberikan.
- [ ] Tak ada klaim "sesuai permintaan" saat masih ada asumsi penyetir-hasil belum dikonfirmasi.

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Cek mutu KODE** (konvensi, error-ditelan, tipe `any`) → gerbang kualitas `npx lintasai` + `/code-review` native. Skill ini fokus "hasil = permintaan" (sumbu Spec), BUKAN konvensi kode (sumbu Standards).
- 📐 **Tes jalur kritis** (bukti hasil benar) → `skills/cakupan-tes/SKILL.md`. **Bug sulit ketemu saat cek** → `skills/debug-metodis/SKILL.md`.
- 📐 **Keputusan besar / titik-risiko** (login/bayar/data) → angkat via popup-rekomendasi. **Ubah data berisiko saat menindak temuan** → `skills/jaring-data/SKILL.md`.
- 🗃️ **LATAR — kredit:** sumbu "Spec" (hasil vs requirement, deteksi scope-creep) diserap dari `code-review` (mattpocock/skills, MIT); disiplin acceptance-criteria menutup gap spec-capture. Ditulis-ulang non-programmer (jangkar rencana ✅/❓ + popup-rekomendasi, bukan interogasi).

---

## 7. Batas jujur

- 🗃️ **LATAR:** skill ini menjamin hasil **dibandingkan ke rencana yang disepakati + asumsi dibuka** — TIDAK menjamin rencana awalnya benar. Kalau client sendiri belum tahu maunya, itu disingkap lewat parafrase-balik + popup-rekomendasi, bukan ditebak diam-diam. Yang dicegah: AI membangun hal berbeda lalu mengecapnya "sesuai" (stempel palsu).
