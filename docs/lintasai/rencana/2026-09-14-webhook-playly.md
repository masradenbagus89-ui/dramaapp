# Rencana: endpoint webhook Playly (video masuk otomatis, tanpa tempel iframe)

> Dikerjakan 2026-09-14 · bobot **BERAT** (fitur BARU + titik-risiko: endpoint publik,
> verifikasi tanda-tangan, skema penyimpanan baru)
> Permintaan owner: `POST /api/webhooks/playly` yang menerima notifikasi video baru /
> video ditarik dari Playly, dengan verifikasi HMAC-SHA256, penyimpanan idempoten, dan tes.

## ⚠️ Koreksi premis (penting untuk sesi berikutnya)

Permintaan berangkat dari anggapan "alur Playly → DramaKu masih manual: buka
`/mitra/contoh`, salin kode iframe, tempel di DramaKu". **Tiga bagian anggapan itu tidak
cocok dengan kode hari ini:**

1. **Halaman `/mitra/contoh` tidak ada di project ini.** `find app -path "*mitra*"` nol hasil.
2. **Video Playly sudah masuk OTOMATIS sejak 2026-08-26.** `lib/playly-publik.ts:12`
   menyatakan "Semua video mitra tampil OTOMATIS; yang disembunyikan admin dibuang" —
   jalurnya `fetchPlaylyVideosKita()` (kita menarik dari API Playly), dipakai `/playly`,
   `/discover`, `/api/playly/video`. Lihat rencana `2026-08-26-playly-video-otomatis.md`.
3. **`playly:embeds` (hasil tempel manual) bukan lagi gerbang tampil** — sekarang cuma
   LABEL tambahan "bagian dari drama X" (`lib/playly-publik.ts:18`).

Jadi webhook ini **bukan** pengganti proses manual (proses itu sudah tidak ada), melainkan
peningkatan lain: mengubah **tarik berkala** jadi **dorong seketika** — hilang jeda cache
`CATALOG_TTL_SECONDS`, dan tetap jalan walau kunci mitra dicabut (kunci pernah dicabut
sepihak, lihat `lib/playly.ts:66`).

## ❓ Asumsi yang BELUM terverifikasi — penentu apakah fitur ini pernah menyala

**Tidak ada satu pun jejak bahwa Playly PUNYA fitur kirim webhook.** Pencarian
`PLAYLY_WEBHOOK|X-Playly-Signature|webhook.playly` di seluruh repo (kode, docs,
`.env.example`) = nol hasil. Nama header `X-Playly-Signature`, nama event
(`video.published` / `video.unpublished`), dan bentuk payload semuanya berasal dari
spesifikasi owner, bukan dokumentasi Playly.

`.env.example:119` menegaskan posisi kita: *"Kunci mitra diterbitkan pengelola Playly,
bukan dibuat sendiri"* — Playly pihak ketiga, kita tidak mengendalikannya.

**Akibatnya: endpoint ini siap menerima, tapi tidak akan pernah dipanggil sampai pengelola
Playly menyalakan pengiriman webhook ke alamat kita dan memakai secret yang sama.**
Kalau nama header / bentuk payload mereka berbeda, yang perlu diganti cuma
`PLAYLY_SIGNATURE_HEADER` dan `parseWebhookPayload` di `lib/playly-webhook.ts`.

## Yang dibangun

| Berkas | Isi |
|---|---|
| `lib/playly-webhook.ts` (baru) | Verifikasi tanda-tangan + pembacaan payload. Fungsi MURNI, tanpa jaringan/DB. |
| `app/api/webhooks/playly/route.ts` (baru) | POST handler tipis: raw body → verifikasi → simpan → 200. |
| `lib/store.ts` | Dokumen baru `playly:webhook` + `PlaylyWebhookVideo` + upsert/set-status. |
| `tests/playly-webhook.test.ts` (baru) | 22 tes fungsi satuan. |
| `tests/playly-webhook-route.test.ts` (baru) | 17 tes rangkaian utuh (store asli, Supabase dimatikan). |
| `.env.example` | Dokumentasi `PLAYLY_WEBHOOK_SECRET`. |

