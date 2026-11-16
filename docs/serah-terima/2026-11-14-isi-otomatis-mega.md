# 2026-11-14 — Isi otomatis link unduhan Mega (tahap 2)

Branch: `feat/link-unduhan-provider-kualitas` (belum di-commit saat ditulis, belum dirilis).
Lanjutan dari `2026-10-08-isi-otomatis-drive.md`.

## 1. Apa yang berubah + kenapa
Permintaan awalnya: "ambil link Google Share / Telegram / Mega otomatis dari Playly". Sudah
diperiksa langsung ke Playly (2026-11-14, `GET /api/public-video` untuk 3 video asli): dari 43
field yang dikirim, **tidak ada satu pun link Google/Telegram/Mega**. Field `unduh` ada tapi
isinya `null`. `variants` (file video di penyimpanan Playly) tidak bisa dipakai, karena
kedaluwarsa dalam 6 jam (`X-Amz-Expires=21600`) dan kualitasnya 360p/720p. Jadi link tidak
bisa "diambil dari Playly". Mengisinya dari sana sama dengan membuat link palsu.
Catatan: `GET /api/videos` dengan kunci di `.env.local` komputer rekan membalas 401 (kunci
basi), jadi jalur berkunci itu belum diperiksa. Owner bisa memeriksanya dengan kunci produksi.

Yang dipilih: tombol **"Isi dari Mega"** di sebelah tombol "Isi dari Google Drive"
(`/admin/videos/playly` → Atur link). Cara kerjanya sama dengan Drive:
- Sistem membaca folder Mega publik, lalu mencari file yang namanya memuat **ID video** dan
  **1080p / 480p** sebagai kata utuh.
- Hasilnya mengisi kotak **Mega**. **Tidak ada yang disimpan otomatis**: admin memeriksa dulu,
  lalu menekan **Simpan link**, yang tetap melewati pemeriksaan https dan domain `mega.nz`.

Beda dengan Drive:
- **Subfolder ikut dibaca**, karena Mega memulangkan seluruh pohon folder dalam satu permintaan.
- **Tidak butuh API key.**
- Kalau 1 kualitas ditemukan di >1 file (termasuk di dua folder berbeda), sistem tidak memilih.
  Semua nama file disebut dan admin yang memutuskan.

Link yang dihasilkan berformat resmi `https://mega.nz/folder/<id>#<kunci>/file/<id-file>`.
Format ini diverifikasi dari kode sumber `megajs` (`File.fromURL` membaca balik bentuk itu),
bukan ditebak.

Ikut dirapikan: aturan pencocokan nama file dipindah ke `lib/playly-unduhan-cocok.ts` supaya
Drive & Mega memakai satu aturan yang sama. Perilaku Drive tidak berubah (13 tes lamanya tetap
hijau tanpa diubah).

Telegram **tidak** dikerjakan. Bot API Telegram tidak bisa membaca riwayat pesan channel, jadi
file lama tetap harus diisi manual atau lewat impor CSV.

## 2. Berkas yang disentuh
- `lib/playly-unduhan-cocok.ts` (baru): aturan bersama pencocokan nama file
- `lib/playly-unduhan-mega.ts` (baru): baca folder Mega lewat `megajs` (server-only)
- `app/api/admin/playly/unduhan/mega/route.ts` (baru): `GET ?videoId=`, khusus admin, hanya membaca
- `lib/playly-unduhan-drive.ts`: memakai aturan bersama (perilaku sama)
- `app/components/admin/PlaylyUnduhanManager.tsx`: tombol Drive & Mega dari satu daftar sumber
- `tests/playly-unduhan-mega.test.ts` (baru): 18 tes
- `package.json` + `package-lock.json`: dependency baru `megajs@^1.3.10` (MIT, 2 dependensi).
  `npm audit`: nol temuan dari megajs/dependensinya (temuan yang ada semuanya sudah ada sebelumnya).
- `.env.example`: 1 env baru (template, nilai kosong)

Halaman yang terpengaruh: hanya `/admin/videos/playly`. Halaman penonton tidak berubah.

## 3. Butuh SQL migrasi?
Tidak.

## 4. Butuh env baru di Vercel?
Ya, **opsional**. Kalau kosong, tombol menampilkan pesan "belum diatur" dan bagian situs lain
tidak terpengaruh.
- `PLAYLY_UNDUHAN_MEGA_FOLDER`: link folder publik Mega **lengkap dengan bagian setelah `#`**
  (itu kunci folder; tanpa kunci, nama file tak bisa dibaca). Lebih dari satu folder: pisah koma.
  Server-only, **jangan** diberi awalan `NEXT_PUBLIC_`. Link ini membuka seluruh isi folder.

## 5. Bukti yang sudah dijalankan (2026-11-14, urutan gerbang aturan 6)
- `rm -rf .next` → `npm run build`. Percobaan 1 gagal `worker exited with code: 4294967295`,
  jebakan acak yang sudah tercatat (INDEX.md 2026-09-23/24). Percobaan 2 atas kode yang sama
  → **exit 0**, dengan route `ƒ /api/admin/playly/unduhan/mega` tercatat.
- `npx tsc --noEmit` → **exit 0**
- `npm test` → **1406 lulus / 95 berkas** (termasuk 18 tes Mega baru)
- Uji balik penjaga: pembacaan subfolder sengaja dirusak → 1 tes merah → dipulihkan
- Uji jaringan sungguhan ke server Mega dengan folder yang sengaja tidak ada → balasan 552 ms,
  pesan "Folder Mega tidak ditemukan…", kunci folder tidak tercetak di log

**Belum diuji:** folder Mega asli berisi file sungguhan (komputer rekan tak punya foldernya),
dan klik di browser.

## 6. Cara owner mencoba
Setelah `PLAYLY_UNDUHAN_MEGA_FOLDER` diisi di Vercel dan dirilis:
1. Buka `/admin/videos/playly` → pada video yang file-nya ada di folder Mega (nama file memuat
   ID video + `1080p`/`480p`, mis. `1793887644093_1080p.mp4`), klik **Atur link**.
2. Klik **Isi dari Mega**. Tombolnya berputar selama membaca.
3. Kotak **Mega 1080p / 480p** terisi `https://mega.nz/folder/...#.../file/...` dan muncul
   pesan hijau "2 link Mega terisi…". Tekan **Simpan link**, lalu buka videonya di situs →
   **DOWNLOAD** → tombol Mega membuka file yang benar.
   Pesan merah "Kunci folder Mega salah…" = link folder disalin tanpa bagian setelah `#`.
