---
nama: nextjs
deskripsi: Next.js/React kelas industri — batas Server/Client jelas, data di server, performa (LCP/hydration), a11y.
divisi: stack
pemicu: [next.js, nextjs, app-router, server-component, use-client]
rawan_keamanan: false
menggantikan: []
---

# Skill: Next.js / React / TypeScript — kelas industri (frontend + server)

> **Kapan skill ini aktif:** **utama = deteksi config** — project punya `next` di `package.json`, folder `app/` (App Router), atau berkas `*.tsx` (§4.14 auto-detect). Teks "next.js/nextjs/app-router/server-component/use-client" jadi pemicu sekunder. Skill ini paket-stack: tarik pas-ukuran saat menggarap kode Next.js/React, DI ATAS standar inti (§5/§8/§10).
>
> 🙂 **Analogi:** Next.js itu kayak **toko dua lantai** — **lantai server** (dapur, boleh pegang kunci brankas/rahasia) dan **lantai client/browser** (etalase, semua yang dipajang kelihatan siapa saja yang lewat). Taruh kunci brankas di etalase (`NEXT_PUBLIC_*`) = siapa saja bisa mengambilnya.

Skill ini **advisory** (§4.17): otak native yang memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Butir **🔒 HASIL** = hasil keselamatan/keandalan yang tak boleh gagal. Versi framework JANGAN di-hardcode — cek versi terpasang di `package.json` sebelum menyentuh fitur yang bergantung-versi (`optimizePackageImports`, `after()`, `<Activity>`, penamaan `proxy.ts`) — §8.2 A3; jangan salin contoh mentah.

---

## 1. Kontrak (yang HARUS benar — 4 sumber kebocoran/kerusakan tersamar khas Next.js)

- 🔒 **HASIL — Rahasia (secret) jangan bocor ke browser.** Env `NEXT_PUBLIC_*` = **TERBUKA ke publik** (JANGAN taruh kunci rahasia di situ!); kunci server tanpa prefix + jangan dioper sebagai props ke Client Component. (🙂 Non-Programmer: env `NEXT_PUBLIC_` itu terbuka — kayak menempel password di etalase toko.)
- 🔒 **HASIL — Checkpoint wajib penjaga `import "server-only"` (Gerbang Bukti-Jalan §4.19): build GAGAL otomatis kalau rahasia bocor ke browser.** Project Next.js yang memakai secret server (mis. `service_role` Supabase) WAJIB pasang paket npm `server-only` + tulis `import "server-only"` di baris paling ATAS TIAP berkas modul sensitif (klien DB, pembaca secret) — bukan opsional; verifikasi build gagal saat modul ini di-impor Client Component. Kalau Client Component (`"use client"`) tak sengaja mengimpornya, bundler LANGSUNG menggagalkan build — bukan diam-diam mengirim rahasia ke bundel browser. Penjaga waktu-build (compile-time), pelengkap—BUKAN pengganti—aturan `NEXT_PUBLIC_`. Kebalikannya `import "client-only"`. (🙂 stempel "KHUSUS SERVER" di file rahasia — kalau salah colok ke area pelanggan, proses rilis berhenti otomatis, ketahuan SEBELUM online.)
- 🔒 **HASIL — Tiap `"use server"` (Server Action) = pintu publik.** WAJIB cek auth + otorisasi DI DALAM action (`getSession()` + cek role/kepemilikan), JANGAN andalkan tombol yang disembunyikan di Client Component. Pagar sisi browser bisa dilewati — sama bahayanya dengan IDOR (*Insecure Direct Object Reference* = penyerang mengganti ID untuk ambil data orang lain). Pola kode lengkap ada di §3. (🙂 Non-Programmer: menyembunyikan tombol "Hapus" BUKAN keamanan — orang iseng bisa panggil fungsinya langsung. Satpam asli harus di server, kayak BCA cek PIN di pusat.)
- 🔒 **HASIL — Nama berkas middleware = SADAR-VERSI (`proxy.ts` di Next 16+, `middleware.ts` sebelumnya).** 🚨 JANGAN "membetulkan" `proxy.ts` jadi `middleware.ts` di proyek Next 16 — itu MEMATIKAN middleware (auth-guard/redirect mati TANPA error). Sejak Next 16: berkas root `proxy.ts` + fungsi ekspor `proxy` (runtime Node.js); `middleware.ts` masih jalan untuk Edge tapi USANG & akan dihapus (ada codemod migrasi + flag config ikut ganti). Model bawaan dilatih di era `middleware.ts` → rawan salah-koreksi (§8.2). WAJIB cek angka `next` di `package.json` + dok resmi sebelum menyentuh berkas ini. (🙂 nama "satpam pintu masuk" beda tergantung versi Next.js — jangan asal ganti, bisa mematikan satpamnya diam-diam.)

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU / 💡 SARAN, bernomor; boleh diganti cara lain yang capai HASIL sama)

