# Studio produksi drama pendek AI — prototype episode 1

**Tanggal:** 2026-11-03 · **Bobot:** BERAT (fitur baru, ≥3 subsistem) · **Status:** ✅ prototype selesai & terbukti (4 putaran), di-commit 2026-11-03

Permintaan owner: sistem produksi serial drama China 10 episode yang keluarannya
**video MP4 yang benar-benar bisa ditonton** — vertikal 9:16, 1–3 menit, dialog
Mandarin, subtitle Indonesia, karakter konsisten ep 1–10. Diminta mulai dari
prototype **satu episode**.

---

## Kondisi nyata yang ditemukan lebih dulu (sebelum satu baris kode ditulis)

| Fakta | Cara diperiksa | Akibatnya pada rencana |
|---|---|---|
| `ffmpeg` **nol** di mesin ini | PATH bash + PATH PowerShell + `node_modules` + `imageio-ffmpeg` | tanpa ini MP4 mustahil → jadi palang #1 |
| user18 **bukan administrator** (`admin: False`) | `WindowsPrincipal.IsInRole` | pemasangan setingkat mesin tak bisa diandalkan |
| **nol kunci API** AI/video/TTS | nama kunci di `.env.local` + `.env.example` | generasi berbayar mustahil diuji hari ini |
| `tsconfig.json` include `**/*.ts` tanpa kecuali | dibaca langsung | tiap `.ts` baru di mana pun ikut gerbang `tsc` produksi |
| `vitest.config.ts` hanya `tests/**/*.test.ts` | dibaca langsung | tes baru di folder lain tidak terpungut |

**Jalan keluar palang #1:** paket npm `ffmpeg-static@5.3.0` menaruh biner ffmpeg
ke dalam `node_modules` — **tanpa hak admin, tanpa pemasangan setingkat mesin**.
Diverifikasi jalan: ffmpeg 6.1.1 dengan `libass` + `libfreetype` + `libx264` +
`libharfbuzz` semuanya ADA (dibaca dari `-version`, bukan diasumsikan).

**Keputusan penempatan:** sub-proyek **terisolasi** `drama-ai-studio/` dengan
`package.json` + `node_modules` sendiri, kode `.mjs`. Alasannya bukan selera:
`.mjs` tidak masuk daftar include `tsconfig.json`, dan `package.json` terpisah
menjaga pohon dependensi aplikasi produksi tidak bertambah satu paket pun.

---

## Keputusan besar: animatic dulu, video AI belakangan

Yang **tidak** dilakukan: menebak bentuk permintaan API fal.ai/MiniMax lalu
mengirimkannya. Menebak = membelanjakan uang owner untuk permintaan yang mungkin
salah bentuk, dan tak ada cara mengujinya tanpa kunci.

Yang dilakukan: membangun **seluruh pipeline di sekeliling** lapisan gambar,
lalu mengisi lapisan itu dengan mesin lokal gratis yang menghasilkan
**animatic** — video pratinjau bergerak dengan naskah, timing, subtitle, dan
audio yang persis sama dengan episode jadi. Yang dibuktikan animatic: timing,
sinkronisasi subtitle, penyambungan 18 adegan, audio, dan ekspor MP4 9:16.

Tiap frame memuat tulisan `PRATINJAU · ANIMATIK · BELUM VIDEO AI`. Menyalakan
mesin berbayar nanti **hanya** menukar lapisan gambar & suara.

---

## 🪤 Lima jebakan yang ditemukan dengan MELIHAT, bukan dengan menalar

Semua lima lolos dari "ffmpeg exit 0" dan dari seluruh tes — persis pola yang
sudah berulang di buku pelajaran ini.

1. **`WrapStyle: 2` MEMOTONG subtitle, bukan membungkusnya.** Kalimat Indonesia
   yang panjang terpotong rata di tepi kiri DAN kanan layar. Nol error, nol
   peringatan, berkas `.ass` valid sempurna. Ketahuan hanya karena frame hasil
   render diambil lalu dipandang. → `WrapStyle: 0`, dikunci
   `tests/subtitle.test.mjs`.
   **Aturan: kerusakan LEBAR hanya bisa dibuktikan dengan melihat** — sama
   persis dengan pelajaran tombol-aksi 2026-10-30.

2. **Audio "ada" ≠ audio terdengar.** `adaAudio: true` lolos, padahal puncaknya
   −34,8 dB — praktis senyap pada volume normal. Sebabnya `amix` membagi level
   tiap masukan dengan jumlah masukan. → `normalize=0` + penguat terukur, kini
   −17,6 dB. **Aturan: keberadaan stream bukan bukti bunyi; ukur
   `volumedetect`.**

