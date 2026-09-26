# Rencana: DramaKu jadi murni "isinya film" — navbar ramping + video Playly masuk beranda

- **Tanggal:** 2026-09-26
- **Bobot:** BERAT (fitur BARU: halaman tonton + kolom genre admin · 3 subsistem: navbar, beranda, panel admin · ujungnya rilis)
- **Diminta owner:** "di dramaku ketika ku klik video/film diberanda lalu terbuka seperti di image 1, disitu terlihat menu beranda, playly, profile sedangkan aku maunya seperti LK21 (image 3) untuk profile bisa kamu letak di avatar jadi viewer hanya melihat film/video saja, selanjutnya bisa tidak semua video yang di upload dari playly langsung masuk ke beranda (sesuai dengan genre) karena viewer tidak perlu tahu darimana asal video di upload jadi intinya dramaku ini isinya film/video yang bsa ditonton"

## Context — kenapa ini dikerjakan

Penonton DramaKu sekarang melihat dua hal yang bukan urusannya:

1. **Menu internal di navbar halaman film.** Saat mengklik film di beranda lalu masuk ke halaman detail, navbar hitam memajang "Beranda · Playly · Profile". "Playly" adalah nama penyedia video kami — penonton tak punya keperluan dengannya. LK21 (situs pembanding yang owner tunjuk) navbar-nya hanya berisi jalan menuju film (Genre, Populer, Negara, Tahun).
2. **Video Playly dipisah dan dilabeli asalnya.** 46 video ada di situs, tapi tersembunyi di blok terpisah di dasar beranda berjudul "Video dari Playly" dengan keterangan "Diputar langsung dari pemutar milik Playly", dan tak pernah ikut ke baris genre.

Hasil yang dituju: DramaKu terbaca sebagai satu katalog film. Video dari mana pun asalnya tampil sebagai film biasa, punya alamatnya sendiri yang bisa dibagikan, dan urusan akun bersembunyi di balik avatar.

**Keputusan owner (popup 2026-09-26):** (a) rampingkan navbar hitam yang ada, jangan ganti total; (b) video tampil sekarang juga tanpa menunggu genre, kolom genre dipasang di admin supaya video pindah sendiri ke baris genrenya begitu diisi; (c) tiap video dapat halaman tonton sendiri.

## Dua versi penjelasan (seksi utama)

**Seksi 1 — navbar ramping**
- 👨‍🎓 **Junior-frontend:** `LINKS` di TopNav dipangkas jadi Beranda + Admin; blok avatar/logout diganti komponen bersama `MenuAkun` berbasis Radix DropdownMenu, yang dipakai juga oleh `TombolAkun` di KepalaKatalog supaya `LINKS` dan `TUJUAN` tetap identik (dijaga `tests/kepala-situs.test.ts`).
- 🙂 **Non-teknis:** Dua tombol di baris atas dilepas. Yang urusan akun dipindah ke balik foto profil bulat — diklik, baru muncul daftarnya. Halaman Playly dan Profil tidak dihapus, cuma tidak lagi punya tombol di baris atas.

**Seksi 2 — video Playly jadi film di beranda**
- 👨‍🎓 **Junior-frontend:** Fungsi baru `barisBerandaGabungan` membungkus keluaran `homeCatalogRows` jadi union `KartuKatalog`, menyisipkan satu baris video + menempelkan video ber-kategori ke baris genrenya. `FeaturedRow` diberi prop opsional `items` sehingga 5 pemanggil lama tidak berubah. Tiap video dapat route `/tonton/[id]` yang memakai gerbang daftar-izin yang sama dengan `/api/playly/video`.
- 🙂 **Non-teknis:** Video yang selama ini terkumpul di kotak paling bawah berjudul "Video dari Playly" dipindah naik jadi baris film biasa, dan tiap video dapat halamannya sendiri yang alamatnya bisa dibagikan. Kata "Playly" hilang dari layar penonton. Halaman depan dan halaman Shorts sengaja tidak ikut berubah.

## ✅ Terverifikasi (dibaca di kode / diukur di situs sungguhan)

