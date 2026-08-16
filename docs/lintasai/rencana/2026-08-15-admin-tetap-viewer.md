# Rencana: Admin baru tetap tampil sebagai viewer

- **Tanggal:** 2026-08-15
- **Diminta client:** "saya sudah tambah akun admin tapi kenapa masih jadi akun viewer pas login"

## Ringkasan
Menambah email di Kelola Admin hanya menulis daftar admin di server. Lencana VIEWER/ADMIN di header dibaca dari sesi browser (localStorage). Kalau orang itu sudah masuk sebagai penonton, sesi lama tidak ikut berubah. Perbaikan: pesan yang jelas + opsi password awal saat menambah admin + peringatan "masuk ulang" kalau emailnya sudah admin tapi sesinya masih penonton.

## ✅ Terverifikasi (sudah dibaca di kode)
- Tambah admin hanya menulis daftar email — `app/api/admins/route.ts:44-46`
- Login admin wajib password; sukses baru `role: "admin"` + cookie — `app/api/auth/login/route.ts:44-88`
- Daftar akun (`/daftar`) selalu `role: "viewer"` dan nama kustom (bukti di screenshot: `Adminmegatron3082`) — `app/daftar/page.tsx:65-69`
- Header baca role dari localStorage, tidak cek ulang daftar admin — `app/components/TopNav.tsx:37`, `lib/auth.ts:27-38`
- `fetchUserRole()` ada tapi tidak dipanggil di UI — `lib/auth.ts:63`
- Password saat daftar penonton **tidak disimpan**; admin baru harus pakai password admin bersama atau password pribadi — `app/api/auth/login/route.ts:91-95`, `docs/auth.md:8-9`

## ❓ Asumsi
- Akun di screenshot (`megatron3082@gmail.com` / nama `Adminmegatron3082`) masih memakai sesi daftar-penonton, belum lolos login admin.

## Yang TIDAK dibangun
- Auto-angkat jadi admin tanpa password (celah keamanan).
- Menyimpan password penonton dari halaman daftar.
- Mengubah password admin bersama di server.

## Yang ikut tersenggol
| Fitur/halaman | Penjaga |
|---|---|
| Login `/login` | ⚠️ tes alur nama/role ditambah |
| Kelola Admin | ⚠️ pesan + field password opsional |
| Header (lencana role) | ⚠️ peringatan masuk-ulang |
| Endpoint POST `/api/admins` | ✅ tetap hanya admin ber-cookie |

## Pre-mortem
Kalau hasilnya nol guna: admin baru tetap masuk dengan password saat daftar, dapat error "Password admin salah", lalu kembali ke sesi penonton lama — maka pesan + peringatan masuk-ulang harus menyebut bedanya dua password itu.

## Lima kepala bahasan
1. **Alur pengguna:** admin lama tambah email (+ password awal opsional) → admin baru keluar/masuk ulang dengan password admin → lencana ADMIN.
2. **Data & siapa boleh lihat:** daftar admin + hash password per-akun; hanya admin ber-cookie yang boleh menambah.
3. **Kalau gagal:** password salah → pesan yang menyebut "bukan password saat daftar".
4. **Batas/skala:** n/a (daftar admin kecil).
5. **Cara uji:** langkah klik di laporan penutup + tes unit `needsAdminRelogin` / `nameAfterLogin`.

## Langkah kerja
1. Helper + tes: kapan harus masuk ulang, nama login tidak menimpa nama kustom.
2. POST `/api/admins` terima password opsional (hash scrypt, min 8).
3. UI Kelola Admin: teks jelas + field password opsional.
4. Header: kalau email sudah admin tapi role viewer, tampilkan peringatan.
5. Login: pesan error lebih jelas.
