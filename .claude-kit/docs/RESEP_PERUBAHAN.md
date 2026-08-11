# RESEP_PERUBAHAN.md — Berkas mana yang ikut bergerak per jenis perubahan

> Versi 5 · 2026-07-18 · Untuk maintainer + AI yang kerja DI repo kit lintasAI
> (v5: Resep 12 "robot penjaga wajib punya gagang" + langkah 0 cek frasa terkunci di Resep 2)

## Untuk apa berkas ini

Masalah yang dipecahkan: fakta yang sama (nomor versi, jumlah, daftar fitur) ditulis di
**banyak berkas**. Ganti satu, gampang lupa salinannya → bug "file A lupa, file B lupa,
file C sudah" yang baru ketahuan saat scan menyeluruh (lambat + boros token).

Resep ini = **peta blast radius** (= seberapa luas dampak): untuk tiap jenis perubahan,
berkas mana yang **selalu ikut bergerak**. Manfaatnya:

- ⚡ **Cepat & hemat token** — AI langsung tahu daftar berkas yang harus disentuh, tak perlu
  menjelajah ulang repo tiap kali.
- 🛡️ **Anti lupa** — resep ini = daftar centang. Tidak ada salinan yang terlewat.
- 🤖 **Diverifikasi robot** — setelah ikut resep, jalankan robot pemeriksa (di bawah) untuk
  membuktikan tak ada yang basi.

🏢 Analogi: kayak **checklist pramugari sebelum lepas landas** — bukan mengingat-ingat tiap
kali, tapi baca daftar tetap: pintu, sabuk, meja lipat. Resep ini daftar tetap itu untuk kode.

---

## 🤖 Pemeriksa otomatis (jalankan SEBELUM bilang "selesai")

### Gerbang 1-perintah (cara utama) — `npm run preflight`

Menjalankan **semua pemeriksa sekaligus** + **cek kelengkapan rilis** lalu memilah hasil jadi
**GENTING / PENTING / RAPIKAN** dengan satu kode-keluar. Ini gerbang resmi §4.6 (QA+QC). Isinya:
tes Node + ESLint + robot kecocokan + pemindai huruf-tipuan (Unicode) + smoke Node +
cek "versi naik → `CHANGELOG.md` ada entrinya? kerangka sudah diisi?".

```bash
npm run preflight              # kerja harian: hanya GENTING (lampu merah) yang menghentikan
npm run preflight:strict       # saat MAU RILIS: PENTING (lampu kuning) ikut menghentikan
```

- ✅ Keluar kode `0` = lulus (boleh dilanjut).
- ❌ Keluar kode `1` + daftar temuan = **ada pemblokir, sebut berkasnya** → perbaiki dulu.

Detail: [preflight.md](preflight.md). Sudah jadi pemeriksa CI juga (`.github/workflows/validate.yml`
+ gerbang sebelum terbit npm di `publish-npm.yml`).

### Cek cepat satu hal — robot kecocokan

Kalau cuma mau cek kecocokan angka (lebih cepat dari preflight penuh), panggil robotnya langsung —
hitungan detik, biaya token ~nol (ini skrip, bukan AI baca-baca berkas):

```bash
node engine/consistency-check.mjs        # atau: npx lintasai consistency-check
```

- ✅ Keluar kode `0` + "BERSIH" = semua deklarasi yang dijaga cocok dengan sumbernya.
- ❌ Keluar kode > 0 + daftar "[TAK COCOK]/[HILANG]" = **ada yang basi, sebut berkasnya** → perbaiki.

Robot ini juga jalan otomatis dalam suite tes (`tests/consistency-check.test.mjs`), jadi
ketidakcocokan **menggagalkan tes** sebelum rilis.
Sumber: [engine/consistency-check.mjs](../engine/consistency-check.mjs).

