# project-manifest.md — Kartu Identitas Project (`project.lintas.jsonc`)

> Versi 4 · 2026-07-10 · Pendamping `engine/project-manifest.mjs` + catatan keputusan desain. v4: kit 100% Node — kartu = `.jsonc` (kit era-v1 `.psd1`: migrator dicabut pasca-3.0.0, lihat UPGRADING.md).
> v3: cek `schema_version` sisi Node kini dibanding ke **peta versi-diharapkan** `engine/expected-schema.mjs` (Mesin 1 rencana internal STRATEGI_UPDATE_v2 — bukan lagi angka mati `>= 1`), penulis kartu menulis angka dari peta yang sama.
> v2: tambah bagian **"Cara Isi untuk staff non-programmer"** (panduan 3-lapis analogi — supaya kartu jadi pengetahuan bersama AI + staff, bukan artefak AI-saja).

## Tujuan

Memberi tiap project client **satu sumber kebenaran mesin-baca** untuk identitas + strukturnya,
supaya **AI baca 1 tempat** (tak meraba-raba struktur tiap sesi = cepat + hemat token) dan
ubah/baca project terpusat di 1 berkas. 🏢 Analogi: **"kartu identitas" project** — AI lihat
kartunya dulu sebelum kerja, bukan menebak dari banyak petunjuk.

Berbeda dari `docs/architecture.md` (narasi **prosa** untuk manusia, gampang basi): kartu ini
**terstruktur + dibaca mesin** + **dijaga robot anti-basi**. Keduanya saling melengkapi
(kartu menunjuk ke `architecture.md` lewat `refs.architecture`).

> Project kecil/solo tanpa banyak modul **boleh tanpa kartu ini** — `architecture.md` prosa sudah cukup.

> **Format (v2.0.0, kit 100% Node):** pemasang Node (`npx lintasai init`) menulis kartu sebagai
> **`project.lintas.jsonc`** (JSONC = JSON + komentar) yang dibaca robot `engine/project-manifest.mjs`.
> Kit era-v1 memakai **`project.lintas.psd1`** — kalau kartu itu masih ada, migrator otomatisnya
> sudah dicabut pasca-3.0.0: migrasikan lewat kit versi lama (2.9.0) atau tulis `.jsonc` baru manual
> dari `templates/project.lintas.example.jsonc` — langkah lengkapnya di UPGRADING.md.

## Cara Pakai

- **AI baca DULU** `project.lintas.jsonc` saat mulai kerja (aturan `CLAUDE_universal_v1.md` §7.9).
- **Lahir otomatis saat pasang**: pemasang (`setup-pola-b.mjs`) menulis kartu ini — kolom `stack` diisi
  otomatis dari `package.json`; `intent` ditandai `'pending'`. **Idempoten**: kalau sudah ada, tak ditimpa.
- **AI isi `intent` di sesi pertama** (ganti `'pending'`) + **perbarui `modules`** tiap struktur berubah.
- **Robot pemeriksa** (di Gerbang Pra-Rilis §4.6, atau manual):
  `node .claude-kit/engine/project-manifest.mjs --repo-root .`

## Field (skema v1)

