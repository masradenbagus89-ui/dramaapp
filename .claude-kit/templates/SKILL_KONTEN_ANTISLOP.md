# Skill Konten Anti-Slop (SEO off-page) — template siap-adopsi §4.9

> Versi 1 · 2026-07-11 · **Template skill kustom (opt-in).** Serapan **MIT © Affaan Mustafa** (pustaka skill ECC v2.0.0) — **ditulis-ulang** Bahasa Indonesia non-programmer + dinetralkan untuk platform apa pun, **bukan salinan**.

*AI-slop = tulisan buatan AI yang generik/klise — terdengar mulus & "pintar" tapi kosong isi, dan bisa dipakai untuk produk apa pun. 🏢 Analogi: surat cinta yang tinggal ganti nama penerima — kalau bisa dikirim ke siapa saja, berarti tak spesial.*

---

## Apa ini + kenapa OPT-IN (bukan baseline always-load)

Skill ini melatih AI **menulis konten & copy off-page** (blog, landing page, media sosial, email, thread, kampanye) yang **tidak terdengar seperti AI generik** — supaya lebih dipercaya pembaca DAN mesin pencari.

Penempatannya sengaja **skill kustom §4.9 (opt-in), BUKAN salah satu dari 8 skill divisi baseline** (§4.13). Alasannya: baseline SEO §4.13 #8 sudah menegaskan *"SEO strategi/off-page = di LUAR baseline teknis → kalau client punya keahlian SEO, bungkus jadi skill kustom §4.9."* Menaruh ini di aturan yang dibaca AI tiap sesi (always-load) = boros token untuk client yang tak menulis konten. Jadi: **nyala hanya kalau kamu mengadopsinya.**

- 👨‍💻 **Programmer:** ini modul copywriting opt-in; tidak menambah beban always-load, tidak menggantikan lensa baseline SEO — cuma memperluas di atasnya (§4.9 "lokal boleh memperluas, tak boleh menonaktifkan baseline").
- 🙂 **Non-Programmer:** kayak "mode menulis" tambahan yang kamu hidupkan saat butuh bikin artikel/iklan/postingan — bukan alat yang selalu jalan di latar.

---

## Cara mengadopsi (§4.9) — 2 langkah

1. **Rujuk dari `docs/SKILLS_LOCAL.md` project kamu** (berkas skill lokal milikmu; AI bikin otomatis saat kamu bikin skill pertama). Tambahkan entri:

   ```
   ### skill: konten-antislop
   - Sumber: template kit lintasAI (serapan ECC, MIT © Affaan Mustafa) · Tanggal adopsi: <YYYY-MM-DD>
   - Tujuan: nulis konten/copy off-page yang tidak terdengar AI generik + tetap jujur (source-first).
   - Faktor yang dicakup: anti-slop + gerbang mutu copy + crosspost + brand voice + source-first.
   - Instruksi: ikuti templates/SKILL_KONTEN_ANTISLOP.md (kit) — 5 komponen di bawah.
   - Catatan: opt-in, memperluas baseline SEO §4.13 #8 (tidak menggantikannya).
   ```

2. **Panggil dengan bahasa biasa:** "tulis artikel X pakai skill konten-antislop", atau "cek copy landing ini dari slop", atau "crosspost postingan ini ke X + LinkedIn". AI otomatis menerapkan 5 komponen.

> Skill lokal tetap tunduk pagar keamanan + anti-halusinasi + bahasa non-programmer kit (§8/§8.1/§8.2/§2.1). Skill = instruksi tambahan, **bukan** izin melanggar pagar.

---

## Pemicu (kapan skill ini nyala)

- Menulis artikel/blog/guide/tutorial/newsletter, postingan X/LinkedIn/Threads/Bluesky, atau thread.
- Menulis copy landing page, urutan email, atau varian iklan.
- Meninjau copy yang sudah ada untuk mutu konversi + konsistensi merek.
- Mengubah satu sumber (artikel/demo/catatan/transkrip) jadi banyak versi lintas-platform.

---

## Prinsip inti (5 non-negotiable — pondasi semua komponen)

1. **Mulai dari bahan sumber nyata, bukan rumus postingan generik.** (`content-engine/SKILL.md:22`)
2. **Adaptasi FORMAT untuk platform, bukan mengganti KEPRIBADIAN penulis.** (`content-engine/SKILL.md:23`)
3. **Satu aset = satu klaim nyata.** Jangan tumpuk banyak pesan jadi satu.
4. **Spesifik mengalahkan kata sifat.** Angka/mekanisme/bukti > "revolusioner/terbaik".
5. **Jangan pasang pancingan interaksi** (bait) kecuali user minta eksplisit.

