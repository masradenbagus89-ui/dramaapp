<!-- LINTAS:SEKSI §6-token-economy -->

## 6. Hemat token & kecepatan sesi AI
- **Peta proyek wajib** di `docs/architecture.md`: struktur folder, modul inti, entry point. Baca peta dulu sebelum jelajah repo.
- **Cek dulu sebelum bikin baru** (§5 reuse). Hindari baca seluruh repo tanpa target.
- **Glossary domain** di `docs/glossary.md`. Nama variable/tabel/route konsisten dengan glossary.
- **Config per-environment** dipisah kecil (dev/staging/prod).
- **Pola-baca rujukan on-demand (folder `rules/`):** detail aturan hidup di berkas KECIL satu-seksi-satu-berkas — rujukan berupa path (mis. `rules/4.13-division-skills.md`; di client: `.claude-kit/rules/...`) → langsung `Read` berkas itu UTUH. Berkas tak ketemu / cuma pegang nomor §X → `Read rules/INDEX.md` (daftar isi ~16 KB / ~4rb token — ukur nyata via `.length`, bukan sekadar "~2 KB") → `Read` berkas target; total maks 2 panggilan. DILARANG menebak pola judul; berkas tak ketemu ≠ boleh jawab dari ingatan (lapor jujur, §8.2). Rujukan besar LAIN — prompt root >±20 KB (`JALANKAN_KIT.md`, `SPLIT_REPO_MIGRATION_PROMPT_v1.md`, `PROJECT_LIFECYCLE_PROMPT_v1.md`, `AUDIT_POST_SETUP_PROMPT_v1.md`) dkk.: `Grep` kata-kunci / anchor seksi → `Read` bagian relevan saja; utuh hanya saat menyunting berkas itu / compaction §4.18. **Pengecualian sempit:** `JALANKAN_KIT.md` Bagian 1-2 KHUSUS saat dijalankan sebagai Fase Aktivasi (§4.3b) boleh dibaca mendekati utuh — alur bercabang/stateful (bukan referensi statis), biaya sekali-per-instalasi; di luar Fase Aktivasi (mis. cuma cari 1 info di file itu), kebijakan Grep-dulu di atas tetap berlaku. 🏢 ambil 1 buku tipis dari rak berlabel, bukan membongkar gudang.

