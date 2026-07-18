# templates/STACK_GUIDE.md - Panduan Stack Standar Tim AI-first

> Versi 2 · 2026-07-10 · +§5 Database (index/audit/tipe data) + caveat proxy.ts Next 16

---

## 1. Pengantar

> ⚠️ **PENTING — panduan ini KHUSUS stack Next.js + Vercel + Supabase**, bukan "universal lintas-stack". Kalau proyekmu pakai stack lain (Python/Django, Go, Rust, PHP/Laravel, dll.), JANGAN paksakan panduan ini — minta AI buatkan panduan sesuai stack-mu (AI deteksi stack via `STACK_DETECTION_PATTERN.md` lalu menyesuaikan). Yang "universal" di kit ini adalah **aturan kerja** (`CLAUDE_universal_v1.md`), bukan pilihan stack.

File ini = **panduan opinionated** untuk stack standar tim AI-first.
Target stack default:

- **Frontend + Backend** → Next.js (lihat STACK_VERSIONS.md untuk versi terbaru) (App Router) + TypeScript 5+
- **Hosting primary** → Vercel (deploy auto dari Git)
- **Database** → Supabase (PostgreSQL managed)
- **UI** → Tailwind 4 + shadcn/ui
- **Future migration path** → Railway / Render (kalau butuh background worker native atau biaya Vercel kelebihan)

### Filosofi opinionated

- **Satu cara untuk satu hal** - jangan campur Pages Router & App Router, jangan campur Server Action & client-fetch untuk mutation.
- **Server-first** - default Server Component, baru ke Client kalau butuh interaktivitas.
- **Vendor-aware tapi tidak vendor-locked** - pakai Vercel sampai mahal, lalu pindah ke Railway/Render. Jangan pakai fitur Vercel-only kalau ada padanan portable.
- **AI-first** - semua konvensi di file ini juga dibaca AI tiap sesi → AI nulis kode yang konsisten tanpa user perlu ulang-ulang aturan.

> *Opinionated* = punya pendapat tegas soal cara kerja. Lawannya *unopinionated* (bebas pilih cara apa saja, tapi tim jadi berantakan).

---

## 2. Next.js App Router Convention

### 2.1. Server Component vs Client Component

**Default = Server Component** (tanpa `'use client'` di atas file).

Kapan pakai `'use client'`:

| Butuh                                            | Pakai `'use client'`? |
|--------------------------------------------------|------------------------|
| `useState`, `useEffect`, `useRef`                | YA                     |
| Event handler (`onClick`, `onChange`, `onSubmit`)| YA                     |
| Browser API (`window`, `localStorage`, `navigator`) | YA                  |
| Library client-only (mis. Framer Motion, Chart.js) | YA                   |
| Cuma render data dari DB / API                   | TIDAK (Server saja)    |
| Form static (pakai Server Action)                | TIDAK (Server saja)    |

**Pola yang benar**: Server Component sebagai *shell*, Client Component sebagai *island* interaktif kecil.

```tsx
// app/dashboard/page.tsx - Server Component (default)
import { db } from '@/lib/db'
import { LikeButton } from './like-button' // ini Client

export default async function DashboardPage() {
  const posts = await db.post.findMany() // fetch langsung di Server

  return (
    <div>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <LikeButton postId={post.id} /> {/* island interaktif */}
        </article>
      ))}
    </div>
  )
}
```

```tsx
// app/dashboard/like-button.tsx - Client Component
'use client'
import { useState } from 'react'

export function LikeButton({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false)
  return <button onClick={() => setLiked(!liked)}>{liked ? '♥' : '♡'}</button>
}
```

### 2.2. Data Fetching

**WAJIB**: fetch data di **Server Component** pakai `async/await` langsung.
**JANGAN**: pakai `useEffect` + `fetch` di Client Component untuk initial data.

```tsx
// BENAR - Server Component
export default async function Page() {
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 60 } // ISR: re-fetch tiap 60 detik
  }).then(r => r.json())
  return <div>{data.title}</div>
}

// SALAH - useEffect di Client Component untuk initial data
'use client'
export default function Page() {
  const [data, setData] = useState(null)
  useEffect(() => { fetch('...').then(...) }, []) // loading spinner, SEO buruk
}
```

Kapan pakai client-fetch (`SWR`, `React Query`, `useEffect+fetch`): **hanya** kalau data harus auto-refresh per interval atau triggered by user action setelah halaman load.

### 2.3. Metadata SEO

Setiap route export `metadata` (static) atau `generateMetadata` (dynamic).

```tsx
// Static metadata
export const metadata = {
  title: 'Dashboard | Akses',
  description: 'Panel admin proyek <project>.',
  openGraph: {
    title: 'Dashboard | Akses',
    description: 'Panel admin proyek <project>.',
    images: ['/og-dashboard.png'],
  },
}

// Dynamic metadata (per slug / per ID)
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await db.post.findUnique({ where: { slug: params.slug } })
  return {
    title: `${post.title} | Akses`,
    description: post.excerpt,
    openGraph: { images: [post.coverImage] },
  }
}
```

Di `app/layout.tsx` root, set default site-wide:

