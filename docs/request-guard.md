# request-guard — penjaga endpoint koin (anti-CSRF + pembatas laju)

> Versi 1 · 2026-06-27

## Tujuan

Menutup sebagian celah keamanan ekonomi koin yang ditemukan di audit
2026-06-20 (temuan IDOR & CSRF, lihat `decisions/2026-06-20-audit-findings.md`
poin [7]/[8]/[9]). Dipasang sebagai "langkah ringan" yang TIDAK memaksa
penonton login ulang.

Dua lapisan untuk tiap endpoint koin yang **mengubah data** (POST):
1. **Anti-CSRF** — tolak permintaan lintas-domain (403). Cegah situs jahat
   memicu transaksi koin dari browser korban yang masih login.
2. **Pembatas laju per-IP** — tolak banjir permintaan (429). Cegah panen koin
   massal (1 alat memanggil endpoint ribuan kali dengan banyak email palsu).

## Cara Pakai

Di awal `POST` handler (sebelum baca body):

```ts
import { guardMutation } from "@/lib/request-guard";

export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "coins:checkin", // nama ember pembatas laju (unik per endpoint)
    limit: 10,               // maks 10 permintaan
    windowMs: 60_000,        // per 60 detik per-IP
  });
  if (blocked) return blocked; // 403 (CSRF) atau 429 (rate limit)
  // ... lanjut logika asli
}
```

Terpasang di: `coins/unlock` (30/mnt), `coins/reward` (20/mnt),
`coins/checkin` (10/mnt), `coins/topup` (10/mnt). Webhook Midtrans **tidak**
dijaga (server-ke-server, tanpa Origin) — dan memang tak boleh, supaya
notifikasi pembayaran tetap masuk.

## Input — Output

- **`isSameOrigin(origin, host)`** (`lib/origin.ts`, murni): `true` kalau host
  Origin == host server, ATAU Origin tak ada (klien non-browser). `false` kalau
  lintas-domain / Origin tak bisa di-parse.
- **`clientIp(headers)`** (`lib/origin.ts`, murni): IP pertama dari
  `x-forwarded-for`, lalu `x-real-ip`, lalu `"unknown"`.
- **`checkRate(store, key, now, limit, windowMs)`** (`lib/rate-limit.ts`,
  murni): keputusan jendela-tetap atas Map yang diberikan — mudah dites karena
  `now` & store disuntik. `rateLimit(key, limit, windowMs)` = pembungkus runtime
  (jam nyata + Map tingkat-modul).
- **`guardMutation(req, opts)`** (`lib/request-guard.ts`): `NextResponse`
  (403/429) bila ditolak, atau `null` bila lolos.

## Dependensi

- `next/server` (`NextResponse`) — hanya di `request-guard.ts`. File `origin.ts`
  & `rate-limit.ts` MURNI (tanpa Next) → bisa dites tanpa harness browser.
- Tes: `tests/origin.test.ts`, `tests/rate-limit.test.ts` (16 tes).

## Catatan (keputusan penting)

- **Pembatas laju = BEST-EFFORT di Vercel.** Hitungan ada di memori tiap instance
  serverless; Vercel bisa pakai beberapa instance + reset saat "dingin". Cukup
  memblokir banjir naif dari satu klien, TAPI bukan batas ketat lintas-instance.
  Pengetatan berikutnya: penyimpanan bersama (Upstash/Redis atau tabel Supabase).
- **Belum menutup IDOR sepenuhnya.** Akun penonton masih TANPA kata sandi
  (login mengabaikan password, `/daftar` murni di browser), jadi identitas
  penonton tetap email yang diketik sendiri. Penyerang yang membuat skrip masih
  bisa "login sebagai siapa pun". Penutupan PENUH butuh autentikasi penonton
  (kata sandi) — lihat rencana "Opsi 2" di catatan keputusan. Dampak nyata
  sekarang kecil karena belum ada drama premium (koin belum bisa dibelanjakan).
- **Periksa env `ENABLE_DEMO_TOPUP`** TIDAK aktif di produksi (kalau aktif,
  `coins/topup` mengkredit koin gratis tanpa bayar — lihat `payments.md`).

## Threat model (3 baris)

- **Aset dilindungi**: saldo koin pengguna + integritas ekonomi koin.
- **Model penyerang**: situs jahat (CSRF lewat browser korban) + bot pemanggil
  endpoint massal (panen koin via banyak email palsu).
- **Mitigasi utama**: penjaga asal (Origin) menutup CSRF; pembatas laju per-IP
  meredam panen massal. Sisa (impersonasi via skrip) menunggu kata sandi penonton.
