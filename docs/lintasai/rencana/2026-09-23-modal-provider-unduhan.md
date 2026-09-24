# Rencana: tombol DOWNLOAD membuka modal daftar provider (Google Share · Telegram · Cast · Mega)

- **Tanggal:** 2026-09-23
- **Diminta client:** tombol DOWNLOAD tidak lagi langsung mengunduh 1 berkas, melainkan membuka modal
  berisi tabel pilihan provider (kolom PROVIDER | DOWNLOAD, header pink), tiap baris punya tombol
  kualitas berwarna biru/oranye, ada banner catatan biru muda + link tutorial, dan datanya menempel di
  data video lalu dioper sebagai prop ke tombolnya. Kalau data provider kosong → balik ke perilaku lama.

## Koreksi premis (dibaca dari kode, bukan ingatan)

Permintaan menyebut `components/ActionButtons.tsx` berisi DOWNLOAD + Share + Save. **Berkas itu tidak
ada** — nol hasil untuk "ActionButtons" di seluruh repo. Yang ada:

- `app/components/DownloadButton.tsx:36` — tombol pink (`bg-pink-600`, baris 58). **Belum dipasang di
  halaman mana pun**: grep seluruh repo hanya menemukan baris definisinya sendiri. Commit `f65ccd6`
  menambah komponen + helper + tes tapi tak pernah mengimpornya ke halaman. Jadi di situs sungguhan
  belum ada tombol DOWNLOAD yang bisa diklik.
- Share & Save ada sebagai komponen TERPISAH di `app/drama/[id]/page.tsx:180-184`
  (`SaveButton`, `LikeButton`, `ShareButton`).

Keputusan owner (popup 2026-09-23): **ikut pola project** — bikin `DownloadModal` di `app/components/`
dan pasang `DownloadButton` yang sudah ada ke halaman detail. TIDAK membuat `components/ActionButtons.tsx`
(satu-satunya komponen fitur di luar `app/components/` = pola baru yang beda sendiri).

## ✅ Terverifikasi

- Pola modal yang BENAR-BENAR dipakai = `app/components/RewardedAdModal.tsx` (manual `fixed inset-0`,
  prop `open`/`onClose`, `if (!open) return null`). `components/ui/dialog.tsx` (Radix/shadcn) ada di
  repo tapi **nol pemakai** → memakainya = memperkenalkan pola baru.
- Jalur DDL database TERTUTUP — `lib/kualitas-drama.ts:12-18` (password DB tak berlaku, tak ada
  Supabase CLI/PAT, owner tak punya akses dashboard). Kolom baru `download_providers` **tidak bisa**
  dibuat sekarang.
- Preseden untuk kasus persis ini: `quality` disimpan sebagai 1 dokumen di tabel `app_data` (key→jsonb)
  — `lib/kualitas-drama.ts` + ditulis dari `app/api/admin/drama/route.ts:263`.
- Empat jalur baca katalog yang wajib ikut menempelkan data: `getAllDramas` (`lib/dramas.ts:173`),
  `getDrama` (`:183`), `getAllDramasCached` (`:215`), `getDramaCached` (`:257`).
- Halaman detail di-cache `revalidate = 60` (`app/drama/[id]/page.tsx:25`) → pembacaan app_data WAJIB
  ikut ber-cache; satu fetch tanpa cache membuat SELURUH halaman dinamis (`lib/supabase.ts:204`).
- Tes penjaga tombol unduh lama yang harus tetap hijau: `tests/download-button.test.ts` (paywall +
  jalur unduh relatif).

## ❓ Asumsi

- Provider berlaku **per-drama** (bukan per-episode). Permintaan menyebut "data video"; halaman detail
  memang satu drama. Per-episode bisa ditambah nanti tanpa membongkar bentuk ini.
- Nama field mengikuti permintaan apa adanya: `name`, `quality`, `url`, `buttonColor`, `note`,
  `tutorialUrl`.

## PRE-MORTEM — anggap semua sudah jadi, hasilnya NOL guna. Kenapa?

**Penyebab paling mungkin: modalnya bagus tapi kosong selamanya**, karena owner tak punya cara mengisi
data provider (kolom DB tak bisa dibuat, dan tanpa UI admin tak ada pintu masuk data). Maka field admin
BUKAN tambahan opsional — ia bagian wajib dari rencana ini. Penyebab kedua: `ambilPetaUnduhan` lupa
dioper `revalidate`, sehingga halaman detail dibangun ulang tiap pengunjung (jebakan yang sudah tercatat).

## Yang TIDAK dibangun (sengaja)

- Kolom database `download_providers` — akses DDL tertutup (lihat ✅ di atas).
- Provider per-EPISODE — hanya per-drama.
- Proxy/penyalur internal untuk berkas provider — sesuai permintaan, link eksternal dibuka langsung.
- Pengecekan apakah link provider masih hidup — tak ada yang memverifikasi link mati.
- Halaman Playly & feed tidak disentuh.

## Yang ikut tersenggol

| Fitur yang client kenal | Kena apa | Penjaganya |
|---|---|---|
| Halaman detail drama | dapat tombol DOWNLOAD baru (sebelumnya tidak ada) | `tests/download-button.test.ts` (sudah ada) |
| Panel admin → form drama | dapat kotak isian provider unduhan | `tests/admin-drama-route.test.ts` (sudah ada) |
| Katalog (beranda/cari/kategori) | ikut membawa 1 pembacaan app_data tambahan | `tests/dramas.test.ts` (sudah ada) |
| Tombol unduh di player | **tidak** disentuh | — |

