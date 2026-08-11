# UPGRADING.md — Panduan pindah versi BESAR kit lintasAI

> Versi 2 · 2026-07-10 · Langkah 5 rencana internal STRATEGI_UPDATE_v2 §6 disiplin rilis (riwayat git)

## Apa bedanya dengan CHANGELOG.md?

- **`CHANGELOG.md`** = *daftar perubahan* per rilis (apa yang baru/diperbaiki) — dibaca urut waktu.
- **`UPGRADING.md` (berkas ini)** = *buku panduan pindah* — HANYA diisi saat ada rilis **BESAR /
  `[BREAKING]`** (perubahan yang tidak kompatibel-mundur), berisi langkah konkret "dari versi lama
  ke versi baru" di satu tempat, tanpa harus menyisir CHANGELOG panjang.

🏢 Analogi: CHANGELOG = **koran** (berita harian); UPGRADING = **petunjuk pindahan rumah** — hanya
terbit saat kamu benar-benar pindah rumah, dan isinya langkah-langkah, bukan berita.

## Cara pakai (klien)

1. Saat update kit melaporkan ada label `[BREAKING]`, buka berkas ini → cari bagian
   `## vX → vY` yang sesuai.
2. Ikuti langkahnya **urut dari atas**. Minta AI memandu: *"pandu aku migrasi kit ke vY"* —
   AI menjalankan per-langkah dengan konfirmasi (bukan borong sekaligus).
3. **Selalu SIMULASI dulu** (jalan pura-pura, tidak mengubah apa pun) sebelum langkah yang
   mengubah berkas — hasil simulasi ditinjau, baru diterapkan sungguhan.
4. Selesai? Jalankan `npx lintasai doctor` — bagian "laporan migrasi" harus hijau
   ("Termigrasi X dari X"). Kalau masih "Selesai sebagian", ada artefak yang belum menyusul.

## Aturan menulis entri (maintainer kit — WAJIB tiap rilis `[BREAKING]`)

Tiap rilis ber-label `[BREAKING]` WAJIB menambah satu bagian di bawah dengan kerangka ini
(penjaga gerbang `preflight` menagih: kenaikan `schema_version` artefak yang tidak disebut di
berkas ini = peringatan PENTING):

```markdown
## vX.Y.Z → vA.B.C (tanggal)

**Apa yang berubah + siapa terdampak:** <1-2 kalimat bahasa awam>
**Artefak yang naik format:** <nama berkas, mis. project.lintas.jsonc v1 → v2>

**Langkah migrasi (urut):**
1. SIMULASI dulu (tidak mengubah apa pun): `<perintah 1-baris --simulasi>`
2. Tinjau hasil simulasi → kalau cocok, terapkan: `<perintah 1-baris>`
   (migrator WAJIB idempoten + membuat cadangan ber-cap-waktu + mencatat ke buku-besar
   `.migration-state.json` supaya tak jalan dobel)
3. Verifikasi: `npx lintasai doctor` → laporan migrasi hijau.

**Cara balik (rollback) kalau ada masalah:** <1 baris, mis. pulihkan dari cadangan .backup-<ts>>
```

Rujukan maintainer: `docs/RESEP_PERUBAHAN.md` **Resep 9** (naik-versi-skema) + aturan
**"Dua Keranjang Migrasi"** di `workflows/4.5-update-strategy.md` (dulu di `LINTASAI_WORKFLOWS_v1.md` §4.5 — sejak v2.4.0 berkas itu jadi pengalih).

---

## Riwayat pindah-versi

## v2.9.x → v3.0.0 (2026-07-22) — perampingan fitur non-inti + ritual "8 divisi wajib" dicabut + rename folder internal

### Apakah aku perlu melakukan sesuatu?

**Umumnya tidak.** Jalankan `npx lintasai@latest update` seperti biasa — struktur folder internal
dibetulkan otomatis dan backup dibuat sebelum ada yang diubah. **Dua pengecualian:** (1) kalau kamu
terbiasa memakai perintah yang kini dicabut (`team-setup`/`protect-main`/`migrate-project-card`/
`kimi-sync`) → baca bagian "Fitur yang DICABUT" di bawah; (2) kalau project-mu masih memakai kartu
lama `project.lintas.psd1` → baca "Langkah migrasi" v2.0.0 di bawah.

