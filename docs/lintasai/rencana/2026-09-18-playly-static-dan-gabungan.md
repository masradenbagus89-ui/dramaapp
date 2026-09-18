# /playly kembali static + video gabungan masuk /beranda & /discover

> 2026-09-18 · kerja owner · bobot BERAT (berujung rilis produksi)
> Permintaan owner: "no 1 dulu, lalu no 2" — disetujui setelah diberi tahu konsekuensinya
> (video webhook baru muncul paling lambat 60 detik, tidak lagi seketika).

## 1. Masalahnya (terverifikasi, bukan dugaan)

Halaman `/playly` berubah dari **static** (dimasak sekali, disimpan, disajikan ulang)
jadi **dynamic** (dimasak dadakan tiap pengunjung datang, wajib bertanya ke Supabase).

Rantai sebabnya, dilacak sampai baris:

```
app/playly/page.tsx:25        getPlaylyVideosGabungan()
lib/playly-gabungan.ts:158    getPublishedPlaylyWebhookVideos()
lib/store.ts:1043             getPlaylyWebhookVideos()
lib/store.ts:1035             sbDocGet(PLAYLY_WEBHOOK_DOC)     <-- tanpa opsi revalidate
lib/supabase.ts:212           jatuh ke cache: "no-store"
```

`lib/supabase.ts:204` sudah memperingatkan persis hal ini: **satu fetch `no-store`
membuat SELURUH halaman jadi dinamis.**

Akibat yang sudah terbukti mahal: saat Supabase tidak menjawab (insiden 522,
2026-09-16), halaman static `/beranda` `/discover` `/playly` **tetap hidup 200**
karena disajikan dari salinan tersimpan. Sejak `/playly` jadi dynamic, ia kehilangan
perlindungan itu.

## 2. Kenapa nomor 2 TIDAK BOLEH dikerjakan duluan

`getPlaylyVideosGabungan()` membawa penyakit di atas di dalamnya. Memasangnya apa
adanya ke `/beranda` + `/discover` akan menyeret **dua halaman paling ramai** ikut
jadi dynamic — mundur dari keadaan sekarang, bukan maju.

## 3. Yang dikerjakan

### 3a. `lib/store.ts` — tambah varian ber-cache

Fungsi BARU `getPublishedPlaylyWebhookVideosCached()`, meniru pasangan yang sudah
ada di berkas yang sama (`getPlaylyHiddenIds` :928 ↔ `getPlaylyHiddenIdsCached` :934).

TTL = `CATALOG_TTL_SECONDS` (60 detik), **sama dengan tetangganya** yang sama-sama
membaca dokumen `app_data` di Supabase: `getPlaylyEmbedsCached` dan
`getPlaylyHiddenIdsCached`. Itu juga yang membuat `/beranda` tercatat `Static 1m`.

🚫 **`getPlaylyWebhookVideos()` TIDAK disentuh.** Fungsi itu juga dibaca jalur TULIS
(`upsertPlaylyWebhookVideo` lib/store.ts:1068 dan :1093, keduanya membaca-lalu-menulis).
Daftar basi di sana akan **menimpa video lain** yang masuk di sela cache — kerusakan
senyap, tidak ada yang melapor.

### 3b. `lib/playly-gabungan.ts` — dua pintu, satu perakit

Isi `getPlaylyVideosGabungan()` dipindah ke perakit internal yang menerima
"cara mengambil daftar webhook", lalu dua pembungkus tipis:

- `getPlaylyVideosGabungan()` — perilaku PERSIS seperti sekarang (segar, tanpa cache)
- `getPlaylyVideosGabunganCached()` — versi 60 detik, untuk halaman penonton

### 3c. Halaman

