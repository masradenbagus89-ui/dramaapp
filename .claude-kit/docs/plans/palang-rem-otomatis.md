# Rancangan — Palang Rem Otomatis (Pinjaman #1 dari ECC)

> Versi RANCANGAN 1 · 2026-06-20 · Status: **DRAFT — menunggu review + persetujuan owner sebelum dibangun.**
> Belum ada kode/hook yang dipasang. Ini dokumen rencana (pola `docs/plans`, §3).
> Pinjaman onderdil #1 dari telaah adil lintasAI vs ECC v2.0.0. Sumber pola: ECC (MIT), ditulis-ulang.

---

## 1. Tujuan & masalah (celah jujur yang ditambal)

Hasil scan 10-dimensi mengakui **satu-satunya celah struktural lintasAI**: kit ini **tidak punya satu pun "rem-mesin" yang benar-benar MEMAKSA.** Semua pengaman anti-bahaya (§8.1 anti-prompt-injection, §8.2 Aturan 5 konfirmasi-verbatim aksi merusak, §9 DB) saat ini = **kebijakan teks** yang bergantung pada **AI mau patuh**. Catatan kit sendiri mengakui aturan pernah ke-violate 2× saat beban kerja tinggi.

Untuk audiens lintasAI (staff non-programmer yang **tidak bisa mendeteksi saat AI melenceng**) + project berisiko tinggi (data + kunci rahasia banyak), bergantung 100% pada kepatuhan AI = risiko nyata.

**Ide inti (framing yang benar):** palang rem = **PENEGAK-MESIN untuk §8.2 Aturan 5 yang SUDAH ADA** — bukan kebijakan baru. Kebijakannya sudah tertulis ("aksi merusak wajib konfirmasi verbatim"); yang belum ada = mesin yang **memaksanya** kalau AI lupa. Jadi ini menutup gap "kebijakan-tanpa-penegakan", bukan menambah aturan baru.

🏢 Analogi non-programmer: selama ini kit punya **rambu "AWAS JURANG"** (tulisan), tapi belum ada **palang besi** yang benar-benar menghentikan mobil. Pinjaman #1 = memasang palang besinya — tapi palang yang **menanyakan ke sopir manusia dulu** ("yakin mau lewat sini?"), bukan yang mengunci mati.

---

## 2. Kontrak teknis Claude Code (TERVERIFIKASI — bukan ngarang)

Diverifikasi dari (a) hook ECC nyata yang jalan di Claude Code + (b) konfirmasi pemandu Claude Code. **Wajib cek ulang ke dokumen Claude Code versi terpasang saat implementasi (§8.2 Aturan 1).**

**Mekanisme:** hook `PreToolUse` dipasang di `settings.json` (`hooks.PreToolUse[]`), dengan `matcher` nama-tool (mis. `"Bash|Edit|Write|MultiEdit"`) + opsi `if` untuk menyempitkan (mis. `"Bash(rm *)"`). Hook menerima detail aksi via **input JSON di stdin**, lalu memutuskan.

Field input yang dipakai: `tool_name`, `tool_input` (mis. `file_path` untuk Edit/Write, `command` untuk Bash), `cwd`, `session_id`, `permission_mode`.

**Dua cara memutuskan (kita pakai keduanya berjenjang):**

| Keputusan | Cara | Efek |
|---|---|---|
| **TANYA user (ideal non-programmer)** | exit 0 + stdout JSON `hookSpecificOutput.permissionDecision = "ask"` + `permissionDecisionReason` (alasan bahasa Indonesia) | Claude Code munculkan **dialog klik native** — user tekan **setujui/tolak**. |
| **BLOKIR keras (cadangan)** | exit code **2** + pesan ke **stderr** | Aksi diblokir; pesan jadi umpan-balik ke AI. Ini lantai-aman yang PASTI jalan (dipakai ECC `config-protection.js:126-133`). |
| **Lolos (aman)** | exit 0 tanpa JSON, atau `permissionDecision = "allow"`/`"defer"` | Aksi lanjut normal. |

