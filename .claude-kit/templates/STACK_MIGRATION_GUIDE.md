# templates/STACK_MIGRATION_GUIDE.md - Panduan Migrasi Stack (Advanced)

> Versi 2 · 2026-07-11
> **POST-LAUNCH ADVANCED.** Default tim pakai Vercel - file ini cuma untuk fase migrasi spesifik (cost Vercel over-budget, butuh background worker persistent, atau butuh WebSocket long-lived).

---

## 1. Pengantar

File ini = **pendamping `STACK_GUIDE.md`** untuk fase migrasi vendor hosting.

**JANGAN baca file ini di Day 0-1.** Staff IT non-programmer fase awal cukup pakai Vercel + Supabase sesuai `STACK_GUIDE.md` section 3.

**Baru relevan kalau:**

- Bill Vercel sudah lewat budget (umumnya >$100/bulan untuk satu project) DAN owner sudah verifikasi penyebabnya bukan misconfiguration (mis. ISR revalidate kekecilan, image optimization mati).
- Butuh **background worker persistent** (Vercel function = serverless, mati setelah HTTP response selesai → tidak cocok untuk job antrian panjang, polling DB terus-menerus, dll.).
- Butuh **WebSocket / Server-Sent Events long-lived connection** (Vercel Edge punya batasan koneksi durasi pendek).
- Owner sudah baca Decision Matrix di `STACK_GUIDE.md` section 9 dan memutuskan pindah.

> *Background worker* = proses yang jalan terus-menerus di server (bukan response per request HTTP). Contoh: pengirim email batch, scraper jadwal, queue processor.

---

## 2. Railway Migration Guide

Kapan pilih Railway:

- Butuh background worker persistent + cron native gratis.
- Mau tetap pakai stack Docker-portable (tidak vendor-lock seperti Vercel Edge).
- Tim sudah familiar Nixpacks atau Dockerfile.

### 2.1. Provision

1. https://railway.app → New Project → Deploy from GitHub.
2. Add PostgreSQL plugin (klik **+ New** → Database → PostgreSQL).
3. Connection string auto-inject ke service via `${{ Postgres.DATABASE_URL }}`.

### 2.2. Env Vars

Service → Variables → tambah satu per satu, atau import dari `.env`.

```text
DATABASE_URL = ${{ Postgres.DATABASE_URL }}
NEXT_PUBLIC_SITE_URL = https://akses.up.railway.app
```

### 2.3. Dockerfile vs Nixpacks

- **Nixpacks** (default) - auto-detect Next.js, no config. Pilih ini dulu.
- **Dockerfile** - kalau butuh dependency native (ImageMagick, FFmpeg, Chromium) atau mau kontrol penuh image produksi.

#### Dockerfile produksi Next.js (multi-stage, non-root, HEALTHCHECK)

> 👨‍💻 **Programmer:** 3 tahap (deps → builder → runner) untuk image kecil + aman. Kunci: (1) `COPY` file dependency DULU sebelum kode → *layer cache* (lapisan hasil build yang dipakai-ulang) tak bobol saat cuma kode berubah; (2) jalan sebagai **user non-root** — kalau image dibobol, penyerang tak langsung jadi admin; (3) `HEALTHCHECK` supaya Docker/orchestrator tahu container sehat/tidak (nembak `/api/health` — endpoint-nya di §2.5 di bawah, atau §health di `workflows/stack/4.14-4-deploy.md`); (4) **pin versi** base image (JANGAN `:latest` — bisa loncat ke versi belum-LTS). Butuh `output: 'standalone'` di `next.config.js`.
> 🙂 **Non-Programmer:** kemas app jadi "paket beku" yang dibangun bertahap biar cepat, dijalankan "pegawai biasa" bukan "admin" (lebih aman kalau dibobol), dan punya "lampu indikator sehat/rusak". Pakai "suku cadang" (Node) versi yang masih didukung, bukan yang sudah ditarik dari pasaran.

