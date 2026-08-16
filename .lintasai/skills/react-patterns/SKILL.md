---
nama: react-patterns
deskripsi: Pola & performa React kelas industri — anti-waterfall, bundle ramping, re-render minimal, key stabil, tes komponen jujur, race fetch, Motion anti-CLS, compound components + custom hooks.
divisi: stack
pemicu: [react, react-patterns, react-testing-library, react-useeffect, framer-motion, react-animasi, custom-hooks, compound-components, tanstack-query, react-query, use-memo, use-callback, harus-refresh-dulu, gak-ikut-berubah, tidak-ikut-berubah, nilai-lama-muncul]
rawan_keamanan: false
menggantikan: []
---

# Skill: Pola & Performa React — kelas industri

> Skill ini paket pola React DI ATAS standar inti; batas Server/Client & keamanan Next.js dipisah ke `skills/next-core/SKILL.md`, aksesibilitas ke `skills/a11y/SKILL.md`.
>
> **Inti:** skill ini memastikan aplikasi cepat (performa), tes komponen tak asal bilang "lulus", data di layar tak tertukar gara-gara dua permintaan balapan, dan gerak/tampilannya halus tanpa bikin layar "meloncat".

Cek **versi paket terpasang** dulu sebelum menyalin pola apa pun — API `MSW`/`userEvent`/`motion`/React Query/Tailwind berubah antar-versi & jadi sumber #1 kode yang "kelihatan benar tapi tak nyambung".

📐 **Resep anti-halusinasi versi (perpanjangan "no quote = no claim" ke dependensi):** sebelum memakai API yang lebih baru dari pengetahuan model → BUKTIKAN ia ada di versi terpasang: `grep -rl "namaAPI" node_modules/<paket>/dist` (atau folder build paketnya) + baca `version` di `node_modules/<paket>/package.json`. **0 hasil = API tak ada di versi ini: JANGAN pakai** — sebut alternatif utk versi terpasang + tawarkan upgrade sebagai pilihan terpisah.

---

## 1. Kontrak (yang HARUS benar — hasil yang tak boleh gagal)

- 🔒 **HASIL — Tes komponen tak boleh "lolos palsu" (false-green).** Tes yang mencari elemen lewat struktur DOM internal (bukan yang user LIHAT/pakai), menunggu pakai `setTimeout` tebak-tebakan, atau membiarkan request jaringan tak ter-*mock* lolos diam-diam — semuanya bisa tampak HIJAU padahal fitur aslinya rusak. Robot QC yang bohong lebih berbahaya daripada tak ada robot QC.
- 🔒 **HASIL — Respons `fetch` yang datang terlambat tak boleh menimpa data terbaru.** `useEffect` yang memanggil API tanpa pembatalan (`AbortController`) bisa membuat balapan: permintaan LAMA yang selesai belakangan menimpa hasil BARU yang sudah tampil — user melihat data salah tanpa ada error.
- 🔒 **HASIL — Animasi/layout tak boleh membuat halaman "meloncat" (CLS) atau mengunci teks di satu ukuran.** CLS (*Cumulative Layout Shift* = skor seberapa sering tata letak bergeser) adalah Ambang Profesional wajib (CLS < 0,1, Core Web Vitals). Teks yang ukurannya HANYA terikat lebar layar (`vw` murni) gagal ikut membesar saat user menaikkan ukuran font default browser/OS — melanggar WCAG 2.2 SC 1.4.4, pengguna low-vision terkunci.

---

## 2. Cara rakit (📐 CARA BAKU / 💡 SARAN — boleh diganti cara lain yang capai HASIL sama)

Detail 24 butir dipindah ke berkas rujukan on-demand — buka HANYA yang relevan tugasmu (hemat token). Huruf sub-seksi (A-I) & nomor butir (1-24) TETAP berlaku untuk rujuk-silang (mis. "§F butir 11"):

