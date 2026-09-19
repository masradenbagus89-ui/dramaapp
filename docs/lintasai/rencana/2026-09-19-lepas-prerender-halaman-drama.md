# 2026-09-19 — Lepas prerender halaman drama supaya gerbang rilis bisa lulus

**Status:** ✅ SELESAI & TERBUKTI, **belum di-push** (menunggu izin rilis owner).
**Bobot:** SEDANG — 2 berkas kode, tapi menyentuh titik-risiko **rilis** + perilaku halaman yang sudah tayang.
**Keputusan owner:** disajikan 3 opsi; owner memilih opsi 1 (lepas prerender).

## Masalah yang diselesaikan

`npm run build` **tidak bisa lulus selama 4 hari** (2026-09-15 → 19), sehingga 7 commit tertahan —
termasuk `254ce47` yang justru menyembuhkan `/playly` dari 12,8 detik menjadi static.

Gerbang §6 `AGENTS.local.md` mensyaratkan bukti dari keluaran `npm run build` bahwa `/playly`
tercatat `○ (Static)`. Tanpa build yang lulus, bukti itu **mustahil didapat** — dan membaca
`export const revalidate` **tidak sah** (sudah menipu 2026-09-15), begitu pula build dengan
`useSupabase=false` (semua halaman terlihat static karena nol fetch).

## Akar masalahnya BUKAN Supabase — ini temuan utamanya

Tiga sesi sebelumnya menyalahkan Supabase. **Salah.** Bukti paling bersih ada **di dalam satu build
yang gagal**, pada berkas yang sama (`app/drama/[id]/page.tsx`):

| Pembacaan | Lewat cache Next? | Hasil |
|---|---|---|
| `generateStaticParams()` → `getAllDramas()` | tidak | ✅ berhasil, 42 judul terambil |
| `getDramaCached()` | ya (`revalidate: 60`) | ❌ timeout 6 detik, build mati |

Kalau databasenya mati, pembacaan pertama juga mati. Ia tidak. Diperkuat dari luar: bentuk query
**persis** milik halaman drama (`dramas?id=eq.<slug>&select=*&limit=1`) diuji untuk **seluruh 42
judul → 42/42 sukses di bawah 1 detik** (termasuk keempat judul yang membunuh build), plus Supabase
dipantau **3 menit tanpa putus → 36/36 sukses**, dan build tepat sesudahnya **tetap gagal**.

⚠️ **Pesan errornya menyesatkan.** Kalimat "Supabase tidak menjawab setelah 2 percobaan" datang dari
pembungkus kita sendiri (`lib/supabase.ts:186`), yang menyimpulkan **setiap** timeout = database
bermasalah. Timeout hanya membuktikan **operasi kita** melewati batas waktu — bukan **siapa** yang
lambat. Kalimat itu menyesatkan empat sesi.

**Sembilan dugaan dimatikan dengan PERCOBAAN, bukan penalaran:**

| Dugaan | Cara diuji | Hasil |
|---|---|---|
| Supabase mati/tersendat | 42 judul query persis · pantau 3 menit | ❌ 42/42 · 36/36 sukses |
| 47 worker build menyerbu DB | dipaksa 4 worker, lalu **1 worker** (`CIRCLE_NODE_TOTAL`) | ❌ 1 worker pun gagal |
| Banyak proses serentak | 47 **proses node terpisah** | ❌ 46/47 sukses, 0,2 dtk |
| Serbuan katalog penuh | 5/15/30 tarikan `select=*` serentak | ❌ semua 200, terlambat 0,14 dtk |
| Query `select=*` berat | dibanding `select=id` | ❌ keduanya 0,02–0,04 dtk |
| Baris data menggembung | 3 baris tersangka diukur | ❌ 0,7–1,5 KB, selisih 2× |
| Batas 6 detik kependekan | dinaikkan 60 detik (sementara) | ❌ **lebih buruk**: worker crash keras |
| Disk/antivirus lambat | 30× tulis-baca di `.next/cache` | ❌ tengah 0,5 ms |
| Regresi upgrade Next | `package.json` + riwayat git | ❌ `16.2.9` ter-pin lama; pernah lulus exit 0 |

**Dua wajah kegagalan yang sebenarnya satu penyakit:** cache fetch **KOSONG** (`rm -rf .next`) →
`exit 1` bersih dengan timeout di `getDramaCached` dan **halaman drama berbeda tiap percobaan**
(= gangguan acak, bukan data rusak); cache **HANGAT** atau batas waktu dinaikkan → crash keras
`Next.js build worker exited with code: 4294967295`, **crash yang sama** yang 2026-09-18 dituduhkan
ke database.

❓ **Penyebab persis di dalam Next BELUM terverifikasi.** Dugaan terkuat: jalur **cache fetch Next 16
(Turbopack) saat prerender**, sebab hanya pembacaan ber-`revalidate` yang tumbang. Belum bisa
ditunjuk `berkas:baris` di dalam Next. **Perubahan ini MENGHINDARI masalahnya, bukan
menyembuhkannya** — batas yang jujur, sengaja ditulis supaya tak diklaim lebih.

## Yang dikerjakan

- **`app/drama/[id]/page.tsx`** — `generateStaticParams()` memulangkan **daftar kosong**: 42 halaman
  drama tidak lagi dibuat saat build, melainkan saat pengunjung pertama membukanya, lalu disimpan
  ISR 60 detik oleh `revalidate` yang sudah ada.
- **`export const dynamicParams = true` ditulis EKSPLISIT.** Ini pengaman, bukan hiasan: dengan
  daftar kosong, `dynamicParams = false` membuat **SETIAP** halaman drama membalas **404** — dan
  build **tidak mengeluarkan error apa pun**. Kerusakan paling mahal adalah yang senyap.
