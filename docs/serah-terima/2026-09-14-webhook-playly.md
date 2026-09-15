# 2026-09-14 — Endpoint webhook Playly (video baru masuk seketika)

> Branch: **`feat/playly-webhook`** (dicabang dari `origin/main` hari ini, commit `b6e8b05`).
> Sudah di-push ke cermin `ojokesusu/dramaku`. **Belum tayang.**

## 1. Apa yang berubah + kenapa

Sekarang DramaKu **menjemput** daftar video Playly tiap beberapa menit (`fetchPlaylyVideosKita()`),
jadi video baru selalu telat muncul selama satu siklus tarik. Ditambah endpoint
`POST /api/webhooks/playly` supaya Playly bisa **mendorong** "ada video baru / video ditarik"
seketika.

Alamat endpoint ini **publik** — siapa pun di internet bisa mengetuknya sambil mengaku Playly.
Karena itu nyaris seluruh kodenya soal satu hal: membuktikan pengetuknya memang Playly sebelum
sebaris pun datanya dipakai. Dua cara pembuktian diterima (keputusan owner), keduanya memakai
kunci `PLAYLY_WEBHOOK_SECRET` yang sama:

- `x-playly-secret: <kunci>` — kunci ditempel apa adanya. Paling sederhana.
- `X-Playly-Signature: <HMAC-SHA256 hex>` — lebih aman: kunci tak pernah lewat kabel, dan isi
  pesannya ikut terkunci (diubah sedikit, tanda-tangannya gugur).

Dua-duanya diterima karena **belum ada kepastian mana yang didukung Playly** — menebak satu
mekanisme berisiko salah tebak. Kekuatan efektifnya setara jalur terlemah (kunci polos); itu
disadari dan diterima owner karena yang dijaga daftar video, bukan uang.

Video yang masuk disimpan **idempoten by `videoId`**: satu video = satu baris, jadi kiriman
ulang dari Playly (yang memang normal kalau balasan kita telat) memperbarui baris yang ada,
bukan menggandakannya.

## 2. Berkas yang disentuh

**Baru:**
- `app/api/webhooks/playly/route.ts` — handler POST
- `lib/playly-webhook.ts` — verifikasi + pembacaan payload (fungsi murni, tanpa jaringan/DB)
- `tests/playly-webhook.test.ts` (44 tes) · `tests/playly-webhook-route.test.ts` (30 tes) ·
  `tests/playly-webhook-gagal.test.ts` (8 tes jalur gagal)
- `docs/lintasai/rencana/2026-09-14-webhook-playly.md`

**Diubah:**
- `lib/store.ts` — dokumen baru `playly:webhook` + `PlaylyWebhookVideo` + upsert/set-status.
  **Sengaja dipisah dari `playly:embeds`**: embeds = kaitan buatan admin, webhook = dorongan
  Playly. Kalau digabung, satu notifikasi Playly bisa menghapus kaitan yang dibuat admin.
  Termasuk perbaikan bug lama `readLocal()` (lihat catatan di bawah).
- `lib/playly.ts` — **hanya penambahan kata `export`** pada `extractEmbedUrl`, `pickString`, dan
  6 daftar nama-field, plus komentar. **Nol perubahan perilaku.**
- `.env.example` — dokumentasi `PLAYLY_WEBHOOK_SECRET`

### ⚠️ Halaman lain yang memakai `lib/playly.ts`

`/playly`, `/discover`, dan `/api/playly/video` memakai berkas ini. Perubahannya hanya kata
`export` (memperlebar akses, tidak mengubah isi fungsi), jadi ketiganya **tidak berubah
perilakunya** — dibuktikan seluruh 604 tes lulus, termasuk `tests/playly-publik.test.ts`,
`tests/playly-video-route.test.ts`, dan `tests/playly-paginasi.test.ts`.

`EMBED_KEYS` **sengaja TIDAK ditambahi** `embed_code` walau webhook memerlukannya:
`normalizePlaylyVideos()` merakit alamat dari id kalau tak ada field embed yang cocok, jadi
menambah nama di daftar itu akan mengubah hasil katalog yang sudah jalan di produksi. Modul
webhook menggabungkannya sendiri saat membaca — jalur katalog tak tersentuh.

### Bug lama yang ikut ketemu & diperbaiki di akarnya

