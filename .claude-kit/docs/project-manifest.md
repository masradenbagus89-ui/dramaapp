# project-manifest.md — Kartu Identitas Project (`project.lintas.psd1`)

> Versi 1 · 2026-06-19 · Pendamping `lib/project-manifest.ps1` + catatan keputusan desain

## Tujuan

Memberi tiap project client **satu sumber kebenaran mesin-baca** untuk identitas + strukturnya,
supaya **AI baca 1 tempat** (tak meraba-raba struktur tiap sesi = cepat + hemat token) dan
ubah/baca project terpusat di 1 berkas. 🏢 Analogi: **"kartu identitas" project** — AI lihat
kartunya dulu sebelum kerja, bukan menebak dari banyak petunjuk.

Berbeda dari `docs/architecture.md` (narasi **prosa** untuk manusia, gampang basi): kartu ini
**terstruktur + dibaca mesin** + **dijaga robot anti-basi**. Keduanya saling melengkapi
(kartu menunjuk ke `architecture.md` lewat `refs.architecture`).

> Project kecil/solo tanpa banyak modul **boleh tanpa kartu ini** — `architecture.md` prosa sudah cukup.

## Cara Pakai

- **AI baca DULU** `project.lintas.psd1` saat mulai kerja (aturan `CLAUDE_universal_v1.md` §7.9).
- **Lahir otomatis saat pasang**: `setup-pola-b.ps1` menulis kartu ini — kolom `stack` diisi
  otomatis dari `package.json`; `intent` ditandai `'pending'`. **Idempoten**: kalau sudah ada, tak ditimpa.
- **AI isi `intent` di sesi pertama** (ganti `'pending'`) + **AUTO-SYNC `modules`** tiap struktur berubah.
- **Robot pemeriksa** (di Gerbang Pra-Rilis §4.6, atau manual):
  `pwsh .claude-kit/lib/project-manifest.ps1 -RepoRoot .`

## Field (skema v1)

| Field | Jenis sumber | Arti |
|---|---|---|
| `schema_version` | declared | Versi skema kartu (mulai 1). |
| `intent.purpose` / `intent.domain` | **declared** | Tujuan project + domain bisnis. Non-derivable → AI isi sesi pertama. |
| `stack.{type,package_manager,frameworks}` | **derive** | Diturunkan dari `package.json` + lockfile. **Jangan salin daftar dependency** — ringkasan saja. Robot cek cocok (DeriveMatch). |
| `refs.kit_version` | **reference** | Pointer `.claude-kit/.install-manifest.json#metadata.kit_version` — **jangan salin nomornya**. |
| `refs.{architecture,glossary,registry}` | reference | Pointer ke dokumen prosa pendamping. Robot cek path ada. |
| `modules[]` `{name,path,purpose,role}` | **declared** | Peta modul→lokasi (inti nilai kartu). `path` **wajib nyata** (robot PathExists). |
| `conventions[]` `{rule,applies_to}` | declared | Konvensi mesin-relevan singkat. |
| `split.{role,access_tier,base_name,portfolio_ref}` | declared | (Multi-repo) **CATATAN niat, BUKAN keamanan** — akses nyata di GitHub repo + CODEOWNERS (§8.1 #4). |

## Robot anti-basi (kenapa kartu ini ≠ catatan mati)

`lib/project-manifest.ps1` memeriksa kartu vs **kenyataan**, deterministik (~detik, ~0 token):
- **PARSE-OK** — berkas bisa dibaca (tidak rusak) + punya `schema_version`.
- **PathExists** — tiap `modules[].path` + `refs[]` yang dideklarasikan **ada di disk**.
- **DeriveMatch** — `stack.frameworks` ada di `package.json`; `stack.package_manager` cocok lockfile.
- **Konservatif** (anti alarm-palsu, §8.2): hanya MISMATCH bila bukti jelas; SKIP kalau tak bisa verifikasi.

Tanpa robot ini, kartu cuma "niat" yang akan basi diam-diam — persis nasib `portfolio.yml`
(lihat [PETA_SUMBER_KEBENARAN.md](PETA_SUMBER_KEBENARAN.md)).

## Keputusan desain (ringkas — kenapa begini)

- **Kenapa berkas `.psd1` (bukan JSON/YAML)?** PowerShell 5.1 membaca `.psd1` **native**
  (`Import-PowerShellDataFile`) + bisa **komentar `#`** per baris (ramah non-programmer). YAML
  **tak** punya parser native di PS 5.1 → itu yang membuat `portfolio.yml` gagal jadi sumber.
  *(JSON dipertimbangkan; dipilih `.psd1` karena pembaca utama = AI + PowerShell. Kalau kelak
  perlu dibaca Node/JavaScript juga, JSON jadi kandidat.)*
- **Kenapa berkas terpisah (bukan menempel di `architecture.md`)?** Batas kepemilikan jelas:
  prosa = manusia, kartu = mesin/AI. Mencegah staff tak sengaja merusak blok mesin → kartu mati senyap.
- **Kenapa derive/reference, bukan salin?** Menyalin fakta yang sudah ada (versi kit, dependency)
  = menciptakan duplikasi baru — justru lawan dari tujuan. Maka derive + robot-verifikasi.

## Dependensi

- `lib/project-manifest.ps1` — pembaca + robot + penulis bootstrap. Sumber: `lib/project-manifest.ps1:1`.
- `setup-pola-b.ps1` — menulis kartu saat pasang (blok sebelum `Save-Manifest`). Sumber: `setup-pola-b.ps1` (`Write-LintasProjectManifestIfMissing`).
- Contoh terisi: `templates/project.lintas.example.psd1`.
- Tes: `tests/project-manifest.Tests.ps1`.

## Catatan

- **Edge case**: project tanpa `package.json` → `stack.type='unknown'`, `package_manager=$null`,
  `frameworks=@()` → robot tetap BERSIH (cek stack di-SKIP, bukan alarm-palsu).
- **Uninstall**: kartu dilacak via hash — kalau sudah diisi (AI/user), uninstall **tidak** menghapus
  (knowledge aman); stub murni boleh dibersihkan.
- **Robot registry docs** (`Invoke-LintasRegistryCheck`, read-only): memastikan tiap `docs/*.md`
  **terdaftar** di `architecture_auto.md` (MISSING) + entri/link tak menunjuk berkas hilang (ORPHAN) —
  anti registry-basi (drift yang diakui di [PETA_SUMBER_KEBENARAN.md](PETA_SUMBER_KEBENARAN.md)).
- **Auto-daftar entri hilang** (`Add-LintasMissingRegistryEntry`): **APPEND** entri `docs/*.md` yang
  belum tercatat ke registry (ringkasan placeholder, AI lengkapi) — append-only, tak pernah menimpa;
  **bukan read-only** → TIDAK dipanggil di gerbang verifikasi, dipanggil eksplisit saat merapikan.
- **Ditunda (backlog)**: migrasi `.split-state` ke `split` (multi-repo); buat registry awal dari nol
  bila belum ada + tulis ringkasan otomatis (bukan cuma placeholder). Belum dikerjakan (keputusan terpisah).
