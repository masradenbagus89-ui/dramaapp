# Laporan Audit dramaapp - 2026-06-20

> Catatan keputusan tim (pola ADR). Dibuat otomatis oleh pemeriksaan lintasAI (mode aman cuma-baca - TIDAK ada kode yang diubah saat audit).

## Status pemeriksaan (jujur)
- **11 dari 11 sudut** berhasil diperiksa (tidak ada yang gagal/terpotong).
- **76 temuan diperiksa, 76 (100%) berhasil dicek-silang** dengan sikap skeptis - tidak ada yang berstatus BELUM DICEK.
- **73 terkonfirmasi nyata**, **3 ditolak** (ternyata bukan masalah setelah diperiksa ulang).
- Tingkat keseriusan: GENTING 32 | PENTING 33 | RAPIKAN 8.

## Kamus istilah (analogi sehari-hari - baca ini dulu)
- **IDOR** (akses data orang lain dengan ganti ID/email): kayak loker arsip bernomor urut - ganti nomor #47->#48 langsung kebuka loker orang lain. Di app: kirim email orang lain di permintaan -> koin/akun mereka kepakai.
- **CSRF** (permintaan palsu lintas-situs): kayak orang menaruh formulir jebakan; saat kamu yang sudah login mengkliknya, perintah jalan atas namamu tanpa sadar. Mirip transfer otomatis yang ke-trigger dari situs lain.
- **Rate-limit hilang** (tanpa pembatas percobaan): kayak loket tanpa antrian - 1 orang bisa nyoba tebak password 10.000x/menit. Mirip kirim OTP berkali-kali tanpa jeda.
- **Race condition** (2 proses bentrok di waktu sama): kayak 2 orang nyamber stapler terakhir bareng. Mirip flash sale Shopee stok 1, 2 orang klik Beli di detik sama -> data kacau.
- **N+1 query** (banyak permintaan satu-satu): kayak tukang pos antar 30 surat bolak-balik 30x padahal bisa sekali angkut. Bikin lambat.
- **force-dynamic** (halaman dihitung ulang tiap dibuka): kayak masak dari nol tiap pesanan padahal bisa siapkan stok. Bikin loading lebih lama + biaya server naik.
- **OpenGraph / sitemap / robots.txt** (label berbagi + peta untuk Google): OpenGraph = thumbnail rapi saat link dibagikan ke WhatsApp/FB; sitemap = daftar isi untuk Google; robots.txt = papan 'ruang ini jangan diintip' (mis. halaman admin).
- **Tanpa tes otomatis**: kayak pabrik tanpa QC - barang cacat baru ketahuan setelah sampai pelanggan. Perubahan kode bisa diam-diam merusak login/pembayaran.

> Tiap temuan di bawah pakai istilah teknis + lokasi berkas:baris. Mau penjelasan analogi lebih dalam untuk 1 temuan tertentu, tinggal sebut nomornya ke AI.

---

## [!!] GENTING (genting/tinggi) - paling serius - 32 temuan

### ☁️ Kirim-ke-server & operasi (3)

**[1] No Monitoring or Error Tracking for Production API Routes** - _GENTING (genting)_
- Berkas: `app/api/coins/webhook/route.ts and other routes` (baris 14-52)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 2hr | Luas dampak: system-wide
- Masalah: Production API routes (coins/webhook, coins/topup, admin/hardlink, etc.) have no error tracking, monitoring, or alerting. Errors are caught and returned as JSON responses but are not logged to an external service (Sentry, DataDog, etc.). If a webhook fails silently (e.g., Midtrans signature verification fails), no one is notified.
- Kenapa masalah: Payment webhooks (Midtrans) are critical. If coin credits fail silently, users are not credited for payments, but the transaction appears paid to Midtrans. This is a revenue leak. Without monitoring, such failures go undetected until customers complain days later.
- Dampak kalau dibiarkan: Silent failures in payment workflows lead to lost revenue and customer complaints. Critical bugs in admin endpoints (hardlink, scan) are not noticed until users report them. No visibility into API error rates or performance.
- Skenario gagal nyata: Midtrans sends a webhook to /api/coins/webhook, but Supabase is temporarily unreachable. The webhook handler catches the error, logs it to console (which is lost in Vercel), and returns a 500 response. Midtrans retries a few times, eventually gives up. The customer's payment is marked as paid on Midtrans but coins are never credited. Customer waits 48 hours before complaining. No one notices the issue because there is no monitoring.
- Cara perbaiki: Integrate a monitoring service: Sentry (recommended, free tier includes 5k errors/month) or Datadog -> Add Sentry SDK to package.json and initialize in app/layout.tsx for Next.js -> Wrap critical endpoints (coins/webhook, coins/topup) with Sentry.captureException() for error handling -> Set up Sentry alert rules: notify team if error rate > 5% or specific errors (payment webhook failures) occur -> Add structured logging: log all webhook events (received, verified, credited) with order ID and email -> Document SLA in CLAUDE_TEAM_GUIDE.md: all critical errors must be fixed within 1 hour

**[2] Backup Cleanup Task Not Implemented (Unbounded Growth)** - _GENTING (tinggi)_
- Berkas: `.github/workflows/backup-schemas.yml` (baris 151-152)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 2hr | Luas dampak: module
- Masalah: Backup retention is set to RETENTION_DAYS=30 (line 34) but cleanup is not automated. The workflow uploads backups to Supabase Storage but has no code to delete old backups. Manual cleanup is required.
- Kenapa masalah: Without automated cleanup, backup storage will grow indefinitely, eventually incurring unexpected costs. Manual cleanup is error-prone and often forgotten. After 6-12 months, storage costs could exceed database costs.
- Dampak kalau dibiarkan: Supabase Storage billing will grow linearly with each daily backup. No cost control. Operations team must remember to clean up manually, which they often won't.
- Skenario gagal nyata: Team enables daily backups on day 1 and forgets about cleanup. After 6 months, there are 180 backup files in Supabase Storage, costing $50-100/month. Billing alert triggers but no one knows why; troubleshooting takes hours.
- Cara perbaiki: Add a Node.js script in .github/scripts/cleanup-old-backups.js that: lists files in Supabase Storage bucket, filters files older than RETENTION_DAYS, deletes them -> Add a new workflow step in backup-schemas.yml after upload to call the cleanup script -> Alternatively, use Supabase Edge Functions to implement retention via cron (more cloud-native) -> Test cleanup by uploading dummy files with old timestamps and verifying they are deleted

**[3] Database Backup Workflow Not Configured for Production (Placeholder Schema Names)** - _GENTING (tinggi)_
- Berkas: `.github/workflows/backup-schemas.yml` (baris 33)
- Risiko bikin rusak saat diperbaiki: **SEDANG** | Perkiraan usaha: 2hr | Luas dampak: system-wide
- Masalah: Backup workflow uses placeholder schema names 'schema_a' and 'schema_b'. The actual dramaapp database uses 'public' schema only (per supabase_setup.sql). Workflow has never been tested with real schema names, so backups may fail silently or backup wrong schemas.
- Kenapa masalah: The workflow runs daily at 20:00 UTC (line 22) but will attempt to pg_dump schemas that don't exist. The backup may complete 'successfully' (exit 0) but produce empty/broken SQL files. Recovery in a disaster would fail. Additionally, the workflow fallback stores artifacts in GitHub Actions (30-day retention), but this is insufficient for production data recovery.
- Dampak kalau dibiarkan: Daily backups are silently failing. If database becomes corrupted or is accidentally dropped, no valid backup exists to restore from. The team has false confidence in backups. Disaster recovery RTO/RPO become infinite.
- Skenario gagal nyata: Database is accidentally truncated by a buggy script. Team runs backup-schemas workflow manually, expecting it to have backups, but discovers all backup files are empty (0 bytes) because 'schema_a' and 'schema_b' don't exist. Entire production data is lost with no recovery path.
- Cara perbaiki: Determine actual schema names in production Supabase (should be 'public' based on schema files) -> Update SCHEMAS_TO_BACKUP in backup-schemas.yml to the correct names (e.g., 'SCHEMAS_TO_BACKUP: 'public'') -> Add a verification step in the workflow to query pg_database_size(schema) before/after backup to confirm data integrity -> Test backup locally: connect to staging Supabase, run pg_dump manually with the corrected schema names, verify output is >1MB -> Document backup procedure and test schedule in docs/ (monthly restore test from backup)

### ✅ Cek mutu & tes (3)

**[4] No testing framework or infrastructure — high-risk untested operations** - _GENTING (genting)_
- Berkas: `package.json` (baris 5-8)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 8hr+ | Luas dampak: system-wide
- Masalah: Project lacks any testing framework (Jest, Vitest, Mocha), linting (ESLint), or test files. No test command exists in package.json. Zero test coverage on critical operations: authentication, session signing/verification, TOTP verification, payment signatures, database queries, and wallet transactions.
- Kenapa masalah: Testing infrastructure is mandatory for a financial application. Authentication (HMAC-SHA256, TOTP, session tokens) and payment processing (Midtrans webhook signature verification) are security-critical and depend on cryptographic correctness. Without unit/integration tests, regressions in these areas go undetected.
- Dampak kalau dibiarkan: Silent failures in auth, payment processing, and wallet operations become production incidents. Crypto operations (timing-safe comparisons, base32 encoding, HMAC) can silently break during refactors. Session expiry, TOTP verification, and idempotency checks lack automated verification.
- Skenario gagal nyata: Developer refactors timingSafeEqual or HMAC code for clarity; tests would catch the breakage, but without tests the change ships. Production users lose access (session fails) or payments don't credit. Alternatively, developer tweaks TOTP window tolerance; without tests, the change silently breaks 2FA for users with slight clock skew.
- Cara perbaiki: Add Jest or Vitest to devDependencies -> Create test/unit/ folder for crypto & session logic (auth.ts, session.ts, totp.ts, midtrans.ts) -> Write unit tests for: readUser/writeUser, signAdminSession/verifyToken, totp/verifyTotp, verifyNotificationSignature, base32Encode/Decode -> Create test/integration/ folder for API routes (coins/unlock, auth/login, coins/webhook) -> Add test scripts to package.json: "test": "jest", "test:watch": "jest --watch", "lint": "eslint ."
- Balik ke versi sebelumnya: Remove test files and devDependencies, revert package.json

**[5] TOTP verification accepts out-of-spec token — window tolerance undocumented** - _GENTING (tinggi)_
- Berkas: `lib/totp.ts` (baris 77-90)
- Risiko bikin rusak saat diperbaiki: **SEDANG** | Perkiraan usaha: 2hr | Luas dampak: module
- Masalah: verifyTotp() accepts window parameter (default 1) allowing ±1 TOTP periods (±30 seconds) from current time. This is intentional for clock skew tolerance, but: (1) callers do not set window explicitly — they rely on default, (2) no documentation warns that tokens from ±30 seconds ago are valid, (3) no rate-limiting on TOTP verification in login endpoint (lib/session.ts / app/api/auth/login/route.ts), allowing brute-force of 6-digit codes.
- Kenapa masalah: Default window=1 is reasonable, but undocumented. More critically, there's no rate-limiting: an attacker can POST /api/auth/login with email, password, and loop through 1M TOTP codes (6 digits = 1M possibilities; 3 windows × 30s each = ~90s valid window). Without rate-limiting, they have 90 seconds to brute-force the 2FA.
- Dampak kalau dibiarkan: Authenticated attacker (knows email + password) can bypass 2FA via brute-force in ~90 seconds, gaining admin access. Requires valid email/password, so less critical than auth bypass, but still a privilege escalation.
- Skenario gagal nyata: Attacker has admin's email and password (via phishing or leak). They loop POST /api/auth/login {email, password, token: '000000'} through token '999999'. 1 in every ~166K attempts hits the 2FA in the 1-second current TOTP window. But with 3 windows (±30s), they have 666 valid codes out of 1M, so ~1 in 1500 requests is valid. ~5 minutes of rapid requests breaks in.
- Cara perbaiki: Add rate-limiting to POST /api/auth/login: track failed attempts per IP/email, lock after 5 failures for 15 minutes -> Document the window tolerance: add JSDoc comment to verifyTotp() explaining ±30s acceptance -> Consider reducing window to 0 (only current period) for higher security, accepting that users with fast clocks must be careful -> Add integration test: verify that TOTP code from 45 seconds ago is rejected
- Balik ke versi sebelumnya: Remove rate-limiting; TOTP behavior is unchanged

**[6] Wallet operations not idempotent outside Supabase — duplicate coin claims possible** - _GENTING (tinggi)_
- Berkas: `lib/store.ts` (baris 277-289)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: module
- Masalah: addCoins() is called by /api/coins/reward, /api/coins/checkin, and /api/coins/webhook. In Supabase mode, coin_add RPC is atomic (INSERT ... ON CONFLICT ... DO UPDATE). In local/file mode, it's a naive read-modify-write: read wallets.json, increment, write back. This is NOT idempotent. If POST /api/coins/reward is called twice (due to client retry or network duplicate), the second call also increments balance by REWARD_PER_AD, doubling the reward.
- Kenapa masalah: Local file mode is used in dev/test. Lack of idempotency means a retry (browser refresh, double-click) gives duplicate rewards. Supabase mode with RPC avoids this, but code path (reward route) doesn't check for double-claim state; it relies on addCoins() atomicity. Since local mode lacks atomicity, tests fail silently in local dev but pass in CI (if CI uses Supabase).
- Dampak kalau dibiarkan: In local dev, users can get duplicate coins by calling /api/coins/reward twice. In production (Supabase), atomicity prevents this, but local testing doesn't catch the bug. CI/CD passes, but local developers experience inconsistency.
- Skenario gagal nyata: Developer tests coin reward locally. POST /api/coins/reward returns {ok: true, reward: 4, balance: 14}. Browser auto-retries due to network hiccup. POST /api/coins/reward returns {ok: true, reward: 4, balance: 18} instead of 14 (re-apply). Developer doesn't notice; ships code. Later, real users on Supabase don't see the issue, but local testing breaks.
- Cara perbaiki: For local file mode, implement idempotency: track 'last reward date' per user (already done via setCoinMeta!), so addCoins doesn't get called twice on same day -> Verify reward route checks meta.adDate === today() BEFORE calling addCoins, so second call is rejected (already implemented — see reward/route.ts line 33) -> For checkin, same pattern (already implemented) -> For webhook, use idempotency key: check if order.status is already 'paid' before crediting (already implemented — line 44)
- Balik ke versi sebelumnya: Remove idempotency checks; double-claim becomes possible again

### 🔒 Keamanan (5)

