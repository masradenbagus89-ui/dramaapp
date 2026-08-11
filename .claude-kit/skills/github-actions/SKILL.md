---
nama: github-actions
deskripsi: GitHub Actions/CI kelas industri — rahasia via secrets, izin token minimal, pin action ber-SHA, cache, gerbang mutu.
divisi: stack
pemicu: [github-actions, ci-workflow, actions-yaml]
rawan_keamanan: false
menggantikan: []
---

# Skill: GitHub Actions — CI/CD (Continuous Integration = pemeriksaan otomatis tiap kode masuk) kelas industri

> **Kapan skill ini aktif:** **utama = deteksi config** — project punya `.github/workflows/*.yml`, remote `github.com`, `.github/dependabot.yml` (§4.14 auto-detect). Teks staff yang menyebut "CI"/"pipeline"/"Actions" jadi pemicu sekunder. Skill ini paket-stack: tarik pas-ukuran saat menggarap alur kerja GitHub, DI ATAS standar inti (§5/§8/§11).
>
> 🙂 **Analogi:** GitHub Actions itu **satpam otomatis** yang memeriksa tiap kiriman kode sebelum masuk. Tapi satpam cuma berguna kalau benar-benar BISA bilang "tidak" — bukan yang cuma berdiri di pintu sambil selalu senyum (selalu hijau).

Skill ini **advisory** (§4.17): otak native yang memutuskan adopsi/adaptasi/abaikan tiap butir 📐/💡. Butir **🔒 HASIL** = hasil keandalan/keamanan yang tak boleh gagal apa pun caranya. Nama setelan/aksi resmi GitHub bisa berubah antar-waktu — cek dokumentasi resmi GitHub + versi aksi yang terpasang (§8.2 A3), jangan salin dari ingatan.

---

## 1. Kontrak (yang HARUS benar — 2 hal yang bikin "penjaga CI" ternyata cuma stempel kosong)

- 🔒 **HASIL — Alur cek WAJIB benar-benar MERAH saat kode rusak.** Alur yang selalu hijau bukan penjaga — ia cuma stempel. Ini penerapan langsung §6.3 "pastikan alat benar-benar jalan sebelum percaya vonisnya": vonis "0 masalah" dari perintah yang tak pernah bisa gagal = vonis palsu, dan tak ada yang bisa melihatnya dari luar.
- 🔒 **HASIL — Rahasia yang pernah ter-commit tetap ada di riwayat git**, walau berkasnya sudah dihapus di commit berikutnya — siapa pun yang punya salinan repo bisa menariknya kembali. Yang BENAR = **ROTASI**: cabut/ganti kuncinya di penerbitnya, bukan sekadar menghapus berkasnya. Menghapus berkas lalu merasa aman = kebocoran yang tetap hidup tanpa ada yang tahu. Langkah rincinya ikut `docs/SECURITY_INCIDENT_PLAYBOOK.md` (§8) — jangan bersih-bersih riwayat sendiri tanpa memandu owner.

---

## 2. Cara rakit (prinsip — 📐 CARA BAKU, boleh diganti cara lain yang capai HASIL sama)

1. 📐 **Pasang satu alur GitHub Actions** (= robot yang otomatis menjalankan perintah tiap kode masuk) yang menjalankan **lint + tes + build** pada tiap `push` dan tiap PR ke branch utama. Satu alur yang jalan otomatis lebih berharga daripada tiga alur yang cuma dijalankan manual.
   - 📐 **Buktikan sekali di awal:** rusakkan kode dengan sengaja di branch percobaan (mis. hapus satu titik-koma / bikin satu tes gagal), pastikan alurnya MERAH, baru percaya warnanya. Ulangi pembuktian ini tiap kali langkah cek diubah. Ini yang membuktikan kontrak §1 baris pertama benar-benar berlaku, bukan asumsi.