- Navbar hitam memajang Beranda · Playly · Profile · Admin — `app/components/TopNav.tsx:62-77`
- Daftar yang sama disalin ke menu garis-tiga beranda, dan tes memaksa keduanya identik — `app/components/beranda/KepalaKatalog.tsx:77-82`, `tests/kepala-situs.test.ts:92-99`
- Halaman mana dapat navbar hitam diatur satu tempat berbentuk allowlist — `lib/navigasi-halaman.ts:34-44`
- Baris kategori beranda disusun HANYA dari katalog drama Supabase, video Playly tidak pernah ikut — `lib/beranda-catalog.ts:277-312`, dipanggil `app/components/beranda/CatalogBrowser.tsx:127`
- Video Playly digambar sebagai blok terpisah berjudul "Video dari Playly" di dasar halaman — `app/components/beranda/HasilPlayly.tsx:61-98`, dipasang `CatalogBrowser.tsx:353-355`
- **Video Playly tidak punya genre sama sekali.** `PlaylyVideo` dari API Playly isinya cuma id, judul, durasi, kreator, embed, sampul — tidak ada field genre — `lib/playly.ts:398-410`. Genre hanya terisi lewat kaitan admin video→drama — `lib/playly-publik.ts:128`
- **Diukur di produksi 2026-09-26** (`https://dramaapp.vercel.app/playly`): 46 video · penanda baris "tahun · genre" **0** kemunculan · penanda drama terkait **0** · lencana rating **0**. Pembandingnya penanda durasi = **45**, jadi cara bacanya terbukti benar
- Angka itu cocok dengan pengakuan kode sendiri: "Per 2026-09-25, NOL dari 46 video Playly dikaitkan admin ke drama" — `app/components/player/InfoVideoPlayly.tsx:26-29`
- **Seluruh 46 thumbnail Playly berupa alamat https**, nol data-URI (diukur dari HTML produksi yang sama) → aman digambar dengan `<img>`
- Video Playly saat ini tidak punya halaman sendiri: klik kartu memunculkan pemutar di halaman yang sama — `app/components/PlaylyVideoGrid.tsx:34-39`
- Pemutar + kotak keterangan sudah ada dan siap dipakai ulang — `app/components/player/PlaylyPlayer.tsx:53`, `app/components/player/InfoVideoPlayly.tsx:46`
- Gerbang izin pemutar sudah menolak video di luar daftar — `app/api/playly/video/route.ts:51-54`
- Pola menyimpan setelan admin tanpa perlu SQL: dokumen di tabel `app_data` — `lib/store.ts:768-771`, contoh lengkap daftar sembunyi `lib/store.ts:802` + `app/api/admin/playly/hidden/route.ts`
- Genre katalog DramaKu ada 7 nilai tetap: Romance, Tycoon, Harem, Time Travel, Action, Comedy, Fantasy — `lib/types.ts:1-9`
- Domain gambar yang boleh lewat `next/image` cuma 3, tidak termasuk Playly — `next.config.ts:19-26`
- `homeCatalogRows` dipakai 3 halaman: `/beranda`, `/`, `/shorts` — `app/components/beranda/CatalogBrowser.tsx:127`, `app/page.tsx:35`, `app/shorts/page.tsx:33`

## ❓ Asumsi (belum dikonfirmasi owner)

- Judul baris baru di beranda dipakai **"Film Terbaru"**. Netral, tidak menyebut Playly. Owner boleh minta ganti kapan saja — satu konstanta.
- Avatar-dropdown dipasang di **dua** tempat: halaman film DAN bar merah beranda. Alasannya wajib: tes memaksa daftar menu kedua tempat identik, jadi begitu "Profile" dilepas dari navbar ia juga hilang dari beranda — tanpa avatar di beranda, penonton desktop kehilangan satu-satunya jalan ke Profile.
- Thumbnail video (melintang 16:9) dipasang di bingkai poster tegak 2:3 dengan pemotongan kiri-kanan (`object-cover`), supaya sebaris dengan poster drama. Pilihan lain (pita hitam atas-bawah) membuat baris terlihat bolong.
- Alamat halaman tonton berbentuk `/tonton/<judul-disingkat>-<kode video>`. Kodenya ikut karena id Playly boleh memuat tanda hubung — tanpa kode, dua judul mirip bisa saling rebut alamat.

