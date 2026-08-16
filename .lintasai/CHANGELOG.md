# Changelog

Semua perubahan signifikan ke kit ini didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/),
dan kit ini mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## Label spesial (auto-detect oleh `npx lintasai update`)

- **[BREAKING]** - Ada perubahan tidak backward-compatible. Wajib baca migration notes.
- **[SCAN-REQUIRED]** - Wajib regenerate `docs/` project: minta AI baca ulang struktur repo & perbarui catatan project (mis. `docs/architecture.md`).
- **[SECURITY]** - Perbaikan KEAMANAN. Pasang SEGERA walau update kecil — **urgensi, terpisah dari ukuran** (bisa nempel di tingkat mana pun). Tool `npx lintasai update` tampilkan peringatan merah "pasang SEGERA".

Tanpa label, update aman: `docs/` user TIDAK perlu di-scan ulang.

## Disiplin penomoran versi (semver) — WAJIB saat rilis

Versi = `BESAR.MENENGAH.KECIL`. Saat owner/AI menaikkan versi:
- **Perbaikan kecil** (typo, fix, Tier 1) → naikkan **KECIL**: `1.7.5 → 1.7.6`
- **Fitur/aturan baru** backward-compatible (Tier 2) → naikkan **MENENGAH**: `1.7.x → 1.8.0`
- **Breaking** (`[BREAKING]`, Tier 3) → naikkan **BESAR**: `1.x → 2.0` — **WAJIB**, jangan sembunyikan breaking di angka kecil/menengah.

> **Kenapa:** staff non-programmer sering cuma melihat NOMOR. Kalau breaking nyelip di angka kecil, mereka kira aman → kaget. **Angka BESAR yang JARANG naik = sehat** (jarang merusak user); yang dihindari bukan angka besar, tapi sering-breaking. Aturan inti penomoran: semver kit (resep rilis: `docs/RESEP_PERUBAHAN.md`).

---

## [Unreleased]

## [8.0.0] - 2026-08-11

### ⚠️ BREAKING — berkas override project berganti nama

`AGENTS.override.md` → **`AGENTS.local.md`**. Perpindahannya OTOMATIS saat `npx lintasai update`: isi
disalin utuh, berkas lama dicadangkan bertimestamp, lalu dibuang. **Kalau kamu merujuk nama lama di
dokumen atau catatan tim sendiri, perbarui rujukannya.**

**Kenapa harus berganti — ini bug yang paling merugikan di seluruh kit:** dokumentasi resmi OpenAI Codex
menyatakan ia memeriksa `AGENTS.override.md` **lebih dulu** dan memuat **paling banyak satu berkas
per-folder**. Karena installer menerbitkan keduanya di akar project, **client Codex memuat berkas isian
dan MELEWATI kernel aturan** — nol Bahasa Indonesia, nol anti-mengarang, nol pengaman-hapus. Tanpa pesan
error, dan `doctor` malah bilang "OK". Nama baru tidak diklaim Codex, jadi kernel kembali termuat.

**Pertukarannya, apa adanya:** setelah pindah, Codex tak lagi memuat berkas override secara otomatis.
Kernel (pagar keselamatan) menang atas override (preferensi) — dan kernel kini membawa satu baris yang
menyuruh AI membaca `AGENTS.local.md`, jadi isinya tetap sampai. Di Cursor, override malah disisipkan
langsung ke berkas aturannya.

### Ditambah

- **Loop kerja AI kini berhenti di BUKTI, bukan di keputusan.** Langkah `4.5 PUTUSKAN` dipecah jadi
  **`4.5 KERJAKAN` + `4.6 BUKTIKAN`**, dan rantainya jadi lingkaran: rak yang ternyata meleset → balik
  buka rak yang benar; temuan baru → balik pahami. Sebelumnya verifikasi menumpang di langkah yang
  namanya berarti "mengambil keputusan" — tertulis wajib, tapi terbaca opsional.
- **AI memilih panduan dari BERKAS yang akan disentuh, bukan dari tebakan kalimatmu.** Kamu wajar saja
  salah menyebut bidang ("halaman profil" yang ternyata menyentuh API + data pribadi). Sebelum edit
  pertama AI mencocokkan ulang lewat berkas nyata; kalau bidangnya lain, ia balik membaca panduan yang
  benar DULU. Berlaku juga untuk fitur BARU yang berkasnya belum ada. Batasnya ditulis terus terang:
  bidang yang kerusakannya kelihatan di layar (tampilan, SEO) memang tak dipetakan — daftar kosong
  bukan berarti aman.
- **Pekerjaan yang kamu LIHAT ditutup dengan langkah klik.** Misalnya "buka /produk → klik Beli → harus
  muncul Pesanan diterima". Bukti teknis (tes hijau, `exit 0`) membuktikan ke AI sendiri; langkah klik
  yang membuktikan ke KAMU, tanpa perlu paham kode.
- **Satu tawaran "naik kelas" setelah pekerjaan terbukti** — maksimal 1, hanya usulan, tak pernah
  dikerjakan tanpa izinmu. Kenapa: panduan kit itu LANTAI (standar minimum). Client yang belum paham
  teknis tak tahu apa yang mungkin, jadi tanpa dorongan ini lantai diam-diam berubah jadi plafon.
- **Palang Rem kategori RILIS PRODUKSI** — `vercel --prod`, `railway up`, `fly deploy`,
  `wrangler deploy`, `supabase db push`, dan `git push` ke `main`/`master`/`production` kini memunculkan
  dialog Setujui/Tolak. Preview tetap bebas. Kalibrasi: 21 perintah rilis tertangkap, 34 perintah aman
  (termasuk `echo "railway up"` dan `git push origin main-fitur`) nol alarm palsu.

  > **Batas yang jujur untuk `git push` — baca ini.** Kit juga memasang daftar izin yang memuat
  > `Bash(git push:*)` (perintah yang boleh AI jalankan tanpa bertanya). Mana yang menang kalau
  > keduanya berlaku — izin eksplisit atau dialog dari palang — **belum kami buktikan di lapangan**.
  > Jadi untuk `git push` saja, ada kemungkinan dialognya tidak muncul. Perintah deploy
  > (`vercel`/`railway`/`fly`/`wrangler`/`supabase`) **tidak** terpengaruh: tak satu pun ada di daftar
  > izin, jadi palangnya berdiri sendirian di sana. Kami menulis ini apa adanya daripada membiarkanmu
  > mengira `main` terkunci padahal belum tentu.
- **Rak BARU `email-transaksional`** 🔒 — divisi yang sebelumnya kosong total (nol SPF/DKIM/DMARC di
  seluruh kit). Menutup dua kegagalan yang tak terlihat di layar: email masuk spam, dan tautan reset
  password yang bisa ditebak.
- **`doctor` melaporkan paritas per-alat apa adanya** — termasuk peringatan kalau kernel tertutup di
  Codex, lengkap dengan cara membuktikan sendiri (`codex --print-instructions`) dan perintah perbaikannya.
- **Override project sampai ke Cursor** — pilihan stack yang kamu tulis kini benar-benar dipakai di sana
  (sebelumnya diabaikan total tanpa satu pun tanda).

### Diperbaiki — pengaman yang bisa mati tanpa pesan apa pun (2026-08-11)

- **⚠️ PALING PENTING — Palang Rem bisa MATI TOTAL di sebagian project, tanpa satu pun tanda.**
  Kalau `package.json` project kamu memuat setelan `"type": "module"` (dipakai banyak project modern),
  kedua pengaman berbasis hook — **Palang Rem** (dialog Setujui/Tolak untuk `rm -rf`, `DROP TABLE`,
  deploy produksi) dan **Lampu Hijau Plan Mode** — gagal dijalankan. Bukan "melemah": **tidak jalan sama
  sekali**, dan karena kegagalannya terjadi sebelum ia sempat memutuskan apa pun, perintah berbahaya
  **tetap lanjut**. Yang membuatnya sulit ketahuan: tak ada pesan error yang sampai ke layarmu, dan
  `npx lintasai doctor` tetap melapor palangnya "terpasang" — karena ia memeriksa apakah palangnya
  **terdaftar**, bukan apakah palangnya **jalan**. Perintah `npx lintasai` dari dalam folder kit juga
  ikut gagal di project yang sama.

  **Penyebabnya, sesederhana ini:** Node menentukan cara membaca berkas program dari setelan project
  **tempat berkas itu berada** — jadi berkas kit ikut aturan project kamu, bukan aturannya sendiri.
  Sekarang kit membawa penandanya sendiri, jadi ia tak lagi bergantung pada setelan siapa pun.
  Diperbaiki dengan menambah 2 berkas penanda kecil; **tak ada yang perlu kamu lakukan** selain update.

  **Sejak kapan bermasalah:** sejak palang ini ada (jauh sebelum v8.0.0) — bukan kerusakan baru di
  versi ini. Ditemukan lewat audit kesiapan rilis, dan **dibuktikan dengan menjalankannya sungguhan**
  di project tiruan, bukan disimpulkan dari membaca kode. Sekarang dikunci tes otomatis yang ikut
  memeriksa sisi sebaliknya (kalau penandanya hilang lagi, tesnya merah sebelum rilis).

### Diperbaiki — buku petunjuk yang menyesatkan + menit pertama sesudah pasang (2026-08-10)

