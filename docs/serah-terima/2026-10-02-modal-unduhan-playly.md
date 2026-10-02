# 2026-10-02 — Popup pilihan provider unduhan di video Playly

> Menggabungkan dua sesi kerja yang belum pernah di-commit: **2026-09-26** (fitur provider
> unduhan + panel admin) dan **2026-09-30** (bentuknya diubah jadi popup mengambang + warna
> `#e50b4b`). Gerbang pra-rilis dijalankan ulang **2026-10-02** atas seluruh gabungan itu.

## 1. Apa yang berubah + kenapa

Tombol **DOWNLOAD** di kotak putih bawah pemutar Playly sebelumnya hanya bisa mengaku "belum
tersedia" — tidak ada jalan apa pun bagi penonton untuk mengunduh video. Jalur unduh langsung
memang tidak mungkin: berkas Playly beda domain dengan alamat bertanda tangan yang kedaluwarsa
~6 jam, sehingga atribut `download` milik browser diabaikan.

Sekarang tombol itu punya **dua perilaku**. Video yang sudah diisi link providernya → tombol
membuka **popup mengambang di tengah layar** berisi tabel **PROVIDER | DOWNLOAD** (kepala tabel
`#e50b4b`, tombol bergradasi biru untuk kualitas tinggi dan oranye untuk yang ditandai owner).
Video yang belum diisi → perilaku lama dipertahankan apa adanya, bukan tombolnya dihilangkan.

Popup bisa ditutup **tiga cara**: tombol **×**, **klik area gelap**, dan **Escape**. Video
sengaja dibiarkan terus berjalan di belakangnya — menjedanya menuntut `PlaylyPlayer` diberi
prop baru dan state dipindah naik ke `PlaylyVideoGrid`, di luar lingkup yang disetujui.

Warna kepala tabel dan gradasi tombol **ikut berubah di halaman drama** (`/drama/[id]` dan ikon
Unduh di pemutar), karena keduanya kini mengambil dari satu berkas bersama. Ini disetujui owner
secara eksplisit, bukan efek samping yang kebetulan.

## 2. Berkas yang disentuh

**Baru:**
- `app/components/unduhan-kelas.ts` — satu sumber warna kepala tabel + gradasi tombol + label
- `app/components/player/ModalProviderPlayly.tsx` — popup tabel providernya
- `lib/playly-unduhan.ts` — aturan data provider + penyaring alamat
- `app/components/admin/PlaylyUnduhanManager.tsx` — panel tempat owner mengisi link
- `app/api/admin/playly/unduhan/route.ts` — jalur simpan, dijaga `isAdminRequest`
- `tests/playly-unduhan.test.ts`, `tests/playly-modal-provider.test.ts`

**Diubah:**
- `app/components/player/InfoVideoPlayly.tsx`, `app/components/PlaylyVideoGrid.tsx`
- `app/components/DownloadModal.tsx`, `app/components/admin/DownloadProviderFields.tsx`
- `app/admin/videos/playly/page.tsx`
- `lib/store.ts`, `lib/types.ts`, `lib/playly-publik.ts`, `lib/playly-gabungan.ts`
- `tests/download-modal-render.test.ts`, `tests/playly-gabungan.test.ts`

**Halaman lain yang ikut terkena:** `/drama/[id]` dan `/feed/[id]` (ikon Unduh di pemutar) —
keduanya memakai `DownloadModal`, jadi kepala tabel dan gradasi tombolnya ikut berubah warna.
Dijaga `tests/download-modal-render.test.ts` dan `tests/unduhan-pemasangan.test.ts`.
`parseDownloadProviders` di `lib/types.ts` dipakai bersama jalur drama — kelonggaran "kualitas
boleh kosong" dibuat sebagai opsi `kualitasOpsional` yang default `false`, jadi jalur drama nol
berubah, dan itu dikunci tes eksplisit.

## 3. Butuh SQL migrasi?

**Tidak.** Datanya disimpan di dokumen `app_data` berkunci `playly:unduhan`, bukan di kolom
atau tabel baru. Ini utang teknis yang disengaja: akses DDL database masih tertutup sejak
2026-09-22, jadi dokumen `app_data` adalah satu-satunya jalur tulis yang hidup lewat PostgREST.
Cara naik kelas kalau akses database pulih dicatat di kepala `lib/playly-unduhan.ts`.