2. 📐 **Aktifkan perlindungan branch** pada branch utama: perubahan wajib lewat PR, wajib cek CI hijau (daftarkan cek wajibnya secara eksplisit — cek yang tak didaftarkan tak menahan apa pun), wajib minimal 1 review.
3. 📐 **Rahasia** (token, kunci API, kredensial deploy) disimpan di penyimpanan rahasia bawaan GitHub (Secrets, bisa per-repo/per-environment), **TIDAK** pernah di berkas alur, tidak di `.env` yang ter-commit. Nilainya disamarkan otomatis di log — tapi jangan andalkan itu: jangan sengaja mencetak rahasia (`echo`) walau "cuma buat debug".
   - 💡 SARAN: lebih baik lagi pakai autentikasi **jangka-pendek OIDC** (= alur meminta kredensial sementara ke penyedia cloud/registry saat jalan, berlaku beberapa menit lalu mati) daripada token berumur panjang yang disimpan selamanya di Secrets. Token abadi = satu kebocoran berlaku sampai ada yang sadar; kredensial sementara kedaluwarsa sendiri. Nama setelan/aksi resminya berubah antar-penyedia — cek dokumentasi resmi penyedia + versi aksi yang terpasang, jangan salin dari ingatan.
4. 📐 **Perkecil izin token bawaan alur:** setel **hanya-baca sebagai bawaan** untuk seluruh repo/alur, lalu naikkan izin tulis **hanya di job yang benar-benar butuh** (mis. job yang menerbitkan rilis). Alur yang bisa menulis ke repo = sasaran menarik: satu langkah jahat yang lolos bisa mendorong commit, mengubah alur, atau menempel rilis palsu.
5. 📐 **PR dari fork** (salinan repo milik orang luar) tidak boleh otomatis memegang rahasia repo maupun hak tulis. Pemicu alur yang berjalan dengan hak penuh atas kode PR luar = jalur pembajakan klasik: penyerang mengirim PR yang mengubah skrip alur, alurnya jalan dengan rahasia milikmu, rahasia dikirim keluar. Pola aman: alur pada PR luar cuma-baca tanpa rahasia; pekerjaan yang butuh rahasia dipisah ke alur yang jalan **setelah** ada manusia menyetujui. Cek nama pemicu + setelan "butuh persetujuan untuk kontributor luar" di dokumentasi GitHub terbaru sebelum menyalin pola apa pun.
6. 📐 **Pin aksi pihak ketiga ke versi tetap** — sebaiknya ke **commit SHA** (sidik jari commit yang tak bisa diubah), bukan ke tag bergerak seperti `@v4` atau `@main`. Tag bergerak bisa diarahkan ulang oleh pemilik aksi (atau penyerang yang mengambil alih akunnya) ke isi yang berbeda, dan alurmu ikut berubah diam-diam tanpa satu baris pun berubah di repomu. Ini risiko rantai pasok (= kamu ikut memercayai kode orang lain yang kamu tak kontrol).
7. 💡 SARAN: nyalakan Dependabot / peringatan CVE (= laporan resmi celah keamanan pada pustaka yang kamu pakai) supaya pembaruan keamanan muncul sendiri sebagai PR (pilihan alat + cakupan pemindaian dependensi → `skills/deploy/SKILL.md`, jangan disalin ke sini). Yang jadi porsi berkas ini: **jangan auto-merge tanpa tes** — PR pembaruan tetap harus lewat alur cek yang sama, dan pembaruan versi BESAR ditinjau manusia; "update keamanan" yang merusak produksi tetap kerusakan.
8. 📐 **Rilis pakai tag + catatan perubahan** (changelog) yang menyebut apa yang berubah dan dampaknya untuk pemakai, bukan daftar commit mentah. Penomoran versi ikut aturan semver kit `BESAR.MENENGAH.KECIL` beserta label `[BREAKING]`/`[SECURITY]` — mandatnya di §11 aturan inti, jangan disalin ulang ke berkas alur.
9. 💡 SARAN: pakai **cache CI** (menyimpan hasil unduhan dependensi antar-jalan) supaya alurnya cepat; kunci cache diturunkan dari berkas kunci-versi (lockfile) sehingga berubah otomatis saat dependensi berubah.
   - 📐 **Yang TIDAK boleh masuk cache:** rahasia dalam bentuk apa pun, dan artefak hasil build yang nantinya dipercaya sebagai keluaran rilis. Cache bukan tempat tepercaya: isinya ditulis oleh alur yang sudah pernah jalan, dan aturan **cakupan** (cache milik branch mana boleh dipakai branch mana) ditentukan platform serta bisa berubah antar-versi — jangan menebak, baca dokumentasi GitHub yang berlaku sekarang sebelum mengandalkan pemisahannya sebagai pengaman. Sikap amannya: perlakukan cache sebagai percepatan yang boleh salah, dan untuk artefak rilis bangun ulang dari nol.

