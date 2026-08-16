---
nama: debug-metodis
deskripsi: Diagnosa bug SULIT (build hijau tapi hasil salah, kadang-kadang muncul, lambat) secara bermetode — bangun cara-reproduksi DULU, uji hipotesis satu per satu, tutup dengan tes regresi. Bukan tebak-tebakan.
divisi: devops
pemicu: [bug, kadang-error, kadang-jalan-kadang-tidak, sudah-diperbaiki-masih-gagal, error-aneh, intermittent, flaky, lambat, hasil-salah]
rawan_keamanan: false
menggantikan: []
---

# Skill: Debug Metodis — bug sulit & regresi performa (kelas senior)

> **Inti:** senior tidak menebak. Kunci membereskan bug sulit = punya **satu cara menjalankan yang bisa MERAH saat bug muncul & HIJAU saat beres** (feedback-loop). Punya itu → bug 90% ketemu; tak punya → melototin kode berjam-jam sia-sia.

Metode di bawah (harness, hipotesis) = **kerja internal AI, jangan dinarasikan ke client**; client cukup dapat kabar progres singkat + laporan perbaikan bahasa awam. Cek dokumen library **versi terpasang** sebelum menduga API.

---

## 1. Kontrak (yang HARUS benar)

- 🔒 **HASIL — reproduksi DULU sebelum berteori.** DILARANG mengubah kode untuk "memperbaiki" sebelum ada **satu perintah** (tes/skrip/curl) yang **sudah dijalankan** + terbukti **MERAH saat bug ini muncul**. Menebak lalu tembak kode = akar skill ini dilanggar. Tak bisa bikin reproduksi → **berhenti + minta bantuan** (akses lingkungan / rekaman error), jangan lanjut menebak.
- 🔒 **HASIL — "beres" = reproduksi asli kini HIJAU + ada tes regresi** (bukan "kelihatannya sudah jalan"). Aksi merusak saat menyelidiki (hapus/reset/ubah data live) tetap **konfirmasi verbatim** → `skills/jaring-data/SKILL.md`.

---

## 2. Cara (📐 CARA BAKU — 6 fase; boleh lompat fase kalau jelas beralasan)

1. 📐 **Bangun feedback-loop (INI intinya).** Bikin 1 perintah yang MERAH tepat saat bug muncul: tes di titik bug · curl ke server dev · skrip CLI yang men-diff output · rekam-ulang request nyata · harness minimal. **Pertajam + percepat** loop (deterministik: kunci waktu/seed acak; cepat: detik bukan menit). Bug **kadang-kadang**: jangan kejar repro bersih — naikkan **laju kambuh** (ulang 100×, paralel, tambah beban) sampai cukup sering untuk dikejar.
2. 📐 **Reproduksi + perkecil.** Jalankan loop → lihat merah (pastikan bug yang SAMA seperti keluhan client, bukan yang mirip). Lalu **kecilkan** skenario: buang input/langkah satu-satu sampai tiap sisa benar-benar diperlukan (mempersempit tersangka + jadi bibit tes regresi).
3. 📐 **Buat 3-5 hipotesis berperingkat, tiap satu FALSIFIABLE** sebelum menguji apa pun ("kalau X penyebabnya, mengubah Y akan menghilangkan bug"). Tak bisa sebut prediksinya = itu firasat → buang/pertajam. (Kalau perlu, tanya client 1× hal yang cuma dia tahu — "baru mengubah apa?" — via popup, jangan interogasi.)
4. 📐 **Uji hipotesis: ubah SATU variabel per percobaan.** Pakai debugger/REPL kalau bisa (1 breakpoint > 10 log). Log darurat **beri tag unik** (mis. `[DEBUG-a4f2]`) → bersih 1× grep di akhir. **Perf: JANGAN log — UKUR dulu** (baseline timing/profiler/query-plan) lalu **bisect**; ukur dulu, perbaiki belakangan.
5. 📐 **Perbaiki + tes regresi.** Ubah repro-minimal jadi tes yang MERAH → terapkan perbaikan → tes HIJAU → jalankan lagi loop asli (skenario penuh). Taruh tes di titik yang benar → `skills/cakupan-tes/SKILL.md` (jangan salin caranya). Tak ada titik pas untuk tes = itu sendiri temuan (arsitektur menghalangi) — catat.
6. 📐 **Bersih + post-mortem.** Hapus semua log ber-tag (grep). Sebut **hipotesis yang benar** di pesan commit (biar sesi berikut belajar). Tanya: "apa yang bisa MENCEGAH bug ini kambuh?" — kalau jawabannya perubahan struktur, catat.

