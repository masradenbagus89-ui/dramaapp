---
nama: frontend-lanjutan
deskripsi: Frontend React lanjutan — tes komponen (RTL), race useEffect/fetch, animasi Motion yang hemat & aksesibel.
divisi: stack
pemicu: [react-testing-library, react-useeffect, framer-motion, react-animasi]
rawan_keamanan: false
menggantikan: []
---

# Skill: Frontend Lanjutan (React/Next.js) — tes komponen · race `useEffect` · Motion

> **Kapan skill ini aktif:** deteksi sama seperti `skills/nextjs/SKILL.md` — paket `next`/`react` terpasang. Blok Motion di dalamnya nyala TAMBAHAN saat paket `motion`/`framer-motion` terpasang. Skill ini **sambungan** dari `skills/nextjs/SKILL.md` — dipecah jadi berkas sendiri karena isinya sudah padat (§4.18 Compaction). Rujukan tabel Web Vitals/CLS (**§G**) dan a11y Reflow (**#10**, WCAG 2.2 SC 1.4.10) dan `useDeferredValue`/`startTransition` (**§E**) tetap memakai nomor seksi di `skills/nextjs/SKILL.md`.
>
> 🙂 **Analogi:** kalau `skills/nextjs/SKILL.md` itu "mesin mobilnya sudah nyala", skill ini adalah **bagian finishing bengkel** — memastikan robot QC-nya (tes) tidak asal bilang "lulus", data yang tampil di layar tidak "ketuker" gara-gara dua permintaan balapan, dan gerak/tampilannya halus tanpa bikin layar "meloncat" atau mengunci orang yang matanya kurang awas.

Skill ini **advisory** (§4.17): otak native yang memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = hasil yang tak boleh gagal apa pun caranya. Cek **versi paket terpasang** dulu (§8.2 Aturan 1 / A3) sebelum menyalin pola apa pun di sini — API `MSW`/`userEvent`/`motion`/Tailwind berubah antar-versi dan jadi sumber #1 kode yang "kelihatan benar tapi tak nyambung".

---

## 1. Kontrak (yang HARUS benar — 3 hasil yang tak boleh gagal)

- 🔒 **HASIL — Tes komponen tak boleh "lolos palsu" (false-green).** Tes yang mencari elemen lewat struktur DOM internal (bukan yang user LIHAT/pakai), yang menunggu pakai `setTimeout` tebak-tebakan, atau yang membiarkan request jaringan tak ter-*mock* lolos diam-diam — semuanya bisa tampak HIJAU padahal fitur aslinya rusak. Robot QC yang bohong lebih berbahaya daripada tak ada robot QC.
- 🔒 **HASIL — Respons `fetch` yang datang terlambat tak boleh menimpa data terbaru.** `useEffect` yang memanggil API tanpa pembatalan (`AbortController`) bisa membuat balapan: permintaan LAMA yang baru selesai belakangan menimpa hasil BARU yang sudah tampil duluan — user melihat data yang salah tanpa ada error sama sekali.
- 🔒 **HASIL — Animasi/layout tak boleh membuat halaman "meloncat" (CLS) atau mengunci teks di satu ukuran.** CLS (*Cumulative Layout Shift* = skor seberapa sering tata letak bergeser) adalah salah satu Ambang Profesional wajib (CLS < 0,1, §1b CLAUDE.md, Core Web Vitals). Teks yang ukurannya HANYA terikat ke lebar layar (`vw` murni) gagal ikut membesar saat user menaikkan ukuran font default browser/OS — melanggar WCAG 2.2 SC 1.4.4 (Resize Text), pengguna low-vision terkunci tak bisa membaca.

---

## 2. Cara rakit (📐 CARA BAKU / 💡 SARAN / 🗃️ LATAR — boleh diganti cara lain yang capai HASIL sama)

### A. Tes komponen React (RTL — React Testing Library)

> 📐 **WAJIB cek versi terpasang dulu (§8.2 Aturan 1):** MSW v1→v2 breaking (`rest`→`http`, `res(ctx.json)`→`HttpResponse.json`); `userEvent` v13→v14 (wajib `setup()`); `jest-axe` (Jest) vs `vitest-axe` (Vitest) — beda paket beda target runner.

1. 📐 **Prioritas query: `getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByText` > `getByTestId`** — uji yang user LIHAT/pakai (peran, label), bukan struktur DOM internal. `getByTestId` = pilihan terakhir.
2. 📐 **`userEvent.setup()` + SELALU `await`** tiap interaksi (`await user.click(...)`) — lebih dekat perilaku user asli daripada `fireEvent`.
3. 📐 **Async pakai `findBy*`/`waitFor`**, JANGAN `setTimeout` lalu assert (sumber flaky #1).
4. 📐 **Mock jaringan di lapis jaringan pakai MSW** dengan `onUnhandledRequest: 'error'` — request yang tak ter-mock membuat tes MERAH keras (lolos diam-diam lebih bahaya, lihat 🔒 §1).
5. 📐 **Gotcha `renderHook` + React Query:** buat `QueryClient` **SEKALI di luar** wrapper. Kalau dibuat di dalam closure wrapper, cache reset tiap render → tes flaky.
6. 💡 **SARAN — tambahan a11y:** jalankan `jest-axe`/`vitest-axe` per komponen interaktif (cek aksesibilitas otomatis, selaras blok a11y di `skills/nextjs/SKILL.md`).

🙂 **Non-Programmer:** tes komponen = "robot QC yang mengklik tombol seperti user asli lalu memastikan reaksinya benar". Aturannya: cari elemen dari yang KELIHATAN user (bukan kode tersembunyi) + tunggu hasil dengan benar (jangan timer tebak-tebakan yang bikin hasil kadang lolos kadang gagal).

### B. Race fetch di `useEffect` (kalau TERPAKSA gulung sendiri, bukan SWR/Query)

- 🗃️ **LATAR:** kebijakan utama tetap pakai SWR/TanStack Query (`skills/nextjs/SKILL.md` §D). Poin B ini untuk kasus one-off yang terpaksa gulung sendiri.
7. 📐 **WAJIB `AbortController` + `return () => controller.abort()`** — batalkan request lama saat `deps` ganti/unmount. Tanpa cleanup: respons lama bisa **menimpa** yang baru (balapan, lihat 🔒 §1) + bocor memori. Set-state yang bergantung nilai lama pakai **functional updater** `setX(prev => ...)` (anti nilai-basi/stale-closure di konteks async/batched — mis. `setItems(prev => [...prev, baru])`).
8. 📐 **Batas error boundary:** `<ErrorBoundary>` HANYA menangkap error saat **render/lifecycle** — BUKAN di event handler (`onClick`) atau kode async (`fetch().then`). Untuk itu pakai `try/catch` + set-state error sendiri.

🙂 **Non-Programmer:** kalau ambil data manual, pasang "tombol batal" supaya permintaan lama yang datang terlambat tak menimpa hasil terbaru — seperti membatalkan pesanan lama saat kamu sudah ganti pesanan.

### C. Debounce input pencarian (search-as-you-type ke server/DB)

- 🗃️ **LATAR — beda peran (jangan tertukar):** `useDeferredValue`/`startTransition` (`skills/nextjs/SKILL.md` §E) menjaga RENDER data-di-memori tetap mulus · `AbortController` (poin B) mengurus BALAPAN respons · SWR/TanStack Query (`skills/nextjs/SKILL.md` §D) men-dedup & meng-cache — TAPI tak satu pun MEMOTONG jumlah request. Itu tugas debounce.
9. 📐 **JANGAN tembak query tiap ketikan.** Simpan `searchQuery` di state, turunkan `debouncedQuery` lewat hook `useDebounce(value, delay)` (intinya `setTimeout` yang di-RESET tiap nilai berubah), lalu picu fetch HANYA saat `debouncedQuery` berubah — delay ~300-500ms. Efek: ketik "laptop" = 1 query, bukan 6 → memangkas read Supabase + invokasi serverless (fungsi yang jalan sesaat tiap permintaan, mis. Vercel/Railway) + menghindari rate-limit (batas jumlah permintaan) & antre di pool koneksi DB (jatah sambungan terbatas). GOTCHA khas kit: SWR/TanStack Query TIDAK men-debounce (tiap huruf = cache-key beda = tetap 1 hit DB) → debounce DULU, baru serahkan hasilnya ke SWR. Tetap pasangkan `AbortController` (poin B) + guard panjang minimal (jangan fire di 1-2 huruf) + kirim di akhir jeda (trailing-edge = tembak sekali setelah user berhenti mengetik). (Cek versi/target terpasang: `useDebounce` = hook userland — aman React 18/19; `setTimeout`/`clearTimeout`/`AbortController` didukung semua browser modern; 300-500ms rentang UX umum, koneksi lambat bisa perlu lebih besar.)

🙂 **Non-Programmer:** kalau kolom pencarian menampilkan hasil sambil user mengetik, tunggu ~⅓–½ detik sampai dia berhenti mengetik baru cari — jangan cari di tiap huruf. Analogi: pelayan menunggu kamu selesai menyebut seluruh pesanan sebelum lari ke dapur, bukan bolak-balik tiap satu kata — lebih hemat, hasil tak kedip-kedip berubah tiap ketukan.

### D. Motion (animasi Framer / `motion`) — anti-CLS & anti-glitch

- 📐 **WAJIB cek versi (§8.2):** paket lama `framer-motion` (impor `framer-motion`) kini jadi `motion` (`npm install motion`, impor `motion/react`) — API bergeser. JANGAN campur `motion/react` & `framer-motion` di 1 proyek.
10. 📐 **`AnimatePresence` `mode` WAJIB eksplisit** — default `"sync"` menjalankan masuk+keluar bersamaan (glitch tumpang-tindih). Modal/toast/page → `mode="wait"`; list/tab → `mode="popLayout"`. Tiap child WAJIB `key` unik.
11. 📐 **Animasikan HANYA `transform` + `opacity`** (murah, GPU) — JANGAN `width/height/top/left` (memicu re-layout = "layout thrash"). Prop `layout` aman di elemen kecil (<300px), tapi di elemen selebar layar → jank + **CLS** (layout loncat, lihat 🔒 §1 — buruk untuk Core Web Vitals/SEO); pakai `layoutId` di anak spesifik.
    - 📐 `will-change` (pakai SEPERLUNYA — jadi KEBALIKAN optimasi kalau berlebihan): `will-change: transform` = "pemanasan" (browser mempromosikan elemen ke layer compositor GPU lebih awal → animasi mulus). TAPI tiap layer makan memori GPU; dipasang PERMANEN atau ke BANYAK elemen (mis. semua kartu product-list) → browser menahan puluhan layer hidup terus → memori bengkak + jank (kebalikan tujuannya), paling parah di HP RAM kecil (`navigator.deviceMemory <= 2`, lihat butir 12) & saat uji 360px. Aturan: kasus umum cukup animasikan `transform`/`opacity` TANPA `will-change` (butir 11); pasang `will-change` HANYA sesaat sebelum animasi (mis. `onMouseEnter`) lalu HAPUS setelah selesai (`onAnimationEnd` → `will-change: auto`), jangan ke ratusan elemen. Catatan: Framer/`motion` mengelola `will-change` otomatis — ini terutama untuk animasi/hover CSS tulisan-tangan.
    - 🙂 `will-change` seperti menyuruh pelari "jongkok siap di start block" biar cepat melesat — bagus untuk SATU pelari sesaat sebelum lomba, tapi kalau SEMUA orang jongkok seharian, lapangan sesak dan malah melambat. Pakai seperlunya (pasang pas mau animasi, lepas begitu selesai), jangan ditempel ke semua elemen — berlebihan malah bikin halaman berat, apalagi di HP murah.
12. 📐 **Motion tokens terpusat** (durasi/easing sekali) + `stagger` ≤ 0.1s + hormati perangkat lemah (`navigator.deviceMemory <= 2` / `hardwareConcurrency <= 4` → animasi minimal) + `prefers-reduced-motion` (a11y, lihat `skills/nextjs/SKILL.md`).
13. 📐 **SSR App Router:** komponen beranimasi WAJIB `"use client"` + set `initial` EKSPLISIT (cegah hydration-mismatch layar kedip).
- 🗃️ CLS di sini nyambung ke tabel Web Vitals **§G** di `skills/nextjs/SKILL.md`.

🙂 **Non-Programmer:** animasi yang salah bikin halaman "loncat-loncat" saat dibuka (buruk untuk peringkat Google) atau berkedip. Aturannya: animasikan yang murah (geser/pudar), jangan yang bikin tata letak dihitung ulang; dan hormati pengguna yang minta "kurangi animasi".

### E. Jebakan CSS layout, viewport & a11y (mobile-first + CWV)

- 🗃️ **LATAR:** otomatis relevan tiap bikin halaman full-screen, grid kartu (mis. product-list), atau teks fluid — selaras uji mobile-first ~360px. Rujukan CLS/Web Vitals pakai tabel **§G** di `skills/nextjs/SKILL.md`; pelengkap a11y Reflow **#10** (WCAG 2.2 SC 1.4.10) di berkas yang sama.

14. 📐 **Full-height di HP: JANGAN `100vh` polos — berlapis `100dvh`.** PENTING (mobile-first + CWV). `100vh` di HP dihitung SEOLAH bilah URL sembunyi → elemen full-height (hero, modal, overlay, bottom-nav `fixed`) ter-clip, CTA bawah ketutup toolbar. Fix progressive-enhancement (tulis 2 baris; browser lama pakai baris pertama, modern menimpa dengan yang kedua): `height: 100vh; height: 100dvh;` (`dvh` = dynamic viewport height = tinggi yang benar-benar terlihat saat itu). Tailwind: `h-dvh`/`min-h-dvh` (butuh Tailwind ≥3.4 — cek versi terpasang). ANTI-CLS (prioritas #1): `dvh` DINAMIS — nilainya berubah saat bilah URL muncul/hilang, bisa bikin layout loncat (lihat tabel §G di `skills/nextjs/SKILL.md`); untuk elemen yang tak boleh geser (overlay/modal kunci) pakai `svh` (small viewport height = tinggi terkecil/paling aman, tak pernah resize); `lvh` = terbesar. Aturan cepat: section penuh → `min-h-dvh`; overlay `fixed` → `svh`. (Cek versi/target: dvh/svh/lvh Baseline modern — Chrome 108 / Safari 15.4, ~2022+, "widely available" sejak 2025; baris `100vh` tetap fallback untuk browser sangat lama.) Contoh kode → §3.
    - 🙂 Non-Programmer: di HP, "1 layar penuh" versi lama (`100vh`) menipu — browser menghitung seakan bilah alamat sedang sembunyi, jadi bagian bawah hero/tombol sering ketutup bilah alamat. Perbaikannya pakai ukuran "tinggi yang benar-benar kelihatan" (`dvh`). Analogi: `100vh` = memesan tirai tanpa menghitung kusen bawah (ada celah); `dvh` = mengukur jendela yang benar-benar tampak. Bagian yang tak boleh bergeser (popup/menu) pakai ukuran "paling aman" (`svh`).

15. 📐 **Grid kartu responsif tanpa media query — hindari scrollbar horizontal.** PENTING (mobile-first). Pakai `grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr))` — BUKAN `minmax(250px, 1fr)` polos. `minmax(250px, 1fr)` mematok minimum kolom 250px; begitu kontainer < 250px (kartu ber-padding, ada sidebar, HP mungil) kolom menolak menyusut → meluber → scrollbar horizontal (buruk untuk mobile-first + langgar WCAG Reflow, lihat #10 di `skills/nextjs/SKILL.md`). Bungkus batas bawah dengan `min(100%, 250px)` = "minimum 250px TAPI jangan lebihi 100% lebar kontainer" → di ruang sempit kolom boleh menyusut, tak meluber. `auto-fit` = jumlah kolom otomatis mengikuti lebar, tanpa media query. (Cek target: `min()`/`minmax()`/`auto-fit` didukung luas sejak ~2020.)
    - 🙂 Non-Programmer: resep rak kartu yang otomatis mengatur jumlah kolom mengikuti lebar layar, plus aturan "kartu boleh mengecil kalau sempit, jangan memaksa lebar sampai tumpah" — seperti rak yang menyempit sendiri di lorong sempit, bukan menjebol dinding sampai orang harus geser kiri-kanan.

16. 📐 **Fluid type/space `clamp()` + jebakan a11y-nya (pendamping Reflow #10).** PENTING (aksesibilitas — WCAG 2.2 SC 1.4.4 Resize Text, lihat 🔒 §1). Boleh pakai `clamp(min, preferensi, max)` di `font-size`/`padding` untuk skala mulus tanpa breakpoint (`clamp` = ambil nilai preferensi, tapi jangan sampai < min atau > max). GOTCHA WAJIB: JANGAN pakai satuan viewport MURNI di bagian tengah (`font-size: 4vw`, atau `clamp(1rem, 5vw, 2rem)` yang tengahnya HANYA `vw`) — teksnya jadi TAK ikut membesar saat user menaikkan ukuran font default browser/OS → GAGAL WCAG 1.4.4 (pengguna low-vision tak bisa memperbesar teks). Selalu sisipkan komponen `rem` di nilai preferensi, mis. `font-size: clamp(1rem, 0.9rem + 0.6vw, 1.5rem)`. `min` untuk teks-isi ≥ ~1rem (16px) supaya terbaca di 360px. Ini melengkapi Reflow (#10 = soal LEBAR/layout, SC 1.4.10); yang ini = soal UKURAN teks (SC 1.4.4). Di Tailwind bisa `text-[clamp(...)]`; utilitas bertingkat `text-sm md:text-lg` tetap sah untuk lompatan diskrit. (Istilah: `vw` = 1% lebar viewport; `rem` = kelipatan ukuran font akar halaman.)
    - 🙂 Non-Programmer: bikin ukuran huruf & jarak "melar-mengkerut" mulus mengikuti lebar layar, seperti baju karet yang pas dari HP kecil sampai monitor besar tanpa menjahit banyak ukuran. TAPI kalau ukurannya cuma diikat ke lebar layar, huruf tak mau membesar saat pengguna yang penglihatannya terbatas menaikkan ukuran font (melanggar aksesibilitas). Solusi: selalu campur sedikit satuan "tetap" supaya huruf tetap bisa diperbesar.

17. 📐 **Gotcha CSS: jangan taruh minus langsung di depan fungsi ukuran.** RAPIKAN (bug hening — tanpa pesan error). Menulis minus tepat di depan fungsi CSS — mis. `right: -clamp(28px,3.5vw,44px)` atau `margin-left: -min(10vw,100px)` — menghasilkan nilai TAK SAH; browser membuangnya diam-diam TANPA error, jadi offset/margin negatif seolah "hilang" (bug hening, boros waktu melacak). Selalu bungkus dengan `calc`: `right: calc(-1 * clamp(28px,3.5vw,44px))`. Catatan: sebagian tool (Tailwind/PostCSS) auto-wrap nilai-negatif arbitrer jadi `calc(... * -1)`, tapi CSS mentah / `style={{}}` inline / CSS-in-JS TIDAK — cek versi/target sebelum mengandalkan auto-wrap. Contoh kode → §3.
    - 🙂 Non-Programmer: kalau mau menarik hiasan sedikit keluar tepi layar dengan ukuran yang otomatis menyesuaikan HP/desktop, jangan menaruh tanda "minus" persis di depan rumus ukurannya — browser diam-diam mengabaikannya (tanpa peringatan). Analogi: seperti menulis "-(2×3)" tapi lupa tanda kurung; bungkus dulu rumusnya, baru dikalikan minus satu.

### F. Poles "terasa rapi" (design-engineering) — detail kecil, dampak besar

- 🗃️ **LATAR:** kumpulan detail CSS murah yang bikin UI terasa "rapi/mahal" — diterapkan AI otomatis tanpa staff perlu tahu CSS. Relevan tiap bikin kartu, tabel, tombol, dashboard, form.

18. 📐 **Angka yang berubah JANGAN geser-geser: `font-variant-numeric: tabular-nums`.** PENTING (harga/tagihan/timer/counter). Font proporsional memberi lebar beda tiap digit → angka yang ter-update (total Rp, saldo, timer, jumlah) bikin kolom "loncat" horizontal (jitter) + susah dibaca sejajar di tabel. `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`) mengunci lebar tiap digit. Pasang di elemen angka: harga, saldo, counter, kolom angka tabel.
    - 🙂 Non-Programmer: angka di kolom "Total" berhenti bergoyang tiap kali berubah — rapi sejajar seperti di kalkulator, bukan geser-geser bikin salah baca.
19. 💡 **SARAN — Sudut membulat bertingkat: radius luar = radius dalam + padding.** RAPIKAN (kartu di dalam kartu). Kartu ber-radius di dalam kartu ber-radius dengan radius SAMA → sudut dalam terlihat "gepeng". Rumus: `radius_luar = radius_dalam + padding` supaya sudut nested optically nyambung. Padding besar → perlakukan sebagai 2 permukaan terpisah (jangan paksa rumus).
    - 🙂 Non-Programmer: bingkai di dalam bingkai — sudutnya diselaraskan biar tak terlihat "penyok".
20. 💡 **SARAN — Teks jangan patah janggal: `text-wrap: balance` / `pretty`.** RAPIKAN. `text-wrap: balance` untuk heading/judul pendek (seimbangkan panjang baris); `text-wrap: pretty` untuk body/caption/list pendek (cegah 1 kata sebatang-kara di baris akhir — "orphan"). JANGAN di prosa panjang/kode/preformat. (Cek target: Baseline modern; `balance` lebih luas didukung dari `pretty` — aman sebagai enhancement, browser lama abaikan diam-diam.)
    - 🙂 Non-Programmer: judul & keterangan tak lagi menyisakan satu kata terlempar sendirian di baris bawah.
21. 📐 **JANGAN `transition: all` — sebut properti eksplisit.** PENTING (performa HP murah). `transition: all` diam-diam ikut menganimasikan properti mahal (layout) + efek tak sengaja → jank di HP RAM kecil. Sebut eksplisit: `transition-property: transform, background-color, box-shadow`. Sejalan pilar Motion (butir 11 — animasikan `transform`/`opacity` yang murah). Sama untuk `will-change`: JANGAN `will-change: all`.
    - 🙂 Non-Programmer: jangan suruh browser "animasikan segalanya" — sebut yang perlu saja, biar HP murah tak berat.

---

## 3. Powerful — 🧪 pola siap-adaptasi (ambil polanya, jangan salin mentah — cek versi paket dulu)

🧪 **CONTOH KASUS — tes komponen (poin A):**
```tsx
// Contoh (cek versi MSW/userEvent terpasang dulu)
const user = userEvent.setup()
render(<LoginForm />)
await user.type(screen.getByLabelText(/email/i), 'a@b.com')
await user.click(screen.getByRole('button', { name: /masuk/i }))
expect(await screen.findByText(/berhasil/i)).toBeInTheDocument()
```

🧪 **CONTOH KASUS — `AbortController` di `useEffect` (poin B):**
```tsx
useEffect(() => {
  const c = new AbortController()
  fetch(url, { signal: c.signal })
    .then(handleResponse)
    .catch(e => { if (e.name !== 'AbortError') setError(e) })  // AbortError = batal normal (diamkan); error NYATA → set-state (jangan telan → langgar 4-state §4)
  return () => c.abort()
}, [url])
```

🧪 **CONTOH KASUS — hook `useDebounce` (poin C):**
```tsx
function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const h = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(h)              // RESET timer tiap ketikan baru
  }, [value, delay])
  return debounced
}
// pakai: fetch HANYA dipicu saat debouncedQuery berubah (bukan tiap huruf)
const debouncedQuery = useDebounce(searchQuery, 400)
```

🧪 **CONTOH KASUS — `dvh`/`svh` viewport (poin E, butir 14):**
```css
.hero    { height: 100vh; height: 100dvh; }  /* section penuh: ikut bilah URL */
.overlay { height: 100svh; }                 /* modal/overlay: tinggi teraman, tak loncat */
```

🧪 **CONTOH KASUS — bungkus minus dengan `calc` (poin E, butir 17):**
```css
right: -clamp(28px, 3.5vw, 44px);           /* ❌ diabaikan browser diam-diam */
right: calc(-1 * clamp(28px, 3.5vw, 44px)); /* ✅ benar */
```

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

- [ ] Tes komponen: query pakai `getByRole`/`getByLabelText` (bukan `getByTestId` sebagai pilihan pertama), `userEvent` di-`await`, async pakai `findBy*`/`waitFor` (bukan `setTimeout`), MSW `onUnhandledRequest: 'error'` terpasang, `QueryClient` dibuat SEKALI di luar wrapper `renderHook`?
- [ ] `useEffect` yang fetch (kalau bukan SWR/Query) punya `AbortController` + `return () => controller.abort()`; set-state pakai functional updater; `<ErrorBoundary>` TIDAK dipakai untuk error di event handler/async?
- [ ] Search-as-you-type pakai `useDebounce` (~300-500ms) SEBELUM fetch, dipasangkan dengan `AbortController` + guard panjang minimal?
- [ ] `AnimatePresence` punya `mode` eksplisit (`wait`/`popLayout`, bukan default `sync`) + tiap child `key` unik; animasi cuma pakai `transform`/`opacity` (bukan `width/height/top/left`); `will-change` dipasang sesaat lalu dilepas (bukan permanen/massal); `prefers-reduced-motion` dihormati; komponen beranimasi App Router punya `"use client"` + `initial` eksplisit?
- [ ] Elemen full-height HP pakai `100dvh` (dengan fallback `100vh`) atau `100svh` untuk overlay — bukan `100vh` polos?
- [ ] Grid kartu pakai `auto-fit` + `minmax(min(100%, Npx), 1fr)` — bukan `minmax(Npx, 1fr)` polos (cek tak ada scrollbar horizontal di 360px)?
- [ ] `clamp()` untuk font-size/padding punya komponen `rem` di nilai preferensi (bukan `vw` murni) — uji: naikkan ukuran font browser, teks ikut membesar?
- [ ] Tak ada nilai CSS minus-langsung-di-depan-fungsi (`-clamp(...)`/`-min(...)`) tanpa dibungkus `calc(-1 * ...)`?
- [ ] Angka yang berubah (harga/saldo/timer) pakai `tabular-nums`? Tak ada `transition: all` / `will-change: all`?

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan = baca kode + jalankan tes (cuma-periksa) + menalar. "0 masalah" dari tes yang sebenarnya error saat dijalankan = klaim palsu (A4) — pastikan tes benar-benar HIJAU, bukan cuma ditulis.

---

## 5. Definition-of-Done (kapan skill frontend-lanjutan dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** tes tak lolos-palsu + fetch `useEffect` tak balapan + animasi/layout tak bikin CLS & tak mengunci ukuran teks.
- [ ] **Edge case** ditangani: request jaringan tak ter-mock (harus gagal keras, bukan lolos), `deps` `useEffect` berganti cepat berkali-kali (request lama harus batal), user mengetik cepat di search-box (tak boleh 1 query/huruf), perangkat lemah (`deviceMemory`/`hardwareConcurrency` rendah) & `prefers-reduced-motion` aktif, bilah URL HP muncul/hilang (elemen full-height tak boleh geser), lebar 360px (grid tak boleh meluber), user menaikkan ukuran font browser (teks harus ikut membesar).
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] `jest-axe`/`vitest-axe` dijalankan untuk komponen interaktif yang diubah.
- [ ] build + lint + test lulus lokal; min 1 tes komponen happy-path (pola §3) dijalankan sungguhan (bukan cuma ditulis).
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** — "selesai" = terbukti dengan bukti (tes dijalankan + keluaran dilihat), bukan "sudah kutulis".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Dasar Next.js/React** (deteksi stack, SWR/TanStack Query §D, `useDeferredValue`/`startTransition` §E, tabel Web Vitals/CLS §G, a11y Reflow #10, checklist a11y umum, `prefers-reduced-motion`) — **jangan dirancang ulang di sini** → `skills/nextjs/SKILL.md`.
- 🗃️ **LATAR — kredit (komunitas, ditulis-ulang non-programmer):**
  - Kredit: skill ECC `make-interfaces-feel-better` (origin komunitas, via pustaka ECC v2.0.0) — ditulis-ulang non-programmer + dinetralkan.
  - Kredit (MIT © Affaan Mustafa): diadaptasi dari skill/aturan ECC v2.0.0 `react-testing`, `rules/react/hooks`, `motion-ui` + `frontend-slides` (`viewport-base.css`, `STYLE_PRESETS.md`, `animation-patterns.md`) + `frontend-patterns` (`useDebounce`) — ditulis-ulang non-programmer + dinetralkan untuk project apa pun.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** kepercayaan pada UI (data yang tampil benar & terbaru, tata letak stabil, bisa diakses semua orang termasuk low-vision/perangkat lemah) DAN keandalan tes (tak false-green). **Mode-gagal khas:** tes lolos padahal skenario nyata gagal (request tak ter-mock diam-diam lolos, `setTimeout` tebak-tebakan) · respons `fetch` lama menimpa yang baru (user melihat data basi tanpa error) · animasi bikin CLS (skor SEO/CWV jeblok, user salah-klik elemen yang bergeser) · teks terkunci di satu ukuran (WCAG 1.4.4 gagal, user low-vision terhalang) · nilai CSS negatif hilang senyap tanpa pesan error. **Mitigasi:** query-by-role + `await` + `findBy*` + MSW `error`-mode (poin A) · `AbortController` + functional updater (poin B) · debounce sebelum fetch (poin C) · `AnimatePresence mode` eksplisit + animasikan `transform`/`opacity` saja + `prefers-reduced-motion` (poin D) · `dvh`/`svh` + grid `auto-fit`/`min()` + `clamp()` ber-`rem` (poin E) · `calc(-1 * ...)` untuk nilai negatif + `tabular-nums` + hindari `transition: all` (poin E/F).
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** kualitas UI React lanjutan; **tidak menggantikan** uji perangkat nyata (real device testing) untuk performa animasi, maupun uji aksesibilitas dengan pengguna low-vision/pembaca layar sungguhan. Cek versi paket terpasang (MSW, `userEvent`, `motion`/`framer-motion`, Tailwind) sebelum menyalin pola — API-nya berubah antar-versi (§8.2 A3).

🙂 **Non-Programmer:** empat hal kecil ini yang sering bikin aplikasi React "kelihatan jalan" tapi sebenarnya rapuh: (1) tes yang bohong bilang lulus padahal skenario aslinya gagal, (2) data yang tampil di layar ternyata bukan yang terbaru karena dua permintaan balapan, (3) halaman "meloncat-loncat" saat animasi jalan atau bilah alamat HP muncul/hilang, dan (4) teks yang tak mau membesar untuk pengguna yang penglihatannya terbatas. Skill ini memasang pagar untuk keempatnya, plus kumpulan detail CSS kecil yang bikin tampilan terasa lebih rapi & lebih hemat baterai HP.
