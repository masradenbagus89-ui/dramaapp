---
nama: a11y
deskripsi: Aksesibilitas WCAG 2.2 AA — bisa dipakai semua orang (keyboard, pembaca layar, kontras cukup) + 12 pola a11y React siap-pakai + microcopy jelas + 4 state UI.
divisi: frontend
pemicu: [aksesibilitas, a11y, wcag, disabilitas, difabel, tunanetra, buta-warna, pembaca-layar, screen-reader, kontras, aria-label, aria-hidden, focus-trap, bahasa-robot, enak-dibaca, jadi-kosong, accessibility, alt-text, color-contrast]
rawan_keamanan: false
menggantikan: [aksesibilitas]
---

# Skill: Aksesibilitas (a11y) — WCAG 2.2 AA + pola React siap-pakai

> **Inti:** aksesibilitas = membangun dukungan bagi pengguna dengan keterbatasan (tunanetra, tak bisa pakai mouse, buta warna, lansia) **SEJAK AWAL** desain & kode — bukan ditambal belakangan setelah ada yang komplain tak bisa memakai halaman.

---

## 1. Kontrak (yang HARUS benar — tulis DULU sebelum koding)

- 🔒 **HASIL — Aksesibilitas minimum (setiap layar yang dibangun/diubah):**
  - **Teks terbaca:** kontras teks vs latar **min 4,5:1** (angka wajib — jangan dikarang).
  - **Bisa dilihat siapa saja:** tiap gambar punya teks alternatif (`alt`); tiap input form punya label terkait (**bukan cuma placeholder** = teks abu-abu di dalam kotak yang hilang saat diketik).
  - **Bisa dioperasikan tanpa mouse:** semua fungsi bisa dipakai **cuma keyboard**; fokus keyboard (garis penanda posisi kursor) **terlihat jelas**. Cek cepat: tekan `Tab` keliling halaman — ada yang tak terjangkau / posisi fokus tak kelihatan = gagal.
  - **Target sentuh:** ukuran tombol/link yang bisa dipencet **min ~24px** (WCAG 2.2 "Target Size"), idealnya ~44px biar gampang di HP.
  - **Jangan andalkan warna saja:** status (error/sukses) jangan cuma dibedakan merah/hijau — pengguna buta warna tak melihat bedanya. Tambah ikon/teks.
- 🔒 **HASIL — 4 state UI terpenuhi** tiap tampilan yang mengambil data: loading · kosong (empty) · error · sukses. Loading >2 detik → pakai **skeleton** (kerangka abu-abu placeholder yang meniru bentuk konten), bukan spinner kosong.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 🗃️ **LATAR — Standar acuan = WCAG 2.2 level AA**, 4 pilar (**POUR**): bisa **dilihat** (Perceivable) · bisa **dioperasikan** (Operable) tanpa mouse · bisa **dimengerti** (Understandable) · **tahan banting** (Robust) di berbagai alat bantu. AA = lantai wajib situs publik.
2. 📐 **CARA BAKU — Konkret WCAG 2.2 yang wajib dicek:**
   - Tiap gambar → `alt` deskriptif (gambar dekorasi murni → `alt=""` supaya pembaca layar melewatinya).
   - Tiap input form → label terkait (dihubungkan `for`/`id` atau membungkus input), bukan cuma placeholder.
   - Heading berurutan (satu `<h1>` → sub-heading turun bertingkat, jangan loncat h1→h4) — pembaca layar memakainya sebagai "daftar isi".
   - Komponen non-standar (modal/tab/dropdown/menu) → diberi peran **ARIA** + bisa dipakai keyboard (buka/tutup/pindah fokus).
   - Animasi/gerak → bisa di-pause / hormati `prefers-reduced-motion` (gerak berlebih memicu mual sebagian orang).
   - Pesan error → diumumkan ke pembaca layar (`aria-live` / `role="alert"`), bukan cuma berubah warna diam-diam.
   - Deklarasikan bahasa konten (`<html lang="id">`) supaya pembaca layar melafalkan benar + mesin terjemah tahu bahasanya.
