# DramaKu — Kenalan dengan Dashboard-nya

> Halaman ini untuk Anda yang baru pertama kali melihat dashboard DramaKu.
> Dashboard = ruang kendali di balik layar. Penonton melihat situsnya; Anda yang
> mengelola melihat ruangan ini.
>
> Isinya dua bagian: **apa yang sudah bisa dipakai hari ini**, dan **apa yang
> sedang disiapkan**.

---

## Bagian 1 — Yang sudah bisa Anda pakai hari ini

### 1. Isi Otomatis dari Kode Film

**Masalah.** Menambah satu judul berarti mengetik ulang belasan hal: judul, tahun
rilis, sinopsis, genre, durasi, negara, bahasa, sutradara, penulis, pemain, jumlah
episode, plus mencari poster yang layak. Sepuluh menit per judul, dan itu kalau
tidak ada yang salah ketik. Dua orang mengisi judul yang sama bisa menghasilkan dua
data yang berbeda.

**Solusi.** Anda cukup menempelkan satu kode film (kode IMDb — nomor identitas resmi
yang dimiliki hampir semua film dan serial, bentuknya seperti `tt19869990`). Klik
sekali, dan seluruh kolom terisi sendiri lengkap dengan poster dan gambar spanduk.
Sistem bahkan sudah tahu ini film atau serial, lalu menyesuaikan formulirnya sendiri.
Anda tinggal melihat pratinjaunya dan menekan "Pakai".

**Manfaat.** Pekerjaan sepuluh menit menyusut jadi belasan detik. Salah ketik tahun
atau salah tulis nama pemain praktis hilang, karena tidak ada yang diketik manual.
Untuk tim: siapa pun yang bertugas hari itu menghasilkan data yang seragam — kualitas
katalog tidak lagi bergantung pada siapa yang mengisi.

---

### 2. Rapikan Video Sekali Klik

**Masalah.** File video datang dengan nama semaunya: `Video PM 1.mp4`, `ep01 fix
final.mp4`, `Episode 3 REVISI.mp4`. Supaya bisa diputar rapi berurutan, semuanya
harus dinamai ulang satu per satu, lalu dihitung manual ada berapa episode. Untuk
serial 40 episode ini pekerjaan setengah jam yang membosankan — dan satu nomor yang
terlewat berarti ada episode yang tidak bisa ditonton, biasanya baru ketahuan setelah
penonton komplain.

**Solusi.** Taruh file apa adanya di folder judulnya, lalu tekan satu tombol di
dashboard: **🪄 Scan & auto-hardlink**. Sistem merapikan penamaannya sendiri secara
berurutan, menghitung jumlah episodenya, dan melaporkan hasilnya ke layar Anda. Kalau
folder ternyata belum siap, ia mencoba merapikannya dulu lalu menghitung ulang —
tanpa Anda perlu menyentuh apa pun.

**Manfaat.** Menambah satu serial baru jadi urusan menit, bukan jam. Episode yang
"hilang" karena salah nama tidak terjadi lagi. Dan yang penting untuk pemilik usaha:
pekerjaan ini tidak lagi menuntut orang yang paham komputer — siapa pun yang bisa
menyalin file ke folder bisa melakukannya.

---

### 3. Simpan, Langsung Tayang

**Masalah.** Di banyak situs, menambah satu judul berarti menunggu situsnya
"dibangun ulang" dulu — proses beberapa menit yang harus dijalankan orang teknis.
Artinya setiap perubahan kecil menumpuk di antrean, menunggu orang yang tepat sedang
tidak sibuk.

**Solusi.** Klik **Simpan drama**, judul itu langsung ada di situs saat itu juga.
Daftar di dashboard ikut menyegarkan dirinya sendiri, jadi Anda melihat hasilnya
tanpa memuat ulang halaman.

**Manfaat.** Anda bisa menaikkan judul yang sedang ramai dibicarakan hari itu juga,
bukan besok. Tidak ada lagi ketergantungan pada "orang teknis yang lagi online". Salah
tulis sinopsis? Perbaiki, simpan, beres dalam sepuluh detik.