### 6.1 Memory hygiene (CRITICAL — anti-stale-recall)
Memory persisten = pisau bermata dua. Aturan tiap recall:
1. **Memory = snapshot, BUKAN ground truth sekarang.** Sebelum rekomendasi dari memory yang sebut path/function/flag/version → verify dulu: path → Read/Glob; function → Grep; version/env → config/`npm list`. Tidak verify = tidak rekomendasi.
2. **Stale memory = update atau hapus** (jangan biarkan stale ke-recall = halusinasi compounding).
3. **Memory ringkasan repo = TIME-BOXED.** "current state"/"recent change" → prefer `git log`/`ls`/`Read`. Memory bagus untuk WHY, bukan WHAT sekarang.
4. **Konflik memory vs realita** → percaya realita, update memory.
5. **Auto-confirm JANGAN auto-confirm destructive** walau memory bilang "user always YES" (§8.1 #3 + §8.2 Aturan 5).

🏢 Memory AI = catatan kalender lama. Sebelum berangkat, cek WhatsApp kalau klien reschedule.

### 6.2 Memory persist — simpan proaktif pasca-approval
Begitu user setuju (jawaban "ya"/`AskUserQuestion`/arahan eksplisit), AI segera simpan di sesi yang sama:
1. Arahan universal → file aturan/memory; keputusan spesifik proyek → file `.md` proyek + memory.
2. Update index `MEMORY.md` kalau ada file baru/berubah.
3. Lapor daftar file tersimpan.
**Tawar-dulu-baru-simpan:** AI mengoreksi / user mengulang hal sama ≥2× → AI **tawarkan** catat lewat popup (§14.1); "ya" = simpan + lapor. DILARANG auto-simpan tanpa konfirmasi + DILARANG skor-keyakinan ber-angka / belajar-otomatis diam-diam ("self-evolve" DITOLAK). Auto-TAWARKAN, manual-SIMPAN.

### 6.3 Doktrin Kecepatan & Efisiensi — berlaku TIAP task
**7 prinsip efisiensi (§4.6)** berlaku bukan cuma di gerbang, tapi SETIAP task (jangan diulang di sini — sumber tunggal di §4.6).
**Usaha pas-ukuran:** task kecil/jelas → kerjakan langsung & ringan (baca target + tetangga langsung). Pengerahan besar HANYA saat sinyal jelas (user minta "menyeluruh"/"lintasAI skill", mau rilis, perubahan luas).
**4 disiplin operasional** (rincian + contoh = `rules/4.6-6.3-efficiency-doctrine.md`): gelombang kecil saat fan-out besar · uji bagian PALING BERISIKO dulu sendirian · prediksi hasil SEBELUM mengedit (edit SEKALI) · **pastikan alat BENAR-BENAR jalan sebelum percaya vonisnya** ("0 masalah" dari perintah yang ERROR = palsu).
**Cek konsistensi/drift/duplikasi = ROBOT, BUKAN kerahkan AI** — urutan wajibnya di §4.6 "Robot pemeriksa kecocokan DULU"; daftarkan fakta berulang di `docs/consistency-map.jsonc`.
**Panggilan alat yang TIDAK saling bergantung dikirim BARENG dalam 1 giliran** (beberapa `Read`/`Grep` sekaligus), bukan antre satu-per-satu — waktu tunggu jadi selama yang paling lama saja, bukan jumlahnya. Berlaku juga saat memverifikasi: kumpulkan bukti sekaligus. Yang WAJIB berurutan cuma yang hasilnya dipakai langkah berikutnya. Ini BUKAN izin fan-out agen (itu tetap default NOL, §4.19).
**Kualitas = lantai, kecepatan = cara.** Keamanan (§8.x), anti-halusinasi (§8.2), bahasa non-programmer (§2.1), cakupan Gerbang §4.6 — TIDAK pernah dipangkas demi cepat (§0). Yang dihemat = cara kerja, bukan standar.

### 6.4 Buku Pelajaran (Lesson Ledger) — tiap bug yang lolos jadi penjaga permanen
> §6.2 untuk PREFERENSI; §6.4 untuk BUG → penjaga permanen.

**Inti:** tiap bug yang lolos (ketahuan terlambat) / kelas-bug tanpa penjaga → dicatat + diubah jadi penjaga permanen (tes regresi / robot / langkah `preflight` / aturan). Yang "mengingat" = MESIN, bukan ingatan/naluri.
**Alur (auto-TAWARKAN, manual-SETUJUI):** 1. AI USULKAN entri + penjaga konkret (sebut path) via popup §14.1. 2. OWNER setujui. 3. AI PASANG penjaga → jalankan Gerbang §4.6 → tandai TERPASANG.
**DILARANG keras:** 🚨 AI mengubah aturan/perilakunya sendiri tanpa persetujuan owner · 🚨 skor-keyakinan ber-angka/"naluri" menyetir keputusan · 🚨 apa pun yang bikin staff tak bisa lihat "AI lagi belajar apa".
**Ledger kit:** `docs/BUKU_PELAJARAN.md`; dijaga `tests/buku-pelajaran.test.mjs` (tiap entri TERPASANG WAJIB menunjuk berkas penjaga nyata).

### 6.5 Rekam Pelajaran Frontier — kit belajar dari tiap client (aman, human-gated)
Selesai tugas teknis substantif → timbang: ada teknik/standar IT profesional yang **belum dijaga kit** (frontier)? Ada → **catat ke berkas LOKAL ter-redaksi** `docs/pelajaran-lintasai/` (bukan bisnis/kode; tingkat GENTING/PENTING/RAPIKAN, bukan skor angka). **Default nyala-lokal; kirim ke owner OPT-IN** (DILARANG auto-kirim §8.1#6). Client mencatat, **OWNER menimbang jadi standar** (bukan AI ubah dirinya = bukan auto-evolve §6.4). Opt-out: client bilang "matikan rekam pelajaran"/centang `AGENTS.md`. Nol temuan itu sah (§8.2). Sekali per tugas, bukan tiap pesan. Detail = `rules/6.5-frontier-lessons.md` + spesifikasi `templates/feedback/rekam-pelajaran.md`.

---

