<!-- LINTAS:SEKSI §cap-packs -->

## §cap. Capability Packs — resep-rakit kapabilitas kelas-industri (DETAIL on-demand)

> **Kapan dibaca:** staff minta **kapabilitas umum** dengan bahasa awam ("tambah login", "tambah pembayaran", "ekspor laporan", "upload foto", "kirim email"). Berkas induk ini menjelaskan cara kerja + daftar pack; detail tiap pack kini ada di skill-nya (`skills/<nama>/SKILL.md`), dinyalakan otomatis dispatcher.

### Apa ini & bedanya dari yang lain
- **Capability Pack** = resep siap-rakit untuk SATU kapabilitas (auth, pembayaran, dll): kontrak + langkah wiring + gotcha + gerbang keamanan, semua **kelas-industri**. Tujuannya: staff sebut kebutuhan bahasa awam → AI merakit versi profesional **tanpa staff tahu istilahnya**.
- **Beda dari Stack Pack (§4.14):** stack-pack = checklist per-TEKNOLOGI (Next.js/Postgres). Capability pack = resep per-KAPABILITAS/FITUR. Keduanya dipakai bersama (pack pakai stack-pack yang cocok).
- **Beda dari `PROJECT_STARTER_TEMPLATES.md`:** itu boilerplate project baru dari nol. Pack = adaptasi ke project yang SUDAH ada + kapabilitas spesifik.

### Cara kerja (mekanika — otak Claude yang menyetir, bukan mesin pemilih)
1. **Penemuan = SOFT lewat pemicu INDEX**, bukan pencocokan kata-kunci deterministik. Saat maksud staff cocok pemicu "Kapan dibaca" di `rules/INDEX.md`, **otak Claude** memutuskan membaca pack yang relevan (§ADR-009). DILARANG menaruh pemicu pack di mesin auto-deteksi `package.json` §4.14 (itu router-terselubung).
2. **ADITIF, tak pernah mengganti:** pack berjalan DI ATAS standar inti (§5/§8/§9/§10/§11) + stack-pack §4.14 — bukan menggantikan lensa apa pun.
3. **Pas-ukuran:** AI ambil bagian pack yang relevan saja; tugas sepele tak perlu pack.

### Disiplin WAJIB tiap pack (mengikat)
- **Reuse-first:** pack **merujuk-silang** ke checklist divisi / stack-pack / pack lain yang sudah ada — **JANGAN menyalin** (mis. detail keamanan sesi → rujuk `stack/4.14-5-owasp.md`; upload aman → rujuk pack `upload-storage`).
- **Cek versi (anti-halusinasi §8.2):** pack = PRINSIP stabil; untuk API/parameter library (Stripe, NextAuth, dll) AI WAJIB cek dokumentasi resmi **versi terpasang**, jangan andalkan ingatan.
- **Batas jujur:** pack menaikkan lantai mutu, **tidak menjamin** aman/lengkap sempurna. Sebut yang belum tertutup.
- **Threat-model 3-baris** per pack (aset dilindungi / model penyerang / mitigasi utama) — memenuhi §8 secara otomatis.
- **Aksi merusak tetap konfirmasi verbatim** (§8.2 Aturan 5); rilis lewat Gerbang §4.6.

### Daftar pack (urut dampak)
> **Pemicu tiap pack = field `pemicu` di frontmatter skill-nya** (dibaca dispatcher `rak-pemicu` → `skills/registry.json`; tak disalin ke sini supaya tak drift). Semua pack di atas **✅ tersedia** sebagai skill.

| Pack (kini rumah-nya = skill) | Berkas |
|---|---|
| 🔐 Auth | `skills/auth/SKILL.md` |
| 💳 Pembayaran | `skills/pembayaran/SKILL.md` |
| 📤 Upload-storage | `skills/upload-storage/SKILL.md` |
| ✉️ Email/notifikasi | `skills/email-notifikasi/SKILL.md` |
| ⏳ Background-job | `skills/background-job/SKILL.md` |
| 📈 Analytics | `skills/analytics/SKILL.md` |
| 📄 Ekspor & Laporan | `skills/ekspor-laporan/SKILL.md` |
| 🎰 Kepatuhan Teregulasi | `skills/kepatuhan-teregulasi/SKILL.md` |

> **Catatan (ADR-027 Fase Arsip, 2026-07-21):** 8 pack di atas kini jadi **skill** (`skills/<nama>/SKILL.md`), dinyalakan otomatis oleh dispatcher `rak-pemicu` dari pemicu di frontmatter tiap skill. 7 pack lama (AI/RAG aman · Realtime · i18n · Push Notification · Moderasi Konten · Pencarian · Feature Flag) **dipensiunkan** (riwayatnya di git + ADR-027) — kalau dibutuhkan lagi, bangun sebagai skill baru (§4.9).

> **Pack di atas menutup kapabilitas paling umum, bukan SELURUH kemungkinan.** Kapabilitas lain yang belum jadi pack sendiri (audit-trail/log-aktivitas, pemrosesan media/thumbnail-transcode) → AI pakai standar inti + stack-pack + cek dokumentasi resmi versi terpasang; audit-trail & pemrosesan media sebagian tumpang-tindih Gelombang-3 DB / `skills/upload-storage/SKILL.md` (rujuk, jangan salin). Penambahan pack baru = lewat alur skill §4.9.

> **Kredit (MIT):** pola diadaptasi dari standar industri (OWASP, dok resmi gateway/provider) + ECC v2.0.0 (MIT © Affaan Mustafa), ditulis-ulang bahasa non-programmer.