---

### 4. Penjaga Video Bermasalah

**Masalah.** Kadang sebuah video tercatat sudah masuk — judulnya ada, durasinya ada,
sampulnya cantik — padahal file aslinya tidak pernah sampai utuh (biasanya unggahan
putus di tengah). Dari sisi pengelola semuanya tampak normal. Yang menemukan
masalahnya justru penonton: mereka klik, dapat layar hitam, lalu pergi. Anda baru tahu
setelah ada yang mengeluh — atau tidak pernah tahu sama sekali.

**Solusi.** Sistem memeriksa sendiri apakah file sebuah video benar-benar ada sebelum
menyodorkannya ke penonton. Yang belum lengkap otomatis tidak ditampilkan, dan di
dashboard ia diberi tanda merah **"belum siap"** beserta langkah perbaikannya. Satu
hal yang sengaja dirancang hati-hati: kalau sistem sedang *tidak yakin* — misalnya
sambungan sedang terganggu — video tetap ditampilkan. Ragu tidak boleh berubah jadi
"sembunyikan semuanya", karena itu justru bisa mengosongkan seluruh halaman video
gara-gara gangguan sesaat.

**Manfaat.** Penonton tidak pernah bertemu layar hitam, jadi mereka tidak punya alasan
untuk kapok. Anda mengetahui masalahnya dari dashboard, bukan dari kolom komentar.
Untuk sebuah layanan berlangganan, ini selisih antara penonton yang bertahan dan
penonton yang hilang diam-diam.

---

### 5. Lampu Status Sambungan Video

**Masalah.** Sebagian video datang dari mitra penyedia video. Kalau sambungan ke
mitra itu putus, halaman video di situs jadi kosong — dan satu-satunya cara
mengetahuinya adalah membuka situs Anda sendiri sebagai pengunjung, lalu menebak-nebak
apa penyebabnya.

**Solusi.** Di halaman depan dashboard ada satu kartu status: **Tersambung**, **Belum
diatur**, atau **Gagal tersambung** — lengkap dengan jam pengecekan terakhir dan
tombol cek ulang. Kunci rahasia milik mitra tidak pernah ikut dikirim ke layar; ia
tinggal di server dan tidak bisa dibaca dari browser siapa pun.

**Manfaat.** Lima detik untuk tahu semuanya sehat, tanpa keluar dari dashboard. Kalau
ada yang mati, Anda tahu duluan — sebelum penonton pertama menyadarinya. Dan rahasia
kerja sama Anda dengan mitra tetap tersimpan rapat.

---

### 6. Dompet Koin — Cara Mendapat Uang dari Tontonan

**Masalah.** Menagih penonton di muka membuat kebanyakan orang pergi sebelum sempat
suka. Tapi menggratiskan semuanya berarti tidak ada pemasukan sama sekali. Membangun
sistem penjualan sendiri biasanya berarti proyek berbulan-bulan.

**Solusi.** DramaKu sudah punya sistem koinnya sendiri, meniru pola yang dipakai
aplikasi drama besar: **tiga episode pertama gratis**, sisanya dibuka dengan koin.
Penonton mendapat koin lewat tiga jalan — menonton iklan berhadiah, absen harian, atau
membeli paket mulai Rp5.000 lewat QRIS/e-wallet. Ada pengaman yang layak disebut: koin
hasil pembelian hanya ditambahkan setelah pihak pembayaran mengonfirmasi uangnya
benar-benar masuk, bukan saat penonton menekan tombol di HP-nya. Jumlah iklan
berhadiah per hari juga dibatasi supaya tidak ada yang memanen koin gratis tanpa
henti.