- 👨‍💻 **Programmer:** semua output copy harus punya ≥1 klaim spesifik + bukti pendukung; superlatif tanpa bukti = ditolak di gerbang mutu (Komponen 2).
- 🙂 **Non-Programmer:** tulis yang benar-benar terjadi + tunjukkan buktinya, jangan pamer kata-kata besar. Orang percaya bukti, bukan pujian diri.

---

## Komponen 1 — Daftar-larang frasa AI-slop + heuristik "copot-ke-kompetitor"

**🚫 Buang & tulis-ulang kalau muncul** (gabungan dari 5 sumber ECC — `content-engine:55-63`, `marketing-campaign:97-106`, `article-writing:34-43`, `brand-voice:68-79`, `crosspost:83-91`):

- Pembuka klise: *"In today's rapidly evolving landscape / competitive landscape"*, "Di era yang serba cepat ini", pemanasan basa-basi sebelum masuk poin.
- Superlatif kosong: *game-changer, revolutionary, cutting-edge, world-class*, "terbaik", "solusi terlengkap".
- Jembatan kosong: *"here's why this matters"* / "inilah kenapa ini penting" — **tanpa** langsung diikuti hal konkret.
- CTA generik: *"click here", "learn more", "find out more"*, "klik di sini", "selengkapnya" (tanpa menyebut tujuan konkret).
- Pancingan interaksi: *"Excited to share", "What do you think?", "Here's what I learned"*, pertanyaan penutup yang cuma memancing komentar.
- Bukti sosial kosong: *"dipercaya ribuan orang"* tanpa angka/nama nyata.
- Urgensi palsu: deadline/kelangkaan yang tak benar-benar ada.
- Gaya palsu: kerendahan-hati dibuat-buat ("fake vulnerability arc"), "founder journey" mengharukan yang dipaksakan, casual dipaksakan di LinkedIn, huruf-kecil-semua dipaksakan.

**🔑 Heuristik penentu (tes tunggal paling tajam — `marketing-campaign/SKILL.md:106`):**

> *"Kalau paragraf/copy ini bisa **dicopot dan ditempel ke aset KOMPETITOR tanpa diubah sedikit pun** — berarti terlalu generik → tulis-ulang."*

- 👨‍💻 **Programmer:** copy yang lolos wajib memuat ≥1 klaim + bukti (angka/mekanisme/artefak/nama) yang **hanya benar untuk produk/klien ini** — bukan pernyataan yang berlaku untuk produk apa pun sekategori.
- 🙂 **Non-Programmer:** kayak seragam kantor tanpa name-tag — kalau semua orang persis sama, tak ada yang bisa dibedakan. Tulisan bagus "pas" untuk 1 produk saja, tak bisa dipakai pesaing.

---

## Komponen 2 — Gerbang mutu copy (lewati SEBELUM kirim)

Tiap aset copy WAJIB lulus gerbang ini (dari `marketing-campaign:62-96` + `content-engine:118-126`):

1. **Tes-5-detik pada bagian atas (above-fold/hero).** Dalam 5 detik pembaca paham: *untuk siapa, apa gunanya, kenapa bertindak sekarang.* Tak jelas → tulis-ulang.
   - *above-fold/hero = bagian teratas yang langsung terlihat sebelum orang scroll.*
2. **Audit CTA — satu per aset, spesifik, "diperoleh" bukan dituntut.** Ganti "learn more" jadi aksi konkret ("Lihat harga", "Coba demo 2 menit"). Jangan tumpuk banyak ajakan.
   - *CTA (call-to-action) = tombol/ajakan bertindak.*
3. **Konsistensi nada lintas semua saluran.** Terasa satu penulis yang sama, bukan 5 gaya berbeda.
4. **Audit klaim — tiap klaim spesifik & bisa didukung.** Tak ada superlatif kosong.
5. **Konsistensi lintas-saluran: klaim iklan HARUS cocok dengan landing page.** Judul email cocok isi email (jangan "umpan-lalu-ganti"/bait-and-switch).

- 👨‍💻 **Programmer:** perlakukan ini seperti *lint untuk copy* — checklist deterministik yang dijalankan sebelum "copy selesai", sejalan Gerbang Pra-Rilis §4.6 (jangan bilang "siap" sebelum lulus).
- 🙂 **Non-Programmer:** kayak QC di pabrik — tiap tulisan diperiksa 5 hal ini dulu sebelum "boleh tayang". Yang paling sering gagal: janji di iklan beda dari isi halaman → pengunjung kabur.

---

## Komponen 3 — Crosspost: adaptasi per KENDALA, bukan stereotipe

Menyebar satu ide ke banyak platform **tanpa jadi postingan palsu yang sama dalam 4 kostum** (dari `crosspost:18-91`).

