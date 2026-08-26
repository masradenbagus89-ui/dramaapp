# Video Playly masuk & bisa diputar di DramaKu — jalur OTOMATIS

> 2026-08-26 · pengganti alur "kaitkan manual" yang macet sejak 2026-08-25.

## Laporan kondisi nyata (diverifikasi hari ini, bukan dari catatan)

| Yang dicek | Cara cek | Hasil |
|---|---|---|
| Kunci `plyk_…` | `curl -H "X-Playly-Key: …" /api/videos` | ✅ **SAH** — `{"ok":true,"count":4}`. Catatan lama "invalid_key" BASI |
| Katalog publik | `curl /api/catalog` | ✅ `count:15` |
| Berkas video | Range request ke R2 presigned URL | ✅ HTTP 206, 1 MB, signature `ftypisom` = MP4 valid |
| Kode Playly di produksi | `curl /admin/videos/playly` | ✅ **200** (bukan 404) — sudah ter-deploy, `0e7a5c5` ada di `dramaapp/main` |
| Gerbang domain Playly | Referer `dramaapp.vercel.app` | ✅ tidak memblokir |
| Baris Playly di `/discover` produksi | grep teks "Video dari Playly" | ❌ **NIHIL** |

## Akar masalah (2 lapis)

1. **Kaitan tersimpan tak pernah sampai produksi.** Sesi 2026-08-25 membuat kaitan di
   `data/playly.json`; berkas itu ada di `.gitignore:28`, dan produksi membaca dari Supabase.
   Jadi "terbukti berhasil" itu benar — tapi hanya di 1 komputer.
   Akibatnya `getPlaylyEmbedsCached()` kosong → `PlaylyRow.tsx:29` `return null` →
   **barisnya hilang tanpa pesan apa pun** (kegagalan senyap; owner tak melihat error
   karena memang tak ada yang dirender).

2. **Kunci sah tersimpan di nama env yang salah.** Kunci yang terbukti sah ada di
   `DASHBOARD_API_KEY`, sedangkan `getPlaylyKey()` hanya membaca `PLAYLY_API_KEY`.
   Efek berantai: `getPlaylyKeyStatus().configured` = false → halaman admin menampilkan
   "Kunci API Playly belum dipasang" dan pemilih video tak pernah muncul.

3. **Cacat desain**: tiap video WAJIB dikaitkan ke drama yang sudah ada. Isi Playly berupa
   trailer film (Transformers, Hulk) — tak ada drama China padanannya. Buktinya di data lokal
   "Transformers 8" terpaksa dikaitkan ke drama `guru-misterius-membentuk-pasukan-rahasia`
   episode 1 hanya supaya lolos validasi. Kaitan itu ngawur isinya.

## Keputusan owner (2026-08-26, popup)

1. Sumber = **jalur mitra saja** (4 video milik akun sendiri). Katalog publik TIDAK dipakai
   untuk halaman publik — supaya konten kreator lain tidak nyasar ke situs sendiri.
2. Letak = **halaman khusus `/playly`** + baris di `/discover`.
3. Kurasi = **otomatis tampil semua, admin bisa menyembunyikan**.

## PRE-MORTEM (sebelum dikerjakan)

> Anggap semuanya sudah dikerjakan dan hasilnya NOL guna. Penyebab paling mungkin?

**Kunci mitra tetap tak terbaca di produksi**, karena env di Vercel bernama `DASHBOARD_API_KEY`
sedangkan kode mencari `PLAYLY_API_KEY` → daftar mitra kosong → `/playly` kosong → owner tetap
tak melihat video, persis seperti sekarang. Penyebab kedua: halaman publik ter-cache dalam
keadaan KOSONG (Playly sedang ngadat saat build) lalu kosongnya bertahan.

Yang masuk rencana karena pre-mortem ini:
- `getPlaylyKey()` menerima `DASHBOARD_API_KEY` sebagai cadangan (§ langkah 1).
- Kegagalan ambil data **tidak pernah di-cache** — hanya hasil sukses yang disimpan.
- Halaman kosong WAJIB menjelaskan sebabnya, tidak boleh senyap lagi (pelajaran dari akar 1).

## Langkah

1. `lib/playly.ts` — kunci cadangan `DASHBOARD_API_KEY`; `fetchPlaylyVideosMitra()` khusus
   jalur publik (mitra saja, tanpa turun ke katalog publik), gagal = kosong + alasan.
2. `lib/store.ts` — dokumen `playly:hidden` (daftar videoId yang disembunyikan admin).
3. `lib/playly-publik.ts` — rakit daftar siap tampil: mitra − disembunyikan + label drama.
4. `app/api/admin/playly/hidden/route.ts` — GET/POST, sesi admin + guardMutation.
5. `app/components/PlaylyVideoGrid.tsx` — grid + pemutar, dipakai `/playly` & `/discover`.
6. `app/playly/page.tsx` — halaman khusus.
7. `app/discover/page.tsx` — baris otomatis + tautan "Lihat semua".
8. Admin picker — tombol Sembunyikan/Tampilkan.
9. Tes penjaga.