- **⚠️ PENTING — README pernah menyuruhmu menaruh aturan project di tempat yang akan terhapus.**
  Jawaban lama: *"tulis di `AGENTS.md` root proyek"*. Padahal `AGENTS.md` itu milik kit dan **selalu
  ditimpa** tiap `npx lintasai update` — catatan timmu hilang (ada cadangan bertimestamp, tapi kamu tak
  akan tahu harus mencarinya). Tempat yang benar sejak dulu adalah **`AGENTS.local.md`**, yang dijamin
  tak pernah disentuh update. **Kalau kamu terlanjur menulis di `AGENTS.md`:** cari berkas
  `AGENTS.md.backup-<tanggal>` di akar project, pindahkan isimu ke `AGENTS.local.md`.
- **Client Codex tak lagi dikirim mengejar masalah yang sudah beres.** README v7 menulis bahwa
  `AGENTS.local.md` menutupi kernel dan `update` memperbaikinya. Kebalikannya yang benar: yang dulu
  menutupi kernel adalah nama LAMA `AGENTS.override.md`, dan `AGENTS.local.md` justru perbaikannya.
- **Peta kit (`PETA.md`) tak lagi salah menyebut isi `templates/`.** Ia menyatakan folder itu
  "di-deploy ke project" padahal sejak v6.0.0 panduan tinggal di satu tempat saja. AI yang menurut
  membaca peta lebih dulu akan mencari panduan di folder kosong lalu menyimpulkan kit rusak.
- **Tiga pesan di layar tak lagi menunjuk berkas yang tak ikut terkirim.** Dulu menyuruh "lihat
  `docs/risk-gate.md`" — folder itu memang sengaja tidak dikirim ke project kamu. Sekarang langkahnya
  ditulis langsung di pesannya.
- **Pemasang berhenti mencetak "lintasAI v1.x"** di versi 8.0.0. Angka versinya dicabut, bukan
  dinaikkan — pesan yang tak menyebut versi tak bisa basi lagi.
- **Pemasangan memeriksa dirinya sendiri.** Sesudah `npx lintasai init`, kit kini menjalankan
  pemeriksaan kesehatan otomatis dan menampilkan hasilnya: aturan sampai ke alat AI mana saja, palang
  mana yang nyala, berkas utuh atau tidak. Sebelumnya hanya `update` yang begitu — padahal pemasangan
  PERTAMA justru yang paling rawan mendarat di folder yang salah, dan kalau itu terjadi aturan tak
  pernah termuat **tanpa satu pun pesan error**. Perintahnya juga disebutkan supaya bisa kamu ulang
  kapan saja: **`npx lintasai doctor`**.
- **Panduan simpan-ke-git tak lagi melewatkan `CLAUDE.md`.** Perintah yang dicetak dulu cuma menyebut
  `AGENTS.md`, sehingga rekan setim yang meng-clone repo **tidak memuat aturan sama sekali** di Claude
  Code — gagal diam-diam, tanpa error. `CLAUDE.md` dan `AGENTS.local.md` kini ikut disebut.
- **Rangkuman pemasangan berhenti mengklaim hal yang tidak terjadi.** Ia sempat menulis *"kamu pilih
  Tidak / batal popup"* dan *"dilewati oleh user"* padahal di mode otomatis tak ada dialog yang pernah
  muncul dan tak ada yang pernah kamu pilih.
- **Robot keamanan CI (`secret-guard.yml`) tak lagi membeku di versi pemasangan pertama.** Dulu tiap
  perbaikan pola deteksi rahasia tak pernah sampai ke project yang sudah terpasang. Sekarang ia ikut
  disegarkan tiap update — **tapi hanya kalau berkasnya masih milik kit**; kalau kamu sudah
  mengeditnya, editanmu tetap aman dan tak akan disentuh.
- **Memasang ulang di atas kit lama tak lagi menimpa diam-diam.** Kalau kamu menjalankan
  `npx lintasai init` di project yang sudah punya kit, folder lamanya **dicadangkan lebih dulu** jadi
  `.lintasai.backup-<tanggal>`, lalu kit baru dipasang bersih. Dulu berkas ditimpa satu per satu tanpa
  cadangan, dan berkas versi lama yang sudah dicabut **tetap tertinggal bercampur** — kit jadi campuran
  dua versi tanpa kamu tahu. Cadangannya otomatis diabaikan git, jadi tak akan ikut ter-commit.
  Catatan: untuk pindah versi biasa, **`npx lintasai update` tetap lebih tepat** — ia juga membuang
  berkas usang dan memberi tahu kalau ada perubahan `[BREAKING]`.
- **`doctor` kini juga memeriksa pintu masuknya sendiri** (`bin/lintasai.js`). Sebelumnya berkas itu
  bisa hilang atau rusak dan doctor tetap melapor hijau.
- **Saran yang berputar-putar dihapus:** doctor sempat menyarankan `npx lintasai init` untuk folder
  `docs/` yang belum ada — persis perintah yang barusan kamu jalankan. Folder kosong di project baru
  memang normal, jadi statusnya turun jadi info biasa.

### Diubah — mac/Linux mendapat penjelasan, bukan error mentah (2026-08-10)

- Dulu `npm install` di mac/Linux gagal dengan `EBADPLATFORM` — error mentah npm, tanpa sebab dan tanpa
  jalan keluar, karena paketnya ditolak **sebelum** kode kit sempat bicara. Kit **tetap Windows-only**;
  yang berubah, penolakannya kini menjelaskan diri: sistem yang terdeteksi, kenapa belum didukung, dan
  dua cara yang bisa dipakai sekarang. Tidak ada perubahan apa pun bagi pengguna Windows.

### Diperbaiki

- **AI menemukan panduan yang tepat dari kalimat biasa.** Sebelumnya 9 kalimat wajar menghasilkan NOL
  panduan — `"write unit tests"`, `"prevent sql injection"`, `"accessibility audit"`, `"add dark mode"`,
  `"bikin webnya responsive"`, `"git push ke main"`, dan lainnya. Sekarang semuanya menemukan raknya.
  Mesin pencocoknya juga menerima bentuk jamak Inggris (`test` → `tests`), digerbangi panjang kata supaya
  tidak menimbulkan salah-tebak.
- **Rak frontend + 4 rak lain kini berisi contoh kode benar/salah**, bukan cuma daftar larangan.
- **Klaim yang tidak benar dicabut dari berkas yang dibaca client**: catatan bahwa `Grep` dihitung
  sebagai bukti membaca panduan (jalurnya tak pernah hidup), dan pernyataan "Cursor/Codex tidak punya
  sistem hook" (keduanya punya — palangnya yang belum kami pasang).
- **Berkas aturan Cursor yang dibuat otomatis kini diabaikan git** di sisi client (sebelumnya ikut
  ter-commit padahal komentarnya sendiri menyebut sebaliknya).
- Empat rujukan ke berkas yang tidak ada dibersihkan dari dalam kit (AI berhenti mengejar berkas hantu).


### Ditambah — rak BARU `email-transaksional` 🔒 (2026-08-09)

Divisi yang sebelumnya **kosong total**: grep 31 skill lama → nol kemunculan SPF/DKIM/DMARC, dan
`"kirim email verifikasi ke user"` menghasilkan nol rak. Dua kegagalan yang sama-sama tak terlihat di
layar: (1) email masuk folder spam — client tak pernah tahu, yang ia lihat cuma "pengguna saya sepi";
(2) tautan reset password yang bisa ditebak — akun pelanggan diambil alih tanpa satu pun tanda.

Isinya 4 pasangan contoh kode ❌ SALAH → ✅ BENAR: token reset acak-kriptografis **ter-hash**
sekali-pakai berkedaluwarsa · balasan "lupa password" seragam (anti pemetaan daftar akun) · host
tautan dari env bukan dari header permintaan · pengiriman lewat antrean, bukan di dalam permintaan
HTTP. Verifikasinya memakai bukti nyata: header `Authentication-Results` (`spf=pass dkim=pass
dmarc=pass`), bukan "emailnya masuk kok".

**Untuk non-programmer:** dua catatan DNS dan satu cara menyimpan tautan reset — dipasang sebelum
email pertama dikirim — mencegah pendaftar hilang diam-diam dan akun pelanggan dibajak.

### Ditambah — serapan banding `vercel-labs/agent-skills` (2026-08-09, ADR-039)

Hasil banding 3-juri vs repo skill resmi Vercel (lintasAI unggul tipis 7,9 vs 7,7 — menang
enforcement + kecocokan misi, kalah kepadatan contoh per halaman). Yang kalah, diserap:

- **63 pasangan contoh kode "❌ SALAH → ✅ BENAR" di SEMUA 13 skill rawan-uang/keamanan**
  (pembayaran, auth, wallet-ledger, supabase-prisma, owasp, dst) — AI kini MENIRU pola benar, bukan
  menerjemahkan prosa aturan. Dikunci robot preflight: skill 🔒 tanpa pasangan ber-kode = merah.
  **Untuk non-programmer:** buku panduan bagian uang kini berisi foto "begini yang salah / begini
  yang benar", bukan cuma teks peraturan.
- **Skill BARU `skills/react-native`** — aplikasi mobile Android/iOS (Expo): anti-crash khas HP,
  list mulus di HP kelas menengah, animasi hemat baterai, navigasi & UI terasa native. Kurasi 35+
  rule MIT Vercel, ditulis-ulang dua-register.
- **Serapan pola React/Next terpilih** ke `react-patterns` + `next-core`: anti boolean-prop menjamur
  → varian eksplisit · `children` > render-props · React 19 (`ref` prop, `use()`) · kebocoran state
  modul-bersama antar-request (data user A nongol di user B) · dedup serialisasi RSC.
