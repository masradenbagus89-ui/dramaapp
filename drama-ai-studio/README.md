# drama-ai-studio

Studio produksi serial drama pendek China — vertikal 9:16, dialog Mandarin,
subtitle Indonesia, keluaran MP4 yang benar-benar bisa ditonton.

Sub-proyek **terpisah** dari aplikasi dramaapp: punya `package.json` dan
`node_modules` sendiri, kodenya `.mjs`. Artinya `npm run build`, `npx tsc`, dan
`npm test` milik dramaapp tidak menyentuh folder ini sama sekali.

---

## Apa yang SUDAH terbukti jalan

Dibuktikan dengan menjalankannya, bukan dengan membacanya:

| Tahap | Status | Bukti |
|---|---|---|
| AI Story Generator (arc 10 episode) | ✅ ada | `data/bibel-karakter.json` → `arcSepuluhEpisode` |
| Character Bible | ✅ ada + dijaga tes | 5 tokoh tetap, 4 lokasi |
| Episode Script Generator | ✅ episode 1 | `data/episode-01.json`, 18 shot / 97 detik |
| Storyboard Generator | ✅ jalan | `node bin/studio.mjs storyboard 1` |
| Subtitle Generator | ✅ jalan | `.ass` (dibakar) + `.srt` (terpisah) |
| Video Editor (sambung adegan) | ✅ jalan | 18 klip → 1 episode |
| Export MP4 | ✅ **terbukti** | 1080×1920 · h264 · 97,04 dtk · 18/18 foto AI · audio -2,9 dB |
| Episode Player | ✅ jalan | `keluaran/pemutar.html` |
| Gerbang biaya | ✅ dijaga 6 tes | menolak di 4 jalur berbeda |
| **Foto adegan AI (GRATIS)** | ✅ jalan | `render 1 --gambar` · tanpa kunci, tanpa biaya |
| **AI Video Generation (berbayar)** | ⛔ **belum tersambung** | lihat "Batas jujur" |
| **Voice Generation Mandarin** | ✅ jalan | `render 1 --suara` · 11/11 baris diucapkan, nol biaya |

## Dua lapisan gambar yang bisa dipilih

| | `render 1` (bawaan) | `render 1 --gambar` |
|---|---|---|
| Gambar adegan | kartu gradasi sinematik | **foto AI fotorealistis** |
| Biaya | nol | nol |
| Internet | tidak perlu | perlu |
| Lama | ±100 detik | ±10 menit sekali ambil, sesudahnya ±100 detik |
| Penanda di layar | `PRATINJAU · ANIMATIK` | `PRATINJAU · FOTO AI + GERAK KAMERA` |

Tambahkan `--suara` pada perintah mana pun untuk **mengucapkan dialog Mandarin**.

Foto diambil dari layanan publik pollinations.ai — **tanpa kunci API, tanpa
biaya, tanpa pendaftaran**.

**Konsistensi wajah tokoh dijaga begini:** tiap tokoh punya angka `seed` tetap
yang diturunkan dari id-nya, dan deskripsi wajahnya disalin apa adanya dari
Character Bible ke setiap prompt. Tokoh yang sama → seed sama + deskripsi sama →
wajah yang sama di seluruh episode. Sudah diuji dan terbukti bekerja.

### Batas jujur mesin gambar gratis

- **Ada watermark `pollinations.ai`** di pojok kanan bawah. Parameter `nologo`
  diabaikan untuk pemakai anonim. Watermark itu **sengaja tidak dihapus** — itu
  imbalan memakai layanan gratis milik orang lain.
- **Resolusi mentok 576×1024** walau diminta lebih besar, jadi harus diperbesar
  ±2,3× ke kanvas. Hasilnya lebih lembut daripada video jadi sungguhan.
- **Sering antre.** Layanan membalas `503 "retry after 10s"`; satu gambar biasa
  butuh 1–3 percobaan. Studio mencoba sampai 6 kali per gambar.
- **Orangnya tidak bergerak** — hanya kameranya (zoom 20-45% + geser). Ini foto
  yang dianimasikan, bukan video. Gerak kamera sengaja dibuat cukup kuat supaya
  terbaca sebagai gerakan; versi pertama memakai 14% dan terasa seperti foto diam.