> **Apa yang dijaga robot saat ini:** (a) **NOMOR VERSI** di 5 dokumen vs `package.json`
> (`KIT_VERSION_CHECKS`); (b) **JUMLAH FILE TIM** (total + rincian `.github`/`docs`),
> dihitung otomatis dari blok `teamFiles` di `setup-pola-b.mjs` (`KIT_FACTS`).
>
> **Menambah fakta baru yang dijaga:** tambah blok di `KIT_FACTS` (`engine/consistency-check.mjs`).
> Syarat fakta **layak** dijaga: punya **1 sumber yang bisa dihitung** + pola tulisan **tidak ambigu**
> (jangan jaga frasa bermakna ganda → alarm palsu).
> **Angka konsep** (mis. "10 divisi", "18 kriteria") **bukan** turunan-kode + polanya ambigu → JANGAN
> dijaga robot; jaga **daftarnya** lewat tes struktural (mis. `tests/skills-divisi.test.mjs`,
> `tests/roster-sync.test.mjs` = penjaga sinkron daftar-nama/hub lintas-berkas).
> Penanda **sejarah** (mis. "fitur ini lahir di v1.30.0", laporan audit bertanggal, angka tes per rilis
> di `CHANGELOG.md`) SENGAJA menyimpan nilai lama → JANGAN dimasukkan ke daftar robot.
> **Angka turunan-kode di prosa** (mis. "jumlah tes", "jumlah file") yang TAK punya sumber-daftar rapi →
> **jangan ditulis angka tetapnya**; rujuk sumber/berkasnya (mis. "lihat `tests/<...>`").

---

## Resep per jenis perubahan

### 1. Naikkan versi / rilis
**Cara cepat (1 perintah):** `node kit.mjs bump X.Y.Z` (mis. `node kit.mjs bump 1.42.0`) — otomatis mengecap nomor versi ke 5 berkas di bawah + menambah kerangka entri CHANGELOG (tanggal otomatis) + menjalankan robot pemeriksa. Kamu tinggal **menulis deskripsi CHANGELOG** (ganti placeholder).
Berkas yang membawa **versi-saat-ini** (referensi / fallback manual — semua diset ke versi baru):
- `package.json` — `"version"` (= **sumber kebenaran**, ubah ini dulu)
- `CHANGELOG.md` — tambah entri baru `## [X.Y.Z] - <tanggal>` di **paling atas**
- `CLAUDE_universal_v1.md` — judul `> Versi X.Y.Z · ...` (kalau aturan ikut berubah)
- `README.md` — baris "Versi stabil sekarang: **vX.Y.Z**"
- `templates/INDEX.md` — judul "Daftar Lengkap Dokumen lintasAI vX.Y.Z"
- ➡️ **Jalankan robot** untuk verifikasi semua cocok.
- Penomoran: ikut semver (§11 CLAUDE_universal) — perbaikan kecil = angka KECIL, fitur = MENENGAH,
  breaking = BESAR. Label `[SECURITY]` untuk perbaikan keamanan mendesak.

### 2. Tambah / ubah ATURAN di `CLAUDE_universal_v1.md` (auto-baca tiap sesi staff)
- **Langkah 0 — `npx lintasai locked-phrases`** (khusus saat MEMADATKAN/menulis-ulang, §4.18): cetak
  frasa harfiah yang DIKUNCI tes sebelum menyentuh teksnya. Kalau dilewati, frasa terkunci bisa hilang
  tanpa sadar dan baru ketahuan lewat tes merah — pernah terjadi 2026-07-18 pada
  `Pengecualian 8 skill divisi WAJIB` (§4.9). Alat ini **heuristik**: daftar kosong ≠ aman, bukti tetap `npm test`.
- `CLAUDE_universal_v1.md` — tulis aturan + naikkan versi judul
- rak `rules/<seksi>.md` — kalau aturan punya detail rujukan on-demand (hemat token always-load); lihat Resep 10
- `CHANGELOG.md` + naikkan versi (lihat Resep 1)
- `tests/` — tambah/sesuaikan tes yang **mengunci** aturan. Pagar frasa Tingkat-1 yang akan MERAH
  kalau jangkar hilang = `tests/tingkat1-guard.test.mjs`; daftar/checklist 8 divisi = `tests/skills-divisi.test.mjs`;
  sinkron salinan roster/hub = `tests/roster-sync.test.mjs`. (mis. `setup-pola-b-write.test.mjs` punya
  tes "section N punya ...")
- ⚠️ Ingat: efek aturan baru baru terasa di project staff **setelah mereka update kit + buka chat baru**.

