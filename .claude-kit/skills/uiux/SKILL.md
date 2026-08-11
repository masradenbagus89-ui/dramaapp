---
nama: uiux
deskripsi: Alur pakai & aksesibilitas kelas WCAG 2.2 AA — bisa dipakai semua orang (keyboard, pembaca layar, kontras cukup) dengan microcopy jelas dan 4 state UI.
divisi: frontend
pemicu: [aksesibilitas, a11y, wcag, disabilitas, difabel, tunanetra, buta-warna, pembaca-layar, screen-reader, kontras]
rawan_keamanan: false
menggantikan: [aksesibilitas]
---

# Skill: UI/UX — alur pakai + aksesibilitas (WCAG 2.2 AA)

> **Kapan skill ini aktif:** prompt menyentuh "aksesibilitas / a11y / WCAG / bisa dipakai difabel / tunanetra / pembaca layar / kontras warna / buta warna / navigasi keyboard / microcopy tombol". Dispatcher `rak-pemicu` menyalakannya otomatis (staff tak perlu mengetik nama skill).
>
> 🙂 **Analogi:** aksesibilitas = **ramp + pegangan tangga + papan petunjuk jelas** di gedung. Bukan cuma orang berjalan normal yang bisa masuk — pengguna kursi roda, lansia, dan tunanetra juga. Membangun aksesibilitas = memasang jalur itu SEJAK AWAL, bukan menambal setelah ada yang komplain tak bisa masuk.

Skill ini **advisory** (§4.17): otak native yang memutuskan adopsi/adaptasi/abaikan tiap butir 📐/💡. Tapi butir **🔒 HASIL** = hasil yang tak boleh gagal apa pun caranya (di sini: orang dengan keterbatasan tetap bisa memakai halaman). Angka ambang wajib (kontras, target sentuh) ada di §1b aturan — **jangan dikarang** (§8.2 Aturan 1). *(a11y = singkatan "accessibility"/aksesibilitas: "a" + 11 huruf + "y". WCAG = Web Content Accessibility Guidelines, standar aksesibilitas resmi dunia dari W3C.)*

---

## 1. Kontrak (yang HARUS benar — tulis DULU sebelum koding)

- 🔒 **HASIL — Aksesibilitas minimum (setiap layar yang dibangun/diubah):**
  - **Teks terbaca:** kontras teks vs latar **min 4,5:1** (angka wajib §1b — jangan dikarang).
  - **Bisa dilihat siapa saja:** tiap gambar punya teks alternatif (`alt`); tiap input form punya label terkait (**bukan cuma placeholder** = teks abu-abu di dalam kotak yang hilang saat diketik).
  - **Bisa dioperasikan tanpa mouse:** semua fungsi bisa dipakai **cuma keyboard**; fokus keyboard (kotak/garis penanda posisi kursor) **terlihat jelas**. Cek cepat: tekan `Tab` keliling halaman — kalau ada yang tak terjangkau atau posisi fokus tak kelihatan = gagal.
  - **Target sentuh:** ukuran tombol/link yang bisa dipencet **min ~24px** (syarat WCAG 2.2 AA "Target Size"), idealnya ~44px biar gampang di HP.
  - **Jangan andalkan warna saja:** status (error/sukses) jangan cuma dibedakan merah/hijau — pengguna buta warna tak melihat bedanya. Tambah ikon/teks.
- 🔒 **HASIL — 4 state UI terpenuhi** tiap tampilan yang mengambil data: loading · kosong (empty) · error · sukses (§10). Loading >2 detik → pakai **skeleton** (kerangka abu-abu placeholder yang meniru bentuk konten), bukan spinner kosong.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 🗃️ **LATAR — Standar acuan = WCAG 2.2 level AA**, 4 pilar (dikenal singkatan **POUR**): bisa **dilihat** (Perceivable) semua orang · bisa **dioperasikan** (Operable) tanpa mouse · bisa **dimengerti** (Understandable) · **tahan banting** (Robust) di berbagai alat bantu. AA = tingkat menengah yang jadi lantai wajib untuk situs publik.
2. 📐 **CARA BAKU — Konkret WCAG 2.2 yang wajib dicek:**
   - Tiap gambar → teks alternatif (`alt`) yang deskriptif (gambar dekorasi murni → `alt=""` supaya pembaca layar melewatinya).
   - Tiap input form → label terkait (dihubungkan `for`/`id` atau membungkus input), bukan cuma placeholder.
   - Heading berurutan (satu `<h1>` judul utama → sub-heading rapi turun bertingkat, jangan loncat) — pembaca layar memakainya sebagai "daftar isi".
   - Komponen non-standar (modal/tab/dropdown/menu) → diberi peran **ARIA** + bisa dipakai keyboard (buka/tutup/pindah fokus). *(ARIA = label tak-terlihat yang memberi tahu pembaca layar "ini tombol/menu/dialog"; pembaca layar = software yang membacakan isi layar untuk tunanetra, mis. NVDA/VoiceOver.)*
   - Animasi/gerak → bisa di-pause / dihormati preferensi `prefers-reduced-motion` (gerak berlebih memicu mual pada sebagian orang).
   - Pesan error → diumumkan ke pembaca layar (mis. `aria-live` / `role="alert"`), bukan cuma berubah warna diam-diam.
   - Deklarasikan bahasa konten (`<html lang="id">`) supaya pembaca layar melafalkan dengan benar + mesin terjemah tahu bahasanya. Pisahkan teks dari kode sejak awal (i18n-ready = siap-terjemah) — memudahkan menambah bahasa nanti tanpa membongkar kode.
