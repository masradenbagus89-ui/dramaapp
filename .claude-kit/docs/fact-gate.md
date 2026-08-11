# Palang Fakta — lihat dampaknya dulu, baru ubah berkas penting

> Versi 1.0 · 2026-07-20 · Robot: `engine/fact-gate.mjs` (Claude Code)
> Keputusan + jangkauan: `ADR-014` (catatan keputusan, ada di repo kit)

## Tujuan

Aturan kit sudah menyuruh "baca siapa pemakainya sebelum mengubah" (§7.3a) dan "periksa seberapa
luas dampaknya" (§4.6). Selama ini itu **kebijakan teks** — jalan kalau AI patuh, gagal diam-diam
kalau tidak. Penjaga bawaan Claude Code (*Read-before-Edit*) memang menolak mengubah berkas yang
belum dibaca, tapi ia **hanya** memastikan berkasnya dibaca; ia **tidak** memaksa AI menyebut siapa
saja yang memakai berkas itu.

Palang Fakta menutup selisih itu secara **mesin**: sebelum AI mengubah berkas **berdampak-tinggi**
untuk pertama kali dalam satu sesi, ia ditahan dan diminta menyajikan **4 fakta** lebih dulu.

🏢 Analoginya: sebelum tukang membongkar pipa di dinding, ia menunjukkan dulu pipa itu menyuplai
kamar mandi yang mana. Bukan untuk melarang — supaya tak ada kamar yang tiba-tiba kehabisan air.

## Cara pakai

```bash
npx lintasai enable-fact-gate      # nyalakan (Claude Code)
```

Lalu **buka chat BARU** — hook hanya dimuat saat sesi dimulai.

**Default MATI.** Ia menambah gesekan di tiap edit-pertama, jadi yang memutuskan = **pemilik
project**, bukan AI. AI boleh menawarkan, **dilarang menyalakan sendiri**.

**Matikan kapan saja:** hapus blok `PreToolUse` yang memuat `fact-gate` dari `.claude/settings.json`.

## 4 fakta yang diminta

Sumbernya `engine/fact-gate.mjs` fungsi `editGateMsg`:

1. Daftar **semua berkas yang memakai / meng-`import`** berkas ini.
2. **Fungsi atau kelas publik** yang ikut terdampak perubahan ini.
3. Kalau berkas ini baca/tulis data: **nama field + strukturnya** (pakai contoh, **bukan** data
   produksi asli).
4. **Kutipan instruksi user saat ini, apa adanya** (verbatim).

Setelah AI menyajikannya, ia **mengulang operasi yang sama** dan lolos. Kamu tak perlu melakukan
apa pun.

## Berkas apa saja yang memicunya

**Berdampak-tinggi** (ditahan): login/sesi/OAuth/JWT · migrasi & skema database · aturan akses
baris (RLS) · folder `api/` + `route.*` · middleware/proxy/guard · kripto & izin · penagihan,
pembayaran, webhook.

**Rendah-nilai** (dilewati diam-diam — pertanyaan "siapa yang memakai ini" tak bermakna di sana):
berkas tes, berkas hasil-generate, `dist`/`build`/`coverage`, mock, fixture, folder sementara.

Penyempitan ini disengaja: palang yang menyala di mana-mana akan diklik-lewat tanpa dibaca.

## Batas jujur

- **Sekali per berkas per sesi.** Sesudah fakta disajikan, edit berikutnya pada berkas yang sama
  lolos tanpa ditahan lagi.
- **Ini pagar KEPATUHAN, bukan pagar KEAMANAN.** Ia meminta AI *menyebutkan* dampak; ia tidak bisa
  memverifikasi bahwa yang disebut itu benar.
- **Masih ada lubang "ulangi tanpa menjawab".** Palang ini memeriksa bahwa operasi diulang, bukan
  bahwa jawabannya sungguh-sungguh. Lubang itu ditutup dari sisi lain oleh **Palang Rak**
  (`docs/rak-gate.md`), yang memeriksa **tanda-terima pembacaan nyata** dan karena itu tak bisa
  dilewati dengan kata-kata.
- **Gagal-terbuka (fail-open).** Input rusak, state error, atau berkas rendah-nilai → diizinkan.
  Palang yang macet lebih merugikan daripada palang yang absen sesekali.
- **Claude Code saja.** Belum ada padanan Kimi Code.

## Hubungannya dengan pengaman lain

| Pengaman | Default | Yang dijaga |
|---|---|---|
| Read-before-Edit (bawaan Claude Code) | selalu | berkasnya sudah dibaca |
| **Palang Fakta** (`engine/fact-gate.mjs`) | **MATI** (opt-in) | dampaknya sudah disebut |
| Palang Rak (`engine/rak-gate.mjs`) | **MATI** (opt-in) | panduan kit sudah benar-benar dibuka |
| Palang Rem (`engine/risk-gate.js`) | **NYALA** | aksi berisiko dikonfirmasi manusia |
| Lampu Hijau Plan Mode (`engine/plan-mode-gate.js`) | **NYALA** | aksi cuma-baca tak menghujani dialog izin |

Read-before-Edit = lantai; Palang Fakta = satu tingkat di atasnya, khusus berkas berdampak-tinggi.
