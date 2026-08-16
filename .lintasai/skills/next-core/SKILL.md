---
nama: next-core
deskripsi: Next.js inti kelas industri — batas Server/Client jelas, secret tak bocor ke browser, Server Action ber-otorisasi (anti-IDOR), nama berkas middleware sadar-versi.
divisi: stack
pemicu: [next.js, nextjs, app-router, server-component, use-client, server-only, middleware-next]
rawan_keamanan: true
menggantikan: []
---

# Skill: Next.js Inti — batas Server/Client & keamanan boundary

> **Fokus skill ini** = **batas server↔client & 4 sumber kebocoran/kerusakan tersamar khas Next.js**. Pola performa & render React (waterfall, bundle, re-render, list) dipisah ke `skills/react-patterns/SKILL.md`.
>
> **Inti:** Next.js punya dua sisi — **sisi server** (boleh pegang kunci/rahasia, tak terkirim ke browser) dan **sisi client/browser** (semua yang dikirim ke situ bisa dilihat siapa saja yang membuka halamannya). Taruh rahasia di sisi client (`NEXT_PUBLIC_*`) = siapa saja bisa mengambilnya.

📐 **Resep anti-halusinasi versi (perpanjangan "no quote = no claim" ke dependensi):** Next.js bergerak cepat (`after()`, `proxy.ts`, `use cache` — beda nasib per versi). Sebelum memakai API yang lebih baru dari pengetahuan model → BUKTIKAN: `grep -rl "namaAPI" node_modules/next/dist` + baca `version` di `node_modules/next/package.json`. **0 hasil = tak ada di versi ini: JANGAN pakai** — sebut alternatif + tawarkan upgrade terpisah.

---

## 1. Kontrak (yang HARUS benar — 4 sumber kebocoran/kerusakan tersamar khas Next.js)

- 🔒 **HASIL — Rahasia (secret) jangan bocor ke browser.** Env `NEXT_PUBLIC_*` = **TERBUKA ke publik** (JANGAN taruh kunci rahasia di situ!); kunci server tanpa prefix + jangan dioper sebagai props ke Client Component. (🙂 Non-Programmer: env `NEXT_PUBLIC_` itu terbuka ke publik — jangan taruh password/kunci rahasia di situ.)
  - 📐 **CARA BAKU — Sinyal project INI:** grep prefix `NEXT_PUBLIC_` pada nilai RAHASIA (API key/secret/`service_role`) → apa pun ber-prefix itu ikut terkirim ke browser (bocor).
- 🔒 **HASIL — Checkpoint wajib penjaga `import "server-only"`: build GAGAL otomatis kalau rahasia bocor ke browser.** Project Next.js yang memakai secret server (mis. `service_role` Supabase) WAJIB pasang paket npm `server-only` + tulis `import "server-only"` di baris paling ATAS TIAP berkas modul sensitif (klien DB, pembaca secret) — bukan opsional; verifikasi build gagal saat modul ini di-impor Client Component. Kalau Client Component (`"use client"`) tak sengaja mengimpornya, bundler LANGSUNG menggagalkan build — bukan diam-diam mengirim rahasia ke bundel browser. Penjaga waktu-build (compile-time), pelengkap—BUKAN pengganti—aturan `NEXT_PUBLIC_`. Kebalikannya `import "client-only"`. (🙂 berkas rahasia ditandai `import "server-only"` — kalau tak sengaja dipakai di kode sisi browser, proses build berhenti otomatis, ketahuan SEBELUM online.)
- 🔒 **HASIL — Tiap `"use server"` (Server Action) bisa dipanggil langsung siapa saja, tak cuma lewat UI.** WAJIB cek auth + otorisasi DI DALAM action (`getSession()` + cek role/kepemilikan), JANGAN andalkan tombol yang disembunyikan di Client Component. Pagar sisi browser bisa dilewati — sama bahayanya dengan IDOR. Pola kode lengkap di §3. (🙂 Non-Programmer: menyembunyikan tombol "Hapus" BUKAN keamanan — orang iseng bisa panggil fungsinya langsung. Cek login/hak akses wajib dilakukan di server.)
- 🔒 **HASIL — Nama berkas middleware = SADAR-VERSI (`proxy.ts` di Next 16+, `middleware.ts` sebelumnya).** 🚨 JANGAN "membetulkan" `proxy.ts` jadi `middleware.ts` di proyek Next 16 — itu MEMATIKAN middleware (auth-guard/redirect mati TANPA error). Sejak Next 16: berkas root `proxy.ts` + fungsi ekspor `proxy` (runtime Node.js); `middleware.ts` masih jalan untuk Edge tapi USANG & akan dihapus (ada codemod migrasi + flag config ikut ganti). Model bawaan dilatih di era `middleware.ts` → rawan salah-koreksi. WAJIB cek angka `next` di `package.json` + dok resmi sebelum menyentuh berkas ini. (🙂 nama berkas middleware beda tergantung versi Next.js — jangan asal ganti, bisa mematikan middleware-nya diam-diam.)

