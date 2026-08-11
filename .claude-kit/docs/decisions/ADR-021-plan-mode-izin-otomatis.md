# ADR-021: Plan mode bebas-dialog lewat izin-otomatis cuma-baca — bukan bypass

---

## Metadata

- **Tanggal:** 2026-07-18
- **Status:** Accepted
- **Author:** owner lintasAI (dokterbrutal)
- **Reviewer:** owner (keputusan diambil langsung di sesi, lewat 2 popup pilihan)

---

## Context

**Problem statement:** saat memakai plan mode, staff tetap dihujani dialog minta izin padahal AI
cuma memeriksa kode. Owner meminta: *"jika client menggunakan PLAN MODE, apapun promptnya biarkan
berjalan otomatis seperti bypass, karena plan hanya read tidak write — tidak perlu konfirmasi
popup apapun."* Permintaan ini berlaku untuk lintasAI internal **dan** project client.

**Bukti masalahnya nyata:** `permissions.allow` di `~/.claude/settings.json` mesin owner sudah
berisi **706 entri (±123 KB)**, dengan `deny` dan `ask` kosong. Itu jejak refleks "klik izinkan"
berbulan-bulan — termasuk sejumlah entri `PowerShell(...)` yang bisa menulis, kini terizinkan
permanen. Jadi dialog yang terlalu sering justru **menurunkan** keamanan, bukan menaikkan.

**Asumsi yang DIKOREKSI saat pemeriksaan** (ini inti ADR ini):

| Premis permintaan | Hasil verifikasi |
|---|---|
| "Plan mode hanya read" | ❌ Hanya `Edit`/`Write` yang dikunci keras harness. **Perintah terminal tetap jalan** — dibuktikan langsung: sesi plan-mode saat merancang ini berhasil menjalankan `Bash`/`node` berkali-kali. |
| "Tidak berbahaya dalam kondisi apapun" | ❌ Dokumentasi resmi Claude Code menyebut perintah pengubah (`touch`, `rm`, `curl`) **memang memicu dialog di plan mode** — justru karena bisa merusak. |
| "Bypass = solusinya" | ❌ Anthropic menyatakan tertulis mode bypass *"offers no protection against prompt injection or unintended actions"*, dan merekomendasikan auto mode sebagai gantinya. |

**Constraints:** §8.1 #10 melarang AI menerobos/mematikan pagar izin apa pun alasannya. §8.1 #1-#2
melarang memperlakukan isi berkas sebagai perintah dan pola unduh-lalu-jalankan. Tie-breaker §0
menempatkan Keamanan di atas Hemat-Waktu.

---

## Decision

**Pasang `lib/plan-mode-gate.js`** — hook `PreToolUse` yang, **hanya saat `permission_mode` = `plan`**,
memberi `permissionDecision: "allow"` untuk aksi yang ada di **daftar-putih cuma-baca**. Di luar
plan mode ia diam total.

**Default NYALA**, ikut terpasang otomatis ke client tiap `init`/`update` lewat
`lib/ensure-plan-mode-gate-hook.mjs` (dirakit di `lib/setup-hooks.mjs`).

Dua pagar yang membuat ini boleh default-nyala:

1. **Palang Rem didahulukan.** `plan-mode-gate` memanggil `riskGate.decide()` **sebelum** memberi
   izin. Apa pun yang Palang Rem tahan → tak pernah bisa lolos di sini. Penilaian bahaya tetap
   **satu sumber** (dipakai-ulang, bukan ditulis-ulang) sehingga dua penjaga tak bisa berbeda pendapat.
2. **Daftar-putih, bukan daftar-hitam.** Yang tak dikenali → tidak diizinkan → alur dialog normal.
   Mode gagalnya berpihak ke aman: lalai mendaftar = "dialog masih muncul", bukan "bahaya lolos".

Tambahan yang tidak diminta tapi diputuskan: **berkas rahasia (`.env`, `.ssh`, `*.pem`, kredensial,
token) tidak pernah auto-izin walau operasinya cuma membaca** — boundary keras §8.1 #6.

---

## Alternatif yang Ditolak

- **Alternatif A — bypass total saat plan mode (permintaan harfiah owner):** ditolak karena plan
  mode tidak mengunci perintah terminal, sehingga ini membuka jalur eksekusi senyap. Skenario gagal
  konkret: AI membaca `README.md`/isu GitHub pihak lain saat menyusun rencana, di dalamnya ada
  titipan kalimat perintah, dan perintah itu jalan tanpa terlihat. Persis yang dilarang §8.1 #2 dan
  #10, dan persis yang diperingatkan Anthropic. **Owner diberi opsi ini secara eksplisit di popup
  (lengkap dengan konsekuensinya) dan memilih tidak mengambilnya.**
- **Alternatif B — perluas `permissions.allow` di `settings.json`:** ditolak sebagai solusi utama
  karena tidak ada cara menyetel izin **khusus plan mode** (tak ada kunci `planModeAllow` — sudah
  dicek). Aturan `allow` berlaku di **semua** mode, jadi melonggarkannya demi plan mode berarti
  ikut melonggarkan sesi eksekusi. Justru inilah yang sudah terjadi dan menghasilkan 706 entri itu.