3. **Gradasi `circular`/`spiral` menggambar baji bertepi tajam** yang terbaca
   sebagai glitch di layar penuh. → hanya `linear` & `radial` yang dipakai.

4. **Kartu judul mencetak judul EPISODE sebagai nama serial.** Storyboard hanya
   membawa satu pasang judul. → judul serial & episode dibawa terpisah, dikunci
   satu tes.

5. **`.gitignore` induk baris 86 (`.env*`) ikut menelan `.env.example`** — berkas
   contoh tak akan pernah sampai ke rekan. **Yang DITOLAK:** menambah
   pengecualian di penjaga rahasia demi kerja sendiri (§5.3, dan persis pelajaran
   `secret-guard` 2026-10-15). **Yang DIAMBIL:** berkasnya dinamai
   `env.contoh.txt`. Diuji: `.env` sungguhan tetap terabaikan.

---

## Bukti (dijalankan, outputnya dilihat)

**Episode 1 — `keluaran/episode-01/episode-01.mp4`**

- 1080×1920 · DAR 9:16 · h264 High · 24 fps · 15,1 MB
- durasi **97,04 dtk** (rencana 97 dtk) · 18 shot · 11 baris dialog
- audio AAC 48 kHz stereo, puncak −17,6 dB
- subtitle dua bahasa **terbakar** — dibuktikan dengan memandang frame pada
  detik 3 / 13 / 34 / 92; aksara Han tergambar benar, bukan kotak

**Pemeriksa:** 41 tes studio hijau · gerbang biaya menolak di 4 jalur terpisah.

**Repo induk TIDAK tersentuh:** `npm run build` sukses · `npx tsc --noEmit`
**exit 0** · `npm test` **1844 tes / 128 berkas hijau**. Urutan build→tsc sesuai
AGENTS.local.md §6.

---

## Yang BELUM dikerjakan (sengaja, bukan terlewat)

- **Pemanggilan API video & TTS berbayar.** Gerbang biaya, prompt per-shot, dan
  tempat colokan penyedia sudah ada; pemanggilan sungguhan belum — belum bisa
  diuji tanpa kunci. CLI menolak `--mesin berbayar` dengan pesan yang
  menjelaskan ini, bukan gagal diam-diam.
- **Tarif di `lib/biaya.mjs` belum diverifikasi** ke halaman harga penyedia.
  Ditandai jelas di kode dan dicetak tiap kali perintah `biaya` dijalankan.
  Perkiraan episode 1 berbayar ± USD 7,74 → 10 episode ± USD 77.
- **Episode 2–10.** Arc sepuluh episode sudah ditulis di Character Bible; naskah
  per episode belum.
- **Integrasi ke katalog dramaapp.** Sengaja nol kopling ke Supabase.

---

## Putaran 2 (sore) — owner: "belum ada gambar videonya cuma blur"

Pengamatan owner BENAR dan sesuai rancangan: lapisan gambar memang sengaja
kosong. Owner memilih **"cari yang gratis dulu karena ini baru percobaan"** —
jadi jalur berbayar tidak disentuh sama sekali.

### Kondisi nyata yang memaksa pilihan

| Fakta | Cara diperiksa | Akibatnya |
|---|---|---|
| **Nol GPU** — cuma "Microsoft Remote Display Adapter" | `Win32_VideoController` | Stable Diffusion lokal tertutup |
| CPU 24-core EPYC, RAM 512 GB, disk sisa 86 GB | CIM | kuat, tapi tanpa GPU tak menolong untuk gambar |
| Layanan gambar tanpa-kunci balas **503** | `curl` | sempat disimpulkan buntu — **keliru** |
| 503 itu cuma ANTREAN | dicoba ulang 5× → berhasil di percobaan 1 | jalur gratis TERBUKTI ada |

**Aturan yang didapat: `503` berisi teks "retry after 10s" adalah ANTREAN, bukan
pintu tertutup. Menyimpulkan "tidak bisa" dari satu percobaan hampir membuang
seluruh jalur gratis.**

### Yang dibangun

`lib/penyedia/gambar-gratis.mjs` — mengambil satu foto per shot dari
pollinations.ai. Tanpa kunci API, tanpa daftar, tanpa biaya. Tiga keputusan
bentuknya semuanya karena diukur: **retry sampai 6×** (1-3 percobaan itu
normal), **cache ke disk** (render ulang tak mengunduh lagi), **gagal satu shot
tidak mematikan episode** (jatuh ke kartu gradasi).

