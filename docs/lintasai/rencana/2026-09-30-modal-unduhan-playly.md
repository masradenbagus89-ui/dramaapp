# Popup unduhan Playly mengambang + warna #e50b4b — 2026-09-30

Bobot: **SEDANG** (6 berkas · menyentuh komponen bersama yang dipakai 3 pemanggil di halaman
yang SUDAH tayang · bukan titik-risiko: nol sentuhan ke login/pembayaran/skema DB).

## Permintaan & koreksi premis

Owner meminta "popup download di halaman post film **tema WordPress Playly**": child theme,
meta box di editor post, `wp_enqueue_style`/`wp_enqueue_script` di `functions.php`, escaping
`esc_url`/`esc_html`.

**Premisnya dikoreksi — proyek ini BUKAN WordPress.** Dibuktikan sebelum menyentuh kode:
`find` untuk `wp-config.php` / `wp-load.php` / `wp-content/` / `functions.php` = **nol hasil**,
jumlah berkas `.php` = **0**. Yang ada: Next.js 16.2.9 + React 19.2.4 + Tailwind 4 + Supabase
(`package.json`). "Playly" di sini nama **penyedia video pihak ketiga**, bukan nama tema.

Padanan tiap bagian permintaan di platform sesungguhnya:

| Diminta (WordPress) | Padanan nyata di proyek ini |
|---|---|
| child theme (lindungi dari update tema) | tidak perlu — tak ada tema induk yang bisa tertimpa |
| meta box di editor post | panel admin `/admin/videos/playly` (sudah ada sejak 2026-09-26) |
| `wp_enqueue_style` / `wp_enqueue_script` | Next.js memuat CSS & JS per komponen otomatis |
| `esc_url` / `esc_html` | React meloloskan teks otomatis; alamat disaring `isHttpUrl` (`lib/types.ts:135`) |

Owner mengonfirmasi lewat popup bahwa yang dimaksud **memang proyek Next.js ini**.

## Keadaan awal (✅ terverifikasi dari kode)

Fitur inti **sudah ada** dari sesi 2026-09-26 dan belum di-commit. Yang sudah cocok dengan
permintaan: tabel PROVIDER | DOWNLOAD · header pink · tombol biru/oranye · link per video
(bukan HTML) · form pengisian di panel admin · provider kosong tidak digambar ·
`target="_blank" rel="noopener noreferrer"` · tombol × · rapi di HP.

Yang **belum** cocok, dan itulah lingkup sesi ini:

1. ❌ Bentuknya panel **inline**, bukan popup mengambang.
2. ❌ Tak ada area gelap yang bisa diklik untuk menutup.
3. ❌ Tak ada tombol **Escape**.
4. ⚠️ Header `bg-pink-600` = `#db2777`, bukan `#e50b4b` yang diminta.
5. ❌ Tombol belum bergradasi.
6. ⚠️ Label `Download 1080p` (huruf kecil) vs `DOWNLOAD 1080p` yang diminta.

## Keputusan owner (lewat popup + pratinjau interaktif)

Owner diberi **pratinjau HTML statis di luar repo** berisi 4 sakelar, supaya memutuskan dengan
melihat alih-alih membayangkan. Hasilnya:

| Keputusan | Pilihan owner |
|---|---|
| Bentuk | **popup mengambang berlatar PUTIH** (senada kotak info Playly, bukan gelap seperti `DownloadModal`) |
| Warna kepala tabel | **#e50b4b di Playly DAN halaman drama** — seragam, bukan cuma satu tempat |
| Tombol provider | **bergradasi di kedua tempat** |
| Video saat popup terbuka | **dibiarkan jalan** (tidak dijeda) |

Alasan "dibiarkan jalan" dipilih dengan biayanya di depan mata: menjeda menuntut `PlaylyPlayer`
(455 baris, dipakai `/playly` & `/discover`) diberi prop jeda baru **dan** state popup dipindah
naik dari `InfoVideoPlayly` ke `PlaylyVideoGrid` — 3 berkas tambahan termasuk pemutar inti.
`PlaylyPlayer` sekarang **tidak** menyediakan cara menjeda dari luar (nol `forwardRef`, nol prop);
ia hanya punya `pause()` internal di `:156-157`. Menambahkannya nanti tetap bisa tanpa
membongkar popupnya.