> Sumber pola ECC (MIT): `scripts/hooks/config-protection.js:92-136` (parse stdin → klasifikasi → exit 2 + stderr; fail-closed pada error non-ENOENT), wiring `hooks/hooks.json:64-74` (matcher `Edit|Write|MultiEdit`, timeout 5 dtk). Gateguard `scripts/hooks/gateguard-fact-force.js` pakai `permissionDecision: "deny"` (varian lebih canggih). lintasAI **tidak** meniru kerumitan gateguard — ambil pola minimal `config-protection` + tingkatkan ke `"ask"`.

**⚠️ KOREKSI (v1.57.1):** contoh rancangan awal di bawah KELIRU dan dikoreksi — kontrak hook Claude Code pakai **SATU string `command`** (binary + path digabung), **BUKAN field `args` terpisah** (`args` itu format MCP server → Claude Code mengabaikannya diam-diam → palang **gagal-diam**). Runtime final = **Node.js** (ADR-002), jadi wiring yang BENAR = `"command": "node .claude-kit/lib/risk-gate.js"`. Lihat wiring final di `templates/hooks/risk-gate.settings.example.json` (dikunci tes).
> ~~contoh keliru rancangan awal: `command: "powershell.exe", args: ["-NoProfile","-File","...risk-gate.ps1"]`~~

---

## 3. Aksi yang DIJAGA (daftar awal — minta konfirmasi owner)

Hanya aksi **benar-benar berisiko** yang dijaga. Sisanya lolos (jangan ganggu kerja sah). Tiap baris memetakan ke aturan kit yang SUDAH ADA.

| # | Aksi berisiko (matcher) | Keputusan | Aturan kit terkait |
|---|---|---|---|
| 1 | Hapus rekursif paksa: `rm -rf`, `Remove-Item -Recurse -Force` | **ask** | §8.1 #3, §8.2 Aturan 5 |
| 2 | SQL merusak: `DROP TABLE/DATABASE`, `TRUNCATE`, `DELETE FROM ... ` tanpa `WHERE` | **ask** | §8.2 Aturan 5, §9 |
| 3 | Prisma berbahaya: `prisma migrate dev` (di luar DB lokal), `deleteMany()`/`updateMany()` **tanpa `where`** | **ask** | §4.14 #2 (Pinjaman #2 baru) |
| 4 | Git berbahaya: `push --force`/`-f`, `reset --hard`, `--no-verify`, `commit.gpgsign=false` | **ask** | §8.1 #3, §12 |
| 5 | Sentuh rahasia: `Edit`/`Write` ke `.env*` (terutama prod) | **ask** | §8.1 #6 |
| 6 | Format/partisi disk: `Format-Volume`, `diskpart`, `mkfs`, `dd of=/dev/...` | **ask** (atau blok-keras) | §8.1 #3 |
| 7 | Menembus pagar: `--dangerously-skip-permissions`, `iwr ... | iex`, `curl ... | bash` | **blok-keras (exit 2)** | §8.1 #2, #10 |

**Alasan #7 = blok-keras (bukan ask):** menembus-pagar/unduh-lalu-jalankan tidak boleh dilewatkan ke "tanya user" — itu justru yang §8.1 #10 larang mutlak; cukup tolak + jelaskan.

**Pesan `permissionDecisionReason` (contoh, Bahasa Indonesia awam):**
> "🚨 Aksi ini berisiko: menghapus banyak data sekaligus (`deleteMany` tanpa syarat). Bisa menghapus SELURUH isi tabel. Kalau ini memang yang kamu mau, tekan **Setujui**. Kalau ragu, tekan **Tolak** lalu minta AI jelaskan dulu."

---

## 4. UX non-programmer (kenapa "ask", bukan blok-keras)

