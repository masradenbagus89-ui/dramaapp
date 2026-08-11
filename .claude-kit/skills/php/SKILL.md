---
nama: php
deskripsi: PHP/Laravel kelas industri — Eloquent aman (anti N+1/mass-assignment), validasi request, antrean, phpstan/pint.
divisi: stack
pemicu: [php, laravel, phpstan, laravel-pint]
rawan_keamanan: false
menggantikan: []
---

# Skill: PHP / Laravel — backend kelas industri

> **Kapan skill ini aktif:** **utama = deteksi config** — project punya `composer.json` / `artisan` / berkas `*.php` / `laravel/framework` di dependensi (§4.14 auto-detect). Teks "php/laravel/artisan/eloquent/composer" jadi pemicu sekunder. Skill ini paket-stack: tarik pas-ukuran saat menggarap kode PHP/Laravel, DI ATAS standar inti (§5/§8).
>
> 🙂 **Analogi:** Laravel sudah menyediakan banyak "satpam bawaan" (Eloquent, validasi, Policy). Tugas developer PAKAI jalur resmi itu, bukan bikin jalan pintas sendiri — jalan pintas yang bocor = pintu belakang toko yang lupa dikunci.

Skill ini **advisory** (§4.17): otak native yang memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = hasil keamanan yang tak boleh gagal apa pun caranya. Cara memanggil sesuatu dari Laravel bisa **berganti antar-versi** — cek perilaku **versi terpasang** (`composer.json`) sebelum menyalin contoh dari internet (§8.2 A3).

---

## 1. Kontrak (yang HARUS benar — 5 kebocoran khas aplikasi Laravel)

- 🔒 **HASIL — Input user TIDAK PERNAH sampai ke database sebagai potongan perintah SQL.** Tak ada celah SQL injection (= penyerang menitipkan perintah database lewat kolom isian).
- 🔒 **HASIL — Rahasia (kunci API, kredensial DB) tak pernah tampil** di browser, log, atau repo; halaman error produksi tidak membocorkan isi konfigurasi.
- 🔒 **HASIL — Pengguna hanya bisa membaca/mengubah data miliknya sendiri.** "Sudah login" TIDAK sama dengan "berhak" (IDOR = *Insecure Direct Object Reference* = ganti angka di URL, muncul data orang lain).
- 🔒 **HASIL — Pekerjaan latar yang terlanjur dijalankan dua kali TIDAK menghasilkan efek ganda** (email dobel, tagihan dobel, stok terpotong dua kali).
- 🔒 **HASIL — Berkas unggahan user tak bisa dieksekusi sebagai kode** dan tak bisa diambil orang yang tak berhak.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **Anti SQL injection:** pakai jalur resmi Laravel untuk menyentuh database — Eloquent (penerjemah bawaan antara baris tabel dan objek kode) atau query builder (perakit query bertahap). Keduanya otomatis parameterized (= nilai dikirim ke database TERPISAH dari perintahnya, jadi nilai tak pernah dibaca sebagai perintah). Terpaksa menulis SQL mentah → potongan mentahnya hanya yang KAMU tulis sendiri; nilai dari user WAJIB lewat binding parameter (titipkan nilainya sebagai isian, jangan disambung ke teks query). Nama helper SQL-mentah berbeda antar versi — cek dokumentasi versi yang terpasang.
2. 📐 **Cegah mass-assignment:** `$fillable` (daftar putih kolom) atau `$guarded` di tiap model — cegah user mengirim kolom yang tak boleh diisi (mis. `is_admin`). Jangan oper `$request->all()` mentah ke `create()`/`update()`.
3. 📐 **Validasi di pintu masuk data** pakai Form Request atau `$request->validate()` di controller — bukan diselipkan di tengah logika bisnis.
4. 📐 **Rahasia lewat `config()`, bukan `env()` langsung:** nilai rahasia dibaca lewat `config('layanan.kunci')`, BUKAN `env()` langsung di luar berkas `config/` — begitu cache konfigurasi jalan, `env()` di controller/model mengembalikan `null` dan fitur mati diam-diam. `.env` jangan di-commit; `APP_DEBUG=false` + `APP_ENV=production` sebelum tayang.
5. 📐 **Cache config & route di produksi:** nyalakan cache konfigurasi & route (`php artisan config:cache`, `route:cache`) supaya aplikasi lebih cepat siap melayani tiap permintaan. Gejala jebakan & pola konkretnya → §3 Powerful.
6. 📐 **Otorisasi ditulis di satu tempat** sebagai Policy/Gate (aturan "siapa boleh melakukan apa terhadap objek mana") dan benar-benar DIPANGGIL di tiap aksi — dari controller, atau lewat middleware (= lapisan pemeriksa yang dilewati permintaan sebelum masuk controller) yang menempel di route. Default-deny: tak ada aturan yang mengizinkan → tolak. Policy memeriksa KEPEMILIKAN (`$pesanan->user_id === $user->id`) atau peran, bukan sekadar "sesi ada".
   - 🗃️ LATAR: cara memanggil pemeriksaan otorisasi dari controller BERGANTI antar versi Laravel (versi baru memangkas isi controller basis, sehingga helper yang dulu otomatis tersedia kini harus dipasang sendiri). Cek dokumentasi versi yang tercatat di `composer.json` project ini — contoh lama dari internet bisa gagal, dan yang berbahaya: gagalnya bisa berupa pemeriksaan yang tak pernah jalan. Contoh anti-pola & pola benar → §3 Powerful.
