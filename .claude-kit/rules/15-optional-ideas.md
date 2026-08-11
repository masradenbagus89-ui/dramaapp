<!-- LINTAS:SEKSI §15 -->

### §15 Ide opsional (opt-in per proyek) — daftar detail

> Dipindah dari `CLAUDE_universal_v1.md` §15 (2 mode berpagar Auto-Confirm & Co-Pilot tetap di sana karena menyangkut keamanan). Aktifkan per proyek di `AGENTS.md` bagian "Opt-in".

- **UTM/tracking** konsisten di semua link kampanye keluar (email, iklan, sosmed).
- **Slow query log & connection pool monitor** dengan ambang alert sebelum prod down.
- **ERD ringkas** di `docs/db.md` + rationale denormalisasi.
- **Localization (i18n) penuh** sejak hari pertama jika multi-bahasa direncanakan.
- **Semantic-release / changelog otomatis** dari Conventional Commits.
- **Dependency auto-audit mingguan** (Dependabot / `npm audit` terjadwal).
- **Visual regression test** untuk halaman/komponen kritikal.
- **Performance budget ketat** (Lighthouse CI dengan threshold per metrik).
- **Feature flag** untuk rilis bertahap fitur besar.
- **Pre-commit secret scanner** (mis. gitleaks) sebagai hook tambahan.

#### Mode Hemat (Lean Mode) — detail perilaku

> Dirujuk dari `CLAUDE_universal_v1.md` §15. Tujuan: task **rutin/sepele** dikerjakan **cepat + irit token** tanpa turun mutu — memformalkan "usaha pas-ukuran" §6.3 jadi saklar per proyek (jawaban langsung ke inti, tanpa seremonial output).

**Cara nyalakan:** centang `[x] Mode Hemat` di `AGENTS.md` "Opt-in", ATAU ketik "mode hemat"/"mode irit" (berlaku sesi itu). Matikan: hapus centang / "mode hemat off".

**Saat AKTIF — yang DILONGGARKAN (Tingkat-2 saja):**
1. **Output 1 lapis.** Jawaban rutin cukup 1 penjelasan awam ringkas; skip blok 2-versi 👨‍🎓+🙂. Tetap 2-versi kalau user minta / menjelaskan konsep baru.
2. **Tinjauan Divisi hanya saat perlu.** Blok §4.1 muncul HANYA kalau ada temuan nyata / keputusan besar / titik risiko. Nol temuan → tak ditampilkan (sah, §8.2). Kedalaman pemeriksaan tetap pas-ukuran menurut penalaran AI native (§4.17).
3. **Narasi padat.** Antar-langkah ringkas, tanpa basa-basi / pengulangan.

**Saat AKTIF — yang TAK PERNAH berubah (Tingkat-1, §0 #1-#3):**
- 🔒 Keamanan & anti-bocor rahasia (§8, §8.1).
- 🧪 Anti-halusinasi: no quote = no claim, verifikasi cuma-baca, konfirmasi verbatim aksi merusak (§8.2).
- 🇮🇩 Bahasa Indonesia + gaya non-programmer (§2.1) — yang disederhanakan cuma FORMAT 2-lapis; tiap jargon tetap wajib dijelaskan awam.
- ✅ Gerbang QA/QC §4.6 saat rilis / perubahan berisiko — verifikasi bukti tetap penuh.

**Kapan Mode Hemat otomatis "mundur" ke penuh:** task menyentuh login/bayar/data-pribadi/upload/skema-DB/rilis (titik risiko §4.17) → walau Mode Hemat aktif, AI kembali detail untuk bagian berisiko itu (pas-ukuran = perketat di titik risiko, bukan seragam-tipis).

🏢 Analogi: kayak mode "hemat baterai" HP — matiin animasi & sinkron-latar yang boros, TAPI telepon darurat & alarm tetap nyala. Yang dihemat = hiasan, bukan fungsi keselamatan.
