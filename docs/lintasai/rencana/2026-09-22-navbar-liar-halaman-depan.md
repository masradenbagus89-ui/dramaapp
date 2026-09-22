# 2026-09-22 — Navbar liar di halaman depan: sebabnya KETEMU & terbukti

**Bobot: BERAT.** Bukan karena banyak kode, tapi karena berkas yang disentuh
(`TopNav`, `BottomNav`) dipasang di root layout dan **menentukan siapa dapat
navigasi**. Salah langkah di sini menghapus navigasi sebuah halaman **tanpa satu
pun error** — kerusakan senyap, persis yang sudah diperingatkan di
`app/components/TopNav.tsx:64-71`.

## 1. Keluhan owner

Halaman depan sesaat menampilkan **dua baris kepala** (navbar hitam + bar merah)
sebelum JavaScript aktif, lalu navbar hitamnya hilang sendiri. Tercatat sebagai
anomali ❓ sejak 2026-09-21 di `HANDOFF.md`, dengan catatan tegas **"jangan tebak
sebabnya"**.

## 2. Yang DIUKUR (✅ terverifikasi, bukan ingatan)

HTML produksi diambil langsung, dihitung dengan sidik-jari yang **hanya** milik
`TopNav` (`sticky top-0 z-30 border-b border-zinc-800 bg-black/95 backdrop-blur`,
`app/components/TopNav.tsx:161`):

| Halaman | `TopNav` di HTML | Seharusnya | Putusan |
|---|---|---|---|
| `/` | **1** | 0 (`PUBLIC_PATHS`) | ❌ **MELANGGAR** |
| `/login` | 0 | 0 (`PUBLIC_PATHS`) | ✅ |
| `/daftar` | 0 | 0 (`PUBLIC_PATHS`) | ✅ |
| `/beranda` | 0 | 0 (`PUNYA_BAR_CARI`) | ✅ |
| `/discover` | 0 | 0 (`PUNYA_BAR_CARI`) | ✅ |
| `/shorts` | 1 | 1 | ✅ |
| `/playly` | 1 | 1 | ✅ |

`BottomNav` ikut diukur dan **mengidap hal yang sama, juga hanya di `/`**
(`fixed bottom-0` ada di HTML `/`, padahal `/` ada di `PUBLIC_PATHS`; di `/login`
& `/daftar` benar-benar nol).

⚠️ **Koreksi atas inferensi awal saya sendiri:** hitungan pertama memakai kelas
`h-9 w-9 object-contain` dan menyimpulkan `/login` + `/daftar` ikut melanggar.
**Salah** — kelas itu juga dipakai header milik halamannya sendiri
(`app/login/page.tsx:89`, `app/daftar/page.tsx:93`). Angka di tabel atas adalah
hasil hitung-ulang dengan sidik-jari yang benar.

## 3. Sebab yang DIREPRODUKSI (bukan tebakan)

Tes penyelidik merender `TopNav` sungguhan dengan `usePathname()` dipalsukan:

| Nilai `usePathname()` | Hasil |
|---|---|
| `"/"` | kosong ✅ |
| `null` | kosong ✅ (diselamatkan `?? "/"`) |
| `undefined` | kosong ✅ (diselamatkan `?? "/"`) |
| **`""`** | **NAVBAR MUNCUL** ❌ |
| **`"/index"`** | **NAVBAR MUNCUL** ❌ |

Dua cacat bertumpuk:

1. **`app/components/TopNav.tsx:76` — `usePathname() ?? "/"`.** Operator `??`
   hanya menangkap `null`/`undefined`; **string kosong lolos**. `BottomNav`
   mengulang baris yang sama (`app/components/BottomNav.tsx:59`).
2. **Bentuk logikanya *denylist* (gagal-terbuka).** `TopNav.tsx:143-145`
   berbunyi "sembunyikan di daftar ini, **selain itu tampilkan**" → nilai apa pun
   yang tak dikenali membuat navbar **MUNCUL**. Gagalnya ke arah yang dilihat
   penonton.

❓ **Yang TETAP belum terbukti:** mana dari dua nilai itu yang sebenarnya
dikirim Vercel saat pra-render alamat akar. **Justru itu sebabnya perbaikannya
harus benar tanpa perlu tahu nilainya** — bukan menambal satu nilai yang ditebak.

Bukti pendukung bahwa ini khusus alamat akar: `pathname` terbukti **benar** di
`/login`, `/daftar`, `/beranda`, `/discover` (semuanya lolos penyaring dengan
tepat). Jadi yang menyimpang cuma nilai untuk route `/`.

## 4. PRE-MORTEM — anggap ini sudah dikerjakan dan NOL guna bagi owner. Kenapa?