7. 📐 **Blade auto-escape:** Blade (mesin template bawaan Laravel yang mencetak halaman HTML) otomatis meng-escape keluaran `{{ ... }}` — karakter HTML dijinakkan jadi teks biasa, bukan dijalankan. Sintaks keluaran-mentah `{!! ... !!}` MEMATIKAN pengaman itu; jangan dipakai untuk apa pun yang berasal dari user atau dari database. Butuh HTML kaya → bersihkan dulu lewat pustaka sanitasi (penyaring yang cuma meloloskan daftar tag yang diizinkan).
   - 🗃️ LATAR: satu `{!! $komentar !!}` cukup untuk menyisipkan skrip yang mencuri sesi pembaca lain — inilah XSS (= penyerang menitipkan program kecil yang ikut jalan di browser korban).
8. 🗃️ **LATAR — N+1** (satu halaman menembak ratusan query karena query dijalankan DI DALAM perulangan — 1 query mengambil 100 pesanan, lalu tiap pesanan memicu 1 query untuk nama pelanggannya → 101 query; gejalanya halaman makin pelan seiring data bertambah, dan hampir tak terlihat saat data uji cuma 5 baris) → 📐 **CARA BAKU:** eager-loading `with('relasi')` (ambil sekalian di awal), `withCount()` kalau cuma butuh jumlah; jangan query di dalam loop Blade.
   - 💡 SARAN: pasang pemantau query saat pengembangan — alat pencatat/penghitung query per-permintaan (mis. Laravel Debugbar, Telescope, atau `DB::listen()` yang mencatat ke log). Angka query per halaman = bukti, bukan tebakan.
   - 💡 SARAN: eager-loading berlebihan juga ada ongkosnya — `with()` yang menarik relasi tak terpakai menyedot ribuan baris ke memori. Muat yang dipakai halaman itu saja; batasi kolom (mis. `with('user:id,nama')`, sertakan kolom kunci relasinya) atau muat saat perlu.
