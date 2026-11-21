# Tampilan HP halaman depan ala "image 2" (owner 2026-11-21)

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
| `npx vitest run` atas 6 berkas tes terdampak | ✅ **exit 0 · 182 tes lulus** |
| `npm test` penuh | ❌ belum — drive `C:` penuh saat dijalankan |
| `npx tsc --noEmit` | ❌ belum — sebab yang sama |
| `npm run build` | ❌ belum — sebab yang sama |
| Dilihat mata di HP | ❌ belum |

Enam berkas itu: `badan-terang`, `kepala-situs`, `filter-katalog`, `strip-katalog`,
`tombol-cari`, `jenis-video`.

🪤 **`npm run gerbang` tidak boleh dijalankan selagi `next dev` hidup** — langkah
pertamanya menghapus `.next` yang sedang dipakai server itu (saat sesi ini: `next dev
-p 3010`, PID 43264, milik sesi lain). Hentikan dulu, atau build di worktree terpisah.
