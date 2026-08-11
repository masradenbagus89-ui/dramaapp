---
nama: upload-storage
deskripsi: Unggah berkas/foto/avatar/dokumen kelas-industri — private + signed URL berjangka, validasi magic-bytes, key acak server-side, anti-IDOR & path-traversal.
divisi: backend
pemicu: [unggah, upload, foto, gambar, avatar, lampiran, attachment, berkas masuk, file upload]
rawan_keamanan: true
menggantikan: [unggah-berkas]
---

# Skill: Upload & Storage (unggah foto/berkas/dokumen) — kelas industri

> **Kapan skill ini aktif:** prompt menyentuh "tambah upload / unggah foto / kirim berkas / lampiran / avatar / dokumen / galeri". Dispatcher `rak-pemicu` menyalakannya otomatis. Upload = titik risiko tinggi.
>
> 🙂 **Analogi:** upload = **titip barang di gudang berpalang**. Berkas disimpan di gudang terkunci (private = tak bisa diakses publik), bukan dipajang di etalase (folder publik); yang berhak dapat **tiket sementara** (signed URL = link akses berjangka yang kadaluarsa sendiri) untuk ambil/taruh barangnya.

Skill ini **advisory** (§4.17): otak native memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = jaminan keamanan yang tak boleh gagal. Cek dokumentasi resmi SDK storage **versi terpasang** sebelum menulis kode (§8.2 A3) — cara membuat signed URL & atur lifecycle (aturan hidup-mati berkas) berbeda antar-penyedia (S3/Cloudflare R2/Supabase Storage).

---

## 1. Kontrak (yang HARUS benar — tulis DULU)

- 🔒 **HASIL:**
  - **Input:** berkas dari user (foto/dokumen) + siapa pengunggahnya.
  - **Output:** objek tersimpan **private** + URL akses **berjangka** (signed URL) + baris metadata di DB (nama asli, tipe, ukuran, pemilik, key storage = nama internal berkas di gudang).
  - **Error:** tipe/ukuran salah ditolak dengan pesan jelas (bukan 500).
  - **Rahasia:** kredensial storage (kunci S3/R2/`service_role`) **server-only** — jangan pernah sampai ke browser.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **CARA BAKU — Unggah LANGSUNG ke storage lewat signed URL, jangan lewatkan berkas besar via server app.** Server menerbitkan **pre-signed PUT URL** (izin taruh sementara) SETELAH cek otorisasi + validasi → browser meng-upload langsung ke S3/Cloudflare R2/Supabase Storage. (Melewatkan berkas besar via server app = boros memori + rawan timeout.)
2. 🔒 **HASIL — Validasi 5 pagar** (rujuk `skills/owasp/SKILL.md` — jangan salin): (1) periksa **ISI berkas (magic bytes = beberapa byte awal yang menandai tipe asli)**, bukan MIME/nama dari browser; (2) **batas ukuran** wajib; (3) **JANGAN** simpan/serve dari folder `public`; (4) simpan **private**, akses lewat **signed URL berjangka** (mis. 15 menit); (5) cek **OTORISASI dulu**, baru terbitkan URL.
3. 🔒 **HASIL — Nama key dibuat SERVER (acak, mis. `uuid` + ekstensi tervalidasi), jangan pakai nama file dari user apa adanya** — nama user bisa berisi `../` (path traversal = naik folder untuk menimpa/mencuri berkas lain) atau menebak key orang lain. Simpan nama asli sebagai metadata terpisah untuk ditampilkan.
4. 📐 **CARA BAKU — Akses baca = signed GET URL berjangka pendek + cek pemilik** (cegah IDOR = tebak key untuk ambil berkas orang lain, rujuk `skills/auth/SKILL.md`). Aset yang MEMANG publik (mis. gambar landing) → bucket publik TERPISAH, bukan mencampur dengan berkas privat.
5. 📐 **CARA BAKU — Metadata di DB, bukan di klien:** simpan pemilik + key + status. Baris DB dibuat SETELAH upload sukses dikonfirmasi (atau tandai `pending` → `ready`), supaya tak ada "berkas hantu" yang tercatat tapi gagal ter-upload.
6. 📐 **CARA BAKU — Proses turunan di LATAR, jangan blok request upload:** thumbnail/resize, ekstrak teks, pindai virus → antrean latar (rujuk `skills/background-job/SKILL.md`). Balas cepat ke user, kerjakan berat di belakang.
7. 📐 **CARA BAKU — Retensi & pembersihan (lifecycle):** aturan TTL (Time To Live = umur simpan) untuk berkas sementara; sapu **orphan** (URL terbit tapi upload batal / baris DB terhapus tapi objek tinggal); dukung "hapus data saya" (privasi/UU PDP). Simpan hanya selama perlu.
8. 📐 **CARA BAKU — UI 4 state:** progress upload, batas tipe/ukuran ditampilkan sebelum pilih, error per-berkas, sukses. Anti-abuse: rate-limit (batas jumlah upload per satuan waktu) + kuota per-user (cegah habiskan penyimpanan/biaya).

