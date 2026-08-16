# Motion & jebakan CSS layout/viewport (§2.G-H) — rujukan `react-patterns`

> Bagian dari `skills/react-patterns` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
> Konteks: detail butir §2.G-H (Motion anti-CLS · `dvh`/`svh` · grid · `clamp`) + 🧪 contoh kodenya — Kontrak 🔒 §1, Self-verify & DoD tetap di `skills/react-patterns/SKILL.md`.

### G. Motion (animasi Framer / `motion`) — anti-CLS & anti-glitch

> 📐 **Cek versi:** paket lama `framer-motion` kini `motion` (`npm install motion`, impor `motion/react`) — API bergeser; JANGAN campur keduanya.

13. 📐 **`AnimatePresence` `mode` WAJIB eksplisit** — default `"sync"` bikin glitch tumpang-tindih; modal/toast → `mode="wait"`, list/tab → `mode="popLayout"`. Tiap child `key` unik.
14. 📐 **Animasikan HANYA `transform` + `opacity`** (murah, GPU) — JANGAN `width/height/top/left` (memicu re-layout + **CLS** 🔒 §1 SKILL.md inti). `will-change` pasang SESAAT sebelum animasi (mis. `onMouseEnter`) lalu HAPUS (`onAnimationEnd`), jangan permanen/massal (memori GPU bengkak, parah di HP RAM kecil). Motion tokens terpusat + `stagger` ≤ 0.1s + hormati `navigator.deviceMemory <= 2` & `prefers-reduced-motion` (`skills/a11y/SKILL.md`). SSR App Router: komponen beranimasi WAJIB `"use client"` + `initial` eksplisit (cegah hydration-mismatch).

### H. Jebakan CSS layout, viewport & poles rapi (mobile-first + CWV)

15. 📐 **Full-height HP: JANGAN `100vh` polos — berlapis.** `height: 100vh; height: 100dvh;` (`dvh` = tinggi yang benar-benar terlihat). Overlay/modal yang tak boleh geser → `svh` (paling aman, tak resize). Tailwind `h-dvh`/`min-h-dvh` (butuh Tailwind ≥3.4). 🙂 di HP, `100vh` menipu — bagian bawah hero/tombol ketutup bilah alamat.
16. 📐 **Grid kartu responsif tanpa media query:** `grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr))` — BUKAN `minmax(250px, 1fr)` polos (yang meluber → scrollbar horizontal, langgar WCAG Reflow `skills/a11y/SKILL.md` #10).
17. 📐 **Fluid type `clamp()` + jebakan a11y (Resize Text, WCAG 1.4.4 🔒 §1 SKILL.md inti).** JANGAN satuan viewport MURNI di nilai tengah (`clamp(1rem, 5vw, 2rem)`) — teks tak ikut membesar saat user menaikkan font default → gagal WCAG. Selalu sisipkan `rem`: `clamp(1rem, 0.9rem + 0.6vw, 1.5rem)`. `min` teks-isi ≥ ~1rem.
18. 📐 **Gotcha:** minus langsung di depan fungsi CSS (`right: -clamp(...)`) = nilai TAK SAH, dibuang browser diam-diam (bug hening) → bungkus `calc(-1 * clamp(...))`. **Angka berubah** (harga/saldo/timer) pakai `font-variant-numeric: tabular-nums` (anti-geser). **JANGAN `transition: all`** — sebut properti eksplisit (`transition-property: transform, box-shadow`).

---

### 🧪 Pasangan ❌ SALAH → ✅ BENAR (tiga jebakan yang paling sering lolos ke produksi)

**1. Animasi yang memicu re-layout (sumber CLS).** 🙂 Non-Programmer: kalau ukuran elemen dianimasikan, browser menghitung ulang seluruh tata letak tiap frame — halaman tersendat dan konten meloncat saat dibaca.

❌ SALAH — `width`/`height`/`top` memaksa re-layout tiap frame:
```css
.panel { transition: width .3s, height .3s; }
.panel:hover { width: 320px; height: 200px; }
```

✅ BENAR — hanya `transform`/`opacity` (GPU, nol re-layout); properti disebut eksplisit:
```css
.panel { transition-property: transform, opacity; transition-duration: .3s; }
.panel:hover { transform: scale(1.04); }
```

**2. `100vh` di HP.** 🙂 Non-Programmer: di ponsel, bilah alamat menutupi bagian bawah layar — tombol utama jadi tak terlihat tanpa scroll.

❌ SALAH — bagian bawah hero ketutup bilah alamat:
```css
.hero { height: 100vh; }
```

✅ BENAR — berlapis; `svh` untuk overlay yang tak boleh loncat saat bilah menyusut:
```css
.hero    { height: 100vh; height: 100dvh; }
.overlay { height: 100svh; }
```

**3. `clamp()` bersatuan viewport murni.** 🙂 Non-Programmer: pemakai yang memperbesar ukuran huruf di setelan HP-nya tak mendapat apa-apa — teks tetap kecil (gagal WCAG 1.4.4).

❌ SALAH — nilai tengah murni `vw`, teks tak ikut membesar:
```css
h1 { font-size: clamp(1rem, 5vw, 2rem); }
```

✅ BENAR — selalu sisipkan `rem` di nilai tengah:
```css
h1 { font-size: clamp(1rem, 0.9rem + 0.6vw, 1.5rem); }
```

---

🧪 **`dvh`/`svh` + minus `calc` (§H di atas):**
```css
.hero    { height: 100vh; height: 100dvh; }  /* section penuh: ikut bilah URL */
.overlay { height: 100svh; }                 /* modal/overlay: tinggi teraman, tak loncat */
.badge   { right: calc(-1 * clamp(28px, 3.5vw, 44px)); } /* ✅ minus dibungkus calc */
```