---

## 2. Cara rakit (batas Server/Client & server-side — 📐 CARA BAKU; boleh diganti cara lain yang capai HASIL sama)

**Dasar Server/Client Component & data**

1. 📐 **Server Component (App Router) = default** (jalan di server, tak terkirim ke browser, bisa `await` langsung); pakai `"use client"` HANYA kalau butuh interaksi/hook. Client TAK boleh impor Server Component (terima lewat `children`).
2. 📐 **Data server:** pakai server-state (TanStack Query/SWR) atau RSC `fetch`, BUKAN `useState` untuk data dari API. Tempat state: lokal → angkat ke induk → Context (hanya nilai jarang-berubah: tema/auth/locale) → store eksternal (Zustand/Jotai) untuk sering-berubah.
3. 📐 **Pisah Container** (ambil data) **vs Presentational** (cuma tampil props). Pakai `next/image` + `next/font` untuk optimasi kecepatan; 4 state UI (`skills/a11y/SKILL.md`) + error boundary (`skills/react-patterns/SKILL.md` §F butir 11 — termasuk batasnya: TIDAK menangkap error event handler/`fetch`).

🙂 Non-Programmer: pisahkan "halaman yang cuma menampilkan" dari "yang ambil data"; JANGAN tempel kunci rahasia di kode yang ikut terkirim ke browser pengunjung.

**Server-side (jaga per-request — cegah data 2 user tabrakan)**

4. 📐 PENTING: bungkus ambil-data per-request dengan `cache()` dari `react` — 3 Server Component panggil `getUser("1")` di render sama = 1 query DB.
5. 📐 PENTING (keamanan/data): JANGAN simpan state berubah di level modul server — DIBAGI ke semua request = 2 user tabrakan data. Pakai penyimpanan per-request (`headers()`, `cookies()`, async context).
6. 💡 RAPIKAN: kirim ke Client Component HANYA kolom yang dipakai (proyeksikan/paginasi di DB). Kerja yang tak perlu menahan respons (logging, warm cache) pakai `after()`.
7. 💡 RAPIKAN: serialisasi RSC→Client men-dedup per REFERENSI, bukan per nilai — `usernames={u} urut={u.toSorted()}` mengirim isi array 2× (`.toSorted()`/`.filter()`/`[...arr]` = referensi baru = diserialisasi ulang). Kirim SEKALI, transformasi di sisi client (`useMemo`). Kecuali: transformasinya mahal / client memang tak butuh data asli.

> Butir 🔒 tiap `"use server"` wajib cek auth+otorisasi (Kontrak §1) — pola kode lengkap di §3.

---

## 3. Powerful — pola siap-adaptasi (jangan salin mentah, netralkan ke versi terpasang)

🧪 **CONTOH KASUS — pola auth di Server Action (memenuhi 🔒 HASIL §1):**

```ts
"use server";
export async function deleteUser(formData: FormData) {
  const session = await getSession();
  // 🔒 penjaga izin MENGEMBALIKAN hasil, JANGAN `throw` telanjang: error yang dilempar dari Server
  // Action dan tak ada yang menangkap keluar sebagai 500 generik — klien menyimpulkan "server rusak"
  // padahal sebenarnya "kamu tak berhak", dan tim ikut salah mendiagnosis.
  if (!session?.user)                                            // cek login
    return { ok: false as const, error: { code: "UNAUTHENTICATED", message: "Belum login" } };
  const targetId = String(formData.get("id"));
  if (session.user.role !== "admin" && session.user.id !== targetId)  // cek hak akses
    return { ok: false as const, error: { code: "FORBIDDEN", message: "Tak berhak" } };
  await db.user.delete({ where: { id: targetId } });
  return { ok: true as const, data: null };
}
```

> Bentuk balasan di atas = amplop `Ok`/`Err` baku kit → `skills/backend/SKILL.md` §3 (butir "error ber-tipe + SATU penerjemah di pintu keluar"). Pakai bentuk yang SAMA di route handler & Server Action supaya klien tak perlu menebak.

🧪 **CONTOH — modul sensitif ditandai KHUSUS SERVER:**

```ts
import "server-only";           // build GAGAL kalau Client Component mengimpor modul ini
import { createClient } from "@supabase/supabase-js";
export const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE!); // secret server, TANPA NEXT_PUBLIC_
```

