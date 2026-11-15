# 2026-11-15 — Daftar Perlu dicek

Owner: film di video Playly yang bertanda segitiga dipisah jadi daftar sendiri supaya mudah dicek.

## Kondisi

- Tanda segitiga di kiri judul = berkas video belum ada di Playly (`belumSiap` di `PlaylyVisibilityManager`).
- Sebelumnya baris itu tercampur di daftar berhalaman (50 baris per halaman).

## Yang dibuat

- Tombol **Perlu dicek** di deretan saringan. Diklik, tabel yang sama menampilkan hanya judul bertanda. Diklik lagi, kembali ke daftar biasa.
- Kotak kedua di atas tabel DICABUT (owner: jangan menumpuk). 59 baris penuh mendorong daftar biasa keluar layar.
- Angka tombol Semua / Sudah ada IMDb / Belum ada IMDb dihitung dari daftar biasa saja.

## Yang tidak dibuat

- Tidak mengubah cara mendeteksi "berkas belum ada".
- Tidak mengubah halaman penonton. Film ini memang sudah tidak tayang.

## Bukti

`npx vitest run tests/daftar-perlu-cek.test.ts tests/paginasi.test.ts tests/bagian-playly.test.ts tests/panel-playly-tanpa-menunggu.test.ts tests/panel-playly-tahan-gangguan.test.ts tests/saring-video-admin.test.ts` → 6 berkas, 70 tes, lulus.