**Penyebab paling mungkin #1:** owner membuka situs sesudah rilis, **masih
melihat dua baris kepala**, lalu menyimpulkan gagal. Sebabnya bukan kodenya:
header terukur `X-Vercel-Cache: STALE` dengan `Age: 5426` (≈90 menit) — HTML lama
bisa bertahan. → **Masuk rencana:** verifikasi tayang wajib memakai penangkal
cache + membaca `X-Vercel-Cache`, bukan sekadar membuka browser.

**Penyebab paling mungkin #2:** daftar allowlist yang saya susun **melewatkan
satu halaman**, sehingga halaman itu kehilangan seluruh navigasinya di layar
komputer — senyap. → **Masuk rencana:** penjaganya WAJIB **menyusuri berkas di
disk** (`app/**/page.tsx`), bukan daftar tulis-tangan; halaman baru yang tak
terklasifikasi = tes **MERAH**.

## 5. Yang akan diubah

1. **`lib/navigasi-halaman.ts` (BARU)** — satu sumber kebenaran: daftar halaman
   yang punya navbar atas & navigasi bawah, plus dua fungsi murni
   `punyaNavbarAtas()` / `punyaNavigasiBawah()`. Dipakai `TopNav`, `BottomNav`,
   dan tesnya. Alasan dipisah: aturannya sekarang hidup di dua komponen; kalau
   salah satu bergeser sendiri, halaman bisa kehilangan navigasi.
2. **Denylist → allowlist (gagal-tertutup).** Navigasi digambar **hanya** untuk
   alamat yang dikenali. Nilai aneh (`""`, `/index`, apa pun) → navigasi
   disembunyikan. Arah gagal yang aman: halaman tetap utuh, navigasi muncul
   begitu halaman aktif — bukan dua baris kepala yang berkedip.
3. **Pencocokan per-segmen**, bukan `startsWith` mentah: `/drama` tidak boleh
   ikut mencocoki `/dramaku`.

## 6. Yang TIDAK dibangun (sengaja)

- **Tidak** memindahkan 16 folder halaman ke route group `app/(navbar)/`.
  Itu memang lebih murni (struktur route yang memutuskan, nol ketergantungan
  pada `usePathname`), tapi harganya 16 pemindahan folder di situs yang sedang
  tayang — sementara allowlist sudah benar terhadap kegagalan yang **terbukti**.
  §3.9: yang paling sederhana menang kalau kebenarannya sama. Dicatat sebagai
  kemungkinan naik-kelas, bukan dikerjakan sekarang.
- **Tidak** mengubah perilaku satu halaman pun. 12 halaman bernavbar & 7 tanpa
  navbar tetap sama persis — sudah diukur satu per satu di produksi lebih dulu.
- **Tidak** menyentuh `/discover` yang sesaat menampilkan "Memuat..."
  (`app/discover/page.tsx:52`). Itu keluhan terpisah, masih menunggu owner.

## 7. Yang ikut tersenggol

| Yang memakai kode ini | Penjaganya |
|---|---|
| **Seluruh 19 halaman** (`TopNav`+`BottomNav` di root layout `app/layout.tsx:56,58`) | `tests/kepala-situs.test.ts` — diperluas menyusuri disk |
| `/beranda`, `/discover` — navigasinya dipegang `KepalaKatalog` | tes yang sama sudah mengadu `TUJUAN` vs `LINKS` |
| Kotak kuning penanda menu aktif (`measurePill`) | tetap memakai `pathname`; salah nilai = penanda tak muncul, **tanpa kerusakan** — sengaja dibiarkan |

## 8. Tahapan

1. Buat `lib/navigasi-halaman.ts` + tes yang MERAH dulu (reproduksi `""`).
2. Pasang ke `TopNav` & `BottomNav`.
3. Perluas `tests/kepala-situs.test.ts`: susuri disk + regresi nilai aneh.
4. Gerbang `AGENTS.local.md` §6 — urutan `build` → `tsc` → `test`.
5. Izin owner → dual push → verifikasi tayang dengan penangkal cache.

---

👨‍🎓 **Junior-frontend:** `usePathname()` dipakai di client component yang
di-mount dari root layout, jadi nilainya saat prerender/SSR bukan sesuatu yang
kode kita kontrol. Menggabungkannya dengan guard berbentuk denylist membuat
default-nya render — fail-open. Perbaikannya membalik polaritas guard jadi
allowlist per-segmen dan memindahkan daftarnya ke satu modul murni yang bisa
diuji langsung.

🙂 **Non-frontend:** situs ini menebak "halaman apa yang sedang dibuka" dari sisi
browser. Untuk halaman depan tebakannya meleset, dan karena aturannya berbunyi
"tampilkan saja kalau tidak yakin", baris menu hitam ikut tergambar lalu hilang
sendiri — itu kedipan yang owner lihat. Aturannya dibalik jadi "tampilkan hanya
kalau yakin", supaya kalau meleset lagi hasilnya diam, bukan berkedip.
