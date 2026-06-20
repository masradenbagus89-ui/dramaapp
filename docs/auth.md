# auth.md - Autentikasi DramaKu (penonton tanpa password + admin password & 2FA)
> Versi 1 · 2026-06-20 · auto-generated (lintasAI)

## Tujuan
Mengatur "siapa kamu" di aplikasi. Ada 2 tingkat: **penonton (viewer)** login ringan tanpa password (cukup email) untuk fitur koin/dompet, dan **admin** yang wajib password + opsional 2FA (kode 6 angka dari aplikasi authenticator) untuk mengelola konten. Identitas admin dibuktikan ke server lewat cookie ber-tanda-tangan; identitas penonton masih di-assert dari klien.

## Cara Pakai
- **Login penonton**: kirim `{ email }` ke `POST /api/auth/login`. Identitas penonton disimpan di browser (`localStorage` key `dramaku:user`) via `writeUser()` di `lib/auth.ts:45`; tidak ada cookie server.
- **Login admin**: `POST /api/auth/login` dengan `{ email, password }`. Kalau admin punya 2FA aktif, respons `{ need2fa: true }` minta kode → kirim ulang dengan `{ email, password, token }`. Sukses → server set cookie `dramaku_admin` (`app/api/auth/login/route.ts:75-80`).
- **Cek admin per-request** (di route mana pun): `await isAdminRequest(req)` atau `await getAdminEmail(req)` dari `lib/session.ts:80,89`.
- **2FA admin**: `setup` (buat secret pending) → `enable` (verifikasi kode, aktifkan) → `disable` (matikan, wajib kode). Status: `GET /api/auth/2fa`.

## Input / Output
- **`signAdminSession(email)`** (`lib/session.ts:30`): bikin token `base64url(payload).HMAC`. Payload = `{ email, role:"admin", exp }`, kedaluwarsa 7 hari (`SESSION_MAX_AGE`).
- **`getAdminEmail(req)`** (`lib/session.ts:80`): baca cookie → verifikasi HMAC + belum expired + `role=admin` + email **masih** terdaftar admin (`isAdminEmail`). Return email atau `null`.
- **`resolveUserEmail(req, fallbackEmail?)`** (`lib/session.ts:100`): admin → email dari cookie (tepercaya); viewer → email dari `fallbackEmail` (klien) asal mengandung `@`. Return `{ email, isAdmin }` atau `null`.
- **`verifyTotp(secret, token, window=1)`** (`lib/totp.ts:77`): cocokkan kode 6 digit ±1 langkah (±30 detik). Pakai `crypto.timingSafeEqual` (tahan serangan waktu).
- **Side effect**: `POST /api/auth/login` & `logout` menulis/menghapus cookie `dramaku_admin`. `clearUser()` (`lib/auth.ts:51`) hapus localStorage + fire-and-forget `POST /api/auth/logout`.
- **Error umum**: 400 email tak valid; 401 password/2FA salah; 500 `ADMIN_PASSWORD`/`AUTH_SECRET` belum di-set; 401 Unauthorized di route 2FA bila cookie tidak valid.

## Dependensi
- `node:crypto` (HMAC-SHA256 untuk sesi, HMAC-SHA1 untuk TOTP, `timingSafeEqual`, `randomBytes`).
- `lib/store.ts`: `isAdminEmail` (`:123`), `getTwoFA`/`setTwoFA` (`:369,:375`) — sumber daftar admin & data 2FA (Supabase atau file lokal).
- **Env var** (samarkan nilai): `ADMIN_PASSWORD=***`, `AUTH_SECRET=***` (string acak ≥32 karakter). Lihat `.env.example:14-15`. Daftar admin dari store/`data/admins.json`.

## Catatan
- **Secret kosong**: kalau `AUTH_SECRET` kosong, `verifyToken` langsung return `null` (`lib/session.ts:42`) → tak ada sesi admin yang bisa lolos. `adminAuthConfigured()` (`:21`) jaga agar login admin ditolak (500) bila config belum lengkap.
- **Timing-safe compare**: password (`safeEqual`, `login/route.ts:16`), tanda tangan cookie (`session.ts:50`), dan kode TOTP (`totp.ts:67`) dibandingkan dengan `timingSafeEqual` — cek panjang dulu agar tidak error & tak bocor lewat selisih waktu.
- **Window TOTP**: default `window=1` = kode dari ±30 detik lalu masih diterima (toleransi jam melenceng). Pemanggil tak set eksplisit (`login/route.ts:67`).
- **Cabut admin instan**: walau cookie masih sah, kalau email dihapus dari daftar admin, `getAdminEmail` tetap return `null` (`session.ts:85`) → akses langsung hilang.
- **Cookie**: `httpOnly`, `sameSite=lax`, `secure` hanya di production (`session.ts:112-120`).

### Catatan keamanan (dari audit)
- **Tanpa rate-limit di login** (`app/api/auth/login/route.ts`): penyerang yang sudah tahu email+password admin bisa membombardir kode 2FA (1 juta kemungkinan, window ±30 detik) tanpa pembatas → 2FA bisa ditebak. Detail & saran perbaikan: `docs/decisions/2026-06-20-audit-findings.md:71-76`.
- **Email penonton dari body** (`resolveUserEmail`, `lib/session.ts:96-97,103`): identitas viewer di-assert dari klien tanpa sesi server → risiko IDOR (orang lain pakai email korban untuk buka episode / pakai koinnya). Detail: `docs/decisions/2026-06-20-audit-findings.md:99-104`. Rencana: diperketat saat akun viewer punya password + 2FA.

## 🙂 Untuk non-programmer (bahasa sehari-hari)
Berkas-berkas ini = "satpam pintu masuk" aplikasi DramaKu. **Penonton** cuma perlu menyebut email (kayak isi nama tamu di buku tamu — ringan, tanpa kunci). **Admin** harus pakai sandi, dan kalau mau ekstra aman bisa nyalakan **kode 6 angka** dari aplikasi seperti Google Authenticator — persis kayak login mobile banking BCA yang minta PIN lalu kode token yang berubah tiap 30 detik. Setelah admin lolos, sistem memberi semacam "gelang VIP bersegel" (cookie ber-tanda-tangan) yang dicek tiap kali admin melakukan sesuatu, jadi orang luar tak bisa memalsukannya. Catatan: pintu penonton masih longgar (cuma sebut email) dan loket sandi admin belum punya "antrian pembatas", jadi dua hal itu sudah dicatat sebagai PR perbaikan keamanan.
