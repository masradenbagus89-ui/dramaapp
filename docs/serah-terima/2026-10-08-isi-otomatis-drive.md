# 2026-10-08 — Isi otomatis link unduhan Google Drive (tahap 1)

Branch: `feat/link-unduhan-provider-kualitas` (di atas `3fc0e07`, belum dirilis).

## 1. Apa yang berubah + kenapa
Mengisi 10 kotak link unduhan per video satu per satu memakan waktu. Tahap 1 menambah tombol
**"Isi dari Google Drive"** di panel tiap video (`/admin/videos/playly` → Atur link). Sistem
membaca folder Drive, mencari file yang namanya memuat **ID video** dan **1080p / 480p**
sebagai kata utuh (mis. `abc123_1080p.mp4`), lalu mengisi kotak **Google Share**.

Tombol ini **tidak menyimpan apa pun**. Admin memeriksa isinya lalu menekan **Simpan link**
seperti biasa, sehingga pemeriksaan https + domain tetap lewat jalur yang sama. Kalau ada >1 file
untuk kualitas yang sama, sistem tidak memilih salah satunya: file-file itu disebut di pesan dan
admin yang memutuskan.

Keputusan owner (2026-10-08): file sudah diunggah manual · nama file memuat ID video ·
kualitas tertulis di nama file · Google Drive dikerjakan dulu, Telegram/Mega/Send.cm menyusul.

Catatan teknis: Drive `name contains` hanya mencocokkan **awal** nama (dok resmi "Search query
terms"), jadi kode membaca seluruh isi folder lalu mencocokkannya sendiri. Subfolder **tidak**
ikut dibaca. Batasnya 20.000 file per folder.

## 2. Berkas yang disentuh
- `lib/playly-unduhan-drive.ts` (baru): pencocokan nama file + panggilan Drive API (server-only)
- `app/api/admin/playly/unduhan/drive/route.ts` (baru): `GET ?videoId=` khusus admin, hanya membaca
- `app/components/admin/PlaylyUnduhanManager.tsx`: tombol + pengisian kotak Google Share
- `tests/playly-unduhan-drive.test.ts` (baru): 13 tes
- `.env.example`: 2 env baru (template, nilai kosong)

Halaman yang terpengaruh: hanya `/admin/videos/playly`. Halaman penonton tidak berubah.

## 3. Butuh SQL migrasi?
Tidak.

## 4. Butuh env baru di Vercel?
Ya. Keduanya **opsional**: kalau kosong, tombol menampilkan pesan "belum diatur" dan bagian
situs lain tidak terpengaruh.
- `GOOGLE_DRIVE_API_KEY`: API key Google Cloud dengan **Google Drive API** aktif (batasi key
  ke Drive API saja). Server-only, **jangan** diberi awalan `NEXT_PUBLIC_`.
- `PLAYLY_UNDUHAN_DRIVE_FOLDER`: ID folder Drive (bagian setelah `/folders/` di alamatnya);
  lebih dari satu dipisah koma. Folder wajib dibagikan **"Siapa saja yang memiliki link"**,
  karena API key hanya bisa membaca berkas publik.

## 5. Bukti yang sudah dijalankan (2026-10-08, urutan gerbang aturan 6)
- `rm -rf .next` → `npm run build` exit 0
- `npx tsc --noEmit` exit 0
- `npx vitest run` → **1352 lulus / 91 berkas** (sebelumnya 1338/90 + 13 tes baru + 1 berkas)
- ESLint: proyek tak punya `eslint.config.*`, jadi lint tidak dijalankan

**Belum diuji:** panggilan ke Google Drive sungguhan (komputer rekan tak punya API key &
folder asli). Tes memakai jawaban Google palsu. Klik di browser juga belum dicoba.

## 6. Cara owner mencoba
Setelah env diisi di Vercel dan dirilis:
1. Buka `/admin/videos/playly` → pada video yang file-nya ada di folder Drive, klik **Atur link**.
2. Klik **Isi dari Google Drive**.
3. Kotak **Google Share 1080p / 480p** terisi `https://drive.google.com/file/d/.../view` dan muncul
   pesan hijau "2 link Google Drive terisi…". Tekan **Simpan link**, lalu buka videonya di situs →
   **DOWNLOAD** → tombol Google Share membuka file yang benar.
   Pesan merah "Folder tidak ditemukan…" = ID folder salah atau folder belum dibagikan publik.
