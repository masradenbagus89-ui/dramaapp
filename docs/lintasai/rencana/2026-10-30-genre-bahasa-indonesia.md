# 2026-10-30 — Nama genre diindonesiakan di seluruh tampilan penonton

**Permintaan owner:** *"ubah bagian genre ke bahasa indonesia agar sinkron semua
menggunakan bahasa indonesia"* — disertai tangkapan layar menu **Genre** di bar
merah (Action · Romance · Tycoon · Comedy · Harem · Time Travel · Adventure · Horror).

**Status:** ✅ **DIRILIS 2026-10-30 di `5088bf2`** — dual push `ee6fbc5..5088bf2` ke `origin`
dan `dramaku`, Railway build sendiri, tayang ~90 detik, **downtime NOL**.
**Rencana mundur 1 baris:** `git revert 5088bf2` lalu dual push (nol perubahan database/env).

---

## Inti masalahnya: satu kata dipakai untuk dua hal

Nama genre di katalog bukan sekadar tulisan. Nilai yang sama dipakai:

| Dipakai untuk | Contoh | Boleh diterjemahkan? |
|---|---|---|
| Tulisan yang dibaca penonton | chip "Action" di menu | ✅ ya — ini yang diminta |
| Nilai penyaring di alamat URL | `/discover?cat=Action` | ❌ TIDAK |
| Mencocokkan "Drama Terkait" | `lib/film-terkait.ts` | ❌ TIDAK |
| Mencari warna aksen genre | `lib/genre-accent.ts` | ❌ TIDAK |
| Mencocokkan ketikan pencarian | `lib/discover.ts` | ❌ tidak menggantikan — DITAMBAH |

Kalau label ikut masuk ke alamat, hasilnya **rusak senyap**: chip "Aksi" tergambar
rapi, diklik, lalu memulangkan halaman hampa. Tidak ada pesan error, tidak ada
yang melapor. Project ini sudah pernah menyelesaikan persoalan yang sama persis
untuk nama negara — `lib/negara.ts` (`labelNegara`), dan aturannya tertulis di
`lib/nav-katalog.ts` pada definisi `NavItem`.

## Yang dikerjakan

**1. `lib/genre.ts` (BARU)** — kembaran `lib/negara.ts`:

- `labelGenre(nama)` — satu genre. Nama di luar daftar dipulangkan **apa adanya**,
  bukan dibuang, supaya katalog yang tumbuh tak kehilangan chip.
- `labelGenreGabungan(teks)` — untuk kolom `drama.genre` milik OMDb yang isinya
  berkoma ("Action, Adventure, Horror"). Tanpa pemecahan koma, teks gabungan tak
  akan pernah cocok dengan kunci mana pun dan **lolos tanpa diterjemahkan** —
  persis jenis kegagalan yang tak pernah dilaporkan siapa pun.

Daftar terjemahan (yang ada di katalog 2026-10-30): Action→**Aksi** ·
Romance→**Romantis** · Tycoon→**Taipan** · Comedy→**Komedi** ·
Time Travel→**Lintas Waktu** · Adventure→**Petualangan** · Horror→**Horor** ·
Fantasy→**Fantasi** · Sci-Fi→**Fiksi Ilmiah** · + 20 genre OMDb lain yang wajar menyusul.

**Sengaja TIDAK diterjemahkan:** `Harem`, `Thriller`, `Anime` — kata Inggrisnya
sudah jadi istilah sehari-hari penonton Indonesia; memaksakan padanan justru
membuat genre-nya tak dikenali.

**2. Dipasang di 13 tempat yang dibaca penonton:** menu Genre di bar merah ·
strip kuning · dropdown Filter `/beranda` · kolom "Genre Populer" di kaki situs ·
tulisan di bawah judul tiap kartu poster (3 komponen kartu) · chip genre di
halaman drama/film · kolom Terpopuler · baris "Trending di …" · keterangan
penyaring di judul `/discover` · kartu & grid video Playly · halaman `/tonton`.

**3. Pencarian ikut dibuka** (`lib/discover.ts`, `HasilPlayly.tsx`): sejak kartu
berbunyi "Aksi", penonton akan mengetik "Aksi". Label Indonesia **ditambahkan**
sebagai bahan pencocokan — ejaan aslinya tetap bisa dicari.

## Yang SENGAJA tidak disentuh

- **Panel admin** masih berbahasa Inggris (dropdown kategori, kolom "Genre (OMDb)",
  lencana di daftar drama). Alasannya: di sana yang terlihat adalah **nilai yang
  benar-benar tersimpan di database**, dan kolom OMDb-nya teks bebas yang harus
  cocok dengan ejaan OMDb. Menampilkan "Aksi" sementara yang tersimpan "Action"
  membuat owner salah baca saat mencocokkan data. Bisa diubah kalau owner mau.
- **Nilai di database, alamat URL, dan pencocokan "Drama Terkait"** — lihat tabel
  di atas.

## Bukti

| Pemeriksaan | Hasil |
|---|---|
| `npm test` | **1.784 tes hijau** (122 berkas) |
| `npm run build` | sukses |
| `npx tsc --noEmit` | **exit 0** (dijalankan SESUDAH build — urutannya wajib begitu) |
| HTML asli dari server lokal | strip kuning: `href="/discover?cat=Action">Aksi<` — label Indonesia, alamat ejaan asli |
| `/beranda` HTML | **nol** genre Inggris yang terlihat penonton; "Action" tersisa hanya di dalam alamat & data mentah |
| Halaman drama | chip `>Aksi<` `>Horor<` `>Petualangan<` |

## Penjaga permanen yang ditinggalkan

`tests/genre-label.test.ts` (10 tes). Yang dijaga bukan selera terjemahannya,
melainkan dua kegagalan senyap:

1. **Label bocor ke alamat.** Tes render kaki situs & kartu drama memeriksa
   tulisannya Indonesia **sementara** `href`-nya tetap `?cat=Action`.
2. **Label dipakai mencari warna.** `genreTextClass("Action")` wajib ≠
   `genreTextClass("Aksi")` — kalau suatu saat ada yang memberi label ke fungsi
   itu, warnanya diam-diam jatuh ke putih cadangan.

Plus satu pagar untuk masa depan: **setiap** kategori di `CATEGORIES`
(`lib/types.ts`) wajib punya label. Owner menambah kategori baru → tes **merah**
sampai labelnya didaftarkan. Tanpa itu, kategori baru muncul di menu dalam bahasa
Inggris dan tak ada yang tahu.

Dan di `tests/nav-katalog.test.ts`: tiap pilihan di menu Genre dijalankan lewat
`bacaFilter` + `filterDariUrl` yang sama dengan halaman `/discover`, lalu
dipastikan memulangkan **minimal satu judul**. Itu pagar nyata atas label-vs-alamat.

## Yang ikut tersenggol

Tiga tes lama berubah merah karena memang mengecek tulisan Inggris yang baru
diganti — `tests/strip-katalog.test.ts`, `tests/playly-video-grid.test.ts`,
`tests/nav-katalog.test.ts`. Asersinya diperbarui ke label Indonesia; **tak satu
pun pagar dilonggarkan**, dan pagar alamat justru ditambah.