```tsx
export const metadata = {
  metadataBase: new URL('https://<project>.app'),
  title: { default: 'Akses', template: '%s | Akses' },
  description: 'Manajemen akses & dashboard.',
  robots: { index: true, follow: true },
}
```

### 2.4. Form & Mutation

**WAJIB**: pakai **Server Action** untuk semua mutation (create, update, delete).
**JANGAN**: pakai client `fetch('/api/...', { method: 'POST' })` untuk form internal.

```tsx
// app/posts/new/page.tsx - form static + Server Action
import { createPost } from './actions'

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit">Simpan</button>
    </form>
  )
}
```

```tsx
// app/posts/new/actions.ts - Server Action
'use server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  // validasi (pakai Zod di produksi)
  if (!title || title.length < 3) throw new Error('Title min 3 char')

  await db.post.create({ data: { title, content } })
  revalidatePath('/posts')
  redirect('/posts')
}
```

Kalau butuh feedback interaktif (loading, error) di form → wrap dengan Client Component pakai `useActionState` (React 19).

### 2.5. Loading & Error State (File Convention)

Next.js App Router auto-render file ini di tiap route segment:

```text
app/
├── dashboard/
│   ├── page.tsx          // halaman utama
│   ├── loading.tsx       // muncul saat page.tsx masih loading data
│   ├── error.tsx         // muncul kalau page.tsx throw error
│   └── not-found.tsx     // muncul kalau notFound() dipanggil
```

```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <div className="animate-pulse">Memuat data...</div>
}

// app/dashboard/error.tsx - WAJIB 'use client'
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Ada error</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Coba lagi</button>
    </div>
  )
}
```

### 2.6. Image & Font Optimization

**Gambar**: pakai `next/image` (auto-resize, lazy-load, AVIF/WebP).

```tsx
import Image from 'next/image'

<Image
  src="/hero.jpg"
  alt="Hero proyek <project>"
  width={1200}
  height={600}
  priority // untuk above-the-fold (LCP)
/>
```

**Font**: pakai `next/font` (self-hosted, no layout shift, no FOUT).

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={inter.className}>
      <body>{children}</body>
    </html>
  )
}
```

---

## 3. Vercel Setup (Primary Hosting)

### 3.1. Connect Repo

1. Login https://vercel.com pakai akun GitHub tim.
2. **Add New → Project** → pilih repo dari GitHub.
3. Framework Preset: **Next.js** (auto-detect).
4. Root directory: `./` (kecuali monorepo).
5. Build command default: `next build` (jangan ganti kecuali perlu).

### 3.2. Environment Variables (Production / Preview / Development)

Vercel punya 3 environment terpisah:

| Env         | Kapan dipakai                                        |
|-------------|------------------------------------------------------|
| Production  | Deploy dari branch `main` (= public domain)          |
| Preview     | Deploy auto per PR / branch lain (= URL random)      |
| Development | Saat `vercel dev` lokal (jarang dipakai)             |

**WAJIB**: split env vars per environment. Production pakai DB produksi, Preview pakai DB staging (kalau ada).

Contoh isi env vars di dashboard Vercel:

```text
Production:
  DATABASE_URL = postgresql://...@prod-db.supabase.co:6543/postgres
  NEXT_PUBLIC_SITE_URL = https://<project>.app

Preview:
  DATABASE_URL = postgresql://...@staging-db.supabase.co:6543/postgres
  NEXT_PUBLIC_SITE_URL = https://<project>-preview.vercel.app
