---
nama: seo
deskripsi: SEO teknis kelas-industri — tiap halaman publik bisa ditemukan mesin pencari, cepat dibuka, dan link lama tak pernah mati saat URL berubah.
divisi: marketing
pemicu: [seo, sitemap, robots, meta-tag, meta-deskripsi, kata-kunci, backlink, core-web-vitals]
rawan_keamanan: false
menggantikan: [seo/temu-google]
---

# Skill: SEO — biar ditemukan di Google (baseline teknis)

> **Kapan skill ini aktif:** prompt menyentuh "biar muncul di Google / metadata halaman / sitemap / robots.txt / kecepatan halaman / URL berubah / redirect / kata kunci". Dispatcher `rak-pemicu` menyalakannya otomatis (staff tak perlu mengetik nama skill). `rawan_keamanan: false` — tak ada palang keamanan khusus di sini.
>
> 🙂 **Analogi:** SEO teknis = **papan nama + alamat + jalan mulus ke toko**. Kalau papan namanya kabur (metadata), alamatnya sering ganti tanpa pemberitahuan (URL putus), atau jalan menujunya macet (halaman lambat) — calon pembeli (dan Google) tak ketemu tokomu, sebagus apa pun barang di dalam.

Skill ini **advisory** (§4.17): otak native yang memutuskan adopsi/adaptasi/abaikan tiap butir 📐/💡. Butir **🔒 HASIL** = hasil yang tak boleh gagal apa pun caranya. Ini **baseline teknis on-page** (lantai profesional minimum); SEO strategi/off-page (riset kata kunci, backlink, analisa kompetitor) ada di luar baseline ini — lihat §2 dan §6.

---

## 1. Kontrak (yang HARUS benar — tulis DULU sebelum ubah halaman)

