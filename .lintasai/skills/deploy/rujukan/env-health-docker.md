# Rujukan deploy — env fail-fast, health check, Dockerfile, caching + contoh kode (§2 butir 10-13 & §3)
> Bagian dari `skills/deploy` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
Isi penuh `skills/deploy/SKILL.md` §2 butir 10-13 + seluruh contoh kode §3 (Powerful).

10. 📐 **Validasi env fail-fast saat startup (zod v4).** Validasi SEMUA env var sekali di startup pakai schema. Kalau ada yang salah/kosong → app **BERHENTI di titik itu** dengan pesan jelas, bukan `undefined` yang meledak jauh di dalam alur (susah dilacak). Contoh kode → 🧪 bagian bawah berkas ini (isi SKILL.md §3).
    - ⚠️ **Sadar-versi:** contoh pakai **zod v4** (`z.url()`). Project masih **zod v3**? ganti `z.url()` → `z.string().url()`. Cek versi terpasang: `npm ls zod`.
    - 🙂 Non-Programmer: SEMUA setelan rahasia (kata sandi, alamat database) dicek di awal; kalau ada yang salah/hilang, app TIDAK dijalankan — bukan macet di tengah saat pengunjung sudah ramai (jauh lebih sulit ditelusuri).
11. 📐 **Health check berlapis (`/api/health` + `/api/health/detailed`).** Pelengkap `templates/PRODUCTION_OBSERVABILITY.md` Pilar 3 (yang sudah punya `/api/health` sederhana) — yang ditambah di sini: (a) tolak env salah SEBELUM app hidup (butir 10), (b) health check DALAM (cek database) buat monitoring internal. `/api/health` = cek CEPAT (buat *load balancer* (pembagi beban lalu lintas ke banyak server) / uptime monitor — balikan 200 selama proses hidup). `/api/health/detailed` = cek DALAM (ping DB/redis; balikan **503** kalau ada yang sakit, plus `version` + `uptime`) buat monitoring internal. (Di Next.js App Router, berkas `app/api/health/route.ts` **pasti** ter-map ke URL `/api/health` — bukan `/health`; samakan alamat di uptime monitor & probe.) Contoh kode → 🧪 bagian bawah berkas ini (isi SKILL.md §3).
    - 🔒 **Keamanan:** di Next.js/Vercel, route seperti ini **publik secara default**. `/api/health/detailed` membocorkan lebih dari sekadar `version`: `uptime` dan status hidup/mati DB pun sebaiknya TAK terbuka untuk anonim (peta permukaan-serang gratis). **Mitigasi UTAMA — batasi akses:** token/middleware, atau kunci ke jaringan internal monitoring (endpoint hanya terjangkau uptime monitor, bukan publik). Membuang `version` cuma **pelengkap** (menutup satu petunjuk pencocokan celah per-versi), BUKAN pengganti pembatasan akses — sebab `uptime` + status DB tetap bocor. (Selaras standar keamanan kit: jangan bocorkan info sistem.)
    - **Kubernetes** (kalau pakai): pisahkan 3 *probe* (pemeriksa berkala) — `liveness` (restart kalau macet), `readiness` (boleh terima traffic?), `startup` (beri waktu start lama sebelum dinilai). Arahkan `liveness`/`startup` ke `/api/health` (cepat, jangan yang cek-DB → hindari restart beruntun saat DB dipakai bersama); `readiness` boleh ke `/api/health/detailed` bila ingin 503-saat-DB-sakit benar-benar menarik pod dari traffic (sadar efek beruntun bila DB shared ikut mati).
    - 🙂 Non-Programmer: dua jenis cek kesehatan — yang cepat (masih hidup atau tidak) dan yang teliti (bagian dalam sehat? mis. koneksi database). Kalau bagian dalam bermasalah, app bilang "jangan kirim pelanggan ke saya dulu" (kode 503).
