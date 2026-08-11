# Contributing - Panduan Usul Perubahan Aturan Tim

Kit ini standar tim IT. Anggota tim **dianjurkan** usul perubahan kalau ketemu masalah, ide bagus, atau aturan yang sudah tidak relevan. File ini menjelaskan cara usul yang efisien.

> File ini fokus pada **cara anggota tim berkontribusi**.
>
> **Alur git harian (branch → PR → review → gabung):** repo ini punya `.github/CODEOWNERS` (approver wajib) + template PR — semua perubahan lewat branch + PR, **tidak** push langsung ke `main`. Kunci `main` diatur di GitHub: Settings → Branches.

---

## 🗺️ Peta-baca untuk DEVELOPER BARU (yang mengembangkan kit ini)

Baru bergabung mengembangkan lintasAI? Baca **berurutan** ini dulu supaya paham konteks sebelum menyentuh kode — biar tak cuma 1 orang yang paham (bus-factor sehat):

1. [`README.md`](README.md) — apa itu lintasAI + cara pasang/pakai.
2. [`docs/architecture.md`](docs/architecture.md) — **peta makro** kit (struktur folder, modul inti, entry point). Cari dokumen `.md` relevan pakai `Grep` + peta ini.
3. [`docs/decisions/`](docs/decisions/) (ADR-001..006) — **KENAPA** keputusan arsitektur besar diambil + alternatif yang ditolak. Ini sumber konteks utama "kenapa begini, bukan begitu". Untuk konteks tim & 16 kondisi tetap kit ini (siapa tim, stack, "otak asli" AI), baca juga (ADR-018).
4. [`docs/plans/`](docs/plans/) — rencana/cetak-biru fitur yang masih relevan (rencana yang sudah tuntas dihapus; riwayatnya ada di git).
5. [`CLAUDE_universal_v1.md`](CLAUDE_universal_v1.md) — **aturan kerja AI + developer** (otak kit; auto-baca tiap sesi Claude Code di repo ini).
6. [`.claude-kit/CHANGELOG.md`](.claude-kit/CHANGELOG.md) / `CHANGELOG.md` — riwayat rilis.

**Alur kontribusi kode (wajib):** branch → ubah → `npm run preflight` (gerbang pra-rilis, harus HIJAU) → PR → approve `CODEOWNERS` → merge. **Jangan push langsung ke `main`.** Konteks sesi-AI yang lebih dalam tersimpan sebagai dokumen di repo (ADR/plans/STATUS), **bukan** di memory pribadi tiap mesin (memory lokal tidak ikut repo).

---

## Siapa boleh usul?
**Semua anggota tim.** Junior atau senior, sama saja - ide bagus bisa datang dari mana saja. Owner standar (1 orang) yang approve final.

## Apa yang bisa diusulkan?
- Tambah aturan baru (mis. "wajib ada test untuk fungsi utility yang dipakai >2 tempat").
- Ubah aturan existing (mis. "ganti format commit dari custom ke Conventional Commits").
- Hapus aturan yang sudah tidak relevan.
- Tambah/ubah/hapus prompt atau template.
- Perbaiki typo / klarifikasi instruksi yang ambigu.
- Tambah skenario pakai baru (mis. "skenario 5: migrasi proyek multi-repo").
- Tambah ide opsional (tier "should"/"nice") ke seksi 15 di CLAUDE.md.

## Apa yang TIDAK perlu diusulkan (langsung kirim aja)
- Typo fix di file kit (kirim langsung ke channel `#it-standard`).
- Pertanyaan klarifikasi soal cara pakai (tanya di channel, jawaban bisa jadi FAQ baru).
- Bug report (kirim langsung - bug != usulan perubahan aturan).

---

## Format usulan (template)

Buat issue/PR baru di repo standar dengan format berikut. Bahasa Indonesia, ramah.