### Apa yang berubah

AI tidak lagi menimbang daftar 8 divisi (backend/frontend/database/webdesign/UI-UX/devops/keamanan/SEO)
di **tiap** prompt. Dua uji buta di project klien nyata menemukan ritual itu justru membuat AI
menemukan **lebih sedikit** hal penting — daftar 8 kotak membuatnya berhenti menggali setelah kotak
terakhir terisi.

**Standarnya tidak hilang.** Sebagian malah **dinaikkan** ke aturan yang PASTI dibaca AI tiap sesi —
termasuk yang sebelumnya cuma ada di rak yang jarang dibuka: aksesibilitas WCAG 2.2 konkret, larangan
mengirim tampilan template mentah, desain API yang rapi, dan sitemap/robots.txt.

### Yang TETAP terjaga (tidak berubah sama sekali)

| Pagar | Isinya |
|---|---|
| Keamanan (§8, §8.1) | rahasia tak bocor · otorisasi per-resource · query aman · anti-suntikan-perintah |
| Anti-ngarang (§8.2) | tiap klaim wajib berbukti · aksi merusak wajib konfirmasi ketik-verbatim |
| Bahasa (§2.1) | Bahasa Indonesia gaya non-programmer di SETIAP jawaban |
| Gerbang rilis (§4.6) | dilarang bilang "selesai" sebelum tes jalan + bukti `berkas:baris` |
| Baca-kode-dulu (§7.3a) | kode asli dibaca sebelum diubah; pemakaian dicari sebelum dihapus |

Palang Rem Otomatis (menahan `rm -rf`, `DROP TABLE`, force-push) juga tetap **NYALA**.

### Perintah CLI yang berubah nama (ADR-027 Task 17)

- `npx lintasai kimi-sync` → **`npx lintasai adapter-sync`**. Dulu perintah ini cuma menyinkronkan berkas
  aturan Kimi (`.kimi-code/AGENTS.md`); kini ia **payung 3 alat AI** sekaligus — Kimi, Cursor
  (`.cursor/rules/lintasai.mdc`), dan Codex (blok di `AGENTS.md` akar). Nama `kimi-sync` tak lagi cocok
  karena melayani lebih dari Kimi.
- **Alias `kimi-sync` sudah DICABUT** (perampingan pasca-3.0.0). Skrip/kebiasaan lama yang masih
  memanggil `kimi-sync` akan mendapat "Unknown command" — ganti ke `adapter-sync`.
- **Tak ada tindakan wajib:** `update` tetap membuat/memperbarui ketiga berkas adapter otomatis;
  perintah manual ini hanya untuk menyinkronkan ulang di luar `update`.

### Rename folder internal kit (ADR-027 Task 13) — dibetulkan OTOMATIS saat update

Dua folder di dalam `.claude-kit/` berganti nama supaya namanya jujur dengan isinya:
`workflows/` → **`rules/`** (rak aturan rujukan) dan `lib/` → **`engine/`** (robot & helper Node).
`npx lintasai@latest update` **membetulkan semuanya otomatis** — termasuk path hook di
`.claude/settings.json` project-mu (robot `migrate-client-struktur`, idempoten + backup). Kamu tak
perlu mengedit apa pun; kalau ada catatan/skrip pribadimu yang menunjuk `.claude-kit/lib/...`,
ganti manual ke `.claude-kit/engine/...`.

### Skill bertambah 31 → 37 (aditif, tanpa tindakan)

6 "buku panduan" baru ikut terpasang otomatis: `rate-limiting` · `caching` · `realtime` ·
`admin-panel` · `wallet-ledger` (buku besar saldo judi/fintech) · `anti-fraud`. AI menyalakannya
sendiri saat topiknya tersentuh — tak perlu disetel.

### Fitur yang DICABUT — perampingan pasca-3.0.0 (fokus: bangun web/app yang kuat)

Kit dirampingkan: yang tak langsung menunjang "AI membangun website & aplikasi yang kuat" dicabut.

