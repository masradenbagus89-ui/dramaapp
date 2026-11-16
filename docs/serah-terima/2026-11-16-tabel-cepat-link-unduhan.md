# 2026-11-16 — Tabel cepat link unduhan (semua film di satu layar)

Branch: `feat/link-unduhan-provider-kualitas` (belum di-commit saat ditulis, belum dirilis).

## 1. Apa yang berubah + kenapa
Mengisi link unduhan per film harus buka "Atur link" → isi → Simpan → tutup, diulang untuk tiap
film. Rekan memegang link-nya langsung dari akun Google Drive, Telegram, dan Mega (belum dicatat
di mana pun), jadi isi otomatis dari folder (Drive/Mega) tidak menolong.

Sekarang panel "Link download per video" di `/admin/videos/playly` punya 2 tampilan:
- **Tabel cepat (semua film)** — tampilan BAWAAN. Satu baris per film, 6 kolom (Google Share,
  Telegram, Mega × 1080p/480p). Tempel link → kotak langsung hijau (✓) atau merah + alasannya
  (mis. link Mega di kolom Google). Tombol **Simpan semua (N film)** menyimpan semua yang berubah
  sekaligus. Ada kotak cari judul + centang "Hanya yang belum lengkap". Browser memperingatkan
  kalau halaman ditutup sebelum disimpan.
- **Per film + isi dari Drive/Mega** — panel lama, tidak berubah (termasuk Send.cm & Cast).

Simpan tetap lewat `POST /api/admin/playly/unduhan` per film (berurutan) → validasi server sama
persis. Karena simpanan itu MENGGANTI seluruh link film, link provider di luar tabel (Send.cm)
ikut dikirim apa adanya supaya tidak terhapus — dijaga tes. Batas 60 simpanan/menit tetap: kalau
kena, pesannya minta tunggu lalu klik lagi; film yang belum tersimpan tetap ditandai.

## 2. Berkas yang disentuh
- `lib/playly-unduhan-tabel.ts` (baru): logika murni tabel
- `app/components/admin/PlaylyUnduhanTabel.tsx` (baru): tampilan tabel
- `app/components/admin/PlaylyUnduhanManager.tsx`: pilihan 2 tampilan
- `tests/playly-unduhan-tabel.test.ts` (baru): 7 tes

Halaman terpengaruh: hanya `/admin/videos/playly`. Halaman penonton tidak berubah.

## 3. Butuh SQL migrasi?
Tidak.

## 4. Butuh env baru di Vercel?
Tidak.

## 5. Bukti (2026-11-16, urutan gerbang aturan 6)
- `rm -rf .next` → `npm run build` exit 0
- `npx tsc --noEmit` exit 0
- `npm test` → **1413 lulus / 96 berkas** (naik dari 1406/95, +7 tes)
- Uji balik: link Send.cm sengaja tidak dikirim → 2 tes merah → dipulihkan

**Belum diuji:** klik di browser sungguhan. Di localhost komputer rekan daftar video Playly
kemungkinan kosong (kunci Playly lokal ditolak 401), jadi tabelnya baru bisa dicoba di produksi.

## 6. Cara owner mencoba
1. Buka `/admin/videos/playly` → bagian "Link download per video" → tampilan **Tabel cepat**.
2. Tempel link Google Drive asli di kolom **Google Share 1080p** satu film (kotak harus hijau ✓),
   lalu link Telegram di kolom **Telegram 480p** film lain → klik **Simpan semua (2 film)**.
3. Harus muncul "Beres: link 2 film tersimpan." Buka film itu di situs → **DOWNLOAD** → tombolnya
   membuka link tadi. Film yang dulu punya link Send.cm tetap punya link Send.cm.

---

# Tambahan (hari yang sama) — tombol "Cocokkan semua"

## 1. Apa yang berubah + kenapa
Rekan minta seperti tombol "Cocokkan semua ke IMDb": sekali klik, link semua film terisi. Di atas
tabel kini ada kartu **Cocokkan semua link sekaligus** + tombol kuning **Cocokkan semua**:
- Server membaca folder Google Drive + Mega SEKALI (serentak), lalu memasangkan tiap file ke film
  lewat **ID video** (aturan lama) atau **JUDUL di AWAL nama file** + `1080p`/`480p`, mis.
  `Americana (2025) 1080p.mp4`, `[Grup] Americana.2025.480p.WEB-DL.mkv`, atau tanpa tahun
  (`Americana 1080p.mp4`) asal judul tanpa tahun itu milik satu film saja.
- Judul terpanjang menang ("Spider Man 2" bukan "Spider Man"); yang ragu dilewati, file ganda
  disebut di baris filmnya (kuning) untuk diisi manual.
- Hanya **kotak kosong** yang diisi; tak ada yang disimpan otomatis — admin memeriksa lalu
  **Simpan semua** (validasi domain server tetap jalan).
- Telegram tidak ikut: Bot API tak bisa membaca riwayat channel. Tetap ditempel manual.

## 2. Berkas yang disentuh
- `lib/playly-unduhan-cocok.ts`: + `cocokkanSemuaVideo`, `normalTeks`
- `lib/playly-unduhan-otomatis.ts` (baru): gabung Drive + Mega (server-only)
- `app/api/admin/playly/unduhan/cocokkan/route.ts` (baru): `POST { videos }`, admin saja, hanya membaca, `guardMutation` 10/menit, `maxDuration = 60`
- `lib/playly-unduhan-drive.ts`, `lib/playly-unduhan-mega.ts`: + `ambilFileDrive` / `ambilFileMega` (perilaku tombol per-film sama)
- `app/components/admin/PlaylyUnduhanTabel.tsx`: kartu + tombol
- `tests/playly-unduhan-cocokkan-semua.test.ts` (baru): 12 tes

## 3. Butuh SQL migrasi?
Tidak.

## 4. Butuh env baru di Vercel?
Tidak ada nama baru — memakai `GOOGLE_DRIVE_API_KEY` + `PLAYLY_UNDUHAN_DRIVE_FOLDER`
(serah-terima 2026-10-08) dan `PLAYLY_UNDUHAN_MEGA_FOLDER` (2026-11-14). Tanpa env itu tombol
menampilkan pesan "belum diatur"; boleh hanya salah satu sumber yang diisi.

## 5. Bukti (2026-11-16)
- `rm -rf .next` → `npm run build` exit 0 (route `ƒ /api/admin/playly/unduhan/cocokkan`)
- `npx tsc --noEmit` exit 0
- `npm test` → **1425 lulus / 97 berkas**
- Uji balik: aturan "judul terpanjang menang" dirusak → 2 tes merah → dipulihkan

**Belum diuji:** folder Drive/Mega asli dan klik di browser (komputer rekan tak punya env &
daftar video lokal kosong karena kunci Playly 401).

## 6. Cara owner mencoba
1. Isi env Drive/Mega di Vercel, rilis. Pastikan di folder ada file `<Judul film persis seperti di situs> 1080p.mp4`.
2. `/admin/videos/playly` → Tabel cepat → klik **Cocokkan semua**.
3. Harus muncul "N link terisi untuk M film", kotaknya hijau ✓ → **Simpan semua** → buka film di situs → DOWNLOAD → link benar.
