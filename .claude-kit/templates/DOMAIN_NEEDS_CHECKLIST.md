# DOMAIN_NEEDS_CHECKLIST.md — Pemantik pertanyaan per-jenis-aplikasi

> Versi 1 · 2026-07-12 · Dipakai oleh alur Aplikasi-Utuh (`rules/4.2c-full-app.md`).
>
> **Fungsi:** memancing kebutuhan yang **sering terlupa** saat non-programmer minta bikin aplikasi — hal yang seorang analis senior akan tanyakan, tapi staff awam tak tahu harus menyebutnya.
>
> ⚠️ **BUKAN jaminan kelengkapan (WAJIB dibaca AI):** daftar ini = **pemantik**, bukan "kalau semua ini kena berarti lengkap/aman". AI WAJIB selalu menutup dengan *"Ada kebutuhan lain di luar daftar ini?"* dan TIDAK PERNAH mengklaim daftar ini lengkap (§8.2 Aturan 3b — non-programmer tak bisa mendeteksi daftar tak-lengkap). Aditif di atas standar inti, bukan pengganti.
>
> **Cara pakai (AI):** cocokkan domain → tampilkan pertanyaan relevan bahasa awam → catat jawaban ke Konfirmasi Lingkup + Peta Aplikasi. Domain di luar daftar → pakai penalaran + standar inti + tanya langsung.

---

## 🛒 Kasir / Point-of-Sale (POS)
- **Uang:** pembulatan (hindari pecahan sen aneh)? mata uang tunggal/multi? PPN/pajak dipisah atau termasuk?
- **Transaksi:** metode bayar (tunai/QRIS/kartu/utang)? kembalian? diskon/promo/kupon? split bill?
- **Stok:** kurangi stok otomatis? apa yang terjadi saat 2 kasir menjual barang sama bersamaan (stok minus)? retur/void transaksi?
- **Struk:** cetak fisik (printer termal)? kirim digital? nomor urut struk?
- **Operasional:** shift kasir (buka/tutup kas)? peran kasir vs admin? multi-outlet/cabang?
- **Jejak:** audit trail (siapa jual/void/kasih diskon, kapan)?

## 🛍️ Toko Online / E-commerce
- **Produk:** varian (ukuran/warna)? foto banyak? stok per-varian? harga coret/promo?
- **Keranjang & checkout:** akun pembeli vs beli-sebagai-tamu? simpan keranjang? ongkos kirim (per-wilayah/kurir)?
- **Pembayaran:** gateway apa (Midtrans/Xendit/Stripe)? konfirmasi otomatis (webhook)? anti bayar-dobel?
- **Pesanan:** status (bayar→kemas→kirim→selesai)? lacak resi? pembatalan/refund?
- **Kepercayaan:** ulasan produk? stok "tinggal sedikit"? kebijakan retur?
- **SEO (halaman publik):** halaman produk ter-index Google? schema `Product`+`Offer`? judul unik per-produk?

## 🔐 Auth & Manajemen User
- **Masuk:** email+password? login sosial (Google)? OTP/magic-link? ingat-saya?
- **Keamanan:** lupa-password (token kadaluarsa)? verifikasi email? batas percobaan login (anti brute-force)? sesi diputar saat login (anti pembajakan sesi)?
- **Peran:** cuma user biasa, atau ada admin/moderator (RBAC)? siapa boleh apa?
- **Akun:** ubah profil? hapus akun (+ data — UU PDP)? blokir/nonaktif user?

## 📅 Booking / Reservasi
- **Jadwal:** slot waktu? kapasitas per-slot? zona waktu? cegah double-booking (2 orang rebut slot sama)?
- **Aturan:** minimal/maksimal jauh-hari? pembatalan (batas waktu + biaya)? reschedule?
- **Notifikasi:** konfirmasi + pengingat (email/WA)? ke pemilik & pemesan?
- **Pembayaran:** DP/lunas di depan? refund saat batal?

## 📝 Konten / Blog + SEO
- **Konten:** editor (rich text/markdown)? draft vs terbit? jadwal terbit? kategori/tag?
- **SEO:** slug bersih? meta title/description per-artikel? sitemap? schema `Article`? gambar dengan alt?
- **Interaksi:** komentar (+ moderasi anti-spam)? share sosial (OG preview)? terkait/rekomendasi?
- **Multi-penulis:** peran penulis vs editor? siapa boleh terbitkan?

## 📊 Dashboard / Alat Internal (SaaS/admin)
- **Data:** tabel besar (sort/filter/cari **di server**, paginasi)? ekspor (CSV/Excel/PDF cetak)?
- **Tampilan:** grafik (pakai skill `dataviz`)? filter tersimpan di URL (bisa di-share/bookmark)? rentang tanggal?
- **Akses:** peran (siapa lihat data apa)? multi-tenant (data antar-perusahaan tak bocor — RLS)?
- **Aksi:** aksi massal? konfirmasi untuk aksi merusak (§5)? audit siapa-ubah-apa?

## 💳 Pembayaran (lintas-domain — sering jadi irisan sendiri)
- **Integrasi:** gateway apa? sandbox dulu sebelum live?
- **Keandalan:** webhook konfirmasi (verifikasi tanda-tangan)? **idempoten** (1 pembayaran tak diproses 2×)? apa yang terjadi kalau user tutup browser setelah bayar?
- **Uang:** simpan angka uang dengan tipe tepat (jangan `float`)? mata uang? pajak/biaya admin?
- **Legal:** invoice/faktur? kebijakan refund? simpan bukti transaksi?
> Untuk pembayaran, AI WAJIB baca `skills/pembayaran/SKILL.md` (resep idempoten + webhook aman) — ini menutup salah satu kondisi GENTING-rilis (§4.6).

## 🎰 Judi / Industri Teregulasi (regulated — cek legalitas yurisdiksi DULU)
- **Legalitas:** negara/yurisdiksi mana yang dilayani? sudah/akan punya **lisensi** judi di sana? (ini menyetir semua yang lain)
- **Wilayah:** geo-blocking negara terlarang (mis. Indonesia)? andalkan sinyal server (IP + KYC), bukan pilihan negara di browser (gampang dipalsukan)?
- **Bahasa & pasar:** UI dibangun bahasa apa dulu (mis. Indonesia) lalu diterjemahkan ke pasar tujuan? (bahasa ≠ negara target — legalitas dari geo-block/lisensi)
- **Pemain:** verifikasi umur + KYC (unggah identitas asli) sebelum main/deposit? batas umur sesuai yurisdiksi (18/21)?
- **Judi bertanggung jawab:** batas deposit/taruhan? self-exclusion (pemain kunci akunnya sendiri)? pengingat lama main? tautan bantuan kecanduan?
- **Uang & AML:** simpan uang tipe tepat (bukan `float`)? pantau pola pencucian uang (AML)? webhook bayar idempoten?
- **Integritas & jejak:** hasil game adil (RNG teruji/provably-fair)? audit-trail transaksi (siapa/apa/kapan) untuk regulator?
> Untuk judi/industri teregulasi, AI WAJIB baca `skills/kepatuhan-teregulasi/SKILL.md`. **Boleh dibangun untuk yurisdiksi yang melegalkan** — rambu di atas = saran kuat; batas keras = jangan bantu melanggar hukum. Pack ini **bukan nasihat hukum**: tinjauan legal + lisensi resmi tetap WAJIB sebelum online.

---

> **Domain lain** (marketplace, LMS, chat/realtime, IoT, dll) belum di daftar ini → AI pakai standar inti + penalaran + tanya langsung ke staff. Owner boleh menambah bagian domain baru di berkas ini kapan saja.
