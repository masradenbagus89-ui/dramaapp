# Lampu Hijau Plan Mode (`plan-mode-gate`)

> Versi 1.0.0 · 2026-07-18 · Berlaku untuk Claude Code

## Tujuan

Saat kamu memakai **plan mode** (mode di mana AI menyusun rencana dulu sebelum mengubah apa pun),
AI banyak membaca: buka berkas, cari teks, lihat riwayat git. Sebelum ada robot ini, tiap langkah
seperti itu bisa memunculkan **dialog minta izin** — padahal tidak ada yang diubah.

Akibat sampingannya berbahaya: orang jadi refleks menekan "izinkan" tanpa membaca. Di mesin kerja
pemilik kit, daftar izin sempat menggelembung sampai **ratusan entri** karena kebiasaan itu — dan
di antaranya ikut terizinkan permanen perintah-perintah yang sebenarnya bisa menulis.

Robot ini memberi **lampu hijau otomatis** untuk aksi yang terbukti cuma-baca **saat plan mode saja**.
Hasilnya: dialog yang tersisa benar-benar cuma untuk hal yang pantas ditanyakan.

## Ini BUKAN "izinkan semua saat plan mode"

Permintaan awalnya memang begitu, dan **sengaja ditolak**. Alasannya di
[ADR-021](decisions/ADR-021-plan-mode-izin-otomatis.md); ringkasnya:

- Plan mode **tidak** mengunci perintah terminal. Yang dikunci keras hanya `Edit`/`Write`.
  Perintah seperti `rm` atau `curl` **tetap bisa jalan** — itulah sebabnya dialognya ada.
- Dokumentasi resmi Anthropic menyatakan mode bypass *"offers no protection against prompt
  injection or unintended actions"*.

**Skenario gagal nyata** kalau bypass total dipasang: AI membaca `README.md` atau isu GitHub milik
pihak lain saat menyusun rencana. Di dalamnya ada titipan kalimat yang menyamar jadi perintah.
Perintah itu **jalan tanpa kamu lihat**, karena lampu peringatannya kita matikan sendiri.

## Dua pagar yang membuatnya aman

**Pagar 1 — Palang Rem selalu didahulukan.** Sebelum mengizinkan apa pun, robot ini memanggil
`decide()` milik [`engine/risk-gate.js`](risk-gate.md). Apa pun yang Palang Rem anggap berbahaya
**tidak akan pernah** bisa lolos lewat jalur ini. Penilaian bahaya tetap **satu sumber** — tidak
ditulis ulang, jadi dua penjaga tak mungkin berbeda pendapat.

**Pagar 2 — daftar-putih, bukan daftar-hitam.** Yang tidak dikenali secara eksplisit **tidak**
diizinkan; ia jatuh ke alur izin normal. Artinya kalau kami lupa mendaftarkan sesuatu, akibatnya
"dialognya masih muncul" (menjengkelkan) — **bukan** "perintah berbahaya lolos" (celah).

## Yang dapat lampu hijau

Hanya saat `permission_mode` = `plan`. Di luar itu robot ini **diam total**.

**Alat:** `Read`, `Grep`, `Glob`, `NotebookRead`, `TodoWrite`, `WebSearch`.

**Perintah terminal — lapis BACA** (memeriksa saja): `ls`, `cat`, `head`, `tail`, `wc`, `grep`,
`rg`, `tree`, `diff`, `find` (tanpa `-delete`/`-exec`), `git status|log|diff|show|blame|ls-files|
rev-parse`, dan varian membaca dari `git branch|config|remote|tag|stash`.

**Perintah terminal — lapis PROYEK** (menjalankan skrip milik project sendiri): `npm test`,
`npm run <skrip terdaftar>` (`test`, `lint`, `build`, `typecheck`, `check`, `preflight`, …),
`npm ls|view|outdated`, `npx lintasai preflight|doctor|project-map|env-keys|unicode-check`.

## Yang TIDAK pernah dapat lampu hijau

