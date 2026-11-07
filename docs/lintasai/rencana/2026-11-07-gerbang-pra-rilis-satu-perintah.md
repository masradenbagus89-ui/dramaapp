# 2026-11-07 — Gerbang pra-rilis jadi SATU perintah (`npm run gerbang`)

> Permintaan owner: *"kamu jadikan gerbang pra-rilis satu perintah"*.
> Bobot: **SEDANG→BERAT** — menyentuh titik-risiko **rilis**. Bukan karena ia mengubah situs
> (nol berkas produksi disentuh), tapi karena gerbang yang salah membuat rilis rusak lolos.

---

## 1. Masalah yang dipecahkan

`AGENTS.local.md` §6 menuliskan lima pemeriksaan yang harus dijalankan **berurutan** sebelum
push ke `origin main`. Selama ini urutannya diketik ulang dengan tangan tiap kali rilis, dan
**justru urutannya yang jadi sumber kesalahan berulang**:

> `npm run build` WAJIB mendahului `npx tsc --noEmit`.

Dibalik, `tsc` **selalu** melaporkan 4 error PALSU (`TS2304: Cannot find name 'PageProps'`),
sebab `next-env.d.ts` mengimpor berkas tipe di `.next/` yang **baru dibuat oleh** `next build`.
Menghapus `.next` lalu langsung menjalankan `tsc` = memeriksa berkas yang belum ada.

Jebakan ini tercatat menipu **tiga sesi** (2026-09-11, 2026-09-14, 2026-09-15). Dua di antaranya
nyaris melaporkan kerusakan yang tidak ada. Penyebabnya bukan kecerobohan orangnya — penyebabnya
urutan yang hanya hidup sebagai **teks yang harus diingat**.

## 2. PRE-MORTEM (ditulis sebelum kodenya)

> *Anggap semuanya sudah dikerjakan dan hasilnya NOL guna bagi owner. Apa penyebab paling
> mungkin?* → **Gerbangnya melapor HIJAU padahal ada langkah yang sebenarnya gagal atau
> terlewat**, sehingga rilis rusak tetap lolos. Gerbang yang berbohong lebih berbahaya daripada
> tidak punya gerbang, karena orang berhenti memeriksa sendiri.

Jawaban itu menyetir seluruh rancangan di bawah — bukan ditempel sesudahnya.

## 3. Yang dibangun

| Berkas | Isi |
|---|---|
| `scripts/gerbang-pra-rilis.mjs` | Lima langkah §6, urut, berhenti di kegagalan pertama |
| `tests/gerbang-pra-rilis.test.ts` | 11 tes penjaga |
| `package.json` | `"gerbang": "node scripts/gerbang-pra-rilis.mjs"` |

Pola berkasnya **menyalin preseden yang sudah ada di repo ini**, bukan pola baru:
`scripts/uji-pulihkan-backup.mjs` juga memisahkan logika murni supaya bisa diuji tanpa menyentuh
dunia luar, dan menjaga blok CLI-nya dengan `process.argv[1].endsWith(...)` supaya tidak ikut
jalan saat diimpor tes. (§3.3 — satu pola di seluruh project.)

### Tiga keputusan rancangan + alasannya

**a. Urutan dikunci di data, bukan di ingatan.** Kelima langkah jadi konstanta `LANGKAH`, dan
`periksaUrutanLangkah()` dipanggil **sebelum langkah pertama jalan**. Kalau ada yang menukar
`build` dan `tipe`, skripnya menolak jalan dengan pesan yang menyebut sebabnya — bukan jalan
terus lalu menghasilkan 4 error palsu yang membingungkan.

**b. Tiap langkah diperiksa exit code-nya, berhenti di kegagalan pertama.** Langsung dari
pre-mortem. `status !== 0` **dan** `status === null` (proses dimatikan sinyal, mis. Ctrl+C)
dua-duanya dihitung GAGAL — "null" yang diam-diam dianggap sukses persis bentuk kebohongan yang
dicemaskan.

**c. Pemeriksa rahasia melihat ANTREAN PUSH, bukan cuma yang ter-stage.** §6 menulis "periksa nol
berkas env ter-stage", tapi saat gerbang dijalankan biasanya semuanya **sudah** di-commit, jadi
daftar stage kosong dan pemeriksaannya nol guna. Yang diperiksa sekarang
`git diff --name-only origin/main..HEAD` — berkas yang benar-benar akan terdorong.