## Yang dikerjakan

**BARU — `app/components/unduhan-kelas.ts`.** Satu sumber untuk `KELAS_KEPALA_TABEL` (#e50b4b),
`KELAS_WARNA_TOMBOL` (gradasi biru & oranye), dan `labelTombolProvider`. Sebelumnya `KELAS_WARNA`
ditulis **dua kali identik** di `DownloadModal.tsx:16-19` dan `PanelProviderPlayly.tsx:36-39`,
dan warna kepala dua kali lagi — empat tempat untuk satu keputusan tampilan. Hex ditulis langsung
(`bg-[#e50b4b]`), **bukan** token di `globals.css`: nilainya hidup di satu baris, jadi lapisan
token cuma menambah satu tempat lagi untuk dicari.

**GANTI NAMA + ubah isi — `PanelProviderPlayly.tsx` → `ModalProviderPlayly.tsx`.** Nama "Panel"
menyesatkan begitu ia jadi jendela mengambang. Diganti **sekarang** karena berkasnya belum
di-commit → nol jejak rename di sejarah git. Isinya: `fixed inset-0 z-50 bg-black/80` +
kotak `bg-white` + `role="dialog" aria-modal="true"` + `useEffect` Escape + klik overlay +
`stopPropagation` di kotak. Komentar kepala berkas **ditulis ulang** — versi lama berisi alasan
memilih inline, dan membiarkannya akan menyesatkan sesi berikutnya untuk membalikkannya.

**DIUBAH — `InfoVideoPlayly.tsx`.** Root jadi fragment `<>` supaya popup jadi **saudara** kotak
putih, bukan anaknya (alasan di PRE-MORTEM). `aria-controls` dilepas, diganti
`aria-haspopup="dialog"`. State `panelTerbuka` → `popupTerbuka`. `useId` dihapus (tak lagi
dipakai — jangan tinggalkan dead code).

**DIUBAH — `DownloadModal.tsx`.** `KELAS_WARNA` lokal & hex header dihapus, ketiganya diambil
dari berkas bersama. Akibatnya header **dan** gradasi tombol ikut berubah di halaman drama —
disetujui owner secara eksplisit.

## PRE-MORTEM

Hasil ini nol guna kalau **popupnya tergambar di BELAKANG pemutar**. Sudah pernah terjadi di
proyek ini: `app/drama/[id]/page.tsx:219` mencatat `position: sticky` **selalu** membuat
stacking context, dan `z-50` di dalamnya kalah dari elemen ber-`z` lebih rendah di luarnya.
Karena itu popup dipasang **di luar** `<section>` kotak putih, dan tes mengunci posisinya
(`container.querySelector("section")!.contains(popup)` harus `false`).

Risiko kedua: `bg-[#e50b4b]` **tidak ikut dibundel** Tailwind. Kegagalannya senyap — nol error,
kepala tabel cuma jadi transparan. Dibuktikan langsung dari CSS terkompilasi, bukan diasumsikan.

## Yang TIDAK dibangun

- Child theme, meta box, `functions.php`, `wp_enqueue_*`, `esc_url`/`esc_html` — API WordPress,
  tak ada di Next.js. Padanannya sudah ada (tabel di atas).
- Plugin/paket baru — **nol**. Semuanya memakai yang sudah terpasang.
- Mengisi link Google Share / Telegram / Cast / Mega di produksi — pekerjaan owner di panel
  admin. Link contoh di data produksi DILARANG (aturan rencana 2026-09-26).
- `app/globals.css` — tidak disentuh.
- Menjeda video saat popup terbuka (keputusan owner, biayanya tercatat di atas).
- Focus trap / mengembalikan fokus ke tombol saat popup ditutup — `DownloadModal` juga belum
  punya; kalau ditambah, tambahkan di **keduanya** sekaligus supaya tak lahir dua perilaku.

## Yang ikut tersenggol

| Fitur yang owner kenal | Yang berubah | Penjaganya |
|---|---|---|
| Tombol DOWNLOAD pink halaman drama | kepala tabel #e50b4b + tombol bergradasi | `tests/download-modal-render.test.ts` |
| Ikon Unduh di pemutar drama (`ActionRail`) | sama — komponen modalnya satu | `tests/unduhan-pemasangan.test.ts` |
| Kotak info di bawah pemutar Playly | popup tak lagi mendorong isi kotak ke bawah | `tests/playly-info-video.test.ts` |
| Penyaring `parseDownloadProviders` | **nol** — tidak disentuh | `tests/playly-unduhan.test.ts`, `tests/unduhan.test.ts` |

## Tes yang maknanya DIBALIK (bukan dihapus)

Dua tes lama bertentangan dengan bentuk baru. Keduanya **diganti penjaga kebalikannya**, bukan
dibuang diam-diam — supaya sesi berikutnya tahu bentuk ini keputusan, bukan kelalaian:

1. `"panel digambar DI DALAM kotak keterangan, bukan sebagai jendela mengambang"` yang
   secara eksplisit melarang `fixed` → jadi `"digambar sebagai jendela MENGAMBANG di luar
   kotak keterangan"`.
2. `"tombol Simpan tetap bisa ditekan saat panel terbuka"` → dengan `aria-modal="true"` itu
   justru SALAH (isi di belakang jendela tidak boleh dioperasikan). Diganti tiga tes: tombolnya
   tidak hilang · kembali berfungsi sesudah popup ditutup · membuka popup tidak ikut mengubah
   keadaan Simpan.

Tes baru: Escape menutup · klik area gelap menutup · klik DI DALAM kotak TIDAK menutup ·
`role="dialog"` + `aria-modal` + `aria-haspopup` benar.

## Bukti (dijalankan, bukan dibaca)

- `npx tsc --noEmit` → **exit 0**.
- `npm test` → **1029 tes / 69 berkas HIJAU** (naik dari 1024; +5 tes penjaga bentuk popup).
- Tes berkas terdampak dijalankan terpisah lebih dulu → **94 tes / 5 berkas** hijau.
- **Kelas Tailwind terbukti dikompilasi**, diambil dari CSS dev server yang hidup:
  `.bg-\[\#e50b4b\] { background-color: #e50b4b; }` ada, plus `from-blue-500` · `to-blue-700` ·
  `from-orange-400` · `to-orange-600`. Ini yang menutup risiko kegagalan senyap di PRE-MORTEM.
- ❌ **BELUM diuji:** unduhan sungguhan dari provider (tak ada link asli — link di
  `data/playly.json` semuanya `https://example.com/...`), dan tampilan di browser sungguhan
  termasuk apakah popupnya benar-benar di DEPAN pemutar. Keduanya butuh mata owner.

## Jebakan alat yang tertangkap sesi ini

1. **`start-localhost-3010.bat` menyalakan port 3055, bukan 3010.** Namanya menyesatkan siapa
   pun yang membukanya.
2. **Port 3010 dipakai proyek lain** (`Football Bot Dashboard`). Semua halaman DramaKu di sana
   404 — wajar, bukan DramaKu yang rusak. Hampir jadi laporan "halaman /playly rusak".
3. **`next build` di Next 16 tidak punya opsi `--distDir`** (cuma
   `--experimental-debug-memory-usage`), jadi build **pasti** menulis ke `.next` yang sedang
   dipakai dev server → jebakan 2026-09-25 (semua halaman localhost jadi Internal Server Error)
   tidak bisa dihindari dengan direktori terpisah. Yang bisa: hentikan dev server dulu.
4. **`tsc` bisa dijalankan sebelum `build`** asal `.next/types/routes.d.ts` sudah ada dari
   build/dev sebelumnya. Urutan build→tsc di `AGENTS.local.md` aturan 6 tetap benar untuk
   `.next` yang BARU dihapus; yang salah cuma menganggapnya mutlak.
5. **CSS dev mode Next 16 ada di `/_next/static/chunks/...css`**, bukan `/_next/static/css/...`.
   Pola grep untuk build produksi tidak menemukannya.