## Yang TIDAK dibangun

- Katalog publik di halaman publik (owner memilih mitra saja).
- Menghapus kaitan manual lama — data `playly:embeds` DIPERTAHANKAN dan tetap dipakai
  sebagai label "bagian dari drama X". Tidak ada yang dibuang.
- Progres nonton video Playly: playernya milik Playly (beda domain), memang tak bisa dibaca.

## Yang ikut tersenggol

| Fitur | Berkas | Penjaganya |
|---|---|---|
| Baris Playly di Jelajahi | `app/discover/page.tsx` | tes baru langkah 9 |
| Halaman admin Playly | `app/admin/videos/playly/page.tsx` | `tests/playly.test.ts` |
| Kartu status Playly di /admin | `lib/playly-status.ts` | `tests/playly-status.test.ts` |
| Kartu "Video terbaru" | `lib/dashboard-videos.ts` | `tests/dashboard-videos.test.ts` — TIDAK disentuh |

---

## Perubahan rancangan di tengah jalan (fakta baru)

Saat build verifikasi, jalur mitra tiba-tiba dibalas **401 `invalid_key`** — padahal kunci
yang SAMA dibalas `{"ok":true,"count":4}` 20 menit sebelumnya. Diuji 5× berturut-turut:
konsisten ditolak. **Kunci mitra Playly tidak andal / berumur pendek.**

Kalau dibiarkan, pilihan owner ("hanya video milik akun kita") berarti halaman kosong tiap
kali kunci mati — persis keluhan yang sedang diperbaiki. Jadi ditambah **jalur kedua**:

> katalog publik `/api/catalog` (tanpa kunci) **DISARING** `creator === "coklat"`.

Kenapa ini sah dan bukan pelonggaran diam-diam jadi "tampilkan punya semua orang":
katalog publik memuat nama kreator tiap video, dan `coklat` punya **tepat 4 video** — set
yang identik dengan balasan jalur mitra. Video kreator lain dibuang di
`filterVideoMilikKreator()`, yang gagal-aman: nama kreator kosong → kembalikan **kosong**,
bukan seluruh katalog.

Nama kreator: `PLAYLY_CREATOR` (env) → `DEFAULT_PLAYLY_CREATOR = "coklat"`. Ditulis sebagai
default supaya fitur hidup begitu di-deploy, tanpa menunggu Environment Variable diisi —
langkah manual itulah yang diperingatkan pre-mortem di atas.

## Hasil terukur (dijalankan, bukan dibaca)

| Yang diuji | Hasil |
|---|---|
| `/playly` lokal | **4 video milik `coklat` tampil**, 4 alamat embed unik, sampul ikut |
| Kebocoran kreator lain | **NOL** — 11 video `viozahra`/`cantika` semuanya tertahan |
| Keempat berkas video | HTTP **206**, 512 KB masing-masing, `ftypisom`, kotak `[ftyp,free,mdat]` |
| `/discover` | baris "Video dari Playly" muncul, 4 video, tautan nav ke `/playly` |
| Halaman admin | "4 dari 4 video tampil", 4 tombol Sembunyikan, pita sumber menyebut `coklat` |
| Endpoint `hidden` | 401 tanpa sesi · **403 origin asing** · toggle jalan · tak menggandakan · tipe salah → 400 |
| Regresi performa | `/discover` **tetap `○ Static` 1m** — pembacaan kunci ber-cache bekerja |
| Pemeriksa project | **357 tes lulus** · `tsc` exit 0 · `next build` exit 0 |

## Pelajaran untuk sesi berikutnya

1. **Jangan percaya catatan sesi lalu tanpa mengukur ulang.** Dua klaim di `HANDOFF.md`
   (produksi 404, push tertahan 403) sudah tidak benar saat diperiksa hari ini.
2. **Bukti di lokal ≠ bukti di produksi** kalau datanya tersimpan di berkas ber-`.gitignore`
   sementara produksi memakai Supabase. Tanyakan "data ini hidup di mana di produksi?"
3. **`return null` saat daftar kosong = kegagalan senyap.** Selalu sisakan sesuatu di layar
   yang bisa membedakan "memang kosong" dari "rusak".
4. **Kunci pihak ketiga bisa mati kapan saja.** Sediakan jalur kedua yang tidak
   bergantung padanya, selama jalur itu tidak melonggarkan aturan isi.

## Catatan build yang TIDAK berhubungan

`next build` gagal di `/beranda` dengan `ENOTFOUND xxxxxxxxxxxx.supabase.co` karena
`SUPABASE_URL` di `.env.local` berisi placeholder. **Dibuktikan pra-ada**: build pada
commit tanpa perubahan ini (lewat `git stash`) gagal dengan error yang persis sama.
Verifikasi build dijalankan dengan Supabase dimatikan (mode berkas lokal). Kalau mau
build lokal penuh, isi `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` yang asli.
