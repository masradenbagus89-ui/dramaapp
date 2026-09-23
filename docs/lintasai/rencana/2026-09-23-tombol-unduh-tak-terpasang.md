# 2026-09-23 — tombol Unduh yang "selesai" tapi tidak pernah terpasang

**Status:** SELESAI & dirilis (`a8db3ca`).

## Apa yang terjadi

Commit `f65ccd6` (kerja rekan, 2026-09-22) menambahkan:

- `app/components/DownloadButton.tsx` — komponen tombolnya, lengkap dengan komentar panjang
- `DETAIL_DOWNLOAD_EP`, `detailDownloadUrl()`, `downloadFileName()` di `lib/video.ts`
- `tests/download-button.test.ts` — 7 tes, semuanya HIJAU
- catatan di `HANDOFF.md` yang menulis *"Tombol DOWNLOAD berdampingan dengan Nonton; Save/Suka/Bagikan turun ke baris sendiri"*

Yang TIDAK ada: satu pun berkas yang mengimpor komponen itu. `app/drama/[id]/page.tsx`
nol sentuhan di keempat commit. Jadi tombolnya **tidak pernah tergambar** — *dead code*
yang dari luar terlihat seperti fitur yang sudah jadi.

Ketahuan saat owner menarik kerja rekan: daftar berkas yang berubah tidak memuat halaman
detail, padahal tombolnya harus dipasang di sana. Dikonfirmasi dengan `grep DownloadButton`
ke seluruh `app/` + `lib/` + `components/` → hanya satu hit, yaitu deklarasinya sendiri.

## Kenapa lolos semua pemeriksaan

1. **`npm test` hijau** — 7 tes itu menguji fungsi MURNI (`detailDownloadUrl`, batas
   paywall). Fungsi murni tidak tahu-menahu siapa yang memakainya.
2. **`npx tsc --noEmit` exit 0** — TypeScript tidak menganggap komponen tak terpakai
   sebagai error.
3. **`npm run build` exit 0** — Next.js tidak mengeluh soal berkas yang tak diimpor.
4. **Catatan handoff-nya sendiri menyatakan sudah terpasang** — jadi pembaca berikutnya
   punya alasan untuk tidak memeriksa ulang.

Gerbang pra-rilis §6 memeriksa "kodenya sehat", BUKAN "fiturnya ada".

## Pelajaran

**(a) Tes fungsi murni tidak bisa membuktikan fiturnya ADA.** Ia membuktikan fungsinya
benar KALAU dipanggil. Tiap komponen baru yang terlihat penonton butuh satu penjaga
tambahan yang menuntut halamannya benar-benar memakainya.

**(b) Klaim di catatan serah-terima wajib diperlakukan sebagai klaim, bukan fakta.**
Kalimat "tombolnya berdampingan dengan Nonton" bisa dibuktikan/dibantah dalam 5 detik
(`git diff --name-only` — apakah halamannya ikut berubah?). Yang membuatnya lolos adalah
membaca catatan lalu percaya.

**(c) Rebase bisa menelan suntingan tanpa satu pun peringatan.** Rekan mencatat sendiri
bahwa mereka pindah basis ke `origin/main` dan membuang stash. Suntingan halaman detail
kemungkinan besar hilang di situ — git tidak pernah memberitahu "ada berkas yang tadinya
kamu ubah, sekarang tidak".

**(d) Penjaga cocok-teks wajib mengunci PERNYATAAN IMPORT UTUH, bukan nama komponen.**
Nama yang kebetulan disebut di dalam komentar membuat penjaganya hijau palsu — pelajaran
yang sudah pernah dicatat 2026-09-22 dan terbukti relevan lagi di sini.

**(e) Mutation check-nya sendiri bisa cacat.** Mutasi pertama menukar `<DownloadButton`
jadi `<DownloadButtonXX` — tetap HIJAU, dan sempat terbaca sebagai "penjaganya palsu".
Sebabnya `toContain("<DownloadButton")` memang masih cocok dengan `<DownloadButtonXX`.
Mutasi yang benar = hapus elemennya utuh. Mutasi yang tak benar-benar merusak tidak
membuktikan apa pun ke dua arah.

## Penjaga permanen

`tests/download-button.test.ts` bertambah 3 tes yang membaca `app/drama/[id]/page.tsx`
dari disk dan menuntut: pernyataan import utuh ke `@/app/components/DownloadButton` ·
elemennya benar-benar dirender · prop `dramaId` + `episodes` ikut dikirim.

**Uji-balik 3 arah, semuanya MERAH:** import dihapus → merah · elemen dihapus utuh →
merah (2 tes) · prop `episodes` dihapus → merah. Berkas dipulihkan identik sesudahnya.

## Catatan proses

Rekan menulis ke `HANDOFF.md` dan `docs/lintasai/INDEX.md` — dua dari tiga berkas yang
`AGENTS.local.md` aturan 1 tetapkan sebagai milik owner. Kali ini tidak bentrok karena
owner kebetulan belum menyentuhnya, tapi aturannya memang ada supaya bentrok jadi
MUSTAHIL, bukan sekadar jarang. Tempat yang benar: `docs/serah-terima/YYYY-MM-DD-<topik>.md`.
