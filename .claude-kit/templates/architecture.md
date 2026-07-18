# docs/architecture.md — Peta Proyek `<NAMA_PROYEK>`
> Versi 1 · `[TBD: tanggal hari ini, format YYYY-MM-DD]`

> **🤖 AI — BACA BERKAS INI DULU (jalur READ-MINIMAL §7.3).** Ini **peta 1-halaman**: pakai untuk tahu berkas mana yang relevan, LALU `Grep` + `Read` berkas itu saja. **JANGAN jelajah seluruh repo** tiap sesi (boros token + lambat). Detail teknis fitur ada di `.md` masing-masing di `docs/`; kamus istilah di `docs/glossary.md`.
>
> **Aturan isi peta ini (biar tetap ringkas + tak menyesatkan):**
> 1. **JANGAN tulis angka gampang-basi** (jumlah tes/berkas/versi) di sini — tunjuk sumbernya (versi → `package.json`; jumlah tes → `npm test`; status → jalankan perintahnya). Angka mati di peta = cepat basi = AI salah info.
> 2. **Update tiap perubahan signifikan** (tambah modul, ganti stack, ubah ENV/konvensi). Peta basi = AI salah arah (§7.3a: dokumen untuk navigasi, KODE untuk kebenaran).
> 3. **Bagian yang belum diisi tandai `⛔ BELUM DIISI`** (bukan dibiarkan kosong/contoh) — supaya AI tahu itu belum tepercaya, bukan menelannya sebagai fakta.
> 4. Semua dokumentasi **Bahasa Indonesia** (konsisten `CLAUDE.md`).

---

## Peta Modul → Lokasi (ISI DULU — bagian paling penting untuk AI)
<!-- Bagian INI yang bikin AI cepat + gesit: dari sini AI tahu "fitur X ada di berkas mana" tanpa jelajah repo.
     Isi 5-10 modul/fitur yang PALING SERING disentuh. Hapus baris contoh sebelum commit. -->
| Modul / Fitur | Lokasi (`path`) | Tujuan (1 baris) | Dependensi Utama |
|---|---|---|---|
| `⛔ BELUM DIISI` | `⛔ BELUM DIISI` | ⛔ BELUM DIISI | ⛔ BELUM DIISI |

Contoh terisi (hapus): `auth` · `src/lib/auth/` · login/session/RBAC · `jose` (JWT) + Prisma.

---

## Tujuan Proyek
⛔ BELUM DIISI — 2-3 kalimat: apa yang dibangun? untuk siapa? masalah apa yang diselesaikan?

Contoh terisi: *"Aplikasi internal manajemen invoice untuk tim finance UKM. Menggantikan workflow Excel + email yang error-prone. Target user: 5-20 staff finance per tenant."*

---

## Stack
- **Bahasa utama**: ⛔ BELUM DIISI (mis. TypeScript 5.4 / Python 3.12 / Go 1.22)
- **Framework**: ⛔ BELUM DIISI (lihat `templates/STACK_VERSIONS.md` untuk versi recommended)
- **Runtime / Build**: ⛔ BELUM DIISI (mis. Node 20 LTS / Bun 1.1 / uv)
- **UI / Styling**: ⛔ BELUM DIISI (mis. Tailwind 4 + shadcn/ui)
- **DB / ORM**: ⛔ BELUM DIISI (mis. PostgreSQL 16 + Prisma 5)

> Kartu mesin `project.lintas.jsonc` (di akar) mengisi stack ini OTOMATIS dari `package.json` + dijaga robot anti-basi — peta ini versi bacaan-manusianya.

---

## Struktur Folder
<!-- Tree contoh proyek Node. Untuk Python/Go/Dart, ganti sesuai konvensi bahasa (mis. `cmd/`, `internal/`, `lib/`). -->
```text
<root>/
├── src/             // source code utama
├── public/          // aset statis (gambar, favicon)
├── docs/            // dokumentasi per-modul + architecture.md ini
├── prisma/          // skema DB & migrasi   [hapus kalau tidak pakai Prisma]
├── tests/           // unit & integration test
├── scripts/         // skrip operasional (seed, backup, dll)
├── .env.example     // template ENV (jangan commit .env asli!)
└── package.json     // (atau pyproject.toml / go.mod / pubspec.yaml)
```

---

## Entry Points
- **App utama**: ⛔ BELUM DIISI (mis. `src/app/layout.tsx` / `main.py` / `cmd/server/main.go`)
- **Halaman pertama**: ⛔ BELUM DIISI (mis. `src/app/page.tsx` / route `"/"`)
- **Background worker / cron**: ⛔ BELUM DIISI (kosongkan kalau tidak ada)

