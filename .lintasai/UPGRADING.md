# UPGRADING.md — Panduan pindah versi BESAR kit lintasAI

> Versi 4 · 2026-08-11

## Apa bedanya dengan CHANGELOG.md?

- **`CHANGELOG.md`** = *daftar perubahan* per rilis (apa yang baru/diperbaiki) — dibaca urut waktu.
- **`UPGRADING.md` (berkas ini)** = *buku panduan pindah* — HANYA diisi saat ada rilis **BESAR /
  `[BREAKING]`** (perubahan yang tidak kompatibel-mundur), berisi langkah konkret "dari versi lama
  ke versi baru" di satu tempat, tanpa harus menyisir CHANGELOG panjang.

## Cara pakai (klien)

1. Saat update kit melaporkan ada label `[BREAKING]`, buka berkas ini → cari bagian
   `## vX → vY` yang sesuai.
2. Ikuti langkahnya **urut dari atas**. Minta AI memandu: *"pandu aku migrasi kit ke vY"* —
   AI menjalankan per-langkah dengan konfirmasi (bukan borong sekaligus).
3. **Selalu SIMULASI dulu** (jalan pura-pura, tidak mengubah apa pun) sebelum langkah yang
   mengubah berkas — hasil simulasi ditinjau, baru diterapkan sungguhan.
4. Selesai? Jalankan `npx lintasai doctor` untuk memastikan kit sehat setelah pindah versi.

## Riwayat pindah-versi

## v7.x → v8.0.0 (2026-08-11) — berkas aturan project ganti nama: `AGENTS.override.md` → `AGENTS.local.md`

**Apa yang berubah + siapa terdampak:** berkas tempat kamu menulis aturan khusus project berganti nama.
Terdampak: **semua client v7 ke bawah** yang punya berkas `AGENTS.override.md`. Kalau kamu tak pernah
membuatnya, pindah versi ini tak menuntut apa pun darimu.

**Kenapa harus berganti:** dokumentasi resmi Codex menyatakan ia memeriksa `AGENTS.override.md` **lebih
dulu** dan memuat **paling banyak satu berkas per-folder**. Karena installer menerbitkan keduanya di akar
project, client Codex memuat berkas isianmu lalu **melewati kernel aturan sepenuhnya** — nol Bahasa
Indonesia, nol anti-mengarang, nol pengaman-hapus — **tanpa satu pun pesan error**, dan `doctor` malah
bilang "OK". Nama baru tidak diklaim Codex, jadi kernel kembali termuat.

**Artefak yang naik format:** _tidak ada._ `schema_version` kartu project & catatan-pasang tetap v1 —
tak ada berkas datamu yang perlu dikonversi. (Disebut terus terang supaya kamu tak mencari-cari.)

### Langkah migrasi (urut)

1. **SIMULASI dulu** — tidak mengubah apa pun, cuma memperlihatkan rencananya:

   ```bash
   npx lintasai@latest update --dry-run
   ```

2. Tinjau hasilnya. Kalau cocok, jalankan sungguhan:

   ```bash
   npx lintasai@latest update
   ```

   Migrasinya **otomatis**: isi `AGENTS.override.md` disalin utuh ke `AGENTS.local.md`, berkas lama
   **dicadangkan lebih dulu** jadi `AGENTS.override.md.backup-<tanggal>`, baru kemudian dibuang. Urutan
   itu disengaja — kalau pencadangan gagal, berkas lamamu **tidak disentuh sama sekali**.

3. **Verifikasi:**

   ```bash
   npx lintasai doctor
   ```

   Kalau kamu memakai Codex, kamu bisa membuktikannya sendiri dengan `codex --print-instructions` —
   judul kernel harus muncul di keluarannya.

### Kalau kamu sudah punya `AGENTS.local.md` sebelum update

Berkas lama tetap dibuang (ia yang menutupi kernel), tapi isinya **TIDAK menimpa** kerjamu di berkas
baru — dan **tidak digabung otomatis** juga. Isi lamanya ada di `AGENTS.override.md.backup-<tanggal>`;
kalau ada yang masih kamu perlukan, salin sendiri dari sana.

### Yang lain ikut dicabut di rilis ini