### 3. Tambah / ubah FITUR kode — **WAJIB ikut (4 hal): tes + dokumen + CHANGELOG + versi**
Kit 100% Node (`lib/*.mjs`, `bin/`, skrip `*.mjs`):
- **Kode** yang diubah: berkas `.mjs` / `lib/` itu sendiri.
- **Tes (WAJIB)** — minimal 1 happy-path (§4 DoD): `tests/<...>.test.mjs` (`node:test`).
- **Dokumen pendamping (WAJIB kalau substansial)** — `docs/<basename>.md` diperbarui:
  signature/behavior/dependency/edge-case baru.
- **CHANGELOG + naikkan versi (WAJIB)** — lihat Resep 1 (semver §11: perbaikan=KECIL, fitur=MENENGAH,
  breaking=BESAR; tandai `[SECURITY]` kalau keamanan mendesak).
- **Berkas BARU?** Cek `package.json` `files[]` — kalau pola folder belum mencakupnya, tambahkan supaya
  ikut terbit ke npm (dijaga `tests/package-bundle.test.mjs`). Modul lib yang dipakai runtime:
  daftarkan juga di `engine/kit-files.json` `node_lib` (dijaga `tests/kit-files.test.mjs`).
- ➡️ **Tutup dengan `npm run preflight`** (gerbang §4.6) → semua lulus baru boleh bilang "selesai".

### 4. Ubah ANGKA/JUMLAH yang tersebar (mis. jumlah tes, jumlah file, jumlah lensa/kriteria)
- `Grep` angka itu di seluruh repo → update **semua** kemunculan.
- **Lebih baik lagi: hapus angka turunan-kode dari prosa** (jumlah tes/file) → rujuk sumber/berkasnya
  (mis. "lihat `tests/<...>`", "hitung dari `engine/kit-files.json`"). Lebih sedikit salinan = lebih sedikit
  peluang basi. *(Pelajaran Tahap B 2026-06-24.)*
- **Jaga robot HANYA kalau lolos syarat** (1 sumber bisa dihitung + pola tak ambigu): tambah blok di
  `KIT_FACTS` (`engine/consistency-check.mjs`). Angka **konsep** (lensa/kriteria/divisi) berpola ambigu →
  JANGAN robot; jaga **daftarnya** lewat tes struktural.

### 5. Hapus fitur / berkas
- `Grep` pemakaian NYATA berkas/fungsi yang dihapus (pemanggil) — jangan andalkan dokumen saja (§7.3a)
- Hapus berkas + entri di `package.json` `files[]` (kalau eksplisit terdaftar)
- `docs/<basename>.md` pendamping — hapus/perbarui
- `CHANGELOG.md` + naikkan versi (breaking? → angka BESAR + `BREAKING CHANGE:`)

### 6. Bug LOLOS / kelas-bug tak ada penjaganya → Buku Pelajaran (§6.4)
Saat bug ketahuan **terlambat** (lolos ke rilis / sesi lain / dilaporkan user) ATAU kamu temukan
kelas-bug yang **tak ada penjaga otomatisnya** → JANGAN cuma diperbaiki sekali. Ubah jadi penjaga permanen:
- **Usul** entri di `docs/BUKU_PELAJARAN.md` (status USULAN) + penjaga konkret → **owner setujui** →
  **pasang** penjaga → status TERPASANG (isi baris **Penjaga (berkas)** dengan path nyata).
- Penjaga = **fakta-dijaga** → ikut Resep 4 (robot `$KitFacts`). Penjaga = **langkah-cek** → tambah ke
  `tests/preflight.mjs` (Resep 3). Penjaga = **tes regresi** → `tests/<...>.test.mjs`.
- Dijaga `tests/buku-pelajaran.test.mjs` (tiap TERPASANG wajib menunjuk berkas yang ADA).
- **DILARANG:** AI ubah aturan sendiri diam-diam / skor-keyakinan ber-angka / "naluri" (§6.4 + §6.2).

