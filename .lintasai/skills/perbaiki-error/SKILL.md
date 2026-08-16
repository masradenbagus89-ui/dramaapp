---
nama: perbaiki-error
deskripsi: Perbaiki error build/run bertahap — baca error ASLI, 1 akar per iterasi, verifikasi nyata (bukan "passed" palsu).
divisi: devops
pemicu: [error, crash, gagal-build, build-gagal, tidak-jalan, merah, rusak]
rawan_keamanan: false
menggantikan: [error/build]
---

# Skill: Perbaiki Error Build/Run

> **Skill-PROSES (sengaja ramping):** isinya disiplin CARA membenahi (baca error asli → 1 akar per
> iterasi → verifikasi nyata), bukan katalog error per-stack — jadi wajar jauh lebih tipis daripada
> rak materi. Error-nya SULIT (build hijau tapi hasil salah · kadang-kadang muncul · lambat) →
> langsung naik ke `skills/debug-metodis/SKILL.md` (repro-harness dulu), jangan berputar di sini.

---

## 1. Kontrak (yang HARUS benar)

- 🔒 **HASIL — "beres" = terbukti, bukan tebakan.** Error hilang **DAN** build/run **benar-benar lulus** baru boleh bilang "beres". "build passed" = **palsu** kalau perintahnya sendiri error. Aksi merusak (hapus/reset/overwrite) tetap **konfirmasi verbatim** — jangan "benerin" dengan menghapus.

---

## 2. Cara (prinsip — 📐 CARA BAKU)

1. 📐 **Deteksi sistem build/run dari manifest** (`package.json`/`pyproject.toml`/`requirements.txt`/`composer.json`/`go.mod`/`Cargo.toml`/`pom.xml`/`build.gradle`) → pakai alat yang ADA (`npm`/`pnpm`/`yarn`, `pip`/`poetry`/`uv`, `composer`, `go`, `cargo`, `mvn`/`gradle`), **JANGAN hardcode**.
2. 📐 **Baca pesan error ASLI** (jangan tebak dari nama berkas) → cari akar: dependency / type / syntax / env var / versi library. Library eksternal → cek dokumen **versi terpasang**.
3. 📐 **Perbaiki BERTAHAP:** 1 akar → jalankan ulang → ulangi. JANGAN ubah banyak sekaligus (kalau merah lagi, tak tahu mana penyebabnya).
4. 🔒 **Verifikasi nyata:** jalankan ulang; error hilang DAN build/run lulus → baru "beres" (§1).
5. 📐 Lapor bahasa awam + **apa yang diubah**.

---

## 3. Powerful — robot pemeriksa (opsional, ~0 token AI)

- 💡 SARAN: **Cek mutu statis dulu** sebelum menerka: pemeriksa statis project sesuai stack (mis. `npm run lint`, `tsc --noEmit`, `go vet`, `npm audit` — cuma-periksa) sering **memunculkan akar error lebih cepat** daripada membaca log panjang. Deterministik → hemat token.

---

## 4. Self-verify (sangkal diri sebelum "beres")

- [ ] Aku menjalankan perintah build/run-nya SENDIRI dan **melihat keluarannya** (bukan mengira dari nama berkas)?
- [ ] Perintahnya benar-benar **exit 0** (bukan "0 masalah" dari perintah yang error)?
- [ ] Aku mengubah **1 akar per iterasi** (kalau banyak sekaligus, mana yang menyembuhkan?)?
- [ ] Kalau perbaikannya menyentuh hapus/reset → sudah konfirmasi verbatim?

---

## 5. Definition-of-Done

- [ ] Error hilang + build/run **terbukti lulus** (keluaran dilihat, exit 0).
- [ ] Perubahan dilaporkan bahasa awam (apa yang diubah + kenapa).
- [ ] Tak ada aksi merusak yang jalan tanpa konfirmasi.
- [ ] Kalau error ini kelas-bug yang bisa kambuh → tawarkan penjaga (tes regresi / langkah preflight), rujuk `skills/cakupan-tes/SKILL.md` + catat ke `docs/lintasai/INDEX.md` (format: `templates/BUKU_PELAJARAN.example.md`) — berkas itu yang dibaca AI sesi berikutnya (kernel §4.1), jadi pelajarannya tak hilang saat chat ditutup.

---

## 6. Handoff / rujuk-silang (reuse-first — jangan salin)

- 📐 Bikinkan tes yang kurang + tes regresi bernama (anti kambuh) → `skills/cakupan-tes/SKILL.md`.
- 📐 Panggilan API luar yang gagal transient (timeout/5xx) → `skills/tahan-gagal/SKILL.md`.
- 📐 **Bug SULIT** (build HIJAU tapi hasil salah · kadang-kadang muncul · lambat) — kalau "1 akar per iterasi" buntu / errornya intermittent → naik ke `skills/debug-metodis/SKILL.md` (bangun repro-harness dulu + hipotesis, bukan tebak-tembak).
- 🗃️ LATAR — Rak asal skill ini hanya di riwayat git (ADR-027).

---

## 7. Batas jujur

- 🗃️ **LATAR:** skill ini disiplin **cara** membenahi (baca-asli, bertahap, verifikasi-nyata) — bukan katalog error per-stack. Akar yang butuh pengetahuan domain (race condition, korupsi data) tetap perlu analisa native. Yang dijamin: tak ada klaim "beres" tanpa bukti build lulus.
