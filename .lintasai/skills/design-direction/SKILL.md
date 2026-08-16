---
nama: design-direction
deskripsi: Arah desain & kualitas visual — tetapkan arah dulu (cocokkan ke domain), anti-template-generik, hierarki + state hover/focus yang dirancang, design token.
divisi: frontend
pemicu: [desain, design, tata-letak, layout, antarmuka, landing, hero, mockup, branding, tipografi, font, palet, tema-warna, dark-mode, mode-gelap, design-token, tampilan-hp, mobile-friendly, layar-kecil, bikin responsive]
rawan_keamanan: false
menggantikan: [tampilan/desain]
---

# Skill: Arah Desain — tampilan visual & merek (anti-generik)

> **Inti:** UI template default terlihat generik & gampang dikenali sebagai belum disesuaikan. Diatur sedikit (warna/font/tata letak sesuai produk) langsung terasa "dibuat khusus" & lebih dipercaya.

Yang **TIDAK** boleh dikorbankan demi estetika = butir **🔒 HASIL** di §1.

---

## 1. Kontrak (yang tak boleh dikorbankan demi gaya)

- 🔒 **HASIL — 🚨 Keamanan & aksesibilitas menang atas estetika:** konten dari user/API yang dirender sebagai tampilan **WAJIB tetap di-escape/sanitasi** (`skills/owasp/SKILL.md`) — hiasan desain tak boleh membuka celah skrip jahat. Kontras teks minimal **4,5:1** & target sentuh **~44px** tetap WAJIB (`skills/a11y/SKILL.md`) walau demi gaya.
- 📐 CARA BAKU: **Design token** — 1 sumber warna/jarak/font/radius; JANGAN tulis nilai mentah berulang. Dark mode (kalau perlu) lewat token, bukan tambal per halaman. Mobile-first: uji minimal lebar ~360px.
- 📐 CARA BAKU: **Konten berat = jaga tetap ringan.** List panjang (>50 item) → **virtualisasi** / paginasi; gambar/font/bundle dioptimalkan (target halaman utama **<500KB**). Halaman publik → jaga **Core Web Vitals** (LCP/INP/CLS) — angka ambang JANGAN dikarang; pasang **RUM** (*Real-User-Monitoring* = ukur kecepatan dari user asli) sejak rilis biar angkanya TERBUKTI. Heading semantik berurutan (satu `<h1>` → sub-heading turun rapi), bukan dari ukuran font.

---

## 2. Pilih ARAH DESAIN dulu — sebelum nulis kode (5 pertanyaan, 1-2 menit)

📐 CARA BAKU: AI WAJIB tetapkan ini dulu (boleh tanya staff singkat), JANGAN langsung koding:
1. **Tujuan** — layar ini buat apa? (jualan / kerja harian / pamer karya / lapor data)
2. **Siapa pemakainya** — yang di-scan PERTAMA apa? (operator gudang butuh angka stok dulu, bukan banner besar)
3. **Nada (tone)** — pilih SATU eksplisit: padat & tenang (alat kerja harian) / ekspresif & berani (landing, portofolio, game) / rapi-formal. JANGAN paksa gaya "halaman iklan" ke alat harian.
4. 💡 SARAN: **Satu detail berkesan** — 1 ide desain yang bikin hasil terasa disengaja (tipografi judul khas, 1 kartu "bento" beda ukuran).
5. **Batasan** — framework terpasang (cek versi terpasang), aksesibilitas (`skills/a11y/SKILL.md`), design-token yang sudah ada — pakai yang ADA dulu sebelum bikin sistem baru.

> 🏢 **Cocokkan arah ke DOMAIN (heuristik inti):** alat operasi / SaaS internal / dashboard analitik = **padat, tenang, mudah di-scan, grid disiplin**; portofolio / launch / editorial / brand mewah = boleh **ekspresif, tipografi berani, ruang lega**. Developer-tool = boleh "terminal/mono". **JANGAN default ke dark mode otomatis** dan jangan tempel gaya "landing marketing" ke aplikasi kerja harian. Arah salah-domain = hasil "kelihatan bagus tapi salah rasa".

---

## 3. Powerful — daftar "JANGAN" (pola generik) + ~6 kualitas wajib