---

## 3. Gotcha (sering salah)

- 🗃️ **LATAR:** **Percaya `Content-Type`/nama dari browser** → penyerang beri nama `.jpg` untuk berkas skrip. Cek magic bytes.
- 🗃️ **LATAR:** **Simpan di `/public`** → path traversal + skrip jahat bisa **tereksekusi** saat diakses. Selalu private.
- 🗃️ **LATAR:** **Bucket "public-read" untuk data privat** → siapa pun dengan URL bisa buka; URL bocor di log/referrer. Private + signed URL.
- 🗃️ **LATAR:** **SVG diperlakukan seperti gambar biasa** → SVG bisa memuat `<script>` (XSS = sisip skrip jahat ke halaman). Sanitasi/blok SVG, atau serve dengan `Content-Disposition: attachment` (paksa unduh, bukan tampil) + CSP.
- 🗃️ **LATAR:** **Tanpa batas ukuran** → satu upload raksasa = kehabisan memori/biaya (**OOM** = Out Of Memory, memori habis).
- 🗃️ **LATAR:** **Terbitkan signed URL sebelum cek pemilik** → siapa pun yang minta dapat tiket. Otorisasi dulu.

---

## 4. Self-verify (sangkal diri sebelum "selesai" — §8.2 Aturan 3)

- [ ] Objek disimpan **private** (bukan `/public`), akses cuma lewat **signed URL berjangka**?
- [ ] Validasi **magic bytes** (ISI berkas), bukan MIME/nama dari browser + **batas ukuran** wajib?
- [ ] Key storage dibuat **server-side acak** (`uuid` + ekstensi tervalidasi), bukan nama file user apa adanya (anti path-traversal)?
- [ ] **Otorisasi dicek DULU** sebelum terbitkan signed URL (PUT & GET); baca = cek pemilik (anti-IDOR)?
- [ ] Kredensial storage (kunci S3/R2/`service_role`) **server-only**, tak pernah ke browser?
- [ ] SVG di-blok/sanitasi, atau di-serve `Content-Disposition: attachment` + CSP (anti XSS)?
- [ ] UI 4 state + rate-limit + kuota per-user terpasang?

---

## 5. Definition-of-Done

- [ ] **Kontrak (§1) ditulis** (input/output/error/rahasia server-only).
- [ ] Private + signed URL berjangka + validasi magic-bytes + batas ukuran + key acak server-side + otorisasi-dulu terpasang.
- [ ] **Edge case** diuji: `.jpg` berisi skrip, SVG ber-`<script>`, tebak key orang lain (IDOR), upload raksasa (OOM), signed URL kedaluwarsa.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] **Rak keamanan dibuka** (`skills/owasp/SKILL.md`) — `rawan_keamanan: true`.
- [ ] build + lint + test lulus; min 1 test happy-path (upload sukses) + 1 alur "berkas tak sah → ditolak".

---

## 6. Handoff / rujuk-silang (reuse-first — jangan salin)

- 💡 **SARAN:** 5 pagar upload + header keamanan detail → `skills/owasp/SKILL.md`.
- 💡 **SARAN:** Cek pemilik/sesi server-side (anti-IDOR) → `skills/auth/SKILL.md`.
- 💡 **SARAN:** Proses turunan (thumbnail/scan) di latar + retry → `skills/background-job/SKILL.md`.
- 💡 **SARAN:** Storage Supabase (RLS default-deny + `service_role` server-only; prinsip RLS = aturan level-DB siapa boleh akses baris mana, yang sama berlaku untuk bucket `storage.objects`) → `skills/supabase-prisma/SKILL.md`.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** berkas user, ruang & biaya penyimpanan, integritas server. **Penyerang:** unggah berkas berbahaya (skrip/SVG-XSS), curi berkas orang lain (tebak key/IDOR), path traversal, habiskan kuota/biaya. **Mitigasi:** magic-bytes + private+signed URL + key acak server-side + otorisasi per-objek + batas ukuran/kuota + rate-limit.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan lantai keamanan upload; **tidak menjamin** bebas malware (pindai virus butuh layanan terpisah) atau bebas konten ilegal (butuh moderasi). Kebijakan retensi/privasi butuh keputusan bisnis. Cek dokumentasi resmi SDK storage **versi terpasang** — cara membuat signed URL & atur lifecycle berbeda antar-penyedia (S3/R2/Supabase).