🙂 **Non-Programmer:** bug yang "kadang muncul kadang tidak" itu paling bikin frustrasi. Cara kerja AI di sini: bikin dulu cara memunculkan bug-nya sesuka hati (biar bisa dicoba berulang), baru cari sebabnya satu-satu — bukan menebak lalu ganti-ganti kode sampai "kebetulan" hilang (yang sering balik lagi).

---

## 3. Powerful — feedback-loop = 90% penyelesaian

- 💡 Urutan cara bikin loop (coba dari atas): tes gagal → curl/skrip HTTP → CLI diff snapshot → browser headless → rekam-ulang trace → harness minimal → property/fuzz (bug "kadang salah") → bisect (bug muncul antara 2 versi) → differential (input sama, 2 versi/config, diff output).
- 💡 Loop 2-detik-deterministik = kekuatan super; loop 30-detik-flaky nyaris tak berguna — investasikan waktu mempertajamnya.

---

## 4. Self-verify (sangkal diri SEBELUM "beres")

Jawab dengan bukti (tak bisa jawab → belum selesai):
- [ ] Ada **satu perintah** yang sudah kujalankan + terbukti MERAH saat bug muncul (tempel perintah + keluarannya)?
- [ ] Reproduksi = bug yang SAMA seperti keluhan client (bukan yang cuma mirip)?
- [ ] Aku bikin 3-5 hipotesis falsifiable SEBELUM menguji (bukan langsung tembak yang pertama terlintas)?
- [ ] Tiap percobaan ubah **1 variabel**? Perf: aku UKUR baseline (bukan asal log)?
- [ ] Reproduksi asli kini HIJAU + ada **tes regresi** di titik bug?
- [ ] Semua log ber-tag `[DEBUG-...]` sudah dihapus (grep bersih)?

> Verifikasi WAJIB cuma-baca: reproduksi & uji hipotesis JANGAN mengubah data live. Butuh sentuh data live → minta owner jalankan di staging + backup dulu (`skills/jaring-data/SKILL.md`).

---

## 5. Definition-of-Done

- [ ] Feedback-loop dibangun + reproduksi diperkecil (tiap sisa load-bearing).
- [ ] Akar ditemukan lewat hipotesis falsifiable (bukan tebakan).
- [ ] Reproduksi asli HIJAU + tes regresi bernama di titik bug (`skills/cakupan-tes/SKILL.md`).
- [ ] Log ber-tag dibersihkan; hipotesis benar dicatat di commit.
- [ ] Laporan bahasa awam ke client (apa penyebabnya + apa yang diubah).

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Error build/run yang lugas** (merah, gagal-build, crash) → `skills/perbaiki-error/SKILL.md`. Skill itu naik ke SINI saat "1-akar-per-iterasi" buntu / ternyata bug intermittent.
- 📐 **Menulis tes + tes regresi** (repro = tes yang belum hijau) → `skills/cakupan-tes/SKILL.md`.
- 📐 **API luar gagal transient** (timeout/5xx) → `skills/tahan-gagal/SKILL.md`. **Bug menyentuh data/skema live** → `skills/jaring-data/SKILL.md` (backup dulu sebelum utak-atik).
- 🗃️ **LATAR — kredit:** disiplin 6-fase (feedback-loop-first, hipotesis falsifiable, log ber-tag, perf=ukur+bisect, post-mortem) diserap dari `diagnosing-bugs` (mattpocock/skills, MIT) — ditulis-ulang Bahasa Indonesia + framing non-programmer.

---

## 7. Batas jujur

- 🗃️ **LATAR:** skill ini disiplin **cara** membedah bug sulit — bukan katalog bug per-stack. Yang dijamin: tak ada klaim "beres" tanpa reproduksi yang terbukti berubah merah→hijau + tes regresi. Akar yang butuh pengetahuan domain dalam (race condition rumit, korupsi data) tetap perlu analisa native — tapi tetap lewat feedback-loop, bukan tebakan.