`readLocal()` di `lib/store.ts` mengembalikan objek fallback yang **dipakai bersama** saat
berkasnya belum ada, padahal pemanggilnya rutin memutasi hasil bacaan (`file.embeds = ...`,
`data.wallets[email] = ...`). Akibatnya konstanta `EMPTY_PLAYLY`/`EMPTY_WALLET` ikut tercemar
dan isinya bocor ke pembacaan berikutnya. Diperbaiki dengan `structuredClone` — sekali di
akarnya, supaya `admins`/`comments`/`wallets`/`playly` ikut tertutup. Dampak produksi kecil
(di Vercel `useSupabase = true`, jalur file tak dipakai), nyata di dev lokal.

## 3. Butuh SQL migrasi?

**Tidak.** Penyimpanannya memakai dokumen `app_data` yang sudah ada (pola yang sama dengan
`playly:embeds` dan `playly:hidden`), jadi tidak ada tabel atau kolom baru.

**Utang teknis yang jujur:** polanya "baca → ubah → tulis satu dokumen utuh", jadi dua
notifikasi yang tiba dalam milidetik yang sama bisa saling menimpa dan salah satunya hilang.
Taruhannya rendah (video yang hilang muncul lagi di notifikasi berikutnya) dan dipilih supaya
fitur ini jalan tanpa menjalankan SQL dulu. Cara menaikkannya kalau volumenya sudah ramai:
tabel `playly_webhook_video` dengan `video_id` sebagai PRIMARY KEY, lalu upsert per-baris.

## 4. Butuh env baru di Vercel?

**Ya — satu:** `PLAYLY_WEBHOOK_SECRET`

- **Fungsinya:** kunci rahasia bersama yang membuktikan notifikasi memang dari Playly. Nilainya
  harus **sama persis** dengan yang dipegang pengelola Playly.
- **Kalau kosong:** endpoint membalas **503** dan tidak memproses apa pun. Ini disengaja —
  tanpa kunci, notifikasi palsu tak bisa dibedakan dari yang asli.
- **Cara membuat nilainya:**
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Env baru tidak aktif sampai **deploy ulang**.

(Nilai kuncinya sengaja tidak ditulis di sini — berkas ini masuk repo.)

## 5. Bukti yang sudah dijalankan

```
npx tsc --noEmit    -> exit 0
npx vitest run      -> 44 berkas, 604 tes lulus (naik dari 522; +82 tes webhook)
npx next build      -> exit 0, route terdaftar sebagai Dynamic
```

**Uji HTTP langsung** (dev server lokal port 3077, mode file):

| Yang dikirim | Balasan | Sesuai harapan |
|---|---|---|
| Tanpa header pembuktian | 401 | ✅ |
| `x-playly-secret` salah | 401 | ✅ |
| `x-playly-secret` benar | 200 `aksi:"dibuat"` | ✅ |
| Kiriman ULANG yang sama | 200 `aksi:"diperbarui"`, tetap 1 baris | ✅ |
| `X-Playly-Signature` (HMAC) benar | 200 | ✅ |
| Badan diubah setelah ditandatangani | 401 | ✅ |
| `embedUrl` dari domain asing | 400 | ✅ |
| Video ditarik (unpublish) | 200 `hidden:true` | ✅ |

`<script>` yang sengaja diselipkan di `embed_code` **terbukti tidak ikut tersimpan** — yang
masuk hanya `src`-nya. Data lokal `data/playly.json` dikembalikan ke keadaan semula sesudah
uji (504 byte, nol jejak data uji).

## 6. Cara owner mencoba sendiri

Endpoint ini tidak punya tampilan — owner memeriksanya lewat satu perintah. **Sesudah**
`PLAYLY_WEBHOOK_SECRET` dipasang di Vercel dan situs di-deploy ulang:

1. Buka terminal, jalankan (ganti `<domain>` dan `<kunci>`):
   ```bash
   curl -i -X POST https://<domain>/api/webhooks/playly \
     -H "Content-Type: application/json" \
     -H "x-playly-secret: <kunci>" \
     -d '{"id":"uji-1","title":"Uji Webhook","embedUrl":"https://playly-dashboard.vercel.app/id/1/embed"}'
   ```
2. Harus muncul `HTTP/2 200` dan `{"ok":true,...,"aksi":"dibuat"}`.
3. Jalankan perintah yang **sama persis** sekali lagi → `"aksi":"diperbarui"`. Itu buktinya
   kiriman ulang tidak menggandakan video.

Uji bahwa pintunya benar-benar terkunci: ulangi langkah 1 dengan kunci ngawur → harus
`HTTP/2 401`. Kalau yang muncul 200, **jangan diteruskan** — kuncinya tidak terpasang benar.

---

## ⚠️ Tiga batas jujur — baca sebelum memutuskan rilis