9. 📐 **Antrean job idempoten:** pekerjaan lambat — kirim email, olah gambar, panggil API pihak luar, susun laporan — dititipkan ke antrean sebagai job (= satu tugas yang dicatat dulu lalu dikerjakan belakangan oleh proses lain), TIDAK dikerjakan sementara permintaan pengguna masih menggantung menunggu balasan. Tiap job ditulis idempoten (= diulang berapa kali pun hasil akhirnya sama): kunci pada ID yang stabil, cek "sudah pernah dikerjakan?" sebelum menimbulkan efek, dan batasi jumlah percobaan-ulang.
   - 🗃️ LATAR: worker (= proses pekerja yang mengambil job dari antrean lalu menjalankannya) MEMANG mengulang job yang gagal atau kehabisan waktu — itu perilaku normal antrean, bukan bug. Job yang tak tahan diulang = bom waktu.
10. 📐 **Worker antrean dijaga tetap hidup** dan menyala ulang otomatis saat mati — di server sendiri lewat pengelola proses (supervisor/systemd), di platform terkelola lewat proses worker terpisah dari proses web. Sesudah rilis kode baru, worker WAJIB dinyalakan ulang: proses lama masih memegang kode versi lama di memori. Resep antrean: `skills/background-job/SKILL.md`; menjaga proses hidup di server sendiri: `skills/vps/SKILL.md`; sisi rilis/platform: `skills/deploy/SKILL.md`.
11. 📐 **Simpan unggahan di penyimpanan privat** (folder yang tak dilayani langsung oleh web server, atau object storage = layanan penyimpan berkas terpisah seperti S3), jangan ditumpahkan apa adanya ke folder yang dilayani web server; akses lewat route yang memeriksa izin atau tautan bertanda-tangan berumur pendek. Validasi tipe berkas yang sebenarnya + ukuran maksimum; nama berkas dibuat ulang oleh sistem (jangan percaya nama kiriman). Resep lengkap: `skills/upload-storage/SKILL.md`.
12. 📐 **Migrasi terversion:** perubahan struktur database hanya lewat berkas migrasi terversion (berkas resep perubahan yang ikut masuk repo dan dijalankan lewat perintah migrasi `artisan`), BUKAN klik-klik di aplikasi pengelola database — kalau diklik manual, mesin server lain tak ikut berubah dan tak ada jejaknya. Aturan ketat (`NOT NULL`, `UNIQUE`, kunci asing) dipasang di level database, bukan cuma validasi di aplikasi: aplikasi bisa dilewati, database tidak. Tulis migrasi supaya aman dijalankan ulang, dan pastikan langkah pembalikannya benar-benar membalikkan.
13. 📐 **Tabel besar di produksi = bertahap, bukan sekali-tembak:** mengubah struktur tabel besar saat produksi berjalan JANGAN sekali-tembak (ganti-nama atau hapus kolom langsung) — pakai pola tambah-baru → pindahkan pemakai → hapus-lama. Langkah aman + tabel risiko + buku langkah pembalikan kalau gagal: `templates/SAFE_DATABASE_OPERATIONS.md`.
    - 🗃️ LATAR: pada sebagian mesin/versi DB, menghapus kolom membangun ulang tabel; di tabel besar itu berarti tabel terkunci dan situs berhenti melayani. Cek perilaku versi DB terpasang sebelum menjadwalkan.
14. 📐 **Rangkaian alat wajib:** pemasang dependensi `composer` dengan berkas kunci-versinya ikut masuk repo (berkas yang mengunci versi persis tiap pustaka, supaya semua mesin memasang yang sama), analisis statis `phpstan`/`larastan` (pemeriksa yang membaca kode tanpa menjalankannya dan menemukan kesalahan tipe/logika lebih awal), perapi format `pint`/`php-cs-fixer`, dan tes `phpunit`/`pest`. Semua dijalankan otomatis di server pemeriksa bersama saat kode masuk — bukan cuma di laptop satu orang, karena "di laptopku lulus" bukan bukti.
    - 💡 SARAN: naikkan level ketat analisis statis bertahap (mis. satu tingkat per rilis) daripada memasang level tertinggi lalu mematikan ratusan aturan — melemahkan konfigurasi mutu supaya tampak "hijau" itu dilarang (§12).
    - 💡 SARAN: pastikan nama paket persis ada di daftar paket resmi PHP (Packagist) sebelum memasang dependensi baru — nama yang mirip-tapi-beda satu huruf adalah jalur masuk kode jahat.

