# project-map.md — Peta Aktivitas Project (cuma-baca)

> Versi 1 · 2026-07-12 · pendamping `engine/project-map.mjs` (Node)

## Tujuan
Ringkas **riwayat commit** (`git log`) jadi **fakta** yang gampang dibaca: berapa commit menyentuh tiap **modul** (dipetakan dari `project.lintas.jsonc` bila ada, kalau tidak pakai folder tingkat-atas), berapa commit per **jenis perubahan** (Conventional Commit: feat/fix/refactor/...), di **jendela** waktu/tag mana, modul deklarasi mana yang **tak tersentuh**, dan folder aktif mana yang **belum punya modul di kartu**.

Gunanya: **umpan on-demand** buat AI menyusun draf roadmap/peta jalan (lihat `rules/7.11-project-map.md`). **Cuma-baca, on-demand** — bukan daemon, bukan peta lengkap project, bukan roadmap masa depan.

🏢 Analogi: seperti **buku tamu proyek** — mencatat siapa menyentuh ruangan mana dan kapan. Bukan denah gedung (itu `docs/architecture.md`), bukan rencana renovasi (itu roadmap yang kamu putuskan).

## Cara Pakai
```bash
# Aktivitas sejak rilis (tag semver) terakhir, di folder kerja sekarang:
npx lintasai project-map
# Sejak tag/ref tertentu:
npx lintasai project-map --since v2.4.1
# Batasi N commit terakhir:
npx lintasai project-map --limit 50
# Keluaran mesin (JSON) untuk diproses AI:
npx lintasai project-map --json
# Panggil langsung berkasnya (di project client: .claude-kit/lib/...):
node .claude-kit/engine/project-map.mjs --project-root .
```
Output default = ringkasan Markdown di layar (header jujur + per-tipe + per-modul). **Tidak mengubah apa pun** (cuma membaca `git log`).

## Input / Output
- **Input**: `--project-root` / `--repo-root <path>` (default folder kerja; dispatcher `npx lintasai` menyuntik otomatis), `--since <tag|ref>`, `--limit <n>`, `--json`, `--quiet`.
- **Output**: Markdown (default) atau JSON (`--json`) berisi `_note` (batas jujur), `meta` (branch/jendela/kartu), `totals`, `by_type`, `by_module`, `active_modules`, `untouched_modules`, `unmapped_top_dirs`.
- **Exit code**: `0` = sukses (digest = informasi, **bukan** gerbang lulus/gagal). `1` = gagal keras (bukan repo git, atau `--since` menunjuk ref yang tak ada) — gagal-**nyaring**, tak pernah diam cetak digest kosong.

## Batas jujur (WAJIB baca)
- **Fakta, bukan tebakan.** Melapor apa yang git catat. Tak ada mode-gagal "kelewat 1 pemanggil" — beda dari graf-pemanggil otomatis yang ditolak `docs/decisions/ADR-001-percepatan-modifikasi-tanpa-indeks-graf.md`.
- **"Tak tersentuh" ≠ "mati".** Modul deklarasi tanpa commit di jendela = fakta jendela itu saja, bukan vonis. Jangan asal flag (§8.2 Aturan 3b).
- **Bukan roadmap.** Git = masa lalu; roadmap = rencana masa depan + keputusan manusia. Robot ini cuma memberi bahan.
- **Bukan pengganti peta.** Struktur project = `project.lintas.jsonc` + `docs/architecture.md`. Robot ini memperkuat SSOT (nama modul diambil dari kartu), bukan menduplikasi.

## Dependensi
- Node 18+ di Windows.
- `git` terpasang (robot menjalankan perintah git **baca-saja**: `rev-parse`, `tag`, `log`). Tak butuh jaringan.
- Kartu `project.lintas.jsonc` **opsional**: ada → modul dipetakan dari `modules[].path`; tidak ada → fallback ke folder tingkat-atas.

## Catatan
- **Cuma-baca + on-demand**: TIDAK ada daemon, TIDAK menyimpan state, TIDAK menyentuh git (tak fetch/commit/config), TIDAK menulis berkas. Keputusan roadmap tetap di manusia (gerbang di `rules/7.11-project-map.md`).
- **Deterministik**: fungsi inti (`parseGitLog`, `parseConventionalSubject`, `mapFileToModule`, `groupCommits`, renderer) = murni, dites tanpa git nyata di `tests/project-map.test.mjs`. Source: `engine/project-map.mjs:1`.
- **Rekonsiliasi keputusan**: kenapa robot fakta-git on-demand ini TIDAK melanggar ADR-001 → `docs/decisions/ADR-011-peta-aktivitas-git-on-demand.md`.