```dockerfile
# node:24-alpine = LTS "Active" per 2026-07 (node:20 sudah EOL/habis-dukungan → tanpa patch
# keamanan; JANGAN :latest). Samakan angka ini dgn runtime project (package.json "engines"/.nvmrc).

# --- Tahap 1: deps (cache layer dependency) ---
FROM node:24-alpine AS deps
WORKDIR /app
# npm: package-lock.json + `npm ci` (di bawah). Pengguna pnpm/yarn SESUAIKAN — lockfile + installer beda
# (samakan dgn app-cicd.yml.example):
#   pnpm → COPY pnpm-lock.yaml ./ ; RUN corepack enable && pnpm i --frozen-lockfile
#   yarn → COPY yarn.lock ./       ; RUN yarn install --frozen-lockfile
COPY package.json package-lock.json ./   # file dependency DULU → cache tak bobol saat cuma kode berubah
RUN npm ci

# --- Tahap 2: builder ---
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build                        # butuh output: 'standalone' di next.config.js

# --- Tahap 3: runner (image produksi minimal, non-root) ---
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"                    # WAJIB: paksa server dengar SEMUA alamat jaringan. Tanpa ini
ENV PORT=3000                             # sebagian versi Next bind ke localhost → app tak terjangkau
                                          # dari LUAR container (healthcheck lokal tetap lolos = rusak tersamar).
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
USER nextjs                              # JANGAN jalan sebagai root
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
EXPOSE 3000
# wget di node:*-alpine = BusyBox (versi mini): HANYA kenal -q & --spider (BUKAN --no-verbose/--tries).
# Flag salah → healthcheck selalu error → container ditandai "unhealthy" walau app sebenarnya sehat.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
```

**`.dockerignore` (WAJIB — image kecil + rahasia tak ikut terkemas):**

```
node_modules
.next/cache
.git
.env
.env.*
coverage
*.log
Dockerfile*
docker-compose*.yml
README.md
```

#### Varian Python (FastAPI / Django)

> ⚠️ Django & FastAPI beda "jenis mesin": **Django = WSGI**, **FastAPI = ASGI**. Tahap `builder` sama, tapi **baris `CMD` (perintah menjalankan app) BEDA** — pilih yang benar di bawah, jangan tertukar (kalau tertukar, container gagal nyala).

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
RUN pip install --no-cache-dir uv
COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app
RUN useradd -r -u 1001 appuser
USER appuser                             # non-root
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY . .
ENV PYTHONUNBUFFERED=1
EXPOSE 8000
# Healthcheck: Django default pakai trailing-slash (/health/); FastAPI biasanya /health (tanpa slash) — sesuaikan.
# --start-period=15s: beri jeda saat boot (Django migrasi otomatis = start lambat) sebelum dinilai — tanpa ini
# container keburu ditandai "unhealthy" lalu masuk restart-loop. --retries=3: butuh 3 gagal beruntun (anti false-positive).
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/')" || exit 1
# --- Pilih SATU CMD sesuai framework (hapus yang lain) ---
# Django (WSGI): entry point `config.wsgi`, gunicorn worker sync bawaan sudah cukup.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
# FastAPI (ASGI — BUKAN WSGI): WAJIB worker uvicorn; app umumnya `main:app`, TAK punya `config.wsgi`.
# Worker class dari paket TERPISAH `uvicorn-worker` (tambahkan `uvicorn-worker` ke requirements.txt agar ikut
# ke-install di tahap builder). Modul lama `uvicorn.workers.UvicornWorker` USANG sejak uvicorn 0.30 (masih jalan
# tapi keluar DeprecationWarning, akan dihapus). Cek versi terpasang: `pip show uvicorn` — kalau < 0.30, paket
# `uvicorn-worker` belum ada, tetap pakai `-k uvicorn.workers.UvicornWorker`.
# CMD ["gunicorn", "main:app", "-k", "uvicorn_worker.UvicornWorker", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

#### Hardening docker-compose (produksi)