### 7. Ubah TOPOLOGI / jumlah repo (model split, "berapa repo per mode")
**Sumber tunggal = `docs/plans/POLA_REPO_AMAN.md`.** JANGAN tulis angka repo tetap ("3 repo", "6-10") di berkas lain — rujuk prinsip **"jumlah ikut wilayah rahasia + kelompok tim, bukan angka target"**. Kalau prinsip/contoh topologi berubah, berkas yang ikut bergerak:
- `docs/plans/POLA_REPO_AMAN.md` — ubah DI SINI dulu (sumber tunggal)
- `SPLIT_REPO_MIGRATION_PROMPT_v1.md` — Mode Selector + label + tabel penamaan
- `JALANKAN_KIT.md` — Peta Langkah (Bagian 0) + Pecah Repo on-demand (Bagian 3c) + menu kapabilitas di Laporan Penutup (Bagian 2)
- `README.md` — klaim publik
- `docs/PETA_SUMBER_KEBENARAN.md` — baris "Model + jumlah repo topologi" (Tabel C) *(internal — hanya di repo GitHub kit)*
- ⚠️ **TIDAK dijaga robot** (angka topologi tak bisa dihitung dari 1 sumber + pola "3 repo" ambigu → alarm palsu). Andalkan **rujukan ke sumber tunggal** + jalankan **"lintasAI skill"** (§4.8) saat mau rilis untuk menangkap drift konseptual. JANGAN paksa robot di sini. *(Pelajaran: drift "2 vs 3 repo" + "6-10 vs 5/6/7" caught 2026-06-24 lewat scan owner, BUKAN robot — robot memang tak bisa.)*

### 8. Ubah versi stack framework (Next.js / React / Prisma / Node / dll)
**Sumber tunggal = `templates/STACK_VERSIONS.md`.** Ubah angka versi **DI SINI dulu** — jangan di tempat lain.
- **Cari semua konsumen dengan `Grep "STACK_VERSIONS"`** (jangan andalkan daftar keras — template baru bisa menambah perujuk). Per 2026-06-24 perujuknya a.l.: `STACK_GUIDE.md`, `STACK_DETECTION_PATTERN.md`, `PROJECT_STARTER_TEMPLATES.md`, `split-agents/{FRONTEND,BACKEND,DASHBOARD}.md`, `templates/architecture.md`.
- **ATURAN ANTI-DRIFT — konsumen WAJIB merujuk lewat KALIMAT**, mis. *"Next.js (lihat STACK_VERSIONS.md untuk versi terbaru)"* — **JANGAN salin angka versi** ("Next.js 16", "Prisma 7") ke konsumen. (Drift "angka ditulis di 2 tempat" sudah dibersihkan dulu — lihat entri Stack di `CHANGELOG.md`; jangan dihidupkan lagi.)
- ⚠️ **TIDAK dijaga robot (by design).** Versi stak gagal 2 syarat robot: (a) bukan angka yang bisa **dihitung** dari 1 sumber — ini keputusan kebijakan "minimum/recommended/tested"; (b) pola "16.x"/"5+" **ambigu** → robot malah salah-alarm pada "Node 18.x"/"TypeScript 5+" yang sah. Andalkan **rujukan ke sumber tunggal** + verifikasi angka via `npm view <pkg> version` saat upgrade (catatan ini sudah tertulis di STACK_VERSIONS.md).

### 9. Naikkan versi skema artefak klien (`schema_version` kartu project / catatan-pasang)
**Sumber tunggal = `engine/expected-schema.mjs`** (peta versi-diharapkan, Mesin 1 rencana
internal STRATEGI_UPDATE_v2, riwayat git). Naikkan angka **DI SINI dulu** — penulis + pemeriksa sisi Node
(`engine/project-manifest.mjs`, `engine/manifest.mjs`, `uninstall.mjs`) ikut otomatis lewat `import`.
- **Salinan yang TAK bisa import** (template contoh) dijaga tes pengunci
  `tests/expected-schema.test.mjs` — habis naikkan angka, jalankan tes itu: yang MERAH = daftar
  berkas yang belum ikut (a.l. `templates/project.lintas.example.jsonc`).
- **WAJIB sertakan migrator + entri `CHANGELOG.md` ber-label `[BREAKING]` + "Migration Steps"**
  (Keranjang 1 rencana §3) SEBELUM rilis — menaikkan angka tanpa migrator = artefak klien lama
  langsung divonis TAK COCOK tanpa jalan keluar. **Dikunci MESIN** (Langkah 4+5): penjaga preflight
  `checkSchemaRaiseBreaking` (`tests/preflight.mjs`) membanding peta vs rilis ber-tag terakhir —
  angka naik TANPA `[BREAKING]` di entri CHANGELOG teratas = **GENTING** (gerbang gagal); label ada
  tapi nama artefak / "Migration Steps" / langkah **SIMULASI** / entri **`UPGRADING.md`** belum
  ditulis = PENTING; angka TURUN / entri hilang dari peta = PENTING (arah sebalik tak lolos senyap).
