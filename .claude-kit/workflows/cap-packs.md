<!-- LINTAS:SEKSI §cap-packs -->

## §cap. Capability Packs — resep-rakit kapabilitas kelas-industri (DETAIL on-demand)

> **Kapan dibaca:** staff minta **kapabilitas umum** dengan bahasa awam ("tambah login", "tambah pembayaran", "bikin chatbot AI", "upload foto", "kirim email"). Berkas induk ini menjelaskan cara kerja + daftar pack; detail tiap pack di `workflows/cap/<nama>.md`.

### Apa ini & bedanya dari yang lain
- **Capability Pack** = resep siap-rakit untuk SATU kapabilitas (auth, pembayaran, dll): kontrak + langkah wiring + gotcha + gerbang keamanan, semua **kelas-industri**. Tujuannya: staff sebut kebutuhan bahasa awam → AI merakit versi profesional **tanpa staff tahu istilahnya**.
- **Beda dari Stack Pack (§4.14):** stack-pack = checklist per-TEKNOLOGI (Next.js/Postgres). Capability pack = resep per-KAPABILITAS/FITUR. Keduanya dipakai bersama (pack pakai stack-pack yang cocok).
- **Beda dari `PROJECT_STARTER_TEMPLATES.md`:** itu boilerplate project baru dari nol. Pack = adaptasi ke project yang SUDAH ada + kapabilitas spesifik.

### Cara kerja (mekanika — otak Claude yang menyetir, bukan mesin pemilih)
1. **Penemuan = SOFT lewat pemicu INDEX**, bukan pencocokan kata-kunci deterministik. Saat maksud staff cocok pemicu "Kapan dibaca" di `workflows/INDEX.md`, **otak Claude** memutuskan membaca pack yang relevan (§ADR-009). DILARANG menaruh pemicu pack di mesin auto-deteksi `package.json` §4.14 (itu router-terselubung).
2. **ADITIF, tak pernah mengganti:** pack berjalan DI ATAS baseline 8 divisi §4.13 + stack-pack §4.14 — bukan menggantikan lensa apa pun.
3. **Pas-ukuran:** AI ambil bagian pack yang relevan saja; tugas sepele tak perlu pack.

### Disiplin WAJIB tiap pack (mengikat)
- **Reuse-first:** pack **merujuk-silang** ke checklist divisi / stack-pack / pack lain yang sudah ada — **JANGAN menyalin** (mis. detail keamanan sesi → rujuk `stack/4.14-5-owasp.md`; upload aman → rujuk pack `upload-storage`).
- **Cek versi (anti-halusinasi §8.2):** pack = PRINSIP stabil; untuk API/parameter library (Stripe, NextAuth, dll) AI WAJIB cek dokumentasi resmi **versi terpasang**, jangan andalkan ingatan.
- **Batas jujur:** pack menaikkan lantai mutu, **tidak menjamin** aman/lengkap sempurna. Sebut yang belum tertutup.
- **Threat-model 3-baris** per pack (aset dilindungi / model penyerang / mitigasi utama) — memenuhi §8 secara otomatis.
- **Aksi merusak tetap konfirmasi verbatim** (§8.2 Aturan 5); rilis lewat Gerbang §4.6.

### Daftar pack (urut dampak)
| Pack | Berkas | Kapan dibaca (pemicu) | Status |
|---|---|---|---|
| 🔐 Auth | `workflows/cap/auth.md` | "tambah login/daftar/user/peran/hak-akses" | ✅ tersedia |
| 💳 Pembayaran | `workflows/cap/pembayaran.md` | "tambah pembayaran/checkout/langganan/tagih" | ✅ tersedia |
| 🤖 AI/RAG aman | `workflows/cap/ai-rag-aman.md` | "bikin chatbot/asisten AI/tanya-dokumen/RAG" | ✅ tersedia |
| 📤 Upload-storage | `workflows/cap/upload-storage.md` | "upload/unggah foto/berkas/dokumen/avatar" | ✅ tersedia |
| ⚡ Realtime | `workflows/cap/realtime.md` | "chat/notifikasi langsung/update real-time/live" | ✅ tersedia |
| ✉️ Email/notifikasi | `workflows/cap/email-notifikasi.md` | "kirim email/notifikasi/OTP/reset password" | ✅ tersedia |
| ⏳ Background-job | `workflows/cap/background-job.md` | "proses di latar/antrean/jadwal berkala/cron" | ✅ tersedia |
| 🌐 i18n | `workflows/cap/i18n.md` | "banyak bahasa/terjemahan/lokalisasi" | ✅ tersedia |
| 📈 Analytics | `workflows/cap/analytics.md` | "lacak kunjungan/konversi/event" | ✅ tersedia |
| 📄 Ekspor & Laporan | `workflows/cap/ekspor-laporan.md` | "ekspor data/unduh CSV/export Excel/cetak PDF/laporan bulanan/terjadwal" | ✅ tersedia |
| 🔔 Push Notification | `workflows/cap/push-notification.md` | "push notification/notifikasi HP/notif walau app ditutup/Web Push/FCM" | ✅ tersedia |
| 🛡️ Moderasi Konten | `workflows/cap/moderasi-konten.md` | "moderasi/saring komentar/filter kata kasar/laporkan konten/user bisa posting" | ✅ tersedia |
| 🔎 Pencarian | `workflows/cap/pencarian.md` | "fitur pencarian/search bar/cari produk-artikel/filter & sortir/autocomplete" | ✅ tersedia |
| 🚩 Feature Flag | `workflows/cap/feature-flag.md` | "feature flag/sakelar fitur/kill switch/A/B test/rollout bertahap" | ✅ tersedia (tipis → rujuk template) |
| 🎰 Kepatuhan Teregulasi | `workflows/cap/kepatuhan-teregulasi.md` | "judi/kasino/sportsbook/taruhan/slot/lotere/industri berlisensi/fintech berizin" | ✅ tersedia |

> **15 pack ini menutup kapabilitas paling umum, bukan SELURUH kemungkinan.** Kapabilitas lain yang belum jadi pack sendiri (audit-trail/log-aktivitas, pemrosesan media/thumbnail-transcode) → AI pakai baseline 8 divisi + stack-pack + cek dokumentasi resmi versi terpasang; audit-trail & pemrosesan media sebagian tumpang-tindih Gelombang-3 DB / `cap/upload-storage.md` (rujuk, jangan salin). Peta-jalan penambahan = `docs/plans/perkuat-jangan-kurung-roadmap.md`.

> **Kredit (MIT):** pola diadaptasi dari standar industri (OWASP, dok resmi gateway/provider) + ECC v2.0.0 (MIT © Affaan Mustafa), ditulis-ulang bahasa non-programmer.
