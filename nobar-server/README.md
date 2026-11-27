# nobar-server — server real-time Nonton Bareng

Server Node.js + Socket.IO untuk fitur **Nonton Bareng** (watch party) di Dramaku.
Dijalankan sebagai **service Railway terpisah** dari situs, supaya gangguan di sini
tidak ikut menjatuhkan situs streaming.

```
Browser ──HTTPS + cookie HttpOnly──► Situs Next  ──HTTP internal + NOBAR_SECRET──► nobar-server ──► Supabase
   └──────────────────── WSS + tiket 60 detik ───────────────────────────────────►  (Socket.IO)
```

| Berkas | Tugas |
|---|---|
| `src/kontrak.ts` | Bentuk event, batas, validasi, rumus sinkron. **Dipakai juga oleh browser.** |
| `src/tiket.ts` | Token undangan, kunci peserta, tiket socket (HMAC). Dipakai juga route Next. |
| `src/ruang.ts` | Keadaan satu Room di memori: siapa online, siapa Host, posisi video. |
| `src/server.ts` | Jalur HTTP internal + handler Socket.IO + kerja berkala. |
| `src/penyimpanan*.ts` | Antarmuka data: memori (tes/lokal) & Supabase (produksi). |
| `src/index.ts` | Membaca env, menolak jalan kalau setelan produksi tidak lengkap. |

## Syarat

- **Node ≥ 22.18** — TypeScript dijalankan langsung (`node src/index.ts`), tanpa langkah build.
- 4 tabel di Supabase: jalankan `supabase_migrations/2026-11-23_nonton_bareng.sql` **lebih dulu**.

## Env

| Nama | Wajib | Isi | Kalau kosong |
|---|---|---|---|
| `NOBAR_SECRET` | ya | Teks acak ≥32 huruf. **Sama persis** dengan env situs. | Server menolak jalan. |
| `NOBAR_ALLOWED_ORIGINS` | ya | Alamat situs, pisah koma. Mis. `https://dramaapp-production-9e88.up.railway.app` | Server menolak jalan. |
| `SUPABASE_URL` | produksi | Sama dengan situs. | Produksi: menolak jalan. Lokal: data di memori. |
| `SUPABASE_SERVICE_ROLE_KEY` | produksi | Sama dengan situs. Rahasia server, jangan ke browser. | Idem. |
| `PORT` | – | Diisi otomatis Railway. Lokal bawaan 3020. | – |

Buat `NOBAR_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

## Menjalankan di komputer sendiri

```bash
cd nobar-server
npm install
NOBAR_SECRET=<32+ huruf> NOBAR_ALLOWED_ORIGINS=http://localhost:3010 PORT=3030 npm start
# cek: http://localhost:3030/health → {"ok":true,"room":0}
```

Tanpa env Supabase, data disimpan di **memori** (hilang saat server mati). Itu cukup untuk mencoba.
Situs Next lokal butuh `NOBAR_SECRET` yang sama + `NOBAR_PUBLIC_URL=http://localhost:3030`.

## Tes

```bash
npm test          # tes integrasi: server sungguhan + beberapa klien Socket.IO
npm run typecheck # pemeriksa tipe (tsc)
```

Logika murni (rumus sinkron, validasi, tiket) juga diuji dari akar repo: `npx vitest run tests/nobar-kontrak.test.ts`.

## Deploy di Railway (sekali)

1. Project Railway Dramaku → **New → GitHub Repo** → repo yang sama dengan situs.
2. Settings service baru:
   - **Root Directory**: `nobar-server`
   - Start command: bawaan (`npm start`)
   - Pastikan Node ≥22.18 (variabel `RAILPACK_NODE_VERSION=22` atau lebih baru)
   - **Replicas: 1.** Lihat batas di bawah.
3. Isi 4 env di tabel atas → **Generate Domain** → catat alamatnya (mis. `https://nobar-xxx.up.railway.app`).
4. Di service **situs**, tambahkan:
   - `NOBAR_SECRET` (sama persis)
   - `NOBAR_PUBLIC_URL` = alamat langkah 3
   - opsional `NOBAR_INTERNAL_URL` = `http://<nama-service>.railway.internal:<PORT>` (jaringan privat, lebih cepat)
5. **Redeploy situs.** Dua alasan: halaman `/tonton/<id>` disimpan 300 detik (`revalidate = 300` di `app/tonton/[id]/page.tsx:39`), jadi tanpa deploy ulang tombolnya baru muncul sesudah simpanan itu habis; dan `NOBAR_PUBLIC_URL` dibaca saat build untuk daftar CSP (`next.config.ts:152`). ⚠️ RALAT 2026-11-26: CSP produksi masih `Content-Security-Policy-Report-Only` (`next.config.ts:213`, diukur dari header situs) — ia **tidak memblokir** apa pun, jadi alasan "tanpa Redeploy browser memblokir koneksi" KELIRU.

Sebelum langkah 4 selesai, tombol Nonton Bareng **tidak muncul** dan route-nya membalas 404.
Fitur mati dengan rapi, situs lain tidak terpengaruh.

## Aturan yang ditegakkan server

- Masuk Room hanya lewat token undangan 256-bit. DB menyimpan hash-nya, bukan token aslinya.
- Play, pause, dan seek hanya diterima dari peserta yang **di memori server** berperan Host.
- Rate limit per peserta tiap 10 detik:
  - chat 5 pesan
  - kontrol 20
  - laporan 6
  - total 40 event per soket; lebih dari itu, koneksi diputus
- Pesan identik dalam 15 detik ditolak. Chat maksimal 300 huruf, nama maksimal 24 huruf, Room maksimal 20 orang.
- `Origin` dicek saat handshake (anti-CSWSH). Payload maksimal 4 KB.
- Host offline lebih dari 1 menit: peran pindah ke penonton online yang paling lama ikut. Host juga bisa
  menyerahkan peran sendiri atau mengakhiri Room.
- Room tanpa aktivitas 6 jam diakhiri otomatis. Room berakhir dihapus (beserta chat) sesudah 7 hari.

## Batas yang disengaja

- **Satu instance.** Room, rate limit, dan siapa online hidup di memori proses. Untuk lebih dari 1 replica
  perlu adapter Redis (`@socket.io/redis-adapter`) dan pembatas laju di Redis.
- Hanya untuk pemutar `<video>` HTML5 (`PlaylyPlayer`). Pemutar iframe eksternal tak bisa dikendalikan
  dari luar (aturan same-origin browser), jadi tidak disinkronkan.