```

Variabel `NEXT_PUBLIC_*` = ter-expose ke browser (jangan taruh secret di sini). Tanpa prefix = server-only.

### 3.3. Custom Domain + SSL

1. Project Settings → **Domains** → Add domain (mis. `<project>.app`).
2. Update DNS di registrar: tambah record `A` ke `76.76.21.21` atau `CNAME` ke `cname.vercel-dns.com`.
3. SSL otomatis (Let's Encrypt) - tunggu 1-5 menit.
4. Tambah subdomain `www` → set redirect ke apex (atau sebaliknya).

### 3.4. Edge Function (untuk Middleware)

File `middleware.ts` di root → otomatis jalan di Edge Runtime (cepat, deploy global).

> ⚠️ **Sadar-versi (Next.js 16+):** sejak Next.js 16, berkas ini **berganti nama jadi `proxy.ts`** (fungsi ekspor juga `proxy`, bukan `middleware`) dan jalan di **runtime Node.js**. `middleware.ts` masih bisa dipakai untuk Edge tetapi **sudah usang (deprecated)** dan akan dihapus. Ada codemod resmi untuk migrasi. Larangan salah-koreksi + detail ada di `workflows/stack/4.14-1-nextjs.md`. **Cek angka `next` di `package.json` sebelum menyentuh berkas ini** (§8.2 Aturan 1) — contoh di bawah pakai gaya pra-16.

```ts
// middleware.ts - proteksi route /dashboard
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (!token && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*'] }
```

### 3.5. Web Analytics + Speed Insights

Gratis di plan Hobby. Wajib pasang untuk SEO + Core Web Vitals monitoring.

```bash
npm i @vercel/analytics @vercel/speed-insights
```

```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

Aktifkan di dashboard: Project → Analytics → Enable; Speed Insights → Enable.

### 3.6. Preview Deploy Workflow

- Push ke branch apa saja (kecuali `main`) → Vercel auto-deploy **Preview** dengan URL unik (mis. `<project>-git-feat-login-team.vercel.app`).
- Buka PR di GitHub → Vercel bot auto-comment URL Preview.
- QA test di Preview URL, kalau OK → merge ke `main`.

### 3.7. Production Deploy

- Merge PR ke `main` → Vercel auto-deploy ke Production (domain custom).
- Deploy time biasanya 30-90 detik (Next.js + Tailwind).
- Build log lengkap di dashboard → Project → Deployments → klik deployment.

### 3.8. Rollback

Kalau production rusak setelah deploy:

1. Dashboard → Project → **Deployments**.
2. Cari deployment lama yang stabil.
3. Klik `...` (tiga titik) → **Promote to Production**.
4. Selesai dalam <10 detik - traffic langsung pindah ke deployment lama.

> Rollback **tidak** memutar balik DB. Kalau migrasi DB sudah jalan, rollback aplikasi saja bisa bikin error skema. Solusi: pakai migrasi backward-compatible (additive only).

---

## 4. Migration ke Railway / Render (Advanced --- Post-Launch)

> Default tim = **Vercel saja**. Section ini cuma jadi pointer.

Migrasi ke Railway atau Render = **operasi advanced** yang baru relevan kalau salah satu kondisi ini terjadi: (a) bill Vercel sudah lewat budget (mis. >$100/bulan untuk satu project), atau (b) butuh **background worker persistent** / **WebSocket long-lived** yang tidak cocok di model serverless Vercel. Untuk Day 0--1 staff IT non-programmer: **abaikan section ini**, pakai Vercel + Supabase saja. Detail step-by-step setup (provision, env vars, Dockerfile, worker, cron, healthcheck) ada di **`templates/STACK_MIGRATION_GUIDE.md`** --- file terpisah supaya STACK_GUIDE tetap fokus ke default workflow. Decision Matrix vendor (Vercel vs Railway vs Render) tetap dipertahankan di section 9 sebagai bahan pertimbangan kapan harus migrasi.

---

## 5. Database (Supabase / PostgreSQL)

> Supabase = PostgreSQL managed. Bagian ini = rujukan cepat index + audit + tipe data. Pola Prisma/RLS lebih dalam ada di `workflows/stack/4.14-2-supabase-prisma.md` (dibaca otomatis saat stack DB terdeteksi).

### 5.1. Index: pilih tipe & urutan kolom yang benar

Index = "daftar isi" tabel supaya query tak perlu membaca semua baris. Salah pilih tipe/urutan = query tetap lambat walau kolomnya sudah di-index.

| Pola query | Tipe index | Contoh |
|---|---|---|
| `WHERE col = nilai` | B-tree (default) | `CREATE INDEX idx ON t (col)` |
| `WHERE a = x AND b > y` | Composite (gabungan) | `CREATE INDEX idx ON t (a, b)` |
| `WHERE data @> '{...}'` (JSONB) | GIN | `CREATE INDEX idx ON t USING gin (col)` |
| Rentang waktu / time-series | BRIN | `CREATE INDEX idx ON t USING brin (col)` |

**3 pola lanjutan yang sering terlewat:**

**a) Urutan kolom composite: kolom KESETARAAN (`=`) dulu, baru kolom RENTANG (`>`, `<`, `BETWEEN`).**
```sql
-- BENAR: status (=) dulu, created_at (rentang) belakangan
CREATE INDEX idx ON orders (status, created_at);
-- Melayani: WHERE status = 'pending' AND created_at > '2024-01-01'
```
Kalau dibalik jadi `(created_at, status)`, Postgres tak bisa memakai kolom `status` secara efisien untuk query di atas.

**b) Partial index — index sebagian baris saja (lebih kecil & cepat).**
```sql
CREATE INDEX idx ON users (email) WHERE deleted_at IS NULL;
-- Cuma meng-index user aktif; baris "dihapus lunak" (soft-delete) tak ikut → index ramping
```

**c) Covering index (`INCLUDE`) — jawab query tanpa membuka tabel.**
```sql
CREATE INDEX idx ON users (email) INCLUDE (name, created_at);
-- SELECT email, name, created_at ... cukup baca index, tak perlu lookup balik ke tabel
```

- 🙂 Non-Programmer: index = daftar isi buku. **Urutan** kolom penting — "nama depan lalu tanggal" beda hasil dari "tanggal lalu nama depan". **Partial** = daftar isi cuma untuk bab yang masih aktif (lebih tipis & cepat). **Covering** = daftar isi yang sekalian memuat ringkasan isinya, jadi tak perlu buka halaman aslinya.

### 5.2. Audit database: 3 query pendeteksi masalah + 1 pengaman default

Jalankan berkala (semua cuma-baca, aman) untuk menemukan masalah performa yang tak kelihatan dari aplikasi:

```sql
-- 1) Foreign key TANPA index (penyebab #1 JOIN lambat yang tersembunyi)
SELECT conrelid::regclass, a.attname
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
  );

-- 2) Query paling lambat (butuh ekstensi pg_stat_statements aktif)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100          -- rata-rata > 100 milidetik
ORDER BY mean_exec_time DESC;

-- 3) Tabel "kembung" (bloat) — banyak baris mati yang belum dibersihkan (vacuum)
SELECT relname, n_dead_tup, last_vacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

**Pengaman default-deny (jalankan sekali saat menyiapkan DB baru):**
```sql
REVOKE ALL ON SCHEMA public FROM public;  -- cabut hak "siapa saja boleh bikin objek di schema public"
```
> Sadar-versi: sejak Postgres 15, hak `CREATE` di schema `public` sudah dicabut dari PUBLIC secara bawaan — perintah di atas aman dijalankan tapi jangan diklaim "perbaikan" kalau sudah PG15+. Query #2 butuh `CREATE EXTENSION IF NOT EXISTS pg_stat_statements;` dulu (di Supabase umumnya sudah aktif — cek via `list_extensions`). Kontrol-akses REVOKE per-developer yang lebih dalam ada di `MCP_SETUP.md` §2.6b.

- 🙂 Non-Programmer: tiga query pertama = "cek kesehatan" gudang data — mana rak tanpa label (foreign key tak ter-index → pencarian lambat), transaksi paling lelet, dan laci penuh sampah yang belum dibuang. Perintah terakhir = "kunci pintu gudang secara default" supaya tak sembarang akun bisa menaruh barang di dalamnya.

### 5.3. Pilih tipe data Postgres yang benar (hindari bug diam-diam)

| Untuk | Tipe yang benar | Hindari | Kenapa |
|---|---|---|---|
| ID | `bigint`/`identity` (atau `cuid()` string via Prisma) | `int`, UUID acak | `int` habis di ~2,1 miliar baris; UUID acak bikin index melebar & acak-acakan |
| Teks | `text` | `varchar(255)` | Di Postgres `text` sama cepatnya; batas 255 sering asal & bikin error saat data lebih panjang |
| Waktu | `timestamptz` | `timestamp` (polos) | `timestamptz` sadar zona waktu; `timestamp` polos = bug saat beda timezone / pergantian DST |
| Uang | `numeric(10,2)` | `float` / `double` | `float` menyimpan pecahan (mis. 0,1) tak-presisi → selisih sen menumpuk jadi salah |
| Ya/Tidak | `boolean` | `varchar`, `int` | Tipe khusus, jelas maknanya & hemat ruang |

- 🙂 Non-Programmer: pilih "wadah" data yang pas. Uang JANGAN pakai wadah `float` — ibarat timbangan yang selalu meleset beberapa gram; lama-lama total belanja jadi salah. Waktu pakai `timestamptz` supaya jam tak kacau saat pengguna beda zona waktu.

> **Catatan konsistensi kit:** baris "Waktu → `timestamptz`" MENGUATKAN aturan universal §9 (`kolom waktu _at`, timezone-aware) — bukan aturan baru yang bentrok. Untuk **ID**, contoh Prisma kit memakai `@default(cuid())` (string) — itu sah untuk skala tim kecil; baris "ID → `bigint`" adalah trade-off performa index, BUKAN keharusan. Diskusikan dulu (§1.1) sebelum mengganti konvensi ID yang sudah jalan.

### 5.4. Pengaman timeout query & transaksi (guardrails)

> Guardrail = "rem otomatis" DB supaya satu query/transaksi nyasar tak menyandera koneksi + mengunci tabel tanpa batas. BEDA dari index (kecepatan) — ini soal MEMBATASI KERUSAKAN saat ada yang salah.

- 👨‍💻 Programmer: `statement_timeout` membatalkan query yang lewat batas (cegah 1 query nyangkut menahan koneksi pool + numpuk lock). `idle_in_transaction_session_timeout` membunuh transaksi yang sudah BEGIN lalu app-nya nganggur (menahan lock lebih lama). **Penting untuk Supabase — pilih role yang BENAR:** query lewat Supabase Client/PostgREST berjalan sebagai role `authenticated` (login) / `anon` (publik), BUKAN `authenticator`. Kedua role itu punya default sendiri (authenticated 8 dtk, anon 3 dtk) yang **MENANG** atas setelan `authenticator` — jadi setel di role yang benar, lalu **reload PostgREST**.
  ```sql
  -- Role yang dipakai query API Supabase = `authenticated` (login) / `anon` (publik).
  -- (Angka di bawah = default Supabase; sesuaikan bila perlu — perketat, jangan longgarkan tanpa alasan.)
  ALTER ROLE authenticated SET statement_timeout = '8s';
  ALTER ROLE anon          SET statement_timeout = '3s';
  NOTIFY pgrst, 'reload config';  -- WAJIB: tanpa ini PostgREST tak membaca perubahan (langkah yang sering terlupa)

  -- `authenticator` = role koneksi/pool (juga default service_role) + batas transaksi nganggur:
  ALTER ROLE authenticator SET idle_in_transaction_session_timeout = '30s';
  ```
  Ini timeout **LAPISAN DB** — BEDA dari timeout Prisma `$transaction` (default 5 detik, lihat `workflows/stack/4.14-2-supabase-prisma.md`) dan `pool_timeout` di `DATABASE_URL`. Tiga rem beda lapisan; jangan anggap satu menutup yang lain. (Cara termudah tanpa SQL: Dashboard → Database → Settings.)
- 🙂 Non-Programmer: kasir yang kalau melayani 1 pelanggan lebih dari 30 detik otomatis "dilewati" supaya antrean tak macet total.

> ⚠️ **Supabase-managed — jangan salin gaya self-hosted.** Perintah `ALTER SYSTEM SET …` + `SELECT pg_reload_conf();` (lazim di tutorial Postgres self-host/superuser) TIDAK jalan di sini (kita bukan superuser). Untuk guardrail per-role/per-db pakai `ALTER ROLE … SET` / `ALTER DATABASE … SET` seperti di atas, atau Dashboard → Database → Settings. `max_connections` ditentukan tier compute (add-on), bukan `ALTER SYSTEM`.
> 🙂 Awam: server DB kita "disewa terkelola" — bukan pemilik gedung, tak boleh utak-atik panel listrik utama (`ALTER SYSTEM`); ubah setelan lewat "saklar kamar" (per-role/per-db) atau Dashboard.

> Kredit: ECC `postgres-patterns`, MIT © Affaan Mustafa

> Kredit (MIT © Affaan Mustafa): §5 diadaptasi dari skill ECC v2.0.0 `postgres-patterns` & `database-migrations` (ditulis-ulang non-programmer + disesuaikan stack kit).

---

## 6. SEO Checklist Mandatory

Kategori prioritas:

- **Quick Wins** = WAJIB pre-launch. Tanpa ini, situs tidak ter-index Google atau muncul broken.
- **Bertahap** = affect ranking. Boleh nyusul minggu pertama setelah launch.
- **Strategi Besar** = boost ranking. Optimasi lanjutan, nice-to-have.

### Quick Wins (wajib pre-launch)

- [ ] `metadata.title` & `metadata.description` di tiap route (bukan default Next.js).
- [ ] `metadataBase` di root `layout.tsx` (untuk URL absolut di OG image).
- [ ] `robots.txt` di `app/robots.ts` atau `public/robots.txt` - pastikan **tidak** disallow `/` di production.
- [ ] `sitemap.xml` di `app/sitemap.ts` (Next.js auto-generate dari array).
- [ ] `lang="id"` (atau bahasa sesuai target) di tag `<html>`.
- [ ] Canonical URL di metadata (`alternates: { canonical: '...' }`) untuk halaman dengan query string.
- [ ] HTTPS aktif (Vercel auto, tidak perlu config).
- [ ] No `noindex` accidental di production (cek `robots` meta tag).

### Bertahap (affect ranking)

- [ ] Open Graph image (`og-image.png`, 1200x630px) per route penting.
- [ ] Structured data (JSON-LD) untuk artikel, produk, FAQ (pakai `<script type="application/ld+json">`).
- [ ] Alt text di semua `<Image>` (jangan kosong, jangan filename mentah).
- [ ] Heading hierarchy benar (`h1` satu per halaman, `h2/h3` ter-nest logis).
- [ ] Internal linking antar-halaman (anchor text deskriptif, bukan "klik di sini").
- [ ] Core Web Vitals: LCP <2.5s, CLS <0.1, INP <200ms (monitor via Speed Insights).
- [ ] Mobile responsive (test di Chrome DevTools device mode).

### Strategi Besar (boost ranking)

- [ ] Breadcrumb structured data.
- [ ] FAQ structured data di halaman dengan Q&A.
- [ ] Page speed: convert image ke AVIF/WebP (next/image auto-handle).
- [ ] Preconnect ke domain eksternal sering dipakai (`<link rel="preconnect" href="https://fonts.googleapis.com">`).
- [ ] Lazy-load iframe (YouTube embed, map).
- [ ] hreflang tag kalau multi-bahasa.

Contoh `app/robots.ts`:

```ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/'] },
    sitemap: 'https://<project>.app/sitemap.xml',
  }
}
```

Contoh `app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await db.post.findMany({ select: { slug: true, updatedAt: true } })
  return [
    { url: 'https://<project>.app', lastModified: new Date(), priority: 1 },
    ...posts.map(p => ({
      url: `https://<project>.app/post/${p.slug}`,
      lastModified: p.updatedAt,
      priority: 0.8,
    })),
  ]
}
```

---

## 7. Security Checklist

### 7.1. Env Vars

- [ ] Tidak ada secret hard-coded di repo (cek pakai `gitleaks` atau `truffleHog`).
- [ ] `.env.local` di `.gitignore`.
- [ ] Secret di Vercel env vars di-mark **Sensitive** (icon mata) - encrypted at rest.
- [ ] `NEXT_PUBLIC_*` cuma untuk data yang aman ke browser (URL, feature flag boolean) - JANGAN API key, JANGAN service_role_key.
- [ ] Rotate secret tiap quarter atau saat staff keluar.

### 7.2. Auth

- [ ] Session token via cookie `HttpOnly` + `Secure` + `SameSite=Lax`.
- [ ] Password hash pakai `bcrypt` (cost ≥10) atau `argon2`. JANGAN MD5/SHA1.
- [ ] CSRF protection di Server Action (Next.js handle by default via origin check, tapi kalau cross-domain → tambah token manual).
- [ ] Rate limit login endpoint (`@upstash/ratelimit` atau Vercel Edge Config).
- [ ] Lock account setelah 5 percobaan gagal (15 menit).

### 7.3. DB Connection

- [ ] Pakai **connection pooling** Supabase (`port 6543`, mode `transaction`) untuk serverless Vercel.
- [ ] JANGAN expose `service_role_key` ke client - itu bypass RLS.
- [ ] Pakai `anon_key` (limited) di browser, `service_role_key` di Server Action saja. **(Berlaku untuk arsitektur NON-split / monolith. Pada split-repo / microservice: frontend NOL akses DB — JANGAN colok Supabase dari browser sama sekali; semua data lewat API backend. Lihat `templates/split-agents/FRONTEND.md`.)**
- [ ] Row-Level Security (RLS) aktif di semua tabel publik.

### 7.4. Security Headers + CSP (Content-Security-Policy)

> **CSP** = aturan yang dikirim ke browser: "skrip/gambar/font hanya boleh dimuat dari sumber yang kusebut". Ini penahan utama **XSS** (penyusupan skrip jahat ke halaman). (🙂 kayak daftar tamu di pintu pesta — yang tak ada di daftar tak boleh masuk, sekalipun undangannya kelihatan meyakinkan.)
> ⚠️ Header lain di bawah (X-Frame-Options dst.) = PELENGKAP, **bukan pengganti CSP**. Tanpa baris `Content-Security-Policy`, perlindungan XSS-nya belum terpasang.

**Tingkat 1 — CSP dasar (langsung bisa, tanpa ubah arsitektur).** Cukup untuk mayoritas project:

```ts
// next.config.js
const isDev = process.env.NODE_ENV === 'development'