| Hal | Kenapa |
|---|---|
| Berkas rahasia (`.env`, `.ssh`, `*.pem`, kredensial, token) | Boundary keras §8.1 #6 — **walau cuma dibaca**, isinya bisa masuk transkrip lalu terbawa keluar |
| `>` `>>` `$( )` backtick `${ }` baris-baru | Bisa menulis berkas / menyulihkan perintah — tak bisa dinilai aman |
| `cat x \| sh`, `\| node`, `\| bash` | Menjalankan isi berkas sebagai perintah |
| `git commit|checkout|tag <nama>|config <k> <v>|stash pop` | Terlihat jinak, tapi **menulis** |
| `npm run deploy`, `npm publish`, `npm install` | Di luar daftar skrip — bisa apa saja |
| `npx <paket-asing>` | Mengunduh lalu menjalankan paket dari internet (§8.1 #2) |
| `WebFetch` | Pintu masuk titipan-perintah, dan alamat URL-nya bisa dipakai menyelundupkan data |
| Perintah **PowerShell** | Sintaksnya terlalu bebas untuk dinilai aman — sengaja tak ditangani |

## Cara memasang / mematikan

**Sudah otomatis** — pemasang kit menyalakannya tiap `init`/`update` (default NYALA, ADR-021).

Pasang ulang manual (kalau hook terhapus):
```bash
node .claude-kit/engine/ensure-plan-mode-gate-hook.mjs
```
Atau salin blok `hooks` dari `templates/hooks/plan-mode-gate.settings.example.json` ke
`.claude/settings.json`.

**Matikan:** hapus blok `PreToolUse` yang memuat `plan-mode-gate.js` dari `.claude/settings.json`.

> ⚠️ Hook dimuat **saat sesi mulai**. Setelah memasang/mematikan, **buka chat BARU** — sesi yang
> sedang berjalan tidak berubah.

## Uji-jalan

```bash
# Plan mode + baca -> HARUS keluar JSON permissionDecision "allow"
echo '{"permission_mode":"plan","tool_name":"Read","tool_input":{"file_path":"a.txt"}}' | node .claude-kit/engine/plan-mode-gate.js

# Di luar plan mode -> HARUS kosong (robot diam)
echo '{"permission_mode":"default","tool_name":"Read","tool_input":{"file_path":"a.txt"}}' | node .claude-kit/engine/plan-mode-gate.js

# Plan mode + aksi merusak -> HARUS kosong (Palang Rem yang bicara)
echo '{"permission_mode":"plan","tool_name":"Bash","tool_input":{"command":"rm -rf /data"}}' | node .claude-kit/engine/plan-mode-gate.js
```

Uji di sesi nyata: buka chat baru → masuk plan mode → minta AI memeriksa beberapa berkas dan
menjalankan `git log` → **tidak boleh ada dialog izin**. Lalu minta sesuatu yang mengubah berkas →
**dialog harus tetap muncul**.

## Batas jujur — AI lain

| Alat | Status |
|---|---|
| **Claude Code** | ✅ Robot ini bekerja di sini |
| **Kimi Code** | ✅ Tidak perlu — plan mode Kimi **sudah** cuma-baca total (dokumentasi resminya: AI hanya boleh `Glob`/`Grep`/`ReadFile`, tak bisa menjalankan perintah). Tak ada dialog untuk dihilangkan. Karena itu **tidak** dibuatkan adaptor Kimi. |
| **Codex** | ❌ Tidak bisa — kebijakan izinnya berlaku se-sesi (`approval_policy`, `--sandbox`); tak ada penghubung ke status plan mode |
| **Cursor** | ❌ Tidak bisa — Plan Mode dan Run Mode didokumentasikan sebagai dua hal terpisah, tanpa penghubung |

Ketiganya sudah diperiksa di dokumentasi resmi masing-masing. **Nol dari tiga** menyediakan
"saat plan mode, izinkan semua" — dan polanya konsisten: plan mode dirancang **lebih ketat**,
bukan lebih longgar.

## Dependensi

- [`engine/risk-gate.js`](risk-gate.md) — **wajib bersebelahan**; `plan-mode-gate.js` me-`require`-nya.
  Kalau berkas itu hilang, robot ini diam (tak pernah mengizinkan) — aman.
- Node.js ≥18 (sudah ada kalau kit dipasang lewat npm).

## Catatan

- **Kenapa fail-safe-nya kebalikan `risk-gate`:** `risk-gate` boleh *fail-open* (kalau ia error,
  akibatnya cuma "tidak menambah pertanyaan"). Robot ini kalau fail-open ke `allow` justru
  **melepas pagar** — jadi apa pun yang aneh (input rusak, `risk-gate` melempar error, kolom
  `permission_mode` tidak ada) → **diam**, tidak mengizinkan.
- **Kenapa kolom `permission_mode` hilang tidak dianggap plan mode:** harness versi lama mungkin
  belum mengirim kolom itu. Menganggapnya "plan mode" akan membuka lampu hijau di sesi biasa.
  Dikunci tes.
- Sumber: `engine/plan-mode-gate.js` · `engine/ensure-plan-mode-gate-hook.mjs` ·
  tes `tests/plan-mode-gate.test.mjs` + `tests/ensure-plan-mode-gate-hook.test.mjs`.