| Yang dicabut | Pakai ini |
|---|---|
| `npx lintasai setup` | `npx lintasai init` |
| `npx lintasai diff` | `npx lintasai doctor` |
| `npx lintasai check-update` | `npx lintasai update --check-only` |
| bendera `uninstall --force` | `uninstall --allow-modified` |

### Kasus khusus — kamu sudah di v8 tapi `AGENTS.override.md` masih ada

Bisa terjadi kalau migrasinya pernah gagal di tengah jalan (mis. berkas terkunci antivirus/editor).
Menjalankan `update` lagi **tidak menolong**: karena versinya sudah sama, update berhenti lebih awal dan
langkah migrasi tak pernah dicoba lagi. Beresi manual — 3 langkah, aman:

1. Salin isi `AGENTS.override.md` yang masih kamu perlukan ke `AGENTS.local.md`.
2. Ganti nama `AGENTS.override.md` jadi `AGENTS.override.md.bak` (jangan langsung dihapus).
3. `npx lintasai doctor` — peringatan berkas nama-lama harus hilang.

### Kalau mau kembali ke sebelum migrasi

Pulihkan `AGENTS.override.md` dari `AGENTS.override.md.backup-<tanggal>`, lalu pasang versi lama:
`npm install lintasai@7.0.0`. Folder cadangan `.lintasai.backup-<tanggal>` juga bisa dipakai — lihat
bagian **rollback/uninstall** di `README.md` kit.

---

## v6.x → v7.0.0 (2026-07-26) — folder kit ganti nama: `.claude-kit/` → `.lintasai/`

**Apa yang berubah + siapa terdampak:** folder kit di project kamu berganti nama. **Fungsi kit TIDAK
berubah sama sekali** — cuma namanya. Terdampak: **semua** client yang sudah pasang v6 ke bawah.

**Kenapa:** nama `.claude-kit` menyesatkan — folder itu produk lintasAI, tapi namanya menyiratkan
milik Claude/Anthropic, apalagi duduk bersebelahan dengan `.claude/` (folder asli Claude Code).

### Langkah (1 perintah, sisanya otomatis)

```bash
npx lintasai@latest update
```

Update mengurus **semua** ini sendiri:

| Yang diurus otomatis | Kenapa penting |
|---|---|
| Ganti nama folder (pindah nama, isi tak disentuh) | Tak ada berkas yang dihapus |
| Arahkan ulang **4 hook** di `.claude/settings.json` | Tanpa ini Palang Rem / Palang Rak / Lampu Hijau / pengingat bahasa menunjuk berkas mati → **gagal tanpa pesan error** |
| Tulis ulang path di `.install-manifest.json` + segel ulang | Tanpa ini `doctor` melapor "berkas hilang", `uninstall` & `rollback` jadi buta |
| Tambah pola `.gitignore` folder baru | Rahasia kit tetap terlindungi dari commit |
| Regen `.cursor/rules/lintasai.mdc` | Pointer rak Cursor tak menunjuk folder yang tak ada |
| Segarkan isi kit | Kode kit menunjuk folder yang benar |

**Hook & pengaturan milikmu sendiri di `.claude/settings.json` TETAP UTUH** — update hanya menyentuh
4 hook milik lintasAI.

### Yang perlu kamu lakukan sendiri (opsional, tak mendesak)

Kalau **`AGENTS.local.md`** atau **`.gitignore`**-mu menyebut `.claude-kit/`, ganti sendiri jadi
`.lintasai/`. **Sengaja tidak kami ubah** — dua berkas itu milikmu dan kit berjanji tak pernah
menimpanya. Update akan menyebut nama berkasnya kalau memang ada.

### Kalau update BERHENTI (semua kasus: nol berkas disentuh, kit kamu aman)

| Pesan | Artinya + langkahnya |
|---|---|
| "Ada DUA folder kit sekaligus" | Ada `.claude-kit/` dan `.lintasai/` berdampingan (sisa migrasi terputus). Kami **tidak menebak** mana yang benar. Cek isi keduanya, simpan yang kamu mau, hapus/pindahkan yang satunya, lalu ulangi. |
| "dijalankan DARI DALAM folder itu sendiri" | Di Windows, folder yang sedang dipakai proses tak bisa di-rename. Jalankan `npx lintasai@latest update` dari **akar project**, bukan dari dalam folder kit. |
| "Gagal mengganti nama folder" | Ada editor/terminal yang membuka berkas di folder itu, atau antivirus mengunci. **Tutup VS Code / terminal** di folder itu lalu ulangi. |

