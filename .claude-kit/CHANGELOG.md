# Changelog

Semua perubahan signifikan ke kit ini didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/),
dan kit ini mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## Label spesial (auto-detect oleh `npx lintasai update`)

- **[BREAKING]** - Ada perubahan tidak backward-compatible. Wajib baca migration notes.
- **[SCAN-REQUIRED]** - Wajib regenerate `docs/` (re-paste `PROJECT_LIFECYCLE_PROMPT_v1.md` Stage 2: Bikin Catatan Proyek).
- **[SECURITY]** - Perbaikan KEAMANAN. Pasang SEGERA walau update kecil — **urgensi, terpisah dari ukuran** (bisa nempel di tingkat mana pun). Tool `npx lintasai update` tampilkan peringatan merah "pasang SEGERA".

Tanpa label, update aman: `docs/` user TIDAK perlu di-scan ulang.

## Disiplin penomoran versi (semver) — WAJIB saat rilis

Versi = `BESAR.MENENGAH.KECIL`. Saat owner/AI menaikkan versi:
- **Perbaikan kecil** (typo, fix, Tier 1) → naikkan **KECIL**: `1.7.5 → 1.7.6`
- **Fitur/aturan baru** backward-compatible (Tier 2) → naikkan **MENENGAH**: `1.7.x → 1.8.0`
- **Breaking** (`[BREAKING]`, Tier 3) → naikkan **BESAR**: `1.x → 2.0` — **WAJIB**, jangan sembunyikan breaking di angka kecil/menengah.

> **Kenapa:** staff non-programmer sering cuma melihat NOMOR. Kalau breaking nyelip di angka kecil, mereka kira aman → kaget. **Angka BESAR yang JARANG naik = sehat** (jarang merusak user); yang dihindari bukan angka besar, tapi sering-breaking. Aturan inti: `CLAUDE_universal_v1.md` §11.

---

## [2.9.0] - 2026-07-17

### Ditambah — kit lintasAI kini jalan native di **Kimi Code CLI** juga (bukan cuma Claude Code)

- **Aturan penuh di Kimi (kualitas sama seperti Claude).** Kimi Code membaca berkas `AGENTS.md` otomatis tiap sesi (bukan `CLAUDE.md`/`@import` seperti Claude). Pemasang kini otomatis membuat **`.kimi-code/AGENTS.md`** berisi **salinan PENUH** aturan `CLAUDE_universal_v1.md` — jadi begitu project dibuka di Kimi Code, aturan yang menyetir mutu (Bahasa Indonesia non-programmer, 8 divisi, anti-ngarang, gerbang QA) **identik** dengan di Claude, tak ada yang tertinggal. Berkas ini dibuat-ulang otomatis tiap update; **tak mengganggu pengguna Claude-only** (Claude tak membaca folder `.kimi-code/`, berkasnya gitignored). Perintah manual: `npx lintasai kimi-sync`. (`lib/kimi-agents-gen.mjs`)
- **Palang Rem keamanan versi Kimi (opsional, hybrid).** Adaptor hook memakai ULANG otak keputusan yang sama dengan Claude (`lib/risk-gate.js`), dipetakan ke kontrak hook Kimi (TOML `[[hooks]]`, bukan JSON): perintah **ekstrem/tak-bisa-dibatalkan** (`rm -rf`, `DROP/TRUNCATE`, unduh-lalu-jalankan, terobos-pagar, format disk) **ditolak keras**; yang berisiko-tapi-pulih (`DELETE ... WHERE`, `prisma migrate`, sentuh `.env`) **diperingatkan** lalu lewat dialog persetujuan **bawaan Kimi**. Pengingat bahasa/8-divisi + rekam-pelajaran juga tersedia. Pasang (OPT-IN + **wajib diuji di Kimi**): `npx lintasai enable-kimi-hooks`. (`lib/kimi/*`)
- **Kenapa hook OPT-IN, bukan otomatis:** dokumentasi resmi Kimi memastikan hook di config GLOBAL; dukungan hook PER-PROJECT belum resmi didokumentasikan. Supaya TAK merilis perilaku yang belum teruji, pemasangan hook = perintah manual yang di-uji owner di Kimi dulu (panduan + uji-mandiri di `KIMI_CODE_SETUP.md`). Kalau hook per-project tak terpicu: aman — keamanan tetap dijaga persetujuan bawaan Kimi + aturan. Jalur aturan (di atas) TIDAK butuh hook.
- **Model-agnostik (K3 TIDAK wajib).** Dukungan Kimi menempel ke *Kimi Code CLI* (fitur baca AGENTS.md + hook = fitur CLI berlisensi MIT), **bukan** model tertentu → jalan di **K2.7 Code (`kimi-for-coding`, tersedia semua tier), K3 (butuh Moderato+), atau model provider lain** via `config.toml`. Tier langganan hanya membatasi akses MODEL, bukan fitur kit. (`KIMI_CODE_SETUP.md`)
- **Bonus:** Claude Code juga bisa dijalankan dengan model Kimi K2/K3 lewat `ANTHROPIC_BASE_URL` (tanpa mengubah kit) — dicatat di `KIMI_CODE_SETUP.md`.
- Keputusan desain lengkap: `docs/decisions/ADR-015-native-kimi-code.md`. Jalur Claude Code **tak berubah sama sekali** (semua tambahan di samping; 1230 tes + jalur lama tetap hijau). Panduan pasang + verifikasi-mandiri: `KIMI_CODE_SETUP.md`.

### Ditambah — kit belajar dari tiap client tanpa "mengubah dirinya sendiri": sistem **"rekam pelajaran"** (4 robot, human-in-the-loop)

- **Kit kini mencatat sendiri pelajaran teknis "frontier"** (pola/standar IT profesional yang belum dijaga kit) yang muncul saat kerja di project client, ke berkas **LOKAL** ter-redaksi di `docs/pelajaran-lintasai/`. Yang mencatat = client; yang **memutuskan** jadi standar kit = **OWNER** (manusia di tengah keputusan) — bukan AI diam-diam mengubah aturannya sendiri (anti "auto-evolve" §6.4/§6.5). Kemampuan ini ikut paket + otomatis aktif tiap sesi. Dibangun di atas `ADR-006`. (`lib/feedback-capture.mjs`)
- **Pengingat akhir-tugas (hook `Stop`, default-nyala, TAK memblokir).** Di akhir tugas ber-kode, AI diingatkan menimbang: "ada teknik profesional yang belum dijaga kit?" **Fail-open** — kalau hook gagal, kerja tetap jalan; sekali per tugas, bukan tiap pesan. Opt-out: ketik "matikan rekam pelajaran" / centang `AGENTS.md`. (`lib/ensure-feedback-capture-hook.mjs`, addendum `docs/decisions/ADR-008`)
- **Sensor rahasia 2-lapis SEBELUM apa pun tercatat.** Robot redaksi menyensor secret/data-pribadi/jalur-bisnis + menyamarkan bukti, dengan penjaga anti salah-sensor. (`lib/feedback-scrub.mjs`)
- **Identitas anonim + agregator per-organisasi.** ID organisasi/repo/staff di-hash anonim dari git (nilai mentah dibuang, §8.1 #6); agregator merangkum per-organisasi (**1 organisasi = 1 suara**), diurut menurut jangkauan — **tanpa stempel "LULUS"** (sering-muncul = prioritas, BUKAN tanda benar). (`lib/project-id.mjs`, `lib/feedback-aggregate.mjs`)
- **Pagar keras:** tanpa kirim-otomatis (kirim ke owner = opt-in), tanpa skor angka, tanpa AI mengubah perilakunya sendiri. Aturan: `CLAUDE_universal_v1.md` §6.5; detail `workflows/6.5-rekam-pelajaran-frontier.md` + spesifikasi `templates/feedback/rekam-pelajaran.md`.

### Ditambah — 3 gerbang mutu client dinaikkan ke penegakan mesin (sesuai profil tim NOL peran QA/DevOps)

- **Checkpoint `server-only` (Next.js).** Panduan penjaga kunci-server dinaikkan dari saran → **checkpoint wajib** Gerbang Bukti-Jalan: project Next.js dengan secret server (mis. `service_role` Supabase) wajib pasang paket `server-only` + marker di modul rahasia → build gagal otomatis kalau kunci bocor ke browser. (`workflows/stack/4.14-1-nextjs.md`)
- **Resep gerbang lint keamanan + a11y (opt-in, bertahap).** Section baru `STACK_GUIDE.md` §7.6: cara memasang ESLint yang menangkap XSS (`dangerouslySetInnerHTML`/innerHTML tak-aman) sebagai `error` + a11y/`key={index}` sebagai `warn` — gerbang mesin untuk tim tanpa peran QA. Bertahap + opt-in supaya tak membanjiri merah (anti alarm-palsu). Pointer dari panduan Next.js. (`templates/STACK_GUIDE.md`, `workflows/stack/4.14-1-nextjs.md`)
- **Palang Rem DB: pengingat verbatim-produksi.** Untuk DROP/TRUNCATE, DELETE-tanpa-WHERE, dan deleteMany/updateMany-tanpa-where, pesan konfirmasi kini menyuruh AI meminta konfirmasi ketik-frasa (§8.2 Aturan 5) bila database PRODUKSI — dialog klik tetap backstop mesin (mekanisme tak berubah). (`lib/risk-gate.js`)

> Efek di project client baru terasa setelah kit di-update (`npx lintasai@latest update`) + buka chat baru; resep server-only/ESLint aktif per-project saat membangun app Next.js.

---

## [2.8.0] - 2026-07-15

### Diubah — `npx lintasai update` kini jalan untuk SEMUA client (sumber npm, bukan repo privat)

- **Masalahnya:** repo standar tim `ojokesusu/lintasAI` **privat**, padahal `npx lintasai update` mengambil bahannya dari sana lewat `git clone`. Di komputer client yang tak diundang ke repo, perintah itu **berhenti tanpa meng-update apa pun** — selama ini mereka harus pasang ulang lewat `npm create lintasai@latest`. Di komputer owner perintah itu jalan, jadi masalahnya tak terlihat dari sisi pembuat.
- **Sekarang:** cukup **`npx lintasai@latest update`** untuk siapa pun. Bahannya = paket npm publik yang **sudah diunduh + diverifikasi npm sendiri** sebelum perintahnya jalan — **tak butuh akun GitHub, akses repo, maupun git terpasang**. Kit lama **tak perlu** pasang ulang dulu: perintah itu menjalankan updater versi terbaru dari npx, bukan updater lama di `.claude-kit/`.
- **Tulis `@latest`.** Tanpa itu `npx` bisa memakai versi lama (paket lokal di `node_modules` menang; cache npx juga membekukan versi di npm < 11.2.0). Kalau itu terjadi, updater **menolak jalan** + menyebut perintah yang benar — ia tak akan diam-diam memasang versi lama.
- **`--from-repo`** = jalur git lama (clone + verifikasi tanda tangan GPG), untuk owner/tim yang diundang ke repo (mis. menguji tag pra-rilis). **`--allow-downgrade`** = pintu darurat kalau memang sengaja mau turun versi.
- **Aturan lama "client eksternal harus `npm create lintasai@latest`" DICABUT.** `npm create` kini murni untuk **pasang BARU**. Dokumen yang menyatakan aturan lama sudah diselaraskan (`CLAUDE_universal_v1.md` §4.5, `UPDATE_KIT_PROMPT_v1.md` Step 0, `workflows/4.5-update-strategy.md`, `templates/UPDATE_GUIDE.md`).

### Ditambah — update tak lagi bisa membuat kit client lenyap

- **Siapkan → periksa → tukar.** Versi baru disiapkan di folder sebelah, **diperiksa kelengkapannya**, baru ditukar (2 langkah cepat). Dulu urutannya kebalikan: folder kit di-rename jadi cadangan **dulu**, baru versi baru diambil — dan karena tak ada satu pun penangan interupsi di kode, Ctrl-C/mati listrik di tengah = `.claude-kit` **hilang**. Kalau apa pun gagal sebelum tukar, kit client kini **tak tersentuh sama sekali**. (`lib/kit-staging.mjs`)
- **Penyelamat kit yang terlanjur lenyap** (bekas update versi lama yang mati di tengah): update kini mengenali folder cadangan yang tertinggal, lalu menunjukkan cadangannya + cara mengembalikannya. Dulu perintahnya gagal sambil menyalahkan "berkas terkunci/antivirus" dan tak pernah menyebut cadangan yang duduk diam di sebelahnya — client non-programmer buntu total.
- **Kunci "cuma 1 update per project"** (`lib/update-lock.mjs`): dua update berjalan bersamaan bisa saling menimpa dan mengubur kit lama. Kunci yang lebih tua dari 30 menit dianggap bangkai dan diambil alih otomatis, supaya project tak terkunci selamanya setelah mati listrik.
- **`doctor` kini memberi tahu kalau kit kedaluwarsa** (banding ke npm, bukan ke repo — jadi client tanpa akses repo ikut terlayani). Dulu doctor **buta**: daftar berkas wajib dibaca dari kit yang terpasang itu sendiri, jadi kit v2.6.0 divonis "sehat, semua utuh" walau berkas v2.7.0 tak ada. Offline → INFO, bukan merah (jangan bikin alarm palsu gara-gara jaringan kantor).

### Diperbaiki [SECURITY] — dokumen internal repo-dev bocor ke folder kit client

- `docs/serap-skill/**` (4 berkas riset internal) + `docs/BUKU_PELAJARAN.md` **ikut tersalin** ke `.claude-kit/` client saat pemasang dijalankan dari repo-dev: penyaring salin tak sepadan dengan negasi `package.json files[]`. Ketahuan lewat **uji pemasangan nyata**, bukan pembacaan kode. Penyaring kini sepadan + dikunci tes (`tests/setup-copy-filter.test.mjs`).

### Diperbaiki — update bisa diam-diam memasang kerjaan yang BELUM dirilis

- Kalau catatan-pasang hilang, seluruh pengecekan versi mati diam-diam (`canCheckRemote` dihitung **sebelum** versi diisi) → pin-ke-tag gagal → `git clone` jatuh ke branch **`main`**, yaitu kerjaan yang belum dirilis. Sekarang update **berhenti** kecuali diminta eksplisit `--branch main`.
- **Update yang dibatalkan tak lagi melapor "sukses".** Dulu `return 0` walau tak ada apa pun yang berubah → skrip/CI/AI yang hanya melihat kode-keluar menyimpulkan update berhasil.
- **Rujukan menggantung di sisi client:** `CLAUDE_universal_v1.md` menunjuk `docs/decisions/ADR-009` yang **sengaja tak dikirim** ke client (penjaga LP-007) → AI client menemukan berkas kosong. Penunjuk path dihapus (sebutan jangkar `(ADR-009)` tetap). Dikunci penjaga baru `tests/adr-rujukan-klien.test.mjs`.
- **Klaim retensi cadangan yang menyesatkan** di `workflows/4.5-update-strategy.md` ("cadangan lama dibersihkan otomatis") diluruskan: pembersihan **opt-in** lewat `--cleanup-backups`, default tak menghapus apa pun.

### Catatan teknis

- Memanggil `npm` dari Node di Windows: `spawnSync('npm')`→ENOENT, `'npm.cmd'`→EINVAL (ditolak sejak tambalan CVE-2024-27980), `shell:true`→jalan tapi memicu DEP0190 ("argumen tidak di-escape" = celah injeksi). Jalur yang dipakai: `node` + `npm-cli.js` **tanpa shell** (`lib/npm-query.mjs`).
- Tes: 1103 → 1148. Termasuk tes ujung-ke-ujung pertama untuk jalur update yang **berhasil** — Langkah 4-7 (pasang-ulang, beda CHANGELOG, doctor, laporan migrasi) selama ini **nol cakupan tes**, diakui sendiri di `tests/update-kit.test.mjs`.

## [2.7.0] - 2026-07-15

### Ditambah — Naik-kelas standar profesional stack-pack (5 gap Next.js/Supabase produksi)

Kit sudah setara standar expert di mayoritas praktik (Core Web Vitals, resilience, error boundary, i18n, WCAG, RLS-ON, otorisasi server-side); 5 gap terhadap checklist produksi resmi (nextjs.org/supabase.com/web.dev) ditutup — aditif ke stack-pack, tidak mengubah alur.

- **Untuk non-programmer:** app kamu kini punya lebih banyak "sabuk pengaman kelas pro": uji otomatis bahwa data orang lain benar-benar tak bisa diintip, halaman yang tak lambat/basi, dan checklist klik-Dashboard biar aman sebelum online.
- **Untuk programmer:** (1) uji policy RLS otomatis pgTAP (`templates/supabase-rls.test.sql` + resep di `4.14-2`) — wire ke Gerbang Bukti-Jalan §4.19; (2) type-safety native Supabase (`supabase gen types` + `createClient<Database>` + typed `.rpc()` + `strict`/`no-explicit-any`); (3) Next.js Caching/ISR/`revalidateTag`/`revalidatePath` sadar-versi (`4.14-4-deploy`); (4) Core Web Vitals berangka (LCP<2.5d/INP<200ms/CLS<0.1) jadi gerbang DoD halaman publik + wajib RUM (§10); (5) checklist pengerasan Auth Supabase pra-launch (leaked-password protection dll., `STACK_GUIDE.md` §7.5). Backlog: E2E Playwright fitur besar, rotasi secret.

### Ditambah — Palang Fakta (fact-gate): penegak-mesin pra-edit berkas berdampak-tinggi (OPT-IN)

- **Untuk non-programmer:** pengaman opsional yang bisa kamu nyalakan — sebelum AI mengubah berkas penting (login, database, keamanan), ia "dipaksa" menyebut dulu siapa saja yang memakai berkas itu + data apa yang tersentuh, biar tak asal ubah dan bikin error. Default MATI; kamu yang memutuskan menyalakan.
- **Untuk programmer:** `lib/fact-gate.mjs` = hook PreToolUse (adopsi ECC gateguard-fact-force, MIT, ditulis-ulang Bahasa Indonesia). Sebelum Edit/Write PERTAMA berkas berdampak-tinggi (auth/DB/migrasi/RLS/API/route/keamanan) per sesi → block + minta 4 fakta (importer · fungsi terdampak · skema data · instruksi verbatim). Dampening per-sesi (sekali/berkas via state di tmp) + skip pohon rendah-nilai (tests/generated) + fail-open. DEFAULT MATI (opt-in — beda risk-gate yang default nyala); memperkuat-mesin §7.3a/§5/§4.6. Sinergi: pakai-ulang blok `importers:` dari plan-scout. Keputusan = `docs/decisions/ADR-014`. Dijaga `tests/fact-gate.test.mjs`.

### Ditambah — Rencana Cepat-Akurat Plan Mode (§4.19) + robot plan-scout

Aturan baru supaya saat AI menyusun RENCANA (Plan mode Claude Code atau penyajian rencana di mode lain), hasilnya lebih cepat, akurat, dan mudah dipahami — tanpa mengekang penalaran AI.

- **Untuk non-programmer:** kalau kamu minta AI "jelasin kondisi project", "tambah/hapus/upgrade fitur", atau pakai Plan mode — jawabannya kini disajikan bertahap dengan 2 versi tiap bagian (👨‍🎓 versi teknis untuk belajar + 🙂 versi bahasa sehari-hari), memisahkan mana yang sudah "✅ dipastikan" vs "❓ masih dugaan", dan menutup dengan "sudah kuperiksa A/B/C, belum periksa D/E" biar kamu tak salah ambil keputusan. AI juga membaca lebih sedikit berkas tapi yang tepat, jadi lebih hemat + cepat.
- **Untuk programmer:** mandat §4.19 (always-load, ~230 token pointer) + rak `workflows/4.19-plan-mode.md` (on-demand): Matriks Intent→Kedalaman→Wajib-✅ (menggantikan ambang "3-berkas-jenuh" flat), Pernyataan Cakupan wajib untuk output kondisi/saran, ambang berhenti content-based (klaim RLS/izin → baca migrasi ber-nomor tertinggi per objek), sub-protokol HAPUS Sapuan-Referensi-Terbalik, tabel kandidat 8-dimensi, Stack-DoD (termasuk UI/UX/a11y). Robot `npx lintasai plan-scout` (pra-pindai STATELESS: kata-kunci + migration-timeline + reverse-ref). Hook `lang-reminder` menambah blok pengingat kondisional saat `permission_mode==="plan"` (fail-safe; 0 token di mode lain). Koreksi jujur: pagar lama "titik-risiko→✅ wajib" ternyata BERBAHAYA (memaksa ✅ di atas data basi) → diamandemen. Adopsi: Gerbang Klarifikasi (Spec Kit), EARS Indonesia (Kiro). Keputusan + alternatif ditolak = `docs/decisions/ADR-013`. Dijaga `tests/plan-mode-rule.test.mjs` + `tests/plan-scout.test.mjs` + `tests/lang-reminder.test.mjs`.

---

## [2.6.0] - 2026-07-14

### [SECURITY] Menutup celah keamanan standar-profesional (Gelombang 1: item GENTING)

Tindak lanjut assessment `docs/serap-skill/BANDING-SECURITY-STANDAR-PRO-2026-07-14.md` (banding security lintasAI vs ECC terhadap baseline OWASP 2025/API/ASVS 5.0/LLM). Dikerjakan per-item, owner-gated.

- **CSP (Content-Security-Policy) yang kosong → diisi nyata.** Seksi "7.4 CSP Header" di `templates/STACK_GUIDE.md` sebelumnya berjudul CSP + mengklaim "mencegah XSS" TAPI blok header-nya tak memuat satu pun directive `Content-Security-Policy` (rasa aman palsu). Kini: CSP dasar nyata (Tingkat 1) + pola nonce ketat bertingkat (Tingkat 2) + `X-Frame-Options` + peringatan trade-off dynamic-rendering. Diverifikasi ke dokumentasi resmi Next.js (guide CSP, dicek 2026-07); pola nonce diserap dari ECC `rules/web/security.md` (MIT © Affaan Mustafa).

  **Untuk non-programmer:** dulu ada "satpam XSS" yang namanya tertulis tapi orangnya tak ada di pos — sekarang satpamnya benar-benar dipasang, plus versi lebih ketat untuk halaman ber-data sensitif.

  **Untuk programmer:** `templates/STACK_GUIDE.md` §7.4 dirombak; entri roadmap `perkuat-jangan-kurung-roadmap.md:44` ditandai selesai. Tak ada breaking — template panduan, bukan kode runtime.

- **Peringatan CVE-2025-29927 (bypass login Next.js middleware, CVSS 9.1 KRITIS) ditambahkan** ke `workflows/stack/4.14-5-owasp.md`. Header `x-middleware-subrequest` bisa melewati cek otorisasi yang hanya ada di middleware. Mitigasi berlapis: upgrade Next.js ke versi patch (12.3.5/13.5.9/14.2.25/15.2.3+) + jangan andalkan middleware sebagai satu-satunya penjaga (cek ulang di route handler/Server Action + RLS). Fakta diverifikasi ke NVD (dicek 2026-07); bukan dari ECC (celah ini di ECC pun tak dibahas).

  **Untuk non-programmer:** menambah peringatan soal satu "pintu rahasia" di sistem Next.js — panduannya sekarang menyuruh pasang satpam berlapis, bukan cuma di gerbang depan.

- **Supabase RLS diperkuat** di `templates/RLS_SETUP_PROMPT.md` (v1→v1.1): (1) verifikasi kini menyertakan **Security Advisor** resmi Supabase (Dashboard → Advisors → Security, atau `mcp__supabase__get_advisors`) yang otomatis menangkap tabel LUPA di-ENABLE RLS; (2) anti-pattern §4.5 baru — **`service_role` key bocor ke client = bypass TOTAL RLS** (kesalahan #1 stack Supabase).

  **Untuk non-programmer:** menambah "alat pemindai otomatis" untuk keamanan database + peringatan tegas: jangan sampai "kunci master database" nyasar ke browser pengunjung — sekali bocor, semua kunci pintu jadi percuma.

- **Aturan anti-slopsquatting** ditambahkan ke `CLAUDE_universal_v1.md` §8.2 Aturan 1: sebelum menyuruh `install` paket tak-familiar, AI wajib memastikan paket benar ada + ejaan persis di registry resmi. Slopsquatting = AI mengarang nama paket, penyerang mendaftarkan nama-halu itu berisi malware — risiko langsung karena tim membangun DENGAN AI. Always-load bertambah minimal (anggaran token aturan tetap aman).

  **Untuk non-programmer:** kalau AI menyarankan memasang "komponen jadi" yang namanya asing, sekarang AI wajib mengecek dulu komponen itu benar-benar ada + ejaannya tepat — mencegah memasang komponen palsu berisi jebakan.

- **Baseline OWASP dipetakan ulang ke Top 10:2025** di `workflows/stack/4.14-5-owasp.md` (verifikasi ke owasp.org/Top10/2025/): daftar diperbarui + 2 kategori BARU 2025 diberi panduan — **A03 Software Supply Chain Failures** (pin versi/lockfile + SCA + dependency-confusion + slopsquatting + SBOM) dan **A10 Mishandling of Exceptional Conditions** (fail-open: saat error, sistem harus default-deny).

  **Untuk non-programmer:** panduan keamanan sekarang mengikuti standar dunia versi terbaru (2025), termasuk 2 bahaya baru: "bahan baku kode dari pemasok" dan "pintu yang malah terbuka saat alatnya rusak".

### [SECURITY] Gelombang 2 (celah PENTING) — Klaster 1: kelas kerentanan "senyap"

Ditambahkan ke `workflows/stack/4.14-5-owasp.md`: 6 kelas kerentanan yang tak tertangkap scanner biasa dan sebelumnya kosong di kit — **insecure deserialization** (A08), **XXE**, **ReDoS**, **TOCTOU/race bernama**, **open-redirect**, **SSRF-mendalam** (allowlist host + blok metadata cloud). Kelas universal diserap dari `security-reviewer`+`perl-security` ECC (MIT © Affaan Mustafa), sintaksis niche dibuang.

**Untuk non-programmer:** menambah 6 "jenis serangan tersembunyi" yang tak ketahuan alat pindai otomatis, plus cara mencegahnya — melengkapi pertahanan standar profesional.

### [SECURITY] Gelombang 2 — Klaster 2: Auth lanjutan

Ke `workflows/cap/auth.md`: **(1) JWT pitfalls** — verifikasi tanda-tangan + tolak `alg:none` + kunci algoritma (anti key-confusion RS256→HS256) + cek klaim `exp/aud/iss` (kritis untuk Supabase yang berbasis JWT). **(2) 2FA/MFA + passkeys/WebAuthn** — lapis kedua wajib untuk data sensitif; sebelumnya pack ini eksplisit mengaku "2FA belum dibahas".

**Untuk non-programmer:** login sekarang punya panduan "kartu-akses digital anti-palsu" + "kunci kedua" (kode sekali-pakai / sidik jari) untuk akun penting.

### [SECURITY] Gelombang 2 — Klaster 3: Frontend & mass-assignment

Ke `workflows/stack/4.14-5-owasp.md`: **(1) XSS `dangerouslySetInnerHTML`** (sanitasi di call-site + allowlist tag), **(2) prototype pollution** (tolak `__proto__`, `Object.create(null)`, validasi skema), **(3) mass assignment** (allowlist field; Prisma `data` eksplisit — melengkapi DRF §4.14-7 & Laravel §4.14-8 yang sudah ada). Diserap dari `rules/react`+`typescript-reviewer`+`laravel-security` ECC (MIT © Affaan Mustafa).

**Untuk non-programmer:** menambah pencegahan 3 celah umum di sisi tampilan & formulir — menempel "tulisan tamu" dengan aman, mencegah "ubah cetakan pabrik" objek, dan mencegah pelamar menambah kolom "jabatan" sendiri.

### [SECURITY] Gelombang 2 — Klaster 4: Gerbang keamanan otomatis di CI

Ke `workflows/stack/4.14-4-deploy.md` (sub-seksi baru): panduan 6 jenis pemindai keamanan di pipeline dengan label WAJIB/DISARANKAN/OPSIONAL + status "sudah-di-kit vs tambah" — **SCA** (kit: npm audit/govulncheck; +Dependabot/pip-audit), **SAST** (kit: bandit; +semgrep/CodeQL untuk JS/TS), **secret-scan** (kit: secret-guard), **container** (Trivy), **DAST** (OWASP ZAP), **SBOM** (CycloneDX). Robot `lib/stack-check.mjs` tidak diubah (panduan dulu).

**Untuk non-programmer:** panduan memasang "alat pemindai otomatis" di jalur rilis, dengan jelas mana yang wajib vs opsional.

### [SECURITY] Gelombang 2 — Klaster 5: Perlindungan data (UU PDP/DSAR + enkripsi PII)

Template baru `templates/PRIVASI_PDP_NON_LEGAL.md` (non-legal): 6 kewajiban inti UU PDP (UU 27/2022, berlaku penuh Okt 2024), hak subjek data **DSAR** (akses/koreksi/hapus/portabilitas/tarik-consent), dan cara amankan PII (enkripsi kolom at-rest via Supabase Vault/`pgcrypto` + KMS + rotasi kunci + jangan log PII mentah). Didaftarkan di `kit-files.json`; dirujuk dari `cap/kepatuhan-teregulasi.md` + lensa Legal `4.1-tinjauan-divisi.md`; roadmap ditandai selesai.

**Untuk non-programmer:** menambah panduan praktis hukum data pribadi Indonesia — apa yang wajib (izin, hak hapus, lapor kebocoran) + cara menyimpan data sensitif terkunci. Tetap bukan pengganti pengacara.

### [SECURITY] Gelombang 2 — Klaster 6: Denial-of-wallet + GraphQL + subdomain takeover (penutup)

**(1) Denial-of-wallet** & **(2) subdomain takeover** → `workflows/stack/4.14-4-deploy.md`: serangan biaya khas serverless (tagihan meledak walau situs sehat) + pengambilalihan sub-domain terlantar (CNAME dangling → phishing). **(3) GraphQL security** (kondisional) → `workflows/stack/4.14-5-owasp.md`: matikan introspection + batasi depth/batching (kalau pakai `pg_graphql`).

**Untuk non-programmer:** menambah pencegahan "tagihan cloud dijebol", "papan nama toko dipakai orang lain", dan pagar untuk API GraphQL (kalau dipakai).

### [SECURITY] Gelombang 3 (celah RAPIKAN) — pemantapan

- **Header isolasi cross-origin (COOP/CORP/COEP) melengkapi §7.4 `templates/STACK_GUIDE.md`.** Tiga header "pengunci antar-jendela browser" yang masih bolong (header lain — `frame-ancestors`/`Referrer-Policy`/`Permissions-Policy`/HSTS — sudah tertutup sejak Gelombang 1): `Cross-Origin-Opener-Policy: same-origin-allow-popups` (blokir pembajakan antar-tab/tabnabbing TANPA merusak popup login Google/OAuth; nilai terketat `same-origin` diberi catatan kapan pantas) + `Cross-Origin-Resource-Policy: same-site` (aset tak bisa dicomot situs lain; sekalian pertahanan kelas Spectre) masuk blok header bawaan; **COEP** dilabeli OPSIONAL + peringatan keras (`require-corp` memblokir aset pihak-ketiga tanpa CORP/CORS — hanya untuk kebutuhan `SharedArrayBuffer`/isolasi-penuh, alternatif `credentialless`). Nilai diverifikasi ke MDN + OWASP HTTP Headers Cheat Sheet (dicek 2026-07). Bangun-baru, BUKAN serapan — berkas headers ECC (`rules/web/security.md`) pun tak memuat COOP/COEP.

  **Untuk non-programmer:** pagar halaman web dilengkapi 3 "gembok antar-jendela": tab lain tak bisa membajak jendela aplikasi kita, aset kita tak bisa dicomot situs lain, dan gembok paling ketat diberi label "opsional — baca efek sampingnya dulu" supaya tak bikin halaman client tiba-tiba "bolong".

- **Panduan keamanan infra cloud (IAM · WAF · backup/DR)** ditambahkan ke `workflows/stack/4.14-4-deploy.md` — sub-seksi "☁️ Keamanan infra cloud": (1) **IAM/akses akun cloud** — MFA wajib akun admin, akun root bukan untuk kerja harian, token ber-scope sempit + OIDC, tinjau akses berkala; (2) **pin action GitHub ke commit SHA penuh** — tag bisa dipindah penyerang (insiden nyata `tj-actions/changed-files` CVE-2025-30066 Mar 2025, CVSS 8.6, katalog KEV CISA; rekomendasi resmi GitHub); (3) **WAF Cloudflare** sadar-plan (OWASP Core Ruleset = Pro+, Free hanya ruleset dasar) + rate limit + bot protection + SSL/TLS Full strict; (4) **backup/DR** — fakta backup Supabase per-plan (Free TIDAK di-backup otomatis; Pro 7 hr/Team 14/Enterprise 30; PITR add-on ber-syarat), uji-restore kuartalan ("backup tak teruji = belum punya backup"), RPO/RTO sebagai keputusan owner, proteksi-hapus + backup storage. Diserap-suling dari ECC `security-review/cloud-infrastructure-security.md` (MIT © Affaan Mustafa) — contoh AWS/VPC/Terraform dibuang (bukan stack tim); semua fakta layanan diverifikasi ke dok resmi Cloudflare/Supabase/GitHub/NVD (dicek 2026-07). Berkas tetap di bawah anggaran 18.000 char.

  **Untuk non-programmer:** panduan "keamanan gedung" server: kunci ruangan dibagi per-orang seperlunya (bukan semua pegang kunci master), pagar penyaring tamu di depan situs, dan salinan cadangan data yang rutin DICOBA dipulihkan — bukan cuma "katanya ada cadangan". Plus peringatan: paket Supabase gratisan TIDAK punya cadangan otomatis.

- **Path traversal di LUAR upload (per-bahasa)** ditambahkan ke `workflows/stack/4.14-5-owasp.md` daftar kelas "senyap": sebelumnya kit hanya menjaga sisi upload (`cap/upload-storage.md`), padahal celah yang sama menyerang endpoint download/ekspor, penyaji berkas statik, pemilih template, dan ekstraksi arsip (**zip-slip**). Isi: pola benar 3-tingkat (peta ID→path > normalisasi-absolut + cek keluar-folder > jangan cuma tolak string `..`) + resep per-bahasa stack tim — Node/TS (`path.resolve` + cek awalan), Python 3.9+ (`Path.resolve()` + `is_relative_to`), Go (`os.OpenRoot` Go 1.24+ yang tahan symlink / `filepath.IsLocal` Go 1.20+ dengan catatan jujur batasnya), PHP/Laravel (`realpath` + cek awalan / `Storage`). Pemicu per-bahasa diserap dari agen reviewer ECC (MIT © Affaan Mustafa); API mitigasi modern BUKAN dari ECC — diverifikasi ke dokumentasi resmi Python/Go (dicek 2026-07).

  **Untuk non-programmer:** kit dulu cuma menjaga "loket penerimaan paket" (upload); sekarang "loket pengambilan" (download/ekspor) juga dijaga — penipu tak bisa lagi menulis alamat rak palsu "../../ruang-brankas" supaya petugas mengambilkan berkas rahasia.

- **Threat-modeling formal (STRIDE) + pemantauan kejadian keamanan (SIEM-lite)** — dua rumah sesuai peran (bangun-baru, B13; ECC pun tak punya):
  - `templates/THREAT_MODEL_NON_LEGAL.md` (v1 → v1.1): **peta KEDUA** — checklist **STRIDE** (6 modus ancaman aplikasi: menyamar / mengubah / menyangkal / mengintip / melumpuhkan / panjat-hak) untuk menaikkan kelas threat-model 3-baris §8 pada fitur berisiko, lengkap tabel modus→sifat-dilanggar→contoh→penangkal-yang-sudah-di-kit + cara pakai ±10 menit. Definisi diverifikasi ke OWASP Threat Modeling Cheat Sheet (dicek 2026-07). Peta lama (ancaman orang-dalam) tak diubah.
  - `templates/OBSERVABILITY_PRODUKSI.md` (v1 → v1.1): **Pilar 4 — SIEM-lite**: catat kejadian keamanan kunci (login gagal, ganti role, aksi admin, 401/403) + **3-5 alarm anomali** (brute force, aksi admin jam janggal, lonjakan biaya) + retensi/ekspor log sebagai bukti forensik — memakai alat yang SUDAH ada di stack (Supabase Logs Explorer, Cloudflare Security Events, alert Sentry; Vercel Drains = Pro+, semua dicek 2026-07). Jujur berjenjang: SIEM penuh (Elastic/Wazuh/Splunk) = opsional kelas enterprise.
  - `CLAUDE_universal_v1.md` §8: baris threat-model yang sudah ada diperpanjang dengan penunjuk STRIDE (+0 baris baru — anggaran always-load aman, diverifikasi robot).

  **Untuk non-programmer:** dua pelengkap terakhir standar-pro: (1) daftar-periksa "6 modus maling" yang baku untuk tiap fitur berisiko — satpam memeriksa satu per satu, bukan pakai firasat; (2) alarm "toko DIBOBOL" — sistem mencatat siapa mencoba dobrak pintu login dan langsung membunyikan lonceng, bukan baru sadar seminggu kemudian.

### Verifikasi
Item GENTING (5) + Klaster PENTING + item RAPIKAN Gelombang 3 lulus Gerbang Pra-Rilis §4.6: `node tests/preflight.mjs` = GENTING 0 · PENTING 0 · RAPIKAN 0 (1039 tes lulus) tiap langkah. Semua fakta eksternal (dok Next.js CSP, CVE-2025-29927 di NVD, OWASP Top 10:2025) diverifikasi ke sumber resmi saat menulis, bukan dari ingatan (§8.2).

### Diperbaiki — drift teks risk-gate "OPT-IN" (10 titik) + penjaga permanen istilah-pensiun (LP-008)

- **10 titik komentar/teks basi yang masih mengklaim Palang Rem `risk-gate` "OPT-IN / default kit MATI / opsional" diperbaiki** ke fakta benar (default NYALA sejak v1.61.0): `lib/risk-gate.js` (header), `bin/lintasai.js` (komentar registry + teks help), `lib/lang-hook-wiring.mjs`, `lib/install-secret-hook.mjs`, `lib/ensure-preflight-ci.mjs` (analogi basi dihapus), `setup-pola-b.mjs` (kontradiksi internal baris 1013 vs 1029), `docs/architecture.md`, `docs/install-secret-hook.md`, `templates/hooks/risk-gate.settings.example.json` (+ koreksi ringan 2 penyebutan di ADR-008). Kelas-bug "komentar kode basi soal kebijakan default" kini dijaga MESIN: 2 entri istilah-pensiun baru di `lib/consistency-check.mjs` (pola sebaris ber-guard anti-alarm-palsu + pola frasa-unik) + cakupan pindai `ExtraFiles` diperluas ke 8 berkas lib/bin/docs/json; 6 tes pengunci baru; dicatat `docs/BUKU_PELAJARAN.md` LP-008. Urutan = bukti-hidup: penjaga dipasang dulu → terbukti menangkap persis 10 titik → baru diperbaiki → robot BERSIH.

  **Untuk non-programmer:** ada 10 catatan lama yang masih bilang "rem keselamatan mati, nyalakan sendiri" padahal rem itu sudah menyala otomatis sejak lama — AI yang membacanya bisa memberi info keliru ke client. Semua catatan basi dibetulkan, dan sekarang ada robot yang langsung berteriak kalau catatan seperti itu muncul lagi.

### Ditambah — Blok Belajar Junior-Profesi "📚 Belajar dari task ini" (§4.1b) + label profesi dinamis di blok Tinjauan (§4.1)

- **Tiap output substantif AI kini ditutup mini-pelajaran 5 baris:** 👨‍🎓 **Junior-<profesi>** (label dinamis ikut topik — Junior-Backend / Junior-SEO / Junior-Cyber Security / …; topik non-teknis → Junior-<topik bebas> mis. Junior-Media Sosial; maksimal 2 label) · 🙂 **Arti awam** · 💡 **Kenapa penting** · ⚠️ **Jebakan umum** · 🚀 **Jalan ke senior** (1 langkah konkret yang bisa langsung dikerjakan). Balasan super pendek dilewati; alur berpemandu §4.7 → blok cukup sekali di rekap penutup.
- **Blok 🎯 Tinjauan lintasAI Divisi ganti label dinamis:** tiap divisi kini 👨‍🎓 **Junior-<profesi>** + 🙂 **Non-<profesi>** (mis. Junior-Backend + Non-Backend) menggantikan label statis "Junior-programmer + Non-Programmer" — kapan-tampilnya TIDAK berubah (tetap hanya saat ada temuan nyata; "nol temuan itu sah"). Label lama dijaga mesin lewat istilah-pensiun baru `label-tinjauan-junior-programmer`.
- **Pagar fakta dipertegas:** isi blok tunduk anti-halusinasi §8.2 — baris ⚠️/🚀 wajib dari pengetahuan mapan/pekerjaan nyata; AI ragu → wajib jujur bilang belum yakin, DILARANG mengarang demi mengisi blok.
- Sekalian dibetulkan: drift lama di `POST_SETUP_CHECKLIST_PROMPT_v1.md` ("PRE-SEND 4 kategori" padahal aturan induk 5 kategori — kategori popup hilang).

  **Untuk non-programmer:** tiap jawaban AI yang berisi sekarang diakhiri "pelajaran kecil" 5 baris — arti awamnya, kenapa penting, jebakan yang sering menjerat pemula, dan satu langkah nyata untuk naik kelas — dengan label profesi sesuai topik (mis. Junior-Backend). Tujuannya kamu naik tangga pelan-pelan: non-programmer → junior → senior. Kalau AI tidak yakin soal suatu fakta, dia wajib bilang jujur, bukan mengarang.

  **Untuk programmer:** mandat ringkas `CLAUDE_universal_v1.md` §4.1b + detail on-demand `workflows/4.1b-blok-belajar.md` (terdaftar INDEX + `lib/kit-files.json`); PRE-SEND Kategori #3 diperluas + Kategori #4 relabel dinamis; pengingat per-prompt blok ke-3 di `lib/lang-reminder.mjs` (+236 char ≈ ~59 token/prompt, diukur nyata); label = penalaran Claude, BUKAN router kata-kunci (ADR-009/ADR-012); dikunci `tests/blok-belajar-rule.test.mjs` + `tests/lang-reminder.test.mjs` + istilah-pensiun `lib/consistency-check.mjs` + LP-007 `tests/package-bundle.test.mjs` (ADR-012 repo-dev only). Biaya blok output (±200 token/jawaban substantif) = pilihan sadar owner, tercatat di ADR-012.

## [2.5.0] - 2026-07-12

### Diperbaiki — paket klien lebih bersih: dokumen pengembangan internal tak lagi ikut terpasang

Beberapa dokumen "dapur pengembangan kit" tanpa sengaja ikut terkirim ke paket klien: folder `docs/arsip/`
(4 berkas audit + perbandingan internal, memuat nama kit pihak ketiga) — regresi commit `76b6008` yang
memindahkannya dari akar (tak terkirim) ke `docs/` (folder yang di-whitelist = terkirim) — plus 3 ADR
keputusan internal baru (009/010/011).

**Untuk non-programmer:** saat update ke 2.5.0, klien tak lagi menerima berkas catatan-internal kit yang
tak mereka perlukan (lebih ramping + tak ada nama proyek pihak ketiga yang nyasar). Fitur yang klien pakai
tetap utuh. Tak ada yang perlu diubah di project klien.

**Untuk programmer:**
- `package.json` `files[]` + `.npmignore` + `shouldCopyKitEntry` (`setup-pola-b.mjs`): kecualikan
  `docs/arsip/**` + ADR-009/010/011 (pertahanan-berlapis: jalur npm + salin dev-direct).
- `docs/project-map.md` (dok pendamping fitur klien, sah) diresmikan ke `lib/kit-files.json` grup `docs`
  agar terlacak robot (dulu terkirim "diam-diam" via folder).
- Penjaga permanen: 2 tes regresi di `tests/package-bundle.test.mjs` (`npm pack` WAJIB 0 berkas `docs/arsip/`
  + 0 ADR internal dinegasi) → kelas-bug "dokumen dev bocor ke klien" jadi tes yang menangkap otomatis
  (Buku Pelajaran LP-007). `docs/serap-skill/**` sudah aman sejak sebelumnya (terverifikasi 0 berkas di tarball).

### Dihapus — Aturan dokumentasi always-on §7.1 AUTO-SYNC + §7.2 LAZY-GENERATE (+ §7.2b) → docs jadi on-demand

Menghapus beban token per-edit: dulu AI wajib baca-ulang + perbarui `.md` pendamping tiap menyentuh kode (§7.1) dan mengecek 6 kategori file penting tiap buat file (§7.2). Ongkosnya perilaku per-tugas, bukan ukuran teks. §7.3 READ-MINIMAL **tetap**. Keputusan owner.

**Untuk non-programmer:** AI berhenti "mengasuh" catatan `.md` otomatis tiap kali menyentuh kode (itu memakan waktu/token tiap tugas). Catatan tetap dibuat/diperbarui, tapi **saat memang perlu** (on-demand). Dokumen yang sudah ada tetap valid — tak ada yang perlu diubah di project client.

**Untuk programmer:**
- `CLAUDE_universal_v1.md` §7: header + ringkasan "3 aturan" diringkas jadi 1 (hanya READ-MINIMAL); subseksi §7.1/§7.2/§7.2b dihapus; definisi "file CRITICAL" di-inline ke §7.7; sinkron `modules` §7.9 **dipertahankan** (perilaku beda, hanya label §7.1 dibuang); checkbox DoD §4 + larangan §12 + klausa Mode Hemat §15 disesuaikan.
- 2 berkas rak dicabut serempak (file + `lib/kit-files.json` + `workflows/INDEX.md`): berkas seksi **7.2** (lazy-generate-glob) & **7.2b** (folder-grouping).
- ~20 tautan-mati dibersihkan di `JALANKAN_KIT.md`, `PROJECT_LIFECYCLE_PROMPT_v1.md`, `templates/_PATTERNS.md`, PR-template, glossary, DB-scan-prompt, dll. Grep "§7.1/§7.2/AUTO-SYNC/LAZY-GENERATE" = **nol** di luar arsip. Preflight **0/0/0 (1025 tes)**.

### Ditambah — Robot `npx lintasai project-map` (peta aktivitas git on-demand) → umpan draf roadmap human-gated

Pengganti positif §7.1/§7.2: robot **deterministik, cuma-baca, on-demand** yang membaca `git log` cabang lalu memuntahkan **fakta** (commit per-modul/per-tipe Conventional Commit, jendela tag/waktu, modul tak-tersentuh) untuk membantu AI menyusun draf roadmap/denah yang **tetap disetujui manusia**. Anggaran token berkas aturan justru **turun** (~17.845, always-load +0 untuk robot on-demand). Patuh ADR-001 (fakta bukan tebakan graf, tak klaim lengkap) & ADR-009 (perlengkapan, bukan pengganti otak).

**Untuk non-programmer:** kalau staff minta "bikin roadmap / apa progres project / denah", AI kini punya alat cepat yang merangkum "bagian mana yang banyak/sedikit disentuh belakangan" dari riwayat perubahan — lalu menyusun draf yang **kamu setujui dulu** sebelum ditulis. Alat ini cuma membaca, tak mengubah apa pun.

**Untuk programmer:**
- `lib/project-map.mjs` (fungsi murni `parseGitLog`/`parseConventionalSubject`/`mapFileToModule`/`groupCommits`/renderer + orkestrator git baca-saja; exit 1 gagal-nyaring kalau bukan repo git / ref tak ada). Modul dipetakan dari `project.lintas.jsonc` bila ada, else folder tingkat-atas.
- Registrasi `bin/lintasai.js` (`COMMANDS_NODE` + `shouldPassProjectRoot` + help) + `lib/kit-files.json` (`node_lib` + `workflows`). Tes fixture `tests/project-map.test.mjs` (10 tes, tanpa git nyata).
- Dokumen `docs/project-map.md` (pendamping) + alur human-gated `workflows/7.11-peta-project.md` (+ baris `workflows/INDEX.md` + stub §7.11 di `CLAUDE_universal_v1.md`). Keputusan + rekonsiliasi ADR-001 = `docs/decisions/ADR-011` (repo-dev).
- **Versi TIDAK dinaikkan** — dicatat di sini sampai owner atur rilis (perubahan backward-compatible → rekomendasi naik MENENGAH).

### Ditambah — Kebijakan izin industri teregulasi yang SAH (judi/gaming sebagai contoh utama)

Menegaskan bahwa membangun software untuk **industri teregulasi yang legal di yurisdiksi tujuan** (judi/gaming untuk negara yang melegalkan, fintech berizin) = **diizinkan**. Ini **bukan** menghapus larangan: kit tak pernah punya larangan judi — penolakan yang dilaporkan client (~v1.61.0) berasal dari perilaku bawaan Claude, bukan aturan kit. Keputusan owner (via popup): cakupan payung "industri teregulasi", rambu kepatuhan = **saran kuat (bukan gerbang)**, batas keras "jangan bantu melanggar hukum" tetap. Keputusan penuh = `docs/decisions/ADR-010`.

**Untuk non-programmer:** kalau client di negara yang melegalkan judi minta bikin situs/app judi, AI kini membantunya (bukan menolak) + memandu rambu penting: batasi wilayah layanan (blokir Indonesia & negara terlarang), cek umur pemain, judi bertanggung jawab, pantau transaksi. Kit tetap jujur: "ini **bukan** nasihat hukum — lisensi & tinjauan legal wajib". Penegasan tambahan: **bahasa tidak menentukan legalitas** — developer Indonesia yang ngoding pakai Bahasa Indonesia & bikin UI berbahasa Indonesia dulu (lalu diterjemahkan ke bahasa pasar tujuan) tetap dibantu penuh; yang menentukan legal/tidak = negara yang dilayani, bukan bahasanya.

**Untuk programmer:**
- `CLAUDE_universal_v1.md` §8.1 #9 — klausa carve-out "industri teregulasi yang SAH = boleh dibangun, jangan ditolak/dimoralisasi" + batas keras + pointer pack (always-load naik tipis, tetap di bawah anggaran token; tak melemahkan §8.1 #8/#10).
- `CLAUDE_universal_v1.md` §4.17 — "industri teregulasi (judi/lisensi/fintech)" ditambah ke daftar pemicu risiko.
- Pack baru `workflows/cap/kepatuhan-teregulasi.md` (6-bagian, tiru `moderasi-konten.md`): izin+batas eksplisit, geo-block server-side, umur/KYC, judi bertanggung jawab, AML+audit-trail, integritas RNG; reuse-first (pembayaran/OWASP/analytics/upload-storage/moderasi/auth). Katalog jadi **15 pack**.
- Domain 🎰 baru di `templates/CHECKLIST_KEBUTUHAN_DOMAIN.md` (pemantik pertanyaan yurisdiksi/lisensi/KYC/geo-block/AML).
- **Penegasan "bahasa ≠ penanda yurisdiksi":** frasa di §8.1 #9 + butir "🌐 Bahasa prompt/UI ≠ penanda yurisdiksi" di pack + rujuk-silang ke `workflows/cap/i18n.md` (bangun 1 bahasa dulu lalu terjemahkan) + bullet "Bahasa & pasar" di checklist domain. Prompt/UI Bahasa Indonesia (memang wajib §2.1) lalu diterjemahkan = sah; TIDAK menganulir batas keras (b) (bahasa dev ≠ pemain yang dilayani).
- Wiring: `lib/kit-files.json` + `workflows/INDEX.md` + `workflows/cap-packs.md`. ADR-010 = repo-dev. **Versi TIDAK dinaikkan** — dicatat di sini sampai owner atur rilis (fitur backward-compatible → nanti naik MENENGAH).

### Ditambah — Gelombang 2b: 5 Capability Pack (ekspor-laporan · push-notification · moderasi-konten · pencarian · feature-flag)

Melanjutkan arsitektur "Perkuat, Jangan Kurung" (Gelombang 1 + 2). Lingkup dikunci owner via popup = **5 pack** (dari 7 kandidat peta-jalan); audit-trail & pemrosesan-media sengaja **tidak** dibangun jadi pack terpisah (tumpang-tindih Gelombang-3 DB / `cap/upload-storage.md` → cukup dirujuk, hindari mendahului Gelombang-3). Katalog kini **14 pack**. Semua **on-demand** — anggaran token berkas aturan tetap **~17.841 (always-load +0)**. Lolos preflight strict **0/0/0 (1015 tes)** + tinjauan adversarial 7-pemeriksa mode-aman cuma-baca.

**Untuk non-programmer:** staff kini bisa minta 5 kemampuan umum lagi dengan bahasa sehari-hari ("ekspor data/cetak PDF/laporan bulanan", "push notification", "moderasi/saring komentar", "fitur pencarian", "kill switch/A-B test") → AI merakit versi kelas-industri yang aman tanpa staff perlu tahu istilahnya.

**5 pack baru** (struktur tiru `cap/auth.md`: Kontrak · Langkah rakit · Gotcha · Rujuk-silang reuse-first · Threat-model 3-baris · Batas jujur + cek-versi):
- `cap/ekspor-laporan.md` — otorisasi ekspor per-baris (anti-IDOR massal) + anti **CSV-injection** + ekspor besar via latar/streaming (anti-OOM) + rate-limit/kuota per-user + PDF-dari-HTML sanitasi (anti XSS/SSRF) + link kadaluarsa + retensi. Rujuk background-job/upload-storage/email/i18n.
- `cap/push-notification.md` — izin di momen-tepat + Web Push/VAPID (+ caveat iOS-PWA) / FCM/APNs + kirim-latar idempoten + bersihkan token mati + preferensi/berhenti + push=best-effort (bukan kanal OTP). Rujuk realtime/email/analytics.
- `cap/moderasi-konten.md` — dua-lapis (saring otomatis + tinjauan manusia) + jalur hukum CSAM (blokir+lapor, jangan hapus-sepihak) + banding + anti-brigading + lindungi moderator/pelapor. Rujuk background-job/upload-storage/ai-rag-aman.
- `cap/pencarian.md` — full-text (`tsvector`+GIN) / faset + saring-izin server-side + kunci tenant + paginasi kursor + debounce autocomplete; **semantik/vektor sengaja dirujuk ke peta-jalan Gelombang-3**, tak disalin.
- `cap/feature-flag.md` — pack **tipis**: kontrak + default-MATI (fail-safe) + rollout hash-deterministik + flag publik-vs-server-only; **inti mekanik menunjuk** `templates/feature-flags-advanced.md` (reuse-first, tak menyalin).

**Wiring:** 5 entri `lib/kit-files.json` + 5 baris `workflows/INDEX.md` (pemicu "Kapan dibaca") + tabel `workflows/cap-packs.md` (14 pack, catatan jujur "menutup kapabilitas umum, bukan seluruh kemungkinan" + audit-trail/media dirujuk ke Gelombang-3).

**Tinjauan adversarial (7 pemeriksa paralel cuma-baca) — 0 GENTING · 3 PENTING · 9 RAPIKAN, SEMUA dibenahi:**
- **PENTING (moderasi CSAM) — ditandai 2 lensa independen (keamanan + anti-halusinasi):** frasa "JANGAN menyimpan/meneruskan" menggabungkan "jangan sebar" (benar) dengan "jangan simpan" (bisa **terbalik** — sebagian yurisdiksi mewajibkan **mengamankan bukti**, menghapus = memusnahkan barang bukti). Diperjelas: pisahkan jangan-sebar dari kewajiban-simpan + tegaskan jangan-hapus-sepihak + konsultasi hukum wajib.
- **PENTING (push Web Push iOS):** ditambah caveat "di iOS hanya jalan sebagai PWA, bukan tab Safari" di langkah + Batas jujur (segmen iPhone-browser praktis tak tercakup → fallback email/in-app).
- **PENTING (ekspor DoS):** threat-model sebut DoS tapi mitigasi kurang rate-limit → ditambah batas laju/kuota/konkurensi ekspor per-user (konsisten dengan pack pencarian/push).
- **9 RAPIKAN:** gloss jargon non-programmer (tsvector/GIN, XSS, IDOR, DoS, OFFSET/kursor — §2.1 Tingkat-1) + debounce autocomplete + 2 rujuk-silang antar-keluarga (moderasi→notifikasi, push→analytics) + pointer "Gelombang-3" diarahkan ke rumah rencana (`docs/plans/...roadmap.md`) agar tak menyesatkan.
- **Bersih terverifikasi:** lensa konsistensi-struktur **0 temuan** (6 bagian + penanda baris-1 lengkap di 5 pack); lensa crossref mengonfirmasi **reuse-first tanpa penyalinan** (feature-flag & pencarian benar merujuk, bukan menyalin) + semua rujukan keras ADA; klaim faktual (VAPID/FCM/APNs, tsvector+GIN, 404/410 token mati, karakter CSV-injection, sha256) diverifikasi benar + hedging versi kuat. Preflight ulang pasca-perbaikan tetap **0/0/0**.

### Ditambah — Gelombang 2: 6 Capability Pack sisa (upload · realtime · email · background-job · i18n · analytics)

Melanjutkan arsitektur "Perkuat, Jangan Kurung" (Gelombang 1): 6 Capability Pack terakhir di folder `workflows/cap/` — katalog kini **9 pack** (Auth · Pembayaran · AI-RAG + 6 baru). Semua **on-demand** (anggaran token berkas aturan tetap ~17.841 — always-load **+0**). Lolos preflight strict **0/0/0 (1015 tes)** + tinjauan adversarial 7-pemeriksa mode-aman cuma-baca.

**Untuk non-programmer:** staff kini bisa minta 6 kemampuan umum lagi dengan bahasa sehari-hari ("upload foto", "chat langsung", "kirim email/OTP", "proses di latar", "banyak bahasa", "lacak kunjungan") → AI merakit versi kelas-industri yang aman tanpa staff perlu tahu istilahnya.

**6 pack baru** (struktur tiru `cap/auth.md`: Kontrak · Langkah rakit · Gotcha · Rujuk-silang reuse-first · Threat-model 3-baris · Batas jujur + cek-versi):
- `cap/upload-storage.md` — unggah langsung ke storage (pre-signed URL) + 5-pagar keamanan (rujuk OWASP `4.14-5`) + nama-key acak server-side (anti path-traversal) + retensi/lifecycle.
- `cap/realtime.md` — SSE/WebSocket/Supabase Realtime + otorisasi per-kanal server-side + reconnect/resync + pagar **CSWSH** (anti pembajakan handshake lintas-situs).
- `cap/email-notifikasi.md` — deliverability SPF/DKIM/DMARC + kirim-latar idempoten + OTP aman (hash/expiry/batas-percobaan/sekali-pakai) + anti-abuse + kelola bounce.
- `cap/background-job.md` — antrean persisten (bukan di memori) + idempoten + retry/backoff + DLQ + lease/visibility-timeout + kunci cron (rujuk `SKIP LOCKED` di `4.14-2`).
- `cap/i18n.md` — pisah teks-kode + plural ICU + format `Intl` (UTC-simpan/lokal-tampil) + RTL properti-logis + `hreflang`.
- `cap/analytics.md` — 3 aksi inti + consent/UU PDP + tanpa-PII-ke-pihak-ketiga + event kritis diukur server-side (anti adblock).

**Wiring:** 6 entri `lib/kit-files.json` + 6 baris `workflows/INDEX.md` (pemicu "Kapan dibaca") + tabel `workflows/cap-packs.md` (9 pack "✅ tersedia" + catatan jujur "menutup kapabilitas umum, bukan seluruh kemungkinan").

**Tinjauan adversarial (7 pemeriksa paralel cuma-baca) menemukan + membenahi:** 1 **PENTING keamanan** (celah CSWSH di `realtime` — WebSocket-DIY cookie-auth butuh validasi `Origin`/token) + 4× rujukan peta-jalan menggantung dirapikan (`templates/PRIVASI_PDP_NON_LEGAL` tanpa `.md`) + 1 label "peta-jalan" basi di `pembayaran.md` (background-job kini live) + 3 gloss jargon (backpressure/transient/rate-limit). Jujur: 2 dari 7 pemeriksa mengembalikan output degradasi → dua pack itu (`email`, `analytics`) ditinjau-ulang manual. **0 GENTING.** Rujukan roadmap ke berkas Gelombang-3 yang belum ada dibetulkan ke bentuk peta-jalan (pulihkan preflight 0/0/0).

### Ditambah — Arsitektur "Perkuat, Jangan Kurung" + fondasi Aplikasi-Utuh + 3 Capability Pack (Gelombang 1)

Menjawab sasaran owner: **non-programmer cukup prompt natural → aplikasi kelas-industri, tanpa mengekang otak Claude, hemat token + cepat**. Lolos audit adversarial 2-pemeriksa (klaim terverifikasi `berkas:baris`) + preflight strict **0/0/0 (1015 tes)**. **Always-load +~1.000 char saja** (anggaran token ~17.841/32.000 — semua kedalaman on-demand, nol beban per-pesan/hook).

**Untuk non-programmer:** kit dikunci jadi *"Claude = otak, lintasAI = perlengkapan, robot = fakta"* — kit membekali & memverifikasi, tak menggantikan penalaran Claude. Ditambah: AI kini memecah "bikin aplikasi utuh" jadi tahapan yang bisa dipakai + menanyakan kebutuhan yang sering terlupa, dan punya "resep siap-rakit" untuk login/pembayaran/chatbot-AI.

**Fondasi (Gelombang 1):**
- `docs/decisions/ADR-009` (doktrin arsitektur, maintainer-facing) + **1-baris pointer §4.17**; tugas sepele tanpa upacara (pas-ukuran + bisa dilewati).
- Pointer **§4.16** (urutan-bangun) di §4.13 — sebelumnya doktrin ini tak dirujuk sama sekali di always-load (`grep 4.16`=0). + §3 diperkuat: task non-sepele tampilkan **konfirmasi-lingkup terlihat** sebelum koding (reuse ritual §4.2/Prompt-1, bukan ritual baru).
- **`workflows/4.2c-aplikasi-utuh.md`** (baru): pola Aplikasi-Utuh (konfirmasi-lingkup → Peta Aplikasi irisan-vertikal ber-tag aspek → pancing kebutuhan per-domain) + **Prompt 23** di `PROMPT_LIBRARY.md` + **`templates/CHECKLIST_KEBUTUHAN_DOMAIN.md`** (baru; pemantik pertanyaan, bukan jaminan lengkap).

**Capability Packs (baru — folder `workflows/cap/`, on-demand):** `cap-packs.md` (induk + cara self-routing soft lewat INDEX, BUKAN router kata-kunci) + `cap/auth.md` (login/sesi/RBAC; rujuk-silang OWASP, jangan salin) + `cap/pembayaran.md` (idempotency-key + webhook idempoten & verif-tanda-tangan → **tutup 1 kondisi GENTING-rilis §4.6**) + `cap/ai-rag-aman.md` (mengamankan fitur AI **buatan client** — gap: §8.1 hanya lindungi asisten; menutup input-LLM-tak-tepercaya, authz retrieval anti-bocor-lintas-tenant, batas biaya, PII, jujur "tak ada filter sempurna"). Sisa pack (upload/realtime/email/dll) + pendalaman per-aspek = peta-jalan bertahap.

### Diperbaiki — tinjauan pra-rilis BABAK 2 (permintaan owner "cek 1x lagi") + serap 1 skill poles UI

Tinjauan ulang menyeluruh serapan ECC belum-commit dengan **13 pemeriksa paralel mode-aman cuma-baca** (verify per-klaster + cek-ulang versi ke web + pindai 278 skill ECC vs profil tim) + robot deterministik. **0 GENTING.** Semua klaim versi TIME-BOXED **diuji-ulang independen ke web → TERBUKTI benar** (Node 20 EOL 30 Apr 2026, Node 24 Active LTS default Vercel, GitHub Actions checkout@v7/setup-node@v6/upload-artifact@v7/build-push@v7, zod v4 `z.url()`, Tailwind `h-dvh` v3.4, dvh/svh/lvh baseline, WCAG 1.4.4/1.4.10). Preflight strict 0/0/0 (1015 tes).

**Untuk non-programmer:** dicek ulang "kalau staff menyalin contoh apa adanya, benar jalan?" — ketemu 3 hal yang bisa bikin gagal/salah di sisi client → sudah dibenahi. Sekalian ditambah 1 "mode poles" agar UI buatan AI terasa lebih rapi.

**PENTING (3) — dibenahi:**
- `workflows/stack/4.14-4-deploy.md` §health: (a) jalur health disamakan `/health` → **`/api/health`** di prosa + bagian Kubernetes (kode Next.js App Router `app/api/health/route.ts` ter-map ke `/api/health`; salah alamat = 404 di uptime monitor / probe K8s); (b) tambah baris `import { db } from "@/lib/db"` di blok `health/detailed` (tanpa itu build gagal `Cannot find name 'db'`); sekalian probe K8s diperjelas (liveness/startup → `/api/health`, readiness boleh → `/api/health/detailed`).
- `package.json`: **`docs/serap-skill/**` dikecualikan dari paket npm** — tadinya bocor ikut ke client (3 berkas dapur repo-dev) padahal 2 template yang terkirim (`SKILL_KONTEN_ANTISLOP.md`, `UJI_KEPATUHAN_ATURAN.md`) menyebutnya "tak ikut terpasang di client"; asimetri dengan `docs/plans/**` yang sudah dikecualikan. Dibuktikan `npm pack` (tarball 220 → 217 berkas).

### Ditambah — serap ECC `make-interfaces-feel-better` (poles design-engineering UI; di luar 44-kandidat)

Serapan skill ECC **`make-interfaces-feel-better`** (origin komunitas, via pustaka ECC v2.0.0 — **ditulis-ulang** non-programmer + dinetralkan, bukan salinan). Ditemukan lewat pindai kelengkapan 278 skill (gap frontend/webdesign, 0 padanan di kit). Owner setujui SERAP via popup. **Always-load +0 baris** (semua on-demand). 4 resep poles inti → `workflows/stack/4.14-1b-frontend-lanjutan.md` (14.960 → **17.587 char-JS < 18.000**, tak perlu pecah): `font-variant-numeric: tabular-nums` (angka harga/saldo tak geser saat berubah), concentric radius (radius luar = dalam + padding), `text-wrap: balance`/`pretty`, larangan `transition: all`/`will-change: all` (jank HP murah). Sadar-versi ditulis "cek target terpasang" (Baseline modern). Preflight strict 0/0/0.

### Diperbaiki — tinjauan pra-rilis serapan ECC: 11 perbaikan template (0 GENTING · 6 PENTING · 5 RAPIKAN)

Sebelum serapan ECC di window ini dibagikan ke client, dicek ulang menyeluruh (robot deterministik + 5 pemeriksa adversarial mode-aman cuma-baca + verifikasi klaim versi ke web). **0 GENTING** (tak ada bahaya-fatal / bocor-rahasia / data-hilang); temuan terpusat di contoh Dockerfile yang disalin mentah client. Semua dibenahi; preflight strict 0/0/0 (1015 tes). Klaim "sadar-versi" (Node 24 LTS / Node 20 EOL, GitHub Actions v6/v7, zod v4 `z.url()`, timeout Supabase 8s/3s, kebijakan Google) **diuji-ulang independen ke web → TERBUKTI benar** → dibiarkan; rekomendasi Node 24 terverifikasi didukung Vercel (default).

**Untuk non-programmer:** contoh resep baru dicek "kalau disalin apa adanya, benar-benar jalan?" — ketemu beberapa yang bisa bikin gagal/bingung di sisi client (bukan bahaya-fatal) → sudah diperbaiki semua.

**PENTING (6) — bisa merugikan client kalau disalin persis:**
- `templates/STACK_MIGRATION_GUIDE.md` §2.3 (4 perbaikan): (a) `HEALTHCHECK` Next.js `wget --no-verbose --tries=1` → `wget -q --spider` — `node:24-alpine` cuma punya wget versi mini (BusyBox) yang tak kenal flag lama → container salah-ditandai "sakit" (unhealthy) walau app sehat; (b) contoh `CMD` FastAPI dipisah dari Django (`gunicorn config.wsgi` cuma benar untuk Django; FastAPI = jenis "ASGI" → butuh worker uvicorn) — blok tadinya berlabel "FastAPI/Django" tapi cuma jalan untuk Django; (c) tambah `ENV HOSTNAME="0.0.0.0"` + `PORT` di runner (sebagian versi Next dengar cuma "dalam container" → tak terjangkau dari luar); (d) catatan data-upload pakai `volumes:` (named volume), JANGAN `tmpfs` (RAM, hilang tiap restart).
- `package.json`: `ADR-008` dikecualikan dari paket npm — tadinya bocor ikut ke paket, padahal `README` (yang ikut terkirim) berkata "cuma ada di GitHub" (drift "satu berkas lupa disetel", §4.6). Dibuktikan `npm pack`.
- `templates/github/workflows/app-cicd.yml.example`: peringatan prasyarat script `lint`/`typecheck`/`test` (project Next.js baru belum punya `typecheck`/`test` → CI merah "Missing script" yang membingungkan).

**RAPIKAN (5):** komentar cache `setup-node@v6` diperjelas; rujukan "§health" yang menggantung dibetulkan; caveat keamanan `/health/detailed` (jangan bocor `version` app ke publik, §8); glosari "load balancer"; penanda "berkas repo-dev" pada footnote 2 template (`SKILL_KONTEN_ANTISLOP.md`, `UJI_KEPATUHAN_ATURAN.md`).

Belum menaikkan versi paket — keputusan rilis owner.

### Ditambah — serapan resep ECC Gelombang 1 (23 Quick Win + 5 delta coding-standards)

Onderdil **MIT © Affaan Mustafa** (pustaka skill ECC v2.0.0) — **ditulis-ulang** Bahasa Indonesia non-programmer (bukan disalin) + dinetralkan untuk project apa pun. Fokus stack tim: Next.js + Supabase + Python + Vercel/Railway/Render. Semua masuk berkas **on-demand per-stack** (nyala saat stack terdeteksi); always-load hanya **+3 baris** di §5. Preflight strict **GENTING 0 · PENTING 0 · RAPIKAN 0**, 1015 tes lulus.

**Untuk non-programmer:** kit jadi lebih pintar soal database, backend, keamanan, dan tampilan-ramah-difabel — tanpa membebani aturan yang dibaca AI tiap sesi (nyaris tak nambah). AI kini otomatis mengingatkan jebakan-jebakan yang sering bikin bug diam-diam (data dobel karena dua-klik, halaman goyang, kolom rahasia bocor, dll).

**Untuk programmer — penempatan per-berkas (sumber ECC dalam kurung):**
- `workflows/stack/4.14-2-supabase-prisma.md`: strategi ID Prisma (cuid/uuid/autoincrement), RLS `(SELECT auth.uid())` initPlan, `.select` kolom vs `*`, `CREATE INDEX CONCURRENTLY` + jalur Prisma `--create-only`, paginasi cursor/keyset anti-goyang, `FOR UPDATE SKIP LOCKED`. (`prisma-patterns`, `postgres-patterns`, `database-migrations`, `api-design`, `backend-patterns`, `coding-standards`)
- `templates/STACK_GUIDE.md`: **§5 Database baru** (urutan composite index + partial + covering, 3 query audit + `REVOKE`, tipe data Postgres); caveat `proxy.ts` Next 16 di §3.4. (`postgres-patterns`, `database-migrations`, `nextjs-turbopack`)
- `workflows/stack/4.14-7-python.md`: cek-unik anti-balapan (`IntegrityError`), `raise ... from e`, anti-blokir event loop, Pydantic v2, DRF `fields='__all__'` bocor. (`fastapi-patterns`, `python-patterns`, `django-reviewer`)
- `workflows/stack/4.14-5-owasp.md`: CORS `*`+credentials, token scoped + 401 vs 403. (`fastapi-reviewer`, `laravel-security`, `fastapi-patterns`)
- `workflows/stack/4.14-1-nextjs.md`: `key={index}`, `import "server-only"`, `proxy.ts` sadar-versi (**diverifikasi ke dok resmi Next.js 16**), WCAG 2.2 item 9-12 (focus ring/reflow/redundant-entry/kontras-non-teks 3:1), anti-pola a11y, catatan immutability React. (`react-patterns`, `nextjs-turbopack`, `accessibility`, `a11y-architect`, `coding-standards`)
- `workflows/4.15-pola-bantu.md`: tes regresi dinamai-per-bug + pola AAA. (`ai-regression-testing`, `coding-standards`)
- `workflows/4.6-6.3-doktrin-efisiensi.md`: Sample-and-Expand (ambang baca 70%/15/3) + "kontrak = pemanggil". (`spec-miner`)
- `workflows/4.16-build-sequence.md`: irisan vertikal tipis (fase mergeable mandiri). (`planner`)
- `workflows/13-glossary.md`: entri exception chaining.
- `CLAUDE_universal_v1.md` §5 (**always-load, +3 baris**): immutability, async paralel (`Promise.all`), penamaan KISS/DRY/YAGNI.

Sumber & vetting: `docs/plans/ECC_BORROW_LIST.md` (Gelombang 1 ditandai DIEKSEKUSI). 🟡 Bertahap (#24-42) + 🔴 Strategi Besar (#43-45) menyusul sesi terpisah. Belum menaikkan versi paket — keputusan rilis owner.

### Ditambah — serapan ECC Gelombang 2 Grup A (14 resep Bertahap 🟡)

Lanjutan serapan MIT © Affaan Mustafa (ditulis-ulang non-programmer). Owner memilih: Grup A (14 bersih) sekarang; Grup B berat ditunda; **#40 (skor visual 0-10) & #41 (council di §4.1) DITOLAK** (bertentangan dengan anti-skor-biner §8.2 3b + perampingan §4.1). Always-load hanya **+1 baris** (§4.6 daftar GENTING-rilis). Preflight strict 0/0/0.
- **Berkas baru `workflows/stack/4.14-1b-frontend-lanjutan.md`** (induk 4.14-1 penuh → dipecah §4.18): tes komponen React (RTL/MSW/`renderHook` gotcha), race `useEffect` + AbortController, Motion/Framer anti-CLS. (`react-testing`, `rules/react/hooks`, `motion-ui`) + entri INDEX + pointer di `4.14-stack-packs.md`.
- `workflows/stack/4.14-7-python.md`: setelan produksi Django (SSL/HSTS/cookie/Argon2), jebakan ORM (`bulk_create`/`save()` hilang-data), tabel error migrasi (fake-jangan-hapus), tes cepat `factory_boy`. (`django-security`, `django-reviewer`, `django-build-resolver`, `django-tdd`, `python-testing`)
- `workflows/stack/4.14-5-owasp.md`: file upload aman (magic-bytes + signed URL), auth kuat (breach-check HIBP + regenerasi sesi + blokir email sekali-pakai). (`django-security`, `laravel-security`)
- `workflows/4.15-pola-bantu.md`: paritas sandbox↔produksi (Pola B), menulis tes Playwright stabil (Pola D). (`ai-regression-testing`, `e2e-testing`)
- `templates/OPERASI_DATABASE_AMAN.md`: backfill ter-batch DO-loop (mengulang-sendiri, `FOR UPDATE SKIP LOCKED`). (`database-migrations`)
- `AUDIT_POST_SETUP_PROMPT_v1.md`: dimensi meta 🧮 Anggaran Konteks/Token (deterministik). (`context-budget`)
- `CLAUDE_universal_v1.md` §4.6 + `workflows/4.6-6.3-doktrin-efisiensi.md`: 6 kondisi GENTING penghenti-rilis (daftar, **tanpa** skor biner). (`production-audit`)

**Grup B (berat):** ✅ DISERAP 2026-07-11 — lihat bagian "serapan ECC Gelombang 2 Grup B" di bawah.
**Ditolak:** #40 audit visual skor 0-10, #41 council di §4.1 — alasan di `docs/plans/ECC_BORROW_LIST.md`.

### Ditambah — serapan ECC Gelombang 2 Grup B (3 resep berat 🟡: CI/CD, env+health, Dockerfile)

Lanjutan serapan MIT © Affaan Mustafa (ditulis-ulang non-programmer). Grup B butuh berkas/template baru. **Sadar-versi ditegakkan** (§8.2 Aturan 1): angka versi di sumber ECC diverifikasi ke dok resmi — ternyata banyak sudah drift, jadi template pakai versi **terbaru terverifikasi** + komentar tanggal, bukan angka ECC lama. Owner setujui via popup: terapkan semua + versi terbaru + benahi Node EOL. Preflight strict 0/0/0.

**Untuk non-programmer:** kit sekarang punya (1) contoh "ban berjalan otomatis" (pipeline) yang menguji + menayangkan kode; (2) cara app menolak jalan kalau setelan rahasianya salah (biar tak mati mendadak di tengah jalan) + "cek detak jantung" berlapis; (3) resep mengemas app jadi "paket beku" yang aman (bukan dijalankan admin) + pakai bahan versi yang masih didukung. Sekaligus ketahuan rekomendasi Node di kit sudah kedaluwarsa (Node 20 habis-dukungan) → diperbarui.

**Untuk programmer — penempatan per-berkas (sumber ECC dalam kurung):**
- **Berkas baru `templates/github/workflows/app-cicd.yml.example`** (#32): pipeline GitHub Actions 3-tahap (test di semua push/PR; build+deploy hanya `main` → ghcr.io). Komentar 2-lapis + blok SADAR-VERSI. Versi di-pin terbaru terverifikasi 2026-07-11: `checkout@v7`, `setup-node@v6` (`cache: "npm"` eksplisit — cache auto kini npm-only), `upload-artifact@v7`, `setup-buildx@v4`, `login@v4`, `build-push@v7`, cache `type=gha`, `permissions: packages: write`. Didaftarkan di `lib/kit-files.json` (`github_assets`) + rujukan di `workflows/stack/4.14-4-deploy.md` & checklist `STACK_GUIDE.md` §10. (`deployment-patterns`)
- `workflows/stack/4.14-4-deploy.md` **§health baru** (#33): validasi env fail-fast **zod v4** (`z.url()` — bukan v3 `z.string().url()`; diverifikasi zod 4.4.3) + health berlapis (`/health` cepat + `/health/detailed` cek DB → 503 "degraded") + probe Kubernetes. Pointer silang dari `templates/OBSERVABILITY_PRODUKSI.md` Pilar 3 (yang sudah punya `/health` sederhana — anti-dobel). (`deployment-patterns`)
- `templates/STACK_MIGRATION_GUIDE.md` §2.3 **di-upgrade** (#34, versi 1→2): Dockerfile Next.js minimal `node:20` → produksi multi-stage (deps→build→runner), user non-root, `HEALTHCHECK` → `/api/health`, layer-cache (COPY dependency dulu), pin `node:24-alpine`, `.dockerignore`, varian Python (uv), hardening compose (`no-new-privileges`/`read_only`/`cap_drop`). Ringkas 5-aturan + pointer di `4.14-4-deploy.md`. (`docker-patterns`, `deployment-patterns`)
- `templates/STACK_VERSIONS.md` **diperbaiki** (temuan sadar-versi): rekomendasi Node `20.x LTS` (sudah **EOL 2026-04-30**) → **24.x LTS Active** (Min 22 / Rec 24 / Tested 24) + catatan EOL terverifikasi ke nodejs.org.

### Ditambah — serapan ECC Strategi Besar #45 (template skill konten anti-"AI-slop" SEO off-page)

Serapan **MIT © Affaan Mustafa** (ditulis-ulang non-programmer), menggabung 5 skill konten ECC jadi 1 template **skill kustom §4.9 opt-in** — **BUKAN** baseline always-load (selaras §4.13 #8: off-page = skill kustom). **Sumber ECC ternyata MASIH ADA** (peringatan "mungkin hilang" tak terbukti) → ditulis dari 5 berkas asli yang **dibaca utuh**, bukan dari ringkasan. **Sadar-versi ditegakkan** (§8.2 Aturan 1): klaim kebijakan Google (E-E-A-T, "helpful content") diverifikasi ke dok resmi terbaru — "Helpful Content System" sudah dilebur ke sinyal inti (5 Mar 2024), AI-slop berisiko spam "scaled content abuse"; template pakai fakta terbaru + pointer "cek dok resmi", bukan hardcode. Owner pilih penempatan `templates/` via popup. Preflight strict 0/0/0.

**Untuk non-programmer:** kit sekarang punya "mode menulis" opsional yang bikin konten buatan AI (artikel, iklan, postingan medsos, landing) tidak terdengar generik/klise ("game-changer", "di era serba cepat ini", "klik di sini") — dan yang paling penting: **melarang AI mengarang testimoni/statistik palsu**. Penting untuk tim SEO: Google tak benci tulisan AI, tapi benci tulisan kosong produksi-massal untuk ngakalin peringkat. Skill ini **opt-in** (dihidupkan saat butuh), jadi tak membebani aturan yang dibaca AI tiap sesi.

**Untuk programmer — penempatan per-berkas (sumber ECC dalam kurung):**
- **Berkas baru `templates/SKILL_KONTEN_ANTISLOP.md`** (#45): template skill kustom §4.9 siap-adopsi, 2-lapis (👨‍💻+🙂), 5 komponen — (1) daftar-larang frasa AI-slop + heuristik "copot-ke-kompetitor" (`marketing-campaign:106`); (2) gerbang mutu copy (tes-5-detik above-fold, 1-CTA/aset, klaim-iklan=landing — `marketing-campaign:62-96`); (3) crosspost adaptasi per KENDALA bukan stereotipe, X/LinkedIn/Threads/Bluesky/blog (`crosspost:18-91`); (4) Brand Voice Profile reusable dari 5-20 sampel nyata + skema VOICE PROFILE (`brand-voice:20-98` + `voice-profile-schema`); (5) konten source-first (bukti bukan adjektif, JANGAN karang bukti = perluasan §8.2 Anti-Halusinasi — `article-writing:25`). Didaftarkan di `lib/kit-files.json` (`templates`). (`content-engine`, `marketing-campaign`, `article-writing`, `brand-voice`, `crosspost`)
- `workflows/4.13-skill-divisi.md` §4.13 #8 SEO: +1 baris pointer ke template (on-demand, bukan always-load).

Sisa ECC: 🔴 Strategi Besar #43, #44 (butuh desain/runtime). Belum menaikkan versi paket — keputusan rilis owner.

### Ditambah — serapan ECC Strategi Besar #43 (uji kepatuhan aturan di bawah tekanan)

Serapan **MIT © Affaan Mustafa** (ditulis-ulang non-programmer) dari ECC `skill-comply` — sebuah **metode MANUAL owner-gated** untuk mengukur apakah sebuah aturan/skill **benar-benar dipatuhi perilakunya**, bukan sekadar teksnya masih utuh. Inti "Prompt Independence" (Kepatuhan-Tanpa-Disuruh): aturan kuat tetap dipatuhi walau prompt justru menggoda melanggar. **2 risiko prinsip ditangani sadar-penuh:** (a) mekanisme skor asli — `compliance_rate` (`grader.py:116`) + vonis-otomatis-dua-nilai/biner `recommend_hook_promotion` (`grader.py:122`) — **SENGAJA DIBUANG** (langgar anti-skor-biner §8.2 3b, pola sama seperti #42 production-audit), diganti label GENTING/PENTING/RAPIKAN + "bukti diperiksa vs bukti hilang"; (b) diserap sebagai **metode manual**, BUKAN program-penjalan-otomatis (runner) / mengubah-aturan-sendiri (self-evolve) (§6.4) — langkah yang sering bocor hanya **diusulkan** ke owner untuk dijadikan penjaga mesin (menyambung #44), owner yang menyetujui. **Sumber ECC MASIH ADA** → dibaca utuh (`SKILL.md`, `scenario_generator.md`, `classifier.md`, `grader.py`; `agent-self-evaluation` juga dilirik — skor 1-5-nya justru contoh yang TAK diserap). Preflight strict 0/0/0.

**Untuk non-programmer:** kit sekarang punya "latihan kejut" opsional untuk mengecek apakah AI benar-benar menjalankan sebuah aturan — bahkan saat ada yang merayu melanggarnya ("buruan, jangan tanya, ini darurat!"). Kalau AI cuma patuh ketika diingatkan tapi bocor saat ditekan, itu ketahuan lebih awal (sebelum jadi masalah nyata). Alat ini **dipanggil saat perlu** (bukan tiap sesi) dan **kamu yang pegang kendali** — AI tidak mengubah aturannya sendiri, cuma mengusulkan.

**Untuk programmer — penempatan per-berkas (sumber ECC dalam kurung):**
- **Berkas baru `templates/UJI_KEPATUHAN_ATURAN.md`** (#43): template on-demand owner-gated, 2-lapis (👨‍💻+🙂), prosedur 4 langkah (pilih 1 aturan + "kunci jawaban" → 3 skenario ketegasan menurun mendukung/netral/menggoda → amati mode aman → lapor tanpa skor angka) + pagar keamanan (skenario "menggoda" wajib target sandbox, bukan eksekusi bahaya nyata) + tabel anti-pola + jembatan #44. Didaftarkan di `lib/kit-files.json` (`templates`, dikirim ke client). (`skill-comply`)
- `workflows/4.6-6.3-doktrin-efisiensi.md` (§4.6) + `CLAUDE_universal_v1.md` §2.1.1 (**always-load, +1 baris**): pointer ke template. Beda dari `tests/tingkat1-guard.test.mjs` yang menjaga **keutuhan-teks** aturan — ini menguji **kepatuhan-perilaku**.

Sisa ECC: 🔴 Strategi Besar **#44** (diserap berikutnya sebagai keputusan opsi — lihat bagian di bawah). Belum menaikkan versi paket — keputusan rilis owner.

### Ditambah — serapan ECC Strategi Besar #44 (keputusan opsi hook penegak checklist → ADR-008; ECC TUNTAS)

Serapan **MIT © Affaan Mustafa** dari ECC `agents/chief-of-staff.md`. Owner memilih (via popup): **dokumen-opsi + ADR**, **BUKAN** memasang hook. Ini menutup **sisa terakhir** ECC — gelombang serapan ECC **TUNTAS**. **Verifikasi teknis (§8.2 no-quote-no-claim) membalik mekanisme sumber:** klaim sumber "`PostToolUse` memblokir 'selesai' + LLM tak bisa skip" diverifikasi ke dokumentasi resmi Claude Code (via agen `claude-code-guide`) — ternyata **keliru**; `PostToolUse` *reactive* (tak bisa menahan, tool sudah jalan), event yang benar untuk menahan "selesai" = **`Stop` hook**, dan itu pun cuma **menguatkan** (bukan gembok mutlak). Klaim "~20% lupa" (tanpa sitasi) di-hedge. Preflight strict 0/0/0.

**Untuk non-programmer:** kit menimbang "satpam ketiga" — hook yang mengecek semua langkah wajib beres sebelum AI bilang "selesai". Keputusannya: **belum dipasang** (opsional, dinyalakan sendiri kalau perlu). Yang dicatat rapi = alasan + cara benar membuatnya kalau kelak dibutuhkan, plus koreksi penting: cara yang ditulis sumber ternyata **salah-pintu** untuk alat kita. Dua pagar yang tak boleh dilanggar kalau kelak dibuat: (1) satpam ini **tidak boleh menilai dirinya sendiri** "sudah beres" — harus dicek robot dari bukti nyata (kalau tidak, pengaman bisa dibujuk = bukan pengaman); (2) **tidak boleh mengunci kerja tim** kalau salah menduga.

**Untuk programmer — penempatan per-berkas (sumber ECC dalam kurung):**
- **Berkas baru `docs/decisions/ADR-008-hook-penegak-checklist-penyelesaian.md`** (repo-dev, TIDAK di `kit-files.json` — jangkauan "repo-dev dulu"): keputusan adopsi konsep sebagai **opsi opt-in default mati** (§4.12); mekanisme = **`Stop` hook** (bukan `PostToolUse`); penilaian "tuntas" WAJIB **deterministik** (robot cek `git`/tes/`preflight`, bukan AI bilang "sudah" — anti-bypass §8.1 #10); **fail-OPEN**; anti-self-evolve (menegakkan checklist yang SUDAH ADA, §6.4); beda peran dari `risk-gate.js` (`PreToolUse`-RISIKO vs `Stop`-PENYELESAIAN); runtime **ditunda** sampai ada pemicu nyata + persetujuan owner. (`chief-of-staff.md:100-144`)
- `CLAUDE_universal_v1.md` §2.1.1 (**always-load, +1 kalimat**): pointer opsi hook (opt-in, default mati, belum dibangun) → detail on-demand.
- `workflows/4.6-6.3-doktrin-efisiensi.md` (on-demand, dikirim ke client): sub-bagian opsi hook + koreksi teknis 2-lapis (`PostToolUse` vs `Stop`) + 4 syarat desain.
- `templates/UJI_KEPATUHAN_ATURAN.md`: rujukan #44 diperbarui (ADR-002 → **ADR-008** sebagai rumah keputusan #44).
- `docs/decisions/README.md` + `docs/serap-skill/KATALOG.md` + `docs/plans/ECC_BORROW_LIST.md`: registri & status (#44 → keputusan-ADR; sisa ECC 0/tuntas).

Belum menaikkan versi paket — keputusan rilis owner.

### Ditambah — serapan ECC frontend-lanjutan (6 jebakan CSS/viewport/a11y + debounce; di luar 44-kandidat)

Serapan **MIT © Affaan Mustafa** (ECC v2.0.0, **ditulis-ulang** non-programmer) dari 2 skill yang **belum tercakup** daftar 44-kandidat `ECC_BORROW_LIST.md`: `frontend-slides` (`viewport-base.css`, `STYLE_PRESETS.md`, `animation-patterns.md`) + `frontend-patterns` (`useDebounce`). *(Klarifikasi: "ECC TUNTAS" pada #44 merujuk 44/45 kandidat asli; telaah frontend ini menemukan 6 gotcha tambahan di luar daftar itu.)* Mengikuti proses baku `docs/serap-skill/PLAYBOOK.md` (7 langkah + 6 pagar). **Dedup diverifikasi** (Grep kit, semua ABSENT/PARTIAL): `dvh/svh/100vh`, `minmax/auto-fit`, `debounce`, `will-change`, `clamp(`, `calc(-1 * …)` = 0 hit di `workflows/`. **Sadar-versi ditegakkan** (§8.2 Aturan 1): Tailwind `h-dvh`/`min-h-dvh` diverifikasi = **v3.4** (blog resmi Tailwind) + dvh/svh/lvh Baseline "widely available" (Chrome 108 / Safari 15.4 / Firefox 101, ~2022+; caniuse) — ditulis **"cek versi terpasang"**, tak di-hardcode. **Always-load +0 baris** (semua on-demand). Semua 6 masuk **`workflows/stack/4.14-1b-frontend-lanjutan.md`** (14.960 char-JS < 18.000 → tak perlu berkas baru). Preflight strict **GENTING 0 · PENTING 0 · RAPIKAN 0**, 1015 tes lulus.

**Untuk non-programmer:** kit jadi lebih paham jebakan tampilan-HP yang sering bikin pusing tim: (1) layar "1 penuh" yang malah ketutup bilah alamat browser HP; (2) rak kartu produk yang "tumpah" ke samping di layar sempit (harus geser kiri-kanan); (3) kotak pencarian yang menembak database tiap huruf (boros + hasil kedip-kedip) — diperbaiki dengan "tunggu user selesai mengetik dulu"; (4) efek animasi yang dipasang berlebihan malah bikin HP murah berat; (5) huruf yang menolak membesar saat pengguna berpenglihatan-terbatas menaikkan ukuran font (aksesibilitas + bisa kena aturan hukum); (6) satu salah-tulis rumus ukuran CSS yang diabaikan browser diam-diam. Semua relevan langsung untuk fitur "daftar produk + pencarian" dan target uji layar HP ~360px.

**Untuk programmer — penempatan (semua → `workflows/stack/4.14-1b-frontend-lanjutan.md`; sumber ECC + vonis dalam kurung):**
- **A. Full-height `100dvh` berlapis** — ✅ SERAP: `height: 100vh; height: 100dvh;` + panduan `svh`/`lvh` (overlay pakai `svh` anti-CLS) + Tailwind `h-dvh`/`min-h-dvh` (≥3.4). (`viewport-base.css:21-22`, `STYLE_PRESETS.md:57,168`)
- **B. Grid kartu `repeat(auto-fit, minmax(min(100%, 250px), 1fr))`** — ✅ SERAP: cegah scrollbar horizontal (langgar WCAG Reflow) saat kontainer < 250px, tanpa media query. (`viewport-base.css:77`)
- **D. Debounce input pencarian (`useDebounce`)** — ✅ SERAP: potong jumlah query (1 bukan 6); beda peran dari `useDeferredValue`/`AbortController`/SWR; GOTCHA: SWR/Query TAK men-debounce. (`frontend-patterns/SKILL.md:223-248`)
- **C. `will-change` seperlunya** — ☑️ SERAP-OPSIONAL (tempel ke blok Motion pilar 2): berlebihan = KEBALIKAN optimasi (memori GPU bengkak, jank di HP RAM kecil). (`animation-patterns.md:122`)
- **F. Fluid `clamp()` + jebakan WCAG 2.2 SC 1.4.4** — ☑️ SERAP-OPSIONAL: `vw`-murni di tengah `clamp` → teks tak bisa diperbesar (a11y); selalu campur `rem`. Pelengkap Reflow #10 (SC 1.4.10) di `4.14-1`. (`viewport-base.css:42-56`)
- **E. Negasi fungsi CSS `calc(-1 * clamp(...))`** — ☑️ SERAP-OPSIONAL: `-clamp(...)`/`-min(...)` diabaikan browser diam-diam (bug hening). (`STYLE_PRESETS.md:298-314`)
- Blok **Kredit** di `4.14-1b` diperbarui (+`frontend-slides`/`frontend-patterns`); registri `docs/serap-skill/KATALOG.md` ditambah gelombang "frontend-lanjutan" (ter-vetting +6, diserap 48→54).

Belum menaikkan versi paket — keputusan rilis owner.

### Ditambah — serapan ECC gelombang Database (guardrail timeout+caveat managed · upsert idempoten · lock-ordering · peringatan SKIP LOCKED; di luar 44-kandidat)

Serapan **MIT © Affaan Mustafa** (ECC v2.0.0, **ditulis-ulang** non-programmer + dinetralkan) dari 4 sumber DB yang **belum tercakup** daftar 44-kandidat: `postgres-patterns`, `prisma-patterns`, `mysql-patterns` + agen `database-reviewer`. Mengikuti proses baku `docs/serap-skill/PLAYBOOK.md` (7 langkah + 6 pagar) — tiap sumber dibaca **verbatim di `file:baris`** sebelum menulis (pagar #2 no-quote-no-claim). **Dedup diverifikasi** (Grep kit, 0 padanan): `statement_timeout`/`idle_in_transaction`, `ON CONFLICT`/`EXCLUDED`/`upsert`/`skipDuplicates`, lock-ordering/`ORDER BY id FOR UPDATE`, salah-pakai `SKIP LOCKED` = ABSENT. **Sadar-versi ditegakkan** (§8.2 Aturan 1): semuanya ditulis "cek versi terpasang" (Postgres `FOR UPDATE`/`ON CONFLICT`, Django `select_for_update`, Prisma `upsert`/`skipDuplicates` — TAK di-hardcode). **Always-load +0 baris** (semua on-demand). Ukuran robot dijaga: `4.14-2-supabase-prisma.md` = **16.838 char-JS < 18.000** (tak perlu pecah). Preflight strict **GENTING 0 · PENTING 0 · RAPIKAN 0**, 1015 tes lulus.

**Untuk non-programmer:** kit sekarang paham 4 pengaman database yang sering bikin bug diam-diam pada uang/stok: (1) "rem otomatis" biar 1 query/transaksi nyasar tak menyandera server — dengan catatan penting bahwa DB kita "sewa terkelola" (Supabase-managed), jadi TAK boleh utak-atik "panel listrik utama" seperti tutorial server-sendiri; (2) tombol "simpan pintar" (upsert) yang aman diulang-ulang tanpa bikin data dobel; (3) aturan "selalu ambil sesuai nomor urut" saat transfer saldo/poin biar dua transaksi tak saling-tunggu-selamanya (deadlock); (4) peringatan keras: teknik "lewati yang sedang dilayani" (SKIP LOCKED) bagus untuk antrean tugas tapi BERBAHAYA untuk menghitung total uang — hasilnya bisa diam-diam kurang tanpa error apa pun.

**Untuk programmer — penempatan per-berkas (sumber ECC `file:baris` dalam kurung):**
- `templates/STACK_GUIDE.md` **§5.4 baru** "Pengaman timeout query & transaksi (guardrails)": `statement_timeout` (disetel di role query API `authenticated`/`anon` yang default-nya MENANG atas `authenticator` — 8s/3s — + wajib `NOTIFY pgrst, 'reload config'`) + `idle_in_transaction_session_timeout` (di `authenticator`), beda-lapisan dari timeout Prisma `$transaction`/`pool_timeout`. **Caveat inti:** sumber ECC memakai gaya self-hosted `ALTER SYSTEM SET …` + `SELECT pg_reload_conf();` yang **TIDAK jalan di Supabase-managed** (bukan superuser) → dialihkan ke `ALTER ROLE`/`ALTER DATABASE … SET` / Dashboard; `max_connections` = tier compute. (`postgres-patterns:124-137`)
- `workflows/stack/4.14-2-supabase-prisma.md` (3 sisipan):
  - **Upsert idempoten** (setelah tabel anti-pola Prisma, sebelum paginasi cursor): `ON CONFLICT (…) DO UPDATE`/`DO NOTHING` (`EXCLUDED`) + Prisma `upsert()` (non-atomik → tetap pasang UNIQUE di DB + tangkap `P2002`; `@updatedAt` ikut ter-set di `upsert`) + `createMany({ skipDuplicates })` impor massal anti-dobel. (`postgres-patterns:70-76`, `prisma-patterns:63,344`)
  - **Kunci banyak baris urutan KONSISTEN** (anti-deadlock transfer saldo/poin; setelah blok `FOR UPDATE SKIP LOCKED`): `SELECT … WHERE id IN (…) ORDER BY id FOR UPDATE` + Django `select_for_update().order_by('id')` + retry berbatas SQLSTATE `40P01`/`40001`. **Dialihkan MySQL→Postgres/Django.** (`database-reviewer.md:67`, `mysql-patterns:196-219`)
  - **Peringatan salah-pakai `SKIP LOCKED`** (2 baris DI DALAM blok SKIP LOCKED, setelah catatan versinya): JANGAN untuk baca data integritas-sensitif (saldo/stok/akuntansi) — sengaja melewati baris terkunci → "pemandangan tak lengkap" → hasil penjumlahan diam-diam SALAH; SKIP LOCKED hanya untuk antrian. (`mysql-patterns:39-41,240-241`)

Registri `docs/serap-skill/KATALOG.md` + `docs/plans/ECC_BORROW_LIST.md` ditandai **DISERAP** untuk gelombang DB ini. Belum menaikkan versi paket — keputusan rilis owner.

## [2.4.1] - 2026-07-10

### Diubah — perampingan `CLAUDE_universal_v1.md` (always-load) babak 4: dedup ke rak `workflows/`

**Untuk non-programmer:** berkas aturan yang dibaca AI tiap sesi dirampingkan lagi — uraian panjang yang detailnya SUDAH ada di rak `workflows/` (hasil v2.4.0) tidak lagi ditulis dobel di aturan inti; cukup mandat singkat + alamat berkasnya. Satu-satunya isi yang benar-benar pindah rumah ("4 disiplin operasional" §6.3) mendarat utuh di raknya. Hemat ~980 token per sesi, per client, setiap sesi — tanpa satu aturan pun hilang (dijaga tes frasa-jangkar).

**Untuk programmer:**
- **Dedup ke rak** (detail sudah ada di `workflows/`, ringkasan dobel dipadatkan jadi mandat + pointer): §15 (3 mode opsional), §4.18 protokol, §4.11 Refactor Bertingkat, §14.1 popup, §4.12 Co-Pilot (pagar WAJIB tetap tertulis penuh), §4.1 contoh blok terisi.
- **MOVE:** "4 disiplin operasional" (§6.3) → `workflows/4.6-6.3-doktrin-efisiensi.md` (satu-satunya konten yang benar-benar berpindah; ringkasan 1-baris + pointer tetap di inti).
- **CONDENSE di tempat:** §4.6 sub-blok "Cara cepat DAN benar"+"Hemat token" digabung, §4.17, blok "Dua Tingkat Aturan", §1.1 (analogi dipangkas — disetujui owner), §4.1 aturan-isi.
- **DITAHAN sengaja (risiko > manfaat):** §4.13, §6.1/§6.2, §4.7 — frasa-jangkarnya rapat dengan tes penjaga, hemat marginal.
- **Hasil terukur:** always-load 72.320 → **68.394 char (~980 token/sesi lebih hemat)**. Frasa-jangkar Tingkat-1 utuh — dijaga `tingkat1-guard`/`mode-hemat-guard`/`compaction-rule`/`skills-divisi`/`modify-workflow-rule`; 0 aturan berubah makna.

### Diperbaiki — audit rilis pra-terbit (buru-bug lintas-sudut kereta v1.63→2.4.1): 7 temuan valid ditambal + 2 penjaga permanen baru

**Untuk non-programmer:** sebelum benar-benar mengirim versi ini ke publik, kit "dibongkar" oleh banyak pemeriksa dari sudut berbeda untuk mencari cacat yang tersisa dari perombakan besar (menghapus PowerShell). Ketemu 7 hal yang perlu dirapikan — dua di antaranya penting: (1) satu "satpam otomatis" bisa keliru menuduh berkas MILIK project client sebagai "rujukan rusak" lalu memblokir tombol rilis mereka; (2) alat pemeriksa kesehatan kit ("doctor") lupa mengecek 39 berkas panduan baru, jadi bisa bilang "sehat" padahal ada yang hilang. Semua sudah ditambal, dan dua "penjaga permanen" (tes otomatis) dipasang supaya dua bug itu tak bisa kambuh diam-diam.

**Untuk programmer:**
- **[PENTING] `lib/workflows-ref-check.mjs`** — regex `PATH_REF_RE` diberi batas-kiri (negative lookbehind). Sebelumnya path client yang memuat segmen `workflows/` di tengah (mis. `docs/workflows/x.md`, `.github/workflows/README.md`, `src/workflows/y.md` yang disebut di `AGENTS.md`/`CLAUDE.md` kustom client) salah-tangkap → temuan "rujukan putus" PALSU tingkat PENTING → memblokir `preflight --strict` (gerbang rilis client). Dikunci tes negatif+positif baru di `tests/workflows-refs.test.mjs`.
- **[PENTING] `kit.mjs` (doctor cek file-inti)** — grup `workflows` (39 berkas rak, ditambah v2.4.0) MASUK daftar verifikasi installer tapi TERLEWAT dari daftar integritas doctor → client yang kehilangan folder `.claude-kit/workflows/` tetap divonis "sehat". `workflows` ditambahkan ke daftar grup doctor. Penjaga baru di `tests/kit-doctor-files.test.mjs`: doctor tak boleh menjaga LEBIH SEDIKIT grup daripada installer.
- **[RAPIKAN] `kit.mjs` (deteksi artefak)** — doctor kini juga mendeteksi sisa alat PowerShell v1 DI DALAM `.claude-kit/` (mis. setelah "update" via `npm create lintasai@latest` yang menimpa-tumpuk, bukan `npx lintasai update` yang cadangkan-lalu-segar) → INFO ajakan bersihkan + peringatan jangan jalankan `update-kit.ps1` lama. Stub `setup-pola-b.ps1` dikecualikan.
- **[RAPIKAN] Rujukan basi pasca-hapus-PowerShell disapu** (kereta v2 lolos-sisa): `UPGRADING.md`/`CHANGELOG.md` rollback `@1.63`→`@1.62` (v1.63.0 tak pernah terbit npm); `bin/lintasai.js` pesan blokir non-Windows (buang klaim "v1.x/PowerShell+WPF/tunggu v2.0+"); `Get-PackageManager`→`getPackageManager` (`AUDIT_POST_SETUP_PROMPT_v1.md`, `templates/PROMPT_LIBRARY.md`); `install-secret-hook.ps1`→`lib/install-secret-hook.mjs` (`templates/hooks/pre-commit-secret-scan.sh`); buang `lib/portfolio-read.ps1` (`templates/lintasai-portfolio.example.yml`).
- **[RAPIKAN] §4.12** — 2 penunjuk pengaman ("cek-silang skeptis" §8.2 + "persetujuan lama diverifikasi ulang" §6.1) yang terpangkas saat dedup babak-4 dikembalikan ke baris "Pengaman SELALU" (disiplinnya sendiri tetap hidup di §6.1/§8.2; ini memulihkan pointer).
- **Verifikasi:** 1015 tes Node hijau (+2 penjaga baru) + `preflight --strict` 0/0/0 + simulasi E2E client (pasang segar / update v1.62→2.4.1 / migrasi kartu `.psd1` / doctor-v2-atas-kit-v1) diulang hijau setelah tambalan.

---

## [2.4.0] - 2026-07-10

### Diubah — navigasi rujukan on-demand: LINTASAI_WORKFLOWS_v1.md dipecah per seksi ke `workflows/` + robot penjaga rujukan

**Untuk non-programmer:** buku rujukan besar yang dulu dibaca AI dengan cara "menebak halaman lewat pencarian judul" ternyata sering nyasar — audit membuktikan 11 dari 25 penunjuknya gagal ketemu dan 1 penunjuk mengarah ke halaman yang tidak pernah ada; saat nyasar, AI membaca SELURUH buku (~44-51 ribu token sekali kejadian) atau lebih buruk: mengarang isinya. Sekarang buku itu dipecah jadi 39 berkas kecil berlabel di folder `workflows/` — penunjuknya berupa alamat berkas yang pasti, dan ada "satpam otomatis" yang memastikan semua penunjuk nyambung SEBELUM rilis. Isi aturan tidak berkurang satu kalimat pun (dibuktikan robot pembanding baris). Client tidak perlu melakukan apa pun — update biasa sudah membawa semuanya.

**Untuk programmer:**
- **Pecah-per-seksi:** `LINTASAI_WORKFLOWS_v1.md` (1.772 baris / ~177 KB) → 39 berkas `workflows/<nomor>-<slug>.md` (+ `workflows/INDEX.md`), potong per rentang-baris terverifikasi (bukan per-judul — 6 judul palsu di pagar kode); bukti isi-utuh: 1.762 baris verbatim, 0 beda. Kasus khusus disembuhkan: §7.3a (anchor menggantung) kini berkas sendiri; §4.1 yang terbelah 2 lokasi disatukan; §4.6+§6.3 (judul gabungan) = 1 berkas 2 id; §4.14 (37,7 KB) terpecah per paket stack di `workflows/stack/` (lookup stack: ~9-11rb → ~1-3rb token).
- **Rujukan = path literal:** semua `LINTASAI_WORKFLOWS_v1.md §X` (40 titik di 6 berkas hidup) ditulis-ulang jadi path `workflows/...md`; aturan-baca §6 diganti (Read 1× / fallback INDEX ≤2 panggilan; pola grep-judul DIBUANG). Berkas lama jadi **pengalih tipis** (dikunci <4 KB) — rujukan basi dari memory/AGENTS kustom tetap tersambung.
- **Robot penjaga baru `lib/workflows-ref-check.mjs`** (cuma-baca, ~0 token, inti PURE): 6 cek — forward (rujukan→berkas nyata), reverse (nol berkas yatim), istilah-pensiun (pola lama dilarang balik), penanda `<!-- LINTAS:SEKSI §id -->` baris-1 + id unik, INDEX sinkron, anggaran ≤18 KB/berkas. CLI `--report` = inventaris rujukan. Terpasang di `npx lintasai preflight` (langkah "Rujukan rak workflows/", auto-skip anggun untuk kit/client lama) + pengunci `tests/workflows-refs.test.mjs` (uji negatif per-cek + regresi keras repo nyata + sinkron kit-files/tarball).
- **Wiring kirim:** grup `workflows` di `lib/kit-files.json` (dua-arah dikunci tes), `package.json` files[] +`workflows/`, verifikasi `setup-pola-b.mjs` + `REQUIRED_GROUPS`, `install-windows.mjs` menyalin rak ke `~/.claude/workflows/`. Tier 2 (AI-auto-sync), BUKAN breaking — client lama tak memburuk; efek terasa setelah update + buka chat baru.

---

## [2.3.0] - 2026-07-10

### Ditambahkan — penjaga anti-bloat berkas aturan (pelajaran sesi kompaksi jadi robot permanen)

**Untuk non-programmer:** kita baru sadar berkas aturan yang dibaca AI tiap sesi bisa menggembung pelan-pelan tanpa ketahuan (itu yang bikin boros token). Sekarang dipasang "satpam otomatis": tiap kali cek pra-rilis jalan, ia mengukur ukuran berkas aturan — kalau kegemukan, langsung diberi tanda supaya dirapikan. Plus aturan tegas: cerita/tanggal/sejarah masuk CHANGELOG, bukan berkas aturan. Ini mengubah pelajaran (yang tadinya ketemu manual) jadi penjaga permanen — di kit DAN tiap project client.

**Untuk programmer:**
- **Robot baru `lib/rules-budget-check.mjs`** — ukur ukuran `CLAUDE_universal_v1.md` (always-load) vs anggaran (default 128.000 char / ~32K token). Cuma-baca, deterministik. Cari berkas di root (kit) atau `.claude-kit/` (client) → auto-skip anggun kalau tak ada. CLI: `node lib/rules-budget-check.mjs [--budget-chars N]`.
- **Terpasang di `npx lintasai preflight`** ("Anggaran token berkas aturan"): lewat anggaran → RAPIKAN (saran, non-blokir harian). Terdaftar di `lib/kit-files.json` (node_lib) → ikut ke client.
- **Pengunci `tests/rules-budget.test.mjs`** — (a) fungsi ukur PURE, (b) **HARD regresi**: berkas aturan NYATA wajib di bawah anggaran (kalau ada yang membengkak → suite MERAH sebelum rilis), (c) aturan penempatan §14 + pointer robot terkunci.
- **Aturan penempatan konten (§14, always-load):** mandat singkat + pointer di berkas aturan; detail/contoh/tabel → `LINTASAI_WORKFLOWS_v1.md`; cerita asal-usul/insiden/kredit/tanggal → `CHANGELOG.md`/`docs/decisions/`. Menegakkan pola §4.18 Compaction yang sebelumnya cuma implisit.
- Anggaran = **langit-langit anti-regresi**, bukan target; naikkan HANYA dengan alasan sadar (aturan Tingkat-1 baru), bukan untuk menampung bloat.

---

## [2.2.2] - 2026-07-10

### Diubah — kompaksi lanjutan §7 & §4.6 `CLAUDE_universal_v1.md` (always-load)

**Untuk non-programmer:** merapikan lagi berkas aturan yang dibaca AI tiap sesi — bagian yang menjelaskan hal sama 2× dipadatkan, dan contoh/analogi panjang yang jarang dipakai dipindah ke berkas rujukan. Aturan dokumentasi & gerbang cek-mutu tetap berfungsi persis sama.

**Untuk programmer:**
- **§7.1 AUTO-SYNC:** blok "Default behavior tiap sesi" dihapus (mengulang 3 langkah WAJIB di atasnya) → disisakan 1 baris prinsip ("`.md` = bagian code + self-review diff").
- **§7.2 LAZY-GENERATE:** "Kenapa LAZY" (3 bullet) dipadatkan jadi 1 baris.
- **§7.3a:** paragraf "Kenapa bukan dokumen saja" + 2 analogi (Google Maps/brankas) + checklist mikro 5-centang DIPINDAH ke `LINTASAI_WORKFLOWS_v1.md` (echo §7.3a). Always-load tetap punya 4-langkah inti + catatan Read-before-Edit + pengunci — semua frasa-jangkar `modify-workflow-rule` utuh.
- **§4.6:** daftar "7 prinsip efisiensi" (yang juga sudah ada lengkap di §6.3 + workflows) diringkas jadi ringkasan pendek + pointer — hentikan triplikasi.
- **Hasil:** always-load ~31.090 → **~30.670 token/sesi** (turun ~420 token). 989 tes + `tingkat1-guard`/`compaction-rule`/`modify-workflow-rule`/`mode-hemat-guard` hijau; 0 fungsi berubah. §8.2 (anti-halusinasi) SENGAJA tak disentuh — pilar Tingkat-1, contoh dipertahankan.

---

## [2.2.1] - 2026-07-10

### Diubah — buang narasi "asal-usul aturan" dari `CLAUDE_universal_v1.md` (always-load)

**Untuk non-programmer:** berkas aturan yang dibaca AI tiap sesi dibersihkan dari "cerita kenapa aturan ini dibuat" — tanggal insiden lama, kredit sumber, dan justifikasi historis. Cerita ini menarik untuk arsip, tapi **tidak membantu AI membangun web/app** dan dibayar token tiap sesi. Aturannya sendiri berfungsi **persis sama** tanpa cerita itu. Pesan "jangan hidupkan lagi pola lama" (anti-kambuh) tetap dipertahankan — cuma cap tanggalnya yang dibuang.

**Untuk programmer:**
- **Dihapus (provenance/anekdot murni):** paragraf "Kenapa dipertegas" (§2.1, insiden narasi Inggris 2026-06-13), "Locked lesson" (§2.1.1), blockquote atribusi ECC + insiden Aturan 10 (§8.1), "Pelajaran nyata 2026-06" (§8.2 Aturan 3), blockquote "Asal: audit ECC" (§8.2 3b), kredit ECC di §8.2 Aturan 3b/ringkasan-hitung/§3 Plan/§8.2 library-tip.
- **Cap tanggal/versi dibuang** (pesan tetap): §2.1 poin #78, §2.1.1 "substantive", §4.1 (211/271/238), §4.6 (333), §6.3 (562/568), §14.1 (v1.5.20/v1.11.0/v2.0.0). Catatan anti-kambuh (jangan hidupkan lensa/pengecualian lama) dipertahankan.
- **Hasil:** always-load ~31.650 → **~31.090 token/sesi** (turun ~560 token lagi). 989 tes + `tingkat1-guard`/`compaction-rule`/`mode-hemat-guard` tetap hijau; 0 aturan/fungsi berubah. Atribusi ECC aman dibuang: konten memang ditulis-ulang (bukan salinan teks), jadi tak ada kewajiban lisensi.

---

## [2.2.0] - 2026-07-10

### Diubah — kompaksi `CLAUDE_universal_v1.md` (always-load) lanjutan: dedup + padatkan + pindah detail on-demand

**Untuk non-programmer:** berkas aturan yang otomatis dibaca AI tiap sesi dirapikan lagi — bagian yang ditulis dobel dibuang, penjelasan yang bertele-tele dipadatkan, dan detail yang jarang dipakai dipindah ke berkas rujukan (dibaca hanya saat perlu). Hasilnya AI mulai kerja lebih murah + lebih cepat tiap sesi, **tanpa satu pun aturan keselamatan/standar hilang** — semua dijaga robot tes. Contohnya: daftar perintah berbahaya yang tadinya ditulis 2×, sekarang 1× saja; penjelasan format "2 versi jawaban" yang tadinya diulang 6× jadi 1 sumber.

**Untuk programmer:**
- **DEDUP:** daftar perintah destruktif (§8.1 #3) tak lagi menyalin daftar §8.2 Aturan 5; §12 "terobos pagar" merujuk §8.1 #10 (bukan mengulang); catatan migrasi `project.lintas.psd1` di §7.9 tak lagi dobel.
- **CONDENSE:** §4.1 pengulangan aturan blok 2-versi (👨‍🎓/🙂) dipadatkan dari ~6 restatement jadi 1 kanonik (roster "13 divisi" + heading + Knowledge Transfer tetap, dikunci `tingkat1-guard`); §2.1 poin 6 (kosakata internal) + analogi panjang §8.2 dipadatkan.
- **MOVE → `LINTASAI_WORKFLOWS_v1.md` (on-demand):** detail §7.6 Auto-Health-Check (kapan + 6 cek), §7.7 Bus Factor (skor 0-4), §8.1 #4 skenario tier-guard + contoh SALAH/BENAR, §8.2 Aturan 3b daftar "jangan asal di-flag" (a-h). Aturan inti + frasa-jangkar tetap di always-load; hanya elaborasi yang pindah.
- **DELETE usang:** §14.1.0 tak lagi menjelaskan sistem "Popup Tipe B (GUI PowerShell)" yang pensiun sejak v2.0.0.
- **DITAHAN (sengaja):** §9 (DB) + §10 (Frontend/UX/SEO) TIDAK dipindah — itu standar profesional inti yang harus selalu terbaca; sudah berupa one-liner padat.
- **Hasil terukur:** always-load ~33.180 → **~31.650 token/sesi** (turun ~1.530 token, sudah termasuk fitur Mode Hemat v2.1.0 yang tetap ada); detail yang pindah tak lagi dibayar per-sesi. Standar 0 berubah — dijaga `tingkat1-guard`, `compaction-rule`, `modify-workflow-rule`, `mode-hemat-guard`.

---

## [2.1.0] - 2026-07-10

### Ditambahkan — Mode Hemat (Lean Mode): saklar irit-token + cepat, opt-in per proyek

**Untuk non-programmer:** sekarang tiap proyek bisa menyalakan **Mode Hemat** — AI mengerjakan task rutin **lebih cepat + lebih murah token** dengan memangkas "hiasan" jawaban yang tidak diminta (penjelasan 2 versi & blok Tinjauan Divisi saat task sepele, dokumen dibuat hanya saat diminta, narasi to-the-point). Yang penting: **pagar keselamatan TIDAK ikut dimatikan** — keamanan, anti-ngarang, wajib Bahasa Indonesia gaya awam, dan gerbang cek-mutu sebelum rilis tetap menyala. Analogi: seperti "mode hemat baterai" HP — animasi dimatikan, tapi telepon darurat & alarm tetap jalan. Default **MATI**; nyalakan dengan mencentang di `AGENTS.md` bagian "Opt-in" atau ketik "mode hemat" di chat.

**Untuk programmer:**
- `CLAUDE_universal_v1.md` §15: definisi ringkas Mode Hemat (DEFAULT MATI, opt-in) + daftar pagar Tingkat-1 yang **tak pernah** ikut dilonggarkan (§8/§8.1 keamanan, §8.2 anti-halusinasi, §2.1 bahasa non-programmer, §4.6 QA/QC). Di titik risiko (login/bayar/data-pribadi/skema-DB/rilis) mode otomatis "mundur" ke penuh.
- `LINTASAI_WORKFLOWS_v1.md` §15: detail perilaku "Saat AKTIF" (yang dilonggarkan Tingkat-2 vs yang kebal Tingkat-1) + contoh + analogi. Memformalkan doktrin "usaha pas-ukuran" §6.3 jadi saklar eksplisit.
- `AGENTS.md.template`: bagian **Opt-in** baru (sebelumnya dirujuk §15 tapi belum ada di template) — checkbox Mode Hemat + Auto-Confirm + Co-Pilot + ide opsional, semua default tak-tercentang (mati).
- Pengunci anti-rot baru `tests/mode-hemat-guard.test.mjs`: memastikan Mode Hemat tetap DEFAULT MATI + klausa "pagar Tingkat-1 tak pernah dilonggarkan" (beserta anti-halusinasi, bahasa non-programmer, QA/QC) tak bisa terhapus diam-diam saat berkas aturan disunting. Hilang salah satu → suite merah.
- Tak ada perubahan breaking; standar default proyek yang TIDAK menyalakan Mode Hemat identik seperti v2.0.0.

---

## [2.0.0] - 2026-07-10

**[BREAKING]** Rilis BESAR (1.63.0 -> 2.0.0): **hapus total PowerShell — kit kini 100% Node.** Wajib baca panduan pindah-versi: `UPGRADING.md` bagian "v1.62.x / v1.63.x → v2.0.0".

### Diubah [BREAKING] — semua alat PowerShell dihapus; semua perintah lewat `npx lintasai`

**Untuk non-programmer:** sejak v1.63.0 kit membawa "dua mesin" untuk pekerjaan yang sama — mesin **Node** (jalan di semua komputer) dan mesin cadangan **PowerShell** (khusus Windows) yang sudah dicap USANG. Mulai versi ini, mesin cadangan itu **benar-benar dicopot**: skrip lama `kit.ps1`, `update-kit.ps1`, dan kawan-kawannya tidak ada lagi di dalam kit. Semua pekerjaan kini lewat satu pintu: `npx lintasai <perintah>` (mis. `npx lintasai doctor`, `npx lintasai update`). Yang perlu kamu lakukan cuma satu: **update lewat jalur resmi `npx lintasai update`** (JANGAN pakai skrip updater lama), lalu jalankan `npx lintasai doctor` untuk memastikan semua hijau. Catatan: PowerShell sebagai *jendela terminal Windows* (tempat kamu mengetik `npm`/`npx`) tetap kamu pakai seperti biasa — yang dihapus hanya alat kit yang ditulis dalam bahasa PowerShell.

**Untuk programmer:**
- Dihapus: 6 orkestrator akar (`kit.ps1`, `update-kit.ps1`, dll.) + 19 `lib/*.ps1` + 36 suite tes Pester + 3 pelari PS + 4 template `.ps1`/`.psd1` + seluruh wiring PS (`PS_FALLBACK`, parity-check, jalur PS gerbang/CI) — dikerjakan bertahap di kereta v2 (Fase 2–3f, lihat riwayat commit `feat(v2-fase*)!`). Manifest daftar-berkas kini `lib/kit-files.json` (pembaca dua-format: doctor v2 atas kit era-v1 = INFO ajakan update, bukan vonis rusak). Satu-satunya `.ps1` tersisa = **stub penyelamat `setup-pola-b.ps1`** (D6, dipertahankan sampai v3) supaya updater PS lama yang terlanjur jalan tidak tersangkut setengah-jadi; dijaga tes "tarball 0 `.ps*` kecuali stub".
- Migrasi artefak client: kartu `project.lintas.psd1` → `project.lintas.jsonc` via `npx lintasai migrate-project-card` (default SIMULASI, `--apply` untuk sungguhan; idempoten + cadangan ber-cap-waktu + catat buku-besar `.migration-state.json`); `.github/scripts/setup-branch-protection.ps1` → `npx lintasai protect-main` (default SIMULASI). Angka skema artefak TIDAK naik (tetap 1) — yang berubah wadah berkas, bukan format isinya.
- Migration Steps (urut, SIMULASI-dulu): (1) `npx lintasai update` — cadangan `.claude-kit.backup-<cap-waktu>` otomatis; (2) `npx lintasai migrate-project-card` (SIMULASI) → tinjau → `--apply`; (3) verifikasi `npx lintasai doctor` hijau + laporan migrasi "Termigrasi X dari X". Rollback: pulihkan `.claude-kit.backup-<ts>` + `npm install lintasai@1.62` (v1.63.0 = jembatan yang tak diterbitkan ke npm). Detail lengkap: `UPGRADING.md` + keputusan arsitektur `docs/decisions/ADR-007-hapus-total-powershell-v2.md` (supersede ADR-003/004/005).

### Diubah — paket hemat token per-sesi client (±4.700 token/sesi, kualitas dijaga tes pengunci)

**Untuk non-programmer:** AI di project kamu jadi lebih murah + lebih cepat mulai kerja, TANPA menurunkan mutu — yang dipangkas cuma pengulangan yang tidak perlu, dan ada "satpam otomatis" baru yang memastikan aturan keselamatan tidak ikut terpangkas.

**Untuk programmer:**
- `lib/lang-reminder.mjs`: suntikan per-prompt dipadatkan 1.032 → 604 char (−~107 token TIAP prompt); semua frasa yang dikunci `tests/lang-reminder.test.mjs` dipertahankan.
- §7.6 Auto-Health-Check: default berubah dari **tiap sesi** → **sesi pertama pasca pasang/update + reaktif** (tool error berbau lingkungan / user menyebut masalah lingkungan) + manual `npx lintasai doctor` (−~500 token/sesi).
- §7.9/§7.3/§3: kewajiban dobel-baca `project.lintas.jsonc` **bareng** `docs/architecture.md` dihapus — baca **SATU peta** (kartu kalau ada; `architecture.md` menyusul hanya saat butuh narasi/konvensi) (−~400 token/sesi).
- §7.8: dokumen keunggulan/fitur (mis. `KEUNGGULAN.md`) kini **sinkron BATCH 1× pra-rilis** dari CHANGELOG/git log + baris "Terakhir diselaraskan: vX.Y.Z" — bukan tiap perubahan fitur (dokumen besar tak lagi dibaca+ditulis ulang berkali-kali per rilis).
- DoD §4 (checkbox Gerbang §4.6): diselaraskan dengan §4.6/§6.3 — suite tes penuh dijalankan **1× SETELAH edit terakhir** sebelum deklarasi "selesai"; edit-antara cukup tes terdampak. Gerbang tetap tanpa kecuali.
- §4.18 Compaction: pemicu baru (b) — berkas yang dibaca berulang per task (`RESEP_PERUBAHAN.md`/`architecture.md`/kartu) membengkak > ~2× skeleton (~8 KB) → AI tawarkan padatkan; nomor resep dilarang dinomori ulang.
- `AGENTS.md.template` dipadatkan 5.651 → 3.053 char (−~650 token/sesi untuk pemasangan baru; `AGENTS.md` client lama tidak disentuh saat update).
- Diet redaksi seksi Tingkat 2 `CLAUDE_universal_v1.md` (§4.3b/§4.5/§4.7/§4.11/§4.12/§4.13/§6.1-§6.3/§9/§11/§15 dll): 137.271 → 133.047 char — isi aturan utuh, hanya redaksi dipadatkan; pagar Tingkat 1 (§2.1/§2.1.1/§8/§8.1/§8.2/§4.1) TIDAK disentuh.

### Diubah — Tinjauan lintasAI Divisi dirampingkan: 15 → 13 lensa + blok hanya tampil saat ada temuan (keputusan owner 2026-07-10)

**Untuk non-programmer:** dua baris "penjaga" (🤔 Adversarial Reviewer + 🔄 Reversibility) yang dulu menutup hampir tiap jawaban AI **dihapus** — terlalu sering muncul di semua kondisi dengan isi yang tidak penting. Sekarang blok tinjauan hanya muncul kalau memang **ada temuan yang perlu kamu tahu** (atau untuk keputusan besar / kalau kamu minta). Pengaman intinya TIDAK dicopot: AI tetap wajib punya bukti sebelum mengklaim (aturan anti-ngarang §8.2) dan tetap wajib konfirmasi + siapkan rencana-balik sebelum aksi berbahaya.

**Untuk programmer:**
- `CLAUDE_universal_v1.md` §4.1 + §2.1.1 Kategori #4 + §4.17: roster 15 → **13 divisi** (12 original + 📚 Knowledge Transfer); aturan tampilan "default 2 penjaga utama" diganti "**default TANPA blok** — tampilkan hanya lensa dengan temuan nyata; 13 penuh untuk keputusan besar/diminta". Disiplin anti-ngarang tetap di §8.2 (Tingkat 1); rencana-balik tetap ditagih §11 (rollback plan) + §8.2 Aturan 5.
- `LINTASAI_WORKFLOWS_v1.md` §4.1: contoh terisi, skeleton format, dan tabel pertanyaan-per-lensa ikut jadi 13.
- `lib/lang-reminder.mjs`: pengingat per-prompt kini menyebut "blok Tinjauan HANYA saat ada temuan nyata/keputusan besar" (frasa "default 2 penjaga" dihapus).
- Tes pengunci diperbarui: `tests/tingkat1-guard.test.mjs` (roster 13 + penjaga anti-hidup-kembali 2 lensa lama) + `tests/lang-reminder.test.mjs` (13 lensa + frasa temuan-nyata).
- Dokumen pendukung diselaraskan: `KEUNGGULAN_LINTASAI.md` (seksi K + Y + blok tinjauan penutup), `PERBANDINGAN_RINCI_PERDIMENSI.md` (dimensi 11), `docs/PETA_SUMBER_KEBENARAN.md`, `docs/RESEP_PERUBAHAN.md` (contoh angka-konsep).

### Diubah — AI lebih cepat membaca rujukan + 4 bug alur dibereskan (Paket A pindai babak-2)

**Untuk non-programmer:** AI di project kamu sekarang membaca buku rujukan besar **per-bab lewat daftar isi** (bukan menelan seluruh buku = hemat sampai ±44.000 token tiap kali konsultasi), dan 4 kesalahan kecil di buku panduan pemasangan/update dibereskan supaya AI tidak salah mencocokkan pilihanmu.

**Untuk programmer:**
- Aturan **pola-baca berkas rujukan besar** baru di §6: berkas >±20 KB (`LINTASAI_WORKFLOWS_v1.md` 195 KB, `MCP_SETUP.md`, `PROMPT_LIBRARY.md`) DILARANG `Read` utuh — `Grep` judul berawalan angka → `Read` per-seksi; preamble WORKFLOWS diberi peringatan judul-palsu-di-blok-contoh.
- Aturan **darurat popup** baru di §14.1 (dari insiden nyata owner): konteks pilihan wajib tampil di chat SEBELUM popup; user lapor popup bermasalah / 2× menjawab via ketikan bebas → beralih ke daftar teks bernomor, jangan ulangi popup yang sama.
- **4 bug diperbaiki:** label usang "[1] Full"/"Quick" → kanonik "[1] LENGKAP"/"[2] CEPAT" (4 titik `PROJECT_LIFECYCLE` + 2 titik `JALANKAN_KIT`); blok PowerShell sisa di `UPDATE_KIT_PROMPT_v1.md` Step 2 diganti `npx lintasai update --check-only` / `npm view lintasai version` (jalur eksternal); flag `-CleanupBackups` → `--cleanup-backups`; rujukan nomor-baris basi `POST_SETUP` → rujukan tekstual stabil.
- Diet 4 dokumen alur (total −6,1 KB per siklus baca): `JALANKAN_KIT` (cerita Tipe-B pensiun 5× → 1×, blockquote kembar, daftar pengecualian popup), `AUDIT_POST_SETUP` (cerita gelombang 6 lokasi → kanon step 5-7 + pointer; tabel contoh analogi → pointer library), `PROJECT_LIFECYCLE` (blok 5-section → rujukan `_EXAMPLE.md`; mode invocation ringkas), `UPDATE_KIT_PROMPT` (peringatan cadangan jalur npm dipindah ke Step 0 — tempat keputusannya).
- `templates/ANALOGI_LIBRARY.md` v4: +3 entri (God Component, Memory leak, Tahan Penggabungan) — kini 35 jargon; hitungan diselaraskan di semua sebutan.

### Diubah — kiriman ke client −13% (Paket B pindai babak-2)

**Untuk non-programmer:** paket yang diunduh client saat pasang/update kit jadi **13% lebih kecil & lebih cepat** — riwayat perubahan era lama dipindah ke gudang arsip (entri keamanan tetap dibawa), dan catatan internal dapur kit tidak lagi ikut terkirim.

**Untuk programmer:**
- `CHANGELOG.md` 415 KB → 160 KB: 107 entri < v1.33.0 (era pra-npm) pindah ke `CHANGELOG_ARCHIVE.md` (GitHub-only). **6 entri legacy berlabel dipertahankan UTUH** (1.30.1, 1.26.0, 1.23.3, 1.23.2, 1.9.0, 1.7.7 — enumerasi mesin `testChangelogLabel` pada heading+body) supaya banner "pasang SEGERA" client lompat-versi tetap bekerja; celah lama v1.9.0 ditutup (penanda `[SECURITY]` ditanam di body — pemindai rentang membuang heading).
- `package.json` files[]: `.github/` → hanya `workflows/validate.yml`; 11 dokumen internal dikecualikan (7 docs robot + ADR-003..006); entri registry/perujuk terkirim diberi anotasi "(internal kit — tidak ikut paket npm)" — TIDAK dihapus (robot registry tetap hijau).
- Tarball: 944.664 → 823.000 byte gzip (170 berkas); ambang penjaga `tests/package-bundle.test.mjs` diperketat 2 MB → 1 MB (alarm dini anti-bengkak).

### Diubah — 4 robot mutu yang "tidur" dibangunkan (Paket C pindai babak-2; mutu project client naik, biaya token ~0)

**Untuk non-programmer:** kit sudah lama punya beberapa "satpam" siap pakai yang tidak pernah disuruh jaga. Sekarang mereka jaga otomatis: pengecek "kunci server lupa dipasang" (penyebab web mati saat tayang tersering), pengecek "bahan baku kedaluwarsa" (library rentan dibobol), gerbang mutu otomatis di GitHub (ditawarkan saat pasang), dan layar pantau semua repo (ditawarkan saat pecah-repo).

**Untuk programmer:**
- `runEnvKeys` masuk gerbang preflight (tiap run): banding NAMA kunci `.env.example` vs `.env.local` — RAPIKAN non-blokir; nilai rahasia tak pernah tampil (dikunci tes).
- `runStackCheck` masuk gerbang `--strict` saja: tsc / `npm audit` (CVE) / ruff / bandit dkk. via `lib/stack-check.mjs` (+opsi baru `excludeTools` — eslint di-exclude anti-dobel); dibungkus RAPIKAN owner-gated (temuan alat aslinya PENTING = memblokir strict tanpa pembungkus); gagal-jaringan `npm audit` → INFO dilewati, bukan temuan palsu.
- `JALANKAN_KIT.md` 18c: popup kondisional tawaran `npx lintasai enable-preflight-ci` saat project terhubung GitHub (+ update PETA Bagian 0; catatan biaya jujur menit Actions Windows 2× di repo privat).
- `JALANKAN_KIT.md` 19b-ii + `SPLIT_REPO_MIGRATION_PROMPT_v1.md`: tawaran `npx lintasai board` (papan risiko semua repo, cuma-baca — deteksi perubahan `.env` belum aman = GENTING) setelah pecah-repo / saat multi-repo.
- `templates/github/workflows/preflight.yml`: langkah build kondisional Next.js (continue-on-error) sebelum preflight — robot anggaran-halaman kini benar-benar mengukur (dulu auto-lewat tanpa `.next/`).
- **Bug-fix bonus (ketahuan begitu robotnya dibangunkan):** `lib/stack-check.mjs` gagal memanggil alat `.cmd` (mis. `npm`) di Windows dengan Node terpasang di `C:\Program Files` — path patah di spasi saat lewat shell → temuan PALSU "alat melaporkan masalah". Path kini dikutip; `npm audit` benar-benar jalan di Windows umum untuk pertama kalinya.

### Dihapus [BREAKING] — fungsi auto-catat `KEUNGGULAN_LINTASAI.md` dicopot total

**Untuk non-programmer:** dulu kit punya aturan yang MEWAJIBKAN AI menulis-ulang satu dokumen "daftar keunggulan" raksasa (±47 KB) SETIAP kali ada fitur baru — padahal dokumen itu tak pernah dikirim ke project kamu; murni catatan internal dapur kit. Menulis-ulang buku setebal itu berulang kali = boros waktu & boros "jatah kerja" AI (token) tanpa nilai tambah buat kamu. Mulai versi ini aturan itu **dihapus total**: AI tidak lagi diwajibkan merawat dokumen tersebut. Untuk kamu efeknya positif — AI di project-mu tak lagi membuang tenaga di pekerjaan internal itu. Ditandai **BREAKING** karena mengubah perilaku baku AI (satu kewajiban dokumentasi dicabut), sesuai disiplin penomoran versi.

**Untuk programmer:**
- File dev-only `KEUNGGULAN_LINTASAI.md` dihapus (tak pernah masuk kiriman client) + aturan **§7.8** di `CLAUDE_universal_v1.md` dicopot.
- Entri KEUNGGULAN dicabut dari `KIT_VERSION_CHECKS` (`lib/consistency-check.mjs`) → `node kit.mjs bump` kini mengecap **5 berkas** (dulu 6); tes `tests/consistency-check.test.mjs` diselaraskan (5 → 4 findings).
- Rujukan dibersihkan di `CONTRIBUTING.md`, `docs/RESEP_PERUBAHAN.md`, `.github/pull_request_template.md`, `docs/PETA_SUMBER_KEBENARAN.md`, `docs/plans/POLA_REPO_AMAN.md`, `docs/architecture.md`.
- Alasan: dokumen ~47 KB yang wajib ditulis-ulang tiap fitur = boros token/waktu develop tanpa nilai unik.

### Dihapus [BREAKING] — registry "daftar isi docs" `architecture_auto.md` dicopot menyeluruh

**Untuk non-programmer:** kit dulu punya "satpam daftar isi" yang otomatis membuat & merawat sebuah daftar isi semua dokumen (`architecture_auto.md`) di project. Masalahnya: tiap kali ada dokumen `.md` ditambah/dihapus, daftar itu harus dibaca+ditulis ulang — biaya "jatah kerja" AI berulang tanpa manfaat khas, karena untuk navigasi sebenarnya cukup pakai **peta besar** (`architecture.md`, yang TETAP dipertahankan) + fitur cari kata (`Grep`). Mulai versi ini fitur daftar-isi-otomatis itu **dibuang menyeluruh** dari kit. Ditandai **BREAKING** karena mengubah perilaku baku di project client (satu berkas robot + aturannya dicabut).

**Untuk programmer:**
- Peta makro `architecture.md` **DIPERTAHANKAN**; hanya registry TOC yang dibuang.
- Kode robot dihapus dari `lib/project-manifest.mjs` (`getLintasRegistryFinding`, `invokeLintasRegistryCheck`, ref-key `registry`); wiring `runRegistryCheck` dicopot dari `tests/preflight.mjs`; file tes `tests/project-manifest-registry.test.mjs` dihapus.
- Entri deploy dicabut dari `lib/kit-files.json`, `setup-pola-b.mjs`, `install-windows.mjs` (tes install-windows: 9 → 8 berkas).
- Doktrin: **§7.4** ARCHITECTURE REGISTRY dihapus (aturan dokumentasi 4 → 3); **§7.3** READ-MINIMAL kini pakai `architecture.md` + `Grep`.
- 2 file dihapus: `docs/architecture_auto.md` + `templates/architecture_auto.md`.
- ±45 rujukan prosa dibersihkan di 13 file client (`AUDIT_POST_SETUP_PROMPT_v1.md`, `JALANKAN_KIT.md`, `LINTASAI_WORKFLOWS_v1.md`, `PROJECT_LIFECYCLE_PROMPT_v1.md`, `SPLIT_REPO_MIGRATION_PROMPT_v1.md`, `templates/_PATTERNS`, `templates/_EXAMPLE`, `PROMPT_LIBRARY.md`, `MIGRATE_TO_SUBFOLDER_PROMPT_v1.md`, `DB_SCHEMA_SCAN_PROMPT.md`, `RLS_SETUP`, `TEAM_FLOW_SKETCH`, `architecture.md`).
- Alasan: TOC auto-maintained = biaya token berulang tiap tambah/hapus `.md` tanpa nilai unik; navigasi cukup peta makro + `Grep`.

### Ditambah

- `tests/tingkat1-guard.test.mjs` — 11 tes pengunci frasa pagar Tingkat 1 (bahasa non-programmer, PRE-SEND, 8 divisi, Tinjauan, keamanan §8/§8.1/§8.2, tie-breaker §0). Sebelumnya 0 tes menjaga seksi-seksi ini — diet/penyuntingan berikutnya tak bisa diam-diam membuang pagar.
- `tests/install-anchors.test.mjs` — 10 tes pengunci anchor alur pemasangan (heading "Klarifikasi Terminologi Popup"/"Cara Tampil Popup", Popup #1-#3, label kanonik LENGKAP, larangan rujukan nomor-baris basi + label "[1] Full" usang).
- `tests/changelog-archive.test.mjs` — 5 tes penjaga arsip: entri berlabel DILARANG terarsip (pakai `testChangelogLabel` asli), 6 entri legacy tetap utuh, penanda body v1.9.0, arsip tak ikut files[]/kit-files, penunjuk arsip ada.
- `tests/preflight-robot-baru.test.mjs` — 6 tes penjaga `runEnvKeys` + `runStackCheck`: level DILARANG memblokir gerbang (selalu OK/INFO/RAPIKAN) + nilai rahasia `.env` DILARANG bocor ke laporan.

## [1.63.0] - 2026-07-09

> Rilis JEMBATAN (MENENGAH, 1.62.0 -> 1.63.0): **persiapan v2.0.0 "kit 100% Node"** — semua isi rilis ini **ADITIF & backward-compatible** (tak ada perilaku PowerShell yang dicabut). Tujuannya menyiapkan panggung sebelum v2.0.0 menghapus total PowerShell: (1) **7 penjaga mutu yang dulu cuma ada di PowerShell (Pester) kini punya kembaran Node** yang jalan di semua komputer, (2) **2 perintah Node baru** (`protect-main` pemasang kunci-gabung branch + `migrate-project-card` migrator kartu identitas lama), (3) gerbang cepat + CI kini pakai smoke **Node** (nama job dipertahankan), (4) semua updater/pemasang jalur-lama diberi **jaring pengaman Node**, dan (5) **PowerShell resmi ditandai USANG (deprecated)**. **PENGUMUMAN: v2.0.0 (BREAKING) akan MENGHAPUS TOTAL PowerShell dari kit** (±70 berkas `.ps1`/`.psd1`) — rencana lengkap `docs/plans/RENCANA_V2_HAPUS_POWERSHELL.md`. Rilis ini sendiri **BUKAN breaking**: client update aman tanpa migrasi apa pun; PowerShell masih hidup sebagai cadangan fase-jembatan. *(Kata "breaking" di entri ini hanya MENGUMUMKAN rilis mendatang — entri ini sengaja TANPA label breaking berkurung-siku, karena penjaga preflight sec. 11 mewajibkan label itu menaikkan angka BESAR; angka skema artefak tak berubah, semua tetap 1.)*

### Deprecated — PowerShell ditandai USANG (akan dihapus total di v2.0.0)

**Untuk non-programmer:** dulu kit membawa "dua mesin" untuk pekerjaan yang sama — satu mesin **Node** (jalan di semua komputer) dan satu mesin cadangan **PowerShell** (khusus Windows). Sejak jalur kerja tim sudah 100% Node, mesin PowerShell tinggal "ban serep" yang tak pernah dipakai tapi tetap harus dirawat. Mulai versi ini, ban serep itu **resmi dinyatakan USANG** — masih ada dan masih berfungsi (jadi update-mu aman), tapi **akan dicopot di versi besar berikutnya (v2.0.0)**. Yang perlu kamu lakukan: **tidak ada** sekarang; nanti saat v2.0.0 tayang, cukup update lewat cara resmi `npx lintasai update`. Skrip lama `setup-pola-b.ps1` / `update-kit.ps1` sudah diberi stempel "USANG" di dalamnya.

**Untuk programmer:**
- Header `setup-pola-b.ps1` + `update-kit.ps1` diberi tanda `[USANG / DEPRECATED sejak v1.63.0]` (dihapus v2.0.0; jalur resmi = `npx lintasai <perintah>`). Tidak ada perilaku yang berubah — hanya penanda.
- Rencana penghapusan (strategi expand-then-contract, D1–D6 disetujui owner): `docs/plans/RENCANA_V2_HAPUS_POWERSHELL.md`. Rilis jembatan ini = Fase 0 + Fase 1 rencana tersebut.

### Ditambah — 7 penjaga Pester diport ke `node:test` (assert tak turun) + 2 perintah Node baru

**Untuk non-programmer:** beberapa "satpam otomatis" yang menjaga mutu & keamanan kit dulu cuma bisa bekerja di komputer ber-PowerShell. Sekarang mereka punya kembaran yang jalan di komputer mana pun — jadi saat PowerShell dicopot nanti, tidak ada satpam yang ikut hilang diam-diam. Plus 2 tombol baru: satu untuk **memasang kunci pengaman** di jalur utama kode GitHub (biar tak bisa asal-tulis), satu lagi untuk **memindahkan kartu identitas project format lama** ke format baru dengan aman (jalan pura-pura dulu, baru sungguhan).

**Untuk programmer:**
- Port penjaga Pester → `node:test` (kembaran berdampingan, Pester lama masih hijau): `tests/modify-workflow-rule.test.mjs`, `tests/skills-divisi.test.mjs`, `tests/path-leak-check.test.mjs` (+ logika diangkat ke `lib/path-leak-check.mjs`), `tests/secret-precommit.test.mjs` (spawn bash), `tests/risk-gate.test.mjs`, `tests/package-bundle.test.mjs` (`npm pack --dry-run --json`), `tests/create-lintasai.test.mjs`, + gabungan `tests/kit-templates-guard.test.mjs` (security-guard/portfolio-registry/claude-md-loader). Aturan emas ADR-003d: cakupan assert tak turun. `CLAUDE_universal_v1.md` §7.3a kini menyebut KEDUA nama tes (Pester + Node) supaya dua penjaga hijau berdampingan; penggantian nama-Node-saja menyusul v2.0.0.
- `npx lintasai protect-main` (`lib/branch-protect.mjs` diperluas jadi penerap; port `setup-branch-protection.ps1`): pasang branch protection GitHub — **default SIMULASI**, `--apply` untuk sungguhan; prasyarat `gh` CLI + auth + admin.
- `npx lintasai migrate-project-card` (`lib/project-card-migrate.mjs`): migrasi kartu `project.lintas.psd1` → `.jsonc` (salin intent/modules/conventions), **default SIMULASI**, idempoten, cadangan ber-cap-waktu, catat `.migration-state.json`. `kit doctor` kini mendeteksi kartu `.psd1` tersisa / kartu ganda (INFO/WARN, bukan error gerbang).

### Diubah — gerbang cepat + CI pakai smoke Node; jaring pengaman jalur-lama; tutup jebakan senyap fakta-tim

**Untuk non-programmer:** pemeriksa cepat "semua beres sebelum berangkat" sekarang memakai mesin Node (bukan PowerShell) — hasil sama, tapi jalan di mana saja. Pemasang/updater versi lama pun diberi jalan-turun otomatis ke Node kalau kelak kit tak lagi bawa PowerShell, supaya tak ada yang tersangkut setengah-jalan.

**Untuk programmer:**
- `tests/smoke-portable.mjs` naik jadi gerbang smoke Node UTAMA (5 cek: sintaks `.mjs`, berkas kritis era-Node, integritas manifest rekursif, orphan refs, JSON valid) — padanan `smoke-fast.ps1`. Job CI `fast-smoke` + `smoke-setup` (`validate.yml`) diganti isinya ke Node **dengan NAMA JOB dipertahankan** (required check GitHub tetap valid). `smoke-fast.ps1` tetap hidup di `fast-smoke-ps51` + preflight selama fase-jembatan.
- `update-kit.ps1` Step 4 kini fallback ke `node setup-pola-b.mjs --force --project-root` bila `setup-pola-b.ps1` tak ada (kit Node-murni v2.0.0+) — bukan skip-dengan-WARN (D5). Cabang `.ps1` tetap dievaluasi dulu (perilaku lama non-breaking); dikunci `tests/update-kit.test.mjs`.
- `KIT_TEAM_FILES_SOURCE` (+ kembar PS `$KitTeamFilesSource`) kini membaca blok `const teamFiles = [` di `setup-pola-b.mjs` (bukan `$teamFiles` di `setup-pola-b.ps1` yang dihapus v2) — cegah 3 fakta "jumlah file tim" dilewati diam-diam saat `.ps1` hilang; kedua sisi diedit serentak (tes paritas). Tes baru: sumber fakta WAJIB ada di repo kit.

### Diperbaiki — perbaikan bebas-v2 (boleh dirilis kapan saja)

**Untuk programmer:**
- `.github/workflows/publish-create-lintasai.yml`: pakai Node 24 + berhenti `npm install -g npm@latest` (insiden gagal-terbit v1.62.0: upgrade npm global meninggalkan npm setengah-rusak → `MODULE_NOT_FOUND 'sigstore'`). Disamakan dengan pola `publish-npm.yml`.
- `templates/architecture_auto.md`: koreksi klaim basi — robot registry sudah versi Node (`lib/project-manifest.mjs`, `npx lintasai project-check`), bukan "versi Node masih dalam antrean".
- Sapu teks jalur-Node yang masih menyuruh `.ps1` ke `npx lintasai update` (`setup-pola-b.mjs` RINGKASAN AKHIR + `update-kit.mjs` saran + `bin/lintasai.js` komentar bump basi).

## [1.62.0] - 2026-07-09

> Rilis FITUR (MENENGAH, 1.61.0 -> 1.62.0): **mesin pindah-versi artefak klien** (rencana `docs/plans/STRATEGI_UPDATE_v2.md`, 5 langkah SELESAI) — kit kini tahu persis "catatan titipan" mana di project klien yang formatnya tertinggal, melaporkannya dengan jujur ("Selesai sebagian", bukan hijau palsu), update tak lagi menimpa `AGENTS.md` kustom klien, dan gerbang rilis MENOLAK perubahan format yang menyelinap tanpa label breaking (penanda perubahan-merusak) + panduan migrasi. Plus: **2 robot mutu baru** (banding kunci env sebelum online + deteksi error-ditelan-diam) + **2 aturan baru** (laporan "Selesai sebagian" §4.7 + higiene menulis dokumen §7.10), berkas aturan selalu-dimuat lebih hemat token (1253 → 1104 baris), dan petunjuk perintah kini jalur Node lebih dulu. **TIDAK ada perubahan yang merusak kompatibilitas** — semua angka skema artefak masih 1; klien update aman tanpa perlu migrasi apa pun. *(Label breaking sengaja ditulis TANPA kurung siku di entri ini — entri cuma MENCERITAKAN penjaganya, bukan menandai rilis ini breaking.)*

### Ditambah — Mesin pindah-versi artefak klien: peta versi + robot laporan-migrasi + buku-besar + penjaga label breaking (STRATEGI_UPDATE_v2 Langkah 1-5)

**Untuk non-programmer:** kit menitip beberapa "kartu catatan" di project-mu (kartu identitas project, catatan-pasang). Kalau suatu saat FORMAT kartu itu berubah, dulu tak ada yang tahu kartu siapa yang masih format lama. Sekarang lengkap pengurusannya: (1) **update tak lagi menimpa** berkas aturan `AGENTS.md` yang sudah kamu ubah sendiri — editanmu selamat; (2) kit punya **daftar resmi** "format versi berapa yang diharapkan" untuk tiap kartu; (3) ada **robot pelapor** di pemeriksa-kesehatan (`doctor`) + saat update: "Termigrasi X dari Y" — kalau ada yang tertinggal, statusnya jujur **"Selesai sebagian"** (doctor merah), bukan hijau palsu; catatannya disimpan di **buku-besar** yang selamat lintas-update; (4) ada **aturan main** mana perubahan yang wajib langsung dimigrasi vs yang boleh menyusul (ditawarkan lewat popup, kamu yang setuju); (5) lahir **`UPGRADING.md`** — buku panduan pindah-versi — dan **gerbang rilis otomatis MENOLAK** kalau ada perubahan format yang mau menyelinap tanpa label breaking + langkah migrasi + langkah SIMULASI (jalan pura-pura dulu, tak mengubah apa-apa). Semua ini pagar untuk MASA DEPAN — hari ini tak ada format yang berubah, jadi update ini aman.

**Untuk programmer:**
- **Langkah 1 (keamanan dulu):** `setup-pola-b.mjs` jalur update `--force` kini `skip` untuk `AGENTS.md` yang sudah ada (bukan backup-replace) — kustomisasi klien selamat lintas-update. Robot gerbang di-audit fail-closed: `getLintasPackageJsonDependency` (`lib/project-manifest.mjs`) melempar saat `package.json` ADA-tapi-RUSAK (bukan "0 temuan"); `lib/split-guard.mjs` folder-tak-terbaca → GENTING (bukan di-skip senyap). Tes: `tests/setup-pola-b-write.test.mjs` + `tests/split-guard.test.mjs` + `tests/project-manifest.test.mjs`.
- **Langkah 2 (Mesin 1 — peta):** `lib/expected-schema.mjs` = sumber-tunggal "kit versi ini mengharap artefak versi berapa" (kartu project + catatan-pasang, keduanya = 1). Konsumen via import: `lib/project-manifest.mjs` (pemeriksa tak lagi angka mati `>= 1`; kartu lama di bawah kit baru = TAK COCOK), `lib/manifest.mjs`, `uninstall.mjs`. Salinan yang tak bisa import (template contoh + PS cadangan) dijaga tes pengunci `tests/expected-schema.test.mjs`. Resep naik-versi-skema: `docs/RESEP_PERUBAHAN.md` Resep 9.
- **Langkah 3 (Mesin 2 — robot laporan):** `lib/migration-state.mjs` — laporan cuma-baca "Termigrasi X dari Y" (enumerasi DARI peta; artefak RUSAK memblokir, belum-ada = opsional) + buku-besar `.migration-state.json` di AKAR project (luar `.claude-kit/`, idempoten + atomik + tolak buku korup/format-lebih-baru). Tersambung `kit doctor` bagian 2c (tertinggal → ERROR "Selesai sebagian") + `update` Langkah 7 (spawn robot KIT BARU supaya peta sezaman). Node-only disengaja; `parity-check` pakai `--skip-migrasi`. Tes: `tests/migration-state.test.mjs`. Dokumen: `docs/migration-state.md`.
- **Langkah 4 (Dua Keranjang + kunci mesin):** aturan "Dua Keranjang Migrasi" di `LINTASAI_WORKFLOWS_v1.md` §4.5 (Keranjang 1 eager: naik `schema_version` wajib label breaking + Migration Steps + catat buku-besar via `recordLintasMigrationApplied`; Keranjang 2 lazy: HANYA dokumen advisory, popup per-berkas human-in-the-loop, DILARANG auto-bulk) — dikunci tes anti-rot. Penjaga preflight `checkSchemaRaiseBreaking` (`tests/preflight.mjs`, mode kit): banding peta vs rilis ber-tag terakhir (`git show`) — angka NAIK tanpa label breaking di entri CHANGELOG teratas = **GENTING** (gerbang gagal); entri baru bernilai 1 = kelahiran (sah); parser ber-cek-waras anti-buta.
- **Langkah 5 (disiplin rilis):** `UPGRADING.md` lahir di akar (panduan pindah-versi klien, terpisah dari CHANGELOG; ikut paket npm `files[]` + terdaftar `lib/kit-files.psd1`). Penjaga diperluas: Migration Steps tanpa kata "SIMULASI" → PENTING `skema-simulasi`; artefak naik tak tercatat di `UPGRADING.md` → PENTING `skema-upgrading`. Dokumen: `docs/preflight.md` v8.

### Ditambah — 2 robot mutu baru + 2 aturan kerja (banding kunci env, error-ditelan-diam, "Selesai sebagian", higiene dokumen)

**Untuk non-programmer:** (1) **Robot banding kunci env** (`npx lintasai env-keys`): sebelum app dionlinekan, robot membanding daftar NAMA "kunci pengaturan" contoh vs punyamu — kunci yang lupa diisi ketahuan SEBELUM app mati di tengah jalan; yang dibaca cuma namanya, bukan isinya (rahasia aman). (2) **Robot error-ditelan-diam** (`npx lintasai swallowed-check`): mencari kode yang "menelan" pesan kesalahan tanpa bersuara — bug jadi tak pernah kelihatan; robot ini menandainya supaya dibereskan. (3) Aturan baru: kalau sebagian pekerjaan masih menunggu keputusanmu, AI wajib lapor **"Selesai sebagian"** + daftar-centang per-temuan — bukan mencentang "SELESAI" semua. (4) Aturan menulis dokumen kit: padat & berisi, buang basa-basi — TANPA membuang analogi/penjelasan awam yang jadi ciri kit ini.

**Untuk programmer:**
- `lib/env-keys-check.mjs` (`npx lintasai env-keys`): banding NAMA kunci `.env.example` vs `.env.local` (cuma-baca, nama bukan nilai) — dipandu checklist "mau online" §11. Tes: `tests/env-keys-check.test.mjs`.
- `lib/swallowed-error-check.mjs` (`npx lintasai swallowed-check`): deteksi blok `catch`/`except` KOSONG; tersambung gerbang preflight MODE-PERINGATAN (RAPIKAN, tidak memblokir) — `docs/preflight.md` v7. Tes: `tests/swallowed-error-check.test.mjs`.
- Aturan §4.7 butir 7 (klausa "Selesai sebagian": 3 keranjang ✅ Selesai / ☑️ Diterima-dengan-alasan / ⏳ Tertunda) + §7.10 higiene anti-"slop" (buang pembuka kosong + duplikasi; JANGAN buang hedging anti-halusinasi / analogi aksesibilitas). Ketiganya adopsi selektif ide kit Willey-Labs — catatan: `docs/plans/WILLEY_BORROW_IMPLEMENTASI.md`.

### Diubah — Berkas aturan selalu-dimuat lebih hemat token + petunjuk perintah jalur Node dulu

**Untuk non-programmer:** berkas aturan yang otomatis dibaca AI tiap sesi dirapikan: kalimat kembar dipadatkan jadi satu + penunjuk, detail panjang dipindah ke "rak" yang dibaca hanya saat perlu. Hasil: tiap sesi lebih hemat "pulsa token" — dan TIDAK ada satu aturan pun yang dibuang, cuma pindah tempat. Petunjuk perintah di dokumen kini menunjuk jalur Node (yang jalan di semua komputer) lebih dulu; PowerShell jadi cadangan.

**Untuk programmer:**
- `CLAUDE_universal_v1.md` 1253 → 1104 baris (7 commit perapian: dedup salinan berulang + pindah detail §4.6/§6.3/§7.2/§7.2b/§7.4/§4.10/§4.12/§14.1/§15 ke `LINTASAI_WORKFLOWS_v1.md` on-demand; pagar §7.10: aturan wajib/analogi/blok 2-versi tak disentuh). Gerbang penuh lulus tiap commit.
- Petunjuk dokumen diarahkan ke jalur Node (Tingkat 1 migrasi PS→Node, 34 petunjuk dirapikan) + health-check §7.6 kini menyalakan `npx lintasai doctor --env` (potret lingkungan, cuma-baca). ESLint kit 0 peringatan.

### Diperbaiki — `kit doctor` tidak lagi salah-alarm "36 file missing" pada pemasangan via npm

**Untuk non-programmer:** selama ini client yang memasang kit lewat jalur npm (jalur resmi) lalu menjalankan pemeriksa kesehatan (`kit doctor`) selalu disuguhi vonis menakutkan "Kit BERMASALAH — 36 file missing" — padahal kitnya sehat. Penyebabnya: doctor menuntut berkas tes internal dapur kit yang memang **sengaja tidak dikirim** lewat paket npm. Sekarang doctor paham: semua berkas tes absen = ciri pemasangan npm yang normal (ditampilkan sebagai catatan info, bukan error); tapi kalau tesnya hilang **sebagian** (tanda ada yang terhapus) tetap dilaporkan error. Ditemukan lewat simulasi pemasangan client sungguhan sebelum rilis ini — bug lama yang sudah ada sejak versi-versi sebelumnya (v1.61.0 pun kena).

**Untuk programmer:**
- `kit.mjs` + `kit.ps1` (doctor bagian 2, cermin identik): subset **suite Pester internal** (`tests/*.Tests.ps1`) dari grup `tests` `lib/kit-files.psd1` kini *opsional-per-jalur* — SEMUA suite absen → `OK <n> file inti utuh` (tanpa suite) + 1 baris `INFO ... tidak ikut terpasang (normal untuk pemasangan via paket npm)`; suite absen SEBAGIAN → tetap `ERROR file missing` (korupsi nyata); anggota grup yang BUKAN suite (pelari tes `Run-Tests.ps1`/`preflight.mjs`/`smoke-*` — ikut paket npm) hilang → tetap ERROR. Integritas berkas yang benar-benar terpasang tetap dijaga cek manifest sha256 (bagian 2b).
- Tes pengunci baru: `tests/kit-doctor-files.test.mjs` (3 skenario: npm-sehat hijau · suite-korup-sebagian merah · pelari-hilang merah). Dibuktikan ulang end-to-end: pasang dari tarball `npm pack` ke folder kosong → `kit doctor` hijau (exit 0).

### Ditambah — Dokumen rencana: sistem feedback pembelajaran lintas-client (FASE 0, belum ada fitur aktif)

- Cetak-biru di `docs/plans/` (pipeline feedback → standar, gerbang uji standar, status + agenda, prompt client v7) + `docs/decisions/ADR-006` + peta-baca developer baru. Ini RENCANA — belum ada perilaku kit yang berubah; fitur menyusul setelah robot agregator dibangun.

## [1.61.0] - 2026-06-27

> Rilis FITUR (MENENGAH, 1.60.2 -> 1.61.0): peningkatan **keamanan & keandalan operasi** — (1) **ubah struktur database tanpa app mati** + (2) **alarm error produksi** (2 "otot otomasi" baru, disambung auto-load) + (3) **Palang Rem Otomatis kini DEFAULT NYALA** (dulu opt-in) + (4) **penegasan filosofi "Dua Tingkat Aturan"**: 8 divisi + pagar keselamatan = WAJIB, sisanya = rekomendasi yang DITAWARKAN (bukan keharusan) + framing pertumbuhan client + (5) **audit "8 divisi benar-benar sampai ke client tiap prompt"** (2026-06-28): alarm 8 divisi per-prompt (rem-mesin lunak) + 2 robot mutu kini terjangkau jalur Node + gerbang CI opt-in + 5 perapian. Tidak ada perubahan yang merusak pemakaian (template baru + rujukan aturan + pengaman aktif yang mudah dimatikan + penegasan teks, backward-compatible).

### Ditambah — Audit "8 divisi benar-benar sampai ke client tiap prompt" (2026-06-28): alarm 8 divisi + robot mutu jalur Node + gerbang CI opt-in + 5 perapian

**Untuk non-programmer:** scan menyeluruh memastikan 8 "ahli divisi" benar-benar membantu tiap kali staff ngeprompt. Hasil: tidak ada bahaya, tapi 3 hal diperkuat + 5 dirapikan. (1) **Alarm 8 divisi**: tiap kamu kirim pesan, AI kini "disenggol" mesin untuk menimbang 8 divisi + lebih waspada saat menyentuh login/pembayaran/data-pribadi/upload/struktur-database/"mau rilis" — dulu cuma "berharap AI ingat". (2) **2 alat pemeriksa mutu** (cek mutu kode tiap bahasa + cek keamanan konfigurasi AI) sekarang bisa dipanggil 1 perintah di semua komputer (dulu cuma jalan di komputer ber-PowerShell-7). (3) **Saklar otomatis opsional**: kalau mau, robot mutu bisa jalan otomatis tiap kirim kode ke GitHub. Plus 5 perapian kecil (DevOps lebih lengkap, batas-jujur untuk teknologi di luar daftar, penyelarasan teks).

**Untuk programmer:**
- `lib/lang-reminder.mjs`: hook `UserPromptSubmit` kini menyuntik **2 blok** — pengingat bahasa (lama) + **pengingat 8 divisi** (8 nama + perketat di titik risiko + "tampilkan pas-ukuran, jangan ledakkan 15 lensa"). Menutup asimetri "aturan bahasa dapat rem-mesin, 8 divisi tidak". `CLAUDE_universal_v1.md` §4.17 diselaraskan jujur ("diperkuat pengingat-mesin LUNAK", bukan klaim by-construction). Dikunci `tests/lang-reminder.test.mjs`.
- `bin/lintasai.js`: daftarkan `stack-check` + `ai-config-check` ke `COMMANDS_NODE` (`npx lintasai stack-check run --repo-root .` / `ai-config-check --repo-root .`) — SENGAJA bukan di `shouldPassProjectRoot` (robot pakai `--repo-root`, bukan `--project-root`). `LINTASAI_WORKFLOWS_v1.md` §4.14/§4.15: jalur Node jadi UTAMA, `pwsh` cadangan. Dikunci `tests/dispatcher-init-routing.test.mjs`.
- **Gerbang CI opt-in di client** (`npx lintasai enable-preflight-ci`): `templates/github/workflows/preflight.yml` (WAJIB `runs-on: windows-latest` — CLI Windows-only) + `lib/ensure-preflight-ci.mjs` (idempoten, fail-safe, tak timpa editan klien tanpa `--force`). Backstop MESIN supaya robot mutu tak cuma jalan saat AI ingat gerbang §4.6. `docs/preflight.md` v5. Dikunci `tests/ensure-preflight-ci.test.mjs`.
- 5 perapian: §4.14 batas-jujur kedalaman stack-pack (stack di luar daftar = baseline + konvensi resmi); §4.13 #6 DevOps + 3-pilar observability; klaim "tiap jawaban 2 versi" → "jawaban substantif" (Q&A pendek boleh tanpa blok 2-baris, bahasa tetap awam); nama divisi-8 di blok "Dua Tingkat Aturan" → kanonik (`Cyber Security`) + tes pengunci Pester baru (`tests/skills-divisi.Tests.ps1`).

### Ditambah — Filosofi "Dua Tingkat Aturan": 8 divisi + pagar = WAJIB, sisanya DITAWARKAN (+ framing pertumbuhan)

**Untuk non-programmer:** dulu semua aturan kit terbaca "wajib" dengan nada sama, padahal niatnya: cuma **8 ahli divisi + pagar keselamatan** yang benar-benar wajib; sisanya (gaya kode, dokumentasi, proses) cuma **disarankan** — kamu bebas pakai/lewati per project. Sekarang itu ditegaskan jelas di pembukaan aturan + halaman depan, plus penegasan bahwa output 2 versi (untuk yang belajar koding + bahasa awam) sengaja dibuat supaya kamu **makin paham sendiri dari waktu ke waktu** (non-programmer → junior-programmer), bukan selamanya bergantung.

**Untuk programmer:**
- `CLAUDE_universal_v1.md`: blok baru **"🎚️ Dua Tingkat Aturan"** (setelah §0) memisahkan **TINGKAT 1** (wajib & tak bisa dimatikan: 8 divisi §4.13 + keamanan §8/§8.1 + anti-halusinasi §8.2 + bahasa non-programmer §2.1 + konfirmasi aksi merusak §8.2-Aturan-5) vs **TINGKAT 2** (ditawarkan/opt-out per project: alur §3, DoD §4, kode §5, docs §7, DB §9, frontend §10, proses §11). §4.1: penegasan tujuan format 2-versi sebagai "tangga belajar".
- `README.md`: blok **"Janji inti — yang DIJAMIN vs yang DITAWARKAN"** di atas tabel highlight. `MULAI_DI_SINI.md`: blok awam "yang dijamin otomatis vs ditawarkan + kamu tumbuh sendiri".
- `templates/ONBOARDING.md`: 5 frasa-ajaib otot yang sebelumnya tak diumumkan kini **ditawarkan** (`cek lingkungan`/doctor, `build error`, `cek tes`, `cek keamanan AI/MCP`, `uji tampilan situs`) + butir penjaga `cek akses tim` (access-verify).
- Higiene kelengkapan: `templates/OPERASI_DATABASE_AMAN.md` + `templates/OBSERVABILITY_PRODUKSI.md` kini terdaftar di `lib/kit-files.psd1` (terjaga anti-drift + verifikasi kelengkapan saat install) + disalin ke `docs/` project (mudah ditemukan staff, selaras file panduan lain). Catatan: file FISIK sudah selalu sampai via salinan penuh jalur npm/npx; ini menutup celah pendaftaran whitelist + visibilitas docs/.

### Diperbaiki — akurasi instruksi pasca-migrasi PowerShell→Node (hasil audit kecepatan/eksekusi READ-ONLY)

**Untuk non-programmer:** beberapa "papan petunjuk" di aturan masih menunjuk alamat lama (jalur PowerShell + format file lama `.psd1`) setelah mesin kit pindah ke Node — bisa bikin AI di project Node-only menjalankan perintah yang tak nyala, lalu langkah pemeriksa otomatis terlewat diam-diam. Sudah dibetulkan menunjuk jalur Node yang benar (PowerShell jadi cadangan). Bukan crash — ini pembetulan papan petunjuk. (Audit menyeluruh mengonfirmasi: installer + 10 robot inti kokoh, nol crash/bug nyata.)

**Untuk programmer:**
- `CLAUDE_universal_v1.md` §4.6 + §6.3: perintah robot pencegah-drift kini menunjuk jalur utama Node (`npx lintasai preflight` / `node lib/consistency-check.mjs --checks-file docs/consistency-map.jsonc`); `pwsh` + `.psd1` diturunkan jadi cadangan. Cegah langkah-1 Gerbang Pra-Rilis ter-skip diam-diam di client Node-only (syarat `.psd1` tak pernah benar untuk client yang ikut wizard → menghasilkan `.jsonc`).
- `CLAUDE_universal_v1.md` §4.6: tautkan eksplisit ke §6.3 disiplin #2 — urutan tes hemat-waktu (tes terdampak dulu, suite penuh SEKALI di gerbang), cegah tafsir "jalankan seluruh tes berulang tiap edit kecil" yang melambatkan project bertes-banyak.
- `templates/architecture_auto.md`: perjelas robot registry (MISSING/ORPHAN) saat ini versi PowerShell (butuh `pwsh`); client Node-only diarahkan jaga registry manual sampai versi Node diport (backlog tercatat di `docs/PETA_SUMBER_KEBENARAN.md`).

### Ditambah — robot penjaga "daftar isi docs" (architecture_auto.md) kini jalan di jalur Node

**Untuk non-programmer:** "daftar isi" dokumen project (architecture_auto.md) dijaga robot supaya tak basi — kalau ada catatan baru lupa didaftarkan, atau link menunjuk file yang sudah dihapus, robot menegur. Dulu penjaga ini cuma jalan di jalur PowerShell; sekarang juga jalan di jalur **Node**, jadi project Node-only (tanpa PowerShell) ikut terlindungi → AI tetap **gesit menavigasi** karena daftar isinya akurat. (Menutup backlog dari audit sebelumnya.)

**Untuk programmer:**
- `lib/project-manifest.mjs`: port `getLintasRegistryFinding` + `invokeLintasRegistryCheck` (MISSING/ORPHAN) dari `project-manifest.ps1:436-521` — **SETIA** (boundary nama `auth.md`≠`oauth.md`, lewati link eksternal/parent/absolut, kecualikan indeks `architecture_auto.md`+`architecture.md`, rekursif subfolder). CLI: `node lib/project-manifest.mjs --registry`. **Paritas Node↔PowerShell terverifikasi** (output identik terhadap kit).
- `tests/preflight.mjs`: pemeriksa `runRegistryCheck` ditambah ke gerbang (mode kit + project client) — level **RAPIKAN** (TOC basi = peringatan navigasi, TAK memblokir rilis; bukan crash). Tes baru `tests/project-manifest-registry.test.mjs` (8 kasus: bersih/MISSING/ORPHAN/boundary/indeks/eksternal/subfolder/opsional).
- Higiene: daftarkan `perf-budget.md` + `BUKU_PELAJARAN_DAN_PREFLIGHT.md` ke `docs/architecture_auto.md`. Backlog di `docs/PETA_SUMBER_KEBENARAN.md` ditandai SELESAI.

### Ditambah — Operasi Database Aman: ubah struktur tanpa downtime + rollback runbook

**Untuk non-programmer:** mengubah "bentuk lemari data" (tambah/hapus/ubah kolom) saat app dipakai itu rawan bikin app error atau data hilang — bug paling fatal karena susah dibalik. Sekarang ada panduan `templates/OPERASI_DATABASE_AMAN.md` yang mengajari AI mengubahnya **pelan-pelan tanpa menutup toko** (pasang yang baru dulu → pindahkan isi → buang yang lama), plus "tombol undo" (rollback) yang disiapkan sebelum mulai. Cocok untuk Supabase tim.

**Untuk programmer:**
- `templates/OPERASI_DATABASE_AMAN.md` (baru): pola *expand-then-contract* konkret (ADD COLUMN nullable → backfill batched → `CHECK ... NOT VALID` lalu `VALIDATE` → drop lama), tabel keputusan 🟢/🟡/🔴 per operasi, rollback runbook (migrasi-pembalik vs restore snapshot), checklist pra-migrasi. Merujuk (bukan menduplikasi) `MCP_SETUP.md`/`RLS_SETUP_PROMPT.md`/`backup-schemas.yml`.
- `CLAUDE_universal_v1.md` §9: 1 baris rujukan auto-apply — saat ada permintaan ubah STRUKTUR tabel, AI muat template ini.

### Ditambah — Observability Produksi: alarm error + log terstruktur + healthcheck (wajib sebelum online)

**Untuk non-programmer:** app yang dipakai pelanggan tanpa "alarm" itu seperti toko tanpa CCTV — baru tahu kemalingan pas buka pagi. `templates/OBSERVABILITY_PRODUKSI.md` memandu pasang **alarm error** (langsung kabari kalau ada yang rusak menimpa pengguna) + **catatan otomatis** yang bisa dilacak + **detak jantung** (pantau app masih hidup) — sebelum app online.

**Untuk programmer:**
- `templates/OBSERVABILITY_PRODUKSI.md` (baru): 3 pilar (error-tracking Sentry untuk Next.js/Python, structured logging `pino` + `trace-id` tanpa secret/PII, healthcheck `/api/health` + uptime monitor) + checklist "sebelum online". Mengangkat Sentry dari `SPLIT_REPO_TOOLS_SETUP.md §12` (3 baris Tier-3) jadi standar wajib-sebelum-online.
- `CLAUDE_universal_v1.md` §11: 1 baris rujukan auto-apply — saat staff bilang "mau online"/"deploy produksi", AI ingatkan + pandu checklist ini.

### Diubah — Palang Rem Otomatis (risk-gate) kini DEFAULT NYALA (dulu opt-in default mati)

**Untuk non-programmer:** "palang besi" yang minta konfirmasi sebelum AI melakukan aksi berbahaya (hapus banyak data, `push --force`, sentuh file rahasia, format disk) dulu **default mati** — harus dinyalakan manual, jadi sering "tidur" (staff non-programmer tak inisiatif). Sekarang **otomatis nyala** tiap kit dipasang/di-update. Mode-nya cuma **bertanya** untuk aksi yang benar-benar berbahaya, jadi kerja sehari-hari tak terganggu. Gampang dimatikan kalau mau (hapus 1 blok di `.claude/settings.json`).

**Untuk programmer:**
- `setup-pola-b.mjs`: panggil `ensureRiskGateHook()` otomatis tiap init/update (cermin pola `ensureLangHook`), FAIL-SAFE (settings rusak/terkunci → dilewati, tak ditimpa) + non-blokir (gagal pasang ≠ gagal setup). Panel status akhir-setup diselaraskan.
- **Justifikasi default-on (anti-drift, didokumentasikan):** Palang Rem **MEMBATASI** AI (mengurangi risiko), BEDA dari mode-OTONOMI (co-pilot/auto-confirm §4.12) yang tetap default MATI. Maka default-nyala **selaras "keamanan dulu"** (tie-breaker #1), bukan melanggar §4.12. Diselaraskan di `CLAUDE_universal_v1.md` §8.2, `docs/risk-gate.md`, `lib/ensure-risk-gate-hook.mjs` (komentar), `KEUNGGULAN_LINTASAI.md`.
- Tetap mudah dimatikan + bisa dipasang manual `npx lintasai enable-risk-gate`. Tes `tests/ensure-risk-gate-hook.test.mjs` (unit fungsi) tetap berlaku.

### Catatan
- SEO **sengaja TIDAK ditambah template baru** — sudah lengkap (audit `WIZARD_SEO_CHECK_v1.md` + robot `perf-budget` + panduan schema.org `LINTASAI_WORKFLOWS_v1.md §4.15 #6`). Menambah = duplikasi/bloat (prinsip reuse > duplikasi §5).
- Gerbang `npm run preflight:strict` LULUS bersih (Node + Pester).

## [1.60.2] - 2026-06-27

> Rilis KECIL (patch, 1.60.1 -> 1.60.2): mengeraskan **jalur update** supaya janji "client tinggal chat 'lintasai update' → dapat fitur terbaru" benar-benar andal untuk SEMUA client. Tidak ada perubahan yang merusak pemakaian (cuma penegasan aturan + perbaikan dokumen).

### Diperbaiki — Jalur update kedap-air: eksternal/ragu otomatis pakai npm (bukan git repo privat)

**Untuk non-programmer:** dulu, kalau client chat "update kit", AI bisa memilih jalur yang mengambil versi baru dari "gudang terkunci" (repo GitHub privat) — yang **gagal** untuk client yang tidak diundang ke repo (mereka mentok di versi lama, walau aman). Sekarang aturannya jelas: client yang tidak punya akses repo / ragu **otomatis pakai jalur npm** (`npm create lintasai@latest`) yang **pasti jalan untuk siapa pun**. Jadi "chat update → dapat versi terbaru" sekarang andal untuk semua.

**Untuk programmer:**
- `CLAUDE_universal_v1.md` §4.5 (aturan AUTO-LOAD): tambah aturan pemilihan JALUR update — internal (diundang repo) → `npx lintasai update` (git clone repo privat); eksternal / tak punya akses / ragu → `npm create lintasai@latest` (npm publik). Default saat ragu = npm; kalau `npx lintasai update` gagal "tak bisa ambil dari repo" → otomatis beralih ke npm. Sebelumnya logika ini HANYA ada di `UPDATE_KIT_PROMPT_v1.md` (on-demand) — kini diangkat ke aturan inti yang selalu termuat (menutup celah "chat update mentok").
- `LINTASAI_WORKFLOWS_v1.md` §4.5: tambah "Step 0 - Pilih JALUR update" + selaraskan langkah eksekusi (Mode A step 8) dari `kit.ps1 update` (PowerShell) ke `npx lintasai update` / `npm create lintasai@latest` (Node-first; PowerShell tetap cadangan).
- `README.md`: perbaiki label repo dari "(publik)" → "(privat — repo standar tim)"; tegaskan paket npm-nya yang publik (status sebelumnya basi/menyesatkan).
- Gerbang `npm run preflight:strict` LULUS bersih (Node + Pester).

## [1.60.1] - 2026-06-27

> Rilis KECIL (patch, 1.60.0 -> 1.60.1): tambah **panduan "pasang aman"** — di mana sebaiknya kit lintasAI disimpan saat dipasang client + cara pasang yang aman. Tidak ada perubahan yang merusak pemakaian (cuma menambah 1 dokumen + penunjuknya, backward-compatible).

### Ditambah — Panduan "Pasang Aman" (di mana menyimpan lintasAI)

**Untuk non-programmer:** ada panduan baru `PANDUAN_PASANG_AMAN.md` (1 halaman) yang menjawab: kit lintasAI sebaiknya disimpan **di DALAM project** (sebagai folder `.claude-kit/`) lalu disimpan ke git — BUKAN di folder terpisah di luar project. Kalau ditaruh di folder terpisah, aturan AI tidak pernah ikut terbaca ("mati-suri"). Panduan ini juga berisi langkah pasang aman ke project yang sudah punya berkas sendiri + saran untuk project besar (mulai 1 repo dulu, pecah nanti).

**Untuk programmer:**
- Tambah `PANDUAN_PASANG_AMAN.md` di akar kit + daftarkan ke `package.json` files[] (ikut terkirim saat client pasang via npm) + 1 baris penunjuk di README "Peta Keputusan".
- Lahir dari kasus nyata: client memasang kit di folder terpisah (di luar project) sehingga pemuat `CLAUDE.md` (yang `@import` ber-alamat relatif `./.claude-kit/CLAUDE_universal_v1.md`) tidak nyambung -> aturan tak ter-load.
- Gerbang `npm run preflight` LULUS bersih (Node + Pester).

## [1.60.0] - 2026-06-27

> **[SECURITY]** Rilis KEAMANAN (urgensi terpisah dari ukuran). Naik MENENGAH (1.59.0 -> 1.60.0): mengeraskan **alur rilis kit ke npm** — pindah ke **npm Trusted Publishing (OIDC)** sehingga rilis **tanpa kunci/token** sama sekali. Tidak ada perubahan yang merusak pemakaian (backward-compatible) — yang berubah cuma cara kit ini diterbitkan, bukan cara kamu memakainya.

### Diperbaiki (Keamanan) — Rilis tanpa-kunci (OIDC Trusted Publishing)

**Untuk non-programmer:** rilis kit ke "toko" npm dulu pakai "kunci rahasia" (token) yang bisa dicuri + kadang bikin error login (E401/OTP). Sekarang rilis pakai sistem **tanpa kunci** — npm cuma percaya rilis yang datang langsung dari robot GitHub repo ini. (Stempel anti-palsu "provenance" belum dinyalakan karena itu hanya untuk repo publik, sedangkan repo ini private — bisa dinyalakan nanti kalau repo dijadikan publik.)

**Untuk programmer:**
- `.github/workflows/publish-npm.yml` + `publish-create-lintasai.yml` (job publish): tambah `permissions: id-token: write`, naikkan Node 20 -> 22 + `npm install -g npm@latest` (OIDC Trusted Publishing butuh npm >= 11.5.1 / Node >= 22.14), **hapus `NODE_AUTH_TOKEN`/`NPM_TOKEN`** (OIDC tanpa rahasia jangka-panjang).
- `publishConfig.provenance` tetap `false` di kedua paket — npm provenance hanya didukung untuk repo PUBLIK; repo ini private (sempat dicoba `true`, gagal `E422`). Bisa dinyalakan kalau repo dijadikan publik.
- Dokumen status diselaraskan (`SECURITY.md`, `docs/SIGNED_RELEASE.md`).
- Gerbang `npm run preflight` LULUS bersih (Node + Pester).

**LANGKAH OWNER (agar tetap aman):** setelah rilis OIDC terbukti jalan, hapus secret `NPM_TOKEN` dari GitHub (jalur rilis lama berbasis token tidak lagi diperlukan).

## [1.59.0] - 2026-06-26

> Rilis FITUR. Naik MENENGAH (1.58.0 -> 1.59.0): menyalakan 6 "penjaga" hasil audit "apakah manfaat lintasAI benar-benar dirasakan client?" (wizard Buku Induk akses + Palang Rem 1-langkah + pencegah-drift + verifikator akses + SEO-check + perf-budget) — semua READ-ONLY/aman + auto-skip anggun kalau tak relevan + dikunci tes — ditambah penyempurnaan internal yang menumpuk sejak 1.58.0 (Compaction, `kit doctor --env`, konsolidasi helper, dll). Tidak ada perubahan breaking.

### Ditambah — Nyalakan 6 "penjaga" audit: wizard Buku Induk akses + Palang Rem 1-langkah + pencegah-drift + verifikator akses + SEO-check + perf-budget

Lanjutan audit "apakah manfaat lintasAI benar-benar dirasakan client?" — menutup SEMUA usulan top (yang DITUNDA: RLS-Guard Supabase, butuh kredensial live). Tiap fitur READ-ONLY/aman + auto-skip anggun kalau tak relevan + dikunci tes.

- **👨‍💻 Programmer:**
  - **Wizard Buku Induk akses** — `lib/portfolio-write.mjs` (pasangan `portfolio-read.mjs`): menulis `lintasai-portfolio.yml` dari data wawancara AI + validasi keamanan (tolak rujukan rusak / anggota ber-baris-baru; tandai brankas dibagi ke kelompok besar) + baca-balik. Naskah `templates/WIZARD_BUKU_INDUK_v1.md`. Menutup celah Buku Induk akses tak pernah terbuat.
  - **Palang Rem 1-langkah** — `lib/ensure-risk-gate-hook.mjs`: deep-merge hook PreToolUse risk-gate ke `.claude/settings.json` (idempoten + fail-safe + tulis-atomik, OPT-IN). Perintah `npx lintasai enable-risk-gate`. `docs/risk-gate.md` v3.
  - **Pencegah-drift** — `templates/WIZARD_PENCEGAH_DRIFT_v1.md`: AI mengisi `docs/consistency-map.jsonc` dari fakta NYATA project (BUKAN auto-salin contoh yang memicu alarm palsu); robot `consistency-check.mjs` yang sudah ada jadi penjaganya.
  - **Verifikator akses** — `lib/access-verify.mjs` (READ-ONLY): banding tim-akses GitHub-nyata vs Buku Induk + audit-log; fetcher injectable (teruji tanpa `gh`); anti rasa-aman-palsu (gh gagal → BERHENTI, exit≠0); tanpa fungsi mengubah izin. Perintah `npx lintasai access-verify` (butuh `gh` + organisasi GitHub).
  - **SEO-check** — `templates/WIZARD_SEO_CHECK_v1.md`: naskah AI audit SEO paham framework (Next App/Pages/HTML), memisahkan "hilang" vs "diwarisi layout" (anti alarm palsu) — sengaja BUKAN robot regex.
  - **Perf-budget** — `lib/perf-budget.mjs`: baca manifest build `.next` → perkiraan ukuran JS per route vs anggaran (default 500 KB), auto-skip kalau belum build; ikut `preflight` (RAPIKAN). Perintah `npx lintasai perf-budget`. `docs/perf-budget.md`.
  - 4 robot baru didaftarkan di `kit-files.psd1` (node_lib, dikunci = persis `lib/*.mjs`) + dispatcher `bin/lintasai.js`. +37 tes Node (total 666 lulus) + 273 Pester relevan; lint + robot konsistensi bersih.
- **🙂 Non-Programmer:** 6 "alat penjaga" yang tadinya cuma rencana kini nyala + bisa dipakai cukup dengan mengetik ke AI: (1) **"buatkan Buku Induk akses"** — AI mewawancaraimu lalu menulis sendiri catatan siapa boleh akses repo mana (kamu tak menyentuh format teknis); (2) **"nyalakan Palang Rem risk-gate"** — pasang rem-otomatis yang minta konfirmasi sebelum aksi berbahaya, tanpa merusak setelananmu; (3) **"aktifkan pencegah-drift"** — AI membuat daftar "angka yang harus selalu sama di banyak berkas" supaya tak ada yang lupa diganti; (4) **"cek akses"** — robot membandingkan siapa yang benar-benar bisa akses repo di GitHub vs catatanmu (cuma melapor, tak mencabut); (5) **"cek SEO"** — AI mengaudit SEO halaman sesuai teknologi situsmu; (6) **"cek ukuran halaman"** — menghitung berat tiap halaman vs batas wajar. Semua aman (cuma melihat / minta izin dulu) + tak menghentikan kerjamu.

### Ditambah/Diperbaiki — Quick Win "nyalakan penjaga": secret-hook tutup-celah + tombol `board` + panel STATUS PENJAGA + lembar Kalimat Ajaib

Audit "apakah manfaat lintasAI benar-benar dirasakan client?" (2026-06-26) menemukan banyak penjaga sudah dibangun tapi "tidur" (default mati / belum ada tombol / belum diperkenalkan). 4 perbaikan ringan menyalakannya — menumpuk di [1.58.0], tanpa bump versi.

- **👨‍💻 Programmer:** (1) `setup-pola-b.mjs` pasang ulang `installSecretHook` SETELAH `git init` di sesi yang sama (flag `secretHookDeferred`, panggil ulang sesudah `setupGitIdentity`) → tutup celah-bocor `.env` saat repo baru dibuat (sebelumnya hook dilewati lalu tak dipasang sampai update berikutnya). (2) `bin/lintasai.js` daftarkan perintah `board` (`npx lintasai board`) → `lib/repo-board.mjs` (sudah ada `main()`, tinggal entri dispatcher + help). (3) `setup-pola-b.mjs` fungsi baru ter-export `buildGuardStatusLines()` + panel "STATUS PENJAGA (nyala vs belum)" di `printFinalSummary` → cek deterministik cuma-baca status secret-hook/consistency-map/risk-gate/Buku-Induk + 1 kalimat cara nyalakan tiap yang BELUM. (4) `templates/ONBOARDING.md` (v2→v3) bagian baru "🪄 Kalimat Ajaib untuk AI" (frasa pemicu: lintasAI skill/audit/refactor bertingkat/compaction/skill <bidang>/update kit/mode co-pilot/lanjutkan setup) + 1 baris pengingat frasa di penutup pemasangan. Tes: +4 + 2 assert di `tests/setup-pola-b-write.test.mjs` (632 lulus, lint bersih). Semua cuma-baca + idempoten + fail-open; tak ada perubahan breaking.
- **🙂 Non-Programmer:** 4 perbaikan kecil yang "menyalakan penjaga yang tadinya tidur": (1) penjaga rahasia kini terpasang juga di saat paling rawan (pas repo baru dibuat) — tutup lubang bocor password/kunci `.env`; (2) tombol baru `npx lintasai board` → lihat kondisi SEMUA repo tim dalam 1 layar (mana yang belum dikirim ke server / `.env` belum aman); (3) tiap pasang kit muncul daftar "penjaga mana yang sudah NYALA vs BELUM + cara menyalakannya" (seperti lampu indikator dashboard mobil); (4) lembar "kalimat ajaib" supaya staff tahu fitur terkuat tinggal diketik ("lintasAI skill", "audit", dll). Efek baru terasa di project staff setelah update kit + buka chat baru.

### Ditambah — Compaction (§4.18): rapi-rapi aman berkas yang menumpuk seiring waktu

Berkas yang tumbuh tiap sesi (daftar-isi memori `MEMORY.md`, registry dokumen `architecture_auto.md`) lama-lama membengkak + melenceng (daftar-isi tak lagi sinkron dengan berkasnya) → lambat dibaca + ada link menggantung. Fitur baru "Compaction" memberi AI di tiap project klien protokol **aman** untuk merapikannya — lahir dari kasus nyata daftar-isi memori membengkak ke 59 KB (cuma sebagian termuat).

- **👨‍💻 Programmer:** stub **§4.18** baru di `CLAUDE_universal_v1.md` (auto-load, jejak kecil) + detail di `LINTASAI_WORKFLOWS_v1.md` §4.18. Pemicu "compaction" (+ ucapan biasa "padatkan/rapikan berkas"); AI juga *menawarkan* saat melihat index membengkak/melenceng. Protokol 5-langkah WAJIB urut: tentukan sasaran → cadangan ber-tanggal → padatkan ringkasan (detail TAK dibuang, pindah ke berkas sumber) → buktikan dengan mesin cuma-baca (jumlah entri tak berubah + 0 link menggantung + 0 berkas tersesat) → lapor jujur (terbukti-di-sini vs efek-di-chat-baru). Larangan: jangan buang isi, jangan sentuh logika kode (beda dari §4.11 refactor), verifikasi cuma-baca (§8.2 Aturan 3), aksi merusak tetap konfirmasi (§8.2 Aturan 5). Tes pengunci anti-rot `tests/compaction-rule.test.mjs`. Tidak ada perubahan kode/robot — fitur = aturan + protokol. Tanpa bump versi (entri menumpuk di bawah header [1.58.0] sesuai konvensi branch rilis).
- **🙂 Non-Programmer:** sekarang AI bisa "rapi-rapi berkas yang makin gemuk seiring waktu" dengan aman — ketik "compaction" (atau "rapikan berkas"). Yang dijaga: **isi tak pernah dibuang** (cuma diringkas + dirapikan), **dicadangkan dulu** biar bisa dibalik, dan **dibuktikan mesin** kalau tak ada yang hilang. 🏢 Seperti merapikan daftar-isi buku tebal biar muat 1 halaman — isi bab-nya tetap utuh, difoto-copy dulu sebelum mulai, dicek sesudah biar tak ada bab yang nyasar.

### Disederhanakan — Aturan komunikasi output: cukup penjelasan bahasa awam (analogi 3-lapis tidak lagi wajib)

Atas keputusan owner (2026-06-25): SEMUA output AI ke user (jawaban, narasi antar-langkah, isi popup, checklist, blok Tinjauan lintasAI Divisi, finding audit) **tidak lagi WAJIB** menyertakan blok "3-lapis analogi" (🏢 sehari-hari + 📱 tools digital + 🎯 contoh konkret) maupun "contoh konkret" terpisah.

- **👨‍💻 Programmer:** kewajiban diturunkan jadi "jargon dijelaskan dengan bahasa awam 1 kalimat; 1 analogi singkat OPSIONAL". Format 2 sudut pandang 👨‍🎓 Junior-programmer + 🙂 Non-Programmer di §4.1 **dipertahankan**. Disunting di `CLAUDE_universal_v1.md` (§2.1, §2.1.1, §4.1, DoD §4, daftar larangan §12), `LINTASAI_WORKFLOWS_v1.md` (style guide audit §4.4 + catatan Reference Card), `AUDIT_POST_SETUP_PROMPT_v1.md`, `POST_SETUP_CHECKLIST_PROMPT_v1.md`, `KEUNGGULAN_LINTASAI.md`, `templates/ANALOGI_LIBRARY.md` (pengantar — **tabel 32 jargon tetap** sebagai sumber analogi OPSIONAL) + label `templates/INDEX.md`/`setup-pola-b.ps1`. Tidak ada perubahan kode/perilaku robot; tujuan inti (jargon tidak dibiarkan mentah, tetap mudah dipahami non-programmer = tie-breaker §0 #3) TETAP.
- **🙂 Non-Programmer:** sekarang penjelasan AI lebih ringkas — cukup 1 kalimat bahasa awam tiap istilah teknis, tidak lagi wajib 3 versi perumpamaan sekaligus. Kalau 1 perumpamaan membantu, AI masih boleh pakai (tidak dipaksa). Yang penting tetap: AI **tidak boleh** menjawab pakai istilah teknis mentah. Efek baru terasa di project staff **setelah update kit + buka chat baru**.

### Ditambah — `kit doctor --env`: Pemeriksa Lingkungan Setara (menutup akar "di dev jalan, di client beda")

Keluhan berulang "apa yang jalan/terlihat di komputer kami terasa BEDA di komputer client" berakar pada **lingkungan eksekusi yang tak pernah disetarakan**: `kit doctor` lama cuma memeriksa berkas kit + keasliannya, **buta** terhadap versi Node/PowerShell/OS/Git + ada-tidaknya library di mesin client. Robot baru `lib/env-check.mjs` + flag `kit doctor --env` menutup celah ini (Quick Win #1 dari panel desain "standar profesional", owner-pilih 2026-06-25).

- **👨‍💻 Programmer:** robot deterministik `lib/env-check.mjs` (baca `process.version`/`os.release()`/`$PSVersionTable`/`git --version`, cek `node_modules`+lockfile via `getPackageManager`, `.env.local` cuma cek-ada) → menilai versi Node vs `engines.node` project (default `>=18`). Diintegrasikan **opt-in** di `invokeDoctor` (`kit.mjs`): tanpa `--env`, `kit doctor` tetap **byte-identik** dengan cadangan `kit.ps1` (gerbang output-identik ADR-003); dengan `--env`, menambah blok "Lingkungan eksekusi (parity)" + ikut hitungan `Result`. Reuse `getPackageManager`/`stripBom` (anti-duplikasi); terdaftar di `kit-files.psd1` (`node_lib`) → ikut cek-keaslian + tarball. 16 tes (`tests/env-check.test.mjs`) termasuk **kunci-keamanan**: output dipastikan TIDAK memuat hostname/username/jalur absolut/isi `.env` (§8.1 #6). Spawn pakai array-args + `-ExecutionPolicy Bypass` + timeout 5 dtk + **fail-honest** (gagal deteksi → "tidak terdeteksi", bukan diam-diam OK). Fitur Node-only (arah Strangler Fig). Dok: `docs/env-check.md`.
- **🙂 Non-Programmer:** sekarang ada "lampu indikator dashboard" untuk komputer client — ketik `doctor --env`, kit memotret versi Node/PowerShell/Windows + cek library sudah terpasang, lalu menunjuk **sumber beda** dalam bahasa awam (mis. "Node kamu v16, project minta minimal v18 — naikkan dulu"). 🏢 Seperti memeriksa oven sebelum menyalahkan resep: kalau ovennya beda suhu, kuenya bantet bukan karena resepnya salah. Tidak mengubah apa pun (cuma membaca) + tidak pernah membocorkan password/isi rahasia.

### Ditambah — Cap lingkungan acuan di `project.lintas.jsonc` (pelengkap `doctor --env`)

Pelengkap Quick Win #1: saat pasang, kit kini merekam "cap lingkungan" (versi Node + platform saat itu) ke kartu identitas `project.lintas.jsonc`. `kit doctor --env` membacanya otomatis → bisa menunjuk **sumber beda** lebih tajam: "kit ini disetel di Node 20, komputermu Node 16".

- **👨‍💻 Programmer:** `getLintasDerivedEnvironment()` (`project-manifest.mjs`) merekam `{recorded_node, recorded_node_major, recorded_os}` dari `process.version` AKTUAL saat `writeLintasProjectManifestIfMissing` jalan (bukan ditulis tangan → anti "no quote no claim"). Blok `environment` opsional: kartu lama tanpa blok tetap terbaca (`null` = fitur menyala mulus saat kartu baru, project lama tak error). `env-check.runEnvCheck` auto-baca via `readLintasProjectManifest` (reuse, tak menduplikasi parser `.jsonc`); major di-parse inline di `project-manifest` (cegah lingkar-impor ke `env-check`). 6 tes baru (termasuk kunci-keamanan: kartu tak bocorkan hostname/username). Node-only (`.jsonc`; penulis PowerShell `.psd1` sengaja beda, ADR-003a).
- **🙂 Non-Programmer:** kit sekarang "mencatat versi lingkungan" saat dipasang (versi Node waktu itu), supaya kalau nanti ada yang terasa beda, bisa langsung membandingkan "dulu disetel di Node 20, sekarang kamu Node 16 — mungkin ini sebabnya". Cuma nomor versi, tidak pernah mencatat nama komputer/identitas.

## [1.58.0] - 2026-06-24

> Rilis FITUR + KEAMANAN. Naik MENENGAH (1.57.x -> 1.58.0): mode microservice jadi warga kelas satu + penegak Bahasa Indonesia kini sampai ke project klien. Mengandung 1 perbaikan **[SECURITY]** (celah robot .env; disarankan update). Tidak ada perubahan breaking.

### Diperbaiki — Pengalaman update klien (dari audit kesiapan rilis)

Audit kesiapan rilis (2026-06-25) menemukan 3 ganjalan pada alur **update klien** yang diperbaiki sebelum rilis:

- **👨‍💻 Programmer:** (1) **Banner [SECURITY] hilang diam-diam** — `testChangelogLabel`/`Test-LintasChangelogLabel` (update-kit.mjs/.ps1) hanya mengenali label tepat setelah penanda heading, sehingga gaya judul `### Diperbaiki [SECURITY]` LOLOS deteksi → peringatan "pasang SEGERA" tak muncul saat update. Detektor diperluas (kenali `[LABEL]` di mana pun dalam baris heading) + heading entri [SECURITY] dirapikan ke `### [SECURITY] ...` (kompatibel dengan detektor v1.57.1 yang men-scan saat klien update) + tes pengunci di kedua sisi (Node + Pester). (2) **Pesan error update jadi membimbing** — saat gagal `ls-remote`/`clone` (repo privat belum diberi akses / Git belum terpasang) kini muncul 3 kemungkinan penyebab + langkah konkret, bukan "masalah jaringan?" yang menyesatkan. (3) Instruksi pasca-update + `UPDATE_KIT_PROMPT_v1.md` tak lagi menyuruh edit field versi `AGENTS.md` yang sudah dihapus (versi dibaca otomatis dari baris atas CHANGELOG) + prasyarat update (Git terpasang + diundang ke repo) ditulis jelas. Gerbang preflight strict hijau (Node 571, Pester 691, 0 GENTING/PENTING/RAPIKAN).
- **🙂 Non-Programmer:** "tombol update" dirapikan: (1) lampu peringatan keamanan yang dulu gagal nyala gara-gara salah tata-letak judul kini menyala benar (🏢 seperti surat recall mobil yang label "URGENT"-nya kembali terbaca); (2) kalau update gagal, pesannya kini menjelaskan "kenapa + apa yang harus dilakukan" (bukan cuma "gagal"); (3) panduan update tak lagi menyuruh isi nomor versi manual yang gampang basi.

### Diperbaiki — `npm create lintasai` gagal memasang dari paket npm (pemasang mewajibkan berkas tes yang dibuang dari tarball)

Uji-nyata dari tarball npm (2026-06-25) menemukan bug **GENTING**: pemasang menolak install/re-install dari paket npm karena memeriksa kelengkapan terhadap daftar yang masih mewajibkan ~37 berkas tes internal (`*.Tests.ps1`) — padahal "ramping tarball" (di rilis ini juga) sengaja membuangnya. Akibatnya `npm create lintasai` GAGAL "Kit tidak lengkap" untuk **SEMUA** client. Lolos gerbang karena gerbang jalan dari repo (yang punya berkas tes), bukan dari tarball.

- **👨‍💻 Programmer:** `setup-pola-b.{mjs,ps1}` kini TIDAK lagi memverifikasi grup `tests` sebagai "wajib ada" (berkas tes = internal dev, tak dikirim ke client; `kit-files.psd1` tetap mendaftarnya untuk integritas dev, dijaga `install-mapping-sync.Tests.ps1`). 2 penjaga anti-regresi: (a) `package-bundle.Tests.ps1` — tiap berkas wajib pemasang (grup non-tests) WAJIB ada di tarball; (b) `npx-init.Tests.ps1` — mock npm kini akurat (buang berkas tes seperti `files[]`) supaya bug "pemasang wajibkan berkas tak-dikirim" tertangkap end-to-end. Diverifikasi end-to-end: re-install v1.57.1→v1.58.0 dari tarball BERHASIL (exit 0), identitas staff (`.staff-profile.md`) + AGENTS.md custom dipertahankan.
- **🙂 Non-Programmer:** dulu pasang/pasang-ulang lewat `npm create lintasai` langsung error "Kit tidak lengkap" — gara-gara kit mencari alat-uji pabrik yang sengaja tidak dikirim ke pelanggan. Sekarang diperbaiki + dipasang 2 alarm otomatis biar tak terulang. 🏢 Seperti toko yang berhenti menolak pembeli cuma karena kardus tak berisi buku servis pabrik — buku itu memang bukan untuk pembeli.

### Ditambah — Doktrin Berjenjang 8 Divisi (§4.17): "8 divisi dipaksa tiap tugas, atau natural?"

Owner bertanya untuk profil tim non-programmer yang membangun website/app bermodal prompt biasa: lebih baik 8 divisi (§4.13) **dipaksa tiap tugas** atau **dibiarkan natural**? Jawaban kit: **berjenjang** — bukan salah satu ekstrem.

- **👨‍💻 Programmer:** blok **§4.17** baru di `CLAUDE_universal_v1.md` (auto-load) menyatukan §1+§4.1+§4.6+§4.13 jadi satu setelan: 8 divisi selalu *dipertimbangkan* (jaring pengaman non-programmer) tapi kedalaman/pelaporan pas-ukuran (§4.1 default 3-5 lensa); 4 lensa **wajib digali dalam** (Keamanan/Integritas-DB/Aksesibilitas-WCAG/Adversarial) karena tak-kasat-mata + tak bisa diaudit staff non-coding; perketat otomatis di pemicu risiko (login/bayar/PII/upload/halaman-publik/skema-DB/rilis); "periksa penuh" di gerbang pra-rilis §4.6, bukan tiap edit; anti-teater (§8.2 Aturan 3b "nol temuan itu sah"). Penegakan = kepatuhan-AI (bukan rem-mesin) → ditaruh di file auto-load. Tanggal header file-universal + KEUNGGULAN diselaraskan ke 2026-06-25 (§7.8). Nomor §4.17 dipilih karena §4.16 sudah dipakai (Urutan Bangun-Fitur).
- **🙂 Non-Programmer:** kit sekarang punya aturan tegas "kapan 8 ahli kerja keras, kapan santai" — biar hasil tetap profesional tanpa lambat/melelahkan. Yang selalu digali serius = 4 hal yang kamu tak bisa cek sendiri (keamanan, kerapian data, ramah-disabilitas, kejujuran-bukti); dikencangkan otomatis saat menyentuh hal berisiko (login/bayar/data pribadi/mau online). 🏢 Seperti standar keselamatan pabrik: helm selalu dipakai, inspeksi penuh sebelum mesin produksi nyala — bukan tiap geser kursi.

### Diperbaiki — Janji "starter" yang link-nya mati + ramping paket npm (audit kejujuran)

Audit kesiapan (2026-06-24) menemukan 2 hal yang merugikan klien: (1) `templates/PROJECT_STARTER_TEMPLATES.md` menyuruh `git clone` 4 repo starter yang **belum diterbitkan** (semua balik `repository not found`) — staff yang ikut dokumen langsung kena error tak-terdiagnosis; (2) paket npm mengirim **77 berkas tes internal kit** (~640KB) yang tak berguna bagi klien.

- **👨‍💻 Programmer:** (a) Dokumen starter ditandai status jujur ("🚧 Rencana, repo belum tersedia") + perintah `git clone <404>` diganti jalur yang pasti jalan hari ini (`npx create-next-app` / `create-turbo` → `npm create lintasai`). Banner peringatan di atas daftar template. (b) `package.json` files[] kini mengecualikan `!tests/*.test.mjs` + `!tests/*.Tests.ps1` (264 → 187 berkas tarball); **infra preflight tetap ikut** (`tests/preflight.mjs` + runner + smoke) supaya `npx lintasai preflight` di project klien tetap jalan. Penjaga `tests/package-bundle.Tests.ps1` diperkuat: kunci `preflight.mjs` WAJIB ikut + tes internal WAJIB tidak ikut. Gerbang preflight penuh hijau (Node 558, Pester 689, 0 GENTING/PENTING/RAPIKAN).
- **🙂 Non-Programmer:** dulu brosur kit menyuruh "ambil paket contoh dari sini" padahal tokonya belum buka — yang ikut langsung kena jalan buntu. Sekarang ditulis jujur "paket contoh belum ada, ini cara bikin sendiri yang pasti jalan". Plus, paket pemasangan dirampingkan: berhenti mengirim 77 berkas alat-uji internal yang cuma berguna buat kami, bukan buat kamu — seperti **beli HP tapi tak perlu dikirimi alat servis pabriknya**. Fitur cek-kesehatan project (preflight) tetap utuh.

### Ditambah — Mode microservice (varian shared-database) jadi warga kelas satu

Owner ingin membangun project website/app dengan pola microservice sesuai profil tim (banyak engine rahasia -> 1 backend penggabung -> 1 dashboard, berbagi 1 database multi-schema). Kit kini mengenali + mendukung pola ini.

- **👨‍💻 Programmer:** (a) `lib/project-detect.{mjs,ps1}` mengenali repo microservice (engine/dashboard/core) lewat penanda -> tak salah menawarkan pecah-ulang (paritas PS<->Node, 45 tes). (b) Template aturan per-repo baru `templates/split-agents/ENGINE.md` + `DASHBOARD.md` (Mode 2); `BACKEND.md` diberi catatan peran AGGREGATOR/Backend-for-Frontend + disclaimer "angka staff = contoh". (c) `SPLIT_REPO_PREPROVISION_v1.md` + `docs/plans/POLA_REPO_AMAN.md` jadi sumber-kebenaran ke klien; `POLA_REPO_AMAN.md` ikut terbit ke paket. (d) Larangan frontend colok Supabase langsung dari browser (cegah tembus RLS). Label jalur "project kosong -> 6-10 repo" tetap jujur **BETA**; jalur "monorepo -> 3-split" = matang.
- **🙂 Non-Programmer:** sekarang kit paham cara membangun aplikasi pakai pola "banyak kotak kecil yang kerja bareng" (microservice) — tiap algoritma rahasia di gudang (repo) sendiri, satu backend penggabung, satu tampilan. 🏢 Seperti dapur restoran: tiap koki spesialis punya meja sendiri (resepnya aman), pelayan (backend) menggabung jadi 1 piring untuk tamu (dashboard). Jalur dari project KOSONG masih ditandai **BETA** (uji dulu); jalur dari project yang SUDAH JADI sudah matang.

### Diperbaiki — SSOT topologi repo: angka "berapa repo" diluruskan + dijadikan 1 sumber

Scan owner (2026-06-24, lewat "lintasAI skill") menemukan drift: `docs/plans/POLA_REPO_AMAN.md` (paling matang) bilang **2 repo cukup, `shared` opsional** + "jumlah repo ikut wilayah rahasia + tim, bukan angka target", TAPI `SPLIT_REPO`/`JALANKAN_KIT`/`KEUNGGULAN`/`README` masih pakai angka kaku "3 repo" + "6-10" (bahkan "5/6/7"). Pola "satu berkas diubah, yang lain lupa ikut".

- **👨‍💻 Programmer:** `POLA_REPO_AMAN.md` ditetapkan **SUMBER TUNGGAL (SSOT) topologi** + aturan emas jumlah repo; angka kaku di SPLIT_REPO (Mode Selector) / JALANKAN_KIT (peta-langkah + Popup #3 + tabel + Bagian 5c) / KEUNGGULAN / README diganti prinsip "2-3 / ikut wilayah rahasia" + rujuk SSOT. Penjaga anti-drift: baris topologi di `docs/PETA_SUMBER_KEBENARAN.md` (Tabel C) + Resep 7 di `docs/RESEP_PERUBAHAN.md`. Jenis SSOT = "hapus salinan angka → rujuk prinsip" (BUKAN robot — angka topologi tak punya 1-sumber bisa-dihitung + pola "3 repo" ambigu → robot = alarm palsu). + glossary `branch-by-abstraction` & `parallel-change` (`LINTASAI_WORKFLOWS_v1.md` §13 + sinkron `CLAUDE_universal_v1.md` §13) + tautan resep aman di blok refactor 🔴. Gerbang preflight hijau (Node 570, Pester 689, 0 GENTING/PENTING/RAPIKAN). Hanya dokumen, tak ada perubahan kode.
- **🙂 Non-Programmer:** dulu aturan "berapa repo" ditulis beda-beda di banyak berkas (satu bilang 2, lain 3, lain 6-10) → bikin bingung + saling bertentangan. Sekarang ditulis di **1 tempat** (`POLA_REPO_AMAN.md`; yang lain menunjuk ke sana) + diluruskan: jumlah repo = sesuai kebutuhan nyata (berapa "wilayah rahasia" + berapa kelompok staff), BUKAN angka paku-mati. 🏢 Seperti 1 nomor HP disimpan sekali di kontak, bukan diketik ulang di banyak catatan yang gampang salah.

### [SECURITY] Diperbaiki — Robot anti-bocor `.env` tak lagi lolos kredensial asli ber-host "example"

Robot penjaga `lib/split-guard.mjs` (anti-bocor rahasia saat pecah-repo) punya celah: kata petunjuk "ini cuma contoh" (mis. "example") dicocokkan sebagai potongan di SELURUH nilai -> URL database berisi kredensial ASLI ikut di-suppress kalau host-nya kebetulan mengandung "example".

- **👨‍💻 Programmer:** penanda-placeholder kini dicek pada **PASSWORD** URL DB saja (+ host lokal), bukan seluruh nilai (`scanEnvLines` + helper `passwordLooksLikePlaceholder`). `db.example.com` dengan password acak asli kini KETAHUAN (GENTING); contoh dokumen sah (`user:pass@your-db.example.com`) tetap lolos; vendor key (AWS `AKIAIOSFODNN7EXAMPLE`) sengaja TIDAK lewat jalur ini (tetap di-suppress). +6 skenario tes pengunci (43 tes split-guard).
- **🙂 Non-Programmer:** satpam kunci rahasia tadinya punya titik buta — kalau alamat database mengandung kata "example", ia mengira itu cuma contoh lalu membiarkannya lewat, padahal isinya kunci asli. 🏢 Seperti satpam yang tak memeriksa siapa pun yang bilang "ini cuma contoh". Sudah ditambal + dikunci tes. (Untuk model tim ini risikonya kecil karena frontend nol-akses-DB; tetap diperbaiki demi klien lain.)

### Ditambah — Penegak Bahasa Indonesia kini OTOMATIS sampai ke project klien

Hook pengingat "jawab Bahasa Indonesia + gaya non-programmer" (`lib/lang-reminder.mjs`) sebelumnya nyala di repo kit saja; berkasnya sampai ke klien tapi tak terpasang sebagai hook -> tak terpanggil.

- **👨‍💻 Programmer:** `lib/lang-hook-wiring.mjs` (baru) memasang hook `UserPromptSubmit` ke `.claude/settings.json` klien saat init/update (`setup-pola-b.mjs`; update menjalankan ulang setup -> cakupan install + update lewat 1 titik wiring). Idempoten + fail-safe (JSON klien rusak -> tak ditulis, pertahankan kunci kustom) + tulis-atomik + non-blokir (selalu exit 0). `templates/settings.json.template` baru (referensi). 9 tes pengunci. Komentar `lang-reminder.mjs` yang merujuk berkas-hantu dibetulkan.
- **🙂 Non-Programmer:** sekarang setiap staff yang pasang/update lintasAI otomatis dapat "pengingat" yang membuat AI selalu menjawab Bahasa Indonesia gaya mudah-paham — bukan cuma di kit kita. 🏢 Seperti papan pengingat yang otomatis terpasang di tiap cabang toko, bukan cuma di kantor pusat. Pemasangannya hati-hati: tak menimpa pengaturan yang sudah ada, dan kalau pengaturanmu rusak ia memilih tidak menyentuh (aman).

### Ditambah — Robot anti-bocor `.env` saat pecah-repo (`lib/split-guard.mjs`)

- **👨‍💻 Programmer:** robot deterministik cuma-baca + fail-closed memeriksa tiap folder hasil-pecah: `.env` asli nyelip, `.gitignore` tak menutup `.env`, `.env.example` memuat kunci/nilai rahasia (termasuk REDIS/MONGO + `.env.example` realFile), repo tampilan punya struktur DB. Mengubah "andalkan AI ingat" -> mesin. Pendamping `docs/split-guard.md`.
- **🙂 Non-Programmer:** robot yang otomatis mengecek "jangan sampai kunci rahasia ikut ke gudang yang dilihat banyak orang" saat memecah project jadi banyak repo. 🏢 Seperti detektor logam di pintu gudang.

### Ditambah — Gerbang Pra-Rilis 1-perintah (`npm run preflight`) + gerbang CI otomatis

Selama ini pemeriksa mutu (tes Node, ESLint, Pester, smoke, robot kecocokan, pemindai Unicode) dijalankan **manual satu-satu** → gampang "lupa cek sesuatu", dan tak ada cek **kelengkapan rilis** (mis. versi naik tapi CHANGELOG belum punya entrinya). Sekarang ada satu perintah + gerbang otomatis di CI.

- **👨‍💻 Programmer:** `tests/preflight.mjs` (orkestrator Node) menggabung semua pemeriksa + menambah cek kelengkapan rilis (entri CHANGELOG utk versi `package.json`, placeholder kerangka belum diisi, versi-vs-tag, breaking-tanpa-naik-BESAR, kode-vs-tes), memilah ke **GENTING / PENTING / RAPIKAN** dengan satu exit-code. Skrip `npm run preflight` (harian: hanya GENTING memblokir) + `npm run preflight:strict` (rilis: PENTING ikut memblokir); bendera `--skip-ps`/`--node-only`. Reuse robot yang sudah ada (`consistency-check`, `unicode-safety-check`, parser CHANGELOG `version-detect`) — bukan tulis ulang. **CI:** job `preflight` di `validate.yml` (tiap PR/push ke `main`, `--skip-ps` → tak menjalankan tes PowerShell 2x) + langkah `preflight:strict` di `publish-npm.yml` (gerbang sebelum terbit ke npm) → 3 pemeriksa yang dulu blind-spot di CI (robot kecocokan, huruf-tipuan Unicode, kelengkapan rilis) kini dijaga otomatis. Dikunci tes anti-rot (`tests/preflight.test.mjs` + `tests/ci-preflight-wiring.test.mjs`). Pendamping `docs/preflight.md`.
- **🙂 Non-Programmer:** satu tombol **"Cek Kesehatan"** sebelum bilang "selesai/rilis" — kayak tombol cek kesehatan akun di BCA mobile: sekali tekan, semua diperiksa (tes + kecocokan versi + kelengkapan catatan rilis) lalu kasih lampu **merah/kuning/hijau**, bukan kamu cek satu-satu. Sekarang pemeriksaan ini juga **jalan otomatis di server** tiap ada perubahan + tepat sebelum versi baru diterbitkan — jadi "lupa ganti salah satu berkas" atau "catatan rilis belum lengkap" ketahuan lebih awal, bukan saat sudah terbit. 🏢 Seperti pabrik yang menyalakan-uji mesin + cek kelengkapan sebelum produk dikirim.

### Ditambah — LAPIS 1 (SSOT/anti-drift): rapikan angka rapuh + tes paritas robot PowerShell↔Node

Lanjutan cetak-biru anti-bug-berulang (`docs/plans/BUKU_PELAJARAN_DAN_PREFLIGHT.md`) — Tahap B. Menutup pola "ubah A, lupa B": angka turunan-kode yang ditulis tangan (pasti basi) dihapus → rujuk sumbernya, + daftar fakta yang dijaga robot kini dikunci paritasnya antar-bahasa.

- **👨‍💻 Programmer:** (a) De-fragilize: hapus "(43 tes)" dari `docs/split-guard.md` + "36 file" (2 titik) di `LINTASAI_WORKFLOWS_v1.md` → rujuk sumber (`tests/`, `lib/kit-files.psd1`). (b) `docs/RESEP_PERUBAHAN.md` v2: utamakan gerbang `npm run preflight`, cakup kode Node (`.mjs`), checklist "WAJIB ikut" untuk fitur, catatan paritas robot. (c) Tes paritas baru `tests/consistency-parity.Tests.ps1` + helper `tests/dump-kit-consistency.mjs`: membandingkan NILAI-JADI daftar yang dijaga (`KIT_VERSION_CHECKS`/`KIT_FACTS`/`KIT_SOURCE`/`KIT_TEAM_FILES_SOURCE`) PowerShell vs Node → "tambah/ubah fakta di satu sisi, lupa sisi lain" kini langsung MERAH (sebelumnya drift senyap). `KIT_TEAM_FILES_SOURCE` di `consistency-check.mjs` di-export demi paritas; tes skip jujur kalau `node` absen. Terbukti menangkap (uji drift sengaja → merah).
- **🙂 Non-Programmer:** angka yang dulu ditulis tangan di catatan (gampang basi saat jumlahnya berubah) diganti rujukan ke sumber aslinya — biar tak pernah bohong lagi. Plus, "satpam angka" punya 2 kembar (versi PowerShell + versi Node); kini ada pemeriksa yang memastikan keduanya selalu menjaga daftar yang SAMA — kalau beda langsung ketahuan. 🏢 Seperti 2 satpam shift pagi & malam yang wajib pakai daftar tamu sama persis; kalau salah satu pakai daftar beda, alarm bunyi.

### Ditambah — LAPIS 3 (Buku Pelajaran / Lesson Ledger): tiap bug yang lolos jadi penjaga permanen

Lanjutan cetak-biru anti-bug-berulang (`docs/plans/BUKU_PELAJARAN_DAN_PREFLIGHT.md`) — Tahap C. Bentuk **AMAN** dari "AI belajar dari kesalahan": tiap kebobolan dicatat lalu diubah jadi penjaga otomatis, dengan **OWNER yang menyetujui**. Yang mengingat = mesin, bukan "naluri" AI.

- **👨‍💻 Programmer:** `docs/BUKU_PELAJARAN.md` (ledger, format entri mesin-baca, **internal kit** — dikecualikan dari paket via `files[]` `!docs/BUKU_PELAJARAN.md`) + aturan alur human-in-the-loop di `CLAUDE_universal_v1.md` §6.4 (AI USULKAN → owner SETUJUI → AI PASANG; DILARANG auto-evolve / skor-keyakinan / naluri) + pointer balik dari §4.6. Dikunci `tests/buku-pelajaran.test.mjs` (6 tes): **INTEGRITAS** — tiap entri TERPASANG WAJIB menunjuk berkas penjaga yang NYATA ADA (ledger tak bisa "ngaku-ngaku") + gema aturan §6.4 + cek exclude bundle (pelengkap bukti `npm pack` di `tests/package-bundle.Tests.ps1`). Seed 2 entri nyata: drift fakta → robot kecocokan (Lapis 1); blind-spot "selalu hijau" → preflight (Lapis 2). `RESEP_PERUBAHAN.md` Resep 6 baru.
- **🙂 Non-Programmer:** "buku catatan pelajaran" — tiap bug yang pernah lolos dicatat lalu diubah jadi pengaman otomatis yang **tak akan lupa**, dan KAMU yang menyetujui dulu sebelum dipasang. 🏢 Seperti buku catatan insiden maskapai: tiap kejadian jadi butir checklist permanen untuk semua penerbangan — itu sebabnya makin aman. Penting: AI **DILARANG** "belajar + ubah aturannya sendiri diam-diam"; semua pelajaran terlihat sebagai catatan biasa yang kamu setujui.

### Ditambah — Pertahanan 3-lapis kini OTOMATIS sampai ke project klien (Tahap E)

Lanjutan cetak-biru anti-bug-berulang (`docs/plans/BUKU_PELAJARAN_DAN_PREFLIGHT.md`) — Tahap E (penutup). Sebelumnya gerbang preflight + pencegah-drift + Buku Pelajaran hidup di repo kit saja; kini ikut terpasang + jalan di tiap project yang memasang lintasAI.

- **👨‍💻 Programmer:** (a) `npx lintasai preflight` (+ `--strict`) — perintah baru di dispatcher (`bin/lintasai.js` `COMMANDS_NODE` + `shouldPassProjectRoot` menyuntik `--project-root` project klien). (b) `tests/preflight.mjs` kini sadar **"mode project"** (`package.json` `name` ≠ `lintasai`): menjalankan `npm test` MILIK KLIEN (kontrak universal jest/vitest/mocha/node:test, andalkan exit-code) bukan berkas tes kit; ketiadaan CHANGELOG/versi = INFO, peta-konsistensi/eslint/tes belum ada = RAPIKAN (saran lembut) — bukan GENTING palsu yang dulu menampilkan stack-trace mentah di project klien. Drift entri CHANGELOG di klien = PENTING (tetap memblokir saat `--strict`). `main()` menerima `--repo-root`/`--project-root` (alias). (c) Pemasang (`setup-pola-b.mjs` + `.ps1`, paritas) menyalin `templates/consistency-map.example.jsonc` (format yang DIBACA gerbang Node — sebelumnya cuma `.psd1`) + `templates/BUKU_PELAJARAN.example.md` (contoh ledger Lapis 3) ke `docs/` klien; terdaftar `lib/kit-files.psd1`. Ledger KIT (`docs/BUKU_PELAJARAN.md`) tetap dikecualikan dari paket; klien dapat CONTOH-nya. Dikunci tes anti-rot (`tests/dispatcher-init-routing.test.mjs` routing+suntik `Mode: project`; `tests/preflight.test.mjs` cabang mode-project; `tests/setup-pola-b-write.test.mjs` bukti deploy ke klien). Jumlah file tim 31→33 (+2 contoh), docs 23→25.
- **🙂 Non-Programmer:** 3 pengaman yang dulu cuma melindungi "kantor pusat" (repo kit) sekarang otomatis terpasang di tiap project staff: (1) tombol **"Cek Kesehatan" sebelum bilang selesai** (`npx lintasai preflight`) yang kini paham project-mu sendiri — tak lagi menampilkan "lampu merah" palsu menakutkan untuk hal yang memang belum ada; (2) **pencegah "ubah A lupa B"** (contoh peta-konsistensi siap diisi); (3) **buku catatan pelajaran** (contoh siap diisi tiap ada bug). 🏢 Seperti memasang alat keselamatan yang sama (alarm asap, APAR, buku checklist) di tiap cabang toko, bukan cuma di kantor pusat. AI di sesi staff juga otomatis memakai gerbang ini tiap ada perubahan.

### Diubah/Dirapikan — perapian sisi Node + pengaman + dokumen

- **👨‍💻 Programmer:** ESLint untuk sisi Node + gerbang CI `node-lint`; robot Node pakai `process.exitCode` (anti output-kepotong); jalan-cadangan PowerShell saat Node gagal; pembuang-BOM disatukan (`lib/fs-text.mjs`); pengunci bentuk manifest Node+PS. +2 tes pengaman tarball (kunci absen berkas rahasia/lokal: `.env`/`.manifest-secret`/`*.local.md`/lockfile/`eslint.config.mjs`; + `docs/plans/` hanya POLA_REPO_AMAN). Polish: header SPLIT_REPO sync v1.58.0 (angka jumlah tes di `docs/split-guard.md` kemudian di-de-fragilize → lihat LAPIS 1 SSOT di atas).
- **🙂 Non-Programmer:** rapi-rapi mesin di balik layar supaya lebih andal + pengaman tambahan supaya berkas rahasia tak sengaja ikut saat menerbitkan paket. Tak ada yang perlu kamu lakukan.

## [1.57.2] - 2026-06-24

### Diubah — Blok "Tinjauan lintasAI Divisi" pakai sudut pandang JUNIOR-programmer (bukan senior) — lebih mudah dipahami

Atas permintaan owner: blok tinjauan lintas-divisi di AKHIR jawaban AI (yang merangkum temuan dari banyak sisi: Backend, Keamanan, QA, dll) dulu punya baris teknis "👨‍💻 Programmer" yang ditujukan untuk developer/CTO senior — sering terlalu padat-jargon untuk staff. Sekarang baris itu diganti jadi "👨‍🎓 Junior-programmer": tetap teknis & menunjuk `file:baris`, TAPI tiap istilah teknis WAJIB dijelaskan singkat di tempat supaya yang masih belajar koding pun paham. Baris "🙂 Non-Programmer" tetap. Hasil: kedua baris mudah dimengerti.

- **👨‍💻 Programmer:** §4.1 + §2.1.1 Kategori #4 (`CLAUDE_universal_v1.md`) + contoh & skeleton §4.1 (`LINTASAI_WORKFLOWS_v1.md`) di-rewrite: label `👨‍💻 Programmer` → `👨‍🎓 Junior-programmer`, aturan baris teknis kini MEWAJIBKAN penjelasan-jargon-di-tempat (mis. "regex (pola pencocokan teks)") alih-alih "istilah industri untuk developer/CTO". Scope SENGAJA dibatasi ke blok tinjauan (yang dilihat user di output); artefak 2-POV lain TIDAK disentuh (brosur `KEUNGGULAN_LINTASAI.md` + aturan §7.8, materi rujukan stack-checklist `WORKFLOWS` §4.2/§4.13, entri `CHANGELOG` historis) karena beda audiens/fungsi. Nol tes/robot mengunci label lama (terverifikasi folder `tests/` + tak ada `docs/consistency-map.psd1`), jadi tak ada regresi. Konsistensi versi 6-file + buku-fakta BERSIH.
- **🙂 Non-Programmer:** "kesimpulan multi-sisi" di bawah tiap jawaban AI sekarang ditulis supaya **dua-duanya gampang dimengerti** — versi untuk yang masih belajar koding + versi untuk yang bukan orang teknis (sebelumnya versi atas terlalu "bahasa ahli"). 🏢 Seperti dokter yang menjelaskan hasil lab pakai bahasa pasien, bukan istilah kedokteran mentah. Cuma mengubah CARA NULIS rangkuman; tidak menyentuh kode yang jalan, jadi aman. Berlaku ke semua project yang memasang lintasAI setelah di-update + buka chat baru.

## [1.57.1] - 2026-06-20

### Diperbaiki [SECURITY] — Wiring contoh Palang Rem SALAH FORMAT (palang gagal-diam) + tes pengunci wiring

Ditemukan oleh scan kesiapan-rilis (17 pemeriksa READ-ONLY, dicek-silang skeptis 4 arah) SEBELUM rilis ke staff. **1 penghalang rilis GENTING**: contoh wiring `templates/hooks/risk-gate.settings.example.json` memakai `"command":"node"` + `"args":[...]` — tapi kontrak hook Claude Code **TIDAK punya** field `args` (itu format MCP server). Akibatnya `args` DIABAIKAN diam-diam → cuma `node` jalan → node baca JSON tool-call sebagai skrip → SyntaxError exit 1 → palang rem **GAGAL DIAM-DIAM** (aksi berisiko lanjut TANPA dialog). Staff non-programmer yang menyalin contoh persis sesuai docs akan **mengira terlindungi padahal tidak** = rasa-aman-palsu untuk fitur KEAMANAN. Bug ini lolos 23 tes hijau karena tes hanya menguji LOGIKA (`node <path>`), bukan WIRING.

- **👨‍💻 Programmer:** wiring diubah ke kontrak Claude Code yang benar: `{ "type":"command", "command":"node .claude-kit/lib/risk-gate.js" }` (SATU string `command`, buang `args`). Diverifikasi 4 arah: schema `commandHookItem` (oneOf string|array, tanpa `args`), 28 hook resmi ECC SEMUA pakai `command` string-penuh (nol `args`), uji empiris (`node` tanpa path → SyntaxError exit 1 vs `node <path>` → ask exit 0), + skema MCP yang memang pakai `args`. **+4 tes pengunci wiring** (`tests/risk-gate.Tests.ps1`): assert `command` memuat `risk-gate.js` + binary `node` + TIDAK ada properti `args` — supaya format salah ini tak bisa kembali diam-diam. Koreksi juga contoh historis `docs/plans/palang-rem-otomatis.md:39`. Robot decide() + 19 robot lib/*.ps1 + 103 tes lain terbukti SEHAT (nol crash). Header `CLAUDE_universal_v1.md` tanggal 06-18→06-20. 27 tes risk-gate lulus. (Catatan label [SECURITY]: ini pra-rilis—belum ada user terdampak; ditandai karena menyangkut fitur keamanan + wajib sebelum staff menyalakan.)
- **🙂 Non-Programmer:** scan kesiapan-rilis menangkap **1 masalah penting sebelum sampai ke staff**: contoh cara-menyalakan Palang Rem **salah tulis**, sehingga kalau staff mengikutinya persis, palang **diam-diam tidak menyala** — staff kira aman padahal tidak. 🏢 Seperti memasang alarm rumah yang ternyata kabelnya salah colok: lampunya nyala tapi tak benar-benar mendeteksi maling. Sudah **diperbaiki** + dikasih "pengunci" (tes) supaya kesalahan ini tak bisa terulang. Ini justru bukti gerbang QA bekerja: ketahuan saat diuji, bukan pas dipakai. Sisa kit terbukti sehat.

## [1.57.0] - 2026-06-20

### Diubah — Palang Rem Otomatis: runtime PowerShell -> Node.js (`lib/risk-gate.js`), ~7,7x lebih cepat (keputusan owner, ADR-002)

Owner memilih Node.js setelah melihat benchmark nyata (ADR-002): hook PowerShell 5.1 ~509ms/panggilan vs Node ~66ms (~7,7x). Karena palang rem akan dipakai AKTIF oleh semua staff (bukan opt-in jarang), kecepatan jadi prioritas. `lib/risk-gate.ps1` (PowerShell) DIHAPUS → diganti `lib/risk-gate.js` (Node-only, sesuai arahan "nodejs saja"). Logika identik (semua kategori + pesan Bahasa Indonesia sama). Node sudah ada kalau kit dipasang via npm (`engines node>=18`).

- **👨‍💻 Programmer:** `lib/risk-gate.js` = hook `PreToolUse` Node.js; fungsi `decide()` di-export (unit-testable). Kontrak sama: "ask" (exit 0 + JSON `permissionDecision:"ask"`), "block" (exit 2 + stderr), "allow" (exit 0). **2 bug ditemukan + diperbaiki saat konversi** (via tes E2E, bukan di tangan staff): (1) pipa Windows menambah **BOM** di awal stdin → `JSON.parse` gagal → hook **fail-open diam-diam** (keamanan tak bekerja) — ditangani buang-BOM dulu; (2) `process.exit()` memotong tulisan async pada pipa → pakai `process.exitCode` + keluar natural (flush aman). Tes ditulis-ulang `tests/risk-gate.Tests.ps1` (23 tes, Pester spawn `node`, **skip-jika-Node-absen**; token berisiko dirakit-string biar tak picu sandbox). Wiring `templates/hooks/risk-gate.settings.example.json` → `node`. Docs + §8.2 pointer + `kit-files.psd1` + KEUNGGULAN diselaraskan. ADR-002 dapat addendum (owner override). Konsekuensi disadari: kit kini 2 bahasa (PowerShell + 1 hook Node) → beban rawat naik; mitigasi: 1 berkas terisolasi + tes lengkap. Bonus: lintas-OS (Node jalan Win/Mac/Linux).
- **🙂 Non-Programmer:** palang rem sekarang pakai mesin **Node.js** yang ~7,7× lebih gesit (dialog konfirmasi muncul lebih cepat tiap aksi berisiko). Owner pilih ini karena palang akan dipakai semua staff terus-menerus, jadi kecepatan penting. 🏢 Seperti ganti mesin mobil ke yang lebih responsif karena dipakai harian. CATATAN: saat ganti mesin, ketemu + diperbaiki **2 bug tersembunyi** (salah satunya bikin palang diam-diam tak bekerja) — ketahuan karena diuji ketat dulu, bukan pas dipakai staff. Butuh Node.js (sudah ada kalau pasang lewat npm).

## [1.56.0] - 2026-06-20

### Ditambah — Kebijakan Update untuk staff (UPDATE_GUIDE §2.5): "kapan PERLU update, kapan TIDAK"

Lahir dari pertanyaan owner: "tiap perubahan versi naik — apakah client/staff WAJIB update terus-menerus?" Jawaban profesional: TIDAK. `templates/UPDATE_GUIDE.md` (v3→v4) dapat bagian baru §2.5 yang menegaskan pemisahan **"versi naik (sisi pembuat) ≠ wajib update (sisi pemakai)"** + kebijakan praktis. Melengkapi 4-tier yang sudah ada (§3) dengan "jadi kapan harus bertindak".

- **👨‍💻 Programmer:** §2.5 mengkodifikasi kebijakan konsumsi-versi untuk pemakai: kit terpasang lokal (`.claude-kit/`) = pinning alami (tetap jalan tanpa update); **hanya `[SECURITY]` yang memaksa update segera**, fitur/fix lain = opt-in/terjadwal; + pola **"owner sebagai gerbang"** (owner uji+setujui 1 versi stabil lalu sebar terjadwal ke staff, bukan tiap staff chase latest). Tabel WAJIB/OPSIONAL/TIDAK-perlu. Tidak menyentuh kode/mekanisme — murni kebijakan + komunikasi (label tier sudah ada). Auto-deployed via setup-pola-b.ps1.
- **🙂 Non-Programmer:** sekarang ada panduan jelas: kamu **TIDAK** harus update lintasAI tiap kali versi naik. Versi yang sudah jalan tetap aman selamanya. Update **wajib segera** HANYA kalau ada label `[SECURITY]`; selebihnya update **terjadwal** (mis. bulanan) atau kalau memang **mau fitur baru**. 🏢 Seperti aplikasi HP — pembuatnya rilis terus, tapi kamu tak update tiap hari; HP tetap jalan. Untuk tim: enaknya **owner** yang pilih versi stabil lalu kabari staff "pakai versi X", bukan tiap staff kejar yang terbaru sendiri-sendiri.

## [1.55.0] - 2026-06-20

### Ditambah — Papan Status Lintas-Repo (`lib/repo-board.ps1`): satu pandangan risiko untuk tim multi-repo

Pinjaman onderdil #3 (terakhir) dari telaah adil lintasAI vs ECC v2.0.0. Owner memilih membangun (setelah diberi catatan jujur bahwa ini paling spekulatif). Adaptasi **RINGAN** konsep "session-tracking + risk-scoring" ecc2 ECC (aslinya control-plane Rust + daemon + SQLite + TUI) → di lintasAI **sengaja** jadi satu robot PowerShell **cuma-baca + on-demand** (BUKAN daemon/dashboard), sesuai filosofi kit (ADR-001: ambil konsep, buang mesin berat). Netral/universal. Pinjam KONSEP ecc2 ECC v2.0.0 (MIT).

- **👨‍💻 Programmer:** `lib/repo-board.ps1` (deterministik, ~0 token, saudara `ai-config-check`/`risk-gate`). Untuk tiap repo (auto-temukan sub-folder ber-`.git` via `-Path`, atau `-Repos`), baca status git **READ-ONLY** (`status --porcelain`, `rev-parse`, `rev-list --left-right --count @{u}...HEAD`) → skor risiko berlabel awam (yang tertinggi menang): **GENTING** (perubahan `.env` belum aman), **PENTING** (ahead>0 belum-ter-backup / dirty belum-disimpan), **RAPIKAN** (behind>0 / detached HEAD / no-upstream), **OK** (bersih+sinkron) + ringkasan. Fungsi inti `Get-LintasRepoRisk` = PURE (dites tanpa repo nyata). TIDAK ada daemon/state/mutasi; exit 0 (papan = informasi, bukan gerbang). `tests/repo-board.Tests.ps1` (13 tes, PS 5.1 + PSSA bersih). Pendamping `docs/repo-board.md`, didaftar `lib/kit-files.psd1`.
- **🙂 Non-Programmer:** kalau kamu punya **banyak repo** (mis. 3-7 gudang kode), robot ini = **papan tulis "status semua gudang" sekali lihat** — repo mana yang ada perubahan belum disimpan, belum dikirim ke server (belum ter-backup), atau ada kunci rahasia (`.env`) belum aman. Cuma **melihat**, tidak mengubah apa pun. 🏢 Seperti papan status gudang di pagi hari — sekali pandang tahu mana yang perlu diurus, tanpa keliling satu-satu. CATATAN JUJUR: ini alat-bantu-lihat, bukan jaminan; keputusan (commit/push/pull) tetap di kamu. Sengaja dibuat RINGAN (bukan "ruang kendali" berat) supaya tak jadi beban yang jarang dipakai.

## [1.54.0] - 2026-06-20

### Ditambah — Palang Rem Otomatis (`lib/risk-gate.ps1`): penegak-MESIN aksi merusak (rem-mesin pertama lintasAI), OPT-IN

Pinjaman onderdil #1 (yang paling berharga) dari telaah adil lintasAI vs ECC v2.0.0 — menambal **satu-satunya celah struktural** yang diakui scan: lintasAI **nol rem-mesin** (semua pengaman = kebijakan teks yang bergantung AI patuh). Rancangan disetujui owner (`docs/plans/palang-rem-otomatis.md`). Pola hook diadaptasi dari ECC `config-protection.js`/`gateguard-fact-force.js` (MIT) — ditulis-ulang PowerShell + **mode "ask" Bahasa Indonesia** (dialog klik, jauh lebih ramah dari blok-keras-Inggris ECC). Kontrak Claude Code PreToolUse diverifikasi (via pemandu Claude Code + hook ECC nyata). **Default OPT-IN** (§4.12: mode baru = default mati) — pergeseran filosofi (hook pertama yang MEMAKSA; sebelumnya kit cuma robot advisory).

- **👨‍💻 Programmer:** `lib/risk-gate.ps1` = hook `PreToolUse` (deterministik, ~0 token, saudara `ai-config-check`). Baca JSON stdin (`tool_name`/`tool_input`) → klasifikasi → keluarkan keputusan: **"ask"** (exit 0 + JSON `permissionDecision:"ask"` → dialog klik Setujui/Tolak) untuk 6 kategori berisiko (hapus rekursif paksa, `DROP`/`TRUNCATE`/`DELETE`-tanpa-`WHERE`, `prisma migrate dev`, `deleteMany`/`updateMany`-tanpa-`where`, git `--force`/`reset --hard`/`--no-verify`, sentuh `.env`, format disk), **"block"** (exit 2 + stderr) untuk menembus-pagar/`--dangerously-skip-permissions`/unduh-lalu-jalankan (§8.1 #2,#10), **"allow"** (exit 0) untuk sisanya. **FAIL-OPEN** pada input rusak (kecuali kategori blok). Anti alarm-palsu: `deleteMany({ where })`/`DELETE ... WHERE`/`migrate deploy`/`rm berkas.txt` → lolos. Menegakkan §8.2 Aturan 5 (kebijakan→mesin); pointer ditambah di §8.2. `tests/risk-gate.Tests.ps1` (26 tes, lulus PS 5.1 + PSSA bersih) + E2E hook (stdin→JSON/exit terverifikasi). Wiring `templates/hooks/risk-gate.settings.example.json` + pendamping `docs/risk-gate.md`. Pinjam ECC v2.0.0 (MIT).
- **🙂 Non-Programmer:** akhirnya kit punya **"palang besi", bukan cuma rambu tulisan**. Kalau AI mau melakukan aksi berbahaya (menghapus banyak data, menyentuh kunci rahasia, memformat disk), muncul **dialog klik Setujui/Tolak** dengan alasan bahasa sehari-hari — kamu yang putuskan, AI tak bisa main hapus sendiri. Untuk aksi yang menembus pengaman / menjalankan kode dari internet → langsung **ditolak**. 🏢 Seperti palang besi yang menghentikan mobil + tanya sopir "yakin lewat sini?" — bukan cuma papan peringatan yang gampang diabaikan. **Default MATI** (nyalakan sendiri lewat `docs/risk-gate.md`) — sengaja opt-in karena ini hal baru; uji dulu di project percobaan. CATATAN JUJUR: efek baru terasa setelah dinyalakan + buka chat baru; bukan jaminan mutlak (menutup pola berbahaya yang diketahui).

## [1.53.0] - 2026-06-20

### Ditambah — Disiplin tata-kelola keamanan (SECURITY.md): matriks versi + pengungkapan terkoordinasi + catatan kelangsungan/bus-factor

Pinjaman onderdil #5 dari telaah adil lintasAI vs ECC v2.0.0. **Cek-dulu jujur:** sebagian besar #5 ternyata SUDAH ADA di `SECURITY.md` (target waktu-respon best-effort perawat-tunggal, kebijakan versi, cakupan) — jadi BUKAN celah besar. Ditambah HANYA yang genuinely belum ada, diadaptasi jujur ke realitas kit perawat-kecil (bukan menyalin SLA ECC yang mengandaikan ~270 kontributor). Netral/universal, bukan domain tertentu. Pinjam pola tata-kelola `SECURITY.md` ECC v2.0.0 (MIT).

- **👨‍💻 Programmer:** `SECURITY.md` (v1→v2): (1) **matriks "Versi yang didukung"** eksplisit (baris-terbaru = didukung penuh; di bawahnya = update dulu) + pernyataan jujur "tidak ada backport, kapasitas tak ada"; (2) komitmen **pengungkapan terkoordinasi** (laporan privat sampai tambalan terbit, penyerang tak diberi peta) + janji menjelaskan alasan kalau laporan ditolak; (3) bagian baru **"Kelangsungan & bus factor"** — mitigasi nyata risiko perawat-tunggal: MIT bebas-fork + rilis ber-tag + manifest tanda-tangan + catatan perubahan (untuk penerus), dan saran pengguna simpan salinan lokal + jangan gantung 100% ke upstream. Kredit MIT ke ECC `SECURITY.md`, diadaptasi (bukan disalin). Tidak menyentuh kode; `SECURITY.md` pakai versi-dokumen sendiri (di luar 5 berkas versi-kit).
- **🙂 Non-Programmer:** halaman aturan keamanan kit diperjelas: (a) daftar tegas "versi mana yang masih ditambal" (jawabannya: yang terbaru — kalau ada perbaikan keamanan, **update**, bukan tambal versi lama, seperti aplikasi HP); (b) janji **tidak mengumumkan celah sebelum ada perbaikannya** (biar penyerang tak dikasih peta duluan, seperti pabrik perbaiki cacat dulu baru recall); (c) pengakuan jujur "kit ini dirawat tim kecil" + cara supaya kamu tetap aman kalau perawatnya berhenti (lisensi bebas-contek + simpan salinanmu sendiri). 🏢 Seperti resep warung yang ditulis lengkap + boleh dicontek siapa saja — kalau kokinya berhenti, warung bisa dilanjutkan. CATATAN JUJUR: ini perbaikan dokumen aturan, bukan kode baru; sebagian sudah ada sebelumnya — yang ditambah cuma yang belum.

## [1.52.0] - 2026-06-20

### Ditambah — Paket jebakan Prisma ORM (§4.14 #2): tutup celah "bisa-hilang-data" untuk project Prisma+Postgres apa pun

Pinjaman onderdil #2 dari telaah adil lintasAI vs ECC v2.0.0 (scan 10-dimensi READ-ONLY, 06-20). Temuan jujur: paket Database lintasAI sebelumnya Supabase-sentris (`@supabase/*`) dan **0 catatan jebakan Prisma**, padahal Prisma+Postgres = stack umum yang dipakai LUAS — dan jebakannya bisa bikin **hilang data** (mis. `migrate dev` mereset DB, `deleteMany()` tanpa `where` mengosongkan tabel). ECC `prisma-patterns` (372 baris, sadar-versi) menutup ini untuk developer. Diadaptasi ke lintasAI: **ditulis-ulang Bahasa Indonesia awam + 2-sudut-pandang + DINETRALKAN untuk project APA PUN** (bukan stack/domain tertentu — sesuai sifat universal kit). BUKAN salin mentah. On-demand di `LINTASAI_WORKFLOWS_v1.md` (always-load tak naik). **Tidak menambah paket baru** — memperluas paket #2 (tetap 9 paket); deteksi Prisma punya pemicu sendiri (`@prisma/client`/`prisma/schema.prisma`) supaya jalan walau tanpa Supabase.

- **👨‍💻 Programmer:** §4.14 #2 (judul dilebarkan → "Database: Supabase / PostgreSQL / Prisma ORM") kini memuat sub-blok Prisma: 🚨 bisa-HILANG-DATA (`deleteMany`/`updateMany` tanpa `where`; `migrate dev` reset DB di staging/prod → pakai `migrate deploy`; `NOT NULL`/rename 1-migrasi → expand-then-contract §9; edit-manual migrasi → `P3006 checksum mismatch`); ⚠️ hasil diam-diam-SALAH (`updateMany`/`deleteMany` balikin `{count}` bukan baris; `@updatedAt` skip bulk; soft-delete + `findUniqueOrThrow` bocor baris terhapus → `findFirstOrThrow`; `$transaction` interaktif timeout 5 detik; N+1 + entitas mentah ke API); kode error `P2002`/`P2025`/`P2003`; pool serverless `connection_limit=1` + singleton `globalThis`; tabel anti-pola. Sadar-versi WAJIB (`npx prisma --version`, verifikasi dokumen versi terpasang §8.2 Aturan 1 — jangan andalkan ingatan). Selaras §4.13 stub + KEUNGGULAN §X. Pinjam `prisma-patterns` ECC v2.0.0 (MIT).
- **🙂 Non-Programmer:** AI sekarang tahu "jebakan maut" alat database Prisma — berlaku untuk project apa pun. Sebelumnya AI belum punya catatan soal perintah Prisma yang bisa **tanpa sengaja menghapus data** (kayak Select-All lalu Delete di Excel) atau **mengosongkan lemari data** kalau dipakai di tempat salah. Sekarang ada, jadi AI berhenti + minta izin dulu sebelum perintah berbahaya. 🏢 Seperti memberi montir daftar "kabel yang JANGAN dipotong". Dicontek dari ECC (legal, MIT), ditulis ulang bahasa kantor + dibikin berlaku project apa pun (bukan cuma satu jenis). CATATAN JUJUR: ini panduan di atas kertas — keputusan tetap di owner; jebakan versi-spesifik wajib AI verifikasi ke dokumen versi Prisma yang terpasang dulu.

## [1.51.0] - 2026-06-20

### Ditambah — Pindahan "onderdil membangun project" ECC ke lintasAI (scan ke-2 vs ECC v2.0.0, fokus MEMBANGUN project, no-bias): 8 onderdil diadaptasi

Lanjutan telaah lintasAI vs ECC — kali ini fokus "cara MEMBANGUN project" (struktur/logika/penanganan), dicocokkan kondisi tim (Next.js/React + Python, Supabase/Cloudflare, Vercel/Railway/Render, SEO, staff non-programmer, Claude Code only). Scan READ-ONLY 6 sumbu + 4 cek-silang skeptis + 1 kritik anti-bias (yang mengoreksi 3 klaim berlebihan + 3 keberpihakan). Kesimpulan adil: lintasAI tetap fondasi (bahasa awam + owner-gated + robot + paket Supabase/Cloudflare yang ECC TAK punya), TAPI ECC objektif lebih kaya "bahan-bangun" di 5/6 sumbu → **8 onderdil DIADAPTASI** (ditulis-ulang Bahasa Indonesia awam + 2-versi 👨‍💻/🙂 + on-demand, tanpa versi framework hardcoded, owner-gated). BUKAN fork, BUKAN salin mentah. Konten ada di berkas on-demand (`LINTASAI_WORKFLOWS_v1.md`) — always-load tak naik.

- **👨‍💻 Programmer:** (1) **Performa React/Next.js** (§4.14 #1) — ~14 aturan inti dari `react-performance` ECC: anti-waterfall (`Promise.all`), bundle (dynamic-import/anti-barrel), re-render (derive saat render), peta Web-Vitals; aturan auth Server Action ditandai GENTING. (2) **SEO terstruktur** (§4.14 #6) — schema.org per tipe-halaman + title/meta length + 1-H1 + redirect ≤2-hop + keyword-mapping/anti-cannibalization (melengkapi JSON-LD/canonical yang sudah ada di STACK_GUIDE). (3) **Pola D "Uji Situs Benar-Benar Jalan"** (§4.15) — adaptasi `browser-qa` MCP-driven (AI buka browser + klik kayak user; Fase axe-core menutup a11y-otomatis); mode aman staging, tanpa stempel READY/NOT-READY. (4) **Galeri struktur folder per-stack** (§4.14) — contoh tree Next.js + Python, tanpa versi hardcoded, stabilo "isi vs biarkan". (5) **Pola a11y siap-tempel** (§4.14 #1) — label form/aria error/focus modal/keyboard/`prefers-reduced-motion`. (6) **Design-judgment Webdesign** (§4.13 #4) — banned-patterns anti-UI-generik + "pilih arah desain dulu". (7) **§4.16 Urutan Bangun-Fitur** — by-dependency (kontrak data→inti→integrasi→tampilan→cek→catatan) + ringkasan-mandiri per langkah. (8) **Pola E "Tahan-Gagal"** (§4.15) — retry-with-backoff + circuit-breaker untuk API eksternal (Supabase/Cloudflare/pihak-ketiga). §4.15 jadi 5 Pola Bantu (stub always-load + tes anti-rot ikut diperbarui). Pinjam `react-performance`/`seo`/`browser-qa`/`frontend-a11y`/`design-quality`/`frontend-design-direction`/`blueprint`/`code-architect`/`error-handling`/examples ECC v2.0.0 (MIT), ditulis-ulang.
- **🙂 Non-Programmer:** lintasAI "mencontek" 8 kebiasaan bagus ECC biar bikin-website lebih lengkap — halaman lebih ngebut, muncul cantik di Google (bintang rating/breadcrumb), ada "petugas" yang beneran buka situs + klik tombol mastiin nggak rusak setelah online, contoh rangka folder, pola ramah-disabilitas, panduan desain biar tak terlihat murahan, urutan bangun-fitur yang rapi, dan "coba-ulang otomatis + saklar pemutus" saat layanan luar ngadat. SEMUA ditulis ulang bahasa kantor sehari-hari + tetap minta izinmu dulu. Yang sudah ada di lintasAI (anti-ngarang, Supabase/Cloudflare, anti-injeksi) TIDAK diduplikasi. CATATAN JUJUR: ini panduan di atas kertas — belum diuji di website sungguhan; tiap onderdil keputusan adopsi ada di OWNER, bukan otomatis.

## [1.50.0] - 2026-06-20

### Ditambah — Robot pemeriksa mutu kode per-bahasa (`lib/stack-check.ps1`): menjadikan Paket Stack §4.14 BISA-DIJALANKAN, bukan cuma prinsip

Lahir dari telaah lanjutan lintasAI vs ECC v2.0.0 (sumbu "kedalaman engineering per-bahasa" — satu-satunya sudut teknis murni yang dimenangkan ECC). Selama ini Paket Stack §4.14 cuma PRINSIP teks (AI baca + terapkan manual); onderdil "review per-bahasa" ECC (`agents/*-reviewer`) MENJALANKAN alat nyata. Robot ini menutup gap itu — disesuaikan standar tim lintasAI (deterministik, owner-gated, bahasa awam), bukan menyalin.

- **👨‍💻 Programmer:** robot deterministik baru (saudara `ai-config-check`/`unicode-safety-check`/`consistency-check`) yang auto-deteksi bahasa gudang via `Get-StackType` (reuse) lalu menjalankan alat-cek **STATIS** standar: Go (`go vet`/`staticcheck`/`govulncheck`), Python (`ruff`/`mypy`/`bandit`), Node-TS (`tsc --noEmit`/`eslint`/`npm audit`), Rust (`cargo clippy`/`fmt --check`), PHP (`phpstan`/`pint --test`). **Cuma-periksa** (TANPA `--fix`, TANPA menjalankan tes — tes = eksekusi kode, urusan §4.15-B). **Config-gated** anti alarm-palsu (alat hanya jalan kalau config-nya ada, mis. `tsc` butuh `tsconfig.json`). Alat belum terpasang → "DILEWATI", bukan "0 masalah" (§6.3 #4). Robot kasih FAKTA (kode-keluar + cuplikan), AI kasih MAKNA (terjemah + naikkan ke GENTING kalau keamanan). Pakai `System.Diagnostics.Process` + baca async (anti-deadlock, ExitCode andal di PS 5.1) + batas-waktu per-alat. Robot TAK PERNAH GENTING → Gerbang §4.6 tak hard-fail (mutu kode = saran owner-gated). Dikunci `tests/stack-check.Tests.ps1` (20 tes, lulus di PS 5.1 + PSSA bersih). Disambung §4.14 ("Robot pendamping") + §4.15-A. Pinjam pola `agents/*-reviewer`/`*-build-resolver` ECC (MIT), ditulis-ulang sebagai robot bahasa awam.
- **🙂 Non-Programmer:** tiap gudang kode sekarang punya "inspektur mutu otomatis" sesuai bahasanya — dia **membaca + menilai** kode (aman, tidak menjalankan mesinnya, tidak mengubah apa pun) lalu lapor temuan dalam bahasa sehari-hari. Kalau alat pemeriksanya belum terpasang, dia bilang jujur "dilewati", bukan pura-pura "semua bersih" (kayak timbangan yang harus nyala dulu sebelum dipercaya). Keputusan menambal tetap di tanganmu.

## [1.49.0] - 2026-06-19

### Ditambah — Pindahan "keunggulan ECC yang cocok" ke lintasAI (hasil telaah ulang 14-dimensi, adil): robot pemindai konfigurasi-AI + 2 paket bahasa + 5 aturan-pinjam

Lanjutan audit menyeluruh lintasAI vs ECC v2.0.0 (14 dimensi, READ-ONLY, tiap usulan dicek-silang skeptis). Hasil jujur: dari 10 usulan pinjam, **5 GUGUR** (lintasAI ternyata sudah punya / mekanismenya melanggar standar tim non-programmer) dan **6 LOLOS** → dipindahkan di sini, **disesuaikan standar tim (Indonesia, non-programmer, Claude Code-only, owner-gated) tanpa menurunkan kualitas expert**.

- **🔒 Robot pemindai konfigurasi-AI (`lib/ai-config-check.ps1`)** — celah keamanan objektif paling nyata. Robot deterministik (~0 token, kembar `unicode-safety-check.ps1`) memindai `.mcp.json` + `.claude/settings.json` + `docs/SKILLS_LOCAL.md`: rahasia ber-pola vendor (sk-/ghp_/AKIA/JWT) = GENTING, izin lebar `Bash(*)` = PENTING, server MCP remote/npx = PENTING/RAPIKAN, hook "unduh-lalu-jalankan" + `dangerously-skip-permissions` + skill menembus-pagar = GENTING. Label GENTING/PENTING/RAPIKAN (bukan CRITICAL/HIGH), cuma-baca (tak auto-fix), jalan di Gerbang §4.6 + CI. §4.15-C diubah dari "AI baca+nalar" → "robot dulu, AI tafsir". Dikunci `tests/ai-config-check.Tests.ps1` (14 tes). Pinjam pola `security-scan`/AgentShield/`mcp-inventory` ECC.
- **🐘 Paket Stack PHP/Laravel (§4.14 #8) + 🐹 Go (§4.14 #9)** — gap cakupan-bahasa terbesar yang terverifikasi (ECC punya 18-24 bahasa, lintasAI sebelumnya JS/TS+Python): idiom + jebakan keamanan khas + toolchain (Eloquent anti-SQLi/mass-assignment/`APP_DEBUG`; Go `err`-wajib/goroutine-bocor/`-race`). Auto-deteksi `composer.json`/`go.mod`, on-demand. + §4.15-A perbaiki-error kini kenal `composer`/`go`/`cargo`/`mvn`/`gradle`.
- **🔁 Batas loop cek-diri (§4.12)** — maks 2-3 percobaan + deteksi-buntu → berhenti + balik + eskalasi (cegah loop boros token / kerusakan beruntun). Pinjam "stop-threshold" ECC `loop-operator`/GAN.
- **🧠 Memory "tawar-dulu-baru-simpan" (§6.2)** — AI proaktif MENAWARKAN mencatat pola koreksi berulang (≥2×) lewat popup, manusia menyetujui. Pinjam IDE belajar-berkelanjutan ECC — TAPI **menolak** mesin auto-learning/instinct-nya (bahaya: pola salah terpasang diam-diam tanpa staff non-programmer sadar).
- **🛡️ Fan-out cuma-baca (§8.2 Aturan 3) + larangan melemahkan config mutu (§12)** — tiap pemeriksa paralel wajib diperintahkan read-only di promptnya; AI dilarang melonggarkan linter/tsconfig/ambang-tes demi "lulus". Pinjam konsep tool-scope + `config-protection` ECC, sebagai ATURAN (bukan hook runtime — kit sengaja nol-hook, ADR-001).
- **📝 Rencana tersimpan ringan (§3) + catatan biaya-AI owner (§4.15)** — boleh simpan rencana fitur besar ke `docs/plans/` (pinjam `prp-plan`); owner pantau biaya AI via Anthropic Console (BUKAN bangun dashboard/hook — itu yang membuat pelacak biaya ECC selalu kosong di lintasAI).

**5 yang GUGUR cek-silang (jujur — TIDAK dipindah):** `prp-plan` penuh (sudah ada lifecycle resume), hook-runtime anti-`--no-verify` (sudah server-side `secret-guard.yml`+branch-protect), ambang cakupan 80% (sudah §4.15-B), `selective install` (sudah Team Mode), dashboard/cost-Rust (premis salah + langgar ADR-001). Multi-harness + Agent-OS 67-agen + auto-learning + Rust control-plane = unggul untuk DEVELOPER tapi **tak cocok standar tim non-programmer** (keputusan owner sendiri: "harus cocok standar tim").

- 👨‍💻 Programmer: deterministic AI-config scanner (vendor-secret/over-broad-perms/remote-MCP/fetch-run-hook) + PHP/Go stack-packs + loop-bound/auto-suggest-memory/read-only-fanout/config-protection rules; 582+14 Pester green, 3 robots clean. 🙂 Non-Programmer: AI sekarang punya satpam ekstra yang cek pengaturan AI-mu, ahli PHP/Go, dan rem otomatis biar tak ngulang perbaikan tanpa henti — semua otomatis, pakai bahasa yang kamu mengerti.
- **Kredit (MIT):** adaptasi ECC v2.0.0 © Affaan Mustafa (`security-scan`/`mcp-inventory`, `php-reviewer`/`laravel-*`, `go-reviewer`/`golang-patterns`, `loop-operator`/GAN, `continuous-learning`, `config-protection`, `prp-plan`, `cost-report`) — ditulis ulang bahasa non-programmer + label GENTING/PENTING/RAPIKAN, BUKAN disalin. Dikunci tes. Aturan baru tetap on-demand kecuali 5 baris always-load (loop-bound/memory/fanout/config-protection/plan) yang = aturan keamanan/mutu inti.

> **Catatan:** Paket "Data Sensitif / UU PDP" (kandidat §4.14 #10) SENGAJA tidak disertakan atas keputusan owner (20-06) — bisa ditambahkan nanti saat ada kebutuhan klien nyata.

## [1.48.0] - 2026-06-19

### Ditambah — Paket Stack Python (§4.14 #7) + 3 Pola Bantu otomatis (§4.15): perbaiki-error, coverage+tes, pindai-permukaan-AI

Lanjutan tutup gap pinjaman ECC, disesuaikan stack owner yang ternyata **pakai Python** + kebutuhan staff non-programmer. Semua OTOMATIS (auto-deteksi/pemicu, tanpa staff ketik nama), on-demand (token always-load hanya +2 penunjuk stub).

- **🐍 Paket Stack Python (§4.14 #7)** — gap baru karena stack owner pakai Python (§4.14 sebelumnya cuma JS/TS): secret via env + bandit, type hints + Pythonic (`is None`, mutable-default-arg), anti `except: pass`, FastAPI (`create_app`, router tipis, schema terpisah, deps, async), Django (N+1 `select_related`), pytest, Supabase-dari-Python (`service_role` server-only). Auto-deteksi `requirements.txt`/`pyproject.toml`/`*.py`.
- **🔧 Pola Perbaiki Error Build/Run (§4.15-A)** — pemicu "error/gagal build/merah/tidak jalan": deteksi sistem build (npm/pnpm/pip/poetry, tak hardcode) → baca error asli → perbaiki bertahap → verifikasi nyata. Penolong harian terbesar staff non-programmer.
- **✅ Pola Cakupan Tes + Generate (§4.15-B)** — petakan jalur belum-teruji → bikinkan tes kurang → jalankan. Standar QA tetap tinggi tanpa staff jadi programmer.
- **🔒 Pola Pindai Permukaan-AI (§4.15-C)** — inventaris MCP (`.mcp.json`) + izin/hook (`.claude/settings.json`) + skill kustom, mode cuma-baca; melengkapi OWASP (kode) + §8.1 (anti-AI-nakal) ke level konfigurasi-AI.
- 👨‍💻 Programmer: per-language Python rules + reviewer knowledge + 3 workflow pattern (build-fix/coverage/agent-surface) di-fuse jadi pola read-only auto-trigger. 🙂 Non-Programmer: kode Python kini punya ahli khusus; AI bantu benerin error + bikinkan tes + periksa "alat-alat AI"-nya — kamu cukup minta.
- **Kredit (MIT):** adaptasi ECC v2.0.0 `rules/python`+`fastapi.md`, `python-reviewer`/`fastapi-reviewer`/`django-reviewer`, `build-fix`/`build-error-resolver`, `test-coverage`, `security-scan`/`mcp-inventory.js` — ditulis ulang non-programmer, bukan disalin. Dikunci `tests/skills-divisi.Tests.ps1`. Cost-report sengaja ditunda (owner).

## [1.47.0] - 2026-06-19

### Ditambah — Paket Stack (§4.14): checklist profesional per-teknologi untuk stack web umum, otomatis

Lanjutan tutup gap "review per-bahasa/stack" (papan skor audit ECC #4/#5). Sekarang AI **auto-deteksi stack dari `package.json`/config** lalu menerapkan checklist stack-spesifik DI ATAS baseline 8 divisi §4.13 — staff cukup prompt biasa, tak perlu ketik apa pun. Detail di berkas on-demand (`LINTASAI_WORKFLOWS_v1.md` §4.14); token always-load TIDAK bertambah berarti (hanya 1 penunjuk di stub).

- **6 paket stack:** ⚛️ Next.js/React/TS (Server vs Client Component, env `NEXT_PUBLIC_` terbuka, server-state, container/presentational) · 🗄️ Supabase/Postgres (RLS wajib, `anon` vs `service_role`, index/EXPLAIN, migrasi terversion) · ☁️ Cloudflare Workers (secret via binding, stateless+KV/D1/R2, edge≠Node penuh) · 🚀 Deployment Vercel/Railway/Render (env per-environment, healthcheck+rollback, preview deploy) · 🔒 Keamanan Web OWASP Top 10 (pelengkap keamanan anti-AI-nakal §8.1 — project expert butuh keduanya) · 📈 SEO (Next.js Metadata API + Core Web Vitals).
- 👨‍💻 Programmer: per-stack rules + reviewer knowledge (RSC boundary, RLS, OWASP) di-fuse jadi checklist read-only yang auto-apply per area kerja. 🙂 Non-Programmer: tiap teknologi punya "ahli khusus" yang otomatis mengawal — kamu cukup minta fiturnya, AI yang jaga standar profesionalnya.
- **Kredit (MIT):** adaptasi `rules/` + `agents/*-reviewer` + `database-reviewer` + skill `postgres-patterns`/`deployment-patterns`/`seo` ECC v2.0.0 (kredit Supabase utk pola Postgres) + OWASP/WCAG — ditulis ulang non-programmer, bukan disalin. Dikunci tes `tests/skills-divisi.Tests.ps1`. Auto-trigger di stub §4.13 (`CLAUDE_universal_v1.md`).

## [1.46.0] - 2026-06-19

### Ditambah — perdalam 4 checklist divisi §4.13 (pinjam onderdil ECC, lisensi MIT) supaya standar profesional naik tanpa staff perlu mengetik apa pun

Hasil audit pembanding **lintasAI vs ECC v2.0.0** (MIT © Affaan Mustafa): kelemahan terbesar lintasAI = cakupan & review per-bidang. Empat onderdil ECC yang paling bernilai + paling bersih dipinjam diadaptasi ke bahasa non-programmer khas lintasAI dan **ditanam ke checklist divisi §4.13** — yang **otomatis diterapkan AI tiap staff prompt biasa** (tak perlu ketik "skill"). Token always-load TIDAK bertambah (detail di berkas on-demand `LINTASAI_WORKFLOWS_v1.md`).

- **A3 Aksesibilitas WCAG 2.2 (divisi UI/UX)** — dari 1 baris a11y jadi standar WCAG 2.2 AA konkret: teks alternatif gambar, label form, heading berurutan, peran ARIA + keyboard untuk komponen non-standar, jangan andalkan warna saja, ukuran target sentuh min ~24px. 👨‍💻 WCAG 2.2 AA / ARIA / target size. 🙂 Awam: web jadi ramah penyandang disabilitas — kayak pasang jalur kursi roda + huruf braille di gedung.
- **A4 Desain API (divisi Backend)** — format respons konsisten (amplop sukses+data+error+paginasi), status code benar (jangan semua 200), versioning `/v1/`. 👨‍💻 REST envelope + proper status codes. 🙂 Awam: "loket data" rapi & standar industri.
- **A1 Anti-telan-error / silent failure (divisi Backend)** — perkuat §12: dilarang `catch {}` kosong / fallback menyesatkan (`.catch(() => [])`); error wajib di-log berkonteks + dipropagasi. 🙂 Awam: error tak boleh "ditelan diam-diam" sampai jadi bug tersembunyi.
- **A2 Cek dokumentasi library (divisi Backend, anti-halusinasi)** — sebelum pakai fungsi/parameter library yang tak yakin, cek dokumentasi resmi versi terpasang (lewat alat docs/MCP kalau ada, mis. Context7) — bukan ingatan AI (§8.2 Aturan 1). 🙂 Awam: AI cek "buku manual resmi" dulu, tak sok tahu.
- **Kredit + tes pengunci:** sumber ditulis terbuka (ECC MIT + WCAG W3C, ditulis ulang bukan disalin); `tests/skills-divisi.Tests.ps1` mengunci keempat pendalaman ini agar tak diam-diam hilang saat berkas aturan disunting.

### Diperbaiki — robot pemindai Unicode kini baca UTF-8 eksplisit (deterministik lintas-versi PowerShell)

- **`lib/unicode-safety-check.ps1` baca berkas dengan `-Encoding UTF8`.** Sebelumnya `Get-Content` default di Windows PowerShell 5.1 = codepage ANSI → byte multi-byte UTF-8 yang SAH salah-ditafsir (mis. `中` = byte `E4 B8 AD` → byte `AD` keliru jadi U+00AD "soft hyphen") → **alarm palsu** + hasil beda 5.1 vs pwsh7 (gerbang gagal lokal, lulus di CI). 👨‍💻 Robot keamanan jadi benar-benar deterministik lintas-versi PowerShell (tujuan utamanya). 🙂 Awam: "lampu pendeteksi tinta-tak-terlihat" tadi salah baca huruf asing (China/Jepang) seolah mencurigakan — sekarang dibetulkan supaya tak salah-alarm. Ditemukan saat menjalankan Gerbang Pra-Rilis §4.6 di PowerShell 5.1; dikunci tes regresi CJK.

## [1.45.0] - 2026-06-19

### Ditambah — pola "satu sumber kebenaran" (kartu identitas project) + jaminan tawaran refactor di Fase B

Menjawab kebutuhan owner: kelola project dari **1 sumber konkret** (seperti `$variable` di PHP / `const` di React) supaya AI cepat memahami + hemat token + minim bug — **dan** memastikan tawaran rapikan-kode selalu muncul saat install pertama ke project setengah-jadi (mayoritas kasus nyata).

- **Kartu identitas project (`project.lintas.psd1`)** — berkas mesin-baca yang dideklarasikan SEKALI (tujuan/domain, peta modul→lokasi, stack, konvensi) di akar project. Lahir otomatis saat pasang (kolom stack di-derive dari `package.json`), dijaga robot anti-basi (`lib/project-manifest.ps1`: cek path modul ada + stack masih cocok + berkas valid). Format `.psd1` (dibaca PowerShell native, bisa komentar `#`). 👨‍💻 Single source of truth machine-readable; AI baca 1 tempat alih-alih meraba struktur tiap sesi. 🙂 Awam: kayak "kartu identitas" project yang AI lihat dulu sebelum kerja — lebih cepat + lebih murah token. Detail: `docs/project-manifest.md`.
- **Peta Sumber Kebenaran (`docs/PETA_SUMBER_KEBENARAN.md`)** + robot penjaga umum daftar-file-tim (`$teamFiles` ↔ `kit-files.psd1`) + **pembaca portfolio multi-repo** (Buku Induk yang dulu tak pernah dibaca skrip, kini punya konsumen mesin nyata) + robot anti-basi registry docs (`architecture_auto.md`). 🙂 Awam: peta yang menunjukkan tiap data project tinggal di mana, biar tak ada yang lupa diganti.
- **Label "SATU SUMBER KEBENARAN" yang menyesatkan dijujurkan** (`lintasai-portfolio.example.yml`, `STACK_VERSIONS.md`, `glossary.md`, `_PATTERNS.md`) — yang mengaku sumber-tunggal padahal cuma catatan/konvensi, kini diberi keterangan jujur.
- **JAMINAN tawaran Refactor Bertingkat di Fase B** (`JALANKAN_KIT.md` langkah **14d** + `CLAUDE_universal_v1.md` §4.11) — dulu tawaran "rapikan kode bertingkat" hanya muncul untuk project monorepo-berkode; project **setengah-jadi yang salah-terdeteksi kosong / non-monorepo / sudah-terpecah** kehilangan tawarannya. Sekarang tawaran refactor **WAJIB muncul sebagai popup untuk SEMUA project ber-kode**, apa pun bentuk repo-nya; deteksi ragu → **default tawarkan** (jangan lewati diam-diam). Dikunci tes anti-rot. 🙂 Awam: tawaran bersih-bersih kode sekarang muncul untuk semua project yang ada isinya — tidak lagi tergantung tebakan bentuk repo yang bisa meleset.

### [SECURITY] Diperbaiki — peringatan keamanan tak lagi terlewat saat update lompat versi

Menutup 2 temuan GENTING dari audit mekanisme update:

- **Label `[SECURITY]` dulu HILANG diam-diam** saat user melewati versi yang memuatnya (gaya judul `### [SECURITY]` tak dikenali parser banner update) — pernah terjadi nyata di v1.35.0. Deteksi label kini dipusatkan ke satu fungsi `Test-LintasChangelogLabel` (kenal gaya heading `#..######` + list/bold), dipakai bersama oleh classifier tier + banner update supaya dua aturan deteksi tak bisa berbeda lagi. 🙂 Awam: peringatan "pasang SEGERA" tak lagi bisa lolos tanpa ketahuan saat lompat beberapa versi.
- **Tes PERILAKU jalur-gagal** ditambah: unduhan (clone) gagal → kit lama dikembalikan otomatis; verifikasi tanda-tangan tag gagal → update dibatalkan (fail-closed). Dulu hanya dicek-tulisan; sekarang dicek-perilaku.

Terverifikasi: seluruh tes hijau + robot konsistensi bersih + PSScriptAnalyzer 0 temuan + **uji-lapangan di sesi nyata LULUS** (install pertama lanjut ke Fase B + project setengah-jadi terdeteksi benar + popup refactor muncul).

## [1.44.0] - 2026-06-18

### Ditambah — aturan "baca kode asli sebelum edit" (§7.3a) kini anti-lupa + dikunci tes otomatis

Aturan §7.3a (saat ubah/tambah/hapus kode: dokumen untuk NAVIGASI, **kode asli WAJIB dibaca sebelum edit**) dulu hanya ada di satu sub-bagian yang mudah terlewat. Sekarang ia **tertanam di alur inti + dijaga penjaga otomatis**, supaya AI konsisten cepat (tidak perlu menganalisa banyak hal) tanpa risiko bug dari dokumen basi.

- **Ditarik ke alur inti (anti "ngumpet"):** langkah "Read" + "Implement" di §3 (Workflow per task) + checklist Definition of Done §4 kini menunjuk eksplisit ke §7.3a; berkas pola tugas `LINTASAI_WORKFLOWS_v1.md` §4.2 ikut menggemakan aturannya. 🙂 Awam: aturan penting tadi cuma di "halaman 50", sekarang ditaruh juga di "halaman 1" yang selalu dibaca.
- **Penjaga otomatis bawaan didokumentasikan:** Claude Code memang sudah **menolak meng-`Edit`/`Write` berkas yang belum di-`Read`** di sesi itu (Read-before-Edit) — jadi baca-kode berkas-target sudah dipaksa mesin, gratis (~0 token). §7.3a kini menjelaskan ini + memberi **checklist mikro 5-centang** yang cepat & deterministik (cegah over-analisa).
- **Tes-pengunci anti-rot (`tests/modify-workflow-rule.Tests.ps1`):** kalau wiring §7.3a hilang dari salah satu dari 3 tempat (alur §3, DoD §4, berkas pola §4.2) atau catatan Read-before-Edit terhapus → **suite tes jadi merah sebelum rilis**. Aturan ini tak bisa lagi diam-diam hilang saat ada yang menyunting berkas aturan. 👨‍💻 8 assertion ASCII-only (aman di PowerShell 5.1).
- **Dokumen keunggulan diselaraskan** (§7.8 AUTO-SYNC): bagian J (Dokumentasi Otomatis) menambah poin §7.3a.

## [1.43.2] - 2026-06-18

### Ditambah — catatan di panduan pasang: popup izin Claude Code saat pasang itu NORMAL

Saat pengguna pasang lewat `npm create lintasai`, Claude Code kadang menampilkan kotak pilihan izin (mis. *"Cara jalan"* / *"diblokir auto-mode"*) karena penyaring keamanannya ekstra hati-hati dengan perintah `npm`. Ini **pengaman bawaan Claude Code, BUKAN error/bug lintasAI** dan **bukan** bagian alur pemandu kit (terjadi SEBELUM pemasangan jalan). Sebelumnya tidak terdokumentasi → staff non-programmer bisa panik / mengira pasang gagal.

- **Catatan baru di 3 panduan pasang** (`README.md` bagian "Cara pasang", `docs/NPX_INSTALL.md`, `docs/CLAUDE_CODE_MEDIATED_INSTALL.md` bagian Troubleshooting): popup izin ini NORMAL; **pilih "Izinkan di repo ini"** supaya AI memasang di project lalu langsung lanjut memandu (Fase B). 🙂 Awam: kayak Windows nanya "Aplikasi ini mau buat perubahan, izinkan?" — klik Izinkan untuk lanjut. 👨‍💻 Programmer: classifier `npm` Claude Code bisa tetap meminta konfirmasi walau perintah ada di allow-list; ini di luar kendali kode kit (kit hanya bisa menjelaskan + menyarankan opsi yang benar). Hanya perubahan dokumen — tidak ada perubahan perilaku/kode.

## [1.43.1] - 2026-06-18

### Diperbaiki — pengguna pertama-kali install kini lebih andal lanjut ke pemanduan (Fase B) + deteksi project "setengah jadi" tidak lagi salah-vonis "kosong"

Permintaan owner: dari awal kit ini ditujukan membantu orang dengan project **setengah jadi**, lewat pemanduan AI di chat (Fase B: tawaran audit + adopsi kode yang sudah ada). Ternyata pengguna pertama-kali sering **tidak otomatis lanjut** ke Fase B. Dua sebab GENTING ditemukan + diperbaiki (tidak ada perubahan breaking — hanya teks panduan + pesan penutup pemasang).

- **Deteksi "setengah jadi" tidak lagi pakai perintah Unix yang gagal di Windows.** 👨‍💻 Programmer: `POST_SETUP_CHECKLIST_PROMPT_v1.md` [1] dulu menyuruh AI scan pakai `find`/`grep`/`wc` — di PowerShell (shell utama Windows) `find` me-resolve ke `find.exe` (cari-teks, bukan cari-file) dan `grep`/`wc` tidak ada → hasil **0 palsu** → project nyata divonis "kosong" → Popup audit dilewati diam-diam. Sekarang deteksi pakai **tool berkas Claude Code (`Glob`/`Grep`/`Read`)** yang tool-agnostik + merujuk **SUMBER TUNGGAL** kriteria OR di `JALANKAN_KIT.md` step 10 (menghapus drift ambang `src/lib` 3 vs 10) + **fail-safe**: kalau scan galat/0 mencurigakan → JANGAN simpulkan kosong, tawarkan audit / tanya. 🙂 Awam: dulu alat ukur "seberapa penuh project" pakai bahasa yang tidak dimengerti Windows jadi selalu nunjuk "kosong" (kayak timbangan rusak) → bantuan audit dilewati; sekarang pakai alat yang benar + aman saat ragu.
- **Pesan penutup pemasang dikeraskan supaya AI tidak berhenti di "SIAP NGODING".** 👨‍💻 Programmer: saat AI yang menjalankan pemasang (jalur yang disarankan), aturan auto-lanjut (§4.3b) belum ter-load di sesi itu (pemuat aturan baru dibuat installer di tengah sesi; Claude Code memuat `CLAUDE.md` hanya saat sesi START), jadi satu-satunya pembawa ke Fase B = teks penutup di output — dan baris terakhirnya `"Status: SIAP NGODING"` gampang disangka "selesai". Sekarang baris **terakhir** output = direktif AI eksplisit "JANGAN berhenti, lanjut Fase B sekarang" + header checklist menegaskan "Fase A selesai, tugasmu BELUM". 🙂 Awam: dulu struk hasil pasang diakhiri kata "SIAP NGODING" (kayak struk ATM "Transaksi selesai") jadi AI sering mengira tugasnya kelar; sekarang kalimat terakhir jelas menyuruh AI lanjut memandu.

## [1.43.0] - 2026-06-18

### Diubah — alur popup pemasangan ditata ulang + catatan kode kini 2 versi (programmer + awam)

Permintaan owner: urutan PETA pemasangan dibuat lebih masuk akal + catatan kode lebih berguna untuk semua orang. **Tidak ada perubahan breaking** — semua popup tetap ada & berfungsi; ini penataan ulang urutan + penggabungan, bukan penghapusan fitur. Berlaku untuk pemasangan BARU (install lama tidak terpengaruh).

- **Audit pindah ke DEPAN** (Popup #2, sebelum keputusan bentuk-kode) — temuan audit jadi bahan pertimbangan saat memilih rapikan vs pecah. Denah project + denah database + catatan kode SEMUA ditunda ke langkah AKHIR (tidak 2x kerja, cocok dengan kode final).
- **Popup "ukuran tim" + "pecah-repo" DIGABUNG jadi 1** (Popup #3 "Ukuran Tim + Bentuk Kode"): [1] tetap 1 tempat + rapikan bertingkat (cocok 1 orang) / [2] pecah 3 repo frontend+backend+shared (tim 3-5+) / [3] multi-repo 6-10 layanan (tim 15-30+). 🙂 Awam: lebih sedikit klik, bentuk kode langsung nyambung dengan ukuran tim. 👨‍💻 Programmer: ukuran tim diturunkan dari pilihan topologi; project kosong / sudah-terpecah pakai versi RINGKAS (cuma ukuran tim).
- **Catatan kode tiap file kini 2 VERSI dalam 1 berkas**: 👨‍💻 untuk programmer (teknis akurat + `path:baris`) + 🙂 untuk non-programmer (analogi sehari-hari) — supaya owner/staff awam paham fungsi berkas tanpa baca kode. Selaras §7.8 + §4.1.
- **Project kosong**: popup audit + rapikan/pecah dilewati otomatis (tak ada kode untuk diaudit/dirapikan), TAPI ukuran tim TETAP ditanya (berkas tim aktif benar sejak awal). Nama repo multi-repo = auto-deteksi dari fitur project (BUKAN nama paku-mati ke 1 jenis project).
- **Berkas tersentuh**: `JALANKAN_KIT.md` (Bagian 0/3/4/4b/5/5c/6 ditata ulang), `POST_SETUP_CHECKLIST_PROMPT_v1.md`, `CLAUDE_universal_v1.md` §4.3b, `LINTASAI_WORKFLOWS_v1.md`, `docs/NPX_INSTALL.md`, `docs/CLAUDE_CODE_MEDIATED_INSTALL.md`, `README.md`. QA+QC: seluruh tes hijau + robot konsistensi bersih.

## [1.42.0] - 2026-06-17

### Ditambah — tombol naik-versi 1-langkah `kit.ps1 bump <versi>` (anti "lupa ganti satu berkas")

Permintaan owner: naik versi tak perlu lagi mengedit 6 berkas manual (boros waktu + token + rawan lupa salah satu — riwayat nyata: README nyangkut 5 rilis). Kemampuan "cap versi" ditambahkan ke robot konsistensi yang SUDAH ADA (pakai ulang daftar tempat-versi yang sama = satu sumber kebenaran lokasi versi), bukan berkas baru. **Tidak ada perubahan breaking.**

- **`kit.ps1 bump 1.42.0`** (atau `consistency-check.ps1 -SetVersion 1.42.0`) dalam 1 perintah: cap nomor versi baru ke `package.json` (sumber kebenaran) + 4 deklarasi (judul CLAUDE_universal, README, KEUNGGULAN, templates/INDEX) + sisipkan kerangka entri CHANGELOG (tanggal otomatis), lalu auto-jalankan pemeriksaan kecocokan. Hanya nomor versi yang diganti (format berkas + status BOM dipertahankan → diff bersih).
- **Pengaman:** guard hanya jalan di repo kit (`package.json name='lintasai'`, bukan project staf); tolak format versi invalid; tolak downgrade (cegah salah ketik); idempoten (cap versi sama 2x tak menggandakan entri CHANGELOG). Deskripsi CHANGELOG tetap ditulis manusia (placeholder yang diganti).
- **Tes:** +8 tes Pester di `tests/consistency-check.Tests.ps1` (stamp 6-berkas, kerangka CHANGELOG, guard non-kit, tolak-downgrade, tolak-format, idempoten, banding semver). Dogfood: rilis ini sendiri di-bump pakai perintah baru ini.

## [1.41.0] - 2026-06-17

### Diubah — Tinjauan lintasAI Divisi: 2 versi (programmer + non-programmer) kini DIPISAH baris-per-baris (lebih mudah dibaca)

Permintaan owner: blok tinjauan/temuan lebih enak dibaca dengan dua sudut pandang dipisah jelas, bukan didempetkan dalam satu sel tabel (apalagi di layar sempit / HP). **Tidak ada perubahan breaking** — tabel lama masih terbaca; ini penyempurnaan tampilan + penegasan aturan.

- **Format blok per divisi, bukan tabel 3-kolom berdempet.** Tiap lensa divisi kini ditulis sebagai blok: nama divisi (bold) lalu **dua baris berlabel** di bawahnya — `👨‍💻 Programmer:` (teknis akurat) dan `🙂 Non-Programmer:` (analogi awam). Sebelumnya 2 sudut pandang itu dijejalkan dalam satu baris tabel.
- **"Selalu ada 2 versi" dipertegas.** Tiap divisi WAJIB memuat baris 👨‍💻 DAN baris 🙂 — jangan salah satu saja. Baris 🙂 tetap wajib & 100% dipahami staff awam (tie-breaker §0 #3 tak dikorbankan); baris 👨‍💻 **menambah** ketepatan teknis, bukan menggantikan.
- **Cakupan:** berlaku untuk blok Tinjauan lintasAI Divisi + laporan temuan/audit. Isi **jawaban utama tetap 1 versi** (sudah wajib ramah-awam per §2.1) — tidak digandakan, jadi hemat token.
- **Berkas tersentuh:** `CLAUDE_universal_v1.md` §4.1 + §2.1.1 (Kategori #4), `LINTASAI_WORKFLOWS_v1.md` §4.1 (skeleton + contoh terisi), `KEUNGGULAN_LINTASAI.md`. QA+QC: seluruh tes hijau + robot konsistensi bersih.

## [1.40.0] - 2026-06-17

### [SECURITY] Ditambah — hardening rantai-pasok + penjaga rahasia (dari audit menyeluruh)

Hasil audit menyeluruh kit (READ-ONLY, 15 pemeriksa, tiap temuan dicek-silang skeptis). Fokus: lebih aman + lebih tahan-bug + dokumen tak gampang basi. **Tidak ada perubahan breaking.**

- **[SECURITY] Kunci GitHub Actions ke commit SHA** — 27 pemakaian Action di 11 berkas (workflow kit + template staf) dikunci dari label bergerak (`@v4`/`@v6`/`@v7`) ke commit SHA penuh; cegah "label dibajak" kalau akun Action diretas (pernah terjadi nyata, mis. tj-actions). Tiap SHA diverifikasi dari GitHub resmi. + `.github/dependabot.yml` jaga pin tetap segar (staff dijaga Renovate `config:recommended`). Selaras OpenSSF Scorecard.
- **[SECURITY] Penjaga rahasia pre-commit (opt-in)** — `templates/hooks/pre-commit-secret-scan.sh` + `install-secret-hook.ps1`: tolak commit file `.env` asli / isi mirip kunci API DI LAPTOP sebelum terkirim (shift-left); cuma cetak NAMA berkas, tak pernah nilainya. Pelengkap lokal `secret-guard.yml`. Pasang: minta AI "pasang penjaga rahasia pre-commit". Bagian "Pencegahan" ditambah ke `SECURITY_INCIDENT_PLAYBOOK.md`.

### Diperbaiki

- **Crash `kit diff`** saat manifest punya entry `sha256` null (file hilang saat manifest dibuat / manifest di-tamper) — beri penjaga null sebelum `.ToLower()` (tiru `Invoke-Doctor`). + tes regresi `tests/kit-diff.Tests.ps1` (jalan via `powershell.exe`).
- **Celah tes**: `Publish-AgentsMd` (penulis `AGENTS.md`) sebelumnya tanpa tes end-to-end — tambah `tests/agents-md.Tests.ps1` (CREATE/PRESERVE/BACKUP + nilai literal `$0`/`$` + UTF-8 tanpa BOM).
- **Angka basi di dokumen** (jumlah tes "319", "18 suite", `README` "v1.37.0") diganti rujukan dinamis ("jalankan `tests/Run-Tests.ps1`" / "lihat `CHANGELOG`") supaya kelas-bug "angka lupa diganti" tak terulang.

### Catatan

- `.gitattributes` baru: `*.sh` = LF (CRLF merusak shebang hook bash).
- QA+QC: seluruh tes hijau, robot konsistensi bersih, PSScriptAnalyzer bersih (cara CI seluruh repo).
- **Belum dikerjakan (butuh keputusan owner)**: aktifkan provenance npm (repo sudah publik) + GPG verify-jika-bisa.

## [1.39.0] - 2026-06-17

### Ditambah — robot anti-drift "buku fakta" + doktrin scan-cepat (default kit + client)

- **Robot konsistensi (`lib/consistency-check.ps1`) diperluas jadi "buku fakta"** — selain nomor versi, kini menjaga **angka berulang yang bersumber-kode** secara otomatis. Pertama: jumlah file tim (**31** = dihitung dari `$teamFiles` di `setup-pola-b.ps1`; sub **8** di `.github` + **23** di `docs`) dicek cocok di README + JALANKAN_KIT, mengecek **SEMUA** kemunculan (1 dokumen boleh sebut angka >1x). Tambah fakta baru = cukup 1 blok di `$script:KitFacts`. Mencegah bug "angka lupa diganti" (riwayat nyata: 17→28→30→32, padahal asli 31). + tes positif/negatif.
- **Doktrin DEFAULT scan-cepat (§6.3)** — cek-drift/duplikasi + discovery = **robot deterministik / `grep` DULU** (detik, ~0 token), BUKAN kerahkan banyak agen AI baca semua (lambat, boros token, rawan rate-limit). AI fan-out = pengecualian + WAJIB gelombang kecil. Berlaku di kit **DAN** tiap project client (robot ikut terpasang; client daftarkan fakta di `docs/consistency-map.psd1`).
- Robot tetap mode aman cuma-baca; jalan otomatis di tes + Gerbang Pra-Rilis §4.6.

### Diperbaiki — dokumen pemasangan (akurasi)

- **Jalur pasang utama = lewat Claude Code chat (biar AI yang jalankan).** Saat AI yang memasang, popup jendela Windows otomatis dilewati → staff langsung masuk pemanduan di dalam chat. Dokumen lama (`README.md`, `docs/NPX_INSTALL.md`, `docs/CLAUDE_CODE_MEDIATED_INSTALL.md`) keliru menyebut popup jendela Windows tetap muncul saat AI yang pasang — sudah dibetulkan. Jalur PowerShell manual tetap ada sebagai cara cadangan (jujur: cara ini memang memunculkan popup jendela Windows).
- **Jumlah file tim dibetulkan jadi 31** (8 di `.github/` + 23 di `docs/`). Dokumen sebelumnya tak konsisten (menyebut 32 di satu bagian, 30 di bagian lain). Sumber kebenaran = `$teamFiles` di `setup-pola-b.ps1`. (`README.md`, `JALANKAN_KIT.md`)

Tidak ada perubahan PERILAKU runtime kit (robot = alat pemeriksa, bukan jalur eksekusi installer). Tes lulus + robot konsistensi bersih.

## [1.38.0] - 2026-06-17

### Ditambah — §6.3: 4 disiplin operasional efisiensi (dari sesi audit nyata)

Menambah 4 aturan operasional ke Doktrin Kecepatan §6.3 (always-load, berlaku di kit + SEMUA project klien) — diambil dari sesi audit menyeluruh 2026-06-17 yang menemukan di mana AI SENDIRI boros waktu/token TANPA menambah kualitas. Tujuan: AI di tiap project otomatis lebih cepat + hemat, kualitas tetap = lantai (§0).

- **Disiplin 1 — gelombang kecil saat fan-out besar:** banyak agen disebar 3-4 per gelombang bergiliran + 1 coba-ulang, bukan puluhan serempak (yang bikin server overload -> separuh agen mati -> kerja terbuang diulang). Yang membatasi = arus-token, bukan jumlah agen.
- **Disiplin 2 — uji bagian paling berisiko DULU, sendirian:** perubahan kripto/keamanan/destruktif diuji terisolasi sebelum suite penuh (gagal-kecil-awal lebih murah).
- **Disiplin 3 — prediksi hasil SEBELUM mengedit:** perubahan ber-interaksi tak-jelas (glob/regex/config) dibaca cukup untuk ditebak hasilnya, baru edit sekali (hindari putar-balik edit->cek->batal).
- **Disiplin 4 — pastikan alat benar-benar jalan:** "0 masalah/bersih" dari perintah yang ERROR = palsu; cek perintah sukses dulu.

+ tes pengunci (`setup-pola-b.Tests.ps1`) supaya 4 disiplin tak terhapus tak sengaja. Tidak ada perubahan kode/perilaku program — murni penambahan aturan (always-load, ditulis ringkas demi hemat token).

---

## [1.37.1] - 2026-06-17

### Diperbaiki — hasil audit menyeluruh (3 tingkat: dokumen -> kode kecil+tes -> berisiko)

Rilis perbaikan dari audit menyeluruh kit (READ-ONLY, ~80 pemeriksa AI, 16 bidang, tiap temuan dicek-silang skeptis). **Tidak ada masalah GENTING**; ini perbaikan + pengetatan keamanan + tambahan tes. **319 -> 349 tes hijau.**

**Keamanan / jalur destruktif:**
- **`update-kit.ps1`: saklar baru `-YesDeleteNoBackup`, dipisah dari `-Force`.** Dulu `-NoBackup -Force` diam-diam MENGHAPUS PERMANEN `.claude-kit/` tanpa konfirmasi (padahal `-Force` didokumentasikan hanya untuk bypass allowlist URL) -> risiko kehilangan data. Sekarang auto-hapus-tanpa-backup butuh `-YesDeleteNoBackup` eksplisit; tanpa itu, sesi non-interaktif ABORT (fail-closed). **Catatan pemakai lama:** kalau ada skrip/CI yang pakai `-NoBackup -Force` untuk hapus otomatis, ganti ke `-NoBackup -YesDeleteNoBackup`.
- **`kit.ps1 doctor`: verifikasi keaslian manifest (tanda-tangan HMAC) DULU** sebelum melapor "PRISTINE" — supaya tidak memberi rasa aman palsu pada daftar berkas yang mungkin sudah diubah. Helper baru `Get-LintasManifestSignatureStatus` (round-trip kanonik teruji = tanpa alarm palsu).
- **`manifest-signing.ps1`: banding tanda-tangan byte-exact (Ordinal).** Dulu banding antar-karakter PowerShell (`-ne`) case-INSENSITIVE -> 2 tanda-tangan base64 beda kapitalisasi keliru dinilai sama.

**Anti-macet / keandalan:**
- **`install-windows.ps1`: gerbang non-interaktif** (`[Console]::IsInputRedirected` + env) sebelum prompt -> tidak menggantung kalau dijalankan langsung (AI/CI) dengan stdin pipa terbuka.
- **`project-detect.ps1`: anti-error folder kosong** — `Get-MonorepoState` membungkus `@()` supaya folder kosong = 0 file, bukan crash di StrictMode.
- **`consistency-check.ps1`: pesan error akurat** saat peta-konsistensi punya kunci `Checks` tapi kosong.
- **`kit.ps1 status`: baca `metadata.signature`** (jalur benar).

**CI / rilis:**
- Job CI **izin minimal** (`contents: read`) di `validate.yml` + job test `publish-npm.yml`.
- Job baru **`fast-smoke-ps51`**: uji parse di **Windows PowerShell 5.1** (runtime staf), bukan cuma PowerShell 7.
- **Gerbang cek** `index.js` sebelum terbit `create-lintasai`.

**Tes:** +4 suite pengaman (`manifest-signing`, `project-detect`, `git-helpers`, `audit-helpers`) untuk bagian yang tadinya tanpa tes, termasuk regresi tanda-tangan case-sensitivity + anti-crash folder kosong.

**Dokumen:** perbaikan tautan menggantung + angka/tanggal basi + jargon Inggris (README, CLAUDE_universal "6->7 prinsip" §4.6, WORKFLOWS, RESEP_PERUBAHAN, ANALOGI_LIBRARY, INDEX, ONBOARDING).

Ditunda sengaja: NPM-1 (keluarkan `install-pre-commit.ps1` dari paket npm) — `files[]` `*.ps1` cocok rekursif; daftar manual = risiko lupa-daftar skrip baru > manfaat (RAPIKAN).

---

## [1.37.0] - 2026-06-17

### Ditambah — Doktrin Kecepatan & Efisiensi universal (§6.3): cepat + hemat token TIAP task, di kit + semua project klien

Lanjutan permintaan owner ("scan/kerja terasa lama"): perluas prinsip efisiensi supaya berlaku **tiap task** (memindai DAN mengeksekusi), bukan cuma di gerbang pra-rilis, dan **eksplisit universal** (auto-baca di kit lintasAI + tiap project yang memasang lintasAI).

- **§6.3 baru** (always-load): 7 prinsip efisiensi §4.6 (scope ke blast radius · robot deterministik dulu · paralel saat besar · pakai-ulang & tes 1x · periksa yang berubah saja · berhenti saat cukup · **default Pindai Cepat, kerahkan banyak-agen HANYA saat perlu**) WAJIB diterapkan di SETIAP task — termasuk eksekusi fitur/perbaikan biasa.
- **Usaha pas-ukuran:** task kecil → kerjakan langsung & ringan; pengerahan besar (banyak agen / baca luas / seluruh tes) HANYA saat user minta "menyeluruh"/"lintasAI skill", mau rilis, atau perubahan luas. Hindari ledakan usaha untuk hal sepele = sumber utama "lama + boros".
- **Kualitas = lantai, kecepatan = cara:** keamanan + anti-halusinasi + bahasa non-programmer + cakupan verifikasi tak pernah dipangkas demi cepat (tie-breaker §0).
- Catatan: prinsip "default Pindai Cepat" (§4.6 #7, sejak v1.35.0) sudah auto-berlaku di project klien; v1.37.0 mempertegas cakupannya ke eksekusi + membingkainya universal. Tambah ~10 baris always-load (dijaga ringkas, menunjuk §4.6 tanpa duplikasi).
- 319/319 tes lulus, PSScriptAnalyzer bersih, smoke PASS.

## [1.36.0] - 2026-06-17

### Diubah — "Tinjauan Multi-Divisi" → "Tinjauan lintasAI Divisi" + format 2 sudut pandang (programmer + non-programmer)

Permintaan owner: ganti nama blok tinjauan jadi **"🎯 Tinjauan lintasAI Divisi"** + sajikan tiap temuan dalam **2 sudut pandang** sekaligus, biar berguna untuk SEMUA pembaca (developer/CTO maupun staff awam).

- **Heading** sekarang literal **"🎯 Tinjauan lintasAI Divisi"** (drop "(Menggunakan Analogi Non-Programmer)").
- **Format tabel jadi 3 kolom:** `| Divisi | 👨‍💻 Programmer | 🙂 Non-Programmer |`. Kolom 👨‍💻 = teknis akurat (boleh `file:line` + istilah industri); kolom 🙂 = analogi mudah (tools digital populer + contoh konkret).
- **Bahasa non-programmer TIDAK turun:** kolom 🙂 TETAP WAJIB & harus 100% dipahami staff awam (tie-breaker §0 #3 tak dikorbankan); kolom 👨‍💻 **menambah** ketepatan teknis, bukan menggantikan.
- Diselaraskan di seluruh kit: §4.1 (definisi) + §2.1.1 kategori #4 (PRE-SEND CHECKLIST) + contoh & skeleton `LINTASAI_WORKFLOWS_v1.md` §4.1 + `POST_SETUP_CHECKLIST_PROMPT_v1.md` + `setup-pola-b.ps1` (closing) + `PROMPT_LIBRARY.md` + `KEUNGGULAN_LINTASAI.md`. Entri CHANGELOG lama (sejarah) sengaja tidak diubah.
- 319/319 tes lulus, PSScriptAnalyzer bersih, smoke PASS.

## [1.35.0] - 2026-06-17

### Ditambah — 8 Skill Divisi WAJIB di tiap project (otomatis, tak boleh dihapus, boleh ditambah)

Lahir dari owner: tiap install lintasAI WAJIB otomatis punya **8 skill divisi profesional** sebagai standar minimum di tiap project — staff non-programmer otomatis "didampingi 8 ahli" tanpa harus tahu cara menyetelnya.

- **Bagian baru §4.13** di `CLAUDE_universal_v1.md` (aturan ringkas selalu-baca) + checklist detail per-divisi di `LINTASAI_WORKFLOWS_v1.md` §4.13 (dibaca saat dipanggil — hemat token). 8 divisi: **Backend, Frontend, Database, Webdesign, UI/UX, DevOps, Cyber Security/Anti-Hacker, SEO**.
- **Baseline = lantai (floor):** selalu aktif (AI sudah menjalankannya via §1 peran lintas-divisi + §4.1 Tinjauan Multi-Divisi; §4.13 menamai + mengunci jadi WAJIB). Hidup DI DALAM `.claude-kit/` yang ditimpa segar tiap update → **tak bisa dihapus permanen**. AI DILARANG menonaktifkan/membuang salah satu lensa walau diminta.
- **Otomatis untuk staff non-programmer (tanpa ketik "skill"):** staff cukup ngeprompt biasa ("tolong tambah halaman X") — AI otomatis menerapkan checklist 8 divisi yang relevan ke tiap berkas yang dibuat/diubah. File hasil tetap ikut standar profesional walau staff tak tahu istilah divisinya. Mengetik **"skill <divisi>"** hanya untuk MEMFOKUSKAN 1 divisi.
- **Cocok di SEMUA topologi:** 1 repo (monorepo) / 3-split (`-frontend`/`-backend`/`-shared`) / multi-repo 6-10 layanan (landing-page/dashboard/data-domain/seoanalysis/pbn/redirect/dll). 8 divisi = standar minimum SAMA di mana pun; **penekanan** menyesuaikan peran repo (auto-deteksi dari nama/peta), 🔒 Cyber Security selalu primer, baseline (lantai) tak pernah turun. Tabel pemetaan per topologi di `LINTASAI_WORKFLOWS_v1.md` §4.13.
- **Boleh ditambah:** client tambah divisi baru ATAU perluas salah satu dari 8 lewat skill kustom §4.9 (`docs/SKILLS_LOCAL.md`). **Anti-bentrok** dengan aturan lama "lokal menang": skill lokal boleh **memperluas** di atas baseline, TAPI TIDAK boleh **menonaktifkan/menggantikan** lensa dasar.
- Tes pengunci `tests/skills-divisi.Tests.ps1` (anti-drift: 8 divisi WAJIB tetap utuh di kedua berkas, + penegasan otomatis & topologi).

### Diperbaiki — Pindai lebih cepat + hemat token (tanpa menurunkan kualitas)

Lahir dari owner: "kalau memeriksa sesuatu selalu lama". Gerbang QA+QC §4.6 dapat **prinsip ke-7**: **default = Pindai Cepat** (robot deterministik + lewatan terfokus di area terdampak); fan-out banyak-agen (10+) DIPESAN hanya untuk audit eksplisit / rilis besar / permintaan "menyeluruh" — bukan untuk cek rutin. Sumber utama "scan lama" = fan-out berlebihan untuk hal kecil. Cakupan tetap penuh; yang dipangkas cuma cara kerjanya.

### [SECURITY] Diperbaiki — 3 celah keamanan dari audit 8-divisi (pindai menyeluruh, mode aman cuma-baca)

- **Janji pengaman "hantu" di template backend.** `templates/split-agents/BACKEND.md` dulu menyebut skrip `prisma-guard.mjs` seolah **sudah ada** (padahal tidak ada di kit) + menganjurkan `PRISMA_GUARD_BYPASS=1` untuk menerobos. Memberi rasa-aman palsu (mirip pelajaran "tier-guard hantu"). Diubah jadi jujur: pengaman migrasi-prod **harus dibuat dulu** oleh owner sebelum diandalkan, + larang "mode paksa" menerobos pengaman (selaras §8.1 #10).
- **Penjaga rahasia gratis (`secret-guard.yml`) kini menangkap kunci "gudang emas":** token JWT (`eyJ...`) + alamat database ber-password (`postgres/mysql/mongodb://user:pass@`) — disamakan dengan lapis AI (`ai-review.js`). Sebelumnya hanya kunci Anthropic/AWS/GitHub/Slack/GitLab, sehingga alamat database (paling berharga) bisa lolos.
- **Panduan darurat keamanan tersambung ke aturan auto-load.** §8 kini punya pemicu: saat ada sinyal kebocoran rahasia/akses tak sah (mis. staf chat "kayaknya aku ke-commit `.env`") → AI WAJIB buka `docs/SECURITY_INCIDENT_PLAYBOOK.md` + pandu langkah demi langkah; JANGAN ganti-kunci/force-push sendiri.

## [1.34.0] - 2026-06-17

### Ditambah — Perintah pasang gaya npm: `npm create lintasai`

Lanjutan permintaan owner: selain `npx lintasai init`, sediakan perintah berbasis `npm`. Karena `npm` sendiri tidak menjalankan paket (itu tugas `npx`), cara yang sah + idiomatik = pola scaffolder `npm create <nama>` (seperti `npm create vite`).

- **Paket baru `create-lintasai/`** (tipis): saat `npm create lintasai` / `npm init lintasai` dijalankan, ia mendelegasikan ke peluncur paket `lintasai` (dependency `^1.33.0`) lalu menjalankan `init` di folder user. Hasilnya sama persis dengan `npx lintasai init`. Satu sumber kebenaran (logika setup tetap di `lintasai`); create-lintasai nyaris tak perlu rilis ulang saat lintasai update.
- **Workflow `publish-create-lintasai.yml`** (manual `workflow_dispatch`, idempotent) untuk menerbitkan paket scaffolder ini sekali pakai `NPM_TOKEN`.
- Tes `tests/create-lintasai.Tests.ps1` + terdaftar di manifest `lib/kit-files.psd1`. Wiring terbukti (lintasai resolve dari create-lintasai di folder uji).
- **Juga mengembalikan perbaikan gaya kode** (commit `ee5dac6`: `Get-LintasVersionFinding` + `Test-Utf8Bom` + BOM) yang tidak ikut ter-merge ke `main` saat PR #1 digabung — sehingga cek gaya (`validate.yml`) di `main` kembali hijau.

### Diperbaiki + Diubah — Satu cara pasang (npm) + 2 bug GENTING alur update

Lahir dari audit alur rilis→distribusi→update (puluhan pengguna) + keputusan owner "satu cara pasang npm saja, biar staff tak bingung npm atau npx".

- **[FIX GENTING] `npx lintasai update` kini menyasar kit di project, bukan folder cache npm.** Dulu `update-kit.ps1` mengambil lokasi kit dari posisi script (= folder cache npm saat lewat peluncur), sehingga update jalur ini diam-diam TIDAK mengubah `.claude-kit/` project (pengguna kira sudah update padahal belum). Sekarang lokasi kit didamaikan dari `-ProjectRoot` (meniru pola `kit.ps1:70-75` yang sudah benar). Jalur `kit.ps1 update` / "minta AI update" tidak terdampak (memang sudah benar). Terverifikasi via uji SIMULASI + tes baru.
- **[FIX GENTING] Pesan pemulihan setelah update gagal kini menunjuk cara yang benar.** Dulu menyuruh `kit.ps1 rollback` (yang hanya memulihkan berkas project per-satuan) untuk masalah "kit baru rusak" — memberi rasa-aman palsu (staff kira sudah balik, padahal kit masih versi rusak). Sekarang mengarahkan ke pemulihan FOLDER cadangan utuh (`.claude-kit.backup-<tanggal>`) atau "minta AI: 'rollback dong'".
- **[Diubah] Satu cara pasang resmi: `npm create lintasai`.** Semua instruksi `npx lintasai ...` di dokumen diganti jadi `npm create lintasai` (pasang) + "minta AI / `.\.claude-kit\kit.ps1 <perintah>`" (update/cek/rollback/uninstall). Tujuan: staff non-programmer tak perlu memutuskan "npm atau npx". `npx` untuk alat lain (prisma/MCP/shadcn/dll) + entri sejarah CHANGELOG/AUDIT_HISTORY **tidak** diubah. `docs/NPX_INSTALL.md` dialih-fungsi jadi panduan pasang-via-npm (nama berkas dipertahankan demi keutuhan manifest).
- **[Diubah] `create-lintasai` dipatok ke `lintasai@latest`** (bukan caret `^1.33.0`) supaya pintu pasang utama SELALU memasang versi terbaru — termasuk saat kit naik ke major berikutnya (caret tidak ikut lompat major → bisa diam-diam basi). + tes pengunci.
- **[FIX PENTING] Banner '[SECURITY]/[BREAKING] — pasang SEGERA' kini dipindai di SELURUH rentang versi yang dilewati**, bukan cuma entri CHANGELOG teratas. Dulu kalau pengguna lompat banyak versi sekaligus (mis. v1.20 → v1.33), peringatan keamanan yang ada di versi-tengah (mis. v1.27) TIDAK muncul. Tambah fungsi `Get-ChangelogRangeBody` di `update-kit.ps1` + 2 tes.
- **[Keamanan — provenance npm DITUNDA]** Provenance npm (bukti-pabrik Sigstore/OIDC) sempat dinyalakan tapi **dimatikan lagi**: npm hanya mendukung provenance untuk repo **PUBLIK**, sedangkan repo ini **private** (publish gagal `E422`). `publishConfig.provenance: false` di kedua paket. **Bisa diaktifkan nanti KALAU repo dijadikan publik** (panduan: `docs/SIGNED_RELEASE.md`).
- **[PENTING Dokumen jujur] `docs/SIGNED_RELEASE.md`** diberi banner STATUS: penandatanganan tag GPG **belum** aktif (penanda versi belum ditandatangani + `.github/owner-pubkey.asc` belum ada) → dokumen jadi panduan MENGAKTIFKAN, bukan klaim keadaan sekarang (hapus rasa-aman palsu). Benar-benar mengaktifkan = butuh kunci GPG owner.
- **[PENTING Proses] Runbook rilis `CONTRIBUTING.md` + pengingat anti beda-versi:** WAJIB tunggu robot penerbit HIJAU sebelum mengumumkan rilis ke staff (git tag langsung dibaca jalur update kit; npm baru terisi setelah robot selesai → kalau gagal, tim bisa jalan beda-versi).
- **[PENTING Dokumen] `TEAM_ROLLOUT_GUIDE_v1.md` disegarkan ke era npm:** tambah callout `npm create lintasai` (pasang) + "minta AI: tolong update kit" (update); ganti langkah update lama (`install-windows.ps1` + git pull).
- **[RAPIKAN] Samakan istilah "rollback"** di `kit.ps1` (bantuan + deskripsi): perjelas `kit.ps1 rollback` memulihkan berkas project **per-satuan** — untuk balik SELURUH folder kit yang rusak, kembalikan `.claude-kit.backup-<tanggal>` (atau minta AI "rollback dong"). Hilangkan kesan "balik seluruh versi".
- **[RAPIKAN] Jujurkan klaim update `AGENTS.md`** di `UPDATE_KIT_PROMPT_v1.md`: script **TIDAK** mengubah `AGENTS.md` otomatis (cuma mencetak pengingat) — koreksi daftar langkah yang dulu menyebutnya otomatis (+ perjelas cleanup `.bak` itu opt-in `-CleanupBackups`).
- **[RAPIKAN] Tutup celah tes pada penjaga repo-tepercaya** (`Test-LintasTrustedRepo`): tabel-kebenaran 9 kasus (URL resmi + variannya → tepercaya; owner-lain/repo-fork/host-beda/kosong → ditolak) sebagai jaring anti-regresi keamanan jalur update.
- **[RAPIKAN] Perintah baru `kit.ps1 check-update`** (juga `npx lintasai check-update`): cek apakah ada versi baru **TANPA** mengubah apa pun (read-only), pakai logika deteksi-versi yang sama dengan update asli (flag `-CheckOnly` di `update-kit.ps1`). Dibuat **anti-macet**: mode cek-saja melewati semua prompt allowlist/konfirmasi (array-splat `@ExtraArgs` di PS 5.1 bisa salah-bind switch → dihindari). + 5 tes.
- **[RAPIKAN] Rotasi FOLDER cadangan `.claude-kit.backup-*`** di `Invoke-BackupCleanup` (keep latest 3) — dulu cuma menyapu FILE `.bak`/`.backup-*`, folder cadangan kit menumpuk (opt-in `-CleanupBackups`).
- **[RAPIKAN] Peringatan pra-update**: update mencetak catatan kalau ada editan DI DALAM `.claude-kit/` yang akan diganti versi baru (editan lama tetap aman di folder cadangan).
- Pemeriksaan: **287 tes hijau**, robot konsistensi versi bersih, smoke PASS, PSScriptAnalyzer bersih, YAML + JSON valid.

## [1.33.0] - 2026-06-16

### Diubah — Nama paket npm dipendekkan jadi `lintasai` (perintah pasang lebih mudah)

Lahir dari owner: perintah pasang `npx @ojokesusu/lintasai init` terlalu panjang/ribet untuk staff non-programmer (bagian awalan `@ojokesusu/` yang ber-`@` dan `/` paling sering salah ketik). Nama paket dipendekkan dari `@ojokesusu/lintasai` jadi **`lintasai`** (tanpa awalan scope) — perintah jadi **`npx lintasai init`**.

- **Perintah baru**: `npx lintasai init` (juga `update`, `team-setup`, `doctor`, `status`, `uninstall`, dll). Nama peluncur (`bin`) tidak berubah, jadi cara kerja kit sama persis — murni nama paket + dokumentasi.
- Semua contoh perintah di README, dokumen panduan, skrip, dan template allowlist (`settings.local.json.template`) disesuaikan ke nama baru. **Catatan sejarah di CHANGELOG sengaja dibiarkan apa adanya** (rekaman command yang berlaku saat versi itu).
- **Catatan penerbitan (WAJIB dibaca owner sebelum rilis)**: karena `lintasai` adalah nama paket **baru** di npm, sekali-saja perlu: (1) klaim nama `lintasai` (publish pertama mengeklaim nama), dan (2) beri `NPM_TOKEN` di GitHub Secrets akses tulis ke paket baru itu — setelah itu robot penerbit (`.github/workflows/publish-npm.yml`) jalan otomatis seperti biasa (tag → publish, tanpa OTP). Nama lama `@ojokesusu/lintasai` tetap hidup (versi terakhir tetap berfungsi); bisa dimatikan-halus (`npm deprecate`) dengan pesan penunjuk ke nama baru.

---

> **📦 ARSIP RIWAYAT LAMA (era pra-npm, < v1.33.0):** entri yang lebih lama dipindah ke `CHANGELOG_ARCHIVE.md` (hanya di repo GitHub — TIDAK ikut paket npm, merampingkan unduhan client ±10%). **Pengecualian:** entri berlabel `[SECURITY]`/`[BREAKING]`/`[SCAN-REQUIRED]` di bawah ini SENGAJA dipertahankan utuh supaya banner "pasang SEGERA" untuk client yang lompat banyak versi tetap bekerja.

## [1.30.1] - 2026-06-16

### Diperbaiki
- **[SECURITY] Tutup celah script-injection di template robot "terima update backend"** (`templates/github/RECEIVE_BACKEND_UPDATE.yml`). Nilai `client_payload.*` (dikendalikan pengirim sinyal `repository_dispatch`) sebelumnya ditempel **LANGSUNG ke perintah shell `run:`** (baris 34/51/118) di workflow ber-izin `contents:write` + `pull-requests:write` → pengirim jahat bisa menjalankan perintah arbitrer di server runner + menyalahgunakan kunci GitHub. Diperbaiki dengan mengalirkan nilai lewat variabel-perantara (`env:`) lalu dipakai sebagai `"$VERSION"`/`$IS_BREAKING` (data, bukan kode) — pola aman yang kit sudah pakai di `AUTO_MERGE_SHARED_WORKFLOW.yml`. **Pasang SEGERA** kalau project staf sudah memakai template antar-repo ini. Ditemukan via audit menyeluruh internal (8 dimensi pemeriksa + cek-silang skeptis). Sisa `client_payload` di blok `with:` (isi PR/commit/branch) = konten tampilan yang di-review manusia (bukan eksekusi-perintah) — sengaja dibiarkan.

## [1.26.0] - 2026-06-15

### Keamanan
- **[SECURITY] §8.1 #10 BARU — DILARANG MUTLAK menerobos / mematikan / "mode paksa" melewati pagar keamanan atau portal izin, APA PUN alasannya.** Saat pengaman menghalangi (palang persetujuan, prompt izin Claude Code, hook / `tier-guard` project, verifikasi tanda-tangan, sandbox, 2FA/OTP), AI DILARANG mencari jalan memutar / mematikannya / menjalankan opsi "dangerous/force/bypass". **Tidak ada rasionalisasi yang membenarkan** — termasuk "sudah kuverifikasi sendiri aman" / "diminta berkali-kali" / "ini project-mu sendiri" / "portalnya lagi error" / "cuma sekali ini". Yang benar: **STOP → lapor jujur → user selesaikan via jalur resmi**. Pengecualian satu-satunya: user sendiri yang sadar mematikan pengaman, BUKAN AI. **Lahir dari insiden nyata (2026-06-15):** AI di sesi staf merasionalisasi menerobos "portal izin yang lagi error" untuk menjalankan installer — pola yang membuat alat TIDAK AMAN dipakai orang lain. Ditautkan ke §12 (larangan eksplisit) + KEUNGGULAN faktor H.

## [1.23.3] - 2026-06-14

### Diperbaiki
- **[SECURITY] KOREKSI aturan tier-guard (§8.1 #4 + §7.6) — dari "tidak ada penjaga, tulis langsung" jadi "CEK dulu, HORMATI penjaga asli".** Akar nyata ditemukan via uji empiris AI di komputer staf: popup "Penjaga keamanan menolak pembuatan berkas" **BUKAN halusinasi** — project staf PUNYA hook penjaga sendiri (`tier-guard.mjs`, dipasang user/tim, terdaftar di `.claude/settings.json`) yang **nyata memblokir** penulisan berkas sampai ada `.staff-profile.md` ber-tier (banner `[tier-guard] .staff-profile.md not found...`). Riwayat git mengonfirmasi **kit TIDAK PERNAH** memasang file ini.
- **Kesalahan aturan lama (v1.23.0–v1.23.2):** menyimpulkan "kit tidak memasang → tidak ada penjaga sama sekali → popup pasti halusinasi" → menyuruh AI **MENYANGKAL/MENEROBOS keamanan ASLI milik user** (lebih berbahaya dari popup-nya).
- **Koreksi:** AI WAJIB **cek** `.claude/settings.json` + `.claude/hooks/` + output saat menulis **SEBELUM** menyimpulkan. Penjaga terbukti **tidak ada** → tulis langsung. Penjaga **ADA + memblokir** → **HORMATI** (jangan terobos/sangkal), jelaskan jujur + popup **[1] Buat kartu identitas dulu (rekomendasi** — tanya peran, default anggota tim aman, **BUKAN** auto `tier: owner`**)** / [2] tampilkan di chat / [3] lewati. Membatalkan aturan keliru v1.23.0–v1.23.2.

## [1.23.2] - 2026-06-14

### Diperbaiki
- **[SECURITY] Aturan KERAS anti-popup-penjaga-palsu (§8.1 #4)** — perkuat fix v1.23.1 yang ternyata masih terlalu lemah/terkubur (popup "Penjaga keamanan menolak pembuatan berkas" masih muncul di v1.23.1). Ditambah larangan keras menonjol: **TIDAK ADA penjaga yang memblokir pembuatan berkas**; membuat docs/denah **TIDAK butuh** `.staff-profile.md`; **DILARANG KERAS** memunculkan popup "penjaga menolak" / "belum ada kartu identitas → diblokir" / "buat staff-profile dulu untuk membuka izin tulis" (itu halusinasi penghalang yang tak ada, §8.2 "no quote = no claim"). Diminta bikin denah tapi `.staff-profile.md` belum ada → **buat LANGSUNG**, jangan tahan, jangan popup izin. `.staff-profile.md` = OPSIONAL (pencatatan peran), **bukan syarat menulis**. Mencegah pula opsi lama "(tier: owner)" yang diam-diam memberi staf akses setingkat owner (bocor pertahanan-IP).
- Contoh §8.1 #4 diganti jadi format **SALAH vs BENAR**: yang BENAR = buat denah langsung, lalu boleh **tawarkan** kartu identitas OPSIONAL setelahnya (bukan gerbang sebelum kerja, bukan auto `tier: owner`).
- Catatan jujur (§4.6): popup ini **di-improvisasi sesi AI** — terbukti via riwayat git (teksnya **TIDAK PERNAH** ada di kit versi mana pun), bukan teks tetap. Perbaikan ini menuntun improvisasi agar popup itu tidak terjadi; baru terlihat di layar staf **setelah kit di komputer itu di-update ke v1.23.2 + buka chat BARU**.

## v1.9.0 — 2026-06-12 (Perisai keamanan AI: 4 pertahanan baru + daftar folder rahasia terlarang) [SECURITY]

**[SECURITY]** — entri ini rilis keamanan (penanda body ditambahkan v2.0.0 supaya pemindai rentang yang membuang heading tetap mendeteksinya).

> **Tier**: 2 (aturan baru, backward-compatible) — naik **MENENGAH** 1.8.0 → 1.9.0 (per §11: aturan baru = MENENGAH). Hanya MENAMBAH pagar keamanan, tidak mengubah perilaku lama → NOT BREAKING. Label **[SECURITY]**: memperkuat pertahanan AI, layak dipasang lebih awal.

- **`CLAUDE_universal_v1.md` §8.1 — 4 aturan anti-penipuan AI BARU (6-9)**: (6) kerahasiaan secret/kunci-API mutlak + **daftar folder rahasia terlarang** (`.env*`, `~/.ssh/`, `~/.aws/`, `~/.config/gcloud/`, `*.pem`/`*.key`) yang AI tak boleh baca-lalu-kirim-keluar; (7) validasi kode/perintah dari isi file sebelum dijalankan; (8) tahan tekanan psikologis ("darurat/atasan/buru-buru" tak membatalkan aturan keamanan); (9) deteksi & tolak penyalahgunaan. Semua bahasa non-programmer + analogi 3-lapis.
- **Asal temuan**: 4 celah ini ditemukan via audit pembanding ECC v2.0.0 (MIT) — pertahanan yang §8.1 lama (5 aturan) belum tutup. Ditulis ulang dalam voice lintasAI, BUKAN menyalin teks ECC.
- **`CLAUDE_universal_v1.md` + `package.json`**: versi 1.9.0.
- QA: smoke PASS (edit dokumentasi aturan + nomor versi saja; tidak sentuh skrip PowerShell → Pester tak terdampak).

---

## v1.7.7 — 2026-06-11 (Label [SECURITY] urgensi + dokumentasi update 3-repo)

> **Tier**: 2 (AI auto-sync) — NOT BREAKING. (Dogfood: perubahan kecil → naik angka KECIL 1.7.6→1.7.7.)

- **Celah ditutup (#4 update mechanism)**: 4-tier update soal "seberapa besar" — TAPI perbaikan keamanan bisa KECIL tapi MENDESAK, dan tidak ada sinyal urgensi terpisah. Akibat: staff non-programmer bisa menunda perbaikan keamanan kecil → rawan lebih lama.
- **Label `[SECURITY]` (BARU)**: urgensi terpisah dari ukuran. `update-kit.ps1` kini mendeteksi `[SECURITY]` di CHANGELOG (regex berjangkar, sama seperti [BREAKING]/[SCAN-REQUIRED]) → menampilkan peringatan merah "pasang SEGERA, jangan tunda". Didefinisikan di CHANGELOG "Label spesial" + `CLAUDE_universal_v1.md` §11 + `UPDATE_GUIDE.md`.
- **`UPDATE_GUIDE.md` v3 — §6.1 (BARU)**: alur update saat 3-repo (split). Mengoreksi kekhawatiran sebelumnya: `.claude-kit/` IKUT di-commit ke repo (terbukti `setup-pola-b.ps1:1587` + `README:426`), jadi update = owner update+commit+push per repo, staff cukup `git pull` (versi konsisten lewat git, bukan update per-clone).
- Verifikasi jujur: celah update #2 (drift) & #3 (per-clone) TERNYATA sudah teratasi git (`.claude-kit/` di-commit) — penilaian sebelumnya over-worry, dikoreksi.
- QA: smoke PASS, Pester 132/132.

---