| Dicabut | Pengganti / cara sekarang |
|---|---|
| Fitur kerja-kelompok: perintah `team-setup` + `protect-main`, roster staff, dokumen tim (TEAMWORK/CLAUDE_TEAM/TEAM_FLOW/ONBOARDING/TEAM_ROLLOUT), template CODEOWNERS + template PR, robot `ai-review` + `audit-access` | Prinsip inti TETAP di aturan (§11: kerja bareng = branch → PR → review). Kunci `main`: manual di GitHub **Settings → Branches → Add branch protection rule**. Cek akses: agenda bulanan owner (Settings → Collaborators) |
| Handoff via Discord (DISCORD_BOT_INTEGRATION) | Pakai kanal komunikasi tim masing-masing — kit tidak lagi mengatur ini |
| Dokumen install `MULAI_DI_SINI.md` + `MCP_SETUP.md` | Install cukup `npm create lintasai` (README); keamanan DB: `skills/database/SKILL.md` + `docs/SAFE_DATABASE_OPERATIONS.md` + `docs/RLS_SETUP_PROMPT.md` |
| `PROMPT_LIBRARY.md` (perpustakaan prompt) | Tabel intent→pola kerja di aturan kit (`rules/4.2-pattern-driven.md`) — staff cukup chat natural |
| `RULES_COMPLIANCE_TEST.md` | Minta lewat chat: "uji kepatuhan aturan X" (cara: `rules/4.6-6.3-efficiency-doctrine.md`) |
| CLI warisan `migrate-project-card` + alias `kimi-sync` | Lihat 2 butir di atas |

**Catatan untuk project klien LAMA:** salinan dokumen tim yang dulu ter-deploy (`docs/TEAMWORK_GUIDE.md`,
`docs/CLAUDE_TEAM_GUIDE.md`, `docs/PROMPT_LIBRARY.md`, `docs/MCP_SETUP.md`, `docs/ONBOARDING.md`,
`docs/TEAM_FLOW_SKETCH_v1.md`, `.github/CODEOWNERS`, `.github/pull_request_template.md`,
`.github/staff-roster.yml`, `.github/workflows/ai-review.yml`, `.github/workflows/audit-access.yml`,
`.github/scripts/ai-review.cjs`) **TIDAK dihapus otomatis** saat update — update kit hanya mengganti isi
`.claude-kit/`. Boleh kamu hapus manual kalau tak dipakai; membiarkannya juga tidak merusak apa pun
(robot `ai-review` lama tetap jalan selama `ANTHROPIC_API_KEY`-nya masih terpasang — cabut key-nya
kalau mau mematikan).

### Rollback — kalau sesudah update ada masalah

Satu jalur, dua langkah: pulihkan folder backup otomatis (rename `.claude-kit.backup-<cap-waktu>`
kembali jadi `.claude-kit`) lalu **`npm install lintasai@2.9.0`** (versi rilis terakhir sebelum ini).
Catatan jujur: `2.9.1` dan draf `3.0.0` tertanggal 19-Jul **tidak pernah terbit di npm** — minta
versi itu akan berakhir "No matching version".

### Kalau kamu ingin perilaku LAMA kembali

Perilaku lama = AI menimbang 8 divisi tiap prompt. Cara mengembalikannya di project-mu:

1. Buka `AGENTS.md` di akar project.
2. Tambahkan di bagian **"Override khusus proyek"**:

   ```markdown
   - [x] Selalu timbang 8 lensa divisi tiap prompt: Backend, Frontend, Database, Webdesign,
         UI/UX, DevOps, Cyber Security, SEO — sebutkan yang relevan sebelum mulai.
   ```

3. Buka **chat BARU** (aturan dimuat saat sesi dimulai — sesi yang sedang berjalan belum berubah).

> ⚠️ **Sebelum melakukannya, pertimbangkan:** justru itu yang diukur merugikan. Kalau alasanmu "terasa
> lebih teliti", ingat bahwa sisi yang memakainya **kalah** di kedua uji buta. Kalau kamu tetap
> memakainya dan hasilnya lebih baik di project-mu, tolong kabari owner — data lapangan itu berharga.

### Cara memeriksa update-nya benar-benar aktif

