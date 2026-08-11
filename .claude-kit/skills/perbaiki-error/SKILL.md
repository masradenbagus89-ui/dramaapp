---
nama: perbaiki-error
deskripsi: Perbaiki error build/run bertahap — baca error ASLI, 1 akar per iterasi, verifikasi nyata (bukan "passed" palsu).
divisi: devops
pemicu: [error, crash, gagal-build, build-gagal, tidak-jalan, merah, rusak]
rawan_keamanan: false
menggantikan: [error/build]
---

# Skill: Perbaiki Error Build/Run

> **Kapan skill ini aktif:** prompt menyentuh "error / gagal build / merah / tidak jalan / crash / build gagal". Staff sering mentok di error panjang tak terbaca; skill ini merapikan cara membenahi.
>
> 🙂 **Analogi:** seperti **montir baca lampu check-engine** lalu benerin satu per satu + tes nyalakan mesin — bukan menebak lalu ganti semua sekaligus.

Skill ini **advisory** (§4.17): otak native yang menganalisa; skill membekali disiplin urutan + pagar "jangan ngaku beres sebelum terbukti".

---

## 1. Kontrak (yang HARUS benar)

- 🔒 **HASIL — "beres" = terbukti, bukan tebakan.** Error hilang **DAN** build/run **benar-benar lulus** baru boleh bilang "beres" (§4.6). "build passed" = **palsu** kalau perintahnya sendiri error (§8.2 A4). Aksi merusak (hapus/reset/overwrite) tetap **konfirmasi verbatim** (§8.2 Aturan 5) — jangan "benerin" dengan menghapus.

---

## 2. Cara (prinsip — 📐 CARA BAKU)

1. 📐 **Deteksi sistem build/run dari manifest** (`package.json`/`pyproject.toml`/`requirements.txt`/`composer.json`/`go.mod`/`Cargo.toml`/`pom.xml`/`build.gradle`) → pakai alat yang ADA (`npm`/`pnpm`/`yarn`, `pip`/`poetry`/`uv`, `composer`, `go`, `cargo`, `mvn`/`gradle`), **JANGAN hardcode**.
2. 📐 **Baca pesan error ASLI** (jangan tebak dari nama berkas) → cari akar: dependency / type / syntax / env var / versi library. Library eksternal → cek dokumen **versi terpasang** (§8.2 A3).
3. 📐 **Perbaiki BERTAHAP:** 1 akar → jalankan ulang → ulangi. JANGAN ubah banyak sekaligus (kalau merah lagi, tak tahu mana penyebabnya).
4. 🔒 **Verifikasi nyata:** jalankan ulang; error hilang DAN build/run lulus → baru "beres" (§1).
5. 📐 Lapor bahasa awam + **apa yang diubah**.

---

## 3. Powerful — robot pemeriksa (opsional, ~0 token AI)

- 💡 SARAN: **Cek mutu statis dulu** sebelum menerka: `npx lintasai stack-check run --repo-root .` (vet/lint/type/security; config-gated, cuma-periksa) sering **memunculkan akar error lebih cepat** daripada membaca log panjang (§4.14 "Robot pendamping"). Deterministik → hemat token.

---

## 4. Self-verify (sangkal diri sebelum "beres")

- [ ] Aku menjalankan perintah build/run-nya SENDIRI dan **melihat keluarannya** (bukan mengira dari nama berkas)?
- [ ] Perintahnya benar-benar **exit 0** (bukan "0 masalah" dari perintah yang error — §8.2 A4)?
- [ ] Aku mengubah **1 akar per iterasi** (kalau banyak sekaligus, mana yang menyembuhkan?)?
- [ ] Kalau perbaikannya menyentuh hapus/reset → sudah konfirmasi verbatim?

---

## 5. Definition-of-Done

- [ ] Error hilang + build/run **terbukti lulus** (keluaran dilihat, exit 0).
- [ ] Perubahan dilaporkan bahasa awam (apa yang diubah + kenapa).
- [ ] Tak ada aksi merusak yang jalan tanpa konfirmasi.
- [ ] Kalau error ini kelas-bug yang bisa kambuh → tawarkan penjaga (tes regresi / langkah preflight), rujuk `skills/cakupan-tes/SKILL.md` + Buku Pelajaran §6.4.

---

## 6. Handoff / rujuk-silang (reuse-first — jangan salin)

- 📐 Bikinkan tes yang kurang + tes regresi bernama (anti kambuh) → `skills/cakupan-tes/SKILL.md`.
- 📐 Panggilan API luar yang gagal transient (timeout/5xx) → `skills/tahan-gagal/SKILL.md`.
- 🗃️ LATAR — Rak asal skill ini hanya di riwayat git (ADR-027).

---

## 7. Batas jujur

- 🗃️ **LATAR:** skill ini disiplin **cara** membenahi (baca-asli, bertahap, verifikasi-nyata) — bukan katalog error per-stack. Akar yang butuh pengetahuan domain (race condition, korupsi data) tetap perlu analisa native. Yang dijamin: tak ada klaim "beres" tanpa bukti build lulus.