💡 SARAN: **Jangan kirim tampilan template mentah** — hindari 9 pola generik yang bikin "kembar & murah": ❌ kartu-kotak abu-abu seragam tanpa hierarki · ❌ hero generik (teks tengah + gradient/blob ungu + CTA template) · ❌ card-in-card · ❌ dashboard "asal tempel" tanpa prioritas · ❌ font default tanpa alasan · ❌ palet "satu nada" (abu di atas putih + 1 aksen) · ❌ sembunyikan alat utama di balik marketing · ❌ tambah library baru cuma demi 1 hiasan · ❌ menjelaskan fitur UI di dalam UI padahal tombolnya sudah jelas sendiri. Konsisten dengan komponen yang sudah ada (shadcn/Tailwind) + ikut gaya halaman lain.

### 🧪 Pasangan ❌ SALAH → ✅ BENAR (pola siap-tiru — tiru bentuknya, bukan warnanya)

Daftar "JANGAN" di atas cuma memberi tahu apa yang dihindari. Tiga pasangan ini menunjukkan **bentuk yang benar** — itu yang bisa langsung ditiru.

**1. Hero generik → hero ber-hierarki.** 🙂 Non-Programmer: layar pertama harus langsung menjelaskan produkmu, bukan memajang kalimat indah yang bisa dipakai perusahaan mana pun.

❌ SALAH — semua rata-tengah, ukuran seragam, kalimat bisa ditempel ke produk apa pun:
```html
<section class="text-center py-24 bg-gradient-to-r from-purple-500 to-pink-500">
  <h1 class="text-4xl">Selamat Datang</h1>
  <p class="text-4xl">Solusi terbaik untuk bisnis Anda</p>
  <button class="mt-4">Mulai Sekarang</button>
</section>
```

✅ BENAR — satu hal menang (judul), kalimat menyebut pekerjaan nyata, satu aksi utama:
```html
<section class="py-20 max-w-3xl">
  <h1 class="text-5xl font-semibold tracking-tight">Catat stok gudang tanpa Excel</h1>
  <p class="mt-4 text-lg text-muted-foreground">Scan barcode, stok langsung turun. Laporan harian otomatis.</p>
  <div class="mt-8 flex gap-3">
    <button class="px-5 py-2.5 font-medium">Coba gratis 14 hari</button>
    <button class="px-5 py-2.5 text-muted-foreground">Lihat demo</button>
  </div>
</section>
```

**2. Nilai mentah berulang → design token.** 🙂 Non-Programmer: warna/jarak ditulis di SATU tempat, jadi ganti tema cukup sekali — bukan berburu ke seluruh halaman.

❌ SALAH — kode warna disalin ke mana-mana; dark mode jadi tambal-sulam per komponen:
```css
.card   { background: #1f2937; border: 1px solid #374151; padding: 16px; }
.panel  { background: #1f2937; border: 1px solid #374151; padding: 16px; }
.dialog { background: #1f2937; border: 1px solid #374151; padding: 15px; }
```

✅ BENAR — satu sumber; dark mode = tukar nilai token, komponen tak disentuh:
```css
:root            { --surface: #ffffff; --line: #e5e7eb; --pad-card: 1rem; }
[data-theme=dark]{ --surface: #1f2937; --line: #374151; }
.card, .panel, .dialog { background: var(--surface); border: 1px solid var(--line); padding: var(--pad-card); }
```

**3. Kartu seragam → hierarki yang disengaja.** 🙂 Non-Programmer: kalau semua terlihat sama penting, mata pemakai tak tahu harus melihat ke mana dulu.

❌ SALAH — enam kartu identik; angka penting tenggelam sejajar labelnya:
```html
<div class="grid grid-cols-3 gap-4">
  <div class="border p-4"><span>Pesanan</span><span>128</span></div>
  <div class="border p-4"><span>Stok menipis</span><span>7</span></div>
</div>
```