ECC memblokir keras + mencetak instruksi **Inggris teknis** ("List ALL files that import...") → buat staff awam = pintu terkunci dengan perintah asing → kerja mandek. lintasAI pakai **`"ask"` → dialog klik native** dengan alasan Bahasa Indonesia: staff cukup **baca alasan + klik Setujui/Tolak**. Tidak ada perintah yang harus diketik. Ini menyatukan 3 hal: rem-mesin (dipaksa) + bahasa awam + popup klik (§4.7).

Aksi normal (edit biasa, baca file, query aman) **tidak pernah** memicu dialog — palang hanya bangun untuk pola berisiko di §3.

---

## 5. Sketsa implementasi (saat disetujui)

1. **`lib/risk-gate.ps1`** (robot baru, saudara `ai-config-check.ps1`/`unicode-safety-check.ps1`): baca JSON stdin → ambil `tool_name` + `tool_input.command`/`file_path` → klasifikasi via daftar pola §3 (deterministik, regex pasti, anti-ambigu sesuai §6.3) → keluarkan JSON `permissionDecision: "ask"` + alasan Indonesia, ATAU exit 2 untuk kategori blok-keras, ATAU exit 0 (lolos). **Tanpa state, tanpa jaringan, ~0 token.**
2. **Template wiring** `templates/settings.local.json` (atau berkas hook terpisah) berisi blok `hooks.PreToolUse` yang memanggil `risk-gate.ps1` dengan matcher sempit (`Bash|Edit|Write|MultiEdit`).
3. **Installer** (`setup-pola-b.ps1`) menawarkan pasang palang ini (opt-in popup, lihat §7) + menyalin `risk-gate.ps1` ke `.claude-kit/lib/`.
4. **Tes** `tests/risk-gate.Tests.ps1` (lihat §8).
5. **Dokumen** `docs/risk-gate.md` (pendamping §7.5) + entri §8.1/§8.2 yang menunjuk "kini ada penegak-mesin opsional" + KEUNGGULAN + CHANGELOG.

**Reuse (jangan tulis ulang):** pola baca-stdin + klasifikasi + label dari `lib/ai-config-check.ps1`; daftar pola merusak dari `lib/consistency-check.ps1`/§8.1; deteksi `deleteMany`/`migrate dev` dari §4.14 #2.

---

## 6. Keputusan desain + risiko (untuk dibahas owner)

| Topik | Pilihan | Catatan |
|---|---|---|
| **Default ON atau opt-in?** | Usul: **opt-in dulu** (uji 2-4 minggu di project percobaan), lalu pertimbangkan default-ON. | Selaras §4.12 (mode baru = default mati). Palang `"ask"` tak menghalangi kerja sah (cuma menanyakan), jadi default-ON pun aman — tapi opt-in lebih hati-hati untuk pergeseran filosofi (lihat baris berikut). |
| **Pergeseran filosofi** | lintasAI selama ini **"nol hook, robot advisory saja"**. Palang ini = hook pertama yang memaksa. | Harus didokumentasikan eksplisit + bisa dimatikan (`hapus blok di settings.json` / env `LINTAS_RISK_GATE=off`). |
| **Fail-open vs fail-closed** | Usul: **fail-OPEN** kalau robot error (aksi lolos + cetak peringatan), KECUALI kategori blok-keras #7. | Alasan: robot yang crash lalu fail-closed = **mengunci SEMUA kerja tim** (lebih buruk dari status-quo). Fail-open cuma kembali ke keadaan hari ini (belum ada palang), bukan lebih buruk. Trade-off jujur: sedikit lebih lemah, jauh lebih tak-merepotkan. ECC `config-protection` fail-CLOSED, tapi audiensnya developer. |
| **Latency** | ~300 ms/panggilan PowerShell yang cocok-matcher. | Mitigasi: matcher sempit + `if`-narrowing; hanya tool berisiko. Tidak memengaruhi tool baca (Read/Grep/Glob). |
| **Windows-only** | Hook PowerShell = Windows. | Sesuai target kit sekarang; v2 lintas-platform menyusul (pakai pwsh7 atau Node shim). |
| **Bypass oleh user** | Palang = config sisi-user; user bisa matikan sendiri. | Itu OK — §8.1 #10 melarang **AI** menerobos, bukan user. User sengaja mematikan = haknya (§15). |
| **False-positive** | Pola harus tak-ambigu (§6.3). | Tes wajib sertakan kasus aman yang TIDAK boleh memicu (mis. `deleteMany({ where: {...} })`, `rm` nama-file-biasa di folder temp). |