```markdown
# Usulan: <judul singkat dalam 1 baris>

> Pengusul: <nama / handle> · Tanggal: <YYYY-MM-DD> · Target versi: <v1.x / v2>

## Aturan yang diusulkan
<1-3 kalimat. Apa aturan barunya? Atau aturan lama yang mana yang diubah?>

Contoh konkret aturan baru:
> "Semua handler API yang melakukan write database WAJIB pakai transaction."

## Alasan
<1-2 paragraf. Kenapa aturan ini perlu? Masalah apa yang sudah pernah ketemu di proyek? Manfaat apa yang didapat tim?>

## Dampak
- **Proyek yang terdampak:** semua / sebagian (sebutkan) / spesifik
- **Effort migrasi per-proyek:** ringan (<30 menit) / sedang (1-2 hari) / besar (sprint terpisah)
- **Breaking change?** Ya / Tidak. Kalau ya, tingkat: 🚨 GENTING (harus sekarang) / ⚠️ PENTING / 💡 RAPIKAN.
- **File kit yang berubah:** CLAUDE.md / PROMPT mana / template mana

## Alternatif yang dipertimbangkan
<2-3 alternatif yang ditolak + alasan kenapa pilihan utamamu lebih baik>

## Contoh penerapan
```code
<snippet kode yang menunjukkan aturan diterapkan>
```

## Pertanyaan terbuka (opsional)
<hal-hal yang kamu sendiri masih ragu, supaya diskusi tim membantu memutuskan>
```

---

## Alur review

1. **Anggota** buka issue/PR pakai template di atas.
2. **Tim** diskusi di issue/PR (atau channel `#it-standard`). Junior boleh nimbrung - debat ide, bukan orang.
3. **Owner** standar review di akhir bulan (cadence default).
4. Keputusan owner: **Approve** (masuk versi berikutnya), **Reject** (catat alasan, simpan untuk arsip), atau **Minta revisi** (balik ke pengusul).
5. Kalau approve: owner update file kit, bump versi (patch/minor/major sesuai), rilis ke tim.

## Cadence rilis
- **Patch (`v1.x.y`):** untuk perbaikan fungsi kecil yang **user lihat** (bug fix, perbaikan perilaku). BUKAN untuk typo/heading/wording.
- **Minor (`v1.x`):** akhir bulan kalau ada usulan baru yang terkumpul.
- **Major (`vX`):** dijadwalkan eksplisit, announce minimal 1 minggu sebelumnya. Breaking change.

### Aturan disiplin rilis (cegah CHANGELOG membengkak)
- **Jangan tag rilis baru hanya untuk typo / ganti heading / rapikan kalimat.** Kumpulkan perubahan editorial seperti itu, baru ikutkan saat ada rilis fungsi berikutnya. (Akar masalah CHANGELOG 100KB+ adalah tiap editan kecil jadi rilis tersendiri.)
- **CHANGELOG = "apa yang berubah untuk user", bukan jurnal refleksi.** Catatan post-mortem internal ("Mistake #1/#2", "root cause") taruh di commit message / git history, bukan di CHANGELOG yang dibaca staf.
- **Saat bump versi, pakai 1 perintah: `node kit.mjs bump <versi>`** (mis. `node kit.mjs bump 1.42.0`). Ini otomatis mengecap nomor versi baru ke SEMUA berkas yang membawanya + menambah kerangka entri CHANGELOG + menjalankan robot pemeriksa kecocokan. Kamu tinggal **menulis deskripsi entri CHANGELOG** (ganti placeholder). Menghapus kelas-bug "lupa ganti satu berkas".

  5 berkas yang dicap otomatis (referensi / fallback manual): `package.json` (sumber kebenaran), `CHANGELOG.md` (entri baru di atas), `README.md` ("Versi stabil sekarang"), `CLAUDE_universal_v1.md` (header "> Versi ..."), `templates/INDEX.md` (judul). Robot `engine/consistency-check.mjs` menjaga kelimanya sinkron + memverifikasi cocok dengan git tag. (Kejadian nyata 2x: README pernah beda versi dari git; 2026-06-12 README nyangkut di v1.7.8 selama 5 rilis — `bump` mencegah ini.)

### Runbook terbit ke npm (TERVERIFIKASI 2026-06-12 — jangan menebak, ikuti ini)

Resep lengkap dari naikkan versi sampai paket tayang di npm. Tiap langkah sudah terbukti jalan:

1. **Naikkan versi: `node kit.mjs bump X.Y.Z`** (cap otomatis 5 berkas + kerangka CHANGELOG, lihat di atas) → tulis deskripsi CHANGELOG → jalankan `npm run preflight` — wajib semua lulus.
2. **Commit → push branch → gabung ke `main` → push** (pola fast-forward biasa).
3. **Buat penanda versi (git tag) di commit yang versinya cocok**, lalu kirim:
   ```powershell
   git tag -a vX.Y.Z -m "lintasAI vX.Y.Z - <ringkasan>"
   git push origin vX.Y.Z
   ```
