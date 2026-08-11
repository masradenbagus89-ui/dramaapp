# preflight.md - Gerbang Pra-Rilis 1-perintah (`npm run preflight` / `npx lintasai preflight`)

> Versi 9 · 2026-07-10 · user-written (Tahap A skrip + Tahap D gerbang CI + Tahap E sebar ke klien; cetak-biru = rencana internal Buku Pelajaran + Preflight, riwayat git).
> v9 (Paket C v2.0.0 — bangunkan robot tidur): sambung **Kunci env** (`engine/env-keys-check.mjs`, `runEnvKeys` — banding NAMA kunci `.env.example` vs `.env.local`, cegah crash "jalan di lokal, mati saat online"; RAPIKAN non-blokir, tiap run) + **Mutu kode per-bahasa** (`engine/stack-check.mjs`, `runStackCheck` — tsc / `npm audit` CVE / ruff / bandit dll; **HANYA `--strict`**, eslint di-exclude anti-dobel, dibungkus RAPIKAN owner-gated, gagal-jaringan `npm audit` = INFO dilewati). Keduanya dikunci `tests/preflight-robot-baru.test.mjs` (DILARANG memblokir gerbang). Template CI klien (`templates/github/workflows/preflight.yml`) dapat langkah **build kondisional Next.js** supaya robot anggaran-halaman punya bahan ukur (dulu auto-lewat tanpa `.next/`).
> v4: tambah **lama-waktu per-pemeriksa + total** (transparansi — BUKAN paralelisasi tes berat, yang berisiko flaky) + **pesan error ramah non-programmer**.
> v5: tambah **opt-in gerbang CI di project KLIEN** (`npx lintasai enable-preflight-ci`) — backstop MESIN supaya robot mutu tak cuma jalan saat AI ingat (audit 2026-06-28, PENTING #2).
> v6: sambung **pemeriksa Keamanan config-AI** (`engine/ai-config-check.mjs`) ke gerbang — jalan otomatis, **NON-BLOCKING (SARAN owner-gated)** (Tingkat 2 migrasi PS→Node, 2026-07-08). Sekalian lengkapi tabel pemeriksa dengan 2 baris yang sudah ada di kode tapi belum terdaftar (**Anggaran ukuran halaman** + **Registry docs**).
> v7: sambung **pemeriksa Error-ditelan-diam** (`engine/swallowed-error-check.mjs`) ke gerbang — jalan otomatis, **MODE-PERINGATAN (RAPIKAN, TIDAK memblokir)**; deteksi blok `catch`/`except` KOSONG yang menelan error tanpa pesan (Willey borrow Item #1, 2026-07-08).
> v8: tambah penjaga **Naik versi skema artefak — Keranjang 1** (`checkSchemaRaiseBreaking`, mode kit): angka peta `engine/expected-schema.mjs` naik tanpa `[BREAKING]` = GENTING; label ada tapi Migration Steps / SIMULASI / entri `UPGRADING.md` (bagian "Riwayat pindah-versi") kurang = PENTING; angka turun / entri hilang = PENTING (Langkah 4+5 rencana internal STRATEGI_UPDATE_v2, riwayat git).

## Tujuan

Satu perintah yang menjalankan **semua pemeriksa mutu sekaligus** + menambah **cek kelengkapan rilis**, lalu memilah hasil jadi **GENTING / PENTING / RAPIKAN** dengan satu kode-keluar (exit-code). Ini "gerbang sebelum menyatakan selesai/rilis" (aturan `CLAUDE_universal_v1.md` §4.6 QA+QC).

Masalah yang dipecahkan: dulu pemeriksa dijalankan **manual satu-satu** → gampang "lupa cek sesuatu", dan **tidak ada** cek kelengkapan rilis (mis. versi naik tapi `CHANGELOG.md` belum punya entrinya). Sekarang: `npm run preflight`.

- **👨‍💻 Programmer:** orkestrator Node (`tests/preflight.mjs`) yang me-reuse robot yang sudah ada (`engine/consistency-check.mjs`, `engine/unicode-safety-check.mjs`, parser CHANGELOG `engine/version-detect.mjs`) + men-spawn tes Node, ESLint, smoke Node. Memilah temuan ke severity + exit-code. (v2.0.0: gerbang 100% Node — tak ada lagi Pester/PowerShell.)
- **🙂 Non-Programmer:** kayak **satu tombol "Cek Kesehatan" di BCA mobile** — sekali tekan, semua diperiksa (saldo + tagihan + keamanan) lalu kasih ringkasan, bukan kamu cek satu per satu. Di sini: sekali ketik `npm run preflight`, semua pemeriksa jalan + kasih lampu hijau/kuning/merah.

## Cara Pakai

**Di repo kit (maintainer):**

```bash
npm run preflight              # kerja harian: hanya GENTING (lampu merah) yang menghentikan
npm run preflight:strict       # saat MAU RILIS: PENTING (lampu kuning) ikut menghentikan
```

> 💡 Laporan menampilkan **lama-waktu tiap pemeriksa** + **total**, jadi kelihatan bagian mana yang lambat.
> Sejak kit 100% Node, gerbang ini murni Node (tak ada lagi tahap PowerShell/Pester yang lambat).

**Di project KLIEN (yang memasang lintasAI, Tahap E):**

```bash
npx lintasai preflight              # gerbang sebelum menyatakan "selesai"
npx lintasai preflight --strict     # gerbang lebih ketat saat mau rilis
```

`npx lintasai preflight` otomatis memeriksa **project klien** (dispatcher menyuntik `--project-root <cwd>`), bukan folder kit. Preflight mendeteksi "mode project" (`package.json` `name` ≠ `lintasai`) dan menyesuaikan diri (lihat "Mode project (klien)" di bawah). AI di sesi klien juga menjalankan gerbang ini otomatis tiap ada perubahan nyata (aturan §4.6) — klien tak perlu mengingatnya.

Bendera (flag):
- `--strict` — PENTING ikut jadi pemblokir (dipakai saat mau rilis). Default: hanya GENTING.
- `--repo-root <path>` — periksa folder lain (default: induk dari `tests/`).
- `--project-root <path>` — alias `--repo-root` (disuntik otomatis oleh dispatcher `npx lintasai preflight`). `--repo-root` menang kalau keduanya diberi.

## Input / Output

- **Input:** akar repo (otomatis). Membaca `package.json`, `CHANGELOG.md`, kode + dokumen repo, tag git.
- **Output:** laporan per-pemeriksa (+ **lama-waktu** tiap pemeriksa, mis. `(12.3 dtk)`) + ringkasan `GENTING N | PENTING N | RAPIKAN N` (+ **total waktu**) + baris HASIL.
- **Exit-code:** `0` = lulus (boleh dilanjut). `1` = ada pemblokir (GENTING; atau GENTING/PENTING saat `--strict`).

### Pemeriksa yang dijalankan

| Pemeriksa | Sumber | Kalau gagal |
|---|---|---|
| **Build aplikasi** | `npm run build` milik klien (`tests/preflight.mjs::runAppBuild`) | **GENTING** kalau build gagal; INFO kalau project tak punya script `build` / mode kit |
| Tes Node | `tests/run-node-tests.mjs` | GENTING |
| ESLint | `node_modules/eslint` (di-`npm ci`) | GENTING (PENTING kalau eslint belum terpasang) |
| Robot kecocokan versi | `engine/consistency-check.mjs` (MODE KIT, atau MODE PROJECT via `docs/consistency-map.jsonc`) | GENTING (drift versi/fakta) |
| Pemindai huruf-tipuan (Unicode) | `engine/unicode-safety-check.mjs` | GENTING (potensi serangan tersembunyi) |
| Anggaran ukuran halaman (Next.js) | `engine/perf-budget.mjs` (paling berguna setelah `npm run build`) | RAPIKAN kalau ada route lewat anggaran; INFO kalau belum build / bukan Next.js |
| Keamanan config-AI (`.mcp.json`/settings/skill) | `engine/ai-config-check.mjs` | **RAPIKAN — SARAN owner-gated, TIDAK memblokir** (severity asli GENTING/PENTING/RAPIKAN dicetak di detail); INFO kalau tak ada berkas config |
| Error-ditelan-diam (catch/except kosong) | `engine/swallowed-error-check.mjs` | **RAPIKAN — SARAN mode-peringatan, TIDAK memblokir** (mutu-kode reversible + robot baru tanpa eval laju-alarm-palsu); OK kalau bersih. Bisa dinaikkan ke PENTING setelah eval |
| Entri CHANGELOG utk versi package.json | `CHANGELOG.md` | GENTING kalau hilang |
| Isi entri CHANGELOG teratas | `CHANGELOG.md` | PENTING kalau masih teks-contoh kerangka |
| Versi vs tag terakhir | `git tag` + `package.json` | PENTING kalau breaking tanpa naik BESAR / downgrade; selain itu INFO |
| Naik versi skema artefak — Keranjang 1 (mode kit saja) | `engine/expected-schema.mjs` vs `git show <tag terakhir>` + `UPGRADING.md` | **GENTING** kalau angka peta naik TANPA `[BREAKING]` di entri CHANGELOG teratas; PENTING kalau label ada tapi nama artefak / "Migration Steps" / langkah SIMULASI / entri `UPGRADING.md` belum ditulis, atau angka TURUN / entri hilang dari peta; INFO kalau tag git tak ada (Resep 9 `RESEP_PERUBAHAN.md` + Dua Keranjang §4.5 WORKFLOWS) |
| Tes untuk perubahan kode | `git diff <tag>..HEAD` | RAPIKAN kalau kode berubah tanpa tes |

> Catatan: untuk pemeriksa yang menjalankan tes, kalau prosesnya **lulus (exit 0) tapi jumlah tes tak terbaca** (format output berubah) → dilaporkan PENTING (fail-closed), bukan diam-diam OK.

> **Kenapa "Keamanan config-AI" SENGAJA tidak memblokir (NON-BLOCKING, keputusan owner 2026-07-08):** robot `ai-config-check` bisa menandai temuan setingkat **GENTING** (mis. kunci-API bocor / hook unduh-lalu-jalankan), TAPI di gerbang ini ia **selalu tampil RAPIKAN** dan **tidak pernah menghentikan** rilis — bahkan saat `--strict`. Alasannya: **mutu/keamanan konfigurasi = keputusan OWNER**, bukan vonis mesin. Banyak pola yang ter-tandai itu **sengaja & sah** (server MCP jarak-jauh yang tepercaya, izin `Bash` lebar yang memang diperlukan), dan "rahasia" bisa berupa contoh/placeholder — memblokir rilis atas dasar itu = **"blokir keliru"** (alarm-palsu yang menghambat). Supaya tetap **jujur** (bukan menyembunyikan bahaya), severity ASLI (GENTING/PENTING/RAPIKAN) + `berkas:baris` tetap **dicetak di detail**; kalau ada GENTING, laporan menandainya dengan tegas ("owner WAJIB tinjau SEGERA"). Owner yang menilai & memutuskan (§1.1 + §4.6 owner-gated). Robot HANYA menyebut NAMA pola rahasia (mis. "kunci-API gaya OpenAI (sk-...)"), **tidak pernah nilai rahasianya** (§8.1 #6). Perilaku ini dikunci `tests/preflight.test.mjs`.

### Mode project (klien) — apa yang berbeda (Tahap E)

Saat dijalankan di project yang BUKAN repo kit (`package.json` `name` ≠ `lintasai`, atau tak ada `package.json`), preflight menyesuaikan diri supaya **tidak menampilkan alarm-palsu** untuk struktur yang memang khas-kit. Yang berbeda dari mode kit:

| Pemeriksa | Mode KIT | Mode PROJECT (klien) |
|---|---|---|
| **Build aplikasi** | INFO dilewati (kit = paket CLI, bukan aplikasi web) | `npm run build` klien → **GENTING kalau gagal**; INFO kalau tak ada script `build` |
| Tes | `tests/run-node-tests.mjs` (suite kit) → GENTING kalau gagal | `npm test` **milik klien** (kontrak universal: jest/vitest/mocha/node:test) → GENTING kalau gagal; **RAPIKAN** kalau klien belum punya script `test` / masih teks-contoh npm (tak memblokir) |
| ESLint | GENTING kalau ada error; PENTING kalau eslint belum di-`npm ci` | sama, tapi **RAPIKAN** kalau eslint tak terpasang (opsional di klien — tak memblokir rilis) |
| Robot kecocokan | MODE KIT (`$KitFacts`) | baca `docs/consistency-map.jsonc` klien; **RAPIKAN** (saran lembut) kalau belum ada — tak memblokir rilis |
| CHANGELOG / versi | wajib → GENTING kalau hilang/drift | ketiadaan versi/CHANGELOG = **INFO** (banyak app klien tak pakai CHANGELOG formal); kalau KEDUANYA ada tapi entri drift = **PENTING** (tetap memblokir saat `--strict`/rilis) |
| Pemindai Unicode | sama | sama (otomatis lewati `node_modules`/`.git`/`.claude-kit`) |

Inti: di klien, hal yang "belum ada" (CHANGELOG, peta-konsistensi, eslint, tes) jadi **catatan/saran**, bukan penghenti — supaya gerbang tetap berguna sejak menit pertama tanpa membuat staff non-programmer panik melihat "lampu merah". Yang benar-benar salah (**aplikasi gagal dibangun**, tes klien gagal, drift versi saat rilis, huruf-tipuan Unicode) **tetap** menghentikan.

> **Kenapa "Build aplikasi" SENGAJA memblokir (beda dari pemeriksa owner-gated di atas, 2026-07-19):** sampai tanggal ini gerbang punya 14 pemeriksa dan **tak satu pun mencoba mengompilasi aplikasi** — jadi `preflight` bisa mencetak "LULUS" di atas project yang gagal `next build`. Lubangnya diperlebar CI: langkah build di `templates/github/workflows/preflight.yml` dibungkus `continue-on-error: true` sambil menjanjikan *"robot mutu di langkah berikutnya yang melaporkan masalahnya"* — padahal langkah berikutnya tak punya pemeriksa build sama sekali. Berbeda dari temuan alat (CVE/lint/config-AI) yang severity-nya butuh penilaian owner, **"aplikasi tak bisa dibangun" itu fakta biner tanpa nuansa** — tak ada tafsir yang membuatnya boleh dirilis. Karena itu ia GENTING, bukan saran. Anti-alarm-palsu: project tanpa script `build` dilewati diam-diam (INFO). Urutannya sengaja **paling awal** supaya `perf-budget` akhirnya punya hasil build untuk ditimbang — dulu ia selalu auto-lewat karena tak ada yang pernah membangun. Dikunci `tests/preflight-app-build.test.mjs` (termasuk **uji negatif**: build gagal wajib GENTING).

## Di CI (gerbang otomatis, Tahap D)

Preflight kini jadi pemeriksa di GitHub Actions — bukan cuma perintah manual:

- **`.github/workflows/validate.yml` → job `preflight`** (tiap PR/push ke `main`). Menjalankan `npm run preflight`: membawa 3 cek yang **belum dijaga job CI lain** (robot kecocokan versi/fakta, pemindai huruf-tipuan Unicode, kelengkapan CHANGELOG). Mode non-strict: hanya **GENTING** yang memblokir.
- **`.github/workflows/publish-npm.yml` → langkah `preflight:strict`** (sebelum TERBIT ke npm). Menjalankan `npm run preflight:strict`: di titik ini cek kelengkapan rilis paling berharga, jadi **PENTING ikut memblokir** (mis. CHANGELOG masih teks-contoh / versi drift → terbit dibatalkan).
- **Dikunci tes anti-rot:** `tests/ci-preflight-wiring.test.mjs` membuat suite **merah** kalau job/langkah preflight diam-diam terhapus dari salah satu workflow atau dari `package.json scripts`.
- **Menjadikan "wajib" (required status check):** menambah job ke CI **belum** otomatis memblokir merge. Owner mencentangnya di **GitHub → Settings → Branches → aturan proteksi `main` → "Require status checks to pass" → pilih `preflight`** (lakukan setelah job terbukti hijau beberapa kali, supaya PR tidak terblokir mendadak).

### Opt-in: gerbang CI di project KLIEN (`enable-preflight-ci`)

Bagian "Di CI" di atas = CI **repo kit**. Untuk **project klien**, robot mutu default-nya **dipicu AI** (AI menjalankan `npx lintasai preflight` saat Gerbang §4.6). Itu bergantung AI ingat menjalankannya — kalau terlewat, cek mutu di sisi klien tak jalan (audit 2026-06-28, temuan PENTING #2). Untuk **backstop MESIN** di klien (opsional):

```bash
npx lintasai enable-preflight-ci      # pasang .github/workflows/preflight.yml (SIMULASI: tambah --dry-run)
```

- **Apa yang terjadi:** menyalin `templates/github/workflows/preflight.yml` ke `.github/workflows/` klien. Tiap **push/PR ke `main`**, GitHub menjalankan `npx lintasai preflight` → robot mutu (kecocokan versi, Unicode, tes klien, dll) jalan **otomatis**; gagal → PR ditandai merah.
- **Kenapa OPT-IN (bukan dipasang otomatis):** butuh GitHub Actions + alur PR. Memaksanya ke klien yang belum pakai GitHub = CI merah membingungkan. Owner yang putuskan (§1.1). Cermin pola `enable-risk-gate`.
- **WAJIB `windows-latest`:** CLI `lintasai` Windows-only (v1.x) — di Linux runner ia berhenti. Template sudah memakai `runs-on: windows-latest`.
- **Idempoten + aman:** sudah ada + isi sama → no-op; sudah ada tapi **kamu sunting sendiri** → TIDAK ditimpa tanpa `--force` (editanmu dijaga). **Matikan:** hapus berkas `.github/workflows/preflight.yml`.
- **Sumber + penjaga:** `engine/ensure-preflight-ci.mjs`; dikunci `tests/ensure-preflight-ci.test.mjs` + routing `tests/dispatcher-init-routing.test.mjs`.

## Dependensi

- **Node ≥ 18** (kit 100% Node — seluruh gerbang berjalan di Node).
- **git** — opsional. Tanpa git → cek "versi vs tag" + "kode vs tes" jadi INFO (dilewati, tak crash).
- Reuse: `engine/consistency-check.mjs`, `engine/unicode-safety-check.mjs`, `engine/version-detect.mjs`, `engine/fs-text.mjs`.

## Catatan

- **Severity (bahasa non-programmer, §2.1 #7):** GENTING = wajib perbaiki, menghentikan. PENTING = saran kuat (menghentikan saat `--strict`). RAPIKAN = enak dibereskan, tak pernah menghentikan. INFO = konteks.
- **Lama-waktu per-pemeriksa + total (#1, keputusan owner 2026-06-24):** laporan menampilkan durasi tiap bagian + total, supaya bagian lambat kelihatan. Diuji `tests/preflight.test.mjs` (fungsi `fmtDur`).
- **Pesan error ramah non-programmer (#2):** saat sebuah pemeriksa gagal *dijalankan* (bukan "tesnya gagal", tapi programnya tak bisa start), pesan pakai bahasa awam (mis. "perintahnya tak ditemukan - program seperti Node/git mungkin belum terpasang") + menyelipkan kode sistem aslinya dalam kurung (`ENOENT`) untuk diagnosa programmer. Diuji `tests/preflight.test.mjs` (fungsi `cmdErrMsg`).
- **Sudah dipasang di CI (Tahap D):** job `preflight` di `validate.yml` + gerbang `preflight:strict` di `publish-npm.yml` (lihat bagian "Di CI" di atas).
- **Sudah disambung ke dispatcher `lintasai` (Tahap E):** `npx lintasai preflight` (terdaftar di `bin/lintasai.js` `COMMANDS_NODE` + `shouldPassProjectRoot`). Klien dapat gerbang yang sama otomatis lewat pemasangan. Dikunci tes anti-rot di `tests/dispatcher-init-routing.test.mjs` (routing + suntik `--project-root` + `Mode: project`).
- **Disebar ke klien lewat pemasang (Tahap E):** `setup-pola-b.mjs` menyalin `templates/consistency-map.example.jsonc` (peta-konsistensi format Node) + `templates/BUKU_PELAJARAN.example.md` (contoh Lapis 3) ke `docs/` project klien.
- **Anti-rekursi:** `tests/preflight.mjs` bukan `*.test.mjs` → tak ikut dijalankan `npm test`. Saat di-import oleh tes pengunci, `main()` tidak jalan (dijaga `isMain`). Tes pengunci hanya menguji fungsi murni, tak memanggil `runPreflight()`.
- **Tes pengunci (anti-rot):** `tests/preflight.test.mjs` — memastikan pemilah severity + cek kelengkapan rilis benar-benar menangkap masalah (uji skenario GAGAL, bukan cuma jalur hijau) + wiring `package.json` tak diam-diam hilang.
- **Bukan jaminan nol-bug** (cetak-biru §9): menutup drift fakta + kelengkapan rilis + bug yang sudah ada tesnya. TIDAK menutup otomatis: bug logika baru, celah tak-terpikir, masalah integrasi runtime di mesin lain.
- Source: `tests/preflight.mjs`, tes `tests/preflight.test.mjs` (cetak-biru = rencana internal, riwayat git).
