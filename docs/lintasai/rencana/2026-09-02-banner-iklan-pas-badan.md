# Banner iklan: kotak "pas-badan" mengikuti bentuk gambar

**Tanggal:** 2026-09-02 · **Bobot:** SEDANG (`AdCreative` = fungsi bersama, 6 titik render di 4 halaman) · **Status:** SELESAI & terbukti lokal, belum di-push

## Masalah

Owner melihat slot IKLAN di `/beranda`: gambar iklan tampil kecil di tengah, kiri-kanan lebar dan buram. Minta gambar "sesuai tempatnya, jangan melebihi batas, enak dilihat dan presisi".

**Akar (terverifikasi dari kode, bukan tebakan):**

`AdCreative.tsx` lama memakai ambang `WIDE_THRESHOLD = 2.4`. Gambar iklan owner rasionya **±1,9 : 1** → di bawah ambang → jatuh ke cabang "kartu sinematik" dengan tinggi **dipaku 160 px** (`h-36 sm:h-40`), lalu gambar dipasang `h-full w-auto`.

Akibatnya lebar gambar = 160 × 1,9 ≈ **307 px** di dalam slot **1232 px**. Sisa ±75% area ditutup gambar yang sama, di-blur & di-zoom (`scale-125 object-cover blur-2xl`). Itulah smear warna yang dilihat owner. Blur itu **penutup gejala**, bukan solusi.

## Keputusan owner

Disajikan 3 pilihan bentuk lewat popup; owner memilih **"kotak pas-badan"** — kotak menyusut mengikuti bentuk gambar, gambar mengisi 100% kotaknya, nol area blur. Cakupan: **iklan saja** (logo tidak disentuh; sudah dicek `logo-mark.png` 256×256 + `object-contain` → rasionya memang sudah aman).

Ditolak sengaja: `object-cover`/crop. Iklan penuh teks & tombol CTA — memotongnya merusak pesan pengiklan.

## Yang dikerjakan (3 berkas)

**1. `app/components/AdCreative.tsx`** — inti perbaikan.
- Cabang landscape (rasio ≥ 2,4) **dipertahankan** → banner 1200×300 tetap melebar penuh, tanpa regresi.
- Cabang lain: dua lapis blur + overlay `bg-black/30` **dibuang**, diganti satu kotak yang bentuknya = bentuk gambar (`aspectRatio` + lebar definit `MAX_CARD_H × rasio`, `maxWidth: 100%`).
- Konstanta bernama: `MAX_CARD_H` (288 px — **satu-satunya tombol** untuk memperbesar/memperkecil iklan non-landscape), `FALLBACK_RATIO` (4), `MIN_RATIO` (0,6).
- Rasio kini disimpan **bersama `src`-nya** (`{src, ratio}`), bukan angka telanjang — supaya di pratinjau admin, saat URL diketik ulang, bentuk gambar LAMA tidak sempat dipakai untuk gambar BARU.

**2. `app/components/AdBanner.tsx`** — bingkai ikut menyusut. Cabang house-ad bergambar kini 2 elemen; `shell` (raw/adsense/promo) memakai `cn()`.

**3. `app/components/SponsorAdsManager.tsx`** — pratinjau admin disamakan (`mx-auto w-fit max-w-full`) + 2 teks petunjuk yang menjanjikan "latar blur" / "kartu sinematik" diperbaiki, karena keduanya sudah tidak ada.

## ⚠️ PELAJARAN: regresi yang sempat lolos ke tahap uji

**Percobaan pertama menaruh `w-fit max-w-full` langsung di `<a>` bingkai, digabung dengan `className` dari pemanggil lewat `cn()`. Itu SALAH dan bikin halaman HP bisa digeser ke samping.**