3. 📐 **CARA BAKU — Validasi di client DAN server; error per-field, bukan satu error global.** Validasi **client** = umpan-balik cepat (langsung terlihat); validasi **server** = keamanan (jangan percaya kiriman client — bisa dilewati/dipalsukan, → `skills/backend/SKILL.md`). Tunjukkan pesan tepat di sebelah kolom yang salah + hubungkan ke inputnya (`aria-describedby`).
4. 💡 **SARAN — Microcopy aktif & ringkas.** Tombol/label pakai kata kerja jelas dari sudut pengguna ("Simpan", "Kirim pesan"), bukan bahasa mesin ("Submit modifikasi entity"). Microcopy aktif ≤8 kata.

---

## 3. Powerful — 12 pola a11y React siap-pakai (otomatis tiap bikin komponen interaktif)

> Terapkan OTOMATIS tiap menulis/menilai `<input>`, modal, dropdown, tombol-ikon, atau animasi — bukan tambahan opsional. Tiap pola diberi label keseriusan: 📐 = PENTING (keamanan pengguna disabilitas + hukum aksesibilitas) · 💡 = RAPIKAN. Ambil polanya, **jangan salin mentah** — sesuaikan ke framework/versi terpasang.

**1. Label form WAJIB tersambung (`htmlFor` ↔ `id`).** 📐 PENTING. `placeholder` BUKAN pengganti label (hilang saat mengetik + tak dibaca pembaca layar). Field wajib: `required aria-required="true"` + asterisk `<span aria-hidden="true">*</span>`.
```tsx
<label htmlFor="email">Email <span aria-hidden="true">*</span></label>
<input id="email" type="email" required aria-required="true" />
```
🙂 tiap kotak isian punya label tertulis yang tersambung jelas ke kotaknya, supaya terlihat kotak itu untuk apa.

**2. Pesan error tersambung ke kotaknya (`aria-describedby` + `role="alert"` + `aria-invalid`).** 📐 PENTING.
```tsx
<input id="email" aria-describedby={error ? 'email-error' : undefined} aria-invalid={!!error} />
{error && <span id="email-error" role="alert">{error}</span>}
```
🙂 peringatan salah "nempel resmi" ke kotaknya + langsung dibacakan.

**3. Pakai elemen HTML yang tepat (semantik), jangan `<div onClick>`.** 📐 PENTING. Tombol → `<button type="button">` (bisa fokus + Enter/Space + diumumkan "button"); navigasi → `<a href>`. `<div onClick>` butuh `role`+`tabIndex={0}`+`onKeyDown` manual (gampang lupa). 🙂 pakai elemen `<button>` asli yang otomatis bisa difokus & dijalankan lewat keyboard, bukan `<div>` yang cuma tampak seperti tombol tanpa fungsi itu.

**4. Tombol hanya-ikon WAJIB `aria-label`; gambar hiasan `alt="" aria-hidden`.** 📐 PENTING. `<button aria-label="Hapus item"><TrashIcon aria-hidden="true" /></button>`. 🙂 ikon tong-sampah tanpa tulisan = pembaca layar baca "tombol" doang.

**5. Modal: kembalikan fokus + Esc-tutup (focus-trap pakai library).** 📐 PENTING. Simpan `document.activeElement` saat buka → fokus ke modal (`role="dialog" aria-modal="true" aria-labelledby` + `tabIndex={-1}`) → kembalikan fokus ke pemicu saat tutup; Esc menutup. **Focus trap penuh** (Tab/Shift+Tab muter di modal) pakai library teruji `focus-trap-react`, jangan tulis sendiri.
```tsx
useEffect(() => {
  if (isOpen) { prev.current = document.activeElement as HTMLElement; ref.current?.focus(); }
  else prev.current?.focus();
}, [isOpen]);
```
🙂 popup muncul → "kursor keyboard" pindah ke dalam; ditutup → balik ke tombol pembuka.

**6. Komponen kustom (dropdown/menu) WAJIB jalan dengan keyboard saja.** 📐 PENTING. `onKeyDown` tangani `ArrowUp`/`ArrowDown` (geser pilihan, `e.preventDefault()`), `Enter`/`Space` (pilih), `Escape` (tutup); role ARIA benar (`combobox`/`listbox`/`option` + `aria-expanded`/`aria-selected`). 🙂 menu buatan sendiri harus bisa dipakai tanpa mouse.