---

## Environment Variables
<!-- JANGAN tulis nilai asli. Selalu pakai contoh format / placeholder. -->
**Loader**: `.env.local` (dev) → dashboard platform (prod, mis. Vercel/Railway/Fly). Template: `.env.example` di root.

| Nama | Wajib? | Tujuan | Contoh Format |
|---|---|---|---|
| `DATABASE_URL` | ya | Koneksi DB utama | `postgresql://user:pass@host:5432/db` |
| `⛔ BELUM DIISI` | [ya/tidak] | ⛔ BELUM DIISI | ⛔ BELUM DIISI |

---

## Skrip & Perintah
<!-- Contoh di bawah Node. Ganti sesuai stack. -->
- `npm run dev` — server dev (hot reload)  *(Python: `uv run dev` · Go: `go run ./cmd/server`)*
- `npm run build` — build production
- `npm run test` — jalankan unit test
- `npx prisma migrate dev` — bikin & apply migrasi DB lokal *(kalau pakai Prisma)*
- ⛔ BELUM DIISI — skrip spesifik proyek (seed, lint, deploy, dll)

---

## Sumber Data Eksternal
- **Database utama**: ⛔ BELUM DIISI (mis. *"Supabase Postgres, lihat `docs/db.md`"*)
- **API eksternal**: ⛔ BELUM DIISI (mis. *"Stripe (payment), Resend (email); client di `src/lib/clients/`"*)
- **Cache / Queue / Storage**: ⛔ BELUM DIISI (mis. Redis Upstash, Supabase Storage — atau *"tidak pakai"*)

---

## Konvensi Penting
<!-- 3-7 aturan yang KALAU dilanggar = bug/inkonsistensi. Hapus contoh, isi sesuai proyek. -->
- ⛔ BELUM DIISI — konvensi route (mis. *"semua handler API pakai middleware auth wrapper di `src/lib/<helper>.ts`"*)
- ⛔ BELUM DIISI — penamaan file (lihat `docs/glossary.md` "Aturan Penamaan")
- ⛔ BELUM DIISI — pola error handling (mis. *"selalu return `{ ok: false, error }`, jangan throw"*)
- ⛔ BELUM DIISI — format commit (mis. Conventional Commits `feat:`/`fix:`)

---

## Testing & Quality Gates
- **Framework test**: ⛔ BELUM DIISI (mis. Vitest / pytest / go test)
- **Lint / format + pre-push**: ⛔ BELUM DIISI (mis. `npm run check` = lint + typecheck + test)
- **Coverage minimum**: ⛔ BELUM DIISI (mis. 60% di `src/lib/`, atau *"belum di-enforce"*)

> Jumlah tes / status hijau JANGAN ditulis angkanya di sini — jalankan perintah di atas (§6.3 de-fragilize).

---

## Deploy, Rilis & Rollback
Ringkas di sini; **detail + decision tree ada di `./.claude-kit/templates/CLAUDE_TEAM_GUIDE.md`** (jangan digandakan supaya peta ini tetap 1-halaman + tak drift).
- **Hosting + auto-deploy**: ⛔ BELUM DIISI (mis. *"Vercel: `main` → production, PR → Preview auto"*)
- **Risk Level (🟢/🟡/🔴)** → `CLAUDE_TEAM_GUIDE.md` section 7b.
- **Rollback** (target <5 menit): `git revert HEAD && git push` → platform auto-deploy versi sebelumnya. Playbook: `CLAUDE_TEAM_GUIDE.md` section 13b.
- **Backup DB**: ⛔ BELUM DIISI (mis. *"Supabase daily auto-backup 7 hari; snapshot manual WAJIB sebelum PR migrasi"*)
- **Feature flag** = opsi lanjutan (post-launch): `templates/feature-flags-advanced.md`.

---

## Dokumen Terkait
| File | Fungsi |
|---|---|
| `glossary.md` | Kamus istilah domain, role, status, & aturan penamaan |
| `⛔ BELUM DIISI` | ⛔ BELUM DIISI (mis. `auth.md` — flow login/session/RBAC) |

> Aturan dokumentasi: tiap fitur/modul baru wajib punya `.md` pendamping (`CLAUDE.md` global §7).

---

## Riwayat Perubahan
| Versi | Tanggal | Author | Ringkasan |
|---|---|---|---|
| 1 | `[TBD: YYYY-MM-DD]` | `<nama/handle>` | Inisialisasi architecture.md |