1. **Belum ada bukti Playly punya fitur kirim webhook.** Nol jejak di seluruh repo. Nama header,
   nama event, dan bentuk payload semuanya dari spesifikasi owner, bukan dokumentasi Playly.
   Endpoint-nya siap menerima, tapi **tidak akan pernah dipanggil** sampai pengelola Playly
   menyalakan pengiriman ke alamat kita dengan kunci yang sama. **Langkah owner: hubungi
   pengelola Playly** — tanyakan apakah webhook tersedia, lalu minta nama header & bentuk
   payload yang sebenarnya. Kalau berbeda, yang perlu diganti cuma `PLAYLY_SIGNATURE_HEADER` /
   `PLAYLY_SECRET_HEADER` dan `parseWebhookPayload` di `lib/playly-webhook.ts`.

2. **Belum benar-benar menggantikan polling.** Data webhook tersimpan tapi **belum tersambung**
   ke `/playly` maupun `/discover`. Menyambungkannya mengubah `getPlaylyVideosPublik()` yang
   dipakai 3 pemanggil — itu perubahan cakupan yang butuh keputusan owner. Sudah tersedia
   `getPublishedPlaylyWebhookVideos()` untuk dipakai saat itu diputuskan.

3. **Anti-replay belum tertutup.** Payload yang disepakati tidak membawa `event_id` maupun
   `sent_at`, jadi permintaan sah yang pernah terekam bisa dikirim ulang orang lain apa adanya
   dan tetap lolos (mis. menghidupkan kembali video yang sudah ditarik). Cara menutupnya: minta
   Playly menyertakan `event_id` + `sent_at`, lalu tolak event yang id-nya sudah pernah masuk
   atau usianya lewat beberapa menit.

## Yang perlu owner tulis sendiri saat merge

Branch ini **sengaja tidak menyentuh** `HANDOFF.md` maupun `docs/lintasai/INDEX.md` — keduanya
milik owner (butir 1 `AGENTS.local.md`), dan versi di sini akan bentrok karena `origin/main`
sudah 9 commit lebih maju. Dua baris berikut perlu owner tambahkan sendiri sesudah menarik:

1. **`docs/lintasai/INDEX.md`**, di bawah `## Rencana` (paling atas):

   ```
   - [2026-09-14-webhook-playly.md](./rencana/2026-09-14-webhook-playly.md) — endpoint
     `POST /api/webhooks/playly` supaya video Playly masuk seketika (dorong), bukan menunggu
     tarikan berkala. **Belum bisa menyala: nol bukti Playly punya fitur kirim webhook.**
     Tiga pelajaran mahal: (a) `readLocal()` di `lib/store.ts` mengembalikan objek fallback
     yang DIPAKAI BERSAMA padahal pemanggilnya memutasinya → isi satu operasi bocor ke operasi
     lain, senyap tanpa error; diperbaiki di akar dengan `structuredClone`; (b) `embed_code`
     itu HTML dari luar — yang disimpan hanya `src`-nya setelah lolos `isAllowedPlaylyEmbedUrl()`;
     (c) sebelum memindahkan kerja yang belum di-commit ke branch lain, jalankan
     `git log <branch>..origin/main -- <berkas>` untuk TIAP berkas. Penjaga:
     `tests/playly-webhook.test.ts` + `tests/playly-webhook-route.test.ts` +
     `tests/playly-webhook-gagal.test.ts` (82 tes)
   ```

2. **`HANDOFF.md`** — catatan rilis, plus pengingat bahwa `PLAYLY_WEBHOOK_SECRET` wajib
   dipasang di Vercel **sebelum** deploy (urutan butir 3: env dulu, kode belakangan).

Berkas `docs/lintasai/rencana/2026-09-14-webhook-playly.md` **ikut** di branch ini — berkas baru
tidak bisa bentrok, jadi aman. Yang tidak ikut hanya baris penunjuk di INDEX.

## Catatan untuk owner soal branch ini

Branch dicabang dari `origin/main` terkini, **bukan** dari branch lama. Alasannya: permintaan
awal menyebut `feat/playly-integrasi`, tapi branch itu tertinggal **129 commit**. Selain itu
folder kerja memuat perubahan paginasi yang **sudah di-commit sebagai `852c989`** — kalau ikut
terbawa, jadi commit duplikat yang bertabrakan senyap saat merge.

**Aturan yang lahir dari sini:** sebelum memindahkan kerja yang belum di-commit ke branch lain,
jalankan `git log <branch>..origin/main -- <berkas>` untuk **tiap** berkas. Hitungan 0 = aman
dipindah utuh; lebih dari 0 = berkasnya sudah bergerak, jangan ditimpa.