**7. Konten yang berubah sendiri (notif/status) pakai `aria-live` + `aria-atomic`.** 💡 RAPIKAN. `<div role="status" aria-live="polite" aria-atomic="true">` untuk update non-mendesak; `aria-live="assertive"` HANYA untuk error mendesak (menyela pembacaan). `aria-atomic="true"` = pembaca layar membacakan SELURUH pesan, bukan cuma bagian yang berubah. 🙂 teks "Tersimpan!" yang muncul tanpa pindah halaman diberi tanda agar ikut dibacakan.

**8. Hormati `prefers-reduced-motion`.** 💡 RAPIKAN. Cek `window.matchMedia('(prefers-reduced-motion: reduce)')` (atau `@media` di CSS) → matikan transisi/animasi besar saat user memilih kurangi-gerak di setelan OS. 🙂 hormati pengguna yang gampang pusing oleh animasi.

**9. Cincin fokus WAJIB terlihat — JANGAN `outline: none` tanpa penanda pengganti.** 📐 PENTING (WCAG SC 2.4.11). Kalau `outline: none`, WAJIB ganti `:focus-visible { outline: 2px solid <warna>; outline-offset: 2px }` kontras ≥3:1. Pakai `:focus-visible` (bukan `:focus`) agar cincin muncul saat navigasi keyboard, tak mengganggu klik mouse.
```css
:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
```
🙂 "cincin fokus" = garis penanda mengelilingi tombol saat dipilih lewat Tab. Menghapusnya tanpa ganti = pengguna keyboard tersesat.

**10. Konten tetap berfungsi saat diperbesar (Reflow) — JANGAN kunci lebar tetap (piksel mati).** 📐 PENTING (WCAG SC 1.4.10). Saat zoom 400% (setara viewport 320px), konten WAJIB terbaca+berfungsi TANPA scroll dua arah. Hindari `width` piksel-mati pada kontainer utama; pakai satuan relatif/`max-width`/flex/grid (`max-w-*` + `w-full`, bukan `w-[1200px]`). 🙂 pengguna low-vision sering memperbesar 4×; kalau lebar dipaku, tampilan pecah. (Mekanik CSS layout lentur → `skills/react-patterns/SKILL.md`.)

**11. JANGAN minta data yang sama dua kali dalam satu alur (Redundant Entry).** 📐 PENTING (WCAG SC 3.3.7). Dalam 1 proses (checkout/pendaftaran multi-langkah), data yang sudah diisi JANGAN diminta ulang — auto-fill atau opsi "alamat kirim = alamat tagih". Pengecualian sah: ulang demi keamanan (konfirmasi password). 🙂 sudah ketik alamat di langkah 1, jangan suruh ketik lagi di langkah 3.

**12. Kontras elemen NON-TEKS min 3:1 (ikon/border/kontrol) — BEDA dari teks 4,5:1.** 📐 PENTING (WCAG SC 1.4.11). Teks ≥4,5:1, TAPI garis tepi input, ikon bermakna, batas tombol, indikator fokus, batang grafik cukup ≥3:1. Sering tertukar: border input abu tipis (mis. 1.5:1) "kelihatan" tapi gagal WCAG. Verifikasi dengan alat cek-kontras. 🙂 bukan cuma tulisan yang harus jelas — garis kotak isian & ikon juga.

🧪 **Pola yang LANGSUNG di-flag (anti-pattern):** `onClick` di `<div>`/`<span>` tanpa `role`+`tabIndex`+`onKeyDown` · `placeholder` jadi pengganti label · `tabIndex` positif (>0, bikin urutan Tab kacau) · `aria-hidden="true"` pada elemen yang bisa di-fokus (pengguna keyboard terjebak) · `aria-label` pada `<div>` tanpa `role` · `outline: none` tanpa penanda fokus pengganti · kontainer lebar-tetap piksel-mati yang pecah saat zoom 400% · kontras ikon/border < 3:1 · link teks generik "Klik di sini"/"Selengkapnya" tanpa menyebut tujuan · media `autoplay` tanpa kontrol jeda · `alt` diawali "Gambar"/"Foto" (pembaca layar sudah menyebut perannya, jadi dobel).

- 📐 CARA BAKU: **Uji keyboard 30 detik (~0 biaya):** tekan `Tab` dari atas halaman sampai bawah. Semua tombol/link/input WAJIB terjangkau, urutan masuk akal, posisi fokus selalu terlihat. Menangkap mayoritas cacat aksesibilitas tanpa alat khusus.
- 💡 SARAN: jalankan pemeriksa otomatis (axe / Lighthouse / `jest-axe`/`vitest-axe` per komponen) sebagai jaring tambahan — hanya menangkap ~30-40% masalah; uji keyboard + pembaca layar manual tetap perlu (batas jujur §7).

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai")

