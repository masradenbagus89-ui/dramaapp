# Serah-terima rekan → owner

> Tiap tugas yang selesai, rekan membuat **berkas BARU** di folder ini:
> `docs/serah-terima/YYYY-MM-DD-<topik>.md` — contoh: `2026-09-12-kartu-playly.md`.
>
> **Kenapa berkas baru tiap kali, bukan satu berkas tetap?** Git hanya bentrok kalau dua orang
> mengubah berkas yang **sama**. Berkas yang selalu baru membuat bentrok **mustahil**, bukan
> sekadar jarang. Ini menggantikan kebiasaan lama menulis ke `HANDOFF.md` dan
> `antrean-deploy.md` — dua berkas itu sudah terbukti bentrok berulang, dan sekarang
> **milik owner saja**.

---

## Isi wajib — 6 bagian, jangan ada yang dilewati

Owner memakai berkas ini untuk memutuskan boleh-tidaknya dirilis. Bagian yang kosong berarti
owner harus menebak, dan menebak di jalur rilis = risiko ke penonton.

### 1. Apa yang berubah + kenapa
Satu-dua paragraf. Sebut masalah yang diselesaikan, bukan cuma daftar kode.

### 2. Berkas yang disentuh
Daftar path-nya. Kalau menyentuh fungsi yang dipakai halaman lain, **sebutkan halaman mana**.

### 3. Butuh SQL migrasi?
- **Tidak** → tulis "tidak".
- **Ya** → tulis nama berkasnya di `supabase_migrations/` (buat berkasnya, jangan cuma
  menjelaskan). Owner yang menjalankannya di Supabase **sebelum** deploy.

⚠️ Urutan ini tidak boleh dibalik. Kode yang mencari kolom yang belum ada = situs error.

### 4. Butuh env baru di Vercel?
- **Tidak** → tulis "tidak".
- **Ya** → sebut **nama variable + fungsinya + apa yang terjadi kalau kosong**. Jangan pernah
  menulis **nilai** kunci apa pun ke berkas ini — berkas ini masuk repo.

### 5. Bukti yang sudah dijalankan
Angka, bukan kalimat. Contoh: `npx tsc --noEmit` 0 error · `npm test` 465 lulus ·
`npm run build` sukses. "Harusnya jalan" / "kayaknya sudah" **bukan** bukti.

### 6. Cara owner mencoba sendiri
3 langkah klik: **buka apa → klik apa → harus muncul apa**. Owner memeriksa dari layar, bukan
dari kode — tanpa bagian ini dia tidak bisa memastikan hasilnya benar.

---

## Contoh singkat

```markdown
# 2026-09-12 — Kartu Playly menampilkan tahun & genre

## 1. Apa yang berubah + kenapa
Kartu video Playly cuma menampilkan judul, jadi penonton tak bisa membedakan film lama
dan baru. Ditambah baris "2026 · Action" di bawah judul, diambil dari drama yang dikaitkan
admin. Kalau belum dikaitkan, barisnya tidak digambar sama sekali (bukan tulisan kosong).

## 2. Berkas yang disentuh
- lib/playly-publik.ts  (menambah field year & genre)
- app/components/PlaylyVideoGrid.tsx  (menggambar barisnya)
- tests/playly-publik.test.ts  (4 tes baru)
Dipakai juga oleh halaman /discover — sudah dicek ikut berubah dan tidak rusak.

## 3. Butuh SQL migrasi?
Tidak.

## 4. Butuh env baru di Vercel?
Tidak.

## 5. Bukti
npx tsc --noEmit -> 0 error
npm test -> 469 lulus (naik dari 465, +4 tes baru)
npm run build -> sukses

## 6. Cara owner mencoba
1. Buka /playly
2. Lihat kartu video paling atas
3. Di bawah judul harus muncul baris abu-abu "2026 · Action".
   Video yang belum dikaitkan ke drama tidak punya baris itu — itu benar, bukan bug.
```

---

## Sesudah berkas ini ditulis

```bash
git push dramaku <nama-branch>
```

Lalu kabari owner. **Jangan** push ke `main` di remote mana pun — lihat
`docs/panduan-lokal-rekan.md` bagian 6.
