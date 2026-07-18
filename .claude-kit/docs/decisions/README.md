# docs/decisions/ — Catatan Keputusan (ADR) repo kit lintasAI

> Folder ini menyimpan **catatan keputusan teknis non-sepele** untuk repo kit INI (dogfood —
> selama ini kit mengirim template ADR ke project klien lewat `templates/decisions/`, tapi
> repo-nya sendiri belum memakainya).
>
> **Format + panduan lengkap** (kapan bikin ADR, penomoran, status lifecycle) = sumber tunggal di
> [`templates/decisions/README.md`](../../templates/decisions/README.md) — jangan diduplikasi di sini.
> Bikin ADR baru: salin [`templates/decisions/_TEMPLATE.md`](../../templates/decisions/_TEMPLATE.md)
> → `docs/decisions/ADR-<NNN>-<slug>.md`.

## Daftar ADR

| No | Judul | Status | Tanggal |
|----|-------|--------|---------|
| [ADR-001](ADR-001-percepatan-modifikasi-tanpa-indeks-graf.md) | Percepatan task modifikasi **tanpa** indeks/graf simbol otomatis | Accepted | 2026-06-19 |
| [ADR-002](ADR-002-runtime-hook-powershell-vs-node.md) | Runtime hook/robot — Node.js (override owner) | Accepted | 2026-06-20 |
| [ADR-003](ADR-003-migrasi-bertahap-powershell-ke-node.md) | Migrasi bertahap PowerShell → Node (Strangler Fig) — kunci 5 keputusan | Superseded oleh ADR-007 | 2026-06-21 |
| [ADR-004](ADR-004-konsolidasi-besar-ke-node.md) | Konsolidasi BESAR ke Node (~98%) — pensiun PS kecuali shim Windows-asli (memperluas appetite ADR-003) | Superseded oleh ADR-007 | 2026-06-22 |
| [ADR-005](ADR-005-jalur-tim-100-persen-node.md) | Jalur tim 100% Node — MOTW+penjaga junction+penulis versi `bump` diport (supersede klaim "MOTW shim PS permanen" di ADR-004); PS jadi cadangan | Superseded oleh ADR-007 | 2026-06-25 |
| [ADR-006](ADR-006-sistem-feedback-pembelajaran-lintas-client.md) | Sistem feedback pembelajaran lintas-client (human-in-the-loop, anti auto-evolve) | Accepted (arah & prinsip) | 2026-06-29 |
| [ADR-007](ADR-007-hapus-total-powershell-v2.md) | v2.0.0 — Hapus TOTAL PowerShell (kit 100% Node); supersede ADR-003/004/005 | Accepted | 2026-07-10 |
| [ADR-008](ADR-008-hook-penegak-checklist-penyelesaian.md) | Hook penegak checklist penyelesaian (DoD/PRE-SEND) — opsi opt-in; mekanisme = Stop hook (bukan PostToolUse); runtime ditunda | Accepted | 2026-07-11 |
| [ADR-009](ADR-009-perkuat-jangan-kurung.md) | lintasAI = perlengkapan otak Claude, BUKAN otak pengganti (3 lapisan: otak/perlengkapan/robot) | Accepted | 2026-07-12 |
| [ADR-010](ADR-010-kebijakan-industri-teregulasi.md) | Izinkan software industri teregulasi yang SAH (judi/gaming contoh utama); rambu kepatuhan = saran kuat, batas keras tetap | Accepted | 2026-07-12 |
| [ADR-011](ADR-011-peta-aktivitas-git-on-demand.md) | Peta Aktivitas Git on-demand (fakta, umpan draf roadmap human-gated) — rekonsiliasi ADR-001; ganti §7.1/§7.2 yang dihapus | Accepted | 2026-07-12 |
| [ADR-012](ADR-012-blok-belajar-junior-profesi.md) | Blok Belajar Junior-Profesi §4.1b (mini-pelajaran 5 baris per output substantif) + relabel dinamis Junior-<profesi>/Non-<profesi> di §4.1 (gating tetap) | Accepted | 2026-07-14 |
| [ADR-013](ADR-013-format-rencana-plan-mode.md) | Format Rencana Plan-Mode §4.19 (Pindai Cepat + Matriks intent + Pernyataan Cakupan + tangga belajar 2-versi) + robot plan-scout STATELESS + hook plan-mode kondisional; koreksi pagar "titik-risiko→✅" jadi berbahaya | Accepted | 2026-07-15 |
| [ADR-014](ADR-014-palang-fakta.md) | Palang Fakta (fact-gate) — penegak-mesin pra-edit berkas berdampak-tinggi (minta 4 fakta: pemakai/terdampak/skema/verbatim); adopsi ECC gateguard, DEFAULT MATI opt-in, dampening per-sesi, fail-open | Accepted | 2026-07-15 |

> 📦 Catatan paket npm (v2.0.0): **ADR-003 s/d ADR-006 + ADR-008 + ADR-009 + ADR-010 + ADR-011 hanya ada di repo GitHub** — tidak ikut dikirim ke client (ADR-003..006 = riwayat migrasi PowerShell; ADR-008 = catatan repo-dev untuk opsi hook yang belum dibangun; ADR-009 = doktrin arsitektur maintainer-facing dengan pointer 1-baris di §4.17 — jangkauan "repo-dev dulu"; ADR-010 = catatan keputusan kebijakan konten — izinnya sendiri sudah sampai ke client lewat aturan utama + pack + checklist domain, ADR-nya cukup repo-dev; ADR-011 = catatan maintainer rekonsiliasi ADR-001, framing-amannya sudah sampai ke client lewat header jujur robot `project-map` + `workflows/7.11-peta-project.md`; ADR-012 = catatan keputusan blok belajar + biaya-diterimanya — aturannya sendiri sudah sampai ke client lewat `CLAUDE_universal_v1.md` §4.1b + rak `workflows/4.1b-blok-belajar.md`; ADR-013 = catatan keputusan format rencana plan-mode §4.19 + koreksi pagar berbahaya — aturannya + robot plan-scout sudah sampai ke client lewat §4.19 + rak `workflows/4.19-plan-mode.md` + `lib/plan-scout.mjs`; ADR-014 = catatan keputusan Palang Fakta — robot `lib/fact-gate.mjs` ikut ke client tapi DEFAULT MATI (opt-in), ADR-nya cukup repo-dev). Yang ikut terkirim: ADR-001, ADR-002, ADR-007 + README ini.
