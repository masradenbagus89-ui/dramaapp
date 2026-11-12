# 2026-11-12 — Laporan tarik: branch `feat/link-unduhan-provider-kualitas` (pemutar drama)

Untuk: **Raden (owner)**. Dari: rekan.
Branch: `feat/link-unduhan-provider-kualitas` di repo cermin `ojokesusu/dramaku`, ujung `bde27ee`.

> ⚠️ **Baca bagian 0 dulu sebelum menarik.** Branch ini **TIDAK siap ditarik apa adanya**.
> Produksi sudah punya desain volume versi owner sendiri (`4fc033c`, 2026-11-12 14:38), dan
> menarik branch ini akan bentrok di 8 berkas sekaligus menimpa keputusan itu.

## 0. Status tarik (dicek 2026-11-12 terhadap `dramaapp/main`)

Commit di branch ini yang belum ada di `dramaapp/main`:

| Commit branch | Isi | Status di produksi |
|---|---|---|
| `01a48b0` | Play di tengah, panel bawah hanya timer, ketuk 2x maju/mundur 10 detik | **Sudah ada** sebagai `6b65e0a`, dengan isi yang sudah disesuaikan. Jangan ditarik lagi. |
| `ceac484` | Rail kanan ikut sembunyi + tombol Volume di rail | **Sudah ada** sebagai `315de5a`, sudah disesuaikan. Jangan ditarik lagi. |
| `bde27ee` | Volume + Layar penuh di atas timer, rail di tengah (detail di bawah) | **Belum ada**, dan **berbenturan** dengan `4fc033c` milik owner |

Hasil simulasi merge tanpa mengubah apa pun (`git merge-tree --write-tree dramaapp/main bde27ee`)
menunjukkan BENTROK di 8 berkas:
`app/components/ActionRail.tsx`, `app/components/FeedPlayer.tsx`,
`app/components/player/PlayerControls.tsx`, `app/components/player/VolumeControl.tsx`,
`tests/action-rail-tampil.test.ts`, `tests/unduhan-pemasangan.test.ts`,
`docs/serah-terima/2026-11-07-pemutar-episode-play-tengah.md`,
`docs/serah-terima/2026-11-11-rail-kanan-sembunyi-volume.md`.

Perbedaan desain yang perlu owner putuskan:

| Bagian | Produksi sekarang (`4fc033c`, owner) | Branch ini (`bde27ee`, rekan) |
|---|---|---|
| Letak tombol Volume | Sebaris dengan angka durasi | Di atas garis geser, rata kanan |
| Garis pengatur volume | Tegak ke atas | Mendatar, di kiri tombol speaker, dengan angka % |
| Tombol layar penuh di panel bawah | Tidak ada (hanya di menu gerigi) | Ada, di kanan tombol Volume |
| Tombol "Eps n / N" | Turun ke baris paling bawah | Tetap di bawah judul |
| Ukuran rail kanan | Diperkecil: 36px, jarak 8px (pilihan owner) | 44px, jarak 12px |
| Posisi rail kanan | `bottom-32` | Di tengah tinggi video; layar < 720px pakai `bottom-40` |
| Gerigi pengaturan | `top-3` | `top-6` (turun sedikit) |

**Pilihan untuk owner:**
- **A. Tidak menarik `bde27ee`.** Desain produksi tetap. Tidak ada risiko, dan yang hilang
  hanya versi desain alternatif ini.
- **B. Ambil sebagian ide (saran rekan).** Contohnya tombol layar penuh di sebelah Volume, rail di
  tengah, atau gerigi turun sedikit. Rekan mengerjakannya ulang DI ATAS `main` terbaru, mengikuti
  desain `4fc033c`, lalu menyerahkan branch baru yang bersih tanpa bentrok. Owner cukup
  menyebut ide mana yang mau dipakai.
- **C. Ganti desain produksi dengan versi branch ini.** Bentrok harus diselesaikan dengan
  tangan di 8 berkas, dan keputusan owner di `4fc033c` (rail 36px, Eps di bawah, garis tegak)
  ikut tertimpa. Tidak disarankan.

## 1. Apa yang berubah + kenapa (`bde27ee`)

Rekan meminta tampilan pemutar drama (`/feed/[id]`) lebih rapi:
- Tombol **Volume** keluar dari rail kanan. Di atas garis geser/timer, rata kanan, ada dua
  tombol berdampingan: **Volume** (kiri) dan **Layar penuh** (kanan). Ketuk Volume untuk memunculkan
  garis pengatur mendatar di kiri tombol, dalam satu baris, dengan angka persen. Bisu = geser ke 0.
- Rail kanan (poster, Suka, Komen, Simpan, Bagikan) diletakkan di tengah tinggi video dengan
  jarak antar-ikon yang seragam. Di layar pendek (< 720px) rail diukur dari bawah supaya tidak
  menabrak baris Volume.
- Gerigi pengaturan turun sedikit (`top-3` → `top-6`).

Detail lengkap: `docs/serah-terima/2026-11-12-volume-layar-penuh-panel-bawah.md`.

## 2. Berkas yang disentuh (`bde27ee`)

- `app/components/ActionRail.tsx`: prop `sound` dihapus, posisi dan jarak rail diubah
- `app/components/player/VolumeControl.tsx`: gaya ringkas, garis mendatar di kiri tombol
- `app/components/player/PlayerControls.tsx`: prop baru `sound`, `isFullscreen`, `onToggleFullscreen`
- `app/components/FeedPlayer.tsx`: 3 baris (meneruskan prop di atas, gerigi `top-6`)
- `tests/action-rail-tampil.test.ts`, `tests/unduhan-pemasangan.test.ts`
- `docs/serah-terima/2026-11-12-volume-layar-penuh-panel-bawah.md`

Ketiga komponen di atas hanya dipakai halaman `/feed/[id]`.

## 3. Butuh SQL migrasi?
Tidak.

## 4. Butuh env baru di Vercel?
Tidak.

## 5. Bukti (diukur terhadap basis branch, BUKAN terhadap `main` produksi)

- Isi commit `bde27ee` diuji di salinan terpisah (git worktree):
  - `npx vitest run` → 91 berkas / 1343 tes lulus.
  - `npx tsc --noEmit` → 0 error dari kode yang di-commit. Error yang muncul hanya `PageProps`
    (jebakan `.next` yang tercatat di AGENTS.local.md §6) dan route CAPTCHA yang tidak ikut
    commit ini.
- Dicek di localhost lewat Chrome headless, layar tiruan 390x844 dan 375x667: tidak ada
  tombol yang bertumpuk.
- `npm run build` **belum** dijalankan.
- Branch ini **belum** di-rebase ke `main`. Branch tertinggal 270 commit dari `dramaapp/main`
  (aturan §2 AGENTS.local.md belum dipenuhi). Itulah sebabnya bagian 0 bentrok.

## 6. Cara owner mencoba (hanya kalau memilih B atau C)

1. Tarik branch ke folder terpisah, lalu jalankan `npm run dev` dan buka
   `/feed/diremehkan-sebagai-gadis-desa-ternyata-dia-legenda-terkuat`. Di localhost video
   memang tidak jalan; itu wajar.
2. Aktifkan tampilan HP (F12 → Ctrl+Shift+M). Rail kanan harus di tengah tinggi layar, dan di
   atas garis geser, rata kanan, ada ikon speaker dan ikon layar penuh berdampingan.
3. Ketuk speaker: garis volume mendatar muncul di kiri tombol, sebaris, dengan angka %. Ketuk
   ikon kotak: pemutar memenuhi layar.