**Dasar Server/Client Component & data**

1. 📐 **Server Component (App Router) = default** (jalan di server, tak terkirim ke browser, bisa `await` langsung); pakai `"use client"` HANYA kalau butuh interaksi/hook. Client TAK boleh impor Server Component (terima lewat `children`).
2. 📐 **Data server:** pakai server-state (TanStack Query/SWR) atau RSC `fetch`, BUKAN `useState` untuk data dari API. Tempat state: lokal → angkat ke induk → Context (hanya nilai jarang-berubah: tema/auth/locale) → store eksternal (Zustand/Jotai) untuk sering-berubah.
3. 📐 **Pisah Container** (ambil data) **vs Presentational** (cuma tampil props).
4. 📐 **4 state UI** (loading/empty/error/success) + error boundary; pakai `next/image` + `next/font` untuk optimasi kecepatan.

🙂 Non-Programmer: pisahkan "halaman yang cuma menampilkan" dari "yang ambil data"; JANGAN tempel kunci rahasia di kode yang ikut terkirim ke browser pengunjung.

> Diterapkan otomatis tiap menyentuh berkas di `app/`, `pages/`, `components/`, atau lapisan data (sesuai §4.13). Urut kategori performa di bawah dari paling berdampak → paling kecil.

**A. Anti-waterfall (paling berdampak — ambil-data berurutan = pembunuh #1 kecepatan)**

5. 📐 Data yang TIDAK saling bergantung pakai `Promise.all([...])` (paralel), bukan `await` berturut-turut. Server Components: pecah jadi child component agar React jalan paralel.
   - 🙂 Non-Programmer: ambil data barengan, jangan antre. Kayak titip 3 GoFood sekaligus, bukan pesan 1 → tunggu → baru ke-2.
6. 📐 PENTING: cek syarat MURAH (props/env/flag) DULU sebelum `await` data jarak-jauh (mis. `if (!id) return null` di awal).
7. 📐 PENTING: geser `await` ke cabang yang BENAR-BENAR pakai datanya (mode guest tak butuh `getUser`).
8. 💡 RAPIKAN: dependensi sebagian — mulai `Promise` lebih awal (`const p = getX()`), `await` saat dipakai. `<Suspense>` dekat data biar halaman tampil sebagian (sisakan ruang skeleton agar layout tak loncat).

**B. Ukuran bundle (JS halaman pertama)**

9. 📐 import LANGSUNG dari path (`@/components/Button`), JANGAN barrel-import (`@/components`) — barrel paksa bundler telusuri seluruh modul (boros 200-800ms). `import()` dinamis WAJIB statis-bisa-dianalisa (cabang eksplisit, jangan `import(\`./pages/${name}\`)`).
    - 🙂 Non-Programmer: ambil 1 baju langsung dari raknya, jangan bongkar SELURUH gudang — halaman kebuka lebih cepat.
10. 📐 PENTING: komponen berat (chart, editor, peta) muat via `dynamic(...)` (`ssr: false`) — di-download saat dibutuhkan, bukan menggembok halaman pertama.

```tsx
const HeavyChart = dynamic(() => import("./HeavyChart"), { loading: () => <Skeleton />, ssr: false });
```

11. 📐 PENTING: skrip pihak-ketiga (analytics, widget chat, logging) muat SETELAH halaman interaktif — `next/script` `strategy="afterInteractive"`/`"lazyOnload"`.

**C. Server-side**

> Butir 🔒 tiap `"use server"` wajib cek auth+otorisasi (Kontrak §1) — pola kode lengkap di §3.

12. 📐 PENTING: bungkus ambil-data per-request dengan `cache()` dari `react` — 3 Server Component panggil `getUser("1")` di render sama = 1 query DB.
13. 📐 PENTING (keamanan/data): JANGAN simpan state berubah di level modul server — DIBAGI ke semua request = 2 user tabrakan data. Pakai penyimpanan per-request (`headers()`, `cookies()`, async context).
14. 💡 RAPIKAN: kirim ke Client Component HANYA kolom yang dipakai (proyeksikan/paginasi di DB). Kerja yang tak perlu menahan respons (logging, warm cache) pakai `after()`.

**D. Client-side fetch**

15. 📐 PENTING: data dipakai banyak komponen → SWR/TanStack Query, JANGAN gulung sendiri `useEffect`+`fetch` (berbagi 1 request+cache, hindari unduh ganda). Listener `scroll`/global cukup 1 yang dibagi + `{ passive: true }`.

**E. Re-render (gambar-ulang berlebihan = interaksi berat)**

16. 📐 TURUNKAN nilai saat render (`const full = \`${first} ${last}\``), JANGAN simpan di `state` lewat `useEffect` (render dobel + flicker). Subscribe ke boolean turunan (`s.cart.length > 0`), bukan nilai mentah (`s.cart`).
    - 🙂 Non-Programmer: hitung langsung saat butuh, jangan simpan salinan gampang basi — mirip rumus Excel yang auto-hitung, bukan ngetik ulang manual.
17. 💡 RAPIKAN: JANGAN definisikan komponen DI DALAM komponen lain (`const Inner = ...` di body `Outer`) — tiap render bikin tipe baru, anaknya ikut bongkar-pasang. Update tak-mendesak (filter, pencarian) bungkus `startTransition`/`useDeferredValue`.
18. 📐 PENTING (data/render): perbarui `state` dengan SALINAN baru (`setItems([...items, baru])`, `setUser({...user, name})`) — JANGAN mutasi objek lama lalu `setState` objek yang sama; React membandingkan referensi, mutasi di tempat bisa GAGAL memicu render. `Array.sort()`/`reverse()` mengubah aslinya → salin dulu (`[...arr].sort()`).
    - 🙂 Non-Programmer: edit "fotokopinya", jangan corat-coret lembar asli — kalau asli diubah langsung, layar kadang tak ikut ter-update.

**F. Rendering & list panjang**

19. 📐 PENTING (integritas data): `key` di `.map()` WAJIB stabil-unik antar-saudara — pakai id database (`key={row.id}`), JANGAN posisi array (`key={index}`) untuk list yang bisa di-urut-ulang/disisipi/dihapus. `index` bikin React salah-cocokkan baris saat urutan berubah → state komponen anak (isi `<input>`, centang checkbox, posisi fokus) NEMPEL ke baris SALAH, tanpa error.
    - 🙂 Non-Programmer: beri tiap baris "NIP tetap" dari database, bukan nomor-urut — kalau daftar diacak, isian user bisa "loncat" ke baris lain diam-diam.
20. 💡 RAPIKAN: list ratusan baris → `content-visibility: auto` (lewati render baris di luar layar). Render kondisional pakai ternary (`count > 0 ? <Badge/> : null`), JANGAN `{count && <Badge/>}` — `0` bisa muncul jadi teks "0".

**G. Peta Web Vitals → kategori perbaikan** (pakai saat audit Lighthouse, cek `berkas:baris`)

21. 📐 Tabel rujukan cepat — cocokkan metrik yang merah di Lighthouse dengan kategori perbaikan A-F di atas:

| Metrik (Lighthouse) | Lihat kategori di atas |
|---|---|
| **LCP** (konten utama muncul) | A Anti-waterfall · B Bundle · resource hints |
| **INP** (respons saat diklik) | E Re-render · F Rendering · JS |
| **CLS** (layout loncat) | F Rendering (taruh `<Suspense>` + sisakan ruang, set dimensi gambar) |
| **TBT** (waktu blokir) | B Bundle · JS · tunda skrip pihak-ketiga (B) |

---

## 3. Powerful — pola siap-adaptasi (jangan salin mentah, netralkan ke versi terpasang)

🧪 **CONTOH KASUS — pola auth di Server Action (memenuhi 🔒 HASIL §1):**

```ts
"use server";
export async function deleteUser(formData: FormData) {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");          // cek login
  const targetId = String(formData.get("id"));
  if (session.user.role !== "admin" && session.user.id !== targetId)
    throw new Error("Forbidden");                                // cek hak akses
  await db.user.delete({ where: { id: targetId } });
}
```

### 🧪 CONTOH pola a11y siap-pakai (React/Next.js) — otomatis tiap bikin form/komponen interaktif

> Terapkan OTOMATIS tiap menulis/menilai `<input>`, modal, dropdown, tombol-ikon, atau animasi — bukan tambahan opsional. Selaras divisi UI/UX (`skills/uiux/SKILL.md`) + standar WCAG 2.2. Tiap pola diberi label keseriusan asli sumber (📐 = PENTING/keamanan-pengguna disabilitas+hukum aksesibilitas, bukan RAPIKAN; 💡 = RAPIKAN).

**1. Label form WAJIB tersambung (`htmlFor` ↔ `id`).** 📐 PENTING.
- 👨‍💻 Programmer: `<label htmlFor="email">` + `<input id="email">`. `placeholder` BUKAN pengganti label (hilang saat mengetik + tak dibaca screen reader / pembaca-layar). Field wajib: `required aria-required="true"` + asterisk `<span aria-hidden="true">*</span>`.
- 🙂 Non-Programmer: tiap kotak isian punya "nama tertulis" yang nyambung — kayak label di loker; placeholder abu-abu doang bikin pengguna pembaca-layar tak tahu kotak itu untuk apa.

```tsx
<label htmlFor="email">Email <span aria-hidden="true">*</span></label>
<input id="email" type="email" required aria-required="true" />
```

**2. Pesan error tersambung ke kotaknya (`aria-describedby` + `role="alert"` + `aria-invalid`).** 📐 PENTING.
- 👨‍💻 Programmer: input punya `aria-describedby={errId}` + `aria-invalid={!!error}`; elemen error punya `id={errId}` + `role="alert"` (otomatis diumumkan saat muncul).
- 🙂 Non-Programmer: peringatan salah harus "nempel resmi" ke kotaknya + langsung dibacakan — mirip notif WhatsApp yang muncul+bersuara, bukan badge diam yang terlewat.

```tsx
<input id="email" aria-describedby={error ? 'email-error' : undefined} aria-invalid={!!error} />
{error && <span id="email-error" role="alert">{error}</span>}
```

**3. Pakai elemen HTML yang tepat (semantik), jangan `<div onClick>`.** 📐 PENTING.
- 👨‍💻 Programmer: tombol → `<button type="button">` (bisa fokus + Enter/Space + diumumkan "button"); navigasi → `<a href>`. `<div onClick>` butuh `role`+`tabIndex={0}`+`onKeyDown` manual (gampang lupa). Heading berurutan (h1→h2, jangan lompat h1→h4).
- 🙂 Non-Programmer: pakai "tombol asli", bukan "kotak dicat mirip tombol" — tombol asli bisa ditekan keyboard + dikenali alat bantu; kotak palsu tak bisa dipakai pengguna keyboard.

**4. Tombol hanya-ikon WAJIB `aria-label`; gambar hiasan `alt="" aria-hidden`.** 📐 PENTING.
- 👨‍💻 Programmer: `<button aria-label="Hapus item"><TrashIcon aria-hidden="true" /></button>`. Gambar bermakna → `alt` deskriptif; gambar dekoratif → `alt="" aria-hidden="true"`.
- 🙂 Non-Programmer: ikon tong-sampah tanpa tulisan = pembaca-layar baca "tombol" doang. Beri `aria-label` biar dibacakan "tombol Hapus"; gambar hiasan disembunyikan dari pembaca-layar.

**5. Modal: kembalikan fokus + Esc-tutup (focus-trap pakai library).** 📐 PENTING.
- 👨‍💻 Programmer: simpan `document.activeElement` saat buka → fokus ke modal (`role="dialog" aria-modal="true" aria-labelledby` + `tabIndex={-1}`) → kembalikan fokus ke pemicu saat tutup; Esc menutup. **Focus trap penuh** (Tab/Shift+Tab muter di modal) pakai library teruji `focus-trap-react`, jangan tulis sendiri (§8.2).
- 🙂 Non-Programmer: popup muncul → "kursor keyboard" pindah ke dalam popup; ditutup → balik ke tombol pembuka. Kayak ATM yang balikin ke menu utama setelah transaksi, bukan nyasar.

```tsx
useEffect(() => {
  if (isOpen) { prev.current = document.activeElement as HTMLElement; ref.current?.focus(); }
  else prev.current?.focus();
}, [isOpen]);
```

**6. Komponen kustom (dropdown/menu) WAJIB jalan dengan keyboard saja.** 📐 PENTING.
- 👨‍💻 Programmer: `onKeyDown` tangani `ArrowUp`/`ArrowDown` (geser pilihan, `e.preventDefault()`), `Enter`/`Space` (pilih), `Escape` (tutup); pakai role ARIA yang benar (`combobox`/`listbox`/`option` + `aria-expanded`/`aria-selected`).
- 🙂 Non-Programmer: menu buatan sendiri harus bisa dipakai tanpa mouse (panah pindah, Enter pilih, Esc tutup) — banyak pengguna (motorik terbatas/power-user) tak pakai mouse.

**7. Konten yang berubah sendiri (notif/status) pakai `aria-live`.** 💡 RAPIKAN.
- 👨‍💻 Programmer: `<div role="status" aria-live="polite" aria-atomic="true">` untuk update non-mendesak; `aria-live="assertive"` HANYA untuk error mendesak (menyela pembacaan).
- 🙂 Non-Programmer: teks "Tersimpan!" yang muncul tanpa pindah halaman harus diberi tanda agar pembaca-layar ikut membacakannya (kalau tidak, pengguna tunanetra tak tahu ada perubahan).

**8. Hormati `prefers-reduced-motion` (sebagian pengguna pusing/mual oleh animasi).** 💡 RAPIKAN.
- 👨‍💻 Programmer: cek `window.matchMedia('(prefers-reduced-motion: reduce)')` (atau `@media` di CSS) → matikan transisi/animasi besar saat user memilih kurangi-gerak di setelan OS.
- 🙂 Non-Programmer: pengguna set "kurangi animasi" di HP/laptop (untuk yang gampang pusing) → hormati, matikan animasi meliuk-liuk. Mirip mode hemat-baterai yang menyederhanakan tampilan.

**9. Cincin fokus (focus ring) WAJIB terlihat — JANGAN `outline: none` tanpa penanda pengganti.** 📐 PENTING. (WCAG 2.2 SC 2.4.11)
- 👨‍💻 Programmer: mereset `outline` bawaan tanpa mengganti penanda fokus bikin pengguna keyboard tak tahu posisi kursor. Kalau `outline: none`, WAJIB ganti `:focus-visible { outline: 2px solid <warna>; outline-offset: 2px }` dengan kontras ≥3:1 ke latar. Pakai `:focus-visible` (bukan `:focus`) agar cincin muncul saat navigasi keyboard, tak mengganggu klik mouse.
- 🙂 Non-Programmer: "cincin fokus" = garis penanda mengelilingi tombol/kotak isian saat dipilih lewat tombol Tab. Menghapusnya tanpa ganti = pengguna keyboard tersesat, kayak main game tanpa penunjuk kursor.

```css
:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
```

**10. Konten tetap berfungsi saat diperbesar (Reflow) — JANGAN kunci lebar tetap (piksel mati).** 📐 PENTING. (WCAG 2.2 SC 1.4.10)
- 👨‍💻 Programmer: saat zoom 400% (setara viewport 320px), konten WAJIB tetap terbaca+berfungsi TANPA scroll dua arah. Hindari `width` piksel-mati pada kontainer utama; pakai satuan relatif/`max-width`/flex/grid yang membungkus (`max-w-*` + `w-full`, bukan `w-[1200px]`).
- 🙂 Non-Programmer: pengguna low-vision sering memperbesar layar 4×; kalau lebar dipaku, tampilan pecah + geser kiri-kanan. Bikin lentur mengikuti layar.

**11. JANGAN minta data yang sama dua kali dalam satu alur (Redundant Entry).** 📐 PENTING. (WCAG 2.2 SC 3.3.7)
- 👨‍💻 Programmer: dalam 1 proses (checkout/pendaftaran multi-langkah), data yang sudah diisi JANGAN diminta ulang — auto-fill atau opsi "alamat pengiriman = alamat penagihan". Pengecualian sah: ulang demi keamanan (konfirmasi password).
- 🙂 Non-Programmer: kalau pengguna sudah ketik alamat di langkah 1, jangan suruh ketik lagi di langkah 3 — capek + rawan salah.

**12. Kontras elemen NON-TEKS min 3:1 (ikon/border/kontrol) — BEDA dari teks 4.5:1.** 📐 PENTING. (WCAG 2.2 SC 1.4.11)
- 👨‍💻 Programmer: teks butuh kontras ≥4.5:1, TAPI komponen non-teks — garis tepi input, ikon bermakna, batas tombol, indikator fokus, batang grafik — cukup ≥3:1 ke latar. Sering tertukar: border input abu tipis (mis. 1.5:1) "kelihatan" tapi gagal WCAG. Verifikasi dengan alat cek-kontras.
- 🙂 Non-Programmer: bukan cuma tulisan yang harus cukup jelas — garis kotak isian, ikon, tepi tombol juga. Angkanya beda: tulisan ketat (4.5:1), ikon/garis longgar (3:1).

🧪 **Pola yang LANGSUNG di-flag (anti-pattern):** `onClick` di `<div>`/`<span>` tanpa `role`+`tabIndex`+`onKeyDown` · `placeholder` jadi pengganti label · `tabIndex` positif (>0, bikin urutan Tab kacau) · `aria-hidden="true"` pada elemen yang bisa di-fokus (pengguna keyboard terjebak) · `aria-label` pada `<div>` tanpa `role` · `outline: none` tanpa penanda fokus pengganti · kontainer lebar-tetap piksel-mati yang pecah saat zoom 400% · kontras ikon/border < 3:1 · link teks generik "Klik di sini"/"Selengkapnya" tanpa menyebut tujuan · media `autoplay` tanpa kontrol jeda · `alt` diawali "Gambar"/"Foto" (pembaca-layar sudah menyebut perannya, jadi dobel).

> 🗃️ LATAR — 🤖 **Otomasi opsional (gerbang mesin):** sebagian pola-flag di atas (XSS `dangerouslySetInnerHTML`, `<div onClick>` tanpa role, `key={index}`) bisa ditangkap ESLint secara pasti (deterministik) — resep gerbang lint bertahap (keamanan=error, a11y=warn, opt-in) di `STACK_GUIDE.md` §7.6.

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

**Kontrak (§1) & performa:**
- [ ] Tak ada secret/rahasia server ikut ke Client Component / bundel browser? Modul sensitif (klien DB, pembaca secret) pakai `import "server-only"` di baris teratas — build gagal kalau di-impor Client Component?
- [ ] Tiap `"use server"` (Server Action) cek auth+otorisasi DI DALAM action (bukan cuma sembunyi tombol di UI)?
- [ ] Nama berkas middleware (`proxy.ts`/`middleware.ts`) sesuai versi `next` di `package.json`?
- [ ] Data independen diambil paralel (`Promise.all`), bukan `await` berurutan? Syarat murah dicek dulu sebelum fetch jarak-jauh?
- [ ] Import langsung per-path (bukan barrel-import); komponen berat pakai `dynamic(...)`?
- [ ] `key` di `.map()` pakai id database (bukan `index`) untuk list yang bisa berubah urutan?
- [ ] State diupdate dengan salinan baru (`{...obj}`/`[...arr]`), bukan mutasi objek/array lama?
- [ ] State server-only tak disimpan di level modul (dibagi antar-request)? `rows`/data per-request pakai `cache()`/`headers()`/`cookies()`?
- [ ] 4 state UI (loading/empty/error/success) + error boundary ada?

**Aksesibilitas (checklist cepat pra-review komponen interaktif):**
- [ ] Tiap input punya `<label htmlFor>` (bukan cuma `placeholder`)?
- [ ] Error pakai `aria-describedby` + `role="alert"` + `aria-invalid`?
- [ ] Tak ada `onClick` di `<div>`/`<span>` tanpa `role`+`tabIndex`+`onKeyDown`?
- [ ] Tombol-ikon punya `aria-label`?
- [ ] Gambar dekoratif `alt=""`?
- [ ] Modal kembalikan fokus saat tutup + Esc menutup + focus-trap?
- [ ] Konten dinamis (notif/status) pakai `aria-live`?
- [ ] Animasi hormati `prefers-reduced-motion`?
- [ ] `outline` fokus tak dihapus tanpa `:focus-visible` pengganti?
- [ ] Tata letak lentur — tak pecah saat zoom 400% (tak ada `width` piksel-mati)?
- [ ] Data tak diminta ulang dalam 1 alur (Redundant Entry)?
- [ ] Kontras non-teks (ikon/garis/kontrol) ≥3:1 (beda dari teks 4.5:1)?
- [ ] Teks link menyebut tujuan (bukan "klik di sini"/"selengkapnya")?
- [ ] Tak ada media auto-play tanpa kontrol jeda?
- [ ] `alt` tak diawali "Gambar/Foto" (dobel dengan pengumuman pembaca-layar)?

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan = baca kode + build (menangkap penjaga `server-only`) + menalar. Uji IDOR pada Server Action: coba panggil action dengan ID milik orang lain.

---

## 5. Definition-of-Done (kapan skill Next.js dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** rahasia tak bocor ke browser + penjaga `server-only` terpasang + Server Action ber-otorisasi + nama berkas middleware sesuai versi.
- [ ] **Edge case** ditangani: hydration mismatch (server vs client render beda), list diurut-ulang/disisipi/dihapus (uji `key`), 2 request bersamaan menyentuh state modul-level, zoom 400%, `prefers-reduced-motion` aktif, koneksi lambat (skeleton/`Suspense`).
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Build lulus (termasuk penjaga `server-only` kalau dipasang) + lint (idealnya gerbang a11y ESLint, §3 Otomasi opsional) + test lulus lokal.
- [ ] Audit performa (Lighthouse) dicek terhadap Peta Web Vitals (§2 butir 21) untuk halaman yang disentuh.
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** — "selesai" = terbukti (build dilihat, bukan "sudah kutulis").

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Kalau Server Action/route handler jadi kontrak API penuh** (status code, amplop respons, otorisasi per-resource) → `skills/backend/SKILL.md`.
- 📐 **Keamanan web lebih dalam** (SQL injection, CSRF, rate-limit, upload, SSRF) → `skills/owasp/SKILL.md`.
- 📐 **Login/sesi/cek-izin (RBAC)** → `skills/auth/SKILL.md`.
- 📐 **a11y/UX di luar pola kode** (microcopy, alur, riset pengguna) → `skills/uiux/SKILL.md`.
- 📐 **Panggilan API luar tahan-gagal** (retry/backoff/circuit-breaker) → `skills/tahan-gagal/SKILL.md`.
- 🗃️ **LATAR — kredit (MIT © Affaan Mustafa):** §performa diadaptasi dari `react-performance`; pola `key` stabil / `import "server-only"` / immutability state dari `react-patterns` + `coding-standards`; aturan sadar-versi `proxy.ts` dari `nextjs-turbopack` — ECC v2.0.0 (ditulis-ulang non-programmer).
- 🗃️ **LATAR — kredit (MIT © Affaan Mustafa):** blok a11y diadaptasi dari `frontend-a11y` + `accessibility` + `a11y-architect` ECC v2.0.0 (ditulis-ulang non-programmer).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** kerahasiaan secret server, integritas render/state list, kejelasian jalur otorisasi Server Action, aksesibilitas pengguna disabilitas. **Mode-gagal khas** (kode "kelihatan benar" tapi bocor/rusak diam-diam): `NEXT_PUBLIC_*` menyimpan rahasia → siapa saja bisa ambil; Server Action dipanggil langsung tanpa lewat UI (tombol disembunyikan ≠ proteksi); salah-migrasi `middleware.ts`↔`proxy.ts` mematikan auth-guard TANPA error; `key={index}` bikin state input/checkbox "nempel" ke baris salah saat list diurut ulang; state modul-level di server dibagi ke semua request → 2 user tabrakan data; pola a11y dilanggar → pengguna disabilitas tak bisa pakai + risiko hukum aksesibilitas. **Mitigasi:** `import "server-only"` (build gagal kalau bocor) + auth&otorisasi di dalam Server Action + cek `package.json` sebelum sentuh middleware + `key` pakai id database + state per-request (`headers()`/`cookies()`) + 12 pola a11y §3 + checklist pra-review §4.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** performa + a11y + keamanan dasar Next.js/React; **tidak menggantikan** audit Lighthouse manual, audit a11y profesional (pengujian screen reader/pembaca-layar sungguhan) untuk kasus kompleks, atau load-testing skala tinggi. Fitur (`optimizePackageImports`, `after()`, `<Activity>`, `proxy.ts`) bergantung versi `next` terpasang — cek dokumentasi resmi versi ITU (§8.2 A3), jangan salin contoh dari internet mentah-mentah.

🙂 **Non-Programmer:** Next.js memisahkan "dapur" (server, boleh pegang rahasia) dari "etalase" (browser, semua kelihatan) — kesalahan paling mahal adalah menaruh kunci dapur di etalase, atau lupa memasang satpam (cek login) di pintu belakang (Server Action) karena mengira tombolnya sudah "disembunyikan" cukup aman. Dua hal lain yang sering bikin aplikasi "kelihatan jalan" tapi sebenarnya rusak diam-diam: daftar yang nomor urutnya dipakai sebagai penanda baris (isian pengguna bisa "loncat" ke baris lain saat daftar diacak), dan halaman yang tak bisa dipakai penyandang disabilitas (label tak nyambung, fokus keyboard hilang, animasi bikin pusing). Skill ini memasang pagar untuk semuanya.