4. **Robot penerbit jalan otomatis** (`.github/workflows/publish-npm.yml`): dia memverifikasi tag == `package.json` (beda = robot menolak, ini pengaman), lalu menerbitkan pakai kunci `NPM_TOKEN` yang tersimpan di brankas GitHub (Settings → Secrets → Actions). **Tidak butuh login/OTP siapa pun.**
5. **Verifikasi (±1-2 menit) — WAJIB tunggu HIJAU sebelum mengumumkan ke staff**: buka tab **Actions** GitHub, pastikan workflow *Publish to NPM* SELESAI HIJAU, lalu `npm view lintasai version` → harus menunjukkan versi baru.

> ⚠️ **Kenapa wajib tunggu hijau:** sejak v2.8.0 **update DAN pasang-baru sama-sama membaca dari npm**, jadi keduanya baru melihat versi baru SETELAH robot penerbit selesai. Kalau robot **gagal** (mis. OIDC/izin bermasalah) tapi tag terlanjur dikirim, staff **tak dapat apa-apa** — mereka tetap di versi lama, dan `doctor` tak akan menyebut ada versi baru. Itu lebih aman daripada dulu (saat update membaca dari git tag → staff yang *update* dapat versi baru sementara yang *pasang-baru* dapat versi lama = tim beda-versi), tapi tetap: kalau robot **merah**, perbaiki + jalankan ulang (*Run workflow* / `workflow_dispatch`) **SEBELUM** mengumumkan rilis ke staff — kalau tidak, pengumumanmu menunjuk versi yang tak bisa mereka ambil.

**LARANGAN & jebakan yang sudah terbukti:**
- ❌ **JANGAN `npm publish` dari komputer.** npm menolak dengan error E403 — kebijakan npm mewajibkan pengaman 2-lapis ATAU kunci khusus untuk menerbitkan; `npm login` biasa TIDAK cukup, siapa pun akunnya. Jalur resmi repo ini = robot (langkah 3-4).
- ❌ **Versi npm yang sudah terbit tidak bisa ditarik kembali** — kalau ada kesalahan, terbitkan versi perbaikan berikutnya (naik angka KECIL).
- ⚠️ **Jangan urutkan tag secara abjad** untuk cari versi terbaru — secara abjad `v1.5.9` > `v1.12.0` (salah!). Pakai entri teratas `CHANGELOG.md` sebagai sumber versi terbaru.
- ⚠️ **Kalau robot gagal** (cek tab Actions di GitHub): penyebab paling umum = `NPM_TOKEN` kedaluwarsa. Owner buat token baru di npmjs.com (Access Tokens → Granular Access Token → hak tulis paket ini + izin bypass pengaman 2-lapis) → simpan ke GitHub Settings → Secrets → Actions → `NPM_TOKEN`. **Token JANGAN pernah ditulis di chat/file** — langsung dari npmjs.com ke brankas GitHub.
- ℹ️ Riwayat: tag `v1.6.0`–`v1.11.1` memang bolong (tidak pernah dibuat). Mulai `v1.12.0`, tiap rilis WAJIB ber-tag (robot bergantung padanya).

---

## Yang dihindari saat berkontribusi

- **Modif kit di lokal diam-diam** - anggota tim lain gak tahu, standar tim pecah. Selalu usul resmi.
- **Modif aturan untuk 1 proyek doang** - pakai mekanisme **exception** (catat di `exceptions.md` repo standar + sunset date), bukan ubah kit global.
- **Usul tanpa alasan konkret** - "rasanya lebih bagus" gak cukup. Sertakan masalah nyata yang pernah ketemu.
- **Argumen pakai authority** ("X di [perusahaan besar] pakai begini") - kasih konteks kenapa relevan untuk tim **kita**.
- **Debat di DM owner satu-satu** - diskusi di channel/issue supaya semua anggota bisa belajar dari pertimbangan.

---

## Code of Conduct singkat

- **Junior boleh usul, senior wajib dengar.** Ide bagus dari junior sering nemu blind spot senior.
- **Kritik ide, bukan orang.** "Aturan ini bermasalah karena X" ≠ "kamu salah".
- **Asumsi positif.** Pengusul tidak bermaksud nge-troll; kalau usulnya aneh, tanya konteksnya dulu sebelum reject.
- **Bahasa Indonesia, casual ramah.** Sesuai gaya kit ini.

---

## Pertanyaan?
Buka di channel `#it-standard` atau DM owner standar.