---

## 3. Powerful — pola "hijau palsu" yang wajib dikenali sebelum percaya warnanya

🧪 **CONTOH KASUS (ambil polanya, jangan asumsikan daftar ini lengkap):** pola "hijau palsu" yang sering lolos —
- langkah tes ditutup `|| true` atau `continue-on-error: true`;
- perintah tes tak menemukan satu pun berkas tes lalu tetap keluar sebagai sukses (perilaku ini BEDA-BEDA per alat tes — buktikan di alat yang kamu pakai, jangan berasumsi);
- error yang tenggelam di tengah rangkaian pipa (`a | b`) karena yang dilaporkan cuma hasil perintah terakhir;
- skrip banyak-baris yang perilaku berhenti-saat-gagalnya bergantung pada shell + sistem operasi mesin CI — tidak seragam, jadi buktikan dengan sengaja menggagalkan baris PERTAMA dan lihat apakah alurnya merah;
- job yang `if`-nya tak pernah terpenuhi sehingga selalu "skipped" tapi terbaca hijau di daftar PR.

Cara membongkarnya sama seperti kontrak §1: rusakkan kode dengan sengaja (§2 langkah 1) lalu lihat apakah warnanya benar-benar berubah jadi merah — bukan cuma percaya karena "biasanya begitu".

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai" — §8.2 Aturan 3)

- [ ] Alur CI sudah **dibuktikan MERAH** dengan sengaja merusak kode (bukan cuma diasumsikan hijau)?
- [ ] Tak ada pola "hijau palsu" (`|| true`, `continue-on-error: true`, error tenggelam di pipa `a | b`, tes yang keluar sukses walau 0 berkas ditemukan, job `if` yang tak pernah terpenuhi tapi terbaca hijau)?
- [ ] Branch utama diproteksi: PR wajib, cek CI wajib **didaftarkan eksplisit**, minimal 1 review wajib?
- [ ] Rahasia disimpan di GitHub Secrets (bukan berkas alur/`.env` ter-commit), tak pernah di-`echo` ke log walau untuk debug?
- [ ] Rahasia yang **pernah** ter-commit sudah **DIROTASI** (bukan cuma dihapus dari berkas)?
- [ ] Izin token alur **default read-only**; izin tulis cuma dinaikkan di job yang benar-benar butuh?
- [ ] PR dari **fork** TIDAK otomatis memegang rahasia repo maupun hak tulis; job yang butuh rahasia dipisah ke setelah ada manusia menyetujui?
- [ ] Aksi pihak ketiga di-**pin ke commit SHA** (bukan tag bergerak `@v4`/`@main`)?
- [ ] Dependabot/pembaruan otomatis tetap lewat alur cek yang sama, **tak auto-merge tanpa tes**; pembaruan versi BESAR ditinjau manusia?
- [ ] Rilis pakai **tag + changelog** yang menyebut dampak pemakai, ikut semver `BESAR.MENENGAH.KECIL` + label `[BREAKING]`/`[SECURITY]`?
- [ ] Cache **tak berisi rahasia** maupun artefak rilis yang dipercaya begitu saja; artefak rilis dibangun ulang dari nol?

> **Verifikasi WAJIB cuma-baca** (§8.2 Aturan 3): membuktikan = baca setelan alur/Secrets/branch-protection + menalar, JANGAN jalankan aksi yang mengubah rahasia/rilis produksi saat memverifikasi.

---

## 5. Definition-of-Done (kapan skill GitHub Actions dianggap benar-selesai)