| Field | Jenis sumber | Arti |
|---|---|---|
| `schema_version` | declared | Versi skema kartu (mulai 1). Angka yang **diharapkan kit versi ini** dideklarasikan di peta `engine/expected-schema.mjs` (sumber tunggal penulis + pemeriksa Node); kartu ber-versi **di bawah** angka peta divonis TAK COCOK = perlu migrasi (rencana internal STRATEGI_UPDATE_v2 Langkah 2). |
| `intent.purpose` / `intent.domain` | **declared** | Tujuan project + domain bisnis. Non-derivable → AI isi sesi pertama. |
| `stack.{type,package_manager,frameworks}` | **derive** | Diturunkan dari `package.json` + lockfile. **Jangan salin daftar dependency** — ringkasan saja. Robot cek cocok (DeriveMatch). |
| `environment.{recorded_node,recorded_node_major,recorded_os}` | **derive** | "Cap lingkungan" runtime saat pasang (versi Node + platform). Pembanding dev vs client — dibaca `kit doctor --env` ([env-check.md](env-check.md)). Bebas-rahasia (versi saja, bukan hostname/user). |
| `refs.kit_version` | **reference** | Pointer `.claude-kit/.install-manifest.json#metadata.kit_version` — **jangan salin nomornya**. |
| `refs.{architecture,glossary,registry}` | reference | Pointer ke dokumen prosa pendamping. Robot cek path ada. |
| `modules[]` `{name,path,purpose,role}` | **declared** | Peta modul→lokasi (inti nilai kartu). `path` **wajib nyata** (robot PathExists). |
| `conventions[]` `{rule,applies_to}` | declared | Konvensi mesin-relevan singkat. |
| `split.{role,access_tier,base_name,portfolio_ref}` | declared | (Multi-repo) **CATATAN niat, BUKAN keamanan** — akses nyata di GitHub repo + CODEOWNERS (§8.1 #4). |

## Cara Isi untuk staff non-programmer (3-lapis analogi)

Kartu ini terstruktur supaya AI cepat paham, tapi **kamu (staff) juga bisa membaca + ikut mengisinya** — supaya kartu jadi pengetahuan bersama, bukan milik AI saja. Tiap kolom diibaratkan begini:

- **`intent.purpose`** = ringkasan proyek. 🏢 kayak "tentang toko ini" / 📱 deskripsi toko di **Tokopedia** (jual apa + buat siapa). 🎯 Isi **2-3 kalimat**: (1) untuk siapa / berapa pengguna, (2) masalah apa yang dipecahkan, (3) fokus utamanya. Jangan terlalu pendek (jadi kabur) atau terlalu panjang (boros dibaca tiap sesi).
  - ✅ Baik: *"Dashboard tagihan internal untuk tim finance (5-20 staff). Mengganti rekap Excel yang sering salah hitung. Fokus: cepat input invoice + jejak siapa-ubah-apa."*
  - ❌ Terlalu kabur: *"Project untuk finance."*
  - ❌ Terlalu panjang: 5 paragraf sejarah project (AI harus baca ulang tiap sesi → boros).
- **`intent.domain`** = jenis bisnis singkat (mis. `invoice-finance`, `toko-online`, `seo-portfolio`). 🏢 kayak kategori di marketplace.
- **`modules`** = peta isi project. 🏢 kayak **denah lantai gedung** (lantai 2 = akuntansi, lantai 3 = gudang) / 📱 kayak menu kategori di aplikasi. Tiap modul punya `name` (nama), `path` (foldernya di mana), `purpose` (buat apa). **Inilah yang bikin AI langsung tahu** "fitur invoice ada di folder mana" tanpa meraba seluruh project = cepat + hemat token.
- **`stack`** = daftar alat yang dipakai project (mis. Next.js, Prisma). 🏢 kayak daftar peralatan di dapur. **Diisi otomatis** + dijaga robot — biasanya tak perlu kamu sentuh.
- **`refs`** = pintasan ke dokumen lain (peta arsitektur, glossary). 🏢 kayak daftar "lihat juga" di buku.

**Mau menambah modul baru** (mis. muncul folder fitur baru)? Cukup tambah **1 baris** di `modules`, contoh:
`{ "name": "laporan", "path": "src/features/laporan", "purpose": "ekspor laporan PDF", "role": "feature" }`.
Robot pemeriksa otomatis mengecek `path`-nya **benar-benar ada** di disk; kalau salah ketik, dia memberi tahu — kamu tak akan diam-diam salah. 🏢 kayak **Google Maps** yang langsung bilang "alamat tidak ditemukan" saat kamu salah tulis.

> Ragu? **Minta AI yang mengisi/mengubah**, kamu cukup mengecek hasilnya masuk akal. Robot anti-basi (bagian berikut) jadi jaring pengamannya — jadi aman bereksperimen.

## Robot anti-basi (kenapa kartu ini ≠ catatan mati)

`engine/project-manifest.mjs` memeriksa kartu vs **kenyataan**, deterministik (~detik, ~0 token):
- **PARSE-OK** — berkas bisa dibaca (tidak rusak) + punya `schema_version`. Membanding
  `schema_version` ke **peta versi-diharapkan** (`engine/expected-schema.mjs`, Mesin 1): kartu
  format-lama di bawah kit yang butuh format-baru → TAK COCOK (bukan "OK" palsu selamanya). Selisih
  dijaga tes pengunci `tests/expected-schema.test.mjs`.
- **PathExists** — tiap `modules[].path` + `refs[]` yang dideklarasikan **ada di disk**.
- **DeriveMatch** — `stack.frameworks` ada di `package.json`; `stack.package_manager` cocok lockfile.
- **Konservatif** (anti alarm-palsu, §8.2): hanya MISMATCH bila bukti jelas; SKIP kalau tak bisa verifikasi.

Tanpa robot ini, kartu cuma "niat" yang akan basi diam-diam — persis nasib `portfolio.yml`
(lihat [PETA_SUMBER_KEBENARAN.md](PETA_SUMBER_KEBENARAN.md) — internal, hanya di repo GitHub kit).

## Keputusan desain (ringkas — kenapa begini)

- **Kenapa `.jsonc` (JSON + komentar)?** Dibaca Node native (`JSON.parse` setelah strip komentar) +
  bisa **komentar** per baris (ramah non-programmer). *(Riwayat: kit era-PowerShell memakai `.psd1`
  karena PS 5.1 membacanya native via `Import-PowerShellDataFile`; sejak kit 100% Node, `.jsonc`
  menggantikannya — migrator mengonversi kartu `.psd1` lama.)*
- **Kenapa berkas terpisah (bukan menempel di `architecture.md`)?** Batas kepemilikan jelas:
  prosa = manusia, kartu = mesin/AI. Mencegah staff tak sengaja merusak blok mesin → kartu mati senyap.
- **Kenapa derive/reference, bukan salin?** Menyalin fakta yang sudah ada (versi kit, dependency)
  = menciptakan duplikasi baru — justru lawan dari tujuan. Maka derive + robot-verifikasi.

## Dependensi

- `engine/project-manifest.mjs` — pembaca + robot + penulis bootstrap. Sumber: `engine/project-manifest.mjs:1`.
- `setup-pola-b.mjs` — menulis kartu saat pasang.
- Contoh terisi: `templates/project.lintas.example.jsonc`.
- Tes: `tests/project-manifest.test.mjs` + `tests/project-manifest-registry.test.mjs`.

## Catatan

- **Edge case**: project tanpa `package.json` → `stack.type='unknown'`, `package_manager=null`,
  `frameworks=[]` → robot tetap BERSIH (cek stack di-SKIP, bukan alarm-palsu).
- **Uninstall**: kartu dilacak via hash — kalau sudah diisi (AI/user), uninstall **tidak** menghapus
  (knowledge aman); stub murni boleh dibersihkan.
- **Ditunda (backlog)**: migrasi `.split-state` ke `split` (multi-repo). Belum dikerjakan (keputusan terpisah).
