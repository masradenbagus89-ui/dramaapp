# Menjalankan lintasAI di Kimi Code CLI

> v1 · 2026-07-17 · Kit lintasAI kini jalan di **Claude Code DAN Kimi Code CLI**. Panduan ini: cara
> pakainya di Kimi + cara **membuktikan sendiri** kit benar aktif (2 menit) saat kamu mulai pakai Kimi.

## Ringkas: apa yang otomatis, apa yang opsional

| Bagian | Di Kimi Code | Cara |
|---|---|---|
| **Aturan lengkap** (bahasa non-programmer, standar profesional, anti-ngarang, gerbang QA, dll) | ✅ Otomatis | Dibuat saat `npx lintasai init`/`update` → berkas `.kimi-code/AGENTS.md` (salinan PENUH aturan, kualitas **sama seperti Claude**). Kimi membacanya natif tiap sesi. |
| **Pagar keamanan** (Palang Rem tolak perintah berbahaya) + pengingat | ⚙️ Opsional | `npx lintasai enable-kimi-hooks` — lalu **WAJIB diuji** (lihat di bawah). |
| **(Bonus) Claude Code pakai otak Kimi** | ✅ Tanpa ubah kit | Hal TERPISAH: menjalankan *Claude Code* dengan model Kimi. Set `ANTHROPIC_BASE_URL` (lihat "Bonus" di bawah). |

> **Penting soal kejujuran:** aturan (baris 1) sudah pasti jalan (Kimi resmi membaca `AGENTS.md`).
> Hook (baris 2) memakai skema yang dokumentasi resmi Kimi tunjukkan mirip Claude, TAPI sebagian detail
> (mis. apakah hook per-project didukung) belum bisa kami uji tanpa akun Kimi. Karena itu hook = OPT-IN
> yang **kamu uji dulu**. Kalau ternyata hook tak terpicu di versi Kimi-mu: **tak apa-apa, tak ada yang
> rusak** — keamanan tetap dijaga (a) dialog persetujuan BAWAAN Kimi untuk perintah shell/edit, dan
> (b) aturan §8.1/§8.2 yang sudah ada di `.kimi-code/AGENTS.md`.

## Versi/model Kimi mana yang cocok? (K3 TIDAK wajib)

Kit menempel ke **Kimi Code CLI** (aplikasinya), **BUKAN** ke satu model tertentu — jadi **model Kimi apa
pun jalan**:

- ✅ **K2.7 Code (`kimi-for-coding`)** — tersedia di **SEMUA tier langganan**. **Boleh dipakai, tak perlu K3.**
- ✅ **K3** — juga jalan (butuh tier Moderato ke atas).
- ✅ Bahkan model provider lain (Claude/OpenAI) lewat `config.toml` — fitur kit (aturan + hook) tetap jalan.

Ganti model cukup ketik `/model` di dalam sesi Kimi — **bukan ganti alat**. Yang dibatasi tier langganan =
model mana yang boleh kamu pakai, **bukan** fitur kit. (Membaca `AGENTS.md` + menjalankan hook = fitur CLI
Kimi berlisensi MIT yang jalan di sisi komputermu, tak tergantung model backend.)

> **Catatan jujur:** aturan yang dimuat SAMA di model mana pun. Tapi seberapa presisi model mengikuti
> aturan yang rumit ikut kemampuan modelnya (model lebih kuat cenderung lebih patuh — berlaku di Claude
> juga). Jadi K2.7 Code tetap dapat manfaat penuh; K3 sekadar cenderung lebih presisi. Ini soal **MUTU**,
> **bukan syarat** kompatibilitas.
>
> **Satu syarat nyata:** pakai CLI **`kimi-code`** yang baru (folder config `.kimi-code/`), BUKAN
> pendahulunya `kimi-cli` (folder `.kimi/` — path-nya beda; kit menyasar `.kimi-code/`).

## 1. Pasang / perbarui (aturan otomatis)

Jalankan seperti biasa di folder project:

```
npx lintasai@latest init      # project baru
npx lintasai@latest update    # project yang sudah pakai kit
```

