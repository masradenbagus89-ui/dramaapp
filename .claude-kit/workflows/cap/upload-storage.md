<!-- LINTAS:SEKSI §upload-storage -->

## §upload-storage. Capability Pack — Upload & Storage (unggah foto/berkas/dokumen) kelas-industri

> **Kapan dibaca:** "tambah upload / unggah foto / kirim berkas / lampiran / avatar / dokumen / galeri". Resep merakit unggah berkas yang **aman & hemat** — upload = titik risiko tinggi (§4.14-5). Baca induk `workflows/cap-packs.md` untuk disiplin umum.

🙂 Analogi: upload = **titip barang di gudang berpalang**. Berkas disimpan di gudang terkunci (private), bukan dipajang di etalase (folder publik); yang berhak dapat **tiket sementara** (signed URL) untuk ambil/taruh barangnya — tiket kadaluarsa sendiri.

### Kontrak (yang harus benar)
- **Input:** berkas dari user (foto/dokumen) + siapa pengunggahnya. **Output:** objek tersimpan **private** + URL akses **berjangka** + baris metadata di DB (nama asli, tipe, ukuran, pemilik, key storage). **Error:** tipe/ukuran salah ditolak dengan pesan jelas (bukan 500). **Rahasia:** kredensial storage (kunci S3/R2/`service_role`) **server-only** — jangan pernah ke browser.

### Langkah rakit (prinsip — cek dokumentasi SDK storage versi terpasang §8.2)
1. **Unggah LANGSUNG ke storage lewat signed URL, jangan lewatkan berkas besar via server app.** Server menerbitkan **pre-signed PUT URL** (izin taruh sementara) SETELAH cek otorisasi + validasi → browser meng-upload langsung ke S3/Cloudflare R2/Supabase Storage. (Melewatkan berkas besar via server app = boros memori + rawan timeout.)
2. **Validasi 5 pagar (rujuk `workflows/stack/4.14-5-owasp.md` — jangan salin):** (1) periksa **ISI berkas (magic bytes)**, bukan MIME/nama dari browser; (2) **batas ukuran** wajib; (3) **JANGAN** simpan/serve dari folder `public`; (4) simpan **private**, akses lewat **signed URL berjangka** (mis. 15 menit); (5) cek **OTORISASI dulu**, baru terbitkan URL.
3. **Nama key dibuat SERVER (acak, mis. `uuid` + ekstensi tervalidasi), jangan pakai nama file dari user apa adanya** — nama user bisa berisi `../` (path traversal = naik folder untuk menimpa/mencuri berkas lain) atau menebak key orang lain. Simpan nama asli sebagai metadata terpisah untuk ditampilkan.
4. **Akses baca = signed GET URL berjangka pendek + cek pemilik** (cegah IDOR = tebak key untuk ambil berkas orang lain, rujuk `cap/auth.md`). Aset yang MEMANG publik (mis. gambar landing) → bucket publik TERPISAH, bukan mencampur dengan berkas privat.
5. **Metadata di DB, bukan di klien:** simpan pemilik + key + status. Baris DB dibuat SETELAH upload sukses dikonfirmasi (atau tandai `pending` → `ready`), supaya tak ada "berkas hantu" yang tercatat tapi gagal ter-upload.
6. **Proses turunan di LATAR, jangan blok request upload:** thumbnail/resize, ekstrak teks, pindai virus → antrean latar (rujuk `cap/background-job.md`). Balas cepat ke user, kerjakan berat di belakang.
7. **Retensi & pembersihan (lifecycle):** aturan TTL untuk berkas sementara; sapu **orphan** (URL terbit tapi upload batal / baris DB terhapus tapi objek tinggal); dukung "hapus data saya" (privasi/UU PDP). Simpan hanya selama perlu.
8. **UI 4 state (§4.13):** progress upload, batas tipe/ukuran ditampilkan sebelum pilih, error per-berkas, sukses. Anti-abuse: rate-limit + kuota per-user (cegah habiskan penyimpanan/biaya).

### Gotcha (sering salah)
- **Percaya `Content-Type`/nama dari browser** → penyerang beri nama `.jpg` untuk berkas skrip. Cek magic bytes.
- **Simpan di `/public`** → path traversal + skrip jahat bisa **tereksekusi** saat diakses. Selalu private.
- **Bucket "public-read" untuk data privat** → siapa pun dengan URL bisa buka; URL bocor di log/referrer. Private + signed URL.
- **SVG diperlakukan seperti gambar biasa** → SVG bisa memuat `<script>` (XSS). Sanitasi/blok SVG, atau serve dengan `Content-Disposition: attachment` + CSP.
- **Tanpa batas ukuran** → satu upload raksasa = kehabisan memori/biaya (**OOM** = Out Of Memory, memori habis).
- **Terbitkan signed URL sebelum cek pemilik** → siapa pun yang minta dapat tiket. Otorisasi dulu.

### Rujuk-silang (reuse-first — jangan salin)
- 5 pagar upload + header keamanan detail → `workflows/stack/4.14-5-owasp.md`.
- Cek pemilik/sesi server-side (anti-IDOR) → `cap/auth.md`.
- Proses turunan (thumbnail/scan) di latar + retry → `cap/background-job.md`.
- Storage Supabase (RLS default-deny + `service_role` server-only; prinsip RLS yang sama berlaku untuk bucket `storage.objects`) → `workflows/stack/4.14-2-supabase-prisma.md`.

### Threat-model 3-baris
- **Aset:** berkas user, ruang & biaya penyimpanan, integritas server. **Penyerang:** unggah berkas berbahaya (skrip/SVG-XSS), curi berkas orang lain (tebak key/IDOR), path traversal, habiskan kuota/biaya. **Mitigasi:** magic-bytes + private+signed URL + key acak server-side + otorisasi per-objek + batas ukuran/kuota + rate-limit.

### Batas jujur
Pack ini menaikkan lantai keamanan upload; **tidak menjamin** bebas malware (pindai virus butuh layanan terpisah) atau bebas konten ilegal (butuh moderasi). Kebijakan retensi/privasi butuh keputusan bisnis. Cek dokumentasi resmi SDK storage **versi terpasang** — cara membuat signed URL & atur lifecycle berbeda antar-penyedia (S3/R2/Supabase).