- Gambar disimpan di `keluaran/episode-NN/gambar/` dan **dipakai ulang**. Mau
  gambar baru? Hapus folder itu lalu render lagi.
- **Close-up BENDA masih lemah.** Adegan "extreme close-up telapak tangan
  memegang liontin" tetap keluar sebagai potret orang. 2 dari 18 adegan episode
  1 terkena. Shot orang dan shot lokasi sudah akurat.

### Kalau episodenya sedang Anda tonton saat render ulang

Windows mengunci berkas video yang sedang dibuka pemutar, jadi `episode-01.mp4`
tidak bisa ditimpa. Studio **tidak membuang hasilnya**: video disimpan sebagai
`episode-01-baru.mp4`, Anda diberi tahu, dan halaman pemutar otomatis memakai
berkas yang paling baru. Tutup pemutarnya lalu render lagi kalau mau nama
aslinya dipakai kembali.

## Suara dialog (gratis)

`--suara` mengubah tiap baris Mandarin di naskah jadi ucapan sungguhan, lalu
mencampurnya di atas musik latar yang otomatis diredupkan ke 28% saat ada yang
bicara. Terukur: level melonjak ±17 dB tepat saat tokohnya berbicara.

### Batas jujur mesin suara gratis

- **SATU suara untuk semua tokoh.** Pembedanya cuma geseran nada per tokoh
  (`suara.geserNada` di Character Bible): Chenzhou −5 semitone, Su Tian +2, dan
  seterusnya. Membantu membedakan pria/wanita, **bukan pengganti aktor suara**.
- **Nadanya datar** — ia membacakan, bukan memerankan.
- **Suara neural Microsoft Edge jauh lebih bagus dan juga gratis, tapi dari
  mesin ini selalu ditolak `403`.** Sudah dipastikan bukan salah kode: token
  `Sec-MS-GEC` yang dihasilkan di sini dibandingkan byte-per-byte dengan
  keluaran pustaka resmi `edge-tts` dan **identik**; header, versi Chromium,
  dan koreksi selisih jam juga sudah disamakan. Penolakan datang dari sisi
  Microsoft (lazim untuk alamat IP pusat data).
- Suara disimpan di `keluaran/episode-NN/suara/` dan dipakai ulang. Hapus
  foldernya kalau dialog naskahnya berubah.

## Batas jujur — baca ini dulu

**Yang dihasilkan sekarang BUKAN video AI.** Dengan `--gambar` Anda mendapat
foto AI sungguhan yang digerakkan kamera; tanpa `--gambar` Anda mendapat kartu
gradasi. Dua-duanya bukan klip video AI di mana tokohnya benar-benar bergerak
dan bibirnya bicara. Tiap frame mencetak penanda yang menyebutkan sedang melihat
apa, supaya tidak ada yang salah sangka.

**Kenapa belum video AI:** mesin video AI berbayar, dan belum ada kunci API di
mesin ini. Memanggil API yang belum pernah diuji berarti membelanjakan uang
untuk permintaan yang mungkin bentuknya salah. Jadi yang dibangun duluan adalah
seluruh pipeline di sekelilingnya — dan pipeline itu sudah terbukti utuh.

**Yang berubah saat mesin berbayar dinyalakan:** hanya lapisan gambar dan suara.
Naskah, Character Bible, storyboard, timing, subtitle, penyambungan, dan ekspor
MP4 tidak berubah satu baris pun.

---

## Cara pakai

```bash
cd drama-ai-studio
npm install            # sekali saja; mengunduh ffmpeg (~79 MB), tanpa hak admin
```

```bash
node bin/studio.mjs naskah 1       # periksa naskah + lihat seluruh dialognya
node bin/studio.mjs storyboard 1   # susun storyboard + simpan JSON
node bin/studio.mjs biaya 1        # bandingkan biaya lokal vs berbayar
node bin/studio.mjs render 1            # render jadi MP4, kartu gradasi (±100 dtk)
node bin/studio.mjs render 1 --gambar   # render dengan FOTO AI gratis (±10 menit)
node bin/studio.mjs render 1 --gambar --suara   # + dialog Mandarin diucapkan
node bin/studio.mjs pemutar             # buat halaman pemutar
npm test                                # 75 tes penjaga
```

