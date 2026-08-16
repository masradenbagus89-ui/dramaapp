# README - Kit Aturan AI Kerja Profesional
> · 2026-08-11 · Windows-only · kit aturan AI untuk staff non-programmer · panduan on-demand di `templates/` + `skills/`
> [Changelog](CHANGELOG.md) · [License: MIT](LICENSE)
> Repo: [github.com/ojokesusu/lintasAI](https://github.com/ojokesusu/lintasAI) (privat — repo standar tim) · paket npm: [lintasai](https://www.npmjs.com/package/lintasai) (publik)

---

## 🌟 Versi stabil sekarang: **v8.0.0** (2026-08-11)

> Ringkasan ini = "pinned message" untuk staff IT non-programmer. Detail lengkap per versi ada di [CHANGELOG.md](CHANGELOG.md).

> ### ⚠️ Status fitur (jujur — baca sebelum pakai)
> - ✅ **INTI — STABIL & teruji**: pasang kit, aturan AI auto-load, dokumentasi, audit, refactor, workflow non-programmer. **Aman dipakai sehari-hari.** (ratusan cek otomatis lulus di repo kit + dipakai sendiri di repo kit ini.)
> - 🆕 **Kimi Code CLI — BARU (aturan siap)**: kit kini jalan di **Kimi Code CLI** juga, bukan cuma Claude Code. Aturan lengkap (mutu identik Claude) otomatis — Kimi membaca `AGENTS.md` akar project secara native, tanpa setup tambahan. Batas jujur: palang pengaman berbasis hook (Palang Rem/Palang Rak) hanya jalan di Claude Code — di Kimi andalkan aturan + tinjauan manusia, **wajib diuji sendiri** saat mulai pakai Kimi.
> - 🧭 **Matriks degradasi per alat AI (jujur, 2026-08-09)** — apa yang benar-benar sampai di mana:
>
>   | Kemampuan | Claude Code | Kimi Code | Codex | Cursor |
>   |---|---|---|---|---|
>   | Aturan kernel `AGENTS.md` | ✅ via `CLAUDE.md` @import | ✅ native | ✅ native | ✅ salinan generated `.cursor/rules/lintasai.mdc` |
>   | Petunjuk Rak per-giliran (hook menyodorkan rak sesuai topik prompt) | ✅ | ❌ | ❌ | ❌ → digantikan **tabel routing statis** (peta topik→rak selalu tampak di berkas aturan, ≤4.000 char) |
>   | Palang keras (Palang Rem · Palang Rak tanda-terima · plan-mode-gate) | ✅ | ⏳ belum dipasang — aturan + tinjauan manusia | ⏳ belum dipasang — aturan + tinjauan manusia | ⏳ belum dipasang — aturan + tabel routing + tinjauan manusia |
>   | Override khusus project (`AGENTS.local.md`) | ✅ via @import | ⚠️ belum diuji — kernel menyuruh AI membacanya | ⚠️ tak dimuat otomatis — kernel menyuruh AI membacanya | ✅ disisipkan ke `.mdc` sesudah kernel |
>
>   Prinsipnya: makin sedikit palang yang terpasang, degradasinya ke "peta selalu terlihat" — bukan ke nol.
>
>   **Koreksi jujur 2026-08-09:** baris palang keras dulu ditulis `❌` dengan alasan "alat itu tidak punya sistem hook". Itu **sudah tidak benar** — Cursor punya `.cursor/hooks.json` (sejak v1.7) dan Codex punya sistem hook sendiri. Yang benar: lintasAI **belum** memasang palangnya di sana. Perbedaannya penting: `❌` terdengar seperti batas alat yang tak bisa diapa-apakan, `⏳` menyatakan apa adanya bahwa ini pekerjaan yang belum selesai. Statusnya bisa dicek kapan saja dengan `npx lintasai doctor`.
>
>   **Koreksi jujur 2026-08-11:** baris `AGENTS.local.md` untuk **Kimi** dulu ditulis `✅ native`. Itu klaim yang tak pernah kami buktikan. Yang benar-benar terverifikasi cuma bahwa Kimi membaca **`AGENTS.md`** akar secara native — dan `AGENTS.local.md` bukan nama berkas yang dicari alat mana pun secara bawaan. Jadi statusnya diturunkan jadi `⚠️ belum diuji`. Isinya tetap sampai lewat jalur yang sama seperti di Codex: kernel membawa satu baris yang menyuruh AI membaca `AGENTS.local.md`.
>
>   **✅ Codex — kernel tertutup: SUDAH DIPERBAIKI di v8.0.0.** Dulu berkas override bernama `AGENTS.override.md`. Dokumentasi resmi Codex menyatakan ia memeriksa nama itu **lebih dulu** dan memuat **paling banyak satu berkas per-folder** — jadi client Codex memuat berkas override lalu **melewati kernel** (nol §1 Bahasa, nol §2 Anti-halusinasi, nol §5 Jangan-merusak), tanpa pesan error. v8.0.0 mengganti namanya jadi **`AGENTS.local.md`**, yang tidak diklaim Codex, sehingga kernel kembali termuat.
>
>   **Kalau kamu client v7 ke bawah:** `npx lintasai update` memindahkan isinya otomatis (disalin utuh, berkas lama dicadangkan bertimestamp lalu dibuang). Buktikan sendiri sesudahnya: `codex --print-instructions` — judul kernel harus muncul. `npx lintasai doctor` memperingatkan kalau berkas nama-lama masih tertinggal.
>
>   **Pertukarannya, apa adanya:** Codex kini tidak lagi memuat berkas override secara otomatis. Kernel (pagar keselamatan) menang atas override (preferensi) — dan kernel membawa satu baris yang menyuruh AI membaca `AGENTS.local.md`, jadi isinya tetap sampai.

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
> - 🧰 **Standar profesional ikut otomatis, tanpa kamu mengetik apa pun:** keamanan, database, tampilan & desain (termasuk larangan mengirim tampilan template mentah), kenyamanan-pakai + aksesibilitas WCAG 2.2, pengiriman-ke-server, dan biar-ketemu-di-Google (SEO) — semuanya sudah tertanam di aturan yang dibaca AI tiap sesi, plus perpustakaan rujukan yang dibuka saat topiknya nyambung.
> - 🎛️ **Sisanya = REKOMENDASI yang DITAWARKAN (bukan keharusan):** semua fitur di tabel bawah + standar kode/dokumentasi/proses = AI **menyarankan & menjalankan default**, tapi **kamu yang pilih** — boleh pakai/lewati/matikan per project.
> - 📈 **Kamu tumbuh sendiri:** tiap info dijelaskan **3 hal** — apa maksudnya (bahasa awam), kenapa, dan langkah berikutnya — dengan istilah programming dibiarkan **asli lalu dijelaskan**, bukan diterjemahkan. Blok **2 versi** berlabel profesi (👨‍🎓 Junior-Backend / Junior-SEO … + 🙂 bahasa sehari-hari) muncul saat AI menyusun **rencana** dan saat ada **tinjauan lintas-divisi** — isinya dari divisi yang berkasnya benar-benar tersentuh, bukan ritual tiap jawaban. Gaya jawaban utamanya tetap natural seperti bawaan AI-nya. Sengaja begini supaya kamu naik kelas dari waktu ke waktu (non-programmer → junior-profesi → senior-profesi), bukan selamanya bergantung.

### Apa yang kit kasih (6 highlight versi stabil)

| # | Fitur |
|---|---|
| 1 | **AI auto-pakai aturan tiap sesi** — kernel `AGENTS.md` dibaca native semua alat AI |
| 2 | **Bahasa Indonesia default** — semua respons AI + dokumentasi |
| 3 | **Bahasa Non-Programmer** — jargon dijelaskan dengan bahasa awam (1 kalimat, polos & langsung) |
| 4 | **Anti-Halusinasi Protocol** — AI WAJIB verify klaim file/fungsi sebelum diucapkan |
| 5 | **Update Strategy 4-tier** — kit update otomatis classify Tier 1-4 (Silent / AI-auto-sync / BREAKING / SCAN-REQUIRED) |
| 6 | **Safety net 3-layer** — backup pre-install, manifest HMAC signed, safe uninstall via diff |

### Untuk staff IT non-programmer (Day 0)

Cukup jalankan `npm create lintasai` di folder project (atau minta AI-mu menjalankannya) — sisanya AI yang memandu. Skip rest of README — itu dev reference.

### Peta Keputusan — "Mau apa → buka/paste file ini"

Bingung mulai dari mana? Cari niatmu di kolom kiri, lalu buka/paste file di kolom kanan ke Claude Code:

| Kamu mau... | Buka / paste file ini |
|---|---|
| 🚀 Pasang kit pertama kali | `npm create lintasai` |
| ⬆️ Update kit ke versi baru | `npx lintasai update` (atau chat "update kit") |
| 🚨 Ada insiden keamanan | `.lintasai/templates/SECURITY_INCIDENT_PLAYBOOK.md` |

> Tidak hafal? Tidak apa-apa. Chat saja maksudmu pakai bahasa biasa ("mau rapikan kode") — AI otomatis arahkan ke file yang tepat.

### Roadmap dekat

- **Penyempurnaan kecil berkelanjutan** — perbaikan perilaku AI + dokumen + tes. Tidak merusak yang sudah jalan; staff cukup minta AI "update kit" (atau jalankan `npx lintasai@latest update`).
- **Dukungan lintas-platform (target ke depan)** — macOS + Linux. Ditandai perubahan-besar karena sekarang khusus Windows.

> Catatan: **v2.0.0** (kit 100% Node, seluruh alat PowerShell dihapus) sudah **RILIS** (2026-07-10) — bukan lagi rencana. Versi stabil sekarang (lihat atas).

---

## Struktur paket
```
.lintasai/
├── README.md                              ← kamu baca ini sekarang
├── PETA.md                                ← peta "apa di mana" (fungsi tiap folder + daftar rak) — AI baca ini PERTAMA
├── CHANGELOG.md                           ← log perubahan per versi
├── UPGRADING.md                           ← panduan pindah versi BESAR (hanya diisi saat ada [BREAKING])
├── LICENSE                                ← MIT (bebas pakai/modif/distribusi)
├── AGENTS.md                              ← KERNEL aturan (acuan tunggal; dibaca native semua alat AI — ADR-032)
├── skills/                                ← rak panduan on-demand per-bidang (`<nama>/SKILL.md`; registry.json = indeks)
├── AGENTS.local.md.template               ← template override khusus proyek untuk root (jadi `AGENTS.local.md`, milikmu)
├── CLAUDE.md.template                     ← template pemuat Claude Code untuk root (jadi `CLAUDE.md`, isinya cuma @import)
├── bin/lintasai.js                        ← ENTRY-POINT RESMI: dispatcher Node (`npm create lintasai` / `npx lintasai`)
├── engine/                                ← helper engine + robot (Node `*.mjs`/`*.js`)
├── setup-pola-b.mjs                       ← auto-setup Pola B (pasang kernel + pemuat + hook + robot keamanan CI) (Node)
├── update-kit.mjs                         ← auto-update kit (ambil paket npm + cadangkan + pasang ulang, rollback-safe) (Node)
├── uninstall.mjs                          ← safe uninstall via manifest sha256 diff (Node)
├── kit.mjs                                ← router perintah kit (doctor/status/version/update/uninstall/rollback) (Node)
└── templates/                             ← panduan on-demand: TINGGAL DI SINI, dirujuk skill lewat path `templates/...`
    ├── STACK_GUIDE.md · SAFE_DATABASE_OPERATIONS.md · PRODUCTION_OBSERVABILITY.md ·
    │   SECURITY_INCIDENT_PLAYBOOK.md · dll. (lihat isi folder untuk daftar lengkap)
    └── github/                            ← template GitHub Actions (di-copy ke proyek .github/)
        └── workflows/secret-guard.yml     ← penjaga rahasia (blok commit .env/kunci)
```

## Halo!
Hai, bro/sis! Paket ini isinya **aturan kerja AI** yang aku pakai sehari-hari biar Claude Code (AI coding assistant-nya Anthropic) gak ngasal - outputnya rapi, ada dokumentasi, dan junior-friendly. Aku bagikan ke kamu supaya kamu gak perlu nyusun aturan dari nol. Sekali install, semua proyek kamu di komputer ini langsung "patuh" tanpa kamu copy-paste aturan tiap sesi. Estimasi setup: **5 menit**.

> Kit ini dipakai sebagai **standar tim IT** kita. Semua anggota tim pakai versi yang sama biar konsisten antar-proyek. Detail soal versi & update di section **Standar tim** di bawah.

> *Claude Code* = CLI (Command Line Interface) resmi Anthropic buat ngobrol sama AI Claude langsung dari terminal. Mirip ChatGPT tapi bisa baca/tulis file di komputer kamu.

## Apa isi paket ini?
"Kit" = ikut terpasang ke `.lintasai/` di project saat `npm create lintasai`. "Meta" = file pengantar repo (tidak dibaca AI tiap sesi).

| File | Fungsi singkat | Kategori |
|---|---|:-:|
| `AGENTS.md` | **Kernel aturan** (acuan tunggal, ADR-032) - dibaca native Codex/Kimi/Cursor + Claude via `@import` | Kit |
| `PETA.md` | Peta "apa di mana" - fungsi tiap folder + daftar rak. **AI membaca ini pertama** | Kit |
| `AGENTS.local.md.template` | Template override khusus proyek (dicopy ke root sebagai `AGENTS.local.md`, milik client) | Kit |
| `CLAUDE.md.template` | Template pemuat Claude Code (dicopy ke root sebagai `CLAUDE.md`; isinya cuma `@import`) | Kit |
| `skills/` | Rak panduan on-demand per-bidang - dibuka AI sesuai topik prompt kamu | Kit |
| `templates/` | Panduan mendalam yang dirujuk skill (STACK_GUIDE, SAFE_DATABASE_OPERATIONS, dll) | Kit |
| `setup-pola-b.mjs` | Script auto-setup Pola B di root proyek (pasang AGENTS.md + CLAUDE.md + hook) | Kit |
| `README.md` | File ini - baca dulu | Meta |
| `CHANGELOG.md` | Log perubahan per versi | Meta |
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

## Pakai sehari-hari

Tinggal `claude` aja di folder proyek - aturan kit (`AGENTS.md` + `.lintasai/`) ke-load otomatis, gak perlu paste apa-apa.

```powershell
cd C:\path\ke\proyek
claude
```

Kapabilitas besar (mis. rapikan kode) tinggal diminta lewat chat kapan saja.

---

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

**Langkah 3 - Hapus folder `.lintasai\` sendiri (manual):**
Script tidak bisa hapus folder yang sedang dia jalankan dari sana. Setelah langkah 2 selesai, **TUTUP semua VSCode / editor yang membuka file di `.lintasai\`**, lalu jalankan di PowerShell baru:
```powershell
Remove-Item -Recurse -Force .\.lintasai
```

**Opsi tambahan (advanced):**
```bash
# Hapus juga file kit yang sudah kamu edit (backup .bak dulu, jadi rollback-able):
npx lintasai uninstall --yes --allow-modified

# Hapus juga AGENTS.md (default skip karena heavy customization):
npx lintasai uninstall --yes --delete-agents

# Suppress instruksi self-delete .lintasai\ (kalau memang mau retain folder kit):
npx lintasai uninstall --yes --keep-kit

# Folder proyek di-rename setelah install (manifest project_root tidak match):
npx lintasai uninstall --yes --allow-project-root-mismatch
```
> Catatan: tanpa `--yes`, perintah cuma menampilkan rencana lalu berhenti aman (SIMULASI — jalan pura-pura, tidak menghapus apa pun). Bendera lama `--force` **DICABUT di v8.0.0** — ia sekarang tidak dikenali sama sekali; pakai `--allow-modified`.

**Setelah selesai, kamu akan dapat konfirmasi:**
- File proyek asli di `docs/`, `src/`, `package.json`, dll. AMAN tidak disentuh.
- File kit yang kamu edit (tanpa `--allow-modified`) masih ada di tempatnya.
- Verifikasi: jalankan `git status` - file proyek tidak boleh muncul sebagai deleted.

**Cara kerja:** pemasang (`setup-pola-b.mjs`) tulis `.lintasai/.install-manifest.json` yang berisi sha256 hash setiap file yang kit copy. Uninstall classify tiap file:

- **PRISTINE** (hash match) → auto-delete, file persis sama dengan kit.
- **MODIFIED** (hash beda) → kamu sudah edit; default SKIP. `--allow-modified` → backup ke `.pre-uninstall-<timestamp>.bak` lalu hapus.
- **SYMLINK** (junction / symbolic link) → SKIP selalu (cegah leak isi file di luar project ke .bak).
- **BLOCKED** (path escape ke luar project root) → REJECT (proteksi path traversal kalau manifest di-tamper).
- **LOCKED** (hash gagal - file di-buka editor / AV) → SKIP, tutup editor + re-run.
- **MISSING** (file sudah tidak ada) → skip silent.
- **BACKUP** (file `.backup-*` / folder `.lintasai.backup-*` dari pemasangan ulang `init`) → preserved, hapus manual kalau mau.

**Hard-fail** kalau `project_root` di manifest tidak match lokasi sekarang (cegah manifest project lain delete file di sini). Override via `--allow-project-root-mismatch` untuk kasus folder di-rename.

**AGENTS.md default tidak dihapus** (heavy customization expected). Pakai `--delete-agents` kalau memang mau hapus.

**Direktori (`docs/`, `.github/`, dll.) cuma dihapus kalau EMPTY** setelah file kit dibersihkan. Project file kamu di sana TETAP aman. Junction/symlink dir terdeteksi → tidak diikuti.

**⚠ Catatan TOCTOU (waktu-cek vs waktu-pakai):** plan dry-run (SIMULASI - jalan pura-pura, tidak menghapus apa pun) adalah snapshot - kalau kamu edit file antara SIMULASI dan eksekusi nyata, script re-hash sebelum delete dan SKIP file yang berubah. Aman.

**⚠ Catatan re-create:** kalau kamu pernah `git checkout -- <file>` revert file kit ke versi original, hash akan match lagi → file ke-auto-delete sebagai PRISTINE. Selalu jalankan `--dry-run` dulu sebelum `--yes` untuk automation.

#### Kalau manifest TIDAK ADA (kit lama / corrupt)

Untuk install pakai versi < v1.0.0 (sebelum manifest support) atau manifest hilang, perintah `npx lintasai uninstall` keluar dengan instruksi fallback manual. Daftar file yang kit deploy di Pola B:

- `AGENTS.md` + `AGENTS.local.md` (root proyek) - **JANGAN hapus tanpa baca dulu** (override berisi kustomisasimu)
- `CLAUDE.md` (pemuat aturan untuk Claude Code)
- `.github/workflows/secret-guard.yml`
- `.lintasai/` folder itu sendiri

> Sejak v6.0.0 kit **tidak lagi** menyalin panduan ke `docs/` project kamu - semuanya tinggal di satu
> tempat, `.lintasai/templates/`. Kalau kamu masih punya sisa salinan lama di `docs/` (STACK_GUIDE,
> SAFE_DATABASE_OPERATIONS, dll), `npx lintasai@latest update` membersihkannya otomatis - kecuali yang
> sudah kamu edit sendiri, itu sengaja dibiarkan.

Review tiap file sebelum hapus - `.github/` kemungkinan campur dengan file proyek kamu sendiri.

## Troubleshooting setup

**`claude` command not found**
Install Claude Code dulu: https://claude.com/claude-code. Verifikasi: `claude --version`.

**AI tidak baca AGENTS.md / `.lintasai/`**
Pastikan kamu jalankan Claude Code dari **root proyek** (folder tempat `AGENTS.md` berada), bukan dari subfolder. Tanya AI: *"Kamu baca file aturan dari path apa?"* - kalau jawab `~/.claude/CLAUDE.md`, bukan `./AGENTS.md`, kemungkinan kamu jalanin dari folder salah.

## FAQ singkat

**Q: Aku udah punya `CLAUDE.md` global, gimana?**
A: Biarkan saja — kit ini terpasang **per-project** (`.lintasai/` + `AGENTS.md`), tidak menyentuh file globalmu. Saat bentrok, aturan project (`AGENTS.md`) yang menang.

**Q: AI-nya bandel, gak ikut aturan?**
A: Tegur langsung: *"kamu ngelanggar aturan poin X di AGENTS.md, ulangi"*. Biasanya nurut. Kalau sering, cek dia baca file yang bener: tanya *"path AGENTS.md yang kamu baca apa?"* - atau jalankan `npx lintasai doctor` yang melaporkan aturan sampai ke alat AI mana saja.

**Q: Mau update aturan ke versi baru?**
A: Minta AI di chat: *"tolong update kit"* (atau `npx lintasai@latest update`) - backup otomatis, file baru ke-pasang. Versi tertulis di header tiap file.

**Q: Boleh aku modif aturannya?**
A: Boleh - tapi tulis di **`AGENTS.local.md`**, bukan di `AGENTS.md`. Alasannya sama dengan pertanyaan "nambah aturan khusus proyek" di bawah: `AGENTS.md` = kernel milik kit yang di-refresh tiap update, `AGENTS.local.md` = milikmu dan tak pernah ditimpa.

**Q: Komputer kerja kantor, gimana?**
A: Aturan kit disimpan di folder project (`.lintasai/` + `AGENTS.md`), gak ganggu setting user lain / proyek lain. Aman.

**Q: Mau nambah aturan khusus proyek?**
A: Tulis di **`AGENTS.local.md`** di root proyek - isinya **ditambahkan** ke aturan kit (bukan menimpa total). Cocok buat catatan khusus stack/konvensi proyek itu.

> ⚠️ **JANGAN tulis di `AGENTS.md`.** Berkas itu milik kit dan **selalu ditimpa** tiap `npx lintasai update` (dicadangkan dulu, tapi kamu tak akan tahu harus mencarinya). `AGENTS.local.md` sebaliknya: dijamin tak pernah disentuh update. Kernel juga sudah menyuruh AI membaca berkas itu, jadi aturanmu tetap sampai.

**Q: Memory & plans Claude Code disimpan di mana? Kenapa gak di `.lintasai/`?**
A: Disimpan di `%USERPROFILE%\.claude\projects\<hash>\memory\` & `%USERPROFILE%\.claude\plans\` - **by-design Anthropic Claude Code**, bukan kit ini. Sengaja TIDAK di `.lintasai/` karena:
- **Privacy** - memory berisi info pribadi (preferensi user, snapshot keamanan, kredensial dev). Kalau ter-commit = bocor sekali push.
- **Per-user** - memory kamu beda dari memory teman tim. Tidak share-able dalam 1 repo.
- **Auto-load** - Claude Code engine hardcode baca path tersebut. Pindah lokasi = auto-load mati.

Jadi 4 lokasi persistence Claude Code adalah:

| Lokasi | Ter-commit? | Peran |
|---|:-:|---|
| `.lintasai/` + `AGENTS.md` (di repo) | ✅ YA | Aturan tim - shared ke semua |
| `docs/` (di repo) | ✅ YA | Dokumentasi teknis proyek |
| `%USERPROFILE%\.claude\projects\<hash>\memory\` | ❌ TIDAK | Catatan AI private (per-user) |
| `%USERPROFILE%\.claude\plans\` | ❌ TIDAK | Draft plan AI sementara (per-user) |

## Quality & Audit

lintasAI menjalani audit berkala untuk memastikan stabilitas distribusi. Riwayat audit lengkap ada di riwayat git repo GitHub.

**Keamanan (ringkas):** paket resmi HANYA `lintasai` + `create-lintasai` dari `github.com/ojokesusu/lintasAI` — waspadai nama mirip (`lintas-ai`, `lintasaii`, `lintasai-kit`, dll.). Cek keaslian: `npm view lintasai` → field `repository` wajib menunjuk repo resmi. Lapor celah keamanan secara PRIVAT lewat GitHub Security Advisory (tab **Security** repo resmi) — kebijakan lengkapnya di `SECURITY.md` repo GitHub.

---

## Penutup
Kalau masih bingung, buka Claude Code **di folder proyek setelah install kelar**, lalu chat: "Halo, aku staff baru. Tolong cek install kit + briefing aturan dasar." AI akan auto-detect kondisi dan apply alur berpemandu bertahap sesuai `AGENTS.md` §4 (loop kerja). Selamat ngoding bareng AI yang patuh!