- **`UPGRADING.md` ikut bergerak** (Langkah 5): tiap rilis ber-`[BREAKING]` tambah bagian
  "vLAMA → vBARU" di sana (kerangka entri ada di berkasnya) — buku panduan pindah-versi klien,
  terpisah dari CHANGELOG. **Pelapornya sudah jalan**
  (Mesin 2 / Langkah 3): robot
  `engine/migration-state.mjs` otomatis lapor di `kit doctor` (bagian 2c — doctor MERAH sampai artefak
  menyusul) + `update` Langkah 7 ("Termigrasi X dari Y ... SELESAI SEBAGIAN"). Migrator yang kamu
  buat WAJIB **mencatat ke buku-besar** via `recordLintasMigrationApplied(root, { artifact,
  toVersion })` (idempoten — dicatat 2× tetap 1 entri) supaya tak dijalankan dobel.
- **Artefak BARU ber-penanda?** Selain entri peta, daftarkan lokasinya di `ARTIFACT_LOCATIONS`
  (`engine/migration-state.mjs`) — tanpa itu robot laporan LEMPAR error jelas (fail-closed, dikunci
  tes "resolver lengkap" `tests/migration-state.test.mjs`).
- Tes fixture yang menulis `schema_version: 1` keras (mis. `tests/rollback.test.mjs`,
  `tests/uninstall.test.mjs`) akan ikut merah → perbarui sadar-sadar, jangan dibisukan.

### 10. Tambah / pindah SEKSI rujukan on-demand (rak `rules/`)
**Sejak v2.4.0 detail aturan hidup di rak `rules/` — 1 seksi = 1 berkas, rujukan = path literal.**
Berkas yang SELALU ikut bergerak saat menambah/memindah/mengganti-nama seksi:
- `rules/<nomor>-<slug>.md` — berkas seksinya; **baris-1 WAJIB** penanda `<!-- LINTAS:SEKSI §<id> -->`
  (id huruf kecil; id pertama harus muncul di nama berkas; boleh multi-id utk seksi gabungan).
- `rules/INDEX.md` — tambah/perbarui baris tabelnya (daftar isi utk manusia + cadangan AI).
- `engine/kit-files.json` grup `workflows` — daftarkan berkasnya (tanpa ini TIDAK terkirim ke client).
- Perujuknya (`CLAUDE_universal_v1.md` dll.) — tulis rujukan sebagai **path** `rules/<berkas>.md`;
  gaya lama (nama berkas monolit lama + nomor "§X") DILARANG — ditolak robot, cek istilah-pensiun.
- ➡️ **Dikunci MESIN:** `node engine/rules-ref-check.mjs` (atau `npm run preflight`) — rujukan putus /
  berkas yatim / INDEX basi / penanda salah = MERAH. `--report` = inventaris semua rujukan.
- ⚠️ Nomor § seksi lama JANGAN dinomori ulang (banyak perujuk lintas-berkas + memory AI client);
  berkas >18 KB → pecah sub-seksi (contoh: `rules/stack/4.14-*.md`).

### 11. Tambah / hapus item KELUARGA "hub + berkas per-item" (pola HISTORIS — kini item jadi skill)
> **CATATAN ADR-027:** ketiga keluarga lama `rules/div/*` (divisi), `rules/pola/*` (pola bantu),
> `rules/cap/*` (capability pack) sudah DIMIGRASI jadi `skills/<nama>/SKILL.md` (rak asal kini
> hanya di riwayat git). Folder `rules/div|pola|cap/` tak ada lagi; `tests/roster-sync.test.mjs` FAMILIES sudah
> dikosongkan. Resep di bawah tetap berlaku kalau nanti dibuat keluarga hub+item BARU.