---

## 3. Powerful — 2 pola siap-adaptasi (jangan disalin mentah)

🧪 **CONTOH KASUS (cache produksi, melengkapi §2 butir 5):** setelah cache konfigurasi dinyalakan, mengubah `.env` TIDAK berefek sampai cache dibangun ulang — gejalanya "kunci API sudah diganti tapi sistem masih pakai yang lama". Masukkan bangun-ulang cache ke skrip rilis.
- 🗃️ LATAR: cache route menolak route yang memakai closure (= fungsi tanpa nama yang ditulis langsung di berkas route) karena bentuk begitu tak bisa disimpan ke berkas cache — pindahkan ke controller. Gejalanya perintah cache gagal dengan pesan soal serialisasi; baca pesannya, jangan matikan cache-nya.

🧪 **CONTOH KASUS (otorisasi/IDOR, melengkapi §2 butir 6):** `Pesanan::findOrFail($id)` lalu langsung ditampilkan = bocor. Yang benar: ambil lewat relasi milik user (`$request->user()->pesanan()->findOrFail($id)`) ATAU panggil Policy sebelum menampilkan.

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

Jawab dengan bukti `berkas:baris` (tak bisa jawab → belum selesai):
- [ ] Tiap query ke database lewat Eloquent/query builder (bukan string SQL mentah tanpa binding); tak ada nilai user disambung langsung ke teks query?
- [ ] Tiap model punya `$fillable`/`$guarded`; tak ada `$request->all()` mentah masuk `create()`/`update()`?
- [ ] Validasi input pakai Form Request/`$request->validate()` di pintu masuk, bukan di tengah logika bisnis?
- [ ] Rahasia dibaca lewat `config('...')` (bukan `env()` di luar `config/`); `.env` tak ter-commit; `APP_DEBUG=false` di produksi?
- [ ] Skrip rilis membangun ulang `config:cache`/`route:cache` setiap deploy?
- [ ] Otorisasi (Policy/Gate) benar-benar DIPANGGIL di tiap aksi sensitif, default-deny, cek KEPEMILIKAN bukan cuma sesi ada (uji IDOR: ganti ID di URL → tetap tertolak)?
- [ ] Tak ada `{!! ... !!}` untuk data dari user/database tanpa sanitasi?
- [ ] N+1 dicegah — `with()`/`withCount()` dipakai, tak ada query di dalam loop Blade?
- [ ] Job antrean idempoten (kunci ID stabil + cek "sudah dikerjakan?"); worker direstart pasca rilis kode baru?
- [ ] Berkas unggahan disimpan di storage privat + tipe/ukuran divalidasi + nama dibuat ulang sistem?
- [ ] Perubahan struktur DB lewat migrasi terversion (idempotent + reversible); tabel besar pakai tambah-baru→pindah→hapus-lama?
- [ ] `composer.lock` ter-commit; `phpstan`/`larastan` + `pint`/`php-cs-fixer` + `phpunit`/`pest` lulus di CI (bukan cuma laptop)?

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan = baca kode + `Grep` + menalar, JANGAN jalankan migrasi/SQL yang mengubah data live.

---

