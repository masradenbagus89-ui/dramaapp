# Permintaan restart Supabase — untuk diteruskan ke Kang Dedi

> Dibuat 2026-09-19. **Owner tinggal salin blok di bagian 2** dan kirim ke Kang Dedi
> (WhatsApp/Telegram/email). Bagian 1 & 3 untuk owner sendiri, tak perlu ikut dikirim.
>
> **Kenapa berkas ini ada:** project Supabase produksi `nvblmpkwyzbpdbshyvzw` **milik Kang Dedi**,
> bukan owner dramaapp. Tombol yang dibutuhkan (Restart project) hanya bisa ditekan pemilik akun.
> Keputusan lama yang masih berlaku: **jangan minta Personal Access Token beliau** — token itu
> membuka SELURUH akun Supabase-nya, jauh melebihi yang kita butuhkan.

---

## 1. Apa yang terjadi (versi owner)

**Gejalanya:** situs masih terlihat normal buat penonton, tapi di belakang layar database
dramaapp **kedip-kedip** — sebentar sehat, sebentar tidak menjawab sama sekali. Bukan mati total.

**Dampak yang sudah terukur hari ini:**

| Yang terdampak | Keadaan |
|---|---|
| Penonton membuka katalog & halaman drama | ✅ **Normal** — semua 200, di bawah 0,6 detik |
| Penonton login | ✅ **Jalan** (diuji: email palsu ditolak 401 dalam 0,91 detik) |
| Halaman Riwayat, My List, Profil, Admin | ❌ **Daftar filmnya kosong** — ketiganya mengambil data lewat `/api/dramas` yang sedang balas error |
| Halaman `/playly` | ⚠️ **Terbuka, tapi 12,8 detik** |
| Rilis 7 commit yang sudah siap | ⛔ **Tertahan** — gerbang `npm run build` tidak bisa lulus |

**Kenapa penonton tidak terganggu:** halaman katalog disajikan dari salinan yang sudah disimpan
sebelumnya (ISR). Jadi **halaman 200 BUKAN bukti database sehat** — itu salinan lama yang
menyelamatkan kita. Kalau gangguannya berlanjut lama, salinan itu akan basi.

**Istilah yang muncul di bawah:**
- **PostgREST** = lapisan yang mengubah database jadi alamat web (`/rest/v1/...`). Aplikasi kita
  bicara ke sini, bukan langsung ke database.
- **schema cache** = "daftar isi" tabel & kolom yang PostgREST hafalkan saat menyala. Tanpa ini ia
  tidak tahu tabel apa saja yang ada, jadi semua permintaan menggantung.
- **PGRST002** = kode error resmi PostgREST yang artinya persis: *gagal membaca daftar isi itu
  karena tidak kebagian sambungan ke database*.

---

## 2. Teks untuk dikirim ke Kang Dedi (salin dari sini ke bawah)

```
Kang, mohon bantuannya untuk project Supabase dramaapp:

  Project ref : nvblmpkwyzbpdbshyvzw
  Region      : ap-northeast-1

Sejak beberapa hari ini PostgREST-nya tersendat. Gejalanya kedip-kedip:
kadang sehat penuh, kadang semua permintaan menggantung sampai timeout.

Bukti yang sudah kami kumpulkan dari luar (pakai service_role key, tanpa
lewat Vercel):

1. Saat ia sempat menjawab, errornya:
   PGRST002 - "Could not query the database for the schema cache. Retrying."

2. Polanya kedip, bukan mati. Dalam satu jam:
   - satu periode: 25 dari 25 permintaan SUKSES, 0,02-0,11 detik
   - periode lain: 30 dari 30 permintaan TIMEOUT (10-12 detik, tak ada balasan)

3. Yang sudah kami coret lewat pengujian, jadi tidak perlu dicek lagi:
   - Project di-pause          -> tidak. Storage API melayani normal (200)
   - Kunci/env salah           -> tidak. Kunci yang SAMA diterima Storage
   - Jaringan kami             -> tidak. TCP ke pooler nyambung 74 ms
   - Query tertentu yang berat -> tidak. Saat sedang "mati", query paling
                                  ringan (select=id&limit=1) ikut timeout

Karena PGRST002 itu artinya PostgREST tidak kebagian sambungan database,
dugaan kami jatah koneksi habis atau ada sambungan yang menggantung dan
tidak dilepas.

Yang kami mohon:
  Project Settings -> General -> Restart project

Itu menyalakan ulang PostgREST dan melepas sambungan yang tersangkut.
BUKAN Pause, BUKAN Delete - data tidak ada yang hilang.

Kalau sesudah restart masih kambuh, mohon dicek juga di dashboard:
  Reports -> Database -> jumlah koneksi aktif vs batas maksimum

Kami tidak perlu akses masuk ke akun Kang Dedi, cukup restartnya saja.
Terima kasih banyak.
```

---

## 3. Sesudah Kang Dedi restart — langkah owner (berurutan)

1. **Pastikan benar-benar pulih**, jangan percaya satu percobaan (ia kedip!). Jalankan pengujian
   berulang minimal 20 kali; syarat lulus = **20/20 sukses**, bukan "sebagian besar sukses".
2. **Jalankan gerbang pra-rilis** `AGENTS.local.md` poin 6, urutannya jangan dibalik:
   `rm -rf .next` -> `npm run build` -> `npx tsc --noEmit` -> `npm test` -> cek nol berkas env.
3. Pada keluaran `npm run build`, **wajib** terbaca: `/playly` = `○ (Static)` **DAN** `/beranda`
   + `/discover` **tetap** `○ (Static)`. Kalau salah satu berubah jadi `ƒ (Dynamic)`, pekerjaan
   `254ce47` merugikan dan harus dibatalkan, bukan dilanjutkan.
4. Baru minta izin rilis, lalu dual push ke `origin` **dan** `dramaku`.

⚠️ **Jangan jalankan `npm run build ... | tail`** saat memeriksa gerbang. Pipa membuat exit code
yang terbaca adalah milik `tail` (selalu 0), sehingga build yang GAGAL terlihat seperti lulus.
Sudah menipu sekali di sesi 2026-09-19. Tulis ke berkas lalu baca `$?`-nya.