**Aturan inti:**
1. **JANGAN publish copy identik lintas-platform.** (mesin pencari + audiens tak suka konten kembar.)
2. **Pertahankan suara penulis** di semua platform.
3. **Adaptasi untuk KENDALA platform, bukan stereotipe platform.** ← inti komponen ini.
4. Satu postingan tetap tentang **satu** hal.
5. **Jangan mengarang CTA/pertanyaan/pesan-moral** kalau sumber aslinya tak punya.

**Adaptasi per kendala (bukan meniru klise platform):**

| Platform | Kendala nyata → adaptasi | JANGAN (stereotipe) |
|---|---|---|
| **X** | Ruang sempit → padatkan, buka dengan klaim/artefak paling tajam; thread hanya kalau 1 post akan meruntuhkan argumen | hashtag + filler generik |
| **LinkedIn** | Audiens di luar niche → tambah konteks **secukupnya** | postingan "refleksi founder" palsu, pertanyaan penutup cuma "karena ini LinkedIn", nada formal dipaksakan padahal penulis aslinya tajam |
| **Threads** | Santai & langsung → tulis mudah dibaca | copy "creator hyper-casual" palsu; jangan tempel versi LinkedIn lalu dipendekkan |
| **Bluesky** | Ringkas → jaga irama penulis | hashtag / bahasa pengejar-algoritma feed |
| **Blog/guest post** | Butuh kedalaman + bukti tangan-pertama → mulai dari artefak/contoh, jelaskan sesudahnya | pembukaan basa-basi, "throat-clearing" AI yang menunda poin |

- 👨‍💻 **Programmer:** adaptasi = fungsi dari *constraint* platform (panjang, format, audiens), bukan *cosplay* gaya platform. Urutan default: publish versi native terkuat dulu → adaptasi turunannya.
- 🙂 **Non-Programmer:** kayak menyesuaikan cara bicara ke tamu berbeda — inti cerita sama, cuma panjang & konteksnya disesuaikan. Bukan pura-pura jadi orang lain di tiap platform.

---

## Komponen 4 — Brand Voice Profile yang bisa dipakai-ulang (dari 5-20 sampel NYATA)

Bangun **profil suara** sekali dari bahan nyata, lalu pakai di mana-mana — daripada menebak gaya dari nol atau jatuh ke suara AI generik (dari `brand-voice:20-98` + skema `voice-profile-schema.md`).

**Prioritas sumber (pakai bahan NYATA, jangan contoh platform generik — `brand-voice:20-28`):**
1. Postingan/thread asli terbaru.
2. Artikel, esai, memo, catatan rilis, newsletter.
3. Email/DM keluar yang benar-benar berhasil.
4. Dokumen produk, changelog, framing README, copy situs.

**Alur pengumpulan:** kumpulkan **5-20 sampel** representatif (`brand-voice:32`); utamakan yang terbaru; pisahkan "suara publik" vs "suara kerja internal" kalau sumbernya jelas terbelah.

**Yang diekstrak:** irama & panjang kalimat · padat vs menjelaskan · norma kapitalisasi · pola tanda kurung · seberapa sering bertanya · setajam apa klaim dibuat · seberapa sering muncul angka/mekanisme/bukti · cara transisi antar-ide · **apa yang penulis TAK PERNAH lakukan.**

**Skema keluaran `VOICE PROFILE`** (pakai struktur ini persis — ringkas, berbasis bukti, bukan esai):

```text
VOICE PROFILE
=============
Penulis:
Tujuan:
Keyakinan (seberapa yakin dari sampel):

Kumpulan Sumber
- sumber 1
- sumber 2
- sumber 3

Irama            : catatan singkat panjang kalimat, tempo, penggalan
Kepadatan        : padat atau menjelaskan
Kapitalisasi     : konvensional / campuran / situasional
Tanda kurung     : dipakai untuk apa, TIDAK dipakai untuk apa
Penggunaan tanya : jarang / sering / retoris / hampir tak ada
Gaya klaim       : cara klaim dibingkai, didukung, dipertajam
Gerakan disukai  : langkah konkret yang penulis MEMANG pakai
Gerakan terlarang: pola spesifik yang penulis TIDAK pakai
Aturan CTA       : bagaimana/kapan/apakah menutup dengan ajakan
Catatan saluran  : X: / LinkedIn: / Email:
```

*Pedoman:* tiap "gerakan terlarang" harus **teramati di sampel** atau diminta eksplisit user. Kalau sampel saling bertentangan → **sebut belahannya**, jangan dirata-ratakan jadi bubur.

- 👨‍💻 **Programmer:** ini artefak yang bisa dikonsumsi ulang lintas-task dalam sesi yang sama — bukan kritik sastra. Tujuannya *operational reuse*, bukan analisis gaya sekali-pakai.
- 🙂 **Non-Programmer:** kayak "kartu identitas gaya nulis" — dibikin sekali dari contoh tulisan asli, lalu dipakai untuk semua konten biar suaranya konsisten. **Jangan simpan sidik-suara pribadi ke berkas yang ikut repo tanpa izin user.**

