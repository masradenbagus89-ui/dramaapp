# Performa & render React (§2.A-D + Peta Web Vitals) — rujukan `react-patterns`

> Bagian dari `skills/react-patterns` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
> Konteks: detail butir §2.A-D (anti-waterfall · bundle · re-render · list) + Peta Web Vitals — Kontrak 🔒 §1, Self-verify & DoD tetap di `skills/react-patterns/SKILL.md`.

### A. Performa — anti-waterfall (paling berdampak: ambil-data berurutan = pembunuh #1 kecepatan)

1. 📐 Data yang TIDAK saling bergantung pakai `Promise.all([...])` (paralel), bukan `await` berturut-turut. Server Components: pecah jadi child component agar React jalan paralel.
2. 📐 Cek syarat MURAH (props/env/flag) DULU sebelum `await` data jarak-jauh (`if (!id) return null` di awal); geser `await` ke cabang yang BENAR-BENAR pakai datanya. `<Suspense>` dekat data biar halaman tampil sebagian (sisakan ruang skeleton agar layout tak loncat).

### B. Ukuran bundle (JS halaman pertama)

3. 📐 import LANGSUNG dari path (`@/components/Button`), JANGAN barrel-import (`@/components`) — barrel paksa bundler telusuri seluruh modul (boros 200-800ms). `import()` dinamis WAJIB statis-bisa-dianalisa (cabang eksplisit, jangan `import(\`./pages/${name}\`)`).
4. 📐 Komponen berat (chart, editor, peta) muat via `dynamic(...)` (`ssr: false`) — di-download saat dibutuhkan; skrip pihak-ketiga (analytics, chat) muat SETELAH interaktif (`next/script` `strategy="afterInteractive"`/`"lazyOnload"`).

### C. Re-render (gambar-ulang berlebihan = interaksi berat)

5. 📐 **TURUNKAN nilai saat render** (`const full = \`${first} ${last}\``), JANGAN simpan di `state` lewat `useEffect` (render dobel + flicker). 🙂 hitung langsung saat butuh, jangan simpan salinan yang gampang basi.
6. 📐 PENTING (data/render): perbarui `state` dengan SALINAN baru (`setItems([...items, baru])`, `setUser({...user, name})`) — JANGAN mutasi objek lama lalu `setState` objek yang sama; React membandingkan referensi, mutasi di tempat bisa GAGAL memicu render. `Array.sort()`/`reverse()` mengubah aslinya → salin dulu (`[...arr].sort()`).
7. 💡 RAPIKAN: JANGAN definisikan komponen DI DALAM komponen lain (`const Inner = ...` di body `Outer`) — tiap render bikin tipe baru, anaknya ikut bongkar-pasang. Update tak-mendesak (filter, pencarian) bungkus `startTransition`/`useDeferredValue`. `useMemo` untuk komputasi mahal, `useCallback` untuk fungsi yang dioper ke child ber-`React.memo` — **jangan** taburkan di mana-mana (biaya sendiri).

### D. Rendering & list panjang

8. 📐 PENTING (integritas data): `key` di `.map()` WAJIB stabil-unik antar-saudara — pakai id database (`key={row.id}`), JANGAN posisi array (`key={index}`) untuk list yang bisa di-urut-ulang/disisipi/dihapus. `index` bikin React salah-cocokkan baris → state anak (isi `<input>`, centang checkbox, fokus) NEMPEL ke baris SALAH, tanpa error.
9. 💡 RAPIKAN: list ratusan baris → `content-visibility: auto` (lewati render baris di luar layar). Render kondisional pakai ternary (`count > 0 ? <Badge/> : null`), JANGAN `{count && <Badge/>}` — `0` bisa muncul jadi teks "0".

### Peta Web Vitals → kategori perbaikan (pakai saat audit Lighthouse)

| Metrik (Lighthouse) | Lihat bagian |
|---|---|
| **LCP** (konten utama muncul) | A Anti-waterfall · B Bundle (di atas) |
| **INP** (respons saat diklik) | C Re-render · D Rendering (di atas) |
| **CLS** (layout loncat) | D Rendering (di atas) + G Motion → `skills/react-patterns/rujukan/motion-css-layout.md` (`<Suspense>` + sisakan ruang, set dimensi gambar) |
| **TBT** (waktu blokir) | B Bundle (di atas) · tunda skrip pihak-ketiga |
