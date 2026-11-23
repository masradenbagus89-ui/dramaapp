# Tampilan HP halaman depan ala "image 2" (owner 2026-11-21)

> ## 🛑 STATUS AKHIR: SEBAGIAN BESAR RENCANA INI DIBATALKAN
>
> Owner melihat hasilnya lalu memutuskan: **"cuma bagian atas yang diubah, sisanya
> kembalikan ke dramaku"**. Jadi §3.1–§3.5 di bawah **tidak lagi berlaku** — badan
> halaman kembali putih, deret tab kembali tampil, strip kuning kembali, bar atas
> kembali merah-pink, menu bawah kembali 2 tombol.
>
> **Yang tersisa hidup** hanya perubahan BAGIAN ATAS: klik logo D → panel pop up menu
> katalog (§3.7–§3.8), avatar khusus admin, tanpa panah ⌄, dan tulisan kotak cari yang
> muat penuh tanpa menutupi logo.
>
> Dokumen ini DIPERTAHANKAN apa adanya karena alasan tiap keputusan — termasuk jebakan
> teknis yang ditemukan di jalan — tetap berguna. **Baca sebagai sejarah, bukan sebagai
> keadaan sekarang.** Keadaan sekarang + langkah besok ada di blok status paling atas
> seksi `## 2026-11-21` pada `HANDOFF.md`.

> Bobot: **BERAT** — halaman paling ramai (`/` + `/beranda`), menyentuh komponen yang
> dipakai bersama layar komputer, dan menambah tombol navigasi baru.
> Permintaan owner: *"aku mau di dramaku tampilan HP seperti image 2 hanya untuk tampilan
> HP karena tampilan desktop sudah ok"*.

## 0. Laporan kondisi nyata (sebelum diubah)

✅ **Terverifikasi dari kode**

| Fakta | Bukti |
|---|---|
| `/` dan `/beranda` memakai badan yang SAMA | `app/components/beranda/BadanKatalog.tsx:28` dipanggil `app/page.tsx:107` & `app/beranda/page.tsx:95` |
| Baris geser "judul + tombol Semua + poster digeser" SUDAH ADA | `app/components/beranda/SeksiKatalog.tsx:40-76` → `BarisGeser` |
| Badan halaman dipaksa TERANG di semua ukuran layar | `shell.ts:32` `BADAN_TERANG = "tema-terang bg-zinc-100"`, saklarnya `app/globals.css:21` |
| Menu bawah HP cuma 2 tombol | `app/components/BottomNav.tsx:28-49` |
| Tombol FILTER bermuara ke `/discover` | `app/components/beranda/FilterKatalog.tsx:68-110` |
| Tailwind terpasang 4.2.4, `md` = 48rem | `node_modules/tailwindcss/package.json:3`, `theme.css:328` |
| Isi image 2 belum ada sama sekali | cari "Lihat Semua" / "Tonton Sekarang" / "Drama Terpopuler" → nol hasil |

❓ **Belum terverifikasi** — gerbang pra-rilis BELUM bisa dijalankan: drive `C:` penuh
(`ENOSPC`), sehingga Bash/PowerShell mati total di sesi ini. Semua perubahan di bawah
ditulis dari pembacaan kode, **belum** dibuktikan lewat `npm run gerbang`.

## 1. Keputusan owner (popup 2026-11-21)

| Pertanyaan | Jawaban owner |
|---|---|
| Banner besar bergambar di atas | **TIDAK USAH** — atas tetap baris poster yang sekarang |
| Bagian putih (tab + grid) di HP | **DIGANTI** baris geser gelap; FILTER pindah ke menu bawah |
| Banner promo "Kamu Pasti Bisa" | **JANGAN dipasang** (menguatkan keputusan 2026-09-08: halaman depan nol iklan) |
| Menu bawah HP | **Home · Series · Movies · Filter · Profile** (Share diganti Profile) |

## 2. Pre-mortem (1 kalimat, §4.4)