- **Resep anti-halusinasi versi**: sebelum memakai API baru, AI wajib membuktikan API-nya ada di
  `node_modules` versi terpasang (grep) — 0 hasil = jangan pakai. Perpanjangan "no quote = no claim"
  ke dependensi.
- **Disiplin AI men-deploy** (`skills/deploy`): pra-cek keadaan CUMA-BACA sebelum aksi · matriks
  keputusan metode · daftar perintah ber-efek-samping tersembunyi (`vercel link --yes`, `vercel`
  polos) · **default PREVIEW — production hanya seizin owner verbatim**.
- **27 padanan pemicu Inggris di skill 🔒** ("data leak", "double charge", "webhook", "ddos",
  "postgres") + 16 tes routing campuran — prompt campur Inggris kini tetap membuka rak keamanan.
- **Palang Rak lebih adil**: membaca rak lewat `cat`/`Get-Content`/`head` kini IKUT dihitung
  tanda-terima (tetap berbasis pemanggilan tool, tak bisa di-bluff; `>` redirect tak dihitung).
  *(Koreksi 2026-08-09: baris ini semula ikut menyebut `Grep`. Itu keliru — matcher hook tak pernah
  memuat `Grep`, jadi jalur itu tak pernah hidup. Cabangnya sudah dicabut + dijaga tes paritas.)*
- **6 skill terbesar dipecah** jadi SKILL.md inti ringkas + `rujukan/` on-demand (supabase-prisma,
  backend, deploy, python, owasp, react-patterns) + guard ukuran anti-monolit-kambuh.
  **Untuk non-programmer:** buku tebal dipecah jadi bab inti + lampiran — AI hanya membuka lampiran
  yang relevan, kerja lebih cepat & murah.
- **Peta rak selalu-tampak untuk Cursor** (`.cursor/rules/lintasai.mdc` kini memuat tabel routing
  statis topik→rak dari registry) + matriks degradasi per alat AI yang jujur di README.

Yang SENGAJA DITOLAK dari Vercel (dicatat di ADR-039 + seksi LATAR skill terkait, supaya tak
diusulkan ulang): kompilasi AGENTS.md duplikat 112KB (sumber drift terbukti di repo mereka sendiri) ·
fetch aturan runtime dari internet (supply-chain) · 14 rule micro-optimization `js-*` · jalur deploy
upload-tanpa-auth · aktivasi tanpa enforcement · `react-view-transitions` (API canary).

### Ditambah — tahap "menggali kebutuhan" sebelum kode ditulis (serap `obra/superpowers` brainstorming)

- **Permintaan kebesaran dipecah bertahap** (`AGENTS.md` §4.1). Minta "kasir + laporan + absensi"
  sekaligus? AI tak lagi menyusun satu rencana raksasa — ia menawarkan urutan bertahap lalu mengerjakan
  tahap-1 sampai terbukti jalan.
  **Untuk non-programmer:** kontraktor tak lagi membuat satu gambar untuk tiga bangunan berbeda.
- **Dialog tak lagi mati setelah satu pertanyaan** (§4.1). Batas lama "maks 1× popup" diganti aturan
  anti-pengulangan: AI boleh bertanya lagi kalau muncul keputusan BARU yang mengubah hasil, dilarang
  mengulang yang sudah kamu jawab, dan dilarang menanyakan hal yang bisa ia jawab sendiri dengan
  membaca kode. Akibatnya keputusan penting tak lagi ditebak diam-diam.
- **Rencana wajib menyebut "Yang ikut tersenggol"** (§4.4). Sebelum kamu menyetujui, rencana harus
  menyebut fitur/halaman LAIN yang memakai kode yang akan disentuh — pakai nama yang kamu kenal
  ("halaman checkout"), lengkap dengan status penjaganya (sudah ada tes / belum).
  **Untuk non-programmer:** kamu menyetujui sambil melihat daftar risikonya, bukan cuma daftar
  keinginannya.
- **Rencana fitur baru menyinggung 5 hal**: alur pengguna · data apa disimpan & siapa boleh melihat ·
  apa yang kamu lihat kalau gagal · batas/skala · cara mengujinya. Bentuk bakunya di berkas contoh baru
  `templates/RENCANA.example.md`.
- **Sapu-cepat sebelum rencana diserahkan** (§4.4): sisa "TBD" · bagian yang saling bertentangan ·
  lingkup kelebaran · kalimat bermakna ganda — diperbaiki di tempat, sebelum sampai ke kamu.
- **Berkas contoh baru `templates/RENCANA.example.md`** — rumah TUNGGAL bentuk rencana (kapan wajib
  disimpan · path · baris INDEX · seksi wajib · contoh terisi).

### Ditambah — rencana kini SEUKURAN tugasnya (Tangga Bobot)

- **AI menakar berat tugas dulu, lalu menyebutkannya ke kamu 1 baris** (`AGENTS.md` §4.0). Ada 4 tingkat:
  **JAWAB** (cuma tanya-jawab, tak ada rencana) · **RINGAN** (1 berkas, bukan area berbahaya, maks 3
  langkah) · **SEDANG** (lebih dari 3 langkah, atau menyentuh kode yang dipakai fitur lain) · **BERAT**
  (login/bayar/data pribadi/skema database/rilis, fitur BARU, atau 3 subsistem sekaligus).
  **Untuk non-programmer:** dulu "ganti tulisan tombol" dan "bikin sistem pembayaran" sama-sama dijawab
  dengan rencana panjang lengkap dengan tabel. Sekarang yang kecil dijawab pendek, yang besar justru
  digarap lebih teliti (wajib pre-mortem + 5 kepala bahasan + dipecah bertahap).