## Yang TIDAK dibangun (sengaja, biar tak salah harap)

- **Halaman depan `/` dan `/shorts` tidak berubah sama sekali.** `homeCatalogRows` tidak disentuh; yang dipakai beranda fungsi baru di sebelahnya.
- **Halaman `/playly` tidak dihapus.** Tombolnya saja yang hilang dari navbar — halamannya tetap hidup dan tetap bernavigasi, mengikuti pola yang sudah dipakai untuk Discover/Shorts/My List.
- **Genre tidak ditebak otomatis** dari judul (owner menolak opsi itu). Video tanpa genre tampil di baris "Film Terbaru", bukan disembunyikan.
- Halaman tonton video **tidak** mendapat komentar, koin, paywall, atau daftar episode. Itu milik halaman drama.
- Video Playly **tidak** dipindahkan ke tabel katalog drama. Ia tetap milik gudang Playly; yang berubah cuma cara menampilkannya.
- Bar bawah HP tidak disentuh (Profile masih ada di sana).

## Yang ikut tersenggol

| Bagian lain yang memakai kode ini | Apa yang berubah | Sudah ada penjaganya? |
|---|---|---|
| Bar merah beranda + halaman Jelajah (`/discover`) — memakai daftar menu yang sama | "Profile" pindah dari menu garis-tiga ke avatar | ✅ `tests/kepala-situs.test.ts`, akan diperbarui |
| Halaman Jelajah (`/discover`) — memakai blok hasil video yang sama | Judul "Video dari Playly" jadi netral | ⚠️ belum ada, ditambah |
| Halaman Playly (`/playly`) | Tetap hidup, hanya tak ada lagi tombol menuju ke sana | ✅ pola "dilepas tapi hidup" sudah ada, `/playly` akan didaftarkan ke sana |
| Halaman Profil (`/profile`) | Tetap hidup, jalan masuknya pindah ke avatar | ✅ akan ditambah penjaga |
| Baris poster yang bisa digeser (dipakai 5 halaman) | Ditambah kemampuan memuat kartu video; pemanggil lama nol perubahan | ✅ tes render yang ada + tes baru |
| Halaman depan `/` dan Shorts | **Tidak berubah** — sudah dicek, keduanya memanggil `homeCatalogRows` yang tidak disentuh | ✅ tes lama tetap menjaganya |

## Lima kepala bahasan

1. **Alur pengguna:** Penonton buka beranda → melihat baris "Film Terbaru" berisi poster video (tanpa tulisan Playly di mana pun) → klik satu poster → masuk halaman tonton beralamat sendiri berisi pemutar + judul + durasi → bisa menyalin alamatnya dan mengirimkannya ke WhatsApp. Di halaman film mana pun, navbar cuma berisi logo + Beranda + kotak cari; urusan akun muncul saat avatar diklik.
2. **Data & siapa boleh lihat:** Genre pilihan admin disimpan sebagai satu dokumen `playly:genre` di tabel `app_data` yang sudah ada — **tidak perlu owner menjalankan SQL apa pun**. Yang boleh mengubahnya hanya sesi admin (identitas diambil dari cookie bertanda tangan, bukan dari isi kiriman), meniru persis pola daftar sembunyi yang sudah jalan. Halaman tonton memakai gerbang yang sama dengan pemutar sekarang: video di luar daftar yang sah dibalas 404, jadi alamat yang ditebak-tebak tidak membuka video orang lain.
3. **Kalau gagal:** Playly mati → daftar video kosong, beranda tetap tampil berisi drama seperti biasa (perilaku yang sudah berlaku sekarang, tidak diubah). Alamat tonton salah/video sudah disembunyikan admin → halaman 404 DramaKu yang punya jalan pulang, bukan layar putih. Thumbnail gagal dimuat → kotak abu berikon film, bukan gambar rusak. Genre gagal dibaca → video tetap tampil di baris "Film Terbaru", cuma tidak masuk baris genre.
4. **Batas/skala:** 46 video hari ini; baris beranda dibatasi 40 kartu (batas yang sudah berlaku). Halaman tonton dibuat saat pengunjung pertama membukanya lalu disimpan 300 detik — sengaja tanpa pembuatan-di-muka, karena membangun ratusan halaman saat build pernah membekukan rilis 4 hari (tercatat 2026-09-19).
5. **Cara uji:** Langkah klik untuk owner ada di bagian Verifikasi di bawah; tes otomatis yang dipasang ada di Langkah kerja butir 9.