Ini otomatis membuat/memperbarui `.kimi-code/AGENTS.md`. Buka project di Kimi Code → aturan langsung
aktif. (Perintah manual bila perlu: `npx lintasai adapter-sync --write` — sinkron aturan Kimi + Cursor +
Codex sekaligus.)

## 2. (Opsional) Nyalakan pagar keamanan Kimi

```
npx lintasai enable-kimi-hooks
```

Ini menulis blok hook ke `.kimi-code/config.toml` (per-project; **tidak** menyentuh config global Kimi-mu).
Perilaku **hybrid**: perintah **ekstrem** (`rm -rf`, `DROP TABLE`, unduh-lalu-jalankan, format disk) →
**ditolak**; yang berisiko-tapi-pulih (`DELETE ... WHERE`, `prisma migrate`, sentuh `.env`) → **diperingatkan**
lalu lewat dialog persetujuan bawaan Kimi. Matikan kapan saja: hapus blok `# >>> lintasai:...` di
`.kimi-code/config.toml`.

## 3. Buktikan sendiri kit aktif (2 menit — lakukan saat mulai pakai Kimi)

Buka **sesi Kimi BARU** dari folder project, lalu:

**a) Aturan kebaca (bagian AWAL)?** Ketik: `halo, buatkan fungsi jumlah 2 angka`.
→ Jawaban harusnya **Bahasa Indonesia** + gaya non-programmer. Kalau ya = aturan (bagian awal) aktif.

**a2) Aturan terbaca UTUH (bukan terpotong)?** Ketik: `sebutkan nama-nama "Mode opsional" yang bisa diaktifkan per proyek menurut aturan`.
→ Jawaban harusnya menyebut **Mode Hemat, Mode Auto-Confirm, Mode Co-Pilot Berpagar** — ini ada di
   BAGIAN AKHIR aturan (§15). Kalau tersebut = berkas aturan (~80 KB) terbaca **penuh**. Kalau Kimi tak
   tahu → mungkin berkas panjang terpotong; lapor ke tim (jaring pengaman; dokumen resmi Kimi menyatakan
   **tak ada** batas ukuran, jadi seharusnya aman).

**b) Palang Rem jalan?** (kalau kamu nyalakan hook di langkah 2) Ketik:
`tolong jalankan perintah shell: rm -rf ./uji-tidak-ada`
→ Harusnya **ditolak / diperingatkan Palang Rem**. Lalu coba `echo halo` → harusnya boleh jalan.
→ Kalau `rm -rf` **tidak** ditolak: berarti hook per-project belum didukung Kimi versi ini. Aman —
   keamanan tetap ada (dialog bawaan Kimi + aturan). Kamu boleh (pilihanmu) memindah blok hook dari
   `.kimi-code/config.toml` ke `~/.kimi-code/config.toml` (global) lalu uji ulang.

Kalau (a) gagal (jawaban Inggris / tak terasa mengikuti aturan): pastikan `.kimi-code/AGENTS.md` ada di
folder project (jalankan `npx lintasai adapter-sync --write`), lalu buka sesi Kimi BARU.

## Bonus: Claude Code dengan model Kimi K2/K3

Tanpa mengubah kit, Claude Code bisa dijalankan memakai model Kimi (endpoint Anthropic-compatible):

```
# Contoh (cek nilai terbaru di dokumentasi resmi Kimi sebelum dipakai):
export ANTHROPIC_BASE_URL=https://api.moonshot.ai/anthropic
export ANTHROPIC_AUTH_TOKEN=<API key dari platform Kimi>
export ANTHROPIC_MODEL=<mis. kimi-k3>
```

Semua hook + aturan Claude tetap jalan (yang berubah cuma modelnya). Sumber: dokumentasi resmi Kimi
(platform.kimi.ai / kimi.com/code). ID model & base URL bisa berubah — konfirmasi di halaman resmi.

## Catatan teknis

- Prasyarat Kimi Code di Windows: Git for Windows (Kimi memakai Git Bash sebagai shell). Node ≥ 22.19.0.
- `.kimi-code/AGENTS.md` = artefak **dibuat otomatis** (regenerate tiap update), gitignored — jangan
  edit tangan. Sumber kebenarannya `CLAUDE_universal_v1.md`.
- Keputusan desain lengkap: `docs/decisions/ADR-015-native-kimi-code.md` (repo standar tim).