*Anggap semuanya sudah dikerjakan dan hasilnya NOL guna bagi owner — penyebab paling
mungkin?* **Halaman komputer ikut berubah.** Semua komponen di sini dipakai bersama
`/discover`, `/film`, `/katalog`, `/shorts`, `/history`, `/my-list`; satu kelas yang
tidak dibatasi `md:` akan memutihkan atau menggelapkan halaman yang owner bilang "sudah
ok". → Masuk rencana sebagai pagar: **tiap perubahan warna/tata letak WAJIB dibatasi
`max-md:` atau `md:`, dan tidak satu pun menyentuh `BADAN_TERANG` yang lama.**

## 3. Yang dikerjakan

### 3.1 Badan halaman depan gelap di HP, terang mulai 768px
- `app/globals.css` — varian `terang:` jadi blok dua cabang: `.tema-terang` (lama, semua
  ukuran) **dan** `.tema-terang-md` (baru, hanya `@media (width >= 48rem)`).
- `shell.ts` — konstanta baru `BADAN_TERANG_MD`. `BADAN_TERANG` lama **tidak disentuh**.
- `BadanKatalog.tsx` — pakai konstanta baru.

Kenapa lewat varian, bukan menggambar dua susunan (`md:hidden` + `hidden md:block`):
dua susunan berarti seluruh kartu poster terkirim DUA KALI ke tiap pengunjung, `id`
seksi jadi kembar (lompatan `#seksi-…` rusak), dan tiap tes yang menghitung kartu ikut
berlipat. Satu DOM yang temanya berganti mengikuti lebar layar: nol duplikat.

### 3.2 Deret tab + tombol FILTER hilang dari HP (halaman depan saja)
Prop baru `tabHanyaDesktop` di `TabKatalogTampilan` + diteruskan `TabKatalog`.
**Harus prop, bukan diubah langsung**: `TabKatalogTampilan` juga dipakai `/katalog`
(`app/katalog/page.tsx:55`) — menyembunyikannya di sana akan mencabut satu-satunya
navigasi tab halaman itu di HP, tanpa satu pun error.

Nol fitur hilang: dalam mode `seksiLengkap` SEMUA tab tetap digambar sebagai seksi
bertumpuk, jadi deret tab cuma pintasan lompat. FILTER-nya pindah ke menu bawah.

### 3.3 Tombol "Semua" jadi "Lihat Semua ›" di HP
`SeksiKatalog.tsx` — di HP bergaya tautan teks (seperti image 2), dari `md:` ke atas
tetap tombol gradasi merah muda seperti sekarang.

### 3.4 Menu bawah 5 tombol
`BottomNav.tsx`: Home `/beranda` · Series `/katalog` · Movies `/film` ·
Filter `/discover` · Profile `/profile`.
Lebar kolom & penanda aktif sudah mengikuti `TABS.length`, jadi 2→5 tidak perlu
disentuh. Penjaga `tests/kepala-situs.test.ts:632` yang mematok "2 tab" diperbarui ke 5
— yang dijaga tetap sama (Shorts & My List tidak kembali, kolom mengikuti jumlah tab).

### 3.5 Kepala situs HP: bar gelap + strip kuning disembunyikan
`PublicTopBars.tsx` & `KepalaBeranda.tsx` menambah `max-md:bg-none max-md:bg-zinc-950`
dan membungkus `StripKatalog` dengan `hidden md:block`.
Ditaruh di PEMANGGIL, bukan di dalam `SearchBar`/`StripKatalog`: kedua komponen itu
dipakai juga oleh `/discover` & kerangka pemuatan — mengubahnya di dalam akan menggelapkan
halaman yang tidak diminta. Genre tetap terjangkau lewat menu "Genre" di bar dan tombol
Filter di menu bawah.

### 3.6 Putaran kedua — koreksi owner sesudah melihat layarnya

Owner: *"tulisan search cari film di dramaku harus terlihat dan dropdown-nya kamu
sembunyikan saja, ketika saya klik M [muncul] profil, riwayat, favorit, admin dan keluar"*.