### Kalau mau kembali ke sebelum migrasi

Ganti nama `.lintasai/` balik jadi `.claude-kit/`, lalu pasang versi lama:
`npm install lintasai@6.0.0`. Folder cadangan `*.backup-<tanggal>` (kalau update dijalankan tanpa
`--no-backup`) juga bisa dipakai — lihat bagian **rollback/uninstall** di `README.md` kit.

---

## v3.1.0 → v4.0.0 (2026-07-24) — perampingan besar: rak satu rumah `skills/`, cabut apparatus non-inti

**Apa yang berubah + siapa terdampak:** kit menyusut ke inti dev web/app. Rak on-demand kini **hanya**
`skills/` (registry 33 skill). Banyak apparatus non-inti **dicabut** (ADR-033 + ADR-034). Terdampak:
client yang masih memakai skill/perintah/prompt yang dihapus.

**Artefak yang naik format:** tidak ada — `schema_version` kartu project & catatan-pasang **tetap v1**,
jadi **tak ada migrasi artefak otomatis**. `npx lintasai@latest update` aman dijalankan seperti biasa
(backup tetap dibuat sebelum apa pun diubah).

### Apakah aku perlu melakukan sesuatu?

**Umumnya tidak** — kecuali kamu bergantung pada salah satu yang dicabut di bawah.

### Fitur yang DICABUT (breaking)

1. **6 skill hilang:** `ekspor-laporan`, `email-notifikasi`, `php`, `upload-storage`, `vps`, `presentasi`.
   Panduan **upload aman** pindah ke skill `owasp` (pengaman upload TETAP aktif). Deteksi stack PHP/VPS
   tetap jalan.
2. **Rak `.claude-kit/rules/` hilang total** — standar detail kini di `skills/`. Kalau pernah menyalin
   isi `rules/` ke luar kit, backup dulu (pulih via `git show <commit>:rules/...`).
3. **6 perintah CLI hilang:** `project-map`, `project-id`, `enable-preflight-ci`, `enable-feedback-capture`,
   `feedback-scrub`, `feedback-aggregate`. Skrip/otomasi yang memanggilnya harus disesuaikan.
4. **Prompt tempel-sekali hilang:** `JALANKAN_KIT.md`, `PROJECT_LIFECYCLE_PROMPT_v1.md`, `UPDATE_KIT_PROMPT_v1.md`,
   `POST_SETUP_CHECKLIST_PROMPT_v1.md`, `AUDIT_POST_SETUP_PROMPT_v1.md`, `SPLIT_REPO_MIGRATION_PROMPT_v1.md`.
   Alur pasca-install & migrasi split-repo tak ada lagi — kernel `AGENTS.md` menangani pemahaman project native.
5. **CI-gate bawaan (`preflight.yml`) + `.github/CODEOWNERS`** tak lagi dikirim ke repo client. Kalau masih
   ingin gerbang CI / approver-wajib, pasang manual di repo kamu.

**Cara balik (rollback) kalau ada masalah:** `npx lintasai update` membuat cadangan ber-cap-waktu sebelum
menulis — pulihkan dari folder `.backup-<timestamp>`; atau pin versi lama: `npx lintasai@3.1.0 ...`.

## v2.9.x → v3.0.0 (2026-07-22) — perampingan fitur non-inti + rename folder internal

### Apakah aku perlu melakukan sesuatu?

**Umumnya tidak.** Jalankan `npx lintasai@latest update` seperti biasa — struktur folder internal
dibetulkan otomatis dan backup dibuat sebelum ada yang diubah. **Satu pengecualian:** kalau kamu
terbiasa memakai perintah yang kini dicabut (`team-setup`/`protect-main`/`migrate-project-card`/
`kimi-sync`) → baca bagian "Fitur yang DICABUT" di bawah.

### Apa yang berubah