Karena isinya tidak dijaga CHECK constraint apa pun, dokumen itu diperlakukan sebagai **data
tak-tepercaya** dan disaring ULANG tiap kali dibaca, bukan dipercaya karena sudah disaring saat
disimpan. Alamat berawalan `javascript:` atau `data:` yang lolos ke `href` = kode asing berjalan
di halaman penonton, dan kegagalannya tidak memunculkan error apa pun.

## 4. Butuh env baru di Vercel?

**Tidak.** Nol variable baru. Semuanya memakai yang sudah terpasang.

## 5. Bukti yang sudah dijalankan

Gerbang `AGENTS.local.md` aturan 6 dijalankan lengkap pada **2026-10-02**, urutan build → tsc →
test, atas seluruh gabungan dua sesi:

```
rm -rf .next          -> bersih
npm run build         -> exit 0  (16 halaman ter-build, /playly tercatat Static + revalidate 5m)
npx tsc --noEmit      -> exit 0  (nol error)
npm test              -> 1029 tes / 69 berkas LULUS semua (5,26 detik)
periksa berkas env    -> nol berkas env ter-stage; .env.local terlindungi .gitignore:8
```

Kelas Tailwind `bg-[#e50b4b]` terbukti benar-benar ikut dibundel — dibaca langsung dari CSS
terkompilasi dev server yang hidup: `.bg-\[\#e50b4b\] { background-color: #e50b4b; }` ada, plus
keempat kelas gradasi. Ini menutup satu-satunya risiko kegagalan senyap: kelas yang tidak ikut
dibundel tidak memunculkan error apa pun, kepala tabelnya cuma jadi transparan.

**BELUM diuji, dan tidak boleh diklaim:** unduhan sungguhan dari provider — seluruh link di
`data/playly.json` masih `https://example.com/...`, jadi yang terbukti baru strukturnya, bukan
berkas yang benar-benar terunduh. Juga tampilan di browser sungguhan, termasuk apakah popupnya
tergambar DI DEPAN pemutar (risiko stacking context; sudah ditutup di kode dan dikunci tes, tapi
mata owner yang memastikan).

## 6. Cara owner mencoba sendiri

1. Buka **`/film`** — halaman ini bernama `/playly` saat branch ini dikerjakan; sejak
   commit `47b307a` (2026-09-26) alamatnya pindah ke `/film`. Alamat lama tetap bisa
   diketik: `next.config.ts:52` mengalihkannya otomatis.
2. Klik kartu video **`[CONTOH LOKAL] Video kedua - buat lihat provider berbeda`**
3. Klik tombol merah muda **DOWNLOAD** di kotak putih bawah pemutar
4. Popup putih harus muncul **mengambang di tengah layar** dengan latar gelap, berisi tabel
   kepala merah **PROVIDER | DOWNLOAD** dan tiga baris: Google Share (tombol oranye
   `DOWNLOAD 1080p`), Telegram (biru `DOWNLOAD 720p`), Mega (biru `DOWNLOAD`)
5. Coba tutup dengan **×**, lalu buka lagi dan tutup dengan **klik area gelap**, lalu sekali
   lagi dengan **Escape** — ketiganya harus bekerja

**Dua hal yang terlihat rusak padahal normal:** videonya tidak akan diputar di localhost
(domain tidak terdaftar di Playly), dan tombol providernya menuju `https://example.com/...`
sehingga tidak mengunduh apa pun — keduanya data contoh, bukan bug.

**Supaya penonton sungguhan bisa mengunduh, owner masih harus mengisi linknya:**
`/admin/videos/playly` → panel "Provider download per video" → "Atur provider" pada video yang
dimaksud → isi Nama provider + Kualitas (boleh dikosongkan) + Alamat → Simpan. Alamat wajib
`http://`/`https://`; baris yang ditolak dilaporkan apa adanya di layar, tidak hilang diam-diam.
Perubahannya terlihat penonton paling lama **5 menit** kemudian (`/film` ber-revalidate 300).

## Catatan jalur rilis

Dikerjakan dari komputer yang kredensial GitHub-nya **rekan** (`yusufscorpio`), jadi push ke
`dramaapp` (produksi) ditolak 403 — sudah terbukti berulang. Branch ini didorong ke `origin`
(`ojokesusu/dramaku`, **cermin**). Owner menarik dari cermin lalu men-deploy sendiri.

⚠️ `AGENTS.local.md` butir 5 menulis "`origin` = repo produksi" dan menyuruh push ke remote
bernama `dramaku`. Di komputer ini **keduanya salah**: `origin` adalah cermin, dan remote
`dramaku` tidak ada. Selalu cek `git remote -v` dulu, jangan percaya kalimat itu.