// CSP dasar dari dok resmi Next.js — SESUAIKAN dengan project-mu:
// tambah origin CDN/font/analytics yang MEMANG dipakai. JANGAN tempel buta.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`

module.exports = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: cspHeader.replace(/\n/g, '') },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
      ],
    }]
  },
}
```

- [ ] Baris `Content-Security-Policy` TERPASANG (baris pertama daftar header di atas).
- [ ] `frame-ancestors 'none'` di CSP = anti-clickjacking modern (pengganti `X-Frame-Options: DENY`; boleh pasang dua-duanya untuk browser lama).
- [ ] **Uji di Preview Deploy dulu**: CSP salah-konfig bisa MEMBLOKIR aset sah (font/CDN/analytics) — buka DevTools Console, cari error `Refused to load ...`, lalu tambahkan origin itu ke directive terkait.
- [ ] Catatan jujur: `'unsafe-inline'` di Tingkat 1 = kompromi (skrip inline jahat masih bisa lolos). Perlindungan penuh = Tingkat 2.
- [ ] `'unsafe-eval'` HANYA untuk development (React memakainya buat debugging) — pola `isDev` di atas memastikan produksi bersih.
- [ ] **COOP** (`Cross-Origin-Opener-Policy`) = pemutus "jembatan antar-tab": tab lain yang membuka situsmu tak bisa mengendalikan jendelamu lewat `window.opener` (modal serangan tabnabbing). Nilai di atas (`same-origin-allow-popups`) tetap MENGIZINKAN popup login Google/OAuth; nilai terketat `same-origin` (rekomendasi OWASP) MEMUTUS popup login — pakai hanya kalau login-mu murni redirect, tanpa popup.
- [ ] **CORP** (`Cross-Origin-Resource-Policy: same-site`) = aset (gambar/skrip/font) hanya boleh dimuat situs sendiri + subdomain — situs lain tak bisa comot langsung (sekalian pertahanan kelas Spectre). Punya aset yang MEMANG untuk dipakai situs lain (widget embed, gambar publik)? Beri route itu saja nilai `cross-origin`.
- [ ] **COEP** (`Cross-Origin-Embedder-Policy`) = OPSIONAL, JANGAN pasang buta: `require-corp` MEMBLOKIR gambar/iframe pihak-ketiga yang tak ber-header CORP/CORS → halaman bisa "bolong". Perlu HANYA untuk fitur `SharedArrayBuffer`/isolasi-penuh (dipasang bersama COOP `same-origin`); alternatif lebih longgar: `credentialless`.

**Tingkat 2 — CSP ketat ber-nonce (untuk data sensitif / tuntutan kepatuhan).** **Nonce** = kode acak sekali-pakai per request; hanya skrip yang membawa nonce itu yang boleh jalan — penyusup harus menebak kode yang berganti tiap request:

- Dipasang lewat berkas "satpam pintu masuk" — 🚨 **SADAR-VERSI**: `proxy.ts` (fungsi `proxy`) di Next 16+, `middleware.ts` di versi sebelumnya. Lihat peringatan di `workflows/stack/4.14-1-nextjs.md` + contoh UTUH di dok resmi: `nextjs.org/docs/app/guides/content-security-policy` (jangan tulis dari ingatan — header `x-nonce`, `'strict-dynamic'`, dan matcher pengecualian `_next/static` semuanya ada di sana).
- ⚠️ **Trade-off resmi**: nonce MEWAJIBKAN dynamic rendering (halaman dirakit ulang tiap request) → halaman statik/ISR/cache CDN mati → lebih lambat + server lebih sibuk + biaya naik. Pakai hanya kalau memang butuh ketat; kombinasi umum: nonce untuk halaman ber-data-sensitif, Tingkat 1 untuk halaman publik.

> Sumber: dok resmi Next.js (guide CSP, dicek 2026-07) + pola nonce diserap dari ECC `rules/web/security.md` (MIT © Affaan Mustafa). Header cross-origin (COOP/CORP/COEP) diverifikasi ke MDN + OWASP HTTP Headers Cheat Sheet (dicek 2026-07). Versi Next.js naik? Cek ulang dok resmi versi terpasang.

### 7.5. Pengerasan Auth Supabase pra-launch (checklist Dashboard — nyaris tanpa koding, item DoD "mau online")

Standar-expert Supabase go-live: sebagian pengaman TERKUAT cuma perlu KLIK di panel Supabase (Dashboard → Authentication), bukan koding — cocok dikerjakan staff non-programmer sebelum launch:
- [ ] **Leaked-password protection ON** — Supabase cek password user ke database kebocoran (HaveIBeenPwned) → tolak password yang sudah pernah bocor.
- [ ] **Minimum password length + kompleksitas** di-set (bukan default lemah).
- [ ] **Matikan signup publik** kalau app internal/undang-saja (Authentication → Providers → Email → "Enable signups" OFF), atau batasi domain.
- [ ] **Rate-limit Auth aktif** (server-side GoTrue) — brute-force login langsung ke endpoint tetap kena batas; JANGAN andalkan lockout yang dihitung di klien.
- [ ] **SMTP produksi terkonfigurasi** (bukan email bawaan Supabase yang di-throttle) supaya reset-password/verifikasi jalan.
- [ ] **MFA/2FA** ditawarkan untuk akun admin (native Supabase AAL2, bukan sekadar flag di frontend — flag frontend BUKAN kontrol keamanan server).
- [ ] Jalankan **Security Advisor** (Dashboard → Advisors) → nol temuan GENTING sebelum online.

> Sumber: dok resmi Supabase "Going into Production" + "Auth security" (dicek 2026-07). Versi/panel berubah? Cek ulang dok resmi.

### 7.6. Gerbang lint keamanan + a11y (opt-in, bertahap)

Tim tanpa peran QA → satu celah keamanan/aksesibilitas (a11y) yang lolos mata bisa terlanjur tayang. ESLint bisa jadi "satpam mesin" yang menangkap pola bahaya secara pasti (deterministik) saat ngoding — TAPI dipasang **bertahap** supaya tak membanjiri merah (banjir peringatan wajar = staff mematikannya diam-diam, malah lebih buruk dari tak ada gerbang).

**1. Pasang plugin** (`react` + `jsx-a11y` sudah dibawa `eslint-config-next`; yang kurang cuma anti-XSS):
```bash
npm i -D eslint-plugin-no-unsanitized
```

**2. Tambah rule di ATAS config `eslint-config-next`** (contoh flat config `eslint.config.mjs` — sesuaikan kalau project-mu pakai legacy `.eslintrc`):
```js
import nounsan from 'eslint-plugin-no-unsanitized'

