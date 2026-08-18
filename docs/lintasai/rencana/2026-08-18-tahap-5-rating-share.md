# Rencana — Tahap 5: Rating & Share (lanjutan social)

**Tanggal:** 2026-08-18 · **Bobot:** SEDANG-BERAT (fitur baru + menerima input publik)
**Keputusan owner:** rating penonton dipasang, TAPI tidak dikirim ke Google.

## Temuan yang menyetir rencana ini

`lib/session.ts:95-98` menyatakan sendiri: **identitas viewer belum aman** — email
di-assert dari klien (`app/components/Comments.tsx:90`), server tidak memverifikasi.
Akibatnya rating penonton **bisa dipalsukan** dengan mengganti email di request.

Konsekuensi yang diambil:
- Rating penonton tetap dibangun (1 email = 1 suara) → cegah suara ganda TIDAK SENGAJA.
- Rating penonton **TIDAK** masuk structured data Google — data rating palsu di schema.org
  berisiko penalti (skill `seo` §2b: schema wajib cocok dengan isi nyata).
- Untuk bintang di hasil Google dipakai `imdbRating`/`imdbVotes` dari OMDb (`lib/types.ts:38`)
  yang nyata dan tak bergantung identitas penonton.

## Kontrak

- **Input:** dramaId + email penonton (klaim klien) + bintang 1-5.
- **Output:** rata-rata + jumlah suara + suara milik penonton itu.
- **Error:** bintang di luar 1-5 → 400. dramaId/email kosong → 400.
- **Batas jujur:** bukan angka tahan-pemalsuan. Ditulis sebagai komentar di kode.

## Pola yang diikuti (JANGAN bikin cara baru)

Mengikuti `lib/store.ts` yang sudah ada:
- Dokumen JSON → tabel `app_data` (key → value jsonb), seperti `comments:<id>`.
- Key rating: `rating:<dramaId>` → `{ "<email>": <bintang> }`.
- Mode lokal (tanpa Supabase) → file `data/ratings.json`.
- **Tidak ada tabel baru / migration** → tidak menyentuh skema DB.

## Langkah

1. `lib/store.ts` — `getRatings(dramaId)`, `setRating(dramaId, email, stars)`.
2. `app/api/ratings/route.ts` — GET (rata-rata, jumlah, suara saya) + POST (validasi 1-5).
3. `app/components/RatingStars.tsx` — UI bintang, dipasang di halaman detail drama.
4. `app/components/ShareButton.tsx` — Web Share API + fallback salin link & WhatsApp.
5. Balasan komentar 1 tingkat — `parentId` opsional di type `Comment` (komentar lama
   tanpa field ini tetap valid = tampil sebagai komentar utama).
6. JSON-LD `TVSeries` di halaman drama memakai `imdbRating` ASLI.
7. Bukti: `npm test` + `npm run build` + cek dari server yang benar-benar dijalankan.

## Yang TIDAK dibangun (sengaja)

- Sesi penonton yang aman / login berpassword — pekerjaan tersendiri, titik-risiko.
- Rating penonton di structured data — sampai identitas penonton aman.
- Moderasi komentar otomatis / anti-spam — belum diminta.
- Balasan bertingkat lebih dari 1 level.

## Yang ikut tersenggol

| Fitur yang dikenal owner | Kenapa | Penjaganya |
|---|---|---|
| Komentar drama | Type `Comment` dapat field `parentId` opsional | Komentar lama tanpa field = tetap valid; ada tes |
| Halaman detail drama | Tambah bintang + tombol share + JSON-LD | `npm run build` + tes |

## Pre-mortem

*Semua dikerjakan tapi nol guna — kenapa?*
→ Paling mungkin: rating dipasang tapi tidak ada yang memberi nilai karena tombolnya
tidak kelihatan / harus login dulu tanpa penjelasan. Maka UI wajib menampilkan ajakan
yang jelas saat penonton belum punya identitas, bukan diam saja.