**Manfaat.** Tiga sumber pemasukan sekaligus dari satu situs — iklan, penjualan koin,
dan perhatian penonton yang datang gratis dulu. Penonton mencoba tanpa risiko, jadi
pintu masuknya lebar. Anda tidak kehilangan uang karena celah pembayaran palsu. Dan
seluruhnya bisa dimatikan lewat satu saklar kalau suatu saat Anda ingin
menggratiskan semuanya.

---

### 7. Banyak Pengelola, Satu Pintu Terkunci Dua Lapis

**Masalah.** Cara paling umum adalah satu akun dipakai ramai-ramai, kata sandinya
beredar di grup chat. Ketika seseorang keluar dari tim, kata sandi itu ikut keluar
bersamanya — dan tidak ada yang tahu siapa mengubah apa.

**Solusi.** Setiap pengelola punya akunnya sendiri, ditambah atau dicabut dari dalam
dashboard dalam hitungan detik. Di atasnya ada lapis kedua: kode 6 angka dari
aplikasi authenticator di HP (kode yang berganti tiap 30 detik). Orang yang mencuri
kata sandi Anda tetap tidak bisa masuk tanpa HP di tangannya.

**Manfaat.** Anggota tim keluar? Cabut satu akun, selesai — tidak perlu mengganti kata
sandi semua orang. Untuk perusahaan, ini juga soal tanggung jawab: setiap akses punya
pemilik yang jelas. Dan pengaman lapis kedua ini adalah standar yang sama dengan yang
dipakai bank dan layanan besar.

---

### 8. Papan Ringkasan Katalog

**Masalah.** "Kita sekarang punya berapa judul? Berapa yang posternya belum ada?
Kategori mana yang terlalu banyak, mana yang kosong?" Tanpa alat, jawabannya harus
dihitung manual dari daftar panjang — jadi biasanya tidak pernah dihitung, dan
keputusan diambil berdasarkan perasaan.

**Solusi.** Begitu dashboard dibuka, empat angka besar langsung menyambut: total
judul, total episode, total penonton, dan berapa judul yang posternya sudah ada
(ditulis sebagai perbandingan, misalnya 22/25). Di bawahnya ada grafik batang
sederhana: sebaran judul per kategori, terurut dari yang terbanyak.

**Manfaat.** Anda tahu isi katalog dalam sekali lihat, tanpa bertanya siapa pun.
Grafik kategori langsung menunjukkan celah yang bisa diisi — kalau satu kategori
kosong padahal peminatnya ada, itu peluang yang terlihat hari itu juga. Dan angka
"berposter" menyelamatkan Anda dari kekecewaan penonton: judul tanpa poster jarang
diklik.

---

### 9. Ruang Iklan Milik Sendiri

**Masalah.** Bergantung pada jaringan iklan pihak ketiga berarti menerima iklan apa
pun yang mereka kirim — termasuk yang tidak pantas muncul di sebelah konten Anda —
sambil membagi hasilnya.

**Solusi.** Anda memasang iklan sponsor sendiri langsung dari dashboard: gambar,
tautan tujuan, dan judulnya. Setiap iklan dicatat berapa kali tampil dan berapa kali
diklik.

**Manfaat.** Anda bisa menjual ruang iklan langsung ke pengiklan lokal dengan harga
Anda sendiri, tanpa perantara yang memotong. Angka tampil dan klik itu juga alat jual
Anda saat menawarkan slot berikutnya — sponsor membayar lebih tenang kalau ada
bukti angkanya.

---

### Yang mengawasi semuanya diam-diam

Di belakang layar ada **402 pemeriksaan otomatis** yang dijalankan setiap kali ada
perubahan — semuanya lulus saat dokumen ini ditulis (6 September 2026). Ini bukan
fitur yang Anda klik, tapi inilah alasan penambahan fitur baru tidak diam-diam
merusak yang lama. Setiap kali ada masalah yang pernah lolos ke penonton, sebuah
pemeriksaan baru dipasang supaya masalah yang sama tidak bisa kembali.

---

## Bagian 2 — Yang sedang disiapkan

### Sudah masuk rencana kerja