- [ ] **Kontrak (§1) terpenuhi:** alur cek terbukti MERAH saat kode rusak (bukan asumsi) + rahasia yang pernah ter-commit sudah dirotasi (kalau pernah terjadi).
- [ ] **Edge case** ditangani: PR dari fork mencoba memakai rahasia, aksi pihak ketiga berubah isi diam-diam lewat tag bergerak, token bocor ke log, cache tercemar rahasia/artefak tak tepercaya, PR pembaruan dependensi otomatis di-merge tanpa lolos tes.
- [ ] **Self-verify (§4) tercentang** dengan bukti konkret (nama berkas alur, setelan branch-protection yang dicek).
- [ ] Branch protection aktif + cek wajib terdaftar eksplisit + minimal 1 review.
- [ ] **Gerbang Pra-Rilis §4.6 LULUS** — "selesai" = terbukti (alur benar-benar dijalankan dan dilihat merah/hijaunya), bukan "sudah kutulis file YAML-nya".

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Pilihan alat + cakupan pemindaian dependensi/CVE** (Dependabot dan sejenisnya) — **jangan dirancang ulang di sini** → `skills/deploy/SKILL.md`.
- 📐 **Penomoran versi rilis** (semver `BESAR.MENENGAH.KECIL` + label `[BREAKING]`/`[SECURITY]`) → mandatnya di **§11 aturan inti kit**, jangan disalin ulang ke berkas alur.
- 📐 **Rahasia yang terlanjur ter-commit/bocor** → langkah respons lengkap di `docs/SECURITY_INCIDENT_PLAYBOOK.md` (§8) — jangan bersih-bersih riwayat sendiri tanpa memandu owner.
- 🗃️ **LATAR — rak asal skill ini:** `skills/github-actions/SKILL.md`.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** kerahasiaan token/kredensial + integritas alur rilis/deploy. **Mode-gagal khas:** alur cek yang selalu hijau (stempel palsu, bukan penjaga), rahasia bocor lewat log atau riwayat commit lama, PR dari fork membajak rahasia lewat alur yang otomatis jalan dengan hak penuh, tag aksi pihak ketiga diarahkan ulang diam-diam (risiko rantai pasok), cache tercemar rahasia atau artefak tak tepercaya. **Mitigasi:** buktikan alur benar-benar merah sebelum dipercaya, Secrets bawaan + OIDC jangka-pendek, rotasi rahasia yang pernah bocor (bukan sekadar dihapus), token default read-only + izin tulis terbatas, PR fork tanpa rahasia otomatis, pin aksi ke commit SHA, cache tanpa rahasia/artefak rilis.
- 🗃️ **LATAR — Batas jujur:** pemilik repo / akun dengan hak admin umumnya **masih bisa menerobos** perlindungan branch (langsung dorong ke branch utama atau menggabungkan tanpa review, tergantung setelan). Jadi perlindungan branch = **pagar proses** (mencegah kecelakaan & kelalaian), BUKAN pagar keamanan mutlak terhadap orang yang memang berniat menerobos. Pertahanan nyata terhadap siapa-boleh-apa = daftar akses repo + CODEOWNERS. Skill ini menaikkan **lantai** kualitas CI/CD; tidak menggantikan kontrol akses repo yang benar maupun API/nama setelan resmi GitHub yang berubah antar-waktu — cek dokumentasi resmi versi berlaku (§8.2 A3).

🙂 **Non-Programmer:** GitHub Actions itu satpam yang otomatis memeriksa tiap kiriman kode sebelum masuk. Tiga hal yang paling sering salah: satpamnya ternyata tak pernah bisa bilang "tidak" (selalu hijau) — jadi cobalah rusakkan kode sekali untuk membuktikan dia benar-benar menahan; kunci gudang dititipkan di tempat yang salah — dan kunci yang pernah tertulis di catatan lama harus DIGANTI, bukan cuma catatannya dirobek; dan alat pinjaman dari luar dipakai tanpa dikunci versinya, jadi isinya bisa ditukar diam-diam. Perlindungan branch mirip aturan kantor "harus ada tanda tangan kedua" — sangat berguna mencegah kecerobohan, tapi bosnya sendiri biasanya masih bisa melewatinya.
