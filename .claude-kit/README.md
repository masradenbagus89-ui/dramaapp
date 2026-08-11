# README - Kit Aturan AI Kerja Profesional
> · 2026-07-15 · Windows-only · standar tim IT · 21 file tim panduan
> [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [License: MIT](LICENSE)
> Repo: [github.com/ojokesusu/lintasAI](https://github.com/ojokesusu/lintasAI) (privat — repo standar tim) · paket npm: [lintasai](https://www.npmjs.com/package/lintasai) (publik)

---

## 🌟 Versi stabil sekarang: **v3.0.0** (2026-07-19)

> Ringkasan ini = "pinned message" untuk staff IT non-programmer. Detail lengkap per versi ada di [CHANGELOG.md](CHANGELOG.md).

> ### ⚠️ Status fitur (jujur — baca sebelum pakai)
> - ✅ **INTI — STABIL & teruji**: pasang kit, aturan AI auto-load, dokumentasi, audit, refactor, workflow non-programmer. **Aman dipakai sehari-hari.** (ratusan cek otomatis lulus — jalankan `npm test` untuk jumlah terkini — + dipakai sendiri di repo kit ini.)
> - 🧪 **Split-repo + robot lintas-repo — BETA (sedang diuji)**: pecah monorepo jadi 3 repo + robot otomatis (terbit paket bersama, auto-gabung update, kunci pengaman). **Belum diuji menyeluruh di GitHub sungguhan.** Boleh dicoba di **repo uji**, tapi **jangan** diandalkan untuk produksi tim sampai lulus `.claude-kit/templates/ROBOT_CI_TESTING_PLAYBOOK.md`. Naik "stabil" **setelah robot lulus uji di repo nyata** (panduan `.claude-kit/templates/ROBOT_CI_TESTING_PLAYBOOK.md`) — bukan dipatok di nomor versi tertentu.
> - 🆕 **Kimi Code CLI — BARU (aturan siap, hook opt-in)**: kit kini jalan di **Kimi Code CLI** juga, bukan cuma Claude Code. Aturan lengkap (mutu identik Claude) otomatis lewat `.kimi-code/AGENTS.md`; pagar keamanan Kimi = opt-in (`npx lintasai enable-kimi-hooks`) + **wajib diuji sendiri** saat mulai pakai Kimi. Panduan + uji-mandiri: [KIMI_CODE_SETUP.md](KIMI_CODE_SETUP.md).

### Cara pasang (1 perintah)

Buka **Claude Code chat** di project kamu, paste:

```
npm create lintasai
```

Kit akan otomatis memasang aturan AI tim + menyalin dokumentasi + mengatur izin akses AI (daftar perintah yang boleh dijalankan otomatis). Tunggu ~1 menit.

> 💡 **Kalau AI menanyakan izin** untuk menjalankan `npm create lintasai` (muncul kotak pilihan mirip *"Cara jalan"* — Claude Code memang ekstra hati-hati dengan perintah `npm`; ini **NORMAL**, **bukan** error lintasAI): pilih **"Izinkan di repo ini"**. Dengan begitu AI memasang di project-mu lalu **langsung lanjut memandu** (Fase B). Hindari opsi *"jalankan sendiri di terminal"* kalau ingin AI tetap auto-lanjut memandu.

### Janji inti — yang DIJAMIN vs yang DITAWARKAN

> 🎚️ Sebelum daftar fitur di bawah, ini **inti** kit lintasAI:
> - ✅ **WAJIB & tak bisa dimatikan — 4 pagar keselamatan:** anti-bocor rahasia & keamanan dasar · anti-ngarang (tiap klaim wajib berbukti) · bahasa Indonesia yang dimengerti orang non-teknis · gerbang "belum boleh bilang selesai sebelum terbukti". Ini yang tak bisa dibujuk lewat.
> - 🧰 **Standar profesional ikut otomatis, tanpa kamu mengetik apa pun:** keamanan, database, tampilan & desain (termasuk larangan mengirim tampilan template mentah), kenyamanan-pakai + aksesibilitas WCAG 2.2, pengiriman-ke-server, dan biar-ketemu-di-Google (SEO) — semuanya sudah tertanam di aturan yang dibaca AI tiap sesi, plus perpustakaan rujukan yang dibuka saat topiknya nyambung. 🏢 Seperti perpustakaan teknik kelas dunia di kantormu: selalu tersedia, dan AI yang tahu buku mana yang relevan hari ini. *(Dulu ini berupa "8 divisi wajib dicentang tiap prompt"; ritual itu dicabut 2026-07-19 karena uji buta menunjukkan justru bikin AI berhenti menggali lebih awal — standarnya tetap, cara kerjanya yang diperbaiki.)*
> - 🎛️ **Sisanya = REKOMENDASI yang DITAWARKAN (bukan keharusan):** semua fitur di tabel bawah + standar kode/dokumentasi/proses = AI **menyarankan & menjalankan default**, tapi **kamu yang pilih** — boleh pakai/lewati/matikan per project.
> - 📈 **Kamu tumbuh sendiri:** tiap jawaban AI ditulis **2 versi** dengan label profesi mengikuti topik (👨‍🎓 Junior-Backend / Junior-SEO / … untuk yang sedang belajar + 🙂 bahasa sehari-hari), dan istilah programming dibiarkan **asli lalu dijelaskan** untuk junior + non-programmer — sengaja, supaya kamu naik kelas dari waktu ke waktu (non-programmer → junior-profesi → senior-profesi), bukan selamanya bergantung.

### Apa yang kit kasih (10 highlight versi stabil)

| # | Fitur | Analogi tools digital |
|---|---|---|
| 1 | **AI auto-pakai aturan tiap sesi** — `CLAUDE_universal_v1.md` auto-load | Mirip **WhatsApp template balasan otomatis** — AI ikut aturan tim tanpa kamu reminder tiap kali |
| 2 | **Bahasa Indonesia default** — semua respons AI + dokumentasi | Mirip **Google Translate** yang sudah preset Bahasa Indonesia — staff baru langsung paham |
| 3 | **Bahasa Non-Programmer** — jargon dijelaskan dengan bahasa awam (1 kalimat; analogi singkat opsional) | Mirip **Notion AI Q&A** yang jelasin pakai bahasa sederhana, bukan istilah teknis mentah |
| 4 | **Anti-Halusinasi Protocol** — AI WAJIB verify klaim file/fungsi sebelum diutter | Mirip **fact-check Instagram** sebelum post — cegah AI ngarang yang confident-salah |
| 5 | **Post-Install Auto-Trigger** — AI auto-tampilkan 3 popup (Setup Mode + Bulk-Bootstrap + Skenario) setelah install | Mirip **iPhone setup wizard** baru — auto-pandu kamu langkah demi langkah, tidak stop di tengah |
| 6 | **Role-based Scope** — staff IT non-programmer dibagi 3 level (Architect / Developer / UI Developer) per file path | Mirip **Google Drive permission folder** — tiap orang cuma bisa edit area yang relevan dengan role-nya |
| 7 | **Update Strategy 4-tier** — kit update otomatis classify Tier 1-4 (Silent / AI-auto-sync / BREAKING / SCAN-REQUIRED) + analogi tools | Mirip **iPhone iOS update** kasih info "minor update" vs "major upgrade" + step migration yang jelas |
| 8 | **Audit Post-Setup** — multi-dimensional read-only audit dengan ranked low→high risk + analogi non-programmer | Mirip **Tokopedia Seller Center health check** — laporkan apa yang perlu fix, prioritas mana dulu, risk apa |
| 9 | **Stage 4 (Rapikan ke Standar Tim) Migration** — proyek setengah-jadi ke standar tim (audit + GAP table + migration plan Quick Wins/Bertahap/Strategi Besar) | Mirip **pindahan rumah** — daftar barang yang sudah, belum, dan harus dibuang (bukan rewrite besar-besaran) |
| 10 | **Safety net 3-layer** — backup pre-install, manifest HMAC signed, safe uninstall via diff | Mirip **Google Drive versi history** — kalau salah update, kembali ke versi sebelumnya gampang |

### Untuk staff IT non-programmer (Day 0)

Cukup jalankan `npm create lintasai` di folder project (atau minta AI-mu menjalankannya) — sisanya AI yang memandu. Skip rest of README — itu dev reference.

### Peta Keputusan — "Mau apa → buka/paste file ini"

Bingung mulai dari mana? Cari niatmu di kolom kiri, lalu buka/paste file di kolom kanan ke Claude Code:

| Kamu mau... | Buka / paste file ini |
|---|---|
| 🚀 Pasang kit pertama kali | `npm create lintasai` (atau paste `JALANKAN_KIT.md`) |
| 📄 Bikin / refresh dokumentasi proyek | `PROJECT_LIFECYCLE_PROMPT_v1.md` |
| 🔍 Audit / cek kesehatan proyek | `AUDIT_POST_SETUP_PROMPT_v1.md` |
| ⬆️ Update kit ke versi baru | chat "update kit" (atau paste `UPDATE_KIT_PROMPT_v1.md`) |
| 🧩 Pecah proyek jadi banyak repo (lanjutan) | `SPLIT_REPO_MIGRATION_PROMPT_v1.md` |
| ❓ Bingung istilah teknis | `docs/GLOSSARY_NON_PROGRAMMER.md` |
| 🚨 Ada insiden keamanan | `docs/SECURITY_INCIDENT_PLAYBOOK.md` |

> Tidak hafal? Tidak apa-apa. Chat saja maksudmu pakai bahasa biasa ("mau audit proyek") — AI otomatis arahkan ke file yang tepat.

### Roadmap dekat

- **Penyempurnaan kecil berkelanjutan** — perbaikan perilaku AI + dokumen + tes. Tidak merusak yang sudah jalan; staff cukup minta AI "update kit" (atau jalankan `npx lintasai@latest update`).
- **Dukungan lintas-platform (target ke depan)** — macOS + Linux. Ditandai perubahan-besar karena sekarang khusus Windows.

> Catatan: **v2.0.0** (kit 100% Node, seluruh alat PowerShell dihapus) sudah **RILIS** (2026-07-10) — bukan lagi rencana. Versi stabil sekarang (lihat atas).

---

## Struktur paket
```
claude-ai-rules-kit/
├── README.md                              ← kamu baca ini sekarang
├── CHANGELOG.md                           ← log perubahan per versi
├── CONTRIBUTING.md                        ← panduan usul perubahan aturan
├── LICENSE                                ← MIT (bebas pakai/modif/distribusi)
├── CLAUDE_universal_v1.md                 ← aturan utama (auto-load tiap sesi)
├── LINTASAI_WORKFLOWS_v1.md               ← PENGALIH tipis (v2.4.0: isi pindah ke rules/)
├── rules/                             ← rak rujukan on-demand pecah-per-seksi (1 seksi = 1 berkas; INDEX.md = daftar isi)
├── PROJECT_LIFECYCLE_PROMPT_v1.md         ← prompt 4-stage (Kickoff / Bootstrap / Update Docs / Migration) - AI auto-route
├── UPDATE_KIT_PROMPT_v1.md                ← prompt update kit ke versi baru (AI auto-classify tier)
├── AUDIT_POST_SETUP_PROMPT_v1.md          ← prompt audit komprehensif setelah setup awal
├── SPLIT_REPO_MIGRATION_PROMPT_v1.md      ← prompt pecah-repo (jumlah ikut kebutuhan; lihat POLA_REPO_AMAN)
├── AGENTS.md.template                     ← template AGENTS.md untuk root proyek (Pola B)
├── JALANKAN_KIT.md                        ← prompt SINGLE-PASTE Pola B (aktivasi SENYAP: 0 popup wajib + Laporan Penutup + kapabilitas on-demand)
├── bin/lintasai.js                        ← ENTRY-POINT RESMI: dispatcher Node (`npm create lintasai` / `npx lintasai`)
├── lib/                                   ← helper engine (Node `*.mjs`)
├── setup-pola-b.mjs                       ← auto-setup Pola B (5 skeleton docs + auto-copy 21 file tim) (Node)
├── update-kit.mjs                         ← auto-update kit (re-clone + backup + setup, rollback-safe) (Node)
├── uninstall.mjs                          ← safe uninstall via manifest sha256 diff (Node)
├── kit.mjs                                ← router perintah kit (doctor/scan/version/help) (Node)
└── templates/
    ├── architecture.md                    ← template peta proyek
    ├── glossary.md                        ← template kamus istilah domain
    ├── _PATTERNS.md                       ← aturan dokumentasi tim profesional generic
    ├── _EXAMPLE.md                        ← contoh format .md pendamping siap-copy
    ├── STACK_GUIDE.md                     ← Next.js + Vercel + SEO + security + Feature Flag
    ├── GLOSSARY_NON_PROGRAMMER.md         ← kamus istilah AI/coding untuk non-programmer (WAJIB baca dulu)
    ├── SECURITY_INCIDENT_PLAYBOOK.md      ← playbook respon insiden keamanan (~5 menit baca)
    ├── RLS_SETUP_PROMPT.md                ← prompt setup Row Level Security Supabase
    ├── DB_SCHEMA_SCAN_PROMPT.md           ← prompt audit schema DB
    ├── feature-flags-advanced.md         ← panduan feature flag advanced (POST-LAUNCH ref)
    ├── STACK_MIGRATION_GUIDE.md          ← panduan migrasi Vercel -> Railway/Render (ADVANCED)
    ├── decisions/                         ← ADR (Architecture Decision Record) folder
    │   ├── _TEMPLATE.md                   ← template ADR ringkas
    │   └── README.md                      ← panduan kapan tulis ADR
    └── github/                            ← template GitHub Actions (di-copy ke proyek .github/)
        ├── workflows/backup-schemas.yml   ← auto-backup schema DB ke artifact
        └── workflows/secret-guard.yml     ← penjaga rahasia (blok commit .env/kunci)
```

## Halo!
Hai, bro/sis! Paket ini isinya **aturan kerja AI** yang aku pakai sehari-hari biar Claude Code (AI coding assistant-nya Anthropic) gak ngasal - outputnya rapi, ada dokumentasi, dan junior-friendly. Aku bagikan ke kamu supaya kamu gak perlu nyusun aturan dari nol. Sekali install, semua proyek kamu di komputer ini langsung "patuh" tanpa kamu copy-paste aturan tiap sesi. Estimasi setup: **5 menit**.

> Kit ini dipakai sebagai **standar tim IT** kita. Semua anggota tim pakai versi yang sama biar konsisten antar-proyek. Detail soal versi & update di section **Standar tim** di bawah.

> *Claude Code* = CLI (Command Line Interface) resmi Anthropic buat ngobrol sama AI Claude langsung dari terminal. Mirip ChatGPT tapi bisa baca/tulis file di komputer kamu.

## Apa isi paket ini?
"Kit" = ikut terpasang ke `.claude-kit/` di project saat `npm create lintasai`. "Meta" = file pengantar repo (tidak dibaca AI tiap sesi).

| File | Fungsi singkat | Kategori |
|---|---|:-:|
| `CLAUDE_universal_v1.md` | Aturan utama - AI baca otomatis tiap sesi (bahasa ID, anti-bug, wajib docs) | Kit |
| `PROJECT_LIFECYCLE_PROMPT_v1.md` | Prompt **4-stage lifecycle** (Stage 1 (Proyek Baru): Kickoff proyek baru / Stage 2 (Bikin Catatan Proyek): Bootstrap docs proyek lama / Stage 3 (Perbarui Catatan): Update Docs refresh `.md` / Stage 4 (Rapikan ke Standar Tim): Migration proyek setengah jadi) - AI auto-route ke stage yang tepat | Kit |
| `UPDATE_KIT_PROMPT_v1.md` | Prompt **update kit ke versi baru** - AI auto-classify tier perubahan & action items | Kit |
| `AUDIT_POST_SETUP_PROMPT_v1.md` | Prompt **audit komprehensif setelah setup awal** - verifikasi kit, gap, & rekomendasi | Kit |
| `SPLIT_REPO_MIGRATION_PROMPT_v1.md` | Prompt **migrate ke split-repo** (per-Lapisan 2-3 repo: frontend + backend, shared opsional — atau microservice per-kapabilitas; jumlah ikut wilayah rahasia, sumber `docs/plans/POLA_REPO_AMAN.md`) | Kit |
| `templates/architecture.md` | Template peta isi folder `docs/` proyek | Kit |
| `templates/glossary.md` | Template kamus istilah proyek | Kit |
| `templates/_PATTERNS.md` | **Standar dokumentasi tim profesional** (kapan wajib ada `.md`, format, anti-pattern) | Kit |
| `templates/_EXAMPLE.md` | Contoh konkret 1 file `.md` pendamping siap-copy (reference format) | Kit |
| `AGENTS.md.template` | Template `AGENTS.md` untuk dicopy ke root proyek (Pola B) | Kit |
| `JALANKAN_KIT.md` | Prompt **SINGLE-PASTE** Pola B - AI tanya cara pasang (LENGKAP/CEPAT/PILIH-SENDIRI) + audit + ukuran tim & bentuk kode + setup + 4 aturan + 21 file tim profesional + verifikasi | Kit |
| `setup-pola-b.mjs` | Script auto-setup Pola B di root proyek (copy AGENTS.md + 5 skeleton docs/) | Kit |
| `README.md` | File ini - baca dulu | Meta |
| `CHANGELOG.md` | Log perubahan per versi | Meta |
| `CONTRIBUTING.md` | Panduan anggota tim untuk usul perubahan aturan | Meta |
| `LICENSE` | MIT - bebas pakai/modif/distribusi | Meta |
| `.gitignore` | Untuk repo standar tim (kalau kit ini di-track di Git) | Meta |

> Catatan path: kit ini Windows-only. `~/.claude/` di PowerShell sama dengan `%USERPROFILE%\.claude\` (mis. `C:\Users\<NamaKamu>\.claude\`). Backslash `\` dan slash `/` dua-duanya jalan di PowerShell modern.

## Persiapan (sekali saja)
1. Install **Claude Code** dulu kalau belum: https://claude.com/claude-code
2. Login ke akun Anthropic kamu (ikutin instruksi installer).
3. Cek dia jalan: buka terminal, ketik `claude --version`. Kalau keluar nomor versi, aman.

## Cara Install (Recommended untuk Staff)

> 🧭 **Tidak perlu bingung pilih cara.** Untuk semua orang cukup **1 perintah: `npm create lintasai`** (di bawah).
>
> | Kondisi kamu | Pakai ini |
> |---|---|
> | Staff biasa / paling umum | **`npm create lintasai`** |
> | Owner / butuh perintah lanjutan (update, doctor, rollback) | `npx lintasai <perintah>` |
>
> Keduanya berujung ke pemasang yang **sama**.

### Cara pasang: lewat Claude Code chat (1 perintah, paling cepat — disarankan)

Buka **Claude Code chat** di folder project kamu, lalu ketik/paste:

```
npm create lintasai
```

Biarkan **AI yang menjalankan** perintah ini (lewat chat). Pemasang versi Node berjalan **otomatis penuh** (tanpa popup jendela Windows) — kamu **langsung** masuk ke popup pemandu di dalam chat. Kit auto-deploy + setup project. Total ~1 menit.

> Mau jalankan sendiri di terminal? Boleh — buka PowerShell di folder project lalu jalankan `npm create lintasai`. Sejak pemasang versi Node, pemasangan **otomatis penuh** (tanpa popup jendela Windows) baik lewat chat maupun terminal; pilihan (AGENTS.md, email, buka VS Code) diatur lewat AI di chat sesudah pemasangan.

Untuk update, cukup minta AI di chat: **"tolong update kit"** (AI yang jalankan). Atau manual dari dalam project:
```bash
npx lintasai@latest update
```

## Pakai sehari-hari - 1 prompt, 4 stage

Sejak v1.5+, **3 skenario lama (KICKOFF / BOOTSTRAP / MIGRATION) + UPDATE_DOCS** sudah digabung jadi **1 prompt single-entry**: `PROJECT_LIFECYCLE_PROMPT_v1.md`. Kamu cukup paste prompt yang sama di semua skenario - AI **auto-route ke Stage 1/2/3/4** berdasarkan kondisi proyek.

### Cara pakai (semua skenario)
```powershell
cd C:\path\ke\proyek    # atau mkdir proyek-baru; cd proyek-baru; git init
claude
```
Di sesi Claude, **paste isi `.\.claude-kit\PROJECT_LIFECYCLE_PROMPT_v1.md`**. AI akan auto-detect kondisi & route:

- **Stage 1 (Proyek Baru) - Kickoff** → proyek BARU dari nol (folder kosong / cuma `.git`). AI nanyain stack, bikin struktur folder, setup `docs/` otomatis.
- **Stage 2 (Bikin Catatan Proyek) - Bootstrap Docs** → proyek LAMA punya code tapi belum punya `.md` pendamping. AI baca code lalu auto-fill semua `.md` di `docs/`.
- **Stage 3 (Perbarui Catatan) - Update Docs** → docs sudah ada tapi backlog tertinggal jauh dari code. AI bulk-refresh `.md` pendamping yang outdated.
- **Stage 4 (Rapikan ke Standar Tim) - Migration** → proyek SETENGAH JADI (sudah jalan + mungkin punya konvensi sendiri). AI audit read-only → tampilkan tabel gap (Quick Wins/Bertahap/Strategi Besar) → bikin `docs/MIGRATION_TO_STANDARD.md` → eksekusi Quick Wins dengan konfirmasi per langkah.

Filosofi tetap sama untuk semua stage: **bentrok OK**, perbaikan bertahap (boy scout rule), no paksa rewrite besar. Sesi berikutnya: paste prompt yang sama → AI baca state file → lanjut dari item pending.

### Sesi biasa di proyek yang udah jalan
Tinggal `claude` aja di folder proyek - aturan kit (`AGENTS.md` + `.claude-kit/`) ke-load otomatis, gak perlu paste apa-apa.

---

## Standar tim (kalau dipakai >1 orang)
Kit ini dirancang jadi **standar tim IT 3-10 orang**. Filosofi: hemat energi, konsisten lintas-proyek, perbaikan bertahap. Beberapa hal yang penting saat dipakai tim:

- **Semua anggota pakai versi yang sama** - taruh kit di Git repo private internal dengan tag versi (`v1`, `v1.1`, dst). Bukan Google Drive bebas yang versinya nyasar.
- **1 owner standar** (mis. pemimpin tim) yang approve perubahan aturan + rilis versi baru. Anggota lain usul via issue/PR di repo standar.
- **Channel diskusi tunggal** (`#it-standard` di Slack/Discord/WA) untuk usulan, announce update, troubleshooting.
- **Update otomatis backup** - saat owner rilis versi baru, anggota cukup minta AI di chat: *"tolong update kit"* (atau `npx lintasai@latest update`). Mesin update mencadangkan kit lama ber-timestamp, gak rusak setting existing.
- **Exception per-proyek dicatat** - kalau proyek X opt-out aturan Y, catat di `exceptions.md` di repo standar dengan sunset date. Review tiap bulan.
- **Adopsi per-proyek pakai `PROJECT_LIFECYCLE_PROMPT_v1.md`** - 1 prompt, AI auto-route ke Stage 1 (Proyek Baru / Kickoff) / 2 (Bikin Catatan Proyek / Bootstrap Docs) / 3 (Perbarui Catatan / Update Docs) / 4 (Rapikan ke Standar Tim / Migration) sesuai kondisi proyek.

## Hapus kit dari proyek (uninstall yang aman)

Mau hapus lintasAI dari proyek? **JANGAN delete folder `docs/` atau `.github/` mentah-mentah** - folder itu kemungkinan campur antara file kit dan file proyek kamu sendiri. Pakai perintah uninstall bawaan (`npx lintasai uninstall`) yang tahu mana file kit vs mana file proyek.

**Alur disarankan untuk user baru (3 langkah):**

**Langkah 1 - Preview dulu (WAJIB, supaya tahu apa yang akan dihapus):**
```powershell
npx lintasai uninstall
```
Script tampilkan: daftar file PRISTINE (akan dihapus), MODIFIED (akan DILEWATI), SYMLINK/BLOCKED/LOCKED (SKIP dengan alasan), dan ringkasan total. Tidak ada satu pun file yang dihapus di langkah ini.

**Langkah 2 - Hapus beneran (konservatif, RECOMMENDED):**
```bash
npx lintasai uninstall --yes
```
`--yes` = konfirmasi hapus (tanpa itu, perintah cuma menampilkan rencana lalu berhenti aman). Perintah hapus cuma file PRISTINE. File yang sudah kamu edit TETAP ada.

**Langkah 3 - Hapus folder `.claude-kit\` sendiri (manual):**
Script tidak bisa hapus folder yang sedang dia jalankan dari sana. Setelah langkah 2 selesai, **TUTUP semua VSCode / editor yang membuka file di `.claude-kit\`**, lalu jalankan di PowerShell baru:
```powershell
Remove-Item -Recurse -Force .\.claude-kit
```

**Opsi tambahan (advanced):**
```bash
# Hapus juga file kit yang sudah kamu edit (backup .bak dulu, jadi rollback-able):
npx lintasai uninstall --yes --allow-modified

# Hapus juga AGENTS.md (default skip karena heavy customization):
npx lintasai uninstall --yes --delete-agents

# Suppress instruksi self-delete .claude-kit\ (kalau memang mau retain folder kit):
npx lintasai uninstall --yes --keep-kit

# Folder proyek di-rename setelah install (manifest project_root tidak match):
npx lintasai uninstall --yes --allow-project-root-mismatch
```
> Catatan: tanpa `--yes`, perintah cuma menampilkan rencana lalu berhenti aman (SIMULASI — jalan pura-pura, tidak menghapus apa pun). `--force` versi lama = alias usang untuk `--allow-modified`.

**Setelah selesai, kamu akan dapat konfirmasi:**
- File proyek asli di `docs/`, `src/`, `package.json`, dll. AMAN tidak disentuh.
- File kit yang kamu edit (tanpa `-Force`) masih ada di tempatnya.
- Verifikasi: jalankan `git status` - file proyek tidak boleh muncul sebagai deleted.

**Cara kerja:** pemasang (`setup-pola-b.mjs`) tulis `.claude-kit/.install-manifest.json` yang berisi sha256 hash setiap file yang kit copy. Uninstall classify tiap file:

- **PRISTINE** (hash match) → auto-delete, file persis sama dengan kit.
- **MODIFIED** (hash beda) → kamu sudah edit; default SKIP. `-Force` → backup ke `.pre-uninstall-<timestamp>.bak` lalu hapus.
- **SYMLINK** (junction / symbolic link) → SKIP selalu (cegah leak isi file di luar project ke .bak).
- **BLOCKED** (path escape ke luar project root) → REJECT (proteksi path traversal kalau manifest di-tamper).
- **LOCKED** (hash gagal - file di-buka editor / AV) → SKIP, tutup editor + re-run.
- **MISSING** (file sudah tidak ada) → skip silent.
- **BACKUP** (file `.backup-*` dari setup -Force) → preserved, hapus manual kalau mau.

**Hard-fail** kalau `project_root` di manifest tidak match lokasi sekarang (cegah manifest project lain delete file di sini). Override via `-AllowProjectRootMismatch` untuk kasus folder di-rename.

**AGENTS.md default tidak dihapus** (heavy customization expected). Pakai `-DeleteAgents` kalau memang mau hapus.

**Direktori (`docs/`, `.github/`, dll.) cuma dihapus kalau EMPTY** setelah file kit dibersihkan. Project file kamu di sana TETAP aman. Junction/symlink dir terdeteksi → tidak diikuti.

**⚠ Catatan TOCTOU (waktu-cek vs waktu-pakai):** plan dry-run (SIMULASI - jalan pura-pura, tidak menghapus apa pun) adalah snapshot - kalau kamu edit file antara SIMULASI dan eksekusi nyata, script re-hash sebelum delete dan SKIP file yang berubah. Aman.

**⚠ Catatan re-create:** kalau kamu pernah `git checkout -- <file>` revert file kit ke versi original, hash akan match lagi → file ke-auto-delete sebagai PRISTINE. Selalu jalankan `-DryRun` dulu sebelum `-Yes` untuk automation.

#### Kalau manifest TIDAK ADA (kit lama / corrupt)

Untuk install pakai versi < v1.0.0 (sebelum manifest support) atau manifest hilang, perintah `npx lintasai uninstall` keluar dengan instruksi fallback manual. Daftar file yang kit deploy di Pola B:

- `AGENTS.md` (root proyek) - heavy customized, **JANGAN hapus tanpa baca dulu**
- `docs/architecture.md`, `docs/glossary.md`, `docs/_PATTERNS.md`, `docs/_EXAMPLE.md`
- `docs/STACK_GUIDE.md`, `docs/STACK_MIGRATION_GUIDE.md`
- `docs/RLS_SETUP_PROMPT.md`, `docs/DB_SCHEMA_SCAN_PROMPT.md`, `docs/GLOSSARY_NON_PROGRAMMER.md`, `docs/SECURITY_INCIDENT_PLAYBOOK.md`, `docs/feature-flags-advanced.md`
- `docs/decisions/_TEMPLATE.md`, `docs/decisions/README.md`
- `.github/workflows/backup-schemas.yml`, `.github/workflows/secret-guard.yml`
- `.claude-kit/` folder itu sendiri

Review tiap file sebelum hapus - `docs/` dan `.github/` kemungkinan campur dengan file proyek kamu sendiri.

## Troubleshooting setup

> Pemasang kit versi Node (`node .\.claude-kit\setup-pola-b.mjs`) **tidak perlu** `Set-ExecutionPolicy` — itu hanya relevan untuk skrip `.ps1` era lama yang sudah dihapus.

**`claude` command not found**
Install Claude Code dulu: https://claude.com/claude-code. Verifikasi: `claude --version`.

**AI tidak baca AGENTS.md / `.claude-kit/`**
Pastikan kamu jalankan Claude Code dari **root proyek** (folder tempat `AGENTS.md` berada), bukan dari subfolder. Tanya AI: *"Kamu baca file aturan dari path apa?"* - kalau jawab `~/.claude/CLAUDE.md`, bukan `./AGENTS.md`, kemungkinan kamu jalanin dari folder salah.

## FAQ singkat

**Q: Aku udah punya `CLAUDE.md` global, gimana?**
A: Biarkan saja — kit ini terpasang **per-project** (`.claude-kit/` + `AGENTS.md`), tidak menyentuh file globalmu. Saat bentrok, aturan project (`AGENTS.md`) yang menang.

**Q: AI-nya bandel, gak ikut aturan?**
A: Tegur langsung: *"kamu ngelanggar aturan poin X di CLAUDE.md, ulangi"*. Biasanya nurut. Kalau sering, cek dia baca file yang bener: tanya *"path CLAUDE.md yang kamu baca apa?"*

**Q: Mau update aturan ke versi baru?**
A: Minta AI di chat: *"tolong update kit"* (atau `npx lintasai@latest update`) - backup otomatis, file baru ke-pasang. Versi tertulis di header tiap file.

**Q: Boleh aku modif aturannya?**
A: Boleh banget! Itu file kamu sendiri. Saran: naikkan versi & tanggal di header tiap kali nge-edit, biar gampang lacak.

**Q: Komputer kerja kantor, gimana?**
A: Aturan kit disimpan di folder project (`.claude-kit/` + `AGENTS.md`), gak ganggu setting user lain / proyek lain. Aman.

**Q: Mau nambah aturan khusus proyek?**
A: Tulis di `AGENTS.md` root proyek - isinya **ditambahkan** ke aturan kit (bukan menimpa total). Cocok buat catatan khusus stack/konvensi proyek itu.

**Q: Memory & plans Claude Code disimpan di mana? Kenapa gak di `.claude-kit/`?**
A: Disimpan di `%USERPROFILE%\.claude\projects\<hash>\memory\` & `%USERPROFILE%\.claude\plans\` - **by-design Anthropic Claude Code**, bukan kit ini. Sengaja TIDAK di `.claude-kit/` karena:
- **Privacy** - memory berisi info pribadi (preferensi user, snapshot keamanan, kredensial dev). Kalau ter-commit = bocor sekali push.
- **Per-user** - memory kamu beda dari memory teman tim. Tidak share-able dalam 1 repo.
- **Auto-load** - Claude Code engine hardcode baca path tersebut. Pindah lokasi = auto-load mati.

Jadi 4 lokasi persistence Claude Code adalah:

| Lokasi | Ter-commit? | Peran |
|---|:-:|---|
| `.claude-kit/` + `AGENTS.md` (di repo) | ✅ YA | Aturan tim - shared ke semua |
| `docs/` (di repo) | ✅ YA | Dokumentasi teknis proyek |
| `%USERPROFILE%\.claude\projects\<hash>\memory\` | ❌ TIDAK | Catatan AI private (per-user) |
| `%USERPROFILE%\.claude\plans\` | ❌ TIDAK | Draft plan AI sementara (per-user) |

**Saran:** generate file `docs/CLAUDE_PERSISTENCE_MAP.md` di proyek kamu - peta singkat lokasi persistence di atas (4 lokasi) + catatan mana yang ter-commit / tidak. Tim baru tinggal baca peta itu, gak perlu nanya lagi. AI bisa bantu generate sekali kalau kamu minta.

## Quality & Audit

lintasAI menjalani audit komprehensif untuk memastikan stabilitas distribusi:
- **2026-06-06**: 132-agent multi-lens scan, 59 confirmed findings, semua critical di-fix di v1.2.0-v1.2.2
- Riwayat audit lengkap (findings + verdict timeline + items deferred) ada di riwayat git repo GitHub. Advisori keamanan AKTIF ada di [SECURITY.md](SECURITY.md).

---

## Penutup
Kalau masih bingung, buka Claude Code **di folder proyek setelah install kelar**, lalu chat: "Halo, aku staff baru. Tolong cek install kit + briefing aturan dasar." AI akan auto-detect kondisi dan apply Guided Step-by-Step Workflow (lihat `CLAUDE_universal_v1.md` section 4.3). Selamat ngoding bareng AI yang patuh!
