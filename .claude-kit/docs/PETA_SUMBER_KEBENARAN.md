# PETA_SUMBER_KEBENARAN.md — Di mana tiap fakta "tinggal" + apakah benar 1-sumber

> Versi 1 · 2026-06-18 · Untuk maintainer + AI yang kerja DI repo kit lintasAI

## Untuk apa berkas ini

Pertanyaan yang dijawab: **"Fakta X (nomor versi, jumlah file, daftar repo, dll) sumber
aslinya di berkas mana? Dan kalau aku mengubahnya, cukup 1 tempat atau harus banyak?"**

Tujuannya: AI/maintainer **langsung tahu** lokasi sumber + cara amannya mengubah, **tanpa
menelusuri ulang seluruh repo** (cepat + hemat token), DAN tahu **mana yang rawan basi**.

🏢 Analogi (cara pikir "deklarasi 1 sumber" — `$variable` PHP / `const` React):
- **Pola ideal** = **1 sel Excel yang ditarik rumus ke 100 tempat** — ubah 1 sel, semua ikut. Mustahil basi.
- **Sebagian fakta di kit ini** = **angka yang sama ditulis di 6 dokumen Word terpisah**, lalu ada
  **robot yang teriak kalau ada 1 dokumen beda**. Aman-ish, tapi tetap 6 salinan fisik — bukan 1 sel.

Peta ini jujur menandai mana yang sudah "1 sel Excel" dan mana yang masih "6 dokumen Word + robot".

> Berkas saudara: [RESEP_PERUBAHAN.md](RESEP_PERUBAHAN.md) menjawab "berkas mana yang **ikut bergerak**
> per jenis perubahan" (checklist). Peta ini menjawab "fakta itu **sumbernya di mana** + jenis sumbernya".

---

## Legenda jenis sumber

| Tanda | Jenis | Arti | Saat mengubah |
|---|---|---|---|
| ✅ | **SUMBER-TUNGGAL SEJATI** | Dideklarasi 1x, lalu **dibaca/di-generate otomatis** oleh mesin (mis. `Import-PowerShellDataFile`, `@import`). | Ubah **1 tempat** → ikut semua. |
| ⚠️ | **DUPLIKAT + PENGECEK** | Fakta **disalin** ke banyak berkas; dijaga cocok oleh robot / `bump` / tes. | Ubah **banyak tempat**, TAPI ada jaring pengaman yang menolak rilis kalau ada yang basi. |
| 📝 | **PROSA-KONVENSI** | "1 tempat per topik" hanya karena **disepakati**; **tak ada mesin** yang membaca/menegakkan. | Ubah banyak tempat; **tidak ada jaring pengaman** → paling rawan basi. |

---

## Tabel A — Fakta INTERNAL kit

