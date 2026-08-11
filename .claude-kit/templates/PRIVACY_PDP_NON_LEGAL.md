# PRIVACY_PDP_NON_LEGAL — Panduan Data Pribadi (UU PDP) untuk Tim Tanpa Jalur Hukum

> Versi 1 · 2026-07-14 · untuk owner/lead non-programmer · panduan **non-legal** (praktis, BUKAN nasihat hukum)

## Tujuan

Kalau app-mu menyimpan **data pribadi** (nama, email, nomor HP, alamat, foto, transaksi) milik orang Indonesia, kamu terikat **UU PDP** (UU No. 27/2022 tentang Perlindungan Data Pribadi — sudah **berlaku penuh sejak Okt 2024**). Denda administratif bisa **sampai 2% pendapatan tahunan**. Panduan ini menaikkan lantai kepatuhan secara teknis — **bukan pengganti penasihat hukum**.

> 🙂 Analogi: data pribadi pelanggan = **barang titipan**. Kamu boleh memakainya untuk keperluan yang dititipkan, wajib menyimpannya aman, mengembalikan/menghapus kalau diminta, dan lapor kalau hilang. Bukan milikmu untuk dipakai sesuka hati.

---

## 1) 6 kewajiban inti UU PDP (versi praktis)

| Kewajiban | Arti praktis di app | Cek |
|---|---|---|
| **Consent (persetujuan sah)** | Minta izin **jelas + sukarela** sebelum ambil data; jangan centang-default; sebutkan **untuk apa**. Simpan **catatan consent** (kapan, versi teks). | [ ] |
| **Data minimization** | Ambil **seperlunya** saja. Tak butuh tanggal lahir? Jangan minta. Makin sedikit data = makin kecil risiko. | [ ] |
| **Tujuan jelas & terbatas** | Data yang diambil untuk X **jangan dipakai** untuk Y tanpa izin baru. | [ ] |
| **Retensi (masa simpan)** | Tetapkan berapa lama data disimpan; **hapus/anonimkan** setelah tak diperlukan. Jangan simpan selamanya "buat jaga-jaga". | [ ] |
| **Keamanan** | Lindungi data (enkripsi, akses terbatas, RLS) — lihat §3. | [ ] |
| **Notifikasi kebocoran** | Kalau data bocor, ada kewajiban **memberi tahu** (subjek data + otoritas) dalam tenggat. Siapkan alurnya SEBELUM kejadian → `SECURITY_INCIDENT_PLAYBOOK.md`. | [ ] |

---

## 2) Hak subjek data (DSAR) — sediakan cara memenuhinya

**DSAR** (*Data Subject Access Request* = permintaan pemilik data atas datanya). UU PDP memberi pemilik data beberapa hak; app-mu harus punya **cara memenuhinya** (idealnya self-service, minimal proses manual yang tercatat):

- **Akses** — pemilik bisa tahu data apa yang kamu simpan tentang dia.
- **Koreksi** — perbaiki data yang salah.
- **Hapus (right to erasure)** — hapus datanya kalau diminta / tak lagi diperlukan. 🚨 **Hapus BENERAN**, termasuk di backup & log — bukan cuma `is_deleted = true` yang datanya tetap ada. (Kalau wajib simpan sebagian demi hukum lain, mis. pajak → dokumentasikan alasannya.)
- **Portabilitas** — beri salinan datanya dalam format yang bisa dibaca mesin (mis. JSON/CSV).
- **Tarik consent** — pemilik bisa mencabut izin; setelah itu hentikan pemrosesan yang berbasis izin itu.

> Checklist teknis: [ ] endpoint/alur "unduh data saya" · [ ] alur "hapus akun + data saya" yang menghapus lintas-tabel + backup-policy jelas · [ ] catatan tiap permintaan DSAR (siapa, kapan, dipenuhi kapan) untuk bukti kepatuhan.

---

## 3) Amankan PII (data pribadi) — teknis

- **Enkripsi saat disimpan (at-rest) untuk kolom paling sensitif** (KTP/paspor, data kesehatan, data keuangan, kredensial). Opsi: enkripsi di level kolom (Supabase **Vault** / `pgcrypto` — **cek dukungan versi terpasang**, `pgsodium` sedang beralih ke Vault) atau **envelope encryption** di app dengan kunci dari **KMS** (Key Management Service = brankas kunci terkelola). Transport (in-transit) sudah dijaga TLS/HTTPS platform.
- **Rotasi kunci** terjadwal; kunci enkripsi JANGAN di repo/`.env` yang ikut ter-commit (§8.1 #6).
- **Jangan log PII/secret mentah** (§8) — log yang bocor = kebocoran data. Redaksi (samarkan) email/nomor di log.
- **Batasi akses** — RLS default-deny (`RLS_SETUP_PROMPT.md`), pisah data sensitif, kolom rahasia jangan ikut ke API/`SELECT *` (rujuk `stack/4.14-7-python.md` DRF `__all__`).
- **Data minimization = keamanan termurah**: data yang tak kamu simpan tak bisa bocor.

---

## Rujuk-silang (reuse-first — jangan salin)

- Consent & cookie (analytics) → `skills/analytics/SKILL.md` (bagian consent).
- Retensi & hapus data (mekanik) → `skills/upload-storage/SKILL.md`.
- Respon + notifikasi kebocoran → `templates/SECURITY_INCIDENT_PLAYBOOK.md`.
- Operasi DB aman (kolom sensitif, migrasi) → `templates/SAFE_DATABASE_OPERATIONS.md` + `templates/RLS_SETUP_PROMPT.md`.
- Industri teregulasi (KYC/AML) → `skills/kepatuhan-teregulasi/SKILL.md`.

## Batas jujur

Panduan **non-legal** untuk menaikkan lantai kepatuhan teknis — **BUKAN nasihat hukum**. UU PDP punya banyak detail (dasar pemrosesan, kewajiban Pengendali vs Prosesor, transfer data ke luar negeri, penunjukan DPO) + aturan pelaksana yang masih berkembang. **Tinjauan hukum sungguhan WAJIB** sebelum menangani data sensitif dalam skala besar. Kalau melayani user Uni Eropa/California juga → tambah GDPR/CCPA. Kit TIDAK menentukan kepatuhan hukummu — itu keputusan penasihat hukummu.

## Input / Output / Dependensi

- **Input:** jenis data pribadi yang app simpan + yurisdiksi user.
- **Output:** checklist kewajiban + DSAR + langkah amankan PII, dengan rujukan konkret.
- **Dependensi:** `SECURITY_INCIDENT_PLAYBOOK.md`, `RLS_SETUP_PROMPT.md`, `SAFE_DATABASE_OPERATIONS.md`, `skills/analytics/SKILL.md`, `skills/upload-storage/SKILL.md`.
