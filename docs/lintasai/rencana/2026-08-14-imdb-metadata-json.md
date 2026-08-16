# Rencana: Generate metadata film dari IMDb ID

- **Tanggal:** 2026-08-14
- **Diminta client:** "Buat sistem generate otomatis metadata film dari IMDb ID" + "apakah bagus andai dramaapp saya buat seperti ini"

## Ringkasan
Admin mengetik ID IMDb (`tt...`), sistem mengambil data resmi lewat OMDb (bukan mengikis halaman IMDb), menampilkan JSON metadata, lalu mengisi form drama. Pengunjung tetap membaca data yang sudah disimpan — bukan memanggil IMDb setiap kali buka halaman.

## ✅ Terverifikasi (sudah dibaca di kode)
- Endpoint admin `GET /api/generate-from-imdb` + cek sesi admin — `app/api/generate-from-imdb/route.ts`
- Sumber data = OMDb (`OMDB_API_KEY`), bukan IMDb langsung — `lib/imdb-tool.ts`
- Form admin sudah bisa Ambil draft → Isi form — `app/components/admin/DramaForm.tsx`
- Metadata yang sudah ada: judul, tahun, poster, genre (teks), rating, durasi, sutradara, writer, stars — belum negara, bahasa, banner terpisah, writers/stars sebagai array, jumlah episode series

## ❓ Asumsi
- Banner lebar (hero) tidak ada di OMDb. Kalau `TMDB_API_KEY` ada → ambil backdrop TMDB; kalau tidak → banner kosong, form tetap pakai poster sebagai hero (perilaku lama).
- Jumlah episode IMDb = petunjuk untuk series. Kalau admin sudah Scan folder video, angka scan yang menang (file nyata di PC backup).

## Yang TIDAK dibangun
- Mengikis HTML IMDb (melanggar aturan IMDb + rapuh).
- Memanggil OMDb di halaman pengunjung.
- Mengganti kategori katalog DramaKu (Romance/Tycoon/…) dengan genre IMDb mentah.

## Yang ikut tersenggol
| Fitur | Penjaga |
|---|---|
| Form admin + simpan drama | tes `imdb-tool` + typecheck |
| Halaman `/drama/[id]` | tampil field baru kalau terisi; drama lama tanpa field tetap valid |
| Scan & auto-hardlink | jumlah episode dari scan tidak ditimpa kalau sudah ada hasil scan |

## Lima kepala bahasan
1. **Alur pengguna:** Admin buka /admin → isi ID IMDb → Ambil draft → lihat JSON + preview → Isi form ini → Simpan drama → pengunjung lihat di halaman drama.
2. **Data & siapa boleh lihat:** Ambil dari IMDb hanya admin (sesi server). Metadata tersimpan di katalog drama; pengunjung hanya baca yang sudah disimpan.
3. **Kalau gagal:** ID salah / film tidak ketemu / kunci OMDb bermasalah → pesan jelas di form, form tidak diisi otomatis.
4. **Batas/skala:** 1 permintaan per klik admin. Series panjang: hitung episode maks 15 musim supaya tidak timeout.
5. **Cara uji:** Admin ketik `tt19869990` → harus muncul judul, genre[], writers[], stars[], JSON. Series → episodeCount. Tes unit mapping tanpa jaringan.

## Pre-mortem
Kalau hasilnya nol guna: admin tetap mengetik manual karena JSON tidak terisi / banner kosong / episode salah. Mitigasi: plot lengkap, pecah daftar jadi array, episode series dihitung, banner opsional TMDB, JSON ditampilkan di preview.

## Langkah kerja
1. Perkuat pemetaan OMDb → JSON yang diminta + field country/language/episodeCount/banner.
2. Form admin menampilkan JSON + mengisi field baru; halaman drama menampilkan negara/bahasa/genre pill.
3. Migrasi SQL opsional (kolom country/language) — tidak dijalankan ke produksi tanpa izin.
4. Tes mapping + uji OMDb nyata (kunci lokal).