**Konsistensi wajah lintas 10 episode: TERPECAHKAN, gratis.** Seed tetap per
tokoh (`bijiGambar`, diturunkan dari id tokoh utama shot) + deskripsi wajah
disalin apa adanya dari Bible. Dibuktikan dengan membandingkan dua adegan
berbeda berdampingan: orangnya sama persis.

### 🪤 Enam jebakan putaran ini — SEMUANYA lolos dari "exit 0" dan dari seluruh tes

1. **Kostum di Bible masih bahasa Indonesia** padahal disuntikkan ke prompt
   berbahasa Inggris. Mesin gambar mengabaikannya tanpa satu pun error → baju
   tokoh acak. Sekalian ditemukan pakaian disebut di DUA tempat (promptVisual +
   kostumPerBabak); disatukan ke satu tempat.
2. **Tiap `promptVisual` diakhiri "cinematic portrait lighting"** — arahan
   KOMPOSISI yang nyelip di deskripsi IDENTITAS. Akibatnya "wide shot keluar
   dari gerbang penjara" keluar sebagai pas foto studio.
3. **Deskripsi wajah 35 kata ikut dipakai di wide shot.** Panjangnya saja sudah
   memaksa mesin menggambar close-up wajah. Perbaikannya: tiap tokoh punya
   `promptRingkas` (±12 kata), dan tiap shot punya kolom **`fokus`**
   (`wajah` / `adegan` / `objek`) yang memilih versi mana yang dipakai.
   **Aturan: panjang deskripsi subjek itu sendiri adalah instruksi komposisi.**
4. **Kata "teal" di prompt gaya mewarnai RAMBUT tokoh** jadi kehijauan. Gradasi
   warna sudah dikerjakan ffmpeg; memintanya dua kali merusak.
5. **Jenis kamera di akhir prompt ≈ diabaikan.** Dipindah ke paling depan —
   frasanya cuma 2-4 kata jadi tak melemahkan identitas, dan identitas tetap
   dipegang seed.
6. **Render gagal "Permission denied" SESUDAH 100 detik kerja** karena owner
   sedang menonton episode versi sebelumnya dan Windows mengunci berkasnya.
   **Aturan: berkas keluaran yang mungkin sedang dibuka orang wajib ditulis ke
   berkas sementara dulu, baru dipindah** — hasil yang sudah jadi tidak boleh
   hilang hanya karena namanya terpakai. Sekarang jatuh ke `-baru.mp4` +
   pemutar otomatis memilih berkas terbaru.

### Bukti putaran 2

`keluaran/episode-01/episode-01-baru.mp4` — 1080×1920 · h264 · **97,04 dtk** ·
21,1 MB · audio puncak −17,6 dB · **18/18 foto AI berhasil, nol gagal** ·
subtitle dua bahasa terbakar. Diperiksa dengan memandang frame pada detik
3 / 34 / 92: wide shot, high angle, dan extreme close-up semuanya sesuai naskah,
dan wajah Wanxing konsisten di ketiganya.

**61 tes studio hijau** (naik dari 41).

### Batas jujur yang TERSISA

- **Close-up BENDA masih gagal** — "telapak tangan memegang liontin" tetap jadi
  potret orang. 2 dari 18 adegan. Model gratis lemah di situ.
- **Watermark `pollinations.ai`** di pojok kanan bawah; `nologo` diabaikan untuk
  pemakai anonim. **Sengaja tidak dihapus** — itu imbalan memakai layanan gratis
  orang lain.
- **Resolusi mentok 576×1024** walau diminta lebih besar → diperbesar ±2,3×,
  hasilnya lebih lembut.
- **Orangnya tidak bergerak**, hanya kameranya. Ini foto dianimasikan, bukan
  video AI.

### ⚠️ Catatan di luar pekerjaan ini

Pukul 10:18-10:23, selagi sesi ini berjalan, muncul perubahan di repo induk yang
**bukan dari sesi ini**: `app/components/player/PlaylyPlayer.tsx` (diubah) plus
`app/components/player/useOlahSuara.ts`, `lib/olah-suara.ts`,
`app/uji-suara/page.tsx`, `tests/olah-suara.test.ts`, `public/uji-nada.wav`
(baru). Tampaknya ada sesi lain mengerjakan fitur olah-suara pemutar Playly.
**Tidak disentuh sama sekali.** Konsekuensinya: berkas `.ts` baru itu ikut
terjaring `npx tsc` dan `npm test` repo induk, jadi hasil gerbang pra-rilis
sekarang bercampur dengan kerja yang belum selesai.

---

## Putaran 3 — owner: "tidak ada suaranya dan tidak bergerak"