Pola **hub + berkas per-item** (hemat token: baca 1 item, bukan semua). Selain langkah Resep 10
(penanda baris-1 + INDEX + `kit-files.json`), ADA langkah EKSTRA yang dulu mudah lupa — kini dijaga tes:
- **Tabel penunjuk di HUB-DOC induk WAJIB ikut** (mis. skill divisi → `rules/4.13-division-skills.md`;
  capability pack → `rules/cap-packs.md`).
- **JANGAN tulis angka keras jumlah item** ("15 pack") di prosa hub → rujuk tabel/INDEX (Resep 4).
- **Khusus SKILL DIVISI (§4.13):** nama divisi juga hidup di `CLAUDE_universal_v1.md` (blok "Dua Tingkat" +
  stub §4.13) dan blob governor `tests/skills-divisi.test.mjs`. Tambah divisi baru = perbarui SEMUA lokasi itu.
- ➡️ **Dikunci MESIN:** `tests/roster-sync.test.mjs` (8 nama divisi konsisten CLAUDE_universal+hub + 10 lensa +
  ambang MATURE) + `tests/skills-divisi.test.mjs` (isi checklist) + `node engine/rules-ref-check.mjs`.
  Lupa satu salinan = tes MERAH sebelum rilis.

### 12. Tambah / ubah / hapus ROBOT PENJAGA atau perkakas di `lib/`
> Resep ini lahir dari LP-012: tiga perkakas (`fact-gate`, `split-guard`, `portfolio-write`) dikirim ke
> **setiap client** tapi tak punya satu pun cara memanggilnya — kemampuan yang dibayar ruang, nol yang bisa
> memakainya. Penyebabnya sama tiap kali: fokus ke "robotnya jadi", lupa "orang sampai ke robotnya lewat mana".

- **GAGANG (wajib, minimal satu)** — pilih jalur pemanggilnya, jangan biarkan kosong:
  - perintah CLI → daftarkan di `bin/lintasai.js` (`COMMANDS_NODE` + baris bantuan). Butuh akar project
    user? masukkan ke `shouldPassProjectRoot` — **tapi cek dulu nama benderanya**: yang disuntik dispatcher
    adalah `--project-root`; robot yang memakai `--repo-root` (mis. `split-guard`) TIDAK boleh masuk daftar itu.
  - langkah gerbang → import + `results.push(...)` di `tests/preflight.mjs`
  - hook → perintahnya ditulis pemasang `engine/setup-hooks.mjs` / `lib/ensure-*-hook.mjs`
  - *(pustaka murni yang dipakai modul lain tak butuh gagang — ia bukan perkakas berdiri sendiri)*
- **KIRIM** — `engine/kit-files.json` kalau client memerlukannya. Robot yang dipanggil preflight **wajib**
  ikut terkirim, kalau tidak preflight di sisi client pecah saat meng-import berkas yang tak ada.
- **SEBUT DI ATURAN** — kalau tak disebut `CLAUDE_universal_v1.md`, AI tak akan pernah tahu ia ada; itu
  yang membuat `fact-gate` mati bertahun-tahun walau kodenya lengkap dan teruji.
- **TES** — `tests/<nama>.test.mjs`. Untuk penjaga, kunci **dua sisi**: ia benar-benar MERAH pada kasus
  rusak, DAN tidak beralarm-palsu pada kasus sah. Penjaga yang beralarm-palsu akan diabaikan orang —
  lebih buruk daripada tak punya penjaga.
- ➡️ **Dikunci MESIN:** `node engine/tool-reach-check.mjs` (ikut `preflight`) — perkakas terkirim tanpa gagang
  = **PENTING**, memblokir `--strict`. Menghapus perkakas: keluarkan dari `kit-files.json` **dan** cabut
  perintah/langkahnya, lalu jalankan robot ini supaya tak meninggalkan gagang menggantung.

---

## Alur singkat (tiap perubahan)
1. Cari jenis perubahan di resep → tahu berkas yang ikut bergerak.
2. Ubah semua berkas itu.
3. **`npm run preflight`** → gerbang 1-perintah: robot kecocokan + SELURUH tes Node + smoke Node +
   pemindai Unicode + cek kelengkapan rilis. Harus keluar kode `0`. (Saat mau rilis: `npm run preflight:strict`.)
4. Baru nyatakan "selesai" (Gerbang Verifikasi Pra-Rilis §4.6).