| Fakta | Sumber sebenarnya | Jenis | Dijaga oleh | Catatan jujur |
|---|---|---|---|---|
| **Nomor versi kit** (mis. 1.44.0) | `package.json` field `version` (= acuan) | ⚠️ | `kit.ps1 bump` (menulis 6 berkas) + robot `consistency-check.ps1` (`$KitVersionChecks`) + `tests/consistency-check.Tests.ps1` | Disalin ke 6 berkas: `package.json`, `CHANGELOG.md`, judul `CLAUDE_universal_v1.md`, `README.md`, `KEUNGGULAN_LINTASAI.md`, `templates/INDEX.md`. Komentar kode mengakui pernah drift ("README nyangkut 5 rilis"). |
| **Daftar berkas kit** (file apa saja yang ADA di dalam kit) | `lib/kit-files.psd1` | ✅ | Dibaca runtime via `Import-PowerShellDataFile` oleh `setup-pola-b.ps1`, `kit.ps1 doctor`, `uninstall.ps1` | Ini contoh 1-sumber sejati yang benar. **TAPI** 3 daftar berkas lain di bawah TIDAK diturunkan darinya. |
| **Daftar berkas yang DI-DEPLOY ke project client** ("file tim") | blok `$teamFiles` di `setup-pola-b.ps1` | ⚠️ | robot tes (penjaga UMUM) | **Terpisah** dari `kit-files.psd1` (masih 2 daftar), TAPI sejak penjaga umum di `tests/install-mapping-sync.Tests.ps1`, tiap template di `$teamFiles` WAJIB ada di disk + terdaftar di `kit-files.psd1` → kelupaan nama kini **ketahuan tes**. Hapus-total duplikasi (turunkan dari `kit-files.psd1`) = backlog. `docs/SIGNED_RELEASE.md` disalin di luar array. |
| **Jumlah file tim** (31; 8 di `.github`, 23 di `docs`) | dihitung otomatis dari `$teamFiles` | ⚠️ | robot `consistency-check.ps1` (`$KitFacts` / `$KitTeamFilesSource`) | Angka di `README.md` + `JALANKAN_KIT.md` ditulis tangan lalu dicek robot. Pernah drift 17→28→30→32 (asli 31). |
| **Daftar berkas yang terbit ke npm** | `package.json` `files[]` (pola glob) | ⚠️ | `tests/package-bundle.Tests.ps1` (npm pack --dry-run) | Terpisah dari `kit-files.psd1`; dijaga tes, bukan diturunkan. |
| **Daftar berkas aturan global `~/.claude`** | `$mapping` di `install-windows.ps1` (9 berkas, daftar tangan) | ⚠️ | `tests/install-mapping-sync.Tests.ps1` | Terpisah dari `kit-files.psd1`; dijaga tes anti-drift. |
| **Isi aturan AI** (teks tiap seksi) | `CLAUDE_universal_v1.md` (inti) + `LINTASAI_WORKFLOWS_v1.md` (detail on-demand) | ✅ | dimuat via `@import` di `CLAUDE.md` (repo) & `CLAUDE.md.template` (client) | Pemuatannya 1-sumber sejati: project client **tidak menyimpan salinan** aturan, ditarik otomatis tiap sesi. Tiap potongan punya 1 rumah (inti vs detail). Sebagian pointer sengaja **digemakan** (mis. §7.3a di §3+§4) — gema itu dikunci `tests/modify-workflow-rule.Tests.ps1`. |
| **Versi kit TERPASANG** (dibaca saat runtime) | `.install-manifest.json` field `metadata.kit_version` (di-generate live) | ✅ | dibuat `lib/manifest.ps1` (sha256 dihitung live) | Engine baca versi dari manifest/CHANGELOG, **bukan** dari `package.json`. |
| **Logika BACA versi** (parser CHANGELOG/manifest) | `lib/version-detect.ps1` | ✅ (sebagian) | — | Library ini "1 sumber" untuk CARA membaca versi. **TAPI** `kit.ps1` punya **salinan inline** parser (`Get-KitVersion`) yang tak memanggil library ini → ⚠️ untuk parser itu. |

---

## Tabel B — Artefak untuk PROJECT CLIENT (saat client baca/buat/kelola project)

| Fakta/artefak | Sumber | Jenis | Catatan jujur |
|---|---|---|---|
| **Identitas + struktur project** (terstruktur, mesin-baca) | `project.lintas.psd1` (akar project) | ✅ | **BARU**: deklarasi intent/modules→path/conventions; `stack` di-derive dari `package.json`; di-bootstrap saat pasang + dijaga robot `lib/project-manifest.ps1` (PathExists/DeriveMatch/PARSE-OK) di Gerbang §4.6. Inilah "kartu identitas mesin-baca" yang dulu tertulis BELUM ADA. Detail: [project-manifest.md](project-manifest.md). |
| **Narasi panjang project** (prosa untuk manusia) | `templates/architecture.md` (peta makro, user-edited) | 📝 | Peta makro prosa user-edited (dikirim `[TBD]`); kini **pelengkap** kartu mesin (kartu merujuknya lewat `refs.architecture`). |
| **Registry semua docs project** (TOC `.md`) | `templates/architecture_auto.md` | 📝 | Dilabeli "auto-maintained AI", tapi yang me-maintain = AI **mengetik manual** tiap tambah/hapus `.md` — bukan di-generate dari isi folder `docs/`. Rawan basi kalau AI lupa. |
| **Kamus istilah + penamaan** | `templates/glossary.md` | 📝 | Ngaku "sumber kebenaran tunggal", tapi penegakannya = disiplin AI/manusia (tak ada robot yang cek nama tabel/route di kode cocok dengan kamus). |
| **Versi stack framework** (Next/React/Prisma/dll) | `templates/STACK_VERSIONS.md` | 📝 | Ngaku "single source of truth", tapi 6+ berkas merujuknya lewat **kalimat** ("lihat STACK_VERSIONS.md"), bukan ditarik otomatis. |
| **Robot pengecek untuk client** | `templates/consistency-map.example.psd1` | ⚠️ (opt-in) | Memberi client pola **duplikat+pengecek** yang sama (1 `Source` acuan + daftar `Checks`). Default tidak aktif — client harus salin→`docs/consistency-map.psd1` + isi sendiri. |
| **Versi kit aktif di project** | field `<VERSI_KIT>` di `AGENTS.md` | ✅ saat install → lalu ⚠️ | Diisi otomatis saat install (di-derive dari CHANGELOG kit). **TAPI tidak ikut bergerak saat kit di-update** → setelah itu jadi salinan beku yang bisa basi. |