Sebabnya: [BerandaRows.tsx:226](../../../app/components/BerandaRows.tsx#L226) mengirim `className="mx-auto max-w-7xl"`. `max-w-7xl` dan `max-w-full` adalah **properti CSS yang sama** (`max-width`) → tailwind-merge membuang salah satu, dan class pemanggil menang. `max-w-full` hilang → idiom `w-fit` kehilangan pengamannya → bingkai melebar ke 552 px di layar 390 px.

**Perbaikannya: pisahkan dua batas itu ke DUA elemen** — pembungkus luar memegang batas dari pemanggil, `<a>` bingkai memegang `w-fit max-w-full` yang tak bisa diganggu.

**Aturan umum yang layak diingat:** kalau sebuah komponen menerima `className` dari pemanggil DAN butuh pengaman di properti CSS yang sama, jangan gabungkan keduanya di satu elemen — `cn()` akan memilih salah satu pemenang, dan yang kalah hilang **tanpa error apa pun**.

**Cara regresi ini ketahuan:** pemeriksaan otomatis `document.documentElement.scrollWidth > clientWidth`, dibandingkan langsung terhadap kode lama lewat `git stash`. Tanpa pembandingan itu, angka 568 px mudah dikira "sudah dari sananya".

## Bukti

**Mesin:** `npx tsc --noEmit` exit 0 · `npm test` **390 tes / 33 berkas lulus** · `npm run build` sukses, 63 halaman.

**Visual (Playwright + Chrome, iklan palsu disuntik lewat route interception, gambar uji diberi penanda sudut TL/TR/BL/BR untuk mendeteksi pemotongan):**

3 bentuk gambar (1200×628 = kasus owner · 1200×300 landscape · 600×750 potret) × 2 layar (1577 px & 390 px) × semua slot iklan di `/beranda` (ada 3) dan `/drama/[id]`:

- **`/beranda`: 0 masalah dari 24 pemeriksaan** — semua `isiPenuh=YA`, `dalamBatas=YA`, `blurLatar=0`, `geserSamping=TIDAK`.
- Ukuran nyata: 2:1 → 552×290 (desktop) / 358×188 (HP) · 4:1 → **1202×302, tetap melebar penuh** · potret → 232×290 (terbatas rapi, tidak jadi kotak raksasa).
- Keempat penanda sudut terlihat di semua kasus → gambar tidak pernah terpotong.

## Temuan sampingan — BUKAN dari perubahan ini, belum diperbaiki

`/drama/[id]` bisa digeser ke samping (`scrollWidth` 1680 di desktop, 1106 di HP). **Terbukti sudah ada sebelumnya:** diuji dengan iklan dan tanpa iklan sama sekali, angkanya **identik**. Elemen terjauh = `button.inline-flex shrink-0 …` (baris tombol episode), tidak berhubungan dengan slot iklan. Di luar cakupan permintaan owner, dicatat di sini supaya tidak hilang.

## Sisa yang sengaja TIDAK dikerjakan

**Loncatan kecil saat halaman pertama dimuat masih ada.** Rasio gambar baru diketahui browser setelah gambarnya selesai diunduh, jadi kotak sempat memakai `FALLBACK_RATIO` dulu (gambarnya disembunyikan `opacity-0` supaya tidak berkedip, tapi tingginya tetap menyesuaikan sekali).

**Penghilang tuntasnya:** simpan lebar & tinggi gambar ke data iklan saat admin menambahkannya, supaya server sudah tahu bentuknya sebelum halaman dikirim. Menyentuh `lib/store.ts` (`SponsorAd` + 2 field opsional) dan `app/api/admin/ads/route.ts`. Pekerjaan terpisah, menunggu owner.

Juga tidak disentuh: `RewardedAdModal` (punya pola blur 16:9 sendiri di modal sempit, tidak memakai `AdCreative` — di sana blur memang masuk akal) · pemindahan `<img>` ke `next/image` (URL iklan bebas dari admin, `images.remotePatterns` cuma mengizinkan 3 host → iklan dari host lain akan langsung gagal tampil) · temuan XSS lama `NEXT_PUBLIC_AD_BANNER_HTML` (sudah tercatat di `docs/decisions/2026-06-20-audit-findings.md`).
