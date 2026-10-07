# 2026-10-07 — Popup unduhan Playly: provider ke-5 Sendcm + tombol "DOWNLOAD 1080p" biru / 480p oranye

Branch: `feat/link-unduhan-provider-kualitas` · commit fitur `dce317a` (+ commit serah-terima ini).
Melanjutkan `2026-10-07-link-unduhan-provider-kualitas.md` — rilis keduanya bersamaan.

## 1. Apa yang berubah + kenapa
Popup DOWNLOAD video Playly diminta tampil persis seperti gambar contoh: lima provider
(Google Share · Telegram · Cast · Mega · **Sendcm**), tombol bertulisan `DOWNLOAD 1080p` /
`DOWNLOAD 480p`, dengan 1080p biru dan 480p oranye. Sebelumnya hanya empat provider, tombol
bertulisan `1080p` saja dan semuanya biru.

Sendcm ditambahkan ke daftar provider tunggal (`PROVIDER_UNDUHAN`), jadi panel admin, rute
admin, webhook, dan skrip impor ikut menerima Sendcm tanpa diubah satu-satu. Domain bawaannya
`send.cm`. ❓ Domain ini diambil dari nama layanannya; situsnya di balik Cloudflare sehingga
format link aslinya belum terbaca langsung. Kalau link asli memakai domain lain, tambahkan lewat
env (bagian 4).

Tidak berubah: **Cast tetap tanpa domain bawaan** → link Cast tetap ditolak sampai env-nya diisi.
Tombol tetap hanya muncul untuk link yang benar-benar ada — fitur ini belum berisi link apa pun.

## 2. Berkas yang disentuh
- `lib/playly-unduhan.ts` — provider `sendcm`, label "Sendcm", alias `sendcm`/`send.cm`
- `lib/playly-unduhan-domain.ts` — domain bawaan `send.cm`
- `app/components/player/ModalProviderPlayly.tsx` — label `DOWNLOAD <kualitas>`, warna per
  kualitas (`WARNA_KUALITAS`). Popup ini dipakai /film, baris Playly di /discover, dan
  /tonton/[id] — ketiganya ikut berubah.
- `app/api/admin/playly/unduhan/route.ts`, `app/components/admin/PlaylyUnduhanManager.tsx`,
  `lib/playly-webhook.ts`, `scripts/impor-link-unduhan.ts` — komentar saja (jumlahnya otomatis
  mengikuti daftar provider)
- `scripts/contoh-link-unduhan.csv` — 1 baris contoh Sendcm
- `.env.example` — `PLAYLY_UNDUHAN_DOMAIN_SENDCM=`
- `tests/playly-unduhan.test.ts`, `tests/playly-modal-provider.test.ts`,
  `tests/playly-unduhan-impor.test.ts` — diperbarui ke 5 provider + 1 tes warna tombol

⚠️ Untuk owner: commit lama `4b7c034` di branch ini (sesi sebelumnya) juga menulis ke berkas
milik owner (`HANDOFF.md`/`antrean-deploy.md`/`docs/lintasai/INDEX.md`). Commit `dce317a`
sempat menulis `HANDOFF.md` juga, tapi sudah dibatalkan di commit serah-terima ini.

## 3. Butuh SQL migrasi?
Tidak.

## 4. Butuh env baru di Vercel?
Opsional, tidak wajib:
- `PLAYLY_UNDUHAN_DOMAIN_SENDCM` — domain TAMBAHAN untuk link Sendcm (dipisah koma). Kosong =
  hanya `send.cm` yang diterima.
- `PLAYLY_UNDUHAN_DOMAIN_CAST` (sudah ada sebelumnya) — kosong = semua link Cast ditolak.

## 5. Bukti
npm test -> 1339 lulus / 90 berkas
rm -rf .next lalu npm run build -> exit 0
npx tsc --noEmit (sesudah build) -> exit 0
Belum dilihat di browser sungguhan — hanya diuji di jsdom.

## 6. Cara owner mencoba
1. Buka `/admin/videos/playly`, pilih satu video → **Atur provider**; isi satu link Google Drive di
   "Google Share 1080p" dan satu link `https://send.cm/...` di "Sendcm 480p" → Simpan.
2. Buka video itu di situs → klik **DOWNLOAD**.
3. Harus muncul baris "Google Share" dengan tombol biru `DOWNLOAD 1080p` dan baris "Sendcm"
   dengan tombol oranye `DOWNLOAD 480p`; tiap tombol membuka link-nya di tab baru.