> 🪤 **Kenapa ini bukan pengulangan hook `pre-commit`:** hook hanya jalan di komputer yang
> **meng-commit**. Commit yang datang dari **branch rekan** tidak pernah melewatinya. Jadi
> justru commit yang paling tidak terjaga adalah yang paling mungkin membawa berkas rahasia.

Pemeriksa ini sengaja melihat **nama** berkas, bukan isinya: isi sudah dijaga hook, dan mencetak
isi berkas rahasia ke layar justru membocorkannya lewat terminal/log.

## 4. Yang SENGAJA TIDAK dibangun

- ❌ **Tidak melakukan `git push`.** Push ke `origin main` = **TOMBOL RILIS**; izinnya milik owner
  (AGENTS.md §5.5, dan rak devops §1: *"Izin rilis bukan milik AI"*). Gerbang berhenti tepat
  sebelum itu lalu menuliskan apa yang harus dikerjakan manusia.
- ❌ **Tidak menjalankan smoke test produksi.** Baru masuk akal SESUDAH push, dan hasilnya perlu
  mata manusia. Gerbang mengingatkannya di baris penutup (rak devops §2 butir 2: *"build hijau"
  bukan berarti situsnya masih melayani orang*).
- ❌ **Tidak mendeteksi server lokal yang sedang jalan** lewat pengecekan port. Mesin ini
  **dipakai bersama ~84 penyewa** — port 3000/3100 bisa milik orang lain, jadi pengecekan port
  akan sering salah-alarm. Penjaga yang rutin salah-alarm mengajarkan orang menerobosnya, dan
  itu lebih berbahaya daripada tak ada penjaga (alasan yang sama ditulis di `.gitignore` soal
  pengecualian `.lintasai/`). Gantinya: **peringatan tertulis** di baris pertama keluaran.
- ❌ **Tidak memeriksa working tree bersih.** `next-env.d.ts` berubah sendiri tiap `next dev`
  jalan, jadi pemeriksaan itu akan merah terus tanpa sebab nyata.

## 5. Yang ikut tersenggol

| Yang memakai | Terdampak? |
|---|---|
| Situs penonton & panel admin | **Tidak.** Nol berkas produksi disentuh. |
| `npm test` / `npm run build` / `npm run dev` | **Tidak.** Perintah baru, tak mengubah yang lama. |
| Hook `pre-commit` | **Tidak.** Gerbang melengkapinya di lapis berbeda (push vs commit), tidak menggantikan dan tidak mem-bypass. |
| Pratinjau lokal yang sedang jalan | **Ya** — langkah 1 menghapus `.next`. Sudah ditulis sebagai peringatan di baris pertama keluaran. |

## 6. Bukti

- **11 tes penjaga** (`tests/gerbang-pra-rilis.test.ts`) — hijau.
- **Diuji-balik 3 titik, semuanya MERAH lebih dulu**, sesuai pre-mortem:

  | Kerusakan yang disengaja | Hasil |
  |---|---|
  | Urutan `build` ↔ `tipe` dibalik | **3 tes MERAH** |
  | `cariBerkasRahasia` dibuat selalu bilang "aman" | **3 tes MERAH** |
  | `cariBerkasRahasia` dibuat menolak semuanya (alarm palsu) | **2 tes MERAH** |

  Ketiganya hijau lagi sesudah berkas dipulihkan.

- **Dijalankan sungguhan dari ujung ke ujung** (`npm run gerbang`), bukan cuma ditulis — hasilnya
  dicatat di `HANDOFF.md` seksi 2026-11-07.

## 7. Cara owner memakainya

Sebelum push ke produksi, dari folder project, ketik satu baris:

```
npm run gerbang
```

- **Hijau** → muncul `✓ GERBANG LOLOS`, lalu daftar dua langkah yang tersisa untuk Anda: push,
  dan smoke test di situs sungguhan.
- **Merah** → gerbang berhenti di langkah yang gagal, menyebut nomor + sebabnya, dan berkata
  **JANGAN push**. Perbaiki penyebabnya lalu jalankan ulang **dari awal**, bukan melanjutkan.

⚠️ Hentikan dulu pratinjau lokal (`next dev` / `next start`) sebelum menjalankannya — langkah 1
menghapus `.next` yang sedang dipakai server itu.