| Berkas | Sebelum | Sesudah |
|---|---|---|
| `app/playly/page.tsx:4` | `getPlaylyVideosGabungan` | `getPlaylyVideosGabunganCached` |
| `app/beranda/page.tsx:3` | `getPlaylyVideosPublik` | `getPlaylyVideosGabunganCached` |
| `app/discover/page.tsx:4` | `getPlaylyVideosPublik` | `getPlaylyVideosGabunganCached` |

## 4. Yang SENGAJA TIDAK diubah

- **`app/api/playly/video/route.ts` (gerbang IDOR)** tetap memakai versi TANPA cache.
  Alasannya: itu pengaman yang memutuskan video boleh diputar atau tidak. Memberi ia
  daftar izin yang boleh basi = melemahkan pengaman diam-diam (§5.3). Route itu sudah
  `force-dynamic` sejak awal, jadi tidak ada yang dirugikan.
- **`getPlaylyVideosPublik()`** tetap ada dan tetap dipakai halaman admin — tidak
  dihapus, tidak diubah perilakunya.
- **Aturan penggabungan** (`gabungVideoPlayly`) nol perubahan: katalog tetap menang
  saat videoId sama, daftar sembunyi admin tetap berlaku untuk kedua sumber,
  gagal-aman tetap menahan jalur webhook kalau daftar sembunyi tak terbaca.

## 5. Yang ikut tersenggol (pemanggil lain)

| Yang memakai | Terdampak? | Penjaganya |
|---|---|---|
| `app/api/playly/video/route.ts` | Tidak — tetap pakai fungsi lama | `tests/playly-video-route.test.ts` |
| `app/admin/playly/*` | Tidak — pakai `getPlaylyVideosPublik` | tes admin yang ada |
| `POST /api/webhooks/playly` (jalur tulis) | Tidak — `getPlaylyWebhookVideos` tak disentuh | `tests/playly-webhook-route.test.ts` (82 tes) |
| `tests/playly-gabungan.test.ts` | **Ya** — `vi.mock("../lib/store")` harus menambah fungsi baru | diperbarui di rencana ini |

## 6. PRE-MORTEM

> Anggap semua ini sudah dikerjakan dan hasilnya NOL guna. Apa penyebab paling mungkin?

**Jawaban: `/playly` ternyata TETAP dynamic**, karena masih ada satu fetch `no-store`
lain di rantai yang belum terlihat — dan saya menyimpulkan "berhasil" cuma dari
membaca kode.

Itu persis kesalahan yang sudah terjadi 2026-09-15: berkas serah-terima rekan menulis
"`/playly` tetap static + revalidate 5m" berdasarkan membaca `export const revalidate`
di halamannya, padahal kenyataannya dynamic.

**Maka buktinya HANYA satu yang sah: keluaran `npm run build`.**

- `/playly` WAJIB tercatat `○ (Static)`, bukan `ƒ (Dynamic)`
- `/beranda` + `/discover` WAJIB TETAP `○ (Static)` — kalau salah satu berubah jadi
  `ƒ`, pekerjaan ini merugikan dan harus dibatalkan, bukan dilanjutkan

## 7. Penjaga permanen yang ditambahkan

`tests/playly-gabungan.test.ts` — tes baru yang membuktikan versi Cached memang
membaca lewat jalur ber-cache, dan varian biasa tetap membaca jalur segar. Tanpa ini,
seseorang bisa menghapus `Cached` di salah satu halaman dan tak ada yang merah.

## 8. Gerbang pra-rilis (AGENTS.local.md §6, urutan tidak boleh dibalik)

`rm -rf .next` → `npm run build` (exit 0 + cek tabel Static/Dynamic) → `npx tsc --noEmit`
(0 error) → `npm test` (hijau, 653+ tes) → nol berkas env/kunci ter-stage → izin owner
→ dual push `origin` + `dramaku` → verifikasi di situs sungguhan.

## 9. Nol SQL · nol env

Owner tidak perlu menyentuh Supabase maupun Vercel.

## 10. Rollback

Satu commit, bukan merge → `git revert --no-edit <hash> && git push origin main`.
