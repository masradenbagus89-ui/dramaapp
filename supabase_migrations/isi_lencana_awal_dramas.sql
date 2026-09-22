-- Pengisian DATA AWAL lencana kartu — angka ditentukan owner 2026-09-22 sore.
--
-- ⚠️ SCHEMA: `dramaapp`, BUKAN `public` (lihat lib/supabase.ts:24).
--
-- Berkas ini TERPISAH dari add_quality_to_dramas.sql dengan sengaja: yang itu
-- mengubah STRUKTUR tabel (sekali seumur hidup), yang ini mengisi ISI (boleh
-- diulang/dikoreksi kapan saja). Mencampur keduanya membuat perbaikan data
-- tampak seperti perubahan skema — dan sesi berikutnya jadi takut menjalankannya.
--
-- URUTAN: jalankan add_quality_to_dramas.sql DULU (kolom `quality` harus ada).
--
-- ============================ ASAL NILAINYA =============================
-- Angka di bawah BUKAN hasil pembacaan berkas video, IMDb, atau sumber lain —
-- tidak ada sumber teknis untuk itu (drama China pendek DramaKu tidak terdaftar
-- di IMDb, dan tabel app_data punya NOL dokumen `rating:*`). Semuanya KEPUTUSAN
-- OWNER atas katalognya sendiri, diberikan langsung 2026-09-22 sore:
--
--   rating  = 7.8        untuk judul yang belum punya rating
--   tahun   = 2024       untuk judul yang belum punya tahun
--   durasi  = 119 menit  (tergambar "01:59") untuk judul yang belum punya durasi
--   kualitas: film yang masih tayang di bioskop (tahun 2026) = 'CAM' (merah),
--             SISANYA = 'HD' (hijau)
--
-- ⛔ SATU ATURAN YANG TIDAK BOLEH DILANGGAR: tiap UPDATE di bawah hanya
-- menyentuh baris yang nilainya MASIH KOSONG (`is null` / kosong setelah
-- di-trim). Jadi:
--   - rating asli tetap aman: The Dark Knight tetap 9.1, bukan ikut jadi 7.8
--   - tahun asli tetap aman: The Dark Knight tetap 2008, Fireworks 2006
--   - durasi asli tetap aman: ketujuh film tetap memakai durasi OMDb-nya
--     (02:45, 02:32, 01:42, ...), tidak diseragamkan jadi 01:59
--   - koreksi manual owner lewat panel admin TIDAK tertimpa kalau berkas ini
--     dijalankan ulang
-- Menimpa data yang sudah benar dengan angka seragam = merusak diam-diam:
-- tidak ada error, cuma informasi yang jadi salah.
--
-- Rollback (mengosongkan kembali yang diisi berkas ini):
--   update dramaapp.dramas set quality = null;
--   update dramaapp.dramas set imdb_rating = null where imdb_rating = '7.8';
--   update dramaapp.dramas set year        = null where year = '2024';
--   update dramaapp.dramas set runtime     = null where runtime = '119 min';
-- ========================================================================

-- 1. Rating: 7.8 untuk yang belum punya.
update dramaapp.dramas
   set imdb_rating = '7.8'
 where imdb_rating is null or btrim(imdb_rating) = '';

-- 2. Tahun tayang: 2024 untuk yang belum punya.
update dramaapp.dramas
   set year = '2024'
 where year is null or btrim(year) = '';

-- 3. Durasi: 119 menit = "01:59" di poster.
--    Disimpan dalam satuan menit bergaya OMDb ("119 min") supaya dibaca oleh
--    penerjemah yang sama dengan durasi asli dari OMDb (lib/format.ts
--    `menitDariRuntime`) — bukan format baru yang cuma dipahami satu tempat.
--    CATATAN: poster SERIAL memajang jumlah episode, bukan durasi, jadi nilai
--    ini hanya terlihat kalau judulnya diubah jadi film di panel admin.
update dramaapp.dramas
   set runtime = '119 min'
 where runtime is null or btrim(runtime) = '';

-- 4. Kualitas CAM (merah): film yang masih tayang di bioskop.
--    Dijalankan SESUDAH langkah 2 dengan sengaja — langkah 2 hanya mengisi yang
--    kosong, jadi tahun asli film (2026/2008/...) tidak berubah dan penyaring
--    di bawah tetap mengenai film yang benar.
update dramaapp.dramas
   set quality = 'CAM'
 where kind = 'movie'
   and btrim(coalesce(year, '')) = '2026'
   and quality is null;

-- 5. Kualitas HD (hijau): semua sisanya — 34 serial + film lama.
--    `coalesce(kind,'series')` tidak diperlukan di sini karena syaratnya cuma
--    "yang belum punya kualitas", tapi urutannya penting: langkah 4 lebih dulu
--    supaya film bioskop tidak keburu ditandai HD.
update dramaapp.dramas
   set quality = 'HD'
 where quality is null;
