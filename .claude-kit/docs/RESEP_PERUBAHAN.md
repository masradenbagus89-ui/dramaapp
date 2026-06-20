# RESEP_PERUBAHAN.md — Berkas mana yang ikut bergerak per jenis perubahan

> Versi 1 · 2026-06-16 · Untuk maintainer + AI yang kerja DI repo kit lintasAI

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

## 🤖 Robot pemeriksa kecocokan (jalankan SEBELUM bilang "selesai")

Satu perintah, hitungan detik, biaya token ~nol (ini skrip, bukan AI baca-baca berkas):

```powershell
pwsh lib/consistency-check.ps1
```

- ✅ Keluar kode `0` + "BERSIH" = semua deklarasi versi-saat-ini cocok dengan `package.json`.
- ❌ Keluar kode > 0 + daftar "[TAK COCOK]/[HILANG]" = **ada yang basi, sebut berkasnya** → perbaiki.

Robot ini juga jalan otomatis dalam suite tes (`tests/consistency-check.Tests.ps1`), jadi
ketidakcocokan versi **menggagalkan tes** sebelum rilis. Sumber: [lib/consistency-check.ps1](../lib/consistency-check.ps1).

> Robot saat ini menjaga **NOMOR VERSI**. Untuk menambah berkas/fakta baru yang dijaga,
> tambah satu baris di `$script:KitVersionChecks` dalam [lib/consistency-check.ps1](../lib/consistency-check.ps1).
> Penanda **sejarah** (mis. "fitur ini lahir di v1.30.0", berkas laporan audit bertanggal)
> SENGAJA menyimpan versi lama → JANGAN dimasukkan ke daftar robot.

---

## Resep per jenis perubahan

### 1. Naikkan versi / rilis
**Cara cepat (1 perintah):** `.\kit.ps1 bump X.Y.Z` (mis. `.\kit.ps1 bump 1.42.0`) — otomatis mengecap nomor versi ke 6 berkas di bawah + menambah kerangka entri CHANGELOG (tanggal otomatis) + menjalankan robot pemeriksa. Kamu tinggal **menulis deskripsi CHANGELOG** (ganti placeholder).
Berkas yang membawa **versi-saat-ini** (referensi / fallback manual — semua diset ke versi baru):
- `package.json` — `"version"` (= **sumber kebenaran**, ubah ini dulu)
- `CHANGELOG.md` — tambah entri baru `## [X.Y.Z] - <tanggal>` di **paling atas**
- `CLAUDE_universal_v1.md` — judul `> Versi X.Y.Z · ...` (kalau aturan ikut berubah)
- `README.md` — baris "Versi stabil sekarang: **vX.Y.Z**"
- `KEUNGGULAN_LINTASAI.md` — baris "Terakhir diselaraskan: **vX.Y.Z · ...**"
- `templates/INDEX.md` — judul "Daftar Lengkap Dokumen lintasAI vX.Y.Z"
- ➡️ **Jalankan robot** untuk verifikasi semua cocok.
- Penomoran: ikut semver (§11 CLAUDE_universal) — perbaikan kecil = angka KECIL, fitur = MENENGAH,
  breaking = BESAR. Label `[SECURITY]` untuk perbaikan keamanan mendesak.

### 2. Tambah / ubah ATURAN di `CLAUDE_universal_v1.md` (auto-baca tiap sesi staff)
- `CLAUDE_universal_v1.md` — tulis aturan + naikkan versi judul
- `LINTASAI_WORKFLOWS_v1.md` — kalau aturan punya detail rujukan on-demand (hemat token always-load)
- `KEUNGGULAN_LINTASAI.md` — kalau aturan baru = keunggulan (AUTO-SYNC §7.8)
- `CHANGELOG.md` + naikkan versi (lihat Resep 1)
- `tests/` — tambah/sesuaikan tes yang **mengunci** aturan (mis. `setup-pola-b.Tests.ps1` punya
  tes "section N punya ...")
- ⚠️ Ingat: efek aturan baru baru terasa di project staff **setelah mereka update kit + buka chat baru**.

### 3. Tambah / ubah FITUR kode (`*.ps1`, `lib/`)
- berkas `.ps1` / `lib/` yang diubah
- `docs/<basename>.md` pendamping — AUTO-SYNC (§7.1) kalau perubahan substansial
- `tests/<...>.Tests.ps1` — minimal 1 tes happy-path (§4 DoD)
- `CHANGELOG.md` + naikkan versi
- `KEUNGGULAN_LINTASAI.md` — kalau jadi keunggulan
- **Berkas BARU?** Cek `package.json` `files[]` — kalau pola folder belum mencakupnya, tambahkan,
  supaya ikut terbit ke npm. Dijaga `tests/package-bundle.Tests.ps1`.

### 4. Ubah ANGKA/JUMLAH yang tersebar (mis. jumlah tes, jumlah lensa, jumlah kriteria)
- `Grep` angka itu di seluruh repo → update **semua** kemunculan, ATAU hapus angka yang tak perlu
  dibakukan (lebih sedikit salinan = lebih sedikit peluang basi).
- Pertimbangkan menambah cek angka ini ke robot (`$script:KitVersionChecks` pola serupa) kalau sering basi.

### 5. Hapus fitur / berkas
- `Grep` pemakaian NYATA berkas/fungsi yang dihapus (pemanggil) — jangan andalkan dokumen saja (§7.3a)
- Hapus berkas + entri di `package.json` `files[]` (kalau eksplisit terdaftar)
- `docs/<basename>.md` pendamping — hapus/perbarui
- `CHANGELOG.md` + naikkan versi (breaking? → angka BESAR + `BREAKING CHANGE:`)

---

## Alur singkat (tiap perubahan)
1. Cari jenis perubahan di resep → tahu berkas yang ikut bergerak.
2. Ubah semua berkas itu.
3. `pwsh lib/consistency-check.ps1` → pastikan BERSIH.
4. Jalankan suite tes (`./tests/Run-Tests.ps1`) → SELURUH tes lulus.
5. Baru nyatakan "selesai" (Gerbang Verifikasi Pra-Rilis §4.6).