- **Kamu bisa protes kalau AI salah takar.** Karena tingkatnya disebutkan di awal ("ini saya perlakukan
  sebagai tugas ringan, karena …"), kamu tinggal bilang "itu penting, seriusin" → AI naik tingkat.
  **Kenapa penting:** kamu tak perlu bisa baca kode untuk menilai apakah AI menggarapnya cukup serius.
- **Kalau AI ragu antara dua tingkat, ia WAJIB ambil yang lebih tinggi.** Salah menganggap ringan bisa
  merusak diam-diam; salah menganggap berat cuma bikin lebih lama — jadi arah amannya sengaja ke atas.
- **Tingkat mengatur PANJANG jawaban, bukan mutunya.** Pagar yang tak pernah dilonggarkan di tingkat mana
  pun: keamanan · anti-ngarang · Bahasa Indonesia non-programmer · "selesai = terbukti, bukan diklaim".

### Diubah

- **"Mode Hemat (Lean Mode)" dicabut dari `AGENTS.override.md` — fungsinya kini OTOMATIS.** Dulu ia
  checkbox yang bisa kamu centang untuk "task rutin cepat + irit token". Kenyataannya: **mencentangnya
  tidak mengubah apa pun**, karena berkas yang berisi aturan perilakunya sudah ikut terhapus di
  perampingan sebelumnya, dan tak ada penggantinya. Sekarang janji itu ditepati tingkat **RINGAN** di
  atas — jalan sendiri, tanpa perlu dicentang siapa pun.
  **Untuk non-programmer:** tombol yang tidak tersambung ke apa-apa akhirnya dilepas, dan fungsinya
  dipasang permanen. Kalau di project-mu checkbox itu masih ada, biarkan saja — berkas itu memang milikmu
  dan tak pernah ditimpa; mencentang atau tidak, hasilnya sekarang sama-sama benar.
- **Pengingat plan mode jadi bertingkat.** Dulu ia menuntut hal yang sama untuk semua tugas ("WAJIB ada
  seksi …") — sekarang tuntutan itu menempel di tingkat yang sesuai. Seksi "Yang ikut tersenggol" muncul
  mulai tingkat SEDANG, 5 kepala bahasan mulai tingkat BERAT.
- **Aturan penyimpanan rencana tak lagi kembar.** Dulu ditulis hampir sama persis di kernel §4.4 DAN di
  `skills/cek-permintaan`; sekarang rinciannya tinggal di `templates/RENCANA.example.md` dan keduanya
  merujuk ke sana. **Kenapa:** dua salinan pasti menyimpang — menambah satu seksi berarti menulis dua kali.
- **Pengingat plan mode diselaraskan dengan aturan.** Ia dulu menyuruh AI memakai istilah "Pindai Cepat"
  yang **tidak ada** di berkas aturan client, jadi AI mengarang prosedurnya sendiri. Istilah itu dicabut;
  sebagai gantinya kernel §4.4 kini mendefinisikan format pasangan 2-versi yang memang dipakai.
- **Kit berhenti mengurusi kunci-gabung (branch protection) / wajib-review repo client.** Panduan akhir
  installer kini polos "Panduan simpan ke git" (`git add` + `git commit`) tanpa nasihat cek/pasang
  branch protection (`engine/setup-interactive.mjs` + `engine/setup-summary.mjs`), dan skill `devops`
  butir 7 tak lagi menyuruh memasang "wajib PR + 1 approval" di GitHub. **Kenapa:** proteksi `main` +
  aturan review adalah setelan repo client sendiri — client yang punya sudah mengaturnya; kit yang ikut
  mengatur = dobel komando. Kebiasaan sehatnya tetap: branch per task + self-review + dilarang skip hook.
  **Untuk non-programmer:** kunci pintu rumahmu tetap kuncimu sendiri — kit tak lagi ikut menyuruh-nyuruh
  soal kunci itu, cukup memberi tahu cara menyimpan hasil pemasangan.

### Dihapus — [BREAKING] audit muatan client: buang yang tak berguna (−10% ukuran kiriman)

- **Robot backup harian `backup-schemas.yml` dicabut total.** Sisa fitur tim "schema per staff" yang
  sudah lama dicabut; tanpa 3 secret yang hampir tak pernah diset, ia bikin tanda MERAH di GitHub
  client TIAP HARI, langkah cleanup-nya masih TODO, dan ia menyuruh menaruh kunci penembus RLS di
  GitHub Secrets. Salinan di project lama dibersihkan otomatis saat `npx lintasai update` (hanya
  kalau belum kamu edit — kalau sudah, dibiarkan + diberi tahu). Backup DB: fitur backup/PITR bawaan
  Supabase + `templates/SAFE_DATABASE_OPERATIONS.md`.
  **Untuk non-programmer:** alarm rumah yang butuh baterai khusus — baterainya tak pernah dipasang
  siapa pun, jadi alarmnya bunyi error tiap pagi. Dicabut; rumahmu sudah punya pengaman bawaan.
- **3 perintah CLI kembar dicabut:** `setup` (= `init`), `diff` (jawabannya sudah ada di `doctor`
  yang lebih lengkap + bertanda-tangan), `check-update` (= `update --check-only`). Bendera usang
  `uninstall --force` juga dicabut — pakai `--allow-modified`. Skrip/kebiasaan yang memakainya
  tinggal ganti ke padanannya.
- **Baris "Tier setup" di `status` + bendera `--skip-team-files` dicabut** — keduanya membaca/melewati
  hal yang sudah tidak ada sejak fitur tim dicabut (`.staff-profile.md` tak pernah dibuat siapa pun).
- **`templates/UPDATE_GUIDE.md` dicabut** (17 KB): tak pernah ditunjuk aturan/skill mana pun, isinya
  menduplikasi README dan masih mengajarkan alur split-repo + kernel lama yang sudah dicabut.
- **Riwayat CHANGELOG v3.0.0–v5.0.0 diarsipkan** ke repo kit (`docs/CHANGELOG-ARSIP.md`) — yang
  terkirim ke client tinggal heading + ringkasan + baris berlabel yang dibaca mesin update. Sekalian
  menutup celah lama: label [BREAKING] v4.0.0/v5.0.0 dulu hanya di blockquote yang TIDAK terbaca
  pemindai rentang → kini diberi penanda body (preseden v1.9.0), jadi client lompat-versi tetap
  dapat banner peringatan.
- **PETA.md ramping untuk client:** seksi "aturan penempatan berkas baru" + "peta lain" (instruksi
  MAINTAINER: folder `tools/`, `tests/`, `docs/` yang client tak punya) pindah ke repo kit
  (`docs/penempatan-berkas-baru.md`). AI client tak lagi disuruh membuka berkas yang tidak ada (§2.1).
- **`SECURITY.md` pindah ke akar repo GitHub** (rumah yang benar — GitHub kini menampilkan Security
  policy); ringkasan anti-typosquat + cara lapor tetap ada di README kit.
- **3 berkas contoh dev pindah ke `tests/fixtures/`** (contoh kartu project + 2 contoh setting hook):
  nol pemakai di sisi client — kartu project asli DI-GENERATE kode, hook dipasang otomatis.
- **~120 baris blok CLI uji-banding era migrasi PowerShell dihapus** dari pustaka engine + baris-baris
  `.gitignore` yang mustahil berlaku di lokasi barunya.
  **Untuk non-programmer:** total kiriman kit ke project-mu menyusut ~10% (1,34 MB → 1,20 MB) tanpa
  satu pun fitur berkurang — yang dibuang memang tak pernah bisa kamu pakai.

### Diperbaiki

- **Daftar izin-otomatis plan mode dibersihkan** (`engine/plan-mode-gate.js`). Empat nama perintah yang
  sudah dicabut sejak v6.0.0 (`preflight`, `env-keys`, `unicode-check`, `plan-scout`) masih terdaftar di
  sana — menyesatkan pembacanya. Hanya **dihapus**, tak ada nama baru ditambahkan (daftar itu memberi
  izin tanpa bertanya, jadi menambah = melebarkan izin).

### Penjaga baru

- `tests/kernel-plan-rules.test.mjs` — mengunci aturan tahap-awal **dua arah**: (1) aturannya masih ada
  di kernel; (2) berkas contoh rencana benar-benar DIRUJUK dari kernel dan dari `cek-permintaan`. Arah
  (2) mencegah berkas contoh itu jadi "barang gudang" yang terkirim tapi tak pernah dipakai.

---

## [7.0.0] - 2026-07-27

> **[BREAKING] Ringkasan rilis:** folder kit di project kamu berganti nama dari **`.claude-kit/`**
> jadi **`.lintasai/`**. **Fungsi kit TIDAK berubah sama sekali** — cuma namanya. Kamu **tidak perlu
> melakukan apa pun**: jalankan `npx lintasai@latest update` dan semuanya dipindahkan otomatis.

### Kenapa diganti

Nama `.claude-kit` menyesatkan. Folder itu produk **lintasAI**, tapi namanya menyiratkan milik
Claude/Anthropic — apalagi ia duduk bersebelahan dengan `.claude/` (folder asli Claude Code). Banyak
staff mengira folder itu bagian dari Claude Code lalu takut menyentuhnya.

Nama baru tetap **diawali titik** dan **huruf kecil semua**, dua-duanya disengaja:
- **Titik di depan** = folder perkakas, tetap tersembunyi. Kit ikut ter-commit ke repo, jadi tanpa
  titik ~500 berkasnya akan muncul di tiap diff PR + ikut dibaca ESLint/tsc/pemindai rahasia project.
- **Huruf kecil semua** = aman di Linux/Docker. `lintasAI` dan `lintasai` dianggap sama di
  Windows/macOS tapi **beda** di Linux — salah ketik lolos di laptop lalu gagal di server.

### Yang dilakukan update secara OTOMATIS

1. Ganti nama folder `.claude-kit/` → `.lintasai/` (**pindah nama saja**, isi tak disentuh, tak ada
   berkas yang dihapus).
2. Arahkan ulang **4 hook** di `.claude/settings.json` (Palang Rem, Palang Rak, Lampu Hijau Plan
   Mode, pengingat bahasa) ke folder baru. **Hook & pengaturan milikmu sendiri TETAP UTUH.**
3. Tulis ulang path di catatan-pasang (`.install-manifest.json`) + **segel dibuat ulang**, supaya
   `doctor`, `uninstall`, dan `rollback` tetap mengenali berkas kit.
4. Tambah pola `.gitignore` untuk folder baru (rahasia kit tetap terlindungi dari commit).
5. Perbarui berkas aturan Cursor (`.cursor/rules/lintasai.mdc`).
6. Segarkan isi kit supaya kodenya menunjuk folder yang benar.

### Yang PERLU kamu lakukan (opsional, tak mendesak)

Kalau `AGENTS.override.md` atau `.gitignore`-mu menyebut `.claude-kit/`, ganti sendiri jadi
`.lintasai/`. **Sengaja tidak kami ubah** — dua berkas itu milikmu dan kit berjanji tak pernah
menimpanya. Update akan menyebutkan nama berkasnya kalau memang ada.

### Kalau update BERHENTI (semuanya aman, nol berkas disentuh)

- **"Ada DUA folder kit sekaligus"** — ada `.claude-kit/` dan `.lintasai/` berdampingan (sisa migrasi
  yang terputus). Kami tidak menebak mana yang benar. Cek isi keduanya, simpan yang kamu mau, hapus
  yang satunya, lalu ulangi.
- **"dijalankan DARI DALAM folder itu sendiri"** — jalankan `npx lintasai@latest update` dari akar
  project, bukan dari dalam folder kit (di Windows folder yang sedang dipakai proses tak bisa
  di-rename).
- **"Gagal mengganti nama folder"** — ada editor/terminal yang membuka berkas di folder itu. Tutup VS
  Code / terminal di sana lalu ulangi. Kit kamu tidak berubah.

### Perbaikan lain yang ikut di rilis ini

- **[SECURITY]** Hook penjaga rahasia pre-commit kini **di-refresh** kalau isinya basi. Sebelumnya
  cek idempoten hanya melihat penanda, jadi hook yang sudah terpasang **membeku di versi install
  pertama selamanya** — tiap perbaikan pemindai rahasia tak pernah sampai ke pemasangan lama. Efek
  nyatanya: pengecualian folder kit jadi basi → alarm-palsu tiap update → staff terlatih memakai
  `git commit --no-verify`.
- Nama folder kit kini punya **satu sumber kebenaran** (`engine/project-root.mjs`), bukan
  di-hardcode di 118 berkas. Perubahan lokasi kit berikutnya tak lagi berisiko "satu tempat terlewat
  lalu gagal diam-diam".
- Update & uninstall tetap mengenali folder bernama **lama**, jadi pemasangan yang belum dimigrasi
  tidak pernah ditolak.

### Ditambahkan

- **Tugas besar dengan kalimat biasa kini diarahkan ke rak yang benar — cakupan terukur naik 19/48 →
  35/48, dan tugas BERAT dari 5/16 jadi 16/16.** Uji-jalan 48 prompt natural khas client
  (ringan/sedang/berat): hanya 19 yang dapat rak — dan 6 rak rawan-keamanan (`admin-panel`,
  `anti-fraud`, `kepatuhan-teregulasi`,
  `rate-limiting`, `realtime`, `wallet-ledger`) praktis tak terjangkau karena pemicunya jargon semua.
  Ditutup dengan **±60 frasa awam baru** di 14 skill: "transaksi gak boleh **salah hitung**" →
  `wallet-ledger` · "fitur **chat antar** user" / "aplikasi **ojek online**" → `realtime` · "batasi biar
  orang **gak spam**" → `rate-limiting` · "**halaman admin** buat **kelola produk**" → `admin-panel` ·
  "**akun palsu**" → `anti-fraud` · "simpan **rekam medis** pasien" / "**multi cabang** datanya
  **kepisah per** toko" → `database` · "**double booking**" / "**laporan penjualan**" → `backend` ·
  "**aplikasi kasir**" → `pembayaran` · "diakses 10 **ribu orang** bareng" → `caching` · "pindah ke
  **server baru**" → `devops` · "integrasi **ai chatbot**" → `permukaan-ai`. Dua rak yang dulu YATIM
  (nol pemicu awam + nol jaring path) ikut dicabut status yatimnya: `deploy` ("**hosting mana** yang
  cocok") dan `react-patterns` ("tampilannya **gak ikut berubah**", "**harus refresh dulu**").
  Semua dikunci 25 tes routing positif + 14 probe ANTI-FP baru.
- **Frasa pemicu ber-SPASI kini toleran kata sisipan (maks 2).** "takutnya **data bocor**" sudah
  tertangkap, tapi "**data** pelanggan saya **bocor** gak ya" lolos — mesin menuntut kata bersebelahan,
  padahal client menyisipkan kata di tengah frasa. Kontrak baru bagi penulis pemicu: **spasi = frasa
  kalimat (longgar)**, **tanda-hubung = istilah majemuk (tetap ketat persis seperti sebelumnya)** —
  melonggarkan yang ber-tanda-hubung terukur menghasilkan 20+ salah-nyala di rak keamanan, jadi sengaja
  tidak dilakukan. Pencocokan lama dijamin superset (nol cakupan hilang); 4 pemicu ber-spasi yang rawan
  sisipan (`aman-tidak`, `aman-belum`, `izin-tool`, `keamanan-skill`) diketatkan jadi tanda-hubung.
- **Berkas server saldo/buku-besar kini dipalang.** `wallet-ledger` = rak 🔒 yang salah-hitungnya paling
  senyap, tapi tak punya satu pun jalur path — kini `src/lib/wallet.ts`, `services/ledger.ts` dsb.
  menahan edit pertama sampai raknya dibaca. Murni aditif (entri di urutan terakhir peta): nol path
  lama yang berubah rak, komponen tampilan (`.tsx`) sengaja tetap bebas.
- **Tes ujung-ke-ujung install → routing.** Selama ini tes install hanya memeriksa wiring (string di
  settings.json) dan tes routing memakai registry tiruan 1-skill — rantai `install → registry 30 skill
  asli → hook nyata` tak pernah diuji utuh. Kini hook `lang-reminder` TERPASANG dijalankan sungguhan
  dengan prompt natural atas hasil install nyata; putusnya rantai mana pun langsung merah.

### Diperbaiki

- **Dua salah-nyala yang mengikis kepercayaan pada tanda 🔒 dicabut.** "tolong ganti warna tombol
  **daftar** jadi biru" (murni ganti warna) menyalakan 🔒 `auth`, dan "**gambar** produknya lama
  munculnya" (keluhan performa) menyalakan `owasp` — keduanya dari kata telanjang `daftar`/`foto`/
  `gambar` di pemicu. Dicabut dan diganti frasa (`daftar-akun`, `form-pendaftaran`, `pendaftaran-member`,
  `bikin-akun`; `foto-profil` tetap) — cakupan pendaftaran akun & unggah yang sah tetap dijaga tes.
  Bonus: FP lama "bikinkan halaman daftar pesanan" → auth ikut hilang.
- **Pemicu `rekam-medis`/`data-pasien` sengaja dirutekan ke `database`, BUKAN `kepatuhan-teregulasi`** —
  rak kepatuhan ber-scope judi/fintech berizin (KYC + AML + geo-block); menyodorkan checklist itu ke
  aplikasi kesehatan = arahan yang salah total. Data sensitif multi-penyewa memang rumahnya `database` 🔒.

- **Pertanyaan keamanan dengan kalimat biasa kini menyalakan standar keamanan web.** Sebelumnya "aman
  gak sih webku", "cek keamanan", "periksa apakah ada yang bocor" menghasilkan NOL rak — standar
  keamanan hanya terbuka kalau kamu mengetik istilah teknis (`owasp`, `xss`) yang justru tak dikenal
  non-programmer. 11 frasa natural ditambahkan ke pemicu `skills/owasp`.
- **Berkas pengaturan AI kini otomatis membuka rak Permukaan-AI.** Saat AI hendak menyunting
  `.claude/settings.json`, `.mcp.json`, `.cursor/mcp.json`, `.claude/hooks/` atau `.claude/agents/`
  (mis. ketika kamu minta "pasangin MCP dong"), Palang Rak menahan sampai `skills/permukaan-ai` dibaca —
  **tanpa kamu perlu mengetik istilah apa pun**.
- **Penjaga rahasia mengenali 5 jenis kunci baru:** OpenAI project (`sk-proj-`), xAI, Google/Gemini,
  Stripe live, dan GitHub fine-grained PAT — di hook pre-commit **dan** pemeriksa CI sekaligus.
- **Standar "kode rapi" diperkuat 4 aturan baru yang berlaku di SETIAP sesi** (`AGENTS.md` §3.6–§3.9) —
  hasil gabungan bagian terbaik dari dua standar coding eksternal (ECC + Willey Labs), ditulis ulang
  Bahasa Indonesia non-programmer: (1) fungsi kecil satu-tugas & satu level abstraksi, argumen menumpuk
  dibungkus jadi objek; (2) **fungsi tak boleh berbohong** — dilarang efek-samping tersembunyi di luar
  yang dijanjikan namanya, dan yang mengubah data jangan sekaligus jadi sumber jawaban; (3) dua kebiasaan
  buruk tersering dibereskan — percabangan bertumpuk jadi keluar-lebih-awal, angka ajaib jadi konstanta
  bernama; (4) wasit saat prinsip bentrok — yang paling sederhana menang, KECUALI melawan kebenaran atau
  keamanan. **Kenapa di kernel, bukan jadi skill baru:** aturan ini berlaku untuk semua jenis pekerjaan,
  jadi ia harus ikut tiap sesi — skill hanya terbuka kalau kata pemicunya kebetulan disebut, dan kalimat
  khas client non-programmer ("bikin aplikasi kasir buat warung") tak menyebut satu pun istilah teknis.
- **`skills/backend` menambah 2 pola perawatan kode:** jangan merantai panggilan menembus banyak lapis
  (Law of Demeter) dan `switch` berulang atas tipe yang sama boleh diringkas jadi tabel/factory —
  keduanya SARAN, bukan paksaan (cabang tunggal yang pendek tetap lebih jelas ditulis biasa).
- **Keluhan error & "aplikasiku jangan ikut mati" dengan kalimat biasa kini menyalakan rak yang benar.**
  Uji-jalan router atas 6 kalimat khas client: 1 benar, 2 separuh, **3 menghasilkan NOL rak**. Isi raknya
  sudah lengkap — labelnya yang salah: `skills/tahan-gagal` BERJUDUL "tahan-banting" tapi pemicunya cuma
  menulis "tahan-gagal", jadi rak itu tak bisa ditemukan dengan namanya sendiri. 9 frasa natural
  ditambahkan (`tahan-banting`, `ikut-mati`, `lagi-down`, `gagal-terus`, `sering-gagal`, `bahasa-robot`,
  `enak-dibaca`, `jadi-kosong`, `daftar-pesanan`) → sekarang **6 dari 6 mendarat benar, nol yang kosong**.
  Semuanya sengaja FRASA 2-kata, bukan kata telanjang: `down` ikut menyala di "drop down", `mati` di
  "mati lampu", `lemot` di keluhan performa — ketiganya dikunci probe ANTI-FP.
- **`skills/backend` menyerap inti penanganan error kelas industri:** (1) tentukan KELAS error sebelum
  menulis `catch` — gagal-dunia-nyata ditangkap, bug kode sendiri JANGAN ditangkap (menangkapnya lalu
  lanjut jalan = proses hidup dengan keadaan rusak, kerusakannya merembet ke data); (2) 🔒 error yang
  dibungkus WAJIB mengikat asalnya (`{ cause: e }`, padanan `from e` di Python) — tanpa itu penyebab
  aslinya hilang permanen dari log; (3) catat penuh **sekali** di boundary, bukan berlapis tiap lapis;
  (4) `requestId` wajib ikut di respons error supaya user bisa menyebutkan kodenya ke support;
  (5) 400 & 500 akhirnya dijelaskan, 429 dapat `Retry-After`, dan 422-vs-400 tak lagi ambigu.
- **Ketahanan panggilan layanan luar dapat 3 pagar baru** di `skills/tahan-gagal`: retry cuma di SATU
  lapis (retry 3× bertumpuk di 3 lapis = **27× beban** ke layanan yang sedang sekarat), anggaran waktu
  total harus muat di batas request user, dan saat saklar-pemutus terbuka sajikan data cache terakhir
  yang ditandai kesegarannya (`stale-if-error`) — bukan layar error kosong.
- **Pemantauan produksi (`PRODUCTION_OBSERVABILITY.md`) dapat jaring terakhir:** `unhandledRejection`/
  `uncaughtException` di Node (catat lalu restart bersih, **bukan** lanjut jalan) dan `error`/
  `unhandledrejection` di browser — tanpa ini satu `kirimEmail()` yang lupa di-`await` gagal tanpa satu
  baris log pun. Plus 🔒 pagar PII di payload Sentry (`sendDefaultPii: false` + `beforeSend`), verifikasi
  source map, dan sub-bab metrik ambang yang selama ini dijanjikan 7 rak tapi isinya nol.

### Diperbaiki

- **`skills/permukaan-ai` kini menyebut pola bahayanya secara spesifik**, bukan "pola khas penyedia
  tertentu" yang memaksa AI menebak sendiri daftarnya. Ditambah kategori yang sebelumnya tak diperiksa:
  hook ber-interpolasi `${...}` (nama berkas buatan penyerang berubah jadi perintah), hook keamanan yang
  dibungkam (`2>/dev/null`, `|| true` — penjaganya kelihatan terpasang tapi selalu meloloskan), MCP
  `autoApprove`/`npx -y`, dan berkas agen berakses tool berlebihan. Disertai catatan terverifikasi:
  hook dijalankan langsung sebagai subprocess, **bukan** tool-call, jadi ia melewati `engine/risk-gate.js` —
  karena itu hook wajib ketahuan lewat pembacaan.
- **Batas jujur dipertegas:** "permukaan AI bersih" TIDAK berarti aplikasinya aman dari peretas.
- **Contoh Server Action di `skills/next-core` melanggar aturannya sendiri.** Blok itu dilabeli
  "memenuhi 🔒 HASIL" padahal melempar error izin telanjang (`throw new Error("Forbidden")`) — persis
  yang `skills/backend` larang, karena error izin yang dilempar tanpa penangkap keluar sebagai **500**
  ("server rusak") padahal maksudnya **403** ("kamu tak berhak"). Kini mengembalikan amplop respons baku.
- **Template yang dipasang ke project kamu tak lagi membocorkan pesan error mentah ke layar.**
  Contoh `error.tsx` di `STACK_GUIDE.md` menampilkan `{error.message}` — isinya bisa memuat pesan SQL,
  path folder, atau nama kolom internal. Kini kalimat awam + kode kejadian (`digest`) yang bisa
  dicocokkan di log. Ditambah `global-error.tsx` beserta jebakannya: `error.tsx` TIDAK menangkap error
  dari `layout` di segment yang sama, dan tanpa `global-error.tsx` root layout yang gagal = layar putih total.
- **Contoh kode coba-ulang di `skills/tahan-gagal` tak bisa dijalankan** — ia memanggil `isRetriable()`
  yang tak pernah didefinisikan di mana pun. Kini predikat "boleh diulang" jadi parameter wajib yang
  disuntik pemanggil, sengaja **tanpa nilai default** (default yang mengulang apa saja ikut mengulang
  `400`/`403` dan bahkan pembatalan normal).
- **Dua rak keamanan tak lagi bertabrakan soal batas login.** `skills/owasp` mematok "5/menit per-IP"
  sebagai baseline, sementara `skills/rate-limiting` mematok 🔒 bahwa kunci per-IP saja rapuh (satu
  kantor berbagi IP; penyerang gampang ganti IP). Disamakan ke per-akun **dan** per-IP, angka mati dibuang.
- **4 rujukan silang yang menunjuk rak salah/alamat tak ada dibetulkan:** *error boundary* diarahkan ke
  `skills/a11y` (yang nol menyebutnya) padahal isinya di `skills/react-patterns` — dan *4 state UI*
  justru sebaliknya; `PRODUCTION_OBSERVABILITY.md` menyandarkan otoritasnya pada aturan `AGENTS.md §3`
  yang **tidak ada** (aturannya sebenarnya di `skills/backend`); serta rujukan ke "audit log §5" di
  berkas yang tak punya pasal bernomor.
- **ErrorBoundary wajib punya jalan keluar** (tombol reset + reset saat route berubah). Boundary tanpa
  reset mengunci user di layar error sampai refresh manual — di SPA, pindah halaman pun tak menyembuhkan.
- **Rujukan satu-arah ditutup:** `skills/background-job` dan `skills/pembayaran` kini menunjuk balik ke
  `skills/tahan-gagal`, dan larangan `.select('*')` di `skills/supabase-prisma` dinaikkan jadi 🔒 supaya
  posturnya sama dengan `skills/backend` (sebelumnya lebih longgar di satu sisi).

### Penjaga baru (internal)

- Daftar pola rahasia di hook pre-commit dan `secret-guard.yml` kini **dikunci harus identik** oleh tes.
  Sebelumnya hanya pengecualian `.lintasai/` yang dijaga, sehingga menambah pola di satu sisi saja lolos
  senyap — dan sejak itu penjaga laptop & penjaga CI menilai dengan daftar berbeda.
- **Probe ANTI-FP routing untuk 3 rak yang pemicunya diperlebar.** Sebelumnya tak ada satu pun assert
  negatif untuk `a11y`/`backend`/`tahan-gagal`, dan `tests/rak-pemicu.test.mjs` **buta** terhadap masalah
  ini: berkas itu menguji tabel SHIM (`deteksiRak`), sedangkan jalur yang benar-benar dipakai client
  adalah `deteksiRakRegistry` (frontmatter). Artinya pemicu kelewat lebar bisa masuk tanpa satu tes pun
  memerah. Jaring dipasang dulu & dibuktikan hijau SEBELUM pemicu disunting.
- **5 assert positif** mengikat keenam kalimat keluhan error natural ke rak yang benar, supaya routing
  ini tak bisa melenceng diam-diam lagi.
- Pesan gagal di 2 tes tak lagi menyuruh menjalankan `npx lintasai skill-registry` — perintah itu sudah
  dicabut di v7.0.0, jadi orang yang tesnya merah akan menjalankan perintah yang tidak ada lalu mengira
  kitnya rusak. Diganti perintah regen yang benar.

---

## [6.0.0] - 2026-07-26

> **[BREAKING] Ringkasan rilis:** kit dirampingkan ke inti pemakaian sesi-natural. **6 skill dicabut**
> + **3 skill baru** (registry 33 → **30**), dan **CLI client dipangkas ke 14 perintah inti** — belasan
> perintah maintainer (preflight, stack-check, ai-config-check, dll) dicabut karena client non-programmer
> tak pernah mengetiknya dan kernel `AGENTS.md` tak menyebut satu pun (≈242 KB perkakas mendarat di tiap
> project tanpa jalan dipicu). Panduan kini hidup di **satu rumah** `.claude-kit/templates/` (tak lagi
> disalin dobel ke `docs/`). **Langkah client existing: cukup `npx lintasai update` seperti biasa** —
> salinan panduan lama di `docs/`-mu dibiarkan (beku, aman dihapus manual); rujukan resmi = templates/.

### Dihapus (BREAKING)

- **6 skill dicabut** — `chrome-extension`, `clickhouse`, `cloudflare`, `galeri-folder`,
  `github-actions`, `go`. Prompt topik ini tak lagi menyalakan rak khusus (aturan umum kernel tetap
  berlaku). Registry 33 → 30.
- **CLI client dipangkas ke 14 perintah inti**: `init` · `update` · `uninstall` · `rollback` ·
  `enable-risk-gate` · `enable-rak-gate` · `rak` · `adapter-sync` · `doctor` · `version` · `status` ·
  `diff` · `check-update` · `setup`. Perintah maintainer (preflight · peta-gen · skill-registry ·
  unicode-check · project-check · perf-budget · stack-check · ai-config-check · env-keys ·
  swallowed-check · complexity-budget · type-escape-check · debug-artifact-check · quality-ledger ·
  plan-scout · bump) DICABUT dari `npx lintasai` — robotnya pindah ke perkakas internal repo kit yang
  tidak dikirim ke client. 🙂 Awam: tombol-tombol teknisi yang tak pernah kamu pakai dikeluarkan dari
  paket, jadi paketmu lebih kecil dan tak ada perintah "hantu" yang bisa menyesatkan AI.

### Ditambah

- **3 skill baru**: `cek-permintaan` (pertajam permintaan ambigu sebelum dikerjakan), `debug-metodis`
  (lacak akar error sistematis, bukan tebak-tebakan), `jaring-data` (pengaman operasi berisiko data).
- **Kernel AGENTS.md — PRASYARAT POSISI**: di awal sesi AI wajib memastikan `.claude-kit/` terjangkau
  dari working dir; kalau tidak → berhenti + beri tahu user membuka sesi dari folder tempat kit terpasang
  (sebelumnya skenario salah-folder gagal senyap tanpa satu pun pesan). Adapter Cursor (`.mdc`) ikut
  ter-regen dari kernel.

### Diubah

- **Panduan satu rumah.** 13 panduan tak lagi disalin ke `docs/` project — semua SKILL.md merujuk
  `templates/...` = `.claude-kit/templates/` yang di-refresh tiap update. Dulu salinan `docs/` membeku
  di versi install pertama (dua salinan dijamin melenceng). Yang tetap disalin ke repo client hanya
  2 workflow GitHub (`backup-schemas.yml`, `secret-guard.yml`) karena memang harus jalan di CI client.
- **Kernel §1.6 dipertegas**: tiap info yang disampaikan AI wajib dijelaskan 3-hal (APA maksudnya —
  bahasa awam · KENAPA · LANGKAH selanjutnya) — bukan lagi sekadar "sebut istilah + gloss".
- **Routing rak kata-natural dipertajam** (mis. sebutan "divisi") + mode `--divisi` di CLI `rak` —
  prompt sehari-hari non-programmer lebih andal menyalakan rak yang tepat, tanpa menambah biaya token.
- **Internal repo kit** (tak mengubah perilaku client): muatan client dipisah ke folder `kit/`,
  perkakas maintainer ke `tools/`, ditambah puluhan penjaga tes baru (paritas distribusi dua-arah,
  larangan impor kit/→tools/, penunjuk pindah-rumah).

### Diperbaiki
- **Skill tak lagi menyuruh perintah CLI yang sudah dicabut v6.0.0** (`ai-config-check` di skill
  permukaan-ai; `stack-check` di owasp/deploy/perbaiki-error; `enable-kimi-hooks` di README) — di project
  client perintah itu tidak ada, jadi AI client mengejar perintah mati. Diganti pemindaian pola manual /
  pemindai stack langsung (`npm audit`/`pip-audit`/`govulncheck`).
- **Update kit yang dipasang di subfolder (monorepo) kini benar-benar me-refresh kernel** — pemasang
  ulang di jalur update membawa `--project-root-mode=folder-sekarang` (update tak pernah memindah lokasi
  install), jadi gerbang akar tidak menyala lagi di tengah update. Plus peringatan eksplisit anti
  kit-ganda saat update dijalankan dari folder yang tidak punya kit.
- **PETA.md netral dua-sisi** — rujukan milik repo kit (`tools/peta-gen.mjs`, `docs/architecture.md`,
  `docs/RESEP_PERUBAHAN.md`) kini berlabel `(repo kit)` supaya AI client tak mengejar berkas yang memang
  tidak dikirim.

## [5.0.0] - 2026-07-25

> **[BREAKING] Ringkasan rilis:** cabut TOTAL 5 topik berikut kaitannya. Untuk client existing: `docs/REFACTOR_STANDARD.md` **tak lagi di-deploy** (salinan lama tetap ada s/d `npx lintasai update` berikutnya — aman dihapus manual). **Tidak ada perubahan perilaku pemasangan** — mesin non-interaktif installer DIPERTAHANKAN (`npm create lintasai` tetap jalan tanpa popup jendela Windows).

**[BREAKING]** — entri ini rilis breaking (penanda body ditambahkan v8.0.0 supaya pemindai rentang yang membuang heading + blockquote tetap mendeteksinya — preseden v1.9.0).

> ℹ️ Badan lengkap entri ini diarsipkan ke `docs/CHANGELOG-ARSIP.md` (repo kit — tidak dikirim ke client) pada v8.0.0.

## [4.0.0] - 2026-07-24

> **[BREAKING] Ringkasan rilis:** perampingan besar pasca-3.1.0 — kit menyusut ke **inti dev web/app**.
> Rak on-demand kini **satu rumah** (`skills/`, registry final **33 skill**). Seluruh apparatus `rules/`
> per-seksi, sistem Rekam Pelajaran (feedback-capture), fitur pecah-repo (repo-split), Peta Aktivitas
> (project-map), audit-project, feature-flag lanjutan, AI-review + CODEOWNERS, apparatus SSOT
> (consistency-check), dan alur aktivasi tempel-prompt (`JALANKAN_KIT.md` + prompt `*_PROMPT_v1.md`)
> **dicabut** berikut robot turunannya (ADR-033 + ADR-034). Pengaman upload **tetap aktif** (di-repoint
> ke skill `owasp`). **Wajib baca "Migration Steps" di bawah sebelum `npx lintasai update`.**

**[BREAKING]** — entri ini rilis breaking (penanda body ditambahkan v8.0.0 supaya pemindai rentang yang membuang heading + blockquote tetap mendeteksinya — preseden v1.9.0).

> ℹ️ Badan lengkap entri ini diarsipkan ke `docs/CHANGELOG-ARSIP.md` (repo kit — tidak dikirim ke client) pada v8.0.0.

## [3.1.0] - 2026-07-23

> **Ringkasan rilis:** kernel client resmi pindah ke **`AGENTS.md` akar project** (sumber tunggal
> universal, ADR-032) — dibaca **native** oleh Codex/Kimi/Cursor + oleh Claude lewat loader
> `CLAUDE.md` — dengan **auto-migrasi client lama** (nol kehilangan kustomisasi) · **5 skill
> frontend baru** (a11y · design-direction · next-core · react-patterns · presentasi) menggantikan
> 4 skill lama (webdesign/uiux/nextjs/frontend-lanjutan), registry kini **38 skill** · pemicu rak
> `rilis/produksi` → skill deploy dihidupkan kembali · sapuan besar rujukan kernel lama
> (`CLAUDE_universal_v1.md`, sudah diarsip) di seluruh dokumen/prompt/rules/templates yang dikirim
> ke client — client tak lagi diarahkan ke berkas yang tidak ada.

> ℹ️ Badan lengkap entri ini diarsipkan ke `docs/CHANGELOG-ARSIP.md` (repo kit — tidak dikirim ke client) pada v8.0.0.

## [3.0.0] - 2026-07-22

> **Ringkasan rilis (versi BESAR):** menyerap SEMUA perubahan sejak 2.9.0 — perampingan fitur
> non-inti ([BREAKING], entri pertama di bawah, ADR-029) · rename folder `workflows/`→`rules/` +
> `lib/`→`engine/` ([BREAKING], ADR-027 Task 13; dibetulkan otomatis saat update) · arsitektur
> microkernel-plugin skills 31→37 skill · `kimi-sync`→`adapter-sync` + adapter Cursor/Codex ·
> "KENAPA-singkat" tiap langkah AI (ADR-028) · **microkernel ekstrem `CLAUDE_universal_v1.md`** 64rb→31rb char, −48,7%
> token/sesi client, Codex akhirnya kebagian aturan ([BREAKING], ADR-030, entri pertama di bawah).
> **Gerbang rilis:** 1533 tes hijau · preflight `--strict` GENTING 0 / PENTING 0 ·
> consistency BERSIH · `npm pack` 281 berkas. **Catatan diterima-owner:** 1 tes flaky sekali-muncul
> tak-reproduksi (dicatat jujur, tidak dipaksa "terpasang" di Buku Pelajaran) · plafon `MAKS_GRUP=3`
> dispatcher dibiarkan (perilaku lama, bukan regresi) · `npm audit` 2 CVE transitif devDeps eslint
> (kit nol runtime-dependency + lockfile tak dikirim → client TIDAK terpapar).

<!-- Baris berlabel dipertahankan agar pemindai rentang `npx lintasai update` tetap mendeteksinya: -->
### Diubah — [BREAKING] Microkernel ekstrem `CLAUDE_universal_v1.md`: −52% ukuran, fungsi 100% sama (ADR-030)
### Dihapus — [BREAKING] Perampingan fitur non-inti: kit fokus "bangun website & aplikasi yang kuat" (ADR-029)
### Diubah — [BREAKING] Rename-sweep nama warisan: perintah `kimi-sync` → `adapter-sync` + berkas generator + nama internal (ADR-027 Task 17)
### Diubah — [BREAKING] Struktur folder kit: `workflows/` → `rules/` dan `lib/` → `engine/` (ADR-027 Task 13)

> ℹ️ Badan lengkap entri ini diarsipkan ke `docs/CHANGELOG-ARSIP.md` (repo kit — tidak dikirim ke client) pada v8.0.0.

## [2.9.1] - 2026-07-18

### Diperbaiki — celah taksonomi Tingkat 1 (§4.6 + §7.3a) + pemadatan token berkas aturan

- **§4.6 (Gerbang Verifikasi Pra-Rilis) dan §7.3a (baca-kode-sebelum-edit) kini resmi tercatat TINGKAT 1** di daftar Dua Tingkat Aturan (`CLAUDE_universal_v1.md`). Sebelumnya kedua aturan ini sudah BERPERILAKU wajib-tanpa-kecuali (§7.3a bahkan dijaga mesin lewat Read-before-Edit) tapi taksonomi resmi menandainya sebagai bagian "checklist §4 / dokumentasi §7" yang boleh ditawar Tingkat 2 — celah tafsir yang berisiko disalahartikan sebagai "boleh dimatikan per project". Ditutup tanpa mengubah isi/perilaku aturan itu sendiri, cuma menegaskan statusnya.
- **Pemadatan §4.7, §7.3a, §2.1.1 Kategori#4**: menghapus restatement yang sebelumnya mengulang >70% isi rak on-demand (`workflows/4.7-alur-berpemandu.md`, `workflows/7.3a-modifikasi-baca-kode.md`) atau seksi lain (§4.1) — nol informasi hilang (detail lengkap tetap ada di rak, cuma dibaca saat dipicu), hemat ~630 karakter (~157 token) dari berkas aturan yang di-load penuh tiap sesi kerja.

## Riwayat lama (v2.9.0 ke bawah)

Entri rilis lama yang **tak berlabel** dipindah ke arsip repo kit: `docs/CHANGELOG-ARSIP.md` (tidak
ikut terkirim ke client). Yang TETAP di bawah ini = entri lama yang membawa label
`[SECURITY]`/`[BREAKING]`/`[SCAN-REQUIRED]`.

> 🚨 **JANGAN pangkas entri di bawah ini.** Pemindai rentang `npx lintasai update` membacanya untuk
> menampilkan banner *pasang SEGERA* ke client yang lompat banyak versi sekaligus. Kalau entri berlabel
> hilang, client lompat-versi kehilangan peringatan keamanan **tanpa satu pun pesan error**.
> Dijaga `tests/changelog-labels.test.mjs`.

## [1.30.1] - 2026-06-16

### Diperbaiki
- **[SECURITY] Tutup celah script-injection di template robot "terima update backend"** (`templates/github/RECEIVE_BACKEND_UPDATE.yml`). Nilai `client_payload.*` (dikendalikan pengirim sinyal `repository_dispatch`) sebelumnya ditempel **LANGSUNG ke perintah shell `run:`** (baris 34/51/118) di workflow ber-izin `contents:write` + `pull-requests:write` → pengirim jahat bisa menjalankan perintah arbitrer di server runner + menyalahgunakan kunci GitHub. Diperbaiki dengan mengalirkan nilai lewat variabel-perantara (`env:`) lalu dipakai sebagai `"$VERSION"`/`$IS_BREAKING` (data, bukan kode) — pola aman yang kit sudah pakai di `AUTO_MERGE_SHARED_WORKFLOW.yml`. **Pasang SEGERA** kalau project staf sudah memakai template antar-repo ini. Ditemukan via audit menyeluruh internal (8 dimensi pemeriksa + cek-silang skeptis). Sisa `client_payload` di blok `with:` (isi PR/commit/branch) = konten tampilan yang di-review manusia (bukan eksekusi-perintah) — sengaja dibiarkan.

## [1.26.0] - 2026-06-15

### Keamanan
- **[SECURITY] §8.1 #10 BARU — DILARANG MUTLAK menerobos / mematikan / "mode paksa" melewati pagar keamanan atau portal izin, APA PUN alasannya.** Saat pengaman menghalangi (palang persetujuan, prompt izin Claude Code, hook / `tier-guard` project, verifikasi tanda-tangan, sandbox, 2FA/OTP), AI DILARANG mencari jalan memutar / mematikannya / menjalankan opsi "dangerous/force/bypass". **Tidak ada rasionalisasi yang membenarkan** — termasuk "sudah kuverifikasi sendiri aman" / "diminta berkali-kali" / "ini project-mu sendiri" / "portalnya lagi error" / "cuma sekali ini". Yang benar: **STOP → lapor jujur → user selesaikan via jalur resmi**. Pengecualian satu-satunya: user sendiri yang sadar mematikan pengaman, BUKAN AI. **Lahir dari insiden nyata (2026-06-15):** AI di sesi staf merasionalisasi menerobos "portal izin yang lagi error" untuk menjalankan installer — pola yang membuat alat TIDAK AMAN dipakai orang lain. Ditautkan ke §12 (larangan eksplisit) + KEUNGGULAN faktor H.

## [1.23.3] - 2026-06-14

### Diperbaiki
- **[SECURITY] KOREKSI aturan tier-guard (§8.1 #4 + §7.6) — dari "tidak ada penjaga, tulis langsung" jadi "CEK dulu, HORMATI penjaga asli".** Akar nyata ditemukan via uji empiris AI di komputer staf: popup "Penjaga keamanan menolak pembuatan berkas" **BUKAN halusinasi** — project staf PUNYA hook penjaga sendiri (`tier-guard.mjs`, dipasang user/tim, terdaftar di `.claude/settings.json`) yang **nyata memblokir** penulisan berkas sampai ada `.staff-profile.md` ber-tier (banner `[tier-guard] .staff-profile.md not found...`). Riwayat git mengonfirmasi **kit TIDAK PERNAH** memasang file ini.
- **Kesalahan aturan lama (v1.23.0–v1.23.2):** menyimpulkan "kit tidak memasang → tidak ada penjaga sama sekali → popup pasti halusinasi" → menyuruh AI **MENYANGKAL/MENEROBOS keamanan ASLI milik user** (lebih berbahaya dari popup-nya).
- **Koreksi:** AI WAJIB **cek** `.claude/settings.json` + `.claude/hooks/` + output saat menulis **SEBELUM** menyimpulkan. Penjaga terbukti **tidak ada** → tulis langsung. Penjaga **ADA + memblokir** → **HORMATI** (jangan terobos/sangkal), jelaskan jujur + popup **[1] Buat kartu identitas dulu (rekomendasi** — tanya peran, default anggota tim aman, **BUKAN** auto `tier: owner`**)** / [2] tampilkan di chat / [3] lewati. Membatalkan aturan keliru v1.23.0–v1.23.2.

## [1.23.2] - 2026-06-14

### Diperbaiki
- **[SECURITY] Aturan KERAS anti-popup-penjaga-palsu (§8.1 #4)** — perkuat fix v1.23.1 yang ternyata masih terlalu lemah/terkubur (popup "Penjaga keamanan menolak pembuatan berkas" masih muncul di v1.23.1). Ditambah larangan keras menonjol: **TIDAK ADA penjaga yang memblokir pembuatan berkas**; membuat docs/denah **TIDAK butuh** `.staff-profile.md`; **DILARANG KERAS** memunculkan popup "penjaga menolak" / "belum ada kartu identitas → diblokir" / "buat staff-profile dulu untuk membuka izin tulis" (itu halusinasi penghalang yang tak ada, §8.2 "no quote = no claim"). Diminta bikin denah tapi `.staff-profile.md` belum ada → **buat LANGSUNG**, jangan tahan, jangan popup izin. `.staff-profile.md` = OPSIONAL (pencatatan peran), **bukan syarat menulis**. Mencegah pula opsi lama "(tier: owner)" yang diam-diam memberi staf akses setingkat owner (bocor pertahanan-IP).
- Contoh §8.1 #4 diganti jadi format **SALAH vs BENAR**: yang BENAR = buat denah langsung, lalu boleh **tawarkan** kartu identitas OPSIONAL setelahnya (bukan gerbang sebelum kerja, bukan auto `tier: owner`).
- Catatan jujur (§4.6): popup ini **di-improvisasi sesi AI** — terbukti via riwayat git (teksnya **TIDAK PERNAH** ada di kit versi mana pun), bukan teks tetap. Perbaikan ini menuntun improvisasi agar popup itu tidak terjadi; baru terlihat di layar staf **setelah kit di komputer itu di-update ke v1.23.2 + buka chat BARU**.

## v1.9.0 — 2026-06-12 (Perisai keamanan AI: 4 pertahanan baru + daftar folder rahasia terlarang) [SECURITY]

**[SECURITY]** — entri ini rilis keamanan (penanda body ditambahkan v2.0.0 supaya pemindai rentang yang membuang heading tetap mendeteksinya).

> **Tier**: 2 (aturan baru, backward-compatible) — naik **MENENGAH** 1.8.0 → 1.9.0 (per §11: aturan baru = MENENGAH). Hanya MENAMBAH pagar keamanan, tidak mengubah perilaku lama → NOT BREAKING. Label **[SECURITY]**: memperkuat pertahanan AI, layak dipasang lebih awal.

- **`CLAUDE_universal_v1.md` §8.1 — 4 aturan anti-penipuan AI BARU (6-9)**: (6) kerahasiaan secret/kunci-API mutlak + **daftar folder rahasia terlarang** (`.env*`, `~/.ssh/`, `~/.aws/`, `~/.config/gcloud/`, `*.pem`/`*.key`) yang AI tak boleh baca-lalu-kirim-keluar; (7) validasi kode/perintah dari isi file sebelum dijalankan; (8) tahan tekanan psikologis ("darurat/atasan/buru-buru" tak membatalkan aturan keamanan); (9) deteksi & tolak penyalahgunaan. Semua bahasa non-programmer + analogi 3-lapis.
- **Asal temuan**: 4 celah ini ditemukan via audit pembanding ECC v2.0.0 (MIT) — pertahanan yang §8.1 lama (5 aturan) belum tutup. Ditulis ulang dalam voice lintasAI, BUKAN menyalin teks ECC.
- **`CLAUDE_universal_v1.md` + `package.json`**: versi 1.9.0.
- QA: smoke PASS (edit dokumentasi aturan + nomor versi saja; tidak sentuh skrip PowerShell → Pester tak terdampak).

---

## v1.7.7 — 2026-06-11 (Label [SECURITY] urgensi + dokumentasi update 3-repo)

> **Tier**: 2 (AI auto-sync) — NOT BREAKING. (Dogfood: perubahan kecil → naik angka KECIL 1.7.6→1.7.7.)

- **Celah ditutup (#4 update mechanism)**: 4-tier update soal "seberapa besar" — TAPI perbaikan keamanan bisa KECIL tapi MENDESAK, dan tidak ada sinyal urgensi terpisah. Akibat: staff non-programmer bisa menunda perbaikan keamanan kecil → rawan lebih lama.
- **Label `[SECURITY]` (BARU)**: urgensi terpisah dari ukuran. `update-kit.ps1` kini mendeteksi `[SECURITY]` di CHANGELOG (regex berjangkar, sama seperti [BREAKING]/[SCAN-REQUIRED]) → menampilkan peringatan merah "pasang SEGERA, jangan tunda". Didefinisikan di CHANGELOG "Label spesial" + `CLAUDE_universal_v1.md` §11 + `UPDATE_GUIDE.md`.
- **`UPDATE_GUIDE.md` v3 — §6.1 (BARU)**: alur update saat 3-repo (split). Mengoreksi kekhawatiran sebelumnya: `.claude-kit/` IKUT di-commit ke repo (terbukti `setup-pola-b.ps1:1587` + `README:426`), jadi update = owner update+commit+push per repo, staff cukup `git pull` (versi konsisten lewat git, bukan update per-clone).
- Verifikasi jujur: celah update #2 (drift) & #3 (per-clone) TERNYATA sudah teratasi git (`.claude-kit/` di-commit) — penilaian sebelumnya over-worry, dikoreksi.
- QA: smoke PASS, Pester 132/132.

---