## Tahapan

1. **Tahap 1 — navbar ramping.** Paling kecil, langsung kelihatan owner, dan tidak bergantung apa pun. Dikerjakan sampai terbukti dulu.
2. **Tahap 2 — video jadi film di beranda + halaman tonton.** Bagian terbesar; baru dimulai setelah tahap 1 terbukti.
3. **Tahap 3 — dropdown genre di panel admin.** Terakhir, karena tanpa ini pun video sudah tampil (baris "Film Terbaru").

## Langkah kerja

### Tahap 1 — navbar ramping

1. **Komponen baru `app/components/MenuAkun.tsx`** — avatar yang diklik memunculkan daftar. Sudah login: "Masuk sebagai <nama>" · Profile · Riwayat · Admin (khusus admin) · Keluar. Belum login: Masuk · Daftar. Memakai `DropdownMenu` yang sudah dipakai `KepalaKatalog.tsx:14-21`, dan `readUser`/`clearUser`/`getAvatarClass` dari `lib/auth` yang sudah dipakai `TopNav.tsx:6-13`. Daftar tujuannya diekspor sebagai konstanta supaya bisa diuji — isi dropdown Radix tidak tergambar di HTML sampai menunya dibuka (pelajaran `KepalaKatalog.tsx:50-54`).
2. **`app/components/TopNav.tsx`** — `LINKS` dipangkas jadi `[Beranda, Admin(adminOnly)]`; blok avatar + tombol Keluar (baris 250-307) diganti `<MenuAkun />`. Komentar besar di atas `LINKS` (baris 38-61) diperbarui: tambahkan Playly & Profile ke daftar "menu dilepas, halamannya tetap hidup" beserta jalan yang tersisa menuju keduanya.
3. **`app/components/beranda/KepalaKatalog.tsx`** — `TUJUAN` disamakan jadi `[Beranda, Admin]`; `TombolAkun` (baris 272-277) jadi CoinChip **+** `<MenuAkun />`.
4. **`lib/navigasi-halaman.ts`** — `/playly` dan `/profile` TETAP di `AKAR_BERNAVBAR_ATAS` (halamannya masih hidup dan masih butuh navigasi). Tambahkan `/tonton` (dipakai tahap 2).

### Tahap 2 — video jadi film di beranda + halaman tonton