- 🔒 **HASIL — link lama JANGAN mati:**
  - **Input:** halaman publik (bisa diakses tanpa login) + URL-nya (alamat halaman).
  - **Output:** halaman bisa di-*crawl* (ditelusuri robot mesin pencari) + punya metadata jelas + URL stabil.
  - **Error/perubahan URL:** tiap kali URL publik berubah → **pasang redirect permanen (301)** (pengalihan otomatis dari alamat lama ke alamat baru). URL lama TAK boleh berakhir jadi *404* (halaman tak ditemukan) — link yang sudah tersebar & peringkat yang sudah terkumpul hilang diam-diam.
  - **Bukan rahasia:** metadata SEO (title/deskripsi/sitemap) memang untuk dibaca publik & robot — tak ada secret di sini (beda dari skill `auth`).

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **CARA BAKU — tiap halaman publik: metadata unik.** Title (judul tab/hasil-cari) unik + deskripsi ringkas (*meta description* = ringkasan 1-2 kalimat yang muncul di bawah judul hasil Google) + slug bersih (potongan URL yang bisa dibaca manusia: huruf kecil, kata dipisah dash `-`, bukan angka/ID acak).
2. 📐 **CARA BAKU — heading semantik berurutan.** Satu judul utama (`<h1>`) per halaman + sub-heading (`<h2>`/`<h3>`) tersusun rapi menurut ISI — **bukan** dipilih karena ukuran fontnya kelihatan pas. Robot & pembaca layar (untuk tunanetra) membaca struktur ini, bukan tampilannya.
3. 📐 **CARA BAKU — sitemap + robots.txt + preview share.** `sitemap.xml` (daftar semua halaman untuk robot) + `robots.txt` (aturan halaman mana boleh/tak boleh ditelusuri). Halaman yang bisa dibagikan → pasang metadata *OG* (*Open Graph* = judul + gambar + ringkasan yang tampil saat link di-share ke WhatsApp/Facebook/X).
4. 📐 **CARA BAKU — kecepatan (Core Web Vitals) dijaga.** *Core Web Vitals* = 3 ukuran pengalaman buka halaman yang dipakai Google: **LCP** (seberapa cepat isi utama tampil) · **INP** (seberapa responsif saat diklik) · **CLS** (seberapa "loncat" tata letaknya saat memuat). Optimalkan gambar/font/*bundle* (kumpulan berkas kode yang diunduh browser). Ambang angka pastinya JANGAN dikarang — ada di §1b/§10 aturan + `templates/STACK_GUIDE.md §6` (jangan salin dari ingatan; §8.2 A1).
5. 🔒 **HASIL — ubah URL publik = redirect 301 (lihat §1).** Ini yang paling sering lupa & paling mahal. Sebelum me-*rename* slug/route halaman yang sudah live → `Grep` string URL lamanya (§7.3a: teks yang jadi kunci → cari string literalnya), pasang 301, baru hapus yang lama.
6. 💡 **SARAN — SEO off-page di LUAR baseline ini.** Riset kata kunci, backlink, analisa kompetitor = keahlian pemasaran, bukan checklist teknis. Client yang punya keahlian SEO → bungkus jadi skill kustom (§4.9, `docs/SKILLS_LOCAL.md`) — jangan dipaksakan ke dalam baseline teknis ini.
7. 💡 **SARAN — menulis konten/copy off-page (anti "AI-slop").** *AI-slop* = tulisan hasil AI yang bertele-tele/generik/berpola khas robot. Ada template skill kustom siap-adopsi `templates/CONTENT_ANTISLOP_SKILL.md` (daftar-larang frasa AI-slop + gerbang mutu copy + crosspost + brand voice + source-first). Opt-in, bukan baseline. (MIT © Affaan Mustafa)

---

## 2b. SEO teknis lanjutan — schema · panjang title/meta · rantai-redirect · anti-kanibalisasi

> **MELENGKAPI §2, bukan dari nol.** Dasar SEO (metadata per-route, `metadataBase`, `robots.ts`, `sitemap.ts`, `lang`, canonical, OG, JSON-LD, breadcrumb, hreflang, heading, Core Web Vitals) ada di `templates/STACK_GUIDE.md` §6 + `generateMetadata`. Blok ini **menambah** 4 hal yang belum tercakup. Otomatis saat menyentuh halaman publik. **Anti-halusinasi (§8.2 A1):** sebelum klaim "tipe schema X butuh field Y" / "library next-seo punya fungsi Z" → cek dokumentasi resmi schema.org + versi library terpasang; validasi JSON-LD lewat Google Rich Results Test, jangan andalkan ingatan.
>
> Prinsip: perbaiki **penghalang teknis** (crawl/index/redirect/canonical) DULU, baru optimasi konten — percuma poles judul kalau halamannya tak ter-index. Tiap halaman = **satu maksud-pencarian (*search intent*) jelas**. Tiap saran nempel ke halaman/berkas nyata (`berkas:baris`). *(Adaptasi ECC v2.0.0 `seo`, MIT © Affaan Mustafa — ditulis-ulang non-programmer.)*

**a. 📐 CARA BAKU — Schema.org TEPAT per tipe halaman** (JSON-LD = data terstruktur yang dibaca mesin pencari; pasang sesuai isi NYATA, jangan asal tempel):
- Beranda / halaman brand → `Organization` (atau `LocalBusiness` kalau ada lokasi fisik).
- Artikel / blog → `Article` / `BlogPosting` (wajib `headline`, `author`, `publisher`, `datePublished`).
- Produk → `Product` **+** `Offer` (harga, mata uang, ketersediaan) — keduanya, bukan `Product` saja.
- Halaman dalam (interior) → `BreadcrumbList`.
- Bagian tanya-jawab → `FAQPage` **HANYA** kalau Q&A-nya benar-benar ada di halaman.
- 👨‍💻 render via `<script type="application/ld+json">`; satu `@type` utama per halaman; validasi di Rich Results Test sebelum rilis. 🙂 schema = "label gizi" yang dibaca Google (bintang rating, harga, breadcrumb) — harus jujur sesuai isi; `FAQPage` tanpa Q&A = label bohong → penalti Google.

```json
{ "@context": "https://schema.org", "@type": "Article",
  "headline": "Judul Halaman", "author": { "@type": "Person", "name": "Nama" },
  "publisher": { "@type": "Organization", "name": "Nama Brand" } }
```

**b. 📐 CARA BAKU — Title 50-60 karakter + meta description 120-160 + tepat 1 H1:**
- **Title:** ~50-60 karakter; kata-kunci utama di **depan**; untuk manusia, bukan dijejali kata-kunci. Pola: `Topik Utama - Pembeda Spesifik | Brand`.
- **Meta description:** ~120-160 karakter; jujur, sebut topik utama natural. Pola: `Aksi + topik + nilai + 1 detail`.
- 🚨 **tepat 1 `<h1>` per halaman** (sering bug): judul dinamis (`[slug]`) yang kolaps jadi 1 string default = title duplikat → pastikan tiap halaman dinamis hasilkan title **UNIK** dari datanya. 🙂 title = judul tab browser + judul biru di Google (kepanjangan dipotong "..."); title duplikat = etalase yang semua barang ditulis "Produk".

**c. 📐 CARA BAKU — Rantai-redirect maks 2-hop + canonical non-looping:**
- **Redirect** maks **2 lompatan** (A→B→C, jangan A→B→C→D→…). Rantai panjang = lambat + boros anggaran-*crawl* + bocor "kekuatan" link.
- **Canonical** (penanda "alamat resmi halaman ini") harus **konsisten ke diri sendiri & tidak berputar** (X canonical ke Y, Y canonical ke X = loop → Google bingung). Halaman penting jangan tak-sengaja `noindex`. Format URL pilihan **konsisten** (mis. selalu non-`www` + trailing-slash seragam). 🙂 2 papan alamat saling tunjuk = kurir muter-muter.

**d. 📐 CARA BAKU — Pemetaan-kata-kunci + anti-kanibalisasi (paling sering terlewat):**
- **1 kata-kunci/tema utama = 1 URL.** Langkah: (1) tentukan maksud-pencarian, (2) kumpulkan varian kata-kunci realistis, (3) urut prioritas (kecocokan-maksud × nilai × persaingan), (4) petakan 1 tema ke 1 halaman, (5) deteksi kanibalisasi.
- **Kanibalisasi** = 2+ halamanmu sendiri menyasar kata-kunci SAMA → saling rebut peringkat, dua-duanya melemah. Fix: gabungkan (*consolidate*) atau bedakan jelas.
- **Internal linking:** tautkan dari halaman kuat → halaman yang ingin naik; pakai **anchor text deskriptif** (bukan "klik di sini"). 🙂 kanibalisasi = 2 cabang sendiri jual barang sama di mall sama → saling makan pelanggan.

**Anti-pola (langsung tolak):** keyword-stuffing (jejal kata-kunci) → tulis untuk manusia dulu · halaman tipis nyaris-duplikat → gabungkan/bedakan · schema untuk konten yang TAK ADA di halaman → cocokkan ke isi nyata · saran SEO tanpa baca halaman aslinya → baca dulu (§7.3a) · output "tingkatkan SEO" generik → nempel ke `berkas:baris`.

---

## 3. Powerful — apa yang skill ini bantu KIRIM cepat (delivery)

Yang paling berdaya-ungkit & paling sering terlewat = **jaring redirect saat URL berubah** (butir 🔒 HASIL). Pola pemeriksaannya murah (~0 token):

- 📐 CARA BAKU: **Robot penemu "link yang bakal mati"** — sebelum rename slug/route publik, `Grep` string URL lama di seluruh kode + konten (internal link, sitemap, canonical, tombol). Muncul di banyak tempat → tiap tempat wajib ikut pindah ATAU dilindungi 301. Ini menutup jebakan §7.3a "teks yang jadi kunci".
- 🧪 **CONTOH KASUS (ambil polanya, jangan salin mentah — sesuaikan stack + versi framework terpasang, §8.2 A3):** aturan redirect permanen 301 dari slug lama ke slug baru:

```
# Pola konsep (bentuk pasti ikut framework: next.config redirects / _redirects / .htaccess / nginx).
# 301 = "permanen": mesin pencari MEMINDAH peringkat lama ke URL baru. Jangan pakai 302 (sementara) untuk pindah tetap.
sumber:  /produk/sepatu-lama    -> tujuan: /produk/sepatu-baru    (301, permanen)
```

- 💡 SARAN: sitemap + metadata sebaiknya *di-generate* dari data (bukan ditulis tangan per halaman) supaya tak ada halaman terlewat saat konten bertambah. Cara spesifik-framework → `templates/STACK_GUIDE.md §6`.

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

Jawab dengan bukti `berkas:baris` (tak bisa jawab → belum selesai):

- [ ] Tiap halaman publik punya **title unik + deskripsi** (bukan title kembar/kosong di banyak halaman)?
- [ ] Slug **bersih** (huruf kecil, dash) + heading **semantik** (satu `<h1>`, sub-heading menurut isi bukan ukuran font)?
- [ ] **`sitemap.xml` + `robots.txt`** ada + halaman shareable punya metadata **OG**?
- [ ] **URL yang diubah** sudah dipasang **301** ke alamat baru (uji: buka URL lama → apakah nyasar ke 404 atau ter-*redirect*)?
- [ ] **Core Web Vitals** dijaga (gambar/font/bundle dioptimalkan) — angka ambang dari §1b/§10, bukan karangan?

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan SEO = baca kode/konfig + `Grep` string URL + cek metadata, JANGAN jalankan perintah yang mengubah sistem live. Klaim yang cuma bisa diuji dengan mengubah data/deploy → minta owner jalankan di staging.

---

## 5. Definition-of-Done (kapan skill SEO dianggap benar-selesai)

- [ ] **Kontrak (§1) ditulis** dulu — halaman publik mana, URL-nya, apa yang di-redirect saat berubah.
- [ ] Metadata (title/deskripsi/slug) + heading semantik + sitemap + robots.txt + OG terpasang untuk halaman yang disentuh.
- [ ] **Edge case** ditangani: URL berubah → 301 (bukan 404); halaman baru masuk sitemap; halaman rahasia/admin **di-`noindex`** (tak boleh muncul di Google).
- [ ] **Self-verify (§4) semua tercentang** dengan bukti `berkas:baris`.
- [ ] Angka Core Web Vitals **tidak dikarang** — dikutip dari §1b/§10 / alat ukur (§8.2 A1b).
- [ ] build + lint + test lulus lokal; **Gerbang Pra-Rilis §4.6 LULUS** — "selesai" = terbukti dengan bukti, bukan "sudah kuubah".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Kedalaman SEO teknis + resep spesifik-stack** (generate metadata/sitemap, redirect per-framework, Core Web Vitals angka) → `templates/STACK_GUIDE.md §6` (sumber; skill ini sengaja TAK menyalinnya — reuse-first).
- 📐 **Ambang Core Web Vitals + a11y** (LCP/INP/CLS + kontras + `alt`) → §1b + §10 aturan inti; detail a11y/frontend → `skills/uiux/SKILL.md`.
- 📐 **Lacak hasil sejak rilis** — min. 3 aksi inti (kunjungan halaman · klik CTA · konversi) supaya tahu SEO benar-benar mendatangkan pengunjung + konversi (bukan cuma metadata rapi) → `skills/analytics/SKILL.md`.
- 💡 **Konten anti AI-slop / copywriting off-page** → `templates/CONTENT_ANTISLOP_SKILL.md` (opt-in via §4.9).
- 🗃️ **LATAR — SEO off-page** (kata kunci/backlink) = di luar baseline ini → skill kustom §4.9 (`docs/SKILLS_LOCAL.md`).

---

## 7. Batas jujur

- 🗃️ **LATAR — apa yang skill ini JAMIN vs TIDAK:** skill ini menaikkan **lantai** SEO **teknis on-page** (bisa ditemukan, cepat, link tak mati). Ia **tidak menjamin peringkat #1** — peringkat ditentukan juga oleh kualitas konten, otoritas domain, backlink, dan persaingan, yang semuanya di **luar** baseline teknis ini.
- 🗃️ **LATAR — jangan karang angka & API:** ambang Core Web Vitals + bentuk konfigurasi redirect/sitemap **beda antar-framework & antar-versi** — cek versi terpasang (`package.json`/`next.config`) + `templates/STACK_GUIDE.md §6`, jangan dari ingatan (§8.2 A1/A3). Hasil SEO baru terlihat setelah mesin pencari me-*re-crawl* (bisa berhari-hari) — jadi "terbukti di sini" (metadata benar) beda dari "terbukti naik peringkat" (butuh waktu + alat ukur eksternal seperti Search Console).
