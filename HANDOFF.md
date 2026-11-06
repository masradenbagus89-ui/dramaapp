# HANDOFF — lanjut di sini

> **Cara pakai:** buka tab chat baru, ketik **`lanjut dari handoff`**.
> AI wajib baca berkas ini **pertama**, lalu `antrean-deploy.md`.
>
> **AI:** tiap kali ada perbaikan / deploy / keputusan — **perbarui berkas ini di langkah terakhir**, sebelum bilang selesai. Jangan tumpuk sejarah panjang di sini; pindahkan yang lama ke `NEXT-SESSION.md`.
>
> **⚠️ Cara menyisipkan catatan baru (dibetulkan 2026-09-21).** Sisipkan **satu** judul `## ` saja, lalu isinya, lalu `---`. JANGAN menulis ulang judul seksi lama sebagai penanda posisi — itu menghasilkan **judul kembar/yatim**, dan sesi 2026-09-21 meninggalkan **4 judul yatim + 2 judul kembar** sebelum ketahuan. Kalau satu topik perlu dua blok (status rilis + rincian), beri judul kedua akhiran **` — rincian`**.
>
> **📦 UKURAN — sudah dirapikan 2026-11-05.** Berkas ini pernah membengkak jadi **10.509 baris (807 KB)**, dan ia dibaca PALING AWAL tiap sesi — jadi ukurannya memakan jatah konteks AI sebelum sempat menyentuh kode. Atas keputusan owner, catatan **sebelum 2026-10-15** dipindah ke `NEXT-SESSION.md` (nol baris dibuang, cuma pindah) sehingga berkas ini turun ke **~4.683 baris — hemat 56%**. ⚠️ **Kalau nanti membengkak lagi, JANGAN dipotong buta**: *"Utang teknis yang DISENGAJA"*, *"Jangan dilakukan"*, *"Performance /beranda: SUDAH SEHAT — jangan diulang"*, dan *"Berkas terkait"* adalah **aturan permanen**, bukan sejarah — keempatnya ada di DASAR berkas ini dan sengaja ditahan. Begitu pula pengingat aktif **MATIKAN dramaapp.vercel.app** yang syaratnya belum terpenuhi. Cara merapikannya: potong di batas seksi tanggal, tahan kepala + blok aturan di ekor, lalu VERIFIKASI jumlah baris lama = baru + yang dipindah.

**Terakhir diisi:** 2026-11-06 — ⬇️ **SIAP TAPI BELUM DI-PUSH: baris "Playly" di popup *Pilih provider download*.** Owner menyerahkan berkas `code to push link provider.txt` + *"kamu cek kamu buka lalu kamu kerjakan"*. ⚠️ **Yang WAJIB owner tahu sebelum menilai hasilnya: barisnya BELUM akan muncul di video mana pun, dan itu bukan kerusakan kode.** Field `unduh` di `/api/public-video` Playly memang ada, tapi `null` di **200 dari 200 video kita** (diperiksa langsung, id dari HTML produksi `/film`); halaman `/unduh/<id>` milik Playly sendiri menjawab *"pemiliknya tidak mengizinkan unduhan"* — izin unduh = **saklar per-video milik pengunggah di Playly** (@coklat/@ayy/@tbchairulm), bukan setelan kita. Begitu salah satu video dinyalakan izinnya, barisnya muncul sendiri tanpa rilis baru. 🔍 **Cara owner membuktikan sisi DramaKu sudah jalan (1 klik, sesudah di-push):** buka `<situs>/api/playly/unduh?id=1789096535588` → harus terbaca `{"ok":true,"unduh":null,"alasan":"tidak-diizinkan"}`. 📌 **Kode owner tidak ditempel apa adanya** — ia JavaScript DOM polos memakai kelas CSS `provider-row`/`provider-name`/`btn-download` yang **nol kemunculan** di repo ini (project React + Tailwind, barisnya `<tr>` di dalam `<table>`), jadi dipakai sebagai spesifikasi lalu ditulis ulang dengan cara project. Dua penyimpangan sengaja dari contoh itu, keduanya menutup kerusakan senyap: (1) data diambil **lewat server** `/api/playly/unduh`, bukan browser langsung ke Playly — penyaring domain butuh env server, dan alamat itu berakhir di `href` penonton; (2) `?res=` dirakit dengan `URLSearchParams`, bukan tempel-teks — alamat yang sudah punya query akan jadi `?v=2?res=480p` yang rusak tapi terlihat normal. **Berkas:** +`lib/playly-unduh-langsung.ts`, +`app/api/playly/unduh/route.ts`, +2 berkas tes, diubah `lib/playly.ts` · `ModalProviderPlayly` · `InfoVideoPlayly` · `PlaylyVideoGrid` · `app/tonton/[id]/page.tsx`. Prop `videoId` **opsional** → pemanggil lama nol panggilan jaringan, perilakunya persis seperti sebelumnya. **Bukti:** `rm -rf .next` → build **exit 0** → tsc **exit 0** → **1.970 tes / 137 berkas hijau** (dari 1.921/135, +49) · **diuji-balik** (penjaga domain dilepas → 3 merah; `videoId` tak diteruskan → 6 merah; dikembalikan → hijau) · endpoint diuji di server lokal: **400** id ngawur/`../etc/passwd`, **404** video di luar katalog · rantai nyata ke Playly: 2 video → `tidak-diizinkan`, 1 id basi → `playly-tak-terjawab`. ⏸️ **Belum di-commit & belum di-push** — push ke `origin main` = tombol rilis, menunggu izin owner. Rencana lengkap: `docs/lintasai/rencana/2026-11-06-unduh-langsung-playly.md`.

---

**Sebelumnya 2026-11-05:** ✅ **TAYANG `32ae1c6`: SELURUH halaman penonton + admin kini berlatar putih.** 🪤 **Pelajaran: PEMETAAN SAYA SEBELUMNYA TIDAK LENGKAP** — saya menyatakan "tinggal 3 halaman" (/shorts, /history, /my-list), lalu owner menunjuk **/profile** yang juga gelap. Pemetaan ulang lewat HTML yang BENAR-BENAR dikirim server menemukan **lima**, bukan satu. Kelas `.tema-admin-terang` digeneralkan jadi `.tema-terang-penuh` (dipakai admin + halaman akun). ⚠️ Halaman MENONTON sengaja TETAP gelap. Dual push `7afb6cc..32ae1c6`, tayang ±82 detik, downtime NOL. Rinciannya di seksi teratas.

**Sebelumnya hari ini:** ✅ **TAYANG `425cc34`: TIGA perbaikan panel admin sekaligus.** (1) 🧭 **Satu menu = satu tampilan** — lima menu sidebar ternyata BUKAN halaman terpisah, semuanya `/admin` yang sama; sekalian menutup menu **Keamanan (2FA) yang RUSAK** (targetnya `#keamanan` nol elemennya). (2) 🎨 **Teks bernada transparan tak lagi pucat** — cara kemarin bocor mendasar: `text-rose-100/90` adalah kelas BERBEDA dari `text-rose-100`. (3) 🔍 **Saringan "sudah / belum ada IMDb"** di daftar 489 video. Dual push `68b0069..425cc34`, tayang **±84 detik**, **downtime NOL**. Rinciannya di seksi teratas.

**Sebelumnya hari ini:** ✅ **TAYANG `0cc1758`: PANEL ADMIN kini berlatar terang, seragam dengan beranda.** Owner: *"di admin kamu buat juga latar belakangnya sama dengan beranda jadi semua dashboard semua sinkron"*. ⭐ **477 kemunculan warna gelap dibalik TANPA menyentuh satu pun berkas komponen** — Tailwind v4 di sini mencetak warna sebagai VARIABEL, jadi paletnya cukup didefinisikan ulang di satu pembungkus (`app/globals.css`), saklarnya di `app/admin/layout.tsx`. 🪤 **TIGA jebakan senyap, semuanya ketahuan hanya karena hasilnya DIPANDANG** (lihat seksi teratas), dan 🪤 **DUA kesalahan METODE VERIFIKASI saya sendiri** — nyaris melaporkan 'deploy gagal' padahal sudah tayang. Dual push `60eb338..0cc1758`.

**Sebelumnya hari ini:** ✅ **TAYANG `1dd0fd0`: panel admin Playly tak lagi HILANG saat Playly lambat.** 🪤 Owner melapor *"Dropdown paling kiri aku tidak ketemu"* — **dan memang tidak ada, bukan terlewat**: panel menyembunyikan DIRINYA SENDIRI begitu pengambilan daftar gagal (`if (fetchError) return`), jadi Playly telat 10 detik = daftar video + KETIGA dropdown lenyap. Senyap total: halaman admin tetap 200, build hijau, 1.886 tes hijau — yang hilang cuma alat kerjanya, dan **owner yang menemukan, bukan mesin, SESUDAH rilis**. Kini panel menyerah hanya kalau benar-benar nol video, dan halaman admin memakai salinan terakhir sebagai jaring. Dual push `d73fd0b..1dd0fd0`, downtime NOL.

**Sebelumnya hari ini:** ✅ **TAYANG `d04a952`: DUA perbaikan sekaligus.** (1) 🎬 **Serial Playly bisa dipisahkan dari "Film Terbaru"** — dropdown Jenis di panel admin. (2) 🎨 **Latar putih seragam** di `/discover` (Jelajah + semua filter genre), `/film`, `/katalog`. Dual push `8f30108..d04a952`, tayang **±88 detik**, **downtime NOL** (http=200 di SETIAP percobaan selama pergantian versi). ⏳ **SATU langkah owner tersisa:** tandai video "Pemuda Miskin Mata Tembus Pandang Jadi Miliarder" jadi **Series** di panel admin — situs sengaja TIDAK berubah sampai itu dilakukan (bawaan `film`, supaya nol film ikut berpindah). Rinciannya di seksi teratas.

**Sebelumnya hari ini (kini SUDAH tayang):** 🎬 `2f8fb6f`: serial Playly akhirnya bisa dipisahkan dari "Film Terbaru".** Owner: *"rekan saya upload drama dari playly tapi masuknya ke film terbaru, harusnya masuk ke series terbaru"*. Akar masalahnya **bukan salah logika — fiturnya memang belum pernah ada**: seluruh video Playly dilempar ke baris film tanpa kecuali. 🪤 **Tebakan otomatis DIUKUR dulu di 489 video produksi lalu DITOLAK** (pola judul cocok cuma 18, DUA di antaranya justru film; judul yang dikeluhkan owner tak terdeteksi; 58% durasi `null`). ⏳ **Menunggu izin push owner.** Rinciannya di seksi teratas.

**Sebelumnya 2026-11-05:** 🔁 **VERIFIKASI SILANG 3 SESI.** Push yang diminta owner ternyata **sudah dilakukan sesi lain** (`4f28886` + 6 commit lain sudah di kedua remote). Nol kode diubah; yang dikerjakan: membetulkan catatan yang BASI — studio AI sudah di-commit (`d12d913`, 26 berkas) padahal masih tertulis "belum di-commit", dan `antrean-deploy.md` disegarkan ke `836a0b1`. 🪤 **Pelajaran: status "belum di-push" di catatan lama WAJIB dicek ulang lewat `git fetch`** — repo ini dikerjakan dari beberapa sesi. Rinciannya di seksi teratas.

**Sebelumnya 2026-11-03:** 🔊 ✅ **TAYANG `88d3429`: Volume Stabil & Penguat suara AKHIRNYA BERFUNGSI.** Ternyata kedua sakelar selama ini dipasang MATI PERMANEN dan **nol `AudioContext` di seluruh project** — mesinnya memang tak pernah dibangun, jadi ini membangun dari nol, bukan membuka gerbang. Surat permintaan izin dikirim ke rekan Playly dan **mereka memasangnya hari itu juga**, sehingga fitur **hidup sendiri tanpa rilis ulang** (perancangannya terbukti benar). 🔴 **Bunyinya BELUM pernah didengar siapa pun** — mesin kerja ini server tanpa perangkat suara, semua pengukuran audio memulangkan nol; **uji dengar wajib manusia**, caranya di seksinya. ⚠️ Kalau DramaKu pindah domain, daftar origin WAJIB dikirim ulang ke Playly atau fitur suara mati lagi.

**Sebelumnya hari itu:** 🎬 **BARU `drama-ai-studio/`: episode 1 jadi MP4 — 18/18 FOTO AI + 11/11 DIALOG MANDARIN DIUCAPKAN, biaya NOL** — 4 putaran. 💡 Temuan sampingan penting: **jam mesin ini tertinggal 13 menit** dari waktu sebenarnya. 🪤 Pelajaran termahal: **"ada sinyal audio" ≠ "terdengar"** (semua tenaga di sub-bass yang speaker kecil tak bunyikan) dan **"kamera bergerak" ≠ "terbaca bergerak"** (14%/7dtk = slideshow); dua-duanya lolos pemeriksaan teknis saya dan hanya ketahuan dari laporan owner (1080×1920, 97,04 dtk, subtitle Mandarin+Indonesia terbakar, wajah tokoh konsisten lintas adegan). Sub-proyek terisolasi; repo induk nol tersentuh (build OK, tsc exit 0, 1844 tes hijau). ⚠️ Yang dihasilkan **animatic**, BUKAN video AI — mesin berbayar sengaja belum disambung (nol kunci API). ✅ **SUDAH di-commit & di-push** (`d12d913`, 26 berkas ter-track) — status "belum di-commit" di catatan lama sudah TIDAK berlaku. · Sebelumnya: 🔍 **AUDIT HP + TABLET atas permintaan Kang Dedi: HASIL BERSIH, nol kode diubah.** 20/20 pengukuran (5 halaman × lebar 360/412/768/1024) menunjukkan `scrollWidth` sama persis dengan viewport — nol elemen meluber. 🪤 **PELAJARAN METODE PENTING**: potret `--window-size` di bawah ~476px MENYESATKAN (berkas PNG-nya selebar yang diminta, tapi viewport CSS yang dirender TIDAK) — jebakan ini sudah menipu TIGA kali. Cara yang benar (iframe + ukur `scrollWidth`) ada di seksinya.

**Rilis terakhir:** 2026-11-03 — `88d3429` (fitur suara pemutar, lihat seksi teratas).

**Rilis sebelumnya:** 2026-11-02, rilis ke-6 hari itu (✅ **TAYANG `784460c`**: **judul pemutar kini MEMUDAR bersama kontrol saat film berjalan**, memberi ruang penuh bagi terjemahan. 🔍 **AKAR MASALAH AKHIRNYA TERVERIFIKASI, dan tiga rilis sebelumnya mengejar yang salah**: teks yang menumpuk judul BUKAN subtitle aplikasi melainkan **hardsub — terbakar di dalam gambar video**, posisinya mustahil digeser. Dibuktikan: pagar CSS subtitle browser sudah benar di bundle produksi, DAN drama itu tak punya satu pun berkas subtitle (ep 1/2/13/14/15 semua 404). Keputusan owner dari tiga opsi. Dual push `329c573..784460c`, tayang **±80 detik**, **downtime NOL**. ❗ Temuan terpisah belum ditangani: katalog menjanjikan subtitle yang berkasnya tidak ada — rinciannya di seksinya.)

**Rilis ke-5 hari ini:** (✅ **TAYANG `8ced118`**: **subtitle dua baris tak lagi menimpa judul** + tombol play dikecilkan 44→40px di HP. Owner mengirim tangkapan DevTools Galaxy Z Fold 6 (412×968) dengan teks saling menimpa. Sebabnya subtitle dibungkus `<span>` polos = elemen **INLINE**, dan pada elemen inline padding atas-bawah TIDAK menambah tinggi baris — kotak latarnya meluber keluar menimpa apa pun di atas & di bawahnya. Satu baris aman, dua baris langsung tabrakan. Perbaikan: `inline-block`. Dual push `32c7b0c..8ced118`, tayang **±80 detik**, **downtime NOL**. Rinciannya di seksinya.)

**Rilis ke-4 hari ini:** (✅ **TAYANG `3d57145`**: **blok JUDUL pemutar turun ~26px di HP**. Putaran kedua dari `7c67a40` di bawah — ❌ **RALAT: rilis itu menggeser blok yang SALAH.** Owner menulis *"teks arti tulisannya"*, dibaca sebagai subtitle terjemahan; tangkapan layar putaran kedua memperjelas kotak merahnya menandai **judul + `Eps n / N`**, dan di gambar itu tak ada subtitle sama sekali. Ruangnya dipanen dengan memindahkan angka durasi dari barisnya sendiri di bawah tombol ke **samping garis geser** — ~18px kembali TANPA penonton kehilangan angkanya. Dual push `c0132cf..3d57145`, tayang **±70 detik**, **downtime NOL**. Rinciannya di seksinya.)

**Rilis ke-3 hari ini:** (✅ **TAYANG `7c67a40`**: **subtitle di pemutar diturunkan di layar HP**. Owner: *"teks arti tulisannya terlalu ke tengah, buat turun sedikit."* Sebabnya tulisan `Eps n / N` di atasnya duduk di TENGAH tombol setinggi 44px, jadi subtitle ber-`mt-2` berhenti hanya ±20px di bawahnya dan terbaca menyatu dengan blok judul. Jarak dari judul +16px, subtitle turun 12px terhadap layar; layar lebar NOL perubahan. Dual push `ce0265c..7c67a40`, tayang **±90 detik**, **downtime NOL**. ⚠️ Ruang turunnya MENTOK — alasannya di seksinya, jangan diulang dari nol.)

**Rilis ke-2 hari ini:** (✅ **TAYANG `91d1f5d`**: daftar episode di sidebar **menggulung sendiri ke episode terakhir ditonton**. Lanjutan langsung dari rilis ke-1 di bawah: sesudah daftar pindah ke kolom sempit, serial 45 episode selalu terbuka di episode 1. Sengaja **BUKAN** `scrollIntoView` — itu menggulung halamannya juga, melompatkan penonton melewati hero. Dual push `c190bdb..91d1f5d`, tayang **±50 detik**, **downtime NOL** (0 balasan bukan-200). Dibuktikan sampai ke isi bundle produksi. Rinciannya di seksinya.)

**Rilis ke-1 hari ini:** (✅ **TAYANG `e90e967`**: daftar **Episode** dan **Drama Terkait** BERTUKAR TEMPAT di halaman `/drama/[id]`, **khusus serial**. Episode naik ke sidebar bingkai hero; Drama Terkait turun ke kartu putih ditata berpetak. Alasan owner: di HP penonton harus menggulung melewati 20 judul lain + sinopsis sebelum menemukan tombol episode. Halaman FILM nol perubahan. Dual push `fb5aca1..e90e967`, tayang **±130 detik**, **downtime NOL** — `http=200` di SETIAP percobaan selama pergantian versi. Smoke test 6/6 = 200. Rinciannya di seksinya.)

**Rilis terakhir sebelum itu:** 2026-10-31, rilis ke-3 hari itu (✅ **TAYANG `7977f9c`**: **genre & negara akhirnya ikut menghitung FILM**. Klik "Komedi" dulu memulangkan "0 judul"; sekarang **1 drama + 64 film**. Menu Negara ternyata dibangun dari **SATU judul** — dari 40 drama cuma 1 punya kolom negara, yaitu film Meg 2 yang ko-produksi 6 negara, dan itulah seluruh isi dropdown yang dikeluhkan owner. Sekarang dihitung dari katalog lengkap → **Indonesia, Jepang, Korea, India, Thailand** ikut muncul, dibatasi 12 teratas. Sekalian: kata "Playly" dibuang dari layar penonton. Rinciannya + dua jebakan verifikasi di seksinya.)

**Rilis ke-2 hari ini:** (✅ **TAYANG `a44ac67`**: poster FILM akhirnya punya **⭐ rating + chip HD**. Rating ternyata sudah ada di data sejak lama tapi tak pernah digambar (21 dari 24 film punya); kualitas memang tak punya sumber sama sekali, jadi atas keputusan owner diturunkan dari **link unduhan** (1080p → HD, 480p → SD) + dropdown koreksi di panel admin. Tayang ±90 detik, smoke test 5/5 = 200. ❌ **RALAT PENTING**: temuan "tombol tergeser di layar HP" yang dicatat sebelumnya **TIDAK PERNAH ADA** — itu cacat alat potret (Edge di mesin ini tak bisa < ±476px, jadi gambar hanya DIPOTONG). Sudah diukur ulang: tombol terpusat sempurna, nol pelebaran halaman. Rinciannya + cara memotret lebar HP yang BENAR ada di seksinya.)

**Rilis ke-1 hari ini:** (✅ **TAYANG `4dde5c0`**: tombol beranda "LIHAT SEMUA FILM UNGGULAN" → **"TEMUKAN TONTONAN FAVORITMU"** — labelnya salah di dua sisi (isinya drama berseri, bukan film; tujuannya katalog lengkap, bukan daftar unggulan). Dual push → Railway build sendiri → tayang ±60 detik, **downtime NOL**. Smoke test 5 alur: 4 langsung 200, `/drama/meg-2-the-trench` 500 SEKALI lalu 200 enam kali — cold start, dicatat bukan dihapus. ❌ **DIRALAT di rilis ke-2**: catatan asli di sini menyebut tombol itu "tergeser ke kanan di layar HP" sebagai gejala nyata. **Itu keliru** — cacat alat potret, bukan cacat situs; sudah diukur ulang dan tombolnya terpusat sempurna. Jangan diburu.)

**Sebelumnya:** 2026-10-30 (tiga rilis beruntun, semuanya TAYANG: `5088bf2` genre bahasa Indonesia → `27973f0` koreksi owner Kerajaan/CEO/Lainnya → **`55894b8` dua tombol halaman drama yang selama ini TERPOTONG**. Downtime NOL. ⏸️ **DUA bahasan menunggu keputusan owner**, risetnya sudah selesai & nol kode diubah: "klik drama langsung play" dan "sinopsis film masih bahasa Inggris".)

---

## 2026-11-06 — 📊 Laporan progress .pptx untuk rapat owner (BUKAN rilis — nol kode produksi disentuh)

Owner minta laporan berbentuk PPT untuk rapat dengan atasan hari itu. Pilihan owner lewat popup: **topik = progress dramaapp · panjang = 8-10 slide · fokus = capaian & progress** (bukan masalah/rencana).

**Hasil — 5 berkas baru di `docs/laporan/`, BELUM di-commit:**

| Berkas | Guna |
|---|---|
| `2026-11-06-laporan-progress-dramaapp.pptx` | laporan 9 slide, 16:9, 2 grafik native PowerPoint (bisa diedit, bukan gambar tempelan) |
| `pratinjau-laporan-dramaapp.html` | pratinjau yang dibangun DARI .pptx itu; dibuka di Edge, Ctrl+P untuk jadi PDF |
| `_buat-laporan.py` | pembangun .pptx (python-pptx 1.0.2). Ubah di sini lalu jalankan ulang — jangan sunting .pptx manual |
| `_buat-pratinjau.py` | membaca .pptx lalu menulis pratinjau HTML, supaya pratinjau tak pernah beda dari slide |
| `_cek-tata-letak.py` | pemeriksa 3 hal: teks luber · **dua blok teks saling menimpa** · keluar kanvas |

Salinan .pptx + .html juga ditaruh di Desktop owner.

**Angka di slide semuanya terverifikasi, bukan karangan.** Dua sumber: (1) `git log` — 645 commit; 136 feat · 100 fix · 241 docs · 12 chore · 156 lain; 30 hari terakhir 179 commit (36 feat + 39 fix); per bulan Mei 52 · Jun 121 · Jul 2 · Agu 104 · Sep 156 · Okt 173 · Nov 37 (s/d tgl 5). (2) server produksi — `/` balas 200 dalam 0,26 detik · `/api/health` balas ok dengan sumberData database · `/api/dramas` 41 drama (situs menampilkan **42** — itu yang dipakai di slide) · halaman `/film` **489** judul film & video. Skala produk: 21 halaman · 55 route API · 274 berkas .ts/.tsx · 135 berkas tes.

🪤 **Jebakan yang nyaris lolos — pemeriksa pertama saya TIDAK CUKUP.** `_cek-tata-letak.py` versi awal hanya memeriksa "apakah teks muat di kotaknya sendiri", dan melaporkan BERSIH. Begitu slide dirender jadi gambar lalu benar-benar DIPANDANG, slide 4 ketahuan rusak: teks butir *"...tidak disembunyikan."* menimpa catatan kaki *"November dihitung sampai tanggal 5."* — dua kotak yang masing-masing "muat", tapi saling bertabrakan. Pemeriksa lalu ditambah pemeriksaan ke-2 (tabrakan antar blok teks, memakai tinggi teks NYATA bukan tinggi kotak); hasil akhir **0 luber · 0 tabrakan · 0 keluar kanvas**. Pelajarannya sama dengan kasus `1dd0fd0`: pemeriksa hijau bukan bukti hasilnya benar, kalau yang diperiksa bukan hal yang rusak.

🪤 **PowerPoint TIDAK terpasang di mesin ini** (nol folder Microsoft Office). Jadi .pptx tidak bisa dibuka/diperiksa di sini — itulah sebabnya pratinjau HTML dibuat, bukan sekadar hiasan. Owner membukanya di perangkat lain, Google Slides, atau Office online.

🖼️ **Lanjutan permintaan owner hari yang sama: "tambahkan image juga".** Laporan naik dari 9 → **10 slide**; slide 4 baru **"Wujud nyatanya"** berisi 3 tangkapan layar situs produksi (halaman depan · daftar Film & Video · detail drama), diambil lewat Edge headless lalu diperkecil ke 1120px dan disimpan JPEG q86 (3.405 KB → 724 KB, hemat 79%) di `docs/laporan/gambar/`. Berkas .pptx tetap ramping: **0,5 MB**.

⚠️ **DUA ANGKA DI LAPORAN SEBELUMNYA SALAH, sudah dibetulkan** — ketahuan justru KARENA tangkapan layarnya dipandang:
- **Film & video: 489, bukan ~460.** Halaman `/film` mencetak sendiri *"Menampilkan 1–24 dari 489 judul"*. Angka ~460 saya dapat dari menghitung judul unik di HTML mentah — cara itu meleset. HANDOFF sendiri sudah menyebut "489 video" di 5 tempat, jadi sebenarnya bisa disilang-periksa sejak awal.
- **Drama berseri: 42, bukan 41.** Halaman `/katalog` menulis *"42 judul"*, sementara `GET /api/dramas` memulangkan **41** — selisih 1, dugaan ada 1 judul yang disaring dari API. Yang dipakai di slide adalah **angka yang DITAMPILKAN situs**, karena itu yang akan dilihat kalau atasan membuka situsnya sendiri. ❓ Selisih 1 ini belum ditelusuri.
- Akibatnya total katalog di slide: **531 judul** (42 + 489), bukan "~500".

🏷️ **Nama produk vs nama project.** Judul halaman produksi adalah `DramaKu — Nonton Drama China Sub Indo Gratis`, dan navbar menulis **DramaKu**. "dramaapp" hanya nama project di sisi pengembangan. Slide 4 sekarang menyebut keduanya supaya tidak membingungkan atasan.

🔁 **Pemeriksa `_cek-tata-letak.py` diperketat lagi** — versi kemarin masih BUTA terhadap gambar (gambar menutupi apa pun di bawahnya, jadi teks bisa hilang dari layar tanpa error). Sekarang gambar ikut dihitung sebagai blok. **Dan pemeriksanya diuji BISA merah**: satu gambar sengaja digeser menimpa judul slide, pemeriksa melaporkan 2 tabrakan. Pemeriksa yang tak pernah merah tidak membuktikan apa pun.

📄 **Versi PDF ditambahkan** (`2026-11-06-laporan-progress-dramaapp.pdf`, 10 halaman, 960x540 = 16:9, 0,7 MB) karena PowerPoint tidak ada di mesin ini — kalau komputer rapat juga tidak punya Office, laporan tetap bisa ditampilkan. Dicek: 3 gambar benar-benar tertanam di halaman 4, bukan kotak kosong.

❓ **Temuan sampingan, BELUM ditindaklanjuti (di luar permintaan owner):** `GET /api/videos` di produksi membalas `count:0` dengan `skipped:20`, alasan `"tidak ada alamat video": 20`. **Sudah dipastikan ini BUKAN situs rusak** — halaman `/film` tetap menampilkan judul-judul itu ("Americana", "65 (2023)", "Kerajaan Planet Kera" terbaca di HTML produksi), jadi endpoint tersebut melayani keperluan lain (hardlink admin). Layak dicek lain kali apakah 20 video itu memang belum di-hardlink.

---

## 2026-11-05 — ✅ DIRILIS `32ae1c6` + `788a11b`: SELURUH halaman kini berlatar putih

Dua commit: `788a11b` (/shorts, /history, /my-list) lalu `32ae1c6` (halaman akun).

### 🪤 PELAJARAN INTI — PEMETAAN SAYA SENDIRI TIDAK LENGKAP

Saya menutup rilis sebelumnya dengan kalimat *"tinggal 3 halaman: /shorts, /history, /my-list"*.
Owner lalu mengirim tangkapan **/profile** yang juga gelap. Pemetaan saya memang salah: ia dibuat
dengan membaca isi berkas sekilas, bukan memeriksa setiap halaman.

Pemetaan ULANG dilakukan lewat **HTML yang benar-benar dikirim server** untuk SETIAP halaman
penonton — dan yang masih gelap ternyata **LIMA**, bukan satu: `/profile`, `/login`, `/daftar`,
`/lupa-password`, `/video-eksternal`.

⚠️ **Aturan: pernyataan "tinggal sekian lagi" WAJIB berasal dari pemeriksaan menyeluruh, bukan dari
ingatan atas apa yang kebetulan sudah dilihat.** Daftar yang kurang lengkap membuat owner mengira
pekerjaan sudah selesai, lalu menemukan sisanya sendiri satu per satu.

🪤 Jebakan kedua di pemetaan itu: `/discover`, `/` dan `/beranda` sempat terbaca "GELAP" karena
latarnya datang dari KOMPONEN yang dirender di browser, bukan dari berkas halaman — HTML server
hanya berisi kerangkanya. **Memeriksa HTML server saja bisa memberi jawaban yang salah untuk
halaman yang isinya digambar di browser.**

### Cara yang dipakai, dan kenapa BEDA dari halaman katalog

Kelima halaman akun penuh `Card`, `Input`, `Label` dari `components/ui/*` — yang memakai **TOKEN
shadcn**, bukan kelas zinc. Varian `terang:` tidak akan pernah menyentuhnya, berapa pun banyaknya
ditambahkan (dihitung: **123 kelas warna di 6 halaman**). Jadi dipakai cara yang sudah terbukti di
panel admin: **membalik paletnya**.

Kelas `.tema-admin-terang` **digeneralkan** jadi `.tema-terang-penuh` karena kini dipakai di luar
admin. Konstanta `BADAN_TERANG_PENUH` ditambahkan di `shell.ts` lengkap dengan catatan KAPAN
memakai yang mana — ini penting supaya sesi berikutnya tidak salah pilih:

| Konstanta | Dipakai untuk | Kenapa |
|---|---|---|
| `BADAN_TERANG` | halaman KATALOG | komponennya (CatalogCard, FeaturedRow) sudah disiapkan dua-tema lewat varian `terang:` |
| `BADAN_TERANG_PENUH` | panel admin + halaman AKUN | komponennya tak pernah disiapkan; paletnya yang dibalik |

⚠️ **JANGAN pakai `BADAN_TERANG_PENUH` di halaman katalog**: ia membalik `--color-zinc-*`, sehingga
`bg-zinc-100` yang dipakai sebagai latar TERANG di beberapa komponen katalog justru jadi gelap.

### ⚠️ Halaman MENONTON sengaja TETAP gelap

`/watch`, `/tonton`, `/feed` **bukan kelalaian**. Menonton video di latar putih menyilaukan — itu
sebabnya semua situs streaming memakai latar gelap di sana. Keputusan ini disampaikan ke owner,
bukan didiamkan. `/drama/[id]` (halaman detail: sinopsis + daftar episode) juga masih gelap dan
memang pantas putih, tapi butuh pendekatan katalog — sengaja tidak dicampur ke commit ini.

### Bukti

- **1.921 tes hijau**. Penjaga `tests/badan-terang.test.ts` diperluas ke 3 halaman + 2 komponen
  kartu (`DramaCard`, `HistoryCard` — keduanya TIDAK memakai CatalogCard, jadi dukungan terang di
  sana tidak otomatis ikut), dan **diuji MERAH lebih dulu**.
- Pengecualian penjaga diperlebar untuk elemen yang **membawa latar gelapnya sendiri**
  (`bg-black/80` pada tombol hapus di sudut poster) — teks putih di sana memang benar. Sempit
  dengan sengaja: menuntut `bg-black` tertulis di className yang SAMA.
- Build sukses · `tsc` exit 0 · **downtime NOL** (200 di setiap pemeriksaan selama 82 detik).
- **13 halaman** diverifikasi TERANG di produksi, semuanya 200, dan `/profile` dipotret dari situs
  sungguhan.
- 🪤 Gerbang "nol berkas rahasia" menandai `app/lupa-password/page.tsx` — **false positive** dari
  nama berkasnya. Diverifikasi: diff-nya cuma 2 import + 1 baris latar. **Jangan loloskan temuan
  gerbang rahasia tanpa memeriksa isinya, tapi juga jangan panik atas nama berkas.**

---

## 2026-11-05 — ✅ DIRILIS `425cc34`: TIGA perbaikan panel admin (sidebar · warna pucat · saringan IMDb)

Tiga commit terpisah, satu commit satu tujuan: `5d5b116` sidebar · `a625273` warna · `425cc34` saringan.

### 1. 🧭 Satu menu = satu tampilan (`5d5b116`)

**Owner:** *"ketika klik dashboard, tambah drama, daftar drama, admin, 2FA semua kalau di scroll
scroll sudah jadi satu hanya awalnya saja yang beda"*.

**Pengamatannya tepat, dan sebabnya mengejutkan:** kelima menu itu **BUKAN halaman terpisah**.
Semuanya menunjuk `/admin` yang SAMA dan cuma meloncat ke posisi dalam satu halaman berisi **enam
bagian bertumpuk** (form Tambah Drama saja ~30 isian). Begitu digulung, memang menyatu.

🪤 **Bug lama yang ikut ketahuan:** menu **"Keamanan (2FA)" RUSAK** — menunjuk `#keamanan`, dan
**nol elemen** di halaman punya id itu. Diklik tidak membawa ke mana-mana, **tanpa error**, entah
sejak kapan. Ditemukan hanya karena target tiap menu dihitung satu per satu, bukan dibaca sekilas.
⚠️ **Aturan: menu yang menunjuk bagian halaman WAJIB punya penjaga yang memastikan targetnya ada**
— `tests/bagian-admin.test.ts` kini menolak menu yang tak punya cabang render.

Bagian disimpan di **HASH alamat** (`/admin#tambah`), bukan state biasa: tautan menu lama tetap
bekerja, tombol Kembali browser berfungsi, halamannya bisa di-bookmark.

🪤 **Dua urutan yang sengaja dijaga, keduanya diuji MERAH lebih dulu:**
1. **Edit di Daftar Drama MEMBUKA bagian form dulu, baru mengisi.** `loadDramaToForm` menggulung
   ke `#tambah`; kalau bagiannya belum dibuka, elemen itu masih tersembunyi — menggulung ke
   sesuatu yang tak terlihat tidak menghasilkan apa pun, dan tombol Edit **terasa mati**.
2. **Form Tambah Drama DISEMBUNYIKAN (`hidden`), bukan dilepas dari DOM.** Sebagian isian (mis.
   berkas poster yang sudah dipilih) tidak tersimpan di state halaman — melepasnya membuat isian
   itu **hilang diam-diam** tiap admin menengok menu lain.

### 2. 🎨 Teks bernada transparan tak lagi pucat (`a625273`)

**Owner** mengirim tangkapan blok *"Jalur webhook belum menyala"* yang teksnya tak terbaca.

🪤 **PELAJARAN INTI — cara kemarin BOCOR SECARA MENDASAR, bukan sekadar satu blok terlewat.**
Aturan warna ditulis dengan menyebut NAMA KELAS (`.text-rose-100 { … }`). Teks di sana memakai
`text-rose-100/90` — **bertransparansi** — dan Tailwind mencetaknya sebagai kelas **BERBEDA**
(`.text-rose-100\/90`), jadi aturannya **tidak pernah kena**. Hal yang sama berlaku untuk
`hover:text-*`. Menambal per-selector = memburu tiap varian baru selamanya.

**Yang benar: geser VARIABELNYA.** Satu perubahan menutup semua varian sekaligus — transparansi
memakai `color-mix(… var(--color-x) …)` dan hover memakai variabel yang sama. Lalu warna asli
**DIKEMBALIKAN** khusus untuk LATAR & GARIS supaya tombol kuning tidak ikut menggelap; daftarnya
dihitung dari pemakaian nyata (hanya nada 300–400 yang bentrok, nada 500+ tak pernah digeser).

⚠️ **Aturan umum: saat menimpa warna Tailwind, targetkan VARIABEL — bukan nama kelas.** Nama kelas
tidak pernah menangkap varian transparansi maupun `hover:`.

### 3. 🔍 Saringan "sudah / belum ada IMDb" (`425cc34`)

**Owner:** *"tambahkan filter mana yang sudah ada imdb mana yang belum biar mudah"*. Daftar berisi
**489 video, 370 sudah dicocokkan** — mencari 119 sisanya berarti menggulung seluruh daftar sambil
memeriksa satu per satu.

Tiga tombol beserta angkanya, dihitung dari state sehingga **bergerak seketika** tiap satu video
selesai dicocokkan. Dua hal ikut dipasang karena pasti membingungkan kalau tidak ada: keterangan
bahwa video memang **HILANG** dari daftar "Belum" begitu selesai (tanda berhasil, bukan terhapus),
dan pesan yang **MEMBEDAKAN** "semua sudah dicocokkan" dari "tidak ada video".

💡 Penjaga terpenting: **"Sudah" + "Belum" wajib sama persis dengan "Semua"**. Kalau sebuah video
tidak masuk kelompok mana pun, ia tak terlihat di KEDUA saringan — hilang dari pandangan admin
tanpa gejala.

### 🪤 PELAJARAN VERIFIKASI (lanjutan dari rilis sebelumnya)

Saat memeriksa rilis ini, pola `bg-amber-400{background-color:` **tidak ketemu** di CSS produksi —
nyaris dilaporkan sebagai aturan yang hilang. Sebabnya **minifier MENGGABUNGKAN selector**:
`.tema-admin-terang .bg-amber-400,.tema-admin-terang .hover\:bg-amber-400:hover{…}`. ⚠️ **Saat
mencari aturan CSS di berkas hasil build, jangan berasumsi bentuknya sama dengan yang ditulis** —
cocokkan potongan yang longgar, lalu bandingkan dengan CSS build LOKAL sebelum menyimpulkan hilang.
Hal serupa terjadi pada bundle JS: saringan IMDb dicari di bundle `/admin` padahal ia hanya dimuat
di `/admin/videos/playly`.

### Bukti

- **1.916 tes hijau** (+17 penjaga baru di 2 berkas). Urutan Edit dan penyaringan daftar
  masing-masing **diuji MERAH lebih dulu**.
- Build sukses · `tsc` exit 0 · **downtime NOL** (http=200 di setiap pemeriksaan selama 84 detik).
- Smoke test produksi **10 alamat** semua 200 · `/api/health` → `{"ok":true,"sumberData":"database"}`.
- Ketiganya diverifikasi hidup di produksi: variabel warna baru di CSS publik, `kelola-admin` di
  bundle `/admin`, dan "Belum ada IMDb" di bundle `/admin/videos/playly`.

### ⚠️ Batas jujur

Ketiganya ada di halaman ber-login, jadi **tidak bisa dipotret dari luar** — bukti tampilannya dari
render komponen asli + CSS hasil build. Penilaian akhir ada pada owner.

---

## 2026-11-05 — ✅ DIRILIS `0cc1758`: PANEL ADMIN berlatar terang, seragam dengan beranda

**Permintaan owner:** *"di admin kamu buat juga latar belakangnya sama dengan beranda jadi semua
dashboard semua sinkron"*.

### ⭐ 477 warna dibalik TANPA menyentuh satu pun berkas komponen

Panel admin memakai **477 kemunculan** kelas warna gelap (`text-white`, `text-zinc-400`,
`bg-zinc-900`, …) di **4 halaman + 18 komponen**. Menempelkan varian `terang:` satu per satu
seperti yang dilakukan di `/discover` jelas tidak sepadan — dan yang terlewat SATU saja langsung
jadi teks tak terbaca, tanpa error apa pun.

Jalan keluarnya ditemukan dengan **memeriksa CSS hasil build, bukan mengira-ngira**: Tailwind v4
di project ini mencetak warna sebagai VARIABEL —
`.text-zinc-400{color:var(--color-zinc-400)}`. Jadi cukup mendefinisikan ulang variabelnya di
satu pembungkus: seluruh kelas zinc di dalamnya terbalik sekaligus. Skalanya DIBALIK (zinc-900 →
putih, zinc-100 → hampir hitam) supaya hierarki kontras yang sudah dirancang tetap utuh.

Saklarnya di `app/admin/layout.tsx` — **bukan di tiap halaman**, dengan alasan yang sama seperti
gerbang akses di berkas itu: halaman admin BARU ikut terang sendiri tanpa penulisnya perlu ingat.

### 🪤 TIGA jebakan senyap — semuanya lolos build+tsc+tes, ketahuan karena DIPANDANG

| # | Jebakan | Kenapa senyap |
|---|---|---|
| 1 | **`body` mewariskan warna yang sudah TERLANJUR dihitung.** `body` memasang `color: var(--foreground)`; nilainya dihitung SEKALI di `<body>` (tempat --foreground masih terang) lalu diwariskan sebagai PUTIH yang sudah jadi — bukan dihitung ulang di dalam pembungkus. | Isi `<input>`, `<label>`, dan teks dalam `Card` tampil **putih di atas kertas putih**. Obatnya menyatakan ulang `color` di dalam pembungkus. |
| 2 | **Satu variabel, DUA peran.** Percobaan pertama menggelapkan `--color-amber-400` supaya teks aksen terbaca. Salah: amber-400 juga jadi latar **10 TOMBOL UTAMA** yang tulisannya `text-black`. | Tombol kuning berubah jadi **cokelat tua bertulisan hitam** — nyaris tak terbaca, justru pada tombol yang paling sering ditekan. Perbaikannya: gelapkan **warna teksnya saja** (`.tema-admin-terang .text-amber-400`), biarkan variabelnya. |
| 3 | **`components/ui/*` tidak memakai kelas zinc.** Input, Card, Table, Select, Textarea memakai TOKEN shadcn (`bg-card`, `border-input`, `text-foreground`). | Kotak isian & tabel tetap **hitam di tengah halaman putih**. Tokennya ikut dibalik di blok yang sama. |

`--color-black` **sengaja TIDAK dibalik** (12 `text-black`, semuanya di atas tombol kuning).
Warna AKSEN dibiarkan: artinya terikat makna (kuning = tindakan utama, merah = bahaya), bukan
terikat terang-gelap — hanya nada teksnya yang digeser agar terbaca di atas putih.

### 🪤 DUA kesalahan METODE VERIFIKASI saya sendiri — nyaris salah lapor

Sesudah push, saya **nyaris melaporkan "deploy gagal"** padahal sudah tayang. Dua-duanya salah
alat ukur, bukan salah sistem:

1. **Memantau penanda di `/admin` yang MUSTAHIL muncul.** Tanpa sesi admin, layout memulangkan
   `<AdminAccessDenied />` pada baris SEBELUM pembungkus tema dipasang — jadi penandanya memang
   tak akan pernah ada di sana, berapa lama pun ditunggu. Ditunggu 8 menit sia-sia.
2. **Hanya memeriksa berkas CSS PERTAMA.** Halaman memuat DUA chunk CSS; `head -1` mengambil yang
   tidak berisi globals. Ditunggu 8 menit lagi. Begitu SEMUA chunk diperiksa, penandanya langsung
   ketemu di chunk kedua.

⚠️ **Aturan: saat memverifikasi rilis, periksa SEMUA kandidat — jangan ambil yang pertama — dan
pastikan dulu penanda yang dipantau memang BISA muncul di tempat yang diperiksa.** Menunggu lebih
lama tidak pernah memperbaiki alat ukur yang salah.

### Bukti

- **1.898 tes hijau** (+7 penjaga `tests/tema-admin-terang.test.ts`). Ketiga jebakan di atas
  masing-masing **diuji MERAH lebih dulu** dengan menghidupkannya kembali satu per satu.
- 🪤 Penjaganya sendiri sempat **LOLOS PALSU**: ia membaca teks `globals.css`, dan komentar di
  dalam blok itu MENGUTIP aturan yang sedang dicari — jadi pencariannya menemukan kalimat
  penjelasnya, bukan aturan CSS-nya. Dibuktikan dengan melepas baris aslinya: tes tetap hijau.
  Diperbaiki dengan membuang komentar sebelum memeriksa. **Pelajaran: tes yang membaca teks
  berkas bisa tertipu oleh komentar yang mengutip polanya.**
- Build sukses · `tsc` exit 0 · diperiksa lewat **potret layar** hasil render komponen admin asli
  (panel normal, panel saat Playly bermasalah, layar Akses ditolak, kotak isian + Card).
- Terbukti tayang di produksi: chunk CSS publik memuat `tema-admin-terang`, `--color-white:#18181b`,
  `color:var(--foreground)`, dan token `--card`.

### ⚠️ Batas jujur

Halaman admin butuh login, jadi **tidak bisa dipotret dari luar** — bukti tampilannya dari render
komponen asli + CSS hasil build, bukan dari layar produksi. Penilaian akhir ada pada owner.

---

## 2026-11-05 — ✅ DIRILIS `1dd0fd0`: panel admin Playly tak lagi hilang saat Playly lambat

**Laporan owner:** *"Dropdown paling kiri aku tidak ketemu"* + tangkapan layar halaman admin
yang memperlihatkan kotak kuning **"Gagal mengambil daftar video: Playly tidak menjawab dalam
10 detik."**

### 🪤 PELAJARAN INTI — FITUR BARU BISA TAK TERJANGKAU WALAU KODENYA BENAR

Dropdown Jenis yang baru dirilis `2f8fb6f` **memang tidak ada di layar owner** — bukan terlewat,
bukan salah lihat. `PlaylyVisibilityManager` menyembunyikan **dirinya sendiri** begitu pengambilan
daftar gagal:

```tsx
if (fetchError) { return <kotak peringatan /> }   // SELURUH panel diganti
```

Playly telat menjawab 10 detik → daftar video beserta **ketiga** dropdown-nya (Jenis, Kategori,
Kualitas) lenyap → owner tidak bisa menandai apa pun sampai Playly kebetulan sedang cepat.

**Yang membuatnya mahal: tidak ada error di mana pun.** Halaman admin tetap 200, build hijau,
1.886 tes hijau, `tsc` exit 0 — dan fiturnya tetap tak terpakai. Seluruh gerbang pra-rilis lolos
sempurna sementara alat kerjanya tak bisa dibuka.

⚠️ **Aturan untuk fitur berikutnya: "kode benar + tes hijau" BUKAN "owner bisa memakainya".**
Sesudah merilis fitur yang dipakai lewat panel admin, telusuri juga **jalan menuju panelnya** —
apa saja yang bisa membuat panel itu tidak tergambar. Pola ini kembar dengan pelajaran 2026-10-29
("BERKAS ADA ≠ ADA JALAN KE SANA"): di situ halaman hidup tapi tautannya putus, di sini komponen
benar tapi panelnya menyembunyikan diri.

### Kenapa rapuh — dan kenapa halaman PENONTON tidak

`fetchPlaylyVideosKita` di halaman admin sengaja **tanpa cache** (`revalidateSeconds = 0`) supaya
admin melihat keadaan sekarang. Konsekuensinya: saat gagal ia memulangkan `{ videos: [], error }`
— daftar KOSONG, **nol jalur cadangan**. Sementara halaman penonton sudah lama kebal terhadap
gangguan yang sama lewat salinan terakhir (`getPlaylyCadanganCached`, jaring dari insiden
2026-09-26 saat Playly membalas HTTP 402).

### Yang diperbaiki

| # | Isinya |
|---|---|
| 1 | Panel menyerah **hanya** kalau `fetchError` **DAN** daftarnya kosong. Selama ada video, panel tetap bekerja dan peringatannya turun jadi spanduk di atas daftar. |
| 2 | Halaman admin memakai `getPlaylyVideosGabunganCached()` sebagai cadangan — **bukan mekanisme baru**, melainkan jaring yang sudah melindungi halaman penonton. Hanya dipanggil SAAT GAGAL, jadi jalur normal nol beban tambahan. |
| 3 | `PlaylyUnduhanManager` ikut memakai daftar berjaring yang sama (gejalanya kembar: "Belum ada video di akun Playly kita"). |

Syaratnya sengaja **"gagal DAN kosong"**, bukan "gagal" saja: kalau pengambilan bermasalah tapi
masih membawa video, data segar itu yang dipakai — salinan tidak boleh menggeser yang lebih baru.

⭐ Penandaan dari daftar cadangan **TETAP sah**: Jenis/Kategori/Kualitas disimpan ke database KITA
(`app_data`), bukan ke Playly. Jadi bekerja dari salinan tidak membuat hasilnya meleset.

### Bukti

- **1.891 tes hijau** (+5 penjaga `tests/panel-playly-tahan-gangguan.test.ts`), **diuji MERAH
  lebih dulu**: perilaku lama dipasang kembali → 2 tes langsung gagal → hijau sesudah dipulihkan.
- Build sukses · `tsc` exit 0 · downtime **NOL** (http=200 di 8 percobaan berturut selama 87 detik).
- Smoke test produksi 6 alamat semua 200 · `/api/health` → `{"ok":true,"sumberData":"database"}`.
- `/admin/videos/playly` tanpa sesi → **"Akses ditolak"** (pagar admin tetap utuh).

### ⚠️ Batas jujur

Perubahan ini ada di halaman yang **butuh login admin**, jadi **tidak bisa diverifikasi dari luar**
— bukti tampilannya dari tes render + potret lokal, bukan dari layar produksi. Verifikasi akhir
ada pada owner: buka panel admin → Video Playly → dropdown **Jenis** harus ada di tiap baris,
bahkan saat spanduk peringatan Playly sedang muncul.

---

## 2026-11-05 — ✅ DIRILIS `d04a952`: latar PUTIH seragam di /discover, /film, /katalog

**Permintaan owner:** *"perbaiki juga background di jelajah drama, aksi, anime karena aku mau semua
seragam backgroundnya jadi sama dengan beranda (putih)"* + *"bisa kamu buka di lokalhost saja"*.

### 🪤 PELAJARAN INTI — mengganti latar MENYINGKAP teks yang selama ini "aman"

Ini bukan pekerjaan ganti satu kelas `bg-black`. Latar putih **menyingkap** setiap teks yang
selama ini mengandalkan latar gelap: judul **"Jelajah Drama & Film"** ber-`text-white` akan
**HILANG TOTAL** (putih di atas putih) begitu latarnya diputihkan. **Nol error, build tetap hijau,
halaman tetap 200** — satu-satunya yang bisa menangkapnya adalah mata atau penjaga tes.

Yang diberi pasangan varian `terang:` — **25 warna** di 4 berkas:

| Berkas | Isinya |
|---|---|
| `DramaBrowser.tsx` | judul, hitungan "22 drama · 187 film", garis, tombol Hapus filter, blok kosong |
| `HasilPlayly.tsx` | judul "Film & Video Lainnya", keterangan, tautan "Lihat semua" |
| `PlaylyVideoGrid.tsx` | judul kartu, border, **latar placeholder sampul** (tadinya kotak hitam pekat di atas kertas putih) |
| `app/film/page.tsx` | header + blok "belum ada video" |

⭐ Warnanya **dipusatkan di satu konstanta** `BADAN_TERANG` (`app/components/beranda/shell.ts`).
Ganti nuansa nanti = satu baris, bukan lima berkas yang salah satunya pasti tertinggal lalu belang.
Penjaganya langsung menemukan temuan nyata: **`BadanKatalog` ternyata menulis kelasnya sendiri** —
sudah dialihkan ke konstanta.

⚠️ `min-h-screen` pada badan terang `/discover` **bukan hiasan**: tanpa itu, hasil pencarian yang
cuma beberapa judul meninggalkan **pita HITAM** di bawah halaman (latar `<body>` menembus dari
belakang) — hasilnya justru lebih belang daripada sebelum diseragamkan.

### 🪤 PELAJARAN KEDUA — port localhost di mesin ini BUKAN MILIK KITA

Server lokal dinyalakan di port **3100**, lalu `/discover` `/film` `/katalog` semua membalas
**404** padahal `/` membalas 200. Penyebabnya BUKAN kode: `netstat` menunjukkan **dua** proses
listening di 3100, dan `taskkill` atas PID-nya ditolak **"Access is denied"** — bukti port itu
milik **penyewa lain** di server RDP bersama ini. Permintaan curl mendarat di situs orang lain.

**Aturan: sebelum percaya hasil dari localhost, pastikan yang menjawab benar-benar situs kita** —
cek `netstat -ano | grep ":<port>"` (harus satu proses, dan PID-nya bisa kita matikan), lalu
verifikasi isi balasannya memuat penanda situs kita. Dipakai port **3131** sesudah itu.

### Bukti

- **1.886 tes hijau** (+10 penjaga baru `tests/badan-terang.test.ts`). **Diuji MERAH lebih dulu**:
  varian terang judul dilepas → 2 tes langsung gagal → hijau lagi sesudah dipulihkan.
- Penjaganya menjaga DUA hal yang kalau putus merusak senyap: (a) saklar `tema-terang` + latar
  selalu berpasangan; (b) tiap `text-white` di komponen dalam badan terang punya pasangan
  `terang:`. Pengecualian HANYA untuk ikon ber-`fill-white` (tombol play di ATAS gambar, bukan di
  atas kertas putih) — sempit dengan sengaja, bukan kelonggaran demi meloloskan kerja sendiri.
- `npm run build` sukses · `npx tsc --noEmit` **exit 0** (urutan build→tsc).
- Diperiksa lewat **potret layar sungguhan** 1440px, bukan nalar: `/discover`, `?cat=Action`,
  `?cat=Comedy`, `/film`, `/katalog` — lokal DAN produksi sesudah tayang.
- Smoke test produksi 8 alamat: semua **200**.

### Yang SENGAJA belum diseragamkan

`/shorts`, `/history`, `/my-list` masih gelap. Ketiganya bukan halaman katalog — dua terakhir
halaman akun pribadi, dan `/shorts` isinya video pendek tegak yang memang lazim berlatar gelap.
Menunggu keputusan owner; polanya tinggal diterapkan kalau diminta.

---

## 2026-11-05 — ✅ DIRILIS `2f8fb6f`: serial Playly dipisahkan dari "Film Terbaru"

**Keluhan owner:** *"rekan saya upload drama dari playly tapi masuknya ke film terbaru, harusnya
masuk ke series terbaru"* + tangkapan layar halaman depan, kotak merah di **"Pemuda Miskin Mata
Tembus Pandang Jadi Miliarder"** (durasi 2:00).

### Akar masalahnya BUKAN salah logika — fiturnya memang belum pernah ada

`TabKatalogTampilan.tsx` menggambar seksi "Film Terbaru" dengan `videos.map(bungkusVideo)` —
**SELURUH** video Playly, tanpa penyaringan apa pun. Playly tidak pernah mengirim penanda jenis
(`PlaylyWebhookVideo` cuma berisi judul, durasi, sampul, tahun, genre bebas), jadi situs memang
tidak punya cara apa pun untuk membedakan film dari episode serial.

**Ini bukan cuma 1 drama.** Judul berseri lain yang ikut salah tempat di 489 video produksi:
Transformers *Chapter 1–7*, *THE VESSEL Episode 1*, `Outlander S07E15`,
`All of Us Are Dead SEASON1EPISODE2`, `Imitation (2023) - E02`, `KONO EXPRESS Bab 2`.

❗ **Jalur resmi yang sudah ada ternyata NOL dipakai.** Fitur "kaitkan video → drama + episode"
(`/api/admin/playly/embeds`) sudah lengkap sejak lama, tapi **489 dari 489** video `dramaTitle`-nya
`null` dan `episode`-nya `null`. Tidak pernah dipakai sekali pun.

### 🪤 PELAJARAN INTI — tebakan otomatis DIUKUR DULU, lalu DITOLAK

Godaan pertama: tebak dari judul & durasi, supaya owner tak perlu klik apa pun. Diukur dulu di
489 video produksi sebelum ditulis, dan hasilnya **menggugurkan pendekatan itu**:

| Penanda | Hasil nyata |
|---|---|
| Pola judul (`Chapter N`, `Ep N`, `SxxEyy`, `Bab N`) | cocok **18 dari 489**, dan **2 di antaranya FILM**: "John Wick Chapter 4", "Kantara A Legend Chapter 1" → akan salah pindah ke Series |
| Judul yang dikeluhkan owner | **TIDAK terdeteksi** — "Pemuda Miskin…" tak punya angka episode |
| Durasi | **282 dari 489 (58%)** durasinya `null`; Playly tak mengirimnya |

Meleset **DUA arah sekaligus**, dan melesetnya **SENYAP** — nol error, cuma judul yang duduk di
baris salah. **Aturan: sebelum memilih tebakan otomatis demi "hemat klik", ukur dulu akurasinya di
data produksi yang sebenarnya.** Owner memilih penanda manual sesudah melihat angka ini.

### 🪤 JEBAKAN KEDUA — ditemukan sebelum sempat tayang

`app/page.tsx` memotong `videos.slice(0, TAB_GRID_ITEMS)` **SEBELUM** daftarnya sampai ke tampilan.
Kalau pemisahan film/serial dilakukan di komponen, seksi Film **menyusut sendiri** (20 kartu jadi
19) setiap kali ada serial di 20 teratas — dan karena video terbaru selalu di depan, justru upload
terbaru yang paling sering memicunya. Tak ada error, cuma baris yang mengecil.
**Pemisahan WAJIB mendahului potongan**, dan penjaganya membaca berkas halaman untuk memastikannya.

### Yang dibangun

| Berkas | Isinya |
|---|---|
| `lib/jenis-video.ts` | aturan MURNI: allowlist, bawaan, pemisah, batas jatah seksi |
| `playly:jenis` (`lib/store.ts`) | peta `videoId -> jenis`, pola persis `playly:kualitas` |
| `app/api/admin/playly/jenis/route.ts` | GET + POST, pagar disalin dari endpoint `/genre` |
| `PlaylyVisibilityManager.tsx` | dropdown **Jenis: Film / Series** per video |
| `app/page.tsx` + `app/beranda/page.tsx` | pisah DULU, baru potong |
| `tests/jenis-video.test.ts` | **11 penjaga**, diuji MERAH lebih dulu |

⭐ **Bawaannya `film`, jadi NOL video berpindah sampai owner menandai** — perubahan ini tidak
mengubah apa pun di situs sampai ada yang disentuh di panel admin.

💡 Pre-mortem yang ikut ditutup: jatah serial di seksi dibatasi **6**
(`MAKS_SERIES_PLAYLY_DI_SEKSI`). Tanpa itu, rekan yang meng-upload 30 episode akan memenuhi seluruh
seksi dengan kartu berjudul hampir sama dan **mendorong keluar drama katalog owner**.

### Bukti

- **1.876 tes hijau** (naik dari 1.865; +11 penjaga baru). **Diuji MERAH lebih dulu**: 2 tes gagal
  saat perilaku lama sengaja dipasang kembali, hijau lagi sesudah dipulihkan.
- `npm run build` sukses · `npx tsc --noEmit` **exit 0** (urutan build→tsc, sesuai pagar).
- `/`, `/beranda`, `/film` tetap **○ Static** di keluaran build — pembacaan baru memakai varian
  ber-cache, jadi halaman tidak jadi dibangun ulang tiap pengunjung.
- Endpoint baru membalas **401** untuk GET maupun POST tanpa sesi admin (diuji di server lokal
  port 3117, server dimatikan lewat PID dan dipastikan mati: `http=000`).
- Smoke test 5 halaman: `/` `/beranda` `/film` `/katalog` `/discover` → semua **200**.

### ⏳ Yang MASIH perlu dilakukan owner

✅ Sudah dirilis `d04a952` (2026-11-05, tayang ±88 detik, downtime NOL).

1. **Sekarang:** buka panel admin → **Video Playly** → cari "Pemuda Miskin Mata Tembus
   Pandang Jadi Miliarder" → dropdown paling kiri ubah **Film → Series**. Tunggu ±1 menit, muat
   ulang halaman depan. Tanpa langkah ini situs tidak berubah sama sekali (itu disengaja).

### ⚠️ Batas jujur

- Halaman `/film` **sengaja TIDAK disaring** — judulnya memang "Film & Video" dan di sanalah sisa
  episode tetap terjangkau. Menyaringnya justru membuat episode ke-7 dst. tak bisa ditemukan.
- **Pengelompokan banyak episode jadi SATU kartu serial belum dibangun** — hari ini baru 1 video
  serial, jadi membangunnya sekarang = membangun yang belum dibutuhkan. ❓ Perlu ditinjau ulang
  begitu satu judul punya **>5 episode** di Playly.
- Daftar video serial yang tampil belum pernah dilihat di situs sungguhan (video Playly butuh kunci
  API yang hanya ada di produksi), jadi **bukti tampilannya dari tes render**, bukan dari layar.

---

## 2026-11-05 — 🔁 VERIFIKASI SILANG 3 SESI (2026-11-03) + koreksi catatan yang BASI

Owner: *"push lalu update handoff dari 3 sesi."* Nol kode aplikasi diubah — ini pekerjaan
mencocokkan catatan dengan kenyataan git.

### ❗ Push yang diminta ternyata SUDAH dilakukan sesi lain

Commit audit `4f28886` masih tercatat "belum di-push" di sesi sebelumnya. Faktanya ia **sudah ada
di `origin` dan `dramaku`**, lalu disusul 6 commit lain. Tidak ada yang perlu didorong.

🪤 **Pelajaran: "belum di-push" di catatan sesi lama TIDAK BOLEH dipercaya mentah.** Repo ini
dikerjakan dari beberapa sesi; status git **wajib dicek ulang** dengan `git fetch` + bandingkan
`origin/main..HEAD` sebelum mengambil kesimpulan apa pun — bukan dibaca dari HANDOFF.

### Peta 7 commit di 2026-11-03 (semua author `masradenbagus89-ui`)

| commit | jam | isi | sesi |
|---|---|---|---|
| `88d3429` | 10:55 | fitur suara pemutar (Volume Stabil + Penguat) | suara |
| `6abb28b` | 10:56 | surat permintaan izin CORS ke rekan Playly | suara |
| `2c9a10d` | 15:12 | izin CORS terpasang — fitur suara aktif | suara |
| `d12d913` | 15:38 | prototype `drama-ai-studio/` masuk repo | studio |
| `3c95388` | 15:45 | catat rilis `88d3429` di HANDOFF | catatan |
| `f0bcd84` | 15:46 | betulkan baris "Rilis terakhir" | catatan |
| `836a0b1` | 15:49 | buang `uji-tts4.mjs` (49 baris sisa percobaan) | studio |

Ketiga sesi (audit HP+Tablet · fitur suara · studio AI) **sudah punya seksinya masing-masing** di
berkas ini. Yang kurang hanyalah status yang terlanjur basi — dibetulkan di bawah.

### Yang DIBETULKAN hari ini

1. **Ringkasan atas** masih menulis studio *"Belum di-commit"* → kini ✅ sudah di-commit + push.
2. **Seksi studio** masih menulis *"Status git: NOL commit, nol push, 24 berkas"* → kini angka
   nyata: **26 berkas ter-track**, `node_modules/` + `keluaran/` terbukti terabaikan, **nol
   berkas rahasia**. Dua MP4 hasil prototype (24 MB + 22 MB) ada di disk tapi **tidak** masuk repo
   — sesuai rancangan.
3. **`antrean-deploy.md`** masih berhenti di `784460c` → disegarkan ke `836a0b1`.

### Keadaan sekarang

`HEAD` = `origin/main` = `dramaku/main` = **`836a0b1`**, selisih 0/0, working tree bersih.
**Nol antrean rilis.** Situs produksi tidak tersentuh oleh pekerjaan ini.

---

## 2026-11-03 — ✅ DIRILIS `88d3429`: Volume Stabil & Penguat suara AKHIRNYA BERFUNGSI (izin Playly terpasang hari itu juga)

**Keluhan owner:** *"tombol volume dan penguat suara belum berfungsi"* (tangkapan layar menu pemutar:
dua baris abu bertuliskan *"tidak tersedia untuk video ini — sumbernya tidak mengizinkan suara diolah"*).

### Dugaan pertama SALAH, dan selisihnya besar

Dugaan awal: fiturnya ada, cuma terkunci gerbang CORS. **Yang sebenarnya:** kedua sakelar dipasang
**MATI PERMANEN** di `PlaylyPlayer` (`aktif: false, onUbah: () => undefined`), dan di SELURUH project
**nol `AudioContext`** — mesinnya memang tidak pernah dibangun. Yang tampil di menu cuma cangkangnya.
Jadi pekerjaannya bukan "membuka gerbang", melainkan **membangun fiturnya dari nol**.

### Yang dibangun

| Berkas | Isinya |
|---|---|
| `lib/olah-suara.ts` | setelan kompresor + batas penguat + gerbang izin (fungsi murni) |
| `app/components/player/useOlahSuara.ts` | rantai `video → kompresor → penguat → speaker` |
| `PlaylyPlayer.tsx` | sakelar tersambung sungguhan + pemeriksaan izin sebelum render |
| `tests/olah-suara.test.ts` | **21 penjaga** |

**Volume Stabil** = meratakan suara (dialog bisik vs ledakan tak lagi berbeda jauh).
**Penguat suara** = menaikkan MELEWATI 100% — mustahil lewat `video.volume` yang mentok di 1.0.

### Gerbangnya diperlonggar, TAPI TIDAK dilemahkan

Syarat lama `seOrigin()` hanya menerima berkas dari domain sendiri — padahal Web Audio juga boleh
menyentuh berkas domain lain **asal servernya mengizinkan**. Sekarang izin itu **DIUJI**, bukan
diasumsikan: diambil 1 byte (`Range: bytes=0-0`, `mode: "cors"`) sebelum video dirender.

⚠️ **JANGAN pernah menggantinya jadi `mode: "no-cors"` supaya "lebih mudah lolos"** — permintaan
seperti itu SELALU terlihat berhasil (opaque response) padahal izinnya tidak ada, dan hasilnya persis
bencana yang dihindari: **video bisu total**, gambar jalan tapi suara hilang, tanpa satu pun error.

Pemeriksaan sengaja dari **BROWSER**, bukan server kita: izin CORS dinilai per-origin peminta dan
server kita bukan penonton — sekalian menghindari server kita menembak alamat dari pihak luar (SSRF).

### Izin Playly TERPASANG hari itu juga — fitur hidup TANPA rilis ulang

Surat permintaan dikirim owner ke rekan Playly (cantika), dan mereka memasangnya hari itu.
**Diverifikasi sendiri, bukan sekadar percaya laporan mereka:**

```
HTTP/1.1 206 Partial Content
Access-Control-Allow-Origin: https://dramaapp-production-9e88.up.railway.app
Access-Control-Expose-Headers: Content-Length,Content-Range,Accept-Ranges
```

Dan di DOM halaman tonton produksi, elemen `<video>` kini membawa **`crossorigin="anonymous"`** —
atribut itu HANYA dipasang kalau pemeriksaan izin berhasil, jadi inilah bukti gerbangnya terbuka.
Video tetap dimuat normal (durasi terbaca). **Itu yang paling dikhawatirkan:** izin yang kurang
lengkap membuat video **GAGAL TOTAL**, bukan sekadar fitur mati.

⭐ **Perancangannya terbukti benar:** fitur menyala sendiri begitu izin terpasang, nol deploy.

### 🔴 BATAS YANG BELUM TERTUTUP — bunyinya BELUM pernah didengar siapa pun

Mesin kerja ini server **tanpa perangkat suara**. Diukur hari itu: di browser tanpa layar
`AudioContext` melapor `state: running` tapi grafiknya **tidak pernah diproses** — semua pengukuran
RMS memulangkan **0.00000**, dan itu terbaca persis seperti "fiturnya tidak bekerja" padahal bukan.
`OfflineAudioContext` pun tidak pernah menyelesaikan render di sana.

Yang terbukti: aturan & angkanya (21 tes dengan node tiruan), pemutar utuh, build + `tsc` + 1.865 tes.
**Uji dengar WAJIB manusia.** Yang dicari: Volume Stabil → lebih rata (gejala salah: suara "memompa"
atau jadi datar); Penguat suara → jelas lebih keras (gejala salah: pecah/serak).
Angkanya di SATU tempat: `lib/olah-suara.ts` — `SETELAN_VOLUME_STABIL` dan `PENGUAT_MAKS` (kini 2×).

### Yang perlu diingat nanti

- Kedua tombol **bawaannya MATI** — hanya aktif kalau penonton menyalakannya sendiri, jadi penonton
  yang tak menyentuhnya nol terpengaruh.
- ⚠️ **Playly mengizinkan ALAMAT SITUS INI SAJA.** Kalau DramaKu pindah ke domain sendiri, daftar
  origin WAJIB dikirim ulang ke mereka — kalau tidak, fitur suara mati lagi di domain baru.
- Rencana mundur: `git revert 88d3429` lalu dual push. Nol database, nol env.
- Status + bukti + tabel uji dengar: `docs/permintaan-izin-suara-ke-playly.md`.

### 🪤 Dua jebakan alat yang nyaris dilaporkan sebagai "fitur rusak"

1. **Server lama menahan port → halaman tampil HITAM KOSONG.** `next start` kedua gagal
   `EADDRINUSE` **di log, bukan di layar**; yang melayani tetap proses LAMA, dan karena `.next` sudah
   dibangun ulang di bawahnya, berkasnya hilang. Selalu matikan lewat PID + buktikan port kosong.
   ⚠️ Hari itu port 3017 dipakai **penyewa lain** (Stop-Process: *Access denied*) — jangan dipaksa,
   pakai port lain.
2. **Autoplay bersuara mustahil diuji di browser tanpa layar.** Trik "mulai bisu lalu buka suara"
   TIDAK berlaku di sini: begitu elemen media disambungkan ke Web Audio, browser tak lagi
   menganggapnya bisu dan tetap menuntut klik manusia.

---

## 2026-11-03 — 🎬 BARU: `drama-ai-studio/` — studio produksi drama pendek AI, prototype episode 1 TERBUKTI jadi MP4

Permintaan owner: sistem produksi serial drama China 10 episode yang keluarannya **video MP4 betulan**, mulai dari prototype 1 episode. Dibangun sebagai **sub-proyek terisolasi** `drama-ai-studio/` — `package.json` + `node_modules` sendiri, kode `.mjs`. **Repo induk nol tersentuh**: `build` sukses, `tsc --noEmit` **exit 0**, `npm test` **1844 tes / 128 berkas hijau**. Rencana lengkap: `docs/lintasai/rencana/2026-11-03-studio-drama-ai.md`.

**Hasil putaran 1** — `drama-ai-studio/keluaran/episode-01/episode-01.mp4`: 1080×1920 (9:16) · h264 · **97,04 detik** · 18 shot · 11 baris dialog · 15,1 MB · audio AAC puncak −17,6 dB · subtitle Mandarin + Indonesia **terbakar di dalam gambar**.

⚠️ **BATAS JUJUR yang wajib diingat sesi berikutnya:** yang dihasilkan sekarang **animatic**, BUKAN video AI fotorealistis. Lapisan gambarnya kartu sinematik bergerak; naskah, timing, subtitle, audio, penyambungan, dan ekspor MP4 sudah final. Tiap frame mencetak `PRATINJAU · ANIMATIK · BELUM VIDEO AI`. Mesin video berbayar **sengaja belum disambungkan** — nol kunci API di mesin ini, dan menebak bentuk permintaan API berarti membelanjakan uang owner untuk permintaan yang mungkin salah. Menyalakannya nanti hanya menukar lapisan gambar & suara.

🪤 **Lima jebakan yang SEMUANYA lolos dari "ffmpeg exit 0" dan dari seluruh tes:**
1. **`WrapStyle: 2` di ASS MEMOTONG subtitle, bukan membungkusnya** — kalimat Indonesia panjang terpotong rata di kedua tepi layar, nol error, berkas valid. Ketahuan **hanya karena frame hasil diambil lalu dipandang**. Pola yang sama persis dengan tombol-aksi 2026-10-30: **kerusakan LEBAR cuma bisa dibuktikan dengan melihat.**
2. **"Ada jalur audio" ≠ "ada bunyinya"** — `adaAudio: true` lolos padahal puncaknya −34,8 dB alias praktis senyap (`amix` membagi level per masukan). Perbaikannya `normalize=0` + penguat terukur → −17,6 dB. **Ukur `volumedetect`, jangan percaya keberadaan stream.**
3. Gradasi ffmpeg `circular`/`spiral` menggambar baji bertepi tajam yang terbaca seperti glitch → hanya `linear` & `radial`.
4. Kartu judul mencetak judul EPISODE sebagai nama serial → judul serial & episode kini dibawa terpisah.
5. **`.gitignore` induk baris 86 (`.env*`) ikut menelan `.env.example`.** Yang DITOLAK: menambah pengecualian di penjaga rahasia demi meloloskan kerja sendiri (§5.3, persis pelajaran `secret-guard` 2026-10-15). Yang DIAMBIL: berkasnya dinamai `env.contoh.txt`; diuji bahwa `.env` sungguhan tetap terabaikan.

**Pagar biaya** (4 jalur penolakan, masing-masing punya tes): butuh kunci API **dan** `STUDIO_BATAS_BIAYA_USD` > 0 **dan** perkiraan ≤ batas **dan** bendera `--setujui-biaya`. Kurang satu → ditolak. Perkiraan episode 1 berbayar ± USD 7,74 (10 episode ± USD 77) — **tarifnya belum diverifikasi** ke halaman harga penyedia, ditandai di kode dan dicetak tiap kali.

**Cara owner mencoba:** `cd drama-ai-studio` → `npm install` → `node bin/studio.mjs render 1` → `node bin/studio.mjs pemutar` → klik dua kali `keluaran/pemutar.html`.

**🖼️ PUTARAN 2 (sore) — owner: _"belum ada gambar videonya cuma blur"_.** Pengamatan owner BENAR & sesuai rancangan (lapisan gambar memang sengaja kosong). Owner memilih **"cari yang gratis dulu karena ini baru percobaan"** → jalur berbayar NOL disentuh. Hasilnya `keluaran/episode-01/episode-01-baru.mp4`: **18/18 foto AI fotorealistis, nol gagal**, 1080×1920, 97,04 dtk, 21,1 MB, audio −17,6 dB. **Konsistensi wajah lintas episode TERPECAHKAN gratis**: seed tetap per tokoh + deskripsi wajah disalin apa adanya dari Bible — dua adegan berbeda menghasilkan orang yang sama persis (dibandingkan berdampingan).

🪤 **Enam jebakan putaran 2, SEMUANYA lolos dari `exit 0` DAN dari seluruh tes:** (1) **`503` ber-teks "retry after 10s" itu ANTREAN, bukan pintu tertutup** — satu percobaan gagal hampir membuat saya menyimpulkan jalur gratis mustahil; dicoba ulang → berhasil. (2) kostum di Bible masih bahasa Indonesia padahal disuntikkan ke prompt Inggris → diabaikan mesin tanpa error, baju tokoh acak; sekalian ketahuan pakaian disebut di DUA tempat. (3) tiap `promptVisual` diakhiri **"cinematic portrait lighting"** — arahan KOMPOSISI nyelip di deskripsi IDENTITAS → "wide shot keluar gerbang penjara" keluar jadi pas foto studio. (4) **panjang deskripsi subjek itu sendiri adalah instruksi komposisi** — 35 kata deskripsi wajah memaksa close-up walau diminta wide shot; perbaikannya tiap tokoh punya `promptRingkas` + tiap shot punya kolom `fokus` (wajah/adegan/objek). (5) kata **"teal"** di prompt gaya mewarnai RAMBUT tokoh jadi kehijauan. (6) **render gagal "Permission denied" SESUDAH 100 detik kerja** karena owner sedang MENONTON versi sebelumnya dan Windows mengunci berkasnya → **aturan: keluaran yang mungkin sedang dibuka orang wajib ditulis ke berkas sementara dulu baru dipindah**; sekarang jatuh ke `-baru.mp4` + pemutar otomatis memilih yang terbaru.

⚠️ **Batas jujur yang TERSISA:** close-up BENDA masih gagal (liontin di telapak tangan tetap jadi potret orang, 2 dari 18 adegan) · ada watermark `pollinations.ai` yang **sengaja tidak dihapus** (imbalan layanan gratis orang) · resolusi mentok 576×1024 lalu diperbesar ±2,3× jadi agak lembut · **orangnya tidak bergerak, hanya kameranya** — ini foto dianimasikan, BUKAN video AI.

⚠️ **BUKAN KERJA SESI INI:** pukul 10:18-10:23 muncul perubahan di repo induk dari sesi LAIN — `app/components/player/PlaylyPlayer.tsx` (diubah) + `useOlahSuara.ts`, `lib/olah-suara.ts`, `app/uji-suara/page.tsx`, `tests/olah-suara.test.ts`, `public/uji-nada.wav` (baru). Fitur olah-suara pemutar Playly. **Nol disentuh.** Akibatnya berkas `.ts` baru itu ikut terjaring `tsc` & `npm test` repo induk, jadi hasil gerbang pra-rilis kini bercampur kerja yang belum selesai.

**🔊 PUTARAN 3 — owner: _"tidak ada suaranya dan tidak bergerak"_. KEDUANYA BENAR, dan keduanya LOLOS dari pemeriksaan teknis saya sendiri.** Ini pelajaran termahal sesi ini: dua kali saya mengukur hal yang SALAH lalu menyatakan "terbukti".

🪤 **"ADA SINYAL AUDIO" BUKAN "TERDENGAR" — ukur FREKUENSINYA, bukan cuma dB.** Putaran 2 saya tutup dengan bukti `max_volume: -17,6 dB` dan menyebutnya wajar. Keliru: `volumedetect` mengukur LEVEL, bukan apa yang sanggup dibunyikan speaker. Dipisah per pita: **di bawah 200 Hz -17,9 dB** (hampir semua tenaga di sini) vs **di atas 200 Hz -37,5 dB** (nyaris kosong). Bed-nya dengung sub-bass 65-196 Hz, dan speaker laptop/HP **secara fisik tidak mereproduksi** serendah itu; diperparah `lowpass=f=340` yang menekan nada di atas 340 Hz. **Perintah yang benar: `ffmpeg -i x.mp4 -af "highpass=f=200,volumedetect" -f null -`.** Perbaikan: akor TIGA nada 156-588 Hz, lowpass 340→2400, tremolo, penguat 3,5→14, + `alimiter=limit=0.89`. Pita terdengar naik **-37,5 → -16,0 dB (+21,5 dB)**, puncak -2,9 dB tanpa pecah.

🪤 **"KAMERA BERGERAK" BUKAN "TERBACA BERGERAK" — yang salah ambangnya, bukan keberadaannya.** Gerak kamera memang jalan sejak awal (PSNR frame detik 1 vs 6 = 19,4, jelas berbeda). Tapi pembesaran 14% selama 7 detik pada foto DIAM terbaca sebagai slideshow. **Aturan: untuk hal yang dinilai MATA, "berbeda secara terukur" tidak cukup — buktikan "berbeda cukup banyak untuk disadari".** Zoom tiap mood 0,08-0,26 → **0,20-0,45** + geser 40 px berarah bergantian (zoom mulai 1,05 supaya geseran punya ruang, tanpa itu tepi hitam masuk bingkai). PSNR turun ke 12,6-17,9.

✅ **Hasil akhir** `keluaran/episode-01/episode-01.mp4`: 24,5 MB · 97,04 dtk · 1080×1920 · 18/18 foto AI · audio puncak -2,9 dB · **64 tes hijau**. Penjaga baru menolak mood bernada ≤150 Hz / bukan akor 3 nada / zoom <0,20 — dan pagar itu LANGSUNG menangkap 2 mood yang masih di bawah ambang sesudah saya kira sudah beres.

**🗣️ PUTARAN 4 — owner: _"gambar sudah bergerak tetapi suaranya mendengung, aku mau suaranya berbicara"_. Voice Generation TERSAMBUNG, tetap NOL BIAYA — 11/11 baris Mandarin benar-benar diucapkan.** Tiga penyedia diuji: SAPI Windows gugur (**nol suara Mandarin** terpasang, paket bahasa butuh admin), suara neural Edge gugur (`403`), Google Translate TTS dipakai.

🪤 **PELAJARAN: `403` BISA BUKAN SALAH KODE — habiskan dulu hipotesis yang bisa diuji sebelum menyatakan buntu.** Suara neural Edge gratis DAN jauh lebih bagus, jadi sebelum ditinggalkan saya hadapkan implementasi sendiri dengan pustaka resmi `edge-tts`: (1) token `Sec-MS-GEC` **dibandingkan byte-per-byte** pada detik yang dipaksa sama → **identik**; (2) versi Chromium ternyata salah (saya 131, resminya 143) → dibetulkan, masih 403; (3) **ditemukan jam mesin ini TERTINGGAL 13 menit 18 detik** dari server (dua server sepakat) — token itu dihitung dari waktu per 5 menit jadi hipotesisnya masuk akal → dikoreksi dari header `Date`, masih 403; (4) header disamakan persis dengan `constants.py` resminya → masih 403. Baru setelah itu kesimpulan "ditolak dari sisi Microsoft" (lazim untuk IP pusat data) layak diucapkan. 💡 **Temuan sampingan yang berdiri sendiri: JAM MESIN INI MELESET 13 MENIT** — memengaruhi apa pun yang bergantung waktu di sini, bukan cuma TTS.

🪤 **Pengukuran pertama saya GAGAL membuktikan apa pun.** Saya bandingkan rata-rata adegan berdialog vs adegan sunyi → hasilnya mirip (-14 vs -15 dB), karena pada adegan berdialog musiknya memang diredupkan lalu diisi suara sehingga total levelnya seimbang. **Yang membuktikan adalah perbandingan DI DALAM satu adegan**: s14 sebelum bicara -31,2 dB → **saat bicara -14,7 dB** → sesudah -22,8 dB; s17 -31,1 → **-14,2** → -24,0. Lonjakan ±17 dB tepat di jendela bicara.

🔊 **Pembeda tokoh:** penyedia gratis cuma punya SATU suara, jadi nada digeser per tokoh (`suara.geserNada`): Chenzhou -5 semitone, Zhenguo -4, Laozhang -3, Wanxing -1, Su Tian +2 — lewat `asetrate` lalu `atempo` mengembalikan durasinya. Bukan pengganti aktor suara. Musik latar otomatis diredupkan ke 28% saat ada yang bicara.

✅ `keluaran/episode-01/episode-01.mp4` — 23,3 MB · 97,04 dtk · 1080×1920 · 18/18 foto AI · **11/11 dialog diucapkan** · **75 tes hijau**. ⚠️ Tersisa: satu suara untuk semua tokoh, nadanya datar (membacakan bukan memerankan), bibir tidak sinkron, endpoint tidak resmi.

**Status git — DIPERBARUI 2026-11-05 (sebelumnya tertulis "NOL commit, nol push", kini BASI):**
✅ **sudah di-commit DAN di-push ke kedua remote.** `d12d913` memasukkan sub-proyeknya,
`836a0b1` membuang `uji-tts4.mjs` (49 baris sisa skrip percobaan). Diverifikasi ulang hari ini:

- **26 berkas** `drama-ai-studio/` ter-track (`git ls-files`).
- `node_modules/` dan `keluaran/` **terbukti terabaikan** (`git check-ignore` memulangkan benar
  untuk keduanya) — jadi dua MP4 hasil prototype yang ada di disk (`episode-01.mp4` 24 MB +
  `episode-01-baru.mp4` 22 MB) **tidak ikut masuk repo**, dan itu memang yang diinginkan.
- **Nol berkas rahasia ter-track**: tak ada `.env`/`key`/`secret`/`token`/`password` di antara
  26 berkas itu.

---

## 2026-11-03 — 🔍 AUDIT HP + TABLET (permintaan Kang Dedi lewat owner) — HASIL: BERSIH, nol kode diubah

Kang Dedi: *"pastikan dari tampilan HP + Tablet nya yang pas/cocok sesuai size nya."*

### Hasil: 20/20 pengukuran BERSIH

5 halaman × 4 lebar, `documentElement.scrollWidth` dibandingkan dengan `clientWidth`:

| halaman | 360px | 412px | 768px | 1024px |
|---|---|---|---|---|
| /beranda | ✅ | ✅ | ✅ | ✅ |
| /katalog | ✅ | ✅ | ✅ | ✅ |
| /drama/[id] | ✅ | ✅ | ✅ | ✅ |
| /feed/[id] | ✅ | ✅ | ✅ | ✅ |
| /film | ✅ | ✅ | ✅ | ✅ |

`scrollWidth` **sama persis** dengan viewport di semua sel — **nol elemen meluber**. Tidak ada
kode yang perlu diubah.

### 🪤 PELAJARAN METODE — potret `--window-size` di bawah ~476px MENYESATKAN

Jebakan ini sudah menipu **tiga kali** (ralat 2026-10-31 soal "tombol tergeser di HP", dan sesi
ini **dua kali**: sekali menyatakan catatan lama basi, sekali melaporkan overflow yang tidak ada).

**Apa yang terjadi:** `msedge --headless=new --window-size=360,780 --screenshot` menghasilkan
berkas PNG **selebar 360px** — sehingga terlihat valid. Tapi viewport CSS yang dipakai merender
TIDAK 360px; Edge memaksa lebar minimum (~466px di mesin ini) lalu **memotong** gambarnya.
Hasilnya tombol dan judul tampak "terpotong di tepi layar" padahal di HP sungguhan muat.

❌ **Ukuran berkas PNG BUKAN bukti viewport.** Diminta 360 → dapat PNG 360×900, dan itu tetap
salah.

✅ **CARA YANG BENAR — iframe di halaman diagnostik, dilayani server lokal (same-origin):**
taruh `public/_diag.html` sementara berisi `<iframe>` yang lebarnya di-set lewat CSS, muat
halaman yang diuji ke dalamnya, lalu ukur dari `contentDocument`:

```js
d.documentElement.clientWidth   // viewport sesungguhnya
d.documentElement.scrollWidth   // lebar isi; lebih besar = MELUBER
```

Untuk menemukan pelakunya, sapu `body.querySelectorAll("*")` dan buang elemen yang leluhurnya
ber-`overflow-x: auto/scroll` — tanpa penyaringan itu, setiap baris geser (poster, menu katalog,
strip genre) terdaftar sebagai "meluber" padahal memang dirancang digeser.

Hasilnya dibaca dengan `--screenshot` halaman diagnostiknya (`--dump-dom` menulis 0 byte di
mesin ini). **Hapus `public/_diag.html` setelah selesai** — ia ikut tayang kalau tertinggal.

### Yang terlihat terpotong tapi MEMANG DISENGAJA — jangan "diperbaiki"

- **Menu katalog** (Genre/Series/Populer/…): `overflow-x-auto` di `NavMenus.tsx:31`. Komentarnya
  menyebut keputusan owner: digeser ke samping, BUKAN dilipat ke hamburger.
- **Strip genre kuning**: `overflow-x-auto` di `StripKatalog.tsx:52`.
- **Baris poster**: `overflow-x-auto` di `BarisGeser.tsx:119`.

Ketiganya memakai `no-scrollbar`, jadi tidak ada batang gulung yang terlihat — itulah yang
membuatnya mudah disalahartikan sebagai "terpotong".

### Catatan opsional (bukan temuan cacat)

Di tablet portrait 768px, halaman drama tampil satu kolom karena sidebar baru muncul di `lg`
(1024px). Rapi dan tidak ada yang terpotong, tapi ruang kanan menganggur. Menurunkan sidebar ke
`md` layak dipertimbangkan — **belum ditawarkan ke owner**.

---

## 2026-11-02 — ✅ DIRILIS `784460c`: judul pemutar memudar bersama kontrol (akar masalah hardsub)

### 🔍 AKAR MASALAH YANG AKHIRNYA TERVERIFIKASI — tiga rilis mengejar yang salah

Selama tiga putaran (`7c67a40` → `3d57145` → `8ced118`) keluhan "teks bertumpuk dengan judul"
dikira soal **subtitle aplikasi**. Bukan. Yang terbukti dengan pembacaan + pengujian langsung:

1. **Pagar CSS subtitle bawaan browser SUDAH benar di produksi.** Diunduh dari bundle CSS nyata:
   `video::cue{color:#0000;background:0 0}` dan
   `video::-webkit-media-text-track-container{display:none!important}`. Jadi subtitle browser
   mustahil terlihat. **Dugaan "subtitle ganda dari browser" DICORET.**
2. **Drama yang dilaporkan tidak punya satu pun berkas subtitle.** `/api/subtitle` diuji untuk
   ep 1, 2, 13, 14, 15 → **semua `404 "Subtitle tidak ada"`**. Artinya `<track>` gagal dimuat,
   `cueText` selalu kosong, dan **subtitle aplikasi tidak pernah tergambar di drama ini.**
3. ⇒ Teks yang menumpuk itu **TERBAKAR DI DALAM GAMBAR VIDEO (hardsub)**. Bukan milik aplikasi,
   posisinya **mustahil digeser**, dan ia selalu mendarat persis di area panel judul.

🪤 **PELAJARAN: kalau teks "milik video" tak bisa digeser, yang harus mengalah adalah panel kita.**
Dan sebelum menggeser apa pun, **buktikan dulu teks itu milik siapa** — satu pengujian
`/api/subtitle` akan menghemat tiga rilis.

### Yang dikerjakan (keputusan owner, dipilih dari tiga opsi)

Menurunkan judul sudah **mentok** di `3d57145`. Jadi area itu **dikosongkan saat film berjalan**:
blok judul + `Eps n / N` ikut memudar bersama kontrol (`controlsVisible`).

Judul **TETAP tampil** saat penonton menjeda, membuka menu, atau episode terkunci —
`controlsVisible` dipaksa `true` di semua keadaan itu (FeedPlayer.tsx:541). Satu sentuhan layar
memunculkannya lagi. Pola yang sama dipakai YouTube & Netflix.

### 🪤 Jebakan: `pointer-events-none` di induk TIDAK mematikan anak yang menyalakannya sendiri

Tombol `Eps n / N` ber-`pointer-events-auto` **permanen** akan tetap bisa ditekan walau induknya
`pointer-events-none opacity-0` — jadi ketukan penonton untuk memunculkan kontrol malah **membuka
daftar episode**, dari tombol yang tidak terlihat. `pointer-events` tombol itu kini ikut
`controlsVisible`. Dijaga `tests/posisi-teks-pemutar.test.ts`, pagar diuji MERAH lebih dulu.

⚠️ Blok kontrol di bawahnya **masih** memakai pola lama (anak-anak `pointer-events-auto` permanen
di dalam induk yang memudar). Belum disentuh karena di luar lingkup permintaan owner — **layak
diperiksa lain waktu**: kemungkinan tombol play/seek juga bisa ditekan saat tak terlihat.

### Bukti

Gerbang §6: `.next` dihapus → build **sukses** → `tsc` **exit 0** → **1.844 tes hijau**.

```
HTML produksi : px-3 pr-20 transition-opacity duration-300 opacity-100 ✅
                (opacity-100 = judul TERLIHAT saat halaman dibuka — benar)
LAMA          : class="px-3 pr-20" ❌ hilang · pointer-events-auto mt-1 flex min-h-11 ❌ hilang
```

Dual push `329c573..784460c` → tayang **±80 detik** → **0 balasan bukan-200**. Smoke test **8/8**.

### ❗ TEMUAN TERPISAH — belum ditangani, sudah dilaporkan ke owner

**Katalog menjanjikan subtitle yang berkasnya tidak ada.** `master-pedang-yang-diremehkan`
terdaftar `subtitles: ["id"]` tapi semua episode balas 404. Akibatnya menu **Subtitle** di pemutar
menawarkan "Indonesia", penonton memilihnya, lalu **tidak terjadi apa-apa — tanpa pesan apa pun**.
**25 dari 41 judul** mengklaim punya subtitle; belum diperiksa satu per satu. Owner ditawari audit
seluruh katalog, **belum dijawab**.

**Rollback 1 baris:** `git revert 784460c && git push origin main && git push dramaku main`.

---

## 2026-11-02 — ✅ DIRILIS `8ced118`: subtitle dua baris tak lagi menimpa judul + play dikecilkan

Owner mengirim tangkapan **DevTools, Galaxy Z Fold 6 (412×968)**: teks subtitle dan judul saling
menimpa sampai tak terbaca. *"Ada tulisannya bertumpuk, jadi kamu buat rapi dan bisa terbaca.
Untuk play-nya kamu kecilkan sedikit, terlalu besar."*

### 🪤 PELAJARAN BESAR: `<span>` + padding vertikal = latar yang meluber menimpa tetangga

Subtitle dibungkus `<span>` polos. **`<span>` adalah elemen INLINE**, dan pada elemen inline
**padding atas-bawah TIDAK menambah tinggi baris** — kotak latarnya meluber keluar, menimpa apa
pun di atas & di bawahnya.

Kenapa baru ketahuan sekarang: **selama subtitlenya SATU baris tidak ada gejala apa pun.** Begitu
sebuah cue dua baris, hasilnya dua kotak latar yang saling tumpang tindih DAN kotak paling atas
meluber menimpa judul. Jadi bug ini hanya muncul pada kalimat tertentu — tak akan tertangkap
dengan membuka satu episode sembarangan.

Perbaikannya `inline-block`: padding memakan ruang yang sebenarnya, jadi berapa pun barisnya
subtitle tetap satu kotak rapi. Dijaga `tests/posisi-teks-pemutar.test.ts` (pagar diuji MERAH
lebih dulu dengan melepas `inline-block`).

Sekalian keterbacaan: `leading-snug` → `leading-relaxed` (baris kedua tak menempel baris pertama)
dan `bg-black/60` → `bg-black/75` (huruf putih sempat hilang di adegan terang).

### Yang BUKAN penyebabnya — jangan dikejar ulang

Subtitle bawaan browser **sudah dimatikan sejak lama** di `app/globals.css:285-291`
(`video::cue { color: transparent }` + `video::-webkit-media-text-track-container { display:
none !important }`), dan `FeedPlayer` menyetel track ke `hidden`/`disabled`. Dugaan "subtitle
ganda dari browser" sudah dicoret lewat pembacaan kode, bukan tebakan.

### Tombol play 44px → 40px di HP

`sm` ke atas tetap 44px. **40px batas bawahnya** — ini tombol yang paling sering ditekan di layar
itu, di bawah 40px jempol mulai meleset. Dijaga tes (`size-9`/`size-8` ditolak **di blok tombol
play saja**; `size-9` tetap sah untuk prev/next/volume di sekitarnya).

🪤 Tes versi pertama memeriksa `size-9 text-white` di SELURUH berkas dan langsung merah palsu —
tombol prev/next/volume memang memakai ukuran itu. Pemeriksaan ukuran satu tombol WAJIB dipotong
ke blok tombol itu dulu.

### Bukti

Gerbang §6: `.next` dihapus → build **sukses** → `tsc` **exit 0** → **1.843 tes hijau**.

```
HTML produksi : size-10 text-white transition-transform ✅ · sm:size-11 ✅
                size-6 fill-white sm:size-7 ✅ · size-11 text-white… ❌ hilang (benar)
bundle JS     : "inline-block whitespace-pre-line rounded bg-black/75" ADA di 1cmo3_3ivbaib.js
```

Dual push `32c7b0c..8ced118` → tayang **±80 detik** → **0 balasan bukan-200**. Smoke test **8/8**.

### ❓ Belum diverifikasi

Tampilan akhirnya di layar HP sungguhan. Penyebab yang diperbaiki **pasti salah** (fakta CSS yang
bisa ditunjuk di kode), dan cocok dengan gejala di tangkapan layar owner — tapi mesin di sini tak
punya browser otomatis, jadi konfirmasi akhir ada di mata owner.

**Rollback 1 baris:** `git revert 8ced118 && git push origin main && git push dramaku main`.

---

## 2026-11-02 — ✅ DIRILIS `3d57145`: blok JUDUL pemutar turun ~26px di HP (putaran kedua)

### ❌ RALAT untuk `7c67a40`: rilis itu menggeser blok yang SALAH

Owner menulis *"perbaiki teks arti tulisannya, terlalu ke tengah, buat turun"* sambil melampirkan
tangkapan layar berkotak-merah. Kalimatnya dibaca sebagai **subtitle terjemahan** — dan di
tangkapan pertama kebetulan memang ada subtitle ("bisakah kamu") di dalam kotak merah, jadi
tafsirnya terasa cocok.

Tangkapan layar putaran kedua yang menyelesaikannya: kotak merah menandai **judul + `Eps 13 / 43`**
dan **tidak ada subtitle sama sekali** di gambar itu (video sedang jeda). Yang dimaksud owner
sejak awal adalah **blok judul**.

🪤 **PELAJARAN: kotak merah yang memuat beberapa elemen itu AMBIGU.** Yang memastikan bukan
kalimatnya, melainkan elemen mana yang ADA DI SEMUA tangkapan layar. Kalau ragu, tanya "yang mana:
judulnya, nomor episodenya, atau teks terjemahannya?" — satu pertanyaan jauh lebih murah daripada
satu rilis yang menggeser blok salah.

`7c67a40` **tidak dibatalkan**: menjauhkan subtitle dari blok judul tetap perbaikan yang benar,
hanya bukan yang diminta.

### Ruang dipanen dari baris durasi — tanpa membuang informasinya

Rencana awal: **buang** baris durasi di HP (sudah ditawarkan ke owner). Yang akhirnya dikerjakan
lebih baik — angka `0:49 / 2:00` **dipindah ke samping garis geser**, menumpang baris yang sudah
ada. Penonton tetap melihat angkanya.

| Dari mana | Turun |
|---|---|
| baris durasi sendiri di bawah tombol → samping garis geser | ~18px |
| `mt-1` → `mt-0 sm:mt-3` pada blok kontrol | 4px |
| `pb-7` → `pb-6 sm:pb-7` pada panel | 4px |
| **blok judul turun** | **~26px** |

### 🪤 Bahaya yang hampir masuk: `seekBarRef` naik ke pembungkus

Memindahkan durasi ke baris garis geser membuat pembungkus flex BARU. Kalau `seekBarRef` ikut
naik ke pembungkus itu, `getBoundingClientRect()` (FeedPlayer.tsx:577) akan menghitung lebar
**termasuk angka durasi** — setiap ketukan mendarat di detik yang salah, makin ke kanan makin
meleset, **tanpa error apa pun**. Ref sengaja tetap di kotak garis gesernya (`flex h-6 flex-1`);
dijaga `tests/posisi-teks-pemutar.test.ts`, pagar diuji MERAH lebih dulu dengan benar-benar
memindahkan refnya.

### ⚠️ SISA RUANG HABIS — yang tersisa semuanya berongkos

Dijaga tes supaya tak diambil diam-diam: `min-h-11` tombol Eps (44px), `size-11` tombol play,
`h-6` garis geser (sudah di bawah ambang 44px), dan `pb-6` panel (tombol sudah ~24px dari tepi,
dan tepi itu milik gesture "kembali" sistem di HP). Menurunkan judul lebih jauh **wajib** menukar
salah satunya — keputusan owner, bukan AI.

### Bukti

Gerbang §6: `.next` dihapus → build **sukses** → `tsc` **exit 0** → **1.841 tes hijau**.

🪤 Build **GAGAL sekali** di percobaan pertama: komentar `{/* … */}` ditaruh tepat sesudah
`return (` dan sebelum elemen induk → JSX jadi punya DUA anak root (*"Expected ',', got 'ident'"*).
Komentar sebelum elemen induk harus komentar JS biasa di atas `return`. Diperbaiki, build diulang
dari nol.

Bukti tayang (kelas lama memang terbaca di HTML produksi sebelum push, jadi pergantiannya
langsung terlihat):

```
BARU  ✅ mt-0 px-3 transition-opacity · sm:mt-3 · mb-2 flex items-center gap-2 sm:mb-3
      ✅ flex h-6 flex-1 · pb-6 pt-10 · sm:pb-7
LAMA  ✅ mt-1 px-3 transition-opacity · mb-2 flex h-6 · pb-7 pt-10   → semua hilang (benar)
      ✅ baris durasi terpisah hilang
DURASI TETAP ADA: tabular-nums text-white/60 sm:hidden (HP, samping garis geser)
                  tabular-nums text-white/80 sm:inline (desktop, baris tombol)
```

Dual push `c0132cf..3d57145` → tayang **±70 detik** → **0 balasan bukan-200**. Smoke test **8/8**.

### ❓ Belum diverifikasi

Apakah hasilnya akhirnya terasa pas di mata owner. Pergeseran puluhan piksel di HP tidak bisa
dibuktikan mesin.

**Rollback 1 baris:** `git revert 3d57145 && git push origin main && git push dramaku main`.

---

## 2026-11-02 — ✅ DIRILIS `7c67a40`: subtitle pemutar diturunkan di layar HP

Owner (dengan tangkapan layar HP): *"teks arti tulisannya terlalu ke tengah, buat agak turun
sedikit (sesuaikan versi HP)."*

### Kenapa terasa "menyatu di tengah"

Tulisan `Eps n / N` tepat di atas subtitle **bukan teks biasa** — itu tombol ber-`min-h-11`
(44px, ambang target sentuh), dan teksnya duduk di **tengah** kotak itu. Subtitle ber-`mt-2`
karena itu berhenti hanya ±20px di bawah tulisan `Eps`, dan mata membacanya sebagai satu blok
judul, bukan sebagai terjemahan film. Mengecilkan `min-h-11` memang akan memberi ruang lagi —
**jangan**, itu menukar ruang dengan tombol yang sulit ditekan.

### Yang diubah (semua HP-dulu + pasangan `sm:` yang mengembalikan nilai semula)

| | Dulu | Sekarang |
|---|---|---|
| jarak subtitle dari blok judul | `mt-2` (8px) | `mt-6 sm:mt-2` (24px) |
| jarak blok kontrol dari subtitle | `mt-3` | `mt-1 sm:mt-3` |
| jarak bawah seek bar | `mb-3` | `mb-2 sm:mb-3` |

Bersihnya: subtitle **turun 12px** terhadap layar, dan **16px lebih jauh** dari `Eps n / N`.
Layar `sm` ke atas **nol perubahan** — tidak pernah dikeluhkan dan ruangnya berlebih.

### ⚠️ RUANG TURUNNYA MENTOK — jangan diulang dari nol

Panel bawah pemutar adalah satu kolom: `[judul + Eps n/N]` → `[subtitle]` → `[seek bar + tombol
+ baris waktu]`. Subtitle hanya bisa turun sampai menyentuh seek bar.

🪤 **Godaan yang HARUS ditolak: memindahkan subtitle ke dalam blok kontrol** (di antara seek bar
dan baris tombol) untuk mendapat ±48px. Blok itu memudar jadi **`opacity-0`** saat kontrol
disembunyikan — subtitle akan **ikut lenyap padahal filmnya masih berjalan**, tanpa satu pun
error. Dijaga permanen oleh `tests/posisi-subtitle-pemutar.test.ts` (pagar diuji MERAH lebih
dulu dengan benar-benar memindahkan bloknya).

**Sisa ruang yang MASIH tersedia kalau owner minta lebih turun:** ±18px dari baris waktu
`00:00 / 12:34` di bawah tombol (`sm:hidden`) — ongkosnya penonton HP kehilangan angka durasi.
**Sudah ditawarkan ke owner, belum dijawab.**

### Bukti

Gerbang §6: `.next` dihapus → build **sukses** → `tsc` **exit 0** → **1.839 tes hijau** (+5 baru).

Bukti tayang — kelas LAMA memang ada di HTML produksi sebelum push, jadi pergantiannya bisa
dibaca langsung, bukan cuma lewat sidik jari bundle:

```
HTML produksi : mt-1 px-3 transition-opacity ✅ · sm:mt-3 ✅ · mb-2 flex h-6 ✅ · sm:mb-3 ✅
                mt-3 px-3 transition-opacity ❌ hilang · mb-3 flex h-6 ❌ hilang   (benar)
bundle JS     : "mt-6 flex justify-center px-3 pr-20 sm:mt-2" ADA di 3ij2q-ypv7bs2.js
```

Dual push `ce0265c..7c67a40` → tayang **±90 detik** → **0 balasan bukan-200**. Smoke test
**8/8 = 200**.

### ❓ Belum diverifikasi

**Apakah hasilnya terasa pas di mata owner.** Pergeseran belasan piksel di HP tidak bisa
dibuktikan mesin — yang terbukti hanya bahwa angkanya berubah persis seperti tabel di atas.

**Rollback 1 baris:** `git revert 7c67a40 && git push origin main && git push dramaku main`.

---

## 2026-11-02 — ✅ DIRILIS `91d1f5d`: daftar episode menggulung sendiri ke episode terakhir ditonton

Lanjutan langsung dari `e90e967` di seksi berikutnya. Begitu daftar episode pindah ke kolom
sempit, serial 45 episode **selalu** terbuka di episode 1 — penonton yang sudah sampai episode 30
harus menggulung dari atas tiap kali membuka halaman.

### 🪤 Keputusan yang hampir salah: BUKAN `scrollIntoView`

Cara paling umum untuk ini satu baris: `target.scrollIntoView()`. **Jangan.** Perintah itu
menggulung **semua leluhur yang bisa digulung — termasuk halaman itu sendiri.** Penonton membuka
halaman drama, lalu halamannya melompat ke tengah tanpa ia menyentuh apa pun; hero dan baris
tombol hilang dari pandangan. Tidak ada error, tidak ada peringatan.

Yang benar: geser `scrollTop` kotak daftarnya saja. Dijaga permanen oleh tes yang menolak kata
`scrollIntoView` muncul di kode `EpisodeList` (komentar dikecualikan).

### Tiga pagar

1. **Sekali saja per kunjungan** (`sudahMenggulung`). Efeknya bergantung pada `entry`, dan `entry`
   disegarkan tiap `dramaku:progress-changed` menyala. Tanpa pagar ini daftar melompat sendiri
   tepat saat penonton menggulungnya dengan jari.
2. **`requestAnimationFrame`** — mengukur sebelum tata letak final menghasilkan nol, dan
   gulungannya gagal diam-diam.
3. **Guard tinggi di `lib/gulung-daftar.ts`** — kotak yang tidak bisa digulung memulangkan `null`.
   Di situlah tata letak HP ditangani, **bukan** dengan percabangan kedua di komponen.

Episode tujuan disisakan `JARAK_KONTEKS_PX = 72` (tepat satu kartu: `min-h-16` 64px +
`space-y-2` 8px) di atasnya, supaya posisinya terbaca "di tengah daftar", bukan "episode pertama".

### Kenapa aritmatikanya dipisah ke `lib/gulung-daftar.ts`

Alat tes project ini **tidak merender React**, dan jsdom **tidak menghitung tata letak** —
`scrollHeight` di sana selalu 0. Dibiarkan di dalam komponen, semua cabang akan terlihat "lolos"
tanpa pernah benar-benar dijalankan. Dipisah, ia bisa diuji dengan angka sungguhan.

### Bukti

Gerbang §6: `.next` dihapus → build **sukses** → `tsc` **exit 0** → **1.834 tes hijau** (+9 baru).

**Penjaganya diuji MERAH lebih dulu**: `scrollIntoView` disisipkan sementara ke kode → tes jatuh
dengan pesan yang benar → dikembalikan. Sekaligus membuktikan pembersih komentarnya bekerja, sebab
kata yang sama tetap ada di komentar dan tes tetap hijau.

Bukti tayang — fitur ini berjalan di browser, jadi **tidak muncul di HTML**. Yang diperiksa:

```
sidik jari daftar chunk JS   48a5f384… (sebelum)  →  56ba071c… (sesudah)
chunk-11.js (memuat EpisodeList, penanda "dramaku:progress-changed"):
   ADA     requestAnimationFrame · cancelAnimationFrame · scrollTop
           getBoundingClientRect · scrollHeight · clientHeight
   BERSIH  scrollIntoView
```

Dual push `c190bdb..91d1f5d` → tayang **±50 detik** → **0 balasan bukan-200** selama pergantian
versi. Smoke test **9/9 = 200**. Tata letak rilis sebelumnya tidak mundur (`panel-episode` →
`panel-drama-terkait` → `panel-terpopuler` masih urut).

### ❓ Yang BELUM diverifikasi — jangan diklaim sudah

**Gerakan gulungannya belum pernah dilihat di browser sungguhan.** Mesin ini tidak punya alat
otomasi browser (nol playwright/puppeteer), dan jalur `--remote-debugging-port` TIDAK dipakai
karena pernah nyasar ke browser penyewa lain di server sewaan bersama ini. Yang terbukti:
aritmatikanya, pagar-pagarnya, dan keberadaan kodenya di bundle produksi. Konfirmasi akhir ada di
mata owner — cara mencoba: buka drama yang pernah ditonton sampai episode belasan, daftar di
kolom kanan harus sudah berada di episode itu.

**Rollback 1 baris:** `git revert 91d1f5d && git push origin main && git push dramaku main`.

---

## 2026-11-02 — ✅ DIRILIS `e90e967`: Episode ↔ Drama Terkait BERTUKAR TEMPAT (halaman drama, khusus serial)

**Permintaan owner (verbatim):** *"kamu tukar tempat drama terkait menjadi drama episode, drama episode menjadi drama terkait, ini khusus drama yah agar ketika di hp penonton tidak sekrol kebawah bisa langsung di tonton."*

### Fakta yang membuat ini benar-benar menolong (bukan sekadar geser kotak)

Di bawah `lg`, KEDUA grid halaman `/drama/[id]` runtuh jadi satu kolom dan isinya bertumpuk
mengikuti **urutan tulisan di berkas sumber** — bukan posisi kiri/kanannya di desktop. Jadi
"siapa duluan di kode" = "siapa duluan dilihat penonton HP".

| | Urutan yang dilihat penonton HP |
|---|---|
| Sebelum | hero → **20 judul Drama Terkait** → tombol → sinopsis → tabel info → **Episode** |
| Sesudah | hero → **Episode** → tombol → sinopsis → tabel info → **Drama Terkait** |

### Yang diubah

- **BARU** `app/components/film/PanelEpisode.tsx` — kerangka panel sidebar (judul tetap + daftar
  yang digulung sendiri di `lg`). Sengaja meniru bentuk `PanelFilm` karena menempati slot yang
  sama persis; beda gaya akan terbaca seperti halaman belum selesai dirapikan.
- `app/components/EpisodeList.tsx` — prop `ringkas` + `className`. **Keduanya default mati**,
  jadi pemakai lain tidak berubah. `ringkas` bukan selera: di kolom 320px ruang bersih satu baris
  tinggal ~276px, dan bentuk lebar (gambar 96px + badge ~86px + jarak 24px) menyisakan ~70px untuk
  judul — kurang dari lebar tulisan "Episode 43", jadi judulnya membungkus dua baris di SETIAP
  episode dua digit. Ringkas = gambar 80px + badge dibuang (statusnya turun ke baris kecil).
- `app/components/film/PanelFilm.tsx` — prop `petak` (default mati). Daftar terkait kini mendarat
  di kartu putih selebar ~800px; satu kolom di sana meninggalkan sisi kanan melompong.
- `app/drama/[id]/page.tsx` — saklar `tukarEpisodeKeSidebar = !film && drama.episodes > 0`.
  Panel terkait dirakit SEKALI ke variabel `panelTerkait` lalu dipasang di salah satu dari dua
  tempat; saklar tampilannya mengikuti tempatnya sehingga tidak bisa tertukar.
- `TERKAIT_BADAN = 12` (sidebar tetap 20). Di sidebar daftarnya punya gulungan sendiri, di kartu
  putih tidak — 20 judul di sana mendorong kolom nilai & komentar jauh ke bawah. 12 habis dibagi
  2 dan 3, jadi baris terakhir penuh di tablet maupun layar lebar.
- **BARU** `tests/episode-naik-ke-sidebar.test.ts` — 11 penjaga, termasuk pemeriksa URUTAN
  (PanelEpisode wajib ditulis sebelum Sinopsis, panelTerkait sesudahnya).

### Halaman FILM TIDAK berubah sama sekali

Syaratnya `!film`. Dibuktikan dari HTML server lokal: halaman `meg-2-the-trench` tetap memajang
panel terkaitnya di posisi sidebar (sebelum Sinopsis), persis seperti sebelum perubahan.

### Bukti

```
npm run build      → sukses, /drama/[id] tetap SSG
npx tsc --noEmit   → exit 0   (dijalankan SESUDAH build, lihat AGENTS.local.md §6)
npm test           → 126 berkas / 1825 tes, semua hijau
```

Render sungguhan dari `next start` lokal, urutan id panel di dalam HTML:

```
SERIAL (45 eps) : panel-episode(21157) → Sinopsis(76941) → panel-drama-terkait(77240) → panel-terpopuler(110006)
FILM   (1 eps)  : panel-tontonan-lain(26342) → Sinopsis(73615) → panel-terpopuler(84013)
```

45 tautan episode tergambar + 1 dari tombol "Mulai Nonton" = 46. Judul **"Tontonan Lain"** di
halaman film bukan efek perubahan ini: katalog cuma punya **1 film dari 41 judul**, jadi
jatuh-kembali `cukupSejenis` yang sudah ada sejak 2026-10-29 yang bekerja.

### Bukti TAYANG (produksi Railway, bukan lokal)

Dual push `fb5aca1..e90e967` → `dramaku` dulu (cermin, tak merilis apa pun) → baru `origin`
(TOMBOL RILIS). Keduanya exit 0. Railway build sendiri, perubahan terdeteksi di situs asli
setelah **±130 detik**.

**Downtime NOL, dan ini terukur bukan ditaksir:** selama 14 kali pengecekan berjarak 10 detik
yang menjembatani pergantian versi, `/drama/master-pedang-yang-diremehkan` menjawab **`200` di
SETIAP percobaan** — yang berubah hanya isinya, bukan ketersediaannya.

Urutan id panel di HTML produksi:

```
SERIAL : panel-episode[SEBELUM sinopsis] → panel-drama-terkait[SESUDAH] → panel-terpopuler[SESUDAH]
FILM   : panel-tontonan-lain[SEBELUM sinopsis] → panel-terpopuler[SESUDAH]   ← tidak berubah
```

Smoke test 6/6 = `200`: `/` · `/beranda` · `/katalog` · `/film` ·
`/drama/master-pedang-yang-diremehkan` · `/api/dramas`.

**Rollback 1 baris** kalau ternyata owner tak suka tata letaknya:
`git revert e90e967 && git push origin main && git push dramaku main`.

### 🪤 Jebakan yang memakan waktu di sesi ini

Komentar kode yang menyebut ejaan `<PanelFilm>` **ikut dihitung** oleh penjaga
`tests/film-terkait.test.ts` ("PanelFilm digambar lebih dari sekali") — tesnya membaca berkas
sumber mentah tanpa membuang komentar. Berkas tes itu sendiri sudah mencatat jebakan serupa
("sudah tiga kali kena di sesi yang sama"). Perbaikannya: ubah kata-kata komentar, **jangan**
longgarkan tesnya.

---

## 🧭 BACA INI DULU — status & titik lanjut (diperbarui 2026-10-31)

### Keadaan sekarang, satu paragraf

**Situs di Railway, sehat.** Alamat resmi: `https://dramaapp-production-9e88.up.railway.app`.
`dramaapp.vercel.app` **masih hidup tapi hanya mengalihkan (308)** — **jangan dimatikan dulu**.
Rangkaian audit keamanan 24–27 Oktober sudah tutup (celah Node `CVE-2026-111497` + 7 CVE lain
lewat `RAILPACK_NODE_VERSION`, dan kebocoran paywall video — mekanismenya tetap terpasang penuh).

🎬 **29 OKTOBER — SITUS BERUBAH BESAR. Tiga arahan Kang Dedi + 7 putaran koreksi owner, SEMUA
TAYANG** (`98c2b92` → `a0f4079` → `d0d301e`). Yang berubah bagi penonton:

| Dulu | Sekarang |
|---|---|
| Tombol Masuk/Daftar di mana-mana | **hilang** — nonton langsung, tanpa akun |
| Komentar & rating butuh login | **bisa tanpa akun** (nama/email/website opsional) |
| Halaman film: navbar hitam, latar gelap | **kepala sama dengan Home**, latar terang |
| Kotak cari memakan ruang bar | **tombol** → kotak melebar sejajar di dalam bar |
| — | kolom kanan **Film/Drama Terkait + Terpopuler**, kaki situs 4 kolom |
| Lanjut Menonton selalu terbuka | **panel lipat**, tersembunyi sampai diklik |

📝 **30 OKTOBER — dua pekerjaan, keduanya TAYANG.**

**(a) Seluruh nama genre kini bahasa Indonesia** (`5088bf2`). Aksi · Romantis · Komedi ·
Petualangan · Horor · Fiksi Ilmiah · Lintas Waktu, dan tombol menu **"+ More" → "Lainnya"**.
Daftar LENGKAP — termasuk putaran koreksi owner sesudahnya (`27973f0`) — ada di seksinya
sendiri di bawah; sengaja tidak disalin ke sini supaya tidak ada dua daftar yang bisa melenceng.
Berubah di 13 permukaan sekaligus (menu bar merah, strip kuning, dropdown Filter, kaki situs,
tulisan di bawah tiap poster, chip halaman drama, kolom Terpopuler, baris "Trending di …",
kartu & grid Playly, halaman `/tonton`). ⭐ **ATURAN PERMANEN:** yang diterjemahkan HANYA
tulisannya. Nilai di database, alamat penyaring (`?cat=Action`), pencocokan "Drama Terkait",
dan kunci warna aksen **WAJIB tetap ejaan Inggris** — kalau label ikut masuk ke alamat, chip
tergambar rapi lalu memulangkan halaman hampa tanpa satu pun error. Penerjemahnya
**`lib/genre.ts`** (meniru `lib/negara.ts`); **tambah genre baru = tambah satu baris di sana**,
bukan di tempat gambarnya. Panel admin SENGAJA tetap Inggris — di sana yang terlihat adalah
nilai yang tersimpan di database.

**(b) Dua tombol di halaman drama yang selama ini TERPOTONG, diperbaiki** (`55894b8`).
Baris aksi berisi empat tombol (`Mulai Nonton · Tambah Favorit · Suka · Bagikan`), tapi di lebar
1280px hanya dua yang terlihat — "Suka" sepotong, **"Bagikan" hilang total**. Dua fungsi itu
praktis mati bagi semua penonton layar lebar. 🪤 **PELAJARAN PERMANEN:** saat bug itu tayang,
build sukses, `tsc` exit 0, dan **1.784 tes hijau semua** — `overflow-hidden` memotong tanpa
error, tanpa scrollbar, tanpa pesan apa pun. **Kerusakan LEBAR/tata letak hanya bisa dibuktikan
dengan POTRET LAYAR**, dan caranya di mesin ini: Edge `--headless=new --screenshot` **TANPA**
`--remote-debugging-port` (port itu yang 2026-10-28 nyasar ke browser penyewa lain).

⏸️ **KOIN & IKLAN DIJEDA sejak 28 Okt** (`c5bdb54`) — semua episode gratis, nol fitur koin/iklan
tampil. DISENGAJA, jangan "diperbaiki".
⏸️ **AKUN PENONTON DIJEDA sejak 29 Okt** (`98c2b92`) — login/daftar hilang dari tampilan penonton.
⭐ Keduanya saklar di **`lib/saklar-fitur.ts`** (3 konstanta): `PAYWALL_ENABLED`, `ADS_ENABLED`,
`AKUN_PENONTON_ENABLED`. Nyalakan = ubah `false` → `true`, bukan merakit ulang.

🔑 **ADMIN MASUK LEWAT MANA SEKARANG:** kaki situs → **"Masuk sebagai pengelola"**, atau menu ☰
di kiri atas (`/beranda` tidak punya kaki situs, jadi di sana pakai menu ☰). Halaman `/login`
tidak pernah dihapus.

### Yang tersisa

| # | Pekerjaan | Mendesak? | Yang ditunggu |
|---|---|---|---|
| 1 | **Jalur administrasi jarak jauh di server sewaan terbuka ke internet** | 🟠 ya, tapi **DI LUAR wewenang owner** | Izin atasan owner → lalu diminta ke administrator penyedia jasa. Mesin kerja owner = server RDP sewaan berisi ~84 penyewa; owner hanya pengguna biasa. Laporan + draf pesannya: `laporan-keamanan-dramaku-2026-10-27.html` **di folder rumah owner, SENGAJA di luar repo** (repo ini publik) |
| 2 | **Katalog cuma punya 1 FILM (+39 serial)** | ⚪ keputusan isi, bukan teknis | Halaman `/drama/meg-2-the-trench` memakai judul **"Tontonan Lain"**, bukan "Film Terkait" — karena tak ada film lain untuk ditawarkan. **Bukan bug.** Tambah film kedua ke katalog → judulnya berubah sendiri, nol ubah kode. Rinciannya di catatan rilis `d0d301e` di bawah |
| 3 | **Beli-lalu-tonton: perbaikannya TAYANG, tapi kini TAK BISA DIUJI** | ⚪ tertunda | **Menunggu koin dinyalakan lagi.** Perbaikannya sudah tayang di `7efa591`, tapi sejak koin dijeda tak ada episode yang bisa dibeli. **Begitu koin dinyalakan, uji ini WAJIB lebih dulu**: drama premium → episode 4 → Buka • 8 koin → video harus jalan sendiri tanpa muat ulang. Penjaganya `tests/beli-lalu-tonton.test.ts` tetap hijau |
| 3b | ⏸️ **"Klik drama langsung play"** | ⚪ owner pikir-pikir | Owner bertanya pendapat, lalu menunda. **Riset SUDAH selesai, jangan diulang** — seksi `2026-10-30 — DIBAHAS, BELUM DIPUTUSKAN` di bawah. Batas kerasnya: browser memblokir autoplay bersuara, jadi versi jujurnya selalu mulai TANPA suara |
| 3c | ⏸️ **Sinopsis film masih bahasa Inggris** | ⚪ owner pikir-pikir | ± **340 dari 443** halaman `/tonton` bersinopsis Inggris (diukur dari sampel 40: 31 Inggris, 0 Indonesia, 9 kosong). Katalog **drama** 100% sudah Indonesia. Riset lengkap + 4 pilihan ada di seksinya sendiri — **jangan diukur ulang** |
| 4 | **Tutup Vercel** | tidak | ≥6 minggu sejak 2026-10-15 → **paling cepat 2026-11-26**, DAN cek Google. Nol pekerjaan teknis tersisa. 🔔 `.github/workflows/pengingat-tutup-vercel.yml` membuka Issue sendiri saat tanggalnya tiba |
| 5 | **Uji pulihkan backup** | tidak | 1 Supabase project kosong. 🟢 Robotnya sudah dibuat & diuji — owner tinggal 3 langkah, `docs/uji-pulihkan-backup.md` "Rute 2" |
| 6 | **Beli domain** | tidak | persetujuan atasan owner — **BUKAN blocker apa pun**. Bahan: `docs/pengajuan-domain-sendiri.md` |
| 7 | Node mesin kerja `v24.15.0` · GitHub Actions `24.21.0` | tidak | Risiko rendah (port node di mesin kerja tertutup firewall); CI naik sendiri saat image runner diperbarui |

### 🔑 DUA NILAI YANG DIKUNCI MANUAL DI PANEL RAILWAY — tidak naik sendiri

1. **`RAILPACK_NODE_VERSION=24.22.1`**. Tambalan Node berikutnya **tidak** terpasang otomatis.
   Kalau default Railpack sudah melewati 24.22.1, variabel ini boleh dihapus.
2. **`VIDEO_SIGNING_SECRET`** di **DUA** tempat yang harus sama persis: panel Railway **dan**
   env level `Machine` di PC backup. Beda satu huruf = **seluruh video mati**.
   Pasang ulang / rotasi = **satu perintah**: `pc-backup-agent\pasang-tanda-tangan.ps1 -Kunci "<kunci>"`
   (`-Matikan` = saklar darurat yang memulihkan video dalam hitungan detik).

   ⚠️ **`AUTH_SECRET` kini menopang LEBIH BANYAK** (sejak 29 Okt): selain sesi admin, ia juga
   menandatangani identitas tamu untuk komentar & rating. Menghapus/menggantinya = **semua orang
   kehilangan hak hapus atas komentarnya sendiri** dan suara rating lamanya. Terverifikasi ADA di
   Railway (uji tulis sesudah rilis `98c2b92`).

### 🪤 TIGA JEBAKAN VERIFIKASI dari 29 Oktober — mahal kalau terulang

1. **`rm -rf .next` GAGAL DIAM-DIAM selama server lama hidup.** Di Windows berkas terkunci tak
   bisa dihapus dan `rm -rf` tidak mengeluh. Build berikutnya menulis sebagian → halaman
   ber-prerender (`○`/`●`) tetap versi LAMA. **Matikan server lewat PID → buktikan port kosong →
   `rm -rf .next` → buktikan foldernya hilang (`if [ -d .next ]`) → baru build.**
2. **Berkas ADA ≠ ada JALAN ke sana.** Tes `existsSync("app/login/page.tsx")` hijau terus walau
   SEMUA tautan ke sana lenyap — owner kehilangan jalan ke dashboard-nya. Untuk tiap halaman yang
   "sengaja dibiarkan hidup walau tombolnya dilepas", tulis tes yang memeriksa **jalannya**.
3. **Grep atas HTML halaman tak bisa memeriksa komponen yang lahir setelah interaksi.** Kartu di
   `/film` baru dirender sesudah penonton mengklik video — pemeriksaan HTML melaporkannya "hilang"
   dan nyaris dilaporkan sebagai regresi. Pakai tes render.

### 📦 UKURAN BERKAS INI → lihat catatan di header

Pesannya **sama persis** dengan catatan 📦 di bagian atas berkas, jadi sengaja TIDAK diulang di
sini: dua angka yang hidup berdampingan pasti melenceng, dan catatan yang angkanya saling
bertentangan berhenti dipercaya. Angka terbaru (dihitung, bukan ditaksir) ada di sana.

### ⛔ KEPUTUSAN OWNER — jangan ditawarkan lagi

Sudah diputuskan. Mengajukannya ulang membuang waktu owner:

1. **"Beli domain" BUKAN prasyarat menutup Vercel.** `dramaapp.vercel.app` juga
   subdomain gratis platform — situs ini sudah setahun hidup di alamat platform.
   AI sempat menjadikannya blocker; **owner mengoreksi, dan owner benar.**
2. **Penyegelan 13 variabel Railway: DITUNDA** sampai domain dibeli. Owner belum
   terbiasa dengan Railway, dan penyegelan itu permanen.
3. **`ai-review.yml` TETAP DIPAKAI** — jangan dihapus. Ia gagal keras & terlihat
   (bukan senyap), jadi tuduhan "kepercayaan palsu" dari AI itu berlebihan.
4. **Menghapus/memindahkan berkas koin & iklan: DITOLAK (28 Okt).** Owner memilih
   **saklar mati** dengan berkas tetap di tempatnya, supaya menyalakan kembali = mengubah
   2 konstanta, bukan merakit ulang. Konsekuensi yang sudah diterima owner: kodenya masih
   ikut terkirim ke browser (teks seperti "Pakai Koin" masih ada di dalam berkas JS, tapi
   tak pernah digambar).
5. **Ganti nama alamat Railway: TIDAK dilakukan** — memaksa satu putaran mitra
   Playly tambahan tanpa manfaat sepadan.

**Ditambah 29 Oktober:**

6. **Login & daftar DIHAPUS, khusus PENONTON.** Admin TETAP punya jalan masuk —
   itu syarat yang owner tegaskan sendiri sesudah AI sempat membuang semua tautan
   `/login`. Jangan pernah menggerbangi jalan pengelola dengan
   `AKUN_PENONTON_ENABLED`: justru saat saklar itu mati, tautan itulah yang
   paling dibutuhkan.
7. **Komentar & rating TETAP BISA DIPAKAI tanpa akun.** Owner menolak
   mematikannya bersama login. Konsekuensi yang sudah diterima: rating berarti
   **"satu BROWSER satu suara"**, jadi tetap DILARANG jadi structured data Google.
8. **Nama/email/website di komentar: SEMUANYA OPSIONAL.** Berbeda dari situs
   pembanding yang mewajibkan nama & email. Jangan "memperbaiki"nya jadi wajib.
9. **Badan halaman film TETAP ikut terang, layar pemutar `/watch` TIDAK.**
   Owner memilihnya lewat popup; layar pemutar sengaja gelap & tanpa navigasi
   supaya tak menutupi video.
10. **"Lanjut Menonton" DISEMBUNYIKAN sampai diklik.** Owner sudah mencoba versi
    "dipisah garis tapi tetap terbuka" dan **menolaknya** — *"kalau dipisah masih
    terlihat sama"*. Jangan tawarkan versi itu lagi.
11. **Kotak cari: BENTUK FINAL = melebar sejajar di dalam bar.** Tiga bentuk
    sebelumnya sudah ditolak satu per satu (kotak permanen "kelebaran" · lapisan
    penuh layar "bikin sakit mata" · panel menggantung "masih menutupi film").
    Jangan usulkan ukuran/lebar baru — pertanyaannya sudah dihapus, bukan dijawab.

### ✅ Selesai 27 Oktober (rincian di 3 entri paling atas di bawah)

Celah Node `CVE-2026-111497` + 7 CVE lain ditutup lewat `RAILPACK_NODE_VERSION`, **nol commit
kode, downtime nol** · scan `E:\promptScanner.txt` (2 dari 4 bagiannya terbukti tak bersasaran) ·
**kebocoran paywall Tahap A** — alamat video berhenti tercetak ke HTML · **Tahap B** — tunnel
menolak alamat tanpa tanda tangan · `pasang-tanda-tangan.ps1` dibuat supaya pemasangan ulang
jadi satu perintah yang memeriksa dirinya sendiri.

### 🪤 Jebakan yang paling mahal kalau terulang

**Lama, masih berlaku:**

- **Uji lock/mutex WAJIB dari proses lain** — dari proses yang sama hasilnya
  selalu hijau (mutex Windows re-entrant per-thread) dan tak membuktikan apa pun.
- **`KEEPALIVE_SITES` jangan DIKOSONGKAN** — `keep-db-awake.yml` punya nilai
  cadangan, jadi kolom kosong = robot jatuh balik ke alamat lama, tanpa gejala.
  **Ganti isinya.**
- **Edit berkas di repo ≠ hidup di PC backup.** PC backup **tidak punya folder
  repo**; script disalin manual ke `C:\Users\USER\pc-backup-agent\`.

**Baru dari 27 Oktober — ketiganya benar-benar mematikan video / hampir salah lapor:**

- 🔴 **Buktikan SEBELUM menyalakan, bukan sesudah.** Tiga kali video mati hari itu, dan semuanya
  satu pola: saklar dinyalakan lalu hasilnya diperiksa belakangan. Kalau sebuah langkah bisa
  mematikan produksi, syaratnya wajib dibuktikan lebih dulu — **dan pembuktian itu dipaksa oleh
  skrip, bukan diandalkan pada ingatan.**
- 🔴 **Proses di PC backup dimiliki `NT AUTHORITY\SYSTEM`.** `Stop-Process` dari PowerShell biasa
  GAGAL, dan `-ErrorAction SilentlyContinue` menyembunyikan kegagalannya. Gejalanya menipu:
  `/health` menjawab (proses lama hidup) tapi endpoint baru 404 (kode lama). **Jalankan sebagai
  Administrator, dan buktikan port benar-benar kosong — jangan percaya perintahnya jalan.**
- 🔴 **Dua komponen saling bergantung → uji juga urutan pemasangan yang SALAH.** `caddy reload`
  sebelum agent diganti membuat seluruh video mati. Uji lokal tak menangkapnya karena di sana
  agent selalu dinyalakan lebih dulu.
- 💡 **Panel hosting MENYEMBUNYIKAN nilai variabel.** Menyalin dengan menyorot teks menghasilkan
  nilai yang salah — ini yang membuat kunci tak cocok. Jangan membaca kunci dari panel: tulis ke
  satu berkas, salin dari situ ke panel, lalu jalankan pemasangnya membaca berkas yang sama.
- 💡 **Mengukur "apakah byte lewat server kita" WAJIB mematikan auto-redirect.**
  `Invoke-WebRequest` mengikuti redirect, jadi yang terbaca status server ORANG LAIN. Sempat
  hampir dilaporkan "`/api/teaser` berubah jadi proxy" padahal 307 dengan 0 byte.
- 💡 **Menyaring `premium` dengan truthiness itu SALAH** — pakai `-eq $true`. Truthiness memberi
  15 drama, yang benar 13–14; akibatnya owner sempat disuruh menguji paywall dengan drama yang
  ternyata gratis, dan perilaku yang BENAR hampir dilaporkan sebagai kebocoran.
- 💡 **JANGAN menguji ke alamat tunnel yang ditulis tangan** — alamat quick tunnel berganti tiap
  PC backup menyalakan ulang layanannya. 2026-10-28 alamat lama membalas **502** dan sempat
  terbaca seperti "agent mati / video down", padahal penonton baik-baik saja di alamat BARU.
  **Selalu ambil alamatnya dari situs** (`/api/teaser` → header `Location`), jangan dari catatan.

### ✅ Bukti tak sengaja yang berharga (2026-10-28)

PC backup menyalakan ulang layanannya sendiri (watchdog) dan membuat tunnel baru
`cloudy-wool-captain-tail…`. Sesudah restart penuh itu, penegakan tanda tangan **TETAP AKTIF**:
`/_agent/_verify` 403 · alamat polos 403 (3×) · penonton 200 · paywall ep1 200 / ep4 401.
Artinya perubahan di `start-video-services.ps1` yang meneruskan `VIDEO_SIGNING_SECRET` dari env
level `Machine` **benar-benar bekerja di jalur autostart** — hal yang tak bisa diuji saat
dipasang manual. Penegakan bertahan melewati restart PC; tidak perlu dipasang ulang tiap boot.

## 2026-10-31 — ✅ DIRILIS `7977f9c`: genre & negara akhirnya ikut menghitung FILM

**Dua keluhan owner, satu akar.** *"ketika klik genre misal komedi harus muncul hasilnya jadi tidak
monoton drama saja karena kita ada film"* dan *"negara kamu perbaiki karena ada indonesia juga, asia
dll"*. Dibaca dari kode, keduanya sebab yang sama: menu & penyaring hanya pernah melihat katalog
DRAMA, sementara 443 film diabaikan.

### 1. Klik genre tidak pernah menyentuh film

`DramaBrowser` menyaring film HANYA dengan ketikan kotak cari (`filter.q`) — genre/negara/tahun tak
pernah berlaku. Akibatnya dua hal salah sekaligus: mengklik "Anime" memulangkan **"0 judul"** padahal
ada film beranimasi, DAN pesan di bawahnya menyebut **"443 video cocok" untuk genre APA PUN** (443 =
jumlah SELURUH film, bukan yang cocok).

Sekarang film disaring dengan `filterOptions(filter)` yang **sama persis** dengan katalog drama, lewat
`lib/film-jelajah.ts`. Terukur sesudah perbaikan: genre **Komedi → 1 drama + 64 film**, genre
**Anime → 15 film**.

🪤 **JEBAKAN yang hampir membuat seluruh perbaikan ini nol guna** — sudah dipasangi tes yang MERAH
kalau terulang: tombol "Komedi" mengirim `cat=Comedy`, sedangkan film **tidak punya kategori kurasi
sama sekali** (nol film pernah diberi kategori admin) — nilainya cuma ada di `genre` OMDb. Kalau
`category` hanya diadu ke `v.kategori`, hasilnya **nol film selamanya** dan halaman tetap kosong
persis seperti sebelum diperbaiki, **tanpa satu pun error**.

### 2. Menu "Negara" ternyata dibangun dari SATU judul

⭐ **ANGKA YANG MENJELASKAN SEMUANYA** (diukur dari `/api/dramas` produksi): dari **40 drama, hanya 1**
yang punya kolom `country` — film *Meg 2 The Trench*, isinya `"United States, China, Thailand,
Germany, Canada, United Kingdom"`. **Itulah persis isi dropdown yang dikeluhkan owner.** Tidak ada
Indonesia/Korea/Jepang karena 39 drama lain memang tak punya data negara.

Film punya kolom negara yang jauh lebih rapat lewat metadata IMDb, tapi `country` **berhenti di
halaman tonton** dan tak pernah diteruskan ke kartu. Sekarang diteruskan, dan menunya dihitung dari
katalog LENGKAP. Hasil terukur: Australia · Canada · China · France · Germany · Iceland · India ·
**Indonesia** · Ireland · Japan · South Korea · Thailand · United Kingdom · United States.

**Dibatasi 12 teratas**, urut jumlah **JUDUL** (bukan kemunculan — satu film ko-produksi enam negara
tidak boleh menenggelamkan negara yang benar-benar punya banyak judul). Owner sudah pernah menolak
menu kepanjangan. Yang terpotong TIDAK hilang dari situs: tetap bisa dicapai lewat `?negara=<nama>`
dan tetap ikut tersaring — yang dibatasi cuma isi menunya.

### Ikut diperbaiki — kecil tapi nyata

- Judul halaman kini **"Jelajah Drama & Film — 1 drama · 64 film"**, bukan "0 judul" yang terbaca
  seperti pencarian gagal padahal hasilnya ada tepat di bawahnya.
- Ruang kosong "Tidak ada drama yang cocok" **mengecil** kalau ada film di bawah; blok setinggi layar
  membuat penonton berhenti menggulir.
- Kata **"Playly" dibuang** dari dua pesan yang dilihat penonton. Itu nama penyedia, dan owner sudah
  memutuskan 2026-09-26 penonton tidak melihatnya di mana pun — pelanggaran ini luput selama ini.
- `pecahDaftar()` disatukan di `lib/discover.ts` supaya drama & film memakai aturan pemecah nilai OMDb
  yang sama persis.
- ⚠️ `getCountryOptions` **tidak lagi dipakai membangun menu** — penggantinya `opsiNegaraGabungan`.
  Jangan dipakai lagi untuk menu: hasilnya cuma negara katalog drama, yang isinya 1 judul itu.

**RILIS & VERIFIKASI PRODUKSI.** Dual push `43b3355..7977f9c` (`dramaku` dulu, lalu `origin`).
**TAYANG ±75 detik.** Menu Negara di produksi kini berisi: Australia · Canada · China · France ·
Germany · India · **Indonesia** · Ireland · Japan · New Zealand · South Korea · Thailand · United
Kingdom · United States. Potret layar situs sungguhan pada `?cat=Comedy` berbunyi **"Jelajah Drama &
Film — 1 drama · 86 film — genre Komedi"** dengan film komedi benar-benar tergambar. Smoke test `/` ·
`/beranda` · `/discover` · `/film` · `/api/health` → **5 dari 5 = 200**.

**Rencana mundur 1 baris:** `git revert 7977f9c` lalu dual push — Railway build ulang ±60–90 detik.
Nol perubahan database, nol env baru.

### 🪤 DUA JEBAKAN VERIFIKASI hari ini — keduanya terbaca seperti kode yang rusak

1. **Server lama menahan port 3017 → halaman tampil HITAM KOSONG.** `next start` yang kedua gagal
   dengan `EADDRINUSE` **di log, bukan di layar**, jadi yang melayani tetap proses LAMA — dan karena
   `.next` sudah dihapus-dibangun-ulang, berkas yang dicarinya tak ada lagi. Nyaris dilaporkan sebagai
   fitur rusak. **Selalu matikan server lewat PID + buktikan portnya kosong sebelum `next start`.**
2. **`--virtual-time-budget` terlalu kecil → potret memperlihatkan halaman kosong.** `/discover`
   dirender di BROWSER (`useSearchParams`), jadi potret dengan budget 25 detik masih menangkap
   kerangka `<Suspense>` yang kosong. Dengan **60000** halaman terisi penuh. Gejalanya identik dengan
   "fiturnya tidak jalan" — bedanya cuma waktu.

---

---

## 2026-10-31 — ✅ DIRILIS `a44ac67`: poster FILM akhirnya punya rating ⭐ + kualitas HD

**Permintaan owner:** *"di poster film tidak ada keterangan HD/cam lalu rating berapa, seharusnya itu
sudah otomatis ikut ketika film tersebut di upload"*.

Dibaca dari kode, itu ternyata **DUA masalah berbeda** — dan cuma satu yang soal data:

**1. RATING sudah ada di data, cuma tidak pernah digambar.** `app/components/beranda/KartuVideo.tsx`
(kartu film di beranda) sejak lahir hanya menggambar durasi, padahal `PlaylyVideoPublik` punya field
`rating` (`lib/playly-publik.ts`). Diukur di produksi hari itu: **21 dari 24** film di halaman pertama
`/film` SUDAH punya rating. Jadi lencananya yang tak pernah dipasang, bukan datanya yang hilang.

**2. KUALITAS memang tak punya sumber sama sekali.** Penyedia video TIDAK pernah mengirim mutu berkas
— `PlaylyVideo` di `lib/playly.ts` isinya hanya judul, durasi, kreator, embed, sampul. Satu-satunya
sumber sebelum ini adalah `quality` milik drama yang dikaitkan admin, dan **nol kaitan** pernah dibuat
di produksi. Jadi kolom itu memang selalu kosong, bukan kadang-kadang.

### Keputusan owner untuk nomor 2: turunkan dari LINK UNDUHAN

Ada berkas **1080p → "HD"** · hanya **480p → "SD"** · tidak ada link → **tidak digambar sama sekali**.
Datanya nyata dan sudah kita simpan sendiri (`lib/playly-unduhan.ts`); diperiksa di produksi, 3 dari 3
film punya link 1080p.

⚠️ **BATAS YANG HARUS TETAP JUJUR** (ditulis juga di kepala `lib/kualitas-video.ts`): "ada berkas
1080p" membuktikan **resolusinya** tinggi, **TIDAK** membuktikan sumbernya bukan rekaman bioskop. Film
CAM beresolusi tinggi akan berlabel HD sampai seseorang mengoreksinya. Owner sudah diberi tahu risiko
ini sebelum memilih, dan karena itulah jalur koreksinya ikut dibangun.

**Urutan menangnya — jangan dibalik:** koreksi admin **>** kualitas drama yang dikaitkan **>** turunan
otomatis. Ada tes yang MERAH kalau turunan sampai menimpa koreksi manusia
(`tests/kualitas-video.test.ts`). Tanpa penjaga itu, koreksi admin hilang sendiri tiap halaman
menyegarkan diri, dan admin akan menyimpulkan panelnya rusak — rusak yang SENYAP.

### Yang dibangun

| Berkas | Isinya |
|---|---|
| `lib/kualitas-video.ts` | aturan turunan, fungsi murni (8 tes) |
| `playly:kualitas` (`lib/store.ts`) | dokumen koreksi admin per video |
| `/api/admin/playly/kualitas` | GET/POST; pagar disalin dari endpoint `genre` |
| panel admin Video Playly | dropdown **"Kualitas: otomatis"** + 8 pilihan |
| `app/components/lencana-gaya.ts` | rupa chip, dipakai bersama kartu drama & film |

**Cara owner mengoreksi film yang salah label:** Admin → Video dari Playly → cari filmnya → dropdown
kedua (**"Kualitas: otomatis"**) → pilih `CAM`. Poster berubah dalam ±5 menit. Pilih kembali
"Kualitas: otomatis" untuk mengembalikannya ke turunan link unduhan.

**Bukti:** `rm -rf .next` (dibuktikan hilang) → `npm run build` sukses → `npx tsc --noEmit` **exit 0**
→ `npm test` **1.799 hijau (naik 8)** → **POTRET LAYAR**: poster film membawa bintang rating di
kiri-atas dan chip HD hijau di kanan-atas, bentuk yang sama persis dengan contoh kiriman owner.

🪤 **JEBAKAN YANG NYARIS MENIPU saat verifikasi:** potret pertama sesudah `next start` memperlihatkan
rating muncul tapi **HD tidak** — nyaris dilaporkan sebagai fitur gagal. Penyebabnya beranda disajikan
dari hasil **prerender saat build**; sesudah halaman menyegarkan diri (`revalidate`), HD muncul di 20
kartu. **Sesudah mengubah data yang dipakai halaman ber-`revalidate`, panggil halamannya beberapa kali
dulu sebelum menyimpulkan.** Jebakan kedua di hari yang sama: `data/playly.json` lokal TIDAK dipakai
saat `.env.local` terhubung Supabase — menyuntik data uji ke sana nol efek dan sempat terbaca seperti
kode yang tidak jalan.

**RILIS & VERIFIKASI PRODUKSI.** Dual push `24170d7..a44ac67` (`dramaku` dulu, lalu `origin`).
**TAYANG ±90 detik** sesudah push: **20 lencana HD** terhitung di beranda produksi, dan potret layar
situs sungguhan memperlihatkan tiap poster film membawa ⭐ rating + chip HD. Smoke test `/` ·
`/beranda` · `/discover` · `/api/health` · `/film` → **5 dari 5 = 200**, nol 500 kali ini.

**Rencana mundur 1 baris:** `git revert a44ac67` lalu dual push — Railway build ulang ±60–90 detik.
Nol perubahan skema database (dokumen `playly:kualitas` lahir sendiri saat pertama kali diisi) dan nol
env baru, jadi mundur benar-benar cuma soal kode.

---

## 2026-10-31 — ✅ DIRILIS `4dde5c0`: tombol beranda "LIHAT SEMUA FILM UNGGULAN" → "TEMUKAN TONTONAN FAVORITMU"

**Permintaan owner:** *"lihat semua film unggulan sedangkan kita ada drama juga, baiknya diganti apa"*.
Owner menolak dua usulan bernada netral, lalu memilih versi yang **mengajak**.

**Labelnya memang salah di DUA sisi** — dua-duanya terbaca langsung dari kode, bukan selera:

1. Kata **"film"** keliru. Baris poster itu diisi `featuredHeroSlides` (`lib/hero-teaser.ts:82`) yang
   justru MENYARING drama berseri (`d.episodes >= 5`); komentarnya sendiri berbunyi *"Utamakan drama
   berseri, bukan film IMDb 1 bagian"*. Potret layar owner membenarkan: semua poster berlencana EPS.
2. Kata **"unggulan"** juga meleset. Tombolnya menuju `/discover` (`app/page.tsx:80`) = **katalog
   LENGKAP** drama + film ber-penyaring, bukan daftar unggulan. Tidak ada penyaring "unggulan" di sana.

**Kenapa kata "Tontonan":** halaman drama SUDAH memakai kosakata itu untuk kasus yang sama persis —
saat daftar sampingnya campuran, judulnya berubah jadi "Tontonan Lain" karena *"daftar campuran di
bawah judul Film Terkait adalah janji yang tidak ditepati"* (`app/drama/[id]/page.tsx:155`).
Satu konsep, satu nama (§3.3).

**Yang disentuh — 3 berkas, semuanya teks/komentar, NOL logika:**

- `app/components/beranda/FeaturedRow.tsx` — teks tombol (baris ~121), `aria-label` seksi
  `"Film unggulan"` → `"Tontonan unggulan"` (baris 82, ini yang dibacakan pembaca layar), komentar
  kepala berkas, + komentar baru di atas tombol yang menjelaskan kenapa kata "film" dibuang.
- `app/components/beranda/BadanKatalog.tsx` — komentar prop `heroHref`.
- `lib/beranda-catalog.ts` — komentar `FEATURED_ROW_COUNT`.

**Cakupannya sempit:** tombol besar itu hanya digambar saat `FeaturedRow` dipanggil TANPA `title` —
yakni lewat `BadanKatalog`, artinya `/` dan `/beranda` saja. Tiga pemanggil lain (`/shorts`,
`CatalogBrowser`, `TabKatalogTampilan`) memakai judul sendiri atau `tombolBawah={false}`.

**Bukti:** `rm -rf .next` → `npm run build` sukses → `npx tsc --noEmit` **exit 0** → `npm test`
**1.791 tes hijau (123 berkas)** → **POTRET LAYAR** `next start` lokal di 1280px: tombol tampil
UTUH, lebar terukur ±258px. Potret wajib karena pelajaran `55894b8` kemarin: tombol terpotong tidak
memicu satu pun error. Potret lokal itu sekaligus membuktikan `.next` benar-benar terbangun ulang
(jebakan #1 di seksi atas), karena teks barunya tergambar.

**RILIS & VERIFIKASI PRODUKSI.** Dual push `dc4e6e7..4dde5c0` — `dramaku` (cermin) dulu, lalu
`origin main` (= tombol rilis). Railway mem-build sendiri dari sumber; teks baru **TAYANG ±60 detik
sesudah push** (diperiksa tiap 15 detik; tiga pemeriksaan pertama masih memulangkan versi lama —
itu normal, bukan gejala gagal). Verifikasi penutup = **potret layar situs produksi** 1280px:
tombolnya tampil utuh.
⚠️ Pemeriksaan teksnya WAJIB abai huruf besar-kecil. Huruf kapital di tombol itu datang dari CSS
`uppercase`; di HTML teksnya tetap "Temukan tontonan favoritmu". Jebakan yang sama persis pernah
menipu pengukuran sinopsis (grep "SINOPSIS" memulangkan nol padahal ada).

**Smoke test sesudah rilis:** `/` · `/beranda` · `/discover` · `/api/health` (memulangkan
`{"ok":true,"sumberData":"database"}`) semuanya **200**.
⚠️ `/drama/meg-2-the-trench` sempat **500 SEKALI** pada pemeriksaan pertama, lalu **200 enam kali
berturut-turut** (0,20–0,22 detik) dan lima halaman drama lain juga 200. Dibaca sebagai halaman yang
kebetulan dibangun pertama kali tepat sesudah server naik (cold start), **bukan** kerusakan menetap.
Sengaja DICATAT, bukan dihapus: kalau 500 di halaman drama muncul lagi sesudah deploy berikutnya,
catatan ini bukti pertama bahwa polanya berulang — dan tanpa catatan, sesi berikutnya akan memulai
penyelidikan dari nol.

**Rencana mundur 1 baris:** `git revert 4dde5c0` lalu dual push — Railway build ulang sendiri
±60–90 detik. Nol perubahan database, nol env baru, jadi mundur benar-benar cuma soal kode. Lebih
cepat lagi: panel Railway → Deployments → Redeploy build sebelum `4dde5c0`.

### ❌ RALAT 2026-10-31 — "tombol tergeser ke kanan di layar HP" ITU TIDAK PERNAH ADA

Seksi ini semula melaporkan tombol yang tidak terpusat di HP sebagai **gejala nyata yang sudah
tayang**. **Laporan itu SALAH, dan ralat ini ditulis sesudah diukur, bukan sesudah ditebak.**
Dibiarkan berdiri (bukan dihapus) supaya sesi berikutnya tidak memburu bug yang tidak ada.

**Yang sebenarnya terjadi: cacat ALAT POTRET, bukan cacat situs.** Edge headless di mesin ini
TIDAK BISA membuat jendela lebih sempit dari **±476px**. Meminta `--window-size=360` (bahkan 320)
tetap menghasilkan viewport **476** — alat hanya **MEMOTONG gambar dari kiri**. Elemen yang terpusat
di 476px otomatis tampak bergeser ke kanan pada gambar selebar 360. Pembanding ke produksi pun ikut
menyesatkan: dua-duanya dipotong oleh alat yang sama, jadi "bentuknya sama persis" cuma membuktikan
alatnya konsisten, bukan situsnya bergejala.

**Pengukuran yang membantahnya** (viewport 356px sungguhan, lewat bingkai `<iframe width=360>` di
halaman uji lokal sehingga DOM-nya bisa diukur dari dalam):

```
vw=356  bodyScroll=356  htmlScroll=356      <- bodyScroll == vw: NOL pelebaran halaman
TOMBOL kiri=49 kanan=307 lebar=258 pusat=178   (pusat layar=178)   <- terpusat SEMPURNA
```

⭐ **CARA BENAR MEMOTRET LEBAR HP DI MESIN INI** (pakai ini, jangan `--window-size` kecil):
buat halaman uji sementara berisi `<iframe src="/" width=360>`, lalu ukur dari dalam bingkai itu.
`--window-size` di bawah ±476 **diam-diam berbohong** — tidak ada error, cuma gambar terpotong.
Potret tetap WAJIB `--headless=new --screenshot` **TANPA** `--remote-debugging-port` (port itu
2026-10-28 nyasar ke browser penyewa lain).

🪤 **JEBAKAN `next dev` yang ikut tertangkap hari ini.** Menjalankan `npx next dev` mengubah DUA
berkas tanpa diminta: (a) `next-env.d.ts` diarahkan ke `./.next/dev/types/...` — kalau ini ter-commit,
gerbang `tsc` sesudah `next build` memeriksa berkas yang salah; (b) `AGENTS.md` — berkas kernel tim
yang TIDAK boleh diedit — disisipi blok `<!-- BEGIN:nextjs-agent-rules -->` oleh
`node_modules/next/dist/server/lib/generate-agent-files.js`. **Sesudah memakai `next dev`, selalu
`git status` dan kembalikan kedua berkas itu.**

---

## 2026-10-30 — ⏸️ DIBAHAS, BELUM DIPUTUSKAN: sinopsis film masih bahasa Inggris

Owner (tangkapan layar halaman `/tonton`): *"di sinopsis isinya bahasa inggris bisa kamu buat
bahasa indonesia atau kamu tambahkan translate yang mana bagusnya"*.
Disajikan 4 pilihan → owner: **"kamu simpan ini dulu di update kita putuskan nanti"**.
**NOL kode diubah.** Risetnya di bawah — **jangan diukur ulang**.

### Angka yang SUDAH diukur dari produksi (2026-10-30)

| Yang diukur | Hasil |
|---|---|
| Halaman `/tonton` terdaftar di `sitemap.xml` | **443** |
| Sampel 40 halaman acak (tiap baris ke-11): sinopsis **INGGRIS** | **31** (≈78%) |
| Sinopsis **INDONESIA** | **0** |
| Tanpa sinopsis | 9 |
| Perkiraan total halaman berbahasa Inggris | **± 340** |
| Katalog **drama** (`/api/dramas`, 40 judul) | **100% sudah Indonesia — TIDAK terdampak** |

⚠️ **Jebakan pengukuran yang sudah memakan satu putaran:** markup-nya `<h2>Sinopsis</h2>`,
huruf besar "SINOPSIS" di layar itu dari CSS. Grep atas `SINOPSIS` memulangkan **nol** dan
sempat terbaca seperti "tak ada sinopsis sama sekali". Pola yang benar:
`Sinopsis</h2><p[^>]*>`.

### Fakta kode (jangan ditelusuri ulang)

- Sinopsis film datang dari **OMDb `Plot`** → `lib/imdb-tool.ts:215`. OMDb **hanya** Inggris,
  jadi ini bukan kelalaian — memang begitu datangnya.
- Tersimpan di **SATU dokumen** Supabase `playly:imdb` (peta `{videoId: meta}`),
  `lib/store.ts:1242`. Penyetelnya sudah ada: `setPlaylyVideoImdb`.
  **→ Menerjemahkan TIDAK perlu mengubah struktur database sama sekali.**
- Halaman drama (`/drama/<id>`) memakai `drama.synopsis` yang diisi tangan/sumber Playly —
  itu sebabnya sudah Indonesia.

### Pendapat AI (kalau dilanjutkan nanti)

**Terjemahkan & SIMPAN, bukan tombol translate.** Alasan terkuat: **443 halaman itu ada di
sitemap**, dan tombol terjemah **nol manfaat bagi Google** — Google membaca HTML saat pertama
dikirim, sebelum ada yang mengklik. Menyimpan terjemahan membuat ratusan halaman relevan untuk
pencarian **Indonesia**; tombol tidak. Tambahan: sinopsis dibaca untuk memutuskan menonton, jadi
yang harus diklik dulu kebanyakan tak diklik; dan tersimpan = nol panggilan ke luar per kunjungan.

**Kelemahan jujurnya:** judul BARU dari Playly tetap datang Inggris → harus disambung ke jalur
impor, kalau tidak masalahnya kembali pelan-pelan.

Empat pilihan yang sudah disajikan: (1) AI terjemahkan + sambung ke impor, 3-4 jam, nol kunci API
baru, tapi AI menulis massal ke database produksi → **butuh izin owner**; (2) terjemahkan yang ada
saja tanpa menyambung impor, 2 jam; (3) **TMDB** — sinopsis Indonesia tulisan manusia, API gratis,
**TAPI cakupannya BELUM diukur** (jangan mengarang angka) + owner perlu daftar kunci gratis;
(4) tombol Terjemahkan — tidak direkomendasikan.

### 💡 Ikut terlihat di tangkapan layar yang sama, belum ditanyakan

Label `Director` · `Writers` · `Stars` di halaman `/tonton` **dan** `/drama` masih bahasa
Inggris (`Asal` dan `IMDb` sudah benar). Tiga kata, label saja, nol risiko — tinggal diminta.

---

## 2026-10-30 — ⏸️ DIBAHAS, BELUM DIPUTUSKAN: "klik drama langsung play"

Owner bertanya (dengan tangkapan layar menunjuk area gambar besar halaman drama):
*"kamu buat pilihan jadi begitu kita klik drama langsung play gimana menurutmu"*.
Disajikan 4 pilihan → owner memilih **"Jangan dulu, saya pikir-pikir"**.
**NOL kode diubah.** Dicatat di sini supaya sesi berikutnya tidak menanyakan ulang dari nol
dan tidak mengulang riset yang sama.

### Fakta yang sudah digali (jangan diteliti ulang)

| Fakta | Berkas |
|---|---|
| Kartu drama diklik → `/drama/<id>` (halaman detail) | `CatalogCard.tsx:38`, `DramaCard.tsx:19` |
| Pemutarnya `/feed/<id>` — tombol "Mulai/Lanjut Nonton" ke sana | `WatchCta.tsx` |
| `/drama/<id>` punya `generateMetadata` + structured data + `generateStaticParams` (dicetak statis) | `app/drama/[id]/page.tsx` |
| `/feed/<id>` **`force-dynamic`, NOL metadata, NOL structured data** | `app/feed/[id]/page.tsx` |
| **Sitemap HANYA memuat `/drama/<id>`**, tidak memuat `/feed` | `app/sitemap.ts:38` |
| `/watch/<id>/<ep>` sudah lama hanya mengalihkan ke `/feed` | `app/watch/[id]/[ep]/page.tsx:7` |
| Hero halaman drama **murni foto diam** — nol `<video>` di seluruh berkas | `HeroDrama` di `page.tsx:493` |
| Mekanisme tunda-unduh teaser SUDAH ADA (1,2 detik) dan dibuat persis untuk kasus ini | `lib/hero-teaser.ts` `HERO_TEASER_DELAY_MS` |

### ⚠️ BATAS KERAS yang membatasi SEMUA rancangan

**Browser memblokir video yang jalan sendiri kalau ada suara**, dan mengklik kartu TIDAK
memindahkan izin itu ke halaman berikutnya. Kode kita sudah tahu: `FeedPlayer.tsx:405,435`
menangkapnya (`autoplay diblokir → tombol play`), dan `muted` bawaannya `false`.
**Versi jujur dari "langsung play" di web mana pun = jalan TANPA SUARA, sekali ketuk untuk suara.**
Jangan pernah menjanjikan lebih dari itu ke owner.

### Dua ongkos nyata kalau kartu dibuat lompat langsung ke pemutar

1. **Google.** 40 halaman `/drama/<id>` adalah satu-satunya yang terindeks; mengarahkan semua
   kartu ke `/feed` membuat tautan internal ke sana tinggal dari sitemap saja. `/feed` tak bisa
   menggantikannya tanpa ditambahi metadata + dimasukkan sitemap.
2. **Kuota & mesin owner.** Video lewat terowongan dari PC backup. Tiap klik iseng langsung
   menarik video — penonton yang cuma mau baca sinopsis pun memakan megabyte.

### Rekomendasi AI (kalau owner melanjutkan nanti)

**Hero halaman detail yang langsung memutar di tempat** (tanpa suara), ketuk → layar penuh +
suara. Dapat rasa "langsung jalan", nol kehilangan Google, video berat baru ditarik saat
penonton benar-benar mau, dan mekanisme tundanya sudah ada. Perkiraan 2-3 jam, nol pekerjaan
untuk owner. Pilihan lain yang sudah disajikan: kartu lompat langsung ke pemutar (3-4 jam,
+ metadata & sitemap untuk `/feed`), atau keduanya + saklar penonton (4-5 jam).

---

## 2026-10-30 — ✅ DIRILIS `55894b8`: dua tombol halaman drama yang terpotong tanpa gejala

Dilaporkan **OWNER dari layar**, bukan oleh mesin. Baris aksi di bawah poster seharusnya berisi
**empat** tombol — `Mulai Nonton · Tambah Favorit · Suka · Bagikan`. Di lebar 1280px yang benar-
benar tampil cuma dua: **"Suka" sepotong di tepi kanan, "Bagikan" HILANG TOTAL**. Artinya dua
fungsi itu **tak bisa dipakai siapa pun** di ukuran layar segitu.

### 🪤 PELAJARAN TERPENTING — kerusakan LEBAR tak bisa dibuktikan oleh mesin

Saat kerusakan ini sedang tayang: `npm run build` **sukses**, `npx tsc --noEmit` **exit 0**, dan
**1.784 tes hijau semua**. `overflow-hidden` memotong **tanpa error, tanpa scrollbar, tanpa satu
pun pesan di console**. Tak ada gerbang yang bisa menangkapnya.

**Aturan: untuk apa pun yang soal LEBAR/tata letak, bukti satu-satunya adalah POTRET LAYAR.**
Caranya di mesin ini: Edge `--headless=new --screenshot` **TANPA** `--remote-debugging-port` —
port debug itu yang pada 2026-10-28 membuat perintah browser mendarat di browser penyewa lain
di server sewaan bersama ini. Edge & Chrome keduanya sudah terpasang, tak perlu memasang apa pun.

### Sebabnya: tiga hal yang masing-masing wajar

1. Tombol dasar project membawa `shrink-0` (`components/ui/button.tsx`) — "jangan pernah menyusut".
2. `SaveButton`/`LikeButton`/`ShareButton` masing-masing membawa `w-full` — "ambil 100% lebar induk".
3. Ketiganya dikurung **satu** `<div className="flex flex-1 gap-2">`, induknya ber-`overflow-hidden`.

Digabung: tiga tombol berebut 100% ruang yang sama, menolak menyusut, kelebihannya dipotong.

**Perbaikannya:** baris diratakan jadi satu flex yang BOLEH membungkus — `sm:flex-wrap`, tiap
tombol `sm:flex-1` + `sm:min-w-[…]`. `flex-1` membuat lebar dasar 0 sehingga tombol hanya TUMBUH
(tak perlu menyusut), `min-w` menjaga teks utuh sekaligus menentukan kapan membungkus.
`overflow-hidden` **TIDAK** dilepas — ia masih melindungi dari luapan lain.

### 💡 Cacat ikutan: PROP YANG BERBOHONG

`SaveButton` **mengumumkan** prop `className` tapi cabang yang dipakai halaman drama tidak pernah
memasangnya (hanya cabang `hero`). Pemanggil mengatur lebar → diabaikan tanpa peringatan.
`LikeButton` malah belum punya propnya sama sekali. Keduanya dibereskan: prop yang berbohong akan
menipu pemanggil berikutnya juga.

### Bukti

Potret produksi 1280px sesudah rilis: keempat tombol utuh · 8 halaman **200** · `/api/dramas`
**33.477 byte** utuh · keempat tulisan tombol terkirim ke browser · alamat `.mp4` telanjang **0** ·
jalan masuk pengelola **1** · label genre tak mundur (`Aksi` 55× `CEO` 12× `Kerajaan` 4×).
Gerbang §6: build sukses (40 judul dari database) · `tsc` exit 0 · **1.791 tes hijau** (+7 baru).

Penjaganya `tests/tombol-aksi-drama.test.ts`, **diuji MERAH lebih dulu** (dengan `sm:flex-wrap`
dilepas, tes langsung gagal; dipulihkan, hijau lagi). Sebagian membaca SUMBER, bukan merender —
disengaja: `jsdom` tidak menghitung lebar sama sekali, jadi tes render apa pun akan hijau baik
tombolnya terpotong maupun tidak. Yang dikunci adalah BENTUK yang membuat pemotongan mustahil.

### ⚪ Ditemukan tapi TIDAK dikerjakan (di luar permintaan)

Di layar **≤1024px**, kolom "Drama Terkait" turun ke bawah hero dan menampilkan **seluruh 20
judul** SEBELUM baris tombol aksi. Di tablet, penonton menggulir melewati 20 drama lain sebelum
sampai ke tombol "Mulai Nonton" drama yang sedang dibukanya. Di HP dampaknya diredam tombol
melayang di bawah layar; di tablet tidak. **Bentuk lama, bukan akibat perbaikan ini.** Menunggu
keputusan owner.

Rincian: `docs/lintasai/rencana/2026-10-30-tombol-aksi-terpotong.md`.

---

## 2026-10-30 — ✅ DIRILIS `5088bf2` + koreksi `27973f0`: nama genre jadi bahasa Indonesia

Owner (dengan tangkapan layar menu **Genre** di bar merah): *"ubah bagian genre ke bahasa
indonesia agar sinkron semua menggunakan bahasa indonesia"*.

**TAYANG** di `https://dramaapp-production-9e88.up.railway.app` sejak 2026-10-30. Dual push `ee6fbc5..5088bf2` ke `origin` + `dramaku` tuntas, Railway build sendiri, **tayang ~90 detik, downtime NOL**.

**Smoke test produksi sesudah rilis:** 7 halaman (`/` `/beranda` `/discover` `/film` `/katalog` `/login` `/admin`) semuanya **200** · `/api/dramas` **33.477 byte** (sama persis dengan sebelum rilis, katalog utuh 40 judul) · **nol** genre Inggris yang terlihat penonton di 4 halaman, 110 label Indonesia di halaman depan · chip halaman drama `>Aksi<` `>Horor<` `>Petualangan<` · **jalan masuk pengelola utuh** ("Masuk sebagai pengelola" → `/login` tetap ada di halaman depan) · **pagar video tidak mundur** (alamat `.mp4` telanjang di HTML `/feed` tetap **0**).

**Rencana mundur 1 baris** kalau nanti ada keluhan: `git revert 5088bf2` lalu dual push — Railway build ulang sendiri ~90 detik. Tak ada perubahan database maupun env, jadi mundur benar-benar cuma soal kode.

**Yang penonton lihat sekarang:** Action→**Aksi** · Romance→**Romantis** · Tycoon→**CEO** ·
Harem→**Kerajaan** ·
Comedy→**Komedi** · Time Travel→**Lintas Waktu** · Adventure→**Petualangan** · Horror→**Horor** ·
Sci-Fi→**Fiksi Ilmiah**. Tombol menu **"+ More" → "Lainnya"**. **Thriller** & **Anime** SENGAJA
tetap — kata Inggrisnya sudah jadi istilah sehari-hari penonton; memaksakan padanan malah membuat
genre-nya tak dikenali. **CEO** juga Inggris, tapi itu **pilihan owner sendiri**.

### ⛔ KOREKSI OWNER sesudah rilis pagi — TAYANG di `27973f0`, jangan dibalik

| Rilis pagi (`5088bf2`) | Koreksi owner | Catatan |
|---|---|---|
| Harem (dibiarkan Inggris) | **Kerajaan** | AI menilai "Harem" lebih dikenali. Owner tak setuju. |
| Taipan | **CEO** | AI menawarkan Konglomerat/Crazy Rich/Orang Kaya/Bos Kaya; owner menulis sendiri "CEO". |
| + More | **Lainnya** | **Mencabut keputusan owner 2026-09-21** yang dulu justru meminta label Inggris itu (ditegaskan dua kali waktu itu). |

⚠️ **"Series" TIDAK ikut diubah.** Ia lahir dari keputusan 2026-09-21 yang SAMA dengan "+ More",
tapi owner kali ini hanya menyebut "more". Jangan diubah tanpa diminta — dan jangan pula
"mengembalikan" Lainnya jadi + More dengan alasan catatan September.

**Bukti koreksi `27973f0` (tayang ~150 detik):** tombol bar merah terbaca `Genre · Series ·
Populer · Negara · Tahun · Lainnya` · kartu poster halaman depan: `CEO` 12× `Kerajaan` 4×
`Aksi` 57× `Romantis` 29× `Komedi` 5× `Lintas Waktu` 4× · **kata lama nol semua** (`Taipan` 0 ·
`Harem` 0 · `+ More` 0 · `Tycoon` 0) · 7 halaman **200** · `/api/dramas` **33.477 byte** utuh ·
jalan masuk pengelola **tetap 1** · alamat `.mp4` telanjang di `/film` tetap **0**.

Berubah di 13 permukaan: menu Genre di bar merah · strip kuning · dropdown Filter `/beranda` ·
kolom "Genre Populer" di kaki situs · tulisan di bawah judul tiap kartu poster · chip genre di
halaman drama/film · kolom Terpopuler · baris "Trending di …" · keterangan penyaring di judul
`/discover` · kartu & grid video Playly · halaman `/tonton`.

### ⚠️ ATURAN PERMANEN yang lahir di sini — jangan dilanggar

**Nama genre dipakai untuk LIMA hal sekaligus. Hanya SATU yang boleh diterjemahkan.**

| Dipakai untuk | Boleh diterjemahkan? |
|---|---|
| Tulisan yang dibaca penonton | ✅ ya |
| Nilai penyaring di alamat (`/discover?cat=Action`) | ❌ TIDAK |
| Pencocokan "Drama Terkait" (`lib/film-terkait.ts`) | ❌ TIDAK |
| Pencarian warna aksen (`lib/genre-accent.ts`) | ❌ TIDAK |
| Pencocokan ketikan pencarian (`lib/discover.ts`) | ➕ DITAMBAH, bukan menggantikan |

Penerjemahnya **`lib/genre.ts`** (`labelGenre` + `labelGenreGabungan`) — kembaran `lib/negara.ts`
yang sudah terbukti. Nama di luar daftar dipulangkan apa adanya, jadi katalog yang tumbuh tak
pernah kehilangan chip. **Tambah genre baru = tambah satu baris di berkas itu, bukan di tempat
gambarnya.**

### Panel admin SENGAJA tetap Inggris

Dropdown kategori, kolom "Genre (OMDb)", dan lencana di daftar drama **tidak** diterjemahkan:
di sana yang terlihat adalah **nilai yang benar-benar tersimpan di database**, dan kolom OMDb-nya
harus cocok dengan ejaan OMDb. Menampilkan "Aksi" sementara yang tersimpan "Action" membuat owner
salah baca saat mencocokkan data. Bukan kelupaan — bisa diubah kalau owner minta.

### Bukti

`npm test` **1.784 hijau** (122 berkas) · `npm run build` sukses · `npx tsc --noEmit` **exit 0**
(dijalankan SESUDAH build) · HTML dari server lokal: `href="/discover?cat=Action">Aksi<` — label
Indonesia, alamat ejaan asli · `/beranda` **nol** genre Inggris yang terlihat penonton · halaman
drama: `>Aksi<` `>Horor<` `>Petualangan<`.

Penjaga permanen: **`tests/genre-label.test.ts`** (10 tes). Yang dijaga bukan selera terjemahan,
melainkan dua kegagalan senyap — (1) label bocor ke alamat, (2) label dipakai mencari warna.
Plus pagar masa-depan: **kategori BARU di `CATEGORIES` (`lib/types.ts`) membuat tes MERAH sampai
labelnya didaftarkan** — tanpa itu kategori baru muncul dalam bahasa Inggris dan tak ada yang tahu.
Di `tests/nav-katalog.test.ts`, tiap pilihan menu Genre dijalankan lewat penyaring yang SAMA dengan
`/discover` lalu dipastikan memulangkan minimal satu judul.

Rincian: `docs/lintasai/rencana/2026-10-30-genre-bahasa-indonesia.md`.

---

## 2026-10-29 — ✅ DIRILIS `d0d301e`: cari sejajar + panel lipat + terkait sesuai jenis.

Owner: *"sudah pas mantap, langsung gas kita rilis"*. Dual push tuntas, uji asap hijau.

### Lima koreksi tampilan yang ikut tayang

1. **Kotak cari SEJAJAR di dalam bar.** Bentuknya sudah EMPAT putaran: kotak permanen
   ("kelebaran") → lapisan penuh layar ("bikin sakit mata", menutupi poster) → panel menggantung
   (masih menimpa baris poster) → **kotak mengisi ruang kosong di bar**. Yang terakhir satu-satunya
   yang menutupi **NOL** bagian halaman. Dijaga tes yang menelusuri SELURUH induk kotak dan menolak
   `fixed`/`absolute` apa pun.
2. **`/discover` ikut tombol**, tapi kotaknya **terbuka sendiri** kalau ada `?q=`. 🪤
   `useState(bukaAwal)` saja TIDAK cukup — `/discover` halaman STATIS, kata kuncinya baru terbaca
   di browser, dan nilai awal tak pernah menyusul. Butuh `useEffect`.
3. **Lanjut Menonton disembunyikan** sampai diklik. Owner menolak versi "dipisah garis"
   (*"masih terlihat sama"*). Accordion diangkat dari `LanjutMenonton` jadi `PanelLipat` bersama.
4. **Panah geser hilang** saat isinya muat satu layar — baris 1 kartu tetap menggambar panah yang
   ditekan tak melakukan apa pun. Gradien tepi ikut digerbangi (ia "berbohong" soal ada lanjutan).
5. **Panel terkait mengikuti JENIS tayangan** lewat `isMovie()`.

### 🪤 KATALOG CUMA PUNYA 1 FILM — dan itu mengubah fitur nomor 5

Diukur 2026-10-29: **1 film + 39 serial**. Penyaringan ketat membuat halaman FILM kehilangan kolom
kanannya SAMA SEKALI — "memperbaiki" judul justru menghapus fiturnya.

Jadi ada **jatuh-kembali**: kalau katalog sejenis ≤ 1, dipakai seluruh katalog **DAN judulnya
berubah jadi "Tontonan Lain"**. Daftar campuran di bawah judul "Film Terkait" adalah janji yang
tidak ditepati. Begitu film kedua masuk katalog, judulnya kembali sendiri **tanpa ubah kode**.

📌 Jadi kalau owner suatu saat bertanya *"kenapa halaman film tulisannya Tontonan Lain?"* —
jawabannya: tambah film kedua ke katalog.

### Bukti

build **sukses** · `tsc` **exit 0** · **1.776 tes hijau** (+17) · dual push tuntas · di situs asli:
11 halaman **200** (termasuk `?q=naruto`, `/login`, `/admin`) · bar `/beranda` **nol elemen
melayang** · `/discover` tombol & kotak tertutup · panel Lanjut Menonton **tertutup, isi belum
tergambar** · SERIAL → **"Drama Terkait"**, FILM → **"Tontonan Lain"** · komentar **200**, rating
**200**, hapus **200**, data uji dibersihkan.

### ↩️ ROLLBACK 1-BARIS

```
git revert d0d301e && git push origin main && git push dramaku main
```
Nol migration SQL, nol env baru.

---

## 2026-10-29 — 🔴 PERBAIKAN SESUDAH RILIS: jalan masuk PENGELOLA sempat hilang. TAYANG `a0f4079`.

Owner, beberapa menit sesudah rilis: *"aku bilang login daftar khusus viewer saja yang
dihilangkan, kenapa admin juga ikut nggak ada, gimana aku edit dashboard-ku."*

### Apa yang sebenarnya terjadi

`/login`, `/daftar`, `/admin` **tidak pernah dihapus** — ketiganya 200 sepanjang waktu. Yang
hilang adalah **SELURUH TAUTAN** menuju ke sana, termasuk jalan owner ke panel admin-nya sendiri.
Satu-satunya cara mencapainya jadi mengetik alamat manual.

Permintaan owner jelas **"khusus viewer"**. Membuang jalan admin adalah keputusan yang diambil AI
sendiri — ditulis di catatan rilis sebagai *"admin membukanya dengan mengetik alamat"* — tanpa
pernah menanyakannya. Itu salah.

### 🔴 KENAPA TES TIDAK MENANGKAPNYA — pelajaran paling berharga hari ini

Ada tes bernama **"halaman /login & /daftar TETAP hidup — itu pintu ADMIN"**. Ia **hijau terus**,
termasuk saat semua tautan ke sana sudah lenyap. Sebabnya ia memeriksa `existsSync()` — keberadaan
BERKAS.

> **Berkas ADA ≠ ada JALAN ke sana.** Tes keberadaan berkas/route tidak pernah bisa membuktikan
> sebuah halaman masih bisa DICAPAI. Untuk tiap halaman yang "sengaja dibiarkan hidup walau
> tombolnya dilepas", tulis juga tes yang memeriksa **jalannya**, bukan cuma berkasnya.

Penjaga baru: **"ADA JALAN ke /login dari dalam situs"** + **"jalan pengelola TIDAK ikut dijeda
saklar penonton"**.

### Perbaikannya: DUA jalan, masing-masing menutup lubang yang lain

| Jalan | Ada di |
|---|---|
| Kaki situs — "Masuk sebagai pengelola" | `/` dan semua halaman film |
| Menu garis-tiga — item yang sama | `/beranda`, `/discover`, semua halaman film |

Dua-duanya WAJIB: kaki situs **tidak digambar di `/beranda`** (owner melepasnya 2026-10-28) —
justru halaman yang paling sering dibuka owner. Terverifikasi di produksi: tiap halaman punya
minimal satu jalan.

⚠️ Keduanya **SENGAJA tidak digerbangi `AKUN_PENONTON_ENABLED`** — justru saat saklar itu mati,
tautan inilah yang paling dibutuhkan. Menggerbanginya = mengulang persis kesalahan ini.

🔒 Keamanan **tidak berubah sedikit pun**. `skills/auth/SKILL.md`: *"menyembunyikan tombol di layar
BUKAN kontrol izin"*. Halaman login tetap meminta password + pembatas laju; `/admin` tetap
digerbangi cookie sesi admin bertanda tangan. Yang berubah cuma: pengelola tak perlu menghafal
alamat.

### Bukti

build **sukses** · `tsc` **exit 0** · **1.761 tes hijau** (+2) · dual push tuntas · di situs asli:
`/` kaki situs ✓ · `/beranda` menu garis-tiga ✓ · `/drama/…` keduanya ✓ · `/login` & `/admin` 200.

---

## 2026-10-29 — ✅ DIRILIS `98c2b92`. Semua pekerjaan hari ini TAYANG.

Owner: *"rilis"* (izin eksplisit, rak `skills/deploy/SKILL.md` §1). Dual push tuntas:
`dramaku` (cermin) lebih dulu, lalu `origin main` (= tombol rilis). Deploy Railway selesai
±3 menit sesudah push.

### Gerbang §6 — lolos lengkap, urutan build→tsc

`rm -rf .next` (dibuktikan terhapus) → `npm run build` **sukses** → `npx tsc --noEmit` **exit 0**
→ `npm test` **1.759 hijau / 121 berkas** → nol berkas env/rahasia ter-stage → `data/` bersih →
`.env.local` terbukti ter-ignore.

### Uji asap di SITUS ASLI sesudah tayang

| Pemeriksaan | Hasil |
|---|---|
| 9 halaman utama (`/`, `/beranda`, `/discover`, `/film`, `/katalog`, `/drama/…`, `/tonton/…`, `/login`, `/admin`) | semua **200** |
| Komentar TANPA akun | **200** — tersimpan |
| Rating TANPA akun | **200** |
| Hapus komentar sendiri | **200** |
| Tampilan (3 halaman) | tombol cari pop up · **nol** tautan Masuk/Daftar · latar terang · panel Film Terkait + Terpopuler · kolom komentar 3 kolom opsional · kaki situs gelap — semua **OK** |

🔑 **`AUTH_SECRET` TERBUKTI ADA di Railway.** Ini risiko rilis terbesar hari ini dan tak bisa
dipastikan dari luar sebelum tayang: identitas tamu gagal-MENGUNCI (503) tanpa kunci itu, jadi
komentar & rating akan mati total. Uji tulis di atas yang membuktikannya.

🧹 Data uji dibersihkan: komentar `__uji-rilis__` dihapus, `GET` memulangkan `{"comments":[]}`.
`dramaId` uji sengaja dipilih yang TIDAK ada di katalog, jadi tak pernah tampil di halaman mana pun.

### ↩️ ROLLBACK 1-BARIS (kalau ada yang salah)

```
git revert 98c2b92 && git push origin main && git push dramaku main
```
Atau lebih cepat: panel Railway → Deployments → pilih build sebelum `98c2b92` → Redeploy.
**Nol migration SQL, nol env baru** di rilis ini, jadi mundur tidak meninggalkan apa pun.

### ⏸️ Yang bisa dimatikan tanpa rollback

`AKUN_PENONTON_ENABLED` di `lib/saklar-fitur.ts` → `true` mengembalikan tombol Masuk/Daftar.

---

## 2026-10-29 (ke-9) — Blok judul + tombol unduh /tonton dirapikan. **BELUM DIRILIS**.

Owner: *"tampilan download dan komponennya terkesan kaku, ubah supaya lebih enak dilihat TAPI
jangan ganti isi-isinya, hanya layout-nya."*

### Tiga sebab "kaku" — semuanya tata letak, nol isi dibuang

1. **Judul film tergambar DUA KALI** — `<h1>` halaman, lalu diulang persis di dalam kotak tepat di
   bawahnya. Ini yang paling cepat membuat halaman terasa belum dirapikan.
2. **Kotak berbingkai `max-w-sm`** terjepit di tengah kolom lebar — terbaca seperti potongan yang
   tertinggal dari halaman lain.
3. **Tombol beda tinggi**: DOWNLOAD `h-9`, Share & Save `h-8`.

Diperbaiki lewat prop **`tataLetak: "kartu" | "halaman"`** di `InfoVideoPlayly`:
mode halaman melepas bingkai, berhenti menggambar judul (duplikat), dan menyamakan ketiga tombol
di `h-10`. **Bawaannya tetap `"kartu"`** — `PlaylyVideoGrid` butuh bentuk kartu, dan di sana
tidak ada yang berubah (dijaga tes `render() === render("kartu")`).

### 🪤 ALARM PALSU yang hampir kulaporkan sebagai regresi

Pemeriksaan HTML `/film` melaporkan *"kartu berbingkai HILANG — regresi!"*. **Salah.**
`PlaylyVideoGrid` menggambar kotak itu HANYA sesudah penonton **mengklik** sebuah video
(`{aktif && …}`), jadi ia memang tidak ada di HTML awal halaman. Grep atas HTML statis **tidak
bisa** memeriksa komponen yang baru lahir setelah interaksi — yang menjawabnya render sungguhan.

📌 **Aturan:** sebelum menyimpulkan regresi dari HTML halaman, pastikan dulu komponennya memang
tergambar tanpa interaksi. Kalau tidak, pakai tes render. Ini kali KEEMPAT di sesi ini sebuah
pemeriksaan verifikasi memberi angka yang salah (sebelumnya: potongan markup, escape backslash,
dan kata "Terpopuler" yang juga ada di strip kepala).

### Bukti

build **sukses** · `tsc` **exit 0** · **1.754 tes hijau / 121 berkas** (+11 di
`tests/tata-letak-blok-judul.test.ts`, 5 di antaranya render sungguhan) · dari HTML `/tonton`:
judul yang TERLIHAT tinggal **1×** (sisanya kaki situs + penanda Google), kotak berbingkai sudah
dilepas, ketiga tombol `h-10`, 3 chip genre, DOWNLOAD/Bagikan/Simpan semuanya masih ada.

---

## 2026-10-29 (ke-8) — Panel "Film Terkait" yang "stuck" DIPERBAIKI. **BELUM DIRILIS**.

Owner: *"film terkait stuck tidak bisa di-scroll, jadi bisa muat film banyak."*

### 🪤 Penyebabnya BUKAN `overflow-y-auto` yang hilang — ia memang sudah ada

Dua sebab bertumpuk, dan keduanya harus dibereskan bersama:

**1. Grid menyetel tinggi baris mengikuti item TERTINGGI.** Selama panel adalah item grid biasa,
daftar yang panjang justru **MEMANJANGKAN barisnya** — tingginya tak pernah terlampaui, jadi
`overflow-y-auto` tak punya apa pun untuk digulung. Gejalanya menipu: mekanismenya terpasang
benar, tapi terasa macet. Perbaikannya **`lg:absolute lg:inset-0`** pada pembungkus panel: elemen
`absolute` dikeluarkan dari perhitungan tinggi baris, jadi tinggi bingkai ditentukan MURNI oleh
pemutar dan panel mengisi tinggi itu persis.

**2. Isinya cuma 6 judul** — tingginya nyaris sama dengan pemutar, jadi tak ada yang terlampaui
walaupun sebab (1) sudah dibereskan. Dinaikkan **6 → 20**.

Memperbaiki salah satu saja TIDAK cukup. Keduanya dijaga tes terpisah: "panel dikeluarkan dari
perhitungan tinggi baris grid" dan "daftarnya MEMANG lebih panjang daripada pemutar"
(`TERKAIT_SIDEBAR >= 15`).

⚠️ `absolute` hanya berawalan `lg:`. Di layar sempit panel turun ke BAWAH pemutar dan harus
mengalir normal — `absolute` di sana akan menumpuknya di atas pemutar.

### Bukti

build **sukses** · `tsc` **exit 0** · **1.748 tes hijau / 120 berkas** (+2) · dari HTML server,
kedua halaman: panel "Film Terkait" **20 judul** (±1.520px) vs pemutar 16:9 (±480px) — jelas
melampaui, jadi gulungannya benar-benar punya isi; `lg:absolute lg:inset-0` + `lg:overflow-y-auto`
keduanya terpasang; panel "Terpopuler" tetap 10 judul.

---

## 2026-10-29 (ke-7) — Pemutar + "Film Terkait" jadi SATU BINGKAI. **BELUM DIRILIS**.

Owner: *"aku mau film yang diputar jadi satu bingkai dengan film terkait"* + tangkapan layar situs
pembanding dengan **scrollbar** ditandai di sisi daftar.

### Bentuk barunya

```
┌─ BINGKAI GELAP ──────────────────────────────┐
│  [ PEMUTAR / HERO ]  │ FILM TERKAIT (gulung) │   <- tinggi SAMA
└──────────────────────┴───────────────────────┘
┌─ kartu putih ────────┐ ┌─ TERPOPULER ────────┐
│ judul · info · komen │ │ 10 judul            │
└──────────────────────┘ └─────────────────────┘
```

Kolom kanan dipecah: "Film Terkait" naik ke dalam bingkai pemutar, "Terpopuler" tinggal di bawah.
`SidebarFilm` diganti **`PanelFilm`** (tampilan, dipakai keduanya) + **`PanelPopuler`** (pengambil
data). Satu komponen tampilan untuk dua tempat — daftar film di repo ini sudah tiga kali menyimpang
saat disalin.

### Kunci teknisnya — DUA hal yang harus berpasangan

1. grid dua kolom dengan tinggi baris ditentukan **pemutar** (`aspect-video`), dan
2. panel kanan `lg:h-full` + daftarnya `lg:flex-1 lg:overflow-y-auto`.

Melepas salah satunya membuat bingkai ikut memanjang mengikuti daftar, dan pemutar terlihat
mengambang di kotak kebesaran. `overflow-y-auto` **hanya** berawalan `lg:` — di HP panel turun ke
bawah pemutar, dan mengunci tingginya di sana memasang area gulung DI DALAM halaman yang juga
digulung (dua gulungan bersarang = paling membingungkan di layar sentuh). Judul panel `shrink-0`
di luar area gulung supaya tetap terlihat saat daftar digulir.

### 🪤 JEBAKAN /drama: bingkainya TIDAK boleh `overflow-hidden`

Poster judul di halaman drama dipasang `absolute -bottom-16` — ia sengaja MENJOROK keluar kotak
gambar hero. Dengan `overflow-hidden` di bingkai, poster itu terpotong rapi dan **tidak ada error
apa pun** yang memberi tahu. Gantinya `pb-20` di kolom kiri, supaya poster mendarat di dalam
bingkai gelap. Hero juga diangkat jadi fungsi `HeroDrama` — dan pembungkus `relative`-nya WAJIB
ikut, sebab poster `absolute` di dalamnya akan melompat ke tempat yang salah tanpa itu.

### 🪤 Jebakan verifikasi yang terulang TIGA kali hari ini

Tes yang mencari KELAS CSS tersandung **komentar kode** yang menyebut kelas itu untuk menjelaskan
kenapa dipakai/dihindari — penjelasan yang benar terbaca sebagai pelanggaran. Sekarang ada satu
pembantu `tanpaKomentar()` di `tests/film-terkait.test.ts`. Ia sengaja memakai `split`, BUKAN
regex: pola regex komentar penuh backslash dan **tiga kali rusak** saat berkas disunting lewat
skrip di sesi ini.

### Bukti

build **sukses** · `tsc` **exit 0** · **1.746 tes hijau / 120 berkas** (+7) · dari HTML server,
kedua halaman: panel "Film Terkait" **6 judul DI DALAM** bingkai gelap dengan `lg:overflow-y-auto`;
panel "Terpopuler" **10 judul** sesudah bingkai; **NOL** judul dobel antar keduanya.

📌 Catatan verifikasi: menghitung "Terpopuler" dengan mencari teksnya salah — kata itu juga ada
sebagai chip di strip kuning kepala situs. Hitung lewat `id="panel-terpopuler"`.

---

## 2026-10-29 (ke-6) — Grid "Film Terkait" di bawah komentar DIBUANG. **BELUM DIRILIS**.

Owner: *"film terkait cukup SATU di sidebar kanan atas, yang bawah kamu hapus."*

Grid 5 poster di bawah kolom komentar dilepas dari `/drama/[id]` + `/tonton/[id]`, dan
`app/components/film/FilmTerkait.tsx` **DIHAPUS** — berkas yatim yang tak dipanggil siapa pun
terbaca seperti fitur yang masih hidup, dan itu jebakan untuk sesi berikutnya.

### ⚠️ KOREKSI terhadap catatan ke-5 di bawah — pagar anti-dobelnya sudah TIDAK BERLAKU

Catatan "(ke-5)" menjelaskan pembagian `TERKAIT_SIDEBAR + TERKAIT_GRID` (6+5) yang dipasang supaya
kolom kanan dan grid bawah tidak memajang judul yang sama. **Pembagian itu ikut dibuang**: dengan
film terkait hanya di SATU tempat, tak ada lagi yang bisa kembar. `TERKAIT_GRID` sudah tidak ada.

Yang MASIH berlaku dari catatan ke-5: seksi "Terpopuler" tetap membuang judul yang sudah tampil di
seksi "Film Terkait" di atasnya (`sudahTampil.has(d.id)`) — keduanya berada dalam SATU kolom, jadi
kembar di situ paling mencolok.

Penjaganya ikut berubah arah: tes yang dulu memeriksa "potongannya tidak beririsan" diganti tes
**"film terkait digambar di SATU tempat saja"** (`<FilmTerkait` tidak boleh muncul lagi) + tes yang
memastikan berkas komponennya benar-benar terhapus.

### Bukti

build **sukses** · `tsc` **exit 0** · **1.739 tes hijau / 120 berkas** · dari HTML server, kedua
halaman: teks "Film Terkait" muncul **tepat 1×**; kolom kanan tetap 6 + 8 judul; grid poster di
bawah komentar **sudah tidak ada**; kolom komentar & kaki situs tetap utuh.

---

## 2026-10-29 (ke-5) — Sidebar jadi DUA seksi: Film Terkait + Terpopuler. **BELUM DIRILIS**.

Owner: *"sidebar kanan jadi film terkait, terus bagian kanan bawah setelah garis kamu jadikan
terpopuler."* `SidebarPopuler` (satu seksi) diganti **`SidebarFilm`** (dua seksi bertumpuk,
masing-masing berjudul dengan garis merah pemisah).

### 🪤 Pagar ANTI-DOBEL — ini bagian yang mudah terlewat

Halaman film kini punya "Film Terkait" di DUA tempat: kolom kanan **dan** grid 5 poster di bawah
komentar. Kalau masing-masing memanggil `pilihTerkait()` sendiri, keduanya menghasilkan daftar
**SAMA PERSIS** — judul itu-itu juga dipajang dua kali di satu halaman, persis keluhan "dobel"
yang owner sampaikan 2026-09-21. Tidak ada error apa pun yang memberi tahu.

Pemecahannya: daftar dihitung **SEKALI** sebanyak `TERKAIT_SIDEBAR + TERKAIT_GRID` (6+5), lalu
dipotong — bagian paling mirip ke kolom kanan, sisanya ke grid. Dijaga tes yang menghitung
`pilihTerkait(` **harus muncul tepat 1×** per halaman.

Lapis kedua: seksi "Terpopuler" membuang judul yang sudah tampil di seksi "Film Terkait" di
ATASNYA (`sudahTampil.has(d.id)`) — satu judul muncul dua kali dalam SATU kolom jauh lebih
mencolok daripada dobel antar-seksi yang berjauhan.

### Bukti

build **sukses** · `tsc` **exit 0** · **1.739 tes hijau / 120 berkas** · dari HTML server, kedua
halaman: kolom kanan = "Film Terkait" **6 judul** + "Terpopuler" **8 judul**; grid bawah **5
petak**; **NOL** judul yang dobel antara sidebar↔grid maupun terkait↔populer.

🪤 Jebakan verifikasi (kecil, tapi berulang): pemeriksaan pertama melaporkan *"grid bawah 0 petak"*
karena mencarinya SESUDAH `</aside>` — padahal di markup grid berada di kolom KIRI, jadi ia muncul
**sebelum** `<aside>`. Angka "0" itu salah-cari, bukan grid yang hilang. **Urutan markup ≠ urutan
visual** di tata letak dua kolom.

---

## 2026-10-29 (ke-4) — Blok keterangan diganti KAKI SITUS gelap 4 kolom. **BELUM DIRILIS**.

Owner: *"bagian ini bawah kamu buat seperti image 2 biar tidak menyatu dengan yang di atas."*
Blok `TentangSitus` berlatar sama dengan badan halaman, jadi ia terbaca menyambung begitu saja.

### Yang dilakukan: MEMAKAI ULANG footer yang sudah ada, bukan membuat yang kedua

`FooterSitus` sudah hidup sejak 2026-10-10 di landing `/`, dan bentuknya **sudah persis** yang
owner tunjuk: empat kolom (Tentang · Jelajahi · Genre Populer · Disclaimer), latar `bg-zinc-950`,
judul bergaris bawah kuning. Jadi yang dibuat cuma pembungkus tipis `KakiFilm` (sepola
`KepalaFilm`) yang menyediakan daftar genre.

**Kenapa ini penting:** membuat footer kedua = dua tempat yang harus selalu sepakat dan pasti
menyimpang. Repo ini sudah TIGA KALI kena masalah itu pada KEPALA situs (logo, lalu tulisan kotak
cari dua kali — riwayatnya di `KepalaKatalog.tsx`). Jangan diulang di kaki.

`TentangSitus.tsx` **DIHAPUS**, bukan ditinggal — dua blok keterangan di satu halaman persis
keluhan "dobel" yang owner sampaikan 2026-09-21.

### Kolom pertama kini per-halaman

Mencontoh kaki situs pembanding: kolom 1 memuat keterangan **judul yang sedang dibuka**
(`Nonton <judul>` + sinopsisnya), bukan paragraf situs yang sama diulang di tiap halaman — yang
juga merugikan di mata mesin pencari. Lewat prop `tentang` yang **opsional**: tanpa prop itu
`FooterSitus` berperilaku persis seperti semula, jadi landing `/` tidak tersenggol (dijaga tes).

### 🪤 Jebakan tata letak yang hampir lolos

Footer WAJIB di LUAR grid dua kolom DAN di luar kartu putih. Di dalam salah satunya, ia ikut
menyempit mengikuti kolom isi dan kehilangan latar gelap yang membentang penuh — persis keluhan
yang membuatnya diubah. Dijaga tes yang memeriksa URUTAN (`<KakiFilm` harus muncul sesudah
`<SidebarPopuler`).

Ikut ketahuan: `pb-16` di `<main>` halaman `/tonton` menyisakan **pita abu-abu di BAWAH footer
gelap** — halaman terlihat seperti belum selesai dimuat. Dilepas; jarak isi ke footer sudah
ditangani `pb-10`/`pb-8` di kartu putihnya.

### Bukti

build **sukses** · `tsc` **exit 0** · **1.733 tes hijau / 120 berkas** · dari HTML server:
`/drama` + `/tonton` + `/` ketiganya punya `<footer>` `bg-zinc-950` dengan **4 kolom**; kolom-1
di halaman film berisi *"Nonton Sympathy for the Devil (2023)"* / *"Nonton Meg 2 The Trench"*,
sedangkan `/` tetap keterangan situs umum. Nol rujukan `TentangSitus` tersisa di kode.

---

## 2026-10-29 (ke-3) — Komentar lengkap (nama/email/website) + blok keterangan situs + sidebar 12 judul. **BELUM DIRILIS**.

Owner: *"komentarnya tambahin yang lengkap nama, email, website kasih optional juga, lalu di
bawahnya kasih seperti no 2, terus sidebar kanan film/dramanya kamu list sampai bawah."*

### 🔒 DUA titik risiko di permintaan yang kelihatannya sepele

**1. EMAIL = data pribadi.** Field `email` di `Comment` SUDAH berubah arti jadi KUNCI identitas
(`tamu:<hex>`), jadi email ketikan penonton TIDAK boleh menumpang ke sana — kalau dua orang
mengetik email yang sama, mereka saling bisa menghapus komentar satu sama lain. Dibuat field
**terpisah** `emailKontak`, dan `untukPublik()` membuang KEDUANYA sebelum balasan dikirim. Form-nya
menulis janji *"Email kamu tidak akan ditampilkan"* — janji itu hanya benar selama pagar tadi ada,
jadi dijaga tes khusus.

**2. WEBSITE = pintu XSS tersimpan + spam backlink.** Alamat diketik orang luar lalu DIGAMBAR
SEBAGAI TAUTAN. `javascript:alert(1)` yang lolos bukan bug biasa — ia tersimpan permanen di
database dan menyerang SETIAP pembaca komentar itu. Pagarnya:
- `bersihkanWebsiteTamu` (lib/tamu.ts) mengurai dengan **`new URL()`**, bukan regex — penyaring
  teks berulang kali kalah oleh `JaVaScRiPt:`, spasi di tengah skema, dsb. Hanya `http:`/`https:`
  yang lolos. Diuji 6 varian jahat.
- Digambar dengan **`rel="nofollow ugc noopener noreferrer"`** — tiap bagian menutup lubang
  berbeda; dijaga satu per satu di tes.

⚠️ **Kolom salah ketik TIDAK menolak komentarnya.** Ketiganya opsional, jadi email/website yang
bentuknya salah cukup tidak disimpan — membuang isi komentar yang sudah susah payah ditulis gara-gara
kolom pelengkap adalah pertukaran yang salah.

### Blok "Tentang DramaKu" — klaimnya SENGAJA tidak meniru contoh

Tangkapan layar owner memuat *"Streaming Lancar Tanpa Buffering"*, *"minimal resolusi 1080p"*, dan
*"semua film sudah disertai subtitle Indonesia"*. Ketiganya **tidak ditiru**: dua pertama tak bisa
dijanjikan, dan yang ketiga **BOHONG di situs ini** — diukur 2026-10-29, **24 dari 40** judul punya
subtitle. Teks kita menulis *"sebagian besar judul dilengkapi subtitle"*. Dijaga tes
"TIDAK meniru klaim yang tak bisa dibuktikan" supaya tidak masuk lagi lewat penyuntingan nanti.

📌 Kalau katalog berubah besar, **periksa ulang kalimatnya** — teks pemasaran yang basi berubah jadi
klaim palsu tanpa satu pun error yang memberi tahu.

### Sidebar 5 -> 12

"Sampai bawah" tidak bisa dibuat persis: panjang kolom kanan bergantung panjang isi di kiri, yang
beda tiap judul. 12 dipilih supaya terisi wajar tanpa jadi daftar tak berujung di HP (di sana
sidebar turun ke BAWAH isi, jadi tiap baris = gulungan tambahan).

### Bukti

build **sukses** · `tsc` **exit 0** · **1.731 tes hijau / 120 berkas** (+19 di
`tests/komentar-lengkap.test.ts`) · dari HTML server: kedua halaman film memuat ketiga kolom
opsional, centang simpan, janji privasi, blok keterangan situs, dan sidebar **12 judul**.

🪤 Jebakan kecil yang sempat kena: tes "jangan meniru klaim" awalnya memeriksa berkas MENTAH,
sehingga **komentar kode yang menjelaskan kenapa klaim itu dihindari** ikut terbaca sebagai
pelanggaran — tes merah yang menghukum dokumentasi yang benar. Diperbaiki dengan membuang komentar
sebelum memeriksa.

---

## 2026-10-29 (ke-2) — PUTARAN KEDUA: search jadi TOMBOL pop up + halaman film jadi TERANG + sidebar. **BELUM DIRILIS**.

Owner melihat preview lalu mengoreksi dua hal, disertai SS situs pembanding (REBAHIN):
*"tombol search masih terlalu besar"* dan *"ketika klik film ternyata gelap tidak bagus, ubah
seperti SS"*. Dari popup owner memilih: search **jadi tombol pop up**, halaman film **"warna +
sidebar kanan"**.

### 🪤 Kotak cari: ini keputusan KETIGA atas lebar yang sama — berhenti mengukur, ganti bentuk

448px dilepas owner 2026-09-21 ("terlalu sempit") → 576px ditolak 2026-10-29 ("masih kebesaran").
Pelajarannya: **selama kotaknya duduk di bar, lebar berapa pun salah bagi sebagian layar.**
Sekarang diganti TOMBOL ikon + lapisan pop up (`modeTombol` di `SearchBar.tsx`) — tidak memakan
ruang sama sekali, jadi pertanyaannya hilang, bukan dijawab lagi. ⚠️ SENGAJA **mati di
`/discover`**: itu halaman HASIL pencarian, kotaknya wajib terlihat terus. Batas jujur: lapisannya
dibuka JavaScript, jadi sebelum JS aktif tombol itu diam.

### Halaman film TERANG

`/drama/[id]` + `/tonton/[id]`: `bg-zinc-100` (menimpa `bg-black` dari layout), isi utama kartu
putih, dua kolom + `SidebarPopuler` ("Paling Banyak Ditonton", urut `sortCatalog(…,"populer")` —
fungsi yang sudah ada, bukan logika baru). Tema dioper lewat prop `terang` ke 6 komponen,
**semuanya default `false`** — WAJIB, sebab `Comments` & `RatingStars` juga dipakai `FeedPlayer`
dan `CommentsDrawer`, dua layar pemutar yang harus tetap gelap. `/` dan `/beranda` **tetap gelap**
(owner tak memintanya berubah; diverifikasi masih `bg-black`).

### 🔴 JEBAKAN BUILD yang hampir membuat laporan SALAH — WAJIB dibaca sesi berikutnya

Sesudah build + `next start`, `/drama` tampil versi BARU tapi `/tonton` dan `/` masih versi LAMA.
Sumber benar, tes hijau, `tsc` exit 0 — tapi yang dilayani ke browser kode lama.

**Sebabnya: `rm -rf .next` GAGAL DIAM-DIAM selama server lama masih hidup.** Di Windows berkas yang
dipegang proses lain tak bisa dihapus, dan `rm -rf` TIDAK mengeluh. Build berikutnya menulis
sebagian, sehingga halaman yang **di-prerender saat build** (`○ Static` / `● SSG` — `/` dan
`/tonton/[id]`) tetap memakai berkas lama. `/drama/[id]` lolos justru karena dibangun **on-demand**
(`generateStaticParams` memulangkan daftar kosong).

**Aturan baru:** matikan server lewat PID → buktikan port kosong → `rm -rf .next` → **buktikan
foldernya benar-benar hilang** (`if [ -d .next ]`) → baru build. Jangan percaya `rm -rf` berhasil
hanya karena tak ada error. Pola yang sama dengan dua jebakan lama di berkas ini: *"TaskStop tidak
mematikan server npx"* dan *"`Stop-Process` gagal, `-ErrorAction SilentlyContinue`
menyembunyikannya"* — **perintah pembersih yang gagal tanpa suara.**

### Putaran ketiga (koreksi kecil owner, hari yang sama)

Owner: *"sudah bagus tapi kecil kali, bisa besar sedikit, dan backgroundnya jangan blur kali
soalnya bikin sakit mata."* Lapisan cari diperbesar (panel 576 -> **672px**, kotak `h-9` -> `h-12`,
teks `text-sm` -> `text-base`) dan latarnya **`backdrop-blur-sm` DIBUANG** + gelapnya 80% -> 55%.

⚠️ Ukuran kotak jadi **parameter** `formCari(kelas, besar)`, bukan diubah langsung: kotak yang sama
dipakai bar `/discover` yang masih mode biasa — menaikkan tingginya di sana akan meninggikan
SELURUH kepala situs halaman itu. Dijaga tes "kotak di lapisan LEBIH BESAR daripada kotak di bar".

🪤 **Jebakan verifikasi yang terulang:** memeriksa kelas CSS hasil build lewat `node -e` sempat
melaporkan *"bg-black/55 TIDAK ADA — latar bisa transparan!"*, padahal `bg-black/95` milik TopNav
yang jelas bekerja di produksi juga ikut "tidak ada". Penyebabnya **backslash termakan lapisan
shell** sehingga pola escape-nya salah — bukan CSS-nya. Pola yang sama sudah muncul dua kali di
sesi ini (sekali saat menulis regex ke `lib/tamu.ts`). **Kalau sebuah pemeriksaan melaporkan
sesuatu yang sudah terbukti jalan di produksi ikut rusak, curigai ALATNYA dulu, bukan kodenya.**

### Bukti putaran kedua

build **sukses** (sesudah `.next` DIBUKTIKAN terhapus) · `tsc` **exit 0** · **1.697 tes hijau /
118 berkas** (+13 baru di `tests/cari-popup-dan-film-terang.test.ts`) · dari HTML server: keempat
halaman memuat **tombol cari**, **nol** kotak cari di bar · `/drama`+`/tonton` `bg-zinc-100` dengan
`<aside>` sidebar · `/`+`/beranda` **tetap** `bg-black` tanpa sidebar.

---

## 2026-10-29 — Tiga arahan Kang Dedi: kotak cari, login penonton, kepala halaman film. SELESAI, **BELUM DIRILIS**.

Owner meneruskan SS arahan Kang Dedi: (1) *"searchnya kelebaran"* · (2) *"hapus fitur login/daftar,
orang lain tinggal nonton gratis"* · (3) *"halaman FILM header + sidebar-nya berbeda dengan Home —
Home pink+kuning+putih, halaman nonton DARK"*. Owner: butir 2 **khusus viewer**, dan *"cuma login
dan daftar aja yang dihapus, sisanya biarkan saja jadi viewer masih bisa kasih rating komen."*

### 🔴 Jawaban owner butir 2 TIDAK BISA jalan apa adanya — dan itu yang paling penting di sini

*"Sisanya biarkan saja"* terdengar seperti nol pekerjaan tambahan. Kenyataannya POST komentar
(`app/api/comments/route.ts`) dan POST rating (`app/api/ratings/route.ts`) **menolak 401 tanpa sesi
login**. Hapus login lalu biarkan sisanya = **komentar & bintang mati total untuk semua orang**,
dan matinya SENYAP — 401 itu jawaban yang sah, tak ada error di sisi kita; yang tahu cuma penonton
yang mencoba. Karena maksud owner jelas, keduanya dibuat **bisa dipakai tanpa akun** lewat identitas
tamu (`lib/tamu.ts` — cookie HttpOnly bertanda tangan HMAC, nomor acak, bukan identitas orang).

### ⚠️ BATAS JUJUR yang owner perlu tahu

Rating kini berarti **"satu BROWSER satu suara"**, bukan satu ORANG satu suara: hapus cookie /
jendela samaran = bisa menilai lagi. Lebih longgar daripada sebelumnya. Karena itu rating penonton
**tetap DILARANG** jadi structured data Google — `lib/structured-data.ts` memakai rating IMDb asli,
jangan ditukar. Menutupnya kembali = nyalakan `AKUN_PENONTON_ENABLED`; jalur sesi lama masih utuh
dan DIDAHULUKAN oleh `identitasInteraksi()`.

### 🔒 Temuan sampingan yang ikut ditutup: email penonton bocor ke semua pengunjung

`GET /api/comments` memulangkan baris komentar apa adanya — **alamat email tiap penulis ikut
terkirim ke browser semua orang**, terbaca dari panel jaringan tanpa alat khusus. Ditutup lewat
`untukPublik()`; penggantinya penanda `milikku` yang diputuskan server (browser memang TIDAK bisa
tahu sendiri — cookie tamunya `httpOnly`). Bukan bagian permintaan Kang Dedi; ditemukan saat membaca
route yang memang harus diubah.

### Yang TIDAK ikut longgar (sengaja)

`resolveUserEmail` di `lib/session.ts` **tidak disentuh sama sekali** — koin, paywall, kode
pemulihan, daftar admin tetap menuntut sesi bertanda tangan sungguhan. Identitas tamu dipakai
**hanya** komentar & rating. Anti-CSRF + rate-limit tetap. Tamu tak bisa dapat lencana admin, tak
bisa hapus komentar orang lain (403). `/login` TETAP HIDUP — itu pintu admin satu-satunya.

### Kepala halaman film (butir 3)

`/drama/[id]`, `/film`, `/katalog`, `/tonton/[id]` kini memakai **komponen kepala yang SAMA** dengan
`/beranda` (`KepalaFilm` → `KepalaBeranda`), bukan salinan — supaya tak bisa menyimpang lagi.
`/admin` sengaja TETAP navbar hitam (halaman kerja), layar pemutar `/watch` & `/feed` tidak disentuh
(kepala situs akan menutupi video).

### 🪤 Kotak cari: ini putaran KEDUA, jangan diputar ketiga kalinya tanpa sadar

2026-09-21 owner MELEPAS batas 448px ("berhenti di tengah"); 2026-10-29 Kang Dedi "kelebaran".
Sekarang 576px (`md:max-w-xl`) — di tengah-tengah dua keluhan yang sudah sama-sama ditolak.
Riwayatnya ditulis di komentar `SearchBar.tsx`.

### Bukti

build **sukses** · `tsc` **exit 0** · **1.684 tes hijau** (+42 baru, 117 berkas) · kepala
`/drama`+`/film`+`/katalog` **IDENTIK byte-per-byte** dengan `/beranda` (id Radix dinormalkan) ·
navbar hitam **nol** di keempat halaman · tautan `/login`·`/daftar` di halaman penonton **nol** ·
end-to-end: komentar tanpa akun **200**, bintang **200**, 3× nilai tetap `count:1`, tamu lain hapus
komentar orang **403**.

⚠️ Uji tulis **sengaja TIDAK** dijalankan lewat `.env.local` — env itu menunjuk **Supabase
PRODUKSI** dengan `service_role`, jadi komentar uji akan mengotori data penonton sungguhan. Dipakai
server kedua `ALLOW_FILE_MODE=1`; `data/` dipulihkan sesudahnya (`git status -- data/` bersih).

### Rincian + cara membalikkan

`docs/lintasai/rencana/2026-10-29-arahan-kang-dedi-search-login-kepala-film.md` — termasuk
pemeriksaan terhadap rak `skills/auth/SKILL.md` dan satu batas jujur session-fixation.

---

## 2026-10-28 (ke-3) — /beranda DISAMAKAN dengan landing page + kaki situs dibuang. DIRILIS `bd12977`, downtime nol.

Owner: *"aku mau tampilan beranda sama dengan tampilan di landing page, begitu selesai kamu
tunjukan hasilnya dulu biar ku cek."* Dari popup, owner memilih: baris **"Lanjut Menonton" TETAP**
di atas; dua baris personal lain ("Karena kamu menonton", "Trending di <genre>") ikut hilang.

### Kenapa kedua halaman ini bisa beda tanpa ada yang sadar

`/` adalah halaman untuk yang **belum login**; begitu login, `RedirectIfAuthed` melempar penonton
ke `/beranda`. Jadi owner tak pernah melihat `/` kecuali logout — dan kedua halaman merakit
susunannya **sendiri-sendiri**, lalu menyimpang pelan-pelan.

**Sekarang keduanya memakai komponen yang SAMA** (`app/components/beranda/BadanKatalog.tsx`),
bukan susunan yang disalin — supaya tak bisa menyimpang lagi. Yang boleh berbeda cuma dioper
lewat prop: isi slot atas, dan `basePath` tab.

### Bukti (gerbang §6 + situs dijalankan lokal)

build **sukses** · `tsc` **exit 0** · **1.642 tes hijau** (+3 baru) · judul seksi `/` dan
`/beranda` **identik** · tab `/beranda` menunjuk `/beranda?tab=…`, **0** yang menunjuk `/` ·
baris kategori lama **0** · kepala situs (logo · kotak cari · menu · strip genre) **ada di
keduanya**.

### 🔴 REGRESI yang nyaris lolos — ditangkap GAMBAR, bukan angka

Melepas `CatalogBrowser` ikut menghapus **seluruh kepala situs `/beranda`** (logo, kotak cari,
menu, strip genre) — karena bar itu lahir **di dalam** komponen grid, tak punya rumah sendiri.
**Nol tanda bahaya:** halaman tetap 200, build sukses, tsc 0, 1.639 tes hijau, judul seksi semua
cocok. Ketahuan hanya karena tangkapan layarnya benar-benar dilihat.

**Aturan:** untuk perubahan TAMPILAN, status 200 + tes hijau BUKAN bukti. Yang membuktikan adalah
halaman yang digambar. Sudah diperbaiki (`KepalaBeranda.tsx`) + dipasangi penjaga di
`tests/kepala-situs.test.ts` — berkas yang sudah menyatakan aturannya tapi tak pernah memeriksa
pemasangannya.

### Putaran kedua (umpan balik owner, hari yang sama)

- **Kaki situs DIBUANG dari `/beranda`** (owner: "bagian bawah kamu hapus") lewat prop
  `denganKaki={false}`. **Masih ada di landing `/`** — tidak diminta dilepas dari sana.
- **"Kenapa ada Masuk, harusnya Keluar" — PREMIS KELIRU, bukan bug.** Owner melihatnya di
  PRATINJAU LOKAL, dan di `localhost` ia memang belum login (sesi disimpan browser
  per-alamat-situs, jadi login produksi tidak terbawa). Dibuktikan dengan membuka menunya di
  browser sungguhan: **belum login** → `Beranda · Masuk · Daftar`; **sudah login** →
  `Beranda · "Masuk sebagai Mas radenbagus89" · Keluar`. Logikanya sudah benar sejak lama di
  `app/components/beranda/KepalaKatalog.tsx` dan tidak disentuh perubahan ini.
  💡 Hal yang sama berlaku untuk **"Lanjut Menonton"**: tak akan muncul di localhost.

### 🔴 INSIDEN 2026-10-28 — perintah browser otomatis masuk ke BROWSER PENYEWA LAIN

Sesi ini menjalankan Chrome dengan `--remote-debugging-port=9222`. **Port itu sudah dipakai
Chrome milik penyewa lain** (mulai 10:45:55, ±45 menit lebih awal), jadi Chrome kita gagal
mengikatnya dan seluruh perintah mendarat di browser orang lain: 4 tab dibuka, diarahkan ke
`localhost:3999`, diklik, dipotret. **Sudah dibereskan persis sebatas yang dibuat** — 4 tab itu
ditutup, `localStorage` yang ditulis dihapus, 1 tab miliknya tidak disentuh, isi tab lain tidak
dibaca.

**Aturan baru (mesin ini dipakai ±84 penyewa — `127.0.0.1` BUKAN milik kita sendiri):**
1. **Jangan pakai port debug tetap.** Pakai port acak, lalu **buktikan** yang menjawab adalah
   proses kita (cocokkan PID pemilik port dengan PID yang baru dijalankan) SEBELUM mengirim
   perintah apa pun.
2. **Server pratinjau wajib `next start -H 127.0.0.1`** — bawaan Next mengikat `0.0.0.0`,
   artinya penyewa lain bisa membukanya. Sudah diperbaiki di sesi ini.

🔒 **Tambahan untuk laporan ke penyedia jasa (butir 1 di "Yang tersisa"):** ada penyewa yang
menjalankan Chrome dengan DevTools terbuka di `127.0.0.1:9222`. Di mesin bersama, **penyewa mana
pun bisa mengendalikan browser itu** — tab, cookie, sesi login. Kelemahan milik penyewa tersebut,
tapi memperkuat kesimpulan bahwa mesin ini tidak layak untuk pekerjaan yang menyentuh kredensial.

### Yang ikut berubah & perlu owner setujui

- Baris kategori `/beranda` (**Drama Terbaru/Action/Romance/Tycoon**, **Paling Banyak Ditonton**)
  dan penomoran halamannya **hilang** — wajib, kalau tidak daftar yang sama muncul dua kali
  (keluhan lama "ada 2 rekomendasi"). Genre tetap dicapai dari strip kuning, menu atas, FILTER.
- Dua baris personal (**"Karena kamu menonton"**, **"Trending di <genre>"**) dan **Favorit Saya**
  hilang; **Lanjut Menonton** tetap.
- ~~`/beranda` kini punya kaki situs~~ → **DIBATALKAN atas permintaan owner**, lihat putaran kedua di atas.
- Kotak cari di `/beranda` kini **melempar ke `/discover`**, tidak lagi menyaring di tempat —
  grid yang dulu disaringnya sudah tidak ada.
- `CatalogBrowser` jadi **tak terpakai**, tapi **sengaja belum dihapus** sampai owner setuju.

### ✅ DIRILIS `bd12977` — bukti diukur dari LUAR, sebelum vs sesudah

Dual push tuntas `0bdac92..bd12977` (`origin` **dan** `dramaku`, selisih 0/0). Tayang pada cek
ke-9 (~1,5 menit); **downtime NOL** — nol cek `/api/health` yang gagal selama build.

| Diukur di produksi | SEBELUM | SESUDAH |
|---|---|---|
| Judul seksi `/beranda` | Film Terbaru · **Drama Terbaru · Paling Banyak Ditonton · Drama Action · Drama Romance · Drama Tycoon** | **identik dengan `/`**: Film Terbaru · Series Terbaru · Series Unggulan · Series Update · Terpopuler · Rekomendasi · 2025 |
| Tujuan klik tab `/beranda` | `/katalog?tab=…` (menu) | **`/beranda?tab=…`** — 0 yang menunjuk `/` |
| Kaki situs di `/beranda` | 0 | **0** (dibuang sesuai permintaan owner) |
| Kaki situs di `/` | ada | **tetap ada** |
| Kepala `/beranda` (kotak cari · logo · menu · strip genre) | ada | **ada** — regresi yang sempat terjadi tidak ikut tayang |
| Baris kategori lama di `/beranda` | ada | **0** |
| Chunk `/beranda` vs build lokal `bd12977` | — | **15/15 cocok**; chunk badan katalog **identik byte-per-byte** (md5 sama, 26024 byte) |
| 12 halaman penonton + `/admin` | — | semua **200** |
| `/api/dramas` | 33477 byte | **33477 byte — identik** |
| `/api/health` | `sumberData:"database"` | **sama** |

**Nol regresi pada dua rilis sebelumnya** (diperiksa khusus): `/api/coins` & `/api/ads` tetap
**404**, webhook Midtrans tetap **403** (hidup), jejak kata koin/iklan di HTML `/beranda` **0**,
ep4 premium tanpa login **200**, alamat `.mp4` di HTML `/feed` **0**, alamat video tetap
bertanda tangan (`expires` · `issued` · `signature`).

📌 **Dua angka yang sempat terlihat seperti sisa, ternyata BENAR:**
- 5 tautan `/katalog?tab=…` di `/beranda` = tombol **"SEMUA"** di ujung tiap baris seksi
  (landing page punya 8 yang sama). Bukan deret tab.
- 1 teks **"Paling Banyak Ditonton"** = item di dalam dropdown **Populer** pada bar atas —
  ada di **kedua** halaman (1 : 1). Bukan sisa baris kategori.
  **Keduanya diperiksa dengan membandingkan ke landing page, bukan diasumsikan.**

### Tangkapan layar arsip

**`D:\Users\user18\pratinjau-beranda`** (di luar repo): `1-SEBELUM-beranda-produksi.png` ·
`2-SESUDAH-beranda-baru.png` · `3-ACUAN-landing-page.png` · `5-MENU-saat-BELUM-login.png` ·
`6-MENU-saat-SUDAH-login.png`.

### Utang yang masih terbuka

`CatalogBrowser` kini **tak dipakai halaman mana pun** (anak-anaknya masih dipakai `/discover`,
`/film`, `/katalog`, jadi aman). Sengaja belum dihapus. Hapus hanya kalau owner sudah yakin
tak mau kembali ke bentuk lama — sesudah itu `NomorHalaman` di dalamnya ikut perlu dicek.

---

## 2026-10-28 (ke-2) — KOIN & IKLAN DIJEDA lewat saklar. DIRILIS `c5bdb54`, downtime nol. Nol berkas dihapus.

Permintaan owner: *"koin kita pending saja, semua fitur yang berhubungan dengan koin & iklan
kamu hapus dan kamu simpan filenya jadi sewaktu waktu mau di pakai lagi bisa kita aktifkan
kembali."* Dari 2 pilihan yang disajikan, owner memilih **saklar mati** (berkas tetap di
tempatnya) dan **semua iklan ikut dimatikan** — termasuk banner sponsor yang penghasilannya
terpisah dari koin.

### ⭐ CARA MENYALAKANNYA KEMBALI — satu berkas

`lib/saklar-fitur.ts` berisi **2 konstanta**: `PAYWALL_ENABLED` dan `ADS_ENABLED`. Ubah `false`
→ `true` (boleh salah satu saja), perbarui tripwire di `tests/jeda-koin-iklan.test.ts` (tes
pertama — ia SENGAJA merah saat saklar menyala), jalankan gerbang §6, push.
**Nol migration SQL, nol env baru, nol berkas yang harus dikembalikan.**
Rencana + daftar periksa lengkap: `docs/lintasai/rencana/2026-10-28-jeda-koin-dan-iklan.md`.

### Yang dimatikan (15 titik)

**Koin:** chip saldo di header & bar cari · toko koin di `/profile` · layar "episode terkunci" ·
menu "Premium / Koin" di profil · chip 🪙 PREMIUM di halaman detail drama · chip filter
"Pakai Koin" di halaman depan · 7 route `/api/coins/*` · panggilan dompet di pemutar.
**Iklan:** banner sponsor di `/drama/[id]` & `/profile` · modal "tonton iklan dapat koin" ·
`/api/ads` + `/api/ads/event` · panel pengatur iklan di `/admin` + menunya di sidebar ·
`/api/admin/ads`.

### Bukti — situs DIJALANKAN, bukan cuma dibaca

Gerbang §6: `rm -rf .next` → build **sukses** → `tsc` **exit 0** → **1.636 tes hijau** (116
berkas; 1.630 → −2 tripwire yang dipindah → +8 tes baru).

| Diukur pada `next start` lokal | Hasil |
|---|---|
| 10 route koin & iklan | semua **404** + pesan sebab (`"Fitur koin sedang tidak aktif."`) |
| `/api/coins/webhook` (Midtrans) | **403** — HIDUP, sengaja tidak digerbang |
| 18 halaman penonton + `/admin` | **NOL** jejak kata koin/iklan/PREMIUM/saldo/top-up/AdSense di ke-18. Status: 15 × **200** · `/tonton/<drama>` **404** (itu rute FILM, bukan drama) · 2 × `/watch/...` **307** (pengalihan ke `/feed`, perilaku lama) |
| `/api/video-url` ep 1·3·4·20·99 tanpa login | **200** — paywall benar-benar terbuka |
| Alamat `.mp4` di HTML `/feed` | tetap **0** (pagar Tahap A utuh) |
| Katalog lokal | **33477 byte** — sama seperti produksi |
| Uji balik: saklar dinyalakan sementara | **7 dari 8** tes jeda langsung MERAH |

Uji balik itu sekaligus bukti **menyalakan kembali benar-benar bekerja**: route melayani lagi,
komponen menggambar lagi, tanpa satu pun berkas dipindahkan.

### 🔴 AKIBAT yang owner perlu tahu

- **Episode 4 ke atas dari 13 drama premium kini GRATIS untuk semua orang.** Konsekuensi
  langsung: tanpa koin tak ada cara membuka episode, jadi paywall ikut dilepas — kalau tidak,
  penonton menabrak dinding mati. **Pemasukan koin & iklan berhenti** selama dijeda.
- **Database NOL disentuh.** Saldo, episode yang sudah dibeli, riwayat transaksi, daftar iklan —
  semua utuh. Itulah yang membuat penyalaan kembali utuh juga.
- **Pagar keamanan video tidak ikut lepas.** `lib/video-signature.ts` dan
  `app/api/video-url/route.ts` **tidak tersentuh**; yang berubah hanya SIAPA yang berhak.
- 💡 **Kalau ingin memastikan nol uang masuk:** hapus `MIDTRANS_SERVER_KEY` di panel Railway.
  Top-up sudah ditutup di route, jadi tak ada pembayaran BARU yang bisa dimulai — ini hanya
  lapis kedua. Webhook sengaja dibiarkan hidup supaya pembayaran yang sudah berjalan (kalau ada)
  tidak hilang.

### 🪤 Pelajaran: peta dari `grep` MELEWATKAN satu tombol yang terlihat

Pemetaan awal menyimpulkan filter `?akses=koin` "tidak punya tombol di layar" — **salah**. Chip
**"Pakai Koin"** ada di menu "+ More" halaman depan (`lib/nav-katalog.ts:213`); berkasnya muncul
di hasil grep awal tapi diklasifikasikan **tanpa dibuka**. Yang menangkapnya: memindai HTML yang
benar-benar dikirim situs yang berjalan — `/` membalas 2 jejak sementara 17 halaman lain nol.

**Aturan:** untuk fitur yang "dimatikan", daftar dari `grep` adalah titik-mulai, **bukan bukti**.
Pemanggil yang terlewat tidak menimbulkan error apa pun — halamannya tetap 200, build tetap
hijau, dan yang bocor baru terlihat kalau ada orang membukanya.

💡 Dua tripwire lama yang berbunyi *"paywall sedang menyala"* (`tests/coins.test.ts`,
`tests/download-button.test.ts`) bekerja persis seperti maksudnya: langsung merah begitu saklar
dimatikan. Keduanya **dibalik, bukan dihapus** → pindah ke `tests/jeda-koin-iklan.test.ts`.

### ✅ DIRILIS `c5bdb54` — bukti diukur dari LUAR, sebelum vs sesudah

Dual push tuntas `97fd5f1..c5bdb54` (`origin` **dan** `dramaku`, selisih 0/0). Kode baru tayang
pada cek ke-7 (~1 menit); **downtime NOL** — `/api/health` menjawab 200 pada SELURUH cek selama
build (25 cek beruntun + 7 cek pemantau, nol kegagalan).

| Diukur di produksi | SEBELUM rilis | SESUDAH rilis |
|---|---|---|
| `/api/coins` · `/api/coins/history` | **200** | **404** + `"Fitur koin sedang tidak aktif."` |
| `/api/ads` | **200** | **404** + `"Fitur iklan sedang tidak aktif."` |
| 7 route POST koin & iklan + `/api/admin/ads` | melayani | **404** semua |
| `/api/coins/webhook` (Midtrans) | 403 | **403** — HIDUP, sengaja tidak digerbang |
| Jejak kata koin/iklan di HTML `/` | **2** (chip "Pakai Koin") | **0** |
| 15 halaman penonton + `/admin` | — | **200** semua, **NOL** jejak kata koin/iklan/PREMIUM/saldo/top-up/AdSense |
| `/api/video-url` ep4 tanpa login | **401** | **200** — paywall terbuka sesuai keputusan |
| `/api/video-url` ep1·3·20·99 | — | **200** |
| `/api/dramas` | 33477 byte | **33477 byte — identik** |
| `/api/health` | `sumberData:"database"` | **sama** |
| Alamat `.mp4` di HTML `/feed` | 0 | **0** — pagar Tahap A utuh |
| Alamat video dari server | bertanda tangan | **tetap** (`expires` · `issued` · `signature`) |
| Alamat bertanda tangan ke tunnel | 206 | **206 `video/mp4`** |
| Alamat POLOS ke tunnel (Tahap B) | 403 | **403** |
| Chunk halaman depan vs build lokal `c5bdb54` | — | **15/15 cocok**; chunk menu katalog **identik byte-per-byte** (md5 sama, 38273 byte) |

📌 **Satu hal yang TIDAK ikut hilang, dan itu memang disengaja:** teks seperti `"Pakai Koin"`
masih ADA di dalam berkas JS yang terkirim ke browser (terukur: 1×). Itu konsekuensi cara saklar
yang dipilih owner — saklar menghentikan fitur **dijalankan**, bukan menghapusnya dari bundle.
Yang menentukan bagi penonton: ia **tidak pernah digambar** (HTML `/` turun 2 jejak → 0). Kalau
suatu saat owner ingin teksnya benar-benar keluar dari bundle, itu pilihan "pindahkan berkas ke
arsip" yang ditolak hari ini karena jauh lebih besar & lebih berisiko.

💡 **Saksi independen "kode baru tayang" di rilis ini BUKAN hitungan kata di bundle** (angkanya
justru tetap 1, karena kodenya memang masih ada) — melainkan **perubahan perilaku sebelum/sesudah**
yang terukur: `/api/coins` 200 → 404 dan HTML `/` 2 jejak → 0. Untuk rilis yang mematikan fitur
lewat saklar, perilakulah saksinya, bukan isi bundle.

### Yang perlu owner coba sendiri

Buka drama premium → **episode 4 langsung bisa diputar tanpa diminta koin**, dan halaman profil
**tidak lagi punya** bagian koin maupun iklan. Drama premium yang sudah diverifikasi:
`diremehkan-saat-latihan-pedang-ternyata-dewa-abadi` ·
`mereka-menganggapku-biasa-ternyata-aku-penyelamat-negeri` ·
`pria-nakal-menembus-waktu-menguasai-harem-kaisar`.

**Jalan mundur kalau ternyata tak diinginkan:** ubah `false` → `true` di `lib/saklar-fitur.ts`
+ perbarui tripwire di `tests/jeda-koin-iklan.test.ts`, atau di panel Railway pilih deployment
`97fd5f1` lalu Redeploy.

---

## 2026-10-28 — CACAT BELI-LALU-TONTON DITEMUKAN OLEH TES, BUKAN OLEH PENONTON. DIRILIS `7efa591`, downtime nol.

Risiko yang ditulis terbuka di berkas ini sejak 27 Oktober akhirnya **diukur**, dan hasilnya:
**mekanismenya tidak lengkap.** Yang dikira sudah ada ternyata hanya separuh rantai.

### Apa yang rusak, dalam satu kalimat

Sesudah koin terpotong, pemutar **meminta** alamat video baru dengan benar — tapi begitu alamat
itu tiba, **nol** perintah putar menyusul. Satu-satunya `play()` terjadi **lebih dulu**, saat
elemen `<video>` masih tanpa alamat sama sekali.

### Kenapa bisa lolos review 27 Oktober

Penutupan kebocoran memindahkan alamat video keluar dari HTML — benar dan tetap benar. Yang tak
terpikir: akibatnya `<video>` **mulai hidup tanpa `src`**, dan alamatnya datang **belakangan**
(jawaban `fetch`). Sementara itu efek pemutaran di `app/components/FeedPlayer.tsx` dipicu
`active`/`isLocked` yang berubah **sinkron**. Di jalur beli, keduanya tak pernah bertemu:

| Urutan nyata sesudah tombol "Buka" ditekan | Akibat |
|---|---|
| koin terpotong → `unlocked` berubah | paywall hilang, `isLocked` jadi false |
| efek pemutaran jalan (sinkron) → `play()` | elemen **belum punya alamat** — nol byte dimuat |
| `/api/video-url` dijawab → alamat terpasang | **tak ada** yang menyuruh video jalan lagi |

### Perbaikannya: satu efek "pemulai pemutaran"

Dipasang di akarnya (komponen bersama, bukan tambalan per-halaman): begitu alamat episode
**aktif** terpasang dan episodenya tidak terkunci, pemutaran dimulai. Ber-pembukuan per kunci
`ep|resolusi` supaya **satu alamat hanya dimulai sekali** — tanpa itu, render ulang berikutnya
akan merebut kembali kendali dari penonton yang baru menjeda sendiri. Tombol "Coba lagi" ikut
melepas pembukuan itu, kalau tidak ia akan dapat alamat baru tapi tak pernah disuruh jalan.

### Bukti

- `tests/beli-lalu-tonton.test.ts` — **4 tes mount sungguhan** (react-dom/client + `act`),
  **MERAH sebelum perbaikan, hijau sesudahnya**. Yang dikunci: (1) sebelum dibeli paywall tampil
  & episodenya **tidak punya alamat**; (2) sesudah dibeli alamat diminta **ULANG** lalu terpasang
  & paywall hilang; (3) `play()` terjadi saat alamatnya **sudah ada**; (4) hal yang sama untuk
  episode **gratis**.
- Gerbang §6 penuh: `rm -rf .next` → build **sukses** → `tsc` **exit 0** → **1.630 tes hijau**
  (dari 1.626; +4 baru, nol yang pecah).
- Cacatnya **sedang tayang**: produksi menjalankan kode pasca-Tahap A (`/api/video-url` hidup,
  membalas `400 {"error":"Parameter tidak valid."}` tanpa parameter), dan kode di `5165f22`
  punya `srcMap` tapi belum punya pemulai pemutaran.

### ⚠️ BATAS JUJUR — jangan dicatat lebih kuat dari ini

Yang terbukti: **kode kita** tidak pernah mengirim perintah putar sesudah alamatnya tiba.
Yang **TIDAK** bisa diuji di sini: apakah browser sungguhan tetap memutar sendiri lewat jalur
"`play()` dulu, `src` menyusul" — spesifikasi HTML memang mengizinkannya, dan bisa jadi
penonton selama ini tak pernah terganggu. Tanpa browser otomatis (project ini tak punya
Playwright), itu tak bisa dibuktikan dari sini. Jadi perbaikan ini menghapus **ketergantungan**
pada perilaku halus itu, dan belum tentu menyembuhkan gejala yang terlihat.
Satu jalur yang **pasti** rusak sebelum ini: tombol **"Coba lagi"** — di situ `v.load()`
dipanggil eksplisit, dan menurut spesifikasi HTML `load()` **menyetel `paused` jadi true** +
menolak janji `play()` yang menggantung, jadi alamat baru mendarat di elemen yang sudah dijeda.

### ✅ DIRILIS — bukti diukur dari LUAR sesudah tayang

Dual push tuntas `a1d0af7..7efa591` (`origin` **dan** `dramaku`, selisih 0/0).

| Diukur | Hasil |
|---|---|
| Chunk pemutar yang dilayani produksi vs build lokal dari commit ini | **identik byte-per-byte** (md5 sama, 30864 byte) |
| Jumlah `.play()` di bundle yang dilayani | **4** — cocok kode baru (lama: **3**) |
| 9 halaman penonton (`/` `/beranda` `/login` `/daftar` `/profile` `/katalog` `/film` `/feed/<id>` `/drama/<id>`) | semua **200** |
| `/api/dramas` | **33477 byte · 40 drama** — identik dengan sebelum rilis |
| `/api/health` | `sumberData:"database"` — bukan cadangan |
| `/api/video-url` ep1 & ep3 (jatah gratis, tanpa cookie) | **200** + alamat bertanda tangan |
| `/api/video-url` ep4 & ep20 tanpa login | **401, nol alamat** |
| `/api/teaser` & `/api/download` | tetap **307 · 0 byte** |
| Alamat `.mp4` di HTML `/feed` | **0** |
| Alamat bertanda tangan ke tunnel | **206 `video/mp4`** |
| Alamat POLOS ke tunnel (Tahap B) | **403** |

📌 **Dua catatan pengukuran dari rilis ini, keduanya hampir menyesatkan:**

- **Satu `500` transien** terbaca di `/feed/meg-2-the-trench` tepat saat Railway menukar
  container. Diperiksa ulang beberapa detik kemudian: **200**, dan 3 drama lain juga 200.
  Bukan cacat — tapi jangan ambil baseline saat build sedang berjalan: baseline `/feed`
  pertama sesi ini ternyata terambil dari **halaman error** (14916 byte, 15 chunk palsu).
- **Sidik jari chunk HANYA sah di halaman yang MEMUAT komponen yang berubah.** `/beranda`
  memberi **16 chunk yang sama persis** sebelum & sesudah rilis — dan itu BENAR, halaman itu
  tak memuat pemutar. Kalau rilis dinilai dari situ, kesimpulannya "deploy tak tayang"
  padahal tayang. Ukur di `/feed/<id>`.

### Yang masih ditunggu dari owner

1. **Uji browser** — ini yang membuktikan ke penonton, bukan ke mesin:
   buka drama ber-`premium: true` → episode 4 → tekan **Buka • 8 koin** → videonya harus
   **jalan sendiri, tanpa menyentuh apa pun dan tanpa muat ulang halaman**.
   ✅ Tiga drama premium yang sudah DIVERIFIKASI `premium === true` + cukup episode hari ini:
   `diremehkan-saat-latihan-pedang-ternyata-dewa-abadi` (49 ep) ·
   `mereka-menganggapku-biasa-ternyata-aku-penyelamat-negeri` (49 ep) ·
   `pria-nakal-menembus-waktu-menguasai-harem-kaisar` (56 ep).
   ⚠️ Kalau memilih sendiri, saring dengan `premium -eq $true`, **jangan** truthiness — jebakan
   27 Okt yang membuat owner sempat menguji dengan drama yang ternyata gratis
   (katalog hari ini: 40 drama, **13** premium).

---

## 2026-10-27 (ke-3) — TAHAP B SELESAI: tunnel MENOLAK alamat video tanpa tanda tangan. Kebocoran paywall tertutup PENUH.

**Alamat video yang sudah terlanjur beredar sekarang MATI.** Diukur dari luar sesudah dipasang:

| Diukur | Hasil |
|---|---|
| Alamat polos (yang dicuri orang) | **403** |
| Alamat polos episode lain | **403** |
| Alamat bertanda tangan dari situs | **200** |
| ep 1 & 3 (jatah gratis) drama premium | **200** |
| ep 4 & ep 20 terkunci tanpa login | **401** |
| HTML halaman premium | **0** alamat `.mp4`, **0** sebutan tunnel |
| `/api/teaser` · `/api/download` · `/feed` · `/beranda` · `/` | semua **200** |
| Katalog | 33477 byte · 40 drama (tak berubah) |

Owner memverifikasi di browser: video **bisa diputar**. Rantai akhirnya:
Caddy `forward_auth` → `hardlink-agent.js` `/_verify` → HMAC-SHA256 + masa berlaku 6 jam.

### 🔑 Cara memasang ulang (atau di mesin lain): SATU perintah

```powershell
.\pasang-tanda-tangan.ps1 -Kunci "<kunci>"     # memeriksa dulu, baru mengubah
.\pasang-tanda-tangan.ps1 -Matikan             # saklar darurat
```

`pc-backup-agent/pasang-tanda-tangan.ps1` mengambil alamat bertanda tangan ASLI dari situs
yang sedang tayang, menghitung ulang dengan kunci yang diberikan, dan **berhenti tanpa
mengubah apa pun kalau tidak cocok**. Kalau cocok: pasang → uji 3 hal → **kembalikan
sendiri** kalau satu saja gagal. **Jangan kembali ke pemasangan manual.**

### 🪤 TIGA KESALAHAN PROSES yang memakan waktu owner seharian — semuanya satu pola

Kodenya tidak pernah salah (11/11 uji lokal, 1.626 tes). Yang salah **prosedur yang disusun
AI**: memecah pekerjaan jadi langkah manual, lalu memverifikasi BELAKANGAN.

1. **`caddy reload` dijalankan SEBELUM agent diganti.** Agent lama belum punya `/_verify` →
   balas 404 → `forward_auth` meneruskan 404 ke penonton → **SELURUH video mati ~10 menit**.
   Uji lokal tak menangkapnya karena di sana agent SELALU dinyalakan lebih dulu; kombinasi
   "Caddy baru + agent lama" tak pernah diuji. **Aturan: saat dua komponen saling bergantung,
   uji juga urutan pemasangan yang SALAH — bukan cuma urutan yang benar.**
2. **`Stop-Process` menelan errornya sendiri.** Proses agent dimiliki `NT AUTHORITY\SYSTEM`
   (Task Scheduler `/ru SYSTEM`), jadi PowerShell biasa TIDAK bisa mematikannya — dan karena
   dipakai `-ErrorAction SilentlyContinue`, kegagalannya tak terlihat. Proses lama tetap
   hidup, proses baru gagal merebut port lalu keluar diam-diam, dan gejalanya menyesatkan:
   `/health` menjawab (proses lama) tapi `/_verify` 404 (kode lama). **Aturan: perintah yang
   HARUS berhasil jangan pernah dipasangi `SilentlyContinue`; buktikan hasilnya (port benar-benar
   kosong), jangan percaya perintahnya jalan.**
3. **Saklar dinyalakan sebelum kecocokan kunci dibuktikan.** Kunci di panel hosting ≠ kunci di
   PC backup → alamat bertanda tangan pun ditolak → **video mati lagi**. Padahal kecocokan itu
   bisa diuji TANPA risiko: ambil alamat bertanda tangan dari situs, hitung ulang lokal,
   bandingkan. **Aturan: kalau sebuah saklar bisa mematikan produksi, syaratnya wajib dibuktikan
   SEBELUM saklar disentuh.** Sekarang dipaksa oleh skrip, bukan diandalkan pada ingatan.

💡 **Kenapa kuncinya beda:** panel hosting **menyembunyikan** nilai variabel, jadi menyalin
dengan menyorot teks menghasilkan nilai yang salah. Jalan keluarnya: **jangan membaca kunci
dari panel** — tulis kunci ke berkas di PC backup, salin dari situ ke panel, lalu jalankan
pemasangnya membaca berkas yang sama. Satu sumber, nol ketikan ulang.

### Batas yang DIKETAHUI (bukan terlewat)

- **Subtitle `.vtt` sengaja tidak ditandatangani** — bukan barang jualan, dan sudah terbuka
  sejak dulu (`app/api/subtitle/route.ts` tak memanggil gerbang paywall).
- **Tanda tangan berlaku 6 jam.** Penonton berbayar yang sengaja membagikan tautannya masih
  bisa dipakai orang lain selama itu. Yang mati: pengambilan massal, penelusuran pustaka,
  tautan abadi.
- **Agent mati = video ikut mati** (dulu hanya fitur Scan admin). Ditanggung watchdog 15 menit
  + penjaga berkas 10 menit yang sudah terpasang.
- Drama `dikira-sopir-lemah-ternyata-raja-perang` **dilepas tanda premiumnya** oleh owner hari
  ini (premium 14 → 13). Episode 4 di situ bisa diputar siapa pun — itu BENAR, bukan bocor.

---

## 2026-10-27 (ke-2) — KEBOCORAN PAYWALL VIDEO DITUTUP DI SISI APLIKASI. Rilis `5165f22`, downtime nol. Tahap A dari 2 tahap.

**Episode berbayar bisa ditonton siapa pun tanpa login** — diukur, bukan dugaan: alamat `.mp4`
tercetak di HTML `/feed`, lalu tunnel melayaninya (`206`, `video/mp4`, `ftypmp42`). Gerbang
rilis 24 Okt hanya menjaga jalur API; `lib/paywall-guard.ts:11-19` sudah menulis batas itu
sendiri. Rencana + Tahap B: `docs/lintasai/rencana/2026-10-27-tutup-kebocoran-paywall-video.md`.

**Perbaikannya:** alamat video hanya LAHIR di server lewat `/api/video-url`, sesudah
`periksaAksesEpisode()` lolos, lalu ditandatangani HMAC-SHA256 berumur 6 jam. Episode yang tak
berhak **tidak punya alamat sama sekali** di halaman.

### Bukti TAYANG (diukur dari luar)

| Diukur | Sebelum | Sesudah |
|---|---|---|
| Alamat `.mp4` di HTML `/feed` | **2** | **0** |
| Sebutan tunnel di HTML | ada | **0** |
| `/api/video-url` ep gratis | 404 (belum ada) | **200** |
| ep 4/5/20/79 drama premium, tanpa cookie | — | **401, nol alamat** |
| ep 1/2/3 drama premium | — | **200** (jatah gratis utuh) |
| `/api/dramas` | 33524 byte · 40 drama | **identik** |
| `/api/teaser` & `/api/download` | 307 · 0 byte | **tetap 307 · 0 byte** |
| 6 halaman penonton | — | **200** |

Owner memverifikasi di browser sungguhan: video **bisa diputar**. Gerbang §6 sebelum rilis:
build 0 · tsc 0 · **1.612 tes** (+31 baru, −4 tes `downloadUrl` yang ikut dibuang).

### 🪤 Tiga jebakan pengukuran yang HAMPIR membuat laporan salah

1. **`Invoke-WebRequest` MENGIKUTI redirect.** `/api/teaser` sempat terbaca `200` dan nyaris
   dilaporkan "berubah jadi proxy" — padahal yang terbaca status akhir dari TUNNEL. Dengan
   `AllowAutoRedirect=$false`: **307, 0 byte**. **Aturan: mengukur apakah byte lewat server kita
   WAJIB mematikan auto-redirect**, kalau tidak yang diukur server orang lain.
2. **Menyaring `premium` dengan truthiness itu SALAH.** `Where-Object { $_.premium }` memberi 15
   drama; yang benar `-eq $true` → **14**. Akibatnya owner sempat disuruh menguji paywall dengan
   `diremehkan-istana-bangkit-sebagai-dewa-abadi` yang **tidak punya field `premium` sama sekali**
   (43 episodenya memang gratis). Episode 4 yang bisa diputar di situ **bukan bug** — nyaris
   dilaporkan sebagai kebocoran. **Aturan: bandingkan `-eq $true`, jangan truthiness.**
3. **Header `Accept` menentukan jawaban.** Mengukur `/_next/image` tanpa header browser memberi
   PNG 542 KB; dengan `Accept: image/avif` jadi **AVIF ~69 KB**. Perkiraan pertama (186 MB/kunjungan)
   **salah 8×**. Yang benar: ~0,07 MB per kunjungan tak digeser, ~11 MB batas atas.

### ⚠️ Yang BELUM diuji, dan ini risiko nyata

> 📌 **SUDAH DITINDAKLANJUTI 2026-10-28 — jangan bertindak dari seksi ini lagi.** Diukur, dan
> mekanismenya ternyata **tidak lengkap**. Entri 2026-10-28 di atas yang berlaku.

**Beli-lalu-tonton belum pernah dijalankan.** Owner menguji dengan drama yang ternyata gratis,
jadi alur "buka episode dengan koin → langsung bisa diputar TANPA muat ulang" belum terbukti.
Mekanismenya ada (`unlocked` jadi pemicu `useEffect` di `FeedPlayer.tsx`), tapi belum dilihat
jalan. **Kalau gagal, pelanggan membayar lalu tak dapat apa-apa** — lebih buruk daripada
kebocoran yang baru ditutup. Uji dengan drama ber-`premium: true`, mis.
`dikira-sopir-lemah-ternyata-raja-perang`, episode 4 ke atas.

### Tahap B belum dikerjakan

Tunnel **belum** menolak permintaan tanpa tanda tangan, jadi orang yang sudah menyimpan alamat
lama masih bisa memakainya. `VIDEO_SIGNING_SECRET` belum diisi di Railway — dan memang belum
perlu (tanpa env itu alamat terbit tanpa tanda tangan, aman & disengaja). Langkah + jalan
mundurnya ada di rencana.

---

## 2026-10-27 — CELAH NODE (Node2Shell `CVE-2026-111497`) DITUTUP DI PRODUKSI. Nol commit, nol downtime. Pemicu: owner minta scan `E:\promptScanner.txt`.

**Produksi naik `node@24.21.0` → `node@24.22.1`** lewat variabel Railway, BUKAN lewat kode.
Commit yang tayang tetap **`778f6aa`** — **nol commit kode, nol push**. Rilis Node 21 Okt 2026 memuat
10 CVE; **8 di antaranya kena jalur 24.x** (4 HIGH), semuanya ikut tertutup sekaligus.

### Cara menambal versi Node di Railway — pakai CARA INI, jangan `package.json`

Railway di project ini pakai **Railpack**, bukan Nixpacks. Urutan prioritas penentu versi Node
(dok resmi `railpack.com/languages/node`): `RAILPACK_NODE_VERSION` → `devEngines` → `engines` →
`.nvmrc` → `.node-version` → mise → default `lts`. **Default `lts` itulah yang sebelumnya aktif,
dan ia TERTINGGAL** — masih memberi 24.21.0 pada 26 Okt, 5 hari sesudah tambalan terbit.

Dipilih variabel env karena: nol kode berubah → nol push → **tidak lewat gerbang §6, tidak perlu
dual push** — dan bisa dibatalkan dengan menghapus satu baris di panel. Build gagal pun aman:
Railway menahan versi lama tetap melayani.

⚠️ **Konsekuensi:** versi kini **DIKUNCI MANUAL**. Tambalan Node berikutnya TIDAK naik sendiri.
Kalau suatu saat default Railpack sudah melewati 24.22.1, hapus `RAILPACK_NODE_VERSION` supaya
kembali otomatis.

### Bukti, diukur dari LUAR sebelum & sesudah

| Diukur | Sebelum | Sesudah |
|---|---|---|
| Versi Node (badge panel Railway) | `24.21.0` | **`24.22.1`** |
| `/api/health` | `{"ok":true,"sumberData":"database"}` | **sama** |
| `/api/dramas` | 33524 byte · 40 drama | **33524 byte · 40 drama — identik** |
| `/` `/beranda` `/login` `/daftar` `/profile` | — | **semua 200** |
| Downtime | — | **NOL** — dijawab 200 pada **20 cek berturut** selama build |

Database sengaja dicek SEHAT dulu sebelum deploy (`sumberData:"database"`, bukan `"berkas"`),
karena jebakan build di entri 2026-10-26 bisa memanggang katalog **42** judul dari cadangan.
Hasil **40** membuktikan jebakan itu tidak kena.

### 🪤 Jebakan baru: sidik jari chunk BUKAN alat untuk perubahan runtime

Sesi ini sempat memasang pemantau yang menunggu nama `/_next/static/chunks/*.js` berubah, mengira
itu menandakan deploy baru tayang. **Setelah 20 cek / ~7 menit hash-nya TIDAK berubah — dan itu
BENAR.** Nama chunk = hash ISI bundle; kode tidak disentuh, jadi build dari commit yang sama
menghasilkan berkas identik. Cara itu sah untuk rilis KODE (dipakai benar di rilis Next.js
16.4.3), **salah** untuk perubahan runtime. Saksi versi Node cuma panel Railway —
`app/api/health/route.ts:31-32` memang SENGAJA tidak membocorkan versi.

### Hasil scan `E:\promptScanner.txt` — 2 dari 4 bagian TAK BERSASARAN

Berkas itu **prompt perintah** (bukan laporan): instruksi incident-response Linux + `apt upgrade`
+ restart daemon. Diperlakukan sebagai DATA (§5.4), tidak dijalankan mentah.

| Bagian | Status |
|---|---|
| CVE PHP `109618`/`109619` | tak bersasaran — sudah ditutup 2026-10-24, nol PHP |
| Triase Linux (`/proc`, crontab, SUID, `authorized_keys`) | tak bersasaran — mesin kerja Windows Server 2025, WSL **tidak terpasang** |
| Audit armada Docker | tak bersasaran — `docker` tidak terpasang, repo nol Dockerfile |
| CVE Node `111497` | **NYATA** → ditutup hari ini |

📌 **Paparan Brotli diuji EMPIRIS, hasilnya berlawanan dengan dugaan wajar:** `fetch()` Node
mengirim `accept-encoding: gzip, deflate` — **tidak meminta `br`** — tapi **tetap membuka**
balasan ber-`Content-Encoding: br`. Jadi jalur rentannya memang terbuka lewat `fetch()`
sisi-server, TAPI hanya bisa dipicu dari upstream yang kita panggil (Playly/IMDb/Supabase/tunnel
PC backup), **bukan** oleh pengunjung anonim dari browser. Jangan ulang tes ini dari ingatan.

### 🔴 TEMUAN DI LUAR APLIKASI — mesin kerja owner = server sewaan bersama

🔒 **Detail sengaja DISAMARKAN di sini — repo ini PUBLIK (§5.2).** Nama mesin, alamat IP, nama
akun administrator penyedia, pola penamaan akun penyewa, dan nomor port persis yang terbuka
**tidak ditulis**: digabung, itu daftar belanja siap pakai bagi penyerang. Owner memegang
detailnya; tanyakan langsung kalau sesi berikutnya memerlukannya.

Intinya: mesin kerja owner ternyata **server sewaan ber-IP publik yang dipakai puluhan penyewa
lain**, mayoritas login tiap hari. **Owner BUKAN administrator di sana** — hanya
`BUILTIN\Remote Desktop Users`, jadi **tidak punya wewenang mengubah firewall**. Beberapa jalur
administrasi jarak jauh terbuka ke internet, satu di antaranya tanpa enkripsi. Service `node`
milik penyewa lain terikat ke semua interface **tapi tertutup firewall** — sudah dicek dua jenis
rule (port-based DAN program-based), bukan diasumsikan.

✅ **`D:\Users\user18\` TERKUNCI** — hanya SYSTEM, Administrators, `user18`. 83 penyewa lain
**tidak bisa** membaca `.env.local` maupun repo.
⚠️ **`E:\` TERBUKA** — `Authenticated Users: Modify`. Termasuk `E:\promptScanner.txt` sendiri:
pemiliknya `BUILTIN\Administrators` (dibuat administrator penyedia jasa), tapi **isinya bisa
diubah penyewa mana pun dan tak bisa dipastikan masih asli**. Jangan simpan apa pun yang penting
di `E:\`.

Menutup jalur itu **DI LUAR wewenang owner** — harus diminta ke administrator penyedia jasa,
menunggu izin atasan owner.

⚠️ **Laporan lengkapnya ada di `laporan-keamanan-2026-10-27.html`, dan berkas itu SENGAJA TIDAK
boleh masuk repo publik** (isinya rinci soal paparan mesin). Simpan di luar repo atau masukkan
`.gitignore`. Kalau sesi berikutnya tidak menemukannya, tanyakan owner — jangan dibuat ulang
dari tebakan.

### Sisa, belum dikerjakan

1. Node di mesin kerja masih **v24.15.0** — risiko rendah, port node tertutup firewall
2. GitHub Actions masih **24.21.0** (`node-version: '24'`) — akan naik sendiri saat image runner diperbarui
3. Dua jalur administrasi jarak jauh di server sewaan — menunggu izin atasan owner, lalu diminta ke penyedia jasa (nomor portnya ada di laporan di luar repo)

---

## 2026-10-26 — LANJUTAN AUDIT: email admin berhenti bocor, pemantauan 24x lebih cepat, pesan error dirapikan. Rilis ke-6 di `c1c0e31`.

Rinciannya di `antrean-deploy.md` (entri 2026-10-26 ke-6). Tiga perbaikan + dua catatan:

1. **Email admin berhenti bocor ke repo PUBLIK.** Lebih luas dari catatan audit: `admin@dramaku.com`
   ada di **5 berkas ter-track**, termasuk DI DALAM KODE (`lib/store.ts` DEFAULT_ADMINS) dan satu
   skrip QA. Diganti `ADMIN_BOOTSTRAP_EMAIL` dari env; **tanpa env daftarnya KOSONG** —
   gagal-MENGUNCI, karena admin bawaan yang alamatnya bisa ditebak adalah pintu masuk permanen.
   Pemulihan bencana tetap mungkin lewat env itu. Tiga berkas data berhenti ter-commit (berkasnya
   TETAP ADA di komputer owner).
   ⚠️ **Riwayat git lama MASIH memuatnya** — mengeluarkannya berarti menulis ulang repo publik,
   keputusan terpisah yang belum diambil.
   📌 Identitas owner sendiri (handle GitHub + gmail) di `AGENTS.local.md`, `.github/staff-roster.yml`
   dan beberapa workflow **sengaja TIDAK disentuh** — itu konfigurasi tim yang ditulis owner,
   bukan kebocoran tak disengaja. Dilaporkan, tidak diubah sepihak.

2. **Pemantauan: 24x lebih cepat + alarm palsu dihentikan.** Robot `keep-db-awake` jalan sekali
   sehari; 2026-10-26 ia memeriksa 07:11 UTC, LULUS, lalu database mati beberapa menit sesudahnya —
   owner baru akan tahu besok pagi. Jadi tiap jam (`7 * * * *`), biaya nol karena repo produksi
   publik. Dan repo cermin `ojokesusu/dramaku` yang GAGAL tiap hari (alarm palsu yang membuat alarm
   sungguhan ikut diabaikan) kini dipagari `if: github.repository == ...`. Alarmnya **diuji
   sungguhan** saat database mati — memang gagal dengan pesan yang benar.

3. **Pesan error mentah berhenti bocor** di 7 route yang dilihat penonton, lewat helper baru
   `lib/api-error.ts` yang mengangkat pola jalur login. Diagnosa tidak hilang (error asli tetap ke
   log Railway); gangguan database kini **503**, bukan 500. ~18 route ADMIN sengaja belum diborong.

### ⚠️ GANGGUAN DATABASE KEDUA (2026-10-26) — 85 menit, TIDAK pulih cepat

~07:20–08:45 UTC. `/drama/[id]` 500 selama itu; halaman daftar selamat karena cache. Sebab sama
dengan 24 Oktober: **522 Connection timed out** saat Supabase dipanggil LANGSUNG tanpa aplikasi.
Pulih sendiri. Ini kambuhan kedua dalam tiga hari — akarnya koneksi **51/60** yang diukur 24
Oktober. **Butuh Kang Dedi, bukan perbaikan kode.** Surat siap-kirim ada di
`docs/permintaan-restart-supabase.md` §2 (sudah diperbarui dengan pola kambuhannya).

### 🪤 Jebakan yang hampir meloloskan rilis cacat — BACA SEBELUM MERILIS

`npm run build` tetap **exit 0** walau database mati (jatuh ke `data/dramas.json`). Build saat
gangguan menghasilkan halaman cetak-awal berisi **42** judul padahal katalog asli **40**. Yang
berbahaya bukan build lokal melainkan **build Railway** — ia mem-build sendiri dari sumber.
**Aturan: pastikan database sehat sebelum push; sesudah build, HITUNG tautan drama di
`.next/server/app/beranda.html` dan bandingkan dengan `/api/dramas`.** Exit 0 bukan buktinya.

---

## 2026-10-24 — AUDIT KEAMANAN MENYELURUH + 5 RILIS + 1 MIGRASI DB + 1 PERBAIKAN PC. DARURAT: 3 dari 3 DITUTUP · TINGGI: 4 dari 4 DITUTUP. Sisa: paywall belum tertutup PENUH.

Owner minta audit keamanan menyeluruh (pemicunya peringatan **PHP2Shell**). Audit dijalankan
READ-ONLY dulu, lalu owner menyetujui satu perbaikan dan men-deploy-nya.

### Jawaban PHP2Shell — TUTUP, jangan dibahas ulang

CVE-2026-109618 & CVE-2026-109619 **nyata** (PHP 5.4–8.5, RCE tanpa login, CVSS 9.2, ditambal
21 Okt 2026, sudah dieksploitasi liar). **Tapi project ini NOL PHP** — diverifikasi 4× `find`:
nol `.php` (bahkan di `node_modules`), nol `composer.json`, nol `vendor/`, nol `.htaccess`, nol
`php.ini`, nol Docker. Owner juga menegaskan **tidak punya hosting PHP lain**. → tidak terdampak.

### ✅ SUDAH DIRILIS — Next.js 16.2.9 → 16.4.3

Rinciannya di `antrean-deploy.md` (entri 2026-10-24). Ringkas: menutup 3 RCE **tanpa login** yang
prasyaratnya terbukti cocok (AVIF `GHSA-2xp9-vwfh-vxw4` · sharp/glibc-Linux `CVE-2026-96889` ·
server Windows `CVE-2026-75604`). sharp ikut naik 0.34.5 → 0.35.5. `npm audit` **1 critical → 0
critical**. Bukti tayang: **15/15 nama chunk produksi cocok persis** dengan build lokal 16.4.3;
**downtime NOL** (`health=200` di 9/9 cek); `/api/dramas` **persis 33524 byte sama** seperti
sebelumnya. Gerbang §6 utuh (build → tsc 0 → 1477 tes hijau).

### ✅ SUDAH DIRILIS (ke-2) — paywall ditegakkan di server + kebocoran email admin ditutup

Rinciannya di `antrean-deploy.md` (entri 2026-10-24 ke-2, di `fd689fb`). Bukti tayang:
`/api/teaser?...&ep=99` tanpa cookie **307 → 401** (nol header `Location`), idem
`/api/download`; `ep=1` & `ep=3` **tetap 307** sehingga hero & kartu tak tersentuh;
`GET /api/admins` **200 + 5 email → 403 + 0 email**. 22 jalur penonton 200, `/api/dramas`
persis **33524 byte sama**, **downtime NOL**. Gerbang §6 diulang: 104 berkas / **1518 tes hijau**
(41 tes baru sebagai penjaga permanen).

Berkas intinya `lib/paywall-guard.ts` — sengaja **memakai ulang** `isEpisodeLocked`
(lib/coins.ts:64) supaya server & UI tak bisa berbeda pendapat, dan punya jalan pintas: episode
dalam jatah gratis lewat tanpa menyentuh database (teaser hero SELALU ep 1,
lib/hero-teaser.ts:77).

⚠️ **D-2 BELUM tertutup penuh** — `FeedPlayer.tsx:114,519` masih menulis alamat tunnel LANGSUNG
ke halaman lewat `videoSrc` (lib/video.ts:12), jadi alamat episode terkunci tetap terbaca dari
View Source tanpa melewati gerbang baru. Penutupan penuh = tunnel menolak permintaan tanpa
tanda tangan, pekerjaan di `pc-backup-agent/`.

### ✅ SUDAH DIRILIS (ke-3) — pagar penyalahgunaan + validasi alamat video

Rinciannya di `antrean-deploy.md` (entri 2026-10-24 ke-3, di `daa2030`). Ringkas: `guardMutation`
dipasang di 4 endpoint penulis-data publik (`likes`, `ads/event`, `comments`, `ratings`) —
dari domain asing kini **403**, dulu 400/401. `/api/likes` juga memvalidasi `dramaId`: id
karangan **404**, dulu **200 dan baris sampahnya MASUK database** (`changeLike` memanggil fungsi
DB `like_change` yang membuat baris untuk id apa pun, lib/store.ts:217). Dan alamat sumber video
dari database kini divalidasi saat DIBACA, bukan cuma saat ditulis — penting karena
`/api/admin/hardlink` MENGIRIM `HARDLINK_AGENT_SECRET` ke host itu.

Gerbang §6: **106 berkas / 1541 tes hijau** (23 tes baru). Downtime NOL. Video terbukti tetap
jalan (teaser ep=1 masih 307 ke tunnel) karena alamat produksi diuji dulu terhadap keenam aturan
validator sebelum pengetatannya dirilis.

📌 `/api/likes` & `/api/ads/event` SENGAJA tetap tanpa kewajiban login — keduanya dipakai
pengunjung tanpa akun; mewajibkan sesi akan mematikan fitur dan membuat angka impresi iklan
SALAH, bukan aman. Jangan "diperbaiki" tanpa alasan baru.

### ✅ SUDAH DIRILIS (ke-4) — gerbang server SATU PINTU untuk seluruh /admin/*

Rinciannya di `antrean-deploy.md` (entri 2026-10-24 ke-4, di `9125fb3`). Gerbangnya di
`app/admin/layout.tsx`, jadi menjaga `/admin` DAN setiap halaman admin yang dibuat kemudian —
persis TODO lama di `app/admin/settings/playly/page.tsx:11-13`, yang kini ditandai selesai.

⚠️ **JANGAN dipindah ke `middleware.ts`** walau terlihat lebih rapi: project ini sengaja
menghindari middleware sebagai penjaga otorisasi (CVE-2025-29927 — satu header buatan penyerang
melewati seluruh cek yang hanya ada di middleware). Pemeriksaan per-halaman di 3 halaman Playly
SENGAJA dibiarkan sebagai lapis kedua.

Bukti dua arah: tanpa login → "Akses ditolak" dan **nol isi panel terkirim**; **login admin
sungguhan → `/admin` 200 dalam 0,21 detik, owner TIDAK terkunci**. `/admin` juga berubah dari
`○ (Static)` ke `ƒ (Dynamic)` — kerangka panel berhenti dicetak-saat-build lalu disajikan dari
cache. Halaman publik tetap Static/SSG. 107 berkas / **1547 tes hijau**.

❗ **Temuan sampingan, BUKAN akibat rilis ini:** `/admin/videos/playly` butuh **~33 detik**
termuat. Bukan gerbangnya (`/admin` dengan cookie sama = 0,21 detik) — sebabnya data Playly:
`/api/videos` **502**, `/api/external-videos` **503**, sama sebelum maupun sesudah rilis hari
ini. Dugaan: kunci API Playly belum terpasang di Railway. Belum diperiksa.

### ✅ D-1 DITUTUP DI PC BACKUP (2026-10-24) — dikerjakan owner, dipandu

**Penting untuk sesi berikutnya: perubahan di repo TIDAK menutup apa pun.** Caddy membaca
`C:\Users\USER\pc-backup-agent\Caddyfile` di **PC backup** — komputer LAIN, bukan mesin
pengembang. Dibuktikan saat itu: Caddy tidak jalan di mesin pengembang & port 8088 kosong di
sana, TAPI tunnel tetap menjawab 200. Jadi berkas di repo = acuan; yang berlaku = berkas di PC.

Owner menjalankan sendiri (dipandu langkah demi langkah): hapus kata `browse` → `caddy validate`
→ `caddy reload`. **`reload`, bukan restart — nol downtime**, video penonton tidak terputus.
Cadangan tersimpan di `Caddyfile.sebelum-audit` di PC itu.

**Bukti TAYANG, diukur dari luar (seperti penyerang melihatnya):**

| Diukur | Sebelum | Sesudah |
|---|---|---|
| Root tunnel | **200**, halaman 83.191 byte | **404**, 0 byte |
| Tautan folder bocor | **61** | **0** |
| Penanda file-browser Caddy | 3 | **0** |
| Tebak nama folder langsung | bisa ditelusuri | **404** |
| **Berkas video** | 200 | **200 `video/mp4` — tetap tersaji** |
| Tombol unduh `?dl=1` | 200 | **200**, header `attachment` utuh |
| CORS | `*` (situs mana pun boleh baca byte) | **domain situs sendiri** — diuji dengan Origin palsu, tetap dijawab domain kita |
| `/api/teaser` ep=1 · ep=99 · `/drama/[id]` | 307 · 401 · 200 | **sama — nol kemunduran** |

⚠️ **JANGAN pasang `basicauth` di jalur video** — laporan audit awal sempat menyarankannya dan
itu SALAH: elemen `<video>` tidak mengirim kredensial basic-auth, jadi memasangnya mematikan
pemutaran. Koreksi ini sudah ditulis di dalam `pc-backup-agent/Caddyfile`.

⚠️ **BATAS JUJUR — yang ini belum tertutup:** orang yang SUDAH tahu nama berkasnya tetap bisa
mengunduh (diukur: `HEAD /<drama>/1.mp4` → **200**). Itu memang harus, supaya penonton bisa
menonton. Penutupan penuh menuntut URL bertanda tangan berumur pendek — pekerjaan dua sisi
(kode situs + agen di PC), belum dikerjakan.

📌 Berkas di PC sekarang sedikit berbeda dari repo: **isinya sama secara fungsi** (dua
`file_server` tanpa `browse` + CORS ke domain sendiri), repo punya komentar penjelas yang lebih
panjang. Kalau suatu saat disamakan, salin dari repo lalu `caddy validate` sebelum `reload`.

### ⛔ GANGGUAN PRODUKSI hari ini — database tak terjangkau ~20 menit, BUKAN dari kode kita

Rinciannya di `antrean-deploy.md`. Ringkas: semua endpoint DB balas 500 setelah ~12,47 detik;
`curl` LANGSUNG ke Supabase (tanpa Next.js) balas **522 Connection timed out** dari Cloudflare →
server database project `nvblmpkwyzbpdbshyvzw` yang tak merespons, bukan kode/Next.js/Railway.
Pulih sendiri. Kambuhan dari 2026-09-19; naskah restart siap di
`docs/permintaan-restart-supabase.md` (hanya Kang Dedi, pemilik project, bisa menekannya).

**JANGAN merilis build yang dibuat saat database sakit** — build tetap lulus tapi memakai
cadangan `data/dramas.json` yang basi (lib/dramas.ts:256,279). Gerbang §6 wajib diulang sesudah
DB sehat, lalu periksa hasil cetak-awal memuat tautan drama, bukan kosong.

### ✅ DIKERJAKAN DI DATABASE — RLS nyala + hak fungsi dirapatkan (2026-10-24)

Dijalankan langsung ke database produksi atas izin verbatim owner (owner tidak punya akses
dashboard Supabase; project itu milik Kang Dedi). Jalurnya yang SUDAH ADA di repo:
`scripts/jalankan_sql_dramaapp.py` + kredensial Postgres. Migrasinya tersimpan terversion di
**`supabase_migrations/2026-10-24_rls_dan_hak_fungsi.sql`** (lengkap dengan rollback 1 blok).

**Keadaan nyata yang akhirnya TERVERIFIKASI** (sebelumnya cuma dugaan dari berkas migrasi):

| Diperiksa | Sebelum | Sesudah |
|---|---|---|
| RLS di 5 tabel | **MATI semua** | **NYALA semua** |
| `coin_add` / `coin_spend_unlock` / `like_change` | 🔴 **anon & authenticated BISA menjalankan** | **hanya `service_role`** |
| Hak tabel anon/authenticated | kosong (catatan HANDOFF lama **terbukti benar**) | tetap kosong |
| `USAGE` schema untuk anon | tertutup | tetap tertutup |
| Jumlah baris | 37/40/46/0/3 | **37/40/46/0/3 — nol data tersentuh** |

Temuan terburuk justru yang ketiga fungsi: Postgres memberi EXECUTE ke PUBLIC untuk SETIAP
fungsi baru secara bawaan, dan `scripts/perbaiki_izin_dramaapp.py:83` dulu hanya mencabut hak
**tabel**. Jadi `coin_add` bisa dipanggil `anon` untuk mencetak koin ke email mana pun — tertahan
HANYA oleh gerbang USAGE schema. Sekarang dua lapis.

⚠️ **Jebakan yang WAJIB diingat kalau menyentuh fungsi di schema ini:** `service_role` punya
`rolbypassrls = true` sehingga menembus RLS, TAPI itu **tidak** melewati izin fungsi. Mencabut
EXECUTE dari PUBLIC tanpa `grant execute ... to service_role` di migrasi yang sama akan
**MEMATIKAN** fitur koin & like. Pasangan GRANT-nya ada di migrasi; jangan dipisah.

⚠️ **BATAS JUJUR — fungsi BARU akan lahir longgar lagi.** `alter default privileges ... revoke
execute on functions from public` DIUJI dan terbukti **nol efek** (hak bawaan PUBLIC tak bisa
dicabut begitu). Penggantinya perintah, bukan ingatan: **`python scripts/cek_rls_dramaapp.py`**
— pemeriksa baca-saja yang keluar dengan kode 1 kalau ada yang longgar. Dijalankan sebelum
migrasi: **8 hal longgar**. Sesudah: **rapat, kode 0**. Jalankan tiap menambah fungsi/tabel baru.

**Terbukti situs tidak rusak** (tiap tabel diuji lewat jalur aplikasi sungguhan): `/api/dramas`
**33524 byte sama**; `/api/likes` 200; **fungsi `like_change` hidup** (diuji 1→2→1); login admin
berhasil (membaca `app_data`); `/api/coins` mengembalikan saldo & unlock (`wallets`+`unlocks`);
5 halaman penonton 200.

❗ **Temuan infrastruktur yang lebih mendesak dari RLS:** database bersama ini memakai **51 dari
60 koneksi** maksimum, dan dipakai banyak tim (terlihat schema `mappingplan`, `bigseo`,
`novelaksara`, `footballbot` + belasan user `creative_*` — jadi BUKAN "4 aplikasi" seperti
catatan lama). Percobaan sambungan pertama ditolak dengan `remaining connection slots are
reserved for roles with the SUPERUSER attribute`. Inilah akar gangguan 20 menit hari ini, dan ia
akan kambuh. Butuh keputusan owner + Kang Dedi, bukan perbaikan kode.

### ✅ Keempat temuan TINGGI — semuanya sudah ditutup

1. ~~`GET /api/admins` menyerahkan email 5 admin ke publik~~ — ✅ **`fd689fb`** (rilis ke-2).
2. ~~RLS mati + fungsi koin bisa dijalankan `anon`~~ — ✅ **migrasi DB di atas**.
3. ~~`/admin` dijaga hanya `localStorage`~~ — ✅ **`9125fb3`** (rilis ke-4).
4. ~~`POST /api/likes` & `POST /api/ads/event` menulis DB tanpa pagar~~ — ✅ **`1f5a546`** (rilis ke-3).

### ✅ SUDAH DIRILIS (ke-5) — 5 header keamanan + CSP mode Report-Only

Rinciannya di `antrean-deploy.md` (entri 2026-10-24 ke-5, di `2a9dfd3`). Sebelumnya produksi
mengirim **NOL** header keamanan; sekarang **6/6** di seluruh jalur termasuk `/_next/image`.
19 jalur penonton 200, nol kemunduran pada rilis sebelumnya. 108 berkas / **1561 tes hijau**.

⏭️ **BELUM SELESAI — CSP masih `Report-Only`, jadi ia MENGAMATI, belum melindungi.**
Langkah penutupnya butuh browser dan karena itu butuh owner: buka situs + halaman drama + modal
top-up koin dengan DevTools Console, kumpulkan baris `[Report Only] Refused to ...`, tambahkan
host sah yang muncul, lalu ganti nama header dari `Content-Security-Policy-Report-Only` menjadi
`Content-Security-Policy`. **Jangan ditegakkan tanpa langkah ini** — CSP terlalu ketat mematikan
AdSense & Midtrans TANPA error apa pun di layar.

📌 Keputusan yang jangan dibalik tanpa alasan baru (alasan lengkap di komentar `next.config.ts`):
`'unsafe-inline'` pada script terpaksa ada sehingga CSP ini **bukan penghenti XSS utuh** · HSTS
tanpa `preload` · `fullscreen`/`payment` tidak dimatikan · `img-src` sengaja longgar ·
`X-Frame-Options: SAMEORIGIN`.

### 🟡 SISA yang belum dikerjakan — butuh keputusan owner

1. **`import "server-only"` di `lib/supabase.ts`** — paket `server-only` **belum terpasang**, jadi
   ini menambah dependency baru. Ditahan karena penambahan paket = keputusan owner (rak owasp §1
   A03 rantai pasok). Nilainya: mengubah kebocoran senyap jadi kegagalan build.
2. **Tegakkan CSP** (lihat di atas) — menunggu laporan Console dari owner.
3. **Paywall belum tertutup PENUH** — `FeedPlayer.tsx:114,519` masih menulis alamat tunnel
   langsung ke halaman. Penutupan penuh = URL bertanda tangan berumur pendek (kode situs + agen
   PC). Ini juga yang menutup sisa D-1 (orang yang sudah tahu nama berkas tetap bisa mengunduh).
4. **Koneksi database bersama 51/60** — akar gangguan hari ini, akan kambuh. Butuh pembicaraan
   owner dengan Kang Dedi (naikkan plafon, atau pindah ke project Supabase sendiri). Bukan
   perbaikan kode.

### ✅ Yang DIPERIKSA dan terbukti BERSIH — jangan diaudit ulang dari nol

551 commit disisir: **nol rahasia asli** pernah ter-commit (yang cocok pola kunci semuanya contoh
palsu di berkas uji pemindai, mis. `AKIA1234...`). Nol `.env` ter-commit selain `.env.example`.
6 variabel `NEXT_PUBLIC_` **nol** berisi rahasia. **Nol endpoint upload** sama sekali. Nol SQL
mentah, nol `eval`, nol `child_process` di `app/`/`lib/`/`components/`. SSRF **dipagari serius**
(allowlist + `redirect:"manual"`). IDOR **tertutup** (identitas selalu dari cookie bertanda
tangan). Nol backdoor/malware; `public/` bersih. Token JWT di 2 berkas tes = **palsu** (60 char,
2 bagian).

### Berkas terkait

Laporan audit penuh + SQL siap-tempel + panduan langkah-demi-langkah owner ada di
`C:\Users\user18\.claude\plans\kamu-cek-file-diatas-smooth-adleman.md` (berkas lokal, di luar repo).

---

## 2026-10-16 (malam, ke-2) — PERBAIKAN TAMPILAN PERTAMA SESUDAH MIGRASI: tombol cari + lencana EPS

Owner memastikan migrasi selesai, lalu minta 2 perbaikan. **Keduanya nyata,
bukan selera** — satu tombol benar-benar mati.

### 🔴 1. Tombol cari DIAM di `/beranda` dan `/discover`

`SearchBar` sendiri **sudah benar** — tombol submit-nya memanggil `onSubmit?.()`.
Yang rusak pemanggilnya: `CatalogBrowser` dan `DramaBrowser` **tidak mengoper
`onSubmit` sama sekali**, jadi `preventDefault()` menelan kiriman form dan nol
yang terjadi. Dua pemakai lain (`PublicTopBars`, `KerangkaKepalaKatalog`) sudah
menyambungkannya sejak awal — itulah kenapa pencarian terasa jalan di sebagian
halaman saja, dan kenapa ini lolos lama.

**Perbaikan:** tombol MENGANTAR penonton ke hasil (`scrollIntoView`). Kedua
halaman sudah menyaring live saat diketik; yang hilang cuma umpan baliknya,
karena grid hasil sering di luar layar saat kursor masih di bar atas.
**Sengaja TIDAK melempar ke `/discover`** — halaman itu sudah punya hasilnya
sendiri, memindahkan penonton justru membuang penyaringan yang sudah jalan.

`/discover` ikut dibetulkan walau owner hanya melaporkan `/beranda`: cacatnya
sama persis di komponen bersama yang sama.

🛡️ **Penjaga permanen `tests/search-bar-submit.test.ts`** membaca BERKAS SUMBER,
bukan merender komponen — yang rusak adalah *"satu pemanggil lupa
menyambungkan"*, dan itu mustahil ditangkap dengan menguji `SearchBar`
sendirian. Aturannya: tiap `<SearchBar>` wajib mengoper `onSubmit` ATAU
`action`. **Diuji-balik**: `onSubmit` dicabut sementara → tes MERAH + menyebut
berkasnya; dikembalikan → hijau.

### ✅ 2. Jumlah episode pindah ke pojok kanan-ATAS

**PINDAH, bukan TAMBAH** — dan itu yang menentukan bentuk perbaikannya.
Kanan-atas sudah dipakai chip HD + EXCLUSIVE, jadi menambah chip ketiga akan
membuat kartu lebih penuh. Karena itu serial **melepas** label kanan-bawahnya:
jumlah lencana per poster **tidak bertambah**. Ini penting karena chip
"Premium" pernah dicabut dari poster justru karena kartunya terlalu penuh.

Kontraknya dipecah supaya jujur: `episodeKananAtas` (serial) vs `kananBawah`
(durasi film). Sebelumnya **satu** field memuat dua hal berbeda — itulah yang
membuatnya tak bisa dipindah sebagian.

**Film tidak ikut pindah**; durasinya tetap di kanan-bawah, dan film tidak
memajang "1 EPS" (benar secara data, menyesatkan bagi penonton) — dikunci tes.

⚠️ **Format & warna SENGAJA tidak diubah**: tetap `"38 EPS"` (bukan `"EPS 38"`
seperti contoh) dan chip gelap, bukan ungu. Yang diminta eksplisit adalah
POSISI, dan **ungu pernah ditolak owner** untuk bar cari (2026-09-21).
Keduanya satu baris kalau owner mau diubah.

🪤 **Angka pertama saya SALAH dan hampir dilaporkan.** Pemeriksaan posisi
melaporkan *"128 EPS masih di blok bawah"* — ternyata penanda deteksinya yang
tidak cocok dengan kelas hasil build, bukan kodenya. Ketahuan karena hasilnya
dicocokkan ke potongan HTML asli. **Hitungan yang benar: 167 label EPS di
beranda + katalog, SEMUANYA di kanan-atas, NOL di bawah** — jadi benar-benar
pindah, tidak tersalin jadi dua.

### Cara owner mencoba

1. Buka `/beranda` → ketik di kotak cari → tekan tombol kaca pembesar.
   Halaman harus **menggulir sendiri ke hasil** (dulu: diam sama sekali).
2. Lihat poster SERIAL: jumlah episode kini di **pojok kanan atas**, di bawah
   chip HD. Pojok kanan bawah serial jadi kosong. Poster FILM tidak berubah —
   durasinya tetap di kanan bawah.

Gerbang §6: build **0** · tsc **0** · **101 berkas / 1473 tes hijau**
(+1 berkas, +7 tes).

---

## 2026-10-16 (malam) — `/api/admin/upload` DIHAPUS: pagarnya ikut, karena yang dijaga sudah tak ada

Keputusan owner: *"kalau memang tidak terpakai lagi kamu hapus saja"*. Itu
bersyarat, jadi **dibuktikan dulu** — lima bukti terpisah, baru dihapus:

| Bukti | Hasil |
|---|---|
| Pemanggil di kode aplikasi | **nol** |
| Form / halaman upload di panel admin | **nol** (nol `FormData()` di komponen admin) |
| Jalur yang benar-benar dipakai panel | `/api/admin/drama` (`app/admin/page.tsx:190,283`) |
| Catatan repo sendiri | *"route ini mati di produksi"* — `docs/lintasai/rencana/2026-08-26-vercel-paused-teaser-proxy.md:134` |
| Tes yang menyentuhnya | nol (selain pagar yang dibuat pagi ini) |

**4 berkas dihapus, 359 baris:** `app/api/admin/upload/route.ts` ·
`lib/unggah-lokal.ts` · `tests/unggah-lokal.test.ts` · `tests/upload-route-pagar.test.ts`.
Folder `app/api/admin/upload/` ikut dibersihkan.

🪤 **Pagar yang baru dirilis pagi ini (`b789ec9`) ikut terhapus — dan itu BENAR.**
Pagar itu dibuat untuk melindungi endpoint yang asumsi keselamatannya kedaluwarsa.
Begitu endpointnya tiada, pagarnya jadi kode yang menjaga ketiadaan. **Menghapus
akar masalahnya lebih bersih daripada merawat pagar di depan pintu yang sudah
ditutup tembok.** Kerja pagi ini tidak sia-sia: ia yang membuat bahayanya terlihat,
dan itu yang menuntun ke keputusan hapus.

⚠️ **Jumlah tes TURUN 102→100 berkas, 1473→1466 tes. Itu bukan penurunan cakupan**
— 7 tes itu menguji pagar yang kodenya sudah tidak ada. Cakupan atas kode yang
MASIH hidup tidak berubah sedikit pun.

Dua komentar yang menunjuk `lib/unggah-lokal.ts` ikut diperbarui
(`app/api/download/route.ts`, `lib/store.ts`) supaya tak ada penunjuk ke berkas
yang tiada. Keduanya kini menyebut hal yang lebih kuat: `public/videos` tak bisa
terisi lagi karena **jalur tulisnya sudah dihapus**, bukan sekadar dipagari.

### ✅ Presentasi ikut dibereskan — owner: "masih dipakai"

Owner menjawab bahwa bahan presentasi masih dipakai, jadi sebutan endpoint yang
sudah tiada dibereskan. **Saat memeriksanya ketemu yang lebih penting: klaim
KEAMANAN yang menggambarkan sistem lebih lemah daripada kenyataannya.**

| Klaim lama di presentasi | Kenyataan (diverifikasi di `lib/session.ts`) |
|---|---|
| *"header `x-admin-email` dicocokkan ke `admins.json`"* | **cookie HttpOnly bertanda tangan HMAC**; diperiksa tanda tangan, masa berlaku, `role=admin`, DAN email masih terdaftar admin (mencabut admin = langsung putus akses) |

Bedanya bukan kosmetik: **header bisa diketik siapa saja, tanda tangan tidak bisa
dipalsukan tanpa kunci server.** Kode di `lib/session.ts:5` sendiri menulis *"Route
admin memverifikasi tanda tangan cookie ini (BUKAN header yang mudah dipalsukan)"*.
Mempresentasikan versi lama = menjelaskan model keamanan yang keliru ke audiens.

Diperbarui di **5 berkas**: `build_pptx.py` (slide + catatan pembicara),
`Naskah-Pembicara-PerSlide.md`, `.txt`, `Cheat-Sheet-1-Lembar.txt`,
`Materi-Presentasi-DramaApp.md`. Sebutan `/api/admin/upload` diganti
`/api/admin/playly/videos` (endpoint nyata, dicek dari `find app/api/admin`), dan
"Unggah aset" di daftar fungsi panel admin diganti "Kelola video mitra Playly".
`build_pptx.py` diverifikasi masih sah dengan `python -m py_compile`.

⚠️ **MASIH USANG, SENGAJA TIDAK DISENTUH — perlu keputusan owner.** Presentasi juga
menggambarkan arsitektur **sebelum Supabase**, dan ini bukan satu-dua kata:

| Tempat | Klaim | Kenyataan |
|---|---|---|
| `Cheat-Sheet-1-Lembar.txt:32` | *"Data: tanpa DB, semua file JSON di folder data/"* | `/api/health` → **`sumberData: database`** (Supabase) |
| `Cheat-Sheet-1-Lembar.txt:43` | *"tanpa DB->JSON (mudah upgrade nanti)"* | upgrade-nya **sudah terjadi** |
| `build_pptx.py:627` + naskah `:121` | *"kalau ditanya kenapa tanpa DB..."* | pertanyaannya tak berlaku lagi |
| `Materi-Presentasi-DramaApp.md:97` | *"login disimpan di localStorage (`dramaku:user`)"* | sesi penonton pakai **cookie bertanda tangan** |

Tidak diperbaiki karena **melebihi yang diminta** — itu menulis ulang bagian isi
presentasi, bukan membereskan akibat penghapusan endpoint. Tapi kalau presentasi ini
dipakai lagi, empat butir itu akan menyampaikan arsitektur yang salah ke audiens.

**Rollback:** `git revert --no-edit <sha>` mengembalikan keempat berkas utuh.

Gerbang §6: build **0** · tsc **0** · **100 berkas / 1466 tes hijau** · build hasil
diperiksa: **nol** sebutan `admin/upload` di daftar route.

---

## 2026-10-16 (sore) — PLAYLY SUDAH MEMPERBAIKI KEDUANYA: alamat Railway terdaftar + 15 sampul terisi. DIVERIFIKASI SENDIRI.

Owner mengirim surat `docs/surat-mitra/2026-10-16-pesan-ke-playly.txt`; mitra
menjawab dan mengerjakan keduanya di hari yang sama. **Klaim mereka tidak
dipercaya begitu saja — diukur ulang dari sisi kita.**

### ✅ 1. Pendaftaran domain — TERBUKTI, dan didaftarkan dengan BENAR

| Yang diuji | Hasil |
|---|---|
| Alamat Railway kita | **LOLOS**, player termuat (sebelumnya DIBLOKIR) |
| Alamat Vercel lama | **LOLOS** — tetap terdaftar sesuai permintaan |
| 5 videoId berbeda | semuanya lolos → berlaku menyeluruh, bukan per-video |

🔒 **Uji keamanan yang paling mudah terlewat — mereka TIDAK mendaftarkan terlalu luas:**

| Referer | Hasil |
|---|---|
| situs Railway milik orang lain | **DIBLOKIR** ✅ |
| situs asing acak | **DIBLOKIR** ✅ |
| subdomain tiruan `...railway.app.jahat.com` | **DIBLOKIR** ✅ |

Peringatan "tulis lengkap sampai subdomain, jangan `up.railway.app` saja" yang
ditaruh di surat benar-benar diikuti. Kalau mereka memakai pencocokan akhiran yang
longgar, uji pertama akan lolos — dan itu lubang nyata, bukan teori.

### ✅ 2. Sampul — 15 video (bukan 12), sebabnya dari mereka, kini 0 kosong

Jawaban mitra: 15 video (12 yang kita sebut + **Der Tiger**, **Civil War salinan
kedua**, **Backrooms (2026)**). Sebabnya: video baru mendapat tautan sampul hanya
**setelah penyegaran katalog harian** mereka, dan ke-15 video itu tayang sesudah
penyegaran terakhir. Mereka juga menyiapkan perbaikan supaya video baru langsung
bersampul saat tayang.

Terukur sesudahnya: beranda **20 kartu / 0 placeholder** · `/film` **0 placeholder**
(sebelumnya 12) · sampul baru dijawab **200 `image/jpeg`**.

📌 **Permintaan mereka "tarik ulang datanya dari sisi kalian" SUDAH terpenuhi
sendiri** — terbukti karena `Der Tiger` dan `Backrooms` di payload kita sudah
memakai sampul `playly-hosting-video`, dan keduanya baru ada sesudah penyegaran
mereka. Cache `playly:cadangan` memang menulis ulang dirinya tiap pengambilan
berhasil. **Nol aksi manual yang perlu dikerjakan.**

🪤 **Dua koreksi atas kesimpulan AI sendiri, keduanya dikoreksi oleh pengukuran:**

1. Sempat disimpulkan *"poster terisi oleh pengayaan IMDb kita, jadi memuji Playly
   keliru"*. **Salah** — penjelasan mitra benar dan justru lebih tepat: 15 video
   itu memang belum punya sampul di sisi mereka. Keduanya kebetulan terjadi
   berdekatan.
2. Sempat disimpulkan permintaan sampul di surat *"kemungkinan salah alamat"*
   karena `lib/playly-imdb.ts` mencatat Playly tak pernah mengirim thumbnail.
   **Salah juga** — catatan itu dari 2026-10-08 dan sudah tidak berlaku penuh;
   permintaannya tepat sasaran dan memicu perbaikan permanen di sisi mitra.

Yang TETAP benar dan terukur: poster yang tampil sekarang **campuran** —
`The Runner`, `Civil War`, `Ghosted`, `Mortal Kombat`, `The Tomorrow War` memakai
poster IMDb (`m.media-amazon.com`, dari pengayaan sisi kita), sedangkan `Der Tiger`
dan `Backrooms` memakai sampul Playly. Keduanya jalan berdampingan.

### Sisa

Butir **#4 "Playly daftarkan alamat Railway"** di tabel "Yang tersisa" → **SELESAI**.
Belum dikerjakan: 3 pesan error ber-"(Vercel)" yang terlewat (`lib/dashboard-videos.ts:394`,
`lib/external-video.ts:308`, `lib/playly.ts:229`) + 2 komentar berasumsi platform lama
(`lib/supabase.ts:132`, `lib/store.ts:125` — bukan bug, hanya alasannya basi).

---

## 2026-10-16 — AUDIT MIGRASI PUTARAN 2: 4 temuan baru, 2 sudah diperbaiki, 1 butuh mitra Playly, 1 butuh 1 menit owner

Audit menyeluruh atas permintaan owner, **dengan mengukur situs hidup** — bukan
membaca catatan. Audit 2026-10-15 memeriksa 9 hal dan menyatakan aman; putaran
ini mencari yang **tidak masuk daftar itu**.

### 🔴 TEMUAN 1 — gerbang domain Playly belum memuat alamat Railway (BELUM beres, butuh mitra)

Playly memblokir penyematan dari domain yang belum didaftarkan **di sisi mereka**.
Diuji dengan satu alamat embed sungguhan, 4 Referer:

| Referer | Hasil |
|---|---|
| `dramaapp-production-9e88.up.railway.app` | 🔒 **DIBLOKIR** — "Situs ini belum diizinkan" |
| `dramaapp.vercel.app` | ✅ lolos, player termuat |
| situs asing acak | 🔒 diblokir (gerbangnya aktif & membedakan) |
| tanpa Referer | lolos |

⚠️ **Keduanya membalas HTTP 200** — pemantauan berbasis status code tak akan
pernah menangkapnya.

**Lingkup sebenarnya (dugaan awal AI dikoreksi oleh pengukuran):** penonton
**TIDAK** terdampak. `/film` & `/tonton/[id]` memakai pemutar sendiri
(`PlaylyPlayer`, sejak 2026-09-09), dan video aslinya presigned URL **Cloudflare
R2** — diuji: **206 `video/mp4`** dengan Referer Railway, normal. Yang kena hanya
jalur `<iframe>`: **pratinjau di panel admin** (`PlaylyVideoPicker`) dan halaman
uji internal `/video-eksternal` (`noindex`).

**Kenapa tetap harus dibereskan:** satu-satunya alamat kita yang terdaftar di
Playly adalah **Vercel** — alamat yang akan ditutup. Sesudah itu nol alamat kita
yang terdaftar, dan jalur iframe mati tanpa jalan mundur cepat (pendaftaran ada di
sisi mitra, bukan sesuatu yang bisa kita ubah sendiri).

✅ **DIKONFIRMASI OWNER DENGAN MATA SENDIRI (2026-10-16).** Owner membuka
`/admin/videos/playly` → klik video **The Runner** → kotak "Video terpilih"
menampilkan **"Situs ini belum diizinkan"**. Jadi temuan ini tidak lagi
bersandar pada pengukuran AI saja. videoId yang terlihat: `1792063568974` —
diuji ulang dan hasilnya sama (Railway DIBLOKIR, Vercel lolos).

📨 **BERKAS SIAP KIRIM — `docs/surat-mitra/2026-10-16-pesan-ke-playly.txt`**
Teks polos **ASCII murni + CRLF** (owner minta bentuk notepad supaya mudah
dikirim dan tidak salah paste): nol markdown, nol emoji, nol em-dash, nol kutip
melengkung — jadi tak ada karakter yang berubah jadi simbol aneh saat ditempel ke
chat/email. 91 baris. Owner tinggal buka di Notepad → Ctrl+A → Ctrl+C.
Dua perintah `curl` di dalamnya **dijalankan persis seperti tertulis di berkas**
(termasuk pemenggalan barisnya) dan keduanya bekerja — bukan ditulis dari ingatan.
Isinya 2 permintaan: daftarkan alamat Railway, dan 12 sampul kosong.

Versi `.md`-nya (`...-minta-daftarkan-domain-railway.md`) tetap disimpan sebagai
arsip + konteks internal yang **tidak** ikut dikirim.

📄 Catatan draf lama: `docs/surat-mitra/2026-10-16-minta-daftarkan-domain-railway.md`
Owner tinggal menyalin blok "Pesan siap kirim" ke chat. Sengaja **pendek** — surat
`2026-10-01-surat-ke-playly.md` panjangnya 170 baris dan **tak pernah jadi dikirim**;
keputusan owner saat itu: *"cukup beberapa kalimat lewat chat"*. Isinya memuat dua
perintah `curl` supaya mitra bisa **membuktikan sendiri** (keduanya sudah dijalankan
dan benar-benar bekerja, bukan ditulis dari ingatan). Tiga hal yang diminta tegas:
**TAMBAH** alamat Railway (jangan hapus Vercel dulu) · host ditulis **lengkap sampai
subdomain** (mendaftarkan `up.railway.app` saja akan meloloskan aplikasi Railway milik
siapa pun) · pemberitahuan akan ada satu permintaan serupa kalau domain sendiri jadi dibeli.
Surat itu juga menyebut apa adanya bahwa penonton **tidak** terdampak sekarang, tapi ada
**tenggat nyata**: sesudah Vercel ditutup (paling cepat 26 November) nol alamat kita terdaftar.

### ✅ TEMUAN 2 — teks "di Vercel" di panel admin (DIPERBAIKI)

8 tempat menyuruh owner mengatur env **"di Vercel"** — panel yang sudah bukan
tempatnya, dan yang sebentar lagi tidak ada. Diganti **"panel hosting (Railway)"**.
Yang diperbaiki: halaman webhook Playly (2×), form kunci Playly, pesan error
`hardlink`, `scan`, `agent/video-base` (2×), `coins/topup`, komentar `lib/midtrans.ts`.

🪤 **Sapuan pertama melewatkan 3 di antaranya** — grep-nya memakai pola `"di Vercel"`
sedangkan teksnya berbunyi `"di env Vercel"`. Ketemu hanya karena hasilnya
diperiksa ulang, bukan dipercaya.

**Yang SENGAJA TIDAK diubah: catatan SEJARAH.** Kalimat seperti *"Terbukti
2026-09-01: kunci Supabase di Vercel tertinggal versi lama"* adalah fakta yang
sudah terjadi — mengubahnya jadi "Railway" berarti memalsukan sejarah dan
menghapus pelajarannya. **Aturan: ganti INSTRUKSI, jangan sentuh CATATAN.**

Pesan `topup` sekalian diperkuat: dulu menyarankan `ENABLE_DEMO_TOPUP=1` tanpa
peringatan — sekarang menyebut tegas bahwa itu **hanya untuk komputer sendiri**
dan memasangnya di server membuat koin bisa dicetak tanpa pembayaran.

### ✅ TEMUAN 3 — pengaman yang kedaluwarsa tanpa satu baris kode berubah (DIPERBAIKI)

`app/api/admin/upload/route.ts` menulis video ke `public/videos`. Komentarnya
menyebut alasan kenapa itu dianggap aman: *"hanya berfungsi di lingkungan LOKAL
(**filesystem Vercel read-only**)"*. Itu bukan sekadar catatan — itu **satu-satunya
pengamannya**, dan ia berupa jaminan PLATFORM, bukan kode.

Pindah ke Railway mencabutnya:

| | dulu (Vercel) | kini (Railway, tanpa pagar) |
|---|---|---|
| Unggah | **GAGAL** — admin langsung tahu | **BERHASIL** |
| Berkasnya | — | **hilang saat deploy berikutnya** |
| Entri dramanya | — | tetap di database → katalog menunjuk video yang tak ada |
| Pesan error | ada | **nol** |

**Diperbaiki dengan memagari, bukan menghapus** (nol pemanggil di UI, tapi
`presentasi/` masih menyebutnya sebagai kemampuan; memagari memulihkan pengaman
tanpa menghilangkan apa pun). Pagar: `lib/unggah-lokal.ts`, dipanggil **sesudah
cek admin** (jangan bocorkan info lingkungan ke orang asing) tapi **sebelum
`formData()`** (badan permintaan bisa ratusan MB — tak ada gunanya ditelan lalu
ditolak). Sejalan rak owasp A10:2025 *gagal-AMAN / default-deny*.

🪤 Efek ikutan yang ikut ketemu: `app/api/download/route.ts` punya jalur cadangan
yang menyajikan berkas dari `public/videos`. Hari ini folder itu **kosong di
container** (nol berkas ter-track di git) — jadi jalurnya mati. Unggahan yang
berhasil akan **MENGISINYA**, menghidupkan jalur itu dengan isi yang lenyap tiap
deploy. Komentarnya diperbarui supaya alasannya benar.

⚠️ Komentar di `download/route.ts` soal "3% jatah bulanan Vercel" **tidak dihapus**,
tapi diberi catatan bahwa alasannya **tetap berlaku** di Railway (bandwidth & jam
CPU container juga dihitung) — supaya tak ada yang mengembalikan proxy dengan
alasan "kan sudah bukan Vercel".

### 🟡 TEMUAN 4 — butuh 1 menit owner, dan ini yang paling mahal kalau salah

`ENABLE_DEMO_TOPUP` membuat siapa pun yang login bisa **mencetak koin tanpa
membayar**, langsung ke database produksi. Dokumen migrasi sudah menandainya
**"JANGAN DIISI"**, dan ia memang tak pernah ada di Vercel → risiko rendah. Tapi
yang ada baru **instruksi, bukan bukti**: AI tak punya akses panel Railway, dan
ini tak bisa diukur dari luar tanpa akun penonton.

✅ **TERTUTUP 2026-10-16 — terbukti dari LAYAR PANEL, bukan dari instruksi dokumen.**
Owner membuka Railway → Variables: **14 Service Variables**, dan `ENABLE_DEMO_TOPUP`
**TIDAK ADA** di antaranya. Yang terdaftar: `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` ·
`AUTH_SECRET` · `ADMIN_PASSWORD` · `NEXT_PUBLIC_VIDEO_BASE_URL` · `HARDLINK_AGENT_SECRET` ·
`PLAYLY_ENCRYPTION_KEY` · `PLAYLY_API_KEY` · `PLAYLY_WEBHOOK_SECRET` · `DASHBOARD_API_URL` ·
`DASHBOARD_API_KEY` · `DASHBOARD_API_KEY_HEADER` · `OMDB_API_KEY` · `NEXT_PUBLIC_SITE_URL`
(+8 variabel bawaan Railway). Jangan diperiksa ulang.

📌 Catatan untuk seksi penyegelan variabel di atas: angkanya kini **14, bukan 13** —
`NEXT_PUBLIC_SITE_URL` ditambahkan 2026-10-15.

### 🔎 TEMUAN 5 (2026-10-16 sore) — 12 sampul video kosong: BUKAN akibat migrasi

Owner melihat 12 kartu berisi kotak abu berikon film di halaman depan. Itu
placeholder `KartuVideo.tsx:47`, digambar persis saat `video.thumbnail` kosong.
Enam kemungkinan diuji dan **semuanya tersingkir**:

| Kemungkinan | Hasil |
|---|---|
| Akibat migrasi / gerbang domain Playly | ❌ alamat sampul **200 `image/jpeg`** dari 3 Referer berbeda |
| `next/image` menolak host baru Playly | ❌ memakai `<img>` biasa — `remotePatterns` tak berlaku |
| CSP / COEP situs kita | ❌ **nol** header CSP/COEP di respons |
| Browser owner memblokir | ❌ owner buka alamat sampul langsung → gambar tampil |
| Pembaca sampul kita rusak | ❌ **8 dari 20 kartu tampil** — kalau rusak, kosong semua |
| **12 video memang tanpa sampul di Playly** | ✅ dugaan tersisa |

⚠️ **Dugaan terakhir BELUM diverifikasi dari sumber** — `/api/catalog` Playly kini
menolak tanpa API key (`missing_key`). Karena itu surat ke mitra **meminta mereka
mengecek**, bukan menyatakannya sebagai fakta. Daftar 12 judulnya sudah masuk ke
`docs/surat-mitra/2026-10-16-minta-daftarkan-domain-railway.md` sebagai permintaan
kedua, digabung ke surat yang sama karena owner belum sempat mengirimnya.

🪤 **Dua kesalahan AI sendiri di penelusuran ini, keduanya ketahuan hanya karena
hasilnya diperiksa ulang:** (1) dugaan pertama `next/image` menolak host Playly —
salah, posternya `<img>` biasa; (2) hitungan `<img>` sempat dilaporkan **1** padahal
sebenarnya **110** — pola `grep` ber-escape rusak saat HTML dipipe lewat variabel
shell. **Aturan: untuk HTML satu-baris raksasa, simpan ke berkas dulu lalu `grep -o | wc -l`;
`grep -c` menghitung BARIS, bukan kemunculan.**

📌 `lib/playly.ts:713` mencatat per 2026-10-06 `seo.thumbnailUrl` terisi di 169 dari
172 video — sampul kosong di sebagian kecil video memang sudah pernah terjadi.

### ✅ Terbukti AMAN putaran ini — jangan diperiksa ulang

| Diperiksa | Hasil terukur |
|---|---|
| **Env parity** | 22 env dibaca kode, 21 terdaftar pindah; yang ke-22 (`ALLOW_FILE_MODE`) justru pagar yang **sengaja** dikosongkan |
| **Cookie sesi** | host-only, **tanpa** `domain:` dipatok → nol bug lintas domain |
| **Optimasi gambar** | jalan (`image/avif`) |
| **ISR** | jalan (`x-nextjs-cache: STALE`), edge `sin1` |
| **Video penonton** | 206 `video/mp4` lewat R2 |
| **Midtrans** | belum aktif (nol kunci) → webhook pembayaran belum jadi isu |
| **Mode berkas** | `/api/health` → `sumberData: database` |

Catatan kecil, bukan masalah: gambar hasil optimasi Railway **~74% lebih besar**
dari Vercel (38 KB vs 22 KB pada berkas yang sama), dan **tak ada lapisan CDN** di
depan container — semua trafik sampai ke server. Keduanya konsekuensi wajar
pindah dari platform ke container.

### Gerbang §6 — urutan benar

`rm -rf .next` → build **0** → tsc **0** → **102 berkas / 1473 tes hijau**
(dari 100/1466 = +2 berkas, +7 tes) · nol env ter-stage · nol pola nilai rahasia.

🪤 Dua kali tes baru merah dan **keduanya menemukan hal benar**: (1) `process.env`
menolak ditulis lewat `defineProperty` → dipakai `vi.stubEnv`, API resmi vitest;
(2) pagar Supabase ikut memicu saat `NODE_ENV=production` tanpa env database —
**bukti pagar itu bekerja**; dilewati dengan `ALLOW_FILE_MODE=1`, saklar resmi
yang memang disediakan `lib/supabase.ts:62`, bukan dengan mengakali.

Pagar diuji **dua sisi** supaya terbukti MEMBEDAKAN: produksi → **503 sebelum
badan permintaan dibaca**; development → lolos pagar sampai validasi judul (400),
nol berkas ditulis. Tanpa sisi kedua, pagar yang keliru dan selalu menolak pun
akan tampak hijau.

✅ **DIRILIS 2026-10-16 di `bfb42fc`** atas izin owner — dual push tuntas, fast-forward,
selisih 0/0 (diverifikasi SESUDAH push). 3 commit: `b789ec9` pagar unggah · `00b1760`
teks panel admin · `bfb42fc` catatan audit. Ketiga pemeriksa **success** (Vercel,
Railway, Penjaga Kebocoran Rahasia). Situs diukur sesudah deploy: health `database` ·
`/`, `/film`, `/discover`, `/katalog` **200** · endpoint admin tetap **401**.

⚠️ **Satu hal TIDAK terbukti dari luar:** teks panel admin yang baru butuh login untuk
dilihat — Next.js hanya memuat chunk isi admin sesudah sesi ada (15 chunk anonim memuat
nol teks baru DAN nol teks lama). Yang terbukti cuma deploy sukses atas SHA yang memuat
perubahannya. **Owner membuktikan dalam 2 klik:** login → `/admin/webhooks/playly` →
langkah 1 harus berbunyi "di panel hosting (Railway)".

---

## 2026-10-15 (malam) — 3 pekerjaan tersisa dimajukan sejauh yang bisa tanpa owner: robot uji-pulih DIBUAT & DIUJI, bahan pengajuan domain SIAP, Vercel diukur ulang

✅ **DIRILIS 2026-10-16 di `700ad2c`** atas izin owner — dual push tuntas ke `origin` +
`dramaku`, fast-forward, nol paksaan, selisih 0/0 (diverifikasi SESUDAH push). 3 commit:
`b167d61` robot uji-pulih · `09b3605` pengingat Vercel · `700ad2c` dokumen.
**Penjaga Kebocoran Rahasia success** — pemeriksa yang semula akan merah. Kedua platform
**success**: Vercel + Railway. Rincian rilis & rollback: `antrean-deploy.md`.

### Yang berubah — 5 berkas baru, 4 dokumen diperbarui

| Berkas | Isinya |
|---|---|
| `.github/workflows/uji-pulihkan-backup.yml` | robot uji pulih, **manual saja** (nol jadwal) |
| `.github/workflows/pengingat-tutup-vercel.yml` | pengingat 2026-11-26, mingguan, **hapus setelah Vercel ditutup** |
| `scripts/uji-pulihkan-backup.mjs` | 3 pagar + pembanding; dipisah dari workflow supaya **bisa diuji tanpa GitHub** |
| `tests/uji-pulihkan-backup.test.ts` | 19 tes penjaga |
| `docs/pengajuan-domain-sendiri.md` | bahan pengajuan owner → atasan, harga sudah dicek |
| `docs/uji-pulihkan-backup.md` | status "PENDING" → "alatnya siap", rute 2 jadi prosedur konkret |
| `HANDOFF.md` · `antrean-deploy.md` | catatan sesi & status antrean rilis |
| `docs/lintasai/INDEX.md` | 1 entri pelajaran baru (4 hal, termasuk 2 pemeriksa repo yang menolak kerja ini) |

### Pekerjaan #2 — robot uji pulihkan backup

**Yang berubah dari sebelumnya:** dokumen lama bilang *"AI membuatkan workflow
sekali-pakai"* sebagai rencana. Sekarang workflow-nya **ada**, dan tiap
langkahnya sudah dijalankan memakai `psql` + `curl` TIRUAN — **15 skenario,
masing-masing dicek lolos DAN ditolak.**

**Owner tinggal 3 langkah** (±10 menit, sesudah punya Supabase project kosong):
buat project → pasang secret `DATABASE_URL_UJI_PULIH` (**Session pooler**, bukan
Direct connection) → Actions → Run workflow → ketik `DATABASE UJI KOSONG`.

**3 pagar, karena uji seperti ini punya 3 cara untuk "lulus" palsu:**

1. **Tujuan bukan produksi.** Ref project dicocokkan ke connection string; cocok
   = berhenti **sebelum satu perintah pun dijalankan**. Menutup Direct
   connection (ref di host) **dan** Session pooler (ref di nama pengguna).
2. **Database harus kosong.** Semua `insert` di backup berakhiran `on conflict
   do nothing` — di database yang sudah berisi, **nol baris benar-benar masuk**
   tapi `count(*)` tetap cocok dari data LAMA. Hijau tanpa bukti apa pun.
3. **Konfirmasi ketik.** Satu-satunya kasus yang tak bisa dideteksi mesin:
   connection string milik database **lain** yang kebetulan bukan produksi.

**Angka pembandingnya tidak bisa basi.** Robot membaca jumlah baris dari
komentar `-- <tabel>: N baris` di dalam **berkas backup yang sedang diuji**,
bukan dari angka yang dicatat di dokumen. Backup tanggal mana pun tetap terukur
benar tanpa ada yang perlu diperbarui.

🪤 **Dua jebakan yang ketahuan hanya karena dijalankan, bukan dibaca:**

- **`tsc` menolak berkas tes** — `bacaHarapan` terinfer mengembalikan `{}`.
  Diperbaiki di SUMBERNYA (JSDoc `Record<string, number>` di `.mjs`), bukan
  ditambal di tes.
- **Penjaga rahasia repo akan menolak commit-nya.** 8 baris di tes & komentar
  memuat pola `skema://pengguna:sandi@` yang diblokir `secret-guard.yml:55`.
  Diperbaiki dengan **merakit** connection string palsu dari potongan — bukan
  dengan melonggarkan penjaganya (§5.3). Dibuktikan: pola yang sama persis
  dijalankan ulang ke 5 berkas → **nol hit**.

🔴 **Kebocoran yang ditutup sejak awal:** log run repo publik terbaca tanpa
login, dan baris `DETAIL:` PostgreSQL memuat isi baris yang gagal (email + hash
password). Workflow memakai `VERBOSITY=terse` + hanya mencetak baris `ERROR:`.
**Diuji dengan sengaja**: `psql` tiruan memuntahkan `DETAIL:` berisi data
pribadi → yang sampai ke log hanya baris `ERROR:`, `DETAIL:` tidak muncul.

### Pekerjaan #3 — bahan pengajuan domain

`docs/pengajuan-domain-sendiri.md`, ditulis untuk dibaca **atasan owner**
(non-teknis). Harga diverifikasi, bukan dikira-kira: `.com` ±**Rp200.000/tahun**
(Rumahweb Rp195.000 per April 2026 · Niagahoster Rp160-180rb). Isinya: apa yang
hilang tiap kali alamat berubah (3 hal, ketiganya **baru saja dialami**
2026-10-15), apa yang terjadi kalau TIDAK disetujui (jawabannya: tidak ada yang
rusak — dan itu ditulis apa adanya), serta langkah sesudah disetujui.

### Pekerjaan #1 — Vercel: diukur ulang, nol yang perlu dikerjakan

Tanggalnya belum boleh (paling cepat **2026-11-26**). Yang bisa dilakukan hari
ini cuma memastikan sinyal yang memindahkan Google masih benar — **semuanya
masih benar**, diukur dari luar 2026-10-15 malam:

| Yang diukur | Hasil |
|---|---|
| Railway `/api/health` | `{"ok":true,"sumberData":"database"}` |
| Vercel akar `/` | **308** → Railway |
| Vercel `/drama/meg-2-the-trench` | **308** → Railway |
| Vercel `/robots.txt` & `/sitemap.xml` | **308** → Railway (ikut dialihkan) |
| `robots.txt` Railway | menunjuk sitemap Railway |
| Sitemap Railway | **395 URL**, **0** ber-vercel (kemarin 384 — katalog bertambah, wajar) |

### Gerbang §6 — dijalankan utuh, urutan benar

`rm -rf .next` → **build exit 0** → **tsc exit 0** → **100 berkas / 1466 tes
hijau** (naik dari 99/1447 = +1 berkas, +19 tes — persis tes baru hari ini) ·
nol berkas env ter-stage · nol pola nilai rahasia.

### Yang TIDAK dikerjakan, dan kenapa

- **Vercel tidak ditutup** — syarat waktunya belum terpenuhi. Menutup sekarang
  membuang peringkat Google yang belum pindah.
- **Uji pulih tidak dijalankan** — tak ada Supabase project kosong, dan
  membuatnya butuh akun owner.
- **Domain tidak dibeli** — itu keputusan + uang atasan owner.
- ~~Tidak ada yang di-push~~ → **owner memberi izin, DIRILIS `700ad2c`** (lihat atas).

### ✅ DIKERJAKAN atas persetujuan owner: pengingat otomatis untuk 2026-11-26

`.github/workflows/pengingat-tutup-vercel.yml`. Masalah yang ditutup: tanggal
2026-11-26 cuma tercatat di berkas ini — 6.600 baris dan direncanakan dipangkas.
Catatan yang dipangkas = pengingat yang hilang.

**Jalan tiap Senin, bukan sekali tepat di 26 November.** Cron GitHub tak punya
kolom TAHUN (`0 2 26 11 *` berbunyi tiap tahun selamanya) **dan** cuma menembak
sekali — kalau run hari itu gagal, pengingatnya hilang tanpa gejala. Yang dipakai:
jalan mingguan lalu **bandingkan tanggal di dalamnya**. Sebelum ambang ia keluar
diam-diam (nol Issue, nol berisik); sesudahnya membuka Issue. Terlewat satu
minggu masih tertangkap minggu berikutnya.

**Anti-spam:** Issue dicari dengan `state: 'all'`, bukan `'open'`. Judulnya tetap
sama tiap minggu — kalau hanya Issue terbuka yang dicek, Issue yang **sudah
ditutup owner** akan dibuatkan ulang tiap Senin dan pengingat berubah jadi
gangguan. Memakai `listForRepo`, bukan `search` (search punya jeda pengindeksan —
pelajaran dari `audit-access.yml`).

**Nol alamat baru yang bisa basi.** Satu-satunya alamat di berkas itu adalah
`dramaapp.vercel.app` — alamat yang justru mau DITUTUP, jadi ia tidak ikut
berubah saat nanti pindah ke domain sendiri. Alamat tujuannya **dibaca dari
header `Location`**, tidak ditulis. Artinya workflow ini **tidak** perlu masuk
"Daftar nilai cadangan".

**Issue yang dibuatnya bukan sekadar alarm**: memuat hasil ukur keadaan Vercel
saat itu, syarat 2 (cek Google — sengaja TIDAK diukur robot: hasil pencarian
Google tak bisa dibaca andal dari Actions), syarat 3, urutan menutup yang
mengikat, dan daftar centang penutup termasuk **"hapus workflow ini"**.

**Bukti — 7 skenario, 16 pemeriksaan, semua lulus** (skrip dijalankan di luar
GitHub dengan `github`/`core`/`fetch` tiruan dan `Date` disetir):
25 Nov diam → 26 Nov berbunyi · Issue terbuka tak diduplikat · **Issue tertutup
juga tak diduplikat** · Issue lain yang tak terkait tidak mengacaukan ·
pengukuran gagal → Issue tetap dibuat dan ditandai *"tidak terukur"* (bukan
mengarang angka) · Vercel menjawab 200 → statusnya dilaporkan apa adanya.
SHA `actions/github-script` diverifikasi ada di repo action-nya, dan sama dengan
yang sudah dipakai `audit-access.yml`.

🧪 **Diuji LANGSUNG di GitHub sesudah rilis, bukan cuma di harness lokal** — run
`38827828114` (dipicu manual 2026-10-16): **success**, baris log runtime-nya
`Belum waktunya: 2026-10-16 < 2026-11-26. Tidak ada Issue dibuat.`, dan jumlah Issue
repo tetap **4** sesudahnya. Satu run itu membuktikan tiga hal sekaligus: gerbang
tanggalnya memilih jalur yang benar, SHA action-nya sah, dan `permissions`-nya cukup.

⚠️ **Utang teknis yang DISENGAJA: uji 7 skenario itu TIDAK dijadikan tes
permanen.** Skripnya ada di dalam YAML, jadi menjalankannya dari `npm test`
butuh parser YAML yang belum ada di `package.json`. Menambah dependensi untuk
berkas yang umurnya ±6 minggu tidak sepadan. Kalau berkas ini ternyata hidup
lebih lama dari rencana, harness-nya tinggal diangkat jadi tes.

⚠️ Dua batas yang melekat: GitHub **menonaktifkan jadwal** kalau repo tak ada
commit 60 hari (repo ini aktif; kalau sempat sepi → picu manual sekali), dan
robot ini **hanya hidup di repo produksi** — Actions di cermin `ojokesusu/dramaku`
mati karena tagihan.

---

## 2026-10-15 — MIGRASI RAILWAY TUNTAS: Vercel jadi pengalihan, seluruh pagar tertutup, utang video ditutup

✅ **`NEXT_PUBLIC_SITE_URL` SUDAH DIISI & TERBUKTI JALAN (2026-10-15).** Owner
mengisinya di panel Railway; deploy ulang menyala **~60 detik** kemudian.
Terukur sesudah deploy: canonical beranda **`https://dramaapp-production-9e88.up.railway.app`**
· `robots.txt` → sitemap Railway · **0** URL ber-vercel di sitemap (dari 384) ·
384 URL utuh · health ok. Tambahan: halaman detail `/drama/meg-2-the-trench`
canonical + `og:url` ikut pindah (**prerender SSG**, jadi ini membuktikan seluruh
situs dibangun ulang) · **Vercel tidak tersentuh**, masih melayani.

**TITIK LANJUT — tinggal MENUNGGU, nol pekerjaan teknis hari ini.**

✅ **SELURUH PAGAR MIGRASI TERTUTUP 2026-10-15.** Putaran 1, 2, 3 semuanya lolos ·
5 nilai cadangan beres · Vercel mengalihkan 308 ke Railway · keepalive hijau ·
webhook & video di Railway. Sisa: **menunggu ≥6 minggu sebelum Vercel ditutup**
(syarat lengkap di seksi ⏰ di bawah).

### 🔓 TERBUKA KEMBALI karena Putaran 2 lolos: penyegelan 13 variabel Railway

Ini **sengaja ditunda** sampai Putaran 2 lolos — syaratnya kini terpenuhi.
Keputusan lengkapnya di `docs/migrasi-railway-daftar-env.md` seksi "Workspace
Railway & penyegelan variabel".

**Kenapa ini keamanan, bukan kerapian:** workspace Railway `jalurlangit-ops` punya
**±10 Admin** (akun kerja atasan owner, berisi 18 project rekan lain). Dokumentasi
Railway menyatakan *"Workspace admins can access every project"*, dan pembatasan
per-project **tidak bisa menolong** (Access Groups hanya ada di paket Enterprise).
Artinya **saat ini ±10 orang bisa membuka tab Variables DramaKu dan membaca kunci
induk database** (`SUPABASE_SERVICE_ROLE_KEY`). **Sealed Variables** membuatnya
write-only: Railway tetap menyuntikkan nilainya ke aplikasi, tapi tak seorang pun
bisa membacanya lagi — termasuk owner.

⚠️ **PERMANEN & TAK BISA DIBATALKAN.** Nilai masih bisa ditimpa, tapi **tak pernah
bisa dibaca lagi**, dan tak bisa dikembalikan ke mode biasa. Urutannya mengikat:

1. **Salin dulu 13 nilainya ke pengelola password** — sesudah disegel, Railway
   bukan lagi tempat mengambilnya.
2. ⚠️ **Jangan percaya `.env.railway.local` sebagai sumber.** Dua nilai di sana
   sudah BASI: `PLAYLY_WEBHOOK_SECRET` (mitra menggantinya 2026-10-14) dan
   `HARDLINK_AGENT_SECRET` (dibuat ulang 43 karakter saat migrasi PC backup).
   Ambil dari panel Railway yang hidup, selagi masih bisa dibaca.
3. Baru segel.

⏸️ **KEPUTUSAN OWNER 2026-10-15: TUNDA — jangan tawarkan lagi sebelum domain
sendiri dibeli.** Alasannya: owner belum terbiasa dengan Railway, dan menyegel
secara permanen di alat yang belum dikuasai berarti kehilangan kemampuan
memeriksa nilai saat sedang paling butuh. Momen beli domain = titik evaluasi
alami untuk membahasnya lagi.

**Risiko yang TETAP ADA selama ditunda** (bukan untuk menakuti, tapi jangan
sampai hilang dari catatan): ±10 Admin workspace masih bisa membaca
`SUPABASE_SERVICE_ROLE_KEY`. Kalau salah satu akun mereka jebol, database
dramaapp ikut terbuka. Memundurkan penyegelan **tidak memperbesar** risikonya —
tapi juga **tidak mengecilkannya**.

### 💡 Langkah separuh yang AMAN dan bisa dikerjakan kapan saja

**Salin 13 nilai variabel Railway ke pengelola password — tanpa menyegel apa pun.**
Ini langkah 1 dari penyegelan, tapi berdiri sendiri: **nol permanen, nol risiko,
bisa dibatalkan**. Gunanya di luar penyegelan:

- Saat ini sebagian nilai cuma ada di **dua** tempat: panel Railway + berkas
  `.env.railway.local` di satu komputer. Komputer itu rusak + akses Railway
  hilang = nilai itu hilang.
- Kalau nanti jadi menyegel, pekerjaannya tinggal satu langkah, bukan tiga.

⚠️ Jangan menyalin dari `.env.railway.local` — dua nilai di sana **basi**
(`PLAYLY_WEBHOOK_SECRET` diganti mitra 2026-10-14, `HARDLINK_AGENT_SECRET`
dibuat ulang 43 karakter). Ambil dari panel Railway yang hidup.

---

## ⏰ PENGINGAT: MATIKAN `https://dramaapp.vercel.app` — JANGAN SEBELUM SYARATNYA TERPENUHI

**Pengalihan 308 mulai hidup 2026-10-15.** Vercel sekarang cuma penunjuk jalan.

### Kapan boleh ditutup — pakai KRITERIA, bukan sekadar tanggal

Tutup hanya kalau **ketiganya** benar:

1. ⏳ **Sudah lewat ≥6 minggu** sejak 2026-10-15 → paling cepat **2026-11-26**.
2. 🔍 **Google sudah memindahkan alamatnya.** Cari di Google `site:dramaapp-production-9e88.up.railway.app`
   — harus muncul banyak halaman. Lalu cari `site:dramaapp.vercel.app` — harus
   tinggal sedikit/nol. Kalau masih kebalikannya, **tunggu lagi**; menutup
   sekarang membuang peringkat yang belum pindah.
3. ✅ **Daftar "WAJIB sebelum menutup" di bawah sudah dikerjakan semua.**

Kenapa pakai kriteria, bukan tanggal saja: lama perpindahan tergantung seberapa
sering Google merayapi situs ini — tak ada yang bisa menjaminnya dari kalender.

### ✅ SELESAI 2026-10-15 — 5 nilai cadangan sudah TIDAK lagi menunjuk Vercel

Semuanya dulu **gagal senyap**: nol error, nol gejala, baru terasa dari akibatnya.
Kelimanya kini menunjuk `https://dramaapp-production-9e88.up.railway.app`.

| # | Tempat | Yang dicegah |
|---|---|---|
| 1 | `lib/site.ts` `DEFAULT_SITE_URL` | canonical + sitemap + robots mengarahkan Google ke ketiadaan |
| 2 | `.github/workflows/keep-db-awake.yml` `SITES` | robot menyapa situs mati → database bisa tertidur tanpa ada yang tahu |
| 3 | `pc-backup-agent/start-video-services.ps1` `$SITUS_URL` | **paling berbahaya** — agent melapor ke ketiadaan → **seluruh video mati**, indikator tetap hijau |
| 4 | `scripts/e2e-tahap7.mjs` `BASE` | uji diam-diam menguji situs salah → "lulus" yang tak berarti |
| 5 | `KEEPALIVE_SITES` di **kedua** repo GitHub | sama seperti #2. Ini setelan **panel**, bukan repo — `git grep` tak menemukannya |

Plus 2 kosmetik ikut dibereskan: `optimalkan-film.ps1` (pesan ke operator) dan
`gen-supabase-sql.mjs` (komentar di SQL hasil). Komentar di
`start-video-services.ps1:670` yang menyebut alamat Vercel harfiah ditulis ulang
memakai `$SITUS_URL` supaya tak basi lagi saat domain pindah.

**Bukti:** build lokal dijalankan **dengan env sengaja kosong** (= memaksa jalur
cadangan) → canonical `https://dramaapp-production-9e88.up.railway.app` ·
`robots.txt` → sitemap Railway. Gerbang: build **0** · tsc **0** ·
**99 berkas / 1447 tes**.

⚠️ **#3 BELUM hidup di PC backup.** `start-video-services.ps1` dijalankan dari
salinan di PC backup yang **disalin/`git pull` MANUAL**
(`start-dramaapp-web.ps1:21`, `docs/migrasi-railway-pc-backup.md:15`). Mengubah
berkas di repo **tidak** mengubah apa pun di mesin itu — **langkah manusia yang
masih tersisa.** Tidak mendesak: selama env `DRAMAAPP_SITUS_URL` di sana masih
terisi benar (per 2026-10-14 terisi + lulus uji restart), nilai cadangan ini
tak pernah terpakai. Ia jaring pengaman untuk hari ketika env itu hilang.

🪤 **Gerbang menangkap tes saya sendiri.** `tests/site-url-pagar.test.ts`
mematok `"https://dramaapp.vercel.app"` apa adanya, jadi langsung merah begitu
nilai bawaannya dipindah — padahal nol yang rusak. Dibetulkan **bukan** dengan
menukar satu alamat jadi alamat lain (akan pecah lagi saat domain berganti),
melainkan menguji **perilakunya**: hasilnya alamat `https` yang sah DAN bukan
alamat Vercel yang sudah dipensiunkan.
**Aturan: tes yang mematok alamat/versi apa adanya akan jadi beban tiap kali
nilai itu sah berubah — kunci perilakunya, bukan nilainya.**

📌 **Daftar rujukan tunggal** supaya pergantian domain berikutnya tidak jadi
perburuan: `docs/migrasi-railway-tahap6-pindah-domain.md` seksi
**"Daftar nilai cadangan"**. Tiap tempat di atas juga diberi komentar yang
menunjuk ke sana.

### 🔐 Juga saat menutup: BERSIHKAN SECRET DORMAN DI PANEL VERCEL

Project Vercel masih menyimpan env produksi lengkap (`SUPABASE_SERVICE_ROLE_KEY`,
`PLAYLY_ENCRYPTION_KEY`, `AUTH_SECRET`, `ADMIN_PASSWORD`, dst). Sesudah tak
dipakai, itu **permukaan risiko yang menganggur**. Saat menutup: hapus
project-nya, atau minimal kosongkan env-nya.
✅ Sudah diperiksa 2026-10-15: **deployment Vercel yang lama TIDAK bisa dibuka
publik** — diuji, dijawab `302` ke `vercel.com/sso-api` (Deployment Protection
menyala). Jadi tak ada jalan pintas lewat URL deployment lama.

### Cara menutup (urutannya mengikat)

1. Kerjakan 5 butir "WAJIB" di atas → dorong → verifikasi.
2. **Jangan hapus project Vercel langsung.** Matikan dulu dengan membuang
   domain/aliasnya, **amati 1-2 minggu** — kalau ada yang ternyata masih
   memanggilnya, masih bisa dikembalikan.
3. Baru hapus project + secret-nya.

Rollback selama tahap 2: pasang kembali aliasnya.

---

## 🔎 HASIL AUDIT MIGRASI VERCEL → RAILWAY (2026-10-15)

Diperiksa menyeluruh atas permintaan owner. Dibagi: yang **terbukti aman** (jangan
diperiksa ulang, buang waktu), dan yang **masih terbuka**.

### ✅ Sudah diperiksa & AMAN — 9 hal

| Yang diperiksa | Hasil |
|---|---|
| Paket khusus Vercel (`@vercel/*`) | **nol** → kode tak bergantung platform Vercel |
| `vercel.json` | hanya `redirects` — nol cron, nol functions |
| Workflow backup (`backup-dramaapp` / `backup-schemas`) | kata "dramaapp" di sana = **nama schema database**, bukan alamat situs → **tak terpengaruh** penutupan Vercel |
| Supabase Auth | **tidak dipakai** (auth sendiri) → nol daftar "Redirect URL" yang perlu diubah |
| Pengiriman email | **nol** → tak ada tautan lama tertanam di email penonton |
| Iklan sponsor ber-link Vercel | ada di backup lama, tapi database hidup menjawab `{"ads":[]}` → **tidak ada** |
| `DASHBOARD_API_URL` | dipanggil **server-side** (nol berkas `"use client"`) → CORS tak relevan |
| Deployment Vercel lama | terlindungi SSO (`302` ke login) → tak bisa dibuka publik |
| Webhook Playly · video PC backup · keepalive | ketiganya di Railway & **terbukti jalan** |

### ✅ SELESAI 2026-10-15 — "Ubuntu 26 dalam 3 hari" DIUJI, ternyata TIDAK merusak

Dikerjakan dengan **mengukur dulu**, bukan menambal karena takut tenggat.

**1. Ubuntu 26 diuji sungguhan — AMAN, jadi `runs-on: ubuntu-latest` SENGAJA
TIDAK diubah.** Label `ubuntu-26.04` ternyata **sudah tersedia hari ini**, jadi
masa depan bisa diuji sekarang. Dijalankan di branch `ci/uji-ubuntu-26`:

| Uji | Hasil |
|---|---|
| `keep-db-awake` di `ubuntu-26.04` | **success** (log: `Image: ubuntu-26.04`) |
| `backup-dramaapp` di `ubuntu-26.04` | **success**, 125 baris, tiap tabel cocok hitungan server |
| **Kombinasi sebenarnya**: action baru **+** `ubuntu-26.04` | **success** · Node **24.21.0** · `✓ terunggah` · `✓ terbukti ada di bucket (126.124 byte)` · **ANNOTATIONS KOSONG** |

🪤 **Jebakan yang hampir menipu:** run pertama dengan action baru melaporkan
`Image: ubuntu-24.04` — karena `ubuntu-latest` **belum** pindah (baru 19 Okt).
Jadi yang terbukti baru "action baru di Ubuntu 24", **bukan** keadaan masa depan.
Wajib diuji sebagai **kombinasi**, dengan `ubuntu-26.04` ditulis eksplisit.

**Kenapa `ubuntu-latest` dibiarkan:** sudah terbukti jalan di Ubuntu 26, jadi
mem-pin berarti menambah pekerjaan rawat selamanya tanpa manfaat terukur.
❓ Batas jujur: image Ubuntu 26 pada 19 Okt bisa sedikit berbeda dari yang diuji
hari ini — ini bukti kuat, bukan jaminan.

**2. Peringatan "Node 20" DICABUT — dan catatan lama saya KELIRU soal ini.**
Catatan sebelumnya menulis *"`node-version: '20'` layak dinaikkan ke 22"*. Itu
**mencampur dua hal berbeda**. Pesan asli GitHub dari run sungguhan:

> *"Node.js 20 is deprecated. The following actions target Node.js 20 but are
> being **forced to run on Node.js 24**: actions/checkout, actions/setup-node"*

Yang dimaksud GitHub = **Node yang menjalankan ACTION-nya**, bukan Node untuk
script kita. Perbaikannya menaikkan versi action-nya, bukan `node-version`.
Keduanya tetap dikerjakan (lihat di bawah), tapi sebabnya beda.

**3. Yang diubah — 10 baris, semua dipin SHA:**

| Action | Dari | Ke |
|---|---|---|
| `actions/checkout` | v4 | **v7.0.1** (node24) |
| `actions/setup-node` | v4 | **v7.1.0** (node24) |
| `actions/github-script` | v7 | **v9.0.0** (node24) |
| `actions/upload-artifact` | v4 | **v7.0.2** (node24) |
| `node-version` (script kita) | `'20'` | **`'24'`** |

`node-version` dinaikkan karena **Node 20 sudah EOL sejak April 2026** — tak
dapat tambalan keamanan lagi — dan komputer owner sendiri jalan Node 24
(menyamakan dev & CI). `keep-db-awake.yml` **tidak** ikut berubah: ia tak memakai
action sama sekali.

**4. Cakupan uji — jujur apa yang BELUM terbukti:**

| Action | Dibuktikan di |
|---|---|
| `checkout@v7` | ✅ `backup-dramaapp` **dan** `secret-guard` (3 run, semua success) |
| `setup-node@v7` + Node 24 | ✅ `backup-dramaapp` (log: `node/24.21.0`) |
| `github-script@v9` | ✅ `audit-access` — jumlah Issue **4 → 4**, nol duplikat → API pencarian memang jalan di v9 |
| `upload-artifact@v7` | ❌ **BELUM diuji** — hanya dipakai `backup-schemas.yml`, yang jadwalnya memang sudah dimatikan dan gagal lebih dulu di langkah `pg_dump`. Risiko mendekati nol (tak akan jalan kecuali ada yang menyalakannya), tapi **jangan diklaim terbukti** |
| `ai-review.yml` | ❌ tak bisa dijalankan manual (hanya saat PR) — tapi **kedua action di dalamnya sudah terbukti** di workflow lain |

### ✅ SELESAI 2026-10-15 — tumpukan 4 Issue cek-akses dibereskan + robotnya disetel ulang

**Akar masalahnya: tugasnya MUSTAHIL, bukan kelalaian.** Pengingat itu menyuruh
membandingkan akses dengan `lintasai-portfolio.yml` dan membuka
`docs/ACCESS_CONTROL_NREPO.md`. Dicari di seluruh repo termasuk folder kit:
**keduanya tidak pernah ada** — satu-satunya tempat nama itu disebut adalah
workflow pengingatnya sendiri. Jadi 4 bulan (Juli–Oktober) robot membuka tugas
yang tak bisa diselesaikan siapa pun.

> 🪤 **Pelajaran: pengingat yang menyuruh membuka berkas tak-ada akan SELALU jadi
> tumpukan. Periksa rujukannya masih hidup sebelum menyalahkan orangnya.**

**Cek-akses sungguhan DIJALANKAN** (baca-saja, nol akses dicabut), hasilnya
ditulis di Issue #4 lalu keempat Issue ditutup. **Peta aksesnya sekarang punya
rumah: `docs/akses-dan-kepemilikan.md`** — dibuat dari audit nyata, isinya NAMA
saja (nol nilai secret), lengkap dengan 6 perintah salin-tempel untuk mengulang.

**Robot disetel ulang (`0454ff9`)** — 2 perubahan perilaku, diuji sungguhan
(run `38673774585`): isi Issue menunjuk berkas yang **benar-benar ada** · dan ia
**menutup sendiri** pengingat bulan lain yang menggantung. Bukti: #1 #2 #3
tertutup dengan komentar penunjuk, #4 dipertahankan, nol duplikat.
Juga: dipakai `issues.listForRepo` **bukan `search`** (search punya jeda
pengindeksan + kuota — versi lama sampai perlu menelan error-nya). Izin tetap
minimum `issues: write`, dan robot **tetap tidak pernah mencabut akses siapa pun**.

### 🔎 Temuan audit akses — 5 hal, lengkapnya di `docs/akses-dan-kepemilikan.md` §5

| | Temuan |
|---|---|
| ❓ | **`ojokesusu` ternyata ORGANISASI, bukan orang.** Pemilik/anggota org otomatis bisa mengakses repo di dalamnya **tanpa muncul di daftar collaborator**, dan daftar anggotanya tak terbaca token owner. Jadi *"siapa saja yang bisa melihat seluruh kode kita?"* **BELUM terjawab penuh** — hanya pemilik org yang bisa menjawab |
| ✅ | ~~Remote `official` 404~~ — **SUDAH DIHAPUS 2026-10-15** atas izin owner. Diperiksa dulu: **nol ref** pernah tertarik → nol data hilang. Sesudahnya `git fetch --all` **exit 0** (sebelumnya selalu error sejak 2026-09-02), dual push utuh. Yang dihapus **hanya catatan alamat di komputer owner, bukan repo di GitHub**. Pembalikan: `git remote add official https://github.com/projectraden/backup-dramaapp.git` |
| 🔵 | **`ai-review.yml` DIPUTUSKAN TETAP DIPAKAI** (tidak dihapus). Koreksi atas penilaian AI sebelumnya: ia **gagal KERAS, bukan diam-diam** — `.github/scripts/ai-review.cjs:53` melempar `ANTHROPIC_API_KEY tidak diset` lalu `exit 1`, jadi muncul silang merah di PR dengan pesan jelas. Ongkos menyimpannya nol (hanya menyala saat ada PR ke `main` dari repo yang sama — tak pernah terjadi). ❓ Kalau suatu saat dinyalakan: `ai-review.cjs:26` masih memakai model `claude-opus-4-8` yang sudah ketinggalan |
| ⚠️ | **`ai-review.yml` tak bisa bekerja** — `ANTHROPIC_API_KEY` tidak ada, dan belum pernah jalan sekali pun. ~~Kepercayaan palsu~~ → **dikoreksi**, lihat baris 🔵 di bawah: ia gagal KERAS, bukan diam-diam. Keputusan owner 2026-10-15: **tetap dipakai, jangan dihapus** |
| ⚠️ | **Repo cermin nol secret** — jadi robotnya tetap mandul walau tagihan rekan dibayar |
| 🔵 | **Repo produksi PUBLIK** (diketahui & disengaja). Secret aman di GitHub Secrets, tapi `HANDOFF.md` kini memuat banyak detail operasional yang **bisa dibaca siapa saja** |

Akses repo sendiri **bersih**: produksi cuma `masradenbagus89-ui` (admin), nol
undangan tertunda, nol deploy key. Cermin: `yusufscorpio` + owner, keduanya
`maintain`.

### ~~🔴 MENDESAK — tak ada hubungannya dengan migrasi, tapi jatuh tempo 3 HARI LAGI~~ (SUDAH DIKERJAKAN, lihat di atas)

**`ubuntu-latest` pindah ke Ubuntu 26 pada 19 Oktober 2026.** Mengenai
**SEMUA 6 workflow** repo ini — termasuk **backup harian** yang baru berhasil
dijalankan 2026-10-14 setelah perjuangan panjang. Kalau ada yang pecah, backup
berhenti **diam-diam**.
Juga: **Node 20 sudah deprecated** di Actions — dipakai `ai-review.yml` dan
`backup-dramaapp.yml` (`node-version: '20'`), layak dinaikkan ke 22.

⚠️ Ini **bukan** akibat migrasi. Ia hanya kebetulan jatuh tempo di minggu yang
sama, dan risikonya lebih besar daripada sisa pekerjaan migrasi mana pun.

### ⏸️ Tertunda dari SEBELUM migrasi (bukan akibat migrasi)

1. ✅ **Putaran 2 (login admin) LOLOS 2026-10-15** — pagar terakhir migrasi
   tertutup. Diuji owner di **jendela incognito** (penting: incognito tak membawa
   sesi lama, jadi ini login dari NOL di Railway, bukan sesi sisa dari Vercel) di
   alamat `dramaapp-production-9e88.up.railway.app/admin/videos/playly`:
   masuk sebagai "Mas radenbagus89" · **Admin → Videos → Playly terisi 339 video**.
   Dicocokkan dengan sumber terpisah: sitemap Railway hidup memuat **339** halaman
   `/tonton/` — **angka identik**, jadi panel itu membaca data produksi sungguhan.
   Dua butir lain sudah lolos sebelumnya: kartu status katalog (dibuktikan Putaran
   3) dan Webhooks Playly (`401` bukan `503`).
2. **Uji pulihkan backup** pending — butuh satu Supabase project kosong. Sampai
   itu dikerjakan, kalimat jujurnya "ada berkas backup yang konsisten", **bukan**
   "punya backup yang terbukti pulih" (`docs/uji-pulihkan-backup.md`).
3. ✅ **`ReleaseMutex` DIPERBAIKI 2026-10-15** — seluruh sisa script dibungkus
   `try { ... } finally { ReleaseMutex }`, 44 baris ditambah, **0 dihapus**,
   indentasi isi sengaja tak diubah supaya perbaikan sekecil ini tak tenggelam
   saat ditinjau. Satu blok `finally` menutup **ketujuh** titik `exit` sekaligus;
   menambah `ReleaseMutex` satu per satu berarti 8+ tempat dan satu terlewat =
   bug kembali.
   **Dua anggapan diuji langsung, bukan diasumsikan:** (a) `finally` tetap jalan
   walau script memanggil `exit` → **terbukti**; (b) kuncinya benar-benar dilepas
   → diuji dari **proses terpisah** (meniru tugas terjadwal): versi **lama**
   menjawab `TERKUNCI`, versi **baru** menjawab `BISA`. **Ujinya MEMBEDAKAN.**
   🪤 Uji pertama saya **gagal membuktikan apa pun** — ia memeriksa dari thread
   yang sama, dan kunci Windows bersifat **re-entrant per-thread** sehingga
   pemegangnya selalu bisa "mengambil" lagi. Keduanya lolos, jadi ujinya tautologi.
   **Aturan: uji kunci/lock WAJIB dari proses lain — dari proses yang sama,
   hasilnya selalu hijau dan tak membuktikan apa pun.**
   ✅ **SUDAH HIDUP DI PC BACKUP 2026-10-15** — dipasang owner, terbukti dari
   log mesin itu sendiri, bukan dari klaim.

   **Cara memasangnya (berguna untuk perubahan script berikutnya):** PC backup
   **TIDAK punya folder repo** — hanya `C:\Users\USER\pc-backup-agent\`, jadi
   `git pull` bukan pilihan. Diperiksa dulu bahwa salinan hidupnya belum pernah
   disunting (`$AGENT_DIR`, `$VIDEO_ROOT`, `$NAMED_URL` ketiganya identik dengan
   repo; selisih ukuran cuma **3 byte** = penanda BOM). Lalu: cadangkan ke
   `cadangan\` → unduh dari **raw.githubusercontent** pada commit yang dipatok →
   **cocokkan SHA-256** → baru timpa. Sidik jari `7858944`:
   `DF2939FE6EE0976BB04726127009B9F196E34A07015C7DE77544992699C53C1A`.
   ⚠️ Nama akun di PC backup memang **persis `USER`** — `C:\Users\USER\...` di
   script itu alamat sungguhan, bukan placeholder yang perlu disesuaikan.

   **BUKTI dari log PC backup — tiga hal sekaligus:**
   | | |
   |---|---|
   | Perbaikan hidup | baris **`kunci dilepas`** muncul di run 13:57:25, dan **TIDAK ADA** di run 13:50:08 (versi lama) → log mesin itu sendiri yang membedakan |
   | Jalur boot bekerja | `user: DESKTOP-8QD3L2G$` — akhiran `$` = **akun komputer (SYSTEM)**, jadi Task Scheduler yang menjalankan, bukan manusia |
   | Rantai pemulihan utuh | restart mematikan tunnel lama → script membuat tunnel BARU `ment-subjects-ultram-votes` → melaporkannya ke situs → menguji sendiri. **Persis skenario yang dulu akan gagal** kalau kunci tersangkut |

   **Diverifikasi ulang dari LUAR** (bukan dari log script): situs menjawab `307`
   ke alamat tunnel baru, diikuti sampai ujung → **`206` · `video/mp4` · 1024
   byte sungguhan**.
4. **Beli domain** menunggu persetujuan atasan owner — **bukan** blocker.
5. **Mitra Playly** minta dikabari kalau domain penonton berubah. Belum perlu
   sekarang (alamat webhook tidak berubah), tapi **wajib** saat domain dipasang.

### ✅ LANGKAH 4 SELESAI — `KEEPALIVE_SITES` diganti & TERBUKTI

Dikerjakan AI lewat `gh` API atas permintaan owner. Nilai lama → baru:

```
https://dramaapp.vercel.app,https://dramaapp-production-9e88.up.railway.app
    ↓
https://dramaapp-production-9e88.up.railway.app
```

Isinya ternyata memuat **dua** alamat, bukan cuma Vercel — jadi database memang
sudah disapa lewat Railway juga, dan membuang Vercel tak membuatnya kehilangan
penyapa. **Dibuktikan dengan menjalankan robotnya sungguhan** (run `38666826653`):
`success` · `Alamat yang akan disapa: 1` · `HTTP 200`. Dijalankan **sekali lagi
SESUDAH** pengalihan hidup (run `38667529441`): tetap `success`.

⚠️ Jebakannya tetap berlaku untuk siapa pun yang menyentuhnya lagi:
`keep-db-awake.yml:65` berbunyi
`${{ vars.KEEPALIVE_SITES || 'https://dramaapp.vercel.app' }}` — **kolom kosong =
robot jatuh balik ke alamat Vercel**, tanpa gejala. **Ganti isinya, jangan
dikosongkan.**

### ✅ LANGKAH 5 SELESAI — Vercel sekarang MENGALIHKAN (308) ke Railway

Dirilis `254d47d`, diperbaiki `982a98a`. Vercel **tidak dimatikan** — ia jadi
penunjuk jalan, supaya bookmark, link yang pernah dibagikan, dan peringkat Google
tidak putus mendadak.

Smoke test penuh, semuanya lolos: 10 path di Vercel (`/` · `/?x=1` · `/beranda` ·
`/film` · `/shorts` · `/discover` · `/drama/meg-2-the-trench` · `/robots.txt` ·
`/sitemap.xml` · `/api/dramas`) **semua 308** · diikuti sampai tujuan = **1
lompatan, 200**, path & query terbawa utuh · Railway **tidak ikut teralihkan**
(200 OK, canonical miliknya sendiri) · keepalive tetap hijau.

### 🔴 TEMUAN: `/:path*` TIDAK mencocokkan akar `/` — lubang di contoh RESMI Vercel

Rilis pertama (`254d47d`) memakai `/:path*` saja, persis contoh dokumentasi
Vercel. Hasilnya **semua path dialihkan KECUALI akar** — halaman yang paling
banyak dibuka dan paling penting bagi Google justru satu-satunya yang lolos
(`/` dan `/?x=1` menjawab **200**, sisanya 308). Sebabnya path-to-regexp:
`/:path*` butuh **minimal satu segmen**, dan akar tak punya segmen.

Diperbaiki `982a98a` dengan aturan eksplisit `"source": "/"` yang ditaruh **lebih
dulu** (Vercel menilai berurutan).

🪤 **Pelajaran:** build **hijau**, status deploy **success**, konfigurasi **sama
persis dengan contoh resmi** — ketiganya **tidak** menangkap lubang ini. Yang
menangkapnya **smoke test per-path**. Memeriksa bahwa langkahnya sudah dijalankan
≠ memeriksa hasilnya.

🔴 **KOREKSI ISTILAH: yang benar 308, bukan 301.** Catatan-catatan sebelumnya di
repo ini (AI yang menulis, berulang kali) menyebut "301". Dari dokumentasi Vercel:
*"301 Moved Permanently: Cached by client, the method **may or may not be changed
to GET**"* — 301 boleh mengubah POST jadi GET, dan situs ini punya endpoint
webhook. Vercel menganjurkan *"307 or 308 ... necessary when your application needs
to redirect a public API"*. `permanent: true` = **308**. Project ini sudah memakai
pola yang sama di `next.config.ts:52`.

⚠️ **Dipakai `vercel.json`, BUKAN `next.config.ts`** — walau dokumentasi Vercel
menganjurkan `next.config.js` untuk project Next.js. Sebabnya: `next.config.ts`
dibaca **Railway juga**, dan satu salah ketik di syarat host membuat Railway
mengalihkan ke dirinya sendiri = **loop tak berujung, situs mati**. `vercel.json`
tak pernah dibaca Railway. Rincian + smoke test + rollback:
`docs/migrasi-railway-tahap6-pindah-domain.md`.

🟡 **KENAPA JANGAN DITUNDA:** sekarang **dua situs sama-sama mengaku "akulah yang
asli"** dengan isi identik — di mata Google itu **duplicate content**. Keadaan ini
tak terhindarkan (urutan lain lebih buruk), tapi hitungannya **hari, bukan
minggu**. Kalimat "tunggu beberapa minggu" berlaku **sesudah** 301 terpasang —
yaitu sebelum Vercel dimatikan total, bukan sebelum 301 dipasang.

### 🔴 TEMUAN TERPISAH: GitHub Actions di repo CERMIN `ojokesusu/dramaku` MATI

Ketahuan saat memeriksa `KEEPALIVE_SITES`. Robot keepalive di repo cermin
**gagal di SETIAP run** (13 & 14 Oktober, terjadwal). Sebabnya **bukan**
konfigurasi kita — pesan GitHub:

> *"The job was not started because recent account payments have failed or your
> spending limit needs to be increased."*

Artinya job-nya **tak pernah mulai**. Enam workflow di sana berstatus `active`
tapi praktis mati — termasuk **`Penjaga Kebocoran Rahasia`** dan
**`Backup DramaApp Harian`**.

**Tidak mendesak**, karena yang menjaga produksi adalah repo owner
(`masradenbagus89-ui/dramaapp`) dan di sana semuanya hijau — backup harian
terbukti jalan, secret guard terbukti jalan di tiap push hari ini. Tapi: **jangan
mengandalkan robot apa pun di repo cermin**, dan kalau rekan mengira backup-nya
jalan di sana, dia keliru. Perbaikannya ada di akun rekan (Billing & plans), di
luar jangkauan owner.

### 🪤 DITEMUKAN SAAT AUDIT: satu tes penjaga enkripsi memang FLAKY — sudah diperbaiki

`tests/playly.test.ts` — *"data yang diubah orang di database → ditolak"* merah
sendiri saat audit, **dengan nol kode berubah**. Bukan kebetulan: cacat di tesnya.

Cara lama menimpa **2 huruf terakhir** hasil enkripsi dengan `"AA"` untuk
berpura-pura jadi data yang diutak-atik orang. Tapi kalau hasil enkripsi
**kebetulan sudah berakhir `"AA"`** (IV-nya acak, jadi tiap run beda), teks
"diutak-atik" itu **identik dengan aslinya** → dekripsi wajar berhasil → tes
merah padahal tak ada yang rusak.

**Diukur, bukan diteorikan:** 200.000 percobaan → **31 kali** berakhir `"AA"` =
**1 dari ~6.452 run**. Cukup jarang untuk tak pernah disadari, cukup sering untuk
muncul di CI sesekali.

Diperbaiki: huruf terakhir **diganti dengan yang pasti berbeda**, plus satu baris
pagar `expect(isiDiutak).not.toBe(teracak)` supaya kalau cara mengutak-atiknya
suatu saat jadi tak mengubah apa pun, yang merah adalah **pagar itu** — bukan
diam-diam lolos. Cara baru diuji 200.000 percobaan: **0 gagal palsu**.

**Kenapa ini penting, bukan sekadar rapi:** tes itu menjaga **deteksi data
terenkripsi yang diutak-atik orang** — kalau orang mengabaikannya karena "ah,
suka merah sendiri", kerusakan sungguhan ikut terabaikan. Dan catatan di bawah
("ambruk total itu flake, jangan panik") memperbesar risiko itu, jadi
membiarkannya justru berbahaya.

### ⚠️ `npm test` pernah ambruk TOTAL sekali lalu hijau lagi — ini FLAKE, bukan kode

2026-10-15 sore, dengan **nol kode berubah**, satu run `npm test` keluar
**"99 berkas GAGAL semua / no tests"** — seluruh berkas gagal dimuat, nol tes
sempat jalan. Dua run berikutnya **99 berkas / 1447 tes hijau**, dan satu berkas
yang diuji sendirian juga hijau. Jadi kodenya tidak pernah rusak.

Gejala run yang ambruk: `transform 82,99s` (normalnya ~47s) dan `import 0ms` —
pola beban/lock, bukan pola error kode. ❓ **Sebabnya belum dipastikan** — dugaan
paling masuk akal: rebutan sumber daya di Windows tepat sesudah `npm run build`
berat (file handle / pemindai antivirus). **Tidak diklaim terdiagnosa.**

**Yang harus dilakukan kalau kambuh: JANGAN langsung simpulkan kode rusak, dan
jangan "memperbaiki" apa pun.** Jalankan ulang sekali; kalau hijau, itu flake.
Kalau merah lagi **dengan pesan error yang nyata** (bukan "no tests"), barulah itu
masalah sungguhan.

✅ **Mitra Playly TIDAK disentuh.** Webhook mereka sudah menunjuk alamat Railway
ini sejak 2026-10-14, jadi tak ada alamat baru untuk dikabarkan: nol pesan, nol
secret baru, nol jeda.

### 🔴 KOREKSI OWNER atas rekomendasi AI — jangan diulang

Pagi ini AI merekomendasikan **"beli domain dulu"** dan menjadikannya **blocker**
penutupan Vercel. Owner membantah: *"dulu pakai vercel meski belum beli domain
tetap bisa jalan kenapa sekarang tidak"* — **dan dia benar.**

1. `dramaapp.vercel.app` **juga** subdomain gratis platform. Situs ini sudah
   setahun hidup di alamat platform tanpa domain beli. Jadi nasihat "jangan
   biarkan Google mengindeks subdomain platform" datang **setahun terlambat**, dan
   dipakai untuk menahan tujuan owner sendiri (cuma mau 1 hosting).
   **Aturan yang diambil: sebelum menjadikan sesuatu BLOCKER, cek apakah keadaan
   yang mau dicegah SUDAH berjalan lama tanpa masalah di project ini. Kalau sudah,
   itu preferensi — dan preferensi AI tak boleh menahan tujuan owner.**
2. Hitungan "ongkos SEO dibayar dua kali" **keliru**. Jumlah pindah alamat SAMA
   (2×) di kedua jalur, karena Vercel→Railway memang tak terhindarkan. Yang
   berbeda justru **jumlah putaran mitra Playly**. Owner yang menemukan ini,
   dengan bertanya *"kalau ganti nama nanti mitra playly perlu ubah alamat lagi
   tidak"*:

| | Ganti nama alamat Railway | **Dipilih: pakai apa adanya** |
|---|---|---|
| Pindah alamat (ongkos SEO) | 2× | 2× — **sama** |
| **Mitra Playly diubah** | **2×** | **1×**, nanti, langsung ke alamat final |
| Biaya | 0 | 0 |

⏸️ **Beli domain menunggu persetujuan atasan owner** — bukan ditolak, dan **bukan
prasyarat**. Saat disetujui: pasang domain di Railway → ubah variabel → **baru**
kirim Pesan 2 ke mitra, sekali.

💡 **Temuan teknis yang ikut lahir (berguna nanti, terverifikasi di docs CLI resmi
Railway):** alamat `*.up.railway.app` **bisa diganti namanya, gratis** —
`railway domain update <lama>.up.railway.app --domain <baru>`; `railway domain`
disebut *"generates a free `*.up.railway.app` domain"*. Jadi alamat rapi setara
`dramaapp.vercel.app` (mis. `dramaku.up.railway.app`) **tak perlu uang**. Tidak
dipakai sekarang semata karena memaksa satu putaran mitra tambahan. Kalau atasan
ternyata TIDAK menyetujui beli domain, ini layak dipertimbangkan lagi.

✅ **DIRILIS `e9b0714`** (+ `10ed638`, satu baris kriteria sitemap) — **dual push
tuntas** `bce81bc..e9b0714..10ed638`, fast-forward, **nol paksaan**. Ketiganya
(lokal, `origin/main`, `dramaku/main`) duduk di `10ed638`. 10 berkas: 7 dokumen +
`lib/site.ts` + 2 berkas baru. Nol migrasi SQL, nol env baru, **nol yang dilihat
penonton**.

**Gerbang §6 dijalankan utuh dari nol, urutan benar** (`rm -rf .next` → build
**exit 0** → tsc **exit 0** → **99 berkas / 1447 tes hijau**, naik dari 98/1436 =
tepat +1 berkas & +11 tes) · nol berkas env ter-stage · nol pola nilai rahasia di
seluruh diff.

**Bukti TAYANG — status build dari GitHub, bukan tebakan:** commit `e9b0714`
dilaporkan **`success` oleh KEDUA platform** — `Vercel` dan
`ravishing-adaptation - dramaapp` (nama project Railway) — plus check
`Penjaga Kebocoran Rahasia` **success**. `10ed638` menyusul **success** di kedua
platform juga. Ini bukti yang penting di rilis ini: kalau pagar baru menolak nilai
yang ada di salah satu panel, build-nya yang akan merah. Sesudah deploy, keduanya
diukur ulang: `/api/health` **ok** di dua situs, canonical & `robots.txt`
**identik** seperti sebelum rilis.

🪤 **Catatan ukuran yang layak diingat:** sitemap terukur **377 URL pagi** dan
**384 URL sore** di hari yang sama **tanpa satu pun deploy di antaranya** — tiap
film baru dari webhook Playly menambah URL. Jadi jumlah URL yang berbeda dari
catatan **bukan** tanda gagal; yang berbahaya adalah angka yang **jatuh drastis**.
Kriteria lulus di prosedur sudah dibetulkan (`10ed638`) supaya tak memicu alarm
palsu di momen paling delicate migrasi.

**Rollback 1-baris:** `git revert --no-edit e9b0714 && git push origin main && git push dramaku main`.

> 🔴 **SEKSI DI BAWAH SUDAH DIBATALKAN — dikoreksi owner sore 2026-10-15.**
> Disimpan sebagai riwayat penalaran yang salah, **bukan** instruksi. Yang berlaku
> ada di seksi KOREKSI OWNER di entri teratas: isi `NEXT_PUBLIC_SITE_URL` dengan
> alamat Railway, **beli domain BUKAN blocker**. Jangan kerjakan apa pun dari
> paragraf-paragraf di bawah ini.

~~**Keputusan owner 2026-10-15 (pagi, DIBATALKAN): beli domain sendiri dulu.**~~
`NEXT_PUBLIC_SITE_URL`
di Railway **dibiarkan KOSONG** sampai domain itu aktif & menunjuk Railway. Ini
**keadaan aman, bukan pekerjaan tertunda** — jangan diperlakukan sebagai blocker
yang harus dicoret buru-buru.

**Dua pilihan yang (pagi itu) DITOLAK — penilaian ini sendiri sudah dikoreksi:** (a) isi alamat
`dramaapp-production-9e88.up.railway.app` sekarang lalu pindah lagi nanti → ongkos
SEO dibayar DUA KALI (Google mengindeks alamat panjang itu, lalu seluruh pemindahan
canonical + 301 diulang dari nol); (b) pakai alamat `railway.app` permanen →
alamat penonton tak bisa diingat **dan** terikat ke Railway (pindah hosting lagi =
ganti alamat penonton lagi).

📄 **Prosedur lengkapnya sudah ditulis: `docs/migrasi-railway-tahap6-pindah-domain.md`**
— 7 langkah berurutan + siapa pengerjanya, 5 perintah verifikasi dengan kriteria
lulus berangka, dan cara rollback (hapus variabel → deploy ulang, nol commit).

### 🔴 Temuan 1: urutan di daftar periksa lama SALAH dan berbahaya

`docs/migrasi-railway-pesan-ke-playly.md` menaruh **"matikan situs lama" SEBELUM
mengisi `NEXT_PUBLIC_SITE_URL`**. Kalau diikuti: Railway bilang "yang asli itu
Vercel", sedangkan Vercel sudah mengalihkan 301 ke Railway → **dua sinyal
bertabrakan**, Google menganggapnya kesalahan dan bisa menjatuhkan halaman dari
hasil pencarian. **Nol pesan error, nol gejala di layar** — ketahuan
berminggu-minggu kemudian dari trafik yang turun. Sudah **dibetulkan** + diberi
peringatan kenapa.

⛔ **Aturan tetap: isi variabel DULU → verifikasi → baru 301 → 301 hidup beberapa
minggu → baru Vercel dimatikan.**

### 🔴 Temuan 2: sebab "wajib deploy ulang" selama ini salah dicatat

Catatan lama (termasuk baris di berkas INI) menulis *"`NEXT_PUBLIC_*` dipanggang
saat BUILD"*. Kesimpulannya benar, **sebabnya salah**. Diukur di hasil build
sungguhan: potongan kode **server** masih membaca `process.env` saat request. Yang
membekukan adalah **prerender statis** — 16 halaman dicetak jadi berkas HTML saat
build dengan alamatnya sudah jadi teks mati (`.next/server/app/index.html`,
`robots.txt`).

**Kenapa ini penting:** kalau nanti ada yang mengusulkan "ganti saja nama
variabelnya supaya tak dipanggang" — **itu TIDAK akan menolong.** Yang menolong
hanya build baru. Pengecualian: `sitemap.xml` punya `revalidate = 3600`
(`app/sitemap.ts:8`) → menyegarkan diri ≤1 jam tanpa deploy.

### 🪤 Temuan 3: jebakan senyap di `lib/site.ts` → PAGAR DIPASANG (atas persetujuan owner)

Variabel hilang / salah ketik → kode **tidak error**, ia jatuh ke nilai bawaan
`https://dramaapp.vercel.app`. Sesudah Vercel pensiun itu berarti canonical
menunjuk alamat **mati**, tanpa satu pun gejala.

✅ **Setengahnya sudah ditutup.** Fungsi `periksaAlamatSitus` di `lib/site.ts`
**mengikuti pola `periksaSetelanSupabase` (`lib/supabase.ts:50`)** — nol mekanisme
baru. Nilai yang **diisi tapi rusak** menggagalkan build dengan pesan yang menyebut
nama variabelnya, menggantikan `Invalid URL` buntu dari `new URL()` di
`app/layout.tsx:23` (jadi ini **bukan** gerbang baru — kegagalannya sudah ada,
pesannya saja yang dulu tak berguna).

**Diuji 6 kondisi env di proses terpisah, dan pagarnya TERBUKTI MEMBEDAKAN
(4 lolos, 2 ditolak)** — bukan sekadar hijau:

| Nilai env | Hasil |
|---|---|
| kosong (keadaan Railway & Vercel sekarang) | LOLOS → `https://dramaapp.vercel.app` |
| blank/spasi (variabel dibuat tapi dibiarkan kosong) | LOLOS → nilai bawaan |
| `https://dramaku.com/` | LOLOS → `https://dramaku.com` (miring dibuang) |
| `http://localhost:3000` (`next dev`) | LOLOS |
| `dramaku.com` (lupa `https://`) | **DITOLAK** |
| `http://dramaku.com` | **DITOLAK** |

**Yang sengaja MASIH terbuka:** nilai **kosong** tidak diperingatkan. Kosong memang
BENAR selama Tahap 2-5, dan pagar yang berbunyi di tiap build hari ini akan berhenti
dibaca orang sebelum migrasi sungguhan — penyakit `KEEPALIVE_SITES`. Dan alamat yang
**bentuknya sah tapi salah situs** tak bisa ketahuan dari dalam kode. Keduanya
ditutup oleh verifikasi `curl` di langkah 3 prosedur, yang karena itu **wajib**.

🪤 **`tsc` menangkap bug di tes saya sendiri:** versi pertama memakai
`import("../lib/site?rusak")` — jalan di vitest (vite mengerti query) tapi
`TS2307` di typecheck. Tes yang tak lolos typecheck = tes rusak; dibetulkan ke
`vi.resetModules()`. **Catatan: gerbang menangkapnya, bukan mata saya.**

### ✏️ Koreksi catatan yang keliru

`docs/migrasi-railway-daftar-env.md` (aturan 3) menulis *"tombol Bagikan di situs uji
akan menampilkan alamat vercel"*. **Salah.** `app/components/ShareButton.tsx:32` memakai
`window.location.href` = alamat yang sedang dibuka penonton; tombol Bagikan tidak
menyentuh variabel ini sama sekali. Sudah dibetulkan.

### Keadaan terukur 2026-10-15 (diukur dari luar, bukan dari catatan)

| Yang diperiksa | Hasil |
|---|---|
| `/api/health` Railway & Vercel | keduanya `{"ok":true,"sumberData":"database"}` |
| canonical beranda Railway | `https://dramaapp.vercel.app` |
| `robots.txt` Railway | `Sitemap: https://dramaapp.vercel.app/sitemap.xml` |
| `sitemap.xml` Railway | **377 URL, semuanya beralamat Vercel** |
| `NEXT_PUBLIC_SITE_URL` di Railway | tidak ada |

Jadi klaim catatan 2026-10-14 **terbukti benar**, bukan asumsi.

### Blocker tersisa sebelum Vercel boleh ditutup

Ketiganya **kerja di panel, nol commit, nol deploy dari repo**:

1. `NEXT_PUBLIC_SITE_URL` diisi alamat Railway (panel Railway) — nilai persisnya
   ada di TITIK LANJUT di atas.
2. `KEEPALIVE_SITES` masih memuat alamat Vercel → satu kolom di panel GitHub.
   Robot sengaja GAGAL kalau ADA SATU alamat sakit → Vercel mati = email gagal
   tiap hari = alarm berubah jadi kebisingan.
3. Putaran 2 (login admin) — pagar yang dipasang owner sendiri sebelum Tahap 6.

🔴 **"Beli domain" BUKAN blocker** (dikoreksi owner 2026-10-15 sore) — lihat seksi
KOREKSI OWNER di atas. Jangan dimasukkan lagi ke daftar ini.

---

---


---

## 📦 Sejarah sebelum 2026-10-15 — DIPINDAH ke `NEXT-SESSION.md`

Catatan sesi **sebelum 2026-10-15** diarsipkan ke `NEXT-SESSION.md` pada 2026-11-05 atas
keputusan owner. **Tidak ada yang dihapus** — seluruhnya masih utuh di sana dan bisa dicari
dengan Ctrl+F seperti biasa.

**Kenapa dipindah:** berkas ini dibaca PALING AWAL tiap sesi, jadi ukurannya memakan jatah
konteks AI sebelum sempat menyentuh kode. Saat dipindah ia **10.509 baris / 807 KB**; sesudahnya
~4.660 baris (hemat 56%).

**Yang SENGAJA ditahan di sini, bukan ikut diarsipkan** — ini aturan permanen, bukan sejarah:
*Performance /beranda* · *Utang teknis yang DISENGAJA* · *Jangan dilakukan* · *Berkas terkait*,
keempatnya ada di dasar berkas ini. Ditambah pengingat aktif **MATIKAN dramaapp.vercel.app**
yang syaratnya belum terpenuhi.

Isi arsip: catatan **2026-09-15 s/d 2026-10-14** — insiden Playly, migrasi Vercel→Railway,
deret tab katalog, migrasi PC backup, dan seterusnya.

## Performance /beranda: SUDAH SEHAT (diukur 2026-08-20, jangan diulang)

Sempat terlihat seperti masalah (HTML 382 KB), ternyata BUKAN. Angka lengkapnya:

| Yang diukur | Hasil | Artinya |
|---|---|---|
| HTML dikirim di kabel | **22,5 KB** (brotli) | Yang 382 KB itu ukuran SESUDAH dibuka browser. Kompresi memampatkannya 17x |
| Waktu muat | ~900 ms (sesudah panas) | Wajar. Angka 7 detik hanya muncul di request paling pertama |
| Gambar poster | **AVIF 48 KB** (vs JPEG 89 KB) | Next.js Image sudah menyajikan format modern otomatis |
| Lazy loading | 76 dari 79 gambar | Gambar di bawah layar baru dimuat saat digulir |

**Rencana "ramping-kan payload beranda" DIBATALKAN** sesudah diukur: memangkas field
yang tak dipakai (synopsis dll) hanya menghemat ~29 KB mentah = sekitar **2-3 KB
sesudah kompresi**, sementara ongkosnya mengubah 4 komponen bersama yang dipakai 7
halaman. Tidak sepadan. Kalau nanti ada yang mengusulkan ini lagi, tunjukkan tabel di atas.

## Utang teknis yang DISENGAJA

- **Belum ada verifikasi email.** Siapa pun bisa mendaftar dengan email milik orang
  lain selama email itu belum terdaftar. Butuh domain sendiri + layanan kirim email.
- **Rating penonton masih belum dikirim ke Google.** Sejak Tahap 6 identitas sudah
  aman DAN sudah terbukti di produksi, jadi batasan ini SUDAH BOLEH dicabut kapan saja.
  Catatan ada di `lib/store.ts` ("BATAS JUJUR") dan `lib/structured-data.ts`.
- **Satu kode pemulihan per akun** (bukan 10 seperti kode cadangan 2FA) — sengaja,
  supaya mudah dipahami penonton awam.
- Sesi penonton tidak dicek ulang ke database tiap request (cukup tanda tangan +
  masa berlaku 7 hari). Kalau nanti ada fitur HAPUS akun, tambahkan pengecekan
  keberadaan akun di `resolveUserEmail`.

## Jangan dilakukan

- **Jangan anggap "tes lulus" = "tersambung".** 46 tes Playly lulus sejak awal padahal
  integrasinya tidak pernah jalan — semua tesnya memakai bentuk data KARANGAN. Tes baru
  (2026-08-25) memakai bentuk balasan Playly ASLI.
- Jangan ganti pola `/id/{id}/embed` tanpa mengecek ulang ke katalog Playly.

- Jangan commit `.env.local` / API key / `cookies.txt`.
- Jangan `git push` dari working tree kotor tanpa izin.
- Jangan ganti tabel Supabase jadi `users`/`episodes`/`watch_history` — merusak koin & admin.
- **Jangan kembalikan parameter email ke `resolveUserEmail`** — dihapus SENGAJA supaya
  pemanggil yang mengirim identitas dari klien gagal saat build.
- **Jangan simpan kode pemulihan sebagai teks asli** di mana pun (log, response selain
  sekali-tampil, database). Yang boleh disimpan hanya hash-nya.
- **Jangan pakai `getAllDramasCached`/`getDramaCached` di jalur koin, admin, atau tulis.**
- Kalau menguji API lewat `next start`, ingat datanya masuk **Supabase produksi** —
  bersihkan setelah selesai.
- **Jangan tulis karakter non-ASCII di berkas `.ps1`** (em-dash `—`, panah `→`, emoji).
  PowerShell 5.1 membaca `.ps1` tanpa BOM sebagai ANSI; `—` jadi `”` yang dianggap
  **penutup string** → error "Missing closing '}'" di baris yang jauh dari penyebabnya.
  Cek sebelum commit:
  `$e=$null;$t=$null;[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path .\file.ps1).Path,[ref]$t,[ref]$e);$e`
- **Jangan commit `pc-backup-agent/config.yml` atau `pc-backup-agent/*.json`** — itu
  kredensial named tunnel; siapa pun yang punya bisa membajak alamat video. Sudah
  dipagari `.gitignore`, jangan dilonggarkan.
- **Jangan jalankan `start-dramaapp.ps1` (cara lama) bersamaan dengan named tunnel** —
  dua cloudflared akan berebut port 8088.
- **Jangan jalankan `start-dramaapp.ps1` dua kali, dan jangan menjalankannya lagi sesudah
  alamatnya ditempel ke Vercel.** Tiap run memberi alamat baru DAN membunuh yang lama, tapi
  catatan DNS alamat lama tertinggal → jadi "tunnel yatim" yang balas **530**. Akibatnya cek
  DNS terlihat hijau padahal sumbernya mati. Kalau terlanjur dijalankan berkali-kali: pakai
  alamat dari run **TERAKHIR**, dan pastikan `curl <alamat>/` balas **200** — jangan berhenti
  di cek DNS. (Terjadi 2026-08-22.)

## Berkas terkait

- 🔴 **Rencana video otomatis (AKTIF):** [`docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md`](./docs/lintasai/rencana/2026-08-20-video-otomatis-tanpa-powershell.md)
- 🔴 **Panduan PC backup (AKTIF):** [`pc-backup-agent/README.md`](./pc-backup-agent/README.md) — perintah lengkap named tunnel + autostart
- Rencana Tahap 7: [`docs/lintasai/rencana/2026-08-18-tahap-7-kode-pemulihan.md`](./docs/lintasai/rencana/2026-08-18-tahap-7-kode-pemulihan.md)
- Rencana Tahap 6: [`docs/lintasai/rencana/2026-08-18-tahap-6-login-penonton.md`](./docs/lintasai/rencana/2026-08-18-tahap-6-login-penonton.md)
- Antrean: [`antrean-deploy.md`](./antrean-deploy.md)
- Arsip: [`NEXT-SESSION.md`](./NEXT-SESSION.md)
- ⛔ **Arsip kadaluarsa** (jangan dipakai sebagai status): [`docs/serah-terima-deploy-2026-08-15.md`](./docs/serah-terima-deploy-2026-08-15.md) — ditandai 2026-08-19