### Contoh pola ❌→✅ (ambil POLANYA, jangan salin mentah — cek versi paket/provider terpasang)

🧪 **Secret tak bocor ke browser (§1 butir 1-2)** — env `NEXT_PUBLIC_*` = TERBUKA ke publik:

❌ **SALAH** (nilai `NEXT_PUBLIC_*` disisipkan ke bundel browser saat build):
```ts
import { createClient } from "@supabase/supabase-js";
export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // NEXT_PUBLIC_ pada service_role → kunci admin DB ikut ke bundel browser: siapa pun bisa ambil lalu baca/hapus SEMUA data
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE!,
);
```
✅ **BENAR** (tanpa prefix + `import "server-only"` → bocor = build GAGAL, ketahuan SEBELUM online):
```ts
import "server-only"; // di-impor Client Component → build langsung gagal
import { createClient } from "@supabase/supabase-js";
export const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!, // tanpa NEXT_PUBLIC_ → hanya terbaca di server
);
```

🧪 **Server Action ber-otorisasi, anti-IDOR (§1 butir 3)** — action bisa dipanggil langsung tanpa lewat UI:

❌ **SALAH** (mengandalkan tombol yang disembunyikan di Client Component):
```ts
"use server";
export async function hapusPesanan(formData: FormData) {
  // tanpa cek session+kepemilikan: action bisa dipanggil langsung (tanpa tombol) dengan id pesanan ORANG LAIN → IDOR
  await db.pesanan.delete({ where: { id: String(formData.get("id")) } });
}
```
✅ **BENAR** (auth + kepemilikan DI DALAM action; amplop `Ok`/`Err` baku kit → `skills/backend/SKILL.md` §3):
```ts
"use server";
export async function hapusPesanan(formData: FormData) {
  const session = await getSession();
  if (!session?.user)
    return { ok: false as const, error: { code: "UNAUTHENTICATED", message: "Belum login" } };
  const id = String(formData.get("id"));
  const pesanan = await db.pesanan.findUnique({ where: { id } });
  if (pesanan?.userId !== session.user.id) // cek KEPEMILIKAN, bukan cuma "sudah login"
    return { ok: false as const, error: { code: "FORBIDDEN", message: "Bukan pesanan kamu" } };
  await db.pesanan.delete({ where: { id } });
  return { ok: true as const, data: null };
}
```

🧪 **Nama berkas middleware sadar-versi (§1 butir 4)** — salah nama = auth-guard mati TANPA error:

❌ **SALAH** ("membetulkan" `proxy.ts` jadi `middleware.ts` di proyek Next 16):
```ts
// middleware.ts — hasil "merapikan" proxy.ts di proyek Next 16 (nama era lama):
// auth-guard mati TANPA error build/runtime → halaman admin terbuka tanpa login
import { NextResponse, type NextRequest } from "next/server";
export function middleware(req: NextRequest) {
  if (!req.cookies.get("session")) return NextResponse.redirect(new URL("/login", req.url));
}
```
✅ **BENAR** (cek angka `next` di `package.json` DULU; nama berkas + nama fungsi ikut versi):
```ts
// package.json "next": "16.x" → berkas root proxy.ts (runtime Node.js)
import { NextResponse, type NextRequest } from "next/server";
export function proxy(req: NextRequest) { // Next ≤15: middleware.ts + export `middleware`
  if (!req.cookies.get("session")) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
} // detail flag config/codemod berubah antar rilis — cek docs Next versi terpasang
```

🧪 **State modul server dibagi antar-request (§2 butir 5)** — render server bisa BERSAMAAN; level modul = memori bersama satu proses:

❌ **SALAH** (data user A muncul di response user B — bocor senyap tanpa error):
```tsx
let currentUser: User | null = null // level modul = dibagi SEMUA request
export default async function Page() {
  currentUser = await auth() // request B menimpa SEBELUM render request A selesai
  return <Dashboard />
}
async function Dashboard() { return <div>{currentUser?.name}</div> } // baca memori bersama
```
✅ **BENAR** (data request tetap lokal di pohon render — oper lewat props):
```tsx
export default async function Page() {
  const user = await auth()
  return <Dashboard user={user} /> // per-request, tak mungkin tertukar antar user
}
// pengecualian AMAN di level modul: config/aset immutable, cache lintas-request yang SENGAJA + ber-key benar
```

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai")