✅ BENAR — angka menang atas label, status kritis diberi warna BERMAKNA (bukan hiasan):
```html
<div class="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
  <div class="rounded-lg border p-5">
    <p class="text-sm text-muted-foreground">Pesanan hari ini</p>
    <p class="mt-1 text-3xl font-semibold tabular-nums">128</p>
  </div>
  <div class="rounded-lg border border-amber-300 bg-amber-50 p-5">
    <p class="text-sm text-amber-900">Stok menipis</p>
    <p class="mt-1 text-3xl font-semibold tabular-nums text-amber-900">7</p>
  </div>
</div>
```

> `tabular-nums` dipakai supaya angka tak bergeser saat berubah; `minmax(min(100%,220px),1fr)` mencegah scrollbar horizontal di layar sempit (mekanik lengkap → `skills/react-patterns/rujukan/motion-css-layout.md`).

---

💡 SARAN: **~6 kualitas — tiap layar penting tunjukkan minimal 4:** (1) hierarki lewat beda ukuran · (2) irama jarak disengaja (kelompok berkaitan dirapatkan) · (3) kedalaman/lapisan (tumpang-tindih/bayangan) · (4) warna bermakna (merah=bahaya, hijau=sukses), bukan hiasan · (5) **state hover/focus/active yang terasa dirancang** (sekaligus bantu aksesibilitas `skills/a11y/SKILL.md`) · (6) gambar/ikon nyata saat konten bergantung padanya.

> 👨‍💻 CSS variables/design-token supaya konsisten lintas-state; responsive constraints eksplisit (grid, aspect-ratio, min/max) agar toolbar/grid tak geser saat hover; verifikasi teks panjang wrap rapi di ~360px & desktop. Animasi: hemat & untuk memperjelas alur, bukan hiasan yang mengganggu (mekanik anti-CLS → `skills/react-patterns/SKILL.md`).

---

## 4. Self-verify (checklist "tampilan selesai")

- [ ] Tidak terlihat seperti template Tailwind/shadcn default (lulus daftar "JANGAN" §3)?
- [ ] Layar pertama langsung menjelaskan produk/alur — bukan basa-basi marketing?
- [ ] Ada hierarki (ada yang menonjol), bukan semua seragam?
- [ ] Arah desain cocok dengan DOMAIN (§2 — alat kerja padat/tenang, bukan gaya landing dipaksakan)?
- [ ] Ada state hover/focus/active jelas (juga bisa di-fokus keyboard — `skills/a11y/SKILL.md`)?
- [ ] Dukung mode terang & gelap → dua-duanya terasa disengaja?
- [ ] 🔒 Konten user/API di-escape (anti-XSS) + kontras ≥4,5:1 + target tap ~44px terpenuhi?

---

## 5. Definition-of-Done

- [ ] Arah desain (§2 — 5 pertanyaan + cocok-domain) ditetapkan SEBELUM koding.
- [ ] Lulus checklist Self-verify (§4), termasuk butir 🔒 keamanan/aksesibilitas.
- [ ] 4 state UI (loading/kosong/error/sukses) + responsive ~360px terverifikasi (rujuk `skills/a11y/SKILL.md`).
- [ ] Akan terlihat meyakinkan sebagai screenshot produk nyata.

---

## 6. Handoff / rujuk-silang (reuse-first — jangan salin)

- 📐 Aksesibilitas WCAG (kontras/keyboard/target-sentuh/ARIA) + 4 state UI detail → `skills/a11y/SKILL.md`.
- 📐 Mekanik CSS layout & animasi (grid responsif, `dvh`/`svh`, `clamp`, Motion anti-CLS, `tabular-nums`) → `skills/react-patterns/SKILL.md`.
- 📐 Escape output & keamanan render konten user (XSS/CSP) → `skills/owasp/SKILL.md`.
- 🗃️ LATAR — Kredit (MIT © Affaan Mustafa): `design-quality` + `frontend-design-direction` ECC v2.0.0 (ditulis-ulang non-programmer + dinetralkan).

---

## 7. Batas jujur

- 🗃️ **LATAR:** skill ini menaikkan lantai kualitas visual + menjaga 2 pagar keras (escape + kontras/target-sentuh); ia **tidak** menggantikan riset desain mendalam atau design system penuh untuk produk besar. Selera visual (💡) boleh dilewati dengan alasan; 🔒 keamanan/aksesibilitas tidak.
