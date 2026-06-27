# docs/architecture_auto.md - Registry semua file .md pendamping (TOC)

> Versi 1 · 2026-05-31 · **AUTO-MAINTAINED OLEH AI**
> Aturan: `CLAUDE_universal_v1.md` seksi 7.4 ARCHITECTURE REGISTRY

## Pengantar

File ini adalah **registry/TOC semua file `.md` pendamping** di folder `docs/`. Tujuannya: AI baca file ini DULU di awal sesi untuk tahu apa yang available, lalu cherry-pick `.md` spesifik sesuai task - **bukan baca semua `docs/*.md`** (cegah boros token saat docs membesar).

**Maintainer**: AI auto-maintain. Tiap kali AI tambah / rename / hapus `.md` pendamping (lewat AUTO-SYNC atau LAZY-GENERATE), file ini WAJIB ter-update di sesi yang sama.

**Pisah dari `architecture.md`** (yang user-edited): supaya user-edit peta makro tidak konflik dengan AI auto-maintain registry.

---

## Format entri

`- [<filename>.md](<path>) - <summary singkat 1 baris, max 80 karakter>`

Contoh:
```
- [auth.md](auth.md) - Modul autentikasi (login + session + RBAC)
- [security/encryption.md](security/encryption.md) - AES-GCM credential vault
```

---

## Top-level (`docs/*.md`)

<!-- AI tambah baris baru di sini tiap LAZY-GENERATE / BOOTSTRAP -->
<!-- Format: - [<filename>](<path>) - <summary> -->

### Catatan fitur/kode proyek (dibuat saat setup lintasAI 2026-06-20)
- [db.md](db.md) - Denah database: 5 tabel + 3 fungsi RPC atomik, RLS nonaktif, fallback JSON
- [auth.md](auth.md) - Login penonton tanpa password + admin password & 2FA TOTP + sesi HMAC
- [wallet.md](wallet.md) - Ekonomi koin: dapat (check-in/iklan) & pakai (buka episode premium)
- [payments.md](payments.md) - Top-up koin via Midtrans Snap + webhook (belum aktif, balas 501)
- [data-layer.md](data-layer.md) - Lapisan data: Supabase REST vs file JSON + RPC + CRUD drama
- [glossary.md](glossary.md) - Kamus istilah domain (koin, unlock, premium, check-in, viewer/admin)
- [request-guard.md](request-guard.md) - Penjaga endpoint koin: anti-CSRF (Origin) + pembatas laju per-IP

### Catatan keputusan (ADR)
- [decisions/2026-06-20-audit-findings.md](decisions/2026-06-20-audit-findings.md) - Hasil audit 11 sudut: 73 temuan + rencana pengerjaan bertahap

> Catatan: berkas `docs/*.md` lain (CLAUDE_TEAM_GUIDE, PROMPT_LIBRARY, ONBOARDING, MCP_SETUP, dll) = panduan tim bawaan kit, bukan catatan kode proyek.

---

## Subfolder (kalau scale > 30 file)

<!-- Hanya muncul kalau docs/ sudah pakai subfolder grouping (security/, api/, features/). -->
<!-- AI auto-add section per subfolder + list file di dalamnya. -->

*(Tidak ada subfolder. Default flat di `docs/` sampai docs > 30 file - baru pakai grouping.)*

---

## Pending docs (LAZY-GENERATE skipped)

<!-- File kode CRITICAL yang user skip generate. AI tawarin lagi saat sentuh file di sesi berikutnya. -->
<!-- Format: - <source-path> - kena pattern <kategori>, user skip pada <tanggal> -->

*(Belum ada - bagian ini terisi otomatis kalau user pilih "n" saat AI sugest LAZY-GENERATE.)*

---

## Riwayat update registry

| Tanggal | Aksi | Catatan |
|---|---|---|
| 2026-05-31 | Inisialisasi | Skeleton (registry TOC kosong, AI auto-update saat ada `.md` baru). |
| 2026-06-20 | Tambah 6 catatan + 1 ADR | Setup lintasAI: db/auth/wallet/payments/data-layer/glossary + audit-findings. |
| 2026-06-27 | Tambah 1 catatan | request-guard.md: penjaga koin anti-CSRF + pembatas laju (mitigasi IDOR/CSRF audit). |

<!-- AI tambah baris baru tiap update registry (file baru / rename / hapus). -->
