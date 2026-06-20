# payments.md - Pembayaran top-up koin via Midtrans Snap

> Versi 1 · 2026-06-20 · auto-generated (lintasAI)

## Tujuan

Untuk developer yang menangani pembelian koin. Menjelaskan alur top-up koin (penambahan saldo dengan uang nyata) lewat **Midtrans Snap** (payment gateway = perantara pembayaran QRIS/GoPay/dll), mulai dari pembuatan transaksi sampai koin masuk ke saldo user setelah pembayaran sukses. Inti keamanannya: **koin HANYA dikredit di webhook setelah signature (tanda tangan digital) terbukti sah** — bukan dari klik di browser.

## Cara Pakai

Dua endpoint API + satu modul helper:

- `POST /api/coins/topup` body `{ email?, packId }` → buat order + minta Snap token. (`app/api/coins/topup/route.ts:26`)
- `POST /api/coins/webhook` → dipanggil OLEH Midtrans (bukan oleh app), tempat koin dikredit. (`app/api/coins/webhook/route.ts:14`)
- Helper Midtrans dipakai di kedua route via `lib/midtrans.ts` (`createSnapTransaction:40`, `verifyNotificationSignature:88`).

Alur lengkap (jalur produksi, dari `topup/route.ts:18-23`):
1. Buat order `status: "pending"` di store (`setOrder` di `topup/route.ts:47`).
2. Minta Snap token ke Midtrans (`createSnapTransaction` di `topup/route.ts:57`), kembalikan token + clientKey + snapUrl ke browser.
3. Browser buka popup `snap.pay(token)` → user bayar.
4. Midtrans kirim notifikasi ke `/api/coins/webhook` → koin dikredit DI SITU setelah verifikasi signature.

Daftarkan URL webhook di dashboard Midtrans: Settings > Configuration > Payment Notification URL = `https://<domain>/api/coins/webhook` (`webhook/route.ts:9-10`).

## Input / Output

`POST /api/coins/topup`:
- Input: `packId` (wajib, harus cocok `getPack` di `lib/coins.ts:46`), `email` opsional (di-resolve via `resolveUserEmail`).
- Output sukses (Midtrans aktif): `{ ok, mode: "midtrans", token, clientKey, snapUrl, orderId }`.
- Output sukses (mode demo): `{ ok, mode: "demo", coins, balance }`.
- Error: `400` body/paket tidak valid · `401` belum login · `502` gagal buat transaksi Midtrans · **`501` pembayaran belum aktif** (`topup/route.ts:84-90`).
- Side effect: tulis order `pending` ke store; mode demo langsung `addCoins`.

`POST /api/coins/webhook`:
- Input (dari Midtrans): `order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status`.
- Output: `403` signature tidak valid · `200` selain itu (termasuk order tak dikenal & status non-sukses).
- Side effect: kalau sukses & belum `paid` → `addCoins(order.email, order.coins)` + `setOrder` jadi `paid` (`webhook/route.ts:44-48`).

## Dependensi

- Env var (samarkan nilai): `MIDTRANS_SERVER_KEY=***` (RAHASIA, dipakai auth API + verifikasi signature), `MIDTRANS_CLIENT_KEY=***` (dikirim ke browser, tidak rahasia), `MIDTRANS_IS_PRODUCTION=***` (`"1"`/`"true"` = produksi, kosong = sandbox), `ENABLE_DEMO_TOPUP=***` (`"1"` = kredit instan tanpa uang nyata, untuk uji coba).
- Modul: `lib/midtrans.ts`, `lib/store.ts` (`addCoins`, `getOrder`, `setOrder`), `lib/session.ts` (`resolveUserEmail`), `lib/coins.ts` (`getPack`, `COIN_PACKS`).
- Eksternal: REST API Midtrans (Snap) via `fetch` — tanpa SDK (`lib/midtrans.ts:1`).

## Catatan

- **Kondisi saat ini = BELUM AKTIF.** Kalau `MIDTRANS_SERVER_KEY` kosong DAN `ENABLE_DEMO_TOPUP` ≠ `"1"`, endpoint balas **`501`** "Pembayaran belum aktif" (`topup/route.ts:84-90`). Saklar deteksi: `midtransConfigured()` cuma cek server key ada (`midtrans.ts:22-24`).
- **Verifikasi signature wajib:** `sha512(order_id + status_code + gross_amount + server_key)` dibanding pakai `crypto.timingSafeEqual` (anti timing attack) (`midtrans.ts:96-107`). Body mentah dari webhook TIDAK dipercaya sebelum lolos cek ini (`webhook/route.ts:29-31`).
- **Idempoten:** koin dikredit sekali per order — webhook yang diulang Midtrans (`status !== "paid"` jadi syarat di `webhook/route.ts:44`) tidak menambah koin dobel.
- **Edge case webhook order tak dikenal:** sengaja balas `200` supaya Midtrans berhenti retry (`webhook/route.ts:34-37`).
- **Edge case Supabase tak terjangkau saat webhook:** kalau `addCoins`/`getOrder`/`setOrder` melempar error, handler tidak menangkapnya → respons error. Midtrans retry beberapa kali lalu menyerah. Risiko: pembayaran tercatat sukses di Midtrans tapi koin tak masuk (kebocoran pendapatan). Lihat temuan audit di bawah.
- **GENTING — belum ada monitoring/alarm error untuk webhook.** Error webhook hanya jadi respons JSON, tidak dikirim ke layanan pemantau (mis. Sentry), sehingga kegagalan diam-diam (koin gagal masuk) baru ketahuan saat user komplain. Detail + cara perbaiki: `docs/decisions/2026-06-20-audit-findings.md` temuan **[1]** (juga **[16]** soal kebutuhan dokumen ini). Source: `webhook/route.ts:14-52`.

## 🙂 Untuk non-programmer (bahasa sehari-hari)

Berkas ini menjelaskan cara user **beli koin pakai uang asli** lewat Midtrans (perantara pembayaran, seperti loket pembayaran di Tokopedia). Alurnya mirip belanja online: user pilih paket koin, muncul kotak pembayaran (QRIS/GoPay), user bayar. Penting: koin **baru ditambahkan setelah Midtrans benar-benar mengonfirmasi pembayaran berhasil** — bukan saat user klik "bayar". Mirip Tokopedia: penjual baru kirim barang setelah dapat notifikasi resmi "pembayaran lunas" dari sistem, bukan cuma karena pembeli bilang "sudah bayar kok". Aplikasi juga mengecek "tanda tangan digital" dari Midtrans dulu, supaya tidak ada orang iseng yang mengaku-ngaku sudah bayar. **Saat ini fitur ini belum dinyalakan** (kalau dicoba, sistem menjawab "pembayaran belum aktif"). Catatan penting dari pemeriksaan: belum ada "alarm" yang memberitahu tim kalau ada pembayaran yang gagal masuk diam-diam — jadi tim bisa tidak sadar uang sudah masuk tapi koin belum ditambahkan.