Buka chat baru, lalu tanya AI: *"pengingat apa saja yang kamu terima di awal giliran ini?"* Jawabannya
harus menyebut **titik risiko + lapor jujur**, dan **tidak lagi** menyebut daftar 8 divisi.

---

## v1.62.x / v1.63.x → v2.0.0 (2026-07-10)

**Apa yang berubah + siapa terdampak:** SEMUA alat PowerShell dihapus dari kit — kit kini **100%
Node** (jalan sama di semua komputer). Skrip lama `kit.ps1`, `update-kit.ps1`, dan seluruh
`lib/*.ps1` **tidak ada lagi** → semua perintah kini lewat `npx lintasai <perintah>`
(mis. `npx lintasai doctor`, `npx lintasai@latest update`). Terdampak: semua project ber-kit yang masih
memanggil skrip `.ps1` kit secara langsung. Catatan penting: yang dihapus hanya **alat kit yang
ditulis dalam bahasa PowerShell** — PowerShell sebagai *terminal Windows* (jendela tempat kamu
mengetik `npm`/`npx`) tetap kamu pakai seperti biasa. Alasan keputusan lengkap:
`docs/decisions/ADR-007-hapus-total-powershell-v2.md`.

**Artefak yang naik format:**
- Kartu identitas project `project.lintas.psd1` (wadah lama) → `project.lintas.jsonc`
  (isi/angka skemanya tetap versi 1 — yang berubah **wadah berkas**-nya, bukan formatnya).
- `.github/scripts/setup-branch-protection.ps1` (kalau ada di project-mu) → pengganti resmi:
  kunci manual di GitHub (**Settings → Branches → Add branch protection rule** untuk `main`). Skrip lamanya
  boleh dihapus setelah pengganti terbukti jalan.
- Folder `.claude-kit.backup-*` yang berisi `.ps1` lama = **arsip normal** — biarkan saja,
  **JANGAN disalin balik** ke `.claude-kit/`.

**Larangan penting:** JANGAN update ke v2.0.0 memakai updater PowerShell lama
(`.\.claude-kit\update-kit.ps1`) — kit v2 tidak lagi membawa berkas yang updater lama harapkan.
(Satu stub penyelamat `setup-pola-b.ps1` sengaja disisakan di kit sampai v3 supaya updater lama
yang terlanjur jalan tidak tersangkut setengah-jadi — tapi itu jaring darurat, bukan jalur resmi.)
Jalur resmi: `npx lintasai@latest update` — atau `npm create lintasai@latest` kalau tak punya akses repo.

**Langkah migrasi (urut):**
1. Update kit lewat jalur resmi: `npx lintasai@latest update` — cadangan `.claude-kit.backup-<cap-waktu>`
   dibuat otomatis sebelum ada yang diubah.
2. Kalau project-mu masih punya kartu lama `project.lintas.psd1` → migrator `migrate-project-card`
   sudah **dicabut** dari kit versi ini (perampingan pasca-3.0.0). Dua pilihan: jalankan migrasinya
   lewat versi lama yang masih membawanya (`npx lintasai@2.9.0 migrate-project-card` → tinjau
   simulasi → `--apply`), ATAU buat `project.lintas.jsonc` baru secara manual (minta AI-mu menyalin
   pola dari `.claude-kit/templates/project.lintas.example.jsonc`) lalu hapus `.psd1` lama.
3. (Opsional) Kalau dulu memasang kunci-gabung branch via skrip PS: setel ulang manual di GitHub
   (**Settings → Branches → Add branch protection rule** untuk `main` — wajib PR + 1 approval).
4. Verifikasi: `npx lintasai doctor` → hijau + laporan migrasi **"Termigrasi X dari X artefak
   yang ada"** (tidak ada yang tertinggal).

**Cara balik (rollback) kalau ada masalah:** pulihkan cadangan — rename folder
`.claude-kit.backup-<cap-waktu>` kembali menjadi `.claude-kit` — lalu `npm install lintasai@1.62`
(versi stabil terakhir sebelum kereta v2 di npm; catatan: v1.63.0 = rilis jembatan yang TIDAK
pernah diterbitkan ke npm, jadi `@1.63` akan gagal "No matching version").
