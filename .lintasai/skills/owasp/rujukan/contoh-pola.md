# Contoh pola ❌→✅ — fail-open · CORS credentials · Next.js CVE-2025-29927

> Bagian dari `skills/owasp` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
> Lanjutan seksi "Contoh pola ❌→✅" §3 SKILL.md (ambil POLANYA, jangan salin mentah — cek versi paket/provider terpasang); pasangan PALING kritis (Broken access/IDOR — Top 10 #1) tetap di SKILL.md inti §3.

🧪 **Fail-open saat exception — A10:2025 (SKILL.md inti §1 butir 3)** — error/timeout = TOLAK, bukan meloloskan:

❌ **SALAH** (`catch` meloloskan — layanan izin down berarti SEMUA orang lolos):
```ts
async function bolehAkses(userId: string, dokumenId: string): Promise<boolean> {
  try {
    return await cekIzin(userId, dokumenId)
  } catch {
    return true // fail-OPEN: justru saat sistem sakit, pintu dibuka lebar
  }
}
```
✅ **BENAR** (default-deny + error tercatat untuk alerting):
```ts
async function bolehAkses(userId: string, dokumenId: string): Promise<boolean> {
  try {
    return await cekIzin(userId, dokumenId)
  } catch (err) {
    console.error('cekIzin gagal — akses DITOLAK', err) // log = bahan alerting (A09); JANGAN catch kosong
    return false // fail-CLOSED: ragu/error = tolak; user sah tinggal retry, penyerang tak dapat celah
  }
}
```

🧪 **CORS: credentials + origin bebas (SKILL.md inti §1 butir 4)** — memantulkan origin request ≈ wildcard `*`:

❌ **SALAH** (origin apa pun dipantulkan + credentials ON = cookie sesi ikut terkirim ke situs penyerang):
```ts
export function corsHeaders(req: Request): Headers {
  const h = new Headers()
  h.set('Access-Control-Allow-Origin', req.headers.get('origin') ?? '*') // origin APA PUN diloloskan — setara '*'
  h.set('Access-Control-Allow-Credentials', 'true') // browser ikut kirim cookie login ke origin itu
  return h
}
```
✅ **BENAR** (whitelist spesifik dari env; nama setelan tiap framework beda — cek docs versi terpasang):
```ts
const ORIGIN_IZIN = (process.env.CORS_ALLOWED_ORIGINS ?? '').split(',') // mis. "https://app.contoh.com"
export function corsHeaders(req: Request): Headers {
  const h = new Headers()
  const origin = req.headers.get('origin')
  if (!origin || !ORIGIN_IZIN.includes(origin)) return h // di luar whitelist → tanpa header CORS = browser memblokir
  h.set('Access-Control-Allow-Origin', origin)
  h.set('Access-Control-Allow-Credentials', 'true')
  h.append('Vary', 'Origin') // cache/CDN tak menyajikan header milik origin A ke origin B
  return h
}
```

🧪 **Next.js: otorisasi di route handler, bukan cuma middleware — CVE-2025-29927 (SKILL.md inti §1 butir 5)** — selain upgrade `next` ke versi patch:

❌ **SALAH** (middleware satu-satunya penjaga — header `x-middleware-subrequest` bisa melewatinya seluruhnya):
```ts
// middleware.ts — SATU-SATUNYA cek login di app ini
import { NextRequest, NextResponse } from 'next/server'
export function middleware(req: NextRequest) {
  if (!req.cookies.get('session')) return NextResponse.redirect(new URL('/login', req.url))
}
// app/api/admin/route.ts — polos, percaya middleware sudah menjaga
export async function GET() {
  return Response.json(await db.user.findMany()) // middleware tertembus → data tumpah tanpa cek apa pun
}
```
✅ **BENAR** (cek ulang DI DALAM handler = defense-in-depth; 401 belum-login ≠ 403 tak-berhak):
```ts
// app/api/admin/route.ts
export async function GET(req: Request) {
  const sesi = await ambilSesi(req) // verifikasi sesi LAGI di sini — tetap jalan walau middleware dilewati
  if (!sesi?.user) return new Response('Unauthorized', { status: 401 }) // belum login
  if (sesi.user.role !== 'admin') return new Response('Forbidden', { status: 403 }) // login tapi tak berhak
  return Response.json(await db.user.findMany()) // + RLS di database sebagai lapis ketiga
}
```