5. **`lib/tonton.ts` (baru)** — dua fungsi murni: `alamatTonton(video)` merakit `/tonton/<slug judul>-<id>`, dan `cariVideoDariSegmen(videos, segmen)` mencari video yang id-nya **akhiran** dari segmen (ambil id terpanjang kalau ada dua yang cocok). Bentuk "akhiran" dipilih, bukan memotong di tanda hubung terakhir, karena id Playly sendiri boleh memuat tanda hubung — `app/api/playly/video/route.ts:29`.
6. **`app/components/beranda/KartuVideo.tsx` (baru)** — kartu poster untuk video: bingkai `aspect-[2/3]`, thumbnail `object-cover`, lencana durasi di kanan-bawah, judul + genre di bawahnya. Memakai `<img>` biasa, **bukan** `next/image` — domain Playly tidak terdaftar di `next.config.ts:19-26` dan mendaftarnya berarti tiap host baru Playly harus ditambah manual atau gambarnya hilang tanpa error. Pola yang sama sudah dipakai `PlaylyVideoGrid.tsx:112`.
7. **`app/components/beranda/FeaturedRow.tsx`** — tambah prop OPSIONAL `items?: KartuKatalog[]`. Kalau diisi, itu yang digambar (drama pakai `CatalogCard`, video pakai `KartuVideo`); kalau tidak, perilaku lama persis. Kelima pemanggil lama nol perubahan, dan logika geser/panah tetap satu — tidak ada versi kedua yang bisa menyimpang.
8. **`lib/beranda-video.ts` (baru)** — fungsi murni `barisBerandaGabungan(dramas, videos)`: panggil `homeCatalogRows(dramas)` apa adanya, bungkus tiap poster jadi `KartuKatalog`, lalu (a) sisipkan **satu baris baru "Film Terbaru"** berisi seluruh video di posisi atas, dan (b) sisipkan video yang genrenya sudah diisi admin ke baris genre yang cocok. Video boleh muncul di dua baris — itu perilaku yang sudah berlaku untuk drama (`lib/beranda-catalog.ts:272-275`).
9. **`app/components/beranda/CatalogBrowser.tsx`** — baris 127 memakai `barisBerandaGabungan(dramas, playlyVideos)`. Blok `HasilPlayly` di baris 353-355 hanya digambar saat penonton SEDANG MENCARI (saat menjelajah, videonya sudah ada di baris atas). `HasilPlayly.tsx:70-77` judulnya diganti netral ("Film & video lainnya") dan kalimat "Diputar langsung dari pemutar milik Playly" dihapus.
10. **`app/tonton/[id]/page.tsx` (baru)** — ambil `getPlaylyVideosGabunganCached()`, cari lewat `cariVideoDariSegmen`, tak ketemu → `notFound()`. Isinya `PlaylyPlayer` + `InfoVideoPlayly` + tautan drama induk kalau ada — ketiganya komponen yang sudah ada, tidak ditulis ulang. `export const revalidate = 300` (samakan dengan `/playly`), **tanpa** `generateStaticParams` — pelajaran 2026-09-19. `generateMetadata` mengisi judul, deskripsi, canonical, dan gambar preview share dari thumbnail.
11. **`app/sitemap.ts`** — tambah alamat tonton tiap video, dibungkus `try/catch` sendiri persis seperti blok katalog di baris 28-39, supaya Playly bermasalah tidak menggugurkan sitemap.

### Tahap 3 — genre di panel admin

12. **`lib/store.ts`** — dokumen `playly:genre` berisi peta videoId→genre: `getPlaylyGenres()`, `getPlaylyGenresCached()`, `setPlaylyVideoGenre()`. Ikut ditambahkan ke `PlaylyFile` supaya mode lokal (tanpa Supabase) tetap jalan. Meniru persis pola `playly:hidden` di baris 802.
13. **`lib/playly-publik.ts` + `lib/playly-gabungan.ts`** — tambah field BARU `kategori: string | null` pada kartu video, diisi dari pilihan admin. Sengaja field baru, **bukan** menumpang `genre` yang sudah ada: `genre` berisi teks bebas OMDb ("Action, Sci-Fi") sedangkan baris beranda butuh satu nilai yang cocok dengan kategori katalog. Menumpuknya jadi satu akan merusak kotak keterangan di bawah pemutar.
14. **`app/api/admin/playly/genre/route.ts` (baru)** — GET + POST, menyalin pagar `app/api/admin/playly/hidden/route.ts` apa adanya (sesi admin dari cookie, `guardMutation`, balas daftar terbaru). Nilai genre divalidasi terhadap 7 kategori sah di server — panel admin bukan pagar, siapa pun bisa mengirim isi apa saja.
15. **`app/components/admin/PlaylyVisibilityManager.tsx`** — tambah dropdown genre di tiap baris video, di samping tombol Sembunyikan. Pilihan: "(belum diisi)" + 7 kategori.

### Penjaga (tes) — dipasang bersama kodenya, bukan sesudahnya

