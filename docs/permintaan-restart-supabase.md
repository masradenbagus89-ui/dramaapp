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

> **DIPERBARUI 2026-10-24.** Versi September digantikan: sekarang ada angka yang
> diukur LANGSUNG dari database (`pg_stat_activity`), bukan lagi dugaan. Angka
> itu mengubah permintaannya — restart cuma meredakan sementara, yang dibutuhkan
> adalah menaikkan plafon koneksi.

```
Kang, mohon bantuannya untuk project Supabase dramaapp:

  Project ref : nvblmpkwyzbpdbshyvzw
  Pooler      : aws-1-ap-southeast-1.pooler.supabase.com

Hari ini (24 Oktober) database project ini DUA KALI tidak bisa dihubungi.
Yang pertama sekitar 20 menit lalu pulih sendiri; yang kedua sedang
berlangsung saat surat ini ditulis.

ANGKA YANG KAMI UKUR LANGSUNG DARI DATABASE (bukan dugaan):

  koneksi aktif    : 51
  max_connections  : 60

Jadi 85% jatah koneksi terpakai dalam keadaan normal. Tidak ada ruang
untuk lonjakan, dan begitu penuh semuanya ikut tersendat.

BUKTI PENDUKUNG:

1. Memanggil REST API langsung dengan service_role key (tanpa lewat
   aplikasi, tanpa Next.js, cuma curl) membalas:
      HTTP 522 - Connection timed out (halaman error Cloudflare)
   Artinya Cloudflare sehat tapi tidak bisa menghubungi database di
   belakangnya. Terjadi di KEDUA gangguan hari ini.

2. Menyambung langsung ke Postgres (port 5432) ditolak dengan:
      FATAL: remaining connection slots are reserved for roles with
             the SUPERUSER attribute
   Ini pesan Postgres saat jatah koneksi untuk pengguna biasa HABIS.

3. Status resmi Supabase saat itu: "All Systems Operational".
   Jadi ini spesifik project ini, bukan gangguan Supabase global.

4. Pola kedip-kedip: dalam satu sesi pengujian, 8 dari 8 permintaan
   sukses di bawah 1,3 detik; beberapa menit kemudian 5 dari 5 gagal
   dengan timeout 12,5 detik.

YANG KAMI MOHON, berurutan:

  (a) SEKARANG - Project Settings -> General -> Restart project
      Melepas sambungan yang tersangkut. BUKAN Pause, BUKAN Delete,
      data tidak ada yang hilang. Ini meredakan, tapi tidak menyelesaikan.

  (b) SELANJUTNYA - naikkan plafon koneksi
      Reports -> Database -> lihat koneksi aktif vs batas.
      Dengan 51/60 terpakai, gangguan ini akan terus kambuh berapa kali
      pun di-restart. Menaikkan compute size menaikkan max_connections.

  (c) KALAU (b) tidak memungkinkan - mohon beri tahu kami
      Kami siapkan pemindahan dramaapp ke project Supabase sendiri supaya
      tidak lagi berebut koneksi dengan project lain di akun Kang Dedi.

CATATAN: aplikasi kami hanya menyentuh schema `dramaapp`, dan seluruh
objeknya dimiliki role creative_raden. Kami tidak menyentuh schema tim lain.
Kami juga tidak perlu akses masuk ke akun Kang Dedi.

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