**A. Video pindah ke gudang awan**
Saat ini sebagian video tinggal di sebuah komputer penyimpanan yang harus tetap
menyala. Kalau komputer itu mati atau tertidur, video ikut berhenti. Rencananya video
dipindah ke penyimpanan awan berbayar (sekitar Rp22 ribu per bulan untuk 100 GB).
*Untungnya:* situs tetap hidup 24 jam tanpa bergantung pada satu komputer di ruangan
mana pun — dan Anda berhenti mengkhawatirkan listrik padam.

**B. Komputer video yang menyala sendiri**
Selama gudang awan belum terpasang, langkah antaranya: komputer penyimpanan
menyiapkan dirinya sendiri setiap kali dinyalakan, dan dicegah tertidur.
*Untungnya:* tidak ada lagi ritual buka-aplikasi-teknis setiap habis mati listrik.

**C. Sinopsis otomatis berbahasa Indonesia**
Sinopsis yang terisi otomatis dari kode film sekarang masih berbahasa Inggris,
sehingga harus diterjemahkan manual. Ini akan dibuat otomatis.
*Untungnya:* satu-satunya pekerjaan mengetik yang tersisa di alur "tambah judul"
akhirnya ikut hilang.

**D. Bintang penilaian muncul di hasil pencarian Google**
Penilaian dari penonton sudah dikumpulkan, tapi belum ditampilkan ke Google.
*Untungnya:* hasil pencarian yang menampilkan bintang kuning lebih sering diklik
daripada yang hanya berupa teks — pengunjung gratis bertambah tanpa biaya iklan.

**E. Bisa dipasang di layar HP + pemberitahuan episode baru**
DramaKu akan bisa "dipasang" ke layar depan HP seperti aplikasi biasa, tanpa perlu
mengunduh dari toko aplikasi, lalu bisa mengirim pemberitahuan saat ada episode baru.
*Untungnya:* penonton kembali dengan sendirinya. Ikon di layar HP dan satu
pemberitahuan jauh lebih murah daripada terus membayar iklan untuk memanggil orang
yang sama.

**F. Satu pintu penjagaan untuk seluruh halaman pengelola**
Saat ini beberapa halaman dashboard dijaga dengan cara yang sedikit berbeda satu sama
lain. Semuanya akan disatukan lewat satu penjaga.
*Untungnya:* semakin sedikit variasi, semakin kecil peluang ada satu pintu yang
terlupa dikunci saat fitur baru ditambahkan.

### Usulan yang menunggu keputusan Anda

Dua hal berikut belum masuk jadwal — saya mengusulkannya, dan Anda yang memutuskan
apakah layak dikerjakan:

**G. Laporan pemasukan di dashboard**
Sekarang dashboard menghitung katalog (judul, episode, penonton), tapi belum
menghitung uang. Bisa ditambahkan ringkasan koin terjual, pemasukan per periode, dan
performa tiap iklan sponsor.
*Untungnya:* Anda tahu judul mana yang benar-benar menghasilkan, bukan sekadar yang
paling banyak ditonton — dua hal yang sering ternyata berbeda.

**H. Kelola komentar dari dashboard**
Penonton sudah bisa berkomentar, tapi pengelolaannya belum tersedia di dashboard.
*Untungnya:* komentar kasar atau spam bisa dibersihkan sebelum merusak suasana, dan
itu penting begitu jumlah penonton naik.

---

## Satu catatan jujur

Perbaikan terakhir (**Penjaga Video Bermasalah**, nomor 4) sudah selesai dikerjakan
dan sudah lulus seluruh pemeriksaan, tapi **belum tayang** di alamat publik
`dramaapp.vercel.app`. Penyebabnya bukan teknis melainkan izin akses: komputer yang
mengerjakan hanya punya izin baca ke tempat penyimpanan kode yang dipantau situs
produksi. Perbaikannya aman tersimpan dan siap dinaikkan begitu izin tulis diberikan
— setelah itu ia langsung aktif tanpa pekerjaan tambahan.