**Kedua laporan BENAR, dan keduanya lolos dari pemeriksaan teknis saya sendiri.**
Ini pelajaran paling mahal dari seluruh pekerjaan ini: dua kali berturut-turut
saya mengukur hal yang SALAH lalu menyatakan "terbukti".

### 🪤 "Ada sinyal audio" BUKAN "terdengar" — ukur FREKUENSINYA, bukan cuma dB

Putaran 2 saya tutup dengan bukti `max_volume: -17,6 dB` dan menyebutnya
"terdengar wajar". Itu keliru. Yang diukur `volumedetect` adalah LEVEL, bukan
APA yang bisa direproduksi speaker. Begitu dipisah per pita frekuensi:

| Pita | Sebelum |
|---|---|
| di bawah 200 Hz | **-17,9 dB** (hampir seluruh tenaga ada di sini) |
| di atas 200 Hz | -37,5 dB rata-rata (nyaris kosong) |

Bed musiknya dengung sub-bass 65-196 Hz, dan **speaker laptop/HP secara fisik
tidak mereproduksi frekuensi serendah itu.** Diperparah `lowpass=f=340` yang
ikut menekan nada apa pun di atas 340 Hz.

**Aturan: untuk klaim "ada suara", ukur pita yang benar-benar terdengar —**
```
ffmpeg -i x.mp4 -af "highpass=f=200,volumedetect" -f null -
```
Perbaikan: akor TIGA nada di 156-588 Hz (semua > 150 Hz), `lowpass` 340 → 2400,
`tremolo` untuk denyut, penguat 3,5 → 14, plus `alimiter=limit=0.89` supaya
pengerasan sebesar itu tak pernah pecah. Hasil: pita >200 Hz naik dari
-37,5 dB ke **-16,0 dB** (+21,5 dB), puncak -2,9 dB tanpa clipping.

### 🪤 "Kamera bergerak" BUKAN "terbaca bergerak" — ambangnya, bukan keberadaannya

Gerak kamera memang JALAN sejak awal; dibuktikan dengan membandingkan frame
detik 1 vs detik 6 (PSNR 19,4 — berbeda, bukan identik). Tapi pembesarannya
cuma 14% selama 7 detik pada foto DIAM, dan itu terbaca sebagai slideshow.

**Aturan: untuk hal yang dinilai MATA, "berbeda secara terukur" tidak cukup —**
**yang perlu dibuktikan adalah "berbeda cukup banyak untuk disadari".**
Perbaikan: zoom tiap mood 0,08-0,26 → **0,20-0,45**, ditambah geser kamera 40 px
berarah bergantian antar shot (zoom dimulai 1,05 supaya geseran punya ruang dan
tidak menarik tepi hitam masuk bingkai). PSNR turun ke 12,6-17,9.

### Penjaga baru

`tests/naskah.test.mjs` kini menolak mood yang nadanya ≤150 Hz, yang bukan akor
tiga nada, atau yang zoom-nya <0,20. Pagar ini langsung berguna: ia MENANGKAP
dua mood (`kenangan-hujan` 147 Hz, `hook-gelap` 131 Hz) yang masih di bawah
ambang sesudah saya kira sudah selesai membetulkan semuanya.

### Bukti putaran 3

`keluaran/episode-01/episode-01.mp4` — 24,5 MB · 97,04 dtk · 1080×1920 ·
18/18 foto AI · audio total puncak **-2,9 dB** / pita terdengar rata-rata
**-16,0 dB** · PSNR gerak 12,6-17,9. **64 tes studio hijau.**

⚠️ Tersisa: `episode-01-baru.mp4` (22 MB, versi putaran 2 yang audionya masih
pelan) sengaja TIDAK dihapus — berguna untuk membandingkan sendiri. Hapus kapan
saja; pemutar sudah memilih berkas terbaru.

---

## Putaran 4 — owner: "gambar sudah bergerak tetapi suaranya mendengung, aku mau suaranya berbicara"

Voice Generation akhirnya tersambung, **tetap nol biaya**. 11 dari 11 baris
dialog Mandarin kini benar-benar diucapkan.

### Tiga penyedia diuji, dua gugur

| Penyedia | Hasil | Sebab |
|---|---|---|
| Suara bawaan Windows (SAPI) | ✖ gugur | **nol suara Mandarin** terpasang (cuma David & Zira berbahasa Inggris); memasang paket bahasa butuh hak admin |
| Suara neural Microsoft Edge | ✖ gugur | selalu `403` dari mesin ini |
| Google Translate TTS | ✅ dipakai | `200`, MP3 Mandarin, tanpa kunci |

