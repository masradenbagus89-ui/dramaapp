# Rencana — Nonton Bareng (Watch Party) untuk film Playly

> 2026-11-23 · dikerjakan rekan di branch `feat/nonton-bareng` · bobot BERAT (skema DB + fitur baru + ≥3 subsistem)

## Keputusan client (popup 2026-11-23)
- Real-time: **server Node.js + Socket.IO terpisah** (bukan polling, bukan Supabase Realtime).
- Hosting: **Railway berbayar** → service KEDUA di project Railway yang sama dengan situs.
- Cakupan tahap ini: **film Playly saja** (`/tonton/[id]`). Episode drama (FeedPlayer, CAPTCHA, koin) = tahap berikutnya.
- Premium: "tiap penonton buka sendiri" — dicatat untuk tahap drama; film Playly tak berkoin.

## Fakta dasar (terverifikasi)
- Next.js 16 + Supabase (PostgREST, schema `dramaapp`), BUKAN PHP.
- Produksi di Railway (`HANDOFF.md:460`); env Railway bisa diubah owner (`HANDOFF.md:765`).
- `PlaylyPlayer` = `<video>` HTML5 → play/pause/seek bisa dikendalikan. `EmbedPlayer` (iframe) TIDAK → di luar cakupan.
- Tak ada tabel pengguna (identitas = email di cookie `dramaku_viewer`) → peserta disimpan dengan nama + email opsional.

## Arsitektur
```
Browser ──(HTTPS, cookie HttpOnly)──► Next (Dramaku)  ──(HTTP internal + NOBAR_SECRET)──► nobar-server
   │                                   validasi video kurasi,                               simpan Room, peserta,
   │                                   tanda tangani tiket 60 dtk                            chat, status → Supabase
   └──────────────(WSS + tiket)────────────────────────────────────────────────────────────►  Socket.IO
```
- `nobar-server/` = satu-satunya pemilik data Nonton Bareng (penyimpanan memori untuk dev/tes, Supabase untuk produksi).
- Token undangan 256-bit; DB hanya menyimpan hash-nya. Kunci peserta di cookie HttpOnly, browser hanya pegang tiket 60 detik.
- Host = peran di DB, diperiksa server tiap event kontrol.

## Yang TIDAK dibangun (sengaja)
- Sinkron untuk iframe eksternal (`/video-eksternal`) — mustahil tanpa API provider.
- Banyak instance server (butuh Redis adapter) — satu instance cukup; batasnya dicatat di kode.
- Episode drama — tahap berikutnya.

## Pre-mortem
Paling mungkin gagal guna: server tak pernah dideploy / env tak diisi → tombol tak muncul. Penangkal: tombol
tersembunyi aman kalau env kosong + langkah deploy rinci di serah-terima + `/health`.
Kedua: autoplay diblokir browser → penonton wajib klik "Gabung" (klik itu membuka izin suara).

## Tahapan
1. SQL `supabase_migrations/2026-11-23_nonton_bareng.sql`
2. `nobar-server/` (kontrak, tiket, penyimpanan, ruang, server, entry) + tes integrasi
3. Route Next `/api/watch-room/*` + halaman `/watch-room/[token]`
4. Prop `nobar` di `PlaylyPlayer` + tombol di `/tonton/[id]` + CSP
5. Tes + build + serah-terima