| Sub-seksi (butir) | Isi ringkas | → Baca (kapan) |
|---|---|---|
| **A** Anti-waterfall (1-2) · **B** Bundle (3-4) · **C** Re-render (5-7) · **D** Rendering & list (8-9) | `Promise.all` paralel, anti barrel-import + `dynamic()`, immutability + turunkan-saat-render, `key` id-database. | `skills/react-patterns/rujukan/performa-render.md` (kapan: halaman lambat, bundle bengkak, interaksi berat, `.map()`/list) |
| **E** Tes RTL (10) · **F** Race fetch & debounce (11-12) | Query-by-role + MSW error-mode; `AbortController` + ErrorBoundary ber-reset; `useDebounce` search. | `skills/react-patterns/rujukan/tes-data-fetching.md` (kapan: nulis tes komponen, `useEffect`+`fetch`, search-as-you-type) |
| **G** Motion (13-14) · **H** CSS layout & viewport (15-18) | `AnimatePresence mode` + animasi `transform`/`opacity` saja; `dvh`/`svh`, grid `auto-fit`, `clamp` ber-`rem`. | `skills/react-patterns/rujukan/motion-css-layout.md` (kapan: animasi, full-height HP, fluid type, audit CLS) |
| **I** Komponen & hook dipakai-ulang (19-24) | Compound components; custom hooks + jebakan infinite-loop `useQuery`; varian eksplisit anti boolean-prop; React 19. | `skills/react-patterns/rujukan/komponen-reusable.md` (kapan: bikin komponen/hook reusable, refactor props, `forwardRef`) |

---

## 3. Powerful — 🧪 pola siap-adaptasi (ambil polanya, cek versi paket dulu)

Contoh kode 🧪 dipindah menyatu dengan butir pemiliknya: `AbortController` + `useDebounce` → `skills/react-patterns/rujukan/tes-data-fetching.md`; `useQuery` stabil-referensi + compound component + varian eksplisit (❌/✅) → `skills/react-patterns/rujukan/komponen-reusable.md`; `dvh`/`svh` + minus `calc` → `skills/react-patterns/rujukan/motion-css-layout.md`; **Peta Web Vitals → kategori perbaikan** (pakai saat audit Lighthouse) → `skills/react-patterns/rujukan/performa-render.md`.

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai")

- [ ] Data independen diambil paralel (`Promise.all`), bukan `await` berurutan? Syarat murah dicek dulu sebelum fetch jarak-jauh?
- [ ] Import langsung per-path (bukan barrel); komponen berat pakai `dynamic(...)`?
- [ ] `key` di `.map()` pakai id database (bukan `index`) untuk list yang bisa berubah urutan?
- [ ] State diupdate dengan salinan baru (`{...obj}`/`[...arr]`), bukan mutasi objek/array lama? Nilai turunan dihitung saat render, bukan disimpan via `useEffect`?
- [ ] Tes: query pakai `getByRole`/`getByLabelText` (bukan `getByTestId` dulu), `userEvent` di-`await`, async `findBy*`/`waitFor`, MSW `onUnhandledRequest: 'error'`, `QueryClient` dibuat SEKALI di luar wrapper?
- [ ] `useEffect` fetch (bukan SWR/Query) punya `AbortController` + cleanup; set-state functional updater; `<ErrorBoundary>` tak dipakai untuk error event/async, dan **bisa di-reset** (tombol + `resetKeys`, bukan jalan buntu yang menuntut refresh manual)?
- [ ] Search-as-you-type di-`useDebounce` SEBELUM fetch? `useQuery`/`useEffect` tak infinite-loop (fetcher/opsi stabil-referensi, bukan literal tiap render)?
- [ ] `AnimatePresence` punya `mode` eksplisit + child `key` unik; animasi cuma `transform`/`opacity`; `prefers-reduced-motion` dihormati; komponen beranimasi App Router `"use client"` + `initial`?
- [ ] Full-height HP `100dvh`/`svh` (bukan `100vh` polos)? Grid `auto-fit`+`minmax(min(100%,N),1fr)`? `clamp()` punya `rem` di nilai tengah? Tak ada `-clamp(...)` tanpa `calc`? Angka berubah `tabular-nums`? Tak ada `transition: all`?
- [ ] Komponen ber-mode banyak pakai varian eksplisit (bukan tumpukan boolean props)? `children` utk susun struktur (render-props hanya saat butuh data balik)? React 19: `ref` prop biasa tanpa `forwardRef` — versi `react` dicek?

> **Verifikasi WAJIB cuma-baca:** membuktikan = baca kode + jalankan tes (cuma-periksa) + menalar. "0 masalah" dari tes yang sebenarnya error = klaim palsu — pastikan tes benar-benar HIJAU, bukan cuma ditulis.

---