**Dokumen `playly:webhook` SENGAJA dipisah dari `playly:embeds`.** Sumbernya beda: embeds
= kaitan buatan admin, webhook = dorongan Playly. Kalau digabung, satu notifikasi Playly
bisa menghapus kaitan yang dibuat admin.

## Pelajaran mahal 1 — bug lama terungkap: `readLocal` mengembalikan fallback yang DIPAKAI BERSAMA

Tes route mula-mula gagal 9 dari 17: data dari tes sebelumnya muncul di tes berikutnya,
padahal tiap tes memakai folder sementara sendiri. **Penyebabnya bukan tesnya** —
`lib/store.ts` `readLocal()` mengembalikan objek fallback **apa adanya** saat file belum ada:

```ts
if (!existsSync(p)) return fallback;   // <- EMPTY_PLAYLY yang ITU JUGA
```

Sementara pemanggilnya rutin memutasi hasil bacaan lalu menuliskannya kembali —
`file.key = rec` (`:841`), `file.embeds = embeds` (`:885`), `file.hidden = baru` (`:953`),
dan `data.wallets[email] = ...` untuk `EMPTY_WALLET`. Jadi konstanta `EMPTY_PLAYLY` /
`EMPTY_WALLET` **ikut termutasi**, dan isinya bocor ke pembacaan berikutnya yang filenya
juga belum ada.

Diperbaiki **di akarnya** (`readLocal` menyalin fallback dengan `structuredClone`), bukan
ditambal per-pemanggil — supaya `admins`/`comments`/`wallets`/`playly` ikut tertutup
sekaligus. Dampak produksi kecil karena di Vercel `useSupabase = true` (jalur file tak
dipakai), tapi di dev lokal nyata.

**Pelajarannya:** fungsi pembaca yang menerima nilai default WAJIB menyalinnya kalau
pemanggilnya boleh mengubah hasil bacaan. Kerusakannya senyap — tidak ada error, cuma isi
yang salah di tempat yang tak berhubungan.

## Pelajaran mahal 2 — `embed_code` itu HTML dari luar, jangan disimpan mentah

Payload membawa `embed_code` berisi `<iframe ...>`. Menyimpannya mentah lalu menempelkannya
ke halaman = mengizinkan pengirimnya menaruh `<script>` apa pun di situs kita (XSS).
Yang disimpan **hanya `src`-nya**, setelah lolos `isAllowedPlaylyEmbedUrl()` (https +
daftar domain Playly) — memakai ulang pagar yang sudah dipakai jalur admin
(`app/api/admin/playly/embeds/route.ts:122`), bukan bikin pagar kedua.

Penjaganya: tes "HTML lain yang ikut dikirim TIDAK ikut tersimpan" di
`tests/playly-webhook.test.ts` — merah kalau suatu saat kode diubah jadi menyimpan mentah.

## Batas jujur — anti-replay BELUM tertutup

`skills/pembayaran/SKILL.md` §2 butir 4c meminta dedup lewat `event_id` unik + tolak event
kadaluarsa. **Tidak bisa dipenuhi**: payload yang disepakati tidak membawa `event_id`
maupun timestamp. Yang sudah tertutup: pemalsuan isi (tanda-tangan) dan penggandaan data
(idempoten by `videoId`). Yang BELUM: permintaan sah yang pernah terekam bisa dikirim ulang
orang lain apa adanya dan tetap lolos — mis. menghidupkan kembali video yang sudah ditarik.

**Cara menutupnya:** minta Playly menyertakan `event_id` + `sent_at`, lalu tolak event yang
id-nya sudah pernah masuk atau usianya lewat beberapa menit. Dicatat juga di header
`lib/playly-webhook.ts`.

## Yang TIDAK dibangun (sengaja)