---

## Komponen 5 — Konten source-first: bukti bukan adjektif, JANGAN mengarang

Ini **perluasan langsung Anti-Halusinasi §8.2** ke dunia konten (dari `article-writing:20-25` + `content-engine:20-40`):

- **Buka dengan hal konkret:** artefak, contoh, output, anekdot, angka, screenshot, atau kode. **Jelaskan SESUDAH contoh, bukan sebelum.** (`article-writing:21-22`)
- **Pakai bukti, bukan kata sifat.** ("proof instead of adjectives")
- 🚨 **JANGAN mengarang fakta, kredibilitas, atau bukti pelanggan** — testimoni, statistik, jumlah pengguna, logo klien, penghargaan. (`article-writing:25` — *"Never invent facts, credibility, or customer evidence."*)
- Kalau bukti belum ada → tandai sebagai **lubang yang harus diisi sebelum publish**, jangan tambal dengan angka karangan.

- 👨‍💻 **Programmer:** ini "No quote = no claim" versi copywriting (§8.2 Aturan 1). Klaim numerik/kredibilitas tanpa sumber = di-*hold*, bukan diisi feeling. Sejalan larangan §12 (klaim tanpa verifikasi).
- 🙂 **Non-Programmer:** aturan paling penting untuk kepercayaan — AI **dilarang mengarang** "dipakai 10.000 orang" atau testimoni palsu. Kalau angkanya belum ada, tulis "[perlu data]", bukan tebak. Testimoni/statistik palsu = bisa kena masalah hukum + hancur reputasi.

---

## ⚠️ Sadar-versi: kebijakan Google (E-E-A-T & "helpful content")

Kenapa anti-slop penting untuk SEO — **fakta ini diverifikasi ke dokumentasi resmi terbaru (Juli 2026), bukan dari ingatan.** Kebijakan Google berubah; **cek dok resmi terbaru sebelum mengklaim detail** (Google Search Central Blog + Search Quality Rater Guidelines):

- **"Helpful Content System" sudah PENSIUN sebagai update berdiri-sendiri (5 Maret 2024)** → dilebur jadi **sinyal inti berkelanjutan** dalam algoritma peringkat. Jadi jangan sebut lagi sebagai "update berkala terpisah".
- **E-E-A-T** = Experience, Expertise, Authoritativeness, Trust (huruf "E" ke-2 *Experience* ditambah 2022). Konten source-first + bukti tangan-pertama = langsung menaikkan sinyal ini.
- **Konten AI TIDAK otomatis dihukum.** Tapi memproduksinya massal untuk memanipulasi peringkat = pelanggaran spam **"scaled content abuse"**. Yang aman: AI sebagai alat draf + **editing manusia + fakta terverifikasi + wawasan/keahlian tangan-pertama**.

- 👨‍💻 **Programmer:** anti-slop bukan estetika — ini mitigasi risiko klasifikasi spam + penurunan sinyal kualitas inti. Verifikasi klaim kebijakan spesifik ke dok resmi versi-terbaru sebelum menaruhnya di copy.
- 🙂 **Non-Programmer:** Google tak benci tulisan AI — Google benci tulisan **kosong yang diproduksi massal buat ngakalin peringkat**. Skill ini bikin konten AI jadi "layak" di mata Google + pembaca.

---

## Alur kerja singkat (ubah 1 sumber → banyak konten, 7 langkah — `content-engine:99-107`)

1. Pilih aset jangkar (artikel/demo/catatan terkuat).
2. Ekstrak 3-7 klaim/adegan atomik (satu ide utuh per potong).
3. Urutkan berdasarkan ketajaman, kebaruan, kekuatan bukti.
4. Tetapkan **satu** ide kuat per output.
5. Adaptasi struktur untuk tiap platform (Komponen 3).
6. Buang filler bawaan-platform.
7. Jalankan gerbang mutu (Komponen 2).

---

## Kredit & rawat (maintenance)

- **Lisensi:** MIT © Affaan Mustafa — sumber: skill ECC `content-engine`, `marketing-campaign`, `article-writing`, `brand-voice`, `crosspost` (`ecc-universal` v2.0.0). Ditulis-ulang bahasa non-programmer + dinetralkan lintas-platform, **bukan disalin**.
- **Versi-dicek:** kebijakan Google diverifikasi 2026-07-11. Karena SEO cepat berubah, **cek ulang klaim kebijakan Google ke dok resmi** saat meninjau-ulang skill ini.
- Detail vetting & penempatan (berkas repo-dev kit — tak ikut terpasang di project client): `docs/plans/ECC_BORROW_LIST.md` #45 + `docs/serap-skill/KATALOG.md`.