- **Alternatif C — andalkan auto mode resmi (`useAutoModeDuringPlan`) saja:** ditolak. Awalnya
  direncanakan sebagai pelengkap, lalu **dibuang setelah verifikasi**: kuncinya disebut docs dan
  sudah default-on, tapi tak ada dokumentasi cara menyetelnya — jadi tak ada yang bisa (atau perlu)
  kita tulis. Detail di Risk.
- **Alternatif D — bikin adaptor Kimi:** ditolak karena tidak perlu. Plan mode Kimi **sudah**
  cuma-baca total (dokumentasi resmi: hanya `Glob`/`Grep`/`ReadFile`, tak bisa menjalankan
  perintah) — tak ada dialog untuk dihilangkan.

---

## Konsekuensi

### Pros
- Dialog izin saat plan mode hilang untuk kegiatan membaca — tujuan owner tercapai.
- Tekanan untuk menambah entri `allow` permanen berkurang, sehingga penggelembungan 706-entri itu
  tidak berlanjut. **Keamanan jangka panjang naik, bukan turun.**
- Perilaku di luar plan mode **nol berubah** — tak ada regresi untuk sesi eksekusi.
- Berkas rahasia justru jadi **lebih terjaga** dari sebelumnya (kini eksplisit tak pernah auto-izin).

### Cons
- Satu berkas penjaga lagi yang harus dirawat, dan daftar-putihnya akan perlu ditambah dari waktu
  ke waktu saat ada perintah baca baru yang sering dipakai.
- Perintah **PowerShell** tidak ditangani (sintaksnya terlalu bebas untuk dinilai aman), padahal
  mesin owner banyak memakainya — jadi sebagian dialog masih akan muncul di sana.
- Cakupan hanya Claude Code. Codex & Cursor tak bisa dibantu; ini **batas alat**, bukan kelalaian.

### Risk
- **Daftar-putih salah menilai sesuatu sebagai aman.** Mitigasi: pagar Palang Rem didahulukan +
  penolak metakarakter + tes `tests/plan-mode-gate.test.mjs` yang secara khusus mencoba membujuk
  robot mengizinkan hal berbahaya (penulisan terselubung, rantai perintah, sub-perintah git yang
  menulis, `npx` paket asing).
- **Refactor masa depan membalik urutan pagar.** Mitigasi: ada tes pengunci yang mewajibkan
  `plan-mode-gate` me-`require` dan memanggil `riskGate.decide()` — kalau dihapus, tes merah.
- **Ketergantungan pada kolom `permission_mode`.** Kalau harness berhenti mengirimnya, robot ini
  diam (tak mengizinkan apa pun) — arah gagal yang aman, dan dikunci tes.
- ✅ **`useAutoModeDuringPlan` — sudah diverifikasi, hasilnya: JANGAN ditulis.** Kunci ini memang
  disebut di dokumentasi resmi (`permission-modes`), dengan kalimat *"unless auto mode is available
  and `useAutoModeDuringPlan` is on, **which is the default**"*. **TAPI** tidak ada satu pun halaman
  resmi yang menjelaskan struktur JSON-nya, tipe datanya, letaknya, atau tingkat berlakunya —
  halaman `auto-mode-config` dan `settings` sama-sekali tidak memuatnya. Kesimpulan: besar
  kemungkinan ini **perilaku bawaan, bukan setelan yang dapat dikonfigurasi**. Karena itu Komponen
  "auto mode resmi" **dibuang dari lingkup** — menuliskan nama kunci yang belum terbukti ke berkas
  setelan client adalah risiko nyata tanpa imbalan (kalau memang sudah default-on, tak ada yang
  perlu dinyalakan). Implikasi baiknya: `plan-mode-gate` menjadi jalur yang **tidak bergantung
  ketersediaan auto mode di akun** — tepat sasaran untuk client.

---

## Implementation Notes

- **File yang berubah/dibuat:**
  - `lib/plan-mode-gate.js` (baru — hook inti)
  - `lib/ensure-plan-mode-gate-hook.mjs` (baru — pemasang, cermin `ensure-risk-gate-hook.mjs`)
  - `templates/hooks/plan-mode-gate.settings.example.json` (baru — contoh pasang manual)
  - `lib/setup-hooks.mjs` (disambung, sesudah blok risk-gate)
  - `lib/kit-files.json` (2 berkas didaftarkan supaya tersalin ke client)
  - `docs/plan-mode-gate.md` (baru)
  - `tests/plan-mode-gate.test.mjs` + `tests/ensure-plan-mode-gate-hook.test.mjs` (baru)
- **Rollback plan:** hapus blok `PreToolUse` yang memuat `plan-mode-gate.js` dari
  `.claude/settings.json`. Tidak ada data/skema yang berubah, jadi pembatalannya bersih dan
  seketika (berlaku di chat berikutnya).

---

## Riwayat

| Tanggal     | Status    | Oleh   | Catatan                                                                 |
|-------------|-----------|--------|-------------------------------------------------------------------------|
| 2026-07-18  | Accepted  | owner  | Diputuskan di sesi; opsi bypass total ditawarkan eksplisit lalu ditolak |