```yaml
services:
  app:
    security_opt: ["no-new-privileges:true"]  # proses tak bisa naik-hak diam-diam
    read_only: true                           # sistem file image cuma-baca (anti-tamper)
    # Next.js ISR/revalidate & cache runtime menulis ke /app/.next/cache → WAJIB di-tmpfs.
    # Tanpa ini: error EROFS di PRODUKSI (lolos di dev/CI yang tak read-only). App tanpa
    # penulisan runtime (SSR murni / static export) boleh sisakan /tmp saja.
    tmpfs: [/tmp, /app/.next/cache]           # folder tulis SEMENTARA yang diizinkan
    # PENTING kalau app menulis ke folder LAIN saat jalan — jangan asal masukkan ke tmpfs:
    #   • tulis SEMENTARA (cache/temp) → tambahkan ke tmpfs di atas. Ingat: tmpfs = RAM,
    #     HILANG tiap restart & TIDAK berbagi antar-replica.
    #   • data yang HARUS bertahan (mis. upload user) → pakai `volumes:` (named volume),
    #     JANGAN tmpfs (kalau tmpfs, file upload lenyap tiap container restart).
    cap_drop: [ALL]                           # buang semua "izin super" Linux; tambah seperlunya saja
```

> *Sumber: ECC docker-patterns + deployment-patterns (MIT © Affaan Mustafa) — ditulis-ulang; base image dinaikkan node:20 (EOL) → node:24-alpine, worker uvicorn dimodernkan ke paket `uvicorn-worker` (uvicorn ≥ 0.30) (verifikasi 2026-07-11).*

### 2.4. Background Worker + Cron Native

Railway dukung worker service terpisah dari web. Add **+ New Service** → pilih repo yang sama, set start command beda:

```text
Web service:    npm run start    (= next start)
Worker service: npm run worker   (= node dist/worker.js)
```

Cron: pakai package `node-cron` di worker service, atau Railway **Cron Job** (klik service → Settings → Cron Schedule).

### 2.5. Healthcheck Endpoint

Railway monitor `GET /api/health` (configurable). Bikin route:

```ts
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok', ts: Date.now() })
}
```

---

## 3. Render Migration Guide (Alternative)

Mirip Railway, tapi UI beda + pricing model beda. Pilih Render kalau:

- Mau spending limit ketat (Render lebih predictable per service).
- Tim sudah familiar Render (mis. pakai untuk proyek lain).

### 3.1. Web Service + DB Terpisah

1. https://render.com → New → **PostgreSQL** → pilih region + plan.
2. New → **Web Service** → connect GitHub repo.
3. Connection string DB di-copy manual ke env var `DATABASE_URL`.

### 3.2. Build / Start Command

```text
Build Command: npm ci && npm run build
Start Command: npm run start
```

Untuk Next.js standalone:

```text
Start Command: node .next/standalone/server.js
```

### 3.3. Background Worker + Cron

- **Background Worker**: New → Background Worker → set start command sama dengan worker proyek (mis. `npm run worker`).
- **Cron Job**: New → Cron Job → schedule pakai sintaks cron (`0 */6 * * *` = tiap 6 jam) + command (`npm run cron:cleanup`).

---

## 4. Checklist Pre-Migration (Sebelum Pindah dari Vercel)

Sebelum eksekusi migrasi, pastikan:

- [ ] Sudah verifikasi bill Vercel bukan akibat misconfiguration (cek `Project → Usage`, bandingkan dengan optimasi: ISR revalidate, image optimization, function region).
- [ ] Sudah baca `STACK_GUIDE.md` section 9 (Decision Matrix) dan paham trade-off vendor lock-in.
- [ ] Backup DB Supabase aktif (Settings → Database → Backups).
- [ ] Rollback plan siap: kalau migrasi gagal, balik ke Vercel via DNS switch (TTL DNS ≤5 menit sebelum cutover).
- [ ] Custom domain SSL siap di vendor baru (Railway/Render auto-handle, tapi propagation DNS bisa 1-24 jam).
- [ ] Env vars sensitif sudah di-copy ke vendor baru dan di-mark Sensitive/Secret.
- [ ] Tim yang punya akses Vercel sudah diberi akses Railway/Render (least privilege).

---

## 5. Referensi Eksternal

- Railway docs: https://docs.railway.app
- Render docs: https://render.com/docs
- Decision Matrix vendor: `templates/STACK_GUIDE.md` section 9
- Default workflow (sebelum migrasi): `templates/STACK_GUIDE.md` section 3 (Vercel Setup)

---

> **Update file ini** tiap kali ada perubahan flow Railway/Render (UI dashboard, pricing tier, atau best practice). Catat di `CHANGELOG.md` kit + bump versi.