Standar profesional yang penting **dinaikkan** ke aturan inti yang PASTI dibaca AI tiap sesi —
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
`workflows/` → **`rules/`** (rak aturan rujukan; folder ini kemudian DICABUT total — lihat ADR-034,
rak on-demand sekarang `skills/`) dan `lib/` → **`engine/`** (robot & helper Node).
`npx lintasai@latest update` membetulkan struktur folder internal `.claude-kit/` otomatis + backup.
**Catatan v4.x:** auto-fix path hook `.claude-kit/lib/`→`engine/` di `.claude/settings.json` sudah
**DICABUT** (2026-07-24). Kalau kamu update dari v1/v2 dan hook di `.claude/settings.json` (atau
catatan/skrip pribadimu) masih menunjuk `.claude-kit/lib/...`, ganti manual ke `.claude-kit/engine/...`.

### Skill bertambah 31 → 37 (aditif, tanpa tindakan)

6 "buku panduan" baru ikut terpasang otomatis: `rate-limiting` · `caching` · `realtime` ·
`admin-panel` · `wallet-ledger` (buku besar saldo judi/fintech) · `anti-fraud`. AI menyalakannya
sendiri saat topiknya tersentuh — tak perlu disetel.

### Fitur yang DICABUT — perampingan pasca-3.0.0 (fokus: bangun web/app yang kuat)

Kit dirampingkan: yang tak langsung menunjang "AI membangun website & aplikasi yang kuat" dicabut.

| Dicabut | Pengganti / cara sekarang |
|---|---|
| Fitur kerja-kelompok: perintah `team-setup` + `protect-main`, roster staff, dokumen tim (TEAMWORK/CLAUDE_TEAM/TEAM_FLOW/ONBOARDING/TEAM_ROLLOUT), template PR, robot `audit-access` | Prinsip inti TETAP di aturan (§11: kerja bareng = branch → PR → review). Kunci `main`: manual di GitHub **Settings → Branches → Add branch protection rule**. Cek akses: agenda bulanan owner (Settings → Collaborators) |
| Handoff via Discord (DISCORD_BOT_INTEGRATION) | Pakai kanal komunikasi tim masing-masing — kit tidak lagi mengatur ini |
| Dokumen install `MULAI_DI_SINI.md` + `MCP_SETUP.md` | Install cukup `npm create lintasai` (README); keamanan DB: `skills/database/SKILL.md` + `templates/SAFE_DATABASE_OPERATIONS.md` |
| `PROMPT_LIBRARY.md` (perpustakaan prompt) | Loop kerja di kernel `AGENTS.md` §4 — staff cukup chat natural |
| `RULES_COMPLIANCE_TEST.md` | Minta lewat chat: "uji kepatuhan aturan X" |
| CLI warisan `migrate-project-card` + alias `kimi-sync` | Lihat 2 butir di atas |

**Catatan untuk project klien LAMA:** salinan dokumen tim yang dulu ter-deploy (`docs/TEAMWORK_GUIDE.md`,
`docs/CLAUDE_TEAM_GUIDE.md`, `docs/PROMPT_LIBRARY.md`, `docs/MCP_SETUP.md`, `docs/ONBOARDING.md`,
`docs/TEAM_FLOW_SKETCH_v1.md`, `.github/pull_request_template.md`,
`.github/staff-roster.yml`, `.github/workflows/audit-access.yml`) **TIDAK dihapus otomatis** saat
update — update kit hanya mengganti isi `.claude-kit/`. Boleh kamu hapus manual kalau tak dipakai;
membiarkannya juga tidak merusak apa pun.

### Rollback — kalau sesudah update ada masalah

Satu jalur, dua langkah: pulihkan folder backup otomatis (rename `.claude-kit.backup-<cap-waktu>`
kembali jadi `.claude-kit`) lalu **`npm install lintasai@2.9.0`** (versi rilis terakhir sebelum ini).
Catatan jujur: `2.9.1` dan draf `3.0.0` tertanggal 19-Jul **tidak pernah terbit di npm** — minta
versi itu akan berakhir "No matching version".

### Cara memeriksa update-nya benar-benar aktif

Buka chat baru, lalu tanya AI: *"pengingat apa saja yang kamu terima di awal giliran ini?"* Jawabannya
harus menyebut **titik risiko + lapor jujur**.