Jawab dengan bukti `berkas:baris` (tak bisa jawab → belum selesai):
- [ ] Semua fungsi bisa dipakai **cuma keyboard**, fokus **terlihat** (uji `Tab` keliling halaman)?
- [ ] Kontras teks ≥ **4,5:1** & non-teks (ikon/garis) ≥ **3:1** (cek dengan alat, jangan dikira-kira)?
- [ ] Tiap gambar punya `alt`; tiap input punya **label terkait** (bukan cuma placeholder)?
- [ ] Target sentuh **≥ 24px**? Status/error **tidak** dibedakan warna saja (ada ikon/teks)?
- [ ] Heading berurutan; komponen non-standar (modal/tab/dropdown) punya ARIA + jalan via keyboard?
- [ ] Error **per-field** + diumumkan ke pembaca layar (`aria-live`/`role="alert"`)?
- [ ] Tombol-ikon punya `aria-label`? Gambar dekoratif `alt=""`? Modal kembalikan fokus + Esc + focus-trap?
- [ ] Animasi hormati `prefers-reduced-motion`? `outline` fokus tak dihapus tanpa `:focus-visible` pengganti?
- [ ] Tata letak lentur — tak pecah saat zoom 400% (tak ada `width` piksel-mati)? Data tak diminta ulang dalam 1 alur?
- [ ] **4 state UI** (loading/kosong/error/sukses) terpenuhi?

> **Verifikasi WAJIB cuma-baca**: membuktikan = baca kode/markup + uji keyboard + `Grep`, JANGAN jalankan perintah yang mengubah data live.

---

## 5. Definition-of-Done (kapan skill a11y dianggap benar-selesai)

- [ ] **Kontrak (§1) dipenuhi** — aksesibilitas minimum + 4 state UI tercapai di layar yang dibangun/diubah.
- [ ] **Self-verify (§4) semua tercentang** dengan bukti `berkas:baris`.
- [ ] Uji keyboard manual (`Tab` keliling) dilakukan + minimal 1 layar diuji pembaca layar (atau ditandai ⏳ belum-teruji bila alat tak tersedia, jangan diklaim "aman").
- [ ] Microcopy tombol/label ditinjau (aktif, ringkas, dari sudut pengguna).
- [ ] build + lint + test lulus lokal (idealnya gerbang a11y ESLint).

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Angka ambang** (kontras 4,5:1, non-teks 3:1, target sentuh 24px, Core Web Vitals) — angka wajib, jangan dikarang.
- 📐 **Mekanik CSS layout & render React** (Reflow lentur, `dvh`/`svh`, grid responsif, `clamp` resize-text, animasi Motion anti-CLS) → `skills/react-patterns/SKILL.md`.
- 📐 **Arah desain & kualitas visual** (hierarki, state hover/focus dirancang, anti-template) → `skills/design-direction/SKILL.md`.
- 📐 **Escape output & keamanan render konten user** (XSS/CSP) → `skills/owasp/SKILL.md`.
- 🗃️ **LATAR** — SEO metadata halaman publik → `skills/seo/SKILL.md`; boundary Server/Client Next.js → `skills/next-core/SKILL.md`.

---

## 7. Batas jujur

- 🗃️ **LATAR:** skill ini menaikkan **lantai** aksesibilitas ke WCAG 2.2 AA minimum — **tidak menjamin** situs lulus audit AA penuh (WCAG punya puluhan kriteria; ini subset paling berdampak). Pemeriksa otomatis (axe/Lighthouse) hanya menangkap ~30-40% masalah; uji **keyboard + pembaca layar manual** tetap wajib. Level AAA (kontras 7:1) atau kepatuhan hukum spesifik (ADA/EN 301 549) → konsultasi aksesibilitas khusus.
- 🗃️ **LATAR — Kredit (MIT © Affaan Mustafa):** pendalaman a11y diserap dari audit ECC v2.0.0 (`frontend-a11y`, `accessibility`, `a11y-architect`) + standar WCAG 2.2 (W3C). Ditulis ulang untuk staff non-programmer + dinetralkan lintas-framework.