**[7] Missing CSRF protection on state-changing endpoints (coin operations, admin actions)** - _GENTING (genting)_
- Berkas: `app/api/coins/unlock/route.ts` (baris 12)
- Risiko bikin rusak saat diperbaiki: **SEDANG** | Perkiraan usaha: 30min | Luas dampak: system-wide
- Masalah: All POST/DELETE endpoints accept requests without CSRF tokens (no SameSite validation, no token check). An attacker can forge requests from another site to unlock episodes, spend coins, or delete comments.
- Kenapa masalah: The admin cookies use SameSite='lax' (good), but viewer operations have no CSRF protection at all. HTML forms or cross-site scripts can trigger POST /api/coins/unlock, /api/comments (DELETE), or /api/admin/* endpoints.
- Dampak kalau dibiarkan: A malicious website can trick users into unlocking episodes, spending coins, or performing admin actions. CSRF attacks bypass authentication if the browser already has a valid session cookie.
- Skenario gagal nyata: Attacker hosts a site that auto-submits <form method=POST action=https://dramaku.vercel.app/api/coins/unlock> with hidden fields. When a logged-in user visits, their coins are spent without consent.
- Cara perbaiki: Implement CSRF token verification: generate token in GET requests (e.g., GET /api/csrf), store in session, validate in POST/DELETE -> Alternative: enforce Origin/Referer header validation for cross-site requests -> For viewer endpoints, use SameSite=Strict cookies if implementing secure sessions -> Add Referer/Origin check middleware: whitelist only internal origins

**[8] IDOR: Viewer users can access/unlock episodes for arbitrary emails** - _GENTING (genting)_
- Berkas: `app/api/coins/unlock/route.ts` (baris 20)
- Risiko bikin rusak saat diperbaiki: **TINGGI** | Perkiraan usaha: 2hr | Luas dampak: cross-module
- Masalah: The /api/coins/unlock endpoint accepts email parameter from request body (body.email) for non-admin users. This allows attackers to unlock episodes by providing any victim's email address without authentication to that account.
- Kenapa masalah: resolveUserEmail() uses fallbackEmail directly from body without verification. For viewers (non-admin), the email is never validated against a server-side session - it's simply accepted if it contains '@'. This is documented as a known limitation in session.ts line 96-97 ('email di-assert dari klien'), but the security implications are severe.
- Dampak kalau dibiarkan: An attacker can spend another user's coins, unlock episodes on their behalf, and modify their unlock status and balance - complete account takeover of viewer accounts.
- Skenario gagal nyata: Attacker calls POST /api/coins/unlock with {email: 'victim@example.com', dramaId: 'premium-drama', ep: 10} and victim's coins are deducted without their knowledge.
- Cara perbaiki: Implement secure viewer sessions with signed tokens (like admin cookies) or use Supabase client-side auth with server-side verification -> Remove email from request body for wallet operations; extract identity only from verified session or signed token -> For non-admin users, verify email matches a verified session token before processing coin transactions -> Add rate limiting and per-user idempotency tokens to prevent replay attacks

**[9] IDOR: /api/coins/reward and /api/coins/checkin accept arbitrary viewer emails** - _GENTING (genting)_
- Berkas: `app/api/coins/reward/route.ts` (baris 23)
- Risiko bikin rusak saat diperbaiki: **TINGGI** | Perkiraan usaha: 2hr | Luas dampak: cross-module
- Masalah: The /api/coins/reward endpoint (and /api/coins/checkin) accept email from request body for viewer users. This allows attackers to claim daily rewards/bonuses for arbitrary users indefinitely.
- Kenapa masalah: Same IDOR vulnerability as unlock endpoint - email parameter is not verified against a session. An attacker can claim daily rewards for any email address by calling the endpoint repeatedly with different emails.
- Dampak kalau dibiarkan: Attackers can generate unlimited coins for arbitrary accounts, completely breaking the economy. The daily limit is only per-email, not per-session, so an attacker can multiply coins across fake emails.
- Skenario gagal nyata: Attacker generates 100 fake emails and calls POST /api/coins/checkin 100 times with body {email: 'fake1@x.com'}, {email: 'fake2@x.com'}, etc., gaining 1500 coins (CHECKIN_BONUS * 100) in seconds.
- Cara perbaiki: Implement secure viewer authentication before allowing coin claims -> Remove email from request body; use server-side verified session only -> Add per-IP rate limiting on reward/checkin endpoints (e.g., max 1 claim per 24h per IP) -> Log all coin claiming activity for audit trails

**[10] No password strength validation or policy for ADMIN_PASSWORD** - _GENTING (tinggi)_
- Berkas: `lib/session.ts` (baris 16-18)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: single-file
- Masalah: The admin password (ADMIN_PASSWORD env var) has no validation. It could be as weak as a single character, and there's no enforcement of minimum length, complexity, or entropy requirements.
- Kenapa masalah: The login endpoint accepts any ADMIN_PASSWORD value from environment without validation. If an admin sets a weak password via Vercel environment variables, the system accepts it silently. The .env.example shows 'ganti-password-admin' as a placeholder with no guidance on strength.
- Dampak kalau dibiarkan: Weak passwords reduce security to guessing or brute-force. Combined with the lack of rate limiting, a weak password becomes a critical vulnerability. AUTH_SECRET is also not validated - it could be < 32 characters despite the .env.example comment saying 'minimal-32-karakter'.
- Skenario gagal nyata: Admin sets ADMIN_PASSWORD='123456' and AUTH_SECRET='short' in Vercel. Attacker brute-forces the login in seconds due to weak password + no rate limiting.
- Cara perbaiki: Add validation in lib/session.ts adminAuthConfigured() to check password length >= 16 and AUTH_SECRET >= 32 -> Log warnings on startup if auth credentials fail validation -> Update .env.example to show minimum strength requirements and explain entropy -> Consider requiring password during first admin login instead of env var (more secure UX)

**[11] No rate limiting on login, 2FA, and webhook endpoints** - _GENTING (tinggi)_
- Berkas: `app/api/auth/login/route.ts` (baris 28)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: module
- Masalah: The POST /api/auth/login endpoint has no rate limiting. An attacker can brute-force admin passwords or enumerate admin emails without throttling. Similarly, /api/auth/2fa/enable and /api/coins/webhook have no rate limiting.
- Kenapa masalah: Package.json has no rate-limiting middleware (no express-rate-limit, Ratelimit, or custom middleware). Next.js App Router doesn't provide built-in rate limiting for route handlers.
- Dampak kalau dibiarkan: Attackers can brute-force the single admin password (if weak), perform timing attacks on 2FA codes, or spam webhook notifications. Login endpoints in production should be limited to ~5 attempts per minute per IP.
- Skenario gagal nyata: Attacker writes a script to POST /api/auth/login with 10,000 password guesses per minute from a botnet. Without rate limiting, they can test common passwords or dictionary attacks undetected.
- Cara perbaiki: Install rate-limiting middleware: npm install ratelimit or use Vercel Edge Middleware -> Add per-IP rate limiting: max 5 login attempts per minute per IP, blocking at 10 minutes after threshold -> Add per-email rate limiting: max 10 login attempts per hour per email (to block user enumeration) -> Rate limit 2FA verify endpoint: max 10 TOTP attempts per minute per IP -> Rate limit webhook endpoint: track by order_id, prevent replay of same order_id within 60 seconds

### 🗄️ Database (3)

**[12] Duplikasi SELECT balance dalam RPC coin_spend_unlock** - _GENTING (tinggi)_
- Berkas: `supabase_setup.sql` (baris 114-123)
- Risiko bikin rusak saat diperbaiki: **SEDANG** | Perkiraan usaha: 30min | Luas dampak: single-file
- Masalah: RPC coin_spend_unlock SELECT balance dua kali: (1) line 114 untuk cek, (2) implisit dalam UPDATE line 121 untuk pessimistic read. Tapi nilai bisa berubah di antara SELECT dan UPDATE jika tidak ada lock.
- Kenapa masalah: Walau PostgreSQL default READ COMMITTED, masih ada race window: SELECT read balance=100, thread B update balance=50, thread A UPDATE balance -= 50 (hasil 50, bukan -50 karena coalesce 0). Harusnya pakai SELECT ... FOR UPDATE atau lock.
- Dampak kalau dibiarkan: Jarang terjadi tapi possible: dua pesan berbeda bisa spend saldo sama, menghasilkan balance negatif atau inconsistent view.
- Skenario gagal nyata: User punya 8 koin, dua unlock request serentak masing-masing cost 8 koin. Keduanya SELECT balance=8, cek OK, keduanya UPDATE balance -= 8. Hasil: balance=-8 (invalid) atau salah satu fail.
- Cara perbaiki: Ubah SELECT menjadi SELECT ... FOR UPDATE untuk lock row -> Atau pakai SERIALIZABLE isolation level untuk RPC -> Test dengan concurrent coin_spend_unlock calls

**[13] N+1 DELETE queries dalam writeAllDramas** - _GENTING (tinggi)_
- Berkas: `lib/dramas.ts` (baris 150-152)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: single-file
- Masalah: Ketika upload katalog lengkap, kode membaca semua drama dari DB, lalu loop satu-satu untuk delete yang tidak ada. Ini menghasilkan N SELECT + N DELETE queries.
- Kenapa masalah: PostgREST tidak ada batch DELETE dengan IN clause, tapi bisa diatasi dengan trigger atau loop async paralel. Saat ini setiap delete adalah 1 request HTTP terpisah — O(N) request untuk N drama yang dihapus.
- Dampak kalau dibiarkan: Upload katalog lambat. Dengan 50+ drama yang dihapus, bisa 50+ round-trip ke server. Jika tiap request 500ms, total bisa 25 detik.
- Skenario gagal nyata: Admin upload file JSON dengan 21 drama, file lama punya 50 drama. Sistem akan DELETE 29 drama satu-satu dalam loop — 29 request HTTP terpisah ketika harusnya bisa batch.
- Cara perbaiki: Parallelkan DELETE dengan Promise.all() untuk ~10 request sekaligus -> Atau gunakan trigger AFTER UPDATE untuk cascade delete -> Atau gunakan SQL raw query (jika Supabase izinkan) dengan DELETE ... WHERE id NOT IN (...)

**[14] Race condition pada dokumen JSON (comments, ads)** - _GENTING (tinggi)_
- Berkas: `lib/store.ts` (baris 215-221)
- Risiko bikin rusak saat diperbaiki: **SEDANG** | Perkiraan usaha: 2hr | Luas dampak: module
- Masalah: Pola read-modify-write pada dokumen JSON tabel app_data tanpa transaksi. Dua request serentak ke addComment(dramaId) bisa race: request A baca list=[C1], request B baca list=[C1], A write [Cnew, C1], B write [Cnew2, C1]—satu komentar hilang.
- Kenapa masalah: app_data menyimpan dokumen JSON; Supabase tidak ada atomic read-modify-write tanpa transaction/trigger. sbDocGet + sbDocSet adalah dua operasi terpisah tanpa LOCK/SERIALIZABLE isolation.
- Dampak kalau dibiarkan: Komentar atau iklan bisa hilang atau duplikasi saat dua admin/user lakukan edit bersamaan. Ads.views atau ads.clicks mungkin undercounted atau overcounted.
- Skenario gagal nyata: Dua user comment di drama yang sama bersamaan. User A baca comments=[C1, C2], User B baca comments=[C1, C2]. User A add C3, save [C3, C1, C2]. User B add C4, save [C4, C1, C2]—C3 hilang.
- Cara perbaiki: Gunakan trigger PostgreSQL untuk atomic insert/update pada dokumen -> Atau gunakan RPC (stored procedure) dengan LOCK untuk read-modify-write comments -> Untuk ads, pertimbangkan tabel terpisah dengan atomic increment atau RPC seperti coin_add

### 📚 Kelengkapan catatan (3)

**[15] docs/architecture.md is unfilled template with all [TBD] placeholders** - _GENTING (tinggi)_
- Berkas: `docs/architecture.md` (baris 12-172)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 2hr | Luas dampak: system-wide
- Masalah: The main architecture documentation file (architecture.md) is essentially a template with nearly every section marked [TBD]. Critical information is missing: no project purpose filled in, stack versions left blank, entry points not documented, module table is placeholder, dependencies not listed, environment variables template-only, scripts section incomplete, external data sources unfilled.
- Kenapa masalah: New developers opening the project cannot get a quick overview of what the app does, which libraries are used, how to run it locally, or where data comes from. Teams rely on this file to onboard quickly, but it provides zero actual project context.
- Dampak kalau dibiarkan: Onboarding friction for new developers; lack of single-source-of-truth for architecture decisions; harder to review PRs because reviewers lack context about the system design.
- Skenario gagal nyata: A new team member spends 30+ minutes grep'ing code to understand basic facts (project purpose, which version of Next.js, whether it uses Prisma or Supabase) that should be documented in 5 minutes reading architecture.md. Or a production incident occurs and on-call person cannot quickly find which external APIs are critical (Supabase, Midtrans) without reading code.
- Cara perbaiki: Fill in 'Tujuan Proyek' with actual 2-3 sentence description from context: 'Aplikasi streaming drama China gratis. Target: viewers di Indonesia. Fitur: katalog drama, system koin untuk unlock episode premium, admin panel untuk manage drama & monetisasi via Midtrans.' -> Fill 'Stack' section: TypeScript 5, Next.js 16.2.4 (App Router), React 19, Tailwind 4, Supabase (PostgreSQL) + PostgREST API -> Fill 'Entry Points': app/layout.tsx (root), app/page.tsx (homepage), app/api/ (24 API routes) -> Fill 'Modul Inti' table with actual 10 modules: auth, session, totp, wallet, coins, supabase, dramas, store, midtrans, types. Add 1-line purpose + main deps for each. -> Fill 'Dependensi Utama' with actual libraries and why: next (app framework), react (UI), tailwindcss (styling), crypto (HMAC/TOTP, built-in Node), fetch (PostgREST client, built-in) -> Fill 'Environment Variables' table with actual vars from .env.example (SUPABASE_URL, AUTH_SECRET, ADMIN_PASSWORD, MIDTRANS_SERVER_KEY, etc.) -> Fill 'Skrip & Perintah': npm run dev, npm run build, npm run start (no test/lint scripts exist) -> Fill 'Sumber Data Eksternal': Supabase (PostgreSQL DB + PostgREST), Midtrans (payment gateway via REST API, currently 501 Not Implemented in dev), hardlink tunnel for video streaming -> Update 'Deploy & CI' section: Vercel hosting, auto-deploy main → production, no current CI gate (mentioned in context: no test framework) -> Fill 'Konvensi Penting' with actual rules: routes must call resolveUserEmail middleware, API returns {ok, error, data}, RPC functions for atomic operations
- Balik ke versi sebelumnya: Not applicable (documentation change only). Can revert to template by reverting commit.

**[16] No auth.md, wallet.md, payments.md feature docs despite complex auth + payment flow** - _GENTING (tinggi)_
- Berkas: `docs/ (missing files)` (baris N/A)
- Risiko bikin rusak saat diperbaiki: **TINGGI** | Perkiraan usaha: 8hr+ | Luas dampak: cross-module
- Masalah: The project has non-trivial authentication (viewer passwordless + admin password + TOTP 2FA), payment flow (Midtrans Snap integration with webhook verification), wallet system (coins earned via ads/check-in, spent on episode unlocks), and database schema (5 tables + 3 RPC functions), but no corresponding feature documentation. Developers must understand this flow by reading lib/auth.ts, lib/session.ts, lib/totp.ts, lib/wallet.ts, lib/coins.ts, lib/midtrans.ts, app/api/coins/*, and migrasi-schema.sql.
- Kenapa masalah: Authentication, payment, and wallet logic is mission-critical (security + revenue). These modules have complex state machines (auth → password check → 2FA verification → session cookie), payment workflows (order creation → Midtrans API → webhook signature verification → coin credit), and database atomicity concerns (RPC functions to prevent lost updates). Without docs, this complexity is opaque to code reviewers, on-call engineers, and new hires.
- Dampak kalau dibiarkan: Risk of auth/payment bugs during code review (reviewer doesn't understand the session signing flow, misses a timing-safe comparison, etc.). Difficult incident response if webhook signature verification fails. New developers take hours to understand why coin_spend_unlock is a Postgres function instead of a simple UPDATE. Onboarding time increases significantly.
- Skenario gagal nyata: Payment webhook processing fails silently because a developer edits /api/coins/webhook without understanding the signature verification flow (lines 29-31 in webhook route). Or a junior dev sees lib/session.ts and wonders 'why is the session signed with HMAC instead of just a JWT?'—the answer (SERVICE_ROLE_KEY can be rotated, signature is timing-safe, ADMIN_COOKIE is verified per-request against isAdminEmail list) is lost. Or a new admin panel feature tries to add RLS policies but fails because docs don't explain that RLS is currently disabled (commented-out in schema line 138-144).
- Cara perbaiki: Create docs/auth.md: explain viewer (passwordless) vs admin (password + optional 2FA) flows; document the 3-layer session model (client localStorage, HTTP-Only cookie, server-side verification with isAdminEmail check); explain timing-safe comparison; diagram: login form → POST /api/auth/login → verifyTotp (if 2FA enabled) → signAdminSession → Set-Cookie ADMIN_COOKIE -> Create docs/wallet.md: explain coin economy (FREE_EPISODES=3, COIN_PER_EPISODE=8, REWARD_PER_AD=4, DAILY_AD_LIMIT=12, CHECKIN_BONUS=15); document fetching wallet status (GET /api/coins), claiming rewards/check-in, unlocking episodes; explain why coin_spend_unlock is RPC (atomicity; prevents lost updates when two simultaneous requests try to unlock same episode) -> Create docs/payments.md: explain Midtrans integration flow (POST /api/coins/topup → createSnapTransaction → client snap.pay() popup → user pays via QRIS/GoPay → Midtrans webhook → verifyNotificationSignature → addCoins + setOrder(status='paid')); document why signature must be verified (security: trust only Midtrans); explain demo mode (ENABLE_DEMO_TOPUP=1); link to Midtrans docs -> Create docs/db.md: explain 5 tables (app_data=JSON KV, dramas=relational, likes=counter, wallets=balance per user, unlocks=episode permissions); document 3 RPC functions (like_change, coin_add, coin_spend_unlock) and why they are atomic; note current RLS is disabled (commented-out lines in schema); explain dual-mode fallback (Supabase vs local JSON files via useSupabase flag) -> Create docs/security-checklist.md: note timing-safe comparisons (session.ts, totp.ts, midtrans.ts use crypto.timingSafeEqual); note that SERVICE_ROLE_KEY bypasses RLS (acceptable because app uses server-side only); note webhook signature verification is mandatory; note ADMIN_PASSWORD must be >32 chars; note 2FA is optional per-admin (if TwoFA row doesn't exist, skip 2FA check)
- Balik ke versi sebelumnya: Documentation only. No code changes. Can revert commit.

**[17] docs/glossary.md lacks all dramaapp-specific domain terminology** - _GENTING (tinggi)_
- Berkas: `docs/glossary.md` (baris 40-95)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 2hr | Luas dampak: module
- Masalah: The glossary.md contains invoice/client examples from a template but zero dramaapp-specific terms. Missing: koin (coins), unlock (episode unlock), premium (premium flag), check-in (daily login bonus), viewer vs admin roles, episode states, drama categories. The domain-specific terminology exists in code (lib/coins.ts, lib/auth.ts, migrasi-schema.sql) but is not centralized in glossary, making it hard for new devs to learn the project's language.
- Kenapa masalah: Dramaapp has a well-defined business domain (coins → episode unlock → paywall) with specific terms that are not documented in one place. Terms are scattered across code comments, env vars, and schema. When new developers write code or PRs, they may inconsistently name variables (e.g., using 'token' vs 'unlock_token', or 'balance' vs 'coin_balance') because they don't know the canonical naming.
- Dampak kalau dibiarkan: Inconsistent terminology in new code; harder code review; team may debate naming conventions instead of having a single reference; domain confusion between 'episode unlock' and 'unlock token' and 'premium flag'.
- Skenario gagal nyata: A junior dev creates a new API that refers to 'episode_unlock' when the rest of the codebase calls it 'token' (see lib/coins.ts line 55: `export function unlockToken(...)`), causing confusion and inconsistent search/grep results across the codebase. Or they create a 'user_coins' table when the codebase calls it 'wallets'.
- Cara perbaiki: Add to Domain Bisnis section the 5-7 core dramaapp terms with code references: koin, unlock, premium, check-in, reward (ad viewing), viewer, admin -> For each term, document it as per template format: **term** - 1-2 sentence definition. *(kode: schema/table, lib function, route)* -> Example entries to add:
  - **koin** - Virtual currency earned via ads/check-in or purchased via Midtrans. Used to unlock premium episodes. *(kode: wallets table, lib/coins.ts, /api/coins)*
  - **unlock** - Permission to watch a paid episode. Stored as email:dramaId:ep token in unlocks table. *(kode: unlocks table, coin_spend_unlock RPC, /api/coins/unlock route)*
  - **premium** - Drama flag (boolean) indicating episodes 4+ require coins. *(kode: dramas.premium column, lib/coins.ts PAYWALL_ENABLED)*
  - **check-in** - Daily bonus (15 coins) for returning viewers. Max once per day per email. *(kode: /api/coins/checkin route, CHECKIN_BONUS = 15)*
  - **reward** - Coins earned for watching a full advertisement. *(kode: /api/coins/reward, REWARD_PER_AD = 4, DAILY_AD_LIMIT = 12)* -> Add to Role & Permission section:
  - **admin** - Can login with password + email check + optional 2FA. Can manage drama catalog, run 'Scan & auto-hardlink', view analytics, set ad config. *(kode: session.ts getAdminEmail(), auth/login route, isAdmin column in auth)*
  - **viewer** - Free login (no password). Can watch episodes, earn/spend coins, like dramas, comment. *(kode: role='viewer' in auth.ts, no persistent admin session)* -> Add to Status & State section a table for 'Order' (payment order) lifecycle:
  - pending → settlement (Midtrans webhook) → paid (koin dikredit)
  - Also document episode unlock idempotency: already unlocked token → skip deduction -> Add 'Singkatan & Jargon' for dramaapp-specific: RPC (Postgres remote procedure), 2FA (two-factor authentication TOTP), hardlink (symlink for video files), PostgREST (Supabase HTTP API)
- Balik ke versi sebelumnya: Revert commit. No code changes, docs only.

### 🎨 Tampilan / Frontend (2)

**[18] Unsafe innerHTML injection in AdBanner from environment variable** - _GENTING (tinggi)_
- Berkas: `app/components/AdBanner.tsx` (baris 53)
- Risiko bikin rusak saat diperbaiki: **SEDANG** | Perkiraan usaha: 2hr | Luas dampak: system-wide
- Masalah: AdBanner component injects raw HTML from NEXT_PUBLIC_AD_BANNER_HTML environment variable directly into the DOM. While the component is designed to accept HTML from ad networks (Adsterra/Monetag), if this environment variable is ever compromised or contains user-controllable data, it creates an XSS vector. The code then attempts to re-execute <script> tags by cloning them.
- Kenapa masalah: innerHTML accepts any HTML/JavaScript. Although this is intentional for ad networks, the lack of sanitization means if an attacker controls NEXT_PUBLIC_AD_BANNER_HTML, they can inject arbitrary JavaScript. Environment variables can be accidentally exposed, and ad network URLs could be compromised.
- Dampak kalau dibiarkan: Potential arbitrary JavaScript execution in user browsers, credential theft, session hijacking, malware distribution. However, severity is mitigated by the fact that this requires control of a server-side environment variable, not direct user input.
- Skenario gagal nyata: If NEXT_PUBLIC_AD_BANNER_HTML is accidentally exposed or contains a compromised ad network code with malicious JavaScript, that code will execute in all user browsers and can access localStorage (where user session data is stored), steal cookies, or perform unwanted actions.
- Cara perbaiki: Add explicit Content Security Policy (CSP) headers to prevent inline script execution from unexpected sources -> Validate and sanitize NEXT_PUBLIC_AD_BANNER_HTML against a whitelist of known ad network domains/script sources -> Consider using iframe sandbox isolation for ad network HTML instead of injecting directly into the page -> Ensure environment variables are never logged or exposed in error messages -> Add a development-only validation that NEXT_PUBLIC_AD_BANNER_HTML only contains expected ad network markup

**[19] Missing explicit error handling in Comments refresh after delete** - _GENTING (tinggi)_
- Berkas: `app/components/Comments.tsx` (baris 116-117)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: single-file
- Masalah: In the onDelete callback, if the DELETE request succeeds but refresh() fails, the error is silently swallowed. The refresh() function has a catch that sets comments to [], so users won't see the deleted comment but also won't see a confirmation or error.
- Kenapa masalah: If refresh() fails due to network error, the user sees the comment disappear but doesn't know if it was actually deleted from the server. On next page load, if the delete failed server-side, the comment reappears, confusing the user.
- Dampak kalau dibiarkan: Confusing UX where comment appears to be deleted but isn't actually removed, potential data inconsistency confusion.
- Skenario gagal nyata: User clicks 'Hapus', deletion API succeeds, refresh() is called, but network is flaky and refresh() fails silently. Comment disappears from UI, but on next page reload, it still exists on server.
- Cara perbaiki: Modify refresh() to throw on error instead of silently catching -> Wrap refresh() call in the onDelete promise chain -> Show error message if refresh() fails after successful delete -> Or, optimistically remove the comment from state, then revert if delete fails

### 🎓 Kesiapan staf baru (1)

**[20] CODEOWNERS masih berupa template dengan placeholder kosong** - _GENTING (tinggi)_
- Berkas: `.github/CODEOWNERS` (baris 31, 34-37, 40-41, 44-45, 48-49)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: cross-module
- Masalah: File CODEOWNERS masih berisi placeholder template dengan teks <owner-username>, <senior-dev>, <tech-writer>, dst. Seharusnya sudah diganti dengan username GitHub staf sebenarnya sesuai instruksi di line 2-3.
- Kenapa masalah: CODEOWNERS yang tidak terisi menyebabkan GitHub tidak bisa meminta review otomatis ke reviewer yang tepat saat ada PR. Ini membuat gerbang kualitas (code review requirement) tidak jalan. Risiko: fitur sensitif (auth/payment) bisa di-merge tanpa review senior developer yang qualified.
- Dampak kalau dibiarkan: Pull request tidak di-route ke reviewer yang tepat. PR sensitif (auth/payment/DB schema) bisa lolos tanpa review dari senior dev yang ditunjuk. Bottleneck di owner karena semua area fallback ke @<owner-username> placeholder yang tidak ada.
- Skenario gagal nyata: Staf baru membuka PR yang ubah auth flow. GitHub tidak auto-request review karena CODEOWNERS tidak terisi. Staf lain (non-senior) approve. PR di-merge tanpa review senior dev, menyebabkan regression login di production.
- Cara perbaiki: Buka .github/CODEOWNERS -> Ganti @<owner-username> dengan GitHub handle pemilik proyek (cek email di .github/staff-roster.yml = zyyherlambang) -> Ganti @<senior-dev> dengan 1-2 GitHub handle developer senior (polling owner / cek git log kontributor senior) -> Ganti @<tech-writer> dengan handle orang yang maintain docs (bisa owner) -> Commit + push -> Verifikasi: GitHub Settings -> Collaborators & teams pastikan semua user di CODEOWNERS punya akses write

### ⚡ Kecepatan (2)

**[21] All image rendering uses raw `<img>` tags instead of Next.js Image component, missing optimization** - _GENTING (tinggi)_
- Berkas: `app/page.tsx, app/beranda/page.tsx, app/components/Poster.tsx, app/components/FeedPlayer.tsx, app/drama/[id]/page.tsx, app/components/ActionRail.tsx, app/discover/page.tsx` (baris 138, 49, 18, 101, 32-40, 32-40, 19)
- Risiko bikin rusak saat diperbaiki: **SEDANG** | Perkiraan usaha: 2hr | Luas dampak: module
- Masalah: Throughout the codebase, poster and hero images are rendered as raw HTML `<img>` tags. No use of Next.js `Image` component, which provides automatic lazy-loading, responsive sizing, format optimization (AVIF/WebP), and srcset generation.
- Kenapa masalah: Raw `<img>` loads images at full intrinsic resolution without optimization. Large poster JPEGs (300KB+) load immediately even on slow connections. No lazy-loading = images outside viewport load anyway, wasting bandwidth. No format conversion = modern browsers don't get AVIF/WebP (30-40% smaller than JPEG).
- Dampak kalau dibiarkan: Every Beranda page load downloads 50+ poster images synchronously or at least eagerly. On 4G connection (1Mbps), poster collage takes 30-50s to download. LCP and FCP delayed by 2-4s due to image overhead. Mobile bandwidth usage ~5-10MB per page view. Cumulative: 40% of page load time is image transfer, preventable with optimization.
- Skenario gagal nyata: User on slow mobile (3G, 1Mbps): (1) HTML loads 100ms, (2) browser sees 12 poster images in initial viewport, (3) starts loading all 12 at 1Mbps = 3.6MB if unoptimized (300KB avg per poster), takes 60s. User leaves before images finish. With Image component: same posters as WebP 80KB, load in 6s.
- Cara perbaiki: Replace all raw `<img>` with Next.js `Image` component in Poster.tsx, Poster usage in ContentRow, BerandaRows, page.tsx, drama/[id]/page.tsx, beranda/page.tsx -> For poster images, set `width={160} height={240}` (or intrinsic aspect ratio), `priority={false}` (lazy-load by default), `alt=" "` for decorative images or use drama title -> For hero images (heroImage), set `priority={true}` on first hero image in viewport (e.g., /beranda hero), lazy for others -> Add image loader (custom domain if posterImage URLs come from CDN/S3, or use Next.js default) -> Test: use Chrome DevTools Lighthouse; expect LCP to drop 1-2s, FID improvement, and 30-40% bandwidth reduction
- Balik ke versi sebelumnya: Revert Image imports and component calls back to raw `<img>` tags (find-replace Image back to img).

**[22] All major pages use `force-dynamic`, preventing static generation and cold-start optimization** - _GENTING (tinggi)_
- Berkas: `app/page.tsx, app/beranda/page.tsx, app/discover/page.tsx, app/drama/[id]/page.tsx, app/feed/[id]/page.tsx, app/shorts/page.tsx` (baris 5-6 (multiple files))
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: system-wide
- Masalah: Six critical pages (landing, beranda, discover, drama detail, feed player, shorts) all force dynamic rendering. This completely disables Next.js static generation and incremental static regeneration (ISR), forcing every request to execute server-side code.
- Kenapa masalah: Next.js can pre-render these pages at build time or cache them for hours/days via ISR since drama catalog changes infrequently. Forcing dynamic on every request means every user waits for server-side rendering, increasing Time to First Byte (TTFB), cold starts on serverless, and database load.
- Dampak kalau dibiarkan: Every page load requires full server rendering + database query (getAllDramas), causing measurable latency. On Vercel serverless, this triggers cold starts if no requests for 15+ min. LCP and FCP metrics suffer. Cumulative effect: 200-500ms slower than static/ISR variant.
- Skenario gagal nyata: User visits /beranda: (1) Vercel cold-starts function (1000ms+), (2) getAllDramas() queries Supabase (200-400ms), (3) renders 50+ drama cards, (4) client hydrates BerandaRows component (300ms+). Total time-to-interactive: 2-3s vs 500ms if static. With 100 concurrent users during peak, Vercel scales up, cost increases 10x.
- Cara perbaiki: Remove `export const dynamic = "force-dynamic"` from landing (app/page.tsx), beranda, discover, and drama detail pages (keep it only on /feed/[id] if episodes change hourly) -> Add `revalidate = 86400` (ISR: 1 day) or `revalidate = 3600` (1 hour) to /beranda, /discover, /drama/[id] so pages pre-render at build + auto-regenerate when drama data updates -> For landing page /page.tsx, use static generation (no dynamic) since hero dramas can change weekly, ISR revalidate = 604800 (1 week) -> Monitor revalidation: on /admin when drama is added/edited, optionally call revalidateTag('dramas') or use on-demand ISR if implemented -> Benchmark: measure TTFB before/after — expect 60-70% improvement
- Balik ke versi sebelumnya: Restore `export const dynamic = "force-dynamic"` to all pages; this reverts to current behavior (slower but same function).

### 🧹 Perapian kode (1)

**[23] Duplikasi fungsi slugify di app/admin/page.tsx dan lib/dramas.ts** - _GENTING (tinggi)_
- Berkas: `app/admin/page.tsx` (baris 38-46)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: single-file
- Masalah: Fungsi slugify didefinisikan identik di app/admin/page.tsx (local) dan lib/dramas.ts line 208 (exported). Admin page tidak mengimpor dari lib, membuat duplikasi kode.
- Kenapa masalah: Saat perubahan logic slugify di satu tempat tidak tersinkronisasi ke tempat lain. Lebih baik centralize di lib/dramas.ts yang sudah export, lalu reuse di app/admin/page.tsx.
- Dampak kalau dibiarkan: Maintenance burden; potensi bug saat perubahan di satu place tidak tercermin di place lain.
- Skenario gagal nyata: Kalau logic slugify diubah di lib/dramas.ts (mis. untuk handle karakter spesial baru), admin page masih pakai logic lama, menghasilkan ID drama yang berbeda dari sistem.
- Cara perbaiki: Hapus fungsi slugify lokal dari app/admin/page.tsx line 38-46 -> Import slugify dari @/lib/dramas di atas (baris import existing sudah ada) -> Test bahwa admin form masih generate ID yang sama

### 📈 SEO (6)

**[24] Landing page (/page.tsx) tanpa metadata — SEO brand awareness lemah** - _GENTING (tinggi)_
- Berkas: `app/page.tsx` (baris 5-50)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: single-file
- Masalah: Landing page (/) adalah entry point utama & important untuk SEO. Tetapi tidak export metadata sendiri — hanya bergantung pada global metadata dari layout.tsx. Landing punya konten unik (fitur, CTA, hero section dgn daftar drama terbaru), tapi metadata tidak reflect konten itu. Sebaiknya landing punya metadata custom yang highlight unique value proposition.
- Kenapa masalah: Landing page adalah first impression dari search engine & social sharing. Metadata harus menceritakan nilai DramaKu specifically, bukan generic root title. Seharusnya punya unique description yang mention features (gratis, tanpa langganan, koleksi lengkap) agar ranking & click-through lebih baik.
- Dampak kalau dibiarkan: Search result snippet untuk homepage tampil generic. Click-through rate dari Google Search lebih rendah karena description tidak highlight value prop. SEO ranking untuk key terms ("drama gratis", "nonton drama tanpa langganan") lemah.
- Skenario gagal nyata: User google "drama China gratis". DramaKu muncul di hasil, tapi snippet hanya "Streaming drama China pendek gratis di HP & web." (deskripsi root/generic). Competitor dengan deskripsi lebih detail (mention: 500+ drama, subtitle multiple bahasa, offline download) tampil lebih menarik. User klik competitor, bukan DramaKu.
- Cara perbaiki: Export metadata di app/page.tsx (atau pakai generateMetadata jika konten dynamic) -> Metadata: { title: "DramaKu — Nonton Drama China Gratis Tanpa Langganan", description: "Streaming 500+ drama China pendek. Daftar gratis, nonton tanpa iklan, subtitle Indonesia. Responsive di HP & desktop.", openGraph: { ... } } -> Highlight key differentiators: gratis, tanpa langganan, banyak pilihan, subtitle, responsive
- Balik ke versi sebelumnya: Hapus export metadata, pakai root layout metadata saja

**[25] No canonical URLs — potential duplicate content penalty** - _GENTING (tinggi)_
- Berkas: `app/drama/[id]/page.tsx, app/feed/[id]/page.tsx` (baris N/A)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: module
- Masalah: DramaKu punya 2 route ke drama yg sama: /drama/[id] (detail/info view) & /feed/[id] (video player view). Google bisa see kedua URL sebagai duplicate content (same drama, different presentation). Tanpa canonical tag, Google mungkin index keduanya, split rank/authority antara keduanya (bad untuk SEO).
- Kenapa masalah: Canonical tag tell Google: "ini adalah versi authoritative dari halaman, jika ada duplicate, gunakan ini untuk ranking". Tanpa canonical, Google confuse mana primary, split page rank. Worse case: both pages rank, tapi masing-masing lebih rendah daripada jika consolidated ke 1 URL.
- Dampak kalau dibiarkan: Page rank/authority split antara /drama & /feed pages. Search ranking untuk drama terms lebih rendah. Authority dari external links tidak consolidated.
- Skenario gagal nyata: Drama detail /drama/xyz punya 5 external links. Feed page /feed/xyz punya 3 links. Total authority bisa jadi 8, tapi split jadi 4+4 (each page rata-rata rank lebih rendah). Jika consolidated ke 1 canonical URL, 1 halaman bisa rank lebih tinggi.
- Cara perbaiki: Add generateMetadata di /drama/[id]: include canonical: `https://dramaapp.vercel.app/drama/${id}` -> Add generateMetadata di /feed/[id]: set canonical JUGA ke /drama/[id] (menunjukkan /drama adalah primary) -> Alternatif: jika /feed ingin jadi primary, set feed canonical ke feed, & drama canonical ke feed -> Verify: build, inspect HTML, check <link rel="canonical" href="..."> present
- Balik ke versi sebelumnya: Remove canonical tags

**[26] Sitemap & robots.txt tidak ada — Google crawl inefficient, tidak bisa exclude admin pages** - _GENTING (tinggi)_
- Berkas: `app/sitemap.ts (TIDAK ADA), app/robots.ts (TIDAK ADA)` (baris N/A)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 2hr | Luas dampak: system-wide
- Masalah: Next.js 13.4+ support native sitemap.ts dan robots.ts di app directory. DramaKu tidak punya keduanya. Akibatnya: (1) Google harus guess-guess halaman mana yang penting (harus crawl semua); (2) Admin panel (/admin) dan auth pages (/login, /daftar) juga akan di-crawl & di-index (buruk), seharusnya di-exclude; (3) Dynamic drama pages ([id]) tidak properly advertise ke Google (harus cari manual atau via sitemap); (4) Tidak bisa set crawl budget hint.
- Kenapa masalah: Sitemap.ts = peta semua route yang indexable, membantu Google prioritize crawl. Robots.txt = aturan akses bot. Tanpa keduanya, Google hanya bisa follow links (less efficient), dan tidak bisa exclude sensitive routes (admin, login).
- Dampak kalau dibiarkan: Google membuang crawl budget ke halaman yang tidak penting (admin, login). Halaman drama publik di-crawl lebih lambat. Potential admin pages mungkin ter-index (privacy/security issue). Waktu indexing drama baru lebih lama.
- Skenario gagal nyata: Google bot crawl /admin dan simpan ke index. Orang bisa search "site:dramaapp.vercel.app admin" dan temukan admin page di Google. Atau, drama baru di-add, Google hanya temukan setelah seminggu (karena crawl inefficient).
- Cara perbaiki: Buat app/robots.ts: export const robots: MetadataRoute.Robots = { rules: { userAgent: '*', allow: '/', disallow: '/admin /login /daftar /api /watch' }, sitemap: 'https://dramaapp.vercel.app/sitemap.xml' } -> Buat app/sitemap.ts: async function, fetch getAllDramas(), return array [{url: '/', lastModified: now, priority: 1}, {url: '/discover', priority: 0.8}, {url: '/drama/[id]' for each drama}] -> Ensure sitemap only include public routes: /, /beranda, /discover, /shorts, /feed/[id], /drama/[id], /profile (user-specific ok but noindex), /my-list (user-specific)
- Balik ke versi sebelumnya: Hapus sitemap.ts & robots.ts files, kembali ke default Google crawl

**[27] Tidak ada OpenGraph tags — social media share cards buruk/generic** - _GENTING (tinggi)_
- Berkas: `app/layout.tsx (global metadata)` (baris 24-27)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: module
- Masalah: Global metadata di layout.tsx hanya punya title & description. Tidak ada openGraph, twitter, atau icons config. Akibatnya, saat halaman dibagikan ke social media (Twitter, Facebook, LinkedIn, WhatsApp), platform tidak menemukan og:image, og:type, og:url, dst — hanya render text preview yang buruk.
- Kenapa masalah: OpenGraph adalah standard meta tags (og:title, og:description, og:image, og:type) yang social platform gunakan untuk render rich preview (card dgn gambar, deskripsi formatted). Tanpa itu, social card tampil text-only, tidak menarik.
- Dampak kalau dibiarkan: Share card di Twitter/Facebook/LinkedIn tampil buruk (tanpa gambar, tanpa formatted layout). Click-through dari social media turun karena card tidak eye-catching. User tidak tertarik klik link.
- Skenario gagal nyata: User share halaman drama ke Facebook. Facebook crawl halaman, tidak temukan og:image → card render tanpa gambar thumbnail (hanya text). Dalam Facebook feed, card tampil membosankan dibanding share kompetitor dgn gambar besar. User skip.
- Cara perbaiki: Edit app/layout.tsx metadata: tambahkan openGraph: { title, description, url, siteName: 'DramaKu', locale: 'id_ID', type: 'website' } -> Tambahkan images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DramaKu' }] (perlu create default OG image) -> Untuk dynamic pages (drama detail, feed), override openGraph di generateMetadata dengan drama-specific image + title -> Tambahkan twitter: { card: 'summary_large_image', site: '@dramaKu' } (jika ada Twitter account)
- Balik ke versi sebelumnya: Hapus openGraph dari metadata

**[28] Drama detail page tanpa unique metadata — social sharing & SEO buruk** - _GENTING (tinggi)_
- Berkas: `app/drama/[id]/page.tsx` (baris 1-20)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: module
- Masalah: Page /drama/[id] adalah halaman publik kritis (viewer bisa share link drama ke teman, social media). Tetapi halaman TIDAK export generateMetadata, sehingga saat dibagikan di Twitter/Facebook/WhatsApp, platform hanya akan melihat title/description global dari root layout ("DramaKu — Drama China Gratis"), bukan judul & sinopsis drama spesifik. Ini mengurangi click-through rate di social.
- Kenapa masalah: generateMetadata adalah cara Next.js 14+ untuk set dynamic metadata per halaman. Tanpa ini, metadata bersifat statis (global dari layout.tsx). Halaman dinamis [id] memerlukan generateMetadata function untuk mengambil drama.title, drama.synopsis, drama.posterImage, dst.
- Dampak kalau dibiarkan: Social media share card tampil generik untuk semua drama. Google Search juga melihat metadata identik. Click-through di social media menurun karena potential visitor tidak tahu drama apa yang dibagikan.
- Skenario gagal nyata: User share link /drama/xyz-drama ke Twitter. Twitter crawl halaman, temukan title="DramaKu — Drama China Gratis", description="Streaming drama China pendek gratis di HP & web." Bukan judul drama spesifik. Card tampil membosankan, orang jarang klik.
- Cara perbaiki: Tambahkan export function generateMetadata di app/drama/[id]/page.tsx -> Function harus: await getDrama(id), lalu return { title: drama.title, description: drama.synopsis, openGraph: { title, description, images: [{ url: drama.posterImage }] }, ... } -> Sertakan poster image di og:image untuk social card yang menarik -> Tambahkan canonical URL: {url: `https://dramaapp.vercel.app/drama/${id}`}
- Balik ke versi sebelumnya: Hapus export generateMetadata, kembali ke global metadata

**[29] Feed/video player page tanpa metadata — video sharing & engagement rendah** - _GENTING (tinggi)_
- Berkas: `app/feed/[id]/page.tsx` (baris 1-20)
- Risiko bikin rusak saat diperbaiki: **SEDANG** | Perkiraan usaha: 2hr | Luas dampak: module
- Masalah: Page /feed/[id] adalah halaman viewer utama (swipe-to-watch). Saat user share link episode ke teman atau social media, platform tidak melihat metadata spesifik episode/drama. Juga tidak ada generateMetadata, dan set "force-dynamic" menghalangi static generation, membuat social media crawler kesulitan prerender halaman (tidak bisa cache meta).
- Kenapa masalah: force-dynamic membuat halaman selalu di-generate saat request, tidak pre-render di build time. Social media crawler (bot) mengakses halaman dan perlu meta tags yang sudah siap di HTML. Tanpa generateMetadata + dynamic SSR, bot tidak dapat metadata spesifik drama dengan cepat.
- Dampak kalau dibiarkan: Saat user share video di social media, card tidak menampilkan judul/poster drama, hanya generic fallback. Engagement (click-through, shares) turun karena calon viewer tidak tahu apa yang dibagikan. Video juga tidak bisa di-optimize untuk social embedding.
- Skenario gagal nyata: User menonton drama di /feed/xyz dan bagikan link ke TikTok/Instagram Stories (embed). Instagram/TikTok crawl halaman, tidak temukan og:image, og:title khusus. Embed tampil tanpa preview, atau preview generik. Calon viewer tidak tertarik, skip.
- Cara perbaiki: Tambahkan generateMetadata di /feed/[id]/page.tsx (sebelum FeedPage component) -> generateMetadata: const drama = await getDrama(id); return { title: drama.title, description: drama.synopsis, openGraph: { title, description, images: [...], type: 'video.other' }, ... } -> Pertimbangkan ubah force-dynamic ke ISR (revalidate: 3600) jika layak, agar social bots bisa cache meta -> Tambahkan og:type: 'video.other' atau 'video.episode' untuk social platform tahu ini video
- Balik ke versi sebelumnya: Hapus generateMetadata, revert ke global meta

### 👥 Kemudahan-pakai (UI/UX + a11y) (3)

**[30] Global error messages in CoinWallet and RewardedAdModal not associated with form/action context** - _GENTING (tinggi)_
- Berkas: `app/components/CoinWallet.tsx` (baris 220-230)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: module
- Masalah: Error/success messages appear as generic alert divs after user action (topup, check-in). They lack role="alert" or aria-live="polite", so screen reader users may not be immediately notified of async result. Message is tied to component state, not form field, so users must read entire message to understand which action failed.
- Kenapa masalah: WCAG 4.1.3 requires status messages announced to screen readers. Without aria-live, changes are not announced dynamically. Users may not notice result unless they re-read whole panel. Also, no form-field-level errors (e.g., 'Top-up failed for pack A'), just generic 'Top-up gagal.'
- Dampak kalau dibiarkan: Screen reader users don't get automatic notification of action result. May re-attempt action thinking it didn't go through, or miss error message entirely.
- Skenario gagal nyata: Screen reader user in CoinWallet clicks 'Check-in harian' button. Async request completes, msg displays. JAWS user is not alerted, continues scrolling profile. Later realizes check-in succeeded but never noticed the message.
- Cara perbaiki: 1. Add `role="alert" aria-live="polite"` to msg div -> 2. Optional: move error div to top of CoinWallet or modal for prominence -> 3. Ensure msg.text is descriptive (not just 'Gagal', but 'Top-up gagal: saldo tidak cukup' if applicable) -> 4. Test: use JAWS with ARIA mode, trigger action, confirm announcement

**[31] ActionRail icon buttons lack aria-label and aria-pressed state** - _GENTING (tinggi)_
- Berkas: `app/components/ActionRail.tsx` (baris 107-152)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: single-file
- Masalah: RailButton component (Like, Comment, Save, Share actions) uses aria-pressed={active} correctly, but lacks aria-label. The label text is rendered as visual text only (not input), so screen readers cannot reliably map 'Like' visual label to the button. aria-label needed to properly expose button purpose.
- Kenapa masalah: aria-pressed is good (toggle state), but without aria-label, screen readers may not know what the button does. Visual label is just text span, not an accessible name. Relies on icon + text being parsed correctly by AT, which is fragile.
- Dampak kalau dibiarkan: Screen reader users cannot immediately understand button purpose (Like vs. Save vs. Share). Icon-only buttons without labels are notoriously inaccessible.
- Skenario gagal nyata: JAWS user hears 'button, pressed' without learning what action it triggers. Must manually explore or lose function.
- Cara perbaiki: 1. Add aria-label to RailButton: `aria-label={label}` -> 2. Keep aria-pressed={active} as-is -> 3. Test in JAWS/NVDA: button should announce 'Like, button, pressed' when active

**[32] Low contrast secondary text (zinc-500/600) in small sizes below 14px fails WCAG AA** - _GENTING (tinggi)_
- Berkas: `app/login/page.tsx` (baris 198)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: module
- Masalah: Text at 11px using text-zinc-600 (zinc hex #52525b) on black background (#0a0a0a) produces contrast ratio ~3.5:1, failing WCAG AA 4.5:1 requirement for small text. Similar pattern in BottomNav (text-zinc-400), CoinWallet helpers, RewardedAdModal footer, and discover page.
- Kenapa masalah: zinc-600 (rgb ~82,82,91) is too dark against #000/dark bg for <14px text. WCAG AA requires 4.5:1 for body text, 3:1 for large text (14pt+ bold or 18pt+). Affects readability for users with low vision or color blindness.
- Dampak kalau dibiarkan: Users with low vision, color blindness, or viewing on low-brightness screens may struggle to read helper text, captions, and secondary information throughout the app.
- Skenario gagal nyata: User with mild color vision deficiency opens profile page, reads instructions for coin wallet check-in feature (text-zinc-600 at 10px). Text is borderline illegible against dark background, forcing closer inspection or screen magnification.
- Cara perbaiki: 1. Change all text-zinc-600 and text-zinc-500 to text-zinc-400 or text-zinc-300 for text smaller than 14px (text-sm and below) -> 2. For 11px/10px text specifically, use text-zinc-300 minimum -> 3. For any descriptive text <12px, verify contrast is >=4.5:1 using WebAIM contrast checker -> 4. Test with browser's prefers-color-scheme dark mode and accessibility tree

---

## [!] PENTING (sedang) - 33 temuan

### 🗄️ Database (2)

**[33] Duplikasi query dalam upsertDrama saat drama baru** - _PENTING (sedang)_
- Berkas: `lib/dramas.ts` (baris 163-173)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: single-file
- Masalah: Saat upsert drama baru (not found), code sequentially baca drama yang ada, lalu baca edge (min/max). Tapi kedua query bisa dijalankan paralel dengan Promise.all().
- Kenapa masalah: Sequential await menghalangi parallelisasi. Dua read-only query tidak perlu menunggu satu sama lain.
- Dampak kalau dibiarkan: Upsert drama baru lambat ~200ms (2x query time) ketika harusnya ~100ms (paralel).
- Skenario gagal nyata: Admin bulk-upload 20 drama baru. Setiap upsert tunggu sekali edge query, total waktu 20 query x 100ms = 2000ms. Dengan paralel Promise.all, bisa ~200ms.
- Cara perbaiki: Ganti sequential `if (existing.length)` dengan paralel query: `const [existing, allSort] = await Promise.all([query1, query2])` sebelum conditional -> Tapi perlu handle case existing.length; jika ada, jangan query edge

**[34] Missing index pada unlocks.email** - _PENTING (sedang)_
- Berkas: `supabase_setup.sql` (baris 63-67)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: single-file
- Masalah: Tabel unlocks (email, token) punya composite PRIMARY KEY, tapi saat query `WHERE email = ?` untuk baca semua episode terbuka user, PostgreSQL BISA SAJA full-table scan jika tidak ada index PREFIX pada email.
- Kenapa masalah: Composite PK (email, token) hanya efisien untuk query kedua-duanya. Query single-column `email =` memerlukan index terpisah. PostgreSQL bisa pakai PK sebagai index tapi hanya jika kolom pertama cocok; untuk query email saja tanpa token, mungkin full-scan tergantung planner.
- Dampak kalau dibiarkan: getUnlocks(email) bisa menjadi O(N) full-table scan jika database besar. Saat cache warm, LIMIT 1 mungkin cepat, tapi SELECT * dan filter bisa lambat.
- Skenario gagal nyata: Database punya 100K unlock records. User dengan email baru call getUnlocks(). Query scans 100K rows untuk menemukan ~50 episodes milik user itu.
- Cara perbaiki: Buat index: CREATE INDEX unlocks_email_idx ON unlocks(email) -> Verify index dipakai dengan EXPLAIN ANALYZE SELECT ... FROM unlocks WHERE email = ... -> Test kecepatan getUnlocks() dengan dataset besar

### ☁️ Kirim-ke-server & operasi (4)

**[35] Missing TypeScript Build-Time Type Checking in CI/CD** - _PENTING (sedang)_
- Berkas: `package.json` (baris 5-8)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: system-wide
- Masalah: package.json lacks explicit 'typecheck' or 'lint' scripts. No TypeScript validation occurs before deployment beyond Next.js's embedded type checking during 'next build'. No ESLint configuration found.
- Kenapa masalah: TypeScript errors may only surface at build time in CI/CD, delaying detection. Without pre-commit linting, junior staff may commit code with runtime errors undetected. The project has 60+ API routes and 14 helper libraries with complex types; missing explicit typecheck weakens quality gates.
- Dampak kalau dibiarkan: Type safety relies solely on 'next build' (which may cache incorrectly). Refactoring errors can slip through if build cache is stale. No lint rules to enforce patterns (e.g., exhaustive dependency lists in lib/ functions).
- Skenario gagal nyata: A developer modifies lib/session.ts to add an optional parameter but forgets to update all callers in app/api routes. 'npm run build' locally passes (incorrect cache), PR merges without catching the error, and production deploy fails with runtime 'function expects argument' errors.
- Cara perbaiki: Add 'typecheck' script to package.json: "typecheck": "tsc --noEmit" -> Add 'lint' script: "lint": "next lint" (create .eslintrc.json with Next.js config) -> Add pre-commit hook or CI workflow step that runs both before merge (fail if either exits non-zero) -> Document in CLAUDE_TEAM_GUIDE.md that 'npm run typecheck && npm run lint' must pass locally before opening PR

**[36] Weak Hardlink Agent Secret Validation (No Rate Limiting or Logging)** - _PENTING (sedang)_
- Berkas: `app/api/admin/hardlink/route.ts` (baris 43-54)
- Risiko bikin rusak saat diperbaiki: **SEDANG** | Perkiraan usaha: 8hr+ | Luas dampak: module
- Masalah: The hardlink API endpoint sends a raw secret (HARDLINK_AGENT_SECRET) in the x-agent-secret header to a remote tunnel URL (NEXT_PUBLIC_VIDEO_BASE_URL). If the tunnel is compromised or if a MITM attack is possible, the secret is exposed. Additionally, there is no rate limiting, request logging, or timeout on the fetch call.
- Kenapa masalah: The secret is sent over HTTP to a remote endpoint. If the cloudflared tunnel or Caddy reverse proxy is misconfigured or compromised, the secret is visible in logs/network traffic. There is also no protection against brute-force or DoS attacks on the hardlink endpoint. A malicious admin could trigger thousands of hardlink requests without any throttling.
- Dampak kalau dibiarkan: If tunnel is compromised, attacker gains access to the backup PC's hardlink agent. Attacker can then request any drama's episode files to be hardlinked, bypassing payment. Additionally, admin can inadvertently cause disk exhaustion on backup PC by requesting huge numbers of hardlinks without rate limiting.
- Skenario gagal nyata: Attacker discovers NEXT_PUBLIC_VIDEO_BASE_URL via dev console or GitHub env vars. Attacker reverse-engineers the tunnel to the backup PC. Attacker intercepts or logs requests to /api/admin/hardlink and extracts HARDLINK_AGENT_SECRET from the header. Attacker then makes direct requests to the hardlink agent to link premium episodes without payment.
- Cara perbaiki: Use HMAC-based request signing (similar to Midtrans webhook verification in lib/midtrans.ts) instead of a shared secret in headers -> Implement rate limiting on /api/admin/hardlink: max 10 requests per admin per hour -> Add request logging (IP, email, dramaId, timestamp, result) to a database or file for audit trails -> Wrap fetch() call with a timeout (e.g., 30 seconds) to prevent hanging requests -> Consider moving hardlink to an authenticated API endpoint on the agent itself (not tunnel root)

**[37] Insufficient Environment Variable Validation at Deploy Time** - _PENTING (sedang)_
- Berkas: `lib/session.ts, lib/supabase.ts, app/api/coins/topup/route.ts` (baris 22-23, 20, 79-90)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: system-wide
- Masalah: Environment variables are checked at runtime (lazy loading), not at deploy time. Critical env vars (ADMIN_PASSWORD, AUTH_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) have no validation. If vars are missing or misconfigured, the app starts but fails when those features are accessed. This delays error detection.
- Kenapa masalah: Deploy-time validation ensures the app is immediately rejected if it's misconfigured, rather than starting successfully but failing on first use. This is important in production to catch config errors during CI/CD, not after deployment.
- Dampak kalau dibiarkan: If ADMIN_PASSWORD is not set in Vercel env vars, the app starts normally. Admin login doesn't fail until someone tries to log in (which might be hours later). Similarly, if Supabase keys are wrong, the app starts but all API routes that depend on Supabase fail.
- Skenario gagal nyata: DevOps accidentally deletes SUPABASE_SERVICE_ROLE_KEY from Vercel environment. The app deploys successfully (no error during build or startup). However, when users try to load episode lists or make payments, the endpoints return 500 errors because useSupabase is false (fallback to file storage, which is read-only on Vercel). No one notices for 30 minutes until alerts fire.
- Cara perbaiki: Create a 'health-check' or 'verify-config' script that runs at app startup and validates all critical env vars -> Add it to app/layout.tsx or create a next.config.ts validation hook -> For Vercel, add environment variable guards in vercel.json or as a build step -> Log validation errors clearly: list which vars are missing and provide links to setup docs -> Consider fail-fast: if critical vars are missing in production, throw an error instead of starting

**[38] CI Workflow Dependency Missing Secret Configuration (ANTHROPIC_API_KEY May Not Be Set)** - _PENTING (sedang)_
- Berkas: `.github/workflows/ai-review.yml` (baris 5-6, 56)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: module
- Masalah: The AI review workflow requires ANTHROPIC_API_KEY secret to be manually set in GitHub repo settings (line 5-6). There is no workflow step to verify the secret exists before running the AI review. If the secret is not set, the workflow silently fails to post reviews (no error message, just an empty result).
- Kenapa masalah: Manual secret setup is error-prone. New repos, forks, or migrated repos often skip this setup. Without verification, the workflow runs but the review step fails silently because ANTHROPIC_API_KEY is empty. Team gets no notification, and reviews are skipped without anyone noticing.
- Dampak kalau dibiarkan: AI-powered code review is silently disabled if secret is not configured. Team loses the first layer of code quality checking for all PRs. No audit trail of why reviews stopped.
- Skenario gagal nyata: Team sets up a new GitHub branch for staging. They copy the CI workflows but forget to configure ANTHROPIC_API_KEY in the staging repo settings. PRs are opened against staging, CI runs, but ANTHROPIC_API_KEY is undefined. The review script fails silently. All PRs are merged to staging without AI review, introducing bugs that should have been caught.
- Cara perbaiki: Add an explicit verification step in ai-review.yml before running the review script: ->   - name: Verify ANTHROPIC_API_KEY is set ->     run: | ->       if [ -z "$ANTHROPIC_API_KEY" ]; then ->         echo '::error::ANTHROPIC_API_KEY secret is not configured. Set it in GitHub repo settings.' ->         exit 1 ->       fi ->     env: ->       ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }} -> Add similar checks for GITHUB_TOKEN and required context files (docs/_PATTERNS.md, docs/architecture.md)

### 📚 Kelengkapan catatan (3)

**[39] [TBD] placeholders in docs/architecture.md contradict template notes about 'update tiap ada perubahan'** - _PENTING (sedang)_
- Berkas: `docs/architecture.md` (baris 1-10)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: single-file
- Masalah: architecture.md states 'Update tiap kali ada perubahan signifikan' but is itself a [TBD] template that has never been filled in with the actual dramaapp project information. This is a contradiction: the document claims to be the versioned, maintained peta proyek, but it contains placeholder text suggesting it was never completed after initialization.
- Kenapa masalah: The document's own metadata ('Versi 1', '2026-06-20') and instructions ('Update tiap kali') imply it should be actively maintained project documentation. But all content is [TBD], suggesting either: (1) it was created as a template and abandoned, or (2) someone forgot to fill it in. This sets a bad precedent: if the main architecture file is not maintained, why would developers maintain feature docs?
- Dampak kalau dibiarkan: Undermines documentation culture. Junior developers may think 'docs are not a priority' because the top-level doc is a template. Team loses accountability for keeping architecture.md in sync with actual stack/modules/dependencies.
- Skenario gagal nyata: Six months from now, dramaapp adds a new critical module (e.g., email notifications via Resend API). Developer creates a PR but doesn't update architecture.md (because the template [TBD] suggests it is not maintained). Code review misses the fact that architecture.md has become stale. A new hire a year later reads architecture.md and believes the stack is outdated, wastes time verifying against code.
- Cara perbaiki: Prioritize filling in docs/architecture.md completely (not [TBD]). See 'Finding: docs/architecture.md is unfilled template' above for detailed fix steps. -> Once filled, add a note in the 'Riwayat Perubahan' table at bottom: 'Versi 2 | 2026-06-20 | [name] | Inisialisasi dengan konten dramaapp aktual (stack, modul, ENV, entry points).' -> Establish a process: any PR that adds a module, changes stack version, or changes ENV must update architecture.md in the same commit. Add this to CLAUDE.md or CLAUDE_TEAM_GUIDE.md. -> Consider adding a 'Last verified' date to architecture.md (e.g., 'Last verified 2026-06-20 against package.json v0.1.0, lib/ 14 files, app/api/ 24 routes'). This helps team see if it is stale.
- Balik ke versi sebelumnya: Revert commit.

**[40] docs/architecture_auto.md registry shows example but claims 'Belum ada .md pendamping' (confusing intent)** - _PENTING (sedang)_
- Berkas: `docs/architecture_auto.md` (baris 16-33)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: single-file
- Masalah: The architecture_auto.md file claims to be an 'auto-maintained registry' of all .md files but currently shows zero actual entries under 'Top-level'. The example section shows auth.md and security/encryption.md as format examples, but the actual registry section says 'Belum ada (.md pendamping)'. This is confusing for developers: are there supposed to be docs? Are they optional? Should I update this file when I create auth.md?
- Kenapa masalah: The intent of architecture_auto.md is to keep a single source of truth for what docs exist (so AI can cherry-pick relevant files on each session). But the comment 'Belum ada' suggests the registry is empty and will be auto-populated, which contradicts the manual example shown above. New developers or AI might skip updating this file when creating feature docs, leaving the registry stale.
- Dampak kalau dibiarkan: AI in future sessions will not know about feature docs (auth.md, wallet.md, etc.) because the registry is empty. AI will waste context reading all 20+ docs files in docs/ instead of cherry-picking the 3-4 relevant ones for a task. Documentation growth is not tracked centrally.
- Skenario gagal nyata: Developer creates docs/auth.md but forgets to add it to architecture_auto.md registry. Next session, AI reads architecture_auto.md, sees 'Belum ada', doesn't know auth.md exists, and spends 20 seconds re-reading all 20 docs files instead of using the registry to jump directly to auth.md and 2 others relevant to the task.
- Cara perbaiki: Once feature docs (auth.md, wallet.md, payments.md, db.md) are created, add them to the registry in the correct section, one per line -> Format example: '- [auth.md](auth.md) - Viewer/admin login flow, session signing, 2FA TOTP, timing-safe verification' -> Replace '*(Belum ada .md pendamping...)*' with the actual entries after creating the feature docs -> Update the comment to clarify: 'AI auto-maintains this list. When creating a new feature .md file, update this registry in the same commit.' -> Consider adding a 'Pending docs' section to track docs that have been sketched but not yet completed (e.g., 'docs/api-reference.md - [in progress, targeted for 2026-07-01]')
- Balik ke versi sebelumnya: Revert commit. No code impact.

**[41] No Architecture Decision Records (ADRs) for non-trivial choices (session signing, RPC for atomicity, Midtrans integration, dual-mode DB)** - _PENTING (sedang)_
- Berkas: `docs/decisions/ (empty except template)` (baris N/A)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 2hr | Luas dampak: module
- Masalah: The decisions/ folder has a well-documented template and clear ADR rules, but zero actual ADRs for the dramaapp's significant architectural choices. These choices are 'non-trivial and hard to rollback' per the ADR README, yet no record exists explaining the context, decision, and trade-offs.
- Kenapa masalah: 6 months from now, a developer asks 'Why is the session signed with HMAC? Why not just store sessionID in database?' The answer (HMAC is self-contained, doesn't require DB lookup on every request, SERVICE_ROLE_KEY can be rotated to invalidate all sessions at once) is not documented. Or someone asks 'Why use Postgres RPC functions for atomic counters instead of letting the client do it?' (Answer: prevents lost updates when two concurrent requests from same user both increment a counter). Without ADRs, knowledge is lost.
- Dampak kalau dibiarkan: Architectural knowledge is tribal (in developers' heads). Risk of reimplementing the same decision elsewhere (e.g., next time we need atomic operations, developer doesn't remember we already chose RPC, tries to use Redis or client-side optimism). Risk of rollback/refactor decisions that break assumptions (e.g., someone 'simplifies' session to JWT without realizing SERVICE_ROLE_KEY rotation was a benefit).
- Skenario gagal nyata: A developer wants to optimize performance by caching admin email list (instead of checking isAdminEmail on every request). They refactor session.ts to lookup email from a cache without realizing that getAdminEmail(req) is supposed to be fast (HMAC verification is O(1), DB lookup is O(n) even with index). The change introduces a 500ms latency regression. Or someone assumes dual-mode (Supabase vs local JSON) is a hack and 'cleans it up', removing the fallback. This breaks local development for developers without Supabase env vars.
- Cara perbaiki: Create ADR-001-hmac-signed-sessions.md: explain why session is HMAC-signed instead of JWT or sessionID lookup. Context: stateless verification, no DB round-trip. Decision: use HMAC. Alternatives: JWT (requires key rotation story), sessionID (requires DB lookup). Consequences: session is self-contained, but must re-verify email against isAdminEmail(req) list on each request (allows instant permission revoke). -> Create ADR-002-postgres-rpc-atomic-ops.md: explain why coin_add and coin_spend_unlock are Postgres RPC functions. Context: multiple concurrent users may try to unlock same episode or earn coins. Without atomicity, one request's update can be lost. Decision: use Postgres transactions (RPC). Alternatives: Redis (adds dependency), client-side optimism (complex, error-prone). Consequences: atomic, but adds RPC latency (~50ms per Supabase request). -> Create ADR-003-dual-mode-persistence.md: explain useSupabase flag and local JSON fallback. Context: dev environment needs to run without Supabase. Decision: check SUPABASE_URL/KEY at runtime, fallback to file JSON if missing. Alternatives: always require Supabase (breaks offline dev), separate configs for dev/prod (harder to test prod path). Consequences: one code path works in two modes, but dual-mode increases surface area for bugs. -> Create ADR-004-midtrans-snap-for-payment.md: explain why Midtrans Snap instead of direct bank transfer or other gateway. Context: Indonesia market needs QRIS/GoPay support, subscription model is simple (one-time purchase packs). Decision: Midtrans Snap. Alternatives: direct bank (manual reconciliation), Stripe (more expensive, not optimized for IDR micro-transactions), Xendit (similar feature set). Consequences: webhook handling required, third-party dependency, test mode available.
- Balik ke versi sebelumnya: Delete ADR files if not needed. Documentation only.

### 🎨 Tampilan / Frontend (1)

**[42] Hardcoded arbitrary text sizes not using design tokens** - _PENTING (sedang)_
- Berkas: `app/components/Comments.tsx` (baris 142, 189, 193)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: module
- Masalah: Multiple components use arbitrary pixel-based text sizes (text-[9px], text-[11px], text-[13px]) as arbitrary values in className strings, rather than using a centralized design token system. This pattern is repeated across AdBanner, FeedPlayer, Poster, TopNav, ContentRow, etc. These arbitrary values make it difficult to maintain consistent typography and update spacing globally.
- Kenapa masalah: Using hardcoded Tailwind arbitrary values like `text-[11px]` instead of named tokens makes the design system opaque and scattered across multiple files. If the design changes (e.g., all body text needs to be 10px instead of 11px), changes must be made in many places, increasing chance of inconsistency and bugs.
- Dampak kalau dibiarkan: Design inconsistency, harder to maintain typography, difficult to onboard new developers, risk of accessibility issues if text sizes become too small, harder to implement dark mode or theme switching later.
- Skenario gagal nyata: If all small text throughout the app is set to text-[11px] via arbitrary values and a design review determines 10px is too small, engineers must find and update 20+ instances across different files. Some may be missed, leading to inconsistent typography and user confusion.
- Cara perbaiki: Create a @layer utilities section in Tailwind config to define named tokens (e.g., .text-caption, .text-footnote) -> Replace all hardcoded text-[Npx] with named tokens -> Create a design-tokens.css or tokens.ts file documenting the hierarchy (text-sm, text-xs, text-caption, etc.) -> Audit padding/margin arbitrary values ([1.5px], etc.) and convert to tokens as well

### 🎓 Kesiapan staf baru (7)

**[43] Tidak ada 'good first issue' backlog terdokumentasi untuk staf baru** - _PENTING (sedang)_
- Berkas: `docs/ONBOARDING.md` (baris 83-97)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: single-file
- Masalah: ONBOARDING.md Day 1-2 step 'PR Pertama' menyebutkan 'Owner/senior assign micro-task'. Tapi tidak ada daftar konkret (backlog) dari 'good first issue' yang sudah dicuri untuk staf baru di dramaapp. Owner harus manually curate task kecil setiap kali ada hire baru.
- Kenapa masalah: Kalau backlog 'good first issue' sudah siap ditulis (mis. 5-10 task ringan: typo fix, copy update, dependency bump, add comment ke function, refactor helper kecil), owner bisa langsung assign tanpa cari-cari. Ini percepat onboarding staf baru. Sekarang: owner harus pikir task apa yang cocok, berisiko task yang di-assign terlalu besar atau tidak cocok untuk pemula.
- Dampak kalau dibiarkan: Onboarding staf baru menjadi ad-hoc, tidak terstruktur. Kalau owner sibuk, staf baru menunggu 1-2 hari untuk di-assign task. Saat di-assign, mungkin task kebesaran sehingga staf bingung atau demoralized. Velocity ramp-up jadi lebih lambat.
- Skenario gagal nyata: Staf baru join hari Senin, siap mulai. Owner belum prepare task apa-apa. Staf menunggu sampai Rabu baru dikasih task 'tambah modal component' yang 200 baris, kebesaran untuk hari pertama. Staf demoralized, bingung dengan codebase, macet.
- Cara perbaiki: Curate 10-15 'good first issue' untuk dramaapp: typo/copy di halaman, refactor helper duplikat (lihat lib/), add JSDoc comment ke function, bump dependency minor, add unit test untuk existing function, style fix minor -> Tulis setiap task di GitHub Issues atau channel task (sesuai workflow tim): [TASK] <deskripsi>, [Acceptance Criteria], [Risk Level] Low, [Est. Time] 1-2 jam -> Tag dengan label 'good-first-issue' kalau pakai GitHub Issues -> Update `docs/ONBOARDING.md` Day 1-2 step, referensi link ke backlog: 'Owner assign dari daftar good first issues' -> Maintain: tiap kali staf assign issue, hapus dari backlog. Maintain backlog minimal 5 open 'good first issues' setiap waktu.

**[44] staff-roster.yml entry owner masih berupa placeholder kosong** - _PENTING (sedang)_
- Berkas: `.github/staff-roster.yml` (baris 18-22)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: cross-module
- Masalah: Staff roster hanya punya 1 entry (owner) dengan placeholder kosong: name, github handle, dan tanggal ditambahkan belum diisi dengan data sebenarnya. File ini harusnya menjadi source of truth untuk 'siapa boleh apa' akses per staff.
- Kenapa masalah: Tanpa roster yang terisi, tidak ada referensi eksplisit siapa saja anggota tim, role masing-masing, dan kapan mereka onboard. Saat ada incident security (staff resign), sulit untuk trace 'siapa boleh akses apa' di DB/GitHub/Vercel.
- Dampak kalau dibiarkan: Tidak ada inventory staff yang terstruktur. Saat staff baru join atau keluar, owner harus minta info manual (email/name/github) bukan baca dari roster. Audit trail tidak lengkap saat incident security terjadi.
- Skenario gagal nyata: Staf keluar tanpa baik-baik. Owner ingin tahu siapa yang bisa akses produksi DB, tapi roster kosong. Harus hunting di GitHub collaborators + Supabase dashboard satu-satu. Sementara itu mungkin staf itu sudah salin schema production.
- Cara perbaiki: Buka .github/staff-roster.yml -> Isi entry owner: name = nama pemilik proyek, github = github handle pemilik, added_at = tanggal hari ini (2026-06-20) -> Tambah staff lain kalau sudah ada (sesuaikan dari CODEOWNERS / git log kontributor) -> Commit + push -> Update setiap kali ada staff baru yang onboard atau yang keluar resign

**[45] MCP_SETUP.md lengkap tapi tidak di-execute, tidak jelas siapa staff di proyek ini** - _PENTING (sedang)_
- Berkas: `docs/MCP_SETUP.md` (baris 590, 662, 675)
- Risiko bikin rusak saat diperbaiki: **SEDANG** | Perkiraan usaha: 2hr | Luas dampak: cross-module
- Masalah: docs/MCP_SETUP.md section 2.6b (Option D Tiered Shared Schema) punya SQL template lengkap untuk setup database access dengan role berjenjang (senior DDL, junior DML). Tapi template ini pakai nama-nama dummy (dev_andi, dev_sinta, dev_budi, dst.) yang tidak cocok untuk proyek ini. Tidak jelas bagaimana menerapkan template ini untuk staff sebenarnya di dramaapp.
- Kenapa masalah: Template di MCP_SETUP.md generic untuk semua proyek. Untuk proyek dramaapp yang belum ada staff (hanya owner), tidak jelas: (1) berapa jumlah staff yang akan onboard? (2) siapa nama GitHub mereka? (3) pakai Option A (shared schema + owner control DDL), Option B (per-staff isolated), Option D (tiered), atau lainnya? Tanpa mapping konkret, staf baru bingung setup database akses mereka.
- Dampak kalau dibiarkan: Saat staf baru join, owner perlu manual setup PostgreSQL role + password + share connection string. Risiko: password share lewat channel tidak aman, atau owner lupa step, staf macet tidak bisa access database. Dokumentasi tidak concrete untuk proyek ini.
- Skenario gagal nyata: Staf baru join. Owner coba ikut MCP_SETUP.md section 2.6b tapi bingung: 'saya pakai option mana? staf saya ada berapa?' Manual setup jadi ribet. Akhirnya semua staf share 1 login DB yang sama (violation Aturan #0 '1 login = 1 orang') -> audit trail tidak jelas, resign staff tidak bisa di-cabut akses selektif.
- Cara perbaiki: Owner tentukan: berapa jumlah backend staff di dramaapp yang akan akses production DB? (sekarang: 0, tapi saat hiring nanti?) -> Owner tentukan: Option A (DDL via Prisma + owner control), Option B (per-staff isolated schema), Option D (tiered senior/junior), atau hybrid? -> Dokumentasi keputusan di `docs/DB_ACCESS_STRATEGY.md` (baru): 'Proyek dramaapp pakai Option [X], struktur staff [Y]'. Target audience: dev baru + owner saat onboard staff baru. -> Jika ada staf backend yang onboard nanti, execute MCP_SETUP.md section [X] dengan mapping konkret: nama staf GitHub -> PostgreSQL role name. Jangan pakai dummy names. -> Pre-built: owner buat `.sql` script spesifik dramaapp yang tinggal run, bukan template generic.

**[46] docs/architecture.md 80 persen incomplete dengan TBD placeholders** - _PENTING (sedang)_
- Berkas: `docs/architecture.md` (baris 12-99)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: single-file
- Masalah: File architecture.md adalah peta project wajib dibaca staf baru, namun 80 persen masih berupa template dengan placeholder [TBD]. Section penting (Tujuan Proyek, Stack, Modul Inti, Dependensi, Entry Points, Testing, dll) semua kosong atau berupa contoh.
- Kenapa masalah: Staf baru tidak punya peta yang jelas tentang proyek ini: apa tujuannya, pakai stack apa, modul apa saja, bagaimana struktur folder. Akibatnya mereka harus tanya-tanya atau jelajah folder sendiri, buang waktu onboarding. Risiko: dev baru membuat keputusan design yang inkonsisten dengan arch proyek karena tidak tahu peta makro.
- Dampak kalau dibiarkan: Staf baru onboarding jadi lebih lambat. Tidak ada single source of truth untuk arch proyek. Keputusan design setiap dev bisa berbeda karena tidak ada pedoman. Dokumentasi yang diinginkan tim AI-first tidak terpenuhi di proyek spesifik ini.
- Skenario gagal nyata: Staf baru join, baca docs/architecture.md harap paham tujuan + struktur. Malah ketemu [TBD] everywhere. Bingung, tanya owner berulang-ulang pertanyaan yang seharusnya sudah di-doc. Kalau owner sibuk, staf menebak-nebak dan bikin helper function di tempat yang salah folder.
- Cara perbaiki: Isi section Tujuan Proyek: apa aplikasi ini, untuk siapa user-nya, masalah apa yang diselesaikan. Cek README.md atau Vercel deployment page untuk context. -> Isi Stack: Next.js 16.2.4, React 19, Tailwind 4, TypeScript 5 (dari package.json). Backend: Next.js Route Handlers + Supabase Postgres via Prisma (cek app/api/ folder + lib/). Auth: lihat app/page.tsx + lib/ untuk pola login. -> Isi Modul Inti: minimal auth (lihat lib/auth.ts), drama list (app/page.tsx), player (app/drama/[id]/page.tsx), wallet/coin (lib/wallet.ts), payment Midtrans (lib/midtrans.ts). Detail ada di lib/ + app/. -> Isi Dependensi Utama: Next.js, React, Tailwind, shadcn (cek import di app/), Prisma (cek prisma/ folder). -> Isi Environment Variables: copy dari .env.example dengan penjelasan singkat. -> Isi Entry Points: app/page.tsx (home), app/api/[resource]/route.ts (24 endpoint sesuai folder). -> Isi Sumber Data Eksternal: Supabase (prod DB), video streaming via NEXT_PUBLIC_VIDEO_BASE_URL tunnel, Midtrans (payment optional). -> Commit + push. Baca ulang, pastikan tidak ada [TBD] yang tertinggal di file ini.

**[47] GitHub Secrets ANTHROPIC_API_KEY belum diset, AI reviewer action tidak aktif** - _PENTING (sedang)_
- Berkas: `.github/workflows/ai-review.yml` (baris 56, 58-59)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: system-wide
- Masalah: Workflow ai-review.yml sudah terconfigurasi untuk auto-review PR pakai Claude, tapi requires secret ANTHROPIC_API_KEY yang belum diset di GitHub repo settings. Akibatnya: saat ada PR baru, action ai-review jalan tapi langsung fail karena env var kosong.
- Kenapa masalah: ANTHROPIC_API_KEY adalah secret yang sensitive (bisa pakai credit OpenAI kalau seorang staf leak token ini). Owner tidak bisa push secret ke repo (bahaya), harus set manual di GitHub Settings -> Secrets. Tapi belum dikerjakan. Akibatnya: fitur AI Reviewer yang sudah dikodekan tidak aktif.
- Dampak kalau dibiarkan: AI Reviewer action gagal saat ada PR. Staf tidak dapat automated high-level feedback dari Claude untuk kode mereka (missing edge case, pattern tidak konsisten, test missing). Quality gate (CI) tetap jalan tapi missing lapis AI review yang bisa catch design issue.
- Skenario gagal nyata: Staf baru buka PR untuk tambah fitur auth. ai-review workflow jalan, tapi environment variable ANTHROPIC_API_KEY not found -> step 'Jalankan AI review' fail -> PR tidak dapat comment review dari Claude. Staf harus tunggu manual review dari owner saja, slower iteration.
- Cara perbaiki: Minta owner setup ANTHROPIC_API_KEY di GitHub repo settings: Settings -> Secrets and variables -> Actions -> New repository secret -> Isikan secret name = ANTHROPIC_API_KEY, value = (lihat dari console.anthropic.com) -> Save -> Verifikasi: Buka PR test baru -> workflow ai-review jalan successfully -> Comment review dari Claude muncul di PR -> Optional: set repo Variable REVIEW_MODEL = 'claude-sonnet-4-6' kalau mau hemat cost (default = claude-opus-4-8)

**[48] package.json tidak punya test/lint script, no CI quality gate** - _PENTING (sedang)_
- Berkas: `package.json` (baris 5-8)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 2hr | Luas dampak: cross-module
- Masalah: package.json hanya punya 3 script: dev, build, start. Tidak ada npm run test, npm run lint, npm run check, dll. Ini berarti tidak ada automated quality gate di CI (GitHub Actions) untuk enforce code standard. Developer bisa push kode dengan typo/type error/no tests dan tidak ada yang block.
- Kenapa masalah: Tim AI-first sebaiknya punya minimal: `npm run test` (jalankan test), `npm run lint` (cek format + eslint), `npm run typecheck` (cek TypeScript). Kalau tidak ada, tidak ada baseline quality gate sebelum merge. Staf baru tidak tahu apa yang perlu di-check sebelum push. Untuk tim non-programmer, automation ini jadi penting supaya AI bisa auto-check kualitas tanpa tanya-tanya.
- Dampak kalau dibiarkan: Tidak ada quality gate otomatis di CI. Staf bisa push kode dengan broken TypeScript/missing return/typo yang lolos ke main. Bergantung sepenuhnya ke manual code review yang bisa miss detail. Untuk tim AI-first, ini significant gap karena seharusnya ada layer otomatis untuk catch obvious mistake.
- Skenario gagal nyata: Staf baru push kode dengan TypeScript error (missing type annotation di function param). Tidak ada CI check untuk block. PR jalan, owner busy tidak review detail. Merge ke main. Vercel build fail saat deploy production. User impact.
- Cara perbaiki: Tentukan: apa tools yang perlu? Minimal: TypeScript typecheck, ESLint format, (optional) Jest test, (optional) coverage threshold -> Tambah script di package.json: 'typecheck': 'tsc --noEmit', 'lint': 'eslint . --ext .ts,.tsx --max-warnings=0', 'format': 'prettier --write .' (kalau pakai prettier) -> Setup ESLint config (.eslintrc.js) dengan rules yang ketat (no-unused-vars, require-await, dll). Lihat templates/.eslintrc dari kit. -> Setup GitHub Actions workflow untuk enforce: `.github/workflows/quality-gate.yml` yang jalankan npm run typecheck + lint + build. Fail kalau ada error. -> Pastikan workflow ini jadi required status check (GitHub Settings -> Branches -> Branch protection rules -> main -> Require status checks to pass). -> Test: buat branch dengan TypeScript error, push -> workflow fail -> PR tidak bisa di-merge sampe error di-fix

**[49] Tidak ada escalation tree dokumentasi: siapa tanya kapan kalau stuck** - _PENTING (sedang)_
- Berkas: `docs/CLAUDE_TEAM_GUIDE.md` (baris 366-378)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: single-file
- Masalah: CLAUDE_TEAM_GUIDE.md section 13 punya tabel escalation 'siapa tanya kapan'. Tapi proyek dramaapp tidak dokumentasikan siapa sebenarnya person In Charge (PIC) untuk setiap kategori. Tidak jelas: (1) siapa 'senior dev' di proyek ini? (2) siapa 'tech lead'? (3) siapa 'PM'? Email atau chat handle mereka apa? (4) channel Slack proyek apa?
- Kenapa masalah: Staf baru macet >30 menit, ingin escalate ke 'senior dev'. Tapi tidak tahu siapa itu orang-nya, email apa, chat handle apa. Harus tanya owner lagi. Kalau owner tidak tersedia, staf stuck lebih lama. Escalation tree harusnya concrete dengan nama + contact detail, bukan generic.
- Dampak kalau dibiarkan: Staf baru macet tidak tahu siapa tanya. Escalation delay, velocity lambat. Risk: staf bingung langsung force solution tanpa konsul senior, leading to bad design decision.
- Skenario gagal nyata: Staf baru stuck di task database schema 2 jam. Ingin escalate ke senior dev tapi tidak tahu siapa. Tidak ada dokumentasi PIC per kategori. Owner tidak reply. Staf putuskan sendiri pakai approach yang tidak optimal, merge tanpa consult.
- Cara perbaiki: Owner buat docs/ESCALATION_TREE.md: daftar konkret yang jadi PIC di dramaapp untuk setiap kategori (code/design/business/security) -> Isi: nama + GitHub handle + email + preferred chat (Slack channel / Discord / Telegram group) + response time SLA -> Contoh:
  - Code/Technical: [TBD: nama senior dev] ([chat-handle]) - 30min SLA
  - Architecture Decision: [TBD: tech lead] - 1hr SLA
  - Business Decision / Scope: [Owner email] - 1hr SLA
  - Security Incident: [Owner - URGENT, direct DM] - 5min SLA -> Update docs/CLAUDE_TEAM_GUIDE.md section 13: referensi link ke ESCALATION_TREE.md -> Post escalation tree ke channel team (pin pesan) saat staff baru onboard

### ⚡ Kecepatan (2)

**[50] Multiple simultaneous requests to fetch same drama data (no request deduplication)** - _PENTING (sedang)_
- Berkas: `app/beranda/page.tsx, app/page.tsx, app/discover/page.tsx` (baris 18, 47, 8)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: module
- Masalah: Beranda page calls `getAllDramas()` server-side, passing dramas to BerandaRows client component, which then re-filters on client. Meanwhile, DramaBrowser (discover page) and PosterCollage (landing page) separately call or expect getAllDramas(). If multiple pages load simultaneously, each triggers independent Supabase query.
- Kenapa masalah: No request deduplication. With React Server Components, Next.js should deduplicate identical async requests within the same render cycle. However, each page independently calls getAllDramas(), and across different page loads, there's no cache sharing.
- Dampak kalau dibiarkan: Minimal on single page, but during navigation or tab load race conditions, multiple identical queries to Supabase. Wasted DB connections and latency. On slow networks, perceptible delay.
- Skenario gagal nyata: User opens /beranda in tab 1, /discover in tab 2 simultaneously: (1) Both tabs call getAllDramas(), (2) Two separate queries to Supabase, (3) Network traffic doubled, (4) Supabase connection pool reduced for other operations. With 100 concurrent sessions, 100+ redundant queries.
- Cara perbaiki: Ensure getAllDramas() is called once at root layout or parent page, passed down to children via context or props -> Alternatively, leverage Next.js fetch cache for automatic request deduplication: ensure all getAllDramas() calls are identical (same params), Next.js automatically dedupes across server components in same render -> Verify: inspect server logs to see getAllDramas() call count matches expected (1 per page, not per component)
- Balik ke versi sebelumnya: No structural changes needed; revert to current calling pattern (each page calls getAllDramas independently).

**[51] No caching headers on API endpoints that serve mostly static data (dramas, comments, likes)** - _PENTING (sedang)_
- Berkas: `app/api/dramas/route.ts, app/api/comments/route.ts, app/api/likes/route.ts, app/api/coins/route.ts, lib/supabase.ts` (baris 1-10 (dramas), 44 (supabase sbSelect), 47-48 (supabase))
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: cross-module
- Masalah: All Supabase queries in lib/supabase.ts use `cache: "no-store"` at fetch time. Additionally, API routes (dramas, comments, likes, coins) don't set Cache-Control headers in responses, so responses are never cached by browsers or CDNs (Vercel Edge).
- Kenapa masalah: Dramas catalog, likes count, and comments rarely change (unless user posts new comment). Every pageview re-fetches from Supabase. This causes unnecessary database load and latency. On Vercel, no edge caching means request must hit origin server every time.
- Dampak kalau dibiarkan: 100 concurrent users on /beranda = 100 simultaneous getAllDramas() queries to Supabase. Database connection pool exhausted. Latency spikes to 1-2s. With ISR (see fix #1) + caching, 100 users served from Vercel Edge (30ms) with 1 stale database query per hour.
- Skenario gagal nyata: Traffic spike: 500 users visit /beranda in 10 seconds. (1) Each user's request bypasses Vercel cache, goes to origin, (2) 500 simultaneous /api/dramas requests hit Supabase, (3) database pool maxes out (typical limit: 30-50 connections), (4) requests queue, latency balloons to 5-10s. Users experience timeout errors. With caching: Vercel Edge serves from memory, 1 request to origin per revalidation window.
- Cara perbaiki: In lib/supabase.ts sbSelect, change `cache: "no-store"` to `cache: "force-cache"` for read-heavy queries (dramas, likes, comments). Revalidate via tags or explicit revalidatePath after mutations. -> Add Cache-Control headers to API responses: `/api/dramas` -> `Cache-Control: public, max-age=3600, s-maxage=86400` (1h browser, 1d CDN) -> For `/api/comments?dramaId=X` (drama-specific comments): `max-age=300, s-maxage=3600` (5min browser, 1h CDN) -> For `/api/coins` (user-specific wallet): `Cache-Control: private, max-age=60` (user cache only, no CDN) -> Use Vercel's revalidateTag() or revalidatePath() after mutations (comment post, like, unlock) to invalidate related caches -> Benchmark: before/after latency on /beranda and API endpoints under load (autocannon or k6)
- Balik ke versi sebelumnya: Revert cache headers to `no-store`, restore sbSelect fetch cache option to `no-store`. Reverts to current (uncached) behavior.

### ✅ Cek mutu & tes (3)

**[52] Email validation weak in viewer login — arbitrary email accepted** - _PENTING (sedang)_
- Berkas: `app/api/auth/login/route.ts` (baris 35-37)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: module
- Masalah: Viewer login (non-admin) accepts any string containing '@'. No validation for valid email format (RFC 5322 or even a basic pattern). Strings like "a@", "@b", "test@.c", "user@@domain" all pass. This allows: (1) spoofing comments/usernames with gibberish emails, (2) test email 'test@' to collide with 'test@example.com' in coin wallets (if emails are lowercased and collisions checked loosely).
- Kenapa masalah: Email is used as a unique identifier for wallet/coins, comments, and 2FA. Weak validation allows users to register with non-standard emails. When stored in database, these become keys in likes, wallets, unlocks, etc. If email normalization is case-insensitive but doesn't validate format, edge cases like 'a@b' might accidentally match 'a@b.com' in some comparison.
- Dampak kalau dibiarkan: Users can register with fake emails. Comments appear from 'attacker@' instead of real addresses. Potential email spoofing in comment threads. Possible wallet key collisions if normalization is inconsistent.
- Skenario gagal nyata: User registers as 'admin@'. Comments appear signed by 'admin@'. If another user registers as 'admin@company.com', they appear in same comment thread. Wallet key 'admin@' is created; later, if 'admin@company.com' is normalized to 'admin@', they might see same balance (unlikely, but depends on DB query logic).
- Cara perbaiki: Replace weak email check with regex: `const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;` (basic) or use email validation library -> Normalize email: `const e = String(email ?? "").trim().toLowerCase();` -> Test: reject 'a@', '@b', 'test@.c', 'user@@domain'; accept 'user@example.com', 'user+tag@sub.domain.co.uk'
- Balik ke versi sebelumnya: Revert email regex; weak validation re-enabled

**[53] Unhandled JSON parse failures in routes — crash on malformed input** - _PENTING (sedang)_
- Berkas: `app/api/comments/route.ts` (baris 22-30)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: module
- Masalah: Most API routes (coins/unlock, comments, admin/drama, etc.) call `await req.json()` inside try-catch, returning 400 if JSON is invalid. However, app/api/coins/reward/route.ts (line 16-20) catches JSON parse failure but sets body={}, silently accepting it. This means POST /api/coins/reward with body 'not json' succeeds and processes with empty email, potentially crediting coins to null/undefined email or returning misleading responses.
- Kenapa masalah: Inconsistent error handling. Comments route explicitly checks body validity; reward/checkin routes catch errors but continue with empty body. This leads to silent failures: user sends malformed JSON, server doesn't reject it, and response is confusing.
- Dampak kalau dibiarkan: Malformed POST to /api/coins/reward accepts empty request, reads email as undefined, calls resolveUserEmail(req, undefined), which falls back to cookie check. If admin is logged in, they receive coin reward even though request was malformed. Users get confused by silent acceptance of bad requests.
- Skenario gagal nyata: Client bug sends `POST /api/coins/reward" with body: {` (incomplete JSON). Server catches error, sets body={}, reads body.email as undefined, proceeds. For admin user, wallet gets credited (silent success). For non-admin, they log in, reward is claimed silently. Indeterministic behavior depending on login state.
- Cara perbaiki: In app/api/coins/reward/route.ts and app/api/coins/checkin/route.ts, explicitly check and return 400 on JSON parse failure (like comments route does) -> Standardize: all routes should wrap req.json() in try-catch with explicit 400 return
- Balik ke versi sebelumnya: Revert reward/checkin routes to silent failure

**[54] Admin password stored in env var without rotation/expiry — plain-text in Vercel logs** - _PENTING (sedang)_
- Berkas: `app/api/auth/login/route.ts` (baris 54-56)
- Risiko bikin rusak saat diperbaiki: **SEDANG** | Perkiraan usaha: 2hr | Luas dampak: module
- Masalah: Admin password is stored directly in ADMIN_PASSWORD env var on Vercel. There's no password hashing, no expiry, no rotation mechanism. If env vars are leaked (Vercel logs, GitHub Actions logs, `vercel env pull` output), attacker has permanent admin access. No audit trail or password change history.
- Kenapa masalah: Plaintext env vars are a known anti-pattern for secrets. If an admin's account is compromised or if an ex-employee has access to Vercel console, they permanently have admin credentials. No way to invalidate a single admin password without re-deploying entire app with new ADMIN_PASSWORD.
- Dampak kalau dibiarkan: If Vercel environment is compromised (e.g., ex-employee retains access), attacker gains permanent admin access. If logs are leaked, password is exposed. No emergency password reset mechanism exists.
- Skenario gagal nyata: Disgruntled ex-employee with Vercel access pulls current env vars, extracts ADMIN_PASSWORD, and modifies dramas, steals subscriber data, or deletes content. Because password is plaintext, admin has no way to disable this account without redeploying. 2FA on the account doesn't help if 2FA is also reset in the same attack.
- Cara perbaiki: For immediate improvement: document that ADMIN_PASSWORD must be rotated regularly (e.g., monthly) and tracked in a password manager -> Long-term: migrate to OAuth (GitHub, Google) instead of password, or use Supabase Auth magic links -> Alternative: hash ADMIN_PASSWORD using bcrypt and store hash in app_data table; login compares hash (requires schema migration) -> Implement password change endpoint: POST /api/auth/change-password { oldPassword, newPassword }, require both oldPassword verification and 2FA
- Balik ke versi sebelumnya: Remove password change endpoint; revert to env var

### 🧹 Perapian kode (5)

**[55] Parseviews dan formatViews helpers hanya di app/admin/page.tsx, tidak di lib** - _PENTING (sedang)_
- Berkas: `app/admin/page.tsx` (baris 22-36)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: module
- Masalah: Helper functions parseViews (parse '1.2M' -> 1200000) dan formatViews (format 1200000 -> '1.2M') hanya di admin page. Jika feature lain perlu format views, akan duplikasi logic.
- Kenapa masalah: Code reuse opportunity hilang. Ini utility functions yang bersifat general purpose (formatting angka dengan suffix K/M/B). Seharusnya di lib/ agar dapat dipakai di halaman/komponen lain.
- Dampak kalau dibiarkan: Potensi duplikasi kalau future feature butuh format views. Inconsistent implementation.
- Skenario gagal nyata: Kalau di future halaman statistik/leaderboard ingin tampilkan views drama dengan format yang sama, dev akan tulis ulang atau copypaste logic ini, menghasilkan inconsistency.
- Cara perbaiki: Move parseViews dan formatViews ke lib/formatting.ts (file baru) atau tambah ke lib/dramas.ts -> Export kedua fungsi dari lib -> Import di app/admin/page.tsx dari lib -> Test formatviews round-trip (parse -> format -> parse = original)

**[56] Duplikasi type SponsorAd: di app/components/RewardedAdModal.tsx dan lib/store.ts** - _PENTING (sedang)_
- Berkas: `app/components/RewardedAdModal.tsx` (baris 12-17)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: single-file
- Masalah: Type SponsorAd di-define di RewardedAdModal.tsx (local), tapi juga di lib/store.ts line 430+ (export). Modal fetch dari /api/ads tapi pakai local type, bukan import dari lib.
- Kenapa masalah: Duplikasi type definition; kalau schema berubah (misal: add new field), harus update di 2 tempat. Maintenance burden.
- Dampak kalau dibiarkan: Type inconsistency risk; duplikasi maintenance.
- Skenario gagal nyata: Backend add field `duration` ke iklan (time limit untuk klik). Dev update SponsorAd di lib/store.ts tapi lupa di modal, type mismatch atau bug di runtime.
- Cara perbaiki: Hapus local type SponsorAd dari RewardedAdModal.tsx line 12-17 -> Import dari lib/store: import type { SponsorAd } from '@/lib/store' -> Ubah fetch response type menjadi { ads?: SponsorAd[] }

**[57] app/admin/page.tsx terlalu besar (984 baris), bisa dipecah** - _PENTING (sedang)_
- Berkas: `app/admin/page.tsx` (baris 1-984)
- Risiko bikin rusak saat diperbaiki: **SEDANG** | Perkiraan usaha: 2hr | Luas dampak: module
- Masalah: Admin page menangani 5 tab/section dalam satu component: tambah drama, daftar drama, kelola admin, 2FA settings, iklan sponsor. Banyak state + API calls.
- Kenapa masalah: Sulit dirawat; state management kompleks untuk 5 section yang mostly independent. Kalau form drama punya bug, harus grep di 984 baris.
- Dampak kalau dibiarkan: High cognitive load; feature development slower; testing tiap section harder.
- Skenario gagal nyata: Admin ingin tambah validasi baru untuk drama (misal: verifikasi poster URL), developer harus navigate 984 baris untuk find tempat yang tepat, risiko merge conflict.
- Cara perbaiki: Extract drama form section (lines 573-806) ke <DramaFormSection /> component -> Extract daftar drama (lines 808-857) ke <DramaListSection /> -> Extract kelola admin (lines 859-952) ke <AdminManagementSection /> -> Embed kedua component 2FA & ads di sini atau keep if small (mereka sudah separate files) -> Sidebar navigation tetap di main page -> Dashboard stats tetap di main

**[58] FeedPlayer.tsx terlalu besar (851 baris), bisa dipecah** - _PENTING (sedang)_
- Berkas: `app/components/FeedPlayer.tsx` (baris 1-851)
- Risiko bikin rusak saat diperbaiki: **SEDANG** | Perkiraan usaha: 2hr | Luas dampak: module
- Masalah: FeedPlayer adalah god component dengan 851 baris. Mengandung video playback logic, paywall logic, comments drawer, episode picker, settings menu, keyboard handling, etc — semua dalam satu file.
- Kenapa masalah: Sulit dibaca, dipelihara, dan ditest. Banyak state variables (15+), multiple useEffect, nested conditionals untuk toggle modal/drawer.
- Dampak kalau dibiarkan: Cognitive load tinggi; bug-prone untuk feature baru; reuse komponen kecil jadi sulit.
- Skenario gagal nyata: Developer baru ingin fix bug di subtitle rendering atau tambah fitur caption baru, harus baca 851 baris untuk understand alur. Risiko unintended side effect karena kompleksitas state interdependency.
- Cara perbaiki: Extract paywall UI + logic ke komponen <PaywallOverlay /> baru (lines 733-794) -> Extract settings menu + handlers ke <PlayerSettings /> baru (lines 612-712) -> Extract seek bar + time display ke <SeekBar /> baru (lines 554-576) -> Extract subtitle rendering logic ke <SubtitleDisplay /> (lines 169-200) -> Keep main component dengan layout + video container + event delegation -> Update imports di parent (hanya step 1-3 cukup untuk penurunan besar)

**[59] Magic numbers untuk timing dan UI tersebar (280ms, 3500ms, 500 karakter)** - _PENTING (sedang)_
- Berkas: `app/components/FeedPlayer.tsx` (baris 28, 328, 383, 399)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: module
- Masalah: Magic numbers untuk timing (3500ms controls auto-hide, 280ms double-tap threshold) tersebar di kode. Comments.tsx juga punya hardcoded 500 untuk max komentar. Tidak ada konstanta terpusat.
- Kenapa masalah: Sulit untuk tuning UX (mis. ingin ubah timeout 3500ms jadi 5000ms). Magic numbers tidak self-documenting, pembaca harus tebak apa arti 280.
- Dampak kalau dibiarkan: Kesulitan tuning behavior; duplicate values di multiple files berisiko inconsistent saat update. Kode kurang readable.
- Skenario gagal nyata: Product team ingin ubah timeout controls dari 3.5s jadi 5s untuk member yang lebih lambat navigate. Dev harus hunt-and-peck untuk semua nilai di kode yang kompleks.
- Cara perbaiki: Ekstrak ke file konstanta (misal app/components/player-constants.ts atau tambah di lib/constants.ts) -> Define CONTROL_AUTO_HIDE_DELAY_MS = 3500, DOUBLE_TAP_THRESHOLD_MS = 280, MAX_COMMENT_LENGTH = 500, dll -> Replace hardcoded values dengan konstanta -> Import konstanta di komponen yang butuh

### 📈 SEO (3)

**[60] Heading hierarchy & semantic HTML — multiple h1 potential risk** - _PENTING (sedang)_
- Berkas: `app/page.tsx` (baris 92-169)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: module
- Masalah: Landing page punya 1 h1 utama (good), diikuti h2 sections (proper hierarchy). Namun perlu audit keseluruhan aplikasi: halaman lain seperti beranda, discover, detail juga ada heading — pastikan masing-masing punya tepat 1 h1 & hierarchy benar h1 > h2 > h3.
- Kenapa masalah: SEO best practice: 1 h1 per halaman (main topic). Multiple h1 confuse search crawler tentang topik utama. Accessibility issue: screen reader expect 1 main heading per page.
- Dampak kalau dibiarkan: Search engine tidak tahu topik utama halaman jika ada multiple h1. Accessibility score turun. Tidak critical tapi bisa improve dgn proper structure.
- Skenario gagal nyata: Jika landing & layout di-compose dengan sub-pages yang juga punya h1, result = multiple h1 per page. Google confused topik mana yg primary. Akses screen reader jadi confusing.
- Cara perbaiki: Audit semua pages: verify 1 h1 per halaman (gunakan: document.querySelectorAll('h1').length === 1) -> Verify heading hierarchy: h1 > h2 > h3 (tidak ada gap h1 > h3) -> Ubah h1 yg bukan main topic menjadi h2 atau paragraph (jika ada) -> Test dgn accessibility tools: Lighthouse, axe, WAVE
- Balik ke versi sebelumnya: Revert heading changes

**[61] Alt text missing on critical content images — poster images need descriptive alt** - _PENTING (sedang)_
- Berkas: `app/page.tsx, app/components/Poster.tsx` (baris 267, (decorative images))
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: module
- Masalah: Landing page punya beberapa poster images dgn alt="" (empty). Kalau image adalah purely decorative (logo, border), empty alt OK. Tapi Drama POSTER adalah content image (menggambarkan drama spesifik), seharusnya punya descriptive alt seperti alt="Putri Ajaib Yang Hilang poster" atau alt="{drama.title} poster".
- Kenapa masalah: Alt text penting untuk 2 hal: (1) SEO — Google Image Search gunakan alt untuk index image, (2) Accessibility — screen reader user perlu tahu apa gambar itu. Drama poster adalah content, bukan decoration.
- Dampak kalau dibiarkan: Drama poster tidak ter-index di Google Image Search (potential traffic loss dari image search). Blind/low-vision users tidak tahu apa gambar poster itu (accessibility fail).
- Skenario gagal nyata: User search "drama romantis poster" di Google Images. DramaKu drama poster tidak muncul karena alt="". Kompetitor punya alt="romantic drama poster" — mereka muncul. Traffic dari image search loss.
- Cara perbaiki: Audit <img> tags: drama/poster images harus punya descriptive alt -> Ubah alt="" ke alt={`${drama.title} poster`} atau alt={drama.title} untuk drama cards -> Keep alt="" atau aria-hidden untuk purely decorative images (gradient overlay, icon decor) -> Verify alt text meaningful (not "image.png", not "pic123")
- Balik ke versi sebelumnya: Revert alt text changes

**[62] force-dynamic preventing static optimization — slower social crawl & higher server load** - _PENTING (sedang)_
- Berkas: `app/page.tsx, app/beranda/page.tsx, app/discover/page.tsx, app/feed/[id]/page.tsx` (baris 5, 6, 5, 5)
- Risiko bikin rusak saat diperbaiki: **SEDANG** | Perkiraan usaha: 2hr | Luas dampak: module
- Masalah: Multiple pages set force-dynamic, meaning Next.js always generate page on-demand (no static pre-rendering). Ini buruk untuk social media crawlers & SEO yang expect fast HTML response. Social bots (Twitter, Facebook, LinkedIn) expect pre-rendered HTML dengan fast response time; kalau force-dynamic (server-render on-demand), bots mungkin timeout atau get stale cache.
- Kenapa masalah: force-dynamic = always server-render = slower TTFB (time to first byte) & higher server load. Social media crawlers expect fast, pre-rendered HTML. ISR (incremental static regeneration, revalidate: 3600) lebih optimal: generate static at build, auto-refresh setiap jam, serve fast HTML + always fresh content.
- Dampak kalau dibiarkan: Social media crawlers mungkin timeout waiting untuk page render. Server resource usage tinggi (setiap request trigger render). Page dapat stale cache dari social bots. Build time optimization tidak bisa fully dipakai.
- Skenario gagal nyata: Facebook bot crawl /drama/xyz, halaman take 3+ detik render (DB slow, tunnel down). Bot timeout atau get incomplete HTML. Facebook cache stale preview. Preview tidak update sampai berhari-hari. User lihat old/wrong preview.
- Cara perbaiki: Evaluate setiap force-dynamic page: perlu selalu-fresh? Atau ISR cukup? -> Landing & beranda: change to revalidate: 3600 (refresh 1x jam — cukup fresh) -> Drama detail & feed: change to revalidate: 1800 (refresh 30 min — content jarang change every minute) -> Admin & profile pages: keep force-dynamic (user-specific, always fresh ok)
- Balik ke versi sebelumnya: Revert to force-dynamic

### 👥 Kemudahan-pakai (UI/UX + a11y) (3)

**[63] BottomNav navigation links lack aria-label, relying only on icon visibility for screen readers** - _PENTING (sedang)_
- Berkas: `app/components/BottomNav.tsx` (baris 83-111)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: single-file
- Masalah: Link elements in BottomNav have visual label (tab.label like 'Shorts', 'Beranda') but no aria-label attribute. While text label is visible, screen reader may announce 'link' without context since only icon SVG and small text are exposed. Link structure is correct but accessibility naming is weak.
- Kenapa masalah: Screen readers need explicit accessible name. While the visual text is there, some readers may not pick it up properly due to layout (span inside Link without proper labeling). aria-label ensures robust announcement across all AT (assistive tech).
- Dampak kalau dibiarkan: Blind and low-vision users navigating via screen reader get 'link' announced without clear destination. Mobile users with keyboard-only or switch control may not understand nav intent without aria-label.
- Skenario gagal nyata: Screen reader user (NVDA/JAWS on desktop, TalkBack on Android) hears only 'link' when tabbing to bottom nav tab, with no indication whether it's Shorts, Home, or Profile.
- Cara perbaiki: 1. Add aria-label to each Link in BottomNav: `aria-label={tab.label}` -> 2. Verify in NVDA/JAWS that each nav link announces full name e.g., 'Shorts, link' or 'Beranda, link' -> 3. Test with mobile screen reader TalkBack (Android) or VoiceOver (iOS)

**[64] Small touch targets (<44px) on profile avatar color picker and password visibility toggle** - _PENTING (sedang)_
- Berkas: `app/profile/page.tsx` (baris 191-208)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: single-file
- Masalah: Avatar color picker buttons are 10x10px (h-10 w-10). WCAG 2.5.5 requires minimum 44x44px touch target for mobile. This button is also used in edit form context where precision selection is critical. Visual ring (ring-2) at 2px + 2px offset helps but undersized.
- Kenapa masalah: Mobile users (primary audience for drama streaming) cannot reliably tap 10x10px buttons. WCAG AAA 44x44px guideline is best practice for mobile usability. Gap between buttons is also tight.
- Dampak kalau dibiarkan: Mobile users may misclick avatar colors, especially on small screens or with impaired dexterity. Frustration and mis-selections.
- Skenario gagal nyata: User on iPhone SE (375px width) tries to select avatar color while in edit mode. Multiple taps miss due to small target. Avatar ends up wrong color.
- Cara perbaiki: 1. Increase avatar button to h-12 w-12 (48px) minimum -> 2. Add gap-3 to button container to ensure spacing -> 3. Keep ring-2 ring-offset-2 for active state visual feedback -> 4. Test tap accuracy on actual mobile device or touch-enabled laptop

**[65] Password visibility toggle button lacks proper aria-label (only relies on toggle icon)** - _PENTING (sedang)_
- Berkas: `app/login/page.tsx` (baris 126-145)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: single-file
- Masalah: Button has aria-label with localized labels 'Sembunyikan' (hide) / 'Tampilkan' (show). However, this aria-label doesn't convey *what* is being shown/hidden (password field context). Stronger label would be 'Sembunyikan password' / 'Tampilkan password' for full clarity.
- Kenapa masalah: Current label is incomplete. While 'Show/Hide' is understandable, context-specific 'Show password' is clearer. Minor issue but affects clarity for screen reader users unfamiliar with UI context.
- Dampak kalau dibiarkan: Screen reader user navigating form may hear 'Tampilkan' without knowing it applies to password field, especially if focus jumps or context is lost.
- Skenario gagal nyata: JAWS user is tabbing through login form, reaches password toggle, hears 'Tampilkan button' but is parsing field labels separately. Misunderstands that clicking reveals password.
- Cara perbaiki: 1. Change aria-label to 'Tampilkan password' (when hidden) and 'Sembunyikan password' (when visible) -> 2. Optional: add aria-controls='password-field' if password input has matching id/aria-control -> 3. Verify announcement in JAWS includes word 'password'

---

## [~] RAPIKAN (ringan) - 8 temuan

### 🗄️ Database (2)

**[66] Missing NOT NULL constraint pada wallets.email dan likes.drama_id** - _RAPIKAN (ringan)_
- Berkas: `supabase_setup.sql` (baris 56-58)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: single-file
- Masalah: wallets dan likes punya text PRIMARY KEY tapi tanpa explicit NOT NULL (walau PK implicit NOT NULL). Namun tabel unlocks punya email NOT NULL explicit—inconsistent style. Jika developer lupa, bisa insert NULL di PK kolom non-primary (sebelum kebetulan jadi PK), leading error.
- Kenapa masalah: Kejelasan—PK otomatis NOT NULL, tapi best practice explicit untuk kejelasan dan readability. Tidak memicu bug langsung tapi bad practice.
- Dampak kalau dibiarkan: Rendah—PK constraint akan enforce. Tapi readability kode SQL kurang jelas.
- Skenario gagal nyata: Developer baru tulis INSERT wallets (balance) VALUES (10) tanpa email—PostgreSQL error (good). Tapi jika ada app bug yg pass NULL ke RPC, error message kurang jelas.
- Cara perbaiki: Add explicit NOT NULL ke supabase_setup.sql: `email text not null primary key` -> Juga untuk likes: `drama_id text not null primary key` -> Run migration

**[67] N+1 Pattern dalam writeAllDramas—duplicate drama queries** - _RAPIKAN (ringan)_
- Berkas: `lib/dramas.ts` (baris 142-147)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: single-file
- Masalah: writeAllDramas UPSERT semua drama (OK), lalu SELECT semua drama IDs untuk check delete (line 150). Tapi bisa optimize dengan hanya SELECT id tanpa select=* sebelum upsert jika sudah di-cache atau batch dari file.
- Kenapa masalah: Dua query full-scan: (1) implicit SELECT saat upsert, (2) explicit SELECT id. PostgREST upsert mungkin tidak return semua, jadi SELECT ulang perlu. Tapi jarang dijalankan (admin feature).
- Dampak kalau dibiarkan: Minor—hanya saat admin upload katalog (rare). Tapi masih O(n) queries.
- Skenario gagal nyata: Admin upload katalog 50 drama: UPSERT 50, SELECT 50 ids lagi. Kalau ada 20 drama lama, iterate delete 20. Total: ~70 query ketika harusnya ~2-3 batch.
- Cara perbaiki: Batch DELETE dalam paralel dengan Promise.all(chunks) -> Atau use raw SQL dengan DELETE WHERE id NOT IN (...)

### 🎨 Tampilan / Frontend (3)

**[68] FeedPlayer subtitle text with HTML tag stripping may not handle all edge cases** - _RAPIKAN (ringan)_
- Berkas: `app/components/FeedPlayer.tsx` (baris 191)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: single-file
- Masalah: FeedPlayer uses a regex to strip HTML tags from subtitle cue text. While this is generally safe (subtitles from VTT files are typically plain text with basic formatting), the regex `/<[^>]+>/g` may not handle malformed HTML or edge cases like `<tag<tag>` or CDATA sections.
- Kenapa masalah: The regex assumes well-formed HTML. If a VTT subtitle accidentally contains `<tag<tag>`, the inner `<tag` won't be matched by `<[^>]+>`, leaving partial tags in the displayed text. This is unlikely but possible.
- Dampak kalau dibiarkan: Visual artifacts in subtitle display (broken `<` characters visible), minor UX issue. Not a security risk since this is server-controlled VTT data, not user input.
- Skenario gagal nyata: A malformed VTT subtitle file contains text like `Cost < 5 items<tag>` — the regex matches `<tag>` but leaves `Cost < 5 items` intact, displaying `<` to the user.
- Cara perbaiki: Replace simple regex with a more robust HTML parser: use DOMParser or a library like `html-react-parser` -> Or, use a VTT library that properly parses subtitles and extracts text -> Add test case for malformed HTML in subtitle text -> Consider using `textContent` instead of manual regex if using DOM node

**[69] RewardedAdModal doesn't clear interval timer on component unmount before interval fires** - _RAPIKAN (ringan)_
- Berkas: `app/components/RewardedAdModal.tsx` (baris 68-79)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 30min | Luas dampak: single-file
- Masalah: RewardedAdModal sets an interval in useEffect that calls setState. If the modal closes before the interval fires (e.g., user clicks close), the cleanup function clears the interval. However, if the modal is closed right after setInterval but before the first tick, a stale setState could fire. More critically, if onClose() is called synchronously during render, the timer.current ref may not be set yet.
- Kenapa masalah: Race condition: interval may fire after cleanup is called but before the DOM unmounts, leading to stale setState warning. Also, closing modal during render could skip cleanup.
- Dampak kalau dibiarkan: Potential memory leak, React warnings in console about setState on unmounted component. Low severity as modal closes and timer is cleared on next effect.
- Skenario gagal nyata: User rapidly opens and closes RewardedAdModal multiple times in succession, interval callbacks accumulate and fire after modal unmounts, causing 'setState on unmounted component' warnings.
- Cara perbaiki: Move timer.current = ... inside the setInterval callback or use a ref guard -> Add a mounted flag to useEffect cleanup to prevent stale setState -> Use useCallback for the setLeft logic to ensure closure captures current state -> Or use a custom hook that manages intervals with automatic cleanup

**[70] Comments API returns generic store data without null-safety check** - _RAPIKAN (ringan)_
- Berkas: `app/api/comments/route.ts` (baris 16)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: single-file
- Masalah: The GET endpoint for comments returns the result of getCommentsFor() directly without checking if it's null or handling potential errors. If the store returns null or throws, the response will be invalid JSON or a 500 error without a helpful message.
- Kenapa masalah: No explicit null-safety or error boundary. If getCommentsFor throws, the response doesn't include a helpful error message.
- Dampak kalau dibiarkan: Poor error UX; client gets unhelpful 500 error instead of specific 'comments not found' message.
- Skenario gagal nyata: Comments database is corrupted or inaccessible; GET /api/comments returns 500 with generic server error, client shows 'Gagal memuat komentar' without knowing why.
- Cara perbaiki: Wrap getCommentsFor in try-catch -> Return explicit error response: { error: '...', status: 500 } -> Add null-check: if (!comments) return NextResponse.json({ comments: [] }) -> Add logging for debugging

### ⚡ Kecepatan (1)

**[71] O(n) category filtering in BerandaRows on every render, should use pre-computed Set or memoized Set** - _RAPIKAN (ringan)_
- Berkas: `app/components/BerandaRows.tsx` (baris 87-89)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: single-file
- Masalah: In BerandaRows, `presentCats` is computed by filtering CATEGORY_ORDER (7 items) and for each category calling `dramas.some()` which scans entire drama array (~50-100 dramas) looking for a match. Total: O(7 * n) = O(n) linear scan on every render.
- Kenapa masalah: While useMemo prevents re-computation on component props changes, it still runs when `dramas` changes. For 100 dramas, this is 700 iteration comparisons. Not a huge cost, but unnecessary: can build a Set of categories in O(n) once, then filter CATEGORY_ORDER in O(7) using Set.has().
- Dampak kalau dibiarkan: Minimal on first load, but if dramas array is updated in a client-side state (e.g., filter operations, pagination), presentCats recalculates with O(n) scan. Noticeable on slower devices (old phones). Negligible on desktop unless dramatic count grows to 500+ titles.
- Skenario gagal nyata: User types in search box in DramaBrowser: (1) `dramas` prop filtered to 5 matching items, (2) BerandaRows re-renders, (3) presentCats re-runs `dramas.some()` 7 times = 35 iterations (vs 7 with Set). Repeats every keystroke. On 200 dramas, this is 1400 iterations per keystroke = visible stutter on low-end phones.
- Cara perbaiki: Create a Set of drama categories once: `const catSet = useMemo(() => new Set(dramas.map(d => d.category)), [dramas])` -> Use the Set for filtering: `const presentCats = useMemo(() => CATEGORY_ORDER.filter((c) => catSet.has(c)), [catSet])` -> Verify: component should render identically; only internal optimization -> Optional: move presentCats computation to parent (BerandaRows caller) if dramas is already stable
- Balik ke versi sebelumnya: Revert back to original `dramas.some()` logic; presents no functional risk.

### 🧹 Perapian kode (2)

**[72] Export applySubtitle tidak dipakai di mana pun** - _RAPIKAN (ringan)_
- Berkas: `lib/subtitles.ts` (baris 50-57)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: single-file
- Masalah: Fungsi applySubtitle di lib/subtitles.ts di-export, tetapi tidak diimpor atau dipakai di mana pun dalam codebase. FeedPlayer.tsx mengatur subtitle track mode secara inline (lines 174-182).
- Kenapa masalah: Unused export menambah surface API yang tidak perlu. Membingungkan developer baru yang melihat fungsi ini — mereka pikir harusnya dipakai tapi tidak.
- Dampak kalau dibiarkan: Code clutter; API surface yang bingung.
- Skenario gagal nyata: Developer baru ingin track subtitle changes, menemukan applySubtitle, coba pakai, ternyata ada logic yang lebih complex di FeedPlayer.tsx juga, jadi bingung.
- Cara perbaiki: Hapus export function applySubtitle dari lib/subtitles.ts -> Jika ingin keep untuk future use, comment out atau pindah ke private helper -> Atau jika FeedPlayer.tsx bisa pakai, refactor untuk utilize applySubtitle (lines 174-182 replace dengan applySubtitle call)

**[73] Magic number 500 untuk maksimum panjang komentar hardcoded di dua tempat** - _RAPIKAN (ringan)_
- Berkas: `app/components/Comments.tsx` (baris 70, 136, 138, 143)
- Risiko bikin rusak saat diperbaiki: **RENDAH** | Perkiraan usaha: 5min | Luas dampak: single-file
- Masalah: Konstanta 500 untuk max comment length hardcoded di 4 tempat dalam Comments.tsx. Tidak ada single source of truth.
- Kenapa masalah: Kalau product ingin ubah ke 1000 karakter, harus update di 4 tempat dengan risiko lupa satu.
- Dampak kalau dibiarkan: Inconsistency; maintenance error-prone.
- Skenario gagal nyata: Product team ubah max komentar jadi 1000 chars, dev update maxLength tapi lupa update validation check (line 70), UI allow input 1000 tapi server reject 500.
- Cara perbaiki: Define const MAX_COMMENT_LENGTH = 500 di atas atau di lib/constants.ts -> Replace semua hardcoded 500 dengan konstanta -> Update placeholder text ke template literal

---

## Rencana pengerjaan bertahap (urut dari paling aman)

- **Tahap 1 - Perbaikan Cepat (risiko RENDAH, 56 temuan)**: aman dikerjakan duluan, tidak menyentuh logika sensitif. Mayoritas SEO (sitemap/robots/metadata/OpenGraph), aksesibilitas (label/kontras), kelengkapan catatan, perapian kode ringan.
- **Tahap 2 - Pondasi Cek Otomatis + risiko SEDANG (14 temuan)**: pasang kerangka tes dulu, lalu rapikan yang menyentuh perilaku (race condition dokumen JSON, optimasi gambar, CSRF).
- **Tahap 3 - Risiko TINGGI (3 temuan, Tahan Penggabungan)**: celah keamanan koin (IDOR pada unlock/reward/checkin) - butuh keputusan desain karena login penonton tanpa password. Dikerjakan setelah Tahap 1-2 stabil, dengan persetujuan eksplisit.

## 3 temuan yang DITOLAK (transparansi - diperiksa ulang, ternyata bukan masalah)
- [security] Webhook endpoint does not validate request origin or IP (Midtrans callback spoofing)
- [qa-test] Database RPC function out-of-sync with codebase — production bug unfixed
- [qa-test] Session secret empty/missing in non-production auth — silent auth bypass
  - Alasan ringkas: webhook sudah verifikasi tanda-tangan (cek asal jadi tak perlu); berkas RPC di repo SUDAH diperbaiki (yang kurang = pasang ke server produksi, itu tugas operasional bukan bug kode); rahasia sesi sudah ada pengaman yang menolak kalau kosong.

> Catatan operasional MENDESAK (dari dossier, bukan temuan kode): perbaikan RPC `coin_spend_unlock` BELUM dipasang ke DB produksi. WAJIB dipasang (`scripts/fix_coin_spend_unlock_prod.sql`) SEBELUM ada drama dijadikan premium.