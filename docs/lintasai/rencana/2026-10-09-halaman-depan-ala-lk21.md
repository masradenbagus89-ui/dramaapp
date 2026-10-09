# Halaman depan ala LK21 + pindah rumah project (2026-10-09)

Rangkaian permintaan owner dalam satu sesi, dikerjakan berurutan.

## Yang dikerjakan

1. **Tema terang ber-scope.** `@custom-variant terang` di `app/globals.css`; warna terang
   hanya menyala di dalam pembungkus `tema-terang`. Dipilih karena kartu poster & baris
   geser dipakai BERSAMA /beranda, /discover, /shorts — mengganti `bg-black` langsung
   akan memutihkan halaman lain tanpa satu pun error. Terbukti: /discover tetap gelap.
2. **Hero hitam satu baris** di atas (`FeaturedRow` dipindah ke luar pembungkus terang).
3. **Bar "Lanjutkan Menonton"** (`LanjutMenonton.tsx`) = pintu akun TUNGGAL, tertutup
   sampai diklik. Strip ajakan daftar, blok penutup, dan tautan footer DIBUANG; peran
   `<h1>` pindah ke sr-only supaya SEO tidak ikut hilang.
4. **Seksi grid per tab** (`SeksiKatalog.tsx`) menggantikan baris geser. Tab yang dipilih
   naik ke urutan pertama supaya kliknya tetap terasa.
5. **Seksi "Film Terbaru"** paling atas, khusus film dari Playly (bukan drama).

## Fakta terverifikasi (bukan asumsi)

- Katalog drama = **40 judul**; hanya **1** ber-`kind: "movie"`. Angka "164 film" owner
  datang dari **Playly**, sumber yang sama dengan halaman `/film` — BUKAN tabel drama.
- Film webhook terbaca tanpa kunci API (tersimpan di DB sendiri); yang butuh kunci hanya
  katalog Playly. Di lokal terbaca 27 film, di produksi 164.
- Mode "baris geser" `TabKatalogTampilan` HANYA dipakai halaman depan (/beranda memakai
  `hanyaMenu`, /katalog memakai `paksaSemua`) -> aman diubah.
- `JUDUL_BARIS_VIDEO = "Film Terbaru"` SUDAH ADA di `lib/beranda-video.ts` -> dipakai
  ulang, tidak bikin konstanta baru.

## Keputusan yang perlu diingat

- `homeCatalogRows()` TETAP dipakai /beranda & /shorts -> hanya berhenti dipakai di
  `app/page.tsx`, JANGAN dihapus dari lib.
- Tes `tab-katalog-beranda.test.ts` dulu mencocokkan teks pemanggilan huruf-per-huruf
  sehingga MERAH PALSU saat prop sah ditambah. Diganti jadi pernyataan maksud, dan
  diperketat: kini `basePath` apa pun ditolak, bukan cuma "/beranda".

## PINDAH RUMAH: D: -> E:\dramaapp

Drive D: mencapai 0 byte dan tidak bisa menulis 1 KB pun; git pun mati total. Penyebab
~346 GB tak terbukti: `D:\$RECYCLE.BIN` (puluhan akun) & `System Volume Information`
menolak akses tanpa hak admin. Semua cara non-destruktif gagal (hapus artefak = 180 KB,
kompresi NTFS butuh ruang sementara, junction ke C: merusak resolusi node_modules).

Project DISALIN (bukan dipindah) ke `E:\dramaapp` — 81 GB bebas. Salinan lama di
`D:\Users\user18\dramaapp` sengaja DIBIARKAN sebagai cadangan sampai owner yakin.

⚠️ Sesi AI berikutnya WAJIB dibuka dari `E:\dramaapp`, bukan D: — di luar folder yang
memuat `.lintasai/`, seluruh aturan kit tidak termuat tanpa pesan error apa pun.

## Insiden yang harus diingat

`git checkout -- <berkas>` dijalankan saat disk 0 byte MENGOSONGKAN berkas itu: git
men-truncate dulu, lalu gagal menulis isinya kembali. `docs/lintasai/INDEX.md` sempat
jadi 0 byte karenanya (dipulihkan dari HEAD). **Jangan jalankan perintah git yang
menulis saat disk penuh — periksa ruang lebih dulu.**