## 5. Definition-of-Done (kapan skill PHP/Laravel dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** input tak bisa jadi SQL, rahasia tak bocor, otorisasi per-resource jalan (anti-IDOR), job antrean idempoten, upload aman.
- [ ] **Edge case** ditangani: input kosong/nilai aneh (validasi tolak), user mencoba akses resource milik orang lain (403/404), job dijalankan ulang oleh worker (tak dobel efek), cache config dinyalakan lalu `.env` diubah (cache dibangun ulang di rilis), migrasi dijalankan ulang (idempotent), tabel besar diubah saat produksi jalan (bertahap, ada jalan mundur).
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Rangkaian alat (`composer`, `phpstan`/`larastan`, `pint`/`php-cs-fixer`, `phpunit`/`pest`) lulus di server pemeriksa bersama (CI) — bukan cuma "di laptopku lulus"; `composer.lock` di-commit.
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** — "selesai" = terbukti (tes lulus, keluaran dilihat), bukan "sudah kutulis".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 🗃️ **Keamanan web lintas-bahasa** (CSRF = korban tanpa sadar mengirim perintah ke situs tempat dia login, kontrol akses rusak, kripto lemah) → `skills/owasp/SKILL.md` — wajib dibaca sebelum menyentuh kontrak login/bayar. Isi §2 di atas cuma sisi khas PHP-nya, tidak mengulang isi rak itu.
- 📐 **Login/sesi/cek-izin mendalam** (RBAC = *Role-Based Access Control*, IDOR mendalam) → `skills/auth/SKILL.md`.
- 📐 **Kalau yang dibangun API** (kontrak, status code, amplop respons) — jangan dirancang ulang di sini → `skills/backend/SKILL.md`.
- 📐 **Kerja latar/antrean** (resep lengkap) → `skills/background-job/SKILL.md`. **Menjaga proses worker hidup di server sendiri** → `skills/vps/SKILL.md`. **Sisi rilis/platform** → `skills/deploy/SKILL.md`.
- 📐 **Penyimpanan berkas unggahan** (resep lengkap) → `skills/upload-storage/SKILL.md`.
- 📐 **Operasi database aman** (ubah struktur tabel produksi, tabel risiko, rollback) → `templates/SAFE_DATABASE_OPERATIONS.md`.
- 🗃️ **LATAR — rak asal skill ini:** `skills/php/SKILL.md`.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** data user & integritas transaksi (pesanan, saldo, hak akses). **Mode-gagal khas:** SQL injection lewat query mentah, mass-assignment lewat `$request->all()`, IDOR (Policy tak dipanggil / helper otorisasi berubah antar-versi), rahasia bocor lewat `env()` setelah cache jalan, XSS lewat `{!! !!}`, job antrean terulang dan bikin efek dobel, berkas unggahan dieksekusi sebagai kode. **Mitigasi:** Eloquent/query builder + binding parameter, `$fillable`/`$guarded`, Form Request, `config()` bukan `env()`, Policy/Gate default-deny, Blade auto-escape, job idempoten, storage privat + validasi tipe/ukuran.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** keamanan & mutu aplikasi Laravel; **tidak menggantikan** review keamanan mendalam untuk auth/pembayaran (buka `skills/owasp/SKILL.md`) maupun load-testing untuk skala tinggi. Cara memanggil otorisasi dari controller dan nama helper SQL-mentah **berganti antar versi Laravel** — cek dokumentasi versi yang tercatat di `composer.json` project ini, jangan salin contoh lama dari internet mentah-mentah (§8.2 A3).

🙂 **Non-Programmer:** Laravel sudah membawa banyak "satpam bawaan" — pakai jalur resminya, jangan jalan pintas mentah. Sebelum tayang: matikan mode-bocor (`APP_DEBUG`), simpan kunci rahasia di brankas, dan pasang penjaga "siapa boleh melihat data siapa" (Policy), karena sudah-login belum tentu berhak. Pekerjaan lama seperti kirim email jangan membuat pelanggan menunggu di depan loket — titipkan ke petugas belakang (antrean), dan pastikan petugas itu tak mengirim surat yang sama dua kali. Perubahan struktur database di jam ramai diperlakukan seperti renovasi toko yang masih buka: bertahap, dan selalu ada jalan mundur.