- Impor `getAllDramas` dibuang dari berkas itu (tak terpakai lagi → dead code).
- Alasannya ditulis sebagai **komentar di dalam berkasnya**, bukan cuma di catatan sesi — supaya
  orang berikutnya yang tergoda mengembalikan prerender membacanya lebih dulu.

## Yang SENGAJA tidak dikerjakan

- **`lib/supabase.ts` tidak disentuh.** Batas waktu 6 detik & 2 percobaan tetap; menaikkannya ke 60
  detik sudah diuji dan **lebih buruk**. Memperbaiki kalimat errornya yang menyesatkan = tugas
  terpisah (berkas itu dipakai seluruh aplikasi).
- **`getDramaCached` tetap ber-cache.** Ia benar untuk halaman penonton; yang dilepas cuma prerender
  saat build.
- **Halaman lain tidak disentuh.** Diperiksa: `app/drama/[id]/page.tsx` adalah **satu-satunya** route
  yang punya `generateStaticParams`.
- **Penyebab di dalam Next tidak dikejar sampai tuntas** — di luar jangkauan sesi ini.

## Harganya, jujur

Pengunjung **pertama** tiap judul menunggu **0,32 detik** (terukur dari `next start`, bukan
taksiran). Kenapa kerugiannya kecil: dengan `revalidate = 60`, halaman ini toh sudah dibangun ulang
tiap 60 detik, jadi prerender saat build sebenarnya hanya menolong pengunjung pertama sesudah
deploy. Yang didapat: **build produksi tak bisa lagi dijatuhkan oleh satu pembacaan database yang
lambat.**

## Bukti

**Gerbang §6, urutan benar, exit code dibaca dari berkas (TIDAK dipipa):**

- `rm -rf .next` → `npm run build` **exit 0** — pertama kali sejak 2026-09-16
- `/playly` **`○ (Static)` 1m 1y** ← bukti yang dicari 4 hari
- `/beranda` · `/discover` · `/` · `/shorts` **tetap `○ (Static)` 1m 1y** — nol kemunduran
- `/sitemap.xml` + `/robots.txt` **tetap `○`** — SEO utuh
- Tahap prerender **21/21 selesai** dalam 18,4 detik (dulu 63 dan selalu tumbang)
- `npx tsc --noEmit` **exit 0**
- **693 tes lulus / 52 berkas, 0 gagal** (687 + 6 penjaga baru = 693, cocok persis)
- Nol berkas env/kunci ter-stage (dua lapis: nama berkas + isi diff)

**Bukti ISR dari server produksi sungguhan (`next start`, build hari ini):**

| Uji | Hasil |
|---|---|
| Halaman drama segar, kunjungan **pertama** | 200 / **0,32 dtk** / `x-nextjs-cache=MISS` |
| Kunjungan ke-2 & ke-3 | 200 / **0,01 dtk** / `HIT` |
| Header | `cache-control: s-maxage=60` → `revalidate` berlaku |
| `/playly` | ber-cache (`s-maxage=60`), **bukan** `no-store` → `254ce47` bekerja |
| `/beranda` + `/discover` | ber-cache, tidak mundur |
| Judul tidak ada | **404**, bukan halaman error |

## Penjaga

`tests/drama-prerender-build.test.ts` (**BARU**, 6 tes). **Mutation check 4 arah, keempatnya MERAH**
lalu hijau lagi sesudah dipulihkan: (1) prerender dikembalikan, (2) `dynamicParams` dimatikan,
(3) `revalidate` dihapus, (4) komentar alasan dihapus.

Tesnya **membaca berkas sumber**, mengikuti pola `tests/playly-halaman-cached.test.ts`. Kenapa bukan
menjalankan fungsinya: yang dijaga adalah keputusan yang akibatnya baru muncul saat `next build` —
memanggil fungsinya hanya membuktikan nilai kembaliannya, sedangkan **pemanggilan pembaca database
yang hasilnya dibuang pun tetap menjatuhkan build**.

## Jebakan alat yang ditemukan sesi ini

1. **`npm run build 2>&1 | tail` melaporkan `exit code 0` padahal build GAGAL `exit 1`** — exit code
   yang terbaca milik `tail`, bukan `npm`. Sesi ini kena dan sempat melapor "build lulus" ke owner.
   Gerbang §6 bersandar penuh pada exit code → **selalu redirect ke berkas lalu baca `$?`**.
2. **Jendela sampel pendek = bukti palsu untuk gangguan yang kedip.** 20 percobaan cepat cuma
   memotret 12 detik. Syarat "sudah pulih" = **berdurasi minimal 3 menit** dan **100% sukses**,
   bukan mayoritas.
3. **Teks berbacktick lewat kutipan shell** membuat shell mengeksekusi isinya → tulis lewat berkas.

## Masih terbuka (bukan bagian rilis ini)

- **Supabase produksi masih kedip**, kode error **`PGRST002`** (PostgREST tidak kebagian sambungan
  database). Obat: **Restart project** oleh Kang Dedi (pemilik `nvblmpkwyzbpdbshyvzw`). Teks siap
  kirim: `docs/permintaan-restart-supabase.md` bagian 2. Dampak yang masih berjalan: `/api/dramas`
  **500** → `/history`, `/my-list`, `/profile`, `/admin` menampilkan **daftar film kosong**.
- ❓ Penyebab persis cache fetch Next saat prerender.
- ❓ 21 route di `app/api` masih meneruskan `.message` mesin ke browser penonton.