export default [
  // ...spread config eslint-config-next kamu di sini...
  {
    plugins: { 'no-unsanitized': nounsan },
    rules: {
      // KEAMANAN/BUG = "error" (tegakkan keras - XSS = celah publik, jarang salah-tangkap)
      'react/no-danger': 'error',           // larang dangerouslySetInnerHTML mentah
      'no-unsanitized/property': 'error',   // larang innerHTML = <nilai tak-aman>
      'no-unsanitized/method': 'error',     // larang insertAdjacentHTML(...) tak-aman
      // A11Y/SELERA = "warn" (jangan banjiri merah dulu)
      'react/no-array-index-key': 'warn',   // key={index} = state form loncat ke baris salah (bug senyap)
      // jsx-a11y sudah aktif via eslint-config-next (recommended = warn)
    },
  },
]
```

**3. Naikkan bertahap (JANGAN langsung wajib):** jalankan `npm run lint` **INFORMATIF** dulu (lihat berapa temuan di basis-kode nyata). Setelah baseline bersih, baru jadikan gerbang yang memblokir merge. Filosofi sama persis dengan lint kit sendiri (bug=`error`, selera=`warn`, CI informatif dulu).

> Kenapa dipisah `error` vs `warn`: rule keamanan (XSS) hampir tak pernah salah-tangkap → aman jadi `error`. Rule a11y/selera lebih sering "peringatan wajar" → `warn` dulu supaya alur kerja tak macet. Naikkan `warn`→`error` per-rule saat timmu siap. 🙂 pasang satpam, tapi jangan bikin alarm nyala tiap orang lewat pintu.

---

## 8. Feature Flag Pattern (ADVANCED - Post-Launch Only)

> ⚠️ **Default workflow tim TIDAK pakai feature flag.** Untuk early-stage project (belum launch / progress <50%), staging via **Vercel Preview Deploy per PR** sudah cukup. Lihat `CLAUDE_TEAM_GUIDE.md` section 7b (Risk Level Decision Tree) untuk default workflow.
>
> Feature flag = advanced operation yang butuh owner familiar dengan Vercel env vars + redeploy cycle. **Tambahkan post-launch** kalau project sudah punya user aktif dan butuh:
> - Kill switch instant untuk fitur kritis (mis. payment toggle saat Black Friday)
> - A/B test gradual rollout (10% → 50% → 100%)
> - Per-user targeting (beta tester subset)

Detail implementasi lengkap (decision tree, naming convention, cleanup ritual, testing pattern, per-user hash) di **`./.claude-kit/templates/feature-flags-advanced.md`** - file terpisah supaya tidak ngebebanin kit default workflow.

**Untuk early-stage <project> (progress ~5%)**: skip section ini, pakai Risk Level (CLAUDE_TEAM_GUIDE.md 7b) + staging-only.

---

## 9. Decision Matrix: Vercel vs Railway vs Render

| Aspek                           | Vercel                | Railway              | Render               |
|---------------------------------|-----------------------|----------------------|----------------------|
| **Setup speed**                 | ★★★★★ (auto Next.js)  | ★★★★ (Nixpacks)      | ★★★ (manual config)  |
| **DX (Developer Experience)**   | ★★★★★                 | ★★★★                 | ★★★                  |
| **Preview deploy per PR**       | YA (default)          | YA (default)         | YA (paid plan)       |
| **Background worker persistent**| TIDAK (serverless)    | YA                   | YA                   |
| **Cron native**                 | Vercel Cron (Pro+)    | YA (gratis)          | YA (gratis)          |
| **WebSocket / SSE long-lived**  | Terbatas (Edge)       | YA                   | YA                   |
| **PostgreSQL bundled**          | TIDAK (pakai Supabase)| YA (plugin)          | YA (managed)         |
| **Pricing transparency**        | ★★★ (function invoke) | ★★★★ (per-resource)  | ★★★★★ (flat)         |
| **Free tier (small project)**   | Hobby gratis cukup    | $5 credit/bulan      | Free 750 jam/bulan   |
| **Vendor lock-in**              | Menengah — kini bisa Docker¹ | Rendah (Docker)      | Rendah (Docker)      |

> ¹ **Vercel kini menjalankan Dockerfile** (sejak 30 Jun 2026 — cek dok resmi versi terpasang sebelum mengandalkan, §8.2): taruh `Dockerfile.vercel` di akar → Vercel deteksi otomatis. **Backend Python/FastAPI + frontend Next.js bisa satu project yang sama** lewat `services` di `vercel.json` + `rewrites` (mis. `/api/*` → service `backend`) — sebelumnya backend Python harus pindah ke platform lain. Port bawaan `80` (ubah lewat env `PORT`); tidur otomatis setelah 5 menit tanpa trafik (30 detik di preview), `SIGTERM` + 30 detik masa bersih-bersih. **Batas jujur:** Secure Compute + Static IP **belum** didukung untuk container; `vercel dev` butuh Docker daemon lokal. Jadi lock-in turun dari "Tinggi" ke "Menengah" — **bukan** setara Railway/Render.
| **Best untuk**                  | Marketing site, SaaS, dashboard | App butuh worker / WS | Stabilitas + predictable |

### Rekomendasi default

- **0 → MVP**: Vercel (deploy 5 menit, gratis).
- **MVP → 1000 user**: Tetap Vercel, monitor cost. Pakai Supabase untuk DB.
- **1000 → 10k user**: Cek bill Vercel. Kalau >$100/bulan & butuh worker → pindah ke Railway.
- **Enterprise / butuh on-premise**: Render (lebih konservatif) atau self-host Docker.

---

## 10. Checklist Pre-Launch

Sebelum announce launch produksi:

- [ ] Semua Quick Wins SEO terisi (section 6).
- [ ] Semua Security checklist terisi (section 7).
- [ ] Speed Insights + Analytics aktif.
- [ ] Custom domain + SSL aktif (bukan `.vercel.app`).
- [ ] Rollback plan dipahami (section 3.8).
- [ ] Backup DB Supabase aktif (Settings → Database → Backups).
- [ ] Error monitoring (Sentry / Vercel logs) aktif.
- [ ] Healthcheck endpoint `/api/health` ada (untuk uptime monitor). Butuh cek lebih dalam (DB) + validasi env fail-fast? Lihat `workflows/stack/4.14-4-deploy.md` §health.
- [ ] (Opsional, kalau pakai Docker/CI) Pipeline CI/CD otomatis — template `templates/github/workflows/app-cicd.yml.example`.
- [ ] Robots & sitemap di-submit ke Google Search Console.
- [ ] Feature flag default = stable path (rollout fitur baru bertahap).

---

## Referensi Eksternal

- Next.js App Router docs: https://nextjs.org/docs/app
- Vercel docs: https://vercel.com/docs
- Railway docs: https://docs.railway.app
- Render docs: https://render.com/docs
- Google Search Central (SEO): https://developers.google.com/search
- Web.dev (Core Web Vitals): https://web.dev/vitals

---

> **Update file ini** tiap kali tim ganti vendor, ganti versi major Next.js, atau ada keputusan stack baru. Catat di `CHANGELOG.md` kit + bump versi.