3. 📐 **CARA BAKU — Validasi di client DAN server; error per-field, bukan satu error global.** Validasi **client** = umpan-balik cepat buat user (langsung terlihat); validasi **server** = keamanan (jangan percaya kiriman dari client — bisa dilewati/dipalsukan, → `skills/backend/SKILL.md`). Tunjukkan pesan tepat di sebelah kolom yang salah + hubungkan ke inputnya (`aria-describedby`) supaya pembaca layar membacakannya saat fokus di kolom itu.
4. 💡 **SARAN — Microcopy aktif & ringkas.** Tombol/label pakai kata kerja jelas dari sudut pengguna ("Simpan", "Kirim pesan"), bukan bahasa mesin ("Submit modifikasi entity"). Microcopy aktif ≤8 kata (§5).

---

## 3. Powerful — pola siap-adaptasi

Yang paling berdaya-ungkit untuk aksesibilitas form = **label + error yang benar-benar terhubung** ke input, supaya pengguna pembaca layar tahu kolom apa yang diisi dan apa yang salah. 🧪 **CONTOH KASUS (ambil polanya, jangan salin mentah** — sesuaikan ke framework/komponen project):

```html
<!-- Label terhubung ke input (klik label = fokus ke kotak); error dibacakan pembaca layar. -->
<label for="email">Email</label>
<input id="email" name="email" type="email"
       aria-invalid="true" aria-describedby="email-err" />
<!-- role="alert" -> pembaca layar langsung mengumumkan pesan saat muncul. -->
<p id="email-err" role="alert">Format email belum benar — contoh: nama@domain.com</p>
```

- 📐 CARA BAKU: **Uji keyboard 30 detik (~0 biaya):** tekan `Tab` dari atas halaman sampai bawah. Semua tombol/link/input WAJIB terjangkau, urutannya masuk akal, dan posisi fokus selalu terlihat. Ini menangkap mayoritas cacat aksesibilitas tanpa alat khusus.
- 💡 SARAN: jalankan pemeriksa otomatis (axe / Lighthouse) sebagai jaring tambahan — tapi ia hanya menangkap ~30-40% masalah; uji keyboard + pembaca layar manual tetap perlu (batas jujur §7).

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

Jawab dengan bukti `berkas:baris` (tak bisa jawab → belum selesai):
- [ ] Semua fungsi bisa dipakai **cuma keyboard**, dan fokus keyboard **terlihat** (uji `Tab` keliling halaman)?
- [ ] Kontras teks vs latar **≥ 4,5:1** (cek dengan alat, jangan dikira-kira)?
- [ ] Tiap gambar punya `alt`; tiap input punya **label terkait** (bukan cuma placeholder)?
- [ ] Target sentuh **≥ 24px** untuk tombol/link yang dipencet?
- [ ] Status/error **tidak** dibedakan warna saja (ada ikon/teks pendamping)?
- [ ] Heading berurutan; komponen non-standar (modal/tab/dropdown) punya peran ARIA + jalan via keyboard?
- [ ] Error **per-field** + diumumkan ke pembaca layar (`aria-live`/`role="alert"`)?
- [ ] **4 state UI** (loading/kosong/error/sukses) terpenuhi?

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan aksesibilitas = baca kode/markup + uji keyboard + `Grep`, JANGAN jalankan perintah yang mengubah data live.

---

## 5. Definition-of-Done (kapan skill uiux dianggap benar-selesai)

- [ ] **Kontrak (§1) dipenuhi** — aksesibilitas minimum + 4 state UI tercapai di layar yang dibangun/diubah.
- [ ] **Self-verify (§4) semua tercentang** dengan bukti `berkas:baris`.
- [ ] Uji keyboard manual (`Tab` keliling halaman) dilakukan + minimal 1 layar diuji dengan pembaca layar (atau dicatat sebagai ⏳ belum-teruji bila alat tak tersedia, jangan diklaim "aman").
- [ ] Microcopy tombol/label ditinjau (aktif, ringkas, dari sudut pengguna).
- [ ] build + lint + test lulus lokal.
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** — "selesai" = terbukti dengan bukti, bukan "sudah kubuat + kelihatannya rapi".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Angka ambang aksesibilitas & performa** (kontras 4,5:1, target sentuh 24px, Core Web Vitals) → §1b aturan (sumber angka; jangan dikarang).
- 📐 **Detail frontend** (4 state UI, design token, escape output, virtualisasi list) → `skills/webdesign/SKILL.md` + §10 aturan inti.
- 🗃️ **LATAR — skill/rak terkait:** web design & arah tampilan → `skills/webdesign/SKILL.md`; SEO metadata halaman publik → `skills/seo/SKILL.md`.

---

## 7. Batas jujur

- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** aksesibilitas ke WCAG 2.2 AA minimum — ia **tidak menjamin** situs lulus audit AA penuh (WCAG punya puluhan kriteria; ini subset paling berdampak). Pemeriksa otomatis (axe/Lighthouse) hanya menangkap sebagian masalah (~30-40%); uji **keyboard + pembaca layar manual** tetap wajib untuk keyakinan nyata. Kebutuhan level AAA (mis. kontras 7:1) atau kepatuhan hukum spesifik (ADA/EN 301 549) → konsultasi aksesibilitas khusus.
- 🗃️ **LATAR — Kredit (MIT):** pendalaman aksesibilitas WCAG 2.2 diserap dari audit ECC v2.0.0 (MIT © Affaan Mustafa) + standar WCAG 2.2 (W3C). Ditulis ulang untuk staff non-programmer.