- **Penyambungan ke halaman penonton.** Data webhook tersimpan tapi belum tampil di
  `/playly` maupun `/discover`. Menyambungkannya berarti mengubah `getPlaylyVideosPublik()`
  yang dipakai 3 pemanggil (`app/playly/page.tsx`, `app/discover/page.tsx`,
  `app/api/playly/video/route.ts`) — itu perubahan cakupan, butuh keputusan owner
  (§4.4). Tersedia `getPublishedPlaylyWebhookVideos()` untuk dipakai saat itu diputuskan.
- **Rate limit.** Gerbangnya tanda-tangan; permintaan tanpa tanda-tangan sah berhenti
  sebelum menyentuh penyimpanan dan hanya memakan satu hitungan HMAC.
- **Fungsi hapus baris.** Unpublish memakai `status`, bukan hapus — tanpa pemanggil,
  fungsi hapus cuma jadi dead code.

## Bukti

- `npx vitest run` → **41 berkas, 527 tes lulus** (39 di antaranya tes webhook baru).
- `npx tsc --noEmit` → exit 0.
- `npx next build` → sukses, `/api/webhooks/playly` terdaftar `ƒ (Dynamic)`.
- `data/playly.json` tidak tersentuh tes (504 byte, nol kata "webhook").

---

# Putaran 2 — 2026-09-14 (sesi lanjutan): dua jalur pembuktian + field baru

Owner meminta ulang fitur yang sama dengan spesifikasi berbeda di 4 titik, tanpa tahu
putaran 1 sudah ada di folder kerja (belum di-commit). Bedanya disajikan lewat popup dan
owner memutuskan:

| Keputusan | Pilihan owner | Akibatnya |
|---|---|---|
| Cara Playly membuktikan diri | **Terima dua-duanya** | `x-playly-secret` (kunci polos) DAN `X-Playly-Signature` (HMAC) sama-sama lolos, satu secret yang sama |
| Alamat endpoint | **Tetap `/api/webhooks/playly`** | Permintaan awal `/api/playly/video-baru` dibatalkan owner; tak ada perpindahan berkas |
| Branch | **Baru dari `origin/main`** | `feat/playly-webhook`; permintaan awal `feat/playly-integrasi` dibatalkan (lihat di bawah) |

## 🔴 Pelajaran mahal 3 — branch lama & perubahan yang diam-diam sudah di-commit orang lain

Permintaan awal: kerjakan di `feat/playly-integrasi`. Dicek dulu sebelum pindah
(`git fetch origin` + `git rev-list --left-right --count`), hasilnya branch itu
**tertinggal 129 commit** dari `origin/main` — persis pola yang bulan ini nyaris
menghilangkan dua pekerjaan Raden (lihat catatan 2026-09-11 di `HANDOFF.md`).

Temuan kedua lebih halus. Folder kerja memuat perubahan paginasi di `lib/playly.ts` +
`tests/playly-paginasi.test.ts` yang **sudah di-commit ke `origin/main` sebagai `852c989`**
beberapa jam sebelumnya. Kalau ikut dibawa, hasilnya commit duplikat yang bertabrakan
senyap di merge — kegagalan yang sama dengan `VIDEO_FILE_KEYS` dobel.

Yang dilakukan: `git stash -u` (bisa dikembalikan), cabang baru dari `origin/main`, lalu
**hanya berkas webhook** yang dipulihkan. Yang SENGAJA ditinggal:

- `lib/playly.ts` paginasi → sudah ada di `origin/main`
- `tests/playly-paginasi.test.ts` → sudah ada di `origin/main`
- `HANDOFF.md` → **9 commit lebih baru** di `origin/main`; memulihkan versi lokal = menghapus 9 catatan rekan
- `docs/lintasai/INDEX.md` → 1 commit lebih baru

**Aturan yang lahir dari sini:** sebelum memindahkan pekerjaan yang belum di-commit ke
branch lain, jalankan `git log <branch>..origin/main -- <berkas>` untuk TIAP berkas.
Hitungan 0 = aman dipindah utuh; lebih dari 0 = berkasnya sudah bergerak, jangan ditimpa.

## Yang berubah di putaran 2