- [ ] Tak ada secret/rahasia server ikut ke Client Component / bundel browser? Modul sensitif (klien DB, pembaca secret) pakai `import "server-only"` di baris teratas — build gagal kalau di-impor Client Component?
- [ ] Tiap `"use server"` (Server Action) cek auth+otorisasi DI DALAM action (bukan cuma sembunyi tombol di UI)?
- [ ] Nama berkas middleware (`proxy.ts`/`middleware.ts`) sesuai versi `next` di `package.json`?
- [ ] Server Component = default; `"use client"` hanya saat butuh interaksi; Client tak impor Server Component (terima via `children`)?
- [ ] State server-only tak disimpan di level modul (dibagi antar-request)? Data per-request pakai `cache()`/`headers()`/`cookies()`?
- [ ] 4 state UI (loading/empty/error/success — `skills/a11y/SKILL.md`) + error boundary (`skills/react-patterns/SKILL.md`) ada?

> **Verifikasi WAJIB cuma-baca:** membuktikan = baca kode + build (menangkap penjaga `server-only`) + menalar. Uji IDOR pada Server Action: coba panggil action dengan ID milik orang lain.

---

## 5. Definition-of-Done (kapan skill next-core dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** rahasia tak bocor ke browser + penjaga `server-only` terpasang + Server Action ber-otorisasi + nama berkas middleware sesuai versi.
- [ ] **Edge case** ditangani: hydration mismatch (server vs client render beda), 2 request bersamaan menyentuh state modul-level, secret tak sengaja dioper sebagai props.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Build lulus (termasuk penjaga `server-only` kalau dipasang) + lint + test lulus lokal.

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Performa & pola render React** (anti-waterfall `Promise.all`, bundle/`dynamic`, re-render, `key` stabil, immutability, Web Vitals, tes komponen, Motion) → `skills/react-patterns/SKILL.md`.
- 📐 **Kalau Server Action/route handler jadi kontrak API penuh** (status code, amplop respons, otorisasi per-resource) → `skills/backend/SKILL.md`.
- 📐 **Keamanan web lebih dalam** (SQL injection, CSRF, rate-limit, upload, SSRF) → `skills/owasp/SKILL.md`.
- 📐 **Login/sesi/cek-izin (RBAC)** → `skills/auth/SKILL.md`.
- 📐 **a11y** (label, fokus, ARIA, kontras) → `skills/a11y/SKILL.md`.
- 🗃️ **LATAR — kredit (MIT © Affaan Mustafa):** pola `import "server-only"` dari `coding-standards`; aturan sadar-versi `proxy.ts` dari `nextjs-turbopack` — ECC v2.0.0 (ditulis-ulang non-programmer).
- 🗃️ **LATAR — kredit (MIT © Vercel, `vercel-labs/agent-skills` `react-best-practices`, serap 2026-08-09):** pasangan state-modul-bersama (§3) dari `server-no-shared-module-state`; dedup serialisasi RSC (§2 butir 7) dari `server-dedup-props`. **TIDAK diserap-ulang:** `server-auth-actions` (sudah tercakup §1/§3 sejak ECC) · `server-cache-react` (sudah di §2 butir 4) · `async-parallel`/`bundle-*` (rumahnya `skills/react-patterns`).

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** kerahasiaan secret server, kejelasan jalur otorisasi Server Action, keutuhan batas server↔client. **Mode-gagal khas** (kode "kelihatan benar" tapi bocor/rusak diam-diam): `NEXT_PUBLIC_*` menyimpan rahasia → siapa saja bisa ambil; Server Action dipanggil langsung tanpa lewat UI (tombol disembunyikan ≠ proteksi); salah-migrasi `middleware.ts`↔`proxy.ts` mematikan auth-guard TANPA error; state modul-level di server dibagi ke semua request → 2 user tabrakan data. **Mitigasi:** `import "server-only"` (build gagal kalau bocor) + auth&otorisasi di dalam Server Action + cek `package.json` sebelum sentuh middleware + state per-request (`headers()`/`cookies()`).
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan **lantai** keamanan boundary Next.js; **tidak menggantikan** audit keamanan penuh atau pengujian penetrasi. Fitur (`optimizePackageImports`, `after()`, `<Activity>`, `proxy.ts`) bergantung versi `next` terpasang — cek dokumentasi resmi versi ITU, jangan salin contoh dari internet mentah-mentah.

🙂 **Non-Programmer:** Next.js memisahkan sisi server (boleh pegang rahasia) dari sisi browser (semua yang dikirim ke situ bisa dilihat siapa saja) — kesalahan paling mahal adalah menaruh rahasia di sisi browser, atau lupa memasang cek login di Server Action karena mengira tombolnya sudah "disembunyikan" cukup aman. Skill ini memasang pagar untuk keduanya.