- `MenuAkun.tsx` — panah `ChevronDown` dilepas; avatar tetap pemicunya. Isi menu
  (`TUJUAN_AKUN`) **tidak disentuh sama sekali** — Admin & Keluar tetap di tempatnya,
  dan avatar ini satu-satunya jalan ke keduanya di `/beranda` & `/discover`
  (`KepalaKatalog.tsx:99`). Padding jadi `p-1` + `sm:pr-3` supaya ruang yang dibebaskan
  jatuh ke kotak cari.
- `SearchBar.tsx` — di HP, saat kotak cari TERBUKA, kelompoknya turun ke baris sendiri
  di dalam bar (`max-md:order-3 max-md:w-full max-md:flex-none`), dan trailing diberi
  `max-md:ml-auto` supaya koin + avatar tidak merapat ke logo. Dari `md:` ke atas nol
  perubahan.

Kenapa bukan memendekkan tulisannya: `TEKS_KOTAK_CARI` satu sumber untuk SELURUH situs
dan dipatok tes — memendekkannya mengubah empat bar sekaligus, padahal yang bermasalah
cuma lebarnya di HP.

### 3.7 Putaran ketiga — logo jadi pembuka menu, avatar khusus admin

Owner: *"ketika di klik D keluar genre, series, populer, negara dan icon M
dihilangkan karena viewer tidak perlu buat akun"* → *"ini khusus untuk viewer bukan
akun admin"*.

- `SearchBarChrome.brandHp` (prop BARU) + state `menuHpTerbuka` di `SearchBar.tsx`:
  di HP logo jadi `<button>` pembuka deretan menu; deretannya `max-md:hidden` sampai
  dibuka. Pemakai yang TIDAK mengirim `brandHp` berlaku apa adanya — syarat
  `chrome.brandHp && !menuHpTerbuka` mencegah halaman lain kehilangan menunya.
- `LogoDramaKu({ tanpaTautan })`: logo tanpa `<Link>`, sebab `<a>` di dalam `<button>`
  HTML tidak sah.
- `TombolAkun`: `user.role === "admin" && <MenuAkun />`.

🪤 **Percobaan pertama `max-md:hidden` pada avatar itu SALAH ARAH** dan klarifikasi owner
yang menyelamatkannya: menyembunyikan dari semua orang mencabut satu-satunya jalan ke
Admin & Keluar dari `/beranda` + `/discover` di layar komputer. Saringan PERAN menjawab
permintaan owner tanpa efek samping itu.

### 3.8 Putaran keempat — menu katalog jadi PANEL POP UP

Owner: *"jangan di jadikan dropdown tapi seperti pop up aja biar terlihat keren"*.

Diputuskan lewat fan-out 10 agen (telusur → 3 rancangan bersaing → juri → 3 penantang).
Pemenang: **bottom sheet + akordeon `<details>`**, memakai `components/ui/sheet.tsx`
(Radix Dialog) yang sudah terpasang — nol paket baru.

- `app/components/beranda/MenuKatalogHp.tsx` (BARU) — isi panel: 6 grup berikon,
  akordeon satu-terbuka, chip 2–3 kolom dari `kolom`+`lebarNama`, bilah "Tutup" di dasar.
- `SearchBar.tsx` — slot `menusHp` + `<Sheet>` membungkus pemicu logo yang sudah ada.
  `panelHpAktif` dipakai DUA tempat supaya syarat "sembunyikan deretan menu" dan
  "gambar pemicunya" mustahil menyimpang.
- `KepalaKatalog.tsx` & `PublicTopBars.tsx` — isi `menusHp`; `menus` & `menusHp` jadi
  `undefined` saat katalog kosong.
- `tests/menu-katalog-hp.test.ts` (BARU, 8 patokan) + `tests/kerangka-discover.test.ts`
  diperbaiki (dulu mengoper katalog kosong lalu menuntut elemen menu tetap ada).