Hasilnya di `keluaran/episode-01/`:

- `episode-01.mp4` — video jadi, subtitle sudah terbakar di dalamnya
- `episode-01.srt` — subtitle Indonesia terpisah
- `episode-01.ass` — subtitle dua bahasa (sumber pembakaran)
- `storyboard-01.json` — storyboard lengkap + prompt tiap shot

Menonton: klik dua kali `keluaran/pemutar.html`, atau buka `episode-01.mp4`
langsung dengan pemutar video apa pun.

---

## Biaya dan pagarnya

`node bin/studio.mjs biaya 1` menampilkan perkiraan. Untuk episode 1
(97 detik, 18 shot): **lokal USD 0,00** · **berbayar ± USD 7,74**.

> ⚠️ Angka berbayar itu **perkiraan yang belum diverifikasi** ke halaman harga
> penyedia. Samakan dulu di `lib/biaya.mjs` sebelum dipakai mengambil keputusan.

Render berbayar baru boleh jalan kalau **keempatnya** terpenuhi:

1. kunci API terisi di `.env`
2. `STUDIO_BATAS_BIAYA_USD` di `.env` lebih dari 0
3. perkiraan biaya tidak melewati batas itu
4. perintahnya diberi `--setujui-biaya`

Kurang satu saja → ditolak. Keempat jalur penolakan itu punya tesnya sendiri.

---

## Menambah episode 2–10

1. Salin `data/episode-01.json` jadi `data/episode-02.json`.
2. Ikuti arc yang sudah ditulis di `data/bibel-karakter.json` →
   `arcSepuluhEpisode`.
3. Shot **hanya menyebut `karakterId`** — jangan pernah menyalin deskripsi
   wajah ke dalam naskah. Deskripsi diambil mesin dari Character Bible, dan
   itulah satu-satunya hal yang menjaga wajah tokoh tetap sama di 10 episode.
4. `node bin/studio.mjs naskah 2` → pemeriksa akan menolak kalau ada id salah
   ketik, penutur yang tidak hadir di adegannya, mood yang belum punya warna,
   atau durasi di luar 1–3 menit.
5. `node bin/studio.mjs render 2`, lalu `node bin/studio.mjs pemutar`.

---

## Peta berkas

```
bin/studio.mjs              CLI semua tahap
lib/
  konfigurasi.mjs           baca .env, pilih mesin
  biaya.mjs                 tarif + GERBANG persetujuan belanja
  ffmpeg.mjs                satu-satunya pintu ke biner ffmpeg
  naskah/
    bibel-karakter.mjs      muat + jaga Character Bible
    naskah-episode.mjs      muat + periksa naskah terhadap Bible
    storyboard.mjs          timing + perakitan prompt per shot
    subtitle.mjs            .ass (dibakar) + .srt (terpisah)
  penyedia/
    palet.mjs               mood → warna + nada
    gambar-gratis.mjs       ambil foto adegan (gratis, retry, cache)
    suara-gratis.mjs        ucapkan dialog Mandarin (gratis, retry, cache)
    visual-lokal.mjs        render satu shot: foto ATAU kartu gradasi
  render/
    episode.mjs             sambung + bakar subtitle + BUKTIKAN hasilnya
    pemutar.mjs             halaman pemutar HTML
data/                       Character Bible + naskah per episode
keluaran/                   hasil render (tidak masuk repo)
tests/                      75 tes penjaga
```

## Catatan teknis

- **ffmpeg** datang dari paket `ffmpeg-static` ke dalam `node_modules`. Tidak
  perlu memasang apa pun setingkat mesin dan tidak perlu hak administrator —
  penting karena komputer kerja ini server sewaan bersama.
- **Font Mandarin** diambil dari `C:/Windows/Fonts/msyh.ttc`. Kalau studio
  dipindah ke Linux, ubah `FONT_CJK` di `lib/penyedia/visual-lokal.mjs` dan
  `FOLDER_FONT` di `lib/render/episode.mjs`.
- **Berkas contoh kunci API** bernama `env.contoh.txt`, bukan `.env.example`:
  `.gitignore` repo induk memakai pola `.env*` sebagai penjaga rahasia, dan
  penjaga itu tidak dilonggarkan hanya demi satu berkas contoh.
