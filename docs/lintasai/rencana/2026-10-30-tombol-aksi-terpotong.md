# 2026-10-30 — Dua tombol di halaman drama terpotong tanpa gejala

**Dilaporkan owner** lewat tangkapan layar: *"bisa kamu cek bagian itu karena ada yang ketutup"*.

**Status:** ✅ **DIRILIS 2026-10-30 di `55894b8`** — dual push `60fb7a7..55894b8`, tayang
~90 detik, **downtime NOL**. Dibuktikan ulang di situs produksi dengan potret layar 1280 px:
keempat tombol utuh.
**Rencana mundur 1 baris:** `git revert 55894b8` lalu dual push (nol perubahan database/env).

---

## Kerusakannya

Baris tombol di bawah poster seharusnya berisi **empat** tombol:
`Mulai Nonton` · `Tambah Favorit` · `Suka · N` · `Bagikan`.

Yang benar-benar terlihat di produksi (diukur dari potret Edge headless, 1280px):
`Mulai Nonton` · `Tambah Favorit` · lalu **sepotong kecil** tombol ketiga di tepi kanan.
Tombol **"Bagikan" hilang sepenuhnya**.

Jadi dua dari empat fungsi — menyukai drama dan membagikan tautannya — **tidak bisa
dipakai siapa pun** di layar selebar itu, dan tak ada yang tahu.

## Sebabnya: tiga hal yang masing-masing terlihat wajar

| # | Hal | Terlihat wajar? |
|---|---|---|
| 1 | Tombol dasar project membawa `shrink-0` (`components/ui/button.tsx`) — "jangan pernah menyusut" | ya, itu bawaan pustaka |
| 2 | `SaveButton`/`LikeButton`/`ShareButton` masing-masing membawa `w-full` — "ambil 100% lebar induk" | ya, supaya penuh saat bertumpuk di HP |
| 3 | Ketiganya dikurung **satu** `<div className="flex flex-1 gap-2">`, dan induk di atasnya ber-`overflow-hidden` | ya, supaya rapi |

Digabung, ketiganya jadi: **tiga tombol sama-sama menuntut 100% ruang yang sama,
menolak menyusut, lalu kelebihannya dipotong diam-diam.**

🪤 **Pelajaran yang layak diingat:** kerusakan ini **tidak bisa** ditangkap oleh
build, `tsc`, maupun 1.784 tes yang semuanya hijau. `overflow-hidden` memotong
**tanpa** error, **tanpa** scrollbar, **tanpa** pesan di console. Satu-satunya
alat yang bisa melihatnya adalah **mata di depan layar** — dan yang menemukannya
memang owner, bukan mesin.

## Cacat ikutan yang ketahuan saat memperbaiki

- **`SaveButton` MENGUMUMKAN prop `className` tapi tidak memakainya** di cabang
  yang dipakai halaman drama (hanya cabang `hero` yang memasangnya). Pemanggil
  mengatur lebar → diabaikan tanpa peringatan. Ini "fungsi yang berbohong":
  menjanjikan sesuatu yang tak dikerjakan, dan kerusakannya senyap.
- **`LikeButton` belum punya prop `className` sama sekali**, padahal tiga
  tetangganya di baris yang sama punya.

Keduanya diperbaiki — bukan sekadar supaya perbaikan ini jalan, tapi karena
prop yang berbohong akan menipu pemanggil berikutnya juga.

## Perbaikannya

Baris tombol diratakan jadi **satu flex yang boleh membungkus**, bukan dua
kelompok ber-`flex-1`:

```
flex flex-col gap-2 sm:flex-row sm:flex-wrap
  WatchCta     sm:min-w-[190px] sm:flex-1
  SaveButton   sm:min-w-[160px] sm:flex-1
  LikeButton   sm:min-w-[110px] sm:flex-1
  ShareButton  sm:min-w-[120px] sm:flex-1
```

Kenapa bentuk ini tidak bisa terpotong lagi:

- `flex-1` membuat lebar **dasar** tiap tombol 0, jadi mereka hanya **tumbuh**
  membagi ruang — tak pernah perlu menyusut, sehingga `shrink-0` tak lagi jadi
  masalah.
- `min-w-*` menjaga teks tiap tombol tetap utuh, **dan** itulah yang menentukan
  kapan barisnya harus membungkus.
- `flex-wrap` menurunkan tombol yang tak muat ke baris berikutnya —
  **membungkus, bukan dipotong**. Inilah pagar sesungguhnya.
- Di bawah `sm` tetap bertumpuk satu kolom seperti semula; `overflow-hidden`
  kartu putih **tidak** dilepas (ia masih melindungi dari luapan lain).

## Bukti — potret layar, bukan nalar

| Lebar | Hasil |
|---|---|
| 1440 px | keempat tombol satu baris, utuh |
| 1280 px | keempat tombol satu baris, utuh (**sebelumnya: 2 terlihat, 2 terpotong**) |
| 1024 px | membungkus 3 + 1; nol yang terpotong |
| 820 px | satu kolom bertumpuk |
| 500 px | satu kolom bertumpuk + tombol "Mulai Nonton" menempel di bawah layar |

Potretnya diambil dengan Edge `--headless=new --screenshot` **tanpa**
`--remote-debugging-port` — port debug itu yang dulu (2026-10-28) membuat
perintah browser mendarat di browser penyewa lain di server sewaan ini.

Gerbang §6: build **sukses** (0 pesan "pakai berkas lokal", 40 tautan drama) ·
`tsc` **exit 0** · **1.791 tes hijau** (123 berkas, +7 tes baru).

## Penjaga permanen

`tests/tombol-aksi-drama.test.ts` (7 tes). **Sebagian membaca SUMBER, bukan
merender** — dan itu disengaja: kerusakannya murni soal lebar, sedangkan satu-
satunya alat yang terpasang (`jsdom`) **tidak menghitung lebar sama sekali**,
jadi tes render apa pun akan hijau baik tombolnya terpotong maupun tidak. Yang
dikunci adalah **bentuk** yang membuat pemotongan mustahil: `sm:flex-wrap` ada,
keempat tombol punya `min-w` + `flex-1`, dan pembungkus `flex flex-1 gap-2`
lama tidak kembali.

Penjaganya **diuji merah lebih dulu**: dengan `sm:flex-wrap` dilepas, tes
"barisnya BOLEH membungkus" langsung gagal; dipulihkan, hijau lagi. Penjaga yang
tak pernah merah bukan penjaga.

Tiga tes lain merender `SaveButton`/`LikeButton`/`ShareButton` dan memastikan
`className` yang dikirim pemanggil **benar-benar sampai ke tombolnya** — pagar
atas cacat "prop yang berbohong" di atas.

## Yang TIDAK dikerjakan (ditemukan, tapi di luar permintaan)

Di layar **≤ 1024 px**, kolom "Drama Terkait" turun ke bawah hero dan menampilkan
**seluruh** daftarnya (20 judul) **sebelum** tombol aksi. Artinya di tablet & HP
penonton menggulir melewati 20 judul lain sebelum sampai ke tombol "Mulai Nonton"
halaman yang sedang dibukanya. Di HP dampaknya diredam tombol melayang di bawah
layar, di tablet tidak.

Ini **bukan** akibat perbaikan di atas — bentuk lama, dan di luar yang owner
minta. Dicatat supaya tidak hilang; menunggu keputusan owner.