16. Berkas baru: `tests/tonton-alamat.test.ts` (termasuk kasus id mengandung tanda hubung), `tests/tonton-halaman.test.ts` (video di luar daftar → 404 — ini gerbang keamanan, wajib diuji), `tests/beranda-video.test.ts` (aturan penyisipan baris), `tests/playly-genre.test.ts` (nilai genre ngawur ditolak server).
17. `tests/kepala-situs.test.ts` diperbarui: daftar menu jadi `[/beranda, /admin]`; `/playly` + `/profile` masuk daftar "dilepas tapi halamannya hidup"; pagar isi navbar yang sekarang mencari `"/playly"` (baris 68) diganti penanda yang masih ada.
18. **Penjaga PEMASANGAN** untuk tiap komponen baru — `MenuAkun` benar-benar dirender oleh TopNav dan KepalaKatalog, `KartuVideo` benar-benar dirender oleh baris beranda. Alasannya pelajaran 2026-09-23: komponen lengkap dengan tes hijau pernah tayang tanpa satu pun halaman memasangnya, dan build/tsc/test semuanya diam.
19. Tiap penjaga baru **diuji-balik** (dirusak sengaja, harus merah) sebelum dianggap penjaga. Pelajaran 2026-09-22/23: tes yang berbunyi "X tidak muncul" bisa lulus hijau walau X tak pernah ada.

## Verifikasi

**Sebelum menjalankan gerbang:** cek `netstat -ano | grep :3000`. Ada yang LISTENING = owner sedang membuka localhost — `npm run build` akan menghapus berkas yang sedang dipakai dev server dan SELURUH halaman jadi Internal Server Error (pelajaran 2026-09-25). Minta owner menutupnya dulu, atau pakai `next build --distDir .next-verify`.

**Gerbang pra-rilis `AGENTS.local.md` §6, urutan ini persis dan tidak boleh dibalik:**
1. `rm -rf .next`
2. `npm run build` → harus exit 0. Tulis ke berkas log, **jangan dipipa ke `tail`** (exit code yang terbaca jadi milik `tail`, pernah melaporkan build lulus padahal gagal)
3. `npx tsc --noEmit` → harus 0 error. Wajib SESUDAH build: `next-env.d.ts` mengimpor berkas tipe yang baru dibuat `next build`
4. `npm test` → seluruhnya hijau
5. Periksa nol berkas env/kunci yang ikut ter-stage

**Bukti tambahan yang saya ambil sendiri:** jalankan `next start` di port terpisah, lalu baca HTML-nya — baris "Film Terbaru" berisi kartu video, kata "Playly" nol kemunculan di halaman penonton, dan satu alamat tonton dibuka langsung untuk memastikan pemutarnya tergambar.

**Cara owner mencoba sendiri** (di situs sungguhan, bukan localhost — localhost tidak bisa memutar video Playly):
1. Buka beranda → klik satu film mana pun → di navbar atas sekarang cuma ada logo, "Beranda", dan kotak cari. **Tidak ada lagi tulisan "Playly" maupun "Profile".**
2. Klik lingkaran avatar di kanan atas → muncul daftar: nama Anda, Profile, Riwayat, Keluar.
3. Kembali ke beranda → gulir sedikit → ada baris berjudul **"Film Terbaru"** berisi poster-poster video. Tidak ada tulisan "Playly" di mana pun.
4. Klik salah satu poster di baris itu → terbuka halaman tonton sendiri, videonya bisa diputar. Lihat alamat di kotak alamat browser — alamat itu bisa disalin dan dikirim ke WhatsApp.
5. (Admin) Buka panel admin → menu video Playly → tiap video kini punya dropdown genre. Isi salah satu dengan "Action" → tunggu ±1 menit → buka beranda → video itu sekarang **juga** muncul di baris "Drama Action".

## Catatan penyimpanan

Saat eksekusi, rencana ini disalin ke `docs/lintasai/rencana/2026-09-26-dramaku-isinya-film.md` + satu baris penunjuk di `docs/lintasai/INDEX.md`, supaya sesi berikutnya menemukannya (kernel §4.4). Plan mode hanya mengizinkan menulis ke berkas rencana ini, jadi penyalinan dilakukan di langkah pertama eksekusi.