### 🪤 Pelajaran: 403 itu BISA bukan salah kode — buktikan dulu sebelum menyerah

Suara neural Edge adalah pilihan terbaik (gratis DAN bagus), jadi sebelum
meninggalkannya saya hadapkan implementasi sendiri dengan pustaka resmi
`edge-tts` yang dirawat komunitas. Empat hal diperiksa satu-satu:

1. **Token `Sec-MS-GEC` dibandingkan byte-per-byte** dengan keluaran Python
   pada detik yang dipaksa sama → **identik**.
2. **Versi Chromium** — ternyata saya memakai 131 sementara pustaka resminya
   143. Dibetulkan. Masih 403.
3. **Selisih jam** — ditemukan **jam mesin ini tertinggal 13 menit 18 detik**
   dari server (dua server berbeda sepakat, jadi mesinnya yang meleset). Token
   itu dihitung dari waktu dan dibulatkan per 5 menit, jadi ini hipotesis yang
   masuk akal. Dikoreksi dengan membaca header `Date` server. Masih 403.
4. **Header** disamakan persis dengan `constants.py` pustaka resmi. Masih 403.

Baru setelah keempatnya habis, kesimpulan "ditolak dari sisi Microsoft" layak
diucapkan. **Aturan: sebelum menyatakan sebuah jalur buntu, habiskan dulu
hipotesis yang bisa diuji — dan "kode saya salah" selalu salah satunya.**
💡 Temuan sampingan yang berdiri sendiri: **jam mesin ini meleset 13 menit.**
Itu memengaruhi apa pun yang bergantung waktu di mesin ini, bukan cuma TTS.

### Pembeda suara antar-tokoh

Penyedia gratis cuma punya SATU suara. Supaya lima tokoh tidak terdengar sama
persis, nada digeser per tokoh (`suara.geserNada` di Character Bible):
Chenzhou −5 semitone, Zhenguo −4, Laozhang −3, Wanxing −1, Su Tian +2.
Caranya `asetrate` (mengubah nada DAN durasi) lalu `atempo` mengembalikan
durasinya — sisa bersihnya cuma perubahan nada. Bukan pengganti aktor suara,
tapi tanpa ini penonton kehilangan jejak siapa yang bicara.

### Pencampuran

Musik latar otomatis diredupkan ke **28%** pada adegan berdialog; dialog
dikuatkan 2,2× dan mulai 0,45 detik setelah potongan supaya tidak menempel.
Panjang campuran mengikuti bed (`duration=first`), jadi dialog yang kepanjangan
terpotong rapi alih-alih memperpanjang adegan.

**Diperiksa dulu sebelum dibangun:** kesebelas baris diukur durasinya terhadap
durasi adegannya masing-masing — semuanya muat, jadi tak ada timing yang perlu
diubah.

### Bukti putaran 4

Level di dalam episode jadinya, diukur per potongan waktu:

| Adegan | Sebelum bicara | **Saat bicara** | Sesudah |
|---|---|---|---|
| s14 (Chenzhou) | -31,2 dB | **-14,7 dB** | -22,8 dB |
| s17 (Chenzhou) | -31,1 dB | **-14,2 dB** | -24,0 dB |

Lonjakan ±17 dB tepat di jendela bicara = suaranya memang ada dan menang atas
musik. `keluaran/episode-01/episode-01.mp4` — 23,3 MB · 97,04 dtk · 18/18 foto ·
11/11 dialog. **75 tes studio hijau.**

🪤 Catatan metode: pengukuran PERTAMA saya gagal membuktikan apa pun — saya
membandingkan rata-rata adegan berdialog vs adegan sunyi, dan hasilnya mirip
(-14 vs -15 dB). Wajar: pada adegan berdialog musiknya diredupkan lalu diisi
suara, jadi total levelnya memang sengaja seimbang. **Yang membuktikan adalah
perbandingan DI DALAM satu adegan** (sebelum/saat/sesudah), bukan antar-adegan.

### Batas jujur yang tersisa

- Satu suara untuk semua tokoh; geseran nada bukan pengganti aktor.
- Nadanya datar — membacakan, bukan memerankan.
- Endpoint penyedia tidak resmi dan bisa berubah sewaktu-waktu.
- Tokohnya tetap tidak bergerak; bibirnya tidak sinkron dengan suara.

## Belum di-commit

Nol commit, nol push. 24 berkas baru, semuanya di dalam `drama-ai-studio/`.
`node_modules` (79 MB) dan `keluaran/` (15 MB) terbukti terabaikan git.