🪤 **Tiga penjaga jatuh kalau panel dibuat "selalu di HTML lalu disembunyikan CSS"** —
baris ekor `{ label: "Lainnya", href: "/discover" }` yang polos (`lib/nav-katalog.ts:258`)
dan sembilan teks terlarang (`>Amerika<` dkk). Radix melepas isi panel saat tertutup, dan
itulah yang menyelamatkannya. **JANGAN pasang `forceMount`.**

🪤 **`md:hidden` di PEMICU, bukan di `SheetContent`** — kalau salah, tirai
`fixed inset-0 bg-black/50` tertinggal dan layar komputer gelap total tanpa error.
Diuji-balik: penjaganya memang merah saat dirusak.

⚠️ Lingkupnya melebar ke `/film`, `/katalog`, `/drama`, `/tonton` karena
`KepalaFilm.tsx:61` merender `KepalaBeranda` yang sama. Dipertahankan demi keseragaman
kepala situs (alasannya tertulis di berkas itu); bisa dibatasi lewat prop opt-in kalau
owner minta.

## 4. Yang TIDAK dibangun (sengaja)

- Banner besar bergambar + tombol "Tonton Sekarang" — ditolak owner.
- Banner promo tengah halaman — ditolak owner; keputusan 2026-09-08 tetap berlaku.
- Menu bawah di `/` untuk tamu — `/` memang sengaja tanpa navigasi bawaan
  (`lib/navigasi-halaman.ts:101`); owner tidak memintanya.
- `/film`, `/katalog`, `/discover`, `/shorts`, `/history`, `/my-list` tetap PUTIH di HP.
  Owner hanya menunjuk halaman depan. Kalau nanti diminta seragam: ganti `BADAN_TERANG`
  → `BADAN_TERANG_MD` di berkas-berkas itu, satu baris masing-masing.

## 5. Yang ikut tersenggol

| Fitur yang owner kenal | Penjaganya |
|---|---|
| `/katalog` (tab + grid penuh) | ada — `tabHanyaDesktop` tidak dikirim dari sana; `tests/filter-katalog.test.ts:100` |
| `/discover` tetap putih | ada — tidak memakai `BadanKatalog`; `tests/badan-terang.test.ts:21` |
| Navigasi bawah tiap halaman | ada — `tests/kepala-situs.test.ts:296` menyusur SELURUH route di disk |
| Strip kuning masih tergambar di HTML | ada — `tests/kepala-situs.test.ts:670` (disembunyikan CSS, bukan dihapus) |
| Teks hilang di latar putih | ada — `tests/badan-terang.test.ts:70` |

## 6. Gerbang — hasil sebenarnya

| Pemeriksa | Hasil |
|---|---|
| `npx vitest run` atas 6 berkas tes terdampak | ✅ **exit 0 · 183 tes lulus** |
| `npx tsc --noEmit` | ✅ **nol error dari berkas yang diubah** (3 error ada, semuanya milik 2 tes `??` sesi lain) |
| Dilihat mata di HP | ✅ **owner mengirim tangkapan layarnya** — latar hitam, "Lihat Semua ›", 5 tombol bawah |
| `npm test` penuh | ❌ belum — dibatalkan owner |
| `npm run build` | ❌ belum |

Enam berkas itu: `badan-terang`, `kepala-situs`, `filter-katalog`, `strip-katalog`,
`tombol-cari`, `menu-akun`.

🪤 Menjalankan 4 berkas tes bersamaan sempat gagal SEMUA dengan `TypeError: Cannot read
properties of undefined (reading 'config')` di baris `describe`. Satu per satu: keempatnya
exit 0; diulang bersamaan: 183 lulus. Gangguan sesaat worker vitest (mesin dipakai beberapa
sesi sekaligus), bukan kode — jangan dikejar.

🪤 **`npm run gerbang` tidak boleh dijalankan selagi `next dev` hidup** — langkah
pertamanya menghapus `.next` yang sedang dipakai server itu (saat sesi ini: `next dev
-p 3010`, PID 43264, milik sesi lain). Hentikan dulu, atau build di worktree terpisah.
