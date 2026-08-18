# Rencana — Tahap 7: Kode pemulihan password penonton

**Tanggal:** 2026-08-18 · **Bobot:** BERAT (login + data pribadi)
**Keputusan owner:** kode pemulihan saat daftar (tanpa email, tanpa domain, tanpa biaya)

## Kenapa

Tahap 6 mewajibkan password penonton, TAPI belum ada jalan pulih kalau lupa —
penonton terkunci permanen. Itu utang yang dibuat Tahap 6 sendiri, jadi ditutup
lebih dulu sebelum ada penonton sungguhan yang kena.

Kirim email ditolak sebagai solusi tahap ini karena butuh domain milik sendiri
(layanan email hanya mau mengirim atas nama domain yang dibuktikan lewat DNS);
`dramaapp.vercel.app` milik Vercel, bukan milik owner.

## Kontrak

- **Input daftar:** seperti Tahap 6 + server menghasilkan 1 kode pemulihan.
- **Output daftar:** kode ditampilkan **SEKALI** di response. Yang disimpan di
  database hanya HASH-nya (scrypt + salt), sama seperti password.
- **Input reset:** email + kode pemulihan + password baru.
- **Output reset:** password diganti + kode LAMA hangus + kode BARU diberikan.
- **Error:** 400 input tak lengkap · 401 email/kode salah (pesan SAMA supaya tak
  bisa dipakai menebak email terdaftar) · 429 terlalu sering mencoba.
- **Rahasia:** kode & password tak pernah masuk log.

## Bentuk kode

31 huruf/angka tanpa karakter rancu (tanpa 0/O/1/I/L), 16 karakter, ditulis
4 grup: `ABCD-EFGH-JKMN-PQRS`. Ruang tebak 31^16 ≈ 2^79 — tak bisa ditebak.
Saat diverifikasi: huruf besar-kecil & tanda hubung diabaikan.

## Langkah

1. `lib/recovery-code.ts` — buat kode, normalisasi, hash & verifikasi
   (memakai ulang scrypt di `lib/admin-password.ts`, bukan kripto baru).
2. `lib/store.ts` — `ViewerAccount.recovery` **OPSIONAL** supaya akun yang
   terdaftar di Tahap 6 tetap valid tanpa migrasi data.
3. `app/api/auth/register` — buat kode, simpan hash, kembalikan kode sekali.
4. `app/api/auth/reset-password` — verifikasi kode, ganti password, terbitkan
   kode baru (sekali pakai). Dilindungi rate-limit ketat.
5. `app/api/auth/recovery-code` — penonton yang SUDAH login bisa membuat kode
   baru. Ini jalan keluar untuk akun Tahap 6 yang belum punya kode, dan untuk
   yang kodenya hilang tapi masih bisa masuk.
6. UI: layar kode sesudah daftar (wajib centang "sudah saya simpan"), halaman
   lupa password, dan bagian kode pemulihan di halaman profil.

## Yang TIDAK dibangun (sengaja)

- Kirim email / verifikasi email — butuh domain; bukan tahap ini.
- Banyak kode sekaligus (seperti 10 kode cadangan 2FA) — satu kode cukup dan
  lebih mudah dipahami penonton awam.
- Reset password admin — admin sudah punya jalurnya sendiri.

## Yang ikut tersenggol

| Fitur yang dikenal owner | Kenapa | Penjaganya |
|---|---|---|
| Halaman daftar | Setelah daftar muncul layar kode dulu, tak langsung ke beranda | Tes + uji manual |
| Halaman login | Tambah tautan "Lupa password?" | Uji manual |
| Halaman profil | Tambah bagian kode pemulihan | Uji manual |
| Akun penonton Tahap 6 | Belum punya kode → buat lewat profil | Field `recovery` opsional + tes |

## Pre-mortem

*Semua dikerjakan tapi nol guna — kenapa?*
→ Paling mungkin: penonton meng-klik "sudah saya simpan" tanpa benar-benar
menyalin kodenya, lalu tetap terkunci saat lupa password. Maka layar kode WAJIB
punya tombol salin + peringatan bahwa kode ini tak akan ditampilkan lagi, dan
profil harus menyediakan cara membuat ulang selagi masih bisa masuk.
