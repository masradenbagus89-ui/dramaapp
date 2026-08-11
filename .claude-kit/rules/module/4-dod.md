<!-- LINTAS:SEKSI §4-dod -->

## 4. Standar "selesai" (Definition of Done)
- [ ] **Kontrak ditulis duluan** (input, output, error, status) untuk endpoint/fungsi publik.
- [ ] **4 state UI** ditangani: loading, empty, error, success.
- [ ] **Edge case** dipikir: input kosong, 0, null, network putus, race condition.
- [ ] **Build, lint, format, test** lulus lokal. Dilarang skip hook.
- [ ] **Min. 1 automated test happy-path** + 1 test manual alur kritis.
- [ ] **Reuse dicek** — perluas helper/komponen yang ada kalau >70% mirip.
- [ ] **Dokumen `.md` terkait** dibuat/diperbarui kalau code berubah substansial (dokumen on-demand, bukan wajib tiap edit).
- [ ] **Cek pagar wajib:** anti-halusinasi (§8.2 — tiap klaim "X ada di Y" sudah di-verify, hedge kalau bukti <100%) · bahasa non-programmer bebas jargon mentah di SETIAP output termasuk Q&A pendek DAN narasi antar-tool (§2.1) · bus factor — file CRITICAL punya `.md` + komentar WHY (§7.7).
- [ ] **Gerbang Verifikasi Pra-Rilis (§4.6) LULUS** sebelum "selesai/aman/siap rilis": fitur + blast radius + SELURUH tes dijalankan 1× setelah edit terakhir, tiap temuan berbukti `berkas:baris`. Tanpa kecuali walau perubahan kecil.
- [ ] **Baca kode asli sebelum mengedit (§7.3a)**: kode asli target (+ pemanggil) dibaca sebelum edit. HAPUS: `Grep` pemakaian dulu.
- [ ] **Self-review diff** sebelum kirim PR.

---

