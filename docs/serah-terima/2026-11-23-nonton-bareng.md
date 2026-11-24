# 2026-11-23 — Nonton Bareng (watch party) untuk film Playly

Branch: `feat/nonton-bareng` (dari `origin/main` 6de869d). Rancangan: `docs/lintasai/rencana/2026-11-23-nonton-bareng.md`.

## 1. Apa yang berubah + kenapa

Fitur ini membuat beberapa orang bisa menonton film Playly yang sama di waktu yang sama dari tempat
berbeda, lewat satu link undangan.

- Di `/tonton/[id]` ada tombol **Nonton Bareng**. Pembuatnya otomatis jadi **Host** dan mendapat link
  `/watch-room/<token>` untuk disalin atau dibagikan ke WhatsApp dan Telegram.
- Penonton yang membuka link mengisi nama, lalu videonya **mengikuti** play, jeda, dan geser milik Host.
  Selisih lebih dari 1,5 detik dikoreksi otomatis.
- Semua orang di Room bisa memakai **live chat** dan melihat **daftar penonton** (online/offline, label HOST).

Keputusan client (2026-11-23):
- Server Socket.IO terpisah, dijalankan sebagai service Railway kedua.
- Cakupan tahap ini **film Playly saja**. Episode drama (FeedPlayer, CAPTCHA, koin) belum.

Kenapa server terpisah: koneksi real-time harus terus terbuka selama orang menonton. Dengan server
terpisah, gangguan di sini tidak menjatuhkan situs streaming.

Yang **tidak** dibangun:
- Sinkron untuk pemutar iframe (`/video-eksternal`). Browser melarang mengendalikan isinya.
- Lebih dari satu instance server.

## 2. Berkas yang disentuh

Baru:
- `nobar-server/` — server Socket.IO lengkap + tes integrasi + README (instalasi, env, deploy, tes)
- `supabase_migrations/2026-11-23_nonton_bareng.sql`
- `lib/nobar.ts`
- `app/api/watch-room/route.ts`
- `app/api/watch-room/[token]/gabung/route.ts`
- `app/api/watch-room/[token]/tiket/route.ts`
- `app/watch-room/[token]/page.tsx`
- `app/components/nobar/` — `RuangNobar`, `ChatNobar`, `DaftarPenonton`, `UndanganNobar`, `TombolNobar`, `useNobar`, `useSinkronVideo`
- `tests/nobar-kontrak.test.ts`

Diubah, dengan pemakai lain yang ikut tersentuh:
- `app/components/player/PlaylyPlayer.tsx` — prop opsional `nobar`. **Dipakai juga `/tonton/[id]` dan
  `/film`.** Keduanya tidak mengirim prop itu, jadi perilakunya sama persis seperti sebelumnya. Seluruh
  tes pemutar yang ada tetap hijau.
- `app/tonton/[id]/page.tsx` — tombol di bawah info video, hanya muncul kalau env `NOBAR_*` terisi.
  Halaman tetap ISR `●` (dicek di hasil build).
- `next.config.ts` — alamat nobar-server ditambahkan ke `connect-src` CSP. Kosong kalau env kosong.
- `lib/navigasi-halaman.ts` — `/watch-room/[token]` dicatat sebagai halaman tanpa navbar (sengaja,
  sama seperti `/feed`).
- `tsconfig.json`:
  - `allowImportingTsExtensions` (sah karena `noEmit`).
  - `nobar-server` dikecualikan, karena punya tsconfig sendiri.
- `package.json` + lock: `socket.io-client@4.8.4`.

## 3. Butuh SQL migrasi?

**Ya:** `supabase_migrations/2026-11-23_nonton_bareng.sql`. Isinya 4 tabel `dramaapp.watch_*`:
- RLS menyala tanpa policy. Hanya `service_role` yang bisa menyentuhnya.
- Idempoten (aman dijalankan ulang).
- Cara membatalkan tertulis di kepala berkas.

Jalankan **sebelum** deploy nobar-server.

## 4. Butuh env baru?

**Ya.** Di Railway, bukan Vercel: produksi sudah di Railway.

Service **nobar-server** (baru):

| Nama | Fungsi | Kalau kosong |
|---|---|---|
| `NOBAR_SECRET` | Rahasia bersama situs ↔ server | Server menolak jalan |
| `NOBAR_ALLOWED_ORIGINS` | Alamat situs yang boleh menyambung | Server menolak jalan |
| `SUPABASE_URL` | Sama dengan situs | Server menolak jalan |
| `SUPABASE_SERVICE_ROLE_KEY` | Sama dengan situs | Server menolak jalan |

