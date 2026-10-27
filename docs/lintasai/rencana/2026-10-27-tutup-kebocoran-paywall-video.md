# Rencana: tutup kebocoran paywall video (URL bertanda tangan)

> Dibuat 2026-10-27 · Bobot **BERAT** (uang + bisa mematikan seluruh video + menyentuh PC backup)
> Rak dibuka: `skills/owasp` · `skills/backend` · `skills/auth` (dirutekan lewat `rak-cli --divisi`)
> Status: **RENCANA — belum ada satu baris pun yang diubah.**

## Ringkasan

Episode berbayar bisa ditonton siapa pun tanpa login, dengan cara menyalin alamat `.mp4`
dari View Source. Rilis 24 Oktober menutup pintu API-nya, tapi halaman pemutar masih
mencetak alamat video apa adanya ke HTML. Rencana ini menutup pintu kedua itu dengan
**URL bertanda tangan berumur pendek** — pola baku rak owasp §4 ("signed URL berjangka +
otorisasi dicek sebelum terbit URL").

## ✅ Terverifikasi (diukur 2026-10-27, bukan dari catatan)

| Fakta | Bukti |
|---|---|
| **Kebocoran NYATA & hidup** | `GET /watch/<premium>/40` tanpa cookie → **200**, HTML memuat alamat tunnel ep 39/40/41 |
| **Tunnel melayani tanpa syarat** | `GET <tunnel>/<id>/40.mp4` → **206 PartialContent**, `video/mp4`, isi diawali `ftypmp42` |
| Jatah gratis cuma 3 episode | `lib/coins.ts:17` `FREE_EPISODES = 3`; paywall menyala `lib/coins.ts:14` |
| Terdampak **15 dari 40** drama | `/api/dramas` → 15 ber-`premium: true` |
| Permukaan perubahannya KECIL | `videoSrc` dipakai **1 tempat** (`FeedPlayer.tsx:114`), `downloadUrl` **1 tempat** (`FeedPlayer.tsx:442`) |
| Halaman yang mencetak alamat **dinamis semua** | `/watch` & `/feed` → `cache-control: no-store`. Jadi bisa menerbitkan tanda tangan segar |
| Halaman ter-cache **tidak** mencetak alamat | `/beranda` (`s-maxage=60`) → **nol** alamat `.mp4` |
| Gerbang paywall sudah ADA & teruji | `lib/paywall-guard.ts` `periksaAksesEpisode()` — tinggal dipakai ulang, bukan ditulis baru |
| Alat standarnya ADA | plugin Caddy `caddy-signed-urls` (HMAC-SHA256 + `expires`, MIT) — bukan bangun sendiri |
| Binary Windows bisa didapat tanpa Go | halaman unduh Caddy bisa menyertakan plugin pihak-ketiga (Go/xcaddy **tidak** terpasang di mesin owner) |
| Alamat dirakit **di browser** | `baseUrl` = prop (`FeedPlayer.tsx:41,53`), `srcFor` jalan di klien (`:114`) |
| Buka episode **tanpa muat ulang** | `unlockEpisode` → `setUnlocked` (`FeedPlayer.tsx:168-170`) |
| `basicauth` BUKAN jawaban | `Caddyfile:42-44` — elemen `<video>` tak mengirim kredensial basic-auth |

## 🚨 PAGAR KUOTA — jangan sampai perbaikan ini mengulang insiden Vercel

Owner meminta ini diperiksa sebelum mulai, dan **dia benar**: situs ini pernah **MATI TOTAL**
karena `/api/teaser` menyalurkan byte video lewat server — **29,71 GB dari jatah 10 GB**,
Vercel mem-pause seluruh project (`docs/lintasai/rencana/2026-08-26-vercel-paused-teaser-proxy.md`).

**Diukur ulang dari produksi 2026-10-27** (redirect SENGAJA tidak diikuti, jadi yang terhitung
murni byte yang keluar dari Railway):

| Jalur | Hasil | Byte dari Railway |
|---|---|---|
| `/api/teaser` ep gratis | **307** → tunnel | **0** |
| `/api/teaser` ep terkunci | **401** | 38 |
| `/api/download` ep gratis | **307** → tunnel | **0** |
| `/api/download` ep terkunci | **401** | 38 |
| `/api/subtitle` | 404/teks kecil | 18 |
| `/api/playly/video` | JSON | 44 |
| `/api/thumb/[id]` | 307 (dibaca di kode `:79`) | 0 |
| Jalur cadangan byte di `/api/download:95-104` | **mati** — `public/videos` nol berkas (diverifikasi `Glob`) | 0 |

✅ **NOL byte video mengalir lewat Railway.** Pola desainnya konsisten dan sudah didokumentasikan
di tiga berkas (`thumb/route.ts:24-29`, `playly/video/route.ts:17-27`, rencana 2026-08-26).

### Aturan yang MENGIKAT rencana ini

1. **Endpoint penerbit tanda tangan WAJIB membalas JSON berisi alamat — BUKAN menyalurkan byte,
   dan BUKAN 307.** Alasan menolak 307 di sini bukan byte melainkan JUMLAH panggilan: memutar
   video memicu banyak Range request saat penonton menggeser waktu, dan dengan redirect **tiap
   potongan menyentuh server kita**. Ini persis alasan `/api/playly/video` memilih JSON
   (`route.ts:24-27`) — ikuti pola yang sudah ada, jangan bikin pola ketiga.
2. **`/api/teaser` & `/api/download` tetap 307.** Keduanya dipanggil sekali per pemutaran
   (bukan per potongan), jadi aman. Jangan diubah jadi proxy "supaya bisa menyisipkan tanda
   tangan" — tanda tangan disisipkan ke `Location`, byte tetap tak lewat sini.
3. **Tes penjaga yang sudah ada jangan dilemahkan:** `tests/teaser-redirect.test.ts`
   (mengunci 307 + badan KOSONG) dan `tests/download-redirect.test.ts`. Kalau perubahan ini
   membuat keduanya merah, yang salah perubahannya — bukan tesnya.

### Temuan sampingan (BUKAN video, bukan akibat rencana ini)

**Gambar poster MEMANG lewat Railway** — `/_next/image` mengoptimalkan di server. Diukur:
360 alamat gambar unik di `/beranda`, **AVIF ~69 KB** rata-rata, dan cache **bekerja**
(permintaan ulang → `x-nextjs-cache: HIT`). Dampaknya kecil karena **171 dari 172 `<img>`
bersifat lazy** — hanya 1 dimuat segera: **~0,07 MB** per kunjungan yang tak digeser,
**~11 MB batas ATAS** kalau digeser habis. Sebagai pembanding, HTML `/beranda` sendiri **999 KB**.
⚠️ Cache gambar hidup di dalam container → **reset tiap redeploy**, jadi pengunjung pertama
sesudah tiap deploy memicu transformasi ulang. Tidak mendesak, tapi angka sebenarnya ada di
**tab Metrics panel Railway** — itu sumber yang berwenang, bukan perkiraan ini.

## ❓ Asumsi (BELUM dikonfirmasi — wajib dibuktikan saat dikerjakan)

- ❓ Plugin `caddy-signed-urls` berjalan baik di **Windows** + melayani **range request** (`206`)
  dengan benar. Aktivitas repo-nya minim → **wajib diuji lokal dulu**, jangan langsung ke PC backup.
- ❓ Berapa lama `expires` yang pas. Terlalu pendek = video putus di tengah tonton; terlalu
  panjang = tautan curian hidup lama.
- ❓ Apakah `?dl=1` (tombol unduh) ikut perlu tanda tangan di tahap ini.
- ❓ Apakah owner sanggup/berkenan mengganti binary Caddy di PC backup.

## Yang TIDAK dibangun (sengaja)

- **Bukan** DRM/enkripsi video. Penonton yang sudah membayar tetap bisa merekam layar —
  itu di luar jangkauan cara apa pun yang masuk akal di sini.
- **Bukan** memindahkan video ke CDN/penyimpanan berbayar.
- **Bukan** menyalurkan video lewat Railway (ditimbang, lihat "Pilihan yang ditolak").
- **Tidak** menyentuh 4 sisa temuan lain (port server sewaan, pesan error route admin,
  email di riwayat git, `/admin/videos/playly` lambat).

## Yang ikut tersenggol

| Fitur yang client kenal | Memakai bagian ini? | Penjaganya |
|---|---|---|
| Pemutar episode (`/watch`, `/feed`) | ✅ langsung — `srcFor` di `FeedPlayer.tsx:519` | ⚠️ belum ada tes render; `tests/video.test.ts` mengunci `videoSrc` |
| Tombol unduh di pemutar | ✅ `downloadUrl` (`FeedPlayer.tsx:442`) | ✅ `tests/video.test.ts` |
| Tombol unduh halaman detail | ❌ tidak — sudah lewat `/api/download`, dipaku ep 1 (`lib/video.ts:80`) | ✅ `tests/download-button.test.ts` |
| Teaser hero & cuplikan kartu | ❌ tidak mencetak alamat — lewat `/api/teaser` (dinamis) | ✅ sudah ber-gerbang sejak 24 Okt |
| Beranda & halaman kategori | ❌ nol alamat `.mp4` — diukur hari ini | — |
| Subtitle | ❌ jalur terpisah `/api/subtitle` | — |
| Agen hardlink admin | ⚠️ lewat tunnel yang sama (`/_agent/*`) — **jangan ikut dipagari tanda tangan** | ✅ pakai `x-agent-secret` |

**Dua tes akan MERAH dan itu benar**: `tests/video.test.ts` mengunci bentuk lama `videoSrc`.
Harus diperbarui, bukan dihapus.

## Lima kepala bahasan

1. **Alur pengguna:** penonton buka episode → server memeriksa hak (`periksaAksesEpisode`) →
   kalau boleh, server menerbitkan alamat bertanda tangan berumur pendek → video jalan seperti
   biasa. Kalau tidak boleh, **alamatnya tidak pernah ada di halaman** — yang muncul panel
   "buka dengan koin" yang sudah ada.
2. **Data & siapa boleh lihat:** nol data baru disimpan. Satu rahasia baru
   (`VIDEO_SIGNING_SECRET`) hidup di env Railway **dan** di Caddyfile PC backup — **tidak
   pernah dikirim ke browser** (§5.2). Tanda tangan dibuat server-side saja.
3. **Kalau gagal:** tanda tangan salah/kedaluwarsa → tunnel balas **401**, `<video>` memicu
   `decideVideoError` yang sudah ada (`lib/video.ts:46`) → panel "Coba lagi", bukan layar hitam.
   Kalau database mati saat memeriksa hak, gerbangnya sudah **gagal-TUTUP** dengan 503
   (`paywall-guard.ts:117-127`) — penonton berbayar tertahan sementara, tidak dituduh belum bayar.
4. **Batas/skala:** 40 judul, episode terpanjang 79. Penerbitan tanda tangan = HMAC di memori,
   nol query untuk episode gratis (jalan pintas `paywall-guard.ts:66`). Tidak menambah beban berarti.
5. **Cara uji:** lihat seksi "Cara membuktikan" di bawah.

## Pre-mortem

> Semua ini sudah dikerjakan, dan hasilnya nol guna. Apa sebab paling mungkin?

**Perubahan di repo tidak pernah sampai ke PC backup.** Ini bukan tebakan — persis itu yang
terjadi pada perbaikan D-1 (pelajaran 2026-10-24 di `INDEX.md`): `Caddyfile` diperbaiki,
di-push, dan lubangnya tetap menganga karena Caddy membaca berkas di komputer LAIN.
PC backup **tidak punya folder repo dan tidak punya `git`**.

→ Masuk ke rencana: **Tahap B wajib ditutup dengan pengukuran dari LUAR** (ulangi uji `206`
yang membuktikan kebocoran hari ini — harus berubah jadi **401**). Diff di repo bukan bukti.

**Sebab kedua:** tanda tangan dipasang tapi `srcFor` tetap merakit alamat di browser untuk
episode yang baru dibuka pertengahan sesi → video yang BARU DIBAYAR tidak jalan. Itu lebih
buruk daripada kebocoran: pelanggan membayar lalu tidak dapat apa-apa.
→ Masuk ke rencana: alamat **wajib** datang dari server tiap kali, termasuk sesudah `unlockEpisode`.

## Pilihan yang ditolak (biar tak ditawarkan ulang)

| Pilihan | Kenapa ditolak |
|---|---|
| Sekadar berhenti mencetak alamat episode terkunci | **Bukan perbaikan.** Polanya tertebak: lihat satu episode gratis, ganti angkanya. Lebih berbahaya karena terasa sudah aman |
| Salurkan video lewat Railway | Penghalang lamanya (batas 60 detik Vercel, `lib/video.ts:17-19`) memang **sudah hilang** sejak pindah Railway. Ditolak karena **biaya bandwidth** situs video lewat PaaS berbayar — kalau trafik masih kecil, layak dihitung ulang nanti |
| `basicauth` di tunnel | `<video>` tak mengirim kredensial → mematikan pemutaran, bukan mengamankan (`Caddyfile:42-44`) |
| Pakai FREE_EPISODES di Caddyfile agar ep 1-3 tanpa tanda tangan | Menduplikasi aturan bisnis ke berkas yang jauh dari kode → dua sumber kebenaran (§3.3). Tandatangani semua, satu aturan |

## Tahapan — dua tahap, masing-masing bisa dibatalkan sendiri

Dipecah begini supaya **tak ada satu langkah pun yang bisa mematikan video tanpa jalan mundur.**

### ✅ Tahap A — SELESAI 2026-10-27 (belum di-push)

**Terbukti, bukan diklaim.** Gerbang §6: `build` exit 0 · `tsc` exit 0 · **1.612 tes hijau**
(113 berkas; +31 tes baru, −4 tes `downloadUrl` yang ikut dibuang). Lalu dijalankan sungguhan
(`next start` lokal):

| Diukur | Sebelum | Sesudah |
|---|---|---|
| Alamat `.mp4` di HTML `/feed/<premium>?ep=40` | **3 alamat tunnel** | **0** |
| Sebutan tunnel di HTML | ada | **0** |
| `/api/video-url` ep 1 (gratis) | — | 200 + alamat |
| `/api/video-url` ep 40 tanpa login | — | **401, nol alamat** |
| Tanda tangan di runtime Next sungguhan | — | `expires − issued = 21600` detik (6 jam), base64url |

**Tiga koreksi atas rencana ini sendiri, ditemukan saat mengerjakan:**

1. 🔴 **Penanda tangan TIDAK boleh di `lib/video.ts`** seperti ditulis rencana semula.
   `app/components/FeedPlayer.tsx:1` berbaris `"use client"` dan mengimpor berkas itu — menaruh
   pembaca `VIDEO_SIGNING_SECRET` di sana berarti **rahasia ikut ke browser** (§5.2). Dipindah
   ke berkas khusus-server `lib/video-signature.ts`.
2. **Tombol unduh dialihkan ke `/api/download`**, bukan diberi penandatanganan sendiri.
   Route itu sudah menegakkan gerbang yang sama lalu 307 ke `...?dl=1` — memakai ulang yang ada
   (§4.4) menghapus satu jalur bocor tanpa kode baru.
3. **`downloadUrl()` dibuang** (kode mati sesudah #2) dan **prop `baseUrl` dilepas dari
   FeedPlayer**. Efek sampingnya bagus: alamat tunnel kini **tidak tercetak ke halaman sama
   sekali**, bukan sekadar alamat `.mp4`-nya.

Berkas: `lib/video-signature.ts` (baru) · `app/api/video-url/route.ts` (baru) ·
`tests/video-signature.test.ts` (baru, 14) · `tests/video-url-route.test.ts` (baru, 17) ·
`app/components/FeedPlayer.tsx` · `app/feed/[id]/page.tsx` · `lib/video.ts` · `tests/video.test.ts`.

⏳ **Sisa Tahap A: owner mengisi `VIDEO_SIGNING_SECRET` di Railway.** Tanpa itu alamat
diterbitkan TANPA tanda tangan — dan itu memang aman & disengaja (lihat `video-signature.ts`),
karena tunnel juga belum menegakkan. Kebocoran View Source **sudah tertutup** tanpa env itu.

### Tahap A — rencana semula (sisi aplikasi; aman, tidak bisa merusak apa pun)

Aplikasi mulai menerbitkan alamat **ber-tanda-tangan**, sementara tunnel **belum** menegakkan.
Caddy yang belum menegakkan hanya mengabaikan parameter tambahan, jadi video tetap jalan persis
seperti sekarang. Tahap ini aman di-deploy sendirian.

1. Tambah `VIDEO_SIGNING_SECRET` di env Railway (owner).
2. Fungsi baru `tandaTanganiUrlVideo()` di `lib/video.ts` — HMAC-SHA256 memakai modul `node:crypto`
   bawaan (project ini memang sudah menulis crypto sendiri, `docs/architecture.md:73`), **nol paket baru**.
3. Endpoint baru yang menerbitkan alamat **setelah** `periksaAksesEpisode()` lolos —
   memakai ulang gerbang yang sudah ada, bukan aturan kedua.
4. `FeedPlayer` berhenti merakit alamat sendiri; ia **meminta** alamat ke server, termasuk
   sesudah `unlockEpisode` berhasil (menutup sebab kedua di pre-mortem).
5. Perbarui `tests/video.test.ts` + tambah tes: episode terkunci **tidak** mendapat alamat;
   episode gratis & yang sudah dibuka **dapat**; tanda tangan berubah saat episode berubah.
6. Gerbang pra-rilis §6 `AGENTS.local.md`: `rm -rf .next` → `npm run build` → `npx tsc --noEmit`
   → `npm test` → nol env ter-stage → push (izin owner) → verifikasi tayang.

**Bukti tahap A selesai:** video masih jalan normal di produksi (uji 5 halaman penonton +
putar 1 episode gratis & 1 episode berbayar milik akun yang sudah bayar), dan alamat di HTML
sekarang **memuat tanda tangan**.

### ✅ Tahap B — KODE SELESAI 2026-10-27 (belum dipasang di PC backup)

**Desainnya BERUBAH dari rencana semula — plugin Caddy DIBATALKAN.** Rencana awal menyuruh
menaruh `caddy.exe` hasil build sendiri di PC backup. Setelah membaca `pc-backup-agent/README.md`
Bagian F: mesin itu memakai **360 Total Security**, dan berkas di folder itu **sudah hilang dua
kali** karena antivirus. Binary tak bertanda tangan di sana = kemungkinan besar dikarantina,
**dan tidak ada penjaga yang mengembalikannya** (penjaga hanya memulihkan 4 berkas skrip).

**Yang dipakai: `forward_auth` bawaan Caddy → agent Node yang SUDAH jalan di sana.**

| | Plugin (dibatalkan) | forward_auth (dipakai) |
|---|---|---|
| Binary baru di PC ber-AV | ya — risiko karantina | **tidak** — Caddy standar yang sudah ada |
| Kalau rusak | tak ada pemulih | agent dipulihkan watchdog 15 menit + penjaga berkas 10 menit |
| Ketergantungan ke Railway | tidak | **tidak** — pemeriksaan 100% lokal (127.0.0.1) |
| Kode pemeriksa | pihak ketiga, aktivitas minim | milik sendiri, di repo, ada tesnya |

Harga yang diterima: kalau proses agent mati, video ikut mati (sebelumnya hanya fitur Scan
admin). Dijinakkan oleh watchdog 15 menit yang memang sudah terpasang.

**Bukti uji lokal (Caddy resmi v2.11.7 + agent asli, 11/11 lulus):**

| Uji | Hasil |
|---|---|
| Bertanda tangan | **200**, 204.812 byte |
| Range request (geser waktu) | **206** |
| `?dl=1` bertanda tangan | **200** + `Content-Disposition: attachment` |
| Alamat polos tanpa tanda tangan | **403** |
| Alamat polos + Range | **403** |
| Tanda tangan kedaluwarsa | **403** |
| Nomor episode diganti sesudah ditandatangani | **403** |
| Tanda tangan diutak-atik | **403** |
| `?dl=1` tanpa tanda tangan | **403** |
| Subtitle `.vtt` (sengaja dibebaskan) | 200 |
| `/_agent/health` | 200 |

Gerbang repo: build 0 · tsc 0 · **1.626 tes** (+14 tes kecocokan dua sisi).

🪤 **Bug yang HANYA ketahuan karena uji lokal diwajibkan.** `forward_auth` menulis ulang alamat
jadi `/_verify` **tetapi membawa query aslinya** → yang sampai ke agent
`/_verify?expires=...&signature=...`. Agent membandingkan `req.url === "/_verify"` → tak pernah
cocok → 404. Gejalanya MENIPU: alamat tak bertanda tangan tetap ditolak benar, jadi pagarnya
tampak bekerja — yang rusak justru alamat yang SAH. Kalau langsung dipasang ke PC backup,
**seluruh video mati**. Diperbaiki: rute dicocokkan dari JALUR saja.

### ⚠️ URUTAN PEMASANGAN — SALAH URUT = SELURUH VIDEO MATI

Tiap langkah aman sendiri-sendiri dan bisa dibalik. **Jangan dibolak-balik.**

| # | Langkah | Kenapa aman |
|---|---|---|
| 1 | Rilis kode situs (sudah termasuk penandatanganan) | `VIDEO_SIGNING_SECRET` belum diisi → alamat terbit polos, persis seperti sekarang |
| 2 | Isi `VIDEO_SIGNING_SECRET` di **Railway** | situs mulai menandatangani; tunnel belum memeriksa → parameter tambahan diabaikan |
| 3 | Salin `hardlink-agent.js` + `Caddyfile` ke PC backup, `caddy validate` → `caddy reload` | env di PC masih kosong → agent **meloloskan semua**, perilaku tak berubah |
| 4 | Isi `VIDEO_SIGNING_SECRET` di **PC backup** (level `Machine`) + jalankan ulang agent | **ini saklarnya.** Baru di sini penegakan menyala |

🔴 **Langkah 2 WAJIB sebelum 4.** Kalau PC backup punya rahasia sementara Railway belum, situs
mengirim alamat polos dan tunnel menolaknya → **semua video mati**.

🚨 **SAKLAR DARURAT:** hapus `VIDEO_SIGNING_SECRET` di PC backup → jalankan ulang agent → semua
lolos lagi seperti sebelum Tahap B. Tidak perlu menyentuh Caddyfile, tidak perlu rilis.

### Tahap B — rencana semula (sisi PC backup; DIBATALKAN, lihat di atas)

1. **Uji lokal dulu**, di mesin pengembang: jalankan Caddy ber-plugin dengan folder video tiruan,
   buktikan (a) alamat bertanda tangan → **206**, (b) tanpa tanda tangan → **401**,
   (c) kedaluwarsa → **401**, (d) **range request** tetap benar. Jangan sentuh PC backup sebelum
   keempatnya terbukti.
2. Owner mengunduh binary Caddy ber-plugin, simpan **di samping** yang lama (jangan timpa).
3. Salin `Caddyfile` baru sebagai berkas TERPISAH; simpan cadangan `Caddyfile.sebelum-tanda-tangan`
   (pola yang sudah berhasil dipakai saat D-1).
4. `caddy validate` → baru `caddy reload`. **`reload`, bukan restart** — nol downtime, dan
   restart penuh malah mengganti alamat tunnel (pelajaran D-1).
5. **Ukur dari LUAR**: ulangi persis uji yang membuktikan kebocoran hari ini. Harus berubah
   **206 → 401**. Lalu pastikan episode gratis & berbayar yang sah **tetap 206**.
6. **Jalan mundur** (kalau meleset): `caddy reload` dengan `Caddyfile.sebelum-tanda-tangan`.
   Video pulih dalam hitungan detik, tanpa menyentuh aplikasi.

## Cara membuktikan (bukan "harusnya jalan")

| Yang dibuktikan | Caranya | Harus |
|---|---|---|
| Kebocoran tertutup | `GET <tunnel>/<id-premium>/40.mp4` tanpa tanda tangan | **401** (hari ini: 206) |
| Episode gratis tetap jalan | buka drama mana pun, putar ep 1 | video jalan |
| Episode berbayar yang SAH tetap jalan | login akun yang sudah membuka ep tertentu, putar | video jalan |
| Beli-lalu-tonton tetap mulus | buka episode baru dengan koin **tanpa muat ulang** | langsung bisa diputar |
| Nol regresi | gerbang §6 + 1.547 tes hijau | exit 0 semua |
| Nol downtime | ukur `/api/health` + `/api/dramas` (pembanding **33524 byte · 40 drama**) | tetap sama |

### Cara owner mencoba sendiri

1. Buka drama premium mana pun di situs, **jangan login**
2. Klik kanan → **View Source** → cari `.mp4`
3. **Sekarang:** alamatnya ada, disalin ke tab baru → video jalan
4. **Sesudah perbaikan:** alamat episode terkunci **tidak ada**; kalaupun alamat lama disalin
   orang, tab barunya menolak

## Biaya & risiko, jujur

- **Waktu:** Tahap A ±setengah hari. Tahap B ±1-2 jam, tapi sebagiannya **kamu sendiri** yang
  jalankan di PC backup (dipandu langkah demi langkah, seperti waktu D-1).
- **Risiko terbesar:** salah setel di Tahap B membuat video mati. Dijinakkan oleh: uji lokal
  wajib lebih dulu, binary & Caddyfile lama disimpan, `reload` (bukan restart), dan jalan
  mundur hitungan detik.
- **Utang yang DISENGAJA:** plugin pihak-ketiga beraktivitas minim. Kalau suatu saat ia tak
  jalan di Caddy versi baru, penggantinya = tunda naik versi Caddy, atau pindah ke cara lain
  (menyalurkan lewat Railway). Dicatat di sini supaya bukan kejutan.
- **Yang TIDAK hilang:** penonton yang sudah membayar tetap bisa membagikan tautan selama masa
  berlaku tanda tangan. Yang mati adalah pencurian massal, penelusuran pustaka, dan tautan abadi.