---

## Tabel C — MULTI-REPO (kelola banyak project)

| Fakta | Sumber | Jenis | Catatan jujur |
|---|---|---|---|
| **Daftar repo + tier akses + tim** ("Buku Induk") | `templates/lintasai-portfolio.example.yml` | 📝 | Berkas YAML terstruktur yang **mengaku "SATU SUMBER KEBENARAN"**, **TAPI NOL skrip yang membacanya** (tak ada parser YAML di `lib/`). Izin GitHub diset **manual**; `access_tier` malah **disalin lagi** ke `.split-state` tiap repo, dan satu-satunya robot yang baca tier (`secret-guard.yml`) membacanya dari `.split-state`/env **lokal tiap repo**, bukan dari Buku Induk pusat. Jadi Buku Induk = **catatan**, bukan sumber yang menggerakkan apa pun. |

---

## ⚠️ Berkas yang MENGAKU "sumber tunggal" padahal sebenarnya 📝 prosa-konvensi

Jangan tertipu label di judul berkas. Yang **benar-benar** dibaca mesin hanya `lib/kit-files.psd1`.
Berikut DULU menulis "sumber tunggal / single source of truth" padahal penegakannya manual —
**kini sudah dijujurkan** (label diubah jadi "rujukan/registry/catatan" + diberi caveat eksplisit):

- `templates/lintasai-portfolio.example.yml` — dulu "SATU SUMBER KEBENARAN"; kini "CATATAN PUSAT (registry)" + caveat "tak ada parser, penegakan izin GitHub manual".
- `templates/STACK_VERSIONS.md` — kini "tempat rujukan TUNGGAL (bukan ditarik otomatis oleh kode)".
- `templates/glossary.md` — kini "tempat rujukan tunggal (dijaga disiplin AI/manusia; belum ada robot pengecek)".
- `templates/_PATTERNS.md` — kini "rujukan tunggal (konvensi); ditegakkan disiplin, hooks/CI lint default mati".

> Pelajaran: **niat 1-sumber sudah benar di mana-mana; penegakannya yang baru sebagian.**
> Kalau menulis "sumber tunggal" di sebuah berkas, idealnya **bikin minimal 1 konsumen mesin
> yang benar-benar membacanya** — kalau tidak, itu cuma harapan, bukan jaminan.

---

## Aturan saat MENAMBAH fakta/angka baru (biar tak menambah duplikasi)

Sebelum menulis fakta/angka yang sama di >1 berkas, tanya berurut:

1. **Bisa cukup 1 tempat?** Kalau ya → tulis 1 tempat, sisanya rujuk (jangan salin). Paling ideal.
2. **Angka bisa dihitung dari kode?** (mis. "jumlah X") → jadikan **kode** sumbernya, lalu daftarkan
   ke robot (`$script:KitFacts` di `lib/consistency-check.ps1`) supaya angka di dokumen dicek cocok.
3. **Terpaksa disalin teks?** → daftarkan ke robot (`$script:KitVersionChecks` untuk versi, atau pola
   `$KitFacts` untuk angka) **supaya drift ketahuan**. Jangan biarkan salinan **tanpa pengecek**.
4. **Syarat fakta layak dijaga robot:** punya **1 sumber yang bisa dihitung** + pola tulisan **tidak
   ambigu** (jangan jaga frasa bermakna ganda → alarm palsu). Lihat catatan di `consistency-check.ps1`.

🏢 Analogi: setiap kali mau menulis angka yang sama di tempat kedua, ingat — kamu baru saja
membuat **peluang untuk lupa**. Entah hilangkan salinannya, atau pasang robot penjaganya.