Service **situs**:

| Nama | Fungsi | Kalau kosong |
|---|---|---|
| `NOBAR_SECRET` | Sama persis dengan di atas | Fitur mati rapi: tombol tak tampil, route 404 |
| `NOBAR_PUBLIC_URL` | Alamat publik nobar-server, juga dibaca saat build untuk CSP | Fitur mati rapi |
| `NOBAR_INTERNAL_URL` | Opsional, jaringan privat Railway | Memakai `NOBAR_PUBLIC_URL` |

Urutan rilis:
1. SQL.
2. Deploy nobar-server (Root Directory `nobar-server`, replicas 1) + isi env-nya.
3. Isi env situs.
4. Redeploy situs.

Langkah rinci ada di `nobar-server/README.md`.

## 5. Bukti yang sudah dijalankan

- `nobar-server`:
  - `npm test` **6/6 lulus**: tes integrasi server sungguhan dengan 3 klien Socket.IO.
  - **Uji-balik:** penjaga "hanya Host" dimatikan sementara → tes **merah** (1 gagal) → dikembalikan → hijau.
  - `npm run typecheck` 0 error.
- `npx vitest run tests/nobar-kontrak.test.ts` **15/15 lulus**.
- Gerbang pra-rilis (aturan 6, urutan build → tsc → test):
  - `rm -rf .next` → `ALLOW_FILE_MODE=1 npm run build` **exit 0**
  - `npx tsc --noEmit` **exit 0**
  - `npm test`: **2744 lulus, 8 merah**. Rinciannya:
    - **7 merah sudah merah di `origin/main` yang bersih.** Dibuktikan di worktree terpisah: 6 berkas yang
      sama, 7 tes yang sama gagal tanpa perubahan ini. Berkasnya: `bagian-playly`, `baris-atas-film`,
      `hero-gambar-besar`, `panel-playly-tahan-gangguan`, `playly-genre`, `saring-video-admin`.
    - **1 merah** (`jeda-koin-iklan`) adalah timeout 5 detik saat suite penuh berjalan paralel. Dijalankan
      sendiri **3× lulus 7/7**. Berkas yang diujinya tidak disentuh.
- **Uji ujung-ke-ujung lokal 16/16 lulus**, memakai route Next asli + nobar-server asli. Yang terbukti:
  - Video tak terdaftar → 404. POST dari situs lain → 403.
  - Host membuat Room lewat Next → 201 + cookie HttpOnly. Tombol tampil di `/tonton`.
  - Token tebakan → "Undangan tidak valid". Tamu melihat form nama. Halaman `noindex`.
  - Tiket tanpa cookie → 401. Penonton gabung → cookie HttpOnly.
  - Host putar di detik 42 → penonton ikut. Penonton coba jeda → ditolak.
  - Chat sampai dengan nama + waktu. Sambung ulang → posisi & riwayat chat kembali.
- ❓ **Belum terbukti di browser sungguhan:** perilaku `<video>` (play/seek mengikuti Host, banner
  "nyalakan suara" saat autoplay diblokir). Uji di atas memakai klien Socket.IO, bukan browser.
  Langkah 6 di bawah adalah ujinya.

Temuan lain (bukan dari fitur ini, belum diperbaiki):
- `tests/playly-video-route.test.ts` menulis cadangan berisi 2 id video uji **tanpa judul** ke berkas
  sungguhan `data/playly.json` (masuk `.gitignore`) setiap `npm test`.
- Sesudah itu, `npm run build` lokal **gagal di `/beranda`** (`toLowerCase` pada judul kosong).
- Jebakan untuk siapa pun yang menjalankan gerbang di folder yang sama: hapus `data/playly.json`
  sebelum build.

## 6. Cara owner mencoba sendiri

Sesudah SQL + 2 service + env terpasang:

1. Buka `/tonton/<id film>` → klik **Nonton Bareng** → isi nama → **Buat Room**. Harus pindah ke halaman
   gelap dengan video, label "Kamu Host", dan kotak link undangan.
2. Klik **Salin**, lalu buka link itu di HP atau jendela penyamaran → isi nama → **Gabung**. Di daftar
   penonton harus tampil 2 nama, satu berlabel HOST.
3. Di layar Host, putar lalu geser ke tengah film. Dalam ±2 detik video di HP harus pindah ke posisi
   yang sama, dan lencana menunjukkan "Sinkron dengan Host". Kirim chat dari HP: harus muncul di layar
   Host tanpa muat ulang.