## Tahapan

1. `lib/types.ts` — tipe `DownloadProvider` + penyaring `parseDownloadProviders` (satu tempat, seperti
   `parseDramaQuality`) + field `downloadProviders?` di `Drama`.
2. `lib/unduhan.ts` — plumbing app_data: `bacaPetaUnduhan` · `gabungUnduhan` · `ambilPetaUnduhan` ·
   `simpanUnduhan`. Cermin `lib/kualitas-drama.ts`.
3. `lib/dramas.ts` — tempelkan di 4 jalur baca, `revalidate` ikut dioper.
4. `app/components/DownloadModal.tsx` — modal tabel provider.
5. `app/components/DownloadButton.tsx` — prop `providers` + state modal + fallback perilaku lama.
6. `app/drama/[id]/page.tsx` — pasang tombolnya.
7. `app/api/admin/drama/route.ts` + `DownloadProviderFields.tsx` + `DramaForm.tsx` + `app/admin/page.tsx`
   — pintu masuk data.
8. `tests/unduhan.test.ts` — penjaga penyaring (termasuk tolak `javascript:`).

## Catatan keamanan (§5.2/§5.4)

Isi dokumen `app_data` = **data tak-tepercaya** (tak ada CHECK constraint yang menjaganya). URL provider
dipasang di `href`, jadi penyaring WAJIB menolak skema selain `http:`/`https:` — `javascript:…` di href
adalah XSS. Ini pagar yang sama fungsinya dengan `parseDramaQuality`, bukan tambahan hiasan.

## Hasil (diisi setelah dikerjakan, 2026-09-23)

**Gerbang §6 dijalankan penuh, urutan benar (build dulu, baru tsc):**
`rm -rf .next` → `npm run build` **exit 0** → `npx tsc --noEmit` **exit 0** → `npm test` **939 tes /
65 berkas hijau** (sebelumnya 912/63). Nol berkas env/kunci tersentuh.

**Bukti tombolnya benar-benar tayang** (bukan sekadar ditulis — ini justru inti masalahnya): server
hasil build dijalankan di `:3099`, `GET /drama/over-your-dead-body` → **200**, HTML-nya memuat
`DOWNLOAD`, `href="/api/download?id=over-your-dead-body&ep=1"`, `download="over-your-dead-body-ep1.mp4"`,
dan `bg-pink-600`.

**Penjaga diuji-balik** (tes hijau yang tak pernah bisa merah tidak menjaga apa pun):
- pagar `isHttpUrl` dilemahkan jadi `return true` → **5 tes MERAH**, dikembalikan → hijau
- `<DownloadButton …/>` dilepas dari halaman detail → **2 tes MERAH**, dikembalikan → hijau

**Tiga berkas tes:** `tests/unduhan.test.ts` (19, penyaring data) · `tests/download-modal-render.test.ts`
(13, tampilan komponen sungguhan lewat `renderToStaticMarkup`) · `tests/unduhan-pemasangan.test.ts`
(14, PEMASANGAN — penjaga jenis baru, lahir dari temuan di bawah).

## ⛔ Temuan yang mengoreksi diagnosis sesi sebelumnya

`HANDOFF.md` menyimpulkan produksi belum membangun `8e1c880` karena penanda `DOWNLOAD` nol di halaman
drama, lalu mengarahkan owner memeriksa build merah di dashboard Vercel. **Kesimpulan itu tidak didukung
buktinya:** `DownloadButton` tidak pernah dipasang di halaman mana pun, jadi penandanya akan tetap nol
walau deploy-nya sukses sempurna. Dibuktikan dengan `git log --all -S "<DownloadButton" -- app/`
(**kosong di semua cabang**) dan `git grep DownloadButton origin/main -- app/` (cuma berkasnya sendiri).
Ini **tidak** membuktikan deploy-nya berhasil — hanya membuktikan pengukuran kemarin tidak menjawab
pertanyaan yang ditanyakan.

## Cara owner membuktikan jalur datanya sendiri (3 langkah)

Yang BELUM terbukti dari sesi ini: perjalanan data penuh form admin → `app_data` → modal terisi.
Membuktikannya berarti menulis ke data produksi, jadi sengaja tidak dilakukan tanpa izin.

1. Buka **/admin** → pilih satu drama → **Edit**. Turun ke kotak merah muda
   **"Provider unduhan (isi modal tombol DOWNLOAD)"** → klik **Tambah provider**.
2. Isi minimal tiga kolom: Nama (`Telegram`), Kualitas (`480p`), Alamat (`https://t.me/...` — wajib
   diawali `https://`). Klik **Simpan drama**.
3. Buka halaman drama itu (**/drama/<id>**) → klik tombol pink **DOWNLOAD**.
   **Harus muncul** kotak dengan kepala tabel pink `PROVIDER | DOWNLOAD` dan satu baris `Telegram`
   berisi tombol biru `DOWNLOAD 480p`. Klik tombolnya → tab baru ke alamat provider.

Kalau modalnya tidak muncul dan tombolnya malah langsung mengunduh, berarti daftarnya tersaring habis —
hampir selalu karena alamatnya belum diawali `http://`/`https://`.