---

## 7. Popup opt-in (kalau dipasang lewat installer)

```
[1] Pasang palang rem otomatis (rekomendasi) — AI berhenti + tanya kamu dulu
    sebelum aksi berisiko (hapus banyak data, sentuh kunci rahasia). Paling aman.
[2] Jangan pasang sekarang — aku pakai pengaman teks yang sudah ada dulu
[skip]
```
(Recommended di [1] + alasan awam, sesuai §14.1.)

---

## 8. Tes yang akan ditulis (`tests/risk-gate.Tests.ps1`)

- `deleteMany()` tanpa `where` → keputusan **ask** ✓
- `deleteMany({ where: {...} })` → **lolos** (false-positive guard) ✓
- `prisma migrate dev` → **ask**; `prisma migrate deploy` → **lolos** ✓
- `rm -rf /` & `Remove-Item -Recurse -Force` → **ask** ✓
- `rm berkas-biasa.txt` → **lolos** ✓
- `DROP TABLE` / `TRUNCATE` / `DELETE` tanpa `WHERE` → **ask**; `DELETE ... WHERE id=1` → **lolos** ✓
- `git push --force` / `--no-verify` → **ask** ✓
- `Write` ke `.env` → **ask** ✓
- `iwr ... | iex` / `--dangerously-skip-permissions` → **blok-keras (exit 2)** ✓
- input JSON rusak/kosong → **fail-open** (exit 0) + tak crash ✓
- pesan alasan = Bahasa Indonesia, tanpa jargon mentah ✓

---

## 9. Langkah implementasi bertahap (saat owner setuju)

1. Tulis `lib/risk-gate.ps1` + `tests/risk-gate.Tests.ps1` (TDD: tes dulu).
2. Template wiring `settings.json` + opsi installer opt-in.
3. `docs/risk-gate.md` + tunjuk dari §8.1/§8.2 + KEUNGGULAN + CHANGELOG + bump versi (MENENGAH).
4. Gerbang §4.6: robot kecocokan + seluruh tes lulus.
5. **Uji-jalan manual** di project percobaan (palang benar memunculkan dialog "ask" + tak menghalangi kerja sah) — karena efek runtime ada di sesi nyata, tak bisa diklaim "beres" sebelum diuji (§4.6 status-lingkungan).
6. Owner rilis (push/tag/publish).

---

## 10. Pertanyaan untuk owner (sebelum bangun)

1. **Daftar aksi §3 sudah pas?** Ada yang mau ditambah/dikurangi (mis. jaga juga `chmod 777`, `Stop-Service`)?
2. **Default opt-in atau langsung ON?** (Usulku: opt-in dulu.)
3. **Fail-open atau fail-closed** saat robot error? (Usulku: fail-open kecuali kategori menembus-pagar.)
4. **`"ask"` (dialog klik) sebagai mode utama** — setuju? (Lebih ramah dari blok-keras.)

> Kredit (MIT): pola hook diadaptasi dari ECC v2.0.0 (`config-protection.js`, `gateguard-fact-force.js`, `block-no-verify.js`) — ditulis-ulang jadi robot PowerShell ber-bahasa-Indonesia + mode "ask" (dialog klik), BUKAN disalin.