12. 📐 **Dockerfile produksi (multi-stage) — 5 aturan wajib.** Kalau kemas app pakai Docker, image produksi WAJIB: (1) **multi-stage** (deps → build → runner) biar image kecil; (2) **user non-root** (`adduser` + `USER`); (3) **`HEALTHCHECK`** nembak `/api/health`; (4) **pin base image** (`node:24-alpine`, BUKAN `:latest`; node:20 sudah EOL); (5) **`.dockerignore`** (buang `node_modules`/`.env*`/`.git`). Contoh LENGKAP (Next.js standalone + varian Python + hardening compose `no-new-privileges`/`read_only`/`cap_drop`) di `templates/STACK_MIGRATION_GUIDE.md` §2.3.
    - 🙂 Non-Programmer: paket app dibangun bertahap (kecil + cepat), dijalankan dengan akun terbatas bukan admin (aman kalau dibobol), punya indikator sehat/rusak, pakai versi software yang masih didukung. Cukup ikuti contoh lengkap di STACK_MIGRATION_GUIDE.
13. 📐 **Caching & Revalidate Next.js (sadar-versi) — pembeda app "powerful" vs lambat/basi.**
    - Pilih SADAR per-halaman: **static** (default, tercepat, konten jarang berubah) · **ISR** (`export const revalidate=<detik>`, boleh basi sebentar) · **dynamic** (`force-dynamic`, per-user/real-time).
    - **Sesudah MUTASI (Server Action/route) → invalidasi terarah:** `revalidateTag('<tag>')` (fetch pakai `{next:{tags:[...]}}`) / `revalidatePath('/path')`. Tanpa ini → user lihat data BASI ("kok belum berubah?").
    - ⚠️ **Default caching BERUBAH antar-versi Next** (`fetch` tak lagi di-cache default di 15+; `'use cache'` eksperimental) — WAJIB cek versi TERPASANG, jangan dari ingatan.
    - 💡 Cache = tuas LCP/TTFB (lengkapi Web Vitals); tapi cache respons per-user tanpa scope = data bocor antar-user → JANGAN.

---

## 🧪 3 contoh kode siap-adaptasi (isi penuh SKILL.md §3 — Powerful)

🧪 **CONTOH KASUS `lib/env.ts` — validasi env fail-fast (zod v4, ambil polanya, jangan salin mentah — netralkan ke schema project):**

```ts
// lib/env.ts — dipanggil PALING AWAL (sebelum server mulai menerima request)
import * as z from "zod";
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]),  // 'test' WAJIB — Jest/Vitest set NODE_ENV=test; sesuaikan daftar ke environment project kamu
  PORT: z.coerce.number().default(3000),   // process.env selalu string → coerce jadi angka
  DATABASE_URL: z.url(),                    // zod v4: z.url()  |  zod v3: z.string().url()
  JWT_SECRET: z.string().min(32),           // rahasia < 32 huruf = DITOLAK saat start
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});
export const env = envSchema.parse(process.env); // gagal di sini = app berhenti + error jelas
```

🧪 **CONTOH KASUS `/api/health` — cek CEPAT:**

```ts
// app/api/health/route.ts — cek CEPAT
export async function GET() { return Response.json({ status: "ok" }); }
```

> ⚠️ **BERKAS TERPISAH** — snippet `detailed` di bawah tinggal di `app/api/health/detailed/route.ts`, BUKAN berkas yang sama dengan di atas. Jangan tempel keduanya ke satu berkas: dua `export async function GET` dalam satu berkas = error build **"Duplicate export GET"**.

🧪 **CONTOH KASUS `/api/health/detailed` — cek DALAM:**

```ts
// app/api/health/detailed/route.ts — cek DALAM
import { db } from "@/lib/db";            // WAJIB: klien DB project (Prisma: '@/lib/db'). Tanpa baris ini → build gagal "Cannot find name 'db'".
async function cekDB() {
  try { await db.$queryRaw`SELECT 1`; return { status: "ok" as const }; }
  catch { return { status: "error" as const, pesan: "DB tak terjangkau" }; }
}
export async function GET() {
  const checks = { database: await cekDB() };
  const sehat = Object.values(checks).every((c) => c.status === "ok");
  return Response.json(
    { status: sehat ? "ok" : "degraded", version: process.env.APP_VERSION ?? "unknown",
      uptime: process.uptime(), checks },
    { status: sehat ? 200 : 503 },  // 503 = "aku belum siap" → orchestrator tak kirim traffic
  );
}
```

> 🔒 Ingat pagar butir 11 di atas — route `/api/health/detailed` publik-default, batasi aksesnya (token/middleware/jaringan internal) sebelum tayang.