| Berkas | Perubahan |
|---|---|
| `lib/playly.ts` | `extractEmbedUrl` + 6 daftar nama-field + `pickString` diberi `export`. **Penambahan kata `export` saja** — nol perubahan perilaku bagi `/playly`, `/discover`, `/api/playly/video` |
| `lib/playly-webhook.ts` | `verifySharedSecret` + `verifyWebhookRequest` (gerbang tunggal 2 jalur); payload menerima bentuk **PIPIH**; field `description`, `creator`, `durationSeconds`, `thumbnailUrl` |
| `lib/store.ts` | 4 field itu masuk `PlaylyWebhookVideo` |
| `app/api/webhooks/playly/route.ts` | 3 blok `try-catch` (baca badan · parse · simpan) + `catatError()` ke log server |
| `tests/playly-webhook-gagal.test.ts` (baru) | 8 tes jalur gagal — butuh berkas sendiri karena mock modul vitest berlaku per-berkas |

### Kenapa daftar nama-field diekspor, bukan disalin

Playly menamai hal yang sama dengan ejaan berbeda-beda (`thumbnail` / `thumbnailUrl` /
`poster` / `cover`). Daftar itu sudah ada di `lib/playly.ts` untuk jalur katalog. Menyalinnya
ke modul webhook berarti penambahan nama baru pasti terlupa di salah satu tempat. Yang
benar-benar baru cuma dua konsep yang katalog tidak punya: `EMBED_CODE_KEYS` (kode tempel
HTML) dan `DESCRIPTION_KEYS` (sinopsis — tipe `PlaylyVideo` tak mengenalnya).

`EMBED_KEYS` **sengaja tidak ditambahi** `embed_code`: `normalizePlaylyVideos` merakit alamat
dari id kalau tak ada field embed yang cocok, jadi menambah nama di situ akan MENGUBAH hasil
katalog yang sudah jalan di produksi. Modul webhook menggabungkannya sendiri saat membaca
(`[...EMBED_KEYS, ...EMBED_CODE_KEYS]`) — jalur katalog tak tersentuh.

### Kenapa dua jalur pembuktian tidak melemahkan pengaman

Keduanya menuntut pemegang `PLAYLY_WEBHOOK_SECRET` yang sama; yang tak memegangnya gagal di
dua-duanya. Kekuatan nyatanya memang setara jalur terlemah (kunci polos) — itu disadari dan
diterima owner: yang dijaga daftar video, bukan uang. Kalau Playly nanti memastikan dukungan
HMAC, cukup hapus cabang `verifySharedSecret` di `verifyWebhookRequest`.

### Sampul yang tidak lolos TIDAK menggugurkan videonya

`thumbnailUrl` dilewatkan `normalizeThumbnail` yang sama dengan jalur katalog (https / data-URI
gambar raster; SVG ditolak karena bisa memuat `<script>`). Yang gagal jadi `null`, videonya
tetap masuk — video yang bisa diputar tetap berguna walau gambarnya hilang. Beda dengan
`embedUrl`: yang itu gagal = seluruh payload ditolak, karena baris tanpa alamat sah tidak bisa
diputar sama sekali.

## Batas jujur yang MASIH berlaku sesudah putaran 2

1. **Tetap tidak ada bukti Playly punya fitur kirim webhook.** Nama header, nama event, dan
   bentuk payload semuanya dari spesifikasi owner. Endpoint siap menerima, tapi tidak akan
   pernah dipanggil sampai pengelola Playly menyalakannya.
2. **Anti-replay tetap belum tertutup** (`skills/pembayaran/SKILL.md` §2 butir 4c) — payload
   tak membawa `event_id` maupun `sent_at`.
3. **Data webhook masih belum tersambung ke halaman penonton.** Jadi webhook ini belum
   benar-benar menggantikan polling `fetchPlaylyVideosKita()`; ia baru menyimpan.

## Bukti putaran 2

- `npx tsc --noEmit` → exit 0.
- `npx vitest run` → **44 berkas, 604 tes lulus** (82 di antaranya tes webhook).
- `npx next build` → lihat catatan di `HANDOFF.md`.
