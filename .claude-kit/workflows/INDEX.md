# workflows/INDEX.md — Daftar isi rujukan on-demand lintasAI

> Versi 2 · 2026-07-10 · Satu seksi = satu berkas. Rujukan di berkas aturan = path berkas di bawah.
> CARA PAKAI (AI): rujukan `workflows/<nama>.md` → `Read` berkas itu UTUH (client: `.claude-kit/workflows/...`).
> Berkas tak ketemu / cuma tahu nomor §X → cari nomornya di tabel ini. Dijaga robot `lib/workflows-ref-check.mjs`.
> **Kolom "Kapan dibaca" = PEMICU** (kapan berkas ini relevan). Dipakai AI untuk *self-routing*: begitu tugas cocok dengan pemicu, `Read` berkasnya — tak perlu menunggu aturan menyodorkan path. (Ide "use when…" ala pustaka skill, tapi terpusat di 1 berkas on-demand: nol beban token tiap sesi.)

| § | Berkas | Isi | Kapan dibaca (pemicu) |
|---|---|---|---|
| §4.1 | workflows/4.1-tinjauan-divisi.md | Contoh blok Tinjauan Divisi terisi (label dinamis Junior-<profesi> + Non-<profesi>) + skeleton format 13 lensa | Mau menampilkan blok "🎯 Tinjauan lintasAI Divisi" / butuh skeleton 13 lensa |
| §4.1b | workflows/4.1b-blok-belajar.md | Blok Belajar Junior-Profesi "📚 Belajar dari task ini": format 5 baris + contoh terisi + aturan label/multi-topik/skip/anti-ngarang | RAGU cara isi blok belajar (label/format/contoh) — BUKAN dibaca tiap output |
| §4.2 | workflows/4.2-pattern-driven.md | Pattern-Driven Workflow: intent staff -> pattern + Tangga Refactor 3-Tingkat | Staff minta fitur/bug/"refactor-rapikan" pakai bahasa sehari-hari; butuh Tangga Refactor |
| §4.2-0 | workflows/4.2-0-laporan-kondisi-nyata.md | Refleks "Laporan Kondisi Nyata Dulu": baca fakta nyata → lapor kondisi sebenarnya (✅ terverifikasi vs ❓ asumsi) → koreksi premis salah → baru eksekusi | Client minta tambah/hapus/audit/revisi/upgrade fitur (non-sepele) — sebelum usul/eksekusi |
| §4.2c | workflows/4.2c-aplikasi-utuh.md | Pola Aplikasi-Utuh: konfirmasi-lingkup + Peta Aplikasi (irisan vertikal ber-tag aspek) + pancing kebutuhan per-domain | Staff minta APLIKASI/SISTEM UTUH dari nol ("bikin aplikasi kasir / toko online"), bukan 1 fitur |
| §4.3 | workflows/4.3-guided-step-by-step.md | Pola pandu langkah-demi-langkah untuk staff baru (6 fase, tunggu-konfirmasi) | Staff BARU / minta "pandu aku langkah-demi-langkah" |
| §4.4 | workflows/4.4-audit-post-setup.md | Audit pasca-setup multi-dimensi cuma-baca + format temuan beranalogi | User minta "audit / review / cek yang bisa diperbaiki" |
| §4.5 | workflows/4.5-update-strategy.md | Strategi update kit: 4 tier + jalur update + keranjang migrasi eager/lazy | "Ada versi baru?" / "update kit" |
| §4.6 + §6.3 | workflows/4.6-6.3-doktrin-efisiensi.md | Detail doktrin efisiensi: 7 prinsip hemat-token + robot-deterministik-dulu + Sample-and-Expand + 6 kondisi GENTING-rilis | Butuh detail cara hemat-token/cepat, ambang baca modul besar, atau daftar penghenti-rilis |
| §4.7 | workflows/4.7-alur-berpemandu.md | Alur Berpemandu Bertahap: 7 aturan inti + larangan (progressive guided flow) | Mulai kerja multi-langkah ke staff (audit/refactor/setup/pecah-repo/migrasi/bulk docs) — butuh pola sajian bertahap |
| §4.8 | workflows/4.8-lintasai-skill.md | Perintah "lintasAI skill": 18 kriteria pindai menyeluruh + cara jalan | User ketik "lintasAI skill" / "scan lintasAI function" |
| §4.9 | workflows/4.9-skill-kustom.md | Skill kustom per-project: format entri + langkah bikin/panggil/bentrok nama | Client mau bikin skill sendiri (ngeprompt) / ada 2 skill senama |
| §4.13 | workflows/4.13-skill-divisi.md | 8 Skill Divisi WAJIB: definisi + checklist per divisi | Butuh checklist rinci 1 divisi ("skill backend/keamanan/…") |
| §4.14 | workflows/4.14-stack-packs.md | Paket Stack: cara kerja auto-deteksi + robot pendamping (checklist per-stack di workflows/stack/) | Ingin paham cara auto-deteksi stack + robot pendamping stack-check |
| §4.14-1 | workflows/stack/4.14-1-nextjs.md | Paket stack Next.js / React / TypeScript | Kerja di project Next.js/React (deteksi `next`/`react`, berkas `*.tsx`) |
| §4.14-1b | workflows/stack/4.14-1b-frontend-lanjutan.md | Frontend lanjutan React/Next: tes komponen RTL, race useEffect, Motion/animasi | Menulis tes komponen React, ambil-data manual di `useEffect`, atau animasi Motion/Framer |
| §4.14-2 | workflows/stack/4.14-2-supabase-prisma.md | Paket stack Database: Supabase / PostgreSQL / Prisma | Kerja database (deteksi `@supabase/*`, `@prisma/client`, `schema.prisma`) |
| §4.14-3 | workflows/stack/4.14-3-cloudflare.md | Paket stack Cloudflare Workers / Edge | Project Cloudflare Workers/Edge (deteksi `wrangler.toml`) |
| §4.14-4 | workflows/stack/4.14-4-deploy.md | Paket stack Deployment (Vercel / Railway / Render / CF Pages) | Mau deploy / "online" / atur hosting Vercel/Railway/Render |
| §4.14-5 | workflows/stack/4.14-5-owasp.md | Paket stack Keamanan Web (OWASP) untuk produk publik | Produk publik / sentuh login-bayar-upload / cek keamanan web |
| §4.14-6 | workflows/stack/4.14-6-seo.md | Paket stack SEO terstruktur (pelengkap baseline divisi SEO) | Halaman publik / kerja SEO / metadata-sitemap-Core Web Vitals |
| §4.14-7 | workflows/stack/4.14-7-python.md | Paket stack Python (FastAPI / Django / script) | Project Python (deteksi `*.py`, `requirements.txt`/`pyproject.toml`, FastAPI/Django) |
| §4.14-8 | workflows/stack/4.14-8-php.md | Paket stack PHP / Laravel | Project PHP/Laravel (deteksi `composer.json`/`artisan`) |
| §4.14-9 | workflows/stack/4.14-9-go.md | Paket stack Go / Golang | Project Go (deteksi `go.mod`) |
| §4.14-galeri | workflows/stack/4.14-galeri-folder.md | Galeri contoh struktur folder per-stack (acuan project kosong) | Project kosong / butuh contoh struktur folder per-stack |
| §cap-packs | workflows/cap-packs.md | Capability Packs: cara kerja + daftar resep-rakit per-kapabilitas (induk) | Staff minta kapabilitas umum (login/bayar/chatbot/upload/dll) — butuh peta pack |
| §auth | workflows/cap/auth.md | Pack Auth: login/sesi/otorisasi (RBAC) kelas-industri | "tambah login/daftar/akun/peran/hak-akses" |
| §pembayaran | workflows/cap/pembayaran.md | Pack Pembayaran: checkout + idempotency-key + webhook aman (tutup GENTING-rilis) | "tambah pembayaran/checkout/langganan/tagih" |
| §ai-rag-aman | workflows/cap/ai-rag-aman.md | Pack AI/RAG aman: input tak-tepercaya, output≠perintah, authz retrieval, batas biaya, PII | "bikin chatbot/asisten AI/tanya-dokumen/RAG" |
| §upload-storage | workflows/cap/upload-storage.md | Pack Upload & Storage: signed URL + 5-pagar + key acak server + retensi/lifecycle | "upload/unggah foto/berkas/dokumen/avatar/lampiran" |
| §realtime | workflows/cap/realtime.md | Pack Realtime: SSE/WebSocket/Supabase + authz per-kanal + reconnect/resync | "chat/notifikasi langsung/update real-time/live/kolaborasi" |
| §email-notifikasi | workflows/cap/email-notifikasi.md | Pack Email/Notifikasi: SPF/DKIM/DMARC + kirim-latar + OTP aman + anti-abuse + bounce | "kirim email/notifikasi/OTP/reset password/struk/newsletter" |
| §background-job | workflows/cap/background-job.md | Pack Background Job: antrean persisten + idempoten + retry/backoff + DLQ + lease + cron | "proses di latar/antrean/jadwal berkala/cron/tugas berat/worker" |
| §i18n | workflows/cap/i18n.md | Pack i18n: pisah teks + plural ICU + format Intl + RTL + hreflang | "banyak bahasa/terjemahan/lokalisasi/multi-bahasa/RTL" |
| §analytics | workflows/cap/analytics.md | Pack Analytics: 3 aksi inti + consent/privasi + tanpa-PII + event kritis server-side | "lacak kunjungan/analytics/konversi/event/pasang GA" |
| §ekspor-laporan | workflows/cap/ekspor-laporan.md | Pack Ekspor & Laporan: otorisasi per-baris + anti CSV-injection + ekspor besar via latar/streaming + terjadwal | "ekspor data/unduh CSV/export Excel/cetak PDF/laporan bulanan/download tabel" |
| §push-notification | workflows/cap/push-notification.md | Pack Push Notification: izin momen-tepat + Web Push/FCM/APNs + kirim latar idempoten + bersihkan token mati | "push notification/notifikasi HP/notif walau app ditutup/Web Push/FCM" |
| §moderasi-konten | workflows/cap/moderasi-konten.md | Pack Moderasi Konten: dua-lapis (otomatis+manusia) + jalur hukum CSAM + banding + anti-abuse lapor | "moderasi konten/saring komentar/filter kata kasar/laporkan konten/user bisa posting" |
| §pencarian | workflows/cap/pencarian.md | Pack Pencarian: full-text/faset + saring izin server + paginasi kursor (semantik/vektor rujuk G3) | "fitur pencarian/search bar/cari produk-artikel/filter & sortir/autocomplete" |
| §feature-flag | workflows/cap/feature-flag.md | Pack tipis Feature Flag: default-MATI + rollout hash-deterministik + rujuk template lengkap | "feature flag/sakelar fitur/kill switch/A/B test/rollout bertahap" |
| §kepatuhan-teregulasi | workflows/cap/kepatuhan-teregulasi.md | Pack Industri Teregulasi: izin bangun judi/gaming untuk yurisdiksi legal + rambu geo-block/KYC/AML/judi-bertanggung-jawab/audit (saran kuat) + batas keras jangan-langgar-hukum | "bikin situs/app judi/kasino/sportsbook/taruhan/slot/lotere/industri berlisensi/fintech berizin" |
| §4.15 | workflows/4.15-pola-bantu.md | 5 Pola Bantu otomatis: perbaiki error, cakupan tes, pindai permukaan-AI, uji situs, tahan-gagal | "error/gagal build", "tes/coverage", "cek MCP/izin", "uji situs", atau kode panggil API luar rapuh |
| §4.16 | workflows/4.16-build-sequence.md | Urutan bangun-fitur by-dependency + ringkasan mandiri per langkah + irisan vertikal | Bikin fitur besar (>2-3 berkas / multi-sesi) — butuh urutan bangun |
| §4.18 | workflows/4.18-compaction.md | Protokol aman compaction (rapi-rapi berkas) 5 langkah + larangan | User ketik "compaction" / "padatkan berkas" / index melenceng |
| §4.19 | workflows/4.19-plan-mode.md | Format Rencana Plan-Mode: Pindai Cepat + Matriks intent + Pernyataan Cakupan + Stack-DoD 8-divisi + protokol HAPUS + pasangan 2-versi + contoh | Plan mode harness aktif / rencana besar-multi-sesi / ragu format rencana — BUKAN tiap rencana kecil |
| §gerbang-klarifikasi | workflows/gerbang-klarifikasi.md | Gerbang Klarifikasi: 1 batch tanya sebelum rencana non-sepele (akses/data/kriteria/edge-case) | Rencana non-sepele & ada yang kabur — sebelum menyusun rencana |
| §ears-kriteria | workflows/ears-kriteria.md | Kriteria sukses gaya EARS Indonesia (KETIKA…MAKA SISTEM HARUS…) — opsional, memaksa munculnya edge case | Menulis kriteria sukses / DoD dan mau bentuk terstruktur ramah non-programmer |
| §7.10 | workflows/7.10-higiene-dokumen.md | Higiene menulis dokumen kit (anti-slop): yang dibuang vs dipertahankan | Menulis/merapikan dokumen kit — mau buang basa-basi tanpa buang pengaman |
| §7.11 | workflows/7.11-peta-project.md | Peta Aktivitas Project → draf roadmap human-gated (robot `project-map` + kartu + architecture + plans + CHANGELOG) | Staff minta "roadmap / peta jalan / rencana / denah / apa progres project" |
| §8.3 | workflows/8.3-trusted-repo.md | Trusted repo auto-detect (GPG skip) + audit log 3-lapis | Update kit dari repo (verifikasi GPG / repo resmi vs fork) |
| §14.1 | workflows/14.1-popup-ui.md | Konvensi popup & pilihan: 8 aturan + RULE-4b rekomendasi-di-[1] + contoh benar/salah | Mau bikin popup/pilihan (`AskUserQuestion`) — butuh aturan format |
| §13 | workflows/13-glossary.md | Glossary istilah teknis + istilah kit | Butuh arti istilah teknis/kit (IDOR, atomik, bus factor, exception chaining, …) |
| §jargon-card | workflows/ref-jargon-card.md | Kartu translasi 23 jargon tersering untuk narasi antar-langkah | Nulis narasi antar-langkah — butuh padanan awam (push/commit/tag/migration) |
| §15 | workflows/15-ide-opsional.md | Ide opsional opt-in per proyek (daftar detail 10 ide + mode opsional) | User aktifkan mode opsional (hemat/auto-confirm/co-pilot) / lihat 10 ide opt-in |
| §4.10 | workflows/4.10-pindah-topik.md | Deteksi pindah-topik: template footer + daftar kapan/jangan | User jelas pindah ke topik/tugas BARU tak berkaitan |
| §4.12 | workflows/4.12-copilot-berpagar.md | Mode Co-Pilot Berpagar: perilaku detail saat aktif | Mode Co-Pilot aktif ("mode co-pilot") — butuh perilaku detail + pagar |
| §7.6 | workflows/7.6-health-check.md | AI Auto-Health-Check: kapan jalan + apa saja yang dicek | Sesi pertama pasca-pasang/update / error berbau lingkungan / `npx lintasai doctor` |
| §7.7 | workflows/7.7-bus-factor.md | Bus Factor Scorer: detail skor 0-4 + cara lapor | Edit/buat file CRITICAL — beri skor bus factor + saran |
| §8.1-4 | workflows/8.1-4-identity-tier-guard.md | Identity & tier-guard: skenario + bentuk SALAH vs BENAR | Bikin `.staff-profile.md` / user klaim identitas / atur tier akses |
| §8.2-3b | workflows/8.2-3b-jangan-asal-flag.md | Aturan 3b: daftar 12 kesalahan-umum "jangan asal di-flag" + analogi | Audit/review nemu "masalah" — SEBELUM temuan masuk laporan |
| §8.2-1b | workflows/8.2-1b-klaim-angka.md | Aturan 1b "Hitung dari Bukti": aturan klaim angka + tabel klaim→hitung + tangga L0–L3 + 6 batas jujur + contoh client | Mau menyebut %/hemat/"N dari M"/ukuran/benchmark, atau menulis laporan kuantitatif |
| §8.2-anti-halusinasi | workflows/8.2-anti-halusinasi.md | Tabel Force Citation (klaim→tool) + tabel Humble Mode (confidence→bahasa) + format konfirmasi aksi destruktif (verbatim) | Butuh daftar tool-per-klaim, tingkat confidence lengkap, atau template konfirmasi aksi destruktif |
| §7.3a | workflows/7.3a-modifikasi-baca-kode.md | Task modifikasi: dokumen = navigasi, kode asli WAJIB dibaca sebelum edit + checklist mikro | Task ubah/hapus/revisi kode yang sudah ada — sebelum mulai edit |
| §6.5 | workflows/6.5-rekam-pelajaran-frontier.md | Rekam Pelajaran Frontier: AI catat pelajaran teknis (belum-dijaga-kit) ke berkas LOKAL ter-redaksi; owner menimbang jadi standar (default nyala-lokal, kirim opt-in, anti auto-evolve §6.4) | Selesai tugas teknis substantif → timbang catat pelajaran frontier; atau ragu cara/pagar rekam pelajaran |