## 5. Definition-of-Done (kapan skill react-patterns dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** tes tak lolos-palsu + fetch `useEffect` tak balapan + animasi/layout tak bikin CLS & tak mengunci ukuran teks.
- [ ] **Edge case** ditangani: request tak ter-mock (gagal keras), `deps` berganti cepat (request lama batal), ketik cepat di search (tak 1 query/huruf), perangkat lemah + `prefers-reduced-motion`, bilah URL HP muncul/hilang, lebar 360px (grid tak meluber), user menaikkan ukuran font (teks ikut besar), fetcher literal (tak infinite-loop).
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Audit Lighthouse dicek terhadap Peta Web Vitals (§3 → `skills/react-patterns/rujukan/performa-render.md`) untuk halaman yang disentuh; `jest-axe`/`vitest-axe` untuk komponen interaktif.
- [ ] build + lint + test lulus lokal; min 1 tes komponen happy-path dijalankan sungguhan (bukan cuma ditulis).

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Batas Server/Client, secret, Server Action auth, middleware** → `skills/next-core/SKILL.md`.
- 📐 **Aksesibilitas** (label, fokus, ARIA, kontras, Reflow #10, Resize-Text) → `skills/a11y/SKILL.md`.
- 📐 **Arah desain & kualitas visual** → `skills/design-direction/SKILL.md`.
- 📐 **Kontrak API penuh** (status code, amplop respons) → `skills/backend/SKILL.md`; **panggilan API luar tahan-gagal** (retry/backoff/circuit-breaker) → `skills/tahan-gagal/SKILL.md`.
- 🗃️ **LATAR — kredit (MIT © Affaan Mustafa):** §performa dari `react-performance`; `key` stabil / immutability state dari `react-patterns` + `coding-standards`; tes dari `react-testing`; `useDebounce` + compound components + custom hooks + jebakan `useQuery` dari `frontend-patterns`; Motion/CSS dari `motion-ui` + `frontend-slides` — ECC v2.0.0 (ditulis-ulang non-programmer + dinetralkan). Skill `make-interfaces-feel-better` (origin komunitas, via ECC v2.0.0) — ditulis-ulang.
- 🗃️ **LATAR — kredit (MIT © Vercel, `vercel-labs/agent-skills`, serap 2026-08-09):** §I butir 22-24 (kini `skills/react-patterns/rujukan/komponen-reusable.md`) dari `composition-patterns` (avoid-boolean-props · explicit-variants · children-over-render-props · react19-no-forwardref) — ditulis-ulang dua-register. **DITOLAK dari sumber sama (jangan usulkan ulang):** 14 rule `js-*` micro-optimization (dampak marjinal, dorong premature-optimization) · `react-view-transitions` (API canary belum stabil — tapi TEKNIK verifikasinya "grep node_modules dulu" justru diserap sebagai resep anti-halusinasi-versi di atas) · pola kompilasi AGENTS.md duplikat-penuh (sumber drift terbukti) · fetch aturan runtime dari repo upstream (supply-chain + mati offline). `async-parallel`/`bundle-barrel-imports`/`bundle-dynamic-imports` TIDAK diserap-ulang — sudah tercakup §A-§B (kini `skills/react-patterns/rujukan/performa-render.md`) sejak ECC.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** kepercayaan pada UI (data tampil benar & terbaru, tata letak stabil) + keandalan tes (tak false-green) + kapasitas API (tak di-hammer loop). **Mode-gagal khas:** tes lolos padahal skenario gagal (request tak ter-mock, `setTimeout`) · respons `fetch` lama menimpa baru · `useQuery` infinite-loop menghantam API · animasi bikin CLS (SEO/CWV jeblok) · teks terkunci ukuran (WCAG 1.4.4) · `key={index}` bikin state input nempel baris salah · nilai CSS negatif hilang senyap. **Mitigasi:** query-by-role + `await` + MSW error-mode + `AbortController` + functional updater + debounce + fetcher stabil-referensi + `AnimatePresence mode` + `transform`/`opacity` saja + `dvh`/`svh` + grid `min()` + `clamp` ber-`rem` + `key` id-database.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** performa & kualitas React; **tidak menggantikan** audit Lighthouse manual atau uji perangkat nyata untuk performa animasi.

🙂 **Non-Programmer:** hal-hal kecil ini yang sering bikin aplikasi React "kelihatan jalan" tapi rapuh: (1) tes yang bohong bilang lulus, (2) data di layar bukan yang terbaru karena dua permintaan balapan, (3) pencarian yang menembak server tak berhenti (loop), (4) halaman "meloncat" saat animasi, (5) teks tak mau membesar untuk pengguna low-vision. Skill ini memasang pagar untuk semuanya, plus resep bikin halaman kebuka lebih cepat & hemat baterai HP.
